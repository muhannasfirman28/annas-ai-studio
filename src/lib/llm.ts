export function llmConfigured() { return !!process.env.OPENAI_API_KEY; }

/** Panggil endpoint chat-completions yang kompatibel dengan OpenAI. Melempar error jelas jika belum dikonfigurasi. */
export async function chatCompletion(opts: { model: string; system: string; temperature?: number; provider?: string; messages: { role: "user" | "assistant"; content: string }[] }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY belum diatur di environment. Tambahkan di file .env lalu restart server.");
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: opts.model, provider: opts.provider, temperature: opts.temperature ?? 0.4, messages: [{ role: "system", content: opts.system }, ...opts.messages] }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`Provider LLM mengembalikan ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Respons LLM kosong.");
  return String(text);
}
