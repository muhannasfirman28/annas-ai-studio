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
