import { prisma } from "@/lib/prisma";
import { getPlugin, mergePluginStates } from "./registry";
import type { PluginView } from "./types";

/** Status plugin yang tersimpan, key = plugin id. */
export async function savedPluginStates(): Promise<Record<string, boolean>> {
  const rows = await prisma.pluginSetting.findMany({ select: { pluginId: true, enabled: true } });
  return Object.fromEntries(rows.map((r) => [r.pluginId, r.enabled]));
}

/** Semua plugin yang dikenal beserta status aktifnya. */
export async function listPlugins(): Promise<PluginView[]> {
  return mergePluginStates(await savedPluginStates());
}

export async function enabledPlugins(): Promise<PluginView[]> {
  return (await listPlugins()).filter((p) => p.enabled);
}

export async function isPluginEnabled(id: string): Promise<boolean> {
  const manifest = getPlugin(id);
  if (!manifest) return false;
  const row = await prisma.pluginSetting.findUnique({ where: { pluginId: id }, select: { enabled: true } });
  return row?.enabled ?? manifest.defaultEnabled;
}

/** Mengubah status aktif. Mengembalikan false jika plugin tidak dikenal. */
export async function setPluginEnabled(id: string, enabled: boolean): Promise<boolean> {
  if (!getPlugin(id)) return false;
  await prisma.pluginSetting.upsert({
    where: { pluginId: id },
    create: { pluginId: id, enabled },
    update: { enabled },
  });
  return true;
}
