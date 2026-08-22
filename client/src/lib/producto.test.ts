/**
 * LA FICHA NO PUEDE AFIRMAR LO QUE NO SABE.
 *
 * Dos cosas se cuidan aquí:
 *
 *   1. Que la ficha técnica salga de los datos y no invente secciones. El
 *      encargo sugería Ingredientes, Composición y tabla de raciones: no
 *      existen en la base de datos. Inventar la composición de un alimento que
 *      se come es de las cosas menos inocentes que se pueden inventar.
 *
 *   2. Que los datos estructurados sean CIERTOS. Es lo que se le afirma a un
 *      buscador, que lo publica con estrellitas al lado. La Fase 1 ya quitó del
 *      catálogo un `rating` por defecto de 4,6 que nadie había votado; volver a
 *      meterlo aquí, y encima hacia fuera, sería peor.
 */

import { describe, it, expect } from 'vitest';
import { datosEstructuradosProducto, fichaTecnica, motivoRelacionado } from './producto';
import type { Product } from './types';

const producto = (o: Partial<Product> = {}): Product => ({
  id: 'p1',
  name: 'Orijen Original Dog',
  slug: 'orijen-original',
  description: 'El 85 % de ingredientes animales.',
  brand: { id: 'b', name: 'Orijen', slug: 'orijen', logoUrl: null, featured: true },
  brandId: 'b',
  price: 34.5,
  compareAt: null,
  image: 'https://ejemplo.test/1.jpg',
  gallery: ['https://ejemplo.test/1.jpg', 'https://ejemplo.test/2.jpg'],
  featured: false,
  bestseller: false,
  animals: [{ id: 'a', name: 'Perros', slug: 'perro', emoji: null, sortOrder: 0 }],
  categories: [{ id: 'c', name: 'Alimentación seca', slug: 'alimentacion-seca', type: 'DRY_FOOD', sortOrder: 0 }],
  needs: [{ id: 'n', name: 'Digestivo sensible', slug: 'digestivo' }],
  variants: [
    { id: 'v1', label: '2 kg', price: 34.5, sku: 'SKU-1', stock: 22 },
    { id: 'v2', label: '11,4 kg', price: 112, sku: 'SKU-2', stock: 8 },
  ],
  ...o,
});

/* ══ 1. Ficha técnica ══════════════════════════════════════════════════ */

describe('la ficha técnica sale de los datos', () => {
  it('enseña marca, formatos, animal, tipo y necesidades', () => {
    const filas = fichaTecnica(producto()).map((f) => f.etiqueta);
    expect(filas).toEqual(['Marca', 'Formatos', 'Para', 'Tipo', 'Indicado para']);
  });

  it('NO inventa ingredientes, composición ni raciones', () => {
    // No están en el modelo de datos. Un acordeón vacío llamado «Ingredientes»
    // promete algo que no hay dentro; rellenarlo sería mentir sobre comida.
    const texto = JSON.stringify(fichaTecnica(producto()));
    expect(texto).not.toMatch(/ingredient|composici|raci[oó]n|analítica/i);
  });

  it('las filas sin dato no se pintan', () => {
    const filas = fichaTecnica(producto({ needs: [], categories: [], animals: [] }));
    expect(filas.map((f) => f.etiqueta)).toEqual(['Marca', 'Formatos']);
  });

  it('sin variantes tampoco hay fila de formato', () => {
    const filas = fichaTecnica(producto({ variants: [] }));
    expect(filas.map((f) => f.etiqueta)).not.toContain('Formato');
    expect(filas.map((f) => f.etiqueta)).not.toContain('Formatos');
  });

  it('singular con un formato, plural con varios', () => {
    const uno = producto({ variants: [{ id: 'v', label: '1 kg', price: 9, sku: 's', stock: 3 }] });
    expect(fichaTecnica(uno).find((f) => f.etiqueta === 'Formato')).toBeTruthy();
    expect(fichaTecnica(producto()).find((f) => f.etiqueta === 'Formatos')).toBeTruthy();
  });

  it('los datos navegables enlazan a filtros reales del catálogo', () => {
    const filas = fichaTecnica(producto());
    const para = filas.find((f) => f.etiqueta === 'Para');
    expect(para?.enlaces?.[0]).toEqual({ etiqueta: 'Perros', href: '/tienda?animal=perro' });
  });
});

