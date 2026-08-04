import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { lineKey, selectSubtotal, useCart } from '@/store/cart';
import { eur } from '@/lib/cn';

const FREE_SHIPPING = 49;

export function CartDrawer() {
  const { lines, isOpen, close, setQty, remove } = useCart();
  const subtotal = useCart(selectSubtotal);
  const remaining = Math.max(0, FREE_SHIPPING - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING) * 100);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.aside
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-cream shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <header className="flex items-center justify-between border-b border-brand-900/10 px-6 py-5">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
                <ShoppingBag className="h-5 w-5 text-brand-600" /> Tu carrito
              </h2>
              <button onClick={close} className="rounded-full p-2 text-brand-900/60 hover:bg-brand-900/5" aria-label="Cerrar">
                <X className="h-5 w-5" />
              </button>
            </header>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100">
                  <ShoppingBag className="h-9 w-9 text-brand-500" />
                </div>
                <p className="text-brand-900/60">Tu carrito está vacío.</p>
                <button onClick={close} className="btn-primary">
                  Explorar productos
                </button>
              </div>
            ) : (
              <>
                <div className="border-b border-brand-900/10 px-6 py-4">
                  <p className="mb-2 text-sm text-brand-900/70">
                    {remaining > 0 ? (
                      <>Te faltan <strong className="text-brand-700">{eur(remaining)}</strong> para el envío gratis 🎉</>
                    ) : (
                      <strong className="text-brand-700">¡Tienes envío gratis! 🎉</strong>
                    )}
                  </p>
                  <div className="h-2 overflow-hidden rounded-full bg-brand-900/10">
                    <motion.div
                      className="h-full rounded-full bg-brand-500"
                      animate={{ width: `${progress}%` }}
                      transition={{ ease: 'easeOut' }}
                    />
                  </div>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
                  {lines.map((l) => {
                    const key = lineKey(l);
                    return (
                      <div key={key} className="flex gap-3">
                        <img src={l.image} alt={l.name} className="h-20 w-20 rounded-2xl object-cover" />
                        <div className="flex flex-1 flex-col">
                          <div className="flex justify-between gap-2">
                            <p className="line-clamp-2 text-sm font-semibold text-ink">{l.name}</p>
                            <button onClick={() => remove(key)} className="text-brand-900/40 hover:text-red-500" aria-label="Quitar">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          {l.variantLabel && <p className="text-xs text-brand-900/50">{l.variantLabel}</p>}
                          <div className="mt-auto flex items-center justify-between">
                            <div className="flex items-center gap-1 rounded-full border border-brand-900/10 bg-white">
                              <button onClick={() => setQty(key, l.quantity - 1)} className="p-1.5 text-brand-900/60 hover:text-brand-700" aria-label="Menos">
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-6 text-center text-sm font-semibold">{l.quantity}</span>
                              <button onClick={() => setQty(key, l.quantity + 1)} className="p-1.5 text-brand-900/60 hover:text-brand-700" aria-label="Más">
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <span className="font-display font-bold text-brand-800">{eur(l.unitPrice * l.quantity)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <footer className="space-y-3 border-t border-brand-900/10 px-6 py-5">
                  <div className="flex justify-between text-sm text-brand-900/70">
                    <span>Subtotal</span>
                    <span className="font-display text-lg font-bold text-ink">{eur(subtotal)}</span>
                  </div>
                  <Link to="/checkout" onClick={close} className="btn-primary w-full py-3.5 text-base">
                    Finalizar compra
                  </Link>
                  <button onClick={close} className="w-full text-center text-sm font-medium text-brand-900/50 hover:text-brand-700">
                    Seguir comprando
                  </button>
                </footer>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
