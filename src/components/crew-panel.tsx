"use client";
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Bot, Check, ChevronRight, CircleAlert, Code2, Download, FileCode2, FolderTree, Loader2, Play, X,
} from "lucide-react";
import { api } from "@/lib/client";
import { Badge, Button, Card, CardHeader, EmptyState, Modal, Spinner, Textarea, useToast } from "@/components/ui";

const Sandpack: any = dynamic(() => import("@codesandbox/sandpack-react").then((m) => m.Sandpack), { ssr: false });

class PreviewBoundary extends React.Component<{ children: React.ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: unknown) { return { error: (e as Error)?.message ?? "Preview gagal dimuat." }; }
  render() { return this.state.error ? <div className="rounded-xl border p-4 text-sm text-muted-foreground">Preview tidak tersedia: {this.state.error}</div> : this.props.children; }
}

const PLACEHOLDER_BRIEF = `# WEBSITE PROJECT SPECIFICATION

Nama: Annas Firman – Personal Portfolio
Tujuan: portfolio pribadi profesional sebagai Full-Stack Web Developer.
Halaman: Home, About Me, Skills, Experience, Projects, Certifications, Contact.
Gaya: modern, minimalis, elegan, hitam/putih/dark navy, typography clean, animasi subtle, responsive.
Tech: Next.js App Router, TypeScript, Tailwind CSS, Framer Motion, Lucide React.
Konten: Annas Firman, S1 Sistem Informasi Universitas Bina Bangsa (E-Business), internship Diskominfo Provinsi Banten, PHP/Laravel/JS/React/Next.js/MySQL/HTML/CSS/Git, Knowledge Base, Kost + Midtrans.
Contact: link email, LinkedIn, GitHub (tanpa form backend).
Prioritas: UI/UX, responsive, navigasi berfungsi, project showcase, SEO.`;

