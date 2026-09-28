import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, User, X } from 'lucide-react';
import type { MenuAnimal } from '@/lib/types';
import { useOverlay } from '@/lib/useOverlay';
import { MenuArbol } from './MenuArbol';

/**
 * NAVEGACIÓN MÓVIL.
 *
 * No es el menú de escritorio comprimido. Se navega por NIVELES: primero los
 * animales, y al elegir uno se entra en su menú en cascada (categorías → marcas
 * → líneas), el mismo `MenuArbol` que usa la cabecera. Se ve poco a la vez y
 * siempre se sabe dónde se está.
 *
 * Lo que además resuelve el hook `useOverlay`: atrapa el foco, cierra con
 * Escape, devuelve el foco al botón que abrió y bloquea el desplazamiento del
 * fondo.
 */

type Props = {
  animales: MenuAnimal[];
  conSesion: boolean;
  onClose: () => void;
};

export function MobileNav({ animales, conSesion, onClose }: Props) {
  const [dentro, setDentro] = useState<MenuAnimal | null>(null);
  const panel = useOverlay(true, onClose);

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Velo. Es decorativo: cerrar también está en el botón y en Escape. */}
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden="true" />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        className="absolute right-0 top-0 flex h-full w-full max-w-sm animate-slide-in-right flex-col bg-cream shadow-raised"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-edge-subtle px-4">
          {dentro ? (
            <button
              type="button"
              onClick={() => setDentro(null)}
              className="inline-flex min-h-12 items-center gap-1.5 rounded-control px-2 text-body font-semibold text-content"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              {dentro.nombre}
            </button>
          ) : (
            <span className="px-2 font-display text-heading font-bold text-brand-700">Menú</span>
          )}
          <button type="button" onClick={onClose} className="btn-icon" aria-label="Cerrar menú">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Catálogo" className="flex-1 overflow-y-auto overscroll-contain p-3">
          {dentro ? (
            <MenuArbol animal={dentro} onNavegar={onClose} />
          ) : (
            <ul className="list-none space-y-1 p-0">
              {animales.map((animal) => (
                <li key={animal.slug}>
                  <button
                    type="button"
                    onClick={() => setDentro(animal)}
                    className="flex min-h-12 w-full items-center justify-between gap-2 rounded-control px-3 text-body font-semibold text-content"
                  >
                    <span>{animal.nombre}</span>
                    <ChevronRight className="h-5 w-5 text-content-subtle" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>

        {/* Cuenta al alcance del pulgar, no arriba del todo. */}
        <div className="shrink-0 border-t border-edge-subtle p-3">
          <Link
            to={conSesion ? '/cuenta' : '/login'}
            onClick={onClose}
            className="flex min-h-12 items-center gap-2 rounded-control px-3 text-body font-semibold text-content"
          >
            <User className="h-5 w-5 text-content-muted" aria-hidden="true" />
            {conSesion ? 'Mi cuenta' : 'Iniciar sesión'}
          </Link>
        </div>
      </div>
    </div>
  );
}
