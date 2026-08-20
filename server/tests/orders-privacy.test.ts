/**
 * CONTRATO DE PRIVACIDAD DE PEDIDOS.
 *
 * El defecto: `GET /api/orders/:id` no pedía autenticación y devolvía el pedido
 * completo —nombre, dirección, ciudad, código postal, email y líneas—. El
 * comentario del código lo justificaba con «id cuid, no adivinable».
 *
 * Eso no es una defensa, es una esperanza. El identificador viaja en la URL de
 * `/checkout/success?order=<id>`: queda en el historial del navegador, en la
 * cabecera `Referer` hacia terceros, y en cualquier enlace que alguien comparta.
 * Son datos personales, así que el fallo no es sólo técnico.
 *
 * El modelo que se fija: el pedido lo ve su dueño autenticado, o un
 * administrador, o quien presente el TOKEN DE ACCESO que se generó al crearlo.
 * Ese token es un secreto de 32 bytes, no un identificador, y es lo que permite
 * que un cliente sin cuenta vea su propia confirmación sin abrir el pedido a
 * todo el mundo.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import { prisma, limpiar, crearUsuario } from './helpers.js';

async function app() {
  const { createApp } = await import('../src/app.js');
  return createApp();
}

const tokenDe = (u: { id: string; email: string; role: string }) =>
  jwt.sign({ id: u.id, email: u.email, role: u.role }, process.env.JWT_SECRET as string, {
    expiresIn: '7d',
  });

let contador = 0;

async function crearPedido(userId?: string) {
  return prisma.order.create({
    data: {
      email: 'victima@ejemplo.test',
      userId,
      accessToken: `token-de-prueba-${Date.now()}-${contador++}`,
      subtotal: 50,
      shipping: 0,
      total: 50,
      shippingName: 'Nombre Apellido',
      shippingAddress: 'Calle Real 1',
      shippingCity: 'La Laguna',
      shippingZip: '38201',
    },
  });
}

/** Ninguna respuesta puede contener datos personales del pedido ajeno. */
function noFiltraDatos(cuerpo: unknown) {
  const texto = JSON.stringify(cuerpo ?? {});
  expect(texto).not.toMatch(/victima@ejemplo\.test/);
  expect(texto).not.toMatch(/Nombre Apellido/);
  expect(texto).not.toMatch(/Calle Real 1/);
  expect(texto).not.toMatch(/38201/);
}

beforeEach(async () => {
  await limpiar();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('acceso anónimo', () => {
  it('sin credencial no se ve el pedido', async () => {
    const pedido = await crearPedido();
    const res = await request(await app()).get(`/api/orders/${pedido.id}`);

    expect(res.status).toBeGreaterThanOrEqual(401);
    noFiltraDatos(res.body);
  });
});

describe('acceso de otro cliente', () => {
  it('el cliente B no puede leer el pedido del cliente A', async () => {
    const a = await crearUsuario('CUSTOMER');
    const b = await crearUsuario('CUSTOMER');
    const pedido = await crearPedido(a.id);

    const res = await request(await app())
      .get(`/api/orders/${pedido.id}`)
      .set('Cookie', [`token=${tokenDe(b)}`]);

    expect(res.status).toBeGreaterThanOrEqual(401);
    noFiltraDatos(res.body);
  });

  it('el dueño sí puede leer el suyo', async () => {
    const a = await crearUsuario('CUSTOMER');
    const pedido = await crearPedido(a.id);

    const res = await request(await app())
      .get(`/api/orders/${pedido.id}`)
      .set('Cookie', [`token=${tokenDe(a)}`]);

    expect(res.status).toBe(200);
    expect(res.body.order?.id).toBe(pedido.id);
  });
});

describe('administración', () => {
  it('un administrador puede leer cualquier pedido', async () => {
    const admin = await crearUsuario('ADMIN');
    const pedido = await crearPedido();

    const res = await request(await app())
      .get(`/api/orders/${pedido.id}`)
      .set('Cookie', [`token=${tokenDe(admin)}`]);

    expect(res.status).toBe(200);
  });
});

describe('credenciales rotas o falsificadas', () => {
  for (const [nombre, cookie] of [
    ['un token con basura', 'token=esto-no-es-un-jwt'],
    ['un token firmado con otra clave', `token=${jwt.sign({ id: 'x', email: 'x@x.t', role: 'ADMIN' }, 'clave-equivocada')}`],
    ['un token vacío', 'token='],
  ] as const) {
    it(`${nombre} no da acceso`, async () => {
      const pedido = await crearPedido();
      const res = await request(await app())
        .get(`/api/orders/${pedido.id}`)
        .set('Cookie', [cookie]);

      expect(res.status).toBeGreaterThanOrEqual(401);
      noFiltraDatos(res.body);
    });
  }

  it('un token caducado no da acceso', async () => {
    const admin = await crearUsuario('ADMIN');
    const caducado = jwt.sign(
      { id: admin.id, email: admin.email, role: 'ADMIN' },
      process.env.JWT_SECRET as string,
      { expiresIn: -10 },
    );
    const pedido = await crearPedido();

    const res = await request(await app())
      .get(`/api/orders/${pedido.id}`)
      .set('Cookie', [`token=${caducado}`]);

    expect(res.status).toBeGreaterThanOrEqual(401);
    noFiltraDatos(res.body);
  });
});

describe('enumeración', () => {
  it('un identificador desconocido responde igual que uno ajeno', async () => {
    /*
     * Si un pedido inexistente diera 404 y uno ajeno 403, la diferencia
     * permitiría averiguar qué identificadores existen. Los dos casos tienen que
     * ser indistinguibles desde fuera.
     */
    const pedido = await crearPedido();
    const servidor = await app();

    const ajeno = await request(servidor).get(`/api/orders/${pedido.id}`);
    const inventado = await request(servidor).get('/api/orders/cmxxxxxxxxxxxxxxxxxxxxxxx');

    expect(ajeno.status).toBe(inventado.status);
    noFiltraDatos(ajeno.body);
  });

  for (const malformado of ['../../etc/passwd', '%00', 'null', '1 OR 1=1', 'a'.repeat(500)]) {
    it(`un identificador malformado (${malformado.slice(0, 14)}…) falla sin filtrar`, async () => {
      const res = await request(await app()).get(`/api/orders/${encodeURIComponent(malformado)}`);
      expect(res.status).toBeGreaterThanOrEqual(400);
      noFiltraDatos(res.body);
    });
  }
});
