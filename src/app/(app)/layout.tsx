import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { permissionsFor } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Shell } from "@/components/shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");
  const [perms, emp, settings] = await Promise.all([
    permissionsFor(user.role),
    user.employeeId ? prisma.employee.findUnique({ where: { id: user.employeeId }, select: { avatarColor: true, title: true } }) : null,
    prisma.companySettings.findUnique({ where: { id: 1 }, select: { name: true, logoUrl: true } }),
  ]);
  return (
    <Shell me={{ ...user, avatarColor: emp?.avatarColor ?? "#2563eb", title: emp?.title ?? "" }} permissions={user.role === "FOUNDER" ? ["*"] : perms} brand={{ name: settings?.name ?? "Annas AI Studio", logoUrl: settings?.logoUrl ?? null }}>
      {children}
    </Shell>
  );
}
