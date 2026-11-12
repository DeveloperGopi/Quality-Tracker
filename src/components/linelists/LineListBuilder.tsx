/**
 * LINE LIST BUILDER — one screen: scope + columns on the left, the live list in
 * the centre, the summary strip above it, and Save / Share / Export on top.
 *
 * Every table pixel comes from the SHARED grid (components/master/
 * GroupedMasterTable → lib/masterGrid → lib/masterColumns), so the frozen
 * columns, the sticky header, the sort/sticky contract tests and the cell
 * renderers are literally the Master List's. Every number comes from
 * lib/lineListEngine, which is also what the exports write.
 *
 * Container queries + a collapsible rail: the page sits beside the app sidebar,
 * so the layout reacts to ITS width (`@container`), never to the viewport.
 * Under 640px the rail becomes a sheet and the grid becomes cards.
 */

import { useEffect, useMemo, useState } from "react";
import type { SortingState } from "@tanstack/react-table";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Columns3,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  Loader2,
  Pin,
  Plus,
  Printer,
  Save,
  Share2,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import FilterDropdown from "@/components/FilterDropdown";
import { UniversalFilterBar, type FilterField } from "@/components/UniversalFilterBar";
import { FilterSearch } from "@/components/FilterBar";
import { GroupedMasterTable } from "@/components/master/GroupedMasterTable";
import { ColumnManager } from "@/components/master/ColumnManager";
import {
  cellText,
  COLUMN_BY_KEY,
  formatInr,
  type MasterColumn,
  type MasterRow,
} from "@/lib/masterColumns";
import { orderedVisibleColumns, type MasterView } from "@/lib/masterView";
import {
  applyLineListFilters,
  buildLineListSummary,
  clauseText,
  groupLineListRows,
  lineListLabels,
  searchLineListRows,
  sortLineListRows,
  sumText,
  FILTER_OPERATORS,
} from "@/lib/lineListEngine";
import {
  DEFAULT_LINE_LIST_EXPORT,
  type LineListExportPlan,
} from "@/lib/lineListExport";
import {
  LINE_LIST_PINNED,
  type LineListDefinition,
  type LineListFilterClause,
  type LineListFilterOperator,
  type LineListTemplate,
} from "@/lib/lineListTemplates";
import { useIsMobile } from "@/hooks/use-mobile";

/* --------------------------------------------------------------------------- */
/* Local UI helpers                                                            */
/* --------------------------------------------------------------------------- */

const sortStateOf = (def: LineListDefinition): SortingState =>
  def.sort.map((s) => ({ id: s.id, desc: s.desc }));

const optionsOf = (rows: MasterRow[], pick: (r: MasterRow) => string) =>
  [...new Set(rows.map(pick).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "en-IN"))
    .map((v) => ({ value: v, label: v }));

function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        active
          ? "border-primary/60 bg-primary/10 text-primary"
          : "border-border/70 text-muted-foreground hover:bg-muted",
      )}
    >
      {active && <Check className="size-3" aria-hidden />}
      {children}
    </button>
  );
}

/* --------------------------------------------------------------------------- */
/* 1 — The builder                                                             */
/* --------------------------------------------------------------------------- */

