import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, PackageOpen, SearchX, SlidersHorizontal, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import {
  ORDENES,
  cuantosFiltros,
  filtrosDeParams,
  filtrosPuestos,
  migasDe,
  tituloDe,
} from '@/lib/catalogo';
import { canonicaDeCatalogo, useSeo } from '@/lib/useSeo';
import { useOverlay } from '@/lib/useOverlay';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';
import { ErrorState } from '@/components/ErrorState';
import { Filtros } from '@/components/catalogo/Filtros';

/**
 * CATÁLOGO.
 *
 * Lo que cambia en la Fase 2C, y por qué:
 *
 *   · LOS FILTROS SALEN DE LOS RECUENTOS REALES. Ofrecía «Reptiles» y
 *     «Semihúmeda», las dos con cero productos, desde antes de la 2A: allí se
 *     arregló el menú y este panel se quedó igual. Ahora una opción sin
 *     producto no se pinta, y las que sí llevan su número al lado.
 *
 *   · SE VE POR QUÉ SE ESTÁ VIENDO ESTO. Fichas con los filtros puestos, que se
 *     sueltan de una en una. Antes sólo había un «Limpiar todo»: para quitar
 *     una marca de tres había que empezar de cero.
 *
 *   · EL CAJÓN DEL MÓVIL ES UN DIÁLOGO DE VERDAD. Antes no se anunciaba como
 *     tal, no atrapaba el foco y no se cerraba con Escape.
 *
 *   · LA PÁGINA TIENE NOMBRE PROPIO. Título, descripción y canónica según los
 *     filtros. Todas las pantallas compartían el mismo título.
 */
