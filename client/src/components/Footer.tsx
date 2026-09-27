import { Link } from 'react-router-dom';
import { CreditCard, Facebook, Headphones, Instagram, Leaf, MapPin, Truck } from 'lucide-react';
import { EMPRESA, REDES_SOCIALES, datosDeContacto } from '@/lib/empresa';

/**
 * PIE DE LA TIENDA.
 *
 * Correcciones respecto al anterior:
 *
 *   · Se han quitado DOS ENLACES VACÍOS. Eran `<a href="#">` sin texto, con
 *     iconos de Instagram y Facebook: no llevaban a ninguna parte y un lector
 *     de pantalla anunciaba «enlace» y se callaba. Un control que parece
 *     pulsable y no hace nada es peor que no ponerlo. Vuelven cuando existan
 *     los perfiles de verdad — ver REDES_SOCIALES abajo.
 *
 *   · «Envíos y devoluciones» apuntaba a /contacto. La política de envíos es de
 *     lo primero que se mira antes de comprar, y llevar a un formulario no
 *     responde a la pregunta. El enlace se retira hasta que exista la página,
 *     en vez de fingir que existe.
 *
 *   · Se han añadido roedores y peces, que tienen producto y faltaban.
 *
 *   · Bloque de datos de empresa, con los huecos MARCADOS. Vender sin razón
 *     social ni NIF visibles incumple la LSSI, así que no es un detalle
 *     estético; pero inventarlos sería peor que dejar el hueco señalado.
 */

const VENTAJAS = [
  { icono: Truck, titulo: 'Envío en 24-48 h', texto: 'A toda Canarias' },
  { icono: CreditCard, titulo: 'Pago seguro', texto: 'Procesado por Stripe' },
  { icono: Headphones, titulo: 'Te asesoramos', texto: 'Escríbenos y te ayudamos a elegir' },
  { icono: Leaf, titulo: 'Marcas de confianza', texto: 'Nutrición especializada' },
];

/** Sólo destinos que existen hoy. Nada de enlaces a páginas por escribir. */
const COMPRAR: [string, string][] = [
  ['Perros', '/tienda?animal=perro'],
  ['Gatos', '/tienda?animal=gato'],
  ['Aves', '/tienda?animal=ave'],
  ['Roedores', '/tienda?animal=roedor'],
  ['Peces', '/tienda?animal=pez'],
  ['Ver todo el catálogo', '/tienda'],
];

const AYUDA: [string, string][] = [
  ['Conócenos', '/conocenos'],
  ['Contacto', '/contacto'],
  ['Mi cuenta', '/cuenta'],
];

const LEGAL: [string, string][] = [
  ['Aviso legal', '/aviso-legal'],
  ['Política de privacidad', '/privacidad'],
  ['Política de cookies', '/cookies'],
  ['Condiciones de compra', '/condiciones'],
];

