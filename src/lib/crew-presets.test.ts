import { test } from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import { detectPreset, rolesForBrief } from "./crew-presets";
import { templateFile } from "./crew-templates";

const eventBrief = `# WEBSITE PROJECT SPECIFICATION
Nama: Tech Meetup 2026
Tujuan: website event komunitas teknologi untuk mengajak orang mendaftar.
Halaman: Hero, Tentang event, Agenda, Pembicara, Lokasi, FAQ, Kontak.
Gaya: modern, biru tua dengan aksen ungu, responsif.
Tech: Next.js App Router, TypeScript, Tailwind CSS.
Konten: Tech Meetup 2026; 12 Desember 2026; Banten; gratis; membawa laptop.
Kontak: email komunitas dan grup WhatsApp.
Prioritas: navigasi berfungsi dan tombol daftar jelas.`;

test("deteksi jenis website dari brief", () => {
  assert.equal(detectPreset(eventBrief), "event");
  assert.equal(detectPreset("Blog artikel dengan kategori dan daftar posting"), "blog");
  assert.equal(detectPreset("Landing page jasa konsultasi perusahaan"), "service");
  assert.equal(detectPreset("Dashboard statistik dan grafik penjualan"), "dashboard");
  assert.equal(detectPreset("Portofolio pribadi berisi pengalaman dan skill"), "portfolio");
  assert.equal(detectPreset("Website sederhana untuk informasi"), "generic");
});

test("rencana file event tidak memakai struktur portfolio", () => {
  const paths = rolesForBrief(eventBrief).flatMap((role) => role.files.map((file) => file.path));
  assert.ok(paths.includes("components/agenda.tsx"));
  assert.ok(paths.includes("components/speakers.tsx"));
  assert.ok(paths.includes("data/site.ts"));
  assert.ok(!paths.includes("data/profile.ts"));
  assert.ok(!paths.includes("components/skills.tsx"));
  assert.ok(!paths.includes("components/certifications.tsx"));
});

test("template event berisi judul dan section event", () => {
  const page = templateFile("app/page.tsx", eventBrief);
  assert.match(page, /import Agenda from "@\/components\/agenda"/);
  assert.match(page, /<Speakers \/>/);
  assert.doesNotMatch(page, /Projects/);

  const data = templateFile("data/site.ts", eventBrief);
  assert.match(data, /"Tech Meetup 2026"/);
  assert.match(data, /agenda:/);
  assert.match(data, /speakers:/);
});

test("semua file yang direncanakan punya template nyata dan kode TS/TSX valid", () => {
  for (const role of rolesForBrief(eventBrief)) {
    for (const file of role.files) {
      const content = templateFile(file.path, eventBrief);
      assert.ok(!content.includes("File ini dibuat oleh crew"), `template kosong: ${file.path}`);
      if (/\.(ts|tsx)$/.test(file.path)) {
        const source = ts.createSourceFile(file.path, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX) as unknown as {
          parseDiagnostics: ts.Diagnostic[];
        };
        assert.equal(source.parseDiagnostics.length, 0, `sintaks invalid: ${file.path}`);
      }
    }
  }
});

test("portfolio tetap memakai template portfolio lama", () => {
  const portfolioBrief = "Nama: Annas Firman\nTujuan: portofolio pribadi pengalaman kerja";
  const paths = rolesForBrief(portfolioBrief).flatMap((role) => role.files.map((file) => file.path));
  assert.ok(paths.includes("data/profile.ts"));
  assert.match(templateFile("app/page.tsx", portfolioBrief), /Hero/);
});
