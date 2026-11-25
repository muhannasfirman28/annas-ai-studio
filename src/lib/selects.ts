export const EMP_BASIC = {
  id: true, name: true, title: true, avatarColor: true, avatarUrl: true, availability: true,
  department: { select: { id: true, name: true, color: true } },
} as const;
export const TASK_LIST_INCLUDE = {
  assignees: { include: { employee: { select: EMP_BASIC } } },
  project: { select: { id: true, name: true, color: true } },
  department: { select: { id: true, name: true, color: true } },
  checklist: true,
  _count: { select: { comments: true, attachments: true } },
} as const;
