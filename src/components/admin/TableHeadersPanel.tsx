// Workspace → Table headers.
//
// The 47 renamable master-list columns, now grouped by category, searchable,
// with a per-column “Modified” dot and reset, plus a live preview of the header
// row. The default/custom labels are the keys of the `tableHeaderOverrides`
// setting, and they come from the tracker registry (single source of truth), so
// a rename always matches what the master list and the reports render.

import { useMemo, useState } from "react";
import { RotateCcw, Search, Type, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { HEADER_OVERRIDES_KEY, buildOverrides, type HeaderOverrides } from "@/lib/tableHeaders";
import { MASTER_TABLE_HEADER_LABELS } from "@/lib/trackerColumns";
import { groupHeaderLabels, slug, type SettingsDraft } from "@/lib/adminSettings";
import { CountBadge, SectionHeader, UnsavedDot } from "@/components/admin/AdminUi";

export function TableHeadersPanel({
  settings,
  draft,
  setPending,
}: {
  settings: Record<string, unknown>;
  draft: SettingsDraft;
  setPending: (key: string, value: unknown) => void;
}) {
  const stored = (settings[HEADER_OVERRIDES_KEY] as HeaderOverrides | undefined) ?? {};
  const [query, setQuery] = useState("");

  // The page draft is the single source of truth for renames, so pending edits
  // survive switching workspace sections; an unedited column falls back to the
  // stored override and then to its own default label.
  const draftOverrides = (draft[HEADER_OVERRIDES_KEY] as HeaderOverrides | undefined) ?? stored;
  const valueOf = (label: string) => draftOverrides[label] ?? label;
  const isModified = (label: string) =>
    valueOf(label).trim() !== "" && valueOf(label).trim() !== label;

  /** Every column's current (possibly pending) label — the input to
   *  `buildOverrides`, which keeps only real changes. */
  const currentValues = (): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const l of MASTER_TABLE_HEADER_LABELS) out[l] = valueOf(l);
    return out;
  };

  /** Push the whole override map into the draft (or drop the key when clean). */
  const push = (next: Record<string, string>) => {
    const overrides = buildOverrides(MASTER_TABLE_HEADER_LABELS, next);
    const same = JSON.stringify(overrides) === JSON.stringify(stored);
    setPending(HEADER_OVERRIDES_KEY, same ? undefined : overrides);
  };

  const update = (label: string, value: string) => {
    const next = currentValues();
    next[label] = value;
    push(next);
  };

  const resetOne = (label: string) => update(label, label);
  const resetAll = () => {
    const cleared: Record<string, string> = {};
    for (const l of MASTER_TABLE_HEADER_LABELS) cleared[l] = l;
    push(cleared);
  };

  // Grouping lives in lib/adminSettings so the search index uses the exact
  // same group labels (and therefore the same anchors).
  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = MASTER_TABLE_HEADER_LABELS.filter((label) => {
      if (!q) return true;
      return (
        label.toLowerCase().includes(q) ||
        valueOf(label).toLowerCase().includes(q)
      );
    });
    return groupHeaderLabels(visible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, draftOverrides, stored]);

  const modifiedCount = MASTER_TABLE_HEADER_LABELS.filter(isModified).length;
  const pending = HEADER_OVERRIDES_KEY in draft;

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={Type}
        title="Table headers"
        description={`Rename the ${MASTER_TABLE_HEADER_LABELS.length} column titles shown on the Facility Master List, the reports and the printed exports. Stored data and the CSV column keys never change.`}
        right={
          <>
            {pending && <UnsavedDot />}
            <CountBadge value={`${modifiedCount} modified`} tone={modifiedCount ? "primary" : "neutral"} />
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={resetAll}
              disabled={modifiedCount === 0 && !pending}
            >
              <Undo2 className="mr-1.5 size-3.5" /> Reset all
            </Button>
          </>
        }
      />

      {/* Live preview of the header row the master list will print. */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Live preview — master list header row
        </p>
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1" role="list" aria-label="Header row preview">
          {MASTER_TABLE_HEADER_LABELS.map((label) => (
            <span
              key={`preview-${label}`}
              role="listitem"
              className={cn(
                "shrink-0 rounded-md border px-2 py-1 text-xs font-medium whitespace-nowrap",
                isModified(label)
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border/60 bg-background text-muted-foreground",
              )}
            >
              {valueOf(label)}
            </span>
          ))}
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="glass-input h-10 pl-9"
          placeholder="Find a column (e.g. NOC, assessor, validity)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search table headers"
        />
      </div>

      {grouped.length === 0 && (
        <p className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
          No column matches “{query}”.
        </p>
      )}

      {grouped.map((group) => (
        <section
          key={group.id}
          id={`header-group-${slug(group.label)}`}
          data-admin-anchor={`header-group-${slug(group.label)}`}
          className="scroll-mt-40 rounded-xl border border-border/60 bg-background/60"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
            <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
            <CountBadge value={`${group.labels.length}`} />
          </div>
          <div className="grid gap-x-3 gap-y-2 p-3 lg:grid-cols-2">
            {/* Column headers: what it is by default, what it will say. */}
            <div className="hidden gap-2 px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase lg:grid lg:grid-cols-2">
              <span>Default name</span>
              <span>Custom name</span>
            </div>
            {group.labels.map((label) => {
              const modified = isModified(label);
              return (
                <div
                  key={label}
                  // Anchors match the “Search settings…” index (slug form) so a
                  // jump from the search box lands on this row.
                  id={`header-${slug(label)}`}
                  data-admin-anchor={`header-${slug(label)}`}
                  className="scroll-mt-40 grid items-center gap-2 lg:grid-cols-2"
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    {modified && (
                      <span
                        className="size-2 shrink-0 rounded-full bg-primary"
                        data-tip="Customised"
                        aria-label="Customised"
                      />
                    )}
                    <span className="truncate text-sm text-muted-foreground" data-tip={label} data-tip-truncate>
                      {label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      className="glass-input h-10"
                      value={valueOf(label)}
                      placeholder={label}
                      aria-label={`Custom name for ${label}`}
                      onChange={(e) => update(label, e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "size-10 shrink-0 text-muted-foreground",
                        !modified && "opacity-40",
                      )}
                      data-tip={`Reset “${label}” to its default name`}
                      aria-label={`Reset ${label}`}
                      disabled={!modified}
                      onClick={() => resetOne(label)}
                    >
                      <RotateCcw className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
