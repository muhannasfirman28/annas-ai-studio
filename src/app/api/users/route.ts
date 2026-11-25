import bcrypt from "bcryptjs";
import { z } from "zod";
import { route, json, bad } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const POST = route("users.manage", async (req) => {
  const s = await prisma.companySettings.findUnique({ where: { id: 1 } });
  const min = Number((s?.security as { minPasswordLength?: number })?.minPasswordLength) || 8;
  const d = z.object({
    email: z.string().email("Email tidak valid"), name: z.string().trim().min(2), role: z.enum(["FOUNDER", "EXECUTIVE", "MANAGER", "EMPLOYEE"]),
    employeeId: z.string().nullable().optional(), password: z.string().min(min, `Password minimal ${min} karakter`),
  }).parse(await json(req));
  if (d.role === "FOUNDER") throw bad("Role Founder hanya satu dan tidak dapat ditambahkan.");
  const u = await prisma.user.create({ data: { email: d.email.toLowerCase(), name: d.name, role: d.role, employeeId: d.employeeId || null, passwordHash: await bcrypt.hash(d.password, 11) }, select: { id: true, email: true, name: true, role: true, active: true, employeeId: true } });
  return { user: u };
});
