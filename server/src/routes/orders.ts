import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { toNumber } from '../lib/serialize.js';

export const ordersRouter = Router();

const serializeOrder = <
  T extends { subtotal: unknown; shipping: unknown; total: unknown; items?: { unitPrice: unknown }[] },
>(
  o: T,
) => {
  // El token de acceso nunca sale en la respuesta: ya lo tiene quien pregunta.
  const { accessToken: _oculto, ...resto } = o as T & { accessToken?: string };
  return {
    ...resto,
    subtotal: toNumber(o.subtotal as never),
    shipping: toNumber(o.shipping as never),
    total: toNumber(o.total as never),
    items: o.items?.map((i) => ({ ...i, unitPrice: toNumber(i.unitPrice as never) })),
  };
};

/** Comparación en tiempo constante, para no filtrar el token carácter a carácter. */
function tokenCoincide(recibido: unknown, esperado: string | null): boolean {
  // Los pedidos anteriores a esta fase no tienen token: no se pueden consultar
  // por esa vía, sólo autenticado. Es la degradación segura.
  if (!esperado) return false;
  if (typeof recibido !== 'string' || recibido.length !== esperado.length) return false;
  return timingSafeEqual(Buffer.from(recibido), Buffer.from(esperado));
}

/**
 * GET /api/orders/:id — consulta de un pedido.
 *
 * Antes esto NO pedía nada: con el identificador se obtenía nombre, dirección,
 * ciudad, código postal, email y líneas. El comentario del código lo justificaba
 * diciendo que el cuid «no es adivinable», pero ese identificador viaja en la
 * URL de la página de confirmación: acaba en el historial, en la cabecera
 * `Referer` hacia terceros y en cualquier enlace que alguien reenvíe. No era un
 * secreto, era un identificador tratado como si lo fuera.
 *
 * Ahora hacen falta credenciales, de una de estas tres formas:
 *   · ser el dueño autenticado del pedido,
 *   · ser administrador,
 *   · presentar el token de acceso emitido al crear el pedido — que es lo que
 *     permite a quien compra sin cuenta ver su confirmación.
 *
 * Un pedido inexistente y uno ajeno responden EXACTAMENTE igual. Si no, la
 * diferencia entre 404 y 403 permitiría averiguar qué pedidos existen.
 */
ordersRouter.get('/:id', async (req, res, next) => {
  // Respuesta única para «no existe» y para «no es tuyo».
  const denegar = () => res.status(404).json({ error: 'Pedido no encontrado' });

  try {
    const { id } = req.params;
    if (typeof id !== 'string' || id.length === 0 || id.length > 64) return denegar();

    const pedido = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!pedido) return denegar();

    const esAdmin = req.user?.role === 'ADMIN';
    const esDueno = Boolean(req.user && pedido.userId && pedido.userId === req.user.id);
    const conToken = tokenCoincide(
      req.query.t ?? req.get('x-order-token'),
      pedido.accessToken,
    );

    if (!esAdmin && !esDueno && !conToken) return denegar();

    res.json({ order: serializeOrder(pedido) });
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
