import { Router, type Request, type Response } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import Stripe from 'stripe';
import { prisma } from '../db.js';
import { env, origenesPermitidos } from '../env.js';
import { toNumber } from '../lib/serialize.js';
import {
  envioPara,
  esCodigoPostalDeCanarias,
  FUERA_DE_ZONA,
  normalizarCodigoPostal,
  paisAdmitido,
} from '../lib/envio.js';
import {
  caducidadDesde,
  expiraEnStripe,
  liberarReservasVencidas,
  liberarStockDelPedido,
} from '../lib/reservas.js';
import { notificarPedidoPagado } from '../lib/correo/notificar.js';

export const checkoutRouter = Router();

/*
 * Las reglas de envío viven en `lib/envio.ts`, no aquí.
 *
 * Estaban escritas seis veces entre servidor y cliente. Coincidían todas hoy,
 * y bastaba con cambiar una para que la tienda anunciara un umbral y cobrara
 * con otro. Ahora lo que se anuncia y lo que se cobra son el mismo dato.
 */

/**
 * Versión de la API fijada.
 *
 * Sin esto, Stripe usa la versión de la cuenta y una actualización suya puede
 * cambiar la forma de los objetos sin que nosotros toquemos nada. Preferimos que
 * subir de versión sea una decisión con su diff.
 */
const STRIPE_API_VERSION = '2025-02-24.acacia' as const;

const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION })
  : null;

/** Error de negocio: se traduce a 4xx en lugar de a un 500 genérico. */
function errorDeCliente(mensaje: string, status = 400) {
  return Object.assign(new Error(mensaje), { status });
}

const checkoutBody = z.object({
  email: z.string().email(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().min(1).optional(),
        // Entero y positivo. Un 1.5 o un -3 no llegan siquiera a la lógica.
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1, 'El carrito está vacío')
    .max(50, 'Demasiadas líneas en el pedido'),
  shipping: z
    .object({
      name: z.string().max(160).optional(),
      address: z.string().max(240).optional(),
      city: z.string().max(120).optional(),
      /* No lo pide el formulario, pero si llega se comprueba. Ver `paisAdmitido`. */
      country: z.string().max(60).optional(),
      zip: z.string().max(20).optional(),
    })
    .optional(),
});

type Entrada = z.infer<typeof checkoutBody>;

/**
 * Reconstruye el pedido con precios AUTORITATIVOS de la base de datos.
 *
 * Nada de lo que manda el cliente sobre dinero se usa: sólo identificadores y
 * cantidades. Si el navegador envía `unitPrice: 0.01`, se ignora.
 */
async function construirLineas(input: Entrada) {
  const ids = [...new Set(input.items.map((i) => i.productId))];
  const productos = await prisma.product.findMany({
    where: { id: { in: ids }, active: true },
    include: { variants: true },
  });
  const porId = new Map(productos.map((p) => [p.id, p]));

  // Se agrupan las líneas repetidas del mismo par producto+variante: si no, dos
  // líneas de 1 unidad cada una comprobarían el stock por separado y podrían
  // pasar las dos con una sola unidad disponible.
  const agrupadas = new Map<string, { productId: string; variantId?: string; quantity: number }>();
  for (const item of input.items) {
    const clave = `${item.productId}:${item.variantId ?? ''}`;
    const previo = agrupadas.get(clave);
    if (previo) previo.quantity += item.quantity;
    else agrupadas.set(clave, { ...item });
  }

  const lineas = [...agrupadas.values()].map((item) => {
    const producto = porId.get(item.productId);
    if (!producto) throw errorDeCliente('Producto no disponible');

    let variante = undefined;
    if (item.variantId) {
      variante = producto.variants.find((v) => v.id === item.variantId);
      /*
       * Antes, una variante desconocida se ignoraba y el pedido caía al precio
       * base del producto: pedir el saco de 12 kg con un id inventado lo cobraba
       * como el de 3 kg. Ahora es un error, no un descuento.
       */
      if (!variante) throw errorDeCliente('La variante indicada no existe para este producto');
    } else if (producto.variants.length > 0) {
      throw errorDeCliente('Debes elegir un formato del producto');
    }

    const unitPrice = toNumber(variante?.price ?? producto.price) ?? 0;
    return {
      productId: producto.id,
      variantId: variante?.id ?? null,
      name: producto.name,
      variantLabel: variante?.label ?? null,
      image: producto.image,
      unitPrice,
      quantity: item.quantity,
    };
  });

  const subtotal = lineas.reduce((suma, l) => suma + l.unitPrice * l.quantity, 0);
  const shipping = envioPara(subtotal);
  return { lineas, subtotal, shipping, total: subtotal + shipping };
}

