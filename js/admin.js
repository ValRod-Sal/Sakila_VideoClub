import { api } from './api.js';
import { esc, bs, discHTML } from './disc.js';

// Mostrador del administrador (su página principal): préstamos activos con cuenta
// regresiva, historial, disponibilidad de discos y resumen por socio.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const HORA = 3_600_000;
const DIA = 24 * HORA;
const TABS = ['prestamos', 'historial', 'peliculas', 'socios'];

const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const fecha = s => s ? new Date(s).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fechaHora = s => s ? new Date(s).toLocaleString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

export function duracion(ms) {
  const min = Math.max(1, Math.round(Math.abs(ms) / 60_000));
  const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60;
  if (d) return `${plural(d, 'día', 'días')}${h ? ` ${h} h` : ''}`;
  if (h) return `${h} h${m ? ` ${m} min` : ''}`;
  return `${m} min`;
}

function cuentaRegresiva(a, ahora) {
  const inicio = Date.parse(a.fecha_alquiler), limite = Date.parse(a.fecha_limite);
  const resta = limite - ahora;
  const p = Math.min(100, Math.max(0, ((ahora - inicio) / Math.max(1, limite - inicio)) * 100));
  if (resta < 0) return { clase: 'countdown--late', texto: `Vencido hace ${duracion(resta)}`, p: 100 };
  return { clase: resta < DIA ? 'countdown--soon' : '', texto: `Quedan ${duracion(resta)}`, p };
}

