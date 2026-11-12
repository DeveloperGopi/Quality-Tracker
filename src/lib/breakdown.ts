/**
 * PROGRESS BREAKDOWN — the ONE model behind the dashboard's "Progress breakdown"
 * card, its three views (bar-table, heatmap, size & share), its Excel/PDF
 * exports and the deck preview.
 *
 * Why this module exists — the root cause of the "bar disagrees with the
 * label" bug on the old "Progress by block" card: that card bucketed every
 * facility by the shared lifecycle SEGMENT (convex/lifecycle
 * `deriveFlatLifecycle`), whose `dueSoon` segment really means **result
 * awaited** (certResult "Result Awaited", currentStatus "Result Awaited" /
 * "Recertification Due" / "SA Completed — NQAS Awaited", or the documents
 * stage "NA Completed & Awaiting Results") — NOT facilities certified with a
 * recertification coming up. The bar painted that segment amber, the same
 * fill the legend gave "Conditional", while the row label counted only
 * certified + conditional. So the "gold" paint equalled conditional +
 * result-awaited (15 + 14 = 29 facilities) and the coloured bar length was
 * always 100% while the "8/13" label counted 8.
 *
 * This module fixes all of that by construction:
 *   • buckets are MUTUALLY EXCLUSIVE and sum to n for every row,
 *   • "Recertification due" and "Surveillance due" are OVERLAYS (badges on
 *     the row, never segments — a certified facility keeps its certified
 *     bucket even when its validity window opens),
 *   • the rate = hold-a-certificate ÷ n (or ÷ eligible facilities),
 *   • the state average and each row's gap to it are computed HERE, so no
 *     component ever invents its own counts,
 *   • segment widths are count/n from this exact function, so the bar can
 *     never disagree with the label again.
 *
 * Everything is PURE (rows in, model out; today/leadDays injectable) so
 * scripts/breakdown.test.ts can pin the golden fixture and the contract
 * (sums, rates, small-group rule, drill-down URLs).
 */

/** The mutually exclusive buckets, in drawn order (config decides colours). */
export const BREAKDOWN_BUCKETS = [
  {
    key: "qualityCertified",
    label: "Quality Certified",
    i18n: "bd.bucket.qualityCertified",
    colour: "oklch(0.62 0.15 165)",
    /** Patterns are the second encoding (colour-blind + greyscale): solid. */
    pattern: "solid" as const,
    description:
      "Passed the NQAS assessment with no conditions attached (incl. the legacy “Certified — Surveillance Due” spelling).",
  },
  {
    key: "conditional",
    label: "Certified with conditionality",
    i18n: "bd.bucket.conditional",
    colour: "oklch(0.85 0.14 95)",
    /** Diagonal hatch — never confused with the deep orange beside it. */
    pattern: "hatch" as const,
    description:
      "Certified with conditions to close. Together with Quality Certified this is “hold a certificate”, the number the rate uses.",
  },
  {
    key: "resultAwaited",
    label: "Result awaited / documents in process",
    i18n: "bd.bucket.resultAwaited",
    colour: "oklch(0.68 0.17 45)",
    pattern: "solid" as const,
    description:
      "Assessment done or result pending — incl. “Result Awaited”, “Recertification Due” and “SA Completed — NQAS Awaited”. This is exactly the count the Result-awaited pipeline card shows.",
  },
  {
    key: "inProgress",
    label: "In progress (assessment stages)",
    i18n: "bd.bucket.inProgress",
    colour: "oklch(0.58 0.14 250)",
    pattern: "solid" as const,
    description:
      "SA / NQAS assessment scheduled or open (“SA Scheduled”, “NA Scheduled”, legacy NQAS wording, “Eligible for Re-Assessment”).",
  },
  {
    key: "deferred",
    label: "Deferred",
    i18n: "bd.bucket.deferred",
    colour: "oklch(0.55 0.2 25)",
    pattern: "solid" as const,
    description:
      "Deferred — cooling period. Not certified, not awaiting a result.",
  },
  {
    key: "eligibleNotStarted",
    label: "Eligible — not started",
    i18n: "bd.bucket.eligibleNotStarted",
    colour: "oklch(0.82 0.02 260)",
    pattern: "solid" as const,
    description:
      "Eligible facilities with “SA Not Yet Initiated” (and blanks) — the not-yet-workload.",
  },
  {
    key: "notEligible",
    label: "Not eligible",
    i18n: "bd.bucket.notEligible",
    colour: "oklch(0.72 0.02 260)",
    /** Dots — the muted bucket is never merged into "Not started". */
    pattern: "dots" as const,
    description:
      "Stored eligibility is Not Eligible. Never counted in the rate.",
  },
] as const;

