/** Data model + aggregation for the "Generate PPT" yearly summary deck.
 *  Mirrors the uploaded reference deck: title slide with hero count, a
 *  status-overview slide, certifications by year (stacked), a year × month
 *  heatmap, early-years cards, month-by-month slides for the last two years
 *  and key takeaways. Pure functions — shared by the on-screen preview, the
 *  PPTX renderer and the PDF renderer. */

import {
  DEFAULT_SETTINGS,
  deriveFlatLifecycle,
  hasIaScores,
  pipelineStageOf,
  PIPELINE_STAGES,
  type FlatLifecycleView,
} from "@/convex/lifecycle";
import { todayLocalIso, deriveFireNocStatus } from "@/lib/today";
import { FACILITY_CURRENT_STATUS_LABEL } from "@/lib/masterColumns";
import {
  currentFiscalYear,
  fiscalYearLabel,
  fiscalYearOf,
} from "@/lib/fiscalYear";
import { buildingGroupSummary } from "@/lib/buildingGroups";;

export type DeckRow = {
  facility: string;
  type: string;
  block: string;
  phc: string;
  /** NQAS eligibility — feeds the shared pipeline-stage rule, so the deck's
   *  buckets match the dashboard's stage strip exactly. */
  eligibility: string;
  currentStatus: string;
  certStatus: string | null;
  /** Raw NQAS assessment status — the shared view derives "NA Scheduled"
   *  from it plus the start date (date-primary rule). */
  naStatus: string | null;
  certDate: string | null; // ISO yyyy-mm-dd
  certScore: number | null;
  naScheduledDate: string | null;
  saStatus: string | null;
  generalDocStatus: string | null;
  naMode: string | null;
  // Extended fields powering the profile / progress / barrier / buildings /
  // follow-up slides.
  saScore: number | null;
  buildingStatus: string | null;
  buildingType: string | null;
  fireNocStatus: string | null;
  fireNocExpiry: string | null;
  /** Stored Fire NOC "Available" flag — "No" ⇒ Not Obtained even with a
   *  validity date on file (the shared date-primary rule reads it). */
  nocAvailable?: string | null;
  nqasIaQ1: number | null;
  nqasIaQ2: number | null;
  kayakalpIaQ1: number | null;
  kayakalpIaQ2: number | null;
  surveillanceDue1: string | null;
  surveillanceDone1: string | null;
  surveillanceDue2: string | null;
  surveillanceDone2: string | null;
  validityDate: string | null;
  gapClosureAmount: number | null;
  gcFundYear: string | null;
};

/** Shared bar tones for the profile / barrier / buildings slides. */
export type DeckTone = "teal" | "coral" | "amber" | "gray" | "light";
export const TONE_HEX: Record<DeckTone, string> = {
  teal: "#12777A",
  coral: "#D9634A",
  amber: "#E8A33D",
  gray: "#AEC6C2",
  light: "#CBD9D6",
};

export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export type DeckStatusSlice = { label: string; count: number };
export type DeckYearRow = {
  year: number;
  total: number;
  quality: number;
  cond: number;
  avgPct: number | null;
};
export type DeckEarlyYear = {
  year: number;
  count: number;
  monthsLabel: string;
  detail: string;
};
export type DeckYearDetail = {
  year: number;
  months: DeckMonthRow[]; // only months with data
  total: number;
  cond: number;
  avgPct: number | null;
  virtualCount: number;
  physicalCount: number;
  /** e.g. "HWC HSC 12 · PHC 4" — facility-type mix of that year's certifications */
  typeMix: string;
  headline: string;
};
export type DeckMonthRow = {
  month: number; // 1-12
  label: string;
  quality: number;
  cond: number;
  total: number;
  avgPct: number | null;
};

