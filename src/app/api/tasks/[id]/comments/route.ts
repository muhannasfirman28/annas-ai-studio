import { z } from "zod";
import { route, json, HttpError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

export const POST = route("tasks.read", async (req, { user, params }) => {
  const { body } = z.object({ body: z.string().trim().min(1, "Komentar tidak boleh kosong").max(2000) }).parse(await json(req));
  const t = await prisma.task.findUnique({ where: { id: params.id }, include: { assignees: true } });
  if (!t) throw new HttpError(404, "Tugas tidak ditemukan.");
  const c = await prisma.taskComment.create({ data: { taskId: t.id, authorId: user.id, body }, include: { author: { select: { id: true, name: true, employee: { select: { avatarColor: true } } } } } });
  await prisma.task.update({ where: { id: t.id }, data: { lastActivityAt: new Date() } });
  await prisma.taskActivityLog.create({ data: { taskId: t.id, actorName: user.name, actorEmployeeId: user.employeeId, action: "commented", detail: body.slice(0, 120) } });
  await notify({ type: "NEW_COMMENT", title: `Komentar baru di ${t.code}`, body: `${user.name}: ${body.slice(0, 100)}`, link: `/tasks?open=${t.id}`, employeeIds: t.assignees.map((a) => a.employeeId), actorUserId: user.id });
  return { comment: c };
});
