/** Klien untuk Crew Worker OpenCode. Worker yang memanggil subagent, Studio tetap sebagai source of truth. */

export type CrewStepPayload = {
  key: string;
  name: string;
  title: string;
  focus: string;
  task: string;
  description: string;
  note?: string;
  employeeId: string;
  files: { path: string; purpose: string }[];
};

export type CrewAgentPayload = {
  employeeId: string;
  name: string;
  model: string;
  systemPrompt: string;
  enabled: boolean;
};

export type CrewWorkerStartPayload = {
  runId: string;
  brief: string;
  projectName: string;
  steps: CrewStepPayload[];
  agents: CrewAgentPayload[];
  files: string[];
};

export function crewEngine(): "direct" | "opencode" {
  return process.env.CREW_ENGINE === "opencode" ? "opencode" : "direct";
}

export async function startCrewOnWorker(payload: CrewWorkerStartPayload) {
  const base = (process.env.CREW_WORKER_URL || "").replace(/\/$/, "");
  const token = process.env.CREW_WORKER_TOKEN || "";
  if (!base || !token) {
    throw new Error("CREW_WORKER_URL dan CREW_WORKER_TOKEN belum diatur di environment Vercel.");
  }

  const res = await fetch(`${base}/runs/${encodeURIComponent(payload.runId)}/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Crew Worker menolak run (${res.status}): ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text) as { accepted: true; runId: string };
  } catch {
    return { accepted: true as const, runId: payload.runId };
  }
}
