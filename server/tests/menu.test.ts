/**
 * EL ÁRBOL DEL MENÚ: una marca por categoría, y los recuentos exactos.
 *
 * `construirMenu` es pura: recibe productos y devuelve categoría → marca →
 * línea por animal. Se prueba sin base de datos. Lo que se vigila es justo lo
 * que motivó el modelo ortogonal: que «Alpha Spirit» salga UNA vez por
 * categoría —no una por cada animal en que vende— y que un producto de perro y
 * gato cuente en los dos.
 */

import { describe, it, expect } from 'vitest';
import { construirMenu, type ProductoMenu } from '../src/lib/menu.js';

const prod = (
  animals: string[],
  cat: [string, string, number],
  brand: [string, string],
  line: string | null,
): ProductoMenu => ({
  line,
  animals: animals.map((slug) => ({ slug })),
  categories: [{ slug: cat[0], name: cat[1], sortOrder: cat[2] }],
  brand: { slug: brand[0], name: brand[1] },
});

const SECA: [string, string, number] = ['alimentacion-seca', 'Alimentación seca', 1];
const HUMEDA: [string, string, number] = ['alimentacion-humeda', 'Alimentación húmeda', 2];
const ATL: [string, string] = ['atlanticpet', 'AtlanticPet'];
const ALPHA: [string, string] = ['alpha-spirit', 'Alpha Spirit'];
const DIS: [string, string] = ['disugual', 'Disugual'];

const ANIMALES = [
  { slug: 'perro', name: 'Perros', sortOrder: 1 },
  { slug: 'gato', name: 'Gatos', sortOrder: 2 },
];

const PRODUCTOS: ProductoMenu[] = [
  prod(['perro'], SECA, ATL, 'Grain Free'),
  prod(['perro'], SECA, ATL, 'Premium Recetas'),
  prod(['perro'], SECA, ALPHA, null),
  prod(['perro', 'gato'], SECA, ALPHA, null), // perro Y gato
  prod(['gato'], HUMEDA, DIS, null),
];

describe('construirMenu', () => {
  const menu = construirMenu(PRODUCTOS, ANIMALES);
  const perro = menu.find((a) => a.slug === 'perro')!;
  const gato = menu.find((a) => a.slug === 'gato')!;

  it('un producto de perro y gato cuenta en los dos', () => {
    expect(perro.total).toBe(4);
    expect(gato.total).toBe(2);
  });

  it('una marca aparece UNA vez por categoría, con su recuento sumado', () => {
    const seca = perro.categorias.find((c) => c.slug === 'alimentacion-seca')!;
    const alphas = seca.marcas.filter((m) => m.slug === 'alpha-spirit');
    expect(alphas).toHaveLength(1);
    // Alpha Spirit en seca-perro: el de sólo perro + el de perro y gato = 2.
    expect(alphas[0]!.total).toBe(2);
  });

  it('las líneas de una marca se agrupan bajo ella', () => {
    const seca = perro.categorias.find((c) => c.slug === 'alimentacion-seca')!;
    const atl = seca.marcas.find((m) => m.slug === 'atlanticpet')!;
    expect(atl.total).toBe(2);
    expect(atl.lineas.map((l) => l.nombre)).toEqual(['Grain Free', 'Premium Recetas']);
  });

  it('una marca sin líneas no las inventa', () => {
    const seca = perro.categorias.find((c) => c.slug === 'alimentacion-seca')!;
    const alpha = seca.marcas.find((m) => m.slug === 'alpha-spirit')!;
    expect(alpha.lineas).toEqual([]);
  });

  it('las categorías salen en su orden', () => {
    expect(gato.categorias.map((c) => c.slug)).toEqual(['alimentacion-seca', 'alimentacion-humeda']);
  });

  it('un catálogo vacío no produce menú', () => {
    expect(construirMenu([], ANIMALES)).toEqual([]);
  });
});
