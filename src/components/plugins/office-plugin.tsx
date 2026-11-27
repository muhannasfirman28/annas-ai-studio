"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { Building2, Coffee, MessageCircle, Pause, Play, Users } from "lucide-react";
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, PageHeader, PageLoading, Select } from "@/components/ui";
import { useApi } from "@/lib/client";
import { AVAIL_DOT, AVAIL_LABEL, cn } from "@/lib/utils";
import { OfficeBackdrop } from "./office-backdrop";
import { OfficeCharacter } from "./office-character";
import {
  ACTIVITY_LABEL,
  OFFICE_ROOMS,
  ROOM_DESK_SPOTS,
  deskOwnersFor,
  movementsFor,
  officeChat,
  officeChatFeed,
  roomIndexFor,
  type OfficeEmployee,
  type OfficeSpot,
} from "./office-types";

type EmployeesResponse = { employees: OfficeEmployee[] };

const OfficeScene3D = dynamic(() => import("./office-scene-3d").then((module) => module.OfficeScene3D), {
  ssr: false,
  loading: () => <div className="office-3d-loading">Memuat empat ruangan 3D…</div>,
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
  const deskOwners = useMemo(() => deskOwnersFor(employees), [employees]);
  const departments = useMemo(() => [...new Set(employees.map((e) => e.department?.name).filter((n): n is string => Boolean(n)))].sort(), [employees]);
  const shown = useMemo(() => (department ? employees.filter((e) => e.department?.name === department) : employees), [employees, department]);
  const selected = employees.find((e) => e.id === selectedId) ?? null;
  const frozen = paused || Boolean(reduceMotion) || !visible;
  const show3D = webgl && !reduceMotion;
  const focusRoomIndex = department ? roomIndexFor(department) : null;

  // Satu putaran menggerakkan rute jalan sekaligus mengganti obrolan.
  useEffect(() => {
    if (frozen) return;
    const id = window.setInterval(() => setTick((value) => value + 1), 4200);
    return () => window.clearInterval(id);
  }, [frozen]);

  const movements = useMemo(() => movementsFor(shown, tick), [shown, tick]);
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

  const selectedActivity = movements.find((item) => item.employee.id === selectedId)?.move.activity ?? null;

  return (
    <div className="animate-in space-y-5">
      <PageHeader
        title="Kantor Virtual"
        subtitle="Visualisasi empat ruangan: dua ruang kerja berisi 4+4 karyawan, Ruang Kopi, dan Ruang Meeting. Karyawan berjalan lewat koridor dari meja ke kopi, ke meeting, lalu kembali. Di luar gedung ada jalan kota dengan mobil dan pejalan kaki. Semua gerakan serta obrolan adalah simulasi visual."
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
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_300px]">
            <Card className="min-w-0 overflow-hidden p-0">
              <CardHeader
                title="4 ruangan kantor"
                subtitle={`${shown.length} karyawan · 2 ruang kerja + Ruang Kopi + Ruang Meeting — simulasi, bukan pemantauan langsung.`}
                action={<Select aria-label="Filter divisi" value={department} onChange={(e) => setDepartment(e.target.value)} className="h-8 w-44 text-[13px]">
                  <option value="">Semua divisi</option>
                  {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                </Select>}
              />
              <div className={cn("office-floor", show3D && "office-floor-3d")}>
                {show3D ? (
                  <OfficeScene3D
                    employees={shown}
                    deskOwners={deskOwners}
                    movements={movements.map((item) => item.move)}
                    messages={bubbles}
                    frozen={frozen}
                    focusRoomIndex={focusRoomIndex}
                    selectedId={selectedId}
                    hoveredId={hoveredId}
                    onSelect={(id) => setSelectedId((cur) => (cur === id ? null : id))}
                    onHover={setHoveredId}
                  />
                ) : (
                  <>
                    <OfficeBackdrop />
                    <div className="office-sign"><span>ANNAS AI STUDIO</span><small>4 ruangan · simulasi langsung</small></div>

                    <div className="office-map">
                      <div className="office-rooms">
                        {OFFICE_ROOMS.map((room, roomIndex) => {
                          const owners = deskOwners.filter((owner) => owner.roomIndex === roomIndex);
                          const dim = room.kind === "work" && focusRoomIndex !== null && focusRoomIndex !== roomIndex;
                          return (
                            <section
                              key={room.name}
                              className={cn("office-room", dim && "office-room-dim")}
                              style={{ "--room-accent": room.color } as CSSProperties}
                              aria-label={`Ruangan ${room.name}`}
                            >
                              <header className="office-room-head">
                                <span className="office-room-dot" aria-hidden="true" />
                                <span className="truncate">{room.name}</span>
                                <small>{room.kind === "work" ? `${owners.length} orang` : "bersama"}</small>
                              </header>
                              <div className="office-room-floor">
                                {room.kind === "work" && owners.map((owner) => {
                                  const desk = ROOM_DESK_SPOTS[owner.slot % ROOM_DESK_SPOTS.length];
                                  return (
                                    <div
                                      key={`desk-${owner.id}`}
                                      className={cn("office-desk-furniture", (hoveredId === owner.id || selectedId === owner.id) && "office-desk-active")}
                                      style={{ left: `${desk.x}%`, top: `${desk.y}%` }}
                                      aria-hidden="true"
                                    >
                                      <span className="office-monitor"><span className="office-monitor-screen"><i /><i /><i /></span><span className="office-monitor-stand" /></span>
                                      <span className="office-keyboard"><i /><i /><i /><i /><i /><i /></span>
                                      <span className="office-mug" />
                                      <span className="office-desk-nameplate"><i style={{ background: owner.avatarColor }} />{owner.shortName}</span>
                                    </div>
                                  );
                                })}
                                {room.kind === "work" && owners.length === 0 && <span className="office-room-empty">Tidak ada karyawan</span>}

                                {room.kind === "coffee" && (
                                  <>
                                    <div className="office-zone" style={{ left: "50%", top: "22%" }} aria-hidden="true">
                                      <span className="office-zone-label">Mesin kopi</span>
                                      <span className="office-coffee-machine"><Coffee className="h-4 w-4" /></span>
                                    </div>
                                    {[26, 74].map((x) => (
                                      <span key={x} className="office-coffee-table" style={{ left: `${x}%`, top: "64%" }} aria-hidden="true">
                                        <i className="office-coffee-cup" /><i className="office-coffee-cup" />
                                      </span>
                                    ))}
                                  </>
                                )}
                                {room.kind === "meeting" && (
                                  <>
                                    <div className="office-zone" style={{ left: "50%", top: "24%" }} aria-hidden="true">
                                      <span className="office-zone-label">Meja konferensi</span>
                                    </div>
                                    <div className="office-conference-set" style={{ left: "50%", top: "45%" }} aria-hidden="true">
                                      <span className="office-conference-table"><i /><i /><i /><i /></span>
                                      <span className="office-conference-chair office-conference-chair-left" />
                                      <span className="office-conference-chair office-conference-chair-right" />
                                      <span className="office-conference-chair office-conference-chair-top" />
                                      <span className="office-conference-chair office-conference-chair-bottom" />
                                    </div>
                                    <div className="office-meeting-tv" aria-hidden="true">
                                      <span className="office-meeting-tv-screen"><i /><i /><i /></span>
                                      <small>AGENDA</small>
                                    </div>
                                  </>
                                )}
                              </div>
                            </section>
                          );
                        })}
                      </div>

                      <div className="office-actors" aria-label="Karyawan bergerak melalui koridor antar ruangan">
                        {movements.map(({ employee, index, move }) => {
                          const line = chatBySpeaker.get(employee.id);
                          const target: OfficeSpot = { roomIndex: move.roomIndex, x: move.x, y: move.y };
                          const path = move.walking ? [move.from, ...move.via, target] : null;
                          return (
                            <motion.div
                              key={employee.id}
                              className="office-actor"
                              style={{ zIndex: move.walking ? 7 : 5 }}
                              initial={{ left: `${move.x}%`, top: `${move.y}%`, opacity: 0, scale: 0.82 }}
                              animate={{
                                left: path ? path.map((spot) => `${spot.x}%`) : `${move.x}%`,
                                top: path ? path.map((spot) => `${spot.y}%`) : `${move.y}%`,
                                opacity: 1,
                                scale: 1,
                              }}
                              transition={{
                                left: { duration: frozen ? 0 : 2.8, ease: "easeInOut" },
                                top: { duration: frozen ? 0 : 2.8, ease: "easeInOut" },
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
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>

            <div className="min-w-0 space-y-5">
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
                <CardHeader title="Daftar tim" subtitle="Klik nama untuk menyorot karyawan di ruangannya." />
                <div className="max-h-[280px] space-y-1 overflow-y-auto p-3">
                  {movements.map(({ employee, move }) => {
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
                            {OFFICE_ROOMS[move.homeRoomIndex]?.label ?? "Lainnya"} · {ACTIVITY_LABEL[move.activity]}{move.action ? ` · ${move.action.label}` : ""}
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
                    <div className="flex justify-between gap-3"><span className="text-muted-foreground">Ruangan</span><span>{OFFICE_ROOMS[roomIndexFor(selected.department?.name)]?.name ?? "Lainnya"}</span></div>
                    <div className="flex justify-between gap-3"><span className="text-muted-foreground">Status</span><span>{AVAIL_LABEL[selected.availability ?? "AVAILABLE"] ?? selected.availability}</span></div>
                    <div className="flex justify-between gap-3"><span className="text-muted-foreground">Aktivitas</span><span>{selectedActivity ? ACTIVITY_LABEL[selectedActivity] : "—"}</span></div>
                    <p className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">Rute jalan, aktivitas, dan obrolan hanya simulasi visual. Status diambil dari data karyawan.</p>
                    <Link href={`/employees/${selected.id}`} className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-electric px-4 font-medium text-white transition-opacity hover:opacity-90">Lihat profil karyawan</Link>
                  </div>
                </Card>
              ) : (
                <Card className="p-5 text-[13px] text-muted-foreground">Pilih seorang karyawan di ruangan atau daftar tim untuk melihat detailnya.</Card>
              )}

              <Card className="p-4">
                <p className="flex items-center gap-2 text-[12px] font-medium"><Users className="h-4 w-4 text-electric" /> Rute simulasi</p>
                <p className="mt-1 text-[12px] text-muted-foreground">Meja di ruang kerja → koridor → Ruang Kopi → koridor → Ruang Meeting → koridor → meja. Karyawan lewat pintu dan tidak menembus dinding. Mobil dan pejalan kaki memakai rute jalan tersendiri di luar gedung.</p>
              </Card>
            </div>
          </div>
        </MotionConfig>
      )}
    </div>
  );
}
