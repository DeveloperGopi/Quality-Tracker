/**
 * CYCLE REPORT ("Certification cycles") — ONE pure builder for the screen,
 * PDF, Excel and CSV.
 *
 * Unit of count: a facility-cycle (one facility in one certification cycle).
 * Totals also report distinct facilities, because a facility in Cycle #1 and
 * #2 is two facility-cycles but one facility.
 *
 * PART 0 AUDIT — root causes fixed here (each is a test in
 * scripts/cycleReport.test.ts):
 *
 * 1. Blank score read as 0 → 0.00 and "-87.04 declined":
 *    - The bulk import's `parseScore` (src/convex/ops.ts:1235) used to accept
 *      "0" as a score, so a blank cell wrote `nationalAssessments.scorePercent
 *      = 0`. That write path is fixed there; the STORED 0s still exist.
 *    - The comparison read them as real scores: the old
 *      `list.filter(r => r.certScore != null)` + `delta = to.certScore -
 *      from.certScore` (this file, old lines 787–791) produced
 *      0 − 87.04 = −87.04 → "2 declined", and the view printed 0.00
 *      (CycleReportView, old line 1123).
 *    - FIX: `effectiveScore()` — a stored 0 is not a score (the certification
 *      threshold is 70), so it is read as null everywhere in this report and
 *      never counted as a change. The row is normalised ONCE at the top of
 *      `buildCycleReport` and again in src/convex/cycleReport.ts.
 *
 * 2. "Recertified: On time" for a Deferred facility:
 *    the old comparison keyed on two non-null SCORES (0 counted) and derived
 *    `onTime` from dates alone. A Deferred result is not a recertification.
 *    Now: Recertified = the facility's LATEST cycle result is Quality
 *    Certified / Conditional; On time = that certification date on or before
 *    the previous cycle's validity end; Deferred reads "Not recertified yet ·
 *    cooling period ends DD-MMM-YYYY"; no result yet reads "In progress".
 *
 * 3. Expired 6 vs 7: the old validity table counted facility-cycles
 *    (`rows.filter(x => x.cycleNumber === c)`) including a replaced Cycle #1
 *    certificate, while the outlook counted one row per facility by its
 *    LATEST cycle. Every renewal/validity number now uses the latest cycle
 *    (or the highest cycle that actually holds a certificate).
 *
 * 4. Hold a certificate 74 vs 73: per-cycle counts are Quality/Conditional in
 *    THAT cycle (74 in Cycle #1); headline totals count each facility ONCE by
 *    its latest cycle (73). `reconciliation` prints the one-line explanation.
 *
 * 5. Lifecycle vs surveillance mismatch (the removed chart): `deriveStage`
 *    (src/lib/facilityQuickView.ts:261–286) never emits `done` for the
 *    Surveillance stage — it stays `current`/`warning` until both visits are
 *    recorded — so the chart's "0 done +74" was stage-current, while the 29
 *    first visits done came from `surveillanceVisits` (a per-visit rule).
 *    Two different definitions; the chart is removed and every surveillance
 *    number uses the shared per-visit function.
 *
 * 6. "No validity 85": the old `notRecorded` bucket mixed uncertified
 *    facilities with certified ones that have no validity date. They are now
 *    separate: uncertified facilities are simply not in the renewals scope;
 *    "Certified, no validity date" is reported in `certifiedNoValidity`.
 *
 * 7. "Started 25-Sep-2026": the old list/export read `cycle.createdAt` — the
 *    migration/import timestamp. The start is now the cycle's own first
 *    record (`cycleStartIso`: state-assessment or assessment-scheduled date);
 *    with none recorded the cell is "-", never the migration date. NOTE: the
 *    schema has no separate re-application date (certificationCycles carries
 *    only createdAt/createdBy, stamped on import for every cycle), so Cycle
 *    #2 falls back to its own SA/assessment record and "-" otherwise.
 *
 * Shared rules reused unchanged: surveillanceVisits / surveillanceNextAction
 * (a Done visit is never Overdue), the Result Declared rule, reportMetrics
 * precision / median / no-change band, cycle context (facility_cycle).
 */

import { formatVisitDate, surveillanceNextAction } from "@/convex/lifecycle";
import { isResultDeclaredStatus } from "@/lib/resultDeclared";
import {
  daysBetweenIso,
  formatPercent,
  median,
  NO_CHANGE_BAND,
  percentOf,
} from "@/lib/reportMetrics";
import { fiscalYearLabel } from "@/lib/fiscalYear";

export type CycleReportRow = {
  facilityId: string;
  facility: string;
  block: string;
  phc: string;
  type: string;
  nin: string | null;
  eligibility: string;
  currentStatus: string;
  currentCycleNumber: number | null;
  documentsStatusReport: string | null;
  cycleId: string;
  cycleNumber: number;
  cycleType: string;
  superseded: boolean;
  recertStage: string | null;
  cycleCreatedAt: number;
  saStatus: string | null;
  saScheduledDate: string | null;
  saStartDate: string | null;
  saEndDate: string | null;
  saScore: number | null;
  generalDocStatus: string | null;
  naStatus: string | null;
  naScheduledDate: string | null;
  naEndDate: string | null;
  naMode: string | null;
  certStatus: string | null;
  certDate: string | null;
  goiLetterDate: string | null;
  certScore: number | null;
  manualScore: number | null;
  validityDate: string | null;
  surveillanceDue1: string | null;
  surveillanceDone1: string | null;
  surveillanceDue2: string | null;
  surveillanceDone2: string | null;
  recertStatus: string | null;
  recertYear: string | null;
  buildingStatus: string | null;
  /** Facility-level Fire NOC status (not cycle-scoped). */
  nocStatus?: string | null;
};

