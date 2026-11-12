/** Custom Report Builder engine — an Excel-style pivot table over the live
 *  facility tracker data.
 *
 *  The builder lets a user drag any *field* (a real column of
 *  `ops.listFacilityRowsFast`, or one derived from it) into Rows, Columns,
 *  Values or Filters; this module turns that configuration into a grouped
 *  result with subtotals, grand totals and expandable groups. It is kept
 *  independent of React so the page stays a thin view layer and the maths is
 *  testable/readable on its own.
 *
 *  Design notes:
 *  - Fields carry their own accessor (`value`), so a field can come from any
 *    part of the tracker row (facility / sa / nqas / fund / noc / building)
 *    or be computed (days since certification, IA change, …).
 *  - Group keys normalise null AND "" to "(blank)" — the same convention
 *    Excel uses — so missing data is grouped instead of silently dropped.
 *  - Sorting mirrors Excel: label A→Z/Z→A on a row field, or by a measure
 *    cell clicked in the header. Sorting is applied per group level.
 *  - Subtotals are emitted as real output rows (kind "subtotal"), so what is
 *    exported is exactly what is on screen. */

import {
  DEFAULT_SETTINGS,
  mergedPipelineStatus,
  type LifecycleSettings,
} from "@/convex/lifecycle";
import { monthName, toDisplayDate } from "@/lib/format";
import { deriveFireNocStatus } from "@/lib/today";
import { TRACKER_COLUMN_LABELS } from "@/lib/trackerColumns";
import { saqshamDocumentsStatusOf } from "@/lib/resultDeclared";

/* ------------------------------------------------------------------ */
/* row shape                                                           */
/* ------------------------------------------------------------------ */

/** Minimal structural shape needed to read every field — satisfied by
 *  `ops.listFacilityRowsFast` rows (same approach as lib/facilityExport). */
export interface PivotRow {
  facility: {
    name: string;
    block: string;
    phc: string;
    ninNumber?: string | null;
    facilityType: string;
    currentStatus: string;
    statusOverride?: string | null;
    eligibility?: string | null;
    remarks?: string | null;
    nqasIaQ1?: number | null;
    nqasIaQ2?: number | null;
    kayakalpIaQ1?: number | null;
    kayakalpIaQ2?: number | null;
    /** Convex doc id of the facility — used by drill-down links. */
    _id?: string;
  };
  cycleNumber: number | null;
  cycleType?: string | null;
  resultDocumentName?: string | null;
  sa?: {
    status?: string | null;
    scheduledDate?: string | null;
    actualStartDate?: string | null;
    actualEndDate?: string | null;
    scorePercent?: number | null;
    generalDocStatus?: string | null;
    assessor1Name?: string | null;
    assessor1Hud?: string | null;
    assessor2Name?: string | null;
    assessor2Hud?: string | null;
    reportAttachmentName?: string | null;
    checklistAttachmentName?: string | null;
  } | null;
  nqas?: {
    status?: string | null;
    goiLetterDate?: string | null;
    certificationStatus?: string | null;
    certificationDate?: string | null;
    scorePercent?: number | null;
    scheduledStartDate?: string | null;
    scheduledEndDate?: string | null;
    actualEndDate?: string | null;
    mode?: string | null;
    departments?: string[] | null;
    surveillanceDue1?: string | null;
    surveillanceDone1?: string | null;
    surveillanceDue2?: string | null;
    surveillanceDone2?: string | null;
    manualScore?: number | null;
    validityDate?: string | null;
    recertStatus?: string | null;
    recertYear?: string | number | null;
  } | null;
  fund?: {
    amountSanctioned?: number | null;
    financialYear?: string | null;
    procLink?: string | null;
    fundAttachmentName?: string | null;
  } | null;
  noc?: {
    nocAvailable?: string | null;
    status?: string | null;
    issuedDate?: string | null;
    expiryDate?: string | null;
    nocLink?: string | null;
    nocAttachmentName?: string | null;
  } | null;
  building?: {
    buildingType?: string | null;
    buildingStatus?: string | null;
    condemnedLink?: string | null;
    condemnedAttachmentName?: string | null;
  } | null;
}

/* ------------------------------------------------------------------ */
/* fields                                                             */
/* ------------------------------------------------------------------ */

export type PivotFieldType = "text" | "number" | "date";
export type AggregateKind =
  | "sum" | "count" | "avg" | "min" | "max" | "distinct" | "pctTotal";

export const AGG_LABELS: Record<AggregateKind, string> = {
  sum: "Sum",
  avg: "Average",
  count: "Count",
  min: "Minimum",
  max: "Maximum",
  distinct: "Distinct count",
  pctTotal: "% of Total",
};

/** Short form used in measure headers, e.g. "Sum of Gap Closure Amount". */
export function measureLabel(
  spec: PivotValueSpec,
  field: PivotFieldDef | undefined,
): string {
  if (!field) return AGG_LABELS[spec.agg];
  return `${AGG_LABELS[spec.agg]} of ${field.label}`;
}

