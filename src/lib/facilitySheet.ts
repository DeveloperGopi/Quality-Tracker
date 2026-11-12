/**
 * FACILITY PROFILE SHEET — the two-page A4 record, drawn deterministically.
 *
 * Why this module exists (root causes recorded in the code below):
 *  • GARBLED TEXT: the old builder handed strings to jsPDF's standard fonts.
 *    One character the font cannot encode (a ₹, a Tamil glyph, a “·”) made
 *    jsPDF fall back to WinAnsi or drop text. The sheet now embeds a merged
 *    Noto Sans + Noto Sans Tamil font (public/fonts), checks every character
 *    against the glyph coverage before drawing, and fails the export rather
 *    than silently dropping a name.
 *  • RAGGED TABLES: each section was its own autoTable with `tableWidth:
 *    "wrap"`, so five content-sized tables gave five right edges. Here every
 *    card is placed on ONE 92 + 6 + 92 mm grid: same x, same width, aligned
 *    right edges, values wrapping instead of clipping.
 *  • THIRD PAGE: autoTable paginated on its own (rowPageBreak: "avoid" still
 *    splits a table between pages when it starts low). This engine measures
 *    every card first, applies the fit ladder (collapse blanks → 8 pt → drop
 *    Recent changes → 7.5 pt) and REFUSES to draw a third page: it reports the
 *    overflow so the build/test fails loudly instead.
 *
 * Everything is pure geometry + jsPDF drawing: no DOM, no html2canvas, so the
 * same bytes come out on the server and in the browser.
 */
import type { jsPDF } from "jspdf";

import {
  SCORE_DECIMALS,
  daysUntil,
  formatInr,
  requiredDocumentsMissing,
  toDdMmmYyyy,
  type MasterRow,
} from "@/lib/masterColumns";
import { iaScoreOf } from "@/lib/iaMaster";
import { lastQuarters, type FyQuarter } from "@/lib/iaImport";
import { departmentNoun, departmentsForFacility } from "@/lib/departments";
import { decodePrintedQr, drawQr, qrMatrix, qrSelfCheck, type QrMatrix } from "@/lib/qrCode";
import {
  IA_CARD,
  IA_SERIES as IA_CARD_SERIES,
  iaChangeText,
  layoutIaCard,
} from "@/lib/iaCard";
import {
  deriveFireNocStatus,
  formatVisitDate,
  DEFAULT_SETTINGS,
  addMonthsToIso,
  surveillanceVisits,
  todayIso,
  type LifecycleSettings,
  type NqasLike,
} from "@/convex/lifecycle";
import { buildingBucketOf } from "@/lib/buildingBuckets";
import { ORG_SIGNATURE } from "@/lib/org";
import { phoneForViewer } from "@/lib/phone";
import { documentsStatusReportDisplayOf, saqshamDocumentsStatusOf } from "@/lib/resultDeclared";
import { readScoreBands, scoreBandFor, type ScoreBandTone } from "@/lib/scoreBands";
import {
  DEFAULT_REPORT_TYPE_LABELS,
  facilityReportFileName,
  reportTypeLabel,
} from "@/lib/reportNaming";

/* --------------------------------------------------------------------------- */
/* Geometry                                                                    */
/* --------------------------------------------------------------------------- */

export const SHEET = {
  pageW: 210,
  pageH: 297,
  margin: 10,
  bottom: 12,
  colW: 92,
  gap: 6,
  content: 190,
  body: 8.5,
  label: 8,
  min: 7.5,
  rowMin: 5.5,
  cardHeader: 6,
} as const;

const COLUMN_X = { left: SHEET.margin, right: SHEET.margin + SHEET.colW + SHEET.gap };

/**
 * Page geometry for ONE cycle report (exactly two A4 portrait pages).
 *
 * Page 1 is the "current standing" page: the header band, title block, the
 * lifecycle stepper and the six-tile facts strip end at 86 mm, and the cards
 * flow below them. Page 2 is the "follow-up" page under a slim header. The
 * packer measures every card and never splits one; both body tops are the
 * only fixed numbers.
 */
export const SHEET_BODY = {
  top1: 86,
  top2: 22,
  bottom: SHEET.pageH - SHEET.bottom, // 285 mm
  /** Page 1 content box: 199 mm (the old failure said "223.3/199mm"). */
  cap1: SHEET.pageH - SHEET.bottom - 86,
  /** Page 2 content box before the tail (Remarks + Recent changes). */
  cap2: SHEET.pageH - SHEET.bottom - 22,
  /** Vertical gap between packed cards (constant, 3 mm). */
  cardGap: 3,
  /** Two columns that end further apart than this get rebalanced. */
  balanceMm: 10,
} as const;

/* --------------------------------------------------------------------------- */
/* Embedded fonts + glyph safety                                               */
/* --------------------------------------------------------------------------- */

/** The embedded family: Noto Sans merged with Noto Sans Tamil, so a Tamil
 *  facility name and an English sentence can be drawn without switching. */
const SHEET_FONT = "SheetSans";
let sheetFonts: { regular: string; bold: string } | null = null;

async function fontBase64(file: string): Promise<string> {
  const toB64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    let bin = "";
    // Chunked so a 600 KB font does not blow the argument limit of fromCharCode.
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(bin);
  };
  // Bun tests / any server-side caller: read the committed asset directly.
  // This comes FIRST: a DOM test installs happy-dom's `document`, where a
  // relative fetch has no base URL and would fail before the real download.
  const bun = (globalThis as { Bun?: { file: (path: string) => { arrayBuffer(): Promise<ArrayBuffer> } } }).Bun;
  if (bun) {
    return toB64(await bun.file(`public/fonts/${file}`).arrayBuffer());
  }
  if (typeof document !== "undefined" && typeof fetch === "function") {
    const res = await fetch(`/fonts/${file}`);
    if (!res.ok) throw new Error(`The sheet font ${file} could not be loaded`);
    return toB64(await res.arrayBuffer());
  }
  throw new Error(`The sheet font ${file} could not be loaded in this runtime`);
}

/** Load once per runtime; jsPDF embeds a subset per document. */
export async function loadSheetFonts(): Promise<{ regular: string; bold: string }> {
  if (sheetFonts) return sheetFonts;
  const [regular, bold] = await Promise.all([
    fontBase64("NotoSansTamil-RegularMerged.ttf"),
    fontBase64("NotoSansTamil-Bold.ttf"),
  ]);
  sheetFonts = { regular, bold };
  return sheetFonts;
}

function installSheetFonts(doc: jsPDF, fonts: { regular: string; bold: string }): void {
  doc.addFileToVFS("NQAS-Sheet-Regular.ttf", fonts.regular);
  doc.addFileToVFS("NQAS-Sheet-Bold.ttf", fonts.bold);
  doc.addFont("NQAS-Sheet-Regular.ttf", SHEET_FONT, "normal");
  // jsPDF needs a real face for each style we ask for; reuse the two faces
  // (italic and bolditalic are visually identical to their upright parents).
  doc.addFont("NQAS-Sheet-Regular.ttf", SHEET_FONT, "italic");
  doc.addFont("NQAS-Sheet-Bold.ttf", SHEET_FONT, "bold");
  doc.addFont("NQAS-Sheet-Bold.ttf", SHEET_FONT, "bolditalic");
}

/**
 * ONE map for every character the merged Noto Sans faces cannot draw (or that
 * used to be drawn as WinAnsi garbage): arrows become words, dashes and quotes
 * become their plain ASCII twins, and the tick / triangle / square markers
 * become the words a screen reader and a black-and-white printer both read.
 * Data never disappears — it is transliterated, never dropped.
 */
const SHEET_CHAR_MAP: Record<string, string> = {
  "→": "to", // U+2192 — not in the embedded faces
  "←": "from",
  "–": "-", // en dash
  "‘": "'",
  "’": "'",
  "“": '"',
  "”": '"',
  "…": "...",
  "✓": "Yes",
  "✔": "Yes",
  "✗": "No",
  "✕": "x",
  "▲": "+",
  "▼": "-",
  "■": "=",
  "□": "",
  "•": "-",
};

function mapSheetChars(text: string): string {
  let out = "";
  for (const ch of text) out += SHEET_CHAR_MAP[ch] ?? ch;
  return out;
}

/**
 * Every string that reaches the PDF passes through here: control characters
 * and tabs normalised, the glyph map applied, nothing language-specific
 * dropped. The glyph check below is what protects the export.
 */
export function sheetText(value: unknown): string {
  if (value == null) return "";
  const normalised = String(value)
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, " ")
    .replace(/\u00a0/g, " ");
  return (
    mapSheetChars(normalised)
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "")
  );
}

/** Characters the merged Noto faces actually cover. */
function covered(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  if (code === 10) return true;
  if (code >= 32 && code <= 0x7f) return true; // ASCII
  if (code >= 0xa0 && code <= 0xff) return true; // Latin-1
  if (code === 0x20b9) return true; // ₹
  if (code === 0x2022 || code === 0x2026 || code === 0x2013 || code === 0x2014) return true;
  if (code === 0x2018 || code === 0x2019 || code === 0x201c || code === 0x201d) return true;
  if (code >= 0x0b80 && code <= 0x0bff) return true; // Tamil
  return false;
}

/** True when every character has a glyph in the embedded faces. */
export function isSheetSafe(text: string): boolean {
  return Array.from(sheetText(text)).every(covered);
}

/** Characters the font cannot draw — the export fails loudly instead of
 *  printing a blank or a stray box. */
export function unsupportedSheetGlyphs(...texts: (string | null | undefined)[]): string[] {
  const bad = new Set<string>();
  for (const text of texts) {
    for (const ch of Array.from(sheetText(text ?? ""))) {
      if (!covered(ch)) bad.add(ch);
    }
  }
  return [...bad];
}

/* --------------------------------------------------------------------------- */
/* Values                                                                      */
/* --------------------------------------------------------------------------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 22-Oct-2026 08:36 IST — one stamp for the whole sheet. */
export function istStamp(t: Date = new Date()): string {
  const ist = new Date(t.getTime() + 5.5 * 3600_000);
  return `${String(ist.getUTCDate()).padStart(2, "0")}-${MONTHS[ist.getUTCMonth()]}-${ist.getUTCFullYear()} ${String(
    ist.getUTCHours(),
  ).padStart(2, "0")}:${String(ist.getUTCMinutes()).padStart(2, "0")} IST`;
}

const DASH = "\u2014"; // em dash: used for "blank"
export const money = (v: unknown): string =>
  v == null || v === "" || Number.isNaN(Number(v)) || Number(v) === 0
    ? ""
    : formatInr(Number(v));

function sheetScoreRow(
  label: string,
  value: number | null | undefined,
  bands: ReturnType<typeof readScoreBands>,
): SheetRow {
  if (value == null) return { kind: "kv", label, value: "-" };
  const band = scoreBandFor(value, bands);
  return {
    kind: "kv",
    label,
    value: scoreText(value),
    bar: { value, tone: (band?.tone ?? "teal") as ScoreBandTone },
  };
}

export function scoreText(v: number | null | undefined): string {
  return v == null || Number.isNaN(v) ? "" : `${v.toFixed(SCORE_DECIMALS)}%`;
}

/**
 * A stored 0 on an assessment score is a BLANK, never a real result: the NQAS
 * and State Assessment pass marks are 70, and the import parser wrote 0 for an
 * empty cell (see `convex/ops.ts` parseScore — fixed there too). It prints "-"
 * and raises the "completed without a score" data check.
 */
export function assessmentScoreText(v: number | null | undefined): string {
  return v == null || Number.isNaN(v) || v <= 0 ? "" : scoreText(v);
}

const daysBetweenIso = (a: string | null | undefined, b: string | null | undefined) => {
  if (!a || !b) return null;
  const ta = Date.parse(`${a}T00:00:00Z`);
  const tb = Date.parse(`${b}T00:00:00Z`);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return null;
  return Math.round((tb - ta) / 86_400_000) + 1;
};

/** "24-Sep-2026 to 25-Sep-2026" — dates only. */
export function dateRangePlain(
  from: string | null | undefined,
  to: string | null | undefined,
): string {
  const a = toDdMmmYyyy(from);
  const b = toDdMmmYyyy(to);
  if (!a && !b) return "";
  if (!b || a === b) return a || b;
  return `${a} to ${b}`;
}

/** Inclusive visit duration in whole days ("2 days"). */
export function durationText(
  from: string | null | undefined,
  to: string | null | undefined,
): string {
  const a = toDdMmmYyyy(from);
  if (!a) return "";
  const n = daysBetweenIso(from, to || from);
  if (n == null || n <= 0) return "";
  return `${n} day${n === 1 ? "" : "s"}`;
}

/** "24-Sep-2026 to 25-Sep-2026 - 2 days" (kept for callers/tests). */
export function dateRangeText(
  from: string | null | undefined,
  to: string | null | undefined,
): string {
  const range = dateRangePlain(from, to);
  if (!range || !from || !to || toDdMmmYyyy(from) === toDdMmmYyyy(to)) return range;
  const days = durationText(from, to);
  return days ? `${range} - ${days}` : range;
}

const clean = (v: unknown): string => sheetText(v ?? "").trim();
const or = (v: unknown, fallback = DASH): string => clean(v) || fallback;

/* --------------------------------------------------------------------------- */
/* Content model                                                               */
/* --------------------------------------------------------------------------- */

export type SheetRowKind = "kv" | "note" | "pill" | "mini";

export type SheetRow = {
  kind: SheetRowKind;
  label?: string;
  value?: string;
  /** For kind "mini": one line per tracker. */
  mini?: {
    rows: { name: string; previous: number | null; latest: number | null }[];
    previousLabel: string;
    latestLabel: string;
  };
  tone?: "green" | "amber" | "red" | "grey" | "blue";
  muted?: boolean;
  /** Print-safe score bar behind the value (0–100); numbers always printed. */
  bar?: { value: number; tone: "green" | "amber" | "red" | "teal" };
  /** Public "Open" link for an uploaded document (Part 3): a real PDF link
   *  annotation to `/r/<token>/d/<docToken>`, never a Drive id or URL. */
  link?: string;
};

export type SheetScores = {
  overall: number | null;
  pss: number | null;
  letterScore?: number | null;
  areas: { key: string; name: string; score: number | null }[];
  departments: {
    name: string;
    canonicalName: string;
    score: number | null;
  }[];
};

export type SheetCard = {
  id: string;
  title: string;
  hex: string;
  rows: SheetRow[];
  /** Fields that were blank and collapsed into the "Not recorded" line. */
  missing: string[];
};

export type SheetDocument = {
  key: string;
  label: string;
  badge: string;
  required: boolean;
  value: string;
  has: boolean;
  /** Original name + upload time, never the Drive storage name. */
  file?: { name: string; uploadedAt: number } | null;
  requiredMissing?: boolean;
  /** Snapshot-pinned document link (absent when the Admin setting is Off). */
  url?: string | null;
};

/** One quarter of the four-quarter IA chart (a gap is null, never 0). */
export type SheetIaPoint = {
  fy: string;
  q: 1 | 2 | 3 | 4;
  label: string;
  shortLabel: string;
  nqas: number | null;
  kayakalp: number | null;
  reported: boolean;
};

export type SheetIaChart = {
  points: SheetIaPoint[];
  note: string;
  change: { nqas: number | null; kayakalp: number | null };
};

/**
 * A cycle as the sheet consumes it: ONE 2-page report is produced per record,
 * current cycle first, then each earlier cycle, newest first.
 */
export type SheetCycleRecord = {
  cycleNumber: number;
  cycleType: string;
  createdAt?: number | null;
  superseded?: boolean | null;
  inferred?: boolean;
  /** ISO date the cycle STARTED, from its own first record (re-application
   *  received or state-assessment date) — never the migration/upload
   *  timestamp that used to print "Start 25-Sep-2025" on every cycle. */
  startedOn?: string | null;
  /** Set on a past cycle when the database has no closed_on: the number of
   *  the cycle that replaced it. Rendered as "Superseded by Cycle #N". */
  supersededBy?: number | null;
  sa?: {
    status?: string | null;
    scheduledDate?: string | null;
    actualStartDate?: string | null;
    actualEndDate?: string | null;
    scorePercent?: number | null;
    assessor1Name?: string | null;
    assessor1Hud?: string | null;
    assessor1Phone?: string | null;
    assessor2Name?: string | null;
    assessor2Hud?: string | null;
    assessor2Phone?: string | null;
  } | null;
  nqas?: {
    status?: string | null;
    scheduledStartDate?: string | null;
    scheduledEndDate?: string | null;
    actualStartDate?: string | null;
    actualEndDate?: string | null;
    mode?: string | null;
    scorePercent?: number | null;
    certificationStatus?: string | null;
    certificationDate?: string | null;
    goiLetterDate?: string | null;
    validityDate?: string | null;
    surveillanceDue1?: string | null;
    surveillanceDone1?: string | null;
    surveillanceDue2?: string | null;
    surveillanceDone2?: string | null;
    manualScore?: number | null;
    manualRecertStatus?: string | null;
    recertYear?: string | number | null;
  } | null;
  documents?: {
    id?: string;
    key: string;
    label: string;
    name: string;
    uploadedAt: number;
  }[];
  /** Annexure I scores for THIS cycle; absent = no printed block. */
  scores?: SheetScores | null;
  audits?: {
    changedAt: number;
    changedByName?: string | null;
    field?: string | null;
    action: string;
    newValue?: unknown;
    table?: string;
  }[];
};

export type SheetModel = {
  /** Internal only — never printed. Kept for the audit/share record. */
  reportId: string;
  generatedAt: string;
  dataAsOf: string;
  title: string;
  subtitle: string;
  facilityName: string;
  facilityType: string;
  nin: string;
  cycle: string;
  cycleNumber: number;
  cycleType: string;
  /** "CYCLE #2 · RECERTIFICATION · CURRENT" (or · SUPERSEDED BY CYCLE #3). */
  cycleHeading: string;
  /** "CURRENT" | "AS RECORDED" — the past-cycle tag. */
  cycleTag: string;
  /** "Started 25-Sep-2025" or "Start not recorded" (never the upload date). */
  cycleStartLabel: string;
  isCurrentCycle: boolean;
  stageName: string;
  statusLabel: string;
  statusTone: string;
  validityChip: string;
  stages: { label: string; state: "done" | "current" | "upcoming" | "blocked"; date: string }[];
  facts: { label: string; value: string; tone?: string }[];
  page1Left: SheetCard[];
  page1Right: SheetCard[];
  page2Left: SheetCard[];
  page2Right: SheetCard[];
  recent: { when: string; who: string; what: string; cycle: string }[];
  meta: { label: string; value: string }[];
  checks: string[];
  documents: SheetDocument[];
  iaChart: SheetIaChart;
  scores: SheetScores | null;
};

/** The six documents, in the agreed order and with the agreed labels. */
export const SHEET_DOCUMENTS = [
  { key: "NQAS_Result", label: "NQAS Result" },
  { key: "SA_Report", label: "SA Report" },
  { key: "SA_Checklist", label: "SA Checklist" },
  { key: "Gap_Closure", label: "Gap Closure Proceeding" },
  { key: "Condemned", label: "Condemned Certificate" },
  { key: "NOC", label: "Fire NOC" },
] as const;

const NOC_DISPLAY: Record<string, string> = {
  Valid: "Valid",
  "Expiring Soon": "Expiring soon",
  Expired: "Expired",
  "Not Obtained": "Not recorded",
};

/** `MasterRow["nqas"]` is all-nullable; the shared surveillance rule reads
 *  `Partial<NqasLike>` where an absent value is `undefined`. */
