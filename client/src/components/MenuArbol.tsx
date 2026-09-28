import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import type { MenuAnimal, MenuMarca } from '@/lib/types';
import { rutaCatalogo } from '@/lib/navigation';

/**
 * EL MENÚ EN CASCADA (acordeón), reutilizado en escritorio y móvil.
 *
 * Cada fila con hijos hace DOS cosas distintas, y por eso son dos controles:
 *
 *   · el NOMBRE es un enlace —lleva a la página de esa categoría o marca, con
 *     todo lo que cuelga de ella y los filtros para acotar—;
 *   · la FLECHA es un botón —despliega ahí mismo lo que cuelga, sin salir del
 *     menú—.
 *
 * Así «pinchar Alimentación seca» te lleva a la página, y «pinchar la flecha»
 * te enseña sus marcas sin moverte. Una marca sin líneas no tiene flecha: es
 * sólo un enlace. No hay «Ver todo», porque el propio nombre ya lo es.
 *
 *   Perros ▸ Alimentación seca ▸ AtlanticPet ▸ Grain Free
 *
 * Sólo una categoría abierta a la vez, y dentro sólo una marca: un panel que lo
 * despliega todo de golpe vuelve a ser la lista larga que se quería evitar.
 */

export function MenuArbol({ animal, onNavegar }: { animal: MenuAnimal; onNavegar: () => void }) {
  const [catAbierta, setCatAbierta] = useState<string | null>(null);
  const [marcaAbierta, setMarcaAbierta] = useState<string | null>(null);

  const alternarCategoria = (slug: string) => {
    setCatAbierta((c) => (c === slug ? null : slug));
    setMarcaAbierta(null); // al cambiar de categoría se cierra la marca que hubiera abierta
  };

  return (
    <ul className="list-none space-y-0.5 p-0">
      {animal.categorias.map((cat) => {
        const abierta = catAbierta === cat.slug;
        return (
          <li key={cat.slug}>
            <FilaConHijos
              nombre={cat.nombre}
              total={cat.total}
              href={rutaCatalogo({ animal: animal.slug, category: cat.slug })}
              abierta={abierta}
              onAlternar={() => alternarCategoria(cat.slug)}
              onNavegar={onNavegar}
              destacada
            />
            {abierta && (
              <ul className="mb-1 list-none space-y-0.5 border-l border-edge-subtle p-0 pl-2">
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

/**
 * Una fila «nombre = enlace, flecha = desplegar». El enlace ocupa casi todo el
 * ancho para ser una diana cómoda; la flecha es un control aparte con su propio
 * nombre accesible.
 */
function FilaConHijos({
  nombre,
  total,
  href,
  abierta,
  onAlternar,
  onNavegar,
  destacada = false,
}: {
  nombre: string;
  total: number;
  href: string;
  abierta: boolean;
  onAlternar: () => void;
  onNavegar: () => void;
  destacada?: boolean;
}) {
  return (
    <div className={`flex items-stretch rounded-control ${abierta ? 'bg-brand-50' : 'hover:bg-brand-50'}`}>
      <Link
        to={href}
        onClick={onNavegar}
        className={`flex min-h-11 flex-1 items-center rounded-l-control px-3 text-content ${
          destacada ? 'text-body font-semibold' : 'text-body-sm font-medium'
        }`}
      >
        {nombre}
      </Link>
      <button
        type="button"
        aria-expanded={abierta}
        aria-label={`${abierta ? 'Ocultar' : 'Ver'} ${destacada ? 'las marcas de' : 'las líneas de'} ${nombre}`}
        onClick={onAlternar}
        className="flex min-h-11 items-center gap-1.5 rounded-r-control px-3 text-content-subtle transition-colors hover:text-brand-700"
      >
        <span className="text-caption tabular-nums" aria-hidden="true">{total}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${abierta ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
    </div>
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

  // Sin líneas: la marca es sólo un enlace directo a su página.
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

  // Con líneas: nombre = enlace a la marca; flecha = despliega las líneas.
  return (
    <li>
      <FilaConHijos
        nombre={marca.nombre}
        total={marca.total}
        href={rutaCatalogo(base)}
        abierta={abierta}
        onAlternar={onAlternar}
        onNavegar={onNavegar}
      />
      {abierta && (
        <ul className="list-none space-y-0.5 border-l border-edge-subtle p-0 pl-2">
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
