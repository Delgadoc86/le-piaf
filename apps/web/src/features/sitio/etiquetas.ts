/**
 * Etiquetas de caché de la web pública. Van aparte de datos.ts para que /api/revalidate no cargue
 * Firebase Admin: invalidar la caché no necesita leer nada.
 */
export const TAG_CARTA = 'carta';
