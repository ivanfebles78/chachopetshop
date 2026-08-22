/**
 * BUSCAR COMO SE ESCRIBE.
 *
 * «alimentacion seca» devolvía CERO resultados y «alimentación seca» devolvía
 * trece. La misma búsqueda, escrita como la escribe media España en un móvil,
 * daba una tienda vacía.
 *
 * `ILIKE` de PostgreSQL ignora mayúsculas pero no tildes, y el
 * `mode: 'insensitive'` de Prisma es exactamente eso. La extensión `unaccent`
 * es la solución estándar, y va instalada en una migración versionada: nada de
 * tocar producción a mano.
 *
 * Estas pruebas van contra PostgreSQL de verdad, que es donde vive el problema:
 * un doble de Prisma no sabe nada de acentos ni de diccionarios.
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
  const marca = await prisma.brand.create({ data: { name: 'Ownat', slug: uid('ownat') } });
  const seca = await prisma.category.create({
    data: { name: 'Alimentación seca', slug: uid('seca'), type: 'DRY_FOOD' },
  });
  const digestivo = await prisma.need.create({ data: { name: 'Digestión sensible', slug: uid('dig') } });
  const perro = await prisma.animal.create({ data: { name: 'Perros', slug: uid('perro') } });

  await prisma.product.create({
    data: {
      name: 'Pienso de salmón',
      slug: uid('salmon'),
      description: 'Con alto contenido en Omega 3 para el pelaje.',
      brandId: marca.id,
      price: 20,
      image: 'https://ejemplo.test/i.jpg',
      gallery: [],
      categories: { connect: { id: seca.id } },
      needs: { connect: { id: digestivo.id } },
      animals: { connect: { id: perro.id } },
    },
  });

  // Un segundo producto SIN relación con lo anterior, para comprobar que la
  // búsqueda acota en vez de devolver el catálogo entero.
  const otra = await prisma.category.create({
    data: { name: 'Juguetes', slug: uid('juguetes'), type: 'ACCESSORIES' },
  });
  await prisma.product.create({
    data: {
      name: 'Pelota de goma',
      slug: uid('pelota'),
      description: 'Resistente.',
      brandId: marca.id,
      price: 5,
      image: 'https://ejemplo.test/i.jpg',
      gallery: [],
      categories: { connect: { id: otra.id } },
    },
  });
}

const buscar = async (q: string) =>
  (await request(await app()).get(`/api/products?q=${encodeURIComponent(q)}&pageSize=48`)).body;

beforeEach(async () => {
  await limpiar();
  await sembrar();
});
afterAll(() => prisma.$disconnect());

/* ══ 1. Con tilde y sin tilde es lo mismo ══════════════════════════════ */

describe('las tildes no cambian el resultado', () => {
  it('el nombre de una CATEGORÍA, con y sin tilde', async () => {
    const conTilde = await buscar('alimentación seca');
    const sinTilde = await buscar('alimentacion seca');
    expect(conTilde.total).toBe(1);
    expect(sinTilde.total).toBe(1);
    expect(sinTilde.items[0].id).toBe(conTilde.items[0].id);
  });

  it('el nombre de una NECESIDAD, con y sin tilde', async () => {
    expect((await buscar('Digestión')).total).toBe(1);
    expect((await buscar('digestion')).total).toBe(1);
    expect((await buscar('DIGESTION')).total).toBe(1);
  });

  it('el nombre de un PRODUCTO, con y sin tilde', async () => {
    expect((await buscar('salmón')).total).toBe(1);
    expect((await buscar('salmon')).total).toBe(1);
    expect((await buscar('SALMON')).total).toBe(1);
  });

  it('funciona al revés: escribir CON tilde lo que está sin ella', async () => {
    // «Perros» no lleva tilde; buscarlo con una no debe romper nada.
    expect((await buscar('perros')).total).toBe(1);
    expect((await buscar('pérros')).total).toBe(1);
  });

  it('las mayúsculas siguen sin importar', async () => {
    expect((await buscar('OWNAT')).total).toBe(2);
    expect((await buscar('ownat')).total).toBe(2);
  });
});

/* ══ 2. Sigue acotando ═════════════════════════════════════════════════ */

describe('la búsqueda sigue siendo una búsqueda', () => {
  it('lo que no existe devuelve CERO, no el catálogo entero', async () => {
    /*
     * El modo de fallar que ya tuvo esta tienda una vez: «Ofertas» prometía
     * rebajas y servía los 28 productos. Una búsqueda sin coincidencias tiene
     * que devolver cero, no todo.
     */
    const r = await buscar('zzzznoexiste');
    expect(r.total).toBe(0);
    expect(r.items).toEqual([]);
  });

  it('acota de verdad: «salmón» no trae la pelota', async () => {
    const r = await buscar('salmon');
    expect(r.total).toBe(1);
    expect(r.items[0].name).toBe('Pienso de salmón');
  });

  it('busca también en la descripción', async () => {
    expect((await buscar('omega')).total).toBe(1);
  });
});

/* ══ 3. Se combina con los filtros ═════════════════════════════════════ */

describe('la búsqueda convive con el resto del catálogo', () => {
  it('se puede filtrar sobre lo buscado', async () => {
    const r = await request(await app()).get('/api/products?q=ownat&category=juguetes&pageSize=48');
    // «ownat» encuentra los dos; el filtro de categoría deja uno.
    expect(r.body.total).toBeLessThanOrEqual(1);
  });

  it('los recuentos por faceta reflejan la búsqueda', async () => {
    const r = await request(await app()).get('/api/products?q=salmon&facets=1&pageSize=1');
    const seca = r.body.facets.categories.find((c: { nombre: string }) => c.nombre === 'Alimentación seca');
    const juguetes = r.body.facets.categories.find((c: { nombre: string }) => c.nombre === 'Juguetes');
    expect(seca.total).toBe(1);
    expect(juguetes.total).toBe(0);
  });

  it('el orden sigue funcionando sobre lo buscado', async () => {
    const r = await request(await app()).get('/api/products?q=ownat&sort=price_asc&pageSize=48');
    const precios = r.body.items.map((p: { price: number }) => p.price);
    expect(precios).toEqual([...precios].sort((a, b) => a - b));
  });
});

/* ══ 4. Nada de lo que llega de fuera se ejecuta ═══════════════════════ */

describe('el texto que escribe el cliente es un dato, no código', () => {
  it('una inyección clásica no devuelve el catálogo', async () => {
    // La consulta baja a SQL en crudo, así que esto importa más que antes.
    const r = await buscar("' OR 1=1 --");
    expect(r.total).toBe(0);
  });

  it('un intento de cerrar la sentencia tampoco', async () => {
    const r = await buscar("'; DROP TABLE \"Product\"; --");
    expect(r.total).toBe(0);
    // Y la tabla sigue ahí.
    expect(await prisma.product.count()).toBe(2);
  });

  it('los comodines de LIKE no se cuelan como comodines', async () => {
    // Un `%` suelto no debe devolverlo todo.
    const r = await buscar('%');
    expect(r.total).toBe(0);
  });

  it('un texto larguísimo no rompe nada', async () => {
    const r = await buscar('a'.repeat(3000));
    expect(r.total).toBe(0);
  });
});
