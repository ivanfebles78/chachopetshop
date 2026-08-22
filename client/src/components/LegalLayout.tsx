import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';

/** Layout común para las páginas legales. */
export function LegalLayout({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="container-page max-w-3xl py-12">
      <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">{title}</h1>
      <p className="mt-2 text-sm text-content-subtle">Última actualización: {updated}</p>

      <div className="mt-6 flex items-start gap-3 rounded-3xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-brand-800">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <p>
          <strong>Plantilla orientativa.</strong> Sustituye los campos entre corchetes por tus datos reales
          y revísala con un asesor legal antes de publicar. No constituye asesoramiento jurídico.
        </p>
      </div>

      <div className="mt-8 space-y-8">{children}</div>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-xl font-bold text-ink">{title}</h2>
      <div className="space-y-3 leading-relaxed text-brand-900/70">{children}</div>
    </section>
  );
}