function nqasVisitInput(n: MasterRow["nqas"]): Partial<NqasLike> | null {
  if (!n) return null;
  const opt = (v: string | null | undefined): string | undefined => v ?? undefined;
  return {
    status: n.status ?? "",
    scheduledStartDate: opt(n.scheduledStartDate),
    scheduledEndDate: opt(n.scheduledEndDate),
    actualStartDate: opt(n.actualStartDate),
    actualEndDate: opt(n.actualEndDate),
    certificationStatus: opt(n.certificationStatus),
    certificationDate: opt(n.certificationDate),
    goiLetterDate: opt(n.goiLetterDate),
    validityDate: opt(n.validityDate),
    surveillanceDue1: n.surveillanceDue1,
    surveillanceDue2: n.surveillanceDue2,
    surveillanceDone1: n.surveillanceDone1,
    surveillanceDone2: n.surveillanceDone2,
  };
}

const stageTone = (state: string) =>
  state === "current" ? "blue" : state === "done" ? "green" : state === "blocked" ? "red" : "grey";

/** Short recertification pill — never a sentence inside a value. */
function recertChip(
  nqas: MasterRow["nqas"],
  today: string,
): { text: string; tone: SheetRow["tone"] } {
  if (!nqas?.certificationDate && !nqas?.certificationStatus) {
    return { text: "Not certified yet", tone: "grey" };
  }
  const validity = clean(nqas?.validityDate);
  if (validity) {
    const left = daysBetweenIso(today, validity);
    if (left == null) return { text: "Not due yet", tone: "green" };
    if (left < 0) return { text: "Overdue", tone: "red" };
    if (left <= 90) return { text: `Due ${validity.slice(0, 4)}`, tone: "amber" };
    return { text: "Not due yet", tone: "green" };
  }
  if (nqas?.recertStatus) {
    const s = clean(nqas.recertStatus);
    if (/overdue|expired/i.test(s)) return { text: "Overdue", tone: "red" };
    if (/due/i.test(s)) return { text: "Due", tone: "amber" };
    if (/process|progress|scheduled/i.test(s)) return { text: "In progress", tone: "blue" };
  }
  return { text: "Not due yet", tone: "green" };
}

/* ------------------------------------------------------------------ */
/* Plain audit words (no raw field keys on page 2)                     */
/* ------------------------------------------------------------------ */

const AUDIT_LABELS: Record<string, string> = {
  scheduledStartDate: "NQAS scheduled start date",
  scheduledEndDate: "NQAS scheduled end date",
  actualStartDate: "NQAS actual start date",
  actualEndDate: "NQAS actual end date",
  surveillanceDone1: "1st surveillance done date",
  surveillanceDone2: "2nd surveillance done date",
  surveillanceDue1: "1st surveillance due date",
  surveillanceDue2: "2nd surveillance due date",
  certificationStatus: "Certification status",
  certificationDate: "Certification date",
  validityDate: "Certificate validity",
  scorePercent: "Score",
  generalDocStatus: "SaQsham document status",
  documentsStatusReport: "Documents status (report)",
  buildingStatus: "Building status",
  nocAvailable: "Fire NOC available",
  expiryDate: "Fire NOC expiry",
  amountSanctioned: "Gap closure sanctioned",
  currentStatus: "Facility status",
  status: "Status",
};

const DOC_AUDIT_LABELS: Record<string, string> = Object.fromEntries(
  SHEET_DOCUMENTS.map((d) => [d.key, d.label]),
);

/** Internal keys are never printed: a document key becomes its agreed label. */
function prettyField(field: string | null | undefined): string {
  const raw = clean(field);
  if (!raw) return "";
  const doc = DOC_AUDIT_LABELS[raw];
  if (doc) return doc;
  const direct = AUDIT_LABELS[raw];
  if (direct) return direct;
  // "SA Actual Start Date" is already readable; a camelCase key is not.
  if (raw.includes(" ")) return raw;
  const words = raw.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** A stored file name / path is never printed in Recent changes. */
const FILE_VALUE =
  /(^|[\\/])[^\\/]+\.(pdf|docx?|xlsx?|pptx?|png|jpe?g|gif|webp|zip|csv|txt)\s*$/i;

function auditValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  const s = clean(value);
  if (FILE_VALUE.test(s)) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return toDdMmmYyyy(s);
  const iso = /^(\d{4}-\d{2}-\d{2})[ T]/.exec(s);
  if (iso) return toDdMmmYyyy(iso[1]);
  return s.length > 90 ? `${s.slice(0, 88)}…` : s;
}

const DATE_AUDIT_FIELDS = new Set([
  "scheduledStartDate",
  "scheduledEndDate",
  "actualStartDate",
  "actualEndDate",
  "scheduledDate",
  "revisedDate",
  "certificationDate",
  "goiLetterDate",
  "validityDate",
  "surveillanceDue1",
  "surveillanceDue2",
  "surveillanceDone1",
  "surveillanceDone2",
  "issuedDate",
  "expiryDate",
]);

/** System noise that must never be a "recent change" on the printed sheet. */
function noisyAudit(a: { table?: string | null; field?: string | null; action: string }): boolean {
  const table = (a.table ?? "").toLowerCase();
  const field = (a.field ?? "").toLowerCase();
  return (
    a.action === "view" ||
    table.includes("share") ||
    table.includes("session") ||
    field.includes("share") ||
    field.includes("token") ||
    field === "driveconnection"
  );
}

/** Plain words only: no stored file name, byte size, internal key or token. */
function auditLine(
  a: {
    field?: string | null;
    action: string;
    newValue?: unknown;
  },
  cycleLabel?: string,
): string {
  const raw = clean(a.field);
  const docLabel = DOC_AUDIT_LABELS[raw];
  const cycle = cycleLabel ? ` (${cycleLabel})` : "";
  if (docLabel) {
    if (a.action === "create") return `Uploaded ${docLabel}${cycle}`;
    if (a.action === "delete") return `Removed ${docLabel}${cycle}`;
    return `Updated ${docLabel}${cycle}`;
  }
  /* An attachment field the map does not name still prints in plain words. */
  if (!docLabel && /attach|document|file|photo|image|drive/i.test(raw)) {
    if (a.action === "create") return `Uploaded a document${cycle}`;
    if (a.action === "delete") return `Removed a document${cycle}`;
    return `Updated a document${cycle}`;
  }
  const field = prettyField(raw);
  const value = auditValue(a.newValue);
  if (field) {
    if (value && (DATE_AUDIT_FIELDS.has(raw) || (/date|validity|due|done/i.test(field) && /^\d{2}-/.test(value))))
      return `Changed ${field} to ${value}`;
    return value ? `${field} set to ${value}` : `${field} updated`;
  }
  const action =
    a.action === "create" ? "Facility record created" : a.action === "delete" ? "Record removed" : "Updated";
  return value ? `${action}${cycle}: ${value}` : `${action}${cycle}`;
}

/**
 * The FOUR quarters the IA card shows.
 *
 * Window rule (Part 3.4 of the brief):
 *  • current cycle — the last four quarters that have data on or before today;
 *    the window is anchored on the latest quarter with an NQAS or Kayakalp
 *    score (never on today), so a quarter that was never imported is a GAP
 *    and the line is not drawn through it. A blank is null, never 0.
 *  • past cycle — the four quarters ending with the quarter in which that
 *    cycle closed; when no score exists in that window the window falls back
 *    to the cycle's last quarter with data, so a closed cycle is never empty.
 */
export function iaChartFor(
  iaq: MasterRow["iaq"] | null | undefined,
  options: { endPeriod?: FyQuarter | null } = {},
): SheetIaChart {
  const empty: SheetIaChart = {
    points: [],
    note: "No internal assessment scores reported",
    change: { nqas: null, kayakalp: null },
  };
  if (!iaq) return empty;
  const scored = iaq.rows
    .filter((r) => r.nqasIaScore != null || r.kayakalpIaScore != null)
    .sort((a, b) => a.fy.localeCompare(b.fy) || a.quarter - b.quarter);
  if (scored.length === 0) return empty;

  const latest = scored[scored.length - 1];
  const latestPeriod: FyQuarter = { fy: latest.fy, q: latest.quarter as 1 | 2 | 3 | 4 };
  const anchor = options.endPeriod ?? latestPeriod;
  let periods: FyQuarter[] = lastQuarters(anchor.fy, anchor.q as 1 | 2 | 3 | 4, 4);
  const hasData = (list: FyQuarter[]) =>
    list.some((p) => iaScoreOf(iaq, "nqas", p) != null || iaScoreOf(iaq, "kayakalp", p) != null);
  if (!hasData(periods)) periods = lastQuarters(latest.fy, latest.quarter as 1 | 2 | 3 | 4, 4);

  const points: SheetIaPoint[] = periods.map((p) => {
    const nqas = iaScoreOf(iaq, "nqas", p);
    const kayakalp = iaScoreOf(iaq, "kayakalp", p);
    return {
      fy: p.fy,
      q: p.q,
      label: `Q${p.q} ${p.fy}`,
      shortLabel: `Q${p.q} ${p.fy.slice(2)}`,
      nqas,
      kayakalp,
      reported: nqas != null || kayakalp != null,
    };
  });
  const reported = points.filter((p) => p.reported).length;
  const prev = points[points.length - 2] ?? null;
  const last = points[points.length - 1] ?? null;
  const factor = 10 ** SCORE_DECIMALS;
  const diff = (a: number | null | undefined, b: number | null | undefined) =>
    a == null || b == null ? null : Math.round((b - a) * factor) / factor;
  const note =
    reported === 0
      ? "No quarter reported in this window"
      : reported === 1
        ? "Only 1 quarter reported"
        : "";
  return {
    points,
    note,
    change: {
      nqas: diff(prev?.nqas, last?.nqas),
      kayakalp: diff(prev?.kayakalp, last?.kayakalp),
    },
  };
}

/** ▲ ▼ ■ with the shared 0.05 no-change band. */
export function changeMark(value: number | null | undefined): "up" | "down" | "flat" | null {
  if (value == null || Number.isNaN(value)) return null;
  if (Math.abs(value) < 0.05) return "flat";
  return value > 0 ? "up" : "down";
}

/**
 * The fiscal quarter (April–March) that contains an ISO date. Used to tie a
 * closed cycle's IA window to the quarter in which that cycle ended.
 */
export function fyQuarterOf(iso: string | null | undefined): FyQuarter | null {
  const text = clean(iso).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!year || month < 1 || month > 12) return null;
  // April–June Q1 · July–September Q2 · October–December Q3 · January–March Q4.
  const q = (Math.floor(((month + 8) % 12) / 3) + 1) as 1 | 2 | 3 | 4;
  const fyStart = month >= 4 ? year : year - 1;
  return { fy: `${fyStart}-${String((fyStart + 1) % 100).padStart(2, "0")}`, q };
}

/** The date a cycle's own records end at (its last real activity). */
export function cycleEndIso(record: SheetCycleRecord): string {
  const q = record.nqas ?? null;
  const sa = record.sa ?? null;
  return (
    clean(q?.goiLetterDate) ||
    clean(q?.certificationDate) ||
    clean(q?.actualEndDate) ||
    clean(sa?.actualEndDate) ||
    clean(q?.validityDate) ||
    clean(q?.scheduledEndDate)
  );
}

/**
 * The ISO date a cycle STARTED at: its own first record — the state
 * assessment (or the NQAS scheduled date when no SA exists).
 *
 * ROOT CAUSE of "Start 25-Sep-2025 on both cycles": the old history page read
 * `cycle.createdAt` (facilitySheet.ts, HISTORY_START) — the row's creation
 * timestamp, which the migration/import stamps on every cycle on import day.
 * The report band now reads the cycle's own record dates instead, and says
 * "Start not recorded" when the cycle has no record of its own yet.
 */
export function cycleStartIso(record: SheetCycleRecord): string {
  const sa = record.sa ?? null;
  const q = record.nqas ?? null;
  return (
    clean(record.startedOn) ||
    clean(sa?.actualStartDate) ||
    clean(sa?.scheduledDate) ||
    clean(q?.scheduledStartDate)
  );
}

/**
 * ONE mapping for the sheet — the same fields the Quick View and the Master
 * List read (central config: `masterColumns` cell sources, `iaMaster` for the
 * quarterly IA store). Nothing here invents a column.
 */
