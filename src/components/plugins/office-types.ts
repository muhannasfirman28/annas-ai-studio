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

export type OfficeRoomKind = "work" | "coffee" | "meeting";

export interface OfficeRoom {
  /** Nama ruangan yang tampil di papan nama. */
  name: string;
  /** Label pendek untuk papan nama dan kartu fallback. */
  label: string;
  kind: OfficeRoomKind;
  color: string;
  /** Divisi yang duduk di ruang kerja, mengikuti urutan seed. */
  departments: readonly string[];
}

/**
 * Empat ruangan: dua ruang kerja berisi 4+4 karyawan, ditambah Ruang Kopi
 * dan Ruang Meeting yang dipakai bersama. Urutan array = urutan grid 2×2.
 */
export const OFFICE_ROOMS: readonly OfficeRoom[] = [
  {
    name: "Ruang Kerja 1",
    label: "Kerja 1",
    kind: "work",
    color: "#2563eb",
    departments: ["Executive", "Technology", "Operations", "Software Development"],
  },
  {
    name: "Ruang Kerja 2",
    label: "Kerja 2",
    kind: "work",
    color: "#7c3aed",
    departments: ["Creative & Design", "Artificial Intelligence", "Data & Analytics", "Quality Assurance & Security"],
  },
  { name: "Ruang Kopi", label: "Kopi", kind: "coffee", color: "#d97706", departments: [] },
  { name: "Ruang Meeting", label: "Meeting", kind: "meeting", color: "#059669", departments: [] },
] as const;

export const COFFEE_ROOM_INDEX = OFFICE_ROOMS.findIndex((room) => room.kind === "coffee");
export const MEETING_ROOM_INDEX = OFFICE_ROOMS.findIndex((room) => room.kind === "meeting");
export const WORK_ROOM_COUNT = OFFICE_ROOMS.filter((room) => room.kind === "work").length;

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

/** Kedua layout memakai grid 2×2 supaya komposisi ruangan tetap sama. */
export function gridFor(layout: OfficeLayoutName): OfficeGrid {
  const columns = 2;
  const rows = 2;
  const stepX = ROOM_GEOMETRY.width + ROOM_GEOMETRY.gap;
  const stepZ = ROOM_GEOMETRY.depth + ROOM_GEOMETRY.gap;

  return {
    layout,
    columns,
    rows,
    width: columns * ROOM_GEOMETRY.width + (columns - 1) * ROOM_GEOMETRY.gap,
    depth: rows * ROOM_GEOMETRY.depth + (rows - 1) * ROOM_GEOMETRY.gap,
    origins: OFFICE_ROOMS.map((_, index) => ({
      x: ((index % columns) - (columns - 1) / 2) * stepX,
      z: (Math.floor(index / columns) - (rows - 1) / 2) * stepZ,
    })),
  };
}

/**
 * Memetakan divisi ke ruang kerja. Divisi baru yang belum dikenal tetap
 * mendapat satu dari dua ruang kerja secara stabil.
 */
export function roomIndexFor(departmentName?: string | null): number {
  const normalized = (departmentName ?? "").trim().toLowerCase();
  if (!normalized) return 0;

  const workRooms = OFFICE_ROOMS
    .map((room, index) => ({ room, index }))
    .filter((entry) => entry.room.kind === "work");

  const exact = workRooms.findIndex(({ room }) =>
    room.departments.some((name) => name.trim().toLowerCase() === normalized),
  );
  if (exact >= 0) return workRooms[exact].index;

  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0;
  }
  return workRooms[hash % WORK_ROOM_COUNT].index;
}

export function roomOrigin(index: number, layout: OfficeLayoutName): { x: number; z: number } {
  const origins = gridFor(layout).origins;
  return origins[((index % origins.length) + origins.length) % origins.length];
}

/** Persentase dalam satu ruangan → posisi relatif terhadap tengah ruangan. */
export function roomLocalPoint(x: number, y: number): { x: number; z: number } {
  return {
    x: (x / 100 - 0.5) * ROOM_GEOMETRY.width,
    z: (y / 100 - 0.5) * ROOM_GEOMETRY.depth,
  };
}

/** Persentase dalam satu ruangan dipetakan ke posisi dunia three.js. */
export function localToRoom(index: number, layout: OfficeLayoutName, x: number, y: number): { x: number; z: number } {
  const origin = roomOrigin(index, layout);
  const local = roomLocalPoint(x, y);
  return { x: origin.x + local.x, z: origin.z + local.z };
}

/** Titik kerja dalam ruang kerja (persentase lokal ruangan). */
export const ROOM_DESK_SPOTS = [
  { x: 26, y: 30 },
  { x: 64, y: 30 },
  { x: 26, y: 68 },
  { x: 64, y: 68 },
] as const;

/** Pemilik tetap sebuah meja; dipakai nameplate 3D maupun fallback 2D. */
export interface OfficeDeskOwner {
  id: string;
  name: string;
  shortName: string;
  avatarColor: string;
  roomIndex: number;
  slot: number;
}

