/**
 * LA ZONA DE ENTREGA, EN EL CLIENTE.
 *
 * La garantía de que no se venda fuera de Canarias está en el servidor y tiene
 * sus propias pruebas en `server/tests/zona-envio.test.ts`. Lo que se comprueba
 * AQUÍ es distinto y también importa: que el formulario avise antes de pedir la
 * tarjeta, y —sobre todo— que las dos comprobaciones no se hayan separado.
 *
 * Ese último caso es el que muerde. Si el cliente creyera que 07001 es válido y
 * el servidor no, alguien rellenaría toda la dirección para llevarse un error
 * genérico al final. Y si fuese al revés, la tienda rechazaría clientes que sí
 * puede servir.
 */

import { describe, it, expect } from 'vitest';
import { esCodigoPostalEnZona, ENVIO_POR_DEFECTO } from './useEnvio';

// El fichero del servidor, leído como texto. Se importa así y no con `node:fs`
// porque `tsc` no tiene los tipos de Node en el proyecto del cliente.
import fuenteDelServidor from '../../../server/src/lib/envio.ts?raw';

const ENVIO = ENVIO_POR_DEFECTO;

describe('el formulario sabe a dónde se entrega', () => {
  it('acepta Las Palmas (35xxx)', () => {
    for (const cp of ['35001', '35010', '35500', '35660']) {
      expect(esCodigoPostalEnZona(cp, ENVIO)).toBe(true);
    }
  });

  it('acepta Santa Cruz de Tenerife (38xxx)', () => {
    for (const cp of ['38001', '38201', '38400', '38900']) {
      expect(esCodigoPostalEnZona(cp, ENVIO)).toBe(true);
    }
  });

  it('rechaza la Península', () => {
    for (const cp of ['28001', '08001', '41001', '46001', '15001']) {
      expect(esCodigoPostalEnZona(cp, ENVIO)).toBe(false);
    }
  });

  it('rechaza Baleares, Ceuta y Melilla', () => {
    for (const cp of ['07001', '07800', '51001', '52001']) {
      expect(esCodigoPostalEnZona(cp, ENVIO)).toBe(false);
    }
  });

  it('rechaza los prefijos vecinos', () => {
    for (const cp of ['34001', '36001', '37001', '39001']) {
      expect(esCodigoPostalEnZona(cp, ENVIO)).toBe(false);
    }
  });

  it('rechaza lo malformado', () => {
    for (const cp of ['', '   ', '3520', '352011', '35', '35abc', 'abcde', '35-201', 'ES-35001']) {
      expect(esCodigoPostalEnZona(cp, ENVIO)).toBe(false);
    }
  });

  it('tolera los espacios que la gente escribe o pega', () => {
    for (const cp of [' 35001', '38201 ', '  38201  ', '35 001']) {
      expect(esCodigoPostalEnZona(cp, ENVIO)).toBe(true);
    }
  });

  it('usa los prefijos que le den, no unos escritos a mano', () => {
    /*
     * Los prefijos vienen de `/api/config`. El día que Ivan añada la Península,
     * cambia el servidor y el formulario se entera solo — sin tocar esto.
     */
    const conPeninsula = { ...ENVIO, prefijosCp: ['35', '38', '28'] };
    expect(esCodigoPostalEnZona('28001', conPeninsula)).toBe(true);
    expect(esCodigoPostalEnZona('28001', ENVIO)).toBe(false);

    const sinNinguno = { ...ENVIO, prefijosCp: [] };
    expect(esCodigoPostalEnZona('35001', sinNinguno)).toBe(false);
  });
});

/* ══ El espejo: cliente y servidor no pueden separarse ═════════════════════ */

describe('los valores por defecto son los mismos que los del servidor', () => {
  /*
   * Mientras `/api/config` no ha respondido, el cliente usa estos valores. Si
   * dejaran de coincidir con los del servidor, la tienda anunciaría una cosa
   * durante el primer segundo de cada visita y cobraría otra.
   *
   * Se lee el fichero del servidor de verdad. Un comentario diciendo «hay que
   * mantenerlos iguales» no impide nada; esto sí.
   */
  const numero = (nombre: string) => {
    const m = fuenteDelServidor.match(new RegExp(nombre + ':\\s*([\\d.]+)'));
    return m ? Number(m[1]) : null;
  };
  const cadena = (nombre: string) => {
    const m = fuenteDelServidor.match(new RegExp(nombre + ":\\s*'([^']*)'"));
    return m ? m[1] : null;
  };

  it('el umbral de envío gratis', () => {
    expect(numero('GRATIS_DESDE')).toBe(ENVIO_POR_DEFECTO.gratisDesde);
  });

  it('la tarifa', () => {
    expect(numero('TARIFA')).toBe(ENVIO_POR_DEFECTO.tarifa);
  });

  it('la zona y el plazo', () => {
    expect(cadena('ZONA')).toBe(ENVIO_POR_DEFECTO.zona);
    expect(cadena('PLAZO')).toBe(ENVIO_POR_DEFECTO.plazo);
  });

  it('el mensaje de fuera de zona, palabra por palabra', () => {
    const m = fuenteDelServidor.match(/FUERA_DE_ZONA = '([^']*)'/);
    expect(m?.[1]).toBe(ENVIO_POR_DEFECTO.fueraDeZona);
  });

  it('los prefijos de código postal', () => {
    const m = fuenteDelServidor.match(/PREFIJOS: \[([^\]]*)\]/);
    const delServidor = (m?.[1] ?? '').match(/'(\d+)'/g)?.map((s) => s.replace(/'/g, '')) ?? [];
    expect(delServidor).toEqual(ENVIO_POR_DEFECTO.prefijosCp);
  });

  it('y la lectura del fichero funciona de verdad', () => {
    // Sin esto, un fichero vacío o mal resuelto dejaría los espejos en verde
    // comparando `null` con `null`.
    expect(fuenteDelServidor).toContain('esCodigoPostalDeCanarias');
    expect(numero('GRATIS_DESDE')).not.toBeNull();
  });
});
