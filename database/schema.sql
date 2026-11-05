-- Club Sakila (versión simplificada) · SQLite
PRAGMA foreign_keys = ON;

CREATE TABLE categoria (
  categoria_id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre       TEXT NOT NULL UNIQUE
);

CREATE TABLE pelicula (
  pelicula_id   INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo        TEXT NOT NULL,
  sinopsis      TEXT NOT NULL,
  anio          INTEGER NOT NULL,
  duracion      INTEGER NOT NULL,                       -- minutos
  clasificacion TEXT NOT NULL CHECK (clasificacion IN ('G','PG','PG-13','R')),
  tarifa_dia    REAL NOT NULL DEFAULT 5.0,              -- Bs por día
  color1        TEXT NOT NULL DEFAULT '#8aa0b8',        -- etiqueta del disco
  color2        TEXT NOT NULL DEFAULT '#2f3d4f',
  trailer_url   TEXT,
  categoria_id  INTEGER NOT NULL REFERENCES categoria(categoria_id)
);
CREATE INDEX idx_pelicula_titulo ON pelicula(titulo);

CREATE TABLE actor (
  actor_id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre   TEXT NOT NULL
);

CREATE TABLE pelicula_actor (
  pelicula_id INTEGER NOT NULL REFERENCES pelicula(pelicula_id) ON DELETE CASCADE,
  actor_id    INTEGER NOT NULL REFERENCES actor(actor_id) ON DELETE CASCADE,
  PRIMARY KEY (pelicula_id, actor_id)
);

CREATE TABLE socio (
  socio_id       INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre         TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  fecha_registro TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE alquiler (
  alquiler_id      INTEGER PRIMARY KEY AUTOINCREMENT,
  socio_id         INTEGER NOT NULL REFERENCES socio(socio_id),
  pelicula_id      INTEGER NOT NULL REFERENCES pelicula(pelicula_id),
  fecha_alquiler   TEXT NOT NULL DEFAULT (datetime('now')),   -- UTC
  dias             INTEGER NOT NULL CHECK (dias BETWEEN 1 AND 14),
  fecha_limite     TEXT NOT NULL,
  fecha_devolucion TEXT,
  total            REAL NOT NULL
);
CREATE INDEX idx_alquiler_socio ON alquiler(socio_id);

CREATE TABLE favorito (
  socio_id    INTEGER NOT NULL REFERENCES socio(socio_id) ON DELETE CASCADE,
  pelicula_id INTEGER NOT NULL REFERENCES pelicula(pelicula_id) ON DELETE CASCADE,
  PRIMARY KEY (socio_id, pelicula_id)
);

-- Estado del alquiler y multa simulada (Bs 2.00 por día de atraso). Fechas en ISO 8601 UTC.
CREATE VIEW v_alquiler AS
SELECT a.alquiler_id, a.socio_id, a.pelicula_id, p.titulo,
       strftime('%Y-%m-%dT%H:%M:%SZ', a.fecha_alquiler)   AS fecha_alquiler,
       a.dias,
       strftime('%Y-%m-%dT%H:%M:%SZ', a.fecha_limite)     AS fecha_limite,
       strftime('%Y-%m-%dT%H:%M:%SZ', a.fecha_devolucion) AS fecha_devolucion,
       a.total,
       CASE WHEN a.fecha_devolucion IS NOT NULL THEN 'Devuelto'
            WHEN datetime('now') > a.fecha_limite THEN 'Vencido'
            ELSE 'En curso' END AS estado,
       CASE WHEN COALESCE(a.fecha_devolucion, datetime('now')) > a.fecha_limite
            THEN CAST(julianday(COALESCE(a.fecha_devolucion, datetime('now'))) - julianday(a.fecha_limite) + 0.001 AS INTEGER) * 2.0
            ELSE 0 END AS multa
FROM alquiler a
JOIN pelicula p ON p.pelicula_id = a.pelicula_id;
