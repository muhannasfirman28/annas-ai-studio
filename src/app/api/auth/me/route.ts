import { route } from "@/lib/api";
import { permissionsFor } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const GET = route(null, async (_r, { user }) => {
  const [perms, unread, emp] = await Promise.all([
    permissionsFor(user.role),
    prisma.notification.count({ where: { userId: user.id, read: false } }),
    user.employeeId ? prisma.employee.findUnique({ where: { id: user.employeeId }, select: { avatarColor: true, title: true } }) : null,
  ]);
  return { user: { ...user, avatarColor: emp?.avatarColor ?? "#2563eb", title: emp?.title ?? "" }, permissions: user.role === "FOUNDER" ? ["*"] : perms, unread };
});
