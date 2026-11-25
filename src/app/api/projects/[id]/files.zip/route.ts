import JSZip from "jszip";
import { route } from "@/lib/api";
import { listProjectFiles } from "@/lib/project-files";

export const maxDuration = 120;

/** Unduh seluruh source hasil kerja crew sebagai ZIP, siap diekstrak dan dijalankan. */
export const GET = route("projects.read", async (_req, { params }) => {
  const files = await listProjectFiles(params.id);
  const zip = new JSZip();
  const root = "portfolio";
  for (const file of files) zip.file(`${root}/${file.path}`, file.content);
  zip.file(`${root}/FILE-MANIFEST.json`, JSON.stringify({
    generatedBy: "Annas AI Studio — Crew",
    generatedAt: new Date().toISOString(),
    files: files.map((f) => ({ path: f.path, version: f.version, author: f.author, updatedAt: f.updatedAt })),
  }, null, 2));
  const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return new Response(new Uint8Array(bytes) as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="portfolio-${params.id.slice(0, 8)}.zip"`,
      "Cache-Control": "no-store",
    },
  });
});
