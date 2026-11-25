import { prisma } from "./prisma";

/** Pastikan tiap proyek dan divisi memiliki ruang percakapan. */
export async function ensureConversations() {
  const [projects, depts, convs] = await Promise.all([
    prisma.project.findMany({ select: { id: true, name: true } }),
    prisma.department.findMany({ select: { id: true, name: true } }),
    prisma.conversation.findMany({ select: { projectId: true, departmentId: true, type: true } }),
  ]);
  const hasP = new Set(convs.filter((c) => c.projectId).map((c) => c.projectId));
  const hasD = new Set(convs.filter((c) => c.departmentId).map((c) => c.departmentId));
  const data = [
    ...projects.filter((p) => !hasP.has(p.id)).map((p) => ({ type: "PROJECT" as const, title: p.name, projectId: p.id })),
    ...depts.filter((d) => !hasD.has(d.id)).map((d) => ({ type: "DIVISION" as const, title: `Divisi ${d.name}`, departmentId: d.id })),
  ];
  if (data.length) await prisma.conversation.createMany({ data });
  if (!convs.some((c) => c.type === "GENERAL")) await prisma.conversation.create({ data: { type: "GENERAL", title: "Umum — Annas AI Studio" } });
}

/** Ekstrak @mention yang cocok dengan nama karyawan (nama terpanjang diprioritaskan). */
export async function parseMentions(body: string) {
  const emps = await prisma.employee.findMany({ select: { id: true, name: true } });
  const lower = body.toLowerCase();
  return emps.filter((e) => lower.includes(`@${e.name.toLowerCase()}`)).map((e) => e.id);
}
