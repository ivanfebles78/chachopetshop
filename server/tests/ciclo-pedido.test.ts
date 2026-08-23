/**
 * EL CICLO DE VIDA DEL PEDIDO.
 *
 * ── Lo que estaba mal ──────────────────────────────────────────────────────
 *
 * El panel aceptaba cualquiera de cuatro estados y lo escribía encima, sin
 * comprobar nada. Se podía devolver un pedido COBRADO a `PENDING` —«no
 * pagado»— con una petición y desde un desplegable, sin querer. Y como el
 * estado de pago y el operativo eran el mismo campo, marcar «enviado» borraba
 * el rastro de que el dinero estaba cobrado.
 *
 * ── Lo que se fija aquí ────────────────────────────────────────────────────
 *
 *   1. El panel NO puede tocar el estado de pago. Eso sólo lo escribe el
 *      webhook firmado de Stripe. Es una garantía de la Fase 1.
 *   2. Nada pasa a ENVIADO ni a ENTREGADO solo. No hay integración con ninguna
 *      agencia, así que no hay ningún hecho real que pudiera dispararlo:
 *      ponerlo por tiempo sería inventarse que el pedido llegó.
 *   3. CANCELAR NO DEVUELVE EL DINERO. No llama a Stripe y no toca el estado de
 *      pago. Un reembolso automático sería exactamente el comportamiento
 *      inventado que no cabe aquí.
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';

import { prisma, limpiar, crearPedidoPendiente, crearUsuario } from './helpers.js';
import {
  admiteCambioOperativo,
  estaPagado,
  siguientesEstados,
  transicionValida,
} from '../src/lib/estados.js';

async function app() {
  const { createApp } = await import('../src/app.js');
  return createApp();
}

/** Una sesión de administrador, por la vía normal de la aplicación. */
async function sesionAdmin() {
  const admin = await crearUsuario('ADMIN');
  const { firmarToken } = await import('../src/middleware/auth.js').catch(() => ({} as never));
  return { admin, firmarToken };
}

beforeEach(async () => {
  vi.resetModules();
  process.env.STRIPE_SECRET_KEY = 'sk_test_clave_de_pruebas';
  await limpiar();
});
afterAll(() => prisma.$disconnect());

/* ══ 1. Las transiciones, en frío ═════════════════════════════════════════ */

describe('qué transiciones tienen sentido', () => {
  it('el camino normal de un pedido', () => {
    expect(transicionValida(null, 'PREPARING')).toBe(true);
    expect(transicionValida('PREPARING', 'SHIPPED')).toBe(true);
    expect(transicionValida('SHIPPED', 'DELIVERED')).toBe(true);
  });

  it('no se salta pasos hacia atrás', () => {
    expect(transicionValida('SHIPPED', 'PREPARING')).toBe(false);
    expect(transicionValida('DELIVERED', 'SHIPPED')).toBe(false);
    expect(transicionValida('DELIVERED', 'PREPARING')).toBe(false);
  });

  it('«entregado» es el final', () => {
    expect(siguientesEstados('DELIVERED')).toEqual([]);
  });

  it('«cancelado» no se deshace', () => {
    /*
     * Resucitar un pedido cancelado desde el panel sería deshacer en silencio
     * una decisión que ya se le comunicó a alguien. Si hace falta, se hace un
     * pedido nuevo.
     */
    expect(siguientesEstados('CANCELLED')).toEqual([]);
    expect(transicionValida('CANCELLED', 'PREPARING')).toBe(false);
  });

  it('se puede cancelar desde cualquier punto vivo', () => {
    expect(transicionValida(null, 'CANCELLED')).toBe(true);
    expect(transicionValida('PREPARING', 'CANCELLED')).toBe(true);
    expect(transicionValida('SHIPPED', 'CANCELLED')).toBe(true);
  });

  it('sólo se opera sobre pedidos cobrados', () => {
    expect(admiteCambioOperativo('PAID')).toBe(true);
    expect(admiteCambioOperativo('PENDING')).toBe(false);
    expect(admiteCambioOperativo('FAILED')).toBe(false);
  });

  it('FULFILLED, el valor heredado, sigue contando como pagado', () => {
    // Antes de la 2E significaba «pagado y servido». Los pedidos que ya existen
    // en producción no pueden dejar de estar pagados por una migración.
    expect(estaPagado('FULFILLED')).toBe(true);
    expect(admiteCambioOperativo('FULFILLED')).toBe(true);
  });
});

/* ══ 2. El panel ══════════════════════════════════════════════════════════ */

