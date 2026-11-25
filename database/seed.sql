PRAGMA foreign_keys = ON;

INSERT INTO categoria (categoria_id, nombre) VALUES
 (1, 'Acción'),
 (2, 'Drama'),
 (3, 'Sci-Fi'),
 (4, 'Comedia'),
 (5, 'Terror');

INSERT INTO pelicula (pelicula_id, titulo, director, sinopsis, anio, duracion, clasificacion, tarifa_dia, color1, color2, trailer_url, categoria_id) VALUES
 (1, 'Backrooms', 'Kane Parsons', 'Tras caer accidentalmente fuera de la realidad hacia un laberinto infinito de habitaciones amarillas fluorescentes y pasillos vacíos, un equipo de investigación descubre que algo habita en los niveles más profundos del espacio liminal.', 2026, 108, 'R', 5.00, '#c8b560', '#2a2412', 'https://www.youtube-nocookie.com/embed/0HjdiohVOik', 5),
 (2, 'The Invite', 'Olivia Wilde', 'Una pareja en crisis invita a cenar a sus carismáticos y desinhibidos vecinos del piso de arriba. Lo que empieza como una velada incómoda se transforma en una noche de confesiones explosivas y giros inesperados.', 2026, 102, 'R', 4.50, '#b83a2e', '#2b110e', 'https://www.youtube-nocookie.com/embed/OJ19I9q_hOQ', 4),
 (3, 'Tony', 'Matt Johnson', 'Verano de 1976 en Provincetown, Massachusetts. Un joven Anthony Bourdain descubre el frenesí, el caos y la camaradería de las cocinas profesionales durante una temporada estival que cambiará su destino para siempre.', 2026, 118, 'R', 4.50, '#3b6e8c', '#10212b', 'https://www.youtube-nocookie.com/embed/k1MVnzd2aVc', 2),
 (4, 'Marty Supreme', 'Josh Safdie', 'Inspirada en la vertiginosa cultura del tenis de mesa de los años 50 en Nueva York, sigue a Marty Mauser en su obsesiva y electrizante búsqueda por convertir un deporte marginal en un espectáculo mundial.', 2025, 149, 'R', 5.00, '#d97324', '#2e1505', 'https://www.youtube-nocookie.com/embed/s9gSuKaKcqM', 2),
 (5, 'The Smashing Machine', 'Benny Safdie', 'La historia real del legendario peleador de artes marciales mixtas Mark Kerr en la era salvaje de los primeros torneos de UFC y Pride, enfrentando sus batallas dentro del ring y sus demonios personales fuera de él.', 2025, 123, 'R', 4.50, '#7a8b99', '#1b2228', 'https://www.youtube-nocookie.com/embed/aRpnP3LZ99g', 1),
 (6, 'The Brutalist', 'Brady Corbet', 'Huyendo de la Europa de posguerra, el visionario arquitecto László Tóth llega a Estados Unidos para reconstruir su vida y su legado cuando un misterioso industrial le encarga erigir un monumento modernista.', 2024, 215, 'R', 5.00, '#8c7f70', '#1f1c18', 'https://www.youtube-nocookie.com/embed/GdRXPAHIEW4', 2),
 (7, 'The Zone of Interest', 'Jonathan Glazer', 'El comandante Rudolf Höss y su esposa Hedwig se esfuerzan en construir una vida idílica con jardín y piscina para su familia justo al lado del muro de Auschwitz.', 2023, 105, 'PG-13', 4.00, '#4e6b48', '#141d12', 'https://www.youtube-nocookie.com/embed/r-vfg3KkV54', 2),
 (8, 'Everything Everywhere All at Once', 'Daniel Kwan, Daniel Scheinert', 'Una inmigrante china agotada por una auditoría fiscal se ve envuelta en una aventura demencial en la que solo ella puede salvar la existencia explorando otros universos conectados con las vidas que pudo haber llevado.', 2022, 139, 'R', 4.50, '#d44b3e', '#241938', 'https://www.youtube-nocookie.com/embed/wxN1T1uxQ2g', 1),
 (9, 'Uncut Gems', 'Josh Safdie, Benny Safdie', 'Howard Ratner, un carismático joyero del Distrito de los Diamantes de Nueva York siempre en busca del próximo gran golpe, realiza una serie de apuestas de alto riesgo que podrían darle la fortuna de su vida.', 2019, 135, 'R', 4.00, '#2c2f36', '#0d0e11', 'https://www.youtube-nocookie.com/embed/vTfJp2Ts9X8', 2),
 (10, 'Hereditary', 'Ari Aster', 'Tras la muerte de la reservada matriarca de la familia Graham, su hija y sus nietos comienzan a desentrañar secretos crípticos y cada vez más aterradores sobre su linaje y el destino que han heredado.', 2018, 127, 'R', 4.00, '#2c423f', '#0b1312', 'https://www.youtube-nocookie.com/embed/V6wWKNij_1M', 5),
 (11, 'Lady Bird', 'Greta Gerwig', 'En el año 2002, una joven de diecisiete años con inclinaciones artísticas navega por el amor, la amistad y el turbulento vínculo con su obstinada madre durante su último año de secundaria en Sacramento.', 2017, 94, 'R', 3.50, '#b85d6f', '#2e141a', 'https://www.youtube-nocookie.com/embed/cNi_HC839Wo', 4),
 (12, 'Ex Machina', 'Alex Garland', 'Un joven programador es seleccionado para participar en un innovador experimento de inteligencia sintética evaluando las cualidades humanas de Ava, una asombrosa humanoide con inteligencia artificial.', 2015, 108, 'R', 3.50, '#587b8c', '#101a21', 'https://www.youtube-nocookie.com/embed/sNExF5WYMaA', 3),
 (13, 'After Yang', 'Kogonada', 'Cuando el compañero robótico de su pequeña hija sufre una avería inesperada, un padre busca una manera de repararlo y descubre los recuerdos secretos que el androide guardaba sobre la vida y la memoria.', 2022, 96, 'PG', 3.50, '#6b8c6e', '#1a261b', 'https://www.youtube-nocookie.com/embed/Kwp32zLc08c', 3),
 (14, 'Marcel the Shell with Shoes On', 'Dean Fleischer Camp', 'Marcel, una adorable caracola de una pulgada de altura que vive con su abuela Connie, se vuelve viral en un documental que le abre la esperanza de reencontrar a su familia perdida.', 2022, 90, 'PG', 3.50, '#c99b52', '#2d200d', 'https://www.youtube-nocookie.com/embed/k98Afd7Nf3Y', 4),
 (15, 'Toy Story 4', 'Josh Cooley', 'Cuando Bonnie convierte un tenedor de plástico en su juguete favorito, Woody emprende un viaje por carretera para cuidarlo y se reencuentra con Bo Peep, quien le muestra que el mundo es mucho más grande de lo que imaginaba.', 2019, 100, 'G', 3.50, '#4a90c8', '#132a40', 'https://www.youtube-nocookie.com/embed/wmiIUN-7qhE', 4);

