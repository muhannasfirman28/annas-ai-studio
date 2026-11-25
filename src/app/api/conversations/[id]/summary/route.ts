import { NextRequest } from "next/server";
import { route, HttpError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { chatCompletion, llmConfigured } from "@/lib/llm";

/** Ringkasan percakapan: statistik ekstraktif dari data nyata; ?ai=1 memakai LLM bila tersedia. */
export const GET = route("chat.use", async (req: NextRequest, { params }) => {
  const conv = await prisma.conversation.findUnique({ where: { id: params.id } });
  if (!conv) throw new HttpError(404, "Percakapan tidak ditemukan.");
  const msgs = await prisma.message.findMany({ where: { conversationId: conv.id }, orderBy: { createdAt: "asc" }, include: { authorEmployee: { select: { name: true } } } });
  const participants = [...new Set(msgs.map((m) => m.authorEmployee?.name).filter(Boolean))] as string[];
  const instructions = msgs.filter((m) => m.kind === "INSTRUCTION").map((m) => ({ by: m.authorEmployee?.name ?? "—", body: m.body, at: m.createdAt }));
  const mentioned = new Set(msgs.flatMap((m) => m.mentions));
  const names = mentioned.size ? (await prisma.employee.findMany({ where: { id: { in: [...mentioned] } }, select: { name: true } })).map((e) => e.name) : [];
  const out: Record<string, unknown> = {
    total: msgs.length, participants, instructions: instructions.slice(-5), mentioned: names,
    firstAt: msgs[0]?.createdAt ?? null, lastAt: msgs.at(-1)?.createdAt ?? null,
  };
  if (req.nextUrl.searchParams.get("ai") === "1") {
    if (!llmConfigured()) throw new HttpError(503, "OPENAI_API_KEY belum diatur, ringkasan AI tidak tersedia.");
    if (!msgs.length) throw new HttpError(400, "Belum ada pesan untuk diringkas.");
    const transcript = msgs.slice(-60).map((m) => `${m.authorEmployee?.name ?? "?"}: ${m.body}`).join("\n");
    try {
      out.aiSummary = await chatCompletion({ provider: process.env.OPENAI_PROVIDER || undefined, model: process.env.OPENAI_MODEL || "gpt-4o-mini", system: "Ringkas percakapan tim berikut dalam Bahasa Indonesia: poin utama, keputusan, dan tindak lanjut. Maksimal 6 poin.", messages: [{ role: "user", content: transcript }] });
    } catch (e) { throw new HttpError(502, (e as Error).message); }
  }
  return out;
});
