/**
 * SIEMBRA DEL PRIMER PRODUCTO REAL.
 *
 * Alpha Spirit · The Only One · pato, saco de 12 kg, SKU 8436586310301.
 *
 * Idempotente: se puede ejecutar las veces que haga falta. Existe como script y
 * no dentro de `seed.ts` porque aquélla puebla el catálogo de demostración y
 * ésta carga mercancía real; mezclarlas haría que sembrar la demo pisara los
 * productos de verdad.
 *
 *   npx tsx prisma/sembrar-alpha-spirit.ts
 *
 * ── Dos datos que NO se inventan ───────────────────────────────────────────
 *
 * · PRECIO. No aparece en ninguno de los archivos. Se deja en 0, que la ficha
 *   interpreta como «pendiente» y muestra como tal, en vez de anunciar
 *   «0,00 €» — que sí sería mentira en una tienda que cobra.
 * · STOCK. Ivan pidió publicarlo con 0 unidades hasta cargar existencias.
 *
 * Con 0 unidades el producto se ve entero pero no se puede comprar, así que un
 * precio pendiente no puede acabar en ningún cobro.
 */

import { PrismaClient } from '@prisma/client';
import { CONTENIDO, IMAGEN, SKU_12KG } from './producto-alpha-spirit-pato.js';

const prisma = new PrismaClient();

const SLUG = 'alpha-spirit-the-only-one-pato-12kg';
const CATEGORIA_LINEA = 'alpha-spirit-alimentacion-perro';
const CATEGORIA_MADRE = 'alimentacion-seca-perros';

async function main() {
  /* ── Marca ───────────────────────────────────────────────────────────── */
  const marca =
    (await prisma.brand.findUnique({ where: { slug: 'alpha-spirit' } })) ??
    (await prisma.brand.create({
      data: {
        name: 'Alpha Spirit',
        slug: 'alpha-spirit',
        /*
         * SIN LOGOTIPO. La Fase 2H quitó los logos de picsum —una foto
         * cualquiera presentada como el logo de la marca— y no hay uno real
         * que poner. Vacío es honesto; inventado, no.
         */
        logoUrl: '',
        featured: false,
      },
    }));

  /* ── Categorías y animal ─────────────────────────────────────────────── */
  const linea = await prisma.category.findUnique({ where: { slug: CATEGORIA_LINEA } });
  const madre = await prisma.category.findUnique({ where: { slug: CATEGORIA_MADRE } });
  const perro = await prisma.animal.findUnique({ where: { slug: 'perro' } });

  if (!linea || !madre || !perro) {
    throw new Error(
      'Falta la taxonomía de perros. Ejecuta antes `sembrar-taxonomia-perros.ts`: ' +
        'el producto cuelga de ella y no se siembra suelto.',
    );
  }

  /*
   * Se asocia a la línea de marca Y a su categoría madre.
   *
   * Así aparece tanto en «Alpha Spirit alimentación perro» como en «Todo en
   * alimentación seca perros», que es lo que espera quien navega por el menú.
   * Sin la madre, el enlace de «Todo en…» llevaría a una lista vacía teniendo
   * producto debajo.
   */
  const categorias = { connect: [{ id: linea.id }, { id: madre.id }] };

  const datos = {
    name: 'Alpha Spirit The Only One Pato',
    description: CONTENIDO.descripcion[0],
    brandId: marca.id,
    // Pendiente: no está en la documentación. Ver la nota de cabecera.
    price: 0,
    compareAt: null,
    image: IMAGEN,
    // Una sola fotografía real. No se fabrican vistas adicionales.
    gallery: [IMAGEN],
    featured: false,
    bestseller: false,
    active: true,
    contenido: CONTENIDO as object,
  };

  const existente = await prisma.product.findUnique({ where: { slug: SLUG } });

  const producto = existente
    ? await prisma.product.update({
        where: { slug: SLUG },
        data: { ...datos, categories: { set: [], ...categorias }, animals: { set: [{ id: perro.id }] } },
      })
    : await prisma.product.create({
        data: { slug: SLUG, ...datos, categories: categorias, animals: { connect: [{ id: perro.id }] } },
      });

  /* ── Formato ─────────────────────────────────────────────────────────── */
  /*
   * Sólo el saco de 12 kg. El documento menciona también uno de 3 kg, pero el
   * único SKU que se ha facilitado es el de 12 kg y el modelo exige un SKU
   * único por formato: inventarle uno al de 3 kg sería fabricar un código de
   * barras que no existe.
   */
  const variante = await prisma.productVariant.findUnique({ where: { sku: SKU_12KG } });
  if (variante) {
    await prisma.productVariant.update({
      where: { sku: SKU_12KG },
      data: { productId: producto.id, label: '12 kg', price: 0, stock: 0 },
    });
  } else {
    await prisma.productVariant.create({
      data: { productId: producto.id, label: '12 kg', price: 0, sku: SKU_12KG, stock: 0 },
    });
  }

  console.log(`Producto sembrado: ${producto.name}`);
  console.log(`  /producto/${SLUG}`);
  console.log(`  formato 12 kg · SKU ${SKU_12KG} · stock 0 · precio PENDIENTE`);
  console.log(`  categorías: ${linea.name} + ${madre.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
