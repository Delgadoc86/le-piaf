'use client';

/**
 * Sube una imagen a Storage (imagenes/<carpeta>/...), comprimida en el navegador a webp
 * (máx. 1600 px, ~250 KB): el celular del dueño puede sacar fotos de 5 MB (ROADMAP §10).
 */
import imageCompression from 'browser-image-compression';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { CARPETA_IMAGENES } from '@app/shared';
import { firebase } from '@/lib/firebase/client';

export const TIPOS_IMAGEN = 'image/jpeg,image/png,image/webp,image/avif';

export async function subirImagen(archivo: File, carpeta: string, maxLado = 1600): Promise<string> {
  if (!archivo.type.startsWith('image/') || archivo.type === 'image/svg+xml') {
    throw new Error('Elegí una foto (JPG, PNG o WebP).');
  }
  const comprimida = await imageCompression(archivo, {
    maxWidthOrHeight: maxLado,
    maxSizeMB: 0.25,
    fileType: 'image/webp',
    initialQuality: 0.82,
    useWebWorker: true,
  });
  const nombre = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const destino = ref(firebase().storage, `${CARPETA_IMAGENES}/${carpeta}/${nombre}`);
  await uploadBytes(destino, comprimida, {
    contentType: 'image/webp',
    cacheControl: 'public, max-age=31536000',
  });
  return getDownloadURL(destino);
}
