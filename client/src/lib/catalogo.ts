import type { ProductFilters } from './api';
import type { Facetas } from './types';

/**
 * EL ESTADO DEL CATÁLOGO VIVE EN LA URL.
 *
 * No es un detalle técnico: es lo que hace que una búsqueda filtrada se pueda
 * compartir por WhatsApp, guardar en marcadores, recargar sin perderla y
 * recorrer con los botones de atrás y adelante. Un panel de filtros cuyo estado
 * sólo vive en memoria rompe las cuatro cosas a la vez.
 *
 * Aquí sólo hay funciones puras: leer la URL, escribirla y describir lo que
 * está puesto. Se prueban sin React ni servidor.
 */

export const TAMANO_PAGINA = 12;

export const ORDENES = [
  ['relevance', 'Relevancia'],
  ['price_asc', 'Precio: de menor a mayor'],
  ['price_desc', 'Precio: de mayor a menor'],
  ['newest', 'Novedades'],
] as const;

export type Orden = (typeof ORDENES)[number][0];

/** Los órdenes que el servidor admite. Cualquier otra cosa se ignora. */
export function ordenValido(v: string | null): Orden {
  return ORDENES.some(([k]) => k === v) ? (v as Orden) : 'relevance';
}

/**
 * Convierte la URL en filtros.
 *
 * Todo lo que viene de fuera se sanea aquí: una página negativa, un orden
 * inventado o un precio que no es un número no deben llegar al servidor ni
 * romper la pantalla. Quien escribe `?page=-4&sort=DROP` ve la primera página
 * por relevancia, que es lo razonable.
 */
export function filtrosDeParams(params: URLSearchParams): ProductFilters {
  const lista = (k: string) => (params.get(k)?.split(',') ?? []).map((s) => s.trim()).filter(Boolean);
  const numero = (k: string) => {
    /*
     * OJO con el atajo: `Number(null)` es 0, no `NaN`. Escrito sin este
     * cortocircuito, un catálogo SIN filtro de precio recibía `minPrice=0` y
     * `maxPrice=0`, o sea «entre cero y cero euros», y no devolvía ni un
     * producto. Se vio al primer vistazo: «Perros — 0 productos».
     */
    const bruto = params.get(k);
    if (bruto === null || bruto.trim() === '') return undefined;
    const n = Number(bruto);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  const pagina = Number(params.get('page'));

  return {
    animal: params.get('animal') || undefined,
    category: params.get('category') || undefined,
    need: lista('need'),
    brand: lista('brand'),
    q: params.get('q')?.trim() || undefined,
    minPrice: numero('minPrice'),
    maxPrice: numero('maxPrice'),
    oferta: params.get('oferta') === '1' || undefined,
    sort: ordenValido(params.get('sort')),
    page: Number.isInteger(pagina) && pagina >= 1 ? pagina : 1,
    pageSize: TAMANO_PAGINA,
    facets: true,
  };
}

/** Cuántos filtros hay puestos (el orden y la página no son filtros). */
export function cuantosFiltros(f: ProductFilters): number {
  return (
    (f.animal ? 1 : 0) +
    (f.category ? 1 : 0) +
    (f.oferta ? 1 : 0) +
    (f.q ? 1 : 0) +
    (f.minPrice !== undefined || f.maxPrice !== undefined ? 1 : 0) +
    (f.need?.length ?? 0) +
    (f.brand?.length ?? 0)
  );
}

export type Puesto = { clave: string; valor?: string; etiqueta: string };

/**
 * Los filtros puestos, con nombre legible y con qué hay que quitar para
 * soltarlos. Se enseñan como fichas para que se vea de un vistazo POR QUÉ se
 * están viendo 6 productos y no 28 — y para poder deshacerlos de uno en uno,
 * que es lo que se quiere el 90 % de las veces, y no borrarlo todo.
 */
export function filtrosPuestos(f: ProductFilters, facetas: Facetas | undefined): Puesto[] {
  const nombre = (lista: { slug: string; nombre: string }[] | undefined, slug: string) =>
    lista?.find((x) => x.slug === slug)?.nombre ?? slug;

  const puestos: Puesto[] = [];
  if (f.q) puestos.push({ clave: 'q', etiqueta: `«${f.q}»` });
  if (f.animal) puestos.push({ clave: 'animal', etiqueta: nombre(facetas?.animals, f.animal) });
  if (f.category) puestos.push({ clave: 'category', etiqueta: nombre(facetas?.categories, f.category) });
  for (const s of f.need ?? []) puestos.push({ clave: 'need', valor: s, etiqueta: nombre(facetas?.needs, s) });
  for (const s of f.brand ?? []) puestos.push({ clave: 'brand', valor: s, etiqueta: nombre(facetas?.brands, s) });
  if (f.oferta) puestos.push({ clave: 'oferta', etiqueta: 'En oferta' });
  if (f.minPrice !== undefined || f.maxPrice !== undefined) {
    const desde = f.minPrice !== undefined ? `desde ${f.minPrice} €` : '';
    const hasta = f.maxPrice !== undefined ? `hasta ${f.maxPrice} €` : '';
    puestos.push({ clave: 'precio', etiqueta: [desde, hasta].filter(Boolean).join(' ') });
  }
  return puestos;
}

/**
 * El titular de la página, compuesto con lo que hay puesto.
 *
 * Antes siempre ponía el nombre del animal O el de la categoría, así que
 * «pienso seco para perros» se anunciaba simplemente como «Perros» — el mismo
 * titular que ver los 15 productos de perro sin filtrar. Ahora el titular dice
 * lo que de verdad se está viendo, que además es lo que Google necesita para
 * distinguir una página de otra.
 */
export function tituloDe(f: ProductFilters, facetas: Facetas | undefined): string {
  const nombre = (lista: { slug: string; nombre: string }[] | undefined, slug?: string) =>
    slug ? lista?.find((x) => x.slug === slug)?.nombre : undefined;

  if (f.q) return `Resultados para «${f.q}»`;

  const animal = nombre(facetas?.animals, f.animal);
  const categoria = nombre(facetas?.categories, f.category);

  if (f.oferta) return animal ? `Ofertas para ${animal.toLowerCase()}` : 'Ofertas';
  if (categoria && animal) return `${categoria} para ${animal.toLowerCase()}`;
  if (categoria) return categoria;
  if (animal) return animal;
  return 'Toda la tienda';
}

/** Las migas de pan, coherentes con el titular. */
export function migasDe(f: ProductFilters, titulo: string): { etiqueta: string; href?: string }[] {
  const migas: { etiqueta: string; href?: string }[] = [
    { etiqueta: 'Inicio', href: '/' },
    { etiqueta: 'Tienda', href: '/tienda' },
  ];
  // Con animal Y categoría, el animal es un escalón intermedio real.
  if (f.animal && f.category && !f.q) {
    migas.push({ etiqueta: titulo.split(' para ')[1] ?? '', href: `/tienda?animal=${f.animal}` });
  }
  if (titulo !== 'Toda la tienda') migas.push({ etiqueta: titulo });
  return migas.filter((m) => m.etiqueta);
}
