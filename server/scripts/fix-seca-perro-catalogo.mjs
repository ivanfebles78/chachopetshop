/**
 * RECONCILIACIÓN — PERRO · ALIMENTACIÓN SECA (marcas del zip de evopet).
 *
 * Reconstruye, a partir de `plan.json` (generado del Excel + CSV del proveedor),
 * TODO el catálogo de Perro / Alimentación seca para las marcas Atlantic Pet,
 * Optima Nova, NaturaCanarias y Energy Pet:
 *
 *  · Una ficha POR FORMATO (3 kg y 14 kg son dos fichas), cada una con su SKU
 *    correcta, su imagen y su línea de marca (Premium Recetas, Profesional…).
 *  · Crea las marcas que faltan (Optima Nova, NaturaCanarias, Energy Pet).
 *  · Etiqueta todo con animal=perro y categoría=alimentacion-seca para que
 *    aparezca y se filtre bien.
 *
 * Es RE-EJECUTABLE: borra los productos en alcance (identificados por SKU del
 * plan o por ser Atlantic de perro/seca) y los vuelve a crear. PRESERVA el
 * precio y el stock que ya hubiera por SKU (los que no se importaron quedan
 * «a consultar», como el resto del catálogo hasta que se ponga precio).
 *
 * Uso:  DATABASE_URL="postgresql://…" node scripts/fix-seca-perro-catalogo.mjs [--dry-run] <plan.json>
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';

const prisma = new PrismaClient();
const dry = process.argv.includes('--dry-run');
const planPath = process.argv.find((a) => a.endsWith('.json'));
if (!planPath) throw new Error('Falta la ruta de plan.json');
const plan = JSON.parse(readFileSync(planPath, 'utf8'));
const items = plan.items;

const BRANDS = {
  atlantic: 'Atlantic Pet',
  'optima-nova': 'Optima Nova',
  naturacanarias: 'NaturaCanarias',
  'energy-pet': 'Energy Pet',
};

const baseSku = (s) => s.replace(/-\d+$/, '');

function descripcionLarga(it) {
  const linea = it.line ? `, línea ${it.line}` : '';
  const fmt = it.formatoLabel ? ` Formato: ${it.formatoLabel}.` : '';
  return `${it.brandName} — ${it.descripcion}. Alimentación seca completa para perro${linea}.${fmt}`;
}

async function main() {
  console.log(dry ? '· SIMULACIÓN ·\n' : '· APLICANDO ·\n');
  console.log(`Plan: ${items.length} productos (por formato).`);

  // SKUs duplicados en el plan -> abortar (cada formato debe ser único)
  const vistos = new Map();
  for (const it of items) {
    if (vistos.has(it.sku)) throw new Error(`SKU duplicado en el plan: ${it.sku}`);
    vistos.set(it.sku, it);
  }

  // Animal perro + categoría seca
  const perro = await prisma.animal.findUnique({ where: { slug: 'perro' } });
  const seca = await prisma.category.findUnique({ where: { slug: 'alimentacion-seca' } });
  if (!perro || !seca) throw new Error('Falta animal "perro" o categoría "alimentacion-seca".');

  // Marcas (crear las que falten)
  const brandId = {};
  for (const [slug, name] of Object.entries(BRANDS)) {
    let b = await prisma.brand.findUnique({ where: { slug } });
    if (!b) {
      console.log(`  Crear marca "${name}" (${slug})`);
      if (!dry) b = await prisma.brand.create({ data: { slug, name } });
    } else if (b.name !== name) {
      console.log(`  Marca ${slug}: "${b.name}" -> "${name}"`);
      if (!dry) b = await prisma.brand.update({ where: { id: b.id }, data: { name } });
    }
    brandId[slug] = b ? b.id : `(nueva:${slug})`;
  }

  // Preservar precio/stock existentes por SKU (y por SKU base, p.ej. Pavo -14)
  const planSkus = items.map((i) => i.sku);
  const baseSkus = [...new Set(items.map((i) => baseSku(i.sku)))];
  const existentes = await prisma.productVariant.findMany({
    where: { OR: [{ sku: { in: planSkus } }, { sku: { in: baseSkus } }] },
    select: { sku: true, price: true, stock: true, productId: true },
  });
  const precioStock = new Map();
  for (const v of existentes) precioStock.set(v.sku, { price: v.price, stock: v.stock });
  const preserva = (sku) => precioStock.get(sku) ?? precioStock.get(baseSku(sku)) ?? { price: null, stock: 0 };

  // Productos a borrar: por variante con SKU del plan/base, o Atlantic perro+seca
  const idsPorSku = new Set(existentes.map((v) => v.productId));
  const atlanticSeca = await prisma.product.findMany({
    where: { brand: { slug: 'atlantic' }, animals: { some: { slug: 'perro' } }, categories: { some: { slug: 'alimentacion-seca' } } },
    select: { id: true },
  });
  for (const p of atlanticSeca) idsPorSku.add(p.id);
  const borrarIds = [...idsPorSku];
  console.log(`\nProductos en alcance a reemplazar: ${borrarIds.length}`);

  // Seguridad: no borrar nada que tenga pedidos
  let conPedidos = 0;
  try { conPedidos = await prisma.orderItem.count({ where: { productId: { in: borrarIds } } }); } catch {}
  if (conPedidos > 0) throw new Error(`ABORTA: ${conPedidos} líneas de pedido referencian productos en alcance.`);
  console.log(`Líneas de pedido afectadas: 0 (seguro borrar).`);

  if (!dry) {
    await prisma.product.deleteMany({ where: { id: { in: borrarIds } } });
  }

  // Recrear
  let creados = 0;
  const slugsUsados = new Set();
  for (const it of items) {
    const { price, stock } = preserva(it.sku);
    let slug = it.slug ?? it.image?.split('/').pop()?.replace('.webp', '') ?? null;
    // El plan ya trae slug único en su conjunto; por si choca con algo externo,
    // se comprueba contra la BD y se sufija.
    slug = slug || it.sku.toLowerCase();
    if (slugsUsados.has(slug)) slug = `${slug}-${it.sku.toLowerCase().slice(-4)}`;
    slugsUsados.add(slug);
    if (!dry) {
      const existe = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
      if (existe) slug = `${slug}-${it.sku.toLowerCase().replace(/[^a-z0-9]/g, '').slice(-5)}`;
      await prisma.product.create({
        data: {
          name: it.name,
          slug,
          description: descripcionLarga(it),
          brand: { connect: { id: brandId[it.brandSlug] } },
          line: it.line ?? null,
          price: price ?? null,
          image: it.image || '',
          gallery: it.image ? [it.image] : [],
          animals: { connect: { id: perro.id } },
          categories: { connect: { id: seca.id } },
          variants: {
            create: [{
              label: it.formatoLabel ?? '',
              sku: it.sku,
              price: price ?? null,
              stock: stock ?? 0,
              quantity: it.quantityG ?? null,
              unit: it.quantityG ? 'g' : null,
              packUnits: 1,
            }],
          },
        },
      });
    }
    creados++;
  }
  console.log(`\n✓ ${dry ? 'se crearían' : 'creados'} ${creados} productos.`);

  if (!dry) {
    const n = await prisma.product.count({
      where: { brand: { slug: 'atlantic' }, animals: { some: { slug: 'perro' } }, categories: { some: { slug: 'alimentacion-seca' } } },
    });
    console.log(`Comprobación: Atlantic Pet · perro · seca = ${n} productos.`);
  }
}

main().catch((e) => { console.error('ERROR:', e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
