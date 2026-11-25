// Menjalankan migrasi SQL di prisma/migrations secara berurutan (idempoten).
import { Client } from "pg";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import "dotenv/config";

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query(`CREATE TABLE IF NOT EXISTS _app_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMP DEFAULT now())`);
  const done = new Set((await c.query("SELECT name FROM _app_migrations")).rows.map((r) => r.name));
  for (const dir of readdirSync("prisma/migrations").filter((d) => existsSync(`prisma/migrations/${d}/migration.sql`)).sort()) {
    if (done.has(dir)) continue;
    console.log("apply", dir);
    await c.query("BEGIN");
    try {
      await c.query(readFileSync(`prisma/migrations/${dir}/migration.sql`, "utf8"));
      await c.query("INSERT INTO _app_migrations(name) VALUES ($1)", [dir]);
      await c.query("COMMIT");
    } catch (e) { await c.query("ROLLBACK"); throw e; }
  }
  await c.end();
  console.log("migrasi selesai");
}
main().catch((e) => { console.error(e); process.exit(1); });
