import { useEffect, useState } from 'react';

/**
 * CATÁLOGO CURADO DE OWNAT.
 *
 * No sale del catálogo general (que trae los productos del TPV sin foto ni
 * descripción): son las 95 fichas oficiales de Ownat —línea, foto, descripción y
 * composición— que la tienda facilitó. Se sirven como un JSON estático
 * (`public/ownat-catalogo.json`) y se piden UNA vez por sesión, igual que el
 * menú. La página de marca las presenta como en la web del fabricante: líneas →
 * productos → ficha.
 */

export type ContenidoOwnat = {
  composicion: string;
  analitica: string;
  aditivos: string;
  instrucciones: string;
  formatos: string;
};

export type ProductoOwnat = {
  nombre: string;
  slug: string;
  linea: string;
  lineaSlug: string;
  imagen: string | null;
  descripcion: string;
  contenido: ContenidoOwnat;
  web: string;
};

export type LineaFoto = { linea: string; lineaSlug: string; imagen: string };

type Catalogo = { productos: ProductoOwnat[]; lineas: LineaFoto[] };

/**
 * ORDEN Y PRESENTACIÓN DE LAS LÍNEAS.
 *
 * El orden es comercial (las gamas estrella primero); el nombre bonito y el
 * gancho corto son para las tarjetas de la página de marca. Una línea que llegue
 * nueva y no esté aquí se muestra igual, con su nombre tal cual.
 */
export const LINEAS_OWNAT: { slug: string; nombre: string; gancho: string }[] = [
  { slug: 'author', nombre: 'Author', gancho: 'Carnes frescas en alta proporción' },
  { slug: 'prime-grain-free', nombre: 'Prime Grain Free', gancho: 'Sin cereales, alta proteína' },
  { slug: 'just-grain-free', nombre: 'Just Grain Free', gancho: 'Monoproteico sin cereales' },
  { slug: 'hypo-grain-free', nombre: 'Hypo Grain Free', gancho: 'Hipoalergénico, sin cereales' },
  { slug: 'ultra', nombre: 'Ultra', gancho: 'Nutrición superior cada día' },
  { slug: 'ultra-profesional', nombre: 'Ultra Profesional', gancho: 'Fórmulas profesionales' },
  { slug: 'classic', nombre: 'Classic', gancho: 'La receta equilibrada de siempre' },
  { slug: 'care', nombre: 'Care', gancho: 'Dietas para necesidades específicas' },
  { slug: 'wetline', nombre: 'Wet Line', gancho: 'Comida húmeda en lata' },
  { slug: 'salmon-oil', nombre: 'Salmon Oil', gancho: 'Aceite de salmón, omega 3' },
];

export function nombreLinea(slug: string): string {
  return LINEAS_OWNAT.find((l) => l.slug === slug)?.nombre ?? slug;
}

/** `true` si el producto es de gato (su nombre empieza por «CAT»). */
export function esDeGato(nombre: string): boolean {
  return /^cat\b/i.test(nombre.trim());
}

let cache: Catalogo | null = null;
let enVuelo: Promise<Catalogo> | null = null;

async function cargar(): Promise<Catalogo> {
  const res = await fetch('/ownat-catalogo.json');
  if (!res.ok) throw new Error('No se pudo cargar el catálogo de Ownat');
  return (await res.json()) as Catalogo;
}

export function useOwnatCatalogo(): { catalogo: Catalogo | null; cargando: boolean; error: boolean } {
  const [estado, setEstado] = useState<{ catalogo: Catalogo | null; cargando: boolean; error: boolean }>(
    cache ? { catalogo: cache, cargando: false, error: false } : { catalogo: null, cargando: true, error: false },
  );

  useEffect(() => {
    if (cache) return;
    let vivo = true;
    enVuelo ??= cargar();
    enVuelo
      .then((c) => {
        cache = c;
        if (vivo) setEstado({ catalogo: c, cargando: false, error: false });
      })
      .catch(() => {
        enVuelo = null;
        if (vivo) setEstado({ catalogo: null, cargando: false, error: true });
      });
    return () => {
      vivo = false;
    };
  }, []);

  return estado;
}

/** Las líneas que de verdad tienen producto, en el orden de {@link LINEAS_OWNAT}. */
export function lineasConProducto(cat: Catalogo): { slug: string; nombre: string; gancho: string; imagen: string | null; total: number }[] {
  const porLinea = new Map<string, number>();
  for (const p of cat.productos) porLinea.set(p.lineaSlug, (porLinea.get(p.lineaSlug) ?? 0) + 1);
  const foto = new Map(cat.lineas.map((l) => [l.lineaSlug, l.imagen]));
  const orden = new Map(LINEAS_OWNAT.map((l, i) => [l.slug, i]));
  return [...porLinea.keys()]
    .map((slug) => {
      const meta = LINEAS_OWNAT.find((l) => l.slug === slug);
      return {
        slug,
        nombre: meta?.nombre ?? nombreLinea(slug),
        gancho: meta?.gancho ?? '',
        imagen: foto.get(slug) ?? null,
        total: porLinea.get(slug) ?? 0,
      };
    })
    .sort((a, b) => (orden.get(a.slug) ?? 99) - (orden.get(b.slug) ?? 99));
}

export function productosDeLinea(cat: Catalogo, lineaSlug: string): ProductoOwnat[] {
  return cat.productos
    .filter((p) => p.lineaSlug === lineaSlug)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export function productoPorSlug(cat: Catalogo, slug: string): ProductoOwnat | undefined {
  return cat.productos.find((p) => p.slug === slug);
}
