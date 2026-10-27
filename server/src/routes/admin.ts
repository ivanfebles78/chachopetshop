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

/**
 * POST /api/admin/products/import — importación masiva desde Excel.
 *
 * El cliente lee el .xlsx y manda las filas ya parseadas. Cada fila se localiza
 * por SKU (y si no, por slug). Dos modos:
 *
 *   · «merge»   → crea las que faltan y actualiza las que ya están. Lo que NO
 *                 viene en el archivo se queda igual.
 *   · «replace» → lo mismo, y además ELIMINA lo que no aparece en el archivo
 *                 (desactiva en vez de borrar si el producto tiene pedidos, para
 *                 no romper el histórico). Es destructivo: el panel lo confirma.
 *
 * Los slugs de marca/animales/categorías que no existan se ignoran y se avisan;
 * nunca se inventan taxonomías nuevas desde aquí.
 */
const slugify = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const importRow = z
  .object({
    sku: z.string().trim().min(1).optional(),
    slug: z.string().trim().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    line: z.string().nullable().optional(),
    price: z.number().min(0).nullable().optional(),
    brand: z.string().optional(), // slug de marca
    animals: z.array(z.string()).optional(), // slugs
    categories: z.array(z.string()).optional(), // slugs
    active: z.boolean().optional(),
    image: z.string().optional(),
  })
  .refine((r) => Boolean(r.sku || r.slug), 'Cada fila necesita SKU o slug.');

const importBody = z.object({
  mode: z.enum(['merge', 'replace']),
  rows: z.array(importRow).min(1).max(5000),
});

adminRouter.post('/products/import', async (req, res, next) => {
  try {
    const { mode, rows } = importBody.parse(req.body);

    const [animales, categorias, marcas, variantes, productos] = await Promise.all([
      prisma.animal.findMany({ select: { id: true, slug: true } }),
      prisma.category.findMany({ select: { id: true, slug: true } }),
      prisma.brand.findMany({ select: { id: true, slug: true } }),
      prisma.productVariant.findMany({ select: { sku: true, productId: true } }),
      prisma.product.findMany({ select: { id: true, slug: true } }),
    ]);
    const animalId = new Map(animales.map((a) => [a.slug, a.id]));
    const categoryId = new Map(categorias.map((c) => [c.slug, c.id]));
    const brandId = new Map(marcas.map((b) => [b.slug, b.id]));
    const idPorSku = new Map(variantes.map((v) => [v.sku, v.productId]));
    const idPorSlug = new Map(productos.map((p) => [p.slug, p.id]));

    const conservados = new Set<string>();
    let creados = 0;
    let actualizados = 0;
    const errores: string[] = [];

    for (const [i, r] of rows.entries()) {
      const etiqueta = r.sku || r.slug || `fila ${i + 2}`;
      try {
        const productId = (r.sku && idPorSku.get(r.sku)) || (r.slug && idPorSlug.get(r.slug)) || null;
        const aIds = r.animals?.map((s) => animalId.get(s)).filter((x): x is string => Boolean(x));
        const cIds = r.categories?.map((s) => categoryId.get(s)).filter((x): x is string => Boolean(x));
        const bId = r.brand ? brandId.get(r.brand) : undefined;
        if (r.brand && !bId) errores.push(`${etiqueta}: la marca «${r.brand}» no existe (se deja igual).`);

        if (productId) {
          // Está en el archivo: se conserva aunque la actualización falle, para
          // que en modo «replace» un error puntual no acabe borrándolo.
          conservados.add(productId);
          const data: Prisma.ProductUpdateInput = {};
          if (r.name !== undefined) data.name = r.name;
          if (r.description !== undefined) data.description = r.description;
          if (r.line !== undefined) data.line = r.line;
          if (r.active !== undefined) data.active = r.active;
          if (r.price !== undefined) data.price = r.price;
          if (r.image) data.image = r.image;
          if (bId) data.brand = { connect: { id: bId } };
          if (aIds) data.animals = { set: aIds.map((id) => ({ id })) };
          if (cIds) data.categories = { set: cIds.map((id) => ({ id })) };
          if (r.price !== undefined) {
            await prisma.productVariant.updateMany({ where: { productId }, data: { price: r.price } });
          }
          await prisma.product.update({ where: { id: productId }, data });
          actualizados++;
        } else {
          const slug = r.slug || slugify(r.name || r.sku || '');
          if (!r.name || !slug || !r.image) {
            errores.push(`${etiqueta}: para CREAR un producto nuevo hacen falta Nombre, Slug e Imagen.`);
            continue;
          }
          const creado = await prisma.product.create({
            data: {
              name: r.name,
              slug,
              description: r.description ?? '',
              line: r.line ?? null,
              price: r.price ?? null,
              image: r.image,
              gallery: [r.image],
              active: r.active ?? true,
              ...(bId ? { brand: { connect: { id: bId } } } : {}),
              ...(aIds?.length ? { animals: { connect: aIds.map((id) => ({ id })) } } : {}),
              ...(cIds?.length ? { categories: { connect: cIds.map((id) => ({ id })) } } : {}),
              variants: { create: [{ label: 'Único', sku: r.sku || slug, price: r.price ?? null, stock: 0 }] },
            },
            select: { id: true },
          });
          conservados.add(creado.id);
          creados++;
        }
      } catch (e) {
        errores.push(`${etiqueta}: ${(e as Error).message}`);
      }
    }

    let eliminados = 0;
    let desactivados = 0;
    if (mode === 'replace') {
      // Salvaguarda: si no se importó nada, NO se borra el catálogo entero.
      if (conservados.size === 0) {
        return res.status(400).json({
          error: 'No se importó ningún producto válido, así que no se borra nada. Revisa el archivo.',
        });
      }
      const sobran = await prisma.product.findMany({
        where: { id: { notIn: [...conservados] } },
        select: { id: true },
      });
      for (const p of sobran) {
        let ped = 0;
        try {
          ped = await prisma.orderItem.count({ where: { productId: p.id } });
        } catch {
          ped = 0;
        }
        if (ped > 0) {
          await prisma.product.update({ where: { id: p.id }, data: { active: false } });
          desactivados++;
        } else {
          await prisma.product.delete({ where: { id: p.id } });
          eliminados++;
        }
      }
    }

    res.json({
      mode,
      total: rows.length,
      creados,
      actualizados,
      eliminados,
      desactivados,
      totalErrores: errores.length,
      errores: errores.slice(0, 50),
    });
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
