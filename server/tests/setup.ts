/**
 * Entorno de pruebas.
 *
 * Se fija ANTES de que cualquier módulo lea `process.env`: `env.ts` valida al
 * importarse, así que si esto no fuese lo primero, la mitad de la suite fallaría
 * por configuración y no por lo que quiere comprobar.
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:55432/chacho_test';
process.env.JWT_SECRET ??= 'clave-solo-para-pruebas-no-usada-en-produccion';
process.env.CLIENT_ORIGIN ??= 'http://localhost:5173';
