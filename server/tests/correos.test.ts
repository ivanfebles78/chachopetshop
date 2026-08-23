/**
 * LOS CORREOS DE PEDIDO.
 *
 * Hasta la Fase 2E, la web prometía «te enviaremos un email de confirmación» y
 * no lo enviaba nadie: el `mailer` existía y sólo lo usaba el formulario de
 * contacto. La promesa se retiró en la 2D; aquí se cumple.
 *
 * Lo que se fija:
 *
 *   1. El correo lo dispara el PAGO CONFIRMADO, nunca llegar a la página de
 *      éxito. Esa URL se puede escribir a mano.
 *   2. Un reintento de Stripe NO manda un segundo correo. Los webhooks se
 *      repiten por diseño, así que esto no es un caso raro: es rutina.
 *   3. Si el correo falla, el pedido sigue pagado y el stock donde estaba. El
 *      correo es la consecuencia de la venta, jamás su condición.
 *   4. No se dice nada que no sea verdad: ni fecha de entrega, ni seguimiento,
 *      ni plazo de devolución.
 *
 * NINGUNA prueba de este fichero sale a la red. El proveedor se inyecta.
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';

import {
  prisma,
  limpiar,
  stockDe,
  crearPedidoPendiente,
  proveedorFalso,
  SECRETO_WEBHOOK,
  firmarWebhook,
  eventoStripe,
} from './helpers.js';
import { notificarPedidoPagado } from '../src/lib/correo/notificar.js';
import {
  motivoNoConfigurado,
  proveedorActual,
  buzonInterno,
} from '../src/lib/correo/proveedor.js';
import {
  asuntoConfirmacion,
  confirmacionHtml,
  confirmacionTexto,
  escapar,
  internoHtml,
  referenciaDePedido,
  type PedidoParaCorreo,
} from '../src/lib/correo/plantillas.js';

const BUZON = 'chachopetshop@gmail.com';

async function app() {
  const { createApp } = await import('../src/app.js');
  return createApp();
}

const mandarWebhook = async (
  id: string,
  tipo: string,
  orderId: string,
  pago: string = 'paid',
) => {
  const cuerpo = eventoStripe(id, tipo, { metadata: { orderId }, payment_status: pago });
  return request(await app())
    .post('/api/checkout/webhook')
    .set('Content-Type', 'application/json')
    .set('stripe-signature', firmarWebhook(cuerpo))
    .send(cuerpo);
};

beforeEach(async () => {
  vi.resetModules();
  process.env.STRIPE_SECRET_KEY = 'sk_test_clave_de_pruebas';
  process.env.STRIPE_WEBHOOK_SECRET = SECRETO_WEBHOOK;
  process.env.ORDER_EMAIL_TO = BUZON;
  delete process.env.RESEND_API_KEY;
  delete process.env.ORDER_EMAIL_FROM;
  await limpiar();
});
afterAll(() => prisma.$disconnect());

const pedidoDeMuestra = (extra: Partial<PedidoParaCorreo> = {}): PedidoParaCorreo => ({
  id: 'cmabcdefgh12345678ijklmn',
  email: 'ana@ejemplo.test',
  createdAt: new Date('2026-08-23T10:00:00Z'),
  subtotal: 34.5,
  shipping: 4.95,
  total: 39.45,
  shippingName: 'Ana Pérez',
  shippingAddress: 'Calle Real 1',
  shippingCity: 'La Laguna',
  shippingZip: '38201',
  items: [{ name: 'Orijen Original Dog', variantLabel: '2 kg', quantity: 1, unitPrice: 34.5 }],
  ...extra,
});

/* ══ 1. Configuración: ni una credencial escrita en el código ═════════════ */

describe('la configuración del correo', () => {
  it('sin credenciales NO hay proveedor, y se dice qué falta', () => {
    const motivo = motivoNoConfigurado({} as NodeJS.ProcessEnv);
    expect(motivo).toContain('RESEND_API_KEY');
    expect(motivo).toContain('ORDER_EMAIL_FROM');
    expect(proveedorActual({} as NodeJS.ProcessEnv)).toBeNull();
  });

  it('el motivo dice NOMBRES de variables, nunca valores', () => {
    const motivo = motivoNoConfigurado({
      RESEND_API_KEY: 're_una_clave_secretisima',
    } as NodeJS.ProcessEnv);
    expect(motivo).not.toContain('re_una_clave_secretisima');
  });

  it('con las dos variables sí hay proveedor', () => {
    const p = proveedorActual({
      RESEND_API_KEY: 're_x',
      ORDER_EMAIL_FROM: 'Chacho <pedidos@ejemplo.test>',
    } as NodeJS.ProcessEnv);
    expect(p?.nombre).toBe('resend');
  });

  it('el buzón interno sale del entorno, no del código', () => {
    expect(buzonInterno({} as NodeJS.ProcessEnv)).toBeNull();
    expect(buzonInterno({ ORDER_EMAIL_TO: BUZON } as NodeJS.ProcessEnv)).toBe(BUZON);
  });
});

