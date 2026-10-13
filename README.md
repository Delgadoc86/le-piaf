# Silverio Club · base para locales gastronómicos

Web de pedidos + panel de gestión ("semi-FUDO") para **un** local de comida. Este repo es la web de
**Silverio Food Truck Beer** y, a la vez, la **base que se copia** para cada local nuevo: un repo,
un proyecto de Firebase y un proyecto de Vercel por local.

- **Web pública:** carta tipo app, carrito, pedido online (retiro o delivery), seguimiento en vivo.
- **Panel:** mostrador POS táctil (carga rápida de mostrador/delivery/salón, calculadora de vuelto en efectivo y exclusión ágil de ingredientes), pantalla de cocina con comandas en vivo de alto contraste (estilo ticket de papel), caja y turnos, ventas y reportes diarios, carta, promos, banner de fecha especial, QR y configuración.

| Documento | Para qué |
|---|---|
| [ROADMAP.md](ROADMAP.md) | La especificación: arquitectura, modelo de datos, reglas, Functions y fases. |
| [CLAUDE.md](CLAUDE.md) | Reglas de trabajo en el repo. |
| [silverio/SILVERIO.md](silverio/SILVERIO.md) | Marca, textos y datos del local (el "kit"). |
| [silverio/manual/manual-usuario.pdf](silverio/manual/manual-usuario.pdf) | Manual para el dueño y el encargado. |

## Estado

| Fase | Qué incluye | Estado |
|---|---|---|
| 0 · Fundaciones | Monorepo, Firebase, roles, reglas con tests | ✅ |
| 1 · Carta y web | Web pública, panel de carta, promos, banner, QR | ✅ (Silverio en producción como demo) |
| 2 · Pedidos online | `crearPedido`, seguimiento, tablero, cobro manual, carga manual, delivery sin zonas | ✅ (versión mínima) |
| 4 · Caja y ventas | Caja simple (abrir, movimientos, cierre), ventas, resumen | ✅ (hecha antes que la 3) |
| 3 · Salón y cocina | Mesas, mozos, pantalla de cocina | Pendiente (solo si el local atiende mesas) |
| 5 · Plantilla y venta | Automatizar la copia y el cobro del abono | Pendiente |

**Pendientes conocidos:** App Check con el dominio definitivo, rotar la clave de la cuenta de
servicio de Silverio, plan Pro de Vercel antes del dominio oficial (el plan Hobby no permite uso
comercial). Ver "Después" en cada fase del [ROADMAP](ROADMAP.md).

## Stack

| Capa | Tecnología |
|---|---|
| Web y panel | Next.js 16 (App Router, Cache Components) · React 19 · TypeScript estricto |
| UI | Tailwind CSS v4 · shadcn/ui (Radix) · lucide-react · zustand (carrito) · dnd-kit |
| Datos | Firebase: Firestore, Auth (email y contraseña), Storage (imágenes en WebP) |
| Lógica de servidor | Cloud Functions 2ª gen en `southamerica-east1` (empaquetadas con esbuild) |
| Compartido | `packages/shared`: esquemas zod, tipos, precios, horarios, pedidos y caja (lo usan la web y las Functions) |
| Hosting | Vercel (web) · Firebase (Functions, reglas, datos) |
| Calidad | Vitest (unitarios y reglas con emuladores) · ESLint 9 · Prettier |
| Monorepo | pnpm workspaces (pnpm 11, Node ≥ 22.12) |

## Estructura

```
apps/web/                 Next.js: web pública (app/(sitio)) y panel (app/panel)
  src/components/publico/ Diseño de la web del local (lo propio de cada local)
  src/components/panel/   Panel (genérico)
  src/features/           Lógica por área: carrito, panel, auth, sitio
functions/src/            Cloud Functions: pedidos, caja, carta, auth, revalidación de la web
packages/shared/src/      Esquemas, tipos y reglas de negocio compartidas (con tests)
tests/reglas/             Tests de firestore.rules y storage.rules contra los emuladores
scripts/                  seed (carga el kit en Firebase) y subida de assets
silverio/                 KIT DEL LOCAL: seed.json, assets/, SILVERIO.md y manual/
firestore.rules · storage.rules · firestore.indexes.json
```