/**
 * Reserva existencias de forma ATÓMICA.
 *
 * Estrategia elegida: **descontar al crear la sesión de pago y devolver si el
 * pago no llega a buen puerto** (opción A del análisis, con liberación
 * determinista). La alternativa —descontar sólo tras el pago verificado— evita
 * retenciones fantasma, pero permite que dos personas paguen la misma última
 * unidad y obliga a devolver el dinero a una de ellas. En una tienda con dos o
 * tres sacos de cada formato, vender algo que no existe es peor que retener una
 * unidad diez minutos.
 *
 * La atomicidad la da `updateMany` con la condición en el propio WHERE: es un
 * único `UPDATE ... WHERE stock >= n`, y PostgreSQL bloquea la fila. Leer y
 * luego escribir —el patrón evidente— tiene una ventana entre las dos
 * operaciones por la que caben dos compradores.
 */
async function reservar(lineas: { variantId: string | null; quantity: number }[]) {
  const reservadas: { variantId: string; quantity: number }[] = [];
  try {
    for (const linea of lineas) {
      if (!linea.variantId) continue;
      const { count } = await prisma.productVariant.updateMany({
        where: { id: linea.variantId, stock: { gte: linea.quantity } },
        data: { stock: { decrement: linea.quantity } },
      });
      if (count === 0) {
        throw errorDeCliente('No hay stock suficiente para completar el pedido', 409);
      }
      reservadas.push({ variantId: linea.variantId, quantity: linea.quantity });
    }
    return reservadas;
  } catch (err) {
    // Lo ya reservado en este intento se devuelve antes de propagar el error.
    await devolver(reservadas);
    throw err;
  }
}

/** Devuelve al stock lo reservado. */
async function devolver(reservadas: { variantId: string; quantity: number }[]) {
  for (const r of reservadas) {
    await prisma.productVariant.update({
      where: { id: r.variantId },
      data: { stock: { increment: r.quantity } },
    });
  }
}

/*
 * `liberarStockDelPedido` y la caducidad de las reservas viven ahora en
 * `lib/reservas.ts`. Se movieron en la Fase 2E porque dejaron de ser cosa sólo
 * del checkout: la limpieza periódica las necesita, y tener dos copias de algo
 * que devuelve inventario es la mejor forma de devolverlo dos veces.
 */

