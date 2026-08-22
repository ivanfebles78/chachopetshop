/**
 * LAS CAPAS QUE TAPAN LA TIENDA SE COMPORTAN COMO TALES.
 *
 * El cajón del carrito parecía correcto y no lo era: se abría encima de la
 * tienda pero no se anunciaba como diálogo, no tenía nombre, Escape no lo
 * cerraba, el tabulador se escapaba a la página tapada de detrás y el fondo
 * seguía desplazándose bajo el dedo.
 *
 * Nada de eso lo detecta un analizador automático —axe da estas pantallas por
 * buenas— ni se ve mirando: hay que ABRIRLO y pulsar teclas. Por eso está aquí.
 * Y es la pantalla por la que se pasa para pagar.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { CartDrawer } from './CartDrawer';
import { useCart } from '@/store/cart';
import { useToast } from '@/store/toast';

const abrirConUnArticulo = () => {
  useCart.setState({
    isOpen: true,
    lines: [{ productId: 'p1', name: 'Pienso de prueba', slug: 'pienso', price: 20, quantity: 1, image: '' }],
  } as never);
};

beforeEach(() => {
  abrirConUnArticulo();
  /* Los almacenes viven en el módulo: sin esto, los avisos de una prueba
     siguen en pie en la siguiente y el DOM sale con elementos de sobra. */
  useToast.setState({ toasts: [] });
});
afterEach(() => useCart.setState({ isOpen: false, lines: [] } as never));

const pintar = () => render(<MemoryRouter><CartDrawer /></MemoryRouter>);

describe('el cajón del carrito', () => {
  it('se anuncia como diálogo y dice cuál es', () => {
    pintar();
    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(dialogo).toHaveAccessibleName(/carrito/i);
  });

  it('Escape lo cierra', async () => {
    const user = userEvent.setup();
    pintar();
    await user.keyboard('{Escape}');
    expect(useCart.getState().isOpen).toBe(false);
  });

  it('bloquea el desplazamiento de la tienda de detrás', () => {
    pintar();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('el foco entra en el cajón, no se queda en la página tapada', () => {
    pintar();
    const dialogo = screen.getByRole('dialog');
    expect(dialogo.contains(document.activeElement)).toBe(true);
  });

  it('el botón de cerrar dice QUÉ cierra', () => {
    // Se llamaba «Cerrar» a secas: con varias capas, no se sabe cerrar qué.
    pintar();
    expect(screen.getByRole('button', { name: /cerrar el carrito/i })).toBeInTheDocument();
  });

  it('al cerrarse DESAPARECE del documento, no sólo de la vista', async () => {
    /*
     * REGRESIÓN, y encontrada en el navegador, no aquí: con `AnimatePresence`
     * el cajón terminaba la animación de salida y se quedaba montado, fuera de
     * la pantalla pero dentro del documento —declarando `aria-modal`, con sus
     * botones tabulables y el foco atrapado dentro—. Visualmente no se notaba;
     * con el teclado, la tienda quedaba inservible después de mirar el carrito.
     */
    const user = userEvent.setup();
    pintar();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.querySelectorAll('[aria-modal="true"]')).toHaveLength(0);
  });

  it('el velo no se anuncia: cerrar está en el botón y en Escape', () => {
    const { container } = pintar();
    const velo = container.querySelector('.fixed.inset-0');
    expect(velo).toHaveAttribute('aria-hidden', 'true');
  });
});

/* ══ Avisos ════════════════════════════════════════════════════════════ */

describe('los avisos', () => {
  it('se anuncian a quien no está mirando la esquina', async () => {
    /*
     * «Producto añadido al carrito» era la única confirmación de que el botón
     * había hecho algo, y aparecía abajo sin región activa: para un lector de
     * pantalla no ocurría nada. `polite` informa sin cortar lo que se esté
     * leyendo, que es lo correcto para un acuse de recibo.
     */
    const { Toaster } = await import('./Toaster');
    const { toast } = await import('@/store/toast');
    render(<Toaster />);

    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');

    await act(async () => { toast.success('Producto añadido al carrito'); });
    expect(screen.getByText(/producto añadido al carrito/i)).toBeInTheDocument();
  });

  it('al descartarlos DESAPARECEN del documento', async () => {
    /*
     * REGRESIÓN. Se quedaban apilados con opacidad 0, invisibles, y cada uno
     * conservaba su botón de cerrar dentro del recorrido del tabulador.
     */
    const user = userEvent.setup();
    const { Toaster } = await import('./Toaster');
    const { toast } = await import('@/store/toast');
    render(<Toaster />);

    await act(async () => { toast.success('Añadido'); });
    const cerrar = screen.getByRole('button', { name: /descartar este aviso/i });

    await user.click(cerrar);

    expect(screen.queryByText('Añadido')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /descartar/i })).not.toBeInTheDocument();
  });
});

/* ══ La capa no se reinicia sola ═══════════════════════════════════════ */

describe('una capa abierta no se reinicia al repintar el padre', () => {
  it('el foco NO salta al primer elemento cuando el padre vuelve a pintar', async () => {
    /*
     * `useOverlay` dependía de la función `alCerrar`, y Navbar la pasa escrita
     * en el sitio: cada repintado creaba una función nueva, el efecto se
     * volvía a montar y el foco saltaba al primer enlace del panel.
     *
     * Se nota escribiendo en el buscador con el menú abierto: cada tecla
     * devolvía el foco al principio. Es decir, no se podía escribir.
     */
    const { MobileNav } = await import('./MobileNav');
    const entradas = [
      { etiqueta: 'Perros', href: '/tienda?animal=perro', total: 3,
        columnas: [{ titulo: 'Alimentación', enlaces: [{ etiqueta: 'Seca', href: '/x', total: 2 }] }] },
      { etiqueta: 'Gatos', href: '/tienda?animal=gato', total: 2, columnas: undefined },
    ] as never;

    const { rerender } = render(
      <MemoryRouter><MobileNav entradas={entradas} conSesion={false} onClose={() => {}} /></MemoryRouter>,
    );

    const gatos = screen.getByRole('link', { name: 'Gatos' });
    gatos.focus();
    expect(document.activeElement).toBe(gatos);

    // El padre repinta y entrega una función NUEVA, como hace Navbar de verdad.
    rerender(
      <MemoryRouter><MobileNav entradas={entradas} conSesion={false} onClose={() => {}} /></MemoryRouter>,
    );

    expect(document.activeElement).toBe(gatos);
    expect(document.body.style.overflow).toBe('hidden');
  });
});
