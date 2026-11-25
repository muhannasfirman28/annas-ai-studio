"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Circle, MessageSquare, Pencil, Plus } from "lucide-react";
import { api, useApi } from "@/lib/client";
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, ErrorState, PageLoading, ProgressBar, StatCard, useToast } from "@/components/ui";
import { ProjectForm } from "@/components/project-form";
import { PriorityBadge, StatusBadge, TaskDrawer, TaskForm, isOverdue } from "@/components/task-ui";
import { useApp } from "@/components/app-context";
import { CrewPanel } from "@/components/crew-panel";
import { PROJECT_STATUS_LABEL, fmtDate, timeAgo, cn } from "@/lib/utils";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>(); const { can } = useApp(); const toast = useToast();
  const { data, error, loading, reload } = useApi<any>(`/api/projects/${id}`);
  const emps = useApi<any>("/api/employees"); const projs = useApi<any>("/api/projects"); const depts = useApi<any>("/api/departments");
  const [edit, setEdit] = useState(false); const [newTask, setNewTask] = useState(false); const [open, setOpen] = useState<string | null>(null);
  if (loading) return <PageLoading />;
  if (error || !data) return <ErrorState message={error ?? "Tidak ditemukan"} onRetry={reload} />;
  const p = data.project; const write = can("projects.write");
  const employees = emps.data?.employees ?? [];
  const start = new Date(p.startDate).getTime(); const end = p.deadline ? new Date(p.deadline).getTime() : null;
  const timePct = end ? Math.min(100, Math.max(0, Math.round(((Date.now() - start) / (end - start)) * 100))) : null;

  async function toggleMs(m: any) {
    try { await api(`/api/projects/${id}`, { method: "PATCH", body: { milestones: p.milestones.map((x: any) => ({ id: x.id, title: x.title, dueDate: x.dueDate, done: x.id === m.id ? !x.done : x.done })) } }); reload(); } catch (e) { toast((e as Error).message, "error"); }
  }
  return (
    <div className="animate-in space-y-6">
      <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Semua proyek</Link>
      <Card className="p-6"><div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-4"><span className="w-1.5 rounded-full" style={{ background: p.color }} /><div><h1 className="text-2xl font-semibold tracking-tight">{p.name}</h1><p className="mt-1 max-w-3xl text-muted-foreground">{p.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2"><Badge className="bg-electric/10 text-electric">{PROJECT_STATUS_LABEL[p.status]}</Badge><span className="text-sm text-muted-foreground">Project manager: <b className="text-foreground">{p.manager?.name ?? "—"}</b></span></div></div></div>
        <div className="flex gap-2">{p.conversations[0] && <Link href={`/chat?c=${p.conversations[0].id}`} className="inline-flex h-9 items-center gap-2 rounded-lg border bg-card px-4 font-medium hover:bg-muted"><MessageSquare className="h-4 w-4" />Diskusi</Link>}{write && <Button variant="outline" onClick={() => setEdit(true)}><Pencil className="h-4 w-4" />Edit</Button>}</div>
      </div></Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Progress tugas" value={`${p.progress}%`} icon={<CheckCircle2 className="h-4 w-4" />} hint={`${p.taskDone}/${p.taskTotal} selesai`} />
        <StatCard label="Waktu berjalan" value={timePct === null ? "—" : `${timePct}%`} icon={<Circle className="h-4 w-4" />} hint={`${fmtDate(p.startDate)} → ${fmtDate(p.deadline)}`} tone="text-violet-500" />
        <StatCard label="Anggota tim" value={p.members.length} icon={<Circle className="h-4 w-4" />} tone="text-cyan-500" />
        <StatCard label="Milestone" value={`${p.milestones.filter((m: any) => m.done).length}/${p.milestones.length}`} icon={<CheckCircle2 className="h-4 w-4" />} tone="text-emerald-500" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card><CardHeader title="Timeline & milestone" subtitle={timePct !== null && p.progress < timePct - 15 ? "Progress tertinggal dari jadwal" : undefined} />
          <div className="p-5"><div className="relative mb-6"><ProgressBar value={timePct ?? 0} className="h-2" /><div className="mt-1 flex justify-between text-[11px] text-muted-foreground"><span>{fmtDate(p.startDate)}</span><span>{fmtDate(p.deadline)}</span></div></div>
            {p.milestones.length === 0 && <p className="text-sm text-muted-foreground">Belum ada milestone.</p>}
            <ol className="space-y-3">{p.milestones.map((m: any) => (
              <li key={m.id} className="flex items-center gap-3"><button disabled={!write} onClick={() => toggleMs(m)} aria-label={m.done ? "Tandai belum selesai" : "Tandai selesai"}>{m.done ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Circle className="h-5 w-5 text-muted-foreground" />}</button>
                <span className={cn("flex-1 text-sm", m.done && "text-muted-foreground line-through")}>{m.title}</span><span className={cn("text-xs", !m.done && m.dueDate && new Date(m.dueDate) < new Date() ? "text-danger" : "text-muted-foreground")}>{fmtDate(m.dueDate)}</span></li>))}</ol></div></Card>
        <Card><CardHeader title="Tim proyek" />
          <div className="space-y-2 p-4">{p.members.map((m: any) => <Link key={m.id} href={`/employees/${m.employee.id}`} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted"><Avatar name={m.employee.name} color={m.employee.avatarColor} size={34} status={m.employee.availability} /><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{m.employee.name}</span><span className="block truncate text-xs text-muted-foreground">{m.employee.title}</span></span><Badge className="bg-muted text-muted-foreground">{m.role}</Badge></Link>)}</div></Card>
      </div>

      <Card><CardHeader title={`Daftar tugas (${p.tasks.length})`} action={can("tasks.write") && <Button size="sm" variant="accent" onClick={() => setNewTask(true)}><Plus className="h-3.5 w-3.5" />Tugas</Button>} />
        <div className="overflow-x-auto p-2">{p.tasks.length === 0 ? <EmptyState title="Belum ada tugas di proyek ini" /> : (
          <table className="w-full text-left text-sm"><thead className="text-xs text-muted-foreground"><tr>{["ID", "Tugas", "PIC", "Prioritas", "Status", "Progress", "Deadline"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>{p.tasks.map((t: any) => <tr key={t.id} onClick={() => setOpen(t.id)} className="cursor-pointer border-t hover:bg-muted/50"><td className="px-3 py-2.5 text-muted-foreground">{t.code}</td><td className="px-3 py-2.5 font-medium">{t.title}</td><td className="px-3 py-2.5">{t.assignees.map((a: any) => a.employee.name.split(" ")[0]).join(", ")}</td><td className="px-3 py-2.5"><PriorityBadge p={t.priority} /></td><td className="px-3 py-2.5"><StatusBadge s={t.status} /></td><td className="w-28 px-3 py-2.5"><ProgressBar value={t.progress} /></td><td className={cn("px-3 py-2.5", isOverdue(t) && "text-danger")}>{fmtDate(t.deadline)}</td></tr>)}</tbody></table>)}</div></Card>

      <CrewPanel projectId={id} write={write} />

      <Card><CardHeader title="Aktivitas proyek" />
        <div className="space-y-1 p-3">{data.logs.length === 0 && <EmptyState title="Belum ada aktivitas" />}{data.logs.map((l: any) => <button key={l.id} onClick={() => setOpen(l.task.id)} className="flex w-full gap-3 rounded-lg p-2 text-left text-sm hover:bg-muted"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-electric" /><span><b>{l.actorName}</b> · {l.task.code} — <span className="text-muted-foreground">{l.detail || l.action}</span><span className="block text-xs text-muted-foreground">{timeAgo(l.createdAt)}</span></span></button>)}</div></Card>

      {edit && <ProjectForm open onClose={() => setEdit(false)} onSaved={reload} project={p} employees={employees} />}
      {newTask && <TaskForm open onClose={() => setNewTask(false)} onSaved={reload} employees={employees} projects={projs.data?.projects ?? []} departments={depts.data?.departments ?? []} defaults={{ projectId: p.id }} />}
      <TaskDrawer id={open} onClose={() => setOpen(null)} onChanged={reload} employees={employees} projects={projs.data?.projects ?? []} departments={depts.data?.departments ?? []} />
    </div>
  );
}
