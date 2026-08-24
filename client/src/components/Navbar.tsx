import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, Menu, Search, ShoppingBag, Truck, User, X } from 'lucide-react';
import { selectCount, useCart } from '@/store/cart';
import { useAuth } from '@/store/auth';
import { useNavegacion } from '@/lib/useNavegacion';
import type { EntradaNav } from '@/lib/navigation';
import { MobileNav } from './MobileNav';

/**
 * CABECERA DE LA TIENDA.
 *
 * Tres correcciones de fondo respecto a la anterior:
 *
 *   1. El menú SALE DEL CATÁLOGO (ver `lib/navigation.ts`). Antes era una lista
 *      escrita a mano con dos destinos que no llevaban a ningún producto.
 *
 *   2. Los desplegables se anuncian. Antes eran `<button>` sin ninguna relación
 *      declarada con el panel que abrían: quien no ve la pantalla no sabía que
 *      existía un submenú, ni si estaba abierto.
 *
 *      Se usa el patrón de DIVULGACIÓN —`aria-expanded` + `aria-controls` sobre
 *      un botón, y una lista de enlaces normal— y no `role="menu"`. Un menú
 *      ARIA es para acciones de aplicación y obliga a navegar con flechas; esto
 *      son enlaces de navegación, y el tabulador es lo que la gente espera.
 *
 *   3. El buscador está SIEMPRE, también en móvil. Antes sólo aparecía a partir
 *      de `lg` y en el cajón lateral: en el dispositivo donde más se compra
 *      había que abrir un menú para poder buscar.
 */

function Logo() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="Chacho Pet Shop, ir a la portada">
      <span className="flex h-10 w-10 items-center justify-center rounded-pill bg-brand-700 text-content-inverse">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <circle cx="7" cy="9" r="2.4" /><circle cx="12.4" cy="6.6" r="2.4" />
          <circle cx="17.6" cy="9.4" r="2.4" />
          <path d="M12 12c2.6 0 5.2 2.1 5.2 4.6 0 1.9-1.6 2.9-3.4 2.9-1 0-1.3-.4-1.8-.4s-.8.4-1.8.4c-1.8 0-3.4-1-3.4-2.9C6.8 14.1 9.4 12 12 12Z" />
        </svg>
      </span>
      <span className="leading-none">
        <span className="block font-display text-heading font-extrabold tracking-tight text-brand-700">CHACHO</span>
        <span className="block text-overline font-bold uppercase text-content-subtle">Pet Shop</span>
      </span>
    </Link>
  );
}

