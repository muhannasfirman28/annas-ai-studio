import { NextRequest } from "next/server";
import { z } from "zod";
import { route, json } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { employeeStats, emptyStats } from "@/lib/stats";
import { logActivity } from "@/lib/notify";
import { employeeSchema } from "@/lib/schemas";


export const GET = route("employees.read", async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim(); const dept = sp.get("dept"); const title = sp.get("title"); const status = sp.get("status");
  const list = await prisma.employee.findMany({
    where: {
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      ...(dept ? { departmentId: dept } : {}),
      ...(title ? { title: { contains: title, mode: "insensitive" } } : {}),
      ...(status ? { availability: status as never } : {}),
    },
    include: { department: true, manager: { select: { id: true, name: true } }, skills: true, user: { select: { role: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  const stats = await employeeStats();
  return { employees: list.map((e) => ({ ...e, stats: stats[e.id] ?? emptyStats(e.id) })) };
});

export const POST = route("employees.write", async (req, { user }) => {
  const d = employeeSchema.parse(await json(req));
  const e = await prisma.employee.create({
    data: {
      name: d.name, title: d.title, departmentId: d.departmentId, managerId: d.managerId || null,
      avatarColor: d.avatarColor ?? "#2563eb", bio: d.bio ?? "", personality: d.personality ?? "",
      communicationStyle: d.communicationStyle ?? "", responsibilities: d.responsibilities ?? "", targets: d.targets ?? "",
      availability: d.availability ?? "AVAILABLE",
      skills: { create: (d.skills ?? []).map((name, i) => ({ name, level: Math.max(60, 95 - i * 4) })) },
      collaborators: d.collaboratorIds?.length ? { connect: d.collaboratorIds.map((id) => ({ id })) } : undefined,
      agentConfig: { create: { systemPrompt: `Kamu adalah ${d.name}, ${d.title} di Annas AI Studio. Jawab ringkas dalam Bahasa Indonesia sesuai peranmu.` } },
    },
  });
  await logActivity(`${user.name} menambahkan karyawan ${e.name}`, "employee", e.id, `/employees/${e.id}`);
  return { employee: e };
});
