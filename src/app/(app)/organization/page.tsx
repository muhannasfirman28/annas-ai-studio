"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { useApi } from "@/lib/client";
import { Avatar, Badge, Button, Card, Drawer, ErrorState, Input, PageHeader, PageLoading, ProgressBar, Select } from "@/components/ui";
import { AVAIL_LABEL, cn } from "@/lib/utils";

type Emp = any;

export default function OrganizationPage() {
  const { data, error, loading, reload } = useApi<any>("/api/employees");
  const depts = useApi<any>("/api/departments");
  const [q, setQ] = useState(""); const [dept, setDept] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<Emp | null>(null);

  const { roots, children } = useMemo(() => {
    const list: Emp[] = data?.employees ?? [];
    const ch: Record<string, Emp[]> = {};
    list.forEach((e) => { if (e.managerId) (ch[e.managerId] ??= []).push(e); });
    return { roots: list.filter((e) => !e.managerId || !list.some((x) => x.id === e.managerId)), children: ch };
  }, [data]);

  const active = !!q.trim() || !!dept;
  const matches = (e: Emp) => (!q.trim() || e.name.toLowerCase().includes(q.toLowerCase()) || e.title.toLowerCase().includes(q.toLowerCase())) && (!dept || e.departmentId === dept);
  const matchCount = (data?.employees ?? []).filter(matches).length;

  const renderNode = (e: Emp): React.ReactNode => {
    const kids = children[e.id] ?? []; const closed = collapsed.has(e.id); const hit = active && matches(e);
    return (
      <li key={e.id}>
        <div className="relative">
          <button onClick={() => setSel(e)} aria-label={`Lihat profil ${e.name}`}
            className={cn("w-52 rounded-2xl border bg-card p-3 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-md", active && !hit && "opacity-35", hit && "ring-2 ring-electric")}>
            <div className="flex items-center gap-2.5"><Avatar name={e.name} color={e.avatarColor} size={40} status={e.availability} /><div className="min-w-0"><div className="truncate font-semibold">{e.name}</div><div className="line-clamp-2 text-[11px] leading-tight text-muted-foreground">{e.title.replace(/\s*\(.*\)/, "")}</div></div></div>
            <div className="mt-2 flex items-center"><span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: e.department.color }} /><span className="ml-1.5 flex-1 truncate text-[11px] text-muted-foreground">{e.department.name}</span><span className="text-[11px] text-muted-foreground">{e.stats.active} aktif</span></div>
          </button>
          {kids.length > 0 && <button onClick={() => setCollapsed((s) => { const n = new Set(s); n.has(e.id) ? n.delete(e.id) : n.add(e.id); return n; })} aria-label={closed ? "Buka bawahan" : "Tutup bawahan"} className="absolute -bottom-2.5 left-1/2 z-10 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border bg-card text-muted-foreground hover:text-foreground">{closed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}</button>}
        </div>
        {kids.length > 0 && !closed && <ul>{kids.map(renderNode)}</ul>}
      </li>
    );
  };

  return (
    <div className="animate-in">
      <PageHeader title="Struktur Organisasi" subtitle="Klik kartu untuk melihat profil. Hierarki mengikuti atasan langsung pada profil karyawan." />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 max-w-xs flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Cari nama atau jabatan…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari" /></div>
        <Select className="w-auto" value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Filter divisi"><option value="">Semua divisi</option>{depts.data?.departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
        {active && <><span className="text-sm text-muted-foreground">{matchCount} cocok</span><Button variant="ghost" size="sm" onClick={() => { setQ(""); setDept(""); }}><X className="h-3.5 w-3.5" />Reset</Button></>}
      </div>
      {loading ? <PageLoading /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <Card className="overflow-x-auto p-8"><div className="org mx-auto w-max min-w-full"><ul>{roots.map(renderNode)}</ul></div></Card>
      )}
      <Drawer open={!!sel} onClose={() => setSel(null)} title="Profil karyawan">
        {sel && (<>
          <div className="flex items-center justify-between border-b px-6 py-4"><h2 className="font-semibold">Profil karyawan</h2><Button variant="ghost" size="icon" onClick={() => setSel(null)} aria-label="Tutup"><X className="h-4 w-4" /></Button></div>
          <div className="flex-1 space-y-5 overflow-y-auto p-6">
            <div className="flex items-center gap-4"><Avatar name={sel.name} color={sel.avatarColor} size={64} status={sel.availability} /><div><h3 className="text-xl font-semibold">{sel.name}</h3><p className="text-sm text-muted-foreground">{sel.title}</p><div className="mt-1.5 flex gap-1.5"><Badge className="bg-electric/10 text-electric">{sel.department.name}</Badge><Badge className="bg-muted text-muted-foreground">{AVAIL_LABEL[sel.availability]}</Badge></div></div></div>
            <p className="text-sm">{sel.bio}</p>
            <div className="grid grid-cols-3 gap-3 text-center">{[["Aktif", sel.stats.active], ["Selesai", sel.stats.completed], ["Terlambat", sel.stats.overdue]].map(([k, v]) => <div key={k as string} className="rounded-xl bg-muted p-3"><div className="text-xl font-semibold">{v}</div><div className="text-xs text-muted-foreground">{k}</div></div>)}</div>
            <div><div className="mb-1 text-xs text-muted-foreground">Atasan langsung</div><div className="text-sm">{sel.manager?.name ?? "— (puncak organisasi)"}</div></div>
            <div><div className="mb-1 text-xs text-muted-foreground">Tanggung jawab</div><div className="text-sm">{sel.responsibilities}</div></div>
            <div><div className="mb-2 text-xs text-muted-foreground">Keahlian</div><div className="flex flex-wrap gap-1.5">{sel.skills.map((s: any) => <Badge key={s.id} className="bg-electric/10 text-electric">{s.name}</Badge>)}</div></div>
            <div><div className="mb-1 text-xs text-muted-foreground">Progress rata-rata</div><ProgressBar value={sel.stats.avgProgress} /></div>
          </div>
          <div className="border-t p-4"><Link href={`/employees/${sel.id}`} className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary font-medium text-primary-foreground hover:opacity-90">Buka profil lengkap</Link></div>
        </>)}
      </Drawer>
    </div>
  );
}