export type BreakdownBucket = (typeof BREAKDOWN_BUCKETS)[number]["key"];

/** Draw order for every bar, legend and export column. */
export const BUCKET_ORDER: BreakdownBucket[] = BREAKDOWN_BUCKETS.map((b) => b.key);

export const BUCKET_BY_KEY = Object.fromEntries(
  BREAKDOWN_BUCKETS.map((b) => [b.key, b]),
) as Record<BreakdownBucket, (typeof BREAKDOWN_BUCKETS)[number]>;

/** A facility reduced to exactly what the breakdown reads. Blanks are
 *  handled — never counted as a 0 in a rate. */
export type BreakdownFacility = {
  block: string | null;
  phc: string | null;
  facilityType: string | null;
  /** Facility Current Status (the auto/manual status). */
  currentStatus: string | null;
  /** Stored NQAS certification result (nqas.certificationStatus). */
  certStatus: string | null;
  /** Stored eligibility — "Eligible" | "Not Eligible" | "Possible". */
  eligibility: string | null;
  /** SaQsham documents stage (sa.generalDocStatus). */
  docStatus: string | null;
  /** Overlay inputs: certificate validity + surveillance visits. */
  validityDate?: string | null;
  surveillanceDue1?: string | null;
  surveillanceDone1?: string | null;
  surveillanceDue2?: string | null;
  surveillanceDone2?: string | null;
};

/** Blank-safe trim — mirrors the master list's fold rule so the card and the
 *  drill-down list speak one language. */
function folded(text: string | null | undefined): string {
  return (text ?? "").trim();
}

/** Does the stored eligibility say Not Eligible (any historical wording)? */
export function isNotEligibility(eligibility: string | null | undefined): boolean {
  const e = folded(eligibility).toLowerCase();
  return (
    e.startsWith("not") ||
    e.includes("inelig") ||
    e.includes("in-elig") ||
    e.includes("in elig")
  );
}

/** THE bucket rule — one facility, exactly one bucket, in priority order.
 *  Mirrors `deriveFlatLifecycle` (convex/lifecycle — the shared rule behind
 *  the KPIs, stage strip and pipeline cards), adds the eligibility gate and
 *  the "eligible — not started" split on top. */
export function breakdownBucketOf(f: BreakdownFacility): BreakdownBucket {
  const current = folded(f.currentStatus);
  const result = folded(f.certStatus) || null;

  // 1. The eligibility gate is a lifecycle of its own — before the path.
  if (isNotEligibility(f.eligibility)) return "notEligible";

  // 2. A stored result decides certification / conditionality / deferral
  //    exactly like deriveFlatLifecycle (incl. the legacy fallbacks).
  if (
    result === "Quality Certified" ||
    (!result && current === "Certified — Surveillance Due")
  )
    return "qualityCertified";
  if (
    result === "Quality Certified with Conditionality" ||
    (!result && current === "Certified with Conditionality")
  )
    return "conditional";
  if (result === "Deferred" || (!result && current.startsWith("Deferred")))
    return "deferred";

  // 3. Result awaited — the result is primary, then the current status, then
  //    the documents stage. Matches deriveFlatLifecycle.isResultAwaited,
  //    therefore the Result-awaited count on the pipeline cards.
  if (
    result === "Result Awaited" ||
    current === "Result Awaited" ||
    current === "Recertification Due" ||
    current === "SA Completed — NQAS Awaited" ||
    (folded(f.docStatus) === "NA Completed & Awaiting Results" &&
      current !== "Facility (Future Candidate)" &&
      current !== "SA Not Yet Initiated")
  )
    return "resultAwaited";

  // 4. Assessment stages in progress.
  if (
    current.startsWith("SA Scheduled") ||
    current.startsWith("NA Scheduled") ||
    current.startsWith("NQAS") ||
    current.startsWith("SA Completed") ||
    current === "Eligible for Re-Assessment"
  )
    return "inProgress";

  // 5. Everything else (incl. blanks) is starting work.
  return "eligibleNotStarted";
}

