"use client";
import { createContext, useContext } from "react";

export type Me = { id: string; name: string; email: string; role: "FOUNDER" | "EXECUTIVE" | "MANAGER" | "EMPLOYEE"; employeeId: string | null; avatarColor: string; title: string };
type Ctx = { me: Me; permissions: string[]; can: (p: string) => boolean };
export const AppCtx = createContext<Ctx | null>(null);
export function useApp() { const c = useContext(AppCtx); if (!c) throw new Error("AppCtx"); return c; }
export const makeCan = (perms: string[]) => (p: string) => perms.includes("*") || perms.includes(p);
