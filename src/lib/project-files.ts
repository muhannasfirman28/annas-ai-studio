import { prisma } from "./prisma";

/** Path aman untuk file hasil kerja karyawan AI. Semua file disimpan di DB, bukan filesystem serverless. */

const ALLOWED_DIRS = ["app/", "components/", "data/", "lib/", "public/"];
const ALLOWED_ROOT_FILES = new Set([
  "package.json", "tsconfig.json", "next.config.mjs", "next.config.js",
  "tailwind.config.ts", "postcss.config.mjs", "README.md", ".gitignore", ".env.example",
]);

export const MAX_FILE_CHARS = 80_000;
export const MAX_FILES_PER_PROJECT = 60;

export function normalizeProjectFilePath(raw: string): string {
  if (typeof raw !== "string") throw new Error("Path file harus berupa teks.");
  let p = raw.trim().replace(/^\.\//, "");
  if (!p || p.length > 200) throw new Error("Path file kosong atau terlalu panjang (maksimal 200 karakter).");
  if (p.startsWith("/") || p.includes("\\") || p.includes("\0")) throw new Error("Path absolut, backslash, dan null byte tidak diizinkan.");
  if (p.split("/").some((s) => s === "" || s === "." || s === "..")) throw new Error("Path tidak valid: Hindari '/' ganda, '.', atau '..'.");
  if (p.split("/").length > 8) throw new Error("Path terlalu dalam (maksimal 8 level).");
  if (!/^[A-Za-z0-9._\-/]+$/.test(p)) throw new Error("Path hanya boleh memakai huruf, angka, titik, hyphen, underscore, dan slash.");
  const lower = p.toLowerCase();
  if (lower.includes("node_modules") || lower.startsWith(".git/") || lower === ".git") throw new Error("Path sistem tidak diizinkan.");
  if (/(^|\/)\.env(\.|$)/.test(lower) && lower !== ".env.example") throw new Error("File kredensial (.env) tidak boleh ditulis atau dibaca.");
  if (!ALLOWED_DIRS.some((d) => p.startsWith(d)) && !ALLOWED_ROOT_FILES.has(p)) {
    throw new Error(`Path di luar allowlist. Gunakan salah satu: ${ALLOWED_DIRS.join(", ")} atau ${[...ALLOWED_ROOT_FILES].join(", ")}.`);
  }
  return p;
}

function assertContent(content: unknown): string {
  if (typeof content !== "string") throw new Error("Konten file harus berupa teks.");
  if (content.length > MAX_FILE_CHARS) throw new Error(`Konten terlalu besar (maksimal ${MAX_FILE_CHARS} karakter).`);
  return content;
}

export type ProjectFileView = {
  path: string; content: string; version: number; updatedAt: string;
  author: string | null;
};

export async function listProjectFiles(projectId: string, prefix?: string): Promise<ProjectFileView[]> {
  const rows = await prisma.projectFile.findMany({
    where: { projectId, ...(prefix ? { path: { startsWith: normalizeProjectFilePath(prefix) } } : {}) },
    orderBy: { path: "asc" },
    select: { path: true, content: true, version: true, updatedAt: true, authorEmployee: { select: { name: true } } },
    take: MAX_FILES_PER_PROJECT,
  });
  return rows.map((r) => ({
    path: r.path, content: r.content, version: r.version,
    updatedAt: r.updatedAt.toISOString(), author: r.authorEmployee?.name ?? null,
  }));
}

export async function readProjectFile(projectId: string, rawPath: string): Promise<ProjectFileView> {
  const path = normalizeProjectFilePath(rawPath);
  const row = await prisma.projectFile.findUnique({
    where: { projectId_path: { projectId, path } },
    select: { path: true, content: true, version: true, updatedAt: true, authorEmployee: { select: { name: true } } },
  });
  if (!row) throw new Error(`File "${path}" belum ada di proyek ini.`);
  return {
    path: row.path, content: row.content, version: row.version,
    updatedAt: row.updatedAt.toISOString(), author: row.authorEmployee?.name ?? null,
  };
}

export async function writeProjectFile(input: {
  projectId: string;
  path: string;
  content: unknown;
  authorEmployeeId?: string | null;
  authorUserId?: string | null;
}): Promise<{ path: string; version: number; created: boolean }> {
  const path = normalizeProjectFilePath(input.path);
  const content = assertContent(input.content);
  const existing = await prisma.projectFile.findUnique({
    where: { projectId_path: { projectId: input.projectId, path } },
    select: { id: true, version: true },
  });
  if (!existing && (await prisma.projectFile.count({ where: { projectId: input.projectId } })) >= MAX_FILES_PER_PROJECT) {
    throw new Error(`Batas ${MAX_FILES_PER_PROJECT} file per proyek tercapai.`);
  }
  const saved = existing
    ? await prisma.projectFile.update({
        where: { id: existing.id },
        data: {
          content, version: { increment: 1 },
          authorEmployeeId: input.authorEmployeeId ?? null,
          authorUserId: input.authorUserId ?? null,
        },
        select: { version: true },
      })
    : await prisma.projectFile.create({
        data: {
          projectId: input.projectId, path, content, version: 1,
          authorEmployeeId: input.authorEmployeeId ?? null,
          authorUserId: input.authorUserId ?? null,
        },
        select: { version: true },
      });
  return { path, version: saved.version, created: !existing };
}

/** Kumpulan file menjadi peta path -> konten untuk preview/zip. */
export async function projectFileMap(projectId: string): Promise<Record<string, string>> {
  const files = await listProjectFiles(projectId);
  return Object.fromEntries(files.map((f) => [f.path, f.content]));
}
