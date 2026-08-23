/**
 * CONTRATO DEL RECORRIDO DE COMPRA.
 *
 * Lo que se comprueba aquí puede costar una venta o dejar a alguien pensando
 * que ha pagado cuando no. Casi nada se ve mirando la pantalla: el carrito que
 * desaparece al cancelar sólo se descubre cancelando, y una página que felicita
 * a quien no ha pagado tiene exactamente el mismo aspecto que una correcta.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { CartDrawer } from '@/components/CartDrawer';
import { CheckoutPage } from './CheckoutPage';
import { CheckoutResultPage } from './CheckoutResultPage';
import { useCart } from '@/store/cart';
import { _resetCacheEnvio } from '@/lib/useEnvio';
import { referenciaDePedido } from '@/lib/pedidos';

vi.mock('@/lib/api', () => ({
  api: {
    config: vi.fn(),
    checkout: vi.fn(),
    order: vi.fn(),
    ultimaDireccion: vi.fn(),
    myOrders: vi.fn(),
  },
}));

const usuario = { actual: null as { id: string; email: string; role: string } | null };
vi.mock('@/store/auth', () => ({
  useAuth: () => ({ user: usuario.actual, loading: false, logout: vi.fn() }),
}));

import { api } from '@/lib/api';

const ENVIO = {
  gratisDesde: 49,
  tarifa: 4.95,
  zona: 'Canarias',
  plazo: '24-48 h',
  prefijosCp: ['35', '38'],
  fueraDeZona: 'Actualmente solo realizamos envíos a las Islas Canarias.',
};

const linea = (o: Record<string, unknown> = {}) => ({
  productId: 'p1',
  variantId: 'v1',
  slug: 'pienso',
  name: 'Orijen Original Dog',
  variantLabel: '2 kg',
  image: 'https://x.test/i.jpg',
  unitPrice: 20,
  quantity: 1,
  ...o,
});

const conCarrito = (lineas: unknown[], abierto = true) =>
  useCart.setState({ lines: lineas, isOpen: abierto } as never);

beforeEach(() => {
  _resetCacheEnvio();
  usuario.actual = null;
  useCart.setState({ lines: [], isOpen: false } as never);
  vi.mocked(api.config).mockResolvedValue({ envio: ENVIO } as never);
  vi.mocked(api.ultimaDireccion).mockResolvedValue({ direccion: null } as never);
});
afterEach(() => vi.clearAllMocks());

/* ══ 1. El cajón del carrito ═══════════════════════════════════════════ */

