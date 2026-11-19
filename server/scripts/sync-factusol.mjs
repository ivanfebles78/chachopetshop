/**
 * SINCRONIZA EL CATÁLOGO DESDE FACTUSOL (API DELSOL) — SOLO LECTURA DE FACTUSOL.
 *
 * ⚠️ A Factusol SOLO se le LEE (SELECT). Nunca se escribe nada en Factusol.
 *    Lo único que se escribe es NUESTRA base de datos (ChachoPetShop).
 *
 * Qué hace:
 *   1. Lee TODOS los artículos de Factusol con su precio (Tarifa 1) y stock
 *      (almacén GEN), y su familia.
 *   2. Para cada artículo, busca un producto nuestro que CASE por EAN, referencia
 *      o código: si lo encuentra, lo actualiza (precio, stock, categoría, animal)
 *      y CONSERVA su foto/galería/descripción; si no, crea uno nuevo con imagen
 *      de relleno (ilustración por categoría).
 *   3. Los productos nuestros que NO estén en Factusol se OCULTAN (active=false),
 *      no se borran: quedan como biblioteca de fotos por si el artículo aparece.
 *
 * El catálogo de la web pasa así a mostrar SOLO lo que hay en Factusol.
 *
 * Variables de entorno necesarias (en Railway):
 *   FACTUSOL_COD_FABRICANTE, FACTUSOL_COD_CLIENTE, FACTUSOL_BASE_DATOS,
 *   FACTUSOL_PASSWORD   (en claro; el script la codifica en BASE64)
 *   FACTUSOL_EJERCICIO (opc, def 2026), FACTUSOL_ALMACEN (opc, def GEN),
 *   FACTUSOL_TARIFA (opc, def 1)
 *
 * Uso (desde server/):
 *   node scripts/sync-factusol.mjs --dry-run   # NO escribe: solo informa
 *   node scripts/sync-factusol.mjs             # aplica
 */
import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'node:fs';

const prisma = new PrismaClient();
const dry = process.argv.includes('--dry-run');

const API = 'https://api.sdelsol.com';
const CRED = {
  codigoFabricante: Number(process.env.FACTUSOL_COD_FABRICANTE),
  codigoCliente: Number(process.env.FACTUSOL_COD_CLIENTE),
  baseDatosCliente: process.env.FACTUSOL_BASE_DATOS,
  password: Buffer.from(process.env.FACTUSOL_PASSWORD ?? '', 'utf8').toString('base64'),
};
const EJERCICIO = process.env.FACTUSOL_EJERCICIO || '2026';
const ALMACEN = process.env.FACTUSOL_ALMACEN || 'GEN';
const TARIFA = Number(process.env.FACTUSOL_TARIFA || 1);

// ── Mapeo familia Factusol → (animal, categoría web). Validado con el dueño. ──
const FAMILIAS = {
  // Perro
  PAS: { animal: 'perro', cat: 'alimentacion-seca' },
  PAH: { animal: 'perro', cat: 'alimentacion-humeda' },
  PSN: { animal: 'perro', cat: 'snacks-y-premios' },
  PAN: { animal: 'perro', cat: 'salud-y-antiparasitarios' },
  PSU: { animal: 'perro', cat: 'higiene-y-cosmetica' },
  PBA: { animal: 'perro', cat: 'higiene-y-cosmetica' },
  PAC: { animal: 'perro', cat: 'accesorios' },
  // Gato
  GAS: { animal: 'gato', cat: 'alimentacion-seca' },
  GAH: { animal: 'gato', cat: 'alimentacion-humeda' },
  GSN: { animal: 'gato', cat: 'snacks-y-premios' },
  GAN: { animal: 'gato', cat: 'salud-y-antiparasitarios' },
  GSU: { animal: 'gato', cat: 'higiene-y-cosmetica' },
  GBA: { animal: 'gato', cat: 'higiene-y-cosmetica' },
  GAC: { animal: 'gato', cat: 'accesorios' },
  XXX: { animal: 'gato', cat: 'otros' },
  // Ave
  AAS: { animal: 'ave', cat: 'semillas-y-forraje' },
  AAM: { animal: 'ave', cat: 'semillas-y-forraje' },
  AAP: { animal: 'ave', cat: 'semillas-y-forraje' },
  AAV: { animal: 'ave', cat: 'higiene-y-cosmetica' },
  AAC: { animal: 'ave', cat: 'accesorios' },
  // Peces
  PCL: { animal: 'pez', cat: 'alimentacion-seca' },
  PTR: { animal: 'pez', cat: 'salud-y-antiparasitarios' },
  PEA: { animal: 'pez', cat: 'accesorios' },
  // Roedores
  RAL: { animal: 'roedor', cat: 'alimentacion-seca' },
  RSN: { animal: 'roedor', cat: 'snacks-y-premios' },
  RAC: { animal: 'roedor', cat: 'accesorios' },
  // Reptiles
  REA: { animal: 'reptil', cat: 'alimentacion-seca' },
  RET: { animal: 'reptil', cat: 'accesorios' },
  // Sin animal concreto
  TRA: { animal: null, cat: 'accesorios' },
  PEL: { animal: null, cat: 'otros' },
  REG: { animal: null, cat: 'otros' },
  AGR: { animal: null, cat: 'otros' },
  GAV: { animal: null, cat: 'otros' },
  GBO: { animal: null, cat: 'otros' },
  GEQ: { animal: null, cat: 'otros' },
  GOV: { animal: null, cat: 'otros' },
  GPO: { animal: null, cat: 'otros' },
};
const DEFECTO = { animal: null, cat: 'otros' }; // familia vacía / desconocida / 675

