import { route } from "@/lib/api";
import { listPlugins } from "@/lib/plugins/store";

/** Daftar plugin beserta status aktifnya. */
export const GET = route("settings.read", async () => ({ plugins: await listPlugins() }));