function Columna({ titulo, enlaces }: { titulo: string; enlaces: [string, string][] }) {
  return (
    <div>
      <h3 className="mb-3 text-overline font-bold uppercase text-content-muted">{titulo}</h3>
      <ul className="list-none space-y-1 p-0">
        {enlaces.map(([etiqueta, destino]) => (
          <li key={destino}>
            {/* `py-2` no es decorativo: sube la diana de 17 px a 40. */}
            <Link
              to={destino}
              className="inline-flex min-h-10 items-center rounded-control text-body-sm text-content-muted transition-colors hover:text-brand-700"
            >
              {etiqueta}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * DÓNDE ESTAMOS.
 *
 * El mapa se embebe desde OpenStreetMap con las coordenadas de la tienda: es
 * fiable y no necesita clave de API (el embed «keyless» de Google devuelve 429 a
 * poco que se recargue). Va con `loading="lazy"` para no cargar el iframe hasta
 * que se acerca al pie —es lo último de la página— y con un enlace «Cómo llegar»
 * que abre la app de mapas, que es lo que de verdad usa quien viene a la tienda.
 */
function Mapa({ direccion }: { direccion: string }) {
  const consulta = encodeURIComponent(direccion);
  const geo = EMPRESA.geo;
  // Un recuadro pequeño alrededor del punto, para que el mapa salga con zoom de
  // calle y el marcador centrado.
  const d = 0.004;
  const mapaSrc = geo
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${geo.lon - d}%2C${geo.lat - d}%2C${
        geo.lon + d
      }%2C${geo.lat + d}&layer=mapnik&marker=${geo.lat}%2C${geo.lon}`
    : `https://www.google.com/maps?q=${consulta}&output=embed`;
  return (
    <div className="container-page border-t border-edge-subtle py-section-sm">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr] lg:items-center">
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-overline font-bold uppercase text-content-muted">
            <MapPin className="h-4 w-4 text-brand-600" aria-hidden="true" />
            Dónde estamos
          </h3>
          <p className="text-body font-semibold text-content">{EMPRESA.nombreComercial}</p>
          <p className="mt-1 max-w-xs text-body-sm text-content-muted">{direccion}</p>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${consulta}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-control bg-brand-700 px-4 text-body-sm font-semibold text-content-inverse transition-colors hover:bg-brand-800"
          >
            <MapPin className="h-4 w-4" aria-hidden="true" />
            Cómo llegar
          </a>
        </div>
        <div className="overflow-hidden rounded-card border border-edge-subtle">
          <iframe
            title={`Mapa de ${EMPRESA.nombreComercial} en ${direccion}`}
            src={mapaSrc}
            className="h-64 w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </div>
  );
}

export function Footer() {
  const contacto = datosDeContacto();

  return (
    <footer className="mt-section-lg border-t border-edge-subtle bg-surface-sunken">
      {/* Ventajas */}
      <div className="container-page border-b border-edge-subtle py-section-sm">
        <ul className="grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {VENTAJAS.map((v) => (
            <li key={v.titulo} className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-brand-100 text-brand-700">
                <v.icono className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-body-sm font-bold text-content">{v.titulo}</span>
                <span className="block text-caption text-content-muted">{v.texto}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Enlaces */}
      <div className="container-page grid gap-8 py-section-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-heading font-extrabold text-brand-700">Chacho Pet Shop</p>
          <p className="mt-3 max-w-xs text-body-sm text-content-muted">
            Nutrición y accesorios para perros, gatos y otras mascotas. Enviamos a toda Canarias.
          </p>

          {contacto.length > 0 && (
            <dl className="mt-4 space-y-1 text-body-sm">
              {contacto.map((c) => (
                <div key={c.etiqueta} className="flex gap-1.5">
                  <dt className="font-semibold text-content-muted">{c.etiqueta}:</dt>
                  <dd className="text-content-muted">
                    {c.href ? <a href={c.href} className="hover:text-brand-700">{c.valor}</a> : c.valor}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {REDES_SOCIALES.length > 0 && (
            <ul className="mt-4 flex list-none gap-2 p-0">
              {REDES_SOCIALES.map((r) => (
                <li key={r.nombre}>
                  <a href={r.url} className="btn-icon border border-edge" aria-label={r.nombre} rel="noopener noreferrer" target="_blank">
                    {r.nombre === 'Instagram'
                      ? <Instagram className="h-4 w-4" aria-hidden="true" />
                      : <Facebook className="h-4 w-4" aria-hidden="true" />}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Columna titulo="Comprar" enlaces={COMPRAR} />
        <Columna titulo="Ayuda" enlaces={AYUDA} />
        <Columna titulo="Legal" enlaces={LEGAL} />
      </div>

      {/* Dónde estamos: dirección + mapa. Sólo si hay dirección confirmada. */}
      {EMPRESA.direccion && <Mapa direccion={EMPRESA.direccion} />}

      {/* Pie del pie */}
      <div className="border-t border-edge-subtle">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-caption text-content-subtle sm:flex-row">
          <p>© {new Date().getFullYear()} Chacho Pet Shop. Todos los derechos reservados.</p>
          {(EMPRESA.razonSocial || EMPRESA.nif) && (
            <p>
              {EMPRESA.razonSocial}
              {EMPRESA.razonSocial && EMPRESA.nif ? ' · ' : ''}
              {EMPRESA.nif}
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
