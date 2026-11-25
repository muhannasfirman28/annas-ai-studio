"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { Bot, Building2, KeyRound, Palette, Plus, ShieldCheck, Trash2, Users } from "lucide-react";
import { api, useApi } from "@/lib/client";
import { Avatar, Badge, Button, Card, CardHeader, ConfirmDialog, ErrorState, Field, Input, Modal, PageHeader, PageLoading, Select, Textarea, useToast } from "@/components/ui";
import { useApp } from "@/components/app-context";
import { ROLE_LABEL, cn, fmtDate } from "@/lib/utils";

const NOTIF: Record<string, string> = { TASK_ASSIGNED: "Tugas baru", DEADLINE_CHANGED: "Perubahan deadline", TASK_COMPLETED: "Tugas selesai", TASK_OVERDUE: "Tugas terlambat", NEW_COMMENT: "Komentar baru / mention", NEW_REPORT: "Laporan baru", NEW_PROJECT: "Proyek baru", REVIEW_REQUESTED: "Permintaan review" };

function SettingsInner() {
  const { can } = useApp(); const sp = useSearchParams();
  const company = can("settings.read"); const manage = can("users.manage");
  const tabs = [
    ...(company ? [{ k: "company", l: "Perusahaan", i: Building2 }, { k: "visual", l: "Visual & tema", i: Palette }, { k: "notif", l: "Notifikasi", i: KeyRound }] : []),
    ...(manage ? [{ k: "users", l: "Pengguna & role", i: Users }] : []),
    ...(company ? [{ k: "ai", l: "Integrasi & AI", i: Bot }] : []),
    { k: "security", l: "Keamanan", i: ShieldCheck },
  ];
  const [tab, setTab] = useState(tabs.find((t) => t.k === sp.get("tab"))?.k ?? tabs[0].k);
  const { data, error, loading, reload } = useApi<any>(company ? "/api/settings" : null);
  return (
    <div className="animate-in">
      <PageHeader title="Pengaturan" subtitle="Konfigurasi perusahaan, pengguna, integrasi AI, dan keamanan." />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Pengaturan">{tabs.map((t) => <button key={t.k} onClick={() => setTab(t.k)} aria-current={tab === t.k} className={cn("flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium", tab === t.k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><t.i className="h-4 w-4" />{t.l}</button>)}</nav>
        <div className="min-w-0">
          {tab === "security" ? <Security /> : loading && !data ? <PageLoading /> : error || !data ? <ErrorState message={error ?? "Gagal memuat"} onRetry={reload} /> :
            tab === "company" ? <CompanyTab d={data} reload={reload} /> : tab === "visual" ? <VisualTab d={data} reload={reload} /> : tab === "notif" ? <NotifTab d={data} reload={reload} /> :
            tab === "users" ? <UsersTab d={data} reload={reload} /> : <AiTab d={data} reload={reload} />}
        </div>
      </div>
    </div>
  );
}
export default function SettingsPage() { return <Suspense fallback={<PageLoading />}><SettingsInner /></Suspense>; }

function useSave(reload: () => void) {
  const toast = useToast(); const [busy, setBusy] = useState(false);
  return { busy, save: async (body: any, msg = "Pengaturan disimpan") => { setBusy(true); try { await api("/api/settings", { method: "PATCH", body }); toast(msg); reload(); } catch (e) { toast((e as Error).message, "error"); } finally { setBusy(false); } } };
}

