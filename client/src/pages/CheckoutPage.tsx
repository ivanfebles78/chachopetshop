import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, ShoppingBag } from 'lucide-react';
import { api } from '@/lib/api';
import { eur } from '@/lib/cn';
import { lineKey, selectSubtotal, useCart } from '@/store/cart';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';

const FREE_SHIPPING = 49;
const SHIPPING_FLAT = 4.95;

export function CheckoutPage() {
  const { lines, clear } = useCart();
  const subtotal = useCart(selectSubtotal);
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ email: user?.email ?? '', name: '', address: '', city: '', zip: '' });

  /*
   * El correo se rellena cuando la sesión termina de cargar, no sólo al montar.
   * El valor inicial de `useState` se calcula UNA vez, y en ese instante
   * `AuthProvider` todavía está preguntando quién eres: el campo se quedaba
   * vacío para todo cliente que ya había entrado.
   */
  useEffect(() => {
    if (user?.email) setForm((f) => (f.email ? f : { ...f, email: user.email }));
  }, [user?.email]);

  const shipping = subtotal >= FREE_SHIPPING || subtotal === 0 ? 0 : SHIPPING_FLAT;
  const total = subtotal + shipping;

  if (lines.length === 0) {
    return (
      <div className="container-page flex flex-col items-center gap-4 py-24 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100"><ShoppingBag className="h-9 w-9 text-brand-500" /></span>
        <h1 className="font-display text-2xl font-bold">Tu carrito está vacío</h1>
        <Link to="/tienda" className="btn-primary">Ir a la tienda</Link>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.checkout({
        email: form.email,
        items: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity })),
        shipping: { name: form.name, address: form.address, city: form.city, zip: form.zip },
      });
      clear();
      window.location.href = res.url;
    } catch (err) {
      /*
       * 401 aquí significa que la cookie de sesión ya no vale —caducada, o
       * firmada con un secreto anterior a una rotación—. Antes esto no llegaba
       * a pasar: el servidor seguía como invitado y el pedido se guardaba sin
       * dueño. Ahora se corta y se dice qué hacer.
       */
      const apiError = err as { status?: number; message: string };
      const msg =
        apiError.status === 401
          ? 'Tu sesión ha caducado. Vuelve a iniciar sesión para completar la compra.'
          : apiError.message;
      setError(msg);
      toast.error(msg);
      setSubmitting(false);
    }
  };

  const field = (key: keyof typeof form, label: string, type = 'text', required = true) => (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-brand-900/70">{label}</span>
      <input
        type={type}
        required={required}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full rounded-2xl border border-brand-900/10 bg-white px-4 py-2.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
      />
    </label>
  );

  return (
    <div className="container-page py-8">
      <h1 className="mb-8 font-display text-3xl font-bold text-ink sm:text-4xl">Finalizar compra</h1>
      <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
        <form onSubmit={submit} className="space-y-6">
          <section className="card rounded-4xl p-6">
            <h2 className="mb-4 font-display text-lg font-bold">Datos de contacto</h2>
            {field('email', 'Email', 'email')}
          </section>
          <section className="card rounded-4xl p-6">
            <h2 className="mb-4 font-display text-lg font-bold">Dirección de envío</h2>
            <div className="space-y-4">
              {field('name', 'Nombre y apellidos')}
              {field('address', 'Dirección')}
              <div className="grid grid-cols-2 gap-4">
                {field('city', 'Ciudad')}
                {field('zip', 'Código postal')}
              </div>
            </div>
          </section>

          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={submitting} className="btn-primary w-full py-4 text-base">
            <Lock className="h-4 w-4" />
            {submitting ? 'Procesando…' : `Pagar ${eur(total)}`}
          </button>
          <p className="text-center text-xs text-brand-900/50">
            Pago seguro procesado con Stripe. No guardamos los datos de tu tarjeta.
          </p>
        </form>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card space-y-4 rounded-4xl p-6">
            <h2 className="font-display text-lg font-bold">Tu pedido</h2>
            <div className="space-y-3">
              {lines.map((l) => (
                <div key={lineKey(l)} className="flex gap-3">
                  <div className="relative">
                    <img src={l.image} alt={l.name} className="h-16 w-16 rounded-2xl object-cover" />
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-xs font-bold text-cream">{l.quantity}</span>
                  </div>
                  <div className="flex flex-1 flex-col">
                    <p className="line-clamp-1 text-sm font-semibold text-ink">{l.name}</p>
                    {l.variantLabel && <p className="text-xs text-brand-900/50">{l.variantLabel}</p>}
                    <span className="mt-auto text-sm font-bold text-brand-800">{eur(l.unitPrice * l.quantity)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t border-brand-900/10 pt-4 text-sm">
              <div className="flex justify-between text-brand-900/70"><span>Subtotal</span><span>{eur(subtotal)}</span></div>
              <div className="flex justify-between text-brand-900/70">
                <span>Envío</span><span>{shipping === 0 ? 'Gratis' : eur(shipping)}</span>
              </div>
              <div className="flex justify-between border-t border-brand-900/10 pt-2 font-display text-lg font-bold text-ink">
                <span>Total</span><span>{eur(total)}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
