/**
 * FILTER CHIPS — the honest summary of why the list is short.
 *
 * One removable chip per active filter value ("Block: Alangayam ✕"), one
 * "Clear all filters" button that appears only when something IS filtered, and
 * the "Filters restored" notice that explains a filter the user did not just
 * set (they came back from a link or from their last visit).
 *
 * "Clear all filters" drops filters + search but keeps the sort and the columns
 * — resetting those is the job of "Reset view", which also offers an Undo.
 */

import type { ReactNode } from "react";
import { FilterX, RotateCcw, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type FilterChip = {
  /** Stable identity (filter key + value) — used as the React key. */
  key: string;
  /** What the user sees, e.g. "Block: Alangayam". */
  label: string;
  /** Removes ONLY this filter value. */
  onRemove: () => void;
};

/** Small dismissible "why is this list filtered?" notice. */
export function RestoredNotice({
  from,
  onDismiss,
}: {
  from: "url" | "session";
  onDismiss: () => void;
}) {
  return (
    <span
      data-testid="filters-restored"
      className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-sky-300/70 bg-sky-500/10 pr-1 pl-3 text-xs font-medium text-sky-900 dark:border-sky-400/40 dark:text-sky-100"
    >
      {from === "url"
        ? "Filters restored from this link"
        : "Filters restored from your last visit"}
      <button
        type="button"
        aria-label="Dismiss the restored-filters notice"
        onClick={onDismiss}
        className="rounded-full p-1.5 transition-colors hover:bg-sky-500/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}

export function FilterChips({
  chips,
  onClearAll,
  onResetView,
  notice,
  className,
  showResetView = true,
  compact = false,
}: {
  chips: FilterChip[];
  /** Clears every filter + the search; keeps sort and columns. */
  onClearAll: () => void;
  /** Back to a clean view (filters, search, sort, page, columns) with Undo. */
  onResetView: () => void;
  notice?: ReactNode;
  className?: string;
  /** The Master List puts Reset view in its View menu instead. */
  showResetView?: boolean;
  /** A thin, single-line summary for a fixed command area. */
  compact?: boolean;
}) {
  return (
    <div
      data-testid="filter-chips"
      className={cn(
        "flex flex-wrap items-center",
        compact ? "gap-1.5" : "mb-3 gap-2",
        className,
      )}
    >
      {notice}
      {chips.length > 0 && (
        <span
          className={cn(
            "font-medium text-muted-foreground",
            compact ? "text-[11px]" : "text-xs",
          )}
        >
          Filters
        </span>
      )}
      {chips.map((c) => (
        <span
          key={c.key}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 font-medium",
            compact ? "min-h-7 pr-0.5 pl-2.5 text-[11px]" : "min-h-9 pr-1 pl-3 text-xs",
          )}
        >
          {c.label}
          <button
            type="button"
            aria-label={`Remove filter ${c.label}`}
            onClick={c.onRemove}
            className={cn(
              "rounded-full transition-colors hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              compact ? "p-1" : "p-1.5",
            )}
          >
            <FilterX className="size-3" />
          </button>
        </span>
      ))}
      {chips.length > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "gap-1.5 rounded-full",
            compact ? "h-7 px-2.5 text-[11px]" : "h-9 px-3 text-xs",
          )}
          onClick={onClearAll}
        >
          <X className="size-3.5" />
          {compact ? "Clear all" : "Clear all filters"}
        </Button>
      )}
      {showResetView && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-testid="reset-view"
          className="ml-auto h-9 gap-1.5 text-xs"
          onClick={onResetView}
          data-tip="Clear filters, search, sort and columns — back to the default view"
        >
          <RotateCcw className="size-3.5" />
          Reset view
        </Button>
      )}
    </div>
  );
}