/** Un desplegable de la cabecera, con el patrón de divulgación. */
function Desplegable({ entrada }: { entrada: EntradaNav }) {
  /*
   * No basta con «abierto sí o no»: hace falta saber POR QUÉ está abierto.
   *
   * El puntero abre al pasar por encima y el clic alterna, y las dos cosas se
   * pelean, porque para pulsar hay que estar encima: al llegar al botón el
   * ratón ya lo había abierto, así que el clic lo cerraba y ABRIR CON EL RATÓN
   * ERA IMPOSIBLE. Con teclado no pasaba —no hay `mouseenter`—, de modo que el
   * fallo sólo salía con el ratón, que es como entra casi todo el mundo.
   *
   * Distinguiendo el motivo, el clic sólo cierra lo que el propio clic abrió.
   */
  const [modo, setModo] = useState<'cerrado' | 'puntero' | 'clic'>('cerrado');
  const abierto = modo !== 'cerrado';
  const setAbierto = (v: boolean) => setModo(v ? 'clic' : 'cerrado');
  const contenedor = useRef<HTMLDivElement>(null);
  const disparador = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  /* Escape cierra y devuelve el foco a quien abrió: si no, el foco se pierde. */
  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAbierto(false);
        disparador.current?.focus();
      }
    };
    const alPincharFuera = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('keydown', alPulsar);
    document.addEventListener('mousedown', alPincharFuera);
    return () => {
      document.removeEventListener('keydown', alPulsar);
      document.removeEventListener('mousedown', alPincharFuera);
    };
  }, [abierto]);

  /* Al salir con el tabulador del último enlace, el panel se cierra solo. */
  const alPerderFoco = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setAbierto(false);
  };

  if (!entrada.columnas) {
    return (
      <Link to={entrada.href} className="nav-link">
        {entrada.etiqueta}
      </Link>
    );
  }

  return (
    <div
      ref={contenedor}
      className="relative"
      /* El puntero sólo abre lo que estaba cerrado: nunca pisa un clic. */
      onMouseEnter={() => setModo((m) => (m === 'cerrado' ? 'puntero' : m))}
      /* Al salir se cierra, se hubiera abierto como se hubiera abierto. */
      onMouseLeave={() => setModo('cerrado')}
      onBlur={alPerderFoco}
    >
      <button
        ref={disparador}
        type="button"
        className="nav-link"
        aria-expanded={abierto}
        aria-controls={panelId}
        onClick={() => setModo((m) => (m === 'clic' ? 'cerrado' : 'clic'))}
      >
        {entrada.etiqueta}
        <ChevronDown className={`h-4 w-4 transition-transform ${abierto ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {abierto && (
        <div
          id={panelId}
          className="absolute left-0 top-full z-50 w-max min-w-[34rem] max-w-[46rem] animate-slide-up rounded-card border border-edge-subtle bg-surface p-5 shadow-raised"
        >
          <div className="grid grid-cols-3 gap-5">
            {entrada.columnas.map((col, i) => (
              <div key={`${col.titulo}-${i}`}>
                {col.titulo.trim() && <p className="menu-heading">{col.titulo}</p>}
                <ul className="list-none space-y-0.5 p-0">
                  {col.enlaces.map((enlace) => (
                    <li key={enlace.href}>
                      <Link to={enlace.href} className="menu-link" onClick={() => setAbierto(false)}>
                        <span>{enlace.etiqueta}</span>
                        {/*
                          El recuento sólo aparece si hay algo que contar.

                          Desde la Fase 2I el menú enseña la estructura comercial
                          completa, y muchas categorías todavía están vacías
                          porque la mercancía entra después. Un «0» junto a cada
                          nombre se lee como un error de la tienda, no como «aún
                          no hay». El nombre ya lleva el significado; el número
                          sólo aporta cuando es mayor que cero.
                        */}
                        {enlace.total > 0 && (
                          <span className="text-caption text-content-subtle" aria-hidden="true">
                            {enlace.total}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {entrada.verTodo && (
            <div className="mt-4 border-t border-edge-subtle pt-3">
              <Link to={entrada.verTodo.href} className="btn-link text-body-sm" onClick={() => setAbierto(false)}>
                {entrada.verTodo.etiqueta} →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const count = useCart(selectCount);
  const openCart = useCart((s) => s.open);
  const { user } = useAuth();
  const entradas = useNavegacion();
  const [movilAbierto, setMovilAbierto] = useState(false);
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const botonMenu = useRef<HTMLButtonElement>(null);

  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    navigate(`/tienda?q=${encodeURIComponent(q.trim())}`);
    setMovilAbierto(false);
  };

  return (
    <header className="site-header">
      {/*
        Barra de utilidad. El teléfono de relleno («922 00 00 00») se ha
        retirado: era un dato inventado y estaba publicado. Cuando exista el
        número real se añade aquí, junto a «Contacto». Ver el informe.
      */}
      <div className="bg-brand-800 text-content-inverse">
        <div className="container-page flex min-h-9 flex-wrap items-center justify-between gap-x-4 py-1.5 text-caption">
          <span className="flex items-center gap-2">
            <Truck className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
            Envío 24-48h en Canarias · Gratis desde 49&nbsp;€
          </span>
          <nav aria-label="Enlaces de ayuda" className="hidden items-center gap-4 sm:flex">
            <Link to="/conocenos" className="hover:text-amber-400">Conócenos</Link>
            <Link to="/contacto" className="hover:text-amber-400">Contacto</Link>
          </nav>
        </div>
      </div>

      {/* Barra principal */}
      <div className="container-page flex h-16 items-center gap-3 lg:h-20 lg:gap-5">
        <Logo />

        <nav aria-label="Catálogo" className="hidden items-center lg:flex">
          {entradas.map((entrada) => (
            <Desplegable key={entrada.etiqueta} entrada={entrada} />
          ))}
        </nav>

        {/*
          El buscador va a partir de `sm`. Por debajo, el ancho no da para el
          logotipo, el buscador y tres controles a la vez, así que baja a su
          propia fila (ver más abajo) en lugar de desaparecer.
        */}
        <form onSubmit={buscar} role="search" className="ml-auto hidden min-w-0 max-w-xs flex-1 sm:block">
          <label htmlFor="buscador-cabecera" className="sr-only">Buscar productos</label>
          <div className="flex items-center gap-2 rounded-control border border-edge bg-surface px-3 focus-within:border-brand-400">
            <Search className="h-4 w-4 shrink-0 text-content-subtle" aria-hidden="true" />
            <input
              id="buscador-cabecera"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar…"
              className="h-10 w-full min-w-0 bg-transparent text-body outline-none placeholder:text-content-subtle"
            />
          </div>
        </form>

        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:ml-0">
          <Link to={user ? '/cuenta' : '/login'} className="btn-icon" aria-label={user ? 'Mi cuenta' : 'Iniciar sesión'}>
            <User className="h-5 w-5" aria-hidden="true" />
          </Link>

          <button type="button" onClick={openCart} className="btn-icon relative" aria-label={`Abrir carrito, ${count} artículos`}>
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            {count > 0 && (
              <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-pill bg-amber-500 px-1 text-caption font-bold text-ink">
                {count}
              </span>
            )}
          </button>

          <button
            ref={botonMenu}
            type="button"
            onClick={() => setMovilAbierto(true)}
            className="btn-icon lg:hidden"
            aria-label="Abrir menú"
            aria-expanded={movilAbierto}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Buscador en su propia fila por debajo de `sm`: nunca desaparece. */}
      <div className="container-page pb-3 sm:hidden">
        <form onSubmit={buscar} role="search">
          <label htmlFor="buscador-movil" className="sr-only">Buscar productos</label>
          <div className="flex items-center gap-2 rounded-control border border-edge bg-surface px-3">
            <Search className="h-4 w-4 shrink-0 text-content-subtle" aria-hidden="true" />
            <input
              id="buscador-movil"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar en la tienda…"
              className="h-10 w-full min-w-0 bg-transparent text-body outline-none placeholder:text-content-subtle"
            />
          </div>
        </form>
      </div>

      {movilAbierto && (
        <MobileNav
          entradas={entradas}
          conSesion={Boolean(user)}
          onClose={() => {
            setMovilAbierto(false);
            botonMenu.current?.focus();
          }}
        />
      )}
    </header>
  );
}

export { X };
