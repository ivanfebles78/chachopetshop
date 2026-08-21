/**
 * PROPIEDAD DE LOS PEDIDOS — «Mis pedidos» tiene que enseñar lo que compraste.
 *
 * Defecto reportado: un cliente autenticado completa el pago con Stripe, el
 * pedido aparece en el panel de administración, y su propia cuenta dice
 * «Todavía no has hecho ningún pedido».
 *
 * Este fichero reproduce el recorrido COMPLETO con la cookie de sesión puesta,
 * que es lo que hace el navegador, en lugar de comprobar las piezas por
 * separado. Un pedido puede crearse bien y aun así no aparecer si el vínculo
 * con la cuenta se pierde en cualquiera de los tres saltos: al crear, al
 * confirmar el pago, o al consultar.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createHmac } from 'node:crypto';
import jwt from 'jsonwebtoken';

import { prisma, limpiar, crearProducto, stockDe } from './helpers.js';

const SECRETO = 'whsec_secreto_solo_de_pruebas';

async function app() {
  process.env.STRIPE_SECRET_KEY = 'sk_test_clave_de_pruebas';
  process.env.STRIPE_WEBHOOK_SECRET = SECRETO;
  const { createApp } = await import('../src/app.js');
  return createApp();
}

/** Alta real, para quedarse con la cookie que emite el servidor. */
async function registrarYEntrar(servidor: unknown, email: string) {
  const res = await request(servidor as never)
    .post('/api/auth/register')
    .send({ email, password: 'contrasena-de-prueba', name: 'Cliente' });

  expect(res.status, `el registro de ${email} debe salir bien`).toBe(200);
  const cookies = res.headers['set-cookie'] as unknown as string[];
  expect(cookies, 'el registro debe emitir la cookie de sesión').toBeTruthy();
  return { cookies, userId: res.body.user.id as string };
}

function firmar(cuerpo: string, ts = Math.floor(Date.now() / 1000)) {
  const firma = createHmac('sha256', SECRETO).update(`${ts}.${cuerpo}`).digest('hex');
  return `t=${ts},v1=${firma}`;
}

const evento = (id: string, type: string, datos: Record<string, unknown>) =>
  JSON.stringify({ id, type, data: { object: datos } });

beforeEach(async () => {
  await limpiar();
});

afterAll(async () => {
  await prisma.$disconnect();
});

/* ══ A. El pedido de quien lo compra aparece en su cuenta ══════════════ */

describe('A · un cliente autenticado ve su pedido', () => {
  it('el pedido creado con sesión queda vinculado a esa cuenta', async () => {
    const servidor = await app();
    const { cookies, userId } = await registrarYEntrar(servidor, 'ana@ejemplo.test');
    const { producto, variante } = await crearProducto({ stock: 5, precioVariante: 30 });

    await request(servidor)
      .post('/api/checkout')
      .set('Cookie', cookies)
      .send({
        email: 'ana@ejemplo.test',
        items: [{ productId: producto.id, variantId: variante.id, quantity: 1 }],
      });

    const pedido = await prisma.order.findFirst();
    expect(pedido, 'el checkout debe haber creado un pedido').toBeTruthy();
    expect(pedido!.userId, 'el pedido tiene que quedar a nombre de quien lo compró').toBe(userId);
  });

  it('«Mis pedidos» lo devuelve', async () => {
    const servidor = await app();
    const { cookies } = await registrarYEntrar(servidor, 'ana2@ejemplo.test');
    const { producto, variante } = await crearProducto({ stock: 5 });

    await request(servidor)
      .post('/api/checkout')
      .set('Cookie', cookies)
      .send({
        email: 'ana2@ejemplo.test',
        items: [{ productId: producto.id, variantId: variante.id, quantity: 1 }],
      });

    const mis = await request(servidor).get('/api/orders').set('Cookie', cookies);

    expect(mis.status).toBe(200);
    expect(mis.body.orders, '«Mis pedidos» no puede estar vacío').toHaveLength(1);
  });
});

/* ══ B-D. Nadie más lo ve ══════════════════════════════════════════════ */

