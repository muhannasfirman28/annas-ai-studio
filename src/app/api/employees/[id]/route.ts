import { route, json, bad } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { employeeStats, emptyStats } from "@/lib/stats";
import { logActivity } from "@/lib/notify";
import { employeeSchema } from "@/lib/schemas";
import { EMP_BASIC, TASK_LIST_INCLUDE } from "@/lib/selects";

export const GET = route("employees.read", async (_r, { params }) => {
  const e = await prisma.employee.findUnique({
    where: { id: params.id },
    include: {
      department: true, skills: { orderBy: { level: "desc" } },
      manager: { select: EMP_BASIC }, reports: { select: EMP_BASIC },
      collaborators: { select: EMP_BASIC }, user: { select: { id: true, email: true, role: true } },
      agentConfig: { select: { enabled: true, model: true } },
    },
  });
  if (!e) throw bad("Karyawan tidak ditemukan.");
  const [assignments, logs, activities, reports, stats] = await Promise.all([
    prisma.taskAssignee.findMany({ where: { employeeId: e.id }, include: { task: { include: TASK_LIST_INCLUDE } }, orderBy: { task: { updatedAt: "desc" } } }),
    prisma.taskActivityLog.findMany({ where: { actorEmployeeId: e.id }, orderBy: { createdAt: "desc" }, take: 15, include: { task: { select: { id: true, code: true, title: true } } } }),
    prisma.activityLog.findMany({ where: { employeeId: e.id }, orderBy: { createdAt: "desc" }, take: 15 }),
    prisma.employeeReport.findMany({ where: { employeeId: e.id }, orderBy: { createdAt: "desc" }, take: 10, include: { project: { select: { name: true } } } }),
    employeeStats(),
  ]);
  return { employee: e, tasks: assignments.map((a) => a.task), taskLogs: logs, activities, reports, stats: stats[e.id] ?? emptyStats(e.id) };
});

export const PATCH = route("employees.write", async (req, { user, params }) => {
  const d = employeeSchema.partial().parse(await json(req));
  if (d.managerId) {
    if (d.managerId === params.id) throw bad("Karyawan tidak bisa menjadi atasan dirinya sendiri.");
    // cegah siklus hierarki
    let cur: string | null = d.managerId;
    for (let i = 0; cur && i < 20; i++) {
      if (cur === params.id) throw bad("Atasan yang dipilih menciptakan siklus hierarki.");
      cur = (await prisma.employee.findUnique({ where: { id: cur }, select: { managerId: true } }))?.managerId ?? null;
    }
  }
  const { skills, collaboratorIds, ...rest } = d;
  const e = await prisma.$transaction(async (tx) => {
    if (skills) {
      await tx.employeeSkill.deleteMany({ where: { employeeId: params.id } });
      await tx.employeeSkill.createMany({ data: [...new Set(skills)].map((name, i) => ({ employeeId: params.id, name, level: Math.max(60, 95 - i * 4) })) });
    }
    return tx.employee.update({
      where: { id: params.id },
      data: { ...rest, managerId: rest.managerId === undefined ? undefined : rest.managerId || null, collaborators: collaboratorIds ? { set: collaboratorIds.filter((i) => i !== params.id).map((id) => ({ id })) } : undefined },
    });
  });
  await logActivity(`${user.name} memperbarui profil ${e.name}`, "employee", e.id, `/employees/${e.id}`);
  return { employee: e };
});

export const DELETE = route("employees.write", async (_r, { user, params }) => {
  const e = await prisma.employee.findUnique({ where: { id: params.id }, include: { user: true } });
  if (!e) throw bad("Karyawan tidak ditemukan.");
  if (e.user?.role === "FOUNDER") throw bad("Founder tidak dapat dihapus.");
  await prisma.employee.delete({ where: { id: params.id } });
  await logActivity(`${user.name} menghapus karyawan ${e.name}`, "employee", null);
  return { ok: true };
});
