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
/**
 * ¿Es este código un EAN-13 de verdad?
 *
 * Trece dígitos y, sobre todo, dígito de control correcto. Sin comprobarlo,
 * cualquier cadena de trece cifras pasaría por código de barras — y un GTIN
 * inventado en datos estructurados es información falsa entregada a un buscador,
 * que además puede acabar en una ficha de producto de Google.
 */
export function esEan13(codigo: string | undefined): boolean {
  if (!codigo || !/^\d{13}$/.test(codigo)) return false;
  const suma = codigo
    .slice(0, 12)
    .split('')
    .reduce((s, d, i) => s + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (suma % 10)) % 10 === Number(codigo[12]);
}

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
    /*
     * GTIN sólo cuando el SKU ES un código de barras válido.
     *
     * Los SKU del catálogo de demostración son internos («ROY-STE-2»), y
     * publicarlos como GTIN sería declararle a Google un código de barras que no
     * existe. Los reales sí lo son: el de Alpha Spirit es un EAN-13 con dígito
     * de control correcto y prefijo GS1 español.
     *
     * Se comprueba, no se supone. Ver `esEan13`.
     */
    ...(esEan13(p.variants[0]?.sku) ? { gtin13: p.variants[0]!.sku } : {}),
    brand: { '@type': 'Brand', name: p.brand.name },
    category: p.categories[0]?.name,
    /*
     * Sin precio fijado no hay oferta que declarar. Publicar `price: "0.00"`
     * le diría a Google que este producto es gratis.
     */
    ...(precio > 0
      ? {
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
        }
      : {}),
  };
}
