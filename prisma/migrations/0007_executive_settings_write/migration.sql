-- Executive perlu settings.write agar dapat mengaktifkan/menonaktifkan plugin.
UPDATE "roles"
SET "permissions" = array_append("permissions", 'settings.write')
WHERE "key" = 'EXECUTIVE'
  AND NOT ('settings.write' = ANY("permissions"));
