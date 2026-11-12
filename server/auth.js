'use strict';
const crypto = require('node:crypto');

const ITER = 120_000;
const SESSION_DAYS = 7;
const COOKIE = 'sid';

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const dk = crypto.pbkdf2Sync(String(password), salt, ITER, 32, 'sha256');
  return `pbkdf2$${ITER}$${salt.toString('base64')}$${dk.toString('base64')}`;
}

function verifyPassword(password, stored) {
  const [alg, iter, salt, hash] = String(stored || '').split('$');
  if (alg !== 'pbkdf2' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const dk = crypto.pbkdf2Sync(String(password), Buffer.from(salt, 'base64'), Number(iter), expected.length, 'sha256');
  return crypto.timingSafeEqual(dk, expected);
}

const DUMMY_HASH = hashPassword(crypto.randomBytes(12).toString('hex'));

const sha256 = v => crypto.createHash('sha256').update(v).digest('hex');

function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i <= 0) continue;
    // Una cookie mal codificada no debe tumbar la petición: se ignora.
    try { out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); } catch { }
  }
  return out;
}

function createAuth(db) {
  const q = {
    crear: db.prepare(`INSERT INTO sesion (token_hash, socio_id, expira) VALUES (?, ?, datetime('now', '+${SESSION_DAYS} days'))`),
    buscar: db.prepare(`SELECT s.socio_id, s.nombre, s.email, s.rol FROM sesion x JOIN socio s ON s.socio_id = x.socio_id
                        WHERE x.token_hash = ? AND x.expira > datetime('now')`),
    borrar: db.prepare('DELETE FROM sesion WHERE token_hash = ?'),
    limpiar: db.prepare("DELETE FROM sesion WHERE expira <= datetime('now')"),
    porEmail: db.prepare('SELECT socio_id, nombre, email, rol, password_hash FROM socio WHERE email = ?')
  };
  q.limpiar.run();

  const intentos = new Map();
  const VENTANA = 15 * 60_000, MAX_FALLOS = 8;

  function limitar(clave) {
    const ahora = Date.now();
    const r = intentos.get(clave);
    if (r && ahora - r.desde < VENTANA && r.fallos >= MAX_FALLOS) {
      return Math.ceil((VENTANA - (ahora - r.desde)) / 60_000);
    }
    return 0;
  }
  function fallo(clave) {
    const ahora = Date.now();
    const r = intentos.get(clave);
    if (!r || ahora - r.desde >= VENTANA) intentos.set(clave, { desde: ahora, fallos: 1 });
    else r.fallos++;
    if (intentos.size > 5000) intentos.clear();
  }

  function login(email, password, ip) {
    const clave = `${ip}|${email}`;
    const espera = limitar(clave);
    if (espera) return { bloqueado: espera };
    const u = q.porEmail.get(email);
    const ok = verifyPassword(password, u ? u.password_hash : DUMMY_HASH) && Boolean(u);
    if (!ok) { fallo(clave); return null; }
    intentos.delete(clave);
    return { usuario: { socio_id: u.socio_id, nombre: u.nombre, email: u.email, rol: u.rol } };
  }

  function abrirSesion(socioId) {
    const token = crypto.randomBytes(32).toString('base64url');
    q.crear.run(sha256(token), socioId);
    return token;
  }

  function usuario(req) {
    const token = parseCookies(req.headers.cookie)[COOKIE];
    if (!token || token.length > 100) return null;
    return q.buscar.get(sha256(token)) || null;
  }

  function cerrarSesion(req) {
    const token = parseCookies(req.headers.cookie)[COOKIE];
    if (token) q.borrar.run(sha256(token));
  }

  function cookie(req, token) {
    const https = req.headers['x-forwarded-proto'] === 'https' || req.socket.encrypted;
    const base = `${COOKIE}=${token ?? ''}; Path=/; HttpOnly; SameSite=Lax${https ? '; Secure' : ''}`;
    return token ? `${base}; Max-Age=${SESSION_DAYS * 86400}` : `${base}; Max-Age=0`;
  }

  return { login, abrirSesion, usuario, cerrarSesion, cookie };
}

module.exports = { createAuth, hashPassword, verifyPassword };
