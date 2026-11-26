"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { Building2, Coffee, MessageCircle, Pause, Play } from "lucide-react";
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, PageHeader, PageLoading, Select } from "@/components/ui";
import { useApi } from "@/lib/client";
import { AVAIL_DOT, AVAIL_LABEL, cn } from "@/lib/utils";
import { OfficeBackdrop } from "./office-backdrop";
import { OfficeCharacter } from "./office-character";
import { ACTIVITY_LABEL, activityFor, officeChat, officeChatFeed, type OfficeEmployee } from "./office-types";

type EmployeesResponse = { employees: OfficeEmployee[] };

export function OfficePlugin() {
  const { data, error, loading, reload } = useApi<EmployeesResponse>("/api/employees");
  const reduceMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [department, setDepartment] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [chatTick, setChatTick] = useState(0);

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

  useEffect(() => {
    if (frozen) return;
    const id = window.setInterval(() => setChatTick((tick) => tick + 1), 4200);
    return () => window.clearInterval(id);
  }, [frozen]);

  const chat = useMemo(() => officeChat(shown, chatTick), [shown, chatTick]);
  const chatFeed = useMemo(() => officeChatFeed(shown, chatTick), [shown, chatTick]);
  const chatBySpeaker = useMemo(() => new Map(chat.map((line) => [line.speakerId, line])), [chat]);

  return (
    <div className="animate-in space-y-5">
      <PageHeader
        title="Kantor Virtual"
        subtitle="Visualisasi animasi tim Annas AI Studio saat bekerja. Obrolan dan gerakan adalah simulasi visual."
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
                subtitle={`${shown.length} karyawan tampil — obrolan dan gerakan adalah simulasi, bukan pemantauan langsung.`}
                action={<Select aria-label="Filter divisi" value={department} onChange={(e) => setDepartment(e.target.value)} className="h-8 w-44 text-[13px]">
                  <option value="">Semua divisi</option>
                  {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                </Select>}
              />
              <div className="office-floor">
                <OfficeBackdrop />
                <div className="office-sign"><span>ANNAS AI STUDIO</span><small>Team Workspace · Simulasi langsung</small></div>
                <div className="office-pendant office-pendant-a" aria-hidden="true" />
                <div className="office-pendant office-pendant-b" aria-hidden="true" />
                <div className="office-coffee" title="Mesin kopi" aria-hidden="true"><Coffee className="h-3.5 w-3.5" /></div>
                {shown.length === 0 ? (
                  <div className="relative z-10 flex h-64 items-center justify-center text-sm text-white/80">Tidak ada karyawan di divisi ini.</div>
                ) : (
                  <motion.div
                    className="office-desks"
                    initial="hidden"
                    animate="visible"
                    variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
                  >
                    {shown.map((employee, index) => {
                      const activity = activityFor(employee, index);
                      const line = chatBySpeaker.get(employee.id);
                      return (
                        <div key={employee.id} className={cn("office-desk", hoveredId === employee.id && "office-desk-active")}>
                          <div className="office-monitor" aria-hidden="true"><span className="office-monitor-screen"><i /><i /><i /></span><span className="office-monitor-stand" /></div>
                          <OfficeCharacter
                            employee={employee}
                            index={index}
                            activity={activity}
                            frozen={frozen}
                            selected={selectedId === employee.id}
                            message={line?.text}
                            emoji={line?.emoji}
                            onSelect={(id) => setSelectedId((cur) => (cur === id ? null : id))}
                            onHover={setHoveredId}
                          />
                          <div className="office-keyboard" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
                          <div className="office-mug" aria-hidden="true" />
                        </div>
                      );
                    })}
                  </motion.div>
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
                <CardHeader title="Daftar tim" subtitle="Klik nama untuk menyorot meja mereka." />
                <div className="max-h-[280px] space-y-1 overflow-y-auto p-3">
                  {shown.map((employee, index) => {
                    const activity = activityFor(employee, index);
                    const status = employee.availability ?? "AVAILABLE";
                    return (
                      <button key={employee.id} type="button" onClick={() => setSelectedId(employee.id)} onMouseEnter={() => setHoveredId(employee.id)} onMouseLeave={() => setHoveredId(null)}
                        className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors", selectedId === employee.id ? "bg-electric/10 ring-1 ring-electric/40" : "hover:bg-muted")}>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white" style={{ background: employee.avatarColor }}>
                          {employee.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium">{employee.name}</span>
                          <span className="block truncate text-[11px] text-muted-foreground">{ACTIVITY_LABEL[activity]}</span>
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
                    <div className="flex justify-between gap-3"><span className="text-muted-foreground">Aktivitas</span><span>{ACTIVITY_LABEL[activityFor(selected, Math.max(0, shown.findIndex((e) => e.id === selected.id)))]}</span></div>
                    <p className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">Gerakan dan obrolan di lantai kerja hanya simulasi visual. Status diambil dari data karyawan.</p>
                    <Link href={`/employees/${selected.id}`} className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-electric px-4 font-medium text-white transition-opacity hover:opacity-90">Lihat profil karyawan</Link>
                  </div>
                </Card>
              ) : (
                <Card className="p-5 text-[13px] text-muted-foreground">Pilih seorang karyawan di lantai kerja atau daftar tim untuk melihat detailnya.</Card>
              )}
            </div>
          </div>
        </MotionConfig>
      )}
    </div>
  );
}
