export function llmConfigured() { return !!process.env.OPENAI_API_KEY; }

/** Panggil endpoint chat-completions yang kompatibel dengan OpenAI. Melempar error jelas jika belum dikonfigurasi. */
export async function chatCompletion(opts: { model: string; system: string; temperature?: number; provider?: string; messages: { role: "user" | "assistant"; content: string }[] }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY belum diatur di environment. Tambahkan di file .env lalu restart server.");
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");

  // Jembatan OpenCode lokal memakai field `provider` untuk memilih provider.
  // API publik (Nvidia/OpenAI) menolak field tambahan ini, jadi hanya dikirim ke jembatan lokal.
  const localBridge = /(127\.0\.0\.1|localhost)/.test(base);
  const body: Record<string, unknown> = {
    model: opts.model,
    temperature: opts.temperature ?? 0.4,
    messages: [{ role: "system", content: opts.system }, ...opts.messages],
  };
  if (localBridge && opts.provider) body.provider = opts.provider;

  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
    if (res.ok) {
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error("Respons LLM kosong.");
      return String(text);
    }
    lastError = `Provider LLM mengembalikan ${res.status}: ${(await res.text()).slice(0, 200)}`;
    // Model hosted bisa sibuk sesaat; coba ulang untuk 429/529/5xx.
    if (res.status === 429 || res.status === 529 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
      continue;
    }
    break;
  }
  throw new Error(lastError);
}
