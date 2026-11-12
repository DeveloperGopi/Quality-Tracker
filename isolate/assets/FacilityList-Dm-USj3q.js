import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { P as FunnelX, a3 as X, w as RotateCcw, r as reactExports, z as ChevronRight, a7 as Pencil, e as Eye, ac as Ellipsis, E as ExternalLink, X as History, a4 as Printer, N as CalendarClock, aa as SlidersHorizontal, H as ChevronDown, bQ as Rows3, x as Columns3, bi as PanelLeft, m as Check, a6 as Sparkles, bR as PencilLine, F as FileSpreadsheet, u as FileText, Z as Upload, bS as Maximize2, bT as Minimize2, I as Info, Y as Plus, L as LoaderCircle } from './icons-BxQpodNr.js';
import { c as cn, B as Button, r as useLocation, b as useNavigate, q as useComposedRefs, l as useQuery, j as api, u as useAuth, m as useMutation, d as useSearchParams, t as toast } from './index-CBV6wOh8.js';
import { bE as useControllableState, bx as composeEventHandlers, bI as createCollection, bD as useDirection, cE as useSize, bG as usePrevious, bO as createContextScope, c0 as stageOf, cd as cellValue, u as useCycleScope, ap as fullExportColumns, D as DEFAULT_SETTINGS, bm as readRowActionsSetting, w as withLegacyIa, v as buildIaMasterIndex, x as iaPairFor, cF as allIaPeriods, y as withIaPeriodLabels, z as resolveLabels, M as MASTER_COLUMNS, aV as normalizeDocumentRules, j as normalizePendingConfig, cG as attachIaExtras, c4 as requiredDocumentsMissing, ae as REPORT_STATUS_VALUES, A as AppShell, c as CycleFilter, Q as FACILITY_CURRENT_STATUS_LABEL, e as Popover, f as PopoverTrigger, g as PopoverContent, ax as formatFyQuarter, cH as COLUMN_PRESETS, aH as toDisplayStamp, cI as openPrintSheet, k as cellText, cJ as withExportEssentials } from './AppShell-CP099uvN.js';
import { S as StatusBadge } from './StatusBadge-BPGGn135.js';
import { r as rowPasses, U as UniversalFilterBar } from './UniversalFilterBar-uuD2kW1Y.js';
import { I as Input } from './input-Cy2oZLur.js';
import { P as Primitive, L as Label } from './label-BaPkqXdo.js';
import { T as Textarea } from './textarea-Dm9kSFQo.js';
import { D as Dialog, a as DialogContent, b as DialogHeader, c as DialogTitle, d as DialogDescription, e as DialogFooter } from './dialog-BW3GEiPg.js';
import { A as AlertDialog, a as AlertDialogContent, b as AlertDialogHeader, c as AlertDialogTitle, d as AlertDialogDescription, e as AlertDialogFooter, f as AlertDialogCancel, g as AlertDialogAction } from './alert-dialog-CzPxJ0pO.js';
import { e as clamp, S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from './select-qTILnHQg.js';
import { D as DropdownMenu, a as DropdownMenuTrigger, b as DropdownMenuContent, c as DropdownMenuLabel, g as DropdownMenuSeparator, f as DropdownMenuItem } from './dropdown-menu-N0nU9bdA.js';
import { a as applyMasterFilters, b as buildEligibilityOptions, l as latestUpdatedAt, f as foldStatus, N as NO_CYCLE, k as kpiMatches, K as KPI_LABELS, M as METRIC_LABELS, L as LAST_CHANGE_SOURCE_LABEL } from './masterFilter-DrauVhuN.js';
import { l as loadRowView, p as parseListFilters, s as saveRowView, a as serializeListFilters, h as hasViewParams, d as defaultRowView, F as FilterDropdown, b as defaultListFilters } from './FilterDropdown-B_vJKp6C.js';
import { c as countActiveFilters, a as FilterSearch } from './filters-BlRAASYu.js';
import { t as todayLocalIso } from './today-D9v8Esj5.js';
import { l as loadMasterView, n as normalizeView, s as saveMasterView, a as applyPreset, o as orderedVisibleColumns, D as DEFAULT_VIEW } from './masterGrid-CjX4ti61.js';
import { G as GroupedMasterTable, R as RowActionsCell, C as ColumnManager, E as ExportDialog, f as focusLastRowActionTrigger } from './ExportDialog-Dhw8AWo1.js';
import { S as StatusPill, a as ScoreBar, D as DateCell, E as EMPTY_TEXT, u as useRowDrafts, b as trackerEditorOptions, i as isEditableCellKey, r as readOnlyCellReason, c as SkeletonRows, d as EditableUpdateCell, e as EditableTrackerCell, F as FacilityQuickView, t as trackerUpdatePayload } from './FacilityQuickView-D07vvNqK.js';
import { r as readDisplaySettings, l as loadBoolPref, s as saveBoolPref, F as FREEZE_PREF_KEY, H as HIGHLIGHT_PREF_KEY } from './tableDisplay-Bmg1sKyc.js';
import { l as loadQuickViewDraft } from './facilityQuickView-BCxVjMPj.js';
import { B as Badge } from './badge-Cc2gQHFR.js';
import { F as FacilityCell } from './FacilityCell-CI45DpPw.js';
import { P as PageShell } from './PageShell-CaOvGLdi.js';
import { e as exportMasterWorkbook, a as exportMasterPdf, b as exportMasterCsv } from './masterExport-Dlb4N-po.js';
import { e as exportFacilitiesBulkProfile, t as trackerRowsToBulkRows } from './profileExport-Da96eYWE.js';

function RestoredNotice({
  from,
  onDismiss
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "span",
    {
      "data-testid": "filters-restored",
      className: "inline-flex min-h-8 items-center gap-1.5 rounded-full border border-sky-300/70 bg-sky-500/10 pr-1 pl-3 text-xs font-medium text-sky-900 dark:border-sky-400/40 dark:text-sky-100",
      children: [
        from === "url" ? "Filters restored from this link" : "Filters restored from your last visit",
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            "aria-label": "Dismiss the restored-filters notice",
            onClick: onDismiss,
            className: "rounded-full p-1.5 transition-colors hover:bg-sky-500/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3" })
          }
        )
      ]
    }
  );
}
function FilterChips({
  chips,
  onClearAll,
  onResetView,
  notice,
  className,
  showResetView = true,
  compact = false
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "data-testid": "filter-chips",
      className: cn(
        "flex flex-wrap items-center",
        compact ? "gap-1.5" : "mb-3 gap-2",
        className
      ),
      children: [
        notice,
        chips.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: cn(
              "font-medium text-muted-foreground",
              compact ? "text-[11px]" : "text-xs"
            ),
            children: "Filters"
          }
        ),
        chips.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "span",
          {
            className: cn(
              "inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 font-medium",
              compact ? "min-h-7 pr-0.5 pl-2.5 text-[11px]" : "min-h-9 pr-1 pl-3 text-xs"
            ),
            children: [
              c.label,
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  "aria-label": `Remove filter ${c.label}`,
                  onClick: c.onRemove,
                  className: cn(
                    "rounded-full transition-colors hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    compact ? "p-1" : "p-1.5"
                  ),
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(FunnelX, { className: "size-3" })
                }
              )
            ]
          },
          c.key
        )),
        chips.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            type: "button",
            variant: "outline",
            size: "sm",
            className: cn(
              "gap-1.5 rounded-full",
              compact ? "h-7 px-2.5 text-[11px]" : "h-9 px-3 text-xs"
            ),
            onClick: onClearAll,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3.5" }),
              compact ? "Clear all" : "Clear all filters"
            ]
          }
        ),
        showResetView && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            type: "button",
            variant: "ghost",
            size: "sm",
            "data-testid": "reset-view",
            className: "ml-auto h-9 gap-1.5 text-xs",
            onClick: onResetView,
            "data-tip": "Clear filters, search, sort and columns — back to the default view",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { className: "size-3.5" }),
              "Reset view"
            ]
          }
        )
      ]
    }
  );
}

const LIST_STORAGE_PREFIX = "nqas.masterlist.v1.";
const LAST_URL_KEY = `${LIST_STORAGE_PREFIX}lastUrl`;
const SCROLL_KEY = (urlKey) => `${LIST_STORAGE_PREFIX}scroll:${urlKey}`;
function readSession(key) {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeSession(key, value) {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch {
  }
}
function saveLastListUrl(url) {
  writeSession(LAST_URL_KEY, url);
}
function loadLastListUrl() {
  return readSession(LAST_URL_KEY);
}
const SEEN_KEY = `${LIST_STORAGE_PREFIX}seen`;
function hasSeenList() {
  return readSession(SEEN_KEY) === "1";
}
function markListSeen() {
  writeSession(SEEN_KEY, "1");
}
function saveListScroll(urlKey, pos) {
  writeSession(SCROLL_KEY(urlKey), JSON.stringify(pos));
}
function loadListScroll(urlKey) {
  const raw = readSession(SCROLL_KEY(urlKey));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const top = Number(parsed.top);
    const left = Number(parsed.left);
    if (!Number.isFinite(top) || !Number.isFinite(left)) return null;
    const windowTop = Number(parsed.windowTop);
    return {
      top: Math.max(0, top),
      left: Math.max(0, left),
      windowTop: Number.isFinite(windowTop) ? Math.max(0, windowTop) : 0
    };
  } catch {
    return null;
  }
}
let rowsSnapshot = null;
const ROWS_SNAPSHOT_TTL_MS = 6e4;
function saveRowsSnapshot(rows) {
  rowsSnapshot = { rows, at: Date.now() };
}
function loadRowsSnapshot(ttlMs = ROWS_SNAPSHOT_TTL_MS) {
  if (!rowsSnapshot) return null;
  if (Date.now() - rowsSnapshot.at > ttlMs) return null;
  return rowsSnapshot.rows;
}

const SEARCH_DEBOUNCE_MS = 150;
function savedUrlHasView(saved) {
  if (!saved) return false;
  const search = saved.includes("?") ? saved.slice(saved.indexOf("?")) : "";
  return hasViewParams(search);
}
function useListUrlState() {
  const location = useLocation();
  const navigate = useNavigate();
  const sizeFallback = reactExports.useMemo(() => loadRowView(), []);
  const filters = reactExports.useMemo(
    () => parseListFilters(location.search, { sizeFallback }),
    [location.search, sizeFallback]
  );
  const filtersRef = reactExports.useRef(filters);
  reactExports.useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);
  const write = reactExports.useCallback(
    (next, replace) => {
      saveRowView(next.size);
      const qs = serializeListFilters(next, { defaultSize: defaultRowView() });
      navigate({ search: qs ? `?${qs}` : "" }, { replace });
    },
    [navigate]
  );
  const patch = reactExports.useCallback(
    (next, opts = {}) => {
      const merged = { ...filtersRef.current, ...next };
      if (!("page" in next)) merged.page = 1;
      write(merged, opts.replace ?? false);
    },
    [write]
  );
  const setAll = reactExports.useCallback(
    (next, opts = {}) => write(next, opts.replace ?? false),
    [write]
  );
  const [searchInput, setSearchInput] = reactExports.useState(() => filters.q);
  const [mirroredQ, setMirroredQ] = reactExports.useState(filters.q);
  const debounce = reactExports.useRef(null);
  if (mirroredQ !== filters.q) {
    setMirroredQ(filters.q);
    setSearchInput(filters.q);
  }
  reactExports.useEffect(
    () => () => {
      if (debounce.current != null) {
        window.clearTimeout(debounce.current);
        debounce.current = null;
      }
    },
    [filters.q]
  );
  const setSearch = reactExports.useCallback(
    (text) => {
      setSearchInput(text);
      if (debounce.current != null) window.clearTimeout(debounce.current);
      debounce.current = window.setTimeout(() => {
        debounce.current = null;
        write({ ...filtersRef.current, q: text.trim(), page: 1 }, true);
      }, SEARCH_DEBOUNCE_MS);
    },
    [write]
  );
  const resetSearch = reactExports.useCallback(() => {
    if (debounce.current != null) {
      window.clearTimeout(debounce.current);
      debounce.current = null;
    }
    setSearchInput("");
    patch({ q: "" }, { replace: true });
  }, [patch]);
  const [savedUrlAtMount] = reactExports.useState(() => loadLastListUrl());
  const [hadViewAtMount] = reactExports.useState(() => hasViewParams(location.search));
  const [seenAtMount] = reactExports.useState(() => hasSeenList());
  const [noticeDismissed, setNoticeDismissed] = reactExports.useState(false);
  const sessionRestore = !hadViewAtMount && savedUrlHasView(savedUrlAtMount);
  reactExports.useEffect(() => {
    markListSeen();
  }, []);
  reactExports.useEffect(() => {
    if (hadViewAtMount || !sessionRestore || !savedUrlAtMount) return;
    navigate(savedUrlAtMount, { replace: true });
  }, [navigate, hadViewAtMount, sessionRestore, savedUrlAtMount]);
  reactExports.useEffect(() => {
    const qs = serializeListFilters(filters, { defaultSize: defaultRowView() });
    saveLastListUrl(qs ? `${location.pathname}?${qs}` : location.pathname);
  }, [location.pathname, filters]);
  const restoredFrom = noticeDismissed ? null : sessionRestore ? "session" : hadViewAtMount && !seenAtMount ? "url" : null;
  const dismissRestored = reactExports.useCallback(() => setNoticeDismissed(true), []);
  return {
    filters,
    searchInput,
    setSearch,
    resetSearch,
    patch,
    setAll,
    restoredFrom,
    dismissRestored,
    urlKey: `${location.pathname}${location.search}`
  };
}

