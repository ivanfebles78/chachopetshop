import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { serializeProduct } from '../lib/serialize.js';

export const productsRouter = Router();

const listQuery = z.object({
  // Facetas (slug). Se aceptan como CSV: ?need=alergias,piel
  animal: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  need: z.string().optional(),
  q: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  featured: z.enum(['true', 'false']).optional(),
  bestseller: z.enum(['true', 'false']).optional(),
  // Sin 'rating': no hay valoraciones reales por las que ordenar.
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

    if (p.animal) and.push({ animals: { some: { slug: p.animal } } });
    if (p.category) and.push({ categories: { some: { slug: p.category } } });

    const brands = csv(p.brand);
    if (brands.length) and.push({ brand: { slug: { in: brands } } });

    // Cada "need" seleccionada es un AND (más filtros = más específico).
    for (const n of csv(p.need)) and.push({ needs: { some: { slug: n } } });

    if (p.q) {
      and.push({
        OR: [
          { name: { contains: p.q, mode: 'insensitive' } },
          { description: { contains: p.q, mode: 'insensitive' } },
          { brand: { name: { contains: p.q, mode: 'insensitive' } } },
        ],
      });
    }

    if (p.minPrice !== undefined || p.maxPrice !== undefined) {
      where.price = {
        ...(p.minPrice !== undefined ? { gte: p.minPrice } : {}),
        ...(p.maxPrice !== undefined ? { lte: p.maxPrice } : {}),
      };
    }
    if (p.featured) where.featured = p.featured === 'true';
    if (p.bestseller) where.bestseller = p.bestseller === 'true';
    if (and.length) where.AND = and;

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      p.sort === 'price_asc'
        ? { price: 'asc' }
        : p.sort === 'price_desc'
        ? { price: 'desc' }
        : p.sort === 'newest'
        ? { createdAt: 'desc' }
        : { bestseller: 'desc' };

    const [total, rows] = await Promise.all([
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
    ]);

    res.json({
      items: rows.map(serializeProduct),
      page: p.page,
      pageSize: p.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / p.pageSize)),
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

    // Relacionados: misma marca o mismo animal, excluyendo el actual.
    const related = await prisma.product.findMany({
      where: {
        active: true,
        id: { not: product.id },
        OR: [
          { brandId: product.brandId },
          { animals: { some: { id: { in: product.animals.map((a) => a.id) } } } },
        ],
      },
      take: 4,
      include: { brand: true, variants: { orderBy: { price: 'asc' } } },
    });

    res.json({
      product: serializeProduct(product),
      related: related.map(serializeProduct),
    });
  } catch (err) {
    next(err);
  }
});
