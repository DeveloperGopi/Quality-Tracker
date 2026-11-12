/**
 * THE DECK SLIDE MODEL — Part 2/3 of the Generate PPT brief.
 *
 * ONE builder produces every slide as data: an action title, a subtitle, a
 * 12-column grid of blocks, a footer note and speaker notes. The Generate PPT
 * preview, the PPTX renderer, the PDF renderer and the NQAS Summary Report
 * page all read THIS model, so a number or a sentence can never differ
 * between the screen and the downloads.
 *
 * Rules baked in here (each is covered by a golden test):
 *  • Headline certified count = "hold a certificate" (Quality + Conditional,
 *    valid or expired). Stage charts = the shared `certified` stage. Both are
 *    printed together with the named difference.
 *  • Certifications by year use FISCAL years (Apr–Mar) by default, with an
 *    explicit "No date" row so the chart sums to the headline.
 *  • Monthly tables are Quality | Conditional | Total; the total row is the
 *    column sums, never a typed number.
 *  • Buildings read the shared bucket mapping ("Good" — not "Good condition").
 *  • Fire NOC is date-derived and has FOUR buckets summing to the facility
 *    count, always including "Not recorded".
 *  • Action titles come from guarded templates: strict winners only, ties
 *    stated, plurals correct, no sentence when the denominator is 0.
 */

import {
  buildDeckData,
  isCertifiedRow,
  isCond,
  isQuality,
  type DeckData,
  type DeckRow,
  type DeckTone,
} from "./deck";
import { formatInr } from "./formatInr";
import {
  currentFiscalYear,
  fiscalYearLabel,
  fiscalYearOf,
} from "./fiscalYear";
import { ORG_NAME, ORG_SIGNATURE } from "./org";
import { todayLocalIso } from "./today";

export type DeckSlideId =
  | "title"
  | "exec"
  | "where"
  | "profile"
  | "progress"
  | "barriers"
  | "ia"
  | "pipeline"
  | "buildings"
  | "validity"
  | "byYear"
  | "heatmap"
  | "yearA"
  | "yearB"
  | "takeaways"
  | "checks"
  | "defs";

/** Default order. The first ten slides are the deck; everything after the
 *  action slide is appendix and hidden until the user shows it. */
export const DEFAULT_SLIDE_ORDER: readonly DeckSlideId[] = [
  "title",
  "exec",
  "where",
  "progress",
  "barriers",
  "ia",
  "byYear",
  "validity",
  "buildings",
  "profile",
  "pipeline",
  "heatmap",
  "yearA",
  "yearB",
  "takeaways",
  "checks",
  "defs",
];

/** The appendix is hidden by default (10-slide deck). The eye, presets and
 *  "Show all" bring any of these back; the choice is per user and in the URL. */
export const DEFAULT_HIDDEN_SLIDES: readonly DeckSlideId[] = [
  "profile",
  "pipeline",
  "heatmap",
  "yearA",
  "yearB",
  "checks",
  "defs",
];

export type DeckSectionId =
  | "summary"
  | "profile"
  | "progress"
  | "assessment"
  | "certification"
  | "close";

export const DECK_SECTIONS: { id: DeckSectionId; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "profile", label: "Facility profile" },
  { id: "progress", label: "Certification progress" },
  { id: "assessment", label: "Assessment" },
  { id: "certification", label: "Certification & trends" },
  { id: "close", label: "Close" },
];

export const SLIDE_TITLES: Record<DeckSlideId, string> = {
  title: "Cover",
  exec: "Executive summary",
  where: "Where facilities stand",
  profile: "Facility profile",
  progress: "Certification progress",
  barriers: "Why facilities are not certified",
  ia: "Internal assessment",
  pipeline: "State assessment",
  buildings: "Buildings and Fire NOC",
  validity: "Validity, surveillance and funds",
  byYear: "Certification over time",
  heatmap: "Month detail",
  yearA: "Month table (older)",
  yearB: "Month table (latest)",
  takeaways: "What needs action",
  checks: "Data checks",
  defs: "Definitions and method",
};

/** Slides only a State Admin may hide (a deck without them misleads). */
export const ADMIN_ONLY_HIDE: ReadonlySet<DeckSlideId> = new Set(["title", "defs"]);

/** Slides other slides reference — hiding them shows a warning, not a block. */
export const REFERENCED_SLIDES: ReadonlySet<DeckSlideId> = new Set(["defs", "checks"]);

export type Tone = "teal" | "amber" | "coral" | "blue" | "grey" | "light";

export const TONE_HEX: Record<Tone, string> = {
  teal: "#0F6B63",
  amber: "#C98212",
  coral: "#C34B32",
  blue: "#2C6C8E",
  grey: "#7C8F8C",
  light: "#CBD9D6",
};

/**
 * Ink for a tone drawn as TEXT on a light panel (AA, 4.5:1 or better).
 * The fills above are for shapes; amber, grey and light are far too pale to
 * use as text on white or on the mist panel. Every renderer — screen, PPTX
 * and PDF — reads this one palette, so a number cannot be legible in the
 * preview and washed out in the download.
 */
export const TONE_INK_LIGHT: Record<Tone, string> = {
  teal: "#0B5751",
  amber: "#8A5200",
  coral: "#A13627",
  blue: "#1F5875",
  grey: "#526663",
  light: "#526663",
};

/** The same idea on a dark slide: light tints, never the raw fill. */
export const TONE_INK_DARK: Record<Tone, string> = {
  teal: "#B7F0E9",
  amber: "#FFD48A",
  coral: "#FFB3A3",
  blue: "#B9DDF2",
  grey: "#D2E1DF",
  light: "#D2E1DF",
};

/** Second encoding for greyscale printing: every tone also has a pattern. */
export const TONE_PATTERN: Record<Tone, "solid" | "diagonal" | "cross" | "dots" | "empty"> = {
  teal: "solid",
  amber: "diagonal",
  coral: "cross",
  blue: "dots",
  grey: "empty",
  light: "empty",
};

const channel = (c: number) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

/**
 * Ink for text that sits ON a filled swatch (a stacked-bar segment, a heat cell).
 *
 * Picks whichever of black or white has the higher contrast against the fill:
 * white labels on amber (#C98212) or on the pale grey/light tones were the
 * "unreadable slide" bug — those fills need dark ink, while teal, blue and
 * coral keep white. Used by the preview, the PDF and the PPTX so a number
 * inside a bar is legible in all three.
 */
export function inkOnFill(hex: string): "#0B1F1D" | "#FFFFFF" {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(h.slice(i, i + 2), 16) || 0));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // White wins only on dark fills; (L + 0.05)^2 <= 0.0525 is the crossover.
  return luminance <= 0.179 ? "#FFFFFF" : "#0B1F1D";
}

export type Align = "left" | "right" | "center";

