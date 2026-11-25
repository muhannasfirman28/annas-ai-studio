/** Helpers untuk endpoint internal yang dipanggil Crew Worker, bukan user browser. */

import type { NextRequest } from "next/server";
import type { SessionUser } from "./auth";
import { prisma } from "./prisma";

export function verifyCrewCallback(req: NextRequest): boolean {
  const expected = process.env.CREW_CALLBACK_TOKEN;
  if (!expected) return false;
  return req.headers.get("authorization") === `Bearer ${expected}`;
}

export async function crewUserContext(createdById: string | null | undefined): Promise<SessionUser> {
  if (createdById) {
    const user = await prisma.user.findUnique({
      where: { id: createdById },
      select: { id: true, name: true, email: true, role: true, employeeId: true, active: true },
    });
    if (user?.active) {
      return { id: user.id, name: user.name, email: user.email, role: user.role, employeeId: user.employeeId };
    }
  }
  return { id: "crew-worker", name: "Crew Worker", email: "crew@local", role: "FOUNDER", employeeId: null };
}

export function unauthorized() {
  return Response.json({ error: "Token crew tidak valid." }, { status: 401 });
}