/* ------------------------------------------------------------------ */
/* buildBreakdown — the one aggregation (Part A.1)                     */
/* ------------------------------------------------------------------ */

export type BreakdownDimension = "block" | "type" | "phc";

/** The card's three views; "heat" and "size" load lazily. */
export type BreakdownView = "bars" | "heat" | "size";

export type BuildBreakdownOptions = {
  dimension: BreakdownDimension;
  /** Small-group window (admin setting; default 10). Rows below it are
   *  `small` and excluded from the Best / Needs-attention ruling. */
  minGroupSize?: number;
  /** Rate denominator — "all" (default) or "eligible" only. */
  denominator?: "all" | "eligible";
  /** Overlays: facility counts inside this window, overdue included. */
  today?: string;
  leadDays?: number;
};

/** One aggregated row (a block / type / PHC group). */
export type BreakdownRow = {
  key: string;
  label: string;
  n: number;
  /** Facilities with stored eligibility "Eligible" (the optional denominator). */
  eligibleN: number;
  /** Mutually exclusive — always sums to n. */
  buckets: Record<BreakdownBucket, number>;
  /** Quality Certified + Conditional = hold a certificate. */
  holdCert: number;
  /** Rounded to 1 decimal. */
  rate: number;
  /** rate − scope average, in percentage points (1 decimal). */
  vsAvgPoints: number;
  /** Below the admin small-group window. */
  small: boolean;
  /** Overlays — certified-but-recert-due / outstanding surveillance visits. */
  overlays: { recertDue: number; surveillanceDue: number };
};

export type Breakdown = {
  dimension: BreakdownDimension;
  /** What the first column is called ("Block" / "Facility type" / "PHC"). */
  scopeLabel: string;
  denominator: "all" | "eligible";
  minGroupSize: number;
  total: number;
  eligibleN: number;
  quality: number;
  conditional: number;
  holdCert: number;
  /** The scope (state) average, in %. */
  avgPct: number;
  rows: BreakdownRow[];
  /** The pinned "All facilities" total row. */
  grand: BreakdownRow;
};

const emptyBuckets = (): Record<BreakdownBucket, number> =>
  Object.fromEntries(BUCKET_ORDER.map((k) => [k, 0])) as Record<BreakdownBucket, number>;

function groupKeyOf(f: BreakdownFacility, dimension: BreakdownDimension): string {
  if (dimension === "block") return folded(f.block) || "—";
  if (dimension === "type") return folded(f.facilityType) || "—";
  return folded(f.phc) || folded(f.block) || "—";
}

/** Calendar days from `today` to `iso` (null when missing/unparseable). */
function daysUntil(iso: string | null | undefined, today: string): number | null {
  if (!iso) return null;
  const t = Date.parse(iso + "T12:00:00");
  const n = Date.parse(today + "T12:00:00");
  if (Number.isNaN(t) || Number.isNaN(n)) return null;
  return Math.round((t - n) / 86_400_000);
}

/** Overlays on one facility: certified-but-recert-due (validity opens within
 *  `lead` days, overdue counts) and outstanding surveillance visits due
 *  within/at the same window. Overlays never move a facility out of its
 *  bucket — that is exactly the old bug, fixed here. */