describe('el panel mueve el estado operativo', () => {
  const cambiar = async (orderId: string, fulfillment: string, cookie?: string) => {
    const req = request(await app()).patch(`/api/admin/orders/${orderId}`);
    if (cookie) req.set('Cookie', cookie);
    return req.send({ fulfillment });
  };

  /** Inicia sesión como administrador y devuelve su cookie. */
  async function cookieAdmin() {
    const servidor = await app();
    const email = `admin-${Date.now()}@ejemplo.test`;
    await request(servidor)
      .post('/api/auth/register')
      .send({ email, password: 'ContraseñaLarga123' });
    await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } });
    const login = await request(servidor)
      .post('/api/auth/login')
      .send({ email, password: 'ContraseñaLarga123' });
    return login.headers['set-cookie'] as unknown as string;
  }

  async function pedidoPagado() {
    const { pedido } = await crearPedidoPendiente();
    await prisma.order.update({ where: { id: pedido.id }, data: { status: 'PAID' } });
    return pedido;
  }

  it('sin sesión de administrador no se toca nada', async () => {
    const pedido = await pedidoPagado();
    const res = await cambiar(pedido.id, 'PREPARING');
    expect([401, 403]).toContain(res.status);
    const despues = await prisma.order.findUnique({ where: { id: pedido.id } });
    expect(despues?.fulfillment).toBeNull();
  });

  it('un cliente normal tampoco', async () => {
    const servidor = await app();
    const email = `cliente-${Date.now()}@ejemplo.test`;
    await request(servidor).post('/api/auth/register').send({ email, password: 'ContraseñaLarga123' });
    const login = await request(servidor)
      .post('/api/auth/login')
      .send({ email, password: 'ContraseñaLarga123' });

    const pedido = await pedidoPagado();
    const res = await cambiar(pedido.id, 'PREPARING', login.headers['set-cookie'] as never);
    expect([401, 403]).toContain(res.status);
  });

  it('el administrador recorre el camino completo', async () => {
    const cookie = await cookieAdmin();
    const pedido = await pedidoPagado();

    for (const estado of ['PREPARING', 'SHIPPED', 'DELIVERED']) {
      const res = await cambiar(pedido.id, estado, cookie);
      expect(res.status).toBe(200);
      expect(res.body.fulfillment).toBe(estado);
    }
    const final = await prisma.order.findUnique({ where: { id: pedido.id } });
    expect(final?.fulfillment).toBe('DELIVERED');
    // Y el estado de PAGO no se ha movido ni una vez.
    expect(final?.status).toBe('PAID');
  });

  it('una transición imposible se rechaza', async () => {
    const cookie = await cookieAdmin();
    const pedido = await pedidoPagado();
    await cambiar(pedido.id, 'PREPARING', cookie);
    await cambiar(pedido.id, 'SHIPPED', cookie);

    const res = await cambiar(pedido.id, 'PREPARING', cookie);
    expect(res.status).toBe(409);
    expect((await prisma.order.findUnique({ where: { id: pedido.id } }))?.fulfillment).toBe('SHIPPED');
  });

  it('un pedido SIN cobrar no se puede preparar', async () => {
    const cookie = await cookieAdmin();
    const { pedido } = await crearPedidoPendiente(); // sigue PENDING

    const res = await cambiar(pedido.id, 'PREPARING', cookie);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/cobrado/i);
  });

  it('EL PANEL NO PUEDE TOCAR EL ESTADO DE PAGO', async () => {
    /*
     * La garantía de la Fase 1: PAID sólo lo escribe un webhook firmado de
     * Stripe con el pago efectivamente cobrado. Antes, este mismo endpoint
     * aceptaba `status` y lo escribía encima.
     */
    const cookie = await cookieAdmin();
    const { pedido } = await crearPedidoPendiente();

    const res = await cambiar(pedido.id, 'PREPARING', cookie);
    expect(res.status).toBe(409);

    // Y mandando `status` directamente, que es lo que antes funcionaba:
    const intento = await request(await app())
      .patch(`/api/admin/orders/${pedido.id}`)
      .set('Cookie', cookie)
      .send({ status: 'PAID' });
    expect(intento.status).toBe(400);
    expect((await prisma.order.findUnique({ where: { id: pedido.id } }))?.status).toBe('PENDING');
  });

  it('un pedido que no existe da 404', async () => {
    const cookie = await cookieAdmin();
    const res = await cambiar('noexiste', 'PREPARING', cookie);
    expect(res.status).toBe(404);
  });

  it('un estado inventado se rechaza', async () => {
    const cookie = await cookieAdmin();
    const pedido = await pedidoPagado();
    const res = await cambiar(pedido.id, 'TELEPORTADO', cookie);
    expect(res.status).toBe(400);
  });

  /* ── Cancelar ─────────────────────────────────────────────────────────── */

  it('CANCELAR NO DEVUELVE EL DINERO', async () => {
    /*
     * Cancelar mueve el eje operativo y nada más. El estado de pago no cambia:
     * si el pedido estaba cobrado, sigue cobrado, porque el dinero sigue
     * estando. Un reembolso es una decisión de negocio que hoy no tiene ni
     * política ni pantalla, y dispararlo desde aquí sería inventárselo.
     */
    const cookie = await cookieAdmin();
    const pedido = await pedidoPagado();

    const res = await cambiar(pedido.id, 'CANCELLED', cookie);
    expect(res.status).toBe(200);

    const despues = await prisma.order.findUnique({ where: { id: pedido.id } });
    expect(despues?.fulfillment).toBe('CANCELLED');
    expect(despues?.status).toBe('PAID'); // El pago SIGUE constando.
  });

  it('cancelar tampoco devuelve el stock al catálogo', async () => {
    /*
     * Deliberado. Las existencias de un pedido cobrado están vendidas, y quién
     * y cuándo vuelven al catálogo es una decisión de almacén —¿ha vuelto el
     * saco?, ¿está en condiciones?— que no puede tomar un cambio de estado.
     */
    const cookie = await cookieAdmin();
    const { pedido, variante, cantidad } = await crearPedidoPendiente({ cantidad: 2, stock: 10 });
    await prisma.order.update({ where: { id: pedido.id }, data: { status: 'PAID' } });

    await cambiar(pedido.id, 'CANCELLED', cookie);

    const v = await prisma.productVariant.findUnique({ where: { id: variante.id } });
    expect(v?.stock).toBe(10 - cantidad);
  });

  it('el listado del panel dice qué botones tienen sentido', async () => {
    const cookie = await cookieAdmin();
    const pedido = await pedidoPagado();
    await cambiar(pedido.id, 'PREPARING', cookie);

    const res = await request(await app()).get('/api/admin/orders').set('Cookie', cookie);
    const fila = res.body.orders.find((o: { id: string }) => o.id === pedido.id);
    expect(fila.siguientes).toEqual(['SHIPPED', 'CANCELLED']);
  });

  it('y no ofrece ninguno sobre un pedido sin cobrar', async () => {
    const cookie = await cookieAdmin();
    const { pedido } = await crearPedidoPendiente();
    const res = await request(await app()).get('/api/admin/orders').set('Cookie', cookie);
    const fila = res.body.orders.find((o: { id: string }) => o.id === pedido.id);
    expect(fila.siguientes).toEqual([]);
  });
});

