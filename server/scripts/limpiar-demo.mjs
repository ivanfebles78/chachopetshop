/**
 * BORRA LOS PEDIDOS DE DEMOSTRACIÓN del panel (los que sembró `prisma/seed.ts`).
 *
 * El seed de ejemplo crea 70 pedidos FICTICIOS con fechas, productos y cantidades
 * al azar, correos `clienteN@ejemplo.com` y un usuario «Cliente Demo»
 * (`cliente@chachopetshop.com`), sólo para que el panel de estadísticas no
 * saliera vacío. Eso explica que aparezcan ventas en días que la tienda está
 * cerrada: no son ventas reales. Este script los elimina para que ingresos,
 * pedidos y «más vendidos» reflejen la realidad (cero hasta que haya ventas de
 * verdad).
 *
 * SEGURO: borra ÚNICAMENTE los pedidos con esos correos de ejemplo. NO toca
 * ningún pedido real (cualquier otro correo), ni productos, ni stock, ni
 * Factusol. Al borrar un pedido, sus líneas y notificaciones se van en cascada
 * (lo impone la propia base de datos).
 *
 * Uso (desde server/):
 *   node scripts/limpiar-demo.mjs --dry-run   # sólo informa, no borra
 *   node scripts/limpiar-demo.mjs             # borra
 *
 * En Railway se puede disparar en el arranque con LIMPIAR_DEMO=1 (ver Dockerfile).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const dry = process.argv.includes('--dry-run');

// Marcadores EXACTOS del seed de demostración. Nada más entra aquí.
const DEMO_WHERE = {
  OR: [{ email: { endsWith: '@ejemplo.com' } }, { email: 'cliente@chachopetshop.com' }],
};

async function main() {
  console.log(dry ? '· DRY-RUN (no se borra nada) ·\n' : '· BORRANDO pedidos de demostración ·\n');

  const [demo, total] = await Promise.all([
    prisma.order.count({ where: DEMO_WHERE }),
    prisma.order.count(),
  ]);
  console.log(`Pedidos de demostración encontrados: ${demo} (de ${total} en total).`);
  console.log(`Pedidos que se CONSERVAN (reales): ${total - demo}.`);

  if (demo === 0) {
    console.log('\nNo hay pedidos demo que borrar. Nada que hacer.');
    return;
  }
  if (dry) {
    console.log('\n[DRY-RUN] Se borrarían esos pedidos demo y el usuario «Cliente Demo».');
    return;
  }

  const { count } = await prisma.order.deleteMany({ where: DEMO_WHERE });
  console.log(`✓ Borrados ${count} pedidos demo (sus líneas y notificaciones van en cascada).`);

  // El usuario de ejemplo, sólo si ya no le queda ningún pedido (no debería).
  const usuario = await prisma.user.deleteMany({
    where: { email: 'cliente@chachopetshop.com', orders: { none: {} } },
  });
  if (usuario.count) console.log('✓ Borrado el usuario «Cliente Demo».');

  console.log('\nHecho. Las estadísticas se recalculan solas con los pedidos que queden.');
}

main()
  .catch((e) => {
    console.error('ERROR:', e.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
