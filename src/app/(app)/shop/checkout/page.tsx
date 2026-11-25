"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, PackageCheck } from "lucide-react";
import { Button, Card, EmptyState, Field, Input, PageHeader, Select, Skeleton, Textarea, useToast } from "@/components/ui";
import { useShop, type Order } from "@/components/shop-context";
import { SHIPPING, rupiah, type ShippingMethod } from "@/lib/shop-data";

type Form = { name: string; email: string; phone: string; address: string; city: string; zip: string };
const EMPTY: Form = { name: "", email: "", phone: "", address: "", city: "", zip: "" };

export default function CheckoutPage() {
  const { hydrated, items, count, subtotal, placeOrder } = useShop();
  const toast = useToast();
  const [form, setForm] = useState<Form>(EMPTY);
  const [method, setMethod] = useState<ShippingMethod>("reguler");
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [order, setOrder] = useState<Order | null>(null);

  const shipping = SHIPPING[method].price;
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Partial<Record<keyof Form, string>> = {};
    if (!form.name.trim()) next.name = "Nama wajib diisi";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) next.email = "Email tidak valid";
    if (!form.phone.trim()) next.phone = "Nomor HP wajib diisi";
    if (!form.address.trim()) next.address = "Alamat wajib diisi";
    if (!form.city.trim()) next.city = "Kota wajib diisi";
    if (!/^\d{5}$/.test(form.zip.trim())) next.zip = "Kode pos harus 5 digit";
    setErrors(next);
    if (Object.keys(next).length) { toast("Lengkapi data pengiriman dengan benar", "error"); return; }
    const placed = placeOrder({ method, customer: Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()])) as Form });
    if (!placed) { toast("Keranjang kosong", "error"); return; }
    setOrder(placed);
    toast("Pesanan berhasil dibuat");
  }

  if (!hydrated) return <Skeleton className="h-96" />;

  if (order) return (
    <div className="animate-in mx-auto max-w-2xl">
      <Card className="p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10"><CheckCircle2 className="h-7 w-7 text-success" /></div>
        <h1 className="text-2xl font-semibold">Pesanan berhasil dibuat</h1>
        <p className="mt-2 text-sm text-muted-foreground">Simulasi checkout selesai. Tidak ada pembayaran sungguhan.</p>
        <div className="mt-6 rounded-xl border bg-muted/40 p-4 text-left">
          <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs uppercase tracking-wide text-muted-foreground">Nomor pesanan</span><span className="font-mono text-base font-semibold text-electric">{order.id}</span></div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><span className="text-xs uppercase tracking-wide text-muted-foreground">Estimasi tiba</span><span className="text-sm">{SHIPPING[order.method].eta}</span></div>
          <div className="mt-4 border-t pt-4"><p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Item dipesan</p>
            <ul className="space-y-1 text-sm">{order.items.map((i) => <li key={i.slug} className="flex justify-between"><span>{i.qty}× {i.name}</span><span>{rupiah(i.price * i.qty)}</span></li>)}</ul>
            <div className="mt-3 flex justify-between border-t pt-3 font-semibold"><span>Total dibayar (simulasi)</span><span className="text-electric">{rupiah(order.total)}</span></div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/shop/orders"><Button variant="outline"><PackageCheck className="h-4 w-4" />Lihat pesanan</Button></Link>
          <Link href="/shop"><Button variant="accent">Belanja lagi</Button></Link>
        </div>
      </Card>
    </div>
  );

  if (!items.length) return <div className="animate-in"><Link href="/shop/cart" className="mb-4 inline-flex items-center gap-1 text-sm text-electric"><ArrowLeft className="h-4 w-4" />Kembali ke keranjang</Link>
    <EmptyState icon={<PackageCheck className="h-5 w-5" />} title="Tidak ada yang di-checkout" text="Keranjangmu kosong. Tambahkan produk dulu sebelum checkout."
      action={<Link href="/shop"><Button variant="accent">Jelajahi katalog</Button></Link>} /></div>;

  return (
    <div className="animate-in">
      <PageHeader title="Checkout" subtitle="Isi data pengiriman untuk menyelesaikan pesanan simulasi."
        actions={<Link href="/shop/cart"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4" />Kembali ke keranjang</Button></Link>} />
      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card className="space-y-4 p-5">
          <h3 className="font-semibold">Data penerima</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama lengkap" error={errors.name}><Input value={form.name} onChange={set("name")} placeholder="Nama penerima" aria-label="Nama lengkap" /></Field>
            <Field label="Email" error={errors.email}><Input type="email" value={form.email} onChange={set("email")} placeholder="nama@email.com" aria-label="Email" /></Field>
            <Field label="Nomor HP" error={errors.phone}><Input value={form.phone} onChange={set("phone")} placeholder="08xxxxxxxxxx" aria-label="Nomor HP" /></Field>
            <Field label="Kode pos" error={errors.zip}><Input value={form.zip} onChange={set("zip")} placeholder="12345" inputMode="numeric" aria-label="Kode pos" /></Field>
          </div>
          <Field label="Alamat lengkap" error={errors.address}><Textarea value={form.address} onChange={set("address")} placeholder="Jalan, nomor, RT/RW" aria-label="Alamat lengkap" /></Field>
          <Field label="Kota" error={errors.city}><Input value={form.city} onChange={set("city")} placeholder="Kota" aria-label="Kota" /></Field>
          <div><h3 className="mb-2 font-semibold">Metode pengiriman</h3>
            <Select value={method} onChange={(e) => setMethod(e.target.value as ShippingMethod)} aria-label="Metode pengiriman">
              {(Object.keys(SHIPPING) as ShippingMethod[]).map((m) => <option key={m} value={m}>{SHIPPING[m].label} — {rupiah(SHIPPING[m].price)}</option>)}
            </Select></div>
        </Card>
        <Card className="h-fit p-5">
          <h3 className="font-semibold">Ringkasan pesanan</h3>
          <ul className="mt-4 space-y-2 text-sm">{items.map(({ product, qty }) => <li key={product.slug} className="flex justify-between gap-3"><span className="text-muted-foreground">{qty}× {product.name}</span><span>{rupiah(product.price * qty)}</span></li>)}</ul>
          <dl className="mt-4 space-y-2 border-t pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal ({count} item)</dt><dd>{rupiah(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Ongkir</dt><dd>{rupiah(shipping)}</dd></div>
            <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd className="text-electric">{rupiah(subtotal + shipping)}</dd></div>
          </dl>
          <Button type="submit" variant="accent" className="mt-5 w-full">Buat pesanan</Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">Dengan melanjutkan, kamu setuju ini adalah simulasi tanpa pembayaran.</p>
        </Card>
      </form>
    </div>
  );
}
