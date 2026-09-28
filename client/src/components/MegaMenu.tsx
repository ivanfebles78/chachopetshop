import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { MenuAnimal, MenuMarca } from '@/lib/types';
import { rutaCatalogo } from '@/lib/navigation';

/**
 * EL MENÚ DE UN ANIMAL: niveles COLAPSADOS que se abren hacia la derecha.
 *
 * Tal como en el ejemplo que pidió Ivan:
 *
 *   · Al abrir «Perros» salen sus categorías en columna, TODAS COLAPSADAS.
 *   · Al pulsar una categoría (clic, no al pasar el ratón), sus MARCAS se abren
 *     en un panel flotante A LA DERECHA. Sólo una categoría abierta a la vez.
 *   · Una marca CON líneas es a su vez un desplegable: al pulsarla, sus LÍNEAS
 *     (Premium Recetas, Classic Supreme…) se abren en OTRO panel más a la
 *     derecha. Una marca SIN líneas es un enlace directo a su página.
 *   · Nada está abierto de entrada; volver a pulsar cierra.
 *
 *       Perros ▾
 *       ┌ Alimentación seca ›─┐→ ┌ AtlanticPet ›─┐→ ┌ Premium Recetas ┐
 *       │ Alimentación húmeda │  │ Ownat         │  │ Classic Supreme  │
 *       │ …                   │  └───────────────┘  └──────────────────┘
 *       └─────────────────────┘
 *
 * En móvil no cabe un flyout: allí se usa `MenuArbol` (acordeón).
 */
export function MegaMenu({ animal, onNavegar }: { animal: MenuAnimal; onNavegar: () => void }) {
  const [catAbierta, setCatAbierta] = useState<string | null>(null);
  const [marcaAbierta, setMarcaAbierta] = useState<string | null>(null);

  const alternarCategoria = (slug: string) => {
    setCatAbierta((s) => (s === slug ? null : slug));
    setMarcaAbierta(null); // al cambiar de categoría, se cierra la marca abierta
  };

  return (
    <ul className="w-64 list-none space-y-1 p-0">
      {animal.categorias.map((cat) => {
        const expandida = catAbierta === cat.slug;
        return (
          <li key={cat.slug} className="relative">
            <button
              type="button"
              aria-expanded={expandida}
              onClick={() => alternarCategoria(cat.slug)}
              className={`flex min-h-11 w-full items-center gap-2 rounded-control border px-3 text-left text-body font-semibold transition-colors ${
                expandida
                  ? 'border-brand-600 bg-brand-600 text-content-inverse'
                  : 'border-edge bg-surface text-content hover:bg-brand-50'
              }`}
            >
              <span className="flex-1">{cat.nombre}</span>
              <span className={`text-caption tabular-nums ${expandida ? 'text-cream/80' : 'text-content-subtle'}`}>
                {cat.total}
              </span>
              <ChevronRight
                className={`h-4 w-4 shrink-0 transition-transform ${expandida ? 'translate-x-0.5' : ''}`}
                aria-hidden="true"
              />
            </button>

            {expandida && (
              <ul className="absolute left-full top-0 z-10 ml-3 w-64 animate-fade-in list-none space-y-0.5 rounded-card border border-edge-subtle bg-surface p-2 shadow-raised">
                {cat.marcas.map((marca) => (
                  <MarcaItem
                    key={marca.slug}
                    animalSlug={animal.slug}
                    categorySlug={cat.slug}
                    marca={marca}
                    abierta={marcaAbierta === marca.slug}
                    onAlternar={() => setMarcaAbierta((s) => (s === marca.slug ? null : marca.slug))}
                    onNavegar={onNavegar}
                  />
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Una marca dentro del flyout de una categoría.
 *
 *   · Sin líneas: enlace directo a la página de la marca.
 *   · Con líneas: desplegable que abre sus líneas en un panel más a la derecha.
 */
function MarcaItem({
  animalSlug,
  categorySlug,
  marca,
  abierta,
  onAlternar,
  onNavegar,
}: {
  animalSlug: string;
  categorySlug: string;
  marca: MenuMarca;
  abierta: boolean;
  onAlternar: () => void;
  onNavegar: () => void;
}) {
  const base = { animal: animalSlug, category: categorySlug, brand: marca.slug };

  if (marca.lineas.length === 0) {
    return (
      <li>
        <Link
          to={rutaCatalogo(base)}
          onClick={onNavegar}
          className="flex min-h-9 items-center justify-between gap-2 rounded-control px-3 text-body-sm text-content hover:bg-brand-50"
        >
          <span>{marca.nombre}</span>
          <span className="text-caption tabular-nums text-content-subtle" aria-hidden="true">{marca.total}</span>
        </Link>
      </li>
    );
  }

  return (
    <li className="relative">
      <button
        type="button"
        aria-expanded={abierta}
        onClick={onAlternar}
        className={`flex min-h-9 w-full items-center gap-2 rounded-control px-3 text-left text-body-sm transition-colors ${
          abierta ? 'bg-brand-100 font-semibold text-brand-800' : 'text-content hover:bg-brand-50'
        }`}
      >
        <span className="flex-1">{marca.nombre}</span>
        <span className="text-caption tabular-nums text-content-subtle" aria-hidden="true">{marca.total}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-content-subtle" aria-hidden="true" />
      </button>

      {abierta && (
        <ul className="absolute left-full top-0 z-20 ml-3 w-56 animate-fade-in list-none space-y-0.5 rounded-card border border-edge-subtle bg-surface p-2 shadow-raised">
          {marca.lineas.map((linea) => (
            <li key={linea.nombre}>
              <Link
                to={rutaCatalogo({ ...base, line: linea.nombre })}
                onClick={onNavegar}
                className="flex min-h-9 items-center justify-between gap-2 rounded-control px-3 text-body-sm text-content-muted hover:bg-brand-50 hover:text-content"
              >
                <span>{linea.nombre}</span>
                <span className="text-caption tabular-nums text-content-subtle" aria-hidden="true">{linea.total}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
