'use strict';
// Copia Vue (instalado con npm) a js/vue/vendor/ para que el navegador lo cargue sin CDN.
// GitHub Pages no sirve node_modules, así que la copia se guarda en el repositorio.
// Se ejecuta solo después de `npm install` (script "postinstall") o con `npm run vue:copiar`.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const origen = path.join(ROOT, 'node_modules', 'vue', 'dist', 'vue.esm-browser.prod.js');
const destino = path.join(ROOT, 'js', 'vue', 'vendor', 'vue.esm-browser.prod.js');

if (!fs.existsSync(origen)) {
  console.error('No se encontró Vue en node_modules. Ejecuta "npm install" primero.');
  process.exit(1);
}
const { version } = require(path.join(ROOT, 'node_modules', 'vue', 'package.json'));
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.copyFileSync(origen, destino);
console.log(`Vue ${version} copiado a js/vue/vendor/vue.esm-browser.prod.js`);
