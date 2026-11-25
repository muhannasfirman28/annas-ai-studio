"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Briefcase, CheckCheck, ChevronRight, FolderKanban, LayoutDashboard, ListChecks, LogOut, Menu, MessageSquare, Moon, Network, Search, Settings, ShoppingBag, Sparkles, Sun, Users, BarChart3, X } from "lucide-react";
import { AppCtx, makeCan, type Me } from "./app-context";
import { Avatar, Badge } from "./ui";
import { api, useDebounced } from "@/lib/client";
import { cn, ROLE_LABEL, timeAgo } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/employees", label: "Karyawan", icon: Users },
  { href: "/organization", label: "Struktur Organisasi", icon: Network },
  { href: "/tasks", label: "Tugas", icon: ListChecks },
  { href: "/projects", label: "Proyek", icon: FolderKanban },
  { href: "/chat", label: "Kolaborasi", icon: MessageSquare },
  { href: "/shop", label: "Toko", icon: ShoppingBag },
  { href: "/reports", label: "Laporan", icon: BarChart3, perm: "reports.read" },
  { href: "/notifications", label: "Notifikasi", icon: Bell },
  { href: "/settings", label: "Pengaturan", icon: Settings },
];
const CRUMB: Record<string, string> = { employees: "Karyawan", organization: "Struktur Organisasi", tasks: "Tugas", projects: "Proyek", chat: "Kolaborasi", shop: "Toko", reports: "Laporan", notifications: "Notifikasi", settings: "Pengaturan" };