describe('el cajón del carrito', () => {
  const pintar = () => render(<MemoryRouter><CartDrawer /></MemoryRouter>);

  it('vacío, lo dice y ofrece salida', async () => {
    conCarrito([]);
    pintar();
    expect(await screen.findByText(/todavía no hay nada aquí/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver el catálogo/i })).toHaveAttribute('href', '/tienda');
  });

  it('enseña el precio unitario Y el total de la línea', async () => {
    /*
     * Antes sólo estaba uno de los dos: con tres unidades a 20 € había que
     * multiplicar de cabeza para entender de dónde salía el subtotal.
     */
    conCarrito([linea({ quantity: 3 })]);
    const { container } = pintar();
    expect(await screen.findByText(/20,00 € por unidad/i)).toBeInTheDocument();
    // 3 x 20 = 60. Sale dos veces —la línea y el subtotal—, que es correcto:
    // se acota a la línea, que es lo que antes no estaba.
    const item = container.querySelector('li');
    expect(within(item as HTMLElement).getByText('60,00 €')).toBeInTheDocument();
  });

  it('la cantidad se sube, se baja y no baja de uno', async () => {
    const user = userEvent.setup();
    conCarrito([linea({ quantity: 1 })]);
    pintar();
    expect(await screen.findByRole('button', { name: /quitar una unidad/i })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /añadir una unidad/i }));
    expect(useCart.getState().lines[0]!.quantity).toBe(2);
    await user.click(screen.getByRole('button', { name: /quitar una unidad/i }));
    expect(useCart.getState().lines[0]!.quantity).toBe(1);
  });

  it('se puede quitar una línea, y el botón dice cuál', async () => {
    const user = userEvent.setup();
    conCarrito([linea(), linea({ productId: 'p2', variantId: 'v2', name: 'Acana Pacifica' })]);
    pintar();
    await user.click(await screen.findByRole('button', { name: /quitar orijen original dog del carrito/i }));
    expect(useCart.getState().lines).toHaveLength(1);
    expect(useCart.getState().lines[0]!.name).toBe('Acana Pacifica');
  });

  it('dice cuánto falta para el envío gratis, calculado de verdad', async () => {
    conCarrito([linea({ unitPrice: 40.6, quantity: 1 })]);
    pintar();
    // 49 − 40,60 = 8,40. Sale del carrito y del umbral del servidor.
    expect(await screen.findByText(/te faltan/i)).toHaveTextContent('8,40');
  });

  it('al llegar al umbral lo celebra sin exagerar', async () => {
    conCarrito([linea({ unitPrice: 49 })]);
    pintar();
    expect(await screen.findByText(/envío gratis/i)).toBeInTheDocument();
    expect(screen.queryByText(/te faltan/i)).not.toBeInTheDocument();
  });

  it('NO inventa ninguna urgencia', async () => {
    conCarrito([linea()]);
    pintar();
    await screen.findByRole('dialog');
    expect(document.body.textContent).not.toMatch(
      /quedan? \d|últimas unidades|date prisa|caduca|personas? (viendo|mirando)/i,
    );
  });

  it('cada cambio se anuncia a quien no ve la pantalla', async () => {
    conCarrito([linea({ quantity: 2 })]);
    const { container } = pintar();
    await screen.findByRole('dialog');
    const region = container.querySelector('[aria-live="polite"]');
    expect(region).toHaveTextContent('Subtotal 40,00 €');
  });

  it('es un diálogo de verdad', async () => {
    conCarrito([linea()]);
    pintar();
    const d = await screen.findByRole('dialog');
    expect(d).toHaveAttribute('aria-modal', 'true');
    expect(d).toHaveAccessibleName(/carrito/i);
  });
});

/* ══ 2. Pago ═══════════════════════════════════════════════════════════ */

