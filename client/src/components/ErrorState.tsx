import { AlertTriangle, RefreshCw } from 'lucide-react';

/** Estado de error reutilizable con botón de reintento. */
export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="card flex flex-col items-center gap-3 rounded-4xl py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
        <AlertTriangle className="h-7 w-7" />
      </span>
      <p className="font-display text-lg font-semibold text-ink">Algo ha ido mal</p>
      <p className="max-w-sm text-sm text-brand-900/60">
        {message ?? 'No hemos podido cargar el contenido.'}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost mt-1 py-2.5">
          <RefreshCw className="h-4 w-4" /> Reintentar
        </button>
      )}
    </div>
  );
}
