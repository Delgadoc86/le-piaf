'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { VERSION_BASE } from '@app/shared';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChefHat,
  ChevronDown,
  Clock,
  ExternalLink,
  HelpCircle,
  MessageSquare,
  Package,
  Printer,
  Search,
  ShieldAlert,
  ShoppingBag,
  Utensils,
  UtensilsCrossed,
  Volume2,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';

interface PasoGuia {
  titulo: string;
  detalle: string;
}

interface ModuloAyuda {
  id: 'mostrador' | 'cocina' | 'antifraude' | 'caja-cupo' | 'carta-promos';
  titulo: string;
  resumen: string;
  rutaPanel?: string;
  textoBoton?: string;
  icono: LucideIcon;
  palabrasClave: string[];
  pasos: PasoGuia[];
  consejo?: string;
}

interface ProblemaComun {
  id: string;
  pregunta: string;
  solucion: string;
  categoria: 'pedidos' | 'caja' | 'carta' | 'acceso';
  palabrasClave: string[];
}

const RUTINA_DIARIA: readonly { numero: number; titulo: string; texto: string; ruta: string }[] = [
  {
    numero: 1,
    titulo: 'Abrí la Caja y el Cupo',
    texto: 'Indicá el cambio inicial en efectivo y, si usás control de stock, con cuántas unidades arrancás el turno.',
    ruta: '/panel/caja',
  },
  {
    numero: 2,
    titulo: 'Activá el Timbre en Cocina',
    texto: 'En Pedidos tocá "Timbre ON" una vez al abrir el navegador para habilitar el sonido y mantener la pantalla encendida.',
    ruta: '/panel/pedidos',
  },
  {
    numero: 3,
    titulo: 'Cargá en Mostrador o Aceptá de la Web',
    texto: 'En Mostrador sumás platos en 1 toque. Si entra un pedido web, la pestaña parpadea en naranja y suena cada 25 segundos hasta aceptarlo.',
    ruta: '/panel/mostrador',
  },
  {
    numero: 4,
    titulo: 'Despachá, Imprimí y Cobrá',
    texto: 'Marcá "Plato Listo" cuando salga de cocina, imprimí la comanda si usás ticketera y registrá el cobro en Efectivo, Transferencia o Mixto.',
    ruta: '/panel/pedidos',
  },
  {
    numero: 5,
    titulo: 'Cerrá la Caja al terminar',
    texto: 'Anotá pagos a proveedores o retiros del día, contá los billetes reales y cerrá el turno para ver si da justo, sobra o falta.',
    ruta: '/panel/caja',
  },
];

