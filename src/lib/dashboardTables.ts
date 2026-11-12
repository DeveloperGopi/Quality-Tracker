/**
 * DASHBOARD TABLE DEFINITIONS — every table the Dashboard exports, with its
 * column list and its row builder kept NEXT TO EACH OTHER so they cannot drift.
 *
 * This file is the fix for the "Dashboard summary — current filter" bug (see
 * lib/reportColumns.ts for the full root cause): the header array and the row
 * builder used to live in different parts of Dashboard.tsx and one of them was
 * mutated at the call site (`FILTERED_HEADERS.slice(1)`), so the printed header
 * lost its first label while the rows kept their first cell.
 *
 * Rules
 *  1. Every table exposes `headers` and `buildRows` from the same object, and
 *     the filtered-facility report is generated from ONE `columns[]` model.
 *  2. Nothing may slice, shift or unshift a header list or a row at a call
 *     site. If a table needs a different shape, it gets a different definition.
 *  3. The serial number is a REAL column with a real "S.No" header, never a
 *     bolt-on cell that the header list does not know about.
 *
 * scripts/reportColumns.test.ts walks DASHBOARD_TABLES and asserts that every
 * header list is exactly as long as every row of its body.
 */

import { COLUMN_BY_KEY } from "@/lib/masterColumns";
import {
  reportColumn,
  formatReportDate,
  reportHeaders,
  reportRows,
  type ReportColumn,
} from "@/lib/reportColumns";

/* --------------------------------------------------------------------------- */
/* The filtered-facility report ("Dashboard summary — current filter")          */
/* --------------------------------------------------------------------------- */

/**
 * The label of the old "Pipeline Status" column, read from the ONE configured
 * place (lib/masterColumns) instead of being re-typed here — a future rename
 * therefore updates this report automatically.
 */
export const FACILITY_CURRENT_STATUS_LABEL = COLUMN_BY_KEY.pipelineStatus.label;

/** Structural view of the row this report prints (the page passes `Flagged`
 *  rows, which are a superset of this). */
export type FilteredReportRow = {
  facility: {
    name: string;
    facilityType?: string | null;
    block: string;
    phc: string;
    eligibility?: string | null;
  };
  sa: { scorePercent?: number | null } | null;
  nqas: { scorePercent?: number | null; validityDate?: string | null } | null;
  view: { currentStatus: string; docStage?: string | null };
};

/** ONE ordered column list for the filtered report. The header row, the Excel
 *  sheet, the PDF, the CSV and the print view all map over this array. */
export const DASHBOARD_FILTERED_COLUMNS: ReportColumn<FilteredReportRow>[] = [
  reportColumn<FilteredReportRow>({
    key: "sno",
    label: "S.No",
    type: "index",
    align: "right",
    width: 44,
    exportable: true,
    raw: (_row, index) => index + 1,
  }),
  reportColumn<FilteredReportRow>({
    key: "facility",
    label: "Facility",
    type: "text",
    align: "left",
    width: 190,
    exportable: true,
    raw: (r) => r.facility.name,
  }),
  reportColumn<FilteredReportRow>({
    key: "type",
    label: "Type",
    type: "text",
    align: "left",
    width: 84,
    exportable: true,
    raw: (r) => r.facility.facilityType,
  }),
  reportColumn<FilteredReportRow>({
    key: "block",
    label: "Block",
    type: "text",
    align: "left",
    width: 104,
    exportable: true,
    raw: (r) => r.facility.block,
  }),
  reportColumn<FilteredReportRow>({
    key: "phc",
    label: "PHC",
    type: "text",
    align: "left",
    width: 110,
    exportable: true,
    raw: (r) => r.facility.phc,
  }),
  reportColumn<FilteredReportRow>({
    key: "currentStatus",
    label: FACILITY_CURRENT_STATUS_LABEL,
    type: "status",
    align: "center",
    width: 170,
    exportable: true,
    raw: (r) => r.view.currentStatus,
  }),
  reportColumn<FilteredReportRow>({
    key: "eligibility",
    label: "Eligibility",
    type: "status",
    align: "center",
    width: 120,
    exportable: true,
    raw: (r) => r.facility.eligibility,
  }),
  reportColumn<FilteredReportRow>({
    key: "saScore",
    label: "SA score %",
    type: "score",
    align: "right",
    width: 76,
    exportable: true,
    raw: (r) => r.sa?.scorePercent,
  }),
  reportColumn<FilteredReportRow>({
    key: "certScore",
    label: "Certified score %",
    type: "score",
    align: "right",
    width: 92,
    exportable: true,
    raw: (r) => r.nqas?.scorePercent,
  }),
  reportColumn<FilteredReportRow>({
    key: "validityEnds",
    label: "Validity ends",
    type: "date",
    align: "center",
    width: 96,
    exportable: true,
    raw: (r) => r.nqas?.validityDate,
  }),
  reportColumn<FilteredReportRow>({
    key: "docStatus",
    label: "Documents status",
    type: "status",
    align: "center",
    width: 160,
    exportable: true,
    raw: (r) => r.view.docStage,
  }),
];