export interface PivotFieldDef {
  id: string;
  label: string;
  /** Sidebar section, e.g. "Certification". */
  group: string;
  type: PivotFieldType;
  /** Tooltip text in the field sidebar. */
  hint?: string;
  value: (row: PivotRow) => string | number | null;
  /** Optional display transform for GROUP labels (e.g. "2022-10" →
   *  "Oct 2022"). Sorting ALWAYS uses the raw value, so the transformed
   *  label never disturbs chronological ordering. */
  display?: (v: string) => string;
  /** Label for the blank group (rows with no value). Date fields use
   *  "(No date)" so facilities without the value still group as ONE row. */
  blankLabel?: string;
  /** Legacy names that still search-match this field (e.g. "Cert_Cycle"). */
  aliases?: string[];
}

/** Friendly month label for an ISO "YYYY-MM" key: "2022-10" → "Oct 2022".
 *  Sorting stays on the ISO key (see compareLabels). */
export function friendlyMonthLabel(iso: string): string {
  const m = monthName(iso.length === 7 ? iso : iso.slice(0, 7));
  return m ? `${m} ${iso.slice(0, 4)}` : iso;
}

/** Aggregations that make sense for a field type.
 *  Sum/Average need numbers; Minimum/Maximum are meaningful for numbers and
 *  dates; Count and Distinct count work on anything. */
export function allowedAggs(type: PivotFieldType): AggregateKind[] {
  if (type === "number") return ["sum", "avg", "count", "min", "max", "distinct", "pctTotal"];
  if (type === "date") return ["count", "min", "max", "distinct", "pctTotal"];
  return ["count", "distinct", "pctTotal"];
}

export function defaultAggFor(type: PivotFieldType): AggregateKind {
  return type === "number" ? "sum" : "count";
}

const s = (v: unknown): string | null =>
  v == null || v === "" ? null : String(v);
const n = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const num = Number(v);
  return Number.isFinite(num) ? num : null;
};

/** Whole days between an ISO date and today (null when there is no date). */
function daysFromToday(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const today = new Date();
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((start - t) / 86_400_000);
}

/** Build the field registry for the builder.
 *
 *  `appSettings` is the raw `getAppSettings().settings` object: it feeds the
 *  merged Facility Current Status derivation and the admin header renames
 *  (Admin → Table headers), so the builder shows the same labels and the
 *  same derived values as the rest of the app. */
