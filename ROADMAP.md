# ROADMAP Maestro Unificado — Base Gastronómica (Silverio · Le Piaf · Bautista)

Especificación técnica y estado de avance unificado del sistema base (`silverio-club`) y su sincronización hacia las copias de locales (**Le Piaf** y **Bautista**).

---

## 1. Filosofía del Producto ("Papel y Lapicera Digital")

1. **Velocidad de mostrador en hora pico:** Cargar un pedido presencial o telefónico no puede llevar más de 3 toques. Modalidad por defecto en *"Comer acá"*, adición en 1 toque con foto, exclusiones rápidas (`SIN...`) y cobro con vuelto o **Pago Mixto** (*Efectivo + Transferencia*).
2. **Comanda de cocina legible a 2 metros:** Sin ítems ocultos en comandas activas, número de pedido y modalidad de entrega gigantes, notas de cocina resaltadas en alto contraste, timbre persistente cada 25 segundos con parpadeo de pestaña e impresión térmica nativa de `58 mm` / `80 mm`.
3. **Stock crítico sin planillas ("Cupo del Turno"):** En lugar de inventarios complejos de ingredientes, el local define opcionalmente con cuántas unidades del insumo limitante (bollos, panes, porciones, docenas) arranca el turno al abrir la caja. Cada venta descuenta atómicamente, frena la web al agotarse, permite sobreventa en mostrador y restituye el cupo si un pedido se cancela.
4. **Autosuficiencia del cliente:** Centro de Ayuda visual integrado en `/panel/ayuda` para resolver dudas operativas en segundos sin depender de soporte externo, y dossier comercial en PDF (`silverio/comercial/presentacion-comercial.pdf`) para presentación a nuevos negocios.

---

## 2. Arquitectura del Modelo de Datos (Firestore)

Cada local tiene su propia base de Firestore aislada (sin `locales/{id}`):

- **`local/datos` (`DOC_LOCAL`):** Configuración general del comercio, horarios, contacto, entrega, confirmación anti-fraude y configuración del Cupo del Turno (`cupoTurno: ConfigCupoTurno`).
- **`local/cupo` (`DOC_CUPO`):** Contador ligero en tiempo real del turno abierto (`turnoId`, `nombreInsumo`, `inicial`, `restante`, `categoriasIds`, `pausarAlAgotar`). Separado de `local/datos` para evitar contención de escrituras y no disparar revalidaciones innecesarias de caché ISR en cada venta.
- **`categorias/{id}`, `productos/{id}`, `promos/{id}`:** Catálogo del local. Incluye `pesoCupo` opcional por plato o promoción (por defecto `1`, `2` para combos dobles, `0.5` para medias porciones, `0` para bebidas).
- **`pedidos/{id}`:** Pedidos de la jornada (corte 06:00). Incluye `unidadesCupo` descontadas y bandera de idempotencia `cupoRestituido` para devolución automática ante cancelación o rechazo.
- **`seguimiento/{token}`:** Espejo público con datos mínimos para que el cliente siga el estado de su pedido sin exponer datos privados.
- **`cajas/{id}` y `cajas/{id}/movimientos/{movId}`:** Turnos de caja (una única caja abierta con ID fijo `abierta`), movimientos manuales de efectivo y resumen de cupo al cierre (`cupoFinal`).
- **`statsDiarias/{fecha}` y `clientes/{telefono}`:** Estadísticas agregadas por jornada y registro de teléfonos con pedidos entregados para eximir de confirmación por WhatsApp a clientes habituales.

---

## 3. Checklist de Estado del Proyecto

### Etapa Base Original (Completada)
- [x] **Fundaciones:** Monorepo pnpm, Firebase Auth/Firestore/Storage/Functions (`southamerica-east1`), reglas de seguridad con suite de tests en emuladores y barrera `scripts/guardia.mjs`.
- [x] **Tienda Web y Catálogo:** Carta pública cacheada con revalidación on-demand (`revalidarWeb`), carrito Zustand, promos, banner de fecha especial, aumento masivo de precios por porcentaje y generador de QR.
- [x] **Circuito de Pedidos y Anti-Fraude:** Callable `crearPedido` con recálculo estricto de precios en servidor, validación por WhatsApp de primera compra (vencimiento 15 min) y bloqueo de números.
- [x] **Caja y Estadísticas:** Apertura/cierre de caja, movimientos de efectivo, contabilización idempotente (`contabilizarPedido`) y panel de ventas.

### Fase 1: Saneamiento de Base, Código Muerto e Iconografía Sobria
- [x] **1.1.** Eliminar archivo huérfano `apps/web/src/components/panel/pedidos/nuevo-pedido.tsx` y componentes UI sin uso (`select.tsx`, `separator.tsx`).
- [x] **1.2.** Purgar de `apps/web/src/features/panel/menu.ts` rutas no construidas y lógica obsoleta de fases deshabilitadas.
- [x] **1.3.** Reemplazar ícono `Sparkles` por `CheckCheck` en `tarjeta-pedido.tsx`.
- [x] **1.4.** Limpiar emojis decorativos en `pos-mostrador.tsx`, `pedidos/cliente.tsx`, `caja/cliente.tsx`, `detalle-pedido.tsx`, `dialogo-cobro.tsx`, `barra-lateral.tsx` y `features/panel/pedidos.ts`.
- [x] **1.5.** Verificar `pnpm lint` y `pnpm typecheck` con 0 errores y 0 advertencias.

