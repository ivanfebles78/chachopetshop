import type { Order } from './types';

/**
 * CÓMO SE LE CUENTA UN PEDIDO A QUIEN LO HA HECHO.
 *
 * Los estados de la base de datos son `PENDING`, `PAID`, `FAILED`, `FULFILLED`
 * y `CANCELLED`. Son nombres para el código, no para una persona: «PENDING» no
 * le dice a nadie si tiene que hacer algo o esperar.
 *
 * Cada uno se traduce a lo que significa PARA EL CLIENTE, y con cuidado en dos
 * sitios:
 *
 *   · `PENDING` no es «no has pagado». Es «tu pago aún no nos consta»: el
 *     webhook firmado de Stripe tarda unos segundos, así que justo después de
 *     pagar lo normal es ver esto. Decir «pendiente de pago» asustaría a quien
 *     acaba de pagar de verdad.
 *
 *   · `FULFILLED` significa que el pedido se ha preparado y servido. No se
 *     inventa ningún seguimiento ni número de envío: no existe ese dato.
 */
export const ESTADO: Record<
  Order['status'] | 'FAILED',
  { etiqueta: string; explicacion: string; clase: string }
> = {
  PENDING: {
    etiqueta: 'Pago pendiente de confirmar',
    explicacion: 'Estamos esperando la confirmación del pago. Suele tardar unos segundos.',
    clase: 'estado-espera',
  },
  PAID: {
    etiqueta: 'Pagado',
    explicacion: 'Hemos recibido el pago y estamos preparando tu pedido.',
    clase: 'estado-ok',
  },
  FULFILLED: {
    etiqueta: 'Enviado',
    explicacion: 'Tu pedido ya ha salido.',
    clase: 'estado-ok',
  },
  CANCELLED: {
    etiqueta: 'Cancelado',
    explicacion: 'Este pedido se canceló y no se ha cobrado nada.',
    clase: 'estado-neutro',
  },
  FAILED: {
    etiqueta: 'Pago no completado',
    explicacion: 'El pago no llegó a completarse. No se ha hecho ningún cargo.',
    clase: 'estado-aviso',
  },
};

/**
 * La referencia que ve el cliente.
 *
 * El identificador interno es un `cuid` de 25 caracteres: no se puede dictar
 * por teléfono ni copiar sin equivocarse. Se enseñan los ocho últimos en
 * mayúsculas, que es lo que se puede leer en voz alta — y el identificador
 * completo sigue siendo el que viaja en los enlaces.
 */
export function referenciaDePedido(id: string): string {
  return `#${id.slice(-8).toUpperCase()}`;
}

/** Cuántas unidades lleva un pedido en total. */
export function unidadesDe(pedido: Order): number {
  return pedido.items.reduce((n, i) => n + i.quantity, 0);
}
