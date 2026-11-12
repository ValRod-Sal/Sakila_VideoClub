# Historias de usuario — Club Sakila (Plantilla A)

## HU-01 · Buscar y filtrar películas (RF-01)
**Como:** Socio · **Quiero:** buscar por título, director o reparto y filtrar por categoría y clasificación · **Para:** encontrar rápido qué alquilar.
- **Dado que** el usuario está en el Catálogo, **cuando** escribe “penelope” en el buscador, **entonces** el sistema consulta `GET /api/peliculas?q=penelope` y muestra solo los discos cuyo título, director o reparto coincide (encuentra “Penélope Cruz” aunque se escriba sin tilde).
- **Dado que** hay un filtro activo, **cuando** se aplica, **entonces** la tira 3D, el índice y el catálogo muestran solo esos discos y el botón “Buscar” de la barra muestra un punto.
- **Dado que** está en el Catálogo, **cuando** elige categoría “Terror” y clasificación “R”, **entonces** se muestran solo los discos que cumplen ambos filtros, con el contador actualizado.
- **Dado que** ningún disco coincide, **cuando** termina la búsqueda, **entonces** aparece un mensaje que sugiere cambiar los filtros.
- **Validaciones:** la búsqueda se limita a 60 caracteres y los comodines `%` y `_` se tratan como texto.

## HU-02 · Ver la ficha de una película (RF-02)
**Como:** Socio · **Quiero:** abrir la ficha de un disco · **Para:** decidir con sinopsis, dirección, año, duración, tarifa, reparto y tráiler.
- **Dado que** está en el Catálogo, **cuando** hace clic en un disco, **entonces** se abre una ventana modal (`<dialog>`) con los datos de `GET /api/peliculas/:id` y el tráiler en un `<iframe>`.
- **Dado que** la ficha está abierta, **cuando** cambia los días de préstamo, **entonces** el subtotal se recalcula al instante.
- **Dado que** la ficha está abierta, **cuando** la cierra, **entonces** el tráiler se detiene.

## HU-03 · Armar el carrito de alquiler (RF-03)
**Como:** Socio · **Quiero:** añadir discos y elegir los días de préstamo · **Para:** conocer el total antes de confirmar.
- **Dado que** hay discos en el carrito, **cuando** cambia los días de uno (1 a 14), **entonces** el subtotal y el total se recalculan al instante.
- **Dado que** el carrito tiene discos, **cuando** recarga la página, **entonces** el carrito se conserva (`localStorage`).
- **Dado que** confirma el alquiler, **cuando** el servidor responde 201, **entonces** el carrito se vacía y los alquileres aparecen en “Mi cuenta”.
- **Validaciones:** el campo de días usa `type="number"`, `min="1"` y `max="14"`; el servidor recalcula el total con la tarifa de la base de datos.

## HU-04 · Seguir mis alquileres y multas (RF-04)
**Como:** Socio · **Quiero:** ver mi historial, lo pendiente y mis multas · **Para:** devolver a tiempo.
- **Dado que** el socio tiene un alquiler vencido, **cuando** abre “Mi cuenta”, **entonces** ve el estado “Vencido” y una multa de Bs 2.00 por cada día de atraso.
- **Dado que** tiene un alquiler pendiente, **cuando** pulsa “Devolver”, **entonces** el sistema llama a `PATCH .../devolucion` y el estado pasa a “Devuelto”.

## HU-05 · Gestionar favoritos (RF-04)
**Como:** Socio · **Quiero:** marcar discos como favoritos · **Para:** guardarlos para después.
- **Dado que** está en el Catálogo, **cuando** pulsa “Favorito”, **entonces** el disco se guarda (`PUT`) y aparece en su lista; si lo pulsa otra vez se quita (`DELETE`).

## HU-06 · Registrarme como socio
**Como:** Visitante · **Quiero:** crear mi cuenta de socio · **Para:** alquilar y guardar mi historial.
- **Dado que** abre “Registrar nuevo socio”, **cuando** envía un nombre de menos de 3 letras o un correo inválido, **entonces** el navegador lo bloquea y marca el campo.
- **Dado que** el correo ya existe, **cuando** envía el formulario, **entonces** el servidor responde 409 y se muestra el mensaje “Ya existe un socio con ese correo.”
- **Validaciones:** `required`, `minlength`, `pattern` y `type="email"`, además de la validación del servidor.

