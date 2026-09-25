import type { Prisma } from '@prisma/client';

/**
 * RANGOS DE TAMAÑO, por peso y en gramos.
 *
 * El proveedor da el tamaño de cada formato como cantidad + unidad («3 kg» →
 * 3000 g). Filtrar por cada peso exacto daría 52 opciones inservibles, así que
 * se agrupan en rangos que alguien de verdad usa al comprar pienso: la bolsa
 * pequeña, el saco grande…
 *
 * Los `ml` se cuentan como gramos (un litro es un formato pequeño). Los formatos
 * por UNIDADES («20 uds») o SIN cantidad no entran en ningún rango: no tienen un
 * peso con el que ordenarse, y meterlos a la fuerza sería mentir sobre su tamaño.
 */

export type Tamano = { slug: string; nombre: string; min: number; max: number | null };

export const TAMANOS: Tamano[] = [
  { slug: 'hasta-1kg', nombre: 'Hasta 1 kg', min: 0, max: 1000 },
  { slug: '1-3kg', nombre: '1 – 3 kg', min: 1000, max: 3000 },
  { slug: '3-7kg', nombre: '3 – 7 kg', min: 3000, max: 7000 },
  { slug: '7-15kg', nombre: '7 – 15 kg', min: 7000, max: 15000 },
  { slug: 'mas-15kg', nombre: 'Más de 15 kg', min: 15000, max: null },
];

/** Un producto entra en un rango si TIENE ALGÚN FORMATO de ese peso. */
export function condicionTamano(slug: string): Prisma.ProductWhereInput | null {
  const t = TAMANOS.find((x) => x.slug === slug);
  if (!t) return null;
  return {
    variants: {
      some: {
        unit: { in: ['g', 'ml'] },
        quantity: { gte: t.min, ...(t.max != null ? { lt: t.max } : {}) },
      },
    },
  };
}

/** Varios rangos combinan con OR: basta con tener un formato en cualquiera. */
export function condicionTamanos(slugs: string[]): Prisma.ProductWhereInput | null {
  const conds = slugs
    .map(condicionTamano)
    .filter((c): c is Prisma.ProductWhereInput => c !== null);
  if (conds.length === 0) return null;
  return conds.length === 1 ? conds[0]! : { OR: conds };
}
