import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { selectCount, useCart } from '@/store/cart';
import { useAuth } from '@/store/auth';
import { cn } from '@/lib/cn';

const LINKS = [
  { to: '/tienda?animal=perro', label: 'Perros' },
  { to: '/tienda?animal=gato', label: 'Gatos' },
  { to: '/tienda?animal=ave', label: 'Aves' },
  { to: '/tienda?category=dietas-veterinarias', label: 'Dietas vet.' },
  { to: '/tienda?featured=1', label: 'Ofertas' },
];

export function Navbar() {
  const count = useCart(selectCount);
  const openCart = useCart((s) => s.open);
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/tienda?q=${encodeURIComponent(q)}`);
    setMobileOpen(false);
  };

  return (
    <header className="glass-nav sticky top-0 z-40">
      <div className="container-page flex h-16 items-center gap-4 md:h-20">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-extrabold text-brand-800">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-cream">🐾</span>
          NutriPet
        </Link>

        <nav className="ml-4 hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className="rounded-full px-3.5 py-2 text-sm font-semibold text-brand-900/70 transition-colors hover:bg-brand-900/5 hover:text-brand-800"
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <form onSubmit={submitSearch} className="ml-auto hidden max-w-xs flex-1 items-center md:flex">
          <div className="flex w-full items-center gap-2 rounded-full border border-brand-900/10 bg-white/70 px-4 py-2 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
            <Search className="h-4 w-4 text-brand-900/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar pienso, marca…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-brand-900/40"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link
            to={user ? '/cuenta' : '/login'}
            className="hidden rounded-full p-2.5 text-brand-900/70 transition-colors hover:bg-brand-900/5 hover:text-brand-800 sm:block"
            aria-label="Mi cuenta"
          >
            <User className="h-5 w-5" />
          </Link>
          <button
            onClick={openCart}
            className="relative rounded-full p-2.5 text-brand-900/70 transition-colors hover:bg-brand-900/5 hover:text-brand-800"
            aria-label="Abrir carrito"
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <motion.span
                key={count}
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-xs font-bold text-ink"
              >
                {count}
              </motion.span>
            )}
          </button>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-full p-2.5 text-brand-900/70 hover:bg-brand-900/5 lg:hidden"
            aria-label="Menú"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="overflow-hidden border-t border-brand-900/10 bg-cream lg:hidden"
        >
          <div className="container-page space-y-1 py-4">
            <form onSubmit={submitSearch} className="mb-3 flex items-center gap-2 rounded-full border border-brand-900/10 bg-white px-4 py-2.5">
              <Search className="h-4 w-4 text-brand-900/40" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar…"
                className="w-full bg-transparent text-sm outline-none"
              />
            </form>
            {LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setMobileOpen(false)}
                className={cn('block rounded-xl px-4 py-2.5 font-semibold text-brand-900/80 hover:bg-brand-900/5')}
              >
                {l.label}
              </Link>
            ))}
            <Link to={user ? '/cuenta' : '/login'} onClick={() => setMobileOpen(false)} className="block rounded-xl px-4 py-2.5 font-semibold text-brand-900/80 hover:bg-brand-900/5">
              {user ? 'Mi cuenta' : 'Iniciar sesión'}
            </Link>
          </div>
        </motion.div>
      )}
    </header>
  );
}
