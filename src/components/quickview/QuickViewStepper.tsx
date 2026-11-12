/**
 * COMPACT LIFECYCLE STEPPER — a status display, not navigation.
 *
 * Six stages, one row, four states. Every state comes from `deriveStage`
 * (lib/facilityQuickView), which wraps the shared lifecycle rule — so a
 * "Not Eligible" facility shows Eligibility BLOCKED (reason in the tooltip)
 * and every later stage Upcoming, never a green tick.
 *
 * The old drawer had TWO tab rows (this stepper was clickable and a second
 * tabs row chose the section); the second row is gone — the vertical section
 * nav owns navigation, this bar only reports state.
 */

import { AlertOctagon, AlertTriangle, Check, Circle, Dot } from "lucide-react";

import { cn } from "@/lib/utils";
import type { QvLifecycle, QvStageState } from "@/lib/facilityQuickView";

const STATE_COPY: Record<QvStageState, string> = {
  done: "Done",
  current: "Current",
  upcoming: "Upcoming",
  blocked: "Blocked",
  warning: "Needs attention",
};

/** Stage → the section that maintains it (a click scrolls there). */
const STAGE_SECTION: Record<string, string> = {
  eligibility: "eligibility",
  sa: "state",
  nqas: "nqas",
  certification: "nqas",
  surveillance: "surveillance",
  recertification: "surveillance",
};

export function QuickViewStepper({
  lifecycle,
  onJump,
}: {
  lifecycle: QvLifecycle;
  /** Clicking a step scrolls to its section (it is a status display, not a
   *  navigation tab — the section nav stays the only tab bar). */
  onJump?: (section: string) => void;
}) {
  return (
    <div
      className="sticky top-0 z-10 border-b border-border/60 bg-muted/30 px-4 py-2 backdrop-blur"
      role="group"
      aria-label="Certification lifecycle (status only)"
    >
      <ol className="flex items-stretch gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {lifecycle.stages.map((stage, i) => {
          const state = stage.state;
          const active = state === "current" || state === "blocked";
          return (
            <li key={stage.key} className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onJump?.(STAGE_SECTION[stage.key] ?? "overview")}
                data-stage={stage.key}
                data-state={state}
                aria-label={`${stage.label}: ${STATE_COPY[state]}. Open the section`}
                aria-current={active ? "step" : undefined}
                data-tip={[stage.tooltip, stage.detail].filter(Boolean).join(" · ") || state}
                className={cn(
                  // Two short lines rather than a clipped label: at 1366 px the
                  // old truncate cut "Surveillance" to "Surveillanc…".
                  "flex h-9 w-full min-w-0 items-center gap-1.5 rounded-lg border px-1.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  state === "done" && "border-emerald-200 bg-emerald-50/70 text-emerald-900",
                  state === "current" && "border-primary/40 bg-primary/10 text-foreground",
                  state === "upcoming" && "border-dashed border-border/60 text-muted-foreground",
                  state === "blocked" && "border-rose-300 bg-rose-50 text-rose-900",
                  state === "warning" && "border-amber-300 bg-amber-50/70 text-amber-900",
                )}
              >
                <StageIcon state={state} index={i} />
                <span className="min-w-0 text-[10.5px] leading-[1.1] font-semibold">
                  {stage.label}
                </span>
                <span className="sr-only">{STATE_COPY[state]}</span>
              </button>
            </li>
          );
        })}
      </ol>
      {lifecycle.blockedReason && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-rose-800">
          <AlertOctagon className="size-3.5 shrink-0" aria-hidden />
          {lifecycle.blockedReason}
        </p>
      )}
    </div>
  );
}

function StageIcon({ state, index }: { state: QvStageState; index: number }) {
  if (state === "done") return <Check className="size-3.5 shrink-0" aria-hidden />;
  if (state === "blocked") return <AlertOctagon className="size-3.5 shrink-0" aria-hidden />;
  if (state === "warning") return <AlertTriangle className="size-3.5 shrink-0" aria-hidden />;
  if (state === "current") return <Dot className="size-5 shrink-0" aria-hidden />;
  return (
    <Circle className="size-3 shrink-0 opacity-50" aria-hidden data-step={index + 1} />
  );
}
