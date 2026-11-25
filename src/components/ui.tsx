"use client";
import * as React from "react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2, X } from "lucide-react";
import { cn, initials, AVAIL_DOT } from "@/lib/utils";

/* ───────── Button ───────── */
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "accent" | "outline" | "ghost" | "danger"; size?: "sm" | "md" | "icon"; loading?: boolean;
};
export const Button = React.forwardRef<HTMLButtonElement, BtnProps>(function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...p }, ref) {
  const v = {
    primary: "bg-primary text-primary-foreground hover:opacity-90",
    accent: "bg-electric text-white hover:opacity-90",
    outline: "border bg-card hover:bg-muted",
    ghost: "hover:bg-muted",
    danger: "bg-danger text-white hover:opacity-90",
  }[variant];
  const s = { sm: "h-8 px-3 text-[13px]", md: "h-9 px-4", icon: "h-9 w-9" }[size];
  return (
    <button ref={ref} disabled={disabled || loading} className={cn("inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap", v, s, className)} {...p}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}{children}
    </button>
  );
});

/* ───────── Form fields ───────── */
const field = "w-full rounded-lg border bg-card px-3 py-2 text-[14px] placeholder:text-muted-foreground/70 transition-colors focus:border-electric focus:outline-none focus:ring-2 focus:ring-electric/20 disabled:opacity-60";
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) { return <input ref={ref} className={cn(field, "h-9", className)} {...p} />; });
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...p }, ref) { return <textarea ref={ref} className={cn(field, "min-h-[80px] resize-y", className)} {...p} />; });
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...p }, ref) { return <select ref={ref} className={cn(field, "h-9 pr-8", className)} {...p}>{children}</select>; });
export function Field({ label, error, hint, children, className }: { label: string; error?: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-[13px] font-medium">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-muted-foreground">{hint}</span>}
      {error && <span className="block text-xs text-danger">{error}</span>}
    </label>
  );
}

/* ───────── Surfaces ───────── */
export function Card({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border bg-card shadow-soft", className)} {...p}>{children}</div>;
}
export function CardHeader({ title, subtitle, action }: { title: React.ReactNode; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5">
      <div><h3 className="font-semibold tracking-tight">{title}</h3>{subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}</div>
      {action}
    </div>
  );
}
export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap", className)}>{children}</span>;
}
export function Avatar({ name, color = "#2563eb", size = 36, status, url }: { name: string; color?: string; size?: number; status?: string; url?: string | null }) {
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      {url ? <img src={url} alt={name} className="h-full w-full rounded-full object-cover" /> : (
        <span className="flex h-full w-full items-center justify-center rounded-full font-semibold text-white" style={{ background: color, fontSize: size * 0.38 }} aria-label={name}>{initials(name)}</span>
      )}
      {status && <span className={cn("absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-card", AVAIL_DOT[status])} style={{ width: size * 0.3, height: size * 0.3 }} />}
    </span>
  );
}
export function ProgressBar({ value, className, color }: { value: number; className?: string; color?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-electric transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
    </div>
  );
}
export function Skeleton({ className }: { className?: string }) { return <div className={cn("animate-pulse rounded-lg bg-muted", className)} />; }
export function Spinner() { return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />; }
export function PageLoading() {
  return <div className="space-y-4 animate-in"><Skeleton className="h-8 w-56" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div><Skeleton className="h-72" /></div>;
}
export function EmptyState({ icon, title, text, action }: { icon?: React.ReactNode; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-12 text-center">
      {icon && <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">{icon}</div>}
      <p className="font-medium">{title}</p>{text && <p className="max-w-sm text-sm text-muted-foreground">{text}</p>}{action && <div className="mt-2">{action}</div>}
    </div>
  );
}
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
      <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{message}</span>
      {onRetry && <Button size="sm" variant="outline" onClick={onRetry}>Coba lagi</Button>}
    </div>
  );
}
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-semibold tracking-tight">{title}</h1>{subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}</div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; icon?: React.ReactNode }[] }) {
  return (
    <div role="tablist" className="inline-flex rounded-lg bg-muted p-1">
      {items.map((i) => (
        <button key={i.value} role="tab" aria-selected={value === i.value} onClick={() => onChange(i.value)}
          className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-all", value === i.value ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground")}>
          {i.icon}{i.label}
        </button>
      ))}
    </div>
  );
}

