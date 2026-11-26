import "dotenv/config";
import { PrismaClient, Priority, TaskStatus, UserRole, Availability } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const day = 86400000;
const ago = (d: number) => new Date(Date.now() - d * day);
const inDays = (d: number) => new Date(Date.now() + d * day);

const DEPTS = [
  { name: "Executive", color: "#0a1530", description: "Kepemimpinan dan strategi perusahaan" },
  { name: "Technology", color: "#2563eb", description: "Arsitektur dan kualitas teknis" },
  { name: "Operations", color: "#0891b2", description: "Operasional dan koordinasi" },
  { name: "Software Development", color: "#4f46e5", description: "Pengembangan website dan aplikasi" },
  { name: "Creative & Design", color: "#db2777", description: "UI/UX dan desain produk" },
  { name: "Artificial Intelligence", color: "#7c3aed", description: "AI agent, LLM, dan otomatisasi" },
  { name: "Data & Analytics", color: "#059669", description: "Analisis data dan insight bisnis" },
  { name: "Quality Assurance & Security", color: "#dc2626", description: "Pengujian dan keamanan sistem" },
];

type E = {
  key: string; name: string; title: string; dept: string; manager?: string; color: string;
  personality: string; style: string; bio: string; skills: string[]; resp: string; targets: string;
  collab: string[]; role: UserRole; availability: Availability;
};

