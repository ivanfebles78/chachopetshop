import 'dotenv/config';
import { z } from 'zod';

/**
 * CONFIGURACIÓN — en producción falla CERRADO.
 *
 * La versión anterior daba a `JWT_SECRET` un valor por defecto
 * (`'dev-secret-change-me-please-1234'`) y hacía opcionales las claves de
 * Stripe. Las dos cosas parecen comodidades de desarrollo y las dos son fallos
 * que se abren solos:
 *
 *   · El repositorio es PÚBLICO. Un secreto por defecto en el código es un
 *     secreto conocido: cualquiera que lea GitHub podía firmarse un token de
 *     administrador si la variable no estaba puesta en Railway.
 *   · Sin `STRIPE_SECRET_KEY`, el checkout entraba en modo demo y regalaba el
 *     pedido. La ausencia de configuración se convertía en una venta gratis.
 *
 * El patrón que se corrige es siempre el mismo: **la falta de configuración no
 * puede ser un modo de funcionamiento**. En producción, lo que falta detiene el
 * arranque; en desarrollo se avisa y se sigue.
 *
 * Los valores NUNCA se imprimen. Los mensajes de error dicen qué falta, jamás
 * qué se recibió.
 */

/* ── Clasificación de variables ─────────────────────────────────────────
 *
 * OBLIGATORIA        el servicio no arranca sin ella en producción
 * OPCIONAL           habilita una función; su ausencia degrada, no rompe
 * SÓLO_DESARROLLO    nunca debe estar puesta en producción
 */

/** Obligatorias en producción. */
export const OBLIGATORIAS_EN_PRODUCCION = [
  'DATABASE_URL',
  'JWT_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  /*
   * Obligatoria desde que la URL de retorno de Stripe usa una lista blanca.
   * Su valor por defecto era `http://localhost:5173`, así que en producción,
   * tras PAGAR, Stripe devolvía al cliente a una página muerta en su propio
   * ordenador. No rompía el arranque ni salía en ningún registro: sólo lo
   * habría descubierto el primer cliente que comprara de verdad.
   */
  'PUBLIC_SITE_URL',
] as const;

/** Opcionales: su ausencia desactiva una función, no abre un agujero. */
export const OPCIONALES = [
  'PORT',
  // Orígenes admitidos para CORS y para la URL de retorno de Stripe. Si no se
  // indica, sólo se acepta `PUBLIC_SITE_URL`, que es lo correcto cuando la API
  // y el frontend comparten dominio — que es el caso hoy.
  'CLIENT_ORIGIN',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  /*
   * Estos dos nombres son los que lee `lib/mailer.ts`. El informe de la Fase 1
   * decía `CONTACT_TO_EMAIL`, que NO existe en el código: configurarla no habría
   * hecho nada y el correo habría ido a `SMTP_USER` sin avisar.
   */
  'CONTACT_TO',
  'CONTACT_FROM',
] as const;

/** Sólo desarrollo y pruebas. En producción se rechaza explícitamente. */
export const SOLO_DESARROLLO = ['ALLOW_INSECURE_DEV_DEFAULTS'] as const;

const esProduccion = process.env.NODE_ENV === 'production';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_ORIGIN: z.string().optional(),

  /*
   * Sin valor por defecto, a propósito. En desarrollo y en pruebas se rellena
   * más abajo con un valor efímero distinto en cada arranque, de modo que no
   * existe ningún secreto compartido que pueda acabar en producción por
   * descuido: aunque alguien copiara este fichero, no hay nada que copiar.
   */
  JWT_SECRET: z.string().min(16, 'JWT_SECRET debe tener al menos 16 caracteres'),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  PUBLIC_SITE_URL: z.string().url('PUBLIC_SITE_URL debe ser una URL absoluta'),
});

/**
 * En desarrollo y pruebas, un secreto ALEATORIO por arranque.
 *
 * Es lo que permite quitar el valor por defecto sin volver el desarrollo
 * incómodo. Efecto secundario buscado: al reiniciar, las sesiones caducan — que
 * es exactamente lo que debe pasar cuando el secreto cambia.
 */
if (!esProduccion && !process.env.PUBLIC_SITE_URL) {
  // En desarrollo apunta al servidor de Vite; en producción es obligatoria.
  process.env.PUBLIC_SITE_URL = 'http://localhost:5173';
}

if (!esProduccion && !process.env.JWT_SECRET) {
  process.env.JWT_SECRET = `dev-efimero-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Sólo los NOMBRES. Nunca los valores recibidos.
  const nombres = Object.keys(parsed.error.flatten().fieldErrors).join(', ');
  console.error(`Configuración inválida. Revisa estas variables: ${nombres}`);
  process.exit(1);
}

/** Faltantes obligatorias en producción, por nombre. */
export function faltantesEnProduccion(entorno: NodeJS.ProcessEnv = process.env): string[] {
  return OBLIGATORIAS_EN_PRODUCCION.filter((nombre) => !entorno[nombre]);
}

if (esProduccion) {
  const faltan = faltantesEnProduccion();
  if (faltan.length > 0) {
    console.error(
      'Faltan variables de entorno obligatorias en producción: ' +
        faltan.join(', ') +
        '. El servicio no arranca sin ellas: sin Stripe el checkout regalaría el pedido, ' +
        'y sin JWT_SECRET las sesiones serían falsificables.',
    );
    process.exit(1);
  }

  const prohibidas = SOLO_DESARROLLO.filter((nombre) => process.env[nombre]);
  if (prohibidas.length > 0) {
    console.error(
      'Variables de sólo desarrollo presentes en producción: ' + prohibidas.join(', '),
    );
    process.exit(1);
  }
}

/**
 * Orígenes admitidos, como lista ya normalizada.
 *
 * Un solo punto de verdad para CORS y para la URL de retorno de Stripe: antes
 * cada uno partía `CLIENT_ORIGIN` por su cuenta y podían discrepar. Si no se
 * indica, el único origen válido es el sitio público — que es lo correcto
 * cuando la API sirve también el frontend, como aquí.
 */
export const origenesPermitidos: string[] = (
  parsed.data.CLIENT_ORIGIN ?? parsed.data.PUBLIC_SITE_URL
)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
