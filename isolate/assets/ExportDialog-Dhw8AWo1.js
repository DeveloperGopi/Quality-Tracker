import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { m as Check, a7 as Pencil, e as Eye, ac as Ellipsis, E as ExternalLink, X as History, a4 as Printer, bU as Sheet, r as reactExports, H as ChevronDown, bQ as Rows3, ae as Settings2, bi as PanelLeft, a6 as Sparkles, p as Lock, a8 as ArrowDown, a9 as ArrowUp, bv as ChevronsUpDown, x as Columns3, G as GripVertical, bV as Pin, w as RotateCcw, ao as FileDown, aN as FileTypeCorner, F as FileSpreadsheet } from './icons-BxQpodNr.js';
import { u as useVirtualizer } from './index-BALjev1w.js';
import { D as DropdownMenu, a as DropdownMenuTrigger, b as DropdownMenuContent, c as DropdownMenuLabel, g as DropdownMenuSeparator, f as DropdownMenuItem } from './dropdown-menu-N0nU9bdA.js';
import { B as Button, c as cn, m as useMutation, j as api } from './index-CBV6wOh8.js';
import { ca as useFacilityStyle, cm as GROUP_BY_ID, t as toDisplayDateTime, cH as COLUMN_PRESETS, bn as FACILITY_STYLE_OPTIONS, cO as MASTER_GROUPS, cP as columnsMenuColumns, cQ as setFacilityStyle, ap as fullExportColumns, cR as RadioGroup, cS as RadioGroupItem } from './AppShell-CP099uvN.js';
import { d as duplicateNames, s as sortMasterRows } from './masterFilter-DrauVhuN.js';
import { b as loadColumnWidths, d as saveColumnWidths, e as buildMasterGrid, f as frozenZoneWidth, E as EDIT_ROW_ACTIONS_WIDTH, R as ROW_ACTIONS_WIDTH, g as bandLabelMode, o as orderedVisibleColumns, a as applyPreset, m as moveColumn, D as DEFAULT_VIEW, C as CUSTOM_PRESET_ID } from './masterGrid-CjX4ti61.js';
import { N as NoRows, f as SmartCell } from './FacilityQuickView-D07vvNqK.js';
import { F as FacilityCell } from './FacilityCell-CI45DpPw.js';
import { C as Checkbox } from './checkbox-CjOYMc2v.js';
import { L as Label, P as Primitive } from './label-BaPkqXdo.js';
import { D as Dialog, a as DialogContent, b as DialogHeader, c as DialogTitle, d as DialogDescription, e as DialogFooter } from './dialog-BW3GEiPg.js';
import { p as pdfSections } from './masterExport-Dlb4N-po.js';

let lastTrigger = null;
function focusLastRowActionTrigger() {
  const el = lastTrigger;
  if (!el || !el.isConnected) return;
  el.focus({ preventScroll: true });
}
function usePrefetch(handlers, row) {
  const timer = reactExports.useRef(null);
  const fire = () => {
    if (timer.current != null) return;
    timer.current = window.setTimeout(() => {
      timer.current = null;
      handlers.onPrefetch?.(row);
    }, 100);
  };
  reactExports.useEffect(
    () => () => {
      if (timer.current != null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
    },
    []
  );
  return fire;
}
function RowActionsCell({
  row,
  canEdit,
  isAdmin = false,
  label = "Update",
  onUpdate,
  onOpenProfile,
  onViewHistory,
  onPrint,
  onExport,
  onPrefetch,
  savedIds,
  draftIds,
  compact = false
}) {
  const justSaved = !!savedIds?.has(String(row.facility._id));
  const hasDraft = !!draftIds?.has(String(row.facility._id));
  const prefetch = usePrefetch(
    { canEdit, isAdmin, label, onUpdate, onOpenProfile, onViewHistory, onPrint, onExport, onPrefetch, compact },
    row
  );
  const name = row.facility.name;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "data-testid": "row-actions",
      className: "row-actions relative flex h-full w-full items-center justify-center gap-1",
      onClick: (e) => e.stopPropagation(),
      onKeyDown: (e) => {
        if (e.key === "Escape") e.stopPropagation();
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            size: "sm",
            variant: canEdit ? "default" : "outline",
            className: cn(
              "row-actions-btn h-8 shrink-0 gap-1 px-1 text-xs",
              // Compact keeps a 36px hit area (icon only).
              compact ? "w-9 px-0" : ""
            ),
            disabled: justSaved,
            "aria-label": `${canEdit ? label : "View"} ${name}`,
            "data-tip": canEdit ? `${label} ${name} — opens the quick view in Edit mode` : `View ${name} — opens the quick view`,
            onClick: (e) => {
              e.stopPropagation();
              if (justSaved) return;
              lastTrigger = e.currentTarget;
              if (canEdit) onUpdate?.(row);
              else onOpenProfile?.(row);
            },
            onMouseEnter: prefetch,
            onFocus: prefetch,
            onKeyDown: (e) => {
              if (e.shiftKey && e.key === "F10" || e.key === "ContextMenu") {
                const more = e.currentTarget.parentElement?.querySelector(
                  "[data-more-actions]"
                );
                if (more) {
                  e.preventDefault();
                  e.stopPropagation();
                  more.click();
                }
              }
            },
            "data-testid": "row-actions-btn",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(DraftDot, { show: hasDraft }),
              justSaved ? compact ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3.5", "aria-hidden": true }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sr-only", children: "Saved" })
              ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: "row-actions-saved w-[52px] text-center whitespace-nowrap",
                  "aria-live": "polite",
                  children: "Saved ✓"
                }
              ) : canEdit ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "size-3.5", "aria-hidden": true }),
                compact ? null : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "row-actions-label w-[52px] text-center", children: label })
              ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "size-3.5", "aria-hidden": true }),
                compact ? null : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "row-actions-label w-[52px] text-center", children: "View" })
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "ghost",
              size: "icon",
              className: "row-actions-more size-6 shrink-0 text-muted-foreground hover:text-foreground",
              "aria-label": `More actions ${name}`,
              "data-tip": "More actions",
              "data-testid": "row-actions-more",
              "data-more-actions": "",
              onClick: (e) => e.stopPropagation(),
              onMouseEnter: prefetch,
              onFocus: prefetch,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Ellipsis, { className: "size-4", "aria-hidden": true })
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            DropdownMenuContent,
            {
              align: "end",
              onClick: (e) => e.stopPropagation(),
              className: "min-w-52",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuLabel, { className: "text-xs text-muted-foreground", children: name }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, {}),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  DropdownMenuItem,
                  {
                    onSelect: () => onOpenProfile?.(row),
                    "aria-label": `Open full profile ${name}`,
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "size-4", "aria-hidden": true }),
                      " Open full profile"
                    ]
                  }
                ),
                onViewHistory && /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onSelect: () => onViewHistory(row), children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(History, { className: "size-4", "aria-hidden": true }),
                  " View history"
                ] }),
                onPrint && /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onSelect: () => onPrint(row), children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Printer, { className: "size-4", "aria-hidden": true }),
                  " Print facility sheet"
                ] }),
                onExport && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, {}),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onSelect: () => onExport(row, "pdf"), children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Sheet, { className: "size-4", "aria-hidden": true }),
                    " Export this facility (PDF)"
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onSelect: () => onExport(row, "excel"), children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Sheet, { className: "size-4", "aria-hidden": true }),
                    " Export this facility (Excel)"
                  ] })
                ] }),
                !canEdit && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-2 pt-2 text-[11px] text-muted-foreground", children: "Your role can view facilities but not edit them." })
              ]
            }
          )
        ] })
      ]
    }
  );
}
function DraftDot({ show }) {
  if (!show) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      role: "status",
      "aria-label": "Saved draft",
      "data-tip": "A draft is saved for this facility",
      "data-testid": "row-draft-dot",
      className: "absolute -right-0.5 -top-0.5 z-10 size-2 rounded-full bg-amber-500 ring-1 ring-background"
    }
  );
}

