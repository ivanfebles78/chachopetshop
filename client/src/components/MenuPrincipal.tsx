import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { MENU_PRINCIPAL, type ItemMenu } from '@/lib/menuPrincipal';

/**
 * EL MENÚ SUPERIOR (escritorio) — mega-menú en cascada.
 *
 * Estructura FIJA (ver `lib/menuPrincipal`). Apertura:
 *   · Un elemento de la barra con hijos abre su panel JUSTO DEBAJO.
 *   · Dentro, cualquier fila con hijos abre los suyos en un panel flotante A LA
 *     DERECHA —nunca hacia abajo—.
 *
 * Se abre al pasar el ratón y al recibir el foco (teclado), y se cierra al salir
 * el ratón, al salir el foco del bloque, con Escape o al seguir un enlace. Entre
 * el disparador y el panel hay un «puente» de padding para que no se cierre al
 * cruzar el hueco.
 */
export function MenuPrincipal() {
  return (
    <nav aria-label="Catálogo" className="hidden items-center gap-0.5 lg:flex">
      {MENU_PRINCIPAL.map((item) => (
        <ItemBarra key={item.etiqueta} item={item} />
      ))}
    </nav>
  );
}

/** Un elemento de primer nivel: enlace directo, o disparador de un panel. */
function ItemBarra({ item }: { item: ItemMenu }) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const Icono = item.icono;

  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, [abierto]);

  if (!item.hijos) {
    return (
      <Link to={item.href ?? '#'} className="nav-link">
        {Icono && <Icono className="h-4 w-4 text-brand-600" aria-hidden="true" />}
        {item.etiqueta}
      </Link>
    );
  }

  const cerrar = () => setAbierto(false);
  const alPerderFoco = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setAbierto(false);
  };

  return (
    <div
      ref={contenedor}
      className="relative"
      onMouseEnter={() => setAbierto(true)}
      onMouseLeave={() => setAbierto(false)}
      onFocus={() => setAbierto(true)}
      onBlur={alPerderFoco}
    >
      <button
        type="button"
        className="nav-link"
        aria-expanded={abierto}
        aria-haspopup="true"
        onClick={() => setAbierto((v) => !v)}
      >
        {Icono && <Icono className="h-4 w-4 text-brand-600" aria-hidden="true" />}
        {item.etiqueta}
        <ChevronDown
          className={`h-4 w-4 text-content-subtle transition-transform ${abierto ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {abierto && (
        // El puente: `pt-2` mantiene el hover continuo entre el botón y el panel.
        <div className="absolute left-0 top-full z-50 pt-2">
          <PanelNivel items={item.hijos} cerrar={cerrar} />
        </div>
      )}
    </div>
  );
}

/**
 * Un panel de opciones. Una fila con hijos abre OTRO panel a su derecha; una
 * fila hoja es un enlace. Se reutiliza para cada nivel de la cascada.
 */
function PanelNivel({ items, cerrar }: { items: ItemMenu[]; cerrar: () => void }) {
  return (
    <ul className="min-w-[15rem] animate-slide-up list-none space-y-0.5 rounded-card border border-edge-subtle bg-surface p-2 shadow-raised">
      {items.map((sub) => (
        <FilaPanel key={sub.etiqueta} item={sub} cerrar={cerrar} />
      ))}
    </ul>
  );
}

/** Una fila dentro de un panel. Con hijos: enlace + flyout a la derecha. */
function FilaPanel({ item, cerrar }: { item: ItemMenu; cerrar: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const IconoHijo = item.iconoHijo;

  const contenido = (
    <>
      {IconoHijo && <IconoHijo className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />}
      <span className="flex-1 truncate">{item.etiqueta}</span>
    </>
  );

  // Hoja: enlace directo, sin flecha ni flyout.
  if (!item.hijos) {
    return (
      <li>
        <Link
          to={item.href ?? '#'}
          onClick={cerrar}
          className="flex min-h-10 items-center gap-2.5 rounded-control px-3 text-body-sm font-medium text-content transition-colors hover:bg-brand-50 hover:text-brand-800"
        >
          {contenido}
        </Link>
      </li>
    );
  }

  // Con hijos: el nombre enlaza a su página y, al pasar el ratón o enfocarlo, se
  // abre su submenú A LA DERECHA.
  const alPerderFoco = (e: React.FocusEvent<HTMLLIElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setAbierto(false);
  };

  return (
    <li
      className="relative"
      onMouseEnter={() => setAbierto(true)}
      onMouseLeave={() => setAbierto(false)}
      onFocus={() => setAbierto(true)}
      onBlur={alPerderFoco}
    >
      <Link
        to={item.href ?? '#'}
        onClick={cerrar}
        aria-haspopup="true"
        aria-expanded={abierto}
        className={`flex min-h-11 items-center gap-2.5 rounded-control px-3 text-body font-semibold transition-colors ${
          abierto ? 'bg-brand-50 text-brand-800' : 'text-content hover:bg-brand-50'
        }`}
      >
        {contenido}
        <ChevronRight className="h-4 w-4 shrink-0 text-content-subtle" aria-hidden="true" />
      </Link>

      {abierto && (
        // Puente `pl-2`: hover continuo al cruzar hacia el panel de la derecha.
        <div className="absolute left-full top-0 z-10 pl-2">
          <PanelNivel items={item.hijos} cerrar={cerrar} />
        </div>
      )}
    </li>
  );
}
