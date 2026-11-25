import { NextRequest } from "next/server";
import { z } from "zod";
import { route, json, HttpError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { parseMentions } from "@/lib/chat";
import { notify, logActivity } from "@/lib/notify";
import { can } from "@/lib/rbac";
import { nextTaskCode } from "@/lib/tasks";

const include = { authorEmployee: { select: { id: true, name: true, title: true, avatarColor: true } }, authorUser: { select: { id: true, name: true } } };

export const GET = route("chat.use", async (req: NextRequest, { params }) => {
  const after = req.nextUrl.searchParams.get("after");
  const messages = await prisma.message.findMany({
    where: { conversationId: params.id, ...(after ? { createdAt: { gt: new Date(after) } } : {}) },
    orderBy: { createdAt: "asc" }, take: 300, include,
  });
  return { messages };
});

const schema = z.object({
  body: z.string().trim().min(1, "Pesan tidak boleh kosong").max(4000),
  kind: z.enum(["MESSAGE", "INSTRUCTION"]).default("MESSAGE"),
  createTask: z.boolean().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  deadline: z.string().optional(),
});

export const POST = route("chat.use", async (req, { user, params }) => {
  const d = schema.parse(await json(req));
  const conv = await prisma.conversation.findUnique({ where: { id: params.id } });
  if (!conv) throw new HttpError(404, "Percakapan tidak ditemukan.");
  const mentions = await parseMentions(d.body);
  const msg = await prisma.message.create({
    data: { conversationId: conv.id, authorUserId: user.id, authorEmployeeId: user.employeeId, kind: d.kind, body: d.body, mentions },
    include,
  });
  const link = `/chat?c=${conv.id}`;
  if (mentions.length) {
    await notify({ type: d.kind === "INSTRUCTION" ? "REVIEW_REQUESTED" : "NEW_COMMENT", title: d.kind === "INSTRUCTION" ? `Instruksi dari ${user.name}` : `${user.name} menyebut Anda`, body: d.body.slice(0, 120), link, employeeIds: mentions, actorUserId: user.id, includeFounders: false });
  }
  let task = null;
  if (d.kind === "INSTRUCTION" && d.createTask) {
    if (!(await can(user.role, "tasks.write"))) throw new HttpError(403, "Anda tidak berizin membuat tugas.");
    if (!mentions.length) throw new HttpError(400, "Mention minimal satu karyawan (@Nama) untuk membuat tugas dari instruksi.");
    const first = await prisma.employee.findUnique({ where: { id: mentions[0] }, select: { departmentId: true } });
    task = await prisma.task.create({
      data: {
        code: await nextTaskCode(), title: d.body.replace(/@[\p{L}\- ]+?(?=[\s,.:;]|$)/gu, "").trim().slice(0, 120) || "Tugas dari instruksi", description: d.body,
        priority: d.priority ?? "MEDIUM", deadline: d.deadline ? new Date(d.deadline) : null, status: "TODO",
        projectId: conv.projectId, departmentId: first?.departmentId, createdById: user.id,
        assignees: { create: mentions.map((employeeId) => ({ employeeId })) },
        logs: { create: { actorName: user.name, actorEmployeeId: user.employeeId, action: "created", detail: "Dibuat dari instruksi di chat" } },
      },
    });
    await notify({ type: "TASK_ASSIGNED", title: `Tugas baru: ${task.title}`, body: `${task.code} ditugaskan kepada Anda.`, link: `/tasks?open=${task.id}`, employeeIds: mentions, actorUserId: user.id, includeFounders: false });
    await logActivity(`${user.name} membuat tugas ${task.code} dari instruksi`, "task", user.employeeId, `/tasks?open=${task.id}`);
  }
  return { message: msg, task };
});
