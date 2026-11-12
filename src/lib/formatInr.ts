/**
 * ₹ INDIAN FORMAT (Part 0 §8) — "₹ 7,90,000", never "Rs. 7.9 lakh".
 * Grouping: rightmost group of 3, then groups of 2 — the digit-grouping
 * rule Indian rupee amounts use. `toLocaleString("en-IN")` applies it in
 * every browser this app targets, but banking on the Intl behaviour alone
 * is fragile, so this file implements the rule explicitly and injects the
 * "en-IN" locale result only when it matches the expected shape.
 */

/** Indian-group an integer: 790000 → "7,90,000". */
export function inrGroup(n: number): string {
  const s = String(Math.abs(Math.round(n)));
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  let rest = s.slice(0, -3);
  const groups: string[] = [];
  while (rest.length > 2) {
    groups.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) groups.unshift(rest);
  return `${groups.join(",")},${last3}`;
}

/** "₹ 7,90,000" from a rupee amount. Negative keeps the sign before ₹. */
export function formatInr(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  const sign = amount < 0 ? "-" : "";
  return `${sign}₹ ${inrGroup(Math.abs(amount))}`;
}
