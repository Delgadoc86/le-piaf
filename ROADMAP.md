# MiMenu: roadmap y especificación técnica

> Plataforma de gestión gastronómica tipo "semi-FUDO" para locales chicos y medianos.
> **Cliente piloto:** Silverio Food Truck Beer (ver [`silverio/SILVERIO.md`](silverio/SILVERIO.md)).
> **Objetivo:** que funcione de verdad en Silverio y después venderla como **suscripción mensual** a otros locales.

Versión del documento: 1.2, del 2026-09-28.

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

---

## 1. Visión y alcance

**Problema:** el local chico o mediano está entre dos opciones. Por un lado, "carta QR + WhatsApp", que es desordenada y no da números. Por otro, un POS completo como Fudo o Maxirest, que es caro, complejo y del que usa el 20%.

**Propuesta:** una sola plataforma con web propia del local, carta, pedidos online **sin comisión**, salón y cocina, caja y reportes. Se configura en una tarde.

### Dentro del alcance
- Web pública del local con su marca y carta digital con QR.
- Pedidos online: take away, delivery y en mesa.
- Panel de pedidos en tiempo real y pantalla de cocina.
- Mesas y app de mozo (PWA).
- Caja por turnos y reportes de ventas.
- Cobro con efectivo, transferencia y Mercado Pago.
- Multi-local (SaaS) con planes y suscripción.

### Fuera del alcance (explícito)
- ❌ Facturación electrónica ARCA/AFIP.
- ❌ Stock por insumos o recetas (a lo sumo, stock simple por producto, más adelante).
- ❌ Integración con PedidosYa o Rappi.
- ❌ Apps nativas en tiendas: todo es web/PWA.

---

## 2. Decisiones técnicas

| Capa | Elección | Motivo |
|---|---|---|
| Framework | **Next.js** (última estable, App Router) | SSR/cache para SEO de la carta de cada local, API routes, `next/image`, `next/og` |
| Lenguaje | **TypeScript** estricto | Tipos compartidos entre app y Cloud Functions |
| UI | **Tailwind CSS** + **shadcn/ui** (Radix) + **lucide-react** | La marca de cada local se aplica con variables CSS; bundle liviano para la carta en celulares |
| Formularios | react-hook-form + **zod** | Los mismos esquemas zod validan en el front y en las Functions |
| Estado cliente | **zustand** (carrito, UI) | Chico y simple; los datos de Firestore se leen con hooks propios |
| Backend | **Firebase**: Auth, Firestore, Storage, Cloud Functions (2ª gen), App Check | Tiempo real nativo, cache offline para el panel, ya conocido |
| Pagos | **Mercado Pago**: Checkout Pro (pedidos) y Suscripciones/preapproval (planes) | Estándar en Argentina |
| Hosting | **Vercel** (web) + Firebase (Functions) | Deploy directo de Next.js |
| Paquetes | **pnpm** workspaces | App, Functions y paquete compartido en un solo repo |
| Tests | **Vitest**, **@firebase/rules-unit-testing** (emuladores), **Playwright** (e2e desde Fase 2) | Las reglas de seguridad se testean sí o sí |
| Calidad | ESLint + Prettier + GitHub Actions (lint, typecheck, tests de reglas) | |
| Fechas | date-fns + date-fns-tz | Zona horaria por local (Argentina) |
| Gráficos | Recharts | Reportes (Fase 4) |
| Otros | `qrcode` (QRs), `browser-image-compression` (fotos → webp), `@dnd-kit` (ordenar), `xlsx`/SheetJS (exportar), `@serwist/next` (PWA) | |

> **Por qué no MUI (como en el proyecto viejo):** cada local necesita su propia paleta y tipografía en tiempo de ejecución. Con Tailwind y variables CSS eso es trivial, y la carta pública carga mucho más rápido en celular.

---

## 3. Arquitectura

```
                        ┌──────────────────────────────────────────┐
  Cliente final  ──────▶│  Next.js en Vercel                       │
  (celular)             │  /[slug]  web + carta (Server Components │
                        │           + cache con revalidación)      │
                        │  /[slug]/checkout (client island)        │
  Staff          ──────▶│  /panel/[localId]/…  (client, realtime)  │
  (PWA mozo/cocina)     │  /admin  (superadmin plataforma)         │
                        └───────┬───────────────┬──────────────────┘
                     Admin SDK  │               │  Firebase JS SDK
                    (lecturas   │               │  (Auth, onSnapshot,
                     públicas)  ▼               ▼   Storage)
                        ┌──────────────────────────────────────────┐
                        │  Firebase                                │
                        │  Auth · Firestore · Storage · App Check  │
                        │  Cloud Functions:                        │
                        │   - crearPedido (callable, recalcula $)  │
                        │   - triggers: stats, claims, revalidate  │
                        │   - webhooks Mercado Pago                │
                        └───────┬──────────────────────────────────┘
                                ▼
                        Mercado Pago (pagos de pedidos: cuenta DEL LOCAL;
                                      suscripciones: cuenta DE LA PLATAFORMA)
```

