# Silverio Club: roadmap y especificación técnica

> Web + sistema de gestión gastronómica tipo "semi-FUDO" para **un** local.
> **Este repo es la web de Silverio Food Truck Beer** (ver [`silverio/SILVERIO.md`](silverio/SILVERIO.md)) **y la base que se copia para cada local nuevo**: un repo, un proyecto de Firebase y un proyecto de Vercel por local (ver [§16](#16-cómo-crear-la-web-de-un-local-nuevo)).
> **Objetivo:** que funcione de verdad en Silverio y después venderla a otros locales con un abono mensual.

Versión del documento: 1.7, del 2026-09-29.

---

## Índice

1. [Visión y alcance](#1-visión-y-alcance)
2. [Decisiones técnicas](#2-decisiones-técnicas)
3. [Arquitectura](#3-arquitectura)
4. [Estructura del repositorio](#4-estructura-del-repositorio)
5. [Modelo de datos (Firestore)](#5-modelo-de-datos-firestore)
6. [Roles y permisos](#6-roles-y-permisos)
7. [Reglas de seguridad](#7-reglas-de-seguridad)
8. [Cloud Functions](#8-cloud-functions)
9. [Rutas de la app](#9-rutas-de-la-app)
10. [Rendimiento y costos](#10-rendimiento-y-costos)
11. [Convenciones](#11-convenciones)
12. [Fases del roadmap](#12-fases-del-roadmap)
13. [Planes comerciales](#13-planes-comerciales)
14. [Riesgos](#14-riesgos)
15. [Entornos, variables y deploy](#15-entornos-variables-y-deploy)
16. [Cómo crear la web de un local nuevo](#16-cómo-crear-la-web-de-un-local-nuevo)

---

## 1. Visión y alcance

**Problema:** el local chico o mediano está entre dos opciones. Por un lado, "carta QR + WhatsApp", que es desordenada y no da números. Por otro, un POS completo como Fudo o Maxirest, que es caro, complejo y del que usa el 20%.

**Propuesta:** una web propia del local, hecha a su medida, con carta, pedidos online **sin comisión**, salón y cocina, caja y reportes. Cada local tiene **su propia copia** del sistema: su diseño, su dominio, su base de datos y su factura de Firebase.

### Dentro del alcance
- Web pública del local con su marca y carta digital con QR.
- Pedidos online: take away, delivery y en mesa.
- Panel de pedidos en tiempo real y pantalla de cocina.
- Mesas y app de mozo (PWA).
- Caja por turnos y reportes de ventas.
- Cobro con efectivo, transferencia y Mercado Pago (cuenta del local).
- **Plantilla replicable:** la web de un local nuevo se arma copiando este repo, en menos de un día.

### Fuera del alcance (explícito)
- ❌ Facturación electrónica ARCA/AFIP.
- ❌ Stock por insumos o recetas (a lo sumo, stock simple por producto, más adelante).
- ❌ Integración con PedidosYa o Rappi.
- ❌ Apps nativas en tiendas: todo es web/PWA.
- ❌ Plataforma multi-local (muchos locales en un mismo deploy), alta autoservicio y cobro de suscripciones dentro de la app.

---

## 2. Decisiones técnicas

| Capa | Elección | Motivo |
|---|---|---|
| Modelo | **Un repo, un Firebase y un Vercel por local** | Aislamiento total entre clientes, diseño 100 % a medida, cada local paga su consumo |
| Framework | **Next.js** (última estable, App Router) | SSR/cache para SEO de la carta, API routes, `next/image`, `next/og` |
| Lenguaje | **TypeScript** estricto | Tipos compartidos entre app y Cloud Functions |
| UI | **Tailwind CSS** + **shadcn/ui** (Radix) + **lucide-react** | La marca se aplica con variables CSS; bundle liviano para la carta en celulares |
| Formularios | react-hook-form + **zod** | Los mismos esquemas zod validan en el front y en las Functions |
| Estado cliente | **zustand** (carrito, UI) | Chico y simple; los datos de Firestore se leen con hooks propios |
| Backend | **Firebase**: Auth, Firestore, Storage, Cloud Functions (2ª gen), App Check | Tiempo real nativo, cache offline para el panel, ya conocido |
| Pagos | **Mercado Pago** Checkout Pro con las credenciales **del local** | Estándar en Argentina; al ser un proyecto por local, no hace falta OAuth |
| Hosting | **Vercel** (web) + Firebase (Functions) | Deploy directo de Next.js |
| Paquetes | **pnpm** workspaces | App, Functions y paquete compartido en un solo repo |
| Tests | **Vitest**, **@firebase/rules-unit-testing** (emuladores), **Playwright** (e2e desde Fase 2) | Las reglas de seguridad se testean sí o sí |
| Calidad | ESLint + Prettier + GitHub Actions (lint, typecheck, tests de reglas) | |
| Fechas | `Intl` (en `packages/shared/horarios.ts`); date-fns si hace falta más | Zona horaria del local (Argentina) |
| Gráficos | Recharts | Reportes (Fase 4) |
| Otros | `qrcode` (QRs), `browser-image-compression` (fotos → webp), `@dnd-kit` (ordenar), `xlsx`/SheetJS (exportar), `@serwist/next` (PWA) | |

> **Por qué no MUI (como en el proyecto viejo):** con Tailwind y variables CSS la marca y el diseño de cada copia se cambian fácil, y la carta pública carga mucho más rápido en celular.

---

## 3. Arquitectura

```
                        ┌──────────────────────────────────────────┐
  Cliente final  ──────▶│  Next.js en Vercel (un deploy por local) │
  (celular)             │  /          web + carta (Server Comp.    │
                        │             + cache con revalidación)    │
                        │  /checkout  (client island)              │
  Staff          ──────▶│  /panel/…   (client, realtime)           │
  (PWA mozo/cocina)     └───────┬───────────────┬──────────────────┘
                     Admin SDK  │               │  Firebase JS SDK
                    (lecturas   │               │  (Auth, onSnapshot,
                     públicas)  ▼               ▼   Storage)
                        ┌──────────────────────────────────────────┐
                        │  Firebase (un proyecto por local)        │
                        │  Auth · Firestore · Storage · App Check  │
                        │  Cloud Functions:                        │
                        │   - crearPedido (callable, recalcula $)  │
                        │   - triggers: stats, claims, revalidate  │
                        │   - webhook Mercado Pago                 │
                        └───────┬──────────────────────────────────┘
                                ▼
                        Mercado Pago (cuenta DEL LOCAL)
```

### Principios
1. **El cliente final nunca escribe precios.** Los pedidos se crean solo desde la Function `crearPedido`, que recalcula todo desde la base.
2. **La web pública no lee Firestore en cada visita.** Next.js lee con el Admin SDK, cachea por etiqueta y una Function invalida la cache cuando cambia la carta.
3. **Un local por proyecto.** No hay `locales/{id}`: todo cuelga de la raíz de Firestore. El aislamiento entre clientes lo da tener proyectos separados; dentro del proyecto, las reglas separan lo público del staff según el rol.
4. **Los agregados se calculan en el servidor.** Los reportes leen un documento por día (`statsDiarias`), nunca todos los pedidos.
5. **Dinero en pesos enteros** (`number`, sin decimales).

---

## 4. Estructura del repositorio

```
silverio-club/
├─ CLAUDE.md                     # instrucciones para Claude Code
├─ ROADMAP.md                    # este documento
├─ silverio/                     # KIT del local: seed.json, assets/, SILVERIO.md (en una copia, se reemplaza)
├─ pnpm-workspace.yaml
├─ firebase.json  .firebaserc     # .firebaserc: alias dev/prod del proyecto de este local
├─ firestore.rules  firestore.indexes.json  storage.rules
├─ apps/
│  └─ web/                       # Next.js
│     └─ src/
│        ├─ app/
│        │  ├─ page.tsx                        # web pública: hero, promos, carta, nosotros, ubicación (Fase 1)
│        │  ├─ layout.tsx                      # marca (CSS vars, fuente), SEO
│        │  ├─ (auth)/login/
│        │  ├─ carta/page.tsx
│        │  ├─ checkout/page.tsx
│        │  ├─ pedido/[token]/page.tsx         # seguimiento
│        │  ├─ mesa/[mesaId]/page.tsx          # entrada por QR de mesa
│        │  ├─ opengraph-image.tsx  sitemap.ts  robots.ts
│        │  ├─ panel/
│        │  │  ├─ page.tsx                     # resumen del día
│        │  │  ├─ pedidos/  cocina/  salon/  caja/
│        │  │  ├─ carta/  promos/  mesas/  zonas/
│        │  │  ├─ reportes/  clientes/
│        │  │  └─ configuracion/  equipo/
│        │  └─ api/revalidate/route.ts
│        ├─ components/
│        │  ├─ ui/                              # shadcn
│        │  ├─ publico/                         # Hero, CartaLista, PromoCarrusel… (lo que más se personaliza por local)
│        │  └─ panel/                           # BarraLateral, KanbanPedidos, TicketImprimible…
│        ├─ features/                           # lógica por dominio (hooks + servicios)
│        │  ├─ carta/  pedidos/  salon/  caja/  reportes/  auth/  panel/
│        ├─ lib/
│        │  ├─ firebase/client.ts               # SDK cliente (singleton, cache persistente)
│        │  ├─ firebase/admin.ts                # Admin SDK (solo servidor)
│        │  ├─ local.ts                         # datos fijos del local desde .env (nombre)
│        │  └─ utils.ts
│        └─ app/globals.css
├─ functions/
│  └─ src/
│     ├─ index.ts  opciones.ts   # opciones.ts: región southamerica-east1
│     ├─ pedidos/  pagos/  stats/  auth/  cache/  util/
├─ packages/
│  └─ shared/
│     └─ src/
│        ├─ tipos.ts             # tipos del dominio
│        ├─ esquemas.ts          # zod
│        ├─ dinero.ts            # formatARS, redondeos
│        ├─ horarios.ts          # estaAbierto(local, fecha)
│        ├─ precios.ts           # calcularItem, calcularPedido (usado en front Y en Function)
│        └─ constantes.ts        # estados, roles, DOC_LOCAL
├─ scripts/
│  ├─ seed.ts                    # carga el kit del local (silverio/) en el emulador o el proyecto elegido
│  └─ subir-assets.ts            # sube <kit>/assets/** a Storage (imagenes/)
└─ tests/
   ├─ reglas/                    # tests de firestore.rules y storage.rules
   └─ e2e/                       # Playwright
```

---

## 5. Modelo de datos (Firestore)

Notación: `coleccion/{id}` → campos. `ts` = `Timestamp`. `$` = entero en pesos. Todo cuelga de la raíz: **un proyecto = un local**.

### Local y equipo

```ts
local/datos                              // documento único (DOC_LOCAL en packages/shared)
  nombre, nombreCorto, bajada?, descripcionCorta
  activo: boolean                         // false → la web muestra "Volvemos pronto"
  zonaHoraria: "America/Argentina/Mendoza"
  contacto: { whatsapp, telefono?, email?, instagram?, facebook?, tiktok? }
  direccion: { calle, localidad, departamento, provincia, cp, pais, geo: {lat,lng}, googleMapsUrl }
  horarios: { dias: number[], desde: "HH:mm", hasta: "HH:mm" }[]   // "hasta" < "desde" = cruza medianoche
  cierresEspeciales?: { fecha: "YYYY-MM-DD", motivo }[]
  marca: {
    colorPrimario, colorPrimarioHover, colorFondo, colorSuperficie,
    colorTexto, colorTextoSecundario,
    fuenteTitulos: FuenteId, fuenteTexto: FuenteId,   // lista curada, ver §11
    logoUrl, faviconUrl, ogImageUrl, heroDesktopUrl, heroMovilUrl
  }
  web: {                                   // contenido editable de la web pública
    secciones: { tipo: "hero"|"promos"|"carta"|"nosotros"|"galeria"|"ubicacion", visible, orden }[]
    hero: { bajada, titulo, textoBoton }
    nosotros: { titulo, parrafos: string[], fotoUrl, frase, tarjetas: {icono,titulo,texto}[], cierre }
    galeria: { fotoUrl, titulo }[]
    notaCarta?: string
    mensajeWhatsApp?: string               // texto del botón flotante de WhatsApp
    seo: { titulo, descripcion, keywords: string[] }
    ga4Id?: string
  }
  pedidos: {
    habilitados: boolean
    pausadoHasta?: ts                      // pausa manual por saturación
    tipos: { takeAway: boolean, delivery: boolean, salon: boolean }
    tiempoEstimadoMin: number
    pedidoMinimo: $
    requiereConfirmacionMozoQR: boolean
    mensajeCerrado?: string
  }
  pagos: {
    efectivo: boolean
    transferencia: { habilitado, alias, cbu?, titular }
    mercadoPago: { habilitado }            // credenciales en Secret Manager (§15)
  }
  actualizadoEn

miembros/{uid}                            // equipo; lo crea invitarMiembro
  rol: "dueno"|"encargado"|"mozo"|"cocina", nombre, email, activo, creadoEn

usuarios/{uid}                            // perfil técnico; SOLO Functions escriben
  email, nombre, claimsVersion

privado/{doc}                             // reglas: nadie lee ni escribe desde el cliente
```

### Carta

```ts
categorias/{categoriaId}
  nombre, orden, visible, icono?, descripcion?

productos/{productoId}
  categoriaId, nombre, descripcion, precio: $, fotoUrl?
  orden, visible: boolean, disponible: boolean          // disponible=false → "Agotado"
  diasDisponible?: number[]                              // viandas del día, etc.
  estacion: "cocina"|"barra"                             // a qué pantalla va la comanda
  etiquetas?: ("nuevo"|"picante"|"vegetariano"|"sin_tacc"|"recomendado")[]
  variantes?: { id, nombre, precio: $ }[]                // si existen, reemplazan a "precio"
  gruposExtras?: {
    id, nombre, min: number, max: number,                // min 1 = obligatorio
    opciones: { id, nombre, precio: $, disponible }[]
  }[]
  actualizadoEn

promos/{promoId}
  titulo, descripcion, precio: $, fotoUrl?, orden, activa
  items?: { productoId, varianteId?, cantidad }[]       // qué incluye (para cocina y stats)
  vigencia?: { dias: number[], desde?: "HH:mm", hasta?: "HH:mm", fechaFin?: "YYYY-MM-DD" }

zonasDelivery/{zonaId}
  nombre, costo: $, pedidoMinimo?: $, activa, orden
```

### Operación

```ts
mesas/{mesaId}
  nombre ("Mesa 4"), sector ("Salón"|"Patio"|"Barra"), capacidad, orden
  estado: "libre"|"ocupada"|"cuenta"          // denormalizado para el plano
  pedidoActualId?, qrToken                     // qrToken rota al cerrar la mesa

pedidos/{pedidoId}
  numero: number                               // correlativo diario: #1, #2…
  tipo: "take_away"|"delivery"|"salon"
  origen: "web"|"qr_mesa"|"mozo"|"mostrador"|"telefono"
  estado: EstadoPedido                         // ver máquina de estados
  cliente?: { nombre, telefono }
  entrega?: { direccion, referencia?, zonaId, costo: $ }
  mesaId?, mozoUid?, comensales?
  items: {
    id, productoId, nombre, varianteNombre?, extras: {nombre, precio}[],
    precioUnitario: $, cantidad, nota?, subtotal: $,
    estacion, ronda: number, estadoCocina: "pendiente"|"preparando"|"listo"
  }[]
  subtotal: $, descuento: $, costoEnvio: $, total: $
  pagos: { medio: "efectivo"|"transferencia"|"mercadopago"|"tarjeta", monto: $, estado: "pendiente"|"aprobado"|"rechazado", mpPaymentId?, pagaCon?: $ }[]
  estadoPago: "pendiente"|"parcial"|"pagado"
  turnoCajaId?
  tiempoEstimadoMin?, motivoCancelacion?
  seguimientoToken                             // para /pedido/[token]
  contabilizado: boolean                       // idempotencia de stats
  historial: { estado, en: ts, porUid? }[]
  creadoEn: ts, actualizadoEn: ts

seguimiento/{token}                            // espejo PÚBLICO mínimo (get sí, list no)
  numero, estado, tipo, tiempoEstimadoMin, actualizadoEn, localNombre

contadores/{YYYY-MM-DD}
  ultimoNumero

clientes/{telefono}
  nombre, telefono, direcciones: string[], cantidadPedidos, totalGastado: $, ultimoPedido: ts

turnosCaja/{turnoId}
  estado: "abierto"|"cerrado"
  abiertoPor, abiertoEn, montoInicial: $
  totales: Record<MedioPago, $>                 // actualizado por Function
  cantidadPedidos
  cerradoPor?, cerradoEn?, contado?: Record<MedioPago, $>, diferencia?: Record<MedioPago, $>, notas?

turnosCaja/{turnoId}/movimientos/{movId}
  tipo: "ingreso"|"egreso", categoria ("proveedor"|"cambio"|"retiro"|"otro"), monto: $, detalle, porUid, en: ts

statsDiarias/{YYYY-MM-DD}                      // SOLO Functions escriben
  ventas: $, pedidos, ticketPromedio: $, cancelados
  porTipo: Record<Tipo, { ventas, pedidos }>
  porMedio: Record<MedioPago, $>
  porHora: Record<"00".."23", { ventas, pedidos }>
  porProducto: Record<productoId, { nombre, cantidad, ventas }>

auditoria/{id}                                 // cambios sensibles (precios masivos, cierres de caja, cancelaciones)
  accion, detalle, porUid, en: ts
```

### Máquina de estados del pedido

```
web / qr / mostrador:
  pendiente ──aceptar──▶ aceptado ──▶ en_preparacion ──▶ listo ──┬──▶ entregado   (take away / salón)
      │                                                          └──▶ en_camino ──▶ entregado (delivery)
      └──rechazar──▶ rechazado
  (cualquier estado previo a entregado) ──cancelar(motivo)──▶ cancelado

salón (mozo): abierto ──(rondas a cocina)──▶ cuenta_pedida ──cobrar──▶ cerrado
```
Una Function contabiliza el pedido en `statsDiarias` y en el turno de caja cuando llega a `entregado` o `cerrado` con `estadoPago = pagado`.

### Índices compuestos iniciales (`firestore.indexes.json`)
- `pedidos`: `estado ASC, creadoEn DESC`
- `pedidos`: `tipo ASC, estado ASC, creadoEn DESC`
- `pedidos`: `mesaId ASC, estado ASC`
- `productos`: `categoriaId ASC, orden ASC`
- `turnosCaja`: `estado ASC, abiertoEn DESC`

---

## 6. Roles y permisos

**Custom claim** en el token (lo sincroniza `sincronizarClaims` cuando cambia `miembros/{uid}`):
```json
{ "rol": "dueno" | "encargado" | "mozo" | "cocina" }
```
El cliente fuerza el refresco del token con `getIdToken(true)` cuando `usuarios/{uid}.claimsVersion` cambia. Alguien con cuenta pero sin rol (por ejemplo, que entró con Google) no ve nada del panel.

| Permiso | Dueño | Encargado | Mozo | Cocina |
|---|:-:|:-:|:-:|:-:|
| Ver y gestionar pedidos | ✅ | ✅ | ✅ (salón y los suyos) | 👁️ solo cocina |
| Pantalla de cocina (marcar listo) | ✅ | ✅ | — | ✅ |
| Mesas: abrir, cargar, pedir cuenta | ✅ | ✅ | ✅ | — |
| Cobrar y cerrar mesa | ✅ | ✅ | ⚙️ configurable | — |
| Caja: abrir, cerrar, movimientos | ✅ | ✅ | — | — |
| Carta, promos, precios | ✅ | ✅ | — | — |
| Marcar producto agotado | ✅ | ✅ | ✅ | ✅ |
| Reportes | ✅ | ⚙️ configurable | — | — |
| Configuración del local y marca | ✅ | — | — | — |
| Equipo (invitar y quitar) | ✅ | — | — | — |

**Soporte (DelgadoDev):** acceso a la consola de Firebase del proyecto del local. No hay superadmin dentro de la app.

---

## 7. Reglas de seguridad

Principios:
- **Denegar por defecto.**
- Lectura pública **solo** de: `local/datos`, `categorias`, `productos`, `promos`, `zonasDelivery`, y `seguimiento/{token}` (solo `get`, nunca `list`).
- `pedidos`: el cliente final **no crea** pedidos (los crea `crearPedido` con el Admin SDK). El staff solo actualiza campos permitidos según su rol (`estado`, `items[].estadoCocina`, `pagos`…).
- `usuarios`, `statsDiarias`, `contadores`, `privado`, `clientes`, `turnosCaja`, `auditoria`: solo Functions escriben.
- Validar tipos y campos permitidos en cada escritura (`request.resource.data.keys().hasOnly([...])`).
- **Storage:** `imagenes/**` se escribe solo por dueño o encargado, solo imágenes (sin SVG) de hasta 2 MB; lectura pública.

Esqueleto:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function rol() { return request.auth != null ? request.auth.token.get('rol', null) : null; }
    function esStaff() { return rol() in ['dueno','encargado','mozo','cocina']; }
    function esGestor() { return rol() in ['dueno','encargado']; }

    match /local/{doc}        { allow read: if true; allow update: if rol() == 'dueno'; }
    match /productos/{id}     { allow read: if true; allow write: if esGestor();
                                allow update: if esStaff()
                                  && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['disponible','actualizadoEn']); }
    match /seguimiento/{t}    { allow get: if true; allow list, write: if false; }
    match /pedidos/{id}       { allow read: if esStaff(); allow create, delete: if false;
                                allow update: if esStaff() /* + validación de campos por rol */; }
    match /privado/{doc}      { allow read, write: if false; }
    // … resto según §5
  }
}
```
> Cada regla lleva su test en `tests/reglas/`. Caso crítico: **alguien con cuenta pero sin rol (o sin sesión) no lee ni escribe nada privado.**

---

## 8. Cloud Functions

| Function | Tipo | Qué hace | Fase |
|---|---|---|---|
| `sincronizarClaims` | trigger `miembros/{uid}` onWrite | Recalcula el claim `rol` y sube `usuarios/{uid}.claimsVersion` | 0 |
| `invitarMiembro` | callable | Solo el dueño. Crea o busca el usuario por email, crea `miembros` y devuelve un link para elegir contraseña (el dueño lo manda por WhatsApp) | 0 |
| `revalidarWeb` | triggers `revalidarLocal`, `revalidarCategorias`, `revalidarProductos`, `revalidarPromos` | POST a `/api/revalidate` con secreto → `revalidateTag('carta', { expire: 0 })` | 1 |
| `ajustarPrecios` | callable (dueño/encargado) | Actualización masiva con `planAjuste` (mismo cálculo que la vista previa), lotes de 500 y registro en `auditoria` | 1 |
| `crearPedido` | callable (App Check) | Valida el esquema zod, local activo y abierto, disponibilidad, zona y mínimo; **recalcula precios** con `packages/shared/precios.ts`; número correlativo por transacción; crea `pedidos` y `seguimiento`; upsert en `clientes`; si paga con MP, crea la preferencia y devuelve `init_point` | 2 |
| `espejarSeguimiento` | trigger `pedidos` onUpdate | Actualiza `seguimiento/{token}` | 2 |
| `mpWebhookPedidos` | https | Valida la firma HMAC (`x-signature`), consulta el pago y actualiza `pagos` y `estadoPago` | 2 |
| `contabilizarPedido` | trigger `pedidos` onUpdate | Al cerrar o entregar y estar pagado: suma en `statsDiarias` y en el `turnosCaja` abierto (con `contabilizado` como candado) | 4 |
| `revertirContabilizacion` | trigger `pedidos` onUpdate | Si un pedido contabilizado se cancela, resta | 4 |
| `limpiezaDiaria` | scheduled | Rota los `qrToken` de mesas libres, archiva seguimientos viejos | 3 |

Región: `southamerica-east1` (São Paulo), la más cercana a Argentina; se fija en `functions/src/opciones.ts`, que `index.ts` importa primero. Secretos (credenciales de MP del local, secreto de revalidación) en **Secret Manager** vía `defineSecret`.

---

## 9. Rutas de la app

| Ruta | Quién | Render |
|---|---|---|
| `/` | Público | Web del local: Server Component con cache por etiqueta (Fase 1; antes redirige a `/panel`) |
| `/carta` | Público | Igual; carta completa con buscador y tabs de categoría fijas |
| `/checkout` | Público | Client island (carrito en zustand persistido) |
| `/pedido/[token]` | Público | Client, `onSnapshot` sobre `seguimiento/{token}` |
| `/mesa/[mesaId]?k=qrToken` | Público | Carta en modo mesa |
| `/login` | Staff | Client |
| `/panel/…` | Staff | Client, tiempo real, menú lateral según rol |
| `/api/revalidate` | Functions | Route handler con secreto |

---

## 10. Rendimiento y costos

Firestore cobra por lectura. Estas reglas mantienen la factura baja y la app rápida:

- **Web pública:** Server Components leen con el Admin SDK una sola vez y cachean (`unstable_cache` / `"use cache"` con `cacheTag('carta')`). Las visitas no generan lecturas. La cache se invalida sola con `revalidarWeb`.
- **Carrito y checkout** son la única parte "client" de la web pública. El resto es HTML del servidor, con Lighthouse móvil ≥ 90 como objetivo.
- **Imágenes:** se comprimen en el navegador antes de subir (webp, máximo 1600 px, ~200 KB) y se sirven con `next/image`.
- **Listeners acotados:** el panel escucha solo pedidos activos (`estado in [...]`, `limit`). El historial es paginado y sin tiempo real.
- **Reportes:** leen `statsDiarias` (un documento por día), así que un mes cuesta unas 30 lecturas.
- **Panel offline:** `initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })`. Si se corta internet, el mozo sigue viendo y cargando datos, y se sincroniza al volver.
- **Code splitting:** el panel y la web pública no comparten bundle pesado (Firebase cliente solo se carga en el panel y el checkout).
- **Presupuesto:** plan Blaze con **alertas de presupuesto** configuradas desde el día 1, en cada proyecto de cada local.

---

## 11. Convenciones

- **Idioma:** la UI está en español rioplatense (vos) en el panel. Los textos públicos los edita cada local. El **dominio** del código va en español (`pedido`, `producto`, `turnoCaja`) y lo técnico en inglés cuando es estándar (`useAuth`, `route.ts`).
- **Dinero:** enteros en pesos. Formato con `Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })`.
- **Fechas:** `serverTimestamp()` al escribir; se muestran en la `zonaHoraria` del local. Las claves de día (`YYYY-MM-DD`) se calculan en la zona del local, y un turno que cruza la medianoche cuenta para el día en que abrió.
- **Validación:** todo input pasa por un esquema zod de `packages/shared`, en el front y en las Functions.
- **Fuentes:** lista curada precargada con `next/font`: Sriracha, Bebas Neue, Poppins, Playfair Display, Oswald, Roboto, Inter y Montserrat. El local elige una para títulos y otra para texto, y se aplican vía variables CSS.
- **Marca:** `app/layout.tsx` inyecta `--color-primario`, etc. desde `local/datos.marca`. Tailwind los consume (`bg-[var(--color-primario)]` o tokens del tema). El dueño cambia colores, fotos y textos desde el panel sin tocar código.
- **Diseño por local:** cada copia del repo es libre de cambiar su diseño en `components/publico/`. Para no perder los arreglos de la base (ver §16):
  - lo **genérico** (panel, Functions, reglas, `packages/shared`, componentes reutilizables) se cambia **primero en la base** y se trae a las copias con git;
  - lo **propio del local** (kit, `.env`, `.firebaserc`, `components/publico/`, estilos) vive solo en su copia.
- **Panel mínimo (locales chicos):** el panel tiene solo lo que el dueño usa seguido: carta y precios (con agotados), promos y banner de fecha especial, QR, contacto, redes y horarios. Marca, colores, tipografías, textos, SEO, equipo y configuraciones avanzadas **no** van al panel: las maneja DelgadoDev en el código y los datos. Antes de sumar algo al panel: ¿el dueño lo usaría cada semana?
- **Diseño de la web pública:** experiencia de **app de pedidos**, mobile first: portada compacta tipo ficha del local, la carta como protagonista, "+" en cada plato, hoja de producto (bottom sheet), barra de pedido fija y carrito lateral. La marca manda (colores y tipografía de `local/datos.marca`). Sin fotos de stock: donde falta la foto real va la ilustración de la categoría.
- **Movimiento:** solo se animan `transform`, `opacity` y `filter` (compositor, sin repintar ni mover layout); lo ligado al scroll usa `animation-timeline` nativo (sin JS) y degrada a "sin animación"; todo respeta `prefers-reduced-motion`. Nada que retrase el LCP: la foto del hero no se anima en opacidad y carga con `fetchPriority="high"`. Nada de librerías de animación.
- **Peso:** la web pública no carga Firebase cliente ni zod; lo que se usa al interactuar (hojas de producto y carrito) se carga en diferido y lo pesado (Google Maps) va detrás de un "facade" que carga al tocar.
- **Accesibilidad:** contraste AA, foco visible, botones con `aria-label`, carta navegable por teclado.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`…). Una rama por tarea y PR a `main`.
- **Nada de secretos en el repo.** Van en `.env.local` (git-ignored) y en Secret Manager.

---

## 12. Fases del roadmap

Las estimaciones son para 1 dev con dedicación alta. Cada fase termina con algo **usable** y un **criterio de "listo"**.

### Fase 0: Fundaciones (1–2 semanas)

**Repo y tooling**
- [x] Monorepo pnpm: `apps/web`, `functions`, `packages/shared`.
- [x] Next.js + TypeScript estricto + Tailwind + shadcn/ui inicializado.
- [x] ESLint, Prettier y alias `@/`.
- [x] GitHub Actions: lint, typecheck, build y tests de reglas contra el emulador.

**Firebase**
- [x] Proyecto `silverio-club` (producción), plan Blaze y alerta de presupuesto. Para probar se usan los emuladores; un proyecto `-dev` se agrega solo si hace falta (§15).
- [x] `firebase.json` con emuladores (Auth, Firestore, Storage, Functions) y `pnpm dev` que levante todo.
- [x] Región de Functions `southamerica-east1`.

**Dominio compartido**
- [x] `packages/shared`: tipos del §5, esquemas zod, `dinero.ts`, `horarios.ts` (`estaAbierto`, con test de horarios que cruzan medianoche), `precios.ts` (`calcularItem`, `calcularPedido`, con tests).

**Auth y equipo**
- [x] Login con email/contraseña y Google; recuperación de contraseña.
- [x] Functions `sincronizarClaims` e `invitarMiembro`.
- [x] Hook `useSesion()` con usuario y rol.
- [x] Panel base: layout con barra lateral según rol y página "resumen" vacía. *(La página Equipo se sacó del panel en 1.7: los usuarios del local los da de alta DelgadoDev; `invitarMiembro` queda en el backend.)*
- [x] `firestore.rules` y `storage.rules` v1 con tests por rol (incluido "con cuenta pero sin rol").

**Datos**
- [x] `scripts/seed.ts`: crea el local desde `silverio/seed.json` y su equipo de prueba, en el emulador o el proyecto elegido.
- [x] `scripts/subir-assets.ts`: sube `silverio/assets/**` a Storage y actualiza las URLs.

✅ **Listo cuando:** con los emuladores corriendo, el dueño entra al panel con su menú completo, el mozo ve solo lo suyo, alguien sin rol no ve nada, y los tests de reglas pasan en CI. **→ Cumplido el 2026-09-28.**

---

### Fase 1: Carta y web pública (2–3 semanas) → 🚀 Silverio sale a producción

**Panel: configuración del local**
- [x] **Configuración mínima:** contacto (WhatsApp, teléfono), links de redes y horarios (editor por día, con cierres especiales). Nada más.
- *Marca, tipografías, textos de la web, SEO, pedidos y pagos **no van en el panel**: los ajusta DelgadoDev en el código (`components/publico/`) y en los datos del local (seed / consola). Ver §11 "Panel mínimo".*

**Panel: carta**
- [x] Categorías: alta, baja, modificación, ordenar con arrastrar, visible/oculta.
- [x] Productos: alta, baja, modificación con foto (comprimida), **agotado con un toque** desde la lista. Variantes, extras (mín/máx), etiquetas, estación, días y visible quedan plegados en "Más opciones".
- [x] Promos: alta, baja, modificación con foto, ítems incluidos y vigencia por días y horario.
- [x] **Banner de fecha especial** debajo de la portada: imagen para computadora y para celular, texto y rango de fechas (se edita en Promos).
- [x] Todas las imágenes que sube el dueño se comprimen a **WebP** en el navegador antes de guardarse.
- [x] **Actualización masiva de precios:** alcance (todo, categorías, productos seleccionados), % o monto fijo, redondeo (a 10, 50, 100 o 500), **vista previa antes/después**, aplicación con `writeBatch` en lotes de 500 y registro en `auditoria`.
- [x] Duplicar producto y buscador en la lista.

**Web pública `/`** — experiencia de **app de pedidos** con la marca del local (ver §11 "Diseño de la web pública")
- [x] Layout con la marca del local (variables CSS y fuentes).
- [x] Navbar con logo, anclas y un indicador **Abierto / Cerrado · abre a las 20:00**.
- [x] Portada tipo "ficha del local" (ilustración/foto distinta en escritorio y móvil) con datos rápidos: abierto, cómo pedir, tiempo, zona.
- [x] Promos en mosaico (bento) con la destacada grande, solo las vigentes ahora, y "Agregar" directo al carrito.
- [x] Carta: buscador y chips de categoría fijos que siguen el scroll; filas con miniatura (foto o ilustración de la categoría) y botón "+"; "Agotado" y etiquetas.
- [x] **Carrito adelantado de la Fase 2** (hoja de producto, carrito persistente, datos de entrega y pago) con **envío del pedido por WhatsApp** como paso intermedio. Precios recalculados con `calcularPedido`.
- [x] Info del local compacta al final (historia, horarios, ubicación con mapa diferido, galería) y footer con redes y horarios.
- [x] Botón flotante de WhatsApp con mensaje configurable (`local/datos.web.mensajeWhatsApp`, lo ajusta DelgadoDev).
- [x] SEO: `generateMetadata`, JSON-LD `Restaurant` generado desde los datos, `sitemap.ts`, `robots.ts`, `opengraph-image.tsx` dinámica (tarjeta generada con la marca del local).
- [x] GA4 con el ID del local. *(carga diferida, no afecta PageSpeed)*
- [x] Página 404 y local inactivo → "Volvemos pronto".

**Infra**
- [x] `revalidarWeb` + `/api/revalidate`: un cambio en el panel se ve en la web en segundos.
- [x] **Generador de QR:** QR con el logo, PNG y PDF listos para imprimir (PDF desde el diálogo de impresión; 1 grande o 4 por hoja).
- [ ] Empaquetar las Functions para el deploy (Firebase no resuelve dependencias `workspace:*`): proponer `esbuild` u otra alternativa antes de instalar.

**Silverio en producción**
- [ ] Revisar con el dueño la lista pendiente de [`silverio/SILVERIO.md` §7](silverio/SILVERIO.md#7-pendiente-de-confirmar-con-el-dueño-antes-de-la-fase-1).
- [ ] Cargar la carta real y los precios actualizados (el dueño lo hace desde el panel, como prueba de usabilidad).
- [ ] Deploy a producción y apuntar el dominio de Silverio. La web vieja queda de respaldo 2 semanas.
- [ ] Mantener el ID de GA4 `G-8CN2SBDQ5R`.

✅ **Listo cuando:** la web de Silverio corre en producción, el dueño cambió precios y marcó agotados solo, y Lighthouse móvil da ≥ 90 en rendimiento y SEO.

---

### Fase 2: Pedidos online (3–4 semanas), el corazón del producto

**Cliente**
- [x] Modal de producto: variante, extras (respeta mín/máx), cantidad y nota. *(hecho en la Fase 1)*
- [x] Carrito: drawer persistente, editar y quitar, subtotal en vivo con `precios.ts`. *(hecho en la Fase 1)*
- [ ] Checkout: *(formulario hecho en la Fase 1 y enviado por WhatsApp; falta conectarlo a `crearPedido`, zonas con costo y Mercado Pago)*
  - tipo (take away, delivery o salón según config), nombre y teléfono;
  - delivery: dirección, referencia y selector de zona con costo;
  - pedido mínimo;
  - medio de pago: efectivo ("¿con cuánto pagás?"), transferencia (muestra alias y titular) o Mercado Pago.
- [ ] Si el local está cerrado o pausado, no se puede confirmar y se explica por qué.
- [ ] Confirmación con número de pedido, link de seguimiento y botón opcional "Avisar por WhatsApp" con el mensaje armado.
- [ ] Seguimiento `/pedido/[token]`: estado en tiempo real, tiempo estimado y datos del local.

**Backend**
- [ ] App Check (reCAPTCHA Enterprise) registrado con el dominio de producción.
- [ ] `crearPedido` (ver §8) con App Check obligatorio y límite de frecuencia por teléfono.
- [ ] `espejarSeguimiento`.
- [ ] Mercado Pago con las credenciales del local (Secret Manager): preferencia de Checkout Pro, `mpWebhookPedidos` con validación de firma, y conciliación del estado del pago.

**Panel de pedidos**
- [ ] Tablero kanban (Nuevos · En preparación · Listos · En camino) y lista del día con filtros.
- [ ] **Sonido y notificación del navegador** al entrar un pedido (con botón para activar sonido, que el navegador exige, y aviso si está silenciado).
- [ ] Aceptar (con tiempo estimado), rechazar o cancelar con motivo, avanzar de estado.
- [ ] Detalle con los ítems, extras y notas bien visibles, datos del cliente, links a WhatsApp y Maps.
- [ ] Mensajes rápidos por WhatsApp según el estado ("Tu pedido #12 está listo 🙌").
- [ ] Marcar transferencia verificada y registrar el pago en efectivo.
- [ ] **Carga manual** de pedidos (mostrador o teléfono) con la misma UI de carta, pensada para usar rápido.
- [ ] Pausar pedidos (15, 30 o 60 min), abrir y cerrar manualmente, ajustar el tiempo de espera.
- [ ] Imprimir ticket y comanda desde el navegador (CSS `@media print` para 58 y 80 mm).
- [ ] Zonas de delivery: alta, baja, modificación.
- [ ] Clientes: lista con historial básico (se completa sola con los pedidos).

**Calidad**
- [ ] Tests e2e con Playwright: pedido take away en efectivo, delivery con zona, y pago con MP en sandbox.

✅ **Listo cuando:** Silverio toma **todos sus pedidos de un fin de semana** por la web sin perder ninguno, y cobra al menos uno con Mercado Pago.

---

### Fase 3: Salón y cocina (3–4 semanas)

**Mesas**
- [ ] Mesas: alta, baja, modificación, por sector (Salón, Patio, Barra), con capacidad y orden.
- [ ] Plano en grilla con estados de color: libre, ocupada o cuenta pedida, y tiempo desde que se abrió.
- [ ] **QR por mesa** (`/mesa/[id]?k=token`) con impresión en lote. El token rota al cerrar la mesa para evitar pedidos falsos desde casa.

**App del mozo (PWA instalable)**
- [ ] Abrir mesa (comensales), cargar ítems rápido (buscador y categorías) y **enviar ronda a cocina**.
- [ ] Ver la cuenta, transferir ítems entre mesas, mover o unir mesas.
- [ ] Pedir cuenta → cobrar con **pagos múltiples y división** (partes iguales o por ítems) → cerrar.
- [ ] Pedidos que llegan por QR de mesa: el mozo los confirma (si `requiereConfirmacionMozoQR`).
- [ ] Botones del cliente en modo mesa: **llamar al mozo** y **pedir la cuenta**, que notifican al panel.

**Pantalla de cocina (KDS)**
- [ ] Columnas por estado y filtro por **estación** (cocina o barra).
- [ ] Tarjeta por pedido o ronda con cronómetro por colores (verde < 10', amarillo < 20', rojo).
- [ ] Marcar ítem o ronda en preparación o listo, lo que avisa al mozo o al panel.
- [ ] Sonido al entrar comanda, **Wake Lock** (pantalla siempre encendida), modo pantalla completa y letra grande.
- [ ] Comanda impresa por estación (opcional).

**PWA y conexión**
- [ ] Manifest e instalación del panel, íconos con el logo del local.
- [ ] Indicador **sin conexión** y cola de escrituras de Firestore (cache persistente).

✅ **Listo cuando:** Silverio atiende **un servicio completo de salón** (viernes o sábado) con mozos y cocina usando el sistema.

---

### Fase 4: Caja y reportes (2–3 semanas)

**Caja**
- [ ] Abrir turno con monto inicial. Solo un turno abierto a la vez (validado en Function).
- [ ] Todo cobro se asocia al turno abierto; sin turno abierto se avisa para abrirlo.
- [ ] Movimientos: ingresos y egresos con categoría (proveedor, cambio, retiro, otro).
- [ ] **Cierre:** esperado por medio de pago contra lo contado, diferencia, notas, resumen imprimible y registro en `auditoria`.
- [ ] Historial de turnos con detalle.

**Contabilización**
- [ ] `contabilizarPedido` y `revertirContabilizacion` (idempotentes, con tests).

**Reportes**
- [ ] KPIs de hoy frente al mismo día de la semana anterior: ventas, pedidos, ticket promedio, cancelados.
- [ ] Ventas por día (rango elegible), mapa de calor por **día y hora**.
- [ ] Ranking de productos (cantidad y facturación) y por categoría.
- [ ] Composición por tipo (salón, take away, delivery) y por medio de pago.
- [ ] Clientes frecuentes (top por cantidad y gasto).
- [ ] Exportar a Excel y CSV.
- [ ] Resumen del día por WhatsApp o email al dueño al cerrar la caja (opcional).

✅ **Listo cuando:** el dueño de Silverio **cierra caja todos los días con el sistema** y usa los reportes en lugar de planillas.

---

### Fase 5: Plantilla replicable y venta (1–2 semanas)

**Replicar**
- [ ] Guía de §16 probada de punta a punta con un local de prueba, y ajustada con lo que falte.
- [ ] Script `scripts/nuevo-local.ts` que valida el kit (`seed.json`, assets), `.env` y `.firebaserc`, y avisa lo que falta.
- [ ] Separar claramente lo **genérico** de lo **propio del local** (§11) para que traer arreglos de la base sea un `git merge` sin conflictos.
- [ ] **Web demo para vender:** una copia con datos ficticios, en su propio Firebase y Vercel.

**Venta**
- [ ] Cobro del abono mensual por Mercado Pago (link de suscripción de la cuenta de DelgadoDev, fuera de la app).
- [ ] Emails transaccionales (Resend o la extensión "Trigger Email"): invitación de equipo y avisos al dueño.
- [ ] Legales: términos y condiciones, política de privacidad (Ley 25.326), aviso de datos de clientes finales.
- [ ] Centro de ayuda: artículos cortos y videos de 1–2 minutos por función clave.

✅ **Listo cuando:** un **segundo local** está online con su propia copia, creada en menos de un día siguiendo la guía, y paga el abono por Mercado Pago.

---

### Después (según la demanda de los clientes)
- Cupones y promos automáticas por día y hora; programa de puntos.
- Stock simple por producto (se descuenta con cada venta y avisa cuando hay poco).
- Pedidos programados (para una hora determinada).
- Reservas de mesas.
- Impresión directa en térmica (QZ Tray o agente local) y comandas automáticas.
- Notificaciones push (FCM) para staff y clientes.
- App de repartidor (asignar delivery y ubicación).
- Encuestas post-pedido y reseñas en Google.

---

## 13. Planes comerciales

Cada local paga un **abono mensual** a DelgadoDev (web + sistema + mantenimiento). El consumo de Firebase y Vercel de su proyecto va aparte o incluido según el plan.

| Plan | Incluye | Pensado para |
|---|---|---|
| **Carta** | Web del local a medida, carta con QR, promos, precios masivos | Locales que hoy tienen una carta en PDF o Instagram |
| **Pedidos** | Carta + pedidos online (take away y delivery), panel en tiempo real, Mercado Pago, clientes | Hamburgueserías, pizzerías, rotiserías |
| **Completo** | Pedidos + salón, mesas y QR, pantalla de cocina, caja, reportes, más usuarios | Locales con salón |

- Los precios se definen en la Fase 5, comparando con Pedix y Fudo, en ARS con ajuste periódico.
- Un plan se "activa" habilitando o no secciones en la copia de ese local (menú del panel y config de pedidos).
- **Argumento central:** *"Tus pedidos, sin comisión"*, frente a PedidosYa y Rappi.
- **Silverio = cliente fundador:** bonificado a cambio de feedback, testimonio y uso como caso público. **Firmarlo por escrito, incluyendo que el código es propiedad de DelgadoDev.**

---

## 14. Riesgos

| Riesgo | Mitigación |
|---|---|
| **Las copias se desincronizan de la base** (un arreglo hay que hacerlo N veces) | Cambios genéricos siempre primero en la base; cada copia tiene el remoto `base` y trae los arreglos con `git merge` (§16); lo propio del local, separado (§11) |
| **Soporte en horario de servicio** (viernes 22 hs) | UX a prueba de errores, estado del sistema visible, canal de WhatsApp de soporte con horario definido por plan |
| **Internet del local se corta** | Cache persistente de Firestore en el panel, indicador de sin conexión, carga manual que se sincroniza después |
| **Impresoras térmicas** (cada modelo es distinto) | Arrancar con impresión del navegador; integración directa recién cuando haya demanda |
| **Costos de Firebase** | Principios del §10 y alertas de presupuesto en cada proyecto |
| **Mantener muchos proyectos** (deploys, secretos, Firebase) | Guía y script de §16, CI igual en todas las copias, checklist de deploy |
| **Pedidos falsos o en broma** | App Check, límite por teléfono, confirmación del mozo en QR, token de mesa rotativo |
| **Seguridad** | Reglas con tests obligatorios en CI y precios siempre recalculados en el servidor |
| **Dependencia de un solo dev** | Este documento, código tipado, tests y README de operación |

---

## 15. Entornos, variables y deploy

| Entorno | Firebase | Web | Uso |
|---|---|---|---|
| local | Emuladores (`demo-local`) | `localhost:3000` | Desarrollo diario y pruebas, seed automático al correr `pnpm dev` |
| prod | `silverio-club` (alias `prod` en `.firebaserc`) | Vercel Production | Silverio real |

**Un solo proyecto real por local.** Las pruebas se hacen en los emuladores. Si más adelante hace falta probar algo con servicios reales (p. ej. webhooks de Mercado Pago o un deploy de Functions riesgoso), se agrega un proyecto `<local>-dev` con alias `dev`; el código ya lo soporta. Los Preview de Vercel apuntan a los emuladores o a ese `-dev`, **nunca** a producción.

En una copia para otro local, el proyecto pasa a ser `<local>`.

**`apps/web/.env.local`**
```env
NEXT_PUBLIC_NOMBRE_LOCAL=Silverio Club
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_KEY=
NEXT_PUBLIC_USE_EMULATORS=true
FIREBASE_SERVICE_ACCOUNT_JSON=        # solo servidor (Admin SDK), en base64
REVALIDATE_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Secretos de Functions** (`firebase functions:secrets:set`; en el emulador salen de `functions/.secret.local`, que `pnpm dev` crea desde `.secret.local.example`): `REVALIDATE_SECRET`, `MP_ACCESS_TOKEN` (del local), `MP_WEBHOOK_SECRET`, `RESEND_API_KEY`.

**Deploy**
- Web: push a `main` → Vercel Production. Los PR generan Preview.
- Functions, reglas e índices: `firebase deploy --only functions,firestore,storage -P prod` (GitHub Action manual con aprobación).

---

## 16. Cómo crear la web de un local nuevo

Este repo (Silverio Club) es la **base**. Para un local nuevo:

1. **Repo:** crear el repo `<local>` en GitHub a partir de este (copia completa del historial). En la copia, agregar el remoto de la base:
   `git remote add base https://github.com/<usuario>/silverio-club.git`
2. **Firebase:** crear el proyecto `<local>` con los mismos pasos que Silverio (Blaze + alerta de presupuesto, Firestore y Storage en `southamerica-east1`, Auth email + Google, app web registrada; App Check al llegar a pedidos online). Actualizar el alias `prod` en `.firebaserc`.
3. **Kit del local:** reemplazar la carpeta `silverio/` por la del nuevo local (`seed.json` con el mismo formato, `assets/`, `<LOCAL>.md` con marca y textos) y apuntar `KIT` en `scripts/entorno.ts`.
4. **Variables:** `.env.local` y variables de Vercel (`NEXT_PUBLIC_NOMBRE_LOCAL`, config de Firebase, secretos). Secretos de Functions con las credenciales de MP del local.
5. **Diseño:** ajustar `components/publico/` y estilos a la marca del local (lo propio del local; ver §11).
6. **Datos:** `pnpm seed --kit <carpeta> --proyecto <local> --si-estoy-seguro` y crear el usuario real del dueño (desde el seed o invitándolo).
7. **Deploy:** Vercel (Root Directory `apps/web`) + `firebase deploy -P prod`. Apuntar el dominio.

**Traer arreglos de la base a una copia:** `git fetch base && git merge base/main`. Los conflictos solo deberían aparecer en archivos propios del local; si aparecen en código genérico, es señal de que ese cambio tenía que hacerse en la base.

---

## Registro de cambios de este documento
- **1.0 (2026-09-28):** versión inicial, backend definido en Firebase.
- **1.1 (2026-09-28):** nombre provisorio del producto "MiMenu". Ajustes de tooling de la Fase 0 que siguen vigentes:
  - TypeScript fijado en **6.0.x** (typescript-eslint todavía no soporta TS 7) y **ESLint 9** (los plugins de `eslint-config-next` piden v9).
  - Los scripts (`seed.ts`, `subir-assets.ts`) corren con `node --experimental-strip-types`, sin sumar `tsx`.
  - Emuladores con proyecto `demo-…` (el prefijo impide tocar recursos reales) y `pnpm dev` corre el seed automático, sin persistir datos.
  - `horarios.ts` usa solo `Intl` (sin date-fns).
  - `shadcn/ui` con base Radix y preset Nova; `cn` (de shadcn) reemplaza a clsx + tailwind-merge.
  - Storage no acepta SVG subidos por usuarios (pueden llevar scripts).
- **1.2 (2026-09-28):** se evaluó el modelo multi-local con variantes de diseño. **Reemplazado por 1.3.**
- **1.3 (2026-09-28):** **un repo por local**. Este repo es **Silverio Club** y la base que se copia para cada local nuevo (§16). Cambios:
  - Firestore **aplanado**: `local/datos` + colecciones en la raíz; claims `{ rol }`; Storage en `imagenes/`.
  - Salen lo que era de plataforma: `slugs`, `plataforma/config`, suscripción dentro de la app, superadmin y `/admin`, `crearLocal`, `/registro`, local demo, variantes de diseño (`web.estilo`) y OAuth de Mercado Pago (se usan las credenciales del local).
  - Web pública en `/` y panel en `/panel` (sin `[slug]` ni `[localId]`). Nombre del local por `NEXT_PUBLIC_NOMBRE_LOCAL`.
  - Paquetes con nombres genéricos (`@app/*`) y emulador `demo-local`, para que copiar el repo no requiera renombrar.
  - La Fase 5 pasa a ser "Plantilla replicable y venta".
- **1.4 (2026-09-28):** **un solo proyecto de Firebase por local** (`silverio-club`, producción); las pruebas se hacen en los emuladores y un `-dev` se agrega solo si hace falta. App Check pasa de la Fase 0 a la Fase 2 (necesita el dominio de producción).
- **1.5 (2026-09-29):** la web pública pasa a ser una **experiencia de app de pedidos** (portada compacta, promos en mosaico, carta con "+", hoja de producto, carrito). El **carrito se adelanta de la Fase 2 a la Fase 1**, con el pedido enviado por WhatsApp como paso intermedio hasta `crearPedido`. Se suma `zustand` (ya previsto en §2).
- **1.6 (2026-09-29):** panel de **carta** (productos, categorías, aumento masivo con vista previa), **promos** y **configuración** (local, horarios, marca con contraste, web, pedidos y pagos). Functions `ajustarPrecios` y `revalidarWeb`: los cambios del panel se ven en la web en segundos. `pedidos.habilitados` apagado = web en modo carta (sin carrito). Se suman `browser-image-compression` y `@dnd-kit` (ya previstos en §2).
- **1.7 (2026-09-29):** **panel mínimo**. Configuración reducida a contacto, redes y horarios; salen del panel marca, textos de la web, pedidos y pagos, y la página Equipo. Se suma el **banner de fecha especial** (PC y celular, con fechas). Todas las imágenes a WebP. En productos, lo avanzado queda plegado en "Más opciones"; el QR queda con menos opciones. También: página 404, robots, sitemap, imagen para compartir generada y mensaje de WhatsApp configurable por datos.