/** Urutan data menentukan kursi, sehingga nameplate tidak berpindah saat difilter. */
export function deskOwnersFor(employees: OfficeEmployee[]): OfficeDeskOwner[] {
  const slotByRoom = new Map<number, number>();
  return employees.map((employee) => {
    const roomIndex = roomIndexFor(employee.department?.name);
    const slot = slotByRoom.get(roomIndex) ?? 0;
    slotByRoom.set(roomIndex, slot + 1);
    return {
      id: employee.id,
      name: employee.name,
      shortName: shortName(employee.name),
      avatarColor: employee.avatarColor,
      roomIndex,
      slot: ((slot % ROOM_DESK_SPOTS.length) + ROOM_DESK_SPOTS.length) % ROOM_DESK_SPOTS.length,
    };
  });
}

/**
 * Posisi rute dinyatakan dalam persentase seluruh peta 2×2, bukan lokal
 * ruangan, supaya karyawan benar-benar berpindah ruang lewat koridor.
 * `roomIndex = -1` berarti titik ada di koridor antar ruangan.
 */
export interface OfficeSpot {
  roomIndex: number;
  x: number;
  y: number;
}

export function spotLocal(roomIndex: number, x: number, y: number): OfficeSpot {
  const grid = gridFor("wide");
  const origin = roomOrigin(roomIndex, "wide");
  const worldX = origin.x + (x / 100 - 0.5) * ROOM_GEOMETRY.width;
  const worldZ = origin.z + (y / 100 - 0.5) * ROOM_GEOMETRY.depth;
  return {
    roomIndex,
    x: (worldX / grid.width + 0.5) * 100,
    y: (worldZ / grid.depth + 0.5) * 100,
  };
}

export function spotCorridor(x: number, y: number): OfficeSpot {
  return { roomIndex: -1, x, y };
}

/** Persentase peta → posisi dunia three.js (sumbu Z mengikuti peta). */
export function spotToWorld(spot: OfficeSpot, layout: OfficeLayoutName): { x: number; z: number } {
  const grid = gridFor(layout);
  return {
    x: (spot.x / 100 - 0.5) * grid.width,
    z: (spot.y / 100 - 0.5) * grid.depth,
  };
}

export interface OfficeMovement {
  /** Ruang kerja asal karyawan (0 atau 1), dipakai untuk filter. */
  homeRoomIndex: number;
  /** Ruangan tujuan pada tahap ini: kerja, kopi, meeting, atau koridor. */
  roomIndex: number;
  slot: number;
  /** Posisi tujuan dalam persentase seluruh peta. */
  x: number;
  y: number;
  /** Posisi tahap sebelumnya, dipakai fallback 2D untuk keyframe. */
  from: OfficeSpot;
  /** Waypoint koridor yang harus dilalui sebelum tujuan (tanpa `from`/tujuan). */
  via: OfficeSpot[];
  facing: "left" | "right" | "front";
  activity: OfficeActivity;
  walking: boolean;
  action?: { emoji: string; label: string };
}

interface RouteNode {
  spot: OfficeSpot;
  via: OfficeSpot[];
  roomIndex: number;
  activity: OfficeActivity;
  facing: "left" | "right" | "front";
  walking: boolean;
  action?: { emoji: string; label: string };
}

const WORK_DOOR = { x: 50, y: 96 } as const;
const SHARED_BACK_DOOR = { x: 50, y: 4 } as const;
const COFFEE_SIDE_DOOR = { x: 96, y: 50 } as const;
const MEETING_SIDE_DOOR = { x: 4, y: 50 } as const;
const COFFEE_SPOT = { x: 50, y: 58 } as const;
const MEETING_SPOT = { x: 50, y: 70 } as const;
const ROUTE_STEPS = 8;

/**
 * Rute: meja → Ruang Kopi → Ruang Meeting → meja.
 * Setiap perpindahan antar ruangan lewat pintu dan titik koridor, sehingga
 * tidak ada gerakan yang menembus dinding.
 */
