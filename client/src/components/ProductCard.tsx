import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import type { Product } from '@/lib/types';
import { cn, eur } from '@/lib/cn';
import { useCart } from '@/store/cart';
import { toast } from '@/store/toast';

export function ProductCard({ product }: { product: Product }) {
  const add = useCart((s) => s.add);
  const cheapest = product.variants[0];
  const price = cheapest?.price ?? product.price;
  const hasDiscount = product.compareAt != null && product.compareAt > price;

  const quickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    add({
      productId: product.id,
      variantId: cheapest?.id,
      slug: product.slug,
      name: product.name,
      variantLabel: cheapest?.label,
      image: product.image,
      unitPrice: price,
      quantity: 1,
    });
    toast.success(`${product.name} añadido al carrito`);
  };

  /*
   * SIN ANIMACIÓN DE ENTRADA, y a propósito.
   *
   * Cada tarjeta nacía con `opacity: 0` y esperaba a que `whileInView` la
   * revelara. Comprobado en el navegador: con la rejilla ENTERA a la vista,
   * tres de las siete tarjetas se quedaban en `opacity: 0`. En una tienda eso
   * significa productos que no existen para quien mira.
   *
   * Un escalonado bonito no compensa el riesgo de que no se vea la mercancía.
   */
  return (
    <div>
      <Link
        to={`/producto/${product.slug}`}
        className="group relative flex h-full flex-col overflow-hidden rounded-4xl border border-brand-900/[0.06] bg-white/80 shadow-soft backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
      >
        <div className="relative aspect-square overflow-hidden bg-cream-200">
          <img
            src={product.image}
            alt={product.name}
            width={800}
            height={800}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {hasDiscount && (
              <span className="rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-ink shadow-soft">
                -{Math.round((1 - price / product.compareAt!) * 100)}%
              </span>
            )}
            {/*
              Decía «Top ventas», y no lo sostiene ningún dato: `bestseller` es una
              marca que se pone a mano, no un recuento de pedidos. Contrastado
              contra los pedidos pagados, los siete productos marcados suman
              MENOS unidades que el resto del catálogo, así que la etiqueta decía
              justo lo contrario de lo que pasa.
              «Recomendado» sí es cierto: es lo que la tienda elige destacar.
            */}
            {product.bestseller && (
              <span className="rounded-full bg-brand-900 px-2.5 py-1 text-xs font-semibold text-cream">
                Recomendado
              </span>
            )}
          </div>
          {/*
            Estaba en `opacity-0` hasta pasar el ratón por encima. Dos problemas:
            en un móvil NO HAY hover, así que el atajo no existía en el
            dispositivo donde más se compra; y seguía siendo enfocable, o sea
            que con el tabulador se llegaba a un botón invisible.

            Ahora se ve siempre por debajo de `sm` —donde no hay puntero— y
            aparece al enfocarlo con el teclado.
          */}
          <button
            onClick={quickAdd}
            aria-label={`Añadir ${product.name} al carrito`}
            className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-cream shadow-raised transition-all duration-300 hover:bg-brand-700 focus-visible:opacity-100 sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:focus-visible:translate-y-0"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">
            {product.brand.name}
          </span>
          <h3 className="line-clamp-2 font-display text-[0.98rem] font-semibold leading-snug text-ink">
            {product.name}
          </h3>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="font-display text-lg font-bold text-brand-800">
              {cheapest && product.variants.length > 1 && (
                <span className="mr-1 text-xs font-medium text-content-subtle">desde</span>
              )}
              {eur(price)}
            </span>
            {hasDiscount && (
              <span className="text-sm text-content-subtle line-through">{eur(product.compareAt)}</span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-4xl border border-brand-900/5 bg-white/60', className)}>
      <div className="aspect-square rounded-4xl bg-cream-200" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-16 rounded bg-cream-200" />
        <div className="h-4 w-3/4 rounded bg-cream-200" />
        <div className="h-5 w-20 rounded bg-cream-200" />
      </div>
    </div>
  );
}