export function CrewPanel({ projectId, write }: { projectId: string; write: boolean }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState(PLACEHOLDER_BRIEF);
  const [plan, setPlan] = useState<any>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [tab, setTab] = useState<"files" | "preview">("files");
  const [busy, setBusy] = useState(false);

  async function loadFiles() {
    try { const d = await api<any>(`/api/projects/${projectId}/files`); setFiles(d.files ?? []); }
    catch { /* file belum ada */ }
  }
  useEffect(() => { loadFiles(); }, [projectId]);

  // Pulihkan status run terakhir setelah halaman dimuat ulang.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await api<any>(`/api/projects/${projectId}/crew`);
        const latest = list.runs?.[0];
        if (!latest || !alive) return;
        const s = await api<any>(`/api/projects/${projectId}/crew/${latest.id}`);
        if (alive) { setRunId(s.id); setStatus(s); }
      } catch { /* belum ada run */ }
    })();
    return () => { alive = false; };
  }, [projectId]);

  useEffect(() => {
    if (!status || status.status !== "RUNNING" || !runId) return;
    const timer = setInterval(async () => {
      try {
        const s = await api<any>(`/api/projects/${projectId}/crew/${runId}`);
        setStatus(s);
        if (s.status !== "RUNNING") { clearInterval(timer); loadFiles(); }
      } catch { clearInterval(timer); }
    }, 2000);
    return () => clearInterval(timer);
  }, [status?.status, runId, projectId]);

  async function makePlan() {
    setBusy(true);
    try {
      const d = await api<any>(`/api/projects/${projectId}/crew`, { body: { brief } });
      setPlan(d.run);
    } catch (e) { toast((e as Error).message, "error"); }
    finally { setBusy(false); }
  }

  async function approve() {
    if (!plan) return;
    setBusy(true);
    try {
      const r = await api<any>(`/api/projects/${projectId}/crew/${plan.id}/approve`, { body: {} });
      setRunId(plan.id); setStatus({ ...r, plan: plan.plan }); setOpen(false);
      toast("Crew berjalan: satu karyawan selesai, lanjut ke karyawan berikutnya");
      loadFiles();
    } catch (e) { toast((e as Error).message, "error"); }
    finally { setBusy(false); }
  }

  async function openFile(path: string) {
    setActive(path); setContent("");
    try {
      const res = await fetch(`/api/projects/${projectId}/files/${path.split("/").map(encodeURIComponent).join("/")}`);
      if (!res.ok) throw new Error("Gagal membaca file");
      setContent(await res.text());
    } catch (e) { toast((e as Error).message, "error"); }
  }

  async function resume() {
    if (!status?.id) return;
    setBusy(true);
    try {
      const r = await api<any>(`/api/projects/${projectId}/crew/${status.id}/approve`, { body: {} });
      setRunId(status.id); setStatus({ ...r, plan: status.plan });
      toast("Crew dilanjutkan otomatis dari rencana terakhir");
      loadFiles();
    } catch (e) { toast((e as Error).message, "error"); }
    finally { setBusy(false); }
  }

  const steps: any[] = plan?.plan?.steps ?? status?.plan?.steps ?? [];
  const actions: any[] = status?.actions ?? [];
  const pendingApproval = status?.status === "PLANNED" || status?.status === "APPROVED";
  const byEmployee = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of actions) {
      const cur = map[a.employeeId];
      if (a.status === "ERROR") map[a.employeeId] = "ERROR";
      else if (a.status === "PENDING") map[a.employeeId] = cur === "DONE" ? "DONE" : "RUNNING";
      else if (!cur || cur === "RUNNING") map[a.employeeId] = "DONE";
    }
    return map;
  }, [actions]);
  const runningCount = steps.filter((s) => byEmployee[s.employeeId] === "RUNNING").length;
  const doneCount = steps.filter((s) => byEmployee[s.employeeId] === "DONE").length;
  const statusTone = (s?: string) => s === "DONE" ? "bg-emerald-500/10 text-emerald-600" : s === "ERROR" || s === "FAILED" ? "bg-red-500/10 text-red-600" : s === "RUNNING" ? "bg-violet-500/10 text-violet-600" : s === "APPROVED" ? "bg-amber-500/10 text-amber-600" : "bg-muted text-muted-foreground";
  const statusLabel = (s?: string) => s === "DONE" ? "Selesai" : s === "ERROR" || s === "FAILED" ? "Gagal" : s === "RUNNING" ? "Berjalan" : s === "APPROVED" ? "Siap jalan" : "Menunggu";

  const sandpackFiles = useMemo(() => {
    const out: Record<string, string> = {};
    for (const f of files) out[`/${f.path}`] = f.content;
    return Object.keys(out).length ? out : { "/App.js": "export default function App(){return <h1>Belum ada file hasil crew.</h1>}" };
  }, [files]);

  return (
    <Card>
      <CardHeader
        title="Crew penulisan kode"
        subtitle="Karyawan AI membaca hasil sebelumnya, lalu menulis bagiannya berurutan."
        action={write && <Button size="sm" variant="accent" onClick={() => { setPlan(null); setOpen(true); }}><Bot className="h-3.5 w-3.5" />Jalankan crew</Button>}
      />
      <div className="p-5">
        {status && (
          <div className="mb-5 rounded-xl border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                {status.status === "RUNNING" ? <Loader2 className="h-4 w-4 animate-spin text-violet-500" /> : status.status === "DONE" ? <Check className="h-4 w-4 text-emerald-500" /> : pendingApproval ? <Play className="h-4 w-4 text-amber-500" /> : <CircleAlert className="h-4 w-4 text-red-500" />}
                {status.status === "RUNNING" ? `Crew berjalan · ${doneCount}/${steps.length} karyawan selesai` : status.status === "DONE" ? "Crew selesai" : pendingApproval ? (status.status === "APPROVED" ? "Siap dijalankan" : "Menunggu persetujuan") : "Crew terhenti"}
              </div>
              <div className="flex items-center gap-2">
                {pendingApproval && write && <Button size="sm" variant="accent" loading={busy} onClick={resume}><Play className="h-3.5 w-3.5" />Lanjutkan crew</Button>}
                <Badge className={statusTone(status.status)}>{statusLabel(status.status)}</Badge>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{status.summary}</p>
            {status.error && <p className="mt-2 text-xs text-danger">{status.error}</p>}
          </div>
        )}

        {steps.length > 0 && (
          <div className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s.employeeId} className="flex items-center gap-2 rounded-lg border p-2.5 text-xs">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted font-semibold">{i + 1}</span>
                <span className="min-w-0 flex-1"><b className="block truncate">{s.name}</b><span className="block truncate text-muted-foreground">{s.focus}</span></span>
                <Badge className={statusTone(byEmployee[s.employeeId])}>{statusLabel(byEmployee[s.employeeId])}</Badge>
              </div>
            ))}
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-lg bg-muted p-1 text-xs">
            {(["files", "preview"] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`rounded-md px-3 py-1.5 font-medium capitalize ${tab === t ? "bg-card shadow-sm" : "text-muted-foreground"}`}>{t === "files" ? "Kode & file" : "Live preview"}</button>)}
          </div>
          <a href={`/api/projects/${projectId}/files.zip`} className="inline-flex items-center gap-2 text-sm font-medium hover:text-electric"><Download className="h-4 w-4" />Download ZIP</a>
        </div>

        {tab === "files" ? (
          files.length === 0 ? <EmptyState icon={<FolderTree className="h-5 w-5" />} title="Belum ada file" text="Jalankan crew untuk menghasilkan source website." /> : (
            <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
              <div className="max-h-96 space-y-0.5 overflow-y-auto rounded-xl border p-2">
                {files.map((f) => <button key={f.path} onClick={() => openFile(f.path)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs ${active === f.path ? "bg-electric/10 text-electric" : "hover:bg-muted"}`}>
                  <FileCode2 className="h-3.5 w-3.5 shrink-0" /><span className="min-w-0 flex-1 truncate">{f.path}</span><span className="text-[10px] text-muted-foreground">v{f.version}</span>
                </button>)}
              </div>
              <div className="min-w-0 rounded-xl border bg-muted/40">
                <div className="flex items-center gap-2 border-b px-3 py-2 text-xs text-muted-foreground"><Code2 className="h-3.5 w-3.5" />{active ?? "Pilih file untuk melihat isinya"}</div>
                <pre className="max-h-96 overflow-auto p-3 text-[12px] leading-5">{content || "// Pilih file di daftar kiri"}</pre>
              </div>
            </div>
          )
        ) : (
          <PreviewBoundary>
            <div className="overflow-hidden rounded-xl border"><Sandpack template="nextjs" files={sandpackFiles} options={{ activeFile: "/app/page.tsx", showLineNumbers: true }} /></div>
          </PreviewBoundary>
        )}
      </div>

      <Modal
        open={open} onClose={() => setOpen(false)} wide
        title="Rencana kerja karyawan AI"
        footer={<><Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>{plan ? <Button variant="accent" loading={busy} onClick={approve}><Play className="h-4 w-4" />Setujui & Jalankan</Button> : <Button variant="accent" loading={busy} onClick={makePlan}>Buat rencana</Button>}</>}
      >
        {!plan ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Tempel brief website. Sistem akan membagi pekerjaan ke 8 karyawan sesuai peran mereka.</p>
            <Textarea rows={14} value={brief} onChange={(e) => setBrief(e.target.value)} aria-label="Brief website" />
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground">{plan.summary}</div>
            <div className="space-y-2">
              {plan.plan.steps.map((s: any, i: number) => (
                <div key={s.employeeId} className="rounded-xl border p-3">
                  <div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-electric/10 text-[11px] font-semibold text-electric">{i + 1}</span><b>{s.name}</b><span className="text-xs text-muted-foreground">{s.title}</span></div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{s.task} · Fokus: {s.focus}</p>
                  {s.files.length > 0 && <p className="mt-1 truncate text-[11px] text-muted-foreground">File: {s.files.join(", ")}</p>}
                </div>
              ))}
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><ChevronRight className="h-3.5 w-3.5" />Satu kali persetujuan untuk seluruh tugas, catatan, dan file. Crew berjalan otomatis berurutan.</p>
          </div>
        )}
      </Modal>
    </Card>
  );
}