export function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const [cajonAbierto, setCajonAbierto] = useState(false);

  const filtros = useMemo(() => filtrosDeParams(params), [params]);
  const { data, loading, error, refetch } = useFetch(() => api.products(filtros), [params.toString()]);

  const facetas = data?.facets;
  const titulo = tituloDe(filtros, facetas);
  const puestos = filtrosPuestos(filtros, facetas);
  const nFiltros = cuantosFiltros(filtros);
  const migas = migasDe(filtros, titulo);

  useSeo({
    titulo,
    descripcion:
      data && facetas
        ? `${data.total} ${data.total === 1 ? 'producto' : 'productos'} de ${titulo.toLowerCase()} en Chacho Pet Shop. Envío en 24-48 h a toda Canarias.`
        : undefined,
    canonica: canonicaDeCatalogo(window.location.origin, '/tienda', params),
    // Los resultados de búsqueda son infinitos y distintos para cada persona:
    // no son páginas que un buscador deba tener en su índice.
    noIndexar: Boolean(filtros.q),
  });

  const poner = (clave: string, valor: string | null) => {
    const siguiente = new URLSearchParams(params);
    if (valor === null || valor === '') siguiente.delete(clave);
    else siguiente.set(clave, valor);
    // Cambiar un filtro devuelve a la primera página: si no, se puede acabar
    // en la página 3 de un resultado que ahora tiene una.
    if (clave !== 'page') siguiente.delete('page');
    setParams(siguiente);
  };

  const alternar = (clave: 'need' | 'brand', slug: string) => {
    const actuales = (params.get(clave)?.split(',') ?? []).filter(Boolean);
    const siguiente = actuales.includes(slug)
      ? actuales.filter((s) => s !== slug)
      : [...actuales, slug];
    poner(clave, siguiente.join(',') || null);
  };

  const quitar = (clave: string, valor?: string) => {
    if (clave === 'precio') {
      const s = new URLSearchParams(params);
      s.delete('minPrice');
      s.delete('maxPrice');
      s.delete('page');
      setParams(s);
      return;
    }
    if (valor) alternar(clave as 'need' | 'brand', valor);
    else poner(clave, null);
  };

  const limpiar = () => setParams(new URLSearchParams());

  return (
    <div className="container-page py-6 sm:py-8">
      <Migas migas={migas} />

      <header className="mt-4">
        <h1 className="font-display text-display font-extrabold tracking-tight text-content">{titulo}</h1>
        <p className="mt-1 text-body-sm text-content-muted" aria-live="polite">
          {loading && !data
            ? 'Buscando…'
            : `${data?.total ?? 0} ${data?.total === 1 ? 'producto' : 'productos'}`}
        </p>
      </header>

      {puestos.length > 0 && (
        <FiltrosPuestos puestos={puestos} onQuitar={quitar} onLimpiar={limpiar} />
      )}

      {/* Barra de control en móvil: filtrar y ordenar, siempre a mano. */}
      <div className="mt-5 flex items-center gap-3 lg:hidden">
        {/*
          El nombre accesible se escribe entero: la insignia pegada al texto se
          leía «Filtrar1», que no significa nada dicho en voz alta.
        */}
        <button
          type="button"
          onClick={() => setCajonAbierto(true)}
          aria-label={
            nFiltros > 0
              ? `Filtrar. ${nFiltros} ${nFiltros === 1 ? 'filtro puesto' : 'filtros puestos'}`
              : 'Filtrar'
          }
          className="btn btn-md btn-ghost flex-1 justify-center"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          <span aria-hidden="true">Filtrar</span>
          {nFiltros > 0 && (
            <span
              aria-hidden="true"
              className="ml-1 rounded-pill bg-brand-700 px-2 py-0.5 text-caption font-bold text-cream"
            >
              {nFiltros}
            </span>
          )}
        </button>
        <Orden valor={filtros.sort ?? 'relevance'} onChange={(v) => poner('sort', v)} className="flex-1" />
      </div>

      <div className="mt-6 flex gap-8">
        <aside className="hidden w-60 shrink-0 lg:block" aria-label="Filtros">
          <div className="sticky top-24">
            <Filtros facetas={facetas} filtros={filtros} poner={poner} alternar={alternar} />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-5 hidden items-center justify-between gap-4 lg:flex">
            <p className="text-body-sm text-content-muted">
              {data ? `Mostrando ${data.items.length} de ${data.total}` : ' '}
            </p>
            <Orden valor={filtros.sort ?? 'relevance'} onChange={(v) => poner('sort', v)} className="w-56 shrink-0" />
          </div>

          {error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : loading ? (
            <ul className="grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <li key={i}>
                  <ProductCardSkeleton />
                </li>
              ))}
            </ul>
          ) : data && data.items.length > 0 ? (
            <>
              <ul className="grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-3 xl:grid-cols-4">
                {data.items.map((p) => (
                  <li key={p.id}>
                    <ProductCard product={p} />
                  </li>
                ))}
              </ul>
              {data.totalPages > 1 && (
                <Paginacion
                  pagina={data.page}
                  total={data.totalPages}
                  onIr={(n) => poner('page', String(n))}
                />
              )}
            </>
          ) : (
            <SinResultados
              busqueda={filtros.q}
              hayFiltros={nFiltros > 0}
              onLimpiar={limpiar}
              /*
                Es «categoría vacía» sólo si el ÚNICO filtro relevante es la
                categoría y ésa existe de verdad en el catálogo. Con más filtros
                encima, el vacío puede venir de la combinación y el mensaje
                correcto sigue siendo el de siempre.
              */
              categoriaVacia={
                filtros.category && !filtros.q
                  ? facetas?.categories?.find((c) => c.slug === filtros.category)?.nombre
                  : undefined
              }
            />
          )}
        </div>
      </div>

      {cajonAbierto && (
        <CajonFiltros
          onCerrar={() => setCajonAbierto(false)}
          onLimpiar={limpiar}
          nFiltros={nFiltros}
          total={data?.total ?? 0}
        >
          <Filtros facetas={facetas} filtros={filtros} poner={poner} alternar={alternar} />
        </CajonFiltros>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */

function Migas({ migas }: { migas: { etiqueta: string; href?: string }[] }) {
  return (
    <nav aria-label="Migas de pan">
      <ol className="flex list-none flex-wrap items-center gap-1 p-0 text-body-sm text-content-muted">
        {migas.map((m, i) => (
          <li key={`${m.etiqueta}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-content-subtle" aria-hidden="true" />}
            {m.href ? (
              <Link to={m.href} className="hover:text-brand-700 hover:underline">
                {m.etiqueta}
              </Link>
            ) : (
              // El último es dónde se está: se marca, y no se enlaza a sí mismo.
              <span aria-current="page" className="font-semibold text-content">
                {m.etiqueta}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function FiltrosPuestos({
  puestos,
  onQuitar,
  onLimpiar,
}: {
  puestos: { clave: string; valor?: string; etiqueta: string }[];
  onQuitar: (clave: string, valor?: string) => void;
  onLimpiar: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="text-body-sm text-content-muted">Filtrando por</span>
      {puestos.map((p) => (
        <button
          key={`${p.clave}-${p.valor ?? ''}`}
          type="button"
          onClick={() => onQuitar(p.clave, p.valor)}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-pill border border-brand-200 bg-brand-50 px-3 text-body-sm font-semibold text-brand-700 transition-colors hover:border-brand-400 hover:bg-brand-100"
        >
          {p.etiqueta}
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">Quitar este filtro</span>
        </button>
      ))}
      {puestos.length > 1 && (
        <button type="button" onClick={onLimpiar} className="btn-link text-body-sm">
          Quitar todos
        </button>
      )}
    </div>
  );
}

/**
 * El selector de orden.
 *
 * `min-w-0` no es decorativo: la opción más larga —«Precio: de menor a
 * mayor—» estira el `<select>` hasta 218 px, y con `shrink-0` al lado del
 * botón de filtrar la fila medía 388 px dentro de una pantalla de 320: el
 * catálogo entero se desplazaba en horizontal. Ahora se encoge y recorta.
 */
function Orden({ valor, onChange, className = '' }: { valor: string; onChange: (v: string) => void; className?: string }) {
  return (
    <label className={`min-w-0 ${className}`}>
      <span className="sr-only">Ordenar los productos</span>
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full max-w-full truncate rounded-control border border-edge bg-surface px-3 text-body-sm font-semibold text-content outline-none focus-visible:border-brand-400"
      >
        {ORDENES.map(([v, etiqueta]) => (
          <option key={v} value={v}>
            {etiqueta}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * El cajón de filtros del móvil.
 *
 * Es un diálogo de verdad —rol, nombre, foco atrapado, Escape, fondo
 * bloqueado—, reutilizando el mismo `useOverlay` que el carrito y el menú.
 * Antes era un panel suelto: el tabulador se escapaba a la página de detrás y
 * Escape no hacía nada.
 *
 * Los filtros se aplican AL INSTANTE, no al pulsar «Aplicar». El recuento del
 * botón de abajo va cambiando mientras se marcan opciones, así que se ve el
 * efecto antes de cerrar; y como el estado vive en la URL, el botón de atrás
 * deshace filtro a filtro.
 */
function CajonFiltros({
  children,
  onCerrar,
  onLimpiar,
  nFiltros,
  total,
}: {
  children: React.ReactNode;
  onCerrar: () => void;
  onLimpiar: () => void;
  nFiltros: number;
  total: number;
}) {
  const panel = useOverlay(true, onCerrar);

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-ink/40" onClick={onCerrar} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Filtros del catálogo"
        className="absolute bottom-0 left-0 right-0 flex max-h-[88vh] animate-slide-up flex-col rounded-t-card bg-cream"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-edge-subtle px-5 py-4">
          <h2 className="font-display text-heading font-bold text-content">Filtros</h2>
          <button type="button" onClick={onCerrar} className="btn-icon" aria-label="Cerrar los filtros">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>

        <div className="flex shrink-0 items-center gap-3 border-t border-edge-subtle bg-surface px-5 py-4">
          <button
            type="button"
            onClick={onLimpiar}
            disabled={nFiltros === 0}
            className="btn btn-md btn-ghost flex-1 justify-center disabled:opacity-40"
          >
            Limpiar
          </button>
          <button type="button" onClick={onCerrar} className="btn btn-md btn-primary flex-[1.4] justify-center">
            Ver {total} {total === 1 ? 'producto' : 'productos'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SinResultados({
  busqueda,
  hayFiltros,
  onLimpiar,
  categoriaVacia,
}: {
  busqueda?: string;
  hayFiltros: boolean;
  onLimpiar: () => void;
  /**
   * El nombre de la categoría cuando se ha llegado a una que EXISTE en el
   * catálogo pero todavía no tiene mercancía.
   */
  categoriaVacia?: string;
}) {
  /*
   * DOS VACÍOS DISTINTOS, Y NO SE PUEDEN CONTAR IGUAL.
   *
   * «No hay productos con estos filtros» está bien cuando alguien ha combinado
   * cuatro filtros y no queda nada: la salida es quitar filtros.
   *
   * Pero desde la Fase 2I el menú enseña la estructura comercial completa, y
   * muchas categorías están vacías porque la mercancía entra después. Ahí ese
   * mensaje miente por partida doble: no hay filtros que quitar, y suena a que
   * la tienda está rota. Lo que pasa es que ese apartado todavía no tiene
   * productos, que es una situación normal en una tienda que está creciendo.
   */
  if (categoriaVacia) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card border border-edge bg-surface px-6 py-16 text-center">
        <PackageOpen className="h-10 w-10 text-brand-400" aria-hidden="true" />
        <p className="font-display text-heading font-bold text-content">
          Próximamente encontrarás productos en esta categoría
        </p>
        <p className="max-w-sm text-body-sm text-content-muted">
          Estamos preparando la selección de {categoriaVacia.toLowerCase()}. Mientras
          tanto puedes ver el resto del catálogo.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Link to="/tienda" className="btn btn-md btn-primary">
            Ver todo el catálogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-edge bg-surface px-6 py-16 text-center">
      <SearchX className="h-10 w-10 text-content-subtle" aria-hidden="true" />
      <p className="font-display text-heading font-bold text-content">
        {busqueda ? `No hay resultados para «${busqueda}»` : 'No hay productos con estos filtros'}
      </p>
      <p className="max-w-sm text-body-sm text-content-muted">
        {busqueda
          ? 'Prueba con el nombre de la marca, el tipo de producto o para qué animal es.'
          : 'Prueba a quitar alguno para ver más.'}
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {hayFiltros && (
          <button type="button" onClick={onLimpiar} className="btn btn-md btn-ghost">
            Quitar los filtros
          </button>
        )}
        <Link to="/tienda" className="btn btn-md btn-primary">
          Ver todo el catálogo
        </Link>
      </div>
    </div>
  );
}

function Paginacion({
  pagina,
  total,
  onIr,
}: {
  pagina: number;
  total: number;
  onIr: (n: number) => void;
}) {
  const paginas = Array.from({ length: total }, (_, i) => i + 1);
  return (
    <nav aria-label="Paginación" className="mt-8 flex justify-center">
      <ul className="flex list-none items-center gap-1.5 p-0">
        {paginas.map((n) => (
          <li key={n}>
            <button
              type="button"
              onClick={() => onIr(n)}
              aria-current={n === pagina ? 'page' : undefined}
              aria-label={`Página ${n}`}
              className={`flex h-10 min-w-10 items-center justify-center rounded-control px-3 text-body-sm font-semibold transition-colors ${
                n === pagina
                  ? 'bg-brand-700 text-cream'
                  : 'border border-edge bg-surface text-content hover:border-brand-300 hover:bg-brand-50'
              }`}
            >
              {n}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
