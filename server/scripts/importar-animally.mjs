/**
 * IMPORTA EL CATÁLOGO ANIMALLY (perro y gato) — cosmética, higiene y suplementos.
 *
 * Lee `prisma/catalogo-animally.json` (extraído de evopetnutricion.com, categoría
 * «ANIMALLY PERRO Y GATO») y deja la marca Animally en la base EXACTAMENTE como
 * dice el plan: una ficha por formato, con SKU del proveedor, precio, imagen,
 * línea (tipo de producto), animales, categorías y ficha completa (contenido).
 *
 *   · IDEMPOTENTE: se puede relanzar. Busca cada producto por SKU (y si no, por
 *     slug) y lo actualiza; si no existe, lo crea.
 *   · PRESERVA lo que gestiona la tienda: si una variante ya tenía precio o
 *     stock, se conservan. El precio del plan sólo se usa cuando no había.
 *   · LIMPIA la marca: cualquier producto de Animally que no esté en el plan se
 *     borra (o se desactiva si tiene pedidos, para no romper el histórico).
 *   · Crea la marca si falta. Las categorías y animales deben existir.
 *
 * Uso (desde server/):
 *   DATABASE_URL="…" node scripts/importar-animally.mjs --dry-run
 *   DATABASE_URL="…" node scripts/importar-animally.mjs
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const prisma = new PrismaClient();
const dry = process.argv.includes('--dry-run');
const aqui = path.dirname(fileURLToPath(import.meta.url));
const planPath = process.argv.find((a) => a.endsWith('.json')) ?? path.join(aqui, '../prisma/catalogo-animally.json');
const { items } = JSON.parse(readFileSync(planPath, 'utf8'));

const MARCA = { slug: 'animally', name: 'Animally' };

async function main() {
  console.log(dry ? '· SIMULACIÓN (no se escribe nada) ·\n' : '· APLICANDO ·\n');
  console.log(`Plan: ${items.length} productos Animally.`);

  // ── Validación del plan ────────────────────────────────────────────────
  const skus = items.map((i) => i.sku);
  const slugs = items.map((i) => i.slug);
  if (new Set(skus).size !== skus.length) throw new Error('SKU duplicados en el plan.');
  if (new Set(slugs).size !== slugs.length) throw new Error('Slugs duplicados en el plan.');
  if (items.some((i) => i.brandSlug !== MARCA.slug)) throw new Error('El plan contiene productos de otra marca.');

  // ── Referencias ────────────────────────────────────────────────────────
  const aniSlugs = [...new Set(items.flatMap((i) => i.animals))];
  const catSlugs = [...new Set(items.flatMap((i) => i.categories))];
  const animales = await prisma.animal.findMany({ where: { slug: { in: aniSlugs } } });
  const cats = await prisma.category.findMany({ where: { slug: { in: catSlugs } } });
  const faltanA = aniSlugs.filter((s) => !animales.some((a) => a.slug === s));
  const faltanC = catSlugs.filter((s) => !cats.some((c) => c.slug === s));
  if (faltanA.length) throw new Error(`Faltan animales: ${faltanA.join(', ')}`);
  if (faltanC.length) throw new Error(`Faltan categorías: ${faltanC.join(', ')}`);
  const idAnimal = (s) => animales.find((a) => a.slug === s).id;
  const idCat = (s) => cats.find((c) => c.slug === s).id;

  let marca = await prisma.brand.findUnique({ where: { slug: MARCA.slug } });
  if (!marca) {
    console.log(`  Crear marca "${MARCA.name}" (${MARCA.slug})`);
    if (!dry) marca = await prisma.brand.create({ data: MARCA });
  }

  // ── Alta / actualización ───────────────────────────────────────────────
  let creados = 0;
  let actualizados = 0;
  const idsPlan = new Set();
  for (const it of items) {
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
      gallery: [it.image],
      contenido: it.contenido,
      active: true,
    };
    const varData = {
      label: it.formato.label,
      sku: it.sku,
      price,
      stock,
      quantity: it.formato.quantity,
      unit: it.formato.unit,
      packUnits: 1,
    };

    if (productoId) {
      actualizados++;
      idsPlan.add(productoId);
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
      const p = await prisma.product.create({
        data: {
          ...datos,
          brand: { connect: { id: marca.id } },
          animals: { connect: it.animals.map((s) => ({ id: idAnimal(s) })) },
          categories: { connect: it.categories.map((s) => ({ id: idCat(s) })) },
          variants: { create: [varData] },
        },
      });
      idsPlan.add(p.id);
    }
  }

  // ── Limpieza: fuera de la marca lo que no está en el plan ──────────────
  let borrados = 0;
  let desactivados = 0;
  if (marca) {
    const sobran = await prisma.product.findMany({
      where: { brandId: marca.id, id: { notIn: [...idsPlan] } },
      select: { id: true, name: true, active: true },
    });
    for (const p of sobran) {
      let ped = 0;
      try { ped = await prisma.orderItem.count({ where: { productId: p.id } }); } catch {}
      if (ped > 0) {
        if (!p.active) continue;
        console.log(`  Desactivar (tiene pedidos): ${p.name}`);
        desactivados++;
        if (!dry) await prisma.product.update({ where: { id: p.id }, data: { active: false } });
      } else {
        console.log(`  Borrar (no está en el plan): ${p.name}`);
        borrados++;
        if (!dry) await prisma.product.delete({ where: { id: p.id } });
      }
    }
  }

  console.log(`\n✓ ${dry ? 'Se crearían' : 'Creados'}: ${creados} · ${dry ? 'se actualizarían' : 'actualizados'}: ${actualizados} · retirados: ${borrados} borrados, ${desactivados} desactivados.`);
  if (!dry && marca) {
    const n = await prisma.product.count({ where: { brandId: marca.id, active: true } });
    console.log(`Comprobación: marca ${MARCA.slug} = ${n} productos activos (plan: ${items.length}).`);
    if (n !== items.length) process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error('ERROR:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
