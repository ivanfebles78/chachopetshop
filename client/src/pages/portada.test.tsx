/**
 * CONTRATO DE LA PORTADA.
 *
 * Lo que se comprueba aquí es lo que la portada le PROMETE al cliente: que los
 * sitios a los que invita existen, que los precios y las rebajas que anuncia
 * salen de los datos, y que no afirma nada que nadie pueda sostener.
 *
 * Casi ninguno de estos fallos se ve mirando la pantalla: una portada con seis
 * botones bonitos parece correcta aunque uno lleve a cero productos y otro
 * prometa un descuento que no existe.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { HomePage } from './HomePage';
import { _resetCacheCatalogo } from '@/lib/useCatalogo';

vi.mock('@/lib/api', () => ({ api: { taxonomy: vi.fn(), products: vi.fn() } }));
vi.mock('@/store/auth', () => ({ useAuth: () => ({ user: null, loading: false }) }));

import { api } from '@/lib/api';

const animal = (slug: string, name: string) => ({ id: slug, slug, name, emoji: null, sortOrder: 0 });
const categoria = (slug: string, name: string) => ({ id: slug, slug, name, type: 'DRY_FOOD', sortOrder: 0 });
const marca = (slug: string, name: string) => ({ id: slug, slug, name, logoUrl: null, featured: true });

const TAX = {
  animals: [animal('perro', 'Perros'), animal('gato', 'Gatos'), animal('reptil', 'Reptiles')],
  categories: [categoria('alimentacion-seca', 'Alimentación seca'), categoria('semihumeda', 'Semihúmeda')],
  needs: [],
  brands: [marca('ownat', 'Ownat')],
};

let n = 0;
const producto = (o: Record<string, unknown> = {}) => {
  n += 1;
  return {
    id: `p${n}`, name: `Pienso ${n}`, slug: `pienso-${n}`, description: '',
    brand: marca('ownat', 'Ownat'), brandId: 'ownat',
    price: 20, compareAt: null, image: '', gallery: [],
    featured: false, bestseller: false,
    animals: [animal('perro', 'Perros')], categories: [categoria('alimentacion-seca', 'Alimentación seca')],
    needs: [], variants: [], ...o,
  };
};

const montar = (productos: unknown[]) => {
  vi.mocked(api.taxonomy).mockResolvedValue(TAX as never);
  vi.mocked(api.products).mockResolvedValue(
    { items: productos, page: 1, pageSize: 48, total: productos.length, totalPages: 1 } as never,
  );
  return render(<MemoryRouter><HomePage /></MemoryRouter>);
};

/** Cinco de perro: suficiente para que Perros sea protagonista. */
const CATALOGO = Array.from({ length: 5 }, () => producto());

beforeEach(() => _resetCacheCatalogo());
afterEach(() => vi.clearAllMocks());

/* ══ 1. La portada sale del catálogo ═══════════════════════════════════ */

describe('la portada se pinta con el catálogo real', () => {
  it('enseña las mascotas que tienen producto, con su recuento', async () => {
    montar(CATALOGO);
    // Acotado a su sección: «Perros» también aparece como segunda llamada del
    // hero, y son dos enlaces distintos al mismo sitio a propósito.
    const region = await screen.findByRole('region', { name: /para quién compras/i });
    expect(within(region).getByRole('link', { name: /perros/i })).toBeInTheDocument();
    expect(within(region).getByText(/5 productos/i)).toBeInTheDocument();
  });

  it('no enseña ninguna faceta vacía', async () => {
    // `reptil` y `semihumeda` están en la taxonomía y no tienen ni un producto.
    montar(CATALOGO);
    await screen.findByRole('link', { name: /ver toda la tienda/i });
    expect(screen.queryByText(/reptiles/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/semihúmeda/i)).not.toBeInTheDocument();
  });

  it('con el catálogo vacío no inventa secciones', async () => {
    montar([]);
    // Espera a que termine de cargar: el titular está siempre.
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByText(/para quién compras/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/qué estás buscando/i)).not.toBeInTheDocument();
  });
});

/* ══ 2. Los destinos existen ═══════════════════════════════════════════ */

describe('todo lo que se puede pulsar lleva a algún sitio', () => {
  it('la llamada principal lleva al catálogo', async () => {
    montar(CATALOGO);
    const cta = await screen.findByRole('link', { name: /ver toda la tienda/i });
    expect(cta).toHaveAttribute('href', '/tienda');
  });

  it('la segunda llamada lleva a la mascota con más catálogo', async () => {
    montar(CATALOGO);
    const cta = await screen.findByRole('link', { name: /todo para perros/i });
    expect(cta).toHaveAttribute('href', '/tienda?animal=perro');
  });

  it('cada producto enlaza a su ficha', async () => {
    montar([...CATALOGO, producto({ featured: true, slug: 'destacado-1' })]);
    const enlaces = await screen.findAllByRole('link', { name: /pienso/i });
    for (const a of enlaces) expect(a.getAttribute('href')).toMatch(/^\/producto\/[a-z0-9-]+$/);
  });

  it('ningún enlace se queda sin nombre accesible', async () => {
    montar([...CATALOGO, producto({ featured: true })]);
    await screen.findByRole('link', { name: /ver toda la tienda/i });
    for (const a of screen.getAllByRole('link')) {
      expect(a).toHaveAccessibleName();
      expect(a.getAttribute('href')).toBeTruthy();
      expect(a.getAttribute('href')).not.toBe('#');
    }
  });
});

/* ══ 3. Ofertas ════════════════════════════════════════════════════════ */

