import { route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { employeeStats, emptyStats } from "@/lib/stats";
import { syncOverdue } from "@/lib/notify";
import { EMP_BASIC } from "@/lib/selects";

export const GET = route(null, async () => {
  await syncOverdue();
  const now = new Date();
  const [employees, projects, tasks, activities, reports, stats] = await Promise.all([
    prisma.employee.findMany({ select: { ...EMP_BASIC, assignments: { select: { task: { select: { status: true, progress: true } } } } }, orderBy: { createdAt: "asc" } }),
    prisma.project.findMany({ select: { id: true, name: true, color: true, status: true, tasks: { select: { status: true, progress: true } } } }),
    prisma.task.findMany({ select: { id: true, status: true, deadline: true, completedAt: true, createdAt: true, departmentId: true, department: { select: { name: true, color: true } } } }),
    prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { employee: { select: { name: true, avatarColor: true } } } }),
    prisma.employeeReport.findMany({ orderBy: { createdAt: "desc" }, take: 4, include: { employee: { select: { name: true, avatarColor: true, title: true } }, project: { select: { name: true } } } }),
    employeeStats(),
  ]);

  const done = tasks.filter((t) => t.status === "COMPLETED");
  const open = tasks.filter((t) => t.status !== "COMPLETED");
  const overdue = open.filter((t) => t.deadline && t.deadline < now);
  const active = open.filter((t) => !["BACKLOG"].includes(t.status));
  const pending = open.filter((t) => ["BACKLOG", "TODO", "BLOCKED", "REVISION"].includes(t.status));
  const onTime = done.filter((t) => t.deadline && t.completedAt && t.completedAt <= t.deadline).length;
  const doneWithDl = done.filter((t) => t.deadline).length;
  const base = doneWithDl + overdue.length;

  // tren 14 hari terakhir
  const days: { date: string; label: string; completed: number; created: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    const next = new Date(d); next.setDate(d.getDate() + 1);
    days.push({
      date: d.toISOString(), label: d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
      completed: done.filter((t) => t.completedAt && t.completedAt >= d && t.completedAt < next).length,
      created: tasks.filter((t) => t.createdAt >= d && t.createdAt < next).length,
    });
  }
  const byDept: Record<string, { name: string; color: string; value: number }> = {};
  for (const t of open) if (t.department) (byDept[t.department.name] ??= { name: t.department.name, color: t.department.color, value: 0 }).value++;

  return {
    totals: {
      employees: employees.length, projects: projects.length, active: active.length, completed: done.length, pending: pending.length, overdue: overdue.length,
      productivity: base ? Math.round((onTime / base) * 100) : null,
    },
    trend: days,
    distribution: Object.values(byDept),
    projectActivity: projects.map((p) => ({
      name: p.name.length > 22 ? p.name.slice(0, 21) + "…" : p.name, color: p.color,
      selesai: p.tasks.filter((t) => t.status === "COMPLETED").length,
      berjalan: p.tasks.filter((t) => ["IN_PROGRESS", "IN_REVIEW", "REVISION"].includes(t.status)).length,
      menunggu: p.tasks.filter((t) => ["BACKLOG", "TODO", "BLOCKED"].includes(t.status)).length,
    })),
    employees: employees.map(({ assignments, ...e }) => ({ ...e, stats: stats[e.id] ?? emptyStats(e.id) })),
    employeePerformance: employees.map((e) => ({ name: e.name.split(" ")[0], produktivitas: stats[e.id]?.productivity ?? 0, penyelesaian: stats[e.id]?.completionRate ?? 0 })),
    activities, reports,
  };
});
