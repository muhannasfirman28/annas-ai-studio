import { randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { prisma } from "./prisma";
import { can } from "./rbac";
import { logActivity, notify } from "./notify";
import { nextTaskCode } from "./tasks";
import type { SessionUser } from "./auth";

/** Tool yang boleh dipanggil agent AI. Semua akses data lewat Prisma + RBAC, tanpa SQL/perintah bebas. */

const TASK_STATUS = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "REVISION", "COMPLETED", "BLOCKED"] as const;
const PRIORITY = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const PROJECT_STATUS = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED"] as const;

const dateString = z.string().max(40).refine((v) => !Number.isNaN(Date.parse(v)), "Format tanggal tidak valid");
const day = (v?: Date | null) => (v ? v.toISOString().slice(0, 10) : null);

export const TOOL_NAMES = [
  "list_projects", "list_tasks", "get_task", "list_employees",
  "get_report_summary", "search_workspace", "create_task", "update_task_status",
] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

type Ctx = { user: SessionUser; employeeId?: string | null };
type ToolDef = {
  permission: string;
  write: boolean;
  description: string;
  example: string;
  schema: z.ZodTypeAny;
  run: (args: any, ctx: Ctx) => Promise<unknown>;
};

export const tools: Record<ToolName, ToolDef> = {
  list_projects: {
    permission: "projects.read", write: false,
    description: "Daftar proyek beserta status, deadline, dan project manager.",
    example: 'TOOL: {"name":"list_projects","args":{"status":"ACTIVE","limit":5}}',
    schema: z.object({
      status: z.enum(PROJECT_STATUS).optional(),
      limit: z.number().int().min(1).max(20).default(10),
    }),
    run: async (a) => {
      const rows = await prisma.project.findMany({
        where: a.status ? { status: a.status } : {},
        select: { id: true, name: true, status: true, deadline: true, manager: { select: { name: true } } },
        orderBy: { updatedAt: "desc" }, take: a.limit,
      });
      return rows.map((r) => ({ id: r.id, name: r.name, status: r.status, deadline: day(r.deadline), pm: r.manager?.name ?? null }));
    },
  },

  list_tasks: {
    permission: "tasks.read", write: false,
    description: "Cari/filter tugas. Bisa filter status, prioritas, proyek, nama penanggung jawab, atau kata kunci.",
    example: 'TOOL: {"name":"list_tasks","args":{"status":"TODO","limit":5}}',
    schema: z.object({
      q: z.string().trim().max(100).optional(),
      status: z.enum(TASK_STATUS).optional(),
      priority: z.enum(PRIORITY).optional(),
      project: z.string().trim().max(100).optional(),
      assignee: z.string().trim().max(100).optional(),
      limit: z.number().int().min(1).max(20).default(10),
    }),
    run: async (a) => {
      const rows = await prisma.task.findMany({
        where: {
          ...(a.q ? { OR: [{ title: { contains: a.q, mode: "insensitive" } }, { code: { contains: a.q, mode: "insensitive" } }] } : {}),
          ...(a.status ? { status: a.status } : {}),
          ...(a.priority ? { priority: a.priority } : {}),
          ...(a.project ? { project: { name: { contains: a.project, mode: "insensitive" } } } : {}),
          ...(a.assignee ? { assignees: { some: { employee: { name: { contains: a.assignee, mode: "insensitive" } } } } } : {}),
        },
        select: {
          id: true, code: true, title: true, status: true, priority: true, deadline: true,
          project: { select: { name: true } },
          assignees: { select: { employee: { select: { name: true } } } },
        },
        orderBy: { updatedAt: "desc" }, take: a.limit,
      });
      return rows.map((r) => ({
        id: r.id, code: r.code, title: r.title, status: r.status, priority: r.priority,
        deadline: day(r.deadline), project: r.project?.name ?? null,
        assignees: r.assignees.map((x) => x.employee.name),
      }));
    },
  },

  get_task: {
    permission: "tasks.read", write: false,
    description: "Detail satu tugas berdasarkan id atau kode (mis. TSK-001), termasuk checklist dan penanggung jawab.",
    example: 'TOOL: {"name":"get_task","args":{"code":"TSK-001"}}',
    schema: z.object({ id: z.string().min(1).optional(), code: z.string().min(1).optional() })
      .refine((v) => Boolean(v.id || v.code), "Isi id atau code"),
    run: async (a) => {
      const t = await prisma.task.findFirst({
        where: a.id ? { id: a.id } : { code: a.code },
        select: {
          id: true, code: true, title: true, description: true, status: true, priority: true,
          progress: true, deadline: true, project: { select: { name: true } },
          assignees: { select: { employee: { select: { name: true } } } },
          checklist: { select: { text: true, done: true } },
        },
      });
      if (!t) throw new Error("Tugas tidak ditemukan.");
      return {
        id: t.id, code: t.code, title: t.title, description: t.description, status: t.status,
        priority: t.priority, progress: t.progress, deadline: day(t.deadline), project: t.project?.name ?? null,
        assignees: t.assignees.map((x) => x.employee.name),
        checklist: t.checklist.map((c) => ({ text: c.text, done: c.done })),
      };
    },
  },

  list_employees: {
    permission: "employees.read", write: false,
    description: "Daftar karyawan, jabatan, divisi, dan status kebersediaan.",
    example: 'TOOL: {"name":"list_employees","args":{"q":"Kenji"}}',
    schema: z.object({
      q: z.string().trim().max(100).optional(),
      department: z.string().trim().max(100).optional(),
      limit: z.number().int().min(1).max(20).default(10),
    }),
    run: async (a) => {
      const rows = await prisma.employee.findMany({
        where: a.q
          ? { OR: [{ name: { contains: a.q, mode: "insensitive" } }, { title: { contains: a.q, mode: "insensitive" } }] }
          : a.department ? { department: { name: { contains: a.department, mode: "insensitive" } } } : {},
        select: { id: true, name: true, title: true, availability: true, department: { select: { name: true } } },
        orderBy: { name: "asc" }, take: a.limit,
      });
      return rows.map((r) => ({ id: r.id, name: r.name, title: r.title, department: r.department.name, availability: r.availability }));
    },
  },

  get_report_summary: {
    permission: "reports.read", write: false,
    description: "Ringkasan jumlah tugas per status, tugas terlambat, proyek aktif, dan jumlah karyawan.",
    example: 'TOOL: {"name":"get_report_summary","args":{}}',
    schema: z.object({}),
    run: async () => {
      const [byStatus, overdue, activeProjects, employees] = await Promise.all([
        prisma.task.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.task.count({ where: { deadline: { lt: new Date() }, status: { not: "COMPLETED" } } }),
        prisma.project.count({ where: { status: "ACTIVE" } }),
        prisma.employee.count(),
      ]);
      return {
        statusCounts: Object.fromEntries(byStatus.map((r) => [r.status, r._count._all])),
        overdue, activeProjects, employees,
      };
    },
  },

  search_workspace: {
    permission: "tasks.read", write: false,
    description: "Cari kata kunci lintas tugas, proyek, dan karyawan.",
    example: 'TOOL: {"name":"search_workspace","args":{"q":"RAG"}}',
    schema: z.object({ q: z.string().trim().min(1).max(100), limit: z.number().int().min(1).max(10).default(5) }),
    run: async (a) => {
      const [tasks, projects, employees] = await Promise.all([
        prisma.task.findMany({ where: { OR: [{ title: { contains: a.q, mode: "insensitive" } }, { description: { contains: a.q, mode: "insensitive" } }] }, select: { code: true, title: true }, take: a.limit }),
        prisma.project.findMany({ where: { OR: [{ name: { contains: a.q, mode: "insensitive" } }, { description: { contains: a.q, mode: "insensitive" } }] }, select: { name: true, status: true }, take: a.limit }),
        prisma.employee.findMany({ where: { OR: [{ name: { contains: a.q, mode: "insensitive" } }, { title: { contains: a.q, mode: "insensitive" } }] }, select: { name: true, title: true }, take: a.limit }),
      ]);
      return {
        tasks: tasks.map((t) => `${t.code} ${t.title}`),
        projects: projects.map((p) => `${p.name} (${p.status})`),
        employees: employees.map((e) => `${e.name} — ${e.title}`),
      };
    },
  },

  create_task: {
    permission: "tasks.write", write: true,
    description: "Buat tugas baru. Membutuhkan konfirmasi user sebelum dieksekusi. Assignees boleh berisi id atau nama karyawan; jika kosong, default ke agent yang diminta.",
    example: 'TOOL: {"name":"create_task","args":{"title":"Uji integrasi RAG","priority":"HIGH","assignees":["Arjun"]}}',
    schema: z.object({
      title: z.string().trim().min(3).max(160),
      description: z.string().max(2000).optional(),
      priority: z.enum(PRIORITY).optional(),
      deadline: dateString.optional(),
      project: z.string().trim().max(100).optional(),
      assignees: z.array(z.string().trim().min(1).max(100)).max(10).optional(),
    }),
    run: async (a, ctx) => {
      const project = a.project
        ? await prisma.project.findFirst({ where: { OR: [{ id: a.project }, { name: { contains: a.project, mode: "insensitive" } }] }, select: { id: true } })
        : null;
      const candidates: string[] = a.assignees?.length
        ? (a.assignees as string[])
        : ([ctx.employeeId ?? ctx.user.employeeId].filter(Boolean) as string[]);
      if (!candidates.length) throw new Error("Penanggung jawab belum ditentukan.");
      const found = await prisma.employee.findMany({
        where: { OR: candidates.flatMap((n) => [{ id: n }, { name: { contains: n, mode: "insensitive" } }]) },
        select: { id: true, name: true, departmentId: true },
      });
      const assignees = [...new Map(found.map((e) => [e.id, e])).values()].slice(0, 10);
      if (!assignees.length) throw new Error("Penanggung jawab tidak ditemukan.");

      const task = await prisma.task.create({
        data: {
          code: await nextTaskCode(), title: a.title, description: a.description ?? "",
          priority: a.priority ?? "MEDIUM", status: "TODO", progress: 0,
          deadline: a.deadline ? new Date(a.deadline) : null,
          projectId: project?.id ?? null, departmentId: assignees[0].departmentId ?? null,
          createdById: ctx.user.id,
          assignees: { create: assignees.map((e) => ({ employeeId: e.id })) },
          logs: { create: {
            actorName: `${ctx.user.name} (via AI)`, actorEmployeeId: ctx.employeeId ?? ctx.user.employeeId ?? null,
            action: "created", detail: "Tugas dibuat oleh agent AI",
          } },
        },
      });
      await notify({
        type: "TASK_ASSIGNED", title: `Tugas baru: ${task.title}`, body: `${task.code} ditugaskan kepada Anda.`,
        link: `/tasks?open=${task.id}`, employeeIds: assignees.map((e) => e.id),
        actorUserId: ctx.user.id, includeFounders: false,
      });
      await logActivity(`${ctx.user.name} membuat tugas ${task.code} ${task.title} via AI`, "task",
        ctx.employeeId ?? ctx.user.employeeId, `/tasks?open=${task.id}`);
      return { id: task.id, code: task.code, title: task.title, assignees: assignees.map((e) => e.name) };
    },
  },

  update_task_status: {
    permission: "tasks.write", write: true,
    description: "Ubah status (dan opsional progres) tugas berdasarkan id atau kode. Membutuhkan konfirmasi user.",
    example: 'TOOL: {"name":"update_task_status","args":{"code":"TSK-001","status":"COMPLETED"}}',
    schema: z.object({
      id: z.string().min(1).optional(),
      code: z.string().min(1).optional(),
      status: z.enum(TASK_STATUS),
      progress: z.number().int().min(0).max(100).optional(),
    }).refine((v) => Boolean(v.id || v.code), "Isi id atau code"),
    run: async (a, ctx) => {
      const current = await prisma.task.findUnique({ where: a.id ? { id: a.id } : { code: a.code! }, select: { id: true, code: true, title: true } });
      if (!current) throw new Error("Tugas tidak ditemukan.");
      const progress = a.status === "COMPLETED" ? 100 : a.progress;
      const task = await prisma.task.update({
        where: { id: current.id },
        data: { status: a.status, ...(progress !== undefined ? { progress } : {}), completedAt: a.status === "COMPLETED" ? new Date() : null },
      });
      await prisma.taskActivityLog.create({ data: {
        taskId: task.id, actorName: `${ctx.user.name} (via AI)`,
        actorEmployeeId: ctx.employeeId ?? ctx.user.employeeId ?? null,
        action: "status", detail: `Status diubah menjadi ${a.status}`,
      } });
      return { id: task.id, code: task.code, title: task.title, status: task.status, progress: task.progress };
    },
  },
};