export function buildSheetModel(row: MasterRow, opts: SheetOptions = {}): SheetModel {
  const f = row.facility;
  const sa = row.sa ?? null;
  const nqas = row.nqas ?? null;
  const iaq = row.iaq ?? null;
  const fund = row.fund ?? null;
  const noc = row.noc ?? null;
  const building = row.building ?? null;
  const scores = row.scores ?? null;
  const scoreBands = readScoreBands(
    (opts.settings as { scoreBands?: unknown } | null | undefined)?.scoreBands,
  );

  const cycleNo = row.cycleNumber ?? 1;
  const cycleType = clean(row.cycleType) || (cycleNo > 1 ? "Recertification" : "Initial");
  /* Per-cycle report metadata (Part 1): the current cycle is "CURRENT"; a
     closed cycle is "AS RECORDED", headed by its own cycle band. Nothing is
     merged between cycles — each report is built from ITS cycle's records. */
  const cycleInfo = opts.cycle;
  const isCurrentCycle = cycleInfo?.current ?? true;
  const cycleTag = isCurrentCycle ? "CURRENT" : "AS RECORDED";
  const supersededBy = cycleInfo?.supersededBy ?? null;
  const cycleHeading = `CYCLE #${cycleNo} · ${cycleType.toUpperCase()} · ${
    isCurrentCycle
      ? "CURRENT"
      : supersededBy
        ? `SUPERSEDED BY CYCLE #${supersededBy}`
        : cycleInfo?.closedOn
          ? `CLOSED ${toDdMmmYyyy(cycleInfo.closedOn).toUpperCase()}`
          : "AS RECORDED"
  }`;
  const cycleStartLabel = cycleInfo?.startedOn
    ? `Started ${toDdMmmYyyy(cycleInfo.startedOn)}`
    : "Start not recorded";
  const reportId = opts.reportId ?? `NQAS-${clean(f.ninNumber) || "NO-NIN"}-C${cycleNo}`;
  const stamp = istStamp(opts.generatedAt);
  // "Data as of" is the GENERATION time, never the last edit date. The old
  // fallback to facility.updatedAt made a sheet printed on 27-Oct say
  // 26-Sep while changes existed on 24 and 27 Oct.
  const dataAsOf = opts.dataAsOf
    ? istStamp(new Date(opts.dataAsOf))
    : istStamp(opts.generatedAt ?? new Date());
  const settings: LifecycleSettings = { ...DEFAULT_SETTINGS, ...(opts.settings ?? {}) };

  const today = opts.today ?? todayIso();
  const validityDays = daysUntil(nqas?.validityDate ?? null, new Date(`${today}T12:00:00Z`));
  const stageLabel = clean(f.currentStatus) || "Not started";

  /* --- Internal Assessment: the QUARTERLY STORE first (row.iaq), legacy
     Q1/Q2 columns only as a fallback. Root cause of the "-" values: the old
     sheet read `facility.nqasIaQ1/Q2` alone, while the import writes
     `facilityIaQuarters` (masterColumns.iaCellScore does exactly this). */
  const pair = iaq?.pair ?? { previous: { fy: "", q: 1 }, current: { fy: "", q: 2 } };
  const qLabel = (q: { fy?: string; q?: number }) =>
    q?.fy && q?.q ? `Q${q.q} ${q.fy}` : "Not recorded";
  const iaValue = (tracker: "nqas" | "kayakalp", which: "previous" | "current") =>
    iaq ? iaScoreOf(iaq, tracker, pair[which]) : null;
  const iaPrev = (tracker: "nqas" | "kayakalp") =>
    iaValue(tracker, "previous") ??
    (tracker === "nqas" ? (f.nqasIaQ1 ?? null) : (f.kayakalpIaQ1 ?? null));
  const iaLatest = (tracker: "nqas" | "kayakalp") =>
    iaValue(tracker, "current") ??
    (tracker === "nqas" ? (f.nqasIaQ2 ?? null) : (f.kayakalpIaQ2 ?? null));

  /* --- Documents: the six the district chases. The database key list is the
     authority when present (the profile/list rows carry it); the legacy
     attachment fields are only a fallback for hand-built rows/tests. */
  const hasKeyList = Array.isArray(row.docs?.keys);
  const presentKeys = new Set(
    (row.docs?.keys ?? []).map((k) => (k === "NQAS_Certificate" ? "NQAS_Result" : k)),
  );
  const requiredMissingDocs =
    row.docs?.requiredMissing ??
    (row.docs?.keys ? requiredDocumentsMissing(row) : []);
  const requiredKeys = new Set(requiredMissingDocs.map((d) => d.key));
  const legacyHas = (key: string): boolean => {
    switch (key) {
      case "NQAS_Result":
        return !!clean(row.resultDocumentName);
      case "SA_Report":
        return !!clean(sa?.reportAttachmentName);
      case "SA_Checklist":
        return !!clean(sa?.checklistAttachmentName);
      case "Gap_Closure":
        return !!clean(fund?.procLink) || !!clean(fund?.fundAttachmentName);
      case "Condemned":
        return !!clean(building?.condemnedLink) || !!clean(building?.condemnedAttachmentName);
      case "NOC":
        return !!clean(noc?.nocAttachmentName ?? noc?.nocLink);
      default:
        return false;
    }
  };
  const documents: SheetDocument[] = SHEET_DOCUMENTS.map((d) => {
    const has = hasKeyList ? presentKeys.has(d.key) : legacyHas(d.key);
    const requirement = row.docs?.requirements?.[d.key];
    const required = requirement?.required === true || requiredKeys.has(d.key);
    // ONE badge, only when required: the card no longer prints "(Optional)".
    const badge = required ? (requirement?.badge ?? "Required") : "";
    const file = row.docs?.files?.[d.key] ?? null;
    return {
      ...d,
      badge,
      required,
      has,
      file,
      url: opts.docLinks?.[`${cycleNo}:${d.key}`] ?? null,
      requiredMissing: required && !has,
      /* PDF only: the date and the Open action, NEVER the file name (Part 3).
         Quick View, Profile and the Excel profile keep their file names. */
      value: has
        ? `Uploaded${file?.uploadedAt ? ` ${toDdMmmYyyy(file.uploadedAt)}` : ""}`
        : required
          ? "Required missing"
          : "Not uploaded",
    };
  });

  const nocValidityRaw = deriveFireNocStatus(
    clean(noc?.nocAvailable) || null,
    clean(noc?.expiryDate) || null,
    clean(noc?.status) || null,
    today,
  );
  const nocValidity = NOC_DISPLAY[nocValidityRaw] ?? (clean(nocValidityRaw) || "Not recorded");
  const buildingStatus = building?.buildingStatus
    ? buildingBucketOf(building.buildingStatus)
    : "";

  /* --- Surveillance: the shared visit rule. A future “done” date is never a
     done visit (the old sheet printed 2027/2028 as Done in 2026). The row's
     nullable columns are normalised to the shape `surveillanceVisits`
     expects (absent = undefined, never null). */
  const visits = surveillanceVisits(nqasVisitInput(nqas), opts.settings ?? null, today);
  const visitDone = (v: (typeof visits)[number]) =>
    v.validDone ? `Done ${formatVisitDate(v.validDone)}` : "Not done";
  const futureDone = (key: "1st" | "2nd", done: string | null | undefined) => {
    const d = clean(done).slice(0, 10);
    return !!d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d > today
      // ">" not "→": the embedded Noto faces have no arrow glyph, and the
      // sheet's glyph map turns a data arrow into the word "to".
      ? `${key} surveillance done date is in the future; confirm in Admin > Data checks`
      : "";
  };

  /* --- Data checks: the same conflicts the Profile validation flags. */
  const checks: string[] = [];
  for (const doc of requiredMissingDocs) {
    checks.push(`${doc.label} document not uploaded (required)`);
  }
  const future1 = futureDone("1st", nqas?.surveillanceDone1);
  const future2 = futureDone("2nd", nqas?.surveillanceDone2);
  if (future1) checks.push(future1);
  if (future2) checks.push(future2);
  const documentsReport = clean(f.documentsStatusReport);
  const portalStatus = clean(sa?.generalDocStatus);
  if (nqas?.certificationStatus && /awaiting|pending/i.test(portalStatus)) {
    checks.push("Certified, but the documents status still says results are awaited");
  }
  if (!documentsReport && portalStatus) {
    checks.push("Documents Status (Report) is blank while a portal status exists");
  }
  if ((iaq?.rows.length ?? 0) > 0 && iaLatest("nqas") == null && iaLatest("kayakalp") == null) {
    checks.push("IA imports exist for this facility but no IA score is mapped");
  }
  if (clean(noc?.nocAvailable) === "Yes" && /expired/i.test(nocValidity)) {
    checks.push("NOC marked available but the expiry date has passed");
  }
  if (clean(noc?.nocAvailable) === "No" && nocValidity === "Valid") {
    checks.push("NOC Available says No while a valid expiry date is recorded");
  }
  if (nqas?.certificationStatus && !nqas.validityDate) {
    checks.push("Certified without a certificate validity date");
  }
  if (!clean(f.ninNumber)) checks.push("NIN is not recorded");
  if (nqas?.status === "Completed" && !assessmentScoreText(nqas?.scorePercent ?? null))
    checks.push("NQAS assessment completed without a score");
  if (sa?.status === "Completed" && !assessmentScoreText(sa?.scorePercent ?? null))
    checks.push("State assessment completed without a score");

  /* Outcome-specific certification labels. A Deferred result is NOT a
     certificate: it has a GoI letter date and a cooling-period end, never
     "Certified on" or "Valid till". The end date is the shared rule
     (GoI letter date || certification date || visit end + cooldown months). */
  const certStatus = clean(nqas?.certificationStatus);
  const isDeferred = certStatus === "Deferred";
  const isConditional = certStatus === "Quality Certified with Conditionality";
  const certAnchor = clean(nqas?.goiLetterDate) || clean(nqas?.certificationDate) || clean(nqas?.actualEndDate);
  const coolingEnd = isDeferred && certAnchor ? addMonthsToIso(certAnchor, settings.deferredCooldownMonths) : "";
  const coolingDays =
    coolingEnd ? daysUntil(coolingEnd, new Date(`${today}T12:00:00Z`)) : null;
  const coolingText = coolingEnd
    ? `Cooling period ends ${toDdMmmYyyy(coolingEnd)}${
        coolingDays != null && coolingDays >= 0 ? ` (${coolingDays} day${coolingDays === 1 ? "" : "s"})` : ""
      }`
    : "Cooling period ends: not recorded";
  const certificationRows: SheetRow[] = isDeferred
    ? [
        { kind: "pill", label: "Status", value: certStatus, tone: "red" },
        { kind: "kv", label: "Result (GoI letter) date", value: toDdMmmYyyy(certAnchor) },
        { kind: "kv", label: "Cooling period ends", value: toDdMmmYyyy(coolingEnd) },
      ]
    : isConditional
      ? [
          { kind: "pill", label: "Status", value: certStatus, tone: "amber" },
          { kind: "kv", label: "Certified on", value: toDdMmmYyyy(nqas?.certificationDate ?? certAnchor) },
          { kind: "kv", label: "Conditionality review by", value: toDdMmmYyyy(nqas?.validityDate) },
          { kind: "kv", label: "GoI letter date", value: toDdMmmYyyy(nqas?.goiLetterDate) },
        ]
      : [
          {
            kind: "pill",
            label: "Status",
            value: certStatus || "Not certified",
            tone: certStatus ? "green" : "grey",
          },
          { kind: "kv", label: "Certified on", value: toDdMmmYyyy(nqas?.certificationDate ?? certAnchor) },
          { kind: "kv", label: "Valid till", value: toDdMmmYyyy(nqas?.validityDate) },
          { kind: "kv", label: "GoI letter date", value: toDdMmmYyyy(nqas?.goiLetterDate) },
        ];

  /* Assessors: print only a named assessor. If neither is named, ONE
     "Not recorded" line — never two blank rows. */
  const assessors = [
    { name: sa?.assessor1Name, hud: sa?.assessor1Hud, phone: sa?.assessor1Phone },
    { name: sa?.assessor2Name, hud: sa?.assessor2Hud, phone: sa?.assessor2Phone },
  ]
    .map((a, i) => ({
      label: `Assessor ${i + 1}`,
      value: [
        assessorLine(a.name, a.hud),
        // Privacy: the contact number prints only on request.
        opts.includeContactNumbers && a.phone
          ? phoneForViewer(a.phone, true)
          : "",
      ]
        .filter(Boolean)
        .join(" · "),
    }))
    .filter((a) => a.value);

  const kpiFacts = (): { label: string; value: string; tone?: string }[] => {
    const tiles = [
      { label: "NQAS status", value: or(nqas?.certificationStatus, "Not certified") },
      {
        // A closed cycle never shows a future date as if it were due: it
        // shows what was RECORDED (Part 2), and the future-Done rule below
        // applies to both.
        label: isCurrentCycle ? "Next surveillance" : "1st surveillance",
        value: isCurrentCycle
          ? toDdMmmYyyy(nqas?.surveillanceDue1 ?? null) || DASH
          : visits[0] && visits[0].validDone
            ? `Done ${formatVisitDate(visits[0].validDone)}`
            : nqas?.surveillanceDue1
              ? `Not done (due ${toDdMmmYyyy(nqas.surveillanceDue1)})`
              : "Not scheduled",
      },
      { label: "Gap funds", value: money(fund?.amountSanctioned) || DASH },
      {
        label: "Fire NOC",
        value: nocValidity,
        tone: /expired/i.test(nocValidity) ? "red" : /valid/i.test(nocValidity) ? "green" : "grey",
      },
      {
        label: "Documents",
        value: `${documents.filter((d) => d.has).length} of ${documents.length}`,
      },
      {
        label: "NQAS IA (latest)",
        value: scoreText(iaLatest("nqas")) || DASH,
      },
    ];
    return tiles.map((t) => ({ ...t, value: sheetText(t.value) }));
  };

  const card = (
    id: string,
    title: string,
    hex: string,
    rows: SheetRow[],
    fallback?: string,
  ): SheetCard => {
    const present: SheetRow[] = [];
    const missing: string[] = [];
    for (const r of rows) {
      if (r.kind === "mini") {
        present.push(r);
        continue;
      }
      const v = clean(r.value);
      if (!v || v === DASH) {
        if (r.label) missing.push(r.label);
        continue;
      }
      present.push({ ...r, value: v });
    }
    // Never print a card heading with no rows underneath.
    if (present.length === 0) {
      present.push({
        kind: "kv",
        value: clean(fallback) || (missing.length ? `Not recorded: ${missing.join(", ")}` : "Not recorded"),
        muted: true,
      });
      // The fallback row already names every blank field — the grey
      // "Not recorded: …" line below the card would print them a second time.
      missing.length = 0;
    }
    return { id, title, hex, rows: present, missing };
  };

  const recert = recertChip(nqas, today);
  /* Assessment score is scorePercent ONLY. The old fallback to manualScore
     (the separate 2nd-surveillance score, absent = 0 in some imported rows)
     is why a completed assessment could print "0.00%" instead of "—". */
  const nqasScore = assessmentScoreText(nqas?.scorePercent ?? null);
  const departments = (nqas?.departments ?? []).map((d) => clean(d)).filter(Boolean);
  /* The count and the names must come from the SAME list: HWC HSC uses the
     12 service packages, PHC/CHC the department list. */
  const departmentOptions = departmentsForFacility(
    f.facilityType,
    (nqas?.departmentOptions ?? []).map((d) => clean(d)).filter(Boolean),
    (nqas?.departmentOptions ?? []).map((d) => clean(d)).filter(Boolean),
  );
  const departmentsTotal = Math.max(
    nqas?.departmentsTotal ?? 0,
    departmentOptions.length,
    departments.length,
  );
  const departmentWord = departmentNoun(f.facilityType);
  // Only a facility with SOME assessed department gets a "Not assessed" line;
  // an empty assessment must not list the whole master list as missing.
  const unassessed = departments.length
    ? departmentOptions.filter((d) => !departments.includes(d))
    : [];
  if (!departmentOptions.length && nqas?.departmentsTotal) {
    for (let i = departments.length; i < departmentsTotal; i += 1) unassessed.push(`Package ${i + 1}`);
  }
  const visitRange = dateRangePlain(nqas?.actualStartDate, nqas?.actualEndDate);
  const scheduledRange = dateRangePlain(nqas?.scheduledStartDate, nqas?.scheduledEndDate);
  const visitDuration = durationText(nqas?.actualStartDate, nqas?.actualEndDate);
  const nqasResultDoc = documents.find((d) => d.key === "NQAS_Result");
  const nqasResultValue = rowsResultDocument(row, nqasResultDoc);

  const page1Left: SheetCard[] = [
    card("identity", "Identity", "#0369a1", [
      { kind: "kv", label: "Facility", value: f.name },
      { kind: "kv", label: "NIN", value: clean(f.ninNumber) },
      { kind: "kv", label: "Type", value: f.facilityType },
      { kind: "kv", label: "Block", value: f.block },
      { kind: "kv", label: "PHC", value: f.phc },
      { kind: "kv", label: "SaQsham category", value: clean(f.saqshamCategory) },
    ]),
    /* Outcome only: assessment mode and score live in the NQAS Assessment
       Details card below; a Deferred result prints its cooling-period labels. */
    card("nqas", "NQAS Certification", "#047857", certificationRows),
    card(
      "nqasDetails",
      "NQAS Assessment Details",
      "#0f766e",
      [
        { kind: "kv", label: "NQAS assessment status", value: clean(nqas?.status) },
        { kind: "kv", label: "Scheduled dates", value: scheduledRange },
        { kind: "kv", label: "Visit (actual) dates", value: visitRange },
        { kind: "kv", label: "Duration", value: visitDuration },
        { kind: "kv", label: "Mode of assessment", value: clean(nqas?.mode) },
        { kind: "kv", label: "Checklist version", value: clean(nqas?.checklistVersion) },
        {
          kind: "kv",
          label: "Assessment score",
          // A missing score is a dash, never 0.00%; the data check still fires.
          value: nqasScore || "-",
          muted: !nqasScore,
        },
        {
          kind: "kv",
          label: departmentWord === "service packages" ? "Service packages assessed" : "Departments assessed",
          value: departments.length
            ? `${departments.length} of ${departmentsTotal} ${departmentWord} assessed`
            : "",
        },
        ...(unassessed.length
          ? [
              {
                kind: "kv" as const,
                label: "Not assessed",
                value: unassessed.join(", "),
                muted: true,
              },
            ]
          : []),
        {
          kind: "kv",
          label: "NQAS Result document",
          value: nqasResultValue,
          muted: !nqasResultDoc?.has,
        },
      ],
      "Not recorded: NQAS assessment details",
    ),
  ];

  const page1Right: SheetCard[] = [
    card("status", "Eligibility & Status", "#3730a3", [
      { kind: "kv", label: "Eligibility", value: clean(f.eligibility) },
      { kind: "pill", label: "Facility Current Status", value: stageLabel, tone: stageTone(stageLabel) },
      { kind: "kv", label: "Cycle", value: `#${cycleNo} ${cycleType}` },
      { kind: "kv", label: "Phase type", value: clean(f.phaseType) },
    ]),
    card("sa", "State Assessment", "#0d9488", [
      { kind: "kv", label: "Status", value: clean(sa?.status) },
      { kind: "kv", label: "Score", value: assessmentScoreText(sa?.scorePercent) },
      {
        kind: "kv",
        label: "SaQsham Documents Status",
        value: saqshamDocumentsStatusOf(sa?.generalDocStatus, nqas?.certificationStatus) || "-",
      },
      {
        kind: "kv",
        label: "Documents Status (Report)",
        value:
          documentsStatusReportDisplayOf(
            sa?.generalDocStatus,
            f.documentsStatusReport,
            nqas?.certificationStatus,
          ) || "-",
      },
      {
        kind: "kv",
        label: "Assessment dates",
        value: dateRangeText(sa?.actualStartDate, sa?.actualEndDate),
      },
      ...(assessors.length
        ? assessors.map((a) => ({ kind: "kv" as const, label: a.label, value: a.value }))
        : [{ kind: "kv" as const, label: "Assessors", value: "Not recorded", muted: true }]),
    ]),
    /* ONE IA card (Part 3): the four-quarter table AND the chart live inside
       this card, drawn full width by the engine. The old separate Q1/Q2 mini
       table is gone; the card carries no kv rows because its own table is
       rendered from `model.iaChart` (same numbers, same quarters). */
    { id: "ia", title: "Internal Assessment & Kayakalp", hex: "#0f766e", rows: [], missing: [] },
  ];
  void qLabel;
  void iaPrev;
  void iaLatest;

  const page2Left: SheetCard[] = [
    card("surveillance", "Surveillance & Recertification", "#7c3aed", [
      { kind: "kv", label: "1st surveillance due", value: formatVisitDate(visits[0]?.due) },
      { kind: "kv", label: "1st surveillance done", value: visitDone(visits[0]) },
      { kind: "kv", label: "2nd surveillance due", value: formatVisitDate(visits[1]?.due) },
      { kind: "kv", label: "2nd surveillance done", value: visitDone(visits[1]) },
      { kind: "pill", label: "Recertification", value: recert.text, tone: recert.tone },
      {
        kind: "kv",
        label: "Next full recertification",
        value: toDdMmmYyyy(nqas?.validityDate ?? null),
      },
    ]),
    card("documents", "Documents", "#475569", [
      ...documents.map((d) => ({
        kind: "kv" as const,
        // Only a required document carries a badge; "(Optional)" is gone.
        label: d.badge ? `${d.label} (${d.badge})` : d.label,
        value: d.value,
        muted: !d.has,
        link: d.has ? (d.url ?? undefined) : undefined,
      })),
      {
        kind: "kv" as const,
        label: "Documents uploaded",
        value: `${documents.filter((d) => d.has).length} of ${documents.length}`,
      },
    ]),
  ];

  const page2Right: SheetCard[] = [
    card("fund", "Gap Closure", "#b45309", [
      { kind: "kv", label: "Financial year", value: clean(fund?.financialYear) },
      { kind: "kv", label: "Status", value: clean(fund?.status) },
      { kind: "kv", label: "Sanctioned", value: money(fund?.amountSanctioned) },
      { kind: "kv", label: "Released", value: money((fund as { amountReleased?: number } | null)?.amountReleased) },
      { kind: "kv", label: "Utilized", value: money((fund as { amountUtilized?: number } | null)?.amountUtilized) },
    ], "Gap closure: not recorded"),
    card("building", "Building & Fire NOC", "#b91c1c", [
      { kind: "kv", label: "Building type", value: clean(building?.buildingType) },
      { kind: "kv", label: "Building status", value: buildingStatus },
      { kind: "kv", label: "NOC available", value: clean(noc?.nocAvailable) },
      {
        kind: "kv",
        label: "NOC document",
        // Presence only — a file name never prints on the sheet.
        value: clean(noc?.nocAttachmentName ?? noc?.nocLink) ? "Uploaded" : "Not uploaded",
      },
      { kind: "kv", label: "Issued", value: toDdMmmYyyy(noc?.issuedDate ?? null) },
      { kind: "kv", label: "Expiry", value: toDdMmmYyyy(noc?.expiryDate ?? null) },
      { kind: "pill", label: "Fire NOC validity", value: nocValidity, tone: /expired/i.test(nocValidity) ? "red" : /valid/i.test(nocValidity) ? "green" : "amber" },
    ], "Building and Fire NOC: not recorded"),
    {
      id: "checks",
      title: "Needs attention & data checks",
      hex: "#c2410c",
      rows: checks.length
        ? checks.map((c) => ({ kind: "kv" as const, value: c, muted: false }))
        : [{ kind: "kv" as const, value: "No issues found", muted: true }],
      missing: [],
    },
  ];

  /* Annexure I scores: a compact block ONLY when this cycle has saved
     scores. No scores = no card and no empty frame. */
  if (scores) {
    const hasAny =
      scores.overall != null ||
      scores.pss != null ||
      scores.areas.some((a) => a.score != null) ||
      scores.departments.some((d) => d.score != null);
    const areaRows = scores.areas
      .filter((a) => a.score != null)
      .map((a) => sheetScoreRow(`${a.key} ${a.name}`, a.score, scoreBands));
    if (hasAny && (scores.overall != null || areaRows.length > 0 || scores.pss != null)) {
      page2Left.push(
        card("scores", "Assessment scores (Annexure I)", "#0f766e", [
          sheetScoreRow("Overall score", scores.overall, scoreBands),
          ...areaRows,
          sheetScoreRow("Patient satisfaction (PSS)", scores.pss, scoreBands),
        ]),
      );
    }
    const departmentRows = scores.departments
      .filter((d) => d.score != null)
      .map((d) => sheetScoreRow(d.canonicalName || d.name, d.score, scoreBands));
    if (departmentRows.length > 0) {
      page2Right.push(
        card("deptScores", "Department scores", "#0d9488", departmentRows),
      );
    }
  }

  const recent = [...(opts.audits ?? [])]
    .filter((a) => !noisyAudit(a))
    .sort((a, b) => b.changedAt - a.changedAt)
    .slice(0, 5)
    .map((a) => ({
      when: toDdMmmYyyy(a.changedAt) || istStamp(new Date(a.changedAt)).slice(0, 11),
      who: clean(a.changedByName) || "System",
      what: auditLine(a, `Cycle ${cycleNo}`),
      cycle: `C${cycleNo}`,
    }))
    .filter((a) => a.what.length > 0);

  /* Last updated = the newest audit entry for this facility (document
     uploads included), with the user. It is not facility.updatedAt, which
     stayed 26-Sep while changes existed on 24 and 27 Oct. */
  const newestAudit = [...(opts.audits ?? [])]
    .filter((a) => !noisyAudit(a))
    .sort((a, b) => b.changedAt - a.changedAt)[0];
  const lastUpdated = newestAudit
    ? `${istStamp(new Date(newestAudit.changedAt))} · ${clean(newestAudit.changedByName) || "System"}`
    : f.updatedAt
      ? `${istStamp(new Date(f.updatedAt))} · System`
      : "";

  const meta = [
    { label: "Remarks", value: clean(f.remarks) },
    { label: "Last updated", value: lastUpdated },
  ];
  const validityChip = isDeferred
    ? coolingText
    : isConditional
      ? `Conditionality review by ${toDdMmmYyyy(nqas?.validityDate ?? null) || "not recorded"}`
      : nqas?.validityDate
        ? `Valid till ${toDdMmmYyyy(nqas.validityDate)}`
        : "No certificate validity";

  return {
    /* Internal only: the sheet never prints a Report ID (Part 2). The value
       still identifies this generation in the audit log and share record. */
    reportId,
    generatedAt: stamp,
    dataAsOf,
    title: sheetText(yourTitle(opts)),
    subtitle: sheetText(
      [
        reportTypeLabel(f.facilityType, opts.typeLabels ?? DEFAULT_REPORT_TYPE_LABELS),
        f.block ? `${f.block} block` : "",
        f.phc,
        clean(f.ninNumber) ? `NIN ${clean(f.ninNumber)}` : "",
      ]
        .filter(Boolean)
        .join(" · "),
    ),
    facilityName: sheetText(clean(f.name) || "Facility"),
    facilityType: sheetText(clean(f.facilityType)),
    nin: clean(f.ninNumber),
    cycle: `#${cycleNo}`,
    cycleNumber: cycleNo,
    cycleType,
    cycleHeading: sheetText(cycleHeading),
    cycleTag,
    cycleStartLabel,
    isCurrentCycle,
    stageName: sheetText(stageLabel),
    statusLabel: sheetText(isDeferred ? "Deferred" : stageLabel),
    statusTone: isDeferred ? "red" : stageTone(stageLabel),
    validityChip,
    stages: stageList(row, today),
    facts: kpiFacts(),
    page1Left,
    page1Right,
    page2Left,
    page2Right,
    recent,
    meta,
    checks,
    documents,
    iaChart: iaChartFor(iaq, { endPeriod: cycleInfo?.iaEndPeriod ?? null }),
    scores,
  };
}