export type CycleReportSettings = {
  surveillanceAlertLeadDays?: number;
  recertificationAlertLeadDays?: number;
  generalDocStatuses?: string[];
  certificationStatuses?: string[];
  /** Cooling period for a Deferred result (default 3 months). */
  deferredCooldownMonths?: number;
};

export type CycleGroupBy = "type" | "block" | "phc";

/* -------------------------------------------------------------------------- */
/* Shared vocabularies                                                        */
/* -------------------------------------------------------------------------- */

export type RenewalBucketKey = "expired" | "d90" | "d180" | "d365" | "later";

export const RENEWAL_BUCKETS: { key: RenewalBucketKey; label: string }[] = [
  { key: "expired", label: "Expired" },
  { key: "d90", label: "Within 90 days" },
  { key: "d180", label: "91–180 days" },
  { key: "d365", label: "181–365 days" },
  { key: "later", label: "Later" },
];

export type RenewalStepKey =
  | "notStarted"
  | "reapplication"
  | "scheduled"
  | "resultAwaited"
  | "done"
  | "deferred";

export const RENEWAL_STEPS: {
  key: RenewalStepKey;
  label: string;
  tip: string;
}[] = [
  {
    key: "notStarted",
    label: "Not started",
    tip: "No re-application has been received yet.",
  },
  {
    key: "reapplication",
    label: "Re-application received",
    tip: "A Recertification cycle exists; its assessment is not scheduled yet.",
  },
  {
    key: "scheduled",
    label: "Assessment scheduled",
    tip: "The recertification assessment has a scheduled date.",
  },
  {
    key: "resultAwaited",
    label: "Result awaited",
    tip: "The assessment is complete or the result is declared; the outcome is not recorded yet.",
  },
  {
    key: "done",
    label: "Done (Recertified)",
    tip: "The latest cycle holds a Quality or Conditional certificate.",
  },
  {
    key: "deferred",
    label: "Deferred",
    tip: "The recertification result is Deferred — the facility re-attempts after the cooling period.",
  },
];

export type OutcomeKey =
  | "quality"
  | "conditional"
  | "deferred"
  | "inProgress"
  | "notEligible";

export const OUTCOME_SEGMENTS: { key: OutcomeKey; label: string }[] = [
  { key: "quality", label: "Quality" },
  { key: "conditional", label: "Conditional" },
  { key: "deferred", label: "Deferred" },
  { key: "inProgress", label: "In progress" },
  { key: "notEligible", label: "Not eligible" },
];

/* -------------------------------------------------------------------------- */
/* Small shared helpers                                                       */
/* -------------------------------------------------------------------------- */

const norm = (v: string | null | undefined) =>
  String(v ?? "").trim().toLowerCase();

/** DD-MMM-YYYY — every date in this report is plain, never ISO. */
const dmy = (iso: string | null | undefined) =>
  iso ? formatVisitDate(String(iso).slice(0, 10)) || "-" : "-";

export function cycleLabel(cycleNumber: number, cycleType: string): string {
  return `Cycle #${cycleNumber} ${cycleType || "Initial"}`;
}

export function holdsCertificate(
  certStatus: string | null | undefined,
): boolean {
  const v = norm(certStatus);
  return v === "quality certified" || v === "quality certified with conditionality";
}

function isQuality(v: string | null | undefined) {
  return norm(v) === "quality certified";
}
function isConditional(v: string | null | undefined) {
  return norm(v) === "quality certified with conditionality";
}
function isDeferred(v: string | null | undefined) {
  return norm(v) === "deferred";
}

const toIso = (v: string | null | undefined) =>
  v && /^\d{4}-\d{2}-\d{2}/.test(v) ? String(v).slice(0, 10) : null;

/**
 * ROOT CAUSE of the 0.00 / −87.04 (Part 0.1): a stored score of 0 is a blank
 * the import could not parse, never a result — the certification threshold is
 * 70. A blank is never 0.
 */
export function effectiveScore(v: number | null | undefined): number | null {
  return v != null && Number.isFinite(v) && v > 0 ? v : null;
}

/** "Quality" / "Conditional" / "Deferred" / "Not certified" (never "Not
 *  recorded" — that wording is only for missing SOURCE data). */
export function resultLabel(certStatus: string | null | undefined): string {
  if (isQuality(certStatus)) return "Quality";
  if (isConditional(certStatus)) return "Conditional";
  if (isDeferred(certStatus)) return "Deferred";
  return "Not certified";
}

/**
 * The ISO date a cycle STARTED at: its own first record — the state assessment
 * date (or the assessment-scheduled date). NEVER `cycle.createdAt`, which the
 * migration stamps on import day (Part 0.7).
 */
export function cycleStartIso(r: CycleReportRow): string | null {
  return toIso(r.saStartDate) ?? toIso(r.saScheduledDate) ?? toIso(r.naScheduledDate);
}

/** ISO date + n months, clamped to the month's length. */
function addMonthsIso(iso: string, months: number): string | null {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}

/** When a Deferred result's cooling period ends (default 3 months). */
export function coolingEndIso(
  r: CycleReportRow,
  settings: CycleReportSettings,
): string | null {
  if (!isDeferred(r.certStatus)) return null;
  const from = toIso(r.goiLetterDate) ?? toIso(r.certDate) ?? toIso(r.naEndDate);
  if (!from) return null;
  return addMonthsIso(from, settings.deferredCooldownMonths ?? 3);
}

