import { prisma } from "./prisma";
import { chatCompletion, llmConfigured } from "./llm";
import { runTool } from "./agent-tools";
import { templateFile } from "./crew-templates";
import { listProjectFiles, readProjectFile } from "./project-files";
import type { SessionUser } from "./auth";

/** Orkestrator crew: satu karyawan selesai -> otomatis lanjut ke karyawan berikutnya. */

type FileSpec = { path: string; purpose: string };
type RoleSpec = {
  key: string; name: string; title: string; focus: string;
  task: string; description: string; priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  note: string; files: FileSpec[];
};

const ROLES: RoleSpec[] = [
  {
    key: "annas", name: "Annas", title: "Founder & CEO", focus: "scope, prioritas, dan kriteria selesai",
    task: "Tetapkan scope & prioritas website", description: "Terjemahkan brief menjadi tujuan, batasan Scope, prioritas fitur, dan kriteria selesai.", priority: "HIGH",
    note: "Scope dan prioritas ditetapkan berdasarkan brief. Prioritaskan UI/UX, responsive, navigasi yang berfungsi, then konten dan SEO.", files: [],
  },
  {
    key: "arjun", name: "Arjun", title: "COO", focus: "WBS, urutan kerja, dan tenggat",
    task: "Susun WBS & urutan kerja crew", description: "Uraikan deliverable per divisi dan tentukan urutan eksekusi yang saling bergantung.", priority: "MEDIUM",
    note: "Urutan kerja: Annas (scope) → Arjun (WBS) → Kenji (arsitektur) → Mei Lin (desain) → Hiroshi (halaman) → Min-jun (interaksi) → Aisha (konten/SEO) → Wei Zhang (QA).", files: [
      { path: "README.md", purpose: "Ringkasan proyek, cara menjalankan lokal di port 3001, dan catatan deploy Vercel" },
    ],
  },
  {
    key: "kenji", name: "Kenji", title: "CTO", focus: "arsitektur Next.js App Router dan konfigurasi build",
    task: "Tentukan arsitektur & setup proyek", description: "Pilih struktur App Router, data statis, konfigurasi TypeScript/Tailwind/PostCSS, dan strategi SEO dasar.", priority: "HIGH",
    note: "Arsitektur: App Router, TypeScript strict, Tailwind CSS, data statis di folder data/, metadata di layout, tanpa backend.", files: [
      { path: "package.json", purpose: "Dependensi Next.js, React, TypeScript, Tailwind, Framer Motion, Lucide" },
      { path: "tsconfig.json", purpose: "TypeScript strict + alias @/*" },
      { path: "next.config.mjs", purpose: "Konfigurasi Next.js untuk Vercel" },
      { path: "postcss.config.mjs", purpose: "Plugin Tailwind dan autoprefixer" },
      { path: "tailwind.config.ts", purpose: "Warna navy, typography clean, konten app/components/data" },
    ],
  },
  {
    key: "mei-lin", name: "Mei Lin", title: "UI/UX Designer", focus: "design system hitam/putih/dark navy, spacing, dan motion guideline",
    task: "Buat design system & wireframe 7 section", description: "Tetapkan token visual, tipografi, spacing, state hover/focus, dan guideline animasi subtle.", priority: "HIGH",
    note: "Design system: hitam/putih/dark navy, whitespace proporsional, tipografi clean, animasi 0.4-0.6 detik easOut, hormati prefers-reduced-motion. Hindari neon berlebihan.", files: [
      { path: "app/globals.css", purpose: "Base style Tailwind, smooth scroll, container, kartu" },
      { path: "components/section-heading.tsx", purpose: "Heading section konsisten dengan eyebrow" },
      { path: "components/reveal.tsx", purpose: "Wrapper animasi Framer Motion dengan useReducedMotion" },
      { path: "public/avatar.svg", purpose: "Placeholder foto profesional" },
      { path: "public/project-knowledge-base.svg", purpose: "Thumbnail placeholder Knowledge Base" },
      { path: "public/project-kost.svg", purpose: "Thumbnail placeholder Sistem Informasi Kost" },
    ],
  },
  {
    key: "hiroshi", name: "Hiroshi", title: "Lead Full-Stack Developer", focus: "layout, komponen, dan halaman utama",
    task: "Implementasi layout & section utama", description: "Bangun App Router layout, halaman utama, header/footer navigasi, Hero, About, dan Projects.", priority: "HIGH",
    note: "Implementasi memakai komponen dari Mei Lin dan config dari Kenji. Semua navigation link mengarah ke anchor section yang benar.", files: [
      { path: "app/layout.tsx", purpose: "Root layout + metadata SEO dari data/profile" },
      { path: "app/page.tsx", purpose: "Komposisi 7 section portfolio" },
      { path: "components/site-header.tsx", purpose: "Header responsif dengan navigasi 7 section" },
      { path: "components/site-footer.tsx", purpose: "Footer sederhana" },
      { path: "components/hero.tsx", purpose: "Hero + CTA ke Projects dan Contact" },
      { path: "components/about.tsx", purpose: "Profil, pendidikan, konsentrasi" },
      { path: "components/projects.tsx", purpose: "Showcase project dengan data statis" },
    ],
  },
  {
    key: "min-jun", name: "Min-jun", title: "AI Engineer", focus: "mikro-interaksi ringan dan aksesibilitas gerak",
    task: "Implementasi section interaktif", description: "Bangun Skills, Experience, dan Certifications dengan animasi halus serta dukungan reduced motion.", priority: "MEDIUM",
    note: "Gunakan Reveal dari Mei Lin. Hindari animasi berat; cukup fade/slide 16px dan transisi hover.", files: [
      { path: "components/skills.tsx", purpose: "Grid skill dari data statis" },
      { path: "components/experience.tsx", purpose: "Timeline pengalaman magang" },
      { path: "components/certifications.tsx", purpose: "Daftar sertifikasi" },
    ],
  },
  {
    key: "aisha", name: "Aisha", title: "Data Analyst", focus: "konten profesional, data statis, dan metadata SEO",
    task: "Tulis konten & data profesional", description: "Isi seluruh file data berdasarkan profil Annas Firman dan siapkan metadata/OG.", priority: "HIGH",
    note: "Konten: Annas Firman, S1 Sistem Informasi Universitas Bina Bangsa (E-Business), Full-Stack Web Developer, internship Diskominfo Banten, PHP/Laravel/JS/React/Next.js/MySQL/HTML/CSS/Git, Knowledge Base, Kost + Midtrans. Contact link nyata.", files: [
      { path: "data/profile.ts", purpose: "Profil, summary, pendidikan, dan link kontak nyata" },
      { path: "data/skills.ts", purpose: "Kelompok skill" },
      { path: "data/experience.ts", purpose: "Pengalaman internship" },
      { path: "data/projects.ts", purpose: "Daftar project showcase" },
      { path: "data/certifications.ts", purpose: "Sertifikasi dan pencapaian" },
    ],
  },
  {
    key: "wei", name: "Wei Zhang", title: "QA & Security Engineer", focus: "QA responsif, aksesibilitas, performa, dan link",
    task: "Review QA & keamanan hasil crew", description: "Baca seluruh file yang sudah dibuat, lalu tulis checklist temuan dan perbaikan yang disarankan.", priority: "MEDIUM",
    note: "QA checklist: 7 section hadir, semua link/CTA nyata, reduced motion, kontras teks, layout mobile/tablet/desktop, metadata/OG, tidak ada file .env, tidak ada kredensial, build siap deploy Vercel.", files: [],
  },
];