INSERT INTO actor (actor_id, nombre) VALUES
 (1, 'Chiwetel Ejiofor'),
 (2, 'Renate Reinsve'),
 (3, 'Seth Rogen'),
 (4, 'Olivia Wilde'),
 (5, 'Penélope Cruz'),
 (6, 'Edward Norton'),
 (7, 'Dominic Sessa'),
 (8, 'Emilia Jones'),
 (9, 'Leo Woodall'),
 (10, 'Antonio Banderas'),
 (11, 'Stavros Halkias'),
 (12, 'Timothée Chalamet'),
 (13, 'Gwyneth Paltrow'),
 (14, 'Kevin O''Leary'),
 (15, 'Odessa A''zion'),
 (16, 'Abel Ferrara'),
 (17, 'Dwayne Johnson'),
 (18, 'Emily Blunt'),
 (19, 'Adrien Brody'),
 (20, 'Felicity Jones'),
 (21, 'Guy Pearce'),
 (22, 'Joe Alwyn'),
 (23, 'Raffey Cassidy'),
 (24, 'Sandra Hüller'),
 (25, 'Christian Friedel'),
 (26, 'Michelle Yeoh'),
 (27, 'Stephanie Hsu'),
 (28, 'Ke Huy Quan'),
 (29, 'Jenny Slate'),
 (30, 'Harry Shum Jr.'),
 (31, 'Adam Sandler'),
 (32, 'Lakeith Stanfield'),
 (33, 'Julia Fox'),
 (34, 'Kevin Garnett'),
 (35, 'Idina Menzel'),
 (36, 'Toni Collette'),
 (37, 'Alex Wolff'),
 (38, 'Milly Shapiro'),
 (39, 'Ann Dowd'),
 (40, 'Gabriel Byrne'),
 (41, 'Saoirse Ronan'),
 (42, 'Laurie Metcalf'),
 (43, 'Tracy Letts'),
 (44, 'Lucas Hedges'),
 (45, 'Oscar Isaac'),
 (46, 'Domhnall Gleeson'),
 (47, 'Alicia Vikander'),
 (48, 'Colin Farrell'),
 (49, 'Jodie Turner-Smith'),
 (50, 'Justin H. Min'),
 (51, 'Malea Emma Tjandrawidjaja'),
 (52, 'Isabella Rossellini'),
 (53, 'Dean Fleischer Camp'),
 (54, 'Rosa Salazar'),
 (55, 'Tom Hanks'),
 (56, 'Tim Allen'),
 (57, 'Annie Potts'),
 (58, 'Tony Hale'),
 (59, 'Keanu Reeves');

