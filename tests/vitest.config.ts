import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['reglas/**/*.test.ts'],
    // Todos los tests comparten el mismo emulador: van en serie.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