function cycleSort(sorting, key) {
  const idx = sorting.findIndex((s) => s.id === key);
  if (idx === -1) return [...sorting, { id: key, desc: false }];
  if (!sorting[idx].desc) {
    const next = [...sorting];
    next[idx] = { id: key, desc: true };
    return next;
  }
  return sorting.filter((s) => s.id !== key);
}
const JUSTIFY_FOR = {
  left: "flex-start",
  center: "center",
  right: "flex-end"
};
const BAND_HEIGHT = 30;
const HEADER_HEIGHT = 56;
function lastStickyCell(cells) {
  const pinned = cells.filter((c) => c.sticky);
  return pinned[pinned.length - 1];
}
function MasterGridHead({
  grid,
  sorting,
  labels,
  onSort,
  onResizeStart,
  onResizeReset,
  scrolledX = false,
  lockReasons = {},
  viewport,
  onToggleGroup
}) {
  const { cells, bands } = grid;
  const lastSticky = lastStickyCell(cells);
  const vp = viewport ?? {
    scrollLeft: 0,
    viewportWidth: 1e5,
    pinnedWidth: frozenZoneWidth(grid)
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        "data-testid": "master-band",
        className: "mg-head sticky top-0 grid bg-muted",
        style: {
          gridTemplateColumns: grid.template,
          height: BAND_HEIGHT,
          // The band label sticks to the RIGHT of the frozen columns.
          ...{ "--mg-pin-w": `${vp.pinnedWidth}px` }
        },
        children: bands.map((band, bandIdx) => {
          const group = band.id ? GROUP_BY_ID[band.id] : null;
          const mode = group ? bandLabelMode(band, vp, group.shortLabel) : "dot";
          const bandText = group ? mode === "full" ? group.label : group.shortLabel : "";
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              "data-testid": `master-band-${bandIdx}`,
              "data-band-group": band.id ?? "select",
              "data-band-span": band.span,
              "data-band-start": band.start,
              "data-band-sticky": band.sticky ? "1" : "0",
              "data-band-mode": group ? mode : "none",
              "aria-label": group?.label,
              style: {
                gridColumn: `${band.start} / span ${band.span}`,
                left: band.sticky ? band.left : void 0,
                right: band.pinRight ? 0 : void 0,
                position: band.sticky || band.pinRight ? "sticky" : void 0
              },
              className: cn(
                "mg-band flex min-w-0 items-center overflow-hidden border-r border-border/60 px-3 text-[11px] font-semibold whitespace-nowrap",
                group ? `${group.tint.bg} ${group.tint.text} border-l-2 ${group.tint.border}` : "bg-muted",
                /* The row-actions band cell pins RIGHT: opaque background and
                   the same soft left-edge shadow the header/body cells carry. */
                band.sticky && "mg-head-pin",
                band.pinRight && "mg-corner",
                band.pinRight && scrolledX && "shadow-[-6px_0_10px_-6px_rgba(0,0,0,0.25)]",
                /* Duplicate runs of the same group (the frozen zone can split
                   a group into two bands) repeat the label but lighter. */
                band.continuation && "opacity-60"
              ),
              "data-tip": group ? group.label : void 0,
              children: group && (onToggleGroup ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  "aria-label": `Collapse ${group.label}`,
                  "aria-expanded": "true",
                  onClick: () => onToggleGroup(group.id),
                  className: "flex h-full w-full min-w-0 items-center gap-1 rounded-sm text-left focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring focus-visible:outline-none",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mg-band-label min-w-0 truncate", children: bandText }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "size-3 shrink-0 opacity-60", "aria-hidden": true })
                  ]
                }
              ) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mg-band-label min-w-0 truncate", children: bandText }))
            },
            `${band.id ?? "select"}-${bandIdx}`
          );
        })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        "data-testid": "master-header-row",
        className: "mg-head sticky grid border-b border-border bg-muted",
        style: { gridTemplateColumns: grid.template, top: BAND_HEIGHT, height: HEADER_HEIGHT },
        children: cells.map((cell) => {
          const sortedIdx = sorting.findIndex((s) => s.id === cell.key);
          const sorted = sortedIdx !== -1 ? sorting[sortedIdx] : null;
          const isAction = cell.column?.type === "action";
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              "data-header": cell.key,
              "data-align": cell.align,
              ...cell.pinRight ? { "data-pin-right": "1" } : {},
              style: {
                left: cell.sticky ? cell.left : void 0,
                right: cell.pinRight ? 0 : void 0,
                position: cell.sticky || cell.pinRight ? "sticky" : void 0
              },
              className: cn(
                "relative flex items-stretch overflow-hidden border-r border-border/60 bg-muted px-3",
                // Pinned header cells sit above their scrolling neighbours…
                (cell.sticky || cell.pinRight) && "mg-head-pin",
                // …and the top corners (frozen first column / pinned Update)
                // are the topmost cells of the whole grid.
                cell.pinRight && "mg-corner",
                scrolledX && cell.key === lastSticky?.key && "shadow-[6px_0_10px_-6px_rgba(0,0,0,0.35)]",
                scrolledX && cell.pinRight && "shadow-[-6px_0_10px_-6px_rgba(0,0,0,0.35)]"
              ),
              children: [
                isAction ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    className: "flex w-full min-w-0 items-center text-center text-[11.5px] leading-[1.2] font-semibold text-foreground",
                    style: { justifyContent: JUSTIFY_FOR[cell.align] },
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "line-clamp-2 break-words whitespace-normal", children: labels[cell.key] ?? cell.label })
                  }
                ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    onClick: () => onSort(cell.key),
                    "data-tip": lockReasons[cell.key] ? `${labels[cell.key] ?? cell.label} · auto or read-only: ${lockReasons[cell.key]} · click to sort` : `${labels[cell.key] ?? cell.label} · click to sort`,
                    "data-sort-state": sorted ? sorted.desc ? "desc" : "asc" : "none",
                    "data-readonly": lockReasons[cell.key] ? "1" : void 0,
                    className: "flex w-full min-w-0 items-center gap-1 text-[11.5px] leading-[1.2] font-semibold text-foreground transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring focus-visible:outline-none",
                    style: { justifyContent: JUSTIFY_FOR[cell.align] },
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 line-clamp-2 leading-[1.2] break-words whitespace-normal", children: labels[cell.key] ?? cell.label }),
                      lockReasons[cell.key] && /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Lock,
                        {
                          className: "size-3 shrink-0 text-muted-foreground/60",
                          "aria-label": `Auto or read-only: ${lockReasons[cell.key]}`
                        }
                      ),
                      sorted ? sorted.desc ? /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDown, { className: "size-3 shrink-0 text-primary", "aria-hidden": true }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUp, { className: "size-3 shrink-0 text-primary", "aria-hidden": true }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                        ChevronsUpDown,
                        {
                          className: "size-3 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground",
                          "aria-hidden": true
                        }
                      ),
                      sorting.length > 1 && sorted && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 rounded-full bg-primary/15 px-1 text-[10px] font-bold text-primary", children: sortedIdx + 1 })
                    ]
                  }
                ),
                cell.key === "facility" && /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      type: "button",
                      "aria-label": "Sort facilities by",
                      "data-tip": "Sort by name, type, block or PHC",
                      className: "absolute top-1/2 right-2 z-[6] -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      onClick: (e) => e.stopPropagation(),
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "size-3.5", "aria-hidden": true })
                    }
                  ) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "start", className: "w-44", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuLabel, { children: "Sort by" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, {}),
                    [
                      ["facility", "Name"],
                      ["type", "Facility Type"],
                      ["block", "Block"],
                      ["phc", "PHC"]
                    ].map(([key, label]) => {
                      const active = sorting.find((s) => s.id === key);
                      return /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onSelect: () => onSort(key), children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1", children: label }),
                        active ? active.desc ? /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDown, { className: "size-3 text-primary" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUp, { className: "size-3 text-primary" }) : null
                      ] }, key);
                    })
                  ] })
                ] }),
                !isAction && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    onPointerDown: onResizeStart(cell.key),
                    onDoubleClick: () => onResizeReset(cell.key),
                    role: "separator",
                    "aria-orientation": "vertical",
                    "aria-label": `Resize ${cell.column?.label ?? cell.label}`,
                    className: "absolute top-0 right-0 h-full w-1.5 cursor-col-resize touch-none select-none after:absolute after:top-1/2 after:left-1/2 after:h-4 after:w-px after:-translate-x-1/2 after:-translate-y-1/2 after:bg-border after:transition-colors hover:after:bg-primary"
                  }
                )
              ]
            },
            cell.key
          );
        })
      }
    )
  ] });
}
function GroupedMasterTable({
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
  hideToolbar = false
}) {
  const localScrollRef = reactExports.useRef(null);
  const scrollContainer = scrollRef ?? localScrollRef;
  const [scrolledX, setScrolledX] = reactExports.useState(false);
  const [widthOverrides, setWidthOverrides] = reactExports.useState(
    () => loadColumnWidths(widthsStorageKey)
  );
  reactExports.useEffect(() => {
    saveColumnWidths(widthsStorageKey, widthOverrides);
  }, [widthsStorageKey, widthOverrides]);
  const dupes = reactExports.useMemo(() => duplicateNames(rows), [rows]);
  const sortedRows = reactExports.useMemo(() => sortMasterRows(rows, sorting), [rows, sorting]);
  const facilityStyle = useFacilityStyle();
  const effectiveView = reactExports.useMemo(
    () => facilityStyle === "oneLine" && view.density !== "compact" ? { ...view, density: "compact" } : view,
    [facilityStyle, view]
  );
  const grid = reactExports.useMemo(
    () => buildMasterGrid(effectiveView, {
      widthOverrides,
      pinnedKeys,
      freezeActive,
      actions: {
        visible: rowActions?.visible,
        pinRight: rowActions?.pinRight,
        width: edit ? EDIT_ROW_ACTIONS_WIDTH : ROW_ACTIONS_WIDTH
      }
    }),
    [widthOverrides, effectiveView, pinnedKeys, freezeActive, rowActions?.visible, rowActions?.pinRight, edit]
  );
  const { cells } = grid;
  const frozenWidth = reactExports.useMemo(() => frozenZoneWidth(grid), [grid]);
  const glassWrapperRef = reactExports.useRef(null);
  const [stickyOffset, setStickyOffset] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (fillHeight) return;
    const el = glassWrapperRef.current;
    if (!el || typeof window === "undefined" || typeof ResizeObserver !== "function") return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const next = Math.max(
        120,
        Math.round(el.getBoundingClientRect().top + window.scrollY)
      );
      setStickyOffset((prev) => prev === next ? prev : next);
    };
    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(measure);
    };
    measure();
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    window.addEventListener("resize", schedule);
    const shell = el.closest(".app-shell");
    const onTransitionEnd = (event) => {
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
    overscan: 14
  });
  reactExports.useEffect(() => {
    rowVirtualizer.measure();
  }, [grid.rowHeight, grid.template, rowVirtualizer]);
  const virtualRows = rowVirtualizer.getVirtualItems();
  const startResize = (key) => (event) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = cells.find((c) => c.key === key)?.widthPx ?? 120;
    const onMove = (move) => {
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
  if (rows.length === 0) return /* @__PURE__ */ jsxRuntimeExports.jsx(NoRows, { total: totalRowCount, onClear: onClearFilters });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      ref: glassWrapperRef,
      className: cn(
        "glass overflow-hidden rounded-xl border border-border/60",
        fillHeight && "flex h-full min-h-0 flex-col"
      ),
      children: [
        onToggleGroup && (view.collapsedGroups ?? []).length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 flex-wrap items-center gap-1.5 border-b border-border/60 bg-muted/30 px-3 py-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] font-medium text-muted-foreground", children: "Collapsed" }),
          view.collapsedGroups.map((id) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => onToggleGroup(id),
              className: "inline-flex min-h-7 items-center gap-1 rounded-full border border-border/70 bg-background px-2.5 text-[11px] font-medium transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "size-3 -rotate-90", "aria-hidden": true }),
                GROUP_BY_ID[id]?.shortLabel ?? id
              ]
            },
            id
          ))
        ] }),
        !hideToolbar && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-muted-foreground", role: "status", children: [
            "Showing",
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-foreground", children: rows.length.toLocaleString("en-IN") }),
            " ",
            "of ",
            totalRowCount.toLocaleString("en-IN"),
            " facilities",
            sorting.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-2 text-xs", children: [
              "sorted by",
              " ",
              sorting.map((s, i) => `${i + 1}. ${labels[s.id] ?? s.id} ${s.desc ? "↓" : "↑"}`).join(", ")
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
            onDensityChange && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: "flex gap-0.5 rounded-lg border border-border/60 p-0.5",
                role: "group",
                "aria-label": "Row density",
                children: ["compact", "comfortable"].map((d) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    onClick: () => onDensityChange(d),
                    "aria-pressed": view.density === d,
                    "data-tip": `${d === "compact" ? "Compact" : "Comfortable"} rows`,
                    className: cn(
                      "flex min-h-8 items-center gap-1 rounded-md px-2 text-xs font-medium capitalize transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      view.density === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                    ),
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Rows3, { className: "size-3.5", "aria-hidden": true }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden sm:inline", children: d })
                    ]
                  },
                  d
                ))
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "outline", className: "h-9", onClick: onColumnsClick, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Settings2, { className: "mr-1.5 size-4" }),
              " Columns",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1.5 rounded-full bg-muted px-1.5 text-xs tabular-nums", children: grid.dataColumnCount })
            ] }),
            freezeToggle && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: () => freezeToggle.onChange(!freezeToggle.on),
                "aria-pressed": freezeToggle.on,
                "data-tip": freezeToggle.on ? "Column freezing is on" : "Column freezing is off",
                className: cn(
                  "flex h-9 items-center gap-1.5 rounded-lg border border-border/60 px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  freezeToggle.on ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                ),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(PanelLeft, { className: "size-3.5", "aria-hidden": true }),
                  " Freeze columns"
                ]
              }
            ),
            highlightToggle && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: () => highlightToggle.onChange(!highlightToggle.on),
                "aria-pressed": highlightToggle.on,
                "data-tip": highlightToggle.on ? "Recently-updated highlighting is on" : "Recently-updated highlighting is off",
                className: cn(
                  "flex h-9 items-center gap-1.5 rounded-lg border border-border/60 px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  highlightToggle.on ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "text-muted-foreground hover:bg-muted"
                ),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "size-3.5", "aria-hidden": true }),
                  " Highlight updates"
                ]
              }
            )
          ] })
        ] }),
        recentLegend && recentOn && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex shrink-0 items-center gap-1.5 border-b border-border/40 px-3 py-1 text-[11px] text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "aria-hidden": true, className: "inline-block size-2.5 rounded-sm bg-amber-200 dark:bg-amber-500/30 border border-amber-300" }),
          recentLegend
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            ref: scrollContainer,
            "data-printable": "master-table",
            onScroll: (e) => {
              const next = e.target.scrollLeft > 2;
              setScrolledX((prev) => prev === next ? prev : next);
            },
            className: cn(
              "relative overflow-auto",
              fillHeight && "min-h-0 flex-1 overscroll-contain"
            ),
            style: {
              // PageShell: fill the remaining body height. Standalone: one bounded
              // scroll container below the measured sticky chrome, floor 320px.
              ...fillHeight ? { flex: "1 1 auto", maxHeight: "none", minHeight: 0 } : {
                maxHeight: stickyOffset != null ? `calc(100dvh - ${stickyOffset}px)` : "calc(100vh - 252px)",
                minHeight: "320px"
              },
              // Keyboard contract: a cell scrolled/focused into view parks to the
              // RIGHT of the frozen zone and BELOW the frozen band+header rows.
              scrollPaddingTop: `${BAND_HEIGHT + HEADER_HEIGHT}px`,
              ...frozenWidth > 0 ? { scrollPaddingLeft: `${frozenWidth}px` } : {},
              // Focused cells never park beneath the right-pinned column.
              ...grid.actionsCell ? { scrollPaddingRight: `${grid.actionsCell.widthPx}px` } : {}
            },
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-testid": "master-scroll-inner", style: { minWidth: grid.totalWidth }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                MasterGridHead,
                {
                  grid,
                  sorting,
                  labels,
                  onSort: (key) => onSortingChange(cycleSort(sorting, key)),
                  onResizeStart: startResize,
                  onResizeReset: (key) => setWidthOverrides((prev) => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                  }),
                  scrolledX,
                  lockReasons: edit?.readOnlyReasons ?? {},
                  onToggleGroup
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: "mg-body",
                  style: { height: rowVirtualizer.getTotalSize() },
                  "data-testid": "master-body",
                  children: virtualRows.map((vr) => {
                    const row = sortedRows[vr.index];
                    if (!row) return null;
                    return /* @__PURE__ */ jsxRuntimeExports.jsx(
                      MasterGridRow,
                      {
                        index: vr.index,
                        row,
                        cells,
                        gridTemplate: grid.template,
                        totalWidth: grid.totalWidth,
                        top: vr.start,
                        rowHeight: grid.rowHeight,
                        density: effectiveView.density,
                        dupes,
                        searchQuery,
                        zebra: false,
                        selected: selectedRowId === String(row.facility._id),
                        scrolledX,
                        recent: recentOn ? recentByFacility?.[String(row.facility._id)] ?? void 0 : void 0,
                        edit,
                        rowActions,
                        showNin: !cells.some((c) => c.key === "nin"),
                        onOpen: () => onOpenRow(row),
                        onEdit: onEditRow ? () => onEditRow(row) : void 0
                      },
                      row.facility._id
                    );
                  })
                }
              )
            ] })
          }
        )
      ]
    }
  );
}
function MasterGridRow({
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
  onEdit
}) {
  const lastSticky = lastStickyCell(cells);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      "data-testid": "master-row",
      "data-row-index": index,
      onClick: onOpen,
      onKeyDown: (e) => {
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
        if (e.shiftKey && e.key === "F10" || e.key === "ContextMenu") {
          const more = e.currentTarget.querySelector(
            "[data-more-actions]"
          );
          if (more) {
            e.preventDefault();
            e.stopPropagation();
            more.click();
          }
        }
      },
      "data-zebra": zebra ? "1" : "0",
      "data-selected": selected || edit?.activeCell?.rowId === String(row.facility._id) ? "1" : void 0,
      "data-recent-row": recent && Object.keys(recent).length > 0 ? "1" : void 0,
      style: {
        position: "absolute",
        top,
        left: 0,
        height: rowHeight,
        width: totalWidth,
        display: "grid",
        gridTemplateColumns: gridTemplate
      },
      className: cn(
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
        "mg-data-row cursor-pointer border-b border-border/40 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      ),
      children: cells.map((cell) => {
        const shadow = cell.sticky && scrolledX && lastSticky?.key === cell.key;
        const marker = recent?.[cell.key];
        const isActions = !!cell.pinRight || cell.column?.type === "action";
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            role: "gridcell",
            "data-cell": cell.key,
            "data-align": cell.align,
            ...isActions ? { "data-pin-right": "1" } : {},
            "data-recent": marker ? "1" : void 0,
            "data-tip": marker ? `Updated ${toDisplayDateTime(marker.at)} · ${marker.source ?? "Manual edit"}${marker.by ? ` · by ${marker.by}` : ""}${marker.was ? ` · was: ${marker.was}` : ""}` : void 0,
            style: {
              left: cell.sticky ? cell.left : void 0,
              // RIGHT pin (the row-actions column): sticky against the edge.
              right: cell.pinRight ? 0 : void 0,
              position: cell.sticky || cell.pinRight ? "sticky" : void 0
              // Appearance contract: NO width/height ever changes — the tint
              // is a background, the dot is absolutely positioned (overlap),
              // so the header/body alignment contract keeps passing.
            },
            className: cn(
              "mg-cell mg-row-cell relative flex min-w-0 items-center overflow-hidden border-r border-border/30 px-3",
              // Pinned cells use the SAME --row-bg as every other cell: zebra,
              // hover, selected and recently-updated states stay in sync.
              (cell.sticky || cell.pinRight) && "mg-pin",
              cell.key === "nin" && "tabular-nums",
              shadow && "shadow-[6px_0_10px_-6px_rgba(0,0,0,0.25)]",
              // The right pin casts a LEFT-edge shadow while scrolling.
              cell.pinRight && scrolledX && "shadow-[-6px_0_10px_-6px_rgba(0,0,0,0.25)]"
            ),
            onClick: isActions ? (e) => e.stopPropagation() : void 0,
            children: isActions ? edit && edit.renderActionCell ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-full w-full items-center", children: edit.renderActionCell(row) }) : rowActions ? /* @__PURE__ */ jsxRuntimeExports.jsx(RowActionsCell, { row, ...rowActions }) : null : edit && cell.kind === "data" && cell.column?.type !== "action" && !cell.pinRight ? (() => {
              const rowId = String(row.facility._id);
              const isActive = edit.activeCell?.rowId === rowId && edit.activeCell?.key === cell.key;
              return /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  "data-edit-cell": cell.key,
                  "data-edit-active": isActive ? "1" : void 0,
                  tabIndex: 0,
                  ref: (el) => {
                    if (!el || !isActive) return;
                    window.setTimeout(() => {
                      const target = el.querySelector(
                        "input, select, textarea, button"
                      );
                      try {
                        (target ?? el).focus({ preventScroll: true });
                      } catch {
                        el.focus();
                      }
                    }, 0);
                  },
                  className: cn(
                    "flex h-full w-full min-w-0 items-center overflow-hidden outline-none",
                    // the ONE active cell carries the editor — never grows the
                    // row and never paints a different background; the ring
                    // is the only selection signal so the whole row stays one
                    // colour in edit mode too.
                    isActive && "ring-1 ring-inset ring-ring/70"
                  ),
                  onClick: (e) => {
                    e.stopPropagation();
                    if (!isActive) edit.onActivate?.({ rowId, key: cell.key });
                  },
                  onDoubleClick: (e) => {
                    e.stopPropagation();
                    if (!isActive) edit.onActivate?.({ rowId, key: cell.key });
                  },
                  onKeyDown: (e) => {
                    const onWrapper = e.target === e.currentTarget;
                    if (e.key === "Escape") {
                      e.stopPropagation();
                      edit.onActivate?.(null);
                    } else if ((e.key === "Enter" || e.key === "F2") && onWrapper) {
                      e.preventDefault();
                      e.stopPropagation();
                      edit.onActivate?.(isActive ? null : { rowId, key: cell.key });
                    }
                  },
                  children: (isActive ? edit.renderEditableCell(row, cell.key) : null) ?? /* @__PURE__ */ jsxRuntimeExports.jsx(
                    SmartCell,
                    {
                      row,
                      column: cell.column,
                      dupes,
                      density,
                      oneLine: true
                    }
                  )
                }
              );
            })() : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              marker && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  "aria-hidden": true,
                  "data-recent-dot": "1",
                  className: "absolute top-1 right-1 size-1.5 rounded-full bg-amber-500"
                }
              ),
              marker && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sr-only", children: "Updated" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: "flex h-full w-full min-w-0 items-center overflow-hidden",
                  style: { justifyContent: JUSTIFY_FOR[cell.align] },
                  children: cell.column && cell.column.type === "action" ? onEdit ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Button,
                    {
                      size: "sm",
                      variant: "outline",
                      className: "h-7 shrink-0",
                      onClick: (e) => {
                        e.stopPropagation();
                        onEdit();
                      },
                      children: "Edit"
                    }
                  ) : null : cell.key === "facility" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                    FacilityCell,
                    {
                      facility: row.facility,
                      query: searchQuery,
                      compact: density === "compact",
                      showNin,
                      onOpen
                    }
                  ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                    SmartCell,
                    {
                      row,
                      column: cell.column,
                      dupes,
                      density,
                      oneLine: density === "compact" || cell.column?.type !== "longtext"
                    }
                  )
                }
              )
            ] })
          },
          cell.key
        );
      })
    }
  );
}

