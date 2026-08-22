/**
 * LA PORTADA NO PUEDE PROMETER LO QUE NO HAY.
 *
 * La portada anterior traía sus propias listas escritas a mano: seis animales
 * —incluido Reptiles, con cero productos— y ocho necesidades, ninguna
 * contrastada con el catálogo. Es el mismo fallo que tenía el menú, en otra
 * pantalla, y por la misma razón: nada cruzaba esas listas con lo que hay en la
 * tienda, así que el error no tenía forma de salir a la luz.
 *
 * Estas pruebas son ese cruce. Trabajan sobre las funciones puras que deciden
 * qué se enseña, sin React ni servidor.
 */

import { describe, it, expect } from 'vitest';
import {
  categorias,
  mascotas,
  ofertas,
  porcentajeAhorro,
  seleccion,
  MINIMO_PARA_PROTAGONISTA,
} from './portada';
import type { Animal, Brand, Category, Need, Product, Taxonomy } from './types';

const animal = (slug: string, name: string): Animal => ({ id: slug, slug, name, emoji: null, sortOrder: 0 });
const categoria = (slug: string, name: string): Category => ({ id: slug, slug, name, type: 'DRY_FOOD', sortOrder: 0 });
const necesidad = (slug: string, name: string): Need => ({ id: slug, slug, name });
const marca = (slug: string, name: string): Brand => ({ id: slug, slug, name, logoUrl: null, featured: false });

const TAX: Taxonomy = {
  animals: [
    animal('perro', 'Perros'),
    animal('gato', 'Gatos'),
    animal('pez', 'Peces'),
    // Existe en la taxonomía y no tiene ni un producto: el caso real.
    animal('reptil', 'Reptiles'),
  ],
  categories: [
    categoria('alimentacion-seca', 'Alimentación seca'),
    categoria('higiene', 'Higiene y cosmética'),
    // Ídem: declarada y vacía.
    categoria('semihumeda', 'Semihúmeda'),
  ],
  needs: [necesidad('digestivo', 'Digestivo sensible')],
  brands: [marca('ownat', 'Ownat'), marca('acana', 'Acana')],
};

let n = 0;
function producto(o: {
  animales?: string[];
  categorias?: string[];
  price?: number;
  compareAt?: number | null;
  featured?: boolean;
  bestseller?: boolean;
}): Product {
  n += 1;
  return {
    id: `p${n}`,
    name: `Producto ${n}`,
    slug: `producto-${n}`,
    description: '',
    brand: marca('ownat', 'Ownat'),
    brandId: 'ownat',
    price: o.price ?? 20,
    compareAt: o.compareAt ?? null,
    image: '',
    gallery: [],
    featured: o.featured ?? false,
    bestseller: o.bestseller ?? false,
    animals: (o.animales ?? []).map((s) => animal(s, s)),
    categories: (o.categorias ?? []).map((s) => categoria(s, s)),
    needs: [],
    variants: [],
  };
}

/** Seis de perro, dos de gato, uno de pez. Ninguno de reptil. */
const CATALOGO: Product[] = [
  ...Array.from({ length: 6 }, () => producto({ animales: ['perro'], categorias: ['alimentacion-seca'] })),
  producto({ animales: ['gato'], categorias: ['higiene'] }),
  producto({ animales: ['gato'], categorias: ['higiene'] }),
  producto({ animales: ['pez'] }),
];

/* ══ 1. Nada vacío ═════════════════════════════════════════════════════ */

describe('la portada no enseña facetas sin producto', () => {
  it('reptiles no sale por ninguna parte', () => {
    const todo = JSON.stringify({ ...mascotas(TAX, CATALOGO), c: categorias(TAX, CATALOGO) });
    expect(todo).not.toMatch(/reptil/i);
  });

  it('semihúmeda tampoco', () => {
    expect(JSON.stringify(categorias(TAX, CATALOGO))).not.toMatch(/semihumeda/i);
  });

  it('NINGUNA categoría de la portada devuelve cero', () => {
    // La comprobación general: caza cualquier caso futuro, con su nombre.
    const vacias = categorias(TAX, CATALOGO).filter((c) => c.total <= 0).map((c) => c.nombre);
    expect(vacias).toEqual([]);
  });

  it('NINGUNA mascota de la portada devuelve cero', () => {
    const { protagonistas, secundarias } = mascotas(TAX, CATALOGO);
    const vacias = [...protagonistas, ...secundarias].filter((m) => m.total <= 0).map((m) => m.nombre);
    expect(vacias).toEqual([]);
  });
});

