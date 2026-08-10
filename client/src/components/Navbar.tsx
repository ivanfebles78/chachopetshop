import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronDown, Menu, Phone, Search, ShoppingBag, Truck, User, X } from 'lucide-react';
import { selectCount, useCart } from '@/store/cart';
import { useAuth } from '@/store/auth';

const t = (params: string) => `/tienda?${params}`;

type Col = { title: string; links: [string, string][] };
type MenuEntry = { label: string; href?: string; cols?: Col[]; footer?: [string, string] };

const MENU: MenuEntry[] = [
  {
    label: 'Perros',
    cols: [
      { title: 'Alimentación', links: [['Pienso seco', t('animal=perro&category=alimentacion-seca')], ['Comida húmeda', t('animal=perro&category=alimentacion-humeda')], ['Semihúmeda', t('animal=perro&category=semihumeda')]] },
      { title: 'Cuidado', links: [['Premios y snacks', t('animal=perro&category=premios-snacks')], ['Suplementos y salud', t('animal=perro&category=suplementos')], ['Higiene y cosmética', t('animal=perro&category=higiene')]] },
      { title: 'Más', links: [['Accesorios', t('animal=perro&category=accesorios')], ['Camas y descanso', t('animal=perro&category=camas')], ['Dietas veterinarias', t('animal=perro&category=dietas-veterinarias')]] },
    ],
    footer: ['Ver todo para perros', t('animal=perro')],
  },
  {
    label: 'Gatos',
    cols: [
      { title: 'Alimentación', links: [['Pienso seco', t('animal=gato&category=alimentacion-seca')], ['Comida húmeda', t('animal=gato&category=alimentacion-humeda')], ['Semihúmeda', t('animal=gato&category=semihumeda')]] },
      { title: 'Cuidado', links: [['Premios y snacks', t('animal=gato&category=premios-snacks')], ['Suplementos y salud', t('animal=gato&category=suplementos')], ['Arena y aglomerantes', t('animal=gato&category=higiene')]] },
      { title: 'Más', links: [['Accesorios y rascadores', t('animal=gato&category=accesorios')], ['Camas y descanso', t('animal=gato&category=camas')], ['Dietas veterinarias', t('animal=gato&category=dietas-veterinarias')]] },
    ],
    footer: ['Ver todo para gatos', t('animal=gato')],
  },
  {
    label: 'Otras mascotas',
    cols: [
      { title: 'Mascotas', links: [['Aves', t('animal=ave')], ['Roedores', t('animal=roedor')], ['Peces', t('animal=pez')], ['Reptiles', t('animal=reptil')]] },
      { title: 'Para ellos', links: [['Alimentación', t('animal=ave&category=alimentacion-seca')], ['Snacks', t('animal=roedor&category=premios-snacks')], ['Accesorios', t('category=accesorios')]] },
    ],
    footer: ['Ver todas las mascotas', '/tienda'],
  },
  {
    label: 'Accesorios',
    cols: [
      { title: 'Por mascota', links: [['Perros', t('category=accesorios&animal=perro')], ['Gatos', t('category=accesorios&animal=gato')], ['Aves', t('category=accesorios&animal=ave')], ['Roedores', t('category=accesorios&animal=roedor')]] },
      { title: 'Categorías', links: [['Camas y descanso', t('category=camas')], ['Transporte y viaje', t('category=transporte')], ['Higiene y cosmética', t('category=higiene')]] },
    ],
    footer: ['Ver todos los accesorios', t('category=accesorios')],
  },
  { label: 'Dietas veterinarias', href: t('category=dietas-veterinarias') },
  { label: 'Ofertas', href: t('featured=1') },
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
    <header className="sticky top-0 z-40">
      {/* Barra superior */}
      <div className="bg-brand-800 text-cream/90">
        <div className="container-page flex h-9 items-center justify-between text-xs font-medium">
          <span className="flex items-center gap-2"><Truck className="h-3.5 w-3.5 text-amber-400" /> Envío 24-48h en Canarias · Gratis desde 49€</span>
          <a href="tel:+34922000000" className="hidden items-center gap-2 hover:text-amber-400 sm:flex"><Phone className="h-3.5 w-3.5" /> 922 00 00 00</a>
        </div>
      </div>

      {/* Barra principal */}
      <div className="glass-nav">
        <div className="container-page flex h-16 items-center gap-4 md:h-20">
          <Logo />

          <nav className="ml-2 hidden items-center xl:flex">
            {MENU.map((entry) => (
              <MegaItem key={entry.label} entry={entry} />
            ))}
          </nav>

          <form onSubmit={submitSearch} className="ml-auto hidden max-w-[13rem] flex-1 items-center lg:flex">
            <div className="flex w-full items-center gap-2 rounded-full border border-brand-900/10 bg-white/80 px-4 py-2 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20">
              <Search className="h-4 w-4 text-brand-900/40" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="w-full bg-transparent text-sm outline-none placeholder:text-brand-900/40" />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1 lg:ml-0">
            <Link to={user ? '/cuenta' : '/login'} className="hidden rounded-full p-2.5 text-brand-800/80 transition-colors hover:bg-brand-900/5 hover:text-brand-700 sm:block" aria-label="Mi cuenta">
              <User className="h-5 w-5" />
            </Link>
            <button onClick={openCart} className="relative rounded-full p-2.5 text-brand-800/80 transition-colors hover:bg-brand-900/5 hover:text-brand-700" aria-label="Abrir carrito">
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <motion.span key={count} initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-xs font-bold text-ink">
                  {count}
                </motion.span>
              )}
            </button>
            <button onClick={() => setMobileOpen((v) => !v)} className="rounded-full p-2.5 text-brand-800/80 hover:bg-brand-900/5 xl:hidden" aria-label="Menú">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && <MobileMenu onClose={() => setMobileOpen(false)} onSearch={submitSearch} q={q} setQ={setQ} loggedIn={!!user} />}
    </header>
  );
}

