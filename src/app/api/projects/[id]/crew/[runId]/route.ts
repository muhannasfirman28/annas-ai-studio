import { route } from "@/lib/api";
import { crewStatus } from "@/lib/crew";

export const maxDuration = 60;

export const GET = route("projects.read", async (_req, { params }) => crewStatus(params.runId));