/* ══ 2. Datos estructurados ════════════════════════════════════════════ */

describe('los datos estructurados son ciertos', () => {
  it('NO declara valoraciones ni reseñas', () => {
    /*
     * No hay ni una opinión real en toda la tienda. Declarar `aggregateRating`
     * para que Google pinte estrellas es afirmarle a un buscador algo falso, y
     * lo publica en su resultado — con la Directiva Ómnibus por medio.
     */
    const d = datosEstructuradosProducto(producto(), 'https://x.test');
    expect(d).not.toHaveProperty('aggregateRating');
    expect(d).not.toHaveProperty('review');
    expect(d).not.toHaveProperty('reviewCount');
    expect(JSON.stringify(d)).not.toMatch(/rating|review/i);
  });

  it('el precio es el más bajo COMPRABLE, y coincide con el de la pantalla', () => {
    const d = datosEstructuradosProducto(producto(), 'https://x.test') as never as {
      offers: { price: string; priceCurrency: string };
    };
    expect(d.offers.price).toBe('34.50');
    expect(d.offers.priceCurrency).toBe('EUR');
  });

  it('si el formato barato está agotado, el precio declarado es el que sí se puede comprar', () => {
    const p = producto({
      variants: [
        { id: 'v1', label: '2 kg', price: 34.5, sku: 's1', stock: 0 },
        { id: 'v2', label: '11,4 kg', price: 112, sku: 's2', stock: 8 },
      ],
    });
    const d = datosEstructuradosProducto(p, 'https://x.test') as never as { offers: { price: string } };
    expect(d.offers.price).toBe('112.00');
  });

  it('la disponibilidad sale del stock real, no se pone por costumbre', () => {
    const conStock = datosEstructuradosProducto(producto(), 'https://x.test') as never as {
      offers: { availability: string };
    };
    expect(conStock.offers.availability).toBe('https://schema.org/InStock');

    const agotado = producto({
      variants: [{ id: 'v', label: '2 kg', price: 34.5, sku: 's', stock: 0 }],
    });
    const sinStock = datosEstructuradosProducto(agotado, 'https://x.test') as never as {
      offers: { availability: string };
    };
    expect(sinStock.offers.availability).toBe('https://schema.org/OutOfStock');
  });

  it('la url del ofrecimiento es la de la ficha', () => {
    const d = datosEstructuradosProducto(producto(), 'https://x.test') as never as {
      offers: { url: string };
    };
    expect(d.offers.url).toBe('https://x.test/producto/orijen-original');
  });

  it('lleva marca, imágenes y tipo, todo de la base de datos', () => {
    const d = datosEstructuradosProducto(producto(), 'https://x.test') as never as Record<string, never>;
    expect((d.brand as unknown as { name: string }).name).toBe('Orijen');
    expect((d.image as unknown as string[]).length).toBe(2);
    expect(d['@type']).toBe('Product');
  });
});

/* ══ 3. Relacionados explicables ═══════════════════════════════════════ */

describe('los relacionados dicen por qué lo son', () => {
  it('mismo tipo y mismo animal', () => {
    expect(motivoRelacionado([{ motivo: 'categoria' }], 'Alimentación seca', 'Perros'))
      .toBe('Más alimentación seca para perros');
  });

  it('mismo animal', () => {
    expect(motivoRelacionado([{ motivo: 'animal' }], undefined, 'Gatos')).toBe('Más para gatos');
  });

  it('misma marca', () => {
    expect(motivoRelacionado([{ motivo: 'marca' }], 'X', 'Y')).toBe('Más de esta marca');
  });

  it('sin motivo no se inventa una recomendación personalizada', () => {
    const t = motivoRelacionado([{}], undefined, undefined);
    expect(t).toBe('También te puede servir');
    expect(t).not.toMatch(/para ti|recomendado para|personaliz/i);
  });
});
