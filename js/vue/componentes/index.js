import CdDisco from './CdDisco.js';
import TarjetaStat from './TarjetaStat.js';
import CuentaRegresiva from './CuentaRegresiva.js';
import TiraDiscos from './TiraDiscos.js';

// Registra los componentes globales de la app (se usan en index.html en kebab-case).
export function registrarComponentes(app) {
  app.component('cd-disco', CdDisco);
  app.component('tarjeta-stat', TarjetaStat);
  app.component('cuenta-regresiva', CuentaRegresiva);
  app.component('tira-discos', TiraDiscos);
}

export { CdDisco, TarjetaStat, CuentaRegresiva, TiraDiscos };
