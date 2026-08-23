/**
 * LAS REGLAS DE ENVÍO, EN UN SOLO SITIO.
 *
 * El umbral de envío gratis estaba escrito seis veces: aquí, en el cajón del
 * carrito, en la página de pago, en la cabecera, en «Conócenos» y en la
 * portada. Todas coincidían hoy — y bastaba con cambiar una para que la tienda
 * prometiera un envío gratis que luego cobraba.
 *
 * Lo que se anuncia sale de aquí, y lo que se cobra también. No pueden
 * separarse porque son el mismo dato.
 *
 * ── PARA IVAN ────────────────────────────────────────────────────────────
 * Cambiar el umbral, la tarifa o la zona es cambiar estos valores. La web
 * entera se entera sola: cabecera, carrito, checkout, el importe que cobra
 * Stripe y la comprobación del código postal.
 */
export const ENVIO = {
  /** A partir de este importe (subtotal, en euros) el envío no se cobra. */
  GRATIS_DESDE: 49,
  /** Lo que se cobra por debajo del umbral. */
  TARIFA: 4.95,
  /**
   * Dónde se entrega. Ya NO es sólo una frase de la cabecera: desde la Fase 2D
   * el checkout comprueba el código postal y rechaza lo que no se puede
   * entregar. Ver `esCodigoPostalDeCanarias`.
   */
  ZONA: 'Canarias',
  PLAZO: '24-48 h',
} as const;

/** El envío que corresponde a un subtotal. La usa el checkout y la expone /api/config. */
export function envioPara(subtotal: number): number {
  if (subtotal <= 0) return 0;
  return subtotal >= ENVIO.GRATIS_DESDE ? 0 : ENVIO.TARIFA;
}

/* ══════════════════════════════════════════════════════════════════════════
 * DÓNDE SE ENTREGA — y por qué esto es una comprobación y no un cartel.
 *
 * Hasta la Fase 2D, «Entregamos en Canarias» era texto. El checkout aceptaba
 * cualquier código postal, así que alguien de Madrid podía comprar, pagar, y
 * enterarse del problema cuando el pedido no llegaba: una devolución, un
 * cliente enfadado y una reseña.
 *
 * Se valida por CÓDIGO POSTAL y no por el texto de la ciudad o del país. Que
 * alguien escriba «España» o incluso «Canarias» en un campo libre no dice nada:
 * es texto que escribe quien compra, y no hay forma de comprobarlo. El código
 * postal sí tiene estructura, y en España la provincia son sus dos primeras
 * cifras.
 * ═════════════════════════════════════════════════════════════════════════ */

export const ZONA_DE_ENVIO = {
  /** Las dos provincias canarias, por las dos primeras cifras del CP. */
  PREFIJOS: ['35', '38'] as const,
  PROVINCIAS: {
    '35': 'Las Palmas',
    '38': 'Santa Cruz de Tenerife',
  } as const,
};

/**
 * Lo que se le dice a quien intenta comprar desde fuera de la zona.
 *
 * Se escribe UNA vez: lo usan el error del servidor, el aviso del formulario y
 * las pruebas. Si estuviera en dos sitios, el día que se matizara la frase una
 * de las dos pantallas se quedaría con la vieja.
 */
export const FUERA_DE_ZONA = 'Actualmente solo realizamos envíos a las Islas Canarias.';

/**
 * Deja el código postal como se guarda: sin espacios.
 *
 * Quien pega «38 201» desde un correo debe quedar guardado como «38201», o la
 * etiqueta de envío sale con un código postal que no existe.
 */
export function normalizarCodigoPostal(cp: string): string {
  return cp.replace(/\s+/g, '');
}

/**
 * ¿Este código postal es de Canarias?
 *
 * Acepta `unknown` a propósito: el valor llega del cuerpo de una petición HTTP
 * y puede ser cualquier cosa —un número, un objeto con un `toString` que
 * miente, un array—. Todo lo que no sea una cadena de cinco cifras que empiece
 * por 35 o 38 es un «no».
 *
 * Exigir las CINCO cifras es la mitad del trabajo. Comprobar sólo «empieza por
 * 35» sobre una cadena de longitud libre dejaría pasar un `3500` de cuatro
 * cifras o un `350010` de seis, y los prefijos vecinos —34 Palencia, 39
 * Cantabria— están a un dígito de distancia.
 *
 * `\d` en JavaScript son sólo los dígitos ASCII, así que los de ancho completo
 * y los de otros alfabetos no cuelan.
 *
 * Devuelve `cp is string` y no un `boolean` a secas: si el código postal vale,
 * es una cadena, y quien llame puede usarla sin volver a comprobarlo.
 */
export function esCodigoPostalDeCanarias(cp: unknown): cp is string {
  if (typeof cp !== 'string') return false;
  const limpio = normalizarCodigoPostal(cp);
  if (!/^\d{5}$/.test(limpio)) return false;
  return ZONA_DE_ENVIO.PREFIJOS.some((prefijo) => limpio.startsWith(prefijo));
}