export function createPivotFields(
  appSettings?: Record<string, unknown>,
  opts?: {
    /** Month-group label style: "Oct 2022" (default) or the ISO form. */
    monthDisplay?: "friendly" | "iso";
  },
): PivotFieldDef[] {
  const settings = {
    ...DEFAULT_SETTINGS,
    ...(appSettings ?? {}),
  } as LifecycleSettings;
  const overrides = (appSettings?.tableHeaderOverrides ?? {}) as Record<
    string,
    string
  >;

  /** Tracker columns keep their canonical label (renamable in Admin). */
  const label = (id: string, fallback: string) => {
    const canonical = (TRACKER_COLUMN_LABELS as Record<string, string>)[id];
    if (!canonical) return fallback;
    const renamed = overrides[canonical];
    return typeof renamed === "string" && renamed.trim() ? renamed : canonical;
  };

  const pipe = (row: PivotRow) =>
    mergedPipelineStatus(
      {
        eligibility: row.facility.eligibility ?? "",
        currentStatus: row.facility.currentStatus,
      },
      row.sa
        ? {
            status: row.sa.status ?? "Not Yet Initiated",
            generalDocStatus: row.sa.generalDocStatus ?? null,
          }
        : null,
      row.nqas
        ? {
            status: row.nqas.status ?? "Pending",
            scheduledStartDate: row.nqas.scheduledStartDate ?? null,
            certificationStatus: row.nqas.certificationStatus ?? null,
            validityDate: row.nqas.validityDate ?? null,
          }
        : null,
      settings,
    );

  const f = (
    id: string,
    fallback: string,
    group: string,
    type: PivotFieldType,
    value: (row: PivotRow) => string | number | null,
    hint?: string,
    aliases?: string[],
  ): PivotFieldDef => ({ id, label: label(id, fallback), group, type, value, hint, aliases });

  return [
    /* ---- Facility ---- */
    f("facilityName", "Facility", "Facility", "text", (r) => s(r.facility.name)),
    f("block", "Block", "Facility", "text", (r) => s(r.facility.block)),
    f("phc", "PHC", "Facility", "text", (r) => s(r.facility.phc)),
    f("nin", "NIN", "Facility", "text", (r) => s(r.facility.ninNumber), "National (health) facility id"),
    f("facilityType", "Facility Type", "Facility", "text", (r) => s(r.facility.facilityType)),
    f("eligibility", "NQAS Eligibility", "Facility", "text", (r) => s(r.facility.eligibility)),
    f(
      "cycleNumber",
      "Certification Cycle",
      "Facility",
      "text",
      (r) => (r.cycleNumber == null ? null : `#${r.cycleNumber}`),
      undefined,
      ["Cert_Cycle", "cycle"],
    ),
    f("cycleType", "Cycle Type", "Facility", "text", (r) => s(r.cycleType), undefined, [
      "cycle-type",
      "Cycle-type",
    ]),
    f("remarks", "Remarks", "Facility", "text", (r) => s(r.facility.remarks)),

    /* ---- Certification ---- */
    // Label comes from the config (lib/trackerColumns ← lib/masterColumns):
    // this field was renamed "Pipeline Status" → "Facility Current Status".
    f("pipelineStatus", TRACKER_COLUMN_LABELS.pipelineStatus, "Certification", "text", pipe, "Merged status derived from SA, documents and NQAS"),
    f("certStatus", "NQAS Certification Status", "Certification", "text", (r) =>
      s(r.nqas?.certificationStatus),
    ),
    f("certDate", "GoI Letter Date / Certification date", "Certification", "date", (r) =>
      s(r.nqas?.goiLetterDate ?? r.nqas?.certificationDate),
    ),
    f("certYear", "Certification year", "Certification", "text", (r) =>
      s((r.nqas?.goiLetterDate ?? r.nqas?.certificationDate)?.slice(0, 4)),
      "Sorts chronologically; facilities without a date sit in ONE \"(No date)\" row",
    ),
    f("certMonth", "Certification month", "Certification", "text", (r) =>
      s((r.nqas?.goiLetterDate ?? r.nqas?.certificationDate)?.slice(0, 7)),
      "Sorts by the ISO key; shown as \"Oct 2022\" (or the ISO form)",
    ),

    /* ---- Certification month/year label options are applied by
            applyDateLabelOptions() after the array is built (see below). ---- */
    f("certScore", "Certified Score %", "Certification", "number", (r) =>
      r.nqas?.scorePercent ?? null,
    ),
    f("resultDoc", "NQAS Result document", "Certification", "text", (r) =>
      s(r.resultDocumentName),
    ),
    f("naScheduled", "NQAS Assessment Start date", "Certification", "date", (r) =>
      s(r.nqas?.scheduledStartDate),
    ),
    f("naEnd", "NQAS Assessment End date", "Certification", "date", (r) =>
      s(r.nqas?.actualEndDate ?? r.nqas?.scheduledEndDate),
    ),
    f("naMode", "Mode of Assessment", "Certification", "text", (r) => s(r.nqas?.mode)),
    f("departments", "Departments / Packages", "Certification", "text", (r) =>
      s((r.nqas?.departments ?? []).join(", ")),
    ),

    /* ---- Gap closure fund ---- */
    f("gapAmount", "Gap Closure Amount", "Gap Closure Fund", "number", (r) =>
      r.fund?.amountSanctioned ?? null,
    ),
    f("gcYear", "GC Fund received Year", "Gap Closure Fund", "text", (r) =>
      s(r.fund?.financialYear),
    ),
    f("procLink", "Gap Closure Proc. / Fund document", "Gap Closure Fund", "text", (r) =>
      s(r.fund?.procLink ?? r.fund?.fundAttachmentName),
    ),

    /* ---- Internal assessment ---- */
    f("nqasIaQ1", "NQAS IA % (Q1)", "Internal Assessment", "number", (r) =>
      r.facility.nqasIaQ1 ?? null,
    ),
    f("nqasIaQ2", "NQAS IA % (Q2)", "Internal Assessment", "number", (r) =>
      r.facility.nqasIaQ2 ?? null,
    ),
    f("nqasIaDelta", "NQAS IA change (Q2 − Q1)", "Internal Assessment", "number", (r) => {
      const a = r.facility.nqasIaQ1;
      const b = r.facility.nqasIaQ2;
      return a == null || b == null ? null : Math.round((b - a) * 100) / 100;
    }),
    f("kayakalpIaQ1", "Kayakalp IA % (Q1)", "Internal Assessment", "number", (r) =>
      r.facility.kayakalpIaQ1 ?? null,
    ),
    f("kayakalpIaQ2", "Kayakalp IA % (Q2)", "Internal Assessment", "number", (r) =>
      r.facility.kayakalpIaQ2 ?? null,
    ),
    f("kayakalpIaDelta", "Kayakalp IA change (Q2 − Q1)", "Internal Assessment", "number", (r) => {
      const a = r.facility.kayakalpIaQ1;
      const b = r.facility.kayakalpIaQ2;
      return a == null || b == null ? null : Math.round((b - a) * 100) / 100;
    }),

    /* ---- State assessment ---- */
    f("saStatus", "State Assessment Status", "State Assessment", "text", (r) =>
      s(r.sa?.status),
    ),
    f("saScore", "SA Score", "State Assessment", "number", (r) => r.sa?.scorePercent ?? null),
    f("genDoc", "SaQsham Documents Status", "State Assessment", "text", (r) =>
      s(saqshamDocumentsStatusOf(r.sa?.generalDocStatus, r.nqas?.certificationStatus)),
    ),
    f("saStart", "State Assessment Start date", "State Assessment", "date", (r) =>
      s(r.sa?.actualStartDate ?? r.sa?.scheduledDate),
    ),
    f("saEnd", "State Assessment End date", "State Assessment", "date", (r) =>
      s(r.sa?.actualEndDate),
    ),
    f("saAssessor1", "Name of Assessor 1", "State Assessment", "text", (r) =>
      s(r.sa?.assessor1Name),
    ),
    f("saAssessor1Hud", "Assessor 1 HUD", "State Assessment", "text", (r) =>
      s(r.sa?.assessor1Hud),
    ),
    f("saAssessor2", "Name of Assessor 2", "State Assessment", "text", (r) =>
      s(r.sa?.assessor2Name),
    ),
    f("saAssessor2Hud", "Assessor 2 HUD", "State Assessment", "text", (r) =>
      s(r.sa?.assessor2Hud),
    ),
    f("saReport", "SA Report", "State Assessment", "text", (r) =>
      s(r.sa?.reportAttachmentName),
    ),
    f("saChecklist", "SA Checklist", "State Assessment", "text", (r) =>
      s(r.sa?.checklistAttachmentName),
    ),

    /* ---- Surveillance & recertification ---- */
    f("survDue1", "Surveillance 1 due date", "Surveillance & Recert", "date", (r) =>
      s(r.nqas?.surveillanceDue1),
    ),
    f("surv1", "1st Surveillance done date", "Surveillance & Recert", "date", (r) =>
      s(r.nqas?.surveillanceDone1),
    ),
    f("survDue2", "Surveillance 2 due date", "Surveillance & Recert", "date", (r) =>
      s(r.nqas?.surveillanceDue2),
    ),
    f("surv2", "2nd Surveillance done date", "Surveillance & Recert", "date", (r) =>
      s(r.nqas?.surveillanceDone2),
    ),
    f("survScore", "2nd Surveillance Score %", "Surveillance & Recert", "number", (r) =>
      r.nqas?.manualScore ?? null,
    ),
    f("validityDate", "NQAS Certificate Validity date", "Surveillance & Recert", "date", (r) =>
      s(r.nqas?.validityDate),
    ),
    f("recertStatus", "Recertification Status", "Surveillance & Recert", "text", (r) =>
      s(r.nqas?.recertStatus),
    ),
    f("recertYear", "Re-Certification Year", "Surveillance & Recert", "text", (r) =>
      s(r.nqas?.recertYear),
    ),

    /* ---- Building & Fire NOC ---- */
    f("buildingType", "Building Type", "Building & Fire NOC", "text", (r) =>
      s(r.building?.buildingType),
    ),
    f("buildingStatus", "Facility Building Status", "Building & Fire NOC", "text", (r) =>
      s(r.building?.buildingStatus),
    ),
    f("condemned", "Condemned document", "Building & Fire NOC", "text", (r) =>
      s(r.building?.condemnedLink ?? r.building?.condemnedAttachmentName),
    ),
    f("nocAvailable", "NOC Available", "Building & Fire NOC", "text", (r) =>
      s(r.noc?.nocAvailable),
    ),
    f("nocStatus", "Fire NOC Validity Status", "Building & Fire NOC", "text", (r) =>
      deriveFireNocStatus(
        r.noc?.nocAvailable ?? null,
        r.noc?.expiryDate ?? null,
        r.noc?.status ?? null,
      ),
      "Derived from the Fire NOC validity date",
    ),
    f("nocCertified", "NOC Issue Date", "Building & Fire NOC", "date", (r) =>
      s(r.noc?.issuedDate),
    ),
    f("nocValidity", "Fire NOC Validity", "Building & Fire NOC", "date", (r) =>
      s(r.noc?.expiryDate),
    ),
    f("nocDoc", "NOC document", "Building & Fire NOC", "text", (r) =>
      s(r.noc?.nocLink ?? r.noc?.nocAttachmentName),
    ),

    /* ---- Calculated ---- */
    f("daysSinceCert", "Days since certification", "Calculated", "number", (r) =>
      daysFromToday(r.nqas?.goiLetterDate ?? r.nqas?.certificationDate),
    ),
    f("daysToValidity", "Days until certificate expiry", "Calculated", "number", (r) =>
      daysFromToday(r.nqas?.validityDate),
      "Negative when the certificate has already expired",
    ),
    f("daysToSurv1", "Days until 1st surveillance due", "Calculated", "number", (r) =>
      daysFromToday(r.nqas?.surveillanceDue1),
    ),
  ];
}

