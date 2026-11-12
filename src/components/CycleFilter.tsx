/**
 * CERTIFICATION CYCLE FILTER — the ONE control, inside each page's filters.
 *
 * It is deliberately NOT in the page header any more (it used to be a native
 * <select> reading "Cycle: Cycle #2" on every page). It now renders inside the
 * page's own Filters section, next to Block and Facility Type, and only on
 * pages that are cycle-based — `cyclePageScope` decides, so a non-cycle page
 * (Internal Assessment, Gap Closure, Building, Fire NOC) shows nothing at all.
 *
 * The value is the existing global context: `?cycleScope=current|1|2|all` plus
 * the remembered choice in localStorage, so it follows the user across pages,
 * Back restores it, and a link is shareable.
 *
 * Labelling rules:
 *   trigger → "Cycle: Current"  (never "Cycle: Cycle #2"; no count badge)
 *   options → one line each: Current cycle · Cycle #1 · Cycle #2 ·
 *             All cycles (list pages only); explanation lives in the info tip
 *
 * Counts come from the tiny `cycleSummary` query (certificationCycles), never
 * from the heavy rows query, so opening the menu cannot refetch a list.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useLocation, useSearchParams } from "react-router";
import { useQuery } from "convex/react";
import { CalendarRange, Check, ChevronDown, Info, X } from "lucide-react";

import { api } from "@/convex/_generated/api";
import {
  CYCLE_APPLIES_TO,
  CYCLE_SCOPE_PARAM,
  CYCLE_SCOPE_STORAGE,
  cycleOptionLabel,
  cyclePageScope,
  cycleShortLabel,
  cycleScopeLabel,
  parseCycleScope,
  serializeCycleScope,
  type CycleScope,
} from "@/lib/cycleScope";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type CycleCounts = {
  current: number;
  all: number;
  cycles: { cycleNumber: number; cycleType: string; count: number }[];
};

/** Read the cycle summary once for the menu (and the notice banner). */
function useCycleSummary(): CycleCounts | undefined {
  return useQuery(api.modules.cycleSummary, {}) as CycleCounts | undefined;
}

/** Write the shared choice (URL + remembered per user). Exported so a page's
 *  "Clear all filters" can reset the cycle with everything else. */
export function useSetCycleScope() {
  const [params, setParams] = useSearchParams();
  return useCallback(
    (value: CycleScope) => {
      const next = new URLSearchParams(params);
      if (value === "current") next.delete(CYCLE_SCOPE_PARAM);
      else next.set(CYCLE_SCOPE_PARAM, serializeCycleScope(value));
      setParams(next, { replace: false });
      try {
        window.localStorage.setItem(CYCLE_SCOPE_STORAGE, serializeCycleScope(value));
      } catch {
        /* storage unavailable — the URL still carries the choice */
      }
    },
    [params, setParams],
  );
}

