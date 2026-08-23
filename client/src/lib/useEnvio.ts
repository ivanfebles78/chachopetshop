import { useEffect, useState } from 'react';
import { api } from './api';
import type { Envio } from './types';

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

export type { Envio };

/* Espejo de `server/src/lib/envio.ts`, con una prueba en `envio-zona.test.ts`
   que lee el fichero del servidor y comprueba que no se han separado. */
export const ENVIO_POR_DEFECTO: Envio = {
  gratisDesde: 49,
  tarifa: 4.95,
  zona: 'Canarias',
  plazo: '24-48 h',
  prefijosCp: ['35', '38'],
  fueraDeZona: 'Actualmente solo realizamos envíos a las Islas Canarias.',
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

/**
 * ¿Se entrega en este código postal?
 *
 * Esto NO es la garantía: la garantía está en el checkout del servidor, que es
 * lo único que no se puede saltar mandando la petición a mano. Esto es para
 * avisar antes de pedir la tarjeta, en lugar de dejar que el servidor rechace
 * el pedido cuando ya se ha rellenado todo.
 *
 * Los prefijos NO están escritos aquí: vienen de `/api/config`, del mismo sitio
 * que los aplica. Lo único que se repite es la forma de la comprobación —cinco
 * cifras, y que empiece por uno de los prefijos—, y hay una prueba que compara
 * este módulo con el del servidor.
 */
export function esCodigoPostalEnZona(cp: string, envio: Envio): boolean {
  const limpio = cp.replace(/\s+/g, '');
  if (!/^\d{5}$/.test(limpio)) return false;
  return envio.prefijosCp.some((prefijo) => limpio.startsWith(prefijo));
}

/** Cuánto falta para el envío gratis, o 0 si ya se llegó. */
export function faltaParaGratis(subtotal: number, envio: Envio): number {
  return Math.max(0, envio.gratisDesde - subtotal);
}

export function _resetCacheEnvio() {
  cache = null;
  enVuelo = null;
}
