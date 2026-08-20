/**
 * CONFIGURACIÓN Y ESTADOS — lo que falta no puede ser un modo de funcionar.
 *
 * Dos defectos con la misma forma:
 *
 *   · `JWT_SECRET` tenía por defecto `'dev-secret-change-me-please-1234'`, en un
 *     repositorio PÚBLICO. Si la variable no estaba en Railway, el secreto de
 *     firma era conocido por cualquiera que leyese GitHub.
 *   · Las claves de Stripe eran opcionales, y su ausencia activaba un modo demo
 *     que regalaba el pedido.
 *
 * En los dos casos, la falta de configuración se convertía en un comportamiento.
 * Aquí se fija lo contrario: en producción, lo que falta detiene el arranque.
 *
 * Ninguna prueba imprime valores. Se comprueban NOMBRES.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  OBLIGATORIAS_EN_PRODUCCION,
  OPCIONALES,
  SOLO_DESARROLLO,
  faltantesEnProduccion,
} from '../src/env.js';

const sinComentarios = (ruta: string) =>
  readFileSync(resolve(process.cwd(), ruta), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

/* ══ 1. Clasificación de variables ═════════════════════════════════════ */

describe('clasificación de la configuración', () => {
  it('las cuatro que sostienen dinero y sesiones son obligatorias', () => {
    expect([...OBLIGATORIAS_EN_PRODUCCION]).toEqual(
      expect.arrayContaining([
        'DATABASE_URL',
        'JWT_SECRET',
        'STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET',
      ]),
    );
  });

  it('ninguna obligatoria aparece también como opcional', () => {
    const solapadas = OBLIGATORIAS_EN_PRODUCCION.filter((n) =>
      (OPCIONALES as readonly string[]).includes(n),
    );
    expect(solapadas).toEqual([]);
  });

  it('las de sólo desarrollo están declaradas', () => {
    expect(SOLO_DESARROLLO.length).toBeGreaterThan(0);
  });
});

/* ══ 2. Detección de lo que falta ══════════════════════════════════════ */

describe('detección de configuración incompleta', () => {
  it('un entorno vacío las señala todas, por nombre', () => {
    const faltan = faltantesEnProduccion({} as NodeJS.ProcessEnv);
    expect(faltan).toEqual([...OBLIGATORIAS_EN_PRODUCCION]);
  });

  it('faltando sólo Stripe, señala sólo Stripe', () => {
    const faltan = faltantesEnProduccion({
      DATABASE_URL: 'x',
      JWT_SECRET: 'y',
    } as NodeJS.ProcessEnv);
    expect(faltan).toEqual(['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']);
  });

  it('con todo configurado no falta nada', () => {
    const completo = Object.fromEntries(
      OBLIGATORIAS_EN_PRODUCCION.map((n) => [n, 'valor']),
    ) as NodeJS.ProcessEnv;
    expect(faltantesEnProduccion(completo)).toEqual([]);
  });
});

/* ══ 3. No queda ningún secreto por defecto ════════════════════════════ */

describe('sin secretos en el código', () => {
  it('el secreto de desarrollo que estaba escrito ya no existe', () => {
    const fuente = sinComentarios('src/env.ts');
    expect(fuente).not.toMatch(/dev-secret-change-me/);
  });

  it('JWT_SECRET no tiene ningún valor por defecto en el esquema', () => {
    const fuente = sinComentarios('src/env.ts');
    // `JWT_SECRET: z.string()...default('...')` es exactamente lo que había.
    expect(fuente).not.toMatch(/JWT_SECRET[\s\S]{0,120}?\.default\(/);
  });

  it('el mensaje de error nombra la variable pero nunca su valor', () => {
    const fuente = sinComentarios('src/env.ts');
    // Que no se imprima el entorno ni el valor recibido.
    expect(fuente).not.toMatch(/console\.(log|error)\([^)]*process\.env\[/);
    expect(fuente).toMatch(/faltan\.join/i);
  });
});

/* ══ 4. Sin comodidades de desarrollo escondidas ═══════════════════════ */

describe('separación entre desarrollo y producción', () => {
  it('el checkout no tiene ningún modo demo ni de prueba', () => {
    const fuente = sinComentarios('src/routes/checkout.ts');
    expect(fuente).not.toMatch(/\bdemo\b/i);
    expect(fuente).not.toMatch(/mock/i);
    expect(fuente).not.toMatch(/fake/i);
  });

  it('el webhook sin secreto no responde que todo va bien', () => {
    const fuente = sinComentarios('src/routes/checkout.ts');
    // Antes: `return res.status(200).json({ skipped: true })`.
    expect(fuente).not.toMatch(/skipped/);
  });
});

/* ══ 5. Máquina de estados del pedido ══════════════════════════════════ */

describe('estados del pedido', () => {
  it('PAID sólo se escribe desde el manejador del webhook', () => {
    const fuente = sinComentarios('src/routes/checkout.ts');
    const escrituras = [...fuente.matchAll(/status:\s*'PAID'/g)];
    expect(escrituras).toHaveLength(1);
    expect(escrituras[0].index).toBeGreaterThan(fuente.indexOf('stripeWebhookHandler'));
  });

  it('el paso a PAID exige que el pedido siguiera PENDIENTE', () => {
    /*
     * La condición `status: 'PENDING'` dentro del WHERE es lo que impide que un
     * evento tardío reviva un pedido cancelado o ya fallido.
     */
    const fuente = sinComentarios('src/routes/checkout.ts');
    expect(fuente).toMatch(/where:\s*\{\s*id:\s*orderId,\s*status:\s*'PENDING'\s*\}/);
  });

  it('el esquema declara el estado de fallo, distinto de cancelado', () => {
    const esquema = sinComentarios('prisma/schema.prisma');
    expect(esquema).toMatch(/enum OrderStatus[\s\S]*?FAILED/);
    expect(esquema).toMatch(/enum OrderStatus[\s\S]*?CANCELLED/);
  });
});
