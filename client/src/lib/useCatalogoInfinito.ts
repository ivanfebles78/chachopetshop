import { useCallback, useEffect, useState } from 'react';
import { api, type ProductFilters } from './api';
import type { Facetas, Product } from './types';

/**
 * EL CATÁLOGO SE CARGA POR SCROLL, NO POR PÁGINAS.
 *
 * Ivan no quiere paginación: quiere ver todo el catálogo y que se vaya cargando
 * al bajar. Pero traer 2.500 productos de golpe sería una página lentísima y una
 * respuesta enorme, así que por dentro se sigue pidiendo al servidor de página
 * en página —lo que cambia es que las páginas se ACUMULAN y se piden solas
 * cuando el final de la lista entra en pantalla, en vez de con botones de «1 2
 * 3».
 *
 * Reglas:
 *   · Al cambiar los filtros (cambia `clave`), se empieza de cero por la página
 *     1 y se piden las facetas (los recuentos del panel).
 *   · Las páginas siguientes NO piden facetas: no cambian, y pedirlas otra vez
 *     sería trabajo tirado.
 *   · Un fallo al cargar más es silencioso: el observador de scroll lo reintenta
 *     al volver a asomar el final. El fallo de la PRIMERA carga sí se enseña.
 */
export function useCatalogoInfinito(filtros: ProductFilters, clave: string) {
  const [items, setItems] = useState<Product[]>([]);
  const [facets, setFacets] = useState<Facetas | undefined>();
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true); // primera carga (o cambio de filtros)
  const [cargandoMas, setCargandoMas] = useState(false); // páginas siguientes
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    setError(null);
    api
      .products({ ...filtros, page: 1 })
      .then((d) => {
        if (!vivo) return;
        setItems(d.items);
        setFacets(d.facets);
        setTotal(d.total);
        setTotalPages(d.totalPages);
        setPagina(1);
      })
      .catch((e: Error) => vivo && setError(e.message))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, nonce]);

  const hayMas = pagina < totalPages;

  const cargarMas = useCallback(() => {
    if (cargando || cargandoMas || !hayMas) return;
    const siguiente = pagina + 1;
    setCargandoMas(true);
    api
      .products({ ...filtros, page: siguiente, facets: false })
      .then((d) => {
        setItems((prev) => [...prev, ...d.items]);
        setPagina(siguiente);
      })
      .catch(() => {
        /* silencioso: el observador reintenta al reasomar el final */
      })
      .finally(() => setCargandoMas(false));
  }, [cargando, cargandoMas, hayMas, pagina, filtros]);

  return { items, facets, total, cargando, cargandoMas, error, hayMas, refetch, cargarMas };
}
