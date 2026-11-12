import { api, onModeChange } from './api.js';
import { discHTML } from './disc.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ENTRAR = './';

const DISCOS = [
  { titulo: 'Club Sakila', anio: 'SIS', clasificacion: '214', color1: '#891a20', color2: '#2a0608' },
  { titulo: 'Alquila', anio: 'Bs', clasificacion: '4.00', color1: '#1f5f8b', color2: '#0b1f2e' },
  { titulo: 'Devuelve', anio: '14', clasificacion: 'días', color1: '#c49a2a', color2: '#3d2a05' }
];

function setTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('clubsakila:theme', JSON.stringify(t)); } catch { }
  $('#themeBtn').textContent = t === 'dark' ? 'Modo claro' : 'Cine noche';
  $('meta[name="theme-color"]').content = t === 'dark' ? '#0b0c0f' : '#f2f2f2';
}

function mostrar(tab) {
  const login = tab === 'login';
  $('#tabLogin').setAttribute('aria-selected', String(login));
  $('#tabRegistro').setAttribute('aria-selected', String(!login));
  $('#loginForm').hidden = !login;
  $('#registroForm').hidden = login;
  $('#authTitle').textContent = login ? 'Iniciar sesión' : 'Crear cuenta';
  $$('.auth__error').forEach(e => { e.hidden = true; });
  ($(login ? '#loginForm' : '#registroForm').querySelector('input')).focus();
}

function error(form, msg) {
  const p = form.querySelector('.auth__error');
  p.textContent = msg;
  p.hidden = !msg;
}

function mensajeValidacion(form) {
  for (const el of form.elements) {
    if (!el.willValidate || el.validity.valid) continue;
    el.focus();
    const v = el.validity;
    if (v.valueMissing) return 'Completa todos los campos.';
    if (el.type === 'email') return 'Ingresa un correo válido.';
    if (el.name === 'nombre') return 'El nombre debe tener solo letras y al menos 3 caracteres.';
    if (el.name === 'password') return 'La contraseña debe tener mínimo 8 caracteres, con letras y números.';
    return el.validationMessage;
  }
  return '';
}

async function enviar(form, accion) {
  const boton = form.querySelector('.auth__submit');
  const msg = mensajeValidacion(form);
  if (msg) return error(form, msg);
  const datos = Object.fromEntries(new FormData(form));
  if (accion === 'registro' && datos.password !== datos.password2) {
    form.elements.password2.focus();
    return error(form, 'Las contraseñas no coinciden.');
  }
  delete datos.password2;
  error(form, '');
  boton.disabled = true;
  const texto = boton.textContent;
  boton.textContent = 'Un momento…';
  try {
    await api[accion](datos);
    location.replace(ENTRAR);
  } catch (e) {
    error(form, e.message);
    boton.disabled = false;
    boton.textContent = texto;
    if (accion === 'login') { form.elements.password.select(); }
  }
}

function init() {
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  $('#authDiscs').innerHTML = DISCOS.map((d, i) => `<span class="auth__disc auth__disc--${i + 1}">${discHTML(d)}</span>`).join('');

  $('#themeBtn').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
  $('#tabLogin').addEventListener('click', () => mostrar('login'));
  $('#tabRegistro').addEventListener('click', () => mostrar('registro'));
  $$('[role="tab"]').forEach(t => t.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { mostrar(t.id === 'tabLogin' ? 'registro' : 'login'); $(t.id === 'tabLogin' ? '#tabRegistro' : '#tabLogin').focus(); }
  }));
  $$('.password__toggle').forEach(b => b.addEventListener('click', () => {
    const input = b.previousElementSibling;
    const ver = input.type === 'password';
    input.type = ver ? 'text' : 'password';
    b.textContent = ver ? 'Ocultar' : 'Ver';
    b.setAttribute('aria-pressed', String(ver));
    b.setAttribute('aria-label', ver ? 'Ocultar contraseña' : 'Mostrar contraseña');
  }));
  $$('[data-demo]').forEach(b => b.addEventListener('click', () => {
    const [email, password] = b.dataset.demo.split('|');
    mostrar('login');
    const f = $('#loginForm');
    f.elements.email.value = email;
    f.elements.password.value = password;
    f.querySelector('.auth__submit').focus();
  }));
  $('#loginForm').addEventListener('submit', e => { e.preventDefault(); enviar(e.target, 'login'); });
  $('#registroForm').addEventListener('submit', e => { e.preventDefault(); enviar(e.target, 'registro'); });

  onModeChange(m => { $('#demoBanner').hidden = m !== 'demo'; });
  if (new URLSearchParams(location.search).has('expirada')) error($('#loginForm'), 'Tu sesión terminó. Vuelve a iniciar sesión.');
  api.sesion().then(() => location.replace(ENTRAR)).catch(() => { });
}

init();