export function isWriteTool(name: string): name is ToolName {
  return name in tools && tools[name as ToolName].write;
}

export const TOOL_PROMPT = [
  "Kamu memiliki akses ke tool internal perusahaan. Gunakan tool bila jawaban membutuhkan data nyata (jangan mengarang).",
  "",
  "Daftar tool:",
  ...TOOL_NAMES.map((n) => `- ${n}: ${tools[n].description}\n  Contoh: ${tools[n].example}`),
  "",
  "Aturan format:",
  "- Jika ingin memanggil tool, balas HANYA satu baris: TOOL: {\"name\":\"nama_tool\",\"args\":{...}}",
  "- Tool bertanda 'membutuhkan konfirmasi' tidak langsung dijalankan; tetap minta dengan format TOOL:, sistem akan meminta konfirmasi ke user.",
  "- Jika tidak perlu tool atau sudah punya cukup data, balas langsung dengan teks biasa (tanpa awalan TOOL:).",
  "- Maksimal beberapa panggilan tool per jawaban. Jangan mengulang tool yang sama tanpa alasan baru.",
].join("\n");

export function parseToolCall(text: string): { name: string; args: unknown } | null {
  const line = text.split("\n").map((s) => s.trim()).find((s) => s.startsWith("TOOL:"));
  if (!line) return null;
  const raw = line.slice(5).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    if (parsed && typeof parsed.name === "string" && parsed.args && typeof parsed.args === "object") {
      return { name: parsed.name, args: parsed.args };
    }
  } catch {
    // bukan tool call yang valid -> anggap sebagai jawaban akhir
  }
  return null;
}