export type CrewPlan = {
  brief: string;
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

async function llmAnswer(cfg: any, system: string, prompt: string): Promise<string | null> {
  if (!llmConfigured() || !cfg?.enabled) return null;
  try {
    const text = await chatCompletion({
      provider: cfg.provider, model: cfg.model, system, temperature: cfg.temperature ?? 0.4,
      messages: [{ role: "user", content: prompt }],
    });
    return text?.trim() || null;
  } catch {
    return null;
  }
}

export async function buildCrewPlan(brief: string): Promise<CrewPlan> {
  const names = ROLES.map((r) => r.name);
  const employees = await prisma.employee.findMany({
    where: { name: { in: names } }, select: { id: true, name: true },
  });
  const byName = new Map(employees.map((e) => [e.name, e.id]));
  const missing = names.filter((n) => !byName.has(n));
  if (missing.length) throw new Error(`Karyawan tidak ditemukan di database: ${missing.join(", ")}. Jalankan seed dulu.`);
  const steps = ROLES.map((r) => ({
    key: r.key, name: r.name, title: r.title, focus: r.focus,
    employeeId: byName.get(r.name)!, task: r.task, description: r.description,
    files: r.files.map((f) => f.path), note: r.note,
  }));
  return { brief, steps, totalFiles: ROLES.reduce((n, r) => n + r.files.length, 0) };
}

export async function createCrewRun(input: { projectId: string; brief: string; user: SessionUser }) {
  const brief = input.brief.trim();
  if (brief.length < 10) throw new Error("Brief terlalu singkat. Jelaskan website yang ingin dibuat (minimal 10 karakter).");
  if (brief.length > 8000) throw new Error("Brief terlalu panjang (maksimal 8000 karakter).");
  const project = await prisma.project.findUnique({ where: { id: input.projectId }, select: { id: true, name: true } });
  if (!project) throw new Error("Proyek tidak ditemukan.");
  const plan = await buildCrewPlan(brief);

  const actions: { seq: number; kind: string; tool: string; target: string; employeeId: string; payload: any }[] = [];
  let seq = 0;
  for (const step of plan.steps) {
    const role = ROLES.find((r) => r.name === step.name)!;
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
      summary: `${plan.steps.length} karyawan · ${plan.totalFiles} file · ${actions.length} aksi`,
      createdById: input.user.id,
      actions: { create: actions },
    },
    include: { actions: { orderBy: { seq: "asc" } } },
  });
  return run;
}

