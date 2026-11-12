import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery, useMutation } from "convex/react";
import type { SortingState } from "@tanstack/react-table";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { CycleFilter, useCycleScope } from "@/components/CycleFilter";
import { useAuth } from "@/hooks/use-auth";
import { StatusBadge } from "@/components/StatusBadge";
import {
  UniversalFilterBar,
  rowPasses,
  type BarValue,
  type FilterField,
} from "@/components/UniversalFilterBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CalendarClock,
  Check,
  ChevronDown,
  Columns3,
  Eye,
  LayoutList,
  PanelLeft,
  Rows3,
  Sparkles,
  FileSpreadsheet,
  FileText,
  Info,
  Loader2,
  Maximize2,
  Minimize2,
  MoreHorizontal,
    RotateCcw,
  Upload,
  PencilLine,
  Plus,
  SlidersHorizontal,
} from "lucide-react";

import { toast } from "sonner";
import {
  DEFAULT_SETTINGS,
} from "@/convex/lifecycle";
import { toDisplayStamp } from "@/lib/format";
import { buildEligibilityOptions } from "@/lib/eligibility";
import { cn } from "@/lib/utils";
import FilterDropdown from "@/components/FilterDropdown";
import { FilterChips, RestoredNotice, type FilterChip } from "@/components/FilterChips";
// The list VIEW (filters, search, sort, page) lives in the URL, and everything
// that has to survive leaving the list without being shareable (scroll, ticks,
// the last list URL, a rows snapshot) lives in session state. See the hooks.
import { useListUrlState } from "@/hooks/use-list-url-state";
import { useScrollRestore } from "@/hooks/use-scroll-restore";
import { defaultListFilters } from "@/lib/listUrlState";
import { loadRowsSnapshot, saveRowsSnapshot } from "@/lib/listSessionState";
import { countListOptions } from "@/lib/listOptionCounts";
import { FilterSearch } from "@/components/FilterBar";
import { countActiveFilters } from "@/lib/filters";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// The filter chain, the sort comparator and the disambiguation helper live in
// lib/masterFilter so they are pure and unit-tested (scripts/masterList.test.ts)
// instead of being buried in this page's render.
import {
  KPI_LABELS,
  LAST_CHANGE_SOURCE_LABEL,
  METRIC_LABELS,
  NO_CYCLE,
  applyMasterFilters,
  foldStatus,
  kpiMatches,
  latestUpdatedAt,
  type MasterFilters,
} from "@/lib/masterFilter";
import { normalizeDocumentRules } from "@/lib/documentRules";
import { normalizePendingConfig } from "@/lib/pending";
// The report-status values are the SAME seed the status map and the SaQsham
// import wizard use, so the filter, the import and the reports never drift.
import { REPORT_STATUS_VALUES } from "@/lib/saqshamImport";

/* ---------------- Master-list engine (54 columns, 9 groups) ----------------
 * The column config, the view state, the export engine and every smart cell
 * live in their own modules so the table, the workbook and the PDF can never
 * drift apart — see src/lib/masterColumns.ts for the single source of truth. */
import {
  COLUMN_PRESETS,
  FACILITY_CURRENT_STATUS_LABEL,
  GROUP_BY_ID,
  MASTER_COLUMNS,
  cellText,
  cellValue,
  fullExportColumns,
  requiredDocumentsMissing,
  resolveLabels,
  withExportEssentials,
  withIaPeriodLabels,
  type MasterGroupId,
  type MasterRow,
} from "@/lib/masterColumns";
import {
  allIaPeriods,
  attachIaExtras,
  buildIaMasterIndex,
  iaPairFor,
  withLegacyIa,
} from "@/lib/iaMaster";
import { formatFyQuarter, type FyQuarter } from "@/lib/iaImport";
import type { PdfMeta } from "@/lib/masterExport";
import { todayLocalIso } from "@/lib/today";
import {
  DEFAULT_VIEW,
  applyPreset,
  loadMasterView,
  normalizeView,
  orderedVisibleColumns,
  saveMasterView,
  type MasterView,
} from "@/lib/masterView";
import { GroupedMasterTable } from "@/components/master/GroupedMasterTable";
import {
  EditableTrackerCell,
  EditableUpdateCell,
  isEditableCellKey,
  readOnlyCellReason,
  trackerEditorOptions,
  trackerUpdatePayload,
  useRowDrafts,
  type RowEditState,
  type TrackerRow,
} from "@/components/master/EditModeCells";
import { readRowActionsSetting } from "@/lib/masterColumns";
import {
  FREEZE_PREF_KEY,
  HIGHLIGHT_PREF_KEY,
  loadBoolPref,
  readDisplaySettings,
  saveBoolPref,
} from "@/lib/tableDisplay";
import { resolveCellMarkers, type RecentMap } from "@/lib/recentUpdates";
import { ColumnManager } from "@/components/master/ColumnManager";
import type { KpiId } from "@/components/master/KpiCards";
import { FacilityQuickView } from "@/components/quickview/FacilityQuickView";
import { loadQuickViewDraft } from "@/lib/facilityQuickView";
import { MobileFacilityCards } from "@/components/master/MobileFacilityCards";
import { focusLastRowActionTrigger, RowActionsCell } from "@/components/master/RowActionsCell";
import { ExportDialog, type ExportPlan } from "@/components/master/ExportDialog";
import { SkeletonRows } from "@/components/master/SmartCells";
import { PageShell } from "@/components/PageShell";
import { exportMasterCsv, exportMasterPdf, exportMasterWorkbook } from "@/lib/masterExport";
import { openPrintSheet } from "@/lib/printSheet";

// Bulk profile workbook — reuses the single-facility profile mapper so the
// master-list sheet and the per-facility exports can never drift apart.
import {
  exportFacilitiesBulkProfile,
  trackerRowsToBulkRows,
} from "@/lib/profileExport";

/** Building-type options (read from admin settings when customized). */
const BUILDING_TYPE_OPTIONS = [
  "Own Building",
  "Rented Building",
  "Rent Free Building",
];

