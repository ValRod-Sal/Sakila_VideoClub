-- Agrega una película de clasificación G para que el filtro G del catálogo tenga resultados.
INSERT OR IGNORE INTO pelicula (pelicula_id, titulo, director, sinopsis, anio, duracion, clasificacion, tarifa_dia, color1, color2, trailer_url, categoria_id) VALUES
 (15, 'Toy Story 4', 'Josh Cooley', 'Cuando Bonnie convierte un tenedor de plástico en su juguete favorito, Woody emprende un viaje por carretera para cuidarlo y se reencuentra con Bo Peep, quien le muestra que el mundo es mucho más grande de lo que imaginaba.', 2019, 100, 'G', 3.50, '#4a90c8', '#132a40', 'https://www.youtube-nocookie.com/embed/wmiIUN-7qhE', 4);
INSERT OR IGNORE INTO actor (actor_id, nombre) VALUES
 (55, 'Tom Hanks'),
 (56, 'Tim Allen'),
 (57, 'Annie Potts'),
 (58, 'Tony Hale'),
 (59, 'Keanu Reeves');
INSERT OR IGNORE INTO pelicula_actor (pelicula_id, actor_id) VALUES
 (15, 55), (15, 56), (15, 57), (15, 58), (15, 59);