/** CertYear/certMonth blank groups read "(No date)" and the month group
 *  shows "Oct 2022" (or the ISO form when selected). Blank date rows
 *  always group as ONE row, so totals reconcile. Sorting stays on the ISO
 *  raw value regardless of display. */
export function applyDateLabelOptions(
  fields: PivotFieldDef[],
  monthDisplay: "friendly" | "iso" = "friendly",
): PivotFieldDef[] {
  for (const field of fields) {
    if (field.id === "certMonth") {
      field.display = monthDisplay === "friendly" ? friendlyMonthLabel : undefined;
      field.blankLabel = "(No date)";
    } else if (field.id === "certYear") {
      field.blankLabel = "(No date)";
    }
  }
  return fields;
}

/* ------------------------------------------------------------------ */
/* configuration                                                       */
/* ------------------------------------------------------------------ */

export interface PivotValueSpec {
  fieldId: string;
  agg: AggregateKind;
}

export type PivotSort =
  | { kind: "label"; dir: "asc" | "desc" }
  | { kind: "measure"; colIndex: number; vIndex: number; dir: "asc" | "desc" }
  | { kind: "total"; vIndex: number; dir: "asc" | "desc" };

export interface PivotConfig {
  rows: string[];
  columns: string[];
  values: PivotValueSpec[];
  /** fieldId → allowed group labels. Empty list = no filter. */
  filters: Record<string, string[]>;
  sort: PivotSort;
}

/**
 * Silently drop config entries that reference a column which no longer exists
 * (the retired IA tracker). A saved report or template therefore opens without
 * the field instead of rendering a phantom column — nothing else changes.
 */
