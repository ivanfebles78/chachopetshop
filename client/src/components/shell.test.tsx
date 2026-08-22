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
import { render, screen, within } from '@testing-library/react';
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

beforeEach(() => {
  _resetCacheNavegacion();
  vi.mocked(api.taxonomy).mockResolvedValue(TAX as never);
  vi.mocked(api.products).mockResolvedValue({ items: [PRODUCTO], page: 1, pageSize: 48, total: 1, totalPages: 1 } as never);
});

afterEach(() => vi.clearAllMocks());

const pintarCabecera = () => render(<MemoryRouter><Navbar /></MemoryRouter>);

/* ══ 1. Semántica del desplegable ══════════════════════════════════════ */

describe('los desplegables se anuncian', () => {
  it('el disparador declara si está abierto, y cambia al pulsarlo', async () => {
    /*
     * Antes: `<button>` sin `aria-expanded` ni `aria-controls`. Quien no ve la
     * pantalla no sabía que existía un submenú, ni si estaba desplegado.
     */
    const user = userEvent.setup();
    pintarCabecera();

    const disparador = await screen.findByRole('button', { name: /perros/i });
    expect(disparador).toHaveAttribute('aria-expanded', 'false');

    await user.click(disparador);
    expect(disparador).toHaveAttribute('aria-expanded', 'true');
  });

  it('el disparador apunta al panel que abre', async () => {
    const user = userEvent.setup();
    pintarCabecera();
    const disparador = await screen.findByRole('button', { name: /perros/i });
    await user.click(disparador);

    const id = disparador.getAttribute('aria-controls');
    expect(id).toBeTruthy();
    expect(document.getElementById(id as string)).toBeTruthy();
  });

  it('con el ratón encima, el clic ABRE (no cierra lo que abrió el puntero)', async () => {
    /*
     * REGRESIÓN. El puntero abría al pasar por encima y el clic alternaba, y
     * para pulsar hay que estar encima: al llegar al botón el ratón ya lo había
     * abierto, así que el clic lo volvía a cerrar. Resultado: con ratón el
     * desplegable NO SE PODÍA ABRIR. Con teclado sí, porque no hay `mouseenter`,
     * y por eso el fallo no se veía revisando la navegación con el tabulador.
     */
    const user = userEvent.setup();
    pintarCabecera();
    const disparador = await screen.findByRole('button', { name: /perros/i });

    await user.hover(disparador);
    await user.click(disparador);
    expect(disparador).toHaveAttribute('aria-expanded', 'true');

    // Y el segundo clic sí cierra: lo que abrió el clic, el clic lo cierra.
    await user.click(disparador);
    expect(disparador).toHaveAttribute('aria-expanded', 'false');
  });

  it('Escape cierra y devuelve el foco al disparador', async () => {
    const user = userEvent.setup();
    pintarCabecera();
    const disparador = await screen.findByRole('button', { name: /perros/i });

    await user.click(disparador);
    await user.keyboard('{Escape}');

    expect(disparador).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(disparador);
  });

  it('el panel son ENLACES, no un menú de aplicación', () => {
    /*
     * `role="menu"` obliga a navegar con flechas y es para acciones, no para
     * navegar. Aquí lo correcto es una lista de enlaces y el tabulador, que es
     * lo que cualquiera espera de la navegación de una tienda.
     */
    const fuente = sinComentarios(fuenteNavbar);
    expect(fuente).not.toMatch(/role=["']menu["']/);
    expect(fuente).not.toMatch(/role=["']menuitem["']/);
  });
});

/* ══ 2. El menú refleja el catálogo ════════════════════════════════════ */

describe('la cabecera pinta el menú real', () => {
  it('enseña los animales que tienen producto', async () => {
    pintarCabecera();
    expect(await screen.findByRole('button', { name: /perros/i })).toBeInTheDocument();
  });

  it('no enseña los que no lo tienen', async () => {
    pintarCabecera();
    await screen.findByRole('button', { name: /perros/i });
    // Gatos está en la taxonomía pero el catálogo de prueba no tiene ninguno.
    expect(screen.queryByRole('button', { name: /^gatos$/i })).not.toBeInTheDocument();
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

  it('se navega por niveles, no volcando todo de golpe', async () => {
    const user = userEvent.setup();
    pintarCabecera();
    await user.click(await screen.findByRole('button', { name: /abrir menú/i }));

    const dialogo = screen.getByRole('dialog');
    // Primer nivel: los animales, sin sus categorías todavía.
    expect(within(dialogo).queryByText(/alimentación seca/i)).not.toBeInTheDocument();

    await user.click(within(dialogo).getByRole('button', { name: /perros/i }));
    expect(within(dialogo).getByText(/alimentación seca/i)).toBeInTheDocument();
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

  it('enseña los animales que tienen producto, incluidos los residuales', () => {
    // Roedores y peces faltaban aunque tienen catálogo.
    pintarPie();
    for (const etiqueta of ['Perros', 'Gatos', 'Aves', 'Roedores', 'Peces']) {
      expect(screen.getByRole('link', { name: etiqueta })).toBeInTheDocument();
    }
  });

  it('no promete la página de envíos hasta que exista', () => {
    // Antes «Envíos y devoluciones» llevaba a /contacto, que no responde a la
    // pregunta que se está haciendo quien lo pulsa.
    pintarPie();
    expect(screen.queryByRole('link', { name: /envíos y devoluciones/i })).not.toBeInTheDocument();
  });
});
