/**
 * SOLO SE ENTREGA EN CANARIAS, Y AHORA EL SISTEMA LO HACE CUMPLIR.
 *
 * Hasta esta fase, «Entregamos en Canarias en 24-48 h» era una frase escrita en
 * la cabecera y en el pie. El checkout aceptaba cualquier código postal:
 * alguien de Madrid podía comprar, pagar, y descubrir el problema cuando el
 * pedido no llegaba. Eso son una devolución, un cliente enfadado y una reseña.
 *
 * La regla que se fija aquí:
 *
 *   Un pedido sólo se crea si su código postal de entrega es de Canarias:
 *   35xxx (Las Palmas) o 38xxx (Santa Cruz de Tenerife).
 *
 * Y se comprueba en el SERVIDOR, que es lo único que no se puede saltar. La
 * validación del formulario ahorra un viaje y explica el problema antes de
 * pedir la tarjeta, pero no es una garantía: cualquiera puede mandar la
 * petición a mano.
 *
 * Un detalle que importa más de lo que parece: la comprobación va ANTES de
 * reservar stock. Si fuese después, un pedido rechazado retendría existencias
 * de un producto que sí se puede vender a alguien de Canarias.
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';

import { prisma, limpiar, crearProducto, stockDe } from './helpers.js';
import {
  esCodigoPostalDeCanarias,
  FUERA_DE_ZONA,
  paisAdmitido,
  ZONA_DE_ENVIO,
} from '../src/lib/envio.js';

async function app() {
  const { createApp } = await import('../src/app.js');
  return createApp();
}

beforeEach(async () => {
  vi.resetModules();
  process.env.STRIPE_SECRET_KEY = 'sk_test_clave_de_pruebas';
  await limpiar();
});

afterAll(async () => {
  await prisma.$disconnect();
});

/* ══ 1. La regla, en frío ══════════════════════════════════════════════════ */

describe('qué código postal es de Canarias', () => {
  it('acepta Las Palmas (35xxx)', () => {
    // Gran Canaria, Lanzarote y Fuerteventura comparten el prefijo 35.
    for (const cp of ['35001', '35010', '35500', '35600', '35660', '35999']) {
      expect(esCodigoPostalDeCanarias(cp)).toBe(true);
    }
  });

  it('acepta Santa Cruz de Tenerife (38xxx)', () => {
    // Tenerife, La Palma, La Gomera y El Hierro comparten el prefijo 38.
    for (const cp of ['38001', '38201', '38400', '38700', '38900', '38999']) {
      expect(esCodigoPostalDeCanarias(cp)).toBe(true);
    }
  });

  it('rechaza la Península', () => {
    // Madrid, Barcelona, Sevilla, Valencia, Bilbao, A Coruña.
    for (const cp of ['28001', '08001', '41001', '46001', '48001', '15001']) {
      expect(esCodigoPostalDeCanarias(cp)).toBe(false);
    }
  });

  it('rechaza Baleares (07xxx)', () => {
    for (const cp of ['07001', '07800', '07701']) {
      expect(esCodigoPostalDeCanarias(cp)).toBe(false);
    }
  });

  it('rechaza Ceuta (51xxx) y Melilla (52xxx)', () => {
    for (const cp of ['51001', '51002', '52001', '52006']) {
      expect(esCodigoPostalDeCanarias(cp)).toBe(false);
    }
  });

  it('rechaza los prefijos VECINOS, que es donde fallan estas cosas', () => {
    /*
     * Comprobar sólo «empieza por 35 o 38» sobre una cadena de longitud libre
     * dejaría pasar un 3500 de cuatro cifras o un 350010 de seis. Y un 34xxx
     * (Palencia) o un 39xxx (Cantabria) están a un dígito de distancia.
     */
    for (const cp of ['34001', '36001', '37001', '39001', '30001', '33001']) {
      expect(esCodigoPostalDeCanarias(cp)).toBe(false);
    }
  });

  it('rechaza lo malformado', () => {
    for (const cp of [
      '',
      '   ',
      '3520',      // cuatro cifras
      '352011',    // seis cifras
      '35',        // sólo el prefijo
      '35abc',
      'abcde',
      '35-201',
      '3.5201',
      '+35201',
      '35201.0',
      '０３５２０', // dígitos de ancho completo: no son ASCII
      'ES-35001',
    ]) {
      expect(esCodigoPostalDeCanarias(cp)).toBe(false);
    }
  });

  it('rechaza lo que ni siquiera es una cadena', () => {
    // Llega de una petición HTTP: puede ser cualquier cosa.
    for (const valor of [undefined, null, 35201, {}, [], true, ['35201']]) {
      expect(esCodigoPostalDeCanarias(valor)).toBe(false);
    }
  });

  it('tolera los espacios que la gente escribe o pega', () => {
    for (const cp of [' 35001', '38201 ', '  38201  ', '35 001']) {
      expect(esCodigoPostalDeCanarias(cp)).toBe(true);
    }
  });

  it('el mensaje es exactamente el que Ivan pidió', () => {
    // Se escribe una vez y lo usan servidor, cliente y estas pruebas.
    expect(FUERA_DE_ZONA).toBe('Actualmente solo realizamos envíos a las Islas Canarias.');
  });

  it('los prefijos son los dos de Canarias y ninguno más', () => {
    expect([...ZONA_DE_ENVIO.PREFIJOS]).toEqual(['35', '38']);
  });
});

