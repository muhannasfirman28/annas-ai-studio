/**
 * Crew Worker: menjalankan delapan karyawan sebagai subagent OpenCode berurutan,
 * lalu mengirim hasilnya ke Studio API. File kerja ada di workspace sementara;
 * sumber kebenaran tetap Neon Postgres di Studio.
 */
import http from "node:http";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PORT = Number(process.env.PORT || 8787);
const OPENCODE_BASE = (process.env.OPENCODE_SERVER_URL || "http://127.0.0.1:28894").replace(/\/$/, "");
const OPENCODE_PASSWORD = process.env.OPENCODE_SERVICE_PASSWORD || "";
const CALLBACK_BASE = (process.env.STUDIO_CALLBACK_URL || "").replace(/\/$/, "");
const CALLBACK_TOKEN = process.env.CREW_CALLBACK_TOKEN || "";
const WORKER_TOKEN = process.env.CREW_WORKER_TOKEN || "";
const PROVIDER_ID = process.env.OPENCODE_PROVIDER_ID || "nvidia";
const MODEL_ID = process.env.OPENCODE_MODEL_ID || "minimaxai/minimax-m3.1-flash";
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || "/tmp/crew";
const STEP_TIMEOUT_MS = Number(process.env.STEP_TIMEOUT_MS || 130_000);
const DEADLINE_MS = Number(process.env.CREW_DEADLINE_MS || 480_000);

const ALLOWED_DIRS = ["app/", "components/", "data/", "lib/", "public/"];
const ALLOWED_ROOT_FILES = new Set([
  "package.json", "tsconfig.json", "next.config.mjs", "next.config.js",
  "tailwind.config.ts", "postcss.config.mjs", "README.md", ".gitignore", ".env.example",
]);

let activeRunId = null;
let cancelRequestedRunId = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function send(res, status, data) {
  const payload = JSON.stringify(data);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(payload) });
  res.end(payload);
}

function bearer(req, expected) {
  return !!expected && req.headers.authorization === `Bearer ${expected}`;
}

export function normalizeWorkerPath(raw) {
  if (typeof raw !== "string") throw new Error("Path file harus berupa teks.");
  let p = raw.trim().replace(/^\.\//, "");
  if (!p || p.length > 200) throw new Error("Path file kosong atau terlalu panjang.");
  if (p.startsWith("/") || p.includes("\\") || p.includes("\0")) throw new Error("Path tidak valid.");
  if (p.split("/").some((s) => s === "" || s === "." || s === "..")) throw new Error("Path mengandung '.' atau '..'.");
  if (p.split("/").length > 8) throw new Error("Path terlalu dalam.");
  if (!/^[A-Za-z0-9._\-/]+$/.test(p)) throw new Error("Path mengandung karakter terlarang.");
  const lower = p.toLowerCase();
  if (lower.includes("node_modules") || lower.startsWith(".git/") || lower === ".git") throw new Error("Path sistem tidak diizinkan.");
  if (/(^|\/)\.env(\.|$)/.test(lower) && lower !== ".env.example") throw new Error("File .env tidak diizinkan.");
  if (!ALLOWED_DIRS.some((d) => p.startsWith(d)) && !ALLOWED_ROOT_FILES.has(p)) throw new Error(`Path di luar allowlist: ${p}`);
  return p;
}

function safeRunId(raw) {
  if (typeof raw !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(raw)) throw new Error("runId tidak valid.");
  return raw;
}

function opencodeHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (OPENCODE_PASSWORD) headers.Authorization = `Basic ${Buffer.from(`opencode:${OPENCODE_PASSWORD}`).toString("base64")}`;
  return headers;
}

async function opencodeFetch(urlPath, init = {}) {
  return fetch(`${OPENCODE_BASE}${urlPath}`, {
    ...init,
    headers: { ...opencodeHeaders(), ...(init.headers || {}) },
  });
}

