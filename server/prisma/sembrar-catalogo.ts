/**
 * IMPORTA EL CATÁLOGO REAL DESDE EL EXCEL DEL PROVEEDOR.
 *
 * Lee `catalogo-evopet.json` —generado a partir de «excel perros y gatos
 * conjunto - por pesos.xlsx»— y lo vuelca en la base de datos. Es IDEMPOTENTE:
 * se puede ejecutar tantas veces como haga falta y sólo crea o actualiza, nunca
 * duplica. Eso importa porque el catálogo se irá reimportando cuando el
 * proveedor entregue precios, stock o productos nuevos.
 *
 * Qué NO trae el Excel, y por eso aquí no se inventa:
 *   · PRECIO — nulo. Se muestra «Precio a consultar» y no se puede comprar hasta
 *     que el cliente lo ponga en el panel.
 *   · STOCK — 0.
 *   · DESCRIPCIÓN de ficha — vacía; el contenido enriquecido llega producto a
 *     producto (ver `producto-alpha-spirit-pato.ts`).
 *
 * La estructura es la que Ivan pidió: categoría → marca → línea. Las marcas sin
 * línea real cuelgan sus productos directamente de la marca.
 *
 *   npx tsx prisma/sembrar-catalogo.ts
 */

import { PrismaClient, type CategoryType } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const prisma = new PrismaClient();
const aqui = path.dirname(fileURLToPath(import.meta.url));

type NodoCategoria = {
  slug: string;
  name: string;
  type: string;
  animalSlug: string | null;
  parentSlug: string | null;
  brandSlug: string | null;
  sortOrder: number;
};
type Variante = {
  label: string;
  sku: string;
  quantity: number | null;
  unit: string | null;
  packUnits: number;
};
type Producto = {
  slug: string;
  name: string;
  brandSlug: string;
  animals: string[];
  categorySlugs: string[];
  image: string;
  variants: Variante[];
};
type Datos = {
  animals: { slug: string; name: string; emoji: string; sortOrder: number }[];
  brands: { slug: string; name: string }[];
  categories: NodoCategoria[];
  products: Producto[];
};

const datos: Datos = JSON.parse(readFileSync(path.join(aqui, 'catalogo-evopet.json'), 'utf8'));

async function main() {
  // 1) Animales
  for (const a of datos.animals) {
    await prisma.animal.upsert({
      where: { slug: a.slug },
      update: { name: a.name, emoji: a.emoji, sortOrder: a.sortOrder },
      create: a,
    });
  }
  const animales = await prisma.animal.findMany();
  const idAnimal = (s: string) => animales.find((a) => a.slug === s)!.id;

  // 2) Marcas
  for (const b of datos.brands) {
    await prisma.brand.upsert({
      where: { slug: b.slug },
      update: { name: b.name },
      create: { slug: b.slug, name: b.name },
    });
  }
  const marcas = await prisma.brand.findMany();
  const idMarca = (s: string) => marcas.find((b) => b.slug === s)!.id;

  // 3) Árbol de categorías. Vienen ordenadas: raíces, luego marcas, luego líneas,
  //    así que el padre de cada nodo ya existe cuando se procesa.
  for (const c of datos.categories) {
    const padre = c.parentSlug
      ? await prisma.category.findUnique({ where: { slug: c.parentSlug }, select: { id: true } })
      : null;
    const comun = {
      name: c.name,
      type: c.type as CategoryType,
      sortOrder: c.sortOrder,
      animalId: c.animalSlug ? idAnimal(c.animalSlug) : null,
      parentId: padre?.id ?? null,
      brandId: c.brandSlug ? idMarca(c.brandSlug) : null,
    };
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: comun,
      create: { slug: c.slug, ...comun },
    });
  }
  const cats = await prisma.category.findMany({ select: { id: true, slug: true } });
  const idCat = (s: string) => cats.find((c) => c.slug === s)!.id;

  // 4) Productos + variantes (precio nulo, stock 0)
  let creados = 0;
  for (const p of datos.products) {
    const existe = await prisma.product.findUnique({ where: { slug: p.slug }, select: { id: true } });
    const rel = {
      name: p.name,
      brandId: idMarca(p.brandSlug),
      image: p.image,
      active: true,
      animals: { set: p.animals.map((s) => ({ id: idAnimal(s) })) },
      categories: { set: p.categorySlugs.map((s) => ({ id: idCat(s) })) },
    };
    const prod = existe
      ? await prisma.product.update({ where: { slug: p.slug }, data: rel })
      : await prisma.product.create({
          data: {
            slug: p.slug,
            description: '',
            gallery: [],
            ...rel,
            animals: { connect: p.animals.map((s) => ({ id: idAnimal(s) })) },
            categories: { connect: p.categorySlugs.map((s) => ({ id: idCat(s) })) },
          },
        });
    if (!existe) creados++;

    // Las variantes se reemplazan enteras: es la forma idempotente más simple y
    // el Excel es la fuente de verdad de qué formatos existen.
    await prisma.productVariant.deleteMany({ where: { productId: prod.id } });
    await prisma.productVariant.createMany({
      data: p.variants.map((v) => ({
        productId: prod.id,
        label: v.label,
        sku: v.sku,
        price: null,
        stock: 0,
        quantity: v.quantity,
        unit: v.unit,
        packUnits: v.packUnits,
      })),
    });
  }

  const [nCats, nProd, nVar] = await Promise.all([
    prisma.category.count(),
    prisma.product.count(),
    prisma.productVariant.count(),
  ]);
  console.log('Catálogo importado desde el Excel del proveedor:');
  console.log(`  marcas: ${datos.brands.length}`);
  console.log(`  categorías (nodos del árbol): ${nCats}`);
  console.log(`  productos: ${nProd} (${creados} nuevos)`);
  console.log(`  variantes/formatos: ${nVar}`);
  console.log('  precio: sin definir (a consultar) · stock: 0 — se rellenan en el panel.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
