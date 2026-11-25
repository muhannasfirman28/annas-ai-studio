import { route } from "@/lib/api";
import { readProjectFile } from "@/lib/project-files";

export const maxDuration = 60;

export const GET = (route("projects.read", async (_req, { params }) => {
  const parts = (params as Record<string, string | string[]>).path;
  const path = Array.isArray(parts) ? parts.join("/") : String(parts ?? "");
  const file = await readProjectFile(params.id, path);
  return new Response(file.content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-File-Version": String(file.version),
      "Cache-Control": "no-store",
    },
  });
}) as any) as (req: Request, ctx: { params: Promise<{ id: string; path: string[] }> }) => Promise<Response>;
