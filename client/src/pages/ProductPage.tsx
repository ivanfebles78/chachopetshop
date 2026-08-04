import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ChevronRight, Minus, Plus, ShoppingBag, Truck } from 'lucide-react';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { cn, eur } from '@/lib/cn';
import { Rating } from '@/components/Rating';
import { ProductCard } from '@/components/ProductCard';
import { ErrorState } from '@/components/ErrorState';
import { useCart } from '@/store/cart';
import { toast } from '@/store/toast';

export function ProductPage() {
  const { slug = '' } = useParams();
  const { data, loading, error, refetch } = useFetch(() => api.product(slug), [slug]);
  const add = useCart((s) => s.add);

  const [variantId, setVariantId] = useState<string | undefined>();
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (loading) return <div className="container-page py-20 text-center text-brand-900/50">Cargando…</div>;
  if (error) return <div className="container-page py-16"><ErrorState message={error} onRetry={refetch} /></div>;
  if (!data) return <div className="container-page py-20 text-center text-brand-900/50">Producto no encontrado.</div>;

  const { product, related } = data;
  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];
  const price = variant?.price ?? product.price;
  const gallery = product.gallery.length ? product.gallery : [product.image];
  const hasDiscount = product.compareAt != null && product.compareAt > price;

  const handleAdd = () => {
    add({
      productId: product.id,
      variantId: variant?.id,
      slug: product.slug,
      name: product.name,
      variantLabel: variant?.label,
      image: product.image,
      unitPrice: price,
      quantity: qty,
    });
    setAdded(true);
    toast.success(`${product.name} añadido al carrito`);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div className="container-page py-8">
      <nav className="mb-6 flex items-center gap-1 text-sm text-brand-900/50">
        <Link to="/" className="hover:text-brand-700">Inicio</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to="/tienda" className="hover:text-brand-700">Tienda</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-brand-900/80">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Galería */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <motion.div
            key={activeImg}
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 1 }}
            className="aspect-square overflow-hidden rounded-5xl border border-brand-900/[0.06] bg-cream-200 shadow-soft"
          >
            <img src={gallery[activeImg]} alt={product.name} className="h-full w-full object-cover" />
          </motion.div>
          {gallery.length > 1 && (
            <div className="mt-3 flex gap-3">
              {gallery.map((g, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={cn(
                    'h-20 w-20 overflow-hidden rounded-2xl border-2 transition-colors',
                    i === activeImg ? 'border-brand-600' : 'border-transparent opacity-70 hover:opacity-100',
                  )}
                >
                  <img src={g} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <Link to={`/tienda?brand=${product.brand.slug}`} className="text-sm font-bold uppercase tracking-wide text-brand-600 hover:text-brand-700">
            {product.brand.name}
          </Link>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">{product.name}</h1>
          <div className="mt-3"><Rating value={product.rating} reviews={product.reviews} /></div>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="font-display text-4xl font-extrabold text-brand-700">{eur(price)}</span>
            {hasDiscount && <span className="text-xl text-brand-900/40 line-through">{eur(product.compareAt)}</span>}
            {hasDiscount && (
              <span className="rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-ink">
                Ahorra {eur(product.compareAt! - price)}
              </span>
            )}
          </div>

          <p className="mt-5 leading-relaxed text-brand-900/70">{product.description}</p>

          {/* Etiquetas de necesidad */}
          {product.needs.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {product.needs.map((n) => (
                <Link key={n.id} to={`/tienda?need=${n.slug}`} className="chip">{n.name}</Link>
              ))}
            </div>
          )}

          {/* Variantes */}
          {product.variants.length > 1 && (
            <div className="mt-7">
              <p className="mb-2 text-sm font-bold text-brand-900/70">Formato</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setVariantId(v.id)}
                    className={cn(
                      'rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-all',
                      v.id === variant?.id
                        ? 'border-brand-600 bg-brand-600 text-cream shadow-soft'
                        : 'border-brand-900/10 bg-white text-brand-900/80 hover:border-brand-400',
                    )}
                  >
                    {v.label}
                    <span className={cn('ml-2', v.id === variant?.id ? 'text-cream/80' : 'text-brand-900/50')}>{eur(v.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cantidad + añadir */}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-full border border-brand-900/10 bg-white p-1">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="rounded-full p-2.5 text-brand-900/60 hover:bg-brand-900/5" aria-label="Menos"><Minus className="h-4 w-4" /></button>
              <span className="w-8 text-center font-display font-bold">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="rounded-full p-2.5 text-brand-900/60 hover:bg-brand-900/5" aria-label="Más"><Plus className="h-4 w-4" /></button>
            </div>
            <button onClick={handleAdd} className={cn('btn-primary flex-1 py-3.5 text-base transition-colors', added && 'bg-brand-700')}>
              {added ? <><Check className="h-5 w-5" /> ¡Añadido!</> : <><ShoppingBag className="h-5 w-5" /> Añadir · {eur(price * qty)}</>}
            </button>
          </div>

          <div className="mt-5 flex items-center gap-2 rounded-2xl bg-brand-100/60 px-4 py-3 text-sm text-brand-800">
            <Truck className="h-4 w-4" /> Envío gratis en pedidos +49€ · Entrega 24-48h
          </div>
        </div>
      </div>

      {/* Relacionados */}
      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-6 font-display text-2xl font-bold text-ink sm:text-3xl">También te puede gustar</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </section>
      )}
    </div>
  );
}
