/**
 * Jembatan lokal OpenAI-compatible -> OpenCode.
 *
 * Aplikasi Annas AI Studio memanggil POST /v1/chat/completions seperti layaknya
 * OpenAI. Jembatan ini meneruskan permintaan ke server OpenCode yang sedang
 * berjalan, memakai kredensial provider yang sudah tersimpan di OpenCode.
 * Kredensial tidak pernah disalin ke aplikasi.
 *
 * Provider dan model diambil dari body request (diisi dari Settings → AI Model).
 * Jika tidak dikirim, pakai default dari environment. Format model boleh
 * "id/model" (contoh: minimaxai/minimax-m3.1-flash) atau
 * "provider/id/model" (contoh: nvidia/minimaxai/minimax-m3.1-flash).
 */
import http from "node:http";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PORT = Number(process.env.BRIDGE_PORT || 4101);
const MODEL_ID = process.env.OPENCODE_MODEL_ID || "meta/llama-3.2-11b-vision-instruct";
const PROVIDER_ID = process.env.OPENCODE_PROVIDER_ID || "nvidia";
const KNOWN_PROVIDERS = new Set(
  (process.env.OPENCODE_PROVIDERS || "nvidia,opencode,openai,anthropic,google,github-copilot,replicate,vercel")
    .split(",").map((s) => s.trim()).filter(Boolean)
);

function servicePassword() {
  if (process.env.OPENCODE_SERVICE_PASSWORD) return process.env.OPENCODE_SERVICE_PASSWORD;
  const file = join(homedir(), ".config", "opencode", "service.json");
  return JSON.parse(readFileSync(file, "utf8")).password;
}

function serverUrl() {
  if (process.env.OPENCODE_SERVER_URL) return process.env.OPENCODE_SERVER_URL.replace(/\/$/, "");
  try {
    const info = JSON.parse(execFileSync("opencode", ["api", "get", "/api/info"], {
      encoding: "utf8", timeout: 10000, windowsHide: true,
    }));
    if (info?.urls?.[0]) return info.urls[0].replace(/\/$/, "");
  } catch {
    // fallback ke port service OpenCode yang biasa dipakai
  }
  return "http://127.0.0.1:28894";
}

const password = servicePassword();
const auth = "Basic " + Buffer.from(`opencode:${password}`).toString("base64");
const baseUrl = serverUrl();

function routeFor(body) {
  let provider = typeof body.provider === "string" && body.provider.trim() ? body.provider.trim() : PROVIDER_ID;
  let model = typeof body.model === "string" && body.model.trim() ? body.model.trim() : MODEL_ID;
  // Kompatibilitas: "nvidia/minimaxai/minimax-m3.1-flash" -> provider nvidia.
  if (!body.provider && model.includes("/")) {
    const [prefix, ...rest] = model.split("/");
    if (KNOWN_PROVIDERS.has(prefix) && rest.length) {
      provider = prefix;
      model = rest.join("/");
    }
  }
  return { provider, model };
}

function temperatureHint(value) {
  const t = Number(value);
  if (!Number.isFinite(t)) return "";
  const clamped = Math.max(0, Math.min(2, t));
  const label = clamped <= 0.3 ? "sangat ringkas dan faktual"
    : clamped <= 0.8 ? "seimbang"
    : clamped <= 1.3 ? "agak kreatif"
    : "sangat kreatif dan variatif";
  return `\n\nParameter gaya: temperature ${clamped.toFixed(1)} (${label}).`;
}

function buildPrompt(body) {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const system = [body.system, ...messages.filter((m) => m.role === "system").map((m) => m.content)]
    .filter(Boolean).join("\n\n");
  const convo = messages.filter((m) => m.role !== "system")
    .map((m) => `${m.role === "assistant" ? "Asisten" : "Pengguna"}: ${m.content}`)
    .join("\n");
  return `${system ? `Instruksi sistem:\n${system}\n\n` : ""}Percakapan:\n${convo}\n\nBalas sebagai asisten dalam Bahasa Indonesia.${temperatureHint(body.temperature)}`;
}

function send(res, status, data) {
  const payload = JSON.stringify(data);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(payload) });
  res.end(payload);
}

const server = http.createServer(async (req, res) => {
  if (req.url === "/health" && req.method === "GET") {
    return send(res, 200, { ok: true, provider: PROVIDER_ID, model: MODEL_ID, opencode: baseUrl });
  }
  if (req.url !== "/v1/chat/completions" || req.method !== "POST") {
    return send(res, 404, { error: "Not found" });
  }

  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 4_000_000) return send(res, 413, { error: "Payload terlalu besar" });
  }

  try {
    const body = JSON.parse(raw || "{}");
    const { provider, model } = routeFor(body);
    console.log(`[bridge] -> ${provider}/${model} temperature=${body.temperature ?? "-"}`);
    const upstream = await fetch(`${baseUrl}/api/experimental/generate/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify({
        prompt: buildPrompt(body),
        model: { id: model, providerID: provider },
      }),
      signal: AbortSignal.timeout(120_000),
    });
    const text = await upstream.text();
    if (!upstream.ok) {
      return send(res, 502, { error: `OpenCode generate gagal (${upstream.status}) untuk ${provider}/${model}: ${text.slice(0, 500)}` });
    }
    const parsed = JSON.parse(text);
    const content = parsed?.data?.text;
    if (!content) return send(res, 502, { error: "Respons OpenCode kosong." });

    return send(res, 200, {
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{ index: 0, message: { role: "assistant", content: String(content) }, finish_reason: "stop" }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    });
  } catch (error) {
    return send(res, 500, { error: (error instanceof Error ? error.message : String(error)).slice(0, 500) });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`OpenCode bridge aktif di http://127.0.0.1:${PORT}/v1 (default ${PROVIDER_ID}/${MODEL_ID})`);
  console.log(`OpenCode server: ${baseUrl}`);
});