### Principios
1. **El cliente final nunca escribe precios.** Los pedidos se crean solo desde la Function `crearPedido`, que recalcula todo desde la base.
2. **La web pública no lee Firestore en cada visita.** Next.js lee con el Admin SDK, cachea por etiqueta y una Function invalida la cache cuando cambia la carta.
3. **Aislamiento por local.** Todo cuelga de `locales/{localId}` y las reglas validan la pertenencia con custom claims.
4. **Los agregados se calculan en el servidor.** Los reportes leen un documento por día (`statsDiarias`), nunca todos los pedidos.
5. **Dinero en pesos enteros** (`number`, sin decimales).

---

## 4. Estructura del repositorio

```
mimenu/
├─ CLAUDE.md                     # instrucciones para Claude Code
├─ ROADMAP.md                    # este documento
├─ silverio/                     # kit del cliente piloto (seed.json, assets, SILVERIO.md)
├─ pnpm-workspace.yaml
├─ firebase.json  .firebaserc
├─ firestore.rules  firestore.indexes.json  storage.rules
├─ apps/
│  └─ web/                       # Next.js
│     └─ src/
│        ├─ app/
│        │  ├─ (marketing)/page.tsx            # landing de la plataforma (Fase 5)
│        │  ├─ (auth)/login/  (auth)/registro/
│        │  ├─ [slug]/                          # web pública del local
│        │  │  ├─ layout.tsx                    # inyecta marca (CSS vars, fuente)
│        │  │  ├─ page.tsx                      # hero, promos, carta, nosotros, ubicación
│        │  │  ├─ carta/page.tsx
│        │  │  ├─ checkout/page.tsx
│        │  │  ├─ pedido/[token]/page.tsx       # seguimiento
│        │  │  ├─ mesa/[mesaId]/page.tsx        # entrada por QR de mesa
│        │  │  ├─ opengraph-image.tsx
│        │  │  └─ sitemap.ts
│        │  ├─ panel/
│        │  │  ├─ page.tsx                      # selector de local
│        │  │  └─ [localId]/
│        │  │     ├─ page.tsx                   # resumen del día
│        │  │     ├─ pedidos/  cocina/  salon/  caja/
│        │  │     ├─ carta/  promos/  mesas/  zonas/
│        │  │     ├─ reportes/  clientes/
│        │  │     └─ configuracion/  equipo/  suscripcion/
│        │  ├─ admin/                           # superadmin
│        │  └─ api/revalidate/route.ts
│        ├─ components/
│        │  ├─ ui/                              # shadcn
│        │  ├─ publico/                         # Hero, CartaLista, PromoCarrusel…
│        │  └─ panel/                           # KanbanPedidos, TicketImprimible…
│        ├─ features/                           # lógica por dominio (hooks + servicios)
│        │  ├─ carta/  pedidos/  salon/  caja/  reportes/  auth/  local/
│        ├─ lib/
│        │  ├─ firebase/client.ts               # SDK cliente (singleton, cache persistente)
│        │  ├─ firebase/admin.ts                # Admin SDK (solo servidor)
│        │  └─ utils.ts
│        └─ styles/globals.css
├─ functions/
│  └─ src/
│     ├─ index.ts
│     ├─ pedidos/  pagos/  suscripciones/  stats/  auth/  cache/  util/
├─ packages/
│  └─ shared/
│     └─ src/
│        ├─ tipos.ts             # tipos del dominio
│        ├─ esquemas.ts          # zod
│        ├─ dinero.ts            # formatARS, redondeos
│        ├─ horarios.ts          # estaAbierto(local, fecha)
│        ├─ precios.ts           # calcularItem, calcularPedido (usado en front Y en Function)
│        └─ constantes.ts        # estados, roles, límites por plan
├─ scripts/
│  ├─ seed.ts                    # carga silverio/seed.json + local "demo" en emulador o proyecto
│  └─ subir-assets.ts            # sube silverio/assets a Storage
└─ tests/
   ├─ reglas/                    # tests de firestore.rules y storage.rules
   └─ e2e/                       # Playwright
```

---

## 5. Modelo de datos (Firestore)

Notación: `coleccion/{id}` → campos. `ts` = `Timestamp`. `$` = entero en pesos.

### Nivel raíz

```ts
usuarios/{uid}
  email, nombre, telefono?, creadoEn: ts
  superAdmin?: boolean                 // solo escribible por Functions

slugs/{slug}                            // garantiza unicidad del slug
  localId

plataforma/config
  planes: Record<PlanId, { nombre, precioMensual: $, limites: Limites, features: Feature[] }>
  diasPrueba: number
```

### Local