export function prunePivotConfig(
  config: PivotConfig,
  retired: ReadonlySet<string>,
): PivotConfig {
  if (retired.size === 0) return config;
  const keep = (id: string) => !retired.has(id);
  const filters: Record<string, string[]> = {};
  for (const [id, values] of Object.entries(config.filters)) {
    if (keep(id)) filters[id] = values;
  }
  return {
    ...config,
    rows: config.rows.filter(keep),
    columns: config.columns.filter(keep),
    values: config.values.filter((v) => keep(v.fieldId)),
    filters,
  };
}

/** Default report: how many facilities sit in each block. */
export function defaultPivotConfig(): PivotConfig {
  return {
    rows: ["block"],
    columns: [],
    values: [{ fieldId: "facilityName", agg: "count" }],
    filters: {},
    sort: { kind: "label", dir: "asc" },
  };
}

/* ------------------------------------------------------------------ */
/* engine                                                             */
/* ------------------------------------------------------------------ */

export type CellValue = number | string | null;

export interface PivotOutRow {
  kind: "leaf" | "subtotal" | "grand";
  /** Stable key — also the collapse key for group rows. */
  key: string;
  /** 0-based row-field level this row belongs to. */
  depth: number;
  /** Full path labels (length = row field count, null when missing).
   *  RAW group labels — drill-down filters are built from these, so they
   *  must never pass through the field's display transform. */
  labels: (string | null)[];
  /** Same path with each field's display transform applied ("Oct 2022",
   *  "(No date)") — what the screen and the exports print. */
  displayLabels?: (string | null)[];
  hasChildren: boolean;
  collapsed: boolean;
  /** Facilities aggregated into this row. */
  count: number;
  /** Column-combo × value cells, flattened. */
  measures: CellValue[];
  /** Per-value figure across every column combo (the Grand Total column). */
  totals: CellValue[];
}

export interface PivotColumnCombo {
  key: string;
  /** Raw (sortable) labels — pivotDrilldown filters on these. */
  labels: (string | null)[];
  /** Display labels for headers ("Oct 2022", "(No date)"). */
  displayLabels?: (string | null)[];
}

export interface PivotResult {
  rowFields: PivotFieldDef[];
  colFields: PivotFieldDef[];
  valueSpecs: PivotValueSpec[];
  valueFields: (PivotFieldDef | undefined)[];
  colCombos: PivotColumnCombo[];
  outRows: PivotOutRow[];
  /** Cell values for the bottom Grand Total row (combos × values). */
  grandMeasures: CellValue[];
  /** Per-value figure across everything (Grand Total column, bottom row). */
  grandTotals: CellValue[];
  /** Facilities included after filters. */
  filteredCount: number;
  /** Facilities in the data source. */
  totalCount: number;
  truncated: boolean;
  maxRows: number;
}

export interface PivotBuildOptions {
  showSubtotals?: boolean;
  showGrandTotals?: boolean;
  /** Safety cap on emitted rows (perf guard for huge expansions). */
  maxRows?: number;
}

const SEP = "\u0001";
const BLANK = "(blank)";

/** Compare two measure cells: numbers numerically, everything else as text,
 *  with blanks last in either direction. */
function compareCells(a: CellValue, b: CellValue): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "number") return -1;
  if (typeof b === "number") return 1;
  return compareStrings(a, b);
}

export function groupKey(v: string | number | null | undefined): string {
  return v == null || v === "" ? BLANK : String(v);
}

