'use strict';
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { DB_DIR } = require('./db');

const UPLOAD_DIR = process.env.PORTADAS_DIR || path.join(DB_DIR, 'portadas');
const CACHE_DIR = process.env.PORTADAS_CACHE_DIR || path.join(DB_DIR, 'cache', 'portadas');
const TMDB_API = (process.env.TMDB_API_BASE || 'https://api.themoviedb.org/3').replace(/\/+$/, '');
const TMDB_IMG = (process.env.TMDB_IMG_BASE || 'https://image.tmdb.org/t/p/w500').replace(/\/+$/, '');
const TMDB_KEY = process.env.TMDB_API_KEY || '';
const TMDB_TOKEN = process.env.TMDB_TOKEN || '';
const WIKI_API = (process.env.WIKI_API_BASE || 'https://en.wikipedia.org').replace(/\/+$/, '');
const WIKI_ACTIVO = !/^(0|no|false|off)$/i.test(process.env.PORTADAS_WIKIPEDIA || '');
const USER_AGENT = 'ClubSakila/4.1 (proyecto academico SIS-214; Node.js)';
const WIKI_IMG_HOSTS = new Set(['upload.wikimedia.org']);
const WIKI_PAUSA_MS = 400;
const MAX_UPLOAD = 3 * 1024 * 1024;
const MAX_REMOTE = 6 * 1024 * 1024;
const REINTENTO_MS = 10 * 60_000;

const TIPOS = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

for (const d of [UPLOAD_DIR, CACHE_DIR]) fs.mkdirSync(d, { recursive: true });

