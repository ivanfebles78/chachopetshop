/**
 * RELLENA LA MARCA DE LOS PRODUCTOS DE NUESTRA BD QUE NO LA TENGAN.
 *
 * Factusol NO tiene campo de marca (va dentro del nombre del artículo). Para que
 * el filtro de Marca de la web funcione aunque Factusol los mande sin marca,
 * este script recorre NUESTROS productos sin marca y, si el nombre empieza por
 * una marca que YA existe en la BD (Gosbi, Ownat, Atlantic Pet…), se la asigna.
 *
 *   · SOLO escribe el campo `brand` de productos que están SIN marca.
 *   · NUNCA sobrescribe una marca ya puesta, ni toca precio/stock/visibilidad.
 *   · NO crea marcas nuevas: solo usa las que ya tienes.
 *   · No lee ni escribe NADA en Factusol.
 *
 * Uso (desde server/):
 *   node scripts/backfill-marcas.mjs --dry-run   # solo informa, no escribe
 *   node scripts/backfill-marcas.mjs             # aplica
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const dry = process.argv.includes('--dry-run');

const norm = (s) =>
  String(s ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();

async function main() {
  console.log(dry ? '· DRY-RUN (no se escribe nada) ·\n' : '· APLICANDO (escribe marcas en la BD de ChachoPetShop) ·\n');

  const marcas = await prisma.brand.findMany({ select: { id: true, name: true } });
  const marcasOrden = marcas
    .map((b) => ({ id: b.id, name: b.name, needle: norm(b.name) }))
    .filter((b) => b.needle.length >= 3)
    .sort((a, b) => b.needle.length - a.needle.length); // la más larga primero (Atlantic Pet antes que Atlantic)
  const marcaDeNombre = (nombre) => {
    const n = norm(nombre);
    for (const m of marcasOrden) if (n === m.needle || n.startsWith(m.needle + ' ')) return m;
    return null;
  };

  // Productos SIN marca (da igual si están activos u ocultos)
  const sinMarca = await prisma.product.findMany({
    where: { brandId: null },
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
  });
  console.log(`Productos sin marca en la BD: ${sinMarca.length}`);

  const asignados = [];
  const sinReconocer = [];
  for (const p of sinMarca) {
    const m = marcaDeNombre(p.name);
    if (m) asignados.push({ ...p, marca: m });
    else sinReconocer.push(p);
  }

  if (!dry) {
    for (const a of asignados) {
      await prisma.product.update({ where: { id: a.id }, data: { brand: { connect: { id: a.marca.id } } } });
    }
  }

  // Resumen por marca
  const porMarca = new Map();
  for (const a of asignados) porMarca.set(a.marca.name, (porMarca.get(a.marca.name) || 0) + 1);

  console.log(`\n${dry ? '[DRY-RUN] Se asignarían:' : 'Asignadas:'} ${asignados.length} marcas por nombre`);
  [...porMarca.entries()].sort((a, b) => b[1] - a[1]).forEach(([nombre, n]) => console.log(`   · ${nombre}: ${n}`));

  console.log(`\nSe quedan SIN marca (el nombre no contiene una marca conocida): ${sinReconocer.length}`);
  sinReconocer.slice(0, 60).forEach((p) => console.log(`   - ${p.name}  [${p.slug}]`));
  if (sinReconocer.length > 60) console.log(`   … y ${sinReconocer.length - 60} más`);
}

main()
  .catch((e) => {
    console.error('ERROR:', e.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
