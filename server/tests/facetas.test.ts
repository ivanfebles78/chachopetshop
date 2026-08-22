/**
 * RECUENTOS POR FACETA.
 *
 * Sin esto, el panel de filtros no puede hacer las dos cosas que importan:
 * decir cuántos productos hay detrás de cada opción, y NO OFRECER las que no
 * llevan a ninguna parte. El catálogo llevaba desde antes de la Fase 2A
 * ofreciendo «Reptiles» y «Semihúmeda», las dos con cero productos: el menú se
 * arregló en la 2A y el panel de filtros se quedó como estaba.
 *
 * La regla que hace que los números sirvan —y la que más fácil es equivocar—:
 * cada dimensión se cuenta con todos los filtros activos MENOS EL SUYO.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { prisma, limpiar } from './helpers.js';

async function app() {
  const { createApp } = await import('../src/app.js');
  return createApp();
}

let n = 0;
const uid = (p: string) => `${p}-${Date.now()}-${n++}`;

async function sembrar() {
  const [perro, gato] = await Promise.all([
    prisma.animal.create({ data: { name: 'Perros', slug: 'perro' } }),
    prisma.animal.create({ data: { name: 'Gatos', slug: 'gato' } }),
  ]);
  // Existe en la taxonomía y no tendrá ni un producto: el caso real.
  const reptil = await prisma.animal.create({ data: { name: 'Reptiles', slug: 'reptil' } });

  const seca = await prisma.category.create({
    data: { name: 'Alimentación seca', slug: 'alimentacion-seca', type: 'DRY_FOOD' },
  });
  const humeda = await prisma.category.create({
    data: { name: 'Alimentación húmeda', slug: 'alimentacion-humeda', type: 'WET_FOOD' },
  });
  const digestivo = await prisma.need.create({ data: { name: 'Digestivo sensible', slug: 'digestivo' } });
  const marcaA = await prisma.brand.create({ data: { name: 'Ownat', slug: uid('ownat') } });
  const marcaB = await prisma.brand.create({ data: { name: 'Acana', slug: uid('acana') } });

  const crear = async (o: {
    nombre: string; animal: string; categoria: string; marca: string;
    price?: number; compareAt?: number | null; need?: boolean;
  }) =>
    prisma.product.create({
      data: {
        name: o.nombre,
        slug: uid('p'),
        description: 'Descripción.',
        brandId: o.marca,
        price: o.price ?? 20,
        compareAt: o.compareAt ?? null,
        image: 'https://ejemplo.test/i.jpg',
        gallery: [],
        animals: { connect: { id: o.animal } },
        categories: { connect: { id: o.categoria } },
        ...(o.need ? { needs: { connect: { id: digestivo.id } } } : {}),
      },
    });

  // 3 de perro (2 secos, 1 húmedo) y 1 de gato (seco). Ninguno de reptil.
  await crear({ nombre: 'Seco perro 1', animal: perro.id, categoria: seca.id, marca: marcaA.id, need: true });
  await crear({ nombre: 'Seco perro 2', animal: perro.id, categoria: seca.id, marca: marcaB.id, price: 30, compareAt: 40 });
  await crear({ nombre: 'Húmedo perro', animal: perro.id, categoria: humeda.id, marca: marcaA.id });
  await crear({ nombre: 'Seco gato', animal: gato.id, categoria: seca.id, marca: marcaB.id });

  return { perro, gato, reptil, seca, humeda };
}

const facetas = async (qs = '') =>
  (await request(await app()).get(`/api/products?facets=1&pageSize=1${qs}`)).body.facets;

const buscar = (lista: { slug: string; total: number }[], slug: string) =>
  lista.find((x) => x.slug === slug);

beforeEach(async () => {
  await limpiar();
  await sembrar();
});
afterAll(() => prisma.$disconnect());

/* ══ 1. Se piden, no se imponen ════════════════════════════════════════ */

describe('los recuentos van a petición', () => {
  it('sin `facets` la respuesta no cambia', async () => {
    // Aditivo: ninguna llamada existente empieza a pagar consultas de más.
    const res = await request(await app()).get('/api/products?pageSize=1');
    expect(res.status).toBe(200);
    expect(res.body.facets).toBeUndefined();
    expect(res.body.total).toBe(4);
  });

  it('con `facets=1` vienen las cuatro dimensiones, el precio y las ofertas', async () => {
    const f = await facetas();
    expect(Object.keys(f).sort()).toEqual(
      ['animals', 'brands', 'categories', 'needs', 'ofertas', 'precio'].sort(),
    );
    expect(f.precio).toEqual({ min: 20, max: 30 });
    expect(f.ofertas).toBe(1);
  });
});

/* ══ 2. Las facetas vacías se pueden reconocer ═════════════════════════ */