checkoutRouter.post('/', async (req, res, next) => {
  let reservadas: { variantId: string; quantity: number }[] = [];
  let orderId: string | null = null;

  try {
    const input = checkoutBody.parse(req.body);
    if (req.user) input.email = req.user.email;

    /*
     * FALLA CERRADO. Sin Stripe no hay venta.
     *
     * Antes esto era `if (!stripe)` seguido de marcar el pedido como PAID y
     * devolver éxito. La falta de configuración se convertía en una tienda que
     * regalaba el género, y no se notaba porque nada fallaba.
     */
    if (!stripe) {
      throw Object.assign(
        new Error('El pago no está disponible en este momento. Inténtalo más tarde.'),
        { status: 503 },
      );
    }

    /*
     * SÓLO SE ENTREGA EN CANARIAS.
     *
     * Va aquí, y no en el esquema de Zod, por dos motivos. Uno: un error de
     * validación de Zod se devuelve como «Datos inválidos» con el detalle
     * dentro, y esto tiene que llegar a quien compra con su propio texto. Dos:
     * así una dirección ausente, una vacía y una de Madrid dan exactamente la
     * misma respuesta, en lugar de tres distintas.
     *
     * La comprobación es «que VENGA y que sea canario», no «si viene, que sea
     * canario»: lo segundo se saltaría sin más que omitir el campo.
     *
     * Y va ANTES de reservar. Si estuviese después, cada intento desde fuera de
     * la zona retendría existencias de algo que sí se le puede vender a alguien
     * de Canarias.
     */
    const cp = input.shipping?.zip;
    if (!esCodigoPostalDeCanarias(cp) || !paisAdmitido(input.shipping?.country)) {
      throw errorDeCliente(FUERA_DE_ZONA, 400);
    }
    const zipNormalizado = normalizarCodigoPostal(cp);

    const { lineas, subtotal, shipping, total } = await construirLineas(input);

    /*
     * Una sola lectura del reloj para el pedido y para Stripe. Si cada uno
     * llamara a `new Date()` por su cuenta, la reserva y la pasarela caducarían
     * con unos milisegundos de diferencia — y Stripe rechaza la sesión si
     * `expires_at` se queda por debajo del mínimo de 30 minutos.
     */
    const ahora = new Date();

    /*
     * LIMPIEZA PEREZOSA, justo antes de reservar.
     *
     * Es el momento exacto en que importa: si hay existencias retenidas por
     * carritos abandonados hace más de media hora, quien está comprando AHORA
     * es quien merece esas unidades. Hacerlo aquí significa que el caso que más
     * duele —«agotado» por culpa de gente que no pagó— se corrige solo en el
     * instante en que alguien lo sufriría.
     *
     * No sustituye a la limpieza periódica: la complementa. Una tienda sin
     * visitas no ejecutaría nunca esto.
     */
    await liberarReservasVencidas().catch(() => {
      /* Que la limpieza falle no puede impedir una compra. Se reintenta sola. */
    });

    // Reservar ANTES de crear nada en Stripe: si no hay stock, el cliente no
    // llega a ver una pasarela de pago por algo que no podemos servir.
    reservadas = await reservar(lineas);

    const pedido = await prisma.order.create({
      data: {
        email: input.email,
        userId: req.user?.id,
        subtotal,
        shipping,
        total,
        status: 'PENDING',
        stockCommitted: true,
        /*
         * Hasta cuándo se retienen esas existencias. Ver `lib/reservas.ts`: sin
         * esta fecha, un carrito abandonado en la pasarela retenía el stock
         * hasta que Stripe daba la sesión por caducada, y su valor por defecto
         * son VEINTICUATRO HORAS.
         */
        reservedUntil: caducidadDesde(ahora),
        accessToken: randomBytes(32).toString('hex'),
        shippingName: input.shipping?.name,
        shippingAddress: input.shipping?.address,
        shippingCity: input.shipping?.city,
        shippingZip: zipNormalizado,
        items: { create: lineas },
      },
    });
    orderId = pedido.id;

    /*
     * URL de retorno contra una LISTA BLANCA.
     *
     * Antes salía de `req.headers.origin`, que la controla quien llama: bastaba
     * enviar otro origen para que Stripe redirigiese al dominio del atacante
     * tras el pago. Ahora el origen del cliente sólo se acepta si coincide con
     * uno configurado; si no, se usa el sitio público.
     */
    const solicitado = req.headers.origin;
    const base =
      solicitado && origenesPermitidos.includes(solicitado) ? solicitado : env.PUBLIC_SITE_URL;

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = lineas.map((l) => ({
      quantity: l.quantity,
      price_data: {
        currency: 'eur',
        unit_amount: Math.round(l.unitPrice * 100),
        product_data: { name: l.variantLabel ? `${l.name} · ${l.variantLabel}` : l.name },
      },
    }));
    if (shipping > 0) {
      line_items.push({
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: Math.round(shipping * 100),
          product_data: { name: 'Gastos de envío' },
        },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: input.email,
      line_items,
      metadata: { orderId: pedido.id },
      /*
       * LA PASARELA CADUCA A LA VEZ QUE LA RESERVA.
       *
       * Por defecto Stripe da 24 HORAS —comprobado en la definición del SDK
       * instalado, no supuesto—, así que sin esto la pasarela seguiría
       * aceptando el pago mucho después de que hubiéramos devuelto el stock al
       * catálogo: alguien pagaría por algo ya vendido a otro.
       *
       * 30 minutos es además el mínimo que Stripe admite, así que las dos
       * caducidades coinciden exactamente y no queda ninguna ventana.
       */
      expires_at: expiraEnStripe(ahora),
      // El token va en la URL de retorno: es lo que deja ver la confirmación a
      // quien compra sin cuenta, sin abrir el pedido a cualquiera con el id.
      success_url: `${base}/checkout/success?order=${pedido.id}&t=${pedido.accessToken ?? ''}`,
      cancel_url: `${base}/checkout/cancel?order=${pedido.id}`,
    });

    await prisma.order.update({
      where: { id: pedido.id },
      data: { stripeSessionId: session.id },
    });

    res.json({ orderId: pedido.id, url: session.url });
  } catch (err) {
    /*
     * Si algo falla después de reservar, se devuelve el stock. Un fallo de pago
     * no puede destruir inventario: sería una tienda que se queda sin género
     * cada vez que a alguien le rechazan la tarjeta.
     */
    if (orderId) {
      await liberarStockDelPedido(orderId);
      /*
       * Y se marca como fallido. Si se dejara en PENDING, «pendiente de pago»
       * acabaría significando dos cosas —esperando a que el cliente pague, y
       * roto antes de llegar a la pasarela— y ninguna consulta podría
       * distinguirlas. Un pedido que nunca llegó a Stripe no está esperando
       * nada.
       */
      await prisma.order.updateMany({
        where: { id: orderId, status: 'PENDING' },
        data: { status: 'FAILED' },
      });
    } else if (reservadas.length) {
      await devolver(reservadas);
    }
    next(err);
  }
});