function CompanyTab({ d, reload }: any) {
  const { can } = useApp(); const s = d.settings; const w = can("settings.write"); const { busy, save } = useSave(reload);
  const [f, setF] = useState({ name: s.name, tagline: s.tagline, founder: s.founder, vision: s.vision, industries: s.industries.join("\n"), missions: s.missions.join("\n") });
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }));
  const lines = (v: string) => v.split("\n").map((x) => x.trim()).filter(Boolean);
  return (
    <Card><CardHeader title="Informasi perusahaan" subtitle="Visi, misi, dan bidang usaha." />
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Nama perusahaan"><Input disabled={!w} value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Founder & CEO"><Input disabled={!w} value={f.founder} onChange={(e) => set("founder", e.target.value)} /></Field>
        <Field label="Tagline" className="sm:col-span-2"><Input disabled={!w} value={f.tagline} onChange={(e) => set("tagline", e.target.value)} /></Field>
        <Field label="Visi" className="sm:col-span-2"><Textarea disabled={!w} rows={3} value={f.vision} onChange={(e) => set("vision", e.target.value)} /></Field>
        <Field label="Misi (satu per baris)"><Textarea disabled={!w} rows={8} value={f.missions} onChange={(e) => set("missions", e.target.value)} /></Field>
        <Field label="Bidang perusahaan (satu per baris)"><Textarea disabled={!w} rows={8} value={f.industries} onChange={(e) => set("industries", e.target.value)} /></Field>
        {w && <div className="sm:col-span-2"><Button variant="accent" loading={busy} onClick={() => save({ name: f.name, tagline: f.tagline, founder: f.founder, vision: f.vision, missions: lines(f.missions), industries: lines(f.industries) })}>Simpan</Button></div>}
      </div></Card>
  );
}

function VisualTab({ d, reload }: any) {
  const { can } = useApp(); const s = d.settings; const w = can("settings.write"); const { busy, save } = useSave(reload); const toast = useToast(); const { theme, setTheme } = useTheme();
  const [c, setC] = useState({ primaryColor: s.primaryColor, secondaryColor: s.secondaryColor, accentColor: s.accentColor }); const [logo, setLogo] = useState<string | null>(s.logoUrl);
  function onLogo(file?: File) {
    if (!file) return; if (!file.type.startsWith("image/")) return toast("File harus berupa gambar", "error"); if (file.size > 250_000) return toast("Ukuran logo maksimal 250 KB", "error");
    const r = new FileReader(); r.onload = () => setLogo(String(r.result)); r.readAsDataURL(file);
  }
  return (
    <div className="space-y-4">
      <Card><CardHeader title="Tema tampilan" subtitle="Disimpan per perangkat." />
        <div className="flex gap-2 p-5">{["light", "dark", "system"].map((t) => <Button key={t} variant={theme === t ? "primary" : "outline"} onClick={() => setTheme(t)}>{{ light: "Terang", dark: "Gelap", system: "Ikuti sistem" }[t]}</Button>)}</div></Card>
      <Card><CardHeader title="Logo & identitas visual" subtitle="Warna merek disimpan sebagai referensi identitas perusahaan." />
        <div className="grid gap-5 p-5 sm:grid-cols-3">
          <Field label="Primary (Navy)"><Input type="color" disabled={!w} className="h-10 p-1" value={c.primaryColor} onChange={(e) => setC({ ...c, primaryColor: e.target.value })} /></Field>
          <Field label="Secondary (Electric Blue)"><Input type="color" disabled={!w} className="h-10 p-1" value={c.secondaryColor} onChange={(e) => setC({ ...c, secondaryColor: e.target.value })} /></Field>
          <Field label="Accent (Soft Cyan)"><Input type="color" disabled={!w} className="h-10 p-1" value={c.accentColor} onChange={(e) => setC({ ...c, accentColor: e.target.value })} /></Field>
          <div className="sm:col-span-3 flex items-center gap-4">{logo ? <img src={logo} alt="Logo" className="h-16 w-16 rounded-xl border object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-xl border bg-muted text-xs text-muted-foreground">Logo</div>}
            {w && <div className="flex gap-2"><label className="inline-flex h-9 cursor-pointer items-center rounded-lg border bg-card px-4 font-medium hover:bg-muted">Unggah logo<input type="file" accept="image/*" hidden onChange={(e) => onLogo(e.target.files?.[0])} /></label>{logo && <Button variant="ghost" onClick={() => setLogo(null)}>Hapus</Button>}</div>}</div>
          {w && <div className="sm:col-span-3"><Button variant="accent" loading={busy} onClick={() => save({ ...c, logoUrl: logo ?? "" }, "Identitas visual disimpan. Muat ulang halaman untuk melihat logo baru.")}>Simpan</Button></div>}
        </div></Card>
    </div>
  );
}