function overlaysOf(f: BreakdownFacility, today: string, lead: number) {
  const bucket = breakdownBucketOf(f);
  const holds = bucket === "qualityCertified" || bucket === "conditional";
  const daysToValidity = daysUntil(f.validityDate, today);
  const recert = holds && f.validityDate && daysToValidity != null && daysToValidity <= lead ? 1 : 0;
  const survDue = (due: string | null, done: string | null) => {
    const d = daysUntil(due, today);
    return !done && d != null && d <= lead ? 1 : 0;
  };
  return {
    recertDue: recert,
    surveillanceDue:
      survDue(f.surveillanceDue1 ?? null, f.surveillanceDone1 ?? null) +
      survDue(f.surveillanceDue2 ?? null, f.surveillanceDone2 ?? null),
  };
}

const round1 = (x: number) => Math.round(x * 10) / 10;

/** The rate for one group — Hold a certificate ÷ denominator count. */
export function rateOf(hold: number, denominatorCount: number): number {
  return denominatorCount > 0 ? round1((hold / denominatorCount) * 100) : 0;
}

/** Build the model. The CALLER memoizes by (rows, dimension, options) — this
 *  function is O(n) with no allocation per bucket beyond one object per row. */
export function buildBreakdown(
  rows: readonly BreakdownFacility[],
  opts: BuildBreakdownOptions,
): Breakdown {
  const dimension = opts.dimension;
  const minGroupSize = opts.minGroupSize ?? 10;
  const denominator = opts.denominator ?? "all";
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const lead = opts.leadDays ?? 30;

  const groups = new Map<
    string,
    {
      n: number;
      eligibleN: number;
      buckets: Record<BreakdownBucket, number>;
      recertDue: number;
      surveillanceDue: number;
    }
  >();
  for (const f of rows) {
    const key = groupKeyOf(f, dimension);
    const g =
      groups.get(key) ??
      { n: 0, eligibleN: 0, buckets: emptyBuckets(), recertDue: 0, surveillanceDue: 0 };
    g.n += 1;
    if (folded(f.eligibility) === "Eligible") g.eligibleN += 1;
    g.buckets[breakdownBucketOf(f)] += 1;
    const ov = overlaysOf(f, today, lead);
    g.recertDue += ov.recertDue;
    g.surveillanceDue += ov.surveillanceDue;
    groups.set(key, g);
  }

  const scopeLabel =
    dimension === "block" ? "Block" : dimension === "type" ? "Facility type" : "PHC";

  const rowsOut: BreakdownRow[] = [...groups.entries()].map(([key, g]) => {
    const hold = g.buckets.qualityCertified + g.buckets.conditional;
    const denomCount = denominator === "eligible" ? g.eligibleN : g.n;
    return {
      key,
      label: key,
      n: g.n,
      eligibleN: g.eligibleN,
      buckets: { ...g.buckets },
      holdCert: hold,
      rate: rateOf(hold, denomCount),
      vsAvgPoints: 0, // filled in once the scope average exists
      small: g.n < minGroupSize,
      overlays: { recertDue: g.recertDue, surveillanceDue: g.surveillanceDue },
    };
  });

  const total = rowsOut.reduce((a, r) => a + r.n, 0);
  const eligibleTotal = rowsOut.reduce((a, r) => a + r.eligibleN, 0);
  const holdTotal = rowsOut.reduce((a, r) => a + r.holdCert, 0);
  const avgPct =
    denominator === "eligible"
      ? rateOf(holdTotal, eligibleTotal)
      : rateOf(holdTotal, total);
  for (const r of rowsOut) r.vsAvgPoints = round1(r.rate - avgPct);

  const grand: BreakdownRow = {
    key: "__all__",
    label: "All facilities",
    n: total,
    eligibleN: eligibleTotal,
    buckets: emptyBuckets(),
    holdCert: holdTotal,
    rate: avgPct,
    vsAvgPoints: 0,
    small: false,
    overlays: rowsOut.reduce(
      (a, r) => ({
        recertDue: a.recertDue + r.overlays.recertDue,
        surveillanceDue: a.surveillanceDue + r.overlays.surveillanceDue,
      }),
      { recertDue: 0, surveillanceDue: 0 },
    ),
  };
  for (const r of rowsOut) for (const k of BUCKET_ORDER) grand.buckets[k] += r.buckets[k];

  return {
    dimension,
    scopeLabel,
    denominator,
    minGroupSize,
    total,
    eligibleN: eligibleTotal,
    quality: grand.buckets.qualityCertified,
    conditional: grand.buckets.conditional,
    holdCert: holdTotal,
    avgPct,
    rows: rowsOut,
    grand,
  };
}

