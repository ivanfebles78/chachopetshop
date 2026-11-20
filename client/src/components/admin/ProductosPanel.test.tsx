/**
 * GESTIÓN DE PRODUCTOS DEL PANEL.
 *
 * Lo que importa: que la tabla enseñe los datos principales (EAN, marca,
 * familia, categoría e indicador de foto), que los filtros (nombre/SKU, EAN,
 * familia, imagen) acoten, que editar mande el PATCH con los campos cambiados
 * —incluidos EAN y familia—, y que se pueda crear una marca al vuelo.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { ProductosPanel } from './ProductosPanel';
import type { AdminProductsResponse, Taxonomy } from '@/lib/types';

vi.mock('@/lib/api', () => ({
  api: {
    taxonomy: vi.fn(),
    adminUpdateProduct: vi.fn(),
    adminDeleteProduct: vi.fn(),
    adminCreateBrand: vi.fn(),
  },
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
      ean: '8719138198733', familia: 'PAC',
      brand: { id: 'b1', name: 'Nobleza', slug: 'nobleza' },
      animals: [{ id: 'a1', slug: 'perro', name: 'Perros' }],
      categories: [{ id: 'c1', slug: 'accesorios', name: 'Accesorios' }],
      needs: [],
      variants: [{ id: 'v1', sku: '8719138198733', price: 46.8, stock: 0, label: 'L' }],
    },
    {
      id: 'p2', name: 'Gamarq Colchón', slug: 'gamarq-colchon', description: 'Un colchón',
      image: '/productos/accesorios/y.webp', price: 20, active: true, line: 'Descanso',
      ean: '8022967045711', familia: 'PEL',
      brand: { id: 'b2', name: 'Gamarq', slug: 'gamarq' },
      animals: [{ id: 'a1', slug: 'perro', name: 'Perros' }, { id: 'a2', slug: 'gato', name: 'Gatos' }],
      categories: [{ id: 'c1', slug: 'accesorios', name: 'Accesorios' }],
      needs: [],
      variants: [{ id: 'v2', sku: '8022967045711', price: 20, stock: 0, label: 'Nº2' }],
    },
    {
      // Llega de Factusol SIN foto (relleno picsum) y SIN marca: el caso que el
      // dueño quiere arreglar desde el panel.
      id: 'p3', name: 'Internutri Perro Adulto 20 kg', slug: 'internutri-perro-20', description: '',
      image: 'https://picsum.photos/seed/chacho-123/800/800', price: null, active: true, line: null,
      ean: '1234567890123', familia: 'PAS',
      brand: null,
      animals: [{ id: 'a1', slug: 'perro', name: 'Perros' }],
      categories: [{ id: 'c2', slug: 'alimentacion-seca', name: 'Alimentación seca' }],
      needs: [],
      variants: [{ id: 'v3', sku: 'FS-123', price: null, stock: 0, label: 'Único' }],
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

/** El `<select>` cuyo listado de opciones incluye `texto` (para no depender del orden). */
const selectConOpcion = (texto: string): HTMLSelectElement => {
  const sel = screen
    .getAllByRole('combobox')
    .find((s) => within(s).queryByRole('option', { name: texto })) as HTMLSelectElement | undefined;
  if (!sel) throw new Error(`No hay ningún <select> con la opción «${texto}»`);
  return sel;
};

beforeEach(() => vi.clearAllMocks());

