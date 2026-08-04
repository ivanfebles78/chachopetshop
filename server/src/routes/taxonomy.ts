import { Router } from 'express';
import { prisma } from '../db.js';

export const taxonomyRouter = Router();

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
