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
import { createHmac } from 'node:crypto';

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

/**
 * Una dirección de entrega VÁLIDA para las pruebas.
 *
 * Desde la Fase 2D el checkout exige un código postal canario, así que toda
 * prueba que quiera llegar más allá de esa comprobación necesita una dirección
 * de verdad. Está aquí y no copiada en cada fichero para que el día que cambie
 * la zona no haya que buscarla en veintiún sitios.
 *
 * Las pruebas de la propia regla viven en `zona-envio.test.ts` y usan sus
 * propias direcciones, buenas y malas.
 */
export const DIRECCION_CANARIA = {
  name: 'Nombre Apellido',
  address: 'Calle Real 1',
  city: 'La Laguna',
  zip: '38201',
} as const;

/* ── Webhooks de Stripe ─────────────────────────────────────────────────── */

/**
 * El secreto con el que se firman los eventos en las pruebas.
 *
 * Vive aquí y no copiado en cada fichero: desde la Fase 2E son tres suites las
 * que necesitan mandar un webhook firmado, y tener tres copias del mecanismo es
 * la forma de que dos se queden atrás cuando cambie.
 */
export const SECRETO_WEBHOOK = 'whsec_secreto_solo_de_pruebas';

/** Firma un cuerpo igual que lo hace Stripe, para poder probar el camino real. */
export function firmarWebhook(
  cuerpo: string,
  secreto = SECRETO_WEBHOOK,
  ts = Math.floor(Date.now() / 1000),
) {
  const firma = createHmac('sha256', secreto).update(`${ts}.${cuerpo}`).digest('hex');
  return `t=${ts},v1=${firma}`;
}

/** Un evento de Stripe tal y como llega en el cuerpo de la petición. */
export const eventoStripe = (id: string, type: string, datos: Record<string, unknown>) =>
  JSON.stringify({ id, type, data: { object: datos } });

/**
 * Un pedido PENDIENTE con su stock ya reservado, como lo deja el checkout.
 *
 * `reservedUntil` se puede fijar en el pasado para simular una reserva vencida
 * sin esperar media hora de verdad.
 */
export async function crearPedidoPendiente(opciones: {
  cantidad?: number;
  stock?: number;
  reservedUntil?: Date | null;
  email?: string;
  userId?: string;
} = {}) {
  const cantidad = opciones.cantidad ?? 1;
  const { producto, variante } = await crearProducto({ stock: opciones.stock ?? 10 });

  const pedido = await prisma.order.create({
    data: {
      email: opciones.email ?? 'cliente@ejemplo.test',
      userId: opciones.userId,
      subtotal: 20 * cantidad,
      shipping: 4.95,
      total: 20 * cantidad + 4.95,
      status: 'PENDING',
      stockCommitted: true,
      reservedUntil:
        opciones.reservedUntil === undefined
          ? new Date(Date.now() + 30 * 60_000)
          : opciones.reservedUntil,
      accessToken: unico('tok'),
      shippingName: DIRECCION_CANARIA.name,
      shippingAddress: DIRECCION_CANARIA.address,
      shippingCity: DIRECCION_CANARIA.city,
      shippingZip: DIRECCION_CANARIA.zip,
      items: {
        create: {
          productId: producto.id,
          variantId: variante.id,
          name: producto.name,
          variantLabel: variante.label,
          unitPrice: 20,
          quantity: cantidad,
        },
      },
    },
  });

  // El stock ya estaría descontado: se refleja para que el estado sea real.
  await prisma.productVariant.update({
    where: { id: variante.id },
    data: { stock: { decrement: cantidad } },
  });

  return { pedido, producto, variante, cantidad };
}

/** Un proveedor de correo de mentira: cuenta lo que se le manda y no sale a la red. */
export function proveedorFalso(opciones: { falla?: boolean } = {}) {
  const enviados: { para: string; asunto: string; html: string; texto: string }[] = [];
  return {
    nombre: 'falso',
    enviados,
    async enviar(mensaje: { para: string; asunto: string; html: string; texto: string }) {
      if (opciones.falla) throw new Error('El proveedor de correo ha fallado');
      enviados.push(mensaje);
    },
  };
}
