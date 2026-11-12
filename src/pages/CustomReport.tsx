/** Custom Report Builder — drag-and-drop, Excel-style pivot reporting.
 *
 *  Flow (aimed at a district officer typing a report in under a minute):
 *    Step 1  Pick fields   — searchable sidebar with type icons, recents
 *    Step 2  Arrange       — Rows / Columns / Values / Filters zones
 *    Step 3  Preview       — live pivot, format-when-ready via Export
 *
 *  Everything reads the same live tracker data as the Facility Master List
 *  (`ops.listFacilityRowsFast`), so any report is over real facilities, and
 *  the row scope already follows the viewer's role (State Admin sees all,
 *  block users see their own blocks).
 *
 *  The maths lives in @/lib/pivot, the exports in @/lib/pivotExport; this
 *  file is the view. */

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMutation, useQuery } from "convex/react";
import {
  FACILITY_CURRENT_STATUS_LABEL,
  deprecatedColumns,
} from "@/lib/masterColumns";
import { toast } from "sonner";
import {
  ChevronRight,
  Download,
  Info,
  Layers,
  LayoutTemplate,
  ListFilter,
  PanelLeftClose,
  PanelLeftOpen,
  Redo2,
  RotateCcw,
  Sparkles,
  Table2,
  Undo2,
  X,
} from "lucide-react";


import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { FacilityCell } from "@/components/FacilityCell";
import { CycleFilter, useCycleScope } from "@/components/CycleFilter";
import FilterDropdown from "@/components/FilterDropdown";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { cn } from "@/lib/utils";
import { readFieldPanelPreference, writeFieldPanelPreference } from "@/lib/customReportPrefs";
import {
  allowedAggs,
  buildPivot,
  applyDateLabelOptions,
  createPivotFields,
  defaultAggFor,
  defaultPivotConfig,
  prunePivotConfig,
  distinctValues,
  fieldBlankCounts,
  pivotDrilldown,
  type AggregateKind,
  type DecimalOption,
  type PivotConfig,
  type PivotFieldDef,
  type PivotResult,
  type PivotRow,
  type PivotSort,
} from "@/lib/pivot";

import { DropZone, ZONE_META, ZONE_ORDER, ZonePlaceholder, ZoneChip, AggPicker } from "@/components/custom-report/DropZone";
import type { ZoneId } from "@/components/custom-report/DropZone";
import { FieldList } from "@/components/custom-report/FieldList";
import {
  PivotTable,
  pivotCounter,
  statusColumnIndexes,
  type DrillTarget,
  type FormatMode,
  type Layout,
  type ReportStyle,
  type ValueLabelsMode,
} from "@/components/custom-report/PivotTable";
import { ExportDialog } from "@/components/custom-report/ExportDialog";
import {
  PivotChartCard,
  chartDataFrom,
  stackedDataFor,
} from "@/components/custom-report/PivotChartCard";
import {
  SavedViewsMenu,
  type SavedViewEntry,
} from "@/components/custom-report/SavedViews";

/* ------------------------------------------------------------------ */
/* view state                                                          */
/* ------------------------------------------------------------------ */

interface ViewState {
  config: PivotConfig;
  layout: Layout;
  decimals: DecimalOption;
  style: ReportStyle;
  formatMode: FormatMode;
  /** Auto keeps value labels OFF for a single value (the corner caption
   *  carries it); Always/Never force the second header level on/off. */
  valueLabels: ValueLabelsMode;
  /** Month group labels: "Oct 2022" (default) or the raw ISO key. Sorting
   *  always follows the ISO key either way. */
  monthLabels: "friendly" | "iso";
}

const DEFAULT_STYLE: ReportStyle = {
  subtotals: true,
  grandTotals: true,
  grandTotalColumn: true,
  striped: true,
  borders: true,
  highlightTotals: true,
};

const LAYOUT_LABELS: Record<Layout, string> = {
  compact: "Compact",
  outline: "Outline",
  tabular: "Tabular",
};
const LAYOUT_HINTS: Record<Layout, string> = {
  compact: "One indented label column",
  outline: "One column per row field, indented",
  tabular: "One column per row field, labels repeated",
};

const FORMAT_LABELS: Record<FormatMode, string> = {
  off: "Plain numbers",
  heatmap: "Heat-map shading",
  databars: "Data bars",
  chips: "Status colour chips",
};

const VIEWS_KEY = "nqas.customReport.views.v1";
const CURRENT_KEY = "nqas.customReport.current.v1";
const DEFAULT_VIEW_KEY = "nqas.customReport.defaultView.v1";

/** Columns removed from the app (the retired IA tracker). Saved views and
 *  shared links keep opening; the retired field is dropped silently. */
const RETIRED_FIELDS = new Set(deprecatedColumns().map((c) => c.key));
const pruneSavedConfig = (config: PivotConfig): PivotConfig =>
  prunePivotConfig(config, RETIRED_FIELDS);

/** Ready-made NQAS reports — one click each. */
const TEMPLATES: {
  id: string;
  label: string;
  desc: string;
  make: () => Pick<ViewState, "config">;
}[] = [
  {
    id: "block-cert",
    label: "Block × Certification status",
    desc: "Count of facilities per block, split by certification result",
    make: () => ({
      config: {
        rows: ["block"],
        columns: ["certStatus"],
        values: [{ fieldId: "facilityName", agg: "count" }],
        filters: {},
        sort: { kind: "label", dir: "asc" },
      },
    }),
  },
  {
    id: "type-cycle",
    label: "Facility Type × Certification Cycle",
    desc: "How each facility type is spread across certification cycles",
    make: () => ({
      config: {
        rows: ["facilityType"],
        columns: ["cycleNumber"],
        values: [{ fieldId: "facilityName", agg: "count" }],
        filters: {},
        sort: { kind: "label", dir: "asc" },
      },
    }),
  },
  {
    id: "pipeline",
    label: `${FACILITY_CURRENT_STATUS_LABEL} summary`,
    desc: `Facilities and % of total per merged ${FACILITY_CURRENT_STATUS_LABEL.toLowerCase()}`,
    make: () => ({
      config: {
        rows: ["pipelineStatus"],
        columns: [],
        values: [
          { fieldId: "facilityName", agg: "count" },
          { fieldId: "facilityName", agg: "pctTotal" },
        ],
        filters: {},
        sort: { kind: "total", vIndex: 0, dir: "desc" },
      },
    }),
  },
  {
    id: "fund-block",
    label: "Gap Closure Fund by Block",
    desc: "Sanctioned amount and facility count per block",
    make: () => ({
      config: {
        rows: ["block"],
        columns: ["gcYear"],
        values: [
          { fieldId: "gapAmount", agg: "sum" },
          { fieldId: "facilityName", agg: "count" },
        ],
        filters: {},
        sort: { kind: "total", vIndex: 0, dir: "desc" },
      },
    }),
  },
];

