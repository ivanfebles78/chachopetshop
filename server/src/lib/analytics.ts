import { toNumber } from './serialize.js';

type OrderForStats = {
  total: unknown;
  status: string;
  createdAt: Date;
  items: { name: string; quantity: number; unitPrice: unknown }[];
};

type ProductForStats = {
  name: string;
  active: boolean;
  variants: { label: string; stock: number }[];
};

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const PAID = new Set(['PAID', 'FULFILLED']);
const LOW_STOCK_THRESHOLD = 15;

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const ym = (d: Date) => d.toISOString().slice(0, 7);
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * Calcula todas las métricas del panel a partir de los pedidos pagados y el
 * stock de productos. Cálculo en JS (agnóstico de BD) — el volumen es pequeño.
 */
export function computeAnalytics(orders: OrderForStats[], products: ProductForStats[], now: Date) {
  const paid = orders.filter((o) => PAID.has(o.status));

  const today = startOfDay(now);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let revToday = 0;
  let revWeek = 0;
  let revMonth = 0;
  let revenue = 0;
  let units = 0;

  const byDay = new Map<string, { revenue: number; orders: number }>();
  const byMonth = new Map<string, number>();
  const byWeekday = Array.from({ length: 7 }, () => ({ revenue: 0, orders: 0 }));
  const slots = { morning: { revenue: 0, orders: 0 }, afternoon: { revenue: 0, orders: 0 } };
  const productRevenue = new Map<string, { revenue: number; units: number }>();

  for (const o of paid) {
    const total = toNumber(o.total) ?? 0;
    revenue += total;
    const created = new Date(o.createdAt);

    if (created >= today) revToday += total;
    if (created >= weekAgo) revWeek += total;
    if (created >= monthStart) revMonth += total;

    const dayKey = ymd(created);
    const day = byDay.get(dayKey) ?? { revenue: 0, orders: 0 };
    day.revenue += total;
    day.orders += 1;
    byDay.set(dayKey, day);

    byMonth.set(ym(created), (byMonth.get(ym(created)) ?? 0) + total);

    const wd = byWeekday[created.getDay()]!;
    wd.revenue += total;
    wd.orders += 1;

    const slot = created.getHours() < 14 ? slots.morning : slots.afternoon;
    slot.revenue += total;
    slot.orders += 1;

    for (const it of o.items) {
      units += it.quantity;
      const pr = productRevenue.get(it.name) ?? { revenue: 0, units: 0 };
      pr.revenue += (toNumber(it.unitPrice) ?? 0) * it.quantity;
      pr.units += it.quantity;
      productRevenue.set(it.name, pr);
    }
  }

  // Serie diaria de los últimos 30 días (rellenando huecos con 0).
  const dailySeries: { date: string; revenue: number; orders: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = ymd(d);
    const entry = byDay.get(key) ?? { revenue: 0, orders: 0 };
    dailySeries.push({ date: key, revenue: Math.round(entry.revenue * 100) / 100, orders: entry.orders });
  }

  // Serie mensual de los últimos 6 meses.
  const monthlySeries: { month: string; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = ym(d);
    monthlySeries.push({ month: key, revenue: Math.round((byMonth.get(key) ?? 0) * 100) / 100 });
  }

  const weekdayStats = byWeekday
    .map((v, i) => ({ weekday: WEEKDAYS[i]!, revenue: Math.round(v.revenue * 100) / 100, orders: v.orders }))
    .sort((a, b) => b.revenue - a.revenue);
  const bestWeekday = weekdayStats[0] ?? null;

  const bestSlot =
    slots.morning.revenue >= slots.afternoon.revenue
      ? { label: 'Mañana', ...slots.morning }
      : { label: 'Tarde', ...slots.afternoon };

  const topProducts = [...productRevenue.entries()]
    .map(([name, v]) => ({ name, revenue: Math.round(v.revenue * 100) / 100, units: v.units }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  // Stock
  const stockByProduct = products
    .filter((p) => p.active)
    .map((p) => ({ name: p.name, stock: p.variants.reduce((s, v) => s + v.stock, 0) }))
    .sort((a, b) => a.stock - b.stock);
  const totalUnitsInStock = stockByProduct.reduce((s, p) => s + p.stock, 0);
  const lowStock = stockByProduct.filter((p) => p.stock <= LOW_STOCK_THRESHOLD);

  return {
    kpis: {
      revenueToday: Math.round(revToday * 100) / 100,
      revenueWeek: Math.round(revWeek * 100) / 100,
      revenueMonth: Math.round(revMonth * 100) / 100,
      revenueTotal: Math.round(revenue * 100) / 100,
      orders: paid.length,
      units,
      aov: paid.length ? Math.round((revenue / paid.length) * 100) / 100 : 0,
    },
    dailySeries,
    monthlySeries,
    weekdayStats,
    bestWeekday,
    slots: { morning: slots.morning, afternoon: slots.afternoon, best: bestSlot },
    topProducts,
    stock: { totalUnits: totalUnitsInStock, lowStockThreshold: LOW_STOCK_THRESHOLD, lowStock, byProduct: stockByProduct },
  };
}
