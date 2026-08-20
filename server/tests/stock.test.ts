/**
 * CONTRATO DE EXISTENCIAS.
 *
 * El defecto: `buildOrder()` leía el precio de la variante pero nunca su
 * `stock`, y no había en todo el proyecto un solo punto que lo descontara. Se
 * podían comprar 99 sacos de algo agotado, y el panel seguía diciendo lo mismo
 * después de vender.
 *
 * La regla es dura y no admite pedidos pendientes: **el stock disponible es un
 * límite superior**. No hay reservas anticipadas ni ventas contra reposición
 * porque el negocio no las tiene definidas, y no me las voy a inventar.
 *
 * La parte de concurrencia es la que obliga a usar una base de datos de verdad.
 * Con `stock = 1` y dos compradores a la vez, un mock diría lo que le pidiéramos;
 * sólo PostgreSQL puede demostrar que el descuento condicional es atómico.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';

import { prisma, limpiar, crearProducto, stockDe } from './helpers.js';

async function app() {
  const { createApp } = await import('../src/app.js');
  return createApp();
}

/** Petición de checkout con una clave de Stripe presente pero inservible. */
async function comprar(productId: string, variantId: string | undefined, quantity: unknown) {
  process.env.STRIPE_SECRET_KEY = 'sk_test_clave_de_prueba_sin_valor';
  return request(await app())
    .post('/api/checkout')
    .send({
      email: 'cliente@ejemplo.test',
      items: [{ productId, variantId, quantity }],
    });
}

beforeEach(async () => {
  await limpiar();
});

afterAll(async () => {
  await prisma.$disconnect();
});

/* ══ 1. El stock es un techo ════════════════════════════════════════════ */

describe('el stock disponible limita lo que se puede pedir', () => {
  it('con stock 0 no se puede comprar', async () => {
    const { producto, variante } = await crearProducto({ stock: 0 });
    const res = await comprar(producto.id, variante.id, 1);

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(String(res.body.error ?? '')).toMatch(/stock|disponib|existencias/i);
  });

  it('con stock 1 y cantidad 2 se rechaza', async () => {
    const { producto, variante } = await crearProducto({ stock: 1 });
    const res = await comprar(producto.id, variante.id, 2);

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(await stockDe(variante.id)).toBe(1);
  });

  it('una cantidad enorme se rechaza sin tocar el stock', async () => {
    const { producto, variante } = await crearProducto({ stock: 10 });
    const res = await comprar(producto.id, variante.id, 999999);

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(await stockDe(variante.id)).toBe(10);
  });
});

/* ══ 2. La cantidad tiene que ser un entero positivo ═══════════════════ */

describe('validación de la cantidad', () => {
  for (const [nombre, valor] of [
    ['cero', 0],
    ['negativa', -3],
    ['decimal', 1.5],
    ['texto', 'dos'],
    ['nula', null],
  ] as const) {
    it(`una cantidad ${nombre} se rechaza`, async () => {
      const { producto, variante } = await crearProducto({ stock: 10 });
      const res = await comprar(producto.id, variante.id, valor);

      expect(res.status).toBe(400);
      expect(await stockDe(variante.id)).toBe(10);
      expect(await prisma.order.count()).toBe(0);
    });
  }
});

/* ══ 3. El producto y la variante tienen que existir y corresponderse ══ */

describe('identidad del producto y de la variante', () => {
  it('un producto inexistente se rechaza', async () => {
    const res = await comprar('producto-que-no-existe', undefined, 1);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it('una variante inexistente se rechaza en lugar de caer al precio base', async () => {
    /*
     * Antes, una variante desconocida se ignoraba en silencio y el pedido se
     * cobraba al precio del producto. Un saco de 12 kg pedido con un id de
     * variante inventado se cobraba como el de 3 kg.
     */
    const { producto } = await crearProducto({ stock: 10, precio: 20 });
    const res = await comprar(producto.id, 'variante-que-no-existe', 1);

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(await prisma.order.count()).toBe(0);
  });

  it('una variante de OTRO producto se rechaza', async () => {
    const a = await crearProducto({ stock: 10 });
    const b = await crearProducto({ stock: 10 });
    const res = await comprar(a.producto.id, b.variante.id, 1);

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(await stockDe(b.variante.id)).toBe(10);
  });
});

/* ══ 4. Concurrencia: la última unidad es de uno solo ══════════════════ */

describe('dos compradores por la última unidad', () => {
  it('sólo uno se la lleva', async () => {
    const { producto, variante } = await crearProducto({ stock: 1 });
    process.env.STRIPE_SECRET_KEY = 'sk_test_clave_de_prueba_sin_valor';

    const servidor = await app();
    const intento = () =>
      request(servidor)
        .post('/api/checkout')
        .send({
          email: 'cliente@ejemplo.test',
          items: [{ productId: producto.id, variantId: variante.id, quantity: 1 }],
        });

    const [a, b] = await Promise.all([intento(), intento()]);

    // Ninguno puede acabar en éxito de pago (no hay Stripe válido), pero lo que
    // importa es el stock: no puede quedar negativo bajo ninguna combinación.
    const restante = await stockDe(variante.id);
    expect(restante).toBeGreaterThanOrEqual(0);

    // Y como mucho UNA de las dos peticiones puede haber pasado la reserva.
    const reservas = [a, b].filter((r) => r.status < 400).length;
    expect(reservas).toBeLessThanOrEqual(1);
  });

  it('diez compradores simultáneos no dejan el stock negativo', async () => {
    const { producto, variante } = await crearProducto({ stock: 3 });
    process.env.STRIPE_SECRET_KEY = 'sk_test_clave_de_prueba_sin_valor';

    const servidor = await app();
    await Promise.all(
      Array.from({ length: 10 }, () =>
        request(servidor)
          .post('/api/checkout')
          .send({
            email: 'cliente@ejemplo.test',
            items: [{ productId: producto.id, variantId: variante.id, quantity: 1 }],
          }),
      ),
    );

    const restante = await stockDe(variante.id);
    expect(restante).toBeGreaterThanOrEqual(0);
    expect(restante).toBeLessThanOrEqual(3);
  });
});
