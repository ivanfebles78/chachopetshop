import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { ZodError } from 'zod';
import { env, isProd } from './env.js';
import { attachUser } from './middleware/auth.js';
import { taxonomyRouter } from './routes/taxonomy.js';
import { productsRouter } from './routes/products.js';
import { authRouter } from './routes/auth.js';
import { checkoutRouter, stripeWebhookHandler } from './routes/checkout.js';
import { ordersRouter } from './routes/orders.js';
import { adminRouter } from './routes/admin.js';

const app = express();
app.set('trust proxy', 1);

// El webhook de Stripe necesita el body crudo → se monta ANTES de express.json.
app.post('/api/checkout/webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler);

app.use(
  cors({
    origin: env.CLIENT_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(attachUser);

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.use('/api/taxonomy', taxonomyRouter);
app.use('/api/products', productsRouter);
app.use('/api/auth', authRouter);
app.use('/api/checkout', checkoutRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/admin', adminRouter);

// --- En producción, servimos el build del frontend desde el mismo servicio ---
if (isProd) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const clientDist = path.resolve(__dirname, '../../client/dist');
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }
}

// --- Manejo de errores centralizado ---
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Datos inválidos', details: err.flatten().fieldErrors });
  }
  const status = (err as { status?: number }).status ?? 500;
  const message = (err as Error).message ?? 'Error interno';
  if (status >= 500) console.error(err);
  res.status(status).json({ error: message });
});

app.listen(env.PORT, () => {
  console.log(`🐾 Chacho Pet Shop API escuchando en http://localhost:${env.PORT}`);
});
