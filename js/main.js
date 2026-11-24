import { api, getMode, onModeChange, onSessionExpired, resetDemo } from './api.js';
import { DiscStripGallery } from './disc-strip.js';
import { esc, bs, colorVars, discHTML, discBackHTML, installArtFallback } from './disc.js';
import { createAdminPanel } from './admin.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fecha = s => s ? new Date(s).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const clampDias = v => Math.max(1, Math.min(14, Math.trunc(Number(v)) || 1));
const store = {
  get(k, d) { try { const v = localStorage.getItem('clubsakila:' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('clubsakila:' + k, JSON.stringify(v)); } catch {  } }
};

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}
const guard = fn => async (...a) => { try { return await fn(...a); } catch (e) { toast(e.message || 'Algo salió mal.'); } };

const state = {
  todas: [],
  lista: [],
  socios: [],
  alquileres: [],
  favs: new Set(),
  user: null,
  socioId: null,
  cart: [],
  active: null,
  detail: null
};
const findPeli = id => state.todas.find(p => p.pelicula_id === Number(id));
const isFav = id => state.favs.has(Number(id));
let strip;
let admin = null;

function setTheme(t) {
  document.documentElement.dataset.theme = t;
  store.set('theme', t);
  $('#themeBtn').textContent = t === 'dark' ? 'Modo claro' : 'Cine noche';
  $('meta[name="theme-color"]').content = t === 'dark' ? '#0b0c0f' : '#f2f2f2';
}

function renderHero(p, i = 0, total = 0) {
  state.active = p || null;
  const has = Boolean(p);
  ['#hDetail', '#hTrailer', '#hRent', '#hFav', '#hFlip', '#prevBtn', '#nextBtn'].forEach(s => { $(s).disabled = !has; });
  if (!has) {
    $('#hTitle').textContent = 'Sin resultados';
    ['#hDirector', '#hYear', '#hCast', '#hClub', '#fDur', '#fCat', '#fTar'].forEach(s => { $(s).textContent = '—'; });
    $('#stripCounter').textContent = '00 / 00';
    return;
  }
  const lines = s => String(s || '').split(',').map(x => esc(x.trim())).filter(Boolean);
  const cast = lines(p.reparto);
  $('#hTitle').textContent = p.titulo;
  $('#hDirector').innerHTML = lines(p.director).join('<br>');
  $('#hYear').textContent = p.anio;
  $('#hCast').innerHTML = cast.slice(0, 5).join('<br>') + (cast.length > 5 ? `<br><span class="muted">y ${cast.length - 5} más</span>` : '');
  $('#hClub').textContent = `${p.categoria} · ${p.clasificacion}`;
  $('#hRentText').textContent = `+ Carrito · ${bs(p.tarifa_dia)}`;
  $('#fDur').textContent = `${p.duracion} min`;
  $('#fCat').textContent = p.categoria;
  $('#fTar').textContent = bs(p.tarifa_dia);
  updateHeroFav();
  const pad = n => String(n).padStart(2, '0');
  $('#stripCounter').textContent = `${pad(i + 1)} / ${pad(total)}`;
  $('#srStatus').textContent = `${p.titulo}, disco ${i + 1} de ${total}`;
  $$('.index-item').forEach(b => b.setAttribute('aria-current', String(Number(b.dataset.idx) === i)));
}
function updateHeroFav() {
  const on = state.active && isFav(state.active.pelicula_id);
  $('#hFav').setAttribute('aria-pressed', String(Boolean(on)));
  $('#hFavIcon').textContent = on ? '♥' : '♡';
}

function renderIndex() {
  $('#indexCount').textContent = state.lista.length;
  $('#indexList').innerHTML = state.lista.length
    ? state.lista.map((p, i) => `
      <li><button type="button" class="index-item" data-idx="${i}" aria-current="${i === strip.activeIndex}">
        <span>${esc(p.titulo)}</span><span class="index-item__year">${esc(p.anio)}</span>
      </button></li>`).join('')
    : '<li class="muted index-empty">Sin resultados para este filtro</li>';
}
function toggleIndex(open) {
  const menu = $('#indexMenu');
  const show = typeof open === 'boolean' ? open : menu.hidden;
  menu.hidden = !show;
  $('#indexBtn').setAttribute('aria-expanded', String(show));
}

