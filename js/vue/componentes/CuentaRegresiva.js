import { computed } from 'vue';

const DIA = 86_400_000;
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

// Convierte milisegundos en texto: "2 días 5 h", "3 h 10 min", "12 min".
export function duracion(ms) {
  const min = Math.max(1, Math.round(Math.abs(ms) / 60_000));
  const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60;
  if (d) return `${plural(d, 'día', 'días')}${h ? ` ${h} h` : ''}`;
  if (h) return `${h} h${m ? ` ${m} min` : ''}`;
  return `${m} min`;
}

// <cuenta-regresiva :inicio="a.fecha_alquiler" :limite="a.fecha_limite" :ahora="ahora">
// Barra verde; amarilla si vence en menos de 24 h; roja si ya venció.
export default {
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
