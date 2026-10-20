# ROADMAP — Demo Le Piaf (copia del demo de Rotisería Bautista)

Agente: leé este documento completo antes de tocar nada. Es la única fuente de datos. El martes se presenta en persona al dueño.

## 0. Reglas anti-invención (obligatorias)

- Usá SOLO los datos de este documento. Si un dato falta, es ilegible o dudoso: NO lo completes ni lo "arregles". Dejalo vacío o como "Consultar" y marcalo `aConfirmar` con el motivo.
- Prohibido inventar: descripciones, ingredientes, adjetivos de marketing ("casero", "recién horneado", "artesanal", "a la piedra" salvo donde se indica), historia del local, eslóganes, reseñas, coordenadas, redes sociales, barrio o zona.
- Prohibido usar fotos de stock, fotos generadas con IA o fotos del demo de Bautista. Los productos van sin foto (ícono o tarjeta tipográfica) hasta que el dueño entregue fotos propias. Marcá "fotos: A CONFIRMAR".
- No uses los datos del demo original: nada de Bautista, Russell, Barrio AOMA, viandas, eventos, hamburpizza, teléfonos 261 344-1040 / 261 618-7995, ni sus precios.
- Trabajá en una COPIA del proyecto. No modifiques el demo original. No hagas push ni deploy.
- Si el demo usa Firebase (Firestore, Storage, Auth), NO reutilices las credenciales ni el proyecto de Bautista: el nuevo proyecto no debe leer ni escribir datos de Bautista. Dejá las variables de entorno vacías con un comentario y avisame qué hace falta crear.
- Primero leé el demo y respetá su arquitectura, componentes y estilo de interacción (carrito, buscador, secciones). Solo reemplazá datos, marca y textos. No agregues funciones nuevas salvo las pedidas en este documento.

## 1. Objetivo

Sitio de carta y pedidos online para **Le Piaf**, con la misma estructura y calidad del demo de Bautista, pero con la marca, los datos y la carta reales de Le Piaf. Debe quedar listo para mostrar en persona al dueño: él solo tiene que aceptar o no.

## 2. Datos del local

| Dato | Valor | Estado |
|---|---|---|
| Nombre | Le Piaf | confirmado (Google Maps y cartel) |
| Dirección | Ozamis y Vergara, Maipú, Mendoza | confirmado (Google Maps). Sin número ni barrio: no inventar |
| Teléfono | 0261 574-5326 (usar +54 261 574-5326 en `tel:`) | confirmado como teléfono |
| WhatsApp | mismo número | **A CONFIRMAR** si recibe WhatsApp |
| Horarios | Martes a domingo 19:00 a 01:00. Lunes cerrado | confirmado (Google Maps). Cruza medianoche: el domingo cierra a la 01:00 del lunes |
| Instagram / Facebook / web propia | — | **A CONFIRMAR**: no existen en los datos; ocultar los íconos, no poner enlaces genéricos |
| Coordenadas / mapa embebido | — | **A CONFIRMAR**: usar solo el enlace a Google Maps por dirección. Sin meta geo |

Botones de pedido: mientras el WhatsApp no esté confirmado, el botón principal es **Llamar** (`tel:`). El botón de WhatsApp y el envío del carrito por WhatsApp quedan detrás de un flag `whatsappConfirmado = false`.

La lógica de horario debe soportar turnos que cruzan medianoche y el cierre de los lunes. Fuera de horario, mostrar el estado "Cerrado" como hace el demo.

## 3. Marca

**Logo:** archivo `lepiaf-logo-texto.png` (wordmark caligráfico blanco con fondo transparente, extraído del cartel de la fachada). Copiarlo a la carpeta pública de marca del proyecto. **Solo sobre fondo oscuro.** No redibujarlo ni reemplazarlo por texto en otra tipografía. No hay logo de mascota usable (baja resolución): **A CONFIRMAR** pedir el original al dueño.

**Eslogan:** ninguno. El cartel dice "Sandwinch - Pizzas" (error de ortografía probable): no usarlo. **A CONFIRMAR.**

**Paleta** (aproximada, tomada de fotos; marcar `aConfirmar`):

| Uso | Color |
|---|---|
| Fondo principal | `#17181B` (negro grafito de la fachada) |
| Superficies/tarjetas | `#23272D` (pizarra de la carta) |
| Acento / títulos de sección | `#F0A050` (naranja de la carta) |
| Nombres de producto / destacados | `#E6C84B` (amarillo de la carta) |
| Texto | `#E9E9EC` (blanco tiza) |

No usar rojo. Contraste mínimo AA en todo texto.

**Tipografías** (Google Fonts, por semejanza con la carta; no son las originales):

