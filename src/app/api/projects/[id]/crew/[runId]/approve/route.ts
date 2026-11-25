import { route } from "@/lib/api";
import { executeCrewRun } from "@/lib/crew";

export const maxDuration = 30;

/** Satu klik menyetujui seluruh paket aksi: tugas, catatan, dan file kode. */
export const POST = route("projects.write", async (_req, { params, user }) => {
  return executeCrewRun({ runId: params.runId, user });
});
