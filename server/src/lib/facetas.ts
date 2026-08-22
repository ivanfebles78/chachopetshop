import type { Prisma } from '@prisma/client';
import { prisma } from '../db.js';

/**
 * RECUENTOS POR FACETA.
 *
 * Sin esto, el panel de filtros del catálogo no puede hacer las dos cosas que
 * hace falta que haga: decir cuántos productos hay detrás de cada opción, y
 * —sobre todo— NO OFRECER las que no llevan a ninguna parte. El catálogo seguía
 * enseñando «Reptiles» y «Semihúmeda», las dos con cero productos, desde antes
 * de la Fase 2A: el menú se arregló y el panel de filtros se quedó como estaba.
 *
 * ── La regla que hace que los números sean útiles ──────────────────────────
 *
 * Cada dimensión se cuenta con TODOS los filtros activos MENOS EL SUYO.
 *
 * Suena raro y es lo correcto. Si estoy viendo «Perros» y al lado dice
 * «Gatos (12)», ese 12 tiene que ser «12 productos de gato», no «12 productos
 * que son de perro Y de gato» —que sería 0 y escondería toda la sección—. En
 * cambio los tipos de producto SÍ deben reflejar que estoy en perros: si sólo
 * hay 6 piensos secos para perro, ahí tiene que poner 6 y no 13.
 *
 * Es como se comporta cualquier tienda seria, y es la diferencia entre unos
 * números que ayudan a decidir y unos que confunden.
 */

export type Faceta = { slug: string; nombre: string; total: number };

export type Facetas = {
  animals: Faceta[];
  categories: Faceta[];
  needs: Faceta[];
  brands: Faceta[];
  /** Cuántos hay rebajados de verdad, con los demás filtros puestos. */
  ofertas: number;
  /** Rango de precios real del resultado, para acotar el filtro de precio. */
  precio: { min: number; max: number } | null;
};

/** Condiciones de la consulta, separadas por dimensión para poder excluir una. */
export type Condiciones = {
  animal?: Prisma.ProductWhereInput;
  category?: Prisma.ProductWhereInput;
  need?: Prisma.ProductWhereInput[];
  brand?: Prisma.ProductWhereInput;
  oferta?: Prisma.ProductWhereInput[];
  /** Lo que se aplica siempre: búsqueda, precio, activo… */
  base: Prisma.ProductWhereInput[];
};

/** El `where` con todo lo activo menos la dimensión indicada. */
function salvo(c: Condiciones, dimension: keyof Condiciones | null): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [...c.base];
  if (dimension !== 'animal' && c.animal) and.push(c.animal);
  if (dimension !== 'category' && c.category) and.push(c.category);
  if (dimension !== 'need' && c.need) and.push(...c.need);
  if (dimension !== 'brand' && c.brand) and.push(c.brand);
  if (dimension !== 'oferta' && c.oferta) and.push(...c.oferta);
  return { active: true, ...(and.length ? { AND: and } : {}) };
}

/**
 * Se pregunta por la TABLA de la faceta y no por productos, y a propósito: así
 * salen también las que valen 0. Hace falta saberlo para poder ESCONDERLAS, y
 * así el cliente no tiene que adivinar si una faceta falta porque no existe o
 * porque se quedó fuera de la página de resultados.
 *
 * Las cuatro consultas van escritas una a una en vez de con un índice dinámico:
 * Prisma tipa cada tabla por separado, y hacerlo genérico obligaba a un `as`
 * que se tragaba justo los errores que estos tipos sirven para detectar.
 */
const aFaceta = (f: { slug: string; name: string; _count: { products: number } }): Faceta => ({
  slug: f.slug,
  nombre: f.name,
  total: f._count.products,
});

export async function calcularFacetas(c: Condiciones): Promise<Facetas> {
  const [animals, categories, needs, brands, ofertas, precios] = await Promise.all([
    prisma.animal.findMany({
      select: { slug: true, name: true, _count: { select: { products: { where: salvo(c, 'animal') } } } },
      orderBy: { sortOrder: 'asc' },
    }).then((f) => f.map(aFaceta)),
    prisma.category.findMany({
      select: { slug: true, name: true, _count: { select: { products: { where: salvo(c, 'category') } } } },
      orderBy: { sortOrder: 'asc' },
    }).then((f) => f.map(aFaceta)),
    prisma.need.findMany({
      select: { slug: true, name: true, _count: { select: { products: { where: salvo(c, 'need') } } } },
      orderBy: { name: 'asc' },
    }).then((f) => f.map(aFaceta)),
    prisma.brand.findMany({
      select: { slug: true, name: true, _count: { select: { products: { where: salvo(c, 'brand') } } } },
      orderBy: { name: 'asc' },
    }).then((f) => f.map(aFaceta)),
    prisma.product.count({
      where: {
        ...salvo(c, 'oferta'),
        AND: [
          ...(salvo(c, 'oferta').AND as Prisma.ProductWhereInput[] ?? []),
          { compareAt: { not: null } },
          { compareAt: { gt: prisma.product.fields.price } },
        ],
      },
    }),
    prisma.product.aggregate({
      where: salvo(c, null),
      _min: { price: true },
      _max: { price: true },
    }),
  ]);

  const min = precios._min.price;
  const max = precios._max.price;

  return {
    animals,
    categories,
    needs,
    brands,
    ofertas,
    precio: min != null && max != null ? { min: Number(min), max: Number(max) } : null,
  };
}
