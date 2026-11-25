"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { api, useApi } from "@/lib/client";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, PageLoading, Select, useToast } from "@/components/ui";
import { cn, timeAgo } from "@/lib/utils";

const TYPES: Record<string, string> = { TASK_ASSIGNED: "Tugas baru", DEADLINE_CHANGED: "Perubahan deadline", TASK_COMPLETED: "Tugas selesai", TASK_OVERDUE: "Tugas terlambat", NEW_COMMENT: "Komentar baru", NEW_REPORT: "Laporan baru", NEW_PROJECT: "Proyek baru", REVIEW_REQUESTED: "Permintaan review" };
const TONE: Record<string, string> = { TASK_OVERDUE: "bg-red-500/10 text-red-600", TASK_COMPLETED: "bg-emerald-500/10 text-emerald-600", REVIEW_REQUESTED: "bg-violet-500/10 text-violet-600", DEADLINE_CHANGED: "bg-amber-500/10 text-amber-600" };

export default function NotificationsPage() {
  const router = useRouter(); const toast = useToast();
  const [type, setType] = useState(""); const [unread, setUnread] = useState(false);
  const qs = new URLSearchParams({ limit: "200", ...(type && { type }), ...(unread && { unread: "1" }) }).toString();
  const { data, error, loading, reload } = useApi<any>(`/api/notifications?${qs}`);
  const refresh = () => { reload(); window.dispatchEvent(new Event("notif-changed")); };
  async function mark(ids: string[] | null, read = true) { try { await api("/api/notifications", { method: "PATCH", body: ids ? { ids, read } : { all: true } }); refresh(); } catch (e) { toast((e as Error).message, "error"); } }
  return (
    <div className="animate-in">
      <PageHeader title="Notifikasi" subtitle={data ? `${data.unread} belum dibaca` : ""} actions={<Button variant="outline" onClick={() => mark(null)} disabled={!data?.unread}><CheckCheck className="h-4 w-4" />Tandai semua dibaca</Button>} />
      <div className="mb-4 flex flex-wrap gap-2"><Select className="w-auto" value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter jenis"><option value="">Semua jenis</option>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        <label className="flex items-center gap-2 rounded-lg border bg-card px-3 text-sm"><input type="checkbox" checked={unread} onChange={(e) => setUnread(e.target.checked)} className="accent-[hsl(var(--electric))]" />Hanya belum dibaca</label></div>
      {loading && !data ? <PageLoading /> : error ? <ErrorState message={error} onRetry={reload} /> : !data.notifications.length ? <EmptyState icon={<Bell className="h-5 w-5" />} title="Tidak ada notifikasi" text="Notifikasi muncul saat ada tugas, komentar, laporan, atau deadline." /> : (
        <Card className="divide-y">{data.notifications.map((n: any) => (
          <div key={n.id} className={cn("flex items-start gap-3 px-5 py-4", !n.read && "bg-electric/5")}>
            <span className={cn("mt-2 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-electric")} />
            <button className="min-w-0 flex-1 text-left" onClick={async () => { if (!n.read) await mark([n.id]); if (n.link) router.push(n.link); }}>
              <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{n.title}</span><Badge className={TONE[n.type] ?? "bg-muted text-muted-foreground"}>{TYPES[n.type]}</Badge></div>
              <p className="text-sm text-muted-foreground">{n.body}</p><p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(n.createdAt)}</p></button>
            <Button size="sm" variant="ghost" onClick={() => mark([n.id], !n.read)}>{n.read ? "Tandai belum dibaca" : "Tandai dibaca"}</Button></div>))}</Card>)}
    </div>
  );
}
