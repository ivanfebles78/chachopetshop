import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    // Las pruebas comparten una base de datos real: en paralelo se pisarían.
    // La suite de concurrencia necesita justamente lo contrario dentro de un
    // mismo caso, y eso se controla ahí con Promise.all, no con hilos de vitest.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
