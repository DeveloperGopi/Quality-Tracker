/**
 * Plain-CSS score bars. The number is always printed; the band colour is a
 * reading helper only. No chart library, no animation, light theme.
 */

import { cn } from "@/lib/utils";
import {
  DEFAULT_SCORE_BANDS,
  scoreBandFor,
  type ScoreBands,
} from "@/lib/scoreBands";

export function ScoreBar({
  label,
  value,
  bands = DEFAULT_SCORE_BANDS,
  hint,
  className,
}: {
  label: string;
  value: number | null | undefined;
  bands?: ScoreBands;
  hint?: string;
  className?: string;
}) {
  const band = scoreBandFor(value, bands);
  const width = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-baseline gap-2">
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={label}>
          {label}
        </span>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
          {value == null ? "-" : value.toFixed(2)}
        </span>
        {hint ? <span className="shrink-0 text-[10px] text-muted-foreground">{hint}</span> : null}
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full motion-safe:transition-[width] motion-safe:duration-300"
          style={{
            width: `${width}%`,
            backgroundColor: band?.colour ?? "var(--muted-foreground)",
          }}
          aria-hidden
        />
      </div>
    </div>
  );
}

export function ScoreLegend({ bands }: { bands: ScoreBands }) {
  const examples = [Math.max(0, bands.below - 1), bands.satisfactory, bands.excellent];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
      <span className="font-medium text-foreground">Colour guide</span>
      {examples.map((value) => {
        const band = scoreBandFor(value, bands);
        return (
          <span key={value} className="inline-flex items-center gap-1">
            <span
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: band?.colour ?? "#94a3b8" }}
              aria-hidden
            />
            {band?.label ?? "-"}
          </span>
        );
      })}
      <span>Numbers are always shown.</span>
    </div>
  );
}