/* ------------------------------------------------------------------ */
/* Sorting (B1) — ties keep a stable name order                        */
/* ------------------------------------------------------------------ */

export type BreakdownSortId = "rateDesc" | "rateAsc" | "sizeDesc" | "gap" | "name";

export const SORT_OPTIONS: { id: BreakdownSortId; label: string }[] = [
  { id: "rateDesc", label: "Rate high → low (default)" },
  { id: "rateAsc", label: "Rate low → high" },
  { id: "sizeDesc", label: "Facilities (largest first)" },
  { id: "gap", label: "Gap to average" },
  { id: "name", label: "Name (A → Z)" },
];

/** Sort rows without mutating the caller's array. Ties fall back to the
 *  group name so repeated sorts are stable and never flicker. */
export function sortBreakdownRows(
  rows: readonly BreakdownRow[],
  sort: BreakdownSortId,
): BreakdownRow[] {
  const byName = (a: BreakdownRow, b: BreakdownRow) => a.label.localeCompare(b.label);
  const sorted = [...rows];
  if (sort === "name") return sorted.sort(byName);
  if (sort === "sizeDesc")
    return sorted.sort((a, b) => b.n - a.n || byName(a, b));
  if (sort === "rateDesc")
    return sorted.sort((a, b) => b.rate - a.rate || b.n - a.n || byName(a, b));
  if (sort === "rateAsc")
    return sorted.sort((a, b) => a.rate - b.rate || b.n - a.n || byName(a, b));
  // "gap": distance to the average — the row whose gap is most negative first.
  return sorted.sort((a, b) => a.vsAvgPoints - b.vsAvgPoints || byName(a, b));
}

/* ------------------------------------------------------------------ */
/* Takeaway (B5) — a guarded template, strictly truthful               */
/* ------------------------------------------------------------------ */

/** The one-line takeaway above the chart. Rules:
 *  • null when the denominator is 0 or the scope is empty;
 *  • only a STRICT winner produces a sentence (ties are stated as ties —
 *    "no group stands out" once, not one sentence per row);
 *  • no strict winner → the tie sentence with the scope average;
 *  • every number equals the chart rows passed in. */
export function breakdownTakeaway(
  rows: readonly BreakdownRow[],
  avgPct: number,
  total: number,
  holdCert: number,
): string | null {
  if (total <= 0) return null;
  if (holdCert === 0)
    return "No group holds a certificate yet — the scope average is 0%.";
  const big = rows.filter((r) => !r.small);
  const best = big.filter((r) => r.rate === Math.max(...big.map((x) => x.rate)));
  const worst = big.filter((r) => r.rate === Math.min(...big.map((x) => x.rate)));
  const fmt = (r: BreakdownRow) =>
    `${r.label} at ${r.rate}% (${r.holdCert} of ${r.n})`;
  if (best.length === 1)
    return `${fmt(best[0])} leads, ${
      best[0].vsAvgPoints >= 0 ? "+" : ""
    }${best[0].vsAvgPoints} points versus the scope average of ${avgPct}%.`;
  if (worst.length === 1 && worst[0].vsAvgPoints <= -10)
    return `${fmt(worst[0])} trails, ${worst[0].vsAvgPoints} points below the scope average of ${avgPct}%.`;
  return `No group stands out — every sizable group sits between ${Math.min(
    ...big.map((x) => x.rate),
  )}% and ${Math.max(...big.map((x) => x.rate))}% (average ${avgPct}%).`;
}

/* ------------------------------------------------------------------ */
/* Badges (B1) — the stated Best / Needs-attention rule                */
/* ------------------------------------------------------------------ */

export type RowBadge = "best" | "attention" | null;

