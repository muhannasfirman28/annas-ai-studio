"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export async function api<T = any>(url: string, opts: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const res = await fetch(url, {
    method: opts.method ?? (opts.body || opts.form ? "POST" : "GET"),
    headers: opts.body ? { "Content-Type": "application/json" } : undefined,
    body: opts.form ?? (opts.body ? JSON.stringify(opts.body) : undefined),
  });
  if (res.status === 401 && typeof window !== "undefined" && !location.pathname.startsWith("/login")) {
    location.href = "/login?next=" + encodeURIComponent(location.pathname);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Permintaan gagal (${res.status})`);
  return data as T;
}

export function useApi<T = any>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!url);
  const seq = useRef(0);
  const load = useCallback(async (silent = false) => {
    if (!url) return;
    const id = ++seq.current;
    if (!silent) setLoading(true);
    try { const d = await api<T>(url); if (id === seq.current) { setData(d); setError(null); } }
    catch (e) { if (id === seq.current) setError((e as Error).message); }
    finally { if (id === seq.current) setLoading(false); }
  }, [url]);
  useEffect(() => { load(); }, [load]);
  return { data, error, loading, reload: () => load(true), setData };
}

export function useDebounced<T>(v: T, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}
