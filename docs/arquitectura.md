# Arquitectura de Club Sakila

## Capas y responsabilidades

| Capa | Archivos | Responsabilidad |
|---|---|---|
| Presentación | index.html, login.html, css/ | Interfaz semántica, temas, diseño responsivo |
| Interacción | js/main.js, js/login.js, js/admin.js | Eventos, filtros, carrito, acceso y mostrador |
| Componentes | js/disc.js, js/disc-strip.js | Discos y navegación 3D |
| Acceso a datos | js/api.js, js/demo-data.js, js/modo.json | Fetch y selección del modo demostración |
| Servidor | server/server.js, server/auth.js, server/portadas.js | API, sesiones, roles y portadas |
| Persistencia | server/db.js, database/schema.sql, database/seed.sql | SQLite, datos iniciales y migraciones |

```mermaid
flowchart LR
 B[Navegador] --> C[Cliente API]
 C -->|Demo| L[(localStorage)]
 C -->|Servidor| R[API REST]
 R --> A[Autenticación y roles]
 R --> DB[(SQLite)]
 R --> P[Portadas externas y caché]
```

Consultar [manual técnico](manual-tecnico.md) para rutas, configuración y límites de despliegue. Los diagramas de diseño del equipo se encuentran enlazados en el README.
