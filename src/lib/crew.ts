import { prisma } from "./prisma";
import { chatCompletion, llmConfigured } from "./llm";
import { runTool } from "./agent-tools";
import { templateFile } from "./crew-templates";
import { listProjectFiles, readProjectFile } from "./project-files";
import { crewEngine, runCrewStepOnWorker, startCrewOnWorker } from "./crew-client";
import {
  CREW_PRESET_LABEL, detectPreset, rolesForBrief,
  type CrewPreset,
} from "./crew-presets";
import type { SessionUser } from "./auth";

/** Orkestrator crew: satu karyawan selesai -> otomatis lanjut ke karyawan berikutnya. */

export type CrewPlan = {
  brief: string;
  preset: CrewPreset;
  steps: {
    key: string; name: string; title: string; focus: string;
    employeeId: string; task: string; description: string; files: string[]; note: string;
  }[];
  totalFiles: number;
};

function extractJson(text: string): unknown | null {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { return null; }
}

async function llmAnswer(cfg: any, system: string, prompt: string, deadline = 0): Promise<string | null> {
  if (!llmConfigured() || !cfg?.enabled || (deadline && Date.now() > deadline)) return null;
  try {
    const text = await chatCompletion({
      provider: cfg.provider, model: cfg.model, system, temperature: cfg.temperature ?? 0.4,
      timeoutMs: 20000, attempts: 1,
      messages: [{ role: "user", content: prompt }],
    });
    return text?.trim() || null;
  } catch {
    return null;
  }
}

export async function buildCrewPlan(brief: string): Promise<CrewPlan> {
  const roles = rolesForBrief(brief);
  const preset = detectPreset(brief);
  const names = roles.map((r) => r.name);
  const employees = await prisma.employee.findMany({
    where: { name: { in: names } }, select: { id: true, name: true },
  });
  const byName = new Map(employees.map((e) => [e.name, e.id]));
  const missing = names.filter((n) => !byName.has(n));
  if (missing.length) throw new Error(`Karyawan tidak ditemukan di database: ${missing.join(", ")}. Jalankan seed dulu.`);
  const steps = roles.map((r) => ({
    key: r.key, name: r.name, title: r.title, focus: r.focus,
    employeeId: byName.get(r.name)!, task: r.task, description: r.description,
    files: r.files.map((f) => f.path), note: r.note,
  }));
  return { brief, preset, steps, totalFiles: roles.reduce((n, r) => n + r.files.length, 0) };
}

/** Buang file dari crew run sebelumnya yang tidak dipakai rencana baru (mis. portfolio lama). */
async function removeStaleCrewFiles(runId: string) {
  const run = await prisma.crewRun.findUnique({
    where: { id: runId },
    select: { projectId: true, createdAt: true, actions: { select: { payload: true } } },
  });
  if (!run) return;
  const nextPaths = new Set(
    run.actions
      .map((a) => (a.payload as { path?: unknown })?.path)
      .filter((path): path is string => typeof path === "string"),
  );
  const previous = await prisma.crewRun.findFirst({
    where: { projectId: run.projectId, id: { not: runId }, createdAt: { lt: run.createdAt } },
    orderBy: { createdAt: "desc" },
    select: { plan: true },
  });
  const previousPaths = ((previous?.plan as { steps?: { files?: string[] }[] } | undefined)?.steps ?? [])
    .flatMap((step) => step.files ?? []);
  const stale = [...new Set(previousPaths)].filter((path) => !nextPaths.has(path));
  if (stale.length) {
    await prisma.projectFile.deleteMany({ where: { projectId: run.projectId, path: { in: stale } } });
  }
}

