// Menghasilkan SQL migrasi dari DMMF Prisma. Dipakai di environment tanpa akses ke
// binary schema-engine. Di mesin biasa cukup gunakan `prisma migrate dev`.
import { getDMMF } from "@prisma/internals";
import { writeFileSync } from "node:fs";

async function main() {
const dm = (await getDMMF({ datamodel: (await import("node:fs")).readFileSync("prisma/schema.prisma", "utf8") })).datamodel as any;
const q = (s: string) => `"${s}"`;
const T: Record<string, string> = { String: "TEXT", Int: "INTEGER", Boolean: "BOOLEAN", DateTime: "TIMESTAMP(3)", Float: "DOUBLE PRECISION", Json: "JSONB" };
const out: string[] = [];

for (const e of dm.enums as any[]) out.push(`CREATE TYPE ${q(e.name)} AS ENUM (${e.values.map((v) => `'${v.name}'`).join(", ")});`);
const tbl = (m: { name: string; dbName?: string | null }) => m.dbName ?? m.name;
const byName = Object.fromEntries(dm.models.map((m: any) => [m.name, m]));
const fks: string[] = [];
const idx: string[] = [];

for (const m of dm.models) {
  const cols: string[] = [];
  for (const f of m.fields as any[]) {
    if (f.kind === "object") continue;
    let t = f.kind === "enum" ? q(f.type) : T[f.type];
    if (f.isList) t += "[]";
    let c = `${q(f.name)} ${t}`;
    if (f.isRequired && !f.isList) c += " NOT NULL";
    const d: any = f.default;
    if (d !== undefined && d !== null && !f.isList) {
      if (typeof d === "object" && "name" in d) {
        if (d.name === "now") c += " DEFAULT CURRENT_TIMESTAMP";
      } else if (f.kind === "enum") c += ` DEFAULT '${d}'::${q(f.type)}`;
      else if (f.type === "String") c += ` DEFAULT '${String(d).replace(/'/g, "''")}'`;
      else if (f.type === "Json") c += ` DEFAULT '${typeof d === "string" ? d : JSON.stringify(d)}'::jsonb`;
      else c += ` DEFAULT ${d}`;
    }
    cols.push(c);
  }
  const pk = m.fields.filter((f) => f.isId).map((f) => q(f.name));
  cols.push(`CONSTRAINT ${q(tbl(m) + "_pkey")} PRIMARY KEY (${pk.join(", ")})`);
  out.push(`CREATE TABLE ${q(tbl(m))} (\n  ${cols.join(",\n  ")}\n);`);

  for (const f of m.fields as any[]) if (f.isUnique && !f.isId && f.kind !== "object") idx.push(`CREATE UNIQUE INDEX ${q(`${tbl(m)}_${f.name}_key`)} ON ${q(tbl(m))}(${q(f.name)});`);
  for (const u of m.uniqueFields) idx.push(`CREATE UNIQUE INDEX ${q(`${tbl(m)}_${u.join("_")}_key`)} ON ${q(tbl(m))}(${u.map(q).join(", ")});`);

  for (const f of m.fields as any[]) {
    if (f.kind !== "object" || !f.relationFromFields?.length) continue;
    const ref = byName[f.type];
    const del = f.relationOnDelete === "Cascade" ? "CASCADE" : f.relationOnDelete === "SetNull" ? "SET NULL" : f.isRequired ? "RESTRICT" : "SET NULL";
    fks.push(`ALTER TABLE ${q(tbl(m))} ADD CONSTRAINT ${q(`${tbl(m)}_${f.relationFromFields[0]}_fkey`)} FOREIGN KEY (${f.relationFromFields.map(q).join(", ")}) REFERENCES ${q(tbl(ref))}(${(f.relationToFields ?? []).map(q).join(", ")}) ON DELETE ${del} ON UPDATE CASCADE;`);
  }
}

// relasi many-to-many implisit
const seen = new Set<string>();
for (const m of dm.models) for (const f of m.fields as any[]) {
  if (f.kind !== "object" || !f.isList || !f.relationName || seen.has(f.relationName)) continue;
  const other = byName[f.type].fields.find((o) => o.relationName === f.relationName && o !== f);
  if (!other?.isList) continue;
  seen.add(f.relationName);
  const jt = `_${f.relationName}`;
  out.push(`CREATE TABLE ${q(jt)} (\n  "A" TEXT NOT NULL,\n  "B" TEXT NOT NULL\n);`);
  idx.push(`CREATE UNIQUE INDEX ${q(jt + "_AB_unique")} ON ${q(jt)}("A", "B");`, `CREATE INDEX ${q(jt + "_B_index")} ON ${q(jt)}("B");`);
  fks.push(`ALTER TABLE ${q(jt)} ADD CONSTRAINT ${q(jt + "_A_fkey")} FOREIGN KEY ("A") REFERENCES ${q(tbl(m))}("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  fks.push(`ALTER TABLE ${q(jt)} ADD CONSTRAINT ${q(jt + "_B_fkey")} FOREIGN KEY ("B") REFERENCES ${q(tbl(byName[f.type]))}("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
}

// indeks non-unik (@@index)
idx.push(
  `CREATE INDEX "tasks_status_idx" ON "tasks"("status");`,
  `CREATE INDEX "tasks_deadline_idx" ON "tasks"("deadline");`,
  `CREATE INDEX "task_activity_logs_taskId_idx" ON "task_activity_logs"("taskId");`,
  `CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");`,
  `CREATE INDEX "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");`,
  `CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");`,
);

writeFileSync("prisma/migrations/0001_init/migration.sql", [...out, ...idx, ...fks].join("\n\n") + "\n");
console.log("OK", out.length, "objek,", fks.length, "FK");
}
main();
