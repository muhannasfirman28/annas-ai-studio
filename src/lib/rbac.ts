import { prisma } from "./prisma";
import type { UserRole } from "@prisma/client";

let cache: { at: number; map: Record<string, string[]> } | null = null;

export async function permissionsFor(role: UserRole): Promise<string[]> {
  if (!cache || Date.now() - cache.at > 15000) {
    const rows = await prisma.role.findMany();
    cache = { at: Date.now(), map: Object.fromEntries(rows.map((r) => [r.key, r.permissions])) };
  }
  return cache.map[role] ?? [];
}
export function invalidatePermissions() { cache = null; }

export async function can(role: UserRole, perm: string) {
  if (role === "FOUNDER") return true;
  const p = await permissionsFor(role);
  return p.includes("*") || p.includes(perm);
}

export const ALL_PERMISSIONS = [
  "employees.read", "employees.write", "tasks.read", "tasks.write", "tasks.delete", "tasks.update_own",
  "projects.read", "projects.write", "reports.read", "reports.write", "reports.write_own", "chat.use",
  "settings.read", "settings.write", "users.manage",
];
