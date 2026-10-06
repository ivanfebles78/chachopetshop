import { Link, useParams } from 'react-router-dom';
import { MessageCircle, Phone } from 'lucide-react';
import { EMPRESA, enlaceTelefono, enlaceWhatsApp } from '@/lib/empresa';
import { useOwnatCatalogo, productoPorSlug, nombreLinea, esDeGato, type ProductoOwnat } from '@/lib/ownat';
import { MigasOwnat } from './MigasOwnat';

/** Una sección de la ficha (Composición, Analítica…), sólo si tiene contenido. */
function Bloque({ titulo, texto }: { titulo: string; texto: string }) {
  if (!texto?.trim()) return null;
  return (
    <section className="border-t border-edge-subtle py-5">
      <h2 className="text-overline font-bold uppercase tracking-[0.12em] text-content-subtle">{titulo}</h2>
      <p className="mt-2 whitespace-pre-line text-body-sm leading-relaxed text-content-muted">{texto}</p>
    </section>
  );
}

function Ficha({ producto, linea }: { producto: ProductoOwnat; linea: string }) {
  const whatsapp = enlaceWhatsApp(
    `¡Hola! Me interesa el producto Ownat «${producto.nombre}». ¿Me dais más información?`,
  );
  const telefono = enlaceTelefono();
  const c = producto.contenido;

  return (
    <>
      <MigasOwnat
        pasos={[
          { etiqueta: 'Ownat', href: '/marca/ownat' },
          { etiqueta: nombreLinea(linea), href: `/marca/ownat/${linea}` },
          { etiqueta: producto.nombre },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Foto */}
        <div className="overflow-hidden rounded-card border border-edge-subtle bg-surface-sunken">
          {producto.imagen ? (
            <img src={producto.imagen} alt={producto.nombre} className="mx-auto h-full max-h-[32rem] w-full object-contain p-6" />
          ) : (
            <div className="flex aspect-square items-center justify-center p-8 text-center font-display text-title font-bold text-content-subtle">
              {producto.nombre}
            </div>
          )}
        </div>

        {/* Datos + consulta */}
        <div>
          <span className="inline-flex items-center gap-2 text-overline font-bold uppercase tracking-wider text-brand-600">
            Ownat {nombreLinea(linea)} · {esDeGato(producto.nombre) ? 'Gato' : 'Perro'}
          </span>
          <h1 className="mt-1 font-display text-display font-extrabold leading-tight tracking-tight text-content">
            {producto.nombre}
          </h1>
          {producto.descripcion && (
            <p className="mt-4 text-body leading-relaxed text-content-muted">{producto.descripcion}</p>
          )}
          {c.formatos?.trim() && (
            <p className="mt-4 text-body-sm text-content">
              <span className="font-semibold">Formatos:</span> {c.formatos}
            </p>
          )}

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
          <p className="mt-3 text-caption text-content-subtle">
            Disponible en tienda. Escríbenos y te decimos precio y disponibilidad al momento.
          </p>
        </div>
      </div>

      {/* Contenido detallado de la ficha */}
      <div className="mt-10 max-w-3xl">
        <Bloque titulo="Composición" texto={c.composicion} />
        <Bloque titulo="Componentes analíticos" texto={c.analitica} />
        <Bloque titulo="Aditivos" texto={c.aditivos} />
        <Bloque titulo="Modo de empleo" texto={c.instrucciones} />
      </div>
    </>
  );
}

export function ProductoOwnatPage() {
  const { linea = '', producto = '' } = useParams();
  const { catalogo, cargando, error } = useOwnatCatalogo();
  const ficha = catalogo ? productoPorSlug(catalogo, producto) : undefined;

  return (
    <div className="container-page py-8 sm:py-10">
      {cargando && <div className="h-96 animate-pulse rounded-card bg-hundido/60" />}

      {(error || (catalogo && !ficha)) && (
        <div className="rounded-card border border-edge bg-surface p-8 text-center">
          <p className="text-body text-content-muted">No hemos encontrado ese producto de Ownat.</p>
          <Link to="/marca/ownat" className="btn-link mt-3 inline-block">Volver a Ownat</Link>
        </div>
      )}

      {ficha && <Ficha producto={ficha} linea={linea || ficha.lineaSlug} />}
    </div>
  );
}