function detectarTipo(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

function buscarArchivo(dir, id) {
  for (const ext of Object.keys(TIPOS)) {
    const file = path.join(dir, `${id}.${ext}`);
    try {
      const st = fs.statSync(file);
      if (st.isFile() && st.size > 0) return { file, type: TIPOS[ext], mtime: Math.trunc(st.mtimeMs) };
    } catch { }
  }
  return null;
}

const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Wikipedia limita las ráfagas de peticiones: se hacen de una en una con una pausa corta.
let colaWiki = Promise.resolve();
function enColaWiki(fn) {
  const r = colaWiki.then(fn);
  colaWiki = r.catch(() => { }).then(() => new Promise(ok => setTimeout(ok, WIKI_PAUSA_MS)));
  return r;
}
async function wikiFetch(url, { json = true, timeout = 10000 } = {}) {
  for (let intento = 0; ; intento++) {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Api-User-Agent': USER_AGENT, Accept: json ? 'application/json' : 'image/*' },
      signal: AbortSignal.timeout(timeout)
    });
    if (res.status === 429 && intento < 3) {
      const espera = Math.min(20, Number(res.headers.get('retry-after')) || 2 * (intento + 1)) * 1000;
      await new Promise(ok => setTimeout(ok, espera));
      continue;
    }
    if (!res.ok) throw new Error(`Wikipedia respondió ${res.status}`);
    return json ? res.json() : Buffer.from(await res.arrayBuffer());
  }
}

const sinParentesis = t => String(t || '').replace(/\s*\([^)]*\)\s*$/, '');

// Busca el artículo de la película en Wikipedia y devuelve la URL de su póster (imagen principal del artículo).
async function wikiPoster(p) {
  const url = new URL(WIKI_API + '/w/api.php');
  Object.entries({
    action: 'query', format: 'json', formatversion: '2', generator: 'search',
    gsrsearch: `${p.titulo} ${p.anio} film`, gsrlimit: '8', gsrnamespace: '0',
    prop: 'pageprops', ppprop: 'wikibase-shortdesc'
  }).forEach(([k, v]) => url.searchParams.set(k, v));
  const data = await enColaWiki(() => wikiFetch(url));
  const paginas = (data.query?.pages || []).sort((a, b) => a.index - b.index)
    .map(pg => ({ titulo: pg.title, desc: String(pg.pageprops?.['wikibase-shortdesc'] || '') }))
    .filter(pg => /\bfilm\b/i.test(pg.desc) && !/soundtrack|score|album|accolades/i.test(pg.desc + pg.titulo));
  const anio = Number(p.anio);
  const delAnio = pg => [anio, anio - 1, anio + 1].some(a => pg.desc.includes(String(a)));
  const mismoTitulo = pg => norm(sinParentesis(pg.titulo)) === norm(p.titulo);
  const elegida = paginas.find(pg => mismoTitulo(pg) && delAnio(pg)) || paginas.find(mismoTitulo) || paginas.find(delAnio);
  if (!elegida) return null;
  const resumen = await enColaWiki(() =>
    wikiFetch(`${WIKI_API}/api/rest_v1/page/summary/${encodeURIComponent(elegida.titulo.replace(/ /g, '_'))}`));
  const src = resumen.originalimage?.source || resumen.thumbnail?.source;
  if (!src) return null;
  const img = new URL(src);
  if (img.protocol !== 'https:' || !WIKI_IMG_HOSTS.has(img.hostname)) return null;
  img.search = '';
  return img.href;
}

function createPortadas(db) {
  const tmdbActivo = Boolean(TMDB_KEY || TMDB_TOKEN);
  const fuentes = [tmdbActivo && 'TMDB', WIKI_ACTIVO && 'Wikipedia'].filter(Boolean);
  const fallidas = new Map();
  const enCurso = new Map();
  const qPeli = db.prepare('SELECT pelicula_id, titulo, anio, tmdb_id FROM pelicula WHERE pelicula_id = ?');
  const qGuardarTmdb = db.prepare('UPDATE pelicula SET tmdb_id = ? WHERE pelicula_id = ?');

  function urlDe(id) {
    const f = buscarArchivo(UPLOAD_DIR, id) || buscarArchivo(CACHE_DIR, id);
    if (f) return `/api/portadas/${id}?v=${f.mtime}`;
    if (fuentes.length && !(Date.now() - (fallidas.get(id) || 0) < REINTENTO_MS)) return `/api/portadas/${id}?v=remota`;
    return null;
  }

  async function tmdbJson(ruta, params = {}) {
    const url = new URL(TMDB_API + ruta);
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    if (TMDB_KEY && !TMDB_TOKEN) url.searchParams.set('api_key', TMDB_KEY);
    const res = await fetch(url, {
      headers: { Accept: 'application/json', ...(TMDB_TOKEN ? { Authorization: `Bearer ${TMDB_TOKEN}` } : {}) },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) throw new Error(`TMDB respondió ${res.status}`);
    return res.json();
  }

  async function posterPath(p) {
    if (p.tmdb_id) {
      const m = await tmdbJson(`/movie/${p.tmdb_id}`, { language: 'es-ES' });
      if (m.poster_path) return m.poster_path;
    }
    const elegir = lista => {
      const conPoster = (lista || []).filter(r => r.poster_path);
      return conPoster.find(r => norm(r.title) === norm(p.titulo) || norm(r.original_title) === norm(p.titulo)) || conPoster[0];
    };
    let r = elegir((await tmdbJson('/search/movie', { query: p.titulo, year: p.anio, include_adult: 'false' })).results);
    if (!r) r = elegir((await tmdbJson('/search/movie', { query: p.titulo, include_adult: 'false' })).results);
    if (!r) return null;
    if (r.id && r.id !== p.tmdb_id) qGuardarTmdb.run(r.id, p.pelicula_id);
    return r.poster_path;
  }

  async function desdeTmdb(p) {
    const poster = await posterPath(p);
    if (!poster) return null;
    const res = await fetch(TMDB_IMG + poster, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw new Error(`Imagen TMDB ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  async function desdeWikipedia(p) {
    const src = await wikiPoster(p);
    if (!src) return null;
    return enColaWiki(() => wikiFetch(src, { json: false, timeout: 15000 }));
  }

  // Prueba cada fuente en orden (TMDB si hay clave, luego Wikipedia) y guarda la primera imagen válida.
  async function descargar(p) {
    let buf = null;
    for (const [nombre, fn] of [['TMDB', tmdbActivo && desdeTmdb], ['Wikipedia', WIKI_ACTIVO && desdeWikipedia]]) {
      if (!fn) continue;
      try { buf = await fn(p); } catch (e) { console.warn(`Portada ${p.pelicula_id} (${p.titulo}) en ${nombre}: ${e.message}`); }
      if (buf && buf.length <= MAX_REMOTE && detectarTipo(buf)) break;
      buf = null;
    }
    if (!buf) return null;
    const ext = detectarTipo(buf);
    const destino = path.join(CACHE_DIR, `${p.pelicula_id}.${ext}`);
    const tmp = `${destino}.${process.pid}.tmp`;
    await fsp.writeFile(tmp, buf);
    await fsp.rename(tmp, destino);
    return buscarArchivo(CACHE_DIR, p.pelicula_id);
  }

  async function obtener(id) {
    const local = buscarArchivo(UPLOAD_DIR, id) || buscarArchivo(CACHE_DIR, id);
    if (local) return local;
    if (!fuentes.length || Date.now() - (fallidas.get(id) || 0) < REINTENTO_MS) return null;
    const p = qPeli.get(id);
    if (!p) return null;
    if (!enCurso.has(id)) {
      enCurso.set(id, descargar(p)
        .catch(e => { console.warn(`Portada ${id} (${p.titulo}): ${e.message}`); return null; })
        .then(r => { if (!r) fallidas.set(id, Date.now()); return r; })
        .finally(() => enCurso.delete(id)));
    }
    return enCurso.get(id);
  }

  async function subir(id, buf) {
    if (!buf.length) return { error: 'No se recibió ninguna imagen.' };
    if (buf.length > MAX_UPLOAD) return { error: 'La imagen supera los 3 MB.' };
    const ext = detectarTipo(buf);
    if (!ext) return { error: 'Formato no admitido. Usa JPG, PNG o WebP.' };
    await borrarDe(UPLOAD_DIR, id);
    await fsp.writeFile(path.join(UPLOAD_DIR, `${id}.${ext}`), buf);
    fallidas.delete(id);
    return { portada: urlDe(id) };
  }

  async function borrarDe(dir, id) {
    await Promise.all(Object.keys(TIPOS).map(ext => fsp.rm(path.join(dir, `${id}.${ext}`), { force: true })));
  }

  async function quitar(id) {
    await borrarDe(UPLOAD_DIR, id);
    await borrarDe(CACHE_DIR, id);
    fallidas.delete(id);
    return { portada: urlDe(id) };
  }

  // Al arrancar, descarga en segundo plano las portadas que aún no están en caché.
  async function precargar() {
    if (!fuentes.length) return;
    const ids = db.prepare('SELECT pelicula_id FROM pelicula ORDER BY pelicula_id').all().map(r => r.pelicula_id)
      .filter(id => !buscarArchivo(UPLOAD_DIR, id) && !buscarArchivo(CACHE_DIR, id));
    if (!ids.length) return;
    console.log(`Descargando ${ids.length} portada(s) en segundo plano…`);
    let ok = 0;
    for (const id of ids) if (await obtener(id)) ok++;
    console.log(`Portadas listas: ${ok} de ${ids.length}.`);
  }

  return { urlDe, obtener, subir, quitar, precargar, tmdbActivo, fuentes, MAX_UPLOAD };
}

module.exports = { createPortadas, wikiPoster };
