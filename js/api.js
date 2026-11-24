const BASE = '/api';
const DEMO_KEY = 'clubsakila:demo-db';
const DEMO_SESSION = 'clubsakila:demo-session';
const MULTA_DIA = 2;
const DAY = 86_400_000;
const MAX_PORTADA = 3 * 1024 * 1024;

let modo = null;
const listeners = new Set();
export const onModeChange = fn => { listeners.add(fn); if (modo) fn(modo); };
export const getMode = () => modo;
const setMode = m => { if (modo !== m) { modo = m; listeners.forEach(fn => fn(m)); } };

class ServerMissing extends Error {}

async function request(path, { method = 'GET', body, raw } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      credentials: 'same-origin',
      headers: raw ? { 'Content-Type': raw.type || 'application/octet-stream' } : body ? { 'Content-Type': 'application/json' } : undefined,
      body: raw || (body ? JSON.stringify(body) : undefined)
    });
  } catch {
    throw new ServerMissing();
  }
  if (!(res.headers.get('content-type') || '').includes('application/json')) throw new ServerMissing();
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.error || `Error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

const qs = obj => {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => { if (v) p.set(k, v); });
  const s = p.toString();
  return s ? '?' + s : '';
};

let demoDb = null;
async function loadDemo() {
  if (demoDb) return demoDb;
  try { demoDb = JSON.parse(localStorage.getItem(DEMO_KEY)); } catch { demoDb = null; }
  if (!demoDb?.peliculas || !demoDb.socios?.[0]?.password_hash) {
    const { DEMO_DATA } = await import('./demo-data.js');
    const now = Date.now();
    const at = d => d == null ? null : new Date(now + d * DAY).toISOString();
    demoDb = structuredClone(DEMO_DATA);
    demoDb.alquileres = DEMO_DATA.alquileres.map(a => ({
      alquiler_id: a.alquiler_id, socio_id: a.socio_id, pelicula_id: a.pelicula_id, dias: a.dias, total: a.total,
      fecha_alquiler: at(a.d_alquiler), fecha_limite: at(a.d_limite), fecha_devolucion: at(a.d_devolucion)
    }));
    saveDemo();
  }
  return demoDb;
}
function saveDemo() { try { localStorage.setItem(DEMO_KEY, JSON.stringify(demoDb)); } catch { } }
export function resetDemo() {
  demoDb = null;
  try { localStorage.removeItem(DEMO_KEY); localStorage.removeItem(DEMO_SESSION); } catch { }
}

const fail = (status, msg) => { const e = new Error(msg); e.status = status; throw e; };
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const r2 = n => Math.round(n * 100) / 100;
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function pbkdf2(password, salt, iter, bytes = 32) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, bytes * 8);
}
async function demoHash(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$120000$${b64(salt)}$${b64(await pbkdf2(password, salt, 120000))}`;
}
async function demoVerify(password, stored) {
  const [alg, iter, salt, hash] = String(stored || '').split('$');
  if (alg !== 'pbkdf2') return false;
  const expected = fromB64(hash);
  const got = new Uint8Array(await pbkdf2(password, fromB64(salt), Number(iter), expected.length));
  return got.length === expected.length && got.every((v, i) => v === expected[i]);
}

