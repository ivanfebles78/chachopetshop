/**
 * ALPHA SPIRIT · THE ONLY ONE · PATO — el primer producto real del catálogo.
 *
 * TODO lo de este fichero está TRANSCRITO de la documentación que entregó Ivan:
 *
 *   · `the-only-one-complete-dog-food-duck-12-kg.docx`
 *   · `Alpha Spirit alimentación perro SKU 8436586310301 - grafico.png`
 *
 * No hay ni una frase redactada por mí, ni un porcentaje redondeado, ni un
 * beneficio añadido. Donde el documento no dice nada, aquí no hay nada — y eso
 * incluye el precio, que no aparece en ninguno de los archivos.
 *
 * La tabla de raciones se leyó del gráfico a triple aumento, columna por
 * columna. Los 36 valores son legibles y están verificados; ninguno se ha
 * deducido ni interpolado.
 */

export const SKU_12KG = '8436586310301';

/** La imagen: original del fabricante conservado, derivada WebP para servir. */
export const IMAGEN = '/productos/alpha-spirit-the-only-one-pato.webp';

/**
 * La tabla de necesidades diarias, en gramos.
 *
 * Filas = tipo de perro, columnas = peso del animal en kg. Se guarda como datos
 * y no como imagen para que se pueda leer con un lector de pantalla, buscar y
 * reflotar en un móvil — el gráfico original se conserva igualmente como
 * recurso visual.
 */
export const TABLA_RACIONES = {
  unidad: 'g',
  pesos: [2, 5, 10, 15, 20, 25, 30, 40, 60],
  filas: [
    { tipo: 'Average', valores: [50, 99, 167, 226, 280, 331, 380, 471, 639] },
    { tipo: 'Active', valores: [57, 113, 189, 257, 318, 376, 431, 535, 726] },
    { tipo: 'Senior', valores: [43, 86, 144, 195, 242, 286, 328, 407, 551] },
    { tipo: 'Young', valores: [59, 117, 197, 267, 331, 391, 449, 557, 755] },
  ],
} as const;

/**
 * El contenido enriquecido, con la forma que guarda `Product.contenido`.
 *
 * Cada apartado es opcional: un transportín no tendrá composición analítica ni
 * tabla de raciones, y la ficha simplemente no pintará esas secciones.
 */
export const CONTENIDO = {
  titular: 'ALIMENTO COMPLETO PARA PERROS',

  descripcion: [
    'THE ONLY ONE by Alpha Spirit está listo para deleitar a tu MEJOR amigo de una forma tradicional.',
    'Libre de cereales, libre de gluten y libre de harinas cárnicas, de fabricación propia, empleando ingredientes naturales y frescos de categoría alimentaria humana. Lo más importante es que esta comida NO ESTÁ EXTRUSIONADA.',
    'Como siempre, cocinar productos naturales para su MEJOR amigo es lo esencial para nosotros. Con una alimentación más natural, su perro estará lleno de energía, saludable y ¡Con un hermoso y brillante pelaje!',
    'Este producto ha sido elaborado con carne y pescado frescos. Para producir 1 kg de este alimento para mascotas completo para perros, hemos utilizado 2,3 kg de carne fresca y 0,6 kg de pescado fresco. Nuestros ingredientes frescos se cocinan a baja temperatura, conservando todos sus nutrientes, vitaminas y minerales. Este producto no contiene grasas añadidas, y no contiene granos ni gluten.',
  ],

  /** Los dos formatos que declara el documento. Sólo se publica el de 12 kg. */
  tamanos: 'Sacos 3 kg y 12 kg',

  caracteristicas: {
    titulo: 'Lo mejor de este producto Alpha Spirit',
    puntos: [
      'Libre de grano y libre de gluten.',
      'Libre de harinas cárnicas.',
      'NO se elabora mediante técnicas de extrusión.',
      'Todas las grasas provienen fuentes naturales de carne y pescado.',
      'Elaborado con ingredientes procedentes de empresas locales y de origen español.',
    ],
  },

  composicion:
    '45% carne de pato fresca, 20% carne de pollo fresca, 20% pescado entero fresco (alacha (Sardinella aurita), caballa (Scomber scombrus), jurel (Trachurus spp.), sardina (Sardina pilchardus)), almidón hidrolizado, huevos, pulpa de Beta Vulgaris, levadura de cerveza (Saccharomyces cerevisiae), pera, piña, achicoria, plátano, comino (Cuminum cyminum), orégano (Origanum vulgare) anís (Pimpinella anisum), cúrcuma (Curcuma longa), hinojo (Foeniculum vulgare)',

  /**
   * Los valores analíticos, en pares para poder pintarlos en tabla.
   *
   * Van tal cual: «31,5 %» y no «31.5%». Es una etiqueta de producto, y en una
   * etiqueta la coma decimal y el símbolo forman parte del dato.
   */
  analitica: [
    { nombre: 'Proteína bruta', valor: '31,5 %' },
    { nombre: 'Fibra bruta', valor: '2 %' },
    { nombre: 'Grasa bruta', valor: '17 %' },
    { nombre: 'Ceniza bruta', valor: '8 %' },
    { nombre: 'Humedad', valor: '16 %' },
    { nombre: 'Ácidos grasos poliinsaturados omega-3 EPA+DHA', valor: '2000 mg/kg' },
    { nombre: 'Calcio', valor: '1,5 %' },
    { nombre: 'Fósforo', valor: '1,2 %' },
    { nombre: 'Hierro', valor: '70 mg/kg' },
    { nombre: 'Glucosamina', valor: '4400 mg/kg' },
    { nombre: 'Taurina', valor: '3000 mg/kg' },
  ],

  notaAnalitica:
    'Todos los componentes analíticos están naturalmente presentes y provienen de nuestras materias primas; no han sido añadidos artificialmente.',

  energia: 'ENERGÍA METABOLIZABLE POR KG: 3714 kcal / 15539 kJ',

  fabricacion: {
    titulo: 'Proceso de fabricación',
    parrafos: [
      'La Tecnología Tenderize es un proceso de fabricación en el que aplicamos una técnica de maceración en frío, pre-digestión y deshidratación, obteniendo productos de excelente palatabilidad producidos únicamente utilizando sus propios jugos.',
      'El alimento ha sido cuidado y mimado en su proceso de fabricación para garantizar la calidad final del producto, ya que utiliza una tecnología de fabricación de última generación la cual no somete al producto altas temperaturas ni usa coadyuvantes tecnológicos. Este proceso es similar a la cocción de los alimentos que se produce en el hogar lo que garantiza que el producto tenga un alto valor nutricional y con ello sea más saludable para la mascota.',
    ],
  },

  recomendaciones: {
    titulo: 'Recomendaciones de uso',
    puntos: [
      'Consulte la tabla de necesidades diarias de alimento como punto de referencia, variando la cantidad de alimento según la edad, nivel de actividad física, peso o raza.',
      'Deje siempre agua fresca y limpia a disposición de la mascota.',
      'Almacene el producto en un lugar fresco y seco, y protegido de la luz solar.',
    ],
  },

  raciones: TABLA_RACIONES,
} as const;
