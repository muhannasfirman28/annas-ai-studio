import { z } from "zod";
import { bad, json, route } from "@/lib/api";
import { setPluginEnabled } from "@/lib/plugins/store";

const bodySchema = z.object({ enabled: z.boolean() });

/** Mengaktifkan / menonaktifkan plugin berdasarkan manifest yang dikenal. */
export const PATCH = route("settings.write", async (req, { params }) => {
  const { enabled } = bodySchema.parse(await json(req));
  if (!(await setPluginEnabled(params.id, enabled))) throw bad("Plugin tidak ditemukan.");
  return { ok: true };
});
