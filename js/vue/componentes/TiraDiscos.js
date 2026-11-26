import { onBeforeUnmount, onMounted, ref } from 'vue';
import { DiscStripGallery } from '../../disc-strip.js';

// <tira-discos ref="tira" @activo="..." @abrir="...">: envuelve la tira 3D (DiscStripGallery),
// que anima los discos con su propio bucle; Vue solo le pasa la lista y escucha sus eventos.
export default {
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
