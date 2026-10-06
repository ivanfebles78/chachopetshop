import { Facebook, Instagram, MapPin } from 'lucide-react';
import { EMPRESA, REDES_SOCIALES, datosDeContacto } from '@/lib/empresa';

/**
 * PIE DE LA TIENDA.
 *
 * Dos columnas: a la izquierda la identidad, los datos de contacto y «dónde
 * estamos» (dirección + cómo llegar); a la derecha, el mapa de la tienda.
 *
 * Se quitaron las columnas de enlaces (Comprar / Ayuda / Legal) y la tira de
 * ventajas: la navegación ya vive en la cabecera, y el pie se reserva para
 * quiénes somos y cómo encontrarnos —que es lo que de verdad se busca aquí—.
 *
 * El mapa se embebe desde OpenStreetMap con las coordenadas de la tienda: es
 * fiable y no necesita clave de API (el embed «keyless» de Google devuelve 429
 * a poco que se recargue). Va `loading="lazy"` por ser lo último de la página, y
 * el botón «Cómo llegar» abre la app de mapas con el punto exacto.
 */
export function Footer() {
  // Teléfono, WhatsApp y email. El horario sale en la sección de contacto de
  // cada página, y la dirección se muestra justo debajo en «Dónde estamos»: no
  // se repiten aquí.
  const contacto = datosDeContacto().filter(
    (c) => c.etiqueta !== 'Horario' && c.etiqueta !== 'Dirección',
  );
  const direccion = EMPRESA.direccion;
  const geo = EMPRESA.geo;

  // Un recuadro pequeño alrededor del punto, para que el mapa salga con zoom de
  // calle y el marcador centrado.
  const d = 0.004;
  const mapaSrc = !direccion
    ? null
    : geo
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${geo.lon - d}%2C${geo.lat - d}%2C${
          geo.lon + d
        }%2C${geo.lat + d}&layer=mapnik&marker=${geo.lat}%2C${geo.lon}`
      : `https://www.google.com/maps?q=${encodeURIComponent(direccion)}&output=embed`;
  const destinoLlegar = geo ? `${geo.lat},${geo.lon}` : (direccion ?? '');

  return (
    <footer className="mt-section-lg border-t border-edge-subtle bg-surface-sunken">
      <div className="container-page grid gap-8 py-section lg:grid-cols-[1fr_1.4fr] lg:items-center">
        {/* Izquierda: identidad, contacto y dónde estamos */}
        <div>
          <p className="font-display text-heading font-extrabold text-brand-700">Chacho Pet Shop</p>
          <p className="mt-3 max-w-sm text-body-sm text-content-muted">
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

          {direccion && (
            <div className="mt-6">
              <h3 className="mb-2 flex items-center gap-2 text-overline font-bold uppercase text-content-muted">
                <MapPin className="h-4 w-4 text-brand-600" aria-hidden="true" />
                Dónde estamos
              </h3>
              <p className="text-body font-semibold text-content">{EMPRESA.nombreComercial}</p>
              <p className="mt-1 max-w-xs text-body-sm text-content-muted">{direccion}</p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destinoLlegar)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-control bg-brand-700 px-4 text-body-sm font-semibold text-content-inverse transition-colors hover:bg-brand-800"
              >
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Cómo llegar
              </a>
            </div>
          )}

          {REDES_SOCIALES.length > 0 && (
            <ul className="mt-6 flex list-none gap-2 p-0">
              {REDES_SOCIALES.map((r) => (
                <li key={r.nombre}>
                  <a
                    href={r.url}
                    className="btn-icon border border-edge"
                    aria-label={r.nombre}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {r.nombre === 'Instagram' ? (
                      <Instagram className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Facebook className="h-4 w-4" aria-hidden="true" />
                    )}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Derecha: mapa de la tienda */}
        {mapaSrc && (
          <div className="overflow-hidden rounded-card border border-edge-subtle">
            <iframe
              title={`Mapa de ${EMPRESA.nombreComercial}${direccion ? ` en ${direccion}` : ''}`}
              src={mapaSrc}
              className="h-72 w-full border-0 lg:h-80"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}
      </div>

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