function useScrollRestore(urlKey, ready, container) {
  const restoredKey = reactExports.useRef(null);
  const userScrolled = reactExports.useRef(false);
  const latest = reactExports.useRef(
    (() => {
      const saved = loadListScroll(urlKey);
      return { top: saved?.top ?? 0, left: saved?.left ?? 0, windowTop: saved?.windowTop ?? 0 };
    })()
  );
  reactExports.useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const el2 = container?.current ?? null;
      latest.current = {
        top: el2 ? el2.scrollTop : 0,
        left: el2 ? el2.scrollLeft : 0,
        windowTop: window.scrollY ?? 0
      };
      saveListScroll(urlKey, {
        top: latest.current.top,
        left: latest.current.left,
        windowTop: latest.current.windowTop
      });
    };
    const onScroll = () => {
      userScrolled.current = true;
      if (raf) return;
      raf = window.requestAnimationFrame(read);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    const el = container?.current ?? null;
    el?.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      saveListScroll(urlKey, {
        top: latest.current.top,
        left: latest.current.left,
        windowTop: latest.current.windowTop
      });
      window.removeEventListener("scroll", onScroll);
      el?.removeEventListener("scroll", onScroll);
    };
  }, [urlKey, container]);
  reactExports.useEffect(() => {
    if (!ready || restoredKey.current === urlKey) return;
    restoredKey.current = urlKey;
    userScrolled.current = false;
    const saved = loadListScroll(urlKey);
    if (!saved) return;
    const apply = () => {
      if (userScrolled.current) return;
      const el = container?.current ?? null;
      if (el) {
        el.scrollTop = saved.top;
        el.scrollLeft = saved.left;
      }
      if (saved.windowTop) window.scrollTo({ top: saved.windowTop, left: 0 });
      latest.current = {
        top: saved.top,
        left: saved.left,
        windowTop: saved.windowTop ?? 0
      };
    };
    const raf = window.requestAnimationFrame(apply);
    const timers = [120, 400].map((ms) => window.setTimeout(apply, ms));
    return () => {
      window.cancelAnimationFrame(raf);
      for (const t of timers) window.clearTimeout(t);
    };
  }, [urlKey, ready, container]);
}

const ARG_FOR = {
  block: "blocks",
  type: "types",
  cycle: "cycles",
  eligibility: "eligibility",
  cert: "certStatus",
  status: "status",
  docRep: "docReport",
  btype: "buildingType",
  bstatus: "buildingStatus",
  noc: "nocStatus"
};
function countListOptions(rows, filterArgs, values) {
  const keys = Object.keys(ARG_FOR);
  const out = {};
  for (const key of keys) {
    const counts = /* @__PURE__ */ new Map();
    const arg = ARG_FOR[key];
    for (const value of values[key]) {
      counts.set(value, applyMasterFilters(rows, { ...filterArgs, [arg]: [value] }).length);
    }
    out[key] = counts;
  }
  return out;
}

var PAGE_KEYS = ["PageUp", "PageDown"];
var ARROW_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
var BACK_KEYS = {
  "from-left": ["Home", "PageDown", "ArrowDown", "ArrowLeft"],
  "from-right": ["Home", "PageDown", "ArrowDown", "ArrowRight"],
  "from-bottom": ["Home", "PageDown", "ArrowDown", "ArrowLeft"],
  "from-top": ["Home", "PageDown", "ArrowUp", "ArrowLeft"]
};
var SLIDER_NAME = "Slider";
var [Collection, useCollection, createCollectionScope] = createCollection(SLIDER_NAME);
var [createSliderContext] = createContextScope(SLIDER_NAME, [
  createCollectionScope
]);
var [SliderProvider, useSliderContext] = createSliderContext(SLIDER_NAME);
var Slider$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const {
      name,
      min = 0,
      max = 100,
      step = 1,
      orientation = "horizontal",
      disabled = false,
      minStepsBetweenThumbs = 0,
      defaultValue = [min],
      value,
      onValueChange = () => {
      },
      onValueCommit = () => {
      },
      inverted = false,
      form,
      ...sliderProps
    } = props;
    const thumbRefs = reactExports.useRef(/* @__PURE__ */ new Set());
    const valueIndexToChangeRef = reactExports.useRef(0);
    const isKeyboardInteractionRef = reactExports.useRef(false);
    const isHorizontal = orientation === "horizontal";
    const SliderOrientation = isHorizontal ? SliderHorizontal : SliderVertical;
    const [values = [], setValues] = useControllableState({
      prop: value,
      defaultProp: defaultValue,
      onChange: (value2) => {
        const thumbs = [...thumbRefs.current];
        thumbs[valueIndexToChangeRef.current]?.focus({
          preventScroll: true,
          focusVisible: isKeyboardInteractionRef.current
        });
        isKeyboardInteractionRef.current = false;
        onValueChange(value2);
      }
    });
    const valuesBeforeSlideStartRef = reactExports.useRef(values);
    function handleSlideStart(value2) {
      const closestIndex = getClosestValueIndex(values, value2);
      updateValues(value2, closestIndex);
    }
    function handleSlideMove(value2) {
      updateValues(value2, valueIndexToChangeRef.current);
    }
    function handleSlideEnd() {
      const prevValue = valuesBeforeSlideStartRef.current[valueIndexToChangeRef.current];
      const nextValue = values[valueIndexToChangeRef.current];
      const hasChanged = nextValue !== prevValue;
      if (hasChanged) onValueCommit(values);
    }
    function updateValues(value2, atIndex, { commit } = { commit: false }) {
      const decimalCount = getDecimalCount(step);
      const snapToStep = roundValue(Math.round((value2 - min) / step) * step + min, decimalCount);
      const nextValue = clamp(snapToStep, [min, max]);
      setValues((prevValues = []) => {
        const nextValues = getNextSortedValues(prevValues, nextValue, atIndex);
        if (hasMinStepsBetweenValues(nextValues, minStepsBetweenThumbs * step)) {
          valueIndexToChangeRef.current = nextValues.indexOf(nextValue);
          const hasChanged = String(nextValues) !== String(prevValues);
          if (hasChanged && commit) onValueCommit(nextValues);
          return hasChanged ? nextValues : prevValues;
        } else {
          return prevValues;
        }
      });
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      SliderProvider,
      {
        scope: props.__scopeSlider,
        name,
        disabled,
        min,
        max,
        valueIndexToChangeRef,
        thumbs: thumbRefs.current,
        values,
        orientation,
        form,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Collection.Provider, { scope: props.__scopeSlider, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Collection.Slot, { scope: props.__scopeSlider, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          SliderOrientation,
          {
            "aria-disabled": disabled,
            "data-disabled": disabled ? "" : void 0,
            ...sliderProps,
            ref: forwardedRef,
            onPointerDown: composeEventHandlers(sliderProps.onPointerDown, () => {
              if (!disabled) {
                valuesBeforeSlideStartRef.current = values;
                isKeyboardInteractionRef.current = false;
              }
            }),
            min,
            max,
            inverted,
            onSlideStart: disabled ? void 0 : handleSlideStart,
            onSlideMove: disabled ? void 0 : handleSlideMove,
            onSlideEnd: disabled ? void 0 : handleSlideEnd,
            onHomeKeyDown: () => {
              if (!disabled) {
                isKeyboardInteractionRef.current = true;
                updateValues(min, 0, { commit: true });
              }
            },
            onEndKeyDown: () => {
              if (!disabled) {
                isKeyboardInteractionRef.current = true;
                updateValues(max, values.length - 1, { commit: true });
              }
            },
            onStepKeyDown: ({ event, direction: stepDirection }) => {
              if (!disabled) {
                isKeyboardInteractionRef.current = true;
                const isPageKey = PAGE_KEYS.includes(event.key);
                const isSkipKey = isPageKey || event.shiftKey && ARROW_KEYS.includes(event.key);
                const multiplier = isSkipKey ? 10 : 1;
                const atIndex = valueIndexToChangeRef.current;
                const value2 = values[atIndex];
                const stepInDirection = step * multiplier * stepDirection;
                updateValues(value2 + stepInDirection, atIndex, { commit: true });
              }
            }
          }
        ) }) })
      }
    );
  }
);
Slider$1.displayName = SLIDER_NAME;
var [SliderOrientationProvider, useSliderOrientationContext] = createSliderContext(SLIDER_NAME, {
  startEdge: "left",
  endEdge: "right",
  size: "width",
  direction: 1
});
var SliderHorizontal = reactExports.forwardRef(
  (props, forwardedRef) => {
    const {
      min,
      max,
      dir,
      inverted,
      onSlideStart,
      onSlideMove,
      onSlideEnd,
      onStepKeyDown,
      ...sliderProps
    } = props;
    const [slider, setSlider] = reactExports.useState(null);
    const composedRefs = useComposedRefs(forwardedRef, setSlider);
    const rectRef = reactExports.useRef(void 0);
    const direction = useDirection(dir);
    const isDirectionLTR = direction === "ltr";
    const isSlidingFromLeft = isDirectionLTR && !inverted || !isDirectionLTR && inverted;
    function getValueFromPointer(pointerPosition) {
      const rect = rectRef.current || slider.getBoundingClientRect();
      const input = [0, rect.width];
      const output = isSlidingFromLeft ? [min, max] : [max, min];
      const value = linearScale(input, output);
      rectRef.current = rect;
      return value(pointerPosition - rect.left);
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      SliderOrientationProvider,
      {
        scope: props.__scopeSlider,
        startEdge: isSlidingFromLeft ? "left" : "right",
        endEdge: isSlidingFromLeft ? "right" : "left",
        direction: isSlidingFromLeft ? 1 : -1,
        size: "width",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          SliderImpl,
          {
            dir: direction,
            "data-orientation": "horizontal",
            ...sliderProps,
            ref: composedRefs,
            style: {
              ...sliderProps.style,
              "--radix-slider-thumb-transform": "translateX(-50%)"
            },
            onSlideStart: (event) => {
              const value = getValueFromPointer(event.clientX);
              onSlideStart?.(value);
            },
            onSlideMove: (event) => {
              const value = getValueFromPointer(event.clientX);
              onSlideMove?.(value);
            },
            onSlideEnd: () => {
              rectRef.current = void 0;
              onSlideEnd?.();
            },
            onStepKeyDown: (event) => {
              const slideDirection = isSlidingFromLeft ? "from-left" : "from-right";
              const isBackKey = BACK_KEYS[slideDirection].includes(event.key);
              onStepKeyDown?.({ event, direction: isBackKey ? -1 : 1 });
            }
          }
        )
      }
    );
  }
);
var SliderVertical = reactExports.forwardRef(
  (props, forwardedRef) => {
    const {
      min,
      max,
      inverted,
      onSlideStart,
      onSlideMove,
      onSlideEnd,
      onStepKeyDown,
      ...sliderProps
    } = props;
    const sliderRef = reactExports.useRef(null);
    const ref = useComposedRefs(forwardedRef, sliderRef);
    const rectRef = reactExports.useRef(void 0);
    const isSlidingFromBottom = !inverted;
    function getValueFromPointer(pointerPosition) {
      const rect = rectRef.current || sliderRef.current.getBoundingClientRect();
      const input = [0, rect.height];
      const output = isSlidingFromBottom ? [max, min] : [min, max];
      const value = linearScale(input, output);
      rectRef.current = rect;
      return value(pointerPosition - rect.top);
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      SliderOrientationProvider,
      {
        scope: props.__scopeSlider,
        startEdge: isSlidingFromBottom ? "bottom" : "top",
        endEdge: isSlidingFromBottom ? "top" : "bottom",
        size: "height",
        direction: isSlidingFromBottom ? 1 : -1,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          SliderImpl,
          {
            "data-orientation": "vertical",
            ...sliderProps,
            ref,
            style: {
              ...sliderProps.style,
              "--radix-slider-thumb-transform": "translateY(50%)"
            },
            onSlideStart: (event) => {
              const value = getValueFromPointer(event.clientY);
              onSlideStart?.(value);
            },
            onSlideMove: (event) => {
              const value = getValueFromPointer(event.clientY);
              onSlideMove?.(value);
            },
            onSlideEnd: () => {
              rectRef.current = void 0;
              onSlideEnd?.();
            },
            onStepKeyDown: (event) => {
              const slideDirection = isSlidingFromBottom ? "from-bottom" : "from-top";
              const isBackKey = BACK_KEYS[slideDirection].includes(event.key);
              onStepKeyDown?.({ event, direction: isBackKey ? -1 : 1 });
            }
          }
        )
      }
    );
  }
);
var SliderImpl = reactExports.forwardRef(
  (props, forwardedRef) => {
    const {
      __scopeSlider,
      onSlideStart,
      onSlideMove,
      onSlideEnd,
      onHomeKeyDown,
      onEndKeyDown,
      onStepKeyDown,
      ...sliderProps
    } = props;
    const context = useSliderContext(SLIDER_NAME, __scopeSlider);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.span,
      {
        ...sliderProps,
        ref: forwardedRef,
        onKeyDown: composeEventHandlers(props.onKeyDown, (event) => {
          if (event.key === "Home") {
            onHomeKeyDown(event);
            event.preventDefault();
          } else if (event.key === "End") {
            onEndKeyDown(event);
            event.preventDefault();
          } else if (PAGE_KEYS.concat(ARROW_KEYS).includes(event.key)) {
            onStepKeyDown(event);
            event.preventDefault();
          }
        }),
        onPointerDown: composeEventHandlers(props.onPointerDown, (event) => {
          const target = event.target;
          target.setPointerCapture(event.pointerId);
          event.preventDefault();
          if (context.thumbs.has(target)) {
            target.focus({ preventScroll: true, focusVisible: false });
          } else {
            onSlideStart(event);
          }
        }),
        onPointerMove: composeEventHandlers(props.onPointerMove, (event) => {
          const target = event.target;
          if (target.hasPointerCapture(event.pointerId)) onSlideMove(event);
        }),
        onPointerUp: composeEventHandlers(props.onPointerUp, (event) => {
          const target = event.target;
          if (target.hasPointerCapture(event.pointerId)) {
            target.releasePointerCapture(event.pointerId);
            onSlideEnd(event);
          }
        })
      }
    );
  }
);
var TRACK_NAME = "SliderTrack";
var SliderTrack = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeSlider, ...trackProps } = props;
    const context = useSliderContext(TRACK_NAME, __scopeSlider);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.span,
      {
        "data-disabled": context.disabled ? "" : void 0,
        "data-orientation": context.orientation,
        ...trackProps,
        ref: forwardedRef
      }
    );
  }
);
SliderTrack.displayName = TRACK_NAME;
var RANGE_NAME = "SliderRange";
var SliderRange = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeSlider, ...rangeProps } = props;
    const context = useSliderContext(RANGE_NAME, __scopeSlider);
    const orientation = useSliderOrientationContext(RANGE_NAME, __scopeSlider);
    const ref = reactExports.useRef(null);
    const composedRefs = useComposedRefs(forwardedRef, ref);
    const valuesCount = context.values.length;
    const percentages = context.values.map(
      (value) => convertValueToPercentage(value, context.min, context.max)
    );
    const offsetStart = valuesCount > 1 ? Math.min(...percentages) : 0;
    const offsetEnd = 100 - Math.max(...percentages);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.span,
      {
        "data-orientation": context.orientation,
        "data-disabled": context.disabled ? "" : void 0,
        ...rangeProps,
        ref: composedRefs,
        style: {
          ...props.style,
          [orientation.startEdge]: offsetStart + "%",
          [orientation.endEdge]: offsetEnd + "%"
        }
      }
    );
  }
);
SliderRange.displayName = RANGE_NAME;
var THUMB_NAME = "SliderThumb";
var [SliderThumbContextProvider, useSliderThumbContext] = createSliderContext(THUMB_NAME);
var THUMB_PROVIDER_NAME = "SliderThumbProvider";
function SliderThumbProvider(props) {
  const {
    __scopeSlider,
    name,
    children,
    // @ts-expect-error internal render prop
    internal_do_not_use_render
  } = props;
  const context = useSliderContext(THUMB_PROVIDER_NAME, __scopeSlider);
  const getItems = useCollection(__scopeSlider);
  const [thumb, setThumb] = reactExports.useState(null);
  const index = reactExports.useMemo(
    () => thumb ? getItems().findIndex((item) => item.ref.current === thumb) : -1,
    [getItems, thumb]
  );
  const size = useSize(thumb);
  const isFormControl = thumb ? !!context.form || !!thumb.closest("form") : true;
  const value = context.values[index];
  const resolvedName = name ?? (context.name ? context.name + (context.values.length > 1 ? "[]" : "") : void 0);
  const percent = value === void 0 ? 0 : convertValueToPercentage(value, context.min, context.max);
  reactExports.useEffect(() => {
    if (thumb) {
      context.thumbs.add(thumb);
      return () => {
        context.thumbs.delete(thumb);
      };
    }
  }, [thumb, context.thumbs]);
  const thumbContext = {
    value,
    name: resolvedName,
    form: context.form,
    isFormControl,
    index,
    thumb,
    onThumbChange: setThumb,
    percent,
    size
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(SliderThumbContextProvider, { scope: __scopeSlider, ...thumbContext, children: isFunction(internal_do_not_use_render) ? internal_do_not_use_render(thumbContext) : children });
}
SliderThumbProvider.displayName = THUMB_PROVIDER_NAME;
var THUMB_TRIGGER_NAME = "SliderThumbTrigger";
var SliderThumbTrigger = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeSlider, ...thumbProps } = props;
    const context = useSliderContext(THUMB_TRIGGER_NAME, __scopeSlider);
    const orientation = useSliderOrientationContext(THUMB_TRIGGER_NAME, __scopeSlider);
    const { index, value, percent, size, onThumbChange } = useSliderThumbContext(
      THUMB_TRIGGER_NAME,
      __scopeSlider
    );
    const composedRefs = useComposedRefs(forwardedRef, onThumbChange);
    const label = getLabel(index, context.values.length);
    const orientationSize = size?.[orientation.size];
    const thumbInBoundsOffset = orientationSize ? getThumbInBoundsOffset(orientationSize, percent, orientation.direction) : 0;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "span",
      {
        style: {
          transform: "var(--radix-slider-thumb-transform)",
          position: "absolute",
          [orientation.startEdge]: `calc(${percent}% + ${thumbInBoundsOffset}px)`
        },
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Collection.ItemSlot, { scope: __scopeSlider, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Primitive.span,
          {
            role: "slider",
            "aria-label": props["aria-label"] || label,
            "aria-valuemin": context.min,
            "aria-valuenow": value,
            "aria-valuemax": context.max,
            "aria-orientation": context.orientation,
            "data-orientation": context.orientation,
            "data-disabled": context.disabled ? "" : void 0,
            tabIndex: context.disabled ? void 0 : 0,
            ...thumbProps,
            ref: composedRefs,
            style: value === void 0 ? { display: "none" } : props.style,
            onFocus: composeEventHandlers(props.onFocus, () => {
              context.valueIndexToChangeRef.current = index;
            })
          }
        ) })
      }
    );
  }
);
SliderThumbTrigger.displayName = THUMB_TRIGGER_NAME;
var SliderThumb = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeSlider, name, ...thumbProps } = props;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      SliderThumbProvider,
      {
        __scopeSlider,
        name,
        internal_do_not_use_render: ({ index, isFormControl }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            SliderThumbTrigger,
            {
              ...thumbProps,
              ref: forwardedRef,
              __scopeSlider
            }
          ),
          isFormControl ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            SliderBubbleInput,
            {
              __scopeSlider
            },
            index
          ) : null
        ] })
      }
    );
  }
);
SliderThumb.displayName = THUMB_NAME;
var BUBBLE_INPUT_NAME = "SliderBubbleInput";
var SliderBubbleInput = reactExports.forwardRef(
  ({ __scopeSlider, ...props }, forwardedRef) => {
    const { value, name, form } = useSliderThumbContext(BUBBLE_INPUT_NAME, __scopeSlider);
    const ref = reactExports.useRef(null);
    const composedRefs = useComposedRefs(ref, forwardedRef);
    const prevValue = usePrevious(value);
    reactExports.useEffect(() => {
      const input = ref.current;
      if (!input) return;
      const inputProto = window.HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(inputProto, "value");
      const setValue = descriptor.set;
      if (prevValue !== value && setValue) {
        const event = new Event("input", { bubbles: true });
        setValue.call(input, value);
        input.dispatchEvent(event);
      }
    }, [prevValue, value]);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.input,
      {
        style: { display: "none" },
        name,
        form,
        ...props,
        ref: composedRefs,
        defaultValue: value
      }
    );
  }
);
SliderBubbleInput.displayName = BUBBLE_INPUT_NAME;
function getNextSortedValues(prevValues = [], nextValue, atIndex) {
  const nextValues = [...prevValues];
  nextValues[atIndex] = nextValue;
  return nextValues.sort((a, b) => a - b);
}
function convertValueToPercentage(value, min, max) {
  const maxSteps = max - min;
  const percentPerStep = 100 / maxSteps;
  const percentage = percentPerStep * (value - min);
  return clamp(percentage, [0, 100]);
}
function getLabel(index, totalValues) {
  if (totalValues > 2) {
    return `Value ${index + 1} of ${totalValues}`;
  } else if (totalValues === 2) {
    return ["Minimum", "Maximum"][index];
  } else {
    return void 0;
  }
}
function getClosestValueIndex(values, nextValue) {
  if (values.length === 1) return 0;
  const distances = values.map((value) => Math.abs(value - nextValue));
  const closestDistance = Math.min(...distances);
  return distances.indexOf(closestDistance);
}
function getThumbInBoundsOffset(width, left, direction) {
  const halfWidth = width / 2;
  const halfPercent = 50;
  const offset = linearScale([0, halfPercent], [0, halfWidth]);
  return (halfWidth - offset(left) * direction) * direction;
}
function getStepsBetweenValues(values) {
  return values.slice(0, -1).map((value, index) => values[index + 1] - value);
}
function hasMinStepsBetweenValues(values, minStepsBetweenValues) {
  if (minStepsBetweenValues > 0) {
    const stepsBetweenValues = getStepsBetweenValues(values);
    const actualMinStepsBetweenValues = Math.min(...stepsBetweenValues);
    return actualMinStepsBetweenValues >= minStepsBetweenValues;
  }
  return true;
}
function linearScale(input, output) {
  return (value) => {
    if (input[0] === input[1] || output[0] === output[1]) return output[0];
    const ratio = (output[1] - output[0]) / (input[1] - input[0]);
    return output[0] + ratio * (value - input[0]);
  };
}
function getDecimalCount(value) {
  if (!Number.isFinite(value)) return 0;
  const str = value.toString();
  if (str.includes("e")) {
    const [coefficient, exponent] = str.split("e");
    const decimalPart2 = coefficient.split(".")[1] || "";
    const exponentNum = Number(exponent);
    return Math.max(0, decimalPart2.length - exponentNum);
  }
  const decimalPart = str.split(".")[1];
  return decimalPart ? decimalPart.length : 0;
}
function roundValue(value, decimalCount) {
  const rounder = Math.pow(10, decimalCount);
  return Math.round(value * rounder) / rounder;
}
function isFunction(value) {
  return typeof value === "function";
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}) {
  const _values = reactExports.useMemo(
    () => Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max],
    [value, defaultValue, min, max]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Slider$1,
    {
      "data-slot": "slider",
      defaultValue,
      value,
      min,
      max,
      className: cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className
      ),
      ...props,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          SliderTrack,
          {
            "data-slot": "slider-track",
            className: cn(
              "bg-muted relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"
            ),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              SliderRange,
              {
                "data-slot": "slider-range",
                className: cn(
                  "bg-primary absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
                )
              }
            )
          }
        ),
        Array.from({ length: _values.length }, (_, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          SliderThumb,
          {
            "data-slot": "slider-thumb",
            className: "border-primary ring-ring/50 block size-4 shrink-0 rounded-full border bg-white shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
          },
          index
        ))
      ]
    }
  );
}

