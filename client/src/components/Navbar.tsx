import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Search, ShoppingBag, Truck, User } from 'lucide-react';
import { selectCount, useCart } from '@/store/cart';
import { useAuth } from '@/store/auth';
import { MenuPrincipal } from './MenuPrincipal';
import { MobileNav } from './MobileNav';

/**
 * CABECERA DE LA TIENDA.
 *
 * El menú superior es ahora una estructura FIJA y curada (ver `MenuPrincipal` y
 * `lib/menuPrincipal`): Alimentación, Cosméticos, Accesorios, Antiparasitarios,
 * Marcas y Contacto, con sus submenús en cascada que se abren a la derecha. El
 * buscador está siempre, también en móvil.
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

export function Navbar() {
  const count = useCart(selectCount);
  const openCart = useCart((s) => s.open);
  const { user } = useAuth();
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
      {/* Barra de utilidad. */}
      <div className="bg-brand-800 text-content-inverse">
        <div className="container-page flex min-h-9 flex-wrap items-center justify-between gap-x-4 py-1.5 text-caption">
          <span className="flex items-center gap-2">
            <Truck className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
            Envío 24-48h en Canarias · Gratis desde 30&nbsp;€
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

        <MenuPrincipal />

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
