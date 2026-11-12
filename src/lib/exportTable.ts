// Heavy-library discipline (perf brief 3.4): xlsx/jspdf are fetched on the
// user's first export click — never in the initial bundle. Callers await.
import type * as XLSX from "xlsx";

/** Download a table as a real .xlsx workbook (one sheet). Columns are
 *  auto-sized to their content (like Excel's "AutoFit") — long header
 *  labels wrap visually in Excel only when the text exceeds the width,
 *  otherwise every column fits its data snugly. A generous cap keeps very
 *  long values (remarks, links) from producing unusable 200-char columns. */
/** A report's title band. When supplied, the workbook opens with the title and
 *  the subtitle (which states the active filters and the row count) above the
 *  header row — the same words the PDF, the CSV and the print view carry. */
export type TableMeta = { title?: string; subtitle?: string };

export async function exportExcel(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: (string | number | null)[][],
  meta?: TableMeta,
) {
  const XLSXmod = await import("xlsx");
  XLSXmod.writeFile(
    await buildTableWorkbook(sheetName, headers, rows, meta),
    filename,
  );
}

/** The workbook behind `exportExcel` — split out so a test can build it and
 *  read it back (ExcelJS) without touching the browser download path. The
 *  header row and the data rows are written together, from the same arrays.
 *
 *  Without `meta` the header row is row 1 (the app's data-sheet convention, so
 *  auto-filter and pivot tools work directly). With `meta` the title band
 *  occupies rows 1–2 and the header moves to row 3. */
export async function buildTableWorkbook(
  sheetName: string,
  headers: string[],
  rows: (string | number | null)[][],
  meta?: TableMeta,
): Promise<XLSX.WorkBook> {
  const XLSXmod = await import("xlsx");
  const metaRows = [meta?.title, meta?.subtitle].filter(
    (v): v is string => typeof v === "string" && v.trim() !== "",
  );
  const data = [
    ...metaRows.map((v) => [v]),
    headers,
    ...rows.map((r) => r.map((c) => c ?? "")),
  ];
  const ws = XLSXmod.utils.aoa_to_sheet(data);
  // The title band spans the table width, so it reads as a heading rather than
  // as a first data cell.
  if (metaRows.length > 0) {
    ws["!merges"] = metaRows.map((_, r) => ({
      s: { r, c: 0 },
      e: { r, c: Math.max(0, headers.length - 1) },
    }));
  }
  // AutoFit: per-column width = longest cell (header included) + padding.
  // Min 10 chars so tiny columns like "S.No" stay clickable; max 60 chars
  // so free-text columns (remarks) don't stretch to absurd widths — Excel
  // wraps anything longer within the cell at display time.
  ws["!cols"] = headers.map((_, col) => {
    let longest = headers[col]?.length ?? 10;
    for (const row of rows) {
      const len = String(row[col] ?? "").length;
      if (len > longest) longest = len;
    }
    return { wch: Math.min(60, Math.max(10, longest + 2)) };
  });
  const wb = XLSXmod.utils.book_new();
  XLSXmod.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  return wb;
}

/** Download a table as a formatted PDF (landscape A4, striped rows).
 *
 *  `options.columnWidths` sets per-column widths (px, matching the on-screen
 *  table) — `null` leaves that column content-sized. Specified columns are
 *  scaled proportionally so the whole table exactly fills the printable
 *  width of one page. `options.align` sets the text alignment of every
 *  column (head + body). Text wraps within cells automatically. */
export async function exportPdf(
  filename: string,
  title: string,
  headers: string[],
  rows: (string | number | null)[][],
  subtitle?: string,
  options?: PdfTableOptions,
) {
  (await buildTablePdf({ title, subtitle, headers, rows, options })).save(filename);
}

export type PdfTableOptions = {
  columnWidths?: (number | null)[];
  align?: "left" | "center" | "right";
  /** Per-column alignment, index-aligned with `headers`. One entry per column,
   *  so a column's HEADER is aligned like its own values (a score's header
   *  above its right-aligned numbers). Wins over `align`. */
  columnAligns?: ("left" | "center" | "right")[];
};

/** The document behind `exportPdf` — split out so a test can build it and
 *  extract its text (and assert that the header row repeats) without the
 *  browser download path. */
export async function buildTablePdf({
  title,
  subtitle,
  headers,
  rows,
  options,
}: {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number | null)[][];
  options?: PdfTableOptions;
}): Promise<{ save: (filename: string) => void; output: (t: string) => unknown }> {
  // Heavy libraries load on the user's first PDF click (perf brief 3.4).
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableMod.default;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(14);
  doc.text(title, 40, 36);
  if (subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(subtitle, 40, 52);
    doc.setTextColor(0);
  }
  const columnStyles: Record<
    number,
    { cellWidth?: number; halign?: "left" | "center" | "right" }
  > = {};
  if (options?.align) {
    headers.forEach((_, i) => {
      columnStyles[i] = { ...columnStyles[i], halign: options.align };
    });
  }
  if (options?.columnAligns) {
    options.columnAligns.forEach((a, i) => {
      columnStyles[i] = { ...columnStyles[i], halign: a };
    });
  }
  if (options?.columnWidths) {
    // Printable width between the 40pt margins below.
    const available = doc.internal.pageSize.getWidth() - 80;
    const total = options.columnWidths.reduce<number>((sum, w) => sum + (w ?? 0), 0);
    const scale = total > 0 ? available / total : 1;
    options.columnWidths.forEach((w, i) => {
      if (w != null) {
        columnStyles[i] = { ...columnStyles[i], cellWidth: w * scale };
      }
    });
  }
  autoTable(doc, {
    head: [headers],
    body: rows.map((r) => r.map((c) => (c == null ? "" : String(c)))),
    // The header row repeats on every page (jspdf-autotable's default
    // `showHead: "everyPage"`), so page 2+ still labels its own values.
    showHead: "everyPage",
    startY: subtitle ? 62 : 50,
    styles: { fontSize: 7.5, cellPadding: 3, textColor: 0 },
    headStyles: { fillColor: [13, 105, 96], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [244, 248, 247] },
    margin: { left: 40, right: 40 },
    columnStyles,
  });
  return doc;
}