const publico = s => ({ socio_id: s.socio_id, nombre: s.nombre, email: s.email, rol: s.rol });
function demoUser(db) {
  let id = null;
  try { id = JSON.parse(localStorage.getItem(DEMO_SESSION))?.socio_id; } catch { }
  const s = db.socios.find(x => x.socio_id === id);
  return s ? publico(s) : null;
}
function requireUser(db, rol) {
  const u = demoUser(db);
  if (!u) fail(401, 'Tu sesión terminó. Vuelve a iniciar sesión.');
  if (rol === 'admin' && u.rol !== 'admin') fail(403, 'Esta acción es solo para administradores.');
  return u;
}
function cuentaPropia(db, id) {
  const u = requireUser(db);
  const sid = Number(id);
  if (u.rol !== 'admin' && u.socio_id !== sid) fail(403, 'Solo puedes ver y modificar tu propia cuenta.');
  if (!db.socios.some(s => s.socio_id === sid)) fail(404, 'Socio no encontrado');
  return sid;
}
function validarSocio({ nombre, email, password }) {
  nombre = String(nombre ?? '').trim().replace(/\s+/g, ' ');
  email = String(email ?? '').trim().toLowerCase();
  password = String(password ?? '');
  if (nombre.length < 3 || nombre.length > 80) fail(400, 'El nombre debe tener entre 3 y 80 caracteres.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100) fail(400, 'Ingresa un correo válido.');
  if (password.length < 8 || password.length > 72 || !/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(password) || !/\d/.test(password)) {
    fail(400, 'La contraseña debe tener entre 8 y 72 caracteres, con al menos una letra y un número.');
  }
  return { nombre, email, password };
}
async function demoCrearSocio(db, datos) {
  const { nombre, email, password } = validarSocio(datos);
  if (db.socios.some(s => s.email === email)) fail(409, 'Ya existe un socio con ese correo.');
  const nuevo = { socio_id: Math.max(0, ...db.socios.map(s => s.socio_id)) + 1, nombre, email, rol: 'socio', password_hash: await demoHash(password) };
  db.socios.push(nuevo);
  saveDemo();
  return publico(nuevo);
}

function vistaAlquiler(db, a) {
  const p = db.peliculas.find(x => x.pelicula_id === a.pelicula_id);
  const ref = a.fecha_devolucion ? Date.parse(a.fecha_devolucion) : Date.now();
  const limite = Date.parse(a.fecha_limite);
  const estado = a.fecha_devolucion ? 'Devuelto' : Date.now() > limite ? 'Vencido' : 'En curso';
  const multa = ref > limite ? Math.trunc((ref - limite) / DAY + 0.001) * MULTA_DIA : 0;
  return { ...a, titulo: p?.titulo ?? '—', estado, multa };
}

const demo = {
  async login({ email, password }) {
    const db = await loadDemo();
    email = String(email ?? '').trim().toLowerCase();
    if (!email || !password) fail(400, 'Ingresa tu correo y tu contraseña.');
    const s = db.socios.find(x => x.email === email);
    if (!s || !(await demoVerify(String(password), s.password_hash))) fail(401, 'Correo o contraseña incorrectos.');
    localStorage.setItem(DEMO_SESSION, JSON.stringify({ socio_id: s.socio_id }));
    return publico(s);
  },
  async registro(datos) {
    const db = await loadDemo();
    const nuevo = await demoCrearSocio(db, datos);
    localStorage.setItem(DEMO_SESSION, JSON.stringify({ socio_id: nuevo.socio_id }));
    return nuevo;
  },
  async logout() { try { localStorage.removeItem(DEMO_SESSION); } catch { } return { ok: true }; },
  async sesion() { return demoUser(await loadDemo()) || fail(401, 'No has iniciado sesión.'); },
  async peliculas({ q = '', categoria = '', clasificacion = '' } = {}) {
    const db = await loadDemo(); requireUser(db);
    const t = norm(String(q).trim().slice(0, 60));
    return db.peliculas.filter(p =>
      (!t || [p.titulo, p.director, p.reparto].some(v => norm(v).includes(t))) &&
      (!categoria || p.categoria === categoria) &&
      (!clasificacion || p.clasificacion === clasificacion));
  },
  async pelicula(id) {
    const db = await loadDemo(); requireUser(db);
    return db.peliculas.find(x => x.pelicula_id === Number(id)) || fail(404, 'Película no encontrada');
  },
  async categorias() { const db = await loadDemo(); requireUser(db); return db.categorias; },
  async socios() {
    const db = await loadDemo(); requireUser(db, 'admin');
    return db.socios.map(publico).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  },
  async crearSocio(datos) { const db = await loadDemo(); requireUser(db, 'admin'); return demoCrearSocio(db, datos); },
  async adminAlquileres() {
    const db = await loadDemo(); requireUser(db, 'admin');
    return db.alquileres.map(a => {
      const s = db.socios.find(x => x.socio_id === a.socio_id);
      return { ...vistaAlquiler(db, a), socio: s?.nombre ?? '—', socio_email: s?.email ?? '' };
    }).sort((a, b) => b.fecha_alquiler.localeCompare(a.fecha_alquiler) || b.alquiler_id - a.alquiler_id);
  },
  async alquileres(socioId) {
    const db = await loadDemo(); const sid = cuentaPropia(db, socioId);
    return db.alquileres.filter(a => a.socio_id === sid).map(a => vistaAlquiler(db, a))
      .sort((a, b) => b.fecha_alquiler.localeCompare(a.fecha_alquiler) || b.alquiler_id - a.alquiler_id);
  },
  async alquilar(socioId, items) {
    const db = await loadDemo(); const sid = cuentaPropia(db, socioId);
    if (!Array.isArray(items) || !items.length || items.length > 20) fail(400, 'El carrito está vacío o es demasiado grande.');
    const nuevos = items.map(it => {
      const p = db.peliculas.find(x => x.pelicula_id === Number(it.pelicula_id));
      if (!p) fail(404, `La película ${it.pelicula_id} no existe.`);
      const dias = Math.max(1, Math.min(14, Math.trunc(Number(it.dias)) || 1));
      return { pelicula_id: p.pelicula_id, dias, total: r2(p.tarifa_dia * dias) };
    });
    let next = Math.max(0, ...db.alquileres.map(a => a.alquiler_id));
    const now = Date.now();
    nuevos.forEach(n => db.alquileres.push({
      alquiler_id: ++next, socio_id: sid, ...n,
      fecha_alquiler: new Date(now).toISOString(), fecha_limite: new Date(now + n.dias * DAY).toISOString(), fecha_devolucion: null
    }));
    saveDemo();
    return { ok: true, total: r2(nuevos.reduce((s, n) => s + n.total, 0)), cantidad: nuevos.length };
  },
  async devolver(socioId, alquilerId) {
    const db = await loadDemo(); const sid = cuentaPropia(db, socioId);
    const a = db.alquileres.find(x => x.alquiler_id === Number(alquilerId) && x.socio_id === sid && !x.fecha_devolucion);
    if (!a) fail(409, 'El alquiler no existe o ya fue devuelto.');
    a.fecha_devolucion = new Date().toISOString(); saveDemo();
    return vistaAlquiler(db, a);
  },
  async favoritos(socioId) {
    const db = await loadDemo(); const sid = cuentaPropia(db, socioId);
    return db.favoritos.filter(f => f.socio_id === sid).map(f => f.pelicula_id);
  },
  async agregarFavorito(socioId, peliId) {
    const db = await loadDemo(); const sid = cuentaPropia(db, socioId); const pid = Number(peliId);
    if (!db.peliculas.some(p => p.pelicula_id === pid)) fail(404, 'Película no encontrada');
    if (!db.favoritos.some(f => f.socio_id === sid && f.pelicula_id === pid)) { db.favoritos.push({ socio_id: sid, pelicula_id: pid }); saveDemo(); }
    return { favorito: true };
  },
  async quitarFavorito(socioId, peliId) {
    const db = await loadDemo(); const sid = cuentaPropia(db, socioId);
    db.favoritos = db.favoritos.filter(f => !(f.socio_id === sid && f.pelicula_id === Number(peliId))); saveDemo();
    return { favorito: false };
  },
  async subirPortada() { fail(501, 'Subir portadas requiere el servidor (npm start).'); },
  async quitarPortada() { fail(501, 'Gestionar portadas requiere el servidor (npm start).'); }
};

const server = {
  login: datos => request('/auth/login', { method: 'POST', body: datos }),
  registro: datos => request('/auth/registro', { method: 'POST', body: datos }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  sesion: () => request('/auth/sesion'),
  peliculas: (filtros = {}) => request('/peliculas' + qs(filtros)),
  pelicula: id => request(`/peliculas/${id}`),
  categorias: () => request('/categorias'),
  socios: () => request('/socios'),
  crearSocio: datos => request('/socios', { method: 'POST', body: datos }),
  adminAlquileres: () => request('/admin/alquileres'),
  alquileres: socioId => request(`/socios/${socioId}/alquileres`),
  alquilar: (socioId, items) => request(`/socios/${socioId}/alquileres`, { method: 'POST', body: { items } }),
  devolver: (socioId, alquilerId) => request(`/socios/${socioId}/alquileres/${alquilerId}/devolucion`, { method: 'PATCH' }),
  favoritos: socioId => request(`/socios/${socioId}/favoritos`),
  agregarFavorito: (socioId, peliId) => request(`/socios/${socioId}/favoritos/${peliId}`, { method: 'PUT' }),
  quitarFavorito: (socioId, peliId) => request(`/socios/${socioId}/favoritos/${peliId}`, { method: 'DELETE' }),
  subirPortada: (peliId, file) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file?.type || '')) throw Object.assign(new Error('Formato no admitido. Usa JPG, PNG o WebP.'), { status: 400 });
    if (file.size > MAX_PORTADA) throw Object.assign(new Error('La imagen supera los 3 MB.'), { status: 400 });
    return request(`/portadas/${peliId}`, { method: 'PUT', raw: file });
  },
  quitarPortada: peliId => request(`/portadas/${peliId}`, { method: 'DELETE' })
};

let probe = null;
let probeSesion = null;
const detectMode = () => probe ??= request('/auth/sesion')
  .then(u => { probeSesion = { ok: true, value: u }; setMode('api'); })
  .catch(e => {
    if (!(e instanceof ServerMissing)) probeSesion = { ok: false, value: e };
    setMode(e instanceof ServerMissing ? 'demo' : 'api');
  });

const AUTH_CALLS = new Set(['login', 'registro', 'logout', 'sesion']);
let onExpired = null;
export const onSessionExpired = fn => { onExpired = fn; };

export const api = Object.fromEntries(Object.keys(server).map(name => [name, async (...args) => {
  if (!modo) await detectMode();
  if (name === 'sesion' && probeSesion) {
    const r = probeSesion;
    probeSesion = null;
    if (r.ok) return r.value;
    throw r.value;
  }
  try {
    return modo === 'demo' ? await demo[name](...args) : await server[name](...args);
  } catch (e) {
    if (e instanceof ServerMissing) throw new Error('Se perdió la conexión con el servidor. ¿Sigue corriendo npm start?');
    if (e.status === 401 && !AUTH_CALLS.has(name) && onExpired) onExpired();
    throw e;
  }
}]));
