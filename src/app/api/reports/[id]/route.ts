import { route, HttpError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";

export const DELETE = route(null, async (_r, { user, params }) => {
  const r = await prisma.employeeReport.findUnique({ where: { id: params.id } });
  if (!r) throw new HttpError(404, "Laporan tidak ditemukan.");
  const ok = (await can(user.role, "reports.write")) || (r.employeeId === user.employeeId && (await can(user.role, "reports.write_own")));
  if (!ok) throw new HttpError(403, "Tidak diizinkan.");
  await prisma.employeeReport.delete({ where: { id: r.id } });
  return { ok: true };
});
