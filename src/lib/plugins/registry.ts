import type { PluginManifest, PluginView } from "./types";

/**
 * Daftar plugin yang dikenal aplikasi. Hanya metadata — tidak ada kode yang
 * dieksekusi dari sini, sehingga aman dipakai di server maupun client.
 * Untuk menambah plugin: tambahkan manifest di sini + komponen di
 * src/components/plugins/registry.tsx.
 */
export const PLUGINS: readonly PluginManifest[] = [
  {
    id: "office",
    name: "Kantor Virtual",
    description: "Visualisasi animasi tim seolah sedang bekerja di kantor. Gerakan bersifat simulasi visual.",
    version: "1.0.0",
    route: "/plugins/office",
    icon: "Building2",
    permissions: ["employees.read"],
    defaultEnabled: true,
  },
];

export function getPlugin(id: string): PluginManifest | null {
  return PLUGINS.find((p) => p.id === id) ?? null;
}

/** Menggabungkan manifest dengan status tersimpan; fallback ke defaultEnabled. */
export function mergePluginStates(saved: Record<string, boolean>): PluginView[] {
  return PLUGINS.map((p) => ({ ...p, enabled: saved[p.id] ?? p.defaultEnabled }));
}

export function pluginStateMap(plugins: PluginView[]): Record<string, boolean> {
  return Object.fromEntries(plugins.map((p) => [p.id, p.enabled]));
}
