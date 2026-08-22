/**
 * EL MENÚ NO PUEDE PROMETER LO QUE NO HAY.
 *
 * El menú anterior llevaba a dos sitios vacíos: `animal=reptil` (0 productos) y
 * `category=semihumeda` (0, y enlazada dos veces, en Perros y en Gatos). No es
 * que alguien se equivocara al escribirlo: es que NADA lo contrastaba con el
 * catálogo, así que el error no tenía forma de salir a la luz.
 *
 * Estas pruebas son ese contraste. Trabajan sobre la función pura que construye
 * el menú, sin React ni servidor, de modo que comprobar «esto no enseña
 * destinos vacíos» es directo en lugar de ir a buscarlo por el DOM.
 */

import { describe, it, expect } from 'vitest';
import { construirNavegacion, destinosDe, estaRebajado, rutaCatalogo } from './navigation';
import type { Animal, Brand, Category, Need, Product, Taxonomy } from './types';

/* ── Datos de prueba, con la forma del catálogo real ──────────────────── */

const animal = (slug: string, name: string): Animal => ({ id: slug, slug, name, emoji: null, sortOrder: 0 });
const categoria = (slug: string, name: string): Category => ({ id: slug, slug, name, type: 'DRY_FOOD', sortOrder: 0 });
const necesidad = (slug: string, name: string): Need => ({ id: slug, slug, name });
const marca = (slug: string, name: string): Brand => ({ id: slug, slug, name, logoUrl: null, featured: false });

const TAX: Taxonomy = {
  animals: [
    animal('perro', 'Perros'),
    animal('gato', 'Gatos'),
    animal('ave', 'Aves'),
    // Existe en la taxonomía y NO tiene productos: el caso real que fallaba.
    animal('reptil', 'Reptiles'),
  ],
  categories: [
    categoria('alimentacion-seca', 'Alimentación seca'),
    categoria('alimentacion-humeda', 'Alimentación húmeda'),
    // Ídem: declarada, vacía, y enlazada dos veces en el menú anterior.
    categoria('semihumeda', 'Semihúmeda'),
    categoria('higiene', 'Higiene y cosmética'),
  ],
  needs: [necesidad('digestivo', 'Digestivo sensible'), necesidad('dental', 'Cuidado dental')],
  brands: [marca('ownat', 'Ownat'), marca('acana', 'Acana')],
};

let n = 0;
function producto(opciones: {
  animales?: string[];
  categorias?: string[];
  necesidades?: string[];
  marca?: string;
  price?: number;
  compareAt?: number | null;
}): Product {
  n += 1;
  return {
    id: `p${n}`,
    name: `Producto ${n}`,
    slug: `producto-${n}`,
    description: '',
    brand: marca(opciones.marca ?? 'ownat', opciones.marca ?? 'Ownat'),
    brandId: opciones.marca ?? 'ownat',
    price: opciones.price ?? 20,
    compareAt: opciones.compareAt ?? null,
    image: '',
    gallery: [],
    featured: false,
    bestseller: false,
    animals: (opciones.animales ?? []).map((s) => animal(s, s)),
    categories: (opciones.categorias ?? []).map((s) => categoria(s, s)),
    needs: (opciones.necesidades ?? []).map((s) => necesidad(s, s)),
    variants: [],
  };
}

/** Catálogo con la misma forma que el real: perro y gato con peso, ave residual. */
const CATALOGO: Product[] = [
  producto({ animales: ['perro'], categorias: ['alimentacion-seca'], necesidades: ['digestivo'], marca: 'ownat' }),
  producto({ animales: ['perro'], categorias: ['alimentacion-seca'], marca: 'acana' }),
  producto({ animales: ['perro'], categorias: ['higiene'] }),
  producto({ animales: ['gato'], categorias: ['alimentacion-humeda'], necesidades: ['digestivo'] }),
  producto({ animales: ['ave'], categorias: ['alimentacion-seca'] }),
];

/* ══ 1. Nunca destinos vacíos ══════════════════════════════════════════ */

describe('el menú no enseña destinos sin producto', () => {
  it('reptiles no aparece: existe en la taxonomía pero no tiene productos', () => {
    const menu = construirNavegacion(TAX, CATALOGO);
    expect(JSON.stringify(menu)).not.toMatch(/reptil/i);
  });

  it('semihúmeda no aparece, ni en perros ni en gatos', () => {
    const menu = construirNavegacion(TAX, CATALOGO);
    expect(JSON.stringify(menu)).not.toMatch(/semihumeda/i);
  });

  it('NINGÚN destino del menú devuelve cero productos', () => {
    /*
     * La comprobación general, la que caza cualquier caso futuro. Cada enlace
     * se vuelve a contrastar contra el catálogo, y si alguno no tuviera detrás
     * ni un producto, aquí se ve — con su nombre.
     */
    const menu = construirNavegacion(TAX, CATALOGO);
    const vacios: string[] = [];
    for (const entrada of menu) {
      for (const col of entrada.columnas ?? []) {
        for (const enlace of col.enlaces) {
          if (enlace.total <= 0) vacios.push(`${entrada.etiqueta} › ${col.titulo} › ${enlace.etiqueta}`);
        }
      }
    }
    expect(vacios).toEqual([]);
  });

  it('una columna que se queda sin enlaces desaparece entera', () => {
    // Un encabezado de sección sin nada debajo es peor que no tener la sección.
    const menu = construirNavegacion(TAX, CATALOGO);
    for (const entrada of menu) {
      for (const col of entrada.columnas ?? []) {
        expect(col.enlaces.length, `columna vacía en ${entrada.etiqueta}`).toBeGreaterThan(0);
      }
    }
  });
});