// ── Cliente API DELSOL (auth + consulta SELECT) ───────────────────────────
let token = null;
async function autenticar() {
  const r = await fetch(`${API}/login/Autenticar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(CRED),
  });
  const j = await r.json();
  if (j.respuesta !== 'OK' || !j.resultado) {
    throw new Error('Autenticación con Factusol falló: ' + JSON.stringify(j).slice(0, 200));
  }
  token = j.resultado;
}
async function consulta(sql) {
  if (!token) await autenticar();
  const llamar = () =>
    fetch(`${API}/admin/LanzarConsulta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ ejercicio: EJERCICIO, consulta: sql }),
    }).then((r) => r.json());
  let j = await llamar();
  if (j.respuesta === 'Unauthorized') {
    await autenticar();
    j = await llamar();
  }
  if (j.respuesta !== 'OK') throw new Error('Consulta Factusol falló: ' + JSON.stringify(j).slice(0, 200));
  return (j.resultado || []).map((rec) => Object.fromEntries(rec.map((c) => [c.columna, c.dato])));
}

async function leerCatalogo() {
  const sql =
    'SELECT a.CODART, a.EANART, a.REFART, a.DESART, a.FAMART, ' +
    `(SELECT TOP 1 PRELTA FROM F_LTA WHERE ARTLTA=a.CODART AND TARLTA=${TARIFA}) AS PVP, ` +
    `(SELECT TOP 1 DISSTO FROM F_STO WHERE ARTSTO=a.CODART AND ALMSTO='${ALMACEN}') AS STOCK ` +
    'FROM F_ART a ORDER BY a.FAMART, a.DESART';
  return consulta(sql);
}

const slugify = (s) =>
  String(s)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

