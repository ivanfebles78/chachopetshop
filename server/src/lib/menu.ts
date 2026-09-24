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
  brand: { slug: string; name: string };
};

export type LineaMenu = { nombre: string; total: number };
export type MarcaMenu = { slug: string; nombre: string; total: number; lineas: LineaMenu[] };
export type CategoriaMenu = { slug: string; nombre: string; sortOrder: number; total: number; marcas: MarcaMenu[] };
export type AnimalMenu = { slug: string; nombre: string; total: number; categorias: CategoriaMenu[] };

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

      const nm = nc.marcas.get(p.brand.slug) ?? { nombre: p.brand.name, total: 0, lineas: new Map() };
      nm.total += 1;
      if (p.line) nm.lineas.set(p.line, (nm.lineas.get(p.line) ?? 0) + 1);

      nc.marcas.set(p.brand.slug, nm);
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
