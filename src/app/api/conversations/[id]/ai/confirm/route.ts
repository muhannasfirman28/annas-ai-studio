import { z } from "zod";
import { route, json, bad, HttpError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { chatCompletion, llmConfigured } from "@/lib/llm";
import { consumeNonce, isWriteTool, runTool, toolSummary, verifyConfirmation } from "@/lib/agent-tools";

const include = {
  authorEmployee: { select: { id: true, name: true, title: true, avatarColor: true } },
  authorUser: { select: { id: true, name: true } },
};

/** Jalankan (atau batalkan) aksi agent AI yang menunggu konfirmasi user. */
export const POST = route("chat.use", async (req, { params, user }) => {
  const { token, action } = z.object({
    token: z.string().min(10),
    action: z.enum(["approve", "cancel"]),
  }).parse(await json(req));

  const pending = await verifyConfirmation(token);
  if (!pending || pending.cid !== params.id || pending.uid !== user.id) {
    throw bad("Token konfirmasi tidak valid, bukan untuk percakapan ini, atau sudah kedaluwarsa.");
  }
  if (!await consumeNonce(pending.nonce, user.id, params.id)) throw bad("Konfirmasi ini sudah dipakai.");

  if (action === "cancel") {
    const message = await prisma.message.create({
      data: { conversationId: params.id, authorUserId: user.id, body: `Dibatalkan: ${toolSummary(pending.tool, pending.args)}` },
      include,
    });
    return { message };
  }

  if (!isWriteTool(pending.tool)) throw bad("Tool ini tidak memerlukan konfirmasi.");
  const result = await runTool(pending.tool, pending.args, { user, employeeId: pending.eid });
  if (!result.ok) throw new HttpError(400, result.error);

  let body = `Berhasil: ${toolSummary(pending.tool, pending.args)}.`;
  const cfg = await prisma.aiAgentConfiguration.findUnique({ where: { employeeId: pending.eid } });
  if (cfg && llmConfigured()) {
    try {
      const answer = await chatCompletion({
        provider: cfg.provider, model: cfg.model, system: cfg.systemPrompt, temperature: cfg.temperature,
        messages: [{ role: "user", content: `Aksi berikut baru saja berhasil dijalankan: ${toolSummary(pending.tool, pending.args)}. Hasil: ${result.data}. Ringkas dalam 1-2 kalimat Bahasa Indonesia tanpa awalan TOOL:.` }],
      });
      if (answer && !answer.startsWith("TOOL:")) body = answer;
    } catch {
      // pesan fallback tetap informatif bila LLM gagal
    }
  }

  const message = await prisma.message.create({
    data: { conversationId: params.id, authorEmployeeId: pending.eid, body, generatedByAi: true },
    include,
  });
  return { message };
});
