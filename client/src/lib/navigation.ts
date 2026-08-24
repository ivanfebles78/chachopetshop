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
 * El menú de un animal a partir de la JERARQUÍA de categorías.
 *
 * Una columna por categoría de primer nivel, y dentro sus líneas de marca. Es
 * la estructura que se ve en una tienda de verdad: primero qué tipo de producto
 * y luego de qué marca.
 *
 * Devuelve `null` si este animal todavía no tiene estructura cargada, y
 * entonces el menú cae al agrupado anterior. Así los animales que aún no se han
 * migrado —gatos, aves, roedores, peces— siguen funcionando igual.
 */
function entradaDesdeJerarquia(
  animalSlug: string,
  etiqueta: string,
  tax: Taxonomy,
  productos: Product[],
): EntradaNav | null {
  const animal = tax.animals.find((a) => a.slug === animalSlug);
  if (!animal) return null;

  const raices = tax.categories
    .filter((c) => c.animalId === animal.id && !c.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  if (raices.length === 0) return null;

  const columnas: ColumnaNav[] = raices.map((raiz) => {
    const hijas = tax.categories
      .filter((c) => c.parentId === raiz.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    /*
     * El primer enlace de cada columna es la categoría madre entera. Sin él, la
     * única forma de ver «toda la alimentación seca» sería entrar marca por
     * marca.
     */
    const enlaces: EnlaceNav[] = [
      {
        etiqueta: `Todo en ${raiz.name.toLowerCase()}`,
        href: rutaCatalogo({ animal: animalSlug, category: raiz.slug }),
        total: contar(productos, { animal: animalSlug, category: raiz.slug }),
      },
      ...hijas.map((h) => ({
        etiqueta: h.name,
        href: rutaCatalogo({ animal: animalSlug, category: h.slug }),
        total: contar(productos, { animal: animalSlug, category: h.slug }),
      })),
    ];

    return { titulo: raiz.name, enlaces };
  });

  const total = contar(productos, { animal: animalSlug });
  return {
    etiqueta,
    href: rutaCatalogo({ animal: animalSlug }),
    total,
    columnas,
    verTodo: {
      etiqueta: `Ver todo para ${etiqueta.toLowerCase()}`,
      href: rutaCatalogo({ animal: animalSlug }),
      total,
    },
  };
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

  /*
   * LA JERARQUÍA MANDA CUANDO EXISTE.
   *
   * Desde la Fase 2I el catálogo tiene estructura de verdad —animal → categoría
   * → línea de marca— y se carga ANTES que la mercancía. Si este animal la
   * tiene, el menú sale de ella y no del agrupado fijo de más abajo.
   *
   * Y aquí cambia una regla anterior a propósito: estas categorías se enseñan
   * AUNQUE tengan cero productos. En la Fase 2A se ocultaba lo vacío porque era
   * una faceta derivada de los datos y una faceta vacía no llevaba a ninguna
   * parte. Ahora no es una faceta derivada: es la estructura comercial que Ivan
   * ha decidido, y ocultar «Alimentación semihúmeda» hasta que entre el primer
   * producto haría que el menú cambiara de forma solo, sin que nadie lo tocara.
   *
   * A cambio, el catálogo tiene que recibir bien a quien llegue a una vacía:
   * eso lo resuelve el estado vacío de la tienda, no el menú.
   */
  const jerarquia = entradaDesdeJerarquia(animalSlug, etiqueta, tax, productos);
  if (jerarquia) return jerarquia;

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
