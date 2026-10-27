/**
 * CREA (o actualiza) un usuario ADMIN para el panel.
 *
 * La contraseña NO se guarda en el repo: se pasa por variable de entorno y se
 * almacena hasheada (bcrypt). Idempotente: si el usuario ya existe, le pone la
 * contraseña nueva y el rol ADMIN.
 *
 * Uso (desde server/):
 *   ADMIN_EMAIL=admin ADMIN_PASSWORD='tu-contraseña' node scripts/crear-admin.mjs
 *
 * `ADMIN_EMAIL` es el identificador con el que se inicia sesión (vale un nombre
 * de usuario como «admin», no tiene por qué ser un correo).
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const email = process.env.ADMIN_EMAIL?.trim();
const password = process.env.ADMIN_PASSWORD;

async function main() {
  if (!email || !password) {
    throw new Error('Faltan ADMIN_EMAIL y/o ADMIN_PASSWORD.');
  }
  if (password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres.');
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: 'ADMIN' },
    create: { email, passwordHash, role: 'ADMIN', name: 'Administrador' },
    select: { id: true, email: true, role: true },
  });
  console.log(`✓ Usuario admin listo: ${user.email} (rol ${user.role}).`);
}

main()
  .catch((e) => {
    console.error('ERROR:', e.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
