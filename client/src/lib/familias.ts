/**
 * ETIQUETAS LEGIBLES DE LAS FAMILIAS DE FACTUSOL.
 *
 * El menú de cabecera enlaza a familias crudas (`?familia=PAH`). Para que el
 * catálogo las sepa ENSEÑAR —título de la página, ficha del filtro puesto,
 * estado «próximamente» de una sección vacía— hace falta traducir ese código a
 * un nombre de persona. Vive aquí, en un solo sitio, para no repetir el mapa.
 *
 * Son funciones puras: se prueban sin React ni servidor.
 */

/** Código de familia Factusol → nombre que se enseña. */
export const FAMILIA_ETIQUETA: Record<string, string> = {
  // Perro
  PAS: 'Alimentación seca',
  PSH: 'Alimentación semihúmeda',
  PAH: 'Alimentación húmeda',
  PSN: 'Snacks y premios',
  // Gato
  GAS: 'Alimentación seca',
  GSH: 'Alimentación semihúmeda',
  GAH: 'Alimentación húmeda',
  GSN: 'Snacks y premios',
  // Roedores
  RAL: 'Alimentos',
  RSN: 'Snacks',
  // Reptiles / Peces (una sola familia de alimentación cada uno)
  REA: 'Alimentación',
  PCL: 'Alimentación',
  // Ave
  AAP: 'Pastas',
  AAS: 'Semillas',
  AAM: 'Mezclas',
  // Salud y cosméticos
  AAV: 'Vitaminas y suplementos',
  GSU: 'Vitaminas y suplementos',
  PSU: 'Vitaminas y suplementos',
  GBA: 'Aseo',
  PGA: 'Aseo',
  // Antiparasitarios
  PAN: 'Antiparasitarios',
  GAN: 'Antiparasitarios',
};

/**
 * Los conjuntos que el menú ofrece como UNA sola entrada (varias familias a la
 * vez). Cuando la URL trae exactamente ese conjunto, el nombre es el del grupo,
 * no el de una de sus familias sueltas.
 */
const GRUPOS: { claves: string[]; etiqueta: string }[] = [
  { claves: ['AAV', 'GSU', 'PSU'], etiqueta: 'Vitaminas y suplementos' },
  { claves: ['GBA', 'PGA'], etiqueta: 'Aseo' },
  { claves: ['PAN', 'GAN'], etiqueta: 'Antiparasitarios' },
];

const ordenado = (xs: string[]) => [...new Set(xs)].sort();

/**
 * El nombre legible de un filtro de familia. Devuelve el del grupo si la lista
 * coincide con uno; si no, el nombre común cuando todas comparten etiqueta; y
 * `undefined` si no hay forma de resumirlas en un solo rótulo.
 */
export function etiquetaFamilias(cods: string[]): string | undefined {
  const set = ordenado(cods);
  if (!set.length) return undefined;

  for (const g of GRUPOS) {
    const gs = ordenado(g.claves);
    if (set.length === gs.length && set.every((c, i) => c === gs[i])) return g.etiqueta;
  }

  const etiquetas = new Set(set.map((c) => FAMILIA_ETIQUETA[c]).filter(Boolean));
  return etiquetas.size === 1 ? [...etiquetas][0] : undefined;
}
