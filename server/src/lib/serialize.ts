import { Prisma } from '@prisma/client';

/** Convierte los Decimal de Prisma (o cualquier valor numérico) a number para JSON limpio. */
export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'number' ? value : Number(value);
}

type ProductLike = {
  price: Prisma.Decimal;
  compareAt: Prisma.Decimal | null;
  variants?: { price: Prisma.Decimal }[];
  [key: string]: unknown;
};

/** Serializa un producto (con relaciones ya incluidas) a un objeto JSON-friendly. */
export function serializeProduct<T extends ProductLike>(product: T) {
  return {
    ...product,
    price: toNumber(product.price),
    compareAt: toNumber(product.compareAt),
    variants: product.variants?.map((v) => ({ ...v, price: toNumber(v.price) })),
  };
}