/* --------------------------------------------------------------------------- */
/* The other dashboard tables                                                   */
/* --------------------------------------------------------------------------- */

export type ProgressBlock = {
  name: string;
  total: number;
  certified?: number;
  conditional?: number;
  inProgress?: number;
  dueSoon?: number;
  deferred?: number;
  notStarted?: number;
};

/** Progress-by-block / PHC. `scopeLabel` is the group's own name, so the
 *  second column's header is the same word the page shows. */
export function buildProgressHeaders(scopeLabel: string): string[] {
  return [
    "S.No",
    scopeLabel,
    "Total facilities",
    "Certified",
    "Conditional",
    "Certified %",
    "In progress",
    "Recert due",
    "Deferred",
    "Not started",
  ];
}

export function buildProgressRows(blocks: readonly ProgressBlock[]) {
  return blocks.map((b, i) => {
    const done = (b.certified ?? 0) + (b.conditional ?? 0);
    return [
      i + 1,
      b.name,
      b.total,
      b.certified ?? 0,
      b.conditional ?? 0,
      b.total > 0 ? Math.round((done / b.total) * 100) : 0,
      b.inProgress ?? 0,
      b.dueSoon ?? 0,
      b.deferred ?? 0,
      b.notStarted ?? 0,
    ];
  });
}

export type EligiblePendingItem = {
  name: string;
  block: string;
  phc: string;
  facilityType?: string;
  status: string;
  docStatus: string | null;
};

export const ELIGIBLE_PENDING_HEADERS = [
  "S.No",
  "Facility",
  "Type",
  "Block",
  "PHC",
  "Current Status",
  "SaQsham Documents Status",
];

export function buildEligiblePendingRows(items: readonly EligiblePendingItem[]) {
  return items.map((e, i) => [
    i + 1,
    e.name,
    e.facilityType ?? "—",
    e.block,
    e.phc,
    e.status,
    e.docStatus ?? "—",
  ]);
}

export type ConditionalityItem = {
  name: string;
  block: string;
  phc: string;
  facilityType: string;
  certDate: string | null;
  validityDate: string | null;
  scorePercent: number | null;
};

export const CONDITIONALITY_HEADERS = [
  "S.No",
  "Facility",
  "Type",
  "Block",
  "PHC",
  "Certification date",
  "Certified Score %",
  "Validity ends",
];

export function buildConditionalityRows(items: readonly ConditionalityItem[]) {
  return items.map((e, i) => [
    i + 1,
    e.name,
    e.facilityType ?? "—",
    e.block,
    e.phc,
    e.certDate ? formatReportDate(e.certDate) : "—",
    e.scorePercent != null ? e.scorePercent : "—",
    e.validityDate ? formatReportDate(e.validityDate) : "—",
  ]);
}

