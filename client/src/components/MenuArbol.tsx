import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import type { MenuAnimal, MenuMarca } from '@/lib/types';
import { rutaCatalogo } from '@/lib/navigation';

/**
 * EL MENÚ EN CASCADA (acordeón), reutilizado en escritorio y móvil.
 *
 * No se enseña todo a la vez. Se ven las categorías; al abrir una salen sus
 * marcas; al abrir una marca CON líneas salen sus líneas. Una marca SIN líneas
 * no es un desplegable: es un enlace que lleva directo a su página.
 *
 *   Perros ▸ Alimentación seca ▸ AtlanticPet ▸ Grain Free
 *
 * Sólo una categoría abierta a la vez, y dentro sólo una marca: un panel que lo
 * despliega todo de golpe vuelve a ser la lista larga que se quería evitar.
 *
 * Son botones con `aria-expanded` para lo que despliega y enlaces normales para
 * lo que navega, no un `role="menu"`: esto es navegación de tienda, y el
 * tabulador es lo que se espera.
 */

export function MenuArbol({ animal, onNavegar }: { animal: MenuAnimal; onNavegar: () => void }) {
  const [catAbierta, setCatAbierta] = useState<string | null>(null);
  const [marcaAbierta, setMarcaAbierta] = useState<string | null>(null);

  const abrirCategoria = (slug: string) => {
    setCatAbierta((c) => (c === slug ? null : slug));
    setMarcaAbierta(null); // al cambiar de categoría se cierra la marca que hubiera abierta
  };

  return (
    <ul className="list-none space-y-0.5 p-0">
      {animal.categorias.map((cat) => {
        const abierta = catAbierta === cat.slug;
        return (
          <li key={cat.slug}>
            <button
              type="button"
              aria-expanded={abierta}
              onClick={() => abrirCategoria(cat.slug)}
              className="flex min-h-11 w-full items-center gap-2 rounded-control px-3 text-body font-semibold text-content transition-colors hover:bg-brand-50"
            >
              <span className="flex-1 text-left">{cat.nombre}</span>
              <span className="text-caption tabular-nums text-content-subtle" aria-hidden="true">{cat.total}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-content-subtle transition-transform ${abierta ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>

            {abierta && (
              <ul className="mb-1 list-none space-y-0.5 border-l border-edge-subtle p-0 pl-2">
                <li>
                  <Link
                    to={rutaCatalogo({ animal: animal.slug, category: cat.slug })}
                    onClick={onNavegar}
                    className="flex min-h-10 items-center rounded-control px-3 text-body-sm font-semibold text-brand-700 hover:bg-brand-50"
                  >
                    Ver todo · {cat.nombre.toLowerCase()}
                  </Link>
                </li>
                {cat.marcas.map((marca) => (
                  <MarcaItem
                    key={marca.slug}
                    animalSlug={animal.slug}
                    categorySlug={cat.slug}
                    marca={marca}
                    abierta={marcaAbierta === marca.slug}
                    onAlternar={() => setMarcaAbierta((m) => (m === marca.slug ? null : marca.slug))}
                    onNavegar={onNavegar}
                  />
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function MarcaItem({
  animalSlug,
  categorySlug,
  marca,
  abierta,
  onAlternar,
  onNavegar,
}: {
  animalSlug: string;
  categorySlug: string;
  marca: MenuMarca;
  abierta: boolean;
  onAlternar: () => void;
  onNavegar: () => void;
}) {
  const base = { animal: animalSlug, category: categorySlug, brand: marca.slug };

  // Sin líneas: la marca es un enlace directo a su página, no un desplegable.
  if (marca.lineas.length === 0) {
    return (
      <li>
        <Link
          to={rutaCatalogo(base)}
          onClick={onNavegar}
          className="flex min-h-10 items-center justify-between gap-2 rounded-control px-3 text-body-sm text-content hover:bg-brand-50"
        >
          <span>{marca.nombre}</span>
          <span className="text-caption tabular-nums text-content-subtle" aria-hidden="true">{marca.total}</span>
        </Link>
      </li>
    );
  }

  // Con líneas: la marca despliega sus líneas; y sigue habiendo un «Ver todo».
  return (
    <li>
      <button
        type="button"
        aria-expanded={abierta}
        onClick={onAlternar}
        className="flex min-h-10 w-full items-center gap-2 rounded-control px-3 text-body-sm font-medium text-content transition-colors hover:bg-brand-50"
      >
        <span className="flex-1 text-left">{marca.nombre}</span>
        <span className="text-caption tabular-nums text-content-subtle" aria-hidden="true">{marca.total}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-content-subtle transition-transform ${abierta ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {abierta && (
        <ul className="list-none space-y-0.5 border-l border-edge-subtle p-0 pl-2">
          <li>
            <Link
              to={rutaCatalogo(base)}
              onClick={onNavegar}
              className="flex min-h-9 items-center rounded-control px-3 text-caption font-semibold text-brand-700 hover:bg-brand-50"
            >
              Ver todo · {marca.nombre}
            </Link>
          </li>
          {marca.lineas.map((linea) => (
            <li key={linea.nombre}>
              <Link
                to={rutaCatalogo({ ...base, line: linea.nombre })}
                onClick={onNavegar}
                className="flex min-h-9 items-center justify-between gap-2 rounded-control px-3 text-caption text-content-muted hover:bg-brand-50"
              >
                <span>{linea.nombre}</span>
                <span className="tabular-nums text-content-subtle" aria-hidden="true">{linea.total}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
