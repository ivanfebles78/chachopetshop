import { describe, it, expect, beforeAll } from 'vitest';
import * as XLSX from 'xlsx';
import { parsearProductosDeExcel, filasExcelDeProductos, origenDeProducto } from './excelProductos';
import type { AdminProduct } from './types';

// En producción SheetJS se carga del CDN; en jsdom no hay red, así que lo
// dejamos ya disponible en `window` (el cargador lo reutiliza si existe).
beforeAll(() => {
  (window as unknown as { XLSX: typeof XLSX }).XLSX = XLSX;
});

/** Construye un File .xlsx en memoria a partir de filas con cabeceras. */
function archivo(rows: Record<string, unknown>[]): File {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Productos');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as BlobPart;
  return new File([buf], 'productos.xlsx');
}

describe('parsearProductosDeExcel', () => {
  it('mapea cabeceras con tildes, separa animales y lee precio con coma decimal', async () => {
    const f = archivo([
      {
        SKU: '123',
        Nombre: 'Cama',
        Marca: 'nobleza',
        Animales: 'perro|gato',
        'Categorías': 'accesorios',
        'Línea': 'Descanso',
        Precio: '46,8',
        Activo: 'sí',
      },
    ]);
    const rows = await parsearProductosDeExcel(f);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      sku: '123',
      name: 'Cama',
      brand: 'nobleza',
      animals: ['perro', 'gato'],
      categories: ['accesorios'],
      line: 'Descanso',
      price: 46.8,
      active: true,
    });
  });

  it('descarta filas sin SKU ni slug', async () => {
    const f = archivo([{ Nombre: 'Sin clave' }, { SKU: '9', Nombre: 'Con sku' }]);
    const rows = await parsearProductosDeExcel(f);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.sku).toBe('9');
  });
});

/** Un AdminProduct mínimo para probar la exportación. */
function prod(over: Partial<AdminProduct> = {}): AdminProduct {
  return {
    id: 'p1',
    name: 'Producto',
    slug: 'producto',
    description: '',
    image: '',
    price: 10,
    active: true,
    soloTienda: false,
    line: null,
    ean: null,
    familia: null,
    brand: null,
    animals: [],
    categories: [],
    needs: [],
    variants: [{ id: 'v1', sku: 'SKU1', price: 10, stock: 3, label: 'Único' }],
    ...over,
  };
}

describe('exportar productos: columnas y origen', () => {
  it('exporta SOLO las 8 columnas pedidas, en orden', () => {
    const [fila] = filasExcelDeProductos([prod()]);
    expect(Object.keys(fila!)).toEqual([
      'SKU o EAN',
      'Nombre',
      'Marca',
      'Animal',
      'Familia',
      'Categoría',
      'Origen',
      'Activo',
    ]);
  });

  it('incluye la familia de Factusol', () => {
    const [fila] = filasExcelDeProductos([prod({ familia: 'PAS' })]);
    expect(fila!.Familia).toBe('PAS');
  });

  it('con familia, origen «Factusol»; sin familia, «Base de datos»', () => {
    expect(origenDeProducto({ familia: 'GAH' })).toBe('Factusol');
    expect(origenDeProducto({ familia: null })).toBe('Base de datos');
    expect(filasExcelDeProductos([prod({ familia: 'GAH' })])[0]!.Origen).toBe('Factusol');
    expect(filasExcelDeProductos([prod({ familia: null })])[0]!.Origen).toBe('Base de datos');
  });

  it('«SKU o EAN» usa el SKU y, si no hay, el EAN', () => {
    const conSku = prod({ variants: [{ id: 'v', sku: 'SKU1', price: 1, stock: 1, label: 'u' }], ean: '84000000' });
    expect(filasExcelDeProductos([conSku])[0]!['SKU o EAN']).toBe('SKU1');
    const sinSku = prod({ variants: [], ean: '84000000' });
    expect(filasExcelDeProductos([sinSku])[0]!['SKU o EAN']).toBe('84000000');
  });

  it('marca, animal y categoría salen como slugs', () => {
    const [fila] = filasExcelDeProductos([
      prod({
        brand: { id: 'b', slug: 'nobleza', name: 'Nobleza' },
        animals: [{ id: 'a', slug: 'perro', name: 'Perros' }],
        categories: [{ id: 'c', slug: 'accesorios', name: 'Accesorios' }],
      }),
    ]);
    expect(fila).toMatchObject({ Marca: 'nobleza', Animal: 'perro', 'Categoría': 'accesorios', Activo: 'sí' });
  });

  it('una celda larguísima se recorta a 32767 y no rompe SheetJS', () => {
    const [fila] = filasExcelDeProductos([prod({ name: 'x'.repeat(40000) })]);
    expect((fila!.Nombre as string).length).toBe(32767);
  });
});
