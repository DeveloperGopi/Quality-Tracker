/** Shared metric catalogue + drill-down links for the Block Compare page. */

export type BlockCompareMetricId =
  | "certifiedPct"
  | "deferred"
  | "avgNqasIa"
  | "iaChange"
  | "avgKayakalpIa"
  | "docsMissing"
  | "pendingIssues";

export type BlockCompareMetric = {
  id: BlockCompareMetricId;
  label: string;
  kind: "percent" | "count" | "score" | "change";
};

export const BLOCK_COMPARE_METRICS: BlockCompareMetric[] = [
  { id: "certifiedPct", label: "Certified %", kind: "percent" },
  { id: "deferred", label: "Deferred", kind: "count" },
  { id: "avgNqasIa", label: "Avg NQAS IA", kind: "score" },
  { id: "iaChange", label: "IA change", kind: "change" },
  { id: "avgKayakalpIa", label: "Avg Kayakalp IA", kind: "score" },
  { id: "docsMissing", label: "Documents missing", kind: "count" },
  { id: "pendingIssues", label: "Pending issues", kind: "count" },
];

export const BLOCK_COMPARE_METRIC_BY_ID = Object.fromEntries(
  BLOCK_COMPARE_METRICS.map((metric) => [metric.id, metric]),
) as Record<BlockCompareMetricId, BlockCompareMetric>;

/** The Facility Master List metric value each heatmap column opens. */
export function masterMetricFor(
  metric: BlockCompareMetricId,
): "certified" | "deferred" | "nqasIa" | "iaChange" | "kayakalpIa" | "docsMissing" | "pendingIssues" {
  if (metric === "certifiedPct") return "certified";
  if (metric === "avgNqasIa") return "nqasIa";
  if (metric === "avgKayakalpIa") return "kayakalpIa";
  return metric;
}

/** Deep link: Block + the matching Master List metric chip, keeping the
 *  page's own type/cycle scope so the opened list agrees with the cell. */
export function blockCompareListHref(
  block: string,
  metric: BlockCompareMetricId,
  scope: { facilityType?: string; cycle?: string } = {},
): string {
  const params = new URLSearchParams();
  params.set("block", block);
  params.set("metric", masterMetricFor(metric));
  if (scope.facilityType) params.set("type", scope.facilityType);
  if (scope.cycle && scope.cycle !== "current") params.set("cycle", scope.cycle);
  return `/facilities?${params.toString()}`;
}

/** Ranking chart values always sort high-to-low; counts and scores are fine. */
export function rankingValue(
  block: { [K in BlockCompareMetricId]?: number | null },
  metric: BlockCompareMetricId,
): number | null {
  const value = block[metric];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
