import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  key: string;
  kind: "product" | "bundle";
  slug: string;
  name: string;
  unitPricePence: number;
  quantity: number;
  configuration: Record<string, unknown>;
  deliveryEstimate?: string | null;
};

export type CartPlan = {
  slug: string;
  name: string;
  pricePence: number;
} | null;

type CartState = {
  items: CartItem[];
  plan: CartPlan;
  addItem: (item: Omit<CartItem, "key" | "quantity"> & { quantity?: number }) => void;
  removeItem: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  setPlan: (plan: CartPlan) => void;
  clear: () => void;
  count: number;
  oneTimeTotalPence: number;
  monthlyTotalPence: number;
};

const STORAGE_KEY = "nf24-store-cart";

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [plan, setPlan] = useState<CartPlan>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setItems(Array.isArray(parsed.items) ? parsed.items : []);
        setPlan(parsed.plan ?? null);
      }
    } catch {
      /* ignore malformed cart */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, plan }));
    } catch {
      /* storage unavailable */
    }
  }, [items, plan]);

  const addItem: CartState["addItem"] = useCallback((item) => {
    setItems((prev) => [
      ...prev,
      {
        ...item,
        quantity: item.quantity ?? 1,
        key: `${item.slug}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      },
    ]);
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, quantity: Math.max(1, Math.min(20, quantity)) } : i)),
    );
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    setPlan(null);
  }, []);

  const value = useMemo<CartState>(() => {
    const oneTimeTotalPence = items.reduce((sum, i) => sum + i.unitPricePence * i.quantity, 0);
    return {
      items,
      plan,
      addItem,
      removeItem,
      setQuantity,
      setPlan,
      clear,
      count: items.reduce((sum, i) => sum + i.quantity, 0),
      oneTimeTotalPence,
      monthlyTotalPence: plan?.pricePence ?? 0,
    };
  }, [items, plan, addItem, removeItem, setQuantity, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