/**
 * The facility's cycles in report order: the CURRENT cycle first, then each
 * earlier cycle, newest first (Cycle #3 → #2 → #1). One 2-page report per
 * record, each filled from THAT cycle's own records — nothing merges.
 */
export function facilityCycles(row: MasterRow, opts: SheetOptions = {}): SheetCycleRecord[] {
  const cycleNo = row.cycleNumber ?? 1;
  const current: SheetCycleRecord = {
    cycleNumber: cycleNo,
    cycleType: clean(row.cycleType) || (cycleNo > 1 ? "Recertification" : "Initial"),
    superseded: false,
    inferred: false,
    startedOn: clean(row.sa?.actualStartDate) || clean(row.sa?.scheduledDate) || null,
    sa: row.sa ?? null,
    nqas: row.nqas ?? null,
    documents: Object.entries(row.docs?.files ?? {}).map(([key, file]) => ({
      key,
      label: SHEET_DOCUMENTS.find((d) => d.key === key)?.label ?? key.replace(/_/g, " "),
      name: file.name,
      uploadedAt: file.uploadedAt,
    })),
    scores: row.scores ?? null,
    audits: opts.audits ?? [],
  };
  const fromHistory = (opts.cycleHistory ?? []).map((c) => ({ ...c }));
  const others = fromHistory.filter((c) => c.cycleNumber !== cycleNo);
  const all = [current, ...others].sort((a, b) => b.cycleNumber - a.cycleNumber);
  const chosen = opts.cycles?.length ? all.filter((c) => opts.cycles!.includes(c.cycleNumber)) : all;
  return chosen.length ? chosen : [current];
}

/**
 * One cycle's rows in the MasterRow shape the model builder already reads, so
 * every card (values, documents, checks, recent changes) is filled from THAT
 * cycle — no second mapping of the same fields.
 */
export function cycleMasterRow(row: MasterRow, cycle: SheetCycleRecord): MasterRow {
  const cycleScoped = cycle.cycleNumber === (row.cycleNumber ?? 1);
  const docs = cycle.documents
    ? {
        ...(row.docs ?? { uploaded: cycle.documents.length, total: SHEET_DOCUMENTS.length }),
        uploaded: cycle.documents.length,
        total: SHEET_DOCUMENTS.length,
        keys: cycle.documents.map((d) => d.key),
        files: Object.fromEntries(
          cycle.documents.map((d) => [d.key, { name: d.name, uploadedAt: d.uploadedAt }]),
        ),
        requiredMissing:
          cycleScoped && row.docs?.requiredMissing
            ? row.docs.requiredMissing.filter((m) => cycle.documents!.some((d) => d.key === m.key))
            : (row.docs?.requiredMissing ?? null),
      }
    : row.docs;
  return {
    ...row,
    cycleNumber: cycle.cycleNumber,
    cycleType: cycle.cycleType,
    sa: cycle.sa ? ({ ...cycle.sa } as MasterRow["sa"]) : null,
    nqas: cycle.nqas ? ({ ...cycle.nqas } as MasterRow["nqas"]) : null,
    docs,
    scores: cycle.scores ?? null,
  };
}

/**
 * Build ONE cycle's model: the same cards as the current cycle, filled with
 * that cycle's records, headed by its own cycle band ("CYCLE #1 · INITIAL ·
 * SUPERSEDED BY CYCLE #2"). The IA window for a closed cycle ends at the
 * quarter the cycle closed in.
 */
export function buildCycleSheetModel(
  row: MasterRow,
  cycle: SheetCycleRecord,
  all: SheetCycleRecord[],
  opts: SheetOptions = {},
): SheetModel {
  const currentNo = row.cycleNumber ?? 1;
  const isCurrent = cycle.cycleNumber === currentNo;
  const nextCycle = all
    .filter((c) => c.cycleNumber > cycle.cycleNumber)
    .sort((a, b) => a.cycleNumber - b.cycleNumber)[0];
  const supersededBy = !isCurrent ? (cycle.supersededBy ?? nextCycle?.cycleNumber ?? null) : null;
  const startedOn = cycleStartIso(cycle) || null;
  const endIso = cycleEndIso(cycle);
  return buildSheetModel(cycleMasterRow(row, cycle), {
    ...opts,
    audits: isCurrent ? (opts.audits ?? cycle.audits ?? []) : (cycle.audits ?? []),
    cycle: {
      current: isCurrent,
      supersededBy,
      startedOn,
      closedOn: null,
      iaEndPeriod: !isCurrent ? fyQuarterOf(endIso) : null,
    },
  });
}

/** "Uploaded 15-Jun-2026" for the NQAS Result row — the printed sheet never
 *  carries a file name, so the name is intentionally not read here. */
function rowsResultDocument(
  row: MasterRow,
  doc: SheetDocument | undefined,
): string {
  if (!doc?.has) return doc?.required ? "Not uploaded (required)" : "Not uploaded";
  const when = doc.file?.uploadedAt
    ? toDdMmmYyyy(doc.file.uploadedAt)
    : toDdMmmYyyy(row.resultDocumentUpdatedAt ?? null);
  return when ? `Uploaded ${when}` : "Uploaded";
}

/** "Name (HUD)" — only when a NAME exists; a HUD alone is not an assessor. */
function assessorLine(name?: string | null, hud?: string | null): string {
  const n = clean(name);
  if (!n) return "";
  const h = clean(hud);
  return h ? `${n} (${h})` : n;
}

function yourTitle(opts: SheetOptions): string {
  return opts.title ?? "Facility Profile Sheet";
}

/** The generation date used in the file name (IST, date-only). */
function generatedDate(opts: SheetOptions): Date {
  return opts.generatedAt ?? new Date();
}

/**
 * The six lifecycle stages for THIS cycle, derived from the cycle's own
 * records — never from a single hand-set status string.
 *
 * ROOT CAUSE of the wrong Deferred stepper: the old list mapped
 * `facility.currentStatus` through one regex chain, so a Deferred result left
 * the cursor on "Eligibility"/"State Assessment" even though the later stages
 * carried real dates. Now a stage is Done when its own record says so, and
 * Certification shows the Deferred outcome as a warning state while
 * Surveillance and Recertification stay Upcoming.
 */
function stageList(row: MasterRow, today: string): SheetModel["stages"] {
  const sa = row.sa ?? null;
  const nqas = row.nqas ?? null;
  const saDone = !!(clean(sa?.actualEndDate) || sa?.scorePercent != null || clean(sa?.status) === "Completed");
  const nqasDone = !!(clean(nqas?.actualEndDate) || clean(nqas?.status) === "Completed");
  const certStatus = clean(nqas?.certificationStatus);
  const certified = /quality certified|with conditionality/i.test(certStatus);
  const deferred = certStatus === "Deferred";
  const hasResult = !!certStatus;
  const visitDue = clean(nqas?.surveillanceDue1);
  const visitDone = clean(nqas?.surveillanceDone1) !== "" && clean(nqas?.surveillanceDone1) <= today;

  const stages: SheetModel["stages"] = [
    {
      label: "Eligibility",
      state: "done",
      date: "",
    },
    {
      label: "State Assessment",
      state: saDone ? "done" : clean(sa?.scheduledDate) ? "current" : "upcoming",
      date: toDdMmmYyyy(sa?.actualEndDate ?? sa?.actualStartDate ?? sa?.scheduledDate ?? null),
    },
    {
      label: "NQAS Assessment",
      state: nqasDone ? "done" : clean(nqas?.scheduledStartDate) ? "current" : "upcoming",
      date: toDdMmmYyyy(nqas?.actualEndDate ?? nqas?.scheduledStartDate ?? null),
    },
    {
      label: "Certification",
      state: certified ? "done" : deferred ? "blocked" : hasResult ? "done" : nqasDone ? "current" : "upcoming",
      date: toDdMmmYyyy(nqas?.certificationDate ?? nqas?.goiLetterDate ?? null),
    },
    {
      label: "Surveillance",
      state: certified && visitDone ? "done" : certified && visitDue ? "current" : "upcoming",
      date: toDdMmmYyyy(visitDue || null),
    },
    { label: "Recertification", state: "upcoming", date: toDdMmmYyyy(nqas?.validityDate ?? null) },
  ];
  /* A later stage with a real date can never leave an EARLIER stage as the
     current one: the first unfinished stage owns the cursor. */
  const firstUnfinished = stages.findIndex((s) => s.state !== "done" && s.state !== "blocked");
  return stages.map((s, i) =>
    s.state === "current" && i > firstUnfinished ? { ...s, state: "upcoming" } : s,
  );
}

/* --------------------------------------------------------------------------- */
/* Text wrapping (measure == draw, so a card never clips)                       */
/* --------------------------------------------------------------------------- */

/** Wrap at spaces, and hard-break any single token wider than the box (file
 *  names/URLs) — the PDF equivalent of `overflow-wrap: anywhere`. */
export function wrapText(doc: jsPDF, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of sheetText(text).split("\n")) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (doc.getTextWidth(next) <= maxW) {
        line = next;
        continue;
      }
      if (line) out.push(line);
      if (doc.getTextWidth(word) <= maxW) {
        line = word;
        continue;
      }
      // Hard break a very long token.
      let chunk = "";
      for (const ch of word) {
        if (doc.getTextWidth(chunk + ch) > maxW) {
          out.push(chunk);
          chunk = ch;
        } else chunk += ch;
      }
      line = chunk;
    }
    if (line) out.push(line);
  }
  return out.length ? out : [""];
}

/* --------------------------------------------------------------------------- */
/* Card layout (measure first, then draw)                                      */
/* --------------------------------------------------------------------------- */

export type CardLayout = {
  card: SheetCard;
  height: number;
  rows: {
    row: SheetRow;
    labelLines: string[];
    valueLines: string[];
    height: number;
    y: number;
  }[];
  blankLine: string;
};

export const LABEL_SHARE = 0.36;

/** Fit-ladder rendering knobs. EVERY one of them is read by both the measurer
 *  and the drawer, so the packed height is the printed height. */
export type CardRenderOptions = {
  /** Step (c): 1.8 mm padding instead of 2.4 and a 5 mm minimum row. */
  tight?: boolean;
  /** Step (f): clamp long text (Remarks 6 lines, Departments 8 lines) and mark
   *  the cut with "+N more" — the full text stays in Excel and Quick View. */
  clamp?: boolean;
  /** Step (b): drop the grey "Not recorded: …" line under a card (the blank
   *  rows are already collapsed; this removes the repeat of their names). */
  hideMissingLine?: boolean;
};

/** Lines the brief lets the sheet clamp (step f). */
const CLAMP_LINES = { remarks: 6, departments: 8 } as const;

/** Clamp one row's wrapped lines, naming how many were cut. */
function clampValueLines(label: string | null | undefined, lines: string[]): string[] {
  const key = (label ?? "").toLowerCase();
  const max = key.includes("remarks")
    ? CLAMP_LINES.remarks
    : key.includes("assessed") || key.includes("department")
      ? CLAMP_LINES.departments
      : 0;
  if (!max || lines.length <= max) return lines;
  const kept = lines.slice(0, max);
  const hidden = lines.length - max;
  kept[max - 1] = `${kept[max - 1]} +${hidden} more`;
  return kept;
}

export function measureCard(
  doc: jsPDF,
  card: SheetCard,
  x: number,
  y: number,
  w: number,
  size: number,
  showEmpty: boolean,
  opts: CardRenderOptions = {},
): CardLayout {
  void x;
  const pad = opts.tight ? 1.8 : 2.4;
  const inner = w - pad * 2;
  const labelW = inner * LABEL_SHARE;
  const valueW = inner - labelW - 1.6;
  const lineH = size * (opts.tight ? 0.40 : 0.42);
  const rowMin = opts.tight ? 5 : SHEET.rowMin;
  const rows: CardLayout["rows"] = [];
  let cursor = y + SHEET.cardHeader + (opts.tight ? 1.1 : 1.4);

  doc.setFont(SHEET_FONT, "normal");
  doc.setFontSize(size);

  for (const row of card.rows) {
    if (row.kind === "mini" && row.mini) {
      const h = (opts.tight ? 4.0 : 4.4) + row.mini.rows.length * (opts.tight ? 4.2 : 4.6);
      rows.push({ row, labelLines: [], valueLines: [], height: h, y: cursor });
      cursor += h;
      continue;
    }
    const labelLines = row.label ? wrapText(doc, row.label, labelW) : [];
    /* A linked document reserves room at the end of its value line for the
       "· Open →" action (≈12.5 mm at 8.5 pt bold), so the date can never
       print under it. */
    const raw = wrapText(doc, row.value ?? "", valueW - (row.link ? 16 : 0));
    const valueLines = opts.clamp ? clampValueLines(row.label, raw) : raw;
    const lines = Math.max(labelLines.length, valueLines.length, 1);
    const h = Math.max(rowMin, lines * lineH + (opts.tight ? 1.6 : 2.1));
    rows.push({ row, labelLines, valueLines, height: h, y: cursor });
    cursor += h;
  }

  if (!showEmpty && card.missing.length && !opts.hideMissingLine) {
    doc.setFontSize(SHEET.min);
    const text = `Not recorded: ${card.missing.join(", ")}`;
    const lines = wrapText(doc, text, inner).length;
    cursor += lines * SHEET.min * (opts.tight ? 0.40 : 0.42) + (opts.tight ? 1.2 : 1.8);
  }

  return {
    card,
    height: cursor - y + 1.2,
    rows,
    blankLine: card.missing.length ? `Not recorded: ${card.missing.join(", ")}` : "",
  };
}

const TONES: Record<string, [number, number, number]> = {
  green: [4, 120, 87],
  amber: [180, 83, 9],
  red: [185, 28, 28],
  blue: [3, 105, 161],
  teal: [13, 148, 136],
  grey: [100, 116, 139],
};

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** ▲ ▼ ■ as vector shapes, right-aligned with the number. */
function drawChangeMark(doc: jsPDF, x: number, y: number, kind: "up" | "down" | "flat", tone: [number, number, number]) {
  doc.setFillColor(...tone);
  const s = 1.15;
  if (kind === "flat") {
    doc.rect(x, y - s * 0.5, s, s * 0.5, "F");
    return;
  }
  const dir = kind === "up" ? -1 : 1;
  doc.triangle(x, y, x + s, y, x + s / 2, y + dir * s * 0.8, "F");
}

function drawPill(
  doc: jsPDF,
  x: number,
  y: number,
  text: string,
  tone: string,
  maxW: number,
  size: number = SHEET.min,
): void {
  const colour = TONES[tone] ?? TONES.grey;
  doc.setFont(SHEET_FONT, "bold");
  doc.setFontSize(size);
  const label = sheetText(text);
  const w = Math.min(maxW, doc.getTextWidth(label) + 4.4);
  doc.setDrawColor(...colour);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y - 3.1, w, 4.2, 2.1, 2.1, "FD");
  doc.setTextColor(...colour);
  doc.text(label, x + 2.2, y);
  doc.setTextColor(0, 0, 0);
}