describe('la página de pago', () => {
  const pintar = () =>
    render(
      <MemoryRouter initialEntries={['/checkout']}>
        <Routes><Route path="/checkout" element={<CheckoutPage />} /></Routes>
      </MemoryRouter>,
    );

  it('con el carrito vacío no deja pagar', async () => {
    conCarrito([], false);
    pintar();
    expect(await screen.findByRole('heading', { name: /tu carrito está vacío/i })).toBeInTheDocument();
  });

  it('NO vacía el carrito antes de ir a Stripe', async () => {
    /*
     * REGRESIÓN, y de las caras. Se vaciaba justo antes de redirigir, así que
     * quien cancelaba el pago volvía a una tienda vacía — mientras la página de
     * cancelación le prometía que «tu carrito sigue disponible». Era falso.
     */
    const user = userEvent.setup();
    conCarrito([linea()], false);
    vi.mocked(api.checkout).mockResolvedValue({ orderId: 'o1', url: 'https://stripe.test/x' } as never);
    // `window.location.href` no navega en jsdom, así que la asignación es inocua.
    pintar();

    await user.type(await screen.findByLabelText(/email/i), 'ana@ejemplo.test');
    await user.type(screen.getByLabelText(/nombre y apellidos/i), 'Ana');
    await user.type(screen.getByLabelText(/dirección/i), 'Calle 1');
    await user.type(screen.getByLabelText(/ciudad/i), 'Las Palmas');
    await user.type(screen.getByLabelText(/código postal/i), '35001');
    await user.click(screen.getByRole('button', { name: /pagar/i }));

    expect(vi.mocked(api.checkout)).toHaveBeenCalledTimes(1);
    expect(useCart.getState().lines).toHaveLength(1);
  });


  it('el cliente NO manda importes: sólo identificadores y cantidad', async () => {
    const user = userEvent.setup();
    conCarrito([linea({ quantity: 2 })], false);
    vi.mocked(api.checkout).mockResolvedValue({ orderId: 'o1', url: 'https://stripe.test/x' } as never);
    pintar();

    await user.type(await screen.findByLabelText(/email/i), 'ana@ejemplo.test');
    await user.type(screen.getByLabelText(/nombre y apellidos/i), 'Ana');
    await user.type(screen.getByLabelText(/dirección/i), 'Calle 1');
    await user.type(screen.getByLabelText(/ciudad/i), 'Las Palmas');
    await user.type(screen.getByLabelText(/código postal/i), '35001');
    await user.click(screen.getByRole('button', { name: /pagar/i }));

    const enviado = vi.mocked(api.checkout).mock.calls[0]![0] as { items: Record<string, unknown>[] };
    expect(Object.keys(enviado.items[0]!).sort()).toEqual(['productId', 'quantity', 'variantId']);
    expect(JSON.stringify(enviado)).not.toMatch(/unitPrice|price|total|subtotal/i);
  });

  it('a quien tiene cuenta le rellena correo y dirección del último pedido', async () => {
    usuario.actual = { id: 'u1', email: 'ana@ejemplo.test', role: 'CUSTOMER' };
    vi.mocked(api.ultimaDireccion).mockResolvedValue({
      direccion: { nombre: 'Ana Pérez', direccion: 'Calle Mayor 3', ciudad: 'Las Palmas', cp: '35001' },
    } as never);
    conCarrito([linea()], false);
    pintar();

    expect(await screen.findByDisplayValue('ana@ejemplo.test')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Calle Mayor 3')).toBeInTheDocument();
    expect(screen.getByDisplayValue('35001')).toBeInTheDocument();
  });

  it('una sesión caducada se explica, no se traga', async () => {
    /*
     * Garantía de la Fase 1: una cookie que ya no verifica NO puede convertirse
     * en un pedido de invitado sin dueño. El servidor corta con 401 y aquí se
     * dice qué hacer.
     */
    const user = userEvent.setup();
    conCarrito([linea()], false);
    vi.mocked(api.checkout).mockRejectedValue(Object.assign(new Error('x'), { status: 401 }));
    pintar();

    await user.type(await screen.findByLabelText(/email/i), 'ana@ejemplo.test');
    await user.type(screen.getByLabelText(/nombre y apellidos/i), 'Ana');
    await user.type(screen.getByLabelText(/dirección/i), 'Calle 1');
    await user.type(screen.getByLabelText(/ciudad/i), 'Las Palmas');
    await user.type(screen.getByLabelText(/código postal/i), '35001');
    await user.click(screen.getByRole('button', { name: /pagar/i }));

    const aviso = await screen.findByRole('alert');
    expect(aviso).toHaveTextContent(/sesión ha caducado/i);
    expect(useCart.getState().lines).toHaveLength(1);
  });

  it('el envío que enseña sale de la regla del servidor', async () => {
    conCarrito([linea({ unitPrice: 20 })], false);
    pintar();
    // 20 € < 49 € → se cobra la tarifa, y el total la incluye.
    expect(await screen.findByText('4,95 €')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pagar 24,95/i })).toBeInTheDocument();
  });
});

/* ══ 2b. Sólo se entrega en Canarias ═══════════════════════════════════ */

