import { readFile } from "node:fs/promises";
import path from "node:path";
import { route, HttpError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const GET = route("tasks.read", async (_r, { params }) => {
  const a = await prisma.taskAttachment.findUnique({ where: { id: params.id } });
  if (!a) throw new HttpError(404, "File tidak ditemukan.");
  const buf = await readFile(path.join(process.cwd(), "uploads", a.storedAs)).catch(() => null);
  if (!buf) throw new HttpError(404, "File tidak ada di penyimpanan.");
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": a.mimeType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(a.filename)}`,
      "X-Content-Type-Options": "nosniff",
    },
  });
});
