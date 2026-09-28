/**
 * Sube silverio/assets/** a Storage (locales/silverio/...) y devuelve un mapa
 * "ruta relativa del kit" → URL pública. Se puede correr solo o desde seed.ts.
 *
 *   node --experimental-strip-types scripts/subir-assets.ts [--proyecto <id> --si-estoy-seguro]
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { bucket, destino, urlPublica } from './entorno.ts';

const raiz = fileURLToPath(new URL('../', import.meta.url));

const TIPOS: Record<string, string> = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

function listar(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    return statSync(ruta).isDirectory() ? listar(ruta) : [ruta];
  });
}

/** @returns mapa "assets/marca/logo.webp" → URL pública */
export async function subirAssets(localId: string, carpetaKit = 'silverio'): Promise<Map<string, string>> {
  const base = join(raiz, carpetaKit);
  const urls = new Map<string, string>();
  for (const archivo of listar(join(base, 'assets'))) {
    const rel = relative(base, archivo).split(sep).join('/'); // assets/marca/logo.webp
    const contentType = TIPOS[extname(archivo).toLowerCase()];
    if (!contentType) continue;
    const ruta = `locales/${localId}/${rel.replace(/^assets\//, '')}`;
    await bucket.file(ruta).save(readFileSync(archivo), {
      contentType,
      metadata: { cacheControl: 'public, max-age=31536000' },
    });
    urls.set(rel, urlPublica(ruta));
  }
  return urls;
}

// Uso directo desde la terminal.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const urls = await subirAssets('silverio');
  console.log(`✅ ${urls.size} archivos subidos a ${destino()}`);
}
