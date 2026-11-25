/** Jenis website dan daftar file crew ditentukan dari brief, bukan selalu portfolio. */

export type CrewPreset = "portfolio" | "event" | "blog" | "service" | "dashboard" | "generic";

export type FileSpec = { path: string; purpose: string };

export type RoleSpec = {
  key: string; name: string; title: string; focus: string;
  task: string; description: string; priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  note: string; files: FileSpec[];
};

export type SectionSpec = {
  path: string; component: string; key: string; label: string; purpose: string;
  owner: "hiroshi" | "min-jun";
};

export const CREW_PRESET_LABEL: Record<CrewPreset, string> = {
  portfolio: "portfolio pribadi",
  event: "event komunitas",
  blog: "blog artikel",
  service: "landing page jasa/bisnis",
  dashboard: "dashboard statistik",
  generic: "website umum",
};

const KEYWORDS: Record<Exclude<CrewPreset, "generic">, RegExp> = {
  event: /event|acara|komunitas|meetup|konferensi|seminar|workshop|agenda|pembicara|speaker|festival|konser|gathering/i,
  blog: /blog|artikel|posting|jurnal|tulisan|berita|news|kategori artikel/i,
  service: /jasa|layanan|landing page|bisnis|perusahaan|company profile|konsultasi|klinik|restoran|cafe|sekolah|produk digital/i,
  dashboard: /dashboard|statistik|analitik|analytics|laporan|grafik|chart|metric/i,
  portfolio: /portofolio|portfolio|resume| curriculum vitae|\bcv\b|profil pribadi|personal website/i,
};

/** Pilih preset dengan skor kemunculan kata kunci terbanyak; tanpa kecocokan jadi website umum. */
export function detectPreset(brief: string): CrewPreset {
  const text = (brief || "").toLowerCase();
  let best: CrewPreset = "generic";
  let score = 0;
  for (const [preset, pattern] of Object.entries(KEYWORDS) as [Exclude<CrewPreset, "generic">, RegExp][]) {
    const matches = text.match(pattern);
    const count = matches?.length ?? 0;
    if (count > score) {
      score = count;
      best = preset;
    }
  }
  return best;
}

const f = (path: string, purpose: string): FileSpec => ({ path, purpose });

const section = (
  key: string, label: string, purpose: string, owner: "hiroshi" | "min-jun" = "hiroshi",
): SectionSpec => ({
  path: `components/${key}.tsx`,
  component: key.split("-").map((s) => s[0].toUpperCase() + s.slice(1)).join(""),
  key, label, purpose, owner,
});

export const PRESET_SECTIONS: Record<CrewPreset, SectionSpec[]> = {
  portfolio: [],
  event: [
    section("hero", "Beranda", "Judul event, tanggal, lokasi, dan tombol daftar"),
    section("about", "Tentang event", "Penjelasan singkat tujuan acara"),
    section("agenda", "Agenda", "Jadwal kegiatan mulai sampai selesai"),
    section("speakers", "Pembicara", "Kartu pembicara beserta topiknya"),
    section("venue", "Lokasi", "Alamat dan tautan peta lokasi"),
    section("faq", "FAQ", "Pertanyaan yang sering diajukan"),
    section("cta", "Pendaftaran", "Ajak pengunjung mendaftar lewat tautan eksternal", "min-jun"),
    section("contact", "Kontak", "Email dan kanal komunitas"),
  ],
  blog: [
    section("hero", "Beranda", "Judul blog dan deskripsi singkat"),
    section("posts", "Artikel terbaru", "Daftar artikel dengan kartu ringkas"),
    section("categories", "Kategori", "Kelompok topik yang dibahas"),
    section("cta", "Berlangganan", "Ajak pembaca mengikuti kanal blog", "min-jun"),
    section("contact", "Kontak", "Email dan media sosial"),
  ],
  service: [
    section("hero", "Beranda", "Judul layanan, value proposition, dan tombol kontak"),
    section("services", "Layanan", "Daftar layanan yang ditawarkan"),
    section("process", "Alur kerja", "Tahapan collaboration dari awal sampai selesai"),
    section("testimonials", "Testimoni", "Kutipan singkat dari klien"),
    section("cta", "Hubungi kami", "Ajak calon klien menghubungi lewat email/WhatsApp", "min-jun"),
    section("contact", "Kontak", "Detail kontak bisnis"),
  ],
  dashboard: [
    section("hero", "Ringkasan", "Judul dashboard dan periode data"),
    section("stats", "Statistik utama", "Kartu angka penting dari data contoh"),
    section("table", "Tabel data", "Tabel ringkas dengan status dan nilai"),
    section("cta", "Unduh laporan", "Tautan unduh laporan contoh", "min-jun"),
    section("contact", "Kontak", "Kanal untuk pertanyaan"),
  ],
  generic: [
    section("hero", "Beranda", "Judul website dan ringkasan sesuai brief"),
    section("about", "Tentang", "Penjelasan singkat isi website"),
    section("features", "Fitur", "Poin-poin utama yang dijelaskan di brief"),
    section("cta", "Mulai", "Ajak pengunjung melakukan langkah berikutnya", "min-jun"),
    section("contact", "Kontak", "Tautan kontak yang disebut di brief"),
  ],
};

