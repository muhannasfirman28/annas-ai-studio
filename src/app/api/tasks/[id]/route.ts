import { route, json, bad, HttpError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { taskSchema } from "@/lib/schemas";
import { can } from "@/lib/rbac";
import { notify, logActivity } from "@/lib/notify";
import { EMP_BASIC } from "@/lib/selects";
import { STATUS_LABEL, PRIORITY_LABEL, fmtDate } from "@/lib/utils";
import { unlink } from "node:fs/promises";
import path from "node:path";

const detailInclude = {
  assignees: { include: { employee: { select: EMP_BASIC } } },
  project: { select: { id: true, name: true, color: true } },
  department: { select: { id: true, name: true, color: true } },
  checklist: { orderBy: { id: "asc" as const } },
  comments: { orderBy: { createdAt: "asc" as const }, include: { author: { select: { id: true, name: true, employee: { select: { avatarColor: true } } } } } },
  attachments: { orderBy: { createdAt: "desc" as const } },
  logs: { orderBy: { createdAt: "desc" as const } },
  createdBy: { select: { name: true } },
};

export const GET = route("tasks.read", async (_r, { params }) => {
  const task = await prisma.task.findUnique({ where: { id: params.id }, include: detailInclude });
  if (!task) throw new HttpError(404, "Tugas tidak ditemukan.");
  return { task };
});

export const PATCH = route(null, async (req, { user, params }) => {
  const existing = await prisma.task.findUnique({ where: { id: params.id }, include: { assignees: true, checklist: true } });
  if (!existing) throw new HttpError(404, "Tugas tidak ditemukan.");
  const full = await can(user.role, "tasks.write");
  const own = !full && (await can(user.role, "tasks.update_own")) && existing.assignees.some((a) => a.employeeId === user.employeeId);
  if (!full && !own) throw new HttpError(403, "Anda tidak memiliki izin mengubah tugas ini.");

  const parsed = taskSchema.partial().parse(await json(req));
  // karyawan biasa hanya boleh mengubah status, progress, dan checklist
  const d = full ? parsed : { status: parsed.status, progress: parsed.progress, checklist: parsed.checklist };

  const changes: string[] = [];
  const data: Record<string, unknown> = {};
  if (d.title !== undefined && d.title !== existing.title) { data.title = d.title; changes.push(`judul diubah`); }
  if (d.description !== undefined && d.description !== existing.description) { data.description = d.description; changes.push("deskripsi diperbarui"); }
  if (d.priority && d.priority !== existing.priority) { data.priority = d.priority; changes.push(`prioritas ${PRIORITY_LABEL[existing.priority]} → ${PRIORITY_LABEL[d.priority]}`); }
  let deadlineChanged = false;
  if (d.deadline !== undefined && (d.deadline?.getTime() ?? null) !== (existing.deadline?.getTime() ?? null)) {
    data.deadline = d.deadline; deadlineChanged = true; changes.push(`deadline ${fmtDate(existing.deadline)} → ${fmtDate(d.deadline)}`);
  }
  if (full) {
    if (d.projectId !== undefined) data.projectId = d.projectId || null;
    if (d.departmentId !== undefined) data.departmentId = d.departmentId || null;
  }

  let status = existing.status;
  if (d.status && d.status !== existing.status) {
    status = d.status; data.status = d.status;
    changes.push(`status ${STATUS_LABEL[existing.status]} → ${STATUS_LABEL[d.status]}`);
    if (d.status === "COMPLETED") { data.completedAt = new Date(); data.progress = 100; }
    else if (existing.status === "COMPLETED") { data.completedAt = null; }
  }
  if (d.progress !== undefined && status !== "COMPLETED" && d.progress !== existing.progress) {
    data.progress = d.progress; changes.push(`progress ${existing.progress}% → ${d.progress}%`);
  }

  await prisma.$transaction(async (tx) => {
    if (d.checklist) {
      const keep = d.checklist.filter((c) => c.id).map((c) => c.id!);
      await tx.checklistItem.deleteMany({ where: { taskId: existing.id, id: { notIn: keep } } });
      for (const c of d.checklist) {
        if (c.id) await tx.checklistItem.update({ where: { id: c.id }, data: { text: c.text, done: c.done } });
        else await tx.checklistItem.create({ data: { taskId: existing.id, text: c.text, done: c.done } });
      }
      if (d.progress === undefined && status !== "COMPLETED" && d.checklist.length) {
        data.progress = Math.round((d.checklist.filter((c) => c.done).length / d.checklist.length) * 100);
      }
      changes.push("checklist diperbarui");
    }
    if (full && parsed.assigneeIds) {
      const ids = [...new Set(parsed.assigneeIds)];
      if (!ids.length) throw bad("Pilih minimal satu penanggung jawab.");
      await tx.taskAssignee.deleteMany({ where: { taskId: existing.id, employeeId: { notIn: ids } } });
      const have = new Set(existing.assignees.map((a) => a.employeeId));
      const added = ids.filter((i) => !have.has(i));
      if (added.length) await tx.taskAssignee.createMany({ data: added.map((employeeId) => ({ taskId: existing.id, employeeId })) });
      if (added.length || ids.length !== have.size) changes.push("penanggung jawab diperbarui");
    }
    if (changes.length) {
      await tx.task.update({ where: { id: existing.id }, data: { ...data, lastActivityAt: new Date() } });
      await tx.taskActivityLog.create({ data: { taskId: existing.id, actorName: user.name, actorEmployeeId: user.employeeId, action: "updated", detail: changes.join("; ") } });
    }
  });

  const assigneeIds = (parsed.assigneeIds ?? existing.assignees.map((a) => a.employeeId));
  const link = `/tasks?open=${existing.id}`;
  if (d.status && d.status !== existing.status) {
    if (d.status === "COMPLETED") await notify({ type: "TASK_COMPLETED", title: `Tugas selesai: ${existing.title}`, body: `${existing.code} ditandai selesai oleh ${user.name}.`, link, employeeIds: assigneeIds, actorUserId: user.id });
    if (d.status === "IN_REVIEW") await notify({ type: "REVIEW_REQUESTED", title: `Permintaan review: ${existing.title}`, body: `${user.name} menandai ${existing.code} siap ditinjau.`, link, actorUserId: user.id });
    await logActivity(`${user.name} mengubah ${existing.code} menjadi ${STATUS_LABEL[d.status]}`, "task", user.employeeId, link);
  }
  if (deadlineChanged) await notify({ type: "DEADLINE_CHANGED", title: `Deadline berubah: ${existing.title}`, body: `Deadline baru ${fmtDate(d.deadline)}.`, link, employeeIds: assigneeIds, actorUserId: user.id });
  if (full && parsed.assigneeIds) {
    const have = new Set(existing.assignees.map((a) => a.employeeId));
    const added = assigneeIds.filter((i) => !have.has(i));
    if (added.length) await notify({ type: "TASK_ASSIGNED", title: `Tugas baru: ${existing.title}`, body: `${existing.code} ditugaskan kepada Anda.`, link, employeeIds: added, actorUserId: user.id, includeFounders: false });
  }
  const task = await prisma.task.findUnique({ where: { id: existing.id }, include: detailInclude });
  return { task };
});

export const DELETE = route("tasks.delete", async (_r, { user, params }) => {
  const t = await prisma.task.findUnique({ where: { id: params.id }, include: { attachments: true } });
  if (!t) throw new HttpError(404, "Tugas tidak ditemukan.");
  await prisma.task.delete({ where: { id: t.id } });
  for (const a of t.attachments) await unlink(path.join(process.cwd(), "uploads", a.storedAs)).catch(() => {});
  await logActivity(`${user.name} menghapus tugas ${t.code}`, "task", user.employeeId);
  return { ok: true };
});
