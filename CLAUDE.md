# CLAUDE.md — Silverio Club

Web + sistema de gestión gastronómica ("semi-FUDO") para **un** local: Silverio Food Truck Beer.
Este repo es también la **base que se copia** para cada local nuevo (un repo, un Firebase y un Vercel por local; ROADMAP §16).

## Documentos fuente (leer antes de trabajar)
- [ROADMAP.md](ROADMAP.md): arquitectura, modelo de datos, reglas, Functions y fases con checklists. **Es la especificación.** Si algo del código contradice el roadmap, preguntar antes de desviarse; si se decide cambiarlo, actualizar el roadmap en el mismo cambio.
- [silverio/SILVERIO.md](silverio/SILVERIO.md): marca, textos y datos del local (es el "kit" del local; en una copia se reemplaza).
- [silverio/seed.json](silverio/seed.json): datos iniciales para `scripts/seed.ts`.

## Cómo trabajar
- Ir **fase por fase** y tarea por tarea del roadmap; marcar `[x]` en ROADMAP.md al completar cada una.
- No empezar una fase sin cumplir el criterio "✅ Listo cuando" de la anterior, salvo pedido explícito.
- Stack fijo: Next.js (App Router) + TypeScript estricto + Tailwind + shadcn/ui, **Firebase** (Auth, Firestore, Storage, Functions 2ª gen en `southamerica-east1`), pnpm workspaces. No agregar dependencias grandes sin justificarlo.
- Tipos, esquemas zod y cálculo de precios viven en `packages/shared` y se usan igual en front y Functions.
- Dinero en **pesos enteros**. Fechas con la zona horaria del local.
- Toda regla nueva de `firestore.rules` o `storage.rules` lleva su test en `tests/reglas/`.
- El cliente final nunca escribe pedidos ni precios directo en Firestore: siempre vía `crearPedido`.
- Desarrollar contra los **emuladores**; nunca tocar el proyecto real `silverio-club` (producción) sin pedido explícito.
- UI del panel en español rioplatense (vos). Código de dominio en español (`pedido`, `producto`).
- Commits en Conventional Commits.
- **Consultar antes de:** crear o modificar algo en Firebase real (fuera de emuladores), instalar dependencias que no figuren en el roadmap, hacer deploy y hacer commits (proponer el mensaje).
- Modelo **un repo por local**. Firestore aplanado: `local/datos` + colecciones en la raíz; claim `{ rol }`. Nada de `locales/{id}`, slugs ni multi-local.
- Lo **genérico** (panel, Functions, reglas, `packages/shared`) se escribe pensando en que lo usen todas las copias; lo **propio de Silverio** (kit `silverio/`, `components/publico/`, estilos, `.env`) queda separado (ROADMAP §11).
- **Panel mínimo:** el dueño de un local chico solo ve carta/precios/agotados, promos, banner de fecha especial, QR, contacto, redes y horarios. Diseño, marca, textos y configuración avanzada los maneja DelgadoDev en código/datos (ROADMAP §11). Todas las imágenes se guardan en WebP.
- Explicar en criollo y corto; ante opciones, recomendar una y decir por qué.

## Comandos
- `pnpm dev`: compila shared + functions, levanta emuladores (UI en http://localhost:4000), corre el seed y arranca Next.js (http://localhost:3000) con watchers.
- `pnpm seed`: carga el kit del local (`silverio/`) en los emuladores (necesita los emuladores corriendo, p. ej. `pnpm emuladores`). Usuarios: `dueno@local.test`, `encargado@…`, `mozo@…`, `cocina@…`; contraseña `local123`.
- `pnpm test` (unitarios de shared) · `pnpm test:reglas` (reglas contra emuladores) · `pnpm lint` · `pnpm typecheck` · `pnpm build`.
- TypeScript fijado en 6.0.x hasta que typescript-eslint soporte TS 7.
