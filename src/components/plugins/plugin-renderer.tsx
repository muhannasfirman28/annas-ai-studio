"use client";

import { Puzzle } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { PLUGIN_COMPONENTS } from "./registry";

/** Merender komponen plugin yang sesuai dengan manifest. */
export function PluginRenderer({ id }: { id: string }) {
  const Component = PLUGIN_COMPONENTS[id];
  if (!Component) {
    return <EmptyState icon={<Puzzle className="h-5 w-5" />} title="Plugin tidak tersedia" text="Komponen untuk plugin ini belum dipasang." />;
  }
  return <Component />;
}
