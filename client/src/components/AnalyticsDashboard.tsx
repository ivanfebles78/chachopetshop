import { CalendarDays, Clock, Package, ShoppingCart, TrendingUp, Trophy } from 'lucide-react';
import type { Analytics } from '@/lib/types';
import { cn, eur } from '@/lib/cn';

export function AnalyticsDashboard({ data }: { data: Analytics }) {
  const { kpis, dailySeries, weekdayStats, slots, topProducts, stock } = data;
  const maxDaily = Math.max(1, ...dailySeries.map((d) => d.revenue));
  const maxWeekday = Math.max(1, ...weekdayStats.map((d) => d.revenue));
  const maxTop = Math.max(1, ...topProducts.map((p) => p.revenue));
  const slotTotal = Math.max(1, slots.morning.revenue + slots.afternoon.revenue);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={<TrendingUp className="h-5 w-5" />} label="Ventas hoy" value={eur(kpis.revenueToday)} accent />
        <Kpi icon={<CalendarDays className="h-5 w-5" />} label="Esta semana" value={eur(kpis.revenueWeek)} />
        <Kpi icon={<CalendarDays className="h-5 w-5" />} label="Este mes" value={eur(kpis.revenueMonth)} />
        <Kpi icon={<TrendingUp className="h-5 w-5" />} label="Total histórico" value={eur(kpis.revenueTotal)} />
        <Kpi icon={<ShoppingCart className="h-5 w-5" />} label="Pedidos" value={String(kpis.orders)} />
        <Kpi icon={<ShoppingCart className="h-5 w-5" />} label="Ticket medio" value={eur(kpis.aov)} />
        <Kpi icon={<Package className="h-5 w-5" />} label="Unidades vendidas" value={String(kpis.units)} />
        <Kpi icon={<Package className="h-5 w-5" />} label="Stock total" value={`${stock.totalUnits} uds`} />
      </div>

      {/* Ventas diarias */}
      <section className="card rounded-4xl p-6">
        <div className="mb-5 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-brand-600" />
          <h3 className="font-display text-lg font-bold">Ventas de los últimos 30 días</h3>
        </div>
        <div className="flex h-44 items-end gap-1">
          {dailySeries.map((d) => (
            <div key={d.date} className="group relative flex flex-1 flex-col items-center justify-end">
              <div
                className="w-full rounded-t bg-gradient-to-t from-brand-500 to-brand-400 transition-all hover:from-brand-600 hover:to-brand-500"
                style={{ height: `${(d.revenue / maxDaily) * 100}%`, minHeight: d.revenue > 0 ? 3 : 0 }}
              />
              <div className="pointer-events-none absolute -top-9 z-10 hidden whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-xs font-semibold text-cream group-hover:block">
                {new Date(d.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}: {eur(d.revenue)}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-content-subtle">
          <span>hace 30 días</span><span>hoy</span>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Mejor día de la semana */}
        <section className="card rounded-4xl p-6">
          <div className="mb-5 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h3 className="font-display text-lg font-bold">Ventas por día de la semana</h3>
          </div>
          <div className="space-y-2.5">
            {weekdayStats.map((w, i) => (
              <div key={w.weekday} className="flex items-center gap-3">
                <span className={cn('w-20 text-sm font-medium', i === 0 ? 'text-brand-800' : 'text-brand-900/60')}>{w.weekday}</span>
                <div className="h-6 flex-1 overflow-hidden rounded-full bg-brand-900/[0.06]">
                  <div
                    className={cn('h-full rounded-full', i === 0 ? 'bg-amber-500' : 'bg-brand-400')}
                    style={{ width: `${(w.revenue / maxWeekday) * 100}%` }}
                  />
                </div>
                <span className="w-20 text-right text-sm font-semibold text-brand-800">{eur(w.revenue)}</span>
              </div>
            ))}
          </div>
          {data.bestWeekday && (
            <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
              🏆 Tu mejor día es el <strong>{data.bestWeekday.weekday}</strong> ({data.bestWeekday.orders} pedidos).
            </p>
          )}
        </section>

        {/* Mejor horario */}
        <section className="card rounded-4xl p-6">
          <div className="mb-5 flex items-center gap-2">
            <Clock className="h-5 w-5 text-brand-600" />
            <h3 className="font-display text-lg font-bold">Mejor franja horaria</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SlotCard label="Mañana ☀️" sub="Antes de las 14h" revenue={slots.morning.revenue} orders={slots.morning.orders} best={slots.best.label === 'Mañana'} />
            <SlotCard label="Tarde 🌆" sub="Desde las 14h" revenue={slots.afternoon.revenue} orders={slots.afternoon.orders} best={slots.best.label === 'Tarde'} />
          </div>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full">
            <div className="bg-amber-400" style={{ width: `${(slots.morning.revenue / slotTotal) * 100}%` }} />
            <div className="bg-brand-500" style={{ width: `${(slots.afternoon.revenue / slotTotal) * 100}%` }} />
          </div>
          <p className="mt-4 rounded-2xl bg-brand-50 px-4 py-2.5 text-sm text-brand-700">
            ⏰ Vendes más por la <strong>{slots.best.label.toLowerCase()}</strong> ({eur(slots.best.revenue)}).
          </p>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top productos */}
        <section className="card rounded-4xl p-6">
          <h3 className="mb-5 font-display text-lg font-bold">Productos más vendidos</h3>
          <div className="space-y-3">
            {topProducts.length === 0 && <p className="text-sm text-content-subtle">Aún no hay ventas.</p>}
            {topProducts.map((p, i) => (
              <div key={p.name}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="line-clamp-1 font-medium text-brand-900/80">{i + 1}. {p.name}</span>
                  <span className="shrink-0 font-semibold text-brand-800">{eur(p.revenue)} · {p.units}u</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-brand-900/[0.06]">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${(p.revenue / maxTop) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Stock */}
        <section className="card rounded-4xl p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Control de stock</h3>
            <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">{stock.totalUnits} uds totales</span>
          </div>
          {/*
            RESUMEN, NO LISTADO. Con el catálogo completo hay miles de productos
            con stock bajo o agotado (sobre todo hasta que el stock se sincroniza
            con Factusol), y pintarlos todos no ayuda a nadie. Se muestra sólo el
            RECUENTO para que el dueño sepa que tiene que revisarlo, sin inundar
            el panel.
          */}
          {stock.lowStock.length > 0 ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center">
              <p className="text-4xl font-bold text-amber-700">{stock.lowStock.length.toLocaleString('es-ES')}</p>
              <p className="mt-1 text-sm font-semibold text-amber-800">
                {stock.lowStock.length === 1 ? 'producto con stock bajo o agotado' : 'productos con stock bajo o agotado'} (≤{' '}
                {stock.lowStockThreshold} uds)
              </p>
              <p className="mx-auto mt-3 max-w-md text-xs text-amber-700/80">
                Revísalo y repón lo necesario. El stock se pone al día al sincronizar con Factusol; hasta entonces muchos
                productos figuran a 0.
              </p>
            </div>
          ) : (
            <p className="rounded-3xl border border-green-200 bg-green-50 p-6 text-center text-sm font-semibold text-green-700">
              Todo el catálogo tiene stock por encima de {stock.lowStockThreshold} uds. 👍
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn('card rounded-4xl p-4', accent && 'bg-brand-600 text-cream')}>
      <div className={cn('mb-2 flex h-9 w-9 items-center justify-center rounded-xl', accent ? 'bg-cream/20 text-cream' : 'bg-brand-100 text-brand-700')}>
        {icon}
      </div>
      <p className={cn('text-xs', accent ? 'text-cream/70' : 'text-content-subtle')}>{label}</p>
      <p className={cn('font-display text-xl font-bold', accent ? 'text-cream' : 'text-ink')}>{value}</p>
    </div>
  );
}

function SlotCard({ label, sub, revenue, orders, best }: { label: string; sub: string; revenue: number; orders: number; best: boolean }) {
  return (
    <div className={cn('rounded-3xl border p-4', best ? 'border-brand-500 bg-brand-50' : 'border-brand-900/10 bg-white')}>
      <p className="font-display font-bold text-ink">{label}</p>
      <p className="text-xs text-content-subtle">{sub}</p>
      <p className="mt-2 font-display text-2xl font-extrabold text-brand-700">{eur(revenue)}</p>
      <p className="text-xs text-brand-900/60">{orders} pedidos</p>
    </div>
  );
}
