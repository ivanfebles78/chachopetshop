import { useEffect, useRef, useState } from 'react';
import { esImagenAleatoria, type TipoArte } from '@/lib/imagenes';
import { ArteCategoria } from '@/components/ArteCategoria';

/**
 * GALERÍA DE PRODUCTO.
 *
 * Montada para que el día que lleguen fotografías de verdad ENTREN SOLAS: lo
 * único que cambia es el contenido de `imagenes`. Ninguna medida está atada al
 * número de fotos ni a que sean cuadradas.
 *
 * Las de ahora son de archivo y no tienen nada que ver con lo que se vende
 * —paisajes, cascadas—, así que el texto alternativo NO las describe: decir
 * «foto de Orijen Original Dog» sobre una montaña sería afirmar algo falso a
 * quien no la ve. Se numeran y punto, y la descripción de verdad la lleva el
 * titular de la página, que sí es cierto.
 *
 * En móvil se pasa con el dedo (un carril con anclaje), y en escritorio con las
 * miniaturas. No hay lupa ni visor a pantalla completa: ampliar una foto de
 * archivo a 2000 px no le enseña a nadie nada del producto. Cuando haya
 * fotografía real y con detalle, tendrá sentido; hoy sería una función que
 * existe para parecer completa.
 */

type Props = {
  imagenes: string[];
  /**
   * El tipo de categoría, para dibujar la ilustración cuando no hay fotografía.
   * Ver `lib/imagenes.ts`.
   */
  tipoArte: TipoArte;
  /** Para el texto alternativo y los nombres de los controles. */
  nombre: string;
  /** Se marca la primera como prioritaria: es el elemento grande de la ficha. */
  prioritaria?: boolean;
};

export function Galeria({ imagenes, nombre, tipoArte, prioritaria = true }: Props) {
  /*
   * NI UNA VISTA FALSA.
   *
   * `gallery` trae varias URL de archivo aleatorias. Pintarlas como galería
   * daría tres miniaturas y la sensación de tres fotos del mismo artículo desde
   * ángulos distintos — cuando son tres paisajes sin relación. Si no hay
   * fotografía real, hay UNA ilustración de categoría y ninguna miniatura.
   */
  const fotos = imagenes.filter((u) => !esImagenAleatoria(u));
  const sinFotografia = fotos.length === 0;
  const [activa, setActiva] = useState(0);
  const carril = useRef<HTMLUListElement>(null);
  const total = sinFotografia ? 1 : fotos.length;

  /* Al pasar con el dedo, la miniatura marcada tiene que seguir al carril. */
  useEffect(() => {
    const el = carril.current;
    if (!el || total < 2) return;
    const alDesplazar = () => {
      const i = Math.round(el.scrollLeft / el.clientWidth);
      setActiva((previa) => (i !== previa && i >= 0 && i < total ? i : previa));
    };
    el.addEventListener('scroll', alDesplazar, { passive: true });
    return () => el.removeEventListener('scroll', alDesplazar);
  }, [total]);

  const ir = (i: number) => {
    setActiva(i);
    const el = carril.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  if (total === 0) return null;

  /*
   * Sin fotografía real: una ilustración de categoría, a tamaño completo y sin
   * carril ni miniaturas. No hay nada que pasar y no se finge que lo haya.
   */
  if (sinFotografia) {
    return (
      <div className="overflow-hidden rounded-card border border-edge bg-cream-200">
        <ArteCategoria tipo={tipoArte} className="aspect-square w-full p-10 sm:p-14" />
      </div>
    );
  }

  return (
    <div>
      {/*
        Proporción fija y declarada: el hueco queda reservado antes de que baje
        nada, así que la ficha no da el salto que mueve el botón de comprar
        justo cuando alguien va a pulsarlo.
      */}
      {/*
        El carril se desplaza, así que tiene que poder recibir el foco: quien
        navega con teclado necesita llegar a él para moverlo con las flechas.
        Un contenedor con scroll y sin nada enfocable dentro es contenido al que
        no se puede llegar sin ratón —axe lo marca como fallo grave, y con
        razón—. Con una sola imagen no hay nada que desplazar y no se enfoca.

        Se le pone `tabIndex` y nombre, pero NO `role`: al ponerle `group` en el
        primer intento dejó de ser una lista y sus `<li>` se quedaron huérfanos,
        que es otro fallo distinto. Un `<ul>` con `tabIndex` sigue siendo lista.
      */}
      <ul
        ref={carril}
        {...(total > 1 ? { tabIndex: 0, 'aria-label': `Imágenes de ${nombre}` } : {})}
        className="flex snap-x snap-mandatory list-none gap-0 overflow-x-auto overscroll-x-contain rounded-card border border-edge bg-surface p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {fotos.map((src, i) => (
          <li key={src} className="w-full shrink-0 snap-center">
            <img
              src={src}
              alt={total > 1 ? `${nombre}. Imagen ${i + 1} de ${total}` : nombre}
              width={800}
              height={800}
              /* La primera es lo más grande de la primera pantalla; el resto,
                 aplazadas, para no competir con ella. */
              loading={i === 0 && prioritaria ? undefined : 'lazy'}
              fetchPriority={i === 0 && prioritaria ? 'high' : undefined}
              decoding="async"
              className="aspect-square w-full bg-cream-200 object-contain p-6"
            />
          </li>
        ))}
      </ul>

      {total > 1 && (
        <>
          <ul className="mt-3 flex list-none gap-3 overflow-x-auto p-0">
            {fotos.map((src, i) => (
              <li key={src}>
                <button
                  type="button"
                  onClick={() => ir(i)}
                  aria-label={`Ver la imagen ${i + 1} de ${total}`}
                  /*
                   * `aria-current` y no `aria-pressed`: no es un interruptor que
                   * se queda pulsado, es «de estas tres, ésta es la que se está
                   * viendo», que es exactamente lo que significa `current`.
                   */
                  aria-current={i === activa ? 'true' : undefined}
                  className={`block h-16 w-16 overflow-hidden rounded-control border-2 transition-colors sm:h-20 sm:w-20 ${
                    i === activa ? 'border-brand-600' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={src}
                    alt=""
                    width={160}
                    height={160}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full bg-cream-200 object-contain p-1.5"
                  />
                </button>
              </li>
            ))}
          </ul>
          {/* Quien navega sin ver necesita saber cuál está puesta. */}
          <p className="sr-only" aria-live="polite">
            Imagen {activa + 1} de {total}
          </p>
        </>
      )}
    </div>
  );
}
