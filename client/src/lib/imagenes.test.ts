/**
 * DE DÓNDE SALE LA IMAGEN DE UN PRODUCTO.
 *
 * El catálogo apunta a `picsum.photos`, que sirve una foto de archivo AL AZAR:
 * bosques, cascadas, paisajes. En una tienda de animales eso no es «provisional»,
 * es una imagen que dice algo falso — un saco de pienso ilustrado con una
 * cascada.
 *
 * Lo que se fija aquí:
 *
 *   1. Que la foto REAL siempre gane. Es lo único que importa el día que Ivan
 *      suba las suyas: tienen que entrar sin tocar código.
 *   2. Que una foto al azar nunca se presente como el producto — ni en la
 *      imagen ni, sobre todo, en el texto alternativo.
 *   3. Que la ilustración salga de la categoría REAL y no de una lista inventada.
 */

import { describe, it, expect } from 'vitest';
import {
  esImagenAleatoria,
  origenDeImagen,
  textoAlternativo,
  tipoDeProducto,
  tipoDeCategoria,
  DESCRIPCION_ARTE,
} from './imagenes';

const producto = (extra: Record<string, unknown> = {}) =>
  ({
    name: 'Orijen Original Dog',
    image: 'https://picsum.photos/seed/nutripet-orijen/800/800',
    categories: [{ id: 'c1', name: 'Alimentación seca', slug: 'alimentacion-seca', type: 'DRY_FOOD' }],
    ...extra,
  }) as never;

describe('reconocer una foto de archivo al azar', () => {
  it('picsum es la que tiene el catálogo hoy', () => {
    expect(esImagenAleatoria('https://picsum.photos/seed/nutripet-orijen/800/800')).toBe(true);
  });

  it('y sus primos', () => {
    for (const u of [
      'https://placekitten.com/800/800',
      'http://placeimg.com/800/800/any',
      'https://loremflickr.com/800/800',
    ]) {
      expect(esImagenAleatoria(u)).toBe(true);
    }
  });

  it('una imagen SIN url también cuenta como que no hay foto', () => {
    for (const u of ['', null, undefined, 0, {}]) expect(esImagenAleatoria(u)).toBe(true);
  });

  it('una URL de verdad NO se descarta', () => {
    for (const u of [
      'https://cdn.chachopetshop.com/orijen-original.webp',
      '/imagenes/productos/orijen.jpg',
      'https://res.cloudinary.com/chacho/orijen.jpg',
    ]) {
      expect(esImagenAleatoria(u)).toBe(false);
    }
  });
});

describe('qué se pinta', () => {
  it('LA FOTO REAL SIEMPRE GANA', () => {
    /*
     * Es la prueba que de verdad importa: el día que Ivan suba su fotografía,
     * tiene que entrar sin tocar una línea de código.
     */
    const p = producto({ image: 'https://cdn.chachopetshop.com/orijen.webp' });
    expect(origenDeImagen(p)).toEqual({
      clase: 'foto',
      src: 'https://cdn.chachopetshop.com/orijen.webp',
    });
  });

  it('sin foto, la ilustración de SU categoría', () => {
    expect(origenDeImagen(producto())).toEqual({ clase: 'ilustracion', tipo: 'DRY_FOOD' });
  });

  it('cada categoría del catálogo tiene su dibujo', () => {
    // Los nueve tipos que existen hoy en la base de datos.
    for (const tipo of [
      'DRY_FOOD', 'WET_FOOD', 'SNACKS', 'HYGIENE', 'ACCESSORIES',
      'SUPPLEMENTS', 'VET_DIET', 'BEDS', 'TRAVEL',
    ]) {
      const p = producto({ categories: [{ type: tipo }] });
      expect(origenDeImagen(p)).toEqual({ clase: 'ilustracion', tipo });
    }
  });

  it('una categoría desconocida NO rompe la tienda', () => {
    // El día que se añada una categoría nueva, cae en el dibujo genérico.
    expect(tipoDeProducto(producto({ categories: [{ type: 'CATEGORIA_DEL_FUTURO' }] }))).toBe('OTRO');
    expect(tipoDeProducto(producto({ categories: [] }))).toBe('OTRO');
    expect(tipoDeCategoria(undefined)).toBe('OTRO');
  });
});

describe('el texto alternativo no miente', () => {
  it('con foto real, describe el producto', () => {
    const p = producto({ image: 'https://cdn.chachopetshop.com/orijen.webp' });
    expect(textoAlternativo(p)).toBe('Orijen Original Dog');
  });

  it('CON ILUSTRACIÓN, NO dice el nombre del producto', () => {
    /*
     * Éste es el punto delicado de toda la fase para accesibilidad. Poner
     * «Orijen Original Dog» sobre un dibujo genérico le haría creer a quien usa
     * un lector de pantalla que está mirando ese saco concreto. Lo que hay es
     * un dibujo de la categoría, y eso es lo que se dice.
     *
     * El nombre no se pierde: lo lleva el enlace de al lado.
     */
    const alt = textoAlternativo(producto());
    expect(alt).not.toContain('Orijen');
    expect(alt).toBe('Ilustración de un saco de pienso');
  });

  it('y describe lo que se ve, no la categoría en jerga', () => {
    // Nada de «DRY_FOOD» ni de nombres internos en lo que se lee en voz alta.
    for (const d of Object.values(DESCRIPCION_ARTE)) {
      expect(d).toMatch(/^Ilustración de /);
      expect(d).not.toMatch(/[A-Z]{3,}_/);
    }
  });

  it('ninguna descripción promete una fotografía', () => {
    for (const d of Object.values(DESCRIPCION_ARTE)) {
      expect(d.toLowerCase()).not.toMatch(/foto|imagen del producto/);
    }
  });
});

describe('no se inventa nada del producto', () => {
  it('la ilustración depende de la CATEGORÍA, nunca de la marca ni del nombre', () => {
    /*
     * Si el dibujo se eligiera por el nombre, «Royal Canin Sterilised» acabaría
     * con un dibujo distinto que «Royal Canin Maxi Adult» por casualidad, y dos
     * productos de la misma categoría se verían distintos sin motivo.
     */
    const a = producto({ name: 'Royal Canin Sterilised 37', categories: [{ type: 'DRY_FOOD' }] });
    const b = producto({ name: 'Acana Pacifica Dog', categories: [{ type: 'DRY_FOOD' }] });
    expect(origenDeImagen(a)).toEqual(origenDeImagen(b));
  });
});
