-- Corrige los tráileres que apuntaban a otra película o a videos eliminados.
UPDATE pelicula SET trailer_url = 'https://www.youtube-nocookie.com/embed/0HjdiohVOik' WHERE pelicula_id = 1 AND titulo = 'Backrooms';
UPDATE pelicula SET trailer_url = 'https://www.youtube-nocookie.com/embed/OJ19I9q_hOQ' WHERE pelicula_id = 2 AND titulo = 'The Invite';
UPDATE pelicula SET trailer_url = 'https://www.youtube-nocookie.com/embed/k1MVnzd2aVc' WHERE pelicula_id = 3 AND titulo = 'Tony';
UPDATE pelicula SET trailer_url = 'https://www.youtube-nocookie.com/embed/s9gSuKaKcqM' WHERE pelicula_id = 4 AND titulo = 'Marty Supreme';
UPDATE pelicula SET trailer_url = 'https://www.youtube-nocookie.com/embed/aRpnP3LZ99g' WHERE pelicula_id = 5 AND titulo = 'The Smashing Machine';
UPDATE pelicula SET trailer_url = 'https://www.youtube-nocookie.com/embed/sNExF5WYMaA' WHERE pelicula_id = 12 AND titulo = 'Ex Machina';
UPDATE pelicula SET trailer_url = 'https://www.youtube-nocookie.com/embed/Kwp32zLc08c' WHERE pelicula_id = 13 AND titulo = 'After Yang';