export async function createCrewRun(input: { projectId: string; brief: string; user: SessionUser }) {
  const brief = input.brief.trim();
  if (brief.length < 10) throw new Error("Brief terlalu singkat. Jelaskan website yang ingin dibuat (minimal 10 karakter).");
  if (brief.length > 8000) throw new Error("Brief terlalu panjang (maksimal 8000 karakter).");
  const project = await prisma.project.findUnique({ where: { id: input.projectId }, select: { id: true, name: true } });
  if (!project) throw new Error("Proyek tidak ditemukan.");
  const plan = await buildCrewPlan(brief);
  const roles = rolesForBrief(brief);

  const actions: { seq: number; kind: string; tool: string; target: string; employeeId: string; payload: any }[] = [];
  let seq = 0;
  for (const step of plan.steps) {
    const role = roles.find((r) => r.name === step.name)!;
    actions.push({
      seq: ++seq, kind: "task", tool: "create_task", target: step.task, employeeId: step.employeeId,
      payload: {
        title: step.task, description: `${step.description}\n\nBrief proyek:\n${brief.slice(0, 1500)}`,
        priority: role.priority, project: project.name, assignees: [step.name],
      },
    });
    actions.push({
      seq: ++seq, kind: "note", tool: "post_task_note", target: step.task, employeeId: step.employeeId,
      payload: { taskRef: step.task, body: `${step.note}\n\nFokus ${step.name}: ${step.focus}.` },
    });
    for (const file of role.files) {
      actions.push({
        seq: ++seq, kind: "file", tool: "write_project_file", target: file.path, employeeId: step.employeeId,
        payload: { path: file.path, purpose: file.purpose },
      });
    }
  }

  const run = await prisma.crewRun.create({
    data: {
      projectId: input.projectId, brief, status: "PLANNED", plan: plan as any,
      summary: `${CREW_PRESET_LABEL[plan.preset]} · ${plan.steps.length} karyawan · ${plan.totalFiles} file · ${actions.length} aksi`,
      createdById: input.user.id,
      actions: { create: actions },
    },
    include: { actions: { orderBy: { seq: "asc" } } },
  });
  return run;
}