/* ══ 2. Sólo es protagonista quien tiene catálogo ══════════════════════ */

describe('el tamaño del bloque depende de lo que hay detrás', () => {
  it('perros va arriba y peces no, porque peces tiene uno', () => {
    const { protagonistas, secundarias } = mascotas(TAX, CATALOGO);
    expect(protagonistas.map((m) => m.slug)).toEqual(['perro']);
    expect(secundarias.map((m) => m.slug)).toEqual(['gato', 'pez']);
  });

  it('una mascota asciende sola al llegar al mínimo', () => {
    /*
     * La razón de ser del umbral. Hoy los gatos son secundarios porque hay dos;
     * el día que haya cinco, el bloque grande aparece sin que nadie edite nada.
     */
    const conMasGatos = [
      ...CATALOGO,
      ...Array.from({ length: MINIMO_PARA_PROTAGONISTA - 2 }, () => producto({ animales: ['gato'] })),
    ];
    const { protagonistas } = mascotas(TAX, conMasGatos);
    expect(protagonistas.map((m) => m.slug)).toContain('gato');
  });

  it('los recuentos son los reales, no aproximados', () => {
    const { protagonistas, secundarias } = mascotas(TAX, CATALOGO);
    expect(protagonistas.find((m) => m.slug === 'perro')!.total).toBe(6);
    expect(secundarias.find((m) => m.slug === 'pez')!.total).toBe(1);
  });

  it('un catálogo vacío no produce una portada de mentira', () => {
    const { protagonistas, secundarias } = mascotas(TAX, []);
    expect(protagonistas).toEqual([]);
    expect(secundarias).toEqual([]);
    expect(categorias(TAX, [])).toEqual([]);
  });
});

/* ══ 3. Ofertas de verdad ══════════════════════════════════════════════ */

describe('«Ofertas» significa rebajado', () => {
  it('sin rebajas, no hay ofertas — y la sección desaparece', () => {
    expect(ofertas(CATALOGO)).toEqual([]);
  });

  it('destacado NO cuenta como oferta', () => {
    const destacado = producto({ animales: ['perro'], featured: true });
    expect(ofertas([...CATALOGO, destacado])).toEqual([]);
  });

  it('sólo cuenta si el precio anterior es MAYOR', () => {
    expect(ofertas([producto({ price: 20, compareAt: 30 })])).toHaveLength(1);
    expect(ofertas([producto({ price: 20, compareAt: 20 })])).toHaveLength(0);
    expect(ofertas([producto({ price: 20, compareAt: 10 })])).toHaveLength(0);
    expect(ofertas([producto({ price: 20, compareAt: null })])).toHaveLength(0);
  });

  it('el ahorro que se anuncia es el que sale de los precios', () => {
    expect(porcentajeAhorro(producto({ price: 15, compareAt: 20 }))).toBe(25);
    expect(porcentajeAhorro(producto({ price: 20, compareAt: null }))).toBeNull();
  });
});

/* ══ 4. La selección es de la tienda, no de las ventas ═════════════════ */

describe('«Lo que recomendamos» sale de `featured`', () => {
  it('coge los destacados', () => {
    const d1 = producto({ featured: true });
    const d2 = producto({ featured: true });
    expect(seleccion([...CATALOGO, d1, d2]).map((p) => p.id)).toEqual([d1.id, d2.id]);
  });

  it('NO usa `bestseller`, que dice «top ventas» sin datos de ventas', () => {
    /*
     * `bestseller` es una marca que se pone a mano. Contrastada contra los
     * pedidos pagados de verdad, los productos marcados suman MENOS unidades
     * que el resto del catálogo: la etiqueta decía lo contrario de lo que pasa.
     */
    const soloBestseller = producto({ bestseller: true, featured: false });
    expect(seleccion([...CATALOGO, soloBestseller])).toEqual([]);
  });

  it('no devuelve más de los que caben', () => {
    const muchos = Array.from({ length: 20 }, () => producto({ featured: true }));
    expect(seleccion(muchos, 8)).toHaveLength(8);
  });
});
