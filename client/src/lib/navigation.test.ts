/**
 * UTILIDADES DE NAVEGACIÓN.
 *
 * El árbol del menú lo calcula el servidor (`server/lib/menu.ts`, con su test) y
 * lo pinta el acordeón `MenuArbol` (con su test en `shell.test.tsx`). Aquí sólo
 * quedan las dos piezas puras que ese render y la portada comparten.
 */

import { describe, it, expect } from 'vitest';
import { estaRebajado, rutaCatalogo } from './navigation';
import type { Product } from './types';

describe('rutaCatalogo', () => {
  it('sin filtros lleva al catálogo completo', () => {
    expect(rutaCatalogo({})).toBe('/tienda');
  });
  it('con filtros los codifica', () => {
    expect(rutaCatalogo({ animal: 'perro', category: 'alimentacion-seca', brand: 'atlanticpet' })).toBe(
      '/tienda?animal=perro&category=alimentacion-seca&brand=atlanticpet',
    );
  });
  it('la línea, con espacios, se codifica', () => {
    expect(rutaCatalogo({ brand: 'atlanticpet', line: 'Grain Free' })).toContain('line=Grain+Free');
  });
});

describe('estaRebajado', () => {
  const producto = (price: number | null, compareAt: number | null): Product =>
    ({ price, compareAt }) as Product;

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
