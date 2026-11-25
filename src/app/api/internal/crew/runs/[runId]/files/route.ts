import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runTool } from "@/lib/agent-tools";
import { crewUserContext, unauthorized, verifyCrewCallback } from "@/lib/crew-internal";
import { prisma } from "@/lib/prisma";
import { listProjectFiles, MAX_FILE_CHARS, normalizeProjectFilePath } from "@/lib/project-files";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ runId: string }> };

/** Worker mengambil snapshot file proyek sebelum menyusun workspace. */
export async function GET(req: NextRequest, ctx: Ctx) {
  if (!verifyCrewCallback(req)) return unauthorized();
  const { runId } = await ctx.params;
  const run = await prisma.crewRun.findUnique({ where: { id: runId }, select: { projectId: true } });
  if (!run) return NextResponse.json({ error: "Crew run tidak ditemukan." }, { status: 404 });
  const files = await listProjectFiles(run.projectId);
  return NextResponse.json({ files: files.map((f) => ({ path: f.path, content: f.content, version: f.version })) });
}

/** Worker mengcommit file yang berubah dari workspace subagent ke Neon melalui guardrail Studio. */
export async function POST(req: NextRequest, ctx: Ctx) {
  if (!verifyCrewCallback(req)) return unauthorized();
  const { runId } = await ctx.params;
  const body = z.object({
    files: z.array(z.object({
      path: z.string().min(1).max(200),
      content: z.string().max(MAX_FILE_CHARS),
      employeeId: z.string().optional(),
    })).max(60),
  }).safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }, { status: 400 });
  }

  const run = await prisma.crewRun.findUnique({
    where: { id: runId }, select: { projectId: true, createdById: true, status: true },
  });
  if (!run) return NextResponse.json({ error: "Crew run tidak ditemukan." }, { status: 404 });
  if (run.status !== "RUNNING") return NextResponse.json({ error: `Crew run berstatus ${run.status}.` }, { status: 409 });

  // Validasi seluruh path dulu supaya tidak ada commit sebagian karena path ilegal.
  try {
    for (const file of body.data.files) normalizeProjectFilePath(file.path);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const user = await crewUserContext(run.createdById);
  const saved: { path: string; version: number }[] = [];
  for (const file of body.data.files) {
    const result = await runTool("write_project_file", { path: file.path, content: file.content }, {
      user, projectId: run.projectId, employeeId: file.employeeId ?? null,
    });
    if (!result.ok) return NextResponse.json({ error: `${file.path}: ${result.error}`, saved }, { status: 400 });
    saved.push(JSON.parse(result.data) as { path: string; version: number });
  }
  return NextResponse.json({ saved });
}
