import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { route, bad, HttpError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";

const MAX = 10 * 1024 * 1024;
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export const POST = route("tasks.read", async (req: NextRequest, { user, params }) => {
  if (!(await can(user.role, "tasks.write")) && !(await can(user.role, "tasks.update_own"))) throw new HttpError(403, "Tidak diizinkan.");
  const t = await prisma.task.findUnique({ where: { id: params.id } });
  if (!t) throw new HttpError(404, "Tugas tidak ditemukan.");
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw bad("File tidak ditemukan.");
  if (file.size === 0) throw bad("File kosong.");
  if (file.size > MAX) throw bad("Ukuran file maksimal 10 MB.");
  const ext = path.extname(file.name).replace(/[^.a-zA-Z0-9]/g, "").slice(0, 10);
  const storedAs = `${randomUUID()}${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, storedAs), Buffer.from(await file.arrayBuffer()));
  const a = await prisma.taskAttachment.create({ data: { taskId: t.id, filename: file.name.slice(0, 200), storedAs, mimeType: file.type || "application/octet-stream", size: file.size } });
  await prisma.taskActivityLog.create({ data: { taskId: t.id, actorName: user.name, actorEmployeeId: user.employeeId, action: "attachment", detail: `Lampiran ${a.filename} ditambahkan` } });
  await prisma.task.update({ where: { id: t.id }, data: { lastActivityAt: new Date() } });
  return { attachment: a };
});

export const DELETE = route("tasks.write", async (req: NextRequest, { params }) => {
  const aid = req.nextUrl.searchParams.get("aid");
  const a = aid ? await prisma.taskAttachment.findFirst({ where: { id: aid, taskId: params.id } }) : null;
  if (!a) throw new HttpError(404, "Lampiran tidak ditemukan.");
  await prisma.taskAttachment.delete({ where: { id: a.id } });
  await unlink(path.join(UPLOAD_DIR, a.storedAs)).catch(() => {});
  return { ok: true };
});
