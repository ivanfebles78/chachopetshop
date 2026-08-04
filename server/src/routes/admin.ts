import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
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
      })),
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/orders/:id', async (req, res, next) => {
  try {
    const { status } = z
      .object({ status: z.enum(['PENDING', 'PAID', 'FULFILLED', 'CANCELLED']) })
      .parse(req.body);
    const order = await prisma.order.update({ where: { id: req.params.id }, data: { status } });
    res.json({ ok: true, status: order.status });
  } catch (err) {
    next(err);
  }
});
