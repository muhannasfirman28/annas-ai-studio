import { after } from "next/server";
import { route } from "@/lib/api";
import { crewStatus, dispatchNextStep } from "@/lib/crew";

export const maxDuration = 60;

export const GET = route("projects.read", async (_req, { params }) => {
  const result = await crewStatus(params.runId);
  if (result.status === "RUNNING") {
    // Self-healing: kalau worker mati di tengah step, step lama direset dan dikirim ulang.
    after(async () => {
      await dispatchNextStep(params.runId);
    });
  }
  return result;
});
