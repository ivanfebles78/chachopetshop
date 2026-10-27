import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { ZodError } from 'zod';
import { env, isProd, origenesPermitidos } from './env.js';
import { attachUser, rejectBrokenSession } from './middleware/auth.js';
import { taxonomyRouter } from './routes/taxonomy.js';
import { productsRouter } from './routes/products.js';
import { configRouter } from './routes/config.js';
import { authRouter } from './routes/auth.js';
import { checkoutRouter, stripeWebhookHandler } from './routes/checkout.js';
import { ordersRouter } from './routes/orders.js';
import { adminRouter } from './routes/admin.js';
import { contactRouter } from './routes/contact.js';
import {
  cabecerasDeSeguridad,
  limiteAutenticacion,
  limiteCheckout,
  limiteContacto,
  limiteGeneral,
} from './middleware/security.js';

/**
 * Construye la aplicación SIN escuchar.
 *
 * Separado de `index.ts` para que las pruebas puedan montarla con supertest sin
 * abrir un puerto: una suite que necesita levantar un servidor real es una suite
 * que acaba siendo lenta, con puertos ocupados y con fallos que no son del código.
 */
export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  // Revelaba el motor sin necesidad.
  app.disable('x-powered-by');
  app.use(cabecerasDeSeguridad);

  // El webhook de Stripe necesita el body crudo → se monta ANTES de express.json.
  app.post('/api/checkout/webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler);

  app.use(
    cors({
      origin: origenesPermitidos,
      credentials: true,
    }),
  );
  // La importación masiva de productos manda el catálogo entero en JSON, que
  // supera de largo el límite por defecto (100 kb). Se le da un parser propio
  // con más holgura ANTES del global; el global ve el body ya leído y lo salta.
  app.use('/api/admin/products/import', express.json({ limit: '20mb' }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(attachUser);

  app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));
  app.use('/api', limiteGeneral);
  /*
   * La API NO se cachea. Sin esto, Express pone un ETag pero ningún
   * `Cache-Control`, así que el navegador cachea «a su criterio» las respuestas
   * GET y, al cambiar un filtro, devolvía datos viejos hasta forzar recarga.
   * `no-store` garantiza que cada petición trae datos frescos.
   */
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use('/api/taxonomy', taxonomyRouter);
  app.use('/api/config', configRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/auth', limiteAutenticacion, authRouter);
  /*
   * `rejectBrokenSession` sólo aquí: es donde la identidad decide de quién es el
   * pedido. Con una cookie que ya no verifica, seguir adelante como invitado
   * crea un pedido sin dueño sin que nadie se entere.
   */
  app.use('/api/checkout', limiteCheckout, rejectBrokenSession, checkoutRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/contact', limiteContacto, contactRouter);
  app.use('/api/admin', adminRouter);

  // --- En producción, servimos el build del frontend desde el mismo servicio ---
  if (isProd) {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const clientDist = path.resolve(__dirname, '../../client/dist');
    if (existsSync(clientDist)) {
      /*
       * Caché del front, por tipo de fichero:
       *   · `index.html` → `no-cache`: el navegador SIEMPRE revalida, así que tras
       *     un despliegue coge el bundle nuevo sin tener que forzar recarga.
       *   · `/assets/*` (JS/CSS con hash en el nombre) → cacheados «para siempre»
       *     e inmutables: el hash cambia en cada build, así que nunca sirven viejo.
       */
      app.use(
        express.static(clientDist, {
          setHeaders: (res, filePath) => {
            if (filePath.endsWith('.html')) {
              res.setHeader('Cache-Control', 'no-cache');
            } else if (/[\\/]assets[\\/]/.test(filePath)) {
              res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            }
          },
        }),
      );
      app.get('*', (_req, res) => {
        res.setHeader('Cache-Control', 'no-cache');
        res.sendFile(path.join(clientDist, 'index.html'));
      });
    }
  }

  // --- Manejo de errores centralizado ---
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: err.flatten().fieldErrors });
    }
    const status = (err as { status?: number }).status ?? 500;
    if (status >= 500) console.error(err);
    /*
     * Un 5xx no devuelve su mensaje interno en producción: puede contener rutas,
     * consultas o detalles del proveedor. Los 4xx sí, porque son mensajes
     * escritos para quien usa la tienda («no hay stock suficiente»).
     */
    const message =
      status >= 500 && isProd
        ? 'Error interno del servidor'
        : ((err as Error).message ?? 'Error interno');
    res.status(status).json({ error: message });
  });

  return app;
}
