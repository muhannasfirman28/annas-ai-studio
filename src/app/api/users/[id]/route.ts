import bcrypt from "bcryptjs";
import { z } from "zod";
import { route, json, bad } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const PATCH = route("users.manage", async (req, { user, params }) => {
  const d = z.object({ role: z.enum(["EXECUTIVE", "MANAGER", "EMPLOYEE"]).optional(), active: z.boolean().optional(), password: z.string().min(8).optional(), name: z.string().min(2).optional(), employeeId: z.string().nullable().optional() }).parse(await json(req));
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) throw bad("Pengguna tidak ditemukan.");
  if (target.role === "FOUNDER" && (d.role || d.active === false)) throw bad("Role atau status Founder tidak dapat diubah.");
  if (target.id === user.id && d.active === false) throw bad("Anda tidak dapat menonaktifkan akun sendiri.");
  const { password, ...rest } = d;
  const u = await prisma.user.update({ where: { id: params.id }, data: { ...rest, ...(password ? { passwordHash: await bcrypt.hash(password, 11) } : {}) }, select: { id: true, email: true, name: true, role: true, active: true } });
  return { user: u };
});

export const DELETE = route("users.manage", async (_r, { user, params }) => {
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) throw bad("Pengguna tidak ditemukan.");
  if (target.role === "FOUNDER") throw bad("Akun Founder tidak dapat dihapus.");
  if (target.id === user.id) throw bad("Anda tidak dapat menghapus akun sendiri.");
  await prisma.user.delete({ where: { id: target.id } });
  return { ok: true };
});
