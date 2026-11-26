import { createApp, computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { api, getMode, onModeChange, resetDemo } from '../api.js';
import { bs, colorVars } from '../disc.js';
import { registrarComponentes } from './componentes/index.js';
import { useMostrador, TABS } from './composables/useMostrador.js';

// App raíz de Vue 3. La plantilla es el propio index.html (dentro de #app): el HTML semántico
// se mantiene y Vue lo completa con directivas (v-for, v-if, v-model, @click) y {{ }}.

const fecha = s => s ? new Date(s).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fechaHora = s => s ? new Date(s).toLocaleString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const clampDias = v => Math.max(1, Math.min(14, Math.trunc(Number(v)) || 1));
const pad = n => String(n).padStart(2, '0');
const lineas = s => String(s || '').split(',').map(x => x.trim()).filter(Boolean);
const store = {
  get(k, d) { try { const v = localStorage.getItem('clubsakila:' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('clubsakila:' + k, JSON.stringify(v)); } catch { } }
};
const embed = (url, autoplay) => {
  try {
    const u = new URL(url);
    if (!/(^|\.)youtube(-nocookie)?\.com$/.test(u.hostname)) return '';
    u.searchParams.set('rel', '0');
    if (autoplay) u.searchParams.set('autoplay', '1');
    return u.href;
  } catch { return ''; }
};

export function crearApp(usuario) {
  const app = createApp({
    setup() {
      // ---------- Estado general ----------
      const user = ref(usuario);
      const esAdmin = computed(() => user.value.rol === 'admin');
      const modo = ref(getMode());
      onModeChange(m => { modo.value = m; });
      const tema = ref(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
      const toastMsg = ref('');
      const toastVisible = ref(false);
      let toastTimer;
      function toast(msg) {
        toastMsg.value = msg;
        toastVisible.value = true;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { toastVisible.value = false; }, 3200);
      }
      const guard = fn => async (...a) => { try { return await fn(...a); } catch (e) { toast(e.message || 'Algo salió mal.'); } };

      const todas = ref([]);
      const lista = ref([]);
      const categorias = ref([]);
      const socios = ref([]);
      const alquileres = ref([]);
      const favs = ref([]);
      const cart = ref([]);
      const cargaError = ref('');
      const filtros = reactive({ q: '', categoria: '', clasificacion: '' });
      const hayFiltro = computed(() => Boolean(filtros.q.trim() || filtros.categoria || filtros.clasificacion));

      const findPeli = id => todas.value.find(p => p.pelicula_id === Number(id));
      const isFav = id => favs.value.includes(Number(id));

      // ---------- Tema y menús ----------
      watch(tema, t => {
        document.documentElement.dataset.theme = t;
        store.set('theme', t);
        document.querySelector('meta[name="theme-color"]').content = t === 'dark' ? '#0b0c0f' : '#f2f2f2';
      }, { immediate: true });
      const cambiarTema = () => { tema.value = tema.value === 'dark' ? 'light' : 'dark'; };
      const menuUsuario = ref(false);
      const menuIndice = ref(false);
      const iniciales = computed(() => user.value.nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '·');
      const primerNombre = computed(() => user.value.nombre.split(' ')[0]);
      async function logout() {
        try { await api.logout(); } catch { }
        location.replace('login.html');
      }
      const restablecerDemo = () => { resetDemo(); location.reload(); };

      // ---------- Tira 3D y disco activo ----------
      const tira = ref(null);
      const activo = ref(null);
      const activoIdx = ref(-1);
      const activoTotal = ref(0);
      function onActivo(p, i, total) {
        activo.value = p;
        activoIdx.value = p ? i : -1;
        activoTotal.value = total;
      }
      const contador = computed(() => activo.value ? `${pad(activoIdx.value + 1)} / ${pad(activoTotal.value)}` : '00 / 00');
      const heroReparto = computed(() => lineas(activo.value?.reparto));
      const irAlDisco = i => {
        tira.value?.goToIndex(i);
        menuIndice.value = false;
        const s = document.getElementById('discos');
        s.scrollIntoView();
        s.focus({ preventScroll: true });
      };

      // ---------- Catálogo y filtros (RF-01) ----------
      let seq = 0;
      let primeraCarga = true;
      async function aplicarFiltros() {
        const n = ++seq;
        try {
          const r = await api.peliculas({ q: filtros.q.trim(), categoria: filtros.categoria, clasificacion: filtros.clasificacion });
          if (n !== seq) return;
          lista.value = r;
          const keep = primeraCarga ? r.find(p => p.titulo === 'Uncut Gems')?.pelicula_id : activo.value?.pelicula_id;
          primeraCarga = false;
          await nextTick();
          tira.value?.setFilms(r, Math.max(0, r.findIndex(p => p.pelicula_id === keep)));
          if (!r.length) onActivo(null, 0, 0);
        } catch (e) {
          if (n === seq) toast(e.message);
        }
      }
      let filtroTimer;
      watch(() => filtros.q, () => { clearTimeout(filtroTimer); filtroTimer = setTimeout(aplicarFiltros, 220); });
      watch(() => [filtros.categoria, filtros.clasificacion], aplicarFiltros);
      const limpiarFiltros = () => { Object.assign(filtros, { q: '', categoria: '', clasificacion: '' }); };
      const buscar = () => {
        document.getElementById('catalogo').scrollIntoView();
        document.getElementById('q').focus({ preventScroll: true });
      };

      // Lector de discos: muestra el disco que está bajo el cursor.
      const enLector = ref(null);
      const lector = computed(() => {
        const p = enLector.value;
        if (!p) return null;
        const actores = lineas(p.reparto);
        const enCarrito = cart.value.find(i => i.id === p.pelicula_id);
        return {
          p,
          reparto: actores.length ? actores.slice(0, 3).join(', ') + (actores.length > 3 ? ` y ${actores.length - 3} más` : '') : 'Sin reparto registrado',
          tuLista: [isFav(p.pelicula_id) ? 'En tus favoritos' : '', enCarrito ? `En el carrito (${plural(enCarrito.dias, 'día', 'días')})` : '']
            .filter(Boolean).join(' · ')
        };
      });

      // ---------- Carrito (RF-03) ----------
      const cartBump = ref(false);
      const cartFilas = computed(() => cart.value.map(i => ({ i, p: findPeli(i.id) })).filter(r => r.p));
      const cartTotal = computed(() => cartFilas.value.reduce((s, { i, p }) => s + p.tarifa_dia * i.dias, 0));
      watch(cart, c => { if (user.value && !esAdmin.value) store.set(`cart:${user.value.socio_id}`, c); }, { deep: true });
      function addToCart(id, dias = 3) {
        const p = findPeli(id);
        if (!p) return;
        dias = clampDias(dias);
        const item = cart.value.find(i => i.id === p.pelicula_id);
        if (item) item.dias = dias; else cart.value.push({ id: p.pelicula_id, dias });
        toast(`“${p.titulo}” en el carrito por ${plural(dias, 'día', 'días')}.`);
        cartBump.value = false;
        requestAnimationFrame(() => { cartBump.value = true; });
      }
      const quitarDelCarrito = id => { cart.value = cart.value.filter(i => i.id !== id); };
      const vaciarCarrito = () => { cart.value = []; };
      const cambiarDias = (item, v) => { item.dias = clampDias(v); };
      const cartDlg = ref(null);
      const pagando = ref(false);
      const abrirCarrito = () => cartDlg.value.showModal();
      const confirmarAlquiler = guard(async () => {
        pagando.value = true;
        try {
          const r = await api.alquilar(user.value.socio_id, cart.value.map(i => ({ pelicula_id: i.id, dias: i.dias })));
          cart.value = [];
          cartDlg.value.close();
          await cargarCuenta();
          toast(`Alquiler confirmado: ${plural(r.cantidad, 'disco', 'discos')}, total ${bs(r.total)}.`);
          document.getElementById('socio').scrollIntoView();
        } finally {
          pagando.value = false;
        }
      });

      // ---------- Cuenta del socio (RF-04) ----------
      async function cargarCuenta() {
        const [a, f] = await Promise.all([api.alquileres(user.value.socio_id), api.favoritos(user.value.socio_id)]);
        alquileres.value = a;
        favs.value = f.map(Number);
      }
      const resumenCuenta = computed(() => {
        const a = alquileres.value;
        return {
          total: a.length,
          activos: a.filter(x => !x.fecha_devolucion).length,
          vencidos: a.filter(x => x.estado === 'Vencido').length,
          multas: a.reduce((s, x) => s + Number(x.multa), 0),
          gastado: a.reduce((s, x) => s + Number(x.total), 0)
        };
      });
      const favoritos = computed(() => todas.value.filter(p => isFav(p.pelicula_id)));
      const toggleFav = guard(async id => {
        const p = findPeli(id);
        const on = isFav(id);
        await (on ? api.quitarFavorito : api.agregarFavorito)(user.value.socio_id, Number(id));
        await cargarCuenta();
        toast(on ? `“${p?.titulo}” salió de tus favoritos.` : `“${p?.titulo}” está en tus favoritos.`);
      });
      const devolviendo = ref(null);
      const devolver = guard(async a => {
        devolviendo.value = a.alquiler_id;
        try {
          const r = await api.devolver(user.value.socio_id, a.alquiler_id);
          await cargarCuenta();
          toast(Number(r.multa) ? `Devolución registrada con multa de ${bs(r.multa)}.` : 'Devolución registrada a tiempo.');
        } finally {
          devolviendo.value = null;
        }
      });
      const claseEstado = e => (e === 'Vencido' ? 'badge--late' : e === 'Devuelto' ? 'badge--ok' : '');

      // ---------- Ficha de película (RF-02) y tráiler ----------
      const detalleDlg = ref(null);
      const trailerDlg = ref(null);
      const detalle = ref(null);
      const detalleAbierto = ref(false);
      const detalleDias = ref(3);
      const volteado = ref(false);
      const subiendo = ref(false);
      const enCarritoDetalle = computed(() => detalle.value && cart.value.find(i => i.id === detalle.value.pelicula_id));
      const subtotal = computed(() => detalle.value ? clampDias(detalleDias.value) * detalle.value.tarifa_dia : 0);
      const abrirDetalle = guard(async id => {
        const p = await api.pelicula(id);
        detalle.value = p;
        volteado.value = false;
        detalleDias.value = enCarritoDetalle.value ? enCarritoDetalle.value.dias : 3;
        detalleAbierto.value = true;
        if (!detalleDlg.value.open) detalleDlg.value.showModal();
      });
      const abrirDesdeCatalogo = id => {
        tira.value?.goToIndex(lista.value.findIndex(p => p.pelicula_id === id));
        abrirDetalle(id);
      };
      const agregarDesdeDetalle = () => {
        addToCart(detalle.value.pelicula_id, detalleDias.value);
        detalleDlg.value.close();
      };
      const trailer = ref(null);
      const abrirTrailer = p => {
        if (!p?.trailer_url) return toast('Esta película aún no tiene tráiler.');
        trailer.value = p;
        trailerDlg.value.showModal();
      };
      const cerrarAlFondo = e => { if (e.target === e.currentTarget) e.currentTarget.close(); };

      function setPortada(id, url) {
        for (const p of [...todas.value, ...lista.value, detalle.value]) if (p?.pelicula_id === id) p.portada = url;
        if (!esAdmin.value) tira.value?.setFilms(lista.value, Math.max(0, tira.value.activeIndex()));
      }
      const subirPortada = guard(async e => {
        const file = e.target.files[0];
        if (!file || !detalle.value) return;
        subiendo.value = true;
        try {
          const r = await api.subirPortada(detalle.value.pelicula_id, file);
          setPortada(detalle.value.pelicula_id, r.portada);
          toast('Portada actualizada.');
        } finally {
          subiendo.value = false;
          e.target.value = '';
        }
      });
      const quitarPortada = guard(async () => {
        const r = await api.quitarPortada(detalle.value.pelicula_id);
        setPortada(detalle.value.pelicula_id, r.portada);
        toast(r.portada ? 'Portada restablecida: se buscará de nuevo el póster.' : 'Portada quitada: el disco usa sus colores.');
      });

      // ---------- Mostrador del administrador ----------
      const mostrador = useMostrador({ peliculas: todas, socios, toast });
      const devolverAdmin = guard(a => mostrador.devolver(a));
      const actualizarMostrador = guard(async () => { await mostrador.cargar(); toast('Panel actualizado.'); });
      const irATab = id => {
        mostrador.filtro.tab = id;
        document.getElementById('admin').scrollIntoView({ behavior: 'smooth' });
      };
      const moverTab = (i, d) => {
        const sig = TABS[(i + d + TABS.length) % TABS.length].id;
        mostrador.filtro.tab = sig;
        nextTick(() => document.getElementById(`atab-${sig}`)?.focus());
      };
      const hoy = new Date().toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' });
      const nuevoSocioAbierto = ref(false);
      const registrarSocio = guard(async e => {
        const f = e.target;
        const fd = new FormData(f);
        const nuevo = await api.crearSocio({ nombre: fd.get('nombre').trim(), email: fd.get('email').trim(), password: fd.get('password') });
        socios.value = await api.socios();
        f.reset();
        nuevoSocioAbierto.value = false;
        toast(`Socio registrado: ${nuevo.nombre}. Ya puede iniciar sesión con su correo.`);
      });

      // ---------- Carga inicial ----------
      const navActiva = ref('discos');
      onMounted(async () => {
        document.addEventListener('click', e => {
          if (!e.target.closest('.user-wrap')) menuUsuario.value = false;
          if (!e.target.closest('.index-wrap')) menuIndice.value = false;
        });
        document.addEventListener('keydown', e => {
          if (e.key !== 'Escape') return;
          if (menuUsuario.value) { menuUsuario.value = false; document.getElementById('userBtn').focus(); }
          if (menuIndice.value) { menuIndice.value = false; document.getElementById('indexBtn')?.focus(); }
        });
        try {
          if (esAdmin.value) {
            const [t, s] = await Promise.all([api.peliculas(), api.socios()]);
            todas.value = t;
            socios.value = s;
            await mostrador.iniciar();
            return;
          }
          const [t, c] = await Promise.all([api.peliculas(), api.categorias()]);
          todas.value = t;
          categorias.value = c;
          socios.value = [user.value];
          const guardado = store.get(`cart:${user.value.socio_id}`, []);
          cart.value = (Array.isArray(guardado) ? guardado : [])
            .filter(i => Number.isInteger(i?.id) && t.some(p => p.pelicula_id === i.id))
            .map(i => ({ id: i.id, dias: clampDias(i.dias) }));
          await aplicarFiltros();
          await cargarCuenta();
          const io = new IntersectionObserver(entries => entries.forEach(en => {
            if (en.isIntersecting) navActiva.value = en.target.id;
          }), { rootMargin: '-45% 0px -50% 0px' });
          ['discos', 'catalogo', 'socio'].forEach(id => io.observe(document.getElementById(id)));
        } catch (e) {
          cargaError.value = e.message;
        }
      });

      return {
        // utilidades para la plantilla
        bs, colorVars, fecha, fechaHora, plural, embed, claseEstado, TABS, hoy,
        // estado
        user, esAdmin, modo, tema, toastMsg, toastVisible, menuUsuario, menuIndice, iniciales, primerNombre,
        todas, lista, categorias, filtros, hayFiltro, cargaError, navActiva,
        tira, activo, activoIdx, contador, heroReparto, enLector, lector,
        cart, cartFilas, cartTotal, cartBump, cartDlg, pagando,
        alquileres, resumenCuenta, favoritos, devolviendo,
        detalleDlg, trailerDlg, detalle, detalleAbierto, detalleDias, volteado, subiendo, enCarritoDetalle, subtotal, trailer,
        mostrador, nuevoSocioAbierto,
        // acciones
        cambiarTema, logout, restablecerDemo, onActivo, irAlDisco, limpiarFiltros, buscar,
        isFav, toggleFav, addToCart, quitarDelCarrito, vaciarCarrito, cambiarDias, abrirCarrito, confirmarAlquiler,
        devolver, abrirDetalle, abrirDesdeCatalogo, agregarDesdeDetalle, abrirTrailer, cerrarAlFondo,
        subirPortada, quitarPortada, devolverAdmin, actualizarMostrador, irATab, moverTab, registrarSocio
      };
    }
  });
  registrarComponentes(app);
  return app;
}
