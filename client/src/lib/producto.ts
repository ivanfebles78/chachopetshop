import type { Product } from './types';

/**
 * LA FICHA, CONSTRUIDA CON LO QUE HAY.
 *
 * El encargo sugería secciones de Ingredientes, Composición y Tabla de
 * raciones. NO EXISTEN: el modelo de datos tiene nombre, descripción, marca,
 * precio, imágenes, animales, categorías, necesidades y variantes, y nada más.
 *
 * Así que no se crean. Un acordeón «Ingredientes» que al abrirlo está vacío es
 * peor que no ponerlo, y rellenarlo sería inventarse la composición de un
 * alimento — que en un producto que se come es de las cosas menos inocentes
 * que se pueden inventar.
 *
 * Lo que queda es cierto y sale de la base de datos.
 */

export type Fila = {
  etiqueta: string;
  valor?: string;
  /** Cuando el dato es navegable, se enlaza a su filtro del catálogo. */
  enlaces?: { etiqueta: string; href: string }[];
};

export function fichaTecnica(p: Product): Fila[] {
  const filas: Fila[] = [];

  filas.push({
    etiqueta: 'Marca',
    enlaces: [{ etiqueta: p.brand.name, href: `/tienda?brand=${p.brand.slug}` }],
  });

  if (p.variants.length > 0) {
    filas.push({
      etiqueta: p.variants.length > 1 ? 'Formatos' : 'Formato',
      valor: p.variants.map((v) => v.label).join(' · '),
    });
  }

  if (p.animals.length > 0) {
    filas.push({
      etiqueta: 'Para',
      enlaces: p.animals.map((a) => ({ etiqueta: a.name, href: `/tienda?animal=${a.slug}` })),
    });
  }

  if (p.categories.length > 0) {
    filas.push({
      etiqueta: 'Tipo',
      enlaces: p.categories.map((c) => ({ etiqueta: c.name, href: `/tienda?category=${c.slug}` })),
    });
  }

  if (p.needs.length > 0) {
    filas.push({
      etiqueta: 'Indicado para',
      enlaces: p.needs.map((n) => ({ etiqueta: n.name, href: `/tienda?need=${n.slug}` })),
    });
  }

  return filas;
}

/**
 * El titular de los relacionados, sacado del motivo que manda el servidor.
 *
 * No se dice «recomendado para ti» ni se enseña ninguna puntuación: no hay
 * nada personalizado detrás. Se dice lo que de verdad los une, que además es
 * más útil — «más alimentación seca para perros» explica por sí solo qué se
 * está viendo.
 */
export function motivoRelacionado(
  related: { motivo?: string }[],
  categoria?: string,
  animal?: string,
): string {
  const motivo = related[0]?.motivo;
  if (motivo === 'categoria' && categoria && animal) {
    return `Más ${categoria.toLowerCase()} para ${animal.toLowerCase()}`;
  }
  if (motivo === 'animal' && animal) return `Más para ${animal.toLowerCase()}`;
  if (motivo === 'marca') return 'Más de esta marca';
  return 'También te puede servir';
}

/**
 * DATOS ESTRUCTURADOS DEL PRODUCTO.
 *
 * Todo lo que se declara aquí sale de la base de datos y coincide con lo que
 * hay en pantalla. En particular NO se emiten `aggregateRating` ni
 * `reviewCount`: no hay ni una reseña real, y declararlas para que salgan
 * estrellitas en Google es exactamente el tipo de dato falso que la Fase 1 ya
 * quitó del catálogo — con el agravante de que aquí se le está afirmando a un
 * buscador, que lo publica.
 *
 * `availability` se calcula con el stock real de las variantes, no se pone
 * `InStock` por costumbre. Y el precio es el más bajo comprable, que es el que
 * se enseña como «desde».
 */
export function datosEstructuradosProducto(p: Product, origen: string): Record<string, unknown> {
  const comprables = p.variants.filter((v) => v.stock > 0);
  const hayStock = p.variants.length === 0 || comprables.length > 0;
  const precios = (comprables.length ? comprables : p.variants).map((v) => v.price);
  const precio = precios.length ? Math.min(...precios) : p.price;

  return {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: p.name,
    description: p.description,
    image: (p.gallery.length ? p.gallery : [p.image]).filter(Boolean),
    sku: p.variants[0]?.sku ?? undefined,
    brand: { '@type': 'Brand', name: p.brand.name },
    category: p.categories[0]?.name,
    offers: {
      '@type': 'Offer',
      url: `${origen}/producto/${p.slug}`,
      priceCurrency: 'EUR',
      price: precio.toFixed(2),
      availability: hayStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };
}
