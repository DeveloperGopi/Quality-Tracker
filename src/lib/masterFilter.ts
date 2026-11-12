/**
 * MASTER LIST ENGINE — filtering, sorting and name-disambiguation for the
 * Facility Master List.
 *
 * Why this module exists: the page used to run its filter chain inline in a
 * `useMemo` and its sort comparator inline in the table component, so neither
 * could be tested and the two drifted (a status could filter one way and sort
 * another). Everything here is PURE — rows in, rows out, no React, no Convex —
 * so `scripts/masterList.test.ts` can pin the behaviour the page actually
 * renders.
 *
 * Rules kept identical to the pre-extraction page (no behaviour change):
 *   • an empty / "all" multi-select means "no filter", never "no rows",
 *   • missing values never match a concrete selection,
 *   • search is case-insensitive and matches name, PHC, block and NIN.
 */

import { eligibilityFilterMatches } from "@/lib/eligibility";
import {
  documentsStatusReportDisplayOf,
  saqshamDocumentsStatusOf,
} from "@/lib/resultDeclared";
import {
  attentionOf,
  dueDatesOf,
  dueDatesWithin,
  daysUntil,
  nextDueOf,
  requiredDocumentsMissing,
  stageOf,
  type MasterRow,
} from "@/lib/masterColumns";
import { iaCompareOf, iaScoreOf } from "@/lib/iaMaster";
import { multiFilterMatches } from "@/lib/multiFilter";
import { DEFAULT_DOCUMENT_RULES, type DocumentRules } from "@/lib/documentRules";
import { DEFAULT_PENDING_CONFIG, type PendingConfig } from "@/lib/pending";
import { deriveFireNocStatus } from "@/lib/today";
import type { LifecycleSettings } from "@/convex/lifecycle";

/** Sentinel filter value for facilities that have no certification cycle yet
 *  (a Radix multi-select value can't be the empty string). */
export const NO_CYCLE = "__none";

/** The clickable KPI cards / smart-view tabs — every id here is a filter
 *  predicate below, so a card's number and the list it opens can never
 *  disagree. "attention" and "due90" back the new tabs; the original eight
 *  ids stay valid URL values for links already in circulation. */
export type MasterKpiId =
  | "total"
  | "certified"
  | "pipeline"
  | "eligible"
  | "survOverdue"
  | "certExpiring"
  | "nocAlert"
  | "funds"
  | "attention"
  | "due90";

/** Human labels for the KPI cards. Shared by the slim KPI row and the active
 *  filter chips, so a chip reads “NQAS certified” instead of the raw id and the
 *  two can never disagree. */
export const KPI_LABELS: Record<MasterKpiId, string> = {
  total: "Total",
  certified: "Hold a certificate",
  pipeline: "In pipeline",
  eligible: "Eligible, not assessed",
  survOverdue: "Surveillance overdue",
  certExpiring: "Cert. expiring ≤ 90d",
  nocAlert: "Fire NOC issues",
  funds: "Gap funds",
  attention: "Needs attention",
  due90: "Due ≤ 90 days",
};

/** The extra metric filter a Block Compare heatmap cell opens. */
export type MasterMetricId =
  | "certified"
  | "deferred"
  | "nqasIa"
  | "iaChange"
  | "kayakalpIa"
  | "docsMissing"
  | "pendingIssues";

export const METRIC_LABELS: Record<MasterMetricId, string> = {
  certified: "Certified %",
  deferred: "Deferred",
  nqasIa: "Has NQAS IA",
  iaChange: "Has IA change",
  kayakalpIa: "Has Kayakalp IA",
  docsMissing: "Required document missing",
  pendingIssues: "Has a pending issue",
};

