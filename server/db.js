'use strict';
require('./env');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const DB_DIR = path.join(__dirname, '..', 'database');
const DB_FILE = process.env.DB_FILE || path.join(DB_DIR, 'sakila_club.db');

function open() {
  const db = new DatabaseSync(DB_FILE);
  db.exec('PRAGMA foreign_keys = ON;');
  db.function('norm', { deterministic: true },
    v => v == null ? null : String(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase());
  const existe = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'pelicula'").get();
  const migraciones = listarMigraciones();
  const ultima = migraciones.at(-1)?.version ?? 0;
  if (!existe) {
    tx(db, () => {
      db.exec(fs.readFileSync(path.join(DB_DIR, 'schema.sql'), 'utf8'));
      db.exec(fs.readFileSync(path.join(DB_DIR, 'seed.sql'), 'utf8'));
      db.exec(`PRAGMA user_version = ${ultima}`);
    });
    console.log('Base de datos creada con datos de ejemplo:', DB_FILE);
  } else if (!db.prepare("SELECT 1 FROM pragma_table_info('socio') WHERE name = 'password_hash'").get()) {
    throw new Error('La base de datos es de una versión anterior. Ejecuta "npm run db:reset" para recrearla.');
  } else {
    const actual = db.prepare('PRAGMA user_version').get().user_version;
    for (const m of migraciones.filter(m => m.version > actual)) {
      tx(db, () => {
        db.exec(fs.readFileSync(m.file, 'utf8'));
        db.exec(`PRAGMA user_version = ${m.version}`);
      });
      console.log(`Migración aplicada: ${path.basename(m.file)}`);
    }
  }
  return db;
}

// database/migraciones/NNN-descripcion.sql se aplican una sola vez, en orden,
// sobre bases ya creadas. La versión aplicada se guarda en PRAGMA user_version.
function listarMigraciones() {
  const dir = path.join(DB_DIR, 'migraciones');
  let archivos = [];
  try { archivos = fs.readdirSync(dir); } catch { return []; }
  return archivos
    .map(f => ({ m: /^(\d+)-.+\.sql$/.exec(f), f }))
    .filter(x => x.m)
    .map(x => ({ version: Number(x.m[1]), file: path.join(dir, x.f) }))
    .sort((a, b) => a.version - b.version);
}

function tx(db, fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}

module.exports = { open, tx, DB_FILE, DB_DIR };
