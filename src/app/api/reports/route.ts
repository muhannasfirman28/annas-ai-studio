import { NextRequest } from "next/server";
import { z } from "zod";
import { route, json, HttpError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { notify, logActivity } from "@/lib/notify";

export const GET = route("reports.read", async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const reports = await prisma.employeeReport.findMany({
    where: {
      ...(sp.get("period") ? { period: sp.get("period") as never } : {}),
      ...(sp.get("employeeId") ? { employeeId: sp.get("employeeId")! } : {}),
      ...(sp.get("projectId") ? { projectId: sp.get("projectId")! } : {}),
      ...(sp.get("departmentId") ? { employee: { departmentId: sp.get("departmentId")! } } : {}),
    },
    orderBy: { createdAt: "desc" }, take: 100,
    include: { employee: { select: { id: true, name: true, title: true, avatarColor: true, department: { select: { name: true } } } }, project: { select: { id: true, name: true } } },
  });
  return { reports };
});

const schema = z.object({
  employeeId: z.string().min(1, "Karyawan wajib dipilih"), projectId: z.string().nullable().optional(),
  period: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
  tasksWorked: z.string().max(4000).default(""), completedWork: z.string().max(4000).default(""), ongoingWork: z.string().max(4000).default(""),
  obstacles: z.string().max(4000).default(""), solutions: z.string().max(4000).default(""), recommendations: z.string().max(4000).default(""),
  status: z.string().min(1).max(40).default("On Track"),
});

export const POST = route(null, async (req, { user }) => {
  const d = schema.parse(await json(req));
  const full = await can(user.role, "reports.write");
  if (!full && !(await can(user.role, "reports.write_own"))) throw new HttpError(403, "Anda tidak berizin membuat laporan.");
  if (!full && d.employeeId !== user.employeeId) throw new HttpError(403, "Anda hanya dapat membuat laporan untuk diri sendiri.");
  const r = await prisma.employeeReport.create({ data: { ...d, projectId: d.projectId || null }, include: { employee: { select: { name: true } } } });
  await notify({ type: "NEW_REPORT", title: `Laporan baru dari ${r.employee.name}`, body: `Laporan ${d.period.toLowerCase()} — ${d.status}`, link: "/reports", actorUserId: user.id });
  await logActivity(`${r.employee.name} membuat laporan ${d.period === "DAILY" ? "harian" : d.period === "WEEKLY" ? "mingguan" : "bulanan"}`, "report", r.employeeId, "/reports");
  return { report: r };
});