const MODULOS_AYUDA: readonly ModuloAyuda[] = [
  {
    id: 'mostrador',
    titulo: 'Mostrador y carga rápida (1 toque)',
    resumen: 'Cómo tomar pedidos presenciales o por teléfono en segundos, quitar ingredientes y cobrar con vuelto o pago mixto.',
    rutaPanel: '/panel/mostrador',
    textoBoton: 'Ir a Mostrador',
    icono: ShoppingBag,
    palabrasClave: [
      'mostrador',
      'cargar',
      'telefono',
      'comer aca',
      'para llevar',
      'delivery',
      'sin cebolla',
      'nota',
      'mixto',
      'vuelto',
      'efectivo',
      'transferencia',
    ],
    pasos: [
      {
        titulo: 'Sumar platos en 1 toque',
        detalle:
          'Tocá cualquier plato o promo con foto para sumarlo directo al ticket. Si el plato tiene variantes obligatorias (ej. tamaño o punto), se abre una ventana corta para elegir.',
      },
      {
        titulo: 'Quitar ingredientes ("SIN...") o agregar notas',
        detalle:
          'En la columna derecha del ticket tocá "Notas / Quitar ingred." debajo del plato. Podés tocar botones rápidos como "SIN Cebolla", "SIN Mayonesa" o escribir una aclaración libre. En cocina saldrá resaltado en rojo.',
      },
      {
        titulo: 'Modalidad de entrega por defecto',
        detalle:
          'Los pedidos de mostrador arrancan por defecto en "Comer acá". Si el cliente retira, tocá "Para llevar". Si cambias el origen a "Teléfono", pasa solo a "Para llevar" o podés elegir "Delivery".',
      },
      {
        titulo: 'Cobrar en el acto, calcular vuelto o Pago Mixto',
        detalle:
          'Activá "Ya pagó en mostrador". Podés elegir Efectivo (te calcula el vuelto si escribís con cuánto paga), Transferencia, o Mixto (escribís cuánto dejó en efectivo y el sistema calcula solo el resto por transferencia).',
      },
    ],
    consejo:
      'Si estás cargando en Mostrador y entra un pedido por la web, arriba a la derecha verás un botón naranja parpadeando y escuchás el timbre sin perder lo que estás cargando.',
  },
  {
    id: 'cocina',
    titulo: 'Pantalla de Cocina, Timbre e Impresora Térmica',
    resumen: 'Cómo organizar las 3 columnas de comandas, asegurar que el timbre suene siempre e imprimir tickets de 58 mm u 80 mm.',
    rutaPanel: '/panel/pedidos',
    textoBoton: 'Ir a Pedidos / Cocina',
    icono: ChefHat,
    palabrasClave: ['cocina', 'pedidos', 'timbre', 'sonido', 'impresora', 'comanda', 'termica', 'ticket', 'listo', 'columnas'],
    pasos: [
      {
        titulo: 'Las 3 columnas del tablero',
        detalle:
          'Naranja ("Nuevos"): pedidos web que esperan que los aceptes. Azul ("En Cocina"): pedidos que se están preparando ahora mismo. Verde ("Listos para despacho"): platos terminados esperando entrega o cadete.',
      },
      {
        titulo: 'Timbre insistente y pestaña parpadeante',
        detalle:
          'Mientras haya un pedido en "Nuevos" sin aceptar, el timbre vuelve a sonar cada 25 segundos y la pestaña del navegador parpadea con "¡PEDIDO NUEVO!" aunque estés en otra pantalla.',
      },
      {
        titulo: 'Imprimir comanda en 1 clic',
        detalle:
          'Cada tarjeta tiene un botón con el ícono de impresora arriba a la derecha. Imprime en formato limpio de alto contraste para rollos térmicos de 58 mm u 80 mm con el número gigante, el modo de entrega y los "SIN..." resaltados.',
      },
      {
        titulo: 'Ajustar la demora de cocina',
        detalle:
          'Tocando una tarjeta abrís su detalle y podés subir o bajar la demora de a 5 minutos (-5 / +5). El cliente ve ese tiempo actualizado en vivo en su celular.',
      },
    ],
    consejo:
      'La pantalla de Pedidos activa un bloqueo automático para que el monitor o tablet no se apague solo durante el servicio.',
  },
  {
    id: 'antifraude',
    titulo: 'Pedidos Web, Clientes Nuevos y Anti-Pedidos Falsos',
    resumen: 'Cómo funciona el filtro por WhatsApp para números desconocidos, el costo de envío en delivery y el bloqueo de bromistas.',
    rutaPanel: '/panel/configuracion',
    textoBoton: 'Ver Configuración',
    icono: ShieldAlert,
    palabrasClave: ['whatsapp', 'falsos', 'confirmar', 'nuevo', 'bloquear', 'bloqueados', 'delivery', 'envio', 'vencido', '15 min'],
    pasos: [
      {
        titulo: 'Primera compra: confirmación por WhatsApp en 15 minutos',
        detalle:
          'Cuando un número pide por primera vez en la web, el sistema le pide tocar un botón que te manda un WhatsApp con el código de su pedido. En tu tablero aparece como "Sin confirmar". Cuando recibís su mensaje, tocás "Ya confirmó por WhatsApp" y recién ahí pasa a cocina.',
      },
      {
        titulo: 'Clientes habituales: pasan directo',
        detalle:
          'Una vez que un número ya completó un pedido entregado, el sistema lo recuerda como cliente conocido y en sus próximas compras ya no le pide confirmar por WhatsApp.',
      },
      {
        titulo: 'Cotizar envío en pedidos de Delivery',
        detalle:
          'Cuando entra un pedido web con Delivery, abrí el pedido, mirá la dirección, escribile por WhatsApp con el botón directo y cargá el monto de envío en "Guardar envío". El total del cliente se actualiza solo.',
      },
      {
        titulo: 'Bloquear un número molesto',
        detalle:
          'Si detectás un pedido falso, abrí el detalle del pedido y abajo de todo tocá "Bloquear este número". Podés ver o desbloquear números cuando quieras desde Configuración → Pedidos falsos.',
      },
    ],
  },
  {
    id: 'caja-cupo',
    titulo: 'Caja, Gastos en Efectivo y Cupo de Stock por Turno',
    resumen: 'Cómo controlar el efectivo real del cajón, registrar pagos a proveedores y usar el contador de insumo crítico (bollos, panes, porciones).',
    rutaPanel: '/panel/caja',
    textoBoton: 'Ir a Caja',
    icono: Wallet,
    palabrasClave: ['caja', 'abrir', 'cerrar', 'arqueo', 'gastos', 'proveedor', 'retiro', 'stock', 'cupo', 'bollos', 'panes', 'agotado'],
    pasos: [
      {
        titulo: 'Apertura y movimientos del turno',
        detalle:
          'Al abrir la caja ponés el cambio inicial. Durante el turno, cada vez que sacás billetes del cajón (hielo, pan, adelanto, retiro del dueño) o agregás cambio, anotalo en "Movimientos de efectivo" para que el cierre dé exacto.',
      },
      {
        titulo: 'Control de Cupo del Turno (stock rápido)',
        detalle:
          'Si lo activás en Configuración → Cupo del Turno, al abrir caja indicás con cuántas unidades arrancás (ej. 80 bollos). Cada venta descuenta sola. Si llega a 0, la web pública muestra "Agotado por hoy", pero en Mostrador podés seguir vendiendo.',
      },
      {
        titulo: 'Corregir el stock en vivo (+5 / -5)',
        detalle:
          'Si a mitad de la noche amasaron una tanda más o se quemaron 3 unidades, usá los botones rápidos "+5", "+10" o "-5" del contador de cupo en la barra lateral o en Caja.',
      },
      {
        titulo: 'Cierre de caja y diferencia automática',
        detalle:
          'Al tocar "Cerrar caja", contás los billetes reales que hay en el cajón y escribís el número. El sistema te informa al instante si "Da justo", "Faltan $..." o "Sobran $..." y guarda el historial del turno.',
      },
    ],
  },
  {
    id: 'carta-promos',
    titulo: 'Carta, Aumento Masivo de Precios, Promos y QR',
    resumen: 'Cómo pausar platos agotados, subir precios por porcentaje en 10 segundos, crear combos y descargar el QR para mesas.',
    rutaPanel: '/panel/carta',
    textoBoton: 'Ir a Carta',
    icono: UtensilsCrossed,
    palabrasClave: ['carta', 'precios', 'aumento', 'porcentaje', 'agotado', 'disponible', 'foto', 'promos', 'banner', 'qr', 'peso'],
    pasos: [
      {
        titulo: 'Se terminó un plato específico',
        detalle:
          'Entrá a Carta y apagá el interruptor "Disponible" de ese plato. En pocos segundos aparece como agotado en la web y nadie lo puede pedir hasta que lo vuelvas a prender.',
      },
      {
        titulo: 'Subir todos los precios por porcentaje',
        detalle:
          'En Carta → pestaña "Aumento de precios", elegís si querés aumentar toda la carta o una sola categoría, ponés el porcentaje (ej. 10%) y el redondeo. Antes de guardar te muestra una vista previa de cómo queda cada plato.',
      },
      {
        titulo: 'Cuántas unidades de stock descuenta cada plato o promo',
        detalle:
          'Al editar un plato o una promo podés definir "Unidades de cupo que descuenta" (por defecto 1). Por ejemplo: una promo de 2 pizzas lleva "2", media docena puede llevar "0.5" y una gaseosa "0".',
      },
      {
        titulo: 'Promos por día y QR del local',
        detalle:
          'En Promos podés programar combos que solo se activen ciertos días u horarios. En "QR de la carta" descargás el código listo con tu logo en PNG para redes o en PDF A4 (1 grande para vidriera o 4 por hoja para mesas).',
      },
    ],
  },
];

