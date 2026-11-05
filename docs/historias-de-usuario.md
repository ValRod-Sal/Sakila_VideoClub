# Historias de usuario — Club Sakila (Plantilla A)

## HU-01 · Buscar y filtrar películas (RF-01)
**Como:** Socio · **Quiero:** buscar por título o reparto y filtrar por categoría y clasificación · **Para:** encontrar rápido qué alquilar.
- **Dado que** el usuario está en el Catálogo, **cuando** escribe “penelope” en el buscador, **entonces** el sistema consulta `GET /api/peliculas?q=penelope` y muestra solo los discos cuyo título o reparto coincide.
- **Dado que** está en el Catálogo, **cuando** elige categoría “Terror” y clasificación “R”, **entonces** se muestran solo los discos que cumplen ambos filtros, con el contador actualizado.
- **Dado que** ningún disco coincide, **cuando** termina la búsqueda, **entonces** aparece un mensaje que sugiere cambiar los filtros.
- **Validaciones:** la búsqueda se limita a 60 caracteres y los comodines `%` y `_` se tratan como texto.

## HU-02 · Ver la ficha de una película (RF-02)
**Como:** Socio · **Quiero:** abrir la ficha de un disco · **Para:** decidir con sinopsis, año, duración, tarifa, reparto y tráiler.
- **Dado que** está en el Catálogo, **cuando** hace clic en un disco, **entonces** se abre una ventana modal (`<dialog>`) con los datos de `GET /api/peliculas/:id` y el tráiler en un `<iframe>`.
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
