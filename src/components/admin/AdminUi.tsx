// Shared Admin Settings primitives. Small, dependency-free building blocks so
// every panel looks and behaves the same: section headers with a one-line
// description, count badges, empty states, an On/Off toggle row and the little
// facility-count bar used by the Blocks table.
//
// Style rules used throughout the redesigned page: body text 14–16px, labels
// 12px uppercase in a readable (never light-grey-on-light) muted tone, a single
// teal/blue primary, green for success/on, amber for warnings, red only for
// destructive actions, 8px spacing grid, 12px radii, visible focus rings.

import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export function SectionHeader({
  icon: Icon,
  title,
  description,
  right,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
          {description && (
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {right && <div className="flex shrink-0 flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}

/** Small numeral badge for tab / sub-nav counters. */
export function CountBadge({
  value,
  tone = "neutral",
  className,
}: {
  value: number | string;
  tone?: "neutral" | "primary" | "warning";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-6 items-center justify-center rounded-full border px-1.5 py-0.5 text-xs font-semibold tabular-nums",
        tone === "primary" && "border-primary/30 bg-primary/10 text-primary",
        tone === "warning" &&
          "border-amber-300/70 bg-amber-100 text-amber-900 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-100",
        tone === "neutral" && "border-border/60 bg-muted/60 text-muted-foreground",
        className,
      )}
    >
      {value}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10 text-center",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm ring-1 ring-border/60">
        <Icon className="size-6" />
      </span>
      <p className="mt-3 text-base font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Saving state pill: spinner while writing, tick when saved, retry on error. */
export function SaveStatePill({
  state,
  onRetry,
}: {
  state: "idle" | "saving" | "saved" | "error";
  onRetry?: () => void;
}) {
  if (state === "idle") return null;
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Saving…
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/70 bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-100">
        Saved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className="rounded-full border border-rose-300/80 bg-rose-100 px-2.5 py-1 font-semibold text-rose-900 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-100">
        Could not save
      </span>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      )}
    </span>
  );
}

/** A labelled toggle row — On/Off is written out, never colour alone. */
export function ToggleRow({
  id,
  checked,
  onCheckedChange,
  title,
  description,
  icon: Icon,
  disabled,
  hint,
  right,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  title: string;
  description: string;
  icon?: LucideIcon;
  disabled?: boolean;
  hint?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/50 p-3 transition-colors hover:bg-muted/30">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span
            className={cn(
              "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg",
              checked ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-100" : "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="size-4" />
          </span>
        )}
        <div className="min-w-0">
          <label
            htmlFor={id}
            className="cursor-pointer text-sm font-semibold text-foreground"
          >
            {title}
          </label>
          <p className="mt-0.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {right}
        <span
          className={cn(
            "text-xs font-semibold",
            checked ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground",
          )}
        >
          {checked ? "On" : "Off"}
        </span>
        <Switch
          id={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={onCheckedChange}
          aria-label={`${title}: ${checked ? "on" : "off"}`}
        />
      </div>
    </div>
  );
}

/** Facility-count mini bar — the number is always printed next to the bar. */
export function MiniBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex min-w-28 items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-12 text-right text-sm tabular-nums text-muted-foreground">
        {value}
      </span>
    </div>
  );
}

/** Amber “unsaved” dot used on cards/sections with pending edits. */
export function UnsavedDot({ children }: { children?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/70 bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-100">
      <span className="size-1.5 rounded-full bg-amber-500" aria-hidden />
      {children ?? "Unsaved"}
    </span>
  );
}