**Genérico vs. propio del local.** Todo es genérico salvo el kit (`silverio/`), el diseño de la
web pública (`apps/web/src/components/publico/` y sus estilos), los `.env` y los nombres del
proyecto (`.firebaserc`, `functions/.env.<proyecto>`). Los arreglos del panel, las Functions, las
reglas y `packages/shared` se hacen en la base y se llevan a las copias con `git merge`.

## Cómo funciona (en corto)

- **Web pública:** se prerenderiza y queda en caché (`"use cache"`). Cuando el panel cambia la carta
  o el local, una Function (`revalidarWeb`) avisa a `/api/revalidate` y la web se actualiza en
  segundos, sin gastar lecturas en cada visita.
- **Pedidos:** el cliente nunca escribe precios. `crearPedido` recalcula todo con
  `packages/shared/precios.ts`, numera por jornada (corte 06:00) y crea el espejo público
  `seguimiento/{token}`. `espejarSeguimiento` mantiene al cliente al día.
- **Caja:** `contabilizarPedido` suma a la caja abierta y a `statsDiarias` cuando un pedido queda
  cobrado y no anulado, y resta si se cancela (idempotente). `abrirCaja` y `cerrarCaja` manejan una
  sola caja abierta.
- **Seguridad:** roles por custom claim `{ rol }` (dueño, encargado, mozo, cocina) y reglas de
  Firestore y Storage con tests. `/api/salud` informa si Firebase Admin arranca en el servidor.

## Desarrollo

**Requisitos:** Node 22.12+, pnpm 11 (`corepack enable`), Java 21+ (lo exigen los emuladores de Firebase) y
Firebase CLI (viene como dependencia).

```bash
pnpm install
pnpm dev        # emuladores + seed + web en http://localhost:3000 (UI de emuladores en :4000)
```

Usuarios de prueba (contraseña `local123`): `dueno@local.test`, `encargado@local.test`,
`mozo@local.test`, `cocina@local.test`. Se entra por `http://localhost:3000/login`.

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Compila shared y Functions, levanta emuladores, carga el kit y arranca Next.js |
| `pnpm seed` | Carga el kit en los emuladores (con `pnpm emuladores` corriendo) |
| `pnpm test` | Tests unitarios de `packages/shared` |
| `pnpm test:reglas` | Tests de reglas contra los emuladores |
| `pnpm lint` · `pnpm typecheck` · `pnpm build` | Calidad y build (el build usa los emuladores) |
| `pnpm deploy:functions` | Deploy de las Functions a producción |
| `pnpm deploy:reglas` | Deploy de reglas, índices y Storage a producción |

> Si después de `pnpm build` el `pnpm dev` devuelve 404 en rutas que existen, borrá `apps/web/.next`.

## Duplicar para un local nuevo

Tiempo estimado: medio día, más lo que tarde el diseño de la web del local.

### 1. Repo

```bash
git clone https://github.com/Delgadoc86/silverio-club.git <local>
cd <local>
git remote rename origin base          # para traer arreglos de la base después
git remote add origin https://github.com/<usuario>/<local>.git
git push -u origin main
```

Cambiá el `name` de `package.json` raíz a `<local>`.

### 2. Firebase

1. Creá el proyecto `<local>` en la consola y pasalo a **Blaze** con una **alerta de presupuesto**
   (por ejemplo USD 5 por mes).
2. **Firestore** y **Storage** en `southamerica-east1`.
3. **Auth:** solo "Correo electrónico/contraseña".
4. Registrá una **app web** y copiá su configuración.
5. En `.firebaserc`, poné el alias `prod` apuntando a `<local>`.
6. Generá una **clave de cuenta de servicio** (Configuración → Cuentas de servicio) y guardala
   como `service-account.json` en la raíz. Ya está en `.gitignore`: nunca la subas ni la pegues en
   un chat.

### 3. Kit del local

Copiá `silverio/` a `<local>/` y reemplazá su contenido:

- `seed.json`: datos del local (contacto, dirección, horarios, marca), textos de la web (`web`),
  formas de entrega (`pedidos`), medios de pago (`pagos`), categorías, productos y promos.
  El script valida todo con los esquemas de `packages/shared` y avisa si algo está mal.
