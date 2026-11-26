import { notFound } from "next/navigation";
import { PluginRenderer } from "@/components/plugins/plugin-renderer";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getPlugin } from "@/lib/plugins/registry";
import { isPluginEnabled } from "@/lib/plugins/store";

export const dynamic = "force-dynamic";

export default async function PluginPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const manifest = getPlugin(slug);
  if (!manifest || !(await isPluginEnabled(slug))) notFound();
  const user = await getSession();
  if (!user || !(await Promise.all(manifest.permissions.map((perm) => can(user.role, perm)))).every(Boolean)) notFound();
  return <PluginRenderer id={slug} />;
}
