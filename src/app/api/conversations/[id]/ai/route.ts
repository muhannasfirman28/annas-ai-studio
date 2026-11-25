import { z } from "zod";
import { route, json, bad, HttpError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { chatCompletion, llmConfigured } from "@/lib/llm";
import {
  TOOL_PROMPT, parseToolCall, isWriteTool, runTool, toolSummary,
  createConfirmation, newNonce, type ToolName, type ToolTrace,
} from "@/lib/agent-tools";

/** Minta karyawan AI membalas di percakapan, dengan tool calling bila diperlukan. */
export const POST = route("chat.use", async (req, { params, user }) => {
  const { employeeId } = z.object({ employeeId: z.string() }).parse(await json(req));
  if (!llmConfigured()) throw new HttpError(503, "Integrasi AI belum aktif: OPENAI_API_KEY belum diatur. Lihat README bagian Integrasi AI.");
  const conversation = await prisma.conversation.findUnique({ where: { id: params.id }, select: { projectId: true } });
  if (!conversation) throw bad("Percakapan tidak ditemukan.");
  const projectId = conversation.projectId;
  const cfg = await prisma.aiAgentConfiguration.findUnique({ where: { employeeId }, include: { employee: true } });
  if (!cfg) throw bad("Konfigurasi agent tidak ditemukan.");
  if (!cfg.enabled) throw bad(`Agent ${cfg.employee.name} belum diaktifkan di Settings → AI Model.`);
  const history = await prisma.message.findMany({ where: { conversationId: params.id }, orderBy: { createdAt: "desc" }, take: 20, include: { authorEmployee: { select: { name: true } } } });
  const msgs = history.reverse().map((m) => ({
    role: (m.authorEmployeeId === employeeId ? "assistant" : "user") as "user" | "assistant",
    content: m.authorEmployeeId === employeeId ? m.body : `${m.authorEmployee?.name ?? "Pengguna"}: ${m.body}`,
  }));

  const trace: ToolTrace[] = [];
  let confirmation: { token: string; tool: string; summary: string } | null = null;
  let text = "";

  for (let round = 0; round < 4; round++) {
    const system = `${cfg.systemPrompt}\n\n${TOOL_PROMPT}`;
    try { text = await chatCompletion({ provider: cfg.provider, model: cfg.model, system, temperature: cfg.temperature, messages: msgs }); }
    catch (e) { throw new HttpError(502, (e as Error).message); }

    const call = parseToolCall(text);
    if (!call) break;

    // Tool yang mengubah data tidak langsung dijalankan: minta konfirmasi user dulu.
    if (isWriteTool(call.name)) {
      trace.push({ name: call.name, status: "pending" });
      const token = await createConfirmation({
        uid: user.id, cid: params.id, eid: cfg.employeeId,
        tool: call.name as ToolName, args: call.args, nonce: newNonce(), pid: projectId,
      });
      const summary = toolSummary(call.name, call.args);
      confirmation = { token, tool: call.name, summary };
      text = `Baik. Saya akan menjalankan aksi berikut: ${summary}\n\nSilakan klik Konfirmasi untuk melaksanakannya, atau Batal untuk membatalkan.`;
      break;
    }

    const result = await runTool(call.name, call.args, { user, employeeId: cfg.employeeId, projectId });
    trace.push({ name: call.name, status: result.ok ? "ok" : "error" });
    if (!result.ok && trace.filter((t) => t.name === call.name && t.status === "error").length >= 2) {
      text = `Tool ${call.name} gagal berulang kali: ${result.error}`;
      break;
    }
    msgs.push({ role: "user", content: `Hasil tool ${call.name}: ${result.ok ? result.data : `ERROR: ${result.error}`}` });
    if (round === 3) text = "Saya sudah mengumpulkan data yang tersedia, tetapi batas putaran tool tercapai.";
  }

  const message = await prisma.message.create({
    data: { conversationId: params.id, authorEmployeeId: employeeId, body: text, generatedByAi: true },
    include: { authorEmployee: { select: { id: true, name: true, title: true, avatarColor: true } }, authorUser: { select: { id: true, name: true } } },
  });
  return { message, tools: trace, confirmation };
});