function NotifTab({ d, reload }: any) {
  const { can } = useApp(); const w = can("settings.write"); const { busy, save } = useSave(reload);
  const [p, setP] = useState<Record<string, boolean>>({ ...Object.fromEntries(Object.keys(NOTIF).map((k) => [k, true])), ...d.settings.notificationPrefs });
  return (
    <Card><CardHeader title="Pengaturan notifikasi" subtitle="Jenis notifikasi yang dibuat sistem untuk seluruh pengguna." />
      <div className="divide-y p-2">{Object.entries(NOTIF).map(([k, l]) => <label key={k} className="flex items-center justify-between px-3 py-3 text-sm"><span>{l}</span><input type="checkbox" disabled={!w} checked={p[k]} onChange={(e) => setP({ ...p, [k]: e.target.checked })} className="h-4 w-4 accent-[hsl(var(--electric))]" /></label>)}</div>
      {w && <div className="p-5 pt-2"><Button variant="accent" loading={busy} onClick={() => save({ notificationPrefs: p })}>Simpan</Button></div>}</Card>
  );
}

function UsersTab({ d, reload }: any) {
  const toast = useToast(); const { me } = useApp(); const emps = useApi<any>("/api/employees");
  const [add, setAdd] = useState(false); const [del, setDel] = useState<any>(null);
  const [f, setF] = useState({ name: "", email: "", password: "", role: "EMPLOYEE", employeeId: "" });
  const [perm, setPerm] = useState<Record<string, string[]>>(Object.fromEntries(d.roles.map((r: any) => [r.key, r.permissions])));
  async function createUser() { try { await api("/api/users", { body: { ...f, employeeId: f.employeeId || null } }); toast("Pengguna dibuat"); setAdd(false); setF({ name: "", email: "", password: "", role: "EMPLOYEE", employeeId: "" }); reload(); } catch (e) { toast((e as Error).message, "error"); } }
  async function patch(id: string, body: any) { try { await api(`/api/users/${id}`, { method: "PATCH", body }); toast("Pengguna diperbarui"); reload(); } catch (e) { toast((e as Error).message, "error"); } }
  async function savePerm(key: string) { try { await api(`/api/roles/${key}`, { method: "PATCH", body: { permissions: perm[key] } }); toast(`Permission ${ROLE_LABEL[key]} disimpan`); reload(); } catch (e) { toast((e as Error).message, "error"); } }
  return (
    <div className="space-y-4">
      <Card><CardHeader title="Pengguna" subtitle="Akun yang dapat masuk ke dashboard." action={<Button size="sm" variant="accent" onClick={() => setAdd(true)}><Plus className="h-3.5 w-3.5" />Pengguna</Button>} />
        <div className="overflow-x-auto p-2"><table className="w-full text-left text-sm"><thead className="text-xs text-muted-foreground"><tr>{["Pengguna", "Role", "Status", "Login terakhir", ""].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>{d.users.map((u: any) => <tr key={u.id} className="border-t"><td className="px-3 py-2.5"><div className="font-medium">{u.name}</div><div className="text-xs text-muted-foreground">{u.email}</div></td>
            <td className="px-3 py-2.5">{u.role === "FOUNDER" ? <Badge className="bg-electric/10 text-electric">Founder</Badge> : <Select className="h-8 w-36" value={u.role} onChange={(e) => patch(u.id, { role: e.target.value })} aria-label={`Role ${u.name}`}>{["EXECUTIVE", "MANAGER", "EMPLOYEE"].map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</Select>}</td>
            <td className="px-3 py-2.5">{u.role === "FOUNDER" ? "Aktif" : <button onClick={() => patch(u.id, { active: !u.active })} className={cn("rounded-md px-2 py-0.5 text-xs font-medium", u.active ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-500/10 text-slate-500")}>{u.active ? "Aktif" : "Nonaktif"}</button>}</td>
            <td className="px-3 py-2.5 text-muted-foreground">{u.lastLoginAt ? fmtDate(u.lastLoginAt, true) : "—"}</td>
            <td className="px-3 py-2.5 text-right">{u.role !== "FOUNDER" && u.id !== me.id && <Button variant="ghost" size="icon" aria-label="Hapus" onClick={() => setDel(u)}><Trash2 className="h-4 w-4 text-danger" /></Button>}</td></tr>)}</tbody></table></div></Card>
      <Card><CardHeader title="Role & permissions" subtitle="Founder selalu memiliki akses penuh dan tidak dapat diubah." />
        <div className="grid gap-4 p-5 lg:grid-cols-3">{d.roles.filter((r: any) => r.key !== "FOUNDER").map((r: any) => (
          <div key={r.key} className="rounded-xl border p-4"><div className="font-medium">{r.name}</div><p className="mb-3 text-xs text-muted-foreground">{r.description}</p>
            <div className="space-y-1.5">{d.allPermissions.map((p: string) => <label key={p} className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={perm[r.key].includes(p)} onChange={(e) => setPerm({ ...perm, [r.key]: e.target.checked ? [...perm[r.key], p] : perm[r.key].filter((x) => x !== p) })} className="accent-[hsl(var(--electric))]" />{p}</label>)}</div>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => savePerm(r.key)}>Simpan</Button></div>))}</div></Card>
      <Modal open={add} onClose={() => setAdd(false)} title="Tambah pengguna" footer={<><Button variant="outline" onClick={() => setAdd(false)}>Batal</Button><Button variant="accent" onClick={createUser}>Buat</Button></>}>
        <div className="space-y-4"><Field label="Nama"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field><Field label="Email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Password awal"><Input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
          <Field label="Role"><Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>{["EXECUTIVE", "MANAGER", "EMPLOYEE"].map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</Select></Field>
          <Field label="Terhubung ke karyawan" hint="Menentukan tugas dan laporan milik pengguna"><Select value={f.employeeId} onChange={(e) => setF({ ...f, employeeId: e.target.value })}><option value="">— Tidak ada —</option>{emps.data?.employees.filter((e: any) => !e.user).map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}</Select></Field></div></Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title="Hapus pengguna?" text={`Akun ${del?.email} tidak akan bisa masuk lagi.`} onConfirm={async () => { try { await api(`/api/users/${del.id}`, { method: "DELETE" }); toast("Pengguna dihapus"); setDel(null); reload(); } catch (e) { toast((e as Error).message, "error"); } }} />
    </div>
  );
}

function AiTab({ d, reload }: any) {
  const { can } = useApp(); const w = can("settings.write"); const toast = useToast(); const { busy, save } = useSave(reload);
  const s = d.settings.integrations; const [i, setI] = useState({ provider: s.provider ?? "openai", baseUrl: s.baseUrl ?? "", defaultModel: s.defaultModel ?? "" });
  const [agents, setAgents] = useState<any[]>(d.agents);
  const upd = (id: string, k: string, v: any) => setAgents((a) => a.map((x) => (x.id === id ? { ...x, [k]: v } : x)));
  async function saveAgent(a: any) { try { await api(`/api/agents/${a.id}`, { method: "PATCH", body: { provider: a.provider, model: a.model, systemPrompt: a.systemPrompt, temperature: Number(a.temperature), enabled: a.enabled } }); toast(`Agent ${a.employee.name} disimpan`); } catch (e) { toast((e as Error).message, "error"); } }
  return (
    <div className="space-y-4">
      <Card><CardHeader title="Integrasi API" />
        <div className="space-y-4 p-5"><div className={cn("flex items-start gap-3 rounded-xl border p-4 text-sm", d.llm.configured ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5")}>
          <KeyRound className="mt-0.5 h-4 w-4" /><div><b>{d.llm.configured ? "OPENAI_API_KEY terdeteksi di server." : "OPENAI_API_KEY belum diatur."}</b><p className="text-muted-foreground">{d.llm.configured ? "Balasan dan ringkasan AI dapat digunakan. Keberhasilan panggilan ke provider baru terlihat saat fitur dipakai." : "Tambahkan OPENAI_API_KEY (dan opsional OPENAI_BASE_URL) ke file .env lalu restart server. Kunci tidak pernah disimpan di database atau ditampilkan di UI."}</p></div></div>
          <div className="grid gap-4 sm:grid-cols-3"><Field label="Provider"><Input disabled={!w} value={i.provider} onChange={(e) => setI({ ...i, provider: e.target.value })} /></Field><Field label="Base URL (catatan)"><Input disabled={!w} value={i.baseUrl} onChange={(e) => setI({ ...i, baseUrl: e.target.value })} /></Field><Field label="Model default"><Input disabled={!w} value={i.defaultModel} onChange={(e) => setI({ ...i, defaultModel: e.target.value })} /></Field></div>
          {w && <Button variant="accent" loading={busy} onClick={() => save({ integrations: i })}>Simpan</Button>}</div></Card>
      <Card><CardHeader title="Konfigurasi agent AI" subtitle="Aktifkan agent agar dapat membalas di Kolaborasi. Prompt dibuat dari profil karyawan." />
        <div className="space-y-3 p-5">{agents.map((a) => (
          <details key={a.id} className="group rounded-xl border"><summary className="flex cursor-pointer items-center gap-3 p-3"><Avatar name={a.employee.name} color={a.employee.avatarColor} size={32} /><span className="flex-1"><span className="block text-sm font-medium">{a.employee.name}</span><span className="block text-xs text-muted-foreground">{a.employee.title}</span></span><Badge className={a.enabled ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}>{a.enabled ? "Aktif" : "Nonaktif"}</Badge></summary>
            <div className="grid gap-3 border-t p-4 sm:grid-cols-2"><Field label="Provider"><Input disabled={!w} value={a.provider} onChange={(e) => upd(a.id, "provider", e.target.value)} /></Field><Field label="Model"><Input disabled={!w} value={a.model} onChange={(e) => upd(a.id, "model", e.target.value)} /></Field><Field label={`Temperature: ${a.temperature}`}><input type="range" min={0} max={2} step={0.1} disabled={!w} value={a.temperature} onChange={(e) => upd(a.id, "temperature", e.target.value)} className="w-full accent-[hsl(var(--electric))]" /></Field>
              <Field label="System prompt" className="sm:col-span-2"><Textarea rows={4} disabled={!w} value={a.systemPrompt} onChange={(e) => upd(a.id, "systemPrompt", e.target.value)} /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={!w} checked={a.enabled} onChange={(e) => upd(a.id, "enabled", e.target.checked)} className="accent-[hsl(var(--electric))]" />Aktifkan agent</label>{w && <div className="sm:col-span-2"><Button size="sm" variant="outline" onClick={() => saveAgent(a)}>Simpan agent</Button></div>}</div></details>))}</div></Card>
    </div>
  );
}

function Security() {
  const { can } = useApp(); const toast = useToast(); const sec = useApi<any>(can("settings.read") ? "/api/settings" : null);
  const [f, setF] = useState({ current: "", next: "", confirm: "" }); const [busy, setBusy] = useState(false); const { busy: b2, save } = useSave(() => sec.reload());
  const [pol, setPol] = useState<{ sessionHours: number; minPasswordLength: number } | null>(null);
  const policy = pol ?? sec.data?.settings.security ?? null;
  async function change() {
    if (f.next !== f.confirm) return toast("Konfirmasi password tidak cocok", "error");
    setBusy(true); try { await api("/api/auth/password", { body: { current: f.current, next: f.next } }); toast("Password diubah"); setF({ current: "", next: "", confirm: "" }); } catch (e) { toast((e as Error).message, "error"); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-4">
      <Card><CardHeader title="Ganti password" /><div className="grid max-w-md gap-4 p-5">
        <Field label="Password saat ini"><Input type="password" autoComplete="current-password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} /></Field>
        <Field label="Password baru"><Input type="password" autoComplete="new-password" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} /></Field>
        <Field label="Konfirmasi password baru"><Input type="password" autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} /></Field>
        <div><Button variant="accent" loading={busy} onClick={change}>Ubah password</Button></div></div></Card>
      {policy && can("settings.write") && <Card><CardHeader title="Kebijakan keamanan" subtitle="Berlaku untuk sesi login baru dan password baru." />
        <div className="grid max-w-md gap-4 p-5"><Field label="Durasi sesi (jam)"><Input type="number" min={1} max={168} value={policy.sessionHours ?? 12} onChange={(e) => setPol({ ...policy, sessionHours: Number(e.target.value) })} /></Field>
          <Field label="Panjang minimal password"><Input type="number" min={6} max={64} value={policy.minPasswordLength ?? 8} onChange={(e) => setPol({ ...policy, minPasswordLength: Number(e.target.value) })} /></Field>
          <div><Button variant="accent" loading={b2} onClick={() => save({ security: policy })}>Simpan</Button></div></div></Card>}
      <Card className="p-5 text-sm text-muted-foreground"><b className="text-foreground">Perlindungan aktif:</b> password di-hash (bcrypt), sesi memakai cookie httpOnly bertanda tangan, percobaan login dibatasi, seluruh API memeriksa izin per role di server.</Card>
    </div>
  );
}
