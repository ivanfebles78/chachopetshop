import { useEffect, useState } from 'react';
import { api } from './api';
import type { Facetas, Product, Taxonomy } from './types';

/**
 * EL CATÁLOGO, PEDIDO UNA VEZ POR SESIÓN DE NAVEGADOR.
 *
 * La cabecera lo necesita para construir el menú y la portada para saber qué
 * enseñar. Sin un sitio común serían dos peticiones idénticas en cada carga.
 *
 * Los RECUENTOS (portada) salen de las FACETAS que devuelve el servidor
 * (`?facets=1`), no de contar la muestra de productos: con miles de artículos,
 * contar sobre la primera página daba cifras falsas y minúsculas. La muestra de
 * productos se sigue trayendo sólo para las TARJETAS (selección y ofertas).
 */

export const TAMANO_PAGINA = 48;

export type Catalogo = {
  taxonomy: Taxonomy | null;
  productos: Product[];
  /** Recuentos reales por faceta (para la portada y sus cifras). */
  facets: Facetas | null;
  /** Cuántos hay de verdad, aunque no se hayan leído todos. */
  total: number;
  cargando: boolean;
};

const VACIO: Catalogo = { taxonomy: null, productos: [], facets: null, total: 0, cargando: true };

let cache: Catalogo | null = null;
let enVuelo: Promise<Catalogo> | null = null;

async function cargar(): Promise<Catalogo> {
  const [taxonomy, lista] = await Promise.all([
    api.taxonomy(),
    api.products({ pageSize: TAMANO_PAGINA, facets: true }),
  ]);

  return { taxonomy, productos: lista.items, facets: lista.facets ?? null, total: lista.total, cargando: false };
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
