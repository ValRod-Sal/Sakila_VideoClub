const F = (id, title, cat, year, len, rating, rate, desc, actors, s1, s2) =>
  ({ id, title, cat, year, len, rating, rate, desc, actors, s1, s2, days: rate > 2 ? 5 : 3 });

const LOCAL = [
  F(1, "Academy Dinosaur", "Documentary", 2006, 86, "PG", 0.99, "Un cientifico y una maestra descubren un secreto jurasico en un museo olvidado.", ["Penelope Guiness", "Johnny Cage"], 4, 4),
  F(2, "Ace Goldfinger", "Horror", 2006, 48, "G", 4.99, "Un astronauta atrapado en una casa embrujada debe enfrentar su pasado.", ["Bob Fawcett", "Minnie Zellweger"], 3, 2),
  F(3, "Adaptation Holes", "Documentary", 2006, 50, "NC-17", 2.99, "Una investigacion sobre como el cine cambia al adaptar historias reales.", ["Nick Wahlberg", "Bob Fawcett"], 2, 3),
  F(4, "Affair Prejudice", "Horror", 2006, 117, "G", 2.99, "Un pueblo sospecha de su nuevo vecino en una noche sin luna.", ["Jodie Degeneres", "Scarlett Damon"], 3, 3),
  F(5, "African Egg", "Family", 2006, 130, "G", 2.99, "Una familia viaja a Africa para devolver un huevo misterioso a su hogar.", ["Gene Willis", "Kirsten Paltrow"], 5, 1),
  F(6, "Agent Truman", "Foreign", 2006, 169, "PG", 2.99, "Espionaje internacional con giros inesperados y mucha accion.", ["Kim Alda", "Sidney Crowe"], 2, 2),
  F(7, "Airplane Sierra", "Comedy", 2006, 62, "PG-13", 4.99, "Un vuelo caotico donde todo lo que puede salir mal, sale peor.", ["Oprah Kilmer", "Mena Hopper"], 4, 3),
  F(8, "Alabama Devil", "Horror", 2006, 114, "PG-13", 2.99, "Un viaje por carretera se convierte en pesadilla en un pueblo del sur.", ["Gary Phoenix", "Rip Winslet"], 1, 4),
  F(9, "Aladdin Calendar", "Sports", 2006, 63, "NC-17", 4.99, "Un campeon retirado vuelve al ring para saldar una vieja deuda.", ["Karl Berry", "Zero Cage"], 3, 3),
  F(10, "Alamo Videotape", "Foreign", 2006, 126, "G", 0.99, "Una cinta encontrada revela la historia de un pueblo fronterizo.", ["Ed Chase", "Lucille Tracy"], 2, 5),
  F(11, "Alaska Phantom", "Music", 2006, 136, "PG", 0.99, "Una banda indie persigue al fantasma de un musico perdido en Alaska.", ["Meryl Allen", "Fay Kilmer"], 4, 2),
  F(12, "Ali Forever", "Horror", 2006, 150, "PG", 4.99, "Una leyenda urbana cobra vida en el ultimo dia del verano.", ["Penelope Cronyn", "Julia Barrymore"], 2, 2),
  F(13, "Alien Center", "Sci-Fi", 2006, 46, "NC-17", 2.99, "Primer contacto en un centro comercial a medianoche.", ["Dan Streep", "Emily Dee"], 3, 4),
  F(14, "Alley Evolution", "Foreign", 2006, 180, "NC-17", 2.99, "Un drama epico sobre tres generaciones de una misma calle.", ["Morgan Hopkins", "Sissy Sobieski"], 1, 3)
];
