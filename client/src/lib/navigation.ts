import type { Product, Taxonomy } from './types';

/**
 * LA NAVEGACIÓN SE DEDUCE DEL CATÁLOGO, NO SE ESCRIBE A MANO.
 *
 * El menú anterior estaba incrustado en el JSX de la cabecera como una lista
 * literal de enlaces. El problema no era el sitio donde vivía: era que no tenía
 * ninguna relación con lo que hay en la tienda. Dos entradas llevaban a
 * resultados vacíos —`animal=reptil` (0 productos) y `category=semihumeda` (0,
 * y enlazada dos veces)— y nadie se enteraba, porque nada las contrastaba con
 * el catálogo.
 *
 * Aquí el menú es el RESULTADO de mirar los productos. Una faceta sin producto
 * no aparece; una que crece, aparece sola. Sin tocar código.
 *
 * Es una función pura a propósito: recibe taxonomía y productos, devuelve el
 * menú. Se puede probar sin montar React, sin navegador y sin servidor, que es
 * lo que permite comprobar de verdad «esto no enseña destinos vacíos».
 */

export type EnlaceNav = {
  etiqueta: string;
  href: string;
  /** Productos reales detrás. Nunca 0: esos no llegan a construirse. */
  total: number;
};

export type ColumnaNav = { titulo: string; enlaces: EnlaceNav[] };

export type EntradaNav = {
  etiqueta: string;
  /** Destino del propio encabezado, si es navegable. */
  href: string;
  total: number;
  /** Si viene, es un desplegable; si no, un enlace suelto. */
  columnas?: ColumnaNav[];
  /** Enlace de cierre del panel: «Ver todo…». */
  verTodo?: EnlaceNav;
};

/** Construye la ruta del catálogo con los filtros indicados. */
export function rutaCatalogo(filtros: Record<string, string>): string {
  const qs = new URLSearchParams(filtros).toString();
  return qs ? `/tienda?${qs}` : '/tienda';
}

/** Un producto está REALMENTE rebajado si tiene precio anterior mayor. */
export function estaRebajado(p: Product): boolean {
  return typeof p.compareAt === 'number' && p.compareAt > p.price;
}

/** Cuenta cuántos productos cumplen todos los filtros a la vez. */
function contar(
  productos: Product[],
  filtros: { animal?: string; category?: string; need?: string; brand?: string },
): number {
  return productos.filter((p) => {
    if (filtros.animal && !p.animals.some((a) => a.slug === filtros.animal)) return false;
    if (filtros.category && !p.categories.some((c) => c.slug === filtros.category)) return false;
    if (filtros.need && !p.needs.some((n) => n.slug === filtros.need)) return false;
    if (filtros.brand && p.brand?.slug !== filtros.brand) return false;
    return true;
  }).length;
}

/**
 * Construye una columna descartando lo que no tiene producto.
 *
 * Devuelve `null` si la columna se queda vacía: una cabecera de sección sin
 * nada debajo es peor que no tener la sección.
 */
function columna(
  titulo: string,
  candidatos: { etiqueta: string; filtros: Record<string, string> }[],
  productos: Product[],
): ColumnaNav | null {
  const enlaces = candidatos
    .map((c) => ({ etiqueta: c.etiqueta, href: rutaCatalogo(c.filtros), total: contar(productos, c.filtros) }))
    .filter((e) => e.total > 0);
  return enlaces.length ? { titulo, enlaces } : null;
}

/**
 * Menú de un animal: alimentación, salud (por necesidad) y cuidado.
 *
 * El agrupado es fijo porque responde a cómo compra la gente —primero qué come,
 * luego qué necesita, luego lo demás—, pero QUÉ aparece dentro sale de los
 * datos. Si mañana entran cinco piensos de dieta renal, la entrada existe sin
 * que nadie escriba nada.
 */
