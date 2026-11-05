'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { open, tx } = require('./db');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = path.resolve(__dirname, '..');
const db = open();

/* ---------------- Utilidades HTTP ---------------- */
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8'
};
const STATIC_DIRS = new Set(['css', 'js', 'assets']);   // solo estas carpetas son públicas

function send(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', c => {
      raw += c;
      if (raw.length > 100_000) { reject(new HttpError(413, 'Solicitud demasiado grande')); req.destroy(); }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(new HttpError(400, 'JSON inválido')); }
    });
    req.on('error', reject);
  });
}
const toId = v => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new HttpError(400, 'Identificador inválido');
  return n;
};

/* ---------------- Consultas ---------------- */
const SELECT_PELICULA = `
  SELECT p.pelicula_id, p.titulo, p.sinopsis, p.anio, p.duracion, p.clasificacion, p.tarifa_dia,
         p.color1, p.color2, p.trailer_url, c.nombre AS categoria,
         (SELECT group_concat(nombre, ', ') FROM (
            SELECT a.nombre FROM pelicula_actor pa JOIN actor a ON a.actor_id = pa.actor_id
            WHERE pa.pelicula_id = p.pelicula_id ORDER BY a.nombre)) AS reparto
  FROM pelicula p JOIN categoria c ON c.categoria_id = p.categoria_id`;

const socioExiste = id => {
  if (!db.prepare('SELECT 1 FROM socio WHERE socio_id = ?').get(id)) throw new HttpError(404, 'Socio no encontrado');
};

/* ---------------- Rutas de la API REST ---------------- */
const routes = [];
const route = (method, pattern, handler) =>
  routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), handler });

