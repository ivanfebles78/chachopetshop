import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bird,
  Cat,
  CreditCard,
  Dog,
  Fish,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Rabbit,
  Truck,
} from 'lucide-react';
import { useCatalogo } from '@/lib/useCatalogo';
import { categorias, mascotas, type Faceta } from '@/lib/portada';
import { rutaCatalogo } from '@/lib/navigation';
import { EMPRESA, enlaceTelefono, enlaceWhatsApp } from '@/lib/empresa';
import { api } from '@/lib/api';
import { eur } from '@/lib/cn';
import { esMarcaSoloEnTienda } from '@/lib/producto';
import { ImagenProducto } from '@/components/ImagenProducto';
import { ArteCategoria } from '@/components/ArteCategoria';
import { tipoDeCategoria } from '@/lib/imagenes';
import type { Product } from '@/lib/types';

/**
 * PORTADA.
 *
 * Rediseño de la landing (sólo esta página): se conservan el hero y la franja de
 * servicios tal cual, y se rehace el resto para que la portada se lea como una
 * tienda de alimentación animal cuidada, con acceso equilibrado al catálogo que
 * YA existe. Todo lo que se enseña sale del catálogo (facetas reales) o del
 * contacto real de `lib/empresa.ts`; nada inventado, ningún enlace vacío.
 *
 * Reglas de esta página:
 *   · La ALIMENTACIÓN tiene prioridad visual sobre los accesorios.
 *   · Perros y gatos, mismo protagonismo; aves, roedores y peces como accesos
 *     complementarios. Sin contadores en esa sección.
 *   · Las tarjetas de «La selección de Chacho» son EXCLUSIVAS de la portada: no
 *     tocan la tarjeta compartida del catálogo.
 */

/* La foto de marca del hero. */
const FOTO = '/banner-chacho.jpeg';
const FOTO_ANCHO = 1600;
const FOTO_ALTO = 506;

/** Envío gratis a partir de este importe. Igual que en el carrito. */
const ENVIO_GRATIS_DESDE = 30;

/** Cuántas marcas se enseñan en la portada (el resto, desde el menú «Marcas»). */
const MARCAS_EN_PORTADA = 8;