describe('la sección de ofertas', () => {
  it('NO EXISTE si no hay ningún producto rebajado', async () => {
    /*
     * No es que salga vacía: es que no se pinta. Una sección comercial sin
     * nada dentro cuesta más de lo que vale, y rellenarla con destacados sería
     * mentir sobre el precio.
     */
    montar(CATALOGO);
    await screen.findByRole('link', { name: /ver toda la tienda/i });
    expect(screen.queryByRole('heading', { name: /ofertas/i })).not.toBeInTheDocument();
  });

  it('aparece en cuanto hay una rebaja de verdad, con el ahorro real', async () => {
    montar([...CATALOGO, producto({ price: 15, compareAt: 20, slug: 'rebajado' })]);
    const titulo = await screen.findByRole('heading', { name: /ofertas/i });
    expect(titulo).toHaveTextContent('-25%');
  });

  it('un `compareAt` menor o igual que el precio no es una oferta', async () => {
    montar([...CATALOGO, producto({ price: 20, compareAt: 20 }), producto({ price: 20, compareAt: 10 })]);
    await screen.findByRole('link', { name: /ver toda la tienda/i });
    expect(screen.queryByRole('heading', { name: /ofertas/i })).not.toBeInTheDocument();
  });
});

/* ══ 4. Nada sin respaldo ══════════════════════════════════════════════ */

describe('la portada no afirma lo que no puede sostener', () => {
  it('no dice «top ventas» de nada', async () => {
    /*
     * `bestseller` se pone a mano y no lo sostiene ningún dato de ventas: en
     * los pedidos pagados, los marcados suman MENOS unidades que el resto.
     */
    montar([...CATALOGO, producto({ featured: true, bestseller: true })]);
    await screen.findByRole('link', { name: /ver toda la tienda/i });
    expect(screen.queryByText(/top ventas/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/lo más vendido/i)).not.toBeInTheDocument();
  });

  it('no publica ninguna valoración ni número de opiniones', async () => {
    montar([...CATALOGO, producto({ featured: true })]);
    await screen.findByRole('link', { name: /ver toda la tienda/i });
    expect(document.body.textContent).not.toMatch(/valoración|estrellas|opiniones/i);
  });

  it('no hay boletín ni descuentos de bienvenida', async () => {
    // Había un formulario que ofrecía «un 10 % en tu primer pedido» y cuyo
    // `onSubmit` era `preventDefault()`: el correo se tiraba en silencio.
    montar(CATALOGO);
    await screen.findByRole('link', { name: /ver toda la tienda/i });
    expect(screen.queryByRole('button', { name: /suscrib/i })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/primer pedido|%\s*de descuento/i);
  });

  it('el contacto es el real y sale del módulo de empresa', async () => {
    montar(CATALOGO);
    const correo = await screen.findByRole('link', { name: /chachopetshop@gmail\.com/i });
    expect(correo).toHaveAttribute('href', 'mailto:chachopetshop@gmail.com');
    expect(screen.getByRole('link', { name: /628 013 933/ })).toHaveAttribute('href', 'tel:+34628013933');
    expect(document.body.textContent).not.toMatch(/922\s*00\s*00\s*00/);
  });
});

/* ══ 5. Estructura e imágenes ══════════════════════════════════════════ */

describe('estructura y carga de imágenes', () => {
  it('hay exactamente un H1', async () => {
    montar(CATALOGO);
    await screen.findByRole('link', { name: /ver toda la tienda/i });
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('la imagen del hero se prioriza y las demás se aplazan', async () => {
    /*
     * La del hero es el elemento más grande de la primera pantalla —lo que el
     * navegador mide como LCP—, así que baja cuanto antes. Las de más abajo,
     * `lazy`, para no competir con ella.
     */
    const { container } = montar([...CATALOGO, producto({ featured: true })]);
    await screen.findByRole('link', { name: /ver toda la tienda/i });

    const imagenes = [...container.querySelectorAll('img')];
    const hero = imagenes[0]!;
    expect(hero.getAttribute('fetchpriority')).toBe('high');
    expect(hero.hasAttribute('loading')).toBe(false);
    for (const img of imagenes.slice(1)) expect(img.getAttribute('loading')).toBe('lazy');
  });

  it('todas las imágenes reservan su sitio, para que nada salte al cargar', async () => {
    const { container } = montar([...CATALOGO, producto({ featured: true })]);
    await screen.findByRole('link', { name: /ver toda la tienda/i });
    for (const img of container.querySelectorAll('img')) {
      expect(img.getAttribute('width'), img.getAttribute('src') ?? '').toBeTruthy();
      expect(img.getAttribute('height'), img.getAttribute('src') ?? '').toBeTruthy();
    }
  });

  it('las fotos decorativas no se anuncian; la del hero sí describe qué hay', async () => {
    const { container } = montar(CATALOGO);
    await screen.findByRole('link', { name: /ver toda la tienda/i });
    const imagenes = [...container.querySelectorAll('img')];
    expect(imagenes[0]!.getAttribute('alt')).toMatch(/perro|gato/i);
    // Los recortes de los bloques de mascota repiten la misma foto: el nombre
    // ya lo lleva el enlace, así que anunciarla otra vez sólo estorba.
    for (const img of imagenes.slice(1)) {
      if (img.getAttribute('src')?.includes('banner')) expect(img.getAttribute('alt')).toBe('');
    }
  });

  it('las secciones se anuncian por su título', async () => {
    montar([...CATALOGO, producto({ featured: true })]);
    await screen.findByRole('link', { name: /ver toda la tienda/i });
    const region = screen.getByRole('region', { name: /para quién compras/i });
    expect(within(region).getByRole('link', { name: /perros/i })).toBeInTheDocument();
  });
});
