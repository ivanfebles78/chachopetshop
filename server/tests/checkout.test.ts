/**
 * CONTRATO DE PAGO — el checkout tiene que fallar CERRADO.
 *
 * El defecto que motiva este fichero: `checkout.ts` comprobaba
 * `if (!stripe)` y, sin clave configurada, marcaba el pedido como `PAID` y
 * devolvía éxito. En local es un modo demo cómodo. En producción es una tienda
 * que regala el pedido, y lo peor es que no se nota: nada falla, nada avisa, los
 * pedidos entran marcados como pagados.
 *
 * La regla que se fija aquí es una sola, y todo lo demás se deriva de ella:
 *
 *   PAID es un estado de negocio VERIFICADO. Sólo lo escribe un webhook de
 *   Stripe con firma válida cuyo pago está efectivamente cobrado.
 *
 * Ni la ausencia de Stripe, ni un error de Stripe, ni el cliente pidiéndolo, ni
 * una ruta de desarrollo pueden producirlo.
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';

import { prisma, limpiar, crearProducto, stockDe } from './helpers.js';

async function app() {
  const { createApp } = await import('../src/app.js');
  return createApp();
}

beforeEach(async () => {
  vi.resetModules();
  await limpiar();
});

afterAll(async () => {
  await prisma.$disconnect();
});

/* ══ 1. Sin Stripe no hay venta ═════════════════════════════════════════ */

describe('sin configuración de Stripe', () => {
  it('el checkout se rechaza en lugar de regalar el pedido', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const { variante, producto } = await crearProducto({ stock: 5, precio: 20 });

    const res = await request(await app())
      .post('/api/checkout')
      .send({
        email: 'cliente@ejemplo.test',
        items: [{ productId: producto.id, variantId: variante.id, quantity: 1 }],
      });

    // Cualquier 2xx aquí es dinero perdido.
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(JSON.stringify(res.body)).not.toMatch(/success|url/i);
  });

  it('no deja NINGÚN pedido pagado detrás', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const { variante, producto } = await crearProducto({ stock: 5 });

    await request(await app())
      .post('/api/checkout')
      .send({
        email: 'cliente@ejemplo.test',
        items: [{ productId: producto.id, variantId: variante.id, quantity: 1 }],
      });

    const pagados = await prisma.order.count({ where: { status: 'PAID' } });
    expect(pagados).toBe(0);
  });

  it('no toca el stock', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const { variante, producto } = await crearProducto({ stock: 5 });

    await request(await app())
      .post('/api/checkout')
      .send({
        email: 'cliente@ejemplo.test',
        items: [{ productId: producto.id, variantId: variante.id, quantity: 3 }],
      });

    expect(await stockDe(variante.id)).toBe(5);
  });
});

/* ══ 2. El cliente no decide el estado ni el precio ═════════════════════ */

describe('el cliente no manda sobre la verdad comercial', () => {
  it('un `status: PAID` en el cuerpo se ignora', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const { variante, producto } = await crearProducto({ stock: 5 });

    await request(await app())
      .post('/api/checkout')
      .send({
        email: 'cliente@ejemplo.test',
        status: 'PAID',
        paid: true,
        items: [{ productId: producto.id, variantId: variante.id, quantity: 1 }],
      });

    expect(await prisma.order.count({ where: { status: 'PAID' } })).toBe(0);
  });

  it('un precio enviado por el cliente no se usa', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_clave_invalida_de_prueba';
    const { variante, producto } = await crearProducto({ stock: 5, precioVariante: 62.9 });

    await request(await app())
      .post('/api/checkout')
      .send({
        email: 'cliente@ejemplo.test',
        items: [{ productId: producto.id, variantId: variante.id, quantity: 1, unitPrice: 0.01, price: 0.01 }],
      });

    const pedido = await prisma.order.findFirst({ include: { items: true } });
    if (pedido) {
      // Si llega a crearse un pedido, su importe sale SIEMPRE de la base de datos.
      expect(Number(pedido.items[0].unitPrice)).toBe(62.9);
      expect(Number(pedido.subtotal)).toBe(62.9);
    }
  });
});

/* ══ 3. Un fallo de Stripe no es una venta ═════════════════════════════ */

describe('cuando Stripe falla', () => {
  it('una clave inválida no produce un pedido pagado', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_esta_clave_no_existe_en_stripe';
    const { variante, producto } = await crearProducto({ stock: 5 });

    const res = await request(await app())
      .post('/api/checkout')
      .send({
        email: 'cliente@ejemplo.test',
        items: [{ productId: producto.id, variantId: variante.id, quantity: 1 }],
      });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(await prisma.order.count({ where: { status: 'PAID' } })).toBe(0);
  });
});

/* ══ 4. Producción no puede encender el modo demo sin querer ═══════════ */

describe('separación entre desarrollo y producción', () => {
  it('el código no contiene ninguna ruta que marque PAID sin webhook', async () => {
    /*
     * Comprobación sobre el código, no sobre el comportamiento: el modo demo
     * anterior era UNA LÍNEA dentro de un `if`. Una prueba de comportamiento
     * sólo lo detecta si se acierta con la condición que lo activaba; leer el
     * fichero detecta cualquier reaparición, se active como se active.
     */
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const fuente = readFileSync(resolve(process.cwd(), 'src/routes/checkout.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');

    const escrituras = [...fuente.matchAll(/status:\s*'PAID'/g)];
    // Sólo puede haber una, y tiene que estar en el manejador del webhook.
    expect(escrituras.length).toBeLessThanOrEqual(1);
    if (escrituras.length === 1) {
      const posicion = escrituras[0].index ?? 0;
      const webhook = fuente.indexOf('stripeWebhookHandler');
      expect(posicion).toBeGreaterThan(webhook);
    }
  });
});
