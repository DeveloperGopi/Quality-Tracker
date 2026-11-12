/**
 * DATE-ONLY HELPERS — one parser and one formatter for every date field.
 *
 * Dates in the app are stored as `YYYY-MM-DD` strings and compared as
 * strings. Nothing here builds a `Date` from user text except through UTC
 * fields, so an IST browser near midnight can never shift a day.
 *
 * Accepted typed forms (day first, because the app is Indian):
 *   06-11-2025 · 06/11/2025 · 6-11-25 · 2025-11-06
 *   06-Nov-2025 · 6 Nov 2025 · 06-NOV-25 · 6 Sept 2025
 */

export const DATE_INPUT_ERROR = "Enter a date like 06-Nov-2025";

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTH_FULL = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

const MONTH_LOOKUP: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  MONTH_ABBR.forEach((name, i) => {
    out[name.toLowerCase()] = i + 1;
  });
  MONTH_FULL.forEach((name, i) => {
    out[name] = i + 1;
    out[name.slice(0, 3)] = i + 1;
  });
  out.sept = 9;
  return out;
})();

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Days in a month (month is 1-12), leap years included. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function makeIso(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  if (year < 1000 || year > 9999 || month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Normalise any supported typed date to ISO, or null when it is not a date. */
export function parseDateText(raw: string | null | undefined): string | null {
  const text = (raw ?? "").trim().replace(/\s+/g, " ");
  if (!text) return null;

  // ISO first — the stored form. Allow un-padded month/day while typing.
  const iso = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) return makeIso(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  // 06-11-2025 · 06/11/2025 · 6.11.25 (day first).
  const numeric = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/);
  if (numeric) {
    const yearRaw = Number(numeric[3]);
    const year =
      numeric[3].length === 2 ? (yearRaw < 70 ? 2000 + yearRaw : 1900 + yearRaw) : yearRaw;
    return makeIso(year, Number(numeric[2]), Number(numeric[1]));
  }

  // 06-Nov-2025 · 6 Nov 2025 · 06-NOV-25 · 6 Sept 2025.
  const named = text.match(/^(\d{1,2})[-/\s]([A-Za-z]{3,9})[-/\s](\d{2}|\d{4})$/);
  if (named) {
    const month = MONTH_LOOKUP[named[2].toLowerCase()];
    if (!month) return null;
    const yearRaw = Number(named[3]);
    const year =
      named[3].length === 2 ? (yearRaw < 70 ? 2000 + yearRaw : 1900 + yearRaw) : yearRaw;
    return makeIso(year, month, Number(named[1]));
  }

  return null;
}

/** True when the value is a real, zero-padded ISO date-only string. */
export function isIsoDate(value: string | null | undefined): boolean {
  const v = (value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  return parseDateText(v) === v;
}

/** `2025-11-06` → `06-Nov-2025` (the app's display format). */
export function formatDateLong(iso: string | null | undefined): string {
  if (!isIsoDate(iso)) return "";
  const [year, month, day] = iso!.split("-").map(Number);
  return `${pad2(day)}-${MONTH_ABBR[month - 1]}-${year}`;
}

/** `2025-11-06` → `6 November 2025` (screen-reader day labels). */
export function formatDateSpoken(iso: string | null | undefined): string {
  if (!isIsoDate(iso)) return "";
  const [year, month, day] = iso!.split("-").map(Number);
  return `${day} ${MONTH_FULL[month - 1]} ${year}`;
}

export function monthName(month: number): string {
  return MONTH_ABBR[month - 1] ?? "";
}

/** Add (or subtract) whole calendar days without a timezone shift. */
export function addDays(iso: string, days: number): string {
  if (!isIsoDate(iso)) return "";
  const [year, month, day] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** Shift a year/month pair by N months (month is 1-12). */
export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

/** Difference in whole days (b - a); null when either date is invalid. */
export function daysBetweenIso(a: string | null | undefined, b: string | null | undefined): number | null {
  if (!isIsoDate(a) || !isIsoDate(b)) return null;
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/**
 * Monday-first calendar grid: nulls for the lead/tail blanks, ISO dates for
 * the days. Six rows at most, so the popover never changes height.
 */
export function monthGrid(year: number, month: number): (string | null)[] {
  const lead = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const total = daysInMonth(year, month);
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= total; day += 1) {
    cells.push(`${year}-${pad2(month)}-${pad2(day)}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** Why a day cannot be picked, or null when it is allowed. */
export function dateRuleError(
  iso: string,
  { min, max }: { min?: string; max?: string },
): string | null {
  if (!isIsoDate(iso)) return DATE_INPUT_ERROR;
  if (min && iso < min) {
    return `Before the earliest allowed date (${formatDateLong(min)}) — pick ${formatDateLong(min)} or later`;
  }
  if (max && iso > max) {
    return `After the latest allowed date (${formatDateLong(max)}) — pick ${formatDateLong(max)} or earlier`;
  }
  return null;
}

/** Today's calendar date in IST, independent of the browser timezone. */
export function todayIsoIST(now: Date = new Date()): string {
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return `${ist.getUTCFullYear()}-${pad2(ist.getUTCMonth() + 1)}-${pad2(ist.getUTCDate())}`;
}

/** The 7 day-of-week labels used by the picker, Monday first. */
export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
