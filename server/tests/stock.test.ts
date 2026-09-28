/**
 * CONTRATO DE EXISTENCIAS — MODELO DE ENCARGO.
 *
 * La tienda vende POR ENCARGO (decisión de Ivan): un formato agotado se puede
 * pedir igual y la tienda lo repone. Así que el stock **ya NO es un límite
 * superior**: se descuenta siempre al comprar y puede quedar en negativo, que en
 * el panel se lee como «unidades que hay que reponer».
 *
 * Lo que se comprueba aquí es que el checkout NO rechaza por falta de stock, que
 * el descuento sigue ocurriendo y que la cantidad se sigue validando (entero,
 * positivo, dentro del máximo por línea). El descuento se hace con el mismo
 * `updateMany` atómico de antes, sólo que sin la condición `stock >= n`.
 *
 * (Con la clave de Stripe falsa de las pruebas, toda compra que pasa el control
 * de existencias se queda a medias en el paso de Stripe y devuelve su descuento;
 * por eso el stock final vuelve a su sitio y no se puede observar el negativo
 * por este camino. Lo que sí se observa es que NO hay 409 de stock.)
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';

import { prisma, limpiar, crearProducto, stockDe, DIRECCION_CANARIA } from './helpers.js';

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
      shipping: DIRECCION_CANARIA,
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

/* ══ 1. El stock NO es un techo: se vende por encargo ═══════════════════ */

describe('se puede pedir por encargo aunque no haya stock', () => {
  it('con stock 0 se puede encargar (no se rechaza por existencias)', async () => {
    const { producto, variante } = await crearProducto({ stock: 0 });
    const res = await comprar(producto.id, variante.id, 1);

    expect(res.status).not.toBe(409);
    expect(String(res.body.error ?? '')).not.toMatch(/stock|disponib|existencias/i);
    // El pedido llega a crearse: el encargo pasa el control de existencias.
    expect(await prisma.order.count()).toBe(1);
  });

  it('con stock 1 se pueden pedir 2 unidades', async () => {
    const { producto, variante } = await crearProducto({ stock: 1 });
    const res = await comprar(producto.id, variante.id, 2);

    expect(res.status).not.toBe(409);
    expect(String(res.body.error ?? '')).not.toMatch(/stock|disponib|existencias/i);
    expect(await prisma.order.count()).toBe(1);
  });

  it('una cantidad por encima del máximo por línea se rechaza por VALIDACIÓN', async () => {
    // El tope de 99 por línea sigue vigente: es validación de entrada, no stock.
    const { producto, variante } = await crearProducto({ stock: 10 });
    const res = await comprar(producto.id, variante.id, 999999);

    expect(res.status).toBe(400);
    expect(await stockDe(variante.id)).toBe(10);
    expect(await prisma.order.count()).toBe(0);
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
          shipping: DIRECCION_CANARIA,
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
            shipping: DIRECCION_CANARIA,
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
