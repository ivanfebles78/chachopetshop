import type { OrderFulfillment, OrderStatus } from '@prisma/client';

/**
 * EL CICLO DE VIDA DEL PEDIDO, EN UN SOLO SITIO.
 *
 * ── Dos ejes, no uno ───────────────────────────────────────────────────────
 *
 * `status` dice qué ha pasado con el DINERO. Lo escribe Stripe a través del
 * webhook firmado, y nadie más: ni el panel, ni una página de éxito, ni el
 * cliente. Es la garantía de la Fase 1 y aquí no se toca.
 *
 * `fulfillment` dice qué ha pasado con la CAJA: preparando, enviado, entregado.
 * Lo escribe Ivan desde el panel. Nada lo pone solo.
 *
 * Meterlo todo en un campo parecía más simple. No lo es: en cuanto un pedido
 * pasara a «preparando» se perdería el rastro de que el pago está confirmado, y
 * «cancelado» borraría que se cobró — que es justo el dato que hace falta para
 * saber si hay que devolver dinero. Con dos ejes, cancelar la preparación de un
 * pedido no puede insinuar un reembolso que nadie ha hecho.
 *
 * ── Nada se mueve solo ─────────────────────────────────────────────────────
 *
 * No hay ninguna transición automática a ENVIADO ni a ENTREGADO. No tenemos
 * integración con ninguna agencia de transporte, así que no hay ningún hecho
 * del mundo real que pudiera dispararlas: ponerlas por tiempo o por defecto
 * sería inventarse que el pedido llegó.
 */

/** El estado de pago, tal y como está en la base de datos. */
export type EstadoDePago = OrderStatus;

/** El estado operativo. `null` = pagado y aún sin preparar. */
export type EstadoOperativo = OrderFulfillment | null;

/**
 * Las transiciones operativas admitidas.
 *
 * Se lee «desde este estado, se puede pasar a estos». La clave `null` es el
 * punto de partida: un pedido recién pagado.
 *
 * ENTREGADO no lleva a ninguna parte: es el final. Y CANCELADO tampoco —
 * resucitar un pedido cancelado desde el panel sería una forma silenciosa de
 * deshacer una decisión que ya se le comunicó a alguien; si hace falta, se hace
 * un pedido nuevo.
 */
export const TRANSICIONES: Record<string, OrderFulfillment[]> = {
  null: ['PREPARING', 'CANCELLED'],
  PREPARING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

const clave = (desde: EstadoOperativo) => (desde === null ? 'null' : desde);

/** ¿Se puede pasar de un estado operativo a otro? */
export function transicionValida(desde: EstadoOperativo, hasta: OrderFulfillment): boolean {
  return (TRANSICIONES[clave(desde)] ?? []).includes(hasta);
}

/** Los estados a los que se puede pasar desde el actual. Lo usa el panel. */
export function siguientesEstados(desde: EstadoOperativo): OrderFulfillment[] {
  return TRANSICIONES[clave(desde)] ?? [];
}

/**
 * ¿Está el pago confirmado?
 *
 * `FULFILLED` es un valor heredado: antes de la Fase 2E significaba «pagado y
 * servido», y así se le enseñaba al cliente. Sigue contando como pagado para no
 * romper los pedidos que ya existen.
 */
export function estaPagado(status: EstadoDePago): boolean {
  return status === 'PAID' || status === 'FULFILLED';
}

/**
 * SÓLO SE PUEDE OPERAR SOBRE UN PEDIDO COBRADO.
 *
 * Marcar «preparando» algo cuyo pago no consta es prometer trabajo sobre dinero
 * que no ha llegado. Cancelar tampoco tiene sentido ahí: un pedido sin pagar ya
 * se resuelve solo cuando caduca la reserva.
 */
export function admiteCambioOperativo(status: EstadoDePago): boolean {
  return estaPagado(status);
}

/**
 * CANCELAR NO ES DEVOLVER EL DINERO.
 *
 * Cancelar mueve el eje operativo y nada más. No llama a Stripe, no emite
 * ningún reembolso y no cambia el estado de pago: si un pedido cobrado se
 * cancela, sigue constando como cobrado, porque el dinero sigue estando.
 *
 * Es una separación deliberada. Un reembolso es una decisión de negocio con
 * consecuencias contables, y ahora mismo no existe ni la política ni la
 * pantalla para tomarla. Que cancelar disparase un reembolso automático sería
 * exactamente el tipo de comportamiento inventado que no se puede permitir aquí.
 */
export const CANCELAR_NO_REEMBOLSA = true;
