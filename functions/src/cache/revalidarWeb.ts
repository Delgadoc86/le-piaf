import * as logger from 'firebase-functions/logger';
import { defineSecret, defineString } from 'firebase-functions/params';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';

/** URL de la web (Vercel en producción). En el emulador: functions/.env.local o el default. */
const WEB_URL = defineString('WEB_URL', { default: 'http://localhost:3000' });
/** Mismo valor que REVALIDATE_SECRET en la web. En el emulador: functions/.secret.local. */
const REVALIDATE_SECRET = defineSecret('REVALIDATE_SECRET');

async function avisarWeb(motivo: string): Promise<void> {
  try {
    const r = await fetch(`${WEB_URL.value()}/api/revalidate`, {
      method: 'POST',
      headers: { 'x-revalidate-secret': REVALIDATE_SECRET.value() },
    });
    if (!r.ok) logger.warn('revalidarWeb: la web respondió', { status: r.status, motivo });
  } catch (e) {
    // Si la web no está (p. ej. emulador sin Next corriendo), no es grave: se revalida al próximo cambio.
    logger.warn('revalidarWeb: no se pudo avisar a la web', { motivo, error: String(e) });
  }
}

const opciones = { secrets: [REVALIDATE_SECRET] };

/** Cambios en la carta o en el local → la web pública se regenera en segundos (ROADMAP §10). */
export const revalidarLocal = onDocumentWritten({ document: 'local/{doc}', ...opciones }, () =>
  avisarWeb('local'),
);
export const revalidarCategorias = onDocumentWritten(
  { document: 'categorias/{id}', ...opciones },
  () => avisarWeb('categorias'),
);
export const revalidarProductos = onDocumentWritten(
  { document: 'productos/{id}', ...opciones },
  () => avisarWeb('productos'),
);
export const revalidarPromos = onDocumentWritten({ document: 'promos/{id}', ...opciones }, () =>
  avisarWeb('promos'),
);
