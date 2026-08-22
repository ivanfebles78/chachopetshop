/**
 * VALORACIONES: EL HUECO, MONTADO Y VACÍO.
 *
 * En «Conócenos» estaba publicado «4.8★ · Valoración media». Nadie ha medido
 * esa cifra: no hay tabla de reseñas, no hay perfil conectado, no hay ninguna
 * opinión detrás. La Fase 1 ya quitó por lo mismo el `rating` de cada producto
 * —el esquema traía `@default(4.6)` y la semilla generaba estrellas al azar—,
 * pero esta se quedó, en otra página.
 *
 * No es sólo que engañe a quien compra: mostrar valoraciones que no proceden de
 * compradores reales es una práctica comercial prohibida por la Directiva
 * Ómnibus (UE) 2019/2161, traspuesta en España por el RDL 24/2021. La sanción
 * no depende de que la cifra sea alta o baja, sino de afirmarla sin respaldo.
 *
 * La corrección no es poner un cero —un cero también afirma algo falso sobre la
 * satisfacción de los clientes—: es DEJAR DE AFIRMAR mientras no haya datos, y
 * conservar el hueco para cuando los haya.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * PARA CONECTAR VALORACIONES DE VERDAD
 * ──────────────────────────────────────────────────────────────────────────
 * Rellenar `FUENTE` con un origen verificable y público. Sirven, por ejemplo,
 * el perfil de Google Business o Trustpilot: lo que hace falta es que la nota
 * salga de compradores reales y que el cliente pueda ir a comprobarla, que es
 * justo lo que exige la norma.
 *
 * En cuanto `FUENTE` deje de ser `null`, la nota aparece sola donde
 * corresponda, con su enlace a la fuente. Ningún componente hay que tocar.
 */

export type FuenteValoraciones = {
  /** Quién lo mide. Se enseña al cliente: «según Google». */
  nombre: string;
  /** Nota media, tal cual la publica la fuente. */
  media: number;
  /** Cuántas opiniones la sostienen. Sin esto, una media no dice nada. */
  total: number;
  /** Dónde va el cliente a comprobarlo. Obligatorio: si no se puede verificar, no se enseña. */
  url: string;
};

/** Hoy no hay ninguna fuente conectada, así que no se afirma nada. */
export const FUENTE: FuenteValoraciones | null = null;
// TODO(Ivan): p. ej. { nombre: 'Google', media: 4.8, total: 126, url: 'https://…' }

/**
 * La valoración que se puede enseñar, o `null`.
 *
 * Exige las cuatro cosas: nombre, media dentro de rango, alguna opinión que la
 * sostenga y un enlace donde comprobarla. Una media sin opiniones o sin fuente
 * verificable no se pinta, aunque alguien rellene el objeto a medias.
 */
export function valoracionPublicable(fuente: FuenteValoraciones | null = FUENTE) {
  if (!fuente) return null;
  const { media, total, url, nombre } = fuente;
  if (!nombre || !url) return null;
  if (!Number.isFinite(media) || media <= 0 || media > 5) return null;
  if (!Number.isInteger(total) || total < 1) return null;
  return fuente;
}