function compareStrings(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

/** Label ordering used by every sort: alphabetical (numbers aware) with
 *  blank groups last, the same place Excel puts them. */
function compareLabels(a: string | null | undefined, b: string | null | undefined) {
  const ka = a == null || a === "" ? null : a;
  const kb = b == null || b === "" ? null : b;
  if (ka === null && kb === null) return 0;
  if (ka === null) return 1;
  if (kb === null) return -1;
  return compareStrings(ka, kb);
}

/** Aggregate a bucket of rows for one value spec.
 *
 *  `denom` is only used by the "% of Total" aggregation: the share the
 *  bucket holds of the whole (filtered) report — bucket sum of a number
 *  field over the grand sum, or bucket facility count over the total. */
function aggregate(
  rows: PivotRow[],
  spec: PivotValueSpec,
  field: PivotFieldDef | undefined,
  denom?: PivotRow[],
): CellValue {
  if (!field) return null;

  if (spec.agg === "pctTotal") {
    const base = denom ?? rows;
    if (base.length === 0) return null;
    if (field.type === "number") {
      let bucketSum = 0;
      let totalSum = 0;
      for (const r of rows) {
        const v = n(field.value(r));
        if (v != null) bucketSum += v;
      }
      for (const r of base) {
        const v = n(field.value(r));
        if (v != null) totalSum += v;
      }
      if (totalSum === 0) return null;
      return (bucketSum / totalSum) * 100;
    }
    // Counting share — facilities in the bucket over everyone in scope.
    return (rows.length / base.length) * 100;
  }

  // No underlying facilities ⇒ blank cell (Excel behaviour). A "0" here
  // would read as a measured zero instead of "no data in this bucket".
  if (rows.length === 0) return null;

  if (spec.agg === "count") {
    let count = 0;
    for (const r of rows) {
      const v = field.value(r);
      if (v != null && v !== "") count += 1;
    }
    return count;
  }

  if (spec.agg === "distinct") {
    const seen = new Set<string>();
    for (const r of rows) {
      const v = field.value(r);
      if (v != null && v !== "") seen.add(String(v));
    }
    return seen.size;
  }

  if (spec.agg === "sum" || spec.agg === "avg") {
    let sum = 0;
    let count = 0;
    for (const r of rows) {
      const v = n(field.value(r));
      if (v != null) {
        sum += v;
        count += 1;
      }
    }
    if (count === 0) return null;
    return spec.agg === "sum" ? sum : sum / count;
  }

  // Minimum / Maximum — dates compare as ISO strings, numbers numerically.
  let bestNum: number | null = null;
  let bestStr: string | null = null;
  const date = field.type === "date";
  for (const r of rows) {
    const raw = field.value(r);
    if (raw == null || raw === "") continue;
    if (date) {
      const v = String(raw);
      if (
        bestStr === null ||
        (spec.agg === "min" ? compareStrings(v, bestStr) < 0 : compareStrings(v, bestStr) > 0)
      ) {
        bestStr = v;
      }
    } else {
      const v = n(raw);
      if (
        v !== null &&
        (bestNum === null || (spec.agg === "min" ? v < bestNum : v > bestNum))
      ) {
        bestNum = v;
      }
    }
  }
  return date ? bestStr : bestNum;
}

interface TreeNode {
  key: string;
  depth: number;
  /** RAW label — always the sort key (ISO for months). */
  label: string | null;
  /** Print label — the field's display transform may differ. */
  displayLabel: string | null;
  /** RAW path labels + display path labels (same length). */
  labels: (string | null)[];
  displayLabels: (string | null)[];
  rows: PivotRow[];
  perCol: Map<string, PivotRow[]>;
  children: TreeNode[];
}

/** Build the pivot result for one configuration. Pure function: same input
 *  (data, fields, config, options) always produces the same table. */
export function buildPivot({
  rows,
  fields,
  config,
  options,
  collapsed = new Set<string>(),
}: {
  rows: PivotRow[];
  fields: PivotFieldDef[];
  config: PivotConfig;
  options?: PivotBuildOptions;
  /** Group keys currently collapsed (from the page's view state). */
  collapsed?: Set<string>;
}): PivotResult {
  const byId = new Map(fields.map((f) => [f.id, f]));
  const rowFields = config.rows
    .map((id) => byId.get(id))
    .filter((f): f is PivotFieldDef => !!f);
  const colFields = config.columns
    .map((id) => byId.get(id))
    .filter((f): f is PivotFieldDef => !!f);
  const valueSpecs = config.values.filter((v) => byId.has(v.fieldId));
  const valueFields = valueSpecs.map((v) => byId.get(v.fieldId));
  const showSubtotals = options?.showSubtotals ?? true;
  const showGrandTotals = options?.showGrandTotals ?? true;
  const maxRows = options?.maxRows ?? 2000;

  const empty: PivotResult = {
    rowFields,
    colFields,
    valueSpecs,
    valueFields,
    colCombos: [],
    outRows: [],
    grandMeasures: [],
    grandTotals: [],
    filteredCount: 0,
    totalCount: rows.length,
    truncated: false,
    maxRows,
  };
  if (valueSpecs.length === 0) return empty;

  /* ---- filters ---- */
  const filtered = rows.filter((row) => {
    for (const [fieldId, allowed] of Object.entries(config.filters)) {
      if (!allowed || allowed.length === 0) continue;
      const field = byId.get(fieldId);
      if (!field) continue;
      if (!allowed.includes(groupKey(field.value(row)))) return false;
    }
    return true;
  });

  /* ---- row/column keys per record ---- */
  const prepared = filtered.map((row) => ({
    row,
    rowLabels: rowFields.map((f) => {
      const v = f.value(row);
      return v == null || v === "" ? null : String(v);
    }),
    colKey: colFields.map((f) => groupKey(f.value(row))).join(SEP),
    colLabels: colFields.map((f) => {
      const v = f.value(row);
      return v == null || v === "" ? null : String(v);
    }),
  }));

  const comboMap = new Map<string, (string | null)[]>();
  const comboRows = new Map<string, PivotRow[]>();
  for (const p of prepared) {
    if (!comboMap.has(p.colKey)) {
      comboMap.set(p.colKey, p.colLabels);
      comboRows.set(p.colKey, []);
    }
    comboRows.get(p.colKey)?.push(p.row);
  }
  const printColLabel = (v: string | null, j: number) => {
    const field = colFields[j];
    if (v == null) return field?.blankLabel ?? null;
    return field?.display ? field.display(v) : v;
  };
  const colCombos: PivotColumnCombo[] = [...comboMap.entries()].map(
    ([key, labels]) => ({
      key,
      labels,
      displayLabels: labels.map((l, j) => printColLabel(l, j)),
    }),
  );
  /* Column headers read left-to-right, so combos are ordered by their labels
     — or by the figure in the clicked header when the report is sorted by a
     measure column. */
  const config0 = config.sort ?? { kind: "label" as const, dir: "asc" as const };
  colCombos.sort((a, b) => {
    if (config0.kind === "measure") {
      const av = aggregate(
        comboRows.get(a.key) ?? [],
        valueSpecs[config0.vIndex],
        valueFields[config0.vIndex],
        filtered,
      );
      const bv = aggregate(
        comboRows.get(b.key) ?? [],
        valueSpecs[config0.vIndex],
        valueFields[config0.vIndex],
        filtered,
      );
      const base = compareCells(av, bv);
      if (base !== 0) return config0.dir === "desc" ? -base : base;
    }
    return compareLabels(a.labels[0], b.labels[0]) ||
      compareStrings(
        a.labels.map((l) => l ?? "").join(SEP),
        b.labels.map((l) => l ?? "").join(SEP),
      );
  });

  /* ---- tree ---- */
  const buildLevel = (
    list: typeof prepared,
    depth: number,
    parentLabels: (string | null)[],
  ): TreeNode[] => {
    if (depth >= rowFields.length) return [];
    const buckets = new Map<
      string,
      { label: string | null; labels: (string | null)[]; items: typeof prepared }
    >();
    for (const p of list) {
      const label = p.rowLabels[depth];
      const key = groupKey(label);
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { label, labels: [...parentLabels, label], items: [] };
        buckets.set(key, bucket);
      }
      bucket.items.push(p);
    }
    const field = rowFields[depth];
    const print = (v: string | null) => {
      if (v == null) return field?.blankLabel ?? null;
      return field?.display ? field.display(v) : v;
    };
    return [...buckets.entries()].map(([key, bucket]) => {
      const perCol = new Map<string, PivotRow[]>();
      for (const p of bucket.items) {
        const arr = perCol.get(p.colKey);
        if (arr) arr.push(p.row);
        else perCol.set(p.colKey, [p.row]);
      }
      const displayLabels = bucket.labels.map((l, i) => print(l));
      return {
        key: [...parentLabels.map(groupKey), key].join(SEP),
        depth,
        label: bucket.label,
        displayLabel: print(bucket.label),
        labels: bucket.labels,
        displayLabels,
        rows: bucket.items.map((p) => p.row),
        perCol,
        children: buildLevel(bucket.items, depth + 1, bucket.labels),
      };
    });
  };
  const roots = buildLevel(prepared, 0, []);

  /* ---- node aggregates (cached; also used for sorting) ---- */
  const flatCache = new Map<string, CellValue[]>();
  const totalCache = new Map<string, CellValue[]>();
  const flatOf = (node: TreeNode): CellValue[] => {
    const hit = flatCache.get(node.key);
    if (hit) return hit;
    const out: CellValue[] = [];
    for (const combo of colCombos) {
      const bucket = node.perCol.get(combo.key) ?? [];
      for (let i = 0; i < valueSpecs.length; i += 1) {
        out.push(aggregate(bucket, valueSpecs[i], valueFields[i], filtered));
      }
    }
    flatCache.set(node.key, out);
    return out;
  };
  const totalsOf = (node: TreeNode): CellValue[] => {
    const hit = totalCache.get(node.key);
    if (hit) return hit;
    const out = valueSpecs.map((spec, i) =>
      aggregate(node.rows, spec, valueFields[i], filtered),
    );
    totalCache.set(node.key, out);
    return out;
  };

  /* ---- sorting ---- */
  const sort = config.sort ?? { kind: "label", dir: "asc" };
  const cmpCell = compareCells;
  const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
    if (nodes.length < 2) return nodes;
    const dir = sort.dir === "desc" ? -1 : 1;
    const copy = [...nodes];
    if (sort.kind === "label") {
      copy.sort((a, b) => dir * compareLabels(a.label, b.label));
      return copy;
    }
    const keyOf = (node: TreeNode): CellValue => {
      if (sort.kind === "total") return totalsOf(node)[sort.vIndex] ?? null;
      return (
        flatOf(node)[sort.colIndex * Math.max(valueSpecs.length, 1) + sort.vIndex] ?? null
      );
    };
    copy.sort((a, b) => {
      const base = cmpCell(keyOf(a), keyOf(b));
      if (base !== 0) return dir * base;
      return compareLabels(a.label, b.label);
    });
    return copy;
  };

  /* ---- emission (leaves, subtotals, grand total) ---- */
  const outRows: PivotOutRow[] = [];
  let truncated = false;
  const push = (row: PivotOutRow) => {
    if (outRows.length < maxRows) outRows.push(row);
    else truncated = true;
  };

  const emit = (nodes: TreeNode[]) => {
    for (const node of sortNodes(nodes)) {
      const hasChildren = node.children.length > 0;
      const collapsedHere = collapsed.has(node.key);
      if (!hasChildren) {
        push({
          kind: "leaf",
          key: node.key,
          depth: node.depth,
          labels: node.labels,
          displayLabels: node.displayLabels,
          hasChildren: false,
          collapsed: false,
          count: node.rows.length,
          measures: flatOf(node),
          totals: totalsOf(node),
        });
        continue;
      }
      if (!collapsedHere) emit(node.children);
      if (showSubtotals) {
        push({
          kind: "subtotal",
          key: node.key,
          depth: node.depth,
          labels: node.labels,
          displayLabels: node.displayLabels,
          hasChildren: true,
          collapsed: collapsedHere,
          count: node.rows.length,
          measures: flatOf(node),
          totals: totalsOf(node),
        });
      } else if (collapsedHere) {
        // Subtotals hidden but the group is collapsed — still show the
        // collapsed group header so the tree stays navigable.
        push({
          kind: "subtotal",
          key: node.key,
          depth: node.depth,
          labels: node.labels,
          displayLabels: node.displayLabels,
          hasChildren: true,
          collapsed: true,
          count: node.rows.length,
          measures: flatOf(node),
          totals: totalsOf(node),
        });
      }
    }
  };
  emit(roots);

  const grandMeasures: CellValue[] = [];
  for (const combo of colCombos) {
    const bucket = comboRows.get(combo.key) ?? [];
    for (let i = 0; i < valueSpecs.length; i += 1) {
      grandMeasures.push(aggregate(bucket, valueSpecs[i], valueFields[i], filtered));
    }
  }
  const grandTotals = valueSpecs.map((spec, i) =>
    aggregate(filtered, spec, valueFields[i], filtered),
  );

  /* Exactly ONE Grand Total row — and only when a row field exists (a
     "total" over an ungrouped single column would just repeat the value
     column). With no row field AND no column field the single figure the
     report has is emitted as a plain value row instead (label blank — the
     corner caption carries "Values: <measure>"). */
  if (showGrandTotals && (rowFields.length > 0 || colFields.length > 0)) {
    push({
      kind: "grand",
      key: "__grand_total__",
      depth: 0,
      labels: rowFields.map((_, i) => (i === 0 && rowFields.length > 0 ? "Grand Total" : null)),
      displayLabels: rowFields.map((_, i) => (i === 0 && rowFields.length > 0 ? "Grand Total" : null)),
      hasChildren: false,
      collapsed: false,
      count: filtered.length,
      measures: grandMeasures,
      totals: grandTotals,
    });
  } else if (showGrandTotals && rowFields.length === 0 && colFields.length === 0) {
    push({
      kind: "leaf",
      key: "__all_values__",
      depth: 0,
      labels: [],
      displayLabels: [],
      hasChildren: false,
      collapsed: false,
      count: filtered.length,
      measures: grandMeasures,
      totals: grandTotals,
    });
  }

  return {
    rowFields,
    colFields,
    valueSpecs,
    valueFields,
    colCombos,
    outRows,
    grandMeasures,
    grandTotals,
    filteredCount: filtered.length,
    totalCount: rows.length,
    truncated,
    maxRows,
  };
}

