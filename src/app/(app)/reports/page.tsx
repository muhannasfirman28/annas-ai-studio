"use client";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CheckCircle2, ChevronDown, Download, FileSpreadsheet, FileText, Gauge, ListChecks, Plus, Trash2, Wand2 } from "lucide-react";
import { api, useApi } from "@/lib/client";
import { Avatar, Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, ErrorState, Field, Modal, PageHeader, PageLoading, Select, StatCard, Tabs, Textarea, useToast } from "@/components/ui";
import { useApp } from "@/components/app-context";
import { STATUS_TONE, cn, fmtDate } from "@/lib/utils";

const PERIOD: Record<string, string> = { DAILY: "Harian", WEEKLY: "Mingguan", MONTHLY: "Bulanan" };
const grid = "hsl(var(--border))"; const tick = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };
const tip = { contentStyle: { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12 } };

export default function ReportsPage() {
  const { can, me } = useApp(); const toast = useToast();
  const [tab, setTab] = useState<"analytics" | "reports">("analytics");
  const [period, setPeriod] = useState("WEEKLY"); const [projectId, setProject] = useState(""); const [employeeId, setEmployee] = useState(""); const [departmentId, setDept] = useState("");
  const qs = new URLSearchParams({ period, ...(projectId && { projectId }), ...(employeeId && { employeeId }), ...(departmentId && { departmentId }) }).toString();
  const an = useApi<any>(`/api/reports/analytics?${qs}`); const list = useApi<any>(`/api/reports?${qs}`);
  const emps = useApi<any>("/api/employees"); const projs = useApi<any>("/api/projects"); const depts = useApi<any>("/api/departments");
  const [creating, setCreating] = useState(false); const [del, setDel] = useState<any>(null); const [openId, setOpenId] = useState<string | null>(null);
  const a = an.data;

  return (
    <div className="animate-in">
      <PageHeader title="Laporan & Performa" subtitle="Seluruh angka dihitung dari data tugas dan laporan nyata." actions={<>
        <a href={`/api/reports/export?format=xlsx&${qs}`} className="inline-flex h-9 items-center gap-2 rounded-lg border bg-card px-4 font-medium hover:bg-muted"><FileSpreadsheet className="h-4 w-4" />Excel</a>
        <a href={`/api/reports/export?format=pdf&${qs}`} className="inline-flex h-9 items-center gap-2 rounded-lg border bg-card px-4 font-medium hover:bg-muted"><Download className="h-4 w-4" />PDF</a>
        {(can("reports.write") || can("reports.write_own")) && <Button variant="accent" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Buat laporan</Button>}</>} />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Select className="w-auto" value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Periode">{Object.entries(PERIOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        <Select className="w-auto max-w-52" value={projectId} onChange={(e) => setProject(e.target.value)} aria-label="Proyek"><option value="">Semua proyek</option>{projs.data?.projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
        <Select className="w-auto" value={employeeId} onChange={(e) => setEmployee(e.target.value)} aria-label="Karyawan"><option value="">Semua karyawan</option>{emps.data?.employees.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}</Select>
        <Select className="w-auto max-w-48" value={departmentId} onChange={(e) => setDept(e.target.value)} aria-label="Divisi"><option value="">Semua divisi</option>{depts.data?.departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
        <div className="ml-auto"><Tabs value={tab} onChange={setTab} items={[{ value: "analytics", label: "Analitik" }, { value: "reports", label: "Laporan kerja" }]} /></div>
      </div>

      {tab === "analytics" ? (an.loading && !a ? <PageLoading /> : an.error ? <ErrorState message={an.error} onRetry={an.reload} /> : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total tugas" value={a.summary.totalTasks} icon={<ListChecks className="h-4 w-4" />} hint={`${a.summary.open} belum selesai`} />
            <StatCard label={`Selesai (${PERIOD[period].toLowerCase()})`} value={a.summary.completedInPeriod} icon={<CheckCircle2 className="h-4 w-4" />} tone="text-emerald-500" hint={`${a.summary.completed} selesai total`} />
            <StatCard label="Task completion rate" value={a.summary.completionRate === null ? "—" : `${a.summary.completionRate}%`} icon={<Gauge className="h-4 w-4" />} />
            <StatCard label="Deadline performance" value={a.summary.onTimeRate === null ? "—" : `${a.summary.onTimeRate}%`} icon={<Gauge className="h-4 w-4" />} tone="text-amber-500" hint={`${a.summary.overdue} lewat deadline`} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card><CardHeader title="Grafik produktivitas" subtitle="Tugas diselesaikan per hari" /><div className="h-64 px-2 pb-4 pt-3"><ResponsiveContainer><LineChart data={a.trend}><CartesianGrid stroke={grid} vertical={false} /><XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tick={tick} tickLine={false} axisLine={false} width={28} /><Tooltip {...tip} /><Line type="monotone" dataKey="selesai" name="Selesai" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div></Card>
            <Card><CardHeader title="Deadline performance" /><div className="h-64 px-2 pb-4 pt-3">{a.deadlinePerformance.some((x: any) => x.value) ? <ResponsiveContainer><PieChart><Pie data={a.deadlinePerformance.filter((x: any) => x.value)} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>{a.deadlinePerformance.filter((x: any) => x.value).map((x: any) => <Cell key={x.name} fill={x.color} />)}</Pie><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer> : <EmptyState title="Belum ada data deadline" />}</div></Card>
            <Card className="lg:col-span-2"><CardHeader title="Distribusi beban kerja" subtitle="Tugas aktif vs selesai per karyawan" /><div className="h-64 px-2 pb-4 pt-3"><ResponsiveContainer><BarChart data={a.workload}><CartesianGrid stroke={grid} vertical={false} /><XAxis dataKey="name" tick={tick} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tick={tick} tickLine={false} axisLine={false} width={28} /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 12 }} /><Bar dataKey="aktif" name="Aktif" fill="#2563eb" radius={[4, 4, 0, 0]} /><Bar dataKey="selesai" name="Selesai" fill="#10b981" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
          </div>
          <Card><CardHeader title="Employee performance" subtitle="“—” berarti belum ada data yang cukup untuk dihitung" />
            <div className="overflow-x-auto p-2"><table className="w-full text-left text-sm"><thead className="text-xs text-muted-foreground"><tr>{["Karyawan", "Ditugaskan", "Aktif", "Selesai", "Terlambat", "Completion", "Tepat waktu", "Produktivitas"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>{a.employees.map((e: any) => <tr key={e.id} className="border-t"><td className="px-3 py-2.5"><span className="flex items-center gap-2"><Avatar name={e.name} color={e.avatarColor} size={26} />{e.name}</span></td><td className="px-3 py-2.5">{e.assigned}</td><td className="px-3 py-2.5">{e.active}</td><td className="px-3 py-2.5">{e.completed}</td><td className={cn("px-3 py-2.5", e.overdue > 0 && "text-danger")}>{e.overdue}</td>{[e.completionRate, e.onTimeRate, e.productivity].map((v, i) => <td key={i} className="px-3 py-2.5">{v === null || v === undefined ? "—" : `${v}%`}</td>)}</tr>)}
                {!a.employees.length && <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">Tidak ada data untuk filter ini.</td></tr>}</tbody></table></div></Card>
        </div>)) : (
        list.loading && !list.data ? <PageLoading /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : !list.data.reports.length ? <EmptyState icon={<FileText className="h-5 w-5" />} title="Belum ada laporan kerja" text="Buat laporan harian, mingguan, atau bulanan. Isi awal dapat dihasilkan dari data tugas." /> : (
          <div className="space-y-3">{list.data.reports.map((r: any) => { const open = openId === r.id; return (
            <Card key={r.id}><button onClick={() => setOpenId(open ? null : r.id)} className="flex w-full items-center gap-3 p-4 text-left"><Avatar name={r.employee.name} color={r.employee.avatarColor} size={36} />
              <span className="min-w-0 flex-1"><span className="block font-medium">{r.employee.name} <span className="font-normal text-muted-foreground">· {r.employee.title}</span></span><span className="block text-xs text-muted-foreground">{PERIOD[r.period]} · {fmtDate(r.periodDate)} · {r.project?.name ?? "Umum"} · {r.employee.department.name}</span></span>
              <Badge className={r.status === "On Track" ? STATUS_TONE.COMPLETED : r.status === "At Risk" ? STATUS_TONE.REVISION : STATUS_TONE.BLOCKED}>{r.status}</Badge><ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} /></button>
              {open && <div className="grid gap-4 border-t p-4 text-sm sm:grid-cols-2">{[["Tugas yang dikerjakan", r.tasksWorked], ["Pekerjaan selesai", r.completedWork], ["Sedang berlangsung", r.ongoingWork], ["Kendala", r.obstacles], ["Solusi", r.solutions], ["Rekomendasi", r.recommendations]].map(([k, v]) => <div key={k}><div className="mb-1 text-xs text-muted-foreground">{k}</div><p className="whitespace-pre-line">{v || "—"}</p></div>)}
                {(can("reports.write") || r.employeeId === me.employeeId) && <div className="sm:col-span-2"><Button size="sm" variant="outline" onClick={() => setDel(r)}><Trash2 className="h-3.5 w-3.5 text-danger" />Hapus laporan</Button></div>}</div>}</Card>); })}</div>)
      )}

      {creating && <ReportForm onClose={() => setCreating(false)} onSaved={() => { list.reload(); an.reload(); setTab("reports"); }} employees={emps.data?.employees ?? []} projects={projs.data?.projects ?? []} />}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title="Hapus laporan?" text="Laporan ini akan dihapus permanen."
        onConfirm={async () => { try { await api(`/api/reports/${del.id}`, { method: "DELETE" }); toast("Laporan dihapus"); setDel(null); list.reload(); } catch (e) { toast((e as Error).message, "error"); } }} />
    </div>
  );
}

