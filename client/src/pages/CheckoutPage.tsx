import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Lock, ShoppingBag, Truck } from 'lucide-react';
import { api } from '@/lib/api';
import { eur } from '@/lib/cn';
import { lineKey, selectSubtotal, useCart } from '@/store/cart';
import { useAuth } from '@/store/auth';
import { useSeo } from '@/lib/useSeo';
import { envioPara, useEnvio } from '@/lib/useEnvio';
import { EMPRESA } from '@/lib/empresa';
import { toast } from '@/store/toast';

/**
 * PÁGINA DE PAGO.
 *
 * Tres cosas cambian en la Fase 2D, y las tres se descubrieron recorriendo el
 * embudo entero antes de tocar nada:
 *
 *   · EL CARRITO YA NO SE VACÍA ANTES DE IR A STRIPE. Se vaciaba justo antes
 *     de redirigir, así que quien cancelaba el pago volvía a una tienda con el
 *     carrito vacío… mientras la página de cancelación le decía «tu carrito
 *     sigue disponible». Era falso. Ahora se vacía al confirmar el pedido.
 *
 *   · NO SE PIDE LO QUE YA SE SABE. A quien tiene cuenta se le rellena el
 *     correo, el nombre y la dirección de su último pedido.
 *
 *   · EL ENVÍO LO DICE EL SERVIDOR. El umbral estaba escrito a mano aquí.
 *
 * Lo que NO cambia: el precio. Lo pone el servidor al construir el pedido y el
 * cliente no manda importes — sólo identificadores y cantidades.
 */
