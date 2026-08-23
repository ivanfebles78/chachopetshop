import type { NotificationKind } from '@prisma/client';
import { prisma } from '../../db.js';
import { toNumber } from '../serialize.js';
import {
  buzonInterno,
  motivoNoConfigurado,
  proveedorActual,
  responderA,
  type Proveedor,
} from './proveedor.js';
import {
  asuntoConfirmacion,
  asuntoInterno,
  confirmacionHtml,
  confirmacionTexto,
  internoHtml,
  internoTexto,
  type PedidoParaCorreo,
} from './plantillas.js';

/**
 * MANDAR CADA CORREO UNA SOLA VEZ, PASE LO QUE PASE.
 *
 * ── El problema ────────────────────────────────────────────────────────────
 *
 * Stripe reintenta los webhooks por diseño: ante un fallo de red, un 500 o
 * simplemente porque sí, el mismo `checkout.session.completed` puede llegar
 * varias veces. Sin nada que lo impida, cada reintento sería otro correo de
 * «gracias por tu pedido» al mismo cliente por la misma compra.
 *
 * ── El mecanismo ───────────────────────────────────────────────────────────
 *
 * La unicidad la impone la BASE DE DATOS, con un índice único sobre
 * (pedido, tipo). **Crear la fila es pedir el turno**: si la creación choca
 * contra el índice, es que otro va ya, y esta llamada se retira sin mandar
 * nada.
 *
 * Es el mismo patrón que `StripeEvent` usa desde la Fase 1, y por los mismos
 * motivos: una marca en memoria se pierde al reiniciar el contenedor y no vale
 * absolutamente nada en cuanto haya dos instancias.
 *
 * La fila se queda aunque el envío falle, con el motivo y el número de
 * intentos. Así se puede reintentar sabiendo qué quedó pendiente, sin volver a
 * arriesgar un duplicado.
 *
 * ── El correo NUNCA manda sobre el pedido ──────────────────────────────────
 *
 * Todo lo de aquí se llama sin `await` que pueda propagar el error hacia el
 * webhook, y además cada envío está envuelto. Un fallo del proveedor no puede
 * deshacer un PAID, ni devolver stock, ni hacer que Stripe reintente el evento
 * eternamente. El correo es la consecuencia de la venta, no su condición.
 */

/** Lo que se le pasa al proveedor, ya resuelto. */
type Envio = { para: string; asunto: string; html: string; texto: string; responderA?: string };

/** Un pedido con lo justo para redactar el correo. */
async function cargarPedido(orderId: string): Promise<PedidoParaCorreo | null> {
  const p = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!p) return null;
  return {
    id: p.id,
    email: p.email,
    createdAt: p.createdAt,
    subtotal: toNumber(p.subtotal) ?? 0,
    shipping: toNumber(p.shipping) ?? 0,
    total: toNumber(p.total) ?? 0,
    shippingName: p.shippingName,
    shippingAddress: p.shippingAddress,
    shippingCity: p.shippingCity,
    shippingZip: p.shippingZip,
    items: p.items.map((i) => ({
      name: i.name,
      variantLabel: i.variantLabel,
      quantity: i.quantity,
      unitPrice: toNumber(i.unitPrice) ?? 0,
    })),
  };
}

/**
 * Pide el turno para mandar un correo.
 *
 * Devuelve `true` sólo si esta llamada es la que debe enviarlo. El segundo
 * intento —un reintento de Stripe, otra instancia— choca contra el índice único
 * y se va con `false`.
 */
async function pedirTurno(orderId: string, kind: NotificationKind): Promise<boolean> {
  try {
    await prisma.orderNotification.create({
      data: { orderId, kind, status: 'SENDING', attempts: 1 },
    });
    return true;
  } catch {
    return false;
  }
}

async function anotarExito(orderId: string, kind: NotificationKind) {
  await prisma.orderNotification.updateMany({
    where: { orderId, kind },
    data: { status: 'SENT', sentAt: new Date(), lastError: null },
  });
}

async function anotarFallo(orderId: string, kind: NotificationKind, error: unknown) {
  const motivo = error instanceof Error ? error.message : String(error);
  await prisma.orderNotification.updateMany({
    where: { orderId, kind },
    // Truncado: esto se guarda y alguien lo leerá. No es para el cliente.
    data: { status: 'FAILED', lastError: motivo.slice(0, 500) },
  });
}

/**
 * El envío, con turno, registro y sin propagar nunca el error.
 *
 * `proveedor` se inyecta para las pruebas: la suite JAMÁS debe mandar un correo
 * de verdad, y con esto no hace falta ni red ni credenciales.
 */
