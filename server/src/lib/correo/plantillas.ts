import { ENVIO } from '../envio.js';

/**
 * LOS CORREOS DE PEDIDO.
 *
 * Regla que gobierna todo lo de aquí: **sólo se dice lo que es verdad**. No hay
 * fecha de entrega estimada, ni número de seguimiento, ni garantías, ni plazo
 * de devolución. Nada de eso existe todavía, y un correo de confirmación es
 * exactamente donde más caro sale prometerlo: queda por escrito, se guarda, y
 * se relee cuando algo va mal.
 *
 * Lo que sí lleva: qué se ha comprado, cuánto ha costado, a dónde va, en qué
 * estado está y a quién escribir o llamar.
 */

/** Datos reales del negocio. Los dio Ivan; no hay ninguno inventado. */
export const CONTACTO = {
  nombre: 'Chacho Pet Shop',
  telefono: '628 013 933',
  telefonoE164: '+34628013933',
  email: 'chachopetshop@gmail.com',
} as const;

/**
 * Escapa lo que va dentro del HTML.
 *
 * NO es decorativo. El nombre y la dirección los escribe quien compra, y el
 * aviso interno se abre en el correo de Ivan: sin esto, un pedido con
 * `<script>` o con una etiqueta a medias en la calle rompe el mensaje o mete
 * marcado ajeno en su bandeja de entrada.
 */
