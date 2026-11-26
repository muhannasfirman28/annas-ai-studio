"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MotionConfig, motion, useReducedMotion } from "motion/react";
import { Building2, Coffee, Pause, Play } from "lucide-react";
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, PageHeader, PageLoading, Select } from "@/components/ui";
import { useApi } from "@/lib/client";
import { AVAIL_DOT, AVAIL_LABEL, cn } from "@/lib/utils";
import { OfficeCharacter } from "./office-character";
import { ACTIVITY_LABEL, activityFor, type OfficeEmployee } from "./office-types";

type EmployeesResponse = { employees: OfficeEmployee[] };

export function OfficePlugin() {
  const { data, error, loading, reload } = useApi<EmployeesResponse>("/api/employees");
  const reduceMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [department, setDepartment] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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

  return (
    <div className="animate-in space-y-5">
      <PageHeader
        title="Kantor Virtual"
        subtitle="Visualisasi animasi tim Annas AI Studio saat bekerja."
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
                subtitle={`${shown.length} karyawan tampil — gerakan adalah simulasi, bukan pemantauan langsung.`}
                action={<Select aria-label="Filter divisi" value={department} onChange={(e) => setDepartment(e.target.value)} className="h-8 w-44 text-[13px]">
                  <option value="">Semua divisi</option>
                  {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                </Select>}
              />
              <div className="office-floor mt-4">
                <div className="office-wall"><span>ANNAS AI STUDIO</span><span className="text-[10px] opacity-60">Team Workspace</span></div>
                <div className="office-coffee" title="Mesin kopi" aria-hidden="true"><Coffee className="h-4 w-4" /></div>
                {shown.length === 0 ? (
                  <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Tidak ada karyawan di divisi ini.</div>
                ) : (
                  <motion.div
                    className="office-desks"
                    initial="hidden"
                    animate="visible"
                    variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
                  >
                    {shown.map((employee, index) => {
                      const activity = activityFor(employee, index);
                      return (
                        <div key={employee.id} className={cn("office-desk", hoveredId === employee.id && "office-desk-active")}>
                          <div className="office-monitor" aria-hidden="true"><span className="office-monitor-screen" /></div>
                          <OfficeCharacter
                            employee={employee}
                            index={index}
                            activity={activity}
                            frozen={frozen}
                            selected={selectedId === employee.id}
                            onSelect={(id) => setSelectedId((cur) => (cur === id ? null : id))}
                            onHover={setHoveredId}
                          />
                          <div className="office-keyboard" aria-hidden="true" />
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </div>
            </Card>

            <div className="space-y-5">
              <Card>
                <CardHeader title="Daftar tim" subtitle="Klik nama untuk menyorot meja mereka." />
                <div className="max-h-[340px] space-y-1 overflow-y-auto p-3">
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
                    <p className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">Gerakan di lantai kerja hanya simulasi visual. Status diambil dari data karyawan.</p>
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