/* ------------------- persistence / share-link helpers ------------------- */

function loadJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / disabled — the report itself still works */
  }
}

function decodeShareParam(): ViewState | null {
  const param = new URLSearchParams(window.location.search).get("report");
  if (!param) return null;
  try {
    const json = new TextDecoder().decode(
      Uint8Array.from(atob(param), (ch) => ch.charCodeAt(0)),
    );
    const parsed = JSON.parse(json) as Partial<ViewState>;
    if (!parsed.config) return null;
    return {
      config: parsed.config,
      layout: parsed.layout ?? "outline",
      decimals: parsed.decimals ?? "auto",
      style: { ...DEFAULT_STYLE, ...(parsed.style ?? {}) },
      formatMode: parsed.formatMode ?? "off",
      valueLabels: parsed.valueLabels ?? "auto",
      monthLabels: parsed.monthLabels ?? "friendly",
    };
  } catch {
    return null;
  }
}

function encodeShareParam(view: ViewState): string {
  const json = JSON.stringify({ ...view });
  return btoa(String.fromCharCode(...new TextEncoder().encode(json)));
}

function initialView(): ViewState {
  const shared = decodeShareParam();
  if (shared) return { ...shared, config: pruneSavedConfig(shared.config) };
  const defaultId = loadJson<string>(DEFAULT_VIEW_KEY);
  if (defaultId) {
    const saved = loadJson<SavedViewEntry[]>(VIEWS_KEY) ?? [];
    const hit = saved.find((v) => v.id === defaultId);
    if (hit?.view)
      return {
        ...(hit.view as ViewState),
        config: pruneSavedConfig((hit.view as ViewState).config),
        style: { ...DEFAULT_STYLE, ...(hit.view as ViewState).style },
        formatMode: (hit.view as ViewState).formatMode ?? "off",
        valueLabels: (hit.view as ViewState).valueLabels ?? "auto",
        monthLabels: (hit.view as ViewState).monthLabels ?? "friendly",
      };
  }
  const stored = loadJson<Partial<ViewState>>(CURRENT_KEY);
  return {
    config: pruneSavedConfig(stored?.config ?? defaultPivotConfig()),
    layout: stored?.layout ?? "outline",
    decimals: stored?.decimals ?? "auto",
    style: { ...DEFAULT_STYLE, ...(stored?.style ?? {}) },
    formatMode: stored?.formatMode ?? "off",
    valueLabels: stored?.valueLabels ?? "auto",
    monthLabels: stored?.monthLabels ?? "friendly",
  };
}

type DragItem =
  | { from: "sidebar"; fieldId: string }
  | { from: "zone"; zone: ZoneId; fieldId: string; index?: number };

/** Where a field currently sits in the report (null = unused). */
function zoneOfField(config: PivotConfig, fieldId: string): ZoneId | null {
  if (config.rows.includes(fieldId)) return "rows";
  if (config.columns.includes(fieldId)) return "columns";
  if (config.values.some((v) => v.fieldId === fieldId)) return "values";
  if (fieldId in config.filters) return "filters";
  return null;
}

/* ------------------------------------------------------------------ */
/* page                                                                */
/* ------------------------------------------------------------------ */

