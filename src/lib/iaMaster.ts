/**
 * MASTER LIST × FACILITY-IA QUARTERS — the pure join.
 *
 * The master list's IA columns (NQAS / Kayakalp / Eco-Friendly, one "current"
 * and one "previous" quarter plus the comparison) read the
 * facilityIaQuarters store — the SAME rows the quarterly IA import writes —
 * instead of the legacy facilities.nqasIaQ1/Q2 columns. One small index is
 * built once per page load here and attached to every MasterRow as `row.ia`;
 * `cellValue` (lib/masterColumns) prefers it and falls back to the legacy
 * facility fields when the store has nothing for that facility.
 *
 * Everything here is pure so it is unit-testable without Convex.
 */

import type { FyQuarter, IaStoredQuarter, IaTracker } from "./iaImport";
import { SCORE_DECIMALS, formatFyQuarter, previousQuarter, quarterOrder } from "./iaImport";

/** The FY the legacy facilities.nqasIaQ1/Q2 columns belong to (schema.ts). */
export const LEGACY_IA_FY = "2026-27";

/** One facility's stored scores per period, flattened for O(1) lookups. */
export type IaFacilityIndex = {
  /** `${fy}|Q${q}` → per-tracker value / remark / lock. */
  by: Map<string, IaStoredQuarter>;
  /** Periods that carry ANY data for this facility, old → new. */
  periods: FyQuarter[];
};
export type IaMasterIndex = Map<string, IaFacilityIndex>;

const periodKey = (fy: string, q: number): string => `${fy}|Q${q}`;

/** Any score or remark present at all → "this period was reported". */
function reported(q: IaStoredQuarter): boolean {
  return (
    q.nqasIaScore != null ||
    q.kayakalpIaScore != null ||
    q.ecoFriendlyScore != null ||
    q.nqasRemark != null ||
    q.kayakalpRemark != null ||
    q.ecoRemark != null
  );
}

export function buildIaMasterIndex(rows: readonly IaStoredQuarter[]): IaMasterIndex {
  const index: IaMasterIndex = new Map();
  for (const r of rows) {
    const entry: IaFacilityIndex = index.get(r.facilityId) ?? { by: new Map(), periods: [] };
    entry.by.set(periodKey(r.fy, r.quarter), r);
    const p = { fy: r.fy, q: r.quarter as 1 | 2 | 3 | 4 };
    if (reported(r) && !entry.periods.some((e) => e.fy === p.fy && e.q === p.q)) {
      entry.periods.push(p);
    }
    index.set(r.facilityId, entry);
  }
  for (const entry of index.values()) {
    entry.periods.sort((a, b) => quarterOrder(a.fy, a.q) - quarterOrder(b.fy, b.q));
  }
  return index;
}

/** Every period ANY facility reported, old → new (the compare-selector options). */
export function allIaPeriods(index: IaMasterIndex): FyQuarter[] {
  const seen = new Map<string, FyQuarter>();
  for (const entry of index.values()) {
    for (const p of entry.periods) seen.set(periodKey(p.fy, p.q), p);
  }
  return [...seen.values()].sort((a, b) => quarterOrder(a.fy, a.q) - quarterOrder(b.fy, b.q));
}

/** Merge the legacy facilities.nqasIaQ1/Q2 columns into the index as REAL
 *  periods (2026-27 Q1/Q2 — that is what those columns are, schema.ts). The
 *  quarterly store always wins; a legacy row is only added when that facility
 *  has no stored row for the period. Without this the index was empty for
 *  facilities never backfilled, and the IA labels fell back to the CALENDAR
 *  current quarter — the root cause of "my Q1 shown as Q2, my Q2 as Q3". */
export type LegacyIaFacility = {
  id: string;
  nqasIaQ1?: number | null;
  kayakalpIaQ1?: number | null;
  nqasIaQ2?: number | null;
  kayakalpIaQ2?: number | null;
};

export function withLegacyIa(
  index: IaMasterIndex,
  facilities: readonly LegacyIaFacility[],
): IaMasterIndex {
  for (const f of facilities) {
    const slots: { q: 1 | 2; nqas: number | null; kayakalp: number | null }[] = [
      { q: 1, nqas: f.nqasIaQ1 ?? null, kayakalp: f.kayakalpIaQ1 ?? null },
      { q: 2, nqas: f.nqasIaQ2 ?? null, kayakalp: f.kayakalpIaQ2 ?? null },
    ];
    for (const slot of slots) {
      if (slot.nqas == null && slot.kayakalp == null) continue;
      const entry: IaFacilityIndex = index.get(f.id) ?? { by: new Map(), periods: [] };
      if (entry.by.has(periodKey(LEGACY_IA_FY, slot.q))) continue; // store wins
      entry.by.set(periodKey(LEGACY_IA_FY, slot.q), {
        facilityId: f.id,
        fy: LEGACY_IA_FY,
        quarter: slot.q,
        nqasIaScore: slot.nqas,
        kayakalpIaScore: slot.kayakalp,
        ecoFriendlyScore: null,
        nqasRemark: null,
        kayakalpRemark: null,
        ecoRemark: null,
        lockedAt: null,
        updatedAt: 0,
      } as IaStoredQuarter);
      const p: FyQuarter = { fy: LEGACY_IA_FY, q: slot.q };
      if (!entry.periods.some((e) => e.fy === p.fy && e.q === p.q)) entry.periods.push(p);
      index.set(f.id, entry);
    }
  }
  for (const entry of index.values()) {
    entry.periods.sort((a, b) => quarterOrder(a.fy, a.q) - quarterOrder(b.fy, b.q));
  }
  return index;
}

