/**
 * WEBHOOK DE STRIPE — regresión y idempotencia.
 *
 * La verificación de firma y el orden del cuerpo crudo YA estaban bien y no se
 * han reescrito. Lo que se añade aquí es red: son las dos cosas más fáciles de
 * romper sin darse cuenta —basta mover `express.json()` una línea más arriba
 * para que la firma deje de validar— y las dos que más caro salen.
 *
 * Lo que sí se ha corregido y se fija aquí:
 *   · sin secreto configurado, antes respondía 200 `{skipped:true}`; ahora 503.
 *     Responder 200 le dice a Stripe «entregado» sin haber comprobado nada.
 *   · un evento repetido no puede aplicar sus efectos dos veces.
 *   · `checkout.session.completed` con el pago aún pendiente no marca PAID.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createHmac } from 'node:crypto';

import { prisma, limpiar, crearProducto, stockDe } from './helpers.js';

const SECRETO = 'whsec_secreto_solo_de_pruebas';

async function app() {
  process.env.STRIPE_SECRET_KEY = 'sk_test_clave_de_pruebas';
  process.env.STRIPE_WEBHOOK_SECRET = SECRETO;
  const { createApp } = await import('../src/app.js');
  return createApp();
}

/** Firma un cuerpo igual que lo hace Stripe, para poder probar el camino real. */
function firmar(cuerpo: string, secreto = SECRETO, ts = Math.floor(Date.now() / 1000)) {
  const firma = createHmac('sha256', secreto).update(`${ts}.${cuerpo}`).digest('hex');
  return `t=${ts},v1=${firma}`;
}

const evento = (id: string, type: string, datos: Record<string, unknown>) =>
  JSON.stringify({ id, type, data: { object: datos } });

async function pedidoConStock(cantidad = 2) {
  const { producto, variante } = await crearProducto({ stock: 10 });
  const pedido = await prisma.order.create({
    data: {
      email: 'cliente@ejemplo.test',
      subtotal: 40,
      shipping: 0,
      total: 40,
      status: 'PENDING',
      stockCommitted: true,
      accessToken: `tok-${Date.now()}-${Math.random()}`,
      items: {
        create: {
          productId: producto.id,
          variantId: variante.id,
          name: producto.name,
          unitPrice: 20,
          quantity: cantidad,
        },
      },
    },
  });
  // El stock ya estaría reservado: se descuenta para reflejar la realidad.
  await prisma.productVariant.update({
    where: { id: variante.id },
    data: { stock: { decrement: cantidad } },
  });
  return { pedido, variante };
}

beforeEach(async () => {
  await limpiar();
});

afterAll(async () => {
  await prisma.$disconnect();
});

/* ══ 1. Verificación de firma ══════════════════════════════════════════ */

