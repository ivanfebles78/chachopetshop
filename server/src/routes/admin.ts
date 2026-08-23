import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import {
  admiteCambioOperativo,
  siguientesEstados,
  transicionValida,
} from '../lib/estados.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { serializeProduct, toNumber } from '../lib/serialize.js';
import { computeAnalytics } from '../lib/analytics.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

/** GET /api/admin/analytics — métricas de ventas, mejor día/horario y stock. */
adminRouter.get('/analytics', async (_req, res, next) => {
  try {
    const [orders, products] = await Promise.all([
      prisma.order.findMany({
        include: { items: { select: { name: true, quantity: true, unitPrice: true } } },
      }),
      prisma.product.findMany({ select: { name: true, active: true, variants: { select: { label: true, stock: true } } } }),
    ]);
    res.json(computeAnalytics(orders, products, new Date()));
  } catch (err) {
    next(err);
  }
});

const productBody = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().default(''),
  brandId: z.string(),
  price: z.number().min(0),
  compareAt: z.number().min(0).nullable().optional(),
  image: z.string().url(),
  gallery: z.array(z.string().url()).default([]),
  featured: z.boolean().default(false),
  bestseller: z.boolean().default(false),
  active: z.boolean().default(true),
  animalIds: z.array(z.string()).default([]),
  categoryIds: z.array(z.string()).default([]),
  needIds: z.array(z.string()).default([]),
  variants: z
    .array(z.object({ label: z.string(), price: z.number().min(0), sku: z.string(), stock: z.number().int().default(0) }))
    .default([]),
});

const relationConnect = (b: z.infer<typeof productBody>) => ({
  name: b.name,
  slug: b.slug,
  description: b.description,
  brandId: b.brandId,
  price: b.price,
  compareAt: b.compareAt ?? null,
  image: b.image,
  gallery: b.gallery,
  featured: b.featured,
  bestseller: b.bestseller,
  active: b.active,
  animals: { set: b.animalIds.map((id) => ({ id })) },
  categories: { set: b.categoryIds.map((id) => ({ id })) },
  needs: { set: b.needIds.map((id) => ({ id })) },
});

adminRouter.get('/products', async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: { brand: true, animals: true, categories: true, needs: true, variants: true },
    });
    res.json({ products: products.map(serializeProduct) });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/products', async (req, res, next) => {
  try {
    const b = productBody.parse(req.body);
    const product = await prisma.product.create({
      data: {
        ...relationConnect(b),
        animals: { connect: b.animalIds.map((id) => ({ id })) },
        categories: { connect: b.categoryIds.map((id) => ({ id })) },
        needs: { connect: b.needIds.map((id) => ({ id })) },
        variants: { create: b.variants },
      },
      include: { brand: true, variants: true },
    });
    res.status(201).json({ product: serializeProduct(product) });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/products/:id', async (req, res, next) => {
  try {
    const b = productBody.parse(req.body);
    // Reemplazamos variantes: borrar y recrear (simple y suficiente para el admin).
    await prisma.productVariant.deleteMany({ where: { productId: req.params.id } });
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { ...relationConnect(b), variants: { create: b.variants } },
      include: { brand: true, variants: true },
    });
    res.json({ product: serializeProduct(product) });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/products/:id', async (req, res, next) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/orders', async (_req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
    res.json({
      orders: orders.map((o) => ({
        ...o,
        subtotal: toNumber(o.subtotal),
        shipping: toNumber(o.shipping),
        total: toNumber(o.total),
        // Qué botones tiene sentido enseñar. Que lo decida el servidor evita que
        // el panel ofrezca un cambio que luego se rechaza.
        siguientes: admiteCambioOperativo(o.status) ? siguientesEstados(o.fulfillment) : [],
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/orders/:id — mover el estado OPERATIVO de un pedido.
 *
 * Lo que este endpoint hacía antes: aceptar cualquiera de cuatro estados y
 * escribirlo encima. Sin comprobar nada. Se podía devolver un pedido cobrado a
 * `PENDING` —«no pagado»— con una petición, y desde el panel, sin querer.
 *
 * Ahora:
 *
 *   · Sólo se toca `fulfillment`, el eje OPERATIVO. El estado de PAGO lo
 *     escribe únicamente el webhook firmado de Stripe. Esa garantía es de la
 *     Fase 1 y este endpoint ya no puede saltársela ni por error.
 *   · Sólo sobre pedidos cobrados. Marcar «preparando» algo cuyo pago no consta
 *     es prometer trabajo sobre dinero que no ha llegado.
 *   · Sólo transiciones que tienen sentido. De «enviado» no se vuelve a
 *     «preparando», y de «entregado» no se sale.
 *
 * CANCELAR NO DEVUELVE EL DINERO. No llama a Stripe, no emite ningún reembolso
 * y no toca el estado de pago: un pedido cobrado y cancelado sigue constando
 * como cobrado, porque el dinero sigue estando. Un reembolso es una decisión de
 * negocio con consecuencias contables y hoy no existe ni la política ni la
 * pantalla para tomarla.
 */
adminRouter.patch('/orders/:id', async (req, res, next) => {
  try {
    const { fulfillment } = z
      .object({ fulfillment: z.enum(['PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED']) })
      .parse(req.body);

    const pedido = await prisma.order.findUnique({
      where: { id: req.params.id },
      select: { id: true, status: true, fulfillment: true },
    });
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });

    if (!admiteCambioOperativo(pedido.status)) {
      return res.status(409).json({
        error: 'Este pedido todavía no consta como cobrado, así que no se puede preparar ni enviar.',
      });
    }

    if (!transicionValida(pedido.fulfillment, fulfillment)) {
      return res.status(409).json({
        error: 'Ese cambio de estado no es posible desde el estado actual del pedido.',
        siguientes: siguientesEstados(pedido.fulfillment),
      });
    }

    const actualizado = await prisma.order.update({
      where: { id: pedido.id },
      data: { fulfillment },
      select: { fulfillment: true, status: true },
    });
    res.json({
      ok: true,
      fulfillment: actualizado.fulfillment,
      status: actualizado.status,
      siguientes: siguientesEstados(actualizado.fulfillment),
    });
  } catch (err) {
    next(err);
  }
});

// --- Mensajes de contacto ---
adminRouter.get('/messages', async (_req, res, next) => {
  try {
    const messages = await prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ messages });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/messages/:id', async (req, res, next) => {
  try {
    const { read } = z.object({ read: z.boolean() }).parse(req.body);
    await prisma.contactMessage.update({ where: { id: req.params.id }, data: { read } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/messages/:id', async (req, res, next) => {
  try {
    await prisma.contactMessage.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
