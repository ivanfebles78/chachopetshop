import { prisma } from '../db.js';

/**
 * RESERVAS DE EXISTENCIAS CON FECHA DE CADUCIDAD.
 *
 * ── El problema que resuelve ───────────────────────────────────────────────
 *
 * El stock se descuenta al crear la sesión de pago, no al cobrar. Es lo
 * correcto para una tienda con dos o tres sacos de cada formato: vender algo
 * que no existe y tener que devolver el dinero es peor que retener una unidad
 * un rato. Eso ya venía de la Fase 1 y no se toca.
 *
 * Lo que faltaba era el final de la frase: **hasta cuándo**. Si alguien abría
 * la pasarela y cerraba la pestaña, la reserva sólo se soltaba cuando Stripe
 * daba la sesión por caducada — y el valor por defecto de Stripe son
 * VEINTICUATRO HORAS. Un puñado de carritos abandonados dejaba la tienda
 * agotada de cara al resto del día.
 *
 * La política es de 30 minutos.
 *
 * ── Por qué la fecha va en la fila y no en un temporizador ─────────────────
 *
 * Un `setTimeout` se pierde al reiniciar el contenedor, y con dos instancias se
 * ejecuta dos veces. La fecha límite es un dato del pedido: se guarda en
 * `reservedUntil`, sobrevive al reinicio y la ve cualquier instancia. El
 * temporizador de la aplicación es sólo quien pregunta; la verdad está en la
 * base de datos.
 *
 * ── Por qué liberar es idempotente ─────────────────────────────────────────
 *
 * `stockCommitted` se apaga con la condición dentro del propio WHERE. Dos
 * liberaciones simultáneas —el webhook y la limpieza, o dos instancias a la
 * vez— no pueden reponer dos veces: la segunda actualiza cero filas y no hace
 * nada. Es el mismo patrón que la reserva atómica de la Fase 1.
 */

/** Cuánto se retienen las existencias mientras se paga. Es LA política. */
export const MINUTOS_DE_RESERVA = 30;

/**
 * Lo que la limpieza espera DE MÁS antes de tocar una reserva vencida.
 *
 * Sin este margen hay una carrera con dinero de por medio: alguien paga en el
 * minuto 29:59, el aviso firmado de Stripe tarda unos segundos en llegar, y
 * mientras tanto la limpieza ve la reserva vencida, marca el pedido como
 * fallido y devuelve las existencias al stock. Resultado: un cliente que ha
 * pagado y un pedido que dice que no.
 *
 * La reserva sigue siendo de 30 minutos —a los 30 la pasarela de Stripe ya ha
 * caducado y no se puede pagar—; esto es sólo el tiempo que la limpieza da a
 * los avisos que ya venían de camino. Cinco minutos son varios órdenes de
 * magnitud más de lo que tarda un webhook.
 */
export const MARGEN_PARA_EL_WEBHOOK = 5;

const MS_POR_MINUTO = 60_000;

/** Cuándo caduca una reserva que empieza ahora. */
export function caducidadDesde(ahora: Date): Date {
  return new Date(ahora.getTime() + MINUTOS_DE_RESERVA * MS_POR_MINUTO);
}

/**
 * `expires_at` para Stripe, en segundos desde época.
 *
 * Stripe admite entre 30 minutos y 24 horas desde la creación de la sesión, y
 * **por defecto usa 24 horas** — comprobado en la definición del SDK instalado
 * (`stripe@17`), no supuesto. Nuestros 30 minutos son exactamente el mínimo que
 * acepta, así que la pasarela caduca a la vez que la reserva y no hay ninguna
 * ventana en la que Stripe siga admitiendo un pago cuyo stock ya se soltó.
 *
 * Se redondea hacia arriba: si se quedara un segundo corto, Stripe rechaza la
 * creación de la sesión entera y no se podría comprar.
 */
export function expiraEnStripe(ahora: Date): number {
  return Math.ceil(caducidadDesde(ahora).getTime() / 1000);
}

