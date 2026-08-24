import type { TipoArte } from '@/lib/imagenes';
import { DESCRIPCION_ARTE } from '@/lib/imagenes';

/**
 * ILUSTRACIÓN DE CATEGORÍA.
 *
 * Lo que se pinta cuando un producto no tiene fotografía propia. Ver
 * `lib/imagenes.ts` para el porqué de dibujar en vez de traer una foto de
 * archivo.
 *
 * ── Decisiones de dibujo ───────────────────────────────────────────────────
 *
 * · Un solo lenguaje: siluetas planas, sin degradados, sin sombras, esquinas
 *   redondeadas y dos colores de marca sobre crema. Veintiocho fichas con el
 *   mismo lenguaje se leen como un catálogo; veintiocho fotos de bancos
 *   distintos se leen como un collage.
 * · Cada forma es RECONOCIBLE a 80 px, que es el tamaño al que se ve en el
 *   carrito. Nada de detalles que se conviertan en ruido al encoger.
 * · Los colores salen de la paleta ya existente (`brand`, `amber`, `cream`).
 *   Esto no introduce una identidad nueva: usa la que hay.
 *
 * ── Accesibilidad ──────────────────────────────────────────────────────────
 *
 * El SVG lleva `role="img"` y un `<title>` que describe LO QUE SE VE, no el
 * producto. Repetir ahí el nombre del producto haría creer a quien usa un
 * lector de pantalla que está mirando ese artículo, y lo que hay es un dibujo
 * genérico. El nombre ya está en el enlace contiguo.
 */

const TRAZO = 'var(--arte-trazo, #16307a)';   // brand-600
const RELLENO = 'var(--arte-relleno, #adc4ec)'; // brand-200
const ACENTO = 'var(--arte-acento, #ffce3a)';  // amber-400

type Props = { tipo: TipoArte; className?: string };

/** Fondo común: un círculo suave que centra la forma y unifica la rejilla. */
function Lienzo({ children }: { children: React.ReactNode }) {
  return (
    <>
      <circle cx="100" cy="100" r="74" fill="var(--arte-fondo, #e7edf7)" />
      {children}
    </>
  );
}

