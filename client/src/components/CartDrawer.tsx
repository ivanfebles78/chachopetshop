import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2, Truck, X } from 'lucide-react';
import { lineKey, selectSubtotal, useCart } from '@/store/cart';
import { eur } from '@/lib/cn';
import { useOverlay } from '@/lib/useOverlay';
import { envioPara, faltaParaGratis, useEnvio } from '@/lib/useEnvio';

/**
 * EL CAJÓN DEL CARRITO.
 *
 * Lo que cambia en la Fase 2D:
 *
 *   · SE VE LO QUE SE PAGA POR CADA LÍNEA. Antes sólo estaba el precio
 *     unitario: con dos unidades a 21,95 € había que multiplicar de cabeza para
 *     saber por qué el subtotal decía lo que decía.
 *
 *   · EL ENVÍO SALE DEL SERVIDOR. El umbral estaba escrito a mano aquí y en
 *     otros cinco sitios. Ahora lo dice quien lo cobra.
 *
 *   · CADA CAMBIO SE ANUNCIA. Subir, bajar o quitar algo lo dice una región
 *     activa: quien no ve la pantalla no se enteraba de nada.
 *
 * Lo que NO hay, y es deliberado: ninguna urgencia inventada. Ni «quedan 2», ni
 * «lo están viendo 20 personas», ni carritos que caducan. No es cierto, y
 * además lo detecta cualquiera que vuelva al día siguiente.
 */

const MAXIMO_POR_LINEA = 99;