/* ------------------------------------------------------------------ */
/* helpers for the page                                                */
/* ------------------------------------------------------------------ */

/** Distinct group labels for a filter field, sorted, capped for sanity. */
export function distinctValues(
  rows: PivotRow[],
  field: PivotFieldDef,
  limit = 400,
): string[] {
  const seen = new Set<string>();
  for (const row of rows) seen.add(groupKey(field.value(row)));
  return [...seen].sort(compareStrings).slice(0, limit);
}

/** Which facilities sit behind one pivot cell — the drill-down source.
 *
 *  Pass the row-group labels of a `PivotOutRow` (sliced to its own depth —
 *  indexes beyond it must be `undefined` so deeper levels don't filter"),
 *  and the column-combo labels. `null` labels match blank values. */
export function pivotDrilldown({
  rows,
  fields,
  config,
  labels,
  colLabels,
}: {
  rows: PivotRow[];
  fields: PivotFieldDef[];
  config: PivotConfig;
  labels: (string | null | undefined)[];
  colLabels?: (string | null)[];
}): PivotRow[] {
  const byId = new Map(fields.map((f) => [f.id, f]));
  return rows.filter((row) => {
    for (let i = 0; i < config.rows.length; i += 1) {
      const flag = labels[i];
      if (flag === undefined) continue; // group level not set yet — any value
      const field = byId.get(config.rows[i]);
      if (!field) continue;
      const v = field.value(row);
      const isBlank = v == null || v === "";
      // A named label only matches a real value; blank groups match only
      // blank values (before this, a non-null flag wrongly matched blanks).
      if (flag === null ? !isBlank : isBlank || String(v) !== flag)
        return false;
    }
    if (colLabels) {
      for (let j = 0; j < config.columns.length; j += 1) {
        const field = byId.get(config.columns[j]);
        if (!field) continue;
        const v = field.value(row);
        if (groupKey(v) !== groupKey(colLabels[j])) return false;
      }
    }
    return true;
  });
}

