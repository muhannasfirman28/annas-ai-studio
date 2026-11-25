"use client";
import Link from "next/link";
import { useState } from "react";
import { FolderKanban, Pencil, Plus, Trash2 } from "lucide-react";
import { api, useApi } from "@/lib/client";
import { AvatarStack, Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, PageHeader, PageLoading, ProgressBar, useToast } from "@/components/ui";
import { ProjectForm } from "@/components/project-form";
import { useApp } from "@/components/app-context";
import { PROJECT_STATUS_LABEL, PSTATUS_TONE, fmtDate } from "@/lib/utils";


export default function ProjectsPage() {
  const { can } = useApp(); const toast = useToast();
  const { data, error, loading, reload } = useApi<any>("/api/projects");
  const emps = useApi<any>("/api/employees");
  const [form, setForm] = useState<{ open: boolean; p?: any }>({ open: false }); const [del, setDel] = useState<any>(null);
  const write = can("projects.write");
  return (
    <div className="animate-in">
      <PageHeader title="Proyek" subtitle="Pantau progress, tim, dan milestone seluruh proyek perusahaan." actions={write && <Button variant="accent" onClick={() => setForm({ open: true })}><Plus className="h-4 w-4" />Proyek baru</Button>} />
      {loading ? <PageLoading /> : error ? <ErrorState message={error} onRetry={reload} /> : !data.projects.length ? <EmptyState icon={<FolderKanban className="h-5 w-5" />} title="Belum ada proyek" text="Buat proyek pertama untuk mulai mengelola tugas dan tim." /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.projects.map((p: any) => (
            <Card key={p.id} className="group flex flex-col p-5 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5"><span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: p.color }} /><Link href={`/projects/${p.id}`} className="font-semibold leading-snug hover:text-electric">{p.name}</Link></div>
                {write && <div className="flex opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"><Button variant="ghost" size="icon" aria-label="Edit" onClick={() => setForm({ open: true, p })}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" aria-label="Hapus" onClick={() => setDel(p)}><Trash2 className="h-4 w-4 text-danger" /></Button></div>}
              </div>
              <p className="mt-2 line-clamp-2 text-[13px] text-muted-foreground">{p.description}</p>
              <div className="mt-3 flex items-center gap-2"><Badge className={PSTATUS_TONE[p.status]}>{PROJECT_STATUS_LABEL[p.status]}</Badge><span className="text-xs text-muted-foreground">PM: {p.manager?.name ?? "—"}</span></div>
              <div className="mt-4"><div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>{p.taskDone}/{p.taskTotal} tugas selesai</span><span>{p.progress}%</span></div><ProgressBar value={p.progress} color={p.color} /></div>
              <div className="mt-4 flex items-center justify-between"><AvatarStack people={p.members.map((m: any) => m.employee)} /><span className="text-xs text-muted-foreground">Deadline {fmtDate(p.deadline)}</span></div>
            </Card>))}
        </div>)}
      {form.open && <ProjectForm open onClose={() => setForm({ open: false })} onSaved={reload} project={form.p} employees={emps.data?.employees ?? []} />}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title="Hapus proyek?" text={`${del?.name} akan dihapus. Tugas di dalamnya tidak ikut terhapus, hanya dilepas dari proyek.`}
        onConfirm={async () => { try { await api(`/api/projects/${del.id}`, { method: "DELETE" }); toast("Proyek dihapus"); setDel(null); reload(); } catch (e) { toast((e as Error).message, "error"); } }} />
    </div>
  );
}
