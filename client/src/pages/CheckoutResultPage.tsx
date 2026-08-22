import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { eur } from '@/lib/cn';

export function CheckoutResultPage({ kind }: { kind: 'success' | 'cancel' }) {
  const [params] = useSearchParams();
  const orderId = params.get('order') ?? '';
  // Token de acceso al pedido: lo emite el servidor al crearlo y viaja en la
  // URL de retorno de Stripe. Sin él, un pedido de invitado no se consulta.
  const token = params.get('t') ?? '';
  const { data } = useFetch(
    () => (orderId ? api.order(orderId, token) : Promise.resolve(null)),
    [orderId, token],
  );
  const order = data?.order;

  if (kind === 'cancel') {
    return (
      <div className="container-page flex flex-col items-center gap-4 py-24 text-center">
        <XCircle className="h-16 w-16 text-amber-500" />
        <h1 className="font-display text-3xl font-bold">Pago cancelado</h1>
        <p className="max-w-md text-brand-900/60">No se ha realizado ningún cargo. Tu carrito sigue disponible.</p>
        <Link to="/checkout" className="btn-primary">Volver al checkout</Link>
      </div>
    );
  }

  return (
    <div className="container-page flex flex-col items-center gap-5 py-20 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100">
        <CheckCircle2 className="h-11 w-11 text-brand-600" />
      </div>
      <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">¡Gracias por tu pedido!</h1>
      <p className="max-w-md text-brand-900/60">
        Hemos recibido tu compra correctamente. Te enviaremos un email de confirmación
        {order ? <> a <strong className="text-brand-800">{order.email}</strong></> : ''}.
      </p>

      {order && (
        <div className="card w-full max-w-md space-y-4 rounded-4xl p-6 text-left">
          <div className="flex items-center justify-between">
            <span className="text-sm text-content-subtle">Pedido</span>
            <span className="font-mono text-sm font-semibold text-brand-800">#{order.id.slice(-8).toUpperCase()}</span>
          </div>
          <div className="space-y-2 border-t border-brand-900/10 pt-4">
            {order.items.map((i) => (
              <div key={i.id} className="flex justify-between text-sm">
                <span className="text-brand-900/70">{i.quantity}× {i.name}{i.variantLabel ? ` · ${i.variantLabel}` : ''}</span>
                <span className="font-semibold">{eur(i.unitPrice * i.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between border-t border-brand-900/10 pt-3 font-display text-lg font-bold">
            <span>Total</span><span>{eur(order.total)}</span>
          </div>
        </div>
      )}

      <Link to="/tienda" className="btn-primary mt-2">Seguir comprando</Link>
    </div>
  );
}
