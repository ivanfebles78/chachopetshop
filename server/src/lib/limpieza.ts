import { liberarReservasVencidas, MINUTOS_DE_RESERVA } from './reservas.js';

/**
 * QUIÉN SUELTA LAS RESERVAS VENCIDAS.
 *
 * ── Lo que se descartó, y por qué ──────────────────────────────────────────
 *
 * · **Un `setTimeout` por pedido.** Es lo primero que se le ocurre a cualquiera
 *   y es lo peor: vive en la memoria del proceso. Un reinicio del contenedor
 *   —un despliegue, sin ir más lejos— y esas reservas se quedan retenidas para
 *   siempre, sin que nada avise.
 *
 * · **Un cron de Railway.** Es sólido, pero hoy esto es UN servicio con una
 *   imagen que sirve API y frontend a la vez. Montar un servicio aparte para
 *   una consulta cada pocos minutos es infraestructura nueva que Ivan tendría
 *   que configurar y mantener, y que se desincroniza en cuanto se despliegue
 *   uno sin el otro.
 *
 * ── Lo que se hace ─────────────────────────────────────────────────────────
 *
 * Dos mecanismos que se cubren las espaldas, y **ninguno de los dos guarda
 * estado en memoria**:
 *
 *   1. **Perezoso, en el checkout.** Antes de reservar se sueltan las vencidas.
 *      Es el momento en que de verdad importa: quien está comprando ahora es
 *      quien merece esas unidades.
 *
 *   2. **Periódico, aquí.** Un intervalo dentro del proceso que pregunta a la
 *      base de datos qué ha vencido. Para que una tienda sin visitas también
 *      suelte lo suyo.
 *
 * La verdad está SIEMPRE en la fila del pedido (`reservedUntil`), nunca en este
 * proceso. El intervalo no recuerda nada entre pasadas: sólo pregunta. Por eso:
 *
 *   · **Sobrevive al reinicio** — al arrancar, la primera pasada encuentra todo
 *     lo que venció mientras estaba apagado.
 *   · **Aguanta varias instancias** — cada liberación es un UPDATE con la
 *     condición dentro del WHERE. Si dos instancias ven el mismo pedido, una
 *     actualiza una fila y la otra cero. No hay forma de devolver stock dos
 *     veces.
 *   · **Aguanta ejecuciones duplicadas** — por lo mismo. Llamarlo cien veces
 *     seguidas da el mismo resultado que llamarlo una.
 *
 * Si algún día hay varias instancias y se quiere que sólo una barra, el sitio
 * es este fichero y la herramienta es un `advisory lock` de PostgreSQL. Hoy no
 * hace falta: el trabajo ya es idempotente, así que repetirlo no cuesta nada
 * salvo una consulta.
 */

/**
 * Cada cuánto se pregunta. Un tercio de la reserva: suficientemente a menudo
 * para que nada se quede retenido mucho más de lo debido, suficientemente poco
 * para que sea una consulta indexada cada diez minutos.
 */
const CADA_MS = (MINUTOS_DE_RESERVA / 3) * 60_000;

let temporizador: NodeJS.Timeout | null = null;

async function pasada() {
  try {
    const { liberados } = await liberarReservasVencidas();
    if (liberados.length > 0) {
      console.log(`[reservas] liberadas ${liberados.length} reservas vencidas`);
    }
  } catch (error) {
    /*
     * Que una pasada falle no puede tumbar el proceso: es una tarea de fondo,
     * y la siguiente vuelve a intentarlo sobre el mismo estado. No hay nada que
     * recuperar porque no hay nada guardado aquí.
     */
    console.error('[reservas] fallo al liberar reservas vencidas', error);
  }
}

/**
 * Arranca la limpieza periódica.
 *
 * `unref()` es importante: sin él, este intervalo mantiene vivo el proceso y el
 * contenedor no termina nunca de apagarse en un despliegue.
 */
export function arrancarLimpiezaDeReservas(): void {
  if (temporizador) return;
  temporizador = setInterval(() => void pasada(), CADA_MS);
  temporizador.unref?.();
  // Una pasada al arrancar, para recoger lo que venció mientras estaba apagado.
  void pasada();
}

export function pararLimpiezaDeReservas(): void {
  if (!temporizador) return;
  clearInterval(temporizador);
  temporizador = null;
}
