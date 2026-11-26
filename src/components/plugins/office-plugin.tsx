"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { Building2, Coffee, MessageCircle, Pause, Play, Users } from "lucide-react";
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, PageHeader, PageLoading, Select } from "@/components/ui";
import { useApi } from "@/lib/client";
import { AVAIL_DOT, AVAIL_LABEL, cn } from "@/lib/utils";
import { OfficeBackdrop } from "./office-backdrop";
import { OfficeCharacter } from "./office-character";
import {
  ACTIVITY_LABEL,
  COFFEE_SPOT,
  DESK_SPOTS,
  MEETING_SPOT,
  activityFor,
  movementFor,
  officeChat,
  officeChatFeed,
  type OfficeEmployee,
} from "./office-types";

type EmployeesResponse = { employees: OfficeEmployee[] };

const OfficeScene3D = dynamic(() => import("./office-scene-3d").then((module) => module.OfficeScene3D), {
  ssr: false,
  loading: () => <div className="office-3d-loading">Memuat ruangan 3D…</div>,
});

export function OfficePlugin() {
  const { data, error, loading, reload } = useApi<EmployeesResponse>("/api/employees");
  const reduceMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [department, setDepartment] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [webgl, setWebgl] = useState(false);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      setWebgl(Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl")));
    } catch {
      setWebgl(false);
    }
  }, []);

  useEffect(() => {
    const sync = () => setVisible(document.visibilityState === "visible");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  const employees = data?.employees ?? [];
  const departments = useMemo(() => [...new Set(employees.map((e) => e.department?.name).filter((n): n is string => Boolean(n)))].sort(), [employees]);
  const shown = useMemo(() => (department ? employees.filter((e) => e.department?.name === department) : employees), [employees, department]);
  const selected = employees.find((e) => e.id === selectedId) ?? null;
  const frozen = paused || Boolean(reduceMotion) || !visible;
  const show3D = webgl && !reduceMotion;

  // Satu putaran menggerakkan rute jalan sekaligus mengganti obrolan.
  useEffect(() => {
    if (frozen) return;
    const id = window.setInterval(() => setTick((value) => value + 1), 3600);
    return () => window.clearInterval(id);
  }, [frozen]);

  const movements = useMemo(
    () => shown.map((employee, index) => ({ employee, index, move: movementFor(employee, index, tick) })),
    [shown, tick],
  );
  const chat = useMemo(() => officeChat(shown, tick), [shown, tick]);
  const chatFeed = useMemo(() => officeChatFeed(shown, tick), [shown, tick]);
  const chatBySpeaker = useMemo(() => new Map(chat.map((line) => [line.speakerId, line])), [chat]);
  const bubbles = useMemo(() => {
    const map = new Map<string, string>();
    chat.forEach((line) => map.set(line.speakerId, `${line.emoji} ${line.text}`));
    movements.forEach(({ employee, move }) => {
      if (move.action) map.set(employee.id, `${move.action.emoji} ${move.action.label}`);
    });
    return map;
  }, [chat, movements]);

  const selectedIndex = Math.max(0, shown.findIndex((e) => e.id === selectedId));
  const selectedActivity = selected ? movementFor(selected, selectedIndex, tick).activity : null;

  return (
    <div className="animate-in space-y-5">
      <PageHeader
        title="Kantor Virtual"
        subtitle="Visualisasi animasi tim Annas AI Studio di dalam ruangan. Karyawan berjalan antar meja, sudut kopi, dan ruang meeting. Semua gerakan serta obrolan adalah simulasi visual."
        actions={<>
          <Badge className="border border-electric/30 bg-electric/10 text-electric">Simulasi visual</Badge>
          <Button variant="outline" size="sm" onClick={() => setPaused((v) => !v)} aria-pressed={paused}>
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}{paused ? "Lanjutkan" : "Jeda"}
          </Button>
        </>}
      />

      {loading && !data ? <PageLoading /> : error || !data ? <ErrorState message={error ?? "Gagal memuat karyawan"} onRetry={reload} /> : employees.length === 0 ? (
        <EmptyState icon={<Building2 className="h-5 w-5" />} title="Belum ada karyawan" text="Tambahkan karyawan di menu Karyawan untuk menampilkan kantor virtual." />
      ) : (
        <MotionConfig reducedMotion="user">
          <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
            <Card className="overflow-hidden p-0">
              <CardHeader
                title="Lantai kerja"
                subtitle={`${shown.length} karyawan bergerak di ruangan — simulasi, bukan pemantauan langsung.`}
                action={<Select aria-label="Filter divisi" value={department} onChange={(e) => setDepartment(e.target.value)} className="h-8 w-44 text-[13px]">
                  <option value="">Semua divisi</option>
                  {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                </Select>}
              />
              <div className={cn("office-floor", show3D && "office-floor-3d")}>
                {show3D ? (
                  <OfficeScene3D
                    employees={shown}
                    movements={movements.map((item) => item.move)}
                    messages={bubbles}
                    frozen={frozen}
                    selectedId={selectedId}
                    hoveredId={hoveredId}
                    onSelect={(id) => setSelectedId((cur) => (cur === id ? null : id))}
                    onHover={setHoveredId}
                  />
                ) : (
                  <>
                <OfficeBackdrop />
                <div className="office-sign"><span>ANNAS AI STUDIO</span><small>Team Workspace · Simulasi langsung</small></div>
                <div className="office-pendant office-pendant-a" aria-hidden="true" />
                <div className="office-pendant office-pendant-b" aria-hidden="true" />

                <div className="office-zone office-zone-meeting" style={{ left: `${MEETING_SPOT.x}%`, top: `${MEETING_SPOT.y + 6}%` }} aria-hidden="true">
                  <span className="office-meeting-table"><i /><i /><i /></span>
                  <span className="office-zone-label">Ruang meeting</span>
                </div>
                <div className="office-zone office-zone-coffee" style={{ left: `${COFFEE_SPOT.x}%`, top: `${COFFEE_SPOT.y + 7}%` }} aria-hidden="true">
                  <span className="office-coffee-machine"><Coffee className="h-4 w-4" /></span>
                  <span className="office-zone-label">Sudut kopi</span>
                </div>

                {shown.length === 0 ? (
                  <div className="relative z-10 flex h-64 items-center justify-center text-sm text-white/80">Tidak ada karyawan di divisi ini.</div>
                ) : (
                  <>
                    {movements.map(({ employee, index }) => {
                      const spot = DESK_SPOTS[index % DESK_SPOTS.length];
                      return (
                        <div
                          key={`desk-${employee.id}`}
                          className={cn("office-desk-furniture", (hoveredId === employee.id || selectedId === employee.id) && "office-desk-active")}
                          style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                          aria-hidden="true"
                        >
                          <span className="office-monitor"><span className="office-monitor-screen"><i /><i /><i /></span><span className="office-monitor-stand" /></span>
                          <span className="office-keyboard"><i /><i /><i /><i /><i /><i /></span>
                          <span className="office-mug" />
                        </div>
                      );
                    })}

                    {movements.map(({ employee, index, move }) => {
                      const line = chatBySpeaker.get(employee.id);
                      return (
                        <motion.div
                          key={employee.id}
                          className="office-actor"
                          style={{ zIndex: move.walking ? 7 : 5 }}
                          initial={{ left: `${move.x}%`, top: `${move.y}%`, opacity: 0, scale: 0.82 }}
                          animate={{ left: `${move.x}%`, top: `${move.y}%`, opacity: 1, scale: 1 }}
                          transition={{
                            left: { duration: frozen ? 0 : 2.6, ease: "easeInOut" },
                            top: { duration: frozen ? 0 : 2.6, ease: "easeInOut" },
                            opacity: { duration: 0.3 },
                            scale: { duration: 0.3 },
                          }}
                        >
                          <OfficeCharacter
                            employee={employee}
                            index={index}
                            activity={move.activity}
                            frozen={frozen}
                            selected={selectedId === employee.id}
                            walking={move.walking}
                            facing={move.facing}
                            action={move.action}
                            message={move.action ? undefined : line?.text}
                            emoji={line?.emoji}
                            onSelect={(id) => setSelectedId((cur) => (cur === id ? null : id))}
                            onHover={setHoveredId}
                          />
                        </motion.div>
                      );
                    })}
                  </>
                )}
                  </>
                )}
              </div>
            </Card>

            <div className="space-y-5">
              <Card>
                <CardHeader title="Obrolan tim" subtitle="Percakapan simulasi, bukan chat asli karyawan." />
                <div className="max-h-[220px] space-y-2 overflow-y-auto p-3">
                  {chatFeed.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground">Belum ada obrolan yang bisa ditampilkan.</p>
                  ) : (
                    <AnimatePresence initial={false}>
                      {chatFeed.map((line) => (
                        <motion.div
                          key={line.id}
                          initial={frozen ? false : { opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={frozen ? undefined : { opacity: 0, y: -4 }}
                          transition={{ duration: frozen ? 0 : 0.22 }}
                          className="flex gap-2 rounded-lg bg-muted/60 p-2"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-electric/15 text-[11px] font-bold text-electric">{line.speakerName.slice(0, 1)}</span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate text-[11px] font-semibold">{line.speakerName}</span>
                              <span className="text-[9px] uppercase tracking-wide text-muted-foreground">simulasi</span>
                            </span>
                            <span className="block text-[12px] leading-snug">{line.emoji} {line.text}</span>
                          </span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              </Card>

              <Card>
                <CardHeader title="Daftar tim" subtitle="Klik nama untuk menyorot karyawan di ruangan." />
                <div className="max-h-[280px] space-y-1 overflow-y-auto p-3">
                  {movements.map(({ employee, index, move }) => {
                    const status = employee.availability ?? "AVAILABLE";
                    return (
                      <button key={employee.id} type="button" onClick={() => setSelectedId(employee.id)} onMouseEnter={() => setHoveredId(employee.id)} onMouseLeave={() => setHoveredId(null)}
                        className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors", selectedId === employee.id ? "bg-electric/10 ring-1 ring-electric/40" : "hover:bg-muted")}>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white" style={{ background: employee.avatarColor }}>
                          {employee.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium">{employee.name}</span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {ACTIVITY_LABEL[move.activity]}{move.action ? ` · ${move.action.label}` : ""}
                          </span>
                        </span>
                        <MessageCircle className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground", chatBySpeaker.has(employee.id) && "text-electric")} aria-hidden="true" />
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", AVAIL_DOT[status] ?? AVAIL_DOT.AVAILABLE)} title={AVAIL_LABEL[status] ?? status} aria-label={AVAIL_LABEL[status] ?? status} />
                      </button>
                    );
                  })}
                </div>
              </Card>

              {selected ? (
                <Card>
                  <CardHeader title={selected.name} subtitle={selected.title} />
                  <div className="space-y-2 px-5 pb-5 text-[13px]">
                    <div className="flex justify-between gap-3"><span className="text-muted-foreground">Divisi</span><span>{selected.department?.name ?? "—"}</span></div>
                    <div className="flex justify-between gap-3"><span className="text-muted-foreground">Status</span><span>{AVAIL_LABEL[selected.availability ?? "AVAILABLE"] ?? selected.availability}</span></div>
                    <div className="flex justify-between gap-3"><span className="text-muted-foreground">Aktivitas</span><span>{selectedActivity ? ACTIVITY_LABEL[selectedActivity] : "—"}</span></div>
                    <p className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">Rute jalan, aktivitas, dan obrolan di ruangan hanya simulasi visual. Status diambil dari data karyawan.</p>
                    <Link href={`/employees/${selected.id}`} className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-electric px-4 font-medium text-white transition-opacity hover:opacity-90">Lihat profil karyawan</Link>
                  </div>
                </Card>
              ) : (
                <Card className="p-5 text-[13px] text-muted-foreground">Pilih seorang karyawan di ruangan atau daftar tim untuk melihat detailnya.</Card>
              )}

              <Card className="p-4">
                <p className="flex items-center gap-2 text-[12px] font-medium"><Users className="h-4 w-4 text-electric" /> Rute simulasi</p>
                <p className="mt-1 text-[12px] text-muted-foreground">Meja kerja → sudut kopi → ruang meeting → kembali ke meja. Setiap karyawan punya jadwal yang di-offset agar tidak berjalan bersamaan.</p>
              </Card>
            </div>
          </div>
        </MotionConfig>
      )}
    </div>
  );
}