const CONFIG_FILES: FileSpec[] = [
  f("package.json", "Dependensi Next.js, React, TypeScript, Tailwind, Lucide"),
  f("tsconfig.json", "TypeScript strict + alias @/*"),
  f("next.config.mjs", "Konfigurasi Next.js untuk Vercel"),
  f("postcss.config.mjs", "Plugin Tailwind dan autoprefixer"),
  f("tailwind.config.ts", "Token warna dan konten App Router"),
];

const BASE_UI_FILES: FileSpec[] = [
  f("app/globals.css", "Base style Tailwind, container, dan kartu"),
  f("components/section-heading.tsx", "Heading section konsisten"),
  f("components/reveal.tsx", "Wrapper animasi ringan yang hormati reduced motion"),
  f("public/hero-placeholder.svg", "Ilustrasi placeholder sesuai nama website"),
];

const LAYOUT_FILES: FileSpec[] = [
  f("app/layout.tsx", "Root layout dan metadata SEO dari data/site"),
  f("app/page.tsx", "Komposisi seluruh section sesuai brief"),
  f("components/site-header.tsx", "Header responsif dengan navigasi section"),
  f("components/site-footer.tsx", "Footer sederhana"),
];

/** Daftar file asli (portfolio) dipertahankan supaya run lama tidak berubah perilakunya. */
const PORTFOLIO_ROLES: RoleSpec[] = [
  { key: "annas", name: "Annas", title: "Founder & CEO", focus: "scope, prioritas, dan kriteria selesai", task: "Tetapkan scope & prioritas website", description: "Terjemahkan brief menjadi tujuan, batasan Scope, prioritas fitur, dan kriteria selesai.", priority: "HIGH", note: "Scope dan prioritas ditetapkan berdasarkan brief. Prioritaskan UI/UX, responsive, navigasi yang berfungsi, then konten dan SEO.", files: [] },
  { key: "arjun", name: "Arjun", title: "COO", focus: "WBS, urutan kerja, dan tenggat", task: "Susun WBS & urutan kerja crew", description: "Uraikan deliverable per divisi dan tentukan urutan eksekusi yang saling bergantung.", priority: "MEDIUM", note: "Urutan kerja: Annas → Arjun → Kenji → Mei Lin → Hiroshi → Min-jun → Aisha → Wei.", files: [f("README.md", "Ringkasan proyek, cara menjalankan lokal di port 3001, dan catatan deploy Vercel")] },
  { key: "kenji", name: "Kenji", title: "CTO", focus: "arsitektur Next.js App Router dan konfigurasi build", task: "Tentukan arsitektur & setup proyek", description: "Pilih struktur App Router, data statis, konfigurasi TypeScript/Tailwind/PostCSS, dan strategi SEO dasar.", priority: "HIGH", note: "Arsitektur: App Router, TypeScript strict, Tailwind CSS, data statis di folder data/, metadata di layout, tanpa backend.", files: CONFIG_FILES },
  { key: "mei-lin", name: "Mei Lin", title: "UI/UX Designer", focus: "design system hitam/putih/dark navy, spacing, dan motion guideline", task: "Buat design system & wireframe 7 section", description: "Tetapkan token visual, tipografi, spacing, state hover/focus, dan guideline animasi subtle.", priority: "HIGH", note: "Design system: hitam/putih/dark navy, whitespace proporsional, tipografi clean, animasi halus, hormati prefers-reduced-motion.", files: [
    f("app/globals.css", "Base style Tailwind, smooth scroll, container, kartu"),
    f("components/section-heading.tsx", "Heading section konsisten dengan eyebrow"),
    f("components/reveal.tsx", "Wrapper animasi Framer Motion dengan useReducedMotion"),
    f("public/avatar.svg", "Placeholder foto profesional"),
    f("public/project-knowledge-base.svg", "Thumbnail placeholder Knowledge Base"),
    f("public/project-kost.svg", "Thumbnail placeholder Sistem Informasi Kost"),
  ] },
  { key: "hiroshi", name: "Hiroshi", title: "Lead Full-Stack Developer", focus: "layout, komponen, dan halaman utama", task: "Implementasi layout & section utama", description: "Bangun App Router layout, halaman utama, header/footer navigasi, Hero, About, dan Projects.", priority: "HIGH", note: "Implementasi memakai komponen dari Mei Lin dan config dari Kenji. Semua navigation link mengarah ke anchor section yang benar.", files: [...LAYOUT_FILES, ...["hero", "about", "projects", "contact"].map((k) => f(`components/${k}.tsx`, `Section ${k}`))] },
  { key: "min-jun", name: "Min-jun", title: "AI Engineer", focus: "mikro-interaksi ringan dan aksesibilitas gerak", task: "Implementasi section interaktif", description: "Bangun Skills, Experience, dan Certifications dengan animasi halus serta dukungan reduced motion.", priority: "MEDIUM", note: "Gunakan Reveal dari Mei Lin. Hindari animasi berat; cukup fade/slide 16px dan transisi hover.", files: ["skills", "experience", "certifications"].map((k) => f(`components/${k}.tsx`, `Section ${k}`)) },
  { key: "aisha", name: "Aisha", title: "Data Analyst", focus: "konten profesional, data statis, dan metadata SEO", task: "Tulis konten & data profesional", description: "Isi seluruh file data berdasarkan profil Annas Firman dan siapkan metadata/OG.", priority: "HIGH", note: "Konten: Annas Firman, S1 Sistem Informasi Universitas Bina Bangsa (E-Business), internship Diskominfo Banten.", files: ["profile", "skills", "experience", "projects", "certifications"].map((k) => f(`data/${k}.ts`, `Data ${k}`)) },
  { key: "wei", name: "Wei Zhang", title: "QA & Security Engineer", focus: "QA responsif, aksesibilitas, performa, dan link", task: "Review QA & keamanan hasil crew", description: "Baca seluruh file yang sudah dibuat, lalu tulis checklist temuan dan perbaikan yang disarankan.", priority: "MEDIUM", note: "QA checklist: section hadir, link/CTA nyata, reduced motion, kontras teks, layout mobile/desktop, metadata/OG, tidak ada kredensial.", files: [] },
];

