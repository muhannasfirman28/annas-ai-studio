import { NextRequest } from "next/server";
import { route } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const GET = route(null, async (req: NextRequest) => {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return { employees: [], tasks: [], projects: [] };
  const ci = { contains: q, mode: "insensitive" as const };
  const [employees, tasks, projects] = await Promise.all([
    prisma.employee.findMany({ where: { OR: [{ name: ci }, { title: ci }] }, take: 5, select: { id: true, name: true, title: true, avatarColor: true } }),
    prisma.task.findMany({ where: { OR: [{ title: ci }, { code: ci }] }, take: 5, select: { id: true, code: true, title: true, status: true } }),
    prisma.project.findMany({ where: { name: ci }, take: 5, select: { id: true, name: true, color: true } }),
  ]);
  return { employees, tasks, projects };
});
