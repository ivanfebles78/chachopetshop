import type { ReactNode } from 'react';

/**
 * Aparición suave, HECHA CON CSS.
 *
 * Antes esto era `framer-motion` con `initial={{opacity:0}}` y `whileInView`:
 * el contenido nacía invisible y sólo se veía si la biblioteca decidía que
 * había entrado en pantalla. Cuando eso falla —y en este proyecto falla— queda
 * contenido a opacidad 0 en mitad de la pantalla, para siempre. Se comprobó en
 * el navegador: tarjetas de producto totalmente a la vista y con `opacity: 0`.
 *
 * Aquí envolvía, entre otras cosas, el FORMULARIO DE CONTACTO.
 *
 * La regla que sale de esto: nada que el cliente tenga que ver puede depender
 * de que una animación se ejecute. Una animación de CSS siempre termina —y con
 * `prefers-reduced-motion` termina en el primer fotograma—, así que el estado
 * final, visible, está garantizado.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  /** Segundos de retraso, para escalonar un grupo. */
  delay?: number;
  className?: string;
}) {
  return (
    <div
      className={`animate-slide-up ${className ?? ''}`}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}
