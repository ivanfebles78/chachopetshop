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
const TODAS = import.meta.glob(['./**/*.{ts,tsx}', '../tailwind.config.ts'], {
  query: '?raw',
  eager: true,
  import: 'default',
}) as Record<string, string>;

const FUENTES: [string, string][] = Object.entries(TODAS)
  .filter(([ruta]) => !ruta.includes('.test.') && !ruta.includes('tailwind.config'))
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
    // La portada salió de esta lista en la 2B, al rehacerla. Queda el panel de
    // administración, que no ve ningún cliente y va con la deuda de estilos en
    // línea de sus gráficas.
    'AnalyticsDashboard.tsx',
  ];
  const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;

  it('el resto del cliente no usa ninguno', () => {
    const conEmoji = FUENTES.filter(([, f]) => EMOJI.test(codigo(f)))
      .map(([r]) => r.split('/').pop() as string);
    expect([...conEmoji].sort()).toEqual([...PENDIENTES].sort());
  });
});

/* ══ Nada que no se pueda sostener ═════════════════════════════════════ */

describe('ninguna afirmación sin respaldo', () => {
  it('no se publica ninguna nota de valoración', () => {
    /*
     * «4.8★ · Valoración media» estuvo publicado en «Conócenos». Nadie había
     * medido esa cifra: no hay tabla de reseñas ni perfil conectado. La Fase 1
     * ya había quitado por lo mismo el `rating` de cada producto, pero esta se
     * quedó en otra página, que es lo que pasa cuando la comprobación mira
     * ficheros sueltos en vez de todo.
     *
     * Además de engañar a quien compra, afirmar valoraciones que no vienen de
     * compradores reales es una práctica prohibida por la Directiva Ómnibus
     * (UE) 2019/2161 — RDL 24/2021 en España.
     *
     * El hueco sigue montado en `lib/valoraciones.ts`: en cuanto haya una
     * fuente verificable, la nota sale sola.
     */
    for (const [ruta, fuente] of FUENTES) {
      if (ruta.includes('valoraciones')) continue;
      const c = codigo(fuente);
      expect(c, ruta).not.toMatch(/[0-9][.,][0-9]\s*(?:★|estrellas)/i);
      expect(c, ruta).not.toMatch(/valoración\s+media/i);
    }
  });

  it('no se inventan recuentos de clientes ni de catálogo', () => {
    // «+12.000 mascotas felices» (nadie las contó) y «+40 marcas premium»
    // (el catálogo tiene 12). Las cifras que quedan salen de los datos.
    for (const [ruta, fuente] of FUENTES) {
      const c = codigo(fuente);
      expect(c, ruta).not.toMatch(/\+\s?\d{1,3}[.,]\d{3}/);
      expect(c, ruta).not.toMatch(/mascotas felices/i);
      expect(c, ruta).not.toMatch(/\+\s?\d+\s*(?:marcas|años|clientes)/i);
    }
  });

  it('no se promete ningún descuento que nadie pueda aplicar', () => {
    /*
     * La portada ofrecía «un 10% en tu primer pedido» dentro de un formulario
     * de suscripción cuyo `onSubmit` era `e.preventDefault()`: no había
     * infraestructura de newsletter, ni endpoint, ni forma de canjear nada.
     * El correo del cliente se tiraba en silencio.
     */
    for (const [ruta, fuente] of FUENTES) {
      const c = codigo(fuente);
      expect(c, ruta).not.toMatch(/\d+\s?%\s+(?:de\s+)?(?:descuento|dto)/i);
      expect(c, ruta).not.toMatch(/en tu primer pedido/i);
    }
  });

  it('los datos de contacto salen del módulo, no escritos a mano', () => {
    for (const [ruta, fuente] of FUENTES) {
      if (ruta.includes('empresa')) continue;
      const c = codigo(fuente);
      // Un correo o un `tel:` literal en una página es un dato duplicado que
      // el día que cambie se quedará atrás en algún sitio.
      expect(c, ruta).not.toMatch(/href=["'](?:mailto|tel):[^"'{]/);
    }
  });
});

/* ══ Una animación no puede esconder contenido ═════════════════════════ */

describe('el movimiento nunca oculta nada', () => {
  const config = (TODAS['../tailwind.config.ts'] ?? TODAS['./../tailwind.config.ts']) as string | undefined;

  it('la animación de entrada del contenido no toca la opacidad', () => {
    /*
     * Regla ganada a base de encontrarse lo mismo tres veces.
     *
     * 1. `framer-motion` con `initial={{opacity:0}}` + `whileInView`: tarjetas
     *    de producto a plena vista y con opacidad 0, para siempre.
     * 2. Al pasarlo a CSS con `fill-mode: both`: el primer fotograma se queda
     *    fijo mientras la animación no arranca.
     * 3. Y arrancar no basta: el reloj de las animaciones sólo avanza mientras
     *    el documento se pinta. En una pestaña en segundo plano se queda en 0,
     *    aplicando el primer fotograma. Catorce elementos de «Conócenos» —el
     *    titular incluido— salían a opacidad 0.
     *
     * De ahí la regla: `slide-up`, que es la que envuelve CONTENIDO, anima
     * sólo la posición. Lo peor que puede pasar es que algo aparezca sin
     * deslizarse.
     */
    const fuente = config ?? '';
    expect(fuente, 'no se ha podido leer tailwind.config.ts').not.toBe('');

    const bloque = /'slide-up':\s*\{[\s\S]*?\n\s{8}\},/.exec(fuente)?.[0] ?? '';
    expect(bloque, 'no se encuentra el keyframe slide-up').not.toBe('');
    expect(bloque).not.toMatch(/opacity/);
  });

  it('lo que envuelve contenido usa `slide-up`, no `fade-in`', () => {
    // `fade-in` sí anima opacidad, y por eso queda reservada al velo del
    // carrito, que es decoración: si no se atenúa, no se pierde nada.
    const reveal = FUENTES.find(([r]) => r.endsWith('Reveal.tsx'))?.[1] ?? '';
    expect(reveal).toMatch(/animate-slide-up/);
    expect(reveal).not.toMatch(/animate-fade-in/);
  });
});
