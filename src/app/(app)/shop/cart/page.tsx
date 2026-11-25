"use client";
import Link from "next/link";
import { ArrowLeft, ShoppingCart, Trash2 } from "lucide-react";
import { Button, Card, EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { useShop } from "@/components/shop-context";
import { ProductArt, QtyStepper } from "@/components/shop-ui";
import { rupiah, SHIPPING } from "@/lib/shop-data";

export default function CartPage() {
  const { hydrated, items, count, subtotal, setQty, remove } = useShop();

  return (
    <div className="animate-in">
      <PageHeader title="Keranjang" subtitle={`${count} item dalam keranjang belanjamu.`}
        actions={<Link href="/shop"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4" />Lanjut belanja</Button></Link>} />

      {!hydrated ? <Skeleton className="h-64" /> : items.length === 0 ? (
        <EmptyState icon={<ShoppingCart className="h-5 w-5" />} title="Keranjang masih kosong" text="Tambahkan produk dari katalog untuk mulai belanja."
          action={<Link href="/shop"><Button variant="accent">Jelajahi katalog</Button></Link>} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <Card className="divide-y">
            {items.map(({ product, qty }) => (
              <div key={product.slug} className="flex flex-wrap items-center gap-4 p-4">
                <Link href={`/shop/${product.slug}`}><ProductArt product={product} className="h-20 w-20" /></Link>
                <div className="min-w-[140px] flex-1"><Link href={`/shop/${product.slug}`} className="font-medium hover:text-electric">{product.name}</Link>
                  <p className="text-xs text-muted-foreground">{product.category} · {rupiah(product.price)} / item</p></div>
                <QtyStepper value={qty} onChange={(v) => setQty(product.slug, v)} label={`Jumlah ${product.name}`} />
                <p className="w-28 text-right font-semibold">{rupiah(product.price * qty)}</p>
                <Button size="icon" variant="ghost" aria-label={`Hapus ${product.name}`} onClick={() => remove(product.slug)}><Trash2 className="h-4 w-4 text-danger" /></Button>
              </div>
            ))}
          </Card>
          <Card className="h-fit p-5">
            <h3 className="font-semibold">Ringkasan belanja</h3>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal ({count} item)</dt><dd>{rupiah(subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Ongkir mulai dari</dt><dd>{rupiah(SHIPPING.reguler.price)}</dd></div>
              <div className="my-2 border-t" />
              <div className="flex justify-between text-base font-semibold"><dt>Estimasi total</dt><dd className="text-electric">{rupiah(subtotal + SHIPPING.reguler.price)}</dd></div>
            </dl>
            <Link href="/shop/checkout" className="mt-5 block"><Button variant="accent" className="w-full">Lanjut checkout</Button></Link>
            <p className="mt-3 text-center text-xs text-muted-foreground">Checkout simulasi — tidak ada pembayaran sungguhan.</p>
          </Card>
        </div>
      )}
    </div>
  );
}
