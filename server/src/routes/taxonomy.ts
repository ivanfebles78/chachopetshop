import { Router } from 'express';
import { prisma } from '../db.js';
import { construirMenu } from '../lib/menu.js';

export const taxonomyRouter = Router();

/**
 * GET /api/taxonomy/menu
 * El árbol del menú de cabecera —categoría → marca → línea, por animal— con los
 * recuentos calculados sobre TODO el catálogo. Ver `lib/menu.ts`.
 */
taxonomyRouter.get('/menu', async (_req, res, next) => {
  try {
    const [productos, animales] = await Promise.all([
      prisma.product.findMany({
        where: { active: true },
        select: {
          line: true,
          animals: { select: { slug: true } },
          categories: { select: { slug: true, name: true, sortOrder: true } },
          brand: { select: { slug: true, name: true } },
        },
      }),
      prisma.animal.findMany({ orderBy: { sortOrder: 'asc' }, select: { slug: true, name: true, sortOrder: true } }),
    ]);
    res.json({ animales: construirMenu(productos, animales) });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/taxonomy
 * Devuelve todas las facetas que usa el frontend para construir los filtros
 * (animales, categorías, necesidades y marcas) en una sola llamada.
 */
taxonomyRouter.get('/', async (_req, res, next) => {
  try {
    const [animals, categories, needs, brands] = await Promise.all([
      prisma.animal.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.need.findMany({ orderBy: { name: 'asc' } }),
      prisma.brand.findMany({ orderBy: { name: 'asc' } }),
    ]);
    res.json({ animals, categories, needs, brands });
  } catch (err) {
    next(err);
  }
});