function ColumnManager({
  open,
  onOpenChange,
  labels,
  view,
  onChange,
  pinnedKeys = []
}) {
  const isFrozen = (key) => pinnedKeys.includes(key);
  const facilityStyle = useFacilityStyle();
  const updateProfile = useMutation(api.profile.updateMyProfile);
  const [dragKey, setDragKey] = reactExports.useState(null);
  const [dropKey, setDropKey] = reactExports.useState(null);
  const visible = new Set(view.visibleKeys);
  const columns = orderedVisibleColumns(view, pinnedKeys);
  const setVisible = (key, on) => {
    if (isFrozen(key)) return;
    const next = on ? [...view.visibleKeys, key] : view.visibleKeys.filter((k) => k !== key);
    onChange({ ...view, presetId: CUSTOM_PRESET_ID, visibleKeys: next });
  };
  const chooseFacilityStyle = (next) => {
    setFacilityStyle(next);
    void updateProfile({ preferences: { facilityStyle: next } }).catch(() => void 0);
    if (next === "oneLine" && view.density !== "compact")
      onChange({ ...view, density: "compact" });
    if (next === "twoLine" && view.density === "compact")
      onChange({ ...view, density: "comfortable" });
  };
  const setGroup = (groupIds, on) => {
    const groupKeys = columnsMenuColumns().filter((c) => groupIds.includes(c.group)).map((c) => c.key);
    const next = on ? [.../* @__PURE__ */ new Set([...view.visibleKeys, ...groupKeys])] : view.visibleKeys.filter((k) => !groupKeys.includes(k) || isFrozen(k));
    onChange({ ...view, presetId: CUSTOM_PRESET_ID, visibleKeys: next });
  };
  const drop = (targetKey) => {
    if (!dragKey || dragKey === targetKey || isFrozen(dragKey) || isFrozen(targetKey)) return;
    const order = columns.map((c) => c.key).filter((k) => !isFrozen(k));
    const from = order.indexOf(dragKey);
    const to = order.indexOf(targetKey);
    if (from === -1 || to === -1) return;
    onChange(moveColumn({ ...view, presetId: CUSTOM_PRESET_ID }, dragKey, to, pinnedKeys));
    setDragKey(null);
    setDropKey(null);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "glass-strong flex max-h-[85vh] flex-col sm:max-w-2xl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Columns3, { className: "size-4" }),
        " Columns"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "Tick a group to show or hide it in one click, drag rows to reorder, or start from a preset. Your choice is remembered on this device." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-0 flex-1 space-y-4 overflow-y-auto pr-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1.5", children: COLUMN_PRESETS.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          size: "sm",
          variant: view.presetId === p.id ? "default" : "outline",
          className: "h-9",
          onClick: () => onChange(applyPreset(p.id, pinnedKeys)),
          children: p.label
        },
        p.id
      )) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between rounded-xl border border-border/60 p-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-2 text-sm font-medium", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Rows3, { className: "size-4" }),
          " Row density"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex gap-1 rounded-lg border border-border/60 p-1", children: ["comfortable", "compact"].map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: () => onChange({ ...view, density: d }),
            "aria-pressed": view.density === d,
            className: cn(
              "min-h-9 rounded-md px-3 text-sm font-medium capitalize transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              view.density === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            ),
            children: d
          },
          d
        )) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 p-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex items-center gap-2 text-sm font-medium", children: "Facility cell" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 grid gap-1 sm:grid-cols-3", children: FACILITY_STYLE_OPTIONS.map((option) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => chooseFacilityStyle(option.value),
            "aria-pressed": facilityStyle === option.value,
            className: cn(
              "min-h-12 rounded-lg border px-2 py-1.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              facilityStyle === option.value ? "border-primary/60 bg-primary/10" : "border-border/60 hover:bg-muted"
            ),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-xs font-semibold", children: option.label }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[11px] text-muted-foreground", children: option.hint })
            ]
          },
          option.value
        )) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1.5 text-[11px] text-muted-foreground", children: "Compact rows always use One line. The State Admin sets the default." })
      ] }),
      MASTER_GROUPS.map((group) => {
        const groupColumns = columnsMenuColumns().filter((c) => c.group === group.id);
        const visibleInGroup = groupColumns.filter((c) => visible.has(c.key)).length;
        const isPinnedGroup = group.id === "identity";
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-xl border border-border/60", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "label",
            {
              className: cn(
                "flex min-h-12 items-center gap-3 rounded-t-xl px-3 py-2",
                group.tint.bg
              ),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Checkbox,
                  {
                    checked: isPinnedGroup ? true : visibleInGroup === groupColumns.length ? true : visibleInGroup === 0 ? false : "indeterminate",
                    disabled: isPinnedGroup,
                    onCheckedChange: (v) => setGroup([group.id], v === true),
                    "aria-label": `Show or hide the ${group.label} group`
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0 flex-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("block text-sm font-semibold", group.tint.text), children: group.label }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "block text-xs text-muted-foreground", children: [
                    visibleInGroup,
                    " of ",
                    groupColumns.length,
                    " columns shown"
                  ] })
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "divide-y divide-border/50", children: groupColumns.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "li",
            {
              draggable: !isFrozen(c.key),
              onDragStart: () => setDragKey(c.key),
              onDragOver: (e) => {
                e.preventDefault();
                setDropKey(c.key);
              },
              onDragEnd: () => {
                setDragKey(null);
                setDropKey(null);
              },
              onDrop: (e) => {
                e.preventDefault();
                drop(c.key);
              },
              className: cn(
                "flex min-h-11 items-center gap-2 px-3 py-1.5 transition-colors",
                dropKey === c.key && dragKey !== c.key && "bg-primary/10",
                !isFrozen(c.key) && "cursor-grab"
              ),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  GripVertical,
                  {
                    className: "size-3.5 shrink-0 text-muted-foreground/60",
                    "aria-hidden": true
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Checkbox,
                  {
                    checked: visible.has(c.key),
                    disabled: isFrozen(c.key),
                    onCheckedChange: (v) => setVisible(c.key, v === true),
                    id: `col-${c.key}`,
                    "aria-label": `Show ${labels[c.key] ?? c.label}`
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Label,
                  {
                    htmlFor: `col-${c.key}`,
                    className: cn(
                      "min-w-0 flex-1 truncate text-sm font-normal",
                      !isFrozen(c.key) && "cursor-pointer"
                    ),
                    children: [
                      labels[c.key] ?? c.label,
                      isFrozen(c.key) && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        "span",
                        {
                          className: "ml-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground",
                          "data-tip": "Frozen by admin",
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(Pin, { className: "size-3", "aria-hidden": true }),
                            " frozen"
                          ]
                        }
                      )
                    ]
                  }
                ),
                !isFrozen(c.key) && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex shrink-0 items-center gap-0.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Button,
                    {
                      type: "button",
                      variant: "ghost",
                      size: "icon",
                      className: "size-8",
                      "aria-label": `Move ${labels[c.key] ?? c.label} up`,
                      onClick: () => {
                        const order = columns.map((x) => x.key).filter((k) => !isFrozen(k));
                        onChange(
                          moveColumn(
                            { ...view, presetId: CUSTOM_PRESET_ID },
                            c.key,
                            order.indexOf(c.key) - 1,
                            pinnedKeys
                          )
                        );
                      },
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUp, { className: "size-3.5" })
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Button,
                    {
                      type: "button",
                      variant: "ghost",
                      size: "icon",
                      className: "size-8",
                      "aria-label": `Move ${labels[c.key] ?? c.label} down`,
                      onClick: () => {
                        const order = columns.map((x) => x.key).filter((k) => !isFrozen(k));
                        onChange(
                          moveColumn(
                            { ...view, presetId: CUSTOM_PRESET_ID },
                            c.key,
                            order.indexOf(c.key) + 1,
                            pinnedKeys
                          )
                        );
                      },
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDown, { className: "size-3.5" })
                    }
                  )
                ] })
              ]
            },
            c.key
          )) })
        ] }, group.id);
      })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { className: "gap-2 sm:justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "ghost", onClick: () => onChange({ ...DEFAULT_VIEW }), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { className: "mr-1.5 size-4" }),
        " Reset to default"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: () => onOpenChange(false), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "mr-1.5 size-4" }),
        " Done"
      ] })
    ] })
  ] }) });
}