export function drawCard(
  doc: jsPDF,
  layout: CardLayout,
  x: number,
  y: number,
  w: number,
  size: number,
  showEmpty: boolean,
  opts: CardRenderOptions = {},
): void {
  const pad = opts.tight ? 1.8 : 2.4;
  const inner = w - pad * 2;
  const labelW = inner * LABEL_SHARE;
  const valueX = x + pad + labelW + 1.6;
  const valueW = inner - labelW - 1.6;
  const lineH = size * (opts.tight ? 0.40 : 0.42);
  const tint = hexRgb(layout.card.hex);

  doc.setFillColor(...tint);
  doc.rect(x, y, w, SHEET.cardHeader, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont(SHEET_FONT, "bold");
  doc.setFontSize(SHEET.body);
  doc.text(sheetText(layout.card.title).toUpperCase(), x + pad, y + 4.1);
  doc.setTextColor(0, 0, 0);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.12);
  doc.rect(x, y, w, layout.height, "S");

  for (const r of layout.rows) {
    const rowY = r.y;
    if (r.row.kind === "mini" && r.row.mini) {
      const mini = r.row.mini;
      doc.setFontSize(SHEET.min);
      doc.setTextColor(71, 85, 105);
      doc.setFont(SHEET_FONT, "bold");
      const nameW = labelW;
      const prevX = x + pad + nameW + 1.2;
      const latestX = valueX + valueW * 0.42;
      const changeX = valueX + valueW;
      doc.text("Tracker", x + pad, rowY + 2.6);
      doc.text(wrapText(doc, mini.previousLabel, valueW * 0.4)[0] ?? "", prevX, rowY + 2.6);
      doc.text(wrapText(doc, mini.latestLabel, valueW * 0.4)[0] ?? "", latestX, rowY + 2.6);
      doc.text("Change", changeX, rowY + 2.6, { align: "right" });
      doc.setDrawColor(226, 232, 240);
      doc.line(x + pad, rowY + 3.6, x + w - pad, rowY + 3.6);
      let cy = rowY + 7.6;
      doc.setFont(SHEET_FONT, "normal");
      for (const m of mini.rows) {
        doc.setFontSize(size);
        doc.setTextColor(15, 23, 42);
        doc.text(m.name, x + pad, cy);
        const pv = m.previous == null ? "Not reported" : scoreText(m.previous);
        const lv = m.latest == null ? "Not yet reported" : scoreText(m.latest);
        doc.setTextColor(71, 85, 105);
        doc.text(pv, prevX, cy);
        doc.setTextColor(15, 23, 42);
        doc.text(lv, latestX, cy);
        if (m.previous != null && m.latest != null) {
          const delta = m.latest - m.previous;
          const kind = Math.abs(delta) < 0.005 ? "flat" : delta > 0 ? "up" : "down";
          drawChangeMark(doc, changeX - 10, cy - 1.1, kind, TONES[kind === "flat" ? "grey" : delta > 0 ? "green" : "red"]);
          doc.setFontSize(SHEET.min);
          doc.text(`${delta > 0 ? "+" : ""}${delta.toFixed(SCORE_DECIMALS)}`, changeX, cy, { align: "right" });
        } else {
          doc.setFontSize(SHEET.min);
          doc.setTextColor(100, 116, 139);
          doc.text("n/a", changeX, cy, { align: "right" });
        }
        cy += 4.6;
      }
      doc.setTextColor(0, 0, 0);
      continue;
    }

    doc.setFont(SHEET_FONT, "normal");
    doc.setFontSize(SHEET.label);
    doc.setTextColor(100, 116, 139);
    r.labelLines.forEach((line, i) => doc.text(line, x + pad, rowY + 3.1 + i * lineH + (r.height - 2.1 - r.labelLines.length * lineH) * 0));

    if (r.row.kind === "pill") {
      drawPill(doc, valueX, rowY + 3.4, r.row.value ?? "", r.row.tone ?? "grey", valueW);
    } else {
      doc.setFont(SHEET_FONT, r.row.muted ? "italic" : "normal");
      doc.setFontSize(size);
      doc.setTextColor(r.row.muted ? 100 : 15, r.row.muted ? 116 : 23, r.row.muted ? 139 : 42);
      r.valueLines.forEach((line, i) => {
        doc.text(line, valueX, rowY + 3.1 + i * lineH);
      });
      if (r.row.bar) {
        const trackY = rowY + r.height - 1.15;
        const trackW = valueW;
        doc.setFillColor(241, 245, 249);
        doc.rect(valueX, trackY, trackW, 0.7, "F");
        doc.setFillColor(...(TONES[r.row.bar.tone] ?? TONES.teal));
        doc.rect(
          valueX,
          trackY,
          trackW * Math.max(0, Math.min(100, r.row.bar.value)) / 100,
          0.7,
          "F",
        );
      }
      /* Part 3 — "Uploaded 24-Oct-2026 · Open →": the value line and a teal
         underlined Open + arrow, both real link annotations to the snapshot's
         own copy of this document (pinned to the printed version). The file
         name is never printed in the PDF. */
      if (r.row.link) {
        const firstLine = r.valueLines[0] ?? "";
        const valueWUsed = doc.getTextWidth(firstLine);
        const openLabel = "\u00b7 Open \u2192";
        doc.setFont(SHEET_FONT, "bold");
        doc.setFontSize(8.5);
        const openW = doc.getTextWidth(openLabel);
        const openX = Math.min(
          valueX + valueWUsed + 1.6,
          x + w - pad - openW,
        );
        doc.setTextColor(13, 105, 96);
        doc.text(openLabel, openX, rowY + 3.1);
        doc.setDrawColor(13, 105, 96);
        doc.setLineWidth(0.18);
        /* Underline "Open" only, not the separator or the arrow. */
        const openStart = openX + doc.getTextWidth("\u00b7 ");
        doc.line(openStart, rowY + 3.9, openStart + doc.getTextWidth("Open"), rowY + 3.9);
        /* 6 mm tall hit areas: the value line and the Open action. */
        doc.link(valueX - 0.6, rowY + 0.2, valueWUsed + 2, 6, { url: r.row.link });
        doc.link(openX - 0.6, rowY - 0.4, openW + 1.2, 6, { url: r.row.link });
        doc.setTextColor(0, 0, 0);
      }
      doc.setTextColor(0, 0, 0);
    }

    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.1);
    doc.line(x + pad, rowY + r.height, x + w - pad, rowY + r.height);
  }

  if (!showEmpty && layout.blankLine && !opts.hideMissingLine) {
    doc.setFont(SHEET_FONT, "italic");
    doc.setFontSize(SHEET.min);
    doc.setTextColor(148, 163, 184);
    // Bottom-aligned inside the height `measureCard` reserved for it, so a
    // long list of blanks wraps instead of being cut at the first line.
    const lineH = SHEET.min * 0.42;
    const lines = wrapText(doc, layout.blankLine, inner);
    const last = y + layout.height - 2.6;
    lines.forEach((line, i) => doc.text(line, x + pad, last - (lines.length - 1 - i) * lineH));
    doc.setTextColor(0, 0, 0);
  }
}

/* --------------------------------------------------------------------------- */
/* The sheet                                                                   */
/* --------------------------------------------------------------------------- */

export type SheetOptions = {
  title?: string;
  department?: string;
  generatedBy?: string;
  generatedAt?: Date;
  dataAsOf?: number | string | null;
  reportId?: string;
  showEmpty?: boolean;
  includeRecent?: boolean;
  includeQr?: boolean;
  /** Off by default: assessor mobile numbers never print unless asked. */
  includeContactNumbers?: boolean;
  paper?: "a4" | "a3";
  fileName?: string;
  /** Short `/r/<token>` URL encoded in the QR (never a Report ID link). */
  qrUrl?: string;
  /** `"<cycle>:<docKey>"` → the snapshot's public `/r/<token>/d/<docToken>`
   *  link. Absent when Admin → Shared reports has document links Off. */
  docLinks?: Record<string, string>;
  /** Resolved type-label map (Admin → Shared reports). */
  typeLabels?: Record<string, string>;
  /** Admin share settings; the sheet only needs the alert window. */
  settings?: Record<string, unknown> | null;
  /** Date-only IST “today” for surveillance/validity (tests pin it). */
  today?: string;
  /** Audit trail rows (Recent changes) — the caller passes what it already has. */
  audits?: {
    changedAt: number;
    changedByName?: string | null;
    field?: string | null;
    action: string;
    newValue?: unknown;
    table?: string;
  }[];
  /** ALL cycles for this facility (current included). Each one prints as its
   *  own 2-page report: current first, then earlier cycles newest first. */
  cycleHistory?: SheetCycleRecord[];
  /** Cycle numbers the reader ticked in the print dialog. Empty = all. */
  cycles?: number[];
  /** Admin → Reports: smallest body size the fit ladder may use (default 7.5). */
  minSize?: number;
  /** Full IA chart height in mm (default 44; the ladder drops it to 22). */
  chartHeight?: number;
  /** Per-cycle report metadata (set by `buildCycleSheetModel`). */
  cycle?: {
    current: boolean;
    supersededBy?: number | null;
    startedOn?: string | null;
    closedOn?: string | null;
    iaEndPeriod?: FyQuarter | null;
  };
  save?: (blob: Blob, name: string) => void;
};

export type SheetResult = {
  doc: jsPDF;
  pages: number;
  reportId: string;
  fileName: string;
  /** Fit ladder decisions, for the build log. */
  diagnostics: string[];
  /** What the ladder shortened ("Recent changes"), for the dialog's note. */
  shortened: string[];
  /** Cycles printed, in page order (current first). */
  cycles: number[];
  /** True when the 150 dpi decode failed even at 24 mm (Admin → Shared
   *  reports shows “QR check failed”). */
  qrCheckFailed?: boolean;
};

/** Facility-sheet department line — the ONE organisation name (Part 0). */
const DEPARTMENT = ORG_SIGNATURE;
const CONFIDENTIAL =
  "Confidential. Facility quality data. Handle per District Quality Assurance Unit guidelines.";

/* --------------------------------------------------------------------------- */
/* FLOW LAYOUT — measure every card, then pack (never a fixed page)            */
/* --------------------------------------------------------------------------- */

/**
 * ROOT CAUSE of "does not fit two A4 pages": the cards used to be ASSIGNED to
 * a page in buildSheetModel (page1Left/page1Right/page2Left/page2Right) before
 * anything was measured, and the IA chart was appended to page 1 as a separate
 * full-width band. Kurumbakeri's new NQAS Assessment Details card plus the
 * 1-year IA chart pushed page 1 to 223.3 mm for 199 mm available while page 2
 * used 86.6 of 213 mm — the fit check then threw instead of MOVING a card.
 * Now every card is measured and packed; page membership is an output.
 */

/**
 * Page-1 priority and column split (Part 2 of the brief):
 *   LEFT  — Identity, Eligibility & Status, State Assessment
 *   RIGHT — NQAS Certification, NQAS Assessment Details
 */
export const SHEET_PAGE1_LEFT = ["identity", "status", "sa"] as const;
export const SHEET_PAGE1_RIGHT = ["nqas", "nqasDetails"] as const;
/** Page-2 priority: Surveillance & Recertification first (it used to collide
 *  with page-1 content), then Gap Closure, Building & Fire NOC, Documents,
 *  Needs attention & data checks. */
export const SHEET_PAGE2_CARDS = ["surveillance", "fund", "building", "scores", "deptScores", "documents", "checks"] as const;
/** Printed reading order; the IA card is full width and is placed by the packer. */
export const SHEET_CARD_PRIORITY = [
  ...SHEET_PAGE1_LEFT,
  ...SHEET_PAGE1_RIGHT,
  ...SHEET_PAGE2_CARDS,
] as const;
/** Last-resort force-fit order (never identity / standing cards). */
export const SHEET_DROPPABLE = ["checks", "documents", "building", "fund", "surveillance"] as const;

/** One rung of the fit ladder (steps a–h of the brief). */
export type SheetStep = {
  id: string;
  size: number;
  /** IA chart height in mm (44 full, 34 on step e, 26 on the force-fit rungs). */
  chartMm: number;
  tight: boolean;
  clamp: boolean;
  /** Step (b): blanks collapse into the one "Not recorded: …" line. */
  collapseBlanks: boolean;
  /** Step (g): cards/detail trimmed, in the agreed order. */
  hide: string[];
  includeRecent: boolean;
  /** Force-fit (never a third page): cards removed, in priority order. */
  drop: string[];
};

export type PackedSheetCard = {
  card: SheetCard;
  layout: CardLayout;
  /** Reserved for the full-width IA card (the chart never travels alone). */
  withChart: boolean;
  height: number;
};

export type PackedSheetPage = {
  left: PackedSheetCard[];
  right: PackedSheetCard[];
  leftH: number;
  rightH: number;
  /** Height of the full-width IA card on this page (0 when it is elsewhere). */
  iaH: number;
  top: number;
  capacity: number;
};

/** ONE cycle report: exactly two pages, IA at the end of page 1 or top of page 2. */
export type SheetCyclePack = {
  page1: PackedSheetPage;
  page2: PackedSheetPage;
  iaOnPage1: boolean;
  step: SheetStep;
  hidden: string[];
  dropped: string[];
  /** Boxes that would collide or leave the page — empty in every normal build. */
  violations: string[];
  diagnostics: string[];
};

/** The tail of page 2: Remarks, then the last five changes of THIS cycle.
 *  The QR block is gone from the tail: the code appears ONCE, on page 1. */
function tailHeightMm(doc: jsPDF, model: SheetModel, includeRecent: boolean): number {
  doc.setFont(SHEET_FONT, "normal");
  doc.setFontSize(SHEET.min);
  const remarksLines = Math.min(6, Math.max(1, wrapText(doc, model.meta[0]?.value ?? "", SHEET.content - 42).length));
  const meta = 5 + remarksLines * 3.4 + 2;
  const recent = includeRecent && model.recent.length ? 6 + model.recent.length * 5.4 + 3 : 0;
  return meta + recent + 2;
}

/** The cards of a model, in the printed priority order (IA card excluded). */
function cardsInPriorityOrder(model: SheetModel): { cards: SheetCard[]; ia: SheetCard | null } {
  const all = [...model.page1Left, ...model.page1Right, ...model.page2Left, ...model.page2Right];
  const byId = new Map(all.map((c) => [c.id, c]));
  const ordered: SheetCard[] = [];
  for (const id of SHEET_CARD_PRIORITY) {
    const c = byId.get(id);
    if (c) {
      ordered.push(c);
      byId.delete(id);
    }
  }
  // A card the config does not know yet still prints — never silently dropped.
  return { cards: [...ordered, ...byId.values()], ia: all.find((c) => c.id === "ia") ?? null };
}

/** Step (g): trim a card instead of dropping its whole subject. */
function trimCard(card: SheetCard, hide: string[]): SheetCard | null {
  if (hide.includes(card.id)) return null;
  if (card.id === "documents" && hide.includes("documentsDetail")) {
    // Keep the "Documents uploaded n of 6" count line, drop the six rows.
    const count = card.rows.filter((r) => (r.label ?? "").startsWith("Documents uploaded"));
    return { ...card, rows: count.length ? count : card.rows.slice(-1), missing: [] };
  }
  if (card.id === "nqasDetails" && hide.includes("departmentDetail")) {
    return {
      ...card,
      rows: card.rows.filter(
        (r) => !/assessed|department/i.test(r.label ?? "") || /assessed$/i.test(r.value ?? ""),
      ),
      missing: [],
    };
  }
  return card;
}

/** Greedy first-fit into two columns, then a balanced rebalance pass. */
function fillColumns(
  items: PackedSheetCard[],
  capacity: number,
): { left: PackedSheetCard[]; right: PackedSheetCard[]; leftH: number; rightH: number; rest: PackedSheetCard[] } {
  const left: PackedSheetCard[] = [];
  const right: PackedSheetCard[] = [];
  let leftH = 0;
  let rightH = 0;
  let i = 0;
  for (; i < items.length; i += 1) {
    const item = items[i];
    const fitsLeft = leftH + item.height <= capacity;
    const fitsRight = rightH + item.height <= capacity;
    if (!fitsLeft && !fitsRight) break;
    // First-fit into the shorter column; the other one if it is the only fit.
    if (fitsLeft && (!fitsRight || leftH <= rightH)) {
      left.push(item);
      leftH += item.height;
    } else {
      right.push(item);
      rightH += item.height;
    }
  }
  // Balance: move the taller column's last card across when it fits and the
  // two columns then end closer together (the brief's 10 mm rule, best effort).
  for (let guard = 0; guard < 4; guard += 1) {
    const gap = Math.abs(leftH - rightH);
    if (gap <= 10) break;
    const from = leftH > rightH ? left : right;
    const last = from[from.length - 1];
    if (!last) break;
    const targetUsed = leftH > rightH ? rightH : leftH;
    if (targetUsed + last.height > capacity) break;
    if (Math.abs(gap - 2 * last.height) >= gap) break;
    from.pop();
    (leftH > rightH ? right : left).push(last);
    if (leftH > rightH) {
      leftH -= last.height;
      rightH += last.height;
    } else {
      rightH -= last.height;
      leftH += last.height;
    }
  }
  return { left, right, leftH, rightH, rest: items.slice(i) };
}

/** Measure all items, then balance the two columns (10 mm rule, best effort). */
function balanceColumns(
  left: PackedSheetCard[],
  right: PackedSheetCard[],
  capacity: number,
): { leftH: number; rightH: number } {
  const sum = (list: PackedSheetCard[]) => list.reduce((s, c) => s + c.height, 0);
  for (let guard = 0; guard < 4; guard += 1) {
    const leftH = sum(left);
    const rightH = sum(right);
    const gap = Math.abs(leftH - rightH);
    if (gap <= SHEET_BODY.balanceMm) break;
    const from = leftH > rightH ? left : right;
    const to = leftH > rightH ? right : left;
    const last = from[from.length - 1];
    if (!last) break;
    // The RECEIVING column must be able to hold it — checking the shorter one
    // alone is what once let a card overflow its page box.
    if (to.reduce((s, c) => s + c.height, 0) + last.height > capacity) break;
    if (Math.min(leftH, rightH) + last.height > capacity) break;
    if (Math.abs(gap - 2 * last.height) >= gap) break;
    from.pop();
    to.push(last);
  }
  return { leftH: sum(left), rightH: sum(right) };
}

/**
 * Measure every card at its final column width, then pack ONE cycle report
 * into EXACTLY two pages: page 1 (title block, two columns, full-width IA
 * card when it fits) and page 2 (slim header, remaining cards, tail).
 * Page membership is an OUTPUT: a card that does not fit page 1 flows to
 * page 2 whole, and no card is ever split.
 */
export function layoutSheet(
  doc: jsPDF,
  model: SheetModel,
  step: SheetStep,
  showEmpty: boolean,
): SheetCyclePack {
  const hidden: string[] = [];
  for (const id of step.hide) if (!hidden.includes(id)) hidden.push(id);
  const dropped: string[] = [];
  /** Step (b): with "show empty fields" ON, blanks first collapse to the one
   *  "Not recorded: …" line instead of one row per blank field. */
  const drawEmpty = showEmpty && !step.collapseBlanks;
  const cardOpts: CardRenderOptions = {
    tight: step.tight,
    clamp: step.clamp,
    hideMissingLine: step.collapseBlanks,
  };
  const { cards, ia } = cardsInPriorityOrder(model);
  const byId = new Map<string, SheetCard>();
  for (const card of cards) {
    const trimmed = trimCard(card, step.hide);
    if (trimmed) byId.set(trimmed.id, trimmed);
  }
  for (const id of step.drop) {
    if (byId.delete(id)) dropped.push(id);
  }
  const measure = (card: SheetCard): PackedSheetCard => {
    const layout = measureCard(doc, card, COLUMN_X.left, 0, SHEET.colW, step.size, drawEmpty, cardOpts);
    return { card, layout, withChart: false, height: layout.height + SHEET_BODY.cardGap };
  };
  const take = (id: string): PackedSheetCard | null => {
    const card = byId.get(id);
    if (!card) return null;
    byId.delete(id);
    return measure(card);
  };
  const p1Left = SHEET_PAGE1_LEFT.map(take).filter((c): c is PackedSheetCard => !!c);
  const p1Right = SHEET_PAGE1_RIGHT.map(take).filter((c): c is PackedSheetCard => !!c);
  const p2: PackedSheetCard[] = [];
  for (const id of SHEET_PAGE2_CARDS) {
    const item = take(id);
    if (item) p2.push(item);
  }
  // A card the priority config does not know yet still prints (never dropped)
  // — but the IA card is drawn full width from the chart, never as a column.
  for (const leftover of byId.values()) {
    if (leftover.id === "ia") continue;
    p2.push(measure(leftover));
  }

  const iaH =
    model.iaChart.points.length && ia ? measureIaCard(doc, model, SHEET.content, step.chartMm) : ia ? 12 : 0;
  const tail = tailHeightMm(doc, model, step.includeRecent);
  const cap1 = SHEET_BODY.cap1;
  const cap2 = SHEET_BODY.cap2 - tail;

  const seedPage1 = (columnCapacity: number) => {
    const left: PackedSheetCard[] = [];
    const right: PackedSheetCard[] = [];
    const rest: PackedSheetCard[] = [];
    const fillInto = (items: PackedSheetCard[], column: PackedSheetCard[]) => {
      let used = column.reduce((s, c) => s + c.height, 0);
      for (const item of items) {
        if (used + item.height <= columnCapacity) {
          column.push(item);
          used += item.height;
        } else rest.push(item);
      }
    };
    fillInto(p1Left, left);
    fillInto(p1Right, right);
    const balanced = balanceColumns(left, right, columnCapacity);
    return { left, right, leftH: balanced.leftH, rightH: balanced.rightH, rest };
  };

  const attempt = (iaOnPage1: boolean) => {
    const columnCap1 = Math.max(40, cap1 - (iaOnPage1 ? iaH + SHEET_BODY.cardGap : 0));
    const p1 = seedPage1(columnCap1);
    const columnCap2 = Math.max(40, cap2 - (iaOnPage1 ? 0 : iaH + SHEET_BODY.cardGap));
    const stream = [...p1.rest, ...p2];
    const packed = fillColumns(stream, columnCap2);
    const balanced = balanceColumns(packed.left, packed.right, columnCap2);
    const page1: PackedSheetPage = {
      left: p1.left,
      right: p1.right,
      leftH: p1.leftH,
      rightH: p1.rightH,
      iaH: iaOnPage1 ? iaH : 0,
      top: SHEET_BODY.top1,
      capacity: cap1,
    };
    const page2: PackedSheetPage = {
      left: packed.left,
      right: packed.right,
      leftH: balanced.leftH,
      rightH: balanced.rightH,
      iaH: iaOnPage1 ? 0 : iaH,
      top: SHEET_BODY.top2,
      capacity: cap2,
    };
    return { page1, page2, overflow: packed.rest };
  };

  // The brief's order: the IA card ends PAGE 1 when it fits, else it opens
  // page 2. Nothing merges across cycles, so the two-page rule is per cycle.
  const first = attempt(true);
  const second = first.overflow.length ? attempt(false) : null;
  const chosen = second ?? first;
  const iaOnPage1 = second === null;

  const ids = (page: PackedSheetPage) =>
    `L[${page.left.map((c) => `${c.card.id} ${c.layout.height.toFixed(1)}`).join(", ")}] R[${page.right.map((c) => `${c.card.id} ${c.layout.height.toFixed(1)}`).join(", ")}]`;
  const diagnostics: string[] = [
    `page 1: left ${chosen.page1.leftH.toFixed(1)}mm right ${chosen.page1.rightH.toFixed(1)}mm of ${chosen.page1.capacity.toFixed(0)}mm (${chosen.page1.left.length + chosen.page1.right.length} cards)${iaOnPage1 ? ` + IA ${chosen.page1.iaH.toFixed(1)}mm` : ""} ${ids(chosen.page1)}`,
    `page 2: left ${chosen.page2.leftH.toFixed(1)}mm right ${chosen.page2.rightH.toFixed(1)}mm of ${chosen.page2.capacity.toFixed(0)}mm (${chosen.page2.left.length + chosen.page2.right.length} cards)${iaOnPage1 ? "" : ` + IA ${chosen.page2.iaH.toFixed(1)}mm`} · tail ${tail.toFixed(1)}mm ${ids(chosen.page2)}`,
  ];

  const pack: SheetCyclePack = {
    page1: chosen.page1,
    page2: chosen.page2,
    iaOnPage1,
    step,
    hidden,
    dropped,
    violations: [],
    diagnostics,
  };
  pack.violations = overlapViolations(pack, chosen.overflow.length);
  return pack;
}