describe('la zona de entrega, en el formulario', () => {
  const pintar = () =>
    render(
      <MemoryRouter initialEntries={['/checkout']}>
        <Routes><Route path="/checkout" element={<CheckoutPage />} /></Routes>
      </MemoryRouter>,
    );

  const rellenar = async (user: ReturnType<typeof userEvent.setup>, cp: string) => {
    await user.type(await screen.findByLabelText(/email/i), 'ana@ejemplo.test');
    await user.type(screen.getByLabelText(/nombre y apellidos/i), 'Ana');
    await user.type(screen.getByLabelText(/dirección/i), 'Calle 1');
    await user.type(screen.getByLabelText(/ciudad/i), 'Madrid');
    await user.type(screen.getByLabelText(/código postal/i), cp);
    await user.click(screen.getByRole('button', { name: /pagar/i }));
  };

  const MENSAJE = /solo realizamos envíos a las islas canarias/i;

  it('un código postal de fuera NI SIQUIERA llega al servidor', async () => {
    /*
     * Lo importante no es el mensaje: es que `api.checkout` no se llame. Quien
     * escribe un CP de Madrid no debe ver la pasarela de pago ni un pedido
     * creado a medias.
     */
    const user = userEvent.setup();
    conCarrito([linea()], false);
    pintar();

    await rellenar(user, '28001');

    expect(vi.mocked(api.checkout)).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toHaveTextContent(MENSAJE);
  });

  it('lo dice con las palabras exactas', async () => {
    const user = userEvent.setup();
    conCarrito([linea()], false);
    pintar();
    await rellenar(user, '07001');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Actualmente solo realizamos envíos a las Islas Canarias.',
    );
  });

  it('marca el campo del código postal, no el formulario entero', async () => {
    // Quien navega con lector de pantalla tiene que saber QUÉ campo corregir.
    const user = userEvent.setup();
    conCarrito([linea()], false);
    pintar();
    await rellenar(user, '28001');

    const cp = screen.getByLabelText(/código postal/i);
    expect(cp).toHaveAttribute('aria-invalid', 'true');
    expect(cp).toHaveFocus();
  });

  it('corregirlo retira el aviso', async () => {
    const user = userEvent.setup();
    conCarrito([linea()], false);
    pintar();
    await rellenar(user, '28001');
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/código postal/i));
    await user.type(screen.getByLabelText(/código postal/i), '38201');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/código postal/i)).not.toHaveAttribute('aria-invalid');
  });

  it('Ceuta y Melilla tampoco pasan', async () => {
    for (const cp of ['51001', '52001']) {
      const user = userEvent.setup();
      conCarrito([linea()], false);
      const { unmount } = pintar();
      await rellenar(user, cp);
      expect(vi.mocked(api.checkout)).not.toHaveBeenCalled();
      unmount();
    }
  });

  it('un código postal canario SÍ pasa', async () => {
    const user = userEvent.setup();
    conCarrito([linea()], false);
    vi.mocked(api.checkout).mockResolvedValue({ orderId: 'o1', url: 'https://stripe.test/x' } as never);
    pintar();

    await rellenar(user, '38201');

    expect(vi.mocked(api.checkout)).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('el formulario dice a dónde se entrega ANTES de que se escriba nada', async () => {
    // Enterarse al pulsar «Pagar» es enterarse tarde.
    conCarrito([linea()], false);
    pintar();
    expect(await screen.findByText(/solo en Canarias/i)).toBeInTheDocument();
    expect(screen.getByText(/35xxx y 38xxx/i)).toBeInTheDocument();
  });
});

/* ══ 3. Vuelta de Stripe ═══════════════════════════════════════════════ */

