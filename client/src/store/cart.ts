import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CartLine = {
  productId: string;
  variantId?: string;
  slug: string;
  name: string;
  variantLabel?: string;
  image: string;
  unitPrice: number;
  quantity: number;
};

type CartState = {
  lines: CartLine[];
  isOpen: boolean;
  add: (line: CartLine) => void;
  remove: (key: string) => void;
  setQty: (key: string, quantity: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

/** Clave única de una línea = producto + variante. */
export const lineKey = (l: { productId: string; variantId?: string }) =>
  `${l.productId}:${l.variantId ?? 'base'}`;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      isOpen: false,
      add: (line) =>
        set((state) => {
          const key = lineKey(line);
          const existing = state.lines.find((l) => lineKey(l) === key);
          if (existing) {
            return {
              isOpen: true,
              lines: state.lines.map((l) =>
                lineKey(l) === key ? { ...l, quantity: l.quantity + line.quantity } : l,
              ),
            };
          }
          return { isOpen: true, lines: [...state.lines, line] };
        }),
      remove: (key) => set((state) => ({ lines: state.lines.filter((l) => lineKey(l) !== key) })),
      setQty: (key, quantity) =>
        set((state) => ({
          lines: state.lines
            .map((l) => (lineKey(l) === key ? { ...l, quantity: Math.max(1, quantity) } : l))
            .filter((l) => l.quantity > 0),
        })),
      clear: () => set({ lines: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),
    }),
    { name: 'nutripet-cart' },
  ),
);

export const selectCount = (s: CartState) => s.lines.reduce((n, l) => n + l.quantity, 0);
export const selectSubtotal = (s: CartState) =>
  s.lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
