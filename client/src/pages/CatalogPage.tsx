import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchX, SlidersHorizontal, X } from 'lucide-react';
import { api, type ProductFilters } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { cn } from '@/lib/cn';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';
import { ErrorState } from '@/components/ErrorState';

const SORTS = [
  ['relevance', 'Relevancia'],
  ['price_asc', 'Precio: menor'],
  ['price_desc', 'Precio: mayor'],
  ['newest', 'Novedades'],
] as const;

// Descripción de sección (para que cada entrada del menú tenga su cabecera propia).
const SECTION_DESC: Record<string, string> = {
  perro: 'Nutrición, snacks y accesorios para perros de todas las razas y edades.',
  gato: 'Todo para tu gato: pienso, comida húmeda, arena, rascadores y más.',
  ave: 'Alimento y accesorios para canarios, periquitos y otras aves.',
  roedor: 'Heno, mezclas y premios para conejos, cobayas y hámsters.',
  pez: 'Alimento y cuidado para tus peces de agua dulce y tropical.',
  reptil: 'Nutrición y accesorios para reptiles y terrarios.',
  'dietas-veterinarias': 'Dietas clínicas para necesidades específicas, recomendadas por veterinarios.',
  'alimentacion-seca': 'Piensos secos de alta calidad, sin cereales y recetas premium.',
  'alimentacion-humeda': 'Latas y tarrinas de comida húmeda natural y apetecible.',
  'premios-snacks': 'Premios, snacks dentales y recompensas saludables.',
  suplementos: 'Suplementos y cosmética para el bienestar de tu mascota.',
  accesorios: 'Comederos, transportines, rascadores y mucho más.',
  higiene: 'Higiene, cosmética y arenas aglomerantes.',
  camas: 'Camas, colchones y zonas de descanso cómodas.',
};

