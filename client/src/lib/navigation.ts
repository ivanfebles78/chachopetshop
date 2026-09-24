import type { MenuAnimal, Product } from './types';

/**
 * LA NAVEGACIÓN SALE DEL CATÁLOGO, Y AHORA DEL SERVIDOR.
 *
 * El árbol categoría → marca → línea lo calcula el servidor sobre TODO el
 * catálogo (`/api/taxonomy/menu`), no el cliente contando una página. Con 387
 * productos, contar sólo los 48 primeros dejaba marcas y categorías enteras
 * fuera del menú EN SILENCIO —el riesgo estaba anotado con su umbral, y al
 * cargar el catálogo real se cruzó—.
 *
 * Aquí sólo se DA FORMA a ese árbol para pintarlo. Es una función pura: recibe
 * el menú, devuelve las entradas de la cabecera. Se prueba sin React ni red.
 *
 * El modelo es ortogonal: dentro de cada categoría, la marca aparece UNA vez y
 * sus líneas cuelgan debajo. Una marca sin líneas lleva directa a sus productos.
 */

export type EnlaceNav = {
  etiqueta: string;
  href: string;
  total: number;
  /** 0 = categoría o marca; 1 = línea de una marca. Sólo cambia la sangría. */
  nivel?: 0 | 1;
};

export type ColumnaNav = { titulo: string; enlaces: EnlaceNav[] };

export type EntradaNav = {
  etiqueta: string;
  href: string;
  total: number;
  columnas?: ColumnaNav[];
  verTodo?: EnlaceNav;
};

/** Construye la ruta del catálogo con los filtros indicados. */
export function rutaCatalogo(filtros: Record<string, string>): string {
  const qs = new URLSearchParams(filtros).toString();
  return qs ? `/tienda?${qs}` : '/tienda';
}

/** Un producto está REALMENTE rebajado si tiene precio anterior mayor. */
export function estaRebajado(p: Product): boolean {
  return typeof p.compareAt === 'number' && p.price != null && p.compareAt > p.price;
}

/**
 * Convierte el árbol del menú (por animal) en las entradas de la cabecera.
 *
 * Una entrada por animal (Perros, Gatos). Dentro, una columna por categoría; y
 * en cada columna, «Todo en …» + las marcas, con las líneas de cada marca
 * indentadas debajo.
 */
export function menuAEntradas(animales: MenuAnimal[]): EntradaNav[] {
  return animales.map((animal) => {
    const columnas: ColumnaNav[] = animal.categorias.map((cat) => {
      const enlaces: EnlaceNav[] = [
        {
          etiqueta: `Todo en ${cat.nombre.toLowerCase()}`,
          href: rutaCatalogo({ animal: animal.slug, category: cat.slug }),
          total: cat.total,
          nivel: 0,
        },
      ];
      for (const marca of cat.marcas) {
        enlaces.push({
          etiqueta: marca.nombre,
          href: rutaCatalogo({ animal: animal.slug, category: cat.slug, brand: marca.slug }),
          total: marca.total,
          nivel: 0,
        });
        for (const linea of marca.lineas) {
          enlaces.push({
            etiqueta: linea.nombre,
            href: rutaCatalogo({ animal: animal.slug, category: cat.slug, brand: marca.slug, line: linea.nombre }),
            total: linea.total,
            nivel: 1,
          });
        }
      }
      return { titulo: cat.nombre, enlaces };
    });

    return {
      etiqueta: animal.nombre,
      href: rutaCatalogo({ animal: animal.slug }),
      total: animal.total,
      columnas,
      verTodo: {
        etiqueta: `Ver todo para ${animal.nombre.toLowerCase()}`,
        href: rutaCatalogo({ animal: animal.slug }),
        total: animal.total,
      },
    };
  });
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
