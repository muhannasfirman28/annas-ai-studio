import { z } from "zod";
import { route, json } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const PATCH = route("settings.write", async (req, { params }) => {
  const d = z.object({ provider: z.string().trim().min(1).max(40).regex(/^[a-zA-Z0-9._-]+$/).optional(), model: z.string().trim().min(1).max(80).optional(), systemPrompt: z.string().max(6000).optional(), temperature: z.number().min(0).max(2).optional(), enabled: z.boolean().optional() }).parse(await json(req));
  const a = await prisma.aiAgentConfiguration.update({ where: { id: params.id }, data: d });
  return { agent: a };
});
