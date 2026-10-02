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
  numero: number                               // correlativo por jornada: #1, #2…
  jornada: "YYYY-MM-DD"                        // jornada del local (corte 06:00: la madrugada es del día anterior)
  tipo: "take_away"|"delivery"|"salon"
  origen: "web"|"qr_mesa"|"mozo"|"mostrador"|"telefono"
  estado: EstadoPedido                         // ver máquina de estados
  cliente?: { nombre, telefono? }              // en mostrador puede no haber datos
  entrega?: { direccion, referencia?, zonaId?, costo: $ }
  pagoElegido: { medio: "efectivo"|"transferencia", pagaCon?: $ }   // lo que eligió el cliente
  nota?
  mesaId?, mozoUid?, comensales?
  items: {
    id, tipo: "producto"|"promo", productoId (o promoId), nombre, varianteNombre?, extras: {nombre, precio}[],
    precioUnitario: $, cantidad, nota?, subtotal: $,
    estacion, ronda: number, estadoCocina: "pendiente"|"preparando"|"listo"
  }[]
  subtotal: $, descuento: $, costoEnvio: $, total: $
  pagos: { medio: "efectivo"|"transferencia"|"mercadopago"|"tarjeta", monto: $, estado: "pendiente"|"aprobado"|"rechazado", mpPaymentId?, pagaCon?: $, porUid? }[]   // lo cobrado de verdad
  estadoPago: "pendiente"|"parcial"|"pagado"
  turnoCajaId?
  tiempoEstimadoMin?, motivoCancelacion?, canceladoPor?: "cliente"|"vencido"|"local"
  porConfirmar?, confirmarAntesDe?             // cliente nuevo: confirma por WhatsApp o se cancela solo
  seguimientoToken                             // para /pedido/[token]
  contabilizado: boolean                       // idempotencia de stats
  contabilizacion?: { turnoCajaId, total, porMedio, hora }   // lo sumado, para restarlo igual
  historial: { estado, en: ts, porUid? }[]
  creadoEn: ts, actualizadoEn: ts

seguimiento/{token}                            // espejo PÚBLICO mínimo (get sí, list no); sin teléfono ni dirección
  numero, estado, tipo, tiempoEstimadoMin, motivoCancelacion?, items: {nombre, cantidad}[], total: $,
  medioPago, estadoPago, creadoEn, actualizadoEn, localNombre

contadores/{jornada}                           // YYYY-MM-DD de la jornada (corte 06:00)
  ultimoNumero
contadores/caja                                // { turnoAbiertoId | null }

clientes/{telefono}
  nombre, telefono, direcciones: string[], cantidadPedidos, totalGastado: $, ultimoPedido: ts
  entregados?                                  // con 1 o más, ya no se le pide confirmar

bloqueados/{telefono}                          // no pueden pedir por la web (dueño y encargado)
  telefono, motivo, porUid, en: ts

turnosCaja/{turnoId}                           // la "caja": una abierta a la vez (candado en contadores/caja)
  estado: "abierto"|"cerrado"
  abiertoPor, abiertoPorNombre, abiertoEn, montoInicial: $
  totales: { efectivo, transferencia }          // cobros de pedidos, los suma contabilizarPedido
  cantidadPedidos
  cerradoPor?, cerradoPorNombre?, cerradoEn?, notas?
  esperado?, contado?, diferencia?: { efectivo, transferencia }, movimientosNeto?   // foto del cierre

turnosCaja/{turnoId}/movimientos/{movId}
  tipo: "ingreso"|"egreso", categoria ("proveedor"|"cambio"|"retiro"|"otro"), monto: $, detalle, porUid, en: ts

statsDiarias/{jornada}                         // SOLO Functions escriben; solo pedidos cobrados y no anulados
  jornada, ventas: $, pedidos                  // ticket promedio = ventas / pedidos (se calcula al leer)
  porTipo: Record<Tipo, { ventas, pedidos }>
  porMedio: { efectivo?, transferencia? }
  porHora: Record<"00".."23", { ventas, pedidos }>
  porProducto: Record<productoId, { nombre, cantidad, ventas }>

auditoria/{id}                                 // cambios sensibles (precios masivos, cierres de caja, cancelaciones)
  accion, detalle, porUid, en: ts
