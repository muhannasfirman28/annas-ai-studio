"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { api, useApi } from "@/lib/client";
import type { PluginView } from "@/lib/plugins/types";
import { Badge, Button, Card, CardHeader, ErrorState, PageLoading, useToast } from "@/components/ui";
import { useApp } from "./app-context";
import { PluginIcon } from "./plugins/registry";

type PluginsResponse = { plugins: PluginView[] };

export function PluginSettings() {
  const { can } = useApp();
  const writable = can("settings.write");
  const toast = useToast();
  const { data, error, loading, reload, setData } = useApi<PluginsResponse>("/api/plugins");
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(plugin: PluginView) {
    if (!writable) return;
    const next = !plugin.enabled;
    setBusy(plugin.id);
    setData((prev) => (prev ? { plugins: prev.plugins.map((p) => (p.id === plugin.id ? { ...p, enabled: next } : p)) } : prev));
    try {
      await api(`/api/plugins/${plugin.id}`, { method: "PATCH", body: { enabled: next } });
      toast(`${plugin.name} ${next ? "diaktifkan" : "dinonaktifkan"}.`);
    } catch (e) {
      toast((e as Error).message, "error");
      void reload();
    } finally {
      setBusy(null);
    }
  }

  if (loading && !data) return <PageLoading />;
  if (error || !data) return <ErrorState message={error ?? "Gagal memuat plugin"} onRetry={reload} />;

  return (
    <Card>
      <CardHeader title="Plugin" subtitle="Modul tambahan yang bisa diaktifkan atau dinonaktifkan. Nonaktif membuat halaman plugin tidak dapat diakses. Status dapat diubah oleh Founder dan Executive." />
      <div className="divide-y p-2">
        {data.plugins.map((plugin) => (
          <div key={plugin.id} className="flex flex-wrap items-start gap-3 px-3 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-electric"><PluginIcon name={plugin.icon} className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{plugin.name}</span>
                <Badge className={plugin.enabled ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}>{plugin.enabled ? "Aktif" : "Nonaktif"}</Badge>
                <span className="text-[11px] text-muted-foreground">v{plugin.version}</span>
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground">{plugin.description}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button size="sm" variant={plugin.enabled ? "outline" : "accent"} disabled={!writable || busy === plugin.id} loading={busy === plugin.id} aria-pressed={plugin.enabled} onClick={() => toggle(plugin)}>
                  {plugin.enabled ? "Nonaktifkan" : "Aktifkan"}
                </Button>
                {plugin.enabled && <Link href={plugin.route} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium text-electric hover:bg-electric/10">Buka plugin <ExternalLink className="h-3.5 w-3.5" /></Link>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
