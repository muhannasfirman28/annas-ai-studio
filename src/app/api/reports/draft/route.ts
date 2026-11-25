import { NextRequest } from "next/server";
import { route, bad } from "@/lib/api";
import { draftReport, type Scope } from "@/lib/reports";

export const GET = route("reports.read", async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const id = sp.get("employeeId");
  if (!id) throw bad("employeeId wajib.");
  return draftReport(id, (sp.get("period") as Scope["period"]) || "DAILY");
});
