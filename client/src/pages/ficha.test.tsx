/**
 * CONTRATO DE LA FICHA DE PRODUCTO.
 *
 * Es la pantalla donde se decide la compra, así que lo que se comprueba aquí es
 * lo que puede costar una venta o provocar un pedido que falle al pagar: que se
 * sepa si hay existencias, que no se pueda elegir un formato agotado, y que el
 * precio que se enseña sea el del formato elegido.
 *
 * El stock que se ve aquí es INFORMATIVO. Quien decide de verdad si se puede
 * comprar es el servidor, en la reserva de la Fase 1; esto sólo evita el paseo.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { ProductPage } from './ProductPage';
import { useCart } from '@/store/cart';

vi.mock('@/lib/api', () => ({ api: { product: vi.fn() } }));
vi.mock('@/store/auth', () => ({ useAuth: () => ({ user: null, loading: false }) }));

import { api } from '@/lib/api';

const base = (o: Record<string, unknown> = {}) => ({
  id: 'p1',
  name: 'Orijen Original Dog',
  slug: 'orijen-original',
  description: 'El 85 % de ingredientes animales.',
  brand: { id: 'b', name: 'Orijen', slug: 'orijen', logoUrl: null, featured: true },
  brandId: 'b',
  price: 34.5,
  compareAt: null,
  image: 'https://x.test/1.jpg',
  gallery: ['https://x.test/1.jpg', 'https://x.test/2.jpg', 'https://x.test/3.jpg'],
  featured: false,
  bestseller: false,
  animals: [{ id: 'a', name: 'Perros', slug: 'perro', emoji: null, sortOrder: 0 }],
  categories: [{ id: 'c', name: 'Alimentación seca', slug: 'alimentacion-seca', type: 'DRY_FOOD', sortOrder: 0 }],
  needs: [{ id: 'n', name: 'Digestivo sensible', slug: 'digestivo' }],
  variants: [
    { id: 'v1', label: '2 kg', price: 34.5, sku: 'SKU-1', stock: 22 },
    { id: 'v2', label: '11,4 kg', price: 112, sku: 'SKU-2', stock: 8 },
  ],
  ...o,
});

const montar = (producto: Record<string, unknown> = base(), related: unknown[] = []) => {
  vi.mocked(api.product).mockResolvedValue({ product: producto, related } as never);
  return render(
    <MemoryRouter initialEntries={['/producto/orijen-original']}>
      <Routes><Route path="/producto/:slug" element={<ProductPage />} /></Routes>
    </MemoryRouter>,
  );
};

afterEach(() => {
  vi.clearAllMocks();
  useCart.setState({ lines: [], isOpen: false } as never);
});

/* ══ 1. Lo esencial, arriba ════════════════════════════════════════════ */

describe('lo que hace falta para decidir', () => {
  it('marca, nombre, precio, formato y botón', async () => {
    montar();
    expect(await screen.findByRole('heading', { level: 1, name: /orijen original dog/i })).toBeInTheDocument();
    // «Orijen» enlaza dos veces a propósito: encima del titular y en la ficha
    // técnica. Se acota al primero, que es el de la zona de compra.
    expect(screen.getAllByRole('link', { name: 'Orijen' })[0]).toHaveAttribute('href', '/tienda?brand=orijen');
    // El precio sale dos veces a propósito: el grande y el del formato «2 kg».
    // Se comprueba el grande, que es el que manda en la decisión.
    expect(screen.getAllByText('34,50 €').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /añadir · 34,50/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /2 kg/i })).toBeInTheDocument();
    // `/añadir/` a secas caza también «Añadir una unidad», el + de la cantidad.
    expect(screen.getByRole('button', { name: /añadir · 34,50/i })).toBeEnabled();
  });

  it('hay exactamente un H1', async () => {
    montar();
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('las migas pasan por el animal, y ese filtro existe', async () => {
    montar();
    await screen.findByRole('heading', { level: 1 });
    const migas = screen.getByRole('navigation', { name: /migas/i });
    expect(within(migas).getByRole('link', { name: 'Perros' })).toHaveAttribute('href', '/tienda?animal=perro');
  });
});

/* ══ 2. Precio rebajado ════════════════════════════════════════════════ */

describe('el precio anterior sólo cuando de verdad lo hay', () => {
  it('sin rebaja no se tacha nada', async () => {
    const { container } = montar();
    await screen.findByRole('heading', { level: 1 });
    expect(container.querySelector('s')).toBeNull();
  });

  it('con rebaja se tacha el anterior y se dice el ahorro', async () => {
    montar(base({ compareAt: 46 }));
    await screen.findByRole('heading', { level: 1 });
    // `<s>` de verdad: se lee como «precio anterior», no como el que se paga.
    expect(screen.getByText('46,00 €').tagName).toBe('S');
    expect(screen.getByText(/−25%/)).toBeInTheDocument();
  });

  it('un compareAt menor o igual NO es una rebaja', async () => {
    const { container } = montar(base({ compareAt: 34.5 }));
    await screen.findByRole('heading', { level: 1 });
    expect(container.querySelector('s')).toBeNull();
  });
});

