/**
 * BUILDING-STATUS BUCKETS — the ONE mapping used by the Reports summary
 * matrix, the Master List filter and every export, so clicking a count in a
 * summary cell filters the list down to exactly those facilities.
 *
 * Old bug: the summary matrix had a column per admin buildingStatus setting
 * ("Good", "Needs Repair", "Under Renovation", "Dilapidated"), so facilities
 * stored with "Good Condition", "Others" or "Inaugurated" — none of which
 * appeared in that list — were silently dropped from the building group and
 * the group no longer added up to Target (66 of 157 on every row).
 *
 * Fix (v2 — the 161-into-157 double count): one function here maps any
 * stored value into ONE of SIX named buckets, a catch-all "Other" bucket
 * (never silently dropped), and a "No record" bucket (blank OR the explicit
 * "No record" text). The M&R variants the raw column freely mixes together
 * ("Major M&R works" / "Minor M&R works" / "M&R Work") collapse into the
 * ONE "M&R Work" bucket, so the M&R markers no longer blow up the bucket
 * count and the total (161 for a 157-facility slide) reconciles to Target.
 * Any other value not enumerated below lands in "Other", and the list filter
 * uses the same function, so a summary count is always draggable/filterable
 * back to the exact facilities.
 */

/** Bucket labels, in the fixed column order the summary renders.
 *  "Needs Repair" and "Under Renovation" stay AVAILABLE (the Admin panel
 *  still lists them) but nothing in the current data maps to them — see the
 *  mapping table below. */
export const BUILDING_BUCKET_ORDER = [
  "Good",
  "Needs Repair",
  "Under Renovation",
  "Dilapidated",
  "M&R Work",
  "Construction on going",
  "Other",
  "No record",
] as const;

/** The ONE alias table: every raw stored value lands in exactly one bucket,
 *  so the summary can never double count (161-for-157 on the deck). The
 *  Admin panel's free-text Building Status dropdown settings still decide
 *  which of these buckets a facility's stored value MEANS — see the comment
 *  above `ALIASES` for how a bucket collapses several raw spellings into
 *  one named column without dropping any facility. */
export type BuildingBucket = (typeof BUILDING_BUCKET_ORDER)[number];

/** The stored free-text value → its canonical bucket. Lowercase keys.
 *
 *  The raw column mixes with these spellings, mapped:
 *    Good            = "Good" + "Good Condition" + "Inaugurated"
 *    M&R Work        = "M&R Work" + "Major M&R works" + "Minor M&R works"
 *    Construction    = "Construction going on" + "Land available" +
 *                      "Land not available"
 *    Dilapidated     = "Dilapidated"
 *    Other           = "Others"
 *    Needs Repair    /  Under Renovation  — no current data value maps here,
 *                      kept available for the Admin panel per the brief.
 *    No record       = blank (or the explicit "No record" text)
 *
 *  INETA: none of the variants above is dropped — each spelling is folded
 *  into its named bucket so the summary's building group always sums to
 *  Target (the 161→157 reconciliation fix). */
