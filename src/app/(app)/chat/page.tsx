"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bot, FileText, Hash, Megaphone, MessageSquare, Send, Sparkles, Users } from "lucide-react";
import { api, useApi } from "@/lib/client";
import { Avatar, Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, Spinner, useToast } from "@/components/ui";
import { useApp } from "@/components/app-context";
import { PRIORITIES, PRIORITY_LABEL, cn, fmtDate, timeAgo } from "@/lib/utils";

const WORKFLOW = [["Annas", "memberi instruksi proyek"], ["Arjun", "menguraikan menjadi tugas"], ["Kenji", "menentukan pendekatan teknis"], ["Mei Lin", "mendesain UI/UX"], ["Hiroshi", "mengembangkan aplikasi"], ["Min-jun", "integrasi AI"], ["Aisha", "analisis data"], ["Wei Zhang", "pengujian & validasi"]];

function ChatInner() {
  const { me, can } = useApp(); const toast = useToast(); const sp = useSearchParams();
  const convs = useApi<any>("/api/conversations"); const emps = useApi<any>("/api/employees");
  const [cid, setCid] = useState<string | null>(sp.get("c"));
  const [messages, setMessages] = useState<any[]>([]); const [loading, setLoading] = useState(false);
  const [body, setBody] = useState(""); const [kind, setKind] = useState<"MESSAGE" | "INSTRUCTION">("MESSAGE");
  const [createTask, setCreateTask] = useState(false); const [priority, setPriority] = useState("MEDIUM"); const [deadline, setDeadline] = useState("");
  const [sending, setSending] = useState(false); const [summary, setSummary] = useState<any>(null); const [sumLoading, setSumLoading] = useState(false);
  const [aiEmp, setAiEmp] = useState(""); const [aiBusy, setAiBusy] = useState(false);
  const [toolInfo, setToolInfo] = useState<Record<string, { tools: any[]; confirmation: any | null }>>({});
  const [confirmBusy, setConfirmBusy] = useState<string | null>(null);
  const [mention, setMention] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null); const list: any[] = convs.data?.conversations ?? []; const employees: any[] = emps.data?.employees ?? [];

  useEffect(() => { if (!cid && list.length) setCid(list[0].id); }, [list, cid]);
  useEffect(() => {
    if (!cid) return; let alive = true; setLoading(true); setMessages([]);
    api<any>(`/api/conversations/${cid}/messages`).then((d) => alive && setMessages(d.messages)).catch((e) => toast(e.message, "error")).finally(() => alive && setLoading(false));
    const t = setInterval(async () => {
      try { const d = await api<any>(`/api/conversations/${cid}/messages`); if (alive) setMessages((cur) => (d.messages.length !== cur.length ? d.messages : cur)); } catch {}
    }, 5000);
    return () => { alive = false; clearInterval(t); };
  }, [cid]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const conv = list.find((c) => c.id === cid);
  async function send() {
    if (!body.trim() || !cid) return; setSending(true);
    try {
      const r = await api<any>(`/api/conversations/${cid}/messages`, { body: { body, kind, createTask: kind === "INSTRUCTION" && createTask, priority, deadline: deadline || undefined } });
      setMessages((m) => [...m, r.message]); setBody(""); convs.reload();
      if (r.task) toast(`Tugas ${r.task.code} dibuat dari instruksi`);
    } catch (e) { toast((e as Error).message, "error"); } finally { setSending(false); }
  }
  function onChange(v: string) {
    setBody(v); const m = /@([\p{L}\- ]*)$/u.exec(v); setMention(m ? m[1].toLowerCase() : null);
  }
  function pick(name: string) { setBody((b) => b.replace(/@([\p{L}\- ]*)$/u, `@${name} `)); setMention(null); }
  async function loadSummary(ai = false) {
    if (!cid) return; setSumLoading(true);
    try { setSummary(await api(`/api/conversations/${cid}/summary${ai ? "?ai=1" : ""}`)); } catch (e) { toast((e as Error).message, "error"); } finally { setSumLoading(false); }
  }
  async function askAi() {
    if (!aiEmp || !cid) return; setAiBusy(true);
    try {
      const r = await api<any>(`/api/conversations/${cid}/ai`, { body: { employeeId: aiEmp } });
      setMessages((m) => [...m, r.message]);
      setToolInfo((cur) => ({ ...cur, [r.message.id]: { tools: r.tools ?? [], confirmation: r.confirmation ?? null } }));
    } catch (e) { toast((e as Error).message, "error"); } finally { setAiBusy(false); }
  }
  async function actConfirm(messageId: string, token: string, action: "approve" | "cancel") {
    if (!cid) return; setConfirmBusy(messageId);
    try {
      const r = await api<any>(`/api/conversations/${cid}/ai/confirm`, { body: { token, action } });
      setMessages((m) => [...m, r.message]);
      setToolInfo((cur) => {
        const prev = cur[messageId] ?? { tools: [], confirmation: null };
        return { ...cur, [messageId]: {
          tools: prev.tools.map((t: any) => t.status === "pending" ? { ...t, status: action === "approve" ? "ok" : "cancelled" } : t),
          confirmation: null,
        } };
      });
      toast(action === "approve" ? "Aksi agent dijalankan" : "Aksi dibatalkan");
    } catch (e) { toast((e as Error).message, "error"); } finally { setConfirmBusy(null); }
  }
  const sugg = mention === null ? [] : employees.filter((e) => e.name.toLowerCase().includes(mention)).slice(0, 5);
  const groups = [["GENERAL", "Umum", Hash], ["PROJECT", "Proyek", Megaphone], ["DIVISION", "Divisi", Users]] as const;

  return (
    <div className="animate-in">
      <PageHeader title="Kolaborasi AI" subtitle="Chat internal, diskusi proyek/divisi, mention, dan pengiriman instruksi yang tercatat." />
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="max-h-[calc(100vh-13rem)] overflow-y-auto p-2">
          {convs.loading && <div className="p-6 text-center"><Spinner /></div>}
          {groups.map(([type, label, Icon]) => { const items = list.filter((c) => c.type === type); if (!items.length) return null; return (
            <div key={type} className="mb-2"><div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
              {items.map((c) => (
                <button key={c.id} onClick={() => { setCid(c.id); setSummary(null); }} className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors", cid === c.id ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                  <Icon className="h-4 w-4 shrink-0 opacity-70" /><span className="min-w-0 flex-1"><span className="block truncate font-medium">{c.title}</span><span className={cn("block truncate text-xs", cid === c.id ? "opacity-80" : "text-muted-foreground")}>{c.messages[0] ? `${c.messages[0].authorEmployee?.name ?? "—"}: ${c.messages[0].body}` : "Belum ada pesan"}</span></span>
                  {c._count.messages > 0 && <span className="text-[11px] opacity-70">{c._count.messages}</span>}</button>))}</div>); })}
        </Card>

        <Card className="flex h-[calc(100vh-13rem)] min-h-[480px] flex-col">
          {!conv ? <div className="m-auto"><EmptyState icon={<MessageSquare className="h-5 w-5" />} title="Pilih percakapan" /></div> : (<>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3"><div><h2 className="font-semibold">{conv.title}</h2><p className="text-xs text-muted-foreground">{conv._count.messages} pesan · semua pesan tersimpan sebagai riwayat</p></div>
              <div className="flex flex-wrap items-center gap-2">
                <Select className="h-8 w-36 text-[13px]" value={aiEmp} onChange={(e) => setAiEmp(e.target.value)} aria-label="Pilih karyawan AI"><option value="">Karyawan AI…</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</Select>
                <Button size="sm" variant="outline" disabled={!aiEmp} loading={aiBusy} onClick={askAi}><Bot className="h-3.5 w-3.5" />Minta balasan</Button>
                <Button size="sm" variant="outline" loading={sumLoading} onClick={() => loadSummary()}><FileText className="h-3.5 w-3.5" />Ringkasan</Button></div></div>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {loading && <div className="text-center"><Spinner /></div>}
              {!loading && messages.length === 0 && <EmptyState icon={<MessageSquare className="h-5 w-5" />} title="Belum ada pesan" text="Mulai percakapan atau kirim instruksi dengan @mention karyawan." />}
              {messages.map((m) => { const mine = m.authorUserId === me.id; const name = m.authorEmployee?.name ?? m.authorUser?.name ?? "Sistem"; const info = toolInfo[m.id]; return (
                <div key={m.id} className={cn("flex gap-2.5", mine && "flex-row-reverse")}>
                  <Avatar name={name} color={m.authorEmployee?.avatarColor} size={32} />
                  <div className={cn("max-w-[75%] rounded-2xl px-3.5 py-2 text-sm", mine ? "bg-primary text-primary-foreground" : "bg-muted", m.kind === "INSTRUCTION" && "ring-2 ring-electric/50")}>
                    <div className={cn("mb-0.5 flex items-center gap-2 text-xs", mine ? "opacity-80" : "text-muted-foreground")}><span className="font-medium">{name}</span>{m.kind === "INSTRUCTION" && <Badge className="bg-electric text-white">Instruksi</Badge>}{m.generatedByAi && <Badge className="bg-violet-500/20 text-violet-500"><Sparkles className="h-3 w-3" />AI</Badge>}<span>{timeAgo(m.createdAt)}</span></div>
                    <p className="whitespace-pre-line break-words">{m.body}</p>
                    {!!info?.tools?.length && <details className="mt-2 text-xs text-muted-foreground"><summary className="cursor-pointer">{info.tools.length} tool dipakai</summary><ul className="mt-1 space-y-0.5">{info.tools.map((t: any, idx: number) => <li key={idx}>• {t.name} — {t.status === "ok" ? "berhasil" : t.status === "error" ? "gagal" : t.status === "cancelled" ? "dibatalkan" : "menunggu konfirmasi"}</li>)}</ul></details>}
                    {info?.confirmation && <div className="mt-2 rounded-lg border border-electric/40 bg-electric/5 p-2 text-xs"><details><summary className="cursor-pointer font-medium text-electric">1 aksi menunggu konfirmasi</summary><p className="mt-1 whitespace-pre-line text-muted-foreground">{info.confirmation.summary}</p></details><div className="mt-2 flex gap-2"><Button size="sm" variant="accent" disabled={confirmBusy === m.id} onClick={() => actConfirm(m.id, info.confirmation.token, "approve")}>Konfirmasi</Button><Button size="sm" variant="outline" disabled={confirmBusy === m.id} onClick={() => actConfirm(m.id, info.confirmation.token, "cancel")}>Batal</Button></div></div>}
                  </div></div>); })}
              <div ref={end} />
            </div>
            {can("chat.use") && (
              <div className="relative border-t p-3">
                {sugg.length > 0 && <div className="animate-in absolute bottom-full left-3 mb-1 w-64 rounded-xl border bg-card p-1 shadow-xl">{sugg.map((e) => <button key={e.id} onClick={() => pick(e.name)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted"><Avatar name={e.name} color={e.avatarColor} size={24} />{e.name}<span className="ml-auto truncate text-xs text-muted-foreground">{e.department.name}</span></button>)}</div>}
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                  <div className="inline-flex rounded-lg bg-muted p-0.5">{(["MESSAGE", "INSTRUCTION"] as const).map((k) => <button key={k} onClick={() => setKind(k)} className={cn("rounded-md px-2.5 py-1 font-medium", kind === k ? "bg-card shadow-sm" : "text-muted-foreground")}>{k === "MESSAGE" ? "Pesan" : "Instruksi"}</button>)}</div>
                  {kind === "INSTRUCTION" && can("tasks.write") && <>
                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={createTask} onChange={(e) => setCreateTask(e.target.checked)} className="accent-[hsl(var(--electric))]" />Jadikan tugas</label>
                    {createTask && <><Select className="h-7 w-auto py-0 text-xs" value={priority} onChange={(e) => setPriority(e.target.value)}>{PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</Select><Input type="date" className="h-7 w-36 text-xs" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></>}</>}
                </div>
                <div className="flex gap-2"><Input value={body} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={kind === "INSTRUCTION" ? "Tulis instruksi, gunakan @Nama untuk menugaskan…" : "Tulis pesan… (@ untuk mention)"} aria-label="Pesan" />
                  <Button variant="accent" loading={sending} onClick={send} aria-label="Kirim"><Send className="h-4 w-4" /></Button></div>
              </div>)}
          </>)}
        </Card>
      </div>

      <Card className="mt-4 p-5"><h3 className="font-semibold">Alur kolaborasi proyek</h3><p className="mb-3 text-xs text-muted-foreground">Peran standar tiap karyawan dalam satu proyek. Gunakan instruksi + mention + “Jadikan tugas” untuk mengalirkan pekerjaan.</p>
        <ol className="flex flex-wrap gap-2">{WORKFLOW.map(([n, r], i) => <li key={n} className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px]"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-electric/10 text-[11px] font-semibold text-electric">{i + 1}</span><b>{n}</b><span className="text-muted-foreground">{r}</span></li>)}</ol></Card>

      <Modal open={!!summary} onClose={() => setSummary(null)} title={`Ringkasan — ${conv?.title ?? ""}`} footer={<Button variant="outline" loading={sumLoading} onClick={() => loadSummary(true)}><Sparkles className="h-4 w-4" />Ringkasan AI</Button>}>
        {summary && <div className="space-y-4 text-sm">
          <div className="grid grid-cols-3 gap-3 text-center">{[["Pesan", summary.total], ["Peserta", summary.participants.length], ["Instruksi", summary.instructions.length]].map(([k, v]) => <div key={k as string} className="rounded-xl bg-muted p-3"><div className="text-xl font-semibold">{v}</div><div className="text-xs text-muted-foreground">{k}</div></div>)}</div>
          <p className="text-muted-foreground">{summary.total ? `Percakapan dari ${fmtDate(summary.firstAt, true)} sampai ${fmtDate(summary.lastAt, true)}.` : "Belum ada pesan."}</p>
          {summary.participants.length > 0 && <div><div className="mb-1 text-xs text-muted-foreground">Peserta</div>{summary.participants.join(", ")}</div>}
          {summary.mentioned.length > 0 && <div><div className="mb-1 text-xs text-muted-foreground">Disebut</div>{summary.mentioned.join(", ")}</div>}
          {summary.instructions.length > 0 && <div><div className="mb-1 text-xs text-muted-foreground">Instruksi terakhir</div><ul className="space-y-1.5">{summary.instructions.map((i: any, k: number) => <li key={k} className="rounded-lg border p-2"><b>{i.by}</b>: {i.body}</li>)}</ul></div>}
          {summary.aiSummary && <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3"><div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-violet-500"><Sparkles className="h-3.5 w-3.5" />Ringkasan AI</div><p className="whitespace-pre-line">{summary.aiSummary}</p></div>}
          <p className="text-xs text-muted-foreground">Statistik dihitung dari pesan nyata. Ringkasan AI memerlukan OPENAI_API_KEY.</p></div>}
      </Modal>
    </div>
  );
}
export default function ChatPage() { return <Suspense><ChatInner /></Suspense>; }
