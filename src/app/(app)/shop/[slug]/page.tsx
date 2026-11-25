"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Check, PackageSearch, ShoppingCart, Star, Truck } from "lucide-react";
import { Badge, Button, EmptyState, useToast } from "@/components/ui";
import { useShop } from "@/components/shop-context";
import { ProductArt, ProductCard, QtyStepper } from "@/components/shop-ui";
import { PRODUCTS, productBySlug, rupiah } from "@/lib/shop-data";

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const product = productBySlug(params.slug);
  const [qty, setQty] = useState(1);
  const { add } = useShop();
  const toast = useToast();

  if (!product) return <div className="animate-in"><Link href="/shop" className="mb-4 inline-flex items-center gap-1 text-sm text-electric"><ArrowLeft className="h-4 w-4" />Kembali ke toko</Link>
    <EmptyState icon={<PackageSearch className="h-5 w-5" />} title="Produk tidak ditemukan" text="Produk ini mungkin sudah tidak tersedia." /></div>;

  const related = PRODUCTS.filter((p) => p.category === product.category && p.slug !== product.slug).slice(0, 4);

  return (
    <div className="animate-in">
      <Link href="/shop" className="mb-5 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-electric"><ArrowLeft className="h-4 w-4" />Kembali ke toko</Link>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <ProductArt product={product} className="aspect-square w-full rounded-2xl" />
          <div className="flex gap-3">{PRODUCTS.filter((p) => p.slug !== product.slug).slice(0, 4).map((p) => <ProductArt key={p.slug} product={p} className="h-16 w-16 rounded-lg" />)}</div>
        </div>
        <div className="space-y-5">
          <div>
            <div className="mb-2 flex items-center gap-2"><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{product.category}</span>{product.badge && <Badge className="bg-electric/10 text-electric">{product.badge}</Badge>}</div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{product.name}</h1>
            <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{product.rating} · {product.sold} terjual</div>
          </div>
          <div><p className="text-3xl font-semibold text-electric">{rupiah(product.price)}</p>{product.oldPrice && <p className="text-sm text-muted-foreground line-through">{rupiah(product.oldPrice)}</p>}</div>
          <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>
          <ul className="space-y-2">{product.highlights.map((h) => <li key={h} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-success" />{h}</li>)}</ul>
          <div className="rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground"><span className="flex items-center gap-2"><Truck className="h-4 w-4 text-electric" />Estimasi pengiriman 3–5 hari kerja (bisa dipilih saat checkout).</span></div>
          <div className="flex flex-wrap items-center gap-3">
            <QtyStepper value={qty} onChange={setQty} label="Jumlah produk" />
            <Button variant="outline" onClick={() => { add(product.slug, qty); toast(`${product.name} × ${qty} masuk keranjang`); }}><ShoppingCart className="h-4 w-4" />Tambah ke keranjang</Button>
            <Button variant="accent" onClick={() => { add(product.slug, qty); router.push("/shop/checkout"); }}>Beli sekarang</Button>
          </div>
        </div>
      </div>

      {!!related.length && <section className="mt-10"><h2 className="mb-4 text-lg font-semibold">Produk serupa</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{related.map((p) => <ProductCard key={p.slug} product={p} />)}</div></section>}
    </div>
  );
}
