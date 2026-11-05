'use strict';
// npm run db:reset  → borra la base y la vuelve a crear con los datos de ejemplo
const fs = require('node:fs');
const { open, DB_FILE } = require('./db');
fs.rmSync(DB_FILE, { force: true });
open().close();
console.log('Listo: base de datos restablecida.');
