import { z } from "zod";
import { route, json } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createCrewRun } from "@/lib/crew";

export const maxDuration = 300;

/** Rencana crew untuk satu proyek. Satu kali setujui, lalu semua karyawan jalan berurutan. */
export const GET = route("projects.read", async (_req, { params }) => {
  const runs = await prisma.crewRun.findMany({
    where: { projectId: params.id }, orderBy: { createdAt: "desc" }, take: 10,
    select: { id: true, status: true, summary: true, createdAt: true, finishedAt: true, _count: { select: { actions: true } } },
  });
  return { runs };
});

export const POST = route("projects.write", async (req, { params, user }) => {
  const { brief } = z.object({ brief: z.string().min(10).max(8000) }).parse(await json(req));
  const run = await createCrewRun({ projectId: params.id, brief, user });
  return {
    run: {
      id: run.id, status: run.status, summary: run.summary,
      plan: run.plan, actions: run.actions.map((a) => ({
        id: a.id, seq: a.seq, kind: a.kind, target: a.target, employeeId: a.employeeId,
      })),
    },
  };
});
