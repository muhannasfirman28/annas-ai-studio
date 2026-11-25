import { prisma } from "./prisma";

export type EmpStats = {
  employeeId: string; assigned: number; active: number; completed: number; overdue: number; blocked: number;
  avgProgress: number; completionRate: number | null; onTimeRate: number | null; productivity: number | null;
};

/**
 * Semua angka dihitung dari data tugas nyata:
 * - completionRate = selesai / total tugas yang ditugaskan
 * - onTimeRate     = selesai sebelum/tepat deadline / tugas selesai yang punya deadline
 * - productivity   = tugas selesai tepat waktu / (tugas selesai + tugas yang sudah lewat deadline)
 * null berarti belum ada data yang cukup.
 */
export async function employeeStats(): Promise<Record<string, EmpStats>> {
  const rows = await prisma.taskAssignee.findMany({ include: { task: true } });
  const now = Date.now();
  const map: Record<string, EmpStats> = {};
  const acc: Record<string, { onTime: number; withDl: number; progress: number; due: number }> = {};
  for (const r of rows) {
    const id = r.employeeId;
    const s = (map[id] ??= { employeeId: id, assigned: 0, active: 0, completed: 0, overdue: 0, blocked: 0, avgProgress: 0, completionRate: null, onTimeRate: null, productivity: null });
    const a = (acc[id] ??= { onTime: 0, withDl: 0, progress: 0, due: 0 });
    const t = r.task;
    s.assigned++; a.progress += t.progress;
    const done = t.status === "COMPLETED";
    if (done) {
      s.completed++;
      if (t.deadline) { a.withDl++; if (t.completedAt && t.completedAt <= t.deadline) a.onTime++; }
    } else {
      if (t.status !== "BACKLOG") s.active++;
      if (t.status === "BLOCKED") s.blocked++;
      if (t.deadline && t.deadline.getTime() < now) { s.overdue++; a.due++; }
    }
  }
  for (const [id, s] of Object.entries(map)) {
    const a = acc[id];
    s.avgProgress = s.assigned ? Math.round(a.progress / s.assigned) : 0;
    s.completionRate = s.assigned ? Math.round((s.completed / s.assigned) * 100) : null;
    s.onTimeRate = a.withDl ? Math.round((a.onTime / a.withDl) * 100) : null;
    const base = a.withDl + a.due;
    s.productivity = base ? Math.round((a.onTime / base) * 100) : null;
  }
  return map;
}

export const emptyStats = (employeeId: string): EmpStats => ({ employeeId, assigned: 0, active: 0, completed: 0, overdue: 0, blocked: 0, avgProgress: 0, completionRate: null, onTimeRate: null, productivity: null });

export function withProgress<T extends { tasks: { progress: number; status: string }[] }>(p: T) {
  const total = p.tasks.length;
  const done = p.tasks.filter((t) => t.status === "COMPLETED").length;
  const progress = total ? Math.round(p.tasks.reduce((s, t) => s + t.progress, 0) / total) : 0;
  return { ...p, taskTotal: total, taskDone: done, progress };
}