export type SlideBlock =
  | {
      kind: "kpis";
      items: { value: string; label: string; note?: string; tone?: Tone }[];
    }
  | {
      kind: "bars";
      title?: string;
      items: { label: string; value: number; tone?: Tone; display?: string }[];
      max?: number;
      note?: string;
    }
  | {
      kind: "stacked";
      title?: string;
      segments: { label: string; value: number; tone: Tone }[];
      note?: string;
    }
  | {
      kind: "table";
      title?: string;
      head: string[];
      rows: string[][];
      totalRow?: string[];
      align?: Align[];
      note?: string;
    }
  | {
      kind: "heatmap";
      title?: string;
      monthLabels: string[];
      rows: { label: string; cells: number[]; total: number }[];
      totalLabel: string;
      totalCells: number[];
      grandTotal: number;
    }
  | {
      kind: "donut";
      title?: string;
      segments: { label: string; value: number; tone: Tone }[];
      centerValue: string;
      centerLabel: string;
      caption?: string;
    }
  | {
      kind: "cards";
      items: { title: string; big: string; line: string; body?: string; tone?: Tone }[];
    }
  | {
      kind: "facts";
      items: { big: string; text: string; tone?: Tone }[];
    }
  | {
      kind: "takeaways";
      items: { n: number; title: string; body: string }[];
    }
  | {
      kind: "defs";
      items: { term: string; definition: string }[];
    }
  | { kind: "text"; body: string; tone?: Tone }
  | { kind: "bullets"; title?: string; items: string[]; tone?: Tone };

export type DeckSlide = {
  id: DeckSlideId;
  section: DeckSectionId;
  sectionLabel: string;
  variant: "light" | "cover" | "dark";
  kicker?: string;
  title: string;
  subtitle?: string;
  hero?: { value: string; label: string };
  /** 1–3 columns; each column stacks blocks with equal shares of the height. */
  columns: SlideBlock[][];
  note?: string;
  speakerNotes?: string;
  /** A slide-level warning (a failed reconciliation) — survives hiding. */
  dataCheck?: { issues: number; text: string } | null;
};

export type DeckCheck = {
  id: string;
  label: string;
  count: number;
  definition: string;
  facilities: string[];
  tone: "amber" | "coral" | "grey";
  href?: string;
};

export type DeckReconciliation = {
  label: string;
  ok: boolean;
  detail: string;
};

export type DeckChecks = {
  issues: DeckCheck[];
  /** Categories with at least one facility — the "N issues" stamp. */
  totalIssues: number;
  lines: string[];
  reconcile: DeckReconciliation[];
  failed: number;
};

export type DeckPeriod = "fy" | "calendar";

export type RateBands = {
  /** At or above this certified rate: green/teal. */
  green: number;
  /** At or above this (and below green): amber. Below: coral. */
  amber: number;
};

/** Default certified-rate bands. Admin → Settings can pass the configured
 *  values through `options.rateBands`; the legend is generated from the same
 *  object, so a band can never be described differently in two places. */
export const DEFAULT_RATE_BANDS: RateBands = { green: 75, amber: 50 };

/** Read the Admin → Settings `rateBands` value without trusting its shape.
 *  A malformed or impossible pair (amber ≥ green, out of range) falls back to
 *  the defaults instead of drawing a legend nobody can satisfy. */
export function parseRateBands(value: unknown): RateBands {
  if (!value || typeof value !== "object") return DEFAULT_RATE_BANDS;
  const v = value as { green?: unknown; amber?: unknown };
  const green = Number(v.green);
  const amber = Number(v.amber);
  if (!Number.isFinite(green) || !Number.isFinite(amber)) return DEFAULT_RATE_BANDS;
  if (amber < 0 || green > 100 || amber >= green) return DEFAULT_RATE_BANDS;
  return { green, amber };
}

export type DeckModelOptions = {
  district?: string;
  /** Financial year (default) or calendar year for the by-year slides. */
  period?: DeckPeriod;
  /** Human-readable filter scope, printed on the cover and in every footer. */
  filtersLabel?: string;
  /** Admin-configurable certified-rate bands (defaults 75 / 50). */
  rateBands?: RateBands;
  /** Injectable for tests. */
  today?: string;
};

export type DeckPeriodRow = {
  label: string;
  total: number;
  quality: number;
  cond: number;
};

export type DeckModel = {
  slides: DeckSlide[];
  data: DeckData;
  checks: DeckChecks;
  meta: {
    district: string;
    orgName: string;
    signature: string;
    deckTitle: string;
    period: DeckPeriod;
    periodLabel: string;
    filtersLabel: string;
    dataAsOf: string;
    reportId: string;
    totalFacilities: number;
    holdCertificate: number;
    certifiedStage: number;
  };
  /** Fiscal/calendar buckets for the by-year slide — always sum to the
   *  headline "hold a certificate" count (dated buckets + No date). */
  periodRows: DeckPeriodRow[];
  periodUndated: DeckPeriodRow;
};

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function deckDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "-";
  return `${String(d).padStart(2, "0")}-${MONTH_ABBR[m - 1]}-${y}`;
}

/** "Data as of 26-Oct-2026 10:25 IST" — read in IST, printed once. */
export function deckDataAsOf(now: Date = new Date()): string {
  try {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = Object.fromEntries(
      fmt.formatToParts(now).map((p) => [p.type, p.value]),
    );
    return `${parts.day}-${parts.month}-${parts.year} ${parts.hour}:${parts.minute} IST`;
  } catch {
    const ist = new Date(now.getTime() + 5.5 * 3600_000);
    return `${String(ist.getUTCDate()).padStart(2, "0")}-${MONTH_ABBR[ist.getUTCMonth()]}-${ist.getUTCFullYear()} ${String(
      ist.getUTCHours(),
    ).padStart(2, "0")}:${String(ist.getUTCMinutes()).padStart(2, "0")} IST`;
  }
}

const pctOf = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);
const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;
const money = (v: number | null | undefined) => formatInr(v ?? null);

function reportIdFor(today: string): string {
  return `NQAS-DECK-${today.replace(/-/g, "")}`;
}

/* ------------------------------------------------------------------ */
/* Data checks — one definition each, names included                     */
/* ------------------------------------------------------------------ */