/** Data-quality hint source: how many facilities hold no value per field. */
export function fieldBlankCounts(
  rows: PivotRow[],
  fields: PivotFieldDef[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const field of fields) {
    let blanks = 0;
    for (const row of rows) {
      const v = field.value(row);
      if (v == null || v === "") blanks += 1;
    }
    out[field.id] = blanks;
  }
  return out;
}

export type DecimalOption = "auto" | 0 | 1 | 2;

/** Render one measure cell. Dates show as display dates; numbers use the
 *  Indian grouping (1,23,456) and the requested decimal precision. */
export function formatCell(
  v: CellValue,
  field: PivotFieldDef | undefined,
  spec: PivotValueSpec,
  decimals: DecimalOption = "auto",
): string {
  if (v == null) return "—";
  if (typeof v === "string") {
    if (field?.type === "date" && (spec.agg === "min" || spec.agg === "max")) {
      return toDisplayDate(v);
    }
    return v;
  }
  const digits =
    decimals === "auto"
      ? spec.agg === "count" || spec.agg === "distinct"
        ? 0
        : 2
      : decimals;
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(v);
}

/** Export any table as CSV (UTF-8 with BOM so Excel keeps the encoding). */
export function toCsv(
  headers: string[],
  rows: (string | number | null)[][],
): string {
  const esc = (v: string | number | null) => {
    const text = v == null ? "" : String(v);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join(
    "\n",
  );
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
