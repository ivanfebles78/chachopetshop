import { Link } from 'react-router-dom';
import { ArrowRight, Leaf } from 'lucide-react';
import { useOwnatCatalogo, lineasConProducto } from '@/lib/ownat';

/**
 * PÁGINA DE MARCA OWNAT.
 *
 * Presenta la marca como en la web del fabricante, pero con el diseño de Chacho:
 * una cabecera y la rejilla de LÍNEAS de producto (Author, Prime, Classic…). Al
 * entrar en una línea se ven sus productos, y al abrir un producto, su ficha con
 * la descripción y la composición.
 */
export function MarcaOwnatPage() {
  const { catalogo, cargando, error } = useOwnatCatalogo();

  return (
    <div className="container-page py-8 sm:py-10">
      {/* Cabecera de marca */}
      <header className="overflow-hidden rounded-card border border-edge-subtle bg-brand-800 text-cream">
        <div className="grid items-center gap-6 p-6 sm:p-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-cream/10 px-3 py-1 text-overline font-bold uppercase tracking-[0.16em] text-amber-300">
              <Leaf className="h-4 w-4" aria-hidden="true" /> Marca destacada
            </span>
            <h1 className="mt-3 font-display text-display font-extrabold tracking-tight">Ownat</h1>
            <p className="mt-3 max-w-[52ch] text-body text-cream/80 sm:text-body-lg">
              Alimentación de verdad, con carne fresca e ingredientes naturales. Explora sus líneas y
              encuentra la receta que mejor le sienta a tu mascota.
            </p>
          </div>
          <div className="flex items-center justify-center rounded-card bg-cream p-8">
            <img src="/marcas/ownat.svg" alt="Ownat" className="h-16 w-auto max-w-[70%] object-contain" />
          </div>
        </div>
      </header>

      <h2 className="mt-10 font-display text-title font-extrabold tracking-tight text-content">
        Líneas de producto
      </h2>
      <p className="mt-1 text-body text-content-muted">Elige una gama para ver sus productos.</p>

      {cargando && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-card bg-hundido/60" />
          ))}
        </div>
      )}

      {error && (
        <p className="mt-6 rounded-card border border-edge bg-surface p-6 text-body text-content-muted">
          No hemos podido cargar el catálogo de Ownat ahora mismo. Vuelve a intentarlo en un momento.
        </p>
      )}

      {catalogo && (
        <ul className="mt-6 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {lineasConProducto(catalogo).map((l) => (
            <li key={l.slug}>
              <Link
                to={`/marca/ownat/${l.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-card border border-edge bg-surface transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-rest"
              >
                <div className="aspect-[16/10] overflow-hidden bg-surface-sunken">
                  {l.imagen ? (
                    <img
                      src={l.imagen}
                      alt={`Ownat ${l.nombre}`}
                      loading="lazy"
                      className="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center font-display text-title font-extrabold text-content-subtle">
                      {l.nombre}
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-heading font-extrabold text-content">{l.nombre}</h3>
                    <span className="shrink-0 rounded-pill bg-brand-50 px-2.5 py-0.5 text-caption font-bold text-brand-700">
                      {l.total}
                    </span>
                  </div>
                  <p className="mt-1 flex-1 text-body-sm text-content-muted">{l.gancho}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-body-sm font-semibold text-brand-700">
                    Ver productos
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