// src/separator.tsx
var NAME = "Separator";
var DEFAULT_ORIENTATION = "horizontal";
var ORIENTATIONS = ["horizontal", "vertical"];
var Separator$1 = reactExports.forwardRef((props, forwardedRef) => {
  const { decorative, orientation: orientationProp = DEFAULT_ORIENTATION, ...domProps } = props;
  const orientation = isValidOrientation(orientationProp) ? orientationProp : DEFAULT_ORIENTATION;
  const ariaOrientation = orientation === "vertical" ? orientation : void 0;
  const semanticProps = decorative ? { role: "none" } : { "aria-orientation": ariaOrientation, role: "separator" };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Primitive.div,
    {
      "data-orientation": orientation,
      ...semanticProps,
      ...domProps,
      ref: forwardedRef
    }
  );
});
Separator$1.displayName = NAME;
function isValidOrientation(orientation) {
  return ORIENTATIONS.includes(orientation);
}
var Root = Separator$1;

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Root,
    {
      "data-slot": "separator",
      decorative,
      orientation,
      className: cn(
        "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className
      ),
      ...props
    }
  );
}

function ExportDialog({
  open,
  onOpenChange,
  counts,
  visibleColumns,
  filtersText,
  onRun,
  /** True when highlighting is available (Admin days > 0 ∧ user toggle). */
  hasRecentUpdates = false,
  /** The legend text offered with the marks. */
  recentLegend
}) {
  const [scope, setScope] = reactExports.useState("filtered");
  const [choice, setChoice] = reactExports.useState("visible");
  const [groups, setGroups] = reactExports.useState(
    MASTER_GROUPS.map((g) => g.id)
  );
  const [paper, setPaper] = reactExports.useState("a4");
  const [orientation, setOrientation] = reactExports.useState("landscape");
  const [splitByGroup, setSplitByGroup] = reactExports.useState(true);
  const [extras, setExtras] = reactExports.useState({
    surveillanceDue: false,
    fireNocAlerts: false,
    gapClosure: false
  });
  const [markRecent, setMarkRecent] = reactExports.useState(false);
  const columns = reactExports.useMemo(() => {
    if (choice === "visible") return visibleColumns;
    if (choice === "all") return fullExportColumns();
    return fullExportColumns().filter(
      (c) => c.group === "identity" || groups.includes(c.group)
    );
  }, [choice, visibleColumns, groups]);
  const exportable = columns.filter((c) => c.exportable && c.type !== "action");
  const preview = reactExports.useMemo(
    () => pdfSections(exportable, paper, splitByGroup)[0],
    [exportable, paper, splitByGroup]
  );
  const run = (f) => {
    onRun({
      format: f,
      scope,
      columns,
      pdf: { paper, orientation, splitByGroup },
      extras,
      markRecent: hasRecentUpdates && markRecent,
      filtersText
    });
    onOpenChange(false);
  };
  const scopeCount = scope === "all" ? counts.all : counts.filtered;
  const Option = ({
    id,
    title,
    hint,
    children
  }) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 p-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: id, className: "text-sm font-semibold", children: title }),
    hint && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-xs text-muted-foreground", children: hint }),
    children && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2", children })
  ] });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "glass-strong flex max-h-[90vh] flex-col sm:max-w-2xl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FileDown, { className: "size-4" }),
        " Export facility data"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "Everything you see on screen — same columns, same colours, same order." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-0 flex-1 space-y-3 overflow-y-auto pr-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Option, { id: "scope", title: "Rows to export", hint: `${scopeCount} rows will be written`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        RadioGroup,
        {
          id: "scope",
          value: scope,
          onValueChange: (v) => setScope(v),
          className: "gap-2",
          children: [
            ["filtered", `Current filtered rows (${counts.filtered})`],
            ["all", `All rows (${counts.all})`]
          ].map(([value, label]) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "label",
            {
              className: cn(
                "flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm",
                scope === value ? "border-primary/50 bg-primary/5" : "border-border/60"
              ),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(RadioGroupItem, { value }),
                label
              ]
            },
            value
          ))
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Option, { id: "cols", title: "Columns", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          RadioGroup,
          {
            id: "cols",
            value: choice,
            onValueChange: (v) => setChoice(v),
            className: "gap-2",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "label",
                {
                  className: cn(
                    "flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm",
                    choice === "visible" ? "border-primary/50 bg-primary/5" : "border-border/60"
                  ),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(RadioGroupItem, { value: "visible" }),
                    " Current visible columns (",
                    visibleColumns.filter((c) => c.type !== "action").length,
                    ")"
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "label",
                {
                  className: cn(
                    "flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm",
                    choice === "groups" ? "border-primary/50 bg-primary/5" : "border-border/60"
                  ),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(RadioGroupItem, { value: "groups" }),
                    " Choose groups"
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "label",
                {
                  className: cn(
                    "flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm",
                    choice === "all" ? "border-primary/50 bg-primary/5" : "border-border/60"
                  ),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(RadioGroupItem, { value: "all" }),
                    " Full data — all ",
                    " ",
                    fullExportColumns().length,
                    " columns"
                  ]
                }
              )
            ]
          }
        ),
        choice === "groups" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 grid gap-1.5 sm:grid-cols-2", children: MASTER_GROUPS.map((g) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "label",
          {
            className: "flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-2 text-sm",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Checkbox,
                {
                  checked: groups.includes(g.id),
                  onCheckedChange: (v) => setGroups(
                    (prev) => v === true ? [...prev, g.id] : prev.filter((x) => x !== g.id)
                  )
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: "size-2 shrink-0 rounded-full",
                  style: { background: g.tint.hex }
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: g.label })
            ]
          },
          g.id
        )) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Option, { id: "pdf", title: "PDF options", hint: "Only used for the PDF export", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-1 text-xs font-medium text-muted-foreground", children: "Paper size" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              RadioGroup,
              {
                value: paper,
                onValueChange: (v) => setPaper(v),
                className: "gap-1",
                children: ["a4", "a3", "legal"].map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "label",
                  {
                    className: "flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-2 text-sm uppercase",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(RadioGroupItem, { value: p }),
                      " ",
                      p
                    ]
                  },
                  p
                ))
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-1 text-xs font-medium text-muted-foreground", children: "Orientation" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              RadioGroup,
              {
                value: orientation,
                onValueChange: (v) => setOrientation(v),
                className: "gap-1",
                children: ["landscape", "portrait"].map((o) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "label",
                  {
                    className: "flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-2 text-sm capitalize",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(RadioGroupItem, { value: o }),
                      " ",
                      o
                    ]
                  },
                  o
                ))
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "mt-2 flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-3 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Checkbox,
            {
              checked: splitByGroup,
              onCheckedChange: (v) => setSplitByGroup(v === true)
            }
          ),
          "Split wide tables into multiple page-sets by group (recommended)"
        ] })
      ] }),
      hasRecentUpdates && recentLegend && /* @__PURE__ */ jsxRuntimeExports.jsx(
        Option,
        {
          id: "mark-recent",
          title: "Mark recently updated cells",
          hint: `${recentLegend} — a light fill in Excel/PDF plus a legend line in the report header. No extra column.`,
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex min-h-9 cursor-pointer items-center gap-2 text-sm", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Checkbox, { checked: markRecent, onCheckedChange: (v) => setMarkRecent(v === true) }),
            "Mark recently updated cells in this export"
          ] })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Option, { id: "extras", title: "Extra Excel sheets", hint: "Optional, built from the same rows", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-1.5 sm:grid-cols-3", children: [
        ["surveillanceDue", "Surveillance Due"],
        ["fireNocAlerts", "Fire NOC Alerts"],
        ["gapClosure", "Gap Closure"]
      ].map(([key, label]) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "label",
        {
          className: "flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-2 text-sm",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Checkbox,
              {
                checked: extras[key],
                onCheckedChange: (v) => setExtras((e) => ({ ...e, [key]: v === true }))
              }
            ),
            label
          ]
        },
        key
      )) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-muted/20 p-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold tracking-wide text-muted-foreground uppercase", children: "Preview — first page-set" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 overflow-x-auto rounded-lg border border-border/60 bg-background p-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-1 text-[11px] font-bold text-primary", children: "NQAS Tracker – Facility Master List" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mb-1 text-[10px] text-muted-foreground", children: [
            preview?.title ?? "—",
            " · ",
            preview?.columns.length ?? 0,
            " columns"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "text-[10px]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: preview?.columns.slice(0, 8).map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              "th",
              {
                className: "border border-border/60 bg-primary/90 px-1 py-0.5 text-left font-semibold text-white",
                children: c.label
              },
              c.key
            )) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: preview?.columns.slice(0, 8).map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              "td",
              {
                className: cn(
                  "border border-border/60 px-1 py-0.5",
                  c.align === "right" && "text-right",
                  c.align === "center" && "text-center"
                ),
                children: c.type === "status" ? "[pill]" : c.type === "score" ? "78.5%" : "—"
              },
              c.key
            )) }) })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Separator, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { className: "gap-2 sm:justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-muted-foreground", children: [
        scopeCount,
        " rows · ",
        exportable.length,
        " columns"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", className: "h-10", onClick: () => run("print"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Printer, { className: "mr-1.5 size-4" }),
          " Print"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", className: "h-10", onClick: () => run("csv"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FileDown, { className: "mr-1.5 size-4" }),
          " CSV"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", className: "h-10", onClick: () => run("pdf"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FileTypeCorner, { className: "mr-1.5 size-4" }),
          " PDF"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { className: "h-10", onClick: () => run("xlsx"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "mr-1.5 size-4" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "size-4" }),
          " Excel"
        ] })
      ] })
    ] })
  ] }) });
}

export { ColumnManager as C, ExportDialog as E, GroupedMasterTable as G, RowActionsCell as R, Separator as S, focusLastRowActionTrigger as f };
