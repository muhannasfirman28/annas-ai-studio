"use client";
import Link from "next/link";
import { Minus, Plus, ShoppingCart, Star } from "lucide-react";
import { Badge, Button, useToast } from "./ui";
import { cn } from "@/lib/utils";
import { rupiah, type Product } from "@/lib/shop-data";
import { useShop } from "./shop-context";

export function ProductArt({ product, className }: { product: Product; className?: string }) {
  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden rounded-xl", className)}
      style={{ background: `linear-gradient(135deg, ${product.colors[0]}, ${product.colors[1]})` }}>
      <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "radial-gradient(circle at 22% 18%, white 0, transparent 46%), radial-gradient(circle at 82% 88%, white 0, transparent 40%)" }} />
      <span className="relative select-none leading-none" style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }} aria-hidden>{product.emoji}</span>
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const { add } = useShop();
  const toast = useToast();
  return (
    <div className="group rounded-2xl border bg-card p-3 shadow-soft transition-transform hover:-translate-y-0.5 hover:shadow-lg">
      <Link href={`/shop/${product.slug}`} className="block" aria-label={`Lihat ${product.name}`}>
        <ProductArt product={product} className="aspect-[4/3] w-full" />
      </Link>
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{product.category}</span>
          {product.badge && <Badge className="bg-electric/10 text-electric">{product.badge}</Badge>}
        </div>
        <Link href={`/shop/${product.slug}`} className="block truncate font-semibold hover:text-electric">{product.name}</Link>
        <div className="flex items-center gap-1 text-xs text-muted-foreground"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{product.rating} · {product.sold} terjual</div>
        <div className="flex items-end justify-between gap-2 pt-1">
          <div><p className="font-semibold text-electric">{rupiah(product.price)}</p>{product.oldPrice && <p className="text-xs text-muted-foreground line-through">{rupiah(product.oldPrice)}</p>}</div>
          <Button size="icon" variant="accent" aria-label={`Tambah ${product.name} ke keranjang`}
            onClick={() => { add(product.slug); toast(`${product.name} ditambahkan ke keranjang`); }}><ShoppingCart className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}

export function QtyStepper({ value, onChange, min = 1, max = 99, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label?: string }) {
  return (
    <div className="inline-flex items-center rounded-lg border" aria-label={label}>
      <button type="button" className="flex h-8 w-8 items-center justify-center rounded-l-lg hover:bg-muted disabled:opacity-40" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Kurangi jumlah"><Minus className="h-3.5 w-3.5" /></button>
      <span className="w-9 text-center text-sm font-medium tabular-nums" aria-live="polite">{value}</span>
      <button type="button" className="flex h-8 w-8 items-center justify-center rounded-r-lg hover:bg-muted disabled:opacity-40" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Tambah jumlah"><Plus className="h-3.5 w-3.5" /></button>
    </div>
  );
}
