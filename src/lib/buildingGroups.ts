/**
 * BUILDING GROUP SUMMARY (Part 0 §5) — the deck reads the SAME shared
 * bucket mapping the Reports summary matrix uses (lib/buildingBuckets), so
 * the slides can never reintroduce the repeated "Major M&R works" /
 * "Minor M&R works" columns that made the building group sum 161 for a
 * 157-facility dataset.
 */

import {
  BUILDING_BUCKET_ORDER,
  buildingBucketOf,
  emptyBuildingCounts,
  type BuildingBucket,
} from "./buildingBuckets";

export type BuildingGroupRow = { label: BuildingBucket; count: number };

/** Every facility lands in exactly one shared bucket; the returned rows
 *  include zero-count buckets only when the caller asks (deck keeps zero
 *  buckets visible for the reconciliation guard, PDF collapses them). */
export function buildingGroupSummary(
  rows: { buildingStatus: string | null }[],
): {
  counts: Record<BuildingBucket, number>;
  order: readonly BuildingBucket[];
  total: number;
} {
  const counts = emptyBuildingCounts();
  for (const r of rows) counts[buildingBucketOf(r.buildingStatus)] += 1;
  const total = rows.length;
  return { counts, order: BUILDING_BUCKET_ORDER, total };
}

/** Rows for the deck's bar list: only non-zero buckets plus "No record"
 *  (kept so the "not recorded" visibility rule from Part 0 §6 holds). */
export function buildingGroupBars(
  rows: { buildingStatus: string | null }[],
): BuildingGroupRow[] {
  const { counts } = buildingGroupSummary(rows);
  return BUILDING_BUCKET_ORDER.filter(
    (b) => counts[b] > 0 || b === "No record",
  ).map((b) => ({ label: b, count: counts[b] }));
}