describe('las facetas sin producto se pueden distinguir', () => {
  it('devuelve también las que valen cero, para poder esconderlas', async () => {
    /*
     * Es la razón de contar sobre la TABLA de la faceta y no sobre productos:
     * si las vacías no vinieran, el cliente no podría saber si una faceta falta
     * porque no existe o porque se quedó fuera de la página de resultados. Y
     * sin saberlo, no puede esconderla con criterio.
     */
    const f = await facetas();
    expect(buscar(f.animals, 'reptil')).toEqual({ slug: 'reptil', nombre: 'Reptiles', total: 0 });
  });

  it('los recuentos son los reales', async () => {
    const f = await facetas();
    expect(buscar(f.animals, 'perro')!.total).toBe(3);
    expect(buscar(f.animals, 'gato')!.total).toBe(1);
    expect(buscar(f.categories, 'alimentacion-seca')!.total).toBe(3);
    expect(buscar(f.categories, 'alimentacion-humeda')!.total).toBe(1);
  });
});

/* ══ 3. La regla del «menos el suyo» ═══════════════════════════════════ */

describe('cada dimensión se cuenta sin su propio filtro', () => {
  it('al filtrar por perro, los OTROS animales siguen enseñando su total', async () => {
    /*
     * Si «Gatos» se contara con el filtro de perro puesto, saldría 0 y la
     * sección entera desaparecería: el cliente se quedaría encerrado en perros
     * sin forma de ver que hay gatos. El número tiene que decir «si cambias a
     * gatos, encontrarás esto».
     */
    const f = await facetas('&animal=perro');
    expect(buscar(f.animals, 'gato')!.total).toBe(1);
    expect(buscar(f.animals, 'perro')!.total).toBe(3);
  });

  it('pero las OTRAS dimensiones sí reflejan el filtro activo', async () => {
    // Aquí lo correcto es lo contrario: dentro de perros hay 2 secos, no 3.
    const f = await facetas('&animal=perro');
    expect(buscar(f.categories, 'alimentacion-seca')!.total).toBe(2);
    expect(buscar(f.categories, 'alimentacion-humeda')!.total).toBe(1);
  });

  it('lo mismo al revés: filtrando por categoría, los animales se estrechan', async () => {
    const f = await facetas('&category=alimentacion-humeda');
    expect(buscar(f.animals, 'perro')!.total).toBe(1);
    expect(buscar(f.animals, 'gato')!.total).toBe(0);
    // Y las categorías siguen enseñando las suyas.
    expect(buscar(f.categories, 'alimentacion-seca')!.total).toBe(3);
  });

  it('combinando dos filtros, los recuentos siguen cuadrando', async () => {
    const f = await facetas('&animal=perro&category=alimentacion-seca');
    expect(buscar(f.animals, 'gato')!.total).toBe(1);   // sin el filtro de animal
    expect(buscar(f.categories, 'alimentacion-humeda')!.total).toBe(1); // sin el de categoría
    expect(buscar(f.needs, 'digestivo')!.total).toBe(1); // con los dos puestos
  });
});

/* ══ 4. La búsqueda sí acota los recuentos ═════════════════════════════ */

describe('la búsqueda se aplica a los recuentos', () => {
  it('buscar estrecha todas las dimensiones', async () => {
    const f = await facetas('&q=Seco');
    expect(buscar(f.animals, 'perro')!.total).toBe(2);
    expect(buscar(f.animals, 'gato')!.total).toBe(1);
    expect(buscar(f.categories, 'alimentacion-humeda')!.total).toBe(0);
  });

  it('y las ofertas se cuentan con los filtros puestos', async () => {
    expect((await facetas('&animal=perro')).ofertas).toBe(1);
    expect((await facetas('&animal=gato')).ofertas).toBe(0);
  });
});

/* ══ 5. Buscar por el nombre de una sección que existe ═════════════════ */

describe('la búsqueda encuentra por categoría, necesidad y animal', () => {
  it('el nombre de una categoría real devuelve sus productos', async () => {
    /*
     * Comprobado antes de tocar nada: «alimentación seca» —una categoría con 13
     * productos en producción— devolvía CERO. Quien busca por el nombre de una
     * sección que existe se llevaba una tienda vacía.
     */
    const res = await request(await app()).get('/api/products?q=alimentación seca');
    expect(res.body.total).toBe(3);
  });

  it('el nombre de una necesidad también', async () => {
    const res = await request(await app()).get('/api/products?q=digestivo');
    expect(res.body.total).toBe(1);
  });

  it('y sigue encontrando por nombre y por marca', async () => {
    expect((await request(await app()).get('/api/products?q=Ownat')).body.total).toBe(2);
    expect((await request(await app()).get('/api/products?q=Húmedo')).body.total).toBe(1);
  });

  it('lo que no existe devuelve cero, no el catálogo entero', async () => {
    const res = await request(await app()).get('/api/products?q=zzzzz');
    expect(res.body.total).toBe(0);
    expect(res.body.items).toEqual([]);
  });
});