/* ══ 2. Refleja la taxonomía y crece con ella ══════════════════════════ */

describe('el menú refleja el catálogo', () => {
  it('perros y gatos aparecen porque tienen producto', () => {
    const etiquetas = construirNavegacion(TAX, CATALOGO).map((e) => e.etiqueta);
    expect(etiquetas).toContain('Perros');
    expect(etiquetas).toContain('Gatos');
  });

  it('los animales residuales se agrupan en «Otras mascotas»', () => {
    const menu = construirNavegacion(TAX, CATALOGO);
    const otras = menu.find((e) => e.etiqueta === 'Otras mascotas');
    expect(otras).toBeTruthy();
    expect(otras!.columnas?.[0]?.enlaces.map((e) => e.etiqueta)).toEqual(['Aves']);
  });

  it('los recuentos son los reales', () => {
    const perros = construirNavegacion(TAX, CATALOGO).find((e) => e.etiqueta === 'Perros');
    expect(perros!.total).toBe(3);
    const seca = perros!.columnas!.flatMap((c) => c.enlaces).find((e) => e.href.includes('alimentacion-seca'));
    expect(seca!.total).toBe(2);
  });

  it('una faceta nueva con producto aparece SOLA, sin tocar código', () => {
    /*
     * La razón de ser de todo esto. El día que entre el primer pienso de
     * reptil, la entrada tiene que existir sin que nadie edite un menú.
     */
    const conReptil = [...CATALOGO, producto({ animales: ['reptil'], categorias: ['alimentacion-seca'] })];
    const menu = construirNavegacion(TAX, conReptil);
    const otras = menu.find((e) => e.etiqueta === 'Otras mascotas');
    expect(otras!.columnas?.[0]?.enlaces.map((e) => e.etiqueta)).toContain('Reptiles');
  });

  it('un catálogo vacío no produce un menú de mentira', () => {
    expect(construirNavegacion(TAX, [])).toEqual([]);
  });
});

/* ══ 3. Sin duplicados ═════════════════════════════════════════════════ */

describe('destinos únicos', () => {
  it('ningún destino se repite', () => {
    // `semihumeda` estaba enlazada dos veces. Con más filtros combinables, el
    // riesgo de repetir sólo crece.
    const destinos = destinosDe(construirNavegacion(TAX, CATALOGO));
    const repetidos = destinos.filter((d, i) => destinos.indexOf(d) !== i);
    expect([...new Set(repetidos)]).toEqual([]);
  });
});

/* ══ 4. Ofertas de verdad ══════════════════════════════════════════════ */

describe('Ofertas significa rebajado', () => {
  it('no aparece si no hay ningún producto rebajado', () => {
    const etiquetas = construirNavegacion(TAX, CATALOGO).map((e) => e.etiqueta);
    expect(etiquetas).not.toContain('Ofertas');
  });

  it('aparece en cuanto hay uno, y cuenta sólo los rebajados', () => {
    const conOferta = [...CATALOGO, producto({ animales: ['perro'], price: 20, compareAt: 30 })];
    const ofertas = construirNavegacion(TAX, conOferta).find((e) => e.etiqueta === 'Ofertas');
    expect(ofertas).toBeTruthy();
    expect(ofertas!.total).toBe(1);
  });

  it('destacado NO cuenta como oferta', () => {
    const destacado = producto({ animales: ['perro'] });
    destacado.featured = true;
    const menu = construirNavegacion(TAX, [...CATALOGO, destacado]);
    expect(menu.map((e) => e.etiqueta)).not.toContain('Ofertas');
  });

  it('el destino filtra por oferta, no por destacado', () => {
    const conOferta = [...CATALOGO, producto({ animales: ['perro'], price: 20, compareAt: 30 })];
    const ofertas = construirNavegacion(TAX, conOferta).find((e) => e.etiqueta === 'Ofertas');
    expect(ofertas!.href).toContain('oferta=1');
    expect(ofertas!.href).not.toContain('featured');
  });

  it('sólo es oferta si el precio anterior es MAYOR', () => {
    expect(estaRebajado(producto({ price: 20, compareAt: 30 }))).toBe(true);
    expect(estaRebajado(producto({ price: 20, compareAt: 20 }))).toBe(false);
    expect(estaRebajado(producto({ price: 20, compareAt: 10 }))).toBe(false);
    expect(estaRebajado(producto({ price: 20, compareAt: null }))).toBe(false);
  });
});

/* ══ 5. Rutas ══════════════════════════════════════════════════════════ */

describe('construcción de rutas', () => {
  it('sin filtros lleva al catálogo completo', () => {
    expect(rutaCatalogo({})).toBe('/tienda');
  });

  it('con filtros los codifica', () => {
    expect(rutaCatalogo({ animal: 'perro', category: 'alimentacion-seca' })).toBe(
      '/tienda?animal=perro&category=alimentacion-seca',
    );
  });
});
