export type Animal = { id: string; name: string; slug: string; emoji: string | null; sortOrder: number };
export type Category = { id: string; name: string; slug: string; type: string; sortOrder: number };
export type Need = { id: string; name: string; slug: string };
export type Brand = { id: string; name: string; slug: string; logoUrl: string | null; featured: boolean };

export type Variant = { id: string; label: string; price: number; sku: string; stock: number };

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  brand: Brand;
  brandId: string;
  price: number;
  compareAt: number | null;
  image: string;
  gallery: string[];
  featured: boolean;
  bestseller: boolean;
  animals: Animal[];
  categories: Category[];
  needs: Need[];
  variants: Variant[];
};

/** Un producto relacionado, con la razón por la que se enseña. */
export type Relacionado = Product & { motivo?: 'categoria' | 'animal' | 'marca' };

export type Taxonomy = {
  animals: Animal[];
  categories: Category[];
  needs: Need[];
  brands: Brand[];
};

/** Una opción de filtro, con cuántos productos hay detrás. */
export type Faceta = { slug: string; nombre: string; total: number };

/**
 * Recuentos por dimensión, que el servidor devuelve con `?facets=1`.
 *
 * Vienen TAMBIÉN las facetas que valen 0: hace falta saberlo para poder
 * esconderlas con criterio, en vez de adivinar si una falta porque no existe o
 * porque se quedó fuera de esta página de resultados.
 */
export type Facetas = {
  animals: Faceta[];
  categories: Faceta[];
  needs: Faceta[];
  brands: Faceta[];
  ofertas: number;
  precio: { min: number; max: number } | null;
};

export type ProductListResponse = {
  items: Product[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  facets?: Facetas;
};

export type OrderItem = {
  id: string;
  name: string;
  variantLabel: string | null;
  unitPrice: number;
  quantity: number;
  image: string | null;
};

export type Order = {
  id: string;
  email: string;
  status: 'PENDING' | 'PAID' | 'FULFILLED' | 'CANCELLED';
  subtotal: number;
  shipping: number;
  total: number;
  createdAt: string;
  items: OrderItem[];
};

export type AuthUser = { id: string; email: string; role: 'CUSTOMER' | 'ADMIN' };

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export type Analytics = {
  kpis: {
    revenueToday: number;
    revenueWeek: number;
    revenueMonth: number;
    revenueTotal: number;
    orders: number;
    units: number;
    aov: number;
  };
  dailySeries: { date: string; revenue: number; orders: number }[];
  monthlySeries: { month: string; revenue: number }[];
  weekdayStats: { weekday: string; revenue: number; orders: number }[];
  bestWeekday: { weekday: string; revenue: number; orders: number } | null;
  slots: {
    morning: { revenue: number; orders: number };
    afternoon: { revenue: number; orders: number };
    best: { label: string; revenue: number; orders: number };
  };
  topProducts: { name: string; revenue: number; units: number }[];
  stock: {
    totalUnits: number;
    lowStockThreshold: number;
    lowStock: { name: string; stock: number }[];
    byProduct: { name: string; stock: number }[];
  };
};