/** Jalankan seluruh paket: tiap karyawan selesai -> lanjut otomatis ke karyawan berikutnya. */
export async function executeCrewRun(input: { runId: string; user: SessionUser }) {
  const run = await prisma.crewRun.findUnique({
    where: { id: input.runId },
    include: { project: { select: { id: true, name: true } }, actions: { orderBy: { seq: "asc" } } },
  });
  if (!run) throw new Error("Crew run tidak ditemukan.");
  if (run.status !== "PLANNED" && run.status !== "APPROVED") throw new Error(`Crew run sudah berstatus ${run.status} dan tidak bisa dijalankan ulang.`);

  await prisma.crewRun.update({
    where: { id: run.id },
    data: { status: "RUNNING", approvedById: input.user.id, approvedAt: new Date(), startedAt: new Date() },
  });

  const ctx = { user: input.user, projectId: run.projectId };
  const plan = run.plan as unknown as CrewPlan;
  const tasksByTitle = new Map<string, { id: string; code: string }>();
  let done = 0; let failed = 0; let lastError = "";
  const started = Date.now();

  try {
    for (const step of plan.steps) {
      const role = ROLES.find((r) => r.name === step.name)!;
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
        `${cfg?.systemPrompt ?? ""}\nKamu sedang mengerjakan SATU tahap proyek. Balas HANYA JSON valid tanpa markdown dan tanpa penjelasan: {"note":"catatan deliverable maksimal 1200 karakter","files":[{"path":"...","content":"isi file lengkap"}]}. Gunakan数组 hanya untuk files. Gunakan array hanya untuk files. Escape newline sebagai \\n. Jangan memakai awalan TOOL:.`,
        `Brief website:\n${plan.brief.slice(0, 3000)}\n\nPeranmu: ${step.title} — ${step.focus}.\nTugasmu: ${step.task}.\nFile yang harus dibuat (path → tujuan):\n${specs.map((s) => `- ${s.path}: ${s.purpose}`).join("\n") || "- tidak ada file"}\nFile dari karyawan sebelumnya: ${context}.\nTulis catatan dan seluruh file yang menjadi bagianmu. Kode TypeScript/TSX harus valid dan bisa di-build. Teks UI dalam Bahasa Indonesia.`);
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
            const content = generatedFiles[payload.path] || templateFile(payload.path, plan.brief);
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

export async function crewStatus(runId: string) {
  const run = await prisma.crewRun.findUnique({
    where: { id: runId },
    include: { actions: { orderBy: { seq: "asc" }, select: { id: true, seq: true, kind: true, target: true, employeeId: true, status: true, error: true } } },
  });
  if (!run) throw new Error("Crew run tidak ditemukan.");
  return {
    id: run.id, status: run.status, summary: run.summary, plan: run.plan,
    startedAt: run.startedAt?.toISOString() ?? null, finishedAt: run.finishedAt?.toISOString() ?? null,
    actions: run.actions.map((a) => ({ ...a, error: a.error ?? null })),
  };
}
