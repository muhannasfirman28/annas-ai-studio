import { z } from "zod";
import { route, json } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { llmConfigured } from "@/lib/llm";
import { ALL_PERMISSIONS } from "@/lib/rbac";
import { can } from "@/lib/rbac";

export const GET = route("settings.read", async (_r, { user }) => {
  const manage = await can(user.role, "users.manage");
  const [settings, roles, agents, users] = await Promise.all([
    prisma.companySettings.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.role.findMany(),
    prisma.aiAgentConfiguration.findMany({ include: { employee: { select: { id: true, name: true, title: true, avatarColor: true } } }, orderBy: { employee: { createdAt: "asc" } } }),
    manage ? prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, active: true, employeeId: true, lastLoginAt: true }, orderBy: { createdAt: "asc" } }) : [],
  ]);
  return { settings, roles, agents, users, allPermissions: ALL_PERMISSIONS, llm: { configured: llmConfigured(), baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1" } };
});

const schema = z.object({
  name: z.string().trim().min(2).max(100), tagline: z.string().max(200), founder: z.string().min(1).max(100),
  industries: z.array(z.string().trim().min(1)).max(20), vision: z.string().max(2000), missions: z.array(z.string().trim().min(1)).max(20),
  logoUrl: z.string().max(400_000).refine((v) => v === "" || v.startsWith("data:image/"), "Logo harus berupa gambar").nullable(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/), secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/), accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  notificationPrefs: z.record(z.string(), z.boolean()),
  security: z.object({ sessionHours: z.number().int().min(1).max(168), minPasswordLength: z.number().int().min(6).max(64) }),
  integrations: z.object({ provider: z.string().max(40), baseUrl: z.string().max(200), defaultModel: z.string().max(80) }),
}).partial();

export const PATCH = route("settings.write", async (req) => {
  const d = schema.parse(await json(req));
  const s = await prisma.companySettings.update({ where: { id: 1 }, data: { ...d, logoUrl: d.logoUrl === "" ? null : d.logoUrl } });
  return { settings: s };
});
