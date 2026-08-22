/**
 * NADA INVENTADO, NADA ROTO, EN NINGUNA PANTALLA.
 *
 * Esta prueba existe por un fallo de la anterior. El contrato del shell miraba
 * tres ficheros escritos a mano —cabecera, pie y menú móvil— y daba por
 * limpio el teléfono «922 00 00 00». Estaba en otros dos sitios que la lista no
 * nombraba: la página de contacto, con dirección, horario y correo inventados
 * al lado, y la portada, donde el reclamo «¿Tienes alguna duda?» marcaba ese
 * número entero. Una lista escrita a mano sólo vigila lo que alguien se acordó
 * de escribir en ella.
 *
 * Así que aquí no hay lista: se barre TODO el código del cliente con
 * `import.meta.glob`. Un fichero nuevo queda vigilado por existir.
 */

import { describe, it, expect } from 'vitest';

/* Cada módulo en crudo. Se excluyen las pruebas: hablan de lo prohibido. */
const TODAS = import.meta.glob('./**/*.{ts,tsx}', {
  query: '?raw',
  eager: true,
  import: 'default',
}) as Record<string, string>;

const FUENTES: [string, string][] = Object.entries(TODAS)
  .filter(([ruta]) => !ruta.includes('.test.'))
  .map(([ruta, texto]) => [ruta, texto]);

/**
 * El texto sin comentarios. Lo que se prohíbe es lo que LLEGA AL NAVEGADOR;
 * explicar en un comentario qué se quitó y por qué es justo lo contrario.
 */
const codigo = (fuente: string) =>
  fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const cada = (comprobar: (codigo: string, ruta: string) => void) => {
  for (const [ruta, fuente] of FUENTES) comprobar(codigo(fuente), ruta);
};

it('hay ficheros que barrer (si no, la prueba no probaría nada)', () => {
  expect(FUENTES.length).toBeGreaterThan(20);
});

describe('ningún dato de contacto inventado', () => {
  it('el teléfono de relleno no está en ninguna parte', () => {
    // Estuvo publicado en tres pantallas distintas, con enlace `tel:` incluido.
    cada((c, ruta) => {
      expect(c, ruta).not.toMatch(/922\s*00\s*00\s*00/);
      expect(c, ruta).not.toMatch(/tel:\+?34\s*922\s*0{6}/);
    });
  });

  it('no hay dirección de ejemplo', () => {
    cada((c, ruta) => expect(c, ruta).not.toMatch(/Calle Ejemplo/i));
  });

  it('los datos de empresa salen de un solo sitio', () => {
    /*
     * Estaban escritos dos veces. Con dos copias, rellenar el teléfono real en
     * una y olvidar la otra deja publicado el inventado, que es exactamente lo
     * que había pasado.
     */
    const contacto = FUENTES.find(([r]) => r.endsWith('ContactoPage.tsx'));
    const pie = FUENTES.find(([r]) => r.endsWith('Footer.tsx'));
    expect(contacto?.[1]).toMatch(/from '@\/lib\/empresa'/);
    expect(pie?.[1]).toMatch(/from '@\/lib\/empresa'/);
  });
});

describe('nada que parezca pulsable sin serlo', () => {
  it('no queda ningún href="#"', () => {
    // Cuatro había: dos en el pie y dos en contacto. Un lector de pantalla los
    // anunciaba como enlaces y no llevaban a ninguna parte.
    cada((c, ruta) => expect(c, ruta).not.toMatch(/href=["']#["']/));
  });
});

describe('ninguna nota de autor a la vista del cliente', () => {
  it('no se le explica al cliente lo que falta por hacer', () => {
    /*
     * La página de contacto enseñaba un recuadro gris que decía «Aquí puedes
     * incrustar Google Maps». Iba dirigido a quien programa y lo estaba leyendo
     * quien compra.
     */
    cada((c, ruta) => {
      expect(c, ruta).not.toMatch(/Aquí puedes incrustar/i);
      expect(c, ruta).not.toMatch(/Datos de ejemplo/i);
      expect(c, ruta).not.toMatch(/edítalos con los reales/i);
    });
  });
});

describe('emoji como icono', () => {
  /*
   * Un emoji no es un icono: lo dibuja el sistema operativo, cambia de forma
   * entre Windows, Android y iPhone, no hereda el color y un lector de pantalla
   * lo lee en voz alta en mitad de la frase («Hola, ivan, mano saludando»).
   *
   * La deuda que queda está NOMBRADA en lugar de olvidada. Si un fichero nuevo
   * mete emoji, esta prueba se entera; y cuando la Fase 2B rehaga la portada,
   * falla y obliga a quitarlo de la lista. Un aviso que nadie mira no sirve.
   */
  const PENDIENTES = [
    'HomePage.tsx',        // la 2B la rehace entera; tocarla ahora es trabajo tirado
    'AnalyticsDashboard.tsx', // panel de administración, no lo ve ningún cliente
    'ConocenosPage.tsx',   // la estrella forma parte de un «4.8 de valoración
                           // media» que nadie ha medido: es una decisión de
                           // contenido, no un cambio de icono. Ver informe 2A.
  ];
  const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;

  it('el resto del cliente no usa ninguno', () => {
    const conEmoji = FUENTES.filter(([, f]) => EMOJI.test(codigo(f)))
      .map(([r]) => r.split('/').pop() as string);
    expect([...conEmoji].sort()).toEqual([...PENDIENTES].sort());
  });
});
