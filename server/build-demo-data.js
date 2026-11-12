'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { wikiPoster } = require('./portadas');

const ROOT = path.resolve(__dirname, '..');
const db = new DatabaseSync(':memory:');
db.exec(fs.readFileSync(path.join(ROOT, 'database', 'schema.sql'), 'utf8'));
db.exec(fs.readFileSync(path.join(ROOT, 'database', 'seed.sql'), 'utf8'));

const peliculas = db.prepare(`
  SELECT p.pelicula_id, p.titulo, p.director, p.sinopsis, p.anio, p.duracion, p.clasificacion, p.tarifa_dia,
         p.color1, p.color2, p.trailer_url, c.nombre AS categoria,
         (SELECT group_concat(nombre, ', ') FROM (
            SELECT a.nombre FROM pelicula_actor pa JOIN actor a ON a.actor_id = pa.actor_id
            WHERE pa.pelicula_id = p.pelicula_id ORDER BY pa.rowid)) AS reparto
  FROM pelicula p JOIN categoria c ON c.categoria_id = p.categoria_id
  ORDER BY p.anio DESC, p.titulo`).all().map(r => ({ ...r, portada: null }));

const categorias = db.prepare('SELECT nombre FROM categoria ORDER BY nombre').all().map(r => r.nombre);
const socios = db.prepare('SELECT socio_id, nombre, email, rol, password_hash FROM socio ORDER BY nombre').all().map(r => ({ ...r }));

const dias = col => `round(julianday(${col}) - julianday('now'), 3)`;
const alquileres = db.prepare(`
  SELECT alquiler_id, socio_id, pelicula_id, dias, total,
         ${dias('fecha_alquiler')} AS d_alquiler, ${dias('fecha_limite')} AS d_limite,
         CASE WHEN fecha_devolucion IS NULL THEN NULL ELSE ${dias('fecha_devolucion')} END AS d_devolucion
  FROM alquiler ORDER BY alquiler_id`).all().map(r => ({ ...r }));

const favoritos = db.prepare('SELECT socio_id, pelicula_id FROM favorito').all().map(r => ({ ...r }));

// En modo demostración no hay servidor que descargue portadas: se guarda la URL del póster de Wikipedia.
async function portadasDemo() {
  if (process.argv.includes('--sin-portadas')) return 0;
  let n = 0;
  for (const p of peliculas) {
    try { p.portada = await wikiPoster(p); } catch (e) { console.warn(`Sin portada para ${p.titulo}: ${e.message}`); }
    if (p.portada) n++;
  }
  return n;
}

portadasDemo().then(conPortada => {
  const data = { peliculas, categorias, socios, alquileres, favoritos };
  const out = `export const DEMO_DATA = ${JSON.stringify(data, null, 1)};
`;
  fs.writeFileSync(path.join(ROOT, 'js', 'demo-data.js'), out);
  console.log(`js/demo-data.js generado: ${peliculas.length} películas (${conPortada} con portada), ${socios.length} socios, ${alquileres.length} alquileres.`);
});
