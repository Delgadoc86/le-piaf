# Silverio Club · Base para Locales Gastronómicos (DelgadoDev)

Sistema integral de **Tienda Web de Pedidos + Punto de Venta de Mostrador + Pantalla de Cocina (KDS) + Control de Caja y Cupo de Stock por Turno** pensado para pizzerías, lomiterías, rotiserías, hamburgueserías, bares y food trucks.

Este repositorio (`silverio-club`) cumple un doble rol:
1. Es el sistema en producción de **Silverio Food Truck Beer**.
2. Es la **base maestra** desde la cual se clonan y sincronizan las copias de otros locales gastronómicos (como **Le Piaf** y **Bautista**), manteniendo un repositorio, un proyecto Firebase y un proyecto Vercel independiente por cada comercio.

| Documento | Contenido |
|---|---|
| [`README.md`](README.md) | Arquitectura, módulos del sistema, comandos, despliegue, impresión térmica y guía para crear o sincronizar copias. |
| [`ROADMAP.md`](ROADMAP.md) | Especificación funcional unificada, modelo de datos y checklist de progreso y sincronización multi-local. |
| [`CLAUDE.md`](CLAUDE.md) | Reglas de trabajo y convenciones del repositorio. |
| [`silverio/SILVERIO.md`](silverio/SILVERIO.md) | Kit de identidad visual, textos y catálogo propio de Silverio. |
| [`silverio/comercial/presentacion-comercial.pdf`](silverio/comercial/presentacion-comercial.pdf) | Dossier comercial en PDF (4 páginas A4) para presentar el sistema en nuevos negocios. |

---

## 1. Qué incluye el sistema

### Tienda Web Pública (`apps/web/src/app/(sitio)`)
- **Carta digital rápida:** Categorías, fotos optimizadas en WebP, variantes, extras opcionales y buscador instantáneo.
- **Promociones y Banner de fecha especial:** Combos programables por día/horario y banner promocional con vigencia automática.
- **Carrito y pedido online sin registro:** El cliente elige retiro en el local o delivery, medio de pago (efectivo o transferencia) y confirma en segundos.
- **Filtro inteligente anti-pedidos falsos:** La primera vez que un número pide por la web debe validar su pedido con 1 toque por WhatsApp (ventana de 15 minutos). Una vez entregado su primer pedido, queda registrado como cliente habitual y en futuras compras pasa directo.
- **Seguimiento en vivo (`/pedido/[token]`):** El cliente ve en tiempo real cuando el local acepta su pedido, la demora estimada de cocina y cuándo está listo.
- **Freno automático por stock agotado:** Si el Cupo del Turno llega a `0`, los platos y promos alcanzados pasan automáticamente a *"Agotado por hoy"*.

### Panel de Gestión (`apps/web/src/app/panel`)
- **Mostrador (`/panel/mostrador`):**
  - Carga táctil en **1 toque** con foto en miniatura e indicador de unidades cargadas (`1×`, `2×`).
  - Modalidad por defecto en **"Comer acá"** para atención presencial (con cambio en 1 clic a *Para llevar* o *Delivery*).
  - Botones rápidos de exclusión de ingredientes (`SIN Cebolla`, `SIN Mayonesa`, `SIN Huevo`, etc.) y notas libres.
  - Calculadora de vuelto en efectivo y soporte nativo de **Cobro Mixto** (*Efectivo + Transferencia* en un solo paso).
- **Pantalla de Cocina / Pedidos (`/panel/pedidos`):**
  - Tablero KDS en tiempo real en 3 columnas (*Nuevos*, *En Cocina*, *Listos para despacho*) con filtros rápidos por canal (*Todos*, *Mostrador / Retira*, *Delivery*).
  - Comandas completas sin truncar ítems, con exclusiones `SIN...` resaltadas en etiquetas rojas de alto contraste.
  - **Timbre sonoro persistente cada 25 segundos**, pestaña del navegador parpadeante (`¡PEDIDO NUEVO!`) y alerta visual en barra lateral y mostrador cuando entra un pedido web.
  - **Screen Wake Lock API** para evitar que la tablet o monitor de cocina se apague durante el servicio.
  - **Impresión de comanda térmica en 1 clic** para impresoras de `58 mm` u `80 mm` (203 DPI).
