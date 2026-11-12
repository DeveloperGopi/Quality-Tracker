/** Shared NQAS Eligibility helpers.
 *
 *  Facilities store eligibility canonically as "Eligible" | "Not Eligible" |
 *  "Possible", but the dropdown labels are admin-editable
 *  (Settings → NQAS Eligibility). The mapping back to canonical values has to
 *  be robust to arbitrary renames — the old per-page keyword guessing
 *  (startsWith("Not") …) mis-mapped a label like "In-Eligible" onto
 *  "Eligible", producing two options with the same value and a dropdown whose
 *  picks never registered. */

import { multiFilterMatches } from "./multiFilter";

export type EligibilityValue = "Eligible" | "Not Eligible" | "Possible";

/** Order the admin's labels to match the canonical Eligible / Not Eligible /
 *  Possible order (not the order they were saved in), so every dropdown shows
 *  Eligible first and In-Eligible before Future Candidate. */
const CANONICAL_ORDER: EligibilityValue[] = ["Eligible", "Not Eligible", "Possible"];

/** Map one admin-edited label to its canonical stored value. Returns null
 *  when the label isn't recognizable (the caller then skips that label). */
export function eligibilityValueForLabel(label: string): EligibilityValue | null {
  const l = label.trim().toLowerCase();
  if (!l) return null;
  if (/^not\b/.test(l) || l.includes("inelig") || l.includes("in-elig") || l.includes("in elig")) {
    return "Not Eligible";
  }
  if (l.includes("candidate") || l.includes("future") || l.includes("possible")) {
    return "Possible";
  }
  if (l.includes("elig")) return "Eligible";
  return null;
}

/** Build dropdown/filter options from the admin-editable label list
 *  (Settings → NQAS Eligibility). Unrecognized labels are skipped instead of
 *  collapsing onto a wrong canonical value. If every label is unrecognized
 *  (or the list is empty), fall back to the canonical values as labels. */
export function buildEligibilityOptions(
  labels: readonly string[] | undefined,
): { value: EligibilityValue; label: string }[] {
  const byValue = new Map<EligibilityValue, string>();
  for (const label of labels ?? []) {
    const value = eligibilityValueForLabel(label);
    if (value && !byValue.has(value)) byValue.set(value, label.trim());
  }
  if (byValue.size === 0) {
    return CANONICAL_ORDER.map((value) => ({ value, label: value }));
  }
  return CANONICAL_ORDER.filter((v) => byValue.has(v)).map((v) => ({
    value: v,
    label: byValue.get(v) as string,
  }));
}

/** Multi-select linelist filter predicate — same rules as every other
 *  multi-select filter (see multiFilterMatches): "all" or an empty
 *  selection matches everything; a concrete selection keeps only matching
 *  canonical stored values. */
export function eligibilityFilterMatches(
  value: string | null | undefined,
  filter: "all" | readonly string[],
): boolean {
  return multiFilterMatches(value, filter);
}

/** Display label for a stored eligibility value: the admin's custom label
 *  when one maps to it, otherwise the canonical value itself. */
export function eligibilityLabelForValue(
  value: string | null | undefined,
  options: { value: EligibilityValue; label: string }[],
): string {
  const hit = options.find((o) => o.value === value);
  if (hit) return hit.label;
  return value ?? "";
}
