import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, ChevronRight, CreditCard, Minus, Plus, ShoppingBag, Truck } from 'lucide-react';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { eur } from '@/lib/cn';
import { useSeo } from '@/lib/useSeo';
import { fichaTecnica, datosEstructuradosProducto, motivoRelacionado } from '@/lib/producto';
import { Galeria } from '@/components/producto/Galeria';
import { tipoDeProducto } from '@/lib/imagenes';
import { leerContenido } from '@/lib/contenido';
import { ContenidoFicha } from '@/components/producto/ContenidoFicha';
import { ProductCard } from '@/components/ProductCard';
import { ErrorState } from '@/components/ErrorState';
import { useCart } from '@/store/cart';
import { toast } from '@/store/toast';

const ENVIO_GRATIS_DESDE = 49;

/**
 * FICHA DE PRODUCTO.
 *
 * Es la pantalla donde se decide la compra, así que lo que tiene que caber
 * arriba es: qué es, de quién, cuánto cuesta, en qué formatos, si se puede
 * comprar y el botón. Todo lo demás va después.
 *
 * Lo que cambia en la 2C:
 *
 *   · SE DICE SI HAY EXISTENCIAS. Antes no aparecía por ninguna parte, y un
 *     formato agotado se podía seleccionar y añadir al carrito para descubrirlo
 *     al pagar.
 *
 *   · LA FICHA TÉCNICA SALE DE LOS DATOS. Sin acordeones vacíos: aquí no hay
 *     ingredientes ni composición ni tabla de raciones —no existen en la base
 *     de datos—, así que no se fingen. Lo que hay es marca, formatos, para qué
 *     animal, tipo y necesidades, y todo eso es cierto.
 *
 *   · LOS RELACIONADOS DICEN POR QUÉ LO SON.
 *
 *   · TIENE TÍTULO, DESCRIPCIÓN, CANÓNICA Y DATOS ESTRUCTURADOS PROPIOS.
 */
