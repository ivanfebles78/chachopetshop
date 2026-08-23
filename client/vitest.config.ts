import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  /*
   * Las pruebas pueden leer ficheros del servidor como texto (`?raw`).
   *
   * Lo necesita `src/lib/zona-envio.test.ts`, que compara las reglas de envío
   * del cliente con las de `server/src/lib/envio.ts` para que no se separen.
   * Vite bloquea por defecto todo lo que está fuera de la raíz del proyecto, y
   * hace bien: esto es sólo para las pruebas. `vite.config.ts` —el que compila
   * lo que se publica— no lleva este permiso.
   */
  server: {
    fs: { allow: ['..'] },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
  },
});