export function computeDeckChecks(
  rows: DeckRow[],
  data: DeckData,
  today: string,
): DeckChecks {
  const certified = rows.filter((r) => isCertifiedRow(r));
  const certifiedNoDate = certified.filter((r) => !r.certDate);
  const certifiedNotEligible = certified.filter((r) => r.eligibility !== "Eligible");
  const certExpiredRows = certified.filter(
    (r) => r.validityDate != null && r.validityDate < today,
  );
  const nocExpiredRows = rows.filter(
    (r) => r.fireNocExpiry != null && r.fireNocExpiry < today,
  );
  const resultNoDate = rows.filter((r) => !!r.certStatus && !r.certDate);
  const dateNoResult = rows.filter((r) => !!r.certDate && !r.certStatus);
  const noNa = rows.filter((r) => r.naStatus == null);
  const noSa = rows.filter((r) => r.saStatus == null);
  const noIa = rows.filter((r) => r.nqasIaQ1 == null && r.nqasIaQ2 == null);
  const futureSurv = rows.filter(
    (r) =>
      (r.surveillanceDone1 && r.surveillanceDone1 > today) ||
      (r.surveillanceDone2 && r.surveillanceDone2 > today),
  );

  const names = (list: DeckRow[], n = 8) =>
    list.slice(0, n).map((r) => r.facility).join(", ") +
    (list.length > n ? `, +${list.length - n} more` : "");

  const issues: DeckCheck[] = [
    {
      id: "certified-no-date",
      label: "Certified facilities with no certification date",
      count: certifiedNoDate.length,
      definition:
        "Quality Certified or Quality Certified with Conditionality, but no GoI Letter Date / certification date — the facility cannot be placed in a year or a month. This is the deck's \"No date\" row.",
      facilities: certifiedNoDate.map((r) => r.facility),
      tone: "amber",
      href: "/facilities?missing=certDate",
    },
    {
      id: "certified-not-eligible",
      label: "Certified but eligibility says Not eligible",
      count: certifiedNotEligible.length,
      definition:
        "The facility holds a Quality/Quality with Conditionality certificate, but the stored eligibility column still says Not Eligible. A certified facility is never Not eligible; the shared stage rule keeps it in Certified and this list names the rows to correct.",
      facilities: certifiedNotEligible.map((r) => r.facility),
      tone: "coral",
      href: "/facilities?kpi=certified",
    },
    {
      id: "cert-expired",
      label: "Certificates past their validity date",
      count: certExpiredRows.length,
      definition:
        "Quality Certified or Quality Certified with Conditionality and a validity date earlier than today (IST). The facility still holds the certificate and is counted in the headline; recertification is the next action.",
      facilities: certExpiredRows.map((r) => r.facility),
      tone: "amber",
      href: "/facilities?kpi=recert",
    },
    {
      id: "noc-expired",
      label: "Fire NOC expired",
      count: nocExpiredRows.length,
      definition:
        "The recorded Fire NOC validity date is earlier than today (IST). Re-upload the renewed NOC in the facility profile.",
      facilities: nocExpiredRows.map((r) => r.facility),
      tone: "coral",
      href: "/facilities/fire-noc",
    },
    {
      id: "result-no-date",
      label: "NQAS result recorded with no certification date",
      count: resultNoDate.length,
      definition:
        "The result column is filled but the date is blank. A superset of the row above: it also counts facilities whose result is no longer counted as certified.",
      facilities: resultNoDate.map((r) => r.facility),
      tone: "grey",
      href: "/facilities?missing=certDate",
    },
    {
      id: "date-no-result",
      label: "Certification date with no NQAS result",
      count: dateNoResult.length,
      definition:
        "A GoI Letter Date is on file but the result is blank, so the facility cannot be counted in Quality or Conditional.",
      facilities: dateNoResult.map((r) => r.facility),
      tone: "amber",
      href: "/facilities?missing=certStatus",
    },
    {
      id: "surveillance-future",
      label: "Surveillance done dates in the future",
      count: futureSurv.length,
      definition:
        "A done date later than today (IST). Done dates are manual entries and cannot be future-dated; fix them in Admin → Data checks → Surveillance dates.",
      facilities: futureSurv.map((r) => r.facility),
      tone: "coral",
      href: "/admin?tab=surveillance-dates",
    },
    {
      id: "no-na-entry",
      label: "Facilities with no NQAS assessment entry",
      count: noNa.length,
      definition: "The file has no NQAS assessment status for the facility.",
      facilities: noNa.map((r) => r.facility),
      tone: "grey",
      href: "/facilities?missing=naStatus",
    },
    {
      id: "no-sa-entry",
      label: "Facilities with no state assessment entry",
      count: noSa.length,
      definition:
        "The file has no state assessment status. Many older certificates pre-date the state-assessment requirement.",
      facilities: noSa.map((r) => r.facility),
      tone: "grey",
      href: "/facilities?missing=saStatus",
    },
    {
      id: "no-ia",
      label: "Facilities with no internal assessment scores",
      count: noIa.length,
      definition: "Neither an NQAS nor a Kayakalp internal assessment score is recorded.",
      facilities: noIa.map((r) => r.facility),
      tone: "grey",
      href: "/facilities?missing=ia",
    },
  ];

  const reconcile: DeckReconciliation[] = [
    {
      label: "Hold a certificate = Quality + Conditional",
      ok: data.holdCertificate === data.qualityCount + data.condCount,
      detail: `${data.holdCertificate} = ${data.qualityCount} Quality Certified + ${data.condCount} with conditionality.`,
    },
    {
      label: "Hold a certificate = dated + no date",
      ok: certifiedNoDate.length === data.undated,
      detail:
        `${data.certifiedTotal} certified = ${data.certifiedTotal - data.undated} dated + ${data.undated} undated.` +
        (certifiedNoDate.length === data.undated
          ? ""
          : ` Named \"no certification date\" list has ${certifiedNoDate.length}.`),
    },
    {
      label: "Pipeline stage buckets sum to the facility count",
      ok:
        data.statusSlices.reduce((a, b) => a + b.count, 0) === data.totalFacilities,
      detail: `${data.statusSlices.reduce((a, b) => a + b.count, 0)} of ${data.totalFacilities} facilities are in exactly one stage.`,
    },
    {
      label: "Building buckets sum to the facility count",
      ok: data.buildingReconciles,
      detail: data.buildingReconciles
        ? `${data.totalFacilities} of ${data.totalFacilities} facilities are in exactly one building bucket.`
        : "Building buckets do not add up to the facility count.",
    },
    {
      label: "Fire NOC buckets sum to the facility count",
      ok:
        data.nocValid +
          data.nocExpiringSoon +
          data.nocExpired +
          data.nocRecordedNoValidity +
          data.nocNotRecorded ===
        data.totalFacilities,
      detail:
        `${data.nocValid} valid + ${data.nocExpiringSoon} expiring + ` +
        `${data.nocExpired} expired + ${data.nocRecordedNoValidity} recorded without a validity date + ` +
        `${data.nocNotRecorded} not recorded = ` +
        `${data.nocValid + data.nocExpiringSoon + data.nocExpired + data.nocRecordedNoValidity + data.nocNotRecorded} of ${data.totalFacilities} (${data.nocRecorded} recorded).`,
    },
    {
      label: "Hold a certificate = stage certified + the named difference",
      ok: data.holdCertificate === data.certifiedTotal,
      detail: data.reconciliationLine,
    },
  ];

  const active = issues.filter((i) => i.count > 0);
  const lines = active.map(
    (i) => `${i.count} — ${i.label}: ${names(rows.filter((r) => i.facilities.includes(r.facility)))}`,
  );
  if (reconcile.some((r) => !r.ok))
    lines.push(
      `Reconciliation failed: ${reconcile.filter((r) => !r.ok).map((r) => r.label).join("; ")}.`,
    );

  return {
    issues,
    totalIssues: active.length,
    lines,
    reconcile,
    failed: reconcile.filter((r) => !r.ok).length,
  };
}

/* ------------------------------------------------------------------ */
/* Fiscal / calendar cohorts (the by-year slide)                       */
/* ------------------------------------------------------------------ */