function resolveCellMarkers(map, iaPair) {
  const out = {};
  for (const [facilityId, recent] of Object.entries(map)) {
    const cols = { ...recent.cols };
    const trackers = [
      ["nqas", "nqas", "nqasIaQ1", "nqasIaQ2", "nqasIaCmp"],
      ["kayakalp", "kayakalp", "kayakalpIaQ1", "kayakalpIaQ2", "kayakalpIaCmp"]
      // Part 2: the Eco tracker is deprecated — no recently-updated marker.
    ];
    for (const [, tracker, q1Key, q2Key, cmpKey] of trackers) {
      const hit = recent.ia[tracker];
      if (!hit) continue;
      const prevQ = iaPair?.previous;
      const curQ = iaPair?.current;
      if (prevQ && hit.fy === prevQ.fy && hit.quarter === prevQ.q) cols[q1Key] = { at: hit.at, by: hit.by, source: hit.source, was: hit.was };
      if (curQ && hit.fy === curQ.fy && hit.quarter === curQ.q) {
        cols[q2Key] = { at: hit.at, by: hit.by, source: hit.source, was: hit.was };
        cols[cmpKey] = { at: hit.at, by: hit.by, source: hit.source, was: hit.was };
      }
    }
    if (Object.keys(cols).length > 0) out[facilityId] = cols;
  }
  return out;
}

const CARD_KEYS = [
  "certStatus",
  "certScore",
  "validityDate",
  "nocStatus",
  "survDue1"
];
function MobileFacilityCards({
  rows,
  labels,
  onOpen,
  onClear,
  canEdit = false,
  onUpdate,
  onViewHistory,
  onPrint,
  onExport,
  onPrefetch,
  savedIds,
  draftIds,
  query = ""
}) {
  if (rows.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center px-6 py-14 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-base font-semibold", children: "No facilities match your filters" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Clear a filter or search for another facility, PHC, block or NIN." }),
      onClear && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: onClear,
          className: "mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
          children: "Clear all filters"
        }
      )
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-2 p-2", children: rows.map((r) => {
    const id = String(r.facility._id);
    const name = r.facility.name || "Facility";
    const justSaved = !!savedIds?.has(id);
    return /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-background p-3 transition-colors hover:border-primary/40", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          role: "button",
          tabIndex: 0,
          onClick: (e) => {
            if (e.target.closest("a")) return;
            onOpen(r);
          },
          onKeyDown: (e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            onOpen(r);
          },
          className: "w-full cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-start justify-between gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                FacilityCell,
                {
                  facility: r.facility,
                  query,
                  compact: true,
                  onOpen: () => onOpen(r),
                  className: "min-w-0 flex-1"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "mt-1 size-4 shrink-0 text-muted-foreground", "aria-hidden": true })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mt-2 flex flex-wrap items-center gap-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", className: "text-[11px]", children: r.facility.facilityType }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", className: "text-[11px]", children: stageOf(r).replace(/^\w/, (c) => c.toUpperCase()) }),
              draftIds?.has(id) && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "span",
                {
                  role: "status",
                  "aria-label": "Saved draft",
                  className: "inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "aria-hidden": true, className: "size-1.5 rounded-full bg-amber-500" }),
                    "Draft"
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("dl", { className: "mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5", children: CARD_KEYS.map((key) => {
              const v = cellValue(r, key);
              if (v.kind === "empty" || v.kind === "compare") return null;
              return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "truncate text-[11px] text-muted-foreground", children: labels[key] ?? key }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: cn("min-w-0 text-[13px]"), children: v.kind === "status" ? /* @__PURE__ */ jsxRuntimeExports.jsx(StatusPill, { value: v.value }) : v.kind === "score" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ScoreBar, { value: v.value }) : v.kind === "date" ? /* @__PURE__ */ jsxRuntimeExports.jsx(DateCell, { value: v.value }) : v.kind === "dueDate" && v.value ? /* @__PURE__ */ jsxRuntimeExports.jsx(DateCell, { value: v.value }) : v.kind === "text" ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "tabular-nums", children: v.value }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "tabular-nums", children: EMPTY_TEXT }) })
              ] }, key);
            }) })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            size: "lg",
            variant: canEdit ? "default" : "outline",
            className: "min-h-11 flex-1",
            disabled: justSaved,
            "aria-label": `${canEdit ? "Update" : "View"} ${name}`,
            onMouseEnter: () => onPrefetch?.(r),
            onClick: () => {
              if (justSaved) return;
              if (canEdit) onUpdate?.(r);
              else onOpen(r);
            },
            children: justSaved ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "aria-live": "polite", children: "Saved ✓" }) : canEdit ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "size-4", "aria-hidden": true }),
              " Update"
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "size-4", "aria-hidden": true }),
              " View"
            ] })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "outline",
              size: "icon",
              className: "size-11 shrink-0",
              "aria-label": `More actions ${name}`,
              "data-tip": "More actions",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Ellipsis, { className: "size-4", "aria-hidden": true })
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", className: "min-w-52", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuLabel, { className: "text-xs text-muted-foreground", children: name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, {}),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              DropdownMenuItem,
              {
                "aria-label": `Open full profile ${name}`,
                onSelect: () => {
                  window.location.assign(`/facilities/${id}`);
                },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "size-4", "aria-hidden": true }),
                  " Open full profile"
                ]
              }
            ),
            onViewHistory && /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onSelect: () => onViewHistory(r), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(History, { className: "size-4", "aria-hidden": true }),
              " View history"
            ] }),
            onPrint && /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onSelect: () => onPrint(r), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Printer, { className: "size-4", "aria-hidden": true }),
              " Print facility sheet"
            ] }),
            onExport && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, {}),
              /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuItem, { onSelect: () => onExport(r, "pdf"), children: "Export this facility (PDF)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuItem, { onSelect: () => onExport(r, "excel"), children: "Export this facility (Excel)" })
            ] })
          ] })
        ] })
      ] })
    ] }) }, id);
  }) });
}

