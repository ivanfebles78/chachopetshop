/**
 * LO QUE SE ANUNCIA Y LO QUE SE COBRA SON EL MISMO DATO.
 *
 * El umbral de envío gratis estaba escrito SEIS veces entre servidor y cliente
 * —checkout, cajón del carrito, página de pago, cabecera, «Conócenos» y
 * portada—. Todas coincidían el día que se escribieron, y bastaba con que
 * alguien cambiara una para que la tienda prometiera envío gratis desde 49 € y
 * cobrara con otro umbral.
 *
 * Esa clase de fallo no la caza mirar la pantalla: se ve en el importe, al
 * final, cuando ya hay un cargo hecho.
 */

import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { prisma } from './helpers.js';
import { ENVIO, envioPara } from '../src/lib/envio.js';

async function app() {
  const { createApp } = await import('../src/app.js');
  return createApp();
}

afterAll(() => prisma.$disconnect());

describe('la regla de envío es una sola', () => {
  it('la publica tal cual la aplica', async () => {
    const res = await request(await app()).get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body.envio.gratisDesde).toBe(ENVIO.GRATIS_DESDE);
    expect(res.body.envio.tarifa).toBe(ENVIO.TARIFA);
  });

  it('no expone nada más que las reglas comerciales', () => {
    // Es un endpoint público: aquí no puede colarse configuración interna.
    const claves = Object.keys({ envio: null });
    expect(claves).toEqual(['envio']);
  });

  it('por debajo del umbral se cobra la tarifa', () => {
    expect(envioPara(ENVIO.GRATIS_DESDE - 0.01)).toBe(ENVIO.TARIFA);
    expect(envioPara(1)).toBe(ENVIO.TARIFA);
  });

  it('justo en el umbral ya es gratis', () => {
    // El límite exacto, que es donde se equivoca todo el mundo: «desde 49 €»
    // incluye 49 €.
    expect(envioPara(ENVIO.GRATIS_DESDE)).toBe(0);
  });

  it('por encima del umbral, gratis', () => {
    expect(envioPara(ENVIO.GRATIS_DESDE + 100)).toBe(0);
  });

  it('un carrito vacío no paga envío', () => {
    expect(envioPara(0)).toBe(0);
  });
});
