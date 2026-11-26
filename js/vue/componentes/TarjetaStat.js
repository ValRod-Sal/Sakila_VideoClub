// <tarjeta-stat valor="3" etiqueta="Discos en préstamo" :alerta="true" extra="/ 15">
export default {
  name: 'TarjetaStat',
  props: { valor: [String, Number], etiqueta: String, alerta: Boolean, extra: String },
  template: `
    <div class="stat" :class="{ 'stat--alert': alerta }">
      <strong>{{ valor }}<small v-if="extra" class="muted">{{ ' ' + extra }}</small></strong>
      <span>{{ etiqueta }}</span>
    </div>`
};