/** Indian financial-quarter of an ISO date: Q1 Apr-Jun … Q4 Jan-Mar. */
export function fyQuarterOf(
  iso: string,
): { key: string; label: string; shortLabel: string; start: string; end: string } {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  const fyStart = m >= 4 ? y : y - 1;
  const q = m >= 4 && m <= 6 ? 1 : m >= 7 && m <= 9 ? 2 : m >= 10 && m <= 12 ? 3 : 4;
  const startMonth = [4, 7, 10, 1][q - 1];
  const startYear = q === 4 ? fyStart + 1 : fyStart;
  const endMonth = [6, 9, 12, 3][q - 1];
  const endYear = q === 4 ? fyStart + 1 : fyStart;
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(Date.UTC(endYear, endMonth, 0)).getUTCDate();
  const fyLabel = fiscalYearLabel(fyStart); // "2026-27"
  return {
    key: `${fyStart}-Q${q}`,
    label: `Q${q} ${fyLabel}`,
    shortLabel: `Q${q} ${fyLabel.slice(2)}`, // "Q3 26-27"
    start: `${startYear}-${pad(startMonth)}-01`,
    end: `${endYear}-${pad(endMonth)}-${pad(lastDay)}`,
  };
}

/**
 * Part 0.10 — under 5 facilities a percentage is noise: show "1 of 2".
 * 0 of anything still reads "-".
 */
export function ratioLabel(part: number, whole: number): string {
  if (!Number.isFinite(whole) || whole <= 0) return "-";
  if (whole < 5) return `${part} of ${whole}`;
  return formatPercent(percentOf(part, whole));
}

/** Part 0.8 — a median carries its unit; fewer than 3 values is "-". */
export function medianDaysText(value: number | null): string {
  if (value == null) return "-";
  return `${Math.round(value)} days`;
}

export function bucketOfDays(days: number): RenewalBucketKey {
  if (days < 0) return "expired";
  if (days <= 90) return "d90";
  if (days <= 180) return "d180";
  if (days <= 365) return "d365";
  return "later";
}

function outcomeOf(r: CycleReportRow): OutcomeKey {
  if (isQuality(r.certStatus)) return "quality";
  if (isConditional(r.certStatus)) return "conditional";
  if (isDeferred(r.certStatus)) return "deferred";
  if (norm(r.eligibility) !== "eligible") return "notEligible";
  return "inProgress";
}

const nqasView = (r: CycleReportRow) =>
  ({
    status: r.naStatus ?? "",
    certificationStatus: r.certStatus ?? "",
    certificationDate: r.certDate,
    goiLetterDate: r.goiLetterDate,
    actualEndDate: r.naEndDate,
    validityDate: r.validityDate,
    surveillanceDue1: r.surveillanceDue1,
    surveillanceDone1: r.surveillanceDone1,
    surveillanceDue2: r.surveillanceDue2,
    surveillanceDone2: r.surveillanceDone2,
  }) as never;

/* -------------------------------------------------------------------------- */
/* Definitions (the shared wording for popovers and the Definitions sheet)     */
/* -------------------------------------------------------------------------- */

export const CYCLE_REPORT_DEFINITIONS: { term: string; meaning: string }[] = [
  {
    term: "Facility-cycle",
    meaning:
      "One facility in one certification cycle. A facility that has started Cycle #2 is two facility-cycles but one distinct facility.",
  },
  {
    term: "Hold a certificate",
    meaning:
      "NQAS Certification Status is Quality Certified or Quality Certified with Conditionality. Deferred is reported separately.",
  },
  {
    term: "Not certified vs Not recorded",
    meaning:
      "“Not certified” means the facility genuinely has no certificate. “Not recorded” is used only when the SOURCE data for a field is missing.",
  },
  {
    term: "In pipeline",
    meaning:
      "The facility-cycle has a certification cycle but does not hold a certificate and is not deferred — it is still moving through the lifecycle.",
  },
  {
    term: "Renewal step",
    meaning:
      "Not started → Re-application received → Assessment scheduled → Result awaited → Done (Recertified); Deferred is its own outcome. Derived from the facility's latest cycle.",
  },
  {
    term: "Days windows",
    meaning:
      "Expired (validity end before today), Within 90 days, 91–180 days, 181–365 days, Later — computed date-only, IST, from the certificate's validity end.",
  },
  {
    term: "On time / Late",
    meaning:
      "Recertified = the latest cycle's result is Quality or Conditional. On time = its certification date is on or before the previous cycle's validity end; otherwise “Late by N days”.",
  },
  {
    term: "Surveillance states",
    meaning:
      "Done (a real, non-future done date), Overdue (due date passed and not done), Due soon (inside the Admin window), Upcoming, Not applicable. A Done visit is never Overdue.",
  },
  {
    term: "No-change band",
    meaning: `A score difference smaller than ${NO_CHANGE_BAND} (absolute) reads as unchanged (■), with the exact value in the tooltip. A change is only counted when BOTH scores exist.`,
  },
  {
    term: "Median rule",
    meaning:
      "A median needs at least 3 values; below that the report prints “-” instead of a misleading number.",
  },
  {
    term: "Small groups",
    meaning:
      "A group with fewer than 5 facilities shows “part of whole” (for example “1 of 2”) instead of a percentage.",
  },
];

export type CycleReportResult = {
  today: string;
  distinctFacilities: number;
  facilityCycles: number;
  cycles: {
    cycleNumber: number;
    cycleType: string;
    label: string;
    facilities: number;
    current: boolean;
  }[];
  headline: string | null;
  headlineIds: string[];
  needsAction: {
    key: "expiredNoReapp" | "dueNotStarted" | "deferredCooling";
    label: string;
    count: number;
    ids: string[];
    filters: { buckets: RenewalBucketKey[]; step: RenewalStepKey | null };
  }[];
  overview: {
    cards: OverviewCycleCard[];
    details: { type: OverviewDetails; block: OverviewDetails };
  };
  renewals: RenewalsView;
  comparison: ComparisonSummary;
  reconciliation: {
    cycleHold: number;
    cycleLabel: string;
    distinctHold: number;
    overlap: number;
    text: string | null;
  };
  list: FacilityCycleEntry[];
  latest: FacilityCycleEntry[];
  definitions: { term: string; meaning: string }[];
};

