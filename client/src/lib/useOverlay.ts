import { useEffect, useRef } from 'react';

/**
 * COMPORTAMIENTO COMÚN DE LAS CAPAS QUE TAPAN LA PÁGINA.
 *
 * Una capa modal no es sólo un panel que aparece encima: mientras está abierta,
 * la página de detrás deja de existir para quien la usa. Si eso no se programa,
 * pasa lo de siempre —y era lo que pasaba en el carrito—:
 *
 *   · el tabulador se sale del panel y sigue por una página tapada, así que
 *     quien navega con teclado acaba moviéndose por algo que no ve;
 *   · Escape no cierra, que es lo primero que se prueba;
 *   · al cerrar, el foco se pierde y hay que volver a empezar desde arriba;
 *   · el fondo sigue desplazándose bajo el dedo en el móvil.
 *
 * Estaba resuelto en el menú móvil y sin resolver en el carrito. Escrito dos
 * veces se habría separado; escrito una vez, los dos se comportan igual.
 */
export function useOverlay(activo: boolean, alCerrar: () => void) {
  const panel = useRef<HTMLDivElement>(null);

  /*
   * `alCerrar` se guarda en una referencia y NO entra en las dependencias.
   *
   * Quien llama suele escribir la función en el sitio —Navbar lo hace—, así
   * que cada repintado del padre creaba una función distinta. Si esa función
   * fuera dependencia, el efecto se desmontaría y volvería a montar en cada
   * repintado: el foco saltaría otra vez al primer elemento del panel y el
   * bloqueo del fondo se soltaría y se volvería a poner.
   *
   * Se nota escribiendo en el buscador con el menú abierto: cada tecla
   * devolvía el foco al principio, o sea que no se podía escribir. La capa
   * sólo debe montarse y desmontarse cuando ABRE y CIERRA, no cuando el padre
   * se repinta por cualquier otro motivo.
   */
  const cerrar = useRef(alCerrar);
  cerrar.current = alCerrar;

  useEffect(() => {
    if (!activo) return;

    /* A quién hay que devolverle el foco cuando esto se cierre. */
    const quienAbrio = document.activeElement as HTMLElement | null;

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    /* El foco entra en el panel; si no, el teclado se queda detrás. */
    panel.current?.querySelector<HTMLElement>('button, a, input')?.focus();

    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cerrar.current();
        return;
      }
      if (e.key !== 'Tab' || !panel.current) return;

      const enfocables = panel.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      if (!primero || !ultimo) return;

      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener('keydown', alPulsar);
    return () => {
      document.removeEventListener('keydown', alPulsar);
      document.body.style.overflow = overflowAnterior;
      quienAbrio?.focus?.();
    };
  }, [activo]);

  return panel;
}
