import { useState } from 'react';
import { AlertTriangle, FileUp, X } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { toast } from '@/store/toast';
import { useOverlay } from '@/lib/useOverlay';
import { parsearProductosDeExcel } from '@/lib/excelProductos';
import type { ImportMode, ImportResult } from '@/lib/types';

/**
 * IMPORTAR PRODUCTOS DESDE EXCEL.
 *
 * El archivo se lee en el navegador y se mandan las filas al servidor. Dos modos:
 *   · Actualizar (merge): crea las que faltan, actualiza las que ya están, y
 *     NO toca las que no aparecen.
 *   · Reemplazar (replace): además, elimina las que no aparecen. Es destructivo,
 *     así que se pide confirmación expresa.
 */
export function ImportDialog({ onCerrar, onImportado }: { onCerrar: () => void; onImportado: () => void }) {
  const panel = useOverlay(true, onCerrar);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<ImportMode>('merge');
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<ImportResult | null>(null);

  const importar = async () => {
    if (!file) return;
    if (
      mode === 'replace' &&
      !window.confirm(
        'Vas a REEMPLAZAR el catálogo con este archivo.\n\nLos productos que NO estén en el archivo se eliminarán (o se ocultarán si tienen pedidos). Esta acción no se puede deshacer.\n\n¿Seguro que quieres continuar?',
      )
    )
      return;

    setCargando(true);
    try {
      const rows = await parsearProductosDeExcel(file);
      if (!rows.length) {
        toast.error('No se encontraron filas con SKU o Slug en el archivo.');
        setCargando(false);
        return;
      }
      const res = await api.adminImportProducts(mode, rows);
      setResultado(res);
      onImportado();
      toast.success(
        `Importación completada: ${res.creados} creados, ${res.actualizados} actualizados` +
          (res.eliminados ? `, ${res.eliminados} eliminados` : '') +
          (res.desactivados ? `, ${res.desactivados} ocultados` : '') +
          '.',
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink/40" onClick={onCerrar} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Importar productos"
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-4xl bg-cream sm:rounded-4xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-brand-900/10 px-6 py-4">
          <h2 className="font-display text-lg font-bold text-ink">Importar productos</h2>
          <button onClick={onCerrar} className="rounded-lg p-2 text-content-subtle hover:bg-brand-900/5" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {resultado ? (
            <Resumen resultado={resultado} />
          ) : (
            <>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-brand-900/15 bg-white px-6 py-8 text-center hover:border-brand-400">
                <FileUp className="h-7 w-7 text-brand-500" aria-hidden="true" />
                <span className="text-sm font-semibold text-ink">
                  {file ? file.name : 'Elige un archivo Excel (.xlsx)'}
                </span>
                <span className="text-xs text-content-subtle">
                  Debe tener las columnas del exportado (SKU, Nombre, Marca, Animales, Categorías, Línea, Precio…).
                </span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>

              <fieldset className="space-y-2">
                <legend className="mb-1 text-xs font-bold uppercase tracking-wide text-content-subtle">¿Qué hago con lo que ya hay?</legend>
                <OpcionModo
                  activa={mode === 'merge'}
                  onClick={() => setMode('merge')}
                  titulo="Solo actualizar"
                  texto="Crea los que falten y actualiza los que ya están. Lo que no aparezca en el archivo se mantiene."
                />
                <OpcionModo
                  activa={mode === 'replace'}
                  onClick={() => setMode('replace')}
                  titulo="Reemplazar todo"
                  texto="Igual que actualizar, y además elimina los productos que no estén en el archivo."
                  peligro
                />
              </fieldset>

              {mode === 'replace' && (
                <div className="flex items-start gap-2 rounded-2xl bg-red-50 p-3 text-sm text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Los productos que no estén en el archivo se eliminarán (o se ocultarán si tienen pedidos).</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-brand-900/10 bg-white px-6 py-4">
          {resultado ? (
            <button onClick={onCerrar} className="rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-cream hover:bg-brand-700">
              Hecho
            </button>
          ) : (
            <>
              <button onClick={onCerrar} className="rounded-full px-5 py-2.5 text-sm font-semibold text-brand-900/70 hover:bg-brand-900/5">
                Cancelar
              </button>
              <button
                onClick={importar}
                disabled={!file || cargando}
                className="rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-cream shadow-soft hover:bg-brand-700 disabled:opacity-50"
              >
                {cargando ? 'Importando…' : 'Importar'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function OpcionModo({
  activa,
  onClick,
  titulo,
  texto,
  peligro,
}: {
  activa: boolean;
  onClick: () => void;
  titulo: string;
  texto: string;
  peligro?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-2xl border p-3 text-left transition-colors',
        activa
          ? peligro
            ? 'border-red-400 bg-red-50'
            : 'border-brand-500 bg-brand-50'
          : 'border-brand-900/15 bg-white hover:border-brand-300',
      )}
    >
      <span className={cn('block text-sm font-bold', peligro && activa ? 'text-red-700' : 'text-ink')}>{titulo}</span>
      <span className="mt-0.5 block text-xs text-content-subtle">{texto}</span>
    </button>
  );
}

function Resumen({ resultado }: { resultado: ImportResult }) {
  const r = resultado;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Dato n={r.creados} etiqueta="Creados" />
        <Dato n={r.actualizados} etiqueta="Actualizados" />
        {r.eliminados > 0 && <Dato n={r.eliminados} etiqueta="Eliminados" />}
        {r.desactivados > 0 && <Dato n={r.desactivados} etiqueta="Ocultados" />}
      </div>
      {r.totalErrores > 0 && (
        <div className="rounded-2xl bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-800">
            {r.totalErrores} {r.totalErrores === 1 ? 'aviso' : 'avisos'}
          </p>
          <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto text-xs text-amber-700">
            {r.errores.map((e, i) => (
              <li key={i}>· {e}</li>
            ))}
            {r.totalErrores > r.errores.length && <li>… y {r.totalErrores - r.errores.length} más.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

function Dato({ n, etiqueta }: { n: number; etiqueta: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center">
      <p className="font-display text-2xl font-bold text-ink">{n}</p>
      <p className="text-xs text-content-subtle">{etiqueta}</p>
    </div>
  );
}
