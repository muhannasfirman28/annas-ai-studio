import bcrypt from "bcryptjs";
import { z } from "zod";
import { route, json, bad } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const POST = route(null, async (req, { user }) => {
  const s = await prisma.companySettings.findUnique({ where: { id: 1 } });
  const min = Number((s?.security as { minPasswordLength?: number })?.minPasswordLength) || 8;
  const d = z.object({ current: z.string(), next: z.string().min(min, `Password minimal ${min} karakter`) }).parse(await json(req));
  const u = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await bcrypt.compare(d.current, u.passwordHash))) throw bad("Password saat ini salah.");
  await prisma.user.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(d.next, 11) } });
  return { ok: true };
});