describe('B · otro cliente no lo ve', () => {
  it('el historial de otra cuenta no lo incluye', async () => {
    const servidor = await app();
    const a = await registrarYEntrar(servidor, 'duenio@ejemplo.test');
    const b = await registrarYEntrar(servidor, 'ajeno@ejemplo.test');
    const { producto, variante } = await crearProducto({ stock: 5 });

    await request(servidor)
      .post('/api/checkout')
      .set('Cookie', a.cookies)
      .send({
        email: 'duenio@ejemplo.test',
        items: [{ productId: producto.id, variantId: variante.id, quantity: 1 }],
      });

    const suyos = await request(servidor).get('/api/orders').set('Cookie', b.cookies);
    expect(suyos.body.orders).toHaveLength(0);

    const pedido = await prisma.order.findFirst();
    const directo = await request(servidor)
      .get(`/api/orders/${pedido!.id}`)
      .set('Cookie', b.cookies);
    expect(directo.status).toBe(404);
  });
});

describe('D · un pedido de invitado no se le cuelga a nadie', () => {
  it('no aparece en el historial de ninguna cuenta', async () => {
    const servidor = await app();
    const { producto, variante } = await crearProducto({ stock: 5 });

    // Compra SIN cookie: invitado.
    await request(servidor)
      .post('/api/checkout')
      .send({
        email: 'invitado@ejemplo.test',
        items: [{ productId: producto.id, variantId: variante.id, quantity: 1 }],
      });

    const pedido = await prisma.order.findFirst();
    expect(pedido!.userId, 'un pedido de invitado no tiene dueño').toBeNull();

    // Alguien que se registra DESPUÉS con el mismo email no hereda el pedido:
    // el correo lo elige quien compra, y no puede ser lo que da la propiedad.
    const { cookies } = await registrarYEntrar(servidor, 'invitado@ejemplo.test');
    const mis = await request(servidor).get('/api/orders').set('Cookie', cookies);
    expect(mis.body.orders).toHaveLength(0);
  });
});

/* ══ C, E, F, G. Panel, pago, stock e idempotencia ═════════════════════ */

describe('C · el panel ve todos los pedidos', () => {
  it('un administrador consulta el pedido de otro', async () => {
    const servidor = await app();
    const { cookies } = await registrarYEntrar(servidor, 'compra@ejemplo.test');
    const { producto, variante } = await crearProducto({ stock: 5 });

    await request(servidor)
      .post('/api/checkout')
      .set('Cookie', cookies)
      .send({
        email: 'compra@ejemplo.test',
        items: [{ productId: producto.id, variantId: variante.id, quantity: 1 }],
      });

    const pedido = await prisma.order.findFirst();
    const admin = await prisma.user.create({
      data: {
        email: `admin-${Date.now()}@ejemplo.test`,
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUVWXYZ012',
        role: 'ADMIN',
      },
    });
    const { default: jwt } = await import('jsonwebtoken');
    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: 'ADMIN' },
      process.env.JWT_SECRET as string,
    );

    const res = await request(servidor)
      .get(`/api/orders/${pedido!.id}`)
      .set('Cookie', [`token=${token}`]);
    expect(res.status).toBe(200);
  });
});

describe('E-G · pago, stock e idempotencia sin perder al dueño', () => {
  it('el webhook confirma el pago, conserva el dueño y descuenta una sola vez', async () => {
    const servidor = await app();
    const { cookies, userId } = await registrarYEntrar(servidor, 'pago@ejemplo.test');
    const { producto, variante } = await crearProducto({ stock: 5 });

    /*
     * El pedido se monta como lo deja un checkout que SÍ llegó a Stripe: a
     * nombre del cliente, con la reserva hecha. No se pasa por la pasarela
     * porque la clave de pruebas no sirve y el error liberaría la reserva,
     * borrando justo lo que hay que observar.
     */
    const pedido = await prisma.order.create({
      data: {
        email: 'pago@ejemplo.test',
        userId,
        subtotal: 20,
        shipping: 4.95,
        total: 24.95,
        status: 'PENDING',
        stockCommitted: true,
        accessToken: `tok-${Date.now()}`,
        items: {
          create: {
            productId: producto.id,
            variantId: variante.id,
            name: producto.name,
            unitPrice: 20,
            quantity: 1,
          },
        },
      },
    });
    await prisma.productVariant.update({
      where: { id: variante.id },
      data: { stock: { decrement: 1 } },
    });
    expect(await stockDe(variante.id)).toBe(4);

    const cuerpo = evento('evt_propiedad', 'checkout.session.completed', {
      metadata: { orderId: pedido.id },
      payment_status: 'paid',
    });
    const enviar = () =>
      request(servidor)
        .post('/api/checkout/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', firmar(cuerpo))
        .send(cuerpo);

    expect((await enviar()).status).toBe(200);
    // G: reenvío, como hace Stripe al reintentar.
    expect((await enviar()).status).toBe(200);

    const despues = await prisma.order.findUnique({ where: { id: pedido.id } });
    expect(despues!.status).toBe('PAID');
    // El webhook no puede perder el vínculo con la cuenta.
    expect(despues!.userId).toBe(userId);
    // F: exactamente una vez, ni con el reenvío.
    expect(await stockDe(variante.id)).toBe(4);

    const mis = await request(servidor).get('/api/orders').set('Cookie', cookies);
    expect(mis.body.orders).toHaveLength(1);
    expect(mis.body.orders[0].status).toBe('PAID');
  });
});

