# Club Sakila — Discos (SIS-214, Proyecto 1)

HTML5 semántico · CSS3 modular (Grid/Flex, Custom Properties) · JavaScript ES6+ (módulos, Fetch API) · API REST en Node.js · SQLite.

## Requisitos
Node.js **22.13 o superior** (`node -v`). No hay que instalar paquetes: `npm install` no es necesario.

## Cómo correrlo (VS Code)
1. File → Open Folder → esta carpeta.
2. Abre la terminal integrada (Ctrl + `) y ejecuta:
   ```bash
   npm start
   ```
3. Abre http://localhost:3000

Para desarrollar con recarga automática del servidor: `npm run dev`.
Para volver a los datos de ejemplo: `npm run db:reset`.

La base de datos (`database/sakila_club.db`) se crea sola la primera vez a partir de `database/schema.sql` y `database/seed.sql`.

## API REST
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/peliculas?q=&categoria=&clasificacion=` | Catálogo con filtros y búsqueda por título o reparto |
| GET | `/api/peliculas/:id` | Ficha de una película |
| GET | `/api/categorias` | Lista de categorías |
| GET / POST | `/api/socios` | Listar o registrar socios |
| GET / POST | `/api/socios/:id/alquileres` | Historial (con estado y multa) / confirmar un carrito |
| PATCH | `/api/socios/:id/alquileres/:aid/devolucion` | Registrar devolución |
| GET | `/api/socios/:id/favoritos` | Ids de favoritos |
| PUT / DELETE | `/api/socios/:id/favoritos/:pid` | Agregar / quitar favorito |

## Estructura
```
index.html
css/       variables, base, layout, components, styles (@import)
js/        main.js (interfaz), api.js (cliente Fetch)
server/    server.js (API + archivos estáticos), db.js, reset-db.js
database/  schema.sql, seed.sql
docs/      historias-de-usuario.md
assets/    images/, icons/
```

## Despliegue
GitHub Pages solo sirve archivos estáticos, así que no puede correr este servidor. Usa **Render**: crea un *Web Service* desde el repositorio (el archivo `render.yaml` ya trae la configuración: build `npm install`, start `npm start`). En el plan gratuito el disco es temporal, por lo que la base vuelve a los datos de ejemplo cuando el servicio se reinicia.

## Tráileres
Todas las películas usan un video de ejemplo. Cambia `trailer_url` en `database/seed.sql` (y ejecuta `npm run db:reset`) por el enlace *embed* de cada película.