export type MasterFilters = {
  /** Free text — facility name, PHC, block or NIN. */
  search?: string;
  blocks?: readonly string[];
  types?: readonly string[];
  /** `String(cycleNumber)` values, plus NO_CYCLE for facilities without one. */
  cycles?: readonly string[];
  eligibility?: readonly string[];
  certStatus?: readonly string[];
  status?: readonly string[];
  /** Master-list "Documents Status (Report)" (the SaQsham import derives it).
   *  Filters on the DERIVED report value — the portal raw text never drives
   *  reports or filters (see the SaQsham import spec). */
  docReport?: readonly string[];
  buildingType?: readonly string[];
  buildingStatus?: readonly string[];
  nocStatus?: readonly string[];
  /** Clicked KPI card, or null for "no card selected". */
  kpi?: MasterKpiId | null;
  /** Block Compare drill-down (exact metric, not the broad KPI card). */
  metric?: MasterMetricId | null;
  /** 0 = off; otherwise keep rows with a due date inside the next N days. */
  dueWindow?: number;
  /** Certified-score window [min, max]; [0, 100] = off. */
  scoreRange?: readonly [number, number];
  /** Part 2 — the "Updated" filter: a preset window plus optional refiners. */
  lastChanged?: LastChangedFilter;
};

export type LastChangedPreset = "any" | "today" | "24h" | "7d" | "30d" | "custom";

/** Human labels for the change sources (filter chip, column tooltip, export). */
export const LAST_CHANGE_SOURCE_LABEL: Record<string, string> = {
  manual: "Manual edit",
  saqsham: "SaQsham import",
  ia: "IA import",
  master: "Facility master import",
  system: "Automatic",
};

export type LastChangedFilter = {
  preset: LastChangedPreset;
  /** Custom range (ISO yyyy-mm-dd, inclusive, IST days). */
  from?: string;
  to?: string;
  /** Name of the user who changed it. */
  by?: string;
  /** manual · saqsham · ia · master · system */
  source?: string;
  /** One import batch id. */
  batchId?: string;
  /** A field key from recentChanges. */
  field?: string;
};

/** IST calendar date of a timestamp (Asia/Kolkata, UTC+5:30, no DST). */
export function istDateOf(ms: number): string {
  return new Date(ms + 5.5 * 3_600_000).toISOString().slice(0, 10);
}

/**
 * Does one facility satisfy the Updated filter?
 *
 * The master-list row carries `lastChangedAt` written with the audit row; the
 * legacy `updatedAt` is the fallback for rows saved before the field existed.
 * A facility with neither stamp never matches an active filter (it is not a
 * silent "today"). Day windows are IST days, never the viewer's timezone.
 */
export function lastChangedMatches(
  row: MasterRow,
  f: LastChangedFilter,
  now: Date = new Date(),
): boolean {
  const at = row.facility.lastChangedAt ?? row.facility.updatedAt;
  if (!at) return false;
  const nowMs = now.getTime();
  const startOfIstDay = (ms: number) =>
    Date.parse(`${istDateOf(ms)}T00:00:00+05:30`);
  switch (f.preset) {
    case "any":
      break;
    case "today":
      if (istDateOf(at) !== istDateOf(nowMs)) return false;
      break;
    case "24h":
      if (at < nowMs - 24 * 3_600_000) return false;
      break;
    case "7d":
      if (at < startOfIstDay(nowMs) - 6 * 86_400_000) return false;
      break;
    case "30d":
      if (at < startOfIstDay(nowMs) - 29 * 86_400_000) return false;
      break;
    case "custom": {
      const from = f.from ? Date.parse(`${f.from}T00:00:00+05:30`) : null;
      const to = f.to ? Date.parse(`${f.to}T23:59:59.999+05:30`) : null;
      if (from != null && at < from) return false;
      if (to != null && at > to) return false;
      break;
    }
  }
  if (f.by && (row.facility.lastChangedBy ?? "").toLowerCase() !== f.by.toLowerCase())
    return false;
  if (f.source && row.facility.lastChangeSource !== f.source) return false;
  if (f.batchId && row.facility.lastBatchId !== f.batchId) return false;
  if (f.field && !(row.facility.recentChanges ?? []).some((c) => c.key === f.field))
    return false;
  return true;
}

