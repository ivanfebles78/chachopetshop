/**
 * RESERVAS DE EXISTENCIAS CON CADUCIDAD — lo más delicado de la Fase 2E.
 *
 * El stock se descuenta al crear la sesión de pago, no al cobrar. Eso viene de
 * la Fase 1 y es lo correcto para una tienda con dos o tres sacos de cada
 * formato. Lo que faltaba era el final de la frase: **hasta cuándo**.
 *
 * Sin fecha límite, quien abría la pasarela y cerraba la pestaña dejaba las
 * existencias retenidas hasta que Stripe daba la sesión por caducada — y el
 * valor por defecto de Stripe son VEINTICUATRO HORAS. Unos cuantos carritos
 * abandonados y la tienda aparece agotada el resto del día por culpa de gente
 * que no llegó a pagar.
 *
 * Las garantías que se fijan aquí, en orden de gravedad si se rompen:
 *
 *   1. Una reserva PAGADA no se suelta jamás. Devolver al catálogo algo ya
 *      vendido es venderlo dos veces.
 *   2. El stock nunca queda negativo.
 *   3. Lo vencido y sin pagar se suelta UNA vez, pase lo que pase: dos
 *      limpiezas a la vez, un reinicio, un webhook cruzándose.
 *   4. A los 29:59 la reserva sigue en pie.
 *
 * El tiempo se controla pasando fechas, no esperando: una prueba que necesite
 * media hora de reloj no la ejecuta nadie.
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';

import {
  prisma,
  limpiar,
  crearProducto,
  stockDe,
  crearPedidoPendiente,
  DIRECCION_CANARIA,
  SECRETO_WEBHOOK,
  firmarWebhook,
  eventoStripe,
} from './helpers.js';
import {
  caducidadDesde,
  expiraEnStripe,
  liberarReservasVencidas,
  liberarStockDelPedido,
  MARGEN_PARA_EL_WEBHOOK,
  MINUTOS_DE_RESERVA,
} from '../src/lib/reservas.js';

const MINUTO = 60_000;

/** Un instante N minutos después de que venciera una reserva creada ahora. */
const tras = (minutos: number) => new Date(Date.now() + minutos * MINUTO);

async function app() {
  process.env.STRIPE_SECRET_KEY = 'sk_test_clave_de_pruebas';
  process.env.STRIPE_WEBHOOK_SECRET = SECRETO_WEBHOOK;
  const { createApp } = await import('../src/app.js');
  return createApp();
}

beforeEach(async () => {
  /*
   * `env.ts` valida `process.env` AL IMPORTARSE. Sin reiniciar los módulos, el
   * primer import de la suite se queda con la configuración de ese instante y
   * el webhook responde 503 el resto del fichero — que fue exactamente lo que
   * pasó al escribir esto.
   */
  vi.resetModules();
  process.env.STRIPE_SECRET_KEY = 'sk_test_clave_de_pruebas';
  process.env.STRIPE_WEBHOOK_SECRET = SECRETO_WEBHOOK;
  await limpiar();
});
afterAll(() => prisma.$disconnect());

/* ══ 1. La política, en frío ═══════════════════════════════════════════════ */