async function enviarUnaVez(
  orderId: string,
  kind: NotificationKind,
  construir: () => Envio | null,
  proveedor: Proveedor | null,
): Promise<'enviado' | 'duplicado' | 'fallido' | 'sin-proveedor'> {
  if (!(await pedirTurno(orderId, kind))) return 'duplicado';

  if (!proveedor) {
    /*
     * Sin proveedor configurado no se manda nada, y se deja constancia. Lo que
     * no se hace es fingir que se mandó: la fila queda como fallida con el
     * motivo, y dice qué variable falta — nunca su valor.
     */
    await anotarFallo(orderId, kind, motivoNoConfigurado() ?? 'Correo no configurado');
    return 'sin-proveedor';
  }

  const mensaje = construir();
  if (!mensaje) {
    await anotarFallo(orderId, kind, 'No hay destinatario configurado');
    return 'fallido';
  }

  try {
    await proveedor.enviar(mensaje);
    await anotarExito(orderId, kind);
    return 'enviado';
  } catch (error) {
    await anotarFallo(orderId, kind, error);
    return 'fallido';
  }
}

export type ResultadoNotificacion = {
  confirmacion: Awaited<ReturnType<typeof enviarUnaVez>>;
  interno: Awaited<ReturnType<typeof enviarUnaVez>>;
};

/**
 * Los dos correos de un pedido recién cobrado.
 *
 * Se llama SÓLO desde la transición real a PAID, es decir, desde el webhook
 * firmado de Stripe con el pago efectivamente cobrado. Nunca desde la página de
 * éxito: llegar a esa URL no prueba nada, se puede escribir a mano.
 *
 * Los dos envíos son independientes a propósito. Que el correo del cliente
 * rebote no puede dejar a Ivan sin enterarse de que tiene un pedido que
 * preparar, y al revés tampoco.
 */
export async function notificarPedidoPagado(
  orderId: string,
  opciones: { proveedor?: Proveedor | null; entorno?: NodeJS.ProcessEnv } = {},
): Promise<ResultadoNotificacion> {
  const entorno = opciones.entorno ?? process.env;
  const proveedor =
    opciones.proveedor !== undefined ? opciones.proveedor : proveedorActual(entorno);

  const pedido = await cargarPedido(orderId);
  if (!pedido) return { confirmacion: 'fallido', interno: 'fallido' };

  const confirmacion = await enviarUnaVez(
    orderId,
    'ORDER_CONFIRMATION',
    () => ({
      para: pedido.email,
      asunto: asuntoConfirmacion(pedido),
      html: confirmacionHtml(pedido),
      texto: confirmacionTexto(pedido),
      responderA: responderA(entorno),
    }),
    proveedor,
  );

  const interno = await enviarUnaVez(
    orderId,
    'INTERNAL_NEW_ORDER',
    () => {
      const buzon = buzonInterno(entorno);
      if (!buzon) return null;
      return {
        para: buzon,
        asunto: asuntoInterno(pedido),
        html: internoHtml(pedido),
        texto: internoTexto(pedido),
        // Responder al aviso interno escribe al cliente, que es lo útil.
        responderA: pedido.email,
      };
    },
    proveedor,
  );

  return { confirmacion, interno };
}

/**
 * Reintenta los correos que quedaron fallidos.
 *
 * No crea filas nuevas —el turno ya está pedido—, así que no puede duplicar
 * nada. Existe para el caso realista: Ivan configura Resend un martes y los
 * pedidos del lunes se quedaron sin correo.
 *
 * No se llama sola desde ningún sitio todavía: es una herramienta, y quién la
 * dispara es una decisión que no me corresponde inventar.
 */
export async function reintentarCorreosFallidos(
  opciones: { proveedor?: Proveedor | null; entorno?: NodeJS.ProcessEnv; tope?: number } = {},
): Promise<{ reintentados: number; enviados: number }> {
  const entorno = opciones.entorno ?? process.env;
  const proveedor =
    opciones.proveedor !== undefined ? opciones.proveedor : proveedorActual(entorno);
  if (!proveedor) return { reintentados: 0, enviados: 0 };

  const pendientes = await prisma.orderNotification.findMany({
    where: { status: 'FAILED' },
    take: opciones.tope ?? 50,
    orderBy: { createdAt: 'asc' },
  });

  let enviados = 0;
  for (const fila of pendientes) {
    const pedido = await cargarPedido(fila.orderId);
    if (!pedido) continue;

    const mensaje: Envio | null =
      fila.kind === 'ORDER_CONFIRMATION'
        ? {
            para: pedido.email,
            asunto: asuntoConfirmacion(pedido),
            html: confirmacionHtml(pedido),
            texto: confirmacionTexto(pedido),
            responderA: responderA(entorno),
          }
        : (() => {
            const buzon = buzonInterno(entorno);
            return buzon
              ? {
                  para: buzon,
                  asunto: asuntoInterno(pedido),
                  html: internoHtml(pedido),
                  texto: internoTexto(pedido),
                  responderA: pedido.email,
                }
              : null;
          })();

    if (!mensaje) continue;

    await prisma.orderNotification.update({
      where: { id: fila.id },
      data: { attempts: { increment: 1 }, status: 'SENDING' },
    });
    try {
      await proveedor.enviar(mensaje);
      await anotarExito(fila.orderId, fila.kind);
      enviados++;
    } catch (error) {
      await anotarFallo(fila.orderId, fila.kind, error);
    }
  }

  return { reintentados: pendientes.length, enviados };
}