/** Legacy candidate spellings fold into the current label so the status
 *  filter, its options and the KPI predicates speak one vocabulary. */
export function foldStatus(st: string | null | undefined): string {
  const s = st ?? "";
  return s === "Possible Future Candidate" || s === "Possible (future candidate)"
    ? "Facility (Future Candidate)"
    : s;
}

/** Fire NOC status used by both the filter and the NOC KPI card — one call. */
export function nocStatusOf(row: MasterRow, today?: string): string {
  return deriveFireNocStatus(
    row.noc?.nocAvailable ?? null,
    row.noc?.expiryDate ?? null,
    row.noc?.status ?? null,
    undefined,
    today,
  );
}

/** Every date the district chases for a facility — the ONE list now lives in
 *  lib/masterColumns (next to attentionOf/dueDatesWithin) so the due-window
 *  filter, the smart-view tab counts and the Next Action column chase the
 *  same deadlines. (Imported below alongside the other shared helpers.) */

/** Does one row satisfy the clicked KPI card? `today` is injectable so the
 *  date-based cards are testable. */
export function kpiMatches(
  row: MasterRow,
  kpi: MasterKpiId,
  today = new Date(),
  rules: DocumentRules = DEFAULT_DOCUMENT_RULES,
  pending: PendingConfig = DEFAULT_PENDING_CONFIG,
  settings?: Partial<LifecycleSettings> | null,
): boolean {
  const stage = stageOf(row);
  switch (kpi) {
    case "total":
      return true;
    case "certified":
      // "Hold a certificate": a GoI letter / certification date exists —
      // the same rule computeKpis applies, so the chip and the list it
      // opens answer ONE question, not "in a certified stage" AND "holds".
      return (
        (row.nqas?.certificationDate ?? row.nqas?.goiLetterDate ?? null) != null
      );
    case "pipeline":
      return stage === "sa" || stage === "nqas";
    case "eligible":
      // Canonical stored value only: “Not Eligible” is NOT “eligible, not
      // assessed” — a substring test used to count those facilities here, which
      // made the card and the list it opened disagree with its own label.
      return stage === "eligibility" && row.facility.eligibility === "Eligible";
    case "survOverdue": {
      // A surveillance visit that has been done is not overdue, however old its
      // due date is — only visits still outstanding can be late.
      const d1 = row.nqas?.surveillanceDone1
        ? null
        : daysUntil(row.nqas?.surveillanceDue1 ?? null, today);
      const d2 = row.nqas?.surveillanceDone2
        ? null
        : daysUntil(row.nqas?.surveillanceDue2 ?? null, today);
      return (d1 != null && d1 < 0) || (d2 != null && d2 < 0);
    }
    case "certExpiring": {
      // "Expiring ≤ 90 days" means still valid but close: a certificate whose
      // validity date has already passed is expired, a different (red) state,
      // and counting it here overstated the forward-looking workload.
      const d = daysUntil(row.nqas?.validityDate ?? null, today);
      return d != null && d >= 0 && d <= 90;
    }
    case "nocAlert": {
      const s = nocStatusOf(row);
      return s === "Expired" || s === "Not Obtained" || s === "Expiring Soon";
    }
    case "funds":
      return !!row.fund?.amountSanctioned;
    case "attention":
      // Expired certificate, overdue surveillance (visit not recorded),
      // expired Fire NOC, a dilapidated building or a missing required
      // document — distinct facilities, ONE predicate with the badge.
      return attentionOf(row, today, rules, pending, settings);
    case "due90":
      // Any tracked deadline inside (and up to) the next 90 days — the same
      // predicate the toolbar's due-window filter applies at 90.
      return dueDatesWithin(row, 90, today);
    default:
      return true;
  }
}

