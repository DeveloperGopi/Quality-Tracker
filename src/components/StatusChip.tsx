// The app-wide status palette — one tone mapping for the header chip, KPI
// cards, lifecycle steps, the certification timeline and the exported PDF /
// Excel status cells. Colour is NEVER the only indicator: every tone pairs a
// distinct icon with its label, so the chip still reads in black & white and
// for colour-blind users.
//
//   grey   Not eligible / not started
//   blue   Eligible / in progress / scheduled
//   amber  Recertification or conditionality due
//   purple Result awaited
//   green  Certified
//   red    Overdue / expired / deferred

import {
  AlertOctagon,
  BadgeCheck,
  CalendarClock,
  CircleDashed,
  Clock4,
  Hourglass,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type Tone = "grey" | "blue" | "amber" | "purple" | "green" | "red";

/** Icon per tone — the non-colour half of the status signal. */
export const TONE_ICON: Record<Tone, LucideIcon> = {
  grey: CircleDashed,
  blue: CalendarClock,
  amber: Clock4,
  purple: Hourglass,
  green: BadgeCheck,
  red: AlertOctagon,
};

/** Chip surface classes — light and dark mode both pass WCAG AA on text. */
export const TONE_CHIP: Record<Tone, string> = {
  grey: "border-border bg-muted text-muted-foreground",
  blue: "border-sky-300/70 bg-sky-100 text-sky-900 dark:border-sky-400/40 dark:bg-sky-500/15 dark:text-sky-100",
  amber:
    "border-amber-300/80 bg-amber-100 text-amber-900 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-100",
  purple:
    "border-violet-300/70 bg-violet-100 text-violet-900 dark:border-violet-400/40 dark:bg-violet-500/15 dark:text-violet-100",
  green:
    "border-emerald-300/70 bg-emerald-100 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-100",
  red: "border-rose-300/80 bg-rose-100 text-rose-900 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-100",
};

/** Inline (SVG-safe) hex per tone — stepper step fills and progress bars. */
export const TONE_HEX: Record<Tone, string> = {
  grey: "#64748b",
  blue: "#0284c7",
  amber: "#d97706",
  purple: "#7c3aed",
  green: "#059669",
  red: "#dc2626",
};

export function ToneIcon({ tone, className }: { tone: Tone; className?: string }) {
  const Icon = TONE_ICON[tone];
  return <Icon className={cn("size-3.5 shrink-0", className)} aria-hidden />;
}

/** Icon + text status chip (aria-label carries the status for screen readers). */
export function StatusChip({
  label,
  tone,
  className,
  size = "sm",
}: {
  label: string;
  tone: Tone;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      role="status"
      aria-label={`Status: ${label}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold",
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
        TONE_CHIP[tone],
        className,
      )}
    >
      <ToneIcon tone={tone} />
      {label}
    </span>
  );
}

/** Score/validation progress bar — tone-coloured, always with a text value
 *  beside it (never colour alone). */
export function ToneBar({
  value,
  tone,
  max = 100,
  className,
}: {
  value: number;
  tone: Tone;
  max?: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
      role="img"
      aria-label={`${value} of ${max}`}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${pct}%`, background: TONE_HEX[tone] }}
      />
    </div>
  );
}
