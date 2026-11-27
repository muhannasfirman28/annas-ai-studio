export interface OfficeEmployee {
  id: string;
  name: string;
  title: string;
  avatarColor: string;
  avatarUrl?: string | null;
  availability?: string;
  department?: { name: string } | null;
}

export type OfficeActivity = "typing" | "reading" | "focus" | "walking" | "talking" | "drinking" | "offline";

export const ACTIVITY_LABEL: Record<OfficeActivity, string> = {
  typing: "Sedang mengetik",
  reading: "Sedang membaca",
  focus: "Sedang fokus",
  walking: "Sedang berjalan",
  talking: "Sedang ngobrol",
  drinking: "Sedang ngopi",
  offline: "Tidak aktif",
};

/**
 * Aktivitas dipilih secara deterministik dari status asli + urutan data.
 * Ini hanya simulasi visual, bukan pemantauan aktivitas karyawan secara langsung.
 */
export function activityFor(employee: OfficeEmployee, index: number): OfficeActivity {
  if (employee.availability === "OFFLINE") return "offline";
  if (employee.availability === "AWAY") return "walking";
  if (employee.availability === "BUSY") return "focus";
  return index % 3 === 1 ? "reading" : "typing";
}

export interface OfficeChatMessage {
  id: string;
  speakerId: string;
  speakerName: string;
  text: string;
  emoji: string;
}

const CHAT_LINES: Array<{ text: string; emoji: string }> = [
  { text: "Deploy-nya udah gas ke Vercel belum?", emoji: "🚀" },
  { text: "Udah, tapi auto-deploy-nya masih ngambek.", emoji: "😅" },
  { text: "Animasi kantornya makin anjay woy!", emoji: "🔥" },
  { text: "Motion-nya udah kena semua, santai.", emoji: "✨" },
  { text: "Boleh pinjam meja kopi sebentar?", emoji: "☕" },
  { text: "Ambil aja, stoknya masih banyak.", emoji: "👍" },
  { text: "PR-nya aku kirim sebelum rapat.", emoji: "📦" },
  { text: "Siap, aku review sekarang juga.", emoji: "👀" },
  { text: "Eh, kopi siapa ini di meja aku?", emoji: "☕" },
  { text: "Bawaan dari dapur, jangan diambil ya!", emoji: "🙈" },
];

function shortName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/**
 * Obrolan dibuat dari pasangan karyawan aktif dan berputar mengikuti `tick`.
 * Ini naskah simulasi untuk visualisasi, bukan isi chat asli karyawan.
 */
export function officeChat(employees: OfficeEmployee[], tick = 0): OfficeChatMessage[] {
  const active = employees.filter((employee) => (employee.availability ?? "AVAILABLE") !== "OFFLINE");
  const pairs = Math.min(3, Math.floor(active.length / 2));

  return Array.from({ length: pairs }, (_, pair) => {
    const first = active[pair * 2];
    const second = active[pair * 2 + 1];
    const speaker = (tick + pair) % 2 === 0 ? first : second;
    const line = CHAT_LINES[(tick + pair * 3) % CHAT_LINES.length];
    return {
      id: `${speaker.id}:${tick}:${pair}`,
      speakerId: speaker.id,
      speakerName: shortName(speaker.name),
      text: line.text,
      emoji: line.emoji,
    };
  });
}

/** Baris obrolan beberapa putaran terakhir untuk panel transkrip. */
export function officeChatFeed(employees: OfficeEmployee[], tick = 0, limit = 4): OfficeChatMessage[] {
  const messages: OfficeChatMessage[] = [];
  for (let t = Math.max(0, tick - 3); t <= tick; t += 1) messages.push(...officeChat(employees, t));
  return messages.slice(-limit);
}

export interface DepartmentRoom {
  /** Nama divisi persis seperti data `/api/employees`. */
  name: string;
  /** Label pendek untuk papan nama ruangan. */
  label: string;
  color: string;
}

/** Delapan ruangan sesuai seed departemen Annas AI Studio. */
export const DEPARTMENT_ROOMS: readonly DepartmentRoom[] = [
  { name: "Executive", label: "Eksekutif", color: "#0a1530" },
  { name: "Technology", label: "Teknologi", color: "#2563eb" },
  { name: "Operations", label: "Operasional", color: "#0891b2" },
  { name: "Software Development", label: "Software", color: "#4f46e5" },
  { name: "Creative & Design", label: "Desain", color: "#db2777" },
  { name: "Artificial Intelligence", label: "AI", color: "#7c3aed" },
  { name: "Data & Analytics", label: "Data", color: "#059669" },
  { name: "Quality Assurance & Security", label: "QA & Security", color: "#dc2626" },
] as const;

export type OfficeLayoutName = "wide" | "tall";

/** Ukuran satu ruangan dalam unit three.js; dipakai scene dan perhitungan jalan. */
export const ROOM_GEOMETRY = { width: 11, depth: 7.5, gap: 1.15 } as const;

export interface OfficeGrid {
  layout: OfficeLayoutName;
  columns: number;
  rows: number;
  width: number;
  depth: number;
  origins: Array<{ x: number; z: number }>;
}

/**
 * Desktop memakai grid 4×2; layar sempit memakai 2×4 supaya delapan ruangan
 * tetap terbaca tanpa perlu scroll horizontal.
 */
