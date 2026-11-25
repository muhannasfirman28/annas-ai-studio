import { test } from "node:test";
import assert from "node:assert/strict";
import { archiveNameFor, slugifyArchiveName } from "./archive-name";
import { detectPreset } from "./crew-presets";

const eventBrief = `# WEBSITE PROJECT SPECIFICATION

Nama: Tech Meetup Banten 2026
Tujuan: website event komunitas teknologi untuk mengajak orang mendaftar.
Halaman: Beranda, Tentang event, Agenda, Pembicara, Lokasi, FAQ, Kontak.
Konten: Tech Meetup Banten 2026; 12 Desember 2026; Serang; gratis.
Prioritas: navigasi berfungsi dan tombol daftar jelas.`;

test("nama arsip mengikuti judul brief, bukan portfolio", () => {
  const result = archiveNameFor(eventBrief, "Proyek Baru", "cm123456789");
  assert.equal(result.name, "Tech Meetup Banten 2026");
  assert.equal(result.slug, "tech-meetup-banten-2026");
  assert.doesNotMatch(result.slug, /porto|portfolio/i);
});

test("slug aman untuk aksara, simbol, dan path", () => {
  assert.equal(slugifyArchiveName("Tech Mêetup — Banten! 2026"), "tech-meetup-banten-2026");
  assert.equal(slugifyArchiveName("../evil/path"), "evil-path");
  assert.equal(slugifyArchiveName("   "), "website");
});

test("fallback memakai nama proyek lalu id bila brief tanpa Nama", () => {
  assert.deepEqual(archiveNameFor("Tujuan: event komunitas", "Website Event", "cm123456789"), {
    name: "Website Event",
    slug: "website-event",
  });
  assert.deepEqual(archiveNameFor("", "   ", "cm123456789"), {
    name: "website-cm123456",
    slug: "website-cm123456",
  });
});

test("jenis website untuk manifest tetap terdeteksi dari brief", () => {
  assert.equal(detectPreset(eventBrief), "event");
});
