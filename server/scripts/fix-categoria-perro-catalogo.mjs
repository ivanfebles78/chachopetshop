/**
 * RECONCILIACIÓN GENÉRICA — PERRO · <categoría del plan>.
 *
 * Igual que fix-humeda-perro-catalogo.mjs pero la categoría se toma del propio
 * plan (campo `category` de cada item), para reutilizarlo en semihúmeda u otras.
 * Reconstruye el catálogo de esa categoría para las marcas presentes en el plan,
 * una ficha por formato con SKU, imagen, línea y ficha (contenido). Preserva
 * precio/stock por SKU. Re-ejecutable.
 *
 * Uso: DATABASE_URL="…" node scripts/fix-categoria-perro-catalogo.mjs [--dry-run] <plan.json>
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
  const catSlugs = [...new Set(items.map((i) => i.category))];
  if (catSlugs.length !== 1) throw new Error('El plan mezcla categorías: ' + catSlugs);
  const catSlug = catSlugs[0];
  console.log(`Categoría: ${catSlug} · ${items.length} productos (por formato).`);

  const skus = items.map((i) => i.sku);
  if (new Set(skus).size !== skus.length) throw new Error('SKU duplicados en el plan.');

  const perro = await prisma.animal.findUnique({ where: { slug: 'perro' } });
  const cat = await prisma.category.findUnique({ where: { slug: catSlug } });
  if (!perro || !cat) throw new Error(`Falta animal "perro" o categoría "${catSlug}".`);

  const brandDefs = Object.values(Object.fromEntries(items.map((i) => [i.brandSlug, { slug: i.brandSlug, name: i.brandName }])));
  const brandId = {};
  for (const { slug, name } of brandDefs) {
    let b = await prisma.brand.findUnique({ where: { slug } });
    if (!b) { console.log(`  Crear marca "${name}" (${slug})`); if (!dry) b = await prisma.brand.create({ data: { slug, name } }); }
    brandId[slug] = b ? b.id : `(nueva:${slug})`;
  }
  const brandIds = Object.values(brandId).filter((x) => typeof x === 'string' && !x.startsWith('(nueva'));

  const baseSkus = [...new Set(skus.map(baseSku))];
  const ex = await prisma.productVariant.findMany({
    where: { OR: [{ sku: { in: skus } }, { sku: { in: baseSkus } }] },
    select: { sku: true, price: true, stock: true, productId: true },
  });
  const ps = new Map(ex.map((v) => [v.sku, { price: v.price, stock: v.stock }]));
  const preserva = (sku) => ps.get(sku) ?? ps.get(baseSku(sku)) ?? { price: null, stock: 0 };

  const ids = new Set(ex.map((v) => v.productId));
  const enCat = await prisma.product.findMany({
    where: { brandId: { in: brandIds }, animals: { some: { slug: 'perro' } }, categories: { some: { slug: catSlug } } },
    select: { id: true },
  });
  for (const p of enCat) ids.add(p.id);
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
      || `${it.brandName} — ${it.descripcion}. Alimentación semihúmeda para perro${it.line ? `, línea ${it.line}` : ''}.`;
    if (!dry) {
      const existe = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
      if (existe) slug = `${slug}-${it.sku.toLowerCase().replace(/[^a-z0-9]/g, '').slice(-5)}`;
      await prisma.product.create({
        data: {
          name: it.name, slug, description: desc.slice(0, 500),
          brand: { connect: { id: brandId[it.brandSlug] } },
          line: it.line ?? null, price: price ?? null,
          image: it.image || '', gallery: it.image ? [it.image] : [],
          contenido: it.contenido ?? undefined,
          animals: { connect: { id: perro.id } },
          categories: { connect: { id: cat.id } },
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
    const n = await prisma.product.count({ where: { animals: { some: { slug: 'perro' } }, categories: { some: { slug: catSlug } } } });
    console.log(`Comprobación: perro · ${catSlug} = ${n} productos.`);
  }
}
main().catch((e) => { console.error('ERROR:', e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