```

### Máquina de estados del pedido

```
web / qr:
  pendiente ──aceptar──▶ (aceptado) ──▶ en_preparacion ──▶ listo ──┬──▶ entregado   (take away / salón)
      │                                                          └──▶ en_camino ──▶ entregado (delivery)
      └──rechazar──▶ rechazado
  (cualquier estado previo a entregado) ──cancelar(motivo)──▶ cancelado
mostrador / teléfono (carga manual): arranca en en_preparacion.
"Aceptar" en el panel lleva directo a en_preparacion; "aceptado" queda por compatibilidad.
Transiciones y paso siguiente: packages/shared/src/pedidos.ts (puedePasar, siguienteEstado).

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
| `crearPedido` | callable (App Check pendiente) | Web: valida el esquema zod, local activo, abierto y sin pausa, tipo y medio habilitados, promos vigentes, disponibilidad y mínimo; límite de 1 pedido por minuto por teléfono. Staff (`origen` mostrador/teléfono, rol dueño, encargado o mozo): sin esas reglas, puede registrar el pago. Siempre **recalcula precios** con `packages/shared/precios.ts`; número correlativo por jornada en transacción; crea `pedidos` y `seguimiento`; upsert en `clientes`. (Con MP, más adelante: crea la preferencia y devuelve `init_point`) | 2 |
| `espejarSeguimiento` | trigger `pedidos` onUpdate | Copia a `seguimiento/{token}` estado, demora, motivo y estado del pago | 2 |
| `cancelarPedidoCliente` | callable (sin cuenta; el token del seguimiento es la credencial) | El cliente cancela su pedido mientras el local no lo aceptó | 2 |
| `cancelarPedidosSinConfirmar` | scheduled (cada 5 min) | Cancela los pedidos de clientes nuevos que no se confirmaron por WhatsApp a tiempo (`confirmarAntesDe`) | 2 |
| `registrarClienteEntregado` | trigger `pedidos` onUpdate | Al entregar, suma `clientes/{tel}.entregados`: el cliente pasa a ser de confianza | 2 |
| `mpWebhookPedidos` | https | Valida la firma HMAC (`x-signature`), consulta el pago y actualiza `pagos` y `estadoPago` | después |
| `contabilizarPedido` | trigger `pedidos` onWrite | Cuando el pedido queda **pagado y no anulado**, suma en `statsDiarias/{jornada}` y en la caja abierta; si después se cancela o se deshace el cobro, resta lo mismo (una caja ya cerrada no se toca). Idempotente: relee el pedido en transacción con `contabilizado` como candado. Reemplaza a `revertirContabilizacion` | 4 |
| `abrirCaja` / `cerrarCaja` | callable (dueño/encargado) | Abre con efectivo inicial (una sola caja abierta, candado en `contadores/caja`). Cierra: esperado = inicial + cobros + ingresos − egresos, contra lo contado; guarda la foto del cierre y registra en `auditoria` | 4 |
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
- [x] Empaquetar las Functions para el deploy con `esbuild` (`functions/empaquetar.mjs` → `functions/deploy/`: un `index.js` con `@app/shared` adentro y un `package.json` sin dependencias internas).

