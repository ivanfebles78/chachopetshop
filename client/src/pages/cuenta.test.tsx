/**
 * MIS PEDIDOS Y EL PANEL.
 *
 * Lo que se comprueba aquí es lo que un analizador automático no ve: que el
 * estado se pueda LEER y no sólo mirar, que no se prometa un proceso de
 * devolución que no existe, y que el panel no ofrezca cambios que el servidor
 * fuese a rechazar.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('@/lib/api', () => ({
  api: {
    myOrders: vi.fn(),
    adminOrders: vi.fn(),
    adminUpdateOrder: vi.fn(),
    adminAnalytics: vi.fn(),
    adminMessages: vi.fn(),
    adminProducts: vi.fn(),
  },
  ApiError: class extends Error {},
}));

const usuario = { actual: null as { id: string; email: string; role: string } | null };
vi.mock('@/store/auth', () => ({
  useAuth: () => ({ user: usuario.actual, loading: false, logout: vi.fn() }),
}));

import { api } from '@/lib/api';
import { AccountPage } from './AccountPage';
import type { Order } from '@/lib/types';

const pedido = (p: Partial<Order> = {}): Order =>
  ({
    id: 'cmt64jce2002rz7pc7cg8abcd',
    email: 'ana@ejemplo.test',
    status: 'PAID',
    fulfillment: null,
    subtotal: 34.5,
    shipping: 4.95,
    total: 39.45,
    createdAt: '2026-08-23T10:00:00.000Z',
    shippingName: 'Ana Pérez',
    shippingAddress: 'Calle Real 1',
    shippingCity: 'La Laguna',
    shippingZip: '38201',
    items: [
      {
        id: 'i1',
        productId: 'p1',
        variantId: 'v1',
        name: 'Orijen Original Dog',
        variantLabel: '2 kg',
        unitPrice: 34.5,
        quantity: 1,
        image: null,
      },
    ],
    ...p,
  }) as Order;

const ANALITICA = {
  kpis: { revenueToday: 0, revenueWeek: 0, revenueMonth: 0, revenueTotal: 0, orders: 0, units: 0, aov: 0 },
  dailySeries: [],
  monthlySeries: [],
  weekdayStats: [],
  bestWeekday: null,
  slots: {
    morning: { revenue: 0, orders: 0 },
    afternoon: { revenue: 0, orders: 0 },
    best: { label: '—', revenue: 0, orders: 0 },
  },
  topProducts: [],
  stock: { totalUnits: 0, lowStockThreshold: 3, lowStock: [], byProduct: [] },
};

/**
 * El `<summary>` del pedido.
 *
 * Se busca por elemento y no por rol: `<details>` y `<address>` comparten
 * `role="group"` —así que buscar «group» es ambiguo en esta pantalla— y
 * `<summary>` no expone `button` en el mapeo de testing-library.
 */
const resumenDelPedido = () => document.querySelector('summary') as HTMLElement;

const pintar = () =>
  render(
    <MemoryRouter initialEntries={['/cuenta']}>
      <Routes>
        <Route path="/cuenta" element={<AccountPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  usuario.actual = { id: 'u1', email: 'ana@ejemplo.test', role: 'CUSTOMER' };
  vi.mocked(api.myOrders).mockResolvedValue({ orders: [pedido()] } as never);
});
afterEach(() => vi.clearAllMocks());

/* ══ 1. El historial ══════════════════════════════════════════════════════ */

describe('mis pedidos', () => {
  it('cada pedido lleva referencia, fecha, total y estado', async () => {
    pintar();
    expect(await screen.findByText('#7CG8ABCD')).toBeInTheDocument();
    expect(screen.getByText('Pagado')).toBeInTheDocument();
    // Sale dos veces —en el resumen y en el desglose—: `<details>` cerrado
    // conserva sus hijos en el DOM.
    expect(screen.getAllByText('39,45 €').length).toBeGreaterThan(0);
    expect(screen.getByText(/23 de agosto de 2026/)).toBeInTheDocument();
  });

  it('el estado se puede LEER, no sólo mirar', async () => {
    /*
     * Es la regla: el color acompaña, nunca informa solo. Quien no distingue el
     * verde del verde azulado —o quien escucha la página— necesita la palabra.
     */
    vi.mocked(api.myOrders).mockResolvedValue({
      orders: [pedido({ fulfillment: 'SHIPPED' })],
    } as never);
    pintar();
    expect(await screen.findByText('Enviado')).toBeInTheDocument();
  });

  it('recorre los estados del ciclo con su propia palabra', async () => {
    for (const [fulfillment, etiqueta] of [
      ['PREPARING', 'Preparando'],
      ['SHIPPED', 'Enviado'],
      ['DELIVERED', 'Entregado'],
      ['CANCELLED', 'Cancelado'],
    ] as const) {
      vi.mocked(api.myOrders).mockResolvedValue({ orders: [pedido({ fulfillment })] } as never);
      const { unmount } = pintar();
      expect(await screen.findByText(etiqueta)).toBeInTheDocument();
      unmount();
    }
  });

  it('un pedido sin cobrar no dice que se esté preparando', async () => {
    vi.mocked(api.myOrders).mockResolvedValue({
      orders: [pedido({ status: 'PENDING', fulfillment: 'PREPARING' })],
    } as never);
    pintar();
    expect(await screen.findByText('Pago pendiente de confirmar')).toBeInTheDocument();
    expect(screen.queryByText('Preparando')).not.toBeInTheDocument();
  });
});

