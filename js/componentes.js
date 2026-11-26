import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { DiscStripGallery } from './disc-strip.js';
import { discHTML, discBackHTML } from './disc.js';

const HORA = 3_600_000;
const DIA = 24 * HORA;
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

export function duracion(ms) {
  const min = Math.max(1, Math.round(Math.abs(ms) / 60_000));
  const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60;
  if (d) return `${plural(d, 'día', 'días')}${h ? ` ${h} h` : ''}`;
  if (h) return `${h} h${m ? ` ${m} min` : ''}`;
  return `${m} min`;
}

// <cd-disco :peli="p">: el disco con la portada de la película (o su reverso con :reverso="true").
export const CdDisco = {
  name: 'CdDisco',
  props: {
    peli: { type: Object, default: null },
    reverso: { type: Boolean, default: false },
    lazy: { type: Boolean, default: true }
  },
  setup(props) {
    const html = computed(() => props.reverso ? discBackHTML() : props.peli ? discHTML(props.peli, { lazy: props.lazy }) : '');
    return { html };
  },
  template: '<span class="cd-host" v-html="html"></span>'
};

// <tarjeta-stat valor="3" etiqueta="Discos en préstamo" :alerta="true">
export const TarjetaStat = {
  name: 'TarjetaStat',
  props: { valor: [String, Number], etiqueta: String, alerta: Boolean, extra: String },
  template: `
    <div class="stat" :class="{ 'stat--alert': alerta }">
      <strong>{{ valor }}<small v-if="extra" class="muted">{{ ' ' + extra }}</small></strong>
      <span>{{ etiqueta }}</span>
    </div>`
};

// <cuenta-regresiva :inicio="a.fecha_alquiler" :limite="a.fecha_limite" :ahora="ahora">
export const CuentaRegresiva = {
  name: 'CuentaRegresiva',
  props: { inicio: String, limite: String, ahora: Number },
  setup(props) {
    const estado = computed(() => {
      const inicio = Date.parse(props.inicio), limite = Date.parse(props.limite);
      const resta = limite - props.ahora;
      if (resta < 0) return { clase: 'countdown--late', texto: `Vencido hace ${duracion(resta)}`, p: 100 };
      const p = Math.min(100, Math.max(0, ((props.ahora - inicio) / Math.max(1, limite - inicio)) * 100));
      return { clase: resta < DIA ? 'countdown--soon' : '', texto: `Quedan ${duracion(resta)}`, p };
    });
    return { estado };
  },
  template: `
    <div class="countdown" :class="estado.clase">
      <span class="countdown__text">{{ estado.texto }}</span>
      <span class="countdown__bar" aria-hidden="true"><span :style="{ '--p': estado.p.toFixed(1) + '%' }"></span></span>
    </div>`
};

// <tira-discos ref="tira" @activo="..." @abrir="...">: envuelve la tira 3D (DiscStripGallery),
// que anima los discos con su propio bucle; Vue solo le pasa la lista y escucha sus eventos.
export const TiraDiscos = {
  name: 'TiraDiscos',
  emits: ['activo', 'abrir'],
  setup(_, { emit, expose }) {
    const stage = ref(null);
    const track = ref(null);
    let tira = null;
    onMounted(() => {
      tira = new DiscStripGallery({
        stageEl: stage.value,
        trackEl: track.value,
        keyTarget: stage.value.closest('section') || stage.value,
        onActiveChange: (p, i, total) => emit('activo', p || null, i, total),
        onDiscOpen: p => emit('abrir', p)
      });
    });
    onBeforeUnmount(() => tira?.destroy?.());
    expose({
      setFilms: (films, i) => tira?.setFilms(films, i),
      prev: () => tira?.prev(),
      next: () => tira?.next(),
      goToIndex: i => tira?.goToIndex(i),
      toggleFlip: () => tira?.toggleFlipActive(),
      activeIndex: () => tira?.activeIndex ?? -1
    });
    return { stage, track };
  },
  template: '<div class="disc-stage" ref="stage"><div class="disc-track" ref="track"></div></div>'
};

export function registrarComponentes(app) {
  app.component('cd-disco', CdDisco);
  app.component('tarjeta-stat', TarjetaStat);
  app.component('cuenta-regresiva', CuentaRegresiva);
  app.component('tira-discos', TiraDiscos);
}
