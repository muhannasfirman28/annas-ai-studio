import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || "dev-insecure-secret-change-me-please-32chars");

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("aas_session")?.value;
  let valid = false;
  if (token) { try { await jwtVerify(token, secret()); valid = true; } catch { valid = false; } }
  if (pathname === "/login") return valid ? NextResponse.redirect(new URL("/", req.url)) : NextResponse.next();
  if (!valid) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Sesi berakhir. Silakan login kembali." }, { status: 401 });
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth/login).*)"] };