export type ResultAwaitedItem = {
  name: string;
  block: string;
  phc: string;
  facilityType: string;
  assessmentDate: string | null;
  docStatus: string | null;
};

export const RESULT_AWAITED_HEADERS = [
  "S.No",
  "Facility",
  "Type",
  "Block",
  "PHC",
  "Assessment date",
  "SaQsham documents",
];

export function buildResultAwaitedRows(items: readonly ResultAwaitedItem[]) {
  return items.map((e, i) => [
    i + 1,
    e.name,
    e.facilityType ?? "—",
    e.block,
    e.phc,
    e.assessmentDate ? formatReportDate(e.assessmentDate) : "—",
    e.docStatus ?? "—",
  ]);
}

export type DocStatusItem = {
  name: string;
  block: string;
  phc: string;
  facilityType: string;
  docStatus: string;
};

export const DOC_STATUS_HEADERS = [
  "S.No",
  "Facility",
  "Type",
  "Block",
  "PHC",
  "Documents Status",
];

export function buildDocStatusRows(items: readonly DocStatusItem[]) {
  return items.map((e, i) => [
    i + 1,
    e.name,
    e.facilityType ?? "—",
    e.block,
    e.phc,
    e.docStatus,
  ]);
}

export type ScheduledListRow = {
  r: {
    facility: { name: string; block: string; facilityType: string };
    sa: { scorePercent: number | null } | null;
    nqas: { scorePercent: number | null } | null;
  };
  date: string | null;
  kind: string;
  days: number | null;
};

export const SCHEDULED_HEADERS = [
  "S.No",
  "Facility",
  "Type",
  "Block",
  "Assessment",
  "Scheduled date",
  "Due",
  "SA score",
  "NQAS recent score",
];

export const RECERT_HEADERS = [
  "S.No",
  "Facility",
  "Type",
  "Block",
  "Recertification Due date",
  "Due",
  "SA score",
  "NQAS recent score",
];

/** `includeKind` switches between the scheduled header (with the "Assessment"
 *  column) and the recertification header — the two go through the same
 *  builder, so the column count can never disagree with the header. */
export function buildScheduledRows(
  scheduled: readonly ScheduledListRow[],
  includeKind: boolean,
  humanOverdue: (days: number) => string,
) {
  return scheduled.map(({ r, date, kind, days }, i) => [
    i + 1,
    r.facility.name,
    r.facility.facilityType ?? "—",
    r.facility.block,
    ...(includeKind ? [kind] : []),
    date ? formatReportDate(date) : "Not set",
    days == null
      ? "Date not set"
      : days < 0
        ? `Overdue ${humanOverdue(Math.abs(days))}`
        : days === 0
          ? "Today"
          : `in ${days}d`,
    r.sa?.scorePercent != null ? `${r.sa.scorePercent}%` : "—",
    r.nqas?.scorePercent != null ? `${r.nqas.scorePercent}%` : "—",
  ]);
}

/* --------------------------------------------------------------------------- */
/* Registry — what the contract test walks                                      */
/* --------------------------------------------------------------------------- */

/** One entry per exported dashboard table. `headers`, `buildRows` and a
 *  `sample` factory are defined together, so the contract test can build rows
 *  for any table without knowing its item type. */
export type DashboardTable = {
  name: string;
  headers: string[];
  buildRows: (items: never[]) => (string | number | null)[][];
  /** A representative item for the crate's row builder. */
  sample: (index: number) => unknown;
};

const facilitySample = (i: number): FilteredReportRow => ({
  facility: {
    name: `Facility ${i + 1}`,
    facilityType: "HWC HSC",
    block: "Alangayam",
    phc: "Alangayam",
    eligibility: "Eligible",
  },
  sa: { scorePercent: 84 },
  nqas: { scorePercent: 84.67, validityDate: "2027-07-20" },
  view: { currentStatus: "Recertification Due", docStage: "Docx in SQAU login" },
});

