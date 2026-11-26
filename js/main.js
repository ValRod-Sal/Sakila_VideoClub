import { api, onSessionExpired } from './api.js';
import { installArtFallback } from './disc.js';
import { crearApp } from './vue/app.js';

// Punto de entrada: comprueba la sesión y monta la app de Vue 3 (js/vue/) sobre #app.
// La plantilla de la app es el propio index.html.
async function init() {
  installArtFallback();
  onSessionExpired(() => location.replace('login.html?expirada=1'));
  let usuario = null;
  try { usuario = await api.sesion(); } catch { }
  if (!usuario) {
    location.replace('login.html');
    return;
  }
  document.body.classList.toggle('is-admin', usuario.rol === 'admin');
  crearApp(usuario).mount('#app');
  document.body.classList.add('is-ready');
}
init();
