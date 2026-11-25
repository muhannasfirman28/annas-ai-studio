"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import { api } from "@/lib/client";

function LoginForm() {
  const sp = useSearchParams();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      await api("/api/auth/login", { body: { email, password } });
      const next = sp.get("next");
      location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    } catch (err) { setError((err as Error).message); setLoading(false); }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Email"><Input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@annasai.studio" /></Field>
      <Field label="Password"><Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      {error && <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <Button type="submit" variant="accent" className="w-full" loading={loading}>Masuk <ArrowRight className="h-4 w-4" /></Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-navy-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-electric/20 blur-3xl" aria-hidden />
        <div className="relative flex items-center gap-2.5 text-lg font-semibold"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-electric"><Sparkles className="h-5 w-5" /></span>Annas AI Studio</div>
        <div className="relative max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">Innovating Technology, Empowering the Future.</h1>
          <p className="mt-4 text-slate-300">Pusat kendali perusahaan teknologi berbasis AI: karyawan, proyek, tugas, kolaborasi, dan laporan dalam satu tempat.</p>
        </div>
        <p className="relative text-xs text-slate-400">© Annas AI Studio — Founder & CEO: Annas</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8"><h2 className="text-2xl font-semibold tracking-tight">Masuk</h2><p className="mt-1 text-sm text-muted-foreground">Gunakan akun yang diberikan oleh Founder.</p></div>
          <Suspense><LoginForm /></Suspense>
        </div>
      </section>
    </main>
  );
}
