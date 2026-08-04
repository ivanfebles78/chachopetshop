import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Package, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { eur } from '@/lib/cn';
import { useAuth } from '@/store/auth';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  FULFILLED: 'Enviado',
  CANCELLED: 'Cancelado',
};

export function AccountPage() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const { data } = useFetch(() => (user ? api.myOrders() : Promise.resolve({ orders: [] })), [user?.id]);

  if (loading) return <div className="container-page py-20 text-center text-brand-900/50">Cargando…</div>;

  if (!user) {
    return (
      <div className="container-page flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Inicia sesión</h1>
        <p className="text-brand-900/60">Accede para ver tu cuenta y pedidos.</p>
        <Link to="/login" className="btn-primary">Iniciar sesión</Link>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Hola, {user.email.split('@')[0]} 👋</h1>
          <p className="mt-1 text-brand-900/60">{user.email}</p>
        </div>
        <div className="flex gap-2">
          {user.role === 'ADMIN' && (
            <Link to="/admin" className="btn-ghost py-2.5"><ShieldCheck className="h-4 w-4" /> Panel admin</Link>
          )}
          <button onClick={async () => { await logout(); navigate('/'); }} className="btn-ghost py-2.5">
            <LogOut className="h-4 w-4" /> Salir
          </button>
        </div>
      </div>

      <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold"><Package className="h-5 w-5 text-brand-600" /> Mis pedidos</h2>
      {!data?.orders.length ? (
        <div className="card rounded-4xl py-12 text-center text-brand-900/60">
          Todavía no has hecho ningún pedido. <Link to="/tienda" className="font-semibold text-brand-700">Explora la tienda</Link>.
        </div>
      ) : (
        <div className="space-y-4">
          {data.orders.map((o) => (
            <div key={o.id} className="card rounded-4xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-900/10 pb-3">
                <span className="font-mono text-sm font-semibold text-brand-800">#{o.id.slice(-8).toUpperCase()}</span>
                <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">{STATUS_LABEL[o.status]}</span>
                <span className="text-sm text-brand-900/50">{new Date(o.createdAt).toLocaleDateString('es-ES')}</span>
                <span className="font-display font-bold text-ink">{eur(o.total)}</span>
              </div>
              <div className="mt-3 space-y-1 text-sm text-brand-900/70">
                {o.items.map((i) => (
                  <div key={i.id} className="flex justify-between">
                    <span>{i.quantity}× {i.name}{i.variantLabel ? ` · ${i.variantLabel}` : ''}</span>
                    <span>{eur(i.unitPrice * i.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