/** Devuelve al stock lo que tuviera reservado una lista de líneas. */
async function devolverLineas(lineas: { variantId: string | null; quantity: number }[]) {
  for (const linea of lineas) {
    if (!linea.variantId) continue;
    await prisma.productVariant.update({
      where: { id: linea.variantId },
      data: { stock: { increment: linea.quantity } },
    });
  }
}

/**
 * Devuelve el stock de un pedido UNA sola vez.
 *
 * Apagar `stockCommitted` con la condición en el WHERE es lo que hace que esto
 * se pueda llamar tantas veces como haga falta: el segundo intento no encuentra
 * nada que apagar y se va sin tocar el inventario.
 *
 * Devuelve `true` si esta llamada fue la que liberó de verdad.
 */
export async function liberarStockDelPedido(orderId: string): Promise<boolean> {
  const { count } = await prisma.order.updateMany({
    where: { id: orderId, stockCommitted: true },
    /*
     * Sólo se apaga la bandera. `reservedUntil` se queda como estaba: es el
     * plazo que se fijó, no un estado. Quien decide si hay stock retenido es
     * `stockCommitted`, y la limpieza exige además `status: 'PENDING'`, así que
     * una fecha vieja en una fila ya soltada es inerte — y sirve para saber
     * después qué plazo tenía aquel pedido.
     */
    data: { stockCommitted: false },
  });
  if (count === 0) return false;

  const items = await prisma.orderItem.findMany({ where: { orderId } });
  await devolverLineas(items);
  return true;
}

/**
 * Suelta las reservas que han vencido.
 *
 * La condición es deliberadamente estrecha y cada parte está ahí por algo:
 *
 *   · `status: 'PENDING'` — un pedido PAGADO nunca se toca. Sus existencias
 *     están vendidas, no reservadas, y devolverlas al stock sería vender dos
 *     veces lo mismo. Ésta es la línea que impide el peor fallo posible aquí.
 *   · `stockCommitted: true` — lo que ya se soltó no se suelta otra vez.
 *   · `reservedUntil < ahora` — sólo lo vencido. A los 29 minutos y 59 segundos
 *     la reserva sigue en pie.
 *
 * Se liberan de una en una y con la condición dentro del UPDATE, así que dos
 * instancias ejecutando esto a la vez no se pisan: cada pedido lo libera quien
 * llegue primero y el otro obtiene cero filas.
 *
 * `ahora` se pasa como parámetro para que las pruebas puedan viajar en el
 * tiempo sin esperar media hora de verdad.
 */
export async function liberarReservasVencidas(ahora: Date = new Date()): Promise<{
  liberados: string[];
}> {
  const limite = new Date(ahora.getTime() - MARGEN_PARA_EL_WEBHOOK * MS_POR_MINUTO);

  const vencidos = await prisma.order.findMany({
    where: {
      status: 'PENDING',
      stockCommitted: true,
      reservedUntil: { not: null, lt: limite },
    },
    select: { id: true },
    // Un tope por pasada: si algo fuera muy mal y hubiera miles, más vale ir
    // soltando en tandas que bloquear la base de datos con una transacción
    // enorme. La siguiente pasada continúa donde ésta lo dejó.
    take: 200,
  });

  const liberados: string[] = [];
  for (const pedido of vencidos) {
    /*
     * Marcar FAILED antes de soltar, y con la condición en el WHERE. Si se
     * dejara en PENDING, «pendiente» significaría dos cosas —esperando pago, y
     * abandonado hace rato— y la propia limpieza volvería a encontrarlo en cada
     * pasada.
     */
    const { count } = await prisma.order.updateMany({
      where: { id: pedido.id, status: 'PENDING', stockCommitted: true },
      data: { status: 'FAILED' },
    });
    if (count === 0) continue; // Alguien resolvió el pedido entre la consulta y aquí.

    if (await liberarStockDelPedido(pedido.id)) liberados.push(pedido.id);
  }

  return { liberados };
}
