/**
 * SaQsham UPLOAD PARSING — read an .xlsx/.xls/.csv/.tsv/.txt (or pasted text)
 * into a plain rows matrix, then detect the header, trim it and make duplicate
 * header names unique. Kept separate from the wizard component so it stays
 * easy to reason about and unit-testable.
 */

import * as XLSX from "xlsx";
import { detectHeaderRow, uniqueHeaders, type ColumnSpec } from "./saqshamImport";

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_ROWS = 20_000;

export type ParsedSheet = {
  fileName: string;
  /** Every raw row (arrays of cells) from the first sheet. */
  rows: unknown[][];
  headerRow: number;
  headers: string[];
  /** Kept header indexes (empty-header columns dropped). */
  keptIndexes: number[];
  /** Data rows (after the header), trimmed of trailing blank rows. */
  dataRows: { sourceRowNo: number; cells: unknown[] }[];
  warnings: string[];
};

/** Decode a text file, honouring a UTF-8 BOM and falling back to Windows-1252. */
export function decodeText(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  const hasBom = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  try {
    const utf8 = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return hasBom ? utf8.replace(/^\uFEFF/, "") : utf8;
  } catch {
    // Not valid UTF-8 → assume Windows-1252 (the portal's CSV default).
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

/** Auto-detect the delimiter of a text export (tab beats comma when both). */
export function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim() !== "") ?? "";
  const tabs = (firstLine.match(/\t/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semis = (firstLine.match(/;/g) ?? []).length;
  if (tabs >= commas && tabs >= semis && tabs > 0) return "\t";
  if (semis > commas) return ";";
  return ",";
}

/** Split a pasted / text-table string into rows using the detected delimiter. */
export function parseDelimitedText(text: string): unknown[][] {
  const delim = detectDelimiter(text);
  const rows: unknown[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch === "\r") {
      // swallow — \r\n handled by the \n branch
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * Parse the `text/html` flavour of an Excel clipboard. Excel always sends a
 * tab-separated `text/plain`, but other spreadsheets only send HTML; a small
 * table reader keeps Paste working there too. Entities are decoded and tags
 * stripped; trailing blank rows are dropped by toParsedSheet.
 */
export function parseHtmlTable(html: string): unknown[][] {
  const decode = (s: string): string =>
    s
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
      .replace(/[ \t]+/g, " ")
      .trim();
  const rows: unknown[][] = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let tr: RegExpExecArray | null;
  while ((tr = trRe.exec(html))) {
    const cells: string[] = [];
    const cellRe = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
    let cell: RegExpExecArray | null;
    while ((cell = cellRe.exec(tr[1]))) cells.push(decode(cell[1]));
    if (cells.some((c) => c !== "")) rows.push(cells);
  }
  return rows;
}

/** Parse an HTML table clipboard as a ParsedSheet. */
export function parsePastedHtml(html: string): ParsedSheet {
  return toParsedSheet("Pasted data", parseHtmlTable(html));
}

/** Turn a raw rows matrix into a ParsedSheet (header detection + unique names). */
export function toParsedSheet(
  fileName: string,
  rows: unknown[][],
  _specs?: readonly ColumnSpec[],
): ParsedSheet {
  const warnings: string[] = [];
  const headerRow = detectHeaderRow(rows);
  const rawHeader = (rows[headerRow] ?? []) as unknown[];
  const { names, keptIndexes } = uniqueHeaders(rawHeader);
  const dataRows: { sourceRowNo: number; cells: unknown[] }[] = [];
  for (let r = headerRow + 1; r < rows.length; r++) {
    const cells = rows[r] ?? [];
    if (!cells.some((c) => c != null && String(c).trim() !== "")) continue;
    dataRows.push({ sourceRowNo: r + 1, cells });
  }
  if (dataRows.length > MAX_ROWS) warnings.push(`Only the first ${MAX_ROWS} rows are shown`);
  return {
    fileName,
    rows,
    headerRow,
    headers: names,
    keptIndexes,
    dataRows: dataRows.slice(0, MAX_ROWS),
    warnings,
  };
}

/** Read a File (xlsx/xls/csv/tsv/txt) into a ParsedSheet. */
export async function parseSaqshamFile(file: File): Promise<ParsedSheet> {
  if (file.size > MAX_FILE_BYTES) throw new Error("The file is larger than the 10 MB limit");
  const name = file.name.toLowerCase();
  const buf = await file.arrayBuffer();
  if (name.endsWith(".csv") || name.endsWith(".tsv") || name.endsWith(".txt")) {
    return toParsedSheet(file.name, parseDelimitedText(decodeText(buf)));
  }
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error("The workbook has no sheets");
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    blankrows: false,
    raw: true,
  }) as unknown[][];
  return toParsedSheet(file.name, rows);
}

/** Parse pasted clipboard text (tab-separated by convention). */
export function parsePastedText(text: string): ParsedSheet {
  return toParsedSheet("Pasted data", parseDelimitedText(text));
}

/** The tab-separated sample the "Load sample" link pastes into the box — the
 *  same 10 columns as the portal export, including the doubled status text and
 *  a person's name in Last Update Dtls, so the cleaning rules are visible. */
export const SAQSHAM_SAMPLE_TSV = [
  "Application No\tAssessment Type\tFacility Name/Category\tAssessment Mode / Program\tState\tDistrict\tApplied Departments\tApplied Date\tStatus\tLast Update Dtls",
  "HWC2602230000026_02\tNew Application\tSivarajpet/UAMM\tNQAS\tTamil Nadu\tTirupathur\t6OPD, Emergency, Pharmacy, Lab, Ward, OT\t12-02-2026\tAssessor Result Entry /Document Upload InprocessAssessor Result Entry /Document Upload Inprocess\t6-Oct-2026",
  "SCN2610110000001_01\tRe-Application\tNilavoor/HWC\tNQAS\tTamil Nadu\tTirupathur\t12Basic Oral health care, General Medicine, Paediatrics\t11-10-2026\tAssessment Received by RQAU & In -Process\tRAMAMURTHI K(RQAU)",
  "SCN2610110000002_01\tNew Application\tC.Kallupalli/HWC\tNQAS\tTamil Nadu\tTirupathur\t6OPD, Emergency\t09-09-2026\tApplication Lapsed\t12-Sep-2026",
].join("\n");

/** The downloadable sample file — EXACTLY the 10 columns of the real portal
 *  export. The 6 helper columns from the early hand-built sample are gone:
 *  if a real file still carries them they stay an optional high-confidence
 *  match source, but they are never required. */
export function downloadSampleFile(): void {
  const sample = [
    [
      "Application No",
      "Assessment Type",
      "Facility Name/Category",
      "Assessment Mode / Program",
      "State",
      "District",
      "Applied Departments",
      "Applied Date",
      "Status",
      "Last Update Dtls",
    ],
    [
      "HWC2602230000026_02",
      "New Application",
      "Sivarajpet/UAMM",
      "NQAS",
      "Tamil Nadu",
      "Tirupathur",
      "6OPD, Emergency, Pharmacy, Lab, Ward, OT",
      "12-02-2026",
      "Assessor Result Entry /Document Upload Inprocess",
      "6-Oct-2026",
    ],
    [
      "SCN2610110000001_01",
      "Re-Application",
      "Nilavoor/HWC",
      "NQAS",
      "Tamil Nadu",
      "Tirupathur",
      "12Basic Oral health care, General Medicine, Paediatrics",
      "11-10-2026",
      "Assessment Received by RQAU & In -Process",
      "RAMAMURTHI K(RQAU)",
    ],
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sample);
  ws["!cols"] = sample[0].map(() => ({ wch: 22 }));
  XLSX.utils.book_append_sheet(wb, ws, "SaQsham status");
  XLSX.writeFile(wb, "saqsham-document-status-sample.xlsx");
}