/** The badge rule, stated once so the tooltip can quote it verbatim:
 *  **Best = the highest rate among groups at/above the minimum size;
 *  Needs attention = the lowest rate AND at least 10 points under the
 *  scope average. A tie means NO badge — never a silent pick.** The grand
 *  row and small groups are excluded. */
export function rowBadgeFor(
  row: BreakdownRow,
  rows: readonly BreakdownRow[],
  avgPct: number,
): RowBadge {
  const big = rows.filter((r) => !r.small && r.n > 0);
  if (big.length === 0 || !big.some((r) => r.key === row.key)) return null;
  const rates = big.map((r) => r.rate);
  if (big.filter((r) => r.rate === Math.max(...rates)).length === 1 &&
    row.rate === Math.max(...rates))
    return "best";
  if (
    big.filter((r) => r.rate === Math.min(...rates)).length === 1 &&
    row.rate === Math.min(...rates) &&
    row.vsAvgPoints <= -10
  )
    return "attention";
  return null;
}

/* ------------------------------------------------------------------ */
/* Heatmap (B2) — Block × Type cross-tab                                */
/* ------------------------------------------------------------------ */

export type HeatmapCell = {
  blockKey: string;
  typeKey: string;
  n: number;
  holdCert: number;
  ratePct: number;
  /** n < 3 → diagonal hatch + "small" tooltip; combinations with no
   *  facilities are "–" and not clickable. */
  present: boolean;
  small: boolean;
};

export type BlockTypeHeatmap = {
  blockKeys: string[];
  typeKeys: string[];
  cells: Map<string, HeatmapCell>;
  /** Row/column totals — same numbers the bar-table rows carry. */
  rowTotals: Map<string, { n: number; holdCert: number; ratePct: number }>;
  colTotals: Map<string, { n: number; holdCert: number; ratePct: number }>;
  avgPct: number;
};

const cellKey = (b: string, t: string) => `${b}\u0000${t}`;

/** Block × Type cross-tab of the SAME facilities (identical numbers to
 *  buildBreakdown by construction — a cell aggregates the same rows). */
export function buildBlockTypeHeatmap(
  rows: readonly BreakdownFacility[],
): BlockTypeHeatmap {
  /** The brief's rule: cells with n below 3 get the hatch + "small" tip. */
  const smallLimit = 3;
  const agg = new Map<
    string,
    { block: string; type: string; n: number; hold: number; eligible: number }
  >();
  const blocks = new Set<string>();
  const types = new Set<string>();
  for (const f of rows) {
    const b = folded(f.block) || "—";
    const t = folded(f.facilityType) || "—";
    blocks.add(b);
    types.add(t);
    const k = cellKey(b, t);
    const g = agg.get(k) ?? { block: b, type: t, n: 0, hold: 0, eligible: 0 };
    g.n += 1;
    const bucket = breakdownBucketOf(f);
    if (bucket === "qualityCertified" || bucket === "conditional") g.hold += 1;
    if (folded(f.eligibility) === "Eligible") g.eligible += 1;
    agg.set(k, g);
  }
  const cells = new Map<string, HeatmapCell>();
  const rowTotals = new Map<string, { n: number; holdCert: number; ratePct: number }>();
  const colTotals = new Map<string, { n: number; holdCert: number; ratePct: number }>();
  let totalN = 0;
  let totalHold = 0;
  for (const g of agg.values()) {
    const present = true;
    cells.set(cellKey(g.block, g.type), {
      blockKey: g.block,
      typeKey: g.type,
      n: g.n,
      holdCert: g.hold,
      ratePct: rateOf(g.hold, g.n),
      present: true,
      small: g.n < smallLimit,
    });
    const rt = rowTotals.get(g.block) ?? { n: 0, holdCert: 0, ratePct: 0 };
    rt.n += g.n;
    rt.holdCert += g.hold;
    rowTotals.set(g.block, rt);
    const ct = colTotals.get(g.type) ?? { n: 0, holdCert: 0, ratePct: 0 };
    ct.n += g.n;
    ct.holdCert += g.hold;
    colTotals.set(g.type, ct);
    totalN += g.n;
    totalHold += g.hold;
  }
  for (const [key, t] of rowTotals) rowTotals.set(key, { ...t, ratePct: rateOf(t.holdCert, t.n) });
  for (const [key, t] of colTotals) colTotals.set(key, { ...t, ratePct: rateOf(t.holdCert, t.n) });
  return {
    blockKeys: [...blocks].sort((a, b) => a.localeCompare(b)),
    typeKeys: [...types].sort(
      (a, b) => (colTotals.get(b)?.n ?? 0) - (colTotals.get(a)?.n ?? 0) || a.localeCompare(b),
    ),
    cells,
    rowTotals,
    colTotals,
    avgPct: rateOf(totalHold, totalN),
  };
}

