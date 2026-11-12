const BUILDING_BUCKET_ORDER = [
  "Good",
  "Needs Repair",
  "Under Renovation",
  "Dilapidated",
  "M&R Work",
  "Construction on going",
  "Other",
  "No record"
];
const ALIASES = {
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
  "own building": "Other",
  // a Building Type value landing in a status column
  // No record
  "no record": "No record",
  "not recorded": "No record",
  "not available": "No record",
  "not known": "No record",
  na: "No record"
};
function buildingBucketOf(raw) {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "") return "No record";
  const hit = ALIASES[v];
  if (hit) return hit;
  return "Other";
}
function emptyBuildingCounts() {
  const out = {};
  for (const b of BUILDING_BUCKET_ORDER) out[b] = 0;
  return out;
}
function sumBuildingCounts(acc) {
  let n = 0;
  for (const b of BUILDING_BUCKET_ORDER) n += acc[b];
  return n;
}

export { BUILDING_BUCKET_ORDER as B, buildingBucketOf as b, emptyBuildingCounts as e, sumBuildingCounts as s };
