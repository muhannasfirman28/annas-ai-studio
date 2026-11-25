import { NextRequest } from "next/server";
import { route, json, bad } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { taskSchema } from "@/lib/schemas";
import { notify, logActivity, syncOverdue } from "@/lib/notify";
import { nextTaskCode } from "@/lib/tasks";
import { TASK_LIST_INCLUDE } from "@/lib/selects";

export const GET = route("tasks.read", async (req: NextRequest) => {
  await syncOverdue();
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim();
  const tasks = await prisma.task.findMany({
    where: {
      ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { code: { contains: q, mode: "insensitive" } }] } : {}),
      ...(sp.get("status") ? { status: sp.get("status") as never } : {}),
      ...(sp.get("priority") ? { priority: sp.get("priority") as never } : {}),
      ...(sp.get("project") ? { projectId: sp.get("project")! } : {}),
      ...(sp.get("dept") ? { departmentId: sp.get("dept")! } : {}),
      ...(sp.get("assignee") ? { assignees: { some: { employeeId: sp.get("assignee")! } } } : {}),
    },
    include: TASK_LIST_INCLUDE,
    orderBy: [{ updatedAt: "desc" }],
  });
  return { tasks };
});

export const POST = route("tasks.write", async (req, { user }) => {
  const d = taskSchema.parse(await json(req));
  const assignees = [...new Set(d.assigneeIds ?? [])];
  if (!assignees.length) throw bad("Pilih minimal satu penanggung jawab.");
  const first = await prisma.employee.findUnique({ where: { id: assignees[0] }, select: { departmentId: true } });
  let task;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      task = await prisma.task.create({
        data: {
          code: await nextTaskCode(), title: d.title, description: d.description ?? "", priority: d.priority ?? "MEDIUM",
          status: d.status ?? "TODO", deadline: d.deadline ?? null, projectId: d.projectId || null,
          departmentId: d.departmentId || first?.departmentId || null, createdById: user.id,
          progress: d.status === "COMPLETED" ? 100 : d.progress ?? 0, completedAt: d.status === "COMPLETED" ? new Date() : null,
          assignees: { create: assignees.map((employeeId) => ({ employeeId })) },
          checklist: d.checklist?.length ? { create: d.checklist.map((c) => ({ text: c.text, done: c.done })) } : undefined,
          logs: { create: { actorName: user.name, actorEmployeeId: user.employeeId, action: "created", detail: "Tugas dibuat" } },
        },
      });
      break;
    } catch (e) { if ((e as { code?: string }).code !== "P2002" || attempt === 2) throw e; }
  }
  if (!task) throw bad("Gagal membuat tugas.");
  await notify({ type: "TASK_ASSIGNED", title: `Tugas baru: ${task.title}`, body: `${task.code} ditugaskan kepada Anda.`, link: `/tasks?open=${task.id}`, employeeIds: assignees, actorUserId: user.id, includeFounders: false });
  await logActivity(`${user.name} membuat tugas ${task.code} ${task.title}`, "task", user.employeeId, `/tasks?open=${task.id}`);
  return { task };
});
