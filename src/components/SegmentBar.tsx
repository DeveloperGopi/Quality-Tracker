import { cn } from "@/lib/utils";
import type { PipelineStage } from "@/convex/lifecycle";

/** Segment colors — green/teal for certified, blue in-progress, amber
 *  recert/conditional, red deferred, slate not-started. */
export const SEGMENT_COLORS: Record<string, string> = {
  certified: "oklch(0.62 0.15 165)",
  conditional: "oklch(0.78 0.14 85)",
  inProgress: "oklch(0.58 0.14 250)",
  deferred: "oklch(0.6 0.2 25)",
  dueSoon: "oklch(0.72 0.16 60)",
  notStarted: "oklch(0.62 0.03 260)",
};

/** Colours for the shared certification-pipeline stages — one palette for
 *  the dashboard strip, the per-facility stepper and the deck preview. */
export const PIPELINE_STAGE_COLORS: Record<PipelineStage, string> = {
  notEligible: "oklch(0.72 0.02 260)",
  notStarted: SEGMENT_COLORS.notStarted,
  // Internal Assessment runs before the SA visit — violet keeps it distinct
  // from the blue State Assessment bucket that follows it.
  internalAssessment: "oklch(0.58 0.14 300)",
  stateAssessment: SEGMENT_COLORS.inProgress,
  naScheduled: "oklch(0.62 0.13 220)",
  resultAwaited: SEGMENT_COLORS.dueSoon,
  certified: SEGMENT_COLORS.certified,
};

export const SEGMENT_LABELS: Record<string, string> = {
  certified: "Certified",
  conditional: "Certified with conditionality",
  inProgress: "In progress",
  deferred: "Deferred",
  dueSoon: "Recert due",
  notStarted: "Not started",
};

export type SegmentBarSegments = {
  certified?: number;
  conditional?: number;
  inProgress?: number;
  deferred?: number;
  dueSoon?: number;
  notStarted?: number;
};

/** Horizontal stacked bar with vivid status segments. */
export function SegmentBar({
  segments,
  total,
  className,
}: {
  segments: SegmentBarSegments;
  total: number;
  className?: string;
}) {
  if (total <= 0) return null;
  const parts = Object.entries(segments)
    .filter(([, v]) => (v ?? 0) > 0)
    .map(([k, v]) => ({ key: k, value: v as number }));
  return (
    <div
      className={cn(
        "flex h-3 w-full overflow-hidden rounded-full bg-muted/60",
        className,
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
    >
      {parts.map((p) => (
        <div
          key={p.key}
          data-tip={`${SEGMENT_LABELS[p.key] ?? p.key}: ${p.value}`}
          className="h-full transition-all"
          style={{
            width: `${(p.value / total) * 100}%`,
            background: SEGMENT_COLORS[p.key] ?? "oklch(0.6 0.05 260)",
          }}
        />
      ))}
    </div>
  );
}

/** Dot legend matching the SegmentBar colors. */
export function SegmentLegend({
  segments,
}: {
  segments: SegmentBarSegments;
}) {
  const entries = Object.entries(SEGMENT_LABELS).filter(
    ([k]) => (segments as Record<string, number | undefined>)[k] !== undefined,
  );
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      {entries.map(([k, label]) => (
        <span key={k} className="flex items-center gap-1.5">
          <span
            className="size-2 rounded-full"
            style={{ background: SEGMENT_COLORS[k] }}
          />
          {label}
        </span>
      ))}
    </div>
  );
}
