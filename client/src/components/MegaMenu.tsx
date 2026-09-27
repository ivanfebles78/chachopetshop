import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { MenuAnimal, MenuCategoria, MenuMarca } from '@/lib/types';
import { rutaCatalogo } from '@/lib/navigation';

/**
 * EL MEGA-MENÚ DE ESCRITORIO: una CASCADA de tres columnas hacia la derecha.
 *
 *   [ categorías ] → [ marcas ] → [ líneas ]
 *
 *   1. Al abrir «Perros» salen sus CATEGORÍAS en columna (Alimentación seca,
 *      húmeda, semihúmeda, Premios y snacks, Suplementos y cosmética).
 *   2. Al posar el ratón sobre una categoría, a su derecha aparece la columna de
 *      sus MARCAS (AtlanticPet, EnergyPet, Optima Nova, Naturacanarias…).
 *   3. Al posar el ratón sobre una marca que tiene líneas, MÁS a la derecha sale
 *      la columna de sus LÍNEAS (Grain Free, Premium Recetas…).
 *
 * Cada NOMBRE es un enlace a su página; posar el ratón sólo despliega la columna
 * siguiente, no navega. En móvil no cabe un flyout: allí se usa `MenuArbol`
 * (acordeón) desde `MobileNav`. Este componente es sólo para `lg` en adelante.
 */

export function MegaMenu({ animal, onNavegar }: { animal: MenuAnimal; onNavegar: () => void }) {
  // La primera categoría queda activa al abrir, para que la columna de marcas no
  // aparezca vacía. La marca no: su columna de líneas sólo sale al posarse.
  const [catActiva, setCatActiva] = useState<string>(animal.categorias[0]?.slug ?? '');
  const [marcaActiva, setMarcaActiva] = useState<string | null>(null);

  const categoria = animal.categorias.find((c) => c.slug === catActiva) ?? animal.categorias[0];

  const elegirCategoria = (slug: string) => {
    setCatActiva(slug);
    setMarcaActiva(null); // al cambiar de categoría, se cierra la columna de líneas
  };

  const marca = categoria?.marcas.find((m) => m.slug === marcaActiva) ?? null;
  const marcaConLineas = marca && marca.lineas.length > 0 ? marca : null;

  return (
    <div className="flex items-stretch">
      {/* Columna 1 · Categorías */}
      <ul className="w-56 shrink-0 list-none space-y-0.5 border-r border-edge-subtle p-0 pr-2">
        {animal.categorias.map((cat) => (
          <li key={cat.slug}>
            <FilaCascada
              nombre={cat.nombre}
              total={cat.total}
              href={rutaCatalogo({ animal: animal.slug, category: cat.slug })}
              activa={catActiva === cat.slug}
              conFlecha
              destacada
              onActivar={() => elegirCategoria(cat.slug)}
              onNavegar={onNavegar}
            />
          </li>
        ))}
      </ul>

      {/* Columna 2 · Marcas de la categoría activa */}
      {categoria && (
        <ColumnaMarcas
          key={categoria.slug}
          animalSlug={animal.slug}
          categoria={categoria}
          marcaActiva={marcaActiva}
          onMarca={setMarcaActiva}
          onNavegar={onNavegar}
        />
      )}

      {/* Columna 3 · Líneas de la marca activa (sólo si tiene) */}
      {categoria && marcaConLineas && (
        <ColumnaLineas
          key={marcaConLineas.slug}
          animalSlug={animal.slug}
          categorySlug={categoria.slug}
          marca={marcaConLineas}
          onNavegar={onNavegar}
        />
      )}
    </div>
  );
}

/**
 * Una fila de cascada: el nombre es un enlace y, al posarse (ratón o foco),
 * despliega la columna siguiente. La flecha ▸ avisa de que hay más a la derecha.
 */
