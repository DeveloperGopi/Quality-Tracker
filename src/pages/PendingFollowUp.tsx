/**
 * PENDING & FOLLOW-UP — one list of every facility that has something missing,
 * not updated, overdue or needing attention.
 *
 * The list is computed from the cached facility rows (Web Worker) with the ONE
 * registry in lib/pending. The bell, sidebar badge and Master List smart view
 * read the same registry, so their counts are the same calculation. Remarks
 * and follow-ups live in the small `issue_state` table; nothing about the
 * issue itself is stored or duplicated.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  Circle,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Info,
  ListTodo,
  Loader2,
  MessageSquarePlus,
  Search,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { FacilityCell } from "@/components/FacilityCell";
import { useCycleScope } from "@/components/CycleFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  UniversalFilterBar,
  loadBarState,
  rowPasses,
  saveBarState,
  filterChipLabel,
  type BarValue,
  type FilterField,
} from "@/components/UniversalFilterBar";
import { DateInput } from "@/components/DateInput";
import { FacilityQuickView } from "@/components/quickview/FacilityQuickView";
import { trackerUpdatePayload } from "@/components/master/EditModeCells";
import {
  MASTER_COLUMNS,
  resolveLabels,
  type MasterRow,
} from "@/lib/masterColumns";
import { normalizeDocumentRules } from "@/lib/documentRules";
import {
  ISSUE_CATEGORIES,
  ISSUE_CATEGORY_LABEL,
  ISSUE_SEVERITY_LABEL,
  ISSUE_STATUSES,
  ISSUE_STATUS_LABEL,
  dmy,
  dueLabel,
  isoDate,
  mergeIssueStates,
  normalizePendingConfig,
  pendingCounts,
  pendingFileName,
  pendingHeadline,
  RULE_BY_ID,
  type IssueCategory,
  type IssueSeverity,
  type IssueState,
  type IssueStatus,
  type PendingIssue,
  type PendingIssueRow,
  type PendingRow,
} from "@/lib/pending";
import type { LifecycleSettings } from "@/convex/lifecycle";
import { todayLocalIso } from "@/lib/today";
import { computePendingInWorker } from "@/lib/pendingComputeClient";
import {
  exportPendingCsv,
  exportPendingExcel,
  exportPendingPdf,
} from "@/lib/pendingExport";
import { cn } from "@/lib/utils";

type ViewMode = "issue" | "facility";
type QuickFilter = "all" | "high" | IssueCategory;
type ExportFormat = "excel" | "pdf" | "csv";

const VIEW_KEY = "nqas.pending.view";

function readView(userId?: string | null): ViewMode {
  if (typeof window === "undefined") return "issue";
  try {
    const own = userId ? window.localStorage.getItem(`${VIEW_KEY}.${userId}`) : null;
    const value = own ?? window.localStorage.getItem(VIEW_KEY);
    return value === "facility" ? "facility" : "issue";
  } catch {
    return "issue";
  }
}

function saveView(value: ViewMode, userId?: string | null) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VIEW_KEY, value);
    if (userId) window.localStorage.setItem(`${VIEW_KEY}.${userId}`, value);
  } catch {
    /* private mode */
  }
}

const SEVERITY_STYLE: Record<IssueSeverity, string> = {
  high: "border-rose-300/80 bg-rose-50 text-rose-900",
  medium: "border-amber-300/80 bg-amber-50 text-amber-900",
  low: "border-slate-300/70 bg-slate-50 text-slate-700",
};

const SEVERITY_ICON: Record<IssueSeverity, typeof AlertTriangle> = {
  high: AlertTriangle,
  medium: Circle,
  low: Info,
};

const STATUS_STYLE: Record<IssueStatus, string> = {
  open: "border-amber-300/80 bg-amber-50 text-amber-900",
  "in-progress": "border-sky-300/80 bg-sky-50 text-sky-900",
  snoozed: "border-violet-300/80 bg-violet-50 text-violet-900",
  resolved: "border-emerald-300/80 bg-emerald-50 text-emerald-900",
};

const CATEGORY_SHORT: Record<IssueCategory, string> = {
  documents: "Documents",
  "not-updated": "Not updated",
  "pending-work": "Pending work",
  "certificate-surveillance": "Certificate & surveillance",
  "fire-building": "Fire NOC & building",
  "data-conflicts": "Data conflicts",
};

type FollowUpDraft = {
  remark: string;
  followUpDate: string;
  assignee: string;
  status: IssueStatus;
  snoozeUntil: string;
  snoozeReason: string;
};