export type DeckData = {
  totalFacilities: number;
  certifiedTotal: number;
  qualityCount: number;
  condCount: number;
  certifiedPct: number;
  blocksCount: number;
  recentSpanLabel: string; // e.g. "2025–26"
  recentCount: number;
  recentSharePct: number;
  statusSlices: DeckStatusSlice[];
  byYear: DeckYearRow[]; // includes in-progress current year (labelled *)
  /** certifications with a result but no certification date — can't be placed in any year */
  undated: number;
  /** the undated cohort split by result — the "No date" row in the by-year
   *  chart/table must sum with the dated years to the hold-a-certificate count. */
  undatedQuality: number;
  undatedCond: number;
  currentYear: number;
  yearMonth: { year: number; yearLabel: string; months: number[]; total: number }[];
  grandTotalDated: number;
  busiestPair: { months: string; count: number; sharePct: number } | null;
  earlyYears: DeckEarlyYear[];
  earlyNote: string;
  yearDetails: DeckYearDetail[]; // last two years, ascending
  takeaways: { n: number; title: string; body: string }[];
  footNote: string;
  heatmapNote: string;
  // ---- profile slide ----
  byTypeBars: { label: string; count: number }[];
  byBlockBars: { label: string; count: number }[];
  topTypeName: string | null;
  topTypeCount: number;
  topTypeNameLong: string | null;
  topBlocksLabel: string;
  profileNote: string;
  // ---- certification progress slide ----
  blockProgress: {
    block: string; total: number; certified: number; notYet: number; rate: number;
  }[]; // sorted ascending by rate
  typeProgress: {
    type: string; facilities: number; certified: number; rate: number;
  }[];
  progressNote: string;
  // ---- barriers slide ----
  notCertifiedCount: number;
  barrierBars: { label: string; count: number; tone: DeckTone }[];
  barrierNotes: string[];
  barrierFoot: string;
  // ---- IA scores slide ----
  scoreBands: { label: string; nqas: number; kayakalp: number }[];
  iaQ1Avg: number | null;
  iaQ2Avg: number | null;
  kkQ1Avg: number | null;
  kkQ2Avg: number | null;
  iaImproved: number;
  iaUnchanged: number;
  iaDeclined: number;
  kkImproved: number;
  kkUnchanged: number;
  kkDeclined: number;
  certifiedIaAvg: number | null;
  restIaAvg: number | null;
  certifiedKkAvg: number | null;
  restKkAvg: number | null;
  iaNote: string;
  // ---- assessment pipeline slide ----
  saCompleted: number;
  saCompletedAwaiting: number;
  saScheduled: number;
  saNotInitiated: number;
  saNoEntry: number;
  saAvgScore: number | null;
  saScoreRange: [number, number] | null;
  funnelSubtitle: string;
  saFoot: string;
  // ---- buildings & fire safety slide ----
  buildingBars: { label: string; count: number; tone: DeckTone }[];
  buildingNotRecorded: number;
  buildingUpdatedNote: string;
  nocRecorded: number;
  nocValid: number;
  nocExpired: number;
  nocExpiringSoon: number;
  /** A NOC entry exists but carries no validity date, so it can be neither
   *  valid, expiring nor expired. Always shown as its own bucket so the
   *  donut sums to the facility count (157) instead of the recorded count. */
  nocRecordedNoValidity: number;
  nocNotObtained: number;
  nocExpiredBreakdown: string;
  nocOwnership: string;
  fireFoot: string;
  // ---- validity / surveillance / funds slide ----
  followUpNote: string;
  certValid: number;
  certExpired: number;
  certNoStatus: number;
  certExpiring12m: number;
  survOverdue: number;
  survOverdue2: number;
  survNoneDone: number;
  survDoneAny: number;
  fundsFacilities: number;
  fundsFunded: number;
  fundsPending: number;
  fundsTotalLakh: number | null;
  fundsReceivedRecent: string | null;
  fundsCertified: number;

  // ---- Part 0/1 upgrades ----
  /** "Hold a certificate" = 72 (valid + expired); "In Certified stage" = the
   *  shared Certified pipeline stage. The difference (facilities holding an
   *  expired certificate whose status is now Recertification Due) is named
   *  per facility so every page can show the same one-line reconciliation. */
  holdCertificate: number;
  holdExpired: number;
  holdExpiredNames: { facility: string; stage: string }[];
  reconciliationLine: string;
  /** Certifications counted by FISCAL year (Apr–Mar), not calendar year. */
  byFy: DeckYearRow[];
  currentFyLabel: string; // "2026-27"
  previousFyLabel: string; // "2025-26"
  certifiedInCurrentFy: number;
  certifiedInPreviousFy: number;
  /** Date-primary Fire NOC buckets on ALL rows (incl. "Not recorded"). */
  nocNotRecorded: number;
  fireNocRecordedSentence: string;
  /** "No score recorded before YYYY" derived from data (2024 has scores). */
  noScoreBeforeYear: number;
  /** Documented priority order for the barrier reasons. */
  barrierPriorityNote: string;
  /** Definitions/method slide content, generated from the same rules. */
  definitions: { term: string; definition: string }[];
  /** Buildings use the shared Part-0 mapping (one M&R bucket etc.). */
  buildingReconciles: boolean;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return round1(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function monthsLabelOf(dates: string[]): string {
  const ms = [...new Set(dates.map((d) => Number(d.slice(5, 7))))].sort((a, b) => a - b);
  if (ms.length === 0) return "Month not recorded";
  // Compress consecutive runs into ranges like "Mar - May · Jul · Oct - Dec"
  const parts: string[] = [];
  let start = ms[0];
  let prev = ms[0];
  for (let i = 1; i <= ms.length; i++) {
    const cur = ms[i];
    if (cur === prev + 1) { prev = cur; continue; }
    parts.push(start === prev ? MONTHS[start - 1] : `${MONTHS[start - 1]} - ${MONTHS[prev - 1]}`);
    start = cur; prev = cur;
  }
  return parts.join(" · ");
}

function monthsShortList(dates: string[]): string {
  const ms = [...new Set(dates.map((d) => MONTHS[Number(d.slice(5, 7)) - 1]))];
  return ms.join(", ");
}

/** The shared lifecycle view for a deck row — computed once per row (see
 *  `viewOf` in buildDeckData) and reused by every slide. */
function deckView(r: DeckRow, today: string): FlatLifecycleView {
  return deriveFlatLifecycle(
    {
      currentStatus: r.currentStatus,
      certStatus: r.certStatus,
      // naStatus matters: an explicit "Scheduled" with no date must still
      // count, exactly as the dashboard's shared view counts it.
      naStatus: r.naStatus,
      naStartDate: r.naScheduledDate,
      docStatus: r.generalDocStatus,
      // Internal Assessment bucket — same IA rule the dashboard reads off
      // the facility row, so the deck and the strip never disagree.
      iaDone: hasIaScores(r),
    },
    today,
  );
}

// Exported helpers now read the shared view (certified + conditionality with
// the same legacy fallbacks the dashboard uses) instead of the raw column.
export function isQuality(r: DeckRow) {
  return deckView(r, todayLocalIso()).isQualityCertified;
}
export function isCond(r: DeckRow) {
  return deckView(r, todayLocalIso()).isConditional;
}
export function isCertifiedRow(r: DeckRow) {
  const v = deckView(r, todayLocalIso());
  return v.isQualityCertified || v.isConditional;
}

/** Certified cohort test against an already-computed view (no re-derivation). */
const isCertifiedView = (v: FlatLifecycleView) =>
  v.isQualityCertified || v.isConditional;

/** Date-primary Fire NOC status for a deck row — the SAME rule the Master
 *  List reads (deriveFireNocStatus in lib/today). The raw stored status can
 *  disagree with the validity date (that mismatch is why the deck showed 0
 *  "expiring soon"); the date-derived status is the one definition. */
function nocStatusOfRow(r: DeckRow, today: string): string {
  const hasStatus = (r.fireNocStatus ?? "").trim() !== "";
  if (!hasStatus && !r.fireNocExpiry) return "Not recorded";
  // Recorded but undated: keep it visible as its own bucket instead of
  // folding it into "Valid" (which made the four old buckets total 154 for
  // 157 facilities) or into "Not recorded" (which understated 45 recorded).
  if (!r.fireNocExpiry) return "Recorded, no validity date";
  const left = Math.round(
    (Date.parse(r.fireNocExpiry + "T12:00:00") - Date.parse(today + "T12:00:00")) /
      86_400_000,
  );
  if (left < 0) return "Expired";
  if (left <= DEFAULT_SETTINGS.fireNocAlertLeadDays) return "Expiring Soon";
  return "Valid";
}

export function buildDeckData(rows: DeckRow[]): DeckData {
  // Local calendar date (not UTC) so the date-primary schedule rule matches
  // the dashboard's server-side comparison near midnight.
  const today = todayLocalIso();
  const totalFacilities = rows.length;
  const blocksCount = new Set(rows.map((r) => r.block)).size;

  // ---- one shared lifecycle view per row ----
  // Everything below (cohorts, stage buckets, progress, barriers) reads these
  // views, so no slide can disagree with the dashboard about what
  // "certified" / "result awaited" / "NA scheduled" means.
  const views = new Map<DeckRow, FlatLifecycleView>();
  const flags = (r: DeckRow): FlatLifecycleView => {
    let v = views.get(r);
    if (!v) {
      v = deckView(r, today);
      views.set(r, v);
    }
    return v;
  };
  const stageOf = (r: DeckRow) => pipelineStageOf(flags(r), r.eligibility);
  const isCertified = (r: DeckRow) => isCertifiedView(flags(r));
  const stageCount = (stage: (typeof PIPELINE_STAGES)[number]["key"]) =>
    rows.filter((r) => stageOf(r) === stage).length;

  const certified = rows.filter(isCertified);
  const qualityCount = rows.filter((r) => flags(r).isQualityCertified).length;
  const condCount = rows.filter((r) => flags(r).isConditional).length;
  const certifiedTotal = certified.length;
  const certifiedPct = totalFacilities > 0 ? Math.round((certifiedTotal / totalFacilities) * 100) : 0;

  // ---- status buckets (slide 2) ----
  // The SAME mutually-exclusive pipeline stages the dashboard strip shows,
  // in the same order and with the same wording — the slices always sum to
  // the facility count and never disagree with the dashboard KPI cards.
  const slices: DeckStatusSlice[] = PIPELINE_STAGES.map((s) => ({
    label: s.label,
    count: stageCount(s.key),
  })).filter((s) => s.count > 0);

  // ---- certifications by year ----
  const dated = certified.filter((r) => r.certDate);
  const yearSet = new Set(dated.map((r) => Number(r.certDate!.slice(0, 4))));
  const undated = certifiedTotal - dated.length;
  const undatedRows = certified.filter((r) => !r.certDate);
  const undatedQuality = undatedRows.filter((r) => flags(r).isQualityCertified).length;
  const undatedCond = undatedRows.filter((r) => flags(r).isConditional).length;
  const currentYear = new Date().getFullYear();
  const minYear = yearSet.size ? Math.min(...yearSet) : currentYear;
  const maxYear = Math.max(currentYear, ...(yearSet.size ? [...yearSet] : [currentYear]));
  const byYear: DeckYearRow[] = [];
  for (let y = minYear; y <= maxYear; y++) {
    const list = dated.filter((r) => Number(r.certDate!.slice(0, 4)) === y);
    byYear.push({
      year: y,
      total: list.length,
      quality: list.filter(isQuality).length,
      cond: list.filter(isCond).length,
      avgPct: mean(list.map((r) => r.certScore).filter((s): s is number => s != null)),
    });
  }
  const recentStart = maxYear - 1;
  const recent = dated.filter((r) => Number(r.certDate!.slice(0, 4)) >= recentStart);
  // Count only dated recent certifications — undated ones cannot be placed
  // in any year and are disclosed separately via `undated`.
  const recentSharePct = certifiedTotal > 0 ? Math.round((recent.length / certifiedTotal) * 100) : 0;

  // ---- year × month heatmap ----
  const yearMonth = byYear.map(({ year }) => {
    const months = Array<number>(12).fill(0);
    for (const r of dated) {
      if (Number(r.certDate!.slice(0, 4)) === year)
        months[Number(r.certDate!.slice(5, 7)) - 1] += 1;
    }
    return {
      year,
      yearLabel: year === currentYear ? `${year}*` : String(year),
      months,
      total: months.reduce((a, b) => a + b, 0),
    };
  });
  const monthTotals = Array<number>(12).fill(0);
  for (const ym of yearMonth)
    ym.months.forEach((c, i) => (monthTotals[i] += c));
  const grandTotalDated = dated.length;

  // busiest pair of months
  let busiestPair: DeckData["busiestPair"] = null;
  {
    const indexed = monthTotals.map((c, i) => ({ i, c })).sort((a, b) => b.c - a.c);
    if (indexed.length >= 2 && indexed[0].c > 0) {
      const top = indexed[0];
      const second = indexed[1];
      const count = grandTotalDated > 0
        ? Math.round(((top.c + second.c) / grandTotalDated) * 100)
        : 0;
      busiestPair = {
        months: `${MONTHS[top.i]} and ${MONTHS[second.i]}`,
        count: top.c + second.c,
        sharePct: count,
      };
    }
  }

  // ---- early years (before the last two) ----
  const earlyYears: DeckEarlyYear[] = [];
  for (const y of byYear) {
    if (y.year >= recentStart) continue;
    const list = dated.filter((r) => Number(r.certDate!.slice(0, 4)) === y.year);
    const types = [...new Set(list.map((r) => r.type))];
    earlyYears.push({
      year: y.year,
      count: y.total,
      monthsLabel: list.length ? monthsLabelOf(list.map((r) => r.certDate!)) : "Month not recorded",
      detail: list.length
        ? `${list.length} certified (${monthsShortList(list.map((r) => r.certDate!))}) — ${types.join(", ")}` +
          (y.cond > 0 ? ` · ${y.cond} with conditionality` : "") +
          (y.avgPct != null ? ` · avg ${y.avgPct}%` : "")
        : "No certification date recorded in the source data.",
    });
  }
  const earlyCount = byYear.filter((y) => y.year < recentStart).reduce((a, b) => a + b.total, 0);
  const earlyNote =
    `Only ${earlyCount} facilities were certified before ${recentStart}, mostly ` +
    `${[...new Set(dated.filter((r) => Number(r.certDate!.slice(0, 4)) < recentStart).map((r) => r.type))].join("s, ")}s.`;

  // ---- month-by-month for the last two years ----
  const yearDetails: DeckYearDetail[] = [recentStart, maxYear].map((year) => {
    const list = dated.filter((r) => Number(r.certDate!.slice(0, 4)) === year);
    const byMonth = new Map<number, DeckRow[]>();
    for (const r of list) {
      const m = Number(r.certDate!.slice(5, 7));
      byMonth.set(m, [...(byMonth.get(m) ?? []), r]);
    }
    const months: DeckMonthRow[] = [...byMonth.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([m, rs]) => ({
        month: m,
        label: MONTHS[m - 1],
        quality: rs.filter(isQuality).length,
        cond: rs.filter(isCond).length,
        total: rs.length,
        avgPct: mean(rs.map((r) => r.certScore).filter((s): s is number => s != null)),
      }));
    const cond = list.filter(isCond).length;
    const virtualCount = list.filter((r) => (r.naMode ?? "").toLowerCase().includes("virtual")).length;
    const physicalCount = list.filter((r) => (r.naMode ?? "").toLowerCase().includes("physic")).length;
    const typeTally = new Map<string, number>();
    for (const r of list) typeTally.set(r.type, (typeTally.get(r.type) ?? 0) + 1);
    const typeMix = [...typeTally.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t, c]) => `${t} ${c}`)
      .join(" · ");
    const list2 = byYear.find((y) => y.year === year);
    const isCurrent = year === currentYear;
    const busiest = [...months].sort((a, b) => b.total - a.total)[0];
    const headline = isCurrent
      ? `${list.length} certified so far` +
        (cond > 0 ? `, ${cond} carry conditionality` : "") +
        (list2?.avgPct != null ? `. Average score ${list2.avgPct}%.` : ".")
      : `${list.length} certified` +
        (busiest ? `, busiest month ${busiest.label} (${busiest.total})` : "") +
        (list2?.avgPct != null ? `. Average score ${list2.avgPct}%.` : ".");
    return {
      year,
      months,
      total: list.length,
      cond,
      avgPct: list2?.avgPct ?? null,
      virtualCount,
      physicalCount,
      typeMix,
      headline,
    };
  });

  // ---- takeaway inputs (final strings assembled after all sections) ----
  const recentTypes = [...new Set(recent.map((r) => r.type))];
  const hscRecent = recent.filter((r) => /hsc|wellness/i.test(r.type)).length;
  const recentAvg = mean(recent.map((r) => r.certScore).filter((s): s is number => s != null));
  void recentTypes;
  void hscRecent;

  // ================= Part 0: the two "certified" numbers =================
  // "Hold a certificate"  = certified (valid or expired) — the headline 72.
  // "In Certified stage"  = the shared pipeline `certified` stage — the 70.
  // The difference: facilities whose validity date has passed still HOLD a
  // certificate but their Facility Current Status is now Recertification
  // Due, so the shared stage rule puts them in a later stage, not the
  // Certified stage. Both are named per facility for the reconciliation.
  // (The expired-but-still-holding set is the stage comparison below.)
  // "Hold a certificate" is ONE definition everywhere (brief Part A.1):
  // NQAS Certification Status is Quality Certified or Quality Certified with
  // Conditionality. A bare certification date with a blank/lapsed result is
  // NOT a fourth kind of certificate — that old rule produced 74 while the
  // type table, block bars and Dashboard all said 73. The certified cohort
  // is the headline, and the pipeline's Certified stage reads the same rule
  // (isCertifiedView) so the two numbers cannot drift.
  const holdCertificateRows = rows.filter((r) => isCertifiedView(flags(r)));
  const holdCertificate = holdCertificateRows.length;
  const stageCertifiedCount = stageCount("certified");
  const holdExpiredItems = holdCertificateRows
    .filter((r) => stageOf(r) !== "certified")
    .map((r) => ({
      facility: r.facility,
      stage:
        PIPELINE_STAGES.find((s) => s.key === stageOf(r))?.label ??
        "Recertification due",
    }));
  const holdExpired = holdExpiredItems.length;
  const holdExpiredNames = holdExpiredItems;
  // Both cohorts now come from the same rule, so this is a genuine
  // reconciliation (and a test fails if they ever differ).
  const reconciliationLine =
    holdExpired === 0
      ? `${holdCertificate} hold a certificate: all ${stageCertifiedCount} are in the Certified stage.`
      : `${holdCertificate} hold a certificate: ${stageCertifiedCount} in Certified stage + ${holdExpired} in ${holdExpiredItems[0].stage} (${holdExpiredItems.map((x) => x.facility).join(", ")}).`;

  // ================= Part 0: fiscal-year certifications =================
  const fyStart = currentFiscalYear(today);
  const byFy: DeckYearRow[] = [...new Set(dated.map((r) => fiscalYearOf(r.certDate!)))]
    .sort((a, b) => a - b)
    .map((fy) => {
      const list = dated.filter((r) => fiscalYearOf(r.certDate!) === fy);
      return {
        year: fy,
        total: list.length,
        quality: list.filter(isQuality).length,
        cond: list.filter(isCond).length,
        avgPct: mean(list.map((r) => r.certScore).filter((s): s is number => s != null)),
      };
    });
  // Always include the current and previous fiscal year (zero-filled) so the
  // "FY 2026-27: 0 certifications so far" slide reads as data, not absence.
  for (const fy of [fyStart - 1, fyStart]) {
    if (!byFy.some((y) => y.year === fy))
      byFy.push({ year: fy, total: 0, quality: 0, cond: 0, avgPct: null });
  }
  byFy.sort((a, b) => a.year - b.year);
  const currentFyLabel = fiscalYearLabel(fyStart);
  const previousFyLabel = fiscalYearLabel(fyStart - 1);
  const certifiedInCurrentFy = byFy.find((y) => y.year === fyStart)?.total ?? 0;
  const certifiedInPreviousFy = byFy.find((y) => y.year === fyStart - 1)?.total ?? 0;

  // ================= Part 5.1: 'No score' footnote from data =================
  // The footnote is generated from the data, not hard-coded: find the first
  // year that has any certified score; everything BEFORE that year has no
  // score recorded. 2024 has scores in this dataset, so it reads "before
  // 2024" — or the correct year — instead of the stale "before 2025".
  // "No score recorded before YYYY" — scanned over EVERY dated
  // certification (the hold-certificate cohort, valid or expired), not only
  // the rows the shared rule still calls certified, so 2024's scored
  // certificates count even when their result column later lapsed.
  const holdDated = holdCertificateRows.filter((r) => r.certDate);
  const scoredYears = holdDated
    .filter((r) => r.certScore != null)
    .map((r) => Number(r.certDate!.slice(0, 4)));
  const noScoreBeforeYear = scoredYears.length ? Math.min(...scoredYears) : minYear;

  const footNote =
    `How counts were made: each facility is counted once, by its "Certification date / GoI Letter Date" (${grandTotalDated} dated` +
    (undated > 0 ? ` + ${undated} from earlier years with no month). ` : "). ") +
    `*${currentYear} is year to date. No score is recorded for certifications before ${noScoreBeforeYear}.`;

  // ================= profile slide =================
  const typeCounts = new Map<string, number>();
  const blockCounts = new Map<string, number>();
  for (const r of rows) {
    typeCounts.set(r.type, (typeCounts.get(r.type) ?? 0) + 1);
    blockCounts.set(r.block, (blockCounts.get(r.block) ?? 0) + 1);
  }
  const byTypeBars = [...typeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));
  const byBlockBars = [...blockCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, count]) => ({ label, count }));
  const topType = byTypeBars[0] ?? null;
  const topBlocks = byBlockBars.slice(0, 2).map((b) => b.label);
  const TYPE_LONG: Record<string, string> = {
    "HWC HSC": "Health & Wellness Sub-Centres (HWC HSC)",
    PHC: "Primary Health Centres",
    CHC: "Community Health Centres",
    UPHC: "urban facilities",
    UHWC: "urban facilities",
    UGPHC: "urban facilities",
    SDH: "sub-district hospitals",
    DHQH: "district headquarters hospitals",
  };
  const profileNote =
    topType && totalFacilities > 0
      ? `${Math.round((topType.count / totalFacilities) * 100)}% of the ${totalFacilities} facilities are ${TYPE_LONG[topType.label] ?? topType.label}; ${topBlocks.join(" and ")} are the largest blocks.`
      : "No facilities in scope.";

  // ================= certification progress slide =================
  const blockProgress = [...blockCounts.entries()]
    .map(([block, total]) => {
      const cert = rows.filter((r) => r.block === block && isCertified(r)).length;
      return {
        block,
        total,
        certified: cert,
        notYet: total - cert,
        rate: total > 0 ? Math.round((cert / total) * 100) : 0,
      };
    })
    .sort((a, b) => a.rate - b.rate || a.certified - b.certified);
  const typeProgress = [...typeCounts.entries()]
    .map(([type, facilities]) => {
      const cert = rows.filter((r) => r.type === type && isCertified(r)).length;
      return {
        type,
        facilities,
        certified: cert,
        rate: facilities > 0 ? Math.round((cert / facilities) * 100) : 0,
      };
    })
    .sort((a, b) => b.facilities - a.facilities);
  const bestType = [...typeProgress].sort((a, b) => b.rate - a.rate)[0];
  const worstTypes = typeProgress.filter((t) => t.rate === 0);
  const progressNote =
    certifiedTotal > 0 && bestType
      ? `${bestType.type}s lead at ${bestType.rate}% certified` +
        (worstTypes.length > 0 && worstTypes.length <= 3
          ? `, while ${worstTypes.map((t) => `${t.certified === 0 ? "none of" : `only ${t.certified} of`} the ${t.facilities} ${t.type}`).join(", ")} ${worstTypes.length === 1 ? "facility is" : "facilities are"} certified.`
          : ".")
      : "No certifications recorded yet.";

  // ================= barriers slide =================
  // "Certified" here means the certification RESULT cohort (quality /
  // conditional) — the same set the dashboard counts. Facilities whose
  // result column lapsed (a certification date on file but no result) are
  // in the not-certified cohort for barrier purposes; the hold-certificate
  // reconciliation above reports them separately.
  const notCertified = rows.filter((r) => !isCertifiedRow(r));
  const notCertifiedCount = notCertified.length;
  const buildingIssues = notCertified.filter((r) =>
    /dilapidat|condemn|land/i.test(`${r.buildingStatus ?? ""} ${r.currentStatus}`),
  ).length;
  const lowScore = notCertified.filter(
    (r) => r.nqasIaQ2 != null && r.nqasIaQ2 < 70,
  ).length;
  const awaiting = notCertified.filter((r) => stageOf(r) === "resultAwaited").length;
  // "State assessment not yet done" = the shared "eligible, not started"
  // stage, so this barrier matches the dashboard's pipeline bucket.
  // Excludes deferred facilities: their cycle restarted, so they are reported
  // by the "Recertification deferred" barrier below instead of being counted
  // as work that never started.
  const saNotDone = notCertified.filter(
    (r) => stageOf(r) === "notStarted" && !flags(r).isDeferred,
  ).length;
  const naScheduledCount = notCertified.filter(
    (r) => stageOf(r) === "naScheduled",
  ).length;
  const newReady = notCertified.filter((r) =>
    /inaugurat|new|ready/i.test(r.currentStatus),
  ).length;
  // Deferred (failed) assessments have no stage of their own — the shared
  // view's isDeferred flag is what marks a cycle that must be restarted.
  const deferredCount = notCertified.filter((r) => flags(r).isDeferred).length;
  // Part 5.1: the reasons are MUTUALLY EXCLUSIVE with a documented priority
  // order — a facility counts once, in the highest-priority reason that
  // applies. The matches() chain below is that order; the foot note states
  // it so the reader knows how the bars were built.
  const reasonOrder = [
    { label: "Building or land issues", tone: "coral" as const, test: (x: DeckRow) =>
        /dilapidat|condemn|land/i.test(`${x.buildingStatus ?? ""} ${x.currentStatus}`) },
    { label: "NQAS internal score below 70%", tone: "amber" as const, test: (x: DeckRow) =>
        x.nqasIaQ2 != null && x.nqasIaQ2 < 70 },
    { label: "Awaiting result or documents", tone: "teal" as const, test: (x: DeckRow) =>
        stageOf(x) === "resultAwaited" },
    { label: "NQAS assessment scheduled", tone: "teal" as const, test: (x: DeckRow) =>
        stageOf(x) === "naScheduled" },
    { label: "State assessment not yet done", tone: "teal" as const, test: (x: DeckRow) =>
        stageOf(x) === "notStarted" && !flags(x).isDeferred },
    { label: "New or ready for inauguration", tone: "light" as const, test: (x: DeckRow) =>
        /inaugurat|new|ready/i.test(x.currentStatus) },
    { label: "Recertification deferred", tone: "light" as const, test: (x: DeckRow) =>
        flags(x).isDeferred },
  ];
  const reasonCountAcc = new Map<string, number>(reasonOrder.map((r) => [r.label, 0]));
  let otherFirstMatch = 0;
  for (const r of notCertified) {
    // FIRST MATCH wins (the documented priority order) — a facility counts
    // exactly once, so the reasons always sum to the uncertified count.
    const hit = reasonOrder.find((reason) => reason.test(r));
    if (hit) reasonCountAcc.set(hit.label, (reasonCountAcc.get(hit.label) ?? 0) + 1);
    else otherFirstMatch += 1;
  }
  const otherCount = Math.max(0, notCertifiedCount - notCertified.filter((r) => reasonOrder.some((reason) => reason.test(r))).length);
  void otherFirstMatch;
  const barrierBars: { label: string; count: number; tone: DeckTone }[] = [
    ...reasonOrder.map((reason) => ({
      label: reason.label,
      count: reasonCountAcc.get(reason.label) ?? 0,
      tone: reason.tone,
    })),
    { label: "Other / not stated", count: otherCount, tone: "gray" as const },
  ]
    .filter((b) => b.count > 0)
    .sort((a, b) => b.count - a.count);
  const top3 = [...barrierBars].sort((a, b) => b.count - a.count);
  // Part 5.2 narrative guards: "largest" only with a strict winner; ties are
  // stated as ties; "Other / not stated" is excluded from "largest".
  const namedBars = barrierBars.filter((b) => b.label !== "Other / not stated");
  const otherBar = barrierBars.find((b) => b.label === "Other / not stated") ?? null;
  const sortedNamed = [...namedBars].sort((a, b) => b.count - a.count);
  const top = sortedNamed[0];
  let largestReason: string | null = null;
  if (top && top.count > 0) {
    const tied = sortedNamed.filter((b) => b.count === top.count);
    largestReason =
      tied.length > 1
        ? `${tied.map((b) => b.label).join(" and ")} are tied at ${top.count}`
        : `${top.count} ${top.label.toLowerCase()} — the single largest reason`;
  }
  const barrierNotes = [
    largestReason ?? "No barriers recorded",
    sortedNamed[1] && sortedNamed[1].count !== top?.count
      ? `${sortedNamed[1].count} ${sortedNamed[1].label.toLowerCase()}`
      : "",
    otherBar && otherBar.count > 0
      ? `${otherBar.count} of the rest have no reason recorded in the data`
      : "",
  ].filter(Boolean);
  const barrierPriorityNote =
    `Priority order: ${reasonOrder.map((r) => r.label).join(" then ")} then other. Uncertified facilities are counted once, in the first reason that applies, so the bars add to ${notCertifiedCount}.`;
  const barrierFoot =
    `Grouped from the ${FACILITY_CURRENT_STATUS_LABEL} column${totalFacilities > 0 ? ` (n = ${totalFacilities})` : ""}. ${barrierPriorityNote} Coral and amber bars are blocked; teal bars are moving through assessment.`;

  const heatmapNote = undated > 0
    ? `${undated} certification${undated === 1 ? "" : "s"} ha${undated === 1 ? "s" : "ve"} no month recorded, so month totals add to ${grandTotalDated} of ${certifiedTotal}. *${currentYear} is year to date.`
    : `*${currentYear} is year to date. Darker cells mean more certifications in the month.`;

  // ================= internal assessment scores slide =================
  const band = (v: number | null): number => {
    if (v == null) return -1;
    if (v < 70) return 0;
    if (v < 80) return 1;
    if (v < 90) return 2;
    return 3;
  };
  const scoreBands = [
    { label: "Below 70%", nqas: 0, kayakalp: 0 },
    { label: "70–79%", nqas: 0, kayakalp: 0 },
    { label: "80–89%", nqas: 0, kayakalp: 0 },
    { label: "90% and above", nqas: 0, kayakalp: 0 },
  ];
  for (const r of rows) {
    const bn = band(r.nqasIaQ2);
    const bk = band(r.kayakalpIaQ2);
    if (bn >= 0) scoreBands[bn].nqas += 1;
    if (bk >= 0) scoreBands[bk].kayakalp += 1;
  }
  const withBothN = rows.filter((r) => r.nqasIaQ1 != null && r.nqasIaQ2 != null);
  const withBothK = rows.filter((r) => r.kayakalpIaQ1 != null && r.kayakalpIaQ2 != null);
  const avgOf = (nums: number[]) =>
    nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : null;
  const iaQ1Avg = avgOf(withBothN.map((r) => r.nqasIaQ1!));
  const iaQ2Avg = avgOf(withBothN.map((r) => r.nqasIaQ2!));
  const kkQ1Avg = avgOf(withBothK.map((r) => r.kayakalpIaQ1!));
  const kkQ2Avg = avgOf(withBothK.map((r) => r.kayakalpIaQ2!));
  const deltaClass = (q1: number, q2: number) =>
    q2 - q1 > 0.05 ? "up" : q2 - q1 < -0.05 ? "down" : "same";
  const iaImproved = withBothN.filter((r) => deltaClass(r.nqasIaQ1!, r.nqasIaQ2!) === "up").length;
  const iaUnchanged = withBothN.filter((r) => deltaClass(r.nqasIaQ1!, r.nqasIaQ2!) === "same").length;
  const iaDeclined = withBothN.filter((r) => deltaClass(r.nqasIaQ1!, r.nqasIaQ2!) === "down").length;
  const kkImproved = withBothK.filter((r) => deltaClass(r.kayakalpIaQ1!, r.kayakalpIaQ2!) === "up").length;
  const kkUnchanged = withBothK.filter((r) => deltaClass(r.kayakalpIaQ1!, r.kayakalpIaQ2!) === "same").length;
  const kkDeclined = withBothK.filter((r) => deltaClass(r.kayakalpIaQ1!, r.kayakalpIaQ2!) === "down").length;
  const certifiedIaAvg = avgOf(certified.filter((r) => r.nqasIaQ2 != null).map((r) => r.nqasIaQ2!));
  const restIaAvg = avgOf(notCertified.filter((r) => r.nqasIaQ2 != null).map((r) => r.nqasIaQ2!));
  const certifiedKkAvg = avgOf(certified.filter((r) => r.kayakalpIaQ2 != null).map((r) => r.kayakalpIaQ2!));
  const restKkAvg = avgOf(notCertified.filter((r) => r.kayakalpIaQ2 != null).map((r) => r.kayakalpIaQ2!));
  const iaNote =
    `IA = internal assessment; Q1 and Q2 are quarters of the current financial year. Unchanged = within 0.05 points.`;

  // ================= assessment pipeline slide =================
  const saCompletedTotal = rows.filter((r) => r.saStatus === "Completed").length;
  // "still moving through results and documents" = the shared result-awaited
  // stage, so this count matches the dashboard's Result Awaited bucket.
  const saCompletedAwaiting = rows.filter(
    (r) => r.saStatus === "Completed" && stageOf(r) === "resultAwaited",
  ).length;
  const saScheduledCnt = rows.filter(
    (r) =>
      (r.saStatus === "Scheduled" || r.currentStatus === "SA Scheduled" ||
        r.currentStatus.includes("Assessment Scheduled")) &&
      r.saStatus !== "Completed",
  ).length;
  const saNotInit = rows.filter(
    (r) => r.saStatus == null && r.currentStatus.includes("Not Yet Initiated"),
  ).length;
  const saNoEntry = Math.max(
    0,
    totalFacilities - saCompletedTotal - saScheduledCnt - saNotInit,
  );
  const saScoreList = rows.filter((r) => r.saScore != null).map((r) => r.saScore!);
  const saAvgScore = saScoreList.length ? avgOf(saScoreList) : null;
  const saScoreRange: [number, number] | null = saScoreList.length
    ? [Math.min(...saScoreList), Math.max(...saScoreList)]
    : null;
  // Part 5.1: the funnel (157 → 13 → 72) is replaced by STATE ASSESSMENT
  // RECORDS — Completed / Awaiting result / No SA entry — because older
  // certificates pre-date state assessment and a "funnel" that grows
  // backwards (13 SA → 72 certified) misreads the lifecycle.
  // Part 5.1: "Completed, awaiting result" is a SUBSET of Completed (a
  // facility with a completed SA whose result is not yet declared), so the
  // records line reports it as a sub-line — the buckets sum to the count.
  const saNobodyLabel = "State assessment records";
  const funnelSubtitle =
    `${saNobodyLabel}: ${saCompletedTotal} Completed` +
    (saCompletedAwaiting > 0 ? ` (of which ${saCompletedAwaiting} awaiting result)` : "") +
    ` · ${saNoEntry} No SA entry` +
    (saScheduledCnt > 0 ? ` · ${saScheduledCnt} Scheduled` : "") +
    ` (of ${totalFacilities} facilities). Older certificates pre-date state assessment,` +
    " so the certified count is not a subset of these records.";
  const saFoot =
    `"No SA entry" = the file has no state assessment status for that facility (many pre-date the state-assessment requirement).`;

  // ================= buildings & fire safety slide =================
  // ONE shared mapping (lib/buildingBuckets → buildingGroupSummary): the old
  // sliding regex chain duplicated "Major M&R works" / "Minor M&R works" as
  // separate near-empty columns and the building group summed 161 for a
  // 157-facility dataset. The shared buckets collapse those variants into
  // ONE "M&R Work" column so the group reconciles to the facility count.
  const buildingSummary = buildingGroupSummary(rows);
  const BUILDING_TONE: Record<string, DeckTone> = {
    Good: "teal",
    "Needs Repair": "amber",
    "Under Renovation": "amber",
    Dilapidated: "coral",
    "M&R Work": "amber",
    "Construction on going": "light",
  };
  const buildingBars: { label: string; count: number; tone: DeckTone }[] =
    buildingSummary.order
      .filter((b) => buildingSummary.counts[b] > 0 || b === "No record")
      .map((b) => ({
        label: b,
        count: buildingSummary.counts[b],
        tone: b === "No record" ? ("gray" as const) : (BUILDING_TONE[b] ?? ("light" as DeckTone)),
      }));
  const dilapCount = buildingSummary.counts["Dilapidated"];
  const buildingNotRecorded = buildingSummary.counts["No record"];
  const buildingUpdatedNote =
    totalFacilities > 0
      ? `Building status (one shared mapping): Good also counts Good Condition and Inaugurated; all M&R variants are one column. Not recorded for ${buildingNotRecorded} facilities.`
      : "No building data.";
  const buildingReconciles =
    Object.values(buildingSummary.counts).reduce((a, b) => a + b, 0) === totalFacilities;
  // ---- Fire NOC: DATE-PRIMARY buckets on every row (Part 0 §6 / Part 5.1).
  // The old list counted the raw stored status, so "Expiring soon" showed 0
  // in the deck while the Master List showed it — the stored status column
  // disagrees with the validity date. One derived rule (derive FireNocStatus,
  // the same one the Master List reads) fixes both; "Not recorded" (no NOC
  // record at all) keeps the headline sentence honest.
  const nocValid = rows.filter(
    (r) => nocStatusOfRow(r, today) === "Valid",
  ).length;
  const nocExpiringSoon = rows.filter(
    (r) => nocStatusOfRow(r, today) === "Expiring Soon",
  ).length;
  const nocExpiredRows = rows.filter(
    (r) => nocStatusOfRow(r, today) === "Expired",
  );
  const nocExpired = nocExpiredRows.length;
  const nocRecordedNoValidity = rows.filter(
    (r) => nocStatusOfRow(r, today) === "Recorded, no validity date",
  ).length;
  const nocNotObtained = rows.filter(
    (r) => nocStatusOfRow(r, today) === "Not Obtained",
  ).length;
  const nocRecorded = rows.filter(
    (r) => (r.fireNocStatus ?? "").trim() !== "" || (r.fireNocExpiry ?? "") !== "",
  ).length;
  const nocNotRecorded = totalFacilities - nocRecorded;
  const nocExpiredByType = new Map<string, number>();
  for (const r of nocExpiredRows)
    nocExpiredByType.set(r.type, (nocExpiredByType.get(r.type) ?? 0) + 1);
  const nocExpiredBreakdown =
    nocExpired > 0
      ? `Expired: ${[...nocExpiredByType.entries()].sort((a, b) => b[1] - a[1]).map(([t, c]) => `${c} ${t}`).join(", ")}.`
      : "No expired fire NOCs recorded.";
  const ownCount = rows.filter((r) => /own/i.test(r.buildingType ?? "") && !/rent/i.test(r.buildingType ?? "")).length;
  const rentCount = rows.filter((r) => /^rented/i.test(r.buildingType ?? "")).length;
  const rentFreeCount = rows.filter((r) => /rent.?free/i.test(r.buildingType ?? "")).length;
  const nocOwnership =
    ownCount + rentCount + rentFreeCount > 0
      ? `Ownership: ${ownCount} own buildings, ${rentCount} rented, ${rentFreeCount} rent-free.`
      : "Building ownership is not recorded.";
  const fireNocRecordedSentence = `Fire NOC is recorded for ${nocRecorded} of ${totalFacilities} facilities (${nocNotRecorded} not recorded).`;
  const fireFoot =
    `${fireNocRecordedSentence} Valid + Expiring soon + Expired + Recorded, no validity date + Not recorded = ${totalFacilities}. Expiring soon = validity date within 90 days (admin-set window); date-derived, so a stored status that disagrees with the date is superseded.`;

  // ================= validity / surveillance / funds slide =================
  const certDatedRows = certified.filter((r) => r.certDate || r.validityDate);
  const certValid = certDatedRows.filter((r) => r.validityDate && r.validityDate >= today).length;
  const certExpired = certDatedRows.filter((r) => r.validityDate && r.validityDate < today).length;
  const certNoStatus = Math.max(0, certifiedTotal - certValid - certExpired);
  const certExpiring12m = certDatedRows.filter(
    (r) =>
      r.validityDate && r.validityDate >= today &&
      new Date(r.validityDate + "T12:00:00").getTime() - new Date(today + "T12:00:00").getTime() <=
        365 * 86400000,
  ).length;
  const survOverdueRows = certified.filter(
    (r) => r.surveillanceDue1 && r.surveillanceDue1 < today && !r.surveillanceDone1,
  );
  const survOverdue = survOverdueRows.length;
  const survOverdue2 = certified.filter(
    (r) => r.surveillanceDue2 && r.surveillanceDue2 < today && !r.surveillanceDone2,
  ).length;
  const survNoneDone = certified.filter((r) => !r.surveillanceDone1 && !r.surveillanceDone2).length;
  const survDoneAny = certified.filter(
    (r) => r.surveillanceDone1 || r.surveillanceDone2,
  ).length;
  const fundRows = rows.filter((r) => r.gapClosureAmount != null || r.gcFundYear != null);
  const fundsFacilities = fundRows.length;
  const fundAmounts = fundRows.filter((r) => r.gapClosureAmount != null).map((r) => r.gapClosureAmount!);
  const fundsTotalLakh = fundAmounts.length
    ? Math.round((fundAmounts.reduce((a, b) => a + b, 0) / 100000) * 10) / 10
    : null;
  const fundsYears = [...new Set(fundRows.map((r) => r.gcFundYear).filter((y): y is string => !!y))].sort();
  const fundsReceivedRecent = fundsYears.length ? fundsYears.join(", ") : null;
  const fundsCertified = fundRows.filter((r) => isCertifiedRow(r)).length;
  const followUpNote =
    certValid >= certExpired
      ? `${certValid} of the ${certifiedTotal} certificates are currently valid, but ${certExpired} ${certExpired === 1 ? "has" : "have"} expired and ${survOverdue} facilities are past a surveillance due date.`
      : `${certExpired} of the ${certifiedTotal} certificates have expired — renewals are the priority — and ${survOverdue} facilities are past a surveillance due date.`;

  // ---- takeaways (aligned with the reference deck's four themes) ----
  const leadBlocks = [...blockProgress].sort((a, b) => b.rate - a.rate);
  // Part 5.6: the definitions/method slide is generated from the SAME rules
  // the data model implements — one place, so a definitions change updates
  // every slide that mentions the number.
  const definitions = [
    {
      term: "Hold a certificate",
      definition:
        `Facilities with a certificate, VALID OR EXPIRED (${holdCertificate} today: ${qualityCount} Quality Certified + ${condCount} with conditionality). Headline numbers use this.`,
    },
    {
      term: "In Certified stage",
      definition:
        `Facilities whose Facility Current Status is the Certified stage (${stageCertifiedCount}). Stage charts use this — the ${holdCertificate} include ${holdExpired} ${holdExpired === 1 ? "facility" : "facilities"} whose certificate has expired (now Recertification Due) but which still hold it.`,
    },
    {
      term: `Fiscal year (FY ${currentFyLabel})`,
      definition:
        `India: April to March. "Certified in FY ${currentFyLabel} (to date)" counts by certification date inside this fiscal year, with FY ${previousFyLabel} shown for comparison.`,
    },
    {
      term: "Fire NOC buckets",
      definition:
        `Valid — expiry date ahead. Expiring soon — within ${DEFAULT_SETTINGS.fireNocAlertLeadDays} days (the admin-set window). Expired — past. Recorded, no validity date — an entry exists but the date is blank (${nocRecordedNoValidity} facilities). Not recorded — no NOC entry (${nocNotRecorded} facilities). All five buckets sum to ${totalFacilities}.`,
    },
    {
      term: "Reason priority",
      definition: barrierPriorityNote,
    },
    {
      term: "Building mapping",
      definition:
        `Good = Good + Good Condition + Inaugurated; M&R works = M&R Work + Major/Minor M&R works; Construction/land = Construction going on + Land available/not available; Dilapidated as stored; anything else Other; blank No record.`,
    },
  ];
  const takeaways = [
    {
      n: 1,
      title: certifiedTotal > 0 && totalFacilities > 0 && certifiedTotal < totalFacilities / 2 ? "Under half certified" : "Certification momentum",
      body: `${certifiedTotal} of ${totalFacilities} facilities (${certifiedPct}%) are certified.` +
        (bestType ? ` ${bestType.type}s are at ${bestType.rate}%.` : "") +
        (leadBlocks[0] && leadBlocks[leadBlocks.length - 1]
          ? ` ${leadBlocks[0].block} leads blocks at ${leadBlocks[0].rate}%, ${leadBlocks[leadBlocks.length - 1].block} trails at ${leadBlocks[leadBlocks.length - 1].rate}%.`
          : ""),
    },
    {
      n: 2,
      title: "Buildings block the most",
      body: buildingIssues > 0
        ? `${buildingIssues} of the ${notCertifiedCount} uncertified facilities have building or land issues, and ${dilapCount} ${dilapCount === 1 ? "building is" : "buildings are"} dilapidated.`
        : `${dilapCount} ${dilapCount === 1 ? "building is" : "buildings are"} dilapidated; no certification is currently blocked by building or land issues.`,
    },
    {
      n: 3,
      title: "Internal scores split the groups",
      body: certifiedIaAvg != null && restIaAvg != null
        ? `Certified facilities average ${certifiedIaAvg}% on NQAS IA against ${restIaAvg}% for the rest` +
          (lowScore > 0 ? `, and ${lowScore} facilities ${lowScore === 1 ? "is" : "are"} still below 70%.` : ".")
        : recentAvg != null
          ? `Average certification score is ${recentAvg}%.`
          : "Internal assessment scores are not recorded for most facilities.",
    },
    {
      n: 4,
      title: "Housekeeping needs follow-up",
      body: `${certExpired} ${certExpired === 1 ? "certificate has" : "certificates have"} expired, ${survOverdue} ${survOverdue === 1 ? "facility is" : "facilities are"} past a surveillance due date with no visit recorded, and ${nocExpired} ${nocExpired === 1 ? "fire NOC has" : "fire NOCs have"} expired.`,
    },
  ];

  return {
    totalFacilities,
    certifiedTotal,
    qualityCount,
    condCount,
    certifiedPct,
    blocksCount,
    recentSpanLabel: `${recentStart}–${String(maxYear).slice(2)}`,
    recentCount: recent.length,
    recentSharePct,
    statusSlices: slices,
    byYear,
    undated,
    undatedQuality,
    undatedCond,
    currentYear,
    yearMonth,
    grandTotalDated,
    busiestPair,
    earlyYears,
    earlyNote,
    yearDetails,
    takeaways,
    footNote,
    heatmapNote,
    // profile
    byTypeBars,
    byBlockBars,
    topTypeName: topType?.label ?? null,
    topTypeCount: topType?.count ?? 0,
    topTypeNameLong: topType ? (TYPE_LONG[topType.label] ?? topType.label) : null,
    topBlocksLabel: topBlocks.join(" and "),
    profileNote,
    // certification progress
    blockProgress,
    typeProgress,
    progressNote,
    // barriers
    notCertifiedCount,
    barrierBars,
    barrierNotes,
    barrierFoot,
    // IA scores
    scoreBands,
    iaQ1Avg,
    iaQ2Avg,
    kkQ1Avg,
    kkQ2Avg,
    iaImproved,
    iaUnchanged,
    iaDeclined,
    kkImproved,
    kkUnchanged,
    kkDeclined,
    certifiedIaAvg,
    restIaAvg,
    certifiedKkAvg,
    restKkAvg,
    iaNote,
    // assessment pipeline
    saCompleted: saCompletedTotal,
    saCompletedAwaiting,
    saScheduled: saScheduledCnt,
    saNotInitiated: saNotInit,
    saNoEntry,
    saAvgScore,
    saScoreRange,
    funnelSubtitle,
    saFoot,
    // buildings & fire safety
    buildingBars,
    buildingNotRecorded,
    buildingUpdatedNote,
    nocRecorded,
    nocValid,
    nocExpired,
    nocExpiringSoon,
    nocRecordedNoValidity,
    nocNotObtained,
    nocExpiredBreakdown,
    nocOwnership,
    fireFoot,
    // validity / surveillance / funds
    followUpNote,
    certValid,
    certExpired,
    certNoStatus,
    certExpiring12m,
    survOverdue,
    survOverdue2,
    survNoneDone,
    survDoneAny,
    fundsFacilities,
    fundsFunded: fundRows.filter((r) => /fund|receiv|utiliz/i.test(r.gcFundYear ?? "")).length,
    fundsPending: fundRows.filter((r) => r.gapClosureAmount == null).length,
    fundsTotalLakh,
    fundsReceivedRecent,
    fundsCertified,
    // Part 0/1 upgrades
    holdCertificate,
    holdExpired,
    holdExpiredNames,
    reconciliationLine,
    byFy,
    currentFyLabel,
    previousFyLabel,
    certifiedInCurrentFy,
    certifiedInPreviousFy,
    nocNotRecorded,
    fireNocRecordedSentence,
    noScoreBeforeYear,
    barrierPriorityNote,
    definitions,
    buildingReconciles,
  };
}
