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

describe('exportar productos: columna Origen', () => {
  it('con familia de Factusol, el origen es «Factusol»', () => {
    expect(origenDeProducto({ familia: 'PAS' })).toBe('Factusol');
    const [fila] = filasExcelDeProductos([prod({ familia: 'PAS' })]);
    expect(fila!.Origen).toBe('Factusol');
  });

  it('sin familia, el origen es «Base de datos»', () => {
    expect(origenDeProducto({ familia: null })).toBe('Base de datos');
    const [fila] = filasExcelDeProductos([prod({ familia: null })]);
    expect(fila!.Origen).toBe('Base de datos');
  });

  it('las demás columnas siguen saliendo', () => {
    const [fila] = filasExcelDeProductos([
      prod({ name: 'Cama', slug: 'cama', familia: null, brand: { id: 'b', slug: 'nobleza', name: 'Nobleza' } }),
    ]);
    expect(fila).toMatchObject({ Nombre: 'Cama', Slug: 'cama', Marca: 'nobleza', SKU: 'SKU1', Activo: 'sí' });
  });
});

describe('exportar productos: límite de celda de Excel (32767)', () => {
  it('una imagen incrustada (data:) no revienta: se exporta en blanco', () => {
    const dataUrl = 'data:image/png;base64,' + 'A'.repeat(60000);
    const [fila] = filasExcelDeProductos([prod({ image: dataUrl })]);
    expect(fila!.Imagen).toBe('');
  });

  it('una imagen normal (URL o ruta) se exporta tal cual', () => {
    const [u] = filasExcelDeProductos([prod({ image: 'https://cdn.test/foto.jpg' })]);
    expect(u!.Imagen).toBe('https://cdn.test/foto.jpg');
    const [r] = filasExcelDeProductos([prod({ image: '/productos/nobleza/x.webp' })]);
    expect(r!.Imagen).toBe('/productos/nobleza/x.webp');
  });

  it('cualquier celda larguísima se recorta a 32767 y no rompe SheetJS', () => {
    const [fila] = filasExcelDeProductos([prod({ description: 'x'.repeat(40000) })]);
    expect((fila!['Descripción'] as string).length).toBe(32767);
  });
});
