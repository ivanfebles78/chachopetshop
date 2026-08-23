import { Router } from 'express';
import { ENVIO, FUERA_DE_ZONA, ZONA_DE_ENVIO } from '../lib/envio.js';

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
      /*
       * La zona de entrega, para que el formulario avise ANTES de pedir la
       * tarjeta en lugar de dejar que el servidor rechace el pedido. El
       * formulario no es la garantía —esa está en el checkout del servidor y no
       * se puede saltar—, pero sí es la diferencia entre un aviso y un viaje
       * perdido.
       *
       * Se publican en vez de repetirse en el cliente por lo mismo de siempre:
       * el día que Ivan añada la Península, cambia un fichero y no seis.
       */
      prefijosCp: [...ZONA_DE_ENVIO.PREFIJOS],
      fueraDeZona: FUERA_DE_ZONA,
    },
  });
});
