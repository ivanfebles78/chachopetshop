import type {
  Analytics,
  AuthUser,
  ContactMessage,
  Order,
  Product,
  ProductListResponse,
  Taxonomy,
} from './types';

const BASE = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      ...init,
    });
  } catch {
    // Fallo de red / servidor caído: fetch rechaza con TypeError.
    throw new ApiError('No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.', 0);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(body.error ?? `Error ${res.status}. Inténtalo de nuevo.`, res.status);
  }
  return res.json() as Promise<T>;
}

export type ProductFilters = {
  animal?: string;
  category?: string;
  brand?: string[];
  need?: string[];
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  page?: number;
  pageSize?: number;
  featured?: boolean;
  bestseller?: boolean;
  /*
   * SÓLO LO REBAJADO DE VERDAD (`compareAt > price`).
   *
   * El servidor admite este filtro desde la Fase 2A y el menú enlaza a
   * `/tienda?oferta=1`… pero faltaba aquí, así que el catálogo se comía el
   * parámetro y respondía con los 28 productos. Es decir: «Ofertas» prometía
   * rebajas y entregaba la tienda entera. Justo lo que la 2A quería evitar,
   * vivo en producción porque se comprobó la API y no la página.
   */
  oferta?: boolean;
};

function toQuery(f: ProductFilters): string {
  const p = new URLSearchParams();
  if (f.animal) p.set('animal', f.animal);
  if (f.category) p.set('category', f.category);
  if (f.brand?.length) p.set('brand', f.brand.join(','));
  if (f.need?.length) p.set('need', f.need.join(','));
  if (f.q) p.set('q', f.q);
  if (f.minPrice != null) p.set('minPrice', String(f.minPrice));
  if (f.maxPrice != null) p.set('maxPrice', String(f.maxPrice));
  if (f.sort) p.set('sort', f.sort);
  if (f.page) p.set('page', String(f.page));
  if (f.pageSize) p.set('pageSize', String(f.pageSize));
  if (f.featured) p.set('featured', 'true');
  if (f.bestseller) p.set('bestseller', 'true');
  if (f.oferta) p.set('oferta', '1');
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const api = {
  taxonomy: () => request<Taxonomy>('/taxonomy'),
  products: (f: ProductFilters = {}) => request<ProductListResponse>(`/products${toQuery(f)}`),
  product: (slug: string) => request<{ product: Product; related: Product[] }>(`/products/${slug}`),

  register: (data: { email: string; password: string; name?: string }) =>
    request<{ user: AuthUser }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request<{ user: AuthUser }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  me: () => request<{ user: AuthUser }>('/auth/me'),

  checkout: (data: {
    email: string;
    items: { productId: string; variantId?: string; quantity: number }[];
    shipping?: { name?: string; address?: string; city?: string; zip?: string };
  }) => request<{ orderId: string; url: string }>('/checkout', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  /*
   * El token va como parámetro porque es lo que permite a quien compra SIN
   * cuenta ver su confirmación. El identificador del pedido ya no basta: antes
   * bastaba, y por eso cualquiera con el enlace veía nombre y dirección.
   */
  order: (id: string, token?: string) =>
    request<{ order: Order }>(`/orders/${id}${token ? `?t=${encodeURIComponent(token)}` : ''}`),
  myOrders: () => request<{ orders: Order[] }>('/orders'),

  contact: (data: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
    // Consentimiento expreso: el servidor lo exige, no es decorativo.
    consent: boolean;
    website?: string;
  }) =>
    request<{ ok: boolean; id: string }>('/contact', { method: 'POST', body: JSON.stringify(data) }),

  adminAnalytics: () => request<Analytics>('/admin/analytics'),
  adminMessages: () => request<{ messages: ContactMessage[] }>('/admin/messages'),
  adminMarkMessage: (id: string, read: boolean) =>
    request<{ ok: boolean }>(`/admin/messages/${id}`, { method: 'PATCH', body: JSON.stringify({ read }) }),
  adminDeleteMessage: (id: string) =>
    request<{ ok: boolean }>(`/admin/messages/${id}`, { method: 'DELETE' }),
  adminProducts: () => request<{ products: Product[] }>('/admin/products'),
  adminDeleteProduct: (id: string) => request<{ ok: boolean }>(`/admin/products/${id}`, { method: 'DELETE' }),
  adminOrders: () => request<{ orders: Order[] }>('/admin/orders'),
  adminUpdateOrder: (id: string, status: Order['status']) =>
    request<{ ok: boolean; status: string }>(`/admin/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};
