/**
 * GROUPED MASTER TABLE — the table engine for the Facility Master List.
 *
 * Layout contract (the misalignment fix):
 *   ONE column model (lib/masterGrid.buildMasterGrid) → ONE grid-template-
 *   columns string → applied VERBATIM to the group band, the header row and
 *   every virtualized body row. Rows are CSS-grid DIVs inside a single scroll
 *   container (header included, `position: sticky`), positioned with `top`
 *   (never `transform`), which keeps left-pinned cells as true `position:
 *   sticky` elements inside the scrollport. No `flex:1`, no auto widths, no
 *   absolutely-positioned table rows leaving the table's formatting context —
 *   the failure modes that used to stagger header vs body.
 *
 * Row height is ONE constant per density (lib/masterView.ROW_HEIGHT): the
 * virtualizer's estimateSize and every grid row read the same number, and
 * every cell clips + ellipsises, so long content can never grow a row.
 *
 * Sorting is multi-column by default: each header click adds/cycles a sort and
 * the active sorts show as numbered chips — rows are ordered by the shared
 * lib/masterFilter.sortMasterRows (the exact function the tests pin), never a
 * second comparator.
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { SortingState } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronDown, ChevronsUpDown, Lock, PanelLeft, Rows3, Settings2, Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toDisplayDateTime } from "@/lib/format";
import { GROUP_BY_ID, type MasterGroupId, type MasterRow } from "@/lib/masterColumns";
import { duplicateNames, sortMasterRows } from "@/lib/masterFilter";
import {
  loadColumnWidths,
  saveColumnWidths,
  type Density,
  type MasterView,
} from "@/lib/masterView";
import {
  bandLabelMode,
  EDIT_ROW_ACTIONS_WIDTH,
  frozenZoneWidth,
  ROW_ACTIONS_WIDTH,
  type BandLabelMode,
  type BandViewport,
  type MasterGridModel,
} from "@/lib/masterGrid";
import type { RecentMarker } from "@/lib/recentUpdates";
import { buildMasterGrid, type GridCellModel } from "@/lib/masterGrid";
import { NoRows, SmartCell } from "@/components/master/SmartCells";
import { FacilityCell } from "@/components/FacilityCell";
import { useFacilityStyle } from "@/lib/facilityStyle";
import { RowActionsCell, type RowActionsProps } from "@/components/master/RowActionsCell";

/* --------------------------------------------------------------------------- */
/* Sorting (multi-column: click cycles asc → desc → remove)                     */
/* --------------------------------------------------------------------------- */

function cycleSort(sorting: SortingState, key: string): SortingState {
  const idx = sorting.findIndex((s) => s.id === key);
  if (idx === -1) return [...sorting, { id: key, desc: false }];
  if (!sorting[idx].desc) {
    const next = [...sorting];
    next[idx] = { id: key, desc: true };
    return next;
  }
  // desc → remove this sort and renumber the remaining chips.
  return sorting.filter((s) => s.id !== key);
}

/** Alignment from the column config — the SAME justification for a header
 *  label and its body cells (numbers/currency right, statuses/dates centre,
 *  text left) so a value always sits exactly under its label. */
const JUSTIFY_FOR: Record<"left" | "center" | "right", string> = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
};

const BAND_HEIGHT = 30;
const HEADER_HEIGHT = 56;

/** The last sticky column — carries the soft right-edge shadow when scrolled. */
function lastStickyCell(cells: GridCellModel[]): GridCellModel | undefined {
  const pinned = cells.filter((c) => c.sticky);
  return pinned[pinned.length - 1];
}

/* --------------------------------------------------------------------------- */
/* Header chrome — group band + column header row, exported for the DOM        */
/* alignment tests so the real band/header markup (not a copy) is asserted.    */
/* --------------------------------------------------------------------------- */

