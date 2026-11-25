import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { runTool } from "@/lib/agent-tools";
import { dispatchNextStep, type CrewPlan } from "@/lib/crew";
import { crewUserContext, unauthorized, verifyCrewCallback } from "@/lib/crew-internal";
import { prisma } from "@/lib/prisma";
import { listProjectFiles } from "@/lib/project-files";
import { templateFile } from "@/lib/crew-templates";
import type { SessionUser } from "@/lib/auth";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ runId: string }> };

const bodySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("step"),
    stepKey: z.string().min(1).max(80),
    status: z.enum(["DONE", "FAILED"]),
    note: z.string().max(8000).optional(),
    files: z.array(z.string().max(200)).max(60).optional(),
    sessionId: z.string().max(200).optional(),
    parentId: z.string().max(200).optional(),
    model: z.string().max(200).optional(),
    durationMs: z.number().int().min(0).optional(),
    error: z.string().max(500).optional(),
  }),
  z.object({
    type: z.literal("complete"),
    status: z.enum(["DONE", "FAILED"]),
    summary: z.string().max(1000).optional(),
  }),
]);

type TaskResult = { id: string; code: string; title: string };

async function taskCodeFor(action: { id: string; result: unknown }, runToolArgs: unknown, ctx: { user: SessionUser; projectId: string; employeeId: string }) {
  const saved = action.result as TaskResult | null;
  if (saved?.code) return saved.code;
  const result = await runTool("create_task", runToolArgs, ctx);
  if (!result.ok) throw new Error(result.error);
  const created = JSON.parse(result.data) as TaskResult;
  await prisma.crewRunAction.update({
    where: { id: action.id },
    data: { result: created, finishedAt: new Date() },
  });
  return created.code;
}

