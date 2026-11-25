import { route } from "@/lib/api";
import { listProjectFiles } from "@/lib/project-files";

export const maxDuration = 60;

export const GET = route("projects.read", async (_req, { params }) => ({
  files: await listProjectFiles(params.id),
}));