/* ------------------------------------------------------------------ */
/* Colour: oklch → sRGB (for jsPDF, which only paints RGB)             */
/* ------------------------------------------------------------------ */

/** Convert `oklch(L C H)` (the token format BUCKET_BY_KEY uses) to 0-255 RGB
 *  — the standard Ottosson OKLab→linear-sRGB math with gamma encoding. Used
 *  by the PDF's vector chart so the on-screen palette and the printed one
 *  are THE SAME colours, never hand-copied approximations. */
export function oklchToRgb(colour: string): [number, number, number] {
  const m = /^oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/.exec(colour.trim());
  if (!m) return [89, 89, 89];
  const L = Number(m[1]);
  const C = Number(m[2]);
  const hDeg = Number(m[3]);
  const rad = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(rad);
  const b2 = C * Math.sin(rad);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b2;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b2;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b2;
  const l = l_ ** 3;
  const mm = m_ ** 3;
  const s = s_ ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
  ];
  return lin.map((c) => {
    const g = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, g)) * 255);
  }) as [number, number, number];
}

/* ------------------------------------------------------------------ */
/* Drill-down (B4.1) — bucket → Master List URL                        */
/* ------------------------------------------------------------------ */

/** 
 * Map a bucket to the Master List filters that reproduce it, using the list's
 * URL params (lib/listUrlState): `block`, `type`, `q` (free text — used for
 * PHC groups, which have no dedicated param), `cert` (stored result),
 * `status` (current status, folded) and `elig`.
 *
 * Known approximation (documented in the card tooltip): a facility that is
 * result-awaited ONLY through the documents pipeline (generalDocStatus
 * "NA Completed & Awaiting Results" with a stale "SA Not Yet Initiated"
 * status) has no current-status signal, so the Master list's status filter
 * cannot select it; those are rare and the card states the list count.
 */
export const BUCKET_LIST_PARAMS: Record<BreakdownBucket, { param: string; values: string } | null> = {
  qualityCertified: { param: "cert", values: "Quality Certified" },
  conditional: { param: "cert", values: "Quality Certified with Conditionality" },
  resultAwaited: {
    param: "status",
    values: "Result Awaited,Recertification Due,SA Completed — NQAS Awaited",
  },
  inProgress: {
    param: "status",
    values: "SA Scheduled,NA Scheduled,NQAS Scheduled,Eligible for Re-Assessment",
  },
  deferred: { param: "cert", values: "Deferred" },
  eligibleNotStarted: { param: "status", values: "SA Not Yet Initiated" },
  notEligible: { param: "elig", values: "Not Eligible" },
};

/** The shareable Master List URL for one cell of the breakdown:
 *  group (block/type/PHC) + bucket. Bucket null (row-name click) filters
 *  by the group only. */
export function breakdownListUrl(
  dimension: BreakdownDimension,
  groupValue: string,
  bucket: BreakdownBucket | null,
): string {
  const params = new URLSearchParams();
  if (dimension === "block") params.set("block", groupValue);
  else if (dimension === "type") params.set("type", groupValue);
  else params.set("q", groupValue);
  if (bucket) {
    const p = BUCKET_LIST_PARAMS[bucket];
    if (p) params.set(p.param, p.values);
  }
  return `/facilities?${params.toString()}`;
}
