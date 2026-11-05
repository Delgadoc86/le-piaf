/**
 * scripts/guardia.mjs
 *
 * Sistema de barreras permanentes para locales gastronómicos (§8b).
 * Protege contra modificaciones accidentales de archivos genéricos en las copias.
 *
 * Subcomandos:
 *   node scripts/guardia.mjs sellar     -> Genera .base-manifest.json con hashes sha256 de archivos genéricos.
 *   node scripts/guardia.mjs verificar  -> Valida en CI/local que los archivos genéricos coincidan con el manifiesto.
 *   node scripts/guardia.mjs pre-commit -> Hook local que bloquea commits genéricos si .repo-role tiene rol=copia.
 */
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../', import.meta.url));

/**
 * Determina si una ruta es propia del local (permitida en copias)
 * o si es genérica (pertenece a la base).
 */
export function esPropioDelLocal(relPath, kitPropio = null) {
  const norm = relPath.replace(/\\/g, '/');

  // Kit del local (carpeta raíz con datos, fotos, manual, etc.)
  if (kitPropio && (norm === kitPropio || norm.startsWith(`${kitPropio}/`))) {
    return true;
  }
  if (
    norm.startsWith('silverio/') ||
    norm.startsWith('lepiaf/') ||
    norm.startsWith('bautista/')
  ) {
    return true;
  }

  // Componentes y páginas públicas visuales
  if (norm.startsWith('apps/web/src/components/publico/')) return true;
  if (norm.startsWith('apps/web/src/app/(sitio)/')) return true;
  if (norm.startsWith('apps/web/public/')) return true;

  // Configuración local de Firebase y Vercel
  if (norm === '.firebaserc') return true;
  if (norm.startsWith('functions/.env.')) return true;
  if (norm === 'apps/web/.env.example') return true;
  if (norm.startsWith('apps/web/.env')) return true;
  if (norm.startsWith('functions/.secret')) return true;
  if (norm === 'service-account.json' || norm === 'revalidate-secret.txt') return true;

  // Documentos y marcadores locales
  if (norm.startsWith('ROADMAP_') && norm.endsWith('.md')) return true;
  if (norm === 'PENDIENTES_BASE.md') return true;
  if (norm === '.repo-role') return true;

  return false;
}

/**
 * Calcula el hash SHA-256 de un archivo, normalizando saltos de línea en texto
 * para garantizar coincidencia entre Windows (CRLF) y Linux/CI (LF).
 */
export function hashFile(filePath) {
  const buf = fs.readFileSync(filePath);
  const isBinary = buf.includes(0);
  if (isBinary) {
    return crypto.createHash('sha256').update(buf).digest('hex');
  }
  const text = buf.toString('utf8').replace(/\r\n/g, '\n');
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Lee .repo-role si existe en la raíz.
 */
export function obtenerRolYKit() {
  const rolePath = path.join(raiz, '.repo-role');
  if (!fs.existsSync(rolePath)) {
    return { rol: 'base', kit: null };
  }
  const contenido = fs.readFileSync(rolePath, 'utf8');
  let rol = 'copia';
  let kit = null;
  for (const linea of contenido.split(/\r?\n/)) {
    const trimmed = linea.trim();
    if (trimmed.startsWith('rol=')) rol = trimmed.slice(4).trim();
    if (trimmed.startsWith('kit=')) kit = trimmed.slice(4).trim();
  }
  return { rol, kit };
}

function obtenerVersionBase() {
  try {
    const constantesPath = path.join(raiz, 'packages/shared/src/constantes.ts');
    const contenido = fs.readFileSync(constantesPath, 'utf8');
    const match = contenido.match(/VERSION_BASE\s*=\s*['"]([^'"]+)['"]/);
    return match ? match[1] : '2.0.0';
  } catch {
    return '2.0.0';
  }
}

function sellar() {
  const { kit } = obtenerRolYKit();
  const versionBase = obtenerVersionBase();
  const salida = execSync('git ls-files', { cwd: raiz, encoding: 'utf8' });
  const archivos = salida
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/\\/g, '/'))
    .filter(Boolean)
    .filter((f) => f !== '.base-manifest.json' && !esPropioDelLocal(f, kit))
    .sort();

  const manifest = {
    version: 2,
    versionBase,
    actualizado: new Date().toISOString(),
    totalArchivos: archivos.length,
    archivos: {},
  };

  for (const f of archivos) {
    const fullPath = path.join(raiz, f);
    if (fs.existsSync(fullPath)) {
      manifest.archivos[f] = hashFile(fullPath);
    }
  }

  const manifestPath = path.join(raiz, '.base-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(
    `✅ Manifiesto Base v${versionBase} sellado exitosamente con ${archivos.length} archivos genéricos en .base-manifest.json`,
  );
}

