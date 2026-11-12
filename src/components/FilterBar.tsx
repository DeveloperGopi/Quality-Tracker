import type { ReactNode } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Consistent filter toolbar used by every list page.
 *
 *  One glass panel, uniform control sizes and gaps, plus a footer that
 *  reports how many filters are active and offers a single "Clear all"
 *  reset — so the filter area reads the same on the master list, the
 *  category quick views, Reports and the summary report. */
export function FilterBar({
  children,
  activeCount = 0,
  onClearAll,
  summary,
  className,
  compact,
}: {
  children: ReactNode;
  /** Number of filters currently narrowing the list. */
  activeCount?: number;
  /** Clears every filter back to "all". */
  onClearAll?: () => void;
  /** Right-aligned result summary, e.g. "Showing 24 of 157 facilities". */
  summary?: ReactNode;
  className?: string;
  /** Master-list compact mode (redesign): ONE row of controls, no footer —
   *  the counter lives in the table footer and the active-filter state in
   *  the chips row, so the toolbar costs a single 48px line. */
  compact?: boolean;
}) {
  const hasFilters = activeCount > 0;
  return (
    <div
      className={cn(
        "glass mb-4 rounded-xl border border-border/60 p-3",
        compact && "mb-2 p-2",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2.5">{children}</div>
      {!compact && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/50 pt-2.5 text-xs text-muted-foreground">
          <SlidersHorizontal className="size-3.5" />
          {hasFilters ? (
            <>
              <span className="font-medium text-foreground">
                {activeCount} filter{activeCount === 1 ? "" : "s"} active
              </span>
              {onClearAll && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  <X className="size-3" />
                  Clear all
                </button>
              )}
            </>
          ) : (
            <span>No filters applied</span>
          )}
          {summary != null && (
            <span className="ml-auto tabular-nums">{summary}</span>
          )}
        </div>
      )}
    </div>
  );
}

/** Search box with a leading icon, sized to sit in a FilterBar. */
export function FilterSearch({
  value,
  onChange,
  placeholder,
  className,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  /** Lets the page focus this box from a keyboard shortcut ("/"). */
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className={cn("relative min-w-52 flex-1 sm:max-w-72", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="glass-input h-9 w-full rounded-lg border pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      />
    </div>
  );
}