/* ══ 3. Nada avanza solo ══════════════════════════════════════════════════ */

describe('nada se mueve sin que alguien lo mueva', () => {
  it('un pedido pagado nace SIN estado operativo', async () => {
    const { pedido } = await crearPedidoPendiente();
    await prisma.order.update({ where: { id: pedido.id }, data: { status: 'PAID' } });
    const despues = await prisma.order.findUnique({ where: { id: pedido.id } });
    expect(despues?.fulfillment).toBeNull();
  });

  it('el paso del tiempo no lo envía ni lo entrega', async () => {
    const { pedido } = await crearPedidoPendiente();
    await prisma.order.update({
      where: { id: pedido.id },
      data: { status: 'PAID', createdAt: new Date('2020-01-01') },
    });

    const { liberarReservasVencidas } = await import('../src/lib/reservas.js');
    await liberarReservasVencidas(new Date());

    const despues = await prisma.order.findUnique({ where: { id: pedido.id } });
    expect(despues?.fulfillment).toBeNull();
    expect(despues?.status).toBe('PAID');
  });
});

/* ══ 4. Lo que ve quien compró ════════════════════════════════════════════ */

describe('el pedido que ve el cliente', () => {
  it('incluye el estado operativo', async () => {
    const { pedido } = await crearPedidoPendiente();
    await prisma.order.update({
      where: { id: pedido.id },
      data: { status: 'PAID', fulfillment: 'SHIPPED' },
    });

    const res = await request(await app()).get(
      `/api/orders/${pedido.id}?t=${pedido.accessToken}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('PAID');
    expect(res.body.order.fulfillment).toBe('SHIPPED');
  });

  it('y NO incluye nada interno', async () => {
    const { pedido } = await crearPedidoPendiente();
    const res = await request(await app()).get(
      `/api/orders/${pedido.id}?t=${pedido.accessToken}`,
    );
    const texto = JSON.stringify(res.body);
    expect(texto).not.toContain('accessToken');
    expect(texto).not.toContain('lastError');
    expect(texto).not.toContain('stripeSessionId');
  });
});
