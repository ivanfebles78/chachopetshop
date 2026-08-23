import {
  AlertTriangle,
  Check,
  CircleCheck,
  Clock,
  Package,
  Truck,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { Order } from './types';

/**
 * CÓMO SE LE CUENTA UN PEDIDO A QUIEN LO HA HECHO.
 *
 * ── Dos ejes, una sola frase ───────────────────────────────────────────────
 *
 * El servidor guarda dos cosas distintas: qué ha pasado con el DINERO
 * (`status`, lo escribe el webhook firmado de Stripe) y qué ha pasado con la
 * CAJA (`fulfillment`, lo escribe Ivan desde el panel). Están separados porque
 * juntarlos borraría el rastro del cobro en cuanto el pedido avanzara.
 *
 * A quien compra eso no le interesa. Sólo quiere una frase. Aquí se convierten
 * los dos ejes en esa frase, y **se hace en un único sitio**: antes cada
 * pantalla se inventaba su etiqueta y su color, y bastaba con tocar una para
 * que la cuenta y la confirmación dijeran cosas distintas del mismo pedido.
 *
 * ── El color nunca informa solo ────────────────────────────────────────────
 *
 * Cada estado lleva palabra, color e icono. Quien no distingue el verde del
 * verde azulado —o quien escucha la página en vez de verla— se queda con lo
 * mismo que los demás.
 *
 * ── Y sigue sin inventarse nada ────────────────────────────────────────────
 *
 * No hay fecha estimada de entrega, ni seguimiento, ni transportista: no
 * existen esos datos. «Enviado» significa que salió, y nada más.
 */

export type ClaveDeEstado =
  | 'PENDIENTE'
  | 'FALLIDO'
  | 'PAGADO'
  | 'PREPARANDO'
  | 'ENVIADO'
  | 'ENTREGADO'
  | 'CANCELADO';

export type Estado = {
  clave: ClaveDeEstado;
  etiqueta: string;
  explicacion: string;
  clase: string;
  icono: LucideIcon;
};

export const ESTADOS: Record<ClaveDeEstado, Estado> = {
  PENDIENTE: {
    clave: 'PENDIENTE',
    etiqueta: 'Pago pendiente de confirmar',
    /*
     * NO es «no has pagado». El webhook firmado de Stripe tarda unos segundos,
     * así que justo después de pagar lo normal es leer esto. Decir «pendiente
     * de pago» asustaría a quien acaba de pagar de verdad.
     */
    explicacion: 'Estamos esperando la confirmación del pago. Suele tardar unos segundos.',
    clase: 'estado-neutro',
    icono: Clock,
  },
  FALLIDO: {
    clave: 'FALLIDO',
    etiqueta: 'El pago no se completó',
    explicacion: 'No se ha hecho ningún cargo. Puedes volver a intentarlo cuando quieras.',
    clase: 'estado-aviso',
    icono: AlertTriangle,
  },
  PAGADO: {
    clave: 'PAGADO',
    etiqueta: 'Pagado',
    explicacion: 'Hemos recibido el pago. Empezaremos a preparar tu pedido.',
    clase: 'estado-espera',
    icono: CircleCheck,
  },
  PREPARANDO: {
    clave: 'PREPARANDO',
    etiqueta: 'Preparando',
    explicacion: 'Estamos montando tu pedido.',
    clase: 'estado-proceso',
    icono: Package,
  },
  ENVIADO: {
    clave: 'ENVIADO',
    etiqueta: 'Enviado',
    // Ni transportista ni número de seguimiento: no existe ese dato.
    explicacion: 'Tu pedido ya ha salido.',
    clase: 'estado-transito',
    icono: Truck,
  },
  ENTREGADO: {
    clave: 'ENTREGADO',
    etiqueta: 'Entregado',
    explicacion: 'Tu pedido consta como entregado.',
    clase: 'estado-ok',
    icono: Check,
  },
  CANCELADO: {
    clave: 'CANCELADO',
    etiqueta: 'Cancelado',
    /*
     * Con cuidado: cancelar NO devuelve el dinero — el servidor no emite ningún
     * reembolso—, así que aquí no se puede prometer uno. Si hubo cobro, se
     * resuelve hablando con la tienda.
     */
    explicacion: 'Este pedido se ha cancelado. Si tienes dudas, escríbenos.',
    clase: 'estado-neutro',
    icono: X,
  },
};

/**
 * De los dos ejes a la frase.
 *
 * El orden importa: el estado del PAGO manda mientras no esté resuelto. Un
 * pedido sin cobrar no puede leerse «preparando» aunque alguien se equivocara
 * al tocar el panel.
 */
export function estadoDePedido(pedido: {
  status: Order['status'];
  fulfillment?: Order['fulfillment'];
}): Estado {
  if (pedido.status === 'PENDING') return ESTADOS.PENDIENTE;
  if (pedido.status === 'FAILED') return ESTADOS.FALLIDO;

  /*
   * `CANCELLED` en el eje de pago es un valor heredado de antes de la Fase 2E,
   * cuando todo vivía en un solo campo. Se sigue entendiendo.
   */
  if (pedido.status === 'CANCELLED') return ESTADOS.CANCELADO;

  switch (pedido.fulfillment) {
    case 'PREPARING':
      return ESTADOS.PREPARANDO;
    case 'SHIPPED':
      return ESTADOS.ENVIADO;
    case 'DELIVERED':
      return ESTADOS.ENTREGADO;
    case 'CANCELLED':
      return ESTADOS.CANCELADO;
    default:
      /*
       * Pagado y nada más todavía. También cubre `FULFILLED`, el valor heredado
       * que significaba «pagado y servido»: la migración le puso `SHIPPED` en
       * el eje operativo, así que entra por la rama de arriba y aquí sólo caen
       * los pedidos recién cobrados.
       */
      return ESTADOS.PAGADO;
  }
}

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

/* ── Para el panel ───────────────────────────────────────────────────────── */

/** Cómo se llama cada estado operativo en el panel de Ivan. */
export const ETIQUETA_OPERATIVA: Record<string, string> = {
  PREPARING: 'Preparando',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

/**
 * Qué se le advierte a Ivan antes de un cambio que no se puede deshacer.
 *
 * `null` = no hace falta confirmar. Los dos que sí: «entregado» cierra el
 * pedido y «cancelado» no se revierte.
 */
export function avisoDeCambio(destino: string): string | null {
  if (destino === 'CANCELLED') {
    return (
      'Vas a cancelar este pedido. No se devuelve el dinero automáticamente ' +
      'ni se repone el stock, y este cambio no se puede deshacer.'
    );
  }
  if (destino === 'DELIVERED') {
    return 'Vas a marcarlo como entregado. Es el último estado y no se puede deshacer.';
  }
  return null;
}
