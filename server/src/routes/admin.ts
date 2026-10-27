import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
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

// Las imágenes del catálogo pueden ser URLs externas (semilla, picsum) o rutas
// propias servidas por el front (`/productos/…`). `z.string().url()` rechazaba
// las segundas, así que al guardar un accesorio desde el panel fallaba la
// validación. Aceptamos ambas.
const imagen = z
  .string()
  .min(1)
  .refine((s) => /^https?:\/\//.test(s) || s.startsWith('/'), 'Debe ser una URL http(s) o una ruta que empiece por «/».');

const productBody = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().default(''),
  /** Línea de producto (jaulas, Descanso, Gourmet…). Nullable. */
  line: z.string().nullable().optional(),
  brandId: z.string(),
  price: z.number().min(0),
  compareAt: z.number().min(0).nullable().optional(),
  image: imagen,
  gallery: z.array(imagen).default([]),
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
  line: b.line ?? null,
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

/**
 * GET /api/admin/products — listado para gestionar el catálogo.
 *
 * Devuelve TODOS los productos (activos e inactivos) con lo justo para la tabla
 * y el editor: sin `contenido` (el JSON grande de la ficha) ni galería, para que
 * el payload sea ligero aunque haya más de mil productos. El filtrado, la
 * búsqueda y el orden se hacen en el cliente sobre esta lista.
 *
 * Incluye también `lineas`: los valores de línea existentes, para ofrecerlos
 * como filtro y como sugerencias al editar.
 */
adminRouter.get('/products', async (_req, res, next) => {
  try {
    const [rows, lineRows] = await Promise.all([
      prisma.product.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          image: true,
          price: true,
          active: true,
          line: true,
          brand: { select: { id: true, name: true, slug: true } },
          animals: { select: { id: true, slug: true, name: true } },
          categories: { select: { id: true, slug: true, name: true } },
          needs: { select: { id: true, slug: true, name: true } },
          variants: { select: { id: true, sku: true, price: true, stock: true, label: true }, orderBy: { price: 'asc' } },
        },
      }),
      prisma.product.findMany({ where: { line: { not: null } }, select: { line: true }, distinct: ['line'] }),
    ]);
    const products = rows.map((p) => ({
      ...p,
      price: toNumber(p.price),
      variants: p.variants.map((v) => ({ ...v, price: toNumber(v.price) })),
    }));
    const lineas = lineRows
      .map((l) => l.line)
      .filter((l): l is string => Boolean(l))
      .sort((a, b) => a.localeCompare(b, 'es'));
    res.json({ products, lineas });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/products/:id — edición puntual de un producto.
 *
 * Solo toca los campos que llegan (nombre, descripción, línea, precio, marca,
 * animales, categorías, necesidades, activo). NO recrea variantes —a diferencia
 * del PUT— para no perder su SKU/stock. Como cada producto es «una ficha por
 * formato» (una variante), al cambiar el precio se iguala también el de la
 * variante, que es el que se ve en la tienda.
 */
const productPatch = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  line: z.string().nullable().optional(),
  price: z.number().min(0).nullable().optional(),
  brandId: z.string().nullable().optional(),
  active: z.boolean().optional(),
  animalIds: z.array(z.string()).optional(),
  categoryIds: z.array(z.string()).optional(),
  needIds: z.array(z.string()).optional(),
});

adminRouter.patch('/products/:id', async (req, res, next) => {
  try {
    const b = productPatch.parse(req.body);
    const id = req.params.id;
    const data: Prisma.ProductUpdateInput = {};
    if (b.name !== undefined) data.name = b.name;
    if (b.description !== undefined) data.description = b.description;
    if (b.line !== undefined) data.line = b.line; // null = quitar la línea
    if (b.active !== undefined) data.active = b.active;
    if (b.price !== undefined) data.price = b.price;
    if (b.brandId !== undefined) data.brand = b.brandId ? { connect: { id: b.brandId } } : { disconnect: true };
    if (b.animalIds) data.animals = { set: b.animalIds.map((x) => ({ id: x })) };
    if (b.categoryIds) data.categories = { set: b.categoryIds.map((x) => ({ id: x })) };
    if (b.needIds) data.needs = { set: b.needIds.map((x) => ({ id: x })) };

    // El precio que ve el cliente es el de la variante; al cambiarlo (o vaciarlo
    // = «a consultar») igualamos también las variantes para que coincida.
    if (b.price !== undefined) {
      await prisma.productVariant.updateMany({ where: { productId: id }, data: { price: b.price } });
    }
    const product = await prisma.product.update({
      where: { id },
      data,
      include: { brand: true, animals: true, categories: true, needs: true, variants: true },
    });
    res.json({ product: serializeProduct(product) });
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