/** Block Compare drill-down metrics — one predicate per heatmap column. */
export function metricMatches(
  row: MasterRow,
  metric: MasterMetricId,
  today = new Date(),
  rules: DocumentRules = DEFAULT_DOCUMENT_RULES,
  pending: PendingConfig = DEFAULT_PENDING_CONFIG,
  settings?: Partial<LifecycleSettings> | null,
): boolean {
  const iaRow = row.iaq;
  const latest = (tracker: "nqas" | "kayakalp"): number | null => {
    if (iaRow) return iaScoreOf(iaRow, tracker, iaRow.pair.current);
    return tracker === "nqas"
      ? (row.facility.nqasIaQ2 ?? null)
      : (row.facility.kayakalpIaQ2 ?? null);
  };
  switch (metric) {
    case "certified": {
      // Exactly deriveFlatLifecycle's certified/conditional flags — the same
      // flags the Dashboard and the Block Compare heatmap count.
      const certResult = row.nqas?.certificationStatus ?? null;
      const currentStatus = row.facility.currentStatus ?? "";
      const quality =
        certResult === "Quality Certified" ||
        (!certResult &&
          (currentStatus === "Certified — Surveillance Due" ||
            currentStatus === "Certified — On track"));
      const conditional =
        certResult === "Quality Certified with Conditionality" ||
        (!certResult && currentStatus === "Certified with Conditionality");
      return quality || conditional;
    }
    case "deferred": {
      const certResult = row.nqas?.certificationStatus ?? null;
      const currentStatus = row.facility.currentStatus ?? "";
      return certResult === "Deferred" || (!certResult && currentStatus.startsWith("Deferred"));
    }
    case "nqasIa":
      return latest("nqas") != null;
    case "kayakalpIa":
      return latest("kayakalp") != null;
    case "iaChange":
      if (iaRow) return iaCompareOf(iaRow, "nqas") != null;
      return (
        row.facility.nqasIaQ1 != null && row.facility.nqasIaQ2 != null
      );
    case "docsMissing":
      return requiredDocumentsMissing(row, rules).length > 0;
    case "pendingIssues":
      return attentionOf(row, today, rules, pending, settings);
    default:
      return true;
  }
}

/** Is any tracked deadline (validity / surveillance / NOC) inside `days`? */
export function hasDueWithin(
  row: MasterRow,
  days: number,
  today = new Date(),
): boolean {
  return dueDatesOf(row).some((iso) => {
    const d = daysUntil(iso, today);
    return d != null && d <= days;
  });
}

/* Re-exported tabs predicates — one definition (lib/masterColumns) shared by
   the KPI chips, the smart-view tab counts and the row filter. */
export { attentionOf, dueDatesWithin } from "@/lib/masterColumns";

/** Case- and whitespace-insensitive search across identity and both document
 *  status columns. */
export function searchMatches(row: MasterRow, query: string): boolean {
  const q = query.trim().toLowerCase().replace(/\s+/g, " ");
  if (!q) return true;
  const haystack = `${row.facility.name} ${row.facility.facilityType} ${row.facility.phc} ${
    row.facility.block
  } ${row.facility.ninNumber ?? ""} ${
    saqshamDocumentsStatusOf(row.sa?.generalDocStatus, row.nqas?.certificationStatus) ?? ""
  } ${
    documentsStatusReportDisplayOf(
      row.sa?.generalDocStatus,
      row.facility.documentsStatusReport,
      row.nqas?.certificationStatus,
    ) ?? ""
  }`
    .toLowerCase()
    .replace(/\s+/g, " ");
  return haystack.includes(q);
}

/** The one filter chain the page, the export counts and the tests share.
 *
 *  Generic in the row type so the page keeps the full Convex row shape (the
 *  table, the drawer and the exports take the richer type) while the tests can
 *  pass plain MasterRow literals. */
