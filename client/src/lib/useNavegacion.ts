import { useEffect, useState } from 'react';
import { api } from './api';
import { construirNavegacion, type EntradaNav } from './navigation';

/**
 * Carga el menú una sola vez por sesión de navegador.
 *
 * La cabecera se pinta en todas las pantallas, así que esto no puede ser una
 * petición por página. Se guarda en memoria del módulo: es un menú, no datos de
 * usuario, y sobrevive a los cambios de ruta sin volver a pedirse.
 *
 * DEUDA CONOCIDA, con umbral. Los recuentos se calculan pidiendo el catálogo
 * entero, porque la API no ofrece agregados por faceta. Con 28 productos es una
 * petición pequeña; el límite de página del servidor es 48, así que a partir de
 * ahí los recuentos empezarían a quedarse cortos EN SILENCIO — que es la peor
 * forma de fallar.
 *
 * Cuando el catálogo se acerque a esa cifra hay que añadir recuentos por faceta
 * al servidor. Mientras tanto, la comprobación de abajo avisa en consola en
 * desarrollo en lugar de esperar a que alguien lo note.
 */

const TAMANO_PAGINA = 48;

let cache: EntradaNav[] | null = null;
let enVuelo: Promise<EntradaNav[]> | null = null;

async function cargar(): Promise<EntradaNav[]> {
  const [tax, lista] = await Promise.all([
    api.taxonomy(),
    api.products({ pageSize: TAMANO_PAGINA }),
  ]);

  if (import.meta.env.DEV && lista.total > lista.items.length) {
    console.warn(
      `[navegación] El catálogo tiene ${lista.total} productos y sólo se han leído ${lista.items.length}. ` +
        'Los recuentos del menú se están quedando cortos: hace falta que el servidor devuelva agregados por faceta.',
    );
  }

  return construirNavegacion(tax, lista.items);
}

export function useNavegacion(): EntradaNav[] {
  const [entradas, setEntradas] = useState<EntradaNav[]>(cache ?? []);

  useEffect(() => {
    if (cache) return;
    let vivo = true;
    enVuelo ??= cargar();
    enVuelo
      .then((menu) => {
        cache = menu;
        if (vivo) setEntradas(menu);
      })
      .catch(() => {
        /*
         * Si el menú no carga, la cabecera se queda con el logotipo, el
         * buscador, la cuenta y el carrito. Se puede seguir comprando. Un menú
         * incompleto no debe tumbar la navegación entera.
         */
        enVuelo = null;
      });
    return () => {
      vivo = false;
    };
  }, []);

  return entradas;
}

/** Sólo para pruebas: vacía la caché entre casos. */
export function _resetCacheNavegacion() {
  cache = null;
  enVuelo = null;
}
