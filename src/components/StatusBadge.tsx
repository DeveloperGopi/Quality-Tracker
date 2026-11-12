/**
 * ONE status badge for every status column and list.
 *
 * The colour map is fixed so a status never changes meaning between pages:
 *   Certified / Quality Certified       green
 *   Eligible                            blue
 *   Conditional / Deferred              amber
 *   Overdue / Expired                   red
 *   Not started / Not Eligible          quiet grey text, no border
 *
 * Text is never truncated: long values wrap inside the badge and the full
 * value stays in the tooltip.
 */

import { cn } from "@/lib/utils";
import type { StatusTone } from "@/convex/lifecycle";

type BadgeTone = StatusTone | "plain";

const toneClasses: Record<BadgeTone, string> = {
  green: "border-emerald-300/70 bg-emerald-100 text-emerald-800",
  amber: "border-amber-300/70 bg-amber-100 text-amber-800",
  red: "border-rose-300/70 bg-rose-100 text-rose-800",
  blue: "border-sky-300/70 bg-sky-100 text-sky-800",
  slate: "border-slate-300/70 bg-slate-100 text-slate-700",
  violet: "border-violet-300/70 bg-violet-100 text-violet-800",
  plain: "border-transparent bg-transparent text-muted-foreground",
};

/** The fixed meaning map. Order matters: “Not Eligible” is never blue and
 *  “Quality Certified with Conditionality” is conditional amber. */
export function statusToneOf(status: string): BadgeTone {
  const value = status.trim().toLowerCase();
  if (!value) return "plain";
  if (/overdue|expired|expiring/.test(value)) return "red";
  if (/condition|deferred/.test(value)) return "amber";
  if (/not eligible|not started|not obtained|not applicable|no cycle|pending/.test(value))
    return "plain";
  if (/eligible/.test(value)) return "blue";
  if (/certified|quality certified/.test(value)) return "green";
  if (/valid|done|uploaded|completed/.test(value)) return "green";
  if (/due|scheduled/.test(value)) return "blue";
  return "slate";
}

export function StatusBadge({
  status,
  className,
  compact = false,
}: {
  status: string;
  className?: string;
  /** Compact rows use slightly smaller type; the text still wraps. */
  compact?: boolean;
}) {
  const text = status.trim() || "-";
  const tone = statusToneOf(text);
  return (
    <span
      data-tip={text}
      title={text}
      className={cn(
        "inline-flex min-w-0 max-w-full items-center justify-center rounded-full border text-center font-medium break-words whitespace-normal",
        compact ? "px-1.5 py-0 text-[10px] leading-[1.15]" : "px-2 py-0.5 text-[11px] leading-[1.2]",
        toneClasses[tone],
        className,
      )}
    >
      {text}
    </span>
  );
}
