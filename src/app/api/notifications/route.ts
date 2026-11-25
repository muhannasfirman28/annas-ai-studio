import { NextRequest } from "next/server";
import { z } from "zod";
import { route, json } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { syncOverdue } from "@/lib/notify";

export const GET = route(null, async (req: NextRequest, { user }) => {
  await syncOverdue();
  const sp = req.nextUrl.searchParams;
  const where = { userId: user.id, ...(sp.get("unread") === "1" ? { read: false } : {}), ...(sp.get("type") ? { type: sp.get("type") as never } : {}) };
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: Number(sp.get("limit")) || 100 }),
    prisma.notification.count({ where: { userId: user.id, read: false } }),
  ]);
  return { notifications: items, unread };
});

export const PATCH = route(null, async (req, { user }) => {
  const d = z.object({ ids: z.array(z.string()).optional(), all: z.boolean().optional(), read: z.boolean().default(true) }).parse(await json(req));
  await prisma.notification.updateMany({ where: { userId: user.id, ...(d.all ? {} : { id: { in: d.ids ?? [] } }) }, data: { read: d.read } });
  return { ok: true };
});
