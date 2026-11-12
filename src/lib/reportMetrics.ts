/**
 * REPORT METRICS — ONE precision and ONE median rule for every report screen
 * and export.
 *
 * The old pages formatted Certified % with Math.round in one place and a
 * one-decimal string in another, which is how 46%, 46.5% and 47% all appeared
 * for the same 73/157. Every report surface now prints `formatPercent`.
 *
 * A blank is never 0: a percentage with no denominator is "-".
 */

import { COMPARE_NO_CHANGE_BAND, SCORE_DECIMALS } from "@/lib/masterColumns";

/** Decimals for a footprint percentage (Certified %, share of facilities). */
export const PERCENT_DECIMALS = 1;

/** The no-change band for score comparisons (0.01 is "unchanged"). */
export const NO_CHANGE_BAND = COMPARE_NO_CHANGE_BAND;

/** A median needs at least this many values, otherwise "Too few". */
export const MEDIAN_MIN_VALUES = 3;

/** 73 / 157 → 46.496… — a NUMBER, never a string; null when no denominator. */
export function percentOf(part: number, whole: number): number | null {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0) return null;
  return (part / whole) * 100;
}

/** "46.5%" — one shared precision. Null → "-" (a blank is never 0). */
export function formatPercent(
  value: number | null | undefined,
  decimals = PERCENT_DECIMALS,
): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return `${value.toFixed(decimals)}%`;
}

/** Percent from a count pair, formatted. Never "NaN%" or "0%" for 0/0. */
export function percentLabel(part: number, whole: number): string {
  return formatPercent(percentOf(part, whole));
}

/** Plain median (sorted middle / mean of the two middles) — null under 3
 *  values so the UI can print "Too few" instead of a fake average. */
export function median(values: readonly number[]): number | null {
  const clean = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (clean.length < MEDIAN_MIN_VALUES) return null;
  const mid = Math.floor(clean.length / 2);
  return clean.length % 2
    ? clean[mid]
    : (clean[mid - 1] + clean[mid]) / 2;
}

/** "Too few" below the median rule; otherwise the number at SCORE_DECIMALS. */
export function medianLabel(value: number | null): string {
  return value == null ? "Too few" : value.toFixed(SCORE_DECIMALS);
}

/** Sortable day difference between two date-only ISO values (b - a).
 *  Invalid/missing dates are null, never 0. */
export function daysBetweenIso(a: string | null | undefined, b: string | null | undefined): number | null {
  if (!a || !b) return null;
  const ta = Date.parse(`${String(a).slice(0, 10)}T00:00:00Z`);
  const tb = Date.parse(`${String(b).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return null;
  return Math.round((tb - ta) / 86_400_000);
}

/** The direction of a change under the shared no-change band. */
export function changeDirection(
  delta: number | null,
  band = NO_CHANGE_BAND,
): "up" | "down" | "same" | null {
  if (delta == null || !Number.isFinite(delta)) return null;
  if (Math.abs(delta) < band) return "same";
  return delta > 0 ? "up" : "down";
}

/** Shared "▲ +1.25" / "▼ -0.50" / "■ 0.00" wording (scores, SCORE_DECIMALS). */
export function changeLabel(delta: number | null): string {
  if (delta == null || !Number.isFinite(delta)) return "-";
  const dir = changeDirection(delta);
  const sign = dir === "same" ? "" : delta > 0 ? "+" : "-";
  return `${dir === "same" ? "■" : dir === "up" ? "▲" : "▼"} ${sign}${Math.abs(delta).toFixed(SCORE_DECIMALS)}`;
}
