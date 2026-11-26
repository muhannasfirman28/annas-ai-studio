/** Nama ikon yang diizinkan untuk plugin. Ditulis eksplisit agar aman untuk TypeScript. */
export type PluginIconName = "Building2";

/** Definisi plugin yang disimpan di kode (bukan dari database). */
export interface PluginManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  route: string;
  icon: PluginIconName;
  permissions: readonly string[];
  defaultEnabled: boolean;
}

/** Manifest yang sudah digabung dengan status aktif dari database. */
export interface PluginView extends PluginManifest {
  enabled: boolean;
}