export async function POST(req: NextRequest, ctx: Ctx) {
  if (!verifyCrewCallback(req)) return unauthorized();
  const { runId } = await ctx.params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }, { status: 400 });
  }
  const body = parsed.data;
  const run = await prisma.crewRun.findUnique({
    where: { id: runId },
    include: { actions: { orderBy: { seq: "asc" } } },
  });
  if (!run) return NextResponse.json({ error: "Crew run tidak ditemukan." }, { status: 404 });
  if (run.status !== "RUNNING") return NextResponse.json({ ok: true, skipped: run.status });

  const user = await crewUserContext(run.createdById);
  const plan = run.plan as unknown as CrewPlan;

  if (body.type === "step") {
    const step = plan.steps.find((s) => s.key === body.stepKey);
    if (!step) return NextResponse.json({ error: `Step ${body.stepKey} tidak ada dalam plan.` }, { status: 400 });

    await prisma.crewRunStep.upsert({
      where: { runId_stepKey: { runId, stepKey: body.stepKey } },
      create: {
        runId, stepKey: body.stepKey, agentId: step.key,
        sessionId: body.sessionId ?? null, parentId: body.parentId ?? null, model: body.model ?? null,
        status: body.status, note: body.note ?? null, error: body.error ?? null,
        files: body.files ?? [], durationMs: body.durationMs ?? null,
        finishedAt: new Date(),
      },
      update: {
        sessionId: body.sessionId ?? null, parentId: body.parentId ?? null, model: body.model ?? null,
        status: body.status, note: body.note ?? null, error: body.error ?? null,
        files: body.files ?? [], durationMs: body.durationMs ?? null,
        finishedAt: new Date(),
      },
    });

    const toolCtx = { user, projectId: run.projectId, employeeId: step.employeeId };
    const employeeActions = run.actions.filter((a) => a.employeeId === step.employeeId);

    if (body.status === "FAILED") {
      for (const action of employeeActions) {
        if (action.status === "DONE") continue;
        await prisma.crewRunAction.update({
          where: { id: action.id },
          data: { status: "ERROR", error: body.error || "Subagent OpenCode gagal.", finishedAt: new Date() },
        });
      }
      after(async () => {
        // dispatchNextStep yang memutuskan retry untuk timeout atau finalisasi gagal.
        await dispatchNextStep(runId);
      });
      return NextResponse.json({ ok: true, stepKey: body.stepKey, status: "FAILED" });
    }

    let taskCode = "";
    for (const action of employeeActions.filter((a) => a.kind === "task")) {
      if (action.status === "DONE" && (action.result as TaskResult | null)?.code) {
        taskCode = (action.result as TaskResult).code;
        continue;
      }
      try {
        taskCode = await taskCodeFor(action, action.payload, toolCtx);
        await prisma.crewRunAction.update({
          where: { id: action.id },
          data: { status: "DONE", error: null, finishedAt: new Date() },
        });
      } catch (e) {
        await prisma.crewRunAction.update({
          where: { id: action.id },
          data: { status: "ERROR", error: (e as Error).message.slice(0, 500), finishedAt: new Date() },
        });
        return NextResponse.json({ ok: true, stepKey: body.stepKey, status: "FAILED", error: (e as Error).message });
      }
    }

    for (const action of employeeActions.filter((a) => a.kind === "note")) {
      if (action.status === "DONE") continue;
      if (!taskCode) {
        await prisma.crewRunAction.update({
          where: { id: action.id },
          data: { status: "ERROR", error: "Tugas untuk catatan tidak ditemukan.", finishedAt: new Date() },
        });
        continue;
      }
      const payload = action.payload as { body?: string };
      const note = (body.note || payload.body || step.note).slice(0, 6000);
      const result = await runTool("post_task_note", { task: taskCode, body: note }, toolCtx);
      await prisma.crewRunAction.update({
        where: { id: action.id },
        data: result.ok
          ? { status: "DONE", error: null, result: JSON.parse(result.data), finishedAt: new Date() }
          : { status: "ERROR", error: result.error, finishedAt: new Date() },
      });
    }

    const committed = new Set(body.files ?? []);
    for (const action of employeeActions.filter((a) => a.kind === "file")) {
      if (action.status === "DONE") continue;
      const payload = action.payload as { path: string };
      let saved: unknown = { path: payload.path, at: new Date().toISOString() };
      if (!committed.has(payload.path)) {
        const result = await runTool("write_project_file", {
          path: payload.path, content: templateFile(payload.path, plan.brief),
        }, toolCtx);
        if (!result.ok) {
          await prisma.crewRunAction.update({
            where: { id: action.id },
            data: { status: "ERROR", error: result.error, finishedAt: new Date() },
          });
          continue;
        }
        saved = JSON.parse(result.data);
      }
      await prisma.crewRunAction.update({
        where: { id: action.id },
        data: { status: "DONE", error: null, result: saved as never, finishedAt: new Date() },
      });
    }

    after(async () => {
      await dispatchNextStep(runId);
    });
    return NextResponse.json({ ok: true, stepKey: body.stepKey, status: "DONE" });
  }

  const actions = await prisma.crewRunAction.findMany({ where: { runId }, orderBy: { seq: "asc" } });
  const done = actions.filter((a) => a.status === "DONE").length;
  const failed = actions.filter((a) => a.status === "ERROR").length;
  const finalStatus = body.status === "FAILED" || failed > 0 ? "FAILED" : "DONE";

  if (finalStatus === "FAILED") {
    await prisma.crewRunAction.updateMany({
      where: { runId, status: "PENDING" },
      data: { status: "SKIPPED", error: "Crew dihentikan karena step sebelumnya gagal.", finishedAt: new Date() },
    });
  }

  const files = await listProjectFiles(run.projectId);
  const summary = body.summary || `Selesai ${done} aksi, ${failed} gagal, ${files.length} file di proyek. (OpenCode subagent)`;
  await prisma.crewRun.update({
    where: { id: runId },
    data: { status: finalStatus, summary, finishedAt: new Date() },
  });

  const conversation = await prisma.conversation.findFirst({
    where: { projectId: run.projectId, type: "PROJECT" }, select: { id: true },
  });
  if (conversation) {
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        body: `${finalStatus === "DONE" ? "Crew selesai" : "Crew terhenti"}: ${summary}\n\nKaryawan berjalan berurutan lewat OpenCode subagent: ${plan.steps.map((s) => s.name).join(" → ")}.`,
        generatedByAi: true,
      },
    });
  }

  return NextResponse.json({ ok: true, status: finalStatus, done, failed });
}
