import JSZip from "jszip";
import { route } from "@/lib/api";
import { archiveNameFor } from "@/lib/archive-name";
import { detectPreset, type CrewPreset } from "@/lib/crew-presets";
import { prisma } from "@/lib/prisma";
import { listProjectFiles } from "@/lib/project-files";

export const maxDuration = 120;

/** Unduh seluruh source hasil kerja crew sebagai ZIP, siap diekstrak dan dijalankan. */
export const GET = route("projects.read", async (_req, { params }) => {
  const [files, project, run] = await Promise.all([
    listProjectFiles(params.id),
    prisma.project.findUnique({ where: { id: params.id }, select: { name: true } }),
    prisma.crewRun.findFirst({
      where: { projectId: params.id },
      orderBy: { createdAt: "desc" },
      select: { brief: true, plan: true },
    }),
  ]);
  const brief = run?.brief ?? "";
  const plan = run?.plan as { preset?: CrewPreset } | null;
  const preset = plan?.preset ?? detectPreset(brief);
  const { name, slug: root } = archiveNameFor(brief, project?.name, params.id);

  const zip = new JSZip();
  for (const file of files) zip.file(`${root}/${file.path}`, file.content);
  zip.file(`${root}/FILE-MANIFEST.json`, JSON.stringify({
    generatedBy: "Annas AI Studio — Crew",
    generatedAt: new Date().toISOString(),
    preset,
    name,
    files: files.map((f) => ({ path: f.path, version: f.version, author: f.author, updatedAt: f.updatedAt })),
  }, null, 2));
  const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return new Response(new Uint8Array(bytes) as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${root}.zip"`,
      "Cache-Control": "no-store",
    },
  });
});
