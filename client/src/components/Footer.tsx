import { Link } from 'react-router-dom';
import { Instagram, Facebook, Truck, ShieldCheck, Headphones, Leaf } from 'lucide-react';

const PERKS = [
  { icon: Truck, title: 'Envío gratis +49€', text: 'Entrega en 24-48h en Canarias' },
  { icon: ShieldCheck, title: 'Pago seguro', text: 'Stripe · tarjeta y Bizum' },
  { icon: Headphones, title: 'Asesoría veterinaria', text: 'Te ayudamos a elegir' },
  { icon: Leaf, title: 'Marcas premium', text: 'Nutrición natural y honesta' },
];

export function Footer() {
  return (
    <footer className="mt-24">
      <div className="container-page">
        <div className="grid gap-4 rounded-4xl border border-brand-900/[0.06] bg-white/70 p-6 shadow-soft sm:grid-cols-2 lg:grid-cols-4">
          {PERKS.map((p) => (
            <div key={p.title} className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
                <p.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-ink">{p.title}</p>
                <p className="text-xs text-brand-900/60">{p.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="container-page mt-16 grid gap-10 pb-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-extrabold text-brand-800">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-cream">🐾</span>
            Chacho
          </Link>
          <p className="mt-4 max-w-xs text-sm text-brand-900/60">
            Nutrición premium y accesorios para perros, gatos, aves y más. Cuidamos a quienes más quieres.
          </p>
          <div className="mt-4 flex gap-2">
            <a href="#" className="rounded-full border border-brand-900/10 p-2.5 text-brand-900/60 hover:bg-brand-900/5" aria-label="Instagram"><Instagram className="h-4 w-4" /></a>
            <a href="#" className="rounded-full border border-brand-900/10 p-2.5 text-brand-900/60 hover:bg-brand-900/5" aria-label="Facebook"><Facebook className="h-4 w-4" /></a>
          </div>
        </div>
        <FooterCol title="Comprar" links={[['Perros', '/tienda?animal=perro'], ['Gatos', '/tienda?animal=gato'], ['Aves', '/tienda?animal=ave'], ['Ofertas', '/tienda?featured=1']]} />
        <FooterCol title="Ayuda" links={[['Conócenos', '/conocenos'], ['Contacto', '/contacto'], ['Envíos y devoluciones', '/contacto'], ['Mi cuenta', '/cuenta']]} />
        <FooterCol title="Legal" links={[['Aviso legal', '#'], ['Privacidad', '#'], ['Cookies', '#'], ['Términos', '#']]} />
      </div>

      <div className="border-t border-brand-900/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-6 text-xs text-brand-900/50 sm:flex-row">
          <p>© {new Date().getFullYear()} Chacho Pet Shop. Todos los derechos reservados.</p>
          <p>Hecho con 💛 en Canarias</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand-900/70">{title}</h4>
      <ul className="space-y-2">
        {links.map(([label, to]) => (
          <li key={label}>
            <Link to={to} className="text-sm text-brand-900/60 transition-colors hover:text-brand-700">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
