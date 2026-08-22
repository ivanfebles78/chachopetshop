/**
 * EL ESTADO DEL CATÁLOGO VIVE EN LA URL.
 *
 * Que los filtros estén en la dirección no es una preferencia técnica: es lo
 * que permite compartir «pienso seco de perro por WhatsApp», guardarlo en
 * marcadores, recargar sin perderlo y deshacerlo con el botón de atrás. Estas
 * pruebas cuidan esa propiedad y el saneado de lo que llega de fuera.
 */

import { describe, it, expect } from 'vitest';
import {
  cuantosFiltros,
  filtrosDeParams,
  filtrosPuestos,
  migasDe,
  ordenValido,
  tituloDe,
} from './catalogo';
import type { Facetas } from './types';

const params = (qs: string) => new URLSearchParams(qs);

const FACETAS: Facetas = {
  animals: [
    { slug: 'perro', nombre: 'Perros', total: 15 },
    { slug: 'gato', nombre: 'Gatos', total: 12 },
  ],
  categories: [{ slug: 'alimentacion-seca', nombre: 'Alimentación seca', total: 13 }],
  needs: [{ slug: 'digestivo', nombre: 'Digestivo sensible', total: 6 }],
  brands: [{ slug: 'ownat', nombre: 'Ownat', total: 3 }],
  ofertas: 2,
  precio: { min: 1.35, max: 62.99 },
};

/* ══ 1. Leer la URL ════════════════════════════════════════════════════ */

describe('los filtros salen de la dirección', () => {
  it('lee todas las dimensiones', () => {
    const f = filtrosDeParams(params('animal=perro&category=alimentacion-seca&need=digestivo,dental&brand=ownat&q=pienso&oferta=1&sort=price_asc&page=2'));
    expect(f.animal).toBe('perro');
    expect(f.category).toBe('alimentacion-seca');
    expect(f.need).toEqual(['digestivo', 'dental']);
    expect(f.brand).toEqual(['ownat']);
    expect(f.q).toBe('pienso');
    expect(f.oferta).toBe(true);
    expect(f.sort).toBe('price_asc');
    expect(f.page).toBe(2);
  });

  it('sin filtro de precio NO manda ningún precio', () => {
    /*
     * REGRESIÓN, y de las que se ven al primer vistazo: `Number(null)` es 0, no
     * `NaN`. Escrito sin cortocircuito, un catálogo sin filtro de precio pedía
     * «entre 0 y 0 euros» y devolvía cero productos. La pantalla decía
     * literalmente «Perros — 0 productos» con quince en la tienda.
     */
    const f = filtrosDeParams(params('animal=perro'));
    expect(f.minPrice).toBeUndefined();
    expect(f.maxPrice).toBeUndefined();
  });

  it('un precio vacío tampoco cuenta', () => {
    const f = filtrosDeParams(params('minPrice=&maxPrice='));
    expect(f.minPrice).toBeUndefined();
    expect(f.maxPrice).toBeUndefined();
  });

  it('un precio de verdad sí', () => {
    const f = filtrosDeParams(params('minPrice=10&maxPrice=25.5'));
    expect(f.minPrice).toBe(10);
    expect(f.maxPrice).toBe(25.5);
  });
});

/* ══ 2. Lo que llega de fuera se sanea ═════════════════════════════════ */

describe('la basura de la URL no llega al servidor', () => {
  it('una página inventada vuelve a la primera', () => {
    for (const qs of ['page=-4', 'page=abc', 'page=0', 'page=1.5', 'page=']) {
      expect(filtrosDeParams(params(qs)).page, qs).toBe(1);
    }
  });

  it('un orden inventado vuelve a relevancia', () => {
    expect(ordenValido('DROP TABLE')).toBe('relevance');
    expect(ordenValido(null)).toBe('relevance');
    expect(ordenValido('price_asc')).toBe('price_asc');
  });

  it('un precio que no es número se ignora', () => {
    expect(filtrosDeParams(params('minPrice=abc')).minPrice).toBeUndefined();
    expect(filtrosDeParams(params('minPrice=-9')).minPrice).toBeUndefined();
  });

  it('las listas vacías o con huecos no ensucian', () => {
    expect(filtrosDeParams(params('need=,,')).need).toEqual([]);
    expect(filtrosDeParams(params('brand=ownat,,acana')).brand).toEqual(['ownat', 'acana']);
  });
});

