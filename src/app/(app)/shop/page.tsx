"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PackageSearch, ReceiptText, Search, ShoppingBag, ShoppingCart } from "lucide-react";
import { Badge, Button, EmptyState, Input, PageHeader, Select } from "@/components/ui";
import { useShop } from "@/components/shop-context";
import { ProductCard } from "@/components/shop-ui";
import { CATEGORIES, PRODUCTS } from "@/lib/shop-data";
import { cn } from "@/lib/utils";

export default function ShopPage() {
  const { count, hydrated } = useShop();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("Semua");
  const [sort, setSort] = useState("popular");

  const products = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const found = PRODUCTS.filter((p) =>
      (cat === "Semua" || p.category === cat) &&
      (!needle || `${p.name} ${p.description} ${p.category}`.toLowerCase().includes(needle)));
    if (sort === "murah") return [...found].sort((a, b) => a.price - b.price);
    if (sort === "mahal") return [...found].sort((a, b) => b.price - a.price);
    if (sort === "rating") return [...found].sort((a, b) => b.rating - a.rating);
    return [...found].sort((a, b) => b.sold - a.sold);
  }, [q, cat, sort]);

  return (
    <div className="animate-in">
      <PageHeader title="Toko Annas AI Studio" subtitle="Katalog produk digital dan merchandise resmi tim — dibuat dan diuji langsung di website karyawan AI."
        actions={<>
          <Link href="/shop/orders"><Button variant="outline" size="sm"><ReceiptText className="h-4 w-4" />Pesanan</Button></Link>
          <Link href="/shop/cart"><Button variant="accent" size="sm"><ShoppingCart className="h-4 w-4" />Keranjang{hydrated && count > 0 && <Badge className="bg-white/20">{count}</Badge>}</Button></Link>
        </>} />

      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-[#0a1530] via-[#12306b] to-[#2563eb] p-6 text-white sm:p-8">
        <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative max-w-xl">
          <Badge className="mb-3 bg-white/15 text-white">Katalog resmi</Badge>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Alat kerja & merchandise untuk tim AI.</h2>
          <p className="mt-2 text-sm text-white/75">Dari template alur kerja sampai perlengkapan meja. Semua produk di sini adalah data contoh untuk demonstrasi toko.</p>
          <Link href="/shop/cart" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-[#0a1530] hover:bg-white/90"><ShoppingBag className="h-4 w-4" />Lihat keranjang</Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c}
            className={cn("rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors", cat === c ? "border-electric bg-electric text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
            {c}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">{products.length} produk</span>
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari produk…" aria-label="Cari produk" className="pl-9" /></div>
        <Select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Urutkan produk" className="w-44">
          <option value="popular">Paling laris</option><option value="murah">Harga terendah</option><option value="mahal">Harga tertinggi</option><option value="rating">Rating tertinggi</option>
        </Select>
      </div>

      {products.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => <ProductCard key={p.slug} product={p} />)}
        </div>
      ) : (
        <EmptyState icon={<PackageSearch className="h-5 w-5" />} title="Produk tidak ditemukan" text="Coba kata kunci lain atau pilih kategori berbeda." />
      )}
    </div>
  );
}
