import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CreditCard, Mail, Phone, Truck } from 'lucide-react';
import { useCatalogo } from '@/lib/useCatalogo';
import { categorias, mascotas, ofertas, porcentajeAhorro, seleccion, type Faceta } from '@/lib/portada';
import { rutaCatalogo } from '@/lib/navigation';
import { EMPRESA } from '@/lib/empresa';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';
import type { Product } from '@/lib/types';

/**
 * PORTADA.
 *
 * La anterior abría con el logotipo ocupando la pantalla entera: quien llegaba
 * veía una marca y ningún producto, ningún precio y ningún sitio al que ir. Por
 * debajo, seis tarjetas blancas idénticas con emoji —una de ellas, Reptiles, sin
 * un solo producto—, «Top ventas» sobre un dato que no lo sostiene, y un
 * formulario de suscripción que prometía un 10 % y cuyo `onSubmit` era
 * `preventDefault()`: el correo del cliente se tiraba en silencio.
 *
 * Lo que se ha hecho:
 *
 *   · TODO SALE DEL CATÁLOGO (`lib/portada.ts`). Ninguna lista escrita a mano,
 *     ninguna faceta vacía, ningún recuento inventado.
 *
 *   · LA FOTO ES LA SUYA. El perro, el gato y el conejo salen del banner de la
 *     marca, que es material propio y son animales de verdad. Las fotos de los
 *     productos son de relleno (`picsum.photos`) y enseñan bosques y montañas,
 *     así que el diseño NO se apoya en ellas: pesan lo justo, en marcos de
 *     proporción fija, y el peso visual lo llevan la tipografía y el color.
 *     El día que haya fotografía real de producto, esto mejora solo.
 *
 *   · EL TITULAR ES SU LEMA. «Nutrición adaptada a tu mascota» está en el
 *     banner: es de ellos, no me lo he inventado. Va como texto, no incrustado
 *     en la imagen, para que se pueda leer, ampliar y traducir.
 */

/* La foto de marca. Es la misma para el hero y para los bloques de mascota, así
   que el navegador la descarga UNA vez y los demás recortes salen del caché. */
const FOTO = '/banner-chacho.jpeg';
const FOTO_ANCHO = 1600;
const FOTO_ALTO = 506;

/** Envío gratis a partir de este importe. Igual que en el carrito. */
const ENVIO_GRATIS_DESDE = 49;

