import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useSearchParams } from "react-router";
import { api } from "@/convex/_generated/api";
import type { SortingState } from "@tanstack/react-table";
import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Printer,
  TriangleAlert,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { FacilityCell } from "@/components/FacilityCell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  usePagination,
  RowViewSelect,
  PaginationBar,
} from "@/components/RowView";
import FilterDropdown from "@/components/FilterDropdown";
import { CycleFilter, useCycleScope, useSetCycleScope } from "@/components/CycleFilter";
import { FilterBar, FilterSearch } from "@/components/FilterBar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { countActiveFilters } from "@/lib/filters";
import { multiFilterMatches } from "@/lib/multiFilter";
import { buildEligibilityOptions } from "@/lib/eligibility";
import { toDisplayDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/reportMetrics";
import { todayLocalIso } from "@/lib/today";
import { DEFAULT_SETTINGS, deriveFlatLifecycle, docPipelineZone } from "@/convex/lifecycle";

import {
  BUILDING_BUCKET_ORDER,
  buildingBucketOf,
} from "@/lib/buildingBuckets";
import {
  applyMasterFilters,
  type MasterFilters,
} from "@/lib/masterFilter";
import {
  REPORT_COLUMNS,
  REPORT_DEFAULT_KEYS,
  withIaPeriodLabels,
  type MasterRow,
} from "@/lib/masterColumns";
import {
  COLUMN_PRESETS,
} from "@/lib/masterColumns";
// Columns/labels/view presets — see the section at the bottom of the file.
import { resolveLabels as resolveLabelsOfColumns } from "@/lib/masterColumns";
import {
  loadMasterView,
  normalizeView,
  orderedVisibleColumns,
  saveMasterView,
  moveColumn,
  applyPreset,
  type MasterView,
  type Density,
} from "@/lib/masterView";
import {
  allIaPeriods,
  buildIaMasterIndex,
  iaPairFor,
  withLegacyIa,
} from "@/lib/iaMaster";
import { buildReportRows, type ReportRowLike } from "@/lib/reportRows";
import {
  FREEZE_PREF_KEY,
  loadBoolPref,
  readDisplaySettings,
  saveBoolPref,
} from "@/lib/tableDisplay";
import {
  TypeWiseSummaryTable,
  summarizeTypeWise,
  grandTotalTypeWise,
  reconciliationText,
  countedFor,
  typeWiseSummaryCsv,
  type TypeWiseSummaryRow,
} from "@/components/TypeWiseSummary";

const CycleReportView = lazy(() =>
  import("@/components/reports/CycleReportView").then((m) => ({
    default: m.CycleReportView,
  })),
);
/** Line lists are lazy: their builder + export dialog never sit in the first
 *  bundle of the Reports page (perf brief 3.4 — heavy UI loads on first use). */
const LineListsTab = lazy(() =>
  import("@/components/linelists/LineListsTab").then((m) => ({
    default: m.LineListsTab,
  })),
);
import { GroupedMasterTable } from "@/components/master/GroupedMasterTable";
import { ColumnManager } from "@/components/master/ColumnManager";
import { ExportDialog, type ExportPlan } from "@/components/master/ExportDialog";
import { FacilityQuickView } from "@/components/quickview/FacilityQuickView";
import {
  exportMasterCsv,
  exportMasterPdf,
  exportMasterWorkbook,
} from "@/lib/masterExport";
import { openMasterPrint } from "@/lib/masterReportPrint";
import { exportExcel, buildTablePdf } from "@/lib/exportTable";
import { downloadText } from "@/lib/reportColumns";

type SummaryDim = "type" | "block" | "phc";
type ReportTab = "summary" | "cycle" | "linelists" | "master";

const TAB_LABELS: Record<ReportTab, string> = {
  summary: "Summary",
  cycle: "Certification cycles",
  linelists: "Line lists",
  master: "Master list",
};

const CYCLE_VIEWS = ["overview", "renewals", "compare", "list"] as const;
type CycleViewKey = (typeof CYCLE_VIEWS)[number];
const isCycleView = (v: string | null): v is CycleViewKey =>
  !!v && (CYCLE_VIEWS as readonly string[]).includes(v);

const listParam = (params: URLSearchParams, key: string): string[] =>
  (params.get(key) ?? "").split(",").map((v) => v.trim()).filter(Boolean);

const FILTER_PARAMS = [
  "q",
  "block",
  "phc",
  "type",
  "cert",
  "elig",
  "bstatus",
  "status",
  "noc",
] as const;
const filterSignature = (params: URLSearchParams) =>
  FILTER_PARAMS.map((k) => params.get(k) ?? "").join("|");

const SUMMARY_DIM_LABELS: Record<SummaryDim, string> = {
  type: "Type-wise",
  block: "Block-wise",
  phc: "PHC-wise",
};

/** Drilldown state — clicking a summary count pins "facilities of THIS cell". */
type Drill = {
  kind: "pipeline" | "building";
  value: string;
  rowLabel: string;
} | null;

/** The scrollport handed to the shared table (hooked for future restore; the
 *  page itself needs none — the engine manages focus/scroll internally). */
const tableScrollRef: { current: HTMLDivElement | null } = { current: null };

/** Escapes the pieces of the two printable documents. */
const esc = (s: string) =>
  s.replace(/[&<>"]/g, (ch) =>
    ch === "&" ? "&amp;" : ch === "<" ? "&lt;" : ch === ">" ? "&gt;" : "&quot;",
  );

/** The cutoff used to split a CSV cell. */
const csvNeedsQuote = (v: string | number) => /[",\r\n]/.test(String(v));
const csvCell = (v: string | number) => {
  const s = String(v);
  return csvNeedsQuote(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export default function ReportsPage() {
  /* ---------------- Tabs (deep links: /reports?tab=cycle) ------------------ */
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: ReportTab =
    tabParam === "cycle" || tabParam === "linelists" || tabParam === "master"
      ? tabParam
      : "summary";
  const setTab = (next: ReportTab) => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        params.set("tab", next);
        return params;
      },
      { replace: false },
    );
  };

  /* ---------------- Data ---------------------------------------------------- */
  /* The shared cycle context (never a page-local copy): "current" and "all"
     read the default report; a specific past cycle scopes the query. */
  const cycleScope = useCycleScope();
  const setCycleScope = useSetCycleScope();
  const data = useQuery(
    api.modules.getReportData,
    typeof cycleScope === "number" ? { cycle: cycleScope } : {},
  );
  const summary = useQuery(api.summaries.getTypeWiseSummary, {});
  const settings = useQuery(api.facilities.getAppSettings, {});
  /** Facility-cycle rows are read only when the Cycle report tab is open. */
  const cycleData = useQuery(
    api.cycleReport.getFacilityCycleRows,
    tab === "cycle" ? {} : "skip",
  );
  const cycleCounts = useQuery(api.modules.cycleSummary, {});

  /* The four Certification cycles views live in the URL (`view`), together
     with the Renewals bucket/step chips, so Back restores them (Part 6.4). */
  const viewParam = searchParams.get("view");
  const cycleView: CycleViewKey = isCycleView(viewParam) ? viewParam : "overview";
  const setCycleParam = (key: string, value: string | null) => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (value) params.set(key, value);
        else params.delete(key);
        return params;
      },
      { replace: true },
    );
  };
  const cycleBucket = searchParams.get("bucket");
  const cycleStep = searchParams.get("step") as
    | import("@/lib/cycleReport").RenewalStepKey
    | null;

  /* ---------------- Rows: API → the shared MasterRow shape ------------------ */
  /** Rows BEFORE the cycle filter (rows already carry their cycle's data). */
  const rows = useMemo(
    () => buildReportRows((data?.rows ?? []) as ReportRowLike[]),
    [data],
  );

  /* ---------------- Quarterly IA: real quarters in the IA headers ---------- */
  const iaQuartersQ = useQuery(api.ia.listIaQuarters, { limit: 20000 });
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
            (rows as MasterRow[]).map((r) => ({
              id: r.facility._id,
              nqasIaQ1: r.facility.nqasIaQ1 ?? null,
              kayakalpIaQ1: r.facility.kayakalpIaQ1 ?? null,
              nqasIaQ2: r.facility.nqasIaQ2 ?? null,
              kayakalpIaQ2: r.facility.kayakalpIaQ2 ?? null,
            })),
          )
        : null,
    [iaQuartersQ, rows],
  );
  const iaPair = useMemo(
    () => (iaIndex ? iaPairFor(null, iaIndex, todayLocalIso()) : null),
    [iaIndex],
  );

  /* ---------------- The ONE label map (config + admin renames + IA pair) --- */
  const overrides = settings?.settings.tableHeaderOverrides as
    | Record<string, string>
    | undefined;
  const labels = useMemo(
    () =>
      withIaPeriodLabels(
        resolveLabelsOfColumns(REPORT_COLUMNS, overrides),
        iaPair,
      ),
    [overrides, iaPair],
  );

  /* ---------------- Visibility: preset + account ledger -------------------- */
  /* Same rule as the Master List: the account view applies until the user
     changes something, the browser copy is the offline fallback, and an
     untouched page never overwrites a newer account view. */
  const [cachedView] = useState<MasterView>(() => loadMasterView("report"));
  const [editedView, setEditedView] = useState<MasterView | null>(null);
  const serverView = useQuery(api.ops.getMasterView, { scope: "report" });
  const saveServerView = useMutation(api.ops.setMasterView);
  const savedView = useMemo(
    () => (serverView?.view ? normalizeView(serverView.view) : null),
    [serverView],
  );
  const view: MasterView = editedView ?? savedView ?? cachedView;
  const setView = setEditedView;
  const [layoutSync, setLayoutSync] = useState<"idle" | "saving" | "saved" | "error">("idle");
  useEffect(() => {
    saveMasterView("report", view);
    if (!editedView) return;
    const timer = window.setTimeout(() => {
      setLayoutSync("saving");
      void saveServerView({ scope: "report", view: normalizeView(view) })
        .then(() => setLayoutSync("saved"))
        .catch(() => setLayoutSync("error"));
    }, 700);
    return () => window.clearTimeout(timer);
  }, [view, editedView, saveServerView]);
  const visibleColumns = useMemo(
    () => orderedVisibleColumns(view, ["facility", "type"]),
    [view],
  );
  /** Frozen columns: the same admin setting the Master List honours, but a
   *  report keeps Facility + Facility Type frozen pinned regardless of the
   *  Admin list, so this page's printed/frozen zone always matches its
   *  brief (.post-fixed columns cannot be hidden on THIS page). */
  const pinnedKeys = useMemo(() => {
    const frozen = readDisplaySettings(settings?.settings).frozenColumns;
    return [...new Set(["facility", "type", ...frozen])].slice(0, 3);
  }, [settings]);

  /* ---------------- Table & density + freeze (per-user, shared keys) ------- */
  const displaySettings = useMemo(
    () => readDisplaySettings(settings?.settings),
    [settings],
  );
  const [freezeOn, setFreezeOn] = useState<boolean>(() =>
    loadBoolPref(FREEZE_PREF_KEY),
  );
  useEffect(() => saveBoolPref(FREEZE_PREF_KEY, freezeOn), [freezeOn]);
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window === "undefined" ? 1280 : window.innerWidth,
  );
  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const freezeActive = freezeOn && viewportWidth >= displaySettings.freezeBelowPx;

  /* ---------------- Filters (initialised from the URL, kept in it) --------- */
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [blockFilter, setBlockFilter] = useState<string[]>(() => listParam(searchParams, "block"));
  const [phcFilter, setPhcFilter] = useState<string[]>(() => listParam(searchParams, "phc"));
  const [typeFilter, setTypeFilter] = useState<string[]>(() => listParam(searchParams, "type"));
  const [certFilter, setCertFilter] = useState<string[]>(() => listParam(searchParams, "cert"));
  const [eligibilityFilter, setEligibilityFilter] = useState<string[]>(() =>
    listParam(searchParams, "elig"),
  );
  /** Building filter works on the SHARED bucket — the exact same function the
   *  summary matrix counts with, so "Other"/"No record" filter too (the old
   *  raw-value filter could never express a bucket). */
  const [buildingFilter, setBuildingFilter] = useState<string[]>(() =>
    listParam(searchParams, "bstatus"),
  );
  const [statusFilter, setStatusFilter] = useState<string[]>(() =>
    listParam(searchParams, "status"),
  );
  const [nocFilter, setNocFilter] = useState<string[]>(() =>
    listParam(searchParams, "noc"),
  );
  const writeGuard = useRef("");

  // Back / a pasted link → state. The guard stops the echo of our own write
  // from resetting the inputs mid-keystroke.
  useEffect(() => {
    const sig = filterSignature(searchParams);
    if (sig === writeGuard.current) return;
    setSearch(searchParams.get("q") ?? "");
    setBlockFilter(listParam(searchParams, "block"));
    setPhcFilter(listParam(searchParams, "phc"));
    setTypeFilter(listParam(searchParams, "type"));
    setCertFilter(listParam(searchParams, "cert"));
    setEligibilityFilter(listParam(searchParams, "elig"));
    setBuildingFilter(listParam(searchParams, "bstatus"));
    setStatusFilter(listParam(searchParams, "status"));
    setNocFilter(listParam(searchParams, "noc"));
  }, [searchParams]);

  // State → URL. Writes preserve the tab and the shared cycle parameter;
  // replace keeps typing out of the Back stack, while a change is still
  // restorable because it lives in the URL.
  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        const put = (key: string, values: string[]) => {
          if (values.length) next.set(key, values.join(","));
          else next.delete(key);
        };
        if (search.trim()) next.set("q", search);
        else next.delete("q");
        put("block", blockFilter);
        put("phc", phcFilter);
        put("type", typeFilter);
        put("cert", certFilter);
        put("elig", eligibilityFilter);
        put("bstatus", buildingFilter);
        put("status", statusFilter);
        put("noc", nocFilter);
        writeGuard.current = filterSignature(next);
        return next;
      },
      { replace: true },
    );
  }, [
    search,
    blockFilter,
    phcFilter,
    typeFilter,
    certFilter,
    eligibilityFilter,
    buildingFilter,
    statusFilter,
    nocFilter,
    setSearchParams,
  ]);

  const blocks = useMemo(
    () => [...new Set(rows.map((r) => r.facility.block))].sort(),
    [rows],
  );
  const phcs = useMemo(
    () => [...new Set(rows.map((r) => r.facility.phc))].sort(),
    [rows],
  );
  const types = useMemo(
    () => [...new Set(rows.map((r) => r.facility.facilityType))].sort(),
    [rows],
  );
  const certStatusOptions = useMemo(() => {
    const base =
      (settings?.settings.certificationStatuses as string[] | undefined) ??
      DEFAULT_SETTINGS.certificationStatuses;
    const extra = rows
      .map((r) => r.nqas?.certificationStatus ?? "")
      .filter((s) => s && !base.includes(s));
    return [...base, ...new Set(extra)];
  }, [settings, rows]);
  const eligibilityOptions = useMemo(
    () => buildEligibilityOptions(settings?.settings.eligibilityOptions),
    [settings],
  );
  const currentStatusOptions = useMemo(
    () =>
      [...new Set(rows.map((r) => r.facility.currentStatus ?? ""))]
        .filter(Boolean)
        .sort(),
    [rows],
  );
  const nocStatusOptions = useMemo(
    () =>
      [...new Set(rows.map((r) => r.noc?.status ?? ""))]
        .filter(Boolean)
        .sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const args: MasterFilters = {
      search,
      blocks: blockFilter,
      types: typeFilter,
      certStatus: certFilter,
      eligibility: eligibilityFilter,
      status: statusFilter,
      nocStatus: nocFilter,
    };
    // PHC filter and building-bucket filter are computed here (the shared
    // engine has no PHC filter arg, and the building bucket is
    // Reports-specific).
    return applyMasterFilters(rows, args).filter(
      (r) =>
        multiFilterMatches(r.facility.phc, phcFilter) &&
        (buildingFilter.length === 0 ||
          buildingFilter.includes(buildingBucketOf(r.building?.buildingStatus))),
    );
  }, [
    rows,
    search,
    blockFilter,
    phcFilter,
    typeFilter,
    certFilter,
    eligibilityFilter,
    buildingFilter,
    statusFilter,
    nocFilter,
  ]);

  const pager = usePagination(filtered, [
    search,
    blockFilter,
    phcFilter,
    typeFilter,
    certFilter,
    eligibilityFilter,
    buildingFilter,
    statusFilter,
    nocFilter,
    cycleScope,
  ]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [colsOpen, setColsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [drawerRow, setDrawerRow] = useState<MasterRow | null>(null);
  const [busy, setBusy] = useState(false);

  const activeFilterCount =
    countActiveFilters([
      blockFilter,
      phcFilter,
      typeFilter,
      certFilter,
      eligibilityFilter,
      buildingFilter,
      statusFilter,
      nocFilter,
    ]) +
    (search.trim() ? 1 : 0) +
    (tab !== "cycle" && cycleScope !== "current" ? 1 : 0);

  const describeFilters = () => {
    const bits: string[] = [];
    const multi = (label: string, values: string[]) => {
      if (values.length) bits.push(`${label}: ${values.join(", ")}`);
    };
    multi("Block", blockFilter);
    multi("PHC", phcFilter);
    multi("Type", typeFilter);
    multi("Certification status", certFilter);
    multi(
      "Eligibility",
      eligibilityFilter.map(
        (v) => eligibilityOptions.find((o) => o.value === v)?.label ?? v,
      ),
    );
    multi("Building status", buildingFilter);
    multi("Facility current status", statusFilter);
    multi("Fire NOC status", nocFilter);
    bits.push(
      cycleScope === "current"
        ? "Certification Cycle: Current"
        : cycleScope === "all"
          ? "Certification Cycle: All"
          : `Certification Cycle: #${cycleScope}`,
    );
    return bits.join(" · ");
  };

  /* ---------------- Summary matrix (client view over the same rows) -------- */
  const summaryDocStatuses = summary?.docStatuses ?? [];
  const summaryBuilding = summary?.buildingStatuses ?? [];
  const [summaryDim, setSummaryDim] = useState<SummaryDim>("type");

  /** Summary source: the minimal TypeWiseRow each summary column reads.
   *  It reads the FILTERED rows, so the bar above the tabs controls every
   *  number on the Summary tab (not just the master list). */
  const summarySource = useMemo(
    () =>
      filtered.map((r) => ({
        facilityId: String(r.facility._id),
        facilityType: r.facility.facilityType,
        block: r.facility.block,
        phc: r.facility.phc,
        cycle: r.cycleNumber ?? null,
        currentStatus: r.facility.currentStatus ?? "",
        certStatus: r.nqas?.certificationStatus ?? null,
        naStatus: r.nqas?.status ?? null,
        naStartDate: r.nqas?.scheduledStartDate ?? null,
        saStatus: r.sa?.status ?? null,
        docStatus: r.sa?.generalDocStatus ?? null,
        buildingStatus: r.building?.buildingStatus ?? null,
      })),
    [filtered],
  );

  const summaryRows = useMemo(
    () => summarizeTypeWise(summarySource, summaryDim, summaryDocStatuses, summaryBuilding),
    [summarySource, summaryDim, summaryDocStatuses, summaryBuilding],
  );
  const summaryTotal = useMemo(() => grandTotalTypeWise(summaryRows), [summaryRows]);

  /** Status-based "hold a certificate" count. It normally equals the stage
   *  count (one rule: Quality + Conditional); when it differs, the line below
   *  names both numbers instead of silently picking one. */
  const holdCertificateCount = useMemo(
    () =>
      summarySource.filter((r) => {
        const v = (r.certStatus ?? "").trim().toLowerCase();
        return v === "quality certified" || v === "quality certified with conditionality";
      }).length,
    [summarySource],
  );

  /* ---------------- Summary drilldown (click a count → exactly those) ------ */
  const [drill, setDrill] = useState<Drill>(null);
  const drillFacilityIds = useMemo(() => {
    if (!drill) return new Set<string>();
    const base = summarySource.filter((r) =>
      summaryDim === "type"
        ? r.facilityType === drill.rowLabel
        : summaryDim === "block"
          ? r.block === drill.rowLabel
          : (r.phc || r.block) === drill.rowLabel,
    );
    const ids = new Set<string>();
    for (const r of base) {
      if (drill.kind === "building") {
        if (buildingBucketOf(r.buildingStatus) === drill.value) ids.add(r.facilityId);
        continue;
      }
      const lc = deriveFlatLifecycle({
        currentStatus: r.currentStatus,
        certStatus: r.certStatus,
        naStatus: r.naStatus,
        naStartDate: r.naStartDate,
        docStatus: r.docStatus,
      });
      const hasDocStage = !!r.docStatus && summaryDocStatuses.includes(r.docStatus);
      const zone = docPipelineZone(lc, r.saStatus, hasDocStage);
      if (
        (drill.value === "NQAS Scheduled" && zone === "nqasScheduled") ||
        (drill.value === "Result Awaited Facilities" && zone === "resultAwaited") ||
        (drill.value === "Next Phase" && zone === "nextPhase") ||
        (zone === "docs" && r.docStatus === drill.value)
      )
        ids.add(r.facilityId);
    }
    return ids;
  }, [drill, summaryDim, summarySource, summaryDocStatuses]);
  const drillRows = useMemo(
    () =>
      drillFacilityIds.size
        ? rows.filter((r) => drillFacilityIds.has(String(r.facility._id)))
        : [],
    [drillFacilityIds, rows],
  );

  /* ---------------- Exports (ONE cell writer for every format) ------------- */
  const rowsFor = (scope: ExportPlan["scope"]) =>
    scope === "all" ? rows : filtered;
  const fileStamp = new Date().toISOString().slice(0, 10);
  /** masterExport hands over an ArrayBuffer; exportExcel-style callers use
   *  a Blob — this saver accepts both shapes at their own call sites. */
  const saveBlob = (data: ArrayBuffer, name: string) => {
    saveBlobRaw(new Blob([data]), name);
  };
  const saveBlobRaw = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };
  const buildOpts = (plan: ExportPlan) => ({
    rows: rowsFor(plan.scope),
    columns: plan.columns,
    labels,
    filtersText: plan.scope === "all" ? "None — all facilities" : describeFilters() || "None",
    generatedBy: "NQAS Tracker · Reports & Export",
    frozenDataColumns: Math.min(2, pinnedKeys.length),
    frozenKeys: pinnedKeys,
    fileNameBase: `nqas-full-report-${fileStamp}`,
    extras: plan.extras,
  });

  const runExport = async (plan: ExportPlan) => {
    if (plan.format !== "print" && rowsFor(plan.scope).length === 0) {
      toast.error("Nothing to export — no rows match the current filters");
      return;
    }
    setBusy(true);
    try {
      const opts = buildOpts(plan);
      if (plan.format === "xlsx") await exportMasterWorkbook(opts, saveBlob);
      else if (plan.format === "pdf") exportMasterPdf(opts, plan.pdf, saveBlobRaw);
      else if (plan.format === "csv") exportMasterCsv(opts, saveBlobRaw);
      else printMaster(plan);
      if (plan.format !== "print") {
        const n = rowsFor(plan.scope).length;
        toast.success(`Exported ${n} facilit${n === 1 ? "y" : "ies"}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };

  /** Print — ONE document from the SAME export cells the workbook gets
   *  (lib/masterReportPrint), so the printout cannot drift from Excel/PDF/CSV. */
  const printMaster = (plan: ExportPlan) => {
    openMasterPrint({
      rows: rowsFor(plan.scope),
      columns: plan.columns,
      labels,
      subtitle: [
        describeFilters() || "No filters",
        `${rowsFor(plan.scope).length} of ${rows.length} facilities`,
        `generated ${toDisplayDate(todayLocalIso())}`,
      ].join(" · "),
    });
  };

  /* ---------------- Summary exports (one writer contract, 4 formats) ------- */
  const cTag = typeof cycleScope === "number" ? `-cycle-${cycleScope}` : "";
  const dimLabel = SUMMARY_DIM_LABELS[summaryDim];
  const summaryPairs = () =>
    typeWiseSummaryCsv(summaryRows, summaryDim, summaryDocStatuses, summaryBuilding);
  const summarySubtitle = () =>
    `${describeFilters() || "All facilities"} · generated ${toDisplayDate(todayLocalIso())}`;

  const exportSummaryExcel = () => {
    const { headers, rows: rws } = summaryPairs();
    exportExcel(
      `nqas-summary-${summaryDim}${cTag}-${fileStamp}.xlsx`,
      dimLabel,
      headers,
      rws,
      { title: `NQAS Summary — ${dimLabel}`, subtitle: summarySubtitle() },
    );
    toast.success("Summary exported (Excel)");
  };
  const exportSummaryPdf = async () => {
    const { headers, rows: rws } = summaryPairs();
    // The PDF generator loads lazily on first use (perf brief 3.4).
    (
      await buildTablePdf({
        title: `NQAS Summary — ${dimLabel}`,
        subtitle: summarySubtitle(),
        headers,
        rows: rws,
        options: { align: "center" },
      })
    ).save(`nqas-summary-${summaryDim}${cTag}-${fileStamp}.pdf`);
    toast.success("Summary exported (PDF)");
  };
  const exportSummaryCsv = () => {
    const { headers, rows: rws } = summaryPairs();
    downloadText(
      `nqas-summary-${summaryDim}${cTag}-${fileStamp}.csv`,
      [headers, ...rws].map((r) => r.map(csvCell).join(",")).join("\r\n"),
    );
    toast.success("Summary exported (CSV)");
  };
  const printSummary = () => {
    const { headers, rows: rws } = summaryPairs();
    const doc =
      `<!doctype html><html><head><meta charset="utf-8"><title>${esc(`NQAS Summary — ${dimLabel}`)}</title>` +
      `<style>body{font:11px/1.4 system-ui,sans-serif;margin:16px;color:#111}h1{font-size:15px;margin:0 0 2px}` +
      `p.sub{font-size:10px;color:#555;margin:0 0 10px}table{border-collapse:collapse;width:100%}` +
      `th,td{border:1px solid #ccc;padding:4px 6px}thead th{background:#0d6960;color:#fff}` +
      `tbody tr:nth-child(even){background:#f4f8f7` +
      `}@page{size:A4 landscape;margin:10mm}</style></head><body>` +
      `<h1>${esc(`NQAS Summary — ${dimLabel}`)}</h1><p class="sub">${esc(summarySubtitle())}</p>` +
      `<table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>` +
      rws
        .slice(0, -1)
        .map((r) => `<tr>${r.map((v) => `<td>${esc(String(v))}</td>`).join("")}</tr>`)
        .join("") +
      `</tbody><tfoot><tr>${(rws[rws.length - 1] ?? [])
        .map((v) => `<td>${esc(String(v))}</td>`)
        .join("")}</tr></tfoot></table>` +
      `<script>window.onload=function(){window.print()}</script></body></html>`;
    printHtml(doc);
  };

  /** The summary print shares the same iframe technique as the master print. */
  const printHtml = (doc: string) => {
    const frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    document.body.appendChild(frame);
    frame.srcdoc = doc;
  };

  const loading = data === undefined;

  /* ---------------- One Export split button (per tab) --------------------- */
  type CycleExportFormat = "xlsx" | "pdf" | "csv" | "print";
  const cycleExportRows = useMemo(() => {
    const raw = cycleData?.rows ?? [];
    const q = search.trim().toLowerCase();
    return raw.filter(
      (r) =>
        (blockFilter.length === 0 || blockFilter.includes(r.block)) &&
        (phcFilter.length === 0 || phcFilter.includes(r.phc)) &&
        (typeFilter.length === 0 || typeFilter.includes(r.type)) &&
        (certFilter.length === 0 || certFilter.includes(r.certStatus ?? "")) &&
        (eligibilityFilter.length === 0 || eligibilityFilter.includes(r.eligibility)) &&
        (buildingFilter.length === 0 ||
          buildingFilter.includes(buildingBucketOf(r.buildingStatus))) &&
        (statusFilter.length === 0 || statusFilter.includes(r.currentStatus)) &&
        (nocFilter.length === 0 || nocFilter.includes(r.nocStatus ?? "")) &&
        (!q ||
          [r.facility, r.block, r.phc, r.type, r.nin ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(q)),
    );
  }, [
    cycleData,
    search,
    blockFilter,
    phcFilter,
    typeFilter,
    certFilter,
    eligibilityFilter,
    buildingFilter,
    statusFilter,
    nocFilter,
  ]);
  const cycleAllCount = cycleData?.rows.length ?? 0;
  const cycleOnlyFilters = describeFilters()
    .split(" · ")
    .filter((part) => part && !part.startsWith("Certification Cycle"))
    .join(" · ");
  const cycleReportId = `CR-${(data?.generatedAt ?? todayLocalIso()).replace(/-/g, "")}`;
  const cycleDistrict =
    ((settings?.settings as Record<string, unknown> | undefined)?.districtName as
      | string
      | undefined) || "District";
  const cycleStartedNote = (cycleCounts?.cycles ?? [])
    .filter((c) => c.cycleNumber > 1 && c.count > 0)
    .map((c) => `Cycle #${c.cycleNumber} started for ${c.count}`)
    .join(" · ");
  const cycleMeta = {
    filtersText: cycleOnlyFilters ? `All cycles · ${cycleOnlyFilters}` : "All cycles",
    generatedAt: data?.generatedAt ?? todayLocalIso(),
    generatedBy: "NQAS Tracker · Reports & Export",
    reportId: cycleReportId,
    district: cycleDistrict,
    knownCycles: (cycleCounts?.cycles ?? []).map((c) => ({
      cycleNumber: c.cycleNumber,
      cycleType: c.cycleType,
    })),
  };
  const cycleSettings = useMemo(
    () => ({
      surveillanceAlertLeadDays: settings?.settings.surveillanceAlertLeadDays as number | undefined,
      recertificationAlertLeadDays: settings?.settings.recertificationAlertLeadDays as
        | number
        | undefined,
      generalDocStatuses: summary?.docStatuses,
      certificationStatuses: certStatusOptions,
    }),
    [settings, summary, certStatusOptions],
  );

  const runMasterFormat = (format: "xlsx" | "pdf" | "csv") => {
    const plan: ExportPlan = {
      format,
      scope: "filtered",
      columns: visibleColumns,
      pdf: { paper: "a4", orientation: "landscape" },
      extras: { surveillanceDue: false, fireNocAlerts: false, gapClosure: false },
      markRecent: false,
      filtersText: describeFilters() || "",
    };
    void runExport(plan);
  };

  /**
   * Export the Certification cycles tab.
   * `scope="view"` writes what is on screen (the active view); `scope="full"`
   * writes every view. File name: `{District} Certification Cycles {View}
   * {DD-MM-YYYY}` (Part 7).
   */
  const runCycleExport = async (
    format: CycleExportFormat,
    scope: "view" | "full" = "view",
  ) => {
    setBusy(true);
    try {
      if (cycleExportRows.length === 0) {
        toast.error("Nothing to export — no facility-cycle matches the current filters");
        return;
      }
      const mod = await import("@/lib/cycleReportExport");
      const view = scope === "full" ? "full" : cycleView;
      if (format === "xlsx") {
        await mod.exportCycleWorkbook(
          mod.cycleFileName({ district: cycleDistrict, view, ext: "xlsx" }),
          cycleExportRows,
          cycleMeta,
          cycleSettings,
        );
      } else if (format === "pdf") {
        await mod.exportCyclePdf(
          mod.cycleFileName({ district: cycleDistrict, view, ext: "pdf" }),
          cycleExportRows,
          cycleMeta,
          cycleSettings,
          view,
        );
      } else if (format === "csv") {
        downloadText(
          mod.cycleFileName({ district: cycleDistrict, view, ext: "csv" }),
          mod.cycleReportCsv(cycleExportRows, cycleMeta, cycleSettings, view),
        );
      } else {
        window.print();
        return;
      }
      toast.success(
        `${scope === "full" ? "Full cycle report" : "This view"} exported (${format.toUpperCase()})`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };

  const runExportForTab = (format: CycleExportFormat) => {
    if (tab === "cycle") void runCycleExport(format);
    else if (tab === "summary") {
      if (format === "xlsx") exportSummaryExcel();
      else if (format === "pdf") void exportSummaryPdf();
      else if (format === "csv") exportSummaryCsv();
      else printSummary();
    } else if (format === "print") {
      openMasterPrint({
        rows: filtered,
        columns: visibleColumns,
        labels,
        subtitle: [
          describeFilters() || "No filters",
          `${filtered.length} of ${rows.length} facilities`,
          `generated ${toDisplayDate(todayLocalIso())}`,
        ].join(" · "),
      });
    } else runMasterFormat(format);
  };

  return (
    <AppShell
      title="Reports & Export"
      subtitle={
        tab === "cycle"
          ? `${rows.length} facilities${cycleStartedNote ? ` · ${cycleStartedNote}` : ""} · Data as of ${toDisplayDate(
              data?.generatedAt ?? todayLocalIso(),
            )} IST`
          : `Certification progress, document pipeline and building status · Data as of ${toDisplayDate(
              data?.generatedAt ?? todayLocalIso(),
            )} IST`
      }
      actions={
        <div className="flex items-center">
          <Button
            className="gap-2 rounded-r-none"
            disabled={busy || loading}
            onClick={() => runExportForTab("xlsx")}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Export
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="rounded-l-none border-l border-primary-foreground/25 px-2"
                aria-label="Export options"
                disabled={busy || loading}
              >
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {tab === "cycle" && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FileSpreadsheet className="size-4" /> Export this view
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-40">
                    {(["xlsx", "pdf", "csv", "print"] as CycleExportFormat[]).map(
                      (f) => (
                        <DropdownMenuItem
                          key={f}
                          onClick={() => void runCycleExport(f, "view")}
                        >
                          {f === "print" ? "Print" : f.toUpperCase()}
                        </DropdownMenuItem>
                      ),
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              <DropdownMenuItem onClick={() => runExportForTab("xlsx")}>
                <FileSpreadsheet className="size-4" /> Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => runExportForTab("pdf")}>
                <FileText className="size-4" /> PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => runExportForTab("csv")}>
                <FileText className="size-4" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => runExportForTab("print")}>
                <Printer className="size-4" /> Print
              </DropdownMenuItem>
              {tab === "master" && (
                <DropdownMenuItem onClick={() => setExportOpen(true)}>
                  <FileSpreadsheet className="size-4" /> More export options…
                </DropdownMenuItem>
              )}
              {tab === "cycle" && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FileText className="size-4" /> Full cycle report
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-40">
                    <DropdownMenuItem onClick={() => void runCycleExport("xlsx", "full")}>
                      Excel (all views)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void runCycleExport("pdf", "full")}>
                      PDF (all views)
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    >
      {/* ---- ONE shared filter bar above the tabs ------------------------- */}
      <FilterBar
        activeCount={activeFilterCount}
        onClearAll={() => {
          setSearch("");
          setBlockFilter([]);
          setPhcFilter([]);
          setTypeFilter([]);
          setCertFilter([]);
          setEligibilityFilter([]);
          setBuildingFilter([]);
          setStatusFilter([]);
          setNocFilter([]);
          setCycleScope("current");
        }}
        summary={`Showing ${tab === "cycle" ? cycleExportRows.length : filtered.length} of ${
          tab === "cycle" ? cycleAllCount : rows.length
        } ${tab === "cycle" ? "facility-cycles" : "facilities"}`}
      >
        <FilterSearch
          value={search}
          onChange={setSearch}
          placeholder="Facility, PHC, block or NIN…"
        />
        <FilterDropdown
          label="Block"
          options={blocks.map((b) => ({ value: b, label: b }))}
          value={blockFilter}
          onChange={setBlockFilter}
          triggerWidth="w-40"
        />
        <FilterDropdown
          label="Facility Type"
          options={types.map((t) => ({ value: t, label: t }))}
          value={typeFilter}
          onChange={setTypeFilter}
          triggerWidth="w-40"
        />
        {tab === "cycle" ? (
          <span className="inline-flex min-h-9 items-center rounded-lg border border-dashed border-border/70 px-2.5 text-[11px] text-muted-foreground">
            This report shows every cycle side by side
          </span>
        ) : (
          <CycleFilter allowAll={false} />
        )}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 text-xs font-medium hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              More filters
              {[
                phcFilter,
                certFilter,
                eligibilityFilter,
                buildingFilter,
                statusFilter,
                nocFilter,
              ].some((v) => v.length > 0) && (
                <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary tabular-nums">
                  {[
                    phcFilter,
                    certFilter,
                    eligibilityFilter,
                    buildingFilter,
                    statusFilter,
                    nocFilter,
                  ].filter((v) => v.length > 0).length}
                </span>
              )}
              <ChevronDown className="size-3.5" aria-hidden />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 space-y-2 p-2">
            <FilterDropdown
              label="PHC"
              options={phcs.map((p) => ({ value: p, label: p }))}
              value={phcFilter}
              onChange={setPhcFilter}
              triggerWidth="w-full"
            />
            <FilterDropdown
              label="NQAS certification status"
              options={certStatusOptions.map((s) => ({ value: s, label: s }))}
              value={certFilter}
              onChange={setCertFilter}
              triggerWidth="w-full"
            />
            <FilterDropdown
              label="NQAS Eligibility"
              options={eligibilityOptions.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              value={eligibilityFilter}
              onChange={setEligibilityFilter}
              triggerWidth="w-full"
            />
            <FilterDropdown
              label="Building status"
              options={BUILDING_BUCKET_ORDER.map((b) => ({ value: b, label: b }))}
              value={buildingFilter}
              onChange={setBuildingFilter}
              triggerWidth="w-full"
            />
            <FilterDropdown
              label="Facility Current Status"
              options={currentStatusOptions.map((s) => ({ value: s, label: s }))}
              value={statusFilter}
              onChange={setStatusFilter}
              triggerWidth="w-full"
            />
            <FilterDropdown
              label="Fire NOC status"
              options={nocStatusOptions.map((s) => ({ value: s, label: s }))}
              value={nocFilter}
              onChange={setNocFilter}
              triggerWidth="w-full"
            />
          </PopoverContent>
        </Popover>
      </FilterBar>

      {/* ---- active-filter chips (one clear action lives in the bar) ------- */}
      {(activeFilterCount > 0 || (tab !== "cycle" && cycleScope !== "current")) && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5" data-testid="report-filter-chips">
          {search.trim() && (
            <FilterChip label={`Search: ${search}`} onRemove={() => setSearch("")} />
          )}
          {tab !== "cycle" && cycleScope !== "current" && (
            <FilterChip
              label={`Certification Cycle: ${
                cycleScope === "all" ? "All" : `#${cycleScope}`
              }`}
              onRemove={() => setCycleScope("current")}
            />
          )}
          {blockFilter.map((v) => (
            <FilterChip
              key={`b-${v}`}
              label={`Block: ${v}`}
              onRemove={() => setBlockFilter(blockFilter.filter((x) => x !== v))}
            />
          ))}
          {typeFilter.map((v) => (
            <FilterChip
              key={`t-${v}`}
              label={`Type: ${v}`}
              onRemove={() => setTypeFilter(typeFilter.filter((x) => x !== v))}
            />
          ))}
          {phcFilter.map((v) => (
            <FilterChip
              key={`p-${v}`}
              label={`PHC: ${v}`}
              onRemove={() => setPhcFilter(phcFilter.filter((x) => x !== v))}
            />
          ))}
          {certFilter.map((v) => (
            <FilterChip
              key={`c-${v}`}
              label={`Certification: ${v}`}
              onRemove={() => setCertFilter(certFilter.filter((x) => x !== v))}
            />
          ))}
          {eligibilityFilter.map((v) => (
            <FilterChip
              key={`e-${v}`}
              label={`Eligibility: ${
                eligibilityOptions.find((o) => o.value === v)?.label ?? v
              }`}
              onRemove={() => setEligibilityFilter(eligibilityFilter.filter((x) => x !== v))}
            />
          ))}
          {buildingFilter.map((v) => (
            <FilterChip
              key={`s-${v}`}
              label={`Building: ${v}`}
              onRemove={() => setBuildingFilter(buildingFilter.filter((x) => x !== v))}
            />
          ))}
          {statusFilter.map((v) => (
            <FilterChip
              key={`st-${v}`}
              label={`Status: ${v}`}
              onRemove={() => setStatusFilter(statusFilter.filter((x) => x !== v))}
            />
          ))}
          {nocFilter.map((v) => (
            <FilterChip
              key={`noc-${v}`}
              label={`Fire NOC: ${v}`}
              onRemove={() => setNocFilter(nocFilter.filter((x) => x !== v))}
            />
          ))}
        </div>
      )}

      {/* ---- report tabs ------------------------------------------------- */}
      <div
        role="tablist"
        aria-label="Report views"
        className="mb-4 flex flex-wrap items-center gap-1 border-b border-border/60"
      >
        {(Object.keys(TAB_LABELS) as ReportTab[]).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            id={`report-tab-${t}`}
            aria-selected={tab === t}
            aria-controls={`report-panel-${t}`}
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === "summary" && (
        <div id="report-panel-summary" role="tabpanel" aria-labelledby="report-tab-summary">
          <div className="glass rounded-xl p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Certification, pipeline and building by {summaryDim === "type" ? "facility type" : summaryDim}</h2>
              <Select
                value={summaryDim}
                onValueChange={(v) => setSummaryDim(v as SummaryDim)}
              >
                <SelectTrigger className="glass-input h-8 w-44 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="type">By Facility Type</SelectItem>
                  <SelectItem value="block">Block-wise</SelectItem>
                  <SelectItem value="phc">PHC-wise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!loading && summaryRows.length > 0 && (
              <>
                <ReconciliationChips
                  total={summaryTotal}
                  names={new Map(filtered.map((r) => [String(r.facility._id), r.facility.name]))}
                />
                {/* One-line answer to the old 73 / 74 confusion. */}
                <p
                  data-testid="certified-reconciliation"
                  className="mb-2 text-[11px] text-muted-foreground"
                >
                  Certified stage: {summaryTotal.totalCertified} of {summaryTotal.target} (
                  {formatPercent(summaryTotal.certifiedPct)}). Hold a certificate:{" "}
                  {holdCertificateCount}
                  {holdCertificateCount === summaryTotal.totalCertified
                    ? " — the same facility set"
                    : ` — the stage count differs because it includes a facility whose stored status is not Quality / Conditional`}
                  . Deferred {summaryTotal.deferred} is reported separately, never added to
                  Certified (the old 74 was Certified + Deferred; the correct total is{" "}
                  {summaryTotal.totalCertified}).
                </p>
              </>
            )}

            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <TypeWiseSummaryTable
                rows={summaryRows}
                dimension={summaryDim}
                docStatuses={summaryDocStatuses}
                buildingStatuses={summaryBuilding}
                onCellClick={(kind, value, rowLabel) => {
                  if (rowLabel) setDrill({ kind, value, rowLabel });
                }}
              />
            )}

            {/* Drilldown: the clicked bucket/stage's facilities, exactly */}
            {drill && (
              <div className="mt-3 rounded-xl border border-border/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm">
                    <span className="font-semibold">{drill.rowLabel}</span>
                    {" · "}
                    {drill.kind === "building" ? "Building status: " : "Pipeline: "}
                    <span className="font-semibold">{drill.value}</span>
                    {" — "}
                    {drillRows.length} facilit{drillRows.length === 1 ? "y" : "ies"}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => setDrill(null)}
                  >
                    Close drilldown
                  </Button>
                </div>
                {drillRows.length > 0 ? (
                  <ul className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                    {drillRows.map((r) => (
                      <li key={String(r.facility._id)}>
                        <FacilityCell
                          facility={r.facility}
                          className="rounded-lg border border-border/50 px-2 py-1.5 hover:bg-muted/60"
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No facilities.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "cycle" && (
        <div id="report-panel-cycle" role="tabpanel" aria-labelledby="report-tab-cycle">
          {cycleData === undefined ? (
            <CycleReportSkeleton />
          ) : (
            <Suspense fallback={<CycleReportSkeleton />}>
              <CycleReportView
                rows={cycleExportRows}
                settings={cycleSettings}
                generatedAt={data?.generatedAt ?? todayLocalIso()}
                filtersText={cycleOnlyFilters || "No filters"}
                knownCycles={(cycleCounts?.cycles ?? []).map((c) => ({
                  cycleNumber: c.cycleNumber,
                  cycleType: c.cycleType,
                }))}
                view={cycleView}
                onViewChange={(next) => setCycleParam("view", next)}
                bucket={cycleBucket}
                onBucketChange={(next) => setCycleParam("bucket", next)}
                step={cycleStep}
                onStepChange={(next) => setCycleParam("step", next)}
              />
            </Suspense>
          )}
        </div>
      )}

      {tab === "linelists" && (
        <div
          id="report-panel-linelists"
          role="tabpanel"
          aria-labelledby="report-tab-linelists"
        >
          <Suspense fallback={<CycleReportSkeleton />}>
            <LineListsTab onOpenFacility={(row) => setDrawerRow(row)} />
          </Suspense>
        </div>
      )}

      {tab === "master" && (
        <div id="report-panel-master" role="tabpanel" aria-labelledby="report-tab-master">
          <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
            {layoutSync !== "idle" && (
              <span
                className={cn(
                  "text-[11px]",
                  layoutSync === "error" ? "text-destructive" : "text-muted-foreground",
                )}
                role="status"
              >
                {layoutSync === "saving"
                  ? "Saving layout…"
                  : layoutSync === "saved"
                    ? "Layout saved to your account"
                    : "Saved on this device only — account sync failed"}
              </span>
            )}
            <RowViewSelect
              value={pager.view}
              onChange={pager.setView}
              total={pager.total}
            />
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <GroupedMasterTable
            rows={filtered}
            labels={labels}
            view={view}
            sorting={sorting}
            onSortingChange={setSorting}
            onDensityChange={(density: Density) =>
              setView({ ...view, density })
            }
            onOpenRow={setDrawerRow}
            onColumnsClick={() => setColsOpen(true)}
            totalRowCount={rows.length}
            onClearFilters={
              activeFilterCount > 0
                ? () => {
                    setSearch("");
                    setBlockFilter([]);
                    setPhcFilter([]);
                    setTypeFilter([]);
                    setCertFilter([]);
                    setEligibilityFilter([]);
                    setBuildingFilter([]);
                    setStatusFilter([]);
                    setNocFilter([]);
                    setCycleScope("current");
                  }
                : undefined
            }
            scrollRef={tableScrollRef}
            widthsStorageKey="report"
            pinnedKeys={pinnedKeys}
            freezeActive={freezeActive}
            freezeToggle={{ on: freezeOn, onChange: setFreezeOn }}
          />
              <PaginationBar
                total={pager.total}
                view={pager.view}
                page={pager.page}
                onPage={pager.setPage}
              />
            </>
          )}
        </div>
      )}

      <ColumnManager
        open={colsOpen}
        onOpenChange={setColsOpen}
        labels={labels}
        view={view}
        onChange={setView}
        pinnedKeys={pinnedKeys}
      />
      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        counts={{ filtered: filtered.length, all: rows.length }}
        visibleColumns={visibleColumns}
        filtersText={describeFilters() || ""}
        onRun={(plan) => void runExport(plan)}
      />
      <FacilityQuickView
        row={drawerRow}
        labels={labels}
        open={!!drawerRow}
        onOpenChange={(o) => {
          if (!o) setDrawerRow(null);
        }}
        canEdit={false}
      />
    </AppShell>
  );
}


void COLUMN_PRESETS;
void REPORT_DEFAULT_KEYS;
void applyPreset;
void moveColumn;
void allIaPeriods;

/* --------------------------------------------------------------------------- */
/* Small report-only pieces                                                    */
/* --------------------------------------------------------------------------- */

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex min-h-8 items-center gap-1 rounded-full border border-primary/40 bg-primary/10 pr-1 pl-2.5 text-[11px] font-medium">
      <span className="max-w-56 truncate" data-tip={label} data-tip-truncate>
        {label}
      </span>
      <button
        type="button"
        aria-label={`Remove ${label}`}
        onClick={onRemove}
        className="rounded-full p-1 hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        ×
      </button>
    </span>
  );
}

/** The ONE reconciliation chip row above the summary table. */
function ReconciliationChips({
  total,
  names,
}: {
  total: TypeWiseSummaryRow;
  names: Map<string, string>;
}) {
  const [open, setOpen] = useState<"certification" | "pipeline" | "building" | null>(null);
  const counted = countedFor(total);
  const chips = [
    {
      key: "certification" as const,
      name: "Certification",
      ok: total.reconcile.certification,
      counted: counted.certification,
      failures: total.failures.certification,
    },
    {
      key: "pipeline" as const,
      name: "Pipeline",
      ok: total.reconcile.pipeline,
      counted: counted.pipeline,
      failures: total.failures.pipeline,
    },
    {
      key: "building" as const,
      name: "Building",
      ok: total.reconcile.building,
      counted: counted.building,
      failures: total.failures.building,
    },
  ];
  const failing = chips.find((c) => !c.ok && c.key === open)?.failures ?? [];
  return (
    <div className="mb-2">
      <div
        data-testid="summary-reconciliation"
        className="flex flex-wrap items-center gap-1.5"
        data-tip={reconciliationText(total)}
      >
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setOpen(c.ok ? null : open === c.key ? null : c.key)}
            aria-expanded={!c.ok && open === c.key}
            className={cn(
              "inline-flex min-h-7 items-center gap-1 rounded-full border px-2 text-[11px] font-semibold tabular-nums",
              c.ok
                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                : "border-amber-400 bg-amber-50 text-amber-900",
            )}
          >
            {c.ok ? (
              <Check className="size-3" aria-hidden />
            ) : (
              <TriangleAlert className="size-3" aria-hidden />
            )}
            {c.name} {c.ok ? "✓" : "⚠"} {c.counted}/{total.target}
          </button>
        ))}
        <span className="text-[11px] text-muted-foreground">
          Every group includes its remainder column; no facility is dropped or counted twice.
        </span>
      </div>
      {open && failing.length > 0 && (
        <div className="mt-1 rounded-lg border border-amber-300 bg-amber-50/60 p-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-amber-900">
              {failing.length} facilit{failing.length === 1 ? "y" : "ies"} not accounted for
              by the {open} group
            </p>
            <button
              type="button"
              className="text-[11px] font-medium text-primary hover:underline"
              onClick={() => setOpen(null)}
            >
              Close
            </button>
          </div>
          <ul className="mt-1 grid gap-0.5 text-xs sm:grid-cols-2 lg:grid-cols-3">
            {failing.map((id) => (
              <li key={id}>
                <a href={`/facilities/${id}`} className="hover:underline">
                  {names.get(id) ?? id}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Layout-shaped skeleton: no spinner, no layout shift. */
function CycleReportSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading the cycle report">
      <div className="h-6 w-64 animate-pulse rounded bg-muted" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl border border-border/60 bg-muted/50" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl border border-border/60 bg-muted/40" />
      <div className="h-48 animate-pulse rounded-xl border border-border/60 bg-muted/30" />
    </div>
  );
}
