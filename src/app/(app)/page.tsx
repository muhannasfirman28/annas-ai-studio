"use client";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, CheckCircle2, Clock, FolderKanban, Gauge, ListChecks, Users, Activity } from "lucide-react";
import { useApi } from "@/lib/client";
import { Avatar, Badge, Card, CardHeader, EmptyState, ErrorState, PageHeader, PageLoading, ProgressBar, StatCard } from "@/components/ui";
import { AVAIL_LABEL, STATUS_TONE, timeAgo, cn } from "@/lib/utils";
import { useApp } from "@/components/app-context";

const grid = "hsl(var(--border))"; const tick = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };
const tip = { contentStyle: { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12 } };

export default function Dashboard() {
  const { me } = useApp();
  const { data: d, error, loading, reload } = useApi<any>("/api/dashboard");
  if (loading) return <PageLoading />;
  if (error || !d) return <ErrorState message={error ?? "Gagal memuat"} onRetry={reload} />;
  const t = d.totals;
  const hour = new Date().getHours();
  const greet = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 19 ? "Selamat sore" : "Selamat malam";

  return (
    <div className="animate-in space-y-6">
      <PageHeader title={`${greet}, ${me.name}`} subtitle="Ringkasan operasional Annas AI Studio hari ini." actions={<Link href="/tasks?new=1" className="inline-flex h-9 items-center rounded-lg bg-electric px-4 font-medium text-white hover:opacity-90">+ Tugas baru</Link>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Karyawan AI" value={t.employees} icon={<Users className="h-4 w-4" />} hint="Seluruh divisi" />
        <StatCard label="Total proyek" value={t.projects} icon={<FolderKanban className="h-4 w-4" />} tone="text-violet-500" />
        <StatCard label="Tugas aktif" value={t.active} icon={<ListChecks className="h-4 w-4" />} hint="Dalam pengerjaan & review" tone="text-sky-500" />
        <StatCard label="Tugas selesai" value={t.completed} icon={<CheckCircle2 className="h-4 w-4" />} tone="text-emerald-500" />
        <StatCard label="Tugas tertunda" value={t.pending} icon={<Clock className="h-4 w-4" />} hint="Backlog, To Do, Blocked, Revision" tone="text-amber-500" />
        <StatCard label="Lewat deadline" value={t.overdue} icon={<AlertTriangle className="h-4 w-4" />} hint="Belum selesai" tone="text-red-500" />
        <StatCard label="Tingkat produktivitas" value={t.productivity === null ? "—" : `${t.productivity}%`} icon={<Gauge className="h-4 w-4" />} hint={t.productivity === null ? "Belum ada data deadline" : "Tugas selesai tepat waktu"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <Card><CardHeader title="Penyelesaian tugas" subtitle="14 hari terakhir" />
          <div className="h-64 px-2 pb-4 pt-3"><ResponsiveContainer><LineChart data={d.trend}><CartesianGrid stroke={grid} vertical={false} /><XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} interval={1} /><YAxis allowDecimals={false} tick={tick} tickLine={false} axisLine={false} width={28} /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="completed" name="Selesai" stroke="#2563eb" strokeWidth={2.5} dot={false} /><Line type="monotone" dataKey="created" name="Dibuat" stroke="#22d3ee" strokeWidth={2} dot={false} strokeDasharray="4 3" /></LineChart></ResponsiveContainer></div></Card>
        <Card><CardHeader title="Produktivitas karyawan" subtitle="Dihitung dari tugas yang ditugaskan" />
          <div className="h-64 px-2 pb-4 pt-3"><ResponsiveContainer><BarChart data={d.employeePerformance}><CartesianGrid stroke={grid} vertical={false} /><XAxis dataKey="name" tick={tick} tickLine={false} axisLine={false} /><YAxis domain={[0, 100]} tick={tick} tickLine={false} axisLine={false} width={32} unit="%" /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="produktivitas" name="Tepat waktu" fill="#2563eb" radius={[4, 4, 0, 0]} /><Bar dataKey="penyelesaian" name="Penyelesaian" fill="#22d3ee" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
        <Card><CardHeader title="Aktivitas proyek" subtitle="Status tugas per proyek" />
          <div className="h-64 px-2 pb-4 pt-3"><ResponsiveContainer><BarChart data={d.projectActivity} layout="vertical" margin={{ left: 10 }}><CartesianGrid stroke={grid} horizontal={false} /><XAxis type="number" allowDecimals={false} tick={tick} tickLine={false} axisLine={false} /><YAxis type="category" dataKey="name" tick={tick} tickLine={false} axisLine={false} width={120} /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="selesai" name="Selesai" stackId="a" fill="#10b981" /><Bar dataKey="berjalan" name="Berjalan" stackId="a" fill="#2563eb" /><Bar dataKey="menunggu" name="Menunggu" stackId="a" fill="#94a3b8" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div></Card>
        <Card><CardHeader title="Distribusi pekerjaan" subtitle="Tugas terbuka per divisi" />
          <div className="h-64 px-2 pb-4 pt-3">{d.distribution.length ? <ResponsiveContainer><PieChart><Pie data={d.distribution} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>{d.distribution.map((x: any) => <Cell key={x.name} fill={x.color} />)}</Pie><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer> : <EmptyState title="Belum ada tugas terbuka" />}</div></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr] [&>*]:min-w-0">
        <Card><CardHeader title="Employee overview" action={<Link href="/employees" className="text-xs text-electric">Lihat semua</Link>} />
          <div className="overflow-x-auto p-2"><table className="w-full text-left text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="px-3 py-2 font-medium">Karyawan</th><th className="px-3 py-2 font-medium">Divisi</th><th className="px-3 py-2 font-medium">Status</th><th className="px-3 py-2 font-medium">Aktif</th><th className="w-40 px-3 py-2 font-medium">Progress</th></tr></thead>
            <tbody>{d.employees.map((e: any) => (
              <tr key={e.id} className="border-t hover:bg-muted/50"><td className="px-3 py-2.5"><Link href={`/employees/${e.id}`} className="flex items-center gap-2.5"><Avatar name={e.name} color={e.avatarColor} size={32} status={e.availability} /><span><span className="block font-medium">{e.name}</span><span className="block max-w-[200px] truncate text-xs text-muted-foreground">{e.title}</span></span></Link></td>
                <td className="px-3 py-2.5 text-muted-foreground">{e.department.name}</td><td className="px-3 py-2.5">{AVAIL_LABEL[e.availability]}</td><td className="px-3 py-2.5">{e.stats.active}</td>
                <td className="px-3 py-2.5"><div className="flex items-center gap-2"><ProgressBar value={e.stats.avgProgress} /><span className="w-9 text-xs text-muted-foreground">{e.stats.avgProgress}%</span></div></td></tr>))}</tbody></table></div></Card>
        <div className="space-y-4">
          <Card><CardHeader title="Aktivitas terbaru" />
            <div className="space-y-1 p-3">{d.activities.length === 0 && <EmptyState title="Belum ada aktivitas" />}{d.activities.map((a: any) => (
              <Link key={a.id} href={a.link ?? "#"} className="flex gap-3 rounded-lg p-2 hover:bg-muted"><span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-electric/10 text-electric"><Activity className="h-3.5 w-3.5" /></span><span className="min-w-0 text-sm"><span className="block">{a.message}</span><span className="text-xs text-muted-foreground">{timeAgo(a.createdAt)}</span></span></Link>))}</div></Card>
          <Card><CardHeader title="Laporan terbaru" action={<Link href="/reports" className="text-xs text-electric">Semua</Link>} />
            <div className="space-y-1 p-3">{d.reports.length === 0 && <EmptyState title="Belum ada laporan" />}{d.reports.map((r: any) => (
              <Link key={r.id} href="/reports" className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted"><Avatar name={r.employee.name} color={r.employee.avatarColor} size={30} /><span className="min-w-0 flex-1 text-sm"><span className="block truncate font-medium">{r.employee.name}</span><span className="block truncate text-xs text-muted-foreground">{r.project?.name ?? "Umum"} · {timeAgo(r.createdAt)}</span></span>
                <Badge className={cn(r.status === "On Track" ? STATUS_TONE.COMPLETED : STATUS_TONE.REVISION)}>{r.status}</Badge></Link>))}</div></Card>
        </div>
      </div>
    </div>
  );
}
