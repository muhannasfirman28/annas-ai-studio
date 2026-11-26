export interface OfficeEmployee {
  id: string;
  name: string;
  title: string;
  avatarColor: string;
  avatarUrl?: string | null;
  availability?: string;
  department?: { name: string } | null;
}

export type OfficeActivity = "typing" | "reading" | "focus" | "walking" | "offline";

export const ACTIVITY_LABEL: Record<OfficeActivity, string> = {
  typing: "Sedang mengetik",
  reading: "Sedang membaca",
  focus: "Sedang fokus",
  walking: "Jalan sebentar",
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