/** One card box in page coordinates (mm) — the overlap check's input. */
export type SheetBox = { id: string; page: 1 | 2; x: number; y: number; w: number; h: number };

/** Every box the pack will draw, in the order it is drawn. */
export function sheetBoxes(pack: SheetCyclePack): SheetBox[] {
  const out: SheetBox[] = [];
  const stack = (page: PackedSheetPage, which: 1 | 2, items: PackedSheetCard[], x: number, id: string) => {
    let y = page.top + SHEET_BODY.cardGap;
    for (const item of items) {
      out.push({ id: `${id}:${item.card.id}`, page: which, x, y, w: SHEET.colW, h: item.layout.height });
      y += item.height;
    }
    return y;
  };
  const end1 = Math.max(
    stack(pack.page1, 1, pack.page1.left, COLUMN_X.left, "L"),
    stack(pack.page1, 1, pack.page1.right, COLUMN_X.right, "R"),
  );
  if (pack.iaOnPage1 && pack.page1.iaH > 0) {
    out.push({ id: "IA", page: 1, x: SHEET.margin, y: end1 + SHEET_BODY.cardGap, w: SHEET.content, h: pack.page1.iaH });
  }
  const end2 = Math.max(
    stack(pack.page2, 2, pack.page2.left, COLUMN_X.left, "L"),
    stack(pack.page2, 2, pack.page2.right, COLUMN_X.right, "R"),
  );
  if (!pack.iaOnPage1 && pack.page2.iaH > 0) {
    out.push({ id: "IA", page: 2, x: SHEET.margin, y: end2 + SHEET_BODY.cardGap, w: SHEET.content, h: pack.page2.iaH });
  }
  return out;
}

/**
 * The overlap check (Part 4): no two boxes may intersect, and no box may
 * leave its page's content box (page 1 ends at 285 mm; page 2 keeps its tail
 * free for Remarks and Recent changes). CI and the runtime build both run it —
 * a violation is logged and never drawn over another card.
 */
export function overlapViolations(pack: SheetCyclePack, overflow = 0): string[] {
  const out: string[] = [];
  const boxes = sheetBoxes(pack);
  const bottom = SHEET_BODY.bottom;
  for (const box of boxes) {
    if (box.y + box.h > bottom + 0.01) {
      out.push(`${box.id} exceeds page ${box.page} (${(box.y + box.h).toFixed(1)}mm > ${bottom}mm)`);
    }
  }
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      if (a.page !== b.page) continue;
      const overlap =
        a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      if (overlap) out.push(`${a.id} overlaps ${b.id} on page ${a.page}`);
    }
  }
  if (overflow > 0) out.push(`${overflow} card${overflow === 1 ? "" : "s"} do not fit the two pages`);
  return out;
}

/**
 * The fit ladder, in the brief's order. The first rung that packs into the
 * two pages wins.
 *
 * Pages are PER CYCLE and the count is a hard 2 (Part 1.6), so the ladder ends
 * in force-fit rungs that shorten optional detail and, only as a last resort,
 * drop the lowest-priority follow-up cards — never a third page, never a
 * failed build.
 */
export function sheetLadder(
  options: { targetPages?: number; minSize?: number; chartMm?: number } = {},
): SheetStep[] {
  const minSize = Math.min(SHEET.body, Math.max(7, options.minSize ?? SHEET.min));
  const fullChart = options.chartMm ?? IA_CARD.chartMm;
  const base = {
    chartMm: fullChart,
    tight: false,
    clamp: false,
    collapseBlanks: false,
    hide: [] as string[],
    includeRecent: true,
    drop: [] as string[],
  };
  const sizes = [SHEET.body, 8, minSize].filter(
    (s, i, all) => s >= minSize && all.indexOf(s) === i,
  );
  const steps: SheetStep[] = [
    { id: "a:flow", ...base, size: SHEET.body },
    { id: "b:collapse-blanks", ...base, size: SHEET.body, collapseBlanks: true },
    { id: "c:tight-rows", ...base, size: SHEET.body, collapseBlanks: true, tight: true },
  ];
  for (const size of sizes.slice(1)) {
    steps.push({ id: `d:${size}pt`, ...base, size, collapseBlanks: true, tight: true });
  }
  const tight = {
    ...base,
    size: minSize,
    /* 36 mm is the floor: the chart must stay a readable 40 → 36, never a
       squashed 22 mm plot. If it still does not fit, the ladder hides
       optional detail instead. */
    chartMm: Math.min(IA_CARD.minChartMm, fullChart),
    collapseBlanks: true,
    tight: true,
    clamp: true,
  };
  steps.push(
    { id: "e:chart-36", ...tight },
    { id: "f:clamp-text", ...tight, chartMm: Math.min(IA_CARD.minChartMm, fullChart) },
    { id: "g1:recent-hidden", ...tight, chartMm: Math.min(IA_CARD.minChartMm, fullChart), includeRecent: false, hide: ["recent"] },
    {
      id: "g2:documents-detail-hidden",
      ...tight,
      chartMm: Math.min(IA_CARD.minChartMm, fullChart),
      includeRecent: false,
      hide: ["recent", "documentsDetail"],
    },
    {
      id: "g3:department-detail-hidden",
      ...tight,
      chartMm: Math.min(IA_CARD.minChartMm, fullChart),
      includeRecent: false,
      hide: ["recent", "documentsDetail", "departmentDetail"],
    },
    {
      id: "h:force-fit",
      ...tight,
      chartMm: Math.min(IA_CARD.minChartMm, fullChart),
      includeRecent: false,
      hide: ["recent", "documentsDetail", "departmentDetail"],
      drop: ["checks", "documents", "building"],
    },
    {
      id: "i:bare-fit",
      ...tight,
      chartMm: Math.min(IA_CARD.minChartMm, fullChart),
      includeRecent: false,
      hide: ["recent", "documentsDetail", "departmentDetail"],
      drop: ["checks", "documents", "building", "fund", "surveillance"],
    },
  );
  return steps;
}

/**
 * Pick the first ladder rung that fits BOTH pages of this cycle.
 * NEVER throws and never adds a page: the pack is always returned, with the
 * rung, everything shortened ("Shortened to fit: Recent changes hidden") and
 * every overlap violation logged.
 */
export function chooseFit(
  doc: jsPDF,
  model: SheetModel,
  showEmpty: boolean,
  options: { targetPages?: number; minSize?: number; chartMm?: number } = {},
): {
  size: number;
  includeRecent: boolean;
  diagnostics: string[];
  pack: SheetCyclePack;
  shortened: string[];
  dropped: string[];
  fits: boolean;
} {
  const diagnostics: string[] = [];
  const steps = sheetLadder(options);
  let last: SheetCyclePack | null = null;
  for (const step of steps) {
    const pack = layoutSheet(doc, model, step, showEmpty);
    last = pack;
    const fits = pack.violations.length === 0;
    diagnostics.push(
      `${fits ? "fit" : "overflow"}: ${step.id} · ${step.size}pt · 2 pages`,
      ...pack.diagnostics.map((d) => `  ${d}`),
    );
    if (!fits) diagnostics.push(...pack.violations.map((v) => `  ${v}`));
    if (fits) {
      const shortened = [...step.hide, ...step.drop];
      if (shortened.length) {
        diagnostics.push(`shortened: ${shortened.join(", ")} hidden to fit 2 pages`);
      }
      return {
        size: step.size,
        includeRecent: step.includeRecent,
        diagnostics,
        pack,
        shortened,
        dropped: pack.dropped,
        fits: true,
      };
    }
  }
  const pack = last ?? layoutSheet(doc, model, steps[steps.length - 1], showEmpty);
  diagnostics.push(
    `warning: the two pages could not hold every card at ${pack.step.size}pt; the sheet printed without overlap and the measured heights are logged above`,
  );
  return {
    size: pack.step.size,
    includeRecent: pack.step.includeRecent,
    diagnostics,
    pack,
    shortened: [...pack.hidden, ...pack.dropped],
    dropped: pack.dropped,
    fits: false,
  };
}

export async function buildFacilitySheet(row: MasterRow, opts: SheetOptions = {}): Promise<SheetResult> {
  const { jsPDF: JsPDF } = await import("jspdf");
  /* ONE report PER CYCLE: the current cycle prints on pages 1–2, the previous
     cycle on pages 3–4, and so on — never merged, never a third page per
     cycle, and the Cycle-history pages are gone entirely. */
  const cycles = facilityCycles(row, opts);
  const models = cycles.map((cycle) => buildCycleSheetModel(row, cycle, cycles, opts));
  const showEmpty = opts.showEmpty ?? false;
  /* A3 = the SAME A4 layout scaled 297/210 into the larger sheet: every
     column, gap and type size keeps its proportion, so the two-page contract
     and the alignment checks hold on both papers. */
  const a3 = opts.paper === "a3";
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: a3 ? "a3" : "a4" });
  installSheetFonts(doc, await loadSheetFonts());
  const scale = a3 ? 297 / SHEET.pageW : 1;
  /* `doc.scale` is jsPDF's mm to pt UNIT converter, not a transform, so the A3
     enlargement is the PDF matrix op itself (`cm`), written inside a saved
     graphics state. The content stream is per page, so it is re-applied after
     every addPage — otherwise page 2 would print at A4 coordinates. */
  const gfx = doc as unknown as {
    internal?: { write?: (op: string) => void; pageSize?: { getHeight(): number } };
  };
  /* jsPDF already flips Y against the REAL page height (420 mm on A3), so the
     matrix also has to pull the content back down: f = -(s-1)·H. Without that
     term the sheet would print off the bottom of the A3 page. */
  const pageHeightPt = (gfx.internal?.pageSize?.getHeight() ?? SHEET.pageH) * (72 / 25.4);
  const offsetPt = -(scale - 1) * pageHeightPt;
  const beginPage = () => {
    if (scale === 1) return;
    doc.saveGraphicsState();
    gfx.internal?.write?.(`${scale} 0 0 ${scale} 0 ${offsetPt.toFixed(3)} cm`);
  };
  const endPage = () => {
    if (scale === 1) return;
    doc.restoreGraphicsState();
  };
  const diagnostics: string[] = [];

  /* Part 2.4 — decode the symbol AS PRINTED before the sheet is drawn. At
     20 mm it is a version-4 symbol with 0.61 mm modules; a failed decode
     rebuilds once at 24 mm (0.73 mm modules) and logs the measured sizes. A
     second failure is recorded on the share row (Admin → Shared reports). */
  let qrSymbolMm: number = SHEET_QR.symbolMm;
  let qrCheckFailed = false;
  if (opts.qrUrl && opts.includeQr !== false) {
    try {
      const matrix = qrMatrix(opts.qrUrl, "M");
      const first = await decodePrintedQr(matrix, qrSymbolMm, 150);
      if (first !== opts.qrUrl) {
        qrSymbolMm = SHEET_QR.fallbackSymbolMm;
        diagnostics.push(
          `qr-check: 150 dpi decode failed at ${SHEET_QR.symbolMm} mm; rebuilt at ${qrSymbolMm} mm`,
        );
        const second = await decodePrintedQr(matrix, qrSymbolMm, 150);
        if (second !== opts.qrUrl) {
          qrCheckFailed = true;
          diagnostics.push(`qr-check: decode still failed at ${qrSymbolMm} mm`);
        }
      }
    } catch (err) {
      qrCheckFailed = true;
      diagnostics.push(
        `qr-check: ${err instanceof Error ? err.message : "the symbol could not be decoded"}`,
      );
    }
  }

  const reports = models.map((model) => {
    /* Measure, then pack. NEVER throws and never adds a page: the last rung
       drops the lowest-priority follow-up cards and logs it. */
    const fit = chooseFit(doc, model, showEmpty, {
      minSize: opts.minSize,
      chartMm: opts.chartHeight,
    });
    diagnostics.push(
      `cycle #${model.cycleNumber} (${model.cycleTag.toLowerCase()} · ${model.cycleType}): ${fit.size}pt · ${fit.pack.step.id} · ${fit.fits ? "fit on 2 pages" : "overflow"}`,
      ...fit.diagnostics.map((d) => `  ${d}`),
    );
    for (const violation of fit.pack.violations) {
      diagnostics.push(`  warning: overlap check — ${violation}`);
    }
    if (fit.shortened.length) {
      diagnostics.push(`shortened: ${fit.shortened.join(", ")} hidden to fit two pages`);
    }
    return { model, fit };
  });

  /* Exactly two pages per cycle, numbered across the whole document. */
  const total = reports.length * 2;
  reports.forEach((report, index) => {
    // Every cycle after the first starts a NEW page: the 2-page report is per
    // cycle, so cycle #2 begins on page 3 of the document.
    if (index > 0) doc.addPage();
    drawCycleReport(
      doc,
      report.model,
      report.fit.pack,
      report.fit.size,
      index * 2 + 1,
      total,
      index === 0,
      showEmpty,
      opts,
      beginPage,
      endPage,
      diagnostics,
      qrSymbolMm,
    );
  });

  const pages = doc.getNumberOfPages();
  /* Never fail the build over a page count: a mismatch is logged (it would
     mean a jsPDF anomaly), and the sheet still leaves with its content. */
  if (pages !== total) {
    diagnostics.push(`warning: jsPDF reports ${pages} pages, the pack planned ${total}`);
  }

  const shortened = [...new Set(reports.flatMap((r) => r.fit.shortened))];
  const fileName =
    opts.fileName ??
    facilityReportFileName({
      name: row.facility.name,
      facilityType: row.facility.facilityType,
      phc: row.facility.phc,
      typeLabels: opts.typeLabels,
      date: generatedDate(opts),
      ext: "pdf",
      cycles: { chosen: models.map((m) => m.cycleNumber), total: opts.cycleHistory?.length ?? models.length },
    });

  // Fail the export if any printed character has no glyph in the embedded face.
  const allText = [
    ...models.flatMap((model) => [
      model.facilityName,
      model.subtitle,
      model.statusLabel,
      model.validityChip,
      model.cycleHeading,
      model.cycleStartLabel,
      ...model.facts.flatMap((f) => [f.label, f.value]),
      ...model.page1Left.flatMap(cardTexts),
      ...model.page1Right.flatMap(cardTexts),
      ...model.page2Left.flatMap(cardTexts),
      ...model.page2Right.flatMap(cardTexts),
      ...model.recent.flatMap((r) => [r.when, r.who, r.what]),
      ...model.meta.flatMap((m) => [m.label, m.value]),
      ...model.checks,
      ...model.iaChart.points.flatMap((p) => [p.label, p.shortLabel]),
      model.iaChart.note,
    ]),
  ];
  const missing = unsupportedSheetGlyphs(...allText);
  if (missing.length) {
    throw new Error(
      `The facility sheet contains characters the embedded Noto Sans faces cannot draw: ${missing.join(" ")}. Remove or transliterate them, then export again.`,
    );
  }

  return {
    doc,
    pages,
    reportId: models[0]?.reportId ?? "",
    fileName,
    diagnostics,
    shortened,
    cycles: models.map((m) => m.cycleNumber),
    qrCheckFailed,
  };
}

/**
 * Draw ONE cycle report: page 1 (header band, title block, stepper, facts,
 * two columns, full-width IA card) and page 2 (slim header, remaining cards,
 * Remarks + Recent changes). The QR code is drawn ONCE per DOCUMENT, on the
 * first page of the first cycle. */
