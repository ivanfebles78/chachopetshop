import { Link, useParams } from 'react-router-dom';
import { useOwnatCatalogo, productosDeLinea, nombreLinea, LINEAS_OWNAT, esDeGato } from '@/lib/ownat';
import { MigasOwnat } from './MigasOwnat';

export function LineaOwnatPage() {
  const { linea = '' } = useParams();
  const { catalogo, cargando, error } = useOwnatCatalogo();
  const meta = LINEAS_OWNAT.find((l) => l.slug === linea);
  const nombre = nombreLinea(linea);

  return (
    <div className="container-page py-8 sm:py-10">
      <MigasOwnat pasos={[{ etiqueta: 'Ownat', href: '/marca/ownat' }, { etiqueta: nombre }]} />

      <h1 className="font-display text-display font-extrabold tracking-tight text-content">
        Ownat <span className="text-brand-700">{nombre}</span>
      </h1>
      {meta?.gancho && <p className="mt-2 max-w-[52ch] text-body text-content-muted">{meta.gancho}</p>}

      {cargando && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-card bg-hundido/60" />
          ))}
        </div>
      )}

      {error && (
        <p className="mt-6 rounded-card border border-edge bg-surface p-6 text-body text-content-muted">
          No hemos podido cargar los productos ahora mismo. Vuelve a intentarlo en un momento.
        </p>
      )}

      {catalogo && (
        <ul className="mt-6 grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-3 lg:grid-cols-4">
          {productosDeLinea(catalogo, linea).map((p) => (
            <li key={p.slug}>
              <Link
                to={`/marca/ownat/${linea}/${p.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-card border border-edge bg-surface transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-rest"
              >
                <div className="aspect-square overflow-hidden bg-surface-sunken">
                  {p.imagen ? (
                    <img
                      src={p.imagen}
                      alt={p.nombre}
                      loading="lazy"
                      className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center p-3 text-center text-body-sm font-semibold text-content-subtle">
                      {p.nombre}
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <span className="text-overline font-bold uppercase tracking-wider text-brand-600">
                    {esDeGato(p.nombre) ? 'Gato' : 'Perro'}
                  </span>
                  <h2 className="line-clamp-3 text-body-sm font-semibold text-content">{p.nombre}</h2>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
