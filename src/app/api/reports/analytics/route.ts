import { NextRequest } from "next/server";
import { route } from "@/lib/api";
import { analytics, type Scope } from "@/lib/reports";

export const GET = route("reports.read", async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const a = await analytics({ period: (sp.get("period") as Scope["period"]) || "WEEKLY", projectId: sp.get("projectId"), employeeId: sp.get("employeeId"), departmentId: sp.get("departmentId") });
  const { tasks, ...rest } = a;
  return { ...rest, taskCount: tasks.length };
});