function FilaCascada({
  nombre,
  total,
  href,
  activa,
  conFlecha,
  destacada = false,
  onActivar,
  onNavegar,
}: {
  nombre: string;
  total: number;
  href: string;
  activa: boolean;
  conFlecha: boolean;
  destacada?: boolean;
  onActivar: () => void;
  onNavegar: () => void;
}) {
  return (
    <Link
      to={href}
      onClick={onNavegar}
      onMouseEnter={onActivar}
      onFocus={onActivar}
      aria-current={activa ? 'true' : undefined}
      className={`flex min-h-10 items-center gap-2 rounded-control px-3 transition-colors ${
        destacada ? 'text-body font-semibold' : 'text-body-sm font-medium'
      } ${activa ? 'bg-brand-50 text-brand-800' : 'text-content hover:bg-brand-50'}`}
    >
      <span className="flex-1">{nombre}</span>
      <span className="text-caption tabular-nums text-content-subtle" aria-hidden="true">
        {total}
      </span>
      {conFlecha && (
        <ChevronRight
          className={`h-4 w-4 shrink-0 ${activa ? 'text-brand-600' : 'text-content-subtle'}`}
          aria-hidden="true"
        />
      )}
    </Link>
  );
}

/** Cabecera de columna: nombre de la sección + «Ver todo». */
function Cabecera({ titulo, href, total, onNavegar }: { titulo: string; href: string; total: number; onNavegar: () => void }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2 px-3">
      <span className="text-overline font-bold uppercase tracking-[0.12em] text-brand-700">{titulo}</span>
      <Link to={href} onClick={onNavegar} className="whitespace-nowrap text-caption text-content-subtle hover:text-brand-700">
        Ver todo ({total})
      </Link>
    </div>
  );
}

function ColumnaMarcas({
  animalSlug,
  categoria,
  marcaActiva,
  onMarca,
  onNavegar,
}: {
  animalSlug: string;
  categoria: MenuCategoria;
  marcaActiva: string | null;
  onMarca: (slug: string | null) => void;
  onNavegar: () => void;
}) {
  return (
    <div className="w-56 shrink-0 animate-fade-in border-r border-edge-subtle px-2">
      <Cabecera
        titulo={categoria.nombre}
        href={rutaCatalogo({ animal: animalSlug, category: categoria.slug })}
        total={categoria.total}
        onNavegar={onNavegar}
      />
      {categoria.marcas.length === 0 ? (
        <p className="px-3 text-body-sm text-content-subtle">Sin marcas todavía.</p>
      ) : (
        <ul className="max-h-[60vh] list-none space-y-0.5 overflow-y-auto p-0">
          {categoria.marcas.map((m) => (
            <li key={m.slug}>
              <FilaCascada
                nombre={m.nombre}
                total={m.total}
                href={rutaCatalogo({ animal: animalSlug, category: categoria.slug, brand: m.slug })}
                activa={marcaActiva === m.slug}
                conFlecha={m.lineas.length > 0}
                // Una marca sin líneas cierra la tercera columna al posarse.
                onActivar={() => onMarca(m.lineas.length > 0 ? m.slug : null)}
                onNavegar={onNavegar}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ColumnaLineas({
  animalSlug,
  categorySlug,
  marca,
  onNavegar,
}: {
  animalSlug: string;
  categorySlug: string;
  marca: MenuMarca;
  onNavegar: () => void;
}) {
  const base = { animal: animalSlug, category: categorySlug, brand: marca.slug };
  return (
    <div className="w-56 shrink-0 animate-fade-in px-2">
      <Cabecera titulo={marca.nombre} href={rutaCatalogo(base)} total={marca.total} onNavegar={onNavegar} />
      <ul className="max-h-[60vh] list-none space-y-0.5 overflow-y-auto p-0">
        {marca.lineas.map((linea) => (
          <li key={linea.nombre}>
            <Link
              to={rutaCatalogo({ ...base, line: linea.nombre })}
              onClick={onNavegar}
              className="flex min-h-9 items-center justify-between gap-2 rounded-control px-3 text-body-sm text-content-muted hover:bg-brand-50 hover:text-content"
            >
              <span>{linea.nombre}</span>
              <span className="text-caption tabular-nums text-content-subtle" aria-hidden="true">
                {linea.total}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
