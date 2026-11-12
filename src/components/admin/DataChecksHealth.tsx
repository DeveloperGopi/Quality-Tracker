/** Admin → Data checks, presented as one health page.
 *
 *  ONE query supplies the six tile counts. A card's list query mounts only
 *  when that card is open. Every fix uses the same safe flow: preview first
 *  ten changes → confirm → progress → result toast with Undo. */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery } from "convex/react";
import {
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Download,
  EyeOff,
  FileText,
  Loader2,
  RefreshCw,
  RotateCcw,
  ScanText,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { DataCheckTable, type DataCheckColumn } from "@/components/admin/DataCheckTable";
import {
  UniversalFilterBar,
  rowPasses,
  type BarValue,
  type FilterField,
} from "@/components/UniversalFilterBar";
import { LazyResultReadDialog } from "@/components/result/LazyResultReadDialog";
import { DateInput } from "@/components/DateInput";
import { useResultReaderEnabled } from "@/hooks/use-result-reader";
import type { DataCheckId } from "@/lib/dataCheckIssues";
import { cn } from "@/lib/utils";
import { exportExcel } from "@/lib/exportTable";
import { formatPercent, toDdMmmYyyy } from "@/lib/masterColumns";
import { todayLocalIso } from "@/lib/today";
import { visitFillText } from "@/lib/scheduleVisit";
import {
  buildSurveillancePlan,
  futureRows,
  scoreWillBeCleared,
  type SurveillanceAuditRow,
  type SurveillanceDecision,
} from "@/lib/surveillanceAudit";

type CheckId = DataCheckId;

type Assessment = "State" | "NQAS";

const CHECK_META: {
  id: CheckId;
  title: string;
  sentence: string;
  icon: typeof CalendarClock;
}[] = [
  {
    id: "surveillance",
    title: "Surveillance dates",
    sentence:
      "Done dates later than today, or copied from the due date, cannot be real visits.",
    icon: CalendarClock,
  },
  {
    id: "visitDates",
    title: "Completed assessments missing visit dates",
    sentence:
      "Completed State or NQAS assessments without actual visit dates can be filled from a past schedule.",
    icon: CalendarClock,
  },
  {
    id: "documentNames",
    title: "Document display names",
    sentence:
      "These document names do not follow the human naming rule yet. Google Drive files are never renamed.",
    icon: FileText,
  },
  {
    id: "resultDeclared",
    title: "Result Declared backfill",
    sentence:
      "A certified, conditional or deferred result should show “Result Declared” in SaQsham Documents Status.",
    icon: ShieldCheck,
  },
  {
    id: "assessorNames",
    title: "Assessor names",
    sentence:
      "These assessor names end in a designation and can be split into a name and a designation.",
    icon: UserRoundCheck,
  },
  {
    id: "annexure",
    title: "Annexure scores not read",
    sentence:
      "These certified cycles have an NQAS Result file but no Annexure I scores yet.",
    icon: ScanText,
  },
];

const emptyRows: never[] = [];

type IgnoredIssue = {
  _id: string;
  check: CheckId;
  issueKey: string;
  label: string;
  detail: string | null;
  ignoredByName: string;
  ignoredAt: number;
};

type IgnoreInput = { issueKey: string; label: string; detail?: string };

type IgnoreContextValue = {
  records: IgnoredIssue[];
  keys: Record<CheckId, Set<string>>;
  ignore: (check: CheckId, rows: IgnoreInput[]) => Promise<void>;
  restore: (ids: string[]) => Promise<void>;
};

const IgnoreContext = createContext<IgnoreContextValue | null>(null);

function useIssueIgnores(check: CheckId) {
  const ctx = useContext(IgnoreContext);
  if (!ctx) throw new Error("Data-check ignore context is missing");
  const keys = ctx.keys[check];
  return {
    keys,
    count: ctx.records.filter((row) => row.check === check).length,
    ignore: (rows: IgnoreInput[]) => ctx.ignore(check, rows),
  };
}

function dateText(iso: string | null | undefined): string {
  const text = toDdMmmYyyy(iso);
  return text || "-";
}

function dateRange(start: string | null | undefined, end: string | null | undefined): string {
  const a = dateText(start);
  const b = dateText(end);
  return a === b ? a : `${a} → ${b}`;
}

function cycleText(value: number | null | undefined): string {
  return value == null ? "-" : `#${value}`;
}

function scoreText(value: number | null | undefined): string {
  return value == null ? "-" : formatPercent(value);
}

/** DD-MMM-YYYY HH:mm in IST, independent of the browser time zone. */
function istStamp(ts: number): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(ts));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")}-${get("month")}-${get("year")} ${get("hour")}:${get("minute")} IST`;
}

/* -------------------------------------------------------------------------- */
/* Selection + filtering                                                       */
/* -------------------------------------------------------------------------- */

function useSelection(keys: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const booted = useRef(false);
  useEffect(() => {
    if (!booted.current && keys.length > 0) {
      setSelected(new Set(keys));
      booted.current = true;
    }
  }, [keys]);
  return [selected, setSelected] as const;
}

function useCheckFilters<T>(
  pageKey: string,
  rows: T[],
  blockOf: (row: T) => string,
  assessmentOf: (row: T) => Assessment | null,
  searchOf: (row: T) => string,
  facilityTypeOf: (row: T) => string | null | undefined = () => null,
) {
  const blocks = useMemo(
    () => [...new Set(rows.map(blockOf).filter(Boolean))].sort(),
    [rows, blockOf],
  );
  const assessments = useMemo(
    () =>
      [...new Set(rows.map(assessmentOf).filter((v): v is Assessment => v != null))].sort(),
    [rows, assessmentOf],
  );
  const facilityTypes = useMemo(
    () =>
      [...new Set(rows.map(facilityTypeOf).filter((v): v is string => !!v && v.trim() !== ""))].sort(),
    [rows, facilityTypeOf],
  );
  const fields = useMemo<FilterField[]>(
    () => [
      {
        key: "block",
        label: "Block",
        type: "select",
        onThisPage: true,
        options: blocks.map((value) => ({ value })),
      },
      {
        key: "assessment",
        label: "Assessment",
        type: "select",
        onThisPage: true,
        options: assessments.map((value) => ({ value })),
      },
      {
        key: "facilityType",
        label: "Facility type",
        type: "select",
        onThisPage: true,
        options: facilityTypes.map((value) => ({ value })),
      },
      { key: "search", label: "Search", type: "text" },
    ],
    [blocks, assessments, facilityTypes],
  );
  const [bar, setBar] = useState<BarValue>(() => ({
    barKeys: ["block", "assessment", "facilityType", "search"],
    filters: [],
    match: "all",
  }));
  const valueOf = useCallback(
    (row: T, key: string): unknown => {
      if (key === "block") return blockOf(row);
      if (key === "assessment") return assessmentOf(row) ?? "";
      if (key === "facilityType") return facilityTypeOf(row) ?? "";
      if (key === "search") return searchOf(row);
      return "";
    },
    [blockOf, assessmentOf, facilityTypeOf, searchOf],
  );
  const filtered = useMemo(
    () => rows.filter((row) => rowPasses(bar.filters, bar.match, (key) => valueOf(row, key))),
    [rows, bar, valueOf],
  );
  return {
    pageKey,
    fields,
    bar,
    setBar,
    blocks,
    assessments,
    facilityTypes,
    filtered,
    total: rows.length,
  };
}