export function applyMasterFilters<T extends MasterRow>(
  rows: T[],
  filters: MasterFilters = {},
  today = new Date(),
  rules: DocumentRules = DEFAULT_DOCUMENT_RULES,
  pending: PendingConfig = DEFAULT_PENDING_CONFIG,
  settings?: Partial<LifecycleSettings> | null,
): T[] {
  const {
    search = "",
    blocks = [],
    types = [],
    cycles = [],
    eligibility = [],
    certStatus = [],
    status = [],
    docReport = [],
    buildingType = [],
    buildingStatus = [],
    nocStatus = [],
    kpi = null,
    metric = null,
    dueWindow = 0,
    scoreRange = [0, 100],
    lastChanged,
  } = filters;

  return rows.filter((r) => {
    if (lastChanged && !lastChangedMatches(r, lastChanged, today)) return false;
    if (!multiFilterMatches(r.facility.block, blocks)) return false;
    if (!multiFilterMatches(r.facility.facilityType, types)) return false;
    if (!eligibilityFilterMatches(r.facility.eligibility, eligibility)) return false;
    if (!multiFilterMatches(r.nqas?.certificationStatus ?? "", certStatus)) return false;
    if (!multiFilterMatches(foldStatus(r.facility.currentStatus), status)) return false;
    if (!multiFilterMatches(r.facility.documentsStatusReport ?? "", docReport)) return false;
    if (
      !multiFilterMatches(
        r.cycleNumber ? String(r.cycleNumber) : NO_CYCLE,
        cycles,
      )
    )
      return false;
    if (!multiFilterMatches(r.building?.buildingType ?? "", buildingType)) return false;
    if (!multiFilterMatches(r.building?.buildingStatus ?? "", buildingStatus))
      return false;
    if (!multiFilterMatches(nocStatusOf(r), nocStatus)) return false;

    if (kpi && !kpiMatches(r, kpi, today, rules, pending, settings)) return false;
    if (
      metric &&
      !metricMatches(r, metric, today, rules, pending, settings)
    )
      return false;
    if (dueWindow > 0 && !hasDueWithin(r, dueWindow, today)) return false;
    if (scoreRange[0] > 0 || scoreRange[1] < 100) {
      const score = r.nqas?.scorePercent ?? null;
      if (score == null || score < scoreRange[0] || score > scoreRange[1]) return false;
    }
    if (!searchMatches(r, search)) return false;
    return true;
  });
}

/* --------------------------------------------------------------------------- */
/* Sorting                                                                     */
/* --------------------------------------------------------------------------- */

/** Sort key for a cell: numbers stay numbers, dates become timestamps, text
 *  is compared numerically-aware ("HSC 2" before "HSC 10"). */
export function sortValueOf(row: MasterRow, key: string): number | string | null {
  // The derived "Next Action / Due" column sorts by the deadline it shows
  // (ISO dates compare chronologically as strings); rows with nothing tracked
  // are blank, so they sort last like every other blank.
  if (key === "nextAction") return nextDueOf(row)?.iso ?? null;
  switch (key) {
    case "facility":
      return row.facility.name.toLowerCase();
    case "block":
      return row.facility.block.toLowerCase();
    case "phc":
      return row.facility.phc.toLowerCase();
    case "type":
      return row.facility.facilityType.toLowerCase();
    case "nin":
      return row.facility.ninNumber ? String(row.facility.ninNumber) : null;
    case "certCycle":
      return row.cycleNumber ?? null;
    case "certScore":
    case "saScore":
    case "survScore":
      return key === "certScore"
        ? row.nqas?.scorePercent ?? null
        : key === "saScore"
          ? row.sa?.scorePercent ?? null
          : row.nqas?.manualScore ?? null;
    case "areaA":
    case "areaB":
    case "areaC":
    case "areaD":
    case "areaE":
    case "areaF":
    case "areaG":
    case "areaH": {
      const letter = key.slice(4).toUpperCase();
      return row.scores?.areas.find((a) => a.key.toUpperCase() === letter)?.score ?? null;
    }
    case "gapAmount":
      return row.fund?.amountSanctioned ?? null;
    default:
      break;
  }
  const iso = dateOf(row, key);
  if (iso) {
    const t = Date.parse(iso);
    return Number.isNaN(t) ? null : t;
  }
  const text = textOf(row, key);
  return text ? text.toLowerCase() : null;
}

