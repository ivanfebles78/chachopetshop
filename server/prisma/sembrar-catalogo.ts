/**
 * IMPORTA EL CATÁLOGO REAL DESDE EL EXCEL DEL PROVEEDOR.
 *
 * Lee `catalogo-evopet.json` —generado a partir de «excel perros y gatos
 * conjunto - por pesos.xlsx»— y lo vuelca en la base de datos. Es IDEMPOTENTE:
 * crea o actualiza, nunca duplica, y al final borra lo que ya no está en el
 * Excel. Se puede reimportar cuando el proveedor entregue precios, stock o
 * productos nuevos.
 *
 * ── Modelo ORTOGONAL (Fase 2K) ─────────────────────────────────────────────
 *
 * Cada dimensión es una faceta independiente, y cada valor aparece UNA vez:
 *   · Animal   (M2M)      perro / gato
 *   · Categoría (5 canónicas, sin duplicar por animal)  seca, húmeda, …
 *   · Marca    (una por producto)
 *   · Línea    (atributo del producto, no un nodo)      «Premium Recetas»…
 *   · Tamaño   (de cada variante: cantidad + unidad)
 *
 * Antes (2J) la categoría era un árbol animal→categoría→marca→línea, y eso hacía
 * que «Alpha Spirit» saliera repetido en los filtros —una vez por cada animal y
 * categoría en que vende—. Con marca y línea como facetas, sale una sola vez y
 * se combina con las demás.
 *
 * Qué NO trae el Excel, y por eso aquí no se inventa: PRECIO (nulo, «a
 * consultar») y STOCK (0). Los rellena el cliente en el panel.
 *
 *   npx tsx prisma/sembrar-catalogo.ts
 */

import { PrismaClient, type CategoryType } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const prisma = new PrismaClient();
const aqui = path.dirname(fileURLToPath(import.meta.url));

type Categoria = { slug: string; name: string; type: string; sortOrder: number };
type Variante = { label: string; sku: string; quantity: number | null; unit: string | null; packUnits: number };
type Producto = {
  slug: string;
  name: string;
  brandSlug: string;
  line: string | null;
  animals: string[];
  categorySlug: string;
  image: string;
  variants: Variante[];
};
type Datos = {
  animals: { slug: string; name: string; emoji: string; sortOrder: number }[];
  brands: { slug: string; name: string }[];
  categories: Categoria[];
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

  // 3) Categorías canónicas (animal-agnósticas, planas: sin árbol, sin marca)
  for (const c of datos.categories) {
    const comun = {
      name: c.name,
      type: c.type as CategoryType,
      sortOrder: c.sortOrder,
      parentId: null,
      animalId: null,
      brandId: null,
    };
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: comun,
      create: { slug: c.slug, ...comun },
    });
  }
  const cats = await prisma.category.findMany({ select: { id: true, slug: true } });
  const idCat = (s: string) => cats.find((c) => c.slug === s)!.id;

  // 4) Productos + variantes (precio nulo, stock 0, línea como atributo)
  let creados = 0;
  for (const p of datos.products) {
    const existe = await prisma.product.findUnique({ where: { slug: p.slug }, select: { id: true } });
    const rel = {
      name: p.name,
      brandId: idMarca(p.brandSlug),
      line: p.line,
      image: p.image,
      active: true,
      animals: { set: p.animals.map((s) => ({ id: idAnimal(s) })) },
      categories: { set: [{ id: idCat(p.categorySlug) }] },
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
            categories: { connect: [{ id: idCat(p.categorySlug) }] },
          },
        });
    if (!existe) creados++;

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

  // 5) Limpieza: fuera lo que ya no está en el Excel —incluidos los nodos del
  //    árbol viejo de la Fase 2J, que dejaban de tener sentido con el modelo
  //    plano—. Los pedidos no se rompen: guardan nombre y precio propios.
  const slugsProd = new Set(datos.products.map((p) => p.slug));
  const slugsCat = new Set(datos.categories.map((c) => c.slug));
  const prodViejos = await prisma.product.findMany({ select: { id: true, slug: true } });
  const aBorrarProd = prodViejos.filter((p) => !slugsProd.has(p.slug)).map((p) => p.id);
  if (aBorrarProd.length) {
    await prisma.productVariant.deleteMany({ where: { productId: { in: aBorrarProd } } });
    await prisma.product.deleteMany({ where: { id: { in: aBorrarProd } } });
  }
  const catBorradas = await prisma.category.deleteMany({ where: { slug: { notIn: [...slugsCat] } } });

  const [nCats, nProd, nVar] = await Promise.all([
    prisma.category.count(),
    prisma.product.count(),
    prisma.productVariant.count(),
  ]);
  console.log('Catálogo importado (modelo ortogonal):');
  console.log(`  marcas: ${datos.brands.length}`);
  console.log(`  categorías: ${nCats}`);
  console.log(`  productos: ${nProd} (${creados} nuevos, ${aBorrarProd.length} retirados)`);
  console.log(`  variantes/formatos: ${nVar}`);
  console.log(`  nodos de árbol viejos eliminados: ${catBorradas.count}`);
  console.log('  precio: sin definir (a consultar) · stock: 0 — se rellenan en el panel.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
