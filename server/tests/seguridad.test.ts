/**
 * REGRESIONES DE SEGURIDAD.
 *
 * Tres bloques que protegen cosas distintas:
 *
 *   · La autorización del panel YA estaba bien. No se ha reescrito; se le pone
 *     red, porque es una línea (`adminRouter.use(requireAuth, requireAdmin)`) y
 *     una línea se borra sin querer en cualquier refactor.
 *   · Las cabeceras de seguridad no existían: se comprueba que ahora salen.
 *   · La integridad de precios ya era correcta. Se ataca a propósito para
 *     confirmar que sigue siéndolo.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import { prisma, limpiar, crearProducto, crearUsuario, DIRECCION_CANARIA } from './helpers.js';

async function app() {
  process.env.STRIPE_SECRET_KEY = 'sk_test_clave_de_pruebas';
  const { createApp } = await import('../src/app.js');
  return createApp();
}

const tokenDe = (u: { id: string; email: string; role: string }) =>
  jwt.sign({ id: u.id, email: u.email, role: u.role }, process.env.JWT_SECRET as string, {
    expiresIn: '7d',
  });

beforeEach(async () => {
  await limpiar();
});

afterAll(async () => {
  await prisma.$disconnect();
});

/* ══ 1. El panel de administración ═════════════════════════════════════ */

describe('autorización del panel', () => {
  const RUTAS = ['/api/admin/analytics', '/api/admin/products', '/api/admin/messages'];

  for (const ruta of RUTAS) {
    it(`${ruta} rechaza el acceso anónimo`, async () => {
      const res = await request(await app()).get(ruta);
      expect(res.status).toBe(401);
    });

    it(`${ruta} rechaza a un cliente normal`, async () => {
      const cliente = await crearUsuario('CUSTOMER');
      const res = await request(await app())
        .get(ruta)
        .set('Cookie', [`token=${tokenDe(cliente)}`]);
      expect(res.status).toBe(403);
    });
  }

  it('un token con el rol falsificado y firmado con otra clave no entra', async () => {
    const falso = jwt.sign({ id: 'x', email: 'x@x.t', role: 'ADMIN' }, 'clave-que-no-es-la-nuestra');
    const res = await request(await app())
      .get('/api/admin/analytics')
      .set('Cookie', [`token=${falso}`]);
    expect(res.status).toBe(401);
  });

  it('un token malformado no entra', async () => {
    const res = await request(await app())
      .get('/api/admin/analytics')
      .set('Authorization', 'Bearer no.es.un.jwt');
    expect(res.status).toBe(401);
  });

  it('un administrador sí entra', async () => {
    const admin = await crearUsuario('ADMIN');
    const res = await request(await app())
      .get('/api/admin/analytics')
      .set('Cookie', [`token=${tokenDe(admin)}`]);
    expect(res.status).toBe(200);
  });

  it('las escrituras del panel también están protegidas', async () => {
    const res = await request(await app()).post('/api/admin/products').send({ name: 'X' });
    expect(res.status).toBeGreaterThanOrEqual(401);
    expect(res.status).toBeLessThan(404);
  });
});

/* ══ 2. Cabeceras ══════════════════════════════════════════════════════ */