export function toolSummary(name: string, args: unknown) {
  const s = args && typeof args === "object" ? JSON.stringify(args) : String(args ?? "");
  const short = s.length > 300 ? `${s.slice(0, 300)}…` : s;
  return `${name}${short ? `: ${short}` : ""}`;
}

export type ToolResult = { ok: true; data: string } | { ok: false; error: string };
export type ToolTrace = { name: string; status: "ok" | "error" | "pending" | "cancelled" };

export async function runTool(name: string, args: unknown, ctx: Ctx): Promise<ToolResult> {
  if (!(name in tools)) {
    return { ok: false, error: `Tool "${name}" tidak dikenal. Tool tersedia: ${TOOL_NAMES.join(", ")}.` };
  }
  const def = tools[name as ToolName];
  if (!(await can(ctx.user.role, def.permission))) {
    return { ok: false, error: `Role ${ctx.user.role} tidak memiliki izin ${def.permission} untuk tool ${name}.` };
  }
  const parsed = def.schema.safeParse(args);
  if (!parsed.success) {
    return { ok: false, error: `Argumen ${name} tidak valid: ${parsed.error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ")}` };
  }
  try {
    const data = await def.run(parsed.data, ctx);
    let out = JSON.stringify(data, null, 2);
    if (out.length > 4000) out = `${out.slice(0, 4000)}\n… [hasil dipotong]`;
    return { ok: true, data: out };
  } catch (e) {
    return { ok: false, error: (e instanceof Error ? e.message : String(e)).slice(0, 500) };
  }
}

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || "dev-insecure-secret-change-me-please-32chars");
type Confirmation = {
  purpose: "ai_tool_confirm"; uid: string; cid: string; eid: string;
  tool: ToolName; args: unknown; nonce: string;
};
export async function createConfirmation(input: Omit<Confirmation, "purpose">, minutes = 10) {
  return new SignJWT({ ...input, purpose: "ai_tool_confirm" } as never)
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${minutes}m`).sign(secret());
}

export async function verifyConfirmation(token: string): Promise<Confirmation | null> {
  try {
    const p = (await jwtVerify(token, secret())).payload as unknown as Confirmation;
    return p?.purpose === "ai_tool_confirm" && p.uid && p.cid && p.nonce ? p : null;
  } catch {
    return null;
  }
}

export function newNonce() { return randomUUID(); }

/** Pakai nonce sekali, disimpan di DB supaya selamat dari restart/hot reload. */
export async function consumeNonce(nonce: string, userId: string, conversationId: string) {
  await prisma.$executeRaw`DELETE FROM ai_tool_confirmations WHERE created_at < now() - interval '10 minutes'`;
  const inserted = await prisma.$executeRaw`
    INSERT INTO ai_tool_confirmations (nonce, user_id, conversation_id)
    VALUES (${nonce}, ${userId}, ${conversationId})
    ON CONFLICT (nonce) DO NOTHING`;
  return inserted === 1;
}
