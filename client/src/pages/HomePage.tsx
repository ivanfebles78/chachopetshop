import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bird,
  Cat,
  Clock,
  Dog,
  Fish,
  MapPin,
  MessageCircle,
  Phone,
  Rabbit,
  Send,
  Truck,
} from 'lucide-react';
import { useCatalogo } from '@/lib/useCatalogo';
import { categorias, mascotas, type Faceta } from '@/lib/portada';
import { rutaCatalogo } from '@/lib/navigation';
import { LOGO_MARCA } from '@/lib/marcas';
import { EMPRESA, enlaceTelefono, enlaceWhatsApp } from '@/lib/empresa';
import { api } from '@/lib/api';
import { eur } from '@/lib/cn';
import { esMarcaSoloEnTienda } from '@/lib/producto';
import { ImagenProducto } from '@/components/ImagenProducto';
import { ArteCategoria } from '@/components/ArteCategoria';
import { tipoDeCategoria } from '@/lib/imagenes';
import { toast } from '@/store/toast';
import type { Product } from '@/lib/types';

/**
 * PORTADA (landing). Sólo esta página.
 *
 * Se conserva el hero. El resto presenta la tienda de alimentación animal con
 * acceso equilibrado al catálogo que YA existe. Todo sale del catálogo (facetas
 * reales) o del contacto real de `lib/empresa.ts`.
 *
 * IMÁGENES: las fotos de mascota, la de la tienda y los logotipos de marca se
 * sirven desde `client/public` (rutas fijas más abajo). Mientras un fichero no
 * exista, cada bloque cae a un respaldo digno —icono o nombre— sin romperse, así
 * que la portada funciona con o sin las fotos.
 */

const FOTO = '/banner-chacho.jpeg';
const FOTO_ANCHO = 1600;
const FOTO_ALTO = 506;

/** Envío gratis a partir de este importe. Igual que en el carrito. */
const ENVIO_GRATIS_DESDE = 30;

/** Cuántas marcas se enseñan en la portada. */
const MARCAS_EN_PORTADA = 8;