/** ISO date behind a column key, when the column is date-like. */
function dateOf(row: MasterRow, key: string): string | null {
  switch (key) {
    case "certDate":
      return row.nqas?.goiLetterDate ?? row.nqas?.certificationDate ?? null;
    case "naScheduled":
      return row.nqas?.scheduledStartDate ?? null;
    case "naEnd":
      return row.nqas?.actualEndDate ?? row.nqas?.scheduledEndDate ?? null;
    case "validityDate":
      return row.nqas?.validityDate ?? null;
    case "survDue1":
      return row.nqas?.surveillanceDue1 ?? null;
    case "survDue2":
      return row.nqas?.surveillanceDue2 ?? null;
    case "surv1":
      return row.nqas?.surveillanceDone1 ?? null;
    case "surv2":
      return row.nqas?.surveillanceDone2 ?? null;
    case "saStart":
      return row.sa?.actualStartDate ?? row.sa?.scheduledDate ?? null;
    case "saEnd":
      return row.sa?.actualEndDate ?? null;
    case "nocCertified":
      return row.noc?.issuedDate ?? null;
    case "nocValidity":
      return row.noc?.expiryDate ?? null;
    case "lastUpdated":
      return row.facility.updatedAt
        ? new Date(row.facility.updatedAt).toISOString().slice(0, 10)
        : null;
    default:
      return null;
  }
}

/** Plain text behind a column key, when the column is a word column. */
function textOf(row: MasterRow, key: string): string {
  switch (key) {
    case "eligibility":
      return row.facility.eligibility ?? "";
    case "pipelineStatus":
      return foldStatus(row.facility.currentStatus);
    case "certStatus":
      return row.nqas?.certificationStatus ?? "";
    case "nqasResult":
      return row.nqas?.status ?? "";
    case "naMode":
      return row.nqas?.mode ?? "";
    case "departments":
      return (row.nqas?.departments ?? []).join(", ");
    case "recertStatus":
      return row.nqas?.recertStatus ?? "";
    case "recertYear":
      return row.nqas?.recertYear == null ? "" : String(row.nqas.recertYear);
    case "saStatus":
      return row.sa?.status ?? "";
    case "genDoc":
      return row.sa?.generalDocStatus ?? "";
    case "assessor1":
      return row.sa?.assessor1Name ?? "";
    case "assessor2":
      return row.sa?.assessor2Name ?? "";
    case "buildingType":
      return row.building?.buildingType ?? "";
    case "buildingStatus":
      return row.building?.buildingStatus ?? "";
    case "nocAvailable":
      return row.noc?.nocAvailable ?? "";
    case "nocStatus":
      return nocStatusOf(row);
    case "remarks":
      return row.facility.remarks ?? "";
    case "gcYear":
      return row.fund?.financialYear ?? "";
    default:
      return "";
  }
}

/**
 * Compare two rows for one column. Blanks sort LAST in ascending order so an
 * unrecorded value never leads the list; the caller flips the sign for
 * descending (standard spreadsheet behaviour).
 */
export function compareMasterRows(a: MasterRow, b: MasterRow, key: string): number {
  const x = sortValueOf(a, key);
  const y = sortValueOf(b, key);
  if (x == null && y == null) return 0;
  if (x == null) return 1;
  if (y == null) return -1;
  if (typeof x === "number" && typeof y === "number") return x - y;
  if (typeof x === "number") return -1;
  if (typeof y === "number") return 1;
  return x.localeCompare(y, undefined, { numeric: true });
}

/** Compare two pre-computed sort values. `null` means "blank". */
function compareValues(
  x: number | string | null,
  y: number | string | null,
): number {
  if (x == null && y == null) return 0;
  if (x == null) return 1;
  if (y == null) return -1;
  if (typeof x === "number" && typeof y === "number") return x - y;
  if (typeof x === "number") return -1;
  if (typeof y === "number") return 1;
  return x.localeCompare(y, undefined, { numeric: true });
}

