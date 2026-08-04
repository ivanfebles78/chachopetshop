import { AnimatePresence, motion } from 'framer-motion';
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
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
      <AnimatePresence>
        {toasts.map((t) => {
          const s = STYLES[t.kind];
          const Icon = s.icon;
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border ${s.ring} px-4 py-3 shadow-lift backdrop-blur`}
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${s.text}`} />
              <p className={`flex-1 text-sm font-medium ${s.text}`}>{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="text-brand-900/30 hover:text-brand-900/60" aria-label="Cerrar">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