export default function FacilityList() {
  // ONE cycle context (Part 3): the list and the badges read the same scope.
  const cycleScope = useCycleScope();
  const data = useQuery(api.ops.listFacilityRowsFast, { cycle: cycleScope });
  const { user } = useAuth();
  const settings = useQuery(api.facilities.getAppSettings, {});
  /** Part 2 — the last imports, for the "From import batch" refiner. */
  const recentBatches = useQuery(api.imports.listImportBatches, { limit: 20 });
  const deleteFacility = useMutation(api.facilities.deleteFacility);
  const createFacility = useMutation(api.facilities.createFacility);
  const updateEligibility = useMutation(api.facilityOps.updateFacilityEligibility);
  /* ================= THE VIEW LIVES IN THE URL ============================
   * WHY: the search text, the nine filters, the sort, the page and the page
   * size used to be `useState` HERE. Opening a facility profile unmounted this
   * page and the state died with it, so Back rendered a fresh, unfiltered
   * list — the bug this fixes. As query params they survive Back / Forward,
   * the "Back to list" button, a hard refresh, a pasted link and a new tab,
   * and nothing has to be "restored" after the fact because nothing is lost.
   * The rules (add/remove a filter in the URL) live in hooks/use-list-url-state
   * and the parsing rules in lib/listUrlState.ts. */
  const {
    filters,
    searchInput,
    setSearch,
    resetSearch,
    patch,
    setAll,
    restoredFrom,
    dismissRestored,
    urlKey,
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
  /** Part 2 — the "Updated" window and its refiners, straight from the URL. */
  const updRefiners = [filters.updBy, filters.updHow, filters.updBatch, filters.updField].filter(Boolean);
  const updatedPreset = filters.updated || (updRefiners.length ? "any" : "");
  const updated = updatedPreset
    ? {
        preset: updatedPreset,
        from: filters.updFrom || undefined,
        to: filters.updTo || undefined,
        by: filters.updBy || undefined,
        source: filters.updHow || undefined,
        batchId: filters.updBatch || undefined,
        field: filters.updField || undefined,
      }
    : undefined;
  const setUpdated = (v: Partial<{
    preset: typeof filters.updated;
    from: string;
    to: string;
    by: string;
    how: string;
    batch: string;
    field: string;
  }>) =>
    patch({
      updated: v.preset ?? updatedPreset,
      updFrom: v.from ?? filters.updFrom,
      updTo: v.to ?? filters.updTo,
      updBy: v.by ?? filters.updBy,
      updHow: v.how ?? filters.updHow,
      updBatch: v.batch ?? filters.updBatch,
      updField: v.field ?? filters.updField,
      page: 1,
    });
  const clearUpdated = () =>
    patch({
      updated: "",
      updFrom: "",
      updTo: "",
      updBy: "",
      updHow: "",
      updBatch: "",
      updField: "",
      page: 1,
    });
  /** Multi-column sort, straight from the URL (empty = the data's own order). */
  const sorting: SortingState = filters.sort;

  // One setter per filter. `patch` PUSHES a history entry, so Back steps the
  // filters out one at a time instead of jumping to a blank list.
  const setBlockFilter = (v: string[]) => patch({ block: v });
  const setStatusFilter = (v: string[]) => patch({ status: v });
  const setDocRepFilter = (v: string[]) => patch({ docRep: v });
  const setTypeFilter = (v: string[]) => patch({ type: v });
  const setEligibilityFilter = (v: string[]) => patch({ eligibility: v });
  const setCertFilter = (v: string[]) => patch({ cert: v });
  const setCycleFilter = (v: string[]) => patch({ cycle: v });
  const setBuildingTypeFilter = (v: string[]) => patch({ btype: v });
  const setBuildingStatusFilter = (v: string[]) => patch({ bstatus: v });
  const setNocStatusFilter = (v: string[]) => patch({ noc: v });
  const setKpiFilter = (v: KpiId | null) => patch({ kpi: v });
  const setDueWindow = (v: 0 | 30 | 60 | 90) => patch({ due: v });
  // Dragging the score slider REPLACES the entry — otherwise every pixel of the
  // drag would add a history step.
  const setScoreRange = (v: [number, number]) => patch({ score: v }, { replace: true });
  const setSorting = (next: SortingState) => patch({ sort: next });

  const [addOpen, setAddOpen] = useState(false);

  /* ------------- View state: columns, density, sorting, selection ----------
   * The view in force is DERIVED: the account's saved view (server) applies
   * until the user changes something in this session, and the browser cache
   * (localStorage) is the signed-out / offline fallback. Deriving it keeps the
   * persistence effect free of setState — that effect only writes to external
   * systems (localStorage + the `masterViews` row). */
  const [cachedView] = useState<MasterView>(() => loadMasterView("master"));
  const [editedView, setEditedView] = useState<MasterView | null>(null);
  const serverView = useQuery(api.ops.getMasterView, { scope: "master" });
  const saveServerView = useMutation(api.ops.setMasterView);
  const savedView = useMemo(
    () => (serverView?.view ? normalizeView(serverView.view) : null),
    [serverView],
  );
  const view: MasterView = editedView ?? savedView ?? cachedView;
  const setView = setEditedView;
  const [colsOpen, setColsOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">("view");
  /* The quick view's id lives in the URL (`?facility=&section=`) — Back closes
     it, a pasted link reopens it on the same section, and no second state can
     drift from the dialog. */
  const [prefetchId, setPrefetchId] = useState<string | null>(null);
  /* Edit-on-demand (Part 1 ③): the ONE active cell shows a control; every
     other cell — editable or read-only — renders its normal view-mode value
     from the SAME grid. Enter / F2 / double-click activate the editor, Esc
     cancels back to the value display, Enter (or blur) commits the draft.
     Derived, not an effect: exiting edit mode can never leave a stray open
     editor because the cell simply stops existing outside edit mode. */
  const [activeCellState, setActiveCellState] = useState<{
    rowId: string;
    key: string;
  } | null>(null);
  const activeCell = mode === "edit" ? activeCellState : null;
  const setActiveCell = setActiveCellState;

  /* ---------------- Edit mode: ONE engine (shared grid) ----------------
   *  Drafts live at page level (useRowDrafts) so a virtualized row can
   *  scroll out of the window without losing the user's edits, and every
   *  cell renders through the SAME shared grid as view mode — one sticky
   *  contract, one scroll container, one row-height rule. */
  const rowDrafts = useRowDrafts();
  const updateTrackerRowMutation = useMutation(api.facilities.updateTrackerRow);
  const [editBusyIds, setEditBusyIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<TrackerRow | null>(null);
  const editorOptions = useMemo(
    () => trackerEditorOptions(settings?.settings),
    [settings],
  );
  /** Header locks (Part 1 ②): every non-editable column carries a small lock
   *  with "Auto or read-only: <reason>" in the header tooltip — the ONE list
   *  derived from the central editable-key guard. */
  const readOnlyReasons = useMemo(() => {
    const out: Record<string, string> = {};
    for (const c of fullExportColumns()) {
      if (!isEditableCellKey(c.key)) out[c.key] = readOnlyCellReason(c.key);
    }
    return out;
  }, []);
  /** The edit view: ALL non-deprecated exportable columns (the full data
   *  set with the identity pair frozen). */
  const editView = useMemo<MasterView>(
    () => ({
      presetId: "custom",
      visibleKeys: fullExportColumns().map((c) => c.key),
      order: [],
      density: view.density,
      collapsedGroups: [],
    }),
    [view.density],
  );

  const saveEligibility = async (row: TrackerRow, el: string) => {
    try {
      await updateEligibility({
        facilityId: row.facility._id as never,
        eligibility: el as "Eligible" | "Not Eligible" | "Possible",
      });
      toast.success("Eligibility updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const saveRow = async (row: TrackerRow, state: RowEditState) => {
    const id = String(row.facility._id);
    setEditBusyIds((prev) => new Set(prev).add(id));
    try {
      await updateTrackerRowMutation(
        trackerUpdatePayload(row, state) as never,
      );
      toast.success("Row updated");
      rowDrafts.reset(row);
      flashSaved(id); // "Saved ✓" flash on the row-actions button (1.5 s)
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

  const searchRef = useRef<HTMLInputElement | null>(null);
  /** The table's scrollport — scroll restore reads/writes it (hook below). */
  const tableScrollRef = useRef<HTMLDivElement | null>(null);

  const facilityTypes: string[] =
    (settings?.settings.facilityTypes as string[] | undefined) ??
    DEFAULT_SETTINGS.facilityTypes;
  /** NQAS Eligibility dropdown labels (admin-editable) mapped back to the
   *  canonical stored values. */
  const eligibilityOptions = buildEligibilityOptions(
    settings?.settings.eligibilityOptions as string[] | undefined,
  );
  /** NQAS Certification Status labels (admin-editable) — drives the
   *  certification-status filter dropdown. */
  const certStatusOptions: string[] =
    (settings?.settings.certificationStatuses as string[] | undefined) ??
    DEFAULT_SETTINGS.certificationStatuses;
  const canAdd = data?.me.appRole === "admin" || data?.me.appRole === "entry";
  /* Sidebar deep links: the Help footer button opens the existing help and
     legend panel here (?legend=1); the palette's "Add facility" action lands
     in the Add dialog (?add=1). The URL is the source of truth — derived in
     render (never set from an effect), so a shareable link opens the dialog
     and closing it strips the consumed param (Back-friendly, no re-open
     loop). The add link also waits for the role to resolve, so a slow
     /me query can't swallow the deep link. */
  const [searchParams, setSearchParams] = useSearchParams();
  const legendDeepLink = searchParams.get("legend") === "1";
  const addDeepLink = canAdd && searchParams.get("add") === "1";
  /** Strip a consumed deep-link param once its dialog closes. */
  const consumeDeepLink = useCallback(
    (param: "legend" | "add") => {
      if (searchParams.get(param) === "1") {
        const next = new URLSearchParams(searchParams);
        next.delete(param);
        setSearchParams(next, { replace: true });
      }
    },
    [searchParams, setSearchParams],
  );

  /* ----- Task C: the row-actions column (Admin → "Row action column") ----- */
  /** Optional State-Admin setting: Show/Hide, Update/Edit label, pin-right,
   *  compact icon-only below 1280px — with hard defaults for everything. */
  const rowActionsSetting = readRowActionsSetting(
    settings?.settings.rowActionColumn,
  );
  /** Admin "Compact icon-only below 1280 px" ∧ a narrow window. The column
   *  keeps its 132px width; only the label collapses to the icon, so the
   *  pinned column (and the frozen zone) never shift. */
  const [narrowViewport, setNarrowViewport] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 1280,
  );
  useEffect(() => {
    const onResize = () => setNarrowViewport(window.innerWidth < 1280);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const compactRowActions = rowActionsSetting.compactBelow1280 && narrowViewport;


  /* ----- Quarterly IA: the store behind the dynamic IA columns ------
   *  One join of facilityIaQuarters (what the IA import writes), built into
   *  an index and attached to every row below as row.ia. The Compare-quarters
   *  selector picks which two periods the Q1/Q2 columns show; the labels
   *  follow the same pair (Admin renames stay applied underneath). */
  const iaQuartersQ = useQuery(api.ia.listIaQuarters, { limit: 20000 });
  const [iaCursor, setIaCursor] = useState<string | null>(null);
  const iaIndex = useMemo(
    () =>
      iaQuartersQ
        ? withLegacyIa(
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
              updatedAt: q.updatedAt,
            })),
            ),
            // Legacy facilities.nqasIaQ1/Q2 are REAL 2026-27 Q1/Q2 data —
            // merged in as periods so a facility never shown under a
            // calendar-guessed quarter label.
            (data?.rows ?? []).map((r) => ({
              id: r.facility._id,
              nqasIaQ1: r.facility.nqasIaQ1 ?? null,
              kayakalpIaQ1: r.facility.kayakalpIaQ1 ?? null,
              nqasIaQ2: r.facility.nqasIaQ2 ?? null,
              kayakalpIaQ2: r.facility.kayakalpIaQ2 ?? null,
            })),
          )
        : null,
    [iaQuartersQ, data],
  );
  const iaPair = useMemo(
    () => (iaIndex ? iaPairFor(iaCursor, iaIndex, todayLocalIso()) : null),
    [iaIndex, iaCursor],
  );
  const iaPeriodOptions: FyQuarter[] | [] = useMemo(
    () => (iaIndex ? allIaPeriods(iaIndex) : []),
    [iaIndex],
  );
  /** Part 2 ⑤: the compared quarter was imported before it ended → the chip
   *  says so, so nobody reads a provisional average as final. */
  const iaCurrentProvisional = useMemo(() => {
    if (!iaPair || !iaQuartersQ) return false;
    return iaQuartersQ.some(
      (q) =>
        q.fy === iaPair.current.fy &&
        q.quarter === iaPair.current.q &&
        (q as { provisional?: boolean }).provisional === true,
    );
  }, [iaQuartersQ, iaPair]);

  /* ----- Table & Display admin settings + the per-user toggles (Parts C & D)
   *  frozenColumns (0–3 data columns, defaults ["facility","type"]),
   *  pinRowCheckbox, freezeBelowPx, recentlyUpdatedDays and highlightScope
   *  arrive with every settings load, so a change in Admin reaches every
   *  user on their next render — no redeploy. The two per-user toggles
   *  ("Freeze columns", "Highlight updates") live in localStorage. */
  const displaySettings = useMemo(() => readDisplaySettings(settings?.settings), [settings]);
  const [freezeOn, setFreezeOn] = useState<boolean>(() => loadBoolPref(FREEZE_PREF_KEY));
  const [recentOn, setRecentOn] = useState<boolean>(() => loadBoolPref(HIGHLIGHT_PREF_KEY));
  useEffect(() => saveBoolPref(FREEZE_PREF_KEY, freezeOn), [freezeOn]);
  useEffect(() => saveBoolPref(HIGHLIGHT_PREF_KEY, recentOn), [recentOn]);
  /* Focus mode (key F) hides the command bar and tabs, leaving the table.
     It is remembered per browser like the other display prefs. */
  const [focusMode, setFocusMode] = useState<boolean>(() => loadBoolPref("master.focus"));
  useEffect(() => saveBoolPref("master.focus", focusMode), [focusMode]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "f" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      e.preventDefault();
      setFocusMode((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  /** Freeze only above the Admin "disable freezing below" width. */
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window === "undefined" ? 1280 : window.innerWidth,
  );
  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const freezeActive = freezeOn && viewportWidth >= displaySettings.freezeBelowPx;

  /** Read-time "Recently updated" markers (getRecentUpdates) — one reactive
   *  query, no per-row flag anywhere (Part C). Off when the user toggle is
   *  off or the Admin days setting is 0. */
  const recentQueryArgs =
    recentOn && displaySettings.recentDays > 0
      ? { days: displaySettings.recentDays, scope: displaySettings.highlightScope }
      : "skip";
  const recentMap = useQuery(api.imports.getRecentUpdates, recentQueryArgs) as RecentMap | undefined;
  /** FACILITY → (column-key → marker), resolved against the DISPLAYED
   *  Compare-quarters pair — the IA columns only ever show one pair at a
   *  time, so their markers follow the same selection. */
  const recentByFacility = useMemo(
    () => (recentMap ? resolveCellMarkers(recentMap, iaPair) : {}),
    [recentMap, iaPair],
  );

  /** The 54-column config with admin renames applied — the ONE label map the
   *  table, the drawer and both exports read. IA labels carry the selected
   *  Compare-quarters pair on top. */
  const labels = useMemo(
    () =>
      withIaPeriodLabels(
        resolveLabels(MASTER_COLUMNS, settings?.settings.tableHeaderOverrides as Record<string, string> | undefined),
        iaPair,
      ),
    [settings, iaPair],
  );

  /** The live rows from Convex, kept in their full shape: they are already
   *  structurally a MasterRow (the shared column config reads them), and the
   *  table, the drawer and the exports want the richer Convex row type too. */
  const liveRows = data?.rows;
  /** NO REFETCH FLASH: returning from a facility profile paints the rows the
   *  user was looking at (kept in memory for ~60s) instead of a skeleton, and
   *  the live Convex subscription replaces them the moment it answers — a
   *  silent refresh, not a reload. The snapshot is only ever a fallback: live
   *  data always wins, so a just-saved edit shows up immediately. */
  const [snapshotRows] = useState<MasterRow[] | null>(() => loadRowsSnapshot());
  // The snapshot IS a previous `data.rows`, so it carries the full Convex row
  // shape the table, the drawer and the exports are typed against — the cast
  // states that instead of widening every consumer to the plain MasterRow.
  /* Part C ③ — ONE rule source: the Admin document rules decide a missing
     required file, and the KPI card, the panel, the smart view, the bell and
     the Master List's Documents cell all read the same resolved requirement.
     Declared BEFORE the rows because the cell's amber chip is built here. */
  const documentRules = useMemo(
    () => normalizeDocumentRules(settings?.settings?.documentRules),
    [settings],
  );
  /* Admin → Pending rules: the smart-view tab, the KPI card and the bell all
     read the same registry config, so their counts match. */
  const pendingConfig = useMemo(
    () => normalizePendingConfig(settings?.settings?.pendingRules),
    [settings],
  );
  const masterRows = useMemo(() => {
    const base = (liveRows ?? snapshotRows ?? []) as NonNullable<typeof liveRows>;
    const enriched = base.map((r) => {
      const withIa = iaIndex && iaPair ? { ...r, iaq: attachIaExtras(String(r.facility._id), iaIndex, iaPair) } : r;
      // The Master List Documents cell prints "Required missing" from this,
      // resolved with the LIVE Admin rules (never a hard-coded default).
      const missing = requiredDocumentsMissing(withIa as MasterRow, documentRules);
      if (missing.length === 0 || !withIa.docs) return withIa;
      return { ...withIa, docs: { ...withIa.docs, requiredMissing: missing } };
    });
    return enriched as NonNullable<typeof liveRows>;
  }, [liveRows, snapshotRows, iaIndex, iaPair, documentRules]);
  const loaded = liveRows !== undefined || snapshotRows !== null;
  useEffect(() => {
    if (liveRows) saveRowsSnapshot(liveRows);
  }, [liveRows]);

  /* ONE data-as-of stamp (Part 1 ⑤ / 2.1.1): the newest server-side updatedAt
     across the loaded rows — a real server timestamp, refreshed with the
     subscription (never a client clock). The grid toolbar's "Last updated"
     line and the page header share this single figure. */
  const dataAsOf = useMemo(() => latestUpdatedAt(masterRows), [masterRows]);

  /* ---------------- Facility Quick View (centred dialog) --------------
   * The open facility + section live in the URL (`?facility=&section=`), so
   * Back closes the dialog (with the unsaved-changes guard) and a copied link
   * reopens the same facility on the same section. */
  const quickRow = useMemo(
    () =>
      filters.facility
        ? (masterRows as MasterRow[]).find(
            (r) => String(r.facility._id) === filters.facility,
          ) ?? null
        : null,
    [filters.facility, masterRows],
  );
  const openQuickRow = (row: MasterRow | null, section = "overview") => {
    // A plain row open is VIEW mode — the Update column's edit request must
    // not leak into it (the token only ever applies while it is "live").
    setQuickEditRequest(null);
    patch(
      {
        facility: row ? String(row.facility._id) : "",
        section: row ? section : "",
        page: filters.page,
      },
      { replace: false },
    );
  };
  const closeQuickRow = () => {
    setQuickEditRequest(null);
    patch({ facility: "", section: "", page: filters.page }, { replace: true });
  };
  const navigateQuickRow = (row: MasterRow) => {
    setPrefetchId(String(row.facility._id));
    patch(
      {
        facility: String(row.facility._id),
        section: filters.section || "overview",
        page: filters.page,
      },
      { replace: false },
    );
  };
  const setQuickSection = (key: string) =>
    patch(
      { facility: filters.facility, section: key, page: filters.page },
      { replace: true },
    );

  /* -------- Row-actions: Update opens the Quick View IN EDIT MODE --------
   * The dialog reads the section from the URL like every other open path;
   * a `quickEditToken` bump tells it to start on Edit this time (render-
   * applied, no post-paint flash). THE ONE save path (saveQuickRow) feeds
   * both this column and the dialog, so undo/audit/optimistic rules are
   * shared. */
  const [quickEditRequest, setQuickEditRequest] = useState<{
    facilityId: string;
    token: number;
  } | null>(null);
  /** "Saved ✓" flash: facilityIds that saved successfully < 1.5 s ago. */
  const [savedIds, setSavedIds] = useState<ReadonlySet<string>>(new Set());
  const flashSaved = useCallback((facilityId: string) => {
    setSavedIds((prev) => new Set(prev).add(facilityId));
    window.setTimeout(() => {
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(facilityId);
        return next;
      });
    }, 1500);
  }, []);
  /** Column preset → the matching Quick View section (`?section=`). */
  const viewSection = (preset: string): string => {
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
  /** The ⋯ menu's "View history" — the shared Audit section, VIEW mode. */
  const openHistoryFor = (row: MasterRow) => {
    setPrefetchId(String(row.facility._id));
    setQuickEditRequest(null);
    patch(
      { facility: String(row.facility._id), section: "audit", page: filters.page },
      { replace: false },
    );
  };
  /** The row-actions Update button (and U on a focused row). */
  const openUpdateFor = (row: MasterRow) => {
    if (!(data?.me.appRole === "admin" || data?.me.appRole === "entry")) {
      openHistoryFor(row);
      return;
    }
    setPrefetchId(String(row.facility._id)); // hover/focus already did; cheap
    setQuickEditRequest({ facilityId: String(row.facility._id), token: Date.now() });
    patch(
      {
        facility: String(row.facility._id),
        section: viewSection(view.presetId),
        page: filters.page,
      },
      { replace: false },
    );
  };

  /** One save path for the dialog: the SAME payload builder as the grid. */
  const saveQuickRow = async (target: MasterRow, state: RowEditState) => {
    await updateTrackerRowMutation(
      trackerUpdatePayload(target as unknown as TrackerRow, state) as never,
    );
    toast.success("Facility updated");
    flashSaved(String(target.facility._id));
  };

  /** The signed-in role, for the stamped "generated by" line. */
  const generatedBy = data?.me.appRole
    ? `NQAS Tracker (${data.me.appRole})`
    : "NQAS Tracker";

  /** Every "Print facility sheet" entry point: ONE dialog, ONE generator. */
  const printSheet = (target: MasterRow) => openPrintSheet({ row: target, generatedBy });

  /** "Export this facility" — the same two-page sheet, or a one-row workbook. */
  const exportQuickRow = async (target: MasterRow, format: "pdf" | "excel") => {
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
        fileNameBase: `facility-${target.facility.name.replace(/[^\w]+/g, "-").toLowerCase()}`,
      },
      (buf, name) =>
        downloadBlob(
          new Blob([buf], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
          name,
        ),
    );
  };

  /**
   * Preserves the user's arrangement between visits: the device cache is
   * written immediately, the account copy (convex `masterViews`) is debounced
   * so dragging columns or flipping density writes once, not per interaction.
   * The service copy is only written once the user has actually chosen
   * something, so an untouched page never overwrites a newer saved view.
   */
  useEffect(() => {
    saveMasterView("master", view);
    if (!editedView) return;
    const t = window.setTimeout(() => {
      void saveServerView({ scope: "master", view: normalizeView(view) }).catch((err) => {
        // Best-effort sync: the view is already saved on this device, so a
        // failed account write must not look like a broken page.
        console.warn("Could not save your column layout to your account:", err);
      });
    }, 700);
    return () => window.clearTimeout(t);
  }, [view, editedView, saveServerView]);

  /** "/" jumps to the search box (a common table convention), unless the
   *  user is already typing somewhere else. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  /** Unique status labels; legacy candidate spellings fold into the
   *  current "Facility (Future Candidate)" label. */
  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of data?.rows ?? []) set.add(foldStatus(r.facility.currentStatus));
    return [...set].sort();
  }, [data]);

  /** Certification Cycle filter — every cycle number present in the data, plus
   *  "No cycle" for facilities without one. */
  const cycleOptions = useMemo(() => {
    const nums = new Set<number>();
    let hasNone = false;
    for (const r of data?.rows ?? []) {
      if (r.cycleNumber) nums.add(r.cycleNumber);
      else hasNone = true;
    }
    const opts = [...nums].sort((a, b) => a - b).map((n) => ({
      value: String(n),
      label: `Cycle #${n}`,
    }));
    if (hasNone) opts.push({ value: NO_CYCLE, label: "No cycle" });
    return opts;
  }, [data]);

  /** Documents Status (Report) options — the seeded report values (the same
   *  list the status map and the SaQsham import wizard use) plus any stored
   *  value found in the data, so a value saved by an older import is still
   *  filterable. */
  const docReportOptions = useMemo(() => {
    const set = new Set(REPORT_STATUS_VALUES);
    for (const r of data?.rows ?? []) {
      const v = r.facility.documentsStatusReport;
      if (v && !set.has(v)) set.add(v);
    }
    return [...set].sort();
  }, [data]);

  /** Building Type filter — settings list plus any values in the data, so
   *  nothing stored is unfilterable. */
  const buildingTypeOptions = useMemo(() => {
    const base =
      (settings?.settings.buildingTypes as string[] | undefined) ??
      BUILDING_TYPE_OPTIONS;
    const extra = (data?.rows ?? [])
      .map((r) => r.building?.buildingType ?? "")
      .filter((t) => t && !base.includes(t));
    return [...base, ...new Set(extra)];
  }, [settings, data]);

  /** Facility Building Status filter — same union approach. */
  const buildingStatusOptions = useMemo(() => {
    const base =
      (settings?.settings.buildingStatuses as string[] | undefined) ?? [
        "Good", "Needs Repair", "Under Renovation", "Dilapidated",
      ];
    const extra = (data?.rows ?? [])
      .map((r) => r.building?.buildingStatus ?? "")
      .filter((s) => s && !base.includes(s));
    return [...base, ...new Set(extra)];
  }, [settings, data]);

  /** Fire NOC validity statuses — the same four the row editor derives. */
  const nocStatusFilterOptions = useMemo(
    () => ["Valid", "Expiring Soon", "Expired", "Not Obtained"],
    [],
  );

  /** Block names — the Block filter and its option counts both read this. */
  const blockNames = useMemo(() => (data?.blocks ?? []).map((b) => b.name), [data]);

  /** Every active filter as the engine's argument object. The list itself and
   *  the dropdown counts both build from this, so a "(23)" beside an option can
   *  never describe a different list than the one on screen. */
  const filterArgs = (over: Partial<MasterFilters> = {}): MasterFilters => ({
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
    ...over,
  });

  /** The whole filter chain — one call into the shared, unit-tested engine so
   *  the KPI numbers, the chips and the rows can never disagree. */
  const filtered = useMemo(
    () =>
      masterRows.length === 0
        ? []
        : applyMasterFilters(
          masterRows,
          filterArgs(),
          new Date(),
          documentRules,
          pendingConfig,
          settings?.settings,
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
      settings?.settings,
    ],
  );

  /* Five quick tabs, one pass, counts that always match the list they open.
     The tab dimension itself is removed from the base so switching tabs never
     double-filters. */
  const tabBaseRows = useMemo(
    () =>
      applyMasterFilters(
        masterRows,
        { ...filterArgs(), kpi: null, eligibility: [] },
        new Date(),
        documentRules,
        pendingConfig,
        settings?.settings,
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
      settings?.settings,
    ],
  );
  const quickTabCounts = useMemo(() => {
    const today = new Date();
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
  const activeQuickTab =
    kpiFilter === "attention"
      ? "attention"
      : kpiFilter === "certified"
        ? "certified"
        : eligibilityFilter.length === 1 && eligibilityFilter[0] === "Eligible"
          ? "eligible"
          : eligibilityFilter.length === 1 && eligibilityFilter[0] === "Not Eligible"
            ? "notEligible"
            : kpiFilter == null && eligibilityFilter.length === 0
              ? "all"
              : null;

  /* Any Master List column can become a filter, without a query per keystroke.
     The shipped dropdowns stay for the fast paths; this bar adds the long tail
     and saved/shared filter sets on the rows already loaded. */
  const [extraBar, setExtraBar] = useState<BarValue>({
    barKeys: [],
    filters: [],
    match: "all",
  });
  const extraFields = useMemo<FilterField[]>(() => {
    const filterText = (row: MasterRow, key: string): string => {
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
      (column) =>
        !column.deprecated &&
        column.type !== "action" &&
        column.type !== "link" &&
        column.type !== "links" &&
        column.type !== "docStatus",
    ).map((column) => {
      const values = [...new Set(masterRows.map((row) => filterText(row, column.key)).filter(Boolean))];
      const baseType: FilterField["type"] =
        column.type === "score" || column.type === "currency"
          ? "number"
          : column.type === "date" || column.type === "dueDate"
            ? "date"
            : "text";
      const type: FilterField["type"] =
        column.type === "status" || (baseType === "text" && values.length > 0 && values.length <= 60)
          ? "select"
          : baseType;
      return {
        key: column.key,
        label: labels[column.key] ?? column.label,
        type,
        onThisPage: ["facility", "block", "type", "currentStatus"].includes(column.key),
        options: type === "select" ? values.map((value) => ({ value })) : undefined,
      };
    });
  }, [labels, masterRows]);
  const visibleRows = useMemo(() => {
    const get = (row: MasterRow, key: string): string => {
      const value = cellValue(row, key);
      if (value.kind === "date" || value.kind === "dueDate") {
        const raw = value.value;
        if (raw == null || raw === "") return "";
        const parsed = typeof raw === "number" ? raw : Date.parse(raw);
        return Number.isNaN(parsed) ? String(raw) : new Date(parsed).toISOString().slice(0, 10);
      }
      return cellText(row, key);
    };
    return filtered.filter((row) =>
      rowPasses(extraBar.filters, extraBar.match, (key) => get(row as MasterRow, key)),
    );
  }, [filtered, extraBar]);
  const recentLegend =
    recentOn && displaySettings.recentDays > 0
      ? `Highlighted = updated in the last ${displaySettings.recentDays} day${displaySettings.recentDays === 1 ? "" : "s"}`
      : null;

  /** Live "(23)" counts beside every dropdown option (see lib/listOptionCounts):
   *  how many rows would remain if that option were the only one selected in
   *  ITS filter — computed against the other active filters. Recomputed on
   *  every filter change, which is what makes them live. */
  const optionCounts = useMemo(
    () =>
      masterRows.length === 0
        ? null
        : countListOptions(masterRows, filterArgs(), {
            block: blockNames,
            type: facilityTypes,
            cycle: cycleOptions.map((o) => o.value),
            eligibility: eligibilityOptions.map((o) => o.value),
            cert: [...certStatusOptions].sort(),
            status: statusOptions,
            docRep: docReportOptions,
            btype: buildingTypeOptions,
            bstatus: buildingStatusOptions,
            noc: nocStatusFilterOptions,
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
      scoreRange,
    ],
  );

  /** Dropdown options with their live count (and the label the filter uses),
   *  in one place so every dropdown is built the same way. */
  const optionList = (
    values: string[],
    counts?: Map<string, number> | null,
    labels?: Record<string, string>,
  ) =>
    values.map((v) => ({
      value: v,
      label: labels?.[v] ?? v,
      count: counts?.get(v),
    }));

  /** How many filters are hidden behind the "More filters" button — the badge
   *  on it, so a filter is never silently narrowing the table. */
  const secondaryActiveCount =
    countActiveFilters([
      eligibilityFilter,
      certFilter,
      docRepFilter,
      buildingTypeFilter,
      buildingStatusFilter,
      nocStatusFilter,
    ]) +
    (dueWindow > 0 ? 1 : 0) +
    (scoreRange[0] > 0 || scoreRange[1] < 100 ? 1 : 0);

  /** "Clear all filters": every filter AND the search, but the sort and the
   *  column selection stay (that is what "Reset view" is for). */
  const clearAllFilters = () => {
    resetSearch();
    setAll({ ...defaultListFilters(), size: filters.size, sort: filters.sort });
  };

  /** "Reset view": filters, search, sort, page and the column preset back to
   *  their defaults, with an Undo that puts the whole view back. */
  const toggleGroup = (group: MasterGroupId) => {
    const collapsed = new Set(view.collapsedGroups ?? []);
    if (collapsed.has(group)) collapsed.delete(group);
    else collapsed.add(group);
    setView({ ...view, collapsedGroups: [...collapsed] });
  };
  const openTab = (tab: "all" | "attention" | "eligible" | "certified" | "notEligible") => {
    if (tab === "all") {
      patch({ kpi: null, eligibility: [] });
      return;
    }
    if (tab === "eligible" || tab === "notEligible") {
      patch({
        kpi: null,
        eligibility: [tab === "eligible" ? "Eligible" : "Not Eligible"],
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
        },
      },
    });
  };

  /* The table loads the filtered rows once and virtualizes them — there is no
     page-sized slice, so the footer and the list always agree. */
  /** Rows with a saved local Quick View draft — page-level Set (the
   *  row-actions cell paints a small Draft dot; never a per-row localStorage
   *  read). Recomputed only when the visible page or the user moves. */
  const draftIds: ReadonlySet<string> = useMemo(() => {
    const userId = (user?._id as string | undefined) ?? undefined;
    return new Set(
      (visibleRows as MasterRow[])
        .filter((r) => loadQuickViewDraft(String(r.facility._id), userId) != null)
        .map((r) => String(r.facility._id)),
    );
  }, [visibleRows, user?._id]);
  /** Rows carrying unsaved drafts — the sticky bar count. */
  const unsavedCount = useMemo(
    () => rowDrafts.dirtyCount(visibleRows as TrackerRow[]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rowDrafts, visibleRows, rowDrafts.drafts],
  );

  /** Back from a profile: the same scroll position, for the window and for the
   *  table's own scrollport (long lists scroll horizontally too). */
  useScrollRestore(urlKey, loaded, tableScrollRef);

  /* ------------------------------- Export ------------------------------- */
  /** Human sentence of everything narrowing the list (goes on the Summary
   *  sheet and the PDF header so a printed file explains itself). */
  const describeFilters = (): string => {
    const bits: string[] = [];
    if (search.trim()) bits.push(`Search “${search.trim()}”`);
    const multi = (label: string, values: string[]) => {
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
      const preset =
        updatedPreset === "any"
          ? "any time"
          : updatedPreset === "custom"
            ? `${filters.updFrom || "any"} – ${filters.updTo || "today"}`
            : updatedPreset === "24h"
              ? "last 24 hours"
              : updatedPreset === "7d"
                ? "last 7 days"
                : updatedPreset === "30d"
                  ? "last 30 days"
                  : "today";
      const how = filters.updHow
        ? ` · ${LAST_CHANGE_SOURCE_LABEL[filters.updHow] ?? filters.updHow}`
        : "";
      bits.push(`Updated: ${preset}${how}`);
    }
    return bits.join(" · ");
  };

  const buildExportOptions = (plan: ExportPlan) => {
    const source =
      plan.scope === "all" ? masterRows : (visibleRows as MasterRow[]);
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
      ...(plan.markRecent
        ? {
            recentMarks: recentByFacility,
            recentLegend: recentLegend ?? "Recently updated cells",
          }
        : {}),
      fileNameBase: `facility-master-list-${new Date().toISOString().slice(0, 10)}`,
    };
  };

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** One-click export shortcuts (Export split-button caret): the SAME engine
   *  and plan type as the dialog, with the always-sane defaults filled in —
   *  current filters and columns, A4 landscape PDF. */
  const quickExport = (
    format: "xlsx" | "pdf" | "csv" | "print",
    pdf?: PdfMeta,
  ) => {
    const columns = orderedVisibleColumns(view, displaySettings.frozenColumns);
    void runExport({
      format,
      scope: "filtered",
      columns,
      pdf: pdf ?? {},
      extras: { surveillanceDue: false, fireNocAlerts: false, gapClosure: false },
      markRecent: false,
      filtersText: describeFilters() || "None",
    });
  };

  const runExport = async (plan: ExportPlan) => {
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
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            }),
            name,
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

  /** Bulk profile workbook — ONE ROW PER FACILITY built by the exact same
   *  mapper as the single-facility export (same column order, same status
   *  labels, same score formatting), so a district-wide sheet lines up with
   *  the per-facility PDF/Excel without any code drift. Open-gap counts here
   *  use the latest Gap Closure fund record the master list already loads. */
  const exportProfilesBulk = async () => {
    try {
      await exportFacilitiesBulkProfile(
        // Same mapper as the single-facility profile export (and as the Admin
        // Settings backup action), so the columns always line up.
        trackerRowsToBulkRows(filtered),
        { generatedBy: data?.me.appRole ? `NQAS Tracker (${data.me.appRole})` : "" },
      );
      toast.success(`Profile workbook exported (${filtered.length} facilities)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  };


  /* Active filters as removable chips — one glance shows exactly why the
   * list is short, and each chip removes only itself (from the URL, so Back
   * still walks through the filter history). */
  const chips: FilterChip[] = [];
  const pushMulti = (
    key: string,
    values: string[],
    /** The remaining values once this one is removed. */
    setter: (next: string[]) => void,
    label: (v: string) => string,
  ) => {
    for (const v of values)
      chips.push({
        key: `${key}:${v}`,
        label: label(v),
        onRemove: () => setter(values.filter((x) => x !== v)),
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
      onRemove: () => setKpiFilter(null),
    });
  if (metricFilter)
    chips.push({
      key: "metric",
      label: `Metric: ${METRIC_LABELS[metricFilter]}`,
      onRemove: () => patch({ metric: "" }),
    });
  if (dueWindow > 0)
    chips.push({ key: "due", label: `Due ≤ ${dueWindow} days`, onRemove: () => setDueWindow(0) });
  if (scoreRange[0] > 0 || scoreRange[1] < 100)
    chips.push({
      key: "score",
      label: `Score ${scoreRange[0]}–${scoreRange[1]}%`,
      onRemove: () => setScoreRange([0, 100]),
    });
  if (updatedPreset) {
    const presetLabel =
      updatedPreset === "any"
        ? "any time"
        : updatedPreset === "today"
        ? "today"
        : updatedPreset === "24h"
          ? "last 24 hours"
          : updatedPreset === "7d"
            ? "last 7 days"
            : updatedPreset === "30d"
              ? "last 30 days"
              : `${filters.updFrom || "any"} – ${filters.updTo || "today"}`;
    const how = filters.updHow
      ? ` · ${LAST_CHANGE_SOURCE_LABEL[filters.updHow] ?? filters.updHow}`
      : "";
    chips.push({
      key: "updated",
      label: `Updated: ${presetLabel}${how}`,
      onRemove: clearUpdated,
    });
  }

  return (
    <AppShell
      title="Facility Master List"
      subtitle={
        loaded
          ? `${masterRows.length} ${masterRows.length === 1 ? "facility" : "facilities"}`
          : "Loading facilities…"
      }
      actions={
        <div className="flex items-center gap-2">
          {/* ONE segmented View | Edit control (redesign): unambiguous
              labels, Edit hidden from Viewers. */}
          {canAdd ? (
            <span
              className="flex rounded-lg border border-border/60 bg-background p-0.5"
              role="group"
              aria-label="Table mode"
            >
              {(["view", "edit"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  data-tip={
                    m === "view"
                      ? "The grouped read-only view"
                      : "Switch to the editable table (in-row Update)"
                  }
                  onClick={() => {
                    if (m === mode) return;
                    setMode(m);
                    if (m === "view") toast.success("Back to the grouped view");
                  }}
                  className={cn(
                    "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium capitalize transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    mode === m
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {m === "view" ? <Eye className="size-3.5" /> : <PencilLine className="size-3.5" />}
                  {m === "view" ? "View" : "Edit"}
                </button>
              ))}
            </span>
          ) : null}

          {/* Export split: the primary button opens the whole dialog (scope,
              columns, PDF paper…); the caret shortcuts Excel / PDF / CSV /
              Print without the dialog. */}
          <span className="flex overflow-hidden rounded-lg">
            <Button
              variant="outline"
              className="rounded-r-none"
              disabled={!data}
              onClick={() => setExportOpen(true)}
            >
              <FileSpreadsheet className="size-4" /> Export
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="rounded-l-none border-l-0 px-1.5"
                  disabled={!data}
                  aria-label="Export shortcuts"
                >
                  <ChevronDown className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => quickExport("xlsx")}>
                  <FileSpreadsheet className="size-4" /> Excel — current view
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => quickExport("pdf", { paper: "a4", orientation: "landscape" })}>
                  <FileText className="size-4" /> PDF — current view
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => quickExport("csv")}>
                  <FileText className="size-4" /> CSV — current view
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => quickExport("print")}>
                  <Eye className="size-4" /> Print
                </DropdownMenuItem>
                <DropdownMenuLabel>Facility profiles</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => void exportProfilesBulk()}
                  disabled={!data || filtered.length === 0}
                >
                  <FileSpreadsheet className="size-4" /> Profiles – Excel (.xlsx)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </span>

          {/* ONE import button (deep links /bulk-import/saqsham and
              /bulk-import/internal-assessment live on that page) for editors. */}
          {canAdd && (
            <Button
              variant="outline"
              className="gap-2"
              data-tip="SaQsham Document Status · Internal Assessment · Facility CSV"
              onClick={() => {
                window.location.assign("/bulk-import");
              }}
            >
              <Upload className="size-4" />
              <span className="hidden sm:inline">Import</span>
            </Button>
          )}

          {/* ⋯ More: everything that used to float around the toolbar, in one
              labelled menu (redesign Part 3.1). */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="gap-1 px-2.5"
                disabled={!data}
                aria-label="More actions"
              >
                <MoreHorizontal className="size-4" />
                <span className="hidden sm:inline">More</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={resetView} data-tip="Back to the default view">
                <RotateCcw className="size-3.5" /> Reset view
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setFocusMode((v) => !v)}
                data-tip="Hides everything except the toolbar and the table (key F)"
              >
                {focusMode ? (
                  <Maximize2 className="size-3.5" />
                ) : (
                  <Minimize2 className="size-3.5" />
                )}
                {focusMode ? "Exit focus mode" : "Focus mode"}
                <span className="ml-auto text-[10px] text-muted-foreground">F</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setColsOpen(true)}>
                <SlidersHorizontal className="size-3.5" /> Column settings
              </DropdownMenuItem>
              <DropdownMenuLabel>Details</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setLegendOpen(true)}>
                <Info className="size-3.5" /> Help and legend
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {canAdd && (
            <Button className="gap-2" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" /> Add facility
            </Button>
          )}
        </div>
      }
    >
      {/* A skeleton only when there is genuinely nothing to show: on the way
          back from a profile the snapshot paints the rows instantly (see
          masterRows above) and Convex refreshes them in the background. */}
      {!loaded ? (
        <SkeletonRows rows={10} />
      ) : (
        <PageShell
          bodyScroll={false}
          footer={
            <div
              data-testid="master-status-line"
              className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t border-border/60 bg-background/95 px-3 py-1.5 text-[11px] text-muted-foreground"
            >
              <span>
                Showing <b className="font-semibold text-foreground">{visibleRows.length}</b>{" "}
                of <b className="font-semibold text-foreground">{masterRows.length}</b>{" "}
                {masterRows.length === 1 ? "facility" : "facilities"}
              </span>
              <span aria-hidden>·</span>
              <span>Data as of {dataAsOf ? `${toDisplayStamp(dataAsOf)} IST` : "-"}</span>
              {iaPair && (
                <>
                  <span aria-hidden>·</span>
                  <span>
                    NQAS IA % {formatFyQuarter(iaPair.current.fy, iaPair.current.q)} vs{" "}
                    {formatFyQuarter(iaPair.previous.fy, iaPair.previous.q)}
                    {iaCurrentProvisional ? " (provisional)" : ""}
                  </span>
                </>
              )}
            </div>
          }
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="shrink-0">
          <UniversalFilterBar
            pageKey="master.list"
            fields={extraFields}
            value={extraBar}
            onChange={setExtraBar}
            summary={`Showing ${visibleRows.length} of ${masterRows.length}`}
            className="mb-2"
          />
          <div className="glass mb-2 flex items-center gap-2 overflow-x-auto rounded-xl border border-border/60 p-2 [scrollbar-width:thin]">
            <FilterSearch
              value={searchInput}
              onChange={setSearch}
              placeholder="Search facility, PHC, block, NIN"
              inputRef={searchRef}
              className="min-w-44 flex-1 sm:max-w-64"
            />
            <CycleFilter showChip={false} className="shrink-0" />
            <FilterDropdown
              label="Block"
              options={optionList(blockNames, optionCounts?.block)}
              value={blockFilter}
              onChange={setBlockFilter}
              triggerWidth="w-32 shrink-0"
              quietWhenEmpty
            />
            <FilterDropdown
              label="Facility Type"
              options={optionList(facilityTypes, optionCounts?.type)}
              value={typeFilter}
              onChange={setTypeFilter}
              triggerWidth="w-36 shrink-0"
              quietWhenEmpty
            />
            <FilterDropdown
              label={FACILITY_CURRENT_STATUS_LABEL}
              options={optionList(statusOptions, optionCounts?.status)}
              value={statusFilter}
              onChange={setStatusFilter}
              triggerWidth="w-40 shrink-0"
              quietWhenEmpty
            />
            {/* Part 2 — "Updated": a first-class window filter with presets and
                refiners. The chip above the table shows exactly what is on. */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={updatedPreset ? "secondary" : "outline"}
                  className="h-9 shrink-0 gap-2"
                  data-testid="updated-filter"
                >
                  <CalendarClock className="size-4" />
                  Updated
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Updated</p>
                  {updatedPreset && (
                    <button
                      type="button"
                      onClick={clearUpdated}
                      className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      ["today", "Today"],
                      ["24h", "Last 24 hours"],
                      ["7d", "Last 7 days"],
                      ["30d", "Last 30 days"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={updatedPreset === value}
                      onClick={() => setUpdated({ preset: value })}
                      className={cn(
                        "min-h-9 rounded-lg border px-2 text-xs font-medium transition-colors",
                        updatedPreset === value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/60 hover:bg-muted",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    type="button"
                    aria-pressed={updatedPreset === "custom"}
                    onClick={() => setUpdated({ preset: "custom" })}
                    className={cn(
                      "col-span-2 min-h-9 rounded-lg border px-2 text-xs font-medium transition-colors",
                      updatedPreset === "custom"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60 hover:bg-muted",
                    )}
                  >
                    Custom range
                  </button>
                </div>
                {updatedPreset === "custom" && (
                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1 text-[11px] text-muted-foreground">
                      From
                      <Input
                        type="date"
                        className="h-9 text-xs"
                        value={filters.updFrom}
                        onChange={(e) => setUpdated({ from: e.target.value })}
                      />
                    </label>
                    <label className="space-y-1 text-[11px] text-muted-foreground">
                      To
                      <Input
                        type="date"
                        className="h-9 text-xs"
                        value={filters.updTo}
                        onChange={(e) => setUpdated({ to: e.target.value })}
                      />
                    </label>
                  </div>
                )}
                <div className="space-y-2 border-t border-border/60 pt-2">
                  <label className="block space-y-1 text-[11px] text-muted-foreground">
                    How
                    <Select
                      value={filters.updHow || "any"}
                      onValueChange={(v) => setUpdated({ how: v === "any" ? "" : v })}
                    >
                      <SelectTrigger className="h-9 text-xs" aria-label="Updated how">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any" className="text-xs">Any source</SelectItem>
                        {Object.entries(LAST_CHANGE_SOURCE_LABEL).map(([value, label]) => (
                          <SelectItem key={value} value={value} className="text-xs">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="block space-y-1 text-[11px] text-muted-foreground">
                    Updated by
                    <Input
                      className="h-9 text-xs"
                      placeholder="Any user"
                      value={filters.updBy}
                      onChange={(e) => setUpdated({ by: e.target.value })}
                    />
                  </label>
                  <label className="block space-y-1 text-[11px] text-muted-foreground">
                    Which field changed
                    <Select
                      value={filters.updField || "any"}
                      onValueChange={(v) => setUpdated({ field: v === "any" ? "" : v })}
                    >
                      <SelectTrigger className="h-9 text-xs" aria-label="Which field changed">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any" className="text-xs">Any field</SelectItem>
                        {MASTER_COLUMNS.filter((c) => !c.key.startsWith("_") && c.key !== "actions")
                          .slice(0, 40)
                          .map((c) => (
                            <SelectItem key={c.key} value={c.key} className="text-xs">
                              {c.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </label>
                  {(recentBatches ?? []).length > 0 && (
                    <label className="block space-y-1 text-[11px] text-muted-foreground">
                      From import batch
                      <Select
                        value={filters.updBatch || "any"}
                        onValueChange={(v) => setUpdated({ batch: v === "any" ? "" : v })}
                      >
                        <SelectTrigger className="h-9 text-xs" aria-label="From import batch">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any" className="text-xs">Any batch</SelectItem>
                          {(recentBatches ?? []).map((b) => (
                            <SelectItem key={b._id} value={String(b._id)} className="text-xs">
                              {new Date(b.importedAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}{" "}
                              · {b.kind === "ia" ? "IA" : "SaQsham"} · {b.rowsUpdated} facilities
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </label>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 shrink-0 gap-2">
                  <SlidersHorizontal className="size-4" />
                  More filters
                  {secondaryActiveCount > 0 && (
                    <span className="rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground tabular-nums">
                      {secondaryActiveCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="max-h-[70vh] w-80 space-y-3 overflow-y-auto"
                // The filter dropdowns portal their option panels to <body>
                // (see FilterDropdown), i.e. outside this popover's DOM
                // subtree. Without this guard Radix would treat the first
                // option click as an outside interaction and close this panel
                // mid-selection.
                onInteractOutside={(event) => {
                  const original = (event.detail as { originalEvent?: Event } | undefined)
                    ?.originalEvent;
                  const target = (original?.target ?? event.target) as HTMLElement | null;
                  if (target?.closest?.("[data-filter-panel]")) event.preventDefault();
                }}
              >
                <p className="text-sm font-semibold">More filters</p>
                <div className="grid gap-2">
                  <FilterDropdown
                    label="NQAS Eligibility"
                    options={optionList(
                      eligibilityOptions.map((o) => o.value),
                      optionCounts?.eligibility,
                      Object.fromEntries(eligibilityOptions.map((o) => [o.value, o.label])),
                    )}
                    value={eligibilityFilter}
                    onChange={setEligibilityFilter}
                    triggerWidth="w-full"
                  />
                  <FilterDropdown
                    label="NQAS Certification Status"
                    options={optionList([...certStatusOptions].sort(), optionCounts?.cert)}
                    value={certFilter}
                    onChange={setCertFilter}
                    triggerWidth="w-full"
                  />
                  {/* SaQsham import output — filter on the derived report value
                      (the state the reports and dashboards group by). */}
                  <FilterDropdown
                    label="Documents Status (Report)"
                    options={optionList(docReportOptions, optionCounts?.docRep)}
                    value={docRepFilter}
                    onChange={setDocRepFilter}
                    triggerWidth="w-full"
                  />
                  <FilterDropdown
                    label="Building Type"
                    options={optionList(buildingTypeOptions, optionCounts?.btype)}
                    value={buildingTypeFilter}
                    onChange={setBuildingTypeFilter}
                    triggerWidth="w-full"
                  />
                  <FilterDropdown
                    label="Facility Building Status"
                    options={optionList(buildingStatusOptions, optionCounts?.bstatus)}
                    value={buildingStatusFilter}
                    onChange={setBuildingStatusFilter}
                    triggerWidth="w-full"
                  />
                  <FilterDropdown
                    label="Fire NOC Validity Status"
                    options={optionList(nocStatusFilterOptions, optionCounts?.noc)}
                    value={nocStatusFilter}
                    onChange={setNocStatusFilter}
                    triggerWidth="w-full"
                  />
                </div>
                <div className="space-y-2 border-t border-border/60 pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-muted-foreground">Due window</p>
                    {/* Untouched = no filter; one way back to exactly that. */}
                    {dueWindow > 0 && (
                      <button
                        type="button"
                        onClick={() => setDueWindow(0)}
                        className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <span className="flex gap-1 rounded-lg border border-border/60 p-1">
                    {([0, 30, 60, 90] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDueWindow(d)}
                        aria-pressed={dueWindow === d}
                        className={`min-h-8 flex-1 rounded-md px-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                          dueWindow === d
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {d === 0 ? "Off" : `${d}d`}
                      </button>
                    ))}
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-muted-foreground">Certified score %</p>
                    {(scoreRange[0] > 0 || scoreRange[1] < 100) && (
                      <button
                        type="button"
                        onClick={() => setScoreRange([0, 100])}
                        className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Slider
                      aria-label="Certified score range"
                      min={0}
                      max={100}
                      step={5}
                      value={scoreRange}
                      onValueChange={(v) => setScoreRange(v as [number, number])}
                      className="w-40"
                    />
                    <span className="w-16 text-xs tabular-nums text-muted-foreground">
                      {scoreRange[0]}–{scoreRange[1]}%
                    </span>
                  </div>
                  {/* Compare quarters — which IA pair the two quarter columns
                      reflect. It lives in the SAME popover as the other
                      secondary controls, so the toolbar stays one row. */}
                  {iaPeriodOptions.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                        Compare quarters
                      </p>
                      <Select
                        value={iaCursor ?? "latest"}
                        onValueChange={(v) => setIaCursor(v === "latest" ? null : v)}
                      >
                        <SelectTrigger
                          className="h-9 w-full text-xs"
                          aria-label="Compare quarters"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="latest" className="text-xs">
                            IA compare: latest two quarters
                          </SelectItem>
                          {iaPeriodOptions.map((p) => (
                            <SelectItem
                              key={`${p.fy}:Q${p.q}`}
                              value={`${p.fy}:Q${p.q}`}
                              className="text-xs"
                            >
                              IA compare: {formatFyQuarter(p.fy, p.q)} × previous
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <Popover open={viewMenuOpen} onOpenChange={setViewMenuOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="ml-auto h-9 shrink-0 gap-1.5">
                  <Eye className="size-4" /> View
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="border-b border-border/60 p-3">
                  <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Row density
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(["compact", "comfortable"] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={view.density === d}
                        onClick={() => setView({ ...view, density: d })}
                        className={cn(
                          "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-medium capitalize transition-colors",
                          view.density === d
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border/60 text-muted-foreground hover:bg-muted",
                        )}
                      >
                        <Rows3 className="size-3.5" /> {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="border-b border-border/60 p-3">
                  <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Columns
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {["essentials", "certification", "documents", "all"].map((id) => {
                      const preset = COLUMN_PRESETS.find((p) => p.id === id);
                      if (!preset) return null;
                      return (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={view.presetId === id}
                          onClick={() => {
                            setView({
                              ...applyPreset(id, displaySettings.frozenColumns),
                              density: view.density,
                            });
                            setViewMenuOpen(false);
                          }}
                          className={cn(
                            "min-h-9 rounded-lg border px-2 text-xs font-medium transition-colors",
                            view.presetId === id
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border/60 text-muted-foreground hover:bg-muted",
                          )}
                        >
                          {id === "all" ? "All" : preset.label}
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 h-8 w-full gap-1.5 text-xs"
                    onClick={() => {
                      setViewMenuOpen(false);
                      setColsOpen(true);
                    }}
                  >
                    <Columns3 className="size-3.5" /> Pick columns…
                  </Button>
                </div>
                <div className="space-y-1 border-b border-border/60 p-2">
                  <button
                    type="button"
                    aria-pressed={freezeOn}
                    onClick={() => setFreezeOn((on) => !on)}
                    className="flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-xs font-medium hover:bg-muted"
                  >
                    <PanelLeft className="size-3.5 text-muted-foreground" /> Freeze columns
                    {freezeOn && <Check className="ml-auto size-3.5 text-primary" />}
                  </button>
                  <button
                    type="button"
                    aria-pressed={recentOn}
                    onClick={() => setRecentOn((on) => !on)}
                    className="flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-xs font-medium hover:bg-muted"
                  >
                    <Sparkles className="size-3.5 text-muted-foreground" /> Highlight updates
                    {recentOn && <Check className="ml-auto size-3.5 text-primary" />}
                  </button>
                  {recentLegend && recentOn && (
                    <p className="px-2 pb-1 text-[10px] leading-snug text-muted-foreground">
                      {recentLegend}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 p-2">
                  <span className="text-[10px] text-muted-foreground">
                    Saved to your account
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => {
                      setViewMenuOpen(false);
                      resetView();
                    }}
                  >
                    <RotateCcw className="size-3.5" /> Reset view
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* ---------- Active filter chips (only when something is applied) ----------
              The "Filters restored" notice only appears when the view came
              from a link or the user's last visit, so a filtered list never
              looks like a bug. When nothing is filtered this row costs 0 px. */}
          {(restoredFrom || chips.length > 0) && (
            <div className="mb-2">
              {chips.length > 0 ? (
                <FilterChips
                  chips={chips}
                  onClearAll={clearAllFilters}
                  onResetView={resetView}
                  showResetView={false}
                  compact
                  className="mb-0"
                  notice={
                    restoredFrom ? (
                      <RestoredNotice
                        from={restoredFrom}
                        onDismiss={dismissRestored}
                      />
                    ) : undefined
                  }
                />
              ) : restoredFrom ? (
                <RestoredNotice
                  from={restoredFrom}
                  onDismiss={dismissRestored}
                />
              ) : null}
            </div>
          )}

          {/* Five quick tabs, one click per filter, counts from one pass. */}
          {!focusMode && (
            <div
              className="mb-2 flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              role="tablist"
              aria-label="Facility quick views"
            >
              {(
                [
                  { id: "all", label: "All", count: quickTabCounts.all },
                  {
                    id: "attention",
                    label: "Needs attention",
                    count: quickTabCounts.attention,
                  },
                  { id: "eligible", label: "Eligible", count: quickTabCounts.eligible },
                  {
                    id: "certified",
                    label: "Certified",
                    count: quickTabCounts.certified,
                  },
                  {
                    id: "notEligible",
                    label: "Not eligible",
                    count: quickTabCounts.notEligible,
                  },
                ] as const
              ).map((tab) => {
                const selected = activeQuickTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => openTab(tab.id)}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      selected
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border/70 bg-background text-foreground/75 hover:border-primary/40 hover:bg-accent",
                    )}
                  >
                    {tab.label}
                    <span
                      className={cn(
                        "rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                        selected
                          ? "bg-white/25"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

            </div>
            <div className="flex min-h-0 flex-1 flex-col">
          {mode === "view" ? (
            <>
              {/* Desktop: the grouped, virtualised 54-column table */}
              <div className="hidden min-h-0 flex-1 sm:flex sm:flex-col">
                <GroupedMasterTable
                  rows={visibleRows as MasterRow[]}
                  labels={labels}
                  view={view}
                  sorting={sorting}
                  onSortingChange={setSorting}
                  onDensityChange={(density) => setView({ ...view, density })}
                  onOpenRow={openQuickRow}
                  onEditRow={(r) => {
                    setMode("edit");
                    toast.info(`Editing on — scroll to ${r.facility.name}`);
                  }}
                  onColumnsClick={() => setColsOpen(true)}
                  searchQuery={search}
                  totalRowCount={masterRows.length}
                  onClearFilters={clearAllFilters}
                  // The table owns its own scrollport; handing the ref over lets
                  // the scroll-restore hook put the user back where they were.
                  scrollRef={tableScrollRef}
                  fillHeight
                  hideToolbar
                  onToggleGroup={toggleGroup}
                  selectedRowId={filters.facility || null}
                  /* ----- Part D: frozen columns (Admin → Table & Display) ----- */
                  pinnedKeys={displaySettings.frozenColumns}
                  freezeActive={freezeActive}
                  freezeToggle={{ on: freezeOn, onChange: setFreezeOn }}
                  /* ----- Part C: recently updated ----- */
                  recentByFacility={recentByFacility}
                  recentOn={recentOn && displaySettings.recentDays > 0}
                  recentLegend={recentLegend}
                  highlightToggle={{ on: recentOn, onChange: setRecentOn }}
                  /* ----- Task C: the row-actions column ----- */
                  rowActions={{
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
                    compact: true,
                  }}
                />
              </div>
              {/* Phone: stacked cards with a "View details" action */}
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto sm:hidden">
                <MobileFacilityCards
                  rows={visibleRows as MasterRow[]}
                  labels={labels}
                  onOpen={openQuickRow}
                  onClear={clearAllFilters}
                  canEdit={canAdd}
                  onUpdate={openUpdateFor}
                  onViewHistory={openHistoryFor}
                  onPrint={printSheet}
                  onPrefetch={(r) => setPrefetchId(String(r.facility._id))}
                  savedIds={savedIds}
                  draftIds={draftIds}
                  query={search}
                />
              </div>
            </>
          ) : (
            /* ============ EDIT MODE — THE SAME shared grid ============
            Root cause fixed here: edit mode used to render a DIFFERENT
            legacy table (AutoFitTableScroll + shadcn <Table>), whose header
            never shared the group band/frozen-header contract — so scrolling
            the edit table could unstick the header. Now BOTH modes render
            GroupedMasterTable; in edit mode every cell renders the compact
            editable widget from components/master/EditModeCells. */
            <>
              <div className="hidden min-h-0 flex-1 sm:flex sm:flex-col">
                <GroupedMasterTable
                  fillHeight
                  hideToolbar
                  onToggleGroup={toggleGroup}
                  selectedRowId={filters.facility || null}
                  rows={visibleRows as MasterRow[]}
                  labels={labels}
                  view={editView}
                  sorting={sorting}
                  onSortingChange={setSorting}
                  onOpenRow={openQuickRow}
                  onColumnsClick={() => setColsOpen(true)}
                  searchQuery={search}
                  totalRowCount={masterRows.length}
                  onClearFilters={clearAllFilters}
                  // Same scroll contract: one bounded container, header
                  // frozen inside it, scroll restore wired to the same ref.
                  scrollRef={tableScrollRef}
                  pinnedKeys={["facility", "type"]}
                  freezeActive={freezeActive}
                  freezeToggle={{ on: freezeOn, onChange: setFreezeOn }}
                  /* The SAME row-actions column in edit mode (Admin Show/Hide
                     and pin-right apply here too; the cell itself renders
                     Save row / Update). */
                  rowActions={{
                    visible: rowActionsSetting.visible,
                    pinRight: rowActionsSetting.pinRight,
                    canEdit: canAdd,
                    label: rowActionsSetting.label,
                    compact: compactRowActions,
                    onUpdate: openUpdateFor,
                  }}
                  edit={{
                    activeCell,
                    onActivate: (next) => setActiveCell(next),
                    readOnlyReasons,
                    renderEditableCell: (row, key) => {
                      const r = row as unknown as TrackerRow;
                      const id = String(r.facility._id);
                      /* Part 1 ②/③: the renderer returns null for every
                         non-active or non-editable cell — the shared grid's
                         `?? SmartCell` fallback then paints the EXACT
                         view-mode value, so view and edit are one grid and
                         no read-only column can ever go blank again. The
                         old renderer always returned an <EditableTrackerCell
                         …/> element, and an element that RENDERS null is
                         still truthy for ?? — which is precisely why
                         Facility/Type/Block/PHC/NIN/Cert Cycle/SaQsham
                         went empty in edit mode. */
                      if (!canAdd) return null; // viewer: pure read grid
                      if (!isEditableCellKey(key)) return null;
                      if (
                        !activeCell ||
                        activeCell.rowId !== id ||
                        activeCell.key !== key
                      )
                        return null;
                      return (
                        <EditableTrackerCell
                          row={r}
                          cellKey={key}
                          state={rowDrafts.get(r)}
                          options={editorOptions}
                          canEdit={canAdd}
                          busy={editBusyIds.has(id)}
                          handlers={{
                            onField: (k, v) => {
                              rowDrafts.setField(r, k, v);
                            },
                            onFile: (slot, val) => rowDrafts.setFile(r, slot, val),
                            onToggleClear: (slot, on) =>
                              rowDrafts.toggleClear(r, slot, on),
                            onEligibility: (v) => void saveEligibility(r, v),
                          }}
                        />
                      );
                    },
                    renderActionCell: (row) => {
                      const r = row as unknown as TrackerRow;
                      const id = String(r.facility._id);
                      // Viewers never get edit controls — the same View button
                      // the view-mode column renders.
                      if (!canAdd) {
                        return (
                          <RowActionsCell
                            row={row}
                            canEdit={false}
                            onOpenProfile={(x) => {
                              window.location.assign(`/facilities/${x.facility._id}`);
                            }}
                            onViewHistory={openHistoryFor}
                          />
                        );
                      }
                      return (
                        <EditableUpdateCell
                          row={r}
                          state={rowDrafts.get(r)}
                          canEdit={canAdd}
                          isAdmin={data?.me.appRole === "admin"}
                          busy={editBusyIds.has(id)}
                          onUpdate={(row2) => openUpdateFor(row2 as unknown as MasterRow)}
                          onSave={(row2, s) => saveRow(row2, s)}
                          onDelete={() => setDeleteTarget(r)}
                          onDiscard={(row2) => {
                            rowDrafts.reset(row2);
                            toast.info(
                              `Changes discarded — ${row2.facility.name}`,
                            );
                          }}
                          label={rowActionsSetting.label}
                        />
                      );
                    },
                  }}
                />
                {/* Unsaved-changes bar: sticky to the BOTTOM of the page but
                    in flow AFTER the table — it can never cover the last
                    row (it sits below it) and never moves the header. */}
                <div
                  data-testid="edit-unsaved-bar"
                  className="sticky bottom-2 z-30"
                >
                  {unsavedCount > 0 && (
                    <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-background/95 px-4 py-2 shadow-lg backdrop-blur">
                      <p className="text-sm text-muted-foreground">
                        <b className="font-semibold text-foreground">
                          {unsavedCount}
                        </b>{" "}
                        row{unsavedCount === 1 ? "" : "s"} with unsaved changes —
                        press <b>Update</b> (Save) on each row to commit in one
                        transaction, or open the row's quick view to{" "}
                        <b>Review changes</b> first. Drafts are kept while you
                        scroll.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        data-tip="Discard every unsaved draft"
                        onClick={() => {
                          rowDrafts.resetAll();
                          toast.info("All unsaved drafts discarded");
                        }}
                      >
                        Discard all
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              {/* Phone: the stacked cards (edit widgets are desktop-only) */}
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto sm:hidden">
                <MobileFacilityCards
                  rows={visibleRows as MasterRow[]}
                  labels={labels}
                  onOpen={openQuickRow}
                  onClear={clearAllFilters}
                  canEdit={canAdd}
                  onUpdate={openUpdateFor}
                  onViewHistory={openHistoryFor}
                  onPrefetch={(r) => setPrefetchId(String(r.facility._id))}
                  savedIds={savedIds}
                  draftIds={draftIds}
                  query={search}
                />
              </div>
            </>
          )}
            </div>
          </div>
        </PageShell>
      )}

      {/* ------- View state: column manager, export plan, row drawer ------- */}
      <ColumnManager
        open={colsOpen}
        onOpenChange={setColsOpen}
        labels={labels}
        view={view}
        onChange={setView}
        pinnedKeys={displaySettings.frozenColumns}
      />
      {/* Help and legend — the colour meanings and cell conventions in plain
          English (redesign 6/2.6). */}
      <Dialog
        open={legendOpen || legendDeepLink}
        onOpenChange={(o) => {
          setLegendOpen(o);
          if (!o) consumeDeepLink("legend");
        }}
      >
        <DialogContent className="glass-strong max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Help and legend</DialogTitle>
            <DialogDescription>
              How to read the Facility Master List — colours, chips and cell
              conventions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-foreground/90">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Status colours
              </p>
              <ul className="space-y-1">
                <li className="flex items-center gap-2">
                  <StatusBadge status="Quality Certified" /> — holds a quality certification.
                </li>
                <li className="flex items-center gap-2">
                  <StatusBadge status="Certified" /> — certified (with conditionality where shown).
                </li>
                <li className="flex items-center gap-2">
                  <StatusBadge status="Expired" /> — validity or Fire NOC passed; fix before recertification.
                </li>
                <li className="flex items-center gap-2">
                  <StatusBadge status="Not Obtained" /> — Fire NOC explicitly not obtained; record it when issued.
                </li>
              </ul>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Cells
              </p>
              <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
                <li>Dates are DD-MMM-YYYY; money is ₹ Indian grouping.</li>
                <li>A blank never counts as 0 — it shows “-”.</li>
                <li>Due chips show “Overdue 12d”, “Due in 20d” or “Valid till 2028”.</li>
                <li>The amber corner dot means the cell changed recently (see the Highlight updates toggle).</li>
                <li>Click a KPI chip or a smart-view tab to filter; click again to clear.</li>
                <li>Keyboard: “/” focuses search, “F” toggles Focus mode, arrows walk the grid in edit mode, Enter/F2 opens an editor, Esc cancels.</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        counts={{
          filtered: visibleRows.length,
          all: masterRows.length,
        }}
        visibleColumns={orderedVisibleColumns(view, displaySettings.frozenColumns)}
        hasRecentUpdates={recentOn && displaySettings.recentDays > 0}
        recentLegend={recentLegend ?? undefined}
        filtersText={describeFilters() || "None — all facilities"}
        onRun={(plan) => void runExport(plan)}
      />
      {/* Centred Facility Quick View — replaces the old right drawer. The open
          facility + section are in the URL, so Back closes it and the link is
          shareable. */}
      <FacilityQuickView
        row={quickRow}
        open={!!quickRow}
        onOpenChange={(o) => {
          if (o) return;
          closeQuickRow();
          // The row's Update button gets the focus back (spec §2.4).
          window.setTimeout(() => focusLastRowActionTrigger(), 0);
        }}
        labels={labels}
        canEdit={canAdd}
        siblings={visibleRows as MasterRow[]}
        onNavigate={navigateQuickRow}
        initialSection={filters.section || "overview"}
        onSectionChange={setQuickSection}
        onSave={saveQuickRow}
        onPrint={printSheet}
        onExport={(r, format) => void exportQuickRow(r, format)}
        settings={settings?.settings}
        userId={(user?._id as string | undefined) ?? undefined}
        dataAsOf={dataAsOf}
        recentDays={displaySettings.recentDays}
        onPrefetch={(r) => setPrefetchId(String(r.facility._id))}
        editRequest={
          quickEditRequest &&
          quickRow &&
          quickEditRequest.facilityId === String(quickRow.facility._id)
            ? { token: quickEditRequest.token, facilityId: quickEditRequest.facilityId }
            : null
        }
      />
      <QuickViewPrefetch facilityId={prefetchId} />

      {/* Delete confirmation for the edit-mode action cell */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.facility.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the facility with all its certification
              cycles, assessments, fund/NOC/building records and audit
              history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white"
              onClick={async () => {
                if (!deleteTarget) return;
                try {
                  await deleteFacility({
                    facilityId: deleteTarget.facility._id as never,
                  });
                  toast.success("Facility deleted");
                  rowDrafts.reset(deleteTarget);
                  setDeleteTarget(null);
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : "Delete failed",
                  );
                }
              }}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddFacilityDialog
        open={addOpen || addDeepLink}
        onOpenChange={(o) => {
          setAddOpen(o);
          if (!o) consumeDeepLink("add");
        }}
        blocks={(data?.blocks ?? []).map((b) => b.name)}
        facilityTypes={facilityTypes}
        eligibilityOptions={eligibilityOptions}
        canEdit={data?.me.appRole === "admin" || data?.me.appRole === "entry"}
        onCreate={async (values) => {
          try {
            await createFacility(values);
            toast.success("Facility added");
            setAddOpen(false);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to add facility");
          }
        }}
      />
    </AppShell>
  );
}

function AddFacilityDialog({
  open,
  onOpenChange,
  blocks,
  facilityTypes,
  eligibilityOptions,
  canEdit,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blocks: string[];
  facilityTypes: string[];
  eligibilityOptions: {
    value: "Eligible" | "Not Eligible" | "Possible";
    label: string;
  }[];
  canEdit: boolean;
  onCreate: (values: {
    block: string;
    phc: string;
    name: string;
    facilityType: string;
    phaseType?: string;
    eligibility: "Eligible" | "Not Eligible" | "Possible";
    ninNumber?: string;
    saqshamFacilityType?: string;
    saqshamCategory?: string;
    remarks?: string;
  }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    block: "",
    phc: "",
    name: "",
    facilityType: "",
    phaseType: "",
    eligibility: "",
    ninNumber: "",
    saqshamFacilityType: "",
    saqshamCategory: "",
    remarks: "",
  });
  const [busy, setBusy] = useState(false);

  if (!canEdit) return null;

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

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
      phaseType: form.phaseType || undefined,
      eligibility: form.eligibility as "Eligible" | "Not Eligible" | "Possible",
      ninNumber: form.ninNumber || undefined,
      saqshamFacilityType: form.saqshamFacilityType || undefined,
      saqshamCategory: form.saqshamCategory || undefined,
      remarks: form.remarks || undefined,
    });
    setBusy(false);
    setForm({
      block: "", phc: "", name: "", facilityType: "", phaseType: "",
      eligibility: "", ninNumber: "", saqshamFacilityType: "", saqshamCategory: "", remarks: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add facility</DialogTitle>
          <DialogDescription>
            Register a facility. If it is NQAS-eligible, its first certification
            cycle starts automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <FieldGrid>
            <div>
              <Label>Block name *</Label>
              {blocks.length > 0 ? (
                <Select value={form.block} onValueChange={(v) => set("block", v)}>
                  <SelectTrigger className="glass-input mt-1 w-full">
                    <SelectValue placeholder="Select block" />
                  </SelectTrigger>
                  <SelectContent>
                    {blocks.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="glass-input mt-1"
                  value={form.block}
                  onChange={(e) => set("block", e.target.value)}
                  placeholder="e.g. Bhadrachalam"
                />
              )}
            </div>
            <div>
              <Label>PHC name</Label>
              <Input
                className="glass-input mt-1"
                value={form.phc}
                onChange={(e) => set("phc", e.target.value)}
                placeholder="Defaults to block"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Facility name *</Label>
              <Input
                className="glass-input mt-1"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Chintalapudi CHC"
              />
            </div>
            <div>
              <Label>NIN Number</Label>
              <Input
                className="glass-input mt-1"
                value={form.ninNumber}
                onChange={(e) => set("ninNumber", e.target.value)}
                placeholder="Unique ID — prevents duplicate imports"
              />
            </div>
            <div>
              <Label>Facility type *</Label>
              <Select value={form.facilityType} onValueChange={(v) => set("facilityType", v)}>
                <SelectTrigger className="glass-input mt-1 w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {facilityTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Phase type</Label>
              <Input
                className="glass-input mt-1"
                value={form.phaseType}
                onChange={(e) => set("phaseType", e.target.value)}
                placeholder="e.g. Phase I"
              />
            </div>
            <div>
              <Label>NQAS eligibility *</Label>
              <Select value={form.eligibility} onValueChange={(v) => set("eligibility", v)}>
                <SelectTrigger className="glass-input mt-1 w-full">
                  <SelectValue placeholder="Select eligibility" />
                </SelectTrigger>
                <SelectContent>
                  {eligibilityOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>SaQsham Facility_Type</Label>
              <Input
                className="glass-input mt-1"
                value={form.saqshamFacilityType}
                onChange={(e) => set("saqshamFacilityType", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>SaQsham Facility Name/Category</Label>
              <Input
                className="glass-input mt-1"
                value={form.saqshamCategory}
                onChange={(e) => set("saqshamCategory", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>General remarks</Label>
              <Textarea
                className="glass-input mt-1"
                value={form.remarks}
                onChange={(e) => set("remarks", e.target.value)}
                rows={2}
              />
            </div>
          </FieldGrid>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
            Add facility
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

/** Warms the full-record query for the facility the user is about to open
 *  (hover/focus on Previous/Next). Mounting the query is the prefetch: Convex
 *  caches the result, so the dialog paints its rich sections instantly. */
function QuickViewPrefetch({ facilityId }: { facilityId: string | null }) {
  useQuery(
    api.facilities.getFacilityProfile,
    facilityId ? { facilityId: facilityId as never } : "skip",
  );
  return null;
}