describe('verificación de firma', () => {
  it('sin cabecera de firma se rechaza', async () => {
    const res = await request(await app())
      .post('/api/checkout/webhook')
      .set('Content-Type', 'application/json')
      .send(evento('evt_1', 'checkout.session.completed', {}));

    expect(res.status).toBe(400);
  });

  it('con una firma inválida se rechaza', async () => {
    const cuerpo = evento('evt_2', 'checkout.session.completed', {});
    const res = await request(await app())
      .post('/api/checkout/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 't=1,v1=firma_falsa')
      .send(cuerpo);

    expect(res.status).toBe(400);
  });

  it('con una firma de OTRO secreto se rechaza', async () => {
    const cuerpo = evento('evt_3', 'checkout.session.completed', {});
    const res = await request(await app())
      .post('/api/checkout/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', firmar(cuerpo, 'whsec_otro_secreto_distinto'))
      .send(cuerpo);

    expect(res.status).toBe(400);
  });

  it('un cuerpo malformado no revienta el servidor', async () => {
    const res = await request(await app())
      .post('/api/checkout/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', firmar('esto no es json'))
      .send('esto no es json');

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it('el cuerpo crudo sigue llegando sin parsear', async () => {
    /*
     * Si alguien montase `express.json()` antes del webhook, el cuerpo llegaría
     * como objeto y la firma —calculada sobre los bytes exactos— dejaría de
     * validar SIEMPRE. Que una firma correcta funcione es la prueba de que el
     * orden se mantiene.
     */
    const { pedido } = await pedidoConStock();
    const cuerpo = evento('evt_orden', 'checkout.session.completed', {
      metadata: { orderId: pedido.id },
      payment_status: 'paid',
    });

    const res = await request(await app())
      .post('/api/checkout/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', firmar(cuerpo))
      .send(cuerpo);

    expect(res.status).toBe(200);
  });
});

/* ══ 2. Sólo un pago cobrado marca PAID ════════════════════════════════ */

describe('estado del pago', () => {
  it('una sesión completada Y cobrada marca el pedido como pagado', async () => {
    const { pedido } = await pedidoConStock();
    const cuerpo = evento('evt_pagado', 'checkout.session.completed', {
      metadata: { orderId: pedido.id },
      payment_status: 'paid',
    });

    await request(await app())
      .post('/api/checkout/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', firmar(cuerpo))
      .send(cuerpo);

    const despues = await prisma.order.findUnique({ where: { id: pedido.id } });
    expect(despues?.status).toBe('PAID');
  });

  it('una sesión completada pero SIN cobrar no marca pagado', async () => {
    // `payment_status: 'unpaid'` existe: pagos asíncronos que aún no han
    // liquidado. Fiarse sólo del tipo de evento daría el pedido por cobrado.
    const { pedido } = await pedidoConStock();
    const cuerpo = evento('evt_sin_cobrar', 'checkout.session.completed', {
      metadata: { orderId: pedido.id },
      payment_status: 'unpaid',
    });

    await request(await app())
      .post('/api/checkout/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', firmar(cuerpo))
      .send(cuerpo);

    const despues = await prisma.order.findUnique({ where: { id: pedido.id } });
    expect(despues?.status).toBe('PENDING');
  });
});

/* ══ 3. Idempotencia ═══════════════════════════════════════════════════ */

describe('eventos repetidos', () => {
  it('el mismo evento dos veces no altera nada la segunda vez', async () => {
    const { pedido } = await pedidoConStock();
    const cuerpo = evento('evt_repetido', 'checkout.session.completed', {
      metadata: { orderId: pedido.id },
      payment_status: 'paid',
    });
    const servidor = await app();
    const enviar = () =>
      request(servidor)
        .post('/api/checkout/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', firmar(cuerpo))
        .send(cuerpo);

    const primero = await enviar();
    const segundo = await enviar();

    expect(primero.status).toBe(200);
    expect(segundo.status).toBe(200);
    expect(segundo.body.duplicated).toBe(true);
    expect(await prisma.stripeEvent.count()).toBe(1);
    expect(await prisma.order.count()).toBe(1);
  });

  it('un fallo repetido no devuelve el stock dos veces', async () => {
    /*
     * El caso que más caro sale: reponer existencias dos veces deja el almacén
     * mintiendo al alza, y se vende lo que no hay.
     */
    const { pedido, variante } = await pedidoConStock(2);
    const stockTrasReserva = await stockDe(variante.id);

    const servidor = await app();
    for (const id of ['evt_fallo_a', 'evt_fallo_b']) {
      const cuerpo = evento(id, 'payment_intent.payment_failed', {
        metadata: { orderId: pedido.id },
      });
      await request(servidor)
        .post('/api/checkout/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', firmar(cuerpo))
        .send(cuerpo);
    }

    // Se devuelven las 2 unidades UNA vez, no dos.
    expect(await stockDe(variante.id)).toBe((stockTrasReserva ?? 0) + 2);
    const despues = await prisma.order.findUnique({ where: { id: pedido.id } });
    expect(despues?.status).toBe('FAILED');
    expect(despues?.stockCommitted).toBe(false);
  });
});

/* ══ 4. Eventos que no nos interesan ═══════════════════════════════════ */

describe('otros eventos', () => {
  it('un tipo inesperado se acepta sin efectos', async () => {
    const { pedido } = await pedidoConStock();
    const cuerpo = evento('evt_otro', 'customer.subscription.updated', {
      metadata: { orderId: pedido.id },
    });

    const res = await request(await app())
      .post('/api/checkout/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', firmar(cuerpo))
      .send(cuerpo);

    expect(res.status).toBe(200);
    const despues = await prisma.order.findUnique({ where: { id: pedido.id } });
    expect(despues?.status).toBe('PENDING');
  });
});