/** Jalankan seluruh paket lewat panggilan LLM langsung (fallback/rollback). */
async function executeCrewRunDirect(input: { runId: string; user: SessionUser }) {
  const run = await prisma.crewRun.findUnique({
    where: { id: input.runId },
    include: { project: { select: { id: true, name: true } }, actions: { orderBy: { seq: "asc" } } },
  });
  if (!run) throw new Error("Crew run tidak ditemukan.");
  if (run.status !== "PLANNED" && run.status !== "APPROVED") throw new Error(`Crew run sudah berstatus ${run.status} dan tidak bisa dijalankan ulang.`);
  await removeStaleCrewFiles(run.id);

  await prisma.crewRun.update({
    where: { id: run.id },
    data: { status: "RUNNING", approvedById: input.user.id, approvedAt: new Date(), startedAt: new Date() },
  });

  const ctx = { user: input.user, projectId: run.projectId };
  const plan = run.plan as unknown as CrewPlan;
  const roles = rolesForBrief(plan.brief);
  const tasksByTitle = new Map<string, { id: string; code: string }>();
  let done = 0; let failed = 0; let lastError = "";
  const started = Date.now();
  // Sisakan waktu untuk finalisasi DB meski provider LLM lambat: setelah ini semua file pakai template.
  const deadline = started + 240_000;

  try {
    for (const step of plan.steps) {
      const role = roles.find((r) => r.name === step.name)!;
      const cfg = await prisma.aiAgentConfiguration.findUnique({ where: { employeeId: step.employeeId } });
      const prior = await listProjectFiles(run.projectId);
      const context = prior.slice(0, 10).map((f) => `${f.path} (${f.content.length} karakter)`).join(", ") || "belum ada file";
      const fileActions = run.actions.filter((a) => a.employeeId === step.employeeId && a.kind === "file");
      const specs = fileActions.map((a) => {
        const p = a.payload as { path: string; purpose: string };
        return { path: p.path, purpose: p.purpose };
      });
      let generatedNote = "";
      const generatedFiles: Record<string, string> = {};

      // Satu panggilan LLM per karyawan: menghasilkan catatan + semua file bagiannya.
      const generated = await llmAnswer(cfg,
        `${cfg?.systemPrompt ?? ""}\nKamu sedang mengerjakan SATU tahap proyek. Balas HANYA JSON valid tanpa markdown dan tanpa penjelasan: {"note":"catatan deliverable maksimal 1200 karakter","files":[{"path":"...","content":"isi file lengkap"}]}. Gunakan array hanya untuk files. Escape newline sebagai \\n. Jangan memakai awalan TOOL:.`,
        `Brief website:\n${plan.brief.slice(0, 3000)}\n\nPeranmu: ${step.title} — ${step.focus}.\nTugasmu: ${step.task}.\nFile yang harus dibuat (path → tujuan):\n${specs.map((s) => `- ${s.path}: ${s.purpose}`).join("\n") || "- tidak ada file"}\nFile dari karyawan sebelumnya: ${context}.\nTulis catatan dan seluruh file yang menjadi bagianmu. Kode TypeScript/TSX harus valid dan bisa di-build. Teks UI dalam Bahasa Indonesia.`, deadline);
      const parsed = generated ? extractJson(generated) as { note?: unknown; files?: unknown } | null : null;
      if (typeof parsed?.note === "string" && parsed.note.length > 10) generatedNote = parsed.note;
      if (Array.isArray(parsed?.files)) {
        for (const f of parsed.files as { path?: unknown; content?: unknown }[]) {
          if (typeof f?.path === "string" && typeof f?.content === "string" && f.content.length > 20) generatedFiles[f.path] = f.content;
        }
      }

      for (const action of run.actions.filter((a) => a.employeeId === step.employeeId)) {
        await prisma.crewRunAction.update({ where: { id: action.id }, data: { status: "PENDING", error: null } });

        let args: Record<string, unknown> = action.payload as Record<string, unknown>;
        try {
          if (action.kind === "task") {
            const result = await runTool("create_task", args, { ...ctx, employeeId: step.employeeId });
            if (!result.ok) throw new Error(result.error);
            const created = JSON.parse(result.data) as { id: string; code: string; title: string };
            tasksByTitle.set(action.target, { id: created.id, code: created.code });
          } else if (action.kind === "note") {
            const task = tasksByTitle.get(String(args.taskRef ?? action.target));
            if (!task) throw new Error(`Tugas untuk catatan ${step.name} tidak ditemukan.`);
            const body = (generatedNote || String(args.body)).slice(0, 6000);
            const result = await runTool("post_task_note", { task: task.code, body }, { ...ctx, employeeId: step.employeeId });
            if (!result.ok) throw new Error(result.error);
          } else if (action.kind === "file") {
            const payload = args as { path: string; purpose: string };
            const content = generatedFiles[payload.path] || templateFile(payload.path, plan.brief, plan.preset ?? detectPreset(plan.brief));
            const result = await runTool("write_project_file", { path: payload.path, content }, { ...ctx, employeeId: step.employeeId });
            if (!result.ok) throw new Error(result.error);
          }

          await prisma.crewRunAction.update({
            where: { id: action.id },
            data: { status: "DONE", result: { at: new Date().toISOString() }, finishedAt: new Date() },
          });
          done++;
        } catch (e) {
          const message = (e instanceof Error ? e.message : String(e)).slice(0, 500);
          await prisma.crewRunAction.update({
            where: { id: action.id }, data: { status: "ERROR", error: message, finishedAt: new Date() },
          });
          failed++; lastError = `${step.name}: ${message}`;
          throw e;
        }
      }
    }
  } catch {
    // rantai dihentikan supaya karyawan berikutnya tidak bekerja di atas hasil yang rusak.
  }

  const files = await listProjectFiles(run.projectId);
  const summary = `Selesai ${done} aksi, ${failed} gagal, ${files.length} file di proyek.${lastError ? ` Terhenti pada ${lastError}` : ""} (${Math.round((Date.now() - started) / 1000)} detik)`;
  await prisma.crewRun.update({
    where: { id: run.id },
    data: {
      status: failed ? "FAILED" : "DONE", summary, finishedAt: new Date(),
    },
  });

  const conversation = await prisma.conversation.findFirst({ where: { projectId: run.projectId, type: "PROJECT" }, select: { id: true } });
  if (conversation) {
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        body: `${failed ? "Crew terhenti" : "Crew selesai"}: ${summary}\n\nKaryawan berjalan berurutan: ${plan.steps.map((s) => s.name).join(" → ")}.`,
        generatedByAi: true,
      },
    });
  }

  return { status: failed ? "FAILED" : "DONE", summary, files: files.map((f) => f.path), done, failed, error: lastError || null };
}