function drawCycleReport(
  doc: jsPDF,
  model: SheetModel,
  pack: SheetCyclePack,
  size: number,
  firstPage: number,
  total: number,
  firstOfDocument: boolean,
  showEmpty: boolean,
  opts: SheetOptions,
  beginPage: () => void,
  endPage: () => void,
  diagnostics: string[] = [],
  qrSymbolMm: number = SHEET_QR.symbolMm,
): void {
  const step = pack.step;
  const drawEmpty = showEmpty && !step.collapseBlanks;

  /* ---------------------------- page 1 ---------------------------- */
  beginPage();
  headerBand(doc, model, opts);

  /* QR: ONCE per document, on page 1 of the first cycle, in its own column.
     If the header boxes would ever intersect, the layout is rebuilt once
     without the caption (the QR itself stays); a remaining violation is
     logged and never printed over anything. */
  let header = sheetHeaderLayout(
    doc,
    model,
    firstOfDocument ? opts : { ...opts, qrUrl: undefined },
    { symbolMm: qrSymbolMm },
  );
  if (firstOfDocument) {
    let violations = headerBoxViolations(header.boxes);
    if (violations.length) {
      diagnostics.push(`header-relayout: ${violations.join("; ")}`);
      header = sheetHeaderLayout(doc, model, opts, { tight: true, symbolMm: qrSymbolMm });
      violations = headerBoxViolations(header.boxes);
      if (violations.length) diagnostics.push(`header-overlap: ${violations.join("; ")}`);
    }
  }

  doc.setTextColor(15, 23, 42);
  doc.setFont(SHEET_FONT, "bold");
  doc.setFontSize(header.titleSize);
  header.titleLines.forEach((line, i) => doc.text(line, SHEET.margin, header.titleYs[i]));
  doc.setFont(SHEET_FONT, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(header.subtitle, SHEET.margin, header.subtitleY);

  if (firstOfDocument && header.qr) {
    const { matrix, x, y, size } = header.qr;
    if (header.qrCheck && !header.qrCheck.ok)
      diagnostics.push(`qr-check: ${header.qrCheck.reason}`);
    try {
      drawQr(doc, matrix, x, y, size);
      /* The symbol itself is the link target: tapping it in any PDF viewer
         opens the digital copy. The URL exists only here and in the QR. */
      doc.link(x, y, size, size, { url: opts.qrUrl });
      if (header.caption) {
        doc.setFont(SHEET_FONT, "normal");
        doc.setFontSize(SHEET_QR.captionPt);
        doc.setTextColor(71, 85, 105);
        doc.text(header.caption.text, header.caption.x, header.caption.y);
      }
    } catch {
      /* the sheet still prints without the badge */
    }
  }

  for (const p of header.pills)
    drawPill(doc, p.x, p.y, p.text, p.tone, p.w, p.size);

  drawStepper(doc, model.stages, header.stepperY);
  drawFacts(doc, model.facts, header.factsY, header.factsH);

  const leftEnd = drawPackedColumn(doc, model, pack.page1.left, COLUMN_X.left, pack.page1.top, size, drawEmpty, step);
  const rightEnd = drawPackedColumn(doc, model, pack.page1.right, COLUMN_X.right, pack.page1.top, size, drawEmpty, step);
  if (pack.iaOnPage1 && pack.page1.iaH > 0) {
    drawIaCard(doc, model, Math.max(pack.page1.top, leftEnd, rightEnd) + SHEET_BODY.cardGap, step.chartMm);
  }
  footer(doc, model, firstPage, total, opts);
  endPage();

  /* ---------------------------- page 2 ---------------------------- */
  doc.addPage();
  beginPage();
  slimHeader(doc, model, opts);
  {
    const slim = slimHeaderLayout(doc, model);
    const violations = headerBoxViolations([slim.nameBox, slim.metaBox]);
    if (violations.length) diagnostics.push(`header-overlap p2: ${violations.join("; ")}`);
  }
  const left2 = drawPackedColumn(doc, model, pack.page2.left, COLUMN_X.left, pack.page2.top, size, drawEmpty, step);
  const right2 = drawPackedColumn(doc, model, pack.page2.right, COLUMN_X.right, pack.page2.top, size, drawEmpty, step);
  let cursor = Math.max(pack.page2.top, left2, right2);
  if (!pack.iaOnPage1 && pack.page2.iaH > 0) {
    cursor = drawIaCard(doc, model, cursor + SHEET_BODY.cardGap, step.chartMm);
  }
  cursor = drawMeta(doc, model.meta, cursor + 2);
  if (step.includeRecent && model.recent.length) {
    cursor = drawRecent(doc, model.recent, cursor);
  }
  void cursor;
  footer(doc, model, firstPage + 1, total, opts);
  endPage();
}

export async function exportFacilitySheet(row: MasterRow, opts: SheetOptions = {}): Promise<void> {
  const result = await buildFacilitySheet(row, opts);
  const blob = result.doc.output("blob") as Blob;
  if (opts.save) opts.save(blob, result.fileName);
  else result.doc.save(result.fileName);
}

/* --------------------------------------------------------------------------- */
/* Page furniture                                                              */
/* --------------------------------------------------------------------------- */

/**
 * Page 1 band of ONE cycle report: the cycle is named here (Part 1.3) —
 * "CYCLE #2 · RECERTIFICATION · CURRENT" or
 * "CYCLE #1 · INITIAL · SUPERSEDED BY CYCLE #2" — with a small "As recorded"
 * tag on a closed cycle and the cycle's own start date, never an upload date.
 */
/* --------------------------------------------------------------------------- */
/* Page-1 title block + QR badge (Part 1)                                      */
/* --------------------------------------------------------------------------- */

/**
 * QR badge geometry.
 *
 * SYMBOL 20 mm (0.60 mm modules for the 33-module version-4 symbol), quiet
 * zone 4 modules each side (2.4 mm), so the block incl. its white margin is
 * 24.8 mm. The block is right-aligned to the content edge and the caption sits
 * under it — there is no card, border or background box.
 */
export const SHEET_QR = {
  symbolMm: 20,
  /** Escalation rung when the generation-time self-check fails. */
  fallbackSymbolMm: 24,
  quietModules: 4,
  /** Left column ↔ QR column gutter. */
  gap: 4,
  caption: "Scan to open the digital copy",
  captionPt: 7,
  /** Block top; the header band ends at 20 mm. */
  top: 21.4,
  /** Caption baseline (below the block, inside the QR column only). */
  captionBaseline: 49.2,
} as const;

export type SheetHeaderBox = { id: string; x: number; y: number; w: number; h: number };

export type SheetHeaderPill = {
  text: string;
  tone: string;
  x: number;
  y: number;
  w: number;
  /** 7.5 pt normally, 7 pt when the wrapped chips had to tighten. */
  size?: number;
};

export type SheetHeaderLayout = {
  leftW: number;
  rightW: number;
  titleLines: string[];
  titleSize: number;
  titleYs: number[];
  subtitle: string;
  subtitleY: number;
  pills: SheetHeaderPill[];
  qr: { x: number; y: number; size: number; symbol: number; matrix: QrMatrix } | null;
  caption: { text: string; x: number; y: number; w: number } | null;
  stepperY: number;
  factsY: number;
  factsH: number;
  boxes: SheetHeaderBox[];
};

/** Shorten `text` until it fits `width` at the current font, with an ellipsis. */
function fitOneLine(doc: jsPDF, text: string, width: number): string {
  if (doc.getTextWidth(text) <= width) return text;
  let cut = text;
  while (cut.length > 1 && doc.getTextWidth(`${cut}\u2026`) > width) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}\u2026`;
}

/**
 * One layout for the page-1 title block, the chips and the QR badge.
 *
 * ROOT CAUSE of the overlap this replaces: the caption used to be a
 * right-aligned 7.5 pt string drawn at `qrX - 2` on the SAME baseline as the
 * chips (49.6 mm) with no width limit — roughly 150 mm long, so it ran back
 * across “Valid till 16-Feb-2029”, and its tail was clipped by the QR's white
 * block. Nothing is positioned by eye any more: the left column is measured
 * first, every chip is placed inside it, and the QR block gets its own column.
 *
 * The returned `boxes` feed the header overlap check.
 */
export function sheetHeaderLayout(
  doc: jsPDF,
  model: SheetModel,
  opts: SheetOptions,
  variant: { tight?: boolean; symbolMm?: number } = {},
): SheetHeaderLayout & { qrCheck: { ok: boolean; reason: string } | null } {
  const wantQr = !!opts.qrUrl && opts.includeQr !== false;
  let matrix: QrMatrix | null = null;
  if (wantQr) {
    try {
      matrix = qrMatrix(opts.qrUrl as string, "M");
    } catch {
      matrix = null;
    }
  }

  let symbolMm = variant.symbolMm ?? SHEET_QR.symbolMm;
  const qrCheck =
    matrix && opts.qrUrl
      ? qrSelfCheck(matrix, opts.qrUrl, { symbolMm })
      : null;
  /* The self-check failing once escalates to 24 mm — never below 20 mm. */
  if (qrCheck && !qrCheck.ok && symbolMm === SHEET_QR.symbolMm) {
    symbolMm = SHEET_QR.fallbackSymbolMm;
  }
  const qrBlock = matrix
    ? (symbolMm * (matrix.size + SHEET_QR.quietModules * 2)) / matrix.size
    : 0;

  /* The caption is the widest QR-column element (the symbol is 24.8 mm and the
     caption is ~33 mm at 7 pt), so the column is as wide as the caption and
     the caption is centred in it. The block stays flush with the right edge. */
  doc.setFont(SHEET_FONT, "normal");
  doc.setFontSize(SHEET_QR.captionPt);
  const captionW = doc.getTextWidth(sheetText(SHEET_QR.caption));
  const rightW = matrix ? Math.max(qrBlock, captionW) : qrBlock;
  const leftW = SHEET.content - (rightW > 0 ? rightW + SHEET_QR.gap : 0);

  /* ---- Title: one line if any size fits, else two lines at 12.5 pt ------- */
  const name = model.facilityName || "Facility";
  let titleSize = 16;
  doc.setFont(SHEET_FONT, "bold");
  doc.setFontSize(titleSize);
  for (const size of [16, 15, 14, 13, 12.5]) {
    doc.setFontSize(size);
    if (doc.getTextWidth(name) <= leftW) {
      titleSize = size;
      break;
    }
    titleSize = size;
  }
  doc.setFontSize(titleSize);
  let titleLines = wrapText(doc, name, leftW).slice(0, 2);
  if (titleLines.length === 1) {
    titleLines = [fitOneLine(doc, name, leftW)];
  } else {
    /* A third line is clipped with an ellipsis: the title block is a fixed
       two-line slot so the stepper and facts never move by more than 0.9 mm. */
    const rest = wrapText(doc, name, leftW).slice(1).join(" ");
    titleLines = [titleLines[0], fitOneLine(doc, rest, leftW)];
  }
  const twoLine = titleLines.length > 1;
  /* Two 12.5 pt lines need a 4.8 mm baseline gap so their bounding boxes are
     disjoint (the header overlap check tests the boxes, not the baselines). */
  const titleYs = twoLine ? [38.0, 42.8] : [39];

  /* ---- Subtitle: ONE line (ellipsis if it must) -------------------------- */
  doc.setFont(SHEET_FONT, "normal");
  doc.setFontSize(8.5);
  const subtitleY = twoLine ? 46.6 : 44.4;
  const subtitle = fitOneLine(doc, model.subtitle, leftW);

  /* ---- Chips: placed and wrapped inside the left column ------------------ */
  const pillY0 = twoLine ? 51.4 : 49.6;
  const chips = [
    { text: model.statusLabel, tone: model.statusTone },
    { text: `#${model.cycleNumber} ${model.cycleType}`, tone: "blue" },
    {
      text: model.validityChip,
      tone: /expired/i.test(model.validityChip) ? "red" : "green",
    },
  ];
  const pileChips = (size: number, rowGap: number) => {
    const out: SheetHeaderPill[] = [];
    let rowY = pillY0;
    let x = SHEET.margin;
    doc.setFont(SHEET_FONT, "bold");
    doc.setFontSize(size);
    for (const chip of chips) {
      const w = Math.min(leftW, doc.getTextWidth(sheetText(chip.text)) + 4.4);
      if (x > SHEET.margin && x + w > SHEET.margin + leftW) {
        x = SHEET.margin;
        rowY += rowGap;
      }
      out.push({ text: chip.text, tone: chip.tone, x, y: rowY, w, size });
      x += w + 2.4;
    }
    return { pills: out, lastY: rowY };
  };
  /* The facts strip must end inside the page-1 content box (cards start at
     86 mm). If wrapped chips would push it out, the chips tighten once. */
  let placed = pileChips(SHEET.min, 4.6);
  let stepperY = Math.max(twoLine ? 57.3 : 55.5, placed.lastY + 5.9);
  let factsY = Math.max(twoLine ? 69.8 : 68, stepperY + 12.5);
  if (factsY + 11 > SHEET_BODY.top1 - 1) {
    placed = pileChips(7, 4.2);
    stepperY = Math.max(twoLine ? 57.3 : 55.5, placed.lastY + 5.6);
    factsY = Math.max(twoLine ? 69.8 : 68, stepperY + 12.25);
  }
  const pills = placed.pills;
  const factsH = Math.max(11, Math.min(14, SHEET_BODY.top1 - 1.2 - factsY));
  /* Pill boxes always hang below their baseline by the same 3.1 mm, so the
     smaller chip font still fits the same 4.2 mm box. */

  /* ---- QR block + caption ------------------------------------------------ */
  let qr: SheetHeaderLayout["qr"] = null;
  let caption: SheetHeaderLayout["caption"] = null;
  if (matrix && rightW > 0) {
    const qx = SHEET.pageW - SHEET.margin - qrBlock;
    qr = { x: qx, y: SHEET_QR.top, size: qrBlock, symbol: symbolMm, matrix };
    if (!variant.tight) {
      const capX = Math.min(
        Math.max(qx + (qrBlock - captionW) / 2, SHEET.margin + leftW + SHEET_QR.gap),
        SHEET.pageW - SHEET.margin - captionW,
      );
      caption = {
        text: SHEET_QR.caption,
        x: capX,
        y: SHEET_QR.captionBaseline,
        w: captionW,
      };
    }
  }

  /* ---- Bounding boxes for the header overlap check ----------------------- */
  const boxes: SheetHeaderBox[] = [];
  doc.setFont(SHEET_FONT, "bold");
  doc.setFontSize(titleSize);
  titleLines.forEach((line, i) => {
    boxes.push({
      id: `title-${i + 1}`,
      x: SHEET.margin,
      y: titleYs[i] - titleSize * 0.3528 * 0.78,
      w: doc.getTextWidth(line),
      h: titleSize * 0.3528 * 0.95,
    });
  });
  doc.setFont(SHEET_FONT, "normal");
  doc.setFontSize(8.5);
  boxes.push({
    id: "subtitle",
    x: SHEET.margin,
    y: subtitleY - 2.3,
    w: doc.getTextWidth(subtitle),
    h: 3.1,
  });
  for (const [i, p] of pills.entries()) {
    boxes.push({ id: `pill-${i + 1}`, x: p.x, y: p.y - 3.1, w: p.w, h: 4.2 });
  }
  if (qr) boxes.push({ id: "qr", x: qr.x, y: qr.y, w: qr.size, h: qr.size });
  if (caption)
    boxes.push({
      id: "qr-caption",
      x: caption.x,
      y: caption.y - 2.4,
      w: caption.w,
      h: 3.2,
    });

  return {
    leftW,
    rightW,
    titleLines,
    titleSize,
    titleYs,
    subtitle,
    subtitleY,
    pills,
    qr,
    caption,
    stepperY,
    factsY,
    factsH,
    boxes,
    qrCheck,
  };
}

/** Any two header boxes that intersect, or any box outside the content width. */
export function headerBoxViolations(boxes: SheetHeaderBox[]): string[] {
  const out: string[] = [];
  for (const b of boxes) {
    if (b.x < SHEET.margin - 0.01 || b.x + b.w > SHEET.pageW - SHEET.margin + 0.01) {
      out.push(`${b.id} leaves the content width (${b.x.toFixed(1)}–${(b.x + b.w).toFixed(1)}mm)`);
    }
  }
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      const hit =
        a.x < b.x + b.w - 0.01 &&
        b.x < a.x + a.w - 0.01 &&
        a.y < b.y + b.h - 0.01 &&
        b.y < a.y + a.h - 0.01;
      if (hit) out.push(`${a.id} overlaps ${b.id}`);
    }
  }
  return out;
}

/** Page-2 slim header boxes: the facility name never runs under the NIN line. */
export function slimHeaderLayout(
  doc: jsPDF,
  model: SheetModel,
): { name: string; nameBox: SheetHeaderBox; metaBox: SheetHeaderBox } {
  const meta = `NIN ${model.nin || DASH} · Cycle #${model.cycleNumber} · ${model.isCurrentCycle ? "Current" : "As recorded"}`;
  doc.setFont(SHEET_FONT, "normal");
  doc.setFontSize(7.5);
  const metaW = doc.getTextWidth(meta);
  const leftW = SHEET.content - metaW - 4;
  doc.setFont(SHEET_FONT, "bold");
  doc.setFontSize(9);
  const name = fitOneLine(doc, model.facilityName || "Facility", leftW);
  return {
    name,
    nameBox: { id: "p2-name", x: SHEET.margin, y: 3.6, w: doc.getTextWidth(name), h: 4.4 },
    metaBox: {
      id: "p2-meta",
      x: SHEET.pageW - SHEET.margin - metaW,
      y: 3.6,
      w: metaW,
      h: 4.4,
    },
  };
}

function headerBand(doc: jsPDF, model: SheetModel, opts: SheetOptions) {
  doc.setFillColor(13, 105, 96);
  doc.rect(0, 0, SHEET.pageW, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont(SHEET_FONT, "bold");
  doc.setFontSize(12);
  doc.text("NQAS STATUS REPORT", SHEET.margin, 7.4);
  doc.setFontSize(8.5);
  doc.text(sheetText(model.cycleHeading), SHEET.margin, 12.6);
  if (!model.isCurrentCycle) {
    doc.setFont(SHEET_FONT, "normal");
    doc.setFontSize(SHEET.min - 0.5);
    doc.text(sheetText(`As recorded · ${model.cycleStartLabel}`), SHEET.margin, 17.4);
  } else {
    doc.setFont(SHEET_FONT, "normal");
    doc.setFontSize(SHEET.min - 0.5);
    doc.text(sheetText(`${model.cycleStartLabel} · read-only history for earlier cycles`), SHEET.margin, 17.4);
  }
  doc.setFont(SHEET_FONT, "normal");
  doc.setFontSize(7.5);
  doc.text(sheetText(opts.department ?? DEPARTMENT), SHEET.pageW - SHEET.margin, 7.4, { align: "right" });
  doc.text(`Generated ${model.generatedAt}`, SHEET.pageW - SHEET.margin, 12.6, { align: "right" });
  doc.text("Facility profile sheet", SHEET.pageW - SHEET.margin, 17.4, { align: "right" });
  doc.setTextColor(15, 23, 42);
}

/** Page 2 band: facility, NIN and the cycle this page belongs to. */
function slimHeader(doc: jsPDF, model: SheetModel, opts: SheetOptions) {
  doc.setFillColor(13, 105, 96);
  doc.rect(0, 0, SHEET.pageW, 10, "F");
  doc.setTextColor(255, 255, 255);
  const slim = slimHeaderLayout(doc, model);
  doc.setFont(SHEET_FONT, "bold");
  doc.setFontSize(9);
  doc.text(sheetText(slim.name), SHEET.margin, 6.6);
  doc.setFont(SHEET_FONT, "normal");
  doc.setFontSize(7.5);
  doc.text(
    `NIN ${model.nin || DASH} · Cycle #${model.cycleNumber} · ${model.isCurrentCycle ? "Current" : "As recorded"}`,
    SHEET.pageW - SHEET.margin,
    6.6,
    { align: "right" },
  );
  doc.setTextColor(15, 23, 42);
  void opts;
}

/**
 * Lifecycle stepper — SAME design (six equal columns, circles, connector,
 * bold/grey states); only the spacing is fixed (Part 4).
 *
 * ROOT CAUSE of the ragged baselines: `date` was drawn only when a stage had
 * one (`y + 6 + lines.length * 2.6`), so Surveillance (no date) reserved three
 * lines while every other stage reserved four; long labels wrapped to two
 * lines, moving their dates down by 2.6 mm. The tokens below are millimetres,
 * every stage reserves the SAME label block and the SAME date block, and the
 * connector is pinned to the circle centre line — so all labels share one
 * baseline and all dates share one baseline. */
export const STEPPER = {
  /* The CURRENT stage draws a 2.6 mm ring, so the token is the largest
     radius: circle edge → label top is then 1.6 mm for every stage. */
  circleR: 2.6,
  circleToLabel: 1.6,
  labelPt: 8.5,
  labelLinePt: 10.5,
  labelToDate: 0.6,
  datePt: 7.5,
  dateLinePt: 9,
  /** 1 pt = 0.3528 mm. */
  labelAscent: 8.5 * 0.3528 * 0.75,
  dateAscent: 7.5 * 0.3528 * 0.75,
} as const;

/** The one baseline pair every stage shares: label top = circle → 1.6 mm;
 *  every stage reserves the SAME 10.5 pt label block, so a stage without a
 *  date (or with a long label) can never move a neighbour's date. */
export function stepperTextBaselines(y: number): { label: number; date: number } {
  const labelTop = y + STEPPER.circleR + STEPPER.circleToLabel;
  const labelBlock = STEPPER.labelLinePt * 0.3528;
  return {
    label: labelTop + STEPPER.labelAscent,
    date: labelTop + labelBlock + STEPPER.labelToDate + STEPPER.dateAscent,
  };
}

function drawStepper(doc: jsPDF, stages: SheetModel["stages"], y: number) {
  const n = stages.length;
  const stepW = SHEET.content / n;
  const { label: labelBaseline, date: dateBaseline } = stepperTextBaselines(y);
  stages.forEach((s, i) => {
    const cx = SHEET.margin + stepW * i + stepW / 2;
    const done = s.state === "done";
    const current = s.state === "current";
    const blocked = s.state === "blocked";
    if (i < n - 1) {
      // Centred on the circle centres, clear of the circles themselves.
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.35);
      doc.line(
        cx + STEPPER.circleR + 1.4,
        y,
        cx + stepW - STEPPER.circleR - 1.4,
        y,
      );
    }
    const tone: [number, number, number] = blocked ? [185, 28, 28] : done ? [4, 120, 87] : current ? [3, 105, 161] : [203, 213, 225];
    doc.setFillColor(...tone);
    doc.setDrawColor(...tone);
    doc.setLineWidth(0.3);
    if (current) {
      doc.circle(cx, y, 2.6, "FD");
      doc.setFillColor(255, 255, 255);
      doc.circle(cx, y, 1.1, "F");
    } else {
      doc.circle(cx, y, 1.9, done || blocked ? "FD" : "S");
    }
    doc.setFont(SHEET_FONT, done || current ? "bold" : "normal");
    /* Long labels shrink letter-spacing before size, and never wrap, so the
       label block stays exactly 10.5 pt tall. */
    let size: number = STEPPER.labelPt;
    let spacing = 0;
    doc.setFontSize(size);
    const natural = doc.getTextWidth(s.label);
    const maxW = stepW - 2;
    if (natural > maxW) {
      spacing = Math.max(-0.16, (maxW - natural) / Math.max(1, s.label.length - 1));
      if (natural + spacing * (s.label.length - 1) > maxW) size = 8;
    }
    doc.setFontSize(size);
    doc.setCharSpace(size === STEPPER.labelPt ? spacing : 0);
    doc.setTextColor(done || current || blocked ? 15 : 148, done || current || blocked ? 23 : 163, done || current || blocked ? 42 : 184);
    doc.text(s.label, cx, labelBaseline, { align: "center" });
    doc.setCharSpace(0);
    if (s.date) {
      doc.setFont(SHEET_FONT, "normal");
      doc.setFontSize(STEPPER.datePt);
      doc.setTextColor(100, 116, 139);
      doc.text(s.date, cx, dateBaseline, { align: "center" });
    }
  });
  doc.setTextColor(0, 0, 0);
}

