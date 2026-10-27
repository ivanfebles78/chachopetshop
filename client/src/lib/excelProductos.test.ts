import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parsearProductosDeExcel } from './excelProductos';

/** Construye un File .xlsx en memoria a partir de filas con cabeceras. */
function archivo(rows: Record<string, unknown>[]): File {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Productos');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
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