function routeFor(employee: OfficeEmployee, index: number, home: number, slot: number): RouteNode[] {
  const deskLocal = ROOM_DESK_SPOTS[slot % ROOM_DESK_SPOTS.length];
  const desk = spotLocal(home, deskLocal.x, deskLocal.y);
  const homeDoor = spotLocal(home, WORK_DOOR.x, WORK_DOOR.y);
  const coffeeDoor = spotLocal(COFFEE_ROOM_INDEX, SHARED_BACK_DOOR.x, SHARED_BACK_DOOR.y);
  const coffeeSpot = spotLocal(COFFEE_ROOM_INDEX, COFFEE_SPOT.x, COFFEE_SPOT.y);
  const coffeeSideDoor = spotLocal(COFFEE_ROOM_INDEX, COFFEE_SIDE_DOOR.x, COFFEE_SIDE_DOOR.y);
  const meetingSideDoor = spotLocal(MEETING_ROOM_INDEX, MEETING_SIDE_DOOR.x, MEETING_SIDE_DOOR.y);
  const meetingSpot = spotLocal(MEETING_ROOM_INDEX, MEETING_SPOT.x, MEETING_SPOT.y);
  const meetingDoor = spotLocal(MEETING_ROOM_INDEX, SHARED_BACK_DOOR.x, SHARED_BACK_DOOR.y);
  const homeGap = spotCorridor(homeDoor.x, 50);
  const meetingGap = spotCorridor(meetingDoor.x, 50);
  const centerGap = spotCorridor(50, 50);
  const coffeeGap = spotCorridor(50, coffeeSideDoor.y);

  const toCoffeeVia = home === 0
    ? [homeGap, coffeeDoor]
    : [homeGap, centerGap, spotCorridor(coffeeDoor.x, 50), coffeeDoor];
  const toMeetingVia = [coffeeSideDoor, coffeeGap, meetingSideDoor];
  const backVia = home === 0
    ? [meetingDoor, meetingGap, centerGap, spotCorridor(homeDoor.x, 50), homeDoor]
    : [meetingDoor, meetingGap, homeDoor];

  return [
    {
      spot: desk, via: [], roomIndex: home,
      activity: activityFor(employee, index), facing: "front", walking: false,
    },
    {
      spot: homeDoor, via: [], roomIndex: home,
      activity: "walking", facing: "front", walking: true,
      action: { emoji: "🚶", label: "Menuju koridor" },
    },
    {
      spot: coffeeSpot, via: toCoffeeVia, roomIndex: COFFEE_ROOM_INDEX,
      activity: "walking", facing: "front", walking: true,
      action: { emoji: "🚶", label: "Menuju Ruang Kopi" },
    },
    {
      spot: coffeeSpot, via: [], roomIndex: COFFEE_ROOM_INDEX,
      activity: "drinking", facing: "front", walking: false,
      action: { emoji: "☕", label: "Ngopi di Ruang Kopi" },
    },
    {
      spot: meetingSpot, via: toMeetingVia, roomIndex: MEETING_ROOM_INDEX,
      activity: "walking", facing: "left", walking: true,
      action: { emoji: "🚶", label: "Menuju Ruang Meeting" },
    },
    {
      spot: meetingSpot, via: [], roomIndex: MEETING_ROOM_INDEX,
      activity: "talking", facing: "front", walking: false,
      action: { emoji: "💬", label: "Diskusi di Ruang Meeting" },
    },
    {
      spot: homeDoor, via: backVia, roomIndex: home,
      activity: "walking", facing: "front", walking: true,
      action: { emoji: "🚶", label: "Kembali ke meja" },
    },
    {
      spot: desk, via: [], roomIndex: home,
      activity: "walking", facing: desk.x > 50 ? "left" : "right", walking: true,
      action: { emoji: "🚶", label: "Kembali ke meja" },
    },
  ];
}

export function movementFor(employee: OfficeEmployee, index: number, tick: number, slot = index): OfficeMovement {
  const home = roomIndexFor(employee.department?.name);
  const safeSlot = ((slot % ROOM_DESK_SPOTS.length) + ROOM_DESK_SPOTS.length) % ROOM_DESK_SPOTS.length;
  const route = routeFor(employee, index, home, safeSlot);
  const step = (((tick + index) % ROUTE_STEPS) + ROUTE_STEPS) % ROUTE_STEPS;
  const node = route[step];
  const previous = route[(step - 1 + ROUTE_STEPS) % ROUTE_STEPS];

  if (employee.availability === "OFFLINE") {
    const atDesk = route[0];
    return {
      homeRoomIndex: home,
      roomIndex: home,
      slot: safeSlot,
      x: atDesk.spot.x,
      y: atDesk.spot.y,
      from: atDesk.spot,
      via: [],
      facing: "front",
      activity: "offline",
      walking: false,
    };
  }

  return {
    homeRoomIndex: home,
    roomIndex: node.roomIndex,
    slot: safeSlot,
    x: node.spot.x,
    y: node.spot.y,
    from: previous.spot,
    via: node.via,
    facing: node.facing,
    activity: node.activity,
    walking: node.walking,
    action: node.action,
  };
}

/**
 * Menyusun pergerakan sekaligus membagi kursi untuk karyawan yang satu ruang
 * kerja. Jadwal tiap orang di-offset memakai urutan asli agar tidak berjalan
 * bersamaan.
 */
export function movementsFor(employees: OfficeEmployee[], tick: number): Array<{ employee: OfficeEmployee; index: number; move: OfficeMovement }> {
  const slotByRoom = new Map<number, number>();
  return employees.map((employee, index) => {
    const home = roomIndexFor(employee.department?.name);
    const slot = slotByRoom.get(home) ?? 0;
    slotByRoom.set(home, slot + 1);
    return { employee, index, move: movementFor(employee, index, tick, slot) };
  });
}
