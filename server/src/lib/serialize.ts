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

/**
 * Serializa un producto a un objeto listo para JSON.
 *
 * `rating` y `reviews` se RETIRAN de la respuesta a propósito. Las columnas
 * siguen en la base de datos para no perder nada y para que un sistema de
 * reseñas de verdad pueda apoyarse en ellas el día que exista, pero mientras no
 * haya opiniones reales detrás no se publica ninguna cifra: ni alta ni baja.
 * Un 0 sería tan falso como el 4,6 que había antes.
 */
export function serializeProduct<T extends ProductLike>(product: T) {
  const { rating: _sinPublicar, reviews: _tampoco, ...resto } = product as T & {
    rating?: unknown;
    reviews?: unknown;
  };
  return {
    ...resto,
    price: toNumber(product.price),
    compareAt: toNumber(product.compareAt),
    variants: product.variants?.map((v) => ({ ...v, price: toNumber(v.price) })),
  };
}
