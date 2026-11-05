-- Datos de ejemplo
PRAGMA foreign_keys = ON;

INSERT INTO categoria (categoria_id, nombre) VALUES
 (1, 'Acción'),
 (2, 'Drama'),
 (3, 'Sci-Fi'),
 (4, 'Comedia'),
 (5, 'Terror');

-- Tráiler: video de ejemplo; reemplaza cada URL por el embed real de la película.
INSERT INTO pelicula (pelicula_id, titulo, sinopsis, anio, duracion, clasificacion, tarifa_dia, color1, color2, trailer_url, categoria_id) VALUES
 (1, 'Academy Dinosaur', 'Un paleontólogo descubre que el dinosaurio de su museo despierta cada medianoche y debe ocultarlo antes de la gran inauguración.', 2006, 86, 'PG', 4.00, '#8aa0b8', '#2f3d4f', 'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ', 3),
 (2, 'Agent Truman', 'Un agente retirado es llamado de vuelta cuando una red de espionaje comienza a borrar los archivos de su pasado.', 2008, 169, 'R', 6.00, '#6f7f94', '#1c2533', 'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ', 1),
 (3, 'Alien Center', 'En un centro comercial abandonado, un grupo de guardias nocturnos encuentra una señal que no proviene de la Tierra.', 2007, 110, 'R', 6.00, '#a9b6c4', '#4a5868', 'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ', 3),
 (4, 'Airplane Sierra', 'Un piloto novato debe aterrizar un avión de carga sobre una cordillera nevada con una tripulación que no confía en él.', 2005, 118, 'PG-13', 5.00, '#c9ced4', '#6b7480', 'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ', 1),
 (5, 'Beauty Grease', 'Dos hermanas heredan un viejo taller mecánico y descubren, entre grasa y herramientas, secretos de su familia.', 2004, 132, 'PG-13', 5.00, '#5d6b7d', '#1a212b', 'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ', 2),
 (6, 'Chamber Italian', 'Una soprano exiliada regresa a Roma para cantar en la última función de un teatro a punto de cerrar.', 2006, 117, 'R', 5.00, '#9aa7b5', '#3a4552', 'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ', 2),
 (7, 'Dinosaur Secretary', 'Una secretaria con memoria perfecta es la única que recuerda cómo funcionaba el laboratorio antes del experimento.', 2009, 93, 'PG', 4.00, '#b4bcc6', '#59636f', 'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ', 3),
 (8, 'Early Home', 'Un niño de pueblo y su abuela atraviesan el país en tren para llegar a la casa donde nació ella.', 2003, 90, 'G', 3.50, '#b9c0c8', '#6f7782', 'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ', 2),
 (9, 'Giant Troopers', 'Un escuadrón de rescate entra a una ciudad derrumbada para sacar a los sobrevivientes antes del amanecer.', 2010, 126, 'R', 6.00, '#4a4f57', '#0e1014', 'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ', 1),
 (10, 'Hanover Galaxy', 'La tripulación de una nave minera descubre que el mapa de su ruta fue dibujado por alguien que ya estuvo allí.', 2011, 104, 'PG-13', 5.50, '#7d8da3', '#27303d', 'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ', 3),
 (11, 'Italian African', 'Un chef italiano y un guía de safari intercambian trabajos por error y hacen reír a todo un continente.', 2002, 98, 'PG-13', 4.00, '#aab4c0', '#505b68', 'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ', 4),
 (12, 'Madigan Dorado', 'Una familia compra una hacienda barata y pronto entiende por qué nadie quiso quedarse a dormir.', 2007, 101, 'R', 5.00, '#636c77', '#161a20', 'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ', 5),
 (13, 'Notting Speakeasy', 'Tres amigos montan un bar clandestino en pleno siglo XXI, con vecinos que lo aprueban todo.', 2006, 88, 'PG', 4.00, '#bcc4cd', '#6a7480', 'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ', 4),
 (14, 'Oklahoma Jumanji', 'Un grupo de primos encuentra un juego de mesa en el desván y la tormenta de afuera empieza a obedecer las reglas.', 2005, 77, 'G', 3.50, '#94a5bb', '#34445a', 'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ', 4),
 (15, 'Pelican Comforts', 'Una enfermera de turno noche empieza a recibir llamadas desde una habitación clausurada hace años.', 2009, 114, 'PG-13', 5.00, '#555c66', '#101318', 'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ', 5),
 (16, 'Wake Jaws', 'Tras perder su empleo, un viejo pescador vuelve a la costa y enfrenta la deuda que dejó con su pueblo.', 2004, 126, 'PG', 4.50, '#8b929b', '#2a2f36', 'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ', 2);

INSERT INTO actor (actor_id, nombre) VALUES
 (1, 'Bette Nicholson'),
 (2, 'Christian Gable'),
 (3, 'Ed Chase'),
 (4, 'Grace Mostel'),
 (5, 'Jennifer Davis'),
 (6, 'Joe Swank'),
 (7, 'Johnny Lollobrigida'),
 (8, 'Karl Berry'),
 (9, 'Matthew Johansson'),
 (10, 'Nick Wahlberg'),
 (11, 'Penelope Guiness'),
 (12, 'Zero Cage');

INSERT INTO pelicula_actor (pelicula_id, actor_id) VALUES
 (1, 1), (1, 2), (1, 11), (2, 6), (2, 7), (2, 10), (3, 5), (3, 8), (3, 12), (4, 3), (4, 6), (4, 9), (5, 4), (5, 8), (5, 11), (6, 1), (6, 2), (6, 4), (7, 5), (7, 10), (7, 12), (8, 3), (8, 4), (8, 8), (9, 6), (9, 7), (9, 9), (10, 8), (10, 11), (10, 12), (11, 1), (11, 9), (11, 10), (12, 2), (12, 5), (12, 8), (13, 1), (13, 3), (13, 7), (14, 4), (14, 6), (14, 11), (15, 2), (15, 9), (15, 10), (16, 3), (16, 5), (16, 12);

INSERT INTO socio (socio_id, nombre, email) VALUES
 (1, 'Carlos Mamani', 'carlos.mamani@ucb.edu.bo'),
 (2, 'Lucía Vargas', 'lucia.vargas@ucb.edu.bo'),
 (3, 'Andrés Choque', 'andres.choque@ucb.edu.bo');

-- Historial de ejemplo (fechas relativas a hoy: hay un alquiler vencido con multa)
INSERT INTO alquiler (socio_id, pelicula_id, fecha_alquiler, dias, fecha_limite, fecha_devolucion, total) VALUES
 (1,  3, datetime('now','-14 days'), 3, datetime('now','-11 days'), datetime('now','-10 days'), 18.00),
 (1,  9, datetime('now','-10 days'), 3, datetime('now','-7 days'),  NULL, 18.00),
 (1, 14, datetime('now','-1 days'),  5, datetime('now','+4 days'),  NULL, 17.50),
 (2,  5, datetime('now','-6 days'),  4, datetime('now','-2 days'),  datetime('now','-3 days'), 20.00);

INSERT INTO favorito (socio_id, pelicula_id) VALUES (1,3),(1,10),(2,5),(2,6);