**Silverio en producción**
- [ ] Revisar con el dueño la lista pendiente de [`silverio/SILVERIO.md` §7](silverio/SILVERIO.md#7-pendiente-de-confirmar-con-el-dueño-antes-de-la-fase-1).
- [ ] Cargar la carta real y los precios actualizados (el dueño lo hace desde el panel, como prueba de usabilidad).
- [ ] Deploy a producción y apuntar el dominio de Silverio. La web vieja queda de respaldo 2 semanas.
- [ ] Mantener el ID de GA4 `G-8CN2SBDQ5R`.

✅ **Listo cuando:** la web de Silverio corre en producción, el dueño cambió precios y marcó agotados solo, y Lighthouse móvil da ≥ 90 en rendimiento y SEO.

> **Excepción (2026-09-29):** Silverio está en producción como **demo**. Los datos finales (carta y precios reales, dirección nueva, horarios confirmados, dominio) quedan pendientes y se avanzó a la Fase 2 por pedido explícito. Las casillas de arriba se cierran cuando el dueño valide la demo.

---

### Fase 2: Pedidos online (3–4 semanas), el corazón del producto

**Alcance mínimo (1.8):** cobros **manuales**. El cliente elige efectivo o transferencia y el local marca "pagado" en el panel. Mercado Pago, zonas con costo, impresión, pausa de pedidos y lista de clientes pasan a "Después" (abajo), sin fecha, cuando algún local los pida.

**Cliente**
- [x] Modal de producto: variante, extras (respeta mín/máx), cantidad y nota. *(hecho en la Fase 1)*
- [x] Carrito: drawer persistente, editar y quitar, subtotal en vivo con `precios.ts`. *(hecho en la Fase 1)*
- [x] Checkout con `crearPedido`:
  - tipo (take away, delivery o salón según config), nombre y **WhatsApp** (se normaliza a 549…);
  - delivery: dirección y referencia (sin zonas: el envío se arregla con el local);
  - pedido mínimo;
  - medio de pago: efectivo ("¿con cuánto pagás?") o transferencia (muestra alias y titular).
- [x] Si el local está cerrado, no se puede confirmar y se explica por qué (el servidor además valida pausa, pedidos habilitados, tipo y medio de pago).
- [x] Confirmación con número de pedido, link de seguimiento y botón opcional "Avisar por WhatsApp" (o "Mandar comprobante" si paga por transferencia); acceso para retomar el último seguimiento desde la portada en el mismo navegador y ocultarlo sin cambiar el estado del pedido.
- [x] Seguimiento `/pedido/[token]`: estado en tiempo real, demora estimada, ítems, total, cómo pagar y datos del local (`noindex`).

**Backend**
- [x] `crearPedido` (ver §8): valida, recalcula precios, número correlativo **por jornada** (corte 06:00), `seguimiento` y `clientes`; límite de 1 pedido por minuto por teléfono. También lo usa el panel para la carga manual.
- [x] `espejarSeguimiento`.
- [ ] App Check (reCAPTCHA Enterprise) registrado con el dominio de producción, y `enforceAppCheck` en `crearPedido`.

**Panel de pedidos**
- [x] Tablero (Nuevos · En preparación · Listos/en camino) de la jornada, en columnas en PC y pestañas en el celular; terminados plegados.
- [x] **Sonido** al entrar un pedido (botón para activarlo, que el navegador exige) y contador en la pestaña.
- [x] Aceptar (va directo a preparación), avanzar de estado, rechazar o cancelar con motivo (lo ve el cliente), ajustar la demora.
- [x] Detalle con ítems, extras y notas bien visibles, datos del cliente, links a WhatsApp y Maps.
- [x] Mensajes rápidos por WhatsApp según el estado ("Tu pedido #12 está listo para retirar 🙌").
- [x] **Cobrar**: efectivo (con vuelto) o transferencia, pagos parciales y "deshacer cobro". Totales del día: efectivo, transferencias y por cobrar.
- [x] **Carga manual** de pedidos (mostrador o teléfono): carta con buscador, variantes y extras, "ya pagó". Entra directo a preparación.
- [x] El menú del panel muestra solo lo que ya existe (nada de secciones "Pronto").
- [x] Tablero con colores por etapa, minutos transcurridos con alerta, cobro en un toque con "Deshacer" y barra lateral de íconos en tablet (pensado para compu o tablet; el celular queda de respaldo).
- [x] **Entregar pide el cobro**: si falta pagar, "Cobrar y entregar" pregunta cómo pagó; se puede entregar sin cobrar y queda marcado en rojo ("Entregado sin cobrar") y en "Por cobrar".
- [x] **Delivery sin zonas**: el dueño lo prende en Configuración → Formas de entrega. El cliente deja la dirección; el local confirma zona y costo por WhatsApp y carga el envío en el pedido (se suma al total, lo ve el cliente en el seguimiento). La regla solo lo permite en delivery y con `total = subtotal − descuento + costoEnvio`.
- [x] **Pedidos falsos (sin registro de usuarios)**: los clientes nuevos (sin pedidos entregados) confirman por WhatsApp con un mensaje armado y el local toca "Ya confirmó"; si no confirman en 15 minutos, `cancelarPedidosSinConfirmar` los cancela. El dueño elige si se pueden aceptar sin confirmar. El cliente puede cancelar desde su seguimiento mientras no lo aceptaron. Números bloqueados desde el detalle del pedido (lista en Configuración para desbloquear); `crearPedido` los rechaza con un mensaje genérico.

**Calidad**
- [x] Tests de `pedidos.ts` (estados, pagos, jornada) y del esquema de `crearPedido`.
- [x] Prueba punta a punta en los emuladores: pedido web → panel → cobro → seguimiento.

**Después (cuando un local lo pida)**
- [ ] Mercado Pago con las credenciales del local (Secret Manager): Checkout Pro, `mpWebhookPedidos` con validación de firma y conciliación.
- [ ] Zonas de delivery con costo (alta, baja, modificación) y selector en el checkout.
- [ ] Pausar pedidos (15, 30 o 60 min) y abrir o cerrar a mano desde el panel.
- [ ] Imprimir ticket y comanda (CSS `@media print` para 58 y 80 mm).
- [ ] Clientes: lista con historial básico (los datos ya se guardan en `clientes`).
- [ ] Notificación del navegador con la pestaña en segundo plano.
- [ ] Tests e2e con Playwright.

✅ **Listo cuando:** Silverio toma **todos sus pedidos de un fin de semana** por la web y el mostrador sin perder ninguno, y cierra el día sabiendo cuánto entró en efectivo y cuánto por transferencia.

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

### Fase 4: Caja y reportes (2–3 semanas) → **hecha antes que la Fase 3**

**Orden (1.9):** a pedido, la Fase 4 se hizo antes que la 3: Silverio trabaja con retiro y lo que el dueño necesita es saber cuánto entró cada día. **Alcance "caja simple"** para locales chicos; lo demás queda en "Después".

**Caja**
- [x] Abrir caja con efectivo inicial. Solo una abierta a la vez (`abrirCaja`, candado en `contadores/caja`).
- [x] Todo cobro de un pedido se suma a la caja abierta; sin caja abierta, el panel de pedidos avisa para abrirla.
- [x] Movimientos de efectivo: entra o sale plata, con categoría (proveedor, cambio, retiro, otro). Solo en la caja abierta; no se editan ni borran.
- [x] **Cierre:** efectivo esperado contra contado (y transferencias contra el banco), diferencia en vivo, notas y registro en `auditoria` (`cerrarCaja`).
- [x] Historial de cierres (cuándo, quién, cuánto faltó o sobró).

**Contabilización**
- [x] `contabilizarPedido` (un solo trigger idempotente que suma y resta) con tests de `caja.ts` en shared.

**Reportes (página "Ventas" y Resumen)**
- [x] Hoy frente al mismo día de la semana anterior: vendido, pedidos y ticket promedio.
- [x] Ventas por día (7 o 30 días) con efectivo y transferencias.
- [x] Ranking de productos (cantidad y facturación) y horarios con más pedidos.
- [x] Resumen del panel con los números del día y el estado de la caja.

**Después (cuando un local lo pida)**
- [ ] Resumen de cierre imprimible y envío por WhatsApp o email al dueño.
- [ ] Ventas por rango libre, mapa de calor día × hora, ranking por categoría y composición por tipo.
- [ ] Clientes frecuentes.
- [ ] Exportar a Excel y CSV.

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
- **Stock del día por producto (prioridad alta dentro de "Después")**. Idea del 2026-09-29: simple a propósito, para diferenciarse de los sistemas con insumos y recetas.
  - Al abrir la caja (o cuando quiera), el encargado anota solo lo que se puede acabar: "hoy hay 50 hamburguesas, 30 lomos". Lo que no anota, no tiene límite.
  - Cada pedido descuenta en la misma transacción de `crearPedido`. Las promos descuentan los productos que incluyen. Cancelar o rechazar devuelve el stock.
  - Aviso en el panel (y sonido) cuando quedan pocas, por ejemplo 10 o el 20 %: "Quedan 8 hamburguesas".
  - Al llegar a 0, el producto pasa solo a **agotado** en la carta y la web no lo deja pedir. Con la jornada nueva el límite se borra y vuelve a estar disponible.
  - Modelo tentativo: en `productos`, `stockDia?: { jornada, inicial, quedan }`, lo escribe solo la Function. En el panel, una pantalla "Stock de hoy" con la lista y un número por producto.
  - Fuera de alcance: insumos, recetas, costos, proveedores y stock que pasa de un día al otro.
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
- Functions: `pnpm deploy:functions` (usa `firebase.deploy.json`, que empaqueta con esbuild en el predeploy). Los emuladores siguen usando `firebase.json` y el código de `functions/` tal cual.
- Reglas, índices y Storage: `pnpm deploy:reglas`.
- Más adelante: GitHub Action manual con aprobación.

---

## 16. Cómo crear la web de un local nuevo

Este repo (Silverio Club) es la **base**. La guía paso a paso, con comandos, está en el
[README](README.md#duplicar-para-un-local-nuevo). En resumen:

1. **Repo:** copia completa de este, con la base como remoto `base`.
2. **Firebase:** proyecto `<local>` en Blaze con alerta de presupuesto, Firestore y Storage en `southamerica-east1`, Auth solo con email y contraseña, app web registrada y alias `prod` en `.firebaserc`.
3. **Kit del local:** carpeta `<local>/` con `seed.json` (datos, textos de la web, entrega, pagos y carta), `assets/`, `<LOCAL>.md` y `manual/`. Desde 1.10, **todo lo propio del local está en el kit**: `scripts/seed.ts` es genérico.
4. **Variables y secretos:** `.env.local`, `functions/.env.<local>` (`WEB_URL`), `REVALIDATE_SECRET` en Secret Manager y `.env.vercel-produccion` para Vercel. Los secretos van a un gestor de contraseñas.
5. **Diseño:** `components/publico/` y estilos (lo propio del local; ver §11).
6. **Producción:** `pnpm deploy:reglas`, `pnpm deploy:functions` y `pnpm seed --proyecto <local> --si-estoy-seguro --dueno <email>`. Vercel con Root Directory `apps/web`; verificar `/api/salud`.
7. **Manual:** capturas del local nuevo en `<local>/manual/img` y PDF con `manual/a-pdf.mjs`.

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
- **1.8 (2026-09-29):** **Fase 2 mínima con cobros manuales**. Silverio queda en producción como demo (excepción a la Fase 1). El checkout crea el pedido con `crearPedido` (WhatsApp pasa a ser un aviso opcional), hay seguimiento en vivo en `/pedido/[token]` y el panel suma **Pedidos**: tablero de la jornada, sonido, estados, cobro en efectivo o transferencia con totales del día y carga manual de mostrador o teléfono. La numeración y los totales van por **jornada** (corte 06:00). Mercado Pago, zonas con costo, pausa, impresión y clientes pasan a "Después". El menú del panel oculta lo que todavía no existe.
- **1.9 (2026-09-29):** **Fase 4 antes que la 3**, con alcance de **caja simple**: abrir y cerrar caja (efectivo esperado contra contado), movimientos de efectivo, historial de cierres, página **Ventas** (hoy contra la semana pasada, por día, lo más vendido y horarios) y Resumen con números reales. `contabilizarPedido` cuenta el pedido cuando queda pagado y no anulado, y resta si se cancela o se deshace el cobro (reemplaza a `revertirContabilizacion`). Nuevas callables `abrirCaja` y `cerrarCaja`. Los movimientos solo se anotan en la caja abierta. El menú muestra las fases hechas (0, 1, 2 y 4); "Reportes" pasa a llamarse "Ventas".
- **1.10 (2026-09-29):** **base lista para copiar**. Todo lo propio del local pasa al kit: textos de la web, SEO, GA4, fuentes, entrega y pagos salen de `silverio/seed.json` (antes estaban en `scripts/seed.ts`). README con stack y guía de duplicado; manual de usuario en PDF en `silverio/manual/`. Login solo con email (sin Google), límite de 5 intentos y "Mi cuenta" para cambiar la contraseña. Entregar pide el cobro; delivery sin zonas con envío a confirmar. `firebase-admin/auth` fuera de la web (fallaba en Vercel) y `/api/salud` para diagnosticar.
- **1.11 (2026-09-30):** **pedidos falsos sin registro de usuarios**: confirmación por WhatsApp para clientes nuevos con vencimiento de 15 minutos (`cancelarPedidosSinConfirmar`), cancelación del cliente desde el seguimiento (`cancelarPedidoCliente`), números bloqueados (`bloqueados/{telefono}`, con reglas y tests) y clientes de confianza al recibir su primer pedido (`registrarClienteEntregado`). Configurable en Configuración → Pedidos falsos. Comprobantes de transferencia: por WhatsApp, como hasta ahora.