const FORMAS: Record<TipoArte, React.ReactNode> = {
  /* Saco de pienso: fuelle arriba, cuerpo ancho, croquetas cayendo. */
  DRY_FOOD: (
    <Lienzo>
      <path
        d="M74 66h52a6 6 0 0 1 6 6v66a10 10 0 0 1-10 10H78a10 10 0 0 1-10-10V72a6 6 0 0 1 6-6Z"
        fill={RELLENO}
        stroke={TRAZO}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path d="M74 66c6-8 14-12 26-12s20 4 26 12" fill="none" stroke={TRAZO} strokeWidth="5" strokeLinecap="round" />
      <rect x="84" y="92" width="32" height="24" rx="5" fill={ACENTO} />
      <circle cx="100" cy="132" r="5" fill={TRAZO} />
      <circle cx="86" cy="132" r="4" fill={TRAZO} opacity="0.55" />
      <circle cx="114" cy="132" r="4" fill={TRAZO} opacity="0.55" />
    </Lienzo>
  ),

  /* Lata: cilindro con anilla. */
  WET_FOOD: (
    <Lienzo>
      <rect x="64" y="74" width="72" height="58" rx="8" fill={RELLENO} stroke={TRAZO} strokeWidth="5" />
      <ellipse cx="100" cy="74" rx="36" ry="11" fill="var(--arte-fondo, #e7edf7)" stroke={TRAZO} strokeWidth="5" />
      <circle cx="100" cy="74" r="8" fill="none" stroke={TRAZO} strokeWidth="4" />
      <rect x="64" y="94" width="72" height="16" fill={ACENTO} />
      <path d="M64 132c0 6 16 10 36 10s36-4 36-10" fill="none" stroke={TRAZO} strokeWidth="5" />
    </Lienzo>
  ),

  /* Premios: un hueso y dos galletas. */
  SNACKS: (
    <Lienzo>
      <path
        d="M70 92a11 11 0 1 1 8-18 11 11 0 0 1 20 0 11 11 0 0 1 8 18l-8 6-20 0-8-6Z"
        fill={ACENTO}
        stroke={TRAZO}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <rect x="78" y="88" width="26" height="14" rx="7" fill={ACENTO} stroke={TRAZO} strokeWidth="5" />
      <circle cx="122" cy="118" r="18" fill={RELLENO} stroke={TRAZO} strokeWidth="5" />
      <circle cx="118" cy="114" r="3" fill={TRAZO} />
      <circle cx="128" cy="122" r="3" fill={TRAZO} />
      <circle cx="82" cy="128" r="14" fill={RELLENO} stroke={TRAZO} strokeWidth="5" />
    </Lienzo>
  ),

  /* Champú: bote con dosificador y burbujas. */
  HYGIENE: (
    <Lienzo>
      <rect x="76" y="86" width="48" height="62" rx="9" fill={RELLENO} stroke={TRAZO} strokeWidth="5" />
      <rect x="90" y="66" width="20" height="20" rx="4" fill={TRAZO} />
      <path d="M110 72h14a6 6 0 0 1 6 6v6" fill="none" stroke={TRAZO} strokeWidth="5" strokeLinecap="round" />
      <rect x="86" y="104" width="28" height="20" rx="4" fill={ACENTO} />
      <circle cx="140" cy="70" r="7" fill="none" stroke={TRAZO} strokeWidth="4" />
      <circle cx="152" cy="88" r="4.5" fill="none" stroke={TRAZO} strokeWidth="4" />
    </Lienzo>
  ),

  /* Comedero: dos cuencos. */
  ACCESSORIES: (
    <Lienzo>
      <path d="M56 100h60l-8 34a10 10 0 0 1-10 8H74a10 10 0 0 1-10-8L56 100Z" fill={RELLENO} stroke={TRAZO} strokeWidth="5" strokeLinejoin="round" />
      <ellipse cx="86" cy="100" rx="30" ry="9" fill="var(--arte-fondo, #e7edf7)" stroke={TRAZO} strokeWidth="5" />
      <path d="M108 112h44l-6 26a9 9 0 0 1-9 7h-14a9 9 0 0 1-9-7l-6-26Z" fill={ACENTO} stroke={TRAZO} strokeWidth="5" strokeLinejoin="round" />
      <ellipse cx="130" cy="112" rx="22" ry="7" fill="var(--arte-fondo, #e7edf7)" stroke={TRAZO} strokeWidth="5" />
    </Lienzo>
  ),

  /* Suplemento: bote de pastillas con cruz suave. */
  SUPPLEMENTS: (
    <Lienzo>
      <rect x="70" y="82" width="60" height="66" rx="9" fill={RELLENO} stroke={TRAZO} strokeWidth="5" />
      <rect x="80" y="64" width="40" height="20" rx="5" fill={TRAZO} />
      <rect x="92" y="104" width="16" height="24" rx="3" fill={ACENTO} />
      <rect x="84" y="112" width="32" height="8" rx="3" fill={ACENTO} />
      <circle cx="142" cy="128" r="12" fill={ACENTO} stroke={TRAZO} strokeWidth="5" />
    </Lienzo>
  ),

  /* Dieta veterinaria: envase con una cruz clínica. */
  VET_DIET: (
    <Lienzo>
      <path d="M72 70h56a6 6 0 0 1 6 6v62a10 10 0 0 1-10 10H76a10 10 0 0 1-10-10V76a6 6 0 0 1 6-6Z" fill={RELLENO} stroke={TRAZO} strokeWidth="5" strokeLinejoin="round" />
      <rect x="92" y="94" width="16" height="40" rx="4" fill={TRAZO} />
      <rect x="80" y="106" width="40" height="16" rx="4" fill={TRAZO} />
      <path d="M72 70c6-7 14-11 28-11s22 4 28 11" fill="none" stroke={TRAZO} strokeWidth="5" strokeLinecap="round" />
    </Lienzo>
  ),

  /* Cama: cojín ovalado con reborde. */
  BEDS: (
    <Lienzo>
      <ellipse cx="100" cy="126" rx="58" ry="26" fill={RELLENO} stroke={TRAZO} strokeWidth="5" />
      <ellipse cx="100" cy="118" rx="42" ry="17" fill={ACENTO} stroke={TRAZO} strokeWidth="5" />
      <path d="M42 126c0-16 26-28 58-28s58 12 58 28" fill="none" stroke={TRAZO} strokeWidth="5" strokeLinecap="round" />
    </Lienzo>
  ),

  /* Transportín: caja con asa y rejilla. */
  TRAVEL: (
    <Lienzo>
      <rect x="56" y="84" width="88" height="62" rx="12" fill={RELLENO} stroke={TRAZO} strokeWidth="5" />
      <path d="M84 84c0-10 7-16 16-16s16 6 16 16" fill="none" stroke={TRAZO} strokeWidth="5" strokeLinecap="round" />
      <rect x="98" y="96" width="38" height="38" rx="7" fill={ACENTO} stroke={TRAZO} strokeWidth="5" />
      <path d="M110 96v38M122 96v38" stroke={TRAZO} strokeWidth="4" />
      <circle cx="76" cy="112" r="8" fill={TRAZO} />
    </Lienzo>
  ),

  /* Genérico: una huella. Si aparece una categoría nueva, no se rompe nada. */
  OTRO: (
    <Lienzo>
      <ellipse cx="100" cy="122" rx="26" ry="22" fill={RELLENO} stroke={TRAZO} strokeWidth="5" />
      <ellipse cx="74" cy="92" rx="11" ry="14" fill={ACENTO} stroke={TRAZO} strokeWidth="5" />
      <ellipse cx="94" cy="80" rx="11" ry="14" fill={ACENTO} stroke={TRAZO} strokeWidth="5" />
      <ellipse cx="116" cy="84" rx="11" ry="14" fill={ACENTO} stroke={TRAZO} strokeWidth="5" />
      <ellipse cx="132" cy="102" rx="10" ry="13" fill={ACENTO} stroke={TRAZO} strokeWidth="5" />
    </Lienzo>
  ),
};

export function ArteCategoria({ tipo, className }: Props) {
  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label={DESCRIPCION_ARTE[tipo]}
      className={className}
      /*
       * `preserveAspectRatio` por defecto ya centra y encaja sin deformar. Se
       * deja explícito porque la tarjeta lo estira a un cuadrado y una silueta
       * deformada delata al instante que la imagen es de relleno.
       */
      preserveAspectRatio="xMidYMid meet"
    >
      {FORMAS[tipo]}
    </svg>
  );
}
