import { route } from "@/lib/api";
import { listPlugins } from "@/lib/plugins/store";

/** Daftar plugin beserta status aktifnya. Metadata plugin aman dibaca semua user yang login. */
export const GET = route(null, async () => ({ plugins: await listPlugins() }));