export function MasterGridHead({
  grid,
  sorting,
  labels,
  onSort,
  onResizeStart,
  onResizeReset,
  scrolledX = false,
  lockReasons = {},
  viewport,
  onToggleGroup,
}: {
  grid: MasterGridModel;
  sorting: SortingState;
  labels: Record<string, string>;
  onSort: (key: string) => void;
  /** One-model resize: the parent re-runs buildMasterGrid with the override. */
  onResizeStart: (key: string) => (event: ReactPointerEvent<HTMLDivElement>) => void;
  onResizeReset: (key: string) => void;
  scrolledX?: boolean;
  /** Edit mode: data-column key → why the column is NOT editable. Shows a
   *  small lock with the tooltip "Auto or read-only: <reason>". */
  lockReasons?: Record<string, string>;
  /** Real scroll geometry for the band labels (visible-width decisions).
   *  Defaults to "everything is visible" for static renders / exports. */
  viewport?: BandViewport;
  /** Click a group band to hide/show that group's columns. */
  onToggleGroup?: (group: MasterGroupId) => void;
}) {
  const { cells, bands } = grid;
  const lastSticky = lastStickyCell(cells);
  const vp = viewport ?? {
    scrollLeft: 0,
    viewportWidth: 100000,
    pinnedWidth: frozenZoneWidth(grid),
  };
  return (
    <>
      {/* Group band: one cell per CONTIGUOUS RUN of one group + pinned state,
          placed on its own explicit grid line (`start / span n`) so a label can
          never sit above another group's columns. */}
      <div
        data-testid="master-band"
        // Layer order lives in ONE place (index.css `--mg-z-*`): the header
        // chrome is 5, its pinned cells 6, corners 7 — the isolated body
        // layer below can never rise above it.
        className="mg-head sticky top-0 grid bg-muted"
        style={{
          gridTemplateColumns: grid.template,
          height: BAND_HEIGHT,
          // The band label sticks to the RIGHT of the frozen columns.
          ...({ "--mg-pin-w": `${vp.pinnedWidth}px` } as Record<string, string>),
        }}
      >
        {bands.map((band, bandIdx) => {
          const group = band.id ? GROUP_BY_ID[band.id] : null;
          const mode: BandLabelMode = group
            ? bandLabelMode(band, vp, group.shortLabel)
            : "dot";
          const bandText = group
            ? mode === "full"
              ? group.label
              : group.shortLabel
            : "";
          return (
            <div
              key={`${band.id ?? "select"}-${bandIdx}`}
              data-testid={`master-band-${bandIdx}`}
              data-band-group={band.id ?? "select"}
              data-band-span={band.span}
              data-band-start={band.start}
              data-band-sticky={band.sticky ? "1" : "0"}
              data-band-mode={group ? mode : "none"}
              aria-label={group?.label}
              style={{
                gridColumn: `${band.start} / span ${band.span}`,
                left: band.sticky ? band.left : undefined,
                right: band.pinRight ? 0 : undefined,
                position: band.sticky || band.pinRight ? "sticky" : undefined,
              }}
              className={cn(
                "mg-band flex min-w-0 items-center overflow-hidden border-r border-border/60 px-3 text-[11px] font-semibold whitespace-nowrap",
                group
                  ? `${group.tint.bg} ${group.tint.text} border-l-2 ${group.tint.border}`
                  : "bg-muted",
                /* The row-actions band cell pins RIGHT: opaque background and
                   the same soft left-edge shadow the header/body cells carry. */
                band.sticky && "mg-head-pin",
                band.pinRight && "mg-corner",
                band.pinRight && scrolledX && "shadow-[-6px_0_10px_-6px_rgba(0,0,0,0.25)]",
                /* Duplicate runs of the same group (the frozen zone can split
                   a group into two bands) repeat the label but lighter. */
                band.continuation && "opacity-60",
              )}
              data-tip={group ? group.label : undefined}
            >
              {group &&
                (onToggleGroup ? (
                  <button
                    type="button"
                    aria-label={`Collapse ${group.label}`}
                    aria-expanded="true"
                    onClick={() => onToggleGroup(group.id)}
                    className="flex h-full w-full min-w-0 items-center gap-1 rounded-sm text-left focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span className="mg-band-label min-w-0 truncate">{bandText}</span>
                    <ChevronDown className="size-3 shrink-0 opacity-60" aria-hidden />
                  </button>
                ) : (
                  <span className="mg-band-label min-w-0 truncate">{bandText}</span>
                ))}
            </div>
          );
        })}
      </div>

      {/* Column header row: THE SAME grid template. */}
      <div
        data-testid="master-header-row"
        className="mg-head sticky grid border-b border-border bg-muted"
        style={{ gridTemplateColumns: grid.template, top: BAND_HEIGHT, height: HEADER_HEIGHT }}
      >
        {cells.map((cell) => {
          const sortedIdx = sorting.findIndex((s) => s.id === cell.key);
          const sorted = sortedIdx !== -1 ? sorting[sortedIdx] : null;
          const isAction = cell.column?.type === "action";
          return (
            <div
              key={cell.key}
              data-header={cell.key}
              data-align={cell.align}
              {...(cell.pinRight ? { "data-pin-right": "1" } : {})}
              style={{
                left: cell.sticky ? cell.left : undefined,
                right: cell.pinRight ? 0 : undefined,
                position: cell.sticky || cell.pinRight ? "sticky" : undefined,
              }}
              // px-3 = the BODY cells' inset, so a label starts at exactly the
              // same x as the value below it (the old header had no padding).
              className={cn(
                "relative flex items-stretch overflow-hidden border-r border-border/60 bg-muted px-3",
                // Pinned header cells sit above their scrolling neighbours…
                (cell.sticky || cell.pinRight) && "mg-head-pin",
                // …and the top corners (frozen first column / pinned Update)
                // are the topmost cells of the whole grid.
                cell.pinRight && "mg-corner",
                scrolledX && cell.key === lastSticky?.key && "shadow-[6px_0_10px_-6px_rgba(0,0,0,0.35)]",
                scrolledX && cell.pinRight && "shadow-[-6px_0_10px_-6px_rgba(0,0,0,0.35)]",
              )}
            >
              {isAction ? (
                <span
                  className="flex w-full min-w-0 items-center text-center text-[11.5px] leading-[1.2] font-semibold text-foreground"
                  style={{ justifyContent: JUSTIFY_FOR[cell.align] }}
                >
                  <span className="line-clamp-2 break-words whitespace-normal">
                    {labels[cell.key] ?? cell.label}
                  </span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onSort(cell.key)}
                  data-tip={
                    lockReasons[cell.key]
                      ? `${labels[cell.key] ?? cell.label} · auto or read-only: ${lockReasons[cell.key]} · click to sort`
                      : `${labels[cell.key] ?? cell.label} · click to sort`
                  }
                  data-sort-state={sorted ? (sorted.desc ? "desc" : "asc") : "none"}
                  data-readonly={lockReasons[cell.key] ? "1" : undefined}
                  className="flex w-full min-w-0 items-center gap-1 text-[11.5px] leading-[1.2] font-semibold text-foreground transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring focus-visible:outline-none"
                  style={{ justifyContent: JUSTIFY_FOR[cell.align] }}
                >
                  {/* Full header text on two lines inside the fixed header —
                      long labels wrap instead of being cut with an ellipsis. */}
                  <span className="min-w-0 line-clamp-2 leading-[1.2] break-words whitespace-normal">
                    {labels[cell.key] ?? cell.label}
                  </span>
                  {lockReasons[cell.key] && (
                    <Lock
                      className="size-3 shrink-0 text-muted-foreground/60"
                      aria-label={`Auto or read-only: ${lockReasons[cell.key]}`}
                    />
                  )}
                  {sorted ? (
                    sorted.desc ? (
                      <ArrowDown className="size-3 shrink-0 text-primary" aria-hidden />
                    ) : (
                      <ArrowUp className="size-3 shrink-0 text-primary" aria-hidden />
                    )
                  ) : (
                    <ChevronsUpDown
                      className="size-3 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground"
                      aria-hidden
                    />
                  )}
                  {sorting.length > 1 && sorted && (
                    <span className="shrink-0 rounded-full bg-primary/15 px-1 text-[10px] font-bold text-primary">
                      {sortedIdx + 1}
                    </span>
                  )}
                </button>
              )}
              {/* The merged Facility cell carries identity + type + block + PHC,
                  so its header offers all four sort keys explicitly. */}
              {cell.key === "facility" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="Sort facilities by"
                      data-tip="Sort by name, type, block or PHC"
                      className="absolute top-1/2 right-2 z-[6] -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ChevronDown className="size-3.5" aria-hidden />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-44">
                    <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {[
                      ["facility", "Name"],
                      ["type", "Facility Type"],
                      ["block", "Block"],
                      ["phc", "PHC"],
                    ].map(([key, label]) => {
                      const active = sorting.find((s) => s.id === key);
                      return (
                        <DropdownMenuItem key={key} onSelect={() => onSort(key)}>
                          <span className="flex-1">{label}</span>
                          {active ? (
                            active.desc ? <ArrowDown className="size-3 text-primary" /> : <ArrowUp className="size-3 text-primary" />
                          ) : null}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {/* Resize edge — writes through the ONE model/template. */}
              {!isAction && (
                <div
                  onPointerDown={onResizeStart(cell.key)}
                  onDoubleClick={() => onResizeReset(cell.key)}
                  role="separator"
                  aria-orientation="vertical"
                  aria-label={`Resize ${cell.column?.label ?? cell.label}`}
                  className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize touch-none select-none after:absolute after:top-1/2 after:left-1/2 after:h-4 after:w-px after:-translate-x-1/2 after:-translate-y-1/2 after:bg-border after:transition-colors hover:after:bg-primary"
                />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

/** Edit-mode configuration: the SAME shared grid renders editable cell
 *  widgets (EditModeCells) — view mode and edit mode share every sticky
 *  row, the band/Header heights and the resize machinery. */
export interface GroupedGridEdit {
  /** Render an editable widget for a data cell (null = read-only SmartCell). */
  renderEditableCell: (row: MasterRow, key: string) => ReactNode;
  /** The action column's EditableUpdateCell (Update / open / delete). */
  renderActionCell?: (row: MasterRow) => ReactNode;
  /** Spreadsheet-like activation (Part 1 ③): only ONE cell shows a control.
   *  Enter / F2 / double-click activate, Esc cancels, Enter (or blur)
   *  commits. The grid only wires the events; state's owner is the page. */
  activeCell?: { rowId: string; key: string } | null;
  onActivate?: (cell: { rowId: string; key: string } | null) => void;
  /** Header locks: data-column key → why the column is not editable
   *  ("Auto-calculated from the cycle dates", …). Paints a small lock in
   *  the header carrying the tooltip "Auto or read-only: <reason>". */
  readOnlyReasons?: Record<string, string>;
}

/* --------------------------------------------------------------------------- */

export function GroupedMasterTable({
  rows,
  labels,
  view,
  sorting,
  onSortingChange,
  onDensityChange,
  onOpenRow,
  onEditRow,
  onColumnsClick,
  searchQuery = "",
  totalRowCount,
  onClearFilters,
  scrollRef,
  /** PageShell mode: the wrapper and scrollport fill the remaining height. */
  fillHeight = false,
  widthsStorageKey = "master",
  pinnedKeys = [],
  freezeActive = true,
  freezeToggle,
  highlightToggle,
  recentLegend,
  recentByFacility,
  recentOn = false,
  edit,
  rowActions,
  onToggleGroup,
  selectedRowId = null,
  hideToolbar = false,
}: {
  rows: MasterRow[];
  labels: Record<string, string>;
  view: MasterView;
  sorting: SortingState;
  onSortingChange: (s: SortingState) => void;
  /** Lets the toolbar flip Compact / Comfortable without opening the dialog. */
  onDensityChange?: (density: Density) => void;
  onOpenRow: (row: MasterRow) => void;
  onEditRow?: (row: MasterRow) => void;
  /** Search text from the page, highlighted inside the Facility cell. */
  searchQuery?: string;
  onColumnsClick: () => void;
  /** Rows before filtering — shown in the "Showing x of y" line. */
  totalRowCount: number;
  onClearFilters?: () => void;
  /** Optional outside handle on the scroll container — used by the list page's
   *  scroll-restore hook to put the user back where they were. */
  scrollRef?: RefObject<HTMLDivElement | null>;
  /** Fill the parent PageShell body instead of measuring the document. */
  fillHeight?: boolean;
  /** Where the dragged column widths are remembered (localStorage). */
  widthsStorageKey?: string;
  /** Frozen data columns (Admin → Table & Display, 0–3). Frozen columns are
   *  a PREFIX of the order and start at left: 0 (there is no checkbox). */
  pinnedKeys?: string[];
  /** Freezing is active (per-user toggle ON ∧ viewport ≥ freeze-below px). */
  freezeActive?: boolean;
  /** Per-user "Freeze columns" toolbar toggle (remembered). */
  freezeToggle?: { on: boolean; onChange: (on: boolean) => void };
  /** Per-user "Highlight updates" toolbar toggle + the small legend. */
  highlightToggle?: { on: boolean; onChange: (on: boolean) => void };
  /** Legend text, e.g. "Highlighted = updated in the last 1 day". */
  recentLegend?: string | null;
  /** facilityId → (column key → marker) — read-time "Recently updated". */
  recentByFacility?: Record<string, Record<string, RecentMarker>> | null;
  /** Whether the marker should actually paint (per-user toggle). */
  recentOn?: boolean;
  /** Row-actions column (the guaranteed trailing "Update" utility): the
   *  Admin Show/Hide + pinRight flags, and the per-row callbacks the page
   *  owns (Quick View edit, full profile, history, print, export). */
  rowActions?: RowActionsProps & {
    /** Admin "Row action column" → Show / Hide (default Show). */
    visible?: boolean;
    /** Admin "Pin to right edge" (default ON). */
    pinRight?: boolean;
  };
  /** Edit mode: same grid, editable renderers (see GroupedGridEdit). */
  edit?: GroupedGridEdit;
  /** Group collapse/expand (page-owned, persisted in the view). */
  onToggleGroup?: (group: MasterGroupId) => void;
  /** The row whose Quick View is open — paints the selected-row highlight. */
  selectedRowId?: string | null;
  /** The page's command-bar View menu owns density/columns/freeze/highlight. */
  hideToolbar?: boolean;
}) {
  const localScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollContainer = scrollRef ?? localScrollRef;
  /* Horizontal shadows change only when the table crosses the 2px edge — no
     state is written for the rest of the scroll, so scrolling never re-renders
     the page chrome or the visible rows for a shadow. */
  const [scrolledX, setScrolledX] = useState(false);
  /** Per-column resize overrides (px). ONE state drives the ONE template, and
   *  it is a USER PREFERENCE, so it is restored from this device on every
   *  visit (see lib/masterView.loadColumnWidths) — a width dragged once stays
   *  dragged, like the density and the visible columns next to it. */
  const [widthOverrides, setWidthOverrides] = useState<Record<string, number>>(() =>
    loadColumnWidths(widthsStorageKey),
  );
  useEffect(() => {
    saveColumnWidths(widthsStorageKey, widthOverrides);
  }, [widthsStorageKey, widthOverrides]);
  /** Names shared by several rows — those get the PHC · Block suffix. */
  const dupes = useMemo(() => duplicateNames(rows), [rows]);
  /** The rows in the order the header clicks asked for (see sortMasterRows). */
  const sortedRows = useMemo(() => sortMasterRows(rows, sorting), [rows, sorting]);
  const facilityStyle = useFacilityStyle();
  // One-line identity is a 36 px row even when the rest of the view is
  // comfortable; compact density already uses 36 px.
  const effectiveView = useMemo(
    () =>
      facilityStyle === "oneLine" && view.density !== "compact"
        ? { ...view, density: "compact" as const }
        : view,
    [facilityStyle, view],
  );

  // One model, one template, one source of truth for widths/sticky/band.
  const grid = useMemo(
    () =>
      buildMasterGrid(effectiveView, {
        widthOverrides,
        pinnedKeys,
        freezeActive,
        actions: {
          visible: rowActions?.visible,
          pinRight: rowActions?.pinRight,
          width: edit ? EDIT_ROW_ACTIONS_WIDTH : ROW_ACTIONS_WIDTH,
        },
      }),
    [widthOverrides, effectiveView, pinnedKeys, freezeActive, rowActions?.visible, rowActions?.pinRight, edit],
  );
  const { cells } = grid;
  /** scroll-padding-left = frozen width: a keyboard-focused / scrolled-to
   *  cell can never park behind the frozen columns. */
  const frozenWidth = useMemo(() => frozenZoneWidth(grid), [grid]);

  /* ---- THE sticky-top offset, measured (never guessed) ----------------
     The scroll container's height must reserve exactly the space the real
     app header + toolbar above it occupy. Measuring the table wrapper's own
     document-space top with a ResizeObserver (wrapper + window) means a
     taller toolbar can never clip the table's bottom or leave a dead gap
     below it — and it reacts when the toolbar's height changes. */
  const glassWrapperRef = useRef<HTMLDivElement | null>(null);
  const [stickyOffset, setStickyOffset] = useState<number | null>(null);
  useEffect(() => {
    // PageShell already owns the height; no document-space measurement (and
    // no state) is needed in fill-height mode.
    if (fillHeight) return;
    const el = glassWrapperRef.current;
    if (!el || typeof window === "undefined" || typeof ResizeObserver !== "function") return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const next = Math.max(
        120,
        Math.round(el.getBoundingClientRect().top + window.scrollY),
      );
      // Only re-render when the number actually moved — during the 180ms
      // sidebar width transition the ResizeObserver fires every frame, and
      // rows must not re-render for a value that is unchanged.
      setStickyOffset((prev) => (prev === next ? prev : next));
    };
    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(measure);
    };
    measure();
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    window.addEventListener("resize", schedule);
    // The sidebar resizes the content column; settle once the grid
    // transition ends (throttled by rAF above, so no per-frame work).
    const shell = el.closest(".app-shell");
    const onTransitionEnd = (event: Event) => {
      if (!shell || event.target === shell) schedule();
    };
    shell?.addEventListener("transitionend", onTransitionEnd);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      shell?.removeEventListener("transitionend", onTransitionEnd);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [fillHeight]);

  const rowVirtualizer = useVirtualizer({
    count: sortedRows.length,
    getScrollElement: () => scrollContainer.current,
    // The SAME fixed per-density height the grid rows render with.
    estimateSize: () => grid.rowHeight,
    overscan: 14,
  });
  // Density / resize change the row height or template — re-measure.
  useEffect(() => {
    rowVirtualizer.measure();
  }, [grid.rowHeight, grid.template, rowVirtualizer]);

  const virtualRows = rowVirtualizer.getVirtualItems();

  /** Pointer-resize a column edge: ONE setState → ONE re-render with the
   *  recomputed template, band spans and sticky offsets. Double-click resets
   *  to the config width. */
  const startResize = (key: string) => (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = cells.find((c) => c.key === key)?.widthPx ?? 120;
    const onMove = (move: PointerEvent) => {
      const nextWidth = Math.max(60, startWidth + (move.clientX - startX));
      setWidthOverrides((prev) => ({ ...prev, [key]: nextWidth }));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  if (rows.length === 0) return <NoRows total={totalRowCount} onClear={onClearFilters} />;

  return (
    <div
      ref={glassWrapperRef}
      className={cn(
        "glass overflow-hidden rounded-xl border border-border/60",
        fillHeight && "flex h-full min-h-0 flex-col",
      )}
    >
      {/* Group bands that are collapsed stay one click away. */}
      {onToggleGroup && (view.collapsedGroups ?? []).length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-border/60 bg-muted/30 px-3 py-1.5">
          <span className="text-[11px] font-medium text-muted-foreground">Collapsed</span>
          {view.collapsedGroups.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onToggleGroup(id)}
              className="inline-flex min-h-7 items-center gap-1 rounded-full border border-border/70 bg-background px-2.5 text-[11px] font-medium transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <ChevronDown className="size-3 -rotate-90" aria-hidden />
              {GROUP_BY_ID[id]?.shortLabel ?? id}
            </button>
          ))}
        </div>
      )}
      {/* Toolbar: count + sort summary + density + columns button */}
      {!hideToolbar && (
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <p className="text-sm text-muted-foreground" role="status">
          Showing{" "}
          <span className="font-semibold text-foreground">
            {rows.length.toLocaleString("en-IN")}
          </span>{" "}
          of {totalRowCount.toLocaleString("en-IN")} facilities
          {sorting.length > 0 && (
            <span className="ml-2 text-xs">
              sorted by{" "}
              {sorting
                .map((s, i) => `${i + 1}. ${labels[s.id] ?? s.id} ${s.desc ? "↓" : "↑"}`)
                .join(", ")}
            </span>
          )}
          {/* The data-as-of stamp lives in the page header alone — the table
              previously repeated a second timestamp here (redesign: exactly
              ONE server timestamp on the page). */}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {onDensityChange && (
            <span
              className="flex gap-0.5 rounded-lg border border-border/60 p-0.5"
              role="group"
              aria-label="Row density"
            >
              {(["compact", "comfortable"] as Density[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onDensityChange(d)}
                  aria-pressed={view.density === d}
                  data-tip={`${d === "compact" ? "Compact" : "Comfortable"} rows`}
                  className={cn(
                    "flex min-h-8 items-center gap-1 rounded-md px-2 text-xs font-medium capitalize transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    view.density === d
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Rows3 className="size-3.5" aria-hidden />
                  <span className="hidden sm:inline">{d}</span>
                </button>
              ))}
            </span>
          )}
          <Button size="sm" variant="outline" className="h-9" onClick={onColumnsClick}>
            <Settings2 className="mr-1.5 size-4" /> Columns
            {/* DATA columns only — the checkbox and the on-screen "Update"
                action column are layout utilities, never counted (and never
                exported: the config marks them exportable: false). */}
            <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs tabular-nums">
              {grid.dataColumnCount}
            </span>
          </Button>
          {/* Per-user "Freeze columns" toggle — falls back off below the
              Admin "Disable freezing below (px)" width (handled by the
              freezeActive flag), remembered per browser. */}
          {freezeToggle && (
            <button
              type="button"
              onClick={() => freezeToggle.onChange(!freezeToggle.on)}
              aria-pressed={freezeToggle.on}
              data-tip={freezeToggle.on ? "Column freezing is on" : "Column freezing is off"}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-lg border border-border/60 px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                freezeToggle.on ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
              )}
            >
              <PanelLeft className="size-3.5" aria-hidden /> Freeze columns
            </button>
          )}
          {highlightToggle && (
            <button
              type="button"
              onClick={() => highlightToggle.onChange(!highlightToggle.on)}
              aria-pressed={highlightToggle.on}
              data-tip={highlightToggle.on ? "Recently-updated highlighting is on" : "Recently-updated highlighting is off"}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-lg border border-border/60 px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                highlightToggle.on ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "text-muted-foreground hover:bg-muted",
              )}
            >
              <Sparkles className="size-3.5" aria-hidden /> Highlight updates
            </button>
          )}
        </div>
      </div>
      )}
      {/* The small legend — text, never colour alone. */}
      {recentLegend && recentOn && (
        <p className="flex shrink-0 items-center gap-1.5 border-b border-border/40 px-3 py-1 text-[11px] text-muted-foreground">
          <span aria-hidden className="inline-block size-2.5 rounded-sm bg-amber-200 dark:bg-amber-500/30 border border-amber-300" />
          {recentLegend}
        </p>
      )}

      {/* One scroll container: the header rows live here, so horizontal
          scrolling is one stream — never a scrollLeft sync between two panes. */}
      <div
        ref={scrollContainer}
        data-printable="master-table"
        onScroll={(e) => {
          const next = (e.target as HTMLDivElement).scrollLeft > 2;
          setScrolledX((prev) => (prev === next ? prev : next));
        }}
        className={cn(
          "relative overflow-auto",
          fillHeight && "min-h-0 flex-1 overscroll-contain",
        )}
        style={{
          // PageShell: fill the remaining body height. Standalone: one bounded
          // scroll container below the measured sticky chrome, floor 320px.
          ...(fillHeight
            ? { flex: "1 1 auto", maxHeight: "none", minHeight: 0 }
            : {
                maxHeight:
                  stickyOffset != null
                    ? `calc(100dvh - ${stickyOffset}px)`
                    : "calc(100vh - 252px)",
                minHeight: "320px",
              }),
          // Keyboard contract: a cell scrolled/focused into view parks to the
          // RIGHT of the frozen zone and BELOW the frozen band+header rows.
          scrollPaddingTop: `${BAND_HEIGHT + HEADER_HEIGHT}px`,
          ...(frozenWidth > 0 ? { scrollPaddingLeft: `${frozenWidth}px` } : {}),
          // Focused cells never park beneath the right-pinned column.
          ...(grid.actionsCell ? { scrollPaddingRight: `${grid.actionsCell.widthPx}px` } : {}),
        }}
      >
        {/* Inner width ≥ the full template: the table scrolls horizontally
            instead of squeezing columns. */}
        <div data-testid="master-scroll-inner" style={{ minWidth: grid.totalWidth }}>
          {/* Band + header = the exported header chrome (same model, same
              template); shared with the DOM alignment tests. */}
          <MasterGridHead
            grid={grid}
            sorting={sorting}
            labels={labels}
            onSort={(key) => onSortingChange(cycleSort(sorting, key))}
            onResizeStart={startResize}
            onResizeReset={(key) =>
              setWidthOverrides((prev) => {
                const next = { ...prev };
                delete next[key];
                return next;
              })
            }
            scrolledX={scrolledX}
            lockReasons={edit?.readOnlyReasons ?? {}}
            onToggleGroup={onToggleGroup}
          />

          {/* ---------- Virtualized body rows ---------- */}
          <div
            // THE body layer: relative + z-index 0 + isolation. Everything a
            // row paints (its pinned Update cell included) is confined to this
            // stacking context, so no body cell can ever draw over the sticky
            // band/header above it (they live at --mg-z-head = 5).
            className="mg-body"
            style={{ height: rowVirtualizer.getTotalSize() }}
            data-testid="master-body"
          >
            {virtualRows.map((vr) => {
              const row = sortedRows[vr.index];
              if (!row) return null;
              return (
                <MasterGridRow
                  key={row.facility._id}
                  index={vr.index}
                  row={row}
                  cells={cells}
                  gridTemplate={grid.template}
                  totalWidth={grid.totalWidth}
                  top={vr.start}
                  rowHeight={grid.rowHeight}
                  density={effectiveView.density}
                  dupes={dupes}
                  searchQuery={searchQuery}
                  zebra={false}
                  selected={selectedRowId === String(row.facility._id)}
                  scrolledX={scrolledX}
                  recent={recentOn ? (recentByFacility?.[String(row.facility._id)] ?? undefined) : undefined}
                  edit={edit}
                  rowActions={rowActions}
                  showNin={!cells.some((c) => c.key === "nin")}
                  onOpen={() => onOpenRow(row)}
                  onEdit={onEditRow ? () => onEditRow(row) : undefined}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------- */
/* Body row — one grid DIV with the shared template, absolutely positioned by  */
/* `top` (no transform), so left-pinned cells are true sticky elements.         */
/* --------------------------------------------------------------------------- */

export function MasterGridRow({
  row,
  index,
  cells,
  gridTemplate,
  totalWidth,
  top,
  rowHeight,
  density,
  dupes,
  searchQuery,
  zebra,
  selected = false,
  scrolledX,
  recent,
  edit,
  rowActions,
  showNin = true,
  onOpen,
  onEdit,
}: {
  row: MasterRow;
  index: number;
  cells: GridCellModel[];
  gridTemplate: string;
  totalWidth: number;
  top: number;
  rowHeight: number;
  density: Density;
  dupes: Set<string>;
  searchQuery: string;
  zebra: boolean;
  selected?: boolean;
  scrolledX: boolean;
  /** column key → "Recently updated" marker for THIS row (undefined = off). */
  recent?: Record<string, RecentMarker>;
  /** Edit mode: editable renderers (the SAME grid, widget cells). */
  edit?: GroupedGridEdit;
  /** Row-actions callbacks (page-owned): Update / profile / history / print. */
  rowActions?: RowActionsProps;
  /** Only the Facility column: print the NIN when its own column is hidden. */
  showNin?: boolean;
  onOpen: () => void;
  onEdit?: () => void;
}) {
  const lastSticky = lastStickyCell(cells);
  return (
    <div
      data-testid="master-row"
      data-row-index={index}
      onClick={onOpen}
      // Row-level keyboard (event DELEGATION — no per-row listeners):
      //   U        → Update (Quick View, Edit mode)
      //   Shift+F10 / Menu key → open the row's "⋯" menu
      onKeyDown={(e) => {
        /* Enter opens the focused row. Space no longer toggles a row
           selection (the Master List has no checkboxes), so it is left to
           the browser's own scrolling. */
        if (e.key === "Enter") {
          e.preventDefault();
          onOpen();
          return;
        }
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === "u" || e.key === "U") {
          if (rowActions?.onUpdate) {
            e.preventDefault();
            e.stopPropagation();
            rowActions.onUpdate(row);
          }
          return;
        }
        if ((e.shiftKey && e.key === "F10") || e.key === "ContextMenu") {
          const more = (e.currentTarget as HTMLElement).querySelector<HTMLElement>(
            "[data-more-actions]",
          );
          if (more) {
            e.preventDefault();
            e.stopPropagation();
            more.click(); // opens the portal-rendered menu (spec §5)
          }
        }
      }}
      data-zebra={zebra ? "1" : "0"}
      data-selected={
        selected || edit?.activeCell?.rowId === String(row.facility._id)
          ? "1"
          : undefined
      }
      data-recent-row={
        recent && Object.keys(recent).length > 0 ? "1" : undefined
      }
      style={{
        position: "absolute",
        top,
        left: 0,
        height: rowHeight,
        width: totalWidth,
        display: "grid",
        gridTemplateColumns: gridTemplate,
      }}
      className={cn(
        // ROOT-CAUSE FIX (frozen body cells): the row used to carry
        // ``overflow-hidden``. An overflowHidden ancestor between a sticky
        // cell and the scroll container IS a new (non-scrollable) containing
        // scrollport, so every body cell's ``position: sticky; left`` anchored
        // to the ROW, not the scroll pane — the header cells (no breaking
        // ancestor) froze while the body cells scrolled away underneath. The
        // clipping that overflow-hidden provided is already done PER CELL
        // (every cell has its own overflow-hidden), so the row itself stays
        // clean. The row keeps its explicit width (≥ the template total) and
        // uses ``top`` — never ``transform`/``translateY`` — for placement,
        // which keeps the sticky cells' ancestor chain intact.
        "mg-data-row cursor-pointer border-b border-border/40 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
      )}
    >
      {cells.map((cell) => {
        const shadow = cell.sticky && scrolledX && lastSticky?.key === cell.key;
        const marker = recent?.[cell.key];
        const isActions = !!cell.pinRight || cell.column?.type === "action";
        return (
          <div
            key={cell.key}
            role="gridcell"
            data-cell={cell.key}
            data-align={cell.align}
            {...(isActions ? { "data-pin-right": "1" } : {})}
            data-recent={marker ? "1" : undefined}
            data-tip={
              marker
                ? `Updated ${toDisplayDateTime(marker.at)} · ${marker.source ?? "Manual edit"}${marker.by ? ` · by ${marker.by}` : ""}${marker.was ? ` · was: ${marker.was}` : ""}`
                : undefined
            }
            style={{
              left: cell.sticky ? cell.left : undefined,
              // RIGHT pin (the row-actions column): sticky against the edge.
              right: cell.pinRight ? 0 : undefined,
              position: cell.sticky || cell.pinRight ? "sticky" : undefined,
              // Appearance contract: NO width/height ever changes — the tint
              // is a background, the dot is absolutely positioned (overlap),
              // so the header/body alignment contract keeps passing.
            }}
            className={cn(
              "mg-cell mg-row-cell relative flex min-w-0 items-center overflow-hidden border-r border-border/30 px-3",
              // Pinned cells use the SAME --row-bg as every other cell: zebra,
              // hover, selected and recently-updated states stay in sync.
              (cell.sticky || cell.pinRight) && "mg-pin",
              cell.key === "nin" && "tabular-nums",
              shadow && "shadow-[6px_0_10px_-6px_rgba(0,0,0,0.25)]",
              // The right pin casts a LEFT-edge shadow while scrolling.
              cell.pinRight && scrolledX && "shadow-[-6px_0_10px_-6px_rgba(0,0,0,0.25)]",
            )}
            // A click on the actions cell never opens the row's quick view
            // (the row handler stays for data cells only).
            onClick={isActions ? (e) => e.stopPropagation() : undefined}
          >
            {isActions ? (
              edit && edit.renderActionCell ? (
                <div className="flex h-full w-full items-center">
                  {edit.renderActionCell(row)}
                </div>
              ) : rowActions ? (
                <RowActionsCell row={row} {...rowActions} />
              ) : null
            ) : edit && cell.kind === "data" && cell.column?.type !== "action" && !cell.pinRight ? (
              (() => {
                const rowId = String(row.facility._id);
                const isActive =
                  edit.activeCell?.rowId === rowId && edit.activeCell?.key === cell.key;
                return (
                  <div
                    data-edit-cell={cell.key}
                    data-edit-active={isActive ? "1" : undefined}
                    tabIndex={0}
                    /* The activated editor takes the focus immediately —
                       Enter/F2/double-click → type. First focusable control
                       wins; the wrapper itself is the fallback and keeps the
                       keyboard flow (Esc cancels, Enter posts, arrows move). */
                    ref={(el) => {
                      if (!el || !isActive) return;
                      window.setTimeout(() => {
                        const target = el.querySelector<HTMLElement>(
                          "input, select, textarea, button",
                        );
                        try {
                          (target ?? el).focus({ preventScroll: true });
                        } catch {
                          el.focus();
                        }
                      }, 0);
                    }}
                    className={cn(
                      "flex h-full w-full min-w-0 items-center overflow-hidden outline-none",
                      // the ONE active cell carries the editor — never grows the
                      // row and never paints a different background; the ring
                      // is the only selection signal so the whole row stays one
                      // colour in edit mode too.
                      isActive && "ring-1 ring-inset ring-ring/70",
                    )}
                    onClick={(e) => {
                      e.stopPropagation(); // a click SELECTS the cell, not the drawer
                      if (!isActive) edit.onActivate?.({ rowId, key: cell.key });
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (!isActive) edit.onActivate?.({ rowId, key: cell.key });
                    }}
                    onKeyDown={(e) => {
                      const onWrapper = e.target === e.currentTarget;
                      if (e.key === "Escape") {
                        e.stopPropagation();
                        edit.onActivate?.(null); // cancel → back to the value
                      } else if ((e.key === "Enter" || e.key === "F2") && onWrapper) {
                        e.preventDefault();
                        e.stopPropagation();
                        // Enter commits (closes) when open, activates when not
                        edit.onActivate?.(isActive ? null : { rowId, key: cell.key });
                      }
                    }}
                  >
                    {(isActive ? edit.renderEditableCell(row, cell.key) : null) ?? (
                      <SmartCell
                        row={row}
                        column={cell.column!}
                        dupes={dupes}
                        density={density}
                        oneLine={true}
                      />
                    )}
                  </div>
                );
              })()
            ) : (
              <>
                {/* screen-reader note for the marker — visible dot is the icon */}
                {marker && (
                  <span
                    aria-hidden
                    data-recent-dot="1"
                    className="absolute top-1 right-1 size-1.5 rounded-full bg-amber-500"
                  />
                )}
                {marker && <span className="sr-only">Updated</span>}
              <div
                className="flex h-full w-full min-w-0 items-center overflow-hidden"
                style={{ justifyContent: JUSTIFY_FOR[cell.align] }}
              >
                {cell.column && cell.column.type === "action" ? (
                  onEdit ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(); // legacy onEdit — superseded by rowActions
                      }}
                    >
                      Edit
                    </Button>
                  ) : null
                ) : cell.key === "facility" ? (
                  <FacilityCell
                    facility={row.facility}
                    query={searchQuery}
                    compact={density === "compact"}
                    showNin={showNin}
                    onOpen={onOpen}
                  />
                ) : (
                  <SmartCell
                    row={row}
                    column={cell.column!}
                    dupes={dupes}
                    density={density}
                    // One value per cell, single line — EXCEPT long text
                    // (Remarks / Departments) in a Comfortable row, which
                    // clamps to two lines inside the fixed row height. Cell
                    // content can never grow a row in either density.
                    oneLine={
                      density === "compact" || cell.column?.type !== "longtext"
                    }
                  />
                )}
              </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
