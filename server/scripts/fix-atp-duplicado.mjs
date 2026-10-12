/**
 * LIMPIEZA MARCA ATP (duplicado de Atlantic Pet).
 *
 * «ATP» es la misma fábrica que Atlantic Pet (rango de SKU 8437029279xxx). En la
 * tienda aparecía como una marca aparte, lo que no debe pasar.
 *
 *  1. Borra el producto duplicado de seca: ATP ULTRA WILDERNESS PUPPY MEDIUM &
 *     LARGE 12KG (ya existe como Atlantic). Al de Atlantic se le pone precio
 *     56,99 € y su SKU correcta (el de Atlantic tenía una errata de 14 dígitos;
 *     el válido es 8437029279186).
 *  2. Reasigna el RESTO de productos de ATP a la marca Atlantic Pet (son suyos:
 *     arena aglomerante, juguete, gato, húmeda…), para no perder catálogo.
 *  3. Elimina la marca ATP, que queda vacía.
 *
 * Re-ejecutable. Uso: DATABASE_URL="…" node scripts/fix-atp-duplicado.mjs [--dry-run]
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const dry = process.argv.includes('--dry-run');

async function main() {
  console.log(dry ? '· SIMULACIÓN ·\n' : '· APLICANDO ·\n');
  const atp = await prisma.brand.findUnique({ where: { slug: 'atp' } });
  const atlantic = await prisma.brand.findUnique({ where: { slug: 'atlantic' } });
  if (!atlantic) throw new Error('No existe la marca Atlantic.');
  if (!atp) { console.log('La marca ATP ya no existe. Nada que hacer.'); return; }

  // 1) Borrar el duplicado wilderness de seca
  const dupSlug = 'atp-ultra-wilderness-puppy-medium-large-12kg';
  const dup = await prisma.product.findUnique({ where: { slug: dupSlug }, select: { id: true } });
  if (dup) {
    const ped = await prisma.orderItem.count({ where: { productId: dup.id } }).catch(() => 0);
    if (ped > 0) throw new Error(`El duplicado tiene ${ped} pedidos; no se borra.`);
    console.log(`Borrar duplicado ${dupSlug}`);
    if (!dry) await prisma.product.delete({ where: { id: dup.id } });
  } else console.log(`(${dupSlug} ya no existe)`);

  // 2) Atlantic wilderness: precio 56,99 y SKU correcta (ya libre tras borrar el dup)
  const good = await prisma.product.findUnique({
    where: { slug: 'atlantic-ultra-wilderness-puppy-medium-large-12-kg' },
    select: { id: true, price: true, variants: { select: { id: true, sku: true } } },
  });
  if (good) {
    const v = good.variants[0];
    console.log(`Atlantic wilderness: precio ${good.price} -> 56.99 · sku ${v?.sku} -> 8437029279186`);
    if (!dry) {
      await prisma.product.update({ where: { id: good.id }, data: { price: 56.99 } });
      if (v) await prisma.productVariant.update({ where: { id: v.id }, data: { price: 56.99, sku: '8437029279186' } });
    }
  } else console.log('(no se encontró el producto Atlantic wilderness)');

  // 3) Reasignar el resto de ATP a Atlantic y borrar la marca ATP
  const resto = await prisma.product.findMany({ where: { brandId: atp.id }, select: { id: true, slug: true } });
  console.log(`\nReasignar ${resto.length} productos de ATP -> Atlantic Pet:`);
  for (const p of resto) console.log('   ·', p.slug);
  if (!dry && resto.length) {
    await prisma.product.updateMany({ where: { brandId: atp.id }, data: { brandId: atlantic.id } });
  }
  // nodos de categoría que apunten a la marca ATP (menú) -> desvincular
  if (!dry) {
    await prisma.category.updateMany({ where: { brandId: atp.id }, data: { brandId: null } });
    await prisma.brand.delete({ where: { id: atp.id } });
  }
  console.log('\n✓ Marca ATP eliminada.');

  if (!dry) {
    const quedan = await prisma.product.count({ where: { brand: { slug: 'atp' } } }).catch(() => 'n/a');
    const existeAtp = await prisma.brand.findUnique({ where: { slug: 'atp' } });
    console.log(`Comprobación: marca ATP existe = ${Boolean(existeAtp)} · productos ATP = ${quedan}`);
  }
}
main().catch((e) => { console.error('ERROR:', e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
