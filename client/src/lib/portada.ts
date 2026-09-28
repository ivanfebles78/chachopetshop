import type { Facetas, Faceta as FacetaServidor, Product, Taxonomy } from './types';
import { estaRebajado, rutaCatalogo } from './navigation';

/**
 * QUÉ ENSEÑA LA PORTADA — DECIDIDO POR EL CATÁLOGO, NO ESCRITO A MANO.
 *
 * La portada anterior traía sus propias listas fijas: seis animales (uno de
 * ellos, Reptiles, sin un solo producto) y ocho necesidades, ninguna
 * contrastada con lo que hay en la tienda. Es el mismo fallo que tenía el menú
 * y se arregla igual: funciones puras que cruzan taxonomía y productos, y que
 * se prueban sin React ni servidor.
 *
 * Todo lo de aquí es una regla, no una lista. El día que entre el primer pienso
 * de reptil, Reptiles aparece; el día que Aves llegue a cinco productos, sube a
 * portada. Sin que nadie edite nada.
 */

export type Faceta = {
  slug: string;
  nombre: string;
  total: number;
  href: string;
  /**
   * El tipo de categoría, cuando la faceta es una categoría. Sirve para dibujar
   * su ilustración en la portada; las facetas de animal no lo llevan.
   */
  tipo?: string;
};

/**
 * Cuántos productos hay tras cada faceta, en orden descendente y sin vacías.
 * Enseñar una faceta vacía es prometer un sitio al que no se puede llegar.
 *
 * Los TOTALES salen de los recuentos que ya calcula el servidor (`?facets=1`),
 * no de contar una muestra de productos: con un catálogo de miles, contar sobre
 * la primera página daba cifras minúsculas y falsas («Gatos (7)»).
 */
function construir(
  facetasServidor: FacetaServidor[],
  parametro: 'animal' | 'category',
  tipos?: Map<string, string>,
): Faceta[] {
  return facetasServidor
    .filter((f) => f.total > 0)
    .map((f) => ({
      slug: f.slug,
      nombre: f.nombre,
      total: f.total,
      href: rutaCatalogo({ [parametro]: f.slug }),
      tipo: tipos?.get(f.slug),
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * A partir de cuántos productos una mascota merece su propio bloque grande.
 *
 * Con menos, el bloque promete un departamento que no existe: quien entra
 * esperando una sección de peces se encuentra un producto. Siguen accesibles
 * como enlace, que es lo honesto — visibles, sin exagerar lo que hay.
 */
export const MINIMO_PARA_PROTAGONISTA = 5;

export type Mascotas = { protagonistas: Faceta[]; secundarias: Faceta[] };

export function mascotas(facetas: Facetas): Mascotas {
  const todas = construir(facetas.animals, 'animal');
  return {
    protagonistas: todas.filter((f) => f.total >= MINIMO_PARA_PROTAGONISTA),
    secundarias: todas.filter((f) => f.total < MINIMO_PARA_PROTAGONISTA),
  };
}

/** Las categorías que tienen producto, de más a menos. El `type` (para la
 *  ilustración) sale de la taxonomía. */
export function categorias(facetas: Facetas, tax: Taxonomy): Faceta[] {
  const tipos = new Map(tax.categories.map((c) => [c.slug, c.type]));
  return construir(facetas.categories, 'category', tipos);
}

/**
 * La selección de la tienda.
 *
 * Sale de `featured`, que es lo que Chacho decide destacar. NO de `bestseller`:
 * ese campo dice «top ventas» y no lo sostiene ningún dato de ventas —en los
 * pedidos reales, los siete marcados suman menos unidades que el resto—. Una
 * selección de la tienda es una afirmación honesta; «lo más vendido» no lo era.
 */
export function seleccion(productos: Product[], limite = 8): Product[] {
  return productos.filter((p) => p.featured).slice(0, limite);
}

/** Rebajados de verdad: precio anterior mayor que el actual. Nada de `featured`. */
export function ofertas(productos: Product[], limite = 4): Product[] {
  return productos.filter(estaRebajado).slice(0, limite);
}

/** El ahorro real, para no tener que calcularlo en la plantilla. */
export function porcentajeAhorro(p: Product): number | null {
  if (!estaRebajado(p) || p.price == null) return null;
  return Math.round((1 - p.price / (p.compareAt as number)) * 100);
}