describe('la política de reserva', () => {
  it('son 30 minutos', () => {
    expect(MINUTOS_DE_RESERVA).toBe(30);
  });

  it('la caducidad se calcula desde el instante que se le pase', () => {
    const base = new Date('2026-08-23T10:00:00.000Z');
    expect(caducidadDesde(base).toISOString()).toBe('2026-08-23T10:30:00.000Z');
  });

  it('Stripe recibe la MISMA caducidad, en segundos', () => {
    /*
     * Si las dos no coincidieran, quedaría una ventana en la que la pasarela
     * sigue aceptando el pago de algo cuyo stock ya devolvimos al catálogo:
     * alguien pagaría por algo vendido a otro.
     */
    const base = new Date('2026-08-23T10:00:00.000Z');
    expect(expiraEnStripe(base)).toBe(caducidadDesde(base).getTime() / 1000);
  });

  it('30 minutos es exactamente el mínimo que Stripe admite', () => {
    /*
     * Comprobado en la definición del SDK instalado: «It can be anywhere from
     * 30 minutes to 24 hours after Checkout Session creation. By default, this
     * value is 24 hours from creation.» Si alguien bajara la política a 20
     * minutos, Stripe rechazaría la creación de la sesión y NADIE podría
     * comprar. Esta prueba lo dice antes de que lo diga producción.
     */
    expect(MINUTOS_DE_RESERVA).toBeGreaterThanOrEqual(30);
    expect(MINUTOS_DE_RESERVA).toBeLessThanOrEqual(24 * 60);
  });
});

/* ══ 2. Comprar crea una reserva con fecha ════════════════════════════════ */

describe('comprar reserva existencias con fecha límite', () => {
  it('el pedido nace con reservedUntil a 30 minutos', async () => {
    const { producto, variante } = await crearProducto({ stock: 5, precio: 20 });
    const antes = Date.now();

    await request(await app())
      .post('/api/checkout')
      .send({
        email: 'cliente@ejemplo.test',
        items: [{ productId: producto.id, variantId: variante.id, quantity: 1 }],
        shipping: DIRECCION_CANARIA,
      });

    const pedido = await prisma.order.findFirst();
    expect(pedido?.reservedUntil).toBeTruthy();
    const margen = pedido!.reservedUntil!.getTime() - antes;
    expect(margen).toBeGreaterThan(29 * MINUTO);
    expect(margen).toBeLessThan(31 * MINUTO);
  });
});

/* ══ 3. Antes de los 30 minutos, la reserva aguanta ═══════════════════════ */

describe('mientras la reserva está viva', () => {
  it('a los 29 minutos y 59 segundos NO se suelta', async () => {
    const { variante, cantidad } = await crearPedidoPendiente({ cantidad: 2, stock: 10 });
    const stockReservado = await stockDe(variante.id);

    const casi = new Date(Date.now() + (30 * MINUTO - 1000) + MARGEN_PARA_EL_WEBHOOK * MINUTO);
    const { liberados } = await liberarReservasVencidas(casi);

    expect(liberados).toEqual([]);
    expect(await stockDe(variante.id)).toBe(stockReservado);
    expect(stockReservado).toBe(10 - cantidad);
  });

  it('otro comprador no puede llevarse lo reservado', async () => {
    /*
     * La reserva la sostiene un pedido PENDIENTE. Se crea directamente en la
     * base de datos y no pasando por el checkout, porque con una clave de
     * Stripe falsa toda compra acaba fallando y soltando lo suyo: por ese
     * camino no se puede observar una reserva viva.
     */
    const { producto, variante } = await crearPedidoPendiente({ cantidad: 1, stock: 1 });
    expect(await stockDe(variante.id)).toBe(0);

    const otro = await request(await app())
      .post('/api/checkout')
      .send({
        email: 'dos@ejemplo.test',
        items: [{ productId: producto.id, variantId: variante.id, quantity: 1 }],
        shipping: DIRECCION_CANARIA,
      });

    expect(otro.status).toBe(409);
    expect(otro.body.error).toMatch(/stock/i);
    expect(await stockDe(variante.id)).toBe(0);
  });
});

/* ══ 4. Pasados los 30 minutos, se suelta ═════════════════════════════════ */

