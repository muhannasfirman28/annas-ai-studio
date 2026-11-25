import { prisma } from "./prisma";
export async function nextTaskCode() {
  const last = await prisma.task.findFirst({ orderBy: { code: "desc" }, select: { code: true } });
  const n = last ? parseInt(last.code.replace("TSK-", ""), 10) + 1 : 1;
  return `TSK-${String(n).padStart(3, "0")}`;
}
