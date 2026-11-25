import { NextRequest } from "next/server";
import { route, bad } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { analytics, taskRows, type Scope } from "@/lib/reports";
import { fmtDate } from "@/lib/utils";

const PERIOD = { DAILY: "Harian", WEEKLY: "Mingguan", MONTHLY: "Bulanan" } as const;

export const GET = route("reports.read", async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const format = sp.get("format");
  if (format !== "xlsx" && format !== "pdf") throw bad("format harus xlsx atau pdf.");
  const scope: Scope = { period: (sp.get("period") as Scope["period"]) || "WEEKLY", projectId: sp.get("projectId"), employeeId: sp.get("employeeId"), departmentId: sp.get("departmentId") };
  const a = await analytics(scope);
  const reports = await prisma.employeeReport.findMany({
    where: { ...(scope.employeeId ? { employeeId: scope.employeeId } : {}), ...(scope.projectId ? { projectId: scope.projectId } : {}), period: scope.period },
    include: { employee: { select: { name: true, title: true } } }, orderBy: { createdAt: "desc" },
  });
  const summary: [string, string | number][] = [
    ["Periode laporan", PERIOD[scope.period]], ["Dibuat", fmtDate(new Date(), true)],
    ["Total tugas", a.summary.totalTasks], ["Selesai", a.summary.completed], [`Selesai dalam periode`, a.summary.completedInPeriod],
    ["Belum selesai", a.summary.open], ["Lewat deadline", a.summary.overdue],
    ["Task completion rate", a.summary.completionRate === null ? "n/a" : `${a.summary.completionRate}%`],
    ["Deadline performance (tepat waktu)", a.summary.onTimeRate === null ? "n/a" : `${a.summary.onTimeRate}%`],
  ];
  const empRows = a.employees.map((e) => [e.name, e.assigned ?? 0, e.active ?? 0, e.completed ?? 0, e.overdue ?? 0, e.completionRate === null || e.completionRate === undefined ? "n/a" : `${e.completionRate}%`, e.productivity === null || e.productivity === undefined ? "n/a" : `${e.productivity}%`]);
  const empHead = ["Karyawan", "Ditugaskan", "Aktif", "Selesai", "Terlambat", "Completion", "Produktivitas"];
  const taskHead = ["ID", "Tugas", "Proyek", "Divisi", "Penanggung jawab", "Prioritas", "Status", "Progress", "Deadline"];
  const repHead = ["Karyawan", "Jabatan", "Periode", "Tanggal", "Tugas dikerjakan", "Selesai", "Berlangsung", "Kendala", "Solusi", "Rekomendasi", "Status"];
  const repRows = reports.map((r) => [r.employee.name, r.employee.title, PERIOD[r.period], fmtDate(r.periodDate), r.tasksWorked, r.completedWork, r.ongoingWork, r.obstacles, r.solutions, r.recommendations, r.status]);
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "xlsx") {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const add = (name: string, rows: unknown[][], widths?: number[]) => {
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"] = (widths ?? rows[0].map(() => 22)).map((wch) => ({ wch }));
      XLSX.utils.book_append_sheet(wb, ws, name);
    };
    add("Ringkasan", [["Annas AI Studio — Laporan"], [], ...summary], [38, 28]);
    add("Karyawan", [empHead, ...empRows]);
    add("Tugas", [taskHead, ...taskRows(a.tasks)], [10, 44, 30, 22, 28, 12, 14, 10, 14]);
    add("Laporan Kerja", [repHead, ...repRows], [18, 22, 10, 14, 36, 30, 30, 30, 30, 30, 12]);
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return new Response(new Uint8Array(buf), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="laporan-${scope.period.toLowerCase()}-${stamp}.xlsx"` } });
  }

  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(16); doc.text("Annas AI Studio — Laporan Operasional", 40, 44);
  doc.setFontSize(9); doc.setTextColor(100); doc.text(`Periode: ${PERIOD[scope.period]} • Dibuat ${fmtDate(new Date(), true)}`, 40, 60);
  autoTable(doc, { startY: 76, head: [["Metrik", "Nilai"]], body: summary.slice(2).map(([k, v]) => [k, String(v)]), theme: "grid", headStyles: { fillColor: [10, 21, 48] }, styles: { fontSize: 9 }, tableWidth: 360 });
  autoTable(doc, { head: [empHead], body: empRows.map((r) => r.map(String)), theme: "grid", headStyles: { fillColor: [37, 99, 235] }, styles: { fontSize: 8 }, margin: { top: 40 } });
  autoTable(doc, { head: [taskHead], body: taskRows(a.tasks), theme: "striped", headStyles: { fillColor: [10, 21, 48] }, styles: { fontSize: 7, cellPadding: 3 }, columnStyles: { 1: { cellWidth: 200 } } });
  if (repRows.length) autoTable(doc, { head: [["Karyawan", "Tanggal", "Dikerjakan", "Selesai", "Kendala", "Status"]], body: reports.map((r) => [r.employee.name, fmtDate(r.periodDate), r.tasksWorked, r.completedWork, r.obstacles, r.status]), theme: "striped", headStyles: { fillColor: [8, 145, 178] }, styles: { fontSize: 7, cellPadding: 3 } });
  const buf = Buffer.from(doc.output("arraybuffer"));
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="laporan-${scope.period.toLowerCase()}-${stamp}.pdf"` } });
});