// Catálogo: GET /api/peliculas?q=&categoria=&clasificacion=
route('GET', '/api/peliculas', ({ query }) => {
  const where = [], args = [];
  const q = (query.get('q') || '').trim().slice(0, 60);
  if (q) {
    const like = '%' + q.replace(/[\\%_]/g, '\\$&') + '%';
    where.push(`(p.titulo LIKE ? ESCAPE '\\' OR EXISTS (
      SELECT 1 FROM pelicula_actor pa JOIN actor a ON a.actor_id = pa.actor_id
      WHERE pa.pelicula_id = p.pelicula_id AND a.nombre LIKE ? ESCAPE '\\'))`);
    args.push(like, like);
  }
  if (query.get('categoria')) { where.push('c.nombre = ?'); args.push(query.get('categoria')); }
  if (query.get('clasificacion')) { where.push('p.clasificacion = ?'); args.push(query.get('clasificacion')); }
  const sql = SELECT_PELICULA + (where.length ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY p.titulo';
  return db.prepare(sql).all(...args);
});

route('GET', '/api/peliculas/:id', ({ params }) => {
  const p = db.prepare(SELECT_PELICULA + ' WHERE p.pelicula_id = ?').get(toId(params.id));
  if (!p) throw new HttpError(404, 'Película no encontrada');
  return p;
});

route('GET', '/api/categorias', () =>
  db.prepare('SELECT nombre FROM categoria ORDER BY nombre').all().map(r => r.nombre));

// Socios
route('GET', '/api/socios', () => db.prepare('SELECT socio_id, nombre, email FROM socio ORDER BY nombre').all());

route('POST', '/api/socios', ({ body, ctx }) => {
  const nombre = String(body.nombre ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  if (nombre.length < 3 || nombre.length > 80) throw new HttpError(400, 'El nombre debe tener entre 3 y 80 caracteres.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100) throw new HttpError(400, 'Ingresa un correo válido.');
  try {
    const r = db.prepare('INSERT INTO socio (nombre, email) VALUES (?, ?)').run(nombre, email);
    ctx.status = 201;
    return { socio_id: Number(r.lastInsertRowid), nombre, email };
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) throw new HttpError(409, 'Ya existe un socio con ese correo.');
    throw e;
  }
});

// Alquileres
route('GET', '/api/socios/:id/alquileres', ({ params }) => {
  const id = toId(params.id); socioExiste(id);
  return db.prepare('SELECT * FROM v_alquiler WHERE socio_id = ? ORDER BY fecha_alquiler DESC, alquiler_id DESC').all(id);
});

route('POST', '/api/socios/:id/alquileres', ({ params, body, ctx }) => {
  const id = toId(params.id); socioExiste(id);
  const items = body.items;
  if (!Array.isArray(items) || !items.length || items.length > 20) throw new HttpError(400, 'El carrito está vacío o es demasiado grande.');
  const tarifa = db.prepare('SELECT tarifa_dia FROM pelicula WHERE pelicula_id = ?');
  const ins = db.prepare(`INSERT INTO alquiler (socio_id, pelicula_id, dias, fecha_limite, total)
                          VALUES (?, ?, ?, datetime('now', ?), ?)`);
  const total = tx(db, () => {
    let suma = 0;
    for (const it of items) {
      const pid = toId(it.pelicula_id);
      const dias = Math.max(1, Math.min(14, Math.trunc(Number(it.dias)) || 1));
      const p = tarifa.get(pid);
      if (!p) throw new HttpError(404, `La película ${pid} no existe.`);
      const sub = Math.round(p.tarifa_dia * dias * 100) / 100;   // la tarifa siempre sale de la BD
      ins.run(id, pid, dias, `+${dias} days`, sub);
      suma += sub;
    }
    return Math.round(suma * 100) / 100;
  });
  ctx.status = 201;
  return { ok: true, total, cantidad: items.length };
});

route('PATCH', '/api/socios/:id/alquileres/:aid/devolucion', ({ params }) => {
  const id = toId(params.id), aid = toId(params.aid); socioExiste(id);
  const r = db.prepare(`UPDATE alquiler SET fecha_devolucion = datetime('now')
                        WHERE alquiler_id = ? AND socio_id = ? AND fecha_devolucion IS NULL`).run(aid, id);
  if (!r.changes) throw new HttpError(409, 'El alquiler no existe o ya fue devuelto.');
  return db.prepare('SELECT * FROM v_alquiler WHERE alquiler_id = ?').get(aid);
});

// Favoritos (Wishlist)
route('GET', '/api/socios/:id/favoritos', ({ params }) => {
  const id = toId(params.id); socioExiste(id);
  return db.prepare('SELECT pelicula_id FROM favorito WHERE socio_id = ?').all(id).map(r => r.pelicula_id);
});
route('PUT', '/api/socios/:id/favoritos/:pid', ({ params }) => {
  const id = toId(params.id), pid = toId(params.pid); socioExiste(id);
  if (!db.prepare('SELECT 1 FROM pelicula WHERE pelicula_id = ?').get(pid)) throw new HttpError(404, 'Película no encontrada');
  db.prepare('INSERT OR IGNORE INTO favorito (socio_id, pelicula_id) VALUES (?, ?)').run(id, pid);
  return { favorito: true };
});
route('DELETE', '/api/socios/:id/favoritos/:pid', ({ params }) => {
  const id = toId(params.id), pid = toId(params.pid); socioExiste(id);
  db.prepare('DELETE FROM favorito WHERE socio_id = ? AND pelicula_id = ?').run(id, pid);
  return { favorito: false };
});

/* ---------------- Archivos estáticos ---------------- */
function serveStatic(res, pathname) {
  let rel;
  try { rel = decodeURIComponent(pathname).replace(/^\/+/, ''); } catch { return send(res, 400, { error: 'URL inválida' }); }
  if (rel === '') rel = 'index.html';
  if (rel === 'favicon.ico') { res.writeHead(204); return res.end(); }
  if (rel !== 'index.html' && !STATIC_DIRS.has(rel.split('/')[0])) return send(res, 404, { error: 'No encontrado' });
  const file = path.resolve(ROOT, rel);
  if (!file.startsWith(ROOT + path.sep)) return send(res, 403, { error: 'Acceso denegado' });
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, { error: 'No encontrado' });
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache'
    });
    fs.createReadStream(file).pipe(res);
  });
}

/* ---------------- Servidor ---------------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) {
      for (const r of routes) {
        const m = r.method === req.method && url.pathname.match(r.re);
        if (!m) continue;
        const ctx = { status: 200 };
        const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readBody(req) : {};
        const data = r.handler({ params: m.groups || {}, query: url.searchParams, body, ctx });
        return send(res, ctx.status, data);
      }
      const existe = routes.some(r => url.pathname.match(r.re));
      throw new HttpError(existe ? 405 : 404, existe ? 'Método no permitido' : 'Ruta no encontrada');
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Método no permitido');
    serveStatic(res, url.pathname);
  } catch (e) {
    if (e instanceof HttpError) return send(res, e.status, { error: e.message });
    console.error(e);
    send(res, 500, { error: 'Error interno del servidor' });
  }
});

server.listen(PORT, '0.0.0.0', () => console.log(`Club Sakila listo en http://localhost:${PORT}`));
