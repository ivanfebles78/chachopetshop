/**
 * ARREGLO DE DATOS — ATLANTIC PET · LÍNEA SECA · PREMIUM RECETAS (PERRO)
 *
 * Qué hace, y por qué, sobre los 4 productos de la gama «Premium Recetas» de
 * Atlantic Pet para perro (Pollo, Pavo, Salmón y Puppy Pollo):
 *
 *  1. Renombra la MARCA «Atlantic» → «Atlantic Pet» (el nombre de pila real de
 *     la marca; el slug `atlantic` no cambia, así que los enlaces siguen válidos).
 *  2. FUSIONA las tallas de un mismo producto en UNA ficha con varios formatos:
 *     el pienso de 3 kg y el de 14/15 kg no son dos productos, son dos tamaños
 *     del mismo. Se conserva la ficha de la talla pequeña como canónica y se le
 *     mueve la variante de la talla grande; la ficha sobrante se elimina.
 *  3. Deja el NOMBRE limpio —sin marca ni talla— porque la marca ya se enseña
 *     encima y la talla pasa a ser el formato elegible: «Pollo Fresco».
 *  4. Pone IMAGEN con fondo transparente, DESCRIPCIÓN y FICHA enriquecida
 *     (titular, descripción, características) sacadas del envase del fabricante,
 *     la LÍNEA «Premium Recetas» y la etiqueta de animal PERRO (Pollo, Pavo y
 *     Salmón no la tenían, así que no salían en el catálogo de perro).
 *
 * Es IDEMPOTENTE: se identifica por SKU (EAN-13, estable). Si ya está aplicado,
 * no vuelve a mover ni a borrar nada.
 *
 * Uso (contra la base que indique DATABASE_URL):
 *   DATABASE_URL="postgresql://…" node scripts/fix-atlantic-premium-recetas.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** «3 kg», «14 kg»… a partir de los gramos normalizados de la variante. */
function etiquetaFormato(variant) {
  if (variant.quantity && variant.unit === 'g') {
    const kg = variant.quantity / 1000;
    return `${Number.isInteger(kg) ? kg : kg.toFixed(1)} kg`;
  }
  return variant.label; // sin tamaño normalizado, se deja como está
}