async function studioFetch(urlPath, init = {}) {
  if (!CALLBACK_BASE) throw new Error("STUDIO_CALLBACK_URL belum diatur di worker.");
  return fetch(`${CALLBACK_BASE}${urlPath}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(CALLBACK_TOKEN ? { Authorization: `Bearer ${CALLBACK_TOKEN}` } : {}),
      ...(init.headers || {}),
    },
    signal: init.signal || AbortSignal.timeout(60_000),
  });
}

async function callback(runId, body) {
  let last = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await studioFetch(`/${encodeURIComponent(runId)}/callback`, {
        method: "POST", body: JSON.stringify(body),
      });
      if (res.ok) return;
      last = `${res.status}: ${(await res.text()).slice(0, 200)}`;
    } catch (e) {
      last = (e && e.message) || String(e);
    }
    await sleep(700 * (attempt + 1));
  }
  console.error(`[callback] gagal ${runId}: ${last}`);
}

function tryJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}

function readTextParts(message) {
  const content = message?.content;
  if (typeof message?.text === "string") return message.text;
  if (!Array.isArray(content)) return "";
  return content.filter((p) => p?.type === "text" && typeof p.text === "string").map((p) => p.text).join("\n").trim();
}

export function extractNote(payload) {
  const list = Array.isArray(payload) ? payload : payload?.messages || payload?.data || [];
  for (const message of [...list].reverse()) {
    if (message?.type !== "assistant") continue;
    const text = readTextParts(message);
    if (!text) continue;
    const json = tryJson(text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim());
    if (typeof json?.note === "string" && json.note.trim()) return json.note.trim().slice(0, 8000);
    const labeled = /NOTE:\s*([\s\S]*)/i.exec(text);
    return (labeled ? labeled[1] : text).trim().slice(0, 8000);
  }
  return "";
}

function parseList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.messages)) return payload.messages;
  if (Array.isArray(payload?.sessions)) return payload.sessions;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

async function waitForIdle(sessionId, sinceMs) {
  // Endpoint /wait bisa mengembalikan 200 sebelum run dimulai, jadi tetap poll
  // sampai session benar-benar punya timestamp idle setelah prompt dikirim.
  const deadline = Date.now() + STEP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await opencodeFetch(`/api/session/${encodeURIComponent(sessionId)}`);
      if (res.ok) {
        const payload = await res.json();
        const data = payload?.data || payload;
        const idle = data?.time?.idle;
        if (typeof idle === "number" && idle >= sinceMs) return;
      }
    } catch {
      // abaikan, lanjut polling
    }
    await sleep(1000);
  }
  throw new Error("Timeout menunggu subagent OpenCode selesai.");
}

async function latestChildSession(parentId) {
  try {
    const res = await opencodeFetch(`/api/session?parentID=${encodeURIComponent(parentId)}&order=desc&limit=10`);
    if (!res.ok) return null;
    return parseList(await res.json())[0]?.id || null;
  } catch {
    return null;
  }
}

async function sessionNote(sessionId) {
  try {
    const res = await opencodeFetch(`/api/session/${encodeURIComponent(sessionId)}/message?order=desc&limit=12`);
    if (!res.ok) return "";
    return extractNote(await res.json());
  } catch {
    return "";
  }
}

function buildStepPrompt(step, agent, brief) {
  const files = step.files.map((f) => `- ${f.path}: ${f.purpose || "tanpa keterangan"}`).join("\n") || "- tidak ada file";
  const extra = agent?.systemPrompt ? `\n\nInstruksi tambahan dari Settings Studio:\n${agent.systemPrompt.slice(0, 2000)}` : "";
  return [
    `Kamu adalah ${step.name}, ${step.title}. Fokusmu: ${step.focus}.`,
    "",
    `Brief proyek:\n${brief.slice(0, 3000)}`,
    "",
    `Tugas: ${step.task}.`,
    `Deskripsi: ${step.description}.`,
    "",
    `File yang harus dibuat/diperbarui di workspace ini dengan tool edit/write OpenCode:\n${files}`,
    "",
    "Sebelum menulis, baca file yang sudah ada bila relevan. Jangan hanya mengembalikan kode di chat — tulis benar-benar ke workspace. Kode TypeScript/TSX harus valid dan bisa di-build. Teks UI dalam Bahasa Indonesia.",
    `Setelah selesai, balas HANYA catatan deliverable maksimal 1200 karakter diawali "NOTE:". Jangan mengulang isi file.${extra}`,
  ].join("\n");
}

async function createCoordinatorSession(runId, workspace) {
  const res = await opencodeFetch("/api/session", {
    method: "POST",
    body: JSON.stringify({
      title: `Crew ${runId}`,
      location: { directory: workspace },
      agent: "crew-coordinator",
      model: { providerID: PROVIDER_ID, id: MODEL_ID },
      metadata: { runId, source: "annas-ai-studio" },
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Gagal membuat session OpenCode (${res.status}): ${text.slice(0, 300)}`);
  const data = tryJson(text);
  const id = data?.id || data?.session?.id || data?.data?.id;
  if (!id) throw new Error("Respons session OpenCode tidak mengandung id.");
  return String(id);
}