const BASE_ROLES: RoleSpec[] = PORTFOLIO_ROLES.map((r) => ({ ...r }));

function filesForPreset(preset: Exclude<CrewPreset, "portfolio">): Record<string, FileSpec[]> {
  const label = CREW_PRESET_LABEL[preset];
  const sections = PRESET_SECTIONS[preset];
  const owned = (owner: "hiroshi" | "min-jun") =>
    sections.filter((s) => s.owner === owner).map((s) => f(s.path, s.purpose));
  return {
    annas: [],
    arjun: [f("README.md", `Ringkasan website ${label}, cara menjalankan lokal, dan catatan deploy Vercel`)],
    kenji: CONFIG_FILES.map((file) => ({ ...file })),
    "mei-lin": BASE_UI_FILES.map((file) => ({ ...file })),
    hiroshi: [...LAYOUT_FILES.map((file) => ({ ...file })), ...owned("hiroshi")],
    "min-jun": owned("min-jun"),
    aisha: [f("data/site.ts", `Seluruh teks website ${label} berdasarkan brief: judul, ringkasan, tiap section, dan kontak`)],
    wei: [],
  };
}

/** Rencana kerja (termasuk daftar file) mengikuti jenis website pada brief. */
export function rolesForBrief(brief: string): RoleSpec[] {
  const preset = detectPreset(brief);
  if (preset === "portfolio") {
    return PORTFOLIO_ROLES.map((r) => ({ ...r, files: r.files.map((file) => ({ ...file })) }));
  }
  const label = CREW_PRESET_LABEL[preset];
  const files = filesForPreset(preset);
  return BASE_ROLES.map((r) => {
    const role: RoleSpec = { ...r, files: (files[r.key] ?? []).map((file) => ({ ...file })) };
    if (r.key === "hiroshi") {
      role.task = `Implementasi halaman ${label}`;
      role.description = `Bangun layout dan seluruh section website ${label} sesuai brief. Semua tautan navigasi mengarah ke section yang benar.`;
    }
    if (r.key === "min-jun" && role.files.length) {
      role.task = `Implementasi ajakan bertindak ${label}`;
      role.description = "Buat komponen CTA ringan dengan dukungan reduced motion.";
    }
    if (r.key === "aisha") {
      role.task = `Tulis konten ${label}`;
      role.description = `Isi data/site.ts berdasarkan brief ${label} dan siapkan metadata/OG.`;
    }
    if (r.key === "wei") {
      role.description = `Baca seluruh file website ${label}, lalu tulis checklist temuan dan perbaikan.`;
    }
    return role;
  });
}