/**
 * Compare two rows for one column, INCLUDING the sort direction.
 *
 * Blank handling is deliberately not a plain negation of
 * `compareMasterRows`: an unrecorded value must not lead the list when the
 * user sorts descending either (a blank certificate score is not the "highest"
 * score). So blanks are pinned to the end in BOTH directions, and only the
 * real values flip.
 */
export function compareForColumn(
  a: MasterRow,
  b: MasterRow,
  key: string,
  desc = false,
): number {
  const x = sortValueOf(a, key);
  const y = sortValueOf(b, key);
  if (x == null || y == null) return compareValues(x, y);
  const cmp = compareValues(x, y);
  return desc ? -cmp : cmp;
}

/**
 * Multi-column sort — the same rules the table's header clicks use, exposed so
 * the sort can be unit-tested (and reused by the exports).
 *
 * Each row's sort keys are computed ONCE (decorate → sort → undecorate) before
 * the comparisons start, instead of on every comparison: a derived column is
 * not free to read ("Next Action / Due" walks five deadlines and picks one),
 * and doing it inside the comparator cost 122 ms on 2,000 rows. Measured after
 * the change (5-run average, this machine): 157 rows — 0.6 ms by name, 3.8 ms
 * by Next Action; 342 rows — 12.2 ms; 2,000 rows — 69 ms. A district list
 * (157 facilities) therefore sorts well inside one frame.
 */
export function sortMasterRows<T extends MasterRow>(
  rows: T[],
  sorting: readonly { id: string; desc?: boolean }[],
): T[] {
  if (sorting.length === 0) return [...rows];

  const decorated = rows.map((row) => ({
    row,
    keys: sorting.map((s) => sortValueOf(row, s.id)),
    // Deterministic tiebreak: name, then id — never "whatever the DB returned".
    name: sortValueOf(row, "facility") as string | null,
    id: String(row.facility._id),
  }));

  decorated.sort((a, b) => {
    for (let i = 0; i < sorting.length; i += 1) {
      const x = a.keys[i];
      const y = b.keys[i];
      // Blanks stay at the end in both directions; real values honour the
      // requested direction.
      const cmp =
        x == null || y == null
          ? compareValues(x, y)
          : (() => {
              const c = compareValues(x, y);
              return sorting[i].desc ? -c : c;
            })();
      if (cmp !== 0) return cmp;
    }
    const byName = compareValues(a.name, b.name);
    if (byName !== 0) return byName;
    return a.id.localeCompare(b.id);
  });

  return decorated.map((d) => d.row);
}

/* --------------------------------------------------------------------------- */
/* Disambiguation                                                              */
/* --------------------------------------------------------------------------- */

/** Facility names used by more than one row — these get the PHC · Block
 *  secondary line in the table so "Vallipattu ×3" is three distinct rows. */
export function duplicateNames(rows: readonly MasterRow[]): Set<string> {
  const seen = new Map<string, number>();
  for (const r of rows) {
    const key = (r.facility.name ?? "").trim().toLowerCase();
    if (!key) continue;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const dupes = new Set<string>();
  for (const [name, count] of seen) if (count > 1) dupes.add(name);
  return dupes;
}

/** Does this row's facility name need a PHC/Block disambiguation line? */
export function isDuplicateName(row: MasterRow, dupes: Set<string>): boolean {
  return dupes.has((row.facility.name ?? "").trim().toLowerCase());
}

/** The newest facility change in the shown rows — the table's "Last updated"
 *  stamp. Returns null when nothing carries a timestamp (or the list is empty). */
export function latestUpdatedAt(rows: readonly MasterRow[]): number | null {
  let newest: number | null = null;
  for (const r of rows) {
    const t = r.facility.updatedAt ?? null;
    if (t != null && (newest == null || t > newest)) newest = t;
  }
  return newest;
}
