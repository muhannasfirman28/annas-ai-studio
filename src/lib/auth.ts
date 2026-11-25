import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import type { UserRole } from "@prisma/client";

export const COOKIE = "aas_session";
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || "dev-insecure-secret-change-me-please-32chars");

export type SessionUser = { id: string; name: string; email: string; role: UserRole; employeeId: string | null };

export async function createToken(uid: string, hours = 12) {
  return new SignJWT({ uid }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${hours}h`).sign(secret());
}
export async function verifyToken(token?: string) {
  if (!token) return null;
  try { return (await jwtVerify(token, secret())).payload as { uid: string }; } catch { return null; }
}

export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  const p = await verifyToken(token);
  if (!p) return null;
  const u = await prisma.user.findUnique({ where: { id: p.uid } });
  if (!u || !u.active) return null;
  return { id: u.id, name: u.name, email: u.email, role: u.role, employeeId: u.employeeId };
}
