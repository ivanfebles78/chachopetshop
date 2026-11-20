import { useEffect, useState } from 'react';
import { ArrowLeftRight, Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, eur } from '@/lib/cn';
import { useOverlay } from '@/lib/useOverlay';
import type { AdminProduct, FactusolArticulo, Taxonomy } from '@/lib/types';

/**
 * COMPARADOR «BASE DE DATOS vs FACTUSOL».
 *
 * Se abre desde el editor de producto. Trae de Factusol (SOLO LECTURA) el
 * artículo que case con el EAN o el SKU y muestra, en una tabla de tres
 * columnas (Campo · Base de datos · Factusol), la info de cada lado para poder
 * ver de un vistazo qué coincide y qué no. Las filas con diferencia relevante se
 * resaltan. Factusol no trae marca, imagen ni descripción: ahí se dice.
 */

/** ¿Tiene foto propia, o es relleno/está vacía? */
const tieneFoto = (img: string | null | undefined) => Boolean(img) && !img!.includes('picsum.photos');
const norm = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

export function ComparadorFactusol({
  producto,
  taxonomia,
  onCerrar,
}: {
  producto: AdminProduct;
  taxonomia: Taxonomy;
  onCerrar: () => void;
}) {
  const panel = useOverlay(true, onCerrar);
  const [articulo, setArticulo] = useState<FactusolArticulo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noEncontrado, setNoEncontrado] = useState(false);

  const sku = producto.variants[0]?.sku ?? null;

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    setError(null);
    setNoEncontrado(false);
    api
      .adminFactusol({ ean: producto.ean, sku })
      .then((r) => {
        if (!vivo) return;
        if (r.articulo) setArticulo(r.articulo);
        else setNoEncontrado(true);
      })
      .catch((e: Error) => vivo && setError(e.message))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [producto.ean, sku]);

  const nombreAnimal = (slug: string | null) =>
    slug ? taxonomia.animals.find((a) => a.slug === slug)?.name ?? slug : null;
  const nombreCat = (slug: string) => taxonomia.categories.find((c) => c.slug === slug)?.name ?? slug;

  // Expansión «PAC (perro · accesorios)» para cada lado.
  const familiaNuestra = producto.familia
    ? `${producto.familia}${expansion(producto.animals.map((a) => a.name), producto.categories.map((c) => c.name))}`
    : '—';
  const familiaFactusol = articulo
    ? `${articulo.famart || '—'}${expansion(
        [nombreAnimal(articulo.animal)].filter(Boolean) as string[],
        [nombreCat(articulo.categoria)],
      )}`
    : '';

  const stockNuestro = producto.variants[0]?.stock ?? 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink/50" onClick={onCerrar} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={`Comparar ${producto.name} con Factusol`}
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-4xl bg-cream sm:rounded-4xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-brand-900/10 px-6 py-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
              <ArrowLeftRight className="h-5 w-5 text-brand-600" aria-hidden="true" />
              Base de datos vs Factusol
            </h2>
            <p className="truncate text-sm text-content-subtle" title={producto.name}>
              {producto.name}
            </p>
          </div>
          <button onClick={onCerrar} className="rounded-lg p-2 text-content-subtle hover:bg-brand-900/5" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {cargando ? (
            <div className="flex items-center justify-center gap-2 py-16 text-content-subtle">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              Consultando Factusol…
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : noEncontrado ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center text-sm font-semibold text-amber-800">
              No se encontró este artículo en Factusol (por EAN {producto.ean || '—'} ni por SKU {sku || '—'}).
            </div>
          ) : articulo ? (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left">
                  <th className="w-28 pb-3 pr-3 text-xs font-bold uppercase tracking-wide text-content-subtle">Campo</th>
                  <th className="pb-3 pr-3 text-xs font-bold uppercase tracking-wide text-content-subtle">Base de datos</th>
                  <th className="pb-3 text-xs font-bold uppercase tracking-wide text-content-subtle">Factusol</th>
                </tr>
              </thead>
              <tbody>
                <Fila
                  campo="Nombre"
                  nuestro={producto.name}
                  factusol={articulo.desart || '—'}
                  diferente={norm(producto.name) !== norm(articulo.desart)}
                />
                <Fila
                  campo="EAN"
                  nuestro={<span className="font-mono">{producto.ean || '—'}</span>}
                  factusol={<span className="font-mono">{articulo.eanart || '—'}</span>}
                  diferente={(producto.ean ?? '') !== (articulo.eanart ?? '')}
                />
                <Fila
                  campo="Familia"
                  nuestro={familiaNuestra}
                  factusol={familiaFactusol}
                  diferente={(producto.familia ?? '') !== (articulo.famart ?? '')}
                />
                <Fila
                  campo="Marca"
                  nuestro={<strong>{producto.brand?.name ?? '(sin marca)'}</strong>}
                  factusol={<span className="italic text-content-subtle">— Factusol no trae marca</span>}
                />
                <Fila
                  campo="Precio"
                  nuestro={producto.price != null ? eur(producto.price) : 'A consultar'}
                  factusol={articulo.pvp != null ? eur(articulo.pvp) : 'A consultar'}
                  diferente={!mismoPrecio(producto.price, articulo.pvp)}
                />
                <Fila
                  campo="Stock"
                  nuestro={`${stockNuestro} uds`}
                  factusol={articulo.stock != null ? `${articulo.stock} uds` : '—'}
                  diferente={articulo.stock != null && stockNuestro !== articulo.stock}
                />
                <Fila
                  campo="Referencia"
                  nuestro={<span className="font-mono text-xs">{sku || '—'}</span>}
                  factusol={
                    <span className="font-mono text-xs">
                      Ref: {articulo.refart || '—'} · Cód: {articulo.codart || '—'}
                    </span>
                  }
                />
                <Fila
                  campo="Imagen"
                  nuestro={
                    tieneFoto(producto.image) ? 'Sí' : <strong className="text-amber-700">vacía (sin foto)</strong>
                  }
                  factusol={<span className="italic text-content-subtle">— no trae</span>}
                />
                <Fila
                  campo="Descripción"
                  nuestro={producto.description.trim() ? 'Sí' : <span className="text-content-subtle">vacía</span>}
                  factusol={<span className="italic text-content-subtle">— no trae</span>}
                />
                <Fila campo="Activo" nuestro={producto.active ? 'sí' : 'no'} factusol={<span className="text-content-subtle">—</span>} />
              </tbody>
            </table>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-brand-900/10 bg-white px-6 py-4">
          <p className="text-xs text-content-subtle">Factusol es solo lectura: nada de lo que ves aquí se modifica.</p>
          <button
            onClick={onCerrar}
            className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-cream shadow-soft hover:bg-brand-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

/** « (perro · accesorios)» a partir de las listas de animales y categorías. */
function expansion(animales: string[], categorias: string[]): string {
  const partes = [animales.join(', '), categorias.join(', ')].filter(Boolean);
  return partes.length ? ` (${partes.join(' · ')})` : '';
}

/** Dos precios son «iguales» si ambos faltan o coinciden al céntimo. */
function mismoPrecio(a: number | null, b: number | null): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Math.round(a * 100) === Math.round(b * 100);
}

function Fila({
  campo,
  nuestro,
  factusol,
  diferente = false,
}: {
  campo: string;
  nuestro: React.ReactNode;
  factusol: React.ReactNode;
  diferente?: boolean;
}) {
  return (
    <tr className={cn('border-t border-brand-900/10 align-top', diferente && 'bg-amber-50/60')}>
      <td className="py-3 pr-3 text-content-subtle">
        <span className="flex items-center gap-1.5">
          {campo}
          {diferente && (
            <span className="rounded-full bg-amber-200/70 px-1.5 text-[10px] font-bold uppercase text-amber-800" title="Hay diferencia">
              ≠
            </span>
          )}
        </span>
      </td>
      <td className="py-3 pr-3 text-ink">{nuestro}</td>
      <td className="py-3 text-ink">{factusol}</td>
    </tr>
  );
}
