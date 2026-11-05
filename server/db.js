'use strict';
// Base de datos SQLite usando el módulo integrado de Node.js (node:sqlite, Node >= 22.13). Sin dependencias.
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const DB_DIR = path.join(__dirname, '..', 'database');
const DB_FILE = process.env.DB_FILE || path.join(DB_DIR, 'sakila_club.db');

function open() {
  const db = new DatabaseSync(DB_FILE);
  db.exec('PRAGMA foreign_keys = ON;');
  const existe = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'pelicula'").get();
  if (!existe) {
    db.exec(fs.readFileSync(path.join(DB_DIR, 'schema.sql'), 'utf8'));
    db.exec(fs.readFileSync(path.join(DB_DIR, 'seed.sql'), 'utf8'));
    console.log('Base de datos creada con datos de ejemplo:', DB_FILE);
  }
  return db;
}

// Transacción simple: confirma si fn() termina bien, revierte si lanza un error.
function tx(db, fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}

module.exports = { open, tx, DB_FILE };