function verificar() {
  const manifestPath = path.join(raiz, '.base-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('❌ Error: No existe .base-manifest.json. Ejecutá "pnpm base:sellar" en la base.');
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const { kit } = obtenerRolYKit();
  const errores = [];

  // 1. Verificar integridad de archivos registrados
  for (const [archivo, hashEsperado] of Object.entries(manifest.archivos)) {
    const fullPath = path.join(raiz, archivo);
    if (!fs.existsSync(fullPath)) {
      errores.push(`FALTA archivo genérico: ${archivo}`);
      continue;
    }
    const hashActual = hashFile(fullPath);
    if (hashActual !== hashEsperado) {
      errores.push(`MODIFICADO archivo genérico: ${archivo}`);
    }
  }

  // 2. Verificar si hay archivos genéricos nuevos no registrados
  try {
    const salida = execSync('git ls-files', { cwd: raiz, encoding: 'utf8' });
    const versionados = salida
      .split(/\r?\n/)
      .map((l) => l.trim().replace(/\\/g, '/'))
      .filter(Boolean)
      .filter((f) => f !== '.base-manifest.json' && !esPropioDelLocal(f, kit));

    for (const f of versionados) {
      if (!manifest.archivos[f]) {
        errores.push(`EXTRA no registrado en manifiesto base: ${f}`);
      }
    }
  } catch {
    // Si git no está disponible, la verificación del manifiesto es suficiente
  }

  if (errores.length > 0) {
    console.error('❌ FALLO DE GUARDIA: Se detectaron divergencias en archivos genéricos de la base:');
    for (const err of errores) {
      console.error(`   - ${err}`);
    }
    console.error('\nEn una copia no se permite modificar archivos genéricos.');
    console.error('Los cambios genéricos deben hacerse en silverio-club y sincronizarse con "git merge base/main".');
    process.exit(1);
  }

  const ver = manifest.versionBase ? ` (Base v${manifest.versionBase})` : '';
  console.log(
    `✅ Verificación de guardia exitosa${ver}: los ${Object.keys(manifest.archivos).length} archivos genéricos coinciden con la base.`,
  );
  process.exit(0);
}

function preCommit() {
  // 1. Permitir merge commits (ej. git merge base/main)
  const gitDir = path.join(raiz, '.git');
  if (fs.existsSync(path.join(gitDir, 'MERGE_HEAD'))) {
    process.exit(0);
  }

  // 2. Escape de emergencia
  if (process.env.ALLOW_BASE_EDIT === '1') {
    console.warn('⚠️ [GUARDIA] ALLOW_BASE_EDIT=1 activado: commit permitido por emergencia.');
    console.warn('⚠️ Atención: CI fallará hasta que este cambio genérico se porte a la base.');
    process.exit(0);
  }

  // 3. Verificar si el repo es una copia
  const { rol, kit } = obtenerRolYKit();
  if (rol !== 'copia') {
    // En la base no se bloquea
    process.exit(0);
  }

  // 4. En copia: inspeccionar archivos preparados para commit
  let staged = [];
  try {
    const salida = execSync('git diff --cached --name-only', { cwd: raiz, encoding: 'utf8' });
    staged = salida
      .split(/\r?\n/)
      .map((l) => l.trim().replace(/\\/g, '/'))
      .filter(Boolean);
  } catch (err) {
    console.error('Error al verificar archivos en staging:', err.message);
    process.exit(1);
  }

  const bloqueados = staged.filter((f) => !esPropioDelLocal(f, kit));

  if (bloqueados.length > 0) {
    console.error('\n🛑 COMMIT BLOQUEADO POR GUARDIA DE COPIA');
    console.error(`Este repositorio está configurado como rol=copia (kit: ${kit || 'autodetectado'}).`);
    console.error('No está permitido modificar archivos genéricos en una copia de local.\n');
    console.error('Archivos protegidos que intentás commitear:');
    for (const f of bloqueados) {
      console.error(`  ❌ ${f}`);
    }
    console.error('\n¿Cómo proceder?');
    console.error('1. Hacé el cambio en el repo base (silverio-club).');
    console.error('2. Bájalo a esta copia con: git fetch base && git merge base/main');
    console.error('3. Si es una emergencia real en producción (viernes 22 hs), podés forzar con:');
    console.error('   $env:ALLOW_BASE_EDIT="1"; git commit ...');
    console.error('   (El CI quedará en rojo hasta que portes el arreglo a la base).\n');
    process.exit(1);
  }

  process.exit(0);
}

const comando = process.argv[2];

if (comando === 'sellar') {
  sellar();
} else if (comando === 'verificar') {
  verificar();
} else if (comando === 'pre-commit') {
  preCommit();
} else {
  console.error('Comando desconocido. Uso: node scripts/guardia.mjs <sellar|verificar|pre-commit>');
  process.exit(1);
}