describe('ProductosPanel', () => {
  it('la tabla enseña EAN, marca, familia, categoría e indicador de foto', async () => {
    montar();
    const fila = (await screen.findByText('Nobleza Jaula de Alambre')).closest('tr')!;
    expect(within(fila).getByText('8719138198733')).toBeInTheDocument();
    expect(within(fila).getByText('Nobleza')).toBeInTheDocument();
    expect(within(fila).getByText('PAC')).toBeInTheDocument();
    expect(within(fila).getByText('Accesorios')).toBeInTheDocument();
    expect(within(fila).getByText('Sí')).toBeInTheDocument();
  });

  it('marca «No» en la columna de imagen cuando sólo hay relleno', async () => {
    montar();
    const fila = (await screen.findByText('Internutri Perro Adulto 20 kg')).closest('tr')!;
    expect(within(fila).getByText('No')).toBeInTheDocument();
  });

  it('la búsqueda filtra por nombre o SKU', async () => {
    const user = userEvent.setup();
    montar();
    await screen.findByText('Nobleza Jaula de Alambre');
    await user.type(screen.getByPlaceholderText(/Buscar/i), 'Gamarq');
    expect(screen.queryByText('Nobleza Jaula de Alambre')).not.toBeInTheDocument();
    expect(screen.getByText('Gamarq Colchón')).toBeInTheDocument();
  });

  it('filtra por EAN', async () => {
    const user = userEvent.setup();
    montar();
    await screen.findByText('Nobleza Jaula de Alambre');
    await user.type(screen.getByPlaceholderText('EAN…'), '8022967');
    expect(screen.queryByText('Nobleza Jaula de Alambre')).not.toBeInTheDocument();
    expect(screen.getByText('Gamarq Colchón')).toBeInTheDocument();
  });

  it('filtra por familia', async () => {
    const user = userEvent.setup();
    montar();
    await screen.findByText('Nobleza Jaula de Alambre');
    await user.selectOptions(selectConOpcion('PAS'), 'PAS');
    expect(screen.getByText('Internutri Perro Adulto 20 kg')).toBeInTheDocument();
    expect(screen.queryByText('Nobleza Jaula de Alambre')).not.toBeInTheDocument();
    expect(screen.queryByText('Gamarq Colchón')).not.toBeInTheDocument();
  });

  it('filtra por «sin foto»', async () => {
    const user = userEvent.setup();
    montar();
    await screen.findByText('Nobleza Jaula de Alambre');
    await user.selectOptions(selectConOpcion('Sin foto'), 'sin');
    expect(screen.getByText('Internutri Perro Adulto 20 kg')).toBeInTheDocument();
    expect(screen.queryByText('Nobleza Jaula de Alambre')).not.toBeInTheDocument();
  });

  it('editar manda el PATCH con los campos cambiados, EAN y familia incluidos', async () => {
    const user = userEvent.setup();
    const { onChanged } = montar();
    await screen.findByText('Nobleza Jaula de Alambre');

    await user.click(screen.getByRole('button', { name: /Editar Nobleza Jaula de Alambre/i }));
    const dialogo = await screen.findByRole('dialog');

    const linea = within(dialogo).getByDisplayValue('Jaulas y transportines');
    await user.clear(linea);
    await user.type(linea, 'Descanso');

    await user.click(within(dialogo).getByRole('button', { name: /Guardar cambios/i }));

    expect(api.adminUpdateProduct).toHaveBeenCalledTimes(1);
    const [id, patch] = vi.mocked(api.adminUpdateProduct).mock.calls[0]!;
    expect(id).toBe('p1');
    expect(patch).toMatchObject({
      line: 'Descanso',
      name: 'Nobleza Jaula de Alambre',
      ean: '8719138198733',
      familia: 'PAC',
    });
    expect(onChanged).toHaveBeenCalled();
  });

  it('crear una marca al vuelo y asignarla al producto', async () => {
    const user = userEvent.setup();
    vi.mocked(api.adminCreateBrand).mockResolvedValue({
      brand: { id: 'bNew', name: 'Internutri', slug: 'internutri', logoUrl: null, featured: false },
      creada: true,
    });
    montar();
    await screen.findByText('Internutri Perro Adulto 20 kg');

    await user.click(screen.getByRole('button', { name: /Editar Internutri Perro Adulto 20 kg/i }));
    const dialogo = await screen.findByRole('dialog');

    // El desplegable de marca del editor incluye «Sin marca» y la opción de crear.
    const marcaSelect = within(dialogo)
      .getAllByRole('combobox')
      .find((s) => within(s).queryByRole('option', { name: /Crear marca nueva/i })) as HTMLSelectElement;
    await user.selectOptions(marcaSelect, '__nueva__');

    await user.type(within(dialogo).getByPlaceholderText(/Nueva marca/i), 'Internutri');
    await user.click(within(dialogo).getByRole('button', { name: /^Crear$/i }));

    expect(api.adminCreateBrand).toHaveBeenCalledWith('Internutri');

    await user.click(within(dialogo).getByRole('button', { name: /Guardar cambios/i }));
    const [, patch] = vi.mocked(api.adminUpdateProduct).mock.calls[0]!;
    expect(patch).toMatchObject({ brandId: 'bNew' });
  });
});