- **Caja y Cupo del Turno (`/panel/caja`):**
  - Apertura de turno con fondo de cambio inicial y selector de **Cupo del Turno** (ej. cantidad de bollos, panes o porciones disponibles para la noche).
  - Registro de ingresos/egresos manuales en efectivo (pago a proveedores, hielo, retiros).
  - Widget de cupo en vivo con ajuste rápido (`-5`, `+5`, `+10`), sobreventa permitida para staff en mostrador con alerta ámbar y restitución automática de stock si un pedido se cancela.
  - Arqueo de cierre ciego (*Da justo*, *Faltan $...* o *Sobran $...*) e historial de cierres.
- **Ventas (`/panel/ventas`) y Resumen (`/panel`):**
  - Facturación del día comparada contra la semana anterior, ticket promedio, ranking de productos más vendidos y horarios pico.
- **Carta (`/panel/carta`), Promos (`/panel/promos`) y QR (`/panel/qr`):**
  - Pausa instantánea de productos agotados, **aumento masivo de precios por porcentaje** con redondeo configurable y vista previa, peso de cupo (`pesoCupo`) por plato/promo y generador de QR con logo en PNG y PDF A4.
- **Configuración (`/panel/configuracion`) y Centro de Ayuda (`/panel/ayuda`):**
  - Configuración de horarios, WhatsApp, modalidades de entrega, reglas anti-pedidos falsos, números bloqueados y Cupo del Turno.
  - **Centro de Ayuda integrado (`/panel/ayuda`)** con buscador instantáneo, rutina diaria en 5 pasos, vistas ilustrativas de cada botón y soluciones rápidas a dudas frecuentes + contacto directo de soporte (**DelgadoDev**).

---

## 2. Stack Técnico y Estructura

| Capa | Tecnología |
|---|---|
| Frontend (Web + Panel) | Next.js 16 (App Router, Cache Components) · React 19 · TypeScript estricto |
| Interfaz | Tailwind CSS v4 · shadcn/ui (Radix) · lucide-react · zustand · dnd-kit |
| Backend y Base de Datos | Firebase: Firestore, Auth, Storage (WebP), Cloud Functions 2ª gen (`southamerica-east1`) |
| Dominio compartido | `packages/shared`: esquemas Zod, tipos, cálculo de precios, horarios, caja y cupo |
| Calidad y Guardia | Vitest (unitarios y reglas Firestore/Storage) · ESLint 9 · Prettier · `scripts/guardia.mjs` |

```text
apps/web/                 Aplicación Next.js: tienda pública (app/(sitio)) y panel (app/panel)
  src/components/publico/ Diseño visual propio del local (personalizable en cada copia)
  src/components/panel/   Componentes del panel de gestión (código genérico de la base)
  src/features/           Lógica de negocio por módulo (carrito, panel, auth, sitio)
functions/src/            Cloud Functions: crearPedido, confirmacion, restituirCupoPedido, caja, carta
packages/shared/src/      Esquemas Zod, tipos, precios, cupo y constantes compartidas (con tests)
tests/reglas/             Tests de seguridad de firestore.rules y storage.rules en emuladores
scripts/                  seed.ts, subir-assets.ts, subir-carta.ts y guardia.mjs (sellar/verificar)
silverio/                 Kit del local: seed.json, assets/, SILVERIO.md y comercial/
```

---

## 3. Comandos de Desarrollo y Producción

**Requisitos:** Node 22.12+, pnpm 11 (`corepack enable`) y Java 21+ (para los emuladores de Firebase).

```bash
pnpm install
pnpm dev        # Compila shared/functions, levanta emuladores (:4000), corre seed y abre web (:3000)
```

Usuarios locales de prueba (contraseña `local123` en `http://localhost:3000/login`): `dueno@local.test`, `encargado@local.test`, `mozo@local.test`, `cocina@local.test`.

