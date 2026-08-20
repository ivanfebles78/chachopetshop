/**
 * CONCURRENCIA — la última unidad es de UNA sola persona.
 *
 * Este fichero existe porque el resto de la suite no puede demostrar esto. Las
 * pruebas de `stock.test.ts` mandan dos peticiones a la vez y comprueban que el
 * stock no queda negativo, pero pasarían igual con una implementación mala:
 * como la clave de Stripe de pruebas no sirve, las dos reservas se deshacen y el
 * stock vuelve a su sitio por el camino equivocado.
 *
 * Aquí se ataca la reserva directamente contra PostgreSQL, sin Stripe de por
 * medio, que es donde vive la garantía de verdad.
 *
 * Lo que se defiende es la diferencia entre dos formas de descontar:
 *
 *   MAL   leer el stock, comprobar en JavaScript, escribir el nuevo valor.
 *         Entre la lectura y la escritura caben dos compradores: los dos leen 1,
 *         los dos concluyen que hay suficiente, y los dos venden la misma unidad.
 *
 *   BIEN  un solo UPDATE con la condición en el WHERE. PostgreSQL bloquea la
 *         fila; el segundo actualiza 0 filas y se entera de que llegó tarde.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma, limpiar, crearProducto, stockDe } from './helpers.js';

/** La reserva tal y como la hace `checkout.ts`: condición dentro del UPDATE. */
async function reservarUnaUnidad(variantId: string, cantidad = 1) {
  const { count } = await prisma.productVariant.updateMany({
    where: { id: variantId, stock: { gte: cantidad } },
    data: { stock: { decrement: cantidad } },
  });
  return count === 1;
}

beforeEach(async () => {
  await limpiar();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('descuento condicional atómico', () => {
  it('con stock 1, de dos intentos simultáneos sólo uno gana', async () => {
    const { variante } = await crearProducto({ stock: 1 });

    const [a, b] = await Promise.all([
      reservarUnaUnidad(variante.id),
      reservarUnaUnidad(variante.id),
    ]);

    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect(await stockDe(variante.id)).toBe(0);
  });

  it('con stock 3 y veinte intentos simultáneos, ganan exactamente tres', async () => {
    const { variante } = await crearProducto({ stock: 3 });

    const resultados = await Promise.all(
      Array.from({ length: 20 }, () => reservarUnaUnidad(variante.id)),
    );

    expect(resultados.filter(Boolean)).toHaveLength(3);
    expect(await stockDe(variante.id)).toBe(0);
  });

  it('el stock nunca queda negativo, por mucho que se insista', async () => {
    const { variante } = await crearProducto({ stock: 5 });

    await Promise.all(Array.from({ length: 50 }, () => reservarUnaUnidad(variante.id, 2)));

    const restante = await stockDe(variante.id);
    expect(restante).toBeGreaterThanOrEqual(0);
    // 5 unidades en lotes de 2: caben dos reservas, sobra 1.
    expect(restante).toBe(1);
  });

  it('una reserva mayor que el stock nunca prospera', async () => {
    const { variante } = await crearProducto({ stock: 2 });
    expect(await reservarUnaUnidad(variante.id, 3)).toBe(false);
    expect(await stockDe(variante.id)).toBe(2);
  });
});

/* ══ La demostración de que el patrón importa ═════════════════════════ */

describe('por qué el patrón importa', () => {
  it('leer-y-luego-escribir SÍ vende de más en las mismas condiciones', async () => {
    /*
     * Esta prueba no defiende el código: defiende la DECISIÓN. Reproduce la
     * implementación ingenua y demuestra que con la misma carga sí sobrevende.
     *
     * Sin esto, alguien podría «simplificar» la reserva a un findUnique más un
     * update, ver la suite en verde —porque las demás pruebas comprueban el
     * resultado, no el método— y reintroducir el defecto. Aquí queda escrito qué
     * pasa exactamente si se hace.
     */
    const { variante } = await crearProducto({ stock: 1 });

    const reservaIngenua = async () => {
      const v = await prisma.productVariant.findUnique({ where: { id: variante.id } });
      if (!v || v.stock < 1) return false;
      // La ventana está justo aquí: los dos han leído 1 y ninguno ha escrito aún.
      await new Promise((r) => setTimeout(r, 20));
      await prisma.productVariant.update({
        where: { id: variante.id },
        data: { stock: v.stock - 1 },
      });
      return true;
    };

    const resultados = await Promise.all([reservaIngenua(), reservaIngenua()]);

    // Las dos creen haber vendido…
    expect(resultados.filter(Boolean)).toHaveLength(2);
    // …y el stock sólo baja una unidad: se ha vendido algo que no existía.
    expect(await stockDe(variante.id)).toBe(0);
  });
});
