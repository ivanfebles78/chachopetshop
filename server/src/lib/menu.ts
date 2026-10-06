/**
 * EL MENÚ DE CABECERA: categoría → marca → línea, por animal.
 *
 * Se calcula en el servidor a partir del catálogo entero, no en el cliente
 * contando una página: con 387 productos, contar sólo los 48 primeros dejaría
 * fuera marcas y categorías enteras EN SILENCIO.
 *
 * La estructura respeta el modelo ortogonal: la marca aparece UNA vez dentro de
 * cada categoría, y sus líneas cuelgan debajo. Una marca sin líneas no las
 * tiene; al pincharla se ven todos sus productos de esa categoría.
 *
 * Función pura —recibe productos, devuelve el árbol— para poder probarla sin
 * base de datos.
 */

export type ProductoMenu = {
  line: string | null;
  animals: { slug: string }[];
  categories: { slug: string; name: string; sortOrder: number }[];
  // Nullable: un producto sin marca cuenta en su categoría pero no cuelga de
  // ninguna marca del menú.
  brand: { slug: string; name: string } | null;
};

export type LineaMenu = { nombre: string; total: number };
export type MarcaMenu = { slug: string; nombre: string; total: number; lineas: LineaMenu[] };
export type CategoriaMenu = { slug: string; nombre: string; sortOrder: number; total: number; marcas: MarcaMenu[] };
export type AnimalMenu = { slug: string; nombre: string; total: number; categorias: CategoriaMenu[] };

/**
 * EL MENÚ DE CABECERA DE PERROS Y GATOS ENSEÑA SOLO ESTAS CINCO CATEGORÍAS,
 * EN ESTE ORDEN —aunque alguna no tenga productos todavía—.
 *
 * Es una decisión de escaparate de Ivan: el menú de perros/gatos se centra en
 * la alimentación y los suplementos, y deja el resto (accesorios, semillas…)
 * para la búsqueda y los filtros del catálogo, que NO se tocan. «Semihúmeda»
 * vuelve como sección aunque hoy esté vacía. El nombre se fija aquí para que
 * «Suplementos y cosmética» salga bien aun antes de que la migración renombre la
 * categoría en la base de datos.
 */
const CATEGORIAS_CABECERA: { slug: string; nombre: string }[] = [
  { slug: 'alimentacion-seca', nombre: 'Alimentación seca' },
  { slug: 'alimentacion-humeda', nombre: 'Alimentación húmeda' },
  { slug: 'alimentacion-semihumeda', nombre: 'Alimentación semihúmeda' },
  { slug: 'snacks-y-premios', nombre: 'Snacks y premios' },
  { slug: 'higiene-y-cosmetica', nombre: 'Suplementos y cosmética' },
];
const ANIMALES_CABECERA = new Set(['perro', 'gato']);

/**
 * Acota el menú de perros y gatos a {@link CATEGORIAS_CABECERA}, en ese orden,
 * conservando sus marcas reales e inyectando como vacías las que aún no tienen
 * producto. Los demás animales se devuelven tal cual. Sólo afecta al menú.
 */
export function restringirCabecera(menu: AnimalMenu[]): AnimalMenu[] {
  return menu.map((a) => {
    if (!ANIMALES_CABECERA.has(a.slug)) return a;
    const porSlug = new Map(a.categorias.map((c) => [c.slug, c]));
    const categorias = CATEGORIAS_CABECERA.map(({ slug, nombre }, i) => {
      const existente = porSlug.get(slug);
      return existente
        ? { ...existente, nombre, sortOrder: i }
        : { slug, nombre, sortOrder: i, total: 0, marcas: [] };
    });
    return { ...a, categorias };
  });
}

type NodoMarca = { nombre: string; total: number; lineas: Map<string, number> };
type NodoCat = { nombre: string; sortOrder: number; total: number; marcas: Map<string, NodoMarca> };
type NodoAnimal = { total: number; categorias: Map<string, NodoCat> };

export function construirMenu(
  productos: ProductoMenu[],
  animales: { slug: string; name: string; sortOrder: number }[],
): AnimalMenu[] {
  const arbol = new Map<string, NodoAnimal>();

  for (const p of productos) {
    const cat = p.categories[0];
    if (!cat) continue; // un producto sin categoría no cuelga de ninguna rama
    for (const a of p.animals) {
      const na = arbol.get(a.slug) ?? { total: 0, categorias: new Map() };
      na.total += 1;

      const nc =
        na.categorias.get(cat.slug) ??
        { nombre: cat.name, sortOrder: cat.sortOrder, total: 0, marcas: new Map() };
      nc.total += 1;

      // Sólo los productos CON marca cuelgan de una marca del menú; los que no
      // la tienen cuentan igual en su categoría (arriba), pero no aquí.
      if (p.brand) {
        const nm = nc.marcas.get(p.brand.slug) ?? { nombre: p.brand.name, total: 0, lineas: new Map() };
        nm.total += 1;
        if (p.line) nm.lineas.set(p.line, (nm.lineas.get(p.line) ?? 0) + 1);
        nc.marcas.set(p.brand.slug, nm);
      }

      na.categorias.set(cat.slug, nc);
      arbol.set(a.slug, na);
    }
  }

  const nombreAnimal = new Map(animales.map((a) => [a.slug, a]));
  const ordenAnimal = (s: string) => nombreAnimal.get(s)?.sortOrder ?? 999;

  return [...arbol.entries()]
    .sort((a, b) => ordenAnimal(a[0]) - ordenAnimal(b[0]))
    .map(([slug, na]) => ({
      slug,
      nombre: nombreAnimal.get(slug)?.name ?? slug,
      total: na.total,
      categorias: [...na.categorias.entries()]
        .sort((a, b) => a[1].sortOrder - b[1].sortOrder)
        .map(([cslug, nc]) => ({
          slug: cslug,
          nombre: nc.nombre,
          sortOrder: nc.sortOrder,
          total: nc.total,
          marcas: [...nc.marcas.entries()]
            .map(([mslug, nm]) => ({
              slug: mslug,
              nombre: nm.nombre,
              total: nm.total,
              lineas: [...nm.lineas.entries()]
                .map(([nombre, total]) => ({ nombre, total }))
                .sort((x, y) => x.nombre.localeCompare(y.nombre, 'es')),
            }))
            // Marca con más productos primero; a igualdad, alfabético.
            .sort((x, y) => y.total - x.total || x.nombre.localeCompare(y.nombre, 'es')),
        })),
    }));
}
