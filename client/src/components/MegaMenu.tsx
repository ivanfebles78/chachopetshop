import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { MenuAnimal } from '@/lib/types';
import { rutaCatalogo } from '@/lib/navigation';

/**
 * EL MENÚ DE UN ANIMAL: categorías COLAPSADAS que se abren hacia la derecha.
 *
 * Tal como en el ejemplo que pidió Ivan:
 *
 *   · Al abrir «Perros» salen sus 5 categorías en columna, TODAS COLAPSADAS.
 *   · Al pulsar una categoría (clic, no al pasar el ratón), sus MARCAS se abren
 *     en un panel flotante A LA DERECHA de esa categoría. Sólo una abierta a la
 *     vez; volver a pulsar la cierra.
 *   · Nada está abierto de entrada.
 *
 *       Perros ▾
 *       ┌ Alimentación seca ›─┐→ ┌ marcas … ┐
 *       │ Alimentación húmeda │  └──────────┘
 *       │ …                   │
 *       └─────────────────────┘
 *
 * El nombre de la categoría despliega; dentro del panel de marcas hay un «Ver
 * todo» para ir a la página de la categoría entera, y cada marca es un enlace.
 * En móvil no cabe un flyout: allí se usa `MenuArbol` (acordeón).
 */
export function MegaMenu({ animal, onNavegar }: { animal: MenuAnimal; onNavegar: () => void }) {
  const [abierta, setAbierta] = useState<string | null>(null); // nada abierto de entrada

  return (
    <ul className="w-64 list-none space-y-1 p-0">
      {animal.categorias.map((cat) => {
        const expandida = abierta === cat.slug;
        return (
          <li key={cat.slug} className="relative">
            <button
              type="button"
              aria-expanded={expandida}
              onClick={() => setAbierta((s) => (s === cat.slug ? null : cat.slug))}
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
                  <li key={marca.slug}>
                    <Link
                      to={rutaCatalogo({ animal: animal.slug, category: cat.slug, brand: marca.slug })}
                      onClick={onNavegar}
                      className="flex min-h-9 items-center justify-between gap-2 rounded-control px-3 text-body-sm text-content hover:bg-brand-50"
                    >
                      <span>{marca.nombre}</span>
                      <span className="text-caption tabular-nums text-content-subtle" aria-hidden="true">
                        {marca.total}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
