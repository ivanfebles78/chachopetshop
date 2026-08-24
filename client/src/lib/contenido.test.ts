/**
 * EL CONTENIDO ENRIQUECIDO DE UNA FICHA.
 *
 * `Product.contenido` es una columna JSON, así que el servidor no valida su
 * forma. La frontera está aquí: lo que entra es un `unknown` de la base de
 * datos y lo que sale tiene forma conocida o es `null` — nunca a medias.
 *
 * La prueba que más importa de todo el fichero es la de la tabla de raciones
 * descuadrada. Una fila con menos valores que pesos desplazaría las cifras una
 * columna y le diría a alguien que a un perro de 40 kg le tocan los gramos de
 * uno de 30. Eso no es un fallo de maquetación: es dar mal de comer a un animal.
 */

import { describe, it, expect } from 'vitest';
import { leerContenido } from './contenido';
import { esEan13 } from './producto';

const raciones = {
  unidad: 'g',
  pesos: [2, 5, 10],
  filas: [
    { tipo: 'Average', valores: [50, 99, 167] },
    { tipo: 'Senior', valores: [43, 86, 144] },
  ],
};

describe('leer el contenido', () => {
  it('no hay contenido: no se pinta nada', () => {
    for (const v of [null, undefined, '', 0, [], 'texto']) {
      expect(leerContenido(v)).toBeNull();
    }
  });

  it('un objeto vacío tampoco cuenta como contenido', () => {
    expect(leerContenido({})).toBeNull();
  });

  it('lee lo que hay y omite lo que no', () => {
    const c = leerContenido({ composicion: '45% carne de pato fresca' })!;
    expect(c.composicion).toBe('45% carne de pato fresca');
    expect(c.analitica).toBeUndefined();
    expect(c.raciones).toBeUndefined();
  });

  it('descarta las cadenas vacías, que dejarían títulos huérfanos', () => {
    const c = leerContenido({ composicion: '   ', descripcion: ['', '  '] });
    expect(c).toBeNull();
  });

  it('la analítica necesita nombre Y valor', () => {
    const c = leerContenido({
      analitica: [
        { nombre: 'Proteína bruta', valor: '31,5 %' },
        { nombre: 'Fibra bruta' }, // sin valor: fuera
        { valor: '8 %' }, // sin nombre: fuera
      ],
    })!;
    expect(c.analitica).toEqual([{ nombre: 'Proteína bruta', valor: '31,5 %' }]);
  });

  it('conserva los valores TAL CUAL, con su coma y su símbolo', () => {
    // Es una etiqueta de producto: «31,5 %» no es «31.5».
    const c = leerContenido({ analitica: [{ nombre: 'Proteína bruta', valor: '31,5 %' }] })!;
    expect(c.analitica![0]!.valor).toBe('31,5 %');
  });
});

describe('la tabla de raciones', () => {
  it('se lee entera cuando cuadra', () => {
    const c = leerContenido({ raciones })!;
    expect(c.raciones!.pesos).toEqual([2, 5, 10]);
    expect(c.raciones!.filas).toHaveLength(2);
    expect(c.raciones!.filas[0]!.valores).toEqual([50, 99, 167]);
  });

  it('UNA FILA DESCUADRADA SE DESCARTA, no se pinta corta', () => {
    /*
     * Si «Senior» trae dos valores y hay tres pesos, pintarla desplazaría las
     * cifras: el valor de 5 kg aparecería bajo la columna de 10 kg.
     */
    const c = leerContenido({
      raciones: {
        ...raciones,
        filas: [
          { tipo: 'Average', valores: [50, 99, 167] },
          { tipo: 'Senior', valores: [43, 86] },
        ],
      },
    })!;
    expect(c.raciones!.filas.map((f) => f.tipo)).toEqual(['Average']);
  });

  it('si NINGUNA fila cuadra, no hay tabla', () => {
    const c = leerContenido({
      raciones: { ...raciones, filas: [{ tipo: 'Average', valores: [50] }] },
    });
    expect(c).toBeNull();
  });

  it('sin pesos no hay tabla que pintar', () => {
    expect(leerContenido({ raciones: { unidad: 'g', pesos: [], filas: raciones.filas } })).toBeNull();
  });

  it('descarta valores que no son números', () => {
    const c = leerContenido({
      raciones: { ...raciones, filas: [{ tipo: 'Average', valores: [50, '99', 167] }] },
    });
    // Al caerse el «99» la fila deja de cuadrar, y con ella la tabla.
    expect(c).toBeNull();
  });

  it('la unidad por defecto es el gramo, que es lo que trae la documentación', () => {
    const c = leerContenido({ raciones: { pesos: [2], filas: [{ tipo: 'A', valores: [50] }] } })!;
    expect(c.raciones!.unidad).toBe('g');
  });
});

describe('el SKU como código de barras', () => {
  it('el de Alpha Spirit es un EAN-13 válido', () => {
    // 13 dígitos, dígito de control correcto y prefijo GS1 español (84).
    expect(esEan13('8436586310301')).toBe(true);
  });

  it('un SKU interno NO se publica como GTIN', () => {
    /*
     * Los del catálogo de demostración son códigos internos. Declararlos como
     * GTIN sería entregarle a Google un código de barras que no existe.
     */
    for (const s of ['ROY-STE-2', 'ORI-ORI-12', 'ALPHA-TOO-DUCK-3KG']) {
      expect(esEan13(s)).toBe(false);
    }
  });

  it('trece dígitos NO bastan: el dígito de control tiene que cuadrar', () => {
    // Mismo código con el último dígito cambiado.
    expect(esEan13('8436586310302')).toBe(false);
    expect(esEan13('1234567890123')).toBe(false);
  });

  it('ni doce ni catorce dígitos', () => {
    expect(esEan13('843658631030')).toBe(false);
    expect(esEan13('84365863103011')).toBe(false);
    expect(esEan13(undefined)).toBe(false);
  });
});