async function main() {
  console.log(dry ? '· DRY-RUN (no se escribe NADA) ·\n' : '· APLICANDO (escribe en la BD de ChachoPetShop) ·\n');
  if (!CRED.codigoFabricante || !CRED.codigoCliente || !CRED.baseDatosCliente || !process.env.FACTUSOL_PASSWORD) {
    throw new Error('Faltan variables FACTUSOL_* (COD_FABRICANTE, COD_CLIENTE, BASE_DATOS, PASSWORD).');
  }

  // 1) Leer Factusol (solo lectura)
  const arts = await leerCatalogo();
  console.log(`Factusol: ${arts.length} artículos leídos (ejercicio ${EJERCICIO}, almacén ${ALMACEN}, tarifa ${TARIFA}).`);

  // 2) Taxonomía web
  const [animales, cats] = await Promise.all([
    prisma.animal.findMany({ select: { id: true, slug: true } }),
    prisma.category.findMany({ select: { id: true, slug: true } }),
  ]);
  const idAnimal = Object.fromEntries(animales.map((a) => [a.slug, a.id]));
  const idCat = Object.fromEntries(cats.map((c) => [c.slug, c.id]));

  // 3) Productos existentes (para casar por EAN/ref/código y heredar foto)
  const existentes = await prisma.product.findMany({ include: { variants: { select: { sku: true } } } });
  const porSku = new Map();
  for (const p of existentes) for (const v of p.variants) if (v.sku) porSku.set(String(v.sku).trim(), p);
  const slugsUsados = new Set(existentes.map((p) => p.slug));
  const skusUsados = new Set([...porSku.keys()]);

  // Backup de seguridad antes de aplicar
  if (!dry) {
    const backup = existentes.map((p) => ({ id: p.id, slug: p.slug, name: p.name, active: p.active }));
    const fn = `/tmp/backup-productos-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    writeFileSync(fn, JSON.stringify(backup));
    console.log(`Backup de ${backup.length} productos actuales → ${fn}`);
  }

  const tocados = new Set();
  let creados = 0, actualizados = 0, conFoto = 0, sinFoto = 0, sinPrecio = 0;
  const errores = [];

  for (const a of arts) {
    const cod = String(a.CODART).trim();
    try {
      const ean = String(a.EANART ?? '').trim();
      const ref = String(a.REFART ?? '').trim();
      const fam = String(a.FAMART ?? '').trim();
      const map = FAMILIAS[fam] || DEFECTO;
      const precio = a.PVP != null && Number(a.PVP) > 0 ? Number(a.PVP) : null;
      const stock = a.STOCK != null ? Math.max(0, Math.floor(Number(a.STOCK))) : 0;
      const nombre = String(a.DESART ?? cod).trim() || cod;
      if (precio == null) sinPrecio++;

      const catId = idCat[map.cat] || idCat['otros'];
      const animalIds = map.animal && idAnimal[map.animal] ? [idAnimal[map.animal]] : [];

      // Casar: EAN → REF → CÓDIGO
      let matchedSku = null, prod = null;
      for (const k of [ean, ref, cod]) {
        if (k && porSku.has(k)) { matchedSku = k; prod = porSku.get(k); break; }
      }

      if (prod) {
        conFoto++; actualizados++; tocados.add(prod.id);
        if (dry) continue;
        await prisma.product.update({
          where: { id: prod.id },
          data: {
            name: nombre,
            price: precio,
            active: true,
            categories: catId ? { set: [{ id: catId }] } : undefined,
            animals: { set: animalIds.map((id) => ({ id })) },
            // Se conservan: image, gallery, description, contenido, brand.
          },
        });
        await prisma.productVariant.update({ where: { sku: matchedSku }, data: { price: precio, stock } });
      } else {
        creados++; sinFoto++;
        // sku único para el producto nuevo
        let sku = ean || cod;
        if (!sku || skusUsados.has(sku)) sku = 'FS-' + cod;
        while (skusUsados.has(sku)) sku = sku + '-' + Math.random().toString(36).slice(2, 5);
        // slug único
        let base = slugify(nombre) || 'art-' + cod;
        let slug = base;
        let n = 2;
        while (slugsUsados.has(slug)) slug = `${base}-${n++}`;
        skusUsados.add(sku); slugsUsados.add(slug);
        if (dry) continue;
        const nuevo = await prisma.product.create({
          data: {
            name: nombre,
            slug,
            description: '',
            price: precio,
            image: `https://picsum.photos/seed/chacho-${cod}/800/800`, // relleno → ilustración por categoría
            gallery: [],
            active: true,
            ...(catId ? { categories: { connect: [{ id: catId }] } } : {}),
            ...(animalIds.length ? { animals: { connect: animalIds.map((id) => ({ id })) } } : {}),
            variants: { create: [{ label: 'Único', sku, price: precio, stock, packUnits: 1 }] },
          },
          select: { id: true },
        });
        tocados.add(nuevo.id);
      }
    } catch (e) {
      errores.push(`${cod}: ${e.message}`);
    }
  }

  // 4) Ocultar lo que NO viene de Factusol (no se borra)
  let ocultados = 0;
  if (dry) {
    ocultados = existentes.filter((p) => p.active && !tocados.has(p.id)).length;
  } else {
    const r = await prisma.product.updateMany({
      where: { id: { notIn: [...tocados] }, active: true },
      data: { active: false },
    });
    ocultados = r.count;
  }

  console.log(`\n${dry ? '[DRY-RUN] Se harían:' : 'Hecho:'}`);
  console.log(`  · ${actualizados} actualizados (${conFoto} con foto heredada)`);
  console.log(`  · ${creados} creados nuevos (con imagen de relleno)`);
  console.log(`  · ${ocultados} ocultados (estaban en la web y no están en Factusol)`);
  console.log(`  · ${sinPrecio} artículos sin precio (se muestran como «a consultar»)`);
  if (errores.length) {
    console.log(`  · ${errores.length} errores:`);
    errores.slice(0, 20).forEach((e) => console.log('     -', e));
  }
}

main()
  .catch((e) => {
    console.error('ERROR:', e.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