export default function CustomReportPage() {
  const cycleScope = useCycleScope();
  const data = useQuery(api.ops.listFacilityRowsFast, { cycle: cycleScope });
  const settingsQ = useQuery(api.facilities.getAppSettings, {});

  /* ---- undo / redo history ---- */
  const [history, setHistory] = useState<{ stack: ViewState[]; index: number }>(
    () => ({ stack: [initialView()], index: 0 }),
  );
  const view = history.stack[history.index];
  const canUndo = history.index > 0;
  const canRedo = history.index < history.stack.length - 1;

  const update = useCallback(
    (fn: (prev: ViewState) => ViewState) => {
      setHistory((h) => {
        const next = fn(h.stack[h.index]);
        if (next === h.stack[h.index]) return h;
        return {
          stack: [...h.stack.slice(0, h.index + 1), next].slice(-40),
          index: Math.min(h.index + 1, 39),
        };
      });
    },
    [],
  );
  const undo = useCallback(
    () => setHistory((h) => ({ ...h, index: Math.max(0, h.index - 1) })),
    [],
  );
  const redo = useCallback(
    () =>
      setHistory((h) => ({
        ...h,
        index: Math.min(h.stack.length - 1, h.index + 1),
      })),
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        (e.key.toLowerCase() === "z" && e.shiftKey) ||
        e.key.toLowerCase() === "y"
      ) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const { config, layout, decimals, style, formatMode } = view;
  const patchView = (next: Partial<ViewState>) =>
    update((prev) => ({ ...prev, ...next }));
  const patchConfig = (next: Partial<PivotConfig>) =>
    update((prev) => ({ ...prev, config: { ...prev.config, ...next } }));

  /* ---- misc ui state ---- */
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const [drag, setDrag] = useState<DragItem | null>(null);
  const [hoverZone, setHoverZone] = useState<ZoneId | "sidebar" | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    readFieldPanelPreference(typeof window === "undefined" ? undefined : window.localStorage),
  );
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = Number(localStorage.getItem("nqas.customReport.sidebarWidth"));
    return Number.isFinite(saved) && saved >= 260 && saved <= 420 ? saved : 300;
  });
  const [recent, setRecent] = useState<string[]>([]);
  const [resetOpen, setResetOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [views, setViews] = useState<SavedViewEntry[]>(
    () => loadJson<SavedViewEntry[]>(VIEWS_KEY) ?? [],
  );
  const saveDefinition = useMutation(api.reportDefinitions.save);
  const removeDefinition = useMutation(api.reportDefinitions.remove);
  const syncedViews = useRef(false);
  const [defaultViewId, setDefaultViewId] = useState<string | null>(
    () => loadJson<string>(DEFAULT_VIEW_KEY),
  );
  const [drill, setDrill] = useState<{
    title: string;
    rows: PivotRow[];
  } | null>(null);

  /* Publish local saved views once so Admin → Pages can list them as report
     definitions. The server id is stored on the local entry, never regenerated. */
  useEffect(() => {
    if (syncedViews.current) return;
    syncedViews.current = true;
    const missing = views.filter((v) => !v.definitionId);
    if (missing.length === 0) return;
    void (async () => {
      const next = [...views];
      let changed = false;
      for (const entry of missing) {
        try {
          const res = await saveDefinition({ name: entry.name, view: entry.view });
          const at = next.findIndex((v) => v.id === entry.id);
          if (at >= 0) next[at] = { ...next[at], definitionId: res.id };
          changed = true;
        } catch {
          /* a signed-out viewer can still use local views */
        }
      }
      if (changed) {
        setViews(next);
        saveJson(VIEWS_KEY, next);
      }
    })();
  }, [views, saveDefinition]);

  /* Persist the working view per browser (after the share param wins over it). */
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("report")) return;
    saveJson(CURRENT_KEY, view);
  }, [view]);

  const fields = useMemo(
    () =>
      applyDateLabelOptions(
        createPivotFields(
          settingsQ?.settings as Record<string, unknown> | undefined,
        ),
        view.monthLabels,
      ),
    [settingsQ, view.monthLabels],
  );
  const fieldById = useMemo(() => new Map(fields.map((f) => [f.id, f])), [fields]);
  const rows = useMemo(() => (data?.rows ?? []) as unknown as PivotRow[], [data]);
  const totalRows = rows.length;
  const blankCounts = useMemo(
    () => fieldBlankCounts(rows, fields),
    [rows, fields],
  );

  /* The pivot can be expensive on a large district. Keeping the last committed
     preview visible while the next one builds avoids a frozen table and makes
     every intermediate drag cheap; exports wait for the settled preview. */
  const deferredConfig = useDeferredValue(config);
  const deferredStyle = useDeferredValue(style);
  const previewUpdating = deferredConfig !== config || deferredStyle !== style;
  const result = useMemo<PivotResult>(
    () =>
      buildPivot({
        rows,
        fields,
        config: deferredConfig,
        collapsed,
        options: {
          showSubtotals: deferredStyle.subtotals,
          showGrandTotals: deferredStyle.grandTotals,
        },
      }),
    [rows, fields, deferredConfig, collapsed, deferredStyle.subtotals, deferredStyle.grandTotals],
  );

  const filterOptions = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const fieldId of Object.keys(config.filters)) {
      const field = fieldById.get(fieldId);
      out[fieldId] = field ? distinctValues(rows, field) : [];
    }
    return out;
  }, [config.filters, fieldById, rows]);

  /* Collapse keys belong to one row/column layout — reset on change. */
  const layoutKey = `${config.rows.join(",")}|${config.columns.join(",")}`;
  const lastLayoutKey = useRef(layoutKey);
  if (lastLayoutKey.current !== layoutKey) {
    lastLayoutKey.current = layoutKey;
    if (collapsed.size) setCollapsed(new Set());
  }

  /* ---- chart data (quick charts) ---- */
  const chart = useMemo(() => {
    const plain = chartDataFrom(result, 10);
    const stacked = stackedDataFor(result, 10);
    if (stacked) return stacked;
    return plain;
  }, [result]);

  /* ---- drafts ---- */
  const draggingActive = !!drag;
  const draggedRef = useRef(false);
  const beginDrag = (item: DragItem) => (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", item.fieldId);
    draggedRef.current = true;
    setDrag(item);
  };
  const endDrag = () => {
    setDrag(null);
    setHoverZone(null);
  };
  useEffect(() => {
    if (!drag) return;
    const clear = () => {
      setDrag(null);
      setHoverZone(null);
    };
    window.addEventListener("dragend", clear);
    window.addEventListener("drop", clear);
    return () => {
      window.removeEventListener("dragend", clear);
      window.removeEventListener("drop", clear);
    };
  }, [drag]);

  const applyDrop = useCallback(
    (item: DragItem, zone: ZoneId | "sidebar", index?: number) => {
      const field = fieldById.get(item.fieldId);
      if (!field) return;

      if (zone === "sidebar") {
        update((prev) => {
          const c = prev.config;
          return {
            ...prev,
            config: {
              ...c,
              rows: c.rows.filter((id) => id !== item.fieldId),
              columns: c.columns.filter((id) => id !== item.fieldId),
              values: c.values.filter((v) => v.fieldId !== item.fieldId),
              filters: Object.fromEntries(
                Object.entries(c.filters).filter(([id]) => id !== item.fieldId),
              ),
            },
          };
        });
        return;
      }

      update((prev) => {
        const next: PivotConfig = {
          ...prev.config,
          rows: [...prev.config.rows],
          columns: [...prev.config.columns],
          values: [...prev.config.values],
          filters: { ...prev.config.filters },
        };

        if (item.from === "zone") {
          if (item.zone === "rows")
            next.rows = next.rows.filter((id) => id !== item.fieldId);
          else if (item.zone === "columns")
            next.columns = next.columns.filter((id) => id !== item.fieldId);
          else if (item.zone === "filters") delete next.filters[item.fieldId];
          else if (item.zone === "values" && typeof item.index === "number")
            next.values = next.values.filter((_, i) => i !== item.index);
        }

        let at = typeof index === "number" ? index : -1;
        if (
          item.from === "zone" &&
          item.zone === zone &&
          typeof item.index === "number" &&
          at > item.index
        )
          at -= 1;

        if (zone === "filters") {
          if (!(item.fieldId in next.filters)) {
            if (Object.keys(next.filters).length >= ZONE_META.filters.max) {
              toast.error(`Filters hold up to ${ZONE_META.filters.max} fields.`);
              return prev;
            }
            next.filters[item.fieldId] = [];
          }
          return { ...prev, config: next };
        }

        if (zone === "values") {
          if (next.values.length >= ZONE_META.values.max) {
            toast.error(`Values holds up to ${ZONE_META.values.max} calculations.`);
            return prev;
          }
          const target = at < 0 ? next.values.length : at;
          next.values = [
            ...next.values.slice(0, target),
            { fieldId: item.fieldId, agg: defaultAggFor(field.type) },
            ...next.values.slice(target),
          ];
          return { ...prev, config: next };
        }

        const list = zone === "rows" ? next.rows : next.columns;
        if (list.includes(item.fieldId)) return prev;
        if (list.length >= ZONE_META[zone].max) {
          toast.error(
            `${ZONE_META[zone].label} holds up to ${ZONE_META[zone].max} fields.`,
          );
          return prev;
        }
        const target = at < 0 ? list.length : at;
        const inserted = [
          ...list.slice(0, target),
          item.fieldId,
          ...list.slice(target),
        ];
        if (zone === "rows") next.rows = inserted;
        else next.columns = inserted;
        return { ...prev, config: next };
      });

      setRecent((prev) =>
        [item.fieldId, ...prev.filter((id) => id !== item.fieldId)].slice(0, 8),
      );
    },
    [fieldById, update],
  );

  const removeField = (zone: ZoneId, fieldId: string, index?: number) =>
    update((prev) => {
      const next: PivotConfig = {
        ...prev.config,
        rows: [...prev.config.rows],
        columns: [...prev.config.columns],
        values: [...prev.config.values],
        filters: { ...prev.config.filters },
      };
      if (zone === "rows") next.rows = next.rows.filter((id) => id !== fieldId);
      else if (zone === "columns")
        next.columns = next.columns.filter((id) => id !== fieldId);
      else if (zone === "filters") delete next.filters[fieldId];
      else if (zone === "values" && typeof index === "number")
        next.values = next.values.filter((_, i) => i !== index);
      return { ...prev, config: next };
    });

  const moveChip = (zone: ZoneId, fieldId: string, index: number, dir: -1 | 1) =>
    update((prev) => {
      const next: PivotConfig = { ...prev.config };
      if (zone === "rows" || zone === "columns") {
        const list = [...next[zone]];
        const to = index + dir;
        if (to < 0 || to >= list.length) return prev;
        [list[index], list[to]] = [list[to], list[index]];
        next[zone === "rows" ? "rows" : "columns"] = list;
      } else if (zone === "values" && typeof index === "number") {
        const list = [...next.values];
        const to = index + dir;
        if (to < 0 || to >= list.length) return prev;
        [list[index], list[to]] = [list[to], list[index]];
        next.values = list;
      } else return prev;
      return { ...prev, config: next };
    });

  const addField = (field: PivotFieldDef) => {
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    const used = zoneOfField(config, field.id);
    if (used) {
      toast.info(
        `${field.label} is already in ${ZONE_META[used].label} — drag its handle to another zone to reuse it.`,
      );
      return;
    }
    applyDrop(
      { from: "sidebar", fieldId: field.id },
      field.type === "number" ? "values" : "rows",
    );
  };

  const setAgg = (index: number, agg: AggregateKind) =>
    patchConfig({
      values: config.values.map((v, i) => (i === index ? { ...v, agg } : v)),
    });
  const setFilter = (fieldId: string, allowed: string[]) =>
    patchConfig({ filters: { ...config.filters, [fieldId]: allowed } });

  const toggleSort = (
    kind: "label" | "measure" | "total",
    arg?: { colIndex?: number; vIndex?: number },
  ) => {
    const cur = config.sort;
    const same =
      cur.kind === kind &&
      (kind === "label" ||
        (kind === "measure" &&
          cur.kind === "measure" &&
          cur.colIndex === arg?.colIndex &&
          cur.vIndex === arg?.vIndex) ||
        (kind === "total" && cur.kind === "total" && cur.vIndex === arg?.vIndex));
    const dir: "asc" | "desc" = same && cur.dir === "asc" ? "desc" : "asc";
    let next: PivotSort;
    if (kind === "label") next = { kind: "label", dir };
    else if (kind === "measure")
      next = {
        kind: "measure",
        colIndex: arg?.colIndex ?? 0,
        vIndex: arg?.vIndex ?? 0,
        dir,
      };
    else next = { kind: "total", vIndex: arg?.vIndex ?? 0, dir };
    patchConfig({ sort: next });
  };
  const sortState = (
    kind: "label" | "measure" | "total",
    arg?: { colIndex?: number; vIndex?: number },
  ): "asc" | "desc" | null => {
    const cur = config.sort;
    if (cur.kind !== kind) return null;
    if (kind === "label") return cur.dir;
    if (kind === "measure" && cur.kind === "measure")
      return cur.colIndex === arg?.colIndex && cur.vIndex === arg?.vIndex
        ? cur.dir
        : null;
    if (kind === "total" && cur.kind === "total")
      return cur.vIndex === arg?.vIndex ? cur.dir : null;
    return null;
  };

  const toggleCollapsedKey = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  /* ---- reset / templates / saved views ---- */
  const resetReport = () => {
    update(() => ({
      config: defaultPivotConfig(),
      layout: "outline",
      decimals: "auto",
      style: DEFAULT_STYLE,
      formatMode: "off",
      valueLabels: "auto",
      monthLabels: "friendly",
    }));
    setCollapsed(new Set());
    setColWidths({});
    setResetOpen(false);
    toast.success("Report reset");
  };

  const applyTemplate = (t: (typeof TEMPLATES)[number]) => {
    const made = t.make();
    patchView({ ...made, config: pruneSavedConfig(made.config) });
    setCollapsed(new Set());
    toast.success(`Loaded template “${t.label}”`);
  };

  const saveView = () => {
    const name = saveName.trim();
    if (!name) return;
    const entry: SavedViewEntry = {
      id: `${Date.now()}`,
      name,
      savedAt: Date.now(),
      view,
    };
    const next = [entry, ...views.filter((v) => v.name !== name)].slice(0, 30);
    setViews(next);
    saveJson(VIEWS_KEY, next);
    setSaveOpen(false);
    setSaveName("");
    toast.success(`Saved “${name}”`);
    void saveDefinition({ name, view })
      .then((res) => {
        setViews((cur) => {
          const withId = cur.map((v) =>
            v.id === entry.id ? { ...v, definitionId: res.id } : v,
          );
          saveJson(VIEWS_KEY, withId);
          return withId;
        });
      })
      .catch(() => undefined);
  };
  const openView = (entry: SavedViewEntry) => {
    const candidate = entry.view as ViewState | undefined;
    if (!candidate?.config) {
      toast.error("This saved view has no report data.");
      return;
    }
    update(() => ({
      ...candidate,
      config: pruneSavedConfig(candidate.config!),
      style: { ...DEFAULT_STYLE, ...(candidate.style ?? {}) },
      formatMode: candidate.formatMode ?? "off",
      valueLabels: candidate.valueLabels ?? "auto",
      monthLabels: candidate.monthLabels ?? "friendly",
    }));
    setCollapsed(new Set());
    toast.success(`Opened “${entry.name}”`);
  };
  const renameView = (entry: SavedViewEntry, name: string) => {
    const next = views.map((v) => (v.id === entry.id ? { ...v, name } : v));
    setViews(next);
    saveJson(VIEWS_KEY, next);
  };
  const deleteView = (entry: SavedViewEntry) => {
    const next = views.filter((v) => v.id !== entry.id);
    setViews(next);
    saveJson(VIEWS_KEY, next);
    if (entry.definitionId) {
      void removeDefinition({ id: entry.definitionId }).catch(() => undefined);
    }
    if (defaultViewId === entry.id) {
      setDefaultViewId(null);
      saveJson(DEFAULT_VIEW_KEY, null);
    }
    toast.success(`Deleted “${entry.name}”`);
  };
  const deleteAllViews = () => {
    for (const entry of views) {
      if (entry.definitionId) void removeDefinition({ id: entry.definitionId }).catch(() => undefined);
    }
    setViews([]);
    setDefaultViewId(null);
    saveJson(VIEWS_KEY, []);
    saveJson(DEFAULT_VIEW_KEY, null);
    toast.success("Saved views cleared");
  };
  const setDefaultView = (entry: SavedViewEntry | null) => {
    const id = entry?.id ?? null;
    setDefaultViewId(id);
    saveJson(DEFAULT_VIEW_KEY, id);
    toast.success(id ? `“${entry!.name}” opens by default` : "Default view cleared");
  };

  /* ---- drill-down ---- */
  const onCellClick = (t: DrillTarget) => {
    const labels: (string | null)[] = t.row.labels.slice(
      0,
      t.row.depth + 1,
    );
    while (labels.length < config.rows.length && t.row.kind !== "leaf")
      (labels as (string | null | undefined)[]).push(undefined);
    const colLabels =
      t.comboIndex != null
        ? result.colCombos[t.comboIndex]?.labels
        : undefined;
    const rowsMatched = pivotDrilldown({
      rows,
      fields,
      config,
      labels,
      colLabels,
    });
    const parts: string[] = [];
    t.row.labels
      .slice(0, t.row.depth + 1)
      .forEach((l) => l && parts.push(l));
    if (colLabels) colLabels.forEach((l) => l && parts.push(l));
    setDrill({
      title: parts.join(" · ") || "Selected facilities",
      rows: rowsMatched,
    });
  };

  /* ---- export ---- */
  const filtersList = useMemo(
    () =>
      Object.entries(config.filters)
        .filter(([, allowed]) => allowed.length > 0)
        .map(([fieldId, allowed]) => {
          const field = fieldById.get(fieldId);
          return `${field?.label ?? fieldId}: ${allowed.join(", ")}`;
        }),
    [config.filters, fieldById],
  );

  const hasValues = config.values.length > 0;
  const canExport =
    hasValues && result.outRows.length > 0 && data !== undefined && !previewUpdating;

  if (data === undefined) {
    return (
      <AppShell
        title="Custom Report Builder"
        subtitle="Loading your facilities…"
      >
        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="space-y-2">
            <Skeleton className="h-10 rounded-lg" />
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-8 rounded-lg" />
            ))}
          </div>
          <div className="space-y-3">
            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-10 rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Custom Report Builder"
      subtitle="Step 1 pick fields → Step 2 arrange → the preview builds itself"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-border/60">
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-none"
              aria-label="Undo last change (Ctrl+Z)"
              data-tip="Undo (Ctrl+Z)"
              disabled={!canUndo}
              onClick={undo}
            >
              <Undo2 className="size-4" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-none border-l border-border/60"
              aria-label="Redo (Ctrl+Y)"
              data-tip="Redo (Ctrl+Y)"
              disabled={!canRedo}
              onClick={redo}
            >
              <Redo2 className="size-4" aria-hidden />
            </Button>
          </div>

          <SavedViewsMenu
            entries={views}
            defaultId={defaultViewId}
            currentLabel={
              config.rows.map((id) => fieldById.get(id)?.label ?? id).join(" × ") ||
              "My report"
            }
            onSaveCurrent={() => {
              setSaveName(
                config.rows
                  .map((id) => fieldById.get(id)?.label ?? id)
                  .join(" × ") || "My report",
              );
              setSaveOpen(true);
            }}
            onOpen={openView}
            onRename={renameView}
            onDelete={deleteView}
            onDeleteAll={deleteAllViews}
            onSetDefault={setDefaultView}
            onShareLink={() => {
              const url = `${window.location.origin}${window.location.pathname}?report=${encodeShareParam(view)}`;
              window.history.replaceState(null, "", url);
            }}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <LayoutTemplate className="size-4" />
                Templates
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Ready-made NQAS reports</DropdownMenuLabel>
              {TEMPLATES.map((t) => (
                <DropdownMenuItem key={t.id} onClick={() => applyTemplate(t)}>
                  <span>
                    <span className="block text-xs font-semibold">{t.label}</span>
                    <span className="block text-[10px] text-muted-foreground">
                      {t.desc}
                    </span>
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            className="gap-2"
            data-tip="Start over (asks first)"
            onClick={() => setResetOpen(true)}
          >
            <RotateCcw className="size-4" aria-hidden />
            Reset
          </Button>

          {/* Primary download CTA — the Export settings dialog */}
          <Button
            className="gap-2"
            disabled={!canExport}
            onClick={() => setExportOpen(true)}
            aria-label="Open export settings"
            data-tip={
              !hasValues
                ? "Add at least one field to Values — then the export opens"
                : result.outRows.length === 0
                  ? "No rows match the filters — clear a filter, then export"
                  : previewUpdating
                    ? "Preview is updating — export will unlock when it settles"
                    : "PDF / Excel / CSV with a print-ready layout"
            }
          >
            <Download className="size-4" aria-hidden />
            Download
          </Button>
        </div>
      }
    >
      <div
        /* overflow-x: clip is the LAST resort — every flex/grid child below
           already carries min-width: 0 so nothing can exceed the viewport. */
        className={cn(
          "grid min-w-0 gap-4 overflow-x-clip",
          sidebarOpen
            ? "lg:grid-cols-[var(--sb-w)_minmax(0,1fr)]"
            : "grid-cols-[minmax(0,1fr)]",
        )}
        style={{ ["--sb-w" as string]: `${sidebarWidth}px` }}
      >
        {/* ---------------- Step 1: field sidebar ---------------- */}
        {sidebarOpen && (
          <aside className="relative min-w-0">
            <div className="glass h-fit rounded-xl border border-border/60 p-3 lg:sticky lg:top-24">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-bold">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    1
                  </span>
                  Pick fields
                </p>
                <Badge variant="secondary" className="text-[10px]">
                  {fields.length}
                </Badge>
              </div>
              <FieldList
                fields={fields}
                zoneOfField={(id) => zoneOfField(config, id)}
                onAdd={(id) => {
                  const field = fieldById.get(id);
                  if (field) addField(field);
                }}
                onDragStartField={(id, e) => beginDrag({ from: "sidebar", fieldId: id })(e)}
                draggingActive={draggingActive}
                totalRows={totalRows}
                blankCounts={blankCounts}
                recent={recent}
              />
            </div>
            {/* resize handle (desktop) */}
            <div
              role="separator"
              aria-orientation="vertical"
              data-tip="Drag to resize the field panel"
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startW = sidebarWidth;
                let nextW = startW;
                const onMove = (ev: MouseEvent) => {
                  nextW = Math.max(260, Math.min(420, startW + ev.clientX - startX));
                  setSidebarWidth(nextW);
                };
                const onUp = () => {
                  localStorage.setItem("nqas.customReport.sidebarWidth", String(nextW));
                  window.removeEventListener("mousemove", onMove);
                  window.removeEventListener("mouseup", onUp);
                };
                window.addEventListener("mousemove", onMove);
                window.addEventListener("mouseup", onUp);
              }}
              className="absolute -right-1.5 top-24 hidden h-64 w-2 cursor-col-resize rounded bg-transparent hover:bg-primary/40 lg:block"
            />
          </aside>
        )}

        {/* ---------------- workspace ---------------- */}
        <div className="min-w-0">
          {/* sidebar toggle (mobile-users keep Step 1 in the layout flow) */}
          <div className="mb-2 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              aria-pressed={!sidebarOpen}
              onClick={() => {
                const next = !sidebarOpen;
                setSidebarOpen(next);
                writeFieldPanelPreference(
                  next,
                  typeof window === "undefined" ? undefined : window.localStorage,
                );
              }}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="size-3.5" />
              ) : (
                <PanelLeftOpen className="size-3.5" />
              )}
              {sidebarOpen ? "Hide field panel" : "Show field panel"}
            </Button>
          </div>

          {/* Step 2: drop zones — a container-query grid: equal-height cards
              wrap 4 → 2×2 → 1 column, driven by the WORKSPACE width (not the
              viewport), never overflowing it. */}
          <div className="mb-3 grid gap-2.5 [container-type:inline-size] [grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))]">
            {ZONE_ORDER.map((zone) => {
              const count =
                zone === "filters"
                  ? Object.keys(config.filters).length
                  : zone === "values"
                    ? config.values.length
                    : config[zone].length;
              return (
                <DropZone
                  key={zone}
                  zone={zone}
                  count={count}
                  active={hoverZone === zone && draggingActive}
                  dragging={draggingActive}
                  onDragOverZone={(e) => {
                    if (!drag) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setHoverZone(zone);
                  }}
                  onDragLeaveZone={() =>
                    setHoverZone((z) => (z === zone ? null : z))
                  }
                  onDropZone={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (drag) applyDrop(drag, zone);
                    endDrag();
                  }}
                  onClear={
                    count > 0
                      ? () => {
                          if (zone === "filters") patchConfig({ filters: {} });
                          else if (zone === "rows") patchConfig({ rows: [] });
                          else if (zone === "columns")
                            patchConfig({ columns: [] });
                          else patchConfig({ values: [] });
                        }
                      : undefined
                  }
                  fields={fields}
                  onAddField={(fieldId) =>
                    applyDrop({ from: "sidebar", fieldId }, zone)
                  }
                >
                  {zone === "filters" ? (
                    Object.keys(config.filters).length === 0 ? (
                      <ZonePlaceholder hint="Drop a field here to filter by it" />
                    ) : (
                      <div className="space-y-1.5">
                        {Object.keys(config.filters).map((fieldId, index) => {
                          const field = fieldById.get(fieldId);
                          if (!field) return null;
                          return (
                            <div key={fieldId} className="flex items-center gap-1">
                              <ZoneChip
                                field={field}
                                onDragStartChip={beginDrag({
                                  from: "zone",
                                  zone: "filters",
                                  fieldId,
                                })}
                                onDragEndChip={endDrag}
                                onRemove={() => removeField("filters", fieldId)}
                                subline={
                                  <FilterDropdown
                                    label="Filter values"
                                    options={(filterOptions[fieldId] ?? []).map(
                                      (v) => ({ value: v, label: v }),
                                    )}
                                    value={config.filters[fieldId] ?? []}
                                    onChange={(v) => setFilter(fieldId, v)}
                                    triggerWidth="w-full"
                                  />
                                }
                              />
                              <NavItemMove
                                onUp={() =>
                                  moveChip("filters", fieldId, index, -1)
                                }
                                onDown={() =>
                                  moveChip("filters", fieldId, index, 1)
                                }
                              />
                            </div>
                          );
                        })}
                      </div>
                    )
                  ) : zone === "values" ? (
                    config.values.length === 0 ? (
                      <ZonePlaceholder hint="Drop a field here to calculate it" />
                    ) : (
                      <div className="space-y-1.5">
                        {config.values.map((spec, index) => {
                          const field = fieldById.get(spec.fieldId);
                          if (!field) return null;
                          return (
                            <ZoneChip
                              key={`${spec.fieldId}-${index}`}
                              field={field}
                              onDragStartChip={beginDrag({
                                from: "zone",
                                zone: "values",
                                fieldId: spec.fieldId,
                                index,
                              })}
                              onDragEndChip={endDrag}
                              onRemove={() =>
                                removeField("values", spec.fieldId, index)
                              }
                              onMove={(d) => moveChip("values", spec.fieldId, index, d)}
                              subline={
                                <AggPicker
                                  value={spec.agg}
                                  options={allowedAggs(field.type)}
                                  onChange={(agg) => setAgg(index, agg)}
                                />
                              }
                            />
                          );
                        })}
                      </div>
                    )
                  ) : (
                    <>
                      {config[zone].length === 0 && (
                        <ZonePlaceholder
                          hint={`Drop a field here to group ${zone === "rows" ? "rows" : "columns"}`}
                        />
                      )}
                      <div className="space-y-1.5">
                        {config[zone].map((fieldId, index) => {
                          const field = fieldById.get(fieldId);
                          if (!field) return null;
                          return (
                            <ZoneChip
                              key={fieldId}
                              field={field}
                              onDragStartChip={beginDrag({
                                from: "zone",
                                zone,
                                fieldId,
                                index,
                              })}
                              onDragEndChip={endDrag}
                              onRemove={() => removeField(zone, fieldId)}
                              onMove={(d) => moveChip(zone, fieldId, index, d)}
                            />
                          );
                        })}
                      </div>
                    </>
                  )}
                </DropZone>
              );
            })}
          </div>

          {/* Step 3: preview toolbar */}
          <div className="glass mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-border/60 p-2.5">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                3
              </span>
              Preview
              {previewUpdating && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium normal-case tracking-normal text-muted-foreground" role="status">
                  <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                  Updating…
                </span>
              )}
            </span>

            {/* Preview mode dropdown: SHORT label on the trigger, the long
                description lives inside the menu. */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 min-w-0 gap-1.5 text-xs"
                  data-tip={LAYOUT_HINTS[layout]}
                >
                  <Table2 className="size-3.5 shrink-0" />
                  <span className="truncate">{LAYOUT_LABELS[layout]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel>Preview mode</DropdownMenuLabel>
                {(Object.keys(LAYOUT_LABELS) as Layout[]).map((l) => (
                  <DropdownMenuItem key={l} onClick={() => patchView({ layout: l })}>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold">
                        {LAYOUT_LABELS[l]}
                        {l === layout ? " ✔" : ""}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">
                        {LAYOUT_HINTS[l]}
                      </span>
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {config.sort.kind === "label" ? (
              <Select
                value={config.sort.dir}
                onValueChange={(v) => {
                  if (v === "asc" || v === "desc")
                    patchConfig({ sort: { kind: "label", dir: v } });
                }}
              >
                <SelectTrigger
                  className="glass-input h-9 w-46 text-xs"
                  data-tip="Click any column header to sort by that figure instead"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc" className="text-xs">
                    Row labels A - Z
                  </SelectItem>
                  <SelectItem value="desc" className="text-xs">
                    Row labels Z - A
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs"
                data-tip="Sorted by the clicked header figure — back to label order"
                onClick={() => patchConfig({ sort: { kind: "label", dir: "asc" } })}
              >
                Sorted by figure — back to A-Z
              </Button>
            )}

            <Select
              value={String(decimals)}
              onValueChange={(v) =>
                patchView({
                  decimals: v === "auto" ? "auto" : (Number(v) as 0 | 1 | 2),
                })
              }
            >
              <SelectTrigger className="glass-input h-9 w-40 text-xs" data-tip="Decimal places" aria-label="Decimal places">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto" className="text-xs">Auto decimals</SelectItem>
                <SelectItem value="0" className="text-xs">0 decimals</SelectItem>
                <SelectItem value="1" className="text-xs">1 decimal</SelectItem>
                <SelectItem value="2" className="text-xs">2 decimals</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={formatMode}
              onValueChange={(v) => patchView({ formatMode: v as FormatMode })}
            >
              <SelectTrigger
                className="glass-input h-9 w-52 text-xs"
                data-tip="Conditional formatting"
                aria-label="Conditional formatting"
              >
                <Sparkles className="mr-1 size-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FORMAT_LABELS) as FormatMode[]).map((m) => (
                  <SelectItem key={m} value={m} className="text-xs">
                    {FORMAT_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                  <Layers className="size-3.5" />
                  Layout &amp; style
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60">
                <DropdownMenuLabel>Show</DropdownMenuLabel>
                {(
                  [
                    ["subtotals", "Group subtotals"],
                    ["grandTotals", "Grand total row"],
                    ["grandTotalColumn", "Grand total column"],
                  ] as const
                ).map(([key, label]) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() =>
                      patchView({ style: { ...style, [key]: !style[key] } })
                    }
                  >
                    {style[key] ? "✔" : "○"} {label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuLabel>Styling</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() =>
                    patchView({
                      valueLabels: view.valueLabels === "always" ? "auto" : "always",
                    })
                  }
                >
                  {view.valueLabels === "always" ? "✔" : "○"} Show value labels — always
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    patchView({
                      valueLabels: view.valueLabels === "never" ? "auto" : "never",
                    })
                  }
                >
                  {view.valueLabels === "never" ? "✔" : "○"} Show value labels — never
                </DropdownMenuItem>
                <p className="px-2 py-1 text-[10px] text-muted-foreground">
                  Auto (default): the measure-name header row appears only when
                  there are two or more values.
                </p>
                <DropdownMenuLabel>Date groups</DropdownMenuLabel>
                {(
                  [
                    ["friendly", "Month names — Oct 2022 (sorted by ISO key)"],
                    ["iso", "ISO keys — 2022-10"],
                  ] as const
                ).map(([mode, label]) => (
                  <DropdownMenuItem
                    key={mode}
                    onClick={() => patchView({ monthLabels: mode })}
                  >
                    {view.monthLabels === mode ? "✔" : "○"} {label}
                  </DropdownMenuItem>
                ))}
                <p className="px-2 py-1 text-[10px] text-muted-foreground">
                  Facilities without a date group into one \"(No date)\" row, so
                  subtotals always reconcile.
                </p>
                {(
                  [
                    ["striped", "Alternating row colours"],
                    ["borders", "Cell borders"],
                    ["highlightTotals", "Highlight totals"],
                  ] as const
                ).map(([key, label]) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() =>
                      patchView({ style: { ...style, [key]: !style[key] } })
                    }
                  >
                    {style[key] ? "✔" : "○"} {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Counter contract: body rows EXCLUDING the Grand Total row,
                value columns EXCLUDING the Grand Total column — it must
                equal the table (scripts/pivot.columns.test.ts pins it). */}
            <div
              className="ml-auto flex min-w-0 flex-wrap items-center gap-3 text-xs text-muted-foreground"
              data-testid="pivot-counter"
            >
              <span className="tabular-nums">
                <b className="font-semibold text-foreground">
                  {pivotCounter(result).facilities}
                </b>{" "}
                of {pivotCounter(result).of} facilities
              </span>
              <span className="tabular-nums">
                {pivotCounter(result).rows} rows ·{" "}
                {pivotCounter(result).valueColumns} value columns
              </span>
            </div>
          </div>

          {/* Certification Cycle — a normal filter in this report's Filters
              zone (never a header control). Summaries never offer "All
              cycles" because the totals would double-count. */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <CycleFilter allowAll={false} />
          </div>

          {/* active filter pills */}
          {filtersList.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                <ListFilter className="size-3.5" /> Filters:
              </span>
              {filtersList.map((f) => (
                <span
                  key={f}
                  data-tip={f}
                  className="glass inline-flex max-w-72 items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-xs"
                >
                  <span className="truncate">{f}</span>
                </span>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs text-destructive"
                onClick={() => patchConfig({ filters: {} })}
              >
                <X className="size-3" /> Clear all
              </Button>
            </div>
          )}

          {result.truncated && (
            <p className="mb-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
              Showing the first {result.maxRows} rows — the report has more.
              Export to Excel/CSV for every row.
            </p>
          )}

          {!hasValues ? (
            <EmptyState onTemplate={applyTemplate} />
          ) : (
            <div className="space-y-3" aria-busy={previewUpdating}>
              <PivotTable
                result={result}
                layout={layout}
                decimals={decimals}
                style={style}
                formatMode={formatMode}
                valueLabels={view.valueLabels}
                statusColIndexes={statusColumnIndexes(
                  result.rowFields as PivotFieldDef[],
                  result,
                )}
                colWidths={colWidths}
                onColWidthsChange={setColWidths}
                onToggleCollapse={toggleCollapsedKey}
                onSort={toggleSort}
                sortState={sortState}
                onCellClick={onCellClick}
              />
              {chart && (
                <PivotChartCard
                  data={chart}
                  onExportHint="Charts are drawn as vector bars inside PDF exports."
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* ---------- dialogs ---------- */}
      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        result={result}
        rawRows={rows}
        filtersList={filtersList}
        chart={
          chart
            ? {
                labels: chart.labels,
                values: chart.values,
                title: chart.title,
              }
            : null
        }
        defaultTitle="NQAS Custom Report"
        defaultSubtitle="Facility quality certification tracker"
        defaultDistrict="Tirupathur district, Tamil Nadu"
        defaultGeneratedBy={
          typeof window !== "undefined"
            ? JSON.parse(localStorage.getItem("nqas.user") ?? "null")?.name ??
              "NQAS Tracker user"
            : "NQAS Tracker user"
        }
      />

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save this report</DialogTitle>
            <DialogDescription>
              Saved views live in this browser and reopen with the same rows,
              columns, values, filters, layout and styling.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveView();
            }}
            placeholder="e.g. Block-wise certification status"
            className="h-10 text-sm"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveView} disabled={!saveName.trim()}>
              Save view
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset this report?</DialogTitle>
            <DialogDescription>
              Rows, columns, values, filters and styling go back to the default
              “Facilities per block”. Your saved views are not touched.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={resetReport}>
              <RotateCcw className="mr-1.5 size-4" /> Reset report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!drill} onOpenChange={(o) => !o && setDrill(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Behind this figure</DialogTitle>
            <DialogDescription>
              {drill?.rows.length ?? 0} facilit
              {(drill?.rows.length ?? 0) === 1 ? "y" : "ies"} · {drill?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            {(drill?.rows ?? []).slice(0, 200).map((r) => (
              <div
                key={r.facility._id ?? r.facility.name}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm hover:bg-accent"
              >
                <FacilityCell facility={r.facility} className="min-w-0 flex-1" />
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {r.facility.currentStatus}
                </span>
              </div>
            ))}
            {(drill?.rows.length ?? 0) > 200 && (
              <p className="pt-2 text-xs text-muted-foreground">
                First 200 shown — export for the full list.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function NavItemMove({
  onUp,
  onDown,
}: {
  onUp: () => void;
  onDown: () => void;
}) {
  return (
    <span className="flex flex-col">
      <button
        type="button"
        data-tip="Move filter earlier"
        aria-label="Move earlier"
        onClick={onUp}
        className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <ChevronRight className="size-3 rotate-[-90deg]" />
      </button>
      <button
        type="button"
        data-tip="Move filter later"
        aria-label="Move later"
        onClick={onDown}
        className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <ChevronRight className="size-3 rotate-90" />
      </button>
    </span>
  );
}

function EmptyState({
  onTemplate,
}: {
  onTemplate: (t: (typeof TEMPLATES)[number]) => void;
}) {
  return (
    <div className="glass flex flex-col items-center rounded-xl border border-border/60 px-6 py-12 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10">
        <Sparkles className="size-6 text-primary" />
      </div>
      <p className="text-base font-semibold">Build your first report</p>
      <p className="mt-1 max-w-xl text-sm text-muted-foreground">
        Pick fields on the left (Step 1), drop them into Rows / Columns / Values
        (Step 2), and the preview table builds itself (Step 3). Or start from a
        ready template below — every one is one click.
      </p>
      <div className="mt-4 grid w-full max-w-xl gap-2 sm:grid-cols-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTemplate(t)}
            className="flex min-h-14 flex-col items-start rounded-xl border border-border/60 bg-background/60 p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
          >
            <span className="text-sm font-semibold">{t.label}</span>
            <span className="text-[11px] text-muted-foreground">{t.desc}</span>
          </button>
        ))}
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Info className="size-3.5" />
        Tip: click a number in the finished table to see the facilities behind it.
      </p>
    </div>
  );
}