function CheckFilters({
  filters,
}: {
  filters: {
    pageKey: string;
    fields: FilterField[];
    bar: BarValue;
    setBar: (value: BarValue) => void;
    filtered: unknown[];
    total: number;
  };
}) {
  return (
    <UniversalFilterBar
      pageKey={filters.pageKey}
      fields={filters.fields}
      value={filters.bar}
      onChange={filters.setBar}
      summary={`Showing ${filters.filtered.length} of ${filters.total}`}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Shared card, action bar and preview                                         */
/* -------------------------------------------------------------------------- */

function CheckCard({
  id,
  title,
  sentence,
  count,
  ignoredCount = 0,
  open,
  onToggle,
  children,
}: {
  id: CheckId;
  title: string;
  sentence: string;
  count: number;
  ignoredCount?: number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const Icon = CHECK_META.find((m) => m.id === id)?.icon ?? ShieldCheck;
  return (
    <section
      id={`data-check-${id}`}
      data-testid={`data-check-${id}`}
      className="scroll-mt-36 rounded-xl border border-border/60 bg-background/70"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{title}</span>
            {count > 0 ? (
              <span className="rounded-full border border-amber-300/70 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                {count} to fix
              </span>
            ) : (
              <span className="rounded-full border border-emerald-300/70 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">
                All clear
              </span>
            )}
            {ignoredCount > 0 && (
              <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {ignoredCount} ignored
              </span>
            )}
          </span>
          {count > 0 ? (
            <span className="mt-0.5 block text-xs text-muted-foreground">{sentence}</span>
          ) : null}
        </span>
        {open ? (
          <ChevronDown className="mt-1 size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open ? <div className="border-t border-border/60 p-4">{children}</div> : null}
    </section>
  );
}

function CheckActionBar({
  shown,
  selected,
  actionLabel,
  onAction,
  disabledReason,
  busy,
  progress,
  onUndo,
  undoBusy,
  onExport,
  onIgnoreSelected,
}: {
  shown: number;
  selected: number;
  actionLabel: string;
  onAction: () => void;
  disabledReason?: string;
  busy?: boolean;
  progress?: number;
  onUndo?: () => void;
  undoBusy?: boolean;
  onExport?: () => void;
  onIgnoreSelected?: () => void;
}) {
  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {shown} shown · <span className="font-semibold text-foreground">{selected} selected</span>
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {onIgnoreSelected && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={onIgnoreSelected}
              disabled={busy || selected === 0}
            >
              <EyeOff className="size-3.5" /> Ignore selected ({selected})
            </Button>
          )}
          {onExport && (
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={onExport}>
              <Download className="size-3.5" /> Export to Excel
            </Button>
          )}
          {onUndo && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={onUndo}
              disabled={undoBusy}
            >
              {undoBusy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RotateCcw className="size-3.5" />
              )}
              Undo
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            className="h-8"
            onClick={onAction}
            disabled={busy || Boolean(disabledReason) || selected === 0}
          >
            {busy ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
            {actionLabel}
          </Button>
        </div>
      </div>
      {busy && (
        <div className="flex items-center gap-2">
          <Progress value={progress ?? 15} className="h-1.5" />
          <span className="shrink-0 text-[11px] text-muted-foreground">Applying…</span>
        </div>
      )}
      {!busy && disabledReason && (
        <p className="text-[11px] text-muted-foreground" role="status">
          {disabledReason}
        </p>
      )}
    </div>
  );
}

type PreviewChange = {
  key: string;
  facility: string;
  before: string;
  after: string;
};

function BulkPreviewDialog({
  open,
  onOpenChange,
  title,
  description,
  changes,
  total,
  busy,
  progress,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  changes: PreviewChange[];
  total: number;
  busy: boolean;
  progress: number;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => (!busy ? onOpenChange(next) : undefined)}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-border/60">
          <div className="grid grid-cols-[minmax(10rem,1fr)_minmax(12rem,1.4fr)] gap-2 border-b border-border bg-card px-3 py-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            <span>Facility</span>
            <span>Before → after</span>
          </div>
          {changes.slice(0, 10).map((change) => (
            <div
              key={change.key}
              className="grid grid-cols-[minmax(10rem,1fr)_minmax(12rem,1.4fr)] gap-2 border-b border-border/40 px-3 py-2 text-xs last:border-0"
            >
              <span className="truncate font-medium" data-tip={change.facility} data-tip-truncate>
                {change.facility}
              </span>
              <span className="min-w-0 text-muted-foreground">
                <span className="line-through">{change.before}</span>
                <span className="px-1.5 text-foreground" aria-hidden>
                  →
                </span>
                <span className="font-medium text-foreground">{change.after}</span>
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Showing {Math.min(10, changes.length)} of {total} change{total === 1 ? "" : "s"}. Nothing
          is saved until you confirm.
        </p>
        {busy && (
          <div className="flex items-center gap-2">
            <Progress value={progress} className="h-1.5" />
            <span className="shrink-0 text-[11px] text-muted-foreground">Applying…</span>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={busy || total === 0}>
            {busy ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
            Confirm {total} change{total === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. Surveillance dates                                                       */
/* -------------------------------------------------------------------------- */

type SurveillanceRow = SurveillanceAuditRow;

const surveillanceKey = (row: SurveillanceRow) => `${row.naId}|${row.field}`;

function SurveillanceCard() {
  const rows = useQuery(api.facilities.surveillanceDateAudit, {}) as
    | SurveillanceRow[]
    | undefined;
  const apply = useMutation(api.facilities.applySurveillanceDateFixes);
  const undo = useMutation(api.facilities.undoSurveillanceDateFixes);
  const today = todayLocalIso();
  const [decisions, setDecisions] = useState<Record<string, SurveillanceDecision>>({});
  const [preview, setPreview] = useState(false);
  const [batch, setBatch] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [undoBusy, setUndoBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const ignores = useIssueIgnores("surveillance");
  const list = useMemo(
    () =>
      (rows ?? emptyRows).filter(
        (row) => !ignores.keys.has(surveillanceKey(row)),
      ),
    [rows, ignores.keys],
  );
  const tableRows = useMemo<SurveillanceRow[]>(
    () =>
      list.map((row) => ({
        ...row,
        assessment: "NQAS" as Assessment,
      })),
    [list],
  );
  const filters = useCheckFilters(
    "data-check-surveillance",
    tableRows,
    (row) => row.block,
    () => "NQAS",
    (row) => `${row.facilityName} ${row.block} ${row.label}`,
    (row) => row.facilityType,
  );
  const [selected, setSelected] = useSelection(tableRows.map(surveillanceKey));
  const selectedRows = filters.filtered.filter((row) => selected.has(surveillanceKey(row)));

  const decisionFor = (row: SurveillanceRow): SurveillanceDecision =>
    decisions[surveillanceKey(row)] ?? { naId: row.naId, field: row.field, action: "keep" };
  const setDecision = (row: SurveillanceRow, patch: Partial<SurveillanceDecision>) => {
    setDecisions((current) => ({
      ...current,
      [surveillanceKey(row)]: { ...decisionFor(row), ...patch },
    }));
  };

  const plan = useMemo(
    () => buildSurveillancePlan(filters.filtered, Object.values(decisions), today),
    [filters.filtered, decisions, today],
  );
  const changes = plan.changes.filter((change) => selected.has(surveillanceKey(change.row)));
  const changeTotal = changes.length;

  const clearFuture = () => {
    const future = futureRows(filters.filtered);
    const next = { ...decisions };
    const nextSelected = new Set(selected);
    for (const row of future) {
      next[surveillanceKey(row)] = {
        naId: row.naId,
        field: row.field,
        action: "clear",
      };
      nextSelected.add(surveillanceKey(row));
    }
    setDecisions(next);
    setSelected(nextSelected);
    setPreview(true);
  };

  const previewChanges: PreviewChange[] = changes.map((change) => ({
    key: surveillanceKey(change.row),
    facility: `${change.row.facilityName} · ${change.row.label}`,
    before: `${dateText(change.row.done)}${change.clearsScore ? " · score cleared" : ""}`,
    after:
      change.action === "clear"
        ? "Cleared"
        : `Set ${dateText(change.newDate)}${change.clearsScore ? " · score cleared" : ""}`,
  }));

  const undoBatch = async (batchId: string) => {
    setUndoBusy(true);
    try {
      const result = await undo({ batchId });
      toast.success(`Undone — ${result.restored} value${result.restored === 1 ? "" : "s"} restored`, {
        description: result.skipped
          ? `${result.skipped} row${result.skipped === 1 ? "" : "s"} changed again since, so kept as is.`
          : "The previous surveillance dates are back.",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not undo this batch");
    } finally {
      setUndoBusy(false);
    }
  };

  const applyChanges = async () => {
    if (changes.length === 0) return;
    setBusy(true);
    setProgress(20);
    try {
      const result = await apply({
        entries: changes.map((change) => ({
          naId: change.naId as never,
          field: change.field,
          action: change.action,
          newDate: change.newDate,
        })),
        reason: "Data checks · Surveillance dates",
      });
      setProgress(100);
      setBatch(result.batchId);
      setPreview(false);
      setDecisions({});
      toast.success(
        `Updated ${result.cleared + result.set} surveillance date${
          result.cleared + result.set === 1 ? "" : "s"
        }`,
        {
          description: `${result.cleared} cleared · ${result.set} set${
            result.scoresCleared ? ` · ${result.scoresCleared} score(s) cleared` : ""
          } · audited`,
          duration: 15000,
          action: { label: "Undo", onClick: () => void undoBatch(result.batchId) },
        },
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not apply the dates");
    } finally {
      setBusy(false);
      window.setTimeout(() => setProgress(0), 600);
    }
  };

  const columns: DataCheckColumn<SurveillanceRow>[] = [
    {
      key: "facility",
      label: "Facility",
      width: "minmax(13rem,1.5fr)",
      render: (row) => (
        <span className="min-w-0 truncate font-medium" data-tip={row.facilityName} data-tip-truncate>
          {row.facilityName}
        </span>
      ),
    },
    {
      key: "block",
      label: "Block",
      width: "minmax(7rem,0.8fr)",
      render: (row) => <span className="truncate">{row.block || "-"}</span>,
    },
    {
      key: "facilityType",
      label: "Facility Type",
      width: "7.5rem",
      render: (row) => <span className="truncate">{row.facilityType || "-"}</span>,
    },
    {
      key: "cycle",
      label: "Cycle",
      width: "4.5rem",
      render: (row) => <span className="tabular-nums">{cycleText(row.cycleNumber)}</span>,
    },
    {
      key: "check",
      label: "Check",
      width: "minmax(11rem,1.2fr)",
      render: (row) => (
        <span className="truncate" data-tip={row.reason} data-tip-truncate>
          {row.label}
        </span>
      ),
    },
    {
      key: "due",
      label: "Due date",
      width: "7rem",
      render: (row) => <span className="tabular-nums">{dateText(row.due)}</span>,
    },
    {
      key: "done",
      label: "Done date",
      width: "7rem",
      render: (row) => <span className="tabular-nums">{dateText(row.done)}</span>,
    },
    {
      key: "score",
      label: "Score",
      width: "5rem",
      align: "right",
      render: (row) => <span className="tabular-nums">{scoreText(row.score)}</span>,
    },
    {
      key: "willSet",
      label: "Will set",
      width: "minmax(9rem,1fr)",
      render: (row) => {
        const decision = decisionFor(row);
        return (
          <span className="truncate text-muted-foreground">
            {decision.action === "keep"
              ? "No change"
              : decision.action === "clear"
                ? `Clear${scoreWillBeCleared(row) ? " · score too" : ""}`
                : dateText(decision.newDate)}
          </span>
        );
      },
    },
    {
      key: "decision",
      label: "Decision",
      width: "minmax(16rem,1.5fr)",
      render: (row) => {
        const decision = decisionFor(row);
        return (
          <span className="flex min-w-0 flex-wrap items-center gap-1">
            {(["keep", "clear", "set"] as const).map((action) => (
              <button
                key={action}
                type="button"
                aria-pressed={decision.action === action}
                onClick={(event) => {
                  event.stopPropagation();
                  setDecision(row, {
                    action,
                    newDate: action === "set" ? decision.newDate ?? today : decision.newDate,
                  });
                }}
                className={cn(
                  "rounded border px-1.5 py-0.5 text-[10px] font-medium",
                  decision.action === action
                    ? "border-primary bg-primary/10"
                    : "border-border/70 text-muted-foreground hover:bg-muted",
                )}
              >
                {action === "keep" ? "Keep" : action === "clear" ? "Clear" : "Set"}
              </button>
            ))}
            {decision.action === "set" && (
              <span onClick={(event) => event.stopPropagation()}>
                <DateInput
                  id={`surv-${row.naId}-${row.field}`}
                  label={`New done date for ${row.facilityName}`}
                  value={decision.newDate ?? ""}
                  onChange={(iso) => setDecision(row, { newDate: iso })}
                  max={today}
                  today={today}
                  compact
                  hideChange
                  className="w-28 text-xs"
                />
              </span>
            )}
          </span>
        );
      },
    },
  ];

  const doExport = () => {
    void exportExcel(
      "data-check-surveillance-dates.xlsx",
      "Surveillance dates",
      ["Facility", "Block", "Cycle", "Check", "Due date", "Done date", "Score", "Reason", "Will set"],
      filters.filtered.map((row) => {
        const decision = decisionFor(row);
        return [
          row.facilityName,
          row.block,
          cycleText(row.cycleNumber),
          row.label,
          dateText(row.due),
          dateText(row.done),
          scoreText(row.score),
          row.reason,
          decision.action === "keep"
            ? "No change"
            : decision.action === "clear"
              ? "Clear"
              : dateText(decision.newDate),
        ];
      }),
      { title: "Data checks — Surveillance dates", subtitle: `${filters.filtered.length} rows` },
    ).catch((error) => toast.error(error instanceof Error ? error.message : "Export failed"));
  };

  if (rows === undefined) {
    return <DataCheckTable rows={[]} columns={columns} rowKey={surveillanceKey} selected={selected} onSelectedChange={setSelected} empty="No rows yet." loading label="Surveillance dates" />;
  }

  return (
    <>
      <CheckFilters filters={filters} />
      <div className="mt-2">
        <DataCheckTable
          rows={filters.filtered}
          columns={columns}
          rowKey={surveillanceKey}
          selected={selected}
          onSelectedChange={setSelected}
          empty="No surveillance date needs confirmation."
          label="Surveillance dates"
          minWidth={1180}
          onIgnore={(row) =>
            void ignores
              .ignore([
                {
                  issueKey: surveillanceKey(row),
                  label: row.facilityName,
                  detail: row.label,
                },
              ])
              .then(() =>
                setSelected((current) => {
                  const next = new Set(current);
                  next.delete(surveillanceKey(row));
                  return next;
                }),
              )
          }
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={clearFuture}
          disabled={futureRows(filters.filtered).length === 0 || busy}
          data-tip={futureRows(filters.filtered).length === 0 ? "No future date in this list" : undefined}
        >
          Clear all future dates ({futureRows(filters.filtered).length})
        </Button>
        {futureRows(filters.filtered).length === 0 && (
          <span className="text-[11px] text-muted-foreground">No future date in this list.</span>
        )}
      </div>
      <CheckActionBar
        shown={filters.filtered.length}
        selected={selectedRows.length}
        actionLabel={`Preview & apply (${changeTotal})`}
        onAction={() => setPreview(true)}
        disabledReason={
          changeTotal === 0
            ? "Choose Clear or Set on at least one selected row. Nothing is applied yet."
            : undefined
        }
        busy={busy}
        progress={progress}
        onUndo={batch ? () => void undoBatch(batch) : undefined}
        undoBusy={undoBusy}
        onExport={doExport}
        onIgnoreSelected={
          selectedRows.length
            ? () =>
                void ignores
                  .ignore(
                    selectedRows.map((row) => ({
                      issueKey: surveillanceKey(row),
                      label: row.facilityName,
                      detail: row.label,
                    })),
                  )
                  .then(() => setSelected(new Set()))
            : undefined
        }
      />
      <BulkPreviewDialog
        open={preview}
        onOpenChange={setPreview}
        title="Preview surveillance date changes"
        description="The plan below is not saved yet. Confirm to apply it in one audited batch."
        changes={previewChanges}
        total={changeTotal}
        busy={busy}
        progress={progress}
        onConfirm={() => void applyChanges()}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Completed assessments missing visit dates                                */
/* -------------------------------------------------------------------------- */

type VisitRow = {
  key: string;
  id: string;
  kind: "sa" | "nqas";
  facility: string;
  block: string;
  facilityType: string | null;
  cycleNumber: number | null;
  scheduled: string;
  actualStart: string | null;
  actualEnd: string | null;
  fillStart: string;
  fillEnd: string;
  setStart: boolean;
  setEnd: boolean;
  needsDecision: boolean;
  decisionReason: string | null;
};

function visitWillSet(row: VisitRow): string {
  return visitFillText({
    fillStart: row.fillStart,
    fillEnd: row.fillEnd,
    setStart: row.setStart,
    setEnd: row.setEnd,
    needsDecision: row.needsDecision,
    reason: row.decisionReason,
    actualEnd: row.actualEnd,
  });
}

function VisitDatesCard() {
  const rows = useQuery(api.dataChecks.visitDatesPreview, {}) as VisitRow[] | undefined;
  const fill = useMutation(api.dataChecks.fillVisitDates);
  const undo = useMutation(api.dataChecks.undoVisitDates);
  const ignores = useIssueIgnores("visitDates");
  const list = useMemo(
    () => (rows ?? emptyRows).filter((row) => !ignores.keys.has(row.key)),
    [rows, ignores.keys],
  );
  const filters = useCheckFilters(
    "data-check-visit-dates",
    list,
    (row) => row.block,
    (row) => (row.kind === "sa" ? "State" : "NQAS"),
    (row) => `${row.facility} ${row.block} ${row.kind === "sa" ? "State" : "NQAS"}`,
    (row) => row.facilityType,
  );
  const [selected, setSelected] = useSelection(list.map((row) => row.key));
  const selectedRows = filters.filtered.filter(
    (row) => selected.has(row.key) && !row.needsDecision,
  );
  const [preview, setPreview] = useState(false);
  const [batch, setBatch] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [undoBusy, setUndoBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const undoBatch = async (batchId: string) => {
    setUndoBusy(true);
    try {
      const result = await undo({ batchId });
      toast.success(`Undone — ${result.restored} assessment${result.restored === 1 ? "" : "s"} restored`, {
        description: result.skipped ? `${result.skipped} row(s) changed again since.` : "Old visit dates are back.",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not undo this batch");
    } finally {
      setUndoBusy(false);
    }
  };

  const apply = async () => {
    if (selectedRows.length === 0) return;
    setBusy(true);
    setProgress(25);
    try {
      const result = await fill({ keys: selectedRows.map((row) => row.key) });
      setProgress(100);
      setBatch(result.batchId);
      setPreview(false);
      toast.success(`Filled ${result.updated} assessment${result.updated === 1 ? "" : "s"}`, {
        description: "Audited as “auto from schedule”.",
        duration: 15000,
        action: { label: "Undo", onClick: () => void undoBatch(result.batchId) },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not fill the visit dates");
    } finally {
      setBusy(false);
      window.setTimeout(() => setProgress(0), 600);
    }
  };

  const columns: DataCheckColumn<VisitRow>[] = [
    {
      key: "facility",
      label: "Facility",
      width: "minmax(13rem,1.5fr)",
      render: (row) => <span className="truncate font-medium" data-tip={row.facility} data-tip-truncate>{row.facility}</span>,
    },
    {
      key: "block",
      label: "Block",
      width: "minmax(7rem,0.8fr)",
      render: (row) => <span className="truncate">{row.block || "-"}</span>,
    },
    {
      key: "facilityType",
      label: "Facility Type",
      width: "8.5rem",
      render: (row) => (
        <span className="inline-flex max-w-full truncate rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-medium">
          {row.facilityType || "-"}
        </span>
      ),
    },
    {
      key: "cycle",
      label: "Cycle",
      width: "4.5rem",
      render: (row) => <span className="tabular-nums">{cycleText(row.cycleNumber)}</span>,
    },
    {
      key: "assessment",
      label: "Assessment",
      width: "7rem",
      render: (row) => <span>{row.kind === "sa" ? "State" : "NQAS"}</span>,
    },
    {
      key: "scheduled",
      label: "Scheduled",
      width: "7rem",
      render: (row) => <span className="tabular-nums">{dateText(row.scheduled)}</span>,
    },
    {
      key: "actual",
      label: "Actual start → end",
      width: "minmax(10rem,1fr)",
      render: (row) => (
        <span className="truncate tabular-nums">
          {row.actualStart || row.actualEnd ? dateRange(row.actualStart, row.actualEnd) : "-"}
        </span>
      ),
    },
    {
      key: "willSet",
      label: "Will set",
      width: "minmax(15rem,1.4fr)",
      render: (row) => <span className="truncate">{visitWillSet(row)}</span>,
    },
  ];

  const previewChanges: PreviewChange[] = selectedRows.map((row) => ({
    key: row.key,
    facility: `${row.facility} · ${row.kind === "sa" ? "State" : "NQAS"} · ${cycleText(row.cycleNumber)}`,
    before: row.actualStart || row.actualEnd ? dateRange(row.actualStart, row.actualEnd) : "Missing actual dates",
    after: visitWillSet(row),
  }));

  const doExport = () => {
    void exportExcel(
      "data-check-visit-dates.xlsx",
      "Visit dates",
      ["Facility", "Block", "Facility Type", "Cycle", "Assessment", "Scheduled", "Actual start → end", "Will set"],
      filters.filtered.map((row) => [
        row.facility,
        row.block,
        row.facilityType || "-",
        cycleText(row.cycleNumber),
        row.kind === "sa" ? "State" : "NQAS",
        dateText(row.scheduled),
        row.actualStart || row.actualEnd ? dateRange(row.actualStart, row.actualEnd) : "-",
        visitWillSet(row),
      ]),
      { title: "Data checks — Completed assessments missing visit dates", subtitle: `${filters.filtered.length} rows` },
    ).catch((error) => toast.error(error instanceof Error ? error.message : "Export failed"));
  };

  return (
    <>
      <CheckFilters filters={filters} />
      <div className="mt-2">
        <DataCheckTable
          rows={filters.filtered}
          columns={columns}
          rowKey={(row) => row.key}
          selected={selected}
          onSelectedChange={setSelected}
          empty="No completed assessment is missing visit dates."
          loading={rows === undefined}
          label="Completed assessments missing visit dates"
          minWidth={980}
          onIgnore={(row) =>
            void ignores
              .ignore([
                {
                  issueKey: row.key,
                  label: row.facility,
                  detail: `${row.kind === "sa" ? "State" : "NQAS"} · ${cycleText(row.cycleNumber)}`,
                },
              ])
              .then(() =>
                setSelected((current) => {
                  const next = new Set(current);
                  next.delete(row.key);
                  return next;
                }),
              )
          }
        />
      </div>
      <CheckActionBar
        shown={filters.filtered.length}
        selected={selectedRows.length}
        actionLabel={`Preview & apply (${selectedRows.length})`}
        onAction={() => setPreview(true)}
        disabledReason={
          selectedRows.length === 0 ? "Select at least one row to fill its visit dates." : undefined
        }
        busy={busy}
        progress={progress}
        onUndo={batch ? () => void undoBatch(batch) : undefined}
        undoBusy={undoBusy}
        onExport={doExport}
        onIgnoreSelected={
          selectedRows.length
            ? () =>
                void ignores
                  .ignore(
                    selectedRows.map((row) => ({
                      issueKey: row.key,
                      label: row.facility,
                      detail: `${row.kind === "sa" ? "State" : "NQAS"} · ${cycleText(row.cycleNumber)}`,
                    })),
                  )
                  .then(() => setSelected(new Set()))
            : undefined
        }
      />
      <BulkPreviewDialog
        open={preview}
        onOpenChange={setPreview}
        title="Preview visit-date fill"
        description="Existing dates are never changed. Confirm to fill the empty actual dates."
        changes={previewChanges}
        total={previewChanges.length}
        busy={busy}
        progress={progress}
        onConfirm={() => void apply()}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Document display names                                                   */
/* -------------------------------------------------------------------------- */

type DocNameRow = {
  id: string;
  facilityId: string;
  facility: string;
  block: string;
  facilityType: string | null;
  cycleNumber: number | null;
  before: string;
  after: string;
  unknown: string | null;
};

function DocumentNamesCard() {
  const rows = useQuery(api.documentNames.preview, {}) as DocNameRow[] | undefined;
  const apply = useMutation(api.documentNames.apply);
  const undo = useMutation(api.documentNames.undo);
  const ignores = useIssueIgnores("documentNames");
  const list = useMemo(
    () => (rows ?? emptyRows).filter((row) => !ignores.keys.has(row.id)),
    [rows, ignores.keys],
  );
  const filters = useCheckFilters(
    "data-check-document-names",
    list,
    (row) => row.block,
    () => null,
    (row) => `${row.facility} ${row.block} ${row.before} ${row.after}`,
    (row) => row.facilityType,
  );
  const [selected, setSelected] = useSelection(list.map((row) => row.id));
  const selectedRows = filters.filtered.filter(
    (row) => !row.unknown && selected.has(row.id),
  );
  const [preview, setPreview] = useState(false);
  const [batch, setBatch] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [undoBusy, setUndoBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const undoBatch = async (batchId: string) => {
    setUndoBusy(true);
    try {
      const result = await undo({ batchId });
      toast.success(`Undone — ${result.restored} document name${result.restored === 1 ? "" : "s"} restored`, {
        description: result.skipped ? `${result.skipped} row(s) changed again since.` : "Document Library names are back.",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not undo this batch");
    } finally {
      setUndoBusy(false);
    }
  };

  const doApply = async () => {
    if (selectedRows.length === 0) return;
    setBusy(true);
    setProgress(25);
    try {
      const result = await apply({ ids: selectedRows.map((row) => row.id) as never });
      setProgress(100);
      setBatch(result.batchId);
      setPreview(false);
      toast.success(`Renamed ${result.updated} document${result.updated === 1 ? "" : "s"}`, {
        description: "Display names updated; Drive files were not renamed.",
        duration: 15000,
        action: { label: "Undo", onClick: () => void undoBatch(result.batchId) },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not rename the documents");
    } finally {
      setBusy(false);
      window.setTimeout(() => setProgress(0), 600);
    }
  };

  const columns: DataCheckColumn<DocNameRow>[] = [
    {
      key: "facility",
      label: "Facility",
      width: "minmax(13rem,1.4fr)",
      render: (row) => <span className="truncate font-medium" data-tip={row.facility} data-tip-truncate>{row.facility}</span>,
    },
    {
      key: "block",
      label: "Block",
      width: "minmax(7rem,0.8fr)",
      render: (row) => <span className="truncate">{row.block || "-"}</span>,
    },
    {
      key: "facilityType",
      label: "Facility Type",
      width: "7.5rem",
      render: (row) => <span className="truncate">{row.facilityType || "-"}</span>,
    },
    {
      key: "cycle",
      label: "Cycle",
      width: "4.5rem",
      render: (row) => <span className="tabular-nums">{cycleText(row.cycleNumber)}</span>,
    },
    {
      key: "before",
      label: "Current",
      width: "minmax(14rem,1.3fr)",
      render: (row) => <span className="truncate text-muted-foreground" data-tip={row.before} data-tip-truncate>{row.before}</span>,
    },
    {
      key: "after",
      label: "Will set",
      width: "minmax(16rem,1.5fr)",
      render: (row) => <span className="truncate" data-tip={row.after} data-tip-truncate>{row.after}</span>,
    },
    {
      key: "issue",
      label: "Issue",
      width: "minmax(10rem,1fr)",
      render: (row) => (
        <span className={cn("truncate", row.unknown ? "text-amber-700" : "text-muted-foreground")}>
          {row.unknown ?? "-"}
        </span>
      ),
    },
  ];

  const previewChanges: PreviewChange[] = selectedRows.map((row) => ({
    key: row.id,
    facility: `${row.facility} · Cycle ${row.cycleNumber}`,
    before: row.before,
    after: row.after,
  }));

  const doExport = () => {
    void exportExcel(
      "data-check-document-names.xlsx",
      "Document names",
      ["Facility", "Block", "Cycle", "Current", "Will set", "Issue"],
      filters.filtered.map((row) => [
        row.facility,
        row.block,
        cycleText(row.cycleNumber),
        row.before,
        row.after,
        row.unknown ?? "-",
      ]),
      { title: "Data checks — Document display names", subtitle: `${filters.filtered.length} rows` },
    ).catch((error) => toast.error(error instanceof Error ? error.message : "Export failed"));
  };

  return (
    <>
      <CheckFilters filters={filters} />
      <div className="mt-2">
        <DataCheckTable
          rows={filters.filtered}
          columns={columns}
          rowKey={(row) => row.id}
          selected={selected}
          onSelectedChange={setSelected}
          empty="Every document already uses its human name."
          loading={rows === undefined}
          label="Document display names"
          minWidth={1080}
          onIgnore={(row) =>
            void ignores
              .ignore([
                {
                  issueKey: row.id,
                  label: row.facility,
                  detail: `${row.before} → ${row.after}`,
                },
              ])
              .then(() =>
                setSelected((current) => {
                  const next = new Set(current);
                  next.delete(row.id);
                  return next;
                }),
              )
          }
        />
      </div>
      <CheckActionBar
        shown={filters.filtered.length}
        selected={selectedRows.length}
        actionLabel={`Preview & rename (${selectedRows.length})`}
        onAction={() => setPreview(true)}
        disabledReason={
          selectedRows.length === 0 ? "Select at least one document with no issue." : undefined
        }
        busy={busy}
        progress={progress}
        onUndo={batch ? () => void undoBatch(batch) : undefined}
        undoBusy={undoBusy}
        onExport={doExport}
        onIgnoreSelected={
          selectedRows.length
            ? () =>
                void ignores
                  .ignore(
                    selectedRows.map((row) => ({
                      issueKey: row.id,
                      label: row.facility,
                      detail: `${row.before} → ${row.after}`,
                    })),
                  )
                  .then(() => setSelected(new Set()))
            : undefined
        }
      />
      <BulkPreviewDialog
        open={preview}
        onOpenChange={setPreview}
        title="Preview document display names"
        description="Only the app display name changes. Google Drive files and originals stay untouched."
        changes={previewChanges}
        total={previewChanges.length}
        busy={busy}
        progress={progress}
        onConfirm={() => void doApply()}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Result Declared backfill                                                 */
/* -------------------------------------------------------------------------- */

type ResultRow = {
  saId: string;
  naId: string;
  facilityId: string;
  facility: string;
  block: string;
  facilityType: string | null;
  cycleNumber: number | null;
  certificationStatus: string;
  current: string | null;
  auto: boolean;
};

function ResultDeclaredCard() {
  const rows = useQuery(api.dataChecks.resultDeclaredAudit, {}) as ResultRow[] | undefined;
  const apply = useMutation(api.dataChecks.applyResultDeclared);
  const undo = useMutation(api.dataChecks.undoResultDeclared);
  const ignores = useIssueIgnores("resultDeclared");
  const list = useMemo(
    () => (rows ?? emptyRows).filter((row) => !ignores.keys.has(row.saId)),
    [rows, ignores.keys],
  );
  const filters = useCheckFilters(
    "data-check-result-declared",
    list,
    (row) => row.block,
    () => "State",
    (row) => `${row.facility} ${row.block} ${row.certificationStatus} ${row.current ?? ""}`,
    (row) => row.facilityType,
  );
  const [selected, setSelected] = useSelection(list.map((row) => row.saId));
  const selectedRows = filters.filtered.filter((row) => selected.has(row.saId));
  const [preview, setPreview] = useState(false);
  const [batch, setBatch] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [undoBusy, setUndoBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const undoBatch = async (batchId: string) => {
    setUndoBusy(true);
    try {
      const result = await undo({ batchId });
      toast.success(`Undone — ${result.restored} row${result.restored === 1 ? "" : "s"} restored`, {
        description: result.skipped
          ? `${result.skipped} row(s) were edited later and left untouched.`
          : "The old SaQsham Documents Status is back.",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not undo the backfill");
    } finally {
      setUndoBusy(false);
    }
  };

  const doApply = async () => {
    if (selectedRows.length === 0) return;
    setBusy(true);
    setProgress(25);
    try {
      const result = await apply({ saIds: selectedRows.map((row) => row.saId) as never });
      setProgress(100);
      setBatch(result.batchId);
      setPreview(false);
      toast.success(`Updated ${result.updated} row${result.updated === 1 ? "" : "s"}`, {
        description: "SaQsham Documents Status is now “Result Declared”.",
        duration: 15000,
        action: { label: "Undo", onClick: () => void undoBatch(result.batchId) },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not apply the backfill");
    } finally {
      setBusy(false);
      window.setTimeout(() => setProgress(0), 600);
    }
  };

  const columns: DataCheckColumn<ResultRow>[] = [
    {
      key: "facility",
      label: "Facility",
      width: "minmax(13rem,1.5fr)",
      render: (row) => <span className="truncate font-medium" data-tip={row.facility} data-tip-truncate>{row.facility}</span>,
    },
    {
      key: "block",
      label: "Block",
      width: "minmax(7rem,0.8fr)",
      render: (row) => <span className="truncate">{row.block || "-"}</span>,
    },
    {
      key: "facilityType",
      label: "Facility Type",
      width: "7.5rem",
      render: (row) => <span className="truncate">{row.facilityType || "-"}</span>,
    },
    {
      key: "cycle",
      label: "Cycle",
      width: "4.5rem",
      render: (row) => <span className="tabular-nums">{cycleText(row.cycleNumber)}</span>,
    },
    {
      key: "status",
      label: "Certification status",
      width: "minmax(13rem,1.2fr)",
      render: (row) => <span className="truncate">{row.certificationStatus || "-"}</span>,
    },
    {
      key: "current",
      label: "Current Documents Status",
      width: "minmax(15rem,1.4fr)",
      render: (row) => (
        <span className="truncate" data-tip={row.current ?? "-"} data-tip-truncate>
          {row.current || "-"}{row.auto ? " (auto)" : ""}
        </span>
      ),
    },
    {
      key: "willSet",
      label: "Will set",
      width: "minmax(12rem,1fr)",
      render: () => <span>Result Declared</span>,
    },
  ];

  const previewChanges: PreviewChange[] = selectedRows.map((row) => ({
    key: row.saId,
    facility: `${row.facility} · ${row.certificationStatus}`,
    before: row.current || "-",
    after: "Result Declared",
  }));

  const doExport = () => {
    void exportExcel(
      "data-check-result-declared.xlsx",
      "Result Declared",
      ["Facility", "Block", "Cycle", "Certification status", "Current Documents Status", "Will set"],
      filters.filtered.map((row) => [
        row.facility,
        row.block,
        cycleText(row.cycleNumber),
        row.certificationStatus,
        `${row.current || "-"}${row.auto ? " (auto)" : ""}`,
        "Result Declared",
      ]),
      { title: "Data checks — Result Declared backfill", subtitle: `${filters.filtered.length} rows` },
    ).catch((error) => toast.error(error instanceof Error ? error.message : "Export failed"));
  };

  return (
    <>
      <CheckFilters filters={filters} />
      <div className="mt-2">
        <DataCheckTable
          rows={filters.filtered}
          columns={columns}
          rowKey={(row) => row.saId}
          selected={selected}
          onSelectedChange={setSelected}
          empty="Every declared result already shows “Result Declared”."
          loading={rows === undefined}
          label="Result Declared backfill"
          minWidth={980}
          onIgnore={(row) =>
            void ignores
              .ignore([
                {
                  issueKey: row.saId,
                  label: row.facility,
                  detail: `${row.certificationStatus} · ${row.current || "-"}`,
                },
              ])
              .then(() =>
                setSelected((current) => {
                  const next = new Set(current);
                  next.delete(row.saId);
                  return next;
                }),
              )
          }
        />
      </div>
      <CheckActionBar
        shown={filters.filtered.length}
        selected={selectedRows.length}
        actionLabel={`Preview & apply (${selectedRows.length})`}
        onAction={() => setPreview(true)}
        disabledReason={selectedRows.length === 0 ? "Select at least one row to backfill." : undefined}
        busy={busy}
        progress={progress}
        onUndo={batch ? () => void undoBatch(batch) : undefined}
        undoBusy={undoBusy}
        onExport={doExport}
        onIgnoreSelected={
          selectedRows.length
            ? () =>
                void ignores
                  .ignore(
                    selectedRows.map((row) => ({
                      issueKey: row.saId,
                      label: row.facility,
                      detail: `${row.certificationStatus} · ${row.current || "-"}`,
                    })),
                  )
                  .then(() => setSelected(new Set()))
            : undefined
        }
      />
      <BulkPreviewDialog
        open={preview}
        onOpenChange={setPreview}
        title="Preview Result Declared backfill"
        description="Each selected row keeps its last portal value while the current status becomes Result Declared. Undo restores it."
        changes={previewChanges}
        total={previewChanges.length}
        busy={busy}
        progress={progress}
        onConfirm={() => void doApply()}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Assessor names                                                           */
/* -------------------------------------------------------------------------- */

type AssessorRow = {
  saId: string;
  facilityId: string;
  facility: string;
  block: string;
  facilityType: string | null;
  cycleNumber: number | null;
  slot: number;
  currentName: string;
  proposedName: string;
  proposedDesignation: string;
};

function AssessorNamesCard() {
  const rows = useQuery(api.assessorChecks.assessorSplitAudit, {}) as
    | AssessorRow[]
    | undefined;
  const apply = useMutation(api.assessorChecks.applyAssessorSplits);
  const undo = useMutation(api.assessorChecks.undoAssessorSplits);
  const ignores = useIssueIgnores("assessorNames");
  const keyOf = (row: AssessorRow) => `${row.saId}:${row.slot}`;
  const list = useMemo(
    () => (rows ?? emptyRows).filter((row) => !ignores.keys.has(keyOf(row))),
    [rows, ignores.keys],
  );
  const filters = useCheckFilters(
    "data-check-assessor-names",
    list,
    (row) => row.block,
    () => "State",
    (row) => `${row.facility} ${row.block} ${row.currentName} ${row.proposedName}`,
    (row) => row.facilityType,
  );
  const [selected, setSelected] = useSelection(list.map(keyOf));
  const selectedRows = filters.filtered.filter((row) => selected.has(keyOf(row)));
  const [preview, setPreview] = useState(false);
  const [batch, setBatch] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [undoBusy, setUndoBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const undoBatch = async (batchId: string) => {
    setUndoBusy(true);
    try {
      const result = await undo({ batchId });
      toast.success(`Undone — ${result.restored} assessor name${result.restored === 1 ? "" : "s"} restored`, {
        description: result.skipped ? `${result.skipped} row(s) changed again since.` : "Old names are back.",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not undo this batch");
    } finally {
      setUndoBusy(false);
    }
  };

  const doApply = async () => {
    if (selectedRows.length === 0) return;
    setBusy(true);
    setProgress(25);
    try {
      const result = await apply({
        entries: selectedRows.map((row) => ({
          saId: row.saId as never,
          slot: row.slot,
          name: row.proposedName,
          designation: row.proposedDesignation,
          currentName: row.currentName,
        })),
      });
      setProgress(100);
      setBatch(result.batchId);
      setPreview(false);
      toast.success(`Split ${result.updated} assessor name${result.updated === 1 ? "" : "s"}`, {
        description: "The name and designation are saved separately.",
        duration: 15000,
        action: { label: "Undo", onClick: () => void undoBatch(result.batchId) },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not split the assessor names");
    } finally {
      setBusy(false);
      window.setTimeout(() => setProgress(0), 600);
    }
  };

  const columns: DataCheckColumn<AssessorRow>[] = [
    {
      key: "facility",
      label: "Facility",
      width: "minmax(13rem,1.4fr)",
      render: (row) => <span className="truncate font-medium" data-tip={row.facility} data-tip-truncate>{row.facility}</span>,
    },
    {
      key: "block",
      label: "Block",
      width: "minmax(7rem,0.8fr)",
      render: (row) => <span className="truncate">{row.block || "-"}</span>,
    },
    {
      key: "facilityType",
      label: "Facility Type",
      width: "7.5rem",
      render: (row) => <span className="truncate">{row.facilityType || "-"}</span>,
    },
    {
      key: "cycle",
      label: "Cycle",
      width: "4.5rem",
      render: (row) => <span className="tabular-nums">{cycleText(row.cycleNumber)}</span>,
    },
    {
      key: "assessor",
      label: "Assessor",
      width: "6rem",
      render: (row) => <span>Assessor {row.slot}</span>,
    },
    {
      key: "current",
      label: "Current name",
      width: "minmax(13rem,1.2fr)",
      render: (row) => <span className="truncate" data-tip={row.currentName} data-tip-truncate>{row.currentName}</span>,
    },
    {
      key: "willSet",
      label: "Will set",
      width: "minmax(18rem,1.6fr)",
      render: (row) => (
        <span className="truncate">
          Name = {row.proposedName} · Designation = {row.proposedDesignation}
        </span>
      ),
    },
  ];

  const previewChanges: PreviewChange[] = selectedRows.map((row) => ({
    key: keyOf(row),
    facility: `${row.facility} · Assessor ${row.slot}`,
    before: row.currentName,
    after: `${row.proposedName} · ${row.proposedDesignation}`,
  }));

  const doExport = () => {
    void exportExcel(
      "data-check-assessor-names.xlsx",
      "Assessor names",
      ["Facility", "Block", "Cycle", "Assessor", "Current name", "Will set"],
      filters.filtered.map((row) => [
        row.facility,
        row.block,
        cycleText(row.cycleNumber),
        `Assessor ${row.slot}`,
        row.currentName,
        `${row.proposedName} · ${row.proposedDesignation}`,
      ]),
      { title: "Data checks — Assessor names", subtitle: `${filters.filtered.length} rows` },
    ).catch((error) => toast.error(error instanceof Error ? error.message : "Export failed"));
  };

  return (
    <>
      <CheckFilters filters={filters} />
      <div className="mt-2">
        <DataCheckTable
          rows={filters.filtered}
          columns={columns}
          rowKey={keyOf}
          selected={selected}
          onSelectedChange={setSelected}
          empty="Every assessor name is already separate from its designation."
          loading={rows === undefined}
          label="Assessor names"
          minWidth={1020}
          onIgnore={(row) =>
            void ignores
              .ignore([
                {
                  issueKey: keyOf(row),
                  label: `${row.facility} · Assessor ${row.slot}`,
                  detail: row.currentName,
                },
              ])
              .then(() =>
                setSelected((current) => {
                  const next = new Set(current);
                  next.delete(keyOf(row));
                  return next;
                }),
              )
          }
        />
      </div>
      <CheckActionBar
        shown={filters.filtered.length}
        selected={selectedRows.length}
        actionLabel={`Preview & split (${selectedRows.length})`}
        onAction={() => setPreview(true)}
        disabledReason={selectedRows.length === 0 ? "Select at least one assessor name." : undefined}
        busy={busy}
        progress={progress}
        onUndo={batch ? () => void undoBatch(batch) : undefined}
        undoBusy={undoBusy}
        onExport={doExport}
        onIgnoreSelected={
          selectedRows.length
            ? () =>
                void ignores
                  .ignore(
                    selectedRows.map((row) => ({
                      issueKey: keyOf(row),
                      label: `${row.facility} · Assessor ${row.slot}`,
                      detail: row.currentName,
                    })),
                  )
                  .then(() => setSelected(new Set()))
            : undefined
        }
      />
      <BulkPreviewDialog
        open={preview}
        onOpenChange={setPreview}
        title="Preview assessor name splits"
        description="The name and designation are stored in separate fields. Confirm to apply."
        changes={previewChanges}
        total={previewChanges.length}
        busy={busy}
        progress={progress}
        onConfirm={() => void doApply()}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Annexure I scores                                                           */
/* -------------------------------------------------------------------------- */

function AnnexureScoresCard() {
  const rows = useQuery(api.annexure.missing, {});
  const ignores = useIssueIgnores("annexure");
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const keyOf = (row: { facilityId: string; cycleNumber: number | null }) =>
    `${row.facilityId}-${row.cycleNumber ?? "none"}`;
  const visible = useMemo(
    () => (rows ?? []).filter((row) => !ignores.keys.has(keyOf(row))),
    [rows, ignores.keys],
  );
  const filters = useCheckFilters(
    "data-check-annexure",
    visible,
    (row) => row.block,
    () => null,
    (row) => `${row.facility} ${row.block} ${row.documentName} ${row.certificationStatus}`,
    (row) => row.facilityType,
  );
  const selectedRows = filters.filtered.filter((row) => selected.has(keyOf(row)));
  return (
    <>
      <p className="text-xs text-muted-foreground">
        Read the Annexure I page of a result PDF. Nothing is saved until you
        confirm in the preview, and every save can be undone.
      </p>
      <CheckFilters filters={filters} />
      <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/25 px-3 py-2">
        <span className="text-[11px] text-muted-foreground">
          {filters.filtered.length} shown · <span className="font-semibold text-foreground">{selectedRows.length} selected</span>
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-[11px]"
            disabled={selectedRows.length === 0}
            onClick={() => {
              void ignores
                .ignore(
                  selectedRows.map((row) => ({
                    issueKey: keyOf(row),
                    label: row.facility,
                    detail: `Cycle #${row.cycleNumber} · ${row.documentName}`,
                  })),
                )
                .then(() => setSelected(new Set()));
            }}
          >
            <EyeOff className="size-3" /> Ignore selected ({selectedRows.length})
          </Button>
        </div>
      </div>
      <div className="mt-2 space-y-2">
        {rows === undefined &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/50" />
          ))}
        {rows !== undefined && filters.filtered.length === 0 && (
          <p className="rounded-lg border border-emerald-300/60 bg-emerald-50/50 p-3 text-xs text-emerald-900">
            Every certified cycle with an NQAS Result file has scores.
          </p>
        )}
        {filters.filtered.map((row) => {
          const key = keyOf(row);
          return (
            <div
              key={key}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2"
            >
              <Checkbox
                checked={selected.has(key)}
                onCheckedChange={(value) =>
                  setSelected((current) => {
                    const next = new Set(current);
                    if (value === true) next.add(key);
                    else next.delete(key);
                    return next;
                  })
                }
                aria-label={`Select ${row.facility} cycle ${row.cycleNumber}`}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold">{row.facility}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {row.block} · {row.facilityType || "-"} · Cycle #{row.cycleNumber} ·{" "}
                  {row.certificationStatus || "-"}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {row.documentName}
                </span>
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-[11px] text-muted-foreground"
                onClick={() =>
                  void ignores
                    .ignore([
                      {
                        issueKey: key,
                        label: row.facility,
                        detail: `Cycle #${row.cycleNumber} · ${row.documentName}`,
                      },
                    ])
                    .then(() =>
                      setSelected((current) => {
                        const next = new Set(current);
                        next.delete(key);
                        return next;
                      }),
                    )
                }
              >
                <EyeOff className="mr-1 size-3" /> Ignore
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                onClick={() => setDocumentId(row.documentId)}
              >
                <ScanText className="mr-1 size-3" /> Read
              </Button>
            </div>
          );
        })}
      </div>
      <LazyResultReadDialog
        open={!!documentId}
        onOpenChange={(next) => {
          if (!next) setDocumentId(null);
        }}
        documentIds={documentId ? [documentId] : []}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Health page                                                                 */
/* -------------------------------------------------------------------------- */

type Counts = {
  surveillance: number;
  visitDates: number;
  documentNames: number;
  resultDeclared: number;
  assessorNames: number;
  annexure: number;
};

function IgnoredIssuesPanel() {
  const ctx = useContext(IgnoreContext);
  const [busyId, setBusyId] = useState<string | null>(null);
  if (!ctx || ctx.records.length === 0) return null;
  return (
    <section
      className="rounded-xl border border-border/60 bg-background/70"
      aria-labelledby="ignored-issues-title"
    >
      <details>
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          <EyeOff className="size-4 text-muted-foreground" />
          <span id="ignored-issues-title">Ignored issues</span>
          <span className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {ctx.records.length}
          </span>
          <span className="ml-auto text-[11px] font-normal text-muted-foreground">
            Underlying assessment data is unchanged
          </span>
        </summary>
        <div className="border-t border-border/50">
          <ul className="divide-y divide-border/40">
            {ctx.records.map((row) => (
              <li key={row._id} className="flex flex-wrap items-center gap-2 px-4 py-2 text-xs">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{row.label}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {CHECK_META.find((item) => item.id === row.check)?.title ?? row.check}
                    {row.detail ? ` · ${row.detail}` : ""}
                  </span>
                  <span className="block text-[10.5px] text-muted-foreground">
                    Ignored by {row.ignoredByName} · {istStamp(row.ignoredAt)}
                  </span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px]"
                  disabled={busyId === row._id}
                  onClick={async () => {
                    setBusyId(row._id);
                    try {
                      await ctx.restore([row._id]);
                    } finally {
                      setBusyId(null);
                    }
                  }}
                >
                  {busyId === row._id ? (
                    <Loader2 className="mr-1 size-3 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-1 size-3" />
                  )}
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </section>
  );
}

export function DataChecksHealth() {
  const readerEnabled = useResultReaderEnabled();
  const summary = useQuery(api.dataChecks.healthSummary, {});
  const ignoredQ = useQuery(api.dataCheckIgnores.list, {});
  const ignoreMutation = useMutation(api.dataCheckIgnores.ignore);
  const restoreMutation = useMutation(api.dataCheckIgnores.restore);
  const [open, setOpen] = useState<Record<CheckId, boolean> | null>(null);
  const [lastChecked, setLastChecked] = useState<number | null>(null);

  const restoreIds = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      try {
        const result = await restoreMutation({ ids: ids as never[] });
        toast.success(`Restored ${result.restored} ignored issue${result.restored === 1 ? "" : "s"}`, {
          description: "The issue is back in its active list. No assessment value changed.",
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not restore the ignored issue");
      }
    },
    [restoreMutation],
  );

  const ignoreIssues = useCallback(
    async (check: CheckId, rows: IgnoreInput[]) => {
      if (rows.length === 0) return;
      try {
        const result = await ignoreMutation({ check, rows });
        if (result.ignored === 0) {
          toast.info("Already ignored");
          return;
        }
        toast.success(`Ignored ${result.ignored} issue${result.ignored === 1 ? "" : "s"}`, {
          description: "Removed from the active list only. Assessment data is unchanged.",
          action:
            result.ids.length > 0
              ? { label: "Undo", onClick: () => void restoreIds(result.ids) }
              : undefined,
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not ignore the issue");
      }
    },
    [ignoreMutation, restoreIds],
  );

  const ignoreValue = useMemo<IgnoreContextValue>(() => {
    const records = (ignoredQ ?? []) as IgnoredIssue[];
    const keys = Object.fromEntries(
      CHECK_META.map((item) => [item.id, new Set<string>()]),
    ) as Record<CheckId, Set<string>>;
    for (const record of records) {
      if (keys[record.check]) keys[record.check].add(record.issueKey);
    }
    return { records, keys, ignore: ignoreIssues, restore: restoreIds };
  }, [ignoredQ, ignoreIssues, restoreIds]);

  useEffect(() => {
    if (!summary) return;
    setLastChecked(summary.checkedAt);
    if (open === null) {
      setOpen({
        surveillance: summary.counts.surveillance > 0,
        visitDates: summary.counts.visitDates > 0,
        documentNames: summary.counts.documentNames > 0,
        resultDeclared: summary.counts.resultDeclared > 0,
        assessorNames: summary.counts.assessorNames > 0,
        annexure: summary.counts.annexure > 0,
      });
    }
    // Deliberately initialise once; a later count change must not collapse a
    // card the admin is working in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary]);

  if (!summary) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading data checks">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/60" />
          ))}
        </div>
        <div className="h-20 animate-pulse rounded-xl bg-muted/40" />
        <div className="h-24 animate-pulse rounded-xl bg-muted/40" />
      </div>
    );
  }

  const counts = summary.counts as Counts;
  const checks = readerEnabled
    ? CHECK_META
    : CHECK_META.filter((item) => item.id !== "annexure");
  const total = checks.reduce((sum, item) => sum + counts[item.id], 0);
  const openCards = open ?? {
    surveillance: false,
    visitDates: false,
    documentNames: false,
    resultDeclared: false,
    assessorNames: false,
    annexure: false,
  };
  const toggle = (id: CheckId) =>
    setOpen((current) => ({ ...(current ?? openCards), [id]: !(current ?? openCards)[id] }));
  const jump = (id: CheckId) => {
    setOpen((current) => ({ ...(current ?? openCards), [id]: true }));
    window.setTimeout(
      () => document.getElementById(`data-check-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }),
      30,
    );
  };

  return (
    <IgnoreContext.Provider value={ignoreValue}>
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Data health</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {total === 0
              ? "Everything is healthy. Open a card to review its list."
              : `${total} issue${total === 1 ? "" : "s"} need a confirmed fix. Cards with problems open first.`}
            {ignoreValue.records.length > 0 ? (
              <span className="ml-1">
                · {ignoreValue.records.length} ignored
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Last checked: {lastChecked ? istStamp(lastChecked) : "-"}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => {
              setLastChecked(Date.now());
              toast.info("Checks refreshed", {
                description: "Counts update automatically when the data changes.",
              });
            }}
          >
            <RefreshCw className="size-3.5" /> Run checks again
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {checks.map((item) => {
          const count = counts[item.id];
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => jump(item.id)}
              className={cn(
                "rounded-xl border px-3 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                count > 0
                  ? "border-amber-300/70 bg-amber-50/60 hover:bg-amber-50"
                  : "border-emerald-300/60 bg-emerald-50/50 hover:bg-emerald-50",
              )}
            >
              <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                <Icon className="size-3.5" /> {item.title}
              </span>
              <span className="mt-1 flex items-baseline gap-1.5">
                <span
                  className={cn(
                    "text-2xl font-bold tabular-nums",
                    count > 0 ? "text-amber-900" : "text-emerald-900",
                  )}
                >
                  {count}
                </span>
                <span className={cn("text-[11px] font-semibold", count > 0 ? "text-amber-800" : "text-emerald-800")}>
                  {count > 0 ? `${count} to fix` : "All clear"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {checks.map((item) => (
        <CheckCard
          key={item.id}
          id={item.id}
          title={item.title}
          sentence={item.sentence}
          count={counts[item.id]}
          ignoredCount={ignoreValue.records.filter((row) => row.check === item.id).length}
          open={openCards[item.id]}
          onToggle={() => toggle(item.id)}
        >
          {item.id === "surveillance" && <SurveillanceCard />}
          {item.id === "visitDates" && <VisitDatesCard />}
          {item.id === "documentNames" && <DocumentNamesCard />}
          {item.id === "resultDeclared" && <ResultDeclaredCard />}
          {item.id === "assessorNames" && <AssessorNamesCard />}
          {item.id === "annexure" && <AnnexureScoresCard />}
        </CheckCard>
      ))}
      <IgnoredIssuesPanel />
    </div>
    </IgnoreContext.Provider>
  );
}
