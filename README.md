# Sakila Videoclub

Proyecto web de un club de videos basado en la base de datos Sakila

Equipo: Valeria Rodriguez, Jorge Soliz, Wara Tipola

## Tecnologias
HTML5, CSS3, JavaScript ES6+, Tailwind CSS (CDN), Alpine.js (CDN), Fetch API, localStorage

## Estructura
```
sakila-basico/
  index.html
  README.md
  assets/
    favicon.svg
  css/
    styles.css
  js/
    config.js
    data.js
    app.js
```

## Ejecucion
Abrir index.html en el navegador o usar Live Server.

## API
Definir API_URL en js/config.js. Si esta vacia se usan los datos de js/data.js.
La app hace GET a API_URL/films y espera un arreglo con: id, title, cat, year, len, rating, rate, desc, actors, s1, s2, days.