export function CycleFilter({
  className,
  allowAll,
  showChip = true,
}: {
  className?: string;
  /** Override the page default (summaries never offer "All cycles"). */
  allowAll?: boolean;
  /** The removable "Cycle: …" active-filter chip next to the trigger. */
  showChip?: boolean;
}) {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const page = useMemo(() => cyclePageScope(pathname), [pathname]);
  const scope = parseCycleScope(params.get(CYCLE_SCOPE_PARAM));
  const setScope = useSetCycleScope();
  const summary = useCycleSummary();
  const [open, setOpen] = useState(false);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const allAllowed = allowAll ?? page.allowAll;
  const options: CycleScope[] = useMemo(
    () => [
      "current",
      ...(summary?.cycles ?? []).map((c) => c.cycleNumber as CycleScope),
      ...(allAllowed ? (["all"] as CycleScope[]) : []),
    ],
    [summary, allAllowed],
  );

  const countFor = (option: CycleScope): number | undefined => {
    if (!summary) return undefined;
    if (option === "current") return summary.current;
    if (option === "all") return summary.all;
    return summary.cycles.find((c) => c.cycleNumber === option)?.count ?? 0;
  };
  const typeFor = (option: CycleScope): string | undefined =>
    option === "current" || option === "all"
      ? undefined
      : summary?.cycles.find((c) => c.cycleNumber === option)?.cycleType;

  // Remembered choice → first read of a cycle page without the param.
  useEffect(() => {
    if (page.mode === "none") return;
    if (params.get(CYCLE_SCOPE_PARAM) != null) return;
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(CYCLE_SCOPE_STORAGE);
    } catch {
      stored = null;
    }
    const remembered = parseCycleScope(stored);
    if (remembered === "current") return;
    if (remembered === "all" && !allAllowed) return;
    setScope(remembered);
  }, [page.mode, allAllowed, params, setScope]);

  // Non-cycle pages: no control anywhere (the brief's rule 3).
  if (page.mode === "none") return null;

  const choose = (option: CycleScope) => {
    setScope(option);
    setOpen(false);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const buttons = optionRefs.current.filter(Boolean) as HTMLButtonElement[];
    if (buttons.length === 0) return;
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      buttons[(index + 1 + buttons.length) % buttons.length]?.focus();
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      buttons[(index - 1 + buttons.length) % buttons.length]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      buttons[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      buttons[buttons.length - 1]?.focus();
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const active = scope !== "current";
  const short = cycleShortLabel(scope);

  return (
    <div
      className={cn("flex min-w-0 flex-wrap items-center gap-1.5", className)}
      data-testid="cycle-filter"
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Certification cycle: ${short}`}
            aria-haspopup="dialog"
            className={cn(
              "inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              active
                ? "border-primary/50 bg-primary/10 text-foreground"
                : "border-input bg-background hover:bg-accent",
            )}
            data-testid="cycle-filter-trigger"
          >
            <CalendarRange className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">
              Cycle: <span className="font-semibold">{short}</span>
            </span>
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={6}
          className={cn(
            "w-[19rem] max-w-[calc(100vw-1rem)] p-2",
            // Bottom sheet below 768px: full width, pinned to the bottom edge.
            "max-md:!fixed max-md:!inset-x-2 max-md:!bottom-2 max-md:!top-auto max-md:!w-auto max-md:!max-w-none max-md:!translate-x-0 max-md:!translate-y-0",
          )}
          data-testid="cycle-filter-menu"
        >
          <p className="mb-1 flex items-center gap-1 px-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Certification cycle
            <Info
              className="size-3.5"
              data-tip={CYCLE_APPLIES_TO}
              aria-hidden="true"
            />
          </p>
          <div
            role="radiogroup"
            aria-label="Certification cycle"
            onKeyDown={onKeyDown}
            className="grid gap-0.5"
          >
            {options.map((option, i) => {
              const count = countFor(option);
              const empty = count === 0;
              const selected = option === scope;
              return (
                <button
                  key={serializeCycleScope(option)}
                  ref={(el) => {
                    optionRefs.current[i] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-disabled={empty}
                  disabled={empty}
                  onClick={() => choose(option)}
                  className={cn(
                    "flex min-h-9 w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    selected
                      ? "bg-primary/10 text-foreground"
                      : "hover:bg-muted/70",
                    empty && "cursor-not-allowed opacity-50",
                  )}
                  data-testid={`cycle-option-${serializeCycleScope(option)}`}
                >
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    {selected && <Check className="size-4 text-primary" aria-hidden />}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium whitespace-nowrap">
                    {cycleOptionLabel(option, typeFor(option))}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {empty ? "No facilities yet" : (count ?? "")}
                  </span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {showChip && active && (
        <span
          className="inline-flex min-h-8 items-center gap-1 rounded-full border border-primary/40 bg-primary/10 pr-1 pl-2.5 text-[11px] font-medium"
          data-testid="cycle-filter-chip"
        >
          Cycle: {short}
          <button
            type="button"
            aria-label="Remove the certification cycle filter"
            onClick={() => setScope("current")}
            className="rounded-full p-1 transition-colors hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <X className="size-3" />
          </button>
        </span>
      )}
    </div>
  );
}

/** The old hook name keeps every page's data query unchanged. */
export function useCycleScope(): CycleScope {
  const [params] = useSearchParams();
  return parseCycleScope(params.get(CYCLE_SCOPE_PARAM));
}

/**
 * A past cycle is history: a thin line above the content says so and offers
 * the one action that matters. Rendered once, by the app shell, so every page
 * gets it without repeating markup.
 */
export function CycleScopeBanner() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const page = useMemo(() => cyclePageScope(pathname), [pathname]);
  const scope = parseCycleScope(params.get(CYCLE_SCOPE_PARAM));
  const setScope = useSetCycleScope();
  const summary = useCycleSummary();
  if (page.mode === "none" || typeof scope !== "number") return null;
  const type =
    summary?.cycles.find((c) => c.cycleNumber === scope)?.cycleType ?? null;
  return (
    <div
      className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-900"
      data-testid="cycle-readonly-banner"
    >
      <CalendarRange className="size-3.5 shrink-0" aria-hidden />
      <span>
        Viewing <strong>{cycleScopeLabel(scope)}</strong>
        {type ? ` (${cycleOptionLabel(scope, type)})` : ""} — a past cycle.
        Records are shown read-only.
      </span>
      <button
        type="button"
        onClick={() => setScope("current")}
        className="ml-auto rounded-md border border-amber-400/70 bg-background px-2 py-0.5 font-semibold text-foreground hover:bg-muted"
      >
        Back to current
      </button>
    </div>
  );
}