let reqSeq = 0;
let firstLoad = true;
async function applyFilters() {
  const seq = ++reqSeq;
  const filtros = { q: $('#q').value.trim(), categoria: $('#fCategoria').value, clasificacion: $('#fClasif').value };
  $('#filterDot').hidden = !(filtros.q || filtros.categoria || filtros.clasificacion);
  try {
    const lista = await api.peliculas(filtros);
    if (seq !== reqSeq) return;
    state.lista = lista;
    const keepId = firstLoad ? lista.find(p => p.titulo === 'Uncut Gems')?.pelicula_id : state.active?.pelicula_id;
    firstLoad = false;
    const idx = Math.max(0, lista.findIndex(p => p.pelicula_id === keepId));
    strip.setFilms(lista, idx);
    if (!lista.length) renderHero(null);
    renderIndex();
    renderCatalogo();
  } catch (e) {
    if (seq === reqSeq) toast(e.message);
  }
}

function renderCatalogo() {
  const lista = state.lista;
  $('#resultCount').textContent = plural(lista.length, 'disco', 'discos');
  $('#discGrid').innerHTML = lista.length ? lista.map(p => `
    <li class="disc-item" data-id="${p.pelicula_id}" style="${colorVars(p)}">
      <button class="disc-btn" type="button" data-action="open" aria-label="Ver ficha de ${esc(p.titulo)}">${discHTML(p)}</button>
      <div class="disc-meta">
        <p class="disc-meta__title">${esc(p.titulo)}</p>
        <p>${esc(p.anio)} · ${esc(p.categoria)} · <span class="badge badge--${esc(p.clasificacion)}">${esc(p.clasificacion)}</span></p>
        <div class="disc-actions">
          <button class="btn btn--sm" type="button" data-action="add">Alquilar · ${bs(p.tarifa_dia)}/día</button>
          <button class="btn btn--ghost btn--sm" type="button" data-action="fav" aria-pressed="${isFav(p.pelicula_id)}"
                  aria-label="${isFav(p.pelicula_id) ? 'Quitar de' : 'Añadir a'} favoritos: ${esc(p.titulo)}">${isFav(p.pelicula_id) ? '♥' : '♡'}</button>
        </div>
      </div>
    </li>`).join('')
    : '<li class="empty">No hay discos con esos filtros. Prueba con otra categoría o borra la búsqueda.</li>';
}

function driveHtml(p) {
  const actores = String(p.reparto || '').split(', ').filter(Boolean);
  const reparto = actores.length
    ? actores.slice(0, 3).join(', ') + (actores.length > 3 ? ` y ${actores.length - 3} más` : '')
    : 'Sin reparto registrado';
  const enCarrito = state.cart.find(i => i.id === p.pelicula_id);
  const tuLista = [
    isFav(p.pelicula_id) ? 'En tus favoritos' : '',
    enCarrito ? `En el carrito (${plural(enCarrito.dias, 'día', 'días')})` : ''
  ].filter(Boolean).join(' · ');
  return `
    <strong class="drive__title">${esc(p.titulo)}</strong>
    <p class="drive__meta">${esc(p.categoria)} · ${esc(p.anio)} · ${esc(p.duracion)} min · <span class="badge badge--${esc(p.clasificacion)}">${esc(p.clasificacion)}</span></p>
    <p class="drive__syn">${esc(p.sinopsis)}</p>
    <dl class="drive__facts">
      <div><dt>Dirección</dt><dd>${esc(p.director)}</dd></div>
      <div><dt>Reparto</dt><dd>${esc(reparto)}</dd></div>
      <div><dt>Tarifa</dt><dd>${bs(p.tarifa_dia)} por día</dd></div>
      ${tuLista ? `<div><dt>Tu lista</dt><dd>${esc(tuLista)}</dd></div>` : ''}
    </dl>
    <p class="drive__cta">Haz clic en el disco para ver la ficha completa.</p>`;
}
let driveId = null;
function showInDrive(p) {
  driveId = p?.pelicula_id ?? null;
  if (!p) return;
  $('#driveInfo').innerHTML = driveHtml(p);
  $('#driveLed').classList.add('on');
}

