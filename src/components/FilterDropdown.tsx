/**
 * FILTER DROPDOWN — ONE pattern for every list filter in the app.
 *
 * The rule, everywhere and without exception:
 *
 *   nothing checked  = no filter = all records shown
 *   checked items    = show only those
 *
 * That is why the trigger always spells out the state ("Block: All" →
 * "Block: Alangayam, DMS" → "Block: 3 selected") and why the panel has exactly
 * ONE reset action ("Clear", disabled when nothing is selected). The old
 * panel had "Clear selection", "Clear all" AND "All 7 shown" — three ways to
 * say the same thing, none of which matched what the checkboxes showed.
 *
 * Everything else is feedback while you choose:
 *   • a search box (only when the list has more than 8 options),
 *   • live "(23)" counts computed against the OTHER active filters — options
 *     with 0 results are greyed but still selectable,
 *   • a tri-state "Select all (23)" (long lists only) that means "every
 *     visible option is checked",
 *   • a footer that answers the only question that matters — "Showing 23 of
 *     157 facilities" — plus a primary "Done" that just closes the panel
 *     (filters apply instantly as you tick; Done never re-applies anything).
 *
 * Keyboard: ↑/↓ move, Space/Enter toggle, letters type-ahead, Esc closes.
 * Mobile (≤ 640px) the panel is a bottom sheet with 44px rows.
 */

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Minus, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { filterTriggerText } from "@/lib/listUrlState";

export interface FilterDropdownProps {
  /** Filter name, e.g. "Block" — shown as "Block: Alangayam" on the trigger. */
  label: string;
  /** Options. `count` is how many facilities would remain if this option were
   *  the only one selected from this filter (live, given the other filters). */
  options: { value: string; label: string; count?: number }[];
  /** Explicitly selected values. An EMPTY array means "no filter — show all". */
  value: string[];
  /** Called with the new explicit selection (an empty array = show all). */
  onChange: (next: string[]) => void;
  /** Width of the trigger button. */
  triggerWidth?: string;
  /** Extra classes for the trigger button wrapper. */
  className?: string;
  /** Live result counts, when the page can compute them. */
  summary?: { shown: number; total: number; noun?: string };
}

/** Above this many options the panel shows a search box + "Select all". */
const LONG_LIST = 8;

const PANEL_WIDTH = 300;
const LIST_MAX_HEIGHT = 288;