export function LineListBuilder({
  definition,
  template,
  rows,
  labels: resolvedLabels,
  today,
  district,
  onChange,
  onBack,
  onSave,
  onShare,
  onExport,
  onOpenRow,
  saving,
  savedAt,
  sharedCount,
}: {
  definition: LineListDefinition;
  template: LineListTemplate;
  /** Every row the line list may include (already role/cycle scoped). */
  rows: MasterRow[];
  /** Admin-renamed label map (resolveLabels + IA period labels). */
  labels: Record<string, string>;
  today: string;
  district: string;
  onChange: (next: LineListDefinition) => void;
  onBack: () => void;
  onSave: () => void;
  onShare: () => void;
  onExport: (plan: LineListExportPlan, rows: MasterRow[], name: string) => Promise<void>;
  onOpenRow: (row: MasterRow) => void;
  saving: boolean;
  savedAt: number | null;
  sharedCount: number;
}) {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  /** Which scope filters sit in the universal bar (a deleted chip stays gone). */
  const [barKeys, setBarKeys] = useState<string[]>(["blocks", "phcs", "types", "statuses"]);
  const [colsOpen, setColsOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<LineListExportPlan["format"]>("xlsx");
  const [railOpen, setRailOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(() => {
    try {
      return localStorage.getItem("nqas.lineList.tip") !== "seen";
    } catch {
      return true;
    }
  });

  const labels = useMemo(
    () => lineListLabels(template, resolvedLabels),
    [template, resolvedLabels],
  );

  /* ---- The one filter chain (scope → quick → clauses → search) ---------- */
  const scoped = useMemo(
    () => applyLineListFilters(rows, definition, template, today),
    [rows, definition, template, today],
  );
  const filtered = useMemo(() => searchLineListRows(scoped, search), [scoped, search]);
  const sorted = useMemo(
    () => sortLineListRows(filtered, definition.sort),
    [filtered, definition.sort],
  );
  const groups = useMemo(
    () => groupLineListRows(sorted, definition.groupBy, definition.columns),
    [sorted, definition.groupBy, definition.columns],
  );
  const summary = useMemo(
    () => buildLineListSummary(sorted, template, today, labels),
    [sorted, template, today, labels],
  );

  /* ---- Columns → the shared grid's ONE view object --------------------- */
  const columns: MasterColumn[] = useMemo(
    () =>
      orderedVisibleColumns(
        {
          presetId: "custom",
          visibleKeys: definition.columns,
          order: definition.columns.filter((k) => !LINE_LIST_PINNED.includes(k)),
          density: "comfortable",
          collapsedGroups: [],
        },
        LINE_LIST_PINNED,
      ),
    [definition.columns],
  );
  const view: MasterView = useMemo(
    () => ({
      presetId: "custom",
      visibleKeys: definition.columns,
      order: definition.columns,
      density: "comfortable",
      collapsedGroups: [],
    }),
    [definition.columns],
  );

  const patch = (next: Partial<LineListDefinition>) =>
    onChange({ ...definition, ...next, updatedAt: Date.now() });

  const activeFilterCount =
    definition.blocks.length +
    definition.phcs.length +
    definition.types.length +
    definition.statuses.length +
    definition.quick.length +
    definition.and.length +
    definition.or.length;

  const clearAll = () =>
    patch({ blocks: [], phcs: [], types: [], statuses: [], quick: [], and: [], or: [] });

  const dismissTip = () => {
    setTipOpen(false);
    try {
      localStorage.setItem("nqas.lineList.tip", "seen");
    } catch {
      /* private mode — the tip just comes back */
    }
  };

  const run = (format: LineListExportPlan["format"]) => {
    setExportFormat(format);
    setExportOpen(true);
  };

  /* ---- The grid (shared) ------------------------------------------------ */
  const grid = (list: MasterRow[]) => (
    <GroupedMasterTable
      rows={list}
      labels={labels}
      view={view}
      sorting={sortStateOf(definition)}
      onSortingChange={(next: SortingState) =>
        patch({ sort: next.map((s) => ({ id: s.id, desc: s.desc })) })
      }
      onOpenRow={onOpenRow}
      onColumnsClick={() => setColsOpen(true)}
      totalRowCount={rows.length}
      searchQuery={search}
      onClearFilters={clearAll}
      pinnedKeys={[...LINE_LIST_PINNED]}
      widthsStorageKey={`linelist-${template.id}`}
      freezeActive={!isMobile}
    />
  );

  return (
    <div className="@container">
      {/* ---- Top bar ------------------------------------------------------ */}
      <div className="glass mb-3 flex flex-wrap items-center gap-2 rounded-xl p-2.5">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-9">
          <ArrowLeft className="mr-1 size-4" /> Line lists
        </Button>
        <Separator orientation="vertical" className="mx-1 hidden h-6 sm:block" />
        <Input
          aria-label="Report name"
          value={definition.name}
          onChange={(e) => patch({ name: e.target.value })}
          className="h-9 min-w-40 flex-1 border-transparent bg-transparent px-2 text-sm font-semibold shadow-none focus-visible:border-input"
        />
        <span className="hidden text-xs text-muted-foreground sm:inline" aria-live="polite">
          {saving
            ? "Saving…"
            : savedAt
              ? `Saved ${new Date(savedAt).toLocaleTimeString("en-GB")}`
              : "Not saved"}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-9" onClick={() => setColsOpen(true)}>
            <Columns3 className="mr-1 size-4" /> Columns
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={onShare}
            aria-label="Share this definition"
          >
            <Share2 className="mr-1 size-4" />
            Share{sharedCount > 0 ? ` (${sharedCount})` : ""}
          </Button>
          <Button size="sm" className="h-9" onClick={onSave}>
            <Save className="mr-1 size-4" /> Save
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Download className="mr-1 size-4" /> Export{" "}
                <ChevronDown className="ml-1 size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Download this list</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => run("xlsx")}>
                <FileSpreadsheet className="mr-2 size-4" /> Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => run("pdf")}>
                <FileText className="mr-2 size-4" /> PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => run("csv")}>
                <FileDown className="mr-2 size-4" /> CSV
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => run("print")}>
                <Printer className="mr-2 size-4" /> Print
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {tipOpen && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">
          <span className="flex-1">
            Pick a topic, narrow it with the chips or <b>Add filter</b>, then press <b>Save</b> to
            keep it under “My reports”. The summary counts the same rows as the list below.
          </span>
          <button
            type="button"
            onClick={dismissTip}
            aria-label="Dismiss tip"
            className="rounded p-1 hover:bg-primary/10"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Part 1 — the ONE filter bar: every scope filter is a chip with an ✕,
          and "+ Filter" adds any other line-list field. Values live in the
          saved report definition, so Board / List / export never disagree. */}
      <UniversalFilterBar
        pageKey="linelists"
        fields={
          [
            {
              key: "blocks",
              label: "Block",
              type: "select",
              group: "Identity",
              onThisPage: true,
              options: optionsOf(rows, (r) => r.facility.block),
            },
            {
              key: "phcs",
              label: "PHC",
              type: "select",
              group: "Identity",
              onThisPage: true,
              options: optionsOf(rows, (r) => r.facility.phc),
            },
            {
              key: "types",
              label: "Facility Type",
              type: "select",
              group: "Identity",
              onThisPage: true,
              options: optionsOf(rows, (r) => r.facility.facilityType),
            },
            {
              key: "statuses",
              label: "Current Status",
              type: "select",
              group: "Certification",
              onThisPage: true,
              options: optionsOf(rows, (r) => r.facility.currentStatus ?? ""),
            },
          ] as FilterField[]
        }
        value={{
          barKeys,
          filters: [
            { key: "blocks", op: "in", values: definition.blocks },
            { key: "phcs", op: "in", values: definition.phcs },
            { key: "types", op: "in", values: definition.types },
            { key: "statuses", op: "in", values: definition.statuses },
          ],
          match: "all",
        }}
        onChange={(next) => {
          setBarKeys(next.barKeys);
          const values = (key: string) => next.filters.find((f) => f.key === key)?.values ?? [];
          patch({
            blocks: values("blocks"),
            phcs: values("phcs"),
            types: values("types"),
            statuses: values("statuses"),
          });
        }}
        summary={`Showing ${rows.length} facilities`}
      />

      <div className="grid gap-3 @4xl:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]">
        {/* ---- Left rail: scope + columns -------------------------------- */}
        <aside
          className={cn("glass space-y-3 rounded-xl p-3", isMobile && !railOpen && "hidden")}
          aria-label="Scope and columns"
        >
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                Scope
              </h3>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[11px] font-medium text-primary hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Scope is set in the filter bar above — every choice is a removable chip.
            </p>
          </div>

          {template.quickFilters.length > 0 && (
            <div>
              <h3 className="mb-1.5 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                Quick filters
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {template.quickFilters.map((q) => (
                  <ToggleChip
                    key={q.id}
                    active={definition.quick.includes(q.id)}
                    onClick={() =>
                      patch({
                        quick: definition.quick.includes(q.id)
                          ? definition.quick.filter((x) => x !== q.id)
                          : [...definition.quick, q.id],
                      })
                    }
                  >
                    {q.label}
                  </ToggleChip>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                Filters
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setFilterOpen(true)}
              >
                <Plus className="mr-1 size-3.5" /> Add filter
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {definition.and.map((c) => (
                <FilterChip
                  key={c.id}
                  label={clauseText(c, labels)}
                  onRemove={() => patch({ and: definition.and.filter((x) => x.id !== c.id) })}
                />
              ))}
              {definition.or.map((c) => (
                <FilterChip
                  key={c.id}
                  label={`ANY · ${clauseText(c, labels)}`}
                  onRemove={() => patch({ or: definition.or.filter((x) => x.id !== c.id) })}
                />
              ))}
              {definition.and.length + definition.or.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  None — every facility in scope is listed.
                </p>
              )}
            </div>
          </div>

          <div>
            <h3 className="mb-1.5 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              Group &amp; sort
            </h3>
            <label className="block text-[11px] text-muted-foreground">
              Group by
              <select
                aria-label="Group by"
                className="mt-1 h-8 w-full rounded-md border border-border/70 bg-background px-2 text-xs"
                value={definition.groupBy ?? ""}
                onChange={(e) => patch({ groupBy: e.target.value || null })}
              >
                <option value="">No grouping</option>
                {["block", "type", "pipelineStatus", "buildingStatus", "certStatus", "nocStatus"]
                  .filter((k) => COLUMN_BY_KEY[k])
                  .map((k) => (
                    <option key={k} value={k}>
                      {labels[k] ?? COLUMN_BY_KEY[k].label}
                    </option>
                  ))}
              </select>
            </label>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Sort: click a column header (Shift-click adds a second sort).
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 px-2 py-1.5">
            <span className="text-[11px] text-muted-foreground">Summary strip</span>
            <Checkbox
              aria-label="Show the summary strip"
              checked={definition.summaryOn}
              onCheckedChange={(v) => patch({ summaryOn: v === true })}
            />
          </div>

          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 flex-1 text-xs"
              onClick={() => patch({ columns: [...template.columns] })}
            >
              Reset columns
            </Button>
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setRailOpen(false)}
              >
                Done
              </Button>
            )}
          </div>
        </aside>

        {isMobile && !railOpen && (
          <Button
            variant="outline"
            size="sm"
            className="h-9 justify-start"
            onClick={() => setRailOpen(true)}
          >
            <SlidersHorizontal className="mr-1 size-4" /> Scope, filters &amp; columns
          </Button>
        )}

        {/* ---- Centre: summary + list ------------------------------------ */}
        <section className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <FilterSearch
              value={search}
              onChange={setSearch}
              placeholder="Search facility, PHC, block or NIN"
              className="min-w-48 flex-1"
            />
            <p className="text-xs text-muted-foreground tabular-nums" role="status" aria-live="polite">
              Showing <b className="text-foreground">{sorted.length.toLocaleString("en-IN")}</b> of{" "}
              {rows.length.toLocaleString("en-IN")} facilities
            </p>
            <span
              data-testid="line-list-reconcile"
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                summary.total === sorted.length
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-rose-100 text-rose-800",
              )}
            >
              {summary.total} of {sorted.length} {summary.total === sorted.length ? "✓" : "✗"}
            </span>
          </div>

          {definition.summaryOn && definition.summaryPosition === "top" && (
            <LineListSummaryStrip
              summary={summary}
              onPick={(column, label) => pickSummary(patch, definition, column, label)}
            />
          )}

          {sorted.length === 0 ? (
            <div className="glass rounded-xl border border-border/60 p-8 text-center">
              <p className="text-sm font-medium">No facilities match these filters</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Remove a chip or clear everything to see the full list again.
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={clearAll}>
                Clear all filters
              </Button>
            </div>
          ) : definition.groupBy ? (
            <div className="space-y-3">
              {groups.map((g) => (
                <section key={g.key} aria-label={`Group ${g.label}`}>
                  <div className="glass mb-1 flex flex-wrap items-center justify-between gap-2 rounded-t-xl border border-border/60 px-3 py-1.5">
                    <p className="text-xs font-semibold">
                      {g.label}{" "}
                      <span className="ml-1 font-normal text-muted-foreground">
                        {g.count} facilit{g.count === 1 ? "y" : "ies"}
                      </span>
                    </p>
                    {g.sums.length > 0 && (
                      <p className="text-[11px] font-medium tabular-nums text-muted-foreground">
                        {g.sums.map((s) => `${s.label}: ${sumText(s.amount, g.count)}`).join(" · ")}
                      </p>
                    )}
                  </div>
                  {isMobile ? (
                    <MobileCards rows={g.rows} labels={labels} columns={columns} onOpen={onOpenRow} />
                  ) : (
                    grid(g.rows)
                  )}
                </section>
              ))}
            </div>
          ) : isMobile ? (
            <MobileCards rows={sorted} labels={labels} columns={columns} onOpen={onOpenRow} />
          ) : (
            grid(sorted)
          )}

          {definition.summaryOn && definition.summaryPosition === "bottom" && (
            <LineListSummaryStrip
              summary={summary}
              onPick={(column, label) => pickSummary(patch, definition, column, label)}
            />
          )}
        </section>
      </div>

      {/* ---- Dialogs ------------------------------------------------------ */}
      <ColumnManager
        open={colsOpen}
        onOpenChange={setColsOpen}
        labels={labels}
        view={view}
        pinnedKeys={[...LINE_LIST_PINNED]}
        onChange={(next) =>
          patch({
            columns: orderedVisibleColumns(next, LINE_LIST_PINNED).map((c) => c.key),
          })
        }
      />

      <AddFilterDialog
        open={filterOpen}
        onOpenChange={setFilterOpen}
        labels={labels}
        columns={columns}
        onAdd={(clause) => patch({ and: [...definition.and, clause] })}
        onAddOr={(clause) => patch({ or: [...definition.or, clause] })}
      />

      <ExportPlanDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        format={exportFormat}
        district={district}
        topic={template.name}
        count={sorted.length}
        onRun={async (plan) => {
          await onExport(plan, sorted, definition.name);
          setExportOpen(false);
        }}
      />
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-border/70 bg-muted/60 px-2 py-0.5 text-[11px]">
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className="rounded p-0.5 hover:bg-background"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}

