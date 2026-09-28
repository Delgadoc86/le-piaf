/** Valores iniciales de un local recién creado (crearLocal y seed del local demo). */
import { SECCIONES_WEB, VARIANTES_ESTILO, ZONA_HORARIA_DEFAULT, type EstiloWeb } from './constantes.js';
import type { LocalEditable } from './esquemas.js';

/** Estilo por defecto: la primera variante de cada opción. */
export function estiloPorDefecto(): EstiloWeb {
  return {
    hero: VARIANTES_ESTILO.hero[0],
    promos: VARIANTES_ESTILO.promos[0],
    carta: VARIANTES_ESTILO.carta[0],
    nosotros: VARIANTES_ESTILO.nosotros[0],
    bordes: VARIANTES_ESTILO.bordes[0],
    titulosSeccion: VARIANTES_ESTILO.titulosSeccion[0],
    separadores: VARIANTES_ESTILO.separadores[0],
    botones: VARIANTES_ESTILO.botones[0],
  };
}

export function localPorDefecto(datos: {
  nombre: string;
  zonaHoraria?: string | undefined;
}): LocalEditable {
  const nombre = datos.nombre.trim();
  return {
    nombre,
    nombreCorto: nombre.slice(0, 30),
    descripcionCorta: '',
    activo: true,
    zonaHoraria: datos.zonaHoraria ?? ZONA_HORARIA_DEFAULT,
    contacto: { whatsapp: '5490000000000' },
    direccion: {
      calle: 'Sin dirección',
      localidad: 'Sin localidad',
      departamento: '',
      provincia: 'Mendoza',
      cp: '',
      pais: 'AR',
      geo: { lat: -32.8895, lng: -68.8458 },
      googleMapsUrl: 'https://maps.google.com',
    },
    horarios: [{ dias: [2, 3, 4, 5, 6, 0], desde: '19:00', hasta: '00:00' }],
    cierresEspeciales: [],
    marca: {
      colorPrimario: '#f97316',
      colorPrimarioHover: '#ea580c',
      colorFondo: '#ffffff',
      colorSuperficie: '#f5f5f4',
      colorTexto: '#1c1917',
      colorTextoSecundario: '#57534e',
      fuenteTitulos: 'Poppins',
      fuenteTexto: 'Inter',
      logoUrl: '',
      faviconUrl: '',
      ogImageUrl: '',
      heroDesktopUrl: '',
      heroMovilUrl: '',
    },
    web: {
      secciones: SECCIONES_WEB.map((tipo, i) => ({ tipo, visible: tipo !== 'galeria', orden: i + 1 })),
      estilo: estiloPorDefecto(),
      hero: { bajada: '', titulo: nombre.toUpperCase().slice(0, 80), textoBoton: 'Ver carta' },
      nosotros: { titulo: 'Nosotros', parrafos: [], fotoUrl: '', frase: '', tarjetas: [], cierre: '' },
      galeria: [],
      seo: { titulo: nombre, descripcion: '', keywords: [] },
    },
    pedidos: {
      habilitados: false,
      tipos: { takeAway: true, delivery: false, salon: false },
      tiempoEstimadoMin: 30,
      pedidoMinimo: 0,
      requiereConfirmacionMozoQR: true,
    },
    pagos: {
      efectivo: true,
      transferencia: { habilitado: false, alias: '', titular: '' },
      mercadoPago: { habilitado: false, conectado: false },
    },
  };
}
