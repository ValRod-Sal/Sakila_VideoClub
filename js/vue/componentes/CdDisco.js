import { computed } from 'vue';
import { discHTML, discBackHTML } from '../../disc.js';

// <cd-disco :peli="p">: el disco con la portada de la película (o su reverso con :reverso="true").
export default {
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
