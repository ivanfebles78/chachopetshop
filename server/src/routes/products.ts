import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { serializeProduct } from '../lib/serialize.js';
import { calcularFacetas, type Condiciones } from '../lib/facetas.js';

export const productsRouter = Router();

const listQuery = z.object({
  // Facetas (slug). Se aceptan como CSV: ?need=alergias,piel
  animal: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  need: z.string().optional(),
  q: z.string().optional(),
  // No negativos: `minPrice=-100` no rompía nada pero tampoco significa nada,
  // y un contrato que acepta cualquier cosa acaba escondiendo el día que sí.
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  featured: z.enum(['true', 'false']).optional(),
  /*
   * Rebajados de VERDAD: los que tienen precio anterior superior al actual.
   *
   * Único añadido de servidor de la Fase 2A, y es deliberado. La navegación
   * necesita una entrada «Ofertas» que signifique algo: antes apuntaba a
   * `featured`, que es una decisión de escaparate y no un descuento, y prometía
   * un ahorro inexistente. Sin este filtro, «Ofertas» sólo podía mentir o no
   * existir.
   *
   * Es aditivo: ninguna petición anterior cambia de comportamiento.
   */
  oferta: z.enum(['1', 'true']).optional(),
  bestseller: z.enum(['true', 'false']).optional(),
  // Sin 'rating': no hay valoraciones reales por las que ordenar.
  /*
   * Recuentos por faceta, a petición.
   *
   * Va como parámetro y no como ruta aparte porque `/:slug` se comería un
   * `/facets`; y va OPT-IN para que ninguna llamada existente empiece a pagar
   * ocho consultas de más sin haberlo pedido.
   *
   * Es la pieza que faltaba desde la Fase 2A: sin recuentos no se puede ni
   * enseñar «Alimentación seca (13)» ni, más importante, ESCONDER las facetas
   * que no llevan a ningún producto. El catálogo seguía ofreciendo «Reptiles»
   * y «Semihúmeda», las dos con cero.
   */
  facets: z.enum(['1', 'true']).optional(),
  sort: z.enum(['relevance', 'price_asc', 'price_desc', 'newest']).default('relevance'),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(48).default(12),
});

const csv = (v?: string) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);

/**
 * GET /api/products — catálogo con filtrado facetado, búsqueda, orden y paginación.
 */
