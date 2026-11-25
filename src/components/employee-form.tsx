"use client";
import { useState } from "react";
import { Button, EmployeePicker, Field, Input, Modal, Select, Textarea, useToast } from "./ui";
import { api } from "@/lib/client";
import { AVAIL_LABEL } from "@/lib/utils";

const COLORS = ["#0a1530", "#2563eb", "#0891b2", "#4f46e5", "#db2777", "#7c3aed", "#059669", "#dc2626", "#d97706"];

export function EmployeeForm({ open, onClose, onSaved, employee, departments, all }: { open: boolean; onClose: () => void; onSaved: () => void; employee?: any; departments: { id: string; name: string }[]; all: any[] }) {
  const toast = useToast();
  const init = () => ({
    name: employee?.name ?? "", title: employee?.title ?? "", departmentId: employee?.departmentId ?? "", managerId: employee?.managerId ?? "",
    availability: employee?.availability ?? "AVAILABLE", avatarColor: employee?.avatarColor ?? "#2563eb", bio: employee?.bio ?? "",
    personality: employee?.personality ?? "", communicationStyle: employee?.communicationStyle ?? "", responsibilities: employee?.responsibilities ?? "",
    targets: employee?.targets ?? "", skills: (employee?.skills ?? []).map((s: any) => s.name).join(", "), collaboratorIds: (employee?.collaborators ?? []).map((c: any) => c.id) as string[],
  });
  const [f, setF] = useState(init); const [err, setErr] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    const e: Record<string, string> = {};
    if (f.name.trim().length < 2) e.name = "Nama minimal 2 karakter";
    if (f.title.trim().length < 2) e.title = "Jabatan wajib diisi";
    if (!f.departmentId) e.departmentId = "Pilih divisi";
    setErr(e); if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const body = { ...f, managerId: f.managerId || null, skills: f.skills.split(",").map((s: string) => s.trim()).filter(Boolean) };
      if (employee) await api(`/api/employees/${employee.id}`, { method: "PATCH", body }); else await api("/api/employees", { body });
      toast(employee ? "Profil diperbarui" : "Karyawan ditambahkan"); onSaved(); onClose();
    } catch (x) { toast((x as Error).message, "error"); } finally { setBusy(false); }
  }
  const others = all.filter((e) => e.id !== employee?.id);
  return (
    <Modal open={open} onClose={onClose} wide title={employee ? `Edit profil — ${employee.name}` : "Tambah karyawan"} footer={<><Button variant="outline" onClick={onClose}>Batal</Button><Button variant="accent" loading={busy} onClick={save}>Simpan</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama" error={err.name}><Input value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Jabatan" error={err.title}><Input value={f.title} onChange={(e) => set("title", e.target.value)} /></Field>
        <Field label="Divisi" error={err.departmentId}><Select value={f.departmentId} onChange={(e) => set("departmentId", e.target.value)}><option value="">Pilih divisi…</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
        <Field label="Atasan langsung"><Select value={f.managerId} onChange={(e) => set("managerId", e.target.value)}><option value="">— Tidak ada —</option>{others.map((e) => <option key={e.id} value={e.id}>{e.name} — {e.title}</option>)}</Select></Field>
        <Field label="Status ketersediaan"><Select value={f.availability} onChange={(e) => set("availability", e.target.value)}>{Object.entries(AVAIL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label="Warna avatar"><div className="flex flex-wrap gap-2 pt-1">{COLORS.map((c) => <button type="button" key={c} aria-label={c} aria-pressed={f.avatarColor === c} onClick={() => set("avatarColor", c)} className="h-7 w-7 rounded-full ring-offset-2 ring-offset-card transition-all aria-pressed:ring-2 aria-pressed:ring-electric" style={{ background: c }} />)}</div></Field>
        <Field label="Deskripsi karakter" className="sm:col-span-2"><Textarea value={f.bio} onChange={(e) => set("bio", e.target.value)} rows={2} /></Field>
        <Field label="Kepribadian"><Input value={f.personality} onChange={(e) => set("personality", e.target.value)} /></Field>
        <Field label="Gaya komunikasi"><Input value={f.communicationStyle} onChange={(e) => set("communicationStyle", e.target.value)} /></Field>
        <Field label="Keahlian" hint="Pisahkan dengan koma" className="sm:col-span-2"><Input value={f.skills} onChange={(e) => set("skills", e.target.value)} placeholder="Python, SQL, Figma" /></Field>
        <Field label="Tanggung jawab" className="sm:col-span-2"><Textarea value={f.responsibilities} onChange={(e) => set("responsibilities", e.target.value)} rows={2} /></Field>
        <Field label="Target pekerjaan" className="sm:col-span-2"><Textarea value={f.targets} onChange={(e) => set("targets", e.target.value)} rows={2} /></Field>
        <Field label="Rekan kolaborasi" className="sm:col-span-2"><EmployeePicker employees={others} value={f.collaboratorIds} onChange={(v) => set("collaboratorIds", v)} /></Field>
      </div>
    </Modal>
  );
}