## HU-07 · Cambiar entre tema claro y oscuro
**Como:** Usuario · **Quiero:** elegir el tema · **Para:** leer cómodo de día o de noche.
- **Dado que** está en cualquier pantalla, **cuando** pulsa “Claro” u “Oscuro”, **entonces** cambia la paleta y la preferencia se mantiene al recargar.

## HU-08 · Explorar la tira 3D de discos
**Como:** Visitante · **Quiero:** recorrer los discos como una tira animada · **Para:** descubrir películas de forma visual.
- **Dado que** está en la sección Discos, **cuando** gira la rueda del ratón, arrastra o pulsa ← →, **entonces** la tira avanza un disco y el panel muestra título, dirección, año, reparto, género y tarifa del disco activo.
- **Dado que** hay un disco activo, **cuando** pulsa Espacio, **entonces** el disco se voltea y muestra el reverso; **cuando** pulsa Enter o hace clic en él, **entonces** se abre la ficha.
- **Dado que** abre el “Índice” de la barra, **cuando** elige una película, **entonces** la tira se desplaza hasta ese disco.
- **Validaciones:** si el sistema pide reducir movimiento (`prefers-reduced-motion`), los saltos son inmediatos.

## HU-09 · Usar la página sin servidor (modo demostración)
**Como:** Docente o evaluador · **Quiero:** abrir la página aunque no esté corriendo `npm start` · **Para:** revisar la interfaz rápidamente.
- **Dado que** la página se abre sin API (Live Server, GitHub Pages), **cuando** carga, **entonces** aparece el aviso “Modo demostración” y todas las funciones operan con las mismas reglas que el servidor, guardando los cambios en el navegador.
- **Dado que** está en modo demostración, **cuando** pulsa “Restablecer datos”, **entonces** vuelven los datos de ejemplo.

## HU-10 · Iniciar sesión para entrar al club
**Como:** Socio · **Quiero:** entrar con mi correo y contraseña · **Para:** que solo yo vea y use mi cuenta.
- **Dado que** no ha iniciado sesión, **cuando** entra a la página, **entonces** se le lleva a la pantalla de inicio de sesión.
- **Dado que** escribe un correo o una contraseña incorrectos, **cuando** pulsa “Entrar al club”, **entonces** ve “Correo o contraseña incorrectos.” sin saber cuál de los dos falló.
- **Dado que** no tiene cuenta, **cuando** completa “Crear cuenta” con nombre, correo y una contraseña válida repetida dos veces, **entonces** se crea su cuenta y entra directamente.
- **Dado que** está dentro, **cuando** pulsa “Cerrar sesión”, **entonces** vuelve al inicio de sesión y la página ya no se puede abrir sin entrar de nuevo.
- **Validaciones:** contraseña de 8 a 72 caracteres con letras y números; correo único; tras 8 intentos fallidos se bloquea 15 minutos; un socio no puede consultar la cuenta de otro (403).

## HU-11 · Ver la portada de cada película en su disco
**Como:** Socio · **Quiero:** ver la portada de la película impresa en el disco · **Para:** reconocerla de un vistazo.
- **Dado que** el servidor tiene configurada la clave de TMDB, **cuando** se muestra un disco, **entonces** su etiqueta lleva la portada de la película; la imagen se guarda en caché para las siguientes visitas.
- **Dado que** no hay portada disponible, **cuando** se muestra el disco, **entonces** se dibuja con los colores de la película.
- **Dado que** es administrador, **cuando** sube una imagen JPG, PNG o WebP de hasta 3 MB desde la ficha, **entonces** esa imagen reemplaza la portada en la tira, el catálogo y el carrito; “Restablecer” vuelve a la de TMDB.
- **Validaciones:** se rechazan archivos que no sean imágenes reales (se revisa su contenido) o que superen 3 MB; un socio sin rol de administrador recibe 403.