export type OverviewCell = {
  facilities: number;
  quality: number;
  conditional: number;
  deferred: number;
  notEligible: number;
  inProgress: number;
  certified: number;
  certifiedPct: number | null;
  ids: string[];
  certifiedIds: string[];
};

export type OverviewRow = { label: string; cycles: Record<number, OverviewCell> };

export type OverviewDetails = { rows: OverviewRow[]; totals: OverviewRow };

export type OverviewCycleCard = {
  cycleNumber: number;
  label: string;
  cycleType: string;
  status: "current" | "closed";
  facilities: number;
  hold: number;
  holdPct: number | null;
  holdText: string;
  segments: { key: OutcomeKey; label: string; count: number; ids: string[] }[];
  ids: string[];
};

export type RenewalEntry = {
  row: CycleReportRow;
  facilityId: string;
  facility: string;
  type: string;
  block: string;
  certRow: CycleReportRow | null;
  daysLeft: number | null;
  bucket: RenewalBucketKey | null;
  step: RenewalStepKey;
  stepSourceMissing: boolean;
  coolingEnd: string | null;
  nextAction: string;
};

export type RenewalsView = {
  scope: RenewalEntry[];
  buckets: { key: RenewalBucketKey; label: string; count: number; ids: string[] }[];
  steps: {
    key: RenewalStepKey;
    label: string;
    tip: string;
    count: number;
    ids: string[];
    notRecorded: number;
  }[];
  chart: RenewalChartColumn[];
  certifiedNoValidity: { count: number; ids: string[] };
};

export type RenewalChartColumn = {
  key: string;
  label: string;
  subLabel: string;
  bucket: RenewalBucketKey | null;
  quarterKey: string | null;
  urgency: "expired" | "soon" | "later";
  total: number;
  byType: Record<string, number>;
  segments: { label: string; value: number }[];
  ids: string[];
};

export type ComparisonEntry = {
  facilityId: string;
  facility: string;
  type: string;
  block: string;
  fromCycle: number;
  toCycle: number;
  fromResult: string;
  toResult: string;
  fromCertifiedOn: string | null;
  fromValidTill: string | null;
  toCertifiedOn: string | null;
  fromScore: number | null;
  toScore: number | null;
  /** null unless BOTH scores exist (a blank is never 0). */
  delta: number | null;
  conditionalityResolved: boolean;
  timing: {
    kind: "onTime" | "late" | "notRecertified" | "inProgress";
    days: number | null;
    text: string;
  };
};

export type ComparisonSummary = {
  available: boolean;
  twoCycleFacilities: number;
  improved: number;
  unchanged: number;
  declined: number;
  conditionalityResolved: number;
  recertifiedOnTime: number;
  recertifiedLate: number;
  medianDaysBetweenCerts: number | null;
  rows: ComparisonEntry[];
  dumbbell: ComparisonEntry[];
  axis: { min: number; max: number } | null;
};

export type FacilityCycleEntry = {
  row: CycleReportRow;
  cycleLabel: string;
  hold: boolean;
  startedOn: string | null;
  resultLabel: string;
  score: number | null;
  daysLeft: number | null;
  step: RenewalStepKey;
  stepSourceMissing: boolean;
  nextAction: string;
};

/* -------------------------------------------------------------------------- */
/* The builder                                                                */
/* -------------------------------------------------------------------------- */

