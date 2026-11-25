"use client";
import Link from "next/link";
import { ArrowLeft, PackageCheck, ShoppingBag } from "lucide-react";
import { Badge, Button, Card, EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { useShop } from "@/components/shop-context";
import { SHIPPING, rupiah } from "@/lib/shop-data";

const fmt = (iso: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

export default function OrdersPage() {
  const { hydrated, orders } = useShop();

  return (
    <div className="animate-in">
      <PageHeader title="Pesanan saya" subtitle="Riwayat pesanan simulasi dari browser ini."
        actions={<Link href="/shop"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4" />Kembali ke toko</Button></Link>} />
      {!hydrated ? <Skeleton className="h-64" /> : orders.length === 0 ? (
        <EmptyState icon={<ShoppingBag className="h-5 w-5" />} title="Belum ada pesanan" text="Pesanan yang kamu buat akan muncul di sini."
          action={<Link href="/shop"><Button variant="accent">Mulai belanja</Button></Link>} />
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <Card key={o.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="font-mono font-semibold text-electric">{o.id}</p><p className="text-xs text-muted-foreground">{fmt(o.createdAt)}</p></div>
                <Badge className="bg-success/10 text-success"><PackageCheck className="h-3 w-3" />Selesai (simulasi)</Badge>
              </div>
              <ul className="mt-4 divide-y text-sm">{o.items.map((i) => <li key={i.slug} className="flex justify-between gap-3 py-1.5"><span className="text-muted-foreground">{i.qty}× {i.name}</span><span>{rupiah(i.price * i.qty)}</span></li>)}</ul>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm">
                <span className="text-xs text-muted-foreground">{SHIPPING[o.method].label} · {o.customer.city}</span>
                <span className="font-semibold">Total {rupiah(o.total)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