/** Clicking a summary number narrows the list to exactly that slice. */
function pickSummary(
  patch: (next: Partial<LineListDefinition>) => void,
  definition: LineListDefinition,
  column: string,
  label: string,
) {
  if (label === "-" || !column) return;
  const clause: LineListFilterClause = {
    id: `f-${Date.now().toString(36)}`,
    key: column,
    op: "is",
    value: label,
  };
  if (definition.and.some((c) => c.key === column && c.value === label)) return;
  patch({ and: [...definition.and.filter((c) => c.key !== column), clause] });
}

/* --------------------------------------------------------------------------- */
/* Summary strip                                                               */
/* --------------------------------------------------------------------------- */

function LineListSummaryStrip({
  summary,
  onPick,
}: {
  summary: ReturnType<typeof buildLineListSummary>;
  onPick: (column: string, label: string) => void;
}) {
  const max = summary.chart?.items.reduce((m, i) => Math.max(m, i.count), 1) ?? 1;
  return (
    <section
      aria-label="Summary"
      className="glass mb-3 space-y-3 rounded-xl border border-border/60 p-3"
    >
      <div className="flex flex-wrap gap-2">
        <div className="rounded-lg border border-border/60 px-3 py-1.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Facilities</p>
          <p className="text-lg font-semibold tabular-nums">
            {summary.total.toLocaleString("en-IN")}
          </p>
        </div>
        {summary.kpis.map((k) => (
          <div key={k.id} className="rounded-lg border border-border/60 px-3 py-1.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{k.label}</p>
            <p className="text-lg font-semibold tabular-nums">{k.value.toLocaleString("en-IN")}</p>
          </div>
        ))}
        {summary.sums.map((s) => (
          <div key={s.id} className="rounded-lg border border-border/60 px-3 py-1.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className="text-lg font-semibold tabular-nums">{sumText(s.amount, summary.total)}</p>
          </div>
        ))}
      </div>

      {summary.chart && summary.chart.items.length > 0 && (
        <div>
          <p className="mb-1 text-[11px] font-semibold text-muted-foreground">
            {summary.chart.label}
          </p>
          <ul className="space-y-1">
            {summary.chart.items.slice(0, 6).map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => onPick(summary.chart?.label ? chartColumn(summary, item.label) : "", item.label)}
                  className="w-32 shrink-0 truncate text-left hover:underline"
                  aria-label={`Filter the list to ${item.label}`}
                >
                  {item.label}
                </button>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-primary/70"
                    style={{ width: `${Math.round((item.count / max) * 100)}%` }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right tabular-nums">{item.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.expiry.map((e) => (
        <div key={e.id}>
          <p className="mb-1 text-[11px] font-semibold text-muted-foreground">
            {e.label}
            {e.expired > 0 && (
              <span className="ml-2 text-rose-700">already expired: {e.expired}</span>
            )}
          </p>
          <div className="flex flex-wrap gap-1">
            {e.months.map((m) => (
              <span
                key={m.key}
                className={cn(
                  "rounded border px-1.5 py-0.5 text-[10px] tabular-nums",
                  m.count > 0
                    ? "border-border bg-background"
                    : "border-dashed border-border/50 text-muted-foreground/60",
                )}
              >
                {m.label} {m.count}
              </span>
            ))}
          </div>
        </div>
      ))}

      {summary.sums
        .filter((s) => s.groups.length > 0)
        .slice(0, 2)
        .map((s) => (
          <div key={`${s.id}-groups`}>
            <p className="mb-1 text-[11px] font-semibold text-muted-foreground">{s.label}</p>
            <ul className="grid gap-x-4 gap-y-0.5 text-[11px] sm:grid-cols-2">
              {s.groups.slice(0, 8).map((g) => (
                <li key={g.label} className="flex justify-between gap-2">
                  <span className="truncate">{g.label}</span>
                  <span className="tabular-nums">{formatInr(g.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
    </section>
  );
}

/** The column a chart bar belongs to (building status sorts by bucket). */
function chartColumn(summary: ReturnType<typeof buildLineListSummary>, _label: string): string {
  const byBuilding = summary.breakdowns.find((b) => b.column === "buildingStatus");
  return byBuilding?.column ?? summary.breakdowns[0]?.column ?? "";
}

/* --------------------------------------------------------------------------- */
/* Mobile cards (360px)                                                        */
/* --------------------------------------------------------------------------- */

function MobileCards({
  rows,
  labels,
  columns,
  onOpen,
}: {
  rows: MasterRow[];
  labels: Record<string, string>;
  columns: MasterColumn[];
  onOpen: (row: MasterRow) => void;
}) {
  const shown = columns.filter((c) => c.key !== "facility" && c.key !== "type").slice(0, 4);
  return (
    <ul className="space-y-1.5">
      {rows.map((row, i) => (
        <li key={`${String(row.facility._id)}-${i}`}>
          <button
            type="button"
            onClick={() => onOpen(row)}
            className="glass w-full rounded-xl border border-border/60 p-3 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <p className="text-sm font-semibold">{row.facility.name}</p>
            <p className="mb-1 text-[11px] text-muted-foreground">
              {row.facility.block} · {row.facility.phc} · {row.facility.facilityType}
            </p>
            <dl className="grid grid-cols-2 gap-0.5 text-[11px]">
              {shown.map((c) => (
                <div key={c.key} className="flex justify-between gap-2">
                  <dt className="truncate text-muted-foreground">{labels[c.key] ?? c.label}</dt>
                  <dd className="truncate font-medium">{cellText(row, c.key) || "-"}</dd>
                </div>
              ))}
            </dl>
          </button>
        </li>
      ))}
    </ul>
  );
}

/* --------------------------------------------------------------------------- */
/* Add filter — every operator, AND or the OR group                            */
/* --------------------------------------------------------------------------- */

export function AddFilterDialog({
  open,
  onOpenChange,
  labels,
  columns,
  onAdd,
  onAddOr,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labels: Record<string, string>;
  columns: MasterColumn[];
  onAdd: (clause: LineListFilterClause) => void;
  onAddOr: (clause: LineListFilterClause) => void;
}) {
  const [key, setKey] = useState(columns[0]?.key ?? "facility");
  const [op, setOp] = useState<LineListFilterOperator>("is");
  const [value, setValue] = useState("");
  const [value2, setValue2] = useState("");
  const [join, setJoin] = useState<"and" | "or">("and");

  useEffect(() => {
    if (!columns.some((c) => c.key === key) && columns[0]) setKey(columns[0].key);
  }, [columns, key]);

  const needsValue = op !== "isEmpty" && op !== "isNotEmpty";
  const submit = () => {
    const clause: LineListFilterClause = {
      id: `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      key,
      op,
      value: needsValue ? value : "",
      value2: op === "between" ? value2 : undefined,
    };
    if (join === "and") onAdd(clause);
    else onAddOr(clause);
    setValue("");
    setValue2("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a filter</DialogTitle>
          <DialogDescription>
            Filters compare what the list SHOWS (dates as DD-MMM-YYYY, amounts as ₹). AND
            applies with the other filters; ANY joins the OR group.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Field</Label>
            <select
              aria-label="Filter field"
              className="mt-1 h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm"
              value={key}
              onChange={(e) => setKey(e.target.value)}
            >
              {columns.map((c) => (
                <option key={c.key} value={c.key}>
                  {labels[c.key] ?? c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Operator</Label>
              <select
                aria-label="Filter operator"
                className="mt-1 h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm"
                value={op}
                onChange={(e) => setOp(e.target.value as LineListFilterOperator)}
              >
                {FILTER_OPERATORS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Value{op === "between" ? " (from)" : ""}</Label>
              <Input
                className="mt-1 h-9"
                value={value}
                disabled={!needsValue}
                onChange={(e) => setValue(e.target.value)}
                placeholder={op === "in" ? "A, B, C" : "e.g. Expired"}
              />
            </div>
          </div>
          {op === "between" && (
            <div>
              <Label className="text-xs">Value (to)</Label>
              <Input
                className="mt-1 h-9"
                value={value2}
                onChange={(e) => setValue2(e.target.value)}
              />
            </div>
          )}
          <div>
            <Label className="text-xs">Join</Label>
            <RadioGroup
              className="mt-1 flex gap-3"
              value={join}
              onValueChange={(v) => setJoin(v as "and" | "or")}
            >
              <label className="flex items-center gap-1.5 text-sm">
                <RadioGroupItem value="and" /> AND (all must match)
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                <RadioGroupItem value="or" /> ANY (OR group)
              </label>
            </RadioGroup>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Add filter</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------------------------------------------------- */
/* Export dialog                                                               */
/* --------------------------------------------------------------------------- */

export function ExportPlanDialog({
  open,
  onOpenChange,
  format,
  district,
  topic,
  count,
  onRun,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  format: LineListExportPlan["format"];
  district: string;
  topic: string;
  count: number;
  onRun: (plan: LineListExportPlan) => Promise<void>;
}) {
  const [plan, setPlan] = useState<LineListExportPlan>({
    ...DEFAULT_LINE_LIST_EXPORT,
    format,
  });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setPlan((prev) => ({ ...prev, format }));
  }, [format]);

  const go = async () => {
    setBusy(true);
    try {
      await onRun(plan);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong flex max-h-[90vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export “{topic}”</DialogTitle>
          <DialogDescription>
            {count.toLocaleString("en-IN")} rows · file name:{" "}
            <span className="font-medium">
              {district} {topic} Line List DD-MMM-YYYY
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          <fieldset className="rounded-xl border border-border/60 p-3">
            <legend className="px-1 text-xs font-semibold">Rows</legend>
            <RadioGroup
              className="gap-1.5"
              value={plan.scope}
              onValueChange={(v) => setPlan((p) => ({ ...p, scope: v as "all" | "selected" }))}
            >
              <label className="flex min-h-9 items-center gap-2 text-sm">
                <RadioGroupItem value="all" /> All rows in the list ({count})
              </label>
              <label className="flex min-h-9 items-center gap-2 text-sm opacity-60">
                <RadioGroupItem value="selected" disabled /> Selected rows (none ticked)
              </label>
            </RadioGroup>
          </fieldset>

          <fieldset className="rounded-xl border border-border/60 p-3">
            <legend className="px-1 text-xs font-semibold">Include</legend>
            <label className="flex min-h-9 items-center gap-2 text-sm">
              <Checkbox
                checked={plan.includeSummary}
                onCheckedChange={(v) => setPlan((p) => ({ ...p, includeSummary: v === true }))}
              />
              Summary (cover + KPIs)
            </label>
            <label className="flex min-h-9 items-center gap-2 text-sm">
              <Checkbox
                checked={plan.includeDefinitions}
                onCheckedChange={(v) => setPlan((p) => ({ ...p, includeDefinitions: v === true }))}
              />
              Definitions (filters written in the header)
            </label>
          </fieldset>

          {plan.format === "pdf" && (
            <div className="rounded-xl border border-border/60 p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">PDF layout</p>
              <p className="mt-1">
                A4 landscape · 10 mm margins · all columns fit one page width.
                Long remarks wrap, the header repeats and rows never split.
              </p>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={go} disabled={busy}>
            {busy ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : (
              <Download className="mr-1 size-4" />
            )}
            {busy
              ? plan.format === "pdf"
                ? "Preparing PDF…"
                : "Preparing file…"
              : "Download"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------------------------------------------------- */
/* Share dialog                                                                */
/* --------------------------------------------------------------------------- */

export function ShareDialog({
  open,
  onOpenChange,
  definition,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  definition: LineListDefinition;
  onChange: (next: LineListDefinition) => void;
}) {
  const [roles, setRoles] = useState<string[]>(definition.sharedWithRoles);
  const [people, setPeople] = useState(definition.sharedWithUserIds.join(", "));

  const save = () => {
    onChange({
      ...definition,
      sharedWithRoles: roles,
      sharedWithUserIds: people
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      updatedAt: Date.now(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share “{definition.name}”</DialogTitle>
          <DialogDescription>
            Only the definition is shared — columns, filters and sorting. Each viewer sees
            the facilities their role and block scope allow, never your data.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Roles</Label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {["State Admin", "District Editor", "Viewer"].map((role) => (
                <ToggleChip
                  key={role}
                  active={roles.includes(role)}
                  onClick={() =>
                    setRoles((prev) =>
                      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
                    )
                  }
                >
                  {role}
                </ToggleChip>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">Named people (user ids or emails, comma separated)</Label>
            <Input className="mt-1" value={people} onChange={(e) => setPeople(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>
            <Pin className="mr-1 size-4" /> Save sharing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
