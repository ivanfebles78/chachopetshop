/**
 * GESTIÓN DE PRODUCTOS DEL PANEL.
 *
 * Lo que importa: que la tabla enseñe animal/categoría/línea/SKU, que la
 * búsqueda filtre, y que editar mande el PATCH con los campos cambiados.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { ProductosPanel } from './ProductosPanel';
import type { AdminProductsResponse, Taxonomy } from '@/lib/types';

vi.mock('@/lib/api', () => ({
  api: { taxonomy: vi.fn(), adminUpdateProduct: vi.fn(), adminDeleteProduct: vi.fn() },
}));
vi.mock('@/store/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { api } from '@/lib/api';

const TAXONOMIA: Taxonomy = {
  animals: [
    { id: 'a1', slug: 'perro', name: 'Perros' },
    { id: 'a2', slug: 'gato', name: 'Gatos' },
  ] as never,
  categories: [
    { id: 'c1', slug: 'accesorios', name: 'Accesorios' },
    { id: 'c2', slug: 'alimentacion-seca', name: 'Alimentación seca' },
  ] as never,
  needs: [],
  brands: [
    { id: 'b1', name: 'Nobleza', slug: 'nobleza' },
    { id: 'b2', name: 'Gamarq', slug: 'gamarq' },
  ] as never,
};

const DATA: AdminProductsResponse = {
  lineas: ['Descanso', 'Jaulas y transportines'],
  products: [
    {
      id: 'p1', name: 'Nobleza Jaula de Alambre', slug: 'nobleza-jaula', description: 'Una jaula',
      image: '/productos/accesorios/x.webp', price: 46.8, active: true, line: 'Jaulas y transportines',
      brand: { id: 'b1', name: 'Nobleza', slug: 'nobleza' },
      animals: [{ id: 'a1', slug: 'perro', name: 'Perros' }],
      categories: [{ id: 'c1', slug: 'accesorios', name: 'Accesorios' }],
      needs: [],
      variants: [{ id: 'v1', sku: '8719138198733', price: 46.8, stock: 0, label: 'L' }],
    },
    {
      id: 'p2', name: 'Gamarq Colchón', slug: 'gamarq-colchon', description: 'Un colchón',
      image: '/productos/accesorios/y.webp', price: 20, active: true, line: 'Descanso',
      brand: { id: 'b2', name: 'Gamarq', slug: 'gamarq' },
      animals: [{ id: 'a1', slug: 'perro', name: 'Perros' }, { id: 'a2', slug: 'gato', name: 'Gatos' }],
      categories: [{ id: 'c1', slug: 'accesorios', name: 'Accesorios' }],
      needs: [],
      variants: [{ id: 'v2', sku: '8022967045711', price: 20, stock: 0, label: 'Nº2' }],
    },
  ],
};

const montar = () => {
  vi.mocked(api.taxonomy).mockResolvedValue(TAXONOMIA);
  vi.mocked(api.adminUpdateProduct).mockResolvedValue({ product: {} as never });
  const onChanged = vi.fn();
  render(
    <MemoryRouter>
      <ProductosPanel data={DATA} onChanged={onChanged} />
    </MemoryRouter>,
  );
  return { onChanged };
};

beforeEach(() => vi.clearAllMocks());

describe('ProductosPanel', () => {
  it('la tabla enseña nombre, animal, categoría, línea y SKU', async () => {
    montar();
    const fila = (await screen.findByText('Nobleza Jaula de Alambre')).closest('tr')!;
    expect(within(fila).getByText('Perros')).toBeInTheDocument();
    expect(within(fila).getByText('Accesorios')).toBeInTheDocument();
    expect(within(fila).getByText('Jaulas y transportines')).toBeInTheDocument();
    expect(within(fila).getByText('8719138198733')).toBeInTheDocument();
  });

  it('la búsqueda filtra por nombre o SKU', async () => {
    const user = userEvent.setup();
    montar();
    await screen.findByText('Nobleza Jaula de Alambre');
    await user.type(screen.getByPlaceholderText(/Buscar/i), 'Gamarq');
    expect(screen.queryByText('Nobleza Jaula de Alambre')).not.toBeInTheDocument();
    expect(screen.getByText('Gamarq Colchón')).toBeInTheDocument();
  });

  it('editar manda el PATCH con los campos cambiados', async () => {
    const user = userEvent.setup();
    const { onChanged } = montar();
    await screen.findByText('Nobleza Jaula de Alambre');

    await user.click(screen.getByRole('button', { name: /Editar Nobleza Jaula de Alambre/i }));
    const dialogo = await screen.findByRole('dialog');

    // Cambiar la línea y el precio.
    const linea = within(dialogo).getByDisplayValue('Jaulas y transportines');
    await user.clear(linea);
    await user.type(linea, 'Descanso');

    await user.click(within(dialogo).getByRole('button', { name: /Guardar cambios/i }));

    expect(api.adminUpdateProduct).toHaveBeenCalledTimes(1);
    const [id, patch] = vi.mocked(api.adminUpdateProduct).mock.calls[0]!;
    expect(id).toBe('p1');
    expect(patch).toMatchObject({ line: 'Descanso', name: 'Nobleza Jaula de Alambre' });
    expect(onChanged).toHaveBeenCalled();
  });
});
