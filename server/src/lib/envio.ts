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
 * Cambiar el umbral o la tarifa es cambiar estos números. La web entera se
 * entera sola: cabecera, carrito, checkout y el importe que cobra Stripe.
 */
export const ENVIO = {
  /** A partir de este importe (subtotal, en euros) el envío no se cobra. */
  GRATIS_DESDE: 49,
  /** Lo que se cobra por debajo del umbral. */
  TARIFA: 4.95,
  /*
   * Dónde se entrega. Es lo que la tienda anuncia hoy en la cabecera y en el
   * pie; NO hay ninguna comprobación del código postal en el checkout, así que
   * es una declaración comercial, no una regla que el sistema haga cumplir.
   * Está anotado en el informe como decisión pendiente.
   */
  ZONA: 'Canarias',
  PLAZO: '24-48 h',
} as const;

/** El envío que corresponde a un subtotal. La usa el checkout y la expone /api/config. */
export function envioPara(subtotal: number): number {
  if (subtotal <= 0) return 0;
  return subtotal >= ENVIO.GRATIS_DESDE ? 0 : ENVIO.TARIFA;
}