const EMP: E[] = [
  { key: "annas", name: "Annas", title: "Founder & Chief Executive Officer (CEO)", dept: "Executive", color: "#0a1530", role: "FOUNDER", availability: "AVAILABLE",
    personality: "Visioner, tegas, inovatif.", style: "Singkat, jelas, berorientasi keputusan.",
    bio: "Pendiri Annas AI Studio. Menentukan arah strategis perusahaan dan memegang keputusan akhir.",
    skills: ["Leadership", "Business Strategy", "Decision Making"],
    resp: "Memimpin perusahaan, menentukan strategi, mengambil keputusan akhir, dan mengevaluasi seluruh divisi.",
    targets: "Mencapai target pertumbuhan perusahaan dan menjaga kualitas seluruh proyek.", collab: ["kenji", "arjun"] },
  { key: "kenji", name: "Kenji", title: "Chief Technology Officer (CTO)", dept: "Technology", manager: "annas", color: "#2563eb", role: "EXECUTIVE", availability: "BUSY",
    personality: "Analitis, cerdas, sistematis.", style: "Terstruktur, teknis, berbasis data.",
    bio: "Penanggung jawab arsitektur teknologi dan standar kualitas teknis lintas proyek.",
    skills: ["System Architecture", "Laravel", "Next.js", "Cloud Computing", "Database"],
    resp: "Mengatur arsitektur teknologi dan mengawasi kualitas teknis seluruh proyek.",
    targets: "Menetapkan arsitektur untuk setiap proyek baru dan menjaga technical debt tetap terkendali.", collab: ["hiroshi", "min-jun", "wei"] },
  { key: "arjun", name: "Arjun", title: "Chief Operating Officer (COO)", dept: "Operations", manager: "annas", color: "#0891b2", role: "EXECUTIVE", availability: "AVAILABLE",
    personality: "Disiplin, komunikatif, terorganisir.", style: "Ramah, terjadwal, selalu menyertakan tenggat.",
    bio: "Mengelola operasional harian, pembagian tugas, dan koordinasi seluruh karyawan.",
    skills: ["Project Management", "Workflow Automation", "Scheduling"],
    resp: "Mengelola operasional, pembagian tugas, deadline, dan koordinasi karyawan.",
    targets: "Menjaga ketepatan deadline di atas 85% dan beban kerja tersebar merata.", collab: ["kenji", "mei-lin", "aisha"] },
  { key: "hiroshi", name: "Hiroshi", title: "Lead Full-Stack Developer", dept: "Software Development", manager: "kenji", color: "#4f46e5", role: "MANAGER", availability: "BUSY",
    personality: "Logis, kreatif, problem solver.", style: "Praktis, menjelaskan dengan contoh kode.",
    bio: "Memimpin pengembangan frontend, backend, API, dan integrasi database.",
    skills: ["PHP", "Laravel", "JavaScript", "React", "Next.js", "Node.js", "MySQL"],
    resp: "Mengembangkan website, aplikasi, frontend, backend, API, dan integrasi database.",
    targets: "Merilis modul sesuai milestone dengan coverage test yang memadai.", collab: ["mei-lin", "min-jun", "wei"] },
  { key: "mei-lin", name: "Mei Lin", title: "UI/UX Designer", dept: "Creative & Design", manager: "arjun", color: "#db2777", role: "EMPLOYEE", availability: "AVAILABLE",
    personality: "Kreatif, teliti, estetis.", style: "Visual, empatik terhadap pengguna.",
    bio: "Merancang antarmuka dan pengalaman pengguna yang konsisten dan mudah dipakai.",
    skills: ["Figma", "Wireframing", "Prototyping", "Design System", "User Research"],
    resp: "Membuat desain antarmuka, prototype, wireframe, dan memastikan pengalaman pengguna optimal.",
    targets: "Menyelesaikan design system v1 dan prototype setiap proyek sebelum development.", collab: ["hiroshi", "aisha"] },
  { key: "min-jun", name: "Min-jun", title: "AI Engineer", dept: "Artificial Intelligence", manager: "kenji", color: "#7c3aed", role: "EMPLOYEE", availability: "BUSY",
    personality: "Inovatif, kritis, eksperimental.", style: "Eksploratif, sering mengusulkan eksperimen.",
    bio: "Mengembangkan AI agent, integrasi model, chatbot, dan otomatisasi proses.",
    skills: ["Python", "Machine Learning", "LLM", "RAG", "AI Agent", "MCP", "Prompt Engineering"],
    resp: "Mengembangkan AI Agent, integrasi model AI, chatbot, dan sistem otomatisasi.",
    targets: "Meluncurkan AI customer service pilot dan pipeline RAG yang dapat dievaluasi.", collab: ["hiroshi", "aisha", "kenji"] },
  { key: "aisha", name: "Aisha", title: "Data Analyst", dept: "Data & Analytics", manager: "arjun", color: "#059669", role: "EMPLOYEE", availability: "AVAILABLE",
    personality: "Objektif, teliti, sistematis.", style: "Berbasis angka, menyertakan visualisasi.",
    bio: "Mengolah data operasional menjadi dashboard dan insight untuk pengambilan keputusan.",
    skills: ["SQL", "Python", "Excel", "Power BI", "Data Visualization"],
    resp: "Mengolah data, membuat dashboard, menganalisis performa, dan menghasilkan insight bisnis.",
    targets: "Menyediakan laporan performa mingguan dan dashboard BI klien.", collab: ["min-jun", "arjun"] },
  { key: "wei", name: "Wei Zhang", title: "QA & Security Engineer", dept: "Quality Assurance & Security", manager: "kenji", color: "#dc2626", role: "EMPLOYEE", availability: "AWAY",
    personality: "Kritis, teliti, disiplin.", style: "Detail, melaporkan temuan dengan langkah reproduksi.",
    bio: "Menguji aplikasi, menemukan bug, memvalidasi fitur, dan memeriksa keamanan sistem.",
    skills: ["Software Testing", "API Testing", "Playwright", "Selenium", "Cybersecurity"],
    resp: "Menguji aplikasi, menemukan bug, memvalidasi fitur, dan memeriksa keamanan sistem.",
    targets: "Setiap rilis lulus regression test dan security checklist.", collab: ["hiroshi", "kenji"] },
];

const ROLE_PERMS: Record<UserRole, { name: string; description: string; perms: string[] }> = {
  FOUNDER: { name: "Founder / Super Admin", description: "Akses penuh ke seluruh sistem.", perms: ["*"] },
  EXECUTIVE: { name: "Executive", description: "Mengelola karyawan, proyek, tugas, dan laporan.",
    perms: ["employees.read", "employees.write", "tasks.read", "tasks.write", "tasks.delete", "projects.read", "projects.write", "reports.read", "reports.write", "chat.use", "settings.read", "settings.write"] },
  MANAGER: { name: "Manager", description: "Mengelola tugas dan proyek timnya.",
    perms: ["employees.read", "tasks.read", "tasks.write", "projects.read", "projects.write", "reports.read", "reports.write", "chat.use"] },
  EMPLOYEE: { name: "Employee", description: "Mengerjakan tugas dan membuat laporan sendiri.",
    perms: ["employees.read", "tasks.read", "tasks.update_own", "projects.read", "reports.read", "reports.write_own", "chat.use"] },
};

