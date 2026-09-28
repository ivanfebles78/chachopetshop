import { useEffect, useState } from 'react';
import { api } from './api';
import type { MenuAnimal } from './types';

/**
 * El árbol del menú de cabecera —categoría → marca → línea, por animal—, pedido
 * una vez por sesión de navegador a `/api/taxonomy/menu`.
 *
 * Se devuelve tal cual lo da el servidor; darle forma de acordeón es cosa del
 * componente que lo pinta (`MenuArbol`). Se cachea en el módulo para no repetir
 * la petición en cada montaje de la cabecera.
 */

let cache: MenuAnimal[] | null = null;
let enVuelo: Promise<MenuAnimal[]> | null = null;

export function useNavegacion(): MenuAnimal[] {
  const [animales, setAnimales] = useState<MenuAnimal[]>(cache ?? []);

  useEffect(() => {
    if (cache) return;
    let vivo = true;
    enVuelo ??= api.menu().then((r) => r.animales);
    enVuelo
      .then((datos) => {
        cache = datos;
        if (vivo) setAnimales(datos);
      })
      .catch(() => {
        /* Si el menú no carga, la cabecera se queda con logo, buscador, cuenta y
           carrito: se puede seguir navegando. Un fallo de datos no tumba la web. */
        enVuelo = null;
        if (vivo) setAnimales([]);
      });
    return () => {
      vivo = false;
    };
  }, []);

  return animales;
}

/** Sólo para las pruebas: el caché vive en el módulo y sobrevive entre ellas. */
export function _resetCacheNavegacion() {
  cache = null;
  enVuelo = null;
}