export function escapar(valor: unknown): string {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** La referencia corta que se puede dictar por teléfono. Igual que en la web. */
export function referenciaDePedido(id: string): string {
  return `#${id.slice(-8).toUpperCase()}`;
}

export const eur = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

export const fechaLarga = (d: Date) =>
  new Intl.DateTimeFormat('es-ES', { dateStyle: 'long' }).format(d);

export type LineaDePedido = {
  name: string;
  variantLabel: string | null;
  quantity: number;
  unitPrice: number;
};

export type PedidoParaCorreo = {
  id: string;
  email: string;
  createdAt: Date;
  subtotal: number;
  shipping: number;
  total: number;
  shippingName: string | null;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingZip: string | null;
  items: LineaDePedido[];
};

/* ── Piezas compartidas ──────────────────────────────────────────────────── */

const COLOR = {
  tinta: '#14181f',
  suave: '#5b6472',
  borde: '#e3e6eb',
  fondo: '#f6f7f9',
  marca: '#1f5f46',
} as const;

const filas = (items: LineaDePedido[]) =>
  items
    .map(
      (i) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid ${COLOR.borde};color:${COLOR.tinta};font-size:14px;">
          ${escapar(i.name)}${i.variantLabel ? `<br><span style="color:${COLOR.suave};font-size:13px;">${escapar(i.variantLabel)}</span>` : ''}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid ${COLOR.borde};color:${COLOR.suave};font-size:14px;text-align:center;white-space:nowrap;">
          ${i.quantity} × ${eur(i.unitPrice)}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid ${COLOR.borde};color:${COLOR.tinta};font-size:14px;text-align:right;white-space:nowrap;font-weight:600;">
          ${eur(i.unitPrice * i.quantity)}
        </td>
      </tr>`,
    )
    .join('');

const totales = (p: PedidoParaCorreo) => `
      <tr><td colspan="2" style="padding:8px 0 0;color:${COLOR.suave};font-size:14px;">Subtotal</td>
          <td style="padding:8px 0 0;text-align:right;font-size:14px;">${eur(p.subtotal)}</td></tr>
      <tr><td colspan="2" style="padding:4px 0;color:${COLOR.suave};font-size:14px;">Envío</td>
          <td style="padding:4px 0;text-align:right;font-size:14px;">${p.shipping === 0 ? 'Gratis' : eur(p.shipping)}</td></tr>
      <tr><td colspan="2" style="padding:10px 0 0;border-top:2px solid ${COLOR.tinta};font-size:16px;font-weight:700;">Total</td>
          <td style="padding:10px 0 0;border-top:2px solid ${COLOR.tinta};text-align:right;font-size:16px;font-weight:700;">${eur(p.total)}</td></tr>`;

const direccion = (p: PedidoParaCorreo) =>
  [p.shippingName, p.shippingAddress, [p.shippingZip, p.shippingCity].filter(Boolean).join(' ')]
    .filter(Boolean)
    .map((l) => escapar(l))
    .join('<br>');

const direccionTexto = (p: PedidoParaCorreo) =>
  [p.shippingName, p.shippingAddress, [p.shippingZip, p.shippingCity].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join('\n');

const lineasTexto = (items: LineaDePedido[]) =>
  items
    .map(
      (i) =>
        `  · ${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ''} — ${i.quantity} × ${eur(i.unitPrice)} = ${eur(i.unitPrice * i.quantity)}`,
    )
    .join('\n');

/**
 * El armazón del mensaje.
 *
 * Tablas y estilos en línea porque es correo, no una página: Gmail y Outlook
 * descartan las hojas de estilo y muchos ni respetan flexbox. `max-width` en
 * 600 px y celdas fluidas es lo que hace que se lea igual en el móvil.
 */
const armazon = (titulo: string, cuerpo: string) => `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapar(titulo)}</title></head>
<body style="margin:0;padding:0;background:${COLOR.fondo};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.fondo};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${COLOR.borde};border-radius:8px;">
        <tr><td style="padding:28px 28px 0;">
          <p style="margin:0;font:700 20px/1.2 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${COLOR.marca};">${CONTACTO.nombre}</p>
        </td></tr>
        <tr><td style="padding:20px 28px 28px;font:400 15px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${COLOR.tinta};">
          ${cuerpo}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

const pieDeContacto = `
  <p style="margin:24px 0 0;padding-top:16px;border-top:1px solid ${COLOR.borde};font-size:14px;color:${COLOR.suave};">
    <strong style="color:${COLOR.tinta};">¿Necesitas ayuda con tu pedido?</strong><br>
    Escríbenos a <a href="mailto:${CONTACTO.email}" style="color:${COLOR.marca};">${CONTACTO.email}</a>
    o llámanos al <a href="tel:${CONTACTO.telefonoE164}" style="color:${COLOR.marca};">${CONTACTO.telefono}</a>.
  </p>`;

/* ── 1. Confirmación para quien compra ───────────────────────────────────── */

export function asuntoConfirmacion(pedido: { id: string }): string {
  return `Confirmación de tu pedido ${referenciaDePedido(pedido.id)} — ${CONTACTO.nombre}`;
}

export function confirmacionHtml(p: PedidoParaCorreo): string {
  return armazon(
    asuntoConfirmacion(p),
    `
    <h1 style="margin:0 0 8px;font-size:22px;line-height:1.25;">Gracias por tu pedido</h1>
    <p style="margin:0 0 20px;color:${COLOR.suave};">
      Hemos recibido tu pago. Pedido <strong style="color:${COLOR.tinta};">${referenciaDePedido(p.id)}</strong>
      del ${fechaLarga(p.createdAt)}.
    </p>

    <p style="margin:0 0 20px;">
      <span style="display:inline-block;padding:5px 12px;border-radius:999px;background:#e8f3ee;color:${COLOR.marca};font-size:13px;font-weight:700;">
        Estado: Pagado
      </span>
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${filas(p.items)}
      ${totales(p)}
    </table>

    <p style="margin:24px 0 4px;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:${COLOR.suave};">Dirección de entrega</p>
    <p style="margin:0;">${direccion(p)}</p>
    <p style="margin:8px 0 0;color:${COLOR.suave};font-size:14px;">Entregamos en ${ENVIO.ZONA}.</p>

    <p style="margin:24px 0 0;color:${COLOR.suave};font-size:14px;">
      Te avisaremos cuando tu pedido salga. Si algo no cuadra, dínoslo cuanto antes.
    </p>
    ${pieDeContacto}`,
  );
}

export function confirmacionTexto(p: PedidoParaCorreo): string {
  return `Gracias por tu pedido

Hemos recibido tu pago.
Pedido ${referenciaDePedido(p.id)} del ${fechaLarga(p.createdAt)}.
Estado: Pagado

${lineasTexto(p.items)}

  Subtotal: ${eur(p.subtotal)}
  Envío:    ${p.shipping === 0 ? 'Gratis' : eur(p.shipping)}
  Total:    ${eur(p.total)}

DIRECCIÓN DE ENTREGA
${direccionTexto(p)}

Entregamos en ${ENVIO.ZONA}.

Te avisaremos cuando tu pedido salga.

¿Necesitas ayuda con tu pedido?
${CONTACTO.email} · ${CONTACTO.telefono}

${CONTACTO.nombre}`;
}

/* ── 2. Aviso interno ────────────────────────────────────────────────────── */

export function asuntoInterno(p: PedidoParaCorreo): string {
  return `Pedido nuevo ${referenciaDePedido(p.id)} — ${eur(p.total)}`;
}

export function internoHtml(p: PedidoParaCorreo): string {
  return armazon(
    asuntoInterno(p),
    `
    <h1 style="margin:0 0 8px;font-size:20px;">Pedido nuevo y pagado</h1>
    <p style="margin:0 0 20px;color:${COLOR.suave};">
      <strong style="color:${COLOR.tinta};">${referenciaDePedido(p.id)}</strong> · ${fechaLarga(p.createdAt)}
    </p>

    <p style="margin:0 0 4px;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:${COLOR.suave};">Cliente</p>
    <p style="margin:0 0 20px;">
      ${escapar(p.shippingName ?? '—')}<br>
      <a href="mailto:${escapar(p.email)}" style="color:${COLOR.marca};">${escapar(p.email)}</a>
    </p>

    <p style="margin:0 0 4px;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:${COLOR.suave};">Enviar a</p>
    <p style="margin:0 0 20px;">${direccion(p)}</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${filas(p.items)}
      ${totales(p)}
    </table>

    <p style="margin:24px 0 0;color:${COLOR.suave};font-size:14px;">
      Marca el pedido como «Preparando» en el panel cuando empieces con él.
    </p>`,
  );
}

export function internoTexto(p: PedidoParaCorreo): string {
  return `PEDIDO NUEVO Y PAGADO

${referenciaDePedido(p.id)} · ${fechaLarga(p.createdAt)}

CLIENTE
${p.shippingName ?? '—'}
${p.email}

ENVIAR A
${direccionTexto(p)}

${lineasTexto(p.items)}

  Subtotal: ${eur(p.subtotal)}
  Envío:    ${p.shipping === 0 ? 'Gratis' : eur(p.shipping)}
  Total:    ${eur(p.total)}

Marca el pedido como «Preparando» en el panel cuando empieces con él.`;
}
