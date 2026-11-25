"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, Columns3, List, ListChecks, Plus, Search, Table2 } from "lucide-react";
import { api, useApi, useDebounced } from "@/lib/client";
import { Avatar, AvatarStack, Button, Card, EmptyState, ErrorState, Input, PageHeader, PageLoading, ProgressBar, Select, Tabs, useToast } from "@/components/ui";
import { PriorityBadge, StatusBadge, TaskCard, TaskDrawer, TaskForm, isOverdue } from "@/components/task-ui";
import { useApp } from "@/components/app-context";
import { PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL, fmtDate, cn } from "@/lib/utils";

type View = "kanban" | "table" | "calendar" | "list";
const COL_DOT: Record<string, string> = { BACKLOG: "bg-slate-400", TODO: "bg-sky-500", IN_PROGRESS: "bg-blue-600", IN_REVIEW: "bg-violet-500", REVISION: "bg-amber-500", COMPLETED: "bg-emerald-500", BLOCKED: "bg-red-500" };

function TasksInner() {
  const { can } = useApp(); const toast = useToast(); const router = useRouter(); const sp = useSearchParams();
  const [view, setView] = useState<View>("kanban");
  const [q, setQ] = useState(""); const dq = useDebounced(q);
  const [status, setStatus] = useState(""); const [priority, setPriority] = useState(""); const [assignee, setAssignee] = useState(""); const [project, setProject] = useState(""); const [dept, setDept] = useState("");
  const qs = new URLSearchParams({ ...(dq && { q: dq }), ...(status && { status }), ...(priority && { priority }), ...(assignee && { assignee }), ...(project && { project }), ...(dept && { dept }) }).toString();
  const { data, error, loading, reload } = useApi<any>(`/api/tasks?${qs}`);
  const emps = useApi<any>("/api/employees"); const projs = useApi<any>("/api/projects"); const depts = useApi<any>("/api/departments");
  const [open, setOpen] = useState<string | null>(sp.get("open"));
  const [creating, setCreating] = useState(sp.get("new") === "1");
  const [dragId, setDragId] = useState<string | null>(null); const [overCol, setOverCol] = useState<string | null>(null);
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; });
  useEffect(() => { const o = sp.get("open"); if (o) setOpen(o); }, [sp]);

  const tasks: any[] = data?.tasks ?? [];
  const write = can("tasks.write");
  const employees = emps.data?.employees ?? []; const projects = projs.data?.projects ?? []; const departments = depts.data?.departments ?? [];
  const closeDrawer = () => { setOpen(null); if (sp.get("open")) router.replace("/tasks"); };

  async function moveTo(id: string, st: string) {
    const t = tasks.find((x) => x.id === id); if (!t || t.status === st) return;
    try { await api(`/api/tasks/${id}`, { method: "PATCH", body: { status: st } }); toast(`${t.code} → ${STATUS_LABEL[st]}`); reload(); } catch (e) { toast((e as Error).message, "error"); }
  }

  const byStatus = useMemo(() => Object.fromEntries(STATUSES.map((s) => [s, tasks.filter((t) => t.status === s)])), [tasks]);

  const calendar = useMemo(() => {
    const first = new Date(month); const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [month]);

  return (
    <div className="animate-in">
      <PageHeader title="Manajemen Tugas" subtitle={`${tasks.length} tugas${qs ? " (terfilter)" : ""}`} actions={write && <Button variant="accent" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Buat tugas</Button>} />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1 sm:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Cari judul atau ID…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari tugas" /></div>
        <Select className="w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter status"><option value="">Semua status</option>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</Select>
        <Select className="w-auto" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Filter prioritas"><option value="">Semua prioritas</option>{PRIORITIES.map((s) => <option key={s} value={s}>{PRIORITY_LABEL[s]}</option>)}</Select>
        <Select className="w-auto" value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="Filter karyawan"><option value="">Semua karyawan</option>{employees.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}</Select>
        <Select className="w-auto max-w-48" value={project} onChange={(e) => setProject(e.target.value)} aria-label="Filter proyek"><option value="">Semua proyek</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
        <Select className="w-auto max-w-44" value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Filter divisi"><option value="">Semua divisi</option>{departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
        <div className="ml-auto"><Tabs value={view} onChange={setView} items={[{ value: "kanban", label: "Kanban", icon: <Columns3 className="h-3.5 w-3.5" /> }, { value: "table", label: "Tabel", icon: <Table2 className="h-3.5 w-3.5" /> }, { value: "calendar", label: "Kalender", icon: <CalendarDays className="h-3.5 w-3.5" /> }, { value: "list", label: "List", icon: <List className="h-3.5 w-3.5" /> }]} /></div>
      </div>

      {loading && !data ? <PageLoading /> : error ? <ErrorState message={error} onRetry={reload} /> : tasks.length === 0 && view !== "calendar" ? (
        <EmptyState icon={<ListChecks className="h-5 w-5" />} title="Belum ada tugas yang cocok" text="Ubah filter atau buat tugas baru untuk karyawan AI." action={write && <Button variant="accent" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Buat tugas</Button>} />
      ) : view === "kanban" ? (
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-4">
          {STATUSES.map((s) => (
            <div key={s} onDragOver={(e) => { if (write || true) { e.preventDefault(); setOverCol(s); } }} onDragLeave={() => setOverCol(null)} onDrop={() => { setOverCol(null); if (dragId) moveTo(dragId, s); setDragId(null); }}
              className={cn("w-72 shrink-0 rounded-2xl bg-muted/60 p-2.5 transition-colors", overCol === s && "bg-electric/10 ring-2 ring-electric/40")}>
              <div className="mb-2.5 flex items-center justify-between px-1.5"><span className="flex items-center gap-2 text-[13px] font-semibold"><span className={cn("h-2 w-2 rounded-full", COL_DOT[s])} />{STATUS_LABEL[s]}</span><span className="rounded-full bg-card px-2 text-xs text-muted-foreground">{byStatus[s].length}</span></div>
              <div className="space-y-2.5">{byStatus[s].map((t: any) => <TaskCard key={t.id} t={t} draggable onDragStart={() => setDragId(t.id)} onOpen={() => setOpen(t.id)} />)}
                {byStatus[s].length === 0 && <p className="rounded-xl border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">Seret tugas ke sini</p>}</div>
            </div>))}
        </div>
      ) : view === "table" ? (
        <Card className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b text-xs text-muted-foreground"><tr>{["ID", "Tugas", "Penanggung jawab", "Divisi", "Prioritas", "Status", "Progress", "Deadline", "Dibuat"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>{tasks.map((t) => (
            <tr key={t.id} onClick={() => setOpen(t.id)} className="cursor-pointer border-b last:border-0 hover:bg-muted/50"><td className="px-4 py-3 text-muted-foreground">{t.code}</td><td className="max-w-xs px-4 py-3 font-medium">{t.title}</td>
              <td className="px-4 py-3"><AvatarStack people={t.assignees.map((a: any) => a.employee)} size={24} /></td><td className="px-4 py-3 text-muted-foreground">{t.department?.name ?? "—"}</td>
              <td className="px-4 py-3"><PriorityBadge p={t.priority} /></td><td className="px-4 py-3"><StatusBadge s={t.status} /></td><td className="w-28 px-4 py-3"><ProgressBar value={t.progress} /></td>
              <td className={cn("px-4 py-3", isOverdue(t) && "font-medium text-danger")}>{fmtDate(t.deadline)}</td><td className="px-4 py-3 text-muted-foreground">{fmtDate(t.createdAt)}</td></tr>))}</tbody></table></Card>
      ) : view === "list" ? (
        <div className="space-y-6">{STATUSES.filter((s) => byStatus[s].length).map((s) => (
          <section key={s}><h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><span className={cn("h-2 w-2 rounded-full", COL_DOT[s])} />{STATUS_LABEL[s]} <span className="font-normal text-muted-foreground">({byStatus[s].length})</span></h3>
            <Card className="divide-y">{byStatus[s].map((t: any) => (
              <button key={t.id} onClick={() => setOpen(t.id)} className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-muted/50"><span className="w-16 shrink-0 text-xs text-muted-foreground">{t.code}</span><span className="min-w-0 flex-1 truncate font-medium">{t.title}</span><PriorityBadge p={t.priority} /><AvatarStack people={t.assignees.map((a: any) => a.employee)} size={24} /><span className={cn("hidden w-24 text-right text-xs sm:block", isOverdue(t) ? "font-medium text-danger" : "text-muted-foreground")}>{fmtDate(t.deadline)}</span></button>))}</Card></section>))}</div>
      ) : (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold capitalize">{month.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</h3>
            <div className="flex gap-1"><Button variant="outline" size="icon" aria-label="Bulan sebelumnya" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button><Button variant="outline" size="sm" onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); }}>Hari ini</Button><Button variant="outline" size="icon" aria-label="Bulan berikutnya" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button></div></div>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border bg-border text-xs">
            {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => <div key={d} className="bg-muted px-2 py-1.5 text-center font-medium text-muted-foreground">{d}</div>)}
            {calendar.map((d) => {
              const items = tasks.filter((t) => t.deadline && new Date(t.deadline).toDateString() === d.toDateString());
              const cur = d.getMonth() === month.getMonth(); const today = d.toDateString() === new Date().toDateString();
              return (<div key={d.toISOString()} className={cn("min-h-24 bg-card p-1.5", !cur && "bg-muted/40 text-muted-foreground")}>
                <div className={cn("mb-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px]", today && "bg-electric font-semibold text-white")}>{d.getDate()}</div>
                <div className="space-y-1">{items.slice(0, 3).map((t) => <button key={t.id} onClick={() => setOpen(t.id)} title={t.title} className={cn("block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px]", t.status === "COMPLETED" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : isOverdue(t) ? "bg-red-500/15 text-red-700 dark:text-red-300" : "bg-electric/15 text-electric")}>{t.code} {t.title}</button>)}{items.length > 3 && <div className="px-1 text-[10px] text-muted-foreground">+{items.length - 3} lagi</div>}</div></div>);
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Tugas ditampilkan pada tanggal deadline. Tugas tanpa deadline tidak muncul di kalender.</p>
        </Card>
      )}

      <TaskDrawer id={open} onClose={closeDrawer} onChanged={reload} employees={employees} projects={projects} departments={departments} />
      {creating && <TaskForm open onClose={() => { setCreating(false); if (sp.get("new")) router.replace("/tasks"); }} onSaved={(id) => { reload(); if (id) setOpen(id); }} employees={employees} projects={projects} departments={departments} />}
    </div>
  );
}

export default function TasksPage() { return <Suspense fallback={<PageLoading />}><TasksInner /></Suspense>; }
