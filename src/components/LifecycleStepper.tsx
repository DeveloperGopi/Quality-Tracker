import { useState } from "react";
import { ArrowRight, Check, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TAB_BY_STAGE,
  type LifecycleState,
} from "@/lib/facilityProfileState";
import { StatusChip, TONE_HEX } from "@/components/StatusChip";

/** Per-facility lifecycle stepper — where this facility sits in the NQAS cycle
 *  today, plus the concrete next action.
 *
 *  Everything here comes from `getLifecycleState` (lib/facilityProfileState),
 *  the ONE rule behind this page's header chip, KPI strip, timeline and the
 *  PDF/Excel exports — so the step, the chips and the next action can never
 *  contradict each other. Clicking a step jumps to the tab that owns it.
 */
export function LifecycleStepper({
  state,
  onJump,
  ctaDisabled,
}: {
  state: LifecycleState;
  /** Called with the tab id the clicked step belongs to. */
  onJump?: (tab: string) => void;
  ctaDisabled?: boolean;
}) {
  const [ruleOpen, setRuleOpen] = useState(false);
  const currentIndex = state.stageIndex - 1;
  const total = state.stages.length;

  return (
    <section
      aria-label="Certification lifecycle"
      className="glass mb-4 rounded-xl border border-border/60 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Certification lifecycle
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Stage {state.stageIndex} of {total} · the chip, these steps and the
              next action all come from one lifecycle rule
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRuleOpen((v) => !v)}
            aria-expanded={ruleOpen}
            aria-label="How the current stage is derived"
            className="mt-0.5 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none print:hidden"
          >
            <Info className="size-4" />
          </button>
        </div>
        <StatusChip label={state.chip.label} tone={state.chip.tone} size="md" />
      </div>

      {ruleOpen && (
        <div className="mt-3 space-y-1 rounded-lg border border-border/60 bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
          <p className="font-semibold text-foreground">The rule behind the stage</p>
          <p>
            Order: eligibility → Internal Assessment → State Assessment → NQAS
            Assessment → certification → surveillance → recertification. A
            Deferred result has no stage of its own: the facility restarts this
            order after its cooling period.
          </p>
          <p>
            The stepper takes the <strong>earlier</strong> of two readings — the
            stage derived from the assessment records and the stage derived from
            the status text — so an NQAS schedule alone can never outrank an
            untouched State Assessment. This facility reads{" "}
            <strong>{state.chip.label}</strong> at stage {state.stageIndex}.
          </p>
        </div>
      )}

      {/* Steps. Vertical list on phones, one row from small screens up. */}
      <ol className="mt-3 grid gap-1.5 sm:flex sm:flex-wrap print:flex print:flex-wrap">
        {state.stages.map((stage, i) => {
          const active = stage.state === "current";
          const done = stage.state === "done";
          const dateInfo = state.stageDates[stage.key];
          const tab = TAB_BY_STAGE[stage.key];
          return (
            <li key={stage.key} className="min-w-0 sm:flex-1">
              <button
                type="button"
                aria-current={active ? "step" : undefined}
                aria-label={`Step ${i + 1} of ${total}: ${stage.label} — ${
                  active ? "current stage" : done ? "completed" : "not reached"
                }`}
                onClick={() => onJump?.(tab)}
                className={cn(
                  "flex h-full w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  active
                    ? "border-transparent text-white shadow-sm"
                    : done
                      ? "border-border/60 bg-muted/40 hover:bg-muted"
                      : "border-dashed border-border/60 hover:bg-muted/40",
                )}
                style={active ? { background: TONE_HEX[state.chip.tone] } : undefined}
                data-tip={`${stage.label}${dateInfo?.date ? ` · ${dateInfo.date}` : ""}`}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                    active
                      ? "bg-white/25 text-white"
                      : done
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-muted text-muted-foreground",
                    active && "animate-pulse",
                  )}
                >
                  {done ? <Check className="size-3" /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block text-xs leading-tight font-medium",
                      !active && !done && "text-muted-foreground",
                    )}
                  >
                    {stage.label}
                  </span>
                  {dateInfo?.date && (
                    <span
                      className={cn(
                        "block text-[11px] leading-tight",
                        active ? "text-white/85" : "text-muted-foreground",
                      )}
                    >
                      {dateInfo.date}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Next action — the one line that must always agree with the stage. */}
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-sky-300/60 bg-sky-50/70 px-3 py-2 text-sm dark:border-sky-400/30 dark:bg-sky-500/10">
        <ArrowRight className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-300" />
        <p className="min-w-0 flex-1">
          <strong>Next action:</strong> {state.nextAction.text}
        </p>
        {state.nextAction.cta && state.nextAction.targetTab && (
          <button
            type="button"
            disabled={ctaDisabled}
            onClick={() => onJump?.(state.nextAction.targetTab as string)}
            className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 print:hidden"
          >
            {state.nextAction.cta}
          </button>
        )}
      </div>
      {currentIndex >= 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Tip: click any step to jump to the tab that maintains it.
        </p>
      )}
    </section>
  );
}
