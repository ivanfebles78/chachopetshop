/**
 * LO QUE EL MENÚ PROMETE, EL CATÁLOGO LO TIENE QUE CUMPLIR.
 *
 * Este fallo estuvo vivo en producción toda la Fase 2A y parte de la 2B, y es
 * instructivo por qué: se comprobó la API —que filtraba bien— y se comprobó que
 * el enlace existía, pero nadie comprobó el TRAMO DE EN MEDIO. `ProductFilters`
 * no tenía `oferta`, así que la página se comía el parámetro y pedía el
 * catálogo entero.
 *
 * Resultado: «Ofertas» prometía rebajas y entregaba los 28 productos. Con dos
 * rebajados de verdad, eso son 26 promesas incumplidas por visita.
 *
 * La moraleja está en la prueba: el contrato es la CONSULTA que sale hacia el
 * servidor, no las piezas por separado.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, type ProductFilters } from './api';
import { rutaCatalogo } from './navigation';

/** Se intercepta `fetch` para leer exactamente qué URL se pide. */
function espiarPeticiones() {
  const urls: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (u: RequestInfo | URL) => {
    urls.push(String(u));
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ items: [], page: 1, pageSize: 24, total: 0, totalPages: 0 }),
    } as unknown as Response;
  }));
  return urls;
}

beforeEach(() => vi.unstubAllGlobals());

describe('el filtro de ofertas llega hasta el servidor', () => {
  it('`oferta` viaja en la consulta', async () => {
    const urls = espiarPeticiones();
    await api.products({ oferta: true });
    expect(urls[0]).toMatch(/[?&]oferta=1(&|$)/);
  });

  it('sin `oferta` no se cuela sola', async () => {
    const urls = espiarPeticiones();
    await api.products({ animal: 'perro' });
    expect(urls[0]).not.toMatch(/oferta/);
  });

  it('se combina con el resto de filtros, no los sustituye', async () => {
    const urls = espiarPeticiones();
    await api.products({ oferta: true, animal: 'perro', sort: 'price_asc' });
    expect(urls[0]).toMatch(/oferta=1/);
    expect(urls[0]).toMatch(/animal=perro/);
    expect(urls[0]).toMatch(/sort=price_asc/);
  });

  it('el destino que pinta el menú es el que el catálogo sabe leer', async () => {
    /*
     * El cierre del círculo: se coge la ruta TAL CUAL la genera la navegación,
     * se leen sus parámetros como hace la página, y se comprueba que lo que
     * sale hacia el servidor sigue llevando el filtro.
     */
    const href = rutaCatalogo({ oferta: '1' });
    const params = new URLSearchParams(href.split('?')[1]);

    const filtros: ProductFilters = {
      animal: params.get('animal') ?? undefined,
      category: params.get('category') ?? undefined,
      oferta: params.get('oferta') === '1' || undefined,
    };
    expect(filtros.oferta).toBe(true);

    const urls = espiarPeticiones();
    await api.products(filtros);
    expect(urls[0]).toMatch(/oferta=1/);
  });
});
