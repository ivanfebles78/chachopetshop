import { memo, useEffect, useId, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { ProductFilters } from '@/lib/api';
import type { Faceta, Facetas } from '@/lib/types';

/**
 * PANEL DE FILTROS — ESTRUCTURA ESTABLE, RECUENTOS VIVOS.
 *
 * El servidor (`?facets=1`) devuelve el universo de cada dimensión en orden fijo
 * con su recuento. Reglas, pensadas para NO ofrecer callejones sin salida y a la
 * vez NO hacer saltar el panel:
 *
 *   · Una opción con 0 productos NO se enseña (salvo que esté seleccionada, para
 *     poder soltarla). Así no hay filtros-trampa ni listas infladas de ceros.
 *   · El orden es fijo y nunca se reordena: al filtrar, las listas sólo se
 *     acortan o se alargan, pero cada opción se queda en su sitio.
 *   · Los grupos no se auto-abren ni se remontan: lo que pliegues se queda
 *     plegado, y los recuentos cambian en el sitio (cifras de ancho fijo).
 *
 * Esto es lo que diferencia el acortado normal de una lista del «baile» de
 * antes, que venía de que el panel se remontaba entero a esqueleto, se
 * re-renderizaba con el listado del centro y reseteaba lo plegado.
 *
 * Además el componente está MEMOIZADO y recibe callbacks estables desde la
 * página, así que no se re-renderiza cuando el listado de productos del centro
 * carga o crece: se dibuja de forma independiente del resto de la pantalla.
 *
 * Se usa igual en la barra lateral del escritorio y dentro del cajón del móvil.
 */

type Props = {
  facetas: Facetas | undefined;
  filtros: ProductFilters;
  /** Cambia un filtro de valor único (animal, categoría, oferta). */
  poner: (clave: string, valor: string | null) => void;
  /** Marca o desmarca uno de los que admiten varios (categoría, necesidad, marca, línea, tamaño). */
  alternar: (clave: 'animal' | 'need' | 'brand' | 'line' | 'size' | 'category', slug: string) => void;
};

/**
 * Un grupo de filtros PLEGABLE.
 *
 * El título es un botón de verdad (`aria-expanded` + `aria-controls`), así que
 * un lector de pantalla anuncia «contraído/expandido» y el teclado lo abre con
 * Enter o Espacio. `defaultOpen` sólo fija el estado INICIAL; como la estructura
 * del panel es estable, el grupo no se vuelve a montar, así que lo que el usuario
 * pliegue o despliegue se conserva.
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
 * Casilla de verdad (`input type="checkbox"`). Si la opción no lleva a ningún
 * producto (total 0) y no está marcada, se DESHABILITA: se ve en gris, no se
 * puede pulsar, pero sigue ocupando su sitio para que el panel no cambie de
 * forma. Una opción a 0 pero marcada sigue activa, para poder soltarla.
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
  const deshabilitada = faceta.total === 0 && !marcada;
  return (
    <label
      className={`flex min-h-9 items-center gap-2.5 rounded-control px-2 py-1 text-body-sm transition-colors ${
        deshabilitada
          ? 'cursor-not-allowed text-content-subtle opacity-50'
          : 'cursor-pointer text-content hover:bg-brand-50'
      }`}
    >
      <span className="relative flex h-[18px] w-[18px] shrink-0 items-center justify-center">
        <input
          type="checkbox"
          name={nombre}
          checked={marcada}
          disabled={deshabilitada}
          onChange={onChange}
          className="peer h-[18px] w-[18px] cursor-pointer appearance-none rounded-[5px] border border-edge-strong bg-surface checked:border-brand-600 checked:bg-brand-600 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        />
        <Check
          className="pointer-events-none absolute h-3 w-3 text-cream opacity-0 peer-checked:opacity-100"
          aria-hidden="true"
        />
      </span>
      <span className="flex-1">{faceta.nombre}</span>
      {/*
        El recuento es informativo y ya va dicho en el nombre accesible del
        grupo, así que no se repite en voz alta por cada opción. `tabular-nums`
        hace que al cambiar de 13 a 6 no se mueva nada a los lados.
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

/**
 * EL FILTRO «TIPO DE PRODUCTO» VA AGRUPADO, NO PLANO.
 *
 * Arriba el grupo (Alimentación, Cosmética, Accesorios…) y, al abrirlo, sus
 * subcategorías. El grupo de ACCESORIOS es especial: en la base es UNA sola
 * categoría, así que lo que cuelga de él son las LÍNEAS de accesorio (jaulas,
 * camas, toallitas…), que es como el cliente los piensa.
 */
type GrupoTipo = { nombre: string; cats: string[]; esAccesorios?: boolean };

/** Las líneas de la categoría «accesorios» (su subcategoría real). Lista FIJA. */
const LINEAS_ACCESORIO = [
  'Jaulas y transportines',
  'Descanso',
  'Pads de entrenamiento',
  'Bolsas de basura',
  'Toallitas',
  'Dispensadores de comida',
  'Aglomerantes',
  'Rascadores y árboles',
  'Areneros y accesorios',
];

const GRUPOS_TIPO: GrupoTipo[] = [
  {
    nombre: 'Alimentación',
    cats: ['alimentacion-seca', 'alimentacion-humeda', 'alimentacion-semihumeda', 'snacks-y-premios', 'semillas-y-forraje'],
  },
  { nombre: 'Cosmética', cats: ['higiene-y-cosmetica', 'salud-y-antiparasitarios'] },
  { nombre: 'Accesorios', cats: ['accesorios'], esAccesorios: true },
  { nombre: 'Otros', cats: ['otros'] },
];

/**
 * Cabecera plegable de SEGUNDO nivel (dentro de «Tipo de producto»).
 */
function SubGrupo({
  titulo,
  total,
  defaultOpen,
  children,
}: {
  titulo: string;
  total: number;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(defaultOpen);
  const idContenido = useId();
  return (
    <div className="border-b border-edge-subtle/60 last:border-0">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-controls={idContenido}
        className="flex w-full items-center justify-between gap-2 rounded-control px-2 py-2 text-body-sm font-semibold text-content transition-colors hover:bg-brand-50"
      >
        <span>{titulo}</span>
        <span className="flex items-center gap-2 text-content-subtle">
          <span className="text-caption tabular-nums" aria-hidden="true">
            {total}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform duration-200 ${abierto ? '' : '-rotate-90'}`}
            aria-hidden="true"
          />
        </span>
      </button>
      <div id={idContenido} hidden={!abierto} className="pb-1">
        {children}
      </div>
    </div>
  );
}

/** Las opciones que merecen enseñarse: con producto, o ya seleccionadas (para poder soltarlas). */
function visibles(lista: Faceta[] | undefined, puestas: string[]): Faceta[] {
  return (lista ?? []).filter((f) => f.total > 0 || puestas.includes(f.slug));
}

/**
 * Panel de filtros. MEMOIZADO: como recibe las facetas (estables entre páginas)
 * y callbacks estables desde la página, no se vuelve a dibujar cuando el listado
 * de productos del centro carga o crece. Se renderiza aparte.
 */
export const Filtros = memo(function Filtros({ facetas, filtros, poner, alternar }: Props) {
  if (!facetas) {
    return (
      <div className="space-y-4" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-card bg-hundido/60" />
        ))}
      </div>
    );
  }

  // Orden fijo del servidor, pero OCULTANDO lo que no lleva a ningún producto
  // (recuento 0), salvo lo que esté seleccionado (para poder soltarlo). El orden
  // no cambia y el resto del panel sigue estable (grupos fijos, sin remontaje,
  // memoizado), así que las listas se acortan al filtrar sin que el menú salte.
  const animales = visibles(facetas.animals, filtros.animal ?? []);
  const categorias = visibles(facetas.categories, filtros.category ?? []);
  const necesidades = visibles(facetas.needs, filtros.need ?? []);
  const marcas = visibles(facetas.brands, filtros.brand ?? []);
  const tamanos = visibles(facetas.sizes, filtros.size ?? []);

  // Recuentos de línea por slug, para superponerlos sobre la lista FIJA de
  // líneas de accesorio (las que no vengan en la respuesta cuentan 0).
  const lineCount = new Map(facetas.lines.map((l) => [l.slug, l.total] as const));
  // Líneas de marca presentes (dependen de la marca elegida): es un desglose
  // contextual, sólo se ofrece cuando hay una marca seleccionada.
  const lineasMarca = facetas.lines.filter((l) => !LINEAS_ACCESORIO.includes(l.slug));

  // ── «Tipo de producto» agrupado (estructura CONSTANTE) ──────────────────
  const enAlgunGrupo = new Set(GRUPOS_TIPO.flatMap((g) => g.cats));
  const sueltas = categorias.filter((c) => !enAlgunGrupo.has(c.slug));
  const defsGrupo = sueltas.length
    ? [...GRUPOS_TIPO, { nombre: 'Más', cats: sueltas.map((c) => c.slug) }]
    : GRUPOS_TIPO;
  const grupos = defsGrupo
    .map((g) => {
      const miembros = categorias.filter((c) => g.cats.includes(c.slug));
      const esLinea = Boolean((g as GrupoTipo).esAccesorios);
      const hijos: Faceta[] = esLinea
        ? LINEAS_ACCESORIO.map((nombre) => ({ slug: nombre, nombre, total: lineCount.get(nombre) ?? 0 })).filter(
            (h) => h.total > 0 || (filtros.line ?? []).includes(h.slug),
          )
        : miembros;
      const total = miembros.reduce((s, c) => s + c.total, 0);
      // Sólo fija el estado INICIAL del subgrupo; luego se conserva lo que haga
      // el usuario (no hay remontaje).
      const activo = esLinea
        ? (filtros.category ?? []).includes('accesorios') ||
          (filtros.line ?? []).some((x) => LINEAS_ACCESORIO.includes(x))
        : miembros.some((c) => (filtros.category ?? []).includes(c.slug));
      return { nombre: g.nombre, total, hijos, esLinea, activo, visible: hijos.length > 0 };
    })
    .filter((x) => x.visible);

  return (
    <div className="space-y-6">
      {/* Ofertas: sólo si hay algo rebajado (o ya está puesto el filtro). */}
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
                marcada={(filtros.animal ?? []).includes(a.slug)}
                onChange={() => alternar('animal', a.slug)}
              />
            ))}
          </div>
        </Grupo>
      )}

      {grupos.length > 0 && (
        <Grupo titulo="Tipo de producto">
          <div>
            {grupos.map((gr) => (
              <SubGrupo key={gr.nombre} titulo={gr.nombre} total={gr.total} defaultOpen={gr.activo}>
                <div className="-mx-2">
                  {gr.hijos.map((h) => (
                    <Opcion
                      key={h.slug}
                      nombre={gr.esLinea ? 'line' : 'category'}
                      faceta={h}
                      marcada={(gr.esLinea ? filtros.line ?? [] : filtros.category ?? []).includes(h.slug)}
                      onChange={() => alternar(gr.esLinea ? 'line' : 'category', h.slug)}
                    />
                  ))}
                </div>
              </SubGrupo>
            ))}
          </div>
        </Grupo>
      )}

      {/* Marca va justo después de «Tipo de producto» y antes de «Necesidad». */}
      {marcas.length > 0 && (
        <Grupo titulo="Marca">
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

      {/*
        Línea de marca (Premium Recetas, Profesional…). DEPENDE de la marca, así
        que es un desglose contextual: sólo aparece cuando hay una marca elegida,
        y entonces muestra las líneas de ESA marca. No es churn: es profundizar.
      */}
      {(filtros.brand?.length ?? 0) > 0 && lineasMarca.length > 0 && (
        <Grupo titulo="Línea">
          <div className="-mx-2">
            {lineasMarca.map((l) => (
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
        El precio se acota con el rango REAL de lo que hay en el catálogo. Se
        muestra mientras haya un rango con recorrido (min distinto de max).
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
});
