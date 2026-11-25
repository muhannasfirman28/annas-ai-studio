"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Pencil, Trash2, Target, ListChecks, FileText, History, Users } from "lucide-react";
import { useApi, api } from "@/lib/client";
import { Avatar, Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, ErrorState, PageLoading, ProgressBar, StatCard, useToast } from "@/components/ui";
import { EmployeeForm } from "@/components/employee-form";
import { useApp } from "@/components/app-context";
import { AVAIL_LABEL, PRIORITY_LABEL, PRIORITY_TONE, STATUS_LABEL, STATUS_TONE, fmtDate, timeAgo, cn } from "@/lib/utils";

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>(); const router = useRouter(); const toast = useToast(); const { can } = useApp();
  const { data, error, loading, reload } = useApi<any>(`/api/employees/${id}`);
  const all = useApi<any>("/api/employees"); const depts = useApi<any>("/api/departments");
  const [edit, setEdit] = useState(false); const [del, setDel] = useState(false);
  if (loading) return <PageLoading />;
  if (error || !data) return <ErrorState message={error ?? "Tidak ditemukan"} onRetry={reload} />;
  const { employee: e, tasks, taskLogs, activities, reports, stats } = data;
  const write = can("employees.write");
  const history = [...taskLogs.map((l: any) => ({ id: l.id, at: l.createdAt, text: `${l.task.code} — ${l.detail || l.action}`, href: `/tasks?open=${l.task.id}` })), ...activities.map((a: any) => ({ id: a.id, at: a.createdAt, text: a.message, href: a.link }))].sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 15);

  return (
    <div className="animate-in space-y-6">
      <Link href="/employees" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Kembali ke daftar</Link>
      <Card className="p-6">
        <div className="flex flex-wrap items-start gap-5">
          <Avatar name={e.name} color={e.avatarColor} size={80} status={e.availability} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">{e.name}</h1><p className="text-muted-foreground">{e.title}</p>
            <div className="mt-2 flex flex-wrap gap-2"><Badge className="bg-electric/10 text-electric">{e.department.name}</Badge><Badge className="bg-muted text-muted-foreground">{AVAIL_LABEL[e.availability]}</Badge>{e.user && <Badge className="bg-muted text-muted-foreground">{e.user.email}</Badge>}</div>
            <p className="mt-3 max-w-3xl text-[14px]">{e.bio || "Belum ada deskripsi."}</p>
          </div>
          {write && <div className="flex gap-2"><Button variant="outline" onClick={() => setEdit(true)}><Pencil className="h-4 w-4" />Edit</Button>{e.user?.role !== "FOUNDER" && <Button variant="outline" onClick={() => setDel(true)}><Trash2 className="h-4 w-4 text-danger" />Hapus</Button>}</div>}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tugas aktif" value={stats.active} icon={<ListChecks className="h-4 w-4" />} />
        <StatCard label="Tugas selesai" value={stats.completed} hint={`dari ${stats.assigned} ditugaskan`} icon={<ListChecks className="h-4 w-4" />} tone="text-emerald-500" />
        <StatCard label="Completion rate" value={stats.completionRate === null ? "—" : `${stats.completionRate}%`} icon={<Target className="h-4 w-4" />} />
        <StatCard label="Ketepatan deadline" value={stats.onTimeRate === null ? "—" : `${stats.onTimeRate}%`} hint={stats.overdue ? `${stats.overdue} tugas terlambat` : "Tidak ada keterlambatan"} icon={<History className="h-4 w-4" />} tone="text-amber-500" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader title="Informasi personal" />
          <dl className="space-y-3 p-5 text-sm">
            {[["Kepribadian", e.personality], ["Gaya komunikasi", e.communicationStyle], ["Tanggung jawab", e.responsibilities], ["Target pekerjaan", e.targets]].map(([k, v]) => <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-0.5">{v || "—"}</dd></div>)}
          </dl></Card>
        <Card><CardHeader title="Keahlian" />
          <div className="space-y-3 p-5">{e.skills.length === 0 && <p className="text-sm text-muted-foreground">Belum ada keahlian.</p>}{e.skills.map((s: any) => <div key={s.id}><div className="mb-1 flex justify-between text-sm"><span>{s.name}</span><span className="text-xs text-muted-foreground">{s.level}%</span></div><ProgressBar value={s.level} /></div>)}</div></Card>
        <Card><CardHeader title="Hierarki & kolaborasi" />
          <div className="space-y-4 p-5 text-sm">
            <div><div className="mb-2 text-xs text-muted-foreground">Atasan langsung</div>{e.manager ? <Person p={e.manager} /> : <span className="text-muted-foreground">— (puncak organisasi)</span>}</div>
            <div><div className="mb-2 text-xs text-muted-foreground">Bawahan langsung</div><div className="flex flex-wrap gap-2">{e.reports.length ? e.reports.map((p: any) => <Person key={p.id} p={p} />) : <span className="text-muted-foreground">—</span>}</div></div>
            <div><div className="mb-2 text-xs text-muted-foreground">Rekan kolaborasi</div><div className="flex flex-wrap gap-2">{e.collaborators.length ? e.collaborators.map((p: any) => <Person key={p.id} p={p} />) : <span className="text-muted-foreground">—</span>}</div></div>
          </div></Card>
        <Card><CardHeader title="Riwayat aktivitas" />
          <div className="space-y-1 p-3">{history.length === 0 && <EmptyState icon={<History className="h-5 w-5" />} title="Belum ada aktivitas" />}{history.map((h) => <Link key={h.id} href={h.href ?? "#"} className="flex gap-3 rounded-lg p-2 text-sm hover:bg-muted"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-electric" /><span className="min-w-0"><span className="block">{h.text}</span><span className="text-xs text-muted-foreground">{timeAgo(h.at)}</span></span></Link>)}</div></Card>
      </div>

      <Card><CardHeader title={`Daftar tugas (${tasks.length})`} />
        <div className="overflow-x-auto p-2">{tasks.length === 0 ? <EmptyState icon={<ListChecks className="h-5 w-5" />} title="Belum ada tugas" /> : (
          <table className="w-full text-left text-sm"><thead className="text-xs text-muted-foreground"><tr>{["ID", "Tugas", "Prioritas", "Status", "Progress", "Deadline"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>{tasks.map((t: any) => <tr key={t.id} className="border-t hover:bg-muted/50"><td className="px-3 py-2.5 text-muted-foreground">{t.code}</td><td className="px-3 py-2.5"><Link href={`/tasks?open=${t.id}`} className="font-medium hover:text-electric">{t.title}</Link></td>
              <td className="px-3 py-2.5"><Badge className={PRIORITY_TONE[t.priority]}>{PRIORITY_LABEL[t.priority]}</Badge></td><td className="px-3 py-2.5"><Badge className={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge></td>
              <td className="w-32 px-3 py-2.5"><ProgressBar value={t.progress} /></td><td className="px-3 py-2.5">{fmtDate(t.deadline)}</td></tr>)}</tbody></table>)}</div></Card>

      <Card><CardHeader title="Laporan pekerjaan" action={<Link href="/reports" className="text-xs text-electric">Buka modul laporan</Link>} />
        <div className="space-y-3 p-5">{reports.length === 0 && <p className="text-sm text-muted-foreground">Belum ada laporan.</p>}{reports.map((r: any) => (
          <div key={r.id} className="rounded-xl border p-4 text-sm"><div className="flex items-center justify-between"><span className="flex items-center gap-2 font-medium"><FileText className="h-4 w-4 text-muted-foreground" />{r.period === "DAILY" ? "Harian" : r.period === "WEEKLY" ? "Mingguan" : "Bulanan"} · {fmtDate(r.periodDate)}</span><Badge className={r.status === "On Track" ? STATUS_TONE.COMPLETED : STATUS_TONE.REVISION}>{r.status}</Badge></div>
            <p className="mt-2 whitespace-pre-line text-muted-foreground">{r.completedWork || r.tasksWorked || "—"}</p></div>))}</div></Card>

      {edit && <EmployeeForm open onClose={() => setEdit(false)} onSaved={reload} employee={e} departments={depts.data?.departments ?? []} all={all.data?.employees ?? []} />}
      <ConfirmDialog open={del} onClose={() => setDel(false)} title="Hapus karyawan?" text={`${e.name} akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={async () => { try { await api(`/api/employees/${e.id}`, { method: "DELETE" }); toast("Karyawan dihapus"); router.push("/employees"); } catch (x) { toast((x as Error).message, "error"); } }} />
    </div>
  );
}
function Person({ p }: { p: any }) { return <Link href={`/employees/${p.id}`} className="inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-[13px] hover:bg-muted"><Avatar name={p.name} color={p.avatarColor} size={24} />{p.name}</Link>; }
