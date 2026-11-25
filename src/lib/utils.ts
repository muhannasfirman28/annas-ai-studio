import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...i: ClassValue[]) => twMerge(clsx(i));

export const STATUS_LABEL: Record<string, string> = {
  BACKLOG: "Backlog", TODO: "To Do", IN_PROGRESS: "In Progress", IN_REVIEW: "In Review",
  REVISION: "Revision", COMPLETED: "Completed", BLOCKED: "Blocked",
};
export const STATUSES = Object.keys(STATUS_LABEL);
export const PRIORITY_LABEL: Record<string, string> = { LOW: "Low", MEDIUM: "Medium", HIGH: "High", URGENT: "Urgent" };
export const PRIORITIES = Object.keys(PRIORITY_LABEL);
export const PROJECT_STATUS_LABEL: Record<string, string> = { PLANNING: "Planning", ACTIVE: "Active", ON_HOLD: "On Hold", COMPLETED: "Completed" };
export const AVAIL_LABEL: Record<string, string> = { AVAILABLE: "Tersedia", BUSY: "Sibuk", AWAY: "Away", OFFLINE: "Offline" };
export const ROLE_LABEL: Record<string, string> = { FOUNDER: "Founder / Super Admin", EXECUTIVE: "Executive", MANAGER: "Manager", EMPLOYEE: "Employee" };

export const STATUS_TONE: Record<string, string> = {
  BACKLOG: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  TODO: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
  IN_PROGRESS: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
  IN_REVIEW: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  REVISION: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  COMPLETED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  BLOCKED: "bg-red-500/10 text-red-600 dark:text-red-300",
};
export const PRIORITY_TONE: Record<string, string> = {
  LOW: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  MEDIUM: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
  HIGH: "bg-orange-500/10 text-orange-600 dark:text-orange-300",
  URGENT: "bg-red-500/10 text-red-600 dark:text-red-300",
};
export const AVAIL_DOT: Record<string, string> = { AVAILABLE: "bg-emerald-500", BUSY: "bg-amber-500", AWAY: "bg-slate-400", OFFLINE: "bg-slate-300" };

export function fmtDate(d?: string | Date | null, withTime = false) {
  if (!d) return "—";
  return new Date(d).toLocaleString("id-ID", withTime
    ? { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
    : { day: "2-digit", month: "short", year: "numeric" });
}
export function timeAgo(d: string | Date) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "baru saja";
  if (s < 3600) return `${Math.floor(s / 60)} mnt lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} hari lalu`;
  return fmtDate(d);
}
export const initials = (n: string) => n.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
export const toInputDate = (d?: string | Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export const PSTATUS_TONE: Record<string, string> = { PLANNING: "bg-sky-500/10 text-sky-600", ACTIVE: "bg-blue-500/10 text-blue-600", ON_HOLD: "bg-amber-500/10 text-amber-600", COMPLETED: "bg-emerald-500/10 text-emerald-600" };
