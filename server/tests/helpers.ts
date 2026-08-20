/**
 * Utilidades compartidas por las pruebas.
 *
 * Todas las suites trabajan contra una base de datos PostgreSQL REAL, no contra
 * un doble de Prisma. Es deliberado: lo que se está comprobando —que dos
 * compradores no puedan llevarse la misma última unidad, que un webhook repetido
 * no descuente dos veces— son garantías del motor de base de datos. Un mock
 * devolvería lo que le pidamos y probaría exactamente nada.
 */

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

/** Deja la base de datos vacía respetando el orden de las claves ajenas. */
export async function limpiar() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.animal.deleteMany();
  await prisma.category.deleteMany();
  await prisma.need.deleteMany();
  await prisma.contactMessage.deleteMany();
  await prisma.stripeEvent.deleteMany();
  await prisma.user.deleteMany();
}

let n = 0;
const unico = (p: string) => `${p}-${Date.now()}-${n++}`;

/** Crea un producto con una variante y el stock indicado. */
export async function crearProducto(opciones: { precio?: number; stock?: number; precioVariante?: number } = {}) {
  const marca = await prisma.brand.create({
    data: { name: unico('Marca'), slug: unico('marca') },
  });
  const producto = await prisma.product.create({
    data: {
      name: unico('Producto'),
      slug: unico('producto'),
      description: 'Descripción de prueba.',
      brandId: marca.id,
      price: opciones.precio ?? 20,
      image: 'https://ejemplo.test/imagen.jpg',
      gallery: [],
      variants: {
        create: {
          label: '3 kg',
          price: opciones.precioVariante ?? opciones.precio ?? 20,
          sku: unico('SKU'),
          stock: opciones.stock ?? 10,
        },
      },
    },
    include: { variants: true },
  });
  return { marca, producto, variante: producto.variants[0] };
}

/** Lee el stock actual de una variante. */
export async function stockDe(variantId: string) {
  const v = await prisma.productVariant.findUnique({ where: { id: variantId } });
  return v?.stock ?? null;
}

export async function crearUsuario(rol: 'CUSTOMER' | 'ADMIN' = 'CUSTOMER') {
  return prisma.user.create({
    data: {
      email: unico('persona') + '@ejemplo.test',
      // Hash de prueba: no corresponde a ninguna contraseña usable.
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUVWXYZ012',
      role: rol,
    },
  });
}
