/**
 * LA URL DE RETORNO DE STRIPE TIENE QUE APUNTAR A LA TIENDA.
 *
 * La Fase 1 sustituyó `req.headers.origin` —que controla quien llama— por una
 * lista blanca. Eso cerró una redirección abierta, pero creó una dependencia
 * nueva: si `CLIENT_ORIGIN` y `PUBLIC_SITE_URL` no están configuradas, sus
 * valores por defecto son `http://localhost:5173`.
 *
 * En producción eso significa que, tras PAGAR, Stripe devuelve al cliente a
 * `http://localhost:5173/checkout/success`: una página muerta en su propio
 * ordenador. Ha pagado y no ve confirmación de nada.
 *
 * Es el peor tipo de fallo de configuración: no rompe nada al arrancar, no sale
 * en ningún registro, y sólo lo descubre el primer cliente que compra de verdad.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { OBLIGATORIAS_EN_PRODUCCION, faltantesEnProduccion } from '../src/env.js';

describe('configuración de las URL de retorno', () => {
  it('el sitio público es obligatorio en producción', () => {
    /*
     * Sin él, `base` cae al valor por defecto y la redirección posterior al pago
     * apunta a localhost. Tiene que impedir el arranque, igual que las claves.
     */
    expect([...OBLIGATORIAS_EN_PRODUCCION]).toContain('PUBLIC_SITE_URL');
  });

  it('un entorno sin el sitio público lo señala', () => {
    const faltan = faltantesEnProduccion({
      DATABASE_URL: 'x',
      JWT_SECRET: 'y',
      STRIPE_SECRET_KEY: 'z',
      STRIPE_WEBHOOK_SECRET: 'w',
    } as NodeJS.ProcessEnv);
    expect(faltan).toContain('PUBLIC_SITE_URL');
  });

  it('no queda ningún valor por defecto con localhost para las URL públicas', () => {
    const fuente = readFileSync(resolve(process.cwd(), 'src/env.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');

    // `PUBLIC_SITE_URL: z.string().default('http://localhost:5173')` es
    // exactamente lo que mandaba al cliente a su propia máquina.
    expect(fuente).not.toMatch(/PUBLIC_SITE_URL[^\n]*default\(/);
  });
});
