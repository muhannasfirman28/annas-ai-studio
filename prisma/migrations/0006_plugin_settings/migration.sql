-- Status aktif plugin. Manifest plugin tetap berada di src/lib/plugins/registry.ts.
CREATE TABLE IF NOT EXISTS "plugin_settings" (
  "pluginId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("pluginId")
);
