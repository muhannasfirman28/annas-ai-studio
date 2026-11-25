/** Template sumber Next.js untuk hasil kerja crew. Dipakai bila LLM tidak menghasilkan konten valid. */

const nameFrom = (brief: string) => /nama\s*[:\-]\s*([^\n]+)/i.exec(brief)?.[1]?.trim() || "Annas Firman";

export function templateFile(path: string, brief: string): string {
  const name = nameFrom(brief);
  const map: Record<string, string> = {
    "package.json": `{
  "name": "portfolio-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001"
  },
  "dependencies": {
    "framer-motion": "^12.0.0",
    "lucide-react": "^0.468.0",
    "next": "^15.5.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.0"
  }
}
`,
    "tsconfig.json": `{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
`,
    "next.config.mjs": `/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true };
export default nextConfig;
`,
    "postcss.config.mjs": `export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
`,
    "tailwind.config.ts": `import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./data/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { navy: "#0a1530", ink: "#0b1220", mist: "#f5f7fb" },
      fontFamily: { sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
`,
    "app/globals.css": `@tailwind base;
@tailwind components;
@tailwind utilities;

:root { color-scheme: light; }
html { scroll-behavior: smooth; }
body { @apply bg-white text-slate-800 antialiased; }
section { scroll-margin-top: 5rem; }
.container-page { @apply mx-auto w-full max-w-6xl px-5 sm:px-8; }
.card { @apply rounded-2xl border border-slate-200 bg-white p-6 shadow-sm; }
`,
    "app/layout.tsx": `import type { Metadata } from "next";
import "./globals.css";
import { profile } from "@/data/profile";

export const metadata: Metadata = {
  title: profile.title,
  description: profile.summary,
  openGraph: { title: profile.title, description: profile.summary, type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="id"><body>{children}</body></html>;
}
`,
    "app/page.tsx": `import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import Hero from "@/components/hero";
import About from "@/components/about";
import Skills from "@/components/skills";
import Experience from "@/components/experience";
import Projects from "@/components/projects";
import Certifications from "@/components/certifications";
import Contact from "@/components/contact";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <About />
        <Skills />
        <Experience />
        <Projects />
        <Certifications />
        <Contact />
      </main>
      <SiteFooter />
    </>
  );
}
`,
    "components/site-header.tsx": `"use client";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { nav } from "@/data/profile";

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className={\`fixed inset-x-0 top-0 z-50 transition-colors \${scrolled ? "border-b border-slate-200 bg-white/90 backdrop-blur" : "bg-transparent"}\`}>
      <div className="container-page flex h-16 items-center justify-between">
        <a href="#home" className="font-semibold tracking-tight text-navy">ANNAS<span className="text-slate-400">.dev</span></a>
        <nav className="hidden items-center gap-7 text-sm text-slate-600 md:flex">
          {nav.map((n) => <a key={n.href} href={n.href} className="transition-colors hover:text-navy">{n.label}</a>)}
        </nav>
        <button className="rounded-lg border p-2 md:hidden" onClick={() => setOpen(!open)} aria-label="Buka menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && <nav className="container-page grid gap-1 border-t bg-white pb-4 pt-2 text-sm md:hidden">
        {nav.map((n) => <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 hover:bg-slate-50">{n.label}</a>)}
      </nav>}
    </header>
  );
}
`,
    "components/site-footer.tsx": `import { profile } from "@/data/profile";

export default function SiteFooter() {
  return (
    <footer className="border-t bg-navy py-8 text-slate-300">
      <div className="container-page flex flex-wrap items-center justify-between gap-4 text-sm">
        <span>© {new Date().getFullYear()} {profile.name}. Dibangun dengan Next.js.</span>
        <span className="text-slate-400">Full-Stack Web Developer</span>
      </div>
    </footer>
  );
}
`,
    "components/reveal.tsx": `"use client";
import { motion, useReducedMotion } from "framer-motion";

export default function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? undefined : { opacity: 0, y: 16 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
`,
    "components/section-heading.tsx": `export default function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mb-10 max-w-2xl">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{eyebrow}</span>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-navy sm:text-4xl">{title}</h2>
      {description && <p className="mt-3 text-slate-600">{description}</p>}
    </div>
  );
}
`,
    "components/hero.tsx": `import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { profile } from "@/data/profile";
import Reveal from "@/components/reveal";

export default function Hero() {
  return (
    <section id="home" className="relative overflow-hidden bg-navy pt-32 text-white">
      <div className="pointer-events-none absolute -right-24 top-20 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
      <div className="container-page relative grid gap-12 pb-24 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
        <Reveal>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">Portfolio — {new Date().getFullYear()}</p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Halo, saya <span className="text-white">{profile.name}</span>.
            <span className="mt-2 block text-slate-400">{profile.role}.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-slate-300">{profile.summary}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href="#projects" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-navy transition hover:bg-slate-100">Lihat proyek <ArrowUpRight className="h-4 w-4" /></a>
            <a href="#contact" className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold transition hover:bg-white/10">Hubungi saya <ArrowDownRight className="h-4 w-4" /></a>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mx-auto flex h-64 w-64 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-center sm:h-80 sm:w-80">
            <div><div className="text-5xl font-semibold tracking-tight">AF</div><p className="mt-3 text-sm text-slate-400">Available for collaboration</p></div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
`,
    "components/about.tsx": `import { GraduationCap, MapPin } from "lucide-react";
import { profile } from "@/data/profile";
import SectionHeading from "@/components/section-heading";
import Reveal from "@/components/reveal";

export default function About() {
  return (
    <section id="about" className="container-page py-24">
      <SectionHeading eyebrow="About me" title="Singkat, jelas, dan berorientasi solusi" />
      <div className="grid gap-6 md:grid-cols-2">
        <Reveal><div className="card h-full"><p className="leading-8 text-slate-700">{profile.about}</p></div></Reveal>
        <Reveal delay={0.08}><div className="grid gap-3">
          <div className="card flex items-start gap-3"><GraduationCap className="mt-0.5 h-5 w-5 text-slate-400" /><div><b className="block text-navy">{profile.education}</b><span className="text-sm text-slate-600">{profile.major}</span></div></div>
          <div className="card flex items-start gap-3"><MapPin className="mt-0.5 h-5 w-5 text-slate-400" /><div><b className="block text-navy">Banten, Indonesia</b><span className="text-sm text-slate-600">Bekerja secara remote & hybrid</span></div></div>
        </div></Reveal>
      </div>
    </section>
  );
}
`,
    "components/skills.tsx": `import { skills } from "@/data/skills";
import SectionHeading from "@/components/section-heading";
import Reveal from "@/components/reveal";

export default function Skills() {
  return (
    <section id="skills" className="bg-mist py-24">
      <div className="container-page">
        <SectionHeading eyebrow="Skills" title="Alat kerja sehari-hari" description="Teknologi yang saya pakai untuk membangun aplikasi web dari frontend hingga database." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {skills.map((group, i) => (
            <Reveal key={group.title} delay={i * 0.05}>
              <div className="card h-full"><h3 className="font-semibold text-navy">{group.title}</h3>
                <div className="mt-4 flex flex-wrap gap-2">{group.items.map((s) => <span key={s} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">{s}</span>)}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
`,
    "components/experience.tsx": `import { experience } from "@/data/experience";
import SectionHeading from "@/components/section-heading";
import Reveal from "@/components/reveal";

export default function Experience() {
  return (
    <section id="experience" className="container-page py-24">
      <SectionHeading eyebrow="Experience" title="Pengalaman kerja" />
      <div className="relative border-l pl-6">
        {experience.map((e, i) => (
          <Reveal key={e.role} delay={i * 0.05}>
            <div className="relative pb-10 last:pb-0">
              <span className="absolute -left-[29px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-navy" />
              <h3 className="text-lg font-semibold text-navy">{e.role}</h3>
              <p className="text-sm text-slate-500">{e.organization} · {e.period}</p>
              <p className="mt-3 max-w-2xl leading-7 text-slate-700">{e.description}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
`,
    "components/projects.tsx": `import { ArrowUpRight } from "lucide-react";
import { projects } from "@/data/projects";
import SectionHeading from "@/components/section-heading";
import Reveal from "@/components/reveal";

export default function Projects() {
  return (
    <section id="projects" className="bg-mist py-24">
      <div className="container-page">
        <SectionHeading eyebrow="Projects" title="Karya yang pernah dibangun" description="Beberapa proyek yang menguji kemampuan-full stack saya." />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.05}>
              <article className="card flex h-full flex-col"><span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{p.category}</span>
                <h3 className="mt-2 text-lg font-semibold text-navy">{p.name}</h3>
                <p className="mt-2 flex-1 text-sm leading-7 text-slate-600">{p.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">{p.stack.map((s) => <span key={s} className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-600">{s}</span>)}</div>
                {p.href && p.href !== "#" && <a href={p.href} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-navy hover:underline">Buka proyek <ArrowUpRight className="h-4 w-4" /></a>}
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
`,
    "components/certifications.tsx": `import { BadgeCheck } from "lucide-react";
import { certifications } from "@/data/certifications";
import SectionHeading from "@/components/section-heading";
import Reveal from "@/components/reveal";

export default function Certifications() {
  return (
    <section id="certifications" className="container-page py-24">
      <SectionHeading eyebrow="Certifications" title="Sertifikasi & pencapaian" />
      <div className="grid gap-3 sm:grid-cols-2">
        {certifications.map((c, i) => (
          <Reveal key={c.name} delay={i * 0.04}>
            <div className="card flex items-center gap-3"><BadgeCheck className="h-5 w-5 shrink-0 text-slate-400" /><div><b className="text-navy">{c.name}</b><p className="text-sm text-slate-600">{c.issuer} · {c.year}</p></div></div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
`,
    "components/contact.tsx": `import { Github, Linkedin, Mail } from "lucide-react";
import { profile } from "@/data/profile";
import SectionHeading from "@/components/section-heading";

export default function Contact() {
  return (
    <section id="contact" className="bg-navy py-24 text-white">
      <div className="container-page">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Contact</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Mari bangun sesuatu yang berguna bersama.</h2>
        <p className="mt-4 max-w-xl leading-8 text-slate-300">Untuk diskusi proyek, lowongan, atau kolaborasi, hubungi saya lewat salah satu kanal berikut.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          {profile.contact.map((c) => (
            <a key={c.label} href={c.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-5 py-3 text-sm font-medium transition hover:bg-white/10">
              {c.label === "Email" ? <Mail className="h-4 w-4" /> : c.label === "LinkedIn" ? <Linkedin className="h-4 w-4" /> : <Github className="h-4 w-4" />}
              {c.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
`,
    "data/profile.ts": `export const profile = {
  name: "${name}",
  role: "Full-Stack Web Developer",
  title: "${name} — Full-Stack Web Developer",
  summary: "Portfolio profesional ${name}, Full-Stack Web Developer dengan fokus pada Next.js, React, Laravel, dan MySQL.",
  about: "Saya adalah Full-Stack Web Developer lulusan S1 Sistem Informasi Universitas Bina Bangsa dengan konsentrasi E-Business. Saya menikmati membangun produk web yang rapi, cepat, dan mudah dikembangkan—dari antarmuka hingga integrasi data.",
  education: "S1 Sistem Informasi — Universitas Bina Bangsa",
  major: "Konsentrasi E-Business",
  contact: [
    { label: "Email", href: "mailto:hello@example.com" },
    { label: "LinkedIn", href: "https://www.linkedin.com/" },
    { label: "GitHub", href: "https://github.com/" },
  ],
};

export const nav = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Skills", href: "#skills" },
  { label: "Experience", href: "#experience" },
  { label: "Projects", href: "#projects" },
  { label: "Certifications", href: "#certifications" },
  { label: "Contact", href: "#contact" },
];
`,
    "data/skills.ts": `export const skills = [
  { title: "Languages", items: ["PHP", "JavaScript", "HTML", "CSS"] },
  { title: "Framework", items: ["Laravel", "React.js", "Next.js", "Tailwind CSS"] },
  { title: "Database", items: ["MySQL"] },
  { title: "Tools", items: ["Git", "VS Code", "Postman", "Figma"] },
];
`,
    "data/experience.ts": `export const experience = [
  {
    role: "Full-Stack Web Developer (Internship)",
    organization: "Dinas Komunikasi, Informatika, Statistik dan Persandian Provinsi Banten",
    period: "2024",
    description: "Mendukung pengembangan dan pemeliharaan aplikasi web internal, termasuk pembuatan fitur, perbaikan bug, serta dokumentasi teknis bersama tim.",
  },
];
`,
    "data/projects.ts": `export const projects = [
  {
    name: "Knowledge Base Management System",
    category: "Web Application",
    description: "Sistem pengelolaan basis pengetahuan untuk mendokumentasikan proses, artikel, dan prosedur kerja agar mudah dicari dan dipelihara.",
    stack: ["PHP", "Laravel", "MySQL"],
    href: "#",
  },
  {
    name: "Sistem Informasi Kost",
    category: "Web Application",
    description: "Platform manajemen kost dengan fitur pendataan kamar, penyewa, dan integrasi pembayaran digital Midtrans.",
    stack: ["PHP", "Laravel", "MySQL", "Midtrans"],
    href: "#",
  },
  {
    name: "Annas AI Studio",
    category: "AI Workspace",
    description: "Ruang kolaborasi berbasis web untuk mengelola proyek, tugas, dan karyawan AI dengan dukungan percakapan dan tool internal.",
    stack: ["Next.js", "TypeScript", "Tailwind CSS"],
    href: "#",
  },
];
`,
    "data/certifications.ts": `export const certifications = [
  { name: "Full-Stack Web Development", issuer: "Pendidikan formal & proyek mandiri", year: "2024" },
  { name: "Internship — Diskominfo Provinsi Banten", issuer: "Dinas Komunikasi, Informatika, Statistik dan Persandian", year: "2024" },
];
`,
    "README.md": `# ${name} — Personal Portfolio

Portfolio pribadi yang dibangun dengan Next.js App Router, TypeScript, Tailwind CSS, Framer Motion, dan Lucide React.

## Menjalankan lokal

\`\`\`bash
npm install
npm run dev
\`\`\`

Buka http://localhost:3001

## Catatan

- Konten statis berada di folder \`data/\`.
- Bagian Contact memakai link nyata (email, LinkedIn, GitHub). Perbarui \`data/profile.ts\` sebelum deploy.
- Siap di-deploy ke Vercel tanpa konfigurasi tambahan.
`,
    "public/avatar.svg": `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 480 480"><rect width="480" height="480" rx="48" fill="#0a1530"/><circle cx="240" cy="185" r="84" fill="#1c2b4a"/><path d="M96 430c18-88 72-132 144-132s126 44 144 132" fill="#1c2b4a"/><text x="240" y="458" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#94a3b8">Portrait placeholder</text></svg>
`,
    "public/project-knowledge-base.svg": `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><rect width="640" height="400" fill="#f1f5f9"/><rect x="60" y="60" width="520" height="280" rx="20" fill="#fff" stroke="#cbd5e1"/><rect x="100" y="110" width="200" height="18" rx="9" fill="#0a1530"/><rect x="100" y="150" width="440" height="12" rx="6" fill="#e2e8f0"/><rect x="100" y="180" width="380" height="12" rx="6" fill="#e2e8f0"/><rect x="100" y="210" width="410" height="12" rx="6" fill="#e2e8f0"/></svg>
`,
    "public/project-kost.svg": `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><rect width="640" height="400" fill="#eef2ff"/><rect x="60" y="60" width="520" height="280" rx="20" fill="#fff" stroke="#c7d2fe"/><rect x="100" y="110" width="180" height="18" rx="9" fill="#3730a3"/><rect x="100" y="150" width="440" height="12" rx="6" fill="#e0e7ff"/><rect x="100" y="180" width="330" height="12" rx="6" fill="#e0e7ff"/></svg>
`,
  };
  return map[path] ?? `// ${path}\n// File ini dibuat oleh crew Annas AI Studio. Periksa sebelum dipakai.\n`;
}
