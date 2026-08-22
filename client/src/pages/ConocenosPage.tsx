import { Link } from 'react-router-dom';
import { Award, Heart, Leaf, ShieldCheck, Truck } from 'lucide-react';
import { Reveal } from '@/components/Reveal';
import { useNavegacion } from '@/lib/useNavegacion';

const FEATURES = [
  { icon: Award, title: 'Expertos en nutrición', text: 'Te asesoramos para acertar con cada mascota.' },
  { icon: Truck, title: 'Entrega 24-48h', text: 'Envío rápido a toda Canarias, gratis desde 49€.' },
  { icon: ShieldCheck, title: 'Solo marcas premium', text: 'Seleccionamos lo mejor del mercado.' },
];

const VALUES = [
  { icon: Heart, title: 'Bienestar animal', text: 'Cada recomendación busca la salud y felicidad de tu mascota, no solo vender.' },
  { icon: Leaf, title: 'Nutrición honesta', text: 'Ingredientes de calidad y etiquetas claras. Sin humo, sin letra pequeña.' },
  { icon: Award, title: 'Cercanía canaria', text: 'Somos de aquí. Conocemos a nuestros clientes y a sus mascotas por su nombre.' },
  { icon: ShieldCheck, title: 'Confianza', text: 'Pago seguro, devoluciones sencillas y un equipo que responde de verdad.' },
];

/*
 * CIFRAS QUE SE PUEDEN SOSTENER.
 *
 * Aquí había cuatro, y tres eran inventadas: «+12.000 mascotas felices» (nadie
 * las ha contado), «+40 marcas premium» (el catálogo tiene 12) y «4.8★ de
 * valoración media», que además de falsa es una práctica prohibida —ver
 * `lib/valoraciones.ts`—.
 *
 * Las que quedan salen del catálogo o de la configuración de la tienda, así
 * que se mueven solas cuando la tienda crece y no hay que acordarse de nada.
 * Prefiero tres ciertas que cuatro con relleno.
 */
const ENVIO_GRATIS_DESDE = 49;

export function ConocenosPage() {
  const nav = useNavegacion();
  const marcas = nav.find((e) => e.etiqueta === 'Marcas')?.columnas?.[0]?.enlaces.length ?? 0;

  const cifras: [string, string][] = [
    ...(marcas > 0 ? ([[`${marcas}`, 'Marcas en catálogo']] as [string, string][]) : []),
    ['24-48 h', 'Entrega en Canarias'],
    [`${ENVIO_GRATIS_DESDE} €`, 'Envío gratis desde'],
  ];

  return (
    <div className="overflow-x-clip">
      {/* Cabecera */}
      <section className="container-page pt-10 text-center">
        <Reveal>
          <span className="chip border-sky-500/25 bg-sky-500/10 text-brand-700">Conócenos</span>
          <h1 className="mx-auto mt-4 max-w-2xl font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
            Cuidamos a quienes <span className="text-brand-700">más quieres</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-brand-900/70">
            Chacho Pet Shop nace en Canarias con una idea sencilla: que alimentar bien a tu mascota
            sea fácil, honesto y de confianza.
          </p>
        </Reveal>
      </section>

      {/* 3 features */}
      <section className="container-page py-10">
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card flex items-start gap-3 rounded-4xl p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
                <f.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display font-bold text-ink">{f.title}</p>
                <p className="text-sm text-brand-900/60">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Historia */}
      <section className="container-page py-10">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            {/*
              Esta foto es de archivo y NO es la tienda: decía `alt="Nuestra
              tienda"`, o sea que afirmaba serlo. Mientras no haya una foto real
              del local, el `alt` queda vacío —es decoración, y así un lector de
              pantalla no la anuncia como algo que no es—.
            */}
            <div className="overflow-hidden rounded-5xl border-4 border-white shadow-lift">
              <img
                src="https://picsum.photos/seed/chacho-tienda/900/700"
                alt=""
                width={900}
                height={700}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display text-3xl font-bold text-ink">Nuestra historia</h2>
            <div className="mt-4 space-y-4 text-brand-900/70">
              <p>
                Empezamos como muchos de nuestros clientes: buscando lo mejor para nuestras propias
                mascotas y sin encontrar una tienda que combinara buen producto, buen precio y buen
                consejo. Así que decidimos crearla.
              </p>
              <p>
                Hoy trabajamos con las marcas más reconocidas de nutrición animal —piensos naturales,
                dietas veterinarias, snacks y accesorios— y seguimos con la misma obsesión del primer
                día: que cada mascota coma como se merece.
              </p>
              <p className="font-semibold text-brand-800">
                Nuestra meta es simple: el bienestar de tu mascota, cada día un poco mejor.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Cifras */}
      <section className="container-page py-6">
        <div className="grid grid-cols-2 gap-3 rounded-5xl bg-brand-800 p-6 text-center text-cream sm:grid-cols-3 sm:p-8">
          {cifras.map(([num, label]) => (
            <div key={label}>
              <p className="font-display text-3xl font-extrabold text-amber-400 sm:text-4xl">{num}</p>
              <p className="mt-1 text-sm text-cream/70">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Valores */}
      <section className="container-page py-12">
        <div className="mb-8 text-center">
          <span className="text-sm font-bold uppercase tracking-wide text-amber-700">Lo que nos mueve</span>
          <h2 className="mt-1 font-display text-3xl font-bold text-ink sm:text-4xl">Nuestros valores</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v) => (
            <Reveal key={v.title}>
              <div className="card h-full rounded-4xl p-6">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-brand-700">
                  <v.icon className="h-6 w-6" />
                </div>
                <p className="font-display text-lg font-bold text-ink">{v.title}</p>
                <p className="mt-1 text-sm text-brand-900/60">{v.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-page py-10">
        <div className="flex flex-col items-center gap-5 rounded-5xl bg-brand-700 px-6 py-12 text-center text-cream">
          <h2 className="font-display text-3xl font-bold">¿Listo para cuidar a tu mascota?</h2>
          <p className="max-w-md text-cream/75">Explora nuestro catálogo o escríbenos y te ayudamos a elegir.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/tienda" className="btn-amber px-7 py-3.5 text-base">Ir a la tienda</Link>
            <Link to="/contacto" className="btn bg-white/10 px-7 py-3.5 text-base text-cream hover:bg-white/20">Contactar</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
