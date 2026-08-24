import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import type { Product } from '@/lib/types';
import { cn, eur } from '@/lib/cn';
import { useCart } from '@/store/cart';
import { ImagenProducto } from './ImagenProducto';
import { toast } from '@/store/toast';

export function ProductCard({ product }: { product: Product }) {
  const add = useCart((s) => s.add);
  const cheapest = product.variants[0];
  const price = cheapest?.price ?? product.price;
  const hasDiscount = product.compareAt != null && product.compareAt > price;

  /*
   * Disponibilidad, sólo cuando es fiable y sólo cuando dice algo.
   *
   * Se anuncia Únicamente el caso negativo —no queda ninguna unidad de ninguna
   * variante—, porque es el único que le cambia la decisión a quien mira. Nada
   * de «¡sólo quedan 3!»: el stock de la semilla es alto y uniforme, y crear
   * urgencia con él sería inventarse una escasez que no existe.
   *
   * Y esto es INFORMATIVO: quien decide de verdad si se puede comprar es el
   * servidor, en la reserva de la Fase 1. Aquí sólo se evita el paseo.
   */
  const sinExistencias = product.variants.length > 0 && product.variants.every((v) => v.stock <= 0);
  /* Los formatos disponibles: «2 kg · 11,4 kg» dice más que «desde 34,50 €» solo. */
  const formatos = product.variants.map((v) => v.label);

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
        {/*
          CONTENER, NO RECORTAR.

          Estaba en `object-cover`, que llena el cuadrado recortando lo que
          sobra. Para una foto de paisaje da igual; para el envase de un producto
          es justo lo que no se puede hacer: recorta el saco, corta la etiqueta y
          se lleva por delante la parte por la que alguien reconoce lo que está
          comprando.

          Con `object-contain` y un poco de aire alrededor, el envase entero se
          ve siempre. La rejilla no se descuadra porque el marco sigue siendo un
          cuadrado fijo.
        */}
        <div className="relative aspect-square overflow-hidden bg-cream-200 p-4 sm:p-5">
          <ImagenProducto
            product={product}
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.04]"
          />
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {hasDiscount && (
              <span className="rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-ink shadow-soft">
                -{Math.round((1 - price / product.compareAt!) * 100)}%
              </span>
            )}
            {/*
              Aquí ponía «Top ventas» sobre un dato que dice lo contrario —en los
              pedidos pagados, los marcados venden MENOS que el resto—, y en la
              2B pasó a «Recomendado». En la 2C se retira del listado del todo:
              siete de veintiocho productos la llevan, así que en una rejilla
              aparecía en una de cada cuatro tarjetas y dejaba de distinguir
              nada. Lo que la tienda destaca ya tiene su sitio en la portada.

              En la tarjeta se queda SÓLO el descuento, que es un dato duro y
              cambia la decisión de compra.
            */}
            {sinExistencias && (
              <span className="rounded-full bg-content px-2.5 py-1 text-xs font-semibold text-cream">
                Sin stock
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
          {!sinExistencias && (
          <button
            onClick={quickAdd}
            aria-label={`Añadir ${product.name} al carrito`}
            className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-cream shadow-raised transition-all duration-300 hover:bg-brand-700 focus-visible:opacity-100 sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:focus-visible:translate-y-0"
          >
            <Plus className="h-5 w-5" />
          </button>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">
            {product.brand.name}
          </span>
          <h3 className="line-clamp-2 font-display text-[0.98rem] font-semibold leading-snug text-ink">
            {product.name}
          </h3>
          {formatos.length > 1 && (
            <p className="text-caption text-content-subtle">{formatos.join(' · ')}</p>
          )}
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
