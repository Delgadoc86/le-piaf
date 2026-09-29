# Silverio: cliente piloto (kit de personalización)

Todo lo que hace falta para que la web de Silverio (repo `silverio-club`) se vea y se lea como la actual, pero mejor. Es el **kit del local**: en una copia del repo para otro local, esta carpeta se reemplaza (ROADMAP §16).
Extraído del proyecto viejo (React + Vite + Firebase, repo `Silverio-FoodTruck`) el 2026-09-28.

- Datos estructurados (local, marca, categorías, productos, promos): [`seed.json`](seed.json)
- Imágenes: [`assets/`](assets/)

> ⚠️ Los precios y productos son de **abril 2025**. Se usan para desarrollar y probar; antes de publicar, el dueño tiene que revisarlos desde el panel.

---

## 1. Identidad visual

| Token | Valor | Uso en la web vieja |
|---|---|---|
| Primario | `#f59716` | Botones, títulos de sección, precios, bordes, íconos |
| Primario hover | `#e08512` | Hover de botones |
| Fondo | `#000000` | Fondo general, hero, menú, footer |
| Superficie | `#1e1e1e` | Tarjetas de categoría del menú |
| Superficie alternativa | `#121212` | Sección Nosotros |
| Navbar | `#1D1D1D` | Barra superior |
| Texto | `#FFFFFF` | |
| Texto secundario | `#CCCCCC` / `#d0d0d0` | Párrafos |
| Texto tenue | `#AAAAAA` | Descripción de productos |
| WhatsApp | `#25D366` / hover `#128C7E` | Botones de pedido |

**Tipografías:** títulos en **Sriracha** (manuscrita, le da la personalidad) y texto en **Roboto**. En Next.js usar `next/font/google`.

**Lenguaje visual que vale la pena conservar:**
- Tema oscuro con acentos naranja.
- **Líneas degradadas naranja** (transparente → `#f59716` → transparente) de 3–5 px arriba y abajo de las secciones. Es la firma visual del sitio.
- Títulos de sección con **"overline"** en naranja y mayúsculas espaciadas ("NUESTRAS DELICIAS", "OFERTAS ESPECIALES"), título grande en Sriracha y una **barrita naranja** de 80×4 px debajo.
- Hero a pantalla completa con foto de fondo (una versión para PC y otra para móvil) y una caja central translúcida (`rgba(0,0,0,.65)` con blur).
- Botón principal redondeado (pill) naranja con **animación pulse**.
- Tarjetas con `border-radius: 12–15px` y borde izquierdo naranja de 5 px en las categorías del menú.
- Chip "OFERTA" naranja en las promos.

**A mejorar en la nueva:**
- Contraste accesible en textos grises.
- Que el hero no tape el contenido en móvil (hoy usa `marginTop: 40vh`).
- Fotos por producto.
- Carrusel de promos táctil (swipe).

## 2. Imágenes

| Archivo | Uso |
|---|---|
| `assets/marca/logo.webp` | Logo en navbar (50 px de alto) y footer (70 px) |
| `assets/marca/logo.svg` | Favicon |
| `assets/marca/logo.png` | Imagen para compartir en redes (og:image). Conviene generar una de 1200×630 px |
| `assets/fotos/heropc.webp` | Fondo del hero en escritorio |
| `assets/fotos/heromovil.webp` | Fondo del hero en móvil |
| `assets/fotos/foodtruck.webp` | Nosotros: "Nuestro food truck en acción" |
| `assets/fotos/cerveza.webp` | Galería: "Cerveza Tirada" |
| `assets/fotos/plato.webp` | Galería: "Comidas al Plato" |
| `assets/fotos/lomo.webp` | Galería: "Nuestros Lomos" |
| `assets/promos/*.webp` | Fotos de las 5 promos actuales |

**Falta:** fotos del **local físico** nuevo (fachada, salón, barra) y fotos individuales de los productos.

## 3. Textos (literales de la web actual)

### Hero
- Bajada: **FOOD TRUCK & BEER**
- Título: **SILVERIO**
- Botón: **Ver Promos** (lleva a la sección de promos)

### Promociones
- Overline: **OFERTAS ESPECIALES**
- Título: **Promociones**
- Bajada: *Aprovecha nuestras ofertas exclusivas y disfruta de la mejor experiencia gastronómica al mejor precio*
- Vacío: *No hay promociones disponibles en este momento.*
- Botón de cada promo: **Pedir por WhatsApp**

### Menú
- Overline: **NUESTRAS DELICIAS**
- Título: **Menú**
- Bajada: *Descubre nuestra selección de platos y bebidas preparados con ingredientes frescos y el mejor sabor callejero.*
- Nota al pie: *\*Consultar por delivery, según zona y disponibilidad. Los precios están sujetos a disponibilidad.*
- Sin precio: **Consultar**

### Nosotros ("Nuestra Historia")
- **Nuestros Inicios**
  - *En **Silverio Food Truck Beer**, sabemos que la buena comida y una cerveza bien fría hacen la combinación perfecta. Hace más de cuatro años, comenzamos este camino con esfuerzo, dedicación y una meta clara: ofrecer a nuestros clientes una experiencia gastronómica única en **Rodeo del Medio, Maipú**.*
  - *Desde el primer día, apostamos por la calidad, la atención y el compromiso con quienes nos eligen. Gracias a ustedes, hemos crecido, mejorado y perfeccionado cada plato, manteniendo siempre ese toque casero y auténtico que nos caracteriza.*