### Fase 2: Ergonomía de Mostrador, Tablero de Cocina (KDS) e Impresión Térmica
- [x] **2.1.** Ampliar `crearPedidoInputSchema` (`packages/shared/src/esquemas.ts`) y `functions/src/pedidos/crearPedido.ts` para soportar **Cobro Mixto** (`Efectivo + Transferencia`).
- [x] **2.2.** Refactorizar `pos-mostrador.tsx`:
  - [x] Adición en 1 toque real con foto en miniatura (`fotoUrl`) e indicador de unidades en el ticket (`1×`, `2×`).
  - [x] Modalidad por defecto en **"Comer acá"** (`salon`) para mostrador (y paso automático a *Para llevar* al elegir origen *Teléfono*).
  - [x] Cabecera compacta fija, lista central con scroll propio y pie fijo de cobro con **Pago Mixto** e ingredientes de exclusión rápida (`SIN...`).
  - [x] Alerta parpadeante en vivo cuando entra un pedido web mientras se opera en Mostrador o Caja.
- [x] **2.3.** Sumar soporte de cobro mixto rápido en `dialogo-cobro.tsx`.
- [x] **2.4.** Mejorar `tarjeta-pedido.tsx` y `detalle-pedido.tsx`: mostrar todos los ítems en comandas activas, ocultar badge redundante `Mostrador` y destacar exclusiones `SIN...` en alto contraste.
- [x] **2.5.** Mejorar `pedidos/cliente.tsx`: cabecera compacta en una sola fila con filtros por canal (`Todos`, `Mostrador / Retira`, `Delivery`) y banner de estado offline (`useOnlineStatus`).
- [x] **2.6.** Actualizar `sonido.ts` y `pedidos.ts`: repetición del timbre cada 25 segundos, parpadeo del título de la pestaña del navegador y `Screen Wake Lock API` con re-adquisición automática.
- [x] **2.7.** Implementar impresión de comanda térmica (`58 mm` / `80 mm`, 203 DPI) en `impresion.ts` y `globals.css`, conectada en 1 clic desde tarjeta, detalle y mostrador.

### Fase 3: Motor y Modelo de Datos de Cupo del Turno (`shared` + `functions` + `firestore.rules`)
- [x] **3.1.** Definir `ConfigCupoTurno`, `CupoTurnoActivo`, `DOC_CUPO = 'local/cupo'`, `pesoCupo` en producto/promo, `cupoInicial` en `abrirCajaInputSchema` y campos `unidadesCupo` / `cupoRestituido` en `Pedido`.
- [x] **3.2.** Crear helper puro `calcularUnidadesCupo` en `packages/shared/src/cupo.ts` y 8 tests unitarios en `cupo.test.ts` (82/82 tests en verde).
- [x] **3.3.** Actualizar `firestore.rules` para admitir `pesoCupo` en catálogo y actualización de `local/cupo` por gestores.
- [x] **3.4.** Actualizar `functions/src/caja/caja.ts` (`abrirCaja` inicializa `local/cupo`; `cerrarCaja` archiva `cupoFinal` y elimina `local/cupo`).
- [x] **3.5.** Actualizar `functions/src/pedidos/crearPedido.ts` para descontar cupo atómicamente, frenando pedidos web sin cupo y permitiendo sobreventa negativa para el staff en mostrador.
- [x] **3.6.** Implementar trigger idempotente `restituirCupoPedido` en `functions/src/pedidos/confirmacion.ts` para restituir stock al cancelar o rechazar un pedido desde `pendiente` o `aceptado`.

### Fase 4: Integración de Cupo, Centro de Ayuda Visual y Dossier Comercial
- [x] **4.1.** Selector de cupo inicial al abrir turno y balance de cupo al cerrar en `apps/web/src/app/panel/caja/cliente.tsx`.
- [x] **4.2.** Widget de cupo en vivo (`widget-cupo.tsx`) con botones rápidos (`-5`, `+5`, `+10`) en barra lateral, mostrador, pedidos y caja.
- [x] **4.3.** Configuración del Cupo del Turno (`configuracion/cupo.tsx`) y campo `pesoCupo` en formularios de productos y promos.
- [x] **4.4.** Conexión de la tienda web pública para marcar como *"Agotado por hoy"* los ítems alcanzados cuando `cupo.restante <= 0`.
- [x] **4.5.** Crear sección **`Ayuda` (`/panel/ayuda`)** con buscador instantáneo, vistas ilustrativas de los controles reales y resolución de problemas comunes, y reemplazar el manual de usuario externo por el dossier comercial **`silverio/comercial/presentacion-comercial.pdf`** (DelgadoDev · Cristian Delgado).
- [x] **4.6.** Implementar Login corporativo exclusivo con tema oscuro, branding y logo propio del local, animaciones fluidas, instalador PWA multiplataforma (`manifest.ts`, iconos 192/512 para PC, Android e iOS), Screen Wake Lock continuo y banner offline en Mostrador, y actualización del Centro de Ayuda.

### Fase 5: Cierre de Base y Sincronización a Copias
- [x] **5.1.** Validación integral local en **Silverio2026** (`pnpm lint`, `pnpm typecheck`, `pnpm test` y prueba visual en navegador).
- [x] **5.2.** Sellar manifiesto base (`pnpm base:sellar`), commitear y crear tag `git tag base-sync-v2`.
- [ ] **5.3.** Sincronizar retorno en **Le Piaf** (`git fetch base && git merge base/main`) conservando su kit `lepiaf/` y diseño público.
- [ ] **5.4.** Sincronizar retorno en **Bautista** (`git fetch base && git merge base/main`) conservando su kit `bautista/` y diseño público.
