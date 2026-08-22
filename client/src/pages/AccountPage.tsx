import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Package, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { eur } from '@/lib/cn';
import { useAuth } from '@/store/auth';
import { useSeo } from '@/lib/useSeo';
import { ESTADO, referenciaDePedido, unidadesDe } from '@/lib/pedidos';
import type { Order } from '@/lib/types';

/**
 * MI CUENTA · MIS PEDIDOS.
 *
 * Lo que cambia en la Fase 2D:
 *
 *   · LOS ESTADOS SE ENTIENDEN. Ponía «Pendiente», que justo después de pagar
 *     se lee como «no has pagado» — y no es eso: es que el webhook de Stripe
 *     todavía no ha confirmado, cosa de segundos. Ahora dice «Pago pendiente de
 *     confirmar» y explica qué significa.
 *
 *   · SE PUEDE ABRIR UN PEDIDO. Antes se veía todo aplanado a la vez. Con el
 *     detalle desplegable caben más pedidos en pantalla y se entra en el que
 *     interesa.
 *
 *   · SE VE DÓNDE SE ENTREGÓ. La dirección estaba guardada y no se enseñaba.
 *
 * Lo que NO se inventa: ningún seguimiento de envío, ningún transportista,
 * ninguna fecha estimada. No existen esos datos.
 */
export function AccountPage() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const { data } = useFetch(() => (user ? api.myOrders() : Promise.resolve(null)), [user?.id]);

  useSeo({ titulo: 'Mi cuenta', noIndexar: true });

  if (loading) {
    return <div className="container-page py-20 text-center text-content-subtle">Cargando…</div>;
  }

  if (!user) {
    return (
      <div className="container-page flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="font-display text-title font-bold text-content">Inicia sesión</h1>
        <p className="max-w-sm text-body text-content-muted">
          Entra en tu cuenta para ver tus pedidos.
        </p>
        <Link to="/login" className="btn btn-md btn-primary mt-1">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  const pedidos = data?.orders ?? [];

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-display font-extrabold tracking-tight text-content">
            Hola, {user.email.split('@')[0]}
          </h1>
          <p className="mt-1 text-body text-content-muted">{user.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.role === 'ADMIN' && (
            <Link to="/admin" className="btn btn-md btn-ghost">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Panel de administración
            </Link>
          )}
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/');
            }}
            className="btn btn-md btn-ghost"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" /> Salir
          </button>
        </div>
      </div>

      <section aria-labelledby="pedidos" className="mt-8">
        <h2
          id="pedidos"
          className="flex items-center gap-2 font-display text-title font-extrabold tracking-tight text-content"
        >
          <Package className="h-5 w-5 text-brand-600" aria-hidden="true" />
          Mis pedidos
          {pedidos.length > 0 && (
            <span className="text-body-sm font-semibold text-content-muted">({pedidos.length})</span>
          )}
        </h2>

        {pedidos.length === 0 ? (
          <div className="mt-4 rounded-card border border-edge bg-surface px-6 py-12 text-center">
            <p className="text-body text-content">Todavía no has hecho ningún pedido.</p>
            <Link to="/tienda" className="btn btn-md btn-primary mt-4">
              Explorar la tienda
            </Link>
          </div>
        ) : (
          <ul className="mt-4 list-none space-y-3 p-0">
            {pedidos.map((p) => (
              <li key={p.id}>
                <Pedido pedido={p} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/**
 * Un pedido, plegado por defecto.
 *
 * Se usa `<details>`/`<summary>` del navegador y no un desplegable propio: trae
 * gratis el estado abierto/cerrado para el lector de pantalla, el teclado y la
 * búsqueda dentro de la página. Programarlo a mano es reimplementar peor lo
 * que ya funciona.
 */
function Pedido({ pedido }: { pedido: Order }) {
  const [abierto, setAbierto] = useState(false);
  const estado = ESTADO[pedido.status];
  const unidades = unidadesDe(pedido);
  const fecha = new Date(pedido.createdAt).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <details
      open={abierto}
      onToggle={(e) => setAbierto((e.currentTarget as HTMLDetailsElement).open)}
      className="overflow-hidden rounded-card border border-edge bg-surface"
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 hover:bg-brand-50 [&::-webkit-details-marker]:hidden">
        <span className="font-mono text-body-sm font-bold text-content">
          {referenciaDePedido(pedido.id)}
        </span>
        <span className={`chip-estado ${estado.clase}`}>{estado.etiqueta}</span>
        <span className="text-body-sm text-content-muted">{fecha}</span>
        <span className="ml-auto flex items-center gap-3">
          <span className="font-display text-body font-bold tabular-nums text-content">
            {eur(pedido.total)}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-content-subtle transition-transform ${abierto ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </span>
        <span className="sr-only">
          {abierto ? 'Ocultar' : 'Ver'} el detalle del pedido {referenciaDePedido(pedido.id)},{' '}
          {unidades} {unidades === 1 ? 'artículo' : 'artículos'}
        </span>
      </summary>

      <div className="border-t border-edge-subtle px-5 py-4">
        <p className="text-body-sm text-content-muted">{estado.explicacion}</p>

        <ul className="mt-4 list-none space-y-3 p-0">
          {pedido.items.map((i) => (
            <li key={i.id} className="flex items-start gap-3">
              {i.image && (
                <img
                  src={i.image}
                  alt=""
                  width={48}
                  height={48}
                  loading="lazy"
                  decoding="async"
                  className="h-12 w-12 shrink-0 rounded-control border border-edge object-cover"
                />
              )}
              <span className="min-w-0 flex-1 text-body-sm">
                <span className="block font-semibold text-content">{i.name}</span>
                <span className="text-content-muted">
                  {i.variantLabel && <>{i.variantLabel} · </>}
                  {i.quantity} × {eur(i.unitPrice)}
                </span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-content">
                {eur(i.unitPrice * i.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-1.5 border-t border-edge-subtle pt-4 text-body-sm">
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

        {/*
          La dirección estaba guardada y no se enseñaba. Sólo se pinta lo que
          existe: un pedido antiguo sin dirección no deja un hueco vacío.
        */}
        {(pedido.shippingName || pedido.shippingAddress) && (
          <div className="mt-4 border-t border-edge-subtle pt-4">
            <h3 className="text-overline font-bold uppercase tracking-[0.12em] text-content-subtle">
              Dirección de entrega
            </h3>
            <address className="mt-1.5 text-body-sm not-italic text-content-muted">
              {pedido.shippingName && <span className="block">{pedido.shippingName}</span>}
              {pedido.shippingAddress && <span className="block">{pedido.shippingAddress}</span>}
              {(pedido.shippingZip || pedido.shippingCity) && (
                <span className="block">
                  {[pedido.shippingZip, pedido.shippingCity].filter(Boolean).join(' ')}
                </span>
              )}
            </address>
          </div>
        )}
      </div>
    </details>
  );
}
