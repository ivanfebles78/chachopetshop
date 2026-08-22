import { Check } from 'lucide-react';
import type { ProductFilters } from '@/lib/api';
import type { Faceta, Facetas } from '@/lib/types';

/**
 * PANEL DE FILTROS.
 *
 * Todo lo que se ve aquí sale de los RECUENTOS que devuelve el servidor
 * (`?facets=1`), no de la taxonomía a secas. La diferencia es lo que arregla el
 * defecto que arrastraba el catálogo desde antes de la Fase 2A: se ofrecían
 * «Reptiles» y «Semihúmeda», las dos con cero productos. Un filtro que lleva a
 * una página vacía no es un filtro, es una trampa.
 *
 * Dos reglas, y las dos vienen de los datos:
 *
 *   · Si una opción tiene 0, NO SE PINTA. Con una excepción: si está puesta.
 *     Quitarle de delante el filtro que acaba de marcar deja a la persona sin
 *     forma de soltarlo.
 *
 *   · El número va al lado siempre. «Alimentación seca (13)» permite decidir
 *     antes de pulsar; sin él, cada filtro es una apuesta.
 *
 * Se usa igual en la barra lateral del escritorio y dentro del cajón del móvil.
 */

type Props = {
  facetas: Facetas | undefined;
  filtros: ProductFilters;
  /** Cambia un filtro de valor único (animal, categoría, oferta). */
  poner: (clave: string, valor: string | null) => void;
  /** Marca o desmarca uno de los que admiten varios (necesidad, marca). */
  alternar: (clave: 'need' | 'brand', slug: string) => void;
};

/** Las opciones que merecen enseñarse: con producto, o ya seleccionadas. */
function visibles(lista: Faceta[] | undefined, puestas: string[]): Faceta[] {
  return (lista ?? []).filter((f) => f.total > 0 || puestas.includes(f.slug));
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-0 p-0">
      <legend className="mb-2 text-overline font-bold uppercase tracking-[0.12em] text-content-subtle">
        {titulo}
      </legend>
      {children}
    </fieldset>
  );
}

/**
 * Una opción de filtro.
 *
 * Es una casilla de verdad —`input type="checkbox"`—, no un `<button>` con
 * aspecto de casilla. Así un lector de pantalla anuncia solo «marcada» o «no
 * marcada» y el teclado la maneja con la barra espaciadora, sin que haya que
 * programar nada de eso a mano.
 */
function Opcion({
  nombre,
  faceta,
  marcada,
  onChange,
}: {
  nombre: string;
  faceta: Faceta;
  marcada: boolean;
  onChange: () => void;
}) {
  const vacia = faceta.total === 0;
  return (
    <label
      className={`flex min-h-9 cursor-pointer items-center gap-2.5 rounded-control px-2 py-1 text-body-sm transition-colors hover:bg-brand-50 ${
        vacia ? 'text-content-subtle' : 'text-content'
      }`}
    >
      <span className="relative flex h-[18px] w-[18px] shrink-0 items-center justify-center">
        <input
          type="checkbox"
          name={nombre}
          checked={marcada}
          onChange={onChange}
          className="peer h-[18px] w-[18px] cursor-pointer appearance-none rounded-[5px] border border-edge-strong bg-surface checked:border-brand-600 checked:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        />
        <Check
          className="pointer-events-none absolute h-3 w-3 text-cream opacity-0 peer-checked:opacity-100"
          aria-hidden="true"
        />
      </span>
      <span className="flex-1">{faceta.nombre}</span>
      {/*
        El recuento es informativo y ya va dicho en el nombre accesible del
        grupo, así que no se repite en voz alta por cada opción.
      */}
      <span className="text-caption tabular-nums text-content-subtle" aria-hidden="true">
        {faceta.total}
      </span>
    </label>
  );
}

