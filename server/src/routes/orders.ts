import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { toNumber } from '../lib/serialize.js';

export const ordersRouter = Router();

const serializeOrder = <T extends { subtotal: unknown; shipping: unknown; total: unknown; items?: { unitPrice: unknown }[] }>(
  o: T,
) => ({
  ...o,
  subtotal: toNumber(o.subtotal as never),
  shipping: toNumber(o.shipping as never),
  total: toNumber(o.total as never),
  items: o.items?.map((i) => ({ ...i, unitPrice: toNumber(i.unitPrice as never) })),
});

/** GET /api/orders/:id — confirmación de pedido (id cuid, no adivinable). */
ordersRouter.get('/:id', async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json({ order: serializeOrder(order) });
  } catch (err) {
    next(err);
  }
});

/** GET /api/orders — historial del usuario autenticado. */
ordersRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
    res.json({ orders: orders.map(serializeOrder) });
  } catch (err) {
    next(err);
  }
});
