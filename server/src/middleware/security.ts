import type { RequestHandler } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { isProd, isTest } from '../env.js';

/**
 * CABECERAS DE SEGURIDAD Y LÍMITES DE PETICIONES.
 *
 * En producción no había NINGUNA cabecera: ni CSP, ni HSTS, ni
 * X-Frame-Options, ni X-Content-Type-Options, ni Referrer-Policy. Comprobado
 * contra el servicio real. Cualquiera podía meter la tienda en un iframe y
 * montar un clickjacking sobre el botón de comprar.
 *
 * Tampoco había ningún límite de peticiones: `/api/auth/login` admitía fuerza
 * bruta y `/api/contact` inundación, sin coste para quien lo hiciera.
 */

/* ── Orígenes externos que la aplicación necesita de verdad ──────────────
 *
 * La CSP se construye a partir de lo que el código USA, no de una plantilla
 * copiada. Cada origen de aquí está justificado:
 *
 *   Stripe            el checkout redirige a checkout.stripe.com; el SDK del
 *                     navegador y sus llamadas van a js.stripe.com y api.stripe.com
 *   Google Fonts      index.html carga la hoja y los ficheros de fuente
 *                     (pendiente: autoalojarlas, ver informe)
 *   picsum.photos     TODAS las imágenes de producto salen de ahí hoy
 *                     (marcadores de posición; desaparecerán con la fotografía real)
 *   data: y blob:     iconos en línea y vistas previas locales
 */
const STRIPE_SCRIPTS = ['https://js.stripe.com'];
const STRIPE_FRAMES = ['https://js.stripe.com', 'https://hooks.stripe.com', 'https://checkout.stripe.com'];
const STRIPE_CONNECT = ['https://api.stripe.com'];
const FUENTES_ESTILO = ['https://fonts.googleapis.com'];
const FUENTES_FICHERO = ['https://fonts.gstatic.com'];
const IMAGENES = ['https://picsum.photos', 'https://fastly.picsum.photos', 'data:', 'blob:'];

export const cabecerasDeSeguridad: RequestHandler = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'", ...STRIPE_SCRIPTS],
      /*
       * `unsafe-inline` en estilos, y sólo en estilos.
       *
       * Es una concesión real y conviene que quede escrita: Tailwind no la
       * necesita —compila a un fichero—, pero el proyecto usa `style={{…}}` en
       * varios sitios (el panel de analítica, sobre todo) y React los emite como
       * atributos `style` en línea. Sin esto, esas pantallas se rompen.
       *
       * Se retirará cuando la Fase 2 sustituya esos estilos en línea. No se
       * concede en `script-src`, que es donde de verdad duele.
       */
      styleSrc: ["'self'", "'unsafe-inline'", ...FUENTES_ESTILO],
      fontSrc: ["'self'", ...FUENTES_FICHERO],
      imgSrc: ["'self'", ...IMAGENES],
      connectSrc: ["'self'", ...STRIPE_CONNECT],
      frameSrc: STRIPE_FRAMES,
      // Sustituye a X-Frame-Options y es lo que impide el clickjacking.
      frameAncestors: ["'none'"],
      formAction: ["'self'", 'https://checkout.stripe.com'],
      upgradeInsecureRequests: isProd ? [] : null,
    },
  },
  // Sólo tiene sentido sobre HTTPS; en local estorba y puede fijar el navegador.
  hsts: isProd ? { maxAge: 31_536_000, includeSubDomains: true, preload: false } : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false, // rompería las imágenes de terceros
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

/**
 * Límites de peticiones.
 *
 * Se desactivan en las pruebas: una suite que dispara cien peticiones seguidas
 * empezaría a recibir 429 y fallaría por el límite, no por el código.
 */
const limitador = (opciones: { windowMs: number; limit: number; message: string }) =>
  isTest
    ? ((_req, _res, next) => next()) as RequestHandler
    : rateLimit({
        windowMs: opciones.windowMs,
        limit: opciones.limit,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: { error: opciones.message },
      });

/** Acceso: lo justo para no molestar a quien se equivoca de contraseña. */
export const limiteAutenticacion = limitador({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: 'Demasiados intentos. Espera unos minutos antes de volver a probar.',
});

/** Contacto: el buzón lo lee una persona; sin esto se puede inundar. */
export const limiteContacto = limitador({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: 'Has enviado varios mensajes seguidos. Inténtalo de nuevo más tarde.',
});

/** Checkout: cada intento crea un pedido y RETIENE existencias. */
export const limiteCheckout = limitador({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  message: 'Demasiados intentos de compra seguidos. Espera un momento.',
});

/** Resto de la API: techo amplio, sólo contra abuso automatizado. */
export const limiteGeneral = limitador({
  windowMs: 60 * 1000,
  limit: 300,
  message: 'Demasiadas peticiones.',
});
