/** ONE table contract for every Data checks card: solid sticky header, one
 *  scroll area, virtualised rows and a select-all header. */

import { useRef, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type DataCheckColumn<T> = {
  key: string;
  label: string;
  /** Any valid grid track, e.g. "minmax(14rem,2fr)" or "7rem". */
  width?: string;
  align?: "left" | "right";
  render: (row: T) => ReactNode;
};

export function DataCheckTable<T>({
  rows,
  columns,
  rowKey,
  selected,
  onSelectedChange,
  empty,
  loading = false,
  height = 340,
  minWidth = 940,
  label,
  onIgnore,
}: {
  rows: T[];
  columns: DataCheckColumn<T>[];
  rowKey: (row: T) => string;
  selected: Set<string>;
  onSelectedChange: (next: Set<string>) => void;
  empty: ReactNode;
  loading?: boolean;
  height?: number;
  minWidth?: number;
  label: string;
  /** Dismiss one issue without changing its underlying assessment data. */
  onIgnore?: (row: T) => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const allKeys = rows.map(rowKey);
  const allSelected = allKeys.length > 0 && allKeys.every((key) => selected.has(key));
  const someSelected = allKeys.some((key) => selected.has(key));
  const template = `2.5rem ${columns.map((c) => c.width ?? "minmax(8rem,1fr)").join(" ")}${
    onIgnore ? " 5.6rem" : ""
  }`;

  const toggleAll = (on: boolean) => {
    const next = new Set(selected);
    for (const key of allKeys) {
      if (on) next.add(key);
      else next.delete(key);
    }
    onSelectedChange(next);
  };
  const toggleOne = (key: string, on: boolean) => {
    const next = new Set(selected);
    if (on) next.add(key);
    else next.delete(key);
    onSelectedChange(next);
  };

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 48,
    overscan: 8,
  });

  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
      <div
        ref={scrollRef}
        role="table"
        aria-label={label}
        className="overflow-auto overscroll-contain"
        style={{ height }}
      >
        <div style={{ minWidth }}>
          <div
            role="row"
            className="sticky top-0 z-20 grid h-10 items-center border-b border-border bg-white text-[11px] font-semibold tracking-wide text-muted-foreground uppercase shadow-[0_1px_0_var(--border)]"
            style={{ gridTemplateColumns: template }}
          >
            <div role="columnheader" className="flex h-full items-center justify-center bg-white px-2">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                disabled={rows.length === 0}
                onCheckedChange={(value) => toggleAll(value === true)}
                aria-label={allSelected ? "Deselect all rows" : "Select all rows"}
              />
            </div>
            {columns.map((column) => (
              <div
                key={column.key}
                role="columnheader"
                className={cn(
                  "flex h-full items-center truncate bg-white px-2",
                  column.align === "right" && "justify-end text-right",
                )}
                data-tip={column.label}
                data-tip-truncate
              >
                {column.label}
              </div>
            ))}
            {onIgnore && (
              <div role="columnheader" className="flex h-full items-center bg-white px-2">
                Action
              </div>
            )}
          </div>

          {loading ? (
            <div className="space-y-2 p-2" aria-label="Loading rows">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-muted/60" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">{empty}</div>
          ) : (
            <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index];
                if (!row) return null;
                const key = rowKey(row);
                const on = selected.has(key);
                return (
                  <div
                    key={key}
                    role="row"
                    aria-selected={on}
                    onClick={() => toggleOne(key, !on)}
                    className={cn(
                      "absolute left-0 grid w-full cursor-pointer items-center border-b border-border/40 bg-card text-xs hover:bg-muted/35",
                      on && "bg-primary/[0.035]",
                    )}
                    style={{
                      top: virtualRow.start,
                      height: 48,
                      gridTemplateColumns: template,
                    }}
                  >
                    <div
                      role="cell"
                      className="flex h-full items-center justify-center px-2"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Checkbox
                        checked={on}
                        onCheckedChange={(value) => toggleOne(key, value === true)}
                        aria-label={`Include ${key}`}
                      />
                    </div>
                    {columns.map((column) => (
                      <div
                        key={column.key}
                        role="cell"
                        className={cn(
                          "flex h-full min-w-0 items-center px-2",
                          column.align === "right" && "justify-end text-right",
                        )}
                      >
                        {column.render(row)}
                      </div>
                    ))}
                    {onIgnore && (
                      <div
                        role="cell"
                        className="flex h-full items-center px-2"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => onIgnore(row)}
                          className="rounded-md border border-border/60 px-2 py-1 text-[10.5px] font-medium text-muted-foreground hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          Ignore
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
