/**
 * Empaqueta las Functions para el deploy (ROADMAP §15).
 *
 * Firebase instala las dependencias en la nube con npm, que no entiende "workspace:*"
 * (@app/shared). Por eso se arma functions/deploy/ con:
 *   - index.js: nuestro código + @app/shared + zod en un solo archivo (esbuild);
 *   - package.json: solo firebase-admin y firebase-functions (las instala Firebase).
 * Los emuladores siguen usando functions/ tal cual (firebase.json); el deploy usa firebase.deploy.json.
 */
import { execSync } from 'node:child_process';
import { build } from 'esbuild';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const aqui = (ruta) => fileURLToPath(new URL(ruta, import.meta.url));
const pkg = JSON.parse(readFileSync(aqui('./package.json'), 'utf8'));
const EXTERNAS = ['firebase-admin', 'firebase-functions'];

// Se vacía el contenido (no la carpeta): en Windows una carpeta abierta en una terminal no se puede borrar.
mkdirSync(aqui('./deploy'), { recursive: true });
for (const x of readdirSync(aqui('./deploy'))) rmSync(aqui(`./deploy/${x}`), { recursive: true, force: true });

await build({
  entryPoints: [aqui('./src/index.ts')],
  outfile: aqui('./deploy/index.js'),
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  sourcemap: true,
  // firebase-admin y firebase-functions (y sus subrutas) se instalan en la nube.
  external: EXTERNAS.flatMap((d) => [d, `${d}/*`]),
  // Algunas dependencias CommonJS usan require(): se lo damos en ESM.
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  logLevel: 'warning',
});

writeFileSync(
  aqui('./deploy/package.json'),
  JSON.stringify(
    {
      name: 'app-functions',
      private: true,
      type: 'module',
      main: 'index.js',
      engines: pkg.engines,
      dependencies: Object.fromEntries(EXTERNAS.map((d) => [d, pkg.dependencies[d]])),
    },
    null,
    2,
  ) + '\n',
);

// Parámetros por proyecto (.env.<proyecto>, p. ej. WEB_URL). Nunca los secretos locales del emulador.
for (const archivo of readdirSync(aqui('./'))) {
  if (/^\.env(\.[\w-]+)?$/.test(archivo) && !archivo.endsWith('.local')) {
    copyFileSync(aqui(`./${archivo}`), aqui(`./deploy/${archivo}`));
  }
}

// El CLI de Firebase analiza el código localmente antes de subirlo: necesita node_modules.
// Se instala con npm DESDE la carpeta deploy (con --prefix desde otra carpeta, npm agrega esa
// carpeta como dependencia). Queda un package-lock.json para que la nube instale lo mismo.
execSync('npm install --omit=dev --no-audit --no-fund', { cwd: aqui('./deploy'), stdio: 'inherit' });

console.log('✅ functions/deploy listo (index.js + package.json sin dependencias internas)');
