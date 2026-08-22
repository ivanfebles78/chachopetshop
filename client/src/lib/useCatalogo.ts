import { useEffect, useState } from 'react';
import { api } from './api';
import type { Product, Taxonomy } from './types';

/**
 * EL CATÁLOGO, PEDIDO UNA VEZ POR SESIÓN DE NAVEGADOR.
 *
 * La cabecera lo necesita para construir el menú y la portada para saber qué
 * enseñar. Sin un sitio común serían dos peticiones idénticas en cada carga.
 *
 * DEUDA CONOCIDA, con umbral. Los recuentos se calculan pidiendo el catálogo
 * entero, porque la API no ofrece agregados por faceta. Con 28 productos es una
 * petición pequeña; el límite de página del servidor es 48, así que a partir de
 * ahí los recuentos empezarían a quedarse cortos EN SILENCIO —la peor forma de
 * fallar—. El aviso de abajo lo dice en desarrollo antes de que pase.
 */

export const TAMANO_PAGINA = 48;

export type Catalogo = {
  taxonomy: Taxonomy | null;
  productos: Product[];
  /** Cuántos hay de verdad, aunque no se hayan leído todos. */
  total: number;
  cargando: boolean;
};

const VACIO: Catalogo = { taxonomy: null, productos: [], total: 0, cargando: true };

let cache: Catalogo | null = null;
let enVuelo: Promise<Catalogo> | null = null;

async function cargar(): Promise<Catalogo> {
  const [taxonomy, lista] = await Promise.all([
    api.taxonomy(),
    api.products({ pageSize: TAMANO_PAGINA }),
  ]);

  if (import.meta.env.DEV && lista.total > lista.items.length) {
    console.warn(
      `[catálogo] Hay ${lista.total} productos y sólo se han leído ${lista.items.length}. ` +
        'Los recuentos del menú y de la portada se están quedando cortos: hace falta que ' +
        'el servidor devuelva agregados por faceta.',
    );
  }

  return { taxonomy, productos: lista.items, total: lista.total, cargando: false };
}

export function useCatalogo(): Catalogo {
  const [estado, setEstado] = useState<Catalogo>(cache ?? VACIO);

  useEffect(() => {
    if (cache) return;
    let vivo = true;
    enVuelo ??= cargar();
    enVuelo
      .then((c) => {
        cache = c;
        if (vivo) setEstado(c);
      })
      .catch(() => {
        /*
         * Si el catálogo no carga, la cabecera se queda con el logotipo, el
         * buscador, la cuenta y el carrito, y la portada con su texto. Se puede
         * seguir navegando: un fallo de datos no debe tumbar la página entera.
         */
        enVuelo = null;
        if (vivo) setEstado({ ...VACIO, cargando: false });
      });
    return () => {
      vivo = false;
    };
  }, []);

  return estado;
}

/** Sólo para las pruebas: el caché vive en el módulo y sobrevive entre ellas. */
export function _resetCacheCatalogo() {
  cache = null;
  enVuelo = null;
}
