/**
 * CYCLE SCOPE — one rule for the certification-cycle filter (Part 3).
 *
 * `CycleScope` is what the shared <CycleFilter> writes and what every data
 * surface reads:
 *
 *   "current" → each facility's highest open cycle (the default),
 *   number     → that exact cycle (#1, #2 …),
 *   "all"      → one row per facility per cycle (LIST pages only; summaries
 *                and KPIs never offer it because they would double-count).
 *
 * The URL carries the choice (`?cycleScope=2`), so Back restores it and a link
 * is shareable. The value is also remembered in localStorage, which is how it
 * survives navigation and a reload.
 *
 * Kept pure (no React, no DOM) so the page classification and the parsing are
 * unit-tested in scripts/cycleScope.test.ts.
 */

export type CycleScope = "current" | "all" | number;

export const CYCLE_SCOPE_PARAM = "cycleScope";
export const CYCLE_SCOPE_STORAGE = "nqas.cycleScope.v1";

/** Parse the URL/localStorage value. Anything unknown falls back to current. */
export function parseCycleScope(raw: string | null | undefined): CycleScope {
  if (raw == null) return "current";
  const value = String(raw).trim().toLowerCase();
  if (value === "" || value === "current") return "current";
  if (value === "all") return "all";
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : "current";
}

/** The URL value (never empty). */
export function serializeCycleScope(scope: CycleScope): string {
  return scope === "current" ? "current" : scope === "all" ? "all" : String(scope);
}

export function cycleScopeLabel(scope: CycleScope): string {
  if (scope === "current") return "Current cycle";
  if (scope === "all") return "All cycles";
  return `Cycle #${scope}`;
}

/** "Initial" / "Recertification" — the plain word after the cycle number. */
export function cycleTypeLabel(cycleType: string | null | undefined): string {
  return /recert/i.test(cycleType ?? "") ? "Recertification" : "Initial";
}

/**
 * The redesigned menu label. Never "Cycle: Cycle #2".
 *   Current cycle · Cycle #1 Initial · Cycle #2 Recertification · All cycles
 */
export function cycleOptionLabel(
  scope: CycleScope,
  cycleType?: string | null,
): string {
  if (scope === "current") return "Current cycle";
  if (scope === "all") return "All cycles";
  return `Cycle #${scope} ${cycleTypeLabel(cycleType)}`;
}

/** The trigger reads "Certification Cycle: Current" — the short form. */
export function cycleShortLabel(scope: CycleScope): string {
  if (scope === "current") return "Current";
  if (scope === "all") return "All cycles";
  return `Cycle #${scope}`;
}

/** One-line explanation under each option. */
export function cycleOptionDescription(scope: CycleScope): string {
  if (scope === "current") return "Each facility's latest open cycle";
  if (scope === "all") return "One row per facility per cycle — list pages only";
  return "Only this cycle's assessment, certification and surveillance records";
}

/** What actually changes when the cycle changes (shown under the options). */
export const CYCLE_APPLIES_TO =
  "Applies to: State Assessment, NQAS, Certification, Surveillance, Recertification, Documents. Internal Assessment, Gap Closure, Building and Fire NOC are not affected.";

export type CyclePageMode = "full" | "partial" | "none";

export type CyclePageScope = {
  mode: CyclePageMode;
  /** The one sentence the control shows (tooltip on disabled pages, chip on
   *  mixed ones). */
  note: string;
  /** Only list pages may offer "All cycles". */
  allowAll: boolean;
};

const FULL_NOTE =
  "State Assessment, NQAS certification, surveillance and recertification follow this cycle.";
const PARTIAL_NOTE =
  "Applies to the assessment, certification and surveillance fields; Internal Assessment, funds, building and Fire NOC stay current.";
const NONE_NOTE = "This page is not cycle-based; it always shows current data.";

/** Facility-data categories whose data is NOT cycle-scoped. */
const NON_CYCLE_CATEGORIES = new Set([
  "internal-assessment",
  "fund",
  "building",
  "fire-noc",
]);

/**
 * Which page is this, and how much of it is cycle-scoped?
 *
 *  full    — the three cycle pages: switching really changes every row.
 *  partial — mixed pages (Master List, Dashboard, Reports, Custom Report,
 *            Generate PPT, a facility profile): only cycle fields follow it.
 *  none    — non-cycle pages (IA quarters, funds, building, Fire NOC, the
 *            summary report, imports, admin, settings): the control is shown
 *            DISABLED with the reason, never hidden — the same control in the
 *            same place is the point.
 */
export function cyclePageScope(pathname: string): CyclePageScope {
  const path = (pathname || "/").replace(/\/+$/, "") || "/";
  const full = [
    "/facilities/state-assessment",
    "/facilities/certification",
    "/facilities/recertification",
  ];
  if (full.includes(path)) return { mode: "full", note: FULL_NOTE, allowAll: true };

  if (path === "/facilities") return { mode: "partial", note: PARTIAL_NOTE, allowAll: true };
  if (path === "/dashboard" || path === "/reports" || path === "/custom-report") {
    return { mode: "partial", note: PARTIAL_NOTE, allowAll: path === "/custom-report" };
  }
  if (path === "/generate-ppt" || path === "/summary-report") {
    return { mode: "partial", note: PARTIAL_NOTE, allowAll: false };
  }

  // /facilities/<segment>: a known CATEGORY is its own page (and the four
  // non-cycle categories are "none"); anything else is the facility profile,
  // whose cycle switcher uses this context.
  const profile = /^\/facilities\/([^/]+)$/.exec(path);
  if (profile) {
    const segment = profile[1];
    if (NON_CYCLE_CATEGORIES.has(segment))
      return { mode: "none", note: NONE_NOTE, allowAll: false };
    return { mode: "partial", note: PARTIAL_NOTE, allowAll: false };
  }

  return { mode: "none", note: NONE_NOTE, allowAll: false };
}

/**
 * Which cycle does a facility show under a scope?
 *
 * "current" uses the same three-step fallback as the server (stored pointer →
 * active → newest), so the control and the list can never disagree.
 */
export function scopedCycleNumber(
  scope: CycleScope,
  facility: { currentCycleNumber?: number | null },
  cycles: { cycleNumber: number; superseded?: boolean }[],
): number | null {
  const sorted = [...cycles].sort((a, b) => a.cycleNumber - b.cycleNumber);
  if (scope === "current") {
    const pointer = facility.currentCycleNumber;
    if (pointer != null && sorted.some((c) => c.cycleNumber === pointer)) return pointer;
    const active = sorted.find((c) => !c.superseded);
    if (active) return active.cycleNumber;
    return sorted.length > 0 ? sorted[sorted.length - 1].cycleNumber : null;
  }
  if (scope === "all") return null;
  return sorted.some((c) => c.cycleNumber === scope) ? scope : null;
}
