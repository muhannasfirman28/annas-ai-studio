/** Nama arsip ZIP hasil crew diambil dari judul di brief, bukan template portfolio. */

/** Ubah teks bebas menjadi slug ASCII yang aman untuk nama folder dan nama file. */
export function slugifyArchiveName(raw: string, fallback = "website"): string {
  const slug = (raw || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return slug || fallback;
}

/** Ambil nilai baris "Nama:" dari brief crew. */
export function briefProjectName(brief: string): string {
  return /^[ \t]*nama[ \t]*[:\-][ \t]*([^\n]+)/im.exec(brief || "")?.[1]?.trim() || "";
}

/** Judul dan slug arsip: brief lebih diutamakan, lalu nama proyek, lalu id. */
export function archiveNameFor(brief: string, projectName?: string | null, projectId?: string) {
  const fallback = projectId ? `website-${projectId.slice(0, 8)}` : "website";
  const name = briefProjectName(brief) || projectName?.trim() || "";
  return { name: name || fallback, slug: slugifyArchiveName(name, fallback) };
}