const embed = (url, autoplay) => {
  const u = new URL(url);
  u.searchParams.set('rel', '0');
  if (autoplay) u.searchParams.set('autoplay', '1');
  return u.href;
};
async function openDetail(id) {
  const p = await api.pelicula(id);
  state.detail = p;
  const dlg = $('#detailDlg');
  $('#dDisc').classList.remove('is-flipped');
  $('#dDiscFront').innerHTML = discHTML(p, { lazy: false });
  $('#coverAdmin').hidden = state.user?.rol !== 'admin';
  const sinServidor = getMode() === 'demo';
  $('#coverFile').disabled = sinServidor;
  $('#coverReset').disabled = sinServidor;
  $('#coverAdmin').classList.toggle('is-disabled', sinServidor);
  $('#coverNote').textContent = sinServidor
    ? 'Subir portadas necesita el servidor: ejecuta npm start.'
    : 'JPG, PNG o WebP de hasta 3 MB. “Restablecer” borra la imagen subida y vuelve a buscar el póster en internet (TMDB o Wikipedia).';
  $('#dDiscBack').innerHTML = discBackHTML();
  $('#dMeta').textContent = `${p.categoria} · ${p.anio} · ${p.duracion} min`;
  $('#dTitle').textContent = p.titulo;
  $('#dSyn').textContent = p.sinopsis;
  $('#dDir').textContent = p.director || '—';
  $('#dYear').textContent = p.anio;
  $('#dDur').textContent = `${p.duracion} min`;
  $('#dCla').textContent = p.clasificacion;
  $('#dTar').textContent = `${bs(p.tarifa_dia)} por día`;
  $('#dCast').textContent = p.reparto || 'Sin reparto registrado';
  $('#dTrailer').innerHTML = p.trailer_url
    ? `<iframe src="${esc(embed(p.trailer_url))}" title="Tráiler de ${esc(p.titulo)}" loading="lazy"
         allow="encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`
    : '<p class="muted">Esta película aún no tiene tráiler.</p>';
  const inCart = state.cart.find(i => i.id === p.pelicula_id);
  $('#dDias').value = inCart ? inCart.dias : 3;
  $('#dAdd').textContent = inCart ? 'Actualizar carrito' : 'Añadir al carrito';
  updateSubtotal();
  updateDetailFav();
  if (!dlg.open) dlg.showModal();
}
function updateSubtotal() {
  if (!state.detail) return;
  $('#dSubtotal').textContent = bs(clampDias($('#dDias').value) * state.detail.tarifa_dia);
}
function updateDetailFav() {
  if (!state.detail) return;
  const on = isFav(state.detail.pelicula_id);
  $('#dFav').setAttribute('aria-pressed', String(on));
  $('#dFav').textContent = on ? '♥ En favoritos' : '♡ Favorito';
}
function openTrailer(p) {
  if (!p?.trailer_url) return toast('Esta película aún no tiene tráiler.');
  $('#tTitle').textContent = p.titulo;
  $('#tSub').textContent = `Dirigida por ${p.director} · ${p.anio}`;
  $('#tStage').innerHTML = `<iframe src="${esc(embed(p.trailer_url, true))}" title="Tráiler de ${esc(p.titulo)}"
    allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  $('#trailerDlg').showModal();
}

function addToCart(id, dias = 3) {
  const p = findPeli(id);
  if (!p) return;
  dias = clampDias(dias);
  const item = state.cart.find(i => i.id === p.pelicula_id);
  if (item) item.dias = dias; else state.cart.push({ id: p.pelicula_id, dias });
  renderCart();
  toast(`“${p.titulo}” en el carrito por ${plural(dias, 'día', 'días')}.`);
  $('#cartCount').classList.remove('bump'); void $('#cartCount').offsetWidth; $('#cartCount').classList.add('bump');
}

function renderCart() {
  state.cart = state.cart.filter(i => !state.todas.length || findPeli(i.id));
  const rows = state.cart.map(i => ({ i, p: findPeli(i.id) })).filter(r => r.p);
  const total = rows.reduce((s, { i, p }) => s + p.tarifa_dia * i.dias, 0);
  $('#cartCount').textContent = rows.length;
  $('#cartList').innerHTML = rows.length ? rows.map(({ i, p }) => `
    <li class="cart-item" data-id="${p.pelicula_id}">
      <span class="cart-item__disc">${discHTML(p)}</span>
      <div><strong>${esc(p.titulo)}</strong><small>${bs(p.tarifa_dia)} por día</small></div>
      <label class="field">Días <input type="number" min="1" max="14" value="${i.dias}" data-action="dias" inputmode="numeric"></label>
      <span class="cart-item__sub">${bs(p.tarifa_dia * i.dias)}</span>
      <button class="icon-btn" type="button" data-action="remove" aria-label="Quitar ${esc(p.titulo)}">✕</button>
    </li>`).join('') : '<li class="empty">Tu carrito está vacío. Elige un disco de la tira o del catálogo.</li>';
  $('#cartTotal').textContent = bs(total);
  $('#cartPay').disabled = !rows.length || !state.socioId;
  $('#cartClear').disabled = !rows.length;
  const socio = state.socios.find(s => s.socio_id === state.socioId);
  $('#cartSocio').textContent = socio ? `Se registrará a nombre de ${socio.nombre} (${socio.email}).` : 'Inicia sesión para confirmar el alquiler.';
  if (state.user) store.set(`cart:${state.user.socio_id}`, state.cart);
}

async function confirmarAlquiler() {
  if (!state.socioId) return toast('Inicia sesión para continuar.');
  $('#cartPay').disabled = true;
  try {
    const items = state.cart.map(i => ({ pelicula_id: i.id, dias: i.dias }));
    const r = await api.alquilar(state.socioId, items);
    state.cart = [];
    renderCart();
    $('#cartDlg').close();
    await loadSocio();
    toast(`Alquiler confirmado: ${plural(r.cantidad, 'disco', 'discos')}, total ${bs(r.total)}.`);
    $('#socio').scrollIntoView();
  } finally {
    renderCart();
  }
}

async function verCuentaDe(id) {
  state.socioId = id;
  store.set('socio-admin', state.socioId);
  renderSocios();
  renderCart();
  await loadSocio();
}

async function loadSocio() {
  if (!state.socioId) return;
  admin?.refrescar();
  const [alquileres, favoritos] = await Promise.all([api.alquileres(state.socioId), api.favoritos(state.socioId)]);
  state.alquileres = alquileres;
  state.favs = new Set(favoritos.map(Number));
  renderSocio();
  renderCatalogo();
  updateHeroFav();
  updateDetailFav();
  const d = driveId && findPeli(driveId);
  if (d) showInDrive(d);
}

function renderSocio() {
  const a = state.alquileres;
  const activos = a.filter(x => !x.fecha_devolucion).length;
  const vencidos = a.filter(x => x.estado === 'Vencido').length;
  const multas = a.reduce((s, x) => s + Number(x.multa), 0);
  const gastado = a.reduce((s, x) => s + Number(x.total), 0);
  $('#stats').innerHTML = `
    <div class="stat"><strong>${a.length}</strong><span>Alquileres en total</span></div>
    <div class="stat"><strong>${activos}</strong><span>Discos en préstamo</span></div>
    <div class="stat ${vencidos ? 'stat--alert' : ''}"><strong>${vencidos}</strong><span>Préstamos vencidos</span></div>
    <div class="stat ${multas ? 'stat--alert' : ''}"><strong>${bs(multas)}</strong><span>Multas simuladas</span></div>
    <div class="stat"><strong>${bs(gastado)}</strong><span>Total en alquileres</span></div>`;

  $('#rentalsBody').innerHTML = a.length ? a.map(x => `
    <tr>
      <td><strong>${esc(x.titulo)}</strong><small class="muted"> · ${plural(x.dias, 'día', 'días')}</small></td>
      <td>${fecha(x.fecha_alquiler)}</td>
      <td>${fecha(x.fecha_limite)}</td>
      <td><span class="badge ${x.estado === 'Vencido' ? 'badge--late' : x.estado === 'Devuelto' ? 'badge--ok' : ''}">${esc(x.estado)}</span></td>
      <td>${bs(x.total)}</td>
      <td>${Number(x.multa) ? `<strong class="text-alert">${bs(x.multa)}</strong>` : '—'}</td>
      <td>${x.fecha_devolucion ? '' : `<button class="btn btn--sm" type="button" data-return="${x.alquiler_id}">Devolver</button>`}</td>
    </tr>`).join('')
    : '<tr><td colspan="7" class="empty">Aún no hay alquileres. Añade un disco al carrito para empezar.</td></tr>';

  const favs = state.todas.filter(p => isFav(p.pelicula_id));
  $('#wishlist').innerHTML = favs.length ? favs.map(p => `
    <li data-id="${p.pelicula_id}">
      <span class="wishlist__disc">${discHTML(p)}</span>
      <div class="wishlist__info"><strong>${esc(p.titulo)}</strong><span class="muted">${esc(p.anio)} · ${bs(p.tarifa_dia)}/día</span></div>
      <span class="wishlist__actions">
        <button class="btn btn--ghost btn--sm" type="button" data-action="open">Ver</button>
        <button class="btn btn--sm" type="button" data-action="add">Alquilar</button>
        <button class="icon-btn" type="button" data-action="fav" aria-label="Quitar ${esc(p.titulo)} de favoritos">✕</button>
      </span>
    </li>`).join('') : '<li class="empty">Marca un disco con ♡ y aparecerá aquí.</li>';
}

async function toggleFav(id) {
  if (!state.socioId) return toast('Inicia sesión para continuar.');
  const p = findPeli(id);
  const on = isFav(id);
  await (on ? api.quitarFavorito : api.agregarFavorito)(state.socioId, Number(id));
  await loadSocio();
  toast(on ? `“${p?.titulo}” salió de tus favoritos.` : `“${p?.titulo}” está en tus favoritos.`);
}

function renderSocios() {
  const admin = state.user?.rol === 'admin';
  $('#socioPick').hidden = !admin;
  $('#newSocio').hidden = !admin;
  if (admin) {
    $('#socioSel').innerHTML = state.socios.map(s =>
      `<option value="${s.socio_id}">${esc(s.nombre)}${s.rol === 'admin' ? ' (admin)' : ''}</option>`).join('');
    $('#socioSel').value = state.socioId ?? '';
  }
  const s = state.socios.find(x => x.socio_id === state.socioId);
  $('#socioInfo').innerHTML = s
    ? `<strong>${esc(s.nombre)}</strong><span class="muted">${esc(s.email)}${admin && s.socio_id !== state.user.socio_id ? ' · viendo como administrador' : ''}</span>`
    : '';
}

function renderUser() {
  const u = state.user;
  const iniciales = u.nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  $('#userAvatar').textContent = iniciales || '·';
  $('#userName').textContent = u.nombre.split(' ')[0];
  $('#userMenuName').textContent = u.nombre;
  $('#userMenuEmail').textContent = u.email;
  $('#userMenuRol').textContent = u.rol === 'admin' ? 'Administrador' : 'Socio';
}
function toggleUserMenu(open) {
  const menu = $('#userMenu');
  const show = typeof open === 'boolean' ? open : menu.hidden;
  menu.hidden = !show;
  $('#userBtn').setAttribute('aria-expanded', String(show));
}
async function logout() {
  try { await api.logout(); } catch { }
  location.replace('login.html');
}

function setPortada(id, url) {
  const upd = p => { if (p && p.pelicula_id === id) p.portada = url; };
  state.todas.forEach(upd);
  state.lista.forEach(upd);
  upd(state.detail);
  if (state.detail?.pelicula_id === id) $('#dDiscFront').innerHTML = discHTML(state.detail, { lazy: false });
  strip.setFilms(state.lista, Math.max(0, strip.activeIndex));
  renderCatalogo();
  renderCart();
  renderSocio();
}
async function subirPortada(file) {
  if (!file || !state.detail) return;
  const id = state.detail.pelicula_id;
  $('#coverAdmin').classList.add('is-busy');
  try {
    const r = await api.subirPortada(id, file);
    setPortada(id, r.portada);
    toast('Portada actualizada.');
  } finally {
    $('#coverAdmin').classList.remove('is-busy');
    $('#coverFile').value = '';
  }
}
async function quitarPortada() {
  if (!state.detail) return;
  const id = state.detail.pelicula_id;
  const r = await api.quitarPortada(id);
  setPortada(id, r.portada);
  toast(r.portada ? 'Portada restablecida: se buscará de nuevo el póster.' : 'Portada quitada: el disco usa sus colores.');
}

function bindEvents() {
  $('#themeBtn').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
  $('#cartBtn').addEventListener('click', () => { renderCart(); $('#cartDlg').showModal(); });
  $('#searchBtn').addEventListener('click', () => {
    $('#catalogo').scrollIntoView();
    $('#q').focus({ preventScroll: true });
  });

  $('#prevBtn').addEventListener('click', () => strip.prev());
  $('#nextBtn').addEventListener('click', () => strip.next());
  $('#hFlip').addEventListener('click', () => strip.toggleFlipActive());
  $('#hDetail').addEventListener('click', guard(() => state.active && openDetail(state.active.pelicula_id)));
  $('#hTrailer').addEventListener('click', () => openTrailer(state.active));
  $('#hRent').addEventListener('click', () => state.active && addToCart(state.active.pelicula_id));
  $('#hFav').addEventListener('click', guard(() => state.active && toggleFav(state.active.pelicula_id)));

  $('#indexBtn').addEventListener('click', e => { e.stopPropagation(); toggleIndex(); });
  $('#indexList').addEventListener('click', e => {
    const b = e.target.closest('.index-item');
    if (!b) return;
    strip.goToIndex(Number(b.dataset.idx));
    toggleIndex(false);
    $('#discos').scrollIntoView();
    $('#discos').focus({ preventScroll: true });
  });
  document.addEventListener('click', e => { if (!e.target.closest('.index-wrap')) toggleIndex(false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#indexMenu').hidden) { toggleIndex(false); $('#indexBtn').focus(); }
  });

  $('#filters').addEventListener('submit', e => e.preventDefault());
  $('#q').addEventListener('input', debounce(applyFilters, 220));
  ['#fCategoria', '#fClasif'].forEach(s => $(s).addEventListener('change', applyFilters));
  $('#filters').addEventListener('reset', () => setTimeout(applyFilters));

  const grid = $('#discGrid');
  grid.addEventListener('click', guard(async e => {
    const b = e.target.closest('[data-action]');
    if (!b) return;
    const id = Number(b.closest('.disc-item').dataset.id);
    if (b.dataset.action === 'open') {
      strip.goToIndex(state.lista.findIndex(p => p.pelicula_id === id));
      await openDetail(id);
    }
    if (b.dataset.action === 'add') addToCart(id);
    if (b.dataset.action === 'fav') await toggleFav(id);
  }));
  const hint = e => {
    const li = e.target.closest('.disc-item');
    if (li && Number(li.dataset.id) !== driveId) showInDrive(findPeli(li.dataset.id));
  };
  grid.addEventListener('mouseover', hint);
  grid.addEventListener('focusin', hint);

  $('#dDisc').addEventListener('click', () => $('#dDisc').classList.toggle('is-flipped'));
  $('#dDias').addEventListener('input', updateSubtotal);
  $('#dDias').addEventListener('change', () => { $('#dDias').value = clampDias($('#dDias').value); updateSubtotal(); });
  $('#dAdd').addEventListener('click', () => {
    addToCart(state.detail.pelicula_id, $('#dDias').value);
    $('#detailDlg').close();
  });
  $('#dFav').addEventListener('click', guard(() => toggleFav(state.detail.pelicula_id)));
  $('#detailDlg').addEventListener('close', () => { $('#dTrailer').innerHTML = ''; });
  $('#trailerDlg').addEventListener('close', () => { $('#tStage').innerHTML = ''; });

  const cartList = $('#cartList');
  cartList.addEventListener('change', e => {
    if (e.target.dataset.action !== 'dias') return;
    const item = state.cart.find(i => i.id === Number(e.target.closest('.cart-item').dataset.id));
    if (item) item.dias = clampDias(e.target.value);
    renderCart();
  });
  cartList.addEventListener('click', e => {
    const b = e.target.closest('[data-action="remove"]');
    if (!b) return;
    const id = Number(b.closest('.cart-item').dataset.id);
    state.cart = state.cart.filter(i => i.id !== id);
    renderCart();
  });
  $('#cartClear').addEventListener('click', () => { state.cart = []; renderCart(); });
  $('#cartPay').addEventListener('click', guard(confirmarAlquiler));

  $('#socioSel').addEventListener('change', guard(e => verCuentaDe(Number(e.target.value))));
  $('#userBtn').addEventListener('click', e => { e.stopPropagation(); toggleUserMenu(); });
  $('#userMenuCuenta').addEventListener('click', () => toggleUserMenu(false));
  $('#logoutBtn').addEventListener('click', logout);
  document.addEventListener('click', e => { if (!e.target.closest('.user-wrap')) toggleUserMenu(false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#userMenu').hidden) { toggleUserMenu(false); $('#userBtn').focus(); }
  });
  $('#coverFile').addEventListener('change', guard(e => subirPortada(e.target.files[0])));
  $('#coverReset').addEventListener('click', guard(quitarPortada));
  $('#rentalsBody').addEventListener('click', guard(async e => {
    const b = e.target.closest('[data-return]');
    if (!b) return;
    b.disabled = true;
    const r = await api.devolver(state.socioId, Number(b.dataset.return));
    await loadSocio();
    toast(Number(r.multa) ? `Devolución registrada con multa de ${bs(r.multa)}.` : 'Devolución registrada a tiempo.');
  }));
  $('#wishlist').addEventListener('click', guard(async e => {
    const b = e.target.closest('[data-action]');
    if (!b) return;
    const id = Number(b.closest('li').dataset.id);
    if (b.dataset.action === 'open') await openDetail(id);
    if (b.dataset.action === 'add') addToCart(id);
    if (b.dataset.action === 'fav') await toggleFav(id);
  }));
  $('#socioForm').addEventListener('submit', guard(async e => {
    e.preventDefault();
    const f = e.target;
    const fd = new FormData(f);
    const nuevo = await api.crearSocio({ nombre: fd.get('nombre').trim(), email: fd.get('email').trim(), password: fd.get('password') });
    state.socios = await api.socios();
    state.socioId = nuevo.socio_id;
    store.set('socio-admin', state.socioId);
    renderSocios();
    f.reset();
    $('#newSocio').open = false;
    renderCart();
    await loadSocio();
    toast(`Socio registrado: ${nuevo.nombre}. Ya puede iniciar sesión con su correo.`);
  }));

  $$('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));

  const links = $$('.nav-link[data-nav]');
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) links.forEach(l => l.classList.toggle('is-active', l.dataset.nav === en.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  ['discos', 'catalogo', 'socio'].forEach(id => io.observe(document.getElementById(id)));

  onModeChange(m => { $('#demoBanner').hidden = m !== 'demo'; });
  $('#demoReset').addEventListener('click', () => { resetDemo(); location.reload(); });
}

function initAdmin() {
  admin = createAdminPanel({
    toast,
    getPeliculas: () => state.todas,
    getSocios: () => state.socios,
    onCambio: loadSocio,
    onVerCuenta: guard(async id => {
      await verCuentaDe(id);
      $('#socio').scrollIntoView();
    })
  });
  const abrir = () => { toggleUserMenu(false); admin.abrir(); };
  $('#adminNav').hidden = false;
  $('#userMenuAdmin').hidden = false;
  $('#adminNav').addEventListener('click', abrir);
  $('#userMenuAdmin').addEventListener('click', abrir);
}

async function init() {
  installArtFallback();
  onSessionExpired(() => location.replace('login.html?expirada=1'));
  try {
    state.user = await api.sesion();
  } catch {
    location.replace('login.html');
    return;
  }
  document.body.classList.add('is-ready');
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  renderUser();
  strip = new DiscStripGallery({
    stageEl: $('#discStage'),
    trackEl: $('#discTrack'),
    keyTarget: $('#discos'),
    onActiveChange: renderHero,
    onDiscOpen: guard(p => openDetail(p.pelicula_id))
  });
  bindEvents();
  try {
    const esAdmin = state.user.rol === 'admin';
    const [todas, categorias, socios] = await Promise.all([api.peliculas(), api.categorias(), esAdmin ? api.socios() : [state.user]]);
    state.todas = todas;
    state.socios = socios;
    const guardado = store.get(`cart:${state.user.socio_id}`, []);
    state.cart = (Array.isArray(guardado) ? guardado : [])
      .filter(i => Number.isInteger(i?.id))
      .map(i => ({ id: i.id, dias: clampDias(i.dias) }));
    $('#fCategoria').insertAdjacentHTML('beforeend', categorias.map(c => `<option>${esc(c)}</option>`).join(''));
    const elegido = esAdmin ? Number(store.get('socio-admin', 0)) : 0;
    state.socioId = socios.some(s => s.socio_id === elegido) ? elegido : state.user.socio_id;
    renderSocios();
    renderCart();
    await applyFilters();
    if (esAdmin) {
      initAdmin();
      admin.precargar();
    }
    await loadSocio();
  } catch (e) {
    $('#hTitle').textContent = 'Sin conexión';
    $('#discGrid').innerHTML = `<li class="empty">No se pudo cargar el catálogo. Inicia el servidor con <code>npm start</code> y entra a http://localhost:3000. (${esc(e.message)})</li>`;
  }
}
init();
