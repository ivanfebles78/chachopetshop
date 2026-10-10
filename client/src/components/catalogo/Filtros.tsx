import { useEffect, useId, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
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
  /** Marca o desmarca uno de los que admiten varios (categoría, necesidad, marca, línea, tamaño). */
  alternar: (clave: 'need' | 'brand' | 'line' | 'size' | 'category', slug: string) => void;
};

/** Las opciones que merecen enseñarse: con producto, o ya seleccionadas. */
function visibles(lista: Faceta[] | undefined, puestas: string[]): Faceta[] {
  return (lista ?? []).filter((f) => f.total > 0 || puestas.includes(f.slug));
}

/**
 * Un grupo de filtros PLEGABLE.
 *
 * El título es un botón de verdad (`aria-expanded` + `aria-controls`), así que
 * un lector de pantalla anuncia «contraído/expandido» y el teclado lo abre con
 * Enter o Espacio. Empieza abierto; al plegarlo, su contenido se oculta de
 * verdad (`hidden`), no sólo visualmente, para que el tabulador no entre en
 * opciones que no se ven.
 */
function Grupo({
  titulo,
  children,
  defaultOpen = true,
}: {
  titulo: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [abierto, setAbierto] = useState(defaultOpen);
  const idContenido = useId();
  return (
    <fieldset className="border-0 p-0">
      <legend className="w-full p-0">
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          aria-controls={idContenido}
          className="-mx-1 flex w-[calc(100%+0.5rem)] items-center justify-between rounded-control px-1 py-1 text-overline font-bold uppercase tracking-[0.12em] text-content-subtle transition-colors hover:text-content"
        >
          <span>{titulo}</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform duration-200 ${abierto ? '' : '-rotate-90'}`}
            aria-hidden="true"
          />
        </button>
      </legend>
      <div id={idContenido} hidden={!abierto} className="mt-2">
        {children}
      </div>
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

/**
 * Rango de precio (desde–hasta). Los inputs guardan su valor en estado LOCAL y
 * solo CONFIRMAN el filtro al salir del campo (blur) o con Enter.
 *
 * Antes confirmaban en cada tecla: al pulsar «1» ya se re-pedían productos, el
 * grupo «Precio» se desmontaba a mitad (mientras `facetas` recargaba) y el input
 * perdía el foco, así que era imposible escribir «10». Con estado local se
 * teclea entero y el filtro se aplica una sola vez, al terminar.
 */
function RangoPrecio({
  min,
  max,
  phMin,
  phMax,
  poner,
}: {
  min: number | null;
  max: number | null;
  phMin: string;
  phMax: string;
  poner: (clave: string, valor: string | null) => void;
}) {
  const texto = (n: number | null) => (n == null ? '' : String(n));
  const [desde, setDesde] = useState(texto(min));
  const [hasta, setHasta] = useState(texto(max));

  // Reflejar cambios que vengan de fuera (p. ej. el botón «Limpiar»).
  useEffect(() => setDesde(texto(min)), [min]);
  useEffect(() => setHasta(texto(max)), [max]);

  const confirmar = (clave: string, valor: string) =>
    poner(clave, valor.trim() === '' ? null : valor.trim());

  const alPulsar = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.currentTarget.blur();
  };

  return (
    <div className="flex items-center gap-2 px-2">
      <label className="flex-1">
        <span className="sr-only">Precio mínimo en euros</span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          placeholder={phMin}
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          onBlur={() => confirmar('minPrice', desde)}
          onKeyDown={alPulsar}
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
          placeholder={phMax}
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
          onBlur={() => confirmar('maxPrice', hasta)}
          onKeyDown={alPulsar}
          className="field h-10 w-full"
        />
      </label>
      <span className="text-body-sm text-content-subtle">€</span>
    </div>
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
  const categorias = visibles(facetas.categories, filtros.category ?? []);
  const necesidades = visibles(facetas.needs, filtros.need ?? []);
  const marcas = visibles(facetas.brands, filtros.brand ?? []);
  const lineas = visibles(facetas.lines, filtros.line ?? []);
  const tamanos = visibles(facetas.sizes, filtros.size ?? []);

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
                marcada={(filtros.category ?? []).includes(c.slug)}
                onChange={() => alternar('category', c.slug)}
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
          {/*
           * Sin tope de alto ni scroll propio: la lista se ve entera y se recorre
           * con el scroll normal de la página. Antes (`max-h-72 overflow-y-auto`)
           * era una segunda barra dentro del panel, difícil de usar.
           */}
          <div className="-mx-2">
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
        Línea de marca (Premium Recetas, Profesional, Ultra Premium…). La línea
        DEPENDE DE LA MARCA: cada fabricante tiene las suyas, así que mezclarlas
        sin marca elegida no significa nada. Por eso sólo se ofrece cuando hay
        una marca seleccionada, y entonces muestra las líneas de ESA marca (sus
        recuentos ya se calculan dentro de la marca). El `slug` de la faceta es
        el nombre de la línea tal cual.
      */}
      {(filtros.brand?.length ?? 0) > 0 && lineas.length > 0 && (
        <Grupo titulo="Línea">
          <div className="-mx-2">
            {lineas.map((l) => (
              <Opcion
                key={l.slug}
                nombre="line"
                faceta={l}
                marcada={(filtros.line ?? []).includes(l.slug)}
                onChange={() => alternar('line', l.slug)}
              />
            ))}
          </div>
        </Grupo>
      )}

      {/*
        Tamaño por peso: rangos fijos (Hasta 1 kg, 1–3 kg…) que el servidor
        cuenta sobre las variantes en gramos/mililitros. Un accesorio sin peso
        no cae en ningún rango, así que no ensucia el recuento.
      */}
      {tamanos.length > 0 && (
        <Grupo titulo="Tamaño">
          <div className="-mx-2">
            {tamanos.map((t) => (
              <Opcion
                key={t.slug}
                nombre="size"
                faceta={t}
                marcada={(filtros.size ?? []).includes(t.slug)}
                onChange={() => alternar('size', t.slug)}
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
          <RangoPrecio
            min={filtros.minPrice ?? null}
            max={filtros.maxPrice ?? null}
            phMin={`${Math.floor(facetas.precio.min)}`}
            phMax={`${Math.ceil(facetas.precio.max)}`}
            poner={poner}
          />
        </Grupo>
      )}
    </div>
  );
}
