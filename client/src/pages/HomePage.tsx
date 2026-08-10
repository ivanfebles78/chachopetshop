import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Award, HelpCircle, Sparkles, Star, Tag, Truck } from 'lucide-react';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { Reveal } from '@/components/Reveal';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';

const ANIMALS = [
  { slug: 'perro', label: 'Perros', emoji: '🐶' },
  { slug: 'gato', label: 'Gatos', emoji: '🐱' },
  { slug: 'ave', label: 'Aves', emoji: '🐦' },
  { slug: 'roedor', label: 'Roedores', emoji: '🐹' },
  { slug: 'pez', label: 'Peces', emoji: '🐠' },
  { slug: 'reptil', label: 'Reptiles', emoji: '🦎' },
];

const NEEDS = [
  ['alergias', 'Alergias'],
  ['control-peso', 'Control de peso'],
  ['articulaciones', 'Articulaciones'],
  ['esterilizado', 'Esterilizado'],
  ['dental', 'Dental'],
  ['cachorro', 'Cachorro'],
  ['senior', 'Senior'],
  ['digestivo', 'Digestivo'],
];

const TRUST = [
  { icon: Award, title: 'Expertos en nutrición', text: 'Asesoramiento para tu mascota' },
  { icon: Truck, title: 'Entrega 24-48h', text: 'Envío gratis desde 49€' },
  { icon: Star, title: 'Marcas premium', text: 'Las mejores del mercado' },
];

