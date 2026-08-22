import { useMemo } from 'react';
import { construirNavegacion, type EntradaNav } from './navigation';
import { useCatalogo, _resetCacheCatalogo } from './useCatalogo';

/**
 * El menú de la cabecera, construido desde el catálogo real.
 *
 * La lógica está en `navigation.ts`, que son funciones puras y se prueban sin
 * React ni servidor. Aquí sólo se conectan a los datos.
 */
export function useNavegacion(): EntradaNav[] {
  const { taxonomy, productos } = useCatalogo();
  return useMemo(
    () => (taxonomy ? construirNavegacion(taxonomy, productos) : []),
    [taxonomy, productos],
  );
}

/** Sólo para las pruebas. */
export const _resetCacheNavegacion = _resetCacheCatalogo;