describe('cabeceras de seguridad', () => {
  it('la respuesta trae las cabeceras que faltaban por completo', async () => {
    const res = await request(await app()).get('/api/health');

    expect(res.headers['content-security-policy']).toBeTruthy();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBeTruthy();
    // Revelaba el motor sin necesidad.
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('la CSP impide meter la tienda en un iframe ajeno', async () => {
    const res = await request(await app()).get('/api/health');
    expect(res.headers['content-security-policy']).toMatch(/frame-ancestors 'none'/);
  });

  it('la CSP permite exactamente lo que la aplicación usa', async () => {
    const csp = (await request(await app()).get('/api/health')).headers['content-security-policy'];

    // Stripe: sin esto el checkout no carga.
    expect(csp).toMatch(/js\.stripe\.com/);
    expect(csp).toMatch(/checkout\.stripe\.com/);
    // Imágenes de producto y fuentes que index.html carga hoy.
    expect(csp).toMatch(/picsum\.photos/);
    expect(csp).toMatch(/fonts\.gstatic\.com/);
    // Y nada de ejecutar scripts en línea.
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(csp).not.toMatch(/unsafe-eval/);
  });

  it('el CSS en línea sólo se admite como ATRIBUTO, nunca como bloque', async () => {
    /*
     * `style-src 'unsafe-inline'` permitía dos cosas distintas de un plumazo:
     * los atributos `style="…"` que React emite —que hacen falta para las
     * barras del panel de analítica, cuya anchura sale de los datos— y
     * cualquier bloque `<style>` inyectado, que no lo necesita nadie: Vite
     * compila todo el CSS a un fichero enlazado.
     *
     * Con CSS se tapa un botón, se repinta un precio o se sacan datos con
     * selectores de atributo, así que la diferencia importa.
     */
    const csp = (await request(await app()).get('/api/health')).headers['content-security-policy'];

    const styleSrc = /(?:^|;)\s*style-src ([^;]*)/.exec(csp as string)?.[1] ?? '';
    const styleSrcAttr = /(?:^|;)\s*style-src-attr ([^;]*)/.exec(csp as string)?.[1] ?? '';

    expect(styleSrc).not.toMatch(/unsafe-inline/);
    expect(styleSrcAttr).toMatch(/'unsafe-inline'/);
    // Las fuentes siguen pudiendo cargarse: si no, la tipografía se cae.
    expect(styleSrc).toMatch(/fonts\.googleapis\.com/);
  });
});

/* ══ 3. El precio lo pone el servidor ══════════════════════════════════ */

describe('integridad de precios', () => {
  it('los importes enviados por el cliente se ignoran por completo', async () => {
    const { producto, variante } = await crearProducto({ stock: 10, precioVariante: 62.9 });

    await request(await app())
      .post('/api/checkout')
      .send({
        shipping: DIRECCION_CANARIA,
        email: 'cliente@ejemplo.test',
        subtotal: 0.01,
        total: 0.01,
        items: [
          {
            productId: producto.id,
            variantId: variante.id,
            quantity: 1,
            unitPrice: 0.01,
            price: 0.01,
            name: 'Producto falsificado',
          },
        ],
      });

    const pedido = await prisma.order.findFirst({ include: { items: true } });
    expect(pedido).toBeTruthy();
    expect(Number(pedido!.items[0].unitPrice)).toBe(62.9);
    expect(pedido!.items[0].name).toBe(producto.name);
    expect(Number(pedido!.subtotal)).toBe(62.9);
    // 62,90 € supera el umbral de envío gratis: el servidor lo calcula solo.
    expect(Number(pedido!.shipping)).toBe(0);
    expect(Number(pedido!.total)).toBe(62.9);
  });

  it('un importe de envío enviado como número se rechaza de plano', async () => {
    // `shipping` es la DIRECCIÓN. Colar ahí un número no cuela un descuento:
    // el esquema no lo admite y la petición entera se rechaza.
    const { producto, variante } = await crearProducto({ stock: 10 });
    const res = await request(await app())
      .post('/api/checkout')
      .send({
        email: 'cliente@ejemplo.test',
        shipping: -100,
        items: [{ productId: producto.id, variantId: variante.id, quantity: 1 }],
      });

    expect(res.status).toBe(400);
    expect(await prisma.order.count()).toBe(0);
  });

  it('el envío se calcula, no se acepta', async () => {
    const { producto, variante } = await crearProducto({ stock: 10, precioVariante: 10 });

    await request(await app())
      .post('/api/checkout')
      .send({
        email: 'cliente@ejemplo.test',
        shipping: DIRECCION_CANARIA,
        items: [{ productId: producto.id, variantId: variante.id, quantity: 1 }],
      });

    const pedido = await prisma.order.findFirst();
    // Por debajo del umbral: 4,95 € de envío, lo diga el cliente o no.
    expect(Number(pedido!.shipping)).toBe(4.95);
    expect(Number(pedido!.total)).toBe(14.95);
  });

  it('varias líneas del mismo producto se agrupan antes de mirar el stock', async () => {
    /*
     * Sin agrupar, dos líneas de 1 unidad comprobarían el stock por separado y
     * las dos pasarían con una sola unidad disponible. Es la misma sobreventa
     * que la concurrencia, pero dentro de una única petición.
     */
    const { producto, variante } = await crearProducto({ stock: 1 });

    const res = await request(await app())
      .post('/api/checkout')
      .send({
        shipping: DIRECCION_CANARIA,
        email: 'cliente@ejemplo.test',
        items: [
          { productId: producto.id, variantId: variante.id, quantity: 1 },
          { productId: producto.id, variantId: variante.id, quantity: 1 },
        ],
      });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});

/* ══ 4. Contacto ═══════════════════════════════════════════════════════ */

describe('formulario de contacto', () => {
  const valido = {
    name: 'Ana Pérez',
    email: 'ana@ejemplo.test',
    subject: 'Consulta sobre pienso',
    message: 'Hola, quería preguntar por el pienso sin cereales.',
    consent: true,
  };

  it('un mensaje válido se guarda', async () => {
    const res = await request(await app()).post('/api/contact').send(valido);
    expect(res.status).toBe(201);
    expect(await prisma.contactMessage.count()).toBe(1);
  });

  it('sin consentimiento se rechaza', async () => {
    const { consent: _sin, ...sinConsentimiento } = valido;
    const res = await request(await app()).post('/api/contact').send(sinConsentimiento);
    expect(res.status).toBe(400);
    expect(await prisma.contactMessage.count()).toBe(0);
  });

  it('un salto de línea en el asunto se rechaza (inyección de cabeceras)', async () => {
    const res = await request(await app())
      .post('/api/contact')
      .send({ ...valido, subject: 'Consulta\r\nBcc: victima@ejemplo.test' });

    expect(res.status).toBe(400);
    expect(await prisma.contactMessage.count()).toBe(0);
  });

  it('un salto de línea en el nombre también', async () => {
    const res = await request(await app())
      .post('/api/contact')
      .send({ ...valido, name: 'Ana\nBcc: otra@ejemplo.test' });
    expect(res.status).toBe(400);
  });

  it('el mensaje se guarda tal cual, sin interpretarse', async () => {
    /*
     * El texto se almacena literal y React lo escapa al pintarlo. Lo que se
     * comprueba es que no haya un saneado a medias que "limpie" el mensaje y
     * cambie lo que alguien escribió.
     */
    const guion = '<script>alert(1)</script>';
    await request(await app()).post('/api/contact').send({ ...valido, message: guion });

    const guardado = await prisma.contactMessage.findFirst();
    expect(guardado?.message).toBe(guion);
  });

  it('el cebo para robots se traga el mensaje sin guardarlo', async () => {
    const res = await request(await app())
      .post('/api/contact')
      .send({ ...valido, website: 'http://spam.example' });

    // 201 a propósito: no se le dice al robot que ha sido detectado.
    expect(res.status).toBe(201);
    expect(await prisma.contactMessage.count()).toBe(0);
  });

  it('un mensaje desmesurado se rechaza', async () => {
    const res = await request(await app())
      .post('/api/contact')
      .send({ ...valido, message: 'a'.repeat(10_000) });
    expect(res.status).toBe(400);
  });
});
