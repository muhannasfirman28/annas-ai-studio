import { route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ensureConversations } from "@/lib/chat";

export const GET = route("chat.use", async () => {
  await ensureConversations();
  const convs = await prisma.conversation.findMany({
    include: { project: { select: { name: true, color: true } }, department: { select: { name: true, color: true } }, _count: { select: { messages: true } }, messages: { orderBy: { createdAt: "desc" }, take: 1, include: { authorEmployee: { select: { name: true } } } } },
  });
  const order = { GENERAL: 0, PROJECT: 1, DIVISION: 2 } as const;
  convs.sort((a, b) => order[a.type] - order[b.type] || a.title.localeCompare(b.title));
  return { conversations: convs };
});
