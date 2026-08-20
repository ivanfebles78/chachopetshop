import { PrismaClient, CategoryType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const img = (slug: string) => `https://picsum.photos/seed/nutripet-${slug}/800/800`;
const sku = (slug: string, label: string) =>
  `${slug}-${label}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const ANIMALS = [
  { slug: 'perro', name: 'Perros', emoji: '🐶', sortOrder: 1 },
  { slug: 'gato', name: 'Gatos', emoji: '🐱', sortOrder: 2 },
  { slug: 'ave', name: 'Aves', emoji: '🐦', sortOrder: 3 },
  { slug: 'roedor', name: 'Roedores', emoji: '🐹', sortOrder: 4 },
  { slug: 'pez', name: 'Peces', emoji: '🐠', sortOrder: 5 },
  { slug: 'reptil', name: 'Reptiles', emoji: '🦎', sortOrder: 6 },
];

const CATEGORIES: { slug: string; name: string; type: CategoryType; sortOrder: number }[] = [
  { slug: 'alimentacion-seca', name: 'Alimentación seca', type: 'DRY_FOOD', sortOrder: 1 },
  { slug: 'alimentacion-humeda', name: 'Alimentación húmeda', type: 'WET_FOOD', sortOrder: 2 },
  { slug: 'semihumeda', name: 'Semihúmeda', type: 'SEMIMOIST', sortOrder: 3 },
  { slug: 'premios-snacks', name: 'Premios y snacks', type: 'SNACKS', sortOrder: 4 },
  { slug: 'suplementos', name: 'Suplementos y salud', type: 'SUPPLEMENTS', sortOrder: 5 },
  { slug: 'higiene', name: 'Higiene y cosmética', type: 'HYGIENE', sortOrder: 6 },
  { slug: 'accesorios', name: 'Accesorios', type: 'ACCESSORIES', sortOrder: 7 },
  { slug: 'camas', name: 'Camas y descanso', type: 'BEDS', sortOrder: 8 },
  { slug: 'transporte', name: 'Transporte y viaje', type: 'TRAVEL', sortOrder: 9 },
  { slug: 'dietas-veterinarias', name: 'Dietas veterinarias', type: 'VET_DIET', sortOrder: 10 },
];

const NEEDS = [
  { slug: 'alergias', name: 'Alergias e intolerancias' },
  { slug: 'control-peso', name: 'Control de peso' },
  { slug: 'articulaciones', name: 'Articulaciones' },
  { slug: 'esterilizado', name: 'Esterilizado' },
  { slug: 'dental', name: 'Cuidado dental' },
  { slug: 'digestivo', name: 'Digestivo sensible' },
  { slug: 'piel-pelo', name: 'Piel y pelo' },
  { slug: 'cachorro', name: 'Cachorro / Junior' },
  { slug: 'senior', name: 'Senior' },
];

const BRANDS = [
  { slug: 'ownat', name: 'Ownat', featured: true },
  { slug: 'acana', name: 'Acana', featured: true },
  { slug: 'orijen', name: 'Orijen', featured: true },
  { slug: 'royal-canin', name: 'Royal Canin', featured: true },
  { slug: 'hills', name: "Hill's Science Plan", featured: true },
  { slug: 'true-instinct', name: 'True Instinct', featured: true },
  { slug: 'applaws', name: 'Applaws', featured: false },
  { slug: 'gimborn', name: 'Gimborn', featured: false },
  { slug: 'natura-diet', name: 'Natura Diet', featured: false },
  { slug: 'versele-laga', name: 'Versele-Laga', featured: false },
  { slug: 'trixie', name: 'Trixie', featured: false },
  { slug: 'ferplast', name: 'Ferplast', featured: false },
];

type Seed = {
  slug: string;
  name: string;
  brand: string;
  description: string;
  price: number;
  compareAt?: number;
  animals: string[];
  categories: string[];
  needs?: string[];
  featured?: boolean;
  bestseller?: boolean;
  variants?: { label: string; price: number; stock: number }[];
};

const PRODUCTS: Seed[] = [
  {
    slug: 'ownat-grain-free-pollo-perro',
    name: 'Ownat Grain Free Prime Pollo',
    brand: 'ownat',
    description: 'Pienso sin cereales rico en pollo fresco para perros adultos de todas las razas. Alta digestibilidad y pelo brillante.',
    price: 21.95,
    compareAt: 26.5,
    animals: ['perro'],
    categories: ['alimentacion-seca'],
    needs: ['digestivo', 'piel-pelo'],
    featured: true,
    bestseller: true,
    variants: [
      { label: '3 kg', price: 21.95, stock: 40 },
      { label: '12 kg', price: 62.9, stock: 25 },
    ],
  },
  {
    slug: 'acana-pacifica-perro',
    name: 'Acana Pacifica Dog',
    brand: 'acana',
    description: 'Receta rica en pescado del Pacífico, biológicamente apropiada. Ideal para perros con sensibilidades alimentarias.',
    price: 28.9,
    animals: ['perro'],
    categories: ['alimentacion-seca'],
    needs: ['alergias', 'piel-pelo'],
    featured: true,
    variants: [
      { label: '2 kg', price: 28.9, stock: 30 },
      { label: '11.4 kg', price: 96.5, stock: 12 },
    ],
  },
  {
    slug: 'orijen-original-perro',
    name: 'Orijen Original Dog',
    brand: 'orijen',
    description: 'El 85% de ingredientes animales. Alimento premium de alta densidad nutricional para perros activos.',
    price: 34.5,
    animals: ['perro'],
    categories: ['alimentacion-seca'],
    needs: ['articulaciones'],
    bestseller: true,
    variants: [
      { label: '2 kg', price: 34.5, stock: 22 },
      { label: '11.4 kg', price: 112.0, stock: 8 },
    ],
  },
  {
    slug: 'royal-canin-maxi-adult',
    name: 'Royal Canin Maxi Adult',
    brand: 'royal-canin',
    description: 'Nutrición precisa para perros de razas grandes (26-44 kg). Apoyo articular y digestión saludable.',
    price: 62.99,
    animals: ['perro'],
    categories: ['alimentacion-seca'],
    needs: ['articulaciones', 'digestivo'],
    variants: [
      { label: '4 kg', price: 27.99, stock: 35 },
      { label: '15 kg', price: 62.99, stock: 18 },
    ],
  },
  {
    slug: 'hills-puppy-pollo',
    name: "Hill's Science Plan Puppy Pollo",
    brand: 'hills',
    description: 'Alimento para cachorros con ADN de pollo. Desarrollo cerebral y sistema inmune fuerte.',
    price: 24.9,
    animals: ['perro'],
    categories: ['alimentacion-seca'],
    needs: ['cachorro'],
    featured: true,
    variants: [
      { label: '2.5 kg', price: 24.9, stock: 28 },
      { label: '12 kg', price: 71.9, stock: 14 },
    ],
  },
  {
    slug: 'true-instinct-no-grain-senior',
    name: 'True Instinct No Grain Senior',
    brand: 'true-instinct',
    description: 'Sin cereales, con pavo, para perros senior. Cuida las articulaciones y el peso ideal.',
    price: 19.95,
    animals: ['perro'],
    categories: ['alimentacion-seca'],
    needs: ['senior', 'control-peso', 'articulaciones'],
    variants: [
      { label: '2 kg', price: 19.95, stock: 26 },
      { label: '9 kg', price: 58.0, stock: 10 },
    ],
  },
  {
    slug: 'applaws-lata-pollo-perro',
    name: 'Applaws Lata Pollo con Verduras',
    brand: 'applaws',
    description: 'Comida húmeda natural con pollo y verduras. Sin colorantes ni conservantes artificiales.',
    price: 2.4,
    animals: ['perro'],
    categories: ['alimentacion-humeda'],
    needs: ['digestivo'],
    variants: [
      { label: 'Lata 156 g', price: 2.4, stock: 120 },
      { label: 'Pack 6x156 g', price: 13.5, stock: 40 },
    ],
  },
  {
    slug: 'orijen-cat-fit-trim',
    name: 'Orijen Cat Fit & Trim',
    brand: 'orijen',
    description: 'Para gatos con tendencia al sobrepeso. Alto en proteína, bajo en carbohidratos.',
    price: 26.9,
    animals: ['gato'],
    categories: ['alimentacion-seca'],
    needs: ['control-peso', 'esterilizado'],
    featured: true,
    bestseller: true,
    variants: [
      { label: '1.8 kg', price: 26.9, stock: 30 },
      { label: '5.4 kg', price: 66.0, stock: 12 },
    ],
  },
  {
    slug: 'royal-canin-sterilised-gato',
    name: 'Royal Canin Sterilised 37',
    brand: 'royal-canin',
    description: 'Fórmula específica para gatos esterilizados. Control de peso y salud urinaria.',
    price: 18.5,
    animals: ['gato'],
    categories: ['alimentacion-seca'],
    needs: ['esterilizado', 'control-peso'],
    bestseller: true,
    variants: [
      { label: '2 kg', price: 18.5, stock: 44 },
      { label: '10 kg', price: 78.9, stock: 16 },
    ],
  },
  {
    slug: 'hills-sensitive-gato',
    name: "Hill's Sensitive Stomach & Skin Gato",
    brand: 'hills',
    description: 'Para gatos con piel sensible y digestión delicada. Con vitamina E y omega-6.',
    price: 22.9,
    animals: ['gato'],
    categories: ['alimentacion-seca'],
    needs: ['piel-pelo', 'digestivo', 'alergias'],
    variants: [
      { label: '1.5 kg', price: 22.9, stock: 24 },
      { label: '7 kg', price: 74.5, stock: 9 },
    ],
  },
  {
    slug: 'applaws-gato-atun-tarrina',
    name: 'Applaws Tarrina Atún con Cangrejo',
    brand: 'applaws',
    description: 'Comida húmeda gourmet para gatos, con atún y cangrejo en caldo natural.',
    price: 1.35,
    animals: ['gato'],
    categories: ['alimentacion-humeda'],
    featured: true,
    variants: [
      { label: 'Tarrina 70 g', price: 1.35, stock: 200 },
      { label: 'Pack 12x70 g', price: 14.9, stock: 30 },
    ],
  },
  {
    slug: 'gimborn-gimcat-pasta-malta',
    name: 'GimCat Pasta de Malta Anti-bolas de Pelo',
    brand: 'gimborn',
    description: 'Pasta apetecible que ayuda a eliminar las bolas de pelo de forma natural.',
    price: 6.9,
    animals: ['gato'],
    categories: ['suplementos'],
    needs: ['digestivo', 'piel-pelo'],
    variants: [{ label: '100 g', price: 6.9, stock: 60 }],
  },
  {
    slug: 'trixie-premios-dentales-perro',
    name: 'Trixie Denta Fun Snacks Dentales',
    brand: 'trixie',
    description: 'Snacks masticables que reducen el sarro y refrescan el aliento del perro.',
    price: 4.5,
    animals: ['perro'],
    categories: ['premios-snacks'],
    needs: ['dental'],
    bestseller: true,
    variants: [{ label: 'Bolsa 180 g', price: 4.5, stock: 80 }],
  },
  {
    slug: 'natura-diet-snack-salmon',
    name: 'Natura Diet Snack Salmón',
    brand: 'natura-diet',
    description: 'Premios naturales de salmón, ricos en omega-3 para un pelo brillante.',
    price: 3.95,
    animals: ['perro', 'gato'],
    categories: ['premios-snacks'],
    needs: ['piel-pelo'],
    variants: [{ label: '100 g', price: 3.95, stock: 90 }],
  },
  {
    slug: 'suplemento-articulaciones-condro',
    name: 'CondroPlus Articulaciones Perro',
    brand: 'natura-diet',
    description: 'Complemento con condroitina y glucosamina para articulaciones sanas en perros senior o grandes.',
    price: 15.9,
    animals: ['perro'],
    categories: ['suplementos'],
    needs: ['articulaciones', 'senior'],
    featured: true,
    variants: [{ label: '60 comprimidos', price: 15.9, stock: 40 }],
  },
  {
    slug: 'champu-hipoalergenico-perro',
    name: 'Champú Hipoalergénico Piel Sensible',
    brand: 'trixie',
    description: 'Champú suave para perros y gatos con piel sensible o propensa a alergias. pH neutro.',
    price: 8.5,
    animals: ['perro', 'gato'],
    categories: ['higiene'],
    needs: ['alergias', 'piel-pelo'],
    variants: [{ label: '250 ml', price: 8.5, stock: 55 }],
  },
  {
    slug: 'arena-aglomerante-gato',
    name: 'Arena Aglomerante Ultra Absorbente',
    brand: 'trixie',
    description: 'Arena de bentonita con control de olores 7 días. Aglomeración rápida y bajo polvo.',
    price: 9.9,
    animals: ['gato'],
    categories: ['higiene'],
    bestseller: true,
    variants: [
      { label: '10 L', price: 9.9, stock: 70 },
      { label: '20 L', price: 17.5, stock: 30 },
    ],
  },
  {
    slug: 'cama-ortopedica-perro',
    name: 'Cama Ortopédica Memory Foam',
    brand: 'ferplast',
    description: 'Cama con espuma viscoelástica que alivia la presión en articulaciones. Funda lavable.',
    price: 44.9,
    compareAt: 59.9,
    animals: ['perro'],
    categories: ['camas'],
    needs: ['articulaciones', 'senior'],
    featured: true,
    variants: [
      { label: 'Talla M (70 cm)', price: 44.9, stock: 20 },
      { label: 'Talla L (90 cm)', price: 59.9, stock: 12 },
    ],
  },
  {
    slug: 'rascador-torre-gato',
    name: 'Rascador Torre Deluxe con Casita',
    brand: 'ferplast',
    description: 'Torre rascador de sisal natural con casita y plataformas. Diversión y descanso para tu gato.',
    price: 54.9,
    animals: ['gato'],
    categories: ['accesorios'],
    bestseller: true,
    variants: [{ label: '120 cm', price: 54.9, stock: 15 }],
  },
  {
    slug: 'transportin-avion-perro-gato',
    name: 'Transportín Homologado Avión',
    brand: 'ferplast',
    description: 'Transportín rígido homologado IATA para viajes en avión. Seguro y ventilado.',
    price: 29.9,
    animals: ['perro', 'gato'],
    categories: ['transporte'],
    variants: [
      { label: 'Talla S', price: 29.9, stock: 25 },
      { label: 'Talla M', price: 39.9, stock: 18 },
    ],
  },
  {
    slug: 'royal-canin-urinary-so',
    name: 'Royal Canin Veterinary Urinary S/O',
    brand: 'royal-canin',
    description: 'Dieta veterinaria para disolver cálculos de estruvita y salud del tracto urinario en gatos.',
    price: 32.9,
    animals: ['gato'],
    categories: ['dietas-veterinarias'],
    needs: ['esterilizado'],
    variants: [
      { label: '1.5 kg', price: 32.9, stock: 20 },
      { label: '7 kg', price: 89.9, stock: 8 },
    ],
  },
  {
    slug: 'hills-metabolic-perro',
    name: "Hill's Prescription Diet Metabolic Perro",
    brand: 'hills',
    description: 'Dieta veterinaria clínicamente probada para el control y la pérdida de peso en perros.',
    price: 36.5,
    animals: ['perro'],
    categories: ['dietas-veterinarias'],
    needs: ['control-peso'],
    variants: [
      { label: '4 kg', price: 36.5, stock: 16 },
      { label: '12 kg', price: 92.9, stock: 7 },
    ],
  },
  {
    slug: 'versele-laga-prestige-periquitos',
    name: 'Versele-Laga Prestige Periquitos',
    brand: 'versele-laga',
    description: 'Mezcla de semillas de alta calidad para periquitos. Equilibrada y muy apetecible.',
    price: 5.9,
    animals: ['ave'],
    categories: ['alimentacion-seca'],
    variants: [
      { label: '1 kg', price: 5.9, stock: 50 },
      { label: '4 kg', price: 18.9, stock: 20 },
    ],
  },
  {
    slug: 'versele-laga-canarios',
    name: 'Versele-Laga Prestige Canarios',
    brand: 'versele-laga',
    description: 'Alimento completo para canarios con semillas seleccionadas y vitaminas.',
    price: 6.5,
    animals: ['ave'],
    categories: ['alimentacion-seca'],
    variants: [{ label: '1 kg', price: 6.5, stock: 45 }],
  },
  {
    slug: 'barritas-miel-roedores',
    name: 'Barritas de Miel y Frutas para Roedores',
    brand: 'gimborn',
    description: 'Premios crujientes de miel y frutas para hámsters, cobayas y conejos.',
    price: 2.9,
    animals: ['roedor'],
    categories: ['premios-snacks'],
    variants: [{ label: 'Pack 2 barritas', price: 2.9, stock: 60 }],
  },
  {
    slug: 'heno-timothy-conejo',
    name: 'Heno Timothy Premium Conejos',
    brand: 'versele-laga',
    description: 'Heno de fleo de primer corte, rico en fibra, esencial para la digestión de conejos y cobayas.',
    price: 7.9,
    animals: ['roedor'],
    categories: ['alimentacion-seca'],
    needs: ['digestivo'],
    variants: [{ label: '1 kg', price: 7.9, stock: 35 }],
  },
  {
    slug: 'escamas-peces-tropicales',
    name: 'Escamas para Peces Tropicales',
    brand: 'trixie',
    description: 'Alimento en escamas para peces tropicales de agua dulce. Realza el color natural.',
    price: 4.2,
    animals: ['pez'],
    categories: ['alimentacion-seca'],
    variants: [{ label: '250 ml', price: 4.2, stock: 40 }],
  },
  {
    slug: 'kit-comedero-bebedero-acero',
    name: 'Comedero + Bebedero Acero Inoxidable',
    brand: 'ferplast',
    description: 'Set de dos cuencos de acero inoxidable antideslizantes. Higiénicos y resistentes.',
    price: 12.9,
    animals: ['perro', 'gato'],
    categories: ['accesorios'],
    variants: [
      { label: '0.5 L', price: 12.9, stock: 40 },
      { label: '1.5 L', price: 18.9, stock: 22 },
    ],
  },
];

async function main() {
  // En producción arrancamos con SEED_ONLY_IF_EMPTY=1: solo sembramos si no hay
  // datos, para no borrar pedidos reales en cada despliegue.
  if (process.env.SEED_ONLY_IF_EMPTY === '1') {
    const count = await prisma.product.count().catch(() => 0);
    if (count > 0) {
      console.log(`⏭️  Seed omitido: la BD ya tiene ${count} productos.`);
      return;
    }
  }

  console.log('🌱 Sembrando Chacho Pet Shop...');

  // Limpieza (orden por dependencias).
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.animal.deleteMany();
  await prisma.category.deleteMany();
  await prisma.need.deleteMany();
  await prisma.user.deleteMany();

  await prisma.animal.createMany({ data: ANIMALS });
  await prisma.category.createMany({ data: CATEGORIES });
  await prisma.need.createMany({ data: NEEDS });
  await prisma.brand.createMany({ data: BRANDS.map((b) => ({ ...b, logoUrl: img(`brand-${b.slug}`) })) });

  const [animals, categories, needs, brands] = await Promise.all([
    prisma.animal.findMany(),
    prisma.category.findMany(),
    prisma.need.findMany(),
    prisma.brand.findMany(),
  ]);
  const animalId = (slug: string) => animals.find((a) => a.slug === slug)!.id;
  const categoryId = (slug: string) => categories.find((c) => c.slug === slug)!.id;
  const needId = (slug: string) => needs.find((n) => n.slug === slug)!.id;
  const brandId = (slug: string) => brands.find((b) => b.slug === slug)!.id;

  for (const p of PRODUCTS) {
    const variants = p.variants ?? [{ label: 'Única', price: p.price, stock: 30 }];
    await prisma.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        brandId: brandId(p.brand),
        price: p.price,
        compareAt: p.compareAt ?? null,
        image: img(p.slug),
        gallery: [img(p.slug), img(`${p.slug}-2`), img(`${p.slug}-3`)],
        featured: p.featured ?? false,
        bestseller: p.bestseller ?? false,
        animals: { connect: p.animals.map((s) => ({ id: animalId(s) })) },
        categories: { connect: p.categories.map((s) => ({ id: categoryId(s) })) },
        needs: { connect: (p.needs ?? []).map((s) => ({ id: needId(s) })) },
        variants: { create: variants.map((v) => ({ ...v, sku: sku(p.slug, v.label) })) },
      },
    });
  }

  await prisma.user.create({
    data: {
      email: 'admin@chachopetshop.com',
      name: 'Admin Chacho',
      role: 'ADMIN',
      passwordHash: await bcrypt.hash('admin1234', 10),
    },
  });
  await prisma.user.create({
    data: { email: 'daniel', name: 'Daniel', role: 'ADMIN', passwordHash: await bcrypt.hash('Test1234', 10) },
  });
  const cliente = await prisma.user.create({
    data: {
      email: 'cliente@chachopetshop.com',
      name: 'Cliente Demo',
      passwordHash: await bcrypt.hash('cliente1234', 10),
    },
  });

  // --- Pedidos de demostración para poblar el panel de estadísticas ---
  const seeded = await prisma.product.findMany({ include: { variants: true } });
  const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]!;
  const now = new Date();
  const ORDERS = 70;

  for (let i = 0; i < ORDERS; i++) {
    // Fecha aleatoria en los últimos 60 días, con hora sesgada a mañana/tarde.
    const daysAgo = Math.floor(Math.random() * 60);
    const hour = Math.random() < 0.55 ? 9 + Math.floor(Math.random() * 4) : 16 + Math.floor(Math.random() * 5);
    const createdAt = new Date(now);
    createdAt.setDate(createdAt.getDate() - daysAgo);
    createdAt.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

    const lineCount = 1 + Math.floor(Math.random() * 3);
    const items = Array.from({ length: lineCount }, () => {
      const product = pick(seeded);
      const variant = pick(product.variants);
      const quantity = 1 + Math.floor(Math.random() * 3);
      return {
        productId: product.id,
        variantId: variant.id,
        name: product.name,
        variantLabel: variant.label,
        image: product.image,
        unitPrice: variant.price,
        quantity,
      };
    });
    const subtotal = items.reduce((s, it) => s + Number(it.unitPrice) * it.quantity, 0);
    const shipping = subtotal >= 49 ? 0 : 4.95;
    const roll = Math.random();
    const status = roll < 0.7 ? 'PAID' : roll < 0.92 ? 'FULFILLED' : 'PENDING';

    await prisma.order.create({
      data: {
        email: Math.random() < 0.3 ? cliente.email : `cliente${i}@ejemplo.com`,
        userId: Math.random() < 0.3 ? cliente.id : null,
        status,
        subtotal,
        shipping,
        total: subtotal + shipping,
        createdAt,
        items: { create: items },
      },
    });
  }

  console.log(`✅ Listo: ${PRODUCTS.length} productos, ${BRANDS.length} marcas, ${ORDERS} pedidos demo.`);
  console.log('   Admin: admin@chachopetshop.com / admin1234  ·  daniel / Test1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