export function CheckoutPage() {
  const { lines } = useCart();
  const subtotal = useCart(selectSubtotal);
  const { user, loading: cargandoSesion } = useAuth();
  const envio = useEnvio();

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', name: '', address: '', city: '', zip: '' });
  const yaRellenado = useRef(false);

  useSeo({ titulo: 'Finalizar compra', noIndexar: true });

  /*
   * El correo se rellena cuando la sesión TERMINA de cargar, no al montar: el
   * valor inicial de `useState` se calcula una vez, y en ese instante todavía
   * se está preguntando quién eres. El campo se quedaba vacío para todo cliente
   * que ya había entrado.
   */
  useEffect(() => {
    if (user?.email) setForm((f) => (f.email ? f : { ...f, email: user.email }));
  }, [user?.email]);

  /*
   * Y la dirección, del último pedido. El modelo de usuario no guarda ninguna
   * —sólo correo, nombre y rol—, así que el único sitio donde consta es en sus
   * propios pedidos. Sin esto, quien compra cada mes escribe su calle cada mes.
   */
  useEffect(() => {
    if (!user || yaRellenado.current) return;
    yaRellenado.current = true;
    api
      .ultimaDireccion()
      .then(({ direccion }) => {
        if (!direccion) return;
        setForm((f) => ({
          ...f,
          name: f.name || direccion.nombre,
          address: f.address || direccion.direccion,
          city: f.city || direccion.ciudad,
          zip: f.zip || direccion.cp,
        }));
      })
      .catch(() => {
        /* Que no se pueda recuperar no debe impedir comprar: se escribe a mano. */
      });
  }, [user]);

  const gastosEnvio = envioPara(subtotal, envio);
  const total = subtotal + gastosEnvio;

  if (lines.length === 0) {
    return (
      <div className="container-page flex flex-col items-center gap-4 py-24 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-pill bg-brand-100">
          <ShoppingBag className="h-7 w-7 text-brand-500" aria-hidden="true" />
        </span>
        <h1 className="font-display text-title font-bold text-content">Tu carrito está vacío</h1>
        <p className="max-w-sm text-body text-content-muted">
          Añade algo al carrito y vuelve aquí para terminar la compra.
        </p>
        <Link to="/tienda" className="btn btn-md btn-primary mt-1">
          Ir a la tienda
        </Link>
      </div>
    );
  }

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    // Doble clic: el guardia de verdad está en el servidor, pero evitar la
    // segunda petición ahorra un pedido PENDING huérfano y stock retenido.
    if (enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const res = await api.checkout({
        email: form.email,
        items: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity })),
        shipping: { name: form.name, address: form.address, city: form.city, zip: form.zip },
      });
      /*
       * NO se vacía el carrito aquí. Antes sí, y quien cancelaba el pago volvía
       * a una tienda vacía teniendo que empezar de cero. Se vacía en la página
       * de confirmación, cuando el pedido existe de verdad.
       */
      window.location.href = res.url;
    } catch (err) {
      const fallo = err as { status?: number; message: string };
      /*
       * Un 401 aquí significa que la cookie ya no vale —caducada, o firmada con
       * un secreto anterior a una rotación—. Antes el servidor seguía como
       * invitado y el pedido se guardaba sin dueño; ahora se corta y se dice qué
       * hacer. Es la garantía de la Fase 1 y no se toca.
       */
      const msg =
        fallo.status === 401
          ? 'Tu sesión ha caducado. Vuelve a iniciar sesión para completar la compra.'
          : fallo.message;
      setError(msg);
      toast.error(msg);
      setEnviando(false);
    }
  };

  const campo = (
    clave: keyof typeof form,
    etiqueta: string,
    opciones: { type?: string; autoComplete?: string; required?: boolean } = {},
  ) => (
    <label className="block">
      <span className="field-label">{etiqueta}</span>
      <input
        type={opciones.type ?? 'text'}
        autoComplete={opciones.autoComplete}
        required={opciones.required ?? true}
        value={form[clave]}
        onChange={(e) => setForm({ ...form, [clave]: e.target.value })}
        className="field w-full"
      />
    </label>
  );

  return (
    <div className="container-page py-6 sm:py-8">
      <h1 className="font-display text-display font-extrabold tracking-tight text-content">
        Finalizar compra
      </h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_24rem] lg:gap-12">
        <form onSubmit={enviar} className="space-y-5">
          <section aria-labelledby="contacto" className="rounded-card border border-edge bg-surface p-5 sm:p-6">
            <h2 id="contacto" className="mb-1 font-display text-heading font-bold text-content">
              Cómo te avisamos
            </h2>
            <p className="mb-4 text-body-sm text-content-muted">
              Te mandamos aquí la confirmación del pedido.
            </p>
            {campo('email', 'Email', { type: 'email', autoComplete: 'email' })}
            {!user && !cargandoSesion && (
              <p className="mt-3 text-body-sm text-content-muted">
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" className="btn-link">
                  Inicia sesión
                </Link>{' '}
                y tendrás el pedido en «Mis pedidos». También puedes comprar sin cuenta.
              </p>
            )}
          </section>

          <section aria-labelledby="entrega" className="rounded-card border border-edge bg-surface p-5 sm:p-6">
            <h2 id="entrega" className="mb-1 font-display text-heading font-bold text-content">
              Dónde lo llevamos
            </h2>
            <p className="mb-4 text-body-sm text-content-muted">
              Entregamos en {envio.zona} en {envio.plazo}.
            </p>
            <div className="space-y-4">
              {campo('name', 'Nombre y apellidos', { autoComplete: 'name' })}
              {campo('address', 'Dirección', { autoComplete: 'street-address' })}
              <div className="grid gap-4 sm:grid-cols-2">
                {campo('city', 'Ciudad', { autoComplete: 'address-level2' })}
                {campo('zip', 'Código postal', { autoComplete: 'postal-code' })}
              </div>
            </div>
          </section>

          {/*
            El error va en una región activa y con `role="alert"`: si no, quien
            no ve la pantalla pulsa «Pagar», no pasa nada aparente y no hay
            forma de saber por qué.
          */}
          {error && (
            <p role="alert" className="rounded-control border border-danger-border bg-danger-subtle px-4 py-3 text-body-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="btn btn-lg btn-primary w-full justify-center disabled:opacity-60"
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
            {enviando ? 'Llevándote al pago…' : `Pagar ${eur(total)}`}
          </button>

          {/* Señales de confianza, y todas ciertas. */}
          <ul className="list-none space-y-1.5 p-0 text-body-sm text-content-muted">
            <li className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
              Paga con tarjeta en Stripe. No vemos ni guardamos los datos de tu tarjeta.
            </li>
            <li className="flex items-center gap-2">
              <Truck className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
              Entrega en {envio.zona} en {envio.plazo} · Envío gratis desde {eur(envio.gratisDesde)}
            </li>
            {EMPRESA.email && (
              <li className="flex items-center gap-2">
                <span className="w-4" aria-hidden="true" />
                ¿Alguna duda antes de pagar?{' '}
                <a href={`mailto:${EMPRESA.email}`} className="btn-link">
                  {EMPRESA.email}
                </a>
              </li>
            )}
          </ul>
        </form>

        <aside aria-labelledby="resumen" className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-card border border-edge bg-surface p-5 sm:p-6">
            <h2 id="resumen" className="font-display text-heading font-bold text-content">
              Tu pedido
            </h2>

            <ul className="mt-4 list-none space-y-3 p-0">
              {lines.map((l) => (
                <li key={lineKey(l)} className="flex gap-3">
                  <div className="relative shrink-0">
                    <img
                      src={l.image}
                      alt=""
                      width={64}
                      height={64}
                      loading="lazy"
                      decoding="async"
                      className="h-16 w-16 rounded-control border border-edge object-cover"
                    />
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-pill bg-brand-600 px-1 text-caption font-bold text-cream">
                      {l.quantity}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="line-clamp-2 text-body-sm font-semibold text-content">{l.name}</p>
                    {l.variantLabel && <p className="text-caption text-content-muted">{l.variantLabel}</p>}
                    <p className="mt-auto text-caption text-content-subtle">
                      {l.quantity} × {eur(l.unitPrice)}
                    </p>
                  </div>
                  <span className="shrink-0 self-end font-display text-body-sm font-bold tabular-nums text-content">
                    {eur(l.unitPrice * l.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-1.5 border-t border-edge-subtle pt-4 text-body-sm">
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

            <p className="mt-3 text-caption text-content-subtle">
              El importe definitivo lo calcula el servidor con los precios del catálogo
              cuando se crea el pedido.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
