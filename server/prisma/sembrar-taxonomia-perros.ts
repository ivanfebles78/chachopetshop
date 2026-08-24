/**
 * SIEMBRA DE LA TAXONOMÍA REAL DE PERROS.
 *
 * Aplica `taxonomia-perros.ts` a la base de datos. Es IDEMPOTENTE: se puede
 * ejecutar tantas veces como haga falta y sólo crea lo que no existe. Eso
 * importa porque esta estructura se va a ir ajustando según entren productos, y
 * un script que duplicara categorías en cada pasada sería inservible.
 *
 * No toca `seed.ts`: aquélla puebla el catálogo de demostración y ésta define
 * la estructura comercial real. Mezclarlas haría que sembrar la demo borrara la
 * taxonomía, o al revés.
 *
 *   npx tsx prisma/sembrar-taxonomia-perros.ts
 */

import { PrismaClient, type CategoryType } from '@prisma/client';
import { TAXONOMIA_PERROS, TOTAL_TAXONOMIA_PERROS } from './taxonomia-perros.js';

const prisma = new PrismaClient();

async function main() {
  const perros = await prisma.animal.findUnique({ where: { slug: 'perro' } });
  if (!perros) {
    throw new Error(
      'No existe el animal «perro». La taxonomía cuelga de él, así que no se ' +
        'siembra a ciegas: revisa la base de datos.',
    );
  }

  let creadas = 0;
  let actualizadas = 0;

  for (const [i, madre] of TAXONOMIA_PERROS.entries()) {
    const existente = await prisma.category.findUnique({ where: { slug: madre.slug } });

    const datos = {
      name: madre.nombre,
      type: madre.tipo as CategoryType,
      sortOrder: i,
      animalId: perros.id,
      parentId: null,
    };

    const categoria = existente
      ? await prisma.category.update({ where: { slug: madre.slug }, data: datos })
      : await prisma.category.create({ data: { slug: madre.slug, ...datos } });
    existente ? actualizadas++ : creadas++;

    for (const [j, hija] of (madre.hijas ?? []).entries()) {
      const yaEsta = await prisma.category.findUnique({ where: { slug: hija.slug } });
      const datosHija = {
        name: hija.nombre,
        // La subcategoría hereda el tipo de su madre: una línea de marca dentro
        // de «Alimentación seca» es alimentación seca.
        type: madre.tipo as CategoryType,
        sortOrder: j,
        parentId: categoria.id,
        // El animal lo aporta la madre; la hija lo deja nulo para no duplicar
        // la misma verdad en dos sitios.
        animalId: null,
      };
      if (yaEsta) {
        await prisma.category.update({ where: { slug: hija.slug }, data: datosHija });
        actualizadas++;
      } else {
        await prisma.category.create({ data: { slug: hija.slug, ...datosHija } });
        creadas++;
      }
    }
  }

  const total = await prisma.category.count({
    where: {
      OR: [{ animalId: perros.id }, { parent: { animalId: perros.id } }],
    },
  });

  console.log(`Taxonomía de perros sembrada: ${creadas} creadas, ${actualizadas} actualizadas.`);
  console.log(`  categorías de perros en la base: ${total} (la taxonomía define ${TOTAL_TAXONOMIA_PERROS})`);

  if (total !== TOTAL_TAXONOMIA_PERROS) {
    console.warn(
      '  AVISO: el número no coincide. Puede haber categorías de perros anteriores ' +
        'a esta estructura; revísalas antes de dar la taxonomía por buena.',
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
