import { prisma } from "./prisma";
import type { NotificationType } from "@prisma/client";

/** Kirim notifikasi ke user terkait (founder + user dari karyawan terkait), dengan menghormati preferensi. */
export async function notify(opts: {
  type: NotificationType; title: string; body?: string; link?: string;
  employeeIds?: string[]; actorUserId?: string; includeFounders?: boolean;
}) {
  const settings = await prisma.companySettings.findUnique({ where: { id: 1 } });
  const prefs = (settings?.notificationPrefs ?? {}) as Record<string, boolean>;
  if (prefs[opts.type] === false) return;
  const users = await prisma.user.findMany({
    where: {
      active: true,
      OR: [
        ...(opts.includeFounders === false ? [] : [{ role: "FOUNDER" as const }]),
        ...(opts.employeeIds?.length ? [{ employeeId: { in: opts.employeeIds } }] : []),
      ],
      ...(opts.actorUserId ? { NOT: { id: opts.actorUserId } } : {}),
    },
    select: { id: true },
  });
  if (!users.length) return;
  await prisma.notification.createMany({
    data: users.map((u) => ({ userId: u.id, type: opts.type, title: opts.title, body: opts.body ?? "", link: opts.link })),
  });
}

/** Buat notifikasi "tugas terlambat" satu kali per tugas. */
export async function syncOverdue() {
  const overdue = await prisma.task.findMany({
    where: { deadline: { lt: new Date() }, status: { notIn: ["COMPLETED"] } },
    include: { assignees: { select: { employeeId: true } } },
  });
  for (const t of overdue) {
    const link = `/tasks?open=${t.id}`;
    const exists = await prisma.notification.findFirst({ where: { type: "TASK_OVERDUE", link } });
    if (exists) continue;
    await notify({ type: "TASK_OVERDUE", title: `Tugas terlambat: ${t.title}`, body: `${t.code} melewati deadline.`, link, employeeIds: t.assignees.map((a) => a.employeeId) });
  }
}

export async function logActivity(message: string, type: string, employeeId?: string | null, link?: string) {
  await prisma.activityLog.create({ data: { message, type, employeeId: employeeId ?? null, link } });
}
