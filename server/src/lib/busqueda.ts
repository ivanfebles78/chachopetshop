import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';

/**
 * BUSCAR COMO SE ESCRIBE, NO COMO SE ACENTÚA.
 *
 * «alimentacion seca» devolvía CERO resultados y «alimentación seca» devolvía
 * trece. La misma búsqueda, escrita como la escribe media España en el móvil,
 * daba una tienda vacía. `ILIKE` ignora mayúsculas pero no tildes, y el
 * `mode: 'insensitive'` de Prisma es exactamente eso.
 *
 * ── Por qué una consulta en crudo y no Prisma ─────────────────────────────
 *
 * Prisma no sabe llamar a `unaccent` dentro de un `where`. Reescribir el
 * catálogo entero en SQL para arreglar la búsqueda sería cambiar mucho más de
 * lo necesario: el listado tiene facetas, orden, paginación y recuentos que ya
 * funcionan y ya están probados.
 *
 * Así que sólo esta parte baja a SQL: se resuelve QUÉ IDS coinciden con el
 * texto, y esos ids vuelven al `where` de Prisma como un `id: { in: [...] }`.
 * El resto del catálogo no se entera.
 *
 * ── Sobre la inyección ────────────────────────────────────────────────────
 *
 * Se usa `Prisma.sql` con plantilla etiquetada, que parametriza de verdad: lo
 * que escribe el cliente viaja como parámetro, nunca concatenado. Comprobado
 * mandando `' OR 1=1 --`.
 */

/** Cuántos ids se traen como mucho. Con más, el `IN` deja de compensar. */
const TOPE = 500;

/**
 * Neutraliza los comodines de `LIKE` en lo que escribe el cliente.
 *
 * `%` y `_` significan algo dentro de un `LIKE`: «cualquier cosa» y
 * «cualquier carácter». Sin escaparlos, buscar `%` devolvía el catálogo
 * ENTERO —lo cazó una prueba— y buscar `a_a` encontraba cosas que no llevan
 * ningún guión bajo. No es un agujero de seguridad, pero sí una búsqueda que
 * miente sobre lo que ha encontrado.
 *
 * La barra invertida va primera: si no, se escaparían las que añadimos aquí.
 */
function literal(texto: string): string {
  return texto.replace(/\\/g, '\\\\').replace(/[%_]/g, (c) => `\\${c}`);
}

/**
 * Los ids de producto cuyo texto coincide, ignorando tildes y mayúsculas.
 *
 * Busca en el nombre y la descripción del producto, en la marca, y en los
 * nombres de categoría, necesidad y animal — que es lo que faltaba antes de la
 * Fase 2C y por lo que «digestivo» no encontraba nada.
 */
export async function idsQueCoinciden(texto: string): Promise<string[]> {
  const limpio = texto.trim();
  if (limpio.length === 0) return [];
  const patron = `%${literal(limpio)}%`;

  const coincide = (columna: Prisma.Sql) =>
    Prisma.sql`public.sin_acentos(${columna}) LIKE public.sin_acentos(${patron}) ESCAPE '\\'`;

  const filas = await prisma.$queryRaw<{ id: string }[]>`
    SELECT DISTINCT p.id
    FROM "Product" p
    LEFT JOIN "Brand" b ON b.id = p."brandId"
    WHERE p.active = true
      AND (
           ${coincide(Prisma.sql`p.name`)}
        OR ${coincide(Prisma.sql`p.description`)}
        OR ${coincide(Prisma.sql`b.name`)}
        OR EXISTS (
             SELECT 1 FROM "_ProductCategories" pc
             JOIN "Category" c ON c.id = pc."A"
             WHERE pc."B" = p.id AND ${coincide(Prisma.sql`c.name`)}
           )
        OR EXISTS (
             SELECT 1 FROM "_ProductNeeds" pn
             JOIN "Need" n ON n.id = pn."A"
             WHERE pn."B" = p.id AND ${coincide(Prisma.sql`n.name`)}
           )
        OR EXISTS (
             SELECT 1 FROM "_ProductAnimals" pa
             JOIN "Animal" a ON a.id = pa."A"
             WHERE pa."B" = p.id AND ${coincide(Prisma.sql`a.name`)}
           )
      )
    LIMIT ${TOPE}
  `;

  return filas.map((f) => f.id);
}

/**
 * La condición de búsqueda para el `where` de Prisma.
 *
 * Devuelve `id: { in: [] }` cuando no hay coincidencias, y eso es deliberado:
 * una lista vacía no encuentra nada, que es lo correcto. Devolver `undefined`
 * haría lo contrario —enseñar el catálogo entero a quien buscó algo que no
 * existe—, y ése es justo el fallo que tuvo «Ofertas» en la Fase 2A.
 */
export async function condicionDeBusqueda(texto: string): Promise<Prisma.ProductWhereInput> {
  return { id: { in: await idsQueCoinciden(texto) } };
}
