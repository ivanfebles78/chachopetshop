import { useEffect } from 'react';

/**
 * METADATOS DE PÁGINA, SIN META-FRAMEWORK.
 *
 * Todas las pantallas compartían el mismo título —«Chacho Pet Shop · Nutrición
 * premium para tu mascota»— y la misma descripción, la del `index.html`. Para
 * un buscador eso son veintiocho fichas de producto y diez categorías que se
 * llaman todas igual; y para quien tiene ocho pestañas abiertas, ocho pestañas
 * idénticas.
 *
 * Esto no es un CMS ni pretende serlo: es una aplicación de una sola página, y
 * lo que se escribe aquí lo escribe el navegador después de ejecutar el
 * JavaScript. Google renderiza y lo ve; otros rastreadores no. Cuando haga
 * falta de verdad, la solución es renderizar en el servidor — y queda anotado
 * en el informe, no disimulado.
 */

const SUFIJO = 'Chacho Pet Shop';

function etiqueta(selector: string, crear: () => HTMLElement): HTMLElement {
  const existente = document.head.querySelector<HTMLElement>(selector);
  if (existente) return existente;
  const nueva = crear();
  document.head.appendChild(nueva);
  return nueva;
}

function meta(nombre: string, contenido: string) {
  const el = etiqueta(`meta[name="${nombre}"]`, () => {
    const m = document.createElement('meta');
    m.setAttribute('name', nombre);
    return m;
  });
  el.setAttribute('content', contenido);
}

function canonica(url: string) {
  const el = etiqueta('link[rel="canonical"]', () => {
    const l = document.createElement('link');
    l.setAttribute('rel', 'canonical');
    return l;
  });
  el.setAttribute('href', url);
}

/**
 * La URL canónica de una página de catálogo.
 *
 * Se conservan los filtros —cada combinación es contenido distinto de verdad— y
 * la página. Se QUITA el orden: «pienso de perro por precio ascendente» y
 * «pienso de perro por novedades» son exactamente los mismos productos puestos
 * en otro orden, y anunciarlas como dos páginas es pedir que se repartan el
 * peso entre ellas.
 *
 * Los parámetros salen ordenados para que la misma selección dé siempre la
 * misma canónica, se hayan pulsado los filtros en el orden que se hayan pulsado.
 */
export function canonicaDeCatalogo(origen: string, ruta: string, params: URLSearchParams): string {
  const limpio = new URLSearchParams();
  for (const clave of [...params.keys()].sort()) {
    if (clave === 'sort') continue;
    if (clave === 'page' && params.get('page') === '1') continue;
    const v = params.get(clave);
    if (v) limpio.set(clave, v);
  }
  const qs = limpio.toString();
  return `${origen}${ruta}${qs ? `?${qs}` : ''}`;
}

export type Seo = {
  titulo: string;
  descripcion?: string;
  /** Ruta canónica ya construida, incluido el origen. */
  canonica?: string;
  /** Datos estructurados. Se serializan tal cual: han de ser CIERTOS. */
  estructurado?: Record<string, unknown> | null;
  /** Para páginas que no deben indexarse (resultados de búsqueda). */
  noIndexar?: boolean;
};

export function useSeo({ titulo, descripcion, canonica: url, estructurado, noIndexar }: Seo) {
  useEffect(() => {
    document.title = titulo.includes(SUFIJO) ? titulo : `${titulo} · ${SUFIJO}`;
    if (descripcion) meta('description', descripcion);
    if (url) canonica(url);
    meta('robots', noIndexar ? 'noindex, follow' : 'index, follow');

    /*
     * Los datos estructurados se reemplazan enteros en cada navegación. Si no,
     * al pasar de una ficha a otra quedarían los dos bloques y un buscador leería
     * el precio del producto anterior.
     */
    const anterior = document.getElementById('datos-estructurados');
    if (anterior) anterior.remove();
    if (estructurado) {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.id = 'datos-estructurados';
      s.textContent = JSON.stringify(estructurado);
      document.head.appendChild(s);
    }
  }, [titulo, descripcion, url, estructurado, noIndexar]);
}
