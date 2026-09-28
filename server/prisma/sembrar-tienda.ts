/**
 * IMPORTA EL CATÁLOGO COMPLETO DE LA TIENDA (≈2600 artículos del TPV).
 *
 * Lee `catalogo-tienda.json` —generado desde el «Listado de artículos» del TPV,
 * enriquecido con fabricante/línea/animal— y REEMPLAZA el catálogo entero. Es
 * idempotente: deja la base en el mismo estado se ejecute las veces que se
 * ejecute.
 *
 * A diferencia del catálogo evopet (`sembrar-catalogo.ts`):
 *   · Una fila = un producto con UN formato.
 *   · La marca es OPCIONAL: la mitad de los artículos no traen fabricante fiable
 *     (accesorios genéricos, graneles) y entran sin marca (`brandId` null).
 *   · PRECIO y STOCK son REALES (vienen del TPV), no «a consultar».
 *   · La imagen va vacía a propósito: el cliente pinta la ilustración de la
 *     categoría hasta que Ivan suba las fotos.
 *
 *   npx tsx prisma/sembrar-tienda.ts   (o: npm run db:tienda)
 */

import { PrismaClient, type CategoryType } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const prisma = new PrismaClient();
const aqui = path.dirname(fileURLToPath(import.meta.url));

type Variante = {
  label: string;
  sku: string;
  price: number | null;
  stock: number;
  quantity: number | null;
  unit: string | null;
  packUnits: number;
};
type Producto = {
  slug: string;
  name: string;
  brandSlug: string | null;
  line: string | null;
  animals: string[];
  categorySlug: string;
  image: string;
  price: number | null;
  variant: Variante;
};
type Datos = {
  animals: { slug: string; name: string; emoji: string; sortOrder: number }[];
  brands: { slug: string; name: string }[];
  categories: { slug: string; name: string; type: string; sortOrder: number }[];
  products: Producto[];
};

const datos: Datos = JSON.parse(readFileSync(path.join(aqui, 'catalogo-tienda.json'), 'utf8'));

/** Trocea una lista en lotes, para no lanzar 2600 escrituras a la vez. */
function* lotes<T>(lista: T[], tamano: number) {
  for (let i = 0; i < lista.length; i += tamano) yield lista.slice(i, i + tamano);
}

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

  // 3) Categorías canónicas (planas: sin árbol, sin marca, sin animal)
  for (const c of datos.categories) {
    const comun = { name: c.name, type: c.type as CategoryType, sortOrder: c.sortOrder, parentId: null, animalId: null, brandId: null };
    await prisma.category.upsert({ where: { slug: c.slug }, update: comun, create: { slug: c.slug, ...comun } });
  }
  const cats = await prisma.category.findMany({ select: { id: true, slug: true } });
  const idCat = (s: string) => cats.find((c) => c.slug === s)!.id;

  // 4) REEMPLAZO: fuera el catálogo anterior. Los pedidos NO se rompen —
  //    `OrderItem` guarda el nombre, el precio y la imagen que tenían al comprar,
  //    y no es una clave foránea a Product—. Las variantes caen por cascada.
  await prisma.product.deleteMany({});

  // 5) Alta de los productos, en lotes en paralelo para que no tarde una era.
  let creados = 0;
  for (const lote of lotes(datos.products, 40)) {
    await Promise.all(
      lote.map((p) =>
        prisma.product.create({
          data: {
            slug: p.slug,
            name: p.name,
            description: '',
            brandId: p.brandSlug ? idMarca(p.brandSlug) : null,
            line: p.line,
            price: p.price,
            image: p.image,
            gallery: [],
            active: true,
            animals: { connect: p.animals.map((s) => ({ id: idAnimal(s) })) },
            categories: { connect: [{ id: idCat(p.categorySlug) }] },
            variants: {
              create: [
                {
                  label: p.variant.label,
                  sku: p.variant.sku,
                  price: p.variant.price,
                  stock: p.variant.stock,
                  quantity: p.variant.quantity,
                  unit: p.variant.unit,
                  packUnits: p.variant.packUnits,
                },
              ],
            },
          },
        }),
      ),
    );
    creados += lote.length;
  }

  // 6) Limpieza: categorías y marcas que ya no existen en el catálogo nuevo
  //    (incluidas las del catálogo evopet anterior). Se hace DESPUÉS de crear,
  //    cuando ninguna sigue referenciada.
  const catSlugs = datos.categories.map((c) => c.slug);
  const brandSlugs = datos.brands.map((b) => b.slug);
  const catFuera = await prisma.category.deleteMany({ where: { slug: { notIn: catSlugs } } });
  const marcaFuera = await prisma.brand.deleteMany({ where: { slug: { notIn: brandSlugs } } });

  const [nCat, nMarca, nProd, nVar, conPrecio, conStock, sinMarca] = await Promise.all([
    prisma.category.count(),
    prisma.brand.count(),
    prisma.product.count(),
    prisma.productVariant.count(),
    prisma.productVariant.count({ where: { price: { not: null } } }),
    prisma.productVariant.count({ where: { stock: { gt: 0 } } }),
    prisma.product.count({ where: { brandId: null } }),
  ]);

  console.log('Catálogo COMPLETO de tienda importado:');
  console.log(`  animales: ${datos.animals.length}`);
  console.log(`  marcas: ${nMarca} (${marcaFuera.count} retiradas)`);
  console.log(`  categorías: ${nCat} (${catFuera.count} retiradas)`);
  console.log(`  productos: ${nProd} (${creados} altas) · sin marca: ${sinMarca}`);
  console.log(`  variantes: ${nVar} · con precio: ${conPrecio} · con stock: ${conStock}`);
  console.log('  imagen: ilustración por categoría (placeholder) hasta subir fotos.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