export function createAdminPanel({ toast, getPeliculas, getSocios, onAbrirDisco }) {
  const raiz = $('#admin');
  let alquileres = [];
  let tab = 'prestamos';
  let reloj = null;
  let cargadoEn = null;

  const filtro = () => norm($('#adminQ').value.trim());
  const coincide = (a, q) => !q || [a.titulo, a.socio, a.socio_email].some(v => norm(v).includes(q));
  const peli = id => getPeliculas().find(p => p.pelicula_id === id);
  const activos = () => alquileres.filter(a => !a.fecha_devolucion);

  function discoCelda(id, titulo, sub = '') {
    const p = peli(id) || { titulo, anio: '', clasificacion: '' };
    return `<div class="admin-film">
      <span class="admin-film__disc">${discHTML(p)}</span>
      <span><strong class="admin-film__title">${esc(titulo)}</strong>${sub ? `<small>${sub}</small>` : ''}</span>
    </div>`;
  }
  const socioCelda = a => `<div class="admin-who"><strong>${esc(a.socio)}</strong><small>${esc(a.socio_email)}</small></div>`;

  function renderStats() {
    const ahora = Date.now();
    const act = activos();
    const vencidos = act.filter(a => Date.parse(a.fecha_limite) < ahora).length;
    const pronto = act.filter(a => { const r = Date.parse(a.fecha_limite) - ahora; return r >= 0 && r < DIA; }).length;
    const multas = act.reduce((s, a) => s + Number(a.multa), 0);
    const mes = new Date(); mes.setDate(1); mes.setHours(0, 0, 0, 0);
    const ingresosMes = alquileres.filter(a => Date.parse(a.fecha_alquiler) >= mes).reduce((s, a) => s + Number(a.total), 0);
    const peliculas = getPeliculas();
    const prestadas = new Set(act.map(a => a.pelicula_id)).size;
    $('#adminStats').innerHTML = `
      <div class="stat"><strong>${act.length}</strong><span>Discos en préstamo</span></div>
      <div class="stat ${vencidos ? 'stat--alert' : ''}"><strong>${vencidos}</strong><span>Préstamos vencidos</span></div>
      <div class="stat"><strong>${pronto}</strong><span>Vencen en menos de 24 h</span></div>
      <div class="stat ${multas ? 'stat--alert' : ''}"><strong>${bs(multas)}</strong><span>Multas por cobrar</span></div>
      <div class="stat"><strong>${bs(ingresosMes)}</strong><span>Alquileres este mes</span></div>
      <div class="stat"><strong>${peliculas.length - prestadas}<small class="muted"> / ${peliculas.length}</small></strong><span>Títulos sin préstamo activo</span></div>`;
    $('#adminNavDot').hidden = !vencidos;
  }

  function renderPrestamos(q) {
    const ahora = Date.now();
    const filas = activos().filter(a => coincide(a, q)).sort((a, b) => Date.parse(a.fecha_limite) - Date.parse(b.fecha_limite));
    $('#adminPrestamos').innerHTML = filas.length ? filas.map(a => {
      const c = cuentaRegresiva(a, ahora);
      return `<tr class="${c.clase === 'countdown--late' ? 'row--late' : ''}">
        <td>${discoCelda(a.pelicula_id, a.titulo, plural(a.dias, 'día', 'días') + ' · ' + bs(a.total))}</td>
        <td>${socioCelda(a)}</td>
        <td>${fechaHora(a.fecha_alquiler)}</td>
        <td>${fechaHora(a.fecha_limite)}</td>
        <td><div class="countdown ${c.clase}"><span class="countdown__text">${esc(c.texto)}</span>
          <span class="countdown__bar" aria-hidden="true"><span style="--p:${c.p.toFixed(1)}%"></span></span></div></td>
        <td>${Number(a.multa) ? `<strong class="text-alert">${bs(a.multa)}</strong>` : '—'}</td>
        <td><button class="btn btn--sm" type="button" data-devolver="${a.alquiler_id}" data-socio="${a.socio_id}">Registrar devolución</button></td>
      </tr>`;
    }).join('') : `<tr><td colspan="7" class="empty">${q ? 'Ningún préstamo activo coincide con la búsqueda.' : 'No hay discos en préstamo ahora mismo.'}</td></tr>`;
    return filas.length;
  }

  function renderHistorial(q) {
    const estado = $('#adminEstado').value;
    const filas = alquileres.filter(a => coincide(a, q) && (!estado || a.estado === estado));
    $('#adminHistorial').innerHTML = filas.length ? filas.map(a => `
      <tr>
        <td>${discoCelda(a.pelicula_id, a.titulo, plural(a.dias, 'día', 'días'))}</td>
        <td>${socioCelda(a)}</td>
        <td>${fecha(a.fecha_alquiler)}</td>
        <td>${fecha(a.fecha_limite)}</td>
        <td>${fecha(a.fecha_devolucion)}</td>
        <td><span class="badge ${a.estado === 'Vencido' ? 'badge--late' : a.estado === 'Devuelto' ? 'badge--ok' : ''}">${esc(a.estado)}</span></td>
        <td>${bs(a.total)}</td>
        <td>${Number(a.multa) ? `<strong class="text-alert">${bs(a.multa)}</strong>` : '—'}</td>
      </tr>`).join('') : '<tr><td colspan="8" class="empty">No hay alquileres con ese filtro.</td></tr>';
    return filas.length;
  }

  function renderPeliculas(q) {
    const stats = getPeliculas().map(p => {
      const suyos = alquileres.filter(a => a.pelicula_id === p.pelicula_id);
      return { p, veces: suyos.length, ingresos: suyos.reduce((s, a) => s + Number(a.total) + Number(a.multa), 0), activos: suyos.filter(a => !a.fecha_devolucion) };
    }).filter(x => !q || norm(x.p.titulo).includes(q) || x.activos.some(a => norm(a.socio).includes(q)))
      .sort((a, b) => b.veces - a.veces || b.ingresos - a.ingresos || a.p.titulo.localeCompare(b.p.titulo, 'es'));
    const max = Math.max(1, ...stats.map(x => x.veces));
    $('#adminPeliculas').innerHTML = stats.length ? stats.map(({ p, veces, ingresos, activos: act }) => `
      <tr>
        <td>${discoCelda(p.pelicula_id, p.titulo, `${esc(p.anio)} · ${esc(p.categoria)} · ${bs(p.tarifa_dia)}/día`)}</td>
        <td class="avail ${act.length ? '' : 'avail--free'}">${act.length
          ? act.map(a => `Con ${esc(a.socio)} hasta ${fecha(a.fecha_limite)}`).join('<br>')
          : 'Sin préstamos activos'}</td>
        <td>${veces}</td>
        <td><span class="pop-bar" role="img" aria-label="${veces} de ${max}"><span style="--p:${(veces / max * 100).toFixed(1)}%"></span></span></td>
        <td>${bs(ingresos)}</td>
        <td><button class="btn btn--ghost btn--sm" type="button" data-abrir-disco="${p.pelicula_id}">Ficha y portada</button></td>
      </tr>`).join('') : '<tr><td colspan="6" class="empty">Ningún disco coincide con la búsqueda.</td></tr>';
    return stats.length;
  }

  function renderSocios(q) {
    const filas = getSocios().filter(s => !q || norm(s.nombre).includes(q) || norm(s.email).includes(q)).map(s => {
      const suyos = alquileres.filter(a => a.socio_id === s.socio_id);
      const act = suyos.filter(a => !a.fecha_devolucion);
      return {
        s, total: suyos.length, activos: act.length,
        vencidos: act.filter(a => a.estado === 'Vencido').length,
        multas: act.reduce((t, a) => t + Number(a.multa), 0),
        gastado: suyos.reduce((t, a) => t + Number(a.total), 0)
      };
    }).sort((a, b) => b.vencidos - a.vencidos || b.activos - a.activos || a.s.nombre.localeCompare(b.s.nombre, 'es'));
    $('#adminSocios').innerHTML = filas.length ? filas.map(x => `
      <tr class="${x.vencidos ? 'row--late' : ''}">
        <td><div class="admin-who"><strong>${esc(x.s.nombre)}</strong><small>${esc(x.s.email)}</small></div></td>
        <td><span class="badge">${x.s.rol === 'admin' ? 'Admin' : 'Socio'}</span></td>
        <td>${x.total}</td>
        <td>${x.activos}</td>
        <td>${x.vencidos ? `<span class="badge badge--late">${x.vencidos}</span>` : '0'}</td>
        <td>${x.multas ? `<strong class="text-alert">${bs(x.multas)}</strong>` : '—'}</td>
        <td>${bs(x.gastado)}</td>
        <td><button class="btn btn--ghost btn--sm" type="button" data-ver-socio="${esc(x.s.email)}">Ver alquileres</button></td>
      </tr>`).join('') : '<tr><td colspan="8" class="empty">Ningún socio coincide con la búsqueda.</td></tr>';
    return filas.length;
  }

  function render() {
    const q = filtro();
    renderStats();
    const counts = { prestamos: renderPrestamos(q), historial: renderHistorial(q), peliculas: renderPeliculas(q), socios: renderSocios(q) };
    TABS.forEach(t => { $(`#acount-${t}`).textContent = counts[t]; });
    if (cargadoEn) $('#adminUpdated').textContent = `Actualizado a las ${cargadoEn.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}`;
  }

  function mostrarTab(nombre, enfocar = false) {
    tab = nombre;
    TABS.forEach(t => {
      const b = $(`#atab-${t}`), on = t === nombre;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      $(`#apanel-${t}`).hidden = !on;
      if (on && enfocar) b.focus();
    });
    $('#adminEstadoField').hidden = nombre !== 'historial';
    $$('[data-admin-tab]').forEach(b => b.classList.toggle('is-active', b.dataset.adminTab === nombre));
  }

  async function cargar() {
    alquileres = await api.adminAlquileres();
    cargadoEn = new Date();
    render();
  }

  async function iniciar() {
    $('#adminHoy').textContent = new Date().toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' });
    mostrarTab(tab);
    $('#adminUpdated').textContent = 'Cargando…';
    await cargar();
    clearInterval(reloj);
    reloj = setInterval(render, 30_000);
  }

  function error(msg) {
    $('#adminUpdated').textContent = '';
    $('#adminPrestamos').innerHTML = `<tr><td colspan="7" class="empty">No se pudo cargar el mostrador. Inicia el servidor con <code>npm start</code>. (${esc(msg)})</td></tr>`;
  }

  function exportarCsv() {
    const cols = ['alquiler_id', 'socio', 'socio_email', 'titulo', 'fecha_alquiler', 'dias', 'fecha_limite', 'fecha_devolucion', 'estado', 'total', 'multa'];
    const celda = v => { const s = String(v ?? ''); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = '﻿' + [cols.join(';'), ...alquileres.map(a => cols.map(c => celda(a[c])).join(';'))].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: `alquileres-club-sakila-${new Date().toISOString().slice(0, 10)}.csv` });
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`CSV exportado: ${plural(alquileres.length, 'alquiler', 'alquileres')}.`);
  }

  // Eventos
  $$('.admin__tabs [role="tab"]').forEach((b, i, all) => {
    b.addEventListener('click', () => mostrarTab(b.id.replace('atab-', '')));
    b.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      mostrarTab(all[(i + d + all.length) % all.length].id.replace('atab-', ''), true);
    });
  });
  let t;
  $('#adminQ').addEventListener('input', () => { clearTimeout(t); t = setTimeout(render, 150); });
  $('#adminEstado').addEventListener('change', render);
  $('#adminRefresh').addEventListener('click', async () => {
    try { await cargar(); toast('Panel actualizado.'); } catch (e) { toast(e.message); }
  });
  $('#adminCsv').addEventListener('click', exportarCsv);
  $$('[data-admin-tab]').forEach(b => b.addEventListener('click', () => {
    mostrarTab(b.dataset.adminTab);
    raiz.scrollIntoView({ behavior: 'smooth' });
  }));
  raiz.addEventListener('click', async e => {
    const dev = e.target.closest('[data-devolver]');
    if (dev) {
      dev.disabled = true;
      try {
        const r = await api.devolver(Number(dev.dataset.socio), Number(dev.dataset.devolver));
        await cargar();
        toast(Number(r.multa) ? `Devolución de “${r.titulo}” registrada con multa de ${bs(r.multa)}.` : `Devolución de “${r.titulo}” registrada a tiempo.`);
      } catch (err) { dev.disabled = false; toast(err.message); }
      return;
    }
    const ver = e.target.closest('[data-ver-socio]');
    if (ver) {
      $('#adminQ').value = ver.dataset.verSocio;
      $('#adminEstado').value = '';
      mostrarTab('historial', true);
      render();
      return;
    }
    const disco = e.target.closest('[data-abrir-disco]');
    if (disco) onAbrirDisco?.(Number(disco.dataset.abrirDisco));
  });

  return { iniciar, render, error, mostrarTab };
}
