/**
 * LA TAXONOMÍA REAL DE PERROS.
 *
 * La estructura comercial que Ivan dio, tal cual, en tres niveles:
 *
 *     Perros → categoría → línea de marca
 *
 * ── Reglas que se han seguido al transcribirla ────────────────────────────
 *
 * · Se corrigen SÓLO faltas de ortografía evidentes: acentos que faltaban y
 *   mayúsculas de nombre propio. Ni una marca cambiada, ni una categoría
 *   reorganizada. Las correcciones concretas van anotadas en cada línea.
 * · Los nombres se dejan como los escribió Ivan aunque suenen repetitivos
 *   («Alpha Spirit alimentación perro» dentro de «Alimentación seca perros»):
 *   son los nombres del catálogo, no titulares, y cambiarlos sería reorganizar.
 * · Las categorías EXISTEN aunque estén vacías. Esta estructura representa el
 *   catálogo que se va a cargar, no el que hay hoy.
 */

export type LineaTaxonomia = {
  nombre: string;
  slug: string;
  /** Sólo las de primer nivel: el tipo que ya usa el catálogo. */
  tipo?: string;
  hijas?: LineaTaxonomia[];
};

export const TAXONOMIA_PERROS: LineaTaxonomia[] = [
  {
    nombre: 'Alimentación seca perros',
    slug: 'alimentacion-seca-perros',
    tipo: 'DRY_FOOD',
    hijas: [
      { nombre: 'Alpha Spirit alimentación perro', slug: 'alpha-spirit-alimentacion-perro' },
      { nombre: 'Atlanticpet Classic Supreme perro', slug: 'atlanticpet-classic-supreme-perro' }, // «clasic» → «Classic»
      { nombre: 'Atlanticpet Premium recetas perro', slug: 'atlanticpet-premium-recetas-perro' },
      { nombre: 'Atlanticpet Pro perro', slug: 'atlanticpet-pro-perro' },
      {
        nombre: 'Atlanticpet Super Premium recetas grain free perro',
        slug: 'atlanticpet-super-premium-recetas-grain-free-perro',
      },
      {
        nombre: 'Atlanticpet Ultra Premium grain free perro',
        slug: 'atlanticpet-ultra-premium-grain-free-perro',
      }, // «Atlantic» → «Atlanticpet», por coherencia con el resto de la línea
      { nombre: 'Energypet perro', slug: 'energypet-perro' },
      { nombre: 'Naturacanarias perro', slug: 'naturacanarias-perro' },
      { nombre: 'Optima Nova grain free perro', slug: 'optima-nova-grain-free-perro' },
      { nombre: 'Optima Nova perro', slug: 'optima-nova-perro' },
      { nombre: 'Primal Spirit alimentación perro', slug: 'primal-spirit-alimentacion-perro' },
      {
        nombre: 'Primal Spirit Iberian alimentación perro',
        slug: 'primal-spirit-iberian-alimentacion-perro',
      },
      { nombre: 'Sevican perro', slug: 'sevican-perro' },
    ],
  },
  {
    nombre: 'Alimentación húmeda perros',
    slug: 'alimentacion-humeda-perros',
    tipo: 'WET_FOOD',
    hijas: [
      {
        nombre: 'Alpha Spirit alimentación húmeda perro',
        slug: 'alpha-spirit-alimentacion-humeda-perro',
      },
      { nombre: 'Atlanticpet Gourmet Experience dog', slug: 'atlanticpet-gourmet-experience-dog' },
      { nombre: 'Atlanticpet húmedos perro', slug: 'atlanticpet-humedos-perro' },
      { nombre: 'Disugual húmedos perro', slug: 'disugual-humedos-perro' },
      { nombre: 'Piper húmeda perro', slug: 'piper-humeda-perro' },
      {
        nombre: 'Primal Spirit Iberian alimentación húmeda perro',
        slug: 'primal-spirit-iberian-alimentacion-humeda-perro',
      },
    ],
  },
  {
    nombre: 'Alimentación semihúmeda perros',
    slug: 'alimentacion-semihumeda-perros',
    tipo: 'SEMIMOIST',
    hijas: [{ nombre: 'Atlanticpet Gourmet', slug: 'atlanticpet-gourmet' }],
  },
  {
    nombre: 'Premios y snacks perros',
    slug: 'premios-snacks-perros',
    tipo: 'SNACKS',
    hijas: [
      { nombre: 'Alpha Spirit snack perro', slug: 'alpha-spirit-snack-perro' },
      { nombre: 'Atlanticpet snacks naturales perro', slug: 'atlanticpet-snacks-naturales-perro' },
      {
        nombre: 'Atlanticpet snacks naturales perro y gato',
        slug: 'atlanticpet-snacks-naturales-perro-y-gato',
      },
      { nombre: 'Primal Spirit Iberian snack perro', slug: 'primal-spirit-iberian-snack-perro' },
    ],
  },
  {
    nombre: 'Suplementos y cosmética perros',
    slug: 'suplementos-cosmetica-perros',
    tipo: 'SUPPLEMENTS',
    hijas: [
      { nombre: 'Animally perro y gato', slug: 'animally-perro-y-gato' },
      { nombre: 'Sanibox', slug: 'sanibox' },
    ],
  },
  {
    nombre: 'Accesorios perros',
    slug: 'accesorios-perros',
    tipo: 'ACCESSORIES',
    hijas: [
      {
        nombre: 'Transportín y jaula perro y gato',
        slug: 'transportin-y-jaula-perro-y-gato',
      }, // «Transportin» → «Transportín»
    ],
  },
];

/** Cuántas categorías define esta taxonomía, para comprobarlo tras sembrar. */
export const TOTAL_TAXONOMIA_PERROS =
  TAXONOMIA_PERROS.length +
  TAXONOMIA_PERROS.reduce((n, c) => n + (c.hijas?.length ?? 0), 0);