export function ProductPage() {
  const { slug = '' } = useParams();
  const { data, loading, error, refetch } = useFetch(() => api.product(slug), [slug]);

  const add = useCart((s) => s.add);
  const abrirCarrito = useCart((s) => s.open);
  const [variantId, setVariantId] = useState<string | undefined>();
  const [cantidad, setCantidad] = useState(1);
  const [anadido, setAnadido] = useState(false);

  const producto = data?.product;

  /*
   * La variante elegida, o la primera QUE SE PUEDA COMPRAR.
   *
   * Empezar por `variants[0]` a secas dejaba preseleccionado un formato agotado
   * siempre que fuera el más barato, que es justo el orden en que llegan.
   */
  const variante = useMemo(() => {
    if (!producto) return undefined;
    const elegida = producto.variants.find((v) => v.id === variantId);
    if (elegida) return elegida;
    return producto.variants.find((v) => v.stock > 0) ?? producto.variants[0];
  }, [producto, variantId]);

  const precio = variante?.price ?? producto?.price ?? 0;
  const rebajado = producto?.compareAt != null && producto.compareAt > precio;
  const ahorro = rebajado ? Math.round((1 - precio / (producto!.compareAt as number)) * 100) : 0;
  const hayExistencias = variante ? variante.stock > 0 : false;
  const maximo = Math.max(1, Math.min(variante?.stock ?? 1, 20));

  useSeo({
    titulo: producto ? `${producto.name} · ${producto.brand.name}` : 'Producto',
    descripcion: producto?.description,
    canonica: producto ? `${window.location.origin}/producto/${producto.slug}` : undefined,
    estructurado: producto ? datosEstructuradosProducto(producto, window.location.origin) : null,
  });

  if (loading) {
    return (
      <div className="container-page py-8">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="aspect-square animate-pulse rounded-card bg-hundido/60" />
          <div className="space-y-4">
            <div className="h-4 w-24 animate-pulse rounded bg-hundido/60" />
            <div className="h-10 w-3/4 animate-pulse rounded bg-hundido/60" />
            <div className="h-8 w-32 animate-pulse rounded bg-hundido/60" />
          </div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="container-page py-16">
        <ErrorState message={error} onRetry={refetch} />
      </div>
    );
  }
  if (!producto) {
    return (
      <div className="container-page flex flex-col items-center gap-3 py-20 text-center">
        <h1 className="font-display text-title font-bold text-content">Este producto ya no está</h1>
        <p className="max-w-sm text-body text-content-muted">
          Puede que lo hayamos retirado o que el enlace esté mal escrito.
        </p>
        <Link to="/tienda" className="btn btn-md btn-primary mt-2">
          Ver el catálogo
        </Link>
      </div>
    );
  }

  const { related } = data!;
  const galeria = producto.gallery.length ? producto.gallery : [producto.image];
  const ficha = fichaTecnica(producto);
  // Puede venir corrupto o ausente: `leerContenido` devuelve `null` y no se pinta.
  const contenido = leerContenido(producto.contenido);
  const categoria = producto.categories[0];
  /*
   * De general a concreta: primero las que no tienen padre y después las que
   * cuelgan de ellas. Con una sola categoría —los 27 productos anteriores— sale
   * exactamente lo de siempre.
   */
  const cadenaDeCategorias = [...producto.categories].sort(
    (a, b) => Number(Boolean(a.parentId)) - Number(Boolean(b.parentId)),
  );
  const animal = producto.animals[0];

  const anadir = () => {
    if (!hayExistencias) return;
    add({
      productId: producto.id,
      variantId: variante?.id,
      slug: producto.slug,
      name: producto.name,
      variantLabel: variante?.label,
      image: producto.image,
      unitPrice: precio,
      quantity: cantidad,
    });
    setAnadido(true);
    toast.success(`${producto.name} añadido al carrito`);
    window.setTimeout(() => setAnadido(false), 2600);
  };

  return (
    <div className="container-page py-6 sm:py-8">
      <nav aria-label="Migas de pan">
        <ol className="flex list-none flex-wrap items-center gap-1 p-0 text-body-sm text-content-muted">
          <li><Link to="/" className="hover:text-brand-700 hover:underline">Inicio</Link></li>
          <li className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-content-subtle" aria-hidden="true" />
            <Link to="/tienda" className="hover:text-brand-700 hover:underline">Tienda</Link>
          </li>
          {/* Los escalones intermedios llevan a filtros que existen de verdad. */}
          {animal && (
            <li className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-content-subtle" aria-hidden="true" />
              <Link to={`/tienda?animal=${animal.slug}`} className="hover:text-brand-700 hover:underline">
                {animal.name}
              </Link>
            </li>
          )}
          {/*
            LA CADENA DE CATEGORÍAS, no sólo una.

            Desde la Fase 2I el catálogo tiene tres niveles y un producto cuelga
            de su línea de marca Y de la categoría madre. Enseñar sólo una
            rompía el camino de vuelta: desde «Alpha Spirit alimentación perro»
            no había forma de subir a «Alimentación seca perros» sin volver al
            menú.

            Se ordenan de más general a más concreta —la madre no tiene padre y
            la línea sí—, que es como se ha llegado hasta aquí navegando.
          */}
          {cadenaDeCategorias.map((c) => (
            <li key={c.id} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-content-subtle" aria-hidden="true" />
              <Link
                to={`/tienda?${animal ? `animal=${animal.slug}&` : ''}category=${c.slug}`}
                className="hover:text-brand-700 hover:underline"
              >
                {c.name}
              </Link>
            </li>
          ))}
          <li className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-content-subtle" aria-hidden="true" />
            <span aria-current="page" className="font-semibold text-content">{producto.name}</span>
          </li>
        </ol>
      </nav>

      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-12">
        <Galeria imagenes={galeria} nombre={producto.name} tipoArte={tipoDeProducto(producto)} />

        {/* ── Compra ─────────────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Link
            to={`/tienda?brand=${producto.brand.slug}`}
            className="text-overline font-bold uppercase tracking-[0.14em] text-brand-600 hover:underline"
          >
            {producto.brand.name}
          </Link>
          <h1 className="mt-2 font-display text-display font-extrabold leading-tight tracking-tight text-content">
            {producto.name}
          </h1>

          {/*
            El precio, con marcado semántico. El anterior va en `<s>` —tachado
            de verdad, no un borde dibujado— para que se lea como «precio
            anterior» y no como el que se paga.
          */}
          {/*
            UN PRECIO SIN FIJAR NO SE ENSEÑA COMO «0,00 €».
            Los productos reales llegan del fabricante con su documentación pero
            sin PVP: eso lo decide la tienda. Mientras no esté puesto, «0,00 €»
            sería un precio anunciado, y anunciar un precio que no es el que se
            va a cobrar es lo peor que puede hacer una ficha.
            Se dice lo que pasa. Y como estos productos entran con cero
            unidades, no hay forma de que un precio pendiente acabe en un cobro.
          */}
          <p className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {precio > 0 ? (
              <span className="font-display text-title font-extrabold text-content">{eur(precio)}</span>
            ) : (
              <span className="font-display text-heading font-bold text-content-muted">
                Precio pendiente
              </span>
            )}
            {rebajado && (
              <>
                <s className="text-body-lg text-content-subtle">{eur(producto.compareAt)}</s>
                <span className="rounded-pill bg-amber-500 px-2.5 py-0.5 text-body-sm font-bold text-ink">
                  −{ahorro}%
                </span>
                <span className="sr-only">Precio rebajado. Antes {eur(producto.compareAt)}.</span>
              </>
            )}
          </p>

          <p className="mt-3 text-body text-content-muted">{producto.description}</p>

          {producto.variants.length > 0 && (
            <Formatos
              variantes={producto.variants}
              elegida={variante}
              onElegir={(id) => {
                setVariantId(id);
                setCantidad(1);
              }}
            />
          )}

          <Disponibilidad hay={hayExistencias} />

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Cantidad valor={cantidad} maximo={maximo} onCambiar={setCantidad} desactivado={!hayExistencias} />
            <button
              type="button"
              onClick={anadir}
              disabled={!hayExistencias}
              className="btn btn-lg btn-primary flex-1 justify-center disabled:cursor-not-allowed disabled:opacity-50"
            >
              {anadido ? (
                <>
                  <Check className="h-5 w-5" aria-hidden="true" /> Añadido
                </>
              ) : (
                <>
                  <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                  {!hayExistencias ? 'Sin existencias' : precio > 0 ? `Añadir · ${eur(precio * cantidad)}` : 'Añadir al carrito'}
                </>
              )}
            </button>
          </div>

          {/*
            Después de añadir NO se navega a ninguna parte: quien está mirando
            una ficha suele querer seguir mirando. Aparece el atajo al carrito,
            y quien no lo quiera lo ignora.
          */}
          <div aria-live="polite" className="min-h-[2.75rem]">
            {anadido && (
              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-control border border-success-border bg-success-subtle px-4 py-2.5">
                <p className="text-body-sm font-semibold text-success">
                  {cantidad} × {producto.name}
                  {variante?.label ? ` (${variante.label})` : ''} en el carrito
                </p>
                <button type="button" onClick={abrirCarrito} className="btn-link text-body-sm">
                  Ver el carrito →
                </button>
              </div>
            )}
          </div>

          <ul className="mt-5 list-none space-y-2 border-t border-edge-subtle p-0 pt-4 text-body-sm text-content-muted">
            <li className="flex items-center gap-2">
              <Truck className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
              Entrega en 24-48 h en Canarias · Envío gratis desde {ENVIO_GRATIS_DESDE} €
            </li>
            <li className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
              Pago seguro procesado por Stripe
            </li>
          </ul>
        </div>
      </div>

      {/* ── Contenido del fabricante ───────────────────────────────────── */}
      {/*
        Va ANTES de «Detalles». Es el contenido real —descripción, composición,
        análisis, raciones— y quien entra a una ficha de pienso viene a leer
        eso; «Detalles» son cuatro pares de metadatos del catálogo.

        Se pinta sólo si el producto lo trae: los 27 productos que todavía no
        tienen documentación no muestran secciones vacías.
      */}
      {contenido && (
        <div className="max-w-3xl">
          <ContenidoFicha contenido={contenido} />
        </div>
      )}

      {/* ── Ficha técnica ─────────────────────────────────────────────── */}
      {ficha.length > 0 && (
        <section aria-labelledby="ficha" className="mt-section-sm max-w-3xl">
          <h2 id="ficha" className="font-display text-title font-extrabold tracking-tight text-content">
            Detalles
          </h2>
          {/*
            Sólo filas con dato. No hay ingredientes, ni composición analítica,
            ni tabla de raciones: no están en la base de datos, y un acordeón
            vacío llamado «Ingredientes» promete algo que no hay dentro.
          */}
          <dl className="mt-4 divide-y divide-edge-subtle border-y border-edge-subtle">
            {ficha.map((fila) => (
              <div key={fila.etiqueta} className="grid grid-cols-[9rem_1fr] gap-4 py-3 sm:grid-cols-[12rem_1fr]">
                <dt className="text-body-sm font-semibold text-content-muted">{fila.etiqueta}</dt>
                <dd className="text-body-sm text-content">
                  {fila.enlaces ? (
                    <span className="flex flex-wrap gap-x-2 gap-y-1">
                      {fila.enlaces.map((e) => (
                        <Link key={e.href} to={e.href} className="text-brand-700 underline underline-offset-4 hover:text-brand-500">
                          {e.etiqueta}
                        </Link>
                      ))}
                    </span>
                  ) : (
                    fila.valor
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* ── Relacionados ──────────────────────────────────────────────── */}
      {related.length > 0 && (
        <section aria-labelledby="relacionados" className="mt-section">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2 id="relacionados" className="font-display text-title font-extrabold tracking-tight text-content">
              {motivoRelacionado(related, categoria?.name, animal?.name)}
            </h2>
            {categoria && (
              <Link to={`/tienda?category=${categoria.slug}`} className="btn-link text-body-sm">
                Ver toda la sección →
              </Link>
            )}
          </div>
          <ul className="-mx-4 mt-5 flex list-none snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:snap-none sm:overflow-visible sm:px-0 lg:grid-cols-4">
            {related.map((p) => (
              <li key={p.id} className="w-[15rem] shrink-0 snap-start sm:w-auto">
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */

/**
 * Los formatos.
 *
 * Es un grupo de radio de verdad: sólo se puede elegir uno, las flechas lo
 * recorren y el lector de pantalla dice «1 de 2». Con `<button>` habría que
 * programar todo eso a mano, y no estaba.
 *
 * Un formato agotado se ENSEÑA y se DESACTIVA. Esconderlo haría creer que no
 * existe; dejarlo pulsable lleva a un carrito que falla al pagar.
 */
function Formatos({
  variantes,
  elegida,
  onElegir,
}: {
  variantes: { id: string; label: string; price: number; stock: number }[];
  elegida?: { id: string };
  onElegir: (id: string) => void;
}) {
  if (variantes.length < 2) {
    const unica = variantes[0];
    return unica ? (
      <p className="mt-4 text-body-sm text-content-muted">
        Formato: <span className="font-semibold text-content">{unica.label}</span>
      </p>
    ) : null;
  }

  return (
    <fieldset className="mt-5 border-0 p-0">
      <legend className="mb-2 text-overline font-bold uppercase tracking-[0.12em] text-content-subtle">
        Formato
      </legend>
      <div className="flex flex-wrap gap-2">
        {variantes.map((v) => {
          const agotada = v.stock <= 0;
          const marcada = elegida?.id === v.id;
          return (
            <label
              key={v.id}
              className={`relative flex min-h-11 cursor-pointer items-center gap-2 rounded-control border px-4 text-body-sm transition-colors ${
                marcada ? 'border-brand-600 bg-brand-50 font-bold text-brand-700' : 'border-edge bg-surface text-content hover:border-brand-300'
              } ${agotada ? 'cursor-not-allowed opacity-45' : ''}`}
            >
              <input
                type="radio"
                name="formato"
                value={v.id}
                checked={marcada}
                disabled={agotada}
                onChange={() => onElegir(v.id)}
                className="sr-only"
              />
              <span>{v.label}</span>
              <span className={marcada ? 'text-brand-700' : 'text-content-muted'}>{eur(v.price)}</span>
              {agotada && <span className="text-caption text-content-subtle">· agotado</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function Disponibilidad({ hay }: { hay: boolean }) {
  /*
   * Sólo dos estados, y ninguno inventa urgencia. Nada de «quedan 3»: el stock
   * de la tienda es alto y uniforme, y fabricar escasez con él sería una
   * presión falsa. Quien manda sobre si se puede comprar de verdad es el
   * servidor, al reservar.
   */
  return (
    <p className={`mt-4 flex items-center gap-2 text-body-sm font-semibold ${hay ? 'text-success' : 'text-danger'}`}>
      <span
        aria-hidden="true"
        className={`h-2 w-2 shrink-0 rounded-pill ${hay ? 'bg-success' : 'bg-danger'}`}
      />
      {hay ? 'Disponible' : 'Sin existencias en este formato'}
    </p>
  );
}

function Cantidad({
  valor,
  maximo,
  onCambiar,
  desactivado,
}: {
  valor: number;
  maximo: number;
  onCambiar: (n: number) => void;
  desactivado: boolean;
}) {
  return (
    <div className="flex items-center rounded-control border border-edge bg-surface">
      <button
        type="button"
        onClick={() => onCambiar(Math.max(1, valor - 1))}
        disabled={desactivado || valor <= 1}
        aria-label="Quitar una unidad"
        className="flex h-12 w-11 items-center justify-center text-content disabled:opacity-30"
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      {/*
        El número se anuncia como campo con nombre: sin esto se oía sólo «1».
        Es de sólo lectura porque los dos botones ya cubren el caso, y así no
        hay que validar lo que alguien teclee.
      */}
      <span
        role="status"
        aria-label={`Cantidad: ${valor}`}
        className="min-w-9 text-center font-display text-body font-bold tabular-nums text-content"
      >
        {valor}
      </span>
      <button
        type="button"
        onClick={() => onCambiar(Math.min(maximo, valor + 1))}
        disabled={desactivado || valor >= maximo}
        aria-label="Añadir una unidad"
        className="flex h-12 w-11 items-center justify-center text-content disabled:opacity-30"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
