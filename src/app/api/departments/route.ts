import { route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
export const GET = route(null, async () => ({ departments: await prisma.department.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { employees: true } } } }) }));
