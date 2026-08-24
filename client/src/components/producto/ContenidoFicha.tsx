import type { ContenidoProducto, TablaRaciones } from '@/lib/contenido';

/**
 * EL CONTENIDO REAL DE UNA FICHA.
 *
 * Composición, análisis, características, proceso de fabricación,
 * recomendaciones y tabla de raciones. Todo sale de `Product.contenido`, que
 * es documentación del fabricante transcrita literalmente.
 *
 * ── Dos decisiones que gobiernan todo esto ────────────────────────────────
 *
 * · CADA APARTADO ES OPCIONAL. Un transportín no tiene composición analítica y
 *   un pienso sí. La ficha pinta lo que hay y no deja huecos con títulos
 *   vacíos, que es como se nota que una tienda ha copiado una plantilla.
 *
 * · NADA SE RESUME NI SE REESCRIBE. Es una etiqueta de producto: los
 *   porcentajes, la coma decimal y el orden de los ingredientes son el dato.
 *   Aquí sólo se decide la jerarquía visual.
 */

function Seccion({
  id,
  titulo,
  children,
}: {
  id: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="border-t border-edge-subtle pt-6">
      <h2 id={id} className="font-display text-title font-extrabold tracking-tight text-content">
        {titulo}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * LA TABLA DE RACIONES.
 *
 * Llegó como un gráfico. Se ha transcrito a datos porque una imagen de una
 * tabla no se puede leer con un lector de pantalla, ni buscar, ni reflotar en
 * un móvil: quien necesita saber cuánto darle a un perro de 25 kg tendría que
 * ampliar una foto con los dedos.
 *
 * ── Cómo se lee a 320 px ──────────────────────────────────────────────────
 *
 * Nueve columnas de pesos no caben en un móvil, y aplastarlas las vuelve
 * ilegibles. La tabla se desplaza en horizontal DENTRO de su caja, y la caja es
 * una región enfocable con nombre: con teclado se llega y las flechas la mueven.
 * La primera columna se queda fija, así que nunca se pierde de vista a qué tipo
 * de perro corresponde la cifra que se está mirando.
 */
function TablaDeRaciones({ raciones }: { raciones: TablaRaciones }) {
  return (
    <div
      role="region"
      aria-label="Tabla de raciones diarias. Se desplaza en horizontal."
      tabIndex={0}
      className="overflow-x-auto rounded-card border border-edge focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
    >
      <table className="w-full border-collapse text-body-sm">
        <caption className="sr-only">
          Cantidad diaria recomendada en gramos, según el peso del perro y su tipo.
        </caption>
        <thead>
          <tr className="bg-surface-sunken">
            {/*
              La cabecera de la esquina describe las dos dimensiones. Dejarla
              vacía obliga al lector de pantalla a anunciar una celda muda antes
              de cada fila.
            */}
            <th scope="col" className="sticky left-0 z-10 bg-surface-sunken px-3 py-2 text-left">
              Tipo de perro
            </th>
            {raciones.pesos.map((p) => (
              <th key={p} scope="col" className="whitespace-nowrap px-3 py-2 text-center font-semibold">
                {p} kg
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {raciones.filas.map((fila) => (
            <tr key={fila.tipo} className="border-t border-edge-subtle">
              {/*
                `scope="row"`: así se anuncia «Senior, 25 kg, 286 gramos» en vez
                de un número suelto sin contexto.
              */}
              <th
                scope="row"
                className="sticky left-0 z-10 bg-surface px-3 py-2 text-left font-semibold text-content"
              >
                {fila.tipo}
              </th>
              {fila.valores.map((v, i) => (
                <td key={raciones.pesos[i]} className="whitespace-nowrap px-3 py-2 text-center tabular-nums">
                  {v} {raciones.unidad}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ContenidoFicha({ contenido }: { contenido: ContenidoProducto }) {
  const c = contenido;

  return (
    <div className="mt-10 space-y-8">
      {c.descripcion?.length ? (
        <Seccion id="ficha-descripcion" titulo="Descripción">
          {c.titular && (
            <p className="mb-3 font-display text-heading font-bold text-content">{c.titular}</p>
          )}
          <div className="space-y-3 text-body text-content-muted">
            {c.descripcion.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
          </div>
          {c.tamanos && (
            <p className="mt-4 text-body-sm text-content-muted">
              <span className="font-semibold text-content">Tamaños:</span> {c.tamanos}
            </p>
          )}
        </Seccion>
      ) : null}

      {c.caracteristicas?.puntos?.length ? (
        <Seccion id="ficha-caracteristicas" titulo={c.caracteristicas.titulo}>
          {/*
            Lista y no rejilla de tarjetas: son cinco frases cortas y una lista
            se lee de un tirón. Convertirlas en tarjetas con icono sería
            decorar una lista.
          */}
          <ul className="list-none space-y-2 p-0">
            {c.caracteristicas.puntos.map((p) => (
              <li key={p} className="flex gap-2.5 text-body text-content-muted">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-pill bg-brand-500" />
                {p}
              </li>
            ))}
          </ul>
        </Seccion>
      ) : null}

      {c.composicion ? (
        <Seccion id="ficha-composicion" titulo="Composición">
          <p className="text-body text-content-muted">{c.composicion}</p>
        </Seccion>
      ) : null}

      {c.analitica?.length ? (
        <Seccion id="ficha-analitica" titulo="Composición analítica">
          {/*
            Lista de definiciones y no tabla: son pares nombre-valor, no una
            matriz. `<dl>` es lo que significa eso, y además reflota solo en un
            móvil sin necesidad de desplazamiento horizontal.
          */}
          <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {c.analitica.map((a) => (
              <div key={a.nombre} className="flex justify-between gap-4 border-b border-edge-subtle pb-2">
                <dt className="text-body-sm text-content-muted">{a.nombre}</dt>
                <dd className="shrink-0 text-body-sm font-semibold tabular-nums text-content">{a.valor}</dd>
              </div>
            ))}
          </dl>
          {c.energia && <p className="mt-4 text-body-sm font-semibold text-content">{c.energia}</p>}
          {c.notaAnalitica && (
            <p className="mt-2 text-body-sm text-content-subtle">{c.notaAnalitica}</p>
          )}
        </Seccion>
      ) : null}

      {c.fabricacion?.parrafos?.length ? (
        <Seccion id="ficha-fabricacion" titulo={c.fabricacion.titulo}>
          <div className="space-y-3 text-body text-content-muted">
            {c.fabricacion.parrafos.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
          </div>
        </Seccion>
      ) : null}

      {c.recomendaciones?.puntos?.length ? (
        <Seccion id="ficha-recomendaciones" titulo={c.recomendaciones.titulo}>
          <ul className="list-none space-y-2 p-0">
            {c.recomendaciones.puntos.map((p) => (
              <li key={p.slice(0, 40)} className="flex gap-2.5 text-body text-content-muted">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-pill bg-brand-500" />
                {p}
              </li>
            ))}
          </ul>
        </Seccion>
      ) : null}

      {c.raciones?.filas?.length ? (
        <Seccion id="ficha-raciones" titulo="Tabla de alimentación">
          <p className="mb-3 text-body-sm text-content-muted">
            Cantidad diaria orientativa, en gramos, según el peso del perro.
          </p>
          <TablaDeRaciones raciones={c.raciones} />
        </Seccion>
      ) : null}
    </div>
  );
}
