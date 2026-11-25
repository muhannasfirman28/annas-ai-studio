import { z } from "zod";
import { route, json, bad } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ALL_PERMISSIONS, invalidatePermissions } from "@/lib/rbac";

export const PATCH = route("users.manage", async (req, { params }) => {
  if (params.key === "FOUNDER") throw bad("Permission Founder tidak dapat diubah.");
  const { permissions } = z.object({ permissions: z.array(z.string()) }).parse(await json(req));
  const clean = permissions.filter((p) => ALL_PERMISSIONS.includes(p));
  const r = await prisma.role.update({ where: { key: params.key as never }, data: { permissions: clean } });
  invalidatePermissions();
  return { role: r };
});