- Títulos de sección: **Barlow Condensed** ExtraBold Italic, mayúsculas.
- Nombres de producto y texto: **Barlow Condensed** SemiBold / Barlow Regular para descripciones largas.
- Precios: dentro de una etiqueta blanca redondeada con texto oscuro (recuerda las etiquetas de la carta física), tipografía Barlow Condensed Bold. Opcional: **Patrick Hand** solo en la etiqueta.

**Rubros del cartel de la fachada (usar como lista de rubros del hero):** Pizza a la piedra, Hamburguesas, Panchos, Calzones, Carlitos, Empanadas, Lomos, Lomo Pizza.

## 4. Textos permitidos (copiar tal cual)

- Hero: logo + línea "Pizzas, lomos, hamburguesas, calzones y más en Maipú."
- Botones: "Llamar" y "Ver carta". Cuando el WhatsApp se confirme: "Pedir por WhatsApp".
- Horario: "Martes a domingo · 19:00 a 01:00 · Lunes cerrado".
- Dirección: "Ozamis y Vergara, Maipú, Mendoza" con enlace a Google Maps por dirección.
- Pie: "Desarrollado por DelgadoDev" enlazando a https://delgadodev.com.ar (igual que el demo).
- Título SEO sugerido (≤ 60 caracteres): "Le Piaf | Pizzas, Lomos y Hamburguesas en Maipú". Descripción: "Carta y pedidos de Le Piaf. Ozamis y Vergara, Maipú, Mendoza. Martes a domingo de 19 a 01 h."
- Cualquier otro texto: neutro y descriptivo, sin adjetivos. Ante la duda, no escribir.

## 5. Carta completa

Orden de categorías en pantalla: Promos, Pizzas, Lomos, Hamburguesas, Calzones, Tostados, Panchos, Empanadas, Picadas, Papas fritas, Menú del día.

Aviso: todos los precios vienen de etiquetas manuscritas de una foto del 29/08/2026 y pueden haber cambiado. En las pizzas, los precios se asignaron por orden de arriba hacia abajo: verificar contra la carta física. Los ingredientes son los textuales de la carta; no agregar ni quitar.

### Pizzas

| Producto | Ingredientes (textual) | Precio | Estado |
|---|---|---|---|
| Mozzarella | masa, salsa, mozzarella, orégano, aceitunas | $ 11.000 | ok |
| Doble queso | masa, salsa, doble mozzarella, orégano, aceitunas | $ 11.500 | ok |
| Especial | masa, salsa, mozzarella, jamón cocido, orégano, aceitunas | $ 12.000 | ok |
| Napolitana | masa, mozzarella, rodajas de tomate natural, orégano, aceitunas | $ 11.500 | ok |
| Tres quesos | masa, salsa de tomate, provolone, parmesano, mozzarella, orégano, aceitunas | $ 11.000 | **A CONFIRMAR:** precio $11.000 igual al de la mozzarella, parece raro |
| Fugazzeta | masa, salsa de tomate, cebolla salteada, mozzarella, orégano, aceitunas | $ 12.500 | ok |
| Con huevo | masa, salsa de tomate, mozzarella, huevo, orégano, aceitunas | $ 13.000 | **A CONFIRMAR:** etiqueta de precio cortada en la foto (se lee 13.000) |
| Viena | masa, salsa de tomate, mozzarella, salchichas, orégano, aceitunas | $ 12.500 | **A CONFIRMAR:** etiqueta de precio cortada en la foto (se lee 12.500) |
| Super especial | masa, salsa de tomate, mozzarella, jamón cocido, morrones, anchoas, orégano, aceitunas | $ 14.000 | ok |
| Palmitos | masa, salsa de tomate, mozzarella, palmitos, salsa golf, orégano, aceitunas | $ 13.000 | ok |
| Tropical | masa, salsa de tomate, mozzarella, jamón, ananá, palmitos, salsa golf, orégano, aceitunas | $ 14.500 | ok |
| Albahaca | masa, salsa de tomate, mozzarella, albahaca, orégano, aceitunas | $ 12.000 | ok |
| Napolitana con jamón | masa, salsa de tomate, mozzarella, jamón cocido, rodajas de tomate natural, orégano, aceitunas | $ 13.500 | ok |
| Especial Le Piaf | masa, salsa de tomate, mozzarella, jamón cocido, palmitos, champignones, orégano, aceitunas | $ 14.500 | ok |
| Calabresa | masa, salsa de tomate, mozzarella, rodajas de salame, orégano, aceitunas | $ 14.500 | ok |
| Pizza de morrones | masa, salsa de tomate, mozzarella, morrones rojos y verdes, orégano, aceitunas | $ 15.000 | ok |

### Lomos

