/**
 * SECTION NAV — the ONLY navigation in the dialog (the second tab row is
 * gone). Left vertical rail at ≥768 px; below that a horizontal scroll-snap
 * strip that never clips its labels.
 *
 * Each item carries a completeness dot ("7 of 9 fields") or a warning dot
 * when the section has a Needs-attention item.
 */

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import type { QvSectionDef } from "@/lib/facilityQuickView";

export type SectionNavItem = {
  def: QvSectionDef;
  done: number;
  total: number;
  /** A missing required item / non-blocking conflict → amber dot. */
  warning: boolean;
  /** A blocking error (e.g. a future done date) → red dot. */
  error?: boolean;
  /** Not applicable to this facility (no gap fund, not certified) → ring. */
  notApplicable?: boolean;
};

export function SectionNav({
  items,
  active,
  onSelect,
}: {
  items: SectionNavItem[];
  active: string;
  onSelect: (key: string) => void;
}) {
  return (
    <nav
      aria-label="Facility sections"
      className={cn(
        // Rail on desktop…
        "shrink-0 border-border/60 max-md:border-b md:w-[200px] md:border-r md:py-2",
        // …scroll-snap strip on phones/tablets.
        "max-md:flex max-md:snap-x max-md:snap-mandatory max-md:gap-1 max-md:overflow-x-auto max-md:px-2 max-md:py-1.5 max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden",
      )}
    >
      {items.map(({ def, done, total, warning, error = false, notApplicable = false }) => {
        const complete = total > 0 && done === total;
        const isActive = active === def.key;
        return (
          <button
            key={def.key}
            type="button"
            onClick={() => onSelect(def.key)}
            aria-current={isActive ? "true" : undefined}
            data-section-nav={def.key}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2.5 text-left text-[13px] font-medium transition-colors",
              "min-h-9 md:w-full max-md:shrink-0 max-md:snap-start max-md:whitespace-nowrap",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            data-tip={
              notApplicable
                ? `${def.label} — not applicable to this facility`
                : `${def.label} — ${
                    total ? `${done} of ${total} required fields filled` : "history"
                  }${error ? " · error" : warning ? " · missing required item" : ""}`
            }
          >
            {/* ONE indicator system: solid green check = complete, amber dot =
                missing required item, red dot = error, grey ring = n/a. */}
            {error || warning ? (
              <span
                aria-hidden
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  error ? "bg-rose-500" : "bg-amber-500",
                )}
              />
            ) : complete ? (
              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check className="size-2.5" aria-hidden />
              </span>
            ) : (
              <span
                aria-hidden
                className={cn(
                  "size-2.5 shrink-0 rounded-full",
                  notApplicable
                    ? "border border-muted-foreground/40"
                    : "bg-emerald-500/25",
                )}
              />
            )}
            <span className="min-w-0">{def.label}</span>
            <span className="ml-auto shrink-0 text-[10px] tabular-nums text-muted-foreground max-md:hidden">
              {notApplicable || total === 0 ? "" : `${done}/${total}`}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