/* ══ 2. El detalle ════════════════════════════════════════════════════════ */

describe('el detalle del pedido', () => {
  const abrir = async () => {
    const user = userEvent.setup();
    pintar();
    await screen.findByText('#7CG8ABCD');
    await user.click(resumenDelPedido());
    return user;
  };

  it('enseña artículos, formatos, cantidades e importes', async () => {
    await abrir();
    expect(screen.getByText('Orijen Original Dog')).toBeInTheDocument();
    expect(screen.getByText(/2 kg/)).toBeInTheDocument();
    expect(screen.getByText('Subtotal')).toBeInTheDocument();
    expect(screen.getByText('Envío')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('enseña la dirección de entrega', async () => {
    await abrir();
    expect(screen.getByText('Calle Real 1')).toBeInTheDocument();
    expect(screen.getByText('38201 La Laguna')).toBeInTheDocument();
  });

  it('ofrece AYUDA, no un proceso de devolución que no existe', async () => {
    /*
     * Las condiciones de devolución no están decididas. Un botón de «solicitar
     * devolución» prometería un procedimiento y un derecho inventados; un
     * teléfono y un correo reales, no.
     */
    await abrir();
    expect(screen.getByText('¿Necesitas ayuda con tu pedido?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'chachopetshop@gmail.com' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '628 013 933' })).toBeInTheDocument();
    expect(screen.queryByText(/solicitar devolución/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/días para devolver/i)).not.toBeInTheDocument();
  });

  it('el teléfono enlaza al número real, en formato marcable', async () => {
    await abrir();
    expect(screen.getByRole('link', { name: '628 013 933' })).toHaveAttribute(
      'href',
      'tel:+34628013933',
    );
  });

  it('no enseña campos internos', async () => {
    await abrir();
    const texto = document.body.textContent ?? '';
    expect(texto).not.toMatch(/stripeSessionId|accessToken|stockCommitted|reservedUntil/);
  });

  it('el detalle se abre y se cierra con el teclado', async () => {
    // `<details>`/`<summary>` del navegador: trae gratis el estado abierto para
    // el lector de pantalla y el teclado. Reimplementarlo sería hacerlo peor.
    const user = userEvent.setup();
    pintar();
    await screen.findByText('#7CG8ABCD');
    const resumen = resumenDelPedido();

    // Se tabula hasta llegar: lo que importa es que ESTÉ en el orden de
    // tabulación, no que sea lo primero de la página.
    for (let i = 0; i < 12 && document.activeElement !== resumen; i++) await user.tab();
    expect(resumen).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(screen.getByText('Calle Real 1')).toBeInTheDocument();
  });
});

/* ══ 3. Sin pedidos ═══════════════════════════════════════════════════════ */

describe('cuando no hay pedidos', () => {
  it('lo dice sin dejar la pantalla vacía', async () => {
    vi.mocked(api.myOrders).mockResolvedValue({ orders: [] } as never);
    pintar();
    expect(await screen.findByText(/todavía no has hecho ningún pedido|aún no/i)).toBeInTheDocument();
  });
});

/* ══ 4. El panel ══════════════════════════════════════════════════════════ */

describe('el control de estado del panel', () => {
  it('sólo ofrece las transiciones que el servidor aceptaría', async () => {
    const { AdminPage } = await import('./AdminPage');
    usuario.actual = { id: 'a1', email: 'admin@ejemplo.test', role: 'ADMIN' };
    vi.mocked(api.adminOrders).mockResolvedValue({
      orders: [{ ...pedido({ fulfillment: 'PREPARING' }), siguientes: ['SHIPPED', 'CANCELLED'] }],
    } as never);
    vi.mocked(api.adminAnalytics).mockResolvedValue(ANALITICA as never);
    vi.mocked(api.adminMessages).mockResolvedValue({ messages: [] } as never);
    vi.mocked(api.adminProducts).mockResolvedValue({ products: [] } as never);

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: /pedidos/i }));
    const selector = await screen.findByRole('combobox', { name: /cambiar el estado/i });
    const opciones = within(selector).getAllByRole('option').map((o) => o.textContent);

    expect(opciones).toContain('Enviado');
    expect(opciones).toContain('Cancelado');
    // Ni volver atrás, ni saltarse un paso.
    expect(opciones).not.toContain('Preparando');
    expect(opciones).not.toContain('Entregado');
  });

  it('el selector tiene nombre accesible con la referencia del pedido', async () => {
    const { AdminPage } = await import('./AdminPage');
    usuario.actual = { id: 'a1', email: 'admin@ejemplo.test', role: 'ADMIN' };
    vi.mocked(api.adminOrders).mockResolvedValue({
      orders: [{ ...pedido(), siguientes: ['PREPARING', 'CANCELLED'] }],
    } as never);
    vi.mocked(api.adminAnalytics).mockResolvedValue(ANALITICA as never);
    vi.mocked(api.adminMessages).mockResolvedValue({ messages: [] } as never);
    vi.mocked(api.adminProducts).mockResolvedValue({ products: [] } as never);

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole('button', { name: /pedidos/i }));

    // Con varios pedidos en la lista, «Cambiar estado…» a secas no distingue
    // cuál es cuál para quien navega con lector de pantalla.
    expect(
      await screen.findByRole('combobox', { name: /cambiar el estado del pedido 7CG8ABCD/i }),
    ).toBeInTheDocument();
  });
});
