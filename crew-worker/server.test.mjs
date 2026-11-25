import assert from "node:assert/strict";
import test from "node:test";
import { extractNote, normalizeWorkerPath } from "./server.mjs";

test("normalizeWorkerPath menerima path allowlist", () => {
  assert.equal(normalizeWorkerPath("app/page.tsx"), "app/page.tsx");
  assert.equal(normalizeWorkerPath("./components/reveal.tsx"), "components/reveal.tsx");
  assert.equal(normalizeWorkerPath("package.json"), "package.json");
});

test("normalizeWorkerPath menolak path berbahaya", () => {
  for (const bad of ["../app/page.tsx", ".env", "app/../../secret.ts", "node_modules/x.ts", "src/main.ts", "/etc/passwd"]) {
    assert.throws(() => normalizeWorkerPath(bad), `path harus ditolak: ${bad}`);
  }
});

test("extractNote mengambil note dari JSON assistant terakhir", () => {
  const notes = extractNote([
    { type: "assistant", content: [{ type: "text", text: "kerja lama" }] },
    { type: "assistant", content: [{ type: "text", text: '{"note":"scope ditetapkan"}' }] },
  ]);
  assert.equal(notes, "scope ditetapkan");
});

test("extractNote mengambil NOTE: dan mengabaikan tool", () => {
  const notes = extractNote([
    { type: "assistant", content: [{ type: "text", text: "NOTE: QA selesai" }] },
    { type: "assistant", content: [{ type: "tool", name: "read" }, { type: "text", text: " NOTE: hasil akhir " }] },
  ]);
  assert.equal(notes, "hasil akhir");
});