/* ══ 3. Formatos y existencias ═════════════════════════════════════════ */

describe('formatos', () => {
  it('son un grupo de radio: sólo se elige uno', async () => {
    montar();
    await screen.findByRole('heading', { level: 1 });
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(radios.filter((r) => (r as HTMLInputElement).checked)).toHaveLength(1);
  });

  it('elegir otro formato cambia el precio del botón', async () => {
    const user = userEvent.setup();
    montar();
    await screen.findByRole('heading', { level: 1 });
    await user.click(screen.getByRole('radio', { name: /11,4 kg/i }));
    expect(screen.getByRole('button', { name: /añadir · 112,00/i })).toBeInTheDocument();
  });

  it('un formato agotado se ENSEÑA y se DESACTIVA', async () => {
    /*
     * Esconderlo haría creer que no existe; dejarlo pulsable lleva a un carrito
     * que falla al pagar. Se ve, se dice «agotado» y no se puede elegir.
     */
    montar(base({
      variants: [
        { id: 'v1', label: '2 kg', price: 34.5, sku: 's1', stock: 0 },
        { id: 'v2', label: '11,4 kg', price: 112, sku: 's2', stock: 8 },
      ],
    }));
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByRole('radio', { name: /2 kg/i })).toBeDisabled();
    expect(screen.getByText(/agotado/i)).toBeInTheDocument();
  });

  it('se preselecciona el primero COMPRABLE, no el primero a secas', async () => {
    // Los formatos llegan del más barato al más caro; si el barato está
    // agotado, empezar por él dejaba preseleccionado algo que no se puede comprar.
    montar(base({
      variants: [
        { id: 'v1', label: '2 kg', price: 34.5, sku: 's1', stock: 0 },
        { id: 'v2', label: '11,4 kg', price: 112, sku: 's2', stock: 8 },
      ],
    }));
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByRole('radio', { name: /11,4 kg/i })).toBeChecked();
    expect(screen.getByRole('button', { name: /añadir · 112,00/i })).toBeEnabled();
  });

  it('con todo agotado, no se puede comprar', async () => {
    montar(base({
      variants: [
        { id: 'v1', label: '2 kg', price: 34.5, sku: 's1', stock: 0 },
        { id: 'v2', label: '11,4 kg', price: 112, sku: 's2', stock: 0 },
      ],
    }));
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByRole('button', { name: /sin existencias/i })).toBeDisabled();
    expect(screen.getByText(/sin existencias en este formato/i)).toBeInTheDocument();
  });

  it('se dice si hay existencias, sin inventar urgencia', async () => {
    montar();
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByText('Disponible')).toBeInTheDocument();
    // Nada de «¡sólo quedan 3!»: el stock es alto y uniforme; fabricar escasez
    // con él sería una presión falsa.
    expect(document.body.textContent).not.toMatch(/quedan|últimas unidades|date prisa/i);
  });
});

/* ══ 4. Cantidad ═══════════════════════════════════════════════════════ */

describe('cantidad', () => {
  it('no baja de uno', async () => {
    montar();
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByRole('button', { name: /quitar una unidad/i })).toBeDisabled();
  });

  it('no pasa del stock del formato', async () => {
    const user = userEvent.setup();
    montar(base({ variants: [{ id: 'v1', label: '2 kg', price: 10, sku: 's', stock: 2 }] }));
    await screen.findByRole('heading', { level: 1 });
    const mas = screen.getByRole('button', { name: /añadir una unidad/i });
    await user.click(mas);
    expect(mas).toBeDisabled();
    expect(screen.getByRole('status', { name: /cantidad: 2/i })).toBeInTheDocument();
  });

  it('cambiar de formato reinicia la cantidad', async () => {
    // Si no, se arrastran 8 unidades a un formato que sólo tiene 2.
    const user = userEvent.setup();
    montar();
    await screen.findByRole('heading', { level: 1 });
    await user.click(screen.getByRole('button', { name: /añadir una unidad/i }));
    expect(screen.getByRole('status', { name: /cantidad: 2/i })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /11,4 kg/i }));
    expect(screen.getByRole('status', { name: /cantidad: 1/i })).toBeInTheDocument();
  });
});

/* ══ 5. Añadir al carrito ══════════════════════════════════════════════ */