/* ══ 2. En el servidor, que es donde cuenta ════════════════════════════════ */

const pedir = async (zip: unknown, extra: Record<string, unknown> = {}) => {
  const { producto, variante } = await crearProducto({ stock: 5, precio: 20 });
  const res = await request(await app())
    .post('/api/checkout')
    .send({
      email: 'cliente@ejemplo.test',
      items: [{ productId: producto.id, variantId: variante.id, quantity: 1 }],
      shipping: { name: 'Nombre Apellido', address: 'Calle Real 1', city: 'Arucas', zip, ...extra },
    });
  return { res, variante };
};

describe('el checkout rechaza lo que no puede entregar', () => {
  it('un código postal de Madrid no llega al pago', async () => {
    const { res } = await pedir('28001');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(FUERA_DE_ZONA);
  });

  it('y no deja rastro: ni pedido, ni stock retenido', async () => {
    /*
     * Lo importante de este caso. Si la comprobación estuviese después de
     * reservar, cada intento desde la Península retendría existencias de algo
     * que sí se le puede vender a alguien de Canarias.
     */
    const { res, variante } = await pedir('28001');
    expect(res.status).toBe(400);
    expect(await prisma.order.count()).toBe(0);
    expect(await stockDe(variante.id)).toBe(5);
  });

  it('Baleares, Ceuta y Melilla tampoco', async () => {
    for (const cp of ['07001', '51001', '52001']) {
      const { res } = await pedir(cp);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe(FUERA_DE_ZONA);
    }
    expect(await prisma.order.count()).toBe(0);
  });

  it('un código postal malformado tampoco', async () => {
    for (const cp of ['abcde', '3520', '352011', '']) {
      const { res } = await pedir(cp);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe(FUERA_DE_ZONA);
    }
    expect(await prisma.order.count()).toBe(0);
  });

  it('OMITIR el código postal no es una forma de saltarse la regla', async () => {
    /*
     * El agujero evidente de una comprobación escrita como «si viene un CP,
     * que sea canario»: no mandarlo. Tiene que ser «que venga Y que sea
     * canario».
     */
    const { producto, variante } = await crearProducto({ stock: 5, precio: 20 });
    const cuerpos = [
      { shipping: { name: 'Nombre', address: 'Calle 1', city: 'Arucas' } }, // sin zip
      { shipping: {} },
      {}, // sin dirección de ningún tipo
    ];
    for (const cuerpo of cuerpos) {
      const res = await request(await app())
        .post('/api/checkout')
        .send({
          email: 'cliente@ejemplo.test',
          items: [{ productId: producto.id, variantId: variante.id, quantity: 1 }],
          ...cuerpo,
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe(FUERA_DE_ZONA);
    }
    expect(await prisma.order.count()).toBe(0);
    expect(await stockDe(variante.id)).toBe(5);
  });

  it('mandar un zip que no es texto tampoco cuela', async () => {
    for (const zip of [35201, null, { toString: () => '35201' }, ['35201']]) {
      const { res } = await pedir(zip);
      expect(res.status).toBe(400);
    }
    expect(await prisma.order.count()).toBe(0);
  });

  it('escribir «España» o «Canarias» en la ciudad no abre la puerta', async () => {
    /*
     * Me lo pidió Ivan explícitamente: no basta con que ponga España. El texto
     * libre no es una comprobación — el código postal sí.
     */
    for (const ciudad of ['Canarias', 'España', 'Las Palmas de Gran Canaria']) {
      const { producto, variante } = await crearProducto({ stock: 5, precio: 20 });
      const res = await request(await app())
        .post('/api/checkout')
        .send({
          email: 'cliente@ejemplo.test',
          items: [{ productId: producto.id, variantId: variante.id, quantity: 1 }],
          shipping: { name: 'N', address: 'Calle 1', city: ciudad, zip: '28001' },
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe(FUERA_DE_ZONA);
      expect(await stockDe(variante.id)).toBe(5);
    }
  });
});

/* ══ 3. Y deja pasar lo que sí puede entregar ══════════════════════════════ */

describe('el checkout acepta Canarias', () => {
  /*
   * Estas pruebas NO llegan a pagar: la clave de Stripe es falsa, así que la
   * petición falla al crear la sesión. Lo que se comprueba es que el pedido se
   * CREÓ, es decir, que la comprobación de zona lo dejó pasar. La Fase 1 se
   * encarga de devolver la reserva cuando Stripe falla, y eso ya tiene sus
   * propias pruebas.
   */
  it('un código postal de Las Palmas pasa la comprobación', async () => {
    const { res } = await pedir('35001');
    expect(res.status).not.toBe(400);
    expect(res.body.error).not.toBe(FUERA_DE_ZONA);
    expect(await prisma.order.count()).toBe(1);
  });

  it('uno de Santa Cruz de Tenerife también', async () => {
    const { res } = await pedir('38201');
    expect(res.status).not.toBe(400);
    expect(await prisma.order.count()).toBe(1);
  });

  it('el código postal se guarda NORMALIZADO', async () => {
    // Quien pega «38 201» desde un correo debe quedar guardado como «38201»,
    // o la etiqueta de envío sale con un código postal que no existe.
    await pedir(' 38 201 ');
    const pedido = await prisma.order.findFirst();
    expect(pedido?.shippingZip).toBe('38201');
  });

  it('y el resto de la dirección se guarda tal cual', async () => {
    await pedir('35001');
    const pedido = await prisma.order.findFirst();
    expect(pedido?.shippingName).toBe('Nombre Apellido');
    expect(pedido?.shippingAddress).toBe('Calle Real 1');
    expect(pedido?.shippingCity).toBe('Arucas');
  });
});

/* ══ 4. La regla se publica, no se duplica ═════════════════════════════════ */

describe('/api/config publica la zona', () => {
  it('devuelve los prefijos y el mensaje, para que el cliente no los repita', async () => {
    const res = await request(await app()).get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body.envio.prefijosCp).toEqual(['35', '38']);
    expect(res.body.envio.fueraDeZona).toBe(FUERA_DE_ZONA);
  });

  it('y sigue sin filtrar nada que no sea comercial', async () => {
    const res = await request(await app()).get('/api/config');
    const texto = JSON.stringify(res.body).toLowerCase();
    for (const prohibido of ['secret', 'key', 'token', 'password', 'database', 'sk_']) {
      expect(texto).not.toContain(prohibido);
    }
  });
});

/* ══ 5. El punto ciego de los cinco dígitos ═══════════════════════════════ */

describe('el país, cuando llega', () => {
  /*
   * Los códigos postales franceses también son de cinco cifras, y **35000 es
   * Rennes y 38000 es Grenoble**. Comprobar sólo el número deja pasar una
   * dirección francesa.
   *
   * El formulario no pide el país —se entrega sólo en Canarias—, así que ese
   * hueco lo cierra hoy una persona al leer la ciudad antes de enviar. Lo que
   * sí se cierra por código: si el país VIENE en la petición, tiene que ser
   * España.
   */
  it('si no viene, no estorba: el formulario no lo pide', () => {
    expect(paisAdmitido(undefined)).toBe(true);
    expect(paisAdmitido(null)).toBe(true);
    expect(paisAdmitido('')).toBe(true);
  });

  it('España, escrita como la escriba quien sea', () => {
    for (const p of ['ES', 'es', 'España', 'espana', 'Spain', ' es ']) {
      expect(paisAdmitido(p)).toBe(true);
    }
  });

  it('cualquier otro país, no', () => {
    for (const p of ['FR', 'Francia', 'PT', 'Portugal', 'MA', 'DE', 'United Kingdom']) {
      expect(paisAdmitido(p)).toBe(false);
    }
  });

  it('y lo que ni siquiera es texto, tampoco', () => {
    for (const p of [34, {}, [], true]) expect(paisAdmitido(p)).toBe(false);
  });

  it('RENNES 35000 con país Francia se rechaza en el servidor', async () => {
    const { producto, variante } = await crearProducto({ stock: 5, precio: 20 });
    const res = await request(await app())
      .post('/api/checkout')
      .send({
        email: 'cliente@ejemplo.test',
        items: [{ productId: producto.id, variantId: variante.id, quantity: 1 }],
        shipping: {
          name: 'Jean Dupont',
          address: '1 rue de la Paix',
          city: 'Rennes',
          zip: '35000',
          country: 'FR',
        },
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(FUERA_DE_ZONA);
    expect(await prisma.order.count()).toBe(0);
    expect((await prisma.productVariant.findUnique({ where: { id: variante.id } }))?.stock).toBe(5);
  });

  it('Grenoble 38000 con país Francia, igual', async () => {
    const { producto, variante } = await crearProducto({ stock: 5, precio: 20 });
    const res = await request(await app())
      .post('/api/checkout')
      .send({
        email: 'cliente@ejemplo.test',
        items: [{ productId: producto.id, variantId: variante.id, quantity: 1 }],
        shipping: { name: 'X', address: 'Y', city: 'Grenoble', zip: '38000', country: 'Francia' },
      });
    expect(res.status).toBe(400);
    expect(await prisma.order.count()).toBe(0);
  });

  it('y una dirección canaria diciendo España sigue pasando', async () => {
    const { producto, variante } = await crearProducto({ stock: 5, precio: 20 });
    const res = await request(await app())
      .post('/api/checkout')
      .send({
        email: 'cliente@ejemplo.test',
        items: [{ productId: producto.id, variantId: variante.id, quantity: 1 }],
        shipping: {
          name: 'Ana',
          address: 'Calle Real 1',
          city: 'Arucas',
          zip: '35400',
          country: 'España',
        },
      });
    expect(res.status).not.toBe(400);
    expect(await prisma.order.count()).toBe(1);
  });
});