INSERT INTO pelicula_actor (pelicula_id, actor_id) VALUES
 (1, 1), (1, 2), (2, 3), (2, 4), (2, 5), (2, 6), (3, 7), (3, 8), (3, 9), (3, 10), (3, 11), (4, 12), (4, 13), (4, 14), (4, 15), (4, 16), (5, 17), (5, 18), (6, 19), (6, 20), (6, 21), (6, 22), (6, 23), (7, 24), (7, 25), (8, 26), (8, 27), (8, 28), (8, 29), (8, 30), (9, 31), (9, 32), (9, 33), (9, 34), (9, 35), (10, 36), (10, 37), (10, 38), (10, 39), (10, 40), (11, 41), (11, 42), (11, 43), (11, 44), (11, 12), (12, 45), (12, 46), (12, 47), (13, 48), (13, 49), (13, 50), (13, 51), (14, 29), (14, 52), (14, 53), (14, 54), (15, 55), (15, 56), (15, 57), (15, 58), (15, 59);

INSERT INTO socio (socio_id, nombre, email, password_hash, rol) VALUES
 (1, 'Carlos Mamani', 'carlos.mamani@ucb.edu.bo', 'pbkdf2$120000$Y2x1Yi1zYWtpbGEtczEtMQ==$ojuZItKUdED5NbKh20tTHj0sJ1s2JMtRwQQKO3doC/k=', 'socio'),
 (2, 'Lucía Vargas', 'lucia.vargas@ucb.edu.bo', 'pbkdf2$120000$Y2x1Yi1zYWtpbGEtczItMg==$ilwkyjWs2kFaRJ/DxStMVVQunjlfq2c8DKIQuOracMk=', 'socio'),
 (3, 'Andrés Choque', 'andres.choque@ucb.edu.bo', 'pbkdf2$120000$Y2x1Yi1zYWtpbGEtczMtMw==$niqeG2bSBu0YXkflE9z102D8jbYrCcLRWhkYHrItddI=', 'socio'),
 (4, 'Administrador', 'admin@clubsakila.bo', 'pbkdf2$120000$Y2x1Yi1zYWtpbGEtYWRtMA==$aQfEap31bUQNy0ALakvgTcGRFa6uY8YSz+oddhLz/+w=', 'admin');

INSERT INTO alquiler (socio_id, pelicula_id, fecha_alquiler, dias, fecha_limite, fecha_devolucion, total) VALUES
 (1, 10, datetime('now','-14 days'), 3, datetime('now','-11 days'), datetime('now','-10 days'), 12.00),
 (1, 9, datetime('now','-6 days'), 3, datetime('now','-3 days'), NULL, 12.00),
 (1, 4, datetime('now','-1 days'), 4, datetime('now','+3 days'), NULL, 20.00),
 (2, 8, datetime('now','-10 days'), 2, datetime('now','-8 days'), datetime('now','-8 days'), 9.00),
 (2, 12, datetime('now','-5 days'), 3, datetime('now','-2 days'), NULL, 10.50);

INSERT INTO favorito (socio_id, pelicula_id) VALUES (1, 9), (1, 4), (1, 10), (2, 8), (2, 11);