export function gridFor(layout: OfficeLayoutName): OfficeGrid {
  const columns = layout === "tall" ? 2 : 4;
  const rows = layout === "tall" ? 4 : 2;
  const stepX = ROOM_GEOMETRY.width + ROOM_GEOMETRY.gap;
  const stepZ = ROOM_GEOMETRY.depth + ROOM_GEOMETRY.gap;

  return {
    layout,
    columns,
    rows,
    width: columns * ROOM_GEOMETRY.width + (columns - 1) * ROOM_GEOMETRY.gap,
    depth: rows * ROOM_GEOMETRY.depth + (rows - 1) * ROOM_GEOMETRY.gap,
    origins: DEPARTMENT_ROOMS.map((_, index) => ({
      x: ((index % columns) - (columns - 1) / 2) * stepX,
      z: (Math.floor(index / columns) - (rows - 1) / 2) * stepZ,
    })),
  };
}

export function roomIndexFor(departmentName?: string | null): number {
  const normalized = (departmentName ?? "").trim().toLowerCase();
  if (!normalized) return 0;

  const exact = DEPARTMENT_ROOMS.findIndex((room) => room.name.trim().toLowerCase() === normalized);
  if (exact >= 0) return exact;

  // Nama divisi baru tetap mendapat ruangan yang stabil tanpa mengubah seed.
  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0;
  }
  return hash % DEPARTMENT_ROOMS.length;
}

export function roomOrigin(index: number, layout: OfficeLayoutName): { x: number; z: number } {
  const origins = gridFor(layout).origins;
  return origins[((index % origins.length) + origins.length) % origins.length];
}

/** Persentase dalam satu ruangan dipetakan ke posisi dunia three.js. */
export function localToRoom(index: number, layout: OfficeLayoutName, x: number, y: number): { x: number; z: number } {
  const origin = roomOrigin(index, layout);
  return {
    x: origin.x + (x / 100 - 0.5) * ROOM_GEOMETRY.width,
    z: origin.z + (y / 100 - 0.5) * ROOM_GEOMETRY.depth,
  };
}

/** Titik kerja dalam satu ruangan (persentase lokal). */
export const ROOM_DESK_SPOTS = [
  { x: 20, y: 32 },
  { x: 49, y: 32 },
  { x: 20, y: 59 },
  { x: 49, y: 59 },
] as const;

export const ROOM_COFFEE_SPOT = { x: 84, y: 28 } as const;
export const ROOM_MEETING_SPOT = { x: 77, y: 73 } as const;

export interface OfficeMovement {
  /** Posisi lokal di dalam ruangan, dalam persentase. */
  x: number;
  y: number;
  roomIndex: number;
  /** Kursi kerja ke-berapa dalam ruangan yang sama. */
  slot: number;
  facing: "left" | "right" | "front";
  activity: OfficeActivity;
  walking: boolean;
  action?: { emoji: string; label: string };
}

/**
 * Rute simulasi tetap di dalam satu ruangan departemen:
 * meja → sudut kopi → meja meeting → meja, terus berulang.
 */
export function movementFor(employee: OfficeEmployee, index: number, tick: number, slot = index): OfficeMovement {
  const roomIndex = roomIndexFor(employee.department?.name);
  const safeSlot = ((slot % ROOM_DESK_SPOTS.length) + ROOM_DESK_SPOTS.length) % ROOM_DESK_SPOTS.length;
  const desk = ROOM_DESK_SPOTS[safeSlot];
  const step = (((tick + index) % 6) + 6) % 6;
  const atDesk = { roomIndex, slot: safeSlot, x: desk.x, y: desk.y };

  if (employee.availability === "OFFLINE") {
    return { ...atDesk, facing: "front", activity: "offline", walking: false };
  }

  switch (step) {
    case 0:
      return { ...atDesk, facing: "front", activity: activityFor(employee, index), walking: false };
    case 1:
      return {
        roomIndex, slot: safeSlot, x: ROOM_COFFEE_SPOT.x, y: ROOM_COFFEE_SPOT.y,
        facing: "right", activity: "walking", walking: true,
        action: { emoji: "🚶", label: "Menuju sudut kopi" },
      };
    case 2:
      return {
        roomIndex, slot: safeSlot, x: ROOM_COFFEE_SPOT.x, y: ROOM_COFFEE_SPOT.y,
        facing: "front", activity: "drinking", walking: false,
        action: { emoji: "☕", label: "Ngopi sebentar" },
      };
    case 3:
      return {
        roomIndex, slot: safeSlot, x: ROOM_MEETING_SPOT.x, y: ROOM_MEETING_SPOT.y,
        facing: "left", activity: "walking", walking: true,
        action: { emoji: "🚶", label: "Menuju meja meeting" },
      };
    case 4:
      return {
        roomIndex, slot: safeSlot, x: ROOM_MEETING_SPOT.x, y: ROOM_MEETING_SPOT.y,
        facing: "front", activity: "talking", walking: false,
        action: { emoji: "💬", label: "Diskusi tim" },
      };
    default:
      return {
        ...atDesk,
        facing: desk.x > 50 ? "left" : "right",
        activity: "walking", walking: true,
        action: { emoji: "🚶", label: "Kembali ke meja" },
      };
  }
}

/**
 * Menyusun pergerakan sekaligus membagi kursi untuk karyawan yang satu divisi.
 * Jadwal tiap orang di-offset memakai urutan asli agar tidak berjalan bersamaan.
 */
export function movementsFor(employees: OfficeEmployee[], tick: number): Array<{ employee: OfficeEmployee; index: number; move: OfficeMovement }> {
  const slotByRoom = new Map<number, number>();
  return employees.map((employee, index) => {
    const roomIndex = roomIndexFor(employee.department?.name);
    const slot = slotByRoom.get(roomIndex) ?? 0;
    slotByRoom.set(roomIndex, slot + 1);
    return { employee, index, move: movementFor(employee, index, tick, slot) };
  });
}
