'use strict';
require('./env');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { open, tx } = require('./db');
const { createAuth, hashPassword } = require('./auth');
const { createPortadas } = require('./portadas');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = path.resolve(__dirname, '..');
const db = open();
const auth = createAuth(db);
const portadas = createPortadas(db);

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8'
};
const STATIC_DIRS = new Set(['css', 'js', 'assets']);
const PAGINAS = new Set(['index.html', 'login.html']);

function send(res, status, data, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(data));
}

function readRaw(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > limit) { reject(new HttpError(413, 'Solicitud demasiado grande')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
async function readJson(req) {
  const raw = (await readRaw(req, 100_000)).toString('utf8');
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { throw new HttpError(400, 'JSON inválido'); }
}

const toId = v => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new HttpError(400, 'Identificador inválido');
  return n;
};
const clientIp = req => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';

function validarSocio(body) {
  const nombre = String(body.nombre ?? '').trim().replace(/\s+/g, ' ');
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  if (nombre.length < 3 || nombre.length > 80) throw new HttpError(400, 'El nombre debe tener entre 3 y 80 caracteres.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100) throw new HttpError(400, 'Ingresa un correo válido.');
  if (password.length < 8 || password.length > 72 || !/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(password) || !/\d/.test(password)) {
    throw new HttpError(400, 'La contraseña debe tener entre 8 y 72 caracteres, con al menos una letra y un número.');
  }
  return { nombre, email, password };
}
function crearSocio({ nombre, email, password }) {
  try {
    const r = db.prepare('INSERT INTO socio (nombre, email, password_hash) VALUES (?, ?, ?)').run(nombre, email, hashPassword(password));
    return { socio_id: Number(r.lastInsertRowid), nombre, email, rol: 'socio' };
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) throw new HttpError(409, 'Ya existe un socio con ese correo.');
    throw e;
  }
}

const SELECT_PELICULA = `
  SELECT p.pelicula_id, p.titulo, p.director, p.sinopsis, p.anio, p.duracion, p.clasificacion, p.tarifa_dia,
         p.color1, p.color2, p.trailer_url, c.nombre AS categoria,
         (SELECT group_concat(nombre, ', ') FROM (
            SELECT a.nombre FROM pelicula_actor pa JOIN actor a ON a.actor_id = pa.actor_id
            WHERE pa.pelicula_id = p.pelicula_id ORDER BY pa.rowid)) AS reparto
  FROM pelicula p JOIN categoria c ON c.categoria_id = p.categoria_id`;
const conPortada = p => ({ ...p, portada: portadas.urlDe(p.pelicula_id) });

const socioExiste = id => {
  if (!db.prepare('SELECT 1 FROM socio WHERE socio_id = ?').get(id)) throw new HttpError(404, 'Socio no encontrado');
};
const peliculaExiste = id => {
  if (!db.prepare('SELECT 1 FROM pelicula WHERE pelicula_id = ?').get(id)) throw new HttpError(404, 'Película no encontrada');
};
function cuentaPropia(user, rawId) {
  const id = toId(rawId);
  if (user.rol !== 'admin' && user.socio_id !== id) throw new HttpError(403, 'Solo puedes ver y modificar tu propia cuenta.');
  socioExiste(id);
  return id;
}

const routes = [];
const route = (method, pattern, acceso, handler, opts = {}) =>
  routes.push({ method, acceso, handler, ...opts, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$') });

route('POST', '/api/auth/login', 'public', ({ body, req, ctx }) => {
  const email = String(body.email ?? '').trim().toLowerCase().slice(0, 100);
  const password = String(body.password ?? '').slice(0, 200);
  if (!email || !password) throw new HttpError(400, 'Ingresa tu correo y tu contraseña.');
  const r = auth.login(email, password, clientIp(req));
  if (r?.bloqueado) throw new HttpError(429, `Demasiados intentos fallidos. Espera ${r.bloqueado} min e inténtalo de nuevo.`);
  if (!r) throw new HttpError(401, 'Correo o contraseña incorrectos.');
  ctx.headers['Set-Cookie'] = auth.cookie(req, auth.abrirSesion(r.usuario.socio_id));
  return r.usuario;
});

route('POST', '/api/auth/registro', 'public', ({ body, req, ctx }) => {
  const nuevo = crearSocio(validarSocio(body));
  ctx.status = 201;
  ctx.headers['Set-Cookie'] = auth.cookie(req, auth.abrirSesion(nuevo.socio_id));
  return nuevo;
});

route('POST', '/api/auth/logout', 'public', ({ req, ctx }) => {
  auth.cerrarSesion(req);
  ctx.headers['Set-Cookie'] = auth.cookie(req, null);
  return { ok: true };
});

// Sin sesión responde null (200) en lugar de 401, para no ensuciar la consola del navegador.
route('GET', '/api/auth/sesion', 'public', ({ user }) => user || null);

route('GET', '/api/peliculas', 'user', ({ query }) => {
  const where = [], args = [];
  const q = (query.get('q') || '').trim().slice(0, 60);
  if (q) {
    const like = '%' + q.replace(/[\\%_]/g, '\\$&') + '%';
    where.push(`(norm(p.titulo) LIKE norm(?) ESCAPE '\\' OR norm(p.director) LIKE norm(?) ESCAPE '\\' OR EXISTS (
      SELECT 1 FROM pelicula_actor pa JOIN actor a ON a.actor_id = pa.actor_id
      WHERE pa.pelicula_id = p.pelicula_id AND norm(a.nombre) LIKE norm(?) ESCAPE '\\'))`);
    args.push(like, like, like);
  }
  if (query.get('categoria')) { where.push('c.nombre = ?'); args.push(query.get('categoria')); }
  if (query.get('clasificacion')) { where.push('p.clasificacion = ?'); args.push(query.get('clasificacion')); }
  const sql = SELECT_PELICULA + (where.length ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY p.anio DESC, p.titulo';
  return db.prepare(sql).all(...args).map(conPortada);
});

route('GET', '/api/peliculas/:id', 'user', ({ params }) => {
  const p = db.prepare(SELECT_PELICULA + ' WHERE p.pelicula_id = ?').get(toId(params.id));
  if (!p) throw new HttpError(404, 'Película no encontrada');
  return conPortada(p);
});

route('GET', '/api/categorias', 'user', () =>
  db.prepare('SELECT nombre FROM categoria ORDER BY nombre').all().map(r => r.nombre));

route('GET', '/api/portadas/:id', 'user', async ({ params, ctx }) => {
  const id = toId(params.id);
  peliculaExiste(id);
  const f = await portadas.obtener(id);
  if (!f) throw new HttpError(404, 'Esta película no tiene portada.');
  ctx.file = f;
});

route('PUT', '/api/portadas/:id', 'admin', async ({ params, req }) => {
  const id = toId(params.id);
  peliculaExiste(id);
  const buf = await readRaw(req, portadas.MAX_UPLOAD + 1);
  const r = await portadas.subir(id, buf);
  if (r.error) throw new HttpError(400, r.error);
  return r;
}, { rawBody: true });

route('DELETE', '/api/portadas/:id', 'admin', async ({ params }) => {
  const id = toId(params.id);
  peliculaExiste(id);
  return portadas.quitar(id);
});

route('GET', '/api/admin/alquileres', 'admin', () =>
  db.prepare(`SELECT v.*, s.nombre AS socio, s.email AS socio_email
              FROM v_alquiler v JOIN socio s ON s.socio_id = v.socio_id
              ORDER BY v.fecha_alquiler DESC, v.alquiler_id DESC`).all());

route('GET', '/api/socios', 'admin', () =>
  db.prepare('SELECT socio_id, nombre, email, rol FROM socio ORDER BY nombre').all());

route('POST', '/api/socios', 'admin', ({ body, ctx }) => {
  ctx.status = 201;
  return crearSocio(validarSocio(body));
});

route('GET', '/api/socios/:id/alquileres', 'user', ({ params, user }) => {
  const id = cuentaPropia(user, params.id);
  return db.prepare('SELECT * FROM v_alquiler WHERE socio_id = ? ORDER BY fecha_alquiler DESC, alquiler_id DESC').all(id);
});

route('POST', '/api/socios/:id/alquileres', 'user', ({ params, body, ctx, user }) => {
  const id = cuentaPropia(user, params.id);
  const items = body.items;
  if (!Array.isArray(items) || !items.length || items.length > 20) throw new HttpError(400, 'El carrito está vacío o es demasiado grande.');
  const tarifa = db.prepare('SELECT tarifa_dia FROM pelicula WHERE pelicula_id = ?');
  const ins = db.prepare(`INSERT INTO alquiler (socio_id, pelicula_id, dias, fecha_limite, total)
                          VALUES (?, ?, ?, datetime('now', ?), ?)`);
  const total = tx(db, () => {
    let suma = 0;
    for (const it of items) {
      const pid = toId(it?.pelicula_id);
      const dias = Math.max(1, Math.min(14, Math.trunc(Number(it.dias)) || 1));
      const p = tarifa.get(pid);
      if (!p) throw new HttpError(404, `La película ${pid} no existe.`);
      const sub = Math.round(p.tarifa_dia * dias * 100) / 100;
      ins.run(id, pid, dias, `+${dias} days`, sub);
      suma += sub;
    }
    return Math.round(suma * 100) / 100;
  });
  ctx.status = 201;
  return { ok: true, total, cantidad: items.length };
});

route('PATCH', '/api/socios/:id/alquileres/:aid/devolucion', 'user', ({ params, user }) => {
  const id = cuentaPropia(user, params.id), aid = toId(params.aid);
  const r = db.prepare(`UPDATE alquiler SET fecha_devolucion = datetime('now')
                        WHERE alquiler_id = ? AND socio_id = ? AND fecha_devolucion IS NULL`).run(aid, id);
  if (!r.changes) throw new HttpError(409, 'El alquiler no existe o ya fue devuelto.');
  return db.prepare('SELECT * FROM v_alquiler WHERE alquiler_id = ?').get(aid);
});

route('GET', '/api/socios/:id/favoritos', 'user', ({ params, user }) => {
  const id = cuentaPropia(user, params.id);
  return db.prepare('SELECT pelicula_id FROM favorito WHERE socio_id = ?').all(id).map(r => r.pelicula_id);
});
route('PUT', '/api/socios/:id/favoritos/:pid', 'user', ({ params, user }) => {
  const id = cuentaPropia(user, params.id), pid = toId(params.pid);
  peliculaExiste(pid);
  db.prepare('INSERT OR IGNORE INTO favorito (socio_id, pelicula_id) VALUES (?, ?)').run(id, pid);
  return { favorito: true };
});
route('DELETE', '/api/socios/:id/favoritos/:pid', 'user', ({ params, user }) => {
  const id = cuentaPropia(user, params.id), pid = toId(params.pid);
  db.prepare('DELETE FROM favorito WHERE socio_id = ? AND pelicula_id = ?').run(id, pid);
  return { favorito: false };
});

function sendFile(req, res, f, cache) {
  res.writeHead(200, {
    'Content-Type': f.type || MIME[path.extname(f.file).toLowerCase()] || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff', 'Cache-Control': cache
  });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(f.file).on('error', () => res.destroy()).pipe(res);
}

function serveStatic(req, res, pathname) {
  let rel;
  try { rel = decodeURIComponent(pathname).replace(/^\/+/, ''); } catch { return send(res, 400, { error: 'URL inválida' }); }
  if (rel === '') rel = 'index.html';
  if (rel === 'favicon.ico') { res.writeHead(204); return res.end(); }
  if (rel === 'js/modo.json') return send(res, 200, { servidor: true });
  if (PAGINAS.has(rel)) {
    const user = auth.usuario(req);
    if (rel === 'index.html' && !user) { res.writeHead(302, { Location: '/login.html', 'Cache-Control': 'no-store' }); return res.end(); }
    if (rel === 'login.html' && user) { res.writeHead(302, { Location: '/', 'Cache-Control': 'no-store' }); return res.end(); }
  } else if (!STATIC_DIRS.has(rel.split('/')[0])) {
    return send(res, 404, { error: 'No encontrado' });
  }
  const file = path.resolve(ROOT, rel);
  if (!file.startsWith(ROOT + path.sep)) return send(res, 403, { error: 'Acceso denegado' });
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, { error: 'No encontrado' });
    sendFile(req, res, { file }, PAGINAS.has(rel) ? 'no-store' : 'no-cache');
  });
}

function mismoOrigen(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) {
      for (const r of routes) {
        const m = r.method === req.method && url.pathname.match(r.re);
        if (!m) continue;
        if (req.method !== 'GET' && !mismoOrigen(req)) throw new HttpError(403, 'Origen no permitido');
        const user = auth.usuario(req);
        if (r.acceso !== 'public' && !user) throw new HttpError(401, 'Tu sesión terminó. Vuelve a iniciar sesión.');
        if (r.acceso === 'admin' && user.rol !== 'admin') throw new HttpError(403, 'Esta acción es solo para administradores.');
        const ctx = { status: 200, headers: {}, file: null };
        const body = !r.rawBody && ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readJson(req) : {};
        const data = await r.handler({ params: m.groups || {}, query: url.searchParams, body, ctx, user, req });
        if (ctx.file) return sendFile(req, res, ctx.file, 'private, max-age=86400');
        return send(res, ctx.status, data, ctx.headers);
      }
      const existe = routes.some(r => url.pathname.match(r.re));
      throw new HttpError(existe ? 405 : 404, existe ? 'Método no permitido' : 'Ruta no encontrada');
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Método no permitido');
    serveStatic(req, res, url.pathname);
  } catch (e) {
    if (res.headersSent) return res.destroy();
    if (e instanceof HttpError) return send(res, e.status, { error: e.message });
    console.error(e);
    send(res, 500, { error: 'Error interno del servidor' });
  }
});

server.on('error', e => {
  if (e.code === 'EADDRINUSE') console.error(`El puerto ${PORT} ya está en uso. Cierra el otro servidor o usa otro puerto (PORT=3001 en .env).`);
  else console.error(e);
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Club Sakila listo en http://localhost:${PORT}`);
  console.log(portadas.fuentes.length
    ? `Portadas de los discos: ${portadas.fuentes.join(' → ')}.`
    : 'Portadas de los discos: desactivadas (sin TMDB y con PORTADAS_WIKIPEDIA=0).');
  if (!portadas.tmdbActivo) console.log('  (Opcional: define TMDB_TOKEN o TMDB_API_KEY en .env para usar TMDB primero.)');
  portadas.precargar().catch(e => console.warn('Precarga de portadas:', e.message));
});
