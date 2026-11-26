import { describe, it, expect } from 'vitest';
import { etiquetaFamilias, FAMILIA_ETIQUETA } from './familias';

describe('etiquetas legibles de las familias de Factusol', () => {
  it('traduce una familia suelta', () => {
    expect(etiquetaFamilias(['PAH'])).toBe('Alimentación húmeda');
    expect(etiquetaFamilias(['PAS'])).toBe('Alimentación seca');
    expect(etiquetaFamilias(['AAM'])).toBe('Mezclas');
  });

  it('reconoce los grupos del menú sin importar el orden', () => {
    expect(etiquetaFamilias(['AAV', 'GSU', 'PSU'])).toBe('Vitaminas y suplementos');
    expect(etiquetaFamilias(['PSU', 'AAV', 'GSU'])).toBe('Vitaminas y suplementos');
    expect(etiquetaFamilias(['GBA', 'PGA'])).toBe('Aseo');
    expect(etiquetaFamilias(['GAN', 'PAN'])).toBe('Antiparasitarios');
  });

  it('si varias familias comparten etiqueta, la usa', () => {
    // PAS y GAS son ambas «Alimentación seca» (perro y gato).
    expect(etiquetaFamilias(['PAS', 'GAS'])).toBe('Alimentación seca');
  });

  it('no inventa un rótulo cuando las familias no casan', () => {
    expect(etiquetaFamilias([])).toBeUndefined();
    // Dos etiquetas distintas que no son un grupo conocido.
    expect(etiquetaFamilias(['PAS', 'PAH'])).toBeUndefined();
    expect(etiquetaFamilias(['ZZZ'])).toBeUndefined();
  });

  it('cada código del menú tiene etiqueta', () => {
    for (const cod of ['PAS', 'PSH', 'PAH', 'PSN', 'GAS', 'GSH', 'GAH', 'GSN', 'RAL', 'RSN', 'REA', 'PCL', 'AAP', 'AAS', 'AAM', 'AAV', 'GSU', 'PSU', 'GBA', 'PGA', 'PAN', 'GAN']) {
      expect(FAMILIA_ETIQUETA[cod], cod).toBeTruthy();
    }
  });
});
