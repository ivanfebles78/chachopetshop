import { Router } from 'express';
import { ENVIO } from '../lib/envio.js';

export const configRouter = Router();

/**
 * GET /api/config — las reglas comerciales que la tienda anuncia.
 *
 * Existe por un motivo concreto: el umbral de envío gratis estaba escrito SEIS
 * veces —en el checkout del servidor, en el cajón del carrito, en la página de
 * pago, en la cabecera, en «Conócenos» y en la portada—. Todas coincidían hoy,
 * y bastaba con que Ivan cambiara una para que la tienda prometiera 49 € y
 * cobrara con otro umbral.
 *
 * Ahora el número vive en un sitio y el cliente lo pregunta. Lo que se anuncia
 * y lo que se cobra no pueden separarse porque son el mismo dato.
 *
 * Es público a propósito: aquí no hay nada que no esté ya escrito en la web.
 */
configRouter.get('/', (_req, res) => {
  res.json({
    envio: {
      gratisDesde: ENVIO.GRATIS_DESDE,
      tarifa: ENVIO.TARIFA,
      zona: ENVIO.ZONA,
      plazo: ENVIO.PLAZO,
    },
  });
});
