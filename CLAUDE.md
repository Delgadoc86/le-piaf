# CLAUDE.md — Silverio Club (Base Gastronómica DelgadoDev)

Sistema integral de **Tienda Web de Pedidos + Mostrador POS + Pantalla de Cocina (KDS) + Caja y Cupo de Stock por Turno**.
Este repositorio (`silverio-club`) es la **base maestra** que se copia y sincroniza hacia cada local gastronómico (**Silverio**, **Le Piaf**, **Bautista**): un repo, un proyecto Firebase y un proyecto Vercel por comercio.

## Documentos fuente
- [`README.md`](README.md): arquitectura, módulos, comandos, despliegue, impresión térmica y sincronización hacia copias.
- [`ROADMAP.md`](ROADMAP.md): especificación funcional unificada, modelo de datos y checklist de estado.
- [`silverio/SILVERIO.md`](silverio/SILVERIO.md): marca, textos y datos propios de Silverio (kit del local).
- [`silverio/seed.json`](silverio/seed.json): catálogo y configuración inicial para `scripts/seed.ts`.
- [`silverio/comercial/presentacion-comercial.pdf`](silverio/comercial/presentacion-comercial.pdf): dossier comercial de DelgadoDev.

## Reglas técnicas del proyecto
- **Stack fijo:** Next.js 16 (App Router) + React 19 + TypeScript estricto + Tailwind v4 + shadcn/ui, **Firebase** (Auth, Firestore, Storage, Functions 2ª gen en `southamerica-east1`), pnpm workspaces.
- **Dominio compartido (`packages/shared`):** tipos, esquemas Zod y cálculos puros (precios, horarios, caja, cupo del turno) compartidos entre frontend y Cloud Functions.
- **Dinero en pesos enteros** y fechas con la zona horaria del local (`America/Argentina/Buenos_Aires`, corte de jornada 06:00).
- **Seguridad:** el cliente público nunca escribe pedidos ni precios directo en Firestore; todo pedido ingresa por la Callable `crearPedido`.
- **Diseño e iconografía sobria:** prohibido el uso de `Sparkles` y emojis decorativos en botones, etiquetas, subtítulos o píldoras.
- **Entorno local:** desarrollar y probar contra los emuladores de Firebase (`pnpm dev`); nunca tocar producción sin confirmación explícita del usuario.

## Regla Base vs. Copia (`scripts/guardia.mjs`)
- Antes de trabajar, verificar si existe `.repo-role` en la raíz:
  - Si no existe (o `rol=base`), estamos en la **base (`silverio-club`)**: acá se desarrollan todos los cambios genéricos (panel, Functions, reglas, `packages/shared`, scripts) y al finalizar se sella con `pnpm base:sellar`.
  - Si dice `rol=copia`, estamos en una **copia de local** (`Le Piaf`, `Bautista`): solo se permite editar su kit (`<kit>/`), el diseño público (`apps/web/src/components/publico/**`, `apps/web/src/app/(sitio)/**`, `apps/web/public/**`) y su configuración local (`.firebaserc`, `.env*`).
