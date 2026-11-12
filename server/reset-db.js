'use strict';
const fs = require('node:fs');
const { open, DB_FILE } = require('./db');
for (const f of [DB_FILE, DB_FILE + '-wal', DB_FILE + '-shm', DB_FILE + '-journal']) fs.rmSync(f, { force: true });
open().close();
console.log('Listo: base de datos restablecida.');