const PROBLEMAS_COMUNES: readonly ProblemaComun[] = [
  {
    id: 'no-suena',
    categoria: 'pedidos',
    pregunta: 'Entró un pedido nuevo pero la computadora o tablet no hizo ruido',
    solucion:
      'Por seguridad, Chrome y Edge bloquean el audio hasta que hacés clic en la página. Asegurate de que en la pantalla de Pedidos el botón arriba a la izquierda diga "Timbre ON" (en verde) y revisá el volumen del equipo.',
    palabrasClave: ['sonido', 'timbre', 'ruido', 'audio', 'suena', 'mudo'],
  },
  {
    id: 'deshacer-cobro',
    categoria: 'caja',
    pregunta: 'Marqué un pedido como pagado en Efectivo pero en realidad pagó por Transferencia (o al revés)',
    solucion:
      'Hacé clic sobre la tarjeta del pedido para abrir su detalle, bajá hasta la sección de cobro y tocá "Deshacer cobro". Eso anula el cobro anterior y te deja volver a marcar el medio de pago correcto.',
    palabrasClave: ['error', 'equivoque', 'cobro', 'pagado', 'deshacer', 'anular', 'transferencia', 'efectivo'],
  },
  {
    id: 'web-cerrada',
    categoria: 'carta',
    pregunta: 'Un cliente me dice que entra a la web y le sale "Cerrado" o no lo deja pedir',
    solucion:
      'Revisá dos cosas en Configuración: 1) En "Horarios", que el día de hoy esté activado y dentro del rango horario actual. 2) Si tenés activado el "Cupo del Turno", fijate en Caja que el contador de stock no haya llegado a 0.',
    palabrasClave: ['cerrado', 'cliente', 'no puede pedir', 'horario', 'agotado', 'web'],
  },
  {
    id: 'caja-no-da',
    categoria: 'caja',
    pregunta: 'Al cerrar la caja me dice que falta o sobra plata respecto a lo que conté',
    solucion:
      'Revisá: 1) Si sacaste efectivo para pagar a un proveedor y olvidaste anotarlo en "Movimientos de efectivo". 2) Si algún cobro por Transferencia se marcó por error como Efectivo. 3) Si quedó algún pedido en "Entregado sin cobrar" abajo del tablero.',
    palabrasClave: ['caja', 'falta', 'sobra', 'diferencia', 'cierre', 'arqueo', 'plata'],
  },
  {
    id: 'impresora-cortada',
    categoria: 'pedidos',
    pregunta: 'Al imprimir la comanda térmica me sale la ventana de Chrome todos los días',
    solucion:
      'En la primera impresión elegí tu ticketera térmica, desmarcá "Encabezados y pies de página" y poné Márgenes en "Ninguno". Si querés que imprima directo sin preguntar, pedile a soporte activar el acceso directo con --kiosk-printing.',
    palabrasClave: ['impresora', 'imprimir', 'comanda', 'ticket', 'papel', 'termica', 'chrome'],
  },
  {
    id: 'pedido-cancelado-solo',
    categoria: 'pedidos',
    pregunta: 'Un pedido web apareció como cancelado solo sin que yo lo tocara',
    solucion:
      'Era un cliente nuevo que no envió el WhatsApp de confirmación dentro de los 15 minutos (o el cliente tocó "Cancelar pedido" desde su celular antes de que lo aceptaras). Si igual te escribe para pedirlo, cargalo desde Mostrador.',
    palabrasClave: ['cancelado', 'solo', 'vencio', '15 minutos', 'whatsapp', 'cliente nuevo'],
  },
  {
    id: 'bloqueo-login',
    categoria: 'acceso',
    pregunta: 'Intenté entrar al panel y me dice que está bloqueado temporalmente',
    solucion:
      'Si se ingresa mal la contraseña 5 veces seguidas, el sistema bloquea el acceso por 10 minutos por seguridad. Podés esperar 10 minutos o tocar "¿La olvidaste?" para recibir un enlace de recuperación en tu email.',
    palabrasClave: ['contraseña', 'clave', 'bloqueado', 'entrar', 'login', 'olvide'],
  },
  {
    id: 'caja-cerrada-aviso',
    categoria: 'caja',
    pregunta: 'Vendí varios pedidos y recién me doy cuenta de que no había abierto la Caja',
    solucion:
      'Los pedidos quedan guardados en la sección Ventas igual, pero para que el arqueo de billetes te sume los cobros del turno tenés que abrir la Caja antes de registrar los cobros. Abrila desde Caja → Abrir caja.',
    palabrasClave: ['olvide abrir caja', 'caja cerrada', 'ventas', 'turno'],
  },
];

