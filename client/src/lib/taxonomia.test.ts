/**
 * EL MENÚ SALE DE LA JERARQUÍA REAL DEL CATÁLOGO.
 *
 * Hasta la Fase 2I el menú agrupaba las categorías en tres columnas escritas a
 * mano y ocultaba lo que no tenía productos. Eso valía cuando las categorías
 * eran facetas derivadas de la mercancía.
 *
 * Ahora hay una estructura comercial de verdad —animal → categoría → línea de
 * marca— que se carga ANTES que los productos. Y con eso cambia una regla:
 *
 *   Las categorías de la estructura se enseñan AUNQUE estén vacías.
 *
 * No es una excepción a la regla de la Fase 2A —«no ofrezcas un destino que no
 * lleva a ninguna parte»—, es que el destino ahora sí existe: es una sección
 * real de la tienda que todavía no tiene género, y el catálogo lo dice con
 * «Próximamente…» en vez de con «no hay productos con estos filtros».
 */

import { describe, it, expect } from 'vitest';
import { construirNavegacion } from './navigation';
import type { Taxonomy, Product } from './types';

const perro = { id: 'a-perro', name: 'Perros', slug: 'perro', sortOrder: 1 };
const gato = { id: 'a-gato', name: 'Gatos', slug: 'gato', sortOrder: 2 };

const cat = (id: string, name: string, slug: string, extra: Record<string, unknown> = {}) => ({
  id, name, slug, type: 'DRY_FOOD', sortOrder: 0, parentId: null, animalId: null, ...extra,
});

const taxonomia = (): Taxonomy =>
  ({
    animals: [perro, gato],
    categories: [
      // Perros, con jerarquía (Fase 2I)
      cat('c-seca', 'Alimentación seca perros', 'alimentacion-seca-perros', { animalId: 'a-perro', sortOrder: 0 }),
      cat('c-alpha', 'Alpha Spirit alimentación perro', 'alpha-spirit-alimentacion-perro', { parentId: 'c-seca', sortOrder: 0 }),
      cat('c-sevican', 'Sevican perro', 'sevican-perro', { parentId: 'c-seca', sortOrder: 1 }),
      cat('c-humeda', 'Alimentación húmeda perros', 'alimentacion-humeda-perros', { animalId: 'a-perro', sortOrder: 1 }),
      cat('c-piper', 'Piper húmeda perro', 'piper-humeda-perro', { parentId: 'c-humeda', sortOrder: 0 }),
      // Gatos, todavía SIN jerarquía: debe seguir funcionando como antes
      cat('c-gato-seca', 'Alimentación seca', 'alimentacion-seca'),
    ],
    needs: [],
    brands: [],
  }) as never;

/** Un producto de gato, para que la entrada de gatos exista por el camino viejo. */
const productoDeGato = () =>
  ({
    id: 'p1', slug: 'x', name: 'Pienso gato', price: 10, image: '', gallery: [],
    brand: { id: 'b', name: 'M', slug: 'm' },
    categories: [{ id: 'c-gato-seca', name: 'Alimentación seca', slug: 'alimentacion-seca', type: 'DRY_FOOD', sortOrder: 0 }],
    animals: [gato], needs: [], variants: [],
  }) as never as Product;

const entradaDe = (etiqueta: string, productos: Product[] = []) =>
  construirNavegacion(taxonomia(), productos).find((e) => e.etiqueta === etiqueta);

describe('el menú de perros sale de la jerarquía', () => {
  it('UNA COLUMNA POR CATEGORÍA, con su nombre real', () => {
    const perros = entradaDe('Perros');
    expect(perros).toBeTruthy();
    expect(perros!.columnas?.map((c) => c.titulo)).toEqual([
      'Alimentación seca perros',
      'Alimentación húmeda perros',
    ]);
  });

  it('dentro van sus líneas de marca, en orden', () => {
    const seca = entradaDe('Perros')!.columnas!.find((c) => c.titulo === 'Alimentación seca perros')!;
    const etiquetas = seca.enlaces.map((e) => e.etiqueta);
    expect(etiquetas).toEqual([
      'Todo en alimentación seca perros',
      'Alpha Spirit alimentación perro',
      'Sevican perro',
    ]);
  });

  it('cada columna abre con la categoría entera', () => {
    /*
     * Sin ese primer enlace, la única forma de ver toda la alimentación seca
     * sería entrar marca por marca.
     */
    const seca = entradaDe('Perros')!.columnas!.find((c) => c.titulo === 'Alimentación seca perros')!;
    expect(seca.enlaces[0]!.href).toContain('category=alimentacion-seca-perros');
  });

  it('LAS CATEGORÍAS VACÍAS SIGUEN EN EL MENÚ', () => {
    /*
     * Ninguna de estas categorías tiene productos todavía. Antes el menú las
     * habría escondido y la estructura habría ido apareciendo sola según entrara
     * mercancía, cambiando de forma sin que nadie la tocara.
     */
    const perros = entradaDe('Perros')!;
    const todos = perros.columnas!.flatMap((c) => c.enlaces);
    expect(todos.length).toBeGreaterThan(0);
    expect(todos.every((e) => e.total === 0)).toBe(true);
  });

  it('los enlaces llevan animal y categoría, para que el catálogo filtre bien', () => {
    const alpha = entradaDe('Perros')!
      .columnas!.flatMap((c) => c.enlaces)
      .find((e) => e.etiqueta === 'Alpha Spirit alimentación perro')!;
    expect(alpha.href).toContain('animal=perro');
    expect(alpha.href).toContain('category=alpha-spirit-alimentacion-perro');
  });

  it('la entrada de perros existe aunque no haya ni un producto', () => {
    // La tienda enseña su estructura antes de tener género. Es lo que se pidió.
    expect(entradaDe('Perros')).toBeTruthy();
  });
});

describe('los animales sin jerarquía no se rompen', () => {
  it('gatos sigue construyéndose por el camino anterior', () => {
    /*
     * Sólo se ha migrado perros. Si el cambio hubiera roto el resto del menú,
     * la tienda perdería la navegación de gatos, aves, roedores y peces.
     */
    const gatos = entradaDe('Gatos', [productoDeGato()]);
    expect(gatos).toBeTruthy();
    expect(gatos!.total).toBe(1);
  });

  it('y un animal sin jerarquía NI productos sigue sin aparecer', () => {
    // Ahí la regla de la 2A no cambia: no hay estructura ni mercancía.
    expect(entradaDe('Gatos', [])).toBeUndefined();
  });
});