/* ───────── Modal / Drawer / Confirm ───────── */
function useLock(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = prev; };
  }, [open, onClose]);
}
export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  useLock(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cn("animate-in flex max-h-[92vh] w-full flex-col rounded-t-2xl border bg-card shadow-2xl sm:rounded-2xl", wide ? "sm:max-w-3xl" : "sm:max-w-lg")}>
        <div className="flex items-center justify-between border-b px-5 py-4"><h2 className="font-semibold">{title}</h2><Button variant="ghost" size="icon" onClick={onClose} aria-label="Tutup"><X className="h-4 w-4" /></Button></div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
export function Drawer({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: React.ReactNode; title: string }) {
  useLock(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-navy-950/40 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside role="dialog" aria-modal="true" aria-label={title} className="animate-slide flex h-full w-full max-w-2xl flex-col border-l bg-card shadow-2xl">{children}</aside>
    </div>
  );
}
export function ConfirmDialog({ open, onClose, onConfirm, title, text, confirmLabel = "Hapus" }: { open: boolean; onClose: () => void; onConfirm: () => Promise<void> | void; title: string; text: string; confirmLabel?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title={title} footer={<>
      <Button variant="outline" onClick={onClose}>Batal</Button>
      <Button variant="danger" loading={busy} onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } }}>{confirmLabel}</Button>
    </>}>
      <p className="text-sm text-muted-foreground">{text}</p>
    </Modal>
  );
}

/* ───────── Toast ───────── */
type Toast = { id: number; type: "success" | "error" | "info"; text: string };
const ToastCtx = createContext<(text: string, type?: Toast["type"]) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, type: Toast["type"] = "success") => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, type, text }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 4200);
  }, []);
  const Icon = { success: CheckCircle2, error: AlertTriangle, info: Info };
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2" aria-live="polite">
        {items.map((t) => { const I = Icon[t.type]; return (
          <div key={t.id} className="animate-in pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-card px-4 py-3 text-sm shadow-lg">
            <I className={cn("mt-0.5 h-4 w-4 shrink-0", t.type === "success" ? "text-success" : t.type === "error" ? "text-danger" : "text-electric")} /><span>{t.text}</span>
          </div>); })}
      </div>
    </ToastCtx.Provider>
  );
}

/* ───────── Pickers ───────── */
export type EmpLite = { id: string; name: string; title?: string; avatarColor: string; availability?: string };
export function EmployeePicker({ employees, value, onChange, single }: { employees: EmpLite[]; value: string[]; onChange: (v: string[]) => void; single?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {employees.map((e) => {
        const on = value.includes(e.id);
        return (
          <button type="button" key={e.id} aria-pressed={on}
            onClick={() => onChange(single ? (on ? [] : [e.id]) : on ? value.filter((v) => v !== e.id) : [...value, e.id])}
            className={cn("flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-[13px] transition-colors", on ? "border-electric bg-electric/10 text-foreground" : "hover:bg-muted text-muted-foreground")}>
            <Avatar name={e.name} color={e.avatarColor} size={22} />{e.name}
          </button>
        );
      })}
    </div>
  );
}
export function AvatarStack({ people, max = 4, size = 26 }: { people: { name: string; avatarColor: string }[]; max?: number; size?: number }) {
  const shown = people.slice(0, max);
  return (
    <div className="flex -space-x-2">
      {shown.map((p, i) => <span key={i} className="rounded-full ring-2 ring-card" title={p.name}><Avatar name={p.name} color={p.avatarColor} size={size} /></span>)}
      {people.length > max && <span className="flex items-center justify-center rounded-full bg-muted text-[11px] font-medium ring-2 ring-card" style={{ width: size, height: size }}>+{people.length - max}</span>}
    </div>
  );
}
export function StatCard({ label, value, hint, icon, tone = "text-electric" }: { label: string; value: React.ReactNode; hint?: string; icon: React.ReactNode; tone?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between"><span className="text-[13px] text-muted-foreground">{label}</span><span className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-muted", tone)}>{icon}</span></div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}
