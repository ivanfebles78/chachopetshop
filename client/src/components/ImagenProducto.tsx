import type { Product } from '@/lib/types';
import { esImagenAleatoria, origenDeImagen, textoAlternativo } from '@/lib/imagenes';
import { ArteCategoria } from './ArteCategoria';

/**
 * LA IMAGEN DE UN PRODUCTO, EN UN SOLO SITIO.
 *
 * Antes cada superficie pintaba su propio `<img src={product.image}>`: la
 * tarjeta, la ficha, el carrito, la confirmación y «Mis pedidos». Cinco copias
 * de la misma decisión, y por eso las cinco enseñaban la misma cascada de
 * `picsum.photos`. Con un único componente, el día que Ivan suba sus fotos
 * cambia una cosa y cambian las cinco.
 *
 * Decide entre FOTO e ILUSTRACIÓN según `lib/imagenes.ts`, y nada más: no
 * recorta, no impone tamaño y no elige el marco. Eso es de quien lo usa.
 */

type Props = {
  product: Pick<Product, 'name' | 'image' | 'categories'>;
  className?: string;
  /**
   * `eager` sólo para la imagen que domina la primera pantalla. El resto
   * perezosas: veintiocho fotos a la vez es exactamente cómo se arruina la
   * métrica de carga por arreglar la parte visual.
   */
  prioridad?: boolean;
  /** Ancho y alto reservados. Sin esto la rejilla salta al cargar (CLS). */
  lado?: number;
};

export function ImagenProducto({ product, className, prioridad = false, lado = 800 }: Props) {
  const origen = origenDeImagen(product);

  if (origen.clase === 'ilustracion') {
    /*
     * La ilustración va EN LÍNEA, no como `<img src="...svg">`.
     *
     * Así no hay una petición más por tarjeta, hereda los colores de la marca
     * por variables CSS, y no puede fallar la carga y dejar un hueco roto.
     * Además no necesita `loading="lazy"`: no hay nada que descargar.
     */
    return <ArteCategoria tipo={origen.tipo} className={className} />;
  }

  return (
    <img
      src={origen.src}
      alt={textoAlternativo(product)}
      width={lado}
      height={lado}
      loading={prioridad ? 'eager' : 'lazy'}
      // `fetchPriority` alta sólo en la que decide la métrica de carga.
      fetchPriority={prioridad ? 'high' : undefined}
      decoding="async"
      className={className}
    />
  );
}

/**
 * La miniatura de una LÍNEA (carrito, confirmación, «Mis pedidos»).
 *
 * Esas líneas guardan sólo la URL de la imagen, no la categoría: se copian al
 * carrito en el momento de añadir y no arrastran la taxonomía. Así que cuando
 * la URL es una foto de archivo al azar se dibuja la huella genérica, que no
 * dice nada falso, en vez de una cascada.
 *
 * Es una degradación consciente: la huella es menos informativa que el saco de
 * pienso, pero el carrito ya lleva el nombre y el formato al lado. Meter la
 * categoría en cada línea del carrito para afinar el dibujo sería complicar el
 * almacén por un detalle decorativo.
 */
export function MiniaturaLinea({
  src,
  className,
  lado = 64,
}: {
  src?: string | null;
  className?: string;
  lado?: number;
}) {
  if (esImagenAleatoria(src)) {
    return <ArteCategoria tipo="OTRO" className={className} />;
  }
  return (
    <img
      src={src as string}
      alt=""
      width={lado}
      height={lado}
      loading="lazy"
      decoding="async"
      className={className}
    />
  );
}
