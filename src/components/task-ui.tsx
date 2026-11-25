"use client";
import { useEffect, useRef, useState } from "react";
import { Download, Paperclip, Pencil, Plus, Send, Trash2, X, Clock, CalendarDays, Folder } from "lucide-react";
import { api, useApi } from "@/lib/client";
import { Avatar, AvatarStack, Badge, Button, ConfirmDialog, Drawer, EmployeePicker, Field, Input, Modal, ProgressBar, Select, Textarea, useToast } from "./ui";
import { useApp } from "./app-context";
import { PRIORITIES, PRIORITY_LABEL, PRIORITY_TONE, STATUSES, STATUS_LABEL, STATUS_TONE, fmtDate, timeAgo, toInputDate, cn } from "@/lib/utils";

export function isOverdue(t: { deadline?: string | null; status: string }) {
  return !!t.deadline && t.status !== "COMPLETED" && new Date(t.deadline).getTime() < Date.now();
}
export const StatusBadge = ({ s }: { s: string }) => <Badge className={STATUS_TONE[s]}>{STATUS_LABEL[s]}</Badge>;
export const PriorityBadge = ({ p }: { p: string }) => <Badge className={PRIORITY_TONE[p]}>{PRIORITY_LABEL[p]}</Badge>;

/* ─────────── Form ─────────── */
export function TaskForm({ open, onClose, onSaved, task, employees, projects, departments, defaults }: {
  open: boolean; onClose: () => void; onSaved: (id?: string) => void; task?: any;
  employees: any[]; projects: any[]; departments: any[]; defaults?: { projectId?: string; status?: string };
}) {
  const toast = useToast();
  const [f, setF] = useState(() => ({
    title: task?.title ?? "", description: task?.description ?? "", priority: task?.priority ?? "MEDIUM", status: task?.status ?? defaults?.status ?? "TODO",
    deadline: toInputDate(task?.deadline), projectId: task?.projectId ?? defaults?.projectId ?? "", departmentId: task?.departmentId ?? "",
    assigneeIds: (task?.assignees ?? []).map((a: any) => a.employeeId) as string[], progress: task?.progress ?? 0,
    checklist: (task?.checklist ?? []).map((c: any) => ({ id: c.id, text: c.text, done: c.done })) as { id?: string; text: string; done: boolean }[],
  }));
  const [item, setItem] = useState(""); const [err, setErr] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    const e: Record<string, string> = {};
    if (f.title.trim().length < 3) e.title = "Nama tugas minimal 3 karakter";
    if (!f.assigneeIds.length) e.assignees = "Pilih minimal satu penanggung jawab";
    setErr(e); if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const body = { ...f, deadline: f.deadline || null, projectId: f.projectId || null, departmentId: f.departmentId || null, progress: Number(f.progress) };
      const r = task ? await api(`/api/tasks/${task.id}`, { method: "PATCH", body }) : await api("/api/tasks", { body });
      toast(task ? "Tugas diperbarui" : "Tugas dibuat"); onSaved(r.task?.id); onClose();
    } catch (x) { toast((x as Error).message, "error"); } finally { setBusy(false); }
  }
  const addItem = () => { if (item.trim()) { set("checklist", [...f.checklist, { text: item.trim(), done: false }]); setItem(""); } };

  return (
    <Modal open={open} onClose={onClose} wide title={task ? `Edit ${task.code}` : "Buat tugas baru"} footer={<><Button variant="outline" onClick={onClose}>Batal</Button><Button variant="accent" loading={busy} onClick={save}>{task ? "Simpan" : "Buat tugas"}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama tugas" error={err.title} className="sm:col-span-2"><Input value={f.title} onChange={(e) => set("title", e.target.value)} autoFocus /></Field>
        <Field label="Deskripsi pekerjaan" className="sm:col-span-2"><Textarea rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
        <Field label="Penanggung jawab (bisa lebih dari satu — delegasi)" error={err.assignees} className="sm:col-span-2"><EmployeePicker employees={employees} value={f.assigneeIds} onChange={(v) => set("assigneeIds", v)} /></Field>
        <Field label="Prioritas"><Select value={f.priority} onChange={(e) => set("priority", e.target.value)}>{PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</Select></Field>
        <Field label="Status"><Select value={f.status} onChange={(e) => set("status", e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</Select></Field>
        <Field label="Deadline"><Input type="date" value={f.deadline} onChange={(e) => set("deadline", e.target.value)} /></Field>
        <Field label="Proyek"><Select value={f.projectId} onChange={(e) => set("projectId", e.target.value)}><option value="">— Tanpa proyek —</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
        <Field label="Divisi" hint="Kosongkan untuk mengikuti divisi penanggung jawab pertama"><Select value={f.departmentId} onChange={(e) => set("departmentId", e.target.value)}><option value="">Otomatis</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
        <Field label={`Progress: ${f.progress}%`}><input type="range" min={0} max={100} step={5} value={f.progress} onChange={(e) => set("progress", Number(e.target.value))} className="w-full accent-[hsl(var(--electric))]" /></Field>
        <div className="sm:col-span-2">
          <span className="text-[13px] font-medium">Checklist</span>
          <div className="mt-1.5 space-y-1.5">
            {f.checklist.map((c, i) => (
              <div key={i} className="flex items-center gap-2"><input type="checkbox" checked={c.done} onChange={(e) => set("checklist", f.checklist.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x)))} className="h-4 w-4 accent-[hsl(var(--electric))]" aria-label={`Selesai: ${c.text}`} />
                <span className={cn("flex-1 text-sm", c.done && "text-muted-foreground line-through")}>{c.text}</span>
                <button type="button" onClick={() => set("checklist", f.checklist.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-danger" aria-label="Hapus item"><X className="h-4 w-4" /></button></div>))}
            <div className="flex gap-2"><Input placeholder="Tambah item checklist…" value={item} onChange={(e) => setItem(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }} /><Button type="button" variant="outline" onClick={addItem}><Plus className="h-4 w-4" /></Button></div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ─────────── Drawer ─────────── */
export function TaskDrawer({ id, onClose, onChanged, employees, projects, departments }: { id: string | null; onClose: () => void; onChanged: () => void; employees: any[]; projects: any[]; departments: any[] }) {
  const { can, me } = useApp(); const toast = useToast();
  const { data, error, reload, loading } = useApi<any>(id ? `/api/tasks/${id}` : null);
  const [tab, setTab] = useState<"comments" | "history">("comments");
  const [comment, setComment] = useState(""); const [edit, setEdit] = useState(false); const [del, setDel] = useState(false); const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => { setEdit(false); setComment(""); }, [id]);
  const t = data?.task;
  const full = can("tasks.write");
  const own = !!t && can("tasks.update_own") && t.assignees.some((a: any) => a.employeeId === me.employeeId);
  const canUpdate = full || own;

  async function patch(body: any, msg?: string) {
    try { await api(`/api/tasks/${id}`, { method: "PATCH", body }); await reload(); onChanged(); if (msg) toast(msg); } catch (e) { toast((e as Error).message, "error"); }
  }
  async function sendComment() {
    if (!comment.trim()) return; setBusy(true);
    try { await api(`/api/tasks/${id}/comments`, { body: { body: comment } }); setComment(""); await reload(); onChanged(); } catch (e) { toast((e as Error).message, "error"); } finally { setBusy(false); }
  }
  async function upload(f: File) {
    const form = new FormData(); form.append("file", f);
    try { await api(`/api/tasks/${id}/attachments`, { form }); toast("Lampiran ditambahkan"); reload(); onChanged(); } catch (e) { toast((e as Error).message, "error"); }
  }
  async function rmAtt(aid: string) { try { await api(`/api/tasks/${id}/attachments?aid=${aid}`, { method: "DELETE" }); reload(); } catch (e) { toast((e as Error).message, "error"); } }

  return (
    <Drawer open={!!id} onClose={onClose} title="Detail tugas">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <span className="text-sm text-muted-foreground">{t?.code ?? "…"}</span>
        <div className="flex gap-1">
          {full && t && <Button variant="ghost" size="icon" aria-label="Edit tugas" onClick={() => setEdit(true)}><Pencil className="h-4 w-4" /></Button>}
          {can("tasks.delete") && t && <Button variant="ghost" size="icon" aria-label="Hapus tugas" onClick={() => setDel(true)}><Trash2 className="h-4 w-4 text-danger" /></Button>}
          <Button variant="ghost" size="icon" aria-label="Tutup" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {loading && !t && <p className="text-sm text-muted-foreground">Memuat…</p>}
        {error && <p className="text-sm text-danger">{error}</p>}
        {t && (<>
          <div><h2 className="text-xl font-semibold tracking-tight">{t.title}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2"><StatusBadge s={t.status} /><PriorityBadge p={t.priority} />{isOverdue(t) && <Badge className="bg-red-500/10 text-red-600">Terlambat</Badge>}{t.department && <Badge className="bg-muted text-muted-foreground">{t.department.name}</Badge>}</div></div>
          {t.description && <p className="whitespace-pre-line text-sm">{t.description}</p>}

          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div><div className="mb-1.5 text-xs text-muted-foreground">Penanggung jawab</div><div className="space-y-1.5">{t.assignees.map((a: any) => <div key={a.id} className="flex items-center gap-2"><Avatar name={a.employee.name} color={a.employee.avatarColor} size={26} /><span>{a.employee.name}</span></div>)}</div></div>
            <div className="space-y-2">
              <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-muted-foreground" />Deadline: <span className={cn(isOverdue(t) && "font-medium text-danger")}>{fmtDate(t.deadline)}</span></div>
              <div className="flex items-center gap-2"><Folder className="h-4 w-4 text-muted-foreground" />{t.project?.name ?? "Tanpa proyek"}</div>
              <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" />Dibuat {fmtDate(t.createdAt)} oleh {t.createdBy?.name ?? "—"}</div>
              <div className="flex items-center gap-2 text-muted-foreground">Aktivitas terakhir {timeAgo(t.lastActivityAt)}</div>
            </div>
          </div>

          {canUpdate && (
            <div className="grid gap-4 rounded-xl bg-muted/60 p-4 sm:grid-cols-2">
              <Field label="Ubah status"><Select value={t.status} onChange={(e) => patch({ status: e.target.value }, "Status diperbarui")}>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</Select></Field>
              <Field label={`Progress: ${t.progress}%`}><input type="range" min={0} max={100} step={5} defaultValue={t.progress} key={t.progress} disabled={t.status === "COMPLETED"} onMouseUp={(e) => patch({ progress: Number((e.target as HTMLInputElement).value) })} onTouchEnd={(e) => patch({ progress: Number((e.target as HTMLInputElement).value) })} onKeyUp={(e) => patch({ progress: Number((e.target as HTMLInputElement).value) })} className="mt-2 w-full accent-[hsl(var(--electric))]" /></Field>
            </div>
          )}
          {!canUpdate && <div><div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Progress</span><span>{t.progress}%</span></div><ProgressBar value={t.progress} /></div>}

          <section>
            <h3 className="mb-2 text-sm font-semibold">Checklist ({t.checklist.filter((c: any) => c.done).length}/{t.checklist.length})</h3>
            {t.checklist.length === 0 && <p className="text-sm text-muted-foreground">Belum ada item checklist.</p>}
            <div className="space-y-1.5">{t.checklist.map((c: any) => (
              <label key={c.id} className="flex items-center gap-2.5 text-sm"><input type="checkbox" checked={c.done} disabled={!canUpdate} onChange={(e) => patch({ checklist: t.checklist.map((x: any) => ({ id: x.id, text: x.text, done: x.id === c.id ? e.target.checked : x.done })) })} className="h-4 w-4 accent-[hsl(var(--electric))]" /><span className={cn(c.done && "text-muted-foreground line-through")}>{c.text}</span></label>))}</div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">Lampiran ({t.attachments.length})</h3>
              {canUpdate && <><input ref={file} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} /><Button size="sm" variant="outline" onClick={() => file.current?.click()}><Paperclip className="h-3.5 w-3.5" />Unggah</Button></>}</div>
            {t.attachments.length === 0 && <p className="text-sm text-muted-foreground">Belum ada lampiran.</p>}
            <div className="space-y-1.5">{t.attachments.map((a: any) => (
              <div key={a.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><Paperclip className="h-4 w-4 text-muted-foreground" /><span className="flex-1 truncate">{a.filename}</span><span className="text-xs text-muted-foreground">{(a.size / 1024).toFixed(1)} KB</span>
                <a href={`/api/files/${a.id}`} className="text-electric" aria-label={`Unduh ${a.filename}`}><Download className="h-4 w-4" /></a>
                {full && <button onClick={() => rmAtt(a.id)} className="text-muted-foreground hover:text-danger" aria-label="Hapus lampiran"><Trash2 className="h-4 w-4" /></button>}</div>))}</div>
          </section>

          <section>
            <div className="mb-3 flex gap-4 border-b text-sm">{(["comments", "history"] as const).map((k) => <button key={k} onClick={() => setTab(k)} className={cn("-mb-px border-b-2 pb-2 font-medium", tab === k ? "border-electric text-foreground" : "border-transparent text-muted-foreground")}>{k === "comments" ? `Komentar (${t.comments.length})` : `Riwayat perubahan (${t.logs.length})`}</button>)}</div>
            {tab === "comments" ? (<div className="space-y-3">
              {t.comments.length === 0 && <p className="text-sm text-muted-foreground">Belum ada komentar.</p>}
              {t.comments.map((c: any) => <div key={c.id} className="flex gap-2.5"><Avatar name={c.author?.name ?? "?"} color={c.author?.employee?.avatarColor} size={28} /><div className="min-w-0 flex-1 rounded-xl bg-muted px-3 py-2 text-sm"><div className="flex justify-between gap-2"><span className="font-medium">{c.author?.name ?? "Pengguna dihapus"}</span><span className="text-xs text-muted-foreground">{timeAgo(c.createdAt)}</span></div><p className="whitespace-pre-line">{c.body}</p></div></div>)}
              <div className="flex gap-2"><Textarea rows={2} placeholder="Tulis komentar…" value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendComment(); }} /><Button variant="accent" size="icon" loading={busy} onClick={sendComment} aria-label="Kirim komentar" className="self-end"><Send className="h-4 w-4" /></Button></div>
            </div>) : (<ol className="space-y-3 border-l pl-4">
              {t.logs.map((l: any) => <li key={l.id} className="relative text-sm"><span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-electric" /><span className="font-medium">{l.actorName}</span> <span className="text-muted-foreground">— {l.detail || l.action}</span><div className="text-xs text-muted-foreground">{fmtDate(l.createdAt, true)}</div></li>)}</ol>)}
          </section>
        </>)}
      </div>
      {edit && t && <TaskForm open onClose={() => setEdit(false)} onSaved={() => { reload(); onChanged(); }} task={t} employees={employees} projects={projects} departments={departments} />}
      <ConfirmDialog open={del} onClose={() => setDel(false)} title="Hapus tugas?" text={`${t?.code} — ${t?.title} akan dihapus beserta komentar, lampiran, dan riwayatnya.`}
        onConfirm={async () => { try { await api(`/api/tasks/${id}`, { method: "DELETE" }); toast("Tugas dihapus"); setDel(false); onChanged(); onClose(); } catch (e) { toast((e as Error).message, "error"); } }} />
    </Drawer>
  );
}

export function TaskCard({ t, onOpen, draggable, onDragStart }: { t: any; onOpen: () => void; draggable?: boolean; onDragStart?: (e: React.DragEvent) => void }) {
  const done = t.checklist?.filter((c: any) => c.done).length ?? 0;
  return (
    <div draggable={draggable} onDragStart={onDragStart} onClick={onOpen} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className="cursor-pointer rounded-xl border bg-card p-3 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing">
      <div className="mb-1.5 flex items-center justify-between"><span className="text-[11px] text-muted-foreground">{t.code}</span><PriorityBadge p={t.priority} /></div>
      <p className="text-[13.5px] font-medium leading-snug">{t.title}</p>
      {t.project && <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full" style={{ background: t.project.color }} />{t.project.name}</p>}
      <ProgressBar value={t.progress} className="mt-2.5" />
      <div className="mt-2.5 flex items-center justify-between">
        <AvatarStack people={t.assignees.map((a: any) => a.employee)} size={22} />
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {t.checklist?.length > 0 && <span>{done}/{t.checklist.length}</span>}
          {t._count?.comments > 0 && <span>💬 {t._count.comments}</span>}
          {t.deadline && <span className={cn(isOverdue(t) && "font-medium text-danger")}>{fmtDate(t.deadline)}</span>}
        </div>
      </div>
    </div>
  );
}
