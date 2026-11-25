import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { COOKIE, createToken } from "@/lib/auth";

const attempts = new Map<string, { n: number; until: number }>();
const schema = z.object({ email: z.string().email("Email tidak valid"), password: z.string().min(1, "Password wajib diisi") });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  const key = email;
  const a = attempts.get(key);
  if (a && a.n >= 5 && a.until > Date.now()) {
    return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi." }, { status: 429 });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user && user.active && (await bcrypt.compare(parsed.data.password, user.passwordHash));
  if (!ok) {
    attempts.set(key, { n: (a?.n ?? 0) + 1, until: Date.now() + 5 * 60_000 });
    return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
  }
  attempts.delete(key);
  const settings = await prisma.companySettings.findUnique({ where: { id: 1 } });
  const hours = Number((settings?.security as { sessionHours?: number })?.sessionHours) || 12;
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const res = NextResponse.json({ ok: true, user: { id: user.id, name: user.name, role: user.role } });
  res.cookies.set(COOKIE, await createToken(user.id, hours), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: hours * 3600,
  });
  return res;
}
