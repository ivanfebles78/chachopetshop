/**
 * EL PROVEEDOR DE CORREO TRANSACCIONAL.
 *
 * ── Por qué una capa propia y no el SDK ────────────────────────────────────
 *
 * La API de Resend para esto es UNA petición HTTP. Envolverla en una interfaz
 * de tres métodos cuesta menos que la dependencia, y deja el resto del código
 * sin saber quién manda los correos: si mañana Ivan prefiere otro proveedor, se
 * escribe otro `Proveedor` y no se toca ni la plantilla ni el webhook.
 *
 * ── Falla cerrado, pero no bloquea la venta ────────────────────────────────
 *
 * Sin credenciales no se manda nada y se dice claramente en el registro. Lo que
 * NO se hace es fingir que se mandó: la fila de `OrderNotification` queda como
 * fallida, con el motivo, y se puede reintentar.
 *
 * Y sobre todo: un fallo aquí no puede tocar el pedido, ni el pago, ni el
 * stock. El correo es la consecuencia de la venta, nunca su condición.
 *
 * ── Las credenciales no están aquí ─────────────────────────────────────────
 *
 * Ni una clave, ni un remitente por defecto que parezca real. Todo sale del
 * entorno. Si falta algo, `motivoNoConfigurado()` dice qué falta — por nombre,
 * nunca por valor.
 */

export type Mensaje = {
  para: string;
  asunto: string;
  html: string;
  texto: string;
  /** A dónde responde quien recibe el correo. */
  responderA?: string;
};

export interface Proveedor {
  readonly nombre: string;
  enviar(mensaje: Mensaje): Promise<void>;
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/** Cuánto se espera a Resend antes de darlo por fallido. */
const TIEMPO_MAXIMO_MS = 10_000;

export class ProveedorResend implements Proveedor {
  readonly nombre = 'resend';

  constructor(
    private readonly clave: string,
    private readonly remitente: string,
  ) {}

  async enviar(mensaje: Mensaje): Promise<void> {
    const corte = AbortSignal.timeout(TIEMPO_MAXIMO_MS);
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.clave}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.remitente,
        to: [mensaje.para],
        subject: mensaje.asunto,
        html: mensaje.html,
        text: mensaje.texto,
        ...(mensaje.responderA ? { reply_to: mensaje.responderA } : {}),
      }),
      signal: corte,
    });

    if (!res.ok) {
      /*
       * El cuerpo del error se lee para el registro, pero se trunca: puede
       * traer de vuelta cabeceras o fragmentos de la petición, y esto acaba en
       * `lastError`, que es una columna que alguien leerá algún día.
       *
       * Este texto NUNCA llega a quien compra.
       */
      const detalle = (await res.text().catch(() => '')).slice(0, 300);
      throw new Error(`Resend respondió ${res.status}: ${detalle}`);
    }
  }
}

/** Qué falta para poder mandar correos. Sólo NOMBRES de variables. */
export function motivoNoConfigurado(entorno: NodeJS.ProcessEnv = process.env): string | null {
  const faltan: string[] = [];
  if (!entorno.RESEND_API_KEY) faltan.push('RESEND_API_KEY');
  if (!entorno.ORDER_EMAIL_FROM) faltan.push('ORDER_EMAIL_FROM');
  return faltan.length ? `Faltan variables de entorno: ${faltan.join(', ')}` : null;
}

/**
 * El proveedor configurado, o `null` si no se puede mandar correo.
 *
 * Se resuelve en cada llamada y no al importar el módulo: así las pruebas
 * pueden poner y quitar variables sin reiniciar nada, y el arranque no depende
 * del orden de los imports.
 */
export function proveedorActual(entorno: NodeJS.ProcessEnv = process.env): Proveedor | null {
  if (motivoNoConfigurado(entorno)) return null;
  return new ProveedorResend(entorno.RESEND_API_KEY!, entorno.ORDER_EMAIL_FROM!);
}

/** A dónde van los avisos internos de pedido nuevo. */
export function buzonInterno(entorno: NodeJS.ProcessEnv = process.env): string | null {
  return entorno.ORDER_EMAIL_TO ?? null;
}

/** A dónde responde el cliente si contesta al correo de confirmación. */
export function responderA(entorno: NodeJS.ProcessEnv = process.env): string | undefined {
  return entorno.ORDER_EMAIL_REPLY_TO ?? entorno.ORDER_EMAIL_TO ?? undefined;
}
