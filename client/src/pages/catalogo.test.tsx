/**
 * CONTRATO DEL CATÁLOGO.
 *
 * El defecto que más tiempo llevaba vivo aquí no se ve mirando: el panel
 * ofrecía «Reptiles» y «Semihúmeda», las dos con cero productos. La Fase 2A
 * arregló el menú de la cabecera con una prueba parecida a ésta y el panel de
 * filtros se quedó como estaba, porque nadie lo estaba mirando.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { CatalogPage } from './CatalogPage';

vi.mock('@/lib/api', () => ({ api: { products: vi.fn(), taxonomy: vi.fn() } }));
vi.mock('@/store/auth', () => ({ useAuth: () => ({ user: null, loading: false }) }));

import { api } from '@/lib/api';

const FACETAS = {
  animals: [
    { slug: 'perro', nombre: 'Perros', total: 15 },
    { slug: 'gato', nombre: 'Gatos', total: 12 },
    // Existe en la taxonomía y no tiene ni un producto: el caso real.
    { slug: 'reptil', nombre: 'Reptiles', total: 0 },
  ],
  categories: [
    { slug: 'alimentacion-seca', nombre: 'Alimentación seca', total: 13 },
    { slug: 'semihumeda', nombre: 'Semihúmeda', total: 0 },
  ],
  needs: [{ slug: 'digestivo', nombre: 'Digestivo sensible', total: 6 }],
  brands: [{ slug: 'ownat', nombre: 'Ownat', total: 3 }],
  ofertas: 2,
  precio: { min: 5, max: 60 },
};

let n = 0;
const producto = (o: Record<string, unknown> = {}) => {
  n += 1;
  return {
    id: `p${n}`, name: `Pienso ${n}`, slug: `pienso-${n}`, description: 'x',
    brand: { id: 'b', name: 'Ownat', slug: 'ownat', logoUrl: null, featured: false }, brandId: 'b',
    price: 20, compareAt: null, image: 'https://x.test/i.jpg', gallery: [],
    featured: false, bestseller: false,
    animals: [], categories: [], needs: [],
    variants: [{ id: `v${n}`, label: '2 kg', price: 20, sku: `s${n}`, stock: 5 }],
    ...o,
  };
};

const montar = (
  ruta = '/tienda',
  respuesta: Record<string, unknown> = {},
) => {
  const items = (respuesta.items as unknown[]) ?? [producto(), producto()];
  vi.mocked(api.products).mockResolvedValue({
    items, page: 1, pageSize: 12, total: items.length, totalPages: 1,
    facets: FACETAS, ...respuesta,
  } as never);
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes><Route path="/tienda" element={<CatalogPage />} /></Routes>
    </MemoryRouter>,
  );
};

afterEach(() => vi.clearAllMocks());
beforeEach(() => { n = 0; });

/* ══ 1. Ninguna opción vacía ═══════════════════════════════════════════ */

describe('el panel de filtros no ofrece callejones sin salida', () => {
  it('las facetas con cero productos NO se pintan', async () => {
    montar();
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByLabelText(/reptiles/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Reptiles')).not.toBeInTheDocument();
    expect(screen.queryByText('Semihúmeda')).not.toBeInTheDocument();
  });

  it('las que sí tienen producto salen con su recuento', async () => {
    montar();
    await screen.findByRole('heading', { level: 1 });
    const perros = screen.getByRole('checkbox', { name: /perros/i });
    expect(perros).toBeInTheDocument();
    // El número va al lado para poder decidir antes de pulsar.
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('13')).toBeInTheDocument();
  });

  it('una faceta vacía SÍ se enseña si está puesta, para poder soltarla', async () => {
    /*
     * El único caso en que enseñar un cero es correcto: si se esconde el filtro
     * que alguien acaba de marcar, se queda sin forma de quitarlo y sin
     * entender por qué no ve nada.
     */
    montar('/tienda?animal=reptil', { items: [], total: 0 });
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByRole('checkbox', { name: /reptiles/i })).toBeChecked();
  });

  it('el filtro de ofertas no aparece si no hay rebajas', async () => {
    montar('/tienda', { facets: { ...FACETAS, ofertas: 0 } });
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('checkbox', { name: /oferta/i })).not.toBeInTheDocument();
  });
});

/* ══ 2. Los filtros son casillas de verdad ═════════════════════════════ */

describe('semántica y teclado', () => {
  it('cada opción es una casilla con nombre', async () => {
    montar();
    await screen.findByRole('heading', { level: 1 });
    const perros = screen.getByRole('checkbox', { name: /perros/i });
    expect(perros).not.toBeChecked();
  });

  it('marcar una opción la refleja en la dirección', async () => {
    const user = userEvent.setup();
    montar();
    await screen.findByRole('heading', { level: 1 });
    await user.click(screen.getByRole('checkbox', { name: /gatos/i }));
    // La petición siguiente lleva el filtro: es el contrato que importa.
    expect(vi.mocked(api.products).mock.calls.at(-1)![0]).toMatchObject({ animal: 'gato' });
  });

  it('los filtros llegan al servidor combinados', async () => {
    montar('/tienda?animal=perro&category=alimentacion-seca&brand=ownat');
    await screen.findByRole('heading', { level: 1 });
    expect(vi.mocked(api.products).mock.calls[0]![0]).toMatchObject({
      animal: 'perro', category: 'alimentacion-seca', brand: ['ownat'],
    });
  });
});

