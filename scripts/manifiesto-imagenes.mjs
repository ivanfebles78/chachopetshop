/**
 * MANIFIESTO DE IMÁGENES DEL CATÁLOGO.
 *
 * Recorre el catálogo REAL —el de producción, o el que se le indique— y escribe
 * dos ficheros:
 *
 *   docs/imagenes/manifiesto.json   para las herramientas
 *   docs/imagenes/INFORME.md        para leerlo
 *
 * Existe porque la sustitución de las imágenes provisionales por fotografía de
 * verdad la va a hacer una persona, producto a producto, y necesita una lista
 * que diga qué falta y por qué. Se genera desde el catálogo y no se escribe a
 * mano: una lista escrita a mano se queda desfasada el día que Ivan añada un
 * producto.
 *
 *   node scripts/manifiesto-imagenes.mjs
 *   node scripts/manifiesto-imagenes.mjs http://localhost:4000
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const API = process.argv[2] ?? 'https://chachopetshop-production.up.railway.app';

/** Servicios que devuelven una foto AL AZAR. Igual que en `client/src/lib/imagenes.ts`. */
const ALEATORIAS = ['picsum.photos', 'placekitten.com', 'placeimg.com', 'loremflickr.com'];
const esAleatoria = (u) => typeof u !== 'string' || u === '' || ALEATORIAS.some((d) => u.includes(d));

/**
 * Los estados posibles de la imagen de un producto.
 *
 * `CATEGORY_PLACEHOLDER` NO es un aprobado: significa «hoy se dibuja una
 * ilustración de la categoría, y sigue haciendo falta la foto». Por eso todos
 * los que lo llevan aparecen también en la lista de lo que hay que reemplazar.
 */
const ESTADOS = {
  REAL_PRODUCT: 'Fotografía del producto real',
  EXISTING_ASSET: 'Activo propio del proyecto',
  CATEGORY_PLACEHOLDER: 'Ilustración de categoría (provisional)',
  NEEDS_REPLACEMENT: 'Hace falta fotografía real',
};

const ARTE = {
  DRY_FOOD: 'saco de pienso', WET_FOOD: 'lata', SNACKS: 'premios',
  HYGIENE: 'bote de champú', ACCESSORIES: 'comedero', SUPPLEMENTS: 'bote de suplemento',
  VET_DIET: 'envase veterinario', BEDS: 'cama', TRAVEL: 'transportín', OTRO: 'huella',
};

const res = await fetch(`${API}/api/products?pageSize=48`);
if (!res.ok) {
  console.error(`No se pudo leer el catálogo de ${API}: HTTP ${res.status}`);
  process.exit(1);
}
const { items } = await res.json();

const filas = items.map((p) => {
  const cat = p.categories?.[0];
  const tipo = ARTE[cat?.type] ? cat.type : 'OTRO';
  const aleatoria = esAleatoria(p.image);

  return {
    id: p.id,
    slug: p.slug,
    nombre: p.name,
    marca: p.brand?.name ?? null,
    categoria: cat?.name ?? null,
    tipoCategoria: cat?.type ?? null,
    animal: p.animals?.[0]?.name ?? null,
    imagenActual: p.image,
    // Cuántas imágenes trae la galería, para saber si alguna es real.
    galeria: (p.gallery ?? []).length,
    galeriaReal: (p.gallery ?? []).filter((u) => !esAleatoria(u)).length,
    estado: aleatoria ? 'CATEGORY_PLACEHOLDER' : 'REAL_PRODUCT',
    necesitaFoto: aleatoria,
    seDibuja: aleatoria ? `${tipo} · ${ARTE[tipo]}` : null,
    // Las ilustraciones son propias: sin licencia de terceros que respetar.
    licencia: aleatoria ? 'Ilustración propia (sin licencia de terceros)' : 'Pendiente de declarar',
    formato: aleatoria ? 'SVG en línea' : 'desconocido',
    // El SVG va incrustado en el JS: no hay descarga por producto.
    pesoAproximado: aleatoria ? '~1 kB (en línea, sin petición)' : 'sin medir',
  };
});

const pendientes = filas.filter((f) => f.necesitaFoto);
const conFoto = filas.filter((f) => !f.necesitaFoto);

const porCategoria = {};
for (const f of pendientes) {
  const k = f.categoria ?? 'sin categoría';
  porCategoria[k] = (porCategoria[k] ?? 0) + 1;
}

/* ── Salida ────────────────────────────────────────────────────────────── */

const salida = resolve(RAIZ, 'docs/imagenes');
mkdirSync(salida, { recursive: true });

writeFileSync(
  resolve(salida, 'manifiesto.json'),
  JSON.stringify({ generadoDesde: API, total: filas.length, productos: filas }, null, 2) + '\n',
  'utf8'
);

const tabla = filas
  .map(
    (f) =>
      `| ${f.nombre} | ${f.marca ?? '—'} | ${f.categoria ?? '—'} | ${
        f.estado === 'REAL_PRODUCT' ? '**Foto real**' : 'Ilustración'
      } | ${f.seDibuja ?? '—'} |`
  )
  .join('\n');

const md = `# Imágenes del catálogo

> Generado por \`scripts/manifiesto-imagenes.mjs\` desde \`${API}\`.
> **No se edita a mano**: vuelve a ejecutarse y se regenera.

## Resumen

| | |
|---|---|
| Productos en el catálogo | **${filas.length}** |
| Con fotografía real | **${conFoto.length}** |
| Con ilustración de categoría (provisional) | **${pendientes.length}** |

${
  pendientes.length === filas.length
    ? '**Ningún producto tiene fotografía propia todavía.** Los ' +
      filas.length +
      ' se dibujan con la ilustración de su categoría.'
    : ''
}

## Qué falta, por categoría

${Object.entries(porCategoria)
  .sort((a, b) => b[1] - a[1])
  .map(([c, n]) => `- **${c}** — ${n} producto${n === 1 ? '' : 's'}`)
  .join('\n')}

## Cómo se sustituye una imagen

1. Sube la fotografía y pon su URL en el campo \`image\` del producto.
2. Ya está. El frontend usa la foto en cuanto deja de ser una URL de servicio
   aleatorio — no hay que tocar código.

La comprobación vive en \`client/src/lib/imagenes.ts\`.

## Estados

${Object.entries(ESTADOS)
  .map(([k, v]) => `- \`${k}\` — ${v}`)
  .join('\n')}

## Detalle

| Producto | Marca | Categoría | Imagen | Se dibuja |
|---|---|---|---|---|
${tabla}
`;

writeFileSync(resolve(salida, 'INFORME.md'), md, 'utf8');

console.log(`Catálogo leído de ${API}`);
console.log(`  ${filas.length} productos · ${conFoto.length} con foto real · ${pendientes.length} con ilustración`);
console.log(`  docs/imagenes/manifiesto.json`);
console.log(`  docs/imagenes/INFORME.md`);
