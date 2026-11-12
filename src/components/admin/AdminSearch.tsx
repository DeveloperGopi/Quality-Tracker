// “Search settings…” — one box that jumps to any setting, dropdown list,
// dropdown *option*, column header, page-visibility row or cycle-timing number.
//
// Keyboard: Ctrl/Cmd+K focuses it from anywhere on the page (registered by the
// Admin page), ↑/↓ move through the results, Enter jumps, Esc clears. The
// results list is a normal listbox so screen readers announce the active row.

import { useEffect, useMemo, useRef, useState } from "react";
import { CornerDownLeft, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import {
  searchAdminIndex,
  type AdminSearchEntry,
} from "@/lib/adminSettings";

export function AdminSearch({
  entries,
  onJump,
  inputRef,
}: {
  entries: AdminSearchEntry[];
  onJump: (entry: AdminSearchEntry) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const localRef = useRef<HTMLInputElement | null>(null);
  const ref = inputRef ?? localRef;
  const results = useMemo(() => searchAdminIndex(entries, query), [entries, query]);

  // Close the results when the user clicks outside the search area.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const el = ref.current?.parentElement;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, ref]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const commit = (entry: AdminSearchEntry | undefined) => {
    if (!entry) return;
    onJump(entry);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={ref}
          type="search"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls="admin-search-results"
          aria-label="Search settings"
          className="glass-input h-11 pr-24 pl-9 text-sm"
          placeholder="Search settings, dropdown lists, column headers…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, Math.max(results.length - 1, 0)));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              commit(results[active]);
            } else if (e.key === "Escape") {
              setQuery("");
              setOpen(false);
              ref.current?.blur();
            }
          }}
        />
        <span className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1">
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => {
                setQuery("");
                ref.current?.focus();
              }}
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <span className="hidden items-center gap-1 sm:flex">
              <Kbd>Ctrl</Kbd>
              <Kbd>K</Kbd>
            </span>
          )}
        </span>
      </div>

      {open && query.trim() !== "" && (
        <div
          id="admin-search-results"
          role="listbox"
          aria-label="Settings search results"
          className="glass-strong absolute z-40 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-border/60 p-1 shadow-lg"
        >
          {results.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              Nothing matches “{query}”. Try a setting name like
              “validity”, a column like “NOC”, or a list like “departments”.
            </p>
          ) : (
            results.map((r, i) => (
              <button
                key={`${r.id}-${r.label}-${i}`}
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => commit(r)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                  i === active ? "bg-primary/10" : "hover:bg-muted/60",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {r.label}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {r.hint}
                  </span>
                </span>
                {i === active && (
                  <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