/** The COMPARE-QUARTERS pair, derived ONLY from stored data.
 *
 *  current  = the cursor quarter when data exists for it, else the latest
 *             quarter that has data for ANY facility.
 *  previous = the latest quarter with data strictly before it, else the
 *             calendar quarter before it (rendered "-" by the comparison).
 *
 *  There is deliberately no "today's quarter" / provisional-Q3 fallback: a
 *  quarter with no rows is never used as a label, so data can never appear
 *  under the wrong quarter again. Returns null when nothing is stored. */
export function iaPairFor(
  cursor: string | null,
  index: IaMasterIndex,
  _today?: string,
): { previous: FyQuarter; current: FyQuarter } | null {
  const periods = allIaPeriods(index);
  if (periods.length === 0) return null;
  const wanted = cursor ? parseCursor(cursor) : null;
  const current =
    (wanted && periods.find((p) => periodKey(p.fy, p.q) === periodKey(wanted.fy, wanted.q))) ||
    periods[periods.length - 1];
  const before = periods.filter(
    (p) => quarterOrder(p.fy, p.q) < quarterOrder(current.fy, current.q),
  );
  const previous = before.length ? before[before.length - 1] : previousQuarter(current.fy, current.q);
  return { previous, current };
}

/** The pair for ONE facility: its latest reported quarter and the quarter
 *  before it with data (never a fleet-wide or calendar guess). */
export function facilityIaPair(
  index: IaMasterIndex,
  facilityId: string,
): { previous: FyQuarter; current: FyQuarter } | null {
  const periods = index.get(facilityId)?.periods ?? [];
  if (periods.length === 0) return null;
  const current = periods[periods.length - 1];
  const before = periods.filter((p) => quarterOrder(p.fy, p.q) < quarterOrder(current.fy, current.q));
  const previous = before.length ? before[before.length - 1] : previousQuarter(current.fy, current.q);
  return { previous, current };
}

function parseCursor(cursor: string): FyQuarter | null {
  const m = /^(\d{4}-\d{2}):([1-4])$/.exec(cursor.trim());
  return m ? { fy: m[1], q: Number(m[2]) as 1 | 2 | 3 | 4 } : null;
}

/** The per-row extras cellValue reads. Scores/remarks/locks share the period
 *  keys; `pair` decides which two periods the Q1/Q2 columns show. */
export type MasterRowIa = {
  pair: { previous: FyQuarter; current: FyQuarter };
  rows: IaStoredQuarter[];
};

export function attachIaExtras(
  facilityId: string,
  index: IaMasterIndex,
  pair: { previous: FyQuarter; current: FyQuarter },
): MasterRowIa {
  const entry = index.get(facilityId);
  return {
    pair,
    rows: entry ? [...entry.by.values()] : [],
  };
}

/** Score for one tracker in one period, or null. */
export function iaScoreOf(
  row: MasterRowIa,
  tracker: IaTracker,
  period: FyQuarter,
): number | null {
  return row.rows.find((r) => r.fy === period.fy && r.quarter === period.q)?.[
    tracker === "nqas" ? "nqasIaScore" : tracker === "kayakalp" ? "kayakalpIaScore" : "ecoFriendlyScore"
  ] ?? null;
}

/** Remark text for one tracker in one period (shown when the score is blank). */
export function iaRemarkOf(
  row: MasterRowIa,
  tracker: IaTracker,
  period: FyQuarter,
): string | null {
  return row.rows.find((r) => r.fy === period.fy && r.quarter === period.q)?.[
    tracker === "nqas" ? "nqasRemark" : tracker === "kayakalp" ? "kayakalpRemark" : "ecoRemark"
  ] ?? null;
}

/** lockedAt for one period (the quarter lock the IA import respects). */
export function iaLockedOf(row: MasterRowIa, period: FyQuarter): number | null {
  return row.rows.find((r) => r.fy === period.fy && r.quarter === period.q)?.lockedAt ?? null;
}

/** The comparison: current − previous, rounded to the shared SCORE_DECIMALS.
 *  Null when either side is blank (the UI then shows "-" with the reason). */
export function iaCompareOf(row: MasterRowIa, tracker: IaTracker): number | null {
  const a = iaScoreOf(row, tracker, row.pair.previous);
  const b = iaScoreOf(row, tracker, row.pair.current);
  if (a == null || b == null) return null;
  const f = 10 ** SCORE_DECIMALS;
  return Math.round((b - a) * f) / f;
}

/** Rewrite an IA column label's "2026-27 (Q1)" tail to the chosen period —
 *  the "dynamic IA quarter columns". Overrides (Admin renames) are resolved
 *  BEFORE this runs, so they keep working against the base label. */
export function iaLabelFor(base: string, period: FyQuarter | null | undefined): string {
  if (!period) return base;
  const text = formatFyQuarter(period.fy, period.q); // "Q2 2026-27"
  return base
    // the current canonical form: "… % 2026-27 (Q1)"
    .replace(/\d{4}-\d{2,4} \(Q[1-4]\)/, `${text.split(" ")[1]} (${text.split(" ")[0]})`)
    // an older form some saved renames may carry: "… (Q1 2026-27)"
    .replace(/Q[1-4] \d{4}-\d{2,4}/, text);
}

void iaLockedOf; // consumed by the drawer/banner surfaces later