export function HomePage() {
  const { taxonomy, productos, cargando } = useCatalogo();

  const datos = useMemo(() => {
    if (!taxonomy) return null;
    return {
      mascotas: mascotas(taxonomy, productos),
      categorias: categorias(taxonomy, productos),
      seleccion: seleccion(productos),
      ofertas: ofertas(productos),
      marcas: taxonomy.brands.map((b) => b.name),
    };
  }, [taxonomy, productos]);

  return (
    <>
      <Hero destacada={datos?.mascotas.protagonistas[0]} />
      <Servicio />
      {datos && <PorMascota {...datos.mascotas} />}
      {datos && <PorCategoria categorias={datos.categorias} />}
      <Seleccion productos={datos?.seleccion} cargando={cargando} />
      {datos && datos.ofertas.length > 0 && <Ofertas productos={datos.ofertas} />}
      {datos && datos.marcas.length > 0 && <Marcas marcas={datos.marcas} />}
      <Propuesta />
      <Ayuda />
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   HERO
   ══════════════════════════════════════════════════════════════════════ */

function Hero({ destacada }: { destacada?: Faceta }) {
  return (
    <section className="relative overflow-hidden bg-brand-800 text-cream">
      {/* La curva amarilla del banner, redibujada en SVG para que escale sin
          pesar y sin depender de un recorte de imagen. */}
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
          {/*
            El lema de la marca, tal cual está en su banner. Va como TEXTO y no
            dentro de la imagen: así se puede seleccionar, ampliar y leer en voz
            alta, y no se pixela en ninguna pantalla.
          */}
          <h1 className="mt-2 max-w-[15ch] font-display text-[clamp(2rem,1rem+5.2vw,4.3rem)] font-extrabold leading-[0.98] tracking-tight text-cream">
            Nutrición <span className="text-amber-400">adaptada</span> a tu mascota
          </h1>
          <p className="mt-4 max-w-[46ch] text-body text-cream/80 sm:text-body-lg">
            {/* Sin «marcas que recomiendan los veterinarios»: eso es un aval
                profesional, y aquí nadie lo ha dado. Lo que sí es cierto es lo
                que se vende y que se asesora. */}
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
            {/* Segundo destino REAL: la mascota con más catálogo, ahora mismo. */}
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

        {/*
          La foto. `fetchpriority="high"` y sin `loading="lazy"`: es el elemento
          más grande de la primera pantalla, así que es lo que mide el navegador
          como LCP y conviene que empiece a bajar cuanto antes. Las medidas van
          declaradas para que no dé un salto al cargar.

          Antes se servía el PNG de 569 kB teniendo al lado el mismo dibujo en
          JPEG de 131 kB.
        */}
        {/*
          En móvil la foto va ARRIBA, antes del titular. En una pantalla de 375
          px, con el texto delante los animales caen por debajo del pliegue y la
          primera pantalla de una tienda de mascotas se queda sin una sola
          mascota. Arriba, y en una banda baja, se ve de qué va la tienda antes
          de leer nada —y los dos botones siguen entrando sin hacer scroll—.
        */}
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
   SERVICIO — sólo lo que la tienda cumple de verdad
   ══════════════════════════════════════════════════════════════════════ */

/*
 * Aquí ponía «Marcas premium · Las mejores del mercado», que no es una promesa
 * sino un superlativo que nadie puede comprobar. Lo que queda son las tres
 * cosas que la tienda sí hace: el envío que anuncia la propia cabecera, el
 * pago que procesa Stripe de verdad, y el asesoramiento, que es el correo y el
 * teléfono que atienden.
 */
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
   POR MASCOTA
   ══════════════════════════════════════════════════════════════════════ */

/*
 * EL RECORTE DE CADA MASCOTA.
 *
 * En el banner los animales están recortados sobre BLANCO, y son pequeños: el
 * perro ocupa unos 185 px de los 1600 del original. Ampliarlos para que llenen
 * un bloque los dejaba borrosos —y al primer intento el bloque de «Gatos»
 * acabó enseñando la «CH» del logotipo en vez de un gato—.
 *
 * Así que no se amplifican: se usan A TAMAÑO NATURAL como figuras recortadas
 * sobre fondo claro, que es exactamente como los usa su propio banner. La
 * imagen se pinta a sus 1600 px reales y sólo se desplaza para encuadrar a cada
 * animal. Nada de interpolar, y el fondo blanco del recorte se funde con el del
 * bloque, así que no hace falta que el recorte sea perfecto.
 *
 * Los desplazamientos son píxeles del original: el perro empieza en 0, el gato
 * hacia 122.
 */
const RECORTE: Record<string, { caja: string; pos: string }> = {
  // El perro ocupa x 8-185; se le deja algo de aire a los lados.
  perro: { caja: 'w-[10.5rem] sm:w-[11rem]', pos: 'left-[-6px] top-[-186px] sm:top-[-162px]' },
  // El gato, x 186-268: más estrecho, y empieza justo donde acaba el perro.
  gato: { caja: 'w-[6.5rem] sm:w-[6.75rem]', pos: 'left-[-186px] top-[-186px] sm:top-[-162px]' },
};

function Mascota({ m }: { m: Faceta }) {
  const recorte = RECORTE[m.slug];

  return (
    <Link
      to={m.href}
      className="group relative flex min-h-[10rem] items-center justify-between gap-3 overflow-hidden rounded-card border border-edge bg-surface pl-5 transition-colors hover:border-brand-300 hover:shadow-rest sm:min-h-[11.5rem] sm:pl-7"
    >
      <span className="relative z-10 py-5">
        <span className="block font-display text-title font-extrabold text-content">{m.nombre}</span>
        <span className="mt-1 flex items-center gap-1.5 text-body-sm text-content-muted">
          {m.total} productos
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </span>
      </span>

      {recorte ? (
        <span className={`relative h-[10rem] shrink-0 self-end overflow-hidden sm:h-[11.5rem] ${recorte.caja}`}>
          <img
            src={FOTO}
            width={FOTO_ANCHO}
            height={FOTO_ALTO}
            loading="lazy"
            decoding="async"
            alt=""
            className={`absolute w-[1600px] max-w-none transition-transform duration-500 group-hover:scale-[1.03] ${recorte.pos}`}
          />
        </span>
      ) : null}
    </Link>
  );
}

function PorMascota({ protagonistas, secundarias }: { protagonistas: Faceta[]; secundarias: Faceta[] }) {
  if (protagonistas.length === 0) return null;

  return (
    <section aria-labelledby="por-mascota" className="container-page py-section">
      <h2 id="por-mascota" className="font-display text-display font-extrabold tracking-tight text-content">
        ¿Para quién compras?
      </h2>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {protagonistas.map((m) => (
          <Mascota key={m.slug} m={m} />
        ))}
      </div>

      {/*
        Las mascotas con poco catálogo NO llevan bloque grande: prometería un
        departamento que hoy no existe. Pero siguen estando, con su recuento.
      */}
      {secundarias.length > 0 && (
        <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2 text-body-sm text-content-muted">
          <span>También tenemos para</span>
          {secundarias.map((m, i) => (
            <span key={m.slug}>
              <Link to={m.href} className="font-semibold text-brand-700 underline underline-offset-4 hover:text-brand-500">
                {m.nombre.toLowerCase()}
              </Link>
              <span className="text-content-subtle"> ({m.total})</span>
              {i < secundarias.length - 1 && <span aria-hidden="true">,</span>}
            </span>
          ))}
        </p>
      )}
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   POR CATEGORÍA
   ══════════════════════════════════════════════════════════════════════ */

function PorCategoria({ categorias: lista }: { categorias: Faceta[] }) {
  if (lista.length === 0) return null;
  const [principal, ...resto] = lista;

  return (
    <section aria-labelledby="por-categoria" className="border-y border-edge-subtle bg-surface-sunken">
      <div className="container-page py-section">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 id="por-categoria" className="font-display text-display font-extrabold tracking-tight text-content">
            Qué estás buscando
          </h2>
          <Link to="/tienda" className="btn-link text-body-sm">
            Ver el catálogo completo →
          </Link>
        </div>

        {/*
          La categoría con más catálogo abre la sección, a lo ancho. Antes la
          etiqueta decía «Lo que más se compra», que es una afirmación sobre
          VENTAS y aquí no hay ningún dato de ventas detrás: lo único cierto es
          que tiene más productos que ninguna otra. Eso es lo que dice ahora.
        */}
        <div className="mt-6 grid gap-3">
          {principal && (
            <Link
              to={principal.href}
              className="group flex flex-wrap items-end justify-between gap-x-8 gap-y-4 rounded-card bg-brand-800 p-6 text-cream sm:p-7"
            >
              <span>
                <span className="block text-overline font-bold uppercase tracking-[0.16em] text-amber-400">
                  La sección con más variedad
                </span>
                <span className="mt-1 block font-display text-display font-extrabold">{principal.nombre}</span>
              </span>
              <span className="flex items-center gap-1.5 pb-1 text-body font-semibold text-cream/85">
                Ver los {principal.total} productos
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </Link>
          )}
        </div>

        {/* Las demás, en rejilla. Ocho entran exactas en cuatro columnas. */}
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {resto.map((c) => (
            <Link
              key={c.slug}
              to={c.href}
              className="group flex items-center justify-between gap-3 rounded-card border border-edge bg-surface px-5 py-4 transition-colors hover:border-brand-300 hover:bg-brand-50"
            >
              <span className="font-semibold text-content">{c.nombre}</span>
              <span className="shrink-0 text-body-sm text-content-subtle">{c.total}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   SELECCIÓN
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Carril horizontal en móvil y rejilla a partir de `sm`.
 *
 * En una pantalla de 375 px, ocho tarjetas apiladas son ocho pantallas de
 * scroll y quien llega no ve nunca la sección siguiente. En carril se ve que
 * hay más a la derecha y se recorre con el pulgar. Se desplaza también con el
 * tabulador, porque son enlaces normales dentro de un contenedor con scroll.
 */
function Carril({ children, etiquetado }: { children: React.ReactNode; etiquetado: string }) {
  return (
    <ul
      aria-labelledby={etiquetado}
      className="-mx-4 mt-6 flex list-none snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:snap-none sm:overflow-visible sm:px-0 lg:grid-cols-4"
    >
      {children}
    </ul>
  );
}

function Seleccion({ productos, cargando }: { productos?: Product[]; cargando: boolean }) {
  if (!cargando && (!productos || productos.length === 0)) return null;

  return (
    <section className="container-page py-section">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div>
          <p className="text-overline font-bold uppercase tracking-[0.16em] text-amber-700">
            Selección de la tienda
          </p>
          {/*
            Antes: «LOS MÁS VENDIDOS · Favoritos de la manada», con una etiqueta
            «Top ventas» en cada tarjeta. Ningún dato de ventas lo sostenía: de
            los pedidos reales, los siete marcados suman MENOS unidades que el
            resto del catálogo. Esto es lo que la tienda destaca, y así se dice.
          */}
          <h2 id="seleccion" className="mt-1 font-display text-display font-extrabold tracking-tight text-content">
            Lo que recomendamos
          </h2>
        </div>
        <Link to="/tienda" className="btn-link text-body-sm">
          Ver todo →
        </Link>
      </div>

      <Carril etiquetado="seleccion">
        {cargando
          ? Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="w-[15rem] shrink-0 snap-start sm:w-auto">
                <ProductCardSkeleton />
              </li>
            ))
          : productos?.map((p) => (
              <li key={p.id} className="w-[15rem] shrink-0 snap-start sm:w-auto">
                <ProductCard product={p} />
              </li>
            ))}
      </Carril>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   OFERTAS — sólo si hay rebajas de verdad
   ══════════════════════════════════════════════════════════════════════ */

/*
 * Esta sección entera desaparece si no hay ningún producto con `compareAt`
 * mayor que su precio. No se rellena con destacados ni se fabrica un descuento
 * para que la portada quede más completa: una sección de ofertas vacía —o
 * peor, falsa— cuesta más de lo que vale.
 */
function Ofertas({ productos }: { productos: Product[] }) {
  const maximo = Math.max(...productos.map((p) => porcentajeAhorro(p) ?? 0));

  return (
    <section aria-labelledby="ofertas" className="border-y border-edge-subtle bg-amber-50">
      <div className="container-page py-section">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <div>
            <p className="text-overline font-bold uppercase tracking-[0.16em] text-amber-700">
              Precio rebajado
            </p>
            <h2 id="ofertas" className="mt-1 font-display text-display font-extrabold tracking-tight text-content">
              Ofertas {maximo > 0 && <span className="text-amber-700">hasta -{maximo}%</span>}
            </h2>
          </div>
          <Link to={rutaCatalogo({ oferta: '1' })} className="btn-link text-body-sm">
            Ver las {productos.length} ofertas →
          </Link>
        </div>

        <Carril etiquetado="ofertas">
          {productos.map((p) => (
            <li key={p.id} className="w-[15rem] shrink-0 snap-start sm:w-auto">
              <ProductCard product={p} />
            </li>
          ))}
        </Carril>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MARCAS
   ══════════════════════════════════════════════════════════════════════ */

/*
 * La cinta que se movía sola se ha quedado quieta. Una marquesina obliga a
 * esperar a que pase lo que interesa, no se puede leer con calma y no hay forma
 * de pararla; y aquí lo único que hace falta es enseñar con quién se trabaja.
 * Sin animación, además, no hay nada que desactivar para quien pide menos
 * movimiento.
 */
function Marcas({ marcas }: { marcas: string[] }) {
  return (
    <section aria-labelledby="marcas" className="container-page py-section-sm">
      <h2 id="marcas" className="text-overline font-bold uppercase tracking-[0.16em] text-content-subtle">
        Trabajamos con {marcas.length} marcas
      </h2>
      <ul className="mt-4 flex list-none flex-wrap gap-x-7 gap-y-3 p-0">
        {marcas.map((m) => (
          <li key={m} className="font-display text-heading font-bold tracking-tight text-content-muted">
            {m}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   PROPUESTA — quiénes son, sin adornos
   ══════════════════════════════════════════════════════════════════════ */

/*
 * Restringida a propósito. Aquí no hay años de experiencia, ni número de
 * clientes, ni avales veterinarios, ni certificaciones: nada de eso me consta,
 * y en esta tienda ya había cuatro cifras publicadas de las que tres eran
 * inventadas —«+12.000 mascotas felices», «+40 marcas» con 12 en catálogo y un
 * «4.8 de valoración media» que nadie había medido—.
 *
 * Lo que queda es lo que la propia tienda ya decía de sí misma en «Conócenos»
 * y lo que se puede comprobar mirando el catálogo y el carrito.
 */
function Propuesta() {
  return (
    <section aria-labelledby="propuesta" className="container-page pb-section-sm">
      <div className="grid items-center gap-6 rounded-card border border-edge bg-surface p-6 sm:grid-cols-[1fr_auto] sm:p-8">
        <div>
          <h2 id="propuesta" className="font-display text-title font-extrabold tracking-tight text-content">
            De Canarias, y con quien preguntar
          </h2>
          <p className="mt-3 max-w-[52ch] text-body text-content-muted">
            Chacho Pet Shop nació en Canarias con una idea sencilla: que alimentar
            bien a tu mascota sea fácil y honesto. Trabajamos nutrición
            especializada —incluidas dietas veterinarias— y respondemos nosotros
            cuando escribes.
          </p>
          <Link to="/conocenos" className="btn-link mt-4 inline-flex text-body-sm">
            Cómo trabajamos →
          </Link>
        </div>

        {/* El conejo del banner: la tercera mascota, también a tamaño natural. */}
        <div className="relative hidden h-[8rem] w-[6.5rem] shrink-0 self-end overflow-hidden sm:block">
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

/* ══════════════════════════════════════════════════════════════════════
   AYUDA — el contacto real, no un boletín inventado
   ══════════════════════════════════════════════════════════════════════ */

/*
 * Aquí había un formulario de suscripción que ofrecía «un 10 % en tu primer
 * pedido». No existe ninguna infraestructura de boletín —ni endpoint, ni tabla,
 * ni forma de canjear ese descuento— y su `onSubmit` era `preventDefault()`:
 * el correo que escribía el cliente no iba a ninguna parte.
 *
 * En su lugar, las dos vías de contacto que sí atienden, sacadas de
 * `lib/empresa.ts`. Si algún día faltara alguna, deja de pintarse sola.
 */
function Ayuda() {
  const telefono = EMPRESA.telefono && EMPRESA.telefonoE164;
  if (!telefono && !EMPRESA.email) return null;

  return (
    <section aria-labelledby="ayuda" className="container-page pb-section">
      <div className="rounded-card bg-brand-800 px-6 py-10 text-center text-cream sm:px-10 sm:py-12">
        <h2 id="ayuda" className="font-display text-display font-extrabold tracking-tight">
          ¿No sabes cuál elegir?
        </h2>
        <p className="mx-auto mt-3 max-w-[48ch] text-body-lg text-cream/80">
          Cuéntanos qué mascota tienes y qué necesita. Te decimos qué le conviene
          — sin compromiso.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {EMPRESA.email && (
            <a
              href={`mailto:${EMPRESA.email}`}
              className="inline-flex min-h-12 items-center gap-2 rounded-pill bg-amber-500 px-6 text-body font-bold text-ink transition-colors hover:bg-amber-400"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              {EMPRESA.email}
            </a>
          )}
          {telefono && (
            <a
              href={`tel:${EMPRESA.telefonoE164}`}
              className="inline-flex min-h-12 items-center gap-2 rounded-pill border border-cream/30 px-6 text-body font-semibold text-cream transition-colors hover:border-cream/60 hover:bg-cream/10"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              {EMPRESA.telefono}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
