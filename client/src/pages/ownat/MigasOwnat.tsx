import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/** Migas de pan sencillas para la sección de Ownat. */
export function MigasOwnat({ pasos }: { pasos: { etiqueta: string; href?: string }[] }) {
  return (
    <nav aria-label="Migas de pan" className="mb-4 flex flex-wrap items-center gap-1 text-body-sm text-content-muted">
      {pasos.map((p, i) => (
        <span key={i} className="flex items-center gap-1">
          {p.href ? (
            <Link to={p.href} className="hover:text-brand-700">{p.etiqueta}</Link>
          ) : (
            <span className="font-semibold text-content">{p.etiqueta}</span>
          )}
          {i < pasos.length - 1 && <ChevronRight className="h-4 w-4 text-content-subtle" aria-hidden="true" />}
        </span>
      ))}
    </nav>
  );
}
