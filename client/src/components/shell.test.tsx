/**
 * CONTRATO DEL SHELL.
 *
 * Los defectos que se corrigen aquí tienen algo en común: ninguno se ve mirando
 * la pantalla. La cabecera parecía correcta, y sin embargo el mega-menú no
 * existía para un lector de pantalla, no había forma de saltarse la navegación
 * con el teclado, el pie tenía dos enlaces que no llevaban a ninguna parte, y
 * había un teléfono inventado publicado en producción.
 *
 * Por eso son pruebas y no una revisión visual.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

/*
 * Algunas comprobaciones miran el CÓDIGO, no el DOM: que no quede un teléfono
 * inventado, que no vuelva `role="menu"`, que no se cuele un emoji de icono.
 * Se leen con `?raw`, la importación en crudo de Vite, en lugar de con `fs`:
 * así el cliente no necesita los tipos de Node sólo para poder probarse.
 */
import fuenteNavbar from './Navbar.tsx?raw';
import fuenteFooter from './Footer.tsx?raw';
import fuenteMobileNav from './MobileNav.tsx?raw';
import fuenteMenuPrincipal from './MenuPrincipal.tsx?raw';

/** El mismo texto sin comentarios: lo que se prohíbe es el código, no la nota. */
const sinComentarios = (fuente: string) =>
  fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const FUENTES_DEL_SHELL: [string, string][] = [
  ['Navbar.tsx', fuenteNavbar],
  ['Footer.tsx', fuenteFooter],
  ['MobileNav.tsx', fuenteMobileNav],
];
import { _resetCacheNavegacion } from '@/lib/useNavegacion';

/* ── Dobles: el shell no debe depender de la red para probarse ────────── */

vi.mock('@/lib/api', () => ({
  api: {
    taxonomy: vi.fn(),
    products: vi.fn(),
    // La cabecera pide el árbol del menú al servidor (`/api/taxonomy/menu`).
    menu: vi.fn(),
  },
}));

vi.mock('@/store/auth', () => ({ useAuth: () => ({ user: null, loading: false }) }));

import { api } from '@/lib/api';

const TAX = {
  animals: [
    { id: 'perro', slug: 'perro', name: 'Perros', emoji: null, sortOrder: 1 },
    { id: 'gato', slug: 'gato', name: 'Gatos', emoji: null, sortOrder: 2 },
  ],
  categories: [{ id: 'seca', slug: 'alimentacion-seca', name: 'Alimentación seca', type: 'DRY_FOOD', sortOrder: 1 }],
  needs: [{ id: 'dig', slug: 'digestivo', name: 'Digestivo sensible' }],
  brands: [{ id: 'ownat', slug: 'ownat', name: 'Ownat', logoUrl: null, featured: true }],
};

const PRODUCTO = {
  id: 'p1', name: 'Pienso', slug: 'pienso', description: '',
  brand: TAX.brands[0], brandId: 'ownat', price: 20, compareAt: null,
  image: '', gallery: [], featured: false, bestseller: false,
  animals: [TAX.animals[0]], categories: [TAX.categories[0]], needs: [TAX.needs[0]], variants: [],
};

/*
 * El árbol del menú tal como lo devuelve `/api/taxonomy/menu`: sólo Perros tiene
 * producto. Gatos NO está —el catálogo de prueba no tiene ninguno— y por eso no
 * debe aparecer en la cabecera.
 */
const MENU = {
  animales: [
    {
      slug: 'perro',
      nombre: 'Perros',
      total: 3,
      categorias: [
        {
          slug: 'alimentacion-seca',
          nombre: 'Alimentación seca',
          sortOrder: 1,
          total: 3,
          marcas: [
            // Con líneas: es un desplegable.
            { slug: 'atlanticpet', nombre: 'AtlanticPet', total: 2, lineas: [{ nombre: 'Grain Free', total: 2 }] },
            // Sin líneas: es un enlace directo.
            { slug: 'ownat', nombre: 'Ownat', total: 1, lineas: [] },
          ],
        },
        {
          slug: 'alimentacion-humeda',
          nombre: 'Alimentación húmeda',
          sortOrder: 2,
          total: 1,
          marcas: [{ slug: 'ownat', nombre: 'Ownat', total: 1, lineas: [] }],
        },
      ],
    },
  ],
};

beforeEach(() => {
  _resetCacheNavegacion();
  vi.mocked(api.taxonomy).mockResolvedValue(TAX as never);
  vi.mocked(api.products).mockResolvedValue({ items: [PRODUCTO], page: 1, pageSize: 48, total: 1, totalPages: 1 } as never);
  vi.mocked(api.menu).mockResolvedValue(MENU as never);
});

afterEach(() => vi.clearAllMocks());

