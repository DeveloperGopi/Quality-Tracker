/**
 * FISCAL-YEAR HELPERS (Part 0 §3) — India: financial year runs April→March,
 * i.e. "FY 2025-26" = 1 Apr 2025 → 31 Mar 2026.
 *
 * One definition everywhere: the deck's "Certified in FY … (to date)", the
 * dashboard Overview tiles and Reports all read these two helpers, so no
 * page hard-codes "2025-26" and the FY always follows the real calendar.
 */

/** The FY (start calendar year) of an ISO yyyy-mm-dd date.
 *  April–December ⇒ the date's own year; January–March ⇒ the previous year. */
export function fiscalYearOf(iso: string): number {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  return m >= 4 ? y : y - 1;
}

/** "2025" (start year) → "2025-26". */
export function fiscalYearLabel(startYear: number): string {
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

/** The fiscal year containing TODAY (client calendar date), as its start
 *  year — injectable `today` for tests. */
export function currentFiscalYear(today = todayLocalIsoSafe()): number {
  return fiscalYearOf(today);
}

/** The previous fiscal year's start year. */
export function previousFiscalYear(today = todayLocalIsoSafe()): number {
  return currentFiscalYear(today) - 1;
}

function todayLocalIsoSafe(): string {
  if (typeof document !== "undefined") {
    // Browser: match the app's todayLocalIso() (local calendar, not UTC).
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  }
  // Non-client (unit test / node context) — same local rule.
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
