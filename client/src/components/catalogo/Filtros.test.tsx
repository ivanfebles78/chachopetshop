/**
 * EL FILTRO «TIPO DE PRODUCTO» VA AGRUPADO.
 *
 * Arriba el grupo (Alimentación, Suplementos y cosmética, Accesorios…); el
 * detalle sólo aparece al abrirlo. El grupo «Accesorios» es especial: lo que
 * cuelga de él son las LÍNEAS de accesorio (jaulas, camas…), no una
 * subcategoría «Accesorios» dentro de «Accesorios».
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Filtros } from './Filtros';
import type { Facetas } from '@/lib/types';
import type { ProductFilters } from '@/lib/api';

const FACETAS: Facetas = {
  animals: [
    { slug: 'perro', nombre: 'Perros', total: 50 },
    { slug: 'gato', nombre: 'Gatos', total: 40 },
  ],
  categories: [
    { slug: 'alimentacion-seca', nombre: 'Alimentación seca', total: 30 },
    { slug: 'alimentacion-humeda', nombre: 'Alimentación húmeda', total: 20 },
    { slug: 'higiene-y-cosmetica', nombre: 'Suplementos y cosmética', total: 10 },
    { slug: 'accesorios', nombre: 'Accesorios', total: 268 },
  ],
  needs: [],
  brands: [
    { slug: 'gamarq', nombre: 'Gamarq', total: 208 },
    { slug: 'nobleza', nombre: 'Nobleza', total: 49 },
  ],
  lines: [
    { slug: 'Camas, almohadas y cojines', nombre: 'Camas, almohadas y cojines', total: 211 },
    { slug: 'Jaulas y transportines', nombre: 'Jaulas y transportines', total: 22 },
    { slug: 'Toallitas', nombre: 'Toallitas', total: 7 },
  ],
  sizes: [],
  ofertas: 0,
  precio: { min: 5, max: 60 },
  marcasEnResultado: 2,
};

const montar = (filtros: ProductFilters = {}) => {
  const poner = vi.fn();
  const alternar = vi.fn();
  render(<Filtros facetas={FACETAS} filtros={filtros} poner={poner} alternar={alternar} />);
  return { poner, alternar };
};

beforeEach(() => vi.clearAllMocks());

describe('«Tipo de producto» agrupado', () => {
  it('arriba se ven los grupos, no las categorías sueltas', () => {
    montar();
    expect(screen.getByRole('button', { name: /^Alimentación/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Suplementos y cosmética/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Accesorios/i })).toBeInTheDocument();
  });

  it('las subcategorías NO se ven hasta abrir su grupo', async () => {
    montar();
    // El detalle del grupo está plegado: su casilla no está en el árbol accesible.
    expect(screen.queryByRole('checkbox', { name: /Alimentación seca/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Alimentación/i }));
    expect(screen.getByRole('checkbox', { name: /Alimentación seca/i })).toBeInTheDocument();
  });

  it('una subcategoría de comida filtra por categoría', async () => {
    const { alternar } = montar();
    await userEvent.click(screen.getByRole('button', { name: /^Alimentación/i }));
    await userEvent.click(screen.getByRole('checkbox', { name: /Alimentación seca/i }));
    expect(alternar).toHaveBeenCalledWith('category', 'alimentacion-seca');
  });

  it('el grupo «Accesorios» despliega las LÍNEAS, y filtran por línea', async () => {
    const { alternar } = montar();
    // Antes de abrir, las líneas de accesorio no se ven.
    expect(screen.queryByRole('checkbox', { name: /Jaulas y transportines/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Accesorios/i }));
    const jaulas = screen.getByRole('checkbox', { name: /Jaulas y transportines/i });
    expect(jaulas).toBeInTheDocument();
    await userEvent.click(jaulas);
    expect(alternar).toHaveBeenCalledWith('line', 'Jaulas y transportines');
  });

  it('en la categoría accesorios, el grupo viene abierto con sus líneas', () => {
    montar({ category: ['accesorios'] });
    // Activo -> abierto por defecto: la línea se ve sin tener que desplegar.
    expect(screen.getByRole('checkbox', { name: /Camas, almohadas y cojines/i })).toBeInTheDocument();
  });

  it('las líneas de accesorio NO aparecen en el grupo «Línea» de marca', () => {
    // Con marca elegida pero sólo líneas de accesorio disponibles, el grupo
    // «Línea» (de marca) no se pinta: esas líneas ya cuelgan de «Accesorios».
    montar({ brand: ['nobleza'] });
    expect(screen.queryByRole('button', { name: /^Línea$/i })).not.toBeInTheDocument();
  });
});
