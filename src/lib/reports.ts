import { prisma } from "./prisma";
import { employeeStats } from "./stats";
import { STATUS_LABEL, PRIORITY_LABEL, fmtDate } from "./utils";

export type Scope = { period: "DAILY" | "WEEKLY" | "MONTHLY"; projectId?: string | null; employeeId?: string | null; departmentId?: string | null };
export const periodDays = (p: Scope["period"]) => (p === "DAILY" ? 1 : p === "WEEKLY" ? 7 : 30);

export async function analytics(s: Scope) {
  const now = new Date();
  const from = new Date(now.getTime() - periodDays(s.period) * 86400000);
  const tasks = await prisma.task.findMany({
    where: {
      ...(s.projectId ? { projectId: s.projectId } : {}),
      ...(s.departmentId ? { departmentId: s.departmentId } : {}),
      ...(s.employeeId ? { assignees: { some: { employeeId: s.employeeId } } } : {}),
    },
    include: { assignees: { include: { employee: { select: { id: true, name: true, avatarColor: true } } } }, project: { select: { name: true } }, department: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });
  const done = tasks.filter((t) => t.status === "COMPLETED");
  const doneInPeriod = done.filter((t) => t.completedAt && t.completedAt >= from);
  const open = tasks.filter((t) => t.status !== "COMPLETED");
  const overdueOpen = open.filter((t) => t.deadline && t.deadline < now);
  const onTime = done.filter((t) => t.deadline && t.completedAt && t.completedAt <= t.deadline).length;
  const late = done.filter((t) => t.deadline && t.completedAt && t.completedAt > t.deadline).length;
  const stats = await employeeStats();
  const emps = new Map<string, { id: string; name: string; avatarColor: string }>();
  tasks.forEach((t) => t.assignees.forEach((a) => emps.set(a.employeeId, a.employee)));

  const days = periodDays(s.period) === 1 ? 7 : periodDays(s.period);
  const trend = Array.from({ length: days }, (_, i) => {
    const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (days - 1 - i));
    const n = new Date(d); n.setDate(d.getDate() + 1);
    return { label: d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }), selesai: done.filter((t) => t.completedAt && t.completedAt >= d && t.completedAt < n).length };
  });

  return {
    range: { from, to: now },
    summary: {
      totalTasks: tasks.length, completed: done.length, completedInPeriod: doneInPeriod.length, open: open.length, overdue: overdueOpen.length,
      completionRate: tasks.length ? Math.round((done.length / tasks.length) * 100) : null,
      onTimeRate: onTime + late ? Math.round((onTime / (onTime + late)) * 100) : null,
    },
    deadlinePerformance: [
      { name: "Tepat waktu", value: onTime, color: "#10b981" },
      { name: "Terlambat (selesai)", value: late, color: "#f59e0b" },
      { name: "Lewat deadline (belum selesai)", value: overdueOpen.length, color: "#ef4444" },
    ],
    workload: [...emps.values()].map((e) => ({
      name: e.name.split(" ")[0], fullName: e.name,
      aktif: open.filter((t) => t.assignees.some((a) => a.employeeId === e.id)).length,
      selesai: done.filter((t) => t.assignees.some((a) => a.employeeId === e.id)).length,
    })),
    employees: [...emps.values()].map((e) => ({ ...e, ...stats[e.id] })),
    trend,
    tasks,
  };
}

export async function draftReport(employeeId: string, period: Scope["period"]) {
  const from = new Date(Date.now() - periodDays(period) * 86400000);
  const rows = await prisma.taskAssignee.findMany({ where: { employeeId }, include: { task: true } });
  const ts = rows.map((r) => r.task);
  const line = (t: (typeof ts)[number]) => `${t.code} ${t.title}`;
  const worked = ts.filter((t) => t.updatedAt >= from || (t.completedAt && t.completedAt >= from));
  const completed = ts.filter((t) => t.completedAt && t.completedAt >= from);
  const ongoing = ts.filter((t) => ["IN_PROGRESS", "IN_REVIEW", "REVISION"].includes(t.status));
  const blocked = ts.filter((t) => t.status === "BLOCKED" || (t.status !== "COMPLETED" && t.deadline && t.deadline < new Date()));
  return {
    tasksWorked: worked.map(line).join("\n"),
    completedWork: completed.map(line).join("\n"),
    ongoingWork: ongoing.map((t) => `${line(t)} (${t.progress}%)`).join("\n"),
    obstacles: blocked.map((t) => `${line(t)} — ${t.status === "BLOCKED" ? "Blocked" : "melewati deadline"}`).join("\n"),
    status: blocked.length ? "At Risk" : "On Track",
  };
}

export const taskRows = (tasks: Awaited<ReturnType<typeof analytics>>["tasks"]) =>
  tasks.map((t) => [t.code, t.title, t.project?.name ?? "—", t.department?.name ?? "—", t.assignees.map((a) => a.employee.name).join(", "), PRIORITY_LABEL[t.priority], STATUS_LABEL[t.status], `${t.progress}%`, fmtDate(t.deadline)]);
