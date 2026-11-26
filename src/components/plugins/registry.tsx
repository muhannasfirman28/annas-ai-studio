"use client";

import type { ComponentType } from "react";
import { Building2 } from "lucide-react";
import type { PluginIconName } from "@/lib/plugins/types";
import { OfficePlugin } from "./office-plugin";

/** Komponen UI plugin, dipetakan berdasarkan id manifest. */
export const PLUGIN_COMPONENTS: Record<string, ComponentType> = {
  office: OfficePlugin,
};

const ICONS = { Building2 } satisfies Record<PluginIconName, typeof Building2>;

export function PluginIcon({ name, className }: { name: PluginIconName; className?: string }) {
  const Icon = ICONS[name];
  return <Icon className={className} />;
}
