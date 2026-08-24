/**
 * CÓMO SE PINTA LA MERCANCÍA.
 *
 * Dos cosas que no se ven en una prueba de lógica y que son justo las que
 * hacen que un catálogo parezca real o parezca un prototipo:
 *
 *   1. Que el envase se vea ENTERO. Recortar la foto de un saco para llenar un
 *      cuadrado se lleva por delante la etiqueta, que es por donde alguien
 *      reconoce lo que compra.
 *   2. Que la galería no fabrique vistas que no existen. Tres URL de archivo
 *      aleatorias pintadas como galería dan tres miniaturas y la sensación de
 *      tres fotos del mismo artículo — cuando son tres paisajes sin relación.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/store/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ProductCard } from './ProductCard';
import { Galeria } from './producto/Galeria';

const PICSUM = 'https://picsum.photos/seed/nutripet-orijen/800/800';
const REAL = 'https://cdn.chachopetshop.com/orijen-original.webp';

const producto = (extra: Record<string, unknown> = {}) =>
  ({
    id: 'p1',
    slug: 'orijen-original-perro',
    name: 'Orijen Original Dog',
    description: '',
    price: 34.5,
    compareAt: null,
    image: PICSUM,
    gallery: [],
    featured: false,
    bestseller: false,
    brand: { id: 'b1', name: 'Orijen', slug: 'orijen' },
    categories: [{ id: 'c1', name: 'Alimentación seca', slug: 'alimentacion-seca', type: 'DRY_FOOD' }],
    animals: [{ id: 'a1', name: 'Perros', slug: 'perro' }],
    needs: [],
    variants: [{ id: 'v1', label: '2 kg', price: 34.5, stock: 10, sku: 'X' }],
    ...extra,
  }) as never;

const pintarTarjeta = (p = producto()) =>
  render(
    <MemoryRouter>
      <ProductCard product={p} />
    </MemoryRouter>,
  );

/* ══ 1. La tarjeta ═══════════════════════════════════════════════════════ */

describe('la tarjeta de producto', () => {
  it('CONTIENE el envase, no lo recorta', () => {
    /*
     * `object-cover` llena el cuadrado recortando lo que sobra. Para un paisaje
     * da igual; para el envase de un producto corta la etiqueta y la forma del
     * saco, que es justo lo que se mira.
     */
    const { container } = pintarTarjeta(producto({ image: REAL }));
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img!.className).toContain('object-contain');
    expect(img!.className).not.toContain('object-cover');
  });

  it('sin foto real, dibuja la ilustración de su categoría', () => {
    pintarTarjeta();
    expect(screen.getByRole('img', { name: /saco de pienso/i })).toBeInTheDocument();
  });

  it('y NO presenta la ilustración como una foto del producto', () => {
    pintarTarjeta();
    // El nombre está en el enlace, no colgado del dibujo.
    expect(screen.queryByRole('img', { name: /Orijen Original Dog/i })).toBeNull();
    expect(screen.getByRole('link', { name: /Orijen Original Dog/i })).toBeInTheDocument();
  });

  it('con foto real la usa, y la describe con el nombre', () => {
    pintarTarjeta(producto({ image: REAL }));
    const img = screen.getByRole('img', { name: 'Orijen Original Dog' });
    expect(img).toHaveAttribute('src', REAL);
  });

  it('la ilustración no cuesta una petición de red', () => {
    // Va en línea: no hay `<img src>` que descargar por tarjeta.
    const { container } = pintarTarjeta();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});

/* ══ 2. La galería ═══════════════════════════════════════════════════════ */

describe('la galería de la ficha', () => {
  it('NO fabrica miniaturas con fotos de archivo', () => {
    /*
     * Con tres URL aleatorias, la galería antigua pintaba tres miniaturas: la
     * ficha decía «aquí tienes tres vistas de este producto» y eran tres
     * paisajes distintos.
     */
    render(
      <Galeria
        imagenes={[PICSUM, PICSUM + '2', PICSUM + '3']}
        nombre="Orijen Original Dog"
        tipoArte="DRY_FOOD"
      />,
    );
    expect(screen.queryByRole('button', { name: /ver la imagen/i })).toBeNull();
    expect(screen.getByRole('img', { name: /saco de pienso/i })).toBeInTheDocument();
  });

  it('con UNA foto real, la enseña sin miniaturas', () => {
    render(<Galeria imagenes={[REAL]} nombre="Orijen Original Dog" tipoArte="DRY_FOOD" />);
    expect(screen.queryByRole('button', { name: /ver la imagen/i })).toBeNull();
    expect(screen.getByRole('img', { name: 'Orijen Original Dog' })).toBeInTheDocument();
  });

  it('con VARIAS fotos reales, sí hay miniaturas', () => {
    // La galería está montada para que las fotos de verdad entren solas.
    render(
      <Galeria
        imagenes={[REAL, 'https://cdn.chachopetshop.com/orijen-2.webp']}
        nombre="Orijen Original Dog"
        tipoArte="DRY_FOOD"
      />,
    );
    expect(screen.getAllByRole('button', { name: /ver la imagen/i })).toHaveLength(2);
  });

  it('mezcla: sólo cuentan las fotos reales', () => {
    render(
      <Galeria imagenes={[PICSUM, REAL]} nombre="Orijen Original Dog" tipoArte="DRY_FOOD" />,
    );
    // Una sola foto de verdad: ninguna miniatura, y la que se ve es la buena.
    expect(screen.queryByRole('button', { name: /ver la imagen/i })).toBeNull();
    expect(screen.getByRole('img', { name: 'Orijen Original Dog' })).toHaveAttribute('src', REAL);
  });

  it('la foto grande también contiene el envase', () => {
    const { container } = render(
      <Galeria imagenes={[REAL]} nombre="Orijen Original Dog" tipoArte="DRY_FOOD" />,
    );
    const img = container.querySelector('img');
    expect(img!.className).toContain('object-contain');
  });
});