describe('cuando la reserva vence', () => {
  it('las existencias vuelven al catálogo', async () => {
    const { pedido, variante, cantidad } = await crearPedidoPendiente({
      cantidad: 3,
      stock: 10,
      reservedUntil: new Date(Date.now() - MINUTO),
    });
    expect(await stockDe(variante.id)).toBe(10 - cantidad);

    const { liberados } = await liberarReservasVencidas(tras(MARGEN_PARA_EL_WEBHOOK + 1));

    expect(liberados).toEqual([pedido.id]);
    expect(await stockDe(variante.id)).toBe(10);
  });

  it('y el pedido deja de estar «pendiente»', async () => {
    /*
     * Si se quedara en PENDING, «pendiente» significaría dos cosas —esperando
     * pago, y abandonado hace rato— y la propia limpieza volvería a
     * encontrarlo en cada pasada.
     */
    const { pedido } = await crearPedidoPendiente({
      reservedUntil: new Date(Date.now() - MINUTO),
    });
    await liberarReservasVencidas(tras(MARGEN_PARA_EL_WEBHOOK + 1));
    const despues = await prisma.order.findUnique({ where: { id: pedido.id } });
    expect(despues?.status).toBe('FAILED');
    // `stockCommitted` es lo único que decide si hay stock retenido. La fecha
    // se conserva: era el plazo que se fijó, y ya no puede activar nada.
    expect(despues?.stockCommitted).toBe(false);
  });

  it('y entonces SÍ puede comprarlo otro', async () => {
    const { producto, variante } = await crearProducto({ stock: 1, precio: 20 });
    await prisma.order.create({
      data: {
        email: 'abandonado@ejemplo.test',
        subtotal: 20,
        shipping: 4.95,
        total: 24.95,
        status: 'PENDING',
        stockCommitted: true,
        reservedUntil: new Date(Date.now() - 40 * MINUTO),
        accessToken: `t-${Date.now()}`,
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
    await prisma.productVariant.update({ where: { id: variante.id }, data: { stock: 0 } });

    // El checkout limpia lo vencido antes de reservar: quien compra AHORA es
    // quien merece esas unidades.
    const res = await request(await app())
      .post('/api/checkout')
      .send({
        email: 'nuevo@ejemplo.test',
        items: [{ productId: producto.id, variantId: variante.id, quantity: 1 }],
        shipping: DIRECCION_CANARIA,
      });

    /*
     * No se comprueba el estado final del pedido nuevo: con una clave de Stripe
     * falsa acabará fallando igual. Lo que se comprueba es lo único que estaba
     * roto antes — que la reserva abandonada dejó de bloquear la venta.
     */
    expect(res.status).not.toBe(409);
    const abandonado = await prisma.order.findFirst({
      where: { email: 'abandonado@ejemplo.test' },
    });
    expect(abandonado?.stockCommitted).toBe(false);
    expect(abandonado?.status).toBe('FAILED');
  });
});

/* ══ 5. LO PAGADO NO SE SUELTA NUNCA ══════════════════════════════════════ */

describe('un pedido pagado es intocable', () => {
  it('la limpieza no lo mira aunque sea antiquísimo', async () => {
    /*
     * La peor forma de romper esto: soltar las existencias de algo ya vendido.
     * El catálogo diría que hay stock, se vendería otra vez, y habría que
     * devolverle el dinero a alguien.
     */
    const { pedido, variante, cantidad } = await crearPedidoPendiente({ cantidad: 2, stock: 10 });
    await prisma.order.update({
      where: { id: pedido.id },
      data: { status: 'PAID', reservedUntil: new Date(Date.now() - 10 * 24 * 60 * MINUTO) },
    });

    const { liberados } = await liberarReservasVencidas(tras(60 * 24 * 30));

    expect(liberados).toEqual([]);
    expect(await stockDe(variante.id)).toBe(10 - cantidad);
    expect((await prisma.order.findUnique({ where: { id: pedido.id } }))?.status).toBe('PAID');
  });

  it('tampoco los ya fallidos, que ya soltaron lo suyo', async () => {
    const { pedido, variante } = await crearPedidoPendiente({ cantidad: 2, stock: 10 });
    await liberarStockDelPedido(pedido.id);
    await prisma.order.update({ where: { id: pedido.id }, data: { status: 'FAILED' } });
    const stockTrasSoltar = await stockDe(variante.id);

    await liberarReservasVencidas(tras(60));
    expect(await stockDe(variante.id)).toBe(stockTrasSoltar);
    expect(stockTrasSoltar).toBe(10);
  });
});

/* ══ 6. Idempotencia: repetir no cambia nada ══════════════════════════════ */

describe('soltar dos veces es soltar una vez', () => {
  it('liberar el mismo pedido dos veces no duplica el stock', async () => {
    const { pedido, variante, cantidad } = await crearPedidoPendiente({ cantidad: 3, stock: 10 });

    expect(await liberarStockDelPedido(pedido.id)).toBe(true);
    expect(await stockDe(variante.id)).toBe(10);

    // Segunda llamada: no encuentra nada que soltar.
    expect(await liberarStockDelPedido(pedido.id)).toBe(false);
    expect(await stockDe(variante.id)).toBe(10);
    expect(cantidad).toBe(3);
  });

  it('dos limpiezas SIMULTÁNEAS tampoco', async () => {
    /*
     * Es el caso de dos instancias del servicio, o del intervalo periódico
     * cruzándose con la limpieza perezosa del checkout. La condición va dentro
     * del UPDATE, así que una actualiza una fila y la otra cero.
     */
    const { variante } = await crearPedidoPendiente({
      cantidad: 4,
      stock: 10,
      reservedUntil: new Date(Date.now() - MINUTO),
    });

    const cuando = tras(MARGEN_PARA_EL_WEBHOOK + 1);
    const [a, b] = await Promise.all([
      liberarReservasVencidas(cuando),
      liberarReservasVencidas(cuando),
    ]);

    expect(a.liberados.length + b.liberados.length).toBe(1);
    expect(await stockDe(variante.id)).toBe(10);
  });

  it('llamar a la limpieza cien veces da el mismo resultado que una', async () => {
    const { variante } = await crearPedidoPendiente({
      cantidad: 2,
      stock: 10,
      reservedUntil: new Date(Date.now() - MINUTO),
    });
    const cuando = tras(MARGEN_PARA_EL_WEBHOOK + 1);
    for (let i = 0; i < 100; i++) await liberarReservasVencidas(cuando);
    expect(await stockDe(variante.id)).toBe(10);
  });
});

/* ══ 7. Carreras entre el webhook y la limpieza ═══════════════════════════ */

describe('el webhook y la limpieza no se pisan', () => {
  const mandarWebhook = async (id: string, tipo: string, orderId: string, pago = 'paid') => {
    const cuerpo = eventoStripe(id, tipo, {
      metadata: { orderId },
      payment_status: pago,
    });
    return request(await app())
      .post('/api/checkout/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', firmarWebhook(cuerpo))
      // El cuerpo va como CADENA, no como Buffer: supertest serializa el Buffer
      // de otra forma y la firma deja de cuadrar con lo que recibe el servidor.
      .send(cuerpo);
  };

  it('el pago gana: si cobra, la limpieza ya no lo toca', async () => {
    const { pedido, variante, cantidad } = await crearPedidoPendiente({
      cantidad: 2,
      stock: 10,
      reservedUntil: new Date(Date.now() - MINUTO),
    });

    await mandarWebhook(`ev_pago_${Date.now()}`, 'checkout.session.completed', pedido.id);
    expect((await prisma.order.findUnique({ where: { id: pedido.id } }))?.status).toBe('PAID');

    // La limpieza llega tarde: el pedido ya está pagado y no entra en su consulta.
    const { liberados } = await liberarReservasVencidas(tras(60));
    expect(liberados).toEqual([]);
    expect(await stockDe(variante.id)).toBe(10 - cantidad);
  });

  it('el margen para el webhook evita la carrera del último segundo', async () => {
    /*
     * Alguien paga en el minuto 29:59 y el aviso de Stripe tarda unos segundos.
     * Sin margen, la limpieza vería la reserva vencida, marcaría el pedido como
     * fallido y devolvería las existencias — con el dinero ya cobrado.
     */
    const { pedido, variante, cantidad } = await crearPedidoPendiente({
      cantidad: 2,
      stock: 10,
      reservedUntil: new Date(Date.now() - 10_000), // venció hace diez segundos
    });

    // La limpieza pasa justo ahora: todavía no toca esta reserva.
    const { liberados } = await liberarReservasVencidas(new Date());
    expect(liberados).toEqual([]);
    expect(await stockDe(variante.id)).toBe(10 - cantidad);

    // Y el webhook, que venía de camino, llega y cobra sin problema.
    await mandarWebhook(`ev_margen_${Date.now()}`, 'checkout.session.completed', pedido.id);
    expect((await prisma.order.findUnique({ where: { id: pedido.id } }))?.status).toBe('PAID');
  });

  it('el fallo de pago suelta, y repetirlo no suelta dos veces', async () => {
    const { pedido, variante } = await crearPedidoPendiente({ cantidad: 3, stock: 10 });

    await mandarWebhook(`ev_f1_${Date.now()}`, 'payment_intent.payment_failed', pedido.id, 'unpaid');
    expect(await stockDe(variante.id)).toBe(10);

    // Otro evento distinto, mismo pedido: no puede reponer otra vez.
    await mandarWebhook(`ev_f2_${Date.now()}`, 'checkout.session.expired', pedido.id, 'unpaid');
    expect(await stockDe(variante.id)).toBe(10);
  });

  it('la sesión caducada dos veces no repone dos veces', async () => {
    const { pedido, variante } = await crearPedidoPendiente({ cantidad: 2, stock: 10 });
    const id = `ev_exp_${Date.now()}`;

    await mandarWebhook(id, 'checkout.session.expired', pedido.id, 'unpaid');
    // Mismo id de evento: Stripe reintentando. Se descarta por idempotencia.
    await mandarWebhook(id, 'checkout.session.expired', pedido.id, 'unpaid');

    expect(await stockDe(variante.id)).toBe(10);
  });

  it('limpieza y webhook de caducidad a la vez: una sola reposición', async () => {
    const { pedido, variante } = await crearPedidoPendiente({
      cantidad: 2,
      stock: 10,
      reservedUntil: new Date(Date.now() - 30 * MINUTO),
    });

    await Promise.all([
      liberarReservasVencidas(new Date()),
      mandarWebhook(`ev_race_${Date.now()}`, 'checkout.session.expired', pedido.id, 'unpaid'),
    ]);

    expect(await stockDe(variante.id)).toBe(10);
  });
});

/* ══ 8. El stock nunca queda negativo ═════════════════════════════════════ */

describe('el stock nunca queda negativo', () => {
  it('ni con la última unidad disputada y la limpieza de por medio', async () => {
    const { producto, variante } = await crearProducto({ stock: 1, precio: 20 });
    const servidor = await app();

    const comprar = (quien: string) =>
      request(servidor)
        .post('/api/checkout')
        .send({
          email: `${quien}@ejemplo.test`,
          items: [{ productId: producto.id, variantId: variante.id, quantity: 1 }],
          shipping: DIRECCION_CANARIA,
        });

    const [a, b] = await Promise.all([comprar('uno'), comprar('dos')]);

    // Uno de los dos se queda sin stock; el otro falla en Stripe (clave falsa)
    // y devuelve su reserva. En ningún caso el stock baja de cero.
    expect([a.status, b.status]).toContain(409);
    const stock = await stockDe(variante.id);
    expect(stock).toBeGreaterThanOrEqual(0);

    await liberarReservasVencidas(tras(60));
    expect(await stockDe(variante.id)).toBeGreaterThanOrEqual(0);
  });
});
