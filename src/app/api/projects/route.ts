import { route, json } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { projectSchema } from "@/lib/schemas";
import { notify, logActivity } from "@/lib/notify";
import { EMP_BASIC } from "@/lib/selects";
import { withProgress } from "@/lib/stats";


export const GET = route("projects.read", async () => {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      manager: { select: EMP_BASIC },
      members: { include: { employee: { select: EMP_BASIC } } },
      tasks: { select: { progress: true, status: true } },
      milestones: true,
    },
  });
  return { projects: projects.map(withProgress).map(({ tasks: _t, ...p }) => p) };
});

export const POST = route("projects.write", async (req, { user }) => {
  const d = projectSchema.parse(await json(req));
  const members = new Set(d.memberIds ?? []);
  if (d.managerId) members.add(d.managerId);
  const p = await prisma.project.create({
    data: {
      name: d.name, description: d.description ?? "", status: d.status ?? "PLANNING", color: d.color ?? "#2563eb",
      managerId: d.managerId || null, startDate: d.startDate ?? new Date(), deadline: d.deadline ?? null,
      members: { create: [...members].map((employeeId) => ({ employeeId, role: employeeId === d.managerId ? "Project Manager" : "Member" })) },
      milestones: d.milestones?.length ? { create: d.milestones.map((m) => ({ title: m.title, dueDate: m.dueDate ?? null, done: m.done })) } : undefined,
      conversations: { create: { type: "PROJECT", title: d.name } },
    },
  });
  await notify({ type: "NEW_PROJECT", title: `Proyek baru: ${p.name}`, body: `${user.name} membuat proyek baru.`, link: `/projects/${p.id}`, employeeIds: [...members], actorUserId: user.id });
  await logActivity(`${user.name} membuat proyek ${p.name}`, "project", user.employeeId, `/projects/${p.id}`);
  return { project: p };
});