export function Shell({ me, permissions, brand, children }: { me: Me; permissions: string[]; brand: { name: string; logoUrl: string | null }; children: React.ReactNode }) {
  const can = useMemo(() => makeCan(permissions), [permissions]);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const nav = NAV.filter((n) => !n.perm || can(n.perm));
  const seg = pathname.split("/").filter(Boolean);

  return (
    <AppCtx.Provider value={{ me, permissions, can }}>
      <div className="min-h-screen">
        {/* Sidebar */}
        <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-card transition-transform lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
          <div className="flex h-16 items-center justify-between px-5">
            <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
              {brand.logoUrl ? <img src={brand.logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" /> : <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Sparkles className="h-4 w-4" /></span>}
              <span className="leading-tight">{brand.name}<span className="block text-[10px] font-normal uppercase tracking-wider text-muted-foreground">AI Company Dashboard</span></span>
            </Link>
            <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Tutup menu"><X className="h-5 w-5" /></button>
          </div>
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2" aria-label="Navigasi utama">
            {nav.map((n) => {
              const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
              return (
                <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined}
                  className={cn("group flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors", active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                  <n.icon className="h-[18px] w-[18px]" />{n.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t p-3">
            <Link href={me.employeeId ? `/employees/${me.employeeId}` : "/"} className="flex items-center gap-2.5 rounded-lg p-2 hover:bg-muted">
              <Avatar name={me.name} color={me.avatarColor} size={34} />
              <div className="min-w-0"><div className="truncate text-sm font-medium">{me.name}</div><div className="truncate text-xs text-muted-foreground">{ROLE_LABEL[me.role]}</div></div>
            </Link>
          </div>
        </aside>
        {open && <div className="fixed inset-0 z-30 bg-navy-950/40 lg:hidden" onClick={() => setOpen(false)} />}

        <div className="lg:pl-64">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur lg:px-8">
            <button className="rounded-lg p-2 hover:bg-muted lg:hidden" onClick={() => setOpen(true)} aria-label="Buka menu"><Menu className="h-5 w-5" /></button>
            <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
              <Link href="/" className="hover:text-foreground">Annas AI Studio</Link>
              {seg.map((s, i) => (
                <span key={i} className="flex items-center gap-1.5"><ChevronRight className="h-3.5 w-3.5" />
                  <span className={i === seg.length - 1 ? "font-medium text-foreground" : ""}>{CRUMB[s] ?? "Detail"}</span></span>
              ))}
              {seg.length === 0 && <span className="flex items-center gap-1.5"><ChevronRight className="h-3.5 w-3.5" /><span className="font-medium text-foreground">Dashboard</span></span>}
            </nav>
            <div className="flex-1" />
            <GlobalSearch />
            <ThemeToggle />
            <NotificationBell />
            <ProfileMenu me={me} />
          </header>
          <main className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8">{children}</main>
        </div>
      </div>
    </AppCtx.Provider>
  );
}

function useOutside(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) cb(); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [ref, cb]);
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [m, setM] = useState(false); useEffect(() => setM(true), []);
  return (
    <button className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Ganti tema" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
      {m && resolvedTheme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}

type SearchRes = { employees: { id: string; name: string; title: string; avatarColor: string }[]; tasks: { id: string; code: string; title: string }[]; projects: { id: string; name: string; color: string }[] };
function GlobalSearch() {
  const [q, setQ] = useState(""); const dq = useDebounced(q, 250);
  const [res, setRes] = useState<SearchRes | null>(null); const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null); const input = useRef<HTMLInputElement>(null); const router = useRouter();
  useOutside(ref, () => setOpen(false));
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); input.current?.focus(); } };
    document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k);
  }, []);
  useEffect(() => { if (dq.trim().length < 2) { setRes(null); return; } api<SearchRes>(`/api/search?q=${encodeURIComponent(dq)}`).then(setRes).catch(() => setRes(null)); }, [dq]);
  const go = (href: string) => { setOpen(false); setQ(""); router.push(href); };
  const empty = res && !res.employees.length && !res.tasks.length && !res.projects.length;
  return (
    <div ref={ref} className="relative hidden w-72 md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Cari karyawan, tugas, proyek…" aria-label="Pencarian global"
        className="h-9 w-full rounded-lg border bg-card pl-9 pr-12 text-sm focus:border-electric focus:outline-none focus:ring-2 focus:ring-electric/20" />
      <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border bg-muted px-1.5 text-[10px] text-muted-foreground">⌘K</kbd>
      {open && dq.trim().length >= 2 && (
        <div className="animate-in absolute left-0 right-0 top-11 max-h-96 overflow-y-auto rounded-xl border bg-card p-1.5 shadow-xl">
          {!res && <p className="px-3 py-2 text-sm text-muted-foreground">Mencari…</p>}
          {empty && <p className="px-3 py-2 text-sm text-muted-foreground">Tidak ada hasil untuk “{dq}”.</p>}
          {res?.employees.map((e) => <button key={e.id} onClick={() => go(`/employees/${e.id}`)} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-muted"><Avatar name={e.name} color={e.avatarColor} size={28} /><span className="min-w-0"><span className="block truncate text-sm font-medium">{e.name}</span><span className="block truncate text-xs text-muted-foreground">{e.title}</span></span></button>)}
          {res?.tasks.map((t) => <button key={t.id} onClick={() => go(`/tasks?open=${t.id}`)} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-muted"><ListChecks className="h-4 w-4 text-muted-foreground" /><span className="truncate text-sm"><span className="text-muted-foreground">{t.code}</span> {t.title}</span></button>)}
          {res?.projects.map((p) => <button key={p.id} onClick={() => go(`/projects/${p.id}`)} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-muted"><Briefcase className="h-4 w-4" style={{ color: p.color }} /><span className="truncate text-sm">{p.name}</span></button>)}
        </div>
      )}
    </div>
  );
}

type Notif = { id: string; title: string; body: string; link: string | null; read: boolean; createdAt: string };
function NotificationBell() {
  const [open, setOpen] = useState(false); const [items, setItems] = useState<Notif[]>([]); const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null); const router = useRouter();
  useOutside(ref, () => setOpen(false));
  const load = () => api<{ notifications: Notif[]; unread: number }>("/api/notifications?limit=8").then((d) => { setItems(d.notifications); setUnread(d.unread); }).catch(() => {});
  useEffect(() => { load(); const t = setInterval(load, 30000); const h = () => load(); window.addEventListener("notif-changed", h); return () => { clearInterval(t); window.removeEventListener("notif-changed", h); }; }, []);
  async function readAll() { await api("/api/notifications", { method: "PATCH", body: { all: true } }); load(); window.dispatchEvent(new Event("notif-changed")); }
  async function click(n: Notif) {
    if (!n.read) await api("/api/notifications", { method: "PATCH", body: { ids: [n.id] } });
    setOpen(false); load(); if (n.link) router.push(n.link);
  }
  return (
    <div ref={ref} className="relative">
      <button className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label={`Notifikasi, ${unread} belum dibaca`} onClick={() => { setOpen(!open); if (!open) load(); }}>
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="animate-in absolute right-0 top-11 w-[22rem] max-w-[calc(100vw-2rem)] rounded-xl border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-3"><span className="font-semibold">Notifikasi</span>
            <button onClick={readAll} disabled={!unread} className="flex items-center gap-1 text-xs text-electric disabled:text-muted-foreground"><CheckCheck className="h-3.5 w-3.5" />Tandai semua dibaca</button></div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted-foreground">Belum ada notifikasi.</p>}
            {items.map((n) => (
              <button key={n.id} onClick={() => click(n)} className={cn("flex w-full gap-3 border-b px-4 py-3 text-left last:border-0 hover:bg-muted", !n.read && "bg-electric/5")}>
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-electric")} />
                <span className="min-w-0"><span className="block truncate text-sm font-medium">{n.title}</span><span className="block truncate text-xs text-muted-foreground">{n.body}</span><span className="text-[11px] text-muted-foreground">{timeAgo(n.createdAt)}</span></span>
              </button>
            ))}
          </div>
          <Link href="/notifications" onClick={() => setOpen(false)} className="block border-t px-4 py-2.5 text-center text-sm text-electric hover:bg-muted">Lihat semua</Link>
        </div>
      )}
    </div>
  );
}

function ProfileMenu({ me }: { me: Me }) {
  const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false));
  async function logout() { await api("/api/auth/logout", { method: "POST", body: {} }); location.href = "/login"; }
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-label="Menu profil" className="rounded-full"><Avatar name={me.name} color={me.avatarColor} size={34} /></button>
      {open && (
        <div className="animate-in absolute right-0 top-11 w-60 rounded-xl border bg-card p-1.5 shadow-xl">
          <div className="px-3 py-2"><div className="font-medium">{me.name}</div><div className="truncate text-xs text-muted-foreground">{me.email}</div><Badge className="mt-1.5 bg-electric/10 text-electric">{ROLE_LABEL[me.role]}</Badge></div>
          <div className="my-1 border-t" />
          {me.employeeId && <Link href={`/employees/${me.employeeId}`} onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted"><Users className="h-4 w-4" />Profil saya</Link>}
          <Link href="/settings?tab=security" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted"><Settings className="h-4 w-4" />Ganti password</Link>
          <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger/10"><LogOut className="h-4 w-4" />Keluar</button>
        </div>
      )}
    </div>
  );
}