- Pie de la foto: *Nuestro food truck en acción*
- Frase: *Hoy somos **"el food truck más completo para los fans de la comida"***
- Tarjetas:
  | Título | Texto |
  |---|---|
  | Cerveza Tirada | Disfruta de nuestras cervezas artesanales tiradas a la temperatura perfecta. |
  | Comidas al Plato | Variedad de platos abundantes ideales para compartir con amigos. |
  | Sabor Único | Cada plato mantiene nuestro toque casero y auténtico que nos distingue. |
  | 4+ Años | Más de cuatro años de experiencia sirviendo a nuestra comunidad. |
- Galería "Nuestra Experiencia": Cerveza Tirada / Comidas al Plato / Nuestros Lomos
- Cierre: *"Queremos seguir siendo parte de sus reuniones y noches especiales por muchos años más. ¡Nos vemos en **Silverio Food Truck Beer** para disfrutar juntos del buen sabor!"*

> 📝 **Actualizar para el local:** la historia tiene que contar el salto del food truck al local propio. Los "4+ años" se calculan desde el inicio (aprox. 2020–2021, confirmar el año exacto) y ya serían más de 5.

### Navegación y footer
- Menú superior: Inicio · Menú · Promos · Ubicación
- Footer: ENLACES (Inicio, Menú, Promociones) · SÍGUENOS · botón **Cómo llegar**
- Copyright: *© {año} Silverio Food Truck. Todos los derechos reservados.*
- Crédito: *Desarrollado por **DelgadoDev*** → https://delgadodev-rho.vercel.app. Se mantiene en la web nueva: funciona como marketing para vender la web a otros locales.

### Mensajes de WhatsApp
- Botón flotante: `Hola, quiero hacer un pedido.`
- Promo: `¡Hola Silverio! Me interesa la promo "{nombre}" Precio: ${precio}. ¿Está disponible ahora?`

## 4. Contacto, redes y ubicación

| Dato | Valor |
|---|---|
| WhatsApp | +54 9 261 636-7525 (`5492616367525`) |
| Instagram | https://www.instagram.com/silveriofoodtruckbeer/ |
| Facebook | https://www.facebook.com/profile.php?id=61567065565366 |
| Dirección (local nuevo) | Sarmiento 119, Barrio Don Bosco, Rodeo del Medio, Maipú, Mendoza (CP M5529) |
| Google Maps | https://maps.app.goo.gl/1uZXpRn4AbtLRx4u7 (ficha "Silverio club") |
| Coordenadas | -32.992325, -68.6892759 |
| Dirección anterior (food truck) | Juan Isidro Maza 826, Rodeo del Medio (CP M5519): ya no se usa |
| Horarios (footer) | Lunes a Viernes 11:00–02:00 · Sábados y Domingos 11:00–03:00 |

## 5. SEO y analítica

- **Title:** `Silverio Food Truck Beer - Comida Casera y Cerveza Artesanal en Rodeo del Medio, Maipú`
- **Description:** `Silverio Food Truck Beer: Más de cuatro años ofreciendo comida casera y cerveza artesanal en Rodeo del Medio, Maipú. Disfruta de nuestros platos únicos y cerveza tirada.`
- **OG description:** `Disfruta de la mejor comida y cerveza artesanal en Rodeo del Medio, Maipú. Más de cuatro años de experiencia y sabor único.`
- **Keywords:** Silverio Food Truck, comida casera, cerveza artesanal, Rodeo del Medio, Maipú, food truck, promociones, menú
- **URL actual:** https://silverio-food-truck.vercel.app/
- **Google Analytics 4:** `G-8CN2SBDQ5R` (mantener el mismo ID para no perder el historial)
- **Schema.org:** hoy usa `LocalBusiness`. En la nueva conviene `Restaurant` con `servesCuisine`, `priceRange`, `menu` (URL de la carta), `hasMap`, `openingHoursSpecification` correcta y `acceptsReservations`.

## 6. Carta actual (resumen; el detalle está en seed.json)

**Orden de categorías:** Viandas → Hamburguesas → Lomos → Pizzas → Empanadas → Pollos → Choripán → Panchos → Papas → Bebidas.
Solo 6 tienen productos cargados: 12 productos y 5 promos.

**Mejoras del modelo:**
- Los precios eran strings (`"11.000"`) y pasan a enteros (`11000`).
- Las milanesas "napo o a caballo" pasan a **variantes** de un mismo producto.
- Las **viandas** eran productos llamados "Lunes", "Martes", etc. Pasan a producto con disponibilidad por día de la semana.
- Las promos eran solo título y precio. Pasan a vincularse con productos, con días y horarios de vigencia.

## 7. Pendiente de confirmar con el dueño (antes de la Fase 1)

- [ ] Dirección, coordenadas y link de Maps del **local físico**.
- [ ] ¿El food truck sigue funcionando? ¿En qué días y dónde? (Podría ser un "segundo punto de venta").
- [ ] Horarios reales del local (hoy hay datos contradictorios).
- [ ] Carta completa y **precios actualizados**; bebidas y cervezas (hoy no hay ninguna cargada).
- [ ] Fotos del local y de los productos.
- [ ] Cantidad de mesas y zonas del salón (barra, patio, etc.).
- [ ] ¿Hace delivery? ¿A qué zonas y a qué costo? ¿Pedido mínimo?
- [ ] Medios de pago: efectivo, transferencia (alias/CBU), Mercado Pago (¿tiene cuenta?).
- [ ] ¿Quiénes usan el sistema? (dueño, encargado, mozos, cocina) con sus emails.
- [ ] Dominio: ¿seguir en `silverio-food-truck.vercel.app` o comprar `silverio.com.ar` o similar?
- [ ] Acuerdo como **cliente fundador**: condiciones, precio bonificado y uso como caso de éxito.