export function buildPeriodRows(
  rows: DeckRow[],
  data: DeckData,
  period: DeckPeriod,
  today: string,
): { rows: DeckPeriodRow[]; undated: DeckPeriodRow } {
  // The headline cohort is the certification-RESULT cohort — the same 73
  // facilities every other slide counts. A bare certDate is not a fourth
  // certificate (that rule produced the 74-vs-73 split). Total is always the
  // sum of Quality and Conditional computed here, never a separately
  // incremented counter, so a Total row can never disagree with its parts.
  const holdRows = rows.filter((r) => isCertifiedRow(r));
  const bucketOf = (iso: string): number =>
    period === "fy" ? fiscalYearOf(iso) : Number(iso.slice(0, 4));
  const current = period === "fy" ? currentFiscalYear(today) : Number(today.slice(0, 4));
  const previous = current - 1;

  const add = (target: DeckPeriodRow, r: DeckRow) => {
    if (isQuality(r)) target.quality += 1;
    if (isCond(r)) target.cond += 1;
    target.total = target.quality + target.cond;
  };
  const acc = new Map<number, DeckPeriodRow>();
  const earlier: DeckPeriodRow = { label: "Earlier", total: 0, quality: 0, cond: 0 };
  for (const r of holdRows) {
    if (!r.certDate) continue;
    const key = bucketOf(r.certDate);
    const label =
      period === "fy" ? fiscalYearLabel(key) : String(key);
    if (key < previous) {
      add(earlier, r);
      continue;
    }
    const row = acc.get(key) ?? { label, total: 0, quality: 0, cond: 0 };
    add(row, r);
    acc.set(key, row);
  }
  const out: DeckPeriodRow[] = [];
  for (const y of [previous, current]) {
    const found = acc.get(y);
    const label = period === "fy" ? fiscalYearLabel(y) : String(y);
    out.push(found ?? { label, total: 0, quality: 0, cond: 0 });
  }
  if (earlier.total > 0) out.unshift(earlier);
  // Any future-dated certificates would otherwise be dropped — keep them.
  for (const [key, row] of acc) {
    if (key > current) out.push(row);
  }
  const undated: DeckPeriodRow = {
    label: "No date",
    total: data.undatedQuality + data.undatedCond,
    quality: data.undatedQuality,
    cond: data.undatedCond,
  };
  return { rows: out, undated };
}

/* ------------------------------------------------------------------ */
/* Guarded narrative templates                                         */
/* ------------------------------------------------------------------ */

function strictWorst<T extends { block: string; rate: number; total: number }>(
  items: T[],
): { text: string } | null {
  const eligible = items.filter((i) => i.total > 0);
  if (eligible.length === 0) return null;
  const min = Math.min(...eligible.map((i) => i.rate));
  const tied = eligible.filter((i) => i.rate === min);
  if (tied.length === 1)
    return { text: `${tied[0].block} trails at ${min}% certified` };
  return {
    text: `${tied.length} blocks are tied at ${min}% certified (${tied
      .map((t) => t.block)
      .join(", ")})`,
  };
}

/** "18 + 13 = 31" style sentence, or a guarded fallback. */
function sumSentence(parts: number[], total: number, lead: string): string {
  if (parts.length === 0) return `${lead} ${total}.`;
  return `${lead} ${parts.join(" + ")} = ${total}.`;
}

/* ------------------------------------------------------------------ */
/* THE BUILDER                                                         */
/* ------------------------------------------------------------------ */

