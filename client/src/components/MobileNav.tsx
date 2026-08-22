import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, User, X } from 'lucide-react';
import type { EntradaNav } from '@/lib/navigation';
import { useOverlay } from '@/lib/useOverlay';

/**
 * NAVEGACIÓN MÓVIL.
 *
 * No es el menú de escritorio comprimido. En una pantalla de 320 px, tres
 * columnas de enlaces con recuentos no se leen: se apilan hasta convertirse en
 * una lista larguísima donde todo pesa lo mismo.
 *
 * Aquí se navega por NIVELES, como en cualquier aplicación de móvil: primero
 * los animales, y al elegir uno se entra en sus categorías con un «volver». Se
 * ve poco a la vez y siempre se sabe dónde se está.
 *
 * Lo que además arregla, y que el cajón anterior no hacía:
 *   · atrapa el foco mientras está abierto;
 *   · cierra con Escape;
 *   · devuelve el foco al botón que lo abrió;
 *   · bloquea el desplazamiento de la página de detrás;
 *   · dianas de 48 px, no de 17.
 */

type Props = {
  entradas: EntradaNav[];
  conSesion: boolean;
  onClose: () => void;
};

export function MobileNav({ entradas, conSesion, onClose }: Props) {
  const [dentro, setDentro] = useState<EntradaNav | null>(null);
  /* Trampa de foco, Escape, bloqueo del fondo y devolución del foco: ver el hook. */
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
              {dentro.etiqueta}
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
            <ul className="list-none space-y-1 p-0">
              {dentro.verTodo && (
                <li>
                  <Link
                    to={dentro.verTodo.href}
                    onClick={onClose}
                    className="flex min-h-12 items-center rounded-control bg-brand-50 px-3 text-body font-semibold text-brand-700"
                  >
                    {dentro.verTodo.etiqueta}
                  </Link>
                </li>
              )}
              {dentro.columnas?.map((col, i) => (
                <li key={`${col.titulo}-${i}`}>
                  {col.titulo.trim() && <p className="mt-3 px-3 text-overline font-bold uppercase text-content-subtle">{col.titulo}</p>}
                  <ul className="list-none p-0">
                    {col.enlaces.map((enlace) => (
                      <li key={enlace.href}>
                        <Link
                          to={enlace.href}
                          onClick={onClose}
                          className="flex min-h-12 items-center justify-between gap-2 rounded-control px-3 text-body text-content"
                        >
                          <span>{enlace.etiqueta}</span>
                          <span className="text-caption text-content-subtle" aria-hidden="true">{enlace.total}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="list-none space-y-1 p-0">
              {entradas.map((entrada) =>
                entrada.columnas ? (
                  <li key={entrada.etiqueta}>
                    <button
                      type="button"
                      onClick={() => setDentro(entrada)}
                      className="flex min-h-12 w-full items-center justify-between gap-2 rounded-control px-3 text-body font-semibold text-content"
                    >
                      <span>{entrada.etiqueta}</span>
                      <ChevronRight className="h-5 w-5 text-content-subtle" aria-hidden="true" />
                    </button>
                  </li>
                ) : (
                  <li key={entrada.etiqueta}>
                    <Link
                      to={entrada.href}
                      onClick={onClose}
                      className="flex min-h-12 items-center rounded-control px-3 text-body font-semibold text-content"
                    >
                      {entrada.etiqueta}
                    </Link>
                  </li>
                ),
              )}
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