export function buildCycleReport(
  rowsIn: readonly CycleReportRow[],
  opts: {
    today?: string;
    settings?: CycleReportSettings;
    /** Cycles that exist but have no facility-cycles yet — they still get a
     *  label in `cycles` (the Overview hides their card). */
    knownCycles?: { cycleNumber: number; cycleType: string }[];
  } = {},
): CycleReportResult {
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const settings = opts.settings ?? {};

  /* Part 0.1 — normalise ONCE: a stored 0 score is a blank, never a result. */
  const rows: CycleReportRow[] = rowsIn.map((r) => {
    const s = effectiveScore(r.certScore);
    return s === r.certScore ? r : { ...r, certScore: s };
  });

  const distinctFacilities = new Set(rows.map((r) => r.facilityId)).size;
  const cycleNumbers = [
    ...new Set([
      ...(opts.knownCycles ?? []).map((c) => c.cycleNumber),
      ...rows.map((r) => r.cycleNumber),
    ]),
  ].sort((a, b) => a - b);

  const facilitiesInCycle = (n: number) => rows.filter((r) => r.cycleNumber === n);
  const populated = cycleNumbers.filter((n) => facilitiesInCycle(n).length > 0);
  const currentCycle = populated.length ? populated[populated.length - 1] : null;
  const cycleTypeOf = (n: number) =>
    opts.knownCycles?.find((c) => c.cycleNumber === n)?.cycleType ??
    facilitiesInCycle(n).find((r) => r.cycleType)?.cycleType ??
    (n > 1 ? "Recertification" : "Initial");

  const cycles = cycleNumbers.map((n) => ({
    cycleNumber: n,
    cycleType: cycleTypeOf(n),
    label: cycleLabel(n, cycleTypeOf(n)),
    facilities: facilitiesInCycle(n).length,
    current: n === currentCycle,
  }));

  /* One map per facility, oldest cycle first. */
  const byFacility = new Map<string, CycleReportRow[]>();
  for (const r of rows) {
    const list = byFacility.get(r.facilityId) ?? [];
    list.push(r);
    byFacility.set(r.facilityId, list);
  }
  for (const list of byFacility.values()) list.sort((a, b) => a.cycleNumber - b.cycleNumber);
  const latestRow = (id: string): CycleReportRow => {
    const list = byFacility.get(id) ?? [];
    // Highest non-superseded cycle, not merely the last one.
    return [...list].reverse().find((r) => !r.superseded) ?? list[list.length - 1];
  };
  /** The certificate that matters today: the highest cycle that holds one
   *  (Part 0.3 — a replaced Cycle #1 certificate is never counted). */
  const certRowOf = (id: string): CycleReportRow | null => {
    const list = (byFacility.get(id) ?? []).filter((r) => holdsCertificate(r.certStatus));
    return list.length ? list[list.length - 1] : null;
  };
  const stepFor = (latest: CycleReportRow): { step: RenewalStepKey; sourceMissing: boolean } => {
    if (latest.cycleNumber <= 1) return { step: "notStarted", sourceMissing: false };
    if (holdsCertificate(latest.certStatus)) return { step: "done", sourceMissing: false };
    if (isDeferred(latest.certStatus)) return { step: "deferred", sourceMissing: false };
    if (
      norm(latest.naStatus) === "completed" ||
      isResultDeclaredStatus(latest.certStatus) ||
      norm(latest.certStatus).includes("result")
    )
      return { step: "resultAwaited", sourceMissing: false };
    if (toIso(latest.naScheduledDate) || norm(latest.naStatus) === "scheduled")
      return { step: "scheduled", sourceMissing: false };
    // A newer cycle exists with no recorded source at all → the re-application
    // is inferred from the cycle row alone (surfaced as "Not recorded").
    const sourceMissing =
      !latest.saStatus && !latest.naStatus && !latest.certStatus && !latest.naScheduledDate;
    return { step: "reapplication", sourceMissing };
  };

  /* ---------------- Overview: one card per populated cycle ---------------- */
  const overviewCards: OverviewCycleCard[] = populated.map((n) => {
    const inCycle = facilitiesInCycle(n);
    const ids = inCycle.map((r) => r.facilityId);
    const hold = inCycle.filter((r) => holdsCertificate(r.certStatus)).length;
    const holdPct = percentOf(hold, inCycle.length);
    const segments = OUTCOME_SEGMENTS.map((s) => ({
      key: s.key,
      label: s.label,
      count: inCycle.filter((r) => outcomeOf(r) === s.key).length,
      ids: inCycle.filter((r) => outcomeOf(r) === s.key).map((r) => r.facilityId),
    }));
    return {
      cycleNumber: n,
      label: cycleLabel(n, cycleTypeOf(n)),
      cycleType: cycleTypeOf(n),
      status: n === currentCycle ? "current" : "closed",
      facilities: inCycle.length,
      hold,
      holdPct,
      // Part 0.10 — under 5 facilities: "1 of 2", never a percentage.
      holdText:
        inCycle.length > 0 && inCycle.length < 5
          ? `${hold} of ${inCycle.length} hold a certificate`
          : `${hold} of ${inCycle.length} hold a certificate (${formatPercent(holdPct)})`,
      segments,
      ids,
    };
  });

  /* -------- Overview: one details table per dimension (type / block) ------ */
  const cellOf = (sub: CycleReportRow[]): OverviewCell => {
    const quality = sub.filter((r) => isQuality(r.certStatus)).length;
    const conditional = sub.filter((r) => isConditional(r.certStatus)).length;
    const deferred = sub.filter((r) => isDeferred(r.certStatus)).length;
    const notEligible = sub.filter((r) => outcomeOf(r) === "notEligible").length;
    return {
      facilities: sub.length,
      quality,
      conditional,
      deferred,
      notEligible,
      inProgress: Math.max(0, sub.length - quality - conditional - deferred - notEligible),
      certified: quality + conditional,
      certifiedPct: percentOf(quality + conditional, sub.length),
      ids: sub.map((r) => r.facilityId),
      certifiedIds: sub
        .filter((r) => holdsCertificate(r.certStatus))
        .map((r) => r.facilityId),
    };
  };
  const detailsFor = (pick: (r: CycleReportRow) => string): OverviewDetails => {
    const labels = [...new Set(rows.map(pick))].sort((a, b) => a.localeCompare(b, "en-IN"));
    const detailRows: OverviewRow[] = labels.map((label) => ({
      label,
      cycles: Object.fromEntries(
        populated.map((n) => [n, cellOf(rows.filter((r) => r.cycleNumber === n && pick(r) === label))]),
      ),
    }));
    const totals: OverviewRow = {
      label: "All",
      cycles: Object.fromEntries(populated.map((n) => [n, cellOf(facilitiesInCycle(n))])),
    };
    return { rows: detailRows, totals };
  };
  const details = { type: detailsFor((r) => r.type), block: detailsFor((r) => r.block) };

  /* ---------------- Renewals: one row per facility ----------------------- */
  const scope: RenewalEntry[] = [];
  const certifiedNoValidityIds: string[] = [];
  for (const id of byFacility.keys()) {
    const latest = latestRow(id);
    const certRow = certRowOf(id);
    const { step, sourceMissing } = stepFor(latest);
    const coolingEnd = isDeferred(latest.certStatus) ? coolingEndIso(latest, settings) : null;

    /* Part 0.3 — only the LATEST cycle's certificate counts. A Cycle #1
       certificate replaced by a running Cycle #2 is never "expired". */
    const certIsCurrent =
      !!certRow && !certRow.superseded && certRow.cycleId === latest.cycleId;

    // Part 0.6 — certified with NO validity date is a data gap, not a bucket:
    // it goes to Needs attention, never into the expired/validity numbers.
    if (certIsCurrent && !toIso(certRow?.validityDate)) {
      certifiedNoValidityIds.push(id);
    }
    // Scope: a current certificate, OR any facility whose newer cycle is
    // running (in progress / deferred).
    const inScope = certIsCurrent || latest.cycleNumber > 1;
    if (!inScope) continue;

    const daysLeft = certIsCurrent
      ? daysBetweenIso(today, toIso(certRow?.validityDate))
      : null;
    const bucket = daysLeft == null ? null : bucketOfDays(daysLeft);
    scope.push({
      row: latest,
      facilityId: id,
      facility: latest.facility,
      type: latest.type,
      block: latest.block,
      certRow,
      daysLeft,
      bucket,
      step,
      stepSourceMissing: sourceMissing,
      coolingEnd,
      nextAction: "", // filled below, once every entry exists
    });
  }

  /** Next action — computed, never blank, never a raw sentence from storage. */
  const actionFor = (e: RenewalEntry): string => {
    if (e.step === "deferred")
      return e.coolingEnd
        ? `Cooling period ends ${dmy(e.coolingEnd)}`
        : "Cooling period ends — not recorded";
    if (e.step === "resultAwaited") return "Result due";
    if (e.step === "scheduled") return "Assessment scheduled";
    if (e.step === "reapplication") return "Book the assessment";
    if (e.step === "done") {
      const a = e.certRow
        ? surveillanceNextAction(nqasView(e.certRow), settings as never, today)
        : null;
      if (a) return a;
      if (e.daysLeft != null && e.daysLeft < 0)
        return "Certificate expired — start re-application";
      return "No action due";
    }
    // not started
    if (e.daysLeft != null && e.daysLeft <= 365) return "Start re-application";
    const a = e.certRow
      ? surveillanceNextAction(nqasView(e.certRow), settings as never, today)
      : null;
    if (a) return a;
    if (e.certRow && toIso(e.certRow.validityDate))
      return `Recertify before ${dmy(toIso(e.certRow.validityDate))}`;
    return "No action due";
  };
  for (const e of scope) e.nextAction = actionFor(e);

  scope.sort((a, b) => {
    const da = a.daysLeft ?? Number.POSITIVE_INFINITY;
    const db = b.daysLeft ?? Number.POSITIVE_INFINITY;
    return da - db || a.facility.localeCompare(b.facility, "en-IN");
  });

  const bucketChips = RENEWAL_BUCKETS.map((b) => {
    const hit = scope.filter((e) => e.bucket === b.key);
    return {
      key: b.key,
      label: b.label,
      count: hit.length,
      ids: hit.map((e) => e.facilityId),
    };
  });
  const stepChips = RENEWAL_STEPS.map((s) => {
    const hit = scope.filter((e) => e.step === s.key);
    return {
      key: s.key,
      label: s.label,
      tip: s.tip,
      count: hit.length,
      ids: hit.map((e) => e.facilityId),
      notRecorded: hit.filter((e) => e.stepSourceMissing).length,
    };
  });

  /* Chart: “Already expired” + the next 8 quarters, two-line horizontal
     labels, urgency colour (the view splits by type only when toggled). */
  const typeNames = [...new Set(rows.map((r) => r.type))].sort((a, b) => a.localeCompare(b));
  const chart: RenewalChartColumn[] = [];
  {
    const qKeys: ReturnType<typeof fyQuarterOf>[] = [];
    let q = fyQuarterOf(today);
    for (let i = 0; i < 8; i++) {
      qKeys.push(q);
      const m = Number(q.start.slice(5, 7));
      const y = Number(q.start.slice(0, 4));
      const nextMonth = m === 1 ? 4 : m === 4 ? 7 : m === 7 ? 10 : 1;
      const nextYear = m === 10 ? y + 1 : y;
      q = fyQuarterOf(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01`);
    }
    const monthShort = (iso: string) =>
      ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
        Number(iso.slice(5, 7)) - 1
      ];
    const make = (
      key: string,
      label: string,
      subLabel: string,
      bucket: RenewalBucketKey | null,
      quarterKey: string | null,
      urgency: RenewalChartColumn["urgency"],
      hit: RenewalEntry[],
    ): RenewalChartColumn => ({
      key,
      label,
      subLabel,
      bucket,
      quarterKey,
      urgency,
      total: hit.length,
      byType: Object.fromEntries(typeNames.map((t) => [t, hit.filter((e) => e.type === t).length])),
      segments: [{ label: "Facilities", value: hit.length }],
      ids: hit.map((e) => e.facilityId),
    });
    chart.push(
      make("expired", "Already expired", "", "expired", null, "expired",
        scope.filter((e) => e.bucket === "expired")),
    );
    for (const k of qKeys) {
      const hit = scope.filter((e) => {
        if (!e.certRow) return false;
        const iso = toIso(e.certRow.validityDate);
        return !!iso && iso >= k.start && iso <= k.end;
      });
      const urgency: RenewalChartColumn["urgency"] =
        daysBetweenIso(today, k.start) !== null &&
        (daysBetweenIso(today, k.end) ?? 0) <= 90
          ? "soon"
          : "later";
      chart.push(
        make(
          k.key,
          `${monthShort(k.start)}–${monthShort(k.end)} ${k.end.slice(0, 4)}`,
          k.shortLabel,
          null,
          k.key,
          urgency,
          hit,
        ),
      );
    }
  }

  const renewals: RenewalsView = {
    scope,
    buckets: bucketChips,
    steps: stepChips,
    chart,
    certifiedNoValidity: {
      count: certifiedNoValidityIds.length,
      ids: certifiedNoValidityIds,
    },
  };

  /* ---------------- Headline + “Needs action” cards ---------------------- */
  const certifiedScope = scope.filter((e) => e.daysLeft != null);
  const dueSoonOrExpired = scope.filter(
    (e) => e.bucket === "expired" || e.bucket === "d90" || e.bucket === "d180" || e.bucket === "d365",
  );
  // A re-application that has been received and is moving — a Deferred result
  // is reported by its own card instead.
  const received = scope.filter(
    (e) => e.step !== "notStarted" && e.step !== "deferred",
  );
  const parts: string[] = [];
  if (dueSoonOrExpired.length > 0)
    parts.push(
      dueSoonOrExpired.length === 1
        ? "1 certificate expires within 12 months or has already expired"
        : `${dueSoonOrExpired.length} certificates expire within 12 months or have already expired`,
    );
  if (received.length > 0)
    parts.push(
      `${received.length} re-application${received.length === 1 ? " has" : "s have"} been received`,
    );
  // Guarded template: no sentence without a denominator or without winners.
  const headline = certifiedScope.length === 0 || parts.length === 0 ? null : `${parts.join("; ")}.`;

  const needsAction: CycleReportResult["needsAction"] = [];
  {
    const expiredNoReapp = scope.filter(
      (e) => e.bucket === "expired" && e.step === "notStarted",
    );
    if (expiredNoReapp.length > 0)
      needsAction.push({
        key: "expiredNoReapp",
        label: "Expired, no re-application",
        count: expiredNoReapp.length,
        ids: expiredNoReapp.map((e) => e.facilityId),
        filters: { buckets: ["expired"], step: "notStarted" },
      });
    const dueNotStarted = scope.filter(
      (e) =>
        (e.bucket === "d90" || e.bucket === "d180" || e.bucket === "d365") &&
        e.step === "notStarted",
    );
    if (dueNotStarted.length > 0)
      needsAction.push({
        key: "dueNotStarted",
        label: "Due within 12 months, not started",
        count: dueNotStarted.length,
        ids: dueNotStarted.map((e) => e.facilityId),
        filters: { buckets: ["d90", "d180", "d365"], step: "notStarted" },
      });
    const deferred = scope.filter((e) => e.step === "deferred");
    if (deferred.length > 0)
      needsAction.push({
        key: "deferredCooling",
        label: "Cycle #2 deferred (cooling period ending soon)",
        count: deferred.length,
        ids: deferred.map((e) => e.facilityId),
        filters: { buckets: [], step: "deferred" },
      });
  }

  /* ---------------- Reconciliation (Part 0.4) ---------------------------- */
  const primaryCycle = populated.length
    ? populated.reduce((best, n) =>
        facilitiesInCycle(n).length > facilitiesInCycle(best).length ? n : best,
      )
    : null;
  const cycleHold =
    primaryCycle == null
      ? 0
      : facilitiesInCycle(primaryCycle).filter((r) => holdsCertificate(r.certStatus)).length;
  const latestHoldIds = new Set(
    [...byFacility.keys()].filter((id) => holdsCertificate(latestRow(id).certStatus)),
  );
  const overlap = [...byFacility.keys()].filter((id) =>
    (byFacility.get(id) ?? []).filter((r) => holdsCertificate(r.certStatus)).length > 1,
  ).length;
  const reconciliation: CycleReportResult["reconciliation"] = {
    cycleHold,
    cycleLabel: primaryCycle == null ? "" : cycleLabel(primaryCycle, cycleTypeOf(primaryCycle)),
    distinctHold: latestHoldIds.size,
    overlap,
    text:
      primaryCycle == null || cycleHold === latestHoldIds.size
        ? null
        : `${cycleHold} facility-cycles hold a certificate in ` +
          `${cycleLabel(primaryCycle, cycleTypeOf(primaryCycle))}; ${latestHoldIds.size} ` +
          `distinct facilities hold one today — each facility is counted once, by its ` +
          `latest cycle${overlap > 0 ? `; ${overlap} hold one in more than one cycle` : ""}.`,
  };

  /* ---------------- Compare: facilities with 2+ cycles ------------------- */
  const comparisonRows: ComparisonEntry[] = [];
  let medianPool: number[] = [];
  for (const [id, list] of byFacility) {
    if (list.length < 2) continue;
    const from = list[list.length - 2];
    const to = list[list.length - 1];
    const fromScore = effectiveScore(from.certScore);
    const toScore = effectiveScore(to.certScore);
    const delta =
      fromScore == null || toScore == null
        ? null
        : Math.abs(toScore - fromScore) < NO_CHANGE_BAND
          ? 0
          : toScore - fromScore;

    /* Part 0.2 — the timing uses RESULTS, not scores. */
    let timing: ComparisonEntry["timing"];
    if (isDeferred(to.certStatus)) {
      const cool = coolingEndIso(to, settings);
      timing = {
        kind: "notRecertified",
        days: null,
        text: cool
          ? `Not recertified yet · cooling period ends ${dmy(cool)}`
          : "Not recertified yet · cooling period not recorded",
      };
    } else if (holdsCertificate(to.certStatus)) {
      const certifiedOn = toIso(to.certDate) ?? toIso(to.goiLetterDate);
      const prevEnd = toIso(from.validityDate);
      const days = daysBetweenIso(prevEnd, certifiedOn);
      if (certifiedOn && prevEnd && days != null) {
        timing =
          days <= 0
            ? { kind: "onTime", days, text: "On time" }
            : { kind: "late", days, text: `Late by ${days} days` };
      } else {
        timing = { kind: "onTime", days: null, text: "Recertified — dates not recorded" };
      }
      const prevCert = toIso(from.certDate) ?? toIso(from.goiLetterDate);
      if (certifiedOn && prevCert) {
        const d = daysBetweenIso(prevCert, certifiedOn);
        if (d != null) medianPool.push(d);
      }
    } else {
      timing = { kind: "inProgress", days: null, text: "In progress" };
    }

    comparisonRows.push({
      facilityId: id,
      facility: to.facility,
      type: to.type,
      block: to.block,
      fromCycle: from.cycleNumber,
      toCycle: to.cycleNumber,
      fromResult: resultLabel(from.certStatus),
      toResult: resultLabel(to.certStatus),
      fromCertifiedOn: toIso(from.certDate) ?? toIso(from.goiLetterDate),
      fromValidTill: toIso(from.validityDate),
      toCertifiedOn: toIso(to.certDate) ?? toIso(to.goiLetterDate),
      fromScore,
      toScore,
      delta,
      conditionalityResolved: isConditional(from.certStatus) && isQuality(to.certStatus),
      timing,
    });
  }
  const bothScore = comparisonRows.filter((r) => r.delta != null);
  const dumbbellRows = [...bothScore]
    .sort(
      (a, b) =>
        Math.abs((b.delta as number) ?? 0) - Math.abs((a.delta as number) ?? 0) ||
        a.facility.localeCompare(b.facility),
    )
    .slice(0, 20);
  /* Part 4.3 — the axis is fitted to the data and says so; it is rendered
     only when 5+ facilities have two cycles. */
  const dumbbellScores = bothScore
    .flatMap((r) => [r.fromScore, r.toScore])
    .filter((s): s is number => s != null);
  /* Part 4.3 — the axis is fitted to the DATA (with a visible note in the
     view); the chart itself renders only at 5+ facilities with two cycles. */
  const axis =
    comparisonRows.length >= 5 && dumbbellScores.length > 0
      ? {
          min: Math.max(0, Math.floor(Math.min(...dumbbellScores) / 5) * 5 - 5),
          max: Math.min(100, Math.ceil(Math.max(...dumbbellScores) / 5) * 5 + 5),
        }
      : null;
  const comparison: ComparisonSummary = {
    available: comparisonRows.length > 0,
    twoCycleFacilities: comparisonRows.length,
    improved: bothScore.filter((r) => (r.delta as number) > 0).length,
    unchanged: bothScore.filter((r) => (r.delta as number) === 0).length,
    declined: bothScore.filter((r) => (r.delta as number) < 0).length,
    conditionalityResolved: comparisonRows.filter((r) => r.conditionalityResolved).length,
    recertifiedOnTime: comparisonRows.filter((r) => r.timing.kind === "onTime").length,
    recertifiedLate: comparisonRows.filter((r) => r.timing.kind === "late").length,
    medianDaysBetweenCerts: median(medianPool),
    rows: comparisonRows.sort((a, b) => a.facility.localeCompare(b.facility, "en-IN")),
    dumbbell: dumbbellRows,
    axis,
  };

  /* ---------------- List: one row per facility-cycle --------------------- */
  const list: FacilityCycleEntry[] = rows.map((row) => {
    const latest = latestRow(row.facilityId);
    const { step, sourceMissing } = stepFor(latest);
    const hold = holdsCertificate(row.certStatus);
    const daysLeft = daysBetweenIso(today, toIso(row.validityDate));
    return {
      row,
      cycleLabel: cycleLabel(row.cycleNumber, row.cycleType),
      hold,
      startedOn: cycleStartIso(row),
      resultLabel: resultLabel(row.certStatus),
      score: effectiveScore(row.certScore),
      daysLeft,
      step,
      stepSourceMissing: sourceMissing,
      nextAction: listNextAction(row, step, latest, settings, today),
    };
  });
  const latestIds = new Set(
    [...byFacility.keys()].map((id) => latestRow(id).cycleId),
  );
  const latestEntries = list.filter((e) => latestIds.has(e.row.cycleId));

  return {
    today,
    distinctFacilities,
    facilityCycles: rows.length,
    cycles,
    headline,
    headlineIds: dueSoonOrExpired.map((e) => e.facilityId),
    needsAction,
    overview: { cards: overviewCards, details },
    renewals,
    comparison,
    reconciliation,
    list,
    latest: latestEntries,
    definitions: CYCLE_REPORT_DEFINITIONS,
  };
}

/**
 * Next action for ONE facility-cycle row (the List view): computed, never
 * blank, never a stored sentence or a raw key. The Renewals view overrides
 * this with its own renewal-aware action.
 */
function listNextAction(
  row: CycleReportRow,
  step: RenewalStepKey,
  latest: CycleReportRow,
  settings: CycleReportSettings,
  today: string,
): string {
  if (isDeferred(row.certStatus)) {
    const cool = coolingEndIso(row, settings);
    return cool ? `Cooling period ends ${dmy(cool)}` : "Cooling period ends — not recorded";
  }
  if (holdsCertificate(row.certStatus)) {
    const a = surveillanceNextAction(nqasView(row), settings as never, today);
    if (a) return a;
    const d = daysBetweenIso(today, toIso(row.validityDate));
    if (d != null && d < 0) return "Certificate expired — start re-application";
    return "No action due";
  }
  if (isResultDeclaredStatus(row.certStatus) || norm(row.generalDocStatus) === "result declared")
    return "Record the certification result";
  if (norm(row.naStatus) === "completed") return "Record the NQAS result";
  if (toIso(row.naScheduledDate)) return "NQAS assessment scheduled";
  if (row === latest && step === "reapplication") return "Book the assessment";
  if (norm(row.saStatus) === "result awaited") return "Record the State Assessment result";
  if (norm(row.saStatus) === "completed") return "Schedule the NQAS assessment";
  if (row.saStatus) return "Complete the State Assessment";
  return "Start the certification cycle";
}
