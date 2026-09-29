import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { como, crearEntorno, type NombreUsuario } from './entorno.js';

let env: RulesTestEnvironment;

const storage = (u: NombreUsuario | null) => como(env, u).storage();
const bytes = (n: number) => new Uint8Array(n);
const webp = { contentType: 'image/webp' };

beforeAll(async () => {
  env = await crearEntorno();
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await uploadBytes(ref(ctx.storage(), 'imagenes/marca/logo.webp'), bytes(10), webp);
  });
});

describe('storage', () => {
  it('lectura pública de las imágenes del local', async () => {
    await assertSucceeds(getBytes(ref(storage(null), 'imagenes/marca/logo.webp')));
  });

  it('dueño y encargado suben imágenes de hasta 2 MB', async () => {
    await assertSucceeds(uploadBytes(ref(storage('dueno'), 'imagenes/productos/p1.webp'), bytes(1000), webp));
    await assertSucceeds(
      uploadBytes(ref(storage('encargado'), 'imagenes/productos/p2.jpg'), bytes(2 * 1024 * 1024), {
        contentType: 'image/jpeg',
      }),
    );
  });

  it('rechaza archivos grandes, no imágenes y SVG', async () => {
    const r = (nombre: string) => ref(storage('dueno'), `imagenes/productos/${nombre}`);
    await assertFails(uploadBytes(r('grande.webp'), bytes(2 * 1024 * 1024 + 1), webp));
    await assertFails(uploadBytes(r('script.js'), bytes(10), { contentType: 'application/javascript' }));
    await assertFails(uploadBytes(r('logo.svg'), bytes(10), { contentType: 'image/svg+xml' }));
  });

  it('mozo, cocina, usuarios sin rol y anónimos no suben ni borran', async () => {
    const ruta = 'imagenes/productos/x.webp';
    for (const u of ['mozo', 'cocina', 'sinRol', null] as const) {
      await assertFails(uploadBytes(ref(storage(u), ruta), bytes(10), webp));
      await assertFails(deleteObject(ref(storage(u), 'imagenes/marca/logo.webp')));
    }
  });

  it('el gestor borra imágenes', async () => {
    await assertSucceeds(deleteObject(ref(storage('dueno'), 'imagenes/marca/logo.webp')));
  });

  it('fuera de imagenes/ no se escribe nada', async () => {
    await assertFails(uploadBytes(ref(storage('dueno'), 'otra/cosa.webp'), bytes(10), webp));
  });
});
