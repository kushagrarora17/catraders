import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface QuoteItem {
  productId: string;
  title: string;
  sku?: string;
  slug: string;
  quantity: number;
}

interface QuoteStore {
  items: QuoteItem[];
  addItem: (item: QuoteItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearQuote: () => void;
}

export const useQuoteStore = create<QuoteStore>()(
  persist(
    (set) => ({
      items: [],
      addItem: (newItem) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === newItem.productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === newItem.productId
                  ? { ...i, quantity: i.quantity + newItem.quantity }
                  : i
              ),
            };
          }
          return { items: [...state.items, newItem] };
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),
      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i
          ),
        })),
      clearQuote: () => set({ items: [] }),
    }),
    {
      name: "automotive-quote-basket",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
