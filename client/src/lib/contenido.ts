/**
 * LA FORMA DEL CONTENIDO ENRIQUECIDO DE UNA FICHA.
 *
 * `Product.contenido` es una columna JSON, así que el servidor no valida su
 * forma: la valida quien la lee, que es aquí. El motivo de que sea JSON está
 * en el esquema — ese contenido sólo se pinta, no se consulta ni se filtra, y
 * normalizarlo costaría una migración por cada campo que trajera el siguiente
 * fabricante.
 *
 * TODOS los apartados son opcionales, y no por comodidad: un transportín no
 * tiene composición analítica y un pienso sí. La ficha pinta lo que hay.
 *
 * `leerContenido` es la frontera. Lo que entra es un `unknown` venido de la
 * base de datos y lo que sale es algo con forma conocida o `null` — nunca a
 * medias. Un `contenido` corrupto deja la ficha sin secciones extra, no la
 * rompe.
 */

export type ParAnalitico = { nombre: string; valor: string };

export type TablaRaciones = {
  unidad: string;
  pesos: number[];
  filas: { tipo: string; valores: number[] }[];
};

export type ContenidoProducto = {
  titular?: string;
  descripcion?: string[];
  tamanos?: string;
  caracteristicas?: { titulo: string; puntos: string[] };
  composicion?: string;
  analitica?: ParAnalitico[];
  notaAnalitica?: string;
  energia?: string;
  fabricacion?: { titulo: string; parrafos: string[] };
  recomendaciones?: { titulo: string; puntos: string[] };
  raciones?: TablaRaciones;
};

const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const cadena = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v : undefined;

const cadenas = (v: unknown): string[] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const out = v.filter((x): x is string => typeof x === 'string' && x.trim() !== '');
  return out.length ? out : undefined;
};

const bloqueDePuntos = (v: unknown): { titulo: string; puntos: string[] } | undefined => {
  if (!esObjeto(v)) return undefined;
  const titulo = cadena(v.titulo);
  const puntos = cadenas(v.puntos);
  return titulo && puntos ? { titulo, puntos } : undefined;
};

const bloqueDeParrafos = (v: unknown): { titulo: string; parrafos: string[] } | undefined => {
  if (!esObjeto(v)) return undefined;
  const titulo = cadena(v.titulo);
  const parrafos = cadenas(v.parrafos);
  return titulo && parrafos ? { titulo, parrafos } : undefined;
};

const analitica = (v: unknown): ParAnalitico[] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const out = v
    .filter(esObjeto)
    .map((x) => ({ nombre: cadena(x.nombre), valor: cadena(x.valor) }))
    .filter((x): x is ParAnalitico => Boolean(x.nombre && x.valor));
  return out.length ? out : undefined;
};

/**
 * La tabla de raciones, con una condición que no es decorativa: **cada fila
 * tiene que traer tantos valores como pesos hay**.
 *
 * Si no cuadran, la tabla se descarta entera. Pintar una fila corta desplazaría
 * las cifras una columna y le diría a alguien que a un perro de 40 kg le tocan
 * los gramos de uno de 30. Vale mil veces más no enseñar la tabla.
 */
const raciones = (v: unknown): TablaRaciones | undefined => {
  if (!esObjeto(v)) return undefined;
  const unidad = cadena(v.unidad) ?? 'g';
  const pesos = Array.isArray(v.pesos) ? v.pesos.filter((n): n is number => typeof n === 'number') : [];
  if (pesos.length === 0) return undefined;

  if (!Array.isArray(v.filas)) return undefined;
  const filas = v.filas
    .filter(esObjeto)
    .map((f) => ({
      tipo: cadena(f.tipo),
      valores: Array.isArray(f.valores) ? f.valores.filter((n): n is number => typeof n === 'number') : [],
    }))
    .filter((f): f is { tipo: string; valores: number[] } =>
      Boolean(f.tipo) && f.valores.length === pesos.length,
    );

  return filas.length ? { unidad, pesos, filas } : undefined;
};

/** Lee el contenido de un producto. Devuelve `null` si no hay nada utilizable. */
export function leerContenido(bruto: unknown): ContenidoProducto | null {
  if (!esObjeto(bruto)) return null;

  const c: ContenidoProducto = {
    titular: cadena(bruto.titular),
    descripcion: cadenas(bruto.descripcion),
    tamanos: cadena(bruto.tamanos),
    caracteristicas: bloqueDePuntos(bruto.caracteristicas),
    composicion: cadena(bruto.composicion),
    analitica: analitica(bruto.analitica),
    notaAnalitica: cadena(bruto.notaAnalitica),
    energia: cadena(bruto.energia),
    fabricacion: bloqueDeParrafos(bruto.fabricacion),
    recomendaciones: bloqueDePuntos(bruto.recomendaciones),
    raciones: raciones(bruto.raciones),
  };

  // Si no quedó ni un apartado, no hay contenido enriquecido que pintar.
  return Object.values(c).some((v) => v !== undefined) ? c : null;
}
