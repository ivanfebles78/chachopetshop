import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import Stripe from 'stripe';
import { prisma } from '../db.js';
import { env } from '../env.js';
import { toNumber } from '../lib/serialize.js';

export const checkoutRouter = Router();

const FREE_SHIPPING_THRESHOLD = 49;
const SHIPPING_FLAT = 4.95;

const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;

const checkoutBody = z.object({
  email: z.string().email(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        variantId: z.string().optional(),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1, 'El carrito está vacío'),
  shipping: z
    .object({
      name: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      zip: z.string().optional(),
    })
    .optional(),
});

/**
 * Reconstruye el pedido con precios AUTORITATIVOS de la BD (nunca se confía en
 * los precios que manda el cliente) y crea un Order en estado PENDING.
 */
async function buildOrder(input: z.infer<typeof checkoutBody>) {
  const ids = [...new Set(input.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, active: true },
    include: { variants: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lineItems = input.items.map((item) => {
    const product = byId.get(item.productId);
    if (!product) throw Object.assign(new Error('Producto no disponible'), { status: 400 });
    const variant = item.variantId
      ? product.variants.find((v) => v.id === item.variantId)
      : undefined;
    const unitPrice = toNumber(variant?.price ?? product.price) ?? 0;
    return {
      productId: product.id,
      variantId: variant?.id ?? null,
      name: product.name,
      variantLabel: variant?.label ?? null,
      image: product.image,
      unitPrice,
      quantity: item.quantity,
    };
  });

  const subtotal = lineItems.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_FLAT;
  const total = subtotal + shipping;

  const order = await prisma.order.create({
    data: {
      email: input.email,
      subtotal,
      shipping,
      total,
      shippingName: input.shipping?.name,
      shippingAddress: input.shipping?.address,
      shippingCity: input.shipping?.city,
      shippingZip: input.shipping?.zip,
      items: { create: lineItems },
    },
    include: { items: true },
  });

  return { order, lineItems, subtotal, shipping, total };
}

checkoutRouter.post('/', async (req, res, next) => {
  try {
    const input = checkoutBody.parse(req.body);
    if (req.user) input.email = req.user.email;
    const { order, lineItems } = await buildOrder(input);
    if (req.user) await prisma.order.update({ where: { id: order.id }, data: { userId: req.user.id } });

    // --- Modo demo: sin claves de Stripe, marcamos pagado y devolvemos éxito ---
    if (!stripe) {
      await prisma.order.update({ where: { id: order.id }, data: { status: 'PAID' } });
      // URL relativa: el navegador la resuelve contra el origen actual (funciona
      // en local y en producción sin depender de PUBLIC_SITE_URL).
      return res.json({ demo: true, orderId: order.id, url: `/checkout/success?order=${order.id}` });
    }

    // --- Stripe Checkout real ---
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: input.email,
      line_items: lineItems.map((l) => ({
        quantity: l.quantity,
        price_data: {
          currency: 'eur',
          unit_amount: Math.round(l.unitPrice * 100),
          product_data: { name: l.variantLabel ? `${l.name} · ${l.variantLabel}` : l.name },
        },
      })),
      metadata: { orderId: order.id },
      success_url: `${env.PUBLIC_SITE_URL}/checkout/success?order=${order.id}`,
      cancel_url: `${env.PUBLIC_SITE_URL}/checkout/cancel?order=${order.id}`,
    });

    await prisma.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } });
    res.json({ demo: false, orderId: order.id, url: session.url });
  } catch (err) {
    next(err);
  }
});

/**
 * Webhook de Stripe. Se monta con express.raw en index.ts porque necesita el
 * cuerpo sin parsear para verificar la firma.
 */
export async function stripeWebhookHandler(req: Request, res: Response) {
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) return res.status(200).json({ skipped: true });
  const sig = req.headers['stripe-signature'];
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig as string, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook error: ${(err as Error).message}`);
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (orderId) await prisma.order.update({ where: { id: orderId }, data: { status: 'PAID' } });
  }
  res.json({ received: true });
}