export default function FilterDropdown({
  label,
  options,
  value,
  onChange,
  triggerWidth = "w-52",
  className,
  summary,
  quietWhenEmpty = false,
}: FilterDropdownProps & {
  /** Master List command bar: an unapplied filter reads just "Block". */
  quietWhenEmpty?: boolean;
}) {
  const selected = React.useMemo(() => value ?? [], [value]);
  const selectedSet = React.useMemo(() => new Set(selected), [selected]);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [focused, setFocused] = React.useState(0);
  const [coords, setCoords] = React.useState<{ left: number; top: number } | null>(null);
  const [isMobile, setIsMobile] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const optionRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const typeAhead = React.useRef<{ buffer: string; at: number }>({ buffer: "", at: 0 });

  const labelList = React.useMemo(() => {
    const byValue = new Map(options.map((o) => [o.value, o.label]));
    return selected.map((v) => byValue.get(v) ?? v);
  }, [options, selected]);

  // ONE definition of the wording, shared with the tests (lib/listUrlState).
  const triggerText = React.useMemo(
    () =>
      quietWhenEmpty && selected.length === 0
        ? label
        : filterTriggerText(label, labelList),
    [label, labelList, quietWhenEmpty, selected.length],
  );

  const isLongList = options.length > LONG_LIST;
  const q = query.trim().toLowerCase();
  const visible = React.useMemo(
    () => (q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options),
    [options, q],
  );
  const visibleSelected = visible.filter((o) => selectedSet.has(o.value)).length;
  const allVisibleSelected = visible.length > 0 && visibleSelected === visible.length;
  const someVisibleSelected = visibleSelected > 0 && !allVisibleSelected;

  /* ---------------------------------------------------------------- mobile */

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(max-width: 640px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", sync);
      return () => mq.removeEventListener("change", sync);
    }
    return;
  }, []);

  /* ------------------------------------------------------------ positioning */

  const positionPanel = React.useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const panelHeight = Math.min(
      420,
      48 + (isLongList ? 40 + 40 : 0) + Math.max(Math.min(visible.length, 8), 1) * 34 + 44,
    );
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropUp = spaceBelow < panelHeight && rect.top > panelHeight;
    const left = Math.min(
      Math.max(8, rect.left),
      Math.max(8, window.innerWidth - PANEL_WIDTH - 8),
    );
    const top = dropUp
      ? Math.max(8, rect.top - panelHeight - 6)
      : Math.min(rect.bottom + 4, window.innerHeight - panelHeight - 8);
    setCoords({ left, top });
  }, [isLongList, visible.length]);

  React.useEffect(() => {
    if (!open) return;
    positionPanel();
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        panelRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      )
        return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    window.addEventListener("resize", positionPanel);
    window.addEventListener("scroll", positionPanel, true);
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", positionPanel);
      window.removeEventListener("scroll", positionPanel, true);
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, positionPanel]);

  // Focus the box people will actually use: search on long lists, the option
  // list otherwise (so arrows/space work immediately). The search text and the
  // focused row are reset in the click handler, not here.
  React.useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      const first = isLongList
        ? panelRef.current?.querySelector("input")
        : listRef.current;
      (first as HTMLElement | null)?.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [open, isLongList]);

  /* --------------------------------------------------------------- selection */

  const commit = (next: string[]) => onChange(next);

  /** Tick/untick one option. From "All" (nothing checked) ticking one option
   *  filters to that option — the click means "show me this", not "hide it". */
  const toggle = (v: string) => {
    const next = new Set(selected);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    commit([...next]);
  };

  const clear = () => commit([]);

  /** Select-all works on the VISIBLE options, so it plays nicely with search. */
  const toggleAllVisible = (check: boolean) => {
    const next = new Set(selected);
    for (const o of visible) {
      if (check) next.add(o.value);
      else next.delete(o.value);
    }
    commit([...next]);
  };

  /* --------------------------------------------------------------- keyboard */

  const onListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (visible.length === 0) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const delta = e.key === "ArrowDown" ? 1 : -1;
      const next = (focused + delta + visible.length) % visible.length;
      setFocused(next);
      optionRefs.current[next]?.focus();
      return;
    }
    if (e.key === " " || e.key === "Enter") {
      // Space toggles the focused option; Enter is handled by the button itself.
      if (e.key === " " && document.activeElement !== triggerRef.current) {
        e.preventDefault();
        const option = visible[focused];
        if (option) toggle(option.value);
      }
      return;
    }
    if (e.key.length === 1 && /\S/.test(e.key)) {
      // Type-ahead: "al" jumps to Alangayam.
      const now = Date.now();
      const buffer =
        now - typeAhead.current.at > 600 ? e.key.toLowerCase() : typeAhead.current.buffer + e.key.toLowerCase();
      typeAhead.current = { buffer, at: now };
      const idx = visible.findIndex((o) => o.label.toLowerCase().startsWith(buffer));
      if (idx >= 0) {
        setFocused(idx);
        optionRefs.current[idx]?.focus();
      }
    }
  };

  const listContent = (
    <>
      {visible.length === 0 && (
        <p className="px-2 py-3 text-center text-xs text-muted-foreground">
          No matches
        </p>
      )}
      {visible.map((o, i) => {
        const on = selectedSet.has(o.value);
        const empty = o.count === 0;
        return (
          <button
            key={o.value}
            ref={(el) => {
              optionRefs.current[i] = el;
            }}
            type="button"
            role="option"
            aria-selected={on}
            tabIndex={-1}
            onClick={() => toggle(o.value)}
            onFocus={() => setFocused(i)}
            className={cn(
              "flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-md px-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none sm:min-h-9",
              // A zero-count option is greyed but still selectable: it may
              // simply be hidden by another filter the user is about to clear.
              empty && "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                on ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background",
              )}
              aria-hidden
            >
              {on && <Check className="size-3" />}
            </span>
            <span className="min-w-0 flex-1 truncate" data-tip={o.label} data-tip-truncate>
              {o.label}
            </span>
            {o.count != null && (
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                ({o.count})
              </span>
            )}
          </button>
        );
      })}
    </>
  );

  return (
    <div className={cn(triggerWidth, className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          // A fresh panel: no leftover search text, first option focused.
          if (!open) {
            setQuery("");
            setFocused(0);
          }
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
        data-filter-trigger={label}
        className={cn(
          "inline-flex min-h-9 w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          selected.length > 0
            ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/40"
            : "border-input bg-background text-muted-foreground hover:text-foreground",
        )}
      >
        {/* The trigger's full text, only when it is actually cut — and never
            while the panel itself is open (one floating thing at a time). */}
        <span
          className="truncate"
          data-tip={open ? undefined : triggerText}
          data-tip-truncate="1"
        >
          {triggerText}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {selected.length > 0 && (
            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary">
              {selected.length}
            </span>
          )}
          <ChevronDown
            className={cn("size-3.5 transition-transform duration-150", open && "rotate-180")}
            aria-hidden
          />
        </span>
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            // Marks the portalled panel as "ours" for Radix layers that wrap it
            // (e.g. the master list's "More filters" popover), so a click here
            // is not mistaken for an outside interaction that closes them.
            data-filter-panel=""
            style={
              isMobile
                ? undefined
                : { left: coords?.left ?? -9999, top: coords?.top ?? -9999 }
            }
            className={cn(
              "fixed z-[70] bg-popover text-popover-foreground shadow-xl",
              isMobile
                ? "inset-x-0 bottom-0 max-h-[80vh] rounded-t-2xl border-t pb-[env(safe-area-inset-bottom)]"
                : "origin-top rounded-xl border animate-in fade-in-0 zoom-in-95 duration-100",
            )}
          >
            {/* Header: the filter name + the ONE reset action. */}
            <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
              <span className="truncate text-xs font-semibold">{label}</span>
              <button
                type="button"
                onClick={clear}
                disabled={selected.length === 0}
                data-tip="Remove this filter and show all"
                className={cn(
                  "inline-flex min-h-8 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium transition-colors",
                  selected.length > 0
                    ? "text-primary hover:bg-primary/10"
                    : "cursor-default text-muted-foreground/60",
                )}
              >
                <X className="size-3" aria-hidden />
                Clear
              </button>
            </div>

            {isLongList && (
              <div className="relative border-b px-2 py-1.5">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setFocused(0);
                  }}
                  placeholder={`Search ${label.toLowerCase()}`}
                  aria-label={`Search ${label}`}
                  className="w-full rounded-md bg-transparent py-1 pl-7 pr-2 text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            )}

            {isLongList && (
              <button
                type="button"
                onClick={() => toggleAllVisible(!allVisibleSelected)}
                className="flex min-h-11 w-full items-center gap-2.5 border-b px-3 text-left text-sm font-medium hover:bg-accent sm:min-h-9"
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                    allVisibleSelected || someVisibleSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background",
                  )}
                  aria-hidden
                >
                  {someVisibleSelected ? (
                    <Minus className="size-3" />
                  ) : allVisibleSelected ? (
                    <Check className="size-3" />
                  ) : null}
                </span>
                Select all ({q ? visible.length : options.length})
              </button>
            )}

            {/* Bounded, scrolling option list — a long list scrolls inside the
                panel instead of spilling over the table. */}
            <div
              ref={listRef}
              role="listbox"
              aria-label={label}
              aria-multiselectable
              tabIndex={-1}
              onKeyDown={onListKeyDown}
              className="overflow-y-auto p-1.5 outline-none"
              style={isMobile ? { maxHeight: "50vh" } : { maxHeight: LIST_MAX_HEIGHT }}
            >
              {listContent}
            </div>

            {/* Footer: the honest answer + Done (which only closes). */}
            <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
              {/* The footer answers the only question that matters while you
                  tick boxes. Pages that can count results pass a `summary`
                  ("Showing 23 of 157 facilities"); the rest simply show how
                  many options are ticked — never the old "All 7 shown",
                  which described the options and not the list. */}
              <span className="truncate text-[11px] tabular-nums text-muted-foreground">
                {summary
                  ? `Showing ${summary.shown} of ${summary.total} ${
                      summary.noun ?? (summary.total === 1 ? "facility" : "facilities")
                    }`
                  : selected.length > 0
                    ? `${selected.length} selected`
                    : ""}
              </span>
              <Button type="button" size="sm" className="h-8" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