/** Kirim paket ke Crew Worker. Worker yang menjalankan delapan subagent OpenCode secara berurutan. */
async function dispatchCrewRun(input: { runId: string; user: SessionUser }) {
  const run = await prisma.crewRun.findUnique({
    where: { id: input.runId },
    include: { project: { select: { id: true, name: true } }, actions: { orderBy: { seq: "asc" } } },
  });
  if (!run) throw new Error("Crew run tidak ditemukan.");
  if (run.status !== "PLANNED" && run.status !== "APPROVED") {
    throw new Error(`Crew run sudah berstatus ${run.status} dan tidak bisa dijalankan ulang.`);
  }
  await removeStaleCrewFiles(run.id);

  const plan = run.plan as unknown as CrewPlan;
  const fileActions = run.actions.filter((a) => a.kind === "file");

  await prisma.crewRun.update({
    where: { id: run.id },
    data: { status: "RUNNING", approvedById: input.user.id, approvedAt: new Date(), startedAt: new Date() },
  });

  try {
    // Satu invoke worker = satu karyawan. Step berikutnya dipicu oleh callback.
    await dispatchNextStep(run.id);
    return {
      status: "RUNNING" as const,
      summary: `Crew berjalan per-step di OpenCode: ${plan.steps.length} karyawan · ${fileActions.length} file.`,
      files: fileActions.map((a) => (a.payload as { path: string }).path),
      done: 0, failed: 0, error: null,
    };
  } catch (e) {
    const message = (e instanceof Error ? e.message : String(e)).slice(0, 500);
    await prisma.crewRun.update({
      where: { id: run.id },
      data: { status: "FAILED", summary: `Gagal memulai Crew Worker: ${message}`, finishedAt: new Date() },
    });
    throw e;
  }
}

const STALE_STEP_MS = 6 * 60_000;

/** Ambil dan kirim satu step ke worker. Dipanggil setelah approve, callback, atau saat poll mendeteksi step macet. */
export async function dispatchNextStep(runId: string) {
  const run = await prisma.crewRun.findUnique({
    where: { id: runId },
    include: { project: { select: { id: true, name: true } }, actions: { orderBy: { seq: "asc" } } },
  });
  if (!run || run.status !== "RUNNING") return { ok: true, skipped: true };

  const plan = run.plan as unknown as CrewPlan;
  const configs = await prisma.aiAgentConfiguration.findMany({
    where: { employeeId: { in: plan.steps.map((s) => s.employeeId) } },
  });
  const configByEmployee = new Map(configs.map((c) => [c.employeeId, c]));
  const stepRows = await prisma.crewRunStep.findMany({
    where: { runId },
    select: { stepKey: true, status: true, startedAt: true, error: true, attempts: true },
  });
  const byKey = new Map(stepRows.map((s) => [s.stepKey, s]));
  const now = Date.now();

  for (const step of plan.steps) {
    const row = byKey.get(step.key);
    if (row?.status === "DONE") continue;

    if (row?.status === "FAILED") {
      const retryable = /timeout|fetch failed|worker dihentikan|gagal mengambil file|gagal menyimpan file|subagent opencode/i.test(row.error || "");
      if (retryable && (row.attempts || 0) < 5) {
        await prisma.crewRunStep.updateMany({
          where: { runId, stepKey: step.key, status: "FAILED" },
          data: { status: "PENDING", error: null, finishedAt: null },
        });
        row.status = "PENDING";
      } else {
        await finalizeCrewRun(runId, "FAILED", row.error || `Step ${step.name} gagal.`);
        return { ok: true, finalized: true };
      }
    }

    if (row?.status === "RUNNING") {
      if (!row.startedAt || now - row.startedAt.getTime() < STALE_STEP_MS) {
        return { ok: true, waiting: true, stepKey: step.key };
      }
      // Worker mati di tengah step; tidak ada callback. Reset supaya dijalankan ulang.
      await prisma.crewRunStep.updateMany({
        where: { runId, stepKey: step.key, status: "RUNNING" },
        data: { status: "PENDING", startedAt: new Date() },
      });
    }

    await prisma.crewRunStep.upsert({
      where: { runId_stepKey: { runId, stepKey: step.key } },
      create: { runId, stepKey: step.key, agentId: step.key, status: "PENDING" },
      update: {},
    });

    const claimed = await prisma.crewRunStep.updateMany({
      where: { runId, stepKey: step.key, status: "PENDING" },
      data: { status: "RUNNING", startedAt: new Date(), error: null, attempts: { increment: 1 } },
    });
    if (claimed.count === 0) continue;

    const cfg = configByEmployee.get(step.employeeId);
    const files = run.actions
      .filter((a) => a.kind === "file" && a.employeeId === step.employeeId)
      .map((a) => {
        const payload = a.payload as { path: string; purpose?: string };
        return { path: payload.path, purpose: payload.purpose ?? "" };
      });

    await runCrewStepOnWorker({
      runId,
      brief: plan.brief,
      projectName: run.project.name,
      step: {
        key: step.key,
        name: step.name,
        title: step.title,
        focus: step.focus,
        task: step.task,
        description: step.description,
        note: step.note,
        employeeId: step.employeeId,
        files,
      },
      agent: {
        employeeId: step.employeeId,
        name: step.name,
        model: cfg?.model || "meta/llama-3.2-11b-vision-instruct",
        systemPrompt: cfg?.systemPrompt || "",
        enabled: cfg?.enabled ?? false,
      },
      files: run.actions
        .filter((a) => a.kind === "file")
        .map((a) => (a.payload as { path: string }).path),
    });

    return { ok: true, dispatched: step.key };
  }

  await finalizeCrewRun(runId, "DONE");
  return { ok: true, finalized: true };
}

