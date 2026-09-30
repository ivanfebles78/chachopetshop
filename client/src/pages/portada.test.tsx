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
    needs: [],
    // Con existencias: «La selección de Chacho» sólo enseña lo que se puede comprar.
    variants: [{ id: `v${n}`, label: '3 kg', price: 20, sku: `sku${n}`, stock: 5 }],
    ...o,
  };
};

const montar = (productos: unknown[]) => {
  vi.mocked(api.taxonomy).mockResolvedValue(TAX as never);
  // La portada consume las FACETAS del servidor para sus recuentos, así que el
  // mock las devuelve calculadas de los productos (como haría el servidor).
  const cuenta = (lista: { slug: string; name: string }[], clave: 'animals' | 'categories') =>
    lista.map((x) => ({
      slug: x.slug,
      nombre: x.name,
      total: (productos as { animals?: { slug: string }[]; categories?: { slug: string }[] }[]).filter(
        (p) => (p[clave] ?? []).some((f) => f.slug === x.slug),
      ).length,
    }));
  const facets = {
    animals: cuenta(TAX.animals, 'animals'),
    categories: cuenta(TAX.categories, 'categories'),
    needs: [],
    brands: [],
    sizes: [],
    ofertas: 0,
    precio: null,
  };
  // La portada hace DOS tipos de petición: una sin filtros (con `facets`, para el
  // menú y los recuentos) y otras filtradas por animal/categoría (para «La
  // selección de Chacho»). El mock responde a cada una como el servidor.
  vi.mocked(api.products).mockImplementation((f?: { animal?: string; category?: string[]; facets?: boolean }) => {
    const lista = (productos as { animals?: { slug: string }[]; categories?: { slug: string }[] }[]).filter(
      (p) =>
        (!f?.animal || (p.animals ?? []).some((a) => a.slug === f.animal)) &&
        (!f?.category?.length || (p.categories ?? []).some((c) => f.category!.includes(c.slug))),
    );
    return Promise.resolve({
      items: lista,
      page: 1,
      pageSize: 48,
      total: lista.length,
      totalPages: 1,
      ...(f?.facets ? { facets } : {}),
    } as never);
  });
  return render(<MemoryRouter><HomePage /></MemoryRouter>);
};

/** Cinco de perro: suficiente para que Perros sea protagonista. */
const CATALOGO = Array.from({ length: 5 }, () => producto());

beforeEach(() => _resetCacheCatalogo());
afterEach(() => vi.clearAllMocks());

/* ══ 1. La portada sale del catálogo ═══════════════════════════════════ */

describe('la portada se pinta con el catálogo real', () => {
  it('enseña las mascotas que tienen producto, sin contadores', async () => {
    montar(CATALOGO);
    // Acotado a su sección: «Perros» también aparece como segunda llamada del
    // hero, y son dos enlaces distintos al mismo sitio a propósito.
    const region = await screen.findByRole('region', { name: /para quién compras/i });
    const perros = within(region).getByRole('link', { name: /perros/i });
    expect(perros).toHaveAttribute('href', '/tienda?animal=perro');
    // El rediseño quita los contadores de esta sección.
    expect(within(region).queryByText(/\d+\s*productos/i)).not.toBeInTheDocument();
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

  it('cada producto de la selección enlaza a su ficha', async () => {
    montar([...CATALOGO, producto({ slug: 'destacado-1' })]);
    const region = await screen.findByRole('region', { name: /la selección de chacho/i });
    const fichas = within(region)
      .getAllByRole('link')
      .filter((a) => (a.getAttribute('href') ?? '').startsWith('/producto/'));
    expect(fichas.length).toBeGreaterThan(0);
    for (const a of fichas) expect(a.getAttribute('href')).toMatch(/^\/producto\/[a-z0-9-]+$/);
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

/* ══ 3. Selección y ofertas ════════════════════════════════════════════ */

describe('la selección y las ofertas', () => {
  it('«La selección de Chacho» enseña productos reales con enlace a su ficha', async () => {
    montar(CATALOGO);
    const region = await screen.findByRole('region', { name: /la selección de chacho/i });
    const enlaces = within(region).getAllByRole('link');
    expect(enlaces.length).toBeGreaterThan(0);
    for (const a of enlaces) {
      const href = a.getAttribute('href') ?? '';
      // Cada tarjeta lleva a una ficha real (o el enlace de cabecera de la sección).
      expect(href === '/tienda?category=alimentacion-seca' || /^\/producto\/[a-z0-9-]+$/.test(href)).toBe(true);
    }
  });

  it('el rediseño no incluye una sección de ofertas en la portada', async () => {
    // Los productos del catálogo entran sin precio anterior, así que no hay
    // ofertas que anunciar; la portada no finge una sección de rebajas.
    montar([...CATALOGO, producto({ price: 15, compareAt: 20, slug: 'rebajado' })]);
    await screen.findByRole('link', { name: /ver toda la tienda/i });
    expect(screen.queryByRole('heading', { name: /^ofertas/i })).not.toBeInTheDocument();
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
    // WhatsApp por delante, con el número real; y llamar como alternativa.
    const whatsapp = await screen.findByRole('link', { name: /consultar por whatsapp/i });
    expect(whatsapp.getAttribute('href')).toMatch(/wa\.me\/34689732267/);
    expect(screen.getByRole('link', { name: /689 73 22 67/ })).toHaveAttribute('href', 'tel:+34689732267');
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