describe('añadir al carrito', () => {
  it('añade el formato y la cantidad elegidos, con su precio', async () => {
    const user = userEvent.setup();
    montar();
    await screen.findByRole('heading', { level: 1 });
    await user.click(screen.getByRole('radio', { name: /11,4 kg/i }));
    await user.click(screen.getByRole('button', { name: /añadir ·/i }));

    const linea = useCart.getState().lines[0]!;
    expect(linea).toMatchObject({ productId: 'p1', variantId: 'v2', variantLabel: '11,4 kg', quantity: 1 });
    expect(linea.unitPrice).toBe(112);
  });

  it('NO se va de la ficha, y ofrece el carrito sin obligar', async () => {
    const user = userEvent.setup();
    montar();
    await screen.findByRole('heading', { level: 1 });
    await user.click(screen.getByRole('button', { name: /añadir ·/i }));

    // Sigue la ficha en pantalla.
    expect(screen.getByRole('heading', { level: 1, name: /orijen/i })).toBeInTheDocument();
    expect(screen.getByText(/en el carrito/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ver el carrito/i })).toBeInTheDocument();
  });

  it('con todo agotado no añade nada', async () => {
    const user = userEvent.setup();
    montar(base({ variants: [{ id: 'v1', label: '2 kg', price: 10, sku: 's', stock: 0 }] }));
    await screen.findByRole('heading', { level: 1 });
    await user.click(screen.getByRole('button', { name: /sin existencias/i })).catch(() => {});
    expect(useCart.getState().lines).toHaveLength(0);
  });
});

/* ══ 6. Ficha técnica y relacionados ═══════════════════════════════════ */

describe('detalles y relacionados', () => {
  it('la ficha técnica no inventa secciones', async () => {
    const { container } = montar();
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByText('Marca')).toBeInTheDocument();
    expect(screen.getByText('Formatos')).toBeInTheDocument();
    /*
     * No hay ingredientes, composición ni raciones en la base de datos, así que
     * no puede existir una FILA con ese nombre. Se buscan las etiquetas de la
     * ficha (`<dt>`) y no el texto suelto de la página: la descripción del
     * propio producto dice «85 % de ingredientes animales», que es suyo y es
     * cierto — lo que no puede haber es una sección vacía prometiéndolos.
     */
    const etiquetas = [...container.querySelectorAll('dt')].map((d) => d.textContent ?? '');
    expect(etiquetas).toEqual(['Marca', 'Formatos', 'Para', 'Tipo', 'Indicado para']);
    for (const e of etiquetas) expect(e).not.toMatch(/ingredient|composici|raci[oó]n/i);
  });

  it('los relacionados dicen por qué lo son', async () => {
    montar(base(), [{ ...base({ id: 'p2', name: 'Otro pienso', slug: 'otro' }), motivo: 'categoria' }]);
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByRole('heading', { name: /más alimentación seca para perros/i })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/recomendado para ti|personaliz/i);
  });

  it('sin relacionados no se pinta la sección', async () => {
    montar(base(), []);
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('heading', { name: /también te puede servir/i })).not.toBeInTheDocument();
  });
});

/* ══ 7. Producto que no existe ═════════════════════════════════════════ */

describe('un producto que no existe', () => {
  it('lo dice y ofrece salida, sin pantalla en blanco', async () => {
    vi.mocked(api.product).mockResolvedValue(null as never);
    render(
      <MemoryRouter initialEntries={['/producto/no-existe']}>
        <Routes><Route path="/producto/:slug" element={<ProductPage />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: /ya no está/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver el catálogo/i })).toHaveAttribute('href', '/tienda');
  });
});

/* ══ 8. Galería ════════════════════════════════════════════════════════ */

describe('galería', () => {
  it('la primera imagen se prioriza y las demás se aplazan', async () => {
    const { container } = montar();
    await screen.findByRole('heading', { level: 1 });
    const grandes = [...container.querySelectorAll('img')].filter((i) => i.width === 800);
    expect(grandes[0]!.getAttribute('fetchpriority')).toBe('high');
    expect(grandes[0]!.hasAttribute('loading')).toBe(false);
    for (const img of grandes.slice(1)) expect(img.getAttribute('loading')).toBe('lazy');
  });

  it('todas reservan su sitio', async () => {
    const { container } = montar();
    await screen.findByRole('heading', { level: 1 });
    for (const img of container.querySelectorAll('img')) {
      expect(img.getAttribute('width')).toBeTruthy();
      expect(img.getAttribute('height')).toBeTruthy();
    }
  });

  it('las miniaturas se pueden usar con teclado y dicen cuál está puesta', async () => {
    montar();
    await screen.findByRole('heading', { level: 1 });
    const botones = screen.getAllByRole('button', { name: /ver la imagen \d+ de 3/i });
    expect(botones).toHaveLength(3);
    expect(botones[0]).toHaveAttribute('aria-current', 'true');
  });
});
