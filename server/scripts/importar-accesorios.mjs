/**
 * IMPORTA EL CATÁLOGO DE ACCESORIOS (Nobleza · Gamarq · Vadigran).
 *
 * Lee `prisma/catalogo-accesorios.json` (extraído de evopetnutricion.com) y deja
 * los accesorios en la base: una ficha por formato, con SKU del proveedor,
 * precio, imagen(es), línea (jaulas, camas, toallitas…), animales, categoría
 * «accesorios» y ficha.
 *
 *   · ADITIVO Y NO DESTRUCTIVO. A diferencia del importador de Animally, este
 *     NO borra nada. La categoría «accesorios» ya tiene cientos de productos de
 *     otras fuentes (Freedog, Duvo, Kong…); borrar «lo que no está en el plan»
 *     se los llevaría por delante. Aquí sólo se crean o actualizan los del plan.
 *   · IDEMPOTENTE: se puede relanzar. Busca por SKU (EAN) y, si no, por slug.
 *   · MULTIMARCA: crea las marcas que falten (Gamarq es nueva; Nobleza y
 *     Vadigran ya existen). Las categorías y animales deben existir.
 *   · PRESERVA lo que gestiona la tienda: si una variante ya tenía precio o
 *     stock, se conservan; el precio del plan sólo se usa cuando no había.
 *
 * Uso (desde server/):
 *   DATABASE_URL="…" node scripts/importar-accesorios.mjs --dry-run
 *   DATABASE_URL="…" node scripts/importar-accesorios.mjs
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const prisma = new PrismaClient();
const dry = process.argv.includes('--dry-run');
const aqui = path.dirname(fileURLToPath(import.meta.url));
const planPath =
  process.argv.find((a) => a.endsWith('.json')) ?? path.join(aqui, '../prisma/catalogo-accesorios.json');
const { items } = JSON.parse(readFileSync(planPath, 'utf8'));

// Nombre bonito por slug de marca, para crear las que falten.
const NOMBRE_MARCA = { gamarq: 'Gamarq', nobleza: 'Nobleza', vadigran: 'Vadigran' };

async function main() {
  console.log(dry ? '· SIMULACIÓN (no se escribe nada) ·\n' : '· APLICANDO ·\n');
  console.log(`Plan: ${items.length} accesorios.`);

  // ── Validación del plan ────────────────────────────────────────────────
  const skus = items.map((i) => i.sku);
  const slugs = items.map((i) => i.slug);
  if (new Set(skus).size !== skus.length) throw new Error('SKU duplicados en el plan.');
  if (new Set(slugs).size !== slugs.length) throw new Error('Slugs duplicados en el plan.');

  // ── Referencias ────────────────────────────────────────────────────────
  const aniSlugs = [...new Set(items.flatMap((i) => i.animals))];
  const catSlugs = [...new Set(items.flatMap((i) => i.categories))];
  const brandSlugs = [...new Set(items.map((i) => i.brandSlug))];
  const animales = await prisma.animal.findMany({ where: { slug: { in: aniSlugs } } });
  const cats = await prisma.category.findMany({ where: { slug: { in: catSlugs } } });
  const faltanA = aniSlugs.filter((s) => !animales.some((a) => a.slug === s));
  const faltanC = catSlugs.filter((s) => !cats.some((c) => c.slug === s));
  if (faltanA.length) throw new Error(`Faltan animales: ${faltanA.join(', ')}`);
  if (faltanC.length) throw new Error(`Faltan categorías: ${faltanC.join(', ')}`);
  const idAnimal = (s) => animales.find((a) => a.slug === s).id;
  const idCat = (s) => cats.find((c) => c.slug === s).id;

  // Marcas: crear las que falten.
  const marcas = new Map();
  for (const bslug of brandSlugs) {
    let marca = await prisma.brand.findUnique({ where: { slug: bslug } });
    if (!marca) {
      const name = NOMBRE_MARCA[bslug] ?? bslug;
      console.log(`  Crear marca "${name}" (${bslug})`);
      marca = dry ? { id: `dry-${bslug}` } : await prisma.brand.create({ data: { slug: bslug, name } });
    }
    marcas.set(bslug, marca);
  }

  // ── Alta / actualización ───────────────────────────────────────────────
  let creados = 0;
  let actualizados = 0;
  for (const it of items) {
    const marca = marcas.get(it.brandSlug);
    const variante = await prisma.productVariant.findUnique({
      where: { sku: it.sku },
      select: { id: true, price: true, stock: true, productId: true },
    });
    const porSlug = variante ? null : await prisma.product.findUnique({ where: { slug: it.slug }, select: { id: true } });
    const productoId = variante?.productId ?? porSlug?.id ?? null;
    const prevVar = productoId
      ? await prisma.productVariant.findFirst({ where: { productId: productoId }, select: { price: true, stock: true } })
      : null;
    const price = variante?.price ?? prevVar?.price ?? it.price ?? null;
    const stock = variante?.stock ?? prevVar?.stock ?? 0;

    const datos = {
      name: it.name,
      slug: it.slug,
      description: it.description,
      line: it.line ?? null,
      price,
      image: it.image,
      gallery: it.gallery?.length ? it.gallery : [it.image],
      ...(it.contenido !== undefined ? { contenido: it.contenido } : {}),
      active: true,
    };
    const varData = {
      label: it.formato?.label ?? 'Único',
      sku: it.sku,
      price,
      stock,
      quantity: it.formato?.quantity ?? null,
      unit: it.formato?.unit ?? null,
      packUnits: 1,
    };

    if (productoId) {
      actualizados++;
      if (dry) continue;
      await prisma.product.update({
        where: { id: productoId },
        data: {
          ...datos,
          brand: { connect: { id: marca.id } },
          animals: { set: it.animals.map((s) => ({ id: idAnimal(s) })) },
          categories: { set: it.categories.map((s) => ({ id: idCat(s) })) },
        },
      });
      await prisma.productVariant.deleteMany({ where: { productId: productoId, sku: { not: it.sku } } });
      await prisma.productVariant.upsert({
        where: { sku: it.sku },
        update: { ...varData, productId: productoId },
        create: { ...varData, productId: productoId },
      });
    } else {
      creados++;
      if (dry) continue;
      await prisma.product.create({
        data: {
          ...datos,
          brand: { connect: { id: marca.id } },
          animals: { connect: it.animals.map((s) => ({ id: idAnimal(s) })) },
          categories: { connect: it.categories.map((s) => ({ id: idCat(s) })) },
          variants: { create: [varData] },
        },
      });
    }
  }

  console.log(
    `\n✓ ${dry ? 'Se crearían' : 'Creados'}: ${creados} · ${dry ? 'se actualizarían' : 'actualizados'}: ${actualizados}. (No se borra nada.)`,
  );
  if (!dry) {
    for (const bslug of brandSlugs) {
      const marca = marcas.get(bslug);
      const n = await prisma.product.count({ where: { brandId: marca.id, active: true } });
      console.log(`  ${bslug}: ${n} productos activos.`);
    }
  }
}

main()
  .catch((e) => {
    console.error('ERROR:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
