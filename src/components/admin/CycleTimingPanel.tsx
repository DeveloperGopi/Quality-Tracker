// Workspace → Cycle timing.
//
// Six numbers drive every derived date in the app. They are edited with
// clamped +/− steppers (no free typing → no invalid values, so “Save all” can
// never write an out-of-range number) and explained with plain-language helper
// text plus a visual timeline of what the current numbers produce.

import { Minus, Plus, Timer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DEFAULT_SETTINGS } from "@/convex/lifecycle";
import {
  CYCLE_TIMING_FIELDS,
  cycleTimelinePreview,
  type SettingsDraft,
} from "@/lib/adminSettings";
import { cn } from "@/lib/utils";
import { SectionHeader, UnsavedDot } from "@/components/admin/AdminUi";

export function CycleTimingPanel({
  settings,
  draft,
  setPending,
}: {
  settings: Record<string, unknown>;
  draft: SettingsDraft;
  setPending: (key: string, value: unknown) => void;
}) {
  // DEFAULT_SETTINGS mixes arrays/booleans with the numbers we read here, so
  // the lookup is narrowed to the numeric keys explicitly.
  const DEFAULTS_NUMERIC = DEFAULT_SETTINGS as unknown as Record<string, number>;
  const storedOf = (key: string) =>
    Number((settings[key] as number | undefined) ?? DEFAULTS_NUMERIC[key] ?? 0);
  const valueOf = (key: string) => Number(draft[key] ?? storedOf(key));

  const setValue = (key: string, raw: number) => {
    const field = CYCLE_TIMING_FIELDS.find((f) => f.key === key)!;
    // Clamp: the UI can never produce (or save) an out-of-range value.
    const next = Math.min(field.max, Math.max(field.min, Math.round(raw)));
    setPending(key, next === storedOf(key) ? undefined : next);
  };

  const current: Record<string, number> = {};
  for (const f of CYCLE_TIMING_FIELDS) current[f.key] = valueOf(f.key);
  const timeline = cycleTimelinePreview(current);

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={Timer}
        title="Cycle timing"
        description="How long a certificate lasts, how soon a deferred facility may re-take its State Assessment, and when the alerts appear."
        right={
          Object.keys(draft).some((k) => CYCLE_TIMING_FIELDS.some((f) => f.key === k)) ? (
            <UnsavedDot />
          ) : null
        }
      />

      <div className="grid gap-3 lg:grid-cols-2">
        {CYCLE_TIMING_FIELDS.map((f) => {
          const value = valueOf(f.key);
          const changed = value !== storedOf(f.key);
          return (
            <div
              key={f.key}
              id={`timing-${f.key}`}
              data-admin-anchor={`timing-${f.key}`}
              className={cn(
                "scroll-mt-40 rounded-xl border bg-background/60 p-3 transition-colors",
                changed ? "border-primary/40 bg-primary/5" : "border-border/60",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <label
                    htmlFor={`timing-input-${f.key}`}
                    className="text-sm font-semibold text-foreground"
                  >
                    {f.label}
                  </label>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                    {f.hint}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-10"
                    aria-label={`Decrease ${f.label}`}
                    disabled={value <= f.min}
                    onClick={() => setValue(f.key, value - f.step)}
                  >
                    <Minus className="size-4" />
                  </Button>
                  <input
                    id={`timing-input-${f.key}`}
                    type="number"
                    inputMode="numeric"
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    value={value}
                    aria-describedby={`timing-help-${f.key}`}
                    onChange={(e) => setValue(f.key, Number(e.target.value))}
                    className="glass-input h-10 w-20 rounded-md border text-center text-base font-semibold tabular-nums"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-10"
                    aria-label={`Increase ${f.label}`}
                    disabled={value >= f.max}
                    onClick={() => setValue(f.key, value + f.step)}
                  >
                    <Plus className="size-4" />
                  </Button>
                  <span className="w-14 text-sm font-medium text-muted-foreground">
                    {f.unit}
                  </span>
                </div>
              </div>
              <p
                id={`timing-help-${f.key}`}
                className="mt-2 text-xs text-muted-foreground"
              >
                Allowed: {f.min}–{f.max} {f.unit}
                {changed && (
                  <span className="ml-1 font-semibold text-primary">
                    · was {storedOf(f.key)} {f.unit}
                  </span>
                )}
              </p>
            </div>
          );
        })}
      </div>

      {/* Visual preview of what these numbers mean on a real cycle. */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          What this produces
        </p>
        <ol className="mt-3 space-y-2">
          {timeline.map((step, i) => (
            <li key={step.label} className="flex items-start gap-3">
              <span className="flex flex-col items-center">
                <span
                  className={cn(
                    "size-2.5 rounded-full",
                    step.tone === "start" && "bg-primary",
                    step.tone === "mid" && "bg-sky-500",
                    step.tone === "alert" && "bg-amber-500",
                    step.tone === "end" && "bg-muted-foreground",
                  )}
                  aria-hidden
                />
                {i < timeline.length - 1 && (
                  <span className="mt-1 h-6 w-px bg-border" aria-hidden />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">
                  {step.label}
                </span>
                <span className="block text-sm text-muted-foreground">{step.offset}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <p className="rounded-xl border border-sky-300/60 bg-sky-50/70 p-3 text-sm text-sky-900 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-100">
        <strong>Applies to new derivations only.</strong> Existing records are
        not rewritten — facilities whose validity date is already stored keep
        it, and only dates calculated from now on use these numbers.
      </p>
    </div>
  );
}
