import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, Mail, Package, ShoppingBag } from 'lucide-react';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { eur } from '@/lib/cn';
import { useAuth } from '@/store/auth';
import { useCart } from '@/store/cart';
import { useSeo } from '@/lib/useSeo';
import { EMPRESA } from '@/lib/empresa';
import { referenciaDePedido, estadoDePedido } from '@/lib/pedidos';

/**
 * VUELTA DE STRIPE.
 *
 * Dos cosas importan aquí, y ninguna es decorativa:
 *
 *   1. LLEGAR A ESTA PÁGINA NO ES HABER PAGADO. La URL de retorno la controla
 *      quien navega: se puede escribir a mano. Quien decide si un pedido está
 *      pagado es el webhook firmado de Stripe, y el estado se lee del pedido —
 *      no de haber aterrizado aquí. Antes se felicitaba a todo el que llegaba.
 *
 *   2. AQUÍ SE VACÍA EL CARRITO, y no antes. Se vaciaba justo antes de saltar
 *      a Stripe, así que cancelar el pago dejaba la tienda vacía mientras la
 *      página de cancelación prometía que «tu carrito sigue disponible».
 */
export function CheckoutResultPage({ kind }: { kind: 'success' | 'cancel' }) {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const vaciar = useCart((s) => s.clear);

  const orderId = params.get('order') ?? '';
  /*
   * El token de acceso al pedido: lo emite el servidor al crearlo y vuelve en
   * la URL de Stripe. Sin él, un pedido de invitado no se puede consultar — y
   * con él tampoco se puede consultar ningún otro.
   */
  const token = params.get('t') ?? '';

  const { data, loading } = useFetch(
    () => (orderId ? api.order(orderId, token) : Promise.resolve(null)),
    [orderId, token],
  );
  const pedido = data?.order;

  /*
   * El carrito se vacía cuando el pedido EXISTE. Si la consulta falla —enlace
   * manipulado, token que no vale— no se toca: quien no ha comprado no debe
   * perder lo que tenía dentro.
   */
  useEffect(() => {
    if (kind === 'success' && pedido) vaciar();
  }, [kind, pedido, vaciar]);

  useSeo({ titulo: kind === 'success' ? 'Pedido recibido' : 'Pago no completado', noIndexar: true });

  if (kind === 'cancel') return <Cancelado />;

  const estado = pedido ? estadoDePedido(pedido) : null;

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-pill bg-success-subtle">
            <CheckCircle2 className="h-8 w-8 text-success" aria-hidden="true" />
          </span>
          <h1 className="mt-4 font-display text-display font-extrabold tracking-tight text-content">
            Hemos recibido tu pedido
          </h1>
          {pedido && (
            /*
             * NO se promete ningún correo de confirmación.
             *
             * Auditado en la Fase 2D: existe un `mailer` con nodemailer, pero
             * sólo lo usa el formulario de contacto. NADA envía un correo al
             * hacer un pedido. La página anterior decía «te enviaremos un email
             * de confirmación» y ese correo no salía de ningún sitio.
             *
             * Se dice lo que SÍ es cierto: el pedido está guardado y dónde
             * consultarlo. El correo queda anotado como deuda en el informe,
             * con la arquitectura mínima propuesta.
             */
            <p className="mt-2 text-body-lg text-content-muted">
              Lo hemos guardado a nombre de{' '}
              <strong className="text-content">{pedido.email}</strong>.
            </p>
          )}
        </div>

        {loading && !pedido && (
          <p className="mt-8 text-center text-body-sm text-content-muted">Buscando tu pedido…</p>
        )}

        {!loading && !pedido && (
          /*
           * Sin pedido no se felicita a nadie: puede ser un enlace escrito a
           * mano o reenviado sin el token. Se dice lo que se sabe y se ofrece
           * dónde mirar.
           */
          <div className="mt-8 rounded-card border border-edge bg-surface p-6 text-center">
            <p className="text-body text-content">
              No hemos podido cargar los datos de este pedido con este enlace.
            </p>
            <p className="mt-2 text-body-sm text-content-muted">
              Si has pagado, el pedido está guardado igualmente.{' '}
              {user ? 'Lo tienes en «Mis pedidos».' : 'Guárdate este enlace para volver a consultarlo.'}
              {EMPRESA.email && (
                <>
                  {' '}Si algo no cuadra, escríbenos a{' '}
                  <a href={`mailto:${EMPRESA.email}`} className="btn-link">
                    {EMPRESA.email}
                  </a>
                  .
                </>
              )}
            </p>
          </div>
        )}

        {pedido && (
          <div className="mt-8 overflow-hidden rounded-card border border-edge bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge-subtle px-5 py-4 sm:px-6">
              <div>
                <p className="text-caption uppercase tracking-wide text-content-subtle">Número de pedido</p>
                <p className="font-mono text-body font-bold text-content">{referenciaDePedido(pedido.id)}</p>
              </div>
              {estado && (
                /*
                 * El estado sale del pedido, no de haber llegado a esta página.
                 * Justo después de pagar suele poner «Pago pendiente de
                 * confirmar»: el webhook de Stripe tarda unos segundos, y decir
                 * «pagado» antes de que lo confirme quien cobra sería adivinar.
                 */
                <span className={`chip-estado ${estado.clase}`}>{estado.etiqueta}</span>
              )}
            </div>

            <ul className="list-none space-y-3 p-5 sm:p-6">
              {pedido.items.map((i) => (
                <li key={i.id} className="flex items-start justify-between gap-4 text-body-sm">
                  <span className="text-content">
                    <strong className="tabular-nums">{i.quantity}×</strong> {i.name}
                    {i.variantLabel && <span className="text-content-muted"> · {i.variantLabel}</span>}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-content">
                    {eur(i.unitPrice * i.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="space-y-1.5 border-t border-edge-subtle px-5 py-4 text-body-sm sm:px-6">
              <div className="flex justify-between">
                <dt className="text-content-muted">Subtotal</dt>
                <dd className="tabular-nums text-content">{eur(pedido.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-content-muted">Envío</dt>
                <dd className="tabular-nums text-content">
                  {pedido.shipping === 0 ? 'Gratis' : eur(pedido.shipping)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-edge-subtle pt-1.5">
                <dt className="font-display text-body font-bold text-content">Total</dt>
                <dd className="font-display text-body font-bold tabular-nums text-content">
                  {eur(pedido.total)}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {/* Qué pasa ahora. Sólo lo que de verdad ocurre. */}
        <section aria-labelledby="siguiente" className="mt-8 rounded-card border border-edge bg-surface-sunken p-5 sm:p-6">
          <h2 id="siguiente" className="font-display text-heading font-bold text-content">
            Qué pasa ahora
          </h2>
          <ol className="mt-3 list-none space-y-3 p-0">
            <li className="flex gap-3 text-body-sm">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
              <span className="text-content-muted">
                Nos llega el aviso y revisamos el pedido. Si necesitamos algo, te
                escribimos a la dirección que nos has dado.
              </span>
            </li>
            <li className="flex gap-3 text-body-sm">
              <Package className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
              <span className="text-content-muted">Preparamos tu pedido y te avisamos si algo cambia.</span>
            </li>
            <li className="flex gap-3 text-body-sm">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
              <span className="text-content-muted">Entrega en 24-48 h en Canarias.</span>
            </li>
          </ol>
          {EMPRESA.email && (
            <p className="mt-4 text-body-sm text-content-muted">
              ¿Necesitas cambiar algo? Escríbenos a{' '}
              <a href={`mailto:${EMPRESA.email}`} className="btn-link">
                {EMPRESA.email}
              </a>
              {EMPRESA.telefono && EMPRESA.telefonoE164 && (
                <>
                  {' '}o llámanos al{' '}
                  <a href={`tel:${EMPRESA.telefonoE164}`} className="btn-link">
                    {EMPRESA.telefono}
                  </a>
                </>
              )}
              .
            </p>
          )}
        </section>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {user && (
            <Link to="/cuenta" className="btn btn-md btn-primary">
              <Package className="h-4 w-4" aria-hidden="true" />
              Ver mis pedidos
            </Link>
          )}
          <Link to="/tienda" className={`btn btn-md ${user ? 'btn-ghost' : 'btn-primary'}`}>
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            Seguir comprando
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Pago cancelado.
 *
 * Ya NO es mentira: el carrito sigue lleno de verdad, porque el checkout dejó
 * de vaciarlo antes de saltar a Stripe. Y el botón vuelve al pago, que ahora
 * funciona en vez de encontrarse un carrito vacío.
 */
function Cancelado() {
  const lineas = useCart((s) => s.lines);

  return (
    <div className="container-page flex flex-col items-center gap-4 py-20 text-center sm:py-24">
      <span className="flex h-16 w-16 items-center justify-center rounded-pill bg-warning-subtle">
        <ShoppingBag className="h-7 w-7 text-warning" aria-hidden="true" />
      </span>
      <h1 className="font-display text-title font-extrabold tracking-tight text-content">
        No se ha completado el pago
      </h1>
      <p className="max-w-md text-body text-content-muted">
        No se ha hecho ningún cargo.
        {lineas.length > 0
          ? ' Lo que tenías en el carrito sigue ahí, tal cual lo dejaste.'
          : ' Puedes volver a la tienda cuando quieras.'}
      </p>
      <div className="mt-1 flex flex-wrap justify-center gap-3">
        {lineas.length > 0 && (
          <Link to="/checkout" className="btn btn-md btn-primary">
            Retomar la compra
          </Link>
        )}
        <Link to="/tienda" className={`btn btn-md ${lineas.length > 0 ? 'btn-ghost' : 'btn-primary'}`}>
          Volver a la tienda
        </Link>
      </div>
    </div>
  );
}
