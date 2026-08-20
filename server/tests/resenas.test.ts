/**
 * NO SE INVENTAN VALORACIONES.
 *
 * Cada producto servía un `rating` y un número de `reviews` que nadie había
 * escrito: el esquema tenía `@default(4.6)` y la semilla generaba
 * `4.2 + Math.random() * 0.8` estrellas con entre 20 y 400 opiniones. No existe
 * ninguna tabla de reseñas; no había ni una sola opinión real detrás.
 *
 * Aparte de lo evidente —engaña a quien compra—, mostrar valoraciones que no
 * proceden de compradores reales es una práctica comercial prohibida por la
 * Directiva Ómnibus (UE) 2019/2161, traspuesta en España por el RDL 24/2021.
 *
 * La corrección NO es poner ceros: un cero también es una afirmación falsa sobre
 * la satisfacción de los clientes. Es dejar de afirmar nada mientras no haya
 * datos, conservando el hueco para cuando existan reseñas de verdad.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { prisma, limpiar, crearProducto } from './helpers.js';

async function app() {
  const { createApp } = await import('../src/app.js');
  return createApp();
}

beforeEach(async () => {
  await limpiar();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('la API no publica valoraciones inventadas', () => {
  it('el listado de productos no incluye rating ni reviews', async () => {
    await crearProducto({ stock: 5 });
    const res = await request(await app()).get('/api/products');

    expect(res.status).toBe(200);
    const producto = res.body.items?.[0];
    expect(producto).toBeTruthy();
    expect(producto).not.toHaveProperty('rating');
    expect(producto).not.toHaveProperty('reviews');
  });

  it('la ficha de un producto tampoco', async () => {
    const { producto } = await crearProducto({ stock: 5 });
    const res = await request(await app()).get(`/api/products/${producto.slug}`);

    expect(res.status).toBe(200);
    const cuerpo = JSON.stringify(res.body);
    expect(cuerpo).not.toMatch(/"rating"/);
    expect(cuerpo).not.toMatch(/"reviews"/);
  });

  it('no se puede ordenar por una valoración que no existe', async () => {
    const res = await request(await app()).get('/api/products?sort=rating');
    // Se rechaza el criterio en lugar de fingir que ordena por algo real.
    expect(res.status).toBe(400);
  });
});

describe('el origen de los datos inventados está retirado', () => {
  const sinComentarios = (ruta: string) =>
    readFileSync(resolve(process.cwd(), ruta), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');

  it('el esquema no da por defecto una puntuación', () => {
    const esquema = sinComentarios('prisma/schema.prisma');
    // `@default(4.6)` convertía en «4,6 estrellas» a todo producto nuevo.
    expect(esquema).not.toMatch(/rating\s+Float\s+@default/);
  });

  it('la semilla no genera puntuaciones ni recuentos al azar', () => {
    const semilla = sinComentarios('prisma/seed.ts');
    expect(semilla).not.toMatch(/rating:\s*Number\(/);
    expect(semilla).not.toMatch(/reviews:\s*Math\.floor/);
    expect(semilla).not.toMatch(/Math\.random\(\)\s*\*\s*380/);
  });
});