export const DASHBOARD_TABLES: DashboardTable[] = [
  {
    name: "Filtered facility list (Dashboard summary — current filter)",
    // Generated from the ONE column model — header and rows both map over
    // DASHBOARD_FILTERED_COLUMNS, so they are the same length by construction.
    headers: reportHeaders(DASHBOARD_FILTERED_COLUMNS),
    buildRows: (items) =>
      reportRows(DASHBOARD_FILTERED_COLUMNS, items as unknown as FilteredReportRow[]),
    sample: facilitySample,
  },
  {
    name: "Progress by block / PHC",
    headers: buildProgressHeaders("Block"),
    buildRows: (items) => buildProgressRows(items as unknown as ProgressBlock[]),
    sample: (i) => ({
      name: `Block ${i + 1}`,
      total: 12,
      certified: 4,
      conditional: 1,
      inProgress: 3,
      dueSoon: 2,
      deferred: 1,
      notStarted: 1,
    }),
  },
  {
    name: "Eligible pending",
    headers: ELIGIBLE_PENDING_HEADERS,
    buildRows: (items) =>
      buildEligiblePendingRows(items as unknown as EligiblePendingItem[]),
    sample: (i) => ({
      name: `Facility ${i + 1}`,
      block: "Alangayam",
      phc: "Alangayam",
      facilityType: "HWC HSC",
      status: "Recertification Due",
      docStatus: null,
    }),
  },
  {
    name: "Quality certified with conditionality",
    headers: CONDITIONALITY_HEADERS,
    buildRows: (items) =>
      buildConditionalityRows(items as unknown as ConditionalityItem[]),
    sample: (i) => ({
      name: `Facility ${i + 1}`,
      block: "Alangayam",
      phc: "Alangayam",
      facilityType: "HWC HSC",
      certDate: "2026-10-16",
      validityDate: "2027-07-20",
      scorePercent: 84,
    }),
  },
  {
    name: "Result awaited",
    headers: RESULT_AWAITED_HEADERS,
    buildRows: (items) =>
      buildResultAwaitedRows(items as unknown as ResultAwaitedItem[]),
    sample: (i) => ({
      name: `Facility ${i + 1}`,
      block: "Alangayam",
      phc: "Alangayam",
      facilityType: "HWC HSC",
      assessmentDate: "2026-09-01",
      docStatus: "Docx forwarded to NHSRC",
    }),
  },
  {
    name: "Documents status",
    headers: DOC_STATUS_HEADERS,
    buildRows: (items) => buildDocStatusRows(items as unknown as DocStatusItem[]),
    sample: (i) => ({
      name: `Facility ${i + 1}`,
      block: "Alangayam",
      phc: "Alangayam",
      facilityType: "HWC HSC",
      docStatus: "Docx in SQAU login",
    }),
  },
  {
    name: "Scheduled assessments",
    headers: SCHEDULED_HEADERS,
    buildRows: (items) =>
      buildScheduledRows(items as unknown as ScheduledListRow[], true, (d) => `${d}d`),
    sample: (i) => ({
      r: {
        facility: { name: `Facility ${i + 1}`, block: "Alangayam", facilityType: "HWC HSC" },
        sa: { scorePercent: 84 },
        nqas: { scorePercent: 84.67 },
      },
      date: "2026-11-01",
      kind: "NQAS Assessment",
      days: 4,
    }),
  },
  {
    name: "Recertification due",
    headers: RECERT_HEADERS,
    buildRows: (items) =>
      buildScheduledRows(items as unknown as ScheduledListRow[], false, (d) => `${d}d`),
    sample: (i) => ({
      r: {
        facility: { name: `Facility ${i + 1}`, block: "Alangayam", facilityType: "HWC HSC" },
        sa: { scorePercent: 84 },
        nqas: { scorePercent: 84.67 },
      },
      date: null,
      kind: "Recertification",
      days: null,
    }),
  },
];