| Producto | Ingredientes (textual) | Precio | Estado |
|---|---|---|---|
| Completo | pan árabe, aderezos, tomate, lechuga, lomo, jamón, queso | $ 25.000 | ok |
| Lomo especial | pan árabe, aderezos, cebolla salteada, pimiento morrón, tomate, lomo, jamón, queso | $ 26.000 | ok |
| Lomo Le Piaf | pan árabe, mayonesa casera, cebolla salteada, panceta, tomate, lomo, queso | $ 27.000 | ok |
| Lomo individual | a elección: completo, especial o Le Piaf | $ 19.500 | ok |

### Hamburguesas

| Producto | Ingredientes (textual) | Precio | Estado |
|---|---|---|---|
| Hamburguesa común | pan árabe, aderezos, tomate, lechuga, hamburguesa, jamón, queso | $ 7.500 | ok |
| Super hamburguesa | pan de hamburguesa o árabe, aderezos, tomate, lechuga, hamburguesa, jamón, queso | $ 11.000 | ok |

### Calzones

_Entero y medio_

| Producto | Ingredientes (textual) | Precio | Estado |
|---|---|---|---|
| Calzone de pollo | masa cerrada, mozzarella, pollo, pimiento morrón, jamón cocido, huevo, aceitunas | $ 23.500 (entero) / $ 14.500 (medio) | ok |
| Calzone cuatro quesos | masa cerrada, mozzarella, parmesano, roquefort, sardo, pimiento morrón, huevo, aceitunas | $ 23.000 (entero) / $ 13.500 (medio) | ok |
| Calzone napolitano | masa cerrada, tomate natural, mozzarella, jamón cocido, huevo, aceitunas | $ 22.500 (entero) / $ 13.500 (medio) | ok |
| Calzone atún | masa cerrada, atún, mozzarella, jamón cocido, aceitunas | $ 21.500 (entero) / $ 13.500 (medio) | ok |
| Calzone calabresa | masa cerrada, salame, mozzarella, pimiento morrón, huevo, aceitunas | $ 23.000 (entero) / $ 14.500 (medio) | ok |
| Lomo pizza | masa cerrada, carne de lomo, tomate natural, mozzarella, jamón cocido, huevo, aceitunas | $ 36.000 (entero) / $ 24.000 (medio); gratinado $ 40.000 / medio gratinado $ 28.000 | ok |

### Tostados

| Producto | Ingredientes (textual) | Precio | Estado |
|---|---|---|---|
| Barroluco | pan de miga, lechuga, tomate, lomo doble, jamón, queso, huevo, aderezos, aceitunas | $ 32.000 | **A CONFIRMAR:** en promos figura como 'Barroloco'; confirmar ortografía |
| Barroluco gratinado | pan de miga, lechuga, tomate, jamón, queso, huevo, aderezos, aceitunas, gratinado de queso | $ 35.000 | **A CONFIRMAR:** la carta no lista lomo en este; en promos figura como 'Barroloco' |
| Carlito simple | pan de miga, jamón, queso, aderezos | $ 6.500 | **A CONFIRMAR:** etiqueta manuscrita borrosa (se lee 6.500) |
| Carlito triple | pan de miga, jamón, queso, aderezos | $ 8.500 | **A CONFIRMAR:** misma descripción que Carlito simple; confirmar diferencia |
| Carlito napolitano | pan de miga, queso, tomate al natural en rodajas, aderezos | $ 8.000 | ok |
| Carlito primavera | pan de miga, lechuga, tomate, jamón, queso, aderezos | $ 10.000 | ok |

### Panchos

| Producto | Ingredientes (textual) | Precio | Estado |
|---|---|---|---|
| Común | masa cerrada, salchicha, aderezos | $ 2.500 | ok |
| Especial | masa cerrada, salchicha, aderezos; a elección: jamón y queso, cuatro quesos, napolitano o fugazzeta | $ 3.500 | ok |

### Empanadas

| Producto | Ingredientes (textual) | Precio | Estado |
|---|---|---|---|
| Carne cortada a cuchillo | (sin descripción en la carta: dejar vacío) | $ 14.000 | **A CONFIRMAR:** no se sabe si es la empanada de carne; sin etiqueta propia |
| Jamón y queso | (sin descripción en la carta: dejar vacío) | $ 14.000 | ok |
| Caprese | (sin descripción en la carta: dejar vacío) | $ 14.000 | ok |

### Picadas

| Producto | Ingredientes (textual) | Precio | Estado |
|---|---|---|---|
| Tradicional | jamón, queso, aceitunas | $ 10.000 | ok |
| Especial | jamón, queso, jamón crudo, salame, aceitunas | $ 14.000 | ok |
| Escabeche | pollo, berenjena, lengua (a elección) | — | **A CONFIRMAR:** sin precio visible; son 3 opciones (pollo, berenjena, lengua) |

### Papas fritas

