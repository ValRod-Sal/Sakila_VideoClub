import { api } from './api.js';

/* ============ Utilidades ============ */
const $ = (s, r = document) => r.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const bs = n => 'Bs ' + Number(n).toFixed(2);
const fecha = s => s ? new Date(s).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' }) : '—';
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } }
};

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

/* ============ Estado ============ */
const state = {
  todas: [],        // catálogo completo (para carrito, favoritos y ficha)
  lista: [],        // resultado del filtro actual
  socios: [],
  alquileres: [],
  favs: new Set(),
  socioId: store.get('sc_socio', null),
  cart: store.get('sc_cart', []),   // [{ id, dias }]  (RF-03: persistencia en localStorage)
  detailId: null
};
const findPeli = id => state.todas.find(p => Number(p.pelicula_id) === Number(id));

/* ============ Tema claro / oscuro ============ */
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  store.set('sc_theme', t);
  $('#themeBtn').textContent = t === 'dark' ? 'Claro' : 'Oscuro';
}

/* ============ Catálogo (RF-01) ============ */
let reqSeq = 0;
async function loadLista() {   // consulta el servidor con los filtros actuales
  const seq = ++reqSeq;
  const filtros = { q: $('#q').value.trim(), categoria: $('#fCat').value, clasificacion: $('#fCla').value };
  try {
    const lista = await api.peliculas(filtros);
    if (seq !== reqSeq) return;     // llegó una respuesta más nueva
    state.lista = lista;
    renderCatalogo();
  } catch (e) {
    if (seq === reqSeq) toast(e.message);
  }
}

function renderCatalogo() {
  const lista = state.lista;
  $('#resultCount').textContent = `${lista.length} ${lista.length === 1 ? 'disco' : 'discos'}`;
  $('#discGrid').innerHTML = lista.length ? lista.map(p => `
    <li class="disc-item" data-id="${p.pelicula_id}" style="--c1:${esc(p.color1)};--c2:${esc(p.color2)}">
      <button class="disc" type="button" data-action="open" aria-label="Ver ficha de ${esc(p.titulo)}">
        <span class="disc__surface"><span class="disc__label"></span></span>
        <span class="disc__title">${esc(p.titulo)}</span>
        <span class="disc__brand">SAKILA</span>
      </button>
      <div class="disc-meta">
        <p>${esc(p.categoria)} · ${p.anio} · <span class="badge badge--${esc(p.clasificacion)}">${esc(p.clasificacion)}</span></p>
        <div class="disc-actions">
          <button class="btn btn--ghost btn--sm" type="button" data-action="fav" aria-pressed="${state.favs.has(Number(p.pelicula_id))}">Favorito</button>
          <button class="btn btn--sm" type="button" data-action="add">Alquilar · ${bs(p.tarifa_dia)}/día</button>
        </div>
      </div>
    </li>`).join('')
    : '<li class="empty">No hay discos con esos filtros. Prueba con otra categoría o borra la búsqueda.</li>';
}

/* ============ Ficha de película (RF-02) ============ */
async function openDetail(id) {
  let p;
  try { p = await api.pelicula(id); } catch (e) { return toast(e.message); }
  state.detailId = Number(id);
  const dlg = $('#detailDlg');
  dlg.style.setProperty('--c1', p.color1);
  dlg.style.setProperty('--c2', p.color2);
  $('#dTitle').textContent = p.titulo;
  $('#dDiscTitle').textContent = p.titulo;
  $('#dMeta').textContent = `${p.categoria} · ${p.clasificacion}`;
  $('#dSyn').textContent = p.sinopsis;
  $('#dYear').textContent = p.anio;
  $('#dDur').textContent = `${p.duracion} min`;
  $('#dCla').textContent = p.clasificacion;
  $('#dTar').textContent = `${bs(p.tarifa_dia)} por día`;
  $('#dCast').textContent = p.reparto || 'Sin reparto registrado';
  $('#dTrailer').innerHTML = p.trailer_url
    ? `<iframe src="${esc(p.trailer_url)}" title="Tráiler de ${esc(p.titulo)}" loading="lazy" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe>`
    : '<p class="muted">Esta película aún no tiene tráiler.</p>';
  const inCart = state.cart.find(i => Number(i.id) === Number(id));
  $('#dDias').value = inCart ? inCart.dias : 3;
  updateDetailFav();
  dlg.showModal();
}
function updateDetailFav() {
  const on = state.favs.has(state.detailId);
  const b = $('#dFav');
  b.setAttribute('aria-pressed', on);
  b.textContent = on ? 'En favoritos' : 'Favorito';
}

/* ============ Carrito (RF-03) ============ */
function addToCart(id, dias = 3) {
  dias = Math.max(1, Math.min(14, Number(dias) || 1));
  const item = state.cart.find(i => Number(i.id) === Number(id));
  if (item) item.dias = dias; else state.cart.push({ id: Number(id), dias });
  renderCart();
  toast(`“${findPeli(id).titulo}” añadido al carrito por ${dias} ${dias === 1 ? 'día' : 'días'}.`);
}