export function Filtros({ facetas, filtros, poner, alternar }: Props) {
  if (!facetas) {
    return (
      <div className="space-y-4" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-card bg-hundido/60" />
        ))}
      </div>
    );
  }

  const animales = visibles(facetas.animals, filtros.animal ? [filtros.animal] : []);
  const categorias = visibles(facetas.categories, filtros.category ? [filtros.category] : []);
  const necesidades = visibles(facetas.needs, filtros.need ?? []);
  const marcas = visibles(facetas.brands, filtros.brand ?? []);

  return (
    <div className="space-y-6">
      {/*
        Ofertas sólo se ofrece si hay algo rebajado. Un filtro «En oferta» que
        deja la pantalla vacía es exactamente la promesa incumplida que esta
        tienda ya tuvo una vez.
      */}
      {(facetas.ofertas > 0 || filtros.oferta) && (
        <Grupo titulo="Precio rebajado">
          <Opcion
            nombre="oferta"
            faceta={{ slug: 'oferta', nombre: 'Sólo en oferta', total: facetas.ofertas }}
            marcada={Boolean(filtros.oferta)}
            onChange={() => poner('oferta', filtros.oferta ? null : '1')}
          />
        </Grupo>
      )}

      {animales.length > 0 && (
        <Grupo titulo="Mascota">
          <div className="-mx-2">
            {animales.map((a) => (
              <Opcion
                key={a.slug}
                nombre="animal"
                faceta={a}
                marcada={filtros.animal === a.slug}
                onChange={() => poner('animal', filtros.animal === a.slug ? null : a.slug)}
              />
            ))}
          </div>
        </Grupo>
      )}

      {categorias.length > 0 && (
        <Grupo titulo="Tipo de producto">
          <div className="-mx-2">
            {categorias.map((c) => (
              <Opcion
                key={c.slug}
                nombre="category"
                faceta={c}
                marcada={filtros.category === c.slug}
                onChange={() => poner('category', filtros.category === c.slug ? null : c.slug)}
              />
            ))}
          </div>
        </Grupo>
      )}

      {necesidades.length > 0 && (
        <Grupo titulo="Necesidad">
          <div className="-mx-2">
            {necesidades.map((n) => (
              <Opcion
                key={n.slug}
                nombre="need"
                faceta={n}
                marcada={(filtros.need ?? []).includes(n.slug)}
                onChange={() => alternar('need', n.slug)}
              />
            ))}
          </div>
        </Grupo>
      )}

      {marcas.length > 0 && (
        <Grupo titulo="Marca">
          <div className="-mx-2 max-h-72 overflow-y-auto">
            {marcas.map((m) => (
              <Opcion
                key={m.slug}
                nombre="brand"
                faceta={m}
                marcada={(filtros.brand ?? []).includes(m.slug)}
                onChange={() => alternar('brand', m.slug)}
              />
            ))}
          </div>
        </Grupo>
      )}

      {/*
        El precio se acota con el rango REAL de lo que hay ahora mismo en
        pantalla, no con un 0-1000 inventado: hoy el catálogo va de 1,35 € a
        62,99 €, y un deslizador hasta 1000 sería casi todo recorrido inútil.
      */}
      {facetas.precio && facetas.precio.min !== facetas.precio.max && (
        <Grupo titulo="Precio">
          <div className="flex items-center gap-2 px-2">
            <label className="flex-1">
              <span className="sr-only">Precio mínimo en euros</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder={`${Math.floor(facetas.precio.min)}`}
                value={filtros.minPrice ?? ''}
                onChange={(e) => poner('minPrice', e.target.value || null)}
                className="field h-10 w-full"
              />
            </label>
            <span className="text-content-subtle" aria-hidden="true">–</span>
            <label className="flex-1">
              <span className="sr-only">Precio máximo en euros</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder={`${Math.ceil(facetas.precio.max)}`}
                value={filtros.maxPrice ?? ''}
                onChange={(e) => poner('maxPrice', e.target.value || null)}
                className="field h-10 w-full"
              />
            </label>
            <span className="text-body-sm text-content-subtle">€</span>
          </div>
        </Grupo>
      )}
    </div>
  );
}
