import {
  Bone,
  Sparkles,
  Package,
  ShieldCheck,
  Tag,
  Phone,
  Dog,
  Cat,
  Rabbit,
  type LucideIcon,
} from 'lucide-react';

/**
 * EL MENÚ SUPERIOR — ESTRUCTURA FIJA Y CURADA (no sale del catálogo).
 *
 * A diferencia del menú anterior (que se construía contando productos), este es
 * el árbol comercial que decide la tienda. Los enlaces de las hojas son el mejor
 * destino disponible HOY (filtros del catálogo); el contenido fino de cada
 * sección se irá afinando después, una por una.
 *
 * Regla de apertura (ver `MenuPrincipal`): el panel de primer nivel baja desde
 * la barra; cualquier submenú con hijos se abre HACIA LA DERECHA, nunca hacia
 * abajo.
 */
export type ItemMenu = {
  etiqueta: string;
  /** Destino. Ausente en los grupos que sólo despliegan. */
  href?: string;
  /** Icono, sólo en el primer nivel (la barra). */
  icono?: LucideIcon;
  /** Icono pequeño opcional para un hijo (p. ej. el animal). */
  iconoHijo?: LucideIcon;
  hijos?: ItemMenu[];
};

const F = (animal: string) => (slug: string) => `/tienda?animal=${animal}&category=${slug}`;
const porPerro = F('perro');
const porGato = F('gato');

/**
 * Un enlace a la categoría «accesorios» con una LÍNEA ya seleccionada. La línea
 * es el valor exacto del atributo `line` (jaulas, camas…), así que va codificado.
 */
const porLinea = (linea: string) =>
  `/tienda?category=accesorios&line=${encodeURIComponent(linea)}`;

/** Las cuatro categorías de alimentación, iguales para perro y gato. */
const alimentacion = (por: (slug: string) => string): ItemMenu[] => [
  { etiqueta: 'Seca', href: por('alimentacion-seca') },
  { etiqueta: 'Húmeda', href: por('alimentacion-humeda') },
  { etiqueta: 'Semihúmeda', href: por('alimentacion-semihumeda') },
  { etiqueta: 'Snacks y premios', href: por('snacks-y-premios') },
];

export const MENU_PRINCIPAL: ItemMenu[] = [
  {
    etiqueta: 'Alimentación',
    icono: Bone,
    hijos: [
      { etiqueta: 'Perros', iconoHijo: Dog, href: '/tienda?animal=perro', hijos: alimentacion(porPerro) },
      { etiqueta: 'Gatos', iconoHijo: Cat, href: '/tienda?animal=gato', hijos: alimentacion(porGato) },
      {
        etiqueta: 'Conejos',
        iconoHijo: Rabbit,
        href: '/tienda?animal=roedor',
        hijos: [{ etiqueta: 'Heno', href: '/tienda?animal=roedor&category=semillas-y-forraje' }],
      },
    ],
  },
  {
    etiqueta: 'Cosméticos',
    icono: Sparkles,
    hijos: [{ etiqueta: 'Animally', href: '/tienda?brand=animally' }],
  },
  {
    etiqueta: 'Accesorios',
    icono: Package,
    // Cada hoja lleva ya su LÍNEA puesta, para que al abrir la página el filtro
    // de esa subcategoría salga seleccionado (no sólo la categoría «accesorios»).
    hijos: [
      { etiqueta: 'Camas, almohadas y cojines', href: porLinea('Camas, almohadas y cojines') },
      { etiqueta: 'Jaulas y transportines', href: porLinea('Jaulas y transportines') },
      { etiqueta: 'Rascadores y árboles', href: porLinea('Rascadores y árboles') },
      { etiqueta: 'Areneros y accesorios', href: porLinea('Areneros y accesorios') },
      { etiqueta: 'Toallitas', href: porLinea('Toallitas') },
      { etiqueta: 'Pads de entrenamiento', href: porLinea('Pads de entrenamiento') },
      { etiqueta: 'Bolsas de basura', href: porLinea('Bolsas de basura') },
      { etiqueta: 'Dispensadores de comida', href: porLinea('Dispensadores de comida') },
      { etiqueta: 'Aglomerantes', href: porLinea('Aglomerantes') },
    ],
  },
  {
    etiqueta: 'Antiparasitarios',
    icono: ShieldCheck,
    href: '/tienda?category=salud-y-antiparasitarios',
  },
  {
    etiqueta: 'Marcas',
    icono: Tag,
    hijos: [
      { etiqueta: 'Purina', href: '/tienda?brand=purina' },
      { etiqueta: 'Gosbi', href: '/tienda?brand=gosbi' },
      { etiqueta: 'Atlantic Pet', href: '/tienda?brand=atlantic' },
      { etiqueta: 'Ownat', href: '/marca/ownat' },
      { etiqueta: 'Freedog', href: '/tienda?brand=freedog' },
      { etiqueta: 'Duvo+', href: '/tienda?brand=duvo' },
      { etiqueta: 'Nobleza', href: '/tienda?brand=nobleza' },
      { etiqueta: 'Bubimex', href: '/tienda?brand=bubimex' },
      { etiqueta: 'Disugual', href: '/tienda?brand=disugual' },
      { etiqueta: 'Animally', href: '/tienda?brand=animally' },
    ],
  },
  { etiqueta: 'Contacto', icono: Phone, href: '/contacto' },
];
