import type { AdminProduct, ImportRow } from './types';

/**
 * EXPORTAR / IMPORTAR EL CATÁLOGO EN EXCEL.
 *
 * SheetJS se carga con `import()` dinámico: es una librería grande y solo hace
 * falta cuando el admin pulsa exportar o importar, así que no entra en el
 * paquete principal de la tienda.
 *
 * Las relaciones (marca, animales, categorías) viajan como SLUGS —los
 * identificadores estables—, no como nombres: así el archivo se puede reeditar
 * y reimportar sin que un cambio de nombre rompa la correspondencia. Los
 * animales y categorías van separados por «|».
 */

const CABECERAS = ['SKU', 'Nombre', 'Descripción', 'Marca', 'Animales', 'Categorías', 'Línea', 'Precio', 'Activo', 'Imagen', 'Slug'];

export async function exportarProductosAExcel(products: AdminProduct[]) {
  const XLSX = await import('xlsx');
  const filas = products.map((p) => ({
    SKU: p.variants[0]?.sku ?? '',
    Nombre: p.name,
    'Descripción': p.description,
    Marca: p.brand?.slug ?? '',
    Animales: p.animals.map((a) => a.slug).join('|'),
    'Categorías': p.categories.map((c) => c.slug).join('|'),
    'Línea': p.line ?? '',
    Precio: p.price ?? p.variants[0]?.price ?? '',
    Activo: p.active ? 'sí' : 'no',
    Imagen: p.image,
    Slug: p.slug,
  }));
  const ws = XLSX.utils.json_to_sheet(filas, { header: CABECERAS });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Productos');
  const fecha = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `productos-chacho-${fecha}.xlsx`);
}

const norm = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

/** Cabeceras aceptadas para cada campo (tolerante a tildes y sinónimos). */
const CLAVES: Record<string, string[]> = {
  sku: ['sku', 'ean', 'referencia', 'ref'],
  slug: ['slug'],
  name: ['nombre', 'name', 'producto'],
  description: ['descripcion', 'description'],
  brand: ['marca', 'brand'],
  animals: ['animales', 'animal', 'animals'],
  categories: ['categorias', 'categoria', 'categories', 'category'],
  line: ['linea', 'line'],
  price: ['precio', 'price'],
  active: ['activo', 'active', 'visible'],
  image: ['imagen', 'image', 'foto'],
};

export async function parsearProductosDeExcel(file: File): Promise<ImportRow[]> {
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const nombreHoja = wb.SheetNames[0];
  const ws = nombreHoja ? wb.Sheets[nombreHoja] : undefined;
  if (!ws) throw new Error('El archivo no tiene ninguna hoja.');
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

  const lista = (v: string) =>
    v
      .split(/[|,;]/)
      .map((s) => s.trim())
      .filter(Boolean);

  return json
    .map((fila) => {
      const get = (clave: string): string => {
        for (const k of Object.keys(fila)) {
          if (CLAVES[clave]?.includes(norm(k))) return String(fila[k] ?? '').trim();
        }
        return '';
      };
      const row: ImportRow = {
        sku: get('sku') || undefined,
        slug: get('slug') || undefined,
        name: get('name') || undefined,
        description: get('description') || undefined,
        line: get('line') || undefined,
        brand: get('brand') || undefined,
        animals: get('animals') ? lista(get('animals')) : undefined,
        categories: get('categories') ? lista(get('categories')) : undefined,
        image: get('image') || undefined,
      };
      const precio = get('price').replace(',', '.');
      if (precio !== '') {
        const n = Number(precio);
        if (!Number.isNaN(n)) row.price = n;
      }
      const activo = norm(get('active'));
      if (activo !== '') row.active = ['si', 'true', '1', 'activo', 'x', 'yes', 'verdadero'].includes(activo);
      return row;
    })
    .filter((r) => r.sku || r.slug);
}
