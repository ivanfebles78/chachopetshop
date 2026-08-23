import type { Config } from 'tailwindcss';

/**
 * SISTEMA VISUAL DE CHACHO PET SHOP.
 *
 * La paleta de marca ya existía y era coherente —azul marino del logo, dorado,
 * azul claro, papel cálido— así que se CONSERVA. Lo que faltaba no era color:
 * era decir qué significa cada cosa y cuándo se usa.
 *
 * Lo que se añade:
 *   · roles semánticos, para que una pantalla pida «superficie» o «texto
 *     atenuado» en vez de elegir un `brand-900/60` a ojo (había 235 opacidades
 *     distintas escogidas una por una);
 *   · una escala tipográfica, en vez de un `text-*` improvisado por bloque;
 *   · TRES radios en lugar de cinco, con una regla para cada uno;
 *   · dos niveles de elevación, no tres.
 *
 * Lo que NO se hace: sustituir la marca por un gris de panel corporativo. Esto
 * es una tienda de animales, y tiene que parecerlo.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },

      colors: {
        /* ── Marca (se conserva tal cual) ──────────────────────────────── */
        cream: { DEFAULT: '#f6f8fc', 50: '#fbfcfe', 100: '#f6f8fc', 200: '#e7edf7' },
        brand: {
          50: '#eef3fb', 100: '#d7e3f6', 200: '#adc4ec', 300: '#7d9fdd',
          400: '#4a72c6', 500: '#274ea3', 600: '#16307a', 700: '#112860',
          800: '#0d1f4b', 900: '#0a1839', 950: '#060f26',
        },
        /*
         * El amarillo de la marca. Los tres tonos claros son para FONDOS y para
         * texto sobre el azul oscuro (ahí llegan a 6.5-9.7). Como texto sobre
         * fondo claro no sirve ninguno: `text-amber-600` daba 2.09 sobre blanco,
         * menos de la mitad del mínimo. Para eso está el 700.
         *
         * Faltaban además el 50 y el 700, y estaban ESCRITOS en el código
         * (`bg-amber-50`, `text-amber-700`): Tailwind no genera lo que no
         * existe, así que esas clases no pintaban nada y nadie se enteraba.
         */
        amber: {
          50: '#fff8e6',   // fondo tenue
          400: '#ffce3a',
          500: '#ffc20e',
          600: '#e0a300',  // sólo fondo, o texto sobre azul oscuro
          700: '#8a6300',  // el único legible como texto sobre claro (4.97)
        },
        sky: { 400: '#3aa9e6', 500: '#1f97dd', 600: '#1580c2' },
        ink: '#0c1533',

        /*
         * ── Roles semánticos ──────────────────────────────────────────
         *
         * Se declaran como valores literales, no como referencias a la escala
         * de arriba, para que se puedan leer de un vistazo y no haya que seguir
         * una cadena de alias para saber de qué color se está hablando.
         *
         * `muted` y `subtle` sustituyen a la costumbre de escribir
         * `text-brand-900/60`: el mismo gris azulado, pero con nombre y una
         * sola definición.
         */
        surface: {
          DEFAULT: '#ffffff',  // tarjetas y paneles
          sunken: '#f1f5fb',   // fondos hundidos, filas alternas
          raised: '#ffffff',   // superficie elevada sobre otra superficie
        },
        content: {
          DEFAULT: '#0c1533',  // texto principal
          muted: '#4a5670',    // texto secundario  (antes brand-900/60)
          /*
           * Este gris era #7b8499 y NO LLEGABA a AA: 3.43 sobre el fondo
           * hundido, cuando el mínimo es 4.5. Lo verificó axe sobre la página
           * ya montada, no una revisión a ojo —a ojo un gris claro parece
           * «suave», y suave y legible no son lo mismo—. Se oscurece hasta
           * 4.93 sin dejar de ser el tercer nivel: 16.4 / 6.7 / 4.9.
           */
          subtle: '#616a82',   // texto terciario   (antes brand-900/40)
          inverse: '#f6f8fc',  // sobre fondo oscuro
        },
        edge: {
          DEFAULT: '#e2e8f2',  // borde estándar    (antes brand-900/10)
          strong: '#c8d2e4',   // borde marcado
          subtle: '#eef2f8',   // separador tenue   (antes brand-900/[0.06])
        },
        /*
         * Estado. El verde NUNCA es color de acción: sólo dice «ha ido bien».
         *
         * Cada `DEFAULT` llega a 4.5 SOBRE SU PROPIO `subtle`, que es donde se
         * usa de verdad (texto oscuro sobre su fondo tenue). `warning` estaba
         * en 4.28 e `info` en 3.80: los dos fallaban, y el aviso que no se lee
         * es justo el que peor sienta. Se han oscurecido.
         */
        success: { DEFAULT: '#1d7a4f', subtle: '#e8f4ee', border: '#a9d9c1' }, // 4.71
        warning: { DEFAULT: '#8d6207', subtle: '#fdf4e0', border: '#eccb85' }, // 4.94 (antes 4.28)
        danger: { DEFAULT: '#a32723', subtle: '#fbeceb', border: '#e8b4b1' },  // 6.37
        info: { DEFAULT: '#146fa8', subtle: '#e7f3fb', border: '#a6d5ef' },    // 4.81 (antes 3.80)
        /*
         * «En camino». Entra en la Fase 2E con el ciclo de vida del pedido:
         * hacían falta seis estados distinguibles y sólo había cuatro tonos.
         *
         * Verde azulado y no verde a secas, para que «enviado» y «entregado» no
         * se confundan de un vistazo. Medido: 4.84 sobre su fondo tenue, por
         * encima del 4.5 que exige AA. Aun así el color nunca informa solo: cada
         * estado lleva su palabra y su icono.
         */
        transito: { DEFAULT: '#0f766e', subtle: '#e6f4f2', border: '#9fd3cd' },  // 4.84
      },

      /*
       * ── Tipografía ────────────────────────────────────────────────────
       * Fluida entre móvil y escritorio, para no tener que repetir
       * `text-2xl sm:text-4xl` en cada titular.
       */
      fontSize: {
        'display-lg': ['clamp(2.25rem, 1.6rem + 3.2vw, 3.75rem)', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'display': ['clamp(1.875rem, 1.4rem + 2.4vw, 3rem)', { lineHeight: '1.08', letterSpacing: '-0.02em' }],
        'title': ['clamp(1.375rem, 1.15rem + 1.1vw, 1.875rem)', { lineHeight: '1.15', letterSpacing: '-0.01em' }],
        'heading': ['1.125rem', { lineHeight: '1.3', letterSpacing: '-0.005em' }],
        'body-lg': ['1.0625rem', { lineHeight: '1.6' }],
        'body': ['0.9375rem', { lineHeight: '1.6' }],
        'body-sm': ['0.875rem', { lineHeight: '1.55' }],
        'caption': ['0.8125rem', { lineHeight: '1.45' }],
        'overline': ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.08em' }],
      },

      /*
       * ── Radio ─────────────────────────────────────────────────────────
       * Tres, con una regla cada uno. Antes había cinco escalas repartidas en
       * 139 usos sin criterio, y `rounded-full` puesto en tarjetas.
       *
       *   control  botones, campos, celdas
       *   card     tarjetas, paneles, diálogos
       *   pill     SÓLO chips, insignias y botones de icono redondos
       */
      borderRadius: {
        control: '0.625rem',
        card: '1rem',
        pill: '9999px',

        /*
         * OBSOLETOS. Se conservan porque Home, Catálogo, Ficha y Panel todavía
         * los usan 44 veces, y esas pantallas se rediseñan en 2B–2D. Quitarlos
         * ahora las dejaría sin radio: una regresión visual en pantallas que
         * esta fase ni siquiera abre.
         *
         * No usar en código nuevo. Desaparecen cuando la última pantalla migre.
         */
        '4xl': '2rem',
        '5xl': '2.5rem',
      },

      /*
       * ── Elevación ─────────────────────────────────────────────────────
       * Dos niveles. `glow` se retira: no se usaba en ninguna parte.
       */
      boxShadow: {
        rest: '0 1px 2px -1px rgba(12,22,58,0.06), 0 2px 8px -2px rgba(12,22,58,0.08)',
        raised: '0 4px 12px -4px rgba(12,22,58,0.12), 0 12px 28px -8px rgba(12,22,58,0.14)',

        /* Obsoletos, por el mismo motivo que los radios de arriba. */
        soft: '0 1px 2px -1px rgba(12,22,58,0.06), 0 2px 8px -2px rgba(12,22,58,0.08)',
        lift: '0 4px 12px -4px rgba(12,22,58,0.12), 0 12px 28px -8px rgba(12,22,58,0.14)',
      },

      /* Ritmo vertical de sección, para que cada bloque no invente su `py-*`. */
      spacing: {
        'section-sm': 'clamp(2rem, 1.5rem + 2vw, 3rem)',
        'section': 'clamp(3rem, 2rem + 4vw, 5rem)',
        'section-lg': 'clamp(4rem, 2.5rem + 6vw, 7rem)',
      },

      /*
       * ── Movimiento ────────────────────────────────────────────────────
       * Sólo lo que comunica algo: abrir, cerrar, cambiar de estado.
       *
       * Se retiran `blob`, `float` y `marquee`. Las tres eran decorativas: dos
       * manchas de color flotando en la portada y una tira de marcas
       * desplazándose sola, que además impide leer los nombres de las marcas.
       */
      keyframes: {
        /*
         * Ésta sí usa opacidad, y puede: la lleva sólo el VELO del carrito, que
         * es decorativo. Si se quedara a 0 no se oscurecería el fondo y ya está;
         * no hay nada que leer debajo.
         */
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        /*
         * SIN OPACIDAD, y esto es lo importante.
         *
         * Mientras una animación está en marcha manda ELLA, no el `fill-mode`:
         * en el instante 0 aplica su primer fotograma. Y el reloj de las
         * animaciones sólo avanza mientras el documento se pinta —en una
         * pestaña en segundo plano se queda parado en 0—. Con un primer
         * fotograma de `opacity: 0`, eso significa contenido invisible durante
         * todo ese rato: se comprobó, catorce elementos de «Conócenos», el
         * titular incluido, con opacidad 0 y el reloj congelado.
         *
         * Animando sólo la posición, el peor caso es que el texto aparezca sin
         * deslizarse. El contenido no depende de que la animación corra.
         */
        'slide-up': {
          from: { transform: 'translateY(8px)' },
          to: { transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },

      },
      /*
       * `forwards`, NUNCA `both`. La diferencia parece de matiz y no lo es.
       *
       * `both` incluye `backwards`, que aplica el PRIMER fotograma mientras la
       * animación aún no ha empezado. Y el primer fotograma de éstas es
       * `opacity: 0` —o, en el cajón, estar fuera de la pantalla—. Si por lo
       * que sea la animación no llega a arrancar —la pestaña se abrió en
       * segundo plano y no se ha pintado, el subarbol está fuera de vista, una
       * extensión las desactiva— ese primer fotograma se queda fijo y el
       * contenido no aparece JAMÁS.
       *
       * Se comprobó: con `both`, catorce elementos de «Conócenos» —titular,
       * texto e historia— seguían a opacidad 0 pasados dos segundos y medio.
       *
       * Con `forwards`, antes de empezar el elemento se ve normal y al terminar
       * se queda en el último fotograma. Como mucho se pierde la animación; no
       * se pierde el contenido. Una animación no puede esconder nada.
       */
      animation: {
        'fade-in': 'fade-in 150ms ease-out forwards',
        'slide-up': 'slide-up 180ms cubic-bezier(0.16,1,0.3,1) forwards',
        'slide-in-right': 'slide-in-right 220ms cubic-bezier(0.16,1,0.3,1) forwards',
      },
    },
  },
  plugins: [],
} satisfies Config;
