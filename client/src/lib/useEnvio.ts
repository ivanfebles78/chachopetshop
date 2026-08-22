import { useEffect, useState } from 'react';
import { api } from './api';

/**
 * LAS REGLAS DE ENVÍO, PEDIDAS AL SERVIDOR.
 *
 * El umbral estaba escrito a mano en seis sitios del cliente y uno del
 * servidor. Coincidían todos el día que se escribieron; el día que Ivan cambie
 * el número, la tienda anunciaría un envío gratis que luego cobraría — y ese
 * fallo se descubre en el importe final, cuando ya hay un cargo hecho.
 *
 * Se pregunta una vez por sesión y se guarda en el módulo. Mientras llega, se
 * usan los mismos valores que el servidor tiene hoy: así no parpadea el
 * carrito, y si la petición fallara la tienda seguiría diciendo algo cierto.
 */

export type Envio = { gratisDesde: number; tarifa: number; zona: string; plazo: string };

/* Espejo de `server/src/lib/envio.ts`. Hay una prueba que comprueba que no se
   separan: si alguien cambia uno y no el otro, falla. */
export const ENVIO_POR_DEFECTO: Envio = {
  gratisDesde: 49,
  tarifa: 4.95,
  zona: 'Canarias',
  plazo: '24-48 h',
};

let cache: Envio | null = null;
let enVuelo: Promise<Envio> | null = null;

export function useEnvio(): Envio {
  const [envio, setEnvio] = useState<Envio>(cache ?? ENVIO_POR_DEFECTO);

  useEffect(() => {
    if (cache) return;
    let vivo = true;
    enVuelo ??= api.config().then((c) => c.envio);
    enVuelo
      .then((e) => {
        cache = e;
        if (vivo) setEnvio(e);
      })
      .catch(() => {
        // Si no se puede preguntar, se queda lo de por defecto: es lo que el
        // servidor aplica hoy, así que la tienda no miente mientras tanto.
        enVuelo = null;
      });
    return () => {
      vivo = false;
    };
  }, []);

  return envio;
}

/** El envío que corresponde a un subtotal. Misma regla que el servidor. */
export function envioPara(subtotal: number, envio: Envio): number {
  if (subtotal <= 0) return 0;
  return subtotal >= envio.gratisDesde ? 0 : envio.tarifa;
}

/** Cuánto falta para el envío gratis, o 0 si ya se llegó. */
export function faltaParaGratis(subtotal: number, envio: Envio): number {
  return Math.max(0, envio.gratisDesde - subtotal);
}

export function _resetCacheEnvio() {
  cache = null;
  enVuelo = null;
}
