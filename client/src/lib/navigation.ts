import type { Product } from './types';

/**
 * UTILIDADES DE NAVEGACIÓN.
 *
 * El árbol del menú —categoría → marca → línea, por animal— lo calcula el
 * servidor (`/api/taxonomy/menu`) y se pinta tal cual en un acordeón
 * (`components/MenuArbol.tsx`): las categorías colapsadas, y al abrir una salen
 * sus marcas, y al abrir una marca sus líneas. Aquí sólo quedan las dos piezas
 * puras que ese render y la portada comparten.
 */

/** Construye la ruta del catálogo con los filtros indicados. */
export function rutaCatalogo(filtros: Record<string, string>): string {
  const qs = new URLSearchParams(filtros).toString();
  return qs ? `/tienda?${qs}` : '/tienda';
}

/** Un producto está REALMENTE rebajado si tiene precio anterior mayor. */
export function estaRebajado(p: Product): boolean {
  return typeof p.compareAt === 'number' && p.price != null && p.compareAt > p.price;
}