const BUILDING_TYPE_OPTIONS = [
  "Own Building",
  "Rented Building",
  "Rent Free Building"
];
function FacilityList() {
  const cycleScope = useCycleScope();
  const data = useQuery(api.ops.listFacilityRowsFast, { cycle: cycleScope });
  const { user } = useAuth();
  const settings = useQuery(api.facilities.getAppSettings, {});
  const recentBatches = useQuery(api.imports.listImportBatches, { limit: 20 });
  const deleteFacility = useMutation(api.facilities.deleteFacility);
  const createFacility = useMutation(api.facilities.createFacility);
  const updateEligibility = useMutation(api.facilityOps.updateFacilityEligibility);
  const {
    filters,
    searchInput,
    setSearch,
    resetSearch,
    patch,
    setAll,
    restoredFrom,
    dismissRestored,
    urlKey
  } = useListUrlState();
  const search = filters.q;
  const blockFilter = filters.block;
  const statusFilter = filters.status;
  const docRepFilter = filters.docRep;
  const typeFilter = filters.type;
  const eligibilityFilter = filters.eligibility;
  const certFilter = filters.cert;
  const cycleFilter = filters.cycle;
  const buildingTypeFilter = filters.btype;
  const buildingStatusFilter = filters.bstatus;
  const nocStatusFilter = filters.noc;
  const kpiFilter = filters.kpi;
  const metricFilter = filters.metric;
  const dueWindow = filters.due;
  const scoreRange = filters.score;
  const updRefiners = [filters.updBy, filters.updHow, filters.updBatch, filters.updField].filter(Boolean);
  const updatedPreset = filters.updated || (updRefiners.length ? "any" : "");
  const updated = updatedPreset ? {
    preset: updatedPreset,
    from: filters.updFrom || void 0,
    to: filters.updTo || void 0,
    by: filters.updBy || void 0,
    source: filters.updHow || void 0,
    batchId: filters.updBatch || void 0,
    field: filters.updField || void 0
  } : void 0;
  const setUpdated = (v) => patch({
    updated: v.preset ?? updatedPreset,
    updFrom: v.from ?? filters.updFrom,
    updTo: v.to ?? filters.updTo,
    updBy: v.by ?? filters.updBy,
    updHow: v.how ?? filters.updHow,
    updBatch: v.batch ?? filters.updBatch,
    updField: v.field ?? filters.updField,
    page: 1
  });
  const clearUpdated = () => patch({
    updated: "",
    updFrom: "",
    updTo: "",
    updBy: "",
    updHow: "",
    updBatch: "",
    updField: "",
    page: 1
  });
  const sorting = filters.sort;
  const setBlockFilter = (v) => patch({ block: v });
  const setStatusFilter = (v) => patch({ status: v });
  const setDocRepFilter = (v) => patch({ docRep: v });
  const setTypeFilter = (v) => patch({ type: v });
  const setEligibilityFilter = (v) => patch({ eligibility: v });
  const setCertFilter = (v) => patch({ cert: v });
  const setCycleFilter = (v) => patch({ cycle: v });
  const setBuildingTypeFilter = (v) => patch({ btype: v });
  const setBuildingStatusFilter = (v) => patch({ bstatus: v });
  const setNocStatusFilter = (v) => patch({ noc: v });
  const setKpiFilter = (v) => patch({ kpi: v });
  const setDueWindow = (v) => patch({ due: v });
  const setScoreRange = (v) => patch({ score: v }, { replace: true });
  const setSorting = (next) => patch({ sort: next });
  const [addOpen, setAddOpen] = reactExports.useState(false);
  const [cachedView] = reactExports.useState(() => loadMasterView("master"));
  const [editedView, setEditedView] = reactExports.useState(null);
  const serverView = useQuery(api.ops.getMasterView, { scope: "master" });
  const saveServerView = useMutation(api.ops.setMasterView);
  const savedView = reactExports.useMemo(
    () => serverView?.view ? normalizeView(serverView.view) : null,
    [serverView]
  );
  const view = editedView ?? savedView ?? cachedView;
  const setView = setEditedView;
  const [colsOpen, setColsOpen] = reactExports.useState(false);
  const [viewMenuOpen, setViewMenuOpen] = reactExports.useState(false);
  const [exportOpen, setExportOpen] = reactExports.useState(false);
  const [legendOpen, setLegendOpen] = reactExports.useState(false);
  const [mode, setMode] = reactExports.useState("view");
  const [prefetchId, setPrefetchId] = reactExports.useState(null);
  const [activeCellState, setActiveCellState] = reactExports.useState(null);
  const activeCell = mode === "edit" ? activeCellState : null;
  const setActiveCell = setActiveCellState;
  const rowDrafts = useRowDrafts();
  const updateTrackerRowMutation = useMutation(api.facilities.updateTrackerRow);
  const [editBusyIds, setEditBusyIds] = reactExports.useState(/* @__PURE__ */ new Set());
  const [deleteTarget, setDeleteTarget] = reactExports.useState(null);
  const editorOptions = reactExports.useMemo(
    () => trackerEditorOptions(settings?.settings),
    [settings]
  );
  const readOnlyReasons = reactExports.useMemo(() => {
    const out = {};
    for (const c of fullExportColumns()) {
      if (!isEditableCellKey(c.key)) out[c.key] = readOnlyCellReason(c.key);
    }
    return out;
  }, []);
  const editView = reactExports.useMemo(
    () => ({
      presetId: "custom",
      visibleKeys: fullExportColumns().map((c) => c.key),
      order: [],
      density: view.density,
      collapsedGroups: []
    }),
    [view.density]
  );
  const saveEligibility = async (row, el) => {
    try {
      await updateEligibility({
        facilityId: row.facility._id,
        eligibility: el
      });
      toast.success("Eligibility updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };
  const saveRow = async (row, state) => {
    const id = String(row.facility._id);
    setEditBusyIds((prev) => new Set(prev).add(id));
    try {
      await updateTrackerRowMutation(
        trackerUpdatePayload(row, state)
      );
      toast.success("Row updated");
      rowDrafts.reset(row);
      flashSaved(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setEditBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };
  const searchRef = reactExports.useRef(null);
  const tableScrollRef = reactExports.useRef(null);
  const facilityTypes = settings?.settings.facilityTypes ?? DEFAULT_SETTINGS.facilityTypes;
  const eligibilityOptions = buildEligibilityOptions(
    settings?.settings.eligibilityOptions
  );
  const certStatusOptions = settings?.settings.certificationStatuses ?? DEFAULT_SETTINGS.certificationStatuses;
  const canAdd = data?.me.appRole === "admin" || data?.me.appRole === "entry";
  const [searchParams, setSearchParams] = useSearchParams();
  const legendDeepLink = searchParams.get("legend") === "1";
  const addDeepLink = canAdd && searchParams.get("add") === "1";
  const consumeDeepLink = reactExports.useCallback(
    (param) => {
      if (searchParams.get(param) === "1") {
        const next = new URLSearchParams(searchParams);
        next.delete(param);
        setSearchParams(next, { replace: true });
      }
    },
    [searchParams, setSearchParams]
  );
  const rowActionsSetting = readRowActionsSetting(
    settings?.settings.rowActionColumn
  );
  const [narrowViewport, setNarrowViewport] = reactExports.useState(
    () => typeof window !== "undefined" && window.innerWidth < 1280
  );
  reactExports.useEffect(() => {
    const onResize = () => setNarrowViewport(window.innerWidth < 1280);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const compactRowActions = rowActionsSetting.compactBelow1280 && narrowViewport;
  const iaQuartersQ = useQuery(api.ia.listIaQuarters, { limit: 2e4 });
  const [iaCursor, setIaCursor] = reactExports.useState(null);
  const iaIndex = reactExports.useMemo(
    () => iaQuartersQ ? withLegacyIa(
      buildIaMasterIndex(
        iaQuartersQ.map((q) => ({
          facilityId: q.facilityId,
          fy: q.fy,
          quarter: q.quarter,
          nqasIaScore: q.nqasIaScore,
          kayakalpIaScore: q.kayakalpIaScore,
          ecoFriendlyScore: q.ecoFriendlyScore,
          nqasRemark: q.nqasRemark,
          kayakalpRemark: q.kayakalpRemark,
          ecoRemark: q.ecoRemark,
          lockedAt: q.lockedAt,
          updatedAt: q.updatedAt
        }))
      ),
      // Legacy facilities.nqasIaQ1/Q2 are REAL 2026-27 Q1/Q2 data —
      // merged in as periods so a facility never shown under a
      // calendar-guessed quarter label.
      (data?.rows ?? []).map((r) => ({
        id: r.facility._id,
        nqasIaQ1: r.facility.nqasIaQ1 ?? null,
        kayakalpIaQ1: r.facility.kayakalpIaQ1 ?? null,
        nqasIaQ2: r.facility.nqasIaQ2 ?? null,
        kayakalpIaQ2: r.facility.kayakalpIaQ2 ?? null
      }))
    ) : null,
    [iaQuartersQ, data]
  );
  const iaPair = reactExports.useMemo(
    () => iaIndex ? iaPairFor(iaCursor, iaIndex, todayLocalIso()) : null,
    [iaIndex, iaCursor]
  );
  const iaPeriodOptions = reactExports.useMemo(
    () => iaIndex ? allIaPeriods(iaIndex) : [],
    [iaIndex]
  );
  const iaCurrentProvisional = reactExports.useMemo(() => {
    if (!iaPair || !iaQuartersQ) return false;
    return iaQuartersQ.some(
      (q) => q.fy === iaPair.current.fy && q.quarter === iaPair.current.q && q.provisional === true
    );
  }, [iaQuartersQ, iaPair]);
  const displaySettings = reactExports.useMemo(() => readDisplaySettings(settings?.settings), [settings]);
  const [freezeOn, setFreezeOn] = reactExports.useState(() => loadBoolPref(FREEZE_PREF_KEY));
  const [recentOn, setRecentOn] = reactExports.useState(() => loadBoolPref(HIGHLIGHT_PREF_KEY));
  reactExports.useEffect(() => saveBoolPref(FREEZE_PREF_KEY, freezeOn), [freezeOn]);
  reactExports.useEffect(() => saveBoolPref(HIGHLIGHT_PREF_KEY, recentOn), [recentOn]);
  const [focusMode, setFocusMode] = reactExports.useState(() => loadBoolPref("master.focus"));
  reactExports.useEffect(() => saveBoolPref("master.focus", focusMode), [focusMode]);
  reactExports.useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() !== "f" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      e.preventDefault();
      setFocusMode((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const [viewportWidth, setViewportWidth] = reactExports.useState(
    () => typeof window === "undefined" ? 1280 : window.innerWidth
  );
  reactExports.useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const freezeActive = freezeOn && viewportWidth >= displaySettings.freezeBelowPx;
  const recentQueryArgs = recentOn && displaySettings.recentDays > 0 ? { days: displaySettings.recentDays, scope: displaySettings.highlightScope } : "skip";
  const recentMap = useQuery(api.imports.getRecentUpdates, recentQueryArgs);
  const recentByFacility = reactExports.useMemo(
    () => recentMap ? resolveCellMarkers(recentMap, iaPair) : {},
    [recentMap, iaPair]
  );
  const labels = reactExports.useMemo(
    () => withIaPeriodLabels(
      resolveLabels(MASTER_COLUMNS, settings?.settings.tableHeaderOverrides),
      iaPair
    ),
    [settings, iaPair]
  );
  const liveRows = data?.rows;
  const [snapshotRows] = reactExports.useState(() => loadRowsSnapshot());
  const documentRules = reactExports.useMemo(
    () => normalizeDocumentRules(settings?.settings?.documentRules),
    [settings]
  );
  const pendingConfig = reactExports.useMemo(
    () => normalizePendingConfig(settings?.settings?.pendingRules),
    [settings]
  );
  const masterRows = reactExports.useMemo(() => {
    const base = liveRows ?? snapshotRows ?? [];
    const enriched = base.map((r) => {
      const withIa = iaIndex && iaPair ? { ...r, iaq: attachIaExtras(String(r.facility._id), iaIndex, iaPair) } : r;
      const missing = requiredDocumentsMissing(withIa, documentRules);
      if (missing.length === 0 || !withIa.docs) return withIa;
      return { ...withIa, docs: { ...withIa.docs, requiredMissing: missing } };
    });
    return enriched;
  }, [liveRows, snapshotRows, iaIndex, iaPair, documentRules]);
  const loaded = liveRows !== void 0 || snapshotRows !== null;
  reactExports.useEffect(() => {
    if (liveRows) saveRowsSnapshot(liveRows);
  }, [liveRows]);
  const dataAsOf = reactExports.useMemo(() => latestUpdatedAt(masterRows), [masterRows]);
  const quickRow = reactExports.useMemo(
    () => filters.facility ? masterRows.find(
      (r) => String(r.facility._id) === filters.facility
    ) ?? null : null,
    [filters.facility, masterRows]
  );
  const openQuickRow = (row, section = "overview") => {
    setQuickEditRequest(null);
    patch(
      {
        facility: row ? String(row.facility._id) : "",
        section: row ? section : "",
        page: filters.page
      },
      { replace: false }
    );
  };
  const closeQuickRow = () => {
    setQuickEditRequest(null);
    patch({ facility: "", section: "", page: filters.page }, { replace: true });
  };
  const navigateQuickRow = (row) => {
    setPrefetchId(String(row.facility._id));
    patch(
      {
        facility: String(row.facility._id),
        section: filters.section || "overview",
        page: filters.page
      },
      { replace: false }
    );
  };
  const setQuickSection = (key) => patch(
    { facility: filters.facility, section: key, page: filters.page },
    { replace: true }
  );
  const [quickEditRequest, setQuickEditRequest] = reactExports.useState(null);
  const [savedIds, setSavedIds] = reactExports.useState(/* @__PURE__ */ new Set());
  const flashSaved = reactExports.useCallback((facilityId) => {
    setSavedIds((prev) => new Set(prev).add(facilityId));
    window.setTimeout(() => {
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(facilityId);
        return next;
      });
    }, 1500);
  }, []);
  const viewSection = (preset) => {
    switch (preset) {
      case "certification":
        return "nqas";
      case "funds":
        return "funds";
      case "assessments":
        return "ia";
      case "surveillance":
        return "surveillance";
      case "building":
        return "building";
      default:
        return "overview";
    }
  };
  const openHistoryFor = (row) => {
    setPrefetchId(String(row.facility._id));
    setQuickEditRequest(null);
    patch(
      { facility: String(row.facility._id), section: "audit", page: filters.page },
      { replace: false }
    );
  };
  const openUpdateFor = (row) => {
    if (!(data?.me.appRole === "admin" || data?.me.appRole === "entry")) {
      openHistoryFor(row);
      return;
    }
    setPrefetchId(String(row.facility._id));
    setQuickEditRequest({ facilityId: String(row.facility._id), token: Date.now() });
    patch(
      {
        facility: String(row.facility._id),
        section: viewSection(view.presetId),
        page: filters.page
      },
      { replace: false }
    );
  };
  const saveQuickRow = async (target, state) => {
    await updateTrackerRowMutation(
      trackerUpdatePayload(target, state)
    );
    toast.success("Facility updated");
    flashSaved(String(target.facility._id));
  };
  const generatedBy = data?.me.appRole ? `NQAS Tracker (${data.me.appRole})` : "NQAS Tracker";
  const printSheet = (target) => openPrintSheet({ row: target, generatedBy });
  const exportQuickRow = async (target, format) => {
    if (format === "pdf") {
      printSheet(target);
      return;
    }
    await exportMasterWorkbook(
      {
        rows: [target],
        columns: fullExportColumns(),
        labels,
        filtersText: `This facility only (${target.facility.name})`,
        generatedBy,
        title: "Facility sheet",
        fileNameBase: `facility-${target.facility.name.replace(/[^\w]+/g, "-").toLowerCase()}`
      },
      (buf, name) => downloadBlob(
        new Blob([buf], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }),
        name
      )
    );
  };
  reactExports.useEffect(() => {
    saveMasterView("master", view);
    if (!editedView) return;
    const t = window.setTimeout(() => {
      void saveServerView({ scope: "master", view: normalizeView(view) }).catch((err) => {
        console.warn("Could not save your column layout to your account:", err);
      });
    }, 700);
    return () => window.clearTimeout(t);
  }, [view, editedView, saveServerView]);
  reactExports.useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const statusOptions = reactExports.useMemo(() => {
    const set = /* @__PURE__ */ new Set();
    for (const r of data?.rows ?? []) set.add(foldStatus(r.facility.currentStatus));
    return [...set].sort();
  }, [data]);
  const cycleOptions = reactExports.useMemo(() => {
    const nums = /* @__PURE__ */ new Set();
    let hasNone = false;
    for (const r of data?.rows ?? []) {
      if (r.cycleNumber) nums.add(r.cycleNumber);
      else hasNone = true;
    }
    const opts = [...nums].sort((a, b) => a - b).map((n) => ({
      value: String(n),
      label: `Cycle #${n}`
    }));
    if (hasNone) opts.push({ value: NO_CYCLE, label: "No cycle" });
    return opts;
  }, [data]);
  const docReportOptions = reactExports.useMemo(() => {
    const set = new Set(REPORT_STATUS_VALUES);
    for (const r of data?.rows ?? []) {
      const v = r.facility.documentsStatusReport;
      if (v && !set.has(v)) set.add(v);
    }
    return [...set].sort();
  }, [data]);
  const buildingTypeOptions = reactExports.useMemo(() => {
    const base = settings?.settings.buildingTypes ?? BUILDING_TYPE_OPTIONS;
    const extra = (data?.rows ?? []).map((r) => r.building?.buildingType ?? "").filter((t) => t && !base.includes(t));
    return [...base, ...new Set(extra)];
  }, [settings, data]);
  const buildingStatusOptions = reactExports.useMemo(() => {
    const base = settings?.settings.buildingStatuses ?? [
      "Good",
      "Needs Repair",
      "Under Renovation",
      "Dilapidated"
    ];
    const extra = (data?.rows ?? []).map((r) => r.building?.buildingStatus ?? "").filter((s) => s && !base.includes(s));
    return [...base, ...new Set(extra)];
  }, [settings, data]);
  const nocStatusFilterOptions = reactExports.useMemo(
    () => ["Valid", "Expiring Soon", "Expired", "Not Obtained"],
    []
  );
  const blockNames = reactExports.useMemo(() => (data?.blocks ?? []).map((b) => b.name), [data]);
  const filterArgs = (over = {}) => ({
    search,
    blocks: blockFilter,
    types: typeFilter,
    cycles: cycleFilter,
    eligibility: eligibilityFilter,
    certStatus: certFilter,
    status: statusFilter,
    docReport: docRepFilter,
    buildingType: buildingTypeFilter,
    buildingStatus: buildingStatusFilter,
    nocStatus: nocStatusFilter,
    kpi: kpiFilter,
    metric: metricFilter || null,
    dueWindow,
    scoreRange,
    lastChanged: updated,
    ...over
  });
  const filtered = reactExports.useMemo(
    () => masterRows.length === 0 ? [] : applyMasterFilters(
      masterRows,
      filterArgs(),
      /* @__PURE__ */ new Date(),
      documentRules,
      pendingConfig,
      settings?.settings
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      masterRows,
      search,
      blockFilter,
      statusFilter,
      docRepFilter,
      typeFilter,
      eligibilityFilter,
      certFilter,
      cycleFilter,
      buildingTypeFilter,
      buildingStatusFilter,
      nocStatusFilter,
      kpiFilter,
      metricFilter,
      dueWindow,
      scoreRange,
      updatedPreset,
      filters.updFrom,
      filters.updTo,
      filters.updBy,
      filters.updHow,
      filters.updBatch,
      filters.updField,
      documentRules,
      pendingConfig,
      settings?.settings
    ]
  );
  const tabBaseRows = reactExports.useMemo(
    () => applyMasterFilters(
      masterRows,
      { ...filterArgs(), kpi: null, eligibility: [] },
      /* @__PURE__ */ new Date(),
      documentRules,
      pendingConfig,
      settings?.settings
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      masterRows,
      search,
      blockFilter,
      statusFilter,
      docRepFilter,
      typeFilter,
      certFilter,
      cycleFilter,
      buildingTypeFilter,
      buildingStatusFilter,
      nocStatusFilter,
      metricFilter,
      dueWindow,
      scoreRange,
      updatedPreset,
      filters.updFrom,
      filters.updTo,
      filters.updBy,
      filters.updHow,
      filters.updBatch,
      filters.updField,
      documentRules,
      pendingConfig,
      settings?.settings
    ]
  );
  const quickTabCounts = reactExports.useMemo(() => {
    const today = /* @__PURE__ */ new Date();
    let attention = 0;
    let certified = 0;
    let eligible = 0;
    let notEligible = 0;
    for (const row of tabBaseRows) {
      if (kpiMatches(row, "attention", today, documentRules, pendingConfig, settings?.settings))
        attention += 1;
      if (kpiMatches(row, "certified", today, documentRules, pendingConfig, settings?.settings))
        certified += 1;
      if (row.facility.eligibility === "Eligible") eligible += 1;
      if (row.facility.eligibility === "Not Eligible") notEligible += 1;
    }
    return { all: tabBaseRows.length, attention, eligible, certified, notEligible };
  }, [tabBaseRows, documentRules, pendingConfig, settings?.settings]);
  const activeQuickTab = kpiFilter === "attention" ? "attention" : kpiFilter === "certified" ? "certified" : eligibilityFilter.length === 1 && eligibilityFilter[0] === "Eligible" ? "eligible" : eligibilityFilter.length === 1 && eligibilityFilter[0] === "Not Eligible" ? "notEligible" : kpiFilter == null && eligibilityFilter.length === 0 ? "all" : null;
  const [extraBar, setExtraBar] = reactExports.useState({
    barKeys: [],
    filters: [],
    match: "all"
  });
  const extraFields = reactExports.useMemo(() => {
    const filterText = (row, key) => {
      const value = cellValue(row, key);
      if (value.kind === "date" || value.kind === "dueDate") {
        const raw = value.value;
        if (raw == null || raw === "") return "";
        const parsed = typeof raw === "number" ? raw : Date.parse(raw);
        return Number.isNaN(parsed) ? String(raw) : new Date(parsed).toISOString().slice(0, 10);
      }
      return cellText(row, key);
    };
    return MASTER_COLUMNS.filter(
      (column) => !column.deprecated && column.type !== "action" && column.type !== "link" && column.type !== "links" && column.type !== "docStatus"
    ).map((column) => {
      const values = [...new Set(masterRows.map((row) => filterText(row, column.key)).filter(Boolean))];
      const baseType = column.type === "score" || column.type === "currency" ? "number" : column.type === "date" || column.type === "dueDate" ? "date" : "text";
      const type = column.type === "status" || baseType === "text" && values.length > 0 && values.length <= 60 ? "select" : baseType;
      return {
        key: column.key,
        label: labels[column.key] ?? column.label,
        type,
        onThisPage: ["facility", "block", "type", "currentStatus"].includes(column.key),
        options: type === "select" ? values.map((value) => ({ value })) : void 0
      };
    });
  }, [labels, masterRows]);
  const visibleRows = reactExports.useMemo(() => {
    const get = (row, key) => {
      const value = cellValue(row, key);
      if (value.kind === "date" || value.kind === "dueDate") {
        const raw = value.value;
        if (raw == null || raw === "") return "";
        const parsed = typeof raw === "number" ? raw : Date.parse(raw);
        return Number.isNaN(parsed) ? String(raw) : new Date(parsed).toISOString().slice(0, 10);
      }
      return cellText(row, key);
    };
    return filtered.filter(
      (row) => rowPasses(extraBar.filters, extraBar.match, (key) => get(row, key))
    );
  }, [filtered, extraBar]);
  const recentLegend = recentOn && displaySettings.recentDays > 0 ? `Highlighted = updated in the last ${displaySettings.recentDays} day${displaySettings.recentDays === 1 ? "" : "s"}` : null;
  const optionCounts = reactExports.useMemo(
    () => masterRows.length === 0 ? null : countListOptions(masterRows, filterArgs(), {
      block: blockNames,
      type: facilityTypes,
      cycle: cycleOptions.map((o) => o.value),
      eligibility: eligibilityOptions.map((o) => o.value),
      cert: [...certStatusOptions].sort(),
      status: statusOptions,
      docRep: docReportOptions,
      btype: buildingTypeOptions,
      bstatus: buildingStatusOptions,
      noc: nocStatusFilterOptions
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      masterRows,
      blockNames,
      facilityTypes,
      certStatusOptions,
      eligibilityOptions,
      statusOptions,
      docReportOptions,
      cycleOptions,
      buildingTypeOptions,
      buildingStatusOptions,
      nocStatusFilterOptions,
      search,
      blockFilter,
      statusFilter,
      docRepFilter,
      typeFilter,
      eligibilityFilter,
      certFilter,
      cycleFilter,
      buildingTypeFilter,
      buildingStatusFilter,
      nocStatusFilter,
      kpiFilter,
      metricFilter,
      dueWindow,
      scoreRange
    ]
  );
  const optionList = (values, counts, labels2) => values.map((v) => ({
    value: v,
    label: labels2?.[v] ?? v,
    count: counts?.get(v)
  }));
  const secondaryActiveCount = countActiveFilters([
    eligibilityFilter,
    certFilter,
    docRepFilter,
    buildingTypeFilter,
    buildingStatusFilter,
    nocStatusFilter
  ]) + (dueWindow > 0 ? 1 : 0) + (scoreRange[0] > 0 || scoreRange[1] < 100 ? 1 : 0);
  const clearAllFilters = () => {
    resetSearch();
    setAll({ ...defaultListFilters(), size: filters.size, sort: filters.sort });
  };
  const toggleGroup = (group) => {
    const collapsed = new Set(view.collapsedGroups ?? []);
    if (collapsed.has(group)) collapsed.delete(group);
    else collapsed.add(group);
    setView({ ...view, collapsedGroups: [...collapsed] });
  };
  const openTab = (tab) => {
    if (tab === "all") {
      patch({ kpi: null, eligibility: [] });
      return;
    }
    if (tab === "eligible" || tab === "notEligible") {
      patch({
        kpi: null,
        eligibility: [tab === "eligible" ? "Eligible" : "Not Eligible"]
      });
      return;
    }
    patch({ kpi: tab, eligibility: [] });
  };
  const resetView = () => {
    const previousFilters = filters;
    const previousView = view;
    resetSearch();
    setAll({ ...defaultListFilters(), size: filters.size });
    setView(applyPreset(DEFAULT_VIEW.presetId));
    toast.success("View reset", {
      action: {
        label: "Undo",
        onClick: () => {
          setAll(previousFilters, { replace: true });
          setView(previousView);
        }
      }
    });
  };
  const draftIds = reactExports.useMemo(() => {
    const userId = user?._id ?? void 0;
    return new Set(
      visibleRows.filter((r) => loadQuickViewDraft(String(r.facility._id), userId) != null).map((r) => String(r.facility._id))
    );
  }, [visibleRows, user?._id]);
  const unsavedCount = reactExports.useMemo(
    () => rowDrafts.dirtyCount(visibleRows),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rowDrafts, visibleRows, rowDrafts.drafts]
  );
  useScrollRestore(urlKey, loaded, tableScrollRef);
  const describeFilters = () => {
    const bits = [];
    if (search.trim()) bits.push(`Search “${search.trim()}”`);
    const multi = (label, values) => {
      if (values.length) bits.push(`${label}: ${values.join(", ")}`);
    };
    multi("Block", blockFilter);
    multi("Type", typeFilter);
    multi("Certification Cycle", cycleFilter);
    multi("Eligibility", eligibilityFilter);
    multi("Certification status", certFilter);
    multi("Current status", statusFilter);
    multi("Docs report", docRepFilter);
    multi("Building type", buildingTypeFilter);
    multi("Building status", buildingStatusFilter);
    multi("Fire NOC status", nocStatusFilter);
    if (kpiFilter) bits.push(`KPI filter ${kpiFilter}`);
    if (metricFilter) bits.push(`Metric: ${METRIC_LABELS[metricFilter]}`);
    if (dueWindow > 0) bits.push(`Due ≤ ${dueWindow} days`);
    if (scoreRange[0] > 0 || scoreRange[1] < 100)
      bits.push(`Score ${scoreRange[0]}–${scoreRange[1]}%`);
    if (updatedPreset) {
      const preset = updatedPreset === "any" ? "any time" : updatedPreset === "custom" ? `${filters.updFrom || "any"} – ${filters.updTo || "today"}` : updatedPreset === "24h" ? "last 24 hours" : updatedPreset === "7d" ? "last 7 days" : updatedPreset === "30d" ? "last 30 days" : "today";
      const how = filters.updHow ? ` · ${LAST_CHANGE_SOURCE_LABEL[filters.updHow] ?? filters.updHow}` : "";
      bits.push(`Updated: ${preset}${how}`);
    }
    return bits.join(" · ");
  };
  const buildExportOptions = (plan) => {
    const source = plan.scope === "all" ? masterRows : visibleRows;
    return {
      rows: source,
      // Every export keeps the identity quartet (Facility, Facility Type,
      // Block, PHC) as SEPARATE columns plus both document-status columns,
      // even though the on-screen Facility cell merges the first three.
      columns: withExportEssentials(plan.columns),
      labels,
      filtersText: plan.scope === "all" ? "None — all facilities" : describeFilters() || "None",
      generatedBy: data?.me.appRole ? `NQAS Tracker (${data.me.appRole})` : "NQAS Tracker",
      extras: plan.extras,
      // Part D ⑧: the Excel freeze panes mirror the frozen-columns setting.
      frozenDataColumns: displaySettings.frozenColumns.length,
      frozenKeys: displaySettings.frozenColumns,
      // Part C ⑦: optional "Mark recently updated cells" (dialog checkbox).
      ...plan.markRecent ? {
        recentMarks: recentByFacility,
        recentLegend: recentLegend ?? "Recently updated cells"
      } : {},
      fileNameBase: `facility-master-list-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}`
    };
  };
  const downloadBlob = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };
  const quickExport = (format, pdf) => {
    const columns = orderedVisibleColumns(view, displaySettings.frozenColumns);
    void runExport({
      format,
      scope: "filtered",
      columns,
      pdf: pdf ?? {},
      extras: { surveillanceDue: false, fireNocAlerts: false, gapClosure: false },
      markRecent: false,
      filtersText: describeFilters() || "None"
    });
  };
  const runExport = async (plan) => {
    const opts = buildExportOptions(plan);
    if (plan.format !== "print" && opts.rows.length === 0) {
      toast.error("Nothing to export — no rows match the current filters");
      return;
    }
    try {
      if (plan.format === "xlsx") {
        await exportMasterWorkbook(opts, (buf, name) => {
          downloadBlob(
            new Blob([buf], {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            }),
            name
          );
        });
      } else if (plan.format === "pdf") {
        exportMasterPdf(opts, plan.pdf, downloadBlob);
      } else if (plan.format === "csv") {
        exportMasterCsv(opts, downloadBlob);
      } else {
        window.print();
        return;
      }
      toast.success(`Exported ${opts.rows.length} facilit${opts.rows.length === 1 ? "y" : "ies"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  };
  const exportProfilesBulk = async () => {
    try {
      await exportFacilitiesBulkProfile(
        // Same mapper as the single-facility profile export (and as the Admin
        // Settings backup action), so the columns always line up.
        trackerRowsToBulkRows(filtered),
        { generatedBy: data?.me.appRole ? `NQAS Tracker (${data.me.appRole})` : "" }
      );
      toast.success(`Profile workbook exported (${filtered.length} facilities)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  };
  const chips = [];
  const pushMulti = (key, values, setter, label) => {
    for (const v of values)
      chips.push({
        key: `${key}:${v}`,
        label: label(v),
        onRemove: () => setter(values.filter((x) => x !== v))
      });
  };
  if (search.trim())
    chips.push({ key: "q", label: `Search “${search.trim()}”`, onRemove: () => resetSearch() });
  pushMulti("block", blockFilter, setBlockFilter, (v) => `Block: ${v}`);
  pushMulti("type", typeFilter, setTypeFilter, (v) => `Type: ${v}`);
  pushMulti("cycle", cycleFilter, setCycleFilter, (v) => `Cycle: ${v}`);
  pushMulti("elig", eligibilityFilter, setEligibilityFilter, (v) => `Eligible: ${v}`);
  pushMulti("cert", certFilter, setCertFilter, (v) => `Certification: ${v}`);
  pushMulti("status", statusFilter, setStatusFilter, (v) => `Status: ${v}`);
  pushMulti("docRep", docRepFilter, setDocRepFilter, (v) => `Docs report: ${v}`);
  pushMulti("bType", buildingTypeFilter, setBuildingTypeFilter, (v) => `Building: ${v}`);
  pushMulti("bStatus", buildingStatusFilter, setBuildingStatusFilter, (v) => `Building status: ${v}`);
  pushMulti("noc", nocStatusFilter, setNocStatusFilter, (v) => `Fire NOC: ${v}`);
  if (kpiFilter)
    chips.push({
      key: "kpi",
      label: KPI_LABELS[kpiFilter],
      onRemove: () => setKpiFilter(null)
    });
  if (metricFilter)
    chips.push({
      key: "metric",
      label: `Metric: ${METRIC_LABELS[metricFilter]}`,
      onRemove: () => patch({ metric: "" })
    });
  if (dueWindow > 0)
    chips.push({ key: "due", label: `Due ≤ ${dueWindow} days`, onRemove: () => setDueWindow(0) });
  if (scoreRange[0] > 0 || scoreRange[1] < 100)
    chips.push({
      key: "score",
      label: `Score ${scoreRange[0]}–${scoreRange[1]}%`,
      onRemove: () => setScoreRange([0, 100])
    });
  if (updatedPreset) {
    const presetLabel = updatedPreset === "any" ? "any time" : updatedPreset === "today" ? "today" : updatedPreset === "24h" ? "last 24 hours" : updatedPreset === "7d" ? "last 7 days" : updatedPreset === "30d" ? "last 30 days" : `${filters.updFrom || "any"} – ${filters.updTo || "today"}`;
    const how = filters.updHow ? ` · ${LAST_CHANGE_SOURCE_LABEL[filters.updHow] ?? filters.updHow}` : "";
    chips.push({
      key: "updated",
      label: `Updated: ${presetLabel}${how}`,
      onRemove: clearUpdated
    });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    AppShell,
    {
      title: "Facility Master List",
      subtitle: loaded ? `${masterRows.length} ${masterRows.length === 1 ? "facility" : "facilities"}` : "Loading facilities…",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        canAdd ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: "flex rounded-lg border border-border/60 bg-background p-0.5",
            role: "group",
            "aria-label": "Table mode",
            children: ["view", "edit"].map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                "aria-pressed": mode === m,
                "data-tip": m === "view" ? "The grouped read-only view" : "Switch to the editable table (in-row Update)",
                onClick: () => {
                  if (m === mode) return;
                  setMode(m);
                  if (m === "view") toast.success("Back to the grouped view");
                },
                className: cn(
                  "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium capitalize transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  mode === m ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
                ),
                children: [
                  m === "view" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "size-3.5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(PencilLine, { className: "size-3.5" }),
                  m === "view" ? "View" : "Edit"
                ]
              },
              m
            ))
          }
        ) : null,
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex overflow-hidden rounded-lg", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              variant: "outline",
              className: "rounded-r-none",
              disabled: !data,
              onClick: () => setExportOpen(true),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "size-4" }),
                " Export"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "outline",
                className: "rounded-l-none border-l-0 px-1.5",
                disabled: !data,
                "aria-label": "Export shortcuts",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "size-3.5" })
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => quickExport("xlsx"), children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "size-4" }),
                " Excel — current view"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => quickExport("pdf", { paper: "a4", orientation: "landscape" }), children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-4" }),
                " PDF — current view"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => quickExport("csv"), children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-4" }),
                " CSV — current view"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => quickExport("print"), children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "size-4" }),
                " Print"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuLabel, { children: "Facility profiles" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                DropdownMenuItem,
                {
                  onClick: () => void exportProfilesBulk(),
                  disabled: !data || filtered.length === 0,
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "size-4" }),
                    " Profiles – Excel (.xlsx)"
                  ]
                }
              )
            ] })
          ] })
        ] }),
        canAdd && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "outline",
            className: "gap-2",
            "data-tip": "SaQsham Document Status · Internal Assessment · Facility CSV",
            onClick: () => {
              window.location.assign("/bulk-import");
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "size-4" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden sm:inline", children: "Import" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              variant: "outline",
              className: "gap-1 px-2.5",
              disabled: !data,
              "aria-label": "More actions",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Ellipsis, { className: "size-4" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden sm:inline", children: "More" })
              ]
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", className: "w-56", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: resetView, "data-tip": "Back to the default view", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { className: "size-3.5" }),
              " Reset view"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              DropdownMenuItem,
              {
                onClick: () => setFocusMode((v) => !v),
                "data-tip": "Hides everything except the toolbar and the table (key F)",
                children: [
                  focusMode ? /* @__PURE__ */ jsxRuntimeExports.jsx(Maximize2, { className: "size-3.5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Minimize2, { className: "size-3.5" }),
                  focusMode ? "Exit focus mode" : "Focus mode",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-auto text-[10px] text-muted-foreground", children: "F" })
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => setColsOpen(true), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(SlidersHorizontal, { className: "size-3.5" }),
              " Column settings"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuLabel, { children: "Details" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => setLegendOpen(true), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { className: "size-3.5" }),
              " Help and legend"
            ] })
          ] })
        ] }),
        canAdd && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { className: "gap-2", onClick: () => setAddOpen(true), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "size-4" }),
          " Add facility"
        ] })
      ] }),
      children: [
        !loaded ? /* @__PURE__ */ jsxRuntimeExports.jsx(SkeletonRows, { rows: 10 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
          PageShell,
          {
            bodyScroll: false,
            footer: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                "data-testid": "master-status-line",
                className: "flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t border-border/60 bg-background/95 px-3 py-1.5 text-[11px] text-muted-foreground",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                    "Showing ",
                    /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "font-semibold text-foreground", children: visibleRows.length }),
                    " ",
                    "of ",
                    /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "font-semibold text-foreground", children: masterRows.length }),
                    " ",
                    masterRows.length === 1 ? "facility" : "facilities"
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "aria-hidden": true, children: "·" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                    "Data as of ",
                    dataAsOf ? `${toDisplayStamp(dataAsOf)} IST` : "-"
                  ] }),
                  iaPair && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "aria-hidden": true, children: "·" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                      "NQAS IA % ",
                      formatFyQuarter(iaPair.current.fy, iaPair.current.q),
                      " vs",
                      " ",
                      formatFyQuarter(iaPair.previous.fy, iaPair.previous.q),
                      iaCurrentProvisional ? " (provisional)" : ""
                    ] })
                  ] })
                ]
              }
            ),
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-full min-h-0 flex-col", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "shrink-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  UniversalFilterBar,
                  {
                    pageKey: "master.list",
                    fields: extraFields,
                    value: extraBar,
                    onChange: setExtraBar,
                    summary: `Showing ${visibleRows.length} of ${masterRows.length}`,
                    className: "mb-2"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass mb-2 flex items-center gap-2 overflow-x-auto rounded-xl border border-border/60 p-2 [scrollbar-width:thin]", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    FilterSearch,
                    {
                      value: searchInput,
                      onChange: setSearch,
                      placeholder: "Search facility, PHC, block, NIN",
                      inputRef: searchRef,
                      className: "min-w-44 flex-1 sm:max-w-64"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(CycleFilter, { showChip: false, className: "shrink-0" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    FilterDropdown,
                    {
                      label: "Block",
                      options: optionList(blockNames, optionCounts?.block),
                      value: blockFilter,
                      onChange: setBlockFilter,
                      triggerWidth: "w-32 shrink-0",
                      quietWhenEmpty: true
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    FilterDropdown,
                    {
                      label: "Facility Type",
                      options: optionList(facilityTypes, optionCounts?.type),
                      value: typeFilter,
                      onChange: setTypeFilter,
                      triggerWidth: "w-36 shrink-0",
                      quietWhenEmpty: true
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    FilterDropdown,
                    {
                      label: FACILITY_CURRENT_STATUS_LABEL,
                      options: optionList(statusOptions, optionCounts?.status),
                      value: statusFilter,
                      onChange: setStatusFilter,
                      triggerWidth: "w-40 shrink-0",
                      quietWhenEmpty: true
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Popover, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      Button,
                      {
                        variant: updatedPreset ? "secondary" : "outline",
                        className: "h-9 shrink-0 gap-2",
                        "data-testid": "updated-filter",
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(CalendarClock, { className: "size-4" }),
                          "Updated"
                        ]
                      }
                    ) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(PopoverContent, { align: "start", className: "w-80 space-y-3", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold", children: "Updated" }),
                        updatedPreset && /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "button",
                          {
                            type: "button",
                            onClick: clearUpdated,
                            className: "rounded-md px-1.5 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10",
                            children: "Clear"
                          }
                        )
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-1.5", children: [
                        [
                          ["today", "Today"],
                          ["24h", "Last 24 hours"],
                          ["7d", "Last 7 days"],
                          ["30d", "Last 30 days"]
                        ].map(([value, label]) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "button",
                          {
                            type: "button",
                            "aria-pressed": updatedPreset === value,
                            onClick: () => setUpdated({ preset: value }),
                            className: cn(
                              "min-h-9 rounded-lg border px-2 text-xs font-medium transition-colors",
                              updatedPreset === value ? "border-primary bg-primary text-primary-foreground" : "border-border/60 hover:bg-muted"
                            ),
                            children: label
                          },
                          value
                        )),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "button",
                          {
                            type: "button",
                            "aria-pressed": updatedPreset === "custom",
                            onClick: () => setUpdated({ preset: "custom" }),
                            className: cn(
                              "col-span-2 min-h-9 rounded-lg border px-2 text-xs font-medium transition-colors",
                              updatedPreset === "custom" ? "border-primary bg-primary text-primary-foreground" : "border-border/60 hover:bg-muted"
                            ),
                            children: "Custom range"
                          }
                        )
                      ] }),
                      updatedPreset === "custom" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "space-y-1 text-[11px] text-muted-foreground", children: [
                          "From",
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            Input,
                            {
                              type: "date",
                              className: "h-9 text-xs",
                              value: filters.updFrom,
                              onChange: (e) => setUpdated({ from: e.target.value })
                            }
                          )
                        ] }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "space-y-1 text-[11px] text-muted-foreground", children: [
                          "To",
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            Input,
                            {
                              type: "date",
                              className: "h-9 text-xs",
                              value: filters.updTo,
                              onChange: (e) => setUpdated({ to: e.target.value })
                            }
                          )
                        ] })
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2 border-t border-border/60 pt-2", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block space-y-1 text-[11px] text-muted-foreground", children: [
                          "How",
                          /* @__PURE__ */ jsxRuntimeExports.jsxs(
                            Select,
                            {
                              value: filters.updHow || "any",
                              onValueChange: (v) => setUpdated({ how: v === "any" ? "" : v }),
                              children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-9 text-xs", "aria-label": "Updated how", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
                                /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "any", className: "text-xs", children: "Any source" }),
                                  Object.entries(LAST_CHANGE_SOURCE_LABEL).map(([value, label]) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value, className: "text-xs", children: label }, value))
                                ] })
                              ]
                            }
                          )
                        ] }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block space-y-1 text-[11px] text-muted-foreground", children: [
                          "Updated by",
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            Input,
                            {
                              className: "h-9 text-xs",
                              placeholder: "Any user",
                              value: filters.updBy,
                              onChange: (e) => setUpdated({ by: e.target.value })
                            }
                          )
                        ] }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block space-y-1 text-[11px] text-muted-foreground", children: [
                          "Which field changed",
                          /* @__PURE__ */ jsxRuntimeExports.jsxs(
                            Select,
                            {
                              value: filters.updField || "any",
                              onValueChange: (v) => setUpdated({ field: v === "any" ? "" : v }),
                              children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-9 text-xs", "aria-label": "Which field changed", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
                                /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "any", className: "text-xs", children: "Any field" }),
                                  MASTER_COLUMNS.filter((c) => !c.key.startsWith("_") && c.key !== "actions").slice(0, 40).map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: c.key, className: "text-xs", children: c.label }, c.key))
                                ] })
                              ]
                            }
                          )
                        ] }),
                        (recentBatches ?? []).length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block space-y-1 text-[11px] text-muted-foreground", children: [
                          "From import batch",
                          /* @__PURE__ */ jsxRuntimeExports.jsxs(
                            Select,
                            {
                              value: filters.updBatch || "any",
                              onValueChange: (v) => setUpdated({ batch: v === "any" ? "" : v }),
                              children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-9 text-xs", "aria-label": "From import batch", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
                                /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "any", className: "text-xs", children: "Any batch" }),
                                  (recentBatches ?? []).map((b) => /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectItem, { value: String(b._id), className: "text-xs", children: [
                                    new Date(b.importedAt).toLocaleDateString("en-IN", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric"
                                    }),
                                    " ",
                                    "· ",
                                    b.kind === "ia" ? "IA" : "SaQsham",
                                    " · ",
                                    b.rowsUpdated,
                                    " facilities"
                                  ] }, b._id))
                                ] })
                              ]
                            }
                          )
                        ] })
                      ] })
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Popover, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", className: "h-9 shrink-0 gap-2", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SlidersHorizontal, { className: "size-4" }),
                      "More filters",
                      secondaryActiveCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground tabular-nums", children: secondaryActiveCount })
                    ] }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      PopoverContent,
                      {
                        align: "start",
                        className: "max-h-[70vh] w-80 space-y-3 overflow-y-auto",
                        onInteractOutside: (event) => {
                          const original = event.detail?.originalEvent;
                          const target = original?.target ?? event.target;
                          if (target?.closest?.("[data-filter-panel]")) event.preventDefault();
                        },
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold", children: "More filters" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-2", children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              FilterDropdown,
                              {
                                label: "NQAS Eligibility",
                                options: optionList(
                                  eligibilityOptions.map((o) => o.value),
                                  optionCounts?.eligibility,
                                  Object.fromEntries(eligibilityOptions.map((o) => [o.value, o.label]))
                                ),
                                value: eligibilityFilter,
                                onChange: setEligibilityFilter,
                                triggerWidth: "w-full"
                              }
                            ),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              FilterDropdown,
                              {
                                label: "NQAS Certification Status",
                                options: optionList([...certStatusOptions].sort(), optionCounts?.cert),
                                value: certFilter,
                                onChange: setCertFilter,
                                triggerWidth: "w-full"
                              }
                            ),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              FilterDropdown,
                              {
                                label: "Documents Status (Report)",
                                options: optionList(docReportOptions, optionCounts?.docRep),
                                value: docRepFilter,
                                onChange: setDocRepFilter,
                                triggerWidth: "w-full"
                              }
                            ),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              FilterDropdown,
                              {
                                label: "Building Type",
                                options: optionList(buildingTypeOptions, optionCounts?.btype),
                                value: buildingTypeFilter,
                                onChange: setBuildingTypeFilter,
                                triggerWidth: "w-full"
                              }
                            ),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              FilterDropdown,
                              {
                                label: "Facility Building Status",
                                options: optionList(buildingStatusOptions, optionCounts?.bstatus),
                                value: buildingStatusFilter,
                                onChange: setBuildingStatusFilter,
                                triggerWidth: "w-full"
                              }
                            ),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              FilterDropdown,
                              {
                                label: "Fire NOC Validity Status",
                                options: optionList(nocStatusFilterOptions, optionCounts?.noc),
                                value: nocStatusFilter,
                                onChange: setNocStatusFilter,
                                triggerWidth: "w-full"
                              }
                            )
                          ] }),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2 border-t border-border/60 pt-3", children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-medium text-muted-foreground", children: "Due window" }),
                              dueWindow > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
                                "button",
                                {
                                  type: "button",
                                  onClick: () => setDueWindow(0),
                                  className: "rounded-md px-1.5 py-0.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10",
                                  children: "Reset"
                                }
                              )
                            ] }),
                            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex gap-1 rounded-lg border border-border/60 p-1", children: [0, 30, 60, 90].map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                              "button",
                              {
                                type: "button",
                                onClick: () => setDueWindow(d),
                                "aria-pressed": dueWindow === d,
                                className: `min-h-8 flex-1 rounded-md px-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${dueWindow === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`,
                                children: d === 0 ? "Off" : `${d}d`
                              },
                              d
                            )) }),
                            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-medium text-muted-foreground", children: "Certified score %" }),
                              (scoreRange[0] > 0 || scoreRange[1] < 100) && /* @__PURE__ */ jsxRuntimeExports.jsx(
                                "button",
                                {
                                  type: "button",
                                  onClick: () => setScoreRange([0, 100]),
                                  className: "rounded-md px-1.5 py-0.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10",
                                  children: "Reset"
                                }
                              )
                            ] }),
                            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(
                                Slider,
                                {
                                  "aria-label": "Certified score range",
                                  min: 0,
                                  max: 100,
                                  step: 5,
                                  value: scoreRange,
                                  onValueChange: (v) => setScoreRange(v),
                                  className: "w-40"
                                }
                              ),
                              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "w-16 text-xs tabular-nums text-muted-foreground", children: [
                                scoreRange[0],
                                "–",
                                scoreRange[1],
                                "%"
                              ] })
                            ] }),
                            iaPeriodOptions.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-1 text-xs font-medium text-muted-foreground", children: "Compare quarters" }),
                              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                                Select,
                                {
                                  value: iaCursor ?? "latest",
                                  onValueChange: (v) => setIaCursor(v === "latest" ? null : v),
                                  children: [
                                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                                      SelectTrigger,
                                      {
                                        className: "h-9 w-full text-xs",
                                        "aria-label": "Compare quarters",
                                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {})
                                      }
                                    ),
                                    /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "latest", className: "text-xs", children: "IA compare: latest two quarters" }),
                                      iaPeriodOptions.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                                        SelectItem,
                                        {
                                          value: `${p.fy}:Q${p.q}`,
                                          className: "text-xs",
                                          children: [
                                            "IA compare: ",
                                            formatFyQuarter(p.fy, p.q),
                                            " × previous"
                                          ]
                                        },
                                        `${p.fy}:Q${p.q}`
                                      ))
                                    ] })
                                  ]
                                }
                              )
                            ] })
                          ] })
                        ]
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Popover, { open: viewMenuOpen, onOpenChange: setViewMenuOpen, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", className: "ml-auto h-9 shrink-0 gap-1.5", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "size-4" }),
                      " View",
                      /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "size-3.5 text-muted-foreground" })
                    ] }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(PopoverContent, { align: "end", className: "w-80 p-0", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-b border-border/60 p-3", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase", children: "Row density" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 gap-1.5", children: ["compact", "comfortable"].map((d) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          "button",
                          {
                            type: "button",
                            "aria-pressed": view.density === d,
                            onClick: () => setView({ ...view, density: d }),
                            className: cn(
                              "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-medium capitalize transition-colors",
                              view.density === d ? "border-primary bg-primary/10 text-foreground" : "border-border/60 text-muted-foreground hover:bg-muted"
                            ),
                            children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(Rows3, { className: "size-3.5" }),
                              " ",
                              d
                            ]
                          },
                          d
                        )) })
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-b border-border/60 p-3", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase", children: "Columns" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 gap-1.5", children: ["essentials", "certification", "documents", "all"].map((id) => {
                          const preset = COLUMN_PRESETS.find((p) => p.id === id);
                          if (!preset) return null;
                          return /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "button",
                            {
                              type: "button",
                              "aria-pressed": view.presetId === id,
                              onClick: () => {
                                setView({
                                  ...applyPreset(id, displaySettings.frozenColumns),
                                  density: view.density
                                });
                                setViewMenuOpen(false);
                              },
                              className: cn(
                                "min-h-9 rounded-lg border px-2 text-xs font-medium transition-colors",
                                view.presetId === id ? "border-primary bg-primary/10 text-foreground" : "border-border/60 text-muted-foreground hover:bg-muted"
                              ),
                              children: id === "all" ? "All" : preset.label
                            },
                            id
                          );
                        }) }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          Button,
                          {
                            type: "button",
                            variant: "outline",
                            size: "sm",
                            className: "mt-2 h-8 w-full gap-1.5 text-xs",
                            onClick: () => {
                              setViewMenuOpen(false);
                              setColsOpen(true);
                            },
                            children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(Columns3, { className: "size-3.5" }),
                              " Pick columns…"
                            ]
                          }
                        )
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1 border-b border-border/60 p-2", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          "button",
                          {
                            type: "button",
                            "aria-pressed": freezeOn,
                            onClick: () => setFreezeOn((on) => !on),
                            className: "flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-xs font-medium hover:bg-muted",
                            children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(PanelLeft, { className: "size-3.5 text-muted-foreground" }),
                              " Freeze columns",
                              freezeOn && /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "ml-auto size-3.5 text-primary" })
                            ]
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          "button",
                          {
                            type: "button",
                            "aria-pressed": recentOn,
                            onClick: () => setRecentOn((on) => !on),
                            className: "flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-xs font-medium hover:bg-muted",
                            children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "size-3.5 text-muted-foreground" }),
                              " Highlight updates",
                              recentOn && /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "ml-auto size-3.5 text-primary" })
                            ]
                          }
                        ),
                        recentLegend && recentOn && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-2 pb-1 text-[10px] leading-snug text-muted-foreground", children: recentLegend })
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2 p-2", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground", children: "Saved to your account" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          Button,
                          {
                            type: "button",
                            variant: "ghost",
                            size: "sm",
                            className: "h-8 gap-1.5 text-xs",
                            onClick: () => {
                              setViewMenuOpen(false);
                              resetView();
                            },
                            children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { className: "size-3.5" }),
                              " Reset view"
                            ]
                          }
                        )
                      ] })
                    ] })
                  ] })
                ] }),
                (restoredFrom || chips.length > 0) && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-2", children: chips.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                  FilterChips,
                  {
                    chips,
                    onClearAll: clearAllFilters,
                    onResetView: resetView,
                    showResetView: false,
                    compact: true,
                    className: "mb-0",
                    notice: restoredFrom ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                      RestoredNotice,
                      {
                        from: restoredFrom,
                        onDismiss: dismissRestored
                      }
                    ) : void 0
                  }
                ) : restoredFrom ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                  RestoredNotice,
                  {
                    from: restoredFrom,
                    onDismiss: dismissRestored
                  }
                ) : null }),
                !focusMode && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    className: "mb-2 flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                    role: "tablist",
                    "aria-label": "Facility quick views",
                    children: [
                      { id: "all", label: "All", count: quickTabCounts.all },
                      {
                        id: "attention",
                        label: "Needs attention",
                        count: quickTabCounts.attention
                      },
                      { id: "eligible", label: "Eligible", count: quickTabCounts.eligible },
                      {
                        id: "certified",
                        label: "Certified",
                        count: quickTabCounts.certified
                      },
                      {
                        id: "notEligible",
                        label: "Not eligible",
                        count: quickTabCounts.notEligible
                      }
                    ].map((tab) => {
                      const selected = activeQuickTab === tab.id;
                      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        "button",
                        {
                          type: "button",
                          role: "tab",
                          "aria-selected": selected,
                          onClick: () => openTab(tab.id),
                          className: cn(
                            "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                            selected ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border/70 bg-background text-foreground/75 hover:border-primary/40 hover:bg-accent"
                          ),
                          children: [
                            tab.label,
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              "span",
                              {
                                className: cn(
                                  "rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                                  selected ? "bg-white/25" : "bg-muted text-muted-foreground"
                                ),
                                children: tab.count
                              }
                            )
                          ]
                        },
                        tab.id
                      );
                    })
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-h-0 flex-1 flex-col", children: mode === "view" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "hidden min-h-0 flex-1 sm:flex sm:flex-col", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  GroupedMasterTable,
                  {
                    rows: visibleRows,
                    labels,
                    view,
                    sorting,
                    onSortingChange: setSorting,
                    onDensityChange: (density) => setView({ ...view, density }),
                    onOpenRow: openQuickRow,
                    onEditRow: (r) => {
                      setMode("edit");
                      toast.info(`Editing on — scroll to ${r.facility.name}`);
                    },
                    onColumnsClick: () => setColsOpen(true),
                    searchQuery: search,
                    totalRowCount: masterRows.length,
                    onClearFilters: clearAllFilters,
                    scrollRef: tableScrollRef,
                    fillHeight: true,
                    hideToolbar: true,
                    onToggleGroup: toggleGroup,
                    selectedRowId: filters.facility || null,
                    pinnedKeys: displaySettings.frozenColumns,
                    freezeActive,
                    freezeToggle: { on: freezeOn, onChange: setFreezeOn },
                    recentByFacility,
                    recentOn: recentOn && displaySettings.recentDays > 0,
                    recentLegend,
                    highlightToggle: { on: recentOn, onChange: setRecentOn },
                    rowActions: {
                      visible: rowActionsSetting.visible,
                      pinRight: rowActionsSetting.pinRight,
                      canEdit: canAdd,
                      isAdmin: data?.me.appRole === "admin",
                      label: rowActionsSetting.label,
                      onUpdate: openUpdateFor,
                      onOpenProfile: (r) => {
                        window.location.assign(`/facilities/${r.facility._id}`);
                      },
                      onViewHistory: openHistoryFor,
                      onPrint: printSheet,
                      onExport: (r, format) => void exportQuickRow(r, format),
                      onPrefetch: (r) => setPrefetchId(String(r.facility._id)),
                      savedIds,
                      draftIds,
                      compact: true
                    }
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-h-0 flex-1 flex-col overflow-y-auto sm:hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  MobileFacilityCards,
                  {
                    rows: visibleRows,
                    labels,
                    onOpen: openQuickRow,
                    onClear: clearAllFilters,
                    canEdit: canAdd,
                    onUpdate: openUpdateFor,
                    onViewHistory: openHistoryFor,
                    onPrint: printSheet,
                    onPrefetch: (r) => setPrefetchId(String(r.facility._id)),
                    savedIds,
                    draftIds,
                    query: search
                  }
                ) })
              ] }) : (
                /* ============ EDIT MODE — THE SAME shared grid ============
                Root cause fixed here: edit mode used to render a DIFFERENT
                legacy table (AutoFitTableScroll + shadcn <Table>), whose header
                never shared the group band/frozen-header contract — so scrolling
                the edit table could unstick the header. Now BOTH modes render
                GroupedMasterTable; in edit mode every cell renders the compact
                editable widget from components/master/EditModeCells. */
                /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "hidden min-h-0 flex-1 sm:flex sm:flex-col", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      GroupedMasterTable,
                      {
                        fillHeight: true,
                        hideToolbar: true,
                        onToggleGroup: toggleGroup,
                        selectedRowId: filters.facility || null,
                        rows: visibleRows,
                        labels,
                        view: editView,
                        sorting,
                        onSortingChange: setSorting,
                        onOpenRow: openQuickRow,
                        onColumnsClick: () => setColsOpen(true),
                        searchQuery: search,
                        totalRowCount: masterRows.length,
                        onClearFilters: clearAllFilters,
                        scrollRef: tableScrollRef,
                        pinnedKeys: ["facility", "type"],
                        freezeActive,
                        freezeToggle: { on: freezeOn, onChange: setFreezeOn },
                        rowActions: {
                          visible: rowActionsSetting.visible,
                          pinRight: rowActionsSetting.pinRight,
                          canEdit: canAdd,
                          label: rowActionsSetting.label,
                          compact: compactRowActions,
                          onUpdate: openUpdateFor
                        },
                        edit: {
                          activeCell,
                          onActivate: (next) => setActiveCell(next),
                          readOnlyReasons,
                          renderEditableCell: (row, key) => {
                            const r = row;
                            const id = String(r.facility._id);
                            if (!canAdd) return null;
                            if (!isEditableCellKey(key)) return null;
                            if (!activeCell || activeCell.rowId !== id || activeCell.key !== key)
                              return null;
                            return /* @__PURE__ */ jsxRuntimeExports.jsx(
                              EditableTrackerCell,
                              {
                                row: r,
                                cellKey: key,
                                state: rowDrafts.get(r),
                                options: editorOptions,
                                canEdit: canAdd,
                                busy: editBusyIds.has(id),
                                handlers: {
                                  onField: (k, v) => {
                                    rowDrafts.setField(r, k, v);
                                  },
                                  onFile: (slot, val) => rowDrafts.setFile(r, slot, val),
                                  onToggleClear: (slot, on) => rowDrafts.toggleClear(r, slot, on),
                                  onEligibility: (v) => void saveEligibility(r, v)
                                }
                              }
                            );
                          },
                          renderActionCell: (row) => {
                            const r = row;
                            const id = String(r.facility._id);
                            if (!canAdd) {
                              return /* @__PURE__ */ jsxRuntimeExports.jsx(
                                RowActionsCell,
                                {
                                  row,
                                  canEdit: false,
                                  onOpenProfile: (x) => {
                                    window.location.assign(`/facilities/${x.facility._id}`);
                                  },
                                  onViewHistory: openHistoryFor
                                }
                              );
                            }
                            return /* @__PURE__ */ jsxRuntimeExports.jsx(
                              EditableUpdateCell,
                              {
                                row: r,
                                state: rowDrafts.get(r),
                                canEdit: canAdd,
                                isAdmin: data?.me.appRole === "admin",
                                busy: editBusyIds.has(id),
                                onUpdate: (row2) => openUpdateFor(row2),
                                onSave: (row2, s) => saveRow(row2, s),
                                onDelete: () => setDeleteTarget(r),
                                onDiscard: (row2) => {
                                  rowDrafts.reset(row2);
                                  toast.info(
                                    `Changes discarded — ${row2.facility.name}`
                                  );
                                },
                                label: rowActionsSetting.label
                              }
                            );
                          }
                        }
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "div",
                      {
                        "data-testid": "edit-unsaved-bar",
                        className: "sticky bottom-2 z-30",
                        children: unsavedCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-background/95 px-4 py-2 shadow-lg backdrop-blur", children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-muted-foreground", children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "font-semibold text-foreground", children: unsavedCount }),
                            " ",
                            "row",
                            unsavedCount === 1 ? "" : "s",
                            " with unsaved changes — press ",
                            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "Update" }),
                            " (Save) on each row to commit in one transaction, or open the row's quick view to",
                            " ",
                            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "Review changes" }),
                            " first. Drafts are kept while you scroll."
                          ] }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            Button,
                            {
                              variant: "outline",
                              size: "sm",
                              className: "h-8",
                              "data-tip": "Discard every unsaved draft",
                              onClick: () => {
                                rowDrafts.resetAll();
                                toast.info("All unsaved drafts discarded");
                              },
                              children: "Discard all"
                            }
                          )
                        ] })
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-h-0 flex-1 flex-col overflow-y-auto sm:hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    MobileFacilityCards,
                    {
                      rows: visibleRows,
                      labels,
                      onOpen: openQuickRow,
                      onClear: clearAllFilters,
                      canEdit: canAdd,
                      onUpdate: openUpdateFor,
                      onViewHistory: openHistoryFor,
                      onPrefetch: (r) => setPrefetchId(String(r.facility._id)),
                      savedIds,
                      draftIds,
                      query: search
                    }
                  ) })
                ] })
              ) })
            ] })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ColumnManager,
          {
            open: colsOpen,
            onOpenChange: setColsOpen,
            labels,
            view,
            onChange: setView,
            pinnedKeys: displaySettings.frozenColumns
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Dialog,
          {
            open: legendOpen || legendDeepLink,
            onOpenChange: (o) => {
              setLegendOpen(o);
              if (!o) consumeDeepLink("legend");
            },
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "glass-strong max-h-[85vh] overflow-y-auto sm:max-w-lg", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Help and legend" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "How to read the Facility Master List — colours, chips and cell conventions." })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 text-sm text-foreground/90", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-wide text-muted-foreground", children: "Status colours" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "space-y-1", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center gap-2", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: "Quality Certified" }),
                      " — holds a quality certification."
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center gap-2", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: "Certified" }),
                      " — certified (with conditionality where shown)."
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center gap-2", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: "Expired" }),
                      " — validity or Fire NOC passed; fix before recertification."
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center gap-2", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: "Not Obtained" }),
                      " — Fire NOC explicitly not obtained; record it when issued."
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-wide text-muted-foreground", children: "Cells" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "list-inside list-disc space-y-1 text-xs text-muted-foreground", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Dates are DD-MMM-YYYY; money is ₹ Indian grouping." }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "A blank never counts as 0 — it shows “-”." }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Due chips show “Overdue 12d”, “Due in 20d” or “Valid till 2028”." }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "The amber corner dot means the cell changed recently (see the Highlight updates toggle)." }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Click a KPI chip or a smart-view tab to filter; click again to clear." }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Keyboard: “/” focuses search, “F” toggles Focus mode, arrows walk the grid in edit mode, Enter/F2 opens an editor, Esc cancels." })
                  ] })
                ] })
              ] })
            ] })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ExportDialog,
          {
            open: exportOpen,
            onOpenChange: setExportOpen,
            counts: {
              filtered: visibleRows.length,
              all: masterRows.length
            },
            visibleColumns: orderedVisibleColumns(view, displaySettings.frozenColumns),
            hasRecentUpdates: recentOn && displaySettings.recentDays > 0,
            recentLegend: recentLegend ?? void 0,
            filtersText: describeFilters() || "None — all facilities",
            onRun: (plan) => void runExport(plan)
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FacilityQuickView,
          {
            row: quickRow,
            open: !!quickRow,
            onOpenChange: (o) => {
              if (o) return;
              closeQuickRow();
              window.setTimeout(() => focusLastRowActionTrigger(), 0);
            },
            labels,
            canEdit: canAdd,
            siblings: visibleRows,
            onNavigate: navigateQuickRow,
            initialSection: filters.section || "overview",
            onSectionChange: setQuickSection,
            onSave: saveQuickRow,
            onPrint: printSheet,
            onExport: (r, format) => void exportQuickRow(r, format),
            settings: settings?.settings,
            userId: user?._id ?? void 0,
            dataAsOf,
            recentDays: displaySettings.recentDays,
            onPrefetch: (r) => setPrefetchId(String(r.facility._id)),
            editRequest: quickEditRequest && quickRow && quickEditRequest.facilityId === String(quickRow.facility._id) ? { token: quickEditRequest.token, facilityId: quickEditRequest.facilityId } : null
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(QuickViewPrefetch, { facilityId: prefetchId }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          AlertDialog,
          {
            open: !!deleteTarget,
            onOpenChange: (o) => {
              if (!o) setDeleteTarget(null);
            },
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogContent, { className: "glass-strong", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogHeader, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogTitle, { children: [
                  "Delete ",
                  deleteTarget?.facility.name,
                  "?"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogDescription, { children: "This permanently removes the facility with all its certification cycles, assessments, fund/NOC/building records and audit history. This cannot be undone." })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogFooter, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogCancel, { onClick: () => setDeleteTarget(null), children: "Cancel" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  AlertDialogAction,
                  {
                    className: "bg-destructive text-white",
                    onClick: async () => {
                      if (!deleteTarget) return;
                      try {
                        await deleteFacility({
                          facilityId: deleteTarget.facility._id
                        });
                        toast.success("Facility deleted");
                        rowDrafts.reset(deleteTarget);
                        setDeleteTarget(null);
                      } catch (err) {
                        toast.error(
                          err instanceof Error ? err.message : "Delete failed"
                        );
                      }
                    },
                    children: "Delete permanently"
                  }
                )
              ] })
            ] })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          AddFacilityDialog,
          {
            open: addOpen || addDeepLink,
            onOpenChange: (o) => {
              setAddOpen(o);
              if (!o) consumeDeepLink("add");
            },
            blocks: (data?.blocks ?? []).map((b) => b.name),
            facilityTypes,
            eligibilityOptions,
            canEdit: data?.me.appRole === "admin" || data?.me.appRole === "entry",
            onCreate: async (values) => {
              try {
                await createFacility(values);
                toast.success("Facility added");
                setAddOpen(false);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to add facility");
              }
            }
          }
        )
      ]
    }
  );
}
function AddFacilityDialog({
  open,
  onOpenChange,
  blocks,
  facilityTypes,
  eligibilityOptions,
  canEdit,
  onCreate
}) {
  const [form, setForm] = reactExports.useState({
    block: "",
    phc: "",
    name: "",
    facilityType: "",
    phaseType: "",
    eligibility: "",
    ninNumber: "",
    saqshamFacilityType: "",
    saqshamCategory: "",
    remarks: ""
  });
  const [busy, setBusy] = reactExports.useState(false);
  if (!canEdit) return null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async () => {
    if (!form.block || !form.name || !form.facilityType || !form.eligibility) {
      toast.error("Block, facility name, type and eligibility are required");
      return;
    }
    setBusy(true);
    await onCreate({
      block: form.block,
      phc: form.phc || form.block,
      name: form.name,
      facilityType: form.facilityType,
      phaseType: form.phaseType || void 0,
      eligibility: form.eligibility,
      ninNumber: form.ninNumber || void 0,
      saqshamFacilityType: form.saqshamFacilityType || void 0,
      saqshamCategory: form.saqshamCategory || void 0,
      remarks: form.remarks || void 0
    });
    setBusy(false);
    setForm({
      block: "",
      phc: "",
      name: "",
      facilityType: "",
      phaseType: "",
      eligibility: "",
      ninNumber: "",
      saqshamFacilityType: "",
      saqshamCategory: "",
      remarks: ""
    });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "glass-strong max-h-[85vh] overflow-y-auto sm:max-w-lg", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Add facility" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "Register a facility. If it is NQAS-eligible, its first certification cycle starts automatically." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FieldGrid, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Block name *" }),
        blocks.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: form.block, onValueChange: (v) => set("block", v), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "glass-input mt-1 w-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Select block" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: blocks.map((b) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: b, children: b }, b)) })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            className: "glass-input mt-1",
            value: form.block,
            onChange: (e) => set("block", e.target.value),
            placeholder: "e.g. Bhadrachalam"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "PHC name" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            className: "glass-input mt-1",
            value: form.phc,
            onChange: (e) => set("phc", e.target.value),
            placeholder: "Defaults to block"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sm:col-span-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Facility name *" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            className: "glass-input mt-1",
            value: form.name,
            onChange: (e) => set("name", e.target.value),
            placeholder: "e.g. Chintalapudi CHC"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "NIN Number" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            className: "glass-input mt-1",
            value: form.ninNumber,
            onChange: (e) => set("ninNumber", e.target.value),
            placeholder: "Unique ID — prevents duplicate imports"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Facility type *" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: form.facilityType, onValueChange: (v) => set("facilityType", v), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "glass-input mt-1 w-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Select type" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: facilityTypes.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: t, children: t }, t)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Phase type" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            className: "glass-input mt-1",
            value: form.phaseType,
            onChange: (e) => set("phaseType", e.target.value),
            placeholder: "e.g. Phase I"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "NQAS eligibility *" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: form.eligibility, onValueChange: (v) => set("eligibility", v), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "glass-input mt-1 w-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Select eligibility" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: eligibilityOptions.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: o.value, children: o.label }, o.value)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "SaQsham Facility_Type" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            className: "glass-input mt-1",
            value: form.saqshamFacilityType,
            onChange: (e) => set("saqshamFacilityType", e.target.value)
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sm:col-span-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "SaQsham Facility Name/Category" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            className: "glass-input mt-1",
            value: form.saqshamCategory,
            onChange: (e) => set("saqshamCategory", e.target.value)
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sm:col-span-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "General remarks" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Textarea,
          {
            className: "glass-input mt-1",
            value: form.remarks,
            onChange: (e) => set("remarks", e.target.value),
            rows: 2
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), children: "Cancel" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: submit, disabled: busy, children: [
        busy && /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-2 size-4 animate-spin" }),
        "Add facility"
      ] })
    ] })
  ] }) });
}
function FieldGrid({ children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-3 sm:grid-cols-2", children });
}
function QuickViewPrefetch({ facilityId }) {
  useQuery(
    api.facilities.getFacilityProfile,
    facilityId ? { facilityId } : "skip"
  );
  return null;
}

const FacilityList$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  FieldGrid,
  default: FacilityList
}, Symbol.toStringTag, { value: 'Module' }));

export { FieldGrid as F, FacilityList$1 as a, loadLastListUrl as l };
