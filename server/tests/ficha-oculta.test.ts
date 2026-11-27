/**
 * LA FICHA DE UN PRODUCTO OCULTO: 404 PARA EL PÚBLICO, VISIBLE PARA EL ADMIN.
 *
 * El panel de administración enlaza el nombre de cada producto —incluidos los
 * ocultos (`active=false`) y los de solo tienda física (`soloTienda=true`)— a la
 * misma ficha pública `/producto/<slug>`. Si esa ficha 404ea sin más, el admin
 * no puede abrir para revisar justo los productos que necesita revisar.
 *
 * La regla: al público se le sigue negando (404), pero a un admin autenticado
 * (cookie JWT con rol ADMIN) se le sirve.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';

import { prisma, limpiar, crearProducto, crearUsuario } from './helpers.js';
import { signToken } from '../src/middleware/auth.js';

async function app() {
  const { createApp } = await import('../src/app.js');
  return createApp();
}

async function cookieAdmin() {
  const admin = await crearUsuario('ADMIN');
  const token = signToken({ id: admin.id, email: admin.email, role: 'ADMIN' });
  return `token=${token}`;
}

beforeEach(async () => {
  await limpiar();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('ficha de producto oculto', () => {
  it('un producto activo se sirve al público', async () => {
    const { producto } = await crearProducto({ stock: 5 });
    const res = await request(await app()).get(`/api/products/${producto.slug}`);
    expect(res.status).toBe(200);
    expect(res.body.product?.slug).toBe(producto.slug);
  });

  it('un producto oculto (active=false) da 404 al público', async () => {
    const { producto } = await crearProducto({ stock: 5 });
    await prisma.product.update({ where: { id: producto.id }, data: { active: false } });
    const res = await request(await app()).get(`/api/products/${producto.slug}`);
    expect(res.status).toBe(404);
  });

  it('un producto de solo tienda física da 404 al público', async () => {
    const { producto } = await crearProducto({ stock: 5 });
    await prisma.product.update({ where: { id: producto.id }, data: { soloTienda: true } });
    const res = await request(await app()).get(`/api/products/${producto.slug}`);
    expect(res.status).toBe(404);
  });

  it('un admin autenticado SÍ puede abrir la ficha de un producto oculto', async () => {
    const { producto } = await crearProducto({ stock: 5 });
    await prisma.product.update({ where: { id: producto.id }, data: { active: false } });
    const res = await request(await app())
      .get(`/api/products/${producto.slug}`)
      .set('Cookie', await cookieAdmin());
    expect(res.status).toBe(200);
    expect(res.body.product?.slug).toBe(producto.slug);
  });

  it('un admin también puede abrir la ficha de un producto de solo tienda física', async () => {
    const { producto } = await crearProducto({ stock: 5 });
    await prisma.product.update({ where: { id: producto.id }, data: { soloTienda: true } });
    const res = await request(await app())
      .get(`/api/products/${producto.slug}`)
      .set('Cookie', await cookieAdmin());
    expect(res.status).toBe(200);
  });

  it('un CLIENTE autenticado (no admin) sigue viendo 404', async () => {
    const { producto } = await crearProducto({ stock: 5 });
    await prisma.product.update({ where: { id: producto.id }, data: { active: false } });
    const cliente = await crearUsuario('CUSTOMER');
    const token = signToken({ id: cliente.id, email: cliente.email, role: 'CUSTOMER' });
    const res = await request(await app())
      .get(`/api/products/${producto.slug}`)
      .set('Cookie', `token=${token}`);
    expect(res.status).toBe(404);
  });
});