function ReportForm({ onClose, onSaved, employees, projects }: { onClose: () => void; onSaved: () => void; employees: any[]; projects: any[] }) {
  const { can, me } = useApp(); const toast = useToast();
  const [f, setF] = useState({ employeeId: can("reports.write") ? "" : me.employeeId ?? "", projectId: "", period: "DAILY", tasksWorked: "", completedWork: "", ongoingWork: "", obstacles: "", solutions: "", recommendations: "", status: "On Track" });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  async function draft() {
    if (!f.employeeId) return setErr("Pilih karyawan terlebih dahulu");
    try { const d = await api<any>(`/api/reports/draft?employeeId=${f.employeeId}&period=${f.period}`); setF((s) => ({ ...s, ...d })); setErr(""); toast("Draf diisi dari data tugas. Silakan lengkapi solusi & rekomendasi.", "info"); } catch (e) { toast((e as Error).message, "error"); }
  }
  async function save() {
    if (!f.employeeId) return setErr("Karyawan wajib dipilih");
    setBusy(true);
    try { await api("/api/reports", { body: { ...f, projectId: f.projectId || null } }); toast("Laporan disimpan"); onSaved(); onClose(); } catch (e) { toast((e as Error).message, "error"); } finally { setBusy(false); }
  }
  return (
    <Modal open onClose={onClose} wide title="Buat laporan kerja" footer={<><Button variant="outline" onClick={onClose}>Batal</Button><Button variant="accent" loading={busy} onClick={save}>Simpan laporan</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Karyawan" error={err}><Select value={f.employeeId} disabled={!can("reports.write")} onChange={(e) => set("employeeId", e.target.value)}><option value="">Pilih…</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.name} — {e.title}</option>)}</Select></Field>
        <Field label="Periode"><Select value={f.period} onChange={(e) => set("period", e.target.value)}>{Object.entries(PERIOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label="Proyek"><Select value={f.projectId} onChange={(e) => set("projectId", e.target.value)}><option value="">Umum</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
        <Field label="Status pekerjaan"><Select value={f.status} onChange={(e) => set("status", e.target.value)}>{["On Track", "At Risk", "Delayed", "Completed"].map((s) => <option key={s}>{s}</option>)}</Select></Field>
        <div className="sm:col-span-2"><Button type="button" variant="outline" size="sm" onClick={draft}><Wand2 className="h-3.5 w-3.5" />Isi otomatis dari data tugas</Button></div>
        {([["tasksWorked", "Tugas yang dikerjakan"], ["completedWork", "Pekerjaan yang selesai"], ["ongoingWork", "Pekerjaan sedang berlangsung"], ["obstacles", "Kendala"], ["solutions", "Solusi"], ["recommendations", "Rekomendasi"]] as const).map(([k, l]) => <Field key={k} label={l}><Textarea rows={3} value={(f as any)[k]} onChange={(e) => set(k, e.target.value)} /></Field>)}
      </div>
    </Modal>
  );
}
