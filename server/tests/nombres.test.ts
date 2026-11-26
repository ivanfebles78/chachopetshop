import { describe, it, expect } from 'vitest';
// @ts-expect-error — script .mjs sin tipos; se prueba su comportamiento.
import { limpiarNombreMarca } from '../scripts/nombres.mjs';

describe('limpiarNombreMarca: quita la marca repetida del nombre', () => {
  it('recorta «Men for san» esté donde esté y capitaliza', () => {
    expect(limpiarNombreMarca('Men for san pipeta 10-25kg unidad')).toBe('Pipeta 10-25kg unidad');
    expect(limpiarNombreMarca('MEN FOR SAN CHAMPU AVENA 300 ML')).toBe('CHAMPU AVENA 300 ML');
    expect(limpiarNombreMarca('ATRAYENTE MICCIONES 125 ML MEN FOR SAN')).toBe('ATRAYENTE MICCIONES 125 ML');
  });

  it('recorta «Frontline» y colapsa los espacios dobles', () => {
    expect(limpiarNombreMarca('FRONTLINE COMBO 10-20 KILOS    1  U/N')).toBe('COMBO 10-20 KILOS 1 U/N');
    expect(limpiarNombreMarca('Frontline Combo Perro 10-20kg')).toBe('Combo Perro 10-20kg');
  });

  it('no toca nombres sin esas marcas', () => {
    expect(limpiarNombreMarca('Pipeta genérica 10-25kg')).toBe('Pipeta genérica 10-25kg');
  });

  it('devuelve vacío si el nombre era solo la marca (quien llama decide el relleno)', () => {
    expect(limpiarNombreMarca('Men For San')).toBe('');
  });
});