export function HomePage() {
  const { taxonomy, facets } = useCatalogo();
  const seleccion = useSeleccionPortada();

  const datos = useMemo(() => {
    if (!taxonomy || !facets) return null;
    return {
      destacada: mascotas(facets).protagonistas[0],
      animales: facets.animals
        .filter((a) => a.total > 0)
        .map((a) => ({ ...a, href: rutaCatalogo({ animal: a.slug }) })),
      categorias: categorias(facets, taxonomy),
      marcas: [...facets.brands].filter((b) => b.total > 0).sort((a, b) => b.total - a.total).slice(0, MARCAS_EN_PORTADA),
    };
  }, [taxonomy, facets]);

  return (
    <>
      <Hero destacada={datos?.destacada} />
      {datos && <PorQuien animales={datos.animales} />}
      {datos && <Alimentacion categorias={datos.categorias} />}
      <Seleccion productos={seleccion} />
      {datos && datos.marcas.length > 0 && <Marcas marcas={datos.marcas} />}
      <NuestraTienda />
      <Contacto />
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Utilidad: imagen con respaldo si el fichero no existe todavía
   ══════════════════════════════════════════════════════════════════════ */

/** Muestra `respaldo` (un icono, un nombre…) si la imagen no carga. */
function ImagenConRespaldo({
  src,
  alt,
  className,
  respaldo,
  ...rest
}: {
  src: string;
  alt: string;
  className?: string;
  respaldo: React.ReactNode;
} & Pick<React.ImgHTMLAttributes<HTMLImageElement>, 'width' | 'height' | 'loading'>) {
  const [falla, setFalla] = useState(false);
  if (falla) return <>{respaldo}</>;
  return (
    <img src={src} alt={alt} className={className} decoding="async" onError={() => setFalla(true)} {...rest} />
  );
}

/* ══════════════════════════════════════════════════════════════════════
   SELECCIÓN — productos reales del catálogo, priorizando alimentación
   ══════════════════════════════════════════════════════════════════════ */

function useSeleccionPortada(): Product[] | undefined {
  const [productos, setProductos] = useState<Product[] | undefined>(undefined);

  useEffect(() => {
    let vivo = true;
    const pedir = (animal: string) =>
      api
        .products({ animal, category: ['alimentacion-seca'], pageSize: 12 })
        .then((r) => r.items)
        .catch(() => [] as Product[]);

    Promise.all([pedir('perro'), pedir('gato')]).then(([perro, gato]) => {
      const comprables = (lista: Product[]) =>
        lista
          .filter((p) => p.price != null && !esMarcaSoloEnTienda(p) && p.variants.some((v) => v.stock > 0))
          .slice(0, 2);
      const sel = [...comprables(perro), ...comprables(gato)].slice(0, 4);
      if (vivo) setProductos(sel);
    });
    return () => {
      vivo = false;
    };
  }, []);

  return productos;
}

/* ══════════════════════════════════════════════════════════════════════
   HERO  (se conserva)
   ══════════════════════════════════════════════════════════════════════ */

function Hero({ destacada }: { destacada?: Faceta }) {
  return (
    <section className="relative overflow-hidden bg-brand-800 text-cream">
      <svg
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full text-cream sm:h-24"
        viewBox="0 0 1440 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0 68C240 18 520 4 780 22c220 15 440 48 660 56v22H0z" fill="#f7c02a" />
        <path d="M0 82C240 34 520 20 780 38c220 15 440 48 660 56v6H0z" fill="currentColor" />
      </svg>

      <div className="container-page relative grid gap-5 pb-20 pt-5 sm:gap-8 sm:pb-28 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-10 lg:pb-32 lg:pt-16">
        <div className="order-2 lg:order-none">
          <p className="text-overline font-bold uppercase tracking-[0.18em] text-amber-400">
            Tienda de nutrición animal · Canarias
          </p>
          <h1 className="mt-2 max-w-[15ch] font-display text-[clamp(2rem,1rem+5.2vw,4.3rem)] font-extrabold leading-[0.98] tracking-tight text-cream">
            Nutrición <span className="text-amber-400">adaptada</span> a tu mascota
          </h1>
          <p className="mt-4 max-w-[46ch] text-body text-cream/80 sm:text-body-lg">
            Piensos, dietas veterinarias, snacks y accesorios.
            Te ayudamos a elegir lo que le conviene.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8">
            <Link
              to="/tienda"
              className="inline-flex min-h-12 items-center gap-2 rounded-pill bg-amber-500 px-7 text-body font-bold text-ink transition-colors hover:bg-amber-400"
            >
              Ver toda la tienda
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            {destacada && (
              <Link
                to={destacada.href}
                className="inline-flex min-h-12 items-center gap-2 rounded-pill border border-cream/30 px-6 text-body font-semibold text-cream transition-colors hover:border-cream/60 hover:bg-cream/10"
              >
                Todo para {destacada.nombre.toLowerCase()}
              </Link>
            )}
          </div>

          <p className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1 text-body-sm text-cream/70">
            <span className="flex items-center gap-1.5">
              <Truck className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
              Entrega en 24-48&nbsp;h en Canarias
            </span>
            <span>Envío gratis desde {ENVIO_GRATIS_DESDE}&nbsp;€</span>
          </p>
        </div>

        <div className="order-1 -mx-4 w-[calc(100%+2rem)] sm:mx-0 sm:w-full lg:order-none lg:mx-auto lg:max-w-none">
          <div className="relative h-[7.5rem] overflow-hidden sm:h-[12rem] sm:rounded-card lg:h-auto lg:aspect-[16/11]">
            <img
              src={FOTO}
              width={FOTO_ANCHO}
              height={FOTO_ALTO}
              fetchPriority="high"
              decoding="async"
              alt="Un perro, un gato y un conejo, las mascotas de la marca Chacho Pet Shop"
              className="absolute left-0 top-1/2 h-auto w-[430%] max-w-none -translate-y-[56%]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   ¿PARA QUIÉN COMPRAS?  — foto de cada mascota (con respaldo de icono)
   ══════════════════════════════════════════════════════════════════════ */

const ICONO_ANIMAL: Record<string, typeof Dog> = {
  perro: Dog,
  gato: Cat,
  ave: Bird,
  roedor: Rabbit,
  pez: Fish,
};
const PRINCIPALES = ['perro', 'gato'];
const COMPLEMENTARIAS = ['ave', 'roedor', 'pez'];

/**
 * Fotos reales de cada mascota en `public/animales/`, con su extensión REAL.
 *
 * Se guarda el fichero tal cual lo aporta la tienda (unas en .jpg, otras en
 * .jpeg). Una mascota sin foto aquí cae al icono de reserva, sin hueco vacío.
 */
const FOTO_ANIMAL: Record<string, string> = {
  perro: '/animales/perro.jpg',
  gato: '/animales/gato.jpeg',
  ave: '/animales/ave.jpeg',
  roedor: '/animales/roedor.jpeg',
  pez: '/animales/pez.jpg',
};

/**
 * Encuadre de cada foto dentro del círculo. Por defecto, centrado. El perro es
 * un retrato vertical y, centrado, el círculo le cortaba la cabeza; con `top` se
 * baja la imagen y la cabeza entra completa.
 */
const ENCUADRE_ANIMAL: Record<string, string> = {
  perro: 'object-top',
};

/** El retrato de la mascota: su foto en `public/animales/`, o el icono. */
function RetratoAnimal({ slug, tamano }: { slug: string; tamano: number }) {
  const Icono = ICONO_ANIMAL[slug] ?? Dog;
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-pill bg-brand-50 text-brand-700"
      style={{ width: tamano, height: tamano }}
    >
      <ImagenConRespaldo
        src={FOTO_ANIMAL[slug] ?? `/animales/${slug}.webp`}
        alt=""
        width={tamano}
        height={tamano}
        loading="lazy"
        className={`h-full w-full object-cover ${ENCUADRE_ANIMAL[slug] ?? ''}`}
        respaldo={<Icono className="h-1/2 w-1/2" strokeWidth={1.75} aria-hidden="true" />}
      />
    </span>
  );
}

function PorQuien({ animales }: { animales: Faceta[] }) {
  const buscar = (slug: string) => animales.find((a) => a.slug === slug);
  const principales = PRINCIPALES.map(buscar).filter((a): a is Faceta => Boolean(a));
  const complementarias = COMPLEMENTARIAS.map(buscar).filter((a): a is Faceta => Boolean(a));
  if (principales.length === 0) return null;

  return (
    <section aria-labelledby="por-quien" className="container-page py-section">
      <h2 id="por-quien" className="font-display text-display font-extrabold tracking-tight text-content">
        ¿Para quién compras?
      </h2>
      <p className="mt-2 max-w-[52ch] text-body text-content-muted">
        Alimentación y cuidado para cada mascota. Entra directo a lo suyo.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {principales.map((a) => (
          <Link
            key={a.slug}
            to={a.href}
            className="group relative flex min-h-[9.5rem] items-center gap-5 overflow-hidden rounded-card border border-edge bg-surface p-6 transition-colors hover:border-brand-300 hover:shadow-rest"
          >
            <span className="transition-transform duration-300 group-hover:scale-105">
              <RetratoAnimal slug={a.slug} tamano={88} />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-title font-extrabold text-content">{a.nombre}</span>
              <span className="mt-1 inline-flex items-center gap-1.5 text-body-sm font-semibold text-brand-700">
                Ver todo
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </span>
          </Link>
        ))}
      </div>

      {complementarias.length > 0 && (
        <ul className="mt-4 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-3">
          {complementarias.map((a) => (
            <li key={a.slug}>
              <Link
                to={a.href}
                className="group flex items-center gap-3 rounded-card border border-edge bg-surface px-4 py-2 transition-colors hover:border-brand-300 hover:bg-brand-50"
              >
                <RetratoAnimal slug={a.slug} tamano={64} />
                <span className="flex-1 font-semibold text-content">{a.nombre}</span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-content-subtle transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   ENCUENTRA SU ALIMENTACIÓN
   ══════════════════════════════════════════════════════════════════════ */

const ALIMENTACION = [
  'alimentacion-seca',
  'alimentacion-humeda',
  'alimentacion-semihumeda',
  'snacks-y-premios',
];

function Alimentacion({ categorias: lista }: { categorias: Faceta[] }) {
  const comida = ALIMENTACION.map((slug) => lista.find((c) => c.slug === slug)).filter(
    (c): c is Faceta => Boolean(c),
  );
  if (comida.length === 0) return null;

  return (
    <section aria-labelledby="alimentacion" className="border-y border-edge-subtle bg-surface-sunken">
      <div className="container-page py-section">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <div>
            <p className="text-overline font-bold uppercase tracking-[0.16em] text-amber-700">Alimentación</p>
            <h2 id="alimentacion" className="mt-1 font-display text-display font-extrabold tracking-tight text-content">
              Encuentra su alimentación
            </h2>
          </div>
          <Link to="/tienda" className="btn-link text-body-sm">
            Ver el catálogo completo →
          </Link>
        </div>

        <ul
          className={`mt-6 grid list-none gap-4 p-0 sm:grid-cols-2 ${
            comida.length >= 3 ? 'lg:grid-cols-3' : ''
          } ${comida.length >= 4 ? 'lg:grid-cols-4' : ''}`}
        >
          {comida.map((c) => (
            <li key={c.slug}>
              <Link
                to={c.href}
                className="group flex h-full flex-col items-start gap-4 rounded-card border border-edge bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-rest"
              >
                <ArteCategoria
                  tipo={tipoDeCategoria(c.tipo)}
                  className="h-20 w-20 transition-transform duration-300 group-hover:scale-105"
                />
                <span className="mt-auto">
                  <span className="block font-display text-heading font-bold text-content">{c.nombre}</span>
                  <span className="mt-1 inline-flex items-center gap-1.5 text-body-sm font-semibold text-brand-700">
                    Ver productos
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   LA SELECCIÓN DE CHACHO
   ══════════════════════════════════════════════════════════════════════ */

function TarjetaSeleccion({ producto }: { producto: Product }) {
  const precio = producto.price ?? producto.variants[0]?.price ?? null;
  const formato = producto.variants[0]?.label;
  return (
    <li className="w-[15rem] shrink-0 snap-start sm:w-auto">
      <Link
        to={`/producto/${producto.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-card border border-edge bg-surface transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-rest"
      >
        <div className="aspect-square bg-cream-200 p-4">
          <ImagenProducto product={producto} className="h-full w-full object-contain" />
        </div>
        <div className="flex flex-1 flex-col gap-1 p-4">
          {producto.brand && (
            <span className="text-caption font-semibold uppercase tracking-wide text-brand-600">
              {producto.brand.name}
            </span>
          )}
          <h3 className="line-clamp-2 font-display text-body font-semibold leading-snug text-content">
            {producto.name}
          </h3>
          {formato && formato !== 'Único' && (
            <span className="text-caption text-content-subtle">{formato}</span>
          )}
          <div className="mt-2 flex items-center justify-between gap-2 pt-1">
            {precio != null ? (
              <span className="font-display text-heading font-bold text-brand-800">{eur(precio)}</span>
            ) : (
              <span className="text-body-sm font-semibold text-content-muted">A consultar</span>
            )}
            <span className="inline-flex items-center gap-1 text-body-sm font-semibold text-brand-700">
              Ver producto
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}

function Seleccion({ productos }: { productos?: Product[] }) {
  if (productos && productos.length === 0) return null;

  return (
    <section aria-labelledby="seleccion" className="container-page py-section">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div>
          <p className="text-overline font-bold uppercase tracking-[0.16em] text-amber-700">
            Selección de la tienda
          </p>
          <h2 id="seleccion" className="mt-1 font-display text-display font-extrabold tracking-tight text-content">
            La selección de Chacho
          </h2>
        </div>
        <Link to={rutaCatalogo({ category: 'alimentacion-seca' })} className="btn-link text-body-sm">
          Ver más alimentación →
        </Link>
      </div>

      <ul className="-mx-4 mt-6 flex list-none snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:snap-none sm:overflow-visible sm:px-0 lg:grid-cols-4">
        {productos
          ? productos.map((p) => <TarjetaSeleccion key={p.id} producto={p} />)
          : Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="w-[15rem] shrink-0 snap-start sm:w-auto">
                <div className="animate-pulse rounded-card border border-edge-subtle bg-surface">
                  <div className="aspect-square rounded-t-card bg-cream-200" />
                  <div className="space-y-2 p-4">
                    <div className="h-3 w-16 rounded bg-cream-200" />
                    <div className="h-4 w-3/4 rounded bg-cream-200" />
                    <div className="h-5 w-20 rounded bg-cream-200" />
                  </div>
                </div>
              </li>
            ))}
      </ul>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MARCAS  — logotipo si existe el fichero, si no el nombre
   ══════════════════════════════════════════════════════════════════════ */

/** Cuántas marcas se ven a la vez en el carrusel y cada cuánto gira. */
const MARCAS_A_LA_VEZ = 3;
const CARRUSEL_MS = 1500;

/** Una tarjeta de marca: su logotipo oficial si lo tenemos, o el nombre. */
function TarjetaMarca({ marca }: { marca: { slug: string; nombre: string } }) {
  const logo = LOGO_MARCA[marca.slug];
  const nombre = (
    <span className="text-center font-display text-body font-bold text-content-muted">
      {marca.nombre}
    </span>
  );
  return (
    <Link
      to={rutaCatalogo({ brand: marca.slug })}
      aria-label={marca.nombre}
      className="flex min-h-[4rem] items-center justify-center rounded-card border border-edge bg-surface px-4 py-3 transition-colors hover:border-brand-300 hover:bg-brand-50"
    >
      {logo ? (
        <ImagenConRespaldo
          src={logo}
          alt={marca.nombre}
          loading="lazy"
          className="max-h-9 w-auto max-w-full object-contain"
          respaldo={nombre}
        />
      ) : (
        nombre
      )}
    </Link>
  );
}

/**
 * Carrusel de marcas: enseña {@link MARCAS_A_LA_VEZ} a la vez y va girando una
 * posición cada {@link CARRUSEL_MS} ms, en bucle. Si hay tres o menos, no gira
 * (no hay nada que rotar), y respeta `prefers-reduced-motion` parándose.
 */
function Marcas({ marcas }: { marcas: { slug: string; nombre: string }[] }) {
  const total = marcas.length;
  const gira = total > MARCAS_A_LA_VEZ;
  const [inicio, setInicio] = useState(0);

  useEffect(() => {
    if (!gira) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setInicio((i) => (i + 1) % total), CARRUSEL_MS);
    return () => window.clearInterval(id);
  }, [gira, total]);

  const visibles = gira
    ? Array.from({ length: MARCAS_A_LA_VEZ }, (_, k) => marcas[(inicio + k) % total]!)
    : marcas;

  return (
    <section aria-labelledby="marcas" className="border-t border-edge-subtle bg-surface-sunken">
      <div className="container-page py-section-sm">
        <h2 id="marcas" className="font-display text-title font-extrabold tracking-tight text-content">
          Marcas en las que confiamos
        </h2>
        <ul className="mt-5 grid list-none grid-cols-3 gap-3 p-0" aria-live="off">
          {visibles.map((m) => (
            <li key={m.slug}>
              <TarjetaMarca marca={m} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   NUESTRA TIENDA — fotos reales del local (escaparate + interior)
   ══════════════════════════════════════════════════════════════════════ */

/** Fotos reales del local, en `public/`. La del escaparate manda; las de
 *  interior la acompañan. Son la prueba de que la tienda existe y es esta. */
const FOTOS_TIENDA = [
  { src: '/tienda-escaparate.jpg', alt: 'Escaparate de Chacho Pet Shop, con el rótulo y la tienda abierta' },
  { src: '/tienda-ownat.jpg', alt: 'Interior de la tienda: estanterías de pienso Ownat y alimentación natural' },
  { src: '/tienda-atlantic.jpg', alt: 'Interior de la tienda: expositor de Atlantic Pet y camas para mascotas' },
];

function NuestraTienda() {
  const [principal, ...interiores] = FOTOS_TIENDA;
  if (!principal) return null;

  return (
    <section aria-labelledby="nuestra-tienda" className="border-t border-edge-subtle bg-surface">
      <div className="container-page py-section-sm">
        <p className="text-overline font-bold uppercase tracking-[0.16em] text-amber-700">En La Laguna</p>
        <h2
          id="nuestra-tienda"
          className="mt-1 font-display text-title font-extrabold tracking-tight text-content"
        >
          Ven a conocernos
        </h2>
        <p className="mt-3 max-w-[52ch] text-body text-content-muted">
          Una tienda de barrio con asesoramiento de verdad. Pásate y te ayudamos a
          elegir en persona lo que le conviene a tu mascota.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2">
          <figure className="relative overflow-hidden rounded-card border border-edge sm:col-span-2 lg:row-span-2">
            <img
              src={principal.src}
              alt={principal.alt}
              width={1824}
              height={1026}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          </figure>
          {interiores.map((f) => (
            <figure key={f.src} className="overflow-hidden rounded-card border border-edge">
              <img
                src={f.src}
                alt={f.alt}
                width={1824}
                height={1026}
                loading="lazy"
                decoding="async"
                className="aspect-[16/10] h-full w-full object-cover"
              />
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   CONTACTO — formulario, WhatsApp, teléfono, dirección y horario
   ══════════════════════════════════════════════════════════════════════ */

function Contacto() {
  const whatsapp = enlaceWhatsApp('¡Hola! ¿Me ayudáis a elegir la alimentación de mi mascota?');
  const telefono = enlaceTelefono();

  return (
    <section aria-labelledby="contacto" className="border-t border-edge-subtle bg-surface-sunken">
      <div className="container-page grid gap-8 py-section lg:grid-cols-2 lg:gap-12">
        {/* Columna izquierda: mensaje + datos de contacto */}
        <div>
          <p className="text-overline font-bold uppercase tracking-[0.16em] text-amber-700">Te ayudamos</p>
          <h2 id="contacto" className="mt-1 font-display text-display font-extrabold tracking-tight text-content">
            ¿Hablamos?
          </h2>
          <p className="mt-3 max-w-[48ch] text-body text-content-muted">
            Cuéntanos cómo es tu mascota y te ayudamos a encontrar su alimentación
            — sin compromiso. Respondemos nosotros.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center gap-2 rounded-pill bg-[#25D366] px-6 text-body font-bold text-white transition-transform hover:scale-[1.02]"
              >
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                Consultar por WhatsApp
              </a>
            )}
            {telefono && (
              <a
                href={telefono}
                className="inline-flex min-h-12 items-center gap-2 rounded-pill border border-edge px-6 text-body font-semibold text-content transition-colors hover:border-brand-300 hover:bg-brand-50"
              >
                <Phone className="h-4 w-4 text-brand-600" aria-hidden="true" />
                {EMPRESA.telefono}
              </a>
            )}
          </div>

          <dl className="mt-7 space-y-3 text-body-sm">
            {EMPRESA.direccion && (
              <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                <span className="text-content-muted">{EMPRESA.direccion}</span>
              </div>
            )}
            {EMPRESA.horario && (
              <div className="flex items-start gap-2.5">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                <span className="whitespace-pre-line text-content-muted">{EMPRESA.horario}</span>
              </div>
            )}
          </dl>
        </div>

        {/* Columna derecha: formulario de contacto (usa el endpoint existente) */}
        <FormularioContacto />
      </div>
    </section>
  );
}

function FormularioContacto() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '', website: '' });
  const [acepta, setAcepta] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acepta) {
      toast.error('Debes aceptar la política de privacidad.');
      return;
    }
    setEnviando(true);
    try {
      await api.contact({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        subject: 'Consulta desde la portada',
        message: form.message,
        consent: acepta,
        website: form.website,
      });
      toast.success('¡Gracias! Hemos recibido tu mensaje, te responderemos pronto.');
      setForm({ name: '', email: '', phone: '', message: '', website: '' });
      setAcepta(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const campo = (clave: 'name' | 'email' | 'phone', etiqueta: string, type = 'text', requerido = true) => (
    <label className="block">
      <span className="mb-1 block text-body-sm font-semibold text-content-muted">{etiqueta}</span>
      <input
        type={type}
        required={requerido}
        value={form[clave]}
        onChange={(e) => setForm({ ...form, [clave]: e.target.value })}
        className="field h-11 w-full"
      />
    </label>
  );

  return (
    <form onSubmit={enviar} className="rounded-card border border-edge bg-surface p-6 shadow-rest sm:p-7">
      <h3 className="font-display text-heading font-bold text-content">Escríbenos</h3>
      <p className="mt-1 text-body-sm text-content-muted">Te contestamos al correo o al teléfono que nos dejes.</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {campo('name', 'Nombre')}
        {campo('email', 'Email', 'email')}
      </div>
      <div className="mt-4">{campo('phone', 'Teléfono (opcional)', 'tel', false)}</div>

      {/* Cebo antirrobots: fuera de la vista y del teclado. */}
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <label>
          No rellenar
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="mb-1 block text-body-sm font-semibold text-content-muted">Mensaje</span>
        <textarea
          required
          rows={4}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="field w-full resize-y py-2.5"
        />
      </label>

      <label className="mt-4 flex items-start gap-2 text-body-sm text-content-muted">
        <input
          type="checkbox"
          checked={acepta}
          onChange={(e) => setAcepta(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-edge-strong text-brand-600"
        />
        <span>
          He leído y acepto la{' '}
          <Link to="/privacidad" className="font-semibold text-brand-700 underline">
            política de privacidad
          </Link>
          .
        </span>
      </label>

      <button
        type="submit"
        disabled={enviando}
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-pill bg-brand-700 px-6 text-body font-bold text-content-inverse transition-colors hover:bg-brand-800 disabled:opacity-60"
      >
        <Send className="h-4 w-4" aria-hidden="true" />
        {enviando ? 'Enviando…' : 'Enviar mensaje'}
      </button>
    </form>
  );
}