productsRouter.get('/', async (req, res, next) => {
  try {
    const p = listQuery.parse(req.query);

    const where: Prisma.ProductWhereInput = { active: true };
    const and: Prisma.ProductWhereInput[] = [];

    /*
     * Las condiciones se guardan también SEPARADAS POR DIMENSIÓN. El listado
     * las usa todas juntas; los recuentos necesitan poder quitar una y dejar el
     * resto —ver `lib/facetas.ts` para por qué—.
     */
    const cond: Condiciones = { base: [], need: [], oferta: [] };

    if (p.animal) {
      cond.animal = { animals: { some: { slug: p.animal } } };
      and.push(cond.animal);
    }
    if (p.category) {
      cond.category = { categories: { some: { slug: p.category } } };
      and.push(cond.category);
    }

    const brands = csv(p.brand);
    if (brands.length) {
      cond.brand = { brand: { slug: { in: brands } } };
      and.push(cond.brand);
    }

    // Cada "need" seleccionada es un AND (más filtros = más específico).
    for (const n of csv(p.need)) {
      const c = { needs: { some: { slug: n } } };
      cond.need!.push(c);
      and.push(c);
    }

    if (p.q) {
      /*
       * Se busca también por CATEGORÍA y NECESIDAD, que faltaban.
       *
       * Comprobado antes de tocar nada: «alimentación seca» —una categoría que
       * la tienda tiene, con 13 productos— devolvía CERO resultados, y
       * «digestivo», otros cero. Quien busca por el nombre de una sección que
       * existe se llevaba una tienda vacía.
       */
      const busqueda: Prisma.ProductWhereInput = {
        OR: [
          { name: { contains: p.q, mode: 'insensitive' } },
          { description: { contains: p.q, mode: 'insensitive' } },
          { brand: { name: { contains: p.q, mode: 'insensitive' } } },
          { categories: { some: { name: { contains: p.q, mode: 'insensitive' } } } },
          { needs: { some: { name: { contains: p.q, mode: 'insensitive' } } } },
          { animals: { some: { name: { contains: p.q, mode: 'insensitive' } } } },
        ],
      };
      cond.base.push(busqueda);
      and.push(busqueda);
    }

    if (p.minPrice !== undefined || p.maxPrice !== undefined) {
      const rango = {
        price: {
          ...(p.minPrice !== undefined ? { gte: p.minPrice } : {}),
          ...(p.maxPrice !== undefined ? { lte: p.maxPrice } : {}),
        },
      };
      where.price = rango.price;
      cond.base.push(rango);
    }
    if (p.oferta) {
      // `compareAt` mayor que el precio actual es lo que hace que un producto
      // esté rebajado. Un `compareAt` nulo o igual no es una oferta.
      cond.oferta = [
        { compareAt: { not: null } },
        { compareAt: { gt: prisma.product.fields.price } },
      ];
      and.push(...cond.oferta);
    }
    if (p.featured) {
      where.featured = p.featured === 'true';
      cond.base.push({ featured: p.featured === 'true' });
    }
    if (p.bestseller) {
      where.bestseller = p.bestseller === 'true';
      cond.base.push({ bestseller: p.bestseller === 'true' });
    }
    if (and.length) where.AND = and;

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      p.sort === 'price_asc'
        ? { price: 'asc' }
        : p.sort === 'price_desc'
        ? { price: 'desc' }
        : p.sort === 'newest'
        ? { createdAt: 'desc' }
        : { bestseller: 'desc' };

    const [total, rows, facets] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy,
        skip: (p.page - 1) * p.pageSize,
        take: p.pageSize,
        include: {
          brand: true,
          animals: true,
          categories: true,
          needs: true,
          variants: { orderBy: { price: 'asc' } },
        },
      }),
      p.facets ? calcularFacetas(cond) : Promise.resolve(null),
    ]);

    res.json({
      items: rows.map(serializeProduct),
      page: p.page,
      pageSize: p.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / p.pageSize)),
      ...(facets ? { facets } : {}),
    });
  } catch (err) {
    next(err);
  }
});

/** GET /api/products/:slug — ficha de producto. */
productsRouter.get('/:slug', async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      include: {
        brand: true,
        animals: true,
        categories: true,
        needs: true,
        variants: { orderBy: { price: 'asc' } },
      },
    });
    if (!product || !product.active) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    /*
     * RELACIONADOS, Y POR QUÉ.
     *
     * Antes era un «misma marca O mismo animal» de golpe, sin decir cuál de las
     * dos cosas: salían cuatro productos y el cliente no tenía forma de saber
     * qué pintaban ahí. Ahora se busca por franjas, de más afín a menos, y cada
     * uno viaja con su motivo para poder ENSEÑARLO.
     *
     * No es una recomendación personalizada ni lleva ninguna puntuación
     * inventada: es «esto es del mismo tipo y para el mismo animal», que se
     * puede explicar mirando los datos.
     */
    const idsAnimal = product.animals.map((a) => a.id);
    const idsCategoria = product.categories.map((c) => c.id);
    const incluir = { brand: true, variants: { orderBy: { price: 'asc' as const } } };

    const franjas: { motivo: 'categoria' | 'animal' | 'marca'; where: Prisma.ProductWhereInput }[] = [
      {
        motivo: 'categoria',
        where: {
          categories: { some: { id: { in: idsCategoria } } },
          animals: { some: { id: { in: idsAnimal } } },
        },
      },
      { motivo: 'animal', where: { animals: { some: { id: { in: idsAnimal } } } } },
      { motivo: 'marca', where: { brandId: product.brandId } },
    ];

    const related: (ReturnType<typeof serializeProduct> & { motivo: string })[] = [];
    const vistos = new Set<string>([product.id]);

    for (const franja of franjas) {
      if (related.length >= 4) break;
      const filas = await prisma.product.findMany({
        where: { active: true, id: { notIn: [...vistos] }, ...franja.where },
        take: 4 - related.length,
        orderBy: { featured: 'desc' },
        include: incluir,
      });
      for (const fila of filas) {
        vistos.add(fila.id);
        related.push({ ...serializeProduct(fila), motivo: franja.motivo });
      }
    }

    res.json({
      product: serializeProduct(product),
      related,
    });
  } catch (err) {
    next(err);
  }
});
