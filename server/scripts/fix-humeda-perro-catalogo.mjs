/**
 * RECONCILIACIÓN — PERRO · ALIMENTACIÓN HÚMEDA (desde el Excel v2 de evopet).
 *
 * Reconstruye el catálogo de Perro/Alimentación húmeda desde plan_humeda.json:
 * Atlantic Pet (26: Gourmet Experience + Húmedos), Piper, Alpha Spirit, Disugual,
 * Iberian. Una ficha POR FORMATO con su SKU, imagen (transparente), línea de
 * marca y FICHA COMPLETA (contenido: todo el texto del fabricante).
 *
 * Re-ejecutable. Borra en alcance (por SKU del plan o por ser de una de estas
 * marcas en perro/húmeda) preservando precio/stock existentes por SKU, y recrea.
 *
 * Uso: DATABASE_URL="…" node scripts/fix-humeda-perro-catalogo.mjs [--dry-run] <plan_humeda.json>
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
const prisma = new PrismaClient();
const dry = process.argv.includes('--dry-run');
const planPath = process.argv.find((a) => a.endsWith('.json'));
const items = JSON.parse(readFileSync(planPath, 'utf8')).items;
const baseSku = (s) => s.replace(/-\d+$/, '');

async function main() {
  console.log(dry ? '· SIMULACIÓN ·\n' : '· APLICANDO ·\n');
  console.log(`Plan: ${items.length} productos (húmeda, por formato).`);

  const skus = items.map((i) => i.sku);
  if (new Set(skus).size !== skus.length) throw new Error('Hay SKU duplicados en el plan.');

  const perro = await prisma.animal.findUnique({ where: { slug: 'perro' } });
  const hum = await prisma.category.findUnique({ where: { slug: 'alimentacion-humeda' } });
  if (!perro || !hum) throw new Error('Falta animal "perro" o categoría "alimentacion-humeda".');

  // Marcas del plan (crear las que falten)
  const brandDefs = Object.values(
    Object.fromEntries(items.map((i) => [i.brandSlug, { slug: i.brandSlug, name: i.brandName }])),
  );
  const brandId = {};
  for (const { slug, name } of brandDefs) {
    let b = await prisma.brand.findUnique({ where: { slug } });
    if (!b) { console.log(`  Crear marca "${name}" (${slug})`); if (!dry) b = await prisma.brand.create({ data: { slug, name } }); }
    brandId[slug] = b ? b.id : `(nueva:${slug})`;
  }
  const brandIds = Object.values(brandId).filter((x) => typeof x === 'string' && !x.startsWith('(nueva'));

  // Preservar precio/stock por SKU
  const baseSkus = [...new Set(skus.map(baseSku))];
  const ex = await prisma.productVariant.findMany({
    where: { OR: [{ sku: { in: skus } }, { sku: { in: baseSkus } }] },
    select: { sku: true, price: true, stock: true, productId: true },
  });
  const ps = new Map(ex.map((v) => [v.sku, { price: v.price, stock: v.stock }]));
  const preserva = (sku) => ps.get(sku) ?? ps.get(baseSku(sku)) ?? { price: null, stock: 0 };

  // Productos a reemplazar: por SKU del plan, o de estas marcas en perro/húmeda
  const ids = new Set(ex.map((v) => v.productId));
  const enMarcaHum = await prisma.product.findMany({
    where: { brandId: { in: brandIds }, animals: { some: { slug: 'perro' } }, categories: { some: { slug: 'alimentacion-humeda' } } },
    select: { id: true },
  });
  for (const p of enMarcaHum) ids.add(p.id);
  const borrar = [...ids];
  console.log(`\nProductos en alcance a reemplazar: ${borrar.length}`);
  let ped = 0; try { ped = await prisma.orderItem.count({ where: { productId: { in: borrar } } }); } catch {}
  if (ped > 0) throw new Error(`ABORTA: ${ped} líneas de pedido referencian productos en alcance.`);
  console.log('Líneas de pedido afectadas: 0 (seguro).');
  if (!dry) await prisma.product.deleteMany({ where: { id: { in: borrar } } });

  let creados = 0;
  const usados = new Set();
  for (const it of items) {
    const { price, stock } = preserva(it.sku);
    let slug = it.slug;
    if (usados.has(slug)) slug = `${slug}-${it.sku.toLowerCase().slice(-4)}`;
    usados.add(slug);
    const desc = (it.descripcionCorta && it.descripcionCorta.trim())
      || `${it.brandName} — ${it.descripcion}. Alimentación húmeda para perro${it.line ? `, línea ${it.line}` : ''}.`;
    if (!dry) {
      const existe = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
      if (existe) slug = `${slug}-${it.sku.toLowerCase().replace(/[^a-z0-9]/g, '').slice(-5)}`;
      await prisma.product.create({
        data: {
          name: it.name, slug, description: desc.slice(0, 500),
          brand: { connect: { id: brandId[it.brandSlug] } },
          line: it.line ?? null,
          price: price ?? null,
          image: it.image || '', gallery: it.image ? [it.image] : [],
          contenido: it.contenido ?? undefined,
          animals: { connect: { id: perro.id } },
          categories: { connect: { id: hum.id } },
          variants: { create: [{
            label: it.formatoLabel ?? '', sku: it.sku, price: price ?? null, stock: stock ?? 0,
            quantity: it.quantityG ?? null, unit: it.quantityG ? 'g' : null, packUnits: it.packUnits ?? 1,
          }] },
        },
      });
    }
    creados++;
  }
  console.log(`\n✓ ${dry ? 'se crearían' : 'creados'} ${creados} productos.`);
  if (!dry) {
    const n = await prisma.product.count({ where: { brand: { slug: 'atlantic' }, animals: { some: { slug: 'perro' } }, categories: { some: { slug: 'alimentacion-humeda' } } } });
    console.log(`Comprobación: Atlantic Pet · perro · húmeda = ${n} productos.`);
  }
}
main().catch((e) => { console.error('ERROR:', e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
