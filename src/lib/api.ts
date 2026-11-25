import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSession, type SessionUser } from "./auth";
import { can } from "./rbac";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const bad = (m: string) => new HttpError(400, m);

type Ctx = { params: Promise<Record<string, string>> };
type Fn = (req: NextRequest, ctx: { user: SessionUser; params: Record<string, string> }) => Promise<unknown>;

/** Membungkus route handler: autentikasi, cek permission, validasi error, error handling. */
export function route(perm: string | null, fn: Fn) {
  return async (req: NextRequest, ctx: Ctx) => {
    try {
      const user = await getSession();
      if (!user) throw new HttpError(401, "Sesi berakhir. Silakan login kembali.");
      if (perm && !(await can(user.role, perm))) throw new HttpError(403, "Anda tidak memiliki izin untuk tindakan ini.");
      const out = await fn(req, { user, params: ctx?.params ? await ctx.params : {} });
      return out instanceof Response ? out : NextResponse.json(out ?? { ok: true });
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) {
        return NextResponse.json({ error: e.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ") }, { status: 400 });
      }
      const code = (e as { code?: string })?.code;
      if (code === "P2002") return NextResponse.json({ error: "Data duplikat: nilai sudah digunakan." }, { status: 409 });
      if (code === "P2025") return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });
      console.error(e);
      return NextResponse.json({ error: "Terjadi kesalahan pada server." }, { status: 500 });
    }
  };
}
export const json = async (req: NextRequest) => {
  try { return await req.json(); } catch { throw bad("Body JSON tidak valid."); }
};