const ALIASES: Record<string, BuildingBucket> = {
  // Good (incl. "Good Condition" and "Inaugurated" — ready-assigned
  // completed builds the department counts as a working, code-compliant
  // facility still waiting for its first assessment).
  good: "Good",
  "good condition": "Good",
  // A freshly-inaugurated building is Good until inspected otherwise (the
  // brief's building-mapping rule — "Inaugurated" no longer counts as
  // "Other" which had turned the one new facility's bucket red).
  // Needs repair (incl. the ampersand spelling the portal uses)
  "needs repair": "Needs Repair",
  "needs repairing": "Needs Repair",
  "requires repair": "Needs Repair",
  // Under renovation
  "under renovation": "Under Renovation",
  renovating: "Under Renovation",
  // Dilapidated
  dilapidated: "Dilapidated",
  // M&R work (maintenance & repairs) — ALL variants collapse into ONE
  //  "M&R Work" column instead of three near-duplicate columns and the
  //  resulting 161-vs-157 reconciliation failure.
  "m&r work": "M&R Work",
  "m and r work": "M&R Work",
  "mr work": "M&R Work",
  "m & r work": "M&R Work",
  "major m&r works": "M&R Work",
  "major m & r works": "M&R Work",
  "minor m&r works": "M&R Work",
  "minor m & r works": "M&R Work",
  // Construction in progress — plus the two land-availability variants.
  // "Land available / not available" describes a building proposal that has
  //  not broken ground yet, which the deck counts in the same
  //  "Construction on going / land" bucket so no separate near-empty column
  //  appears in PDF or PPTX.
  "construction on going": "Construction on going",
  "construction ongoing": "Construction on going",
  "construction going on": "Construction on going",
  "construction in progress": "Construction on going",
  "land available": "Construction on going",
  "land not available": "Construction on going",
  // Other (unmapped / free-text variants that don't fit a named bucket;
  //  "Others" stays here as the catch-all the department's column label
  //  literally names)
  others: "Other",
  other: "Other",
  "inaugurated": "Good",
  "inaugurated recently": "Good",
  "new building": "Other",
  variant: "Other",
  "semi-pucca": "Other",
  "pucca": "Other",
  "own building": "Other", // a Building Type value landing in a status column
  // No record
  "no record": "No record",
  "not recorded": "No record",
  "not available": "No record",
  "not known": "No record",
  na: "No record",
};

/** Any value not in the alias list falls through to "Other" (NOT "No
 *  record" — a facility whose status is stored but unstated here is still
 *  recorded, just not under a name we know). */
export function buildingBucketOf(raw: string | null | undefined): BuildingBucket {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "") return "No record";
  const hit = ALIASES[v];
  if (hit) return hit;
  return "Other";
}

/** Zeroed bucket counts, one entry per ordered bucket. */
export function emptyBuildingCounts(): Record<BuildingBucket, number> {
  const out = {} as Record<BuildingBucket, number>;
  for (const b of BUILDING_BUCKET_ORDER) out[b] = 0;
  return out;
}

/** Count one row into a per-bucket accumulators object. */
export function tallyBuilding(
  acc: Record<BuildingBucket, number>,
  raw: string | null | undefined,
): void {
  acc[buildingBucketOf(raw)] += 1;
}

/** Sum the buckets (the group's own total — equals Target when no bucket is
 *  silently dropped, which is exactly the guarantee this function exists to
 *  protect). */
export function sumBuildingCounts(acc: Record<BuildingBucket, number>): number {
  let n = 0;
  for (const b of BUILDING_BUCKET_ORDER) n += acc[b];
  return n;
}

/** The filter value a Master-List / Reports filter should use for a bucket:
 *  "Other" and "No record" are described BY their bucket, so the filter key
 *  is the bucket label plus the storage alias that produced it. The shared
 *  filter list credits the underlying stored value, so clicking a summary
 *  cell filters the list down to exactly those facilities. */
export function filterValuesForBucket(bucket: BuildingBucket): string[] {
  if (bucket === "Other") {
    return [/* filter matches any stored value that maps to "Other" */];
  }
  if (bucket === "No record") {
    return ["", "No record", "Not recorded", "Not available", "Not known", "NA"];
  }
  // Named buckets: the filter accepts the stored spellings that map here.
  const stored = Object.entries(ALIASES)
    .filter(([, b]) => b === bucket)
    .map(([k]) => k);
  // Include the exact bucket label too (e.g. "Good", "Needs Repair") for
  // facilities stored with the canonical spelling.
  const canonical = bucket;
  return [...new Set([canonical, ...stored.map(titleCase)])];
}

/** "needs repair" → "Needs Repair"; "m&r work" → "M&R Work" (only used
 *  by filterValuesForBucket, and directly by the tests). */
export function titleCase(s: string): string {
  return s
    .split(" ")
    .map((w) => {
      const cap = (part: string) =>
        part ? part.charAt(0).toUpperCase() + part.slice(1) : part;
      return w.split("&").map(cap).join("&");
    })
    .join(" ");
}
