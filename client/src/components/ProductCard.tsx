import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import type { Product } from '@/lib/types';
import { cn, eur } from '@/lib/cn';
import { useCart } from '@/store/cart';
import { toast } from '@/store/toast';

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: (index % 4) * 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to={`/producto/${product.slug}`}
        className="group relative flex h-full flex-col overflow-hidden rounded-4xl border border-brand-900/[0.06] bg-white/80 shadow-soft backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
      >
        <div className="relative aspect-square overflow-hidden bg-cream-200">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {hasDiscount && (
              <span className="rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-ink shadow-soft">
                -{Math.round((1 - price / product.compareAt!) * 100)}%
              </span>
            )}
            {product.bestseller && (
              <span className="rounded-full bg-brand-900 px-2.5 py-1 text-xs font-semibold text-cream">
                Top ventas
              </span>
            )}
          </div>
          <button
            onClick={quickAdd}
            aria-label="Añadir al carrito"
            className="absolute bottom-3 right-3 flex h-11 w-11 translate-y-2 items-center justify-center rounded-full bg-brand-600 text-cream opacity-0 shadow-lift transition-all duration-300 hover:bg-brand-700 group-hover:translate-y-0 group-hover:opacity-100"
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
                <span className="mr-1 text-xs font-medium text-brand-900/50">desde</span>
              )}
              {eur(price)}
            </span>
            {hasDiscount && (
              <span className="text-sm text-brand-900/40 line-through">{eur(product.compareAt)}</span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
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