- `assets/`: logo, portada y fotos (WebP).
- `<LOCAL>.md`: marca, tono y datos de referencia.
- Al renombrar o crear `<local>/seed.json` y borrar `silverio/`, los scripts (`seed`, `subirAssets`) detectan la carpeta del kit automáticamente (o podés pasar `--kit <local>`).
- Borrá `silverio/` cuando el kit nuevo esté completo.

### 4. Variables y secretos

- `pnpm dev` crea `apps/web/.env.local` y `functions/.secret.local` desde sus `.example`.
  En `.env.local` cambiá `NEXT_PUBLIC_NOMBRE_LOCAL`.
- Renombrá `functions/.env.silverio-club` a `functions/.env.<local>` con
  `WEB_URL=https://<local>.vercel.app` (o el dominio final).
- Generá un secreto aleatorio y cargalo en Firebase:
  `npx firebase functions:secrets:set REVALIDATE_SECRET -P prod`.
- Armá `apps/web/.env.vercel-produccion` (no se sube) con la config web de Firebase,
  `NEXT_PUBLIC_USE_EMULATORS=false`, `NEXT_PUBLIC_NOMBRE_LOCAL`, `NEXT_PUBLIC_APP_URL`,
  `REVALIDATE_SECRET` (el mismo de arriba), `FIREBASE_SERVICE_ACCOUNT_JSON` (la clave en base64:
  `base64 -w0 service-account.json` en Git Bash, o
  `[Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account.json"))` en PowerShell) y
  `ENABLE_EXPERIMENTAL_COREPACK=1`.
- Guardá `.env.vercel-produccion` y `service-account.json` en un gestor de contraseñas.

### 5. Diseño de la web

Ajustá `apps/web/src/components/publico/` y los estilos a la marca del local. Los colores, las
fuentes, el logo y los textos salen del kit; la maquetación es código.

### 6. Probar en local

```bash
pnpm dev            # revisá web y panel con los datos del kit nuevo
pnpm test && pnpm test:reglas && pnpm lint && pnpm typecheck
```

### 7. Producción

```bash
pnpm deploy:reglas
pnpm deploy:functions
GOOGLE_APPLICATION_CREDENTIALS=$PWD/service-account.json \
  pnpm seed --proyecto <local> --si-estoy-seguro --dueno <email-del-dueño>
```

El seed crea solo al dueño e imprime un **link para que elija su contraseña**; mandáselo por
WhatsApp. Si el local ya tiene datos, no pisa nada salvo con `--pisar`.

**Vercel:** importá el repo con **Root Directory `apps/web`** (el `vercel.json` ya define install y
build). Pegá las variables de `.env.vercel-produccion` en Environment Variables (Production).
Después del primer deploy:

- Abrí `https://<web>/api/salud`: tiene que decir `"ok": true`.
- En Firebase → Authentication → Configuración → Dominios autorizados, agregá el dominio de Vercel.
- Si el dominio no es el de `WEB_URL`, actualizalo y volvé a correr `pnpm deploy:functions`.
- Cambiá algo en el panel y comprobá que la web lo muestre en segundos.

### 8. Manual del local

`<local>/manual/manual.html` es el manual con capturas. Reemplazá las imágenes de `img/` por
capturas del local nuevo y generá el PDF:

```bash
node <local>/manual/a-pdf.mjs <local>/manual/manual.html <local>/manual/manual-usuario.pdf
```

(Usa Microsoft Edge en modo headless; cambiá la ruta del ejecutable y el pie de página si hace falta.)

### Traer arreglos de la base

```bash
git fetch base && git merge base/main
```

Los conflictos solo deberían aparecer en archivos del local (kit, diseño, `.env`). Si aparecen en
código genérico, ese cambio tenía que hacerse en la base.

## Costos (referencia)

Con ~50 pedidos por día, Firestore, Functions, Auth y Storage entran en la **cuota gratis** de
Firebase (unas 4.000 lecturas por día contra 50.000 gratis). El costo fijo real es **Vercel Pro:
USD 20 por mes** por local. Revisá el uso en Firebase Console después del primer fin de semana.