async function main() {
  const password = process.env.SEED_PASSWORD || "AnnasAI@2026";
  const hash = await bcrypt.hash(password, 11);

  // bersihkan (urutan aman terhadap FK)
  for (const t of ["message", "conversation", "notification", "employeeReport", "taskActivityLog", "taskAttachment", "taskComment", "checklistItem", "taskAssignee", "task", "milestone", "projectMember", "project", "activityLog", "aiAgentConfiguration", "employeeSkill", "user", "employee", "department", "role", "companySettings"]) {
    await (prisma as any)[t].deleteMany();
  }

  await prisma.companySettings.create({ data: {
    id: 1, name: "Annas AI Studio", tagline: "Innovating Technology, Empowering the Future.", founder: "Annas",
    industries: ["Information Technology", "Software Development", "Artificial Intelligence", "Digital Transformation", "UI/UX & Product Design", "Data Analytics", "Cybersecurity", "IT Consulting"],
    vision: "Menjadi perusahaan teknologi informasi yang inovatif, profesional, dan terpercaya dalam menghadirkan solusi digital berbasis teknologi dan kecerdasan buatan untuk membantu individu, bisnis, dan organisasi menghadapi tantangan di era digital.",
    missions: ["Mengembangkan website, aplikasi, dan sistem informasi berkualitas.", "Mengintegrasikan teknologi AI untuk meningkatkan produktivitas.", "Membantu transformasi digital perusahaan dan organisasi.", "Mengembangkan inovasi dan produk teknologi.", "Mengutamakan pengalaman pengguna.", "Menjaga keamanan dan kualitas sistem.", "Membangun kolaborasi profesional."],
    notificationPrefs: { TASK_ASSIGNED: true, DEADLINE_CHANGED: true, TASK_COMPLETED: true, TASK_OVERDUE: true, NEW_COMMENT: true, NEW_REPORT: true, NEW_PROJECT: true, REVIEW_REQUESTED: true },
    security: { sessionHours: 12, minPasswordLength: 8 },
    integrations: { provider: "openai", baseUrl: "https://api.openai.com/v1", defaultModel: "gpt-4o-mini" },
  } });

  for (const [key, v] of Object.entries(ROLE_PERMS)) {
    await prisma.role.create({ data: { key: key as UserRole, name: v.name, description: v.description, permissions: v.perms } });
  }

  const dept: Record<string, string> = {};
  for (const d of DEPTS) {
    dept[d.name] = (await prisma.department.create({ data: { ...d, slug: d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") } })).id;
  }

  const emp: Record<string, string> = {};
  const usr: Record<string, string> = {};
  for (const e of EMP) {
    const created = await prisma.employee.create({ data: {
      name: e.name, title: e.title, departmentId: dept[e.dept], avatarColor: e.color, bio: e.bio, personality: e.personality,
      communicationStyle: e.style, responsibilities: e.resp, targets: e.targets, availability: e.availability,
      skills: { create: e.skills.map((s, i) => ({ name: s, level: 95 - i * 4 })) },
    } });
    emp[e.key] = created.id;
    const email = `${e.key.replace("-", "")}@annasai.studio`;
    usr[e.key] = (await prisma.user.create({ data: { email, name: e.name, passwordHash: hash, role: e.role, employeeId: created.id } })).id;
    await prisma.aiAgentConfiguration.create({ data: {
      employeeId: created.id, enabled: true,
      provider: process.env.AI_PROVIDER || "nvidia",
      model: process.env.AI_MODEL || "meta/llama-3.2-11b-vision-instruct",
      temperature: 0.4,
      systemPrompt: `Kamu adalah ${e.name}, ${e.title} di Annas AI Studio. Kepribadian: ${e.personality} Gaya komunikasi: ${e.style} Tanggung jawab: ${e.resp} Jawab dalam Bahasa Indonesia, ringkas, dan sesuai peranmu.`,
    } });
  }
  for (const e of EMP) {
    await prisma.employee.update({ where: { id: emp[e.key] }, data: {
      managerId: e.manager ? emp[e.manager] : null,
      collaborators: { connect: e.collab.map((k) => ({ id: emp[k] })) },
    } });
  }

  // proyek
  const projectDefs = [
    { name: "Website Company Profile Annas AI Studio", description: "Website resmi perusahaan: profil, layanan, portofolio, dan kontak.", status: "ACTIVE", color: "#2563eb", pm: "arjun", start: -30, deadline: 21, members: ["kenji", "hiroshi", "mei-lin", "wei"] },
    { name: "AI Customer Service Platform", description: "Platform layanan pelanggan berbasis LLM dengan RAG pada basis pengetahuan klien.", status: "ACTIVE", color: "#7c3aed", pm: "kenji", start: -45, deadline: 45, members: ["min-jun", "hiroshi", "mei-lin", "wei", "aisha"] },
    { name: "Enterprise Management System", description: "Sistem manajemen perusahaan: SDM, inventori, dan keuangan dasar.", status: "PLANNING", color: "#0891b2", pm: "arjun", start: -7, deadline: 120, members: ["kenji", "hiroshi", "mei-lin"] },
    { name: "AI Automation Platform", description: "Otomatisasi alur kerja internal dengan AI agent dan integrasi MCP.", status: "ACTIVE", color: "#4f46e5", pm: "min-jun", start: -20, deadline: 60, members: ["kenji", "hiroshi", "wei"] },
    { name: "Business Intelligence Dashboard", description: "Dashboard BI untuk klien: KPI penjualan dan operasional.", status: "ON_HOLD", color: "#059669", pm: "aisha", start: -60, deadline: 30, members: ["hiroshi", "mei-lin"] },
  ];
  const proj: Record<string, string> = {};
  for (const p of projectDefs) {
    const c = await prisma.project.create({ data: {
      name: p.name, description: p.description, status: p.status as any, color: p.color, managerId: emp[p.pm],
      startDate: ago(-p.start), deadline: inDays(p.deadline),
      members: { create: p.members.concat(p.members.includes(p.pm) ? [] : [p.pm]).map((k) => ({ employeeId: emp[k], role: k === p.pm ? "Project Manager" : "Member" })) },
      milestones: { create: [
        { title: "Kickoff & requirement", dueDate: ago(-p.start - 5), done: true },
        { title: "Desain & arsitektur", dueDate: inDays(Math.round(p.deadline * 0.3)), done: p.status === "ACTIVE" },
        { title: "Implementasi", dueDate: inDays(Math.round(p.deadline * 0.7)), done: false },
        { title: "Testing & rilis", dueDate: inDays(p.deadline), done: false },
      ] },
    } });
    proj[p.name] = c.id;
  }
  const P = (i: number) => proj[projectDefs[i].name];

  // tugas
  type T = { title: string; desc: string; project: number; status: TaskStatus; priority: Priority; assign: string[]; deadline: number; progress?: number; dept: string; check?: [string, boolean][]; doneAgo?: number };
  const tasks: T[] = [
    { title: "Rancang arsitektur website company profile", desc: "Tentukan stack, struktur halaman, dan strategi SEO.", project: 0, status: "COMPLETED", priority: "HIGH", assign: ["kenji"], deadline: -20, dept: "Technology", doneAgo: 22, check: [["Pilih stack", true], ["Dokumentasi arsitektur", true]] },
    { title: "Desain wireframe dan UI halaman utama", desc: "Wireframe, UI kit, dan prototype Figma untuk landing page.", project: 0, status: "COMPLETED", priority: "HIGH", assign: ["mei-lin"], deadline: -12, dept: "Creative & Design", doneAgo: 14, check: [["Wireframe", true], ["UI kit", true], ["Prototype", true]] },
    { title: "Implementasi frontend halaman utama", desc: "Bangun landing page responsif dengan Next.js dan Tailwind.", project: 0, status: "IN_PROGRESS", priority: "HIGH", assign: ["hiroshi"], deadline: 7, progress: 65, dept: "Software Development", check: [["Hero & navigasi", true], ["Section layanan", true], ["Form kontak", false], ["Optimasi performa", false]] },
    { title: "Uji lintas perangkat dan aksesibilitas", desc: "Pengujian responsif dan audit aksesibilitas sebelum rilis.", project: 0, status: "TODO", priority: "MEDIUM", assign: ["wei"], deadline: 14, dept: "Quality Assurance & Security" },
    { title: "Susun penjadwalan rilis website", desc: "Jadwal rilis dan pembagian tugas akhir tim.", project: 0, status: "IN_REVIEW", priority: "MEDIUM", assign: ["arjun"], deadline: 3, progress: 90, dept: "Operations" },
    { title: "Bangun pipeline RAG untuk basis pengetahuan klien", desc: "Ingest dokumen, chunking, embedding, dan retrieval.", project: 1, status: "IN_PROGRESS", priority: "URGENT", assign: ["min-jun"], deadline: 5, progress: 55, dept: "Artificial Intelligence", check: [["Ingest dokumen", true], ["Chunking", true], ["Embedding", false], ["Evaluasi retrieval", false]] },
    { title: "Integrasi API chatbot ke antarmuka web", desc: "Endpoint chat streaming dan komponen UI percakapan.", project: 1, status: "IN_PROGRESS", priority: "HIGH", assign: ["hiroshi", "min-jun"], deadline: 12, progress: 30, dept: "Software Development" },
    { title: "Desain alur percakapan dan UI widget chat", desc: "Alur percakapan, state kosong, dan error state widget.", project: 1, status: "REVISION", priority: "MEDIUM", assign: ["mei-lin"], deadline: 4, progress: 70, dept: "Creative & Design" },
    { title: "Analisis metrik kualitas jawaban chatbot", desc: "Tentukan metrik evaluasi dan buat dashboard pemantauan.", project: 1, status: "BACKLOG", priority: "LOW", assign: ["aisha"], deadline: 30, dept: "Data & Analytics" },
    { title: "Pengujian keamanan prompt injection", desc: "Uji ketahanan agent terhadap prompt injection dan kebocoran data.", project: 1, status: "TODO", priority: "HIGH", assign: ["wei"], deadline: 20, dept: "Quality Assurance & Security" },
    { title: "Riset kebutuhan modul SDM dan inventori", desc: "Wawancara pemangku kepentingan dan daftar kebutuhan.", project: 2, status: "IN_PROGRESS", priority: "MEDIUM", assign: ["arjun"], deadline: 10, progress: 40, dept: "Operations" },
    { title: "Rancang skema database sistem enterprise", desc: "ERD dan strategi migrasi.", project: 2, status: "TODO", priority: "HIGH", assign: ["kenji", "hiroshi"], deadline: 18, dept: "Technology" },
    { title: "Definisikan agent workflow otomatisasi internal", desc: "Pemetaan proses yang layak diotomatisasi dan konfigurasi agent.", project: 3, status: "IN_PROGRESS", priority: "HIGH", assign: ["min-jun"], deadline: 9, progress: 50, dept: "Artificial Intelligence" },
    { title: "Setup integrasi MCP server", desc: "Hubungkan tool internal melalui MCP.", project: 3, status: "BLOCKED", priority: "URGENT", assign: ["hiroshi"], deadline: -2, progress: 20, dept: "Software Development" },
    { title: "Tinjau keamanan arsitektur agent", desc: "Review isolasi dan izin tool agent.", project: 3, status: "TODO", priority: "HIGH", assign: ["kenji", "wei"], deadline: 16, dept: "Technology" },
    { title: "Kumpulkan sumber data KPI klien", desc: "Inventarisasi sumber data dan akses.", project: 4, status: "COMPLETED", priority: "MEDIUM", assign: ["aisha"], deadline: -15, dept: "Data & Analytics", doneAgo: 16 },
    { title: "Prototype dashboard KPI", desc: "Tata letak dan visualisasi KPI utama.", project: 4, status: "BACKLOG", priority: "MEDIUM", assign: ["mei-lin", "aisha"], deadline: 25, dept: "Creative & Design" },
    { title: "Evaluasi performa kuartal berjalan", desc: "Tinjauan kinerja seluruh divisi.", project: 0, status: "TODO", priority: "MEDIUM", assign: ["annas"], deadline: 8, dept: "Executive" },
  ];
  let n = 1;
  for (const t of tasks) {
    const created = await prisma.task.create({ data: {
      code: `TSK-${String(n++).padStart(3, "0")}`, title: t.title, description: t.desc, status: t.status, priority: t.priority,
      progress: t.status === "COMPLETED" ? 100 : t.progress ?? (t.status === "IN_REVIEW" ? 90 : 0),
      deadline: inDays(t.deadline), departmentId: dept[t.dept], projectId: P(t.project), createdById: usr.annas,
      completedAt: t.doneAgo ? ago(t.doneAgo) : null, createdAt: ago(Math.max(t.doneAgo ?? 0, 5) + 8), lastActivityAt: ago(t.doneAgo ?? 1),
      assignees: { create: t.assign.map((k) => ({ employeeId: emp[k] })) },
      checklist: t.check ? { create: t.check.map(([text, done]) => ({ text, done })) } : undefined,
      logs: { create: [{ actorName: "Annas", actorEmployeeId: emp.annas, action: "created", detail: "Tugas dibuat", createdAt: ago(Math.max(t.doneAgo ?? 0, 5) + 8) }] },
    } });
    if (t.status === "BLOCKED") {
      await prisma.taskComment.create({ data: { taskId: created.id, authorId: usr.hiroshi, body: "Menunggu akses kredensial server MCP dari tim infrastruktur." } });
    }
  }

  // laporan (berdasarkan tugas nyata di atas)
  await prisma.employeeReport.createMany({ data: [
    { employeeId: emp.hiroshi, projectId: P(0), period: "WEEKLY", periodDate: ago(2), tasksWorked: "Implementasi frontend halaman utama (TSK-003)", completedWork: "Hero, navigasi, dan section layanan selesai.", ongoingWork: "Form kontak dan validasi.", obstacles: "Integrasi MCP (TSK-014) terblokir menunggu kredensial.", solutions: "Eskalasi ke Kenji untuk percepatan akses.", recommendations: "Alokasikan waktu review desain sebelum minggu depan.", status: "On Track" },
    { employeeId: emp["min-jun"], projectId: P(1), period: "WEEKLY", periodDate: ago(2), tasksWorked: "Pipeline RAG (TSK-006), agent workflow (TSK-013)", completedWork: "Ingest dan chunking dokumen.", ongoingWork: "Embedding dan evaluasi retrieval.", obstacles: "Kualitas dokumen sumber tidak seragam.", solutions: "Tambahkan tahap normalisasi dokumen.", recommendations: "Minta Aisha menyiapkan set evaluasi.", status: "At Risk" },
    { employeeId: emp["mei-lin"], projectId: P(1), period: "DAILY", periodDate: ago(1), tasksWorked: "UI widget chat (TSK-008)", completedWork: "Revisi state kosong dan error.", ongoingWork: "Penyesuaian sesuai catatan review.", obstacles: "-", solutions: "-", recommendations: "Jadwalkan review desain bersama Hiroshi.", status: "On Track" },
  ] });

  // percakapan & pesan
  const general = await prisma.conversation.create({ data: { type: "GENERAL", title: "Umum — Annas AI Studio" } });
  await prisma.conversation.create({ data: { type: "PROJECT", title: projectDefs[0].name, projectId: P(0) } });
  await prisma.conversation.create({ data: { type: "PROJECT", title: projectDefs[1].name, projectId: P(1) } });
  await prisma.conversation.create({ data: { type: "DIVISION", title: "Divisi Software Development", departmentId: dept["Software Development"] } });
  await prisma.message.create({ data: {
    conversationId: general.id, authorUserId: usr.annas, authorEmployeeId: emp.annas, kind: "INSTRUCTION",
    body: "Selamat datang di Annas AI Studio. Prioritas minggu ini: selesaikan website company profile dan pipeline RAG. @Arjun mohon koordinasikan jadwal.",
    mentions: [emp.arjun],
  } });

  // notifikasi awal untuk Annas
  const overdue = await prisma.task.findFirst({ where: { code: "TSK-014" } });
  await prisma.notification.createMany({ data: [
    { userId: usr.annas, type: "TASK_OVERDUE", title: "Tugas terlambat: Setup integrasi MCP server", body: "TSK-014 melewati deadline dan berstatus Blocked.", link: `/tasks?open=${overdue?.id}` },
    { userId: usr.annas, type: "REVIEW_REQUESTED", title: "Permintaan review: Susun penjadwalan rilis website", body: "Arjun menandai tugas siap ditinjau.", link: "/tasks" },
    { userId: usr.annas, type: "NEW_REPORT", title: "Laporan mingguan baru dari Hiroshi", body: "Website Company Profile Annas AI Studio", link: "/reports" },
  ] });

  await prisma.activityLog.createMany({ data: [
    { employeeId: emp.hiroshi, type: "task", message: "Hiroshi mengerjakan Implementasi frontend halaman utama", createdAt: ago(0.1) },
    { employeeId: emp["min-jun"], type: "task", message: "Min-jun memperbarui progress Pipeline RAG menjadi 55%", createdAt: ago(0.3) },
    { employeeId: emp["mei-lin"], type: "report", message: "Mei Lin membuat laporan harian", createdAt: ago(1) },
    { employeeId: emp.kenji, type: "task", message: "Kenji menyelesaikan Rancang arsitektur website", createdAt: ago(22) },
  ] });

  console.log("\nSeed selesai. Akun login (password sama untuk semua):");
  for (const e of EMP) console.log(`  ${e.role.padEnd(9)} ${e.key.replace("-", "")}@annasai.studio`);
  console.log(`  Password: ${password}\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