```ts
locales/{localId}
  slug, nombre, nombreCorto, bajada?, descripcionCorta
  activo: boolean
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
    estilo: {                              // variantes de diseño (ver §11 "Diseño por local")
      hero: "pantalla_completa"|"partido"|"compacto"
      promos: "carrusel"|"grilla"
      carta: "lista"|"tarjetas"|"fotos"
      nosotros: "clasico"|"destacado"
      bordes: "redondeado"|"recto"|"pill"
      titulosSeccion: "simple"|"overline"   // overline = etiqueta en mayúsculas + título + barrita
      separadores: "ninguno"|"linea"|"degradado"
      botones: "solido"|"contorno"|"pulso"
    }
    hero: { bajada, titulo, textoBoton }
    nosotros: { titulo, parrafos: string[], fotoUrl, frase, tarjetas: {icono,titulo,texto}[], cierre }
    galeria: { fotoUrl, titulo }[]
    notaCarta?: string
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
    mercadoPago: { habilitado, conectado: boolean }   // tokens en /privado
  }
  suscripcion: {                           // SOLO Functions escriben
    plan: PlanId, estado: "prueba"|"activa"|"en_mora"|"suspendida"|"cancelada"
    pruebaHasta?: ts, proximoCobro?: ts, mpPreapprovalId?
  }
  duenoUid, creadoEn, actualizadoEn
```

### Subcolecciones del local

