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
  Bird,
  Fish,
  Turtle,
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

/**
 * Un enlace que filtra el catálogo por una o varias FAMILIAS de Factusol —el
 * código crudo que el sincronizador guarda en cada producto (ver el filtro
 * `familia` del catálogo)—. Opcionalmente fija también la mascota, para que el
 * titular y las migas digan «… para perros». Varias familias van separadas por
 * coma (p. ej. «Aseo» = GBA,PGA); el servidor las separa igual.
 */
const porFamilia = (familia: string, animal?: string) =>
  `/tienda?${animal ? `animal=${animal}&` : ''}familia=${familia}`;

/**
 * Un enlace a la categoría «accesorios» con una LÍNEA ya seleccionada. La línea
 * es el valor exacto del atributo `line` (jaulas, camas…), así que va codificado.
 */
const porLinea = (linea: string) =>
  `/tienda?category=accesorios&line=${encodeURIComponent(linea)}`;

export const MENU_PRINCIPAL: ItemMenu[] = [
  {
    etiqueta: 'Alimentación',
    icono: Bone,
    hijos: [
      {
        etiqueta: 'Perros',
        iconoHijo: Dog,
        href: '/tienda?animal=perro',
        hijos: [
          { etiqueta: 'Seca', href: porFamilia('PAS', 'perro') },
          { etiqueta: 'Semihúmeda', href: porFamilia('PSH', 'perro') },
          { etiqueta: 'Húmeda', href: porFamilia('PAH', 'perro') },
          { etiqueta: 'Snacks', href: porFamilia('PSN', 'perro') },
        ],
      },
      {
        etiqueta: 'Gatos',
        iconoHijo: Cat,
        href: '/tienda?animal=gato',
        hijos: [
          { etiqueta: 'Seca', href: porFamilia('GAS', 'gato') },
          { etiqueta: 'Semihúmeda', href: porFamilia('GSH', 'gato') },
          { etiqueta: 'Húmeda', href: porFamilia('GAH', 'gato') },
          { etiqueta: 'Snacks', href: porFamilia('GSN', 'gato') },
        ],
      },
      {
        etiqueta: 'Roedores',
        iconoHijo: Rabbit,
        href: '/tienda?animal=roedor',
        hijos: [
          { etiqueta: 'Alimentos', href: porFamilia('RAL', 'roedor') },
          { etiqueta: 'Snack', href: porFamilia('RSN', 'roedor') },
        ],
      },
      // Reptiles y Peces tienen UNA sola familia de alimentación cada uno (REA y
      // PCL), así que no despliegan como los demás; llevan su icono para salir al
      // mismo nivel visual que Perros, Gatos, Roedores y Ave.
      { etiqueta: 'Reptiles', iconoHijo: Turtle, href: porFamilia('REA', 'reptil') },
      { etiqueta: 'Peces', iconoHijo: Fish, href: porFamilia('PCL', 'pez') },
      {
        etiqueta: 'Ave',
        iconoHijo: Bird,
        href: '/tienda?animal=ave',
        hijos: [
          { etiqueta: 'Pastas', href: porFamilia('AAP', 'ave') },
          { etiqueta: 'Semillas', href: porFamilia('AAS', 'ave') },
          { etiqueta: 'Mezclas', href: porFamilia('AAM', 'ave') },
        ],
      },
    ],
  },
  {
    etiqueta: 'Salud y Cosméticos',
    icono: Sparkles,
    hijos: [
      // Vitaminas y suplementos: AAV (ave), GSU (gato) y PSU (perro).
      { etiqueta: 'Vitaminas y suplementos', href: porFamilia('AAV,GSU,PSU') },
      // Aseo: GBA (gato baño) y PGA (perro aseo).
      { etiqueta: 'Aseo', href: porFamilia('GBA,PGA') },
    ],
  },
  {
    etiqueta: 'Accesorios',
    icono: Package,
    // Cada hoja lleva ya su LÍNEA puesta, para que al abrir la página el filtro
    // de esa subcategoría salga seleccionado (no sólo la categoría «accesorios»).
    hijos: [
      { etiqueta: 'Descanso', href: porLinea('Descanso') },
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
    // PAN (perro) y GAN (gato).
    href: porFamilia('PAN,GAN'),
  },
  {
    etiqueta: 'Marcas',
    icono: Tag,
    hijos: [
      { etiqueta: 'Purina', href: '/tienda?brand=purina' },
      { etiqueta: 'Gosbi', href: '/tienda?brand=gosbi' },
      { etiqueta: 'Atlantic Pet', href: '/tienda?brand=atlantic' },
      { etiqueta: 'Benelux', href: '/tienda?brand=benelux' },
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