/* ══ La causa raíz ═════════════════════════════════════════════════════ */

describe('sesión rota: el pedido NO puede quedarse sin dueño en silencio', () => {
  /**
   * ESTO ES LO QUE PASÓ EN PRODUCCIÓN.
   *
   * Al desplegar se rotó `JWT_SECRET`, como pedía la lista de comprobación. El
   * navegador del cliente siguió enviando la cookie ANTERIOR, firmada con el
   * secreto viejo. `attachUser` no la podía verificar y —esto es el defecto— se
   * la tragaba en silencio y continuaba como anónimo.
   *
   * Resultado: el cliente creía estar dentro, compró, pagó, y el pedido se
   * guardó SIN dueño. Aparece en el panel, el webhook responde 200, la página
   * de confirmación lo enseña… y «Mis pedidos» está vacío, correctamente,
   * porque el pedido no es de nadie.
   *
   * Reproducido: con una cookie firmada con otro secreto, el checkout creaba el
   * pedido con `userId = null` y devolvía éxito.
   *
   * La corrección NO es adivinar el dueño por el email —el email lo elige quien
   * compra, y adivinar sería regalar pedidos ajenos—. Es no dejar que una sesión
   * ROTA se confunda con no tener sesión.
   */
  const cookieDeOtroSecreto = () =>
    jwt.sign(
      { id: 'usuario-de-antes', email: 'cliente@ejemplo.test', role: 'CUSTOMER' },
      'el-secreto-anterior-a-la-rotacion',
    );

  it('el checkout con una cookie que ya no verifica se rechaza', async () => {
    const servidor = await app();
    const { producto, variante } = await crearProducto({ stock: 5 });

    const res = await request(servidor)
      .post('/api/checkout')
      .set('Cookie', [`token=${cookieDeOtroSecreto()}`])
      .send({
        email: 'cliente@ejemplo.test',
        items: [{ productId: producto.id, variantId: variante.id, quantity: 1 }],
      });

    expect(res.status).toBe(401);
    expect(await prisma.order.count(), 'no puede quedar un pedido huérfano').toBe(0);
    expect(await stockDe(variante.id)).toBe(5);
  });

  it('la respuesta borra la cookie inservible para que el navegador deje de mandarla', async () => {
    const servidor = await app();
    const res = await request(servidor)
      .post('/api/checkout')
      .set('Cookie', [`token=${cookieDeOtroSecreto()}`])
      .send({ email: 'x@ejemplo.test', items: [] });

    const puestas = (res.headers['set-cookie'] as unknown as string[]) ?? [];
    expect(puestas.join(';'), 'debe limpiar la cookie rota').toMatch(/token=;|token=deleted|Expires=Thu, 01 Jan 1970/);
  });

  it('navegar SÍ sigue funcionando con una cookie rota', async () => {
    // Un catálogo que deja de verse porque queda una cookie vieja sería peor
    // que el defecto. Sólo se corta donde la identidad determina el resultado.
    const servidor = await app();
    await crearProducto({ stock: 5 });

    const res = await request(servidor)
      .get('/api/products')
      .set('Cookie', [`token=${cookieDeOtroSecreto()}`]);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
  });

  it('sin ninguna cookie sigue siendo una compra de invitado normal', async () => {
    const servidor = await app();
    const { producto, variante } = await crearProducto({ stock: 5 });

    const res = await request(servidor)
      .post('/api/checkout')
      .send({
        email: 'invitado@ejemplo.test',
        items: [{ productId: producto.id, variantId: variante.id, quantity: 1 }],
      });

    // No es 401: no hay sesión rota, simplemente no hay sesión.
    expect(res.status).not.toBe(401);
  });
});