/** Six fact tiles on the same grid: 30.66mm each, equal gaps. The height is
 *  passed in so a two-line facility name can take 1 mm without overflowing the
 *  page-1 content box. */
function drawFacts(doc: jsPDF, facts: SheetModel["facts"], y: number, height = 14) {
  const gap = 3.2;
  const w = (SHEET.content - gap * (facts.length - 1)) / facts.length;
  facts.forEach((f, i) => {
    const x = SHEET.margin + i * (w + gap);
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.setLineWidth(0.15);
    doc.roundedRect(x, y, w, height, 1.4, 1.4, "FD");
    doc.setFont(SHEET_FONT, "normal");
    doc.setFontSize(SHEET.min);
    doc.setTextColor(100, 116, 139);
    doc.text(wrapText(doc, f.label, w - 3)[0] ?? "", x + 1.5, y + 4);
    doc.setFont(SHEET_FONT, "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    const valueLines = wrapText(doc, f.value, w - 3);
    valueLines.slice(0, 2).forEach((l, li) => doc.text(l, x + 1.5, y + 8.4 + li * 3.2));
  });
  doc.setTextColor(0, 0, 0);
}

/* --------------------------------------------------------------------------- */
/* Part B — IA four-quarter table + vector chart                               */
/* --------------------------------------------------------------------------- */

/**
 * The IA card (Part 3): ONE card — the four-quarter table (rows NQAS IA /
 * Kayakalp IA, columns the real quarter names, a Change column) and the vector
 * chart below it. `chartMm` is the chart's own height; the measurement and the
 * drawing read the same numbers, so a packed card is never clipped.
 */
/** Card height in mm (band + shared six-column table + grouped-column chart).
 *  MEASURE === DRAW: both call `layoutIaCard` with the same width and chart
 *  height, so the packer can never reserve less than the card prints. */
export function measureIaCard(
  _doc: jsPDF,
  model: SheetModel,
  w: number = SHEET.content,
  chartMm: number = IA_CARD.chartMm,
): number {
  if (model.iaChart.points.length === 0) return 13;
  return 5.4 + layoutIaCard(model.iaChart.points, model.iaChart.change, { width: w, chartMm }).height;
}

const IA_SERIES = IA_CARD_SERIES;

/** Draw the full-width IA card at `y`; returns the y below it. */
export function drawIaCard(doc: jsPDF, model: SheetModel, y: number, chartMm = 44): number {
  const chart = model.iaChart;
  const w = SHEET.content;
  const h = measureIaCard(doc, model, w, chartMm);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.12);
  doc.rect(SHEET.margin, y, w, h, "S");
  doc.setFillColor(13, 105, 96);
  doc.rect(SHEET.margin, y, w, 5.4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont(SHEET_FONT, "bold");
  doc.setFontSize(SHEET.min);
  doc.text("INTERNAL ASSESSMENT & KAYAKALP — LAST FOUR QUARTERS", SHEET.margin + 2.2, y + 3.7);
  doc.setFont(SHEET_FONT, "normal");
  doc.setTextColor(0, 0, 0);

  if (chart.points.length === 0) {
    doc.setFont(SHEET_FONT, "italic");
    doc.setTextColor(100, 116, 139);
    doc.text(
      sheetText(chart.note || "No internal assessment scores reported"),
      SHEET.margin + 2.2,
      y + 9.6,
    );
    doc.setTextColor(0, 0, 0);
    return y + h;
  }

  /* ---- ONE six-column grid: Tracker · Q-3 · Q-2 · Q-1 · Latest · Change.
     `layoutIaCard` owns the geometry, and the chart below reads the SAME
     column boxes — bar i is centred under header i by construction. ---- */
  const layout = layoutIaCard(chart.points, chart.change, {
    width: w,
    chartMm,
    decimals: SCORE_DECIMALS,
  });
  const X = SHEET.margin;
  const Y = y + 5.4;
  const rowH = IA_CARD.rowH;
  const headerY = Y + layout.tableTop;
  doc.setFillColor(241, 245, 249);
  doc.rect(X, headerY, w, rowH, "F");
  doc.setFont(SHEET_FONT, "bold");
  doc.setFontSize(SHEET.min);
  doc.setTextColor(71, 85, 105);
  doc.text("Tracker", X + layout.labelX, headerY + 2.8);
  layout.quarters.forEach((q) => {
    // The real quarter name from the data ("Q3 25-26"), never a placeholder.
    doc.text(q.point.shortLabel, X + q.centre, headerY + 2.8, { align: "center" });
  });
  doc.text("Change", X + layout.changeRight - 1.2, headerY + 2.8, { align: "right" });

  const scoreCell = (v: number | null) => (v == null ? "Not reported" : scoreText(v));
  IA_SERIES.forEach((series, s) => {
    const ry = headerY + rowH + s * rowH;
    if (s % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(X, ry, w, rowH, "F");
    }
    doc.setFont(SHEET_FONT, "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(series.label, X + layout.labelX, ry + 2.8);
    doc.setFont(SHEET_FONT, "normal");
    layout.quarters.forEach((q) => {
      const value = series.key === "nqas" ? q.point.nqas : q.point.kayakalp;
      doc.setTextColor(value == null ? 148 : 15, value == null ? 163 : 23, value == null ? 184 : 42);
      // Right-aligned numbers so a column of scores reads down the page.
      doc.text(scoreCell(value), X + q.x1 - 2, ry + 2.8, { align: "right" });
    });
    const delta = series.key === "nqas" ? chart.change.nqas : chart.change.kayakalp;
    const mark = changeMark(delta);
    const cx = X + layout.changeRight - 1.2;
    if (mark && delta != null) {
      drawChangeMark(
        doc,
        cx - doc.getTextWidth(iaChangeText(delta, SCORE_DECIMALS).replace(/^[^0-9]+/, "")) - 2.6,
        ry + 2.4,
        mark,
        TONES[mark === "flat" ? "grey" : mark === "up" ? "green" : "red"],
      );
      doc.setTextColor(15, 23, 42);
      doc.text(`${delta > 0 ? "+" : ""}${delta.toFixed(SCORE_DECIMALS)}`, cx, ry + 2.8, { align: "right" });
    } else {
      doc.setTextColor(148, 163, 184);
      doc.text(DASH, cx, ry + 2.8, { align: "right" });
    }
  });  /* ---- grouped COLUMNS, 0–100, target 70 (no shaded band) ---- */
  const plotX0 = X + layout.labelX;
  const plotX1 = X + w - 3.2;
  const plotTop = Y + layout.plotTop;
  const plotBottom = Y + layout.plotBottom;
  const plotH = plotBottom - plotTop;
  const yOf = (v: number) => plotBottom - (Math.max(0, Math.min(100, v)) / 100) * plotH;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.12);
  for (const v of [0, 50, 100]) doc.line(plotX0, yOf(v), plotX1, yOf(v));
  doc.setFont(SHEET_FONT, "normal");
  doc.setFontSize(SHEET.min);
  doc.setTextColor(100, 116, 139);
  for (const v of [0, 50, 100]) doc.text(String(v), plotX0 - 1, yOf(v) + 1, { align: "right" });
  doc.text("Score %", plotX0, plotTop - 1.2);
  doc.setDrawColor(180, 83, 9);
  doc.setLineWidth(0.25);
  doc.setLineDashPattern([1.4, 1], 0);
  doc.line(plotX0, yOf(70), plotX1, yOf(70));
  doc.setLineDashPattern([], 0);
  doc.setFont(SHEET_FONT, "bold");
  doc.setTextColor(180, 83, 9);
  doc.text("70", plotX0 - 1, yOf(70) - 1, { align: "right" });

  /* The quarter labels are the SAME columns as the header row. */
  doc.setFont(SHEET_FONT, "normal");
  doc.setFontSize(SHEET.min);
  doc.setTextColor(71, 85, 105);
  layout.quarters.forEach((q) => {
    doc.text(q.point.shortLabel, X + q.centre, plotBottom + 3.6, { align: "center" });
  });

  const hatchBar = (bx: number, by: number, bw: number, bh: number) => {
    if (bw <= 0 || bh <= 0) return;
    doc.setFillColor(255, 247, 237);
    doc.rect(bx, by, bw, bh, "F");
    doc.setDrawColor(180, 83, 9);
    doc.setLineWidth(0.22);
    for (let t = 0.8; t < bw + bh; t += 1.35) {
      const x1 = Math.max(0, t - bh);
      const x2 = Math.min(bw, t);
      if (x2 <= x1) continue;
      doc.line(bx + x1, by + (t - x1), bx + x2, by + (t - x2));
    }
    doc.setDrawColor(180, 83, 9);
    doc.setLineWidth(0.25);
    doc.rect(bx, by, bw, bh, "S");
  };

  layout.bars.forEach((bar) => {
    if (bar.value == null || bar.h <= 0) return;
    const bx = X + bar.x;
    const by = Y + bar.y;
    if (bar.series === "kayakalp") hatchBar(bx, by, bar.w, bar.h);
    else {
      doc.setFillColor(15, 118, 110);
      doc.rect(bx, by, bar.w, bar.h, "F");
    }
  });

  /* Missing quarters: a hatched place-holder and the words, never a 0 bar. */
  layout.emptySlots.forEach((slot) => {
    doc.setFont(SHEET_FONT, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    if (slot.text === "Not reported") {
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(X + slot.x - slot.width / 2, plotBottom, X + slot.x + slot.width / 2, plotBottom);
      doc.setLineDashPattern([], 0);
    }
    doc.text(slot.text, X + slot.x, Y + slot.y, { align: "center" });
  });

  layout.labels.forEach((label) => {
    doc.setFont(SHEET_FONT, label.bold ? "bold" : "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(label.kind === "inside" ? 255 : 15, label.kind === "inside" ? 255 : 23, label.kind === "inside" ? 255 : 42);
    doc.text(label.text, X + label.x, Y + label.y, { align: "center" });
  });

  /* Change marks in the chart row, vertically centred on the plot — the same
     ▲ ▼ ■ wording as the table, so no separate legend is needed. */
  const midY = plotTop + plotH / 2;
  [
    { key: "nqas" as const, y: midY - 1.2 },
    { key: "kayakalp" as const, y: midY + 3.2 },
  ].forEach(({ key, y: cy }) => {
    const delta = key === "nqas" ? chart.change.nqas : chart.change.kayakalp;
    const mark = changeMark(delta);
    const cx = X + layout.changeRight - 1.2;
    if (!mark || delta == null) {
      doc.setFont(SHEET_FONT, "normal");
      doc.setFontSize(SHEET.min);
      doc.setTextColor(148, 163, 184);
      doc.text(DASH, cx, cy + 0.6, { align: "right" });
      return;
    }
    const text = `${delta > 0 ? "+" : ""}${delta.toFixed(SCORE_DECIMALS)}`;
    doc.setFont(SHEET_FONT, "normal");
    doc.setFontSize(SHEET.min);
    drawChangeMark(
      doc,
      cx - doc.getTextWidth(text) - 2.4,
      cy + 0.3,
      mark,
      TONES[mark === "flat" ? "grey" : mark === "up" ? "green" : "red"],
    );
    doc.setTextColor(15, 23, 42);
    doc.text(text, cx, cy + 0.6, { align: "right" });
  });

  /* Legend on ONE line, same patterns as the bars. */
  const legendY = Y + layout.legendY + 2;
  doc.setFillColor(15, 118, 110);
  doc.rect(X + IA_CARD.pad, legendY - 2.2, 3, 3, "F");
  doc.setFont(SHEET_FONT, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("NQAS IA", X + IA_CARD.pad + 4.2, legendY);
  hatchBar(X + IA_CARD.pad + 22, legendY - 2.2, 3, 3);
  doc.setTextColor(71, 85, 105);
  doc.text("Kayakalp IA", X + IA_CARD.pad + 26.2, legendY);
  doc.setDrawColor(180, 83, 9);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([1.4, 1], 0);
  doc.line(X + IA_CARD.pad + 47, legendY - 0.8, X + IA_CARD.pad + 54, legendY - 0.8);
  doc.setLineDashPattern([], 0);
  doc.setTextColor(71, 85, 105);
  doc.text("Target 70", X + IA_CARD.pad + 55, legendY);
  if (chart.note) {
    doc.setFont(SHEET_FONT, "italic");
    doc.setTextColor(100, 116, 139);
    doc.text(sheetText(chart.note), X + w - IA_CARD.pad, Y + layout.noteY, { align: "right" });
  }

  doc.setTextColor(0, 0, 0);
  return y + h;
}

/** Draw a packed column: every card at its real y (the layout rows carry
 *  absolute y, so the card is re-measured at the position it prints at). */
function drawPackedColumn(
  doc: jsPDF,
  model: SheetModel,
  items: PackedSheetCard[],
  x: number,
  y: number,
  size: number,
  showEmpty: boolean,
  step: SheetStep,
): number {
  let cursor = y;
  for (const item of items) {
    const cardOpts = {
      tight: step.tight,
      clamp: step.clamp,
      hideMissingLine: step.collapseBlanks,
    };
    const layout = measureCard(doc, item.card, x, cursor, SHEET.colW, size, showEmpty, cardOpts);
    drawCard(doc, layout, x, cursor, SHEET.colW, size, showEmpty, cardOpts);
    cursor += item.height;
  }
  void model;
  return cursor;
}

/* --------------------------------------------------------------------------- */
/* (The Cycle-history and comparison pages were REMOVED in this change: every
   cycle now prints its own 2-page report, so there is no timeline page, no
   comparison table and no "Cycle #N documents" list in the PDF.)             */
/* --------------------------------------------------------------------------- */



function cardTexts(card: SheetCard): string[] {
  const out = [card.title];
  for (const row of card.rows) {
    if (row.label) out.push(row.label);
    if (row.value) out.push(row.value);
    if (row.mini) {
      out.push(row.mini.previousLabel, row.mini.latestLabel);
      for (const m of row.mini.rows) out.push(m.name);
    }
  }
  return out;
}

function drawRecent(doc: jsPDF, recent: SheetModel["recent"], y: number): number {
  const w = SHEET.content;
  doc.setFillColor(241, 245, 249);
  doc.rect(SHEET.margin, y, w, 6, "F");
  doc.setFont(SHEET_FONT, "bold");
  doc.setFontSize(SHEET.body);
  doc.setTextColor(15, 23, 42);
  doc.text("RECENT CHANGES", SHEET.margin + 2.4, y + 4);
  let cursor = y + 9;
  doc.setFont(SHEET_FONT, "normal");
  doc.setFontSize(SHEET.min);
  for (const r of recent) {
    doc.setTextColor(71, 85, 105);
    doc.text(r.when, SHEET.margin + 2.4, cursor);
    doc.text(r.who.slice(0, 20), SHEET.margin + 38, cursor);
    // Every entry carries its cycle chip, in print as on screen.
    doc.setTextColor(13, 105, 96);
    doc.text(r.cycle, SHEET.margin + 62, cursor);
    doc.setTextColor(15, 23, 42);
    const lines = wrapText(doc, r.what, w - 80);
    doc.text(lines[0] ?? "", SHEET.margin + 72, cursor);
    cursor += 5.4;
  }
  doc.setTextColor(0, 0, 0);
  return cursor + 2;
}

function drawMeta(doc: jsPDF, meta: SheetModel["meta"], y: number): number {
  const w = SHEET.content;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.rect(SHEET.margin, y, w, 4, "F");
  let cursor = y + 7;
  doc.setFontSize(SHEET.label);
  for (const m of meta) {
    if (!m.value) continue;
    doc.setFont(SHEET_FONT, "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`${m.label}:`, SHEET.margin + 2.4, cursor);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(SHEET.body);
    const lines = wrapText(doc, m.value, w - 44);
    lines.forEach((l, i) => doc.text(l, SHEET.margin + 42, cursor + i * 3.4));
    cursor += Math.max(1, lines.length) * 3.4 + 1.6;
    doc.setFontSize(SHEET.label);
  }
  doc.setTextColor(0, 0, 0);
  return cursor;
}

/* The end-of-document QR block is GONE (Part 1.5): the code appears exactly
   once, in the title band of page 1, and opens the digital copy of the whole
   PDF. The old verification box also printed the short link, which the brief
   no longer wants on the page. */

function footer(doc: jsPDF, model: SheetModel, page: number, total: number, opts: SheetOptions) {
  const y = SHEET.pageH - 6.5;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.15);
  doc.line(SHEET.margin, y - 4.4, SHEET.pageW - SHEET.margin, y - 4.4);
  doc.setFont(SHEET_FONT, "normal");
  doc.setFontSize(SHEET.min);
  doc.setTextColor(100, 116, 139);
  const line = sheetText(
    `NIN ${model.nin || DASH} · Cycle #${model.cycleNumber}${model.isCurrentCycle ? "" : " (as recorded)"} · Data as of ${model.dataAsOf} · Page ${page} of ${total}`,
  );
  doc.text(line, SHEET.margin, y);
  doc.setFontSize(SHEET.min - 0.5);
  doc.text(sheetText(CONFIDENTIAL), SHEET.pageW - SHEET.margin, y - 4, { align: "right" });
  void opts;
}