function IlustracionModulo({ id }: { id: ModuloAyuda['id'] }) {
  if (id === 'mostrador') {
    return (
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
        <span className="mb-2.5 block text-[11px] font-black tracking-wider text-slate-400 uppercase">
          Vista rápida · Controles clave de Mostrador
        </span>
        <div className="grid gap-3 md:grid-cols-3">
          {/* Modalidad por defecto */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
            <span className="text-[11px] font-bold text-slate-500">1. Entrega por defecto</span>
            <div className="mt-1.5 grid grid-cols-3 gap-1">
              <span className="flex items-center justify-center gap-1 rounded-md bg-orange-600 px-1.5 py-1.5 text-[11px] font-black text-white shadow-2xs">
                <Utensils className="h-3 w-3" /> Comer acá
              </span>
              <span className="flex items-center justify-center rounded-md border border-slate-200 bg-white px-1.5 py-1.5 text-[11px] font-bold text-slate-600">
                Para llevar
              </span>
              <span className="flex items-center justify-center rounded-md border border-slate-200 bg-white px-1.5 py-1.5 text-[11px] font-bold text-slate-600">
                Delivery
              </span>
            </div>
          </div>

          {/* Quitar ingredientes */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
            <span className="text-[11px] font-bold text-slate-500">2. Botones rápidos &ldquo;SIN...&rdquo;</span>
            <div className="mt-1.5 flex flex-wrap gap-1">
              <span className="rounded-md bg-red-600 px-2 py-1 text-[11px] font-black text-white">
                SIN Cebolla
              </span>
              <span className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-700">
                SIN Mayonesa
              </span>
              <span className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-700">
                SIN Huevo
              </span>
            </div>
          </div>

          {/* Pago mixto */}
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5">
            <span className="text-[11px] font-bold text-emerald-900">3. Cobro Mixto en 1 paso</span>
            <div className="mt-1.5 flex items-center justify-between rounded-md bg-white px-2.5 py-1.5 text-[11px] ring-1 ring-emerald-200">
              <span className="font-bold text-slate-700">Efectivo: $ 10.000</span>
              <span className="font-black text-emerald-700">+ Transf.: $ 8.500</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (id === 'cocina') {
    return (
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
        <span className="mb-2.5 block text-[11px] font-black tracking-wider text-slate-400 uppercase">
          Vista rápida · Cómo se lee la Pantalla de Cocina
        </span>
        <div className="grid gap-3 md:grid-cols-12">
          {/* Semáforo de columnas y timbre */}
          <div className="space-y-2 md:col-span-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-800">
                <Volume2 className="h-3.5 w-3.5" /> Timbre ON
              </span>
              <span className="text-xs font-medium text-slate-500">
                ← Debe estar en verde para que suene cada 25 s
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <div className="rounded-lg bg-amber-500 px-2.5 py-2 text-white">
                <span className="block text-[10px] font-black uppercase">1. Nuevos</span>
                <span className="text-[11px] opacity-90">Aceptar pedido</span>
              </div>
              <div className="rounded-lg bg-blue-600 px-2.5 py-2 text-white">
                <span className="block text-[10px] font-black uppercase">2. En Cocina</span>
                <span className="text-[11px] opacity-90">Preparando ahora</span>
              </div>
              <div className="rounded-lg bg-emerald-600 px-2.5 py-2 text-white">
                <span className="block text-[10px] font-black uppercase">3. Listos</span>
                <span className="text-[11px] opacity-90">Para entregar</span>
              </div>
            </div>
          </div>

          {/* Mini tarjeta comanda */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 md:col-span-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black text-slate-900">#3</span>
                <span className="rounded bg-emerald-700 px-1.5 py-0.5 text-[10px] font-black text-white">
                  PARA COMER ACÁ
                </span>
              </div>
              <span
                className=" inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[10px] font-bold text-slate-700"
                title="Botón de comanda térmica"
              >
                <Printer className="h-3 w-3" /> Imprimir
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
              <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-black text-white">
                1×
              </span>
              <span>Lomo completo</span>
              <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-black text-white">
                SIN CEBOLLA
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (id === 'antifraude') {
    return (
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
        <span className="mb-2.5 block text-[11px] font-black tracking-wider text-slate-400 uppercase">
          Vista rápida · Cómo se ve un pedido de cliente nuevo sin confirmar
        </span>
        <div className="flex flex-col justify-between gap-3 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50/60 p-3 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-200/80 px-2 py-0.5 text-[11px] font-black text-amber-950">
                <Clock className="h-3 w-3" /> Sin confirmar · vence en 14 min
              </span>
              <span className="text-xs font-bold text-slate-700">Cliente nuevo por Web</span>
            </div>
            <p className="text-xs text-slate-600">
              Cuando te llega su mensaje a tu WhatsApp, tocás el botón verde para pasarlo a cocina:
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white shadow-2xs sm:self-center">
            <Check className="h-4 w-4" /> Ya confirmó por WhatsApp
          </span>
        </div>
      </div>
    );
  }

  if (id === 'caja-cupo') {
    return (
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
        <span className="mb-2.5 block text-[11px] font-black tracking-wider text-slate-400 uppercase">
          Vista rápida · Contador de Stock del Turno y Cierre de Caja
        </span>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-orange-600" />
              <div>
                <span className="block text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Cupo del turno (ej. Bollos)
                </span>
                <span className="text-sm font-black text-slate-900">45 disponibles</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-black text-slate-700">
                -5
              </span>
              <span className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-black text-slate-700">
                +5
              </span>
              <span className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-black text-slate-700">
                +10
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2.5">
            <div>
              <span className="block text-[10px] font-bold tracking-wider text-emerald-800 uppercase">
                Arqueo al cerrar caja
              </span>
              <span className="text-xs font-bold text-slate-700">
                Esperado: $ 85.000 · Contado: $ 85.000
              </span>
            </div>
            <span className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-black text-white">
              Da justo
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
      <span className="mb-2.5 block text-[11px] font-black tracking-wider text-slate-400 uppercase">
        Vista rápida · Pausar plato agotado y Aumento por porcentaje
      </span>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <div>
            <span className="block text-xs font-extrabold text-slate-900">
              Interruptor &ldquo;Disponible&rdquo; en Carta
            </span>
            <span className="text-[11px] text-slate-500">
              Al apagarlo, en la web se marca &ldquo;Agotado&rdquo; al instante.
            </span>
          </div>
          <span className="inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-emerald-600 p-0.5">
            <span className="ml-auto h-5 w-5 rounded-full bg-white shadow-2xs" />
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <div>
            <span className="block text-xs font-extrabold text-slate-900">
              Pestaña &ldquo;Aumento de precios&rdquo;
            </span>
            <span className="text-[11px] text-slate-500">
              Ej: +10% con redondeo a $ 100 en toda la carta.
            </span>
          </div>
          <span className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-black text-white">
            +10% → Vista previa
          </span>
        </div>
      </div>
    </div>
  );
}

function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export default function AyudaPage() {
  const [busqueda, setBusqueda] = useState('');
  const [moduloAbierto, setModuloAbierto] = useState<string>('mostrador');

  const termino = useMemo(() => normalizarTexto(busqueda.trim()), [busqueda]);

  const modulosFiltrados = useMemo(() => {
    if (!termino) return MODULOS_AYUDA;
    return MODULOS_AYUDA.filter((m) => {
      const enTitulo = normalizarTexto(m.titulo).includes(termino);
      const enResumen = normalizarTexto(m.resumen).includes(termino);
      const enClaves = m.palabrasClave.some((k) => normalizarTexto(k).includes(termino));
      const enPasos = m.pasos.some(
        (p) =>
          normalizarTexto(p.titulo).includes(termino) ||
          normalizarTexto(p.detalle).includes(termino),
      );
      return enTitulo || enResumen || enClaves || enPasos;
    });
  }, [termino]);

  const problemasFiltrados = useMemo(() => {
    if (!termino) return PROBLEMAS_COMUNES;
    return PROBLEMAS_COMUNES.filter((p) => {
      const enPregunta = normalizarTexto(p.pregunta).includes(termino);
      const enSolucion = normalizarTexto(p.solucion).includes(termino);
      const enClaves = p.palabrasClave.some((k) => normalizarTexto(k).includes(termino));
      return enPregunta || enSolucion || enClaves;
    });
  }, [termino]);

  const busquedasRapidas = [
    'Timbre y sonido',
    'Pago mixto',
    'Cupo / Stock',
    'Deshacer cobro',
    'Aumento de precios',
    'Impresora',
    'Clientes nuevos',
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* Cabecera y buscador */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 ring-1 ring-orange-200/60">
              <HelpCircle className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                Centro de Ayuda Rápida
              </h1>
              <p className="mt-0.5 text-sm font-medium text-slate-600">
                Respuestas claras y visuales para resolver cualquier duda durante el servicio sin frenar la cocina.
              </p>
            </div>
          </div>
        </div>

        {/* Buscador instantáneo */}
        <div className="mt-5">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder='Buscá tu duda (ej: "timbre", "pago mixto", "vuelto", "stock", "aumento", "deshacer")...'
              className="h-12 w-full rounded-xl border border-slate-300 bg-slate-50/70 pr-10 pl-11 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-semibold text-slate-500">Temas frecuentes:</span>
            {busquedasRapidas.map((etiqueta) => (
              <button
                key={etiqueta}
                type="button"
                onClick={() => setBusqueda(etiqueta === busqueda ? '' : etiqueta)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                  normalizarTexto(busqueda) === normalizarTexto(etiqueta)
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {etiqueta}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Rutina de un día de trabajo en 5 pasos (solo cuando no hay filtro activo) */}
      {!termino && (
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black tracking-tight text-slate-900 sm:text-lg">
                El turno de trabajo en 5 pasos
              </h2>
              <p className="text-xs font-medium text-slate-500">
                El orden recomendado todos los días desde que abrís el local hasta que cerrás la caja.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {RUTINA_DIARIA.map((paso) => (
              <Link
                key={paso.numero}
                href={paso.ruta}
                className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 transition-all hover:border-orange-300 hover:bg-orange-50/40"
              >
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white group-hover:bg-orange-600">
                      {paso.numero}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-orange-600" />
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900">{paso.titulo}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{paso.texto}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Guías paso a paso por pantalla */}
      <section className="space-y-3">
        <div className="px-1">
          <h2 className="text-base font-black tracking-tight text-slate-900 sm:text-lg">
            Cómo se maneja cada pantalla
          </h2>
          <p className="text-xs font-medium text-slate-500">
            Tocá cualquier bloque para ver la referencia visual de los botones y el paso a paso.
          </p>
        </div>

        {modulosFiltrados.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            No hay guías que coincidan con &ldquo;{busqueda}&rdquo;. Revisá las dudas rápidas más abajo o probá con otra palabra.
          </div>
        ) : (
          <div className="space-y-3">
            {modulosFiltrados.map((modulo) => {
              const Icono = modulo.icono;
              const abierto = Boolean(termino) || moduloAbierto === modulo.id;
              return (
                <div
                  key={modulo.id}
                  className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setModuloAbierto((actual) => (actual === modulo.id ? '' : modulo.id))
                    }
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-800">
                        <Icono className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900">{modulo.titulo}</h3>
                        <p className="mt-0.5 text-xs font-medium text-slate-500 sm:text-sm">
                          {modulo.resumen}
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${
                        abierto ? 'rotate-180 text-slate-900' : ''
                      }`}
                    />
                  </button>

                  {abierto && (
                    <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4">
                      {/* Ilustración visual de los controles reales */}
                      <IlustracionModulo id={modulo.id} />

                      <div className="grid gap-3 sm:grid-cols-2">
                        {modulo.pasos.map((paso, idx) => (
                          <div
                            key={paso.titulo}
                            className="rounded-xl border border-slate-200/80 bg-white p-3.5"
                          >
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-orange-100 text-xs font-black text-orange-800">
                                {idx + 1}
                              </span>
                              <h4 className="text-sm font-extrabold text-slate-900">
                                {paso.titulo}
                              </h4>
                            </div>
                            <p className="mt-1.5 text-xs leading-relaxed text-slate-600 sm:text-sm">
                              {paso.detalle}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        {modulo.consejo ? (
                          <p className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 ring-1 ring-amber-200/70">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-700" />
                            <span>{modulo.consejo}</span>
                          </p>
                        ) : (
                          <span />
                        )}

                        {modulo.rutaPanel && modulo.textoBoton && (
                          <Link
                            href={modulo.rutaPanel}
                            className="inline-flex shrink-0 items-center gap-1.5 self-end rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800"
                          >
                            <span>{modulo.textoBoton}</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Dudas comunes y solución de problemas en 10 segundos */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          <div>
            <h2 className="text-base font-black tracking-tight text-slate-900 sm:text-lg">
              Dudas comunes y cómo resolverlas en el momento
            </h2>
            <p className="text-xs font-medium text-slate-500">
              Situaciones típicas del servicio y qué botón tocar para solucionarlo sin depender de nadie.
            </p>
          </div>
        </div>

        {problemasFiltrados.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">
            No se encontraron preguntas frecuentes con &ldquo;{busqueda}&rdquo;.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {problemasFiltrados.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-4"
              >
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">{item.pregunta}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-700 sm:text-sm">
                    {item.solucion}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Soporte directo DelgadoDev */}
      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-900 bg-slate-900 p-5 text-white shadow-xs sm:flex-row sm:items-center sm:p-6">
        <div>
          <span className="text-[11px] font-bold tracking-widest text-orange-400 uppercase">
            Soporte Técnico · DelgadoDev · Base v{VERSION_BASE}
          </span>
          <h2 className="mt-1 text-base font-black sm:text-lg">
            ¿Necesitás cambiar el diseño de la web o tenés una consulta puntual?
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-300 sm:text-sm">
            Si necesitás modificar colores, textos de portada, dominio o tenés algún inconveniente que no esté en esta guía, escribile directo a Cristian Delgado.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          <a
            href="https://wa.me/5492617478090?text=Hola%20Cristian%2C%20te%20escribo%20desde%20el%20panel%20del%20local%20por%20una%20consulta."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-black text-slate-950 transition-colors hover:bg-orange-400"
          >
            <MessageSquare className="h-4 w-4" />
            <span>WhatsApp Soporte (+54 9 261 747-8090)</span>
          </a>
          <a
            href="https://www.delgadodev.com.ar"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-700"
          >
            <span>www.delgadodev.com.ar</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </section>
    </div>
  );
}