function entradaDeAnimal(animalSlug: string, etiqueta: string, tax: Taxonomy, productos: Product[]): EntradaNav | null {
  const total = contar(productos, { animal: animalSlug });
  if (total === 0) return null;

  const cat = (slug: string) => tax.categories.find((c) => c.slug === slug);
  const porCategorias = (slugs: string[]) =>
    slugs
      .map((s) => cat(s))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .map((c) => ({ etiqueta: c.name, filtros: { animal: animalSlug, category: c.slug } }));

  const columnas = [
    columna('Alimentación', porCategorias(['alimentacion-seca', 'alimentacion-humeda', 'semihumeda', 'premios-snacks']), productos),
    columna(
      'Salud y bienestar',
      tax.needs.map((n) => ({ etiqueta: n.name, filtros: { animal: animalSlug, need: n.slug } })),
      productos,
    ),
    columna('Cuidado y hogar', porCategorias(['higiene', 'accesorios', 'camas', 'transporte', 'suplementos', 'dietas-veterinarias']), productos),
  ].filter((c): c is ColumnaNav => c !== null);

  return {
    etiqueta,
    href: rutaCatalogo({ animal: animalSlug }),
    total,
    columnas: columnas.length ? columnas : undefined,
    verTodo: { etiqueta: `Ver todo para ${etiqueta.toLowerCase()}`, href: rutaCatalogo({ animal: animalSlug }), total },
  };
}

/**
 * El menú completo.
 *
 * `productos` debe ser el catálogo entero. Hoy son 28 y caben en una petición;
 * cuando no quepan habrá que pedirle los recuentos al servidor. Está anotado en
 * el informe como deuda conocida, con su umbral, para que no se descubra el día
 * que el menú empiece a mentir.
 */
export function construirNavegacion(tax: Taxonomy, productos: Product[]): EntradaNav[] {
  const entradas: EntradaNav[] = [];

  // Perros y gatos primero: es la primera bifurcación real de quien compra.
  for (const slug of ['perro', 'gato']) {
    const animal = tax.animals.find((a) => a.slug === slug);
    if (!animal) continue;
    const entrada = entradaDeAnimal(animal.slug, animal.name, tax, productos);
    if (entrada) entradas.push(entrada);
  }

  /*
   * El resto de animales se agrupa. Por separado, cada uno con uno o dos
   * productos, ocuparía tanto sitio en el menú como perros con quince, y
   * transmitiría una amplitud de catálogo que no existe.
   */
  const otros = tax.animals
    .filter((a) => !['perro', 'gato'].includes(a.slug))
    .map((a) => ({ etiqueta: a.name, href: rutaCatalogo({ animal: a.slug }), total: contar(productos, { animal: a.slug }) }))
    .filter((e) => e.total > 0);

  if (otros.length) {
    entradas.push({
      etiqueta: 'Otras mascotas',
      href: rutaCatalogo({}),
      total: otros.reduce((s, o) => s + o.total, 0),
      columnas: [{ titulo: 'Mascotas', enlaces: otros }],
    });
  }

  // Marcas: sólo las que tienen algo que enseñar.
  const marcas = tax.brands
    .map((b) => ({ etiqueta: b.name, href: rutaCatalogo({ brand: b.slug }), total: contar(productos, { brand: b.slug }) }))
    .filter((e) => e.total > 0);

  if (marcas.length) {
    const porColumna = Math.ceil(marcas.length / 3);
    entradas.push({
      etiqueta: 'Marcas',
      href: rutaCatalogo({}),
      total: marcas.reduce((s, m) => s + m.total, 0),
      columnas: [0, 1, 2]
        .map((i) => ({ titulo: i === 0 ? 'Marcas' : ' ', enlaces: marcas.slice(i * porColumna, (i + 1) * porColumna) }))
        .filter((c) => c.enlaces.length),
    });
  }

  /*
   * OFERTAS sólo si hay rebajas DE VERDAD.
   *
   * Antes apuntaba a `featured=1`, que es «destacado»: una decisión de
   * escaparate, no un descuento. La etiqueta prometía un ahorro que no existía.
   * Ahora se cuenta `compareAt > price`, y si no hay ninguno la entrada
   * desaparece en lugar de llevar a una sección comercial vacía.
   */
  const rebajados = productos.filter(estaRebajado).length;
  if (rebajados > 0) {
    entradas.push({ etiqueta: 'Ofertas', href: rutaCatalogo({ oferta: '1' }), total: rebajados });
  }

  return entradas;
}

/** Todos los destinos del menú, aplanados. Sirve para comprobar duplicados. */
export function destinosDe(entradas: EntradaNav[]): string[] {
  const out: string[] = [];
  for (const e of entradas) {
    for (const c of e.columnas ?? []) for (const l of c.enlaces) out.push(l.href);
    if (e.verTodo) out.push(e.verTodo.href);
    if (!e.columnas) out.push(e.href);
  }
  return out;
}
