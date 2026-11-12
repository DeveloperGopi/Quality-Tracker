/**
 * DATE PICKER PANEL — lazy-loaded body of DateInput.
 *
 * It is rendered in a portal by DateInput (Radix Popover on desktop, a
 * bottom-sheet Dialog under 640 px), so no card, dialog, table or
 * `overflow:hidden` ancestor can clip it. The calendar is a real grid with
 * roving tabindex: arrows move by day/week, PageUp/PageDown by month,
 * Home/End to the week edges, Esc closes.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DATE_INPUT_ERROR,
  WEEKDAY_LABELS,
  dateRuleError,
  formatDateLong,
  formatDateSpoken,
  isIsoDate,
  monthGrid,
  monthName,
  shiftMonth,
  addDays,
  todayIsoIST,
} from "@/lib/dateInput";

export type DatePickerPanelProps = {
  value: string;
  onChange: (iso: string) => void;
  onClose: () => void;
  min?: string;
  max?: string;
  today?: string;
  error?: string | null;
  /** Enter/F2/ArrowDown opens with the selected day focused. */
  focusGrid?: boolean;
  /** Under 640 px: native date control in a bottom sheet. */
  mobile?: boolean;
};

const pad2 = (n: number) => String(n).padStart(2, "0");

export function DatePickerPanel({
  value,
  onChange,
  onClose,
  min,
  max,
  today = todayIsoIST(),
  error,
  focusGrid = false,
  mobile = false,
}: DatePickerPanelProps) {
  const anchor = isIsoDate(value) ? value! : today;
  const [view, setView] = useState(() => ({
    year: Number(anchor.slice(0, 4)),
    month: Number(anchor.slice(5, 7)),
  }));
  const gridRef = useRef<HTMLDivElement | null>(null);

  // A quick chip or an external save can change the value while open.
  useEffect(() => {
    if (!isIsoDate(value)) return;
    setView({ year: Number(value.slice(0, 4)), month: Number(value.slice(5, 7)) });
  }, [value]);

  useEffect(() => {
    if (!focusGrid || mobile) return;
    const id = window.setTimeout(() => {
      const el =
        gridRef.current?.querySelector<HTMLElement>('[data-day][tabindex="0"]') ??
        gridRef.current?.querySelector<HTMLElement>("[data-day]:not([disabled])");
      el?.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [focusGrid, mobile]);

  const cells = useMemo(() => monthGrid(view.year, view.month), [view.year, view.month]);
  const years = useMemo(() => {
    const base = Number(anchor.slice(0, 4));
    const from = min ? Number(min.slice(0, 4)) : base - 10;
    const to = max ? Number(max.slice(0, 4)) : base + 10;
    const lo = Math.min(from, view.year, base);
    const hi = Math.max(to, view.year, base);
    return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  }, [anchor, min, max, view.year]);

  const selected = isIsoDate(value) ? value : "";
  const tabbable =
    (selected && selected.startsWith(`${view.year}-${pad2(view.month)}`) ? selected : "") ||
    (today.startsWith(`${view.year}-${pad2(view.month)}`) &&
    !dateRuleError(today, { min, max })
      ? today
      : "") ||
    (cells.find((c) => c && !dateRuleError(c, { min, max })) ?? "");

  const viewMonthKey = `${view.year}-${pad2(view.month)}`;
  const atMin = !!min && viewMonthKey <= min.slice(0, 7);
  const atMax = !!max && viewMonthKey >= max.slice(0, 7);
  const todayBlocked = !!dateRuleError(today, { min, max });

  const moveFocus = (next: string) => {
    setView({ year: Number(next.slice(0, 4)), month: Number(next.slice(5, 7)) });
    window.setTimeout(() => {
      gridRef.current
        ?.querySelector<HTMLElement>(`[data-day="${next}"]`)
        ?.focus();
    }, 0);
  };

  const onGridKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    const from = (e.target as HTMLElement).closest<HTMLElement>("[data-day]")?.dataset.day;
    if (!from) return;
    let next = "";
    if (e.key === "ArrowLeft") next = addDays(from, -1);
    else if (e.key === "ArrowRight") next = addDays(from, 1);
    else if (e.key === "ArrowUp") next = addDays(from, -7);
    else if (e.key === "ArrowDown") next = addDays(from, 7);
    else if (e.key === "Home") {
      const dow = (new Date(`${from}T00:00:00Z`).getUTCDay() + 6) % 7;
      next = addDays(from, -dow);
    } else if (e.key === "End") {
      const dow = (new Date(`${from}T00:00:00Z`).getUTCDay() + 6) % 7;
      next = addDays(from, 6 - dow);
    } else if (e.key === "PageUp" || e.key === "PageDown") {
      const shifted = shiftMonth(
        Number(from.slice(0, 4)),
        Number(from.slice(5, 7)),
        e.key === "PageUp" ? -1 : 1,
      );
      const day = Math.min(Number(from.slice(8, 10)), new Date(Date.UTC(shifted.year, shifted.month, 0)).getUTCDate());
      next = `${shifted.year}-${pad2(shifted.month)}-${pad2(day)}`;
    }
    if (!next) return;
    e.preventDefault();
    if (next < (min ?? "0000-01-01") || next > (max ?? "9999-12-31")) return;
    moveFocus(next);
  };

  if (mobile) {
    return (
      <div data-date-panel className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <CalendarDays className="size-4" /> Choose a date
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close date picker"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" />
          </button>
        </div>
        <input
          type="date"
          autoFocus
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Date"
          className="glass-input h-11 w-full rounded-lg border border-input px-3 text-base"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={todayBlocked}
            data-tip={todayBlocked ? dateRuleError(today, { min, max }) ?? undefined : undefined}
            onClick={() => onChange(today)}
            className="min-h-11 rounded-lg border border-border px-3 text-sm font-medium disabled:opacity-50"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => onChange("")}
            className="min-h-11 rounded-lg border border-border px-3 text-sm font-medium"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto min-h-11 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Done
          </button>
        </div>
        {(error || (value && dateRuleError(value, { min, max }))) && (
          <p role="alert" aria-live="polite" className="text-xs font-medium text-destructive">
            {error || dateRuleError(value, { min, max })}
          </p>
        )}
      </div>
    );
  }

  return (
    <div data-date-panel className="w-[19.5rem] p-3" aria-label="Choose a date">
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={atMin}
          onClick={() => setView((v) => shiftMonth(v.year, v.month, -1))}
          aria-label="Previous month"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeft className="size-4" />
        </button>
        <select
          aria-label="Month"
          value={view.month}
          onChange={(e) => setView((v) => ({ ...v, month: Number(e.target.value) }))}
          className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-1 text-sm font-medium"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {monthName(i + 1)}
            </option>
          ))}
        </select>
        <select
          aria-label="Year"
          value={view.year}
          onChange={(e) => setView((v) => ({ ...v, year: Number(e.target.value) }))}
          className="h-8 w-[5.25rem] rounded-md border border-input bg-background px-1 text-sm font-medium tabular-nums"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={atMax}
          onClick={() => setView((v) => shiftMonth(v.year, v.month, 1))}
          aria-label="Next month"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7" aria-hidden>
        {WEEKDAY_LABELS.map((d) => (
          <span
            key={d}
            className="py-1 text-center text-[10px] font-semibold tracking-wide text-muted-foreground uppercase"
          >
            {d}
          </span>
        ))}
      </div>

      <div
        ref={gridRef}
        role="grid"
        aria-label={`${monthName(view.month)} ${view.year}`}
        onKeyDown={onGridKeyDown}
        className="grid grid-cols-7 gap-0.5"
      >
        {cells.map((iso, i) => {
          if (!iso) return <span key={`blank-${i}`} aria-hidden />;
          const reason = dateRuleError(iso, { min, max });
          const isSelected = iso === selected;
          const isToday = iso === today;
          const day = Number(iso.slice(8, 10));
          return (
            <span key={iso} data-tip={reason ?? undefined} className="block">
              <button
                type="button"
                data-day={iso}
                role="gridcell"
                disabled={!!reason}
                tabIndex={iso === tabbable ? 0 : -1}
                aria-selected={isSelected}
                aria-current={isToday ? "date" : undefined}
                aria-label={`${formatDateSpoken(iso)}${isToday ? " (today)" : ""}${reason ? ` — ${reason}` : ""}`}
                onClick={() => onChange(iso)}
                className={cn(
                  "flex size-9 w-full items-center justify-center rounded-md text-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected
                    ? "bg-primary font-semibold text-primary-foreground shadow-sm"
                    : isToday
                      ? "border border-primary/50 font-semibold text-primary hover:bg-primary/10"
                      : "hover:bg-muted",
                  reason && "cursor-not-allowed text-muted-foreground/40 line-through hover:bg-transparent",
                )}
              >
                {day}
              </button>
            </span>
          );
        })}
      </div>

      <div className="mt-2 flex items-center gap-1.5 border-t border-border/60 pt-2">
        <button
          type="button"
          disabled={todayBlocked}
          data-tip={todayBlocked ? dateRuleError(today, { min, max }) ?? undefined : undefined}
          onClick={() => onChange(today)}
          className="min-h-8 rounded-md border border-border/70 px-2.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => onChange("")}
          className="min-h-8 rounded-md border border-border/70 px-2.5 text-xs font-medium hover:bg-muted"
        >
          Clear
        </button>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {selected ? formatDateLong(selected) : "No date"}
        </span>
      </div>

      {(error || (value && dateRuleError(value, { min, max }))) && (
        <p role="alert" aria-live="polite" className="mt-2 text-xs font-medium text-destructive">
          {error || dateRuleError(value, { min, max })}
        </p>
      )}
      {!error && !value && (
        <p className="mt-2 text-[11px] text-muted-foreground">{DATE_INPUT_ERROR}</p>
      )}
    </div>
  );
}

export default DatePickerPanel;
