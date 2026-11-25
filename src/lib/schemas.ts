import { z } from "zod";

export const employeeSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(80),
  title: z.string().trim().min(2, "Jabatan wajib diisi").max(120),
  departmentId: z.string().min(1, "Divisi wajib dipilih"),
  managerId: z.string().nullable().optional(),
  avatarColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  bio: z.string().max(1000).optional(),
  personality: z.string().max(300).optional(),
  communicationStyle: z.string().max(300).optional(),
  responsibilities: z.string().max(1500).optional(),
  targets: z.string().max(1500).optional(),
  availability: z.enum(["AVAILABLE", "BUSY", "AWAY", "OFFLINE"]).optional(),
  skills: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  collaboratorIds: z.array(z.string()).optional(),
});

const dateish = z.preprocess((v) => (v === "" || v === null || v === undefined ? null : new Date(v as string)), z.date().nullable());

export const taskSchema = z.object({
  title: z.string().trim().min(3, "Nama tugas minimal 3 karakter").max(160),
  description: z.string().max(5000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "REVISION", "COMPLETED", "BLOCKED"]).optional(),
  deadline: dateish.optional(),
  projectId: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
  assigneeIds: z.array(z.string()).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  checklist: z.array(z.object({ id: z.string().optional(), text: z.string().trim().min(1).max(200), done: z.boolean().default(false) })).max(50).optional(),
});

export const projectSchema = z.object({
  name: z.string().trim().min(3, "Nama proyek minimal 3 karakter").max(160),
  description: z.string().max(3000).optional(),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED"]).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  managerId: z.string().nullable().optional(),
  startDate: dateish.optional(),
  deadline: dateish.optional(),
  memberIds: z.array(z.string()).optional(),
  milestones: z.array(z.object({ id: z.string().optional(), title: z.string().trim().min(1).max(160), dueDate: dateish.optional(), done: z.boolean().default(false) })).max(30).optional(),
});