const GRUPOS = [
  {
    base: 'Pollo Fresco',
    slug: 'atlantic-pet-pollo-fresco',
    image: '/productos/atlantic/pollo-fresco.webp',
    canonicalSku: '8437019521103', // 3 kg
    absorbSkus: ['8437019521097'], // 14 kg
    description:
      'Receta Granjera con pollo fresco para perros adultos. Un 64 % de proteína animal, con cereales integrales y guisantes, para una digestión fácil y una piel y un pelo sanos. Formulado y recomendado por veterinarios.',
    contenido: {
      titular: 'Receta Granjera con pollo fresco',
      descripcion: [
        'Alimento completo para perros adultos elaborado con pollo fresco como principal fuente de proteína.',
        'Aporta un 64 % de proteína animal, junto con cereales integrales y guisantes, para un buen desarrollo y mantenimiento muscular y una digestión fácil.',
        'Producto altamente digestible, pensado para una piel y un pelo sanos. Formulado y recomendado por veterinarios.',
      ],
      caracteristicas: {
        titulo: 'Por qué le va a gustar',
        puntos: [
          '64 % de proteína animal con pollo fresco',
          'Con cereales integrales y guisantes',
          'Altamente digestible, para piel y pelo sanos',
          'Receta con ingredientes naturales',
          'Formulado y recomendado por veterinarios',
        ],
      },
    },
  },
  {
    base: 'Pavo Fresco',
    slug: 'atlantic-pet-pavo-fresco',
    image: '/productos/atlantic/pavo-fresco.webp',
    canonicalSku: '8437019521073', // 14 kg (formato único)
    absorbSkus: [],
    description:
      'Receta con pavo fresco para perros adultos. Un 64 % de proteína animal, con una proteína magra y muy digestible, cereales integrales y guisantes. Para una piel y un pelo sanos. Formulado y recomendado por veterinarios.',
    contenido: {
      titular: 'Receta con pavo fresco',
      descripcion: [
        'Alimento completo para perros adultos con pavo fresco, una proteína magra, muy digestible y de alto valor biológico.',
        'Aporta un 64 % de proteína animal junto con cereales integrales y guisantes, para un buen desarrollo muscular y una digestión fácil.',
        'Producto altamente digestible, para una piel y un pelo sanos. Formulado y recomendado por veterinarios.',
      ],
      caracteristicas: {
        titulo: 'Por qué le va a gustar',
        puntos: [
          '64 % de proteína animal con pavo fresco',
          'Proteína magra y muy digestible',
          'Con cereales integrales y guisantes',
          'Receta con ingredientes naturales',
          'Formulado y recomendado por veterinarios',
        ],
      },
    },
  },
  {
    base: 'Salmón Fresco',
    slug: 'atlantic-pet-salmon-fresco',
    image: '/productos/atlantic/salmon-fresco.webp',
    canonicalSku: '8437019521066', // 3 kg
    absorbSkus: ['8437019521059'], // 15 kg
    description:
      'Receta con salmón fresco para perros adultos. Un 64 % de proteína animal rica en Omega-3, con cereales integrales y guisantes, para una piel y un pelo sanos. Formulado y recomendado por veterinarios.',
    contenido: {
      titular: 'Receta con salmón fresco',
      descripcion: [
        'Alimento completo para perros adultos con salmón fresco, fuente de proteínas de calidad y de ácidos grasos Omega-3.',
        'Un 64 % de proteína animal junto con cereales integrales y guisantes, para una digestión fácil y un pelaje brillante.',
        'Especialmente indicado para el cuidado de la piel y el pelo. Producto altamente digestible, formulado y recomendado por veterinarios.',
      ],
      caracteristicas: {
        titulo: 'Por qué le va a gustar',
        puntos: [
          '64 % de proteína animal con salmón fresco',
          'Rico en Omega-3, para piel y pelo',
          'Con cereales integrales y guisantes',
          'Receta con ingredientes naturales',
          'Formulado y recomendado por veterinarios',
        ],
      },
    },
  },
  {
    base: 'Puppy Pollo Fresco',
    slug: 'atlantic-pet-puppy-pollo-fresco',
    image: '/productos/atlantic/puppy-pollo-fresco.webp',
    canonicalSku: '8437019521127', // 3 kg
    absorbSkus: ['8437019521110'], // 15 kg
    description:
      'Receta Granjera para cachorros de todas las razas con pollo fresco. Un 71 % de proteína animal para acompañar el crecimiento, con cereales integrales y guisantes. Producto altamente digestible. Formulado y recomendado por veterinarios.',
    contenido: {
      titular: 'Puppy · Receta Granjera con pollo fresco',
      descripcion: [
        'Alimento completo para cachorros de todas las razas, con pollo fresco como principal fuente de proteína.',
        'Su mayor aporte de proteína animal —un 71 %— acompaña el crecimiento y el desarrollo muscular del cachorro, con cereales integrales y guisantes para una digestión fácil.',
        'Producto altamente digestible, para una piel y un pelo sanos. Formulado y recomendado por veterinarios.',
      ],
      caracteristicas: {
        titulo: 'Por qué le va a gustar',
        puntos: [
          '71 % de proteína animal con pollo fresco',
          'Formulado para el crecimiento del cachorro',
          'Para todas las razas',
          'Con cereales integrales y guisantes',
          'Altamente digestible · recomendado por veterinarios',
        ],
      },
    },
  },
];

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log(dryRun ? '· MODO SIMULACIÓN (no escribe) ·\n' : '· APLICANDO CAMBIOS ·\n');

  // 0) Marca «Atlantic» → «Atlantic Pet».
  const marca = await prisma.brand.findUnique({ where: { slug: 'atlantic' } });
  if (!marca) throw new Error('No existe la marca con slug "atlantic".');
  if (marca.name !== 'Atlantic Pet') {
    console.log(`Marca: "${marca.name}" → "Atlantic Pet"`);
    if (!dryRun) await prisma.brand.update({ where: { id: marca.id }, data: { name: 'Atlantic Pet' } });
  } else {
    console.log('Marca: ya es "Atlantic Pet" (sin cambios)');
  }

  const perro = await prisma.animal.findUnique({ where: { slug: 'perro' } });
  const seca = await prisma.category.findUnique({ where: { slug: 'alimentacion-seca' } });
  if (!perro || !seca) throw new Error('Falta el animal "perro" o la categoría "alimentacion-seca".');

  for (const g of GRUPOS) {
    console.log(`\n── ${g.base} ───────────────────────────`);

    const vCanon = await prisma.productVariant.findUnique({ where: { sku: g.canonicalSku } });
    if (!vCanon) {
      console.log(`  ⚠ No se encuentra la variante canónica SKU ${g.canonicalSku}; se salta.`);
      continue;
    }
    const canonId = vCanon.productId;

    // 1) Absorber las variantes de las otras tallas y borrar su ficha sobrante.
    for (const sku of g.absorbSkus) {
      const v = await prisma.productVariant.findUnique({ where: { sku } });
      if (!v) {
        console.log(`  ⚠ No se encuentra la variante a fusionar SKU ${sku}; se salta esa talla.`);
        continue;
      }
      if (v.productId === canonId) {
        console.log(`  · Talla SKU ${sku} ya fusionada`);
        continue;
      }
      const viejaFichaId = v.productId;
      console.log(`  · Fusiona variante SKU ${sku}: producto ${viejaFichaId} → ${canonId}, y borra ficha sobrante`);
      if (!dryRun) {
        await prisma.productVariant.update({ where: { id: v.id }, data: { productId: canonId } });
        const quedan = await prisma.productVariant.count({ where: { productId: viejaFichaId } });
        if (quedan === 0) await prisma.product.delete({ where: { id: viejaFichaId } });
      }
    }

    // 2) Normalizar etiquetas de formato de todas las variantes del canónico.
    const variantes = await prisma.productVariant.findMany({ where: { productId: canonId } });
    const precios = variantes.map((v) => (v.price == null ? null : Number(v.price))).filter((x) => x != null);
    const precioDesde = precios.length ? Math.min(...precios) : null;
    for (const v of variantes) {
      const etiqueta = etiquetaFormato(v);
      if (etiqueta !== v.label) {
        console.log(`  · Formato: "${v.label}" → "${etiqueta}"`);
        if (!dryRun) await prisma.productVariant.update({ where: { id: v.id }, data: { label: etiqueta } });
      }
    }

    // 3) Actualizar la ficha canónica: nombre, slug, imagen, descripción, ficha, línea, precio, perro.
    console.log(`  · Ficha: name="${g.base}", slug="${g.slug}", line="Premium Recetas", precio desde=${precioDesde}, imagen y ficha enriquecida, animal=perro`);
    if (!dryRun) {
      await prisma.product.update({
        where: { id: canonId },
        data: {
          name: g.base,
          slug: g.slug,
          line: 'Premium Recetas',
          image: g.image,
          gallery: [g.image],
          description: g.description,
          contenido: g.contenido,
          price: precioDesde,
          animals: { connect: { id: perro.id } },
          categories: { connect: { id: seca.id } },
        },
      });
    }
  }

  console.log('\n✓ Listo.');
}

main()
  .catch((e) => {
    console.error('ERROR:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
