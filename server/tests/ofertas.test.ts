/**
 * «OFERTAS» SIGNIFICA REBAJADO, NO DESTACADO.
 *
 * El menú apuntaba a `featured=1`. `featured` es una decisión de escaparate —
 * qué queremos enseñar primero— y no tiene nada que ver con el precio. La
 * etiqueta prometía un ahorro que en la mayoría de los casos no existía.
 *
 * Un producto está rebajado cuando su precio ANTERIOR es mayor que el actual.
 * Ni `compareAt` nulo, ni `compareAt` igual al precio, ni `compareAt` menor
 * —que sería una subida— cuentan como oferta.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { prisma, limpiar } from './helpers.js';

async function app() {
  const { createApp } = await import('../src/app.js');
  return createApp();
}

async function producto(nombre: string, price: number, compareAt: number | null, featured = false) {
  const marca = await prisma.brand.create({
    data: { name: `M-${nombre}-${Date.now()}`, slug: `m-${nombre}-${Date.now()}` },
  });
  return prisma.product.create({
    data: {
      name: nombre,
      slug: `${nombre}-${Date.now()}`,
      description: 'x',
      brandId: marca.id,
      price,
      compareAt,
      featured,
      image: 'https://ejemplo.test/i.jpg',
      gallery: [],
    },
  });
}

beforeEach(async () => { await limpiar(); });
afterAll(async () => { await prisma.$disconnect(); });

describe('filtro de ofertas', () => {
  it('devuelve sólo los que tienen precio anterior MAYOR', async () => {
    await producto('rebajado', 20, 30);
    await producto('sin-oferta', 20, null);
    await producto('mismo-precio', 20, 20);
    await producto('precio-subido', 20, 10);

    const res = await request(await app()).get('/api/products?oferta=1');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].name).toBe('rebajado');
  });

  it('destacado NO es lo mismo que rebajado', async () => {
    // El defecto exacto que se corrige: el menú enseñaba esto como «Ofertas».
    await producto('destacado-sin-rebaja', 20, null, true);
    const servidor = await app();

    expect((await request(servidor).get('/api/products?featured=true')).body.total).toBe(1);
    expect((await request(servidor).get('/api/products?oferta=1')).body.total).toBe(0);
  });

  it('sin rebajas devuelve cero, no el catálogo entero', async () => {
    /*
     * Lo que pasaría con un parámetro que la API ignora: «Ofertas» enseñaría
     * todo el catálogo como si estuviera de rebajas.
     */
    await producto('a', 10, null);
    await producto('b', 12, null);

    const res = await request(await app()).get('/api/products?oferta=1');
    expect(res.body.total).toBe(0);
  });

  it('se combina con los demás filtros', async () => {
    const p = await producto('rebajado-perro', 20, 30);
    const animal = await prisma.animal.create({ data: { name: 'Perros', slug: 'perro' } });
    await prisma.product.update({
      where: { id: p.id },
      data: { animals: { connect: { id: animal.id } } },
    });
    await producto('rebajado-sin-animal', 20, 30);

    const res = await request(await app()).get('/api/products?oferta=1&animal=perro');
    expect(res.body.total).toBe(1);
  });

  it('un valor no admitido se rechaza', async () => {
    const res = await request(await app()).get('/api/products?oferta=quizas');
    expect(res.status).toBe(400);
  });
});