export function buildDeckModel(
  rows: DeckRow[],
  opts: DeckModelOptions = {},
): DeckModel {
  const today = opts.today ?? todayLocalIso();
  const district = opts.district ?? "Tirupathur";
  const period = opts.period ?? "fy";
  const filtersLabel = opts.filtersLabel ?? "All blocks · All facility types · All cycles";
  const bands = opts.rateBands ?? DEFAULT_RATE_BANDS;
  const bandTone = (rate: number): Tone =>
    rate >= bands.green ? "teal" : rate >= bands.amber ? "amber" : "coral";
  const bandLegend = `Certified rate: ${bands.green}% or more teal, ${bands.amber}–${bands.green - 1}% amber, below ${bands.amber}% coral.`;
  const data = buildDeckData(rows);
  const checks = computeDeckChecks(rows, data, today);
  const { rows: periodRows, undated: periodUndated } = buildPeriodRows(
    rows,
    data,
    period,
    today,
  );
  const currentFy = currentFiscalYear(today);
  const fyLabel = fiscalYearLabel(currentFy);
  const prevFy = fiscalYearLabel(currentFy - 1);
  const periodLabel =
    period === "fy"
      ? `Financial year ${fyLabel} (to date)`
      : `Calendar year ${today.slice(0, 4)} (to date)`;
  const meta: DeckModel["meta"] = {
    district,
    orgName: ORG_NAME,
    signature: ORG_SIGNATURE,
    deckTitle: "NQAS Summary Report",
    period,
    periodLabel,
    filtersLabel,
    dataAsOf: deckDataAsOf(),
    reportId: reportIdFor(today),
    totalFacilities: data.totalFacilities,
    holdCertificate: data.holdCertificate,
    certifiedStage: data.statusSlices.find((s) => s.label === "Certified")?.count ?? 0,
  };

  const stageCertified =
    data.statusSlices.find((s) => s.label === "Certified")?.count ?? 0;
  const reconciliation =
    data.holdCertificate === stageCertified
      ? `${data.holdCertificate} hold a certificate, all in the Certified stage.`
      : data.reconciliationLine;

  const worst = strictWorst(data.blockProgress);
  const goodBuildings = data.buildingBars.find((b) => b.label === "Good")?.count ?? 0;
  const dilapidated =
    data.buildingBars.find((b) => b.label === "Dilapidated")?.count ?? 0;
  const busiest = data.busiestPair;
  const checksWord = checks.totalIssues === 1 ? "issue" : "issues";
  const futureSurv = checks.issues.find((i) => i.id === "surveillance-future")?.count ?? 0;
  const noDate = checks.issues.find((i) => i.id === "certified-no-date")?.count ?? 0;
  const wrongStatus = checks.issues.find((i) => i.id === "certified-not-eligible")?.count ?? 0;

  const fyBucket = (label: string) =>
    periodRows.find((r) => r.label === label)?.total ?? 0;
  const currentBucket = periodRows[periodRows.length - 1];
  const prevBucket =
    periodRows.find((r) => r.label === (period === "fy" ? prevFy : String(Number(today.slice(0, 4)) - 1))) ??
    periodRows[periodRows.length - 2];

  const attention: string[] = [];
  if (data.certExpired > 0)
    attention.push(
      `${plural(data.certExpired, "certificate")} expired — recertification is the priority.`,
    );
  if (data.nocExpired > 0)
    attention.push(`${plural(data.nocExpired, "fire NOC")} expired.`);
  if (futureSurv > 0)
    attention.push(
      `${plural(futureSurv, "facility has a surveillance Done date in the future", "facilities have a surveillance Done date in the future")} (Admin → Data checks).`,
    );
  if (wrongStatus > 0)
    attention.push(
      `${plural(wrongStatus, "certified facility still says Not eligible", "certified facilities still say Not eligible")}.`,
    );
  if (data.survOverdue > 0)
    attention.push(
      `${plural(data.survOverdue, "facility is", "facilities are")} past a surveillance due date with no visit recorded.`,
    );
  if (noDate > 0)
    attention.push(
      `${plural(noDate, "certified facility has", "certified facilities have")} no certification date.`,
    );

  const slides: DeckSlide[] = [];
  const sectionOf = (id: DeckSlideId): DeckSectionId =>
    id === "title" || id === "exec" || id === "where"
      ? "summary"
      : id === "profile"
        ? "profile"
        : id === "progress" || id === "barriers"
          ? "progress"
          : id === "ia" || id === "pipeline"
            ? "assessment"
            : id === "takeaways" || id === "checks" || id === "defs"
              ? "close"
              : "certification";

  const add = (slide: Omit<DeckSlide, "section" | "sectionLabel">) => {
    const section = sectionOf(slide.id);
    slides.push({
      ...slide,
      // Part B.7: no "SECTION N · …" kickers above titles. The section is
      // still carried in the model for the rail groups and the report TOC.
      kicker: undefined,
      section,
      sectionLabel: DECK_SECTIONS.find((s) => s.id === section)?.label ?? "",
    });
  };

  /* ---- 1. Cover ---- */
  add({
    id: "title",
    variant: "cover",
    title: "NQAS Certification Summary",
    subtitle: `${district} health facilities · ${periodLabel}`,
    hero: {
      value: String(data.holdCertificate),
      label: `of ${data.totalFacilities} facilities hold an NQAS certificate (${data.certifiedPct}%)`,
    },
    columns: [
      [
        {
          kind: "text",
          body: `${filtersLabel} · ${data.qualityCount} Quality Certified · ${data.condCount} with conditionality · ${ORG_NAME}`,
        },
      ],
    ],
    speakerNotes:
      "Cover. One definition: a facility holds a certificate when its NQAS Certification Status is Quality Certified or Quality Certified with Conditionality, valid or expired. Every number in this deck and the report uses that cohort.",
  });

  /* ---- 2. Executive summary ---- */
  add({
    id: "exec",
    variant: "light",
    kicker: "EXECUTIVE SUMMARY",
    title:
      attention.length > 0
        ? `${data.holdCertificate} hold a certificate; ${attention.length} ${attention.length === 1 ? "item needs" : "items need"} attention`
        : `${data.holdCertificate} facilities hold a certificate and no exception is open`,
    subtitle: `${data.totalFacilities} facilities · ${data.blocksCount} blocks · ${periodLabel}`,
    columns: [
      [
        {
          kind: "kpis",
          items: [
            { value: String(data.totalFacilities), label: "Facilities", note: `${data.blocksCount} blocks`, tone: "blue" },
            { value: String(data.holdCertificate), label: "Hold a certificate", note: `${data.certifiedPct}% of facilities`, tone: "teal" },
            { value: String(data.qualityCount), label: "Quality Certified", tone: "teal" },
            { value: String(data.condCount), label: "With conditionality", tone: "amber" },
            { value: String(data.certExpired), label: "Certificates expired", tone: data.certExpired > 0 ? "coral" : "grey" },
            { value: String(data.notCertifiedCount), label: "Not certified", note: "in pipeline or blocked", tone: "grey" },
          ],
        },
        { kind: "text", body: reconciliation },
      ],
      [
        {
          kind: "bullets",
          title: "Needs attention",
          tone: "amber",
          items:
            attention.length > 0
              ? attention
              : ["No exceptions open in this scope."],
        },
        {
          kind: "bullets",
          title: "Data health",
          tone: checks.totalIssues > 0 ? "amber" : "teal",
          items: [
            `${checks.totalIssues} ${checksWord} in ${data.totalFacilities} facilities.`,
            ...checks.issues
              .filter((i) => i.count > 0)
              .slice(0, 3)
              // "1 — Certified facilities with no certification date." reads
              // correctly at every count; building a noun phrase from the
              // number would produce "1 certified facilities".
              .map((i) => `${i.count} — ${i.label}.`),
          ],
        },
      ],
    ],
    note: `Data as of ${meta.dataAsOf} · Report ${meta.reportId}`,
    speakerNotes:
      "Six KPI tiles plus the exceptions that need a human. Every number is clickable in the report page; the PDF and PPTX read the same model.",
  });

  /* ---- 3. Where facilities stand ---- */
  const saAwaiting = data.saCompletedAwaiting;
  const saCompletedOnly = Math.max(0, data.saCompleted - saAwaiting);
  const saSegments = [
    { label: "Completed, result issued", value: saCompletedOnly, tone: "teal" as Tone },
    { label: "Completed, awaiting result", value: saAwaiting, tone: "blue" as Tone },
    { label: "Scheduled", value: data.saScheduled, tone: "amber" as Tone },
    { label: "Yet to be initiated", value: data.saNotInitiated, tone: "light" as Tone },
    { label: "No SA entry", value: data.saNoEntry, tone: "grey" as Tone },
  ].filter((s) => s.value > 0);

  add({
    id: "where",
    variant: "light",
    title: `${data.holdCertificate} of ${data.totalFacilities} facilities hold an NQAS certificate`,
    subtitle: `${data.qualityCount} Quality Certified and ${data.condCount} with conditionality · ${data.blocksCount} blocks · ${reconciliation}`,
    columns: [
      [
        {
          kind: "bars",
          title: `Where all ${data.totalFacilities} facilities stand`,
          items: data.statusSlices.map((s) => ({
            label: s.label,
            value: s.count,
            tone: s.label === "Certified" ? "teal" : s.label === "Not eligible" ? "grey" : "blue",
          })),
          max: data.totalFacilities,
        },
      ],
      [
        {
          kind: "stacked",
          title: "State assessment records",
          segments: saSegments,
          note: `${data.saCompleted} completed in total; awaiting result is a subset, not a separate bucket.`,
        },
      ],
    ],
    note: currentBucket
      ? `${currentBucket.total} certified in ${period === "fy" ? "FY" : ""} ${currentBucket.label} to date; ${prevBucket?.total ?? 0} in the previous period.`
      : undefined,
    speakerNotes:
      "Stage buckets are mutually exclusive and sum to the facility count. “Completed, result issued” and “Completed, awaiting result” add up to Completed; they are never a funnel.",
  });

  /* ---- 4. Facility profile ---- */
  add({
    id: "profile",
    variant: "light",
    kicker: "SECTION 2 · FACILITY PROFILE",
    title:
      data.topTypeName && data.totalFacilities > 0
        ? `${pctOf(data.topTypeCount, data.totalFacilities)}% of facilities are ${data.topTypeNameLong}`
        : "No facilities in scope",
    subtitle: data.profileNote,
    columns: [
      [
        {
          kind: "bars",
          title: "By facility type",
          items: data.byTypeBars.map((b) => ({ label: b.label, value: b.count, tone: "teal" as Tone })),
        },
      ],
      [
        {
          kind: "bars",
          title: "By block (largest 8)",
          items: data.byBlockBars.map((b) => ({ label: b.label, value: b.count, tone: "blue" as Tone })),
        },
      ],
    ],
    note: "HWC HSC = Health & Wellness Centre (sub-centre) · UPHC, UHWC, UGPHC = urban facility types · SDH, DHQH = sub-division and district hospitals.",
    speakerNotes: "Where the facilities are. Counts include every facility in scope.",
  });

  /* ---- 5. Certification progress ---- */
  add({
    id: "progress",
    variant: "light",
    title: worst?.text ?? "No block has facilities in scope",
    subtitle: `${data.progressNote} State average ${data.certifiedPct}%.`,
    columns: [
      [
        {
          kind: "bars",
          title: "Certified by block (n/N and rate)",
          items: data.blockProgress.map((b) => ({
            label: `${b.block}${b.total < 10 ? " †" : ""} (${b.rate}%)`,
            value: b.certified,
            display: `${b.certified}/${b.total}`,
            tone: bandTone(b.rate),
          })),
          max: Math.max(...data.blockProgress.map((b) => b.total), 1),
          note: `State average ${data.certifiedPct}%. † fewer than 10 facilities — rate is indicative, not a ranking.`,
        },
      ],
      [
        {
          kind: "table",
          title: "Certified by facility type",
          head: ["Type", "Facilities", "Certified", "Rate"],
          rows: data.typeProgress.map((t) => [
            t.type,
            String(t.facilities),
            String(t.certified),
            `${t.rate}%`,
          ]),
          align: ["left", "right", "right", "right"],
          totalRow: [
            "All types",
            String(data.typeProgress.reduce((a, b) => a + b.facilities, 0)),
            String(data.typeProgress.reduce((a, b) => a + b.certified, 0)),
            `${pctOf(
              data.typeProgress.reduce((a, b) => a + b.certified, 0),
              Math.max(data.typeProgress.reduce((a, b) => a + b.facilities, 0), 1),
            )}%`,
          ],
          note: bandLegend,
        },
      ],
    ],
    note: bandLegend,
    speakerNotes:
      "The title names the strict worst block. If several blocks tie, the title says so rather than picking one. Bands come from one configuration object; the legend is generated from it.",
  });

  /* ---- 6. Barriers ---- */
  add({
    id: "barriers",
    variant: "light",
    kicker: "SECTION 3 · CERTIFICATION PROGRESS",
    title: `Why ${data.notCertifiedCount} facilities are not certified`,
    subtitle:
      data.barrierNotes.length > 0
        ? data.barrierNotes.slice(0, 2).join("; ") + "."
        : "No uncertified facilities in scope.",
    columns: [
      [
        {
          kind: "bars",
          title: `Uncertified facilities by main reason (n = ${data.notCertifiedCount})`,
          items: data.barrierBars.map((b) => ({
            label: b.label,
            value: b.count,
            tone: (b.tone === "teal" ? "teal" : b.tone === "coral" ? "coral" : b.tone === "amber" ? "amber" : "grey") as Tone,
          })),
        },
      ],
      [
        {
          kind: "facts",
          items: data.barrierNotes.slice(0, 3).map((note, i) => {
            const [big, ...rest] = note.split(" ");
            return {
              big: /^\d+$/.test(big) ? big : String(i + 1),
              text: rest.join(" ") || note,
              tone: i === 0 ? "coral" : i === 1 ? "amber" : "grey",
            } as { big: string; text: string; tone: Tone };
          }),
        },
      ],
    ],
    note: data.barrierFoot,
    speakerNotes: "Reasons are mutually exclusive with a documented priority order, so the bars add to the uncertified count.",
  });

  /* ---- 7. Internal assessment ---- */
  add({
    id: "ia",
    variant: "light",
    kicker: "SECTION 4 · ASSESSMENT",
    title:
      data.iaQ1Avg != null && data.iaQ2Avg != null
        ? `NQAS internal scores moved ${data.iaQ1Avg}% to ${data.iaQ2Avg}% from Q1 to Q2`
        : "Internal assessment scores are not recorded yet",
    subtitle:
      data.certifiedIaAvg != null && data.restIaAvg != null
        ? `Certified facilities average ${data.certifiedIaAvg}% against ${data.restIaAvg}% for the rest.`
        : "Q1 and Q2 are quarters of the current financial year.",
    columns: [
      [
        {
          kind: "table",
          title: `Facilities by Q2 score band (n = ${data.totalFacilities})`,
          head: ["Score band", "NQAS", "Kayakalp"],
          rows: data.scoreBands.map((b) => [b.label, String(b.nqas), String(b.kayakalp)]),
          align: ["left", "right", "right"],
          totalRow: [
            "All bands",
            String(data.scoreBands.reduce((a, b) => a + b.nqas, 0)),
            String(data.scoreBands.reduce((a, b) => a + b.kayakalp, 0)),
          ],
        },
      ],
      [
        {
          kind: "cards",
          items: [
            {
              title: "NQAS IA, Q1 to Q2",
              big: `${data.iaQ1Avg ?? "-"}% to ${data.iaQ2Avg ?? "-"}%`,
              line: `${data.iaImproved} improved · ${data.iaUnchanged} unchanged · ${data.iaDeclined} declined`,
              tone: "teal",
            },
            {
              title: "Kayakalp IA, Q1 to Q2",
              big: `${data.kkQ1Avg ?? "-"}% to ${data.kkQ2Avg ?? "-"}%`,
              line: `${data.kkImproved} improved · ${data.kkUnchanged} unchanged · ${data.kkDeclined} declined`,
              tone: "blue",
            },
            {
              title: "Certified vs not yet certified",
              big: `${data.certifiedIaAvg ?? "-"}% vs ${data.restIaAvg ?? "-"}%`,
              line: `Kayakalp: ${data.certifiedKkAvg ?? "-"}% vs ${data.restKkAvg ?? "-"}%`,
              tone: "amber",
            },
          ],
        },
      ],
    ],
    note: data.iaNote,
    speakerNotes: "Unchanged means within the shared 0.05 no-change band.",
  });

  /* ---- 8. State assessment (appendix; also charted on Where facilities stand) ---- */
  add({
    id: "pipeline",
    variant: "light",
    title: `${data.saCompleted} state assessments completed; ${data.saNoEntry} facilities have no entry`,
    subtitle:
      `${saCompletedOnly} completed with a result issued · ${saAwaiting} completed and awaiting result · ` +
      `${data.saScheduled} scheduled · ${data.saNoEntry} no SA entry = ${data.totalFacilities}`,
    columns: [
      [
        {
          kind: "stacked",
          title: "State assessment records (one stacked bar, not a funnel)",
          segments: saSegments,
        },
        {
          kind: "text",
          body:
            data.saAvgScore != null
              ? `Average state assessment score ${data.saAvgScore}%` +
                (data.saScoreRange ? ` (range ${data.saScoreRange[0]}–${data.saScoreRange[1]}%).` : ".")
              : "No state assessment score is recorded.",
        },
      ],
      [
        {
          kind: "table",
          title: "State assessment status",
          head: ["Status", "Facilities"],
          rows: [
            ["Completed (all)", String(data.saCompleted)],
            ["— Completed, result issued", String(saCompletedOnly)],
            ["— Completed, awaiting result", String(saAwaiting)],
            ["Scheduled, not done", String(data.saScheduled)],
            ["Yet to be initiated", String(data.saNotInitiated)],
            ["No SA entry", String(data.saNoEntry)],
          ],
          align: ["left", "right"],
          totalRow: ["All facilities", String(data.totalFacilities)],
        },
      ],
    ],
    note: data.saFoot,
    speakerNotes:
      "Awaiting result is a subset of Completed, never a separate bar. Older certificates pre-date state assessment, so charting certified inside these records would grow the funnel backwards.",
  });

  /* ---- 9. Buildings & fire safety ---- */
  add({
    id: "buildings",
    variant: "light",
    title: `${goodBuildings} buildings are in good condition`,
    subtitle:
      `${dilapidated} ${dilapidated === 1 ? "is" : "are"} dilapidated · ` +
      `${data.fireNocRecordedSentence} ${data.nocExpired} expired.`,
    columns: [
      [
        {
          kind: "bars",
          title: `Building condition (n = ${data.totalFacilities})`,
          items: data.buildingBars.map((b) => ({
            label: b.label,
            value: b.count,
            tone: (b.tone === "teal" ? "teal" : b.tone === "coral" ? "coral" : b.tone === "amber" ? "amber" : b.tone === "gray" ? "grey" : "light") as Tone,
          })),
          note: data.buildingReconciles
            ? `All ${data.totalFacilities} facilities are in exactly one building bucket.`
            : "Building buckets do not add up — fix the stored statuses.",
        },
      ],
      [
        {
          kind: "donut",
          title: "Fire NOC status (date-derived)",
          segments: [
            { label: "Valid", value: data.nocValid, tone: "teal" },
            { label: "Expiring soon", value: data.nocExpiringSoon, tone: "amber" },
            { label: "Expired", value: data.nocExpired, tone: "coral" },
            { label: "Recorded, no validity date", value: data.nocRecordedNoValidity, tone: "blue" },
            { label: "Not recorded", value: data.nocNotRecorded, tone: "grey" },
          ],
          centerValue: String(data.nocRecorded),
          centerLabel: `recorded of ${data.totalFacilities}`,
          caption: `${data.nocExpiredBreakdown} ${data.nocOwnership}`,
        },
      ],
    ],
    note: data.buildingUpdatedNote,
    speakerNotes:
      "Buildings use the shared bucket mapping. Fire NOC has five date-derived buckets that always sum to the facility count; Recorded, no validity date is its own bucket rather than being folded into Valid or Not recorded.",
  });

  /* ---- 10. Validity, surveillance, funds ---- */
  add({
    id: "validity",
    variant: "light",
    kicker: "SECTION 5 · CERTIFICATION & TRENDS",
    title:
      data.certExpired > 0
        ? `${data.certValid} of ${data.certifiedTotal} certificates are valid; ${data.certExpired} have expired`
        : `${data.certValid} of ${data.certifiedTotal} certificates are valid`,
    subtitle: data.followUpNote,
    columns: [
      [
        {
          kind: "cards",
          items: [
            {
              title: "Certificate validity",
              big: String(data.certValid),
              line: `of ${data.certifiedTotal} certificates are valid`,
              body: `${data.certExpired} expired${data.certNoStatus > 0 ? `, ${data.certNoStatus} with no validity recorded` : ""}. ${data.certExpiring12m} reach their validity date within 12 months.`,
              tone: "teal",
            },
          ],
        },
      ],
      [
        {
          kind: "cards",
          items: [
            {
              title: "Surveillance visits",
              big: String(data.survOverdue),
              line: "facilities are past their first-year surveillance due date",
              body: `${plural(data.survDoneAny, "visit")} recorded. ${data.survOverdue2} also past the second-year due date.`,
              tone: "amber",
            },
          ],
        },
      ],
      [
        {
          kind: "cards",
          items: [
            {
              title: "Gap-closure funds",
              big: String(data.fundsFacilities),
              line: "facilities have a gap-closure entry",
              body: `${data.fundsTotalLakh != null ? `Total ${money(Math.round(data.fundsTotalLakh * 100000))}` : "No amounts recorded"}${data.fundsReceivedRecent ? ` (${data.fundsReceivedRecent})` : ""}. ${data.fundsCertified} of them ${data.fundsCertified === 1 ? "is" : "are"} certified.`,
              tone: "blue",
            },
          ],
        },
      ],
    ],
    note: "Money is shown in exact Indian rupees. A blank amount shows -.",
    speakerNotes: "Amounts are exact rupees with Indian digit grouping (₹ 7,90,000), never a rounded figure.",
  });

  /* ---- 11. Certification over time (fiscal periods + compact month grid) ---- */
  const byPeriodBars = [
    ...periodRows.map((r) => ({
      label: period === "fy" ? `FY ${r.label}` : r.label,
      value: r.total,
      tone: "teal" as Tone,
    })),
    { label: "No date", value: periodUndated.total, tone: "grey" as Tone },
  ];
  const fyMonthRows = [currentFy - 1, currentFy].map((fy) => {
    const months = Array<number>(12).fill(0);
    for (const r of rows) {
      if (!r.certDate || !isCertifiedRow(r)) continue;
      if (fiscalYearOf(r.certDate) !== fy) continue;
      months[Number(r.certDate.slice(5, 7)) - 1] += 1;
    }
    return {
      label:
        fy === currentFy
          ? `FY ${fiscalYearLabel(fy)} (to date)`
          : `FY ${fiscalYearLabel(fy)}`,
      cells: months,
      total: months.reduce((a, b) => a + b, 0),
    };
  });
  const fyMonthTotals = MONTH_ABBR.map((_, i) =>
    fyMonthRows.reduce((a, r) => a + (r.cells[i] ?? 0), 0),
  );
  add({
    id: "byYear",
    variant: "light",
    title: periodBucketLead(
      currentBucket?.label,
      period,
      currentBucket?.total ?? 0,
      prevBucket?.total ?? 0,
    ),
    subtitle: `${periodLabel} · ${period === "fy" ? "April to March" : "January to December"} · ${data.holdCertificate} certifications in total`,
    columns: [
      [
        {
          kind: "bars",
          title: `Certifications by ${period === "fy" ? "fiscal year" : "calendar year"}`,
          items: byPeriodBars,
          note: periodUndated.total > 0 ? `${periodUndated.total} ${periodUndated.total === 1 ? "certified facility has" : "certified facilities have"} no date and ${periodUndated.total === 1 ? "is" : "are"} shown as "No date".` : undefined,
        },
        {
          kind: "heatmap",
          title: "Month pattern · current and previous fiscal year",
          monthLabels: MONTH_ABBR,
          rows: fyMonthRows,
          totalLabel: "Total",
          totalCells: fyMonthTotals,
          grandTotal: fyMonthTotals.reduce((a, b) => a + b, 0),
        },
      ],
      [
        {
          kind: "table",
          title: "Quality, conditionality and total",
          head: ["Period", "Quality", "Conditional", "Total"],
          rows: [
            ...periodRows.map((r) => [
              period === "fy" ? `FY ${r.label}` : r.label,
              String(r.quality),
              String(r.cond),
              String(r.total),
            ]),
            ["No date", String(periodUndated.quality), String(periodUndated.cond), String(periodUndated.total)],
          ],
          align: ["left", "right", "right", "right"],
          totalRow: [
            "All",
            String([...periodRows, periodUndated].reduce((a, b) => a + b.quality, 0)),
            String([...periodRows, periodUndated].reduce((a, b) => a + b.cond, 0)),
            String([...periodRows, periodUndated].reduce((a, b) => a + b.total, 0)),
          ],
          note: "Total is always Quality + Conditional, computed in code. No date is included in All.",
        },
      ],
    ],
    speakerNotes:
      "Fiscal years are April–March and are the default. The No date row is part of the total, so the chart always sums to the headline. The compact month grid follows the same period switch.",
  });

  /* ---- 12. Heatmap ---- */
  add({
    id: "heatmap",
    variant: "light",
    kicker: "SECTION 5 · CERTIFICATION & TRENDS",
    title: busiest
      ? `${busiest.months} are the busiest months`
      : "Month-by-month certification pattern",
    subtitle: busiest
      ? `${busiest.count} of ${data.grandTotalDated} dated certifications (${busiest.sharePct}%) fall in those two months.`
      : "Certifications per month, by year.",
    columns: [
      [
        {
          kind: "heatmap",
          monthLabels: MONTH_ABBR,
          rows: data.yearMonth.map((ym) => ({
            label: ym.yearLabel,
            cells: ym.months,
            total: ym.total,
          })),
          totalLabel: "All years",
          totalCells: MONTH_ABBR.map((_, i) =>
            data.yearMonth.reduce((a, ym) => a + (ym.months[i] ?? 0), 0),
          ),
          grandTotal: data.grandTotalDated,
        },
      ],
    ],
    note: data.heatmapNote,
    speakerNotes: "Single-hue 5-step scale. Every cell carries its number, so the table reads in black and white.",
  });

  /* ---- 13/14. Month-by-month (calendar mode only) ----
   * A financial-year deck must not contain "2025"/"2026" slices: its rows
   * are FY 2025-26 and FY 2026-27, already charted on the by-year slide.
   * These two tables therefore exist only when the period switch is set to
   * Calendar; in FY mode they are absent, not merely hidden. */
  const yearIds: DeckSlideId[] = ["yearA", "yearB"];
  const monthTables = period === "calendar" ? data.yearDetails.slice(-2) : [];
  for (const yd of monthTables) {
    const months = yd.months;
    const qualityTotal = months.reduce((a, m) => a + m.quality, 0);
    const condTotal = months.reduce((a, m) => a + m.cond, 0);
    const notRecorded = Math.max(0, yd.total - qualityTotal - condTotal);
    add({
      id: yearIds[data.yearDetails.indexOf(yd)] ?? "yearB",
      variant: "light",
      kicker: "SECTION 5 · CERTIFICATION & TRENDS",
      title: `${yd.year}: ${sumSentence([qualityTotal, condTotal], yd.total, "certifications break down as")}`,
      subtitle: yd.headline,
      columns: [
        [
          {
            kind: "bars",
            title: `${yd.year} month by month`,
            items: MONTH_ABBR.map((label, i) => {
              const m = months.find((x) => x.month === i + 1);
              return { label, value: m?.total ?? 0, tone: "teal" as Tone };
            }),
          },
        ],
        [
          {
            kind: "table",
            title: "Month table (Quality | Conditional | Total)",
            head: ["Month", "Quality", "Conditional", "Total"],
            rows: [
              ...months.map((m) => [
                m.label,
                String(m.quality),
                String(m.cond),
                String(m.total),
              ]),
              ...(notRecorded > 0
                ? [["Result not recorded", "0", "0", String(notRecorded)]]
                : []),
            ],
            align: ["left", "right", "right", "right"],
            totalRow: [
              "Total",
              String(qualityTotal),
              String(condTotal),
              String(yd.total),
            ],
          },
        ],
      ],
      note: `Facility mix: ${yd.typeMix || "-"} · Assessment mode: Virtual ${yd.virtualCount} · Physical ${yd.physicalCount}.`,
      speakerNotes:
        "The Total row is computed from the column sums. Any dated row with no result is disclosed as its own row.",
    });
  }

  /* ---- 15. What needs action (generated from Needs attention) ---- */
  const actionItems = checks.issues
    // "Result with no date" is a superset of the certified-no-date check;
    // listing both would double-count the same rows on one slide.
    .filter((issue) => issue.count > 0 && issue.id !== "result-no-date")
    .slice(0, 6)
    .map((issue, index) => ({
      n: index + 1,
      title: issue.label,
      body:
        `${plural(issue.count, "facility", "facilities")} — ` +
        issue.facilities.slice(0, 4).join(", ") +
        (issue.facilities.length > 4 ? `, +${issue.facilities.length - 4} more` : ""),
    }));
  add({
    id: "takeaways",
    variant: "dark",
    title: "What needs action",
    subtitle: `${actionItems.length} ${actionItems.length === 1 ? "action" : "actions"} across ${data.totalFacilities} facilities · ${data.blocksCount} blocks`,
    columns: [
      [
        {
          kind: "takeaways",
          items:
            actionItems.length > 0
              ? actionItems
              : [{ n: 1, title: "No exceptions open", body: "Every reconciliation passes in this scope." }],
        },
      ],
    ],
    speakerNotes:
      (actionItems.length > 0
        ? actionItems
            .map(
              (item, index) =>
                `${index + 1}. ${item.title}: ${checks.issues.find((i) => i.label === item.title)?.facilities.join(", ") ?? ""}`,
            )
            .join("\n")
        : "No exceptions open.") +
      `\nFull lists: ${checks.issues.filter((i) => i.count > 0).map((i) => `${i.label} (${i.count}) — ${i.href ?? "Master List"}`).join("; ")}`,
  });

  /* ---- 16. Data checks ---- */
  add({
    id: "checks",
    variant: "light",
    kicker: "SECTION 6 · CLOSE",
    title:
      checks.totalIssues > 0
        ? `Data check: ${checks.totalIssues} ${checksWord} in ${data.totalFacilities} facilities`
        : "Data check: every number reconciles",
    subtitle:
      checks.totalIssues > 0
        ? "Each count has ONE definition and a named list. Fix the amber rows first; coral rows are blocking."
        : "Bucket sums, the certified reconciliation and the Fire NOC total all agree.",
    columns: [
      [
        {
          kind: "table",
          title: "Checks with a named list",
          head: ["Check", "Facilities", "Definition"],
          rows: checks.issues.map((i) => [
            i.label,
            String(i.count),
            i.definition.length > 92 ? `${i.definition.slice(0, 89)}…` : i.definition,
          ]),
          align: ["left", "right", "left"],
        },
      ],
      [
        {
          kind: "bullets",
          title: "Reconciliation",
          tone: checks.failed > 0 ? "coral" : "teal",
          items: checks.reconcile.map(
            (r) => `${r.ok ? "PASS" : "FAIL"} — ${r.label}: ${r.detail}`,
          ),
        },
      ],
    ],
    note:
      checks.issues.find((i) => i.id === "certified-no-date")?.count
        ? `No date = ${checks.issues.find((i) => i.id === "certified-no-date")?.count} certified facilities; the “result but no date” list is a superset and is not added to it.`
        : "No certification-date exceptions.",
    dataCheck: { issues: checks.totalIssues, text: `${checks.totalIssues} data ${checksWord}` },
    speakerNotes:
      "One definition per row. The “certified with no date” check is the only one that feeds the No date row; the “result with no date” list is a superset and is never added to it.",
  });

  /* ---- 17. Definitions ---- */
  add({
    id: "defs",
    variant: "light",
    kicker: "SECTION 6 · CLOSE",
    title: "Definitions and method",
    subtitle: "One rule set for every number in this deck, the report page, the dashboard and the exports.",
    columns: [
      [
        {
          kind: "defs",
          items: [
            ...data.definitions,
            {
              term: "Fiscal vs calendar",
              definition:
                "Fiscal year = April to March, the default. Calendar year = January to December. The switch relabels the by-year slide and never changes a facility's own dates.",
            },
            {
              term: "No date",
              definition:
                `${periodUndated.total} certified ${periodUndated.total === 1 ? "facility has" : "facilities have"} a result but no certification date, so ${periodUndated.total === 1 ? "it cannot" : "they cannot"} be placed in a year. ${periodUndated.total === 1 ? "It is" : "They are"} shown as ${periodUndated.total === 1 ? "its" : "their"} own row and included in the headline.`,
            },
            {
              term: "Data checks",
              definition:
                "Each check has one definition and a named list. Reconciliation must pass before the deck is considered final; State Admins may still download a deck with a data-check stamp.",
            },
          ],
        },
      ],
    ],
    note: `${ORG_NAME} · ${meta.reportId} · ${meta.dataAsOf}`,
    speakerNotes:
      "Definitions are generated from the same rule set as the numbers. If a rule changes, this slide changes in the same build.",
  });

  return {
    slides,
    data,
    checks,
    meta,
    periodRows,
    periodUndated,
  };
}

/** First line of the by-year action title, guarded for zero buckets. */
function periodBucketLead(
  label: string | undefined,
  period: DeckPeriod,
  current: number,
  previous: number,
): string {
  if (current === 0 && previous === 0)
    return "No certification is dated in the last two periods";
  const noun = period === "fy" ? `FY ${label}` : String(label);
  return `${previous} certified in the previous ${period === "fy" ? "fiscal year" : "year"}; ${current} so far in ${noun}`;
}