describe('la vuelta de Stripe', () => {
  const pintar = (ruta: string, tipo: 'success' | 'cancel') =>
    render(
      <MemoryRouter initialEntries={[ruta]}>
        <Routes><Route path="/checkout/:x" element={<CheckoutResultPage kind={tipo} />} /></Routes>
      </MemoryRouter>,
    );

  const pedido = (o: Record<string, unknown> = {}) => ({
    id: 'clabcdefgh12345678',
    email: 'ana@ejemplo.test',
    status: 'PENDING',
    subtotal: 40,
    shipping: 4.95,
    total: 44.95,
    createdAt: new Date().toISOString(),
    items: [{ id: 'i1', name: 'Orijen', variantLabel: '2 kg', unitPrice: 20, quantity: 2, image: null }],
    ...o,
  });

  it('NO da por pagado a quien sólo ha llegado a la página', async () => {
    /*
     * La URL de retorno la controla quien navega: se puede escribir a mano.
     * Quien decide si está pagado es el webhook firmado de Stripe. Recién
     * llegado, lo normal es «pendiente de confirmar», no «pagado».
     */
    vi.mocked(api.order).mockResolvedValue({ order: pedido({ status: 'PENDING' }) } as never);
    pintar('/checkout/success?order=clabcdefgh12345678&t=tok', 'success');
    expect(await screen.findByText(/pago pendiente de confirmar/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Pagado$/)).not.toBeInTheDocument();
  });

  it('cuando el pedido consta pagado, lo dice', async () => {
    vi.mocked(api.order).mockResolvedValue({ order: pedido({ status: 'PAID' }) } as never);
    pintar('/checkout/success?order=clabcdefgh12345678&t=tok', 'success');
    expect(await screen.findByText('Pagado')).toBeInTheDocument();
  });

  it('vacía el carrito SÓLO si el pedido existe', async () => {
    conCarrito([linea()], false);
    vi.mocked(api.order).mockResolvedValue({ order: pedido() } as never);
    pintar('/checkout/success?order=clabcdefgh12345678&t=tok', 'success');
    await screen.findByText(/hemos recibido tu pedido/i);
    expect(useCart.getState().lines).toHaveLength(0);
  });

  it('con un enlace que no carga ningún pedido, NO vacía el carrito', async () => {
    // Puede ser una URL escrita a mano. Quien no ha comprado no debe perder lo
    // que tenía dentro.
    conCarrito([linea()], false);
    vi.mocked(api.order).mockRejectedValue(new Error('404'));
    pintar('/checkout/success?order=inventado', 'success');
    await screen.findByText(/no hemos podido cargar/i);
    expect(useCart.getState().lines).toHaveLength(1);
  });

  it('enseña la referencia, las líneas y los totales del pedido', async () => {
    vi.mocked(api.order).mockResolvedValue({ order: pedido() } as never);
    pintar('/checkout/success?order=clabcdefgh12345678&t=tok', 'success');
    expect(await screen.findByText(referenciaDePedido('clabcdefgh12345678'))).toBeInTheDocument();
    // «4,95 €» aparece dos veces —envío y, dentro de «44,95 €», el total—,
    // así que se comprueba la fila del envío por su etiqueta.
    const envio = screen.getByText('Envío').closest('div');
    expect(within(envio as HTMLElement).getByText('4,95 €')).toBeInTheDocument();
    const total = screen.getByText('Total').closest('div');
    expect(within(total as HTMLElement).getByText('44,95 €')).toBeInTheDocument();
    expect(screen.getByText(/Orijen/)).toBeInTheDocument();
  });

  it('a quien tiene cuenta le ofrece «Ver mis pedidos»', async () => {
    usuario.actual = { id: 'u1', email: 'ana@ejemplo.test', role: 'CUSTOMER' };
    vi.mocked(api.order).mockResolvedValue({ order: pedido() } as never);
    pintar('/checkout/success?order=clabcdefgh12345678&t=tok', 'success');
    expect(await screen.findByRole('link', { name: /ver mis pedidos/i })).toHaveAttribute('href', '/cuenta');
    expect(screen.getByRole('link', { name: /seguir comprando/i })).toHaveAttribute('href', '/tienda');
  });

  it('sin cuenta no ofrece un enlace que no le sirve', async () => {
    vi.mocked(api.order).mockResolvedValue({ order: pedido() } as never);
    pintar('/checkout/success?order=clabcdefgh12345678&t=tok', 'success');
    await screen.findByText(/hemos recibido tu pedido/i);
    expect(screen.queryByRole('link', { name: /ver mis pedidos/i })).not.toBeInTheDocument();
  });
});

/* ══ 4. Pago cancelado ═════════════════════════════════════════════════ */

describe('pago cancelado', () => {
  const pintar = () =>
    render(
      <MemoryRouter initialEntries={['/checkout/cancel']}>
        <Routes><Route path="/checkout/:x" element={<CheckoutResultPage kind="cancel" />} /></Routes>
      </MemoryRouter>,
    );

  it('dice la verdad sobre el carrito, porque ahora SÍ sigue ahí', async () => {
    conCarrito([linea()], false);
    pintar();
    expect(await screen.findByText(/no se ha hecho ningún cargo/i)).toHaveTextContent(/sigue ahí/i);
    expect(screen.getByRole('link', { name: /retomar la compra/i })).toHaveAttribute('href', '/checkout');
  });

  it('con el carrito vacío no promete lo que no hay', async () => {
    conCarrito([], false);
    pintar();
    await screen.findByRole('heading', { name: /no se ha completado el pago/i });
    expect(screen.queryByRole('link', { name: /retomar la compra/i })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/sigue ahí/i);
  });

  it('no asusta con un error genérico', async () => {
    conCarrito([linea()], false);
    pintar();
    await screen.findByRole('heading', { name: /no se ha completado el pago/i });
    expect(document.body.textContent).not.toMatch(/error|fallo|problema técnico/i);
  });
});
