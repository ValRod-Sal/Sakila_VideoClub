import { computed, onBeforeUnmount, reactive, ref } from 'vue';
import { api } from '../../api.js';
import { bs } from '../../disc.js';

// Mostrador del administrador como composable de Vue: estado reactivo + propiedades computadas.
// Lo usa la app raíz (js/vue/app.js) solo cuando inicia sesión un administrador.

const DIA = 86_400_000;
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
export const TABS = [
  { id: 'prestamos', nombre: 'Préstamos activos', nav: 'Préstamos' },
  { id: 'historial', nombre: 'Historial', nav: 'Historial' },
  { id: 'peliculas', nombre: 'Discos', nav: 'Discos' },
  { id: 'socios', nombre: 'Socios', nav: 'Socios' }
];

export function useMostrador({ peliculas, socios, toast }) {
  const alquileres = ref([]);
  const ahora = ref(Date.now());
  const cargadoEn = ref(null);
  const cargando = ref(false);
  const error = ref('');
  const filtro = reactive({ tab: 'prestamos', q: '', estado: '' });
  let reloj = null;

  const q = computed(() => norm(filtro.q.trim()));
  const coincide = a => !q.value || [a.titulo, a.socio, a.socio_email].some(v => norm(v).includes(q.value));
  const activos = computed(() => alquileres.value.filter(a => !a.fecha_devolucion));
  const peli = id => peliculas.value.find(p => p.pelicula_id === id) || null;

  const resumen = computed(() => {
    const act = activos.value, t = ahora.value;
    const inicioMes = new Date(t); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
    const prestadas = new Set(act.map(a => a.pelicula_id)).size;
    return {
      enPrestamo: act.length,
      vencidos: act.filter(a => Date.parse(a.fecha_limite) < t).length,
      pronto: act.filter(a => { const r = Date.parse(a.fecha_limite) - t; return r >= 0 && r < DIA; }).length,
      multas: act.reduce((s, a) => s + Number(a.multa), 0),
      ingresosMes: alquileres.value.filter(a => Date.parse(a.fecha_alquiler) >= inicioMes).reduce((s, a) => s + Number(a.total), 0),
      libres: peliculas.value.length - prestadas,
      totalPeliculas: peliculas.value.length
    };
  });

  const prestamos = computed(() => activos.value.filter(coincide)
    .sort((a, b) => Date.parse(a.fecha_limite) - Date.parse(b.fecha_limite))
    .map(a => ({ ...a, vencido: Date.parse(a.fecha_limite) < ahora.value, peli: peli(a.pelicula_id) })));

  const historial = computed(() => alquileres.value
    .filter(a => coincide(a) && (!filtro.estado || a.estado === filtro.estado))
    .map(a => ({ ...a, peli: peli(a.pelicula_id) })));

  const discos = computed(() => {
    const filas = peliculas.value.map(p => {
      const suyos = alquileres.value.filter(a => a.pelicula_id === p.pelicula_id);
      return {
        p, veces: suyos.length,
        ingresos: suyos.reduce((s, a) => s + Number(a.total) + Number(a.multa), 0),
        activos: suyos.filter(a => !a.fecha_devolucion)
      };
    }).filter(x => !q.value || norm(x.p.titulo).includes(q.value) || x.activos.some(a => norm(a.socio).includes(q.value) || norm(a.socio_email).includes(q.value)))
      .sort((a, b) => b.veces - a.veces || b.ingresos - a.ingresos || a.p.titulo.localeCompare(b.p.titulo, 'es'));
    const max = Math.max(1, ...filas.map(x => x.veces));
    return filas.map(x => ({ ...x, pop: (x.veces / max) * 100 }));
  });

  const resumenSocios = computed(() => socios.value
    .filter(s => !q.value || norm(s.nombre).includes(q.value) || norm(s.email).includes(q.value))
    .map(s => {
      const suyos = alquileres.value.filter(a => a.socio_id === s.socio_id);
      const act = suyos.filter(a => !a.fecha_devolucion);
      return {
        s, total: suyos.length, activos: act.length,
        vencidos: act.filter(a => a.estado === 'Vencido').length,
        multas: act.reduce((t, a) => t + Number(a.multa), 0),
        gastado: suyos.reduce((t, a) => t + Number(a.total), 0)
      };
    })
    .sort((a, b) => b.vencidos - a.vencidos || b.activos - a.activos || a.s.nombre.localeCompare(b.s.nombre, 'es')));

  const conteos = computed(() => ({
    prestamos: prestamos.value.length, historial: historial.value.length,
    peliculas: discos.value.length, socios: resumenSocios.value.length
  }));

  async function cargar() {
    cargando.value = true;
    try {
      alquileres.value = await api.adminAlquileres();
      cargadoEn.value = new Date();
      ahora.value = Date.now();
      error.value = '';
    } catch (e) {
      error.value = e.message;
      throw e;
    } finally {
      cargando.value = false;
    }
  }

  async function iniciar() {
    await cargar();
    clearInterval(reloj);
    reloj = setInterval(() => { ahora.value = Date.now(); }, 30_000);
  }
  onBeforeUnmount(() => clearInterval(reloj));

  async function devolver(a) {
    const r = await api.devolver(a.socio_id, a.alquiler_id);
    await cargar();
    toast(Number(r.multa) ? `Devolución de “${r.titulo}” registrada con multa de ${bs(r.multa)}.` : `Devolución de “${r.titulo}” registrada a tiempo.`);
  }

  function verAlquileresDe(email) {
    filtro.q = email;
    filtro.estado = '';
    filtro.tab = 'historial';
  }

  function exportarCsv() {
    const cols = ['alquiler_id', 'socio', 'socio_email', 'titulo', 'fecha_alquiler', 'dias', 'fecha_limite', 'fecha_devolucion', 'estado', 'total', 'multa'];
    const celda = v => { const s = String(v ?? ''); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = '﻿' + [cols.join(';'), ...alquileres.value.map(a => cols.map(c => celda(a[c])).join(';'))].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: `alquileres-club-sakila-${new Date().toISOString().slice(0, 10)}.csv` });
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`CSV exportado: ${plural(alquileres.value.length, 'alquiler', 'alquileres')}.`);
  }

  return {
    alquileres, ahora, cargadoEn, cargando, error, filtro,
    resumen, prestamos, historial, discos, resumenSocios, conteos,
    cargar, iniciar, devolver, verAlquileresDe, exportarCsv
  };
}