| Producto | Ingredientes (textual) | Precio | Estado |
|---|---|---|---|
| Porción chica | (sin descripción en la carta: dejar vacío) | $ 5.500 | ok |
| Porción mediana | (sin descripción en la carta: dejar vacío) | $ 6.500 | ok |
| Porción grande | (sin descripción en la carta: dejar vacío) | $ 8.000 | ok |
| Papas Le Piaf | papas, jamón, queso, huevo frito | $ 12.000 | ok |
| Papas con cheddar | panceta, huevo, cheddar | $ 12.000 | ok |

### Menú del día

_Todas las opciones incluyen la guarnición indicada; precio único por día_

| Producto | Ingredientes (textual) | Precio | Estado |
|---|---|---|---|
| Lunes | milanesa con ensalada o papas; tartas de jamón y queso, pollo o espinaca (guarnición: arroz primavera, ensalada o zanahoria glaseada) | $ 13.000 | **A CONFIRMAR:** único día a $13.000; el menú parece de mediodía y el horario es nocturno |
| Martes | milanesa con ensalada o papas; merluza a la romana con papas; filet de gatuzo a la manteca negra con panache de vegetales | $ 10.000 | **A CONFIRMAR:** horario de servicio (¿mediodía?) |
| Miércoles | milanesa con ensalada o papas; balotines de pollo con escalivada de verduras; cuarto de pollo al horno con papas | $ 10.000 | **A CONFIRMAR:** horario de servicio (¿mediodía?) |
| Jueves | milanesa con ensalada o papas; canelones de espinaca con salsa blanca o bolognesa; lasagna de jamón y queso con bolognesa | $ 10.000 | **A CONFIRMAR:** horario de servicio (¿mediodía?) |
| Viernes | milanesa con ensalada o papas; matambre a la pizza con ensalada o papas; colita de cuadril mechada con ensalada o papas | $ 10.000 | **A CONFIRMAR:** horario de servicio (¿mediodía?) |
| Sábado | milanesa con ensalada o papas; bondiola a la mostaza con batatas aplastadas; costeleta de cerdo a la riojana | $ 10.000 | **A CONFIRMAR:** horario de servicio (¿mediodía?) |

Notas de interfaz: calzones con selector Entero / Medio (y gratinado en Lomo pizza); Panchos Especial y Lomo individual con selector de variante; Escabeche con selector pollo / berenjena / lengua y precio "Consultar"; Empanadas sin unidad de venta visible hasta confirmar (**A CONFIRMAR:** ¿por docena o por unidad?). Usar el mecanismo de variantes del demo si existe.

Papas fritas: chica $5.500, mediana $6.500, grande $8.000, Papas Le Piaf $12.000 (papas, jamón, queso, huevo frito), Papas con cheddar $12.000 (panceta, huevo, cheddar). No agregar "cheddar opcional" a otros productos: no figura en la carta.

## 6. Promociones

Nombres y precios textuales de la lámina de promos. No inventar contenido de cada combo.

| Promo | Precio | Estado |
|---|---|---|
| Lomo pizza gratinado + papas | $ 44.000 | ok |
| Lomo pizza + papas | $ 37.000 | ok |
| Barroluco gratinado + papas | $ 38.000 | **A CONFIRMAR:** la lámina lo escribe "Barroloco" |
| Lomo + papas | $ 28.000 | ok |
| 2 lomos + 2 papas | $ 50.000 | ok |
| 3 lomos + 3 papas | $ 71.000 | ok |
| 2 super hamburguesas + papas | $ 24.000 | **A CONFIRMAR:** la lámina dice "2 Super + Papas" |
| Lomo individual + papas | $ 17.000 | **A CONFIRMAR:** $17.000 es menos que el lomo individual solo ($19.500) |
| Muzza + papas | $ 14.000 | ok |
| Especial + papas | $ 15.000 | ok |

**A CONFIRMAR (todas las promos):** tamaño de las papas, la lámina solo dice "Papas".

## 7. Modo revisión (para la presentación del martes)

En los datos, cada campo dudoso lleva `aConfirmar: "motivo"`. En la web pública no se ve nada. Con `?revision=1` en la URL, mostrar junto a cada ítem marcado una etiqueta discreta "A CONFIRMAR" con el motivo, para repasarlo con el dueño en persona.

## 8. Antes de entregar

1. Buscá en todo el proyecto restos del demo original: Bautista, Russell, AOMA, viandas, eventos, hamburpizza, `2613441040`, `2616187995`, `-33.0056`, el bucket de Firebase de Bautista, enlaces genéricos a instagram.com / facebook.com. No debe quedar ninguno.
2. Revisá que no haya ninguna foto de stock o de Bautista.
3. Respondé con: a) qué archivos cambiaste, b) lista completa de ítems `aConfirmar` con su motivo, c) qué datos faltaron y NO inventaste, d) qué credenciales/entorno hay que crear (si usa Firebase).