const pintarCabecera = () => render(<MemoryRouter><Navbar /></MemoryRouter>);

/* ══ 1. Semántica del menú superior ════════════════════════════════════ */

const abrirSeccion = async (user: ReturnType<typeof userEvent.setup>, nombre: string) => {
  pintarCabecera();
  const boton = await screen.findByRole('button', { name: nombre });
  await user.hover(boton);
  return boton;
};

describe('el menú superior se anuncia y es navegable', () => {
  it('una sección con hijos es un botón que declara si está abierto', async () => {
    const user = userEvent.setup();
    pintarCabecera();
    const alim = await screen.findByRole('button', { name: 'Alimentación' });
    expect(alim).toHaveAttribute('aria-haspopup', 'true');
    expect(alim).toHaveAttribute('aria-expanded', 'false');

    await user.hover(alim);
    expect(alim).toHaveAttribute('aria-expanded', 'true');
  });

  it('al abrir Alimentación salen Perros, Gatos y Conejos', async () => {
    const user = userEvent.setup();
    await abrirSeccion(user, 'Alimentación');
    expect(screen.getByRole('link', { name: 'Perros' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Gatos' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Conejos' })).toBeInTheDocument();
  });

  it('Escape cierra el menú abierto', async () => {
    const user = userEvent.setup();
    const alim = await abrirSeccion(user, 'Alimentación');
    expect(alim).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');
    expect(alim).toHaveAttribute('aria-expanded', 'false');
  });

  it('las secciones son ENLACES, no un menú de aplicación (role=menu)', () => {
    for (const [nombre, fuente] of [
      ['Navbar.tsx', fuenteNavbar],
      ['MenuPrincipal.tsx', fuenteMenuPrincipal],
    ] as [string, string][]) {
      expect(sinComentarios(fuente), nombre).not.toMatch(/role=["']menu["']/);
      expect(sinComentarios(fuente), nombre).not.toMatch(/role=["']menuitem["']/);
    }
  });
});

/* ══ 2. La estructura fija del menú ═════════════════════════════════════ */

describe('el menú superior tiene las secciones fijas', () => {
  it('Antiparasitarios y Contacto son enlaces directos (sin desplegable)', async () => {
    pintarCabecera();
    const nav = await screen.findByRole('navigation', { name: 'Catálogo' });
    expect(within(nav).getByRole('link', { name: /antiparasitarios/i }).getAttribute('href')).toContain(
      'salud-y-antiparasitarios',
    );
    expect(within(nav).getByRole('link', { name: /contacto/i }).getAttribute('href')).toContain('/contacto');
    // No son desplegables: no hay botón con ese nombre.
    expect(within(nav).queryByRole('button', { name: /antiparasitarios/i })).not.toBeInTheDocument();
  });

  it('Marcas despliega la lista de marcas', async () => {
    const user = userEvent.setup();
    await abrirSeccion(user, 'Marcas');
    expect(screen.getByRole('link', { name: 'Gosbi' }).getAttribute('href')).toContain('brand=gosbi');
    expect(screen.getByRole('link', { name: 'Purina' })).toBeInTheDocument();
  });
});

/* ══ 2b. Las subcategorías se abren a la DERECHA, nunca hacia abajo ═════ */

describe('las subcategorías se abren a la derecha', () => {
  it('Perros está colapsado y, al pasar por encima, abre sus categorías', async () => {
    const user = userEvent.setup();
    await abrirSeccion(user, 'Alimentación');
    const perros = screen.getByRole('link', { name: 'Perros' });
    expect(perros).toHaveAttribute('aria-haspopup', 'true');
    // Colapsado de entrada: sus categorías no se ven aún.
    expect(screen.queryByRole('link', { name: 'Seca' })).not.toBeInTheDocument();

    // Al entrar el ratón en la fila de Perros, se abre su submenú.
    fireEvent.mouseEnter(perros.closest('li')!);
    expect(screen.getByRole('link', { name: 'Seca' }).getAttribute('href')).toContain(
      'category=alimentacion-seca',
    );
    expect(screen.getByRole('link', { name: 'Semihúmeda' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Snacks y premios' })).toBeInTheDocument();
  });

  it('el flyout de la subcategoría se posiciona a la derecha (left-full), no abajo', () => {
    // El panel de segundo nivel se abre con `left-full` (a la derecha de su fila).
    expect(sinComentarios(fuenteMenuPrincipal)).toMatch(/left-full/);
  });
});

/* ══ 3. El buscador nunca desaparece ═══════════════════════════════════ */

describe('buscador', () => {
  it('está en la cabecera, también en la variante para móvil', async () => {
    pintarCabecera();
    const campos = await screen.findAllByLabelText(/buscar productos/i);
    // Uno para pantallas anchas y otro en su propia fila para las estrechas:
    // por debajo de `sm` el ancho no da para logotipo, buscador y tres botones.
    expect(campos.length).toBeGreaterThanOrEqual(2);
  });

  it('tiene nombre accesible y es un campo de búsqueda', async () => {
    pintarCabecera();
    const campos = await screen.findAllByLabelText(/buscar productos/i);
    for (const campo of campos) expect(campo).toHaveAttribute('type', 'search');
    expect(screen.getAllByRole('search').length).toBeGreaterThanOrEqual(1);
  });
});

/* ══ 4. Menú móvil ═════════════════════════════════════════════════════ */

describe('menú móvil', () => {
  it('se abre como diálogo con nombre', async () => {
    const user = userEvent.setup();
    pintarCabecera();
    await user.click(await screen.findByRole('button', { name: /abrir menú/i }));

    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveAccessibleName(/menú de navegación/i);
  });

  it('Escape lo cierra y el foco vuelve al botón', async () => {
    const user = userEvent.setup();
    pintarCabecera();
    const abrir = await screen.findByRole('button', { name: /abrir menú/i });

    await user.click(abrir);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(abrir);
  });

  it('se navega por niveles (Alimentación → Perros → categorías)', async () => {
    const user = userEvent.setup();
    pintarCabecera();
    await user.click(await screen.findByRole('button', { name: /abrir menú/i }));

    const dialogo = screen.getByRole('dialog');
    // Primer nivel: las secciones, sin las categorías todavía.
    expect(within(dialogo).queryByText('Seca')).not.toBeInTheDocument();

    await user.click(within(dialogo).getByRole('button', { name: 'Alimentación' }));
    await user.click(within(dialogo).getByRole('button', { name: 'Perros' }));
    // Ya en el tercer nivel: las categorías como enlaces.
    expect(within(dialogo).getByRole('link', { name: 'Seca' })).toBeInTheDocument();
  });

  it('bloquea el desplazamiento de la página de detrás', async () => {
    const user = userEvent.setup();
    pintarCabecera();
    await user.click(await screen.findByRole('button', { name: /abrir menú/i }));
    expect(document.body.style.overflow).toBe('hidden');
  });
});

/* ══ 5. Nada inventado ═════════════════════════════════════════════════ */

describe('sin datos inventados en el shell', () => {
  it('el teléfono de relleno ha desaparecido', () => {
    // «922 00 00 00» estuvo publicado en producción.
    for (const [nombre, fuente] of FUENTES_DEL_SHELL) {
      expect(sinComentarios(fuente), nombre).not.toMatch(/922\s*00\s*00\s*00/);
      expect(sinComentarios(fuente), nombre).not.toMatch(/tel:\+?34922000000/);
    }
  });

  it('el shell no usa emoji como icono', () => {
    for (const [nombre, fuente] of FUENTES_DEL_SHELL) {
      expect(sinComentarios(fuente), nombre).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    }
  });
});

/* ══ 6. Pie ════════════════════════════════════════════════════════════ */

describe('pie', () => {
  const pintarPie = () => render(<MemoryRouter><Footer /></MemoryRouter>);

  it('no queda ningún enlace a ninguna parte', () => {
    // Eran dos iconos sociales con `href="#"`: parecían pulsables y no hacían
    // nada. Vuelven cuando existan los perfiles.
    pintarPie();
    for (const a of screen.getAllByRole('link')) {
      expect(a.getAttribute('href')).not.toBe('#');
      expect(a.getAttribute('href')).toBeTruthy();
    }
  });

  it('ningún enlace se queda sin nombre accesible', () => {
    pintarPie();
    for (const a of screen.getAllByRole('link')) {
      expect(a).toHaveAccessibleName();
    }
  });

  it('enseña dónde está la tienda y cómo llegar', () => {
    pintarPie();
    expect(screen.getByRole('link', { name: /cómo llegar/i })).toBeInTheDocument();
    expect(screen.getByText(/San Francisco de Paula/i)).toBeInTheDocument();
  });

  it('ya no lista columnas de enlaces (Comprar / Ayuda / Legal)', () => {
    // Se retiraron a petición de Ivan: la navegación vive en la cabecera y el
    // pie se reserva para quiénes somos y cómo encontrarnos.
    pintarPie();
    expect(screen.queryByRole('link', { name: 'Perros' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Aviso legal' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Mi cuenta' })).not.toBeInTheDocument();
  });

  it('no promete la página de envíos hasta que exista', () => {
    // Antes «Envíos y devoluciones» llevaba a /contacto, que no responde a la
    // pregunta que se está haciendo quien lo pulsa.
    pintarPie();
    expect(screen.queryByRole('link', { name: /envíos y devoluciones/i })).not.toBeInTheDocument();
  });
});