```ts
locales/{localId}/miembros/{uid}
  rol: "dueno"|"encargado"|"mozo"|"cocina", nombre, email, activo, creadoEn

locales/{localId}/privado/mercadopago          // reglas: nadie lee ni escribe desde el cliente
  accessToken, refreshToken, userId, expiraEn

locales/{localId}/categorias/{categoriaId}
  nombre, orden, visible, icono?, descripcion?

locales/{localId}/productos/{productoId}
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

locales/{localId}/promos/{promoId}
  titulo, descripcion, precio: $, fotoUrl?, orden, activa
  items?: { productoId, varianteId?, cantidad }[]       // qué incluye (para cocina y stats)
  vigencia?: { dias: number[], desde?: "HH:mm", hasta?: "HH:mm", fechaFin?: ts }

locales/{localId}/zonasDelivery/{zonaId}
  nombre, costo: $, pedidoMinimo?: $, activa, orden

locales/{localId}/mesas/{mesaId}
  nombre ("Mesa 4"), sector ("Salón"|"Patio"|"Barra"), capacidad, orden
  estado: "libre"|"ocupada"|"cuenta"          // denormalizado para el plano
  pedidoActualId?, qrToken                     // qrToken rota al cerrar la mesa

locales/{localId}/pedidos/{pedidoId}
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
  seguimientoToken                             // para /[slug]/pedido/[token]
  contabilizado: boolean                       // idempotencia de stats
  historial: { estado, en: ts, porUid? }[]
  creadoEn: ts, actualizadoEn: ts

locales/{localId}/seguimiento/{token}         // espejo PÚBLICO mínimo (get sí, list no)
  numero, estado, tipo, tiempoEstimadoMin, actualizadoEn, localNombre

locales/{localId}/contadores/{YYYY-MM-DD}
  ultimoNumero

locales/{localId}/clientes/{telefono}
  nombre, telefono, direcciones: string[], cantidadPedidos, totalGastado: $, ultimoPedido: ts

locales/{localId}/turnosCaja/{turnoId}
  estado: "abierto"|"cerrado"
  abiertoPor, abiertoEn, montoInicial: $
  totales: Record<MedioPago, $>                 // actualizado por Function
  cantidadPedidos
  cerradoPor?, cerradoEn?, contado?: Record<MedioPago, $>, diferencia?: Record<MedioPago, $>, notas?

locales/{localId}/turnosCaja/{turnoId}/movimientos/{movId}
  tipo: "ingreso"|"egreso", categoria ("proveedor"|"cambio"|"retiro"|"otro"), monto: $, detalle, porUid, en: ts

locales/{localId}/statsDiarias/{YYYY-MM-DD}    // SOLO Functions escriben
  ventas: $, pedidos, ticketPromedio: $, cancelados
  porTipo: Record<Tipo, { ventas, pedidos }>
  porMedio: Record<MedioPago, $>
  porHora: Record<"00".."23", { ventas, pedidos }>
  porProducto: Record<productoId, { nombre, cantidad, ventas }>

locales/{localId}/auditoria/{id}               // cambios sensibles (precios masivos, cierres de caja, cancelaciones)
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

**Custom claims** en el token (los sincroniza una Function cuando cambia `miembros`):
```json
{ "sa": true, "l": { "<localId>": "dueno" | "encargado" | "mozo" | "cocina" } }
```
El cliente fuerza el refresco del token con `getIdToken(true)` cuando `usuarios/{uid}.claimsVersion` cambia.

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
| Suscripción y pagos de la plataforma | ✅ | — | — | — |

**Superadmin** (`sa`): acceso de lectura a todos los locales para soporte, activar o suspender, y panel `/admin`.

---

## 7. Reglas de seguridad

Principios:
- **Denegar por defecto.**
- Lectura pública **solo** de: `locales/{id}` (sin `privado`), `categorias`, `productos`, `promos`, `zonasDelivery`, y `seguimiento/{token}` (solo `get`, nunca `list`).
- `pedidos`: el cliente final **no crea** pedidos (los crea `crearPedido` con el Admin SDK). El staff solo actualiza campos permitidos según su rol (`estado`, `items[].estadoCocina`, `pagos`…).
- `suscripcion`, `statsDiarias`, `contadores`, `privado`, `usuarios.superAdmin`: solo Functions.
- Validar tipos y campos permitidos en cada escritura (`request.resource.data.keys().hasOnly([...])`).
- **Storage:** `locales/{localId}/**` se escribe solo por dueño o encargado, solo imágenes de hasta 2 MB; lectura pública.

Esqueleto:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function signedIn() { return request.auth != null; }
    function rol(localId) { return signedIn() ? request.auth.token.l[localId] : null; }
    function esSA() { return signedIn() && request.auth.token.sa == true; }
    function esStaff(localId) { return rol(localId) in ['dueno','encargado','mozo','cocina'] || esSA(); }
    function esGestor(localId) { return rol(localId) in ['dueno','encargado'] || esSA(); }

    match /locales/{localId} {
      allow read: if true;
      allow update: if rol(localId) == 'dueno'
        && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['suscripcion','duenoUid','slug']);

      match /categorias/{id}  { allow read: if true; allow write: if esGestor(localId); }
      match /productos/{id}   { allow read: if true; allow write: if esGestor(localId);
                                allow update: if esStaff(localId)
                                  && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['disponible','actualizadoEn']); }
      match /promos/{id}      { allow read: if true; allow write: if esGestor(localId); }
      match /seguimiento/{t}  { allow get: if true; allow list, write: if false; }
      match /pedidos/{id}     { allow read: if esStaff(localId); allow create, delete: if false;
                                allow update: if esStaff(localId) /* + validación de campos por rol */; }
      match /privado/{doc}    { allow read, write: if false; }
      match /statsDiarias/{d} { allow read: if esGestor(localId); allow write: if false; }
      // … resto según §5
    }
  }
}
```
> Cada regla lleva su test en `tests/reglas/`. Caso crítico: **un usuario del local A no puede leer ni escribir nada del local B.**

---

## 8. Cloud Functions

| Function | Tipo | Qué hace | Fase |
|---|---|---|---|
| `sincronizarClaims` | trigger `miembros` onWrite | Recalcula los custom claims del usuario y sube `claimsVersion` | 0 |
| `crearLocal` | callable | Valida el slug, crea `locales`, `slugs`, `miembros` (dueño), suscripción en prueba | 0 / 5 |
| `invitarMiembro` | callable | Crea o busca el usuario por email, crea `miembros`, manda email | 0 |
| `revalidarWeb` | trigger en `locales`, `categorias`, `productos`, `promos` | POST a `/api/revalidate` con secreto → `revalidateTag('local:{id}')` | 1 |
| `crearPedido` | callable (App Check) | Valida el esquema zod, local activo y abierto, disponibilidad, zona y mínimo; **recalcula precios** con `packages/shared/precios.ts`; número correlativo por transacción; crea `pedidos` y `seguimiento`; upsert en `clientes`; si paga con MP, crea la preferencia y devuelve `init_point` | 2 |
| `espejarSeguimiento` | trigger `pedidos` onUpdate | Actualiza `seguimiento/{token}` | 2 |
| `mpOAuthCallback` | https | Intercambia el code por tokens de MP del local → `privado/mercadopago` | 2 |
| `mpWebhookPedidos` | https | Valida la firma HMAC (`x-signature`), consulta el pago y actualiza `pagos` y `estadoPago` | 2 |
| `contabilizarPedido` | trigger `pedidos` onUpdate | Al cerrar o entregar y estar pagado: suma en `statsDiarias` y en el `turnosCaja` abierto (con `contabilizado` como candado) | 4 |
| `revertirContabilizacion` | trigger `pedidos` onUpdate | Si un pedido contabilizado se cancela, resta | 4 |
| `crearSuscripcion` | callable | Crea el preapproval de MP con la cuenta de la plataforma | 5 |
| `mpWebhookSuscripciones` | https | Actualiza `locales.suscripcion` | 5 |
| `controlSuscripciones` | scheduled (diario) | Fin de prueba, mora → suspendida, emails | 5 |
| `limpiezaDiaria` | scheduled | Rota los `qrToken` de mesas libres, archiva seguimientos viejos | 3 |

Región: `southamerica-east1` (São Paulo), la más cercana a Argentina. Secretos (tokens de MP de la plataforma, secreto de revalidación) en **Secret Manager** vía `defineSecret`.

---

## 9. Rutas de la app

| Ruta | Quién | Render |
|---|---|---|
| `/` | Público | Landing comercial de MiMenu (Fase 5; antes redirige a `/silverio` o a `/login`) |
| `/login`, `/registro` | Público | Client |
| `/[slug]` | Público | Server Component con cache por etiqueta |
| `/[slug]/carta` | Público | Igual; carta completa con buscador y tabs de categoría fijas |
| `/[slug]/checkout` | Público | Client island (carrito en zustand persistido por slug) |
| `/[slug]/pedido/[token]` | Público | Client, `onSnapshot` sobre `seguimiento/{token}` |
| `/[slug]/mesa/[mesaId]?k=qrToken` | Público | Carta en modo mesa |
| `/panel` | Staff | Selector de local |
| `/panel/[localId]/…` | Staff | Client, tiempo real, menú lateral según rol |
| `/admin` | Superadmin | Client |
| `/api/revalidate` | Functions | Route handler con secreto |

**Dominios propios** (plan superior, Fase 5+): el middleware mapea `host → slug` leyendo `dominios/{host}` (cacheado).

---

## 10. Rendimiento y costos

Firestore cobra por lectura. Estas reglas mantienen la factura baja y la app rápida:

- **Web pública:** Server Components leen con el Admin SDK una sola vez y cachean (`unstable_cache` / `"use cache"` con `cacheTag('local:{id}')`). Las visitas no generan lecturas. La cache se invalida sola con `revalidarWeb`.
- **Carrito y checkout** son la única parte "client" de la web pública. El resto es HTML del servidor, con Lighthouse móvil ≥ 90 como objetivo.
- **Imágenes:** se comprimen en el navegador antes de subir (webp, máximo 1600 px, ~200 KB) y se sirven con `next/image`.
- **Listeners acotados:** el panel escucha solo pedidos activos (`estado in [...]`, `limit`). El historial es paginado y sin tiempo real.
- **Reportes:** leen `statsDiarias` (un documento por día), así que un mes cuesta unas 30 lecturas.
- **Panel offline:** `initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })`. Si se corta internet, el mozo sigue viendo y cargando datos, y se sincroniza al volver.
- **Code splitting:** el panel y la web pública no comparten bundle pesado.
- **Presupuesto:** plan Blaze con **alertas de presupuesto** configuradas desde el día 1.

---

## 11. Convenciones

- **Idioma:** la UI está en español rioplatense (vos) en el panel. Los textos públicos los edita cada local. El **dominio** del código va en español (`pedido`, `producto`, `turnoCaja`) y lo técnico en inglés cuando es estándar (`useAuth`, `route.ts`).
- **Dinero:** enteros en pesos. Formato con `Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })`.
- **Fechas:** `serverTimestamp()` al escribir; se muestran en la `zonaHoraria` del local. Las claves de día (`YYYY-MM-DD`) se calculan en la zona del local, y un turno que cruza la medianoche cuenta para el día en que abrió.
- **Validación:** todo input pasa por un esquema zod de `packages/shared`, en el front y en las Functions.
- **Fuentes por local:** lista curada precargada con `next/font`: Sriracha, Bebas Neue, Poppins, Playfair Display, Oswald, Roboto, Inter y Montserrat. El local elige una para títulos y otra para texto, y se aplican vía variables CSS.
- **Marca por local:** `[slug]/layout.tsx` inyecta `--color-primario`, etc. Tailwind los consume (`bg-[var(--color-primario)]` o tokens del tema).
- **Diseño por local (3 niveles).** Todos los locales comparten el código, pero cada web se ve propia:
  1. **Marca** (`marca`): colores, fuentes, logo, favicon, fotos del hero. La edita el dueño.
  2. **Variantes de diseño** (`web.estilo`): cada sección tiene 2–3 diseños (hero a pantalla completa, partido o compacto; carta en lista, tarjetas o con fotos grandes; etc.) y hay estilos globales (bordes, títulos con overline, separadores degradados, botones con pulso). Los componentes de `components/publico/` reciben la variante y la resuelven con clases; agregar una variante nueva la deja disponible para todos los locales.
  3. **A medida** (plan superior o acuerdo puntual): un componente propio en `components/publico/a-medida/{localId}/`, registrado en `a-medida/index.ts` como reemplazo de una sección para ese local. Sigue en el mismo repo, así que recibe todos los arreglos compartidos. Usarlo solo cuando las variantes no alcanzan.
  - Silverio usa: hero `pantalla_completa`, títulos `overline`, separadores `degradado`, botones `pulso`, bordes `redondeado`.
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
- [ ] GitHub Actions: lint, typecheck, build y tests de reglas contra el emulador. *(workflow escrito y verificado localmente; falta la primera corrida en GitHub)*

**Firebase**
- [ ] Proyectos `mimenu-dev` y `mimenu-prod`, plan Blaze y alertas de presupuesto.
- [x] `firebase.json` con emuladores (Auth, Firestore, Storage, Functions) y `pnpm dev` que levante todo.
- [x] Región de Functions `southamerica-east1`.
- [ ] App Check (reCAPTCHA Enterprise) registrado; se hace obligatorio en `crearPedido` en la Fase 2.

**Dominio compartido**
- [x] `packages/shared`: tipos del §5, esquemas zod, `dinero.ts`, `horarios.ts` (`estaAbierto`, con test de horarios que cruzan medianoche), `precios.ts` (`calcularItem`, `calcularPedido`, con tests).

**Auth y multi-local**
- [x] Login con email/contraseña y Google; recuperación de contraseña.
- [x] Functions `sincronizarClaims`, `crearLocal` e `invitarMiembro`. *(`invitarMiembro` devuelve un link para elegir contraseña, que el dueño manda por WhatsApp, hasta que haya emails en la Fase 5)*
- [x] Hook `useSesion()` con usuario, claims, locales y rol activo.
- [x] Panel base: layout con barra lateral según rol, selector de local y página "resumen" vacía. *(incluye la página Equipo para invitar miembros)*
- [x] `firestore.rules` y `storage.rules` v1 con tests de aislamiento entre locales.

**Datos**
- [x] `scripts/seed.ts`: crea el local **silverio** desde `silverio/seed.json` y un local **demo**, en el emulador o el proyecto elegido.
- [x] `scripts/subir-assets.ts`: sube `silverio/assets/**` a Storage y actualiza las URLs.

✅ **Listo cuando:** con los emuladores corriendo, un dueño de "silverio" y uno de "demo" entran al panel y **cada uno ve solo su local**, y los tests de reglas pasan en CI.

---

### Fase 1: Carta y web pública (2–3 semanas) → 🚀 Silverio sale a producción

**Panel: configuración del local**
- [ ] Datos, contacto, dirección (con link de Maps) y horarios (editor por día, con cierres especiales).
- [ ] Marca: colores (con vista previa en vivo y aviso de contraste), fuentes (lista curada), logo, favicon, hero para escritorio y móvil.
- [ ] Contenido web: hero, nosotros (párrafos, tarjetas, frase, cierre), galería, nota de la carta, secciones visibles y su orden, SEO e ID de GA4.
- [ ] **Diseño:** selector de variantes por sección y estilos globales (`web.estilo`), con vista previa en vivo de la web.

**Panel: carta**
- [ ] Categorías: alta, baja, modificación, ordenar con arrastrar, visible/oculta.
- [ ] Productos: alta, baja, modificación con foto (comprimida), variantes, grupos de extras (mín/máx), etiquetas, estación, días disponibles, visible, **agotado con un toque** desde la lista.
- [ ] Promos: alta, baja, modificación con foto, ítems incluidos y vigencia por días y horario.
- [ ] **Actualización masiva de precios:** alcance (todo, categorías, productos seleccionados), % o monto fijo, redondeo (a 10, 50, 100 o 500), **vista previa antes/después**, aplicación con `writeBatch` en lotes de 500 y registro en `auditoria`.
- [ ] Duplicar producto y buscador en la lista.

**Web pública `/[slug]`**
- [ ] Layout con la marca del local (variables CSS y fuentes).
- [ ] Variantes de diseño de cada sección y estilos globales según `web.estilo` (§11), incluidas las que necesita Silverio.
- [ ] Registro de componentes **a medida** por local (`components/publico/a-medida/`), vacío por ahora.
- [ ] Navbar con logo, anclas y un indicador **Abierto / Cerrado · abre a las 20:00**.
- [ ] Hero (fotos distintas para escritorio y móvil, que no tapen contenido en móvil).
- [ ] Carrusel de promos táctil, con solo las promos vigentes ahora.
- [ ] Carta: tabs de categoría fijas con scroll, buscador, fichas con foto, variantes y extras visibles, "Agotado" y etiquetas.
- [ ] Nosotros, galería, ubicación (mapa embebido y "Cómo llegar"), footer con redes y horarios.
- [ ] Botón flotante de WhatsApp con mensaje configurable.
- [ ] SEO: `generateMetadata`, JSON-LD `Restaurant` generado desde los datos, `sitemap.ts`, `robots.ts`, `opengraph-image.tsx` dinámica.
- [ ] GA4 con el ID del local.
- [ ] Página 404 del local y local inactivo → "Volvemos pronto".

**Infra**
- [ ] `revalidarWeb` + `/api/revalidate`: un cambio en el panel se ve en la web en segundos.
- [ ] **Generador de QR:** carta general, PNG y PDF listos para imprimir con el logo del local.

**Silverio en producción**
- [ ] Revisar con el dueño la lista pendiente de [`silverio/SILVERIO.md` §7](silverio/SILVERIO.md#7-pendiente-de-confirmar-con-el-dueño-antes-de-la-fase-1).
- [ ] Cargar la carta real y los precios actualizados (el dueño lo hace desde el panel, como prueba de usabilidad).
- [ ] Deploy a producción y apuntar el dominio de Silverio. La web vieja queda de respaldo 2 semanas.
- [ ] Mantener el ID de GA4 `G-8CN2SBDQ5R`.

✅ **Listo cuando:** la web de Silverio corre en la plataforma, el dueño cambió precios y marcó agotados solo, y Lighthouse móvil da ≥ 90 en rendimiento y SEO.

---

### Fase 2: Pedidos online (3–4 semanas), el corazón del producto

**Cliente**
- [ ] Modal de producto: variante, extras (respeta mín/máx), cantidad y nota.
- [ ] Carrito: drawer persistente por local, editar y quitar, subtotal en vivo con `precios.ts`.
- [ ] Checkout:
  - tipo (take away, delivery o salón según config), nombre y teléfono;
  - delivery: dirección, referencia y selector de zona con costo;
  - pedido mínimo;
  - medio de pago: efectivo ("¿con cuánto pagás?"), transferencia (muestra alias y titular) o Mercado Pago.
- [ ] Si el local está cerrado o pausado, no se puede confirmar y se explica por qué.
- [ ] Confirmación con número de pedido, link de seguimiento y botón opcional "Avisar por WhatsApp" con el mensaje armado.
- [ ] Seguimiento `/[slug]/pedido/[token]`: estado en tiempo real, tiempo estimado y datos del local.

**Backend**
- [ ] `crearPedido` (ver §8) con App Check obligatorio y límite de frecuencia por teléfono.
- [ ] `espejarSeguimiento`.
- [ ] Mercado Pago: vinculación **OAuth** de la cuenta del local, preferencia de Checkout Pro, `mpWebhookPedidos` con validación de firma, y conciliación del estado del pago.

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

✅ **Listo cuando:** Silverio toma **todos sus pedidos de un fin de semana** por la plataforma sin perder ninguno, y cobra al menos uno con Mercado Pago.

---

### Fase 3: Salón y cocina (3–4 semanas)

**Mesas**
- [ ] Mesas: alta, baja, modificación, por sector (Salón, Patio, Barra), con capacidad y orden.
- [ ] Plano en grilla con estados de color: libre, ocupada o cuenta pedida, y tiempo desde que se abrió.
- [ ] **QR por mesa** (`/[slug]/mesa/[id]?k=token`) con impresión en lote. El token rota al cerrar la mesa para evitar pedidos falsos desde casa.

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

### Fase 5: Producto vendible (2–3 semanas)

**Alta autoservicio**
- [ ] `/registro` → asistente:
  1. datos del local y slug (validación en vivo);
  2. marca (color, logo, fuente);
  3. carta inicial (plantilla por rubro: hamburguesería, pizzería, parrilla, cafetería; o importar desde Excel/CSV);
  4. horarios;
  5. publicar.
- [ ] Prueba gratis de N días (configurable en `plataforma/config`).
- [ ] Checklist de "primeros pasos" en el resumen del panel.

**Planes y cobro**
- [ ] `plataforma/config.planes` con límites (productos, usuarios, mesas) y features por plan.
- [ ] Restricción de features en la UI (con "Mejorá tu plan") **y** en las Functions.
- [ ] `crearSuscripcion` (preapproval de MP), `mpWebhookSuscripciones` y `controlSuscripciones`.
- [ ] Estados: prueba → activa → en_mora (gracia de 7 días, banner) → suspendida (panel en solo lectura; la web muestra la carta pero no toma pedidos).
- [ ] Página `/panel/[localId]/suscripcion`: plan actual, cambiar plan, historial de pagos, cancelar.

**Plataforma**
- [ ] `/admin`: locales (búsqueda, estado, plan, último uso), MRR, altas y bajas, activar o suspender, ver panel en solo lectura para soporte.
- [ ] Emails transaccionales (Resend o la extensión "Trigger Email"): bienvenida, invitación de equipo, fin de prueba, pago fallido, suspensión.
- [ ] Landing comercial en `/`: propuesta ("pedidos sin comisión"), features, precios, **demo en vivo** (`/demo`), caso Silverio, FAQ y contacto por WhatsApp.
- [ ] Legales: términos y condiciones, política de privacidad (Ley 25.326), aviso de datos de clientes finales.
- [ ] Centro de ayuda: artículos cortos y videos de 1–2 minutos por función clave.

✅ **Listo cuando:** **3 locales piloto pagan** la suscripción por Mercado Pago y operan sin ayuda diaria.

---

### Después (según la demanda de los clientes)
- Cupones y promos automáticas por día y hora; programa de puntos.
- Stock simple por producto (se descuenta con cada venta y avisa cuando hay poco).
- Pedidos programados (para una hora determinada).
- Reservas de mesas.
- Impresión directa en térmica (QZ Tray o agente local) y comandas automáticas.
- Notificaciones push (FCM) para staff y clientes.
- App de repartidor (asignar delivery y ubicación).
- Multi-sucursal (varios locales bajo una marca, reportes consolidados).
- Dominio propio por local (API de dominios de Vercel).
- Encuestas post-pedido y reseñas en Google.

---

## 13. Planes comerciales

| Plan | Incluye | Pensado para |
|---|---|---|
| **Carta** | Web del local, carta con QR, promos, precios masivos | Locales que hoy tienen una carta en PDF o Instagram |
| **Pedidos** | Carta + pedidos online (take away y delivery), panel en tiempo real, Mercado Pago, clientes | Hamburgueserías, pizzerías, rotiserías |
| **Completo** | Pedidos + salón, mesas y QR, pantalla de cocina, caja, reportes, más usuarios | Locales con salón |

- Los precios se definen en la Fase 5, comparando con Pedix y Fudo, en ARS con ajuste periódico.
- **Argumento central:** *"Tus pedidos, sin comisión"*, frente a PedidosYa y Rappi.
- **Silverio = cliente fundador:** bonificado a cambio de feedback, testimonio y uso como caso público. **Firmarlo por escrito, incluyendo que la plataforma es propiedad de DelgadoDev.**

---

## 14. Riesgos

| Riesgo | Mitigación |
|---|---|
| **Soporte en horario de servicio** (viernes 22 hs) | UX a prueba de errores, estado del sistema visible, canal de WhatsApp de soporte con horario definido por plan |
| **Internet del local se corta** | Cache persistente de Firestore en el panel, indicador de sin conexión, carga manual que se sincroniza después |
| **Impresoras térmicas** (cada modelo es distinto) | Arrancar con impresión del navegador; integración directa recién cuando haya demanda |
| **Costos de Firebase** con muchos locales | Principios del §10, alertas de presupuesto y monitoreo de lecturas por local |
| **Crecimiento del alcance** antes de vender | La Fase 2 ya es vendible (plan "Pedidos"); no saltear el criterio de "listo" |
| **Pedidos falsos o en broma** | App Check, límite por teléfono, confirmación del mozo en QR, token de mesa rotativo |
| **Seguridad multi-local** | Reglas con tests obligatorios en CI y precios siempre recalculados en el servidor |
| **Dependencia de un solo dev** | Este documento, código tipado, tests y README de operación |

---

## 15. Entornos, variables y deploy

| Entorno | Firebase | Web | Uso |
|---|---|---|---|
| local | Emuladores | `localhost:3000` | Desarrollo diario, seed automático |
| dev | `mimenu-dev` | Vercel Preview (cada PR) | Pruebas con datos de demo |
| prod | `mimenu-prod` | Vercel Production | Clientes reales |

**`apps/web/.env.local`**
```env
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

**Secretos de Functions** (`firebase functions:secrets:set`): `REVALIDATE_SECRET`, `MP_PLATAFORMA_ACCESS_TOKEN`, `MP_CLIENT_ID`, `MP_CLIENT_SECRET`, `MP_WEBHOOK_SECRET`, `RESEND_API_KEY`.

**Deploy**
- Web: push a `main` → Vercel Production. Los PR generan Preview.
- Functions, reglas e índices: `firebase deploy --only functions,firestore,storage -P prod` (GitHub Action manual con aprobación).

---

## Registro de cambios de este documento
- **1.0 (2026-09-28):** versión inicial, backend definido en Firebase.
- **1.1 (2026-09-28):** nombre del producto: **MiMenu** (proyectos `mimenu-dev` y `mimenu-prod`). Ajustes de tooling de la Fase 0:
  - TypeScript fijado en **6.0.x** (typescript-eslint todavía no soporta TS 7) y **ESLint 9** (los plugins de `eslint-config-next` piden v9).
  - Los scripts (`seed.ts`, `subir-assets.ts`) corren con `node --experimental-strip-types`, sin sumar `tsx`.
  - Local: los emuladores usan el proyecto `demo-mimenu` (el prefijo `demo-` impide tocar recursos reales) y `pnpm dev` corre el seed automático al arrancar, sin persistir datos. Los tests de reglas usan `demo-mimenu-tests`.
  - `horarios.ts` usa solo `Intl` (sin date-fns) para funcionar igual en navegador, Next y Functions.
  - `shadcn/ui` con base Radix y preset Nova; `cn` (de shadcn) reemplaza a clsx + tailwind-merge.
  - Storage no acepta SVG subidos por usuarios (pueden llevar scripts).
- **1.2 (2026-09-28):** se confirma el modelo **multi-local** (un repo, un Firebase, un deploy; cada local con su marca y su dominio) frente a "un repo por cliente". Para que cada web se vea propia se suman las **variantes de diseño** (`web.estilo`) y los **componentes a medida** por local (§5, §11 y Fase 1).
