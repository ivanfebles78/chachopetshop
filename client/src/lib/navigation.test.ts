/**
 * EL MENÚ: categoría → marca → línea, sin duplicados.
 *
 * El árbol lo calcula el servidor (`server/lib/menu.ts`, con su propio test);
 * aquí se prueba la función pura que le da forma para la cabecera. Lo que se
 * vigila es lo que el usuario pidió: que una marca aparezca UNA vez dentro de su
 * categoría, con sus líneas debajo, y que ningún destino se repita.
 */

import { describe, it, expect } from 'vitest';
import { menuAEntradas, destinosDe, estaRebajado, rutaCatalogo } from './navigation';
import type { MenuAnimal, Product } from './types';

const MENU: MenuAnimal[] = [
  {
    slug: 'perro',
    nombre: 'Perros',
    total: 4,
    categorias: [
      {
        slug: 'alimentacion-seca',
        nombre: 'Alimentación seca',
        sortOrder: 1,
        total: 3,
        marcas: [
          {
            slug: 'atlanticpet',
            nombre: 'AtlanticPet',
            total: 2,
            lineas: [
              { nombre: 'Grain Free', total: 1 },
              { nombre: 'Premium Recetas', total: 1 },
            ],
          },
          { slug: 'alpha-spirit', nombre: 'Alpha Spirit', total: 1, lineas: [] },
        ],
      },
      {
        slug: 'alimentacion-humeda',
        nombre: 'Alimentación húmeda',
        sortOrder: 2,
        total: 1,
        marcas: [{ slug: 'alpha-spirit', nombre: 'Alpha Spirit', total: 1, lineas: [] }],
      },
    ],
  },
  {
    slug: 'gato',
    nombre: 'Gatos',
    total: 1,
    categorias: [
      {
        slug: 'alimentacion-seca',
        nombre: 'Alimentación seca',
        sortOrder: 1,
        total: 1,
        marcas: [{ slug: 'alpha-spirit', nombre: 'Alpha Spirit', total: 1, lineas: [] }],
      },
    ],
  },
];

describe('menuAEntradas', () => {
  it('una entrada por animal, en orden', () => {
    expect(menuAEntradas(MENU).map((e) => e.etiqueta)).toEqual(['Perros', 'Gatos']);
  });

  it('una columna por categoría, con su nombre', () => {
    const perros = menuAEntradas(MENU)[0]!;
    expect(perros.columnas?.map((c) => c.titulo)).toEqual(['Alimentación seca', 'Alimentación húmeda']);
  });

  it('cada columna abre con «Todo en …» y luego las marcas con sus líneas debajo', () => {
    const seca = menuAEntradas(MENU)[0]!.columnas!.find((c) => c.titulo === 'Alimentación seca')!;
    expect(seca.enlaces.map((e) => e.etiqueta)).toEqual([
      'Todo en alimentación seca',
      'AtlanticPet',
      'Grain Free',
      'Premium Recetas',
      'Alpha Spirit',
    ]);
  });

  it('las líneas van a nivel 1 y las marcas a nivel 0', () => {
    const seca = menuAEntradas(MENU)[0]!.columnas!.find((c) => c.titulo === 'Alimentación seca')!;
    const grainFree = seca.enlaces.find((e) => e.etiqueta === 'Grain Free')!;
    const atlanticpet = seca.enlaces.find((e) => e.etiqueta === 'AtlanticPet')!;
    expect(grainFree.nivel).toBe(1);
    expect(atlanticpet.nivel).toBe(0);
  });

  it('una marca aparece UNA sola vez dentro de su categoría', () => {
    // El fallo que reportó el usuario: «Alpha Spirit» repetido.
    const seca = menuAEntradas(MENU)[0]!.columnas!.find((c) => c.titulo === 'Alimentación seca')!;
    const veces = seca.enlaces.filter((e) => e.etiqueta === 'Alpha Spirit').length;
    expect(veces).toBe(1);
  });

  it('el enlace de una marca lleva animal + categoría + marca', () => {
    const seca = menuAEntradas(MENU)[0]!.columnas!.find((c) => c.titulo === 'Alimentación seca')!;
    const atlanticpet = seca.enlaces.find((e) => e.etiqueta === 'AtlanticPet')!;
    expect(atlanticpet.href).toContain('animal=perro');
    expect(atlanticpet.href).toContain('category=alimentacion-seca');
    expect(atlanticpet.href).toContain('brand=atlanticpet');
  });

  it('el enlace de una línea añade el filtro de línea', () => {
    const seca = menuAEntradas(MENU)[0]!.columnas!.find((c) => c.titulo === 'Alimentación seca')!;
    const grainFree = seca.enlaces.find((e) => e.etiqueta === 'Grain Free')!;
    expect(grainFree.href).toContain('brand=atlanticpet');
    expect(grainFree.href).toContain('line=Grain+Free');
  });

  it('ningún destino del menú se repite', () => {
    const destinos = destinosDe(menuAEntradas(MENU));
    const repetidos = destinos.filter((d, i) => destinos.indexOf(d) !== i);
    expect([...new Set(repetidos)]).toEqual([]);
  });

  it('un menú vacío no produce entradas', () => {
    expect(menuAEntradas([])).toEqual([]);
  });
});

describe('estaRebajado', () => {
  const producto = (price: number | null, compareAt: number | null): Product =>
    ({ price, compareAt } as Product);

  it('sólo es oferta si el precio anterior es MAYOR', () => {
    expect(estaRebajado(producto(20, 30))).toBe(true);
    expect(estaRebajado(producto(20, 20))).toBe(false);
    expect(estaRebajado(producto(20, 10))).toBe(false);
    expect(estaRebajado(producto(20, null))).toBe(false);
  });

  it('sin precio no hay oferta', () => {
    expect(estaRebajado(producto(null, 30))).toBe(false);
  });
});

describe('rutaCatalogo', () => {
  it('sin filtros lleva al catálogo completo', () => {
    expect(rutaCatalogo({})).toBe('/tienda');
  });
  it('con filtros los codifica', () => {
    expect(rutaCatalogo({ animal: 'perro', category: 'alimentacion-seca' })).toBe(
      '/tienda?animal=perro&category=alimentacion-seca',
    );
  });
});
