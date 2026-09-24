import { useEffect, useState } from 'react';
import { api } from './api';
import { menuAEntradas, type EntradaNav } from './navigation';
import type { MenuAnimal } from './types';

/**
 * El menú de la cabecera, pedido una vez por sesión de navegador.
 *
 * El árbol categoría → marca → línea lo calcula el servidor sobre TODO el
 * catálogo (`/api/taxonomy/menu`); aquí sólo se le da forma con `menuAEntradas`,
 * que es pura y se prueba aparte. Se cachea en el módulo para no repetir la
 * petición en cada montaje de la cabecera.
 */

let cache: EntradaNav[] | null = null;
let enVuelo: Promise<MenuAnimal[]> | null = null;

export function useNavegacion(): EntradaNav[] {
  const [entradas, setEntradas] = useState<EntradaNav[]>(cache ?? []);

  useEffect(() => {
    if (cache) return;
    let vivo = true;
    enVuelo ??= api.menu().then((r) => r.animales);
    enVuelo
      .then((animales) => {
        cache = menuAEntradas(animales);
        if (vivo) setEntradas(cache);
      })
      .catch(() => {
        /* Si el menú no carga, la cabecera se queda con logo, buscador, cuenta y
           carrito: se puede seguir navegando. Un fallo de datos no tumba la web. */
        enVuelo = null;
        if (vivo) setEntradas([]);
      });
    return () => {
      vivo = false;
    };
  }, []);

  return entradas;
}

/** Sólo para las pruebas: el caché vive en el módulo y sobrevive entre ellas. */
export function _resetCacheNavegacion() {
  cache = null;
  enVuelo = null;
}