/* ══ 2. Qué dice el correo — y qué NO dice ════════════════════════════════ */

describe('el contenido del correo al cliente', () => {
  const p = pedidoDeMuestra();

  it('lleva el asunto que pidió Ivan', () => {
    expect(asuntoConfirmacion(p)).toBe(
      `Confirmación de tu pedido ${referenciaDePedido(p.id)} — Chacho Pet Shop`,
    );
  });

  it('lleva los datos reales del pedido', () => {
    const html = confirmacionHtml(p);
    for (const dato of [
      'Chacho Pet Shop',
      referenciaDePedido(p.id),
      'Orijen Original Dog',
      '2 kg',
      'Calle Real 1',
      'La Laguna',
      '38201',
      'Pagado',
    ]) {
      expect(html).toContain(dato);
    }
    // Importes: subtotal, envío y total, con formato de euros.
    expect(html).toContain('34,50');
    expect(html).toContain('4,95');
    expect(html).toContain('39,45');
  });

  it('lleva el teléfono y el correo REALES del negocio', () => {
    const html = confirmacionHtml(p);
    expect(html).toContain('628 013 933');
    expect(html).toContain('chachopetshop@gmail.com');
  });

  it('NO promete nada que no exista', () => {
    /*
     * Es la regla que gobierna toda la fase, y un correo es donde más caro sale
     * romperla: queda por escrito, se guarda, y se relee cuando algo va mal.
     */
    const todo = (confirmacionHtml(p) + confirmacionTexto(p)).toLowerCase();
    for (const prohibido of [
      'seguimiento',
      'tracking',
      'número de envío',
      'llegará el',
      'entrega estimada',
      'fecha estimada',
      'devolver en',
      'días para devolver',
      'garantía de',
      'satisfacción garantizada',
    ]) {
      expect(todo).not.toContain(prohibido);
    }
  });

  it('NO lleva el token de acceso del pedido', () => {
    // El token abre el pedido a quien lo tenga. Un correo se reenvía, se
    // archiva y lo escanean terceros: el pedido entero va en el propio mensaje,
    // así que no hace falta ningún enlace con secreto.
    const conToken = { ...p, id: p.id };
    const html = confirmacionHtml(conToken);
    expect(html).not.toMatch(/[?&]t=/);
    expect(html).not.toContain('accessToken');
  });

  it('la versión de texto dice lo mismo, para quien no ve HTML', () => {
    const texto = confirmacionTexto(p);
    expect(texto).toContain(referenciaDePedido(p.id));
    expect(texto).toContain('Orijen Original Dog');
    expect(texto).toContain('39,45');
    expect(texto).toContain('628 013 933');
    expect(texto).not.toContain('<');
  });

  it('escapa lo que escribe el cliente', () => {
    /*
     * El nombre y la dirección los teclea quien compra, y el aviso interno se
     * abre en el correo de Ivan. Sin escapar, un pedido con una etiqueta HTML
     * en la calle rompe el mensaje o mete marcado ajeno en su bandeja.
     */
    expect(escapar('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    );
    // El ampersand va PRIMERO y también se escapa: si no, «Pienso & Co» sale
    // como HTML inválido, y lo que ya venía escapado se rompe al reescaparse.
    expect(escapar('Pienso & Co')).toBe('Pienso &amp; Co');
    expect(escapar('&lt;')).toBe('&amp;lt;');
    expect(escapar(`"comillas" y 'apóstrofos'`)).toBe(
      '&quot;comillas&quot; y &#39;apóstrofos&#39;',
    );
    const malicioso = pedidoDeMuestra({
      shippingName: '<img src=x onerror=alert(1)>',
      shippingAddress: '"><b>ojo</b>',
    });
    const html = internoHtml(malicioso);
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<b>ojo</b>');
    expect(html).toContain('&lt;img src=x');
  });

  it('ofrece ayuda sin inventarse un proceso de devolución', () => {
    const html = confirmacionHtml(p);
    expect(html).toContain('¿Necesitas ayuda con tu pedido?');
    expect(html.toLowerCase()).not.toContain('solicitar devolución');
  });
});

/* ══ 3. Se manda UNA vez, y sólo al cobrar de verdad ══════════════════════ */

describe('cuándo se manda', () => {
  it('un pago confirmado manda los dos correos', async () => {
    const { pedido } = await crearPedidoPendiente();
    const proveedor = proveedorFalso();

    const r = await notificarPedidoPagado(pedido.id, { proveedor });

    expect(r.confirmacion).toBe('enviado');
    expect(r.interno).toBe('enviado');
    expect(proveedor.enviados).toHaveLength(2);
    expect(proveedor.enviados[0]!.para).toBe('cliente@ejemplo.test');
    expect(proveedor.enviados[1]!.para).toBe(BUZON);
  });

  it('llamarlo dos veces NO manda un segundo correo', async () => {
    const { pedido } = await crearPedidoPendiente();
    const proveedor = proveedorFalso();

    await notificarPedidoPagado(pedido.id, { proveedor });
    const segunda = await notificarPedidoPagado(pedido.id, { proveedor });

    expect(segunda.confirmacion).toBe('duplicado');
    expect(segunda.interno).toBe('duplicado');
    expect(proveedor.enviados).toHaveLength(2);
  });

  it('DOS LLAMADAS SIMULTÁNEAS tampoco', async () => {
    // Dos instancias del servicio recibiendo el mismo evento a la vez. La
    // unicidad la impone el índice de la base de datos, no una marca en memoria.
    const { pedido } = await crearPedidoPendiente();
    const proveedor = proveedorFalso();

    await Promise.all([
      notificarPedidoPagado(pedido.id, { proveedor }),
      notificarPedidoPagado(pedido.id, { proveedor }),
    ]);

    expect(proveedor.enviados).toHaveLength(2);
    expect(await prisma.orderNotification.count()).toBe(2);
  });

  it('un pedido sin pagar no recibe confirmación', async () => {
    const { pedido } = await crearPedidoPendiente();
    const proveedor = proveedorFalso();

    // Sesión completada pero SIN cobrar: no debe disparar nada.
    await mandarWebhook(`ev_impago_${Date.now()}`, 'checkout.session.completed', pedido.id, 'unpaid');

    expect(proveedor.enviados).toHaveLength(0);
    expect(await prisma.orderNotification.count()).toBe(0);
    expect((await prisma.order.findUnique({ where: { id: pedido.id } }))?.status).toBe('PENDING');
  });

  it('llegar a la página de éxito NO manda ningún correo', async () => {
    /*
     * Es la garantía que más importa de esta sección. La URL de retorno la
     * controla quien navega: se puede escribir a mano, compartir y recargar.
     */
    const { pedido } = await crearPedidoPendiente();
    const servidor = await app();

    await request(servidor).get(`/api/orders/${pedido.id}?t=${pedido.accessToken}`);
    await request(servidor).get(`/api/orders/${pedido.id}?t=${pedido.accessToken}`);

    expect(await prisma.orderNotification.count()).toBe(0);
  });

  it('un reintento del webhook no manda un segundo correo', async () => {
    const { pedido } = await crearPedidoPendiente();
    const id = `ev_retry_${Date.now()}`;

    await mandarWebhook(id, 'checkout.session.completed', pedido.id);
    await mandarWebhook(id, 'checkout.session.completed', pedido.id);
    // Y otro evento distinto sobre el mismo pedido ya cobrado.
    await mandarWebhook(`${id}_b`, 'checkout.session.completed', pedido.id);

    expect(await prisma.orderNotification.count()).toBe(2);
    const clases = (await prisma.orderNotification.findMany()).map((n) => n.kind).sort();
    expect(clases).toEqual(['INTERNAL_NEW_ORDER', 'ORDER_CONFIRMATION']);
  });
});

/* ══ 4. Si el correo falla, la venta no se entera ═════════════════════════ */

describe('un fallo de correo no toca el pedido', () => {
  it('el pedido sigue PAGADO y el stock donde estaba', async () => {
    const { pedido, variante, cantidad } = await crearPedidoPendiente({ cantidad: 2, stock: 10 });
    const stockAntes = await stockDe(variante.id);

    await prisma.order.update({ where: { id: pedido.id }, data: { status: 'PAID' } });
    const r = await notificarPedidoPagado(pedido.id, { proveedor: proveedorFalso({ falla: true }) });

    expect(r.confirmacion).toBe('fallido');
    expect(r.interno).toBe('fallido');
    expect((await prisma.order.findUnique({ where: { id: pedido.id } }))?.status).toBe('PAID');
    expect(await stockDe(variante.id)).toBe(stockAntes);
    expect(stockAntes).toBe(10 - cantidad);
  });

  it('el webhook responde 200 aunque el correo falle', async () => {
    /*
     * Si devolviera un 5xx, Stripe reintentaría el evento una y otra vez contra
     * un pedido que ya está perfectamente cobrado.
     */
    const { pedido } = await crearPedidoPendiente();
    process.env.RESEND_API_KEY = 're_clave_que_no_vale';
    process.env.ORDER_EMAIL_FROM = 'Chacho <pedidos@ejemplo.test>';

    const res = await mandarWebhook(`ev_falla_${Date.now()}`, 'checkout.session.completed', pedido.id);

    expect(res.status).toBe(200);
    expect((await prisma.order.findUnique({ where: { id: pedido.id } }))?.status).toBe('PAID');
  });

  it('el fallo queda anotado, con motivo, para poder reintentarlo', async () => {
    const { pedido } = await crearPedidoPendiente();
    await notificarPedidoPagado(pedido.id, { proveedor: proveedorFalso({ falla: true }) });

    const filas = await prisma.orderNotification.findMany({ where: { orderId: pedido.id } });
    expect(filas).toHaveLength(2);
    for (const f of filas) {
      expect(f.status).toBe('FAILED');
      expect(f.lastError).toContain('ha fallado');
      expect(f.sentAt).toBeNull();
    }
  });

  it('sin proveedor configurado no se finge que se mandó', async () => {
    const { pedido } = await crearPedidoPendiente();
    const r = await notificarPedidoPagado(pedido.id, { proveedor: null });

    expect(r.confirmacion).toBe('sin-proveedor');
    const fila = await prisma.orderNotification.findFirst({ where: { orderId: pedido.id } });
    expect(fila?.status).toBe('FAILED');
    expect(fila?.lastError).toContain('RESEND_API_KEY');
  });

  it('el error del proveedor NUNCA llega a quien compra', async () => {
    const { pedido } = await crearPedidoPendiente();
    await notificarPedidoPagado(pedido.id, { proveedor: proveedorFalso({ falla: true }) });

    const res = await request(await app()).get(
      `/api/orders/${pedido.id}?t=${pedido.accessToken}`,
    );
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain('ha fallado');
    expect(JSON.stringify(res.body)).not.toContain('lastError');
  });

  it('los dos correos son independientes: uno puede fallar y el otro no', async () => {
    const { pedido } = await crearPedidoPendiente();
    // Sin buzón interno configurado, el aviso interno no se puede mandar.
    delete process.env.ORDER_EMAIL_TO;
    const proveedor = proveedorFalso();

    const r = await notificarPedidoPagado(pedido.id, { proveedor });

    expect(r.confirmacion).toBe('enviado');
    expect(r.interno).toBe('fallido');
    expect(proveedor.enviados).toHaveLength(1);
  });
});

/* ══ 5. Reintento ════════════════════════════════════════════════════════ */

describe('reintentar lo que quedó fallido', () => {
  it('reenvía sin crear filas nuevas', async () => {
    const { pedido } = await crearPedidoPendiente();
    await notificarPedidoPagado(pedido.id, { proveedor: proveedorFalso({ falla: true }) });
    expect(await prisma.orderNotification.count()).toBe(2);

    const { reintentarCorreosFallidos } = await import('../src/lib/correo/notificar.js');
    const bueno = proveedorFalso();
    const r = await reintentarCorreosFallidos({ proveedor: bueno });

    expect(r.enviados).toBe(2);
    expect(bueno.enviados).toHaveLength(2);
    // Ni una fila más: el turno ya estaba pedido, así que no puede duplicar.
    expect(await prisma.orderNotification.count()).toBe(2);
    const filas = await prisma.orderNotification.findMany();
    expect(filas.every((f) => f.status === 'SENT')).toBe(true);
    expect(filas.every((f) => f.attempts >= 2)).toBe(true);
  });

  it('no toca los que ya se enviaron', async () => {
    const { pedido } = await crearPedidoPendiente();
    await notificarPedidoPagado(pedido.id, { proveedor: proveedorFalso() });

    const { reintentarCorreosFallidos } = await import('../src/lib/correo/notificar.js');
    const otro = proveedorFalso();
    const r = await reintentarCorreosFallidos({ proveedor: otro });

    expect(r.reintentados).toBe(0);
    expect(otro.enviados).toHaveLength(0);
  });
});
