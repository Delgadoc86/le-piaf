# CLAUDE.md — MiMenu

Plataforma gastronómica multi-local ("semi-FUDO") con suscripción. Cliente piloto: Silverio.

## Documentos fuente (leer antes de trabajar)
- [ROADMAP.md](ROADMAP.md): arquitectura, modelo de datos, reglas, Functions y fases con checklists. **Es la especificación.** Si algo del código contradice el roadmap, preguntar antes de desviarse; si se decide cambiarlo, actualizar el roadmap en el mismo cambio.
- [silverio/SILVERIO.md](silverio/SILVERIO.md): marca, textos y datos del cliente piloto.
- [silverio/seed.json](silverio/seed.json): datos iniciales para `scripts/seed.ts`.

## Cómo trabajar
- Ir **fase por fase** y tarea por tarea del roadmap; marcar `[x]` en ROADMAP.md al completar cada una.
- No empezar una fase sin cumplir el criterio "✅ Listo cuando" de la anterior, salvo pedido explícito.
- Stack fijo: Next.js (App Router) + TypeScript estricto + Tailwind + shadcn/ui, **Firebase** (Auth, Firestore, Storage, Functions 2ª gen en `southamerica-east1`), pnpm workspaces. No agregar dependencias grandes sin justificarlo.
- Tipos, esquemas zod y cálculo de precios viven en `packages/shared` y se usan igual en front y Functions.
- Dinero en **pesos enteros**. Fechas con la zona horaria del local.
- Toda regla nueva de `firestore.rules` o `storage.rules` lleva su test en `tests/reglas/`.
- El cliente final nunca escribe pedidos ni precios directo en Firestore: siempre vía `crearPedido`.
- Desarrollar contra los **emuladores**; nunca tocar `mimenu-prod` sin pedido explícito.
- UI del panel en español rioplatense (vos). Código de dominio en español (`pedido`, `producto`).
- Commits en Conventional Commits.
- **Consultar antes de:** crear o modificar algo en Firebase real (fuera de emuladores), instalar dependencias que no figuren en el roadmap, hacer deploy y hacer commits (proponer el mensaje).
- Modelo **multi-local** (un repo, un Firebase, un deploy). Cada local se personaliza con `marca`, variantes de `web.estilo` y, si hace falta, componentes a medida (ROADMAP §11). No copiar el repo por cliente.
- Explicar en criollo y corto; ante opciones, recomendar una y decir por qué.

## Comandos
- `pnpm dev`: compila shared + functions, levanta emuladores (UI en http://localhost:4000), corre el seed y arranca Next.js (http://localhost:3000) con watchers.
- `pnpm seed`: carga silverio + demo en los emuladores (necesita los emuladores corriendo, p. ej. `pnpm emuladores`). Usuarios: `dueno@silverio.test`, `encargado@…`, `mozo@…`, `cocina@…`, `dueno@demo.test`, `admin@mimenu.test`; contraseña `mimenu123`.
- `pnpm test` (unitarios de shared) · `pnpm test:reglas` (reglas contra emuladores) · `pnpm lint` · `pnpm typecheck` · `pnpm build`.
- TypeScript fijado en 6.0.x hasta que typescript-eslint soporte TS 7.