function renderCart() {
  const rows = state.cart.map(i => ({ i, p: findPeli(i.id) })).filter(r => r.p);
  const total = rows.reduce((s, { i, p }) => s + Number(p.tarifa_dia) * i.dias, 0);
  $('#cartCount').textContent = rows.length;
  $('#cartList').innerHTML = rows.length ? rows.map(({ i, p }) => `
    <li class="cart-item" data-id="${p.pelicula_id}">
      <div><strong>${esc(p.titulo)}</strong><small>${bs(p.tarifa_dia)} por día</small></div>
      <label class="field">Días <input type="number" min="1" max="14" value="${i.dias}" data-action="dias"></label>
      <span>${bs(Number(p.tarifa_dia) * i.dias)}</span>
      <button class="icon-btn" type="button" data-action="remove" aria-label="Quitar ${esc(p.titulo)}">✕</button>
    </li>`).join('') : '<li class="empty">Tu carrito está vacío. Elige un disco del catálogo.</li>';
  $('#cartTotal').textContent = bs(total);
  $('#cartPay').disabled = !rows.length;
  $('#cartClear').disabled = !rows.length;
  const socio = $('#socioSel').selectedOptions[0];
  $('#cartSocio').textContent = socio ? `Se registrará a nombre de ${socio.textContent}.` : '';
  store.set('sc_cart', state.cart);
}

async function confirmarAlquiler() {
  if (!state.socioId) return toast('Elige un socio en “Mi cuenta”.');
  try {
    const items = state.cart.map(i => ({ pelicula_id: i.id, dias: i.dias }));
    const r = await api.alquilar(state.socioId, items);
    state.cart = [];
    renderCart();
    $('#cartDlg').close();
    await loadSocio();
    toast(`Alquiler confirmado. Total: ${bs(r.total)}.`);
    $('#socio').scrollIntoView();
  } catch (e) { toast(e.message); }
}

/* ============ Cuenta del socio (RF-04) ============ */
async function loadSocio() {
  if (!state.socioId) return;
  const [alquileres, favoritos] = await Promise.all([api.alquileres(state.socioId), api.favoritos(state.socioId)]);
  state.alquileres = alquileres;
  state.favs = new Set(favoritos.map(Number));
  renderSocio();
  renderCatalogo();
  if ($('#detailDlg').open) updateDetailFav();
}

function renderSocio() {
  const a = state.alquileres;
  const pend = a.filter(x => !x.fecha_devolucion).length;
  const multas = a.reduce((s, x) => s + Number(x.multa), 0);
  $('#stats').innerHTML = `
    <div class="stat"><strong>${a.length}</strong><span>Alquileres en total</span></div>
    <div class="stat"><strong>${pend}</strong><span>Pendientes de devolución</span></div>
    <div class="stat"><strong>${bs(multas)}</strong><span>Multas simuladas</span></div>
    <div class="stat"><strong>${state.favs.size}</strong><span>Favoritos</span></div>`;

  $('#rentalsBody').innerHTML = a.length ? a.map(x => `
    <tr>
      <td>${esc(x.titulo)}</td>
      <td>${fecha(x.fecha_alquiler)}</td>
      <td>${fecha(x.fecha_limite)}</td>
      <td><span class="badge ${x.estado === 'Vencido' ? 'badge--late' : ''}">${esc(x.estado)}</span></td>
      <td>${Number(x.multa) ? bs(x.multa) : '—'}</td>
      <td>${bs(x.total)}</td>
      <td>${x.fecha_devolucion ? '' : `<button class="btn btn--sm" type="button" data-return="${x.alquiler_id}">Devolver</button>`}</td>
    </tr>`).join('')
    : '<tr><td colspan="7" class="empty">Aún no tienes alquileres. Añade un disco al carrito para empezar.</td></tr>';

  const favs = state.todas.filter(p => state.favs.has(Number(p.pelicula_id)));
  $('#wishlist').innerHTML = favs.length ? favs.map(p => `
    <li data-id="${p.pelicula_id}">
      <span>${esc(p.titulo)}</span>
      <span><button class="btn btn--ghost btn--sm" type="button" data-action="open">Ver</button>
      <button class="btn btn--ghost btn--sm" type="button" data-action="fav">Quitar</button></span>
    </li>`).join('') : '<li class="empty">Marca un disco como favorito y aparecerá aquí.</li>';
}

async function toggleFav(id) {
  if (!state.socioId) return toast('Elige un socio en “Mi cuenta”.');
  try {
    const on = state.favs.has(Number(id));
    await (on ? api.quitarFavorito : api.agregarFavorito)(state.socioId, Number(id));
    await loadSocio();
  } catch (e) { toast(e.message); }
}