/** Tutup crew run sekali saja, apa pun yang memanggilnya. */
export async function finalizeCrewRun(runId: string, forcedStatus?: "DONE" | "FAILED", error?: string) {
  const run = await prisma.crewRun.findUnique({
    where: { id: runId },
    include: { project: { select: { id: true } }, actions: { orderBy: { seq: "asc" } } },
  });
  if (!run || run.status !== "RUNNING") return { ok: true, skipped: true };

  const done = run.actions.filter((a) => a.status === "DONE").length;
  const failed = run.actions.filter((a) => a.status === "ERROR").length;
  const failedSteps = await prisma.crewRunStep.count({ where: { runId, status: "FAILED" } });
  const status: "DONE" | "FAILED" = forcedStatus === "FAILED" || failed > 0 || failedSteps > 0 ? "FAILED" : "DONE";
  const seconds = Math.round((Date.now() - (run.startedAt?.getTime() || Date.now())) / 1000);
  const files = await listProjectFiles(run.projectId);

  if (status === "FAILED") {
    await prisma.crewRunAction.updateMany({
      where: { runId, status: "PENDING" },
      data: {
        status: "SKIPPED",
        error: error || "Crew dihentikan karena step sebelumnya gagal.",
        finishedAt: new Date(),
      },
    });
  }

  const summary = error
    ? `Crew OpenCode terhenti: ${error} (${seconds} detik)`
    : `Crew OpenCode ${status === "DONE" ? "selesai" : "terhenti"} dalam ${seconds} detik: ${done} aksi, ${failed} gagal, ${files.length} file di proyek.`;

  const claimed = await prisma.crewRun.updateMany({
    where: { id: runId, status: "RUNNING" },
    data: { status, summary, finishedAt: new Date() },
  });
  if (claimed.count === 0) return { ok: true, skipped: true };

  const plan = run.plan as unknown as CrewPlan;
  const conversation = await prisma.conversation.findFirst({
    where: { projectId: run.projectId, type: "PROJECT" }, select: { id: true },
  });
  if (conversation) {
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        body: `${status === "DONE" ? "Crew selesai" : "Crew terhenti"}: ${summary}\n\nKaryawan berjalan berurutan lewat OpenCode subagent: ${plan.steps.map((s) => s.name).join(" → ")}.`,
        generatedByAi: true,
      },
    });
  }

  return { ok: true, status, done, failed };
}

/** Satu klik approve: pilih engine berdasarkan CREW_ENGINE. */
export async function executeCrewRun(input: { runId: string; user: SessionUser }) {
  return crewEngine() === "opencode" ? dispatchCrewRun(input) : executeCrewRunDirect(input);
}

export async function crewStatus(runId: string) {
  const run = await prisma.crewRun.findUnique({
    where: { id: runId },
    include: { actions: { orderBy: { seq: "asc" }, select: { id: true, seq: true, kind: true, target: true, employeeId: true, status: true, error: true, finishedAt: true } } },
  });
  if (!run) throw new Error("Crew run tidak ditemukan.");
  return {
    id: run.id, status: run.status, summary: run.summary, plan: run.plan,
    startedAt: run.startedAt?.toISOString() ?? null, finishedAt: run.finishedAt?.toISOString() ?? null,
    actions: run.actions.map((a) => ({ ...a, error: a.error ?? null, finishedAt: a.finishedAt?.toISOString() ?? null })),
  };
}