export function HomePage() {
  const { taxonomy, facets } = useCatalogo();
  const seleccion = useSeleccionPortada();

  const datos = useMemo(() => {
    if (!taxonomy || !facets) return null;
    return {
      // El animal con más catálogo, para el segundo botón del hero.
      destacada: mascotas(facets).protagonistas[0],
      // Los animales con producto, con su enlace al filtro real del catálogo.
      animales: facets.animals
        .filter((a) => a.total > 0)
        .map((a) => ({ ...a, href: rutaCatalogo({ animal: a.slug }) })),
      categorias: categorias(facets, taxonomy),
      // Las marcas con más catálogo, como accesos rápidos (enlazan al filtro).
      marcas: [...facets.brands].filter((b) => b.total > 0).sort((a, b) => b.total - a.total).slice(0, MARCAS_EN_PORTADA),
    };
  }, [taxonomy, facets]);

  return (
    <>
      <Hero destacada={datos?.destacada} />
      <Servicio />
      {datos && <PorQuien animales={datos.animales} />}
      {datos && <Alimentacion categorias={datos.categorias} />}
      <Seleccion productos={seleccion} />
      <Ayuda />
      {datos && datos.marcas.length > 0 && <Marcas marcas={datos.marcas} />}
      <Conoce />
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   SELECCIÓN — productos reales del catálogo, priorizando alimentación
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Trae hasta cuatro productos reales para «La selección de Chacho»: alimentación
 * seca de perro y de gato, con precio y con existencias, para que haya variedad
 * y todo lo que se enseña se pueda comprar. Usa la API existente; no añade nada
 * al backend. `undefined` = cargando; `[]` = no hay nada que enseñar.
 */
function useSeleccionPortada(): Product[] | undefined {
  const [productos, setProductos] = useState<Product[] | undefined>(undefined);

  useEffect(() => {
    let vivo = true;
    const pedir = (animal: string) =>
      api
        .products({ animal, category: 'alimentacion-seca', pageSize: 12 })
        .then((r) => r.items)
        .catch(() => [] as Product[]);

    Promise.all([pedir('perro'), pedir('gato')]).then(([perro, gato]) => {
      // Con precio, con existencias y COMPRABLE online (se excluye Gosbi y demás
      // marcas «sólo en tienda»: no tiene sentido destacarlas si no se compran aquí).
      const comprables = (lista: Product[]) =>
        lista
          .filter((p) => p.price != null && !esMarcaSoloEnTienda(p) && p.variants.some((v) => v.stock > 0))
          .slice(0, 2);
      // Se intercalan perro y gato para que se vea variedad de un vistazo.
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
   HERO  (se conserva del diseño anterior)
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
                <span className="text-cream/60">({destacada.total})</span>
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
   A · SERVICIO  (se conserva)
   ══════════════════════════════════════════════════════════════════════ */

const SERVICIO = [
  { icono: Truck, titulo: 'Entrega en 24-48 h', texto: 'A toda Canarias' },
  { icono: CreditCard, titulo: 'Pago seguro', texto: 'Procesado por Stripe' },
  { icono: Mail, titulo: 'Te asesoramos', texto: 'Escríbenos y te ayudamos a elegir' },
];

function Servicio() {
  return (
    <section aria-label="Servicios de la tienda" className="border-b border-edge-subtle bg-surface">
      <ul className="container-page grid list-none grid-cols-1 gap-x-8 gap-y-4 p-0 py-6 sm:grid-cols-3">
        {SERVICIO.map((s) => (
          <li key={s.titulo} className="flex items-center gap-3">
            <s.icono className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
            <span className="text-body-sm">
              <span className="font-bold text-content">{s.titulo}</span>
              <span className="text-content-muted"> · {s.texto}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   B · ¿PARA QUIÉN COMPRAS?  — perros y gatos iguales; el resto, complementario
   ══════════════════════════════════════════════════════════════════════ */

const ICONO_ANIMAL: Record<string, typeof Dog> = {
  perro: Dog,
  gato: Cat,
  ave: Bird,
  roedor: Rabbit,
  pez: Fish,
};
/* Los dos protagonistas y el orden del resto. Sólo se pinta lo que existe. */
const PRINCIPALES = ['perro', 'gato'];
const COMPLEMENTARIAS = ['ave', 'roedor', 'pez'];

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

      {/* Perros y gatos: dos tarjetas grandes, mismo peso. Sin contadores. */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {principales.map((a) => {
          const Icono = ICONO_ANIMAL[a.slug] ?? Dog;
          return (
            <Link
              key={a.slug}
              to={a.href}
              className="group relative flex min-h-[9.5rem] items-center gap-5 overflow-hidden rounded-card border border-edge bg-surface p-6 transition-colors hover:border-brand-300 hover:shadow-rest"
            >
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-pill bg-brand-50 text-brand-700 transition-transform duration-300 group-hover:scale-105">
                <Icono className="h-10 w-10" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-title font-extrabold text-content">{a.nombre}</span>
                <span className="mt-1 inline-flex items-center gap-1.5 text-body-sm font-semibold text-brand-700">
                  Ver todo
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </span>
            </Link>
          );
        })}
      </div>

      {/* Aves, roedores y peces: accesos complementarios, más compactos. */}
      {complementarias.length > 0 && (
        <ul className="mt-4 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-3">
          {complementarias.map((a) => {
            const Icono = ICONO_ANIMAL[a.slug] ?? Bird;
            return (
              <li key={a.slug}>
                <Link
                  to={a.href}
                  className="group flex min-h-[3.5rem] items-center gap-3 rounded-card border border-edge bg-surface px-4 py-3 transition-colors hover:border-brand-300 hover:bg-brand-50"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-600">
                    <Icono className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span className="flex-1 font-semibold text-content">{a.nombre}</span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-content-subtle transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   C · ENCUENTRA SU ALIMENTACIÓN  — comida por delante de los accesorios
   ══════════════════════════════════════════════════════════════════════ */

/* El orden en que se prefieren las categorías de alimentación. Sólo se pintan
   las que existen y tienen producto; nada de «Otros» ni de accesorios aquí. */
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
   D · LA SELECCIÓN DE CHACHO  — tarjeta EXCLUSIVA de la portada
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
  // Cargando: se reserva el sitio para no dar saltos. Vacío: la sección no sale.
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
   E · TE AYUDAMOS A ELEGIR  — contacto real, WhatsApp por delante
   ══════════════════════════════════════════════════════════════════════ */

function Ayuda() {
  const whatsapp = enlaceWhatsApp('¡Hola! ¿Me ayudáis a elegir la alimentación de mi mascota?');
  const telefono = enlaceTelefono();
  if (!whatsapp && !telefono && !EMPRESA.email) return null;

  return (
    <section aria-labelledby="ayuda" className="container-page py-section">
      <div className="overflow-hidden rounded-card bg-brand-800 px-6 py-10 text-center text-cream sm:px-10 sm:py-12">
        <h2 id="ayuda" className="font-display text-display font-extrabold tracking-tight">
          Te ayudamos a elegir
        </h2>
        <p className="mx-auto mt-3 max-w-[50ch] text-body-lg text-cream/80">
          Cuéntanos cómo es tu mascota y te ayudamos a encontrar su alimentación —
          sin compromiso.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
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
              className="inline-flex min-h-12 items-center gap-2 rounded-pill border border-cream/30 px-6 text-body font-semibold text-cream transition-colors hover:border-cream/60 hover:bg-cream/10"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              Llamar {EMPRESA.telefono}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   F · MARCAS  — accesos rápidos a las marcas con más catálogo
   ══════════════════════════════════════════════════════════════════════ */

function Marcas({ marcas }: { marcas: { slug: string; nombre: string }[] }) {
  return (
    <section aria-labelledby="marcas" className="border-t border-edge-subtle bg-surface-sunken">
      <div className="container-page py-section-sm">
        <h2 id="marcas" className="font-display text-title font-extrabold tracking-tight text-content">
          Marcas en las que confiamos
        </h2>
        <ul className="mt-5 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4">
          {marcas.map((m) => (
            <li key={m.slug}>
              <Link
                to={rutaCatalogo({ brand: m.slug })}
                className="flex min-h-[3.25rem] items-center justify-center rounded-card border border-edge bg-surface px-4 py-3 text-center font-display text-body font-bold text-content-muted transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
              >
                {m.nombre}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   G · CONOCE A CHACHO  — quiénes son, sin adornos inventados
   ══════════════════════════════════════════════════════════════════════ */

function Conoce() {
  return (
    <section aria-labelledby="conoce" className="container-page py-section">
      <div className="grid items-center gap-6 overflow-hidden rounded-card border border-edge bg-surface p-6 sm:grid-cols-[1.4fr_auto] sm:p-8">
        <div>
          <p className="text-overline font-bold uppercase tracking-[0.16em] text-amber-700">De Canarias</p>
          <h2 id="conoce" className="mt-1 font-display text-title font-extrabold tracking-tight text-content">
            Conoce a Chacho
          </h2>
          <p className="mt-3 max-w-[54ch] text-body text-content-muted">
            Somos una tienda de barrio en La Laguna con toda la tienda también
            online. Nutrición especializada —incluidas dietas veterinarias— y
            atención de verdad: cuando escribes, respondemos nosotros.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Link to="/conocenos" className="btn-link text-body-sm">
              Conócenos →
            </Link>
            {EMPRESA.direccion && (
              <span className="inline-flex items-center gap-1.5 text-body-sm text-content-muted">
                <MapPin className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                {EMPRESA.direccion}
              </span>
            )}
          </div>
        </div>

        {/* La mascota del banner (material propio de la marca), como acento. */}
        <div className="relative hidden h-[9rem] w-[7.5rem] shrink-0 self-end overflow-hidden sm:block">
          <img
            src={FOTO}
            width={FOTO_ANCHO}
            height={FOTO_ALTO}
            loading="lazy"
            decoding="async"
            alt=""
            className="absolute left-[-286px] top-[-222px] w-[1600px] max-w-none"
          />
        </div>
      </div>
    </section>
  );
}