function Logo() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="Chacho Pet Shop — inicio">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-700 text-lg shadow-soft">🐾</span>
      <span className="leading-none">
        <span className="block bg-gradient-to-b from-sky-400 via-sky-500 to-amber-500 bg-clip-text font-display text-2xl font-extrabold tracking-tight text-transparent">
          CHACHO
        </span>
        <span className="block text-[0.58rem] font-bold uppercase tracking-[0.35em] text-brand-700">Pet Shop</span>
      </span>
    </Link>
  );
}

function MegaItem({ entry }: { entry: MenuEntry }) {
  if (entry.href) {
    return (
      <Link to={entry.href} className="rounded-full px-3.5 py-2 text-sm font-semibold text-brand-800/80 transition-colors hover:bg-brand-900/5 hover:text-brand-700">
        {entry.label}
      </Link>
    );
  }
  return (
    <div className="group relative">
      <button className="flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-semibold text-brand-800/80 transition-colors hover:bg-brand-900/5 hover:text-brand-700 group-hover:text-brand-700">
        {entry.label}
        <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
      </button>
      {/* Panel */}
      <div className="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="w-max max-w-[42rem] rounded-3xl border border-brand-900/10 bg-white p-5 shadow-lift">
          <div className="flex gap-8">
            {entry.cols?.map((col) => (
              <div key={col.title} className="min-w-[10rem]">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-600">{col.title}</p>
                <ul className="space-y-1">
                  {col.links.map(([label, href]) => (
                    <li key={label}>
                      <Link to={href} className="block rounded-lg px-2 py-1.5 text-sm font-medium text-brand-900/75 transition-colors hover:bg-brand-50 hover:text-brand-700">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {entry.footer && (
            <Link to={entry.footer[1]} className="mt-4 flex items-center justify-center gap-1 rounded-xl bg-brand-700 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-brand-800">
              {entry.footer[0]}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function MobileMenu({
  onClose, onSearch, q, setQ, loggedIn,
}: { onClose: () => void; onSearch: (e: React.FormEvent) => void; q: string; setQ: (v: string) => void; loggedIn: boolean }) {
  return (
    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden border-t border-brand-900/10 bg-white xl:hidden">
      <div className="container-page max-h-[75vh] space-y-4 overflow-y-auto py-4">
        <form onSubmit={onSearch} className="flex items-center gap-2 rounded-full border border-brand-900/10 bg-cream px-4 py-2.5">
          <Search className="h-4 w-4 text-brand-900/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="w-full bg-transparent text-sm outline-none" />
        </form>
        {MENU.map((entry) =>
          entry.href ? (
            <Link key={entry.label} to={entry.href} onClick={onClose} className="block rounded-xl px-2 py-2 font-bold text-brand-800 hover:bg-brand-50">
              {entry.label}
            </Link>
          ) : (
            <div key={entry.label}>
              <p className="px-2 py-1 font-display font-bold text-brand-800">{entry.label}</p>
              <div className="flex flex-wrap gap-2 px-2 pb-2">
                {entry.cols?.flatMap((c) => c.links).map(([label, href]) => (
                  <Link key={label + href} to={href} onClick={onClose} className="rounded-full border border-brand-900/10 bg-cream px-3 py-1 text-sm font-medium text-brand-900/75 hover:border-brand-500 hover:text-brand-700">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ),
        )}
        <Link to={loggedIn ? '/cuenta' : '/login'} onClick={onClose} className="block rounded-xl px-2 py-2 font-bold text-brand-800 hover:bg-brand-50">
          {loggedIn ? 'Mi cuenta' : 'Iniciar sesión'}
        </Link>
      </div>
    </motion.div>
  );
}