async function createChildSession(parentId, step) {
  const res = await opencodeFetch("/api/session", {
    method: "POST",
    body: JSON.stringify({
      parentID: parentId,
      agent: step.key,
      title: `Crew ${step.key}`,
      model: { providerID: PROVIDER_ID, id: MODEL_ID },
      metadata: { stepKey: step.key, source: "annas-ai-studio" },
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Gagal membuat child session ${step.key} (${res.status}): ${text.slice(0, 300)}`);
  const data = tryJson(text);
  const id = data?.id || data?.session?.id || data?.data?.id;
  if (!id) throw new Error(`Respons child session ${step.key} tidak mengandung id.`);
  return String(id);
}

async function promptStep(runId, coordinatorId, step, agent, brief) {
  const startedAt = Date.now();
  const childId = await createChildSession(coordinatorId, step);
  const res = await opencodeFetch(`/api/session/${encodeURIComponent(childId)}/prompt`, {
    method: "POST",
    body: JSON.stringify({
      id: `crew-${runId}-${step.key}`.slice(0, 120),
      text: buildStepPrompt(step, agent, brief),
      metadata: { runId, stepKey: step.key, childId, parentId: coordinatorId },
    }),
  });
  if (!res.ok) throw new Error(`Gagal mengirim prompt ${step.key} (${res.status}): ${(await res.text()).slice(0, 300)}`);
  await waitForIdle(childId, startedAt);

  const childNote = await sessionNote(childId);
  return {
    note: childNote || step.note || `${step.name}: ${step.task}`,
    childId,
    parentId: coordinatorId,
  };
}

async function prepareWorkspace(runId, manifest) {
  const dir = path.join(WORKSPACE_ROOT, runId);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  const res = await studioFetch(`/${encodeURIComponent(runId)}/files`, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Gagal mengambil file proyek (${res.status}): ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const files = Array.isArray(data?.files) ? data.files : [];
  for (const file of files) {
    const p = normalizeWorkerPath(file.path);
    await writeFile(path.join(dir, p), String(file.content ?? ""), "utf8");
  }
  return dir;
}

async function workspaceFiles(dir) {
  const found = [];
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const abs = path.join(current, entry.name);
      const rel = path.relative(dir, abs).split(path.sep).join("/");
      try { found.push(normalizeWorkerPath(rel)); } catch { /* file di luar allowlist diabaikan */ }
    }
  }
  await walk(dir);
  return found.sort();
}

async function hashWorkspace(dir, files) {
  const hashes = {};
  for (const file of files) {
    const content = await readFile(path.join(dir, file), "utf8");
    hashes[file] = createHash("sha256").update(content).digest("hex");
  }
  return hashes;
}

async function commitChanges(runId, dir, previous, employeeId) {
  const currentFiles = await workspaceFiles(dir);
  const currentHashes = await hashWorkspace(dir, currentFiles);
  const changed = [];
  for (const file of currentFiles) {
    if (previous[file] === currentHashes[file]) continue;
    changed.push({ path: file, content: await readFile(path.join(dir, file), "utf8"), employeeId });
  }
  if (!changed.length) return [];
  const res = await studioFetch(`/${encodeURIComponent(runId)}/files`, {
    method: "POST", body: JSON.stringify({ files: changed }),
  });
  if (!res.ok) throw new Error(`Gagal menyimpan file ke Studio (${res.status}): ${(await res.text()).slice(0, 300)}`);
  for (const file of changed) previous[file] = currentHashes[file.path];
  return changed.map((f) => f.path);
}

async function runCrew(payload) {
  const runId = safeRunId(payload.runId);
  const started = Date.now();
  const deadline = started + DEADLINE_MS;
  let workspace = null;
  let failed = false;

  try {
    workspace = await prepareWorkspace(runId, payload.files || []);
    let hashes = await hashWorkspace(workspace, await workspaceFiles(workspace));
    const coordinatorId = await createCoordinatorSession(runId, workspace);

    for (const step of payload.steps || []) {
      if (cancelRequestedRunId === runId) throw new Error("Crew dibatalkan.");
      if (Date.now() > deadline) throw new Error("Deadline crew terlampaui.");

      const stepStarted = Date.now();
      const agent = (payload.agents || []).find((a) => a.employeeId === step.employeeId);
      try {
        let note = step.note || `${step.name}: ${step.task}`;
        let childId = null;
        let files = [];

        if (agent?.enabled === false) {
          note = `${note}\n(Caryawan dinonaktifkan di Settings; file memakai template Studio.)`;
        } else {
          const result = await promptStep(runId, coordinatorId, step, agent, payload.brief);
          note = result.note;
          childId = result.childId;
          files = await commitChanges(runId, workspace, hashes, step.employeeId);
        }

        await callback(runId, {
          type: "step", stepKey: step.key, status: "DONE", note,
          files, sessionId: childId || coordinatorId, parentId: childId ? coordinatorId : null,
          model: agent?.model || `${PROVIDER_ID}/${MODEL_ID}`,
          durationMs: Date.now() - stepStarted,
        });
        console.log(`[run ${runId}] ${step.key} selesai (${Date.now() - stepStarted} ms, ${files.length} file)`);
      } catch (e) {
        failed = true;
        const message = (e instanceof Error ? e.message : String(e)).slice(0, 500);
        await callback(runId, {
          type: "step", stepKey: step.key, status: "FAILED", error: message,
          sessionId: coordinatorId, parentId: null, durationMs: Date.now() - stepStarted,
        });
        console.error(`[run ${runId}] ${step.key} gagal: ${message}`);
        break;
      }
    }

    await callback(runId, {
      type: "complete",
      status: failed ? "FAILED" : "DONE",
      summary: failed
        ? `Crew OpenCode terhenti setelah ${Math.round((Date.now() - started) / 1000)} detik.`
        : `Crew OpenCode selesai dalam ${Math.round((Date.now() - started) / 1000)} detik.`,
    });
  } catch (e) {
    failed = true;
    const message = (e instanceof Error ? e.message : String(e)).slice(0, 500);
    console.error(`[run ${runId}] fatal: ${message}`);
    await callback(runId, { type: "complete", status: "FAILED", summary: `Crew Worker gagal: ${message}` });
  } finally {
    if (workspace) await rm(workspace, { recursive: true, force: true }).catch(() => {});
    if (activeRunId === runId) activeRunId = null;
    if (cancelRequestedRunId === runId) cancelRequestedRunId = null;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/health") {
    let opencodeOk = false;
    try {
      const r = await opencodeFetch("/api/info", { signal: AbortSignal.timeout(4000) });
      opencodeOk = r.ok;
    } catch { /* mati */ }
    return send(res, 200, {
      ok: true, opencodeOk, opencode: OPENCODE_BASE,
      provider: PROVIDER_ID, model: MODEL_ID, activeRunId,
      callbackConfigured: !!CALLBACK_BASE, workerTokenConfigured: !!WORKER_TOKEN,
    });
  }

  const startMatch = /^\/runs\/([^/]+)\/start$/.exec(url.pathname);
  if (req.method === "POST" && startMatch) {
    if (!bearer(req, WORKER_TOKEN)) return send(res, 401, { error: "Token worker tidak valid." });
    let runId;
    try { runId = safeRunId(decodeURIComponent(startMatch[1])); }
    catch (e) { return send(res, 400, { error: e instanceof Error ? e.message : String(e) }); }

    let raw = "";
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 2_000_000) return send(res, 413, { error: "Payload terlalu besar." });
    }
    const payload = tryJson(raw || "{}");
    if (!payload?.brief || !Array.isArray(payload?.steps)) return send(res, 400, { error: "Body tidak valid." });
    if (activeRunId) return send(res, 409, { error: `Run ${activeRunId} masih berjalan.`, activeRunId });
    if (!CALLBACK_BASE || !CALLBACK_TOKEN) return send(res, 500, { error: "STUDIO_CALLBACK_URL / CREW_CALLBACK_TOKEN belum diatur." });

    activeRunId = runId;
    res.writeHead(202, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ accepted: true, runId }));
    void runCrew(payload);
    return;
  }

  const cancelMatch = /^\/runs\/([^/]+)\/cancel$/.exec(url.pathname);
  if (req.method === "POST" && cancelMatch) {
    if (!bearer(req, WORKER_TOKEN)) return send(res, 401, { error: "Token worker tidak valid." });
    cancelRequestedRunId = decodeURIComponent(cancelMatch[1]);
    return send(res, 200, { ok: true, cancelled: cancelRequestedRunId });
  }

  return send(res, 404, { error: "Not found" });
});

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Crew Worker aktif di :${PORT} | OpenCode ${OPENCODE_BASE} | ${PROVIDER_ID}/${MODEL_ID}`);
  });
}