export function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const [mobileFilters, setMobileFilters] = useState(false);
  const { data: taxonomy } = useFetch(() => api.taxonomy(), []);

  const filters: ProductFilters = useMemo(() => {
    const need = params.get('need');
    const brand = params.get('brand');
    return {
      animal: params.get('animal') ?? undefined,
      category: params.get('category') ?? undefined,
      need: need ? need.split(',') : [],
      brand: brand ? brand.split(',') : [],
      q: params.get('q') ?? undefined,
      sort: params.get('sort') ?? 'relevance',
      featured: params.get('featured') === '1' || undefined,
      page: Number(params.get('page') ?? 1),
      pageSize: 12,
    };
  }, [params]);

  const { data, loading, error, refetch } = useFetch(() => api.products(filters), [params.toString()]);

  const patch = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null || value === '') next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const toggleMulti = (key: 'need' | 'brand', slug: string) => {
    const current = (params.get(key)?.split(',') ?? []).filter(Boolean);
    const next = current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug];
    patch(key, next.join(',') || null);
  };

  const activeCount =
    (filters.animal ? 1 : 0) +
    (filters.category ? 1 : 0) +
    (filters.need?.length ?? 0) +
    (filters.brand?.length ?? 0) +
    (filters.featured ? 1 : 0);

  const title = filters.q
    ? `Resultados para “${filters.q}”`
    : taxonomy?.animals.find((a) => a.slug === filters.animal)?.name ??
      taxonomy?.categories.find((c) => c.slug === filters.category)?.name ??
      'Toda la tienda';

  return (
    <div className="container-page py-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">{title}</h1>
        {(() => {
          const desc = (filters.category && SECTION_DESC[filters.category]) || (filters.animal && SECTION_DESC[filters.animal]);
          return desc ? <p className="mt-2 max-w-2xl text-brand-900/60">{desc}</p> : null;
        })()}
        <p className="mt-1 text-sm text-content-subtle">{data?.total ?? '—'} productos</p>
      </div>

      <div className="flex items-center justify-between gap-3 lg:hidden">
        <button onClick={() => setMobileFilters(true)} className="btn-ghost py-2.5">
          <SlidersHorizontal className="h-4 w-4" /> Filtros {activeCount > 0 && `(${activeCount})`}
        </button>
        <SortSelect value={filters.sort ?? 'relevance'} onChange={(v) => patch('sort', v)} />
      </div>

      <div className="mt-6 flex gap-8">
        {/* Sidebar desktop */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <FilterPanel
            taxonomy={taxonomy}
            filters={filters}
            patch={patch}
            toggleMulti={toggleMulti}
            onClear={() => setParams(new URLSearchParams())}
            activeCount={activeCount}
          />
        </aside>

        <div className="flex-1">
          <div className="mb-5 hidden items-center justify-between lg:flex">
            <p className="text-sm text-brand-900/60">
              Mostrando {data?.items.length ?? 0} de {data?.total ?? 0}
            </p>
            <SortSelect value={filters.sort ?? 'relevance'} onChange={(v) => patch('sort', v)} />
          </div>

          {error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : data && data.items.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {data.items.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
              {data.totalPages > 1 && (
                <Pagination page={data.page} totalPages={data.totalPages} onPage={(n) => patch('page', String(n))} />
              )}
            </>
          ) : (
            <div className="card flex flex-col items-center gap-3 rounded-4xl py-16 text-center">
              <SearchX className="h-10 w-10 text-content-muted" aria-hidden="true" />
              <p className="font-display text-lg font-semibold text-ink">Sin resultados</p>
              <p className="text-brand-900/60">Prueba a quitar algún filtro.</p>
              <button onClick={() => setParams(new URLSearchParams())} className="btn-ghost mt-2">Limpiar filtros</button>
            </div>
          )}
        </div>
      </div>

      {/* Sheet móvil */}
      {mobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setMobileFilters(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-4xl bg-cream p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">Filtros</h2>
              <button onClick={() => setMobileFilters(false)} className="rounded-full p-2 hover:bg-brand-900/5"><X className="h-5 w-5" /></button>
            </div>
            <FilterPanel
              taxonomy={taxonomy}
              filters={filters}
              patch={patch}
              toggleMulti={toggleMulti}
              onClear={() => setParams(new URLSearchParams())}
              activeCount={activeCount}
            />
            <button onClick={() => setMobileFilters(false)} className="btn-primary mt-6 w-full py-3">
              Ver {data?.total ?? 0} productos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SortSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    /*
     * El desplegable no tenía NOMBRE. Se veía «Más vendidos» y se entendía por
     * el sitio que ocupa, pero un lector de pantalla anunciaba «menú
     * desplegable, más vendidos» sin decir de qué: ordenar, filtrar, elegir
     * envío. axe lo marca como fallo crítico y con razón —es el control que
     * decide en qué orden se ve la tienda—. La etiqueta va oculta a la vista
     * porque el contexto sí es evidente MIRANDO; lo que faltaba era el nombre.
     */
    <label>
      <span className="sr-only">Ordenar los productos</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-full border border-brand-900/10 bg-white px-4 py-2.5 text-sm font-semibold text-brand-900 outline-none focus:border-brand-500"
      >
        {SORTS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
      </select>
    </label>
  );
}

type PanelProps = {
  taxonomy: import('@/lib/types').Taxonomy | null;
  filters: ProductFilters;
  patch: (k: string, v: string | null) => void;
  toggleMulti: (k: 'need' | 'brand', slug: string) => void;
  onClear: () => void;
  activeCount: number;
};

function FilterPanel({ taxonomy, filters, patch, toggleMulti, onClear, activeCount }: PanelProps) {
  if (!taxonomy) return null;
  return (
    <div className="space-y-6">
      {activeCount > 0 && (
        <button onClick={onClear} className="text-sm font-semibold text-brand-700 hover:text-brand-800">
          Limpiar todo ({activeCount})
        </button>
      )}

      <FilterGroup title="Animal">
        <div className="flex flex-wrap gap-2">
          {taxonomy.animals.map((a) => (
            <button
              key={a.slug}
              onClick={() => patch('animal', filters.animal === a.slug ? null : a.slug)}
              className={cn('chip', filters.animal === a.slug && 'chip-active')}
            >
              <span>{a.emoji}</span> {a.name}
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Tipo de producto">
        <div className="space-y-1">
          {taxonomy.categories.map((c) => (
            <button
              key={c.slug}
              onClick={() => patch('category', filters.category === c.slug ? null : c.slug)}
              className={cn(
                'block w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors',
                filters.category === c.slug ? 'bg-brand-600 text-cream' : 'text-brand-900/70 hover:bg-brand-900/5',
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Necesidades">
        <div className="flex flex-wrap gap-2">
          {taxonomy.needs.map((n) => (
            <button
              key={n.slug}
              onClick={() => toggleMulti('need', n.slug)}
              className={cn('chip', filters.need?.includes(n.slug) && 'chip-active')}
            >
              {n.name}
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Marcas">
        <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
          {taxonomy.brands.map((b) => (
            <label key={b.slug} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-brand-900/5">
              <input
                type="checkbox"
                checked={filters.brand?.includes(b.slug) ?? false}
                onChange={() => toggleMulti('brand', b.slug)}
                className="h-4 w-4 rounded border-brand-900/20 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-brand-900/80">{b.name}</span>
            </label>
          ))}
        </div>
      </FilterGroup>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-content-subtle">{title}</h3>
      {children}
    </div>
  );
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (n: number) => void }) {
  return (
    <div className="mt-10 flex items-center justify-center gap-2">
      {Array.from({ length: totalPages }).map((_, i) => {
        const n = i + 1;
        return (
          <button
            key={n}
            onClick={() => onPage(n)}
            className={cn(
              'h-10 w-10 rounded-full text-sm font-semibold transition-colors',
              n === page ? 'bg-brand-600 text-cream' : 'bg-white text-brand-900/70 hover:bg-brand-900/5',
            )}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
