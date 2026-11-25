"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { api } from "@/lib/client";
import { Button, EmployeePicker, Field, Input, Modal, Select, Textarea, useToast } from "./ui";
import { PROJECT_STATUS_LABEL, toInputDate } from "@/lib/utils";

const COLORS = ["#2563eb", "#7c3aed", "#0891b2", "#4f46e5", "#059669", "#db2777", "#d97706"];

export function ProjectForm({ open, onClose, onSaved, project, employees }: { open: boolean; onClose: () => void; onSaved: () => void; project?: any; employees: any[] }) {
  const toast = useToast();
  const [f, setF] = useState(() => ({
    name: project?.name ?? "", description: project?.description ?? "", status: project?.status ?? "PLANNING", color: project?.color ?? "#2563eb",
    managerId: project?.managerId ?? "", startDate: toInputDate(project?.startDate ?? new Date()), deadline: toInputDate(project?.deadline),
    memberIds: (project?.members ?? []).map((m: any) => m.employeeId ?? m.employee?.id) as string[],
    milestones: (project?.milestones ?? []).map((m: any) => ({ id: m.id, title: m.title, dueDate: toInputDate(m.dueDate), done: m.done })) as any[],
  }));
  const [ms, setMs] = useState(""); const [err, setErr] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    const e: Record<string, string> = {};
    if (f.name.trim().length < 3) e.name = "Nama proyek minimal 3 karakter";
    if (f.deadline && f.startDate && f.deadline < f.startDate) e.deadline = "Deadline tidak boleh sebelum tanggal mulai";
    setErr(e); if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const body = { ...f, managerId: f.managerId || null, deadline: f.deadline || null, startDate: f.startDate || null, milestones: f.milestones.map((m) => ({ ...m, dueDate: m.dueDate || null })) };
      if (project) await api(`/api/projects/${project.id}`, { method: "PATCH", body }); else await api("/api/projects", { body });
      toast(project ? "Proyek diperbarui" : "Proyek dibuat"); onSaved(); onClose();
    } catch (x) { toast((x as Error).message, "error"); } finally { setBusy(false); }
  }
  return (
    <Modal open={open} onClose={onClose} wide title={project ? "Edit proyek" : "Proyek baru"} footer={<><Button variant="outline" onClick={onClose}>Batal</Button><Button variant="accent" loading={busy} onClick={save}>Simpan</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama proyek" error={err.name} className="sm:col-span-2"><Input value={f.name} onChange={(e) => set("name", e.target.value)} autoFocus /></Field>
        <Field label="Deskripsi" className="sm:col-span-2"><Textarea rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
        <Field label="Project manager"><Select value={f.managerId} onChange={(e) => set("managerId", e.target.value)}><option value="">— Pilih —</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</Select></Field>
        <Field label="Status"><Select value={f.status} onChange={(e) => set("status", e.target.value)}>{Object.entries(PROJECT_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label="Tanggal mulai"><Input type="date" value={f.startDate} onChange={(e) => set("startDate", e.target.value)} /></Field>
        <Field label="Deadline" error={err.deadline}><Input type="date" value={f.deadline} onChange={(e) => set("deadline", e.target.value)} /></Field>
        <Field label="Warna" className="sm:col-span-2"><div className="flex gap-2 pt-1">{COLORS.map((c) => <button type="button" key={c} aria-label={c} aria-pressed={f.color === c} onClick={() => set("color", c)} className="h-7 w-7 rounded-full ring-offset-2 ring-offset-card aria-pressed:ring-2 aria-pressed:ring-electric" style={{ background: c }} />)}</div></Field>
        <Field label="Anggota tim" className="sm:col-span-2"><EmployeePicker employees={employees} value={f.memberIds} onChange={(v) => set("memberIds", v)} /></Field>
        <div className="sm:col-span-2"><span className="text-[13px] font-medium">Milestone</span>
          <div className="mt-1.5 space-y-1.5">{f.milestones.map((m, i) => (
            <div key={i} className="flex items-center gap-2"><input type="checkbox" checked={m.done} aria-label="Selesai" onChange={(e) => set("milestones", f.milestones.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x)))} className="h-4 w-4 accent-[hsl(var(--electric))]" />
              <span className="flex-1 text-sm">{m.title}</span><Input type="date" className="w-40" value={m.dueDate} onChange={(e) => set("milestones", f.milestones.map((x, j) => (j === i ? { ...x, dueDate: e.target.value } : x)))} />
              <button type="button" aria-label="Hapus" onClick={() => set("milestones", f.milestones.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-danger"><X className="h-4 w-4" /></button></div>))}
            <div className="flex gap-2"><Input placeholder="Tambah milestone…" value={ms} onChange={(e) => setMs(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && ms.trim()) { e.preventDefault(); set("milestones", [...f.milestones, { title: ms.trim(), dueDate: "", done: false }]); setMs(""); } }} />
              <Button type="button" variant="outline" onClick={() => { if (ms.trim()) { set("milestones", [...f.milestones, { title: ms.trim(), dueDate: "", done: false }]); setMs(""); } }}><Plus className="h-4 w-4" /></Button></div></div></div>
      </div>
    </Modal>
  );
}
