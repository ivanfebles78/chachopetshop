import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, User, X } from 'lucide-react';
import { useOverlay } from '@/lib/useOverlay';
import { MENU_PRINCIPAL, type ItemMenu } from '@/lib/menuPrincipal';

/**
 * NAVEGACIÓN MÓVIL.
 *
 * La misma estructura fija que el menú de escritorio (`lib/menuPrincipal`), pero
 * recorrida por NIVELES: en el móvil no cabe un flyout, así que al pulsar una
 * sección con hijos se entra en ella (drill-down) y el botón de atrás vuelve.
 *
 * `useOverlay` atrapa el foco, cierra con Escape, devuelve el foco al botón que
 * abrió y bloquea el desplazamiento del fondo.
 */

type Nivel = { titulo: string; items: ItemMenu[] };

export function MobileNav({ conSesion, onClose }: { conSesion: boolean; onClose: () => void }) {
  const [pila, setPila] = useState<Nivel[]>([{ titulo: 'Menú', items: MENU_PRINCIPAL }]);
  const actual = pila[pila.length - 1]!;
  const panel = useOverlay(true, onClose);

  const entrar = (item: ItemMenu) => setPila((p) => [...p, { titulo: item.etiqueta, items: item.hijos! }]);
  const volver = () => setPila((p) => (p.length > 1 ? p.slice(0, -1) : p));

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
          {pila.length > 1 ? (
            <button
              type="button"
              onClick={volver}
              className="inline-flex min-h-12 items-center gap-1.5 rounded-control px-2 text-body font-semibold text-content"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              {actual.titulo}
            </button>
          ) : (
            <span className="px-2 font-display text-heading font-bold text-brand-700">Menú</span>
          )}
          <button type="button" onClick={onClose} className="btn-icon" aria-label="Cerrar menú">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Catálogo" className="flex-1 overflow-y-auto overscroll-contain p-3">
          <ul className="list-none space-y-1 p-0">
            {actual.items.map((item) => {
              const Icono = item.icono ?? item.iconoHijo;
              const contenido = (
                <>
                  {Icono && <Icono className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />}
                  <span className="flex-1 text-left">{item.etiqueta}</span>
                </>
              );
              return (
                <li key={item.etiqueta}>
                  {item.hijos ? (
                    <button
                      type="button"
                      onClick={() => entrar(item)}
                      className="flex min-h-12 w-full items-center gap-2.5 rounded-control px-3 text-body font-semibold text-content hover:bg-brand-50"
                    >
                      {contenido}
                      <ChevronRight className="h-5 w-5 shrink-0 text-content-subtle" aria-hidden="true" />
                    </button>
                  ) : (
                    <Link
                      to={item.href ?? '#'}
                      onClick={onClose}
                      className="flex min-h-12 items-center gap-2.5 rounded-control px-3 text-body font-semibold text-content hover:bg-brand-50"
                    >
                      {contenido}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
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
