/**
 * CÓMO SE LE CUENTA UN PEDIDO A QUIEN LO HA HECHO.
 *
 * El servidor guarda dos ejes —lo que pasó con el dinero y lo que pasó con la
 * caja— y aquí se convierten en una sola frase. Lo que se fija:
 *
 *   1. El estado del PAGO manda mientras no esté resuelto. Un pedido sin cobrar
 *      no puede leerse «preparando» aunque alguien se equivoque en el panel.
 *   2. Cada estado es distinguible sin depender del color.
 *   3. No se promete nada que no exista: ni fechas, ni seguimiento, ni
 *      devoluciones.
 */

import { describe, it, expect } from 'vitest';
import { estadoDePedido, ESTADOS, referenciaDePedido, avisoDeCambio } from './pedidos';
import type { Order } from './types';

const pedido = (p: Partial<Order>) => ({ status: 'PAID', ...p }) as Order;

describe('la frase que ve el cliente', () => {
  it('el camino normal, paso a paso', () => {
    expect(estadoDePedido(pedido({ status: 'PENDING' })).etiqueta).toBe(
      'Pago pendiente de confirmar',
    );
    expect(estadoDePedido(pedido({ status: 'PAID', fulfillment: null })).etiqueta).toBe('Pagado');
    expect(estadoDePedido(pedido({ fulfillment: 'PREPARING' })).etiqueta).toBe('Preparando');
    expect(estadoDePedido(pedido({ fulfillment: 'SHIPPED' })).etiqueta).toBe('Enviado');
    expect(estadoDePedido(pedido({ fulfillment: 'DELIVERED' })).etiqueta).toBe('Entregado');
    expect(estadoDePedido(pedido({ fulfillment: 'CANCELLED' })).etiqueta).toBe('Cancelado');
  });

  it('EL PAGO MANDA: sin cobrar no se lee «preparando»', () => {
    /*
     * El caso que protege esto: un pedido sin pagar con el eje operativo tocado
     * por error. Quien lo mira tiene que enterarse de que el pago no consta, no
     * de que se lo están preparando.
     */
    const raro = pedido({ status: 'PENDING', fulfillment: 'SHIPPED' });
    expect(estadoDePedido(raro).clave).toBe('PENDIENTE');
  });

  it('un pago fallido se lee como tal, y sin alarmar de más', () => {
    const e = estadoDePedido(pedido({ status: 'FAILED', fulfillment: 'PREPARING' }));
    expect(e.clave).toBe('FALLIDO');
    expect(e.explicacion).toContain('No se ha hecho ningún cargo');
  });

  it('«pendiente» NO se lee como «no has pagado»', () => {
    /*
     * Justo después de pagar lo normal es ver esto: el webhook firmado tarda
     * unos segundos. Decir «pendiente de pago» asustaría a quien acaba de pagar.
     */
    const e = ESTADOS.PENDIENTE;
    expect(e.etiqueta).not.toMatch(/pendiente de pago/i);
    expect(e.explicacion).toMatch(/unos segundos/i);
  });

  it('FULFILLED, el valor heredado, no deja el pedido sin frase', () => {
    // Pedidos anteriores a la Fase 2E. La migración les puso SHIPPED en el eje
    // operativo, pero aunque llegara uno sin él, tiene que decir algo sensato.
    expect(estadoDePedido(pedido({ status: 'FULFILLED' })).clave).toBe('PAGADO');
    expect(estadoDePedido(pedido({ status: 'FULFILLED', fulfillment: 'SHIPPED' })).clave).toBe(
      'ENVIADO',
    );
  });

  it('CANCELLED heredado en el eje de pago se sigue entendiendo', () => {
    expect(estadoDePedido(pedido({ status: 'CANCELLED' })).clave).toBe('CANCELADO');
  });

  it('un pedido pagado sin más es «Pagado», no un hueco', () => {
    expect(estadoDePedido(pedido({ fulfillment: undefined })).clave).toBe('PAGADO');
  });
});

describe('el color no informa solo', () => {
  it('cada estado trae palabra, clase e icono', () => {
    for (const estado of Object.values(ESTADOS)) {
      expect(estado.etiqueta.length).toBeGreaterThan(2);
      expect(estado.clase).toMatch(/^estado-/);
      expect(estado.icono).toBeTruthy();
    }
  });

  it('los seis estados del recorrido son distinguibles entre sí', () => {
    /*
     * No basta con que tengan colores distintos: dos estados con el mismo tono
     * tienen que llevar al menos icono distinto. Aquí se comprueba que ningún
     * par comparte las dos cosas a la vez.
     */
    const vistos = new Set<string>();
    for (const e of Object.values(ESTADOS)) {
      const huella = `${e.clase}|${e.icono.displayName ?? e.icono.name}`;
      expect(vistos.has(huella)).toBe(false);
      vistos.add(huella);
    }
  });

  it('las etiquetas no se repiten', () => {
    const etiquetas = Object.values(ESTADOS).map((e) => e.etiqueta);
    expect(new Set(etiquetas).size).toBe(etiquetas.length);
  });
});

describe('no se promete nada que no exista', () => {
  it('ningún estado inventa fechas, seguimiento ni devoluciones', () => {
    const texto = Object.values(ESTADOS)
      .map((e) => `${e.etiqueta} ${e.explicacion}`)
      .join(' ')
      .toLowerCase();

    for (const prohibido of [
      'seguimiento',
      'tracking',
      'llegará',
      'en 24',
      'en 48',
      'fecha estimada',
      'reembolso',
      'te devolvemos',
      'plazo de devolución',
      'transportista',
    ]) {
      expect(texto).not.toContain(prohibido);
    }
  });

  it('«cancelado» no promete que te devuelvan el dinero', () => {
    // El servidor no emite ningún reembolso al cancelar. Prometerlo aquí sería
    // exactamente el tipo de invento que esta fase evita.
    expect(ESTADOS.CANCELADO.explicacion.toLowerCase()).not.toContain('devolv');
    expect(ESTADOS.CANCELADO.explicacion.toLowerCase()).not.toContain('reembols');
  });

  it('«enviado» no se inventa un transportista', () => {
    expect(ESTADOS.ENVIADO.explicacion).toBe('Tu pedido ya ha salido.');
  });
});

describe('avisos antes de un cambio que no se deshace', () => {
  it('cancelar avisa, y dice la verdad sobre el dinero y el stock', () => {
    const aviso = avisoDeCambio('CANCELLED')!;
    expect(aviso).toContain('No se devuelve el dinero automáticamente');
    expect(aviso).toContain('ni se repone el stock');
  });

  it('marcar entregado avisa de que es el final', () => {
    expect(avisoDeCambio('DELIVERED')).toContain('no se puede deshacer');
  });

  it('los cambios reversibles no molestan con un aviso', () => {
    expect(avisoDeCambio('PREPARING')).toBeNull();
    expect(avisoDeCambio('SHIPPED')).toBeNull();
  });
});

describe('la referencia del pedido', () => {
  it('son los ocho últimos caracteres, en mayúsculas', () => {
    expect(referenciaDePedido('cmt64jce2002rz7pc7cg8abcd')).toBe('#7CG8ABCD');
  });
});
