/**
 * QUITA EL NOMBRE DE LA MARCA DEL NOMBRE DEL PRODUCTO.
 *
 * Algunas marcas llegan de Factusol con su nombre repetido al principio del
 * nombre del artículo: «Men for san pipeta 10-25kg unidad». La tienda ya enseña
 * la marca aparte, así que repetirla en el nombre sobra. Este script lo recorta:
 *   «Men for san pipeta 10-25kg unidad»  ->  «Pipeta 10-25kg unidad»
 *   «Frontline Combo Perro 10-20kg»      ->  «Combo Perro 10-20kg»
 *
 * Marcas tratadas: MEN FOR SAN y FRONTLINE (ver FRASES).
 *
 * Qué toca y qué NO:
 *   · Cambia SOLO `Product.name`. No toca el slug (los enlaces no se rompen), ni
 *     la marca, ni variantes, ni precios.
 *   · Sólo productos cuyo nombre CONTIENE la frase de la marca (sin distinguir
 *     mayúsculas); los demás no se tocan.
 *   · Si al quitar la marca el nombre quedaría vacío, se deja como estaba y se
 *     avisa.
 *
 * SEGURO POR DEFECTO: simula y no escribe nada. Para aplicar hay que pasar
 * `--apply` EXPLÍCITAMENTE.
 *
 * ⚠️ El sincronizador de Factusol (`sync-factusol.mjs`) reescribe `name` con el
 *    texto de Factusol en cada pasada, así que si DESART sigue trayendo la marca,
 *    una sincronización posterior volvería a añadirla. Para que el recorte sea
 *    permanente hay que limpiarlo también en el sync (ver nota al final).
 *
 * Uso (desde server/):
 *   DATABASE_URL="postgres://…PROD…" node scripts/fix-marca-en-nombre.mjs            # simula
 *   DATABASE_URL="postgres://…PROD…" node scripts/fix-marca-en-nombre.mjs --apply    # aplica
 */
import { PrismaClient } from '@prisma/client';
import { pathToFileURL } from 'node:url';
import { FRASES_MARCA as FRASES, limpiarNombreMarca as limpiarNombre } from './nombres.mjs';

const prisma = new PrismaClient();
const aplicar = process.argv.includes('--apply');

async function main() {
  console.log(aplicar ? '· APLICANDO (escribe en la BD) ·\n' : '· SIMULACIÓN (no escribe nada; usa --apply para aplicar) ·\n');

  // Productos cuyo nombre contiene alguna de las frases (sin distinguir
  // mayúsculas). Se trae la marca solo para poder enseñarla en el informe.
  const candidatos = await prisma.product.findMany({
    where: { OR: FRASES.map((f) => ({ name: { contains: f, mode: 'insensitive' } })) },
    select: { id: true, name: true, brand: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });

  let cambiados = 0;
  let sinCambio = 0;
  let vacios = 0;
  const aEscribir = [];

  for (const p of candidatos) {
    const nuevo = limpiarNombre(p.name);
    if (!nuevo) {
      vacios++;
      console.log(`  [SE DEJA] «${p.name}» -> quedaría vacío (marca: ${p.brand?.name ?? '—'})`);
      continue;
    }
    if (nuevo === p.name) {
      sinCambio++;
      continue;
    }
    cambiados++;
    console.log(`  «${p.name}»  ->  «${nuevo}»   (marca: ${p.brand?.name ?? '—'})`);
    aEscribir.push({ id: p.id, nuevo });
  }

  console.log(`\nResumen: ${candidatos.length} candidatos · ${cambiados} a renombrar · ${sinCambio} ya estaban bien · ${vacios} se dejan (quedarían vacíos).`);

  if (aplicar && aEscribir.length) {
    for (const c of aEscribir) {
      await prisma.product.update({ where: { id: c.id }, data: { name: c.nuevo } });
    }
    console.log(`\nHecho: ${aEscribir.length} nombres actualizados.`);
  } else if (!aplicar && cambiados) {
    console.log('\n(Simulación: no se ha escrito nada. Vuelve a lanzarlo con --apply para aplicar.)');
  }
}

// Sólo corre al ejecutarlo directamente (`node scripts/fix-marca-en-nombre.mjs`).
// Al importarlo (p. ej. para probar `limpiarNombre`) no toca la base de datos.
const ejecutadoDirecto =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (ejecutadoDirecto) {
  main()
    .catch((e) => {
      console.error('ERROR:', e.message ?? e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
