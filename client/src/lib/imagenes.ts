import type { Product } from './types';

/**
 * DE DÓNDE SALE LA IMAGEN DE UN PRODUCTO.
 *
 * ── El problema ────────────────────────────────────────────────────────────
 *
 * Las 28 fichas del catálogo apuntan a `picsum.photos`, que sirve una foto de
 * archivo AL AZAR por semilla: bosques, cascadas, paisajes, objetos sin
 * relación. En una tienda de animales eso no es «una imagen provisional», es
 * una imagen que dice algo falso — el saco de pienso de Orijen ilustrado con
 * una cascada. Los logotipos de marca también salían de ahí: una foto
 * cualquiera presentada como el logo de Royal Canin.
 *
 * ── Qué se hace ────────────────────────────────────────────────────────────
 *
 * Tres niveles, en orden:
 *
 *   1. FOTO REAL. Si el producto tiene una imagen de verdad, se usa. Cuando
 *      Ivan suba su fotografía, entra por aquí sin tocar una línea.
 *   2. ACTIVO EXISTENTE. Cualquier imagen del propio proyecto.
 *   3. ILUSTRACIÓN DE CATEGORÍA. Un dibujo que representa el TIPO de producto
 *      —saco de pienso, lata, cama, transportín— y que no finge ser el envase
 *      de nadie.
 *
 * ── Por qué ilustración y no una foto de stock ─────────────────────────────
 *
 * Una foto de stock de «un saco de pienso» tiene una marca impresa que no es la
 * nuestra, una licencia que hay que respetar y un peso de cientos de kilobytes.
 * Y sobre todo: puesta en la ficha de un producto concreto, se lee como el
 * envase de ESE producto. Un dibujo no engaña a nadie sobre eso, pesa unos
 * kilobytes, es nítido en cualquier pantalla y no arrastra licencias.
 *
 * Es provisional y está declarado como tal en el manifiesto de imágenes.
 */

/**
 * Los servicios de foto ALEATORIA que hay que dejar de creerse.
 *
 * No es una lista de «imágenes que no me gustan»: son servicios cuyo contrato
 * es literalmente devolver una foto sin relación con lo que se pide.
 */
const FUENTES_ALEATORIAS = ['picsum.photos', 'placekitten.com', 'placeimg.com', 'loremflickr.com'];

/** ¿Esta URL es una foto de archivo al azar disfrazada de imagen de producto? */
export function esImagenAleatoria(url: unknown): boolean {
  if (typeof url !== 'string' || url.length === 0) return true;
  return FUENTES_ALEATORIAS.some((d) => url.includes(d));
}

/**
 * Los tipos de categoría del catálogo, que son los que deciden el dibujo.
 *
 * Salen de `Category.type` en la base de datos, así que esto no inventa
 * categorías: si mañana aparece una nueva, cae en `OTRO` y se dibuja el genérico
 * en vez de romperse.
 */
export type TipoArte =
  | 'DRY_FOOD'
  | 'WET_FOOD'
  | 'SNACKS'
  | 'HYGIENE'
  | 'ACCESSORIES'
  | 'SUPPLEMENTS'
  | 'VET_DIET'
  | 'BEDS'
  | 'TRAVEL'
  | 'OTRO';

const TIPOS: TipoArte[] = [
  'DRY_FOOD', 'WET_FOOD', 'SNACKS', 'HYGIENE', 'ACCESSORIES',
  'SUPPLEMENTS', 'VET_DIET', 'BEDS', 'TRAVEL',
];

/** El tipo de arte que le toca a un producto, según su categoría real. */
export function tipoDeProducto(product: Pick<Product, 'categories'>): TipoArte {
  const t = product.categories?.[0]?.type;
  return TIPOS.includes(t as TipoArte) ? (t as TipoArte) : 'OTRO';
}

export type OrigenImagen =
  | { clase: 'foto'; src: string }
  | { clase: 'ilustracion'; tipo: TipoArte };

/**
 * Qué pintar para este producto.
 *
 * Devuelve una FOTO si la hay, y si no, el tipo de ilustración. Quien pinta
 * decide cómo; aquí sólo se decide qué es verdad.
 */
export function origenDeImagen(
  product: Pick<Product, 'image' | 'categories'>,
): OrigenImagen {
  if (!esImagenAleatoria(product.image)) {
    return { clase: 'foto', src: product.image as string };
  }
  return { clase: 'ilustracion', tipo: tipoDeProducto(product as Product) };
}

/**
 * El texto alternativo.
 *
 * Con foto real, el nombre del producto: es lo que hay en la imagen.
 *
 * Con ilustración NO se repite el nombre. Sería mentir a quien no ve la
 * pantalla: le haría creer que está mirando ese producto cuando lo que hay es
 * un dibujo genérico de la categoría. Se dice lo que de verdad se ve — y el
 * nombre ya lo lleva el enlace de al lado, así que no se pierde nada.
 */
export function textoAlternativo(
  product: Pick<Product, 'name' | 'image' | 'categories'>,
): string {
  const origen = origenDeImagen(product);
  if (origen.clase === 'foto') return product.name;
  return DESCRIPCION_ARTE[origen.tipo];
}

export const DESCRIPCION_ARTE: Record<TipoArte, string> = {
  DRY_FOOD: 'Ilustración de un saco de pienso',
  WET_FOOD: 'Ilustración de una lata de comida húmeda',
  SNACKS: 'Ilustración de premios para mascotas',
  HYGIENE: 'Ilustración de un bote de champú',
  ACCESSORIES: 'Ilustración de un comedero',
  SUPPLEMENTS: 'Ilustración de un bote de suplemento',
  VET_DIET: 'Ilustración de un envase de dieta veterinaria',
  BEDS: 'Ilustración de una cama para mascotas',
  TRAVEL: 'Ilustración de un transportín',
  OTRO: 'Ilustración de un producto para mascotas',
};

/** El tipo de arte de una categoría suelta (la portada trabaja con facetas). */
export function tipoDeCategoria(tipo: string | undefined): TipoArte {
  return TIPOS.includes(tipo as TipoArte) ? (tipo as TipoArte) : 'OTRO';
}
