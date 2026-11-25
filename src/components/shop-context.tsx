"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { PRODUCTS, SHIPPING, productBySlug, type Product, type ShippingMethod } from "@/lib/shop-data";

export type CartLine = { slug: string; qty: number };
export type OrderItem = { slug: string; name: string; qty: number; price: number };
export type Order = {
  id: string;
  createdAt: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  method: ShippingMethod;
  customer: { name: string; email: string; phone: string; address: string; city: string; zip: string };
};

type ShopValue = {
  hydrated: boolean;
  lines: CartLine[];
  items: { product: Product; qty: number }[];
  count: number;
  subtotal: number;
  add: (slug: string, qty?: number) => void;
  setQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
  orders: Order[];
  placeOrder: (input: { method: ShippingMethod; customer: Order["customer"] }) => Order | null;
};

const ShopCtx = createContext<ShopValue | null>(null);
const CART_KEY = "aas-shop-cart-v1";
const ORDER_KEY = "aas-shop-orders-v1";

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeLocal(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage penuh / private mode */ }
}
function cleanLines(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x): x is CartLine =>
      !!x && typeof x === "object" &&
      typeof (x as CartLine).slug === "string" &&
      Number.isFinite((x as CartLine).qty) &&
      PRODUCTS.some((p) => p.slug === (x as CartLine).slug))
    .map((x) => ({ slug: x.slug, qty: Math.max(1, Math.min(99, Math.floor(x.qty))) }));
}
function cleanOrders(value: unknown): Order[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is Order => !!x && typeof x === "object" && typeof (x as Order).id === "string" && Array.isArray((x as Order).items));
}
function orderId() {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AG-${stamp}-${suffix}`;
}

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    setLines(cleanLines(readLocal(CART_KEY, [])));
    setOrders(cleanOrders(readLocal(ORDER_KEY, [])));
    setHydrated(true);
  }, []);

  const add = useCallback((slug: string, qty = 1) => {
    if (!productBySlug(slug)) return;
    setLines((cur) => {
      const found = cur.find((l) => l.slug === slug);
      const next = found
        ? cur.map((l) => l.slug === slug ? { ...l, qty: Math.min(99, l.qty + qty) } : l)
        : [...cur, { slug, qty: Math.max(1, Math.min(99, qty)) }];
      writeLocal(CART_KEY, next);
      return next;
    });
  }, []);

  const setQty = useCallback((slug: string, qty: number) => {
    setLines((cur) => {
      const next = qty <= 0
        ? cur.filter((l) => l.slug !== slug)
        : cur.map((l) => l.slug === slug ? { ...l, qty: Math.min(99, Math.floor(qty)) } : l);
      writeLocal(CART_KEY, next);
      return next;
    });
  }, []);

  const remove = useCallback((slug: string) => {
    setLines((cur) => { const next = cur.filter((l) => l.slug !== slug); writeLocal(CART_KEY, next); return next; });
  }, []);

  const clear = useCallback(() => { setLines([]); writeLocal(CART_KEY, []); }, []);

  const items = useMemo(
    () => lines.flatMap((l) => { const product = productBySlug(l.slug); return product ? [{ product, qty: l.qty }] : []; }),
    [lines],
  );
  const count = useMemo(() => items.reduce((n, i) => n + i.qty, 0), [items]);
  const subtotal = useMemo(() => items.reduce((n, i) => n + i.product.price * i.qty, 0), [items]);

  const placeOrder = useCallback(({ method, customer }: { method: ShippingMethod; customer: Order["customer"] }) => {
    if (!items.length) return null;
    const shipping = SHIPPING[method].price;
    const order: Order = {
      id: orderId(), createdAt: new Date().toISOString(),
      items: items.map((i) => ({ slug: i.product.slug, name: i.product.name, qty: i.qty, price: i.product.price })),
      subtotal, shipping, total: subtotal + shipping, method, customer,
    };
    setOrders((cur) => { const next = [order, ...cur].slice(0, 20); writeLocal(ORDER_KEY, next); return next; });
    clear();
    return order;
  }, [items, subtotal, clear]);

  const value = useMemo(() => ({ hydrated, lines, items, count, subtotal, add, setQty, remove, clear, orders, placeOrder }),
    [hydrated, lines, items, count, subtotal, add, setQty, remove, clear, orders, placeOrder]);

  return <ShopCtx.Provider value={value}>{children}</ShopCtx.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopCtx);
  if (!ctx) throw new Error("useShop harus dipakai di dalam ShopProvider");
  return ctx;
}