| Comando | Descripción |
|---|---|
| `pnpm dev` | Entorno completo en vivo contra emuladores locales de Firebase. |
| `pnpm seed` | Recarga los datos de `silverio/seed.json` en los emuladores activos. |
| `pnpm test` | Ejecuta los tests unitarios de `packages/shared` (precios, horarios, caja, cupo). |
| `pnpm test:reglas` | Ejecuta los tests de seguridad de `firestore.rules` y `storage.rules`. |
| `pnpm lint` · `pnpm typecheck` | Verificación estricta de ESLint y TypeScript en todos los paquetes. |
| `pnpm base:sellar` | Actualiza `.base-manifest.json` con los hashes SHA-256 de los archivos genéricos. |
| `pnpm base:verificar` | Verifica en una copia que ningún archivo genérico de la base haya sido alterado. |
| `pnpm deploy:functions` | Empaqueta con esbuild y despliega Cloud Functions a producción. |
| `pnpm deploy:reglas` | Despliega reglas e índices de Firestore y Storage a producción. |

### Regenerar el PDF Comercial (`presentacion-comercial.pdf`)
```bash
node silverio/comercial/a-pdf.mjs
```

---

## 4. Impresión Térmica en 1 Clic (`--kiosk-printing`)

El sistema imprime comandas térmicas nativas para impresoras de **58 mm u 80 mm** (203 DPI, blanco y negro puro) sin requerir programas intermedios:

1. En Windows, configurá la ticketera térmica como **Impresora predeterminada**.
2. Creá un acceso directo de Chrome o Edge en el escritorio y agregá al final del campo **Destino**:
   ```text
   --kiosk-printing https://<tu-dominio>/panel/mostrador
   ```
3. En la primera impresión manual, destildá *"Encabezados y pies de página"* y elegí márgenes *"Ninguno"*.

---

## 5. Arquitectura Base vs. Copias y Sincronización

### Clasificación de archivos (`scripts/guardia.mjs`)
- **Genéricos (solo se editan en `silverio-club`):** `apps/web/src/components/panel/**`, `apps/web/src/app/panel/**`, `apps/web/src/features/**`, `packages/shared/**`, `functions/src/**`, `firestore.rules`, `storage.rules`, `scripts/**`.
- **Propios de cada local (permitidos en copias como `le-piaf` o `bautista`):** carpeta del kit (`silverio/`, `lepiaf/`, `bautista/`), diseño público (`apps/web/src/components/publico/**`, `apps/web/src/app/(sitio)/**`, `apps/web/public/**`), `.firebaserc`, `functions/.env.*`, `apps/web/.env*`, `.repo-role`.

### Cómo sincronizar mejoras desde esta base hacia una copia (Le Piaf / Bautista)
1. En esta base (`silverio-club`), tras validar pruebas locales:
   ```bash
   pnpm base:sellar
   git add .
   git commit -m "feat(base): actualizacion de panel, mostrador, cupo y ayuda"
   git tag base-sync-v2
   git push origin main --tags
   ```
2. En el repositorio de la copia (`LePiaf2026` o `RotiseriaBautista2026`):
   ```bash
   git config merge.ours.driver true
   git fetch base --tags
   git merge base/main
   pnpm install
   pnpm base:verificar && pnpm lint && pnpm typecheck && pnpm test
   ```

### Cómo crear un local nuevo desde cero
1. Clonar `silverio-club`, renombrar el remoto `origin` a `base`, bloquear push a `base` (`git remote set-url --push base DESACTIVADO`) y apuntar `origin` al nuevo repo.
2. Crear el archivo `.repo-role` en la raíz con `rol=copia` y `kit=<nombre_local>`.
3. Reemplazar la carpeta del kit con `<nombre_local>/seed.json` y sus imágenes WebP en `assets/`.
4. Configurar el proyecto en Firebase (Firestore, Auth, Storage, Functions en `southamerica-east1`) y Vercel (`Root Directory: apps/web`).
