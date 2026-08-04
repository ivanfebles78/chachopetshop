import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Package, Receipt, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { cn, eur } from '@/lib/cn';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import type { Order } from '@/lib/types';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { ErrorState } from '@/components/ErrorState';

const STATUSES: Order['status'][] = ['PENDING', 'PAID', 'FULFILLED', 'CANCELLED'];

export function AdminPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<'stats' | 'products' | 'orders'>('stats');
  const [nonce, setNonce] = useState(0);
  const isAdmin = user?.role === 'ADMIN';

  const analytics = useFetch(() => (isAdmin ? api.adminAnalytics() : Promise.resolve(null)), [user?.id, nonce]);
  const products = useFetch(() => (isAdmin ? api.adminProducts() : Promise.resolve(null)), [user?.id, nonce]);
  const orders = useFetch(() => (isAdmin ? api.adminOrders() : Promise.resolve(null)), [user?.id, nonce]);

  if (loading) return <div className="container-page py-20 text-center text-brand-900/50">Cargando…</div>;
  if (user?.role !== 'ADMIN') {
    return (
      <div className="container-page flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Acceso restringido</h1>
        <p className="text-brand-900/60">Necesitas una cuenta de administrador.</p>
        <Link to="/login" className="btn-primary">Iniciar sesión</Link>
      </div>
    );
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      await api.adminDeleteProduct(id);
      toast.success('Producto eliminado');
      setNonce((n) => n + 1);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };
  const updateOrder = async (id: string, status: Order['status']) => {
    try {
      await api.adminUpdateOrder(id, status);
      toast.success('Pedido actualizado');
      setNonce((n) => n + 1);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="container-page py-10">
      <h1 className="mb-6 font-display text-3xl font-bold text-ink">Panel de administración</h1>

      <div className="mb-6 flex flex-wrap gap-2">
        <TabBtn active={tab === 'stats'} onClick={() => setTab('stats')} icon={<BarChart3 className="h-4 w-4" />}>
          Estadísticas
        </TabBtn>
        <TabBtn active={tab === 'products'} onClick={() => setTab('products')} icon={<Package className="h-4 w-4" />}>
          Productos ({products.data?.products.length ?? 0})
        </TabBtn>
        <TabBtn active={tab === 'orders'} onClick={() => setTab('orders')} icon={<Receipt className="h-4 w-4" />}>
          Pedidos ({orders.data?.orders.length ?? 0})
        </TabBtn>
      </div>

      {tab === 'stats' ? (
        analytics.error ? (
          <ErrorState message={analytics.error} onRetry={analytics.refetch} />
        ) : analytics.data ? (
          <AnalyticsDashboard data={analytics.data} />
        ) : (
          <div className="card rounded-4xl py-16 text-center text-brand-900/50">Cargando estadísticas…</div>
        )
      ) : tab === 'products' ? (
        <div className="card overflow-hidden rounded-4xl">
          <table className="w-full text-sm">
            <thead className="bg-brand-900/[0.03] text-left text-xs uppercase tracking-wide text-brand-900/50">
              <tr>
                <th className="px-5 py-3">Producto</th>
                <th className="px-5 py-3">Marca</th>
                <th className="px-5 py-3">Precio</th>
                <th className="px-5 py-3">Variantes</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-900/5">
              {products.data?.products.map((p) => (
                <tr key={p.id} className="hover:bg-brand-900/[0.02]">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <img src={p.image} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      <Link to={`/producto/${p.slug}`} className="font-semibold text-ink hover:text-brand-700">{p.name}</Link>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-brand-900/70">{p.brand.name}</td>
                  <td className="px-5 py-3 font-semibold">{eur(p.price)}</td>
                  <td className="px-5 py-3 text-brand-900/60">{p.variants.length}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => deleteProduct(p.id)} className="rounded-lg p-2 text-brand-900/40 hover:bg-red-50 hover:text-red-500" aria-label="Eliminar">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-3">
          {!orders.data?.orders.length ? (
            <div className="card rounded-4xl py-12 text-center text-brand-900/60">Aún no hay pedidos.</div>
          ) : (
            orders.data.orders.map((o) => (
              <div key={o.id} className="card flex flex-wrap items-center justify-between gap-3 rounded-4xl p-5">
                <div>
                  <span className="font-mono text-sm font-semibold text-brand-800">#{o.id.slice(-8).toUpperCase()}</span>
                  <p className="text-xs text-brand-900/50">{o.email} · {new Date(o.createdAt).toLocaleString('es-ES')}</p>
                </div>
                <span className="font-display font-bold text-ink">{eur(o.total)}</span>
                <select
                  value={o.status}
                  onChange={(e) => updateOrder(o.id, e.target.value as Order['status'])}
                  className="rounded-full border border-brand-900/10 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-brand-500"
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors',
        active ? 'bg-brand-600 text-cream shadow-soft' : 'bg-white text-brand-900/70 hover:bg-brand-900/5',
      )}
    >
      {icon} {children}
    </button>
  );
}