/* ============ Eventos ============ */
function bindEvents() {
  $('#themeBtn').addEventListener('click', () =>
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
  $('#cartBtn').addEventListener('click', () => { renderCart(); $('#cartDlg').showModal(); });

  const buscar = debounce(loadLista, 200);
  $('#q').addEventListener('input', buscar);
  ['fCat', 'fCla'].forEach(id => $('#' + id).addEventListener('change', loadLista));

  const grid = $('#discGrid');
  grid.addEventListener('click', e => {
    const b = e.target.closest('[data-action]');
    if (!b) return;
    const id = b.closest('.disc-item').dataset.id;
    if (b.dataset.action === 'open') openDetail(id);
    if (b.dataset.action === 'add') addToCart(id, 3);
    if (b.dataset.action === 'fav') toggleFav(id);
  });
  const hint = e => {
    const li = e.target.closest('.disc-item');
    const p = li && findPeli(li.dataset.id);
    $('#driveMsg').textContent = p
      ? `${p.titulo} · ${p.clasificacion} · ${p.duracion} min`
      : 'Inserta un disco para comenzar.';
  };
  grid.addEventListener('mouseover', hint);
  grid.addEventListener('focusin', hint);

  $('#wishlist').addEventListener('click', e => {
    const b = e.target.closest('[data-action]');
    if (!b) return;
    const id = b.closest('li').dataset.id;
    if (b.dataset.action === 'open') openDetail(id);
    if (b.dataset.action === 'fav') toggleFav(id);
  });

  $('#rentalsBody').addEventListener('click', async e => {
    const b = e.target.closest('[data-return]');
    if (!b) return;
    try {
      await api.devolver(state.socioId, Number(b.dataset.return));
      await loadSocio();
      toast('Devolución registrada.');
    } catch (err) { toast(err.message); }
  });

  $('#socioSel').addEventListener('change', async e => {
    state.socioId = Number(e.target.value);
    store.set('sc_socio', state.socioId);
    renderCart();
    await loadSocio();
  });

  $('#dAdd').addEventListener('click', () => {
    addToCart(state.detailId, $('#dDias').value);
    $('#detailDlg').close();
  });
  $('#dFav').addEventListener('click', () => toggleFav(state.detailId));
  $('#detailDlg').addEventListener('close', () => { $('#dTrailer').innerHTML = ''; }); // detiene el tráiler

  const cartList = $('#cartList');
  cartList.addEventListener('change', e => {
    if (e.target.dataset.action !== 'dias') return;
    const id = e.target.closest('.cart-item').dataset.id;
    const item = state.cart.find(i => Number(i.id) === Number(id));
    item.dias = Math.max(1, Math.min(14, Number(e.target.value) || 1));
    renderCart();
  });
  cartList.addEventListener('click', e => {
    const b = e.target.closest('[data-action="remove"]');
    if (!b) return;
    const id = Number(b.closest('.cart-item').dataset.id);
    state.cart = state.cart.filter(i => Number(i.id) !== id);
    renderCart();
  });
  $('#cartClear').addEventListener('click', () => { state.cart = []; renderCart(); });
  $('#cartPay').addEventListener('click', confirmarAlquiler);

  $('#socioForm').addEventListener('submit', async e => {
    e.preventDefault();             // el navegador ya validó required, minlength, pattern y type=email
    const f = e.target;
    const fd = new FormData(f);
    try {
      const nuevo = await api.crearSocio({ nombre: fd.get('nombre').trim(), email: fd.get('email').trim() });
      state.socios.push(nuevo);
      state.socioId = nuevo.socio_id;
      store.set('sc_socio', state.socioId);
      renderSocios();
      f.reset();
      f.closest('details').open = false;
      renderCart();
      await loadSocio();
      toast(`Socio registrado: ${nuevo.nombre}.`);
    } catch (err) { toast(err.message); }
  });

  // Cerrar diálogos al hacer clic en el fondo
  document.querySelectorAll('dialog').forEach(d =>
    d.addEventListener('click', e => { if (e.target === d) d.close(); }));
}

/* ============ Inicio ============ */
function renderSocios() {
  $('#socioSel').innerHTML = state.socios.map(s => `<option value="${s.socio_id}">${esc(s.nombre)}</option>`).join('');
  $('#socioSel').value = state.socioId;
}

async function init() {
  setTheme(store.get('sc_theme', 'dark'));
  bindEvents();
  try {
    const [todas, categorias, socios] = await Promise.all([api.peliculas(), api.categorias(), api.socios()]);
    state.todas = todas;
    state.lista = todas;
    state.socios = socios;
    $('#fCat').insertAdjacentHTML('beforeend', categorias.map(c => `<option>${esc(c)}</option>`).join(''));
    if (!socios.some(s => Number(s.socio_id) === Number(state.socioId))) state.socioId = socios[0] ? Number(socios[0].socio_id) : null;
    store.set('sc_socio', state.socioId);
    renderSocios();
    renderCatalogo();
    renderCart();
    await loadSocio();
  } catch (e) {
    $('#discGrid').innerHTML = `<li class="empty">No se pudo cargar el catálogo. Inicia el servidor con <code>npm start</code> y entra por http://localhost:3000. (${esc(e.message)})</li>`;
  }
}
init();