export function HomePage() {
  const { data: featured, loading } = useFetch(() => api.products({ bestseller: true, pageSize: 8 }), []);
  const { data: taxonomy } = useFetch(() => api.taxonomy(), []);

  return (
    <div className="overflow-x-clip">
      <Hero />
      <TrustBar />
      <AnimalGrid />
      <BestsellerSection products={featured?.items} loading={loading} />
      <NeedsBand />
      <BrandMarquee brands={taxonomy?.brands.map((b) => b.name) ?? []} />
      <CtaBoxes />
      <Newsletter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-16 top-8 h-72 w-72 animate-blob rounded-full bg-sky-400/20 blur-3xl" />
        <div className="absolute right-0 top-0 h-80 w-80 animate-blob rounded-full bg-amber-400/20 blur-3xl [animation-delay:5s]" />
      </div>

      <div className="container-page pt-6 sm:pt-8">
        {/* Banner de marca protagonista */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden rounded-4xl border border-brand-900/[0.06] bg-white shadow-lift"
        >
          <img
            src="/banner-chacho.png"
            alt="Chacho Pet Shop — Nutrición adaptada a tu mascota"
            className="w-full object-cover"
            loading="eager"
          />
        </motion.div>

        {/* Titular + CTAs */}
        <div className="mx-auto max-w-3xl py-8 text-center sm:py-10">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="chip border-sky-500/25 bg-sky-500/10 text-brand-700"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Nutrición adaptada a tu mascota
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl"
          >
            Todo para <span className="text-brand-700">perros, gatos</span> y muchas más mascotas
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="mx-auto mt-4 max-w-xl text-lg text-brand-900/70"
          >
            Piensos, dietas veterinarias y accesorios de las mejores marcas. Filtra por animal,
            tipo de dieta y necesidad de salud.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.36 }}
            className="mt-7 flex flex-wrap items-center justify-center gap-3"
          >
            <Link to="/tienda" className="btn-primary px-7 py-3.5 text-base">
              Explorar tienda <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/tienda?category=dietas-veterinarias" className="btn-ghost px-7 py-3.5 text-base">
              Dietas veterinarias
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function TrustBar() {
  return (
    <section className="container-page">
      <div className="grid gap-3 rounded-4xl bg-brand-800 p-4 text-cream sm:grid-cols-3 sm:p-2">
        {TRUST.map((item) => (
          <div key={item.title} className="flex items-center gap-3 rounded-3xl px-4 py-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-ink">
              <item.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-sm font-bold">{item.title}</p>
              <p className="text-xs text-cream/70">{item.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AnimalGrid() {
  return (
    <section className="container-page py-10">
      <Reveal>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {ANIMALS.map((a) => (
            <Link
              key={a.slug}
              to={`/tienda?animal=${a.slug}`}
              className="group flex flex-col items-center gap-2 rounded-4xl border border-brand-900/[0.06] bg-white p-4 text-center shadow-soft transition-all hover:-translate-y-1 hover:border-sky-400 hover:shadow-lift"
            >
              <span className="text-3xl transition-transform duration-300 group-hover:scale-125">{a.emoji}</span>
              <span className="text-sm font-semibold text-brand-900">{a.label}</span>
            </Link>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

function BestsellerSection({ products, loading }: { products?: import('@/lib/types').Product[]; loading: boolean }) {
  return (
    <section className="container-page py-10">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <span className="text-sm font-bold uppercase tracking-wide text-amber-600">Los más vendidos</span>
          <h2 className="mt-1 font-display text-3xl font-bold text-ink sm:text-4xl">Favoritos de la manada</h2>
        </div>
        <Link to="/tienda" className="hidden shrink-0 items-center gap-1 font-semibold text-brand-700 hover:text-brand-800 sm:flex">
          Ver todo <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
          : products?.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
      </div>
    </section>
  );
}

function NeedsBand() {
  return (
    <section className="container-page py-8">
      <Reveal className="rounded-5xl bg-brand-700 p-8 text-cream sm:p-12">
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Compra por necesidad</h2>
            <p className="mt-2 max-w-md text-cream/70">Filtra por lo que de verdad importa: la salud de tu mascota.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {NEEDS.map(([slug, label]) => (
              <Link
                key={slug}
                to={`/tienda?need=${slug}`}
                className="rounded-full border border-cream/20 bg-cream/5 px-4 py-2 text-sm font-medium text-cream transition-colors hover:border-amber-400 hover:bg-amber-500 hover:text-ink"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function BrandMarquee({ brands }: { brands: string[] }) {
  if (!brands.length) return null;
  const doubled = [...brands, ...brands];
  return (
    <section className="py-12">
      <p className="container-page mb-6 text-center text-sm font-semibold uppercase tracking-wider text-brand-900/40">
        Trabajamos con las mejores marcas
      </p>
      <div className="mask-fade-x flex overflow-hidden">
        <div className="flex animate-marquee gap-4 pr-4">
          {doubled.map((name, i) => (
            <span key={i} className="flex shrink-0 items-center rounded-2xl border border-brand-900/[0.06] bg-white px-6 py-3 font-display text-lg font-bold text-brand-800/70 shadow-soft">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaBoxes() {
  return (
    <section className="container-page py-10">
      <div className="grid gap-4 lg:grid-cols-2">
        <Reveal>
          <Link
            to="/tienda?featured=1"
            className="group relative flex h-full min-h-[220px] flex-col justify-between overflow-hidden rounded-5xl bg-amber-500 p-8 text-ink"
          >
            <Tag className="h-8 w-8" />
            <div>
              <h3 className="font-display text-3xl font-bold">Las mejores promociones</h3>
              <p className="mt-2 max-w-sm text-ink/70">Descuentos en selección de piensos, snacks y accesorios. Aprovéchalos.</p>
              <span className="mt-4 inline-flex items-center gap-1 font-semibold">Ver ofertas <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
            </div>
          </Link>
        </Reveal>
        <Reveal delay={0.1}>
          <a
            href="tel:+34922000000"
            className="group relative flex h-full min-h-[220px] flex-col justify-between overflow-hidden rounded-5xl bg-brand-800 p-8 text-cream"
          >
            <HelpCircle className="h-8 w-8 text-amber-400" />
            <div>
              <h3 className="font-display text-3xl font-bold">¿Tienes alguna duda?</h3>
              <p className="mt-2 max-w-sm text-cream/70">Te ayudamos a elegir la mejor nutrición para tu mascota. Llámanos o escríbenos.</p>
              <span className="mt-4 inline-flex items-center gap-1 font-semibold text-amber-400">Contactar <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
            </div>
          </a>
        </Reveal>
      </div>
    </section>
  );
}

function Newsletter() {
  return (
    <section className="container-page py-10">
      <Reveal className="card flex flex-col items-center gap-5 rounded-5xl px-6 py-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 text-2xl">📬</span>
        <h2 className="font-display text-3xl font-bold text-ink">Únete a la manada</h2>
        <p className="max-w-md text-brand-900/60">
          Consejos de nutrición, novedades y un <strong className="text-brand-700">10% en tu primer pedido</strong>.
        </p>
        <form onSubmit={(e) => e.preventDefault()} className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
          <input type="email" required placeholder="tu@email.com" className="flex-1 rounded-full border border-brand-900/10 bg-white px-5 py-3 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20" />
          <button type="submit" className="btn-primary px-7 py-3">Suscribirme</button>
        </form>
      </Reveal>
    </section>
  );
}
