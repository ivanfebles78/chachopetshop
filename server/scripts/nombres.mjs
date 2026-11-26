/**
 * LIMPIEZA DE NOMBRES DE PRODUCTO (compartida entre scripts).
 *
 * Algunas marcas llegan de Factusol con su nombre repetido dentro del nombre del
 * artículo («Men for san pipeta 10-25kg» , «FRONTLINE COMBO…»). La tienda ya
 * enseña la marca aparte, así que repetirla sobra. Aquí se recorta.
 *
 * Lo usan:
 *   · `fix-marca-en-nombre.mjs` — arreglo puntual de los productos ya guardados.
 *   · `sync-factusol.mjs` — para que cada sincronización deje el nombre limpio y
 *     el arreglo no se deshaga en la siguiente pasada.
 */

/** Frases de marca a recortar del nombre (se comparan sin mayúsculas/minúsculas). */
export const FRASES_MARCA = ['men for san', 'frontline'];

const escaparRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Quita del nombre todas las apariciones de las frases de marca, deja un solo
 * espacio entre palabras, limpia separadores sueltos al principio y pone la
 * primera letra en mayúscula. Si no queda nada, devuelve cadena vacía (quien
 * llama decide el relleno). Pura: se razona sin base de datos.
 */
export function limpiarNombreMarca(nombre, frases = FRASES_MARCA) {
  let s = String(nombre ?? '');
  for (const f of frases) {
    s = s.replace(new RegExp(escaparRegex(f), 'ig'), ' ');
  }
  s = s.replace(/\s{2,}/g, ' ').trim();
  // Un guion, punto medio o coma colgando al principio no pinta nada.
  s = s.replace(/^[\s\-–—·,:]+/, '').trim();
  if (s) s = s.charAt(0).toUpperCase() + s.slice(1);
  return s;
}
