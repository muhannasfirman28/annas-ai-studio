"use client";
import Link from "next/link";
import { useState } from "react";
import { LayoutGrid, Pencil, Plus, Search, Table2, Trash2, Users } from "lucide-react";
import { useApi, useDebounced, api } from "@/lib/client";
import { Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Input, PageHeader, PageLoading, ProgressBar, Select, Tabs, useToast } from "@/components/ui";
import { EmployeeForm } from "@/components/employee-form";
import { useApp } from "@/components/app-context";
import { AVAIL_LABEL } from "@/lib/utils";

export default function EmployeesPage() {
  const { can } = useApp(); const toast = useToast();
  const [q, setQ] = useState(""); const dq = useDebounced(q);
  const [dept, setDept] = useState(""); const [title, setTitle] = useState(""); const [status, setStatus] = useState("");
  const [view, setView] = useState<"card" | "table">("card");
  const qs = new URLSearchParams({ ...(dq && { q: dq }), ...(dept && { dept }), ...(title && { title }), ...(status && { status }) }).toString();
  const { data, error, loading, reload } = useApi<any>(`/api/employees?${qs}`);
  const all = useApi<any>("/api/employees"); const depts = useApi<any>("/api/departments");
  const [form, setForm] = useState<{ open: boolean; emp?: any }>({ open: false });
  const [del, setDel] = useState<any>(null);
  const write = can("employees.write");
  const titles = [...new Set<string>((all.data?.employees ?? []).map((e: any) => e.title))];

  async function remove() {
    try { await api(`/api/employees/${del.id}`, { method: "DELETE" }); toast("Karyawan dihapus"); setDel(null); reload(); all.reload(); } catch (e) { toast((e as Error).message, "error"); }
  }
  return (
    <div className="animate-in">
      <PageHeader title="Karyawan AI" subtitle="Kelola profil, peran, dan ketersediaan seluruh anggota perusahaan." actions={write && <Button variant="accent" onClick={() => setForm({ open: true })}><Plus className="h-4 w-4" />Tambah karyawan</Button>} />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1 sm:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Cari nama…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari nama" /></div>
        <Select className="w-auto" value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Filter divisi"><option value="">Semua divisi</option>{depts.data?.departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
        <Select className="w-auto max-w-56" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Filter jabatan"><option value="">Semua jabatan</option>{titles.map((t) => <option key={t}>{t}</option>)}</Select>
        <Select className="w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter status"><option value="">Semua status</option>{Object.entries(AVAIL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        <div className="ml-auto"><Tabs value={view} onChange={setView} items={[{ value: "card", label: "Card", icon: <LayoutGrid className="h-3.5 w-3.5" /> }, { value: "table", label: "Tabel", icon: <Table2 className="h-3.5 w-3.5" /> }]} /></div>
      </div>
      {loading && !data ? <PageLoading /> : error ? <ErrorState message={error} onRetry={reload} /> : !data?.employees.length ? <EmptyState icon={<Users className="h-5 w-5" />} title="Tidak ada karyawan ditemukan" text="Ubah filter atau tambahkan karyawan baru." /> :
        view === "card" ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.employees.map((e: any) => (
              <Card key={e.id} className="group p-5 transition-shadow hover:shadow-md">
                <div className="flex items-start gap-3">
                  <Avatar name={e.name} color={e.avatarColor} size={52} status={e.availability} />
                  <div className="min-w-0 flex-1"><Link href={`/employees/${e.id}`} className="block truncate font-semibold hover:text-electric">{e.name}</Link><p className="line-clamp-2 text-xs text-muted-foreground">{e.title}</p><Badge className="mt-1.5 bg-muted text-muted-foreground">{e.department.name}</Badge></div>
                  {write && <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <Button variant="ghost" size="icon" aria-label={`Edit ${e.name}`} onClick={() => setForm({ open: true, emp: e })}><Pencil className="h-4 w-4" /></Button>
                    {e.user?.role !== "FOUNDER" && <Button variant="ghost" size="icon" aria-label={`Hapus ${e.name}`} onClick={() => setDel(e)}><Trash2 className="h-4 w-4 text-danger" /></Button>}</div>}
                </div>
                <p className="mt-3 line-clamp-2 text-[13px] text-muted-foreground">{e.personality}</p>
                <div className="mt-3 flex flex-wrap gap-1">{e.skills.slice(0, 4).map((s: any) => <Badge key={s.id} className="bg-electric/10 text-electric">{s.name}</Badge>)}{e.skills.length > 4 && <Badge className="bg-muted text-muted-foreground">+{e.skills.length - 4}</Badge>}</div>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground"><span>{AVAIL_LABEL[e.availability]} · {e.stats.active} tugas aktif</span><span>{e.stats.avgProgress}%</span></div>
                <ProgressBar value={e.stats.avgProgress} className="mt-1.5" />
              </Card>))}
          </div>
        ) : (
          <Card className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-xs text-muted-foreground"><tr>{["Karyawan", "Divisi", "Atasan", "Status", "Aktif", "Selesai", "Progress", ""].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>{data.employees.map((e: any) => (
              <tr key={e.id} className="border-b last:border-0 hover:bg-muted/50"><td className="px-4 py-3"><Link href={`/employees/${e.id}`} className="flex items-center gap-2.5"><Avatar name={e.name} color={e.avatarColor} size={32} status={e.availability} /><span><span className="block font-medium">{e.name}</span><span className="block max-w-[220px] truncate text-xs text-muted-foreground">{e.title}</span></span></Link></td>
                <td className="px-4 py-3">{e.department.name}</td><td className="px-4 py-3 text-muted-foreground">{e.manager?.name ?? "—"}</td><td className="px-4 py-3">{AVAIL_LABEL[e.availability]}</td><td className="px-4 py-3">{e.stats.active}</td><td className="px-4 py-3">{e.stats.completed}</td>
                <td className="w-36 px-4 py-3"><ProgressBar value={e.stats.avgProgress} /></td>
                <td className="px-4 py-3 text-right">{write && <><Button variant="ghost" size="icon" aria-label="Edit" onClick={() => setForm({ open: true, emp: e })}><Pencil className="h-4 w-4" /></Button>{e.user?.role !== "FOUNDER" && <Button variant="ghost" size="icon" aria-label="Hapus" onClick={() => setDel(e)}><Trash2 className="h-4 w-4 text-danger" /></Button>}</>}</td></tr>))}</tbody></table></Card>
        )}
      {form.open && <EmployeeForm open onClose={() => setForm({ open: false })} onSaved={() => { reload(); all.reload(); }} employee={form.emp} departments={depts.data?.departments ?? []} all={all.data?.employees ?? []} />}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={remove} title="Hapus karyawan?" text={`${del?.name} akan dihapus beserta keahlian dan penugasannya. Tugas yang dikerjakan bersama tetap ada. Tindakan ini tidak dapat dibatalkan.`} />
    </div>
  );
}