const emptyDraft = (row?: PendingIssueRow | null): FollowUpDraft => ({
  remark: row?.remark ?? "",
  followUpDate: row?.followUpDate ?? "",
  assignee: row?.assignee ?? "",
  status: row?.history ? "resolved" : row?.status ?? "open",
  snoozeUntil: row?.snoozeUntil ?? "",
  snoozeReason: row?.snoozeReason ?? "",
});

export default function PendingFollowUpPage() {
  // The same cycle scope as the bell/badge/Master List, so the counts agree.
  const cycleScope = useCycleScope();
  const rowsQ = useQuery(api.ops.listFacilityRowsFast, { cycle: cycleScope });
  const overview = useQuery(api.pending.overview, {});
  const saveState = useMutation(api.pending.upsertState);
  const logExport = useMutation(api.pending.logExport);
  const updateTrackerRow = useMutation(api.facilities.updateTrackerRow);
  const today = todayLocalIso();
  const [searchParams, setSearchParams] = useSearchParams();
  const ruleFilter = searchParams.get("rule") ?? "";
  const ruleFilterDef = ruleFilter ? RULE_BY_ID[ruleFilter] : undefined;

  const [issues, setIssues] = useState<PendingIssue[] | null>(null);
  const [computeError, setComputeError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>(() => readView());
  const [quick, setQuick] = useState<QuickFilter>("all");
  const [bar, setBar] = useState<BarValue>(() => {
    // A rule drill-down from Admin starts clean so the rule's count and the
    // visible list cannot disagree because of an old saved filter.
    if (searchParams.get("rule")) {
      return { barKeys: ["block", "category", "severity", "status"], filters: [], match: "all" };
    }
    const saved = loadBarState("pending");
    return saved
      ? { ...saved, filters: saved.filters ?? [] }
      : { barKeys: ["block", "category", "severity", "status"], filters: [], match: "all" };
  });
  const [filterSheet, setFilterSheet] = useState(false);
  const [editRow, setEditRow] = useState<PendingIssueRow | null>(null);
  const [draft, setDraft] = useState<FollowUpDraft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [busyExport, setBusyExport] = useState<ExportFormat | null>(null);
  const [quickView, setQuickView] = useState<{
    facilityId: string;
    section: string;
    edit: boolean;
    token: number;
  } | null>(null);
  const defaultsApplied = useRef(false);

  const config = useMemo(
    () => normalizePendingConfig(overview?.config),
    [overview?.config],
  );
  const documentRules = useMemo(
    () => normalizeDocumentRules(overview?.documentRules),
    [overview?.documentRules],
  );
  const lifecycle = useMemo(
    () => (overview?.settings ?? {}) as Partial<LifecycleSettings>,
    [overview?.settings],
  );
  const rows = rowsQ?.rows as unknown as PendingRow[] | undefined;

  /* Remember the view per user (the first render has no id yet). */
  useEffect(() => {
    if (overview?.me.id) setView(readView(overview.me.id));
  }, [overview?.me.id]);

  /* Admin → Filters defaults: first visit only; a saved bar always wins. */
  useEffect(() => {
    if (!overview || defaultsApplied.current || loadBarState("pending")) return;
    defaultsApplied.current = true;
    const configured = overview.config.defaultFilters ?? [];
    if (!configured.length) return;
    setBar((current) => ({ ...current, barKeys: configured }));
  }, [overview]);

  /* Compute in the Web Worker from the cached rows. */
  useEffect(() => {
    if (!rows || !overview) return;
    let cancelled = false;
    setComputeError(null);
    computePendingInWorker(rows, {
      today,
      config,
      documentRules,
      settings: lifecycle,
    })
      .then((next) => {
        if (!cancelled) setIssues(next);
      })
      .catch((err) => {
        if (!cancelled) {
          setComputeError(err instanceof Error ? err.message : "Could not compute the pending list");
          setIssues([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [rows, overview, today, config, documentRules, lifecycle]);

  const merged = useMemo(
    () => mergeIssueStates(issues ?? [], (overview?.states ?? []) as IssueState[], today),
    [issues, overview?.states, today],
  );
  const counts = useMemo(() => pendingCounts(issues ?? []), [issues]);

  /* Facility facts used by the filters / export metadata. */
  const facilityById = useMemo(() => {
    const map = new Map<string, MasterRow>();
    for (const row of (rowsQ?.rows ?? []) as unknown as MasterRow[]) {
      map.set(String(row.facility._id), row);
    }
    return map;
  }, [rowsQ?.rows]);

  const lastUpdatedById = useMemo(() => {
    const map = new Map<string, string>();
    for (const [id, row] of facilityById) {
      const iso = isoDate(row.facility.lastChangedAt ?? row.facility.updatedAt ?? null);
      if (iso) map.set(id, iso);
    }
    return map;
  }, [facilityById]);

  const dataAsOfIso = useMemo(() => {
    let latest: string | null = null;
    for (const iso of lastUpdatedById.values()) if (!latest || iso > latest) latest = iso;
    return latest ?? today;
  }, [lastUpdatedById, today]);

  const uniq = (values: (string | null | undefined)[]) =>
    [...new Set(values.filter((value): value is string => !!value && value.trim() !== ""))].sort(
      (a, b) => a.localeCompare(b),
    );

  const fields = useMemo<FilterField[]>(() => {
    const all = [...merged.rows, ...merged.history];
    return [
      {
        key: "block",
        label: "Block",
        type: "select",
        onThisPage: true,
        options: uniq(all.map((r) => r.block)).map((value) => ({ value, label: value })),
      },
      {
        key: "facilityType",
        label: "Facility Type",
        type: "select",
        onThisPage: true,
        options: uniq(all.map((r) => r.facilityType)).map((value) => ({ value, label: value })),
      },
      {
        key: "category",
        label: "Category",
        type: "select",
        onThisPage: true,
        options: ISSUE_CATEGORIES.map((value) => ({ value: ISSUE_CATEGORY_LABEL[value], label: ISSUE_CATEGORY_LABEL[value] })),
      },
      {
        key: "severity",
        label: "Severity",
        type: "select",
        onThisPage: true,
        options: (["high", "medium", "low"] as const).map((value) => ({
          value: ISSUE_SEVERITY_LABEL[value],
          label: ISSUE_SEVERITY_LABEL[value],
        })),
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        onThisPage: true,
        options: ISSUE_STATUSES.map((value) => ({ value: ISSUE_STATUS_LABEL[value], label: ISSUE_STATUS_LABEL[value] })),
      },
      {
        key: "cycle",
        label: "Cycle",
        type: "select",
        options: uniq(all.map((r) => (r.cycleNumber != null ? `#${r.cycleNumber}` : "No cycle"))).map((value) => ({
          value,
          label: value,
        })),
      },
      { key: "lastUpdated", label: "Last updated", type: "date", options: [] },
      {
        key: "assignedTo",
        label: "Assigned to",
        type: "select",
        options: uniq(all.map((r) => r.assignee)).map((value) => ({ value, label: value })),
      },
    ];
  }, [merged.rows, merged.history]);

  const statusValues = useMemo(
    () =>
      (bar.filters.find((filter) => filter.key === "status")?.values ?? []).map((value) =>
        value.toLowerCase(),
      ),
    [bar.filters],
  );
  const showSnoozed = statusValues.includes("snoozed");
  const showResolved = statusValues.includes("resolved");

  const filtered = useMemo(() => {
    const pool = [
      ...merged.rows.filter((row) =>
        row.status === "resolved" ? showResolved : row.status === "snoozed" ? showSnoozed : true,
      ),
      ...(showResolved ? merged.history : []),
    ];
    const needle = search.trim().toLowerCase();
    return pool.filter((row) => {
      if (ruleFilter && row.stateRuleId !== ruleFilter) return false;
      if (quick === "high" && row.severity !== "high") return false;
      if (quick !== "all" && quick !== "high" && row.category !== quick) return false;
      if (needle) {
        const haystack = [
          row.facilityName,
          row.nin ?? "",
          row.reason,
          row.block,
          row.phc,
          row.facilityType,
          row.remark ?? "",
          row.assignee ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return rowPasses(bar.filters, bar.match, (key) => {
        switch (key) {
          case "block":
            return row.block;
          case "facilityType":
            return row.facilityType;
          case "category":
            return ISSUE_CATEGORY_LABEL[row.category];
          case "severity":
            return ISSUE_SEVERITY_LABEL[row.severity];
          case "status":
            return ISSUE_STATUS_LABEL[row.status];
          case "cycle":
            return row.cycleNumber != null ? `#${row.cycleNumber}` : "No cycle";
          case "lastUpdated":
            return lastUpdatedById.get(row.facilityId) ?? "";
          case "assignedTo":
            return row.assignee ?? "";
          default:
            return "";
        }
      });
    });
  }, [
    merged.rows,
    merged.history,
    showSnoozed,
    showResolved,
    search,
    quick,
    bar.filters,
    bar.match,
    lastUpdatedById,
    ruleFilter,
  ]);

  const byFacility = useMemo(() => {
    const map = new Map<string, { name: string; block: string; phc: string; type: string; nin: string | null; rows: PendingIssueRow[] }>();
    for (const row of filtered) {
      const entry = map.get(row.facilityId) ?? {
        name: row.facilityName,
        block: row.block,
        phc: row.phc,
        type: row.facilityType,
        nin: row.nin ?? null,
        rows: [],
      };
      entry.rows.push(row);
      map.set(row.facilityId, entry);
    }
    return [...map.entries()]
      .map(([facilityId, entry]) => ({ facilityId, ...entry, high: entry.rows.filter((row) => row.severity === "high").length }))
      .sort((a, b) => b.high - a.high || a.name.localeCompare(b.name));
  }, [filtered]);

  const filterText = useMemo(() => {
    const parts: string[] = [];
    for (const filter of bar.filters) {
      if (!filter.values.length) continue;
      const field = fields.find((item) => item.key === filter.key);
      if (field) parts.push(filterChipLabel(field, filter));
    }
    if (search.trim()) parts.push(`Search: ${search.trim()}`);
    if (ruleFilter) parts.push(`Rule: ${ruleFilterDef?.label ?? ruleFilter}`);
    if (quick === "high") parts.push("High severity");
    if (quick !== "all" && quick !== "high") parts.push(ISSUE_CATEGORY_LABEL[quick]);
    return parts.join(" · ") || "None — all facilities";
  }, [bar.filters, fields, search, quick, ruleFilter, ruleFilterDef]);

  const exportMeta = {
    district: String(overview?.settings?.districtName ?? "District"),
    filtersText: filterText,
    generatedBy: `NQAS Tracker (${overview?.me.appRole ?? "user"})`,
    dataAsOf: dmy(dataAsOfIso),
    fileNameBase: pendingFileName(String(overview?.settings?.districtName ?? "District"), today),
  };

  const runExport = async (format: ExportFormat) => {
    if (filtered.length === 0) {
      toast.error("Nothing to export — no issue matches the current filters");
      return;
    }
    setBusyExport(format);
    try {
      let result: { fileName: string; rows: number };
      if (format === "excel") result = await exportPendingExcel(filtered, exportMeta);
      else if (format === "pdf") result = await exportPendingPdf(filtered, exportMeta);
      else result = exportPendingCsv(filtered, exportMeta);
      await logExport({
        format,
        filters: exportMeta.filtersText,
        rows: result.rows,
        fileName: result.fileName,
      });
      toast.success(`${format.toUpperCase()} ready`, {
        description: `${filtered.length} issue${filtered.length === 1 ? "" : "s"} · ${exportMeta.fileNameBase}`,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not build the export");
    } finally {
      setBusyExport(null);
    }
  };

  const openEdit = (row: PendingIssueRow) => {
    if (!overview?.me.canEdit) return;
    setEditRow(row);
    setDraft(emptyDraft(row));
  };

  const saveFollowUp = async () => {
    if (!editRow) return;
    if (draft.status === "snoozed" && (!draft.snoozeUntil || !draft.snoozeReason.trim())) {
      toast.error("Choose the snooze date and add a reason");
      return;
    }
    setSaving(true);
    try {
      await saveState({
        facilityId: editRow.facilityId as never,
        ruleId: editRow.stateRuleId,
        remark: draft.remark.trim() || undefined,
        followUpDate: draft.followUpDate || undefined,
        assignee: draft.assignee.trim() || undefined,
        status: draft.status,
        snoozeUntil: draft.status === "snoozed" ? draft.snoozeUntil || undefined : undefined,
        snoozeReason: draft.status === "snoozed" ? draft.snoozeReason.trim() || undefined : undefined,
        lastReason: editRow.reason,
      });
      toast.success("Follow-up saved", { description: "Every surface reads the same issue registry." });
      setEditRow(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the follow-up");
    } finally {
      setSaving(false);
    }
  };

  const openQuickView = (facilityId: string, section: string, edit: boolean) => {
    setQuickView({ facilityId, section, edit, token: Date.now() });
  };

  const quickRow = quickView ? facilityById.get(quickView.facilityId) ?? null : null;
  const labels = useMemo(
    () => resolveLabels(MASTER_COLUMNS, overview?.settings?.tableHeaderOverrides as Record<string, string> | undefined),
    [overview?.settings?.tableHeaderOverrides],
  );

  const loading = issues === null || !overview || !rowsQ;
  const activeFilterCount = bar.filters.filter((filter) => filter.values.length > 0).length;

  const chips: { key: QuickFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.total },
    { key: "high", label: "High", count: counts.high },
    ...ISSUE_CATEGORIES.map((category) => ({
      key: category as QuickFilter,
      label: CATEGORY_SHORT[category],
      count: counts.byCategory[category],
    })),
  ];

  return (
    <AppShell
      title="Pending & Follow-up"
      subtitle={`${pendingHeadline(counts)} · Data as of ${dmy(dataAsOfIso)} IST`}
      titleIcon={ListTodo}
      actions={
        <div className="flex items-center gap-1.5">
          <div className="flex">
            <Button
              size="sm"
              className="rounded-r-none"
              onClick={() => void runExport("excel")}
              disabled={busyExport !== null || loading}
            >
              {busyExport === "excel" ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Download className="mr-1.5 size-3.5" />}
              Download
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="rounded-l-none border-l border-primary-foreground/25 px-2"
                  aria-label="Download options"
                  disabled={busyExport !== null || loading}
                >
                  <ChevronDown className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => void runExport("excel")}>
                  <FileSpreadsheet className="mr-1.5 size-4" /> Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void runExport("pdf")}>
                  <FileText className="mr-1.5 size-4" /> PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void runExport("csv")}>
                  <FileText className="mr-1.5 size-4" /> CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      }
    >
      <div className="space-y-3 pb-24 md:pb-0" data-testid="pending-page">
        {/* Sticky search + universal filter bar */}
        <section className="sticky top-[4.6rem] z-20 -mx-1 rounded-xl border border-border/60 bg-background/90 px-1.5 py-2 shadow-sm backdrop-blur-md">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search facility, NIN, reason or remark…"
                aria-label="Search pending issues"
                className="h-10 rounded-lg border-border/70 bg-background pr-9 pl-9 text-sm"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <div className="hidden md:block">
              <UniversalFilterBar
                pageKey="pending"
                restoreSaved={!ruleFilter}
                fields={fields}
                value={bar}
                onChange={setBar}
                onResetDefault={() => {
                  const next = { barKeys: config.defaultFilters, filters: [], match: "all" as const };
                  setBar(next);
                  saveBarState("pending", next);
                }}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10 justify-center gap-2 md:hidden"
              onClick={() => setFilterSheet(true)}
            >
              <Filter className="size-4" /> Filters
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>
          <Dialog open={filterSheet} onOpenChange={setFilterSheet}>
            <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0">
              <DialogHeader className="shrink-0 border-b px-4 py-3 pr-12">
                <DialogTitle>Filters</DialogTitle>
                <DialogDescription>Tap outside or Esc to return to the list.</DialogDescription>
              </DialogHeader>
              <div className="min-h-0 overflow-y-auto p-3">
                <UniversalFilterBar
                  pageKey="pending"
                  restoreSaved={!ruleFilter}
                  fields={fields}
                  value={bar}
                  onChange={setBar}
                />
              </div>
            </DialogContent>
          </Dialog>
          <p className="mt-1 text-[11px] text-muted-foreground" aria-live="polite">
            Showing <b className="font-semibold text-foreground">{filtered.length}</b> of{" "}
            {issues?.length ?? 0} issues
            {showResolved ? ` · ${merged.history.length} resolved in history` : ""}
          </p>
          {ruleFilter && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-2.5 text-[11px] font-medium text-primary">
                Rule: {ruleFilterDef?.label ?? ruleFilter}
                <button
                  type="button"
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.delete("rule");
                    setSearchParams(next, { replace: true });
                  }}
                  aria-label="Clear rule filter"
                  className="rounded-full p-0.5 hover:bg-primary/10"
                >
                  <X className="size-3" />
                </button>
              </span>
            </div>
          )}
        </section>

        {/* Summary chips */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Pending summary filters">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              aria-pressed={quick === chip.key}
              onClick={() => setQuick(quick === chip.key ? "all" : chip.key)}
              className={cn(
                "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:min-h-8",
                quick === chip.key
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/70 bg-background/70 text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
            >
              {chip.label}
              <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] tabular-nums">{chip.count}</span>
            </button>
          ))}
        </div>

        {/* View switch */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border/70 bg-background/70 p-0.5" role="tablist" aria-label="Pending view">
            {([
              ["issue", "By issue"],
              ["facility", "By facility"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={view === key}
                onClick={() => {
                  setView(key);
                  saveView(key, overview?.me.id);
                }}
                className={cn(
                  "inline-flex min-h-10 items-center rounded-md px-3 text-xs font-semibold transition-colors md:min-h-8",
                  view === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {view === "issue"
              ? "One row per issue · frozen Facility column"
              : `${byFacility.length} facilities with an issue in view`}
          </span>
        </div>

        {computeError && (
          <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-900">
            {computeError}
          </p>
        )}

        {loading ? (
          <div className="space-y-2" aria-busy="true">
            <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
            <div className="h-64 w-full animate-pulse rounded-xl bg-muted/60" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 bg-card/60 px-6 py-12 text-center">
            <ListTodo className="mx-auto size-8 text-primary/60" />
            <h2 className="mt-2 text-sm font-semibold">Nothing pending in this view</h2>
            <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
              {issues?.length === 0
                ? "Every enabled rule is satisfied for the facilities you can see."
                : "Clear the search and filters, or switch the summary chip."}
            </p>
          </div>
        ) : view === "issue" ? (
          <>
            <div className="hidden overflow-auto rounded-xl border border-border/60 bg-card md:block" style={{ maxHeight: "calc(100vh - 17rem)" }}>
              <table className="w-full min-w-[1180px] border-collapse text-xs" data-testid="pending-table">
                <thead className="sticky top-0 z-20 bg-muted text-[11px] text-muted-foreground">
                  <tr>
                    <th scope="col" className="sticky left-0 z-30 min-w-[220px] border-r border-border/60 bg-muted px-2.5 py-2 text-left font-semibold">
                      Facility
                    </th>
                    <th scope="col" className="min-w-[120px] px-2.5 py-2 text-left font-semibold">Category</th>
                    <th scope="col" className="min-w-[86px] px-2.5 py-2 text-left font-semibold">Severity</th>
                    <th scope="col" className="min-w-[300px] px-2.5 py-2 text-left font-semibold">Issue / reason</th>
                    <th scope="col" className="min-w-[110px] px-2.5 py-2 text-left font-semibold">Since</th>
                    <th scope="col" className="min-w-[64px] px-2.5 py-2 text-left font-semibold">Cycle</th>
                    <th scope="col" className="min-w-[190px] px-2.5 py-2 text-left font-semibold">Remark</th>
                    <th scope="col" className="min-w-[110px] px-2.5 py-2 text-left font-semibold">Status</th>
                    <th scope="col" className="min-w-[76px] px-2.5 py-2 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const Icon = SEVERITY_ICON[row.severity];
                    return (
                      <tr key={row.id} className="h-[54px] border-b border-border/40 align-middle hover:bg-muted/25">
                        <td className="sticky left-0 z-10 border-r border-border/60 bg-card px-2.5">
                          <FacilityCell
                            facility={{
                              _id: row.facilityId,
                              name: row.facilityName,
                              facilityType: row.facilityType,
                              block: row.block,
                              phc: row.phc,
                              ninNumber: row.nin,
                            }}
                            query={search}
                            onOpen={() => openQuickView(row.facilityId, row.action, false)}
                          />
                        </td>
                        <td className="px-2.5 text-[11px] text-muted-foreground">{CATEGORY_SHORT[row.category]}</td>
                        <td className="px-2.5">
                          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold", SEVERITY_STYLE[row.severity])}>
                            <Icon className="size-3" aria-hidden /> {ISSUE_SEVERITY_LABEL[row.severity]}
                          </span>
                        </td>
                        <td className="px-2.5">
                          <span className="line-clamp-2 text-[11px] leading-snug" data-tip={row.reason} data-tip-truncate>{row.reason}</span>
                        </td>
                        <td className="px-2.5 text-[11px] whitespace-nowrap">
                          <span className="block">{row.since ? dmy(row.since) : "-"}</span>
                          <span className="block text-[10px] text-muted-foreground">{dueLabel(row.days)}</span>
                        </td>
                        <td className="px-2.5 text-[11px] tabular-nums">{row.cycleNumber != null ? `#${row.cycleNumber}` : "-"}</td>
                        <td className="px-2.5">
                          {overview?.me.canEdit && !row.history ? (
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              className="flex max-w-[190px] items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] hover:bg-muted"
                              data-tip={row.remark ?? "Add a remark"}
                            >
                              <MessageSquarePlus className="size-3 shrink-0 text-muted-foreground" />
                              <span className="line-clamp-2">{row.remark || "Add remark"}</span>
                            </button>
                          ) : (
                            <span className="line-clamp-2 text-[11px] text-muted-foreground">{row.remark || "-"}</span>
                          )}
                        </td>
                        <td className="px-2.5">
                          <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold", STATUS_STYLE[row.status])}>
                            {ISSUE_STATUS_LABEL[row.status]}
                          </span>
                          {row.followUpDate && (
                            <span className="mt-0.5 block text-[10px] text-muted-foreground">Follow-up {dmy(row.followUpDate)}</span>
                          )}
                          {row.assignee && <span className="block truncate text-[10px] text-muted-foreground">{row.assignee}</span>}
                        </td>
                        <td className="px-2.5 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 px-2 text-[11px]"
                            onClick={() => openQuickView(row.facilityId, row.action, true)}
                          >
                            <Wrench className="size-3" /> {row.history ? "View" : "Fix"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-2 md:hidden">
              {filtered.map((row) => {
                const Icon = SEVERITY_ICON[row.severity];
                return (
                  <article key={row.id} className="rounded-xl border border-border/60 bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <FacilityCell
                        facility={{
                          _id: row.facilityId,
                          name: row.facilityName,
                          facilityType: row.facilityType,
                          block: row.block,
                          phc: row.phc,
                          ninNumber: row.nin,
                        }}
                        onOpen={() => openQuickView(row.facilityId, row.action, false)}
                        query={search}
                        compact
                        className="min-w-0 flex-1"
                      />
                      <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold", SEVERITY_STYLE[row.severity])}>
                        <Icon className="size-3" aria-hidden /> {ISSUE_SEVERITY_LABEL[row.severity]}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-snug">{row.reason}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="rounded-full border border-border/60 px-2 py-0.5">{CATEGORY_SHORT[row.category]}</span>
                      <span>{row.since ? dmy(row.since) : "-"}</span>
                      <span>{dueLabel(row.days)}</span>
                      <span className={cn("rounded-full border px-2 py-0.5 font-semibold", STATUS_STYLE[row.status])}>
                        {ISSUE_STATUS_LABEL[row.status]}
                      </span>
                    </div>
                    {row.remark && <p className="mt-2 rounded-lg bg-muted/50 px-2 py-1.5 text-[11px]">{row.remark}</p>}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 px-2 text-[11px]"
                        disabled={!overview?.me.canEdit || row.history}
                        onClick={() => openEdit(row)}
                      >
                        <MessageSquarePlus className="mr-1 size-3.5" /> {row.remark ? "Edit remark" : "Add remark"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 px-2 text-[11px]"
                        onClick={() => openQuickView(row.facilityId, row.action, true)}
                      >
                        <Wrench className="mr-1 size-3.5" /> {row.history ? "View" : "Fix"}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="hidden overflow-auto rounded-xl border border-border/60 bg-card md:block" style={{ maxHeight: "calc(100vh - 17rem)" }}>
              <table className="w-full min-w-[900px] border-collapse text-xs">
                <thead className="sticky top-0 z-20 bg-muted text-[11px] text-muted-foreground">
                  <tr>
                    <th scope="col" className="sticky left-0 z-30 min-w-[240px] border-r border-border/60 bg-muted px-2.5 py-2 text-left font-semibold">Facility</th>
                    <th scope="col" className="min-w-[340px] px-2.5 py-2 text-left font-semibold">Issues</th>
                    <th scope="col" className="min-w-[70px] px-2.5 py-2 text-right font-semibold">Count</th>
                    <th scope="col" className="min-w-[70px] px-2.5 py-2 text-right font-semibold">High</th>
                    <th scope="col" className="min-w-[110px] px-2.5 py-2 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {byFacility.map((group) => (
                    <tr key={group.facilityId} className="border-b border-border/40 align-top hover:bg-muted/25">
                      <td className="sticky left-0 z-10 border-r border-border/60 bg-card px-2.5 py-2.5">
                        <FacilityCell
                          facility={{
                            _id: group.facilityId,
                            name: group.name,
                            facilityType: group.type,
                            block: group.block,
                            phc: group.phc,
                            ninNumber: group.nin,
                          }}
                          query={search}
                          onOpen={() => openQuickView(group.facilityId, group.rows[0]?.action ?? "overview", false)}
                        />
                      </td>
                      <td className="px-2.5 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {group.rows.map((row) => (
                            <span
                              key={row.id}
                              data-tip={row.reason}
                              className={cn(
                                "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]",
                                SEVERITY_STYLE[row.severity],
                              )}
                            >
                              {ISSUE_CATEGORY_LABEL[row.category]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-2.5 py-2.5 text-right text-sm font-semibold tabular-nums">{group.rows.length}</td>
                      <td className="px-2.5 py-2.5 text-right text-sm font-semibold tabular-nums text-rose-700">{group.high || "-"}</td>
                      <td className="px-2.5 py-2.5 text-right">
                        <div className="flex justify-end gap-1">
                          {overview?.me.canEdit && (
                            <Button size="sm" variant="ghost" className="h-8 px-2 text-[11px]" onClick={() => openEdit(group.rows[0])}>
                              Remark
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 px-2 text-[11px]"
                            onClick={() => openQuickView(group.facilityId, group.rows[0]?.action ?? "overview", true)}
                          >
                            <Wrench className="size-3" /> Fix
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 md:hidden">
              {byFacility.map((group) => (
                <article key={group.facilityId} className="rounded-xl border border-border/60 bg-card p-3">
                  <FacilityCell
                    facility={{
                      _id: group.facilityId,
                      name: group.name,
                      facilityType: group.type,
                      block: group.block,
                      phc: group.phc,
                      ninNumber: group.nin,
                    }}
                    query={search}
                    onOpen={() => openQuickView(group.facilityId, group.rows[0]?.action ?? "overview", false)}
                  />
                  <div className="mt-2 flex flex-wrap gap-1">
                    {group.rows.map((row) => (
                      <span key={row.id} className={cn("rounded-full border px-2 py-0.5 text-[10px]", SEVERITY_STYLE[row.severity])}>
                        {ISSUE_CATEGORY_LABEL[row.category]}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {group.rows.length} issues · {group.high} High
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 h-9 w-full gap-1 text-[11px]"
                    onClick={() => openQuickView(group.facilityId, group.rows[0]?.action ?? "overview", true)}
                  >
                    <Wrench className="size-3.5" /> Fix in Quick View
                  </Button>
                </article>
              ))}
            </div>
          </>
        )}

        <p className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
          <CalendarClock className="size-3" />
          Dates DD-MMM-YYYY IST · blank is never 0 · counts come from the same rule registry as the bell and sidebar badge.
          {!overview?.me.canEdit && " You have read-only access."}
        </p>
      </div>

      {/* Mobile download bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 p-3 backdrop-blur md:hidden">
        <div className="flex gap-2">
          <Button className="h-11 flex-1" onClick={() => void runExport("excel")} disabled={busyExport !== null || filtered.length === 0}>
            <Download className="mr-1.5 size-4" /> Excel
          </Button>
          <Button variant="outline" className="h-11 flex-1" onClick={() => void runExport("pdf")} disabled={busyExport !== null || filtered.length === 0}>
            <FileText className="mr-1.5 size-4" /> PDF
          </Button>
        </div>
      </div>

      <Dialog open={!!editRow} onOpenChange={(open) => !open && setEditRow(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Follow up — {editRow?.facilityName}</DialogTitle>
            <DialogDescription className="line-clamp-2">{editRow?.reason}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label htmlFor="pending-remark" className="mb-1 block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Remark
              </label>
              <Textarea
                id="pending-remark"
                value={draft.remark}
                onChange={(event) => setDraft((current) => ({ ...current, remark: event.target.value }))}
                rows={3}
                maxLength={2000}
                placeholder="What has been done, and what happens next?"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Follow-up date
                </label>
                <DateInput
                  id="pending-follow-up"
                  label="Follow-up date"
                  value={draft.followUpDate}
                  onChange={(value) => setDraft((current) => ({ ...current, followUpDate: value }))}
                  today={today}
                />
              </div>
              <div>
                <label htmlFor="pending-assignee" className="mb-1 block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Assigned to
                </label>
                <Input
                  id="pending-assignee"
                  value={draft.assignee}
                  onChange={(event) => setDraft((current) => ({ ...current, assignee: event.target.value }))}
                  placeholder="Name or team"
                  maxLength={120}
                />
              </div>
            </div>
            <div>
              <label htmlFor="pending-status" className="mb-1 block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Status
              </label>
              <select
                id="pending-status"
                value={draft.status}
                onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as IssueStatus }))}
                className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                {ISSUE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {ISSUE_STATUS_LABEL[status]}
                    {status === "resolved" ? " (kept in history)" : ""}
                  </option>
                ))}
              </select>
            </div>
            {draft.status === "snoozed" && (
              <div className="grid gap-3 rounded-lg border border-violet-200 bg-violet-50/50 p-2 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Snooze until
                  </label>
                  <DateInput
                    id="pending-snooze"
                    label="Snooze until"
                    value={draft.snoozeUntil}
                    min={today}
                    onChange={(value) => setDraft((current) => ({ ...current, snoozeUntil: value }))}
                    today={today}
                  />
                </div>
                <div>
                  <label htmlFor="pending-snooze-reason" className="mb-1 block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Why snooze?
                  </label>
                  <Input
                    id="pending-snooze-reason"
                    value={draft.snoozeReason}
                    onChange={(event) => setDraft((current) => ({ ...current, snoozeReason: event.target.value }))}
                    placeholder="Waiting for the portal"
                    maxLength={300}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void saveFollowUp()} disabled={saving}>
              {saving ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
              Save follow-up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FacilityQuickView
        row={quickRow}
        open={!!quickRow}
        onOpenChange={(open) => {
          if (!open) setQuickView(null);
        }}
        labels={labels}
        canEdit={!!overview?.me.canEdit}
        initialSection={quickView?.section ?? "overview"}
        editRequest={
          quickView && quickRow && quickView.edit
            ? { token: quickView.token, facilityId: String(quickRow.facility._id) }
            : null
        }
        onSave={async (row, state) => {
          await updateTrackerRow(trackerUpdatePayload(row as never, state) as never);
          toast.success("Facility updated");
        }}
        settings={overview?.settings}
        userId={overview?.me.id}
        dataAsOf={dataAsOfIso ? Date.parse(`${dataAsOfIso}T00:00:00Z`) : null}
      />
    </AppShell>
  );
}