/* ══ 3. Se ve qué se ha filtrado, y se deshace de uno en uno ═══════════ */

describe('filtros puestos', () => {
  it('cada uno sale como ficha con su nombre', async () => {
    montar('/tienda?animal=perro&brand=ownat');
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByRole('button', { name: /Perros.*Quitar este filtro/is })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ownat.*Quitar este filtro/is })).toBeInTheDocument();
  });

  it('se puede quitar UNO sin perder los demás', async () => {
    /*
     * Antes sólo había «Limpiar todo»: para quitar una marca de tres había que
     * empezar de cero y volver a marcar las otras dos.
     */
    const user = userEvent.setup();
    montar('/tienda?animal=perro&brand=ownat');
    await screen.findByRole('heading', { level: 1 });
    await user.click(screen.getByRole('button', { name: /Ownat.*Quitar este filtro/is }));
    const ultima = vi.mocked(api.products).mock.calls.at(-1)![0];
    expect(ultima).toMatchObject({ animal: 'perro' });
    expect(ultima!.brand).toEqual([]);
  });
});

/* ══ 4. Cabecera, migas y estados ══════════════════════════════════════ */

describe('cabecera y estados', () => {
  it('el titular dice lo que se está viendo', async () => {
    montar('/tienda?animal=perro&category=alimentacion-seca');
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Alimentación seca para perros');
  });

  it('hay exactamente un H1', async () => {
    montar();
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('las migas marcan dónde se está y no se enlazan a sí mismas', async () => {
    montar('/tienda?animal=perro');
    await screen.findByRole('heading', { level: 1 });
    const migas = screen.getByRole('navigation', { name: /migas/i });
    const actual = within(migas).getByText('Perros');
    expect(actual).toHaveAttribute('aria-current', 'page');
    expect(actual.tagName).not.toBe('A');
  });

  it('se dice cuántos productos hay', async () => {
    montar();
    expect(await screen.findByText('2 productos')).toBeInTheDocument();
  });

  it('con uno solo, en singular', async () => {
    montar('/tienda', { items: [producto()], total: 1 });
    expect(await screen.findByText('1 producto')).toBeInTheDocument();
  });

  it('sin resultados se explica y se ofrece salida', async () => {
    montar('/tienda?animal=perro', { items: [], total: 0 });
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByText(/no hay productos con estos filtros/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /quitar los filtros/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver todo el catálogo/i })).toHaveAttribute('href', '/tienda');
  });

  it('una búsqueda sin resultados sugiere por dónde ir', async () => {
    montar('/tienda?q=zzzz', { items: [], total: 0 });
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByText(/no hay resultados para «zzzz»/i)).toBeInTheDocument();
    expect(screen.getByText(/marca, el tipo de producto o para qué animal/i)).toBeInTheDocument();
  });
});

/* ══ 5. Ordenación ═════════════════════════════════════════════════════ */

describe('ordenación', () => {
  it('el desplegable tiene nombre accesible', async () => {
    montar();
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getAllByRole('combobox', { name: /ordenar los productos/i }).length).toBeGreaterThan(0);
  });

  it('cambiar el orden se lo pide al servidor', async () => {
    const user = userEvent.setup();
    montar();
    await screen.findByRole('heading', { level: 1 });
    await user.selectOptions(screen.getAllByRole('combobox', { name: /ordenar/i })[0]!, 'price_asc');
    expect(vi.mocked(api.products).mock.calls.at(-1)![0]).toMatchObject({ sort: 'price_asc' });
  });

  it('un orden inventado en la URL no llega al servidor', async () => {
    montar('/tienda?sort=DROP');
    await screen.findByRole('heading', { level: 1 });
    expect(vi.mocked(api.products).mock.calls[0]![0]).toMatchObject({ sort: 'relevance' });
  });
});

/* ══ 6. El cajón del móvil ═════════════════════════════════════════════ */

describe('filtros en móvil', () => {
  it('se abre como diálogo con nombre, y Escape lo cierra', async () => {
    const user = userEvent.setup();
    montar();
    await screen.findByRole('heading', { level: 1 });

    await user.click(screen.getByRole('button', { name: /^filtrar$/i }));
    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveAccessibleName(/filtros del catálogo/i);
    expect(dialogo).toHaveAttribute('aria-modal', 'true');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('el botón dice cuántos filtros hay puestos', async () => {
    // Pegado al texto se leía «Filtrar1», que no significa nada en voz alta.
    montar('/tienda?animal=perro&brand=ownat');
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByRole('button', { name: /filtrar\. 2 filtros puestos/i })).toBeInTheDocument();
  });

  it('el cajón lleva el recuento de lo que se va a ver, y limpiar', async () => {
    const user = userEvent.setup();
    montar('/tienda?animal=perro');
    await screen.findByRole('heading', { level: 1 });
    await user.click(screen.getByRole('button', { name: /filtrar/i }));
    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByRole('button', { name: /ver 2 productos/i })).toBeInTheDocument();
    expect(within(dialogo).getByRole('button', { name: /limpiar/i })).toBeEnabled();
  });
});