/**
 * Webhook de Stripe.
 *
 * Se monta con `express.raw` en `app.ts` porque la verificación de firma
 * necesita el cuerpo sin parsear. Ese orden ya estaba bien y no se toca.
 */
export async function stripeWebhookHandler(req: Request, res: Response) {
  /*
   * Sin secreto NO se procesa nada.
   *
   * Antes respondía 200 con `{ skipped: true }`, que es fallar hacia abierto:
   * Stripe daba el evento por entregado y nosotros no habíamos comprobado nada.
   */
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Webhook no configurado' });
  }

  const firma = req.headers['stripe-signature'];
  if (!firma) return res.status(400).json({ error: 'Falta la firma' });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, firma as string, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    // Sin detalle: el mensaje de la librería puede revelar cómo se ha fallado.
    return res.status(400).json({ error: 'Firma no válida' });
  }

  /*
   * IDEMPOTENCIA. Stripe reintenta por diseño, así que los duplicados son
   * rutina, no excepción. La clave primaria sobre el id del evento hace que el
   * segundo intento choque y se descarte sin aplicar nada dos veces.
   */
  try {
    await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } });
  } catch {
    return res.json({ received: true, duplicated: true });
  }

  const sesion = event.data.object as Stripe.Checkout.Session;
  const orderId = sesion?.metadata?.orderId;

  if (event.type === 'checkout.session.completed') {
    /*
     * Que la sesión se complete no basta: `payment_status` es lo que dice si el
     * dinero está cobrado. Una sesión completada con pago pendiente existe.
     */
    if (orderId && sesion.payment_status === 'paid') {
      /*
       * LA TRANSICIÓN A PAGADO, y sólo una vez.
       *
       * `count` es lo que distingue «este evento acaba de cobrar el pedido» de
       * «este evento llega tarde y ya estaba cobrado». Sólo la primera vez vale
       * 1, y sólo entonces se mandan los correos. Es la segunda barrera contra
       * duplicados —la primera es el índice único de `OrderNotification`— y las
       * dos son baratas.
       *
       * `reservedUntil` se pone a nulo: estas existencias ya no están
       * reservadas, están VENDIDAS. Aunque la limpieza nunca mira los pedidos
       * pagados, dejar la fecha ahí sería guardar un dato que ya no significa
       * nada.
       */
      const { count } = await prisma.order.updateMany({
        where: { id: orderId, status: 'PENDING' },
        data: { status: 'PAID', reservedUntil: null },
      });

      if (count === 1) {
        /*
         * Los correos NO pueden tocar el pedido.
         *
         * Van con su propio `catch` y sin nada que pueda propagar un error
         * hasta aquí: si el proveedor de correo está caído, Stripe recibiría un
         * 500, reintentaría el evento, y tendríamos un webhook rebotando contra
         * un pedido que ya está perfectamente cobrado. El correo es la
         * consecuencia de la venta, nunca su condición.
         */
        await notificarPedidoPagado(orderId).catch((error) => {
          console.error('[correo] fallo al notificar el pedido', orderId, error);
        });
      }
    }
  } else if (
    event.type === 'checkout.session.expired' ||
    event.type === 'checkout.session.async_payment_failed' ||
    event.type === 'payment_intent.payment_failed'
  ) {
    if (orderId) {
      await prisma.order.updateMany({
        where: { id: orderId, status: 'PENDING' },
        data: { status: 'FAILED' },
      });
      await liberarStockDelPedido(orderId);
    }
  }

  res.json({ received: true });
}