export function CartDrawer() {
  const { lines, isOpen, close, setQty, remove } = useCart();
  const subtotal = useCart(selectSubtotal);
  const panel = useOverlay(isOpen, close);
  const envio = useEnvio();

  const gastosEnvio = envioPara(subtotal, envio);
  const falta = faltaParaGratis(subtotal, envio);
  const total = subtotal + gastosEnvio;

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 animate-fade-in bg-ink/40 backdrop-blur-sm" onClick={close} aria-hidden="true" />
      <aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Tu carrito"
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md animate-slide-in-right flex-col bg-cream shadow-raised"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-edge-subtle px-5 py-4">
          <h2 className="flex items-center gap-2 font-display text-heading font-bold text-content">
            <ShoppingBag className="h-5 w-5 text-brand-600" aria-hidden="true" />
            Tu carrito
            {lines.length > 0 && (
              <span className="text-body-sm font-semibold text-content-muted">
                ({lines.length} {lines.length === 1 ? 'artículo' : 'artículos'})
              </span>
            )}
          </h2>
          <button type="button" onClick={close} className="btn-icon" aria-label="Cerrar el carrito">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-pill bg-brand-100">
              <ShoppingBag className="h-7 w-7 text-brand-500" aria-hidden="true" />
            </span>
            <p className="font-display text-heading font-bold text-content">Todavía no hay nada aquí</p>
            <p className="max-w-xs text-body-sm text-content-muted">
              Cuando añadas algo lo verás en esta ventana, con su precio y su total.
            </p>
            <Link to="/tienda" onClick={close} className="btn btn-md btn-primary mt-1">
              Ver el catálogo
            </Link>
          </div>
        ) : (
          <>
            {/* Progreso hacia el envío gratis: sale de lo que hay en el carrito
                y del umbral que aplica el servidor. Ni inventado ni decorativo. */}
            <div className="shrink-0 border-b border-edge-subtle bg-surface px-5 py-3">
              {falta > 0 ? (
                <>
                  <p className="text-body-sm text-content-muted">
                    Te faltan <strong className="text-brand-700">{eur(falta)}</strong> para el envío gratis
                  </p>
                  <div
                    className="mt-2 h-1.5 overflow-hidden rounded-pill bg-edge"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={envio.gratisDesde}
                    aria-valuenow={Math.min(subtotal, envio.gratisDesde)}
                    aria-label="Progreso hacia el envío gratis"
                  >
                    <div
                      className="h-full rounded-pill bg-brand-500 transition-[width] duration-300 ease-out"
                      style={{ width: `${Math.min(100, (subtotal / envio.gratisDesde) * 100)}%` }}
                    />
                  </div>
                </>
              ) : (
                <p className="flex items-center gap-2 text-body-sm font-semibold text-success">
                  <Truck className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Este pedido lleva envío gratis
                </p>
              )}
            </div>

            <ul className="min-h-0 flex-1 list-none space-y-4 overflow-y-auto overscroll-contain p-5">
              {lines.map((l) => {
                const clave = lineKey(l);
                const totalLinea = l.unitPrice * l.quantity;
                return (
                  <li key={clave} className="flex gap-3">
                    {/*
                      La miniatura lleva al mismo sitio que el nombre de al
                      lado. Para el ratón está bien —se espera poder pulsar la
                      foto—, pero como enlace aparte no tiene nombre y además
                      duplica el recorrido del tabulador. Se esconde de las
                      ayudas técnicas: el enlace de verdad es el nombre.
                    */}
                    <Link
                      to={`/producto/${l.slug}`}
                      onClick={close}
                      tabIndex={-1}
                      aria-hidden="true"
                      className="shrink-0"
                    >
                      <img
                        src={l.image}
                        alt=""
                        width={80}
                        height={80}
                        loading="lazy"
                        decoding="async"
                        className="h-20 w-20 rounded-control border border-edge object-cover"
                      />
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <Link
                        to={`/producto/${l.slug}`}
                        onClick={close}
                        className="line-clamp-2 text-body-sm font-semibold text-content hover:text-brand-700"
                      >
                        {l.name}
                      </Link>
                      {l.variantLabel && (
                        <p className="text-caption text-content-muted">{l.variantLabel}</p>
                      )}
                      {/*
                        El precio unitario Y el total de la línea. Antes sólo
                        estaba uno de los dos, y con tres unidades había que
                        multiplicar de cabeza para cuadrar el subtotal.
                      */}
                      <p className="text-caption text-content-subtle">
                        {eur(l.unitPrice)} por unidad
                      </p>

                      <div className="mt-1 flex items-center justify-between gap-2">
                        <div className="flex items-center rounded-control border border-edge bg-surface">
                          <button
                            type="button"
                            onClick={() => setQty(clave, l.quantity - 1)}
                            disabled={l.quantity <= 1}
                            aria-label={`Quitar una unidad de ${l.name}`}
                            className="flex h-9 w-9 items-center justify-center text-content disabled:opacity-30"
                          >
                            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                          <span
                            aria-label={`Cantidad de ${l.name}: ${l.quantity}`}
                            role="status"
                            className="min-w-7 text-center text-body-sm font-bold tabular-nums text-content"
                          >
                            {l.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQty(clave, l.quantity + 1)}
                            disabled={l.quantity >= MAXIMO_POR_LINEA}
                            aria-label={`Añadir una unidad de ${l.name}`}
                            className="flex h-9 w-9 items-center justify-center text-content disabled:opacity-30"
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>

                        <span className="font-display text-body font-bold tabular-nums text-content">
                          {eur(totalLinea)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => remove(clave)}
                      aria-label={`Quitar ${l.name} del carrito`}
                      className="h-9 w-9 shrink-0 self-start rounded-control text-content-subtle transition-colors hover:bg-danger-subtle hover:text-danger"
                    >
                      <Trash2 className="mx-auto h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>

            {/*
              Quien no ve la pantalla necesita enterarse de que el carrito ha
              cambiado. Antes se podía subir la cantidad tres veces sin ninguna
              señal de que algo hubiera pasado.
            */}
            <p className="sr-only" aria-live="polite">
              Carrito actualizado. Subtotal {eur(subtotal)}. Total {eur(total)}.
            </p>

            <footer className="shrink-0 space-y-3 border-t border-edge-subtle bg-surface px-5 py-4">
              <dl className="space-y-1.5 text-body-sm">
                <div className="flex justify-between">
                  <dt className="text-content-muted">Subtotal</dt>
                  <dd className="font-semibold tabular-nums text-content">{eur(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-content-muted">Envío</dt>
                  <dd className="font-semibold tabular-nums text-content">
                    {gastosEnvio === 0 ? 'Gratis' : eur(gastosEnvio)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-edge-subtle pt-1.5">
                  <dt className="font-display text-body font-bold text-content">Total</dt>
                  <dd className="font-display text-body font-bold tabular-nums text-content">{eur(total)}</dd>
                </div>
              </dl>

              <Link to="/checkout" onClick={close} className="btn btn-lg btn-primary w-full justify-center">
                Finalizar compra
              </Link>
              <button type="button" onClick={close} className="btn-link mx-auto block text-body-sm">
                Seguir comprando
              </button>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