/* ══ 3. Contar y describir lo que está puesto ══════════════════════════ */

describe('se ve qué se ha filtrado', () => {
  it('el orden y la página no son filtros', () => {
    expect(cuantosFiltros(filtrosDeParams(params('sort=price_asc&page=3')))).toBe(0);
  });

  it('cuenta cada uno, incluidos los múltiples', () => {
    const f = filtrosDeParams(params('animal=perro&need=digestivo,dental&brand=ownat&oferta=1'));
    expect(cuantosFiltros(f)).toBe(5);
  });

  it('cada filtro puesto sabe cómo se llama y cómo se quita', () => {
    const f = filtrosDeParams(params('animal=perro&brand=ownat&oferta=1'));
    const puestos = filtrosPuestos(f, FACETAS);
    expect(puestos.map((p) => p.etiqueta)).toEqual(['Perros', 'Ownat', 'En oferta']);
    // Los múltiples llevan valor para poder soltar SÓLO ese.
    expect(puestos.find((p) => p.clave === 'brand')?.valor).toBe('ownat');
  });

  it('si no hay recuentos todavía, usa el slug en vez de romperse', () => {
    const puestos = filtrosPuestos(filtrosDeParams(params('animal=perro')), undefined);
    expect(puestos[0]!.etiqueta).toBe('perro');
  });
});

/* ══ 4. El titular dice lo que se está viendo ══════════════════════════ */

describe('titular y migas', () => {
  it('sin filtros, toda la tienda', () => {
    expect(tituloDe(filtrosDeParams(params('')), FACETAS)).toBe('Toda la tienda');
  });

  it('combina categoría y animal', () => {
    /*
     * Antes ponía sólo «Perros», el mismo titular que ver los quince productos
     * de perro sin filtrar. Ni la persona ni un buscador podían distinguir una
     * página de la otra.
     */
    const f = filtrosDeParams(params('animal=perro&category=alimentacion-seca'));
    expect(tituloDe(f, FACETAS)).toBe('Alimentación seca para perros');
  });

  it('la búsqueda manda sobre el resto', () => {
    const f = filtrosDeParams(params('q=orijen&animal=perro'));
    expect(tituloDe(f, FACETAS)).toBe('Resultados para «orijen»');
  });

  it('las ofertas se nombran como tales', () => {
    expect(tituloDe(filtrosDeParams(params('oferta=1')), FACETAS)).toBe('Ofertas');
    expect(tituloDe(filtrosDeParams(params('oferta=1&animal=gato')), FACETAS)).toBe('Ofertas para gatos');
  });

  it('las migas llevan a sitios que existen y marcan dónde se está', () => {
    const f = filtrosDeParams(params('animal=perro&category=alimentacion-seca'));
    const migas = migasDe(f, tituloDe(f, FACETAS));
    expect(migas.map((m) => m.etiqueta)).toEqual(['Inicio', 'Tienda', 'perros', 'Alimentación seca para perros']);
    // La última es dónde se está: no se enlaza a sí misma.
    expect(migas[migas.length - 1]!.href).toBeUndefined();
    expect(migas[2]!.href).toBe('/tienda?animal=perro');
  });

  it('en la tienda sin filtrar no se repite «Tienda»', () => {
    const migas = migasDe(filtrosDeParams(params('')), 'Toda la tienda');
    expect(migas.map((m) => m.etiqueta)).toEqual(['Inicio', 'Tienda']);
  });
});
