import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Star, Truck } from 'lucide-react';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { Reveal } from '@/components/Reveal';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';

const ANIMALS = [
  { slug: 'perro', label: 'Perros', emoji: '🐶', tint: 'from-brand-400/20 to-brand-600/10' },
  { slug: 'gato', label: 'Gatos', emoji: '🐱', tint: 'from-amber-400/25 to-amber-500/10' },
  { slug: 'ave', label: 'Aves', emoji: '🐦', tint: 'from-sky-400/20 to-sky-500/10' },
  { slug: 'roedor', label: 'Roedores', emoji: '🐹', tint: 'from-rose-400/20 to-rose-500/10' },
  { slug: 'pez', label: 'Peces', emoji: '🐠', tint: 'from-cyan-400/20 to-cyan-500/10' },
  { slug: 'reptil', label: 'Reptiles', emoji: '🦎', tint: 'from-lime-400/20 to-lime-500/10' },
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

export function HomePage() {
  const { data: featured, loading } = useFetch(() => api.products({ bestseller: true, pageSize: 8 }), []);
  const { data: taxonomy } = useFetch(() => api.taxonomy(), []);

  return (
    <div className="overflow-x-clip">
      <Hero />
      <AnimalGrid />
      <BestsellerSection products={featured?.items} loading={loading} />
      <NeedsBand />
      <BrandMarquee brands={taxonomy?.brands.map((b) => b.name) ?? []} />
      <PromoBento />
      <Newsletter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative">
      {/* Fondo con degradado en malla + blobs animados */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-20 top-10 h-72 w-72 animate-blob rounded-full bg-brand-300/40 blur-3xl" />
        <div className="absolute right-0 top-0 h-80 w-80 animate-blob rounded-full bg-amber-400/30 blur-3xl [animation-delay:4s]" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 animate-blob rounded-full bg-brand-500/20 blur-3xl [animation-delay:8s]" />
      </div>

      <div className="container-page grid items-center gap-10 py-14 md:py-20 lg:grid-cols-2">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="chip border-brand-600/20 bg-white/70 text-brand-700"
          >
            <Sparkles className="h-3.5 w-3.5" /> Nutrición premium · Envío 24-48h
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mt-5 font-display text-5xl font-extrabold leading-[1.02] tracking-tight text-ink sm:text-6xl lg:text-7xl"
          >
            Lo mejor para
            <br />
            <span className="relative inline-block text-brand-600">
              tu mejor amigo
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                <motion.path
                  d="M2 9C60 3 240 3 298 9"
                  stroke="#f59e0b"
                  strokeWidth="4"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </svg>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-6 max-w-md text-lg text-brand-900/70"
          >
            Piensos naturales, dietas veterinarias y accesorios de las mejores marcas.
            Filtrado inteligente por animal, dieta y necesidad de salud.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link to="/tienda" className="btn-primary px-7 py-3.5 text-base">
              Explorar tienda <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/tienda?category=dietas-veterinarias" className="btn-ghost px-7 py-3.5 text-base">
              Dietas veterinarias
            </Link>
          </motion.div>

          <div className="mt-8 flex items-center gap-6 text-sm text-brand-900/60">
            <span className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> 4.8/5 · +2.400 reseñas
            </span>
            <span className="flex items-center gap-1.5">
              <Truck className="h-4 w-4 text-brand-600" /> Envío gratis +49€
            </span>
          </div>
        </div>

        {/* Collage flotante */}
        <div className="relative hidden h-[440px] lg:block">
          <FloatingCard className="left-4 top-4 h-56 w-44 rotate-[-6deg]" seed="hero-a" delay={0} />
          <FloatingCard className="right-8 top-0 h-64 w-52 rotate-[5deg]" seed="hero-b" delay={0.4} />
          <FloatingCard className="bottom-0 left-24 h-60 w-52 rotate-[3deg]" seed="hero-c" delay={0.8} />
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.9, type: 'spring' }}
            className="absolute bottom-16 right-6 flex items-center gap-3 rounded-2xl bg-white/90 px-4 py-3 shadow-lift backdrop-blur"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-lg">🐾</span>
            <div>
              <p className="text-xs text-brand-900/50">Clientes felices</p>
              <p className="font-display font-bold text-ink">+12.000 mascotas</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function FloatingCard({ className, seed, delay }: { className: string; seed: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={`absolute overflow-hidden rounded-4xl border-4 border-white shadow-lift ${className}`}
    >
      <div className="animate-float h-full w-full" style={{ animationDelay: `${delay}s` }}>
        <img
          src={`https://picsum.photos/seed/nutripet-${seed}/400/500`}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
    </motion.div>
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
              className={`group flex flex-col items-center gap-2 rounded-4xl border border-brand-900/[0.06] bg-gradient-to-b ${a.tint} p-4 text-center shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift`}
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
    <section className="container-page py-14">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <span className="text-sm font-bold uppercase tracking-wide text-brand-600">Los más vendidos</span>
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
      <Reveal className="rounded-5xl bg-brand-900 p-8 text-cream sm:p-12">
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Compra por necesidad</h2>
            <p className="mt-2 max-w-md text-cream/70">
              Filtra por lo que de verdad importa: la salud de tu mascota.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {NEEDS.map(([slug, label]) => (
              <Link
                key={slug}
                to={`/tienda?need=${slug}`}
                className="rounded-full border border-cream/20 bg-cream/5 px-4 py-2 text-sm font-medium text-cream transition-colors hover:border-amber-400 hover:bg-amber-400 hover:text-ink"
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
            <span
              key={i}
              className="flex shrink-0 items-center rounded-2xl border border-brand-900/[0.06] bg-white/70 px-6 py-3 font-display text-lg font-bold text-brand-900/70 shadow-soft"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function PromoBento() {
  return (
    <section className="container-page py-14">
      <div className="grid gap-4 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <Link
            to="/tienda?category=dietas-veterinarias"
            className="group relative flex h-full min-h-[280px] flex-col justify-end overflow-hidden rounded-5xl bg-brand-700 p-8 text-cream"
          >
            <img
              src="https://picsum.photos/seed/nutripet-promo-vet/900/600"
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-30 transition-transform duration-700 group-hover:scale-105"
            />
            <div className="relative">
              <span className="chip border-cream/20 bg-cream/10 text-cream">Recomendado por veterinarios</span>
              <h3 className="mt-4 max-w-sm font-display text-3xl font-bold">Dietas veterinarias a un clic</h3>
              <p className="mt-2 max-w-sm text-cream/80">Urinary, renal, gastrointestinal y más. Nutrición clínica de confianza.</p>
              <span className="mt-4 inline-flex items-center gap-1 font-semibold">Descubrir <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
            </div>
          </Link>
        </Reveal>
        <Reveal delay={0.1}>
          <Link
            to="/tienda?featured=1"
            className="group relative flex h-full min-h-[280px] flex-col justify-end overflow-hidden rounded-5xl bg-amber-500 p-8 text-ink"
          >
            <div className="relative">
              <span className="chip border-ink/10 bg-ink/5 text-ink">Ofertas de la semana</span>
              <h3 className="mt-4 font-display text-3xl font-bold">Hasta -30% en selección</h3>
              <p className="mt-2 text-ink/70">Aprovecha antes de que se agoten.</p>
              <span className="mt-4 inline-flex items-center gap-1 font-semibold">Ver ofertas <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
            </div>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

function Newsletter() {
  return (
    <section className="container-page py-10">
      <Reveal className="card flex flex-col items-center gap-5 rounded-5xl px-6 py-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-2xl">📬</span>
        <h2 className="font-display text-3xl font-bold text-ink">Únete a la manada</h2>
        <p className="max-w-md text-brand-900/60">
          Consejos de nutrición, novedades y un <strong className="text-brand-700">10% en tu primer pedido</strong>.
        </p>
        <form onSubmit={(e) => e.preventDefault()} className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
          <input
            type="email"
            required
            placeholder="tu@email.com"
            className="flex-1 rounded-full border border-brand-900/10 bg-white px-5 py-3 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
          <button type="submit" className="btn-primary px-7 py-3">Suscribirme</button>
        </form>
      </Reveal>
    </section>
  );
}
