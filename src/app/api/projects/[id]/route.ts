import { route, json, HttpError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { projectSchema } from "@/lib/schemas";
import { logActivity } from "@/lib/notify";
import { EMP_BASIC, TASK_LIST_INCLUDE } from "@/lib/selects";
import { withProgress } from "@/lib/stats";

export const GET = route("projects.read", async (_r, { params }) => {
  const p = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      manager: { select: EMP_BASIC }, members: { include: { employee: { select: EMP_BASIC } } },
      tasks: { include: TASK_LIST_INCLUDE, orderBy: { updatedAt: "desc" } },
      milestones: { orderBy: { dueDate: "asc" } },
      conversations: { select: { id: true }, take: 1 },
    },
  });
  if (!p) throw new HttpError(404, "Proyek tidak ditemukan.");
  const logs = await prisma.taskActivityLog.findMany({ where: { task: { projectId: p.id } }, orderBy: { createdAt: "desc" }, take: 20, include: { task: { select: { id: true, code: true, title: true } } } });
  return { project: withProgress(p), logs };
});

export const PATCH = route("projects.write", async (req, { user, params }) => {
  const d = projectSchema.partial().parse(await json(req));
  const existing = await prisma.project.findUnique({ where: { id: params.id } });
  if (!existing) throw new HttpError(404, "Proyek tidak ditemukan.");
  await prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: { id: params.id },
      data: {
        name: d.name, description: d.description, status: d.status, color: d.color,
        managerId: d.managerId === undefined ? undefined : d.managerId || null,
        startDate: d.startDate ?? undefined, deadline: d.deadline === undefined ? undefined : d.deadline,
      },
    });
    if (d.memberIds || d.managerId) {
      const cur = await tx.projectMember.findMany({ where: { projectId: params.id } });
      const ids = new Set(d.memberIds ?? cur.map((m) => m.employeeId));
      const mgr = d.managerId === undefined ? existing.managerId : d.managerId;
      if (mgr) ids.add(mgr);
      await tx.projectMember.deleteMany({ where: { projectId: params.id, employeeId: { notIn: [...ids] } } });
      const have = new Set(cur.map((m) => m.employeeId));
      const add = [...ids].filter((i) => !have.has(i));
      if (add.length) await tx.projectMember.createMany({ data: add.map((employeeId) => ({ projectId: params.id, employeeId })) });
      for (const m of [...ids]) await tx.projectMember.updateMany({ where: { projectId: params.id, employeeId: m }, data: { role: m === mgr ? "Project Manager" : "Member" } });
    }
    if (d.milestones) {
      const keep = d.milestones.filter((m) => m.id).map((m) => m.id!);
      await tx.milestone.deleteMany({ where: { projectId: params.id, id: { notIn: keep } } });
      for (const m of d.milestones) {
        if (m.id) await tx.milestone.update({ where: { id: m.id }, data: { title: m.title, dueDate: m.dueDate ?? null, done: m.done } });
        else await tx.milestone.create({ data: { projectId: params.id, title: m.title, dueDate: m.dueDate ?? null, done: m.done } });
      }
    }
  });
  await logActivity(`${user.name} memperbarui proyek ${d.name ?? existing.name}`, "project", user.employeeId, `/projects/${params.id}`);
  return { ok: true };
});

export const DELETE = route("projects.write", async (_r, { user, params }) => {
  const p = await prisma.project.findUnique({ where: { id: params.id } });
  if (!p) throw new HttpError(404, "Proyek tidak ditemukan.");
  await prisma.project.delete({ where: { id: p.id } });
  await logActivity(`${user.name} menghapus proyek ${p.name}`, "project", user.employeeId);
  return { ok: true };
});
