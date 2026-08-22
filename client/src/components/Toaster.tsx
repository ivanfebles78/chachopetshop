import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useToast, type ToastKind } from '@/store/toast';

const STYLES: Record<ToastKind, { icon: typeof Info; ring: string; text: string }> = {
  success: { icon: CheckCircle2, ring: 'border-brand-500/30 bg-brand-50', text: 'text-brand-800' },
  error: { icon: AlertCircle, ring: 'border-red-300 bg-red-50', text: 'text-red-700' },
  info: { icon: Info, ring: 'border-brand-900/10 bg-white', text: 'text-brand-900' },
};

export function Toaster() {
  const { toasts, dismiss } = useToast();
  return (
    /*
     * DOS ARREGLOS, y los dos invisibles mirando la pantalla.
     *
     * 1. SE ANUNCIA. No había región activa, así que «Producto añadido al
     *    carrito» aparecía abajo y no lo sabía nadie que no estuviera mirando
     *    ahí. Es la única confirmación de que el botón ha hecho algo.
     *    `polite` y no `assertive`: informa, no interrumpe.
     *
     * 2. SE VA. Con `AnimatePresence` los avisos ya cerrados NO se desmontaban:
     *    se quedaban apilados con opacidad 0 —comprobado en el navegador: uno
     *    seguía ahí cinco segundos después— y cada uno dejaba su botón de
     *    cerrar en el recorrido del tabulador. Comprando un rato, el teclado
     *    acababa pasando por una fila de botones invisibles. El montaje lo
     *    decide React y la entrada la anima CSS.
     */
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-5 left-1/2 z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4"
    >
      {toasts.map((t) => {
        const s = STYLES[t.kind];
        const Icon = s.icon;
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex animate-slide-up items-start gap-3 rounded-2xl border ${s.ring} px-4 py-3 shadow-raised backdrop-blur`}
          >
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${s.text}`} aria-hidden="true" />
            <p className={`flex-1 text-sm font-medium ${s.text}`}>{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-content-subtle hover:text-content"
              aria-label="Descartar este aviso"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
