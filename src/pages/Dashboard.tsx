import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { NAV_ITEMS } from "@/lib/sidebarConfig";
import { AppShell } from "@/components/AppShell";
import { CycleFilter, useCycleScope, useSetCycleScope } from "@/components/CycleFilter";
import { StatusBadge } from "@/components/StatusBadge";
import { PIPELINE_STAGE_COLORS } from "@/components/SegmentBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IaReminderBanner } from "@/components/ia/IaReminderBanner";
import {
  Award,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Download,
  BookMarked,
  FileSpreadsheet,
  FileText,
  FilterX,
  History,
  Info,
  Loader2,
  MessageCircle,
  Presentation,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Target,
  Upload,
  TriangleAlert,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router";
import ProgressBreakdownCard from "@/components/dashboard/ProgressBreakdownCard";
import { buildBreakdown, type BreakdownFacility } from "@/lib/breakdown";
import { useBreakdownUrlState } from "@/lib/breakdownUrl";
import {
  DEFAULT_SETTINGS,
  PIPELINE_STAGES,
  nextStepHint,
  deriveLifecycleView,
  type LifecycleSettings,
  type LifecycleView,
  type NqasLike,
  type PipelineStage,
  type SaLike,
  type StatusTone,
} from "@/convex/lifecycle";
import { todayLocalIso, isTodayOrFuture } from "@/lib/today";
import {
  currentFiscalYear as currentFyStart,
  fiscalYearLabel,
} from "@/lib/fiscalYear";
import { cn } from "@/lib/utils";
import { toDisplayDate, toDisplayDateTime } from "@/lib/format";
import { formatPercent, percentOf } from "@/lib/reportMetrics";
import { exportExcel, exportPdf } from "@/lib/exportTable";
import {
  CONDITIONALITY_HEADERS,
  DASHBOARD_FILTERED_COLUMNS,
  DOC_STATUS_HEADERS,
  ELIGIBLE_PENDING_HEADERS,
  FACILITY_CURRENT_STATUS_LABEL,
  RECERT_HEADERS,
  RESULT_AWAITED_HEADERS,
  SCHEDULED_HEADERS,
  buildConditionalityRows,
  buildDocStatusRows,
  buildEligiblePendingRows,
  buildProgressHeaders,
  buildProgressRows,
  buildResultAwaitedRows,
  buildScheduledRows,
  type ConditionalityItem,
  type DocStatusItem,
  type EligiblePendingItem,
  type FilteredReportRow,
  type ProgressBlock,
  type ResultAwaitedItem,
  type ScheduledListRow,
} from "@/lib/dashboardTables";
import {
  buildReportCsv,
  downloadText,
  openReportPrintView,
  reportColumnAligns,
  reportColumnWidths,
  reportHeaders,
  reportRows,
  reportSubtitle,
} from "@/lib/reportColumns";
import type { FunctionReturnType } from "convex/server";
import { multiFilterMatches } from "@/lib/multiFilter";
import FilterDropdown from "@/components/FilterDropdown";
import { UniversalFilterBar, type ActiveFilter, type FilterField } from "@/components/UniversalFilterBar";
import { FilterBar } from "@/components/FilterBar";
import { FacilityCell } from "@/components/FacilityCell";
import {
  DashboardSection,
  DashboardSectionsProvider,
  useDashboardLayout,
} from "@/components/DashboardSections";

/* ================================================================
 *  Types
 * ================================================================ */

type FastData = FunctionReturnType<typeof api.ops.listFacilityRowsFast>;
type FacilityRowFast = FastData["rows"][number];

/** A fast facility row with its shared lifecycle view attached — one
 *  derivation per row, reused by every section, so all sections agree with
 *  the server rule (deriveLifecycleView is the same shared rule the backend
 *  uses). */
type Flagged = FacilityRowFast & { view: LifecycleView };const DAY_MS = 86_400_000;

/** fastRows store these record fields as `string | null` while the shared
 *  lifecycle view accepts `string | undefined` optionals — map once here so
 *  the derivation receives exactly the SaLike / NqasLike shapes it expects. */
function toSaLike(sa: FacilityRowFast["sa"]): SaLike | null {
  if (!sa) return null;
  return {
    status: sa.status ?? "Not Yet Initiated",
    scheduledDate: sa.scheduledDate ?? undefined,
    actualStartDate: sa.actualStartDate ?? undefined,
    actualEndDate: sa.actualEndDate ?? undefined,
    scorePercent: sa.scorePercent ?? undefined,
    generalDocStatus: sa.generalDocStatus,
  };
}

function toNqasLike(n: FacilityRowFast["nqas"]): NqasLike | null {
  if (!n) return null;
  return {
    status: n.status ?? "Pending",
    scheduledStartDate: n.scheduledStartDate ?? undefined,
    scheduledEndDate: n.scheduledEndDate ?? undefined,
    actualEndDate: n.actualEndDate ?? undefined,
    certificationStatus: n.certificationStatus ?? undefined,
    certificationDate: n.certificationDate ?? undefined,
    goiLetterDate: n.goiLetterDate ?? undefined,
    validityDate: n.validityDate ?? undefined,
  };
}const daysTo = (iso: string, today: string) =>
  Math.round(
    (Date.parse(iso + "T12:00:00") - Date.parse(today + "T12:00:00")) / DAY_MS,
  );

/** "Overdue 939d" reads better as "Overdue 2y 7m" — humanized duration for
 *  overdue dates; future dates keep the plain "in Nd" style elsewhere. */
/** "Mon 02-Nov-2026" — the shared date with weekday (IST, no timezone drift). */
function weekdayDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00+05:30`);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (Number.isNaN(d.getTime())) return toDisplayDate(iso);
  return `${days[d.getUTCDay()]} ${String(d.getUTCDate()).padStart(2, "0")}-${months[d.getUTCMonth()]}-${d.getUTCFullYear()}`;
}

function humanOverdue(days: number): string {
  if (days <= 0) return "Today";
  const y = Math.floor(days / 365);
  const rem = days - y * 365;
  const m = Math.floor(rem / 30);
  if (y > 0) return m > 0 ? `${y}y ${m}m` : `${y}y`;
  if (m >= 2) return `${m}m`;
  if (m === 1) return `1m ${rem - 30}d`;
  return `${days}d`;
}

const TONE_BG: Record<StatusTone, string> = {
  green: "oklch(0.62 0.15 165)",
  amber: "oklch(0.78 0.14 85)",
  red: "oklch(0.6 0.2 25)",
  blue: "oklch(0.58 0.14 250)",
  slate: "oklch(0.62 0.03 260)",
  violet: "oklch(0.58 0.14 300)",
};

function statusToneOf(status: string): StatusTone {
  if (status.startsWith("Certified —")) return "green";
  if (status.includes("Conditionality")) return "amber";
  if (status === "Recertification Due") return "amber";
  if (status.startsWith("Deferred")) return "red";
  if (
    status.startsWith("SA Scheduled") ||
    status.startsWith("NA Scheduled") ||
    status.startsWith("NQAS") ||
    status.startsWith("SA Completed")
  )
    return "blue";
  if (
    status === "Facility (Future Candidate)" ||
    status === "Possible (future candidate)"
  )
    return "violet";
  return "slate";
}/** Fiscal year (start year) of an ISO date — one Indian Apr–Mar rule, the
 *  same lib the deck and Reports read. */
function fyOf(iso: string): number {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  return m >= 4 ? y : y - 1;
}

/** The position of a pipeline stage on the real path (for numbering).
 *  "Not eligible" is NOT a path stage — it renders as a muted chip (–). */
function stageIndex(stage: PipelineStage): number {
  const path = PIPELINE_STAGES.filter((s) => s.key !== "notEligible");
  return path.findIndex((s) => s.key === stage);
}

/** Part 3 — one Overview tile: shared KPI-tile look, tabular numbers,
 *  tooltip definition, colour never used alone (icon + text), and a click
 *  that opens the matching facility list. */
function OverviewTile({
  label,
  tip,
  value,
  sub,
  icon,
  tone,
  onClick,
  index = 0,
}: {
  label: string;
  tip: string;
  value: number | string;
  sub?: string;
  icon: React.ReactNode;
  tone?: string;
  onClick?: () => void;
  index?: number;
}) {
  const Comp = onClick ? motion.button : motion.div;
  const clickProps = onClick ? { type: "button" as const, onClick } : {};
  return (
    <Comp
      {...clickProps}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.2) }}
      className={cn(
        "glass flex min-h-24 min-w-0 flex-col rounded-2xl p-4 text-left shadow-sm transition-shadow hover:shadow",
        onClick &&
          "hover:shadow-lg hover:shadow-teal-950/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
      )}
      aria-label={typeof value === "number" ? `${label}: ${value}` : label}
    >
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        <span className="min-w-0 truncate" data-tip={label} data-tip-truncate>
          {label}
        </span>
        <InfoTip tip={tip} />
      </span>
      <span className={cn("mt-1 text-2xl font-bold tabular-nums", tone)}>
        {value}
      </span>
      {sub && (
        <span className="mt-0.5 text-[11px] text-muted-foreground">{sub}</span>
      )}
    </Comp>
  );
}

  /** Animated KPI number — counts up to `value` on change (600ms ease-out). */
function useCountUp(value: number, duration = 600) {
  const [n, setN] = useState(value);
  const ref = useRef(value);
  useEffect(() => {
    if (ref.current === value) return;
    const from = ref.current;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = Math.round(from + (value - from) * eased);
      setN(cur);
      if (p < 1) raf = requestAnimationFrame(tick);
      else ref.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return n;
}

/** Small circular progress ring for the Certified hero KPI. */
function PctRing({
  pct,
  size = 48,
  stroke = 5,
  color = "oklch(0.62 0.15 165)",
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const w = Math.max(0, Math.min(100, pct)) * (c / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="oklch(0.62 0.03 260 / 0.18)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${w} ${c}`}
        style={{ transition: "stroke-dasharray 700ms ease" }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="54%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={size * 0.26}
        fontWeight={700}
        fill="currentColor"
      >
        {pct}%
      </text>
    </svg>
  );
}

/** ⓘ icon with the tooltip definition of a KPI — one labelled definition per
 *  number, so there is exactly one source of meaning. */
function InfoTip({ tip }: { tip: string }) {
  /* ONE tooltip system: the shared `data-tip` layer (top layer, Esc, focus). */
  return (
    <button
      type="button"
      aria-label="What does this number mean?"
      data-tip={tip}
      className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Info className="size-3.5" aria-hidden />
    </button>
  );
}

const dateStamp = () => new Date().toISOString().slice(0, 10);

/* ================================================================
 *  Exports (unchanged builders — kept from the previous dashboard)
 * ================================================================ */

function exportDashboardProgress(
  blocks: ProgressBlock[],
  scopeLabel: string,
  fmt: "xlsx" | "pdf",
) {
  // Header and rows come from the same definition (lib/dashboardTables), so
  // the column count can never disagree.
  const headers = buildProgressHeaders(scopeLabel);
  const rows = buildProgressRows(blocks);
  const title = isBlockScopedLabel(scopeLabel)
    ? "PHC-wise progress report"
    : "Progress by block";
  if (fmt === "xlsx") {
    exportExcel(
      `dashboard-block-progress-${dateStamp()}.xlsx`,
      title.slice(0, 31),
      headers,
      rows,
    );
  } else {
    exportPdf(
      `dashboard-block-progress-${dateStamp()}.pdf`,
      title,
      headers,
      rows,
      `${blocks.length} ${scopeLabel.toLowerCase()} · generated ${dateStamp()}`,
    );
  }
}

function isBlockScopedLabel(label: string) {
  return label.trim().toLowerCase() === "phc";
}

/**
 * The filtered report's header row and its body rows.
 *
 * ROOT CAUSE OF THE SHIFTED REPORT: this used to be two separate things — a
 * `FILTERED_HEADERS` array that the export call site trimmed with
 * `.slice(1)` (dropping the "S.No" label) and a `buildFilteredExportRows()`
 * that still emitted the serial number as the first cell. 10 headers, 11
 * cells: every value printed one column to the right of its own header.
 *
 * Both now map over the SAME ordered column model, so they cannot drift.
 */
const filteredReportHeaders = () => reportHeaders(DASHBOARD_FILTERED_COLUMNS);
const filteredReportRows = (rows: readonly FilteredReportRow[]) =>
  reportRows(DASHBOARD_FILTERED_COLUMNS, rows);

/** PDF column widths/alignments — taken from the model, so the PDF lays out
 *  exactly the columns the header lists. */
const filteredReportPdfOptions = () => ({
  columnWidths: reportColumnWidths(DASHBOARD_FILTERED_COLUMNS),
  columnAligns: reportColumnAligns(DASHBOARD_FILTERED_COLUMNS),
});

function exportEligiblePending(
  items: EligiblePendingItem[],
  fmt: "xlsx" | "pdf",
) {
  const rows = buildEligiblePendingRows(items);
  const stamp = new Date().toISOString().slice(0, 10);
  if (fmt === "xlsx")
    exportExcel(
      `eligible-pending-${stamp}.xlsx`,
      "Eligible Pending",
      ELIGIBLE_PENDING_HEADERS,
      rows,
    );
  else
    exportPdf(
      `eligible-pending-${stamp}.pdf`,
      "Eligible Pending Facilities",
      ELIGIBLE_PENDING_HEADERS,
      rows,
      `NQAS-eligible facilities that have not begun certification — ${items.length} facilities · generated ${stamp}`,
    );
}

function exportConditionalityList(
  items: ConditionalityItem[],
  fmt: "xlsx" | "pdf",
) {
  const rows = buildConditionalityRows(items);
  const stamp = new Date().toISOString().slice(0, 10);
  if (fmt === "xlsx")
    exportExcel(
      `quality-certified-with-conditionality-${stamp}.xlsx`,
      "Quality Certified with Conditionality",
      CONDITIONALITY_HEADERS,
      rows,
    );
  else
    exportPdf(
      `quality-certified-with-conditionality-${stamp}.pdf`,
      "Quality Certified with Conditionality — Facility List",
      CONDITIONALITY_HEADERS,
      rows,
      `Facilities holding a conditional certification — ${items.length} facilities · generated ${stamp}`,
    );
}

function exportResultAwaitedList(
  items: ResultAwaitedItem[],
  fmt: "xlsx" | "pdf",
) {
  const rows = buildResultAwaitedRows(items);
  const stamp = new Date().toISOString().slice(0, 10);
  if (fmt === "xlsx")
    exportExcel(
      `result-awaited-facilities-${stamp}.xlsx`,
      "Result Awaited Facilities",
      RESULT_AWAITED_HEADERS,
      rows,
    );
  else
    exportPdf(
      `result-awaited-facilities-${stamp}.pdf`,
      "Result Awaited Facilities",
      RESULT_AWAITED_HEADERS,
      rows,
      `Assessment done — result not yet declared — ${items.length} facilities · generated ${stamp}`,
    );
}

function exportDocStatusList(
  items: DocStatusItem[],
  fmt: "xlsx" | "pdf",
) {
  const rows = buildDocStatusRows(items);
  const stamp = new Date().toISOString().slice(0, 10);
  if (fmt === "xlsx")
    exportExcel(
      `documents-status-${stamp}.xlsx`,
      "Documents Status",
      DOC_STATUS_HEADERS,
      rows,
    );
  else
    exportPdf(
      `documents-status-${stamp}.pdf`,
      "SaQsham Documents Status List",
      DOC_STATUS_HEADERS,
      rows,
      `Facilities by document pipeline stage — ${items.length} facilities · generated ${stamp}`,
    );
}

/** Scheduled / recertification rows. Both go through ONE builder that adds the
 *  "Assessment" column only for the scheduled header, so the count matches. */
const buildScheduledExportRows = (
  scheduled: ScheduledListRow[],
  includeKind = true,
) => buildScheduledRows(scheduled, includeKind, humanOverdue);

/* ================================================================
 *  Scheduled / recert split — unchanged shared rule
 * ================================================================ */

function splitScheduledLists(data: { rows: FacilityRowFast[] } | undefined) {
  if (!data) return { scheduled: [], recert: [] };
  const todayIso = todayLocalIso();
  const today = new Date(todayIso + "T12:00:00").getTime();
  const all = data.rows
    .map((r) => {
      const nqasDate = r.nqas?.scheduledStartDate ?? null;
      const nqasEnd = r.nqas?.scheduledEndDate ?? nqasDate;
      const saDate = r.sa?.scheduledDate ?? null;
      const nqasOpen =
        !r.nqas?.certificationStatus &&
        !r.nqas?.actualEndDate &&
        (r.nqas == null || r.nqas.status !== "Completed");
      const nqasStatusScheduled =
        r.nqas?.status === "Scheduled" ||
        r.sa?.generalDocStatus === "NA Scheduled" ||
        r.facility.currentStatus === "NA Scheduled";
      // A multi-day visit counts TODAY when start ≤ today ≤ scheduled end.
      const nqasSpansToday =
        !!nqasDate && nqasDate < todayIso && !!nqasEnd && nqasEnd >= todayIso;
      const nqasSaysScheduled =
        isTodayOrFuture(nqasDate) || nqasSpansToday || (!nqasDate && nqasStatusScheduled);

      let date: string | null = null;
      let endDate: string | null = nqasEnd;
      let kind: "NQAS Assessment" | "State Assessment" | "Recertification" | null =
        null;

      if (nqasOpen && nqasSaysScheduled) {
        date = nqasDate;
        endDate = nqasEnd;
        kind = "NQAS Assessment";
      } else if (r.nqas?.certificationStatus && r.nqas?.validityDate) {
        const daysLeft = Math.round(
          (new Date(r.nqas.validityDate + "T12:00:00").getTime() - today) /
            86400000,
        );
        if (daysLeft <= 90) {
          return {
            r,
            date: r.nqas.validityDate,
            endDate: null,
            kind: "Recertification" as const,
            days: daysLeft,
          };
        }
      } else if (r.nqas?.certificationStatus === "Deferred") {
        return { r, date: null, endDate: null, kind: "Recertification" as const, days: null };
      }

      if (!kind && r.sa != null && r.sa.status !== "Completed") {
        const saSaysScheduled = r.facility.currentStatus === "SA Scheduled";
        if (isTodayOrFuture(saDate) || (!saDate && saSaysScheduled)) {
          date = saDate;
          endDate = saDate;
          kind = "State Assessment";
        }
      }
      if (!kind) return null;
      // The hero and its countdown are judged on the IST date, not a timestamp.
      const isToday =
        date === todayIso || (kind === "NQAS Assessment" && nqasOpen && nqasSpansToday);
      const days = isToday
        ? 0
        : date
          ? Math.round(
              (new Date(date + "T12:00:00").getTime() - today) / 86400000,
            )
          : null;
      return { r, date, endDate, kind, days };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const byDays = (a: { days: number | null }, b: { days: number | null }) =>
    (a.days ?? 99999) - (b.days ?? 99999);
  // Surveillance visits are visits too — the Upcoming schedule's type switch
  // needs them, and an undone due date is a missed visit.
  for (const r of data.rows) {
    for (const [due, done, label] of [
      [r.nqas?.surveillanceDue1, r.nqas?.surveillanceDone1, "Surveillance 1"],
      [r.nqas?.surveillanceDue2, r.nqas?.surveillanceDone2, "Surveillance 2"],
    ] as const) {
      if (!due || done) continue;
      all.push({
        r,
        date: due,
        endDate: due,
        kind: label as unknown as "NQAS Assessment",
        days: Math.round((new Date(due + "T12:00:00").getTime() - today) / 86400000),
      });
    }
  }
  const scheduled: typeof all = all
    .filter((x) => x.kind !== "Recertification")
    // Every missed visit stays here — no arbitrary one-year cut-off.
    .sort(byDays);
  const recert: typeof all = all
    .filter((x) => x.kind === "Recertification")
    .sort(byDays);
  return { scheduled, recert };
}

/* ================================================================
 *  Status-distribution hints (kept from the previous dashboard)
 * ================================================================ */

const MODULE_HINTS: Record<string, string> = {
  "Quality Certified":
    "Validity runs for 1 year — schedule the first-year surveillance visit before it ends.",
  "Quality Certified with Conditionality":
    "Close the conditional gaps and book recertification before the 1-year validity ends.",
  "Result Awaited":
    "Follow up with the assessment team — the result sheet decides the next status.",
  Deferred:
    "Cooling period in progress — reattempt NQAS once the facility is ready.",
  "Not Recorded":
    "Upload the NQAS result or record the certification status for these facilities.",
  Scheduled:
    "Assessment start date is today or upcoming — brief the facility and the team.",
  Completed:
    "Assessment done — verify the score, record the end date and move to the next step.",
  Pending:
    "Set an NQAS Assessment Start date so the facility shows as NA Scheduled.",
  "Not Started":
    "Complete the State Assessment and document pipeline to open the NQAS step.",
  "Not Yet Initiated":
    "Schedule the State Assessment to begin the cycle.",
  "Scheduled — visit the facility page to reschedule":
    "Assessment is on the calendar — confirm assessors and documents.",
  Dilapidated:
    "Flag the building for repair or condemnation follow-up with the PWD.",
  "Needs Repair":
    "Raise the repair request and record the gap-closure fund entry.",
  "Under Renovation":
    "Track renovation progress and update the status on completion.",
  Good: "No building action needed — keep the record current at each visit.",
  Expired: "Renew the Fire NOC immediately — validity has already ended.",
  "Expiring Soon":
    "Renewal window is open — file the renewal before the validity ends.",
  Valid: "NOC is current — recheck after the next validity milestone.",
  "Not Obtained":
    "Apply for the Fire NOC and record the validity once issued.",
};

function hintFor(status: string): string {
  return MODULE_HINTS[status] ?? nextStepHint(status) ?? "";
}

/* ================================================================
 *  Main page
 * ================================================================ */

export default function Dashboard() {
  const data = useQuery(api.ops.getDashboardV2, {});
  // KPIs, block tiles and the alert list all read the scoped rows, so a cycle
  // change moves every number on this page together.
  const cycleScope = useCycleScope();
  const setCycleScope = useSetCycleScope();
  const fast = useQuery(api.ops.listFacilityRowsFast, { cycle: cycleScope });
  const navigate = useNavigate();

  const sectionLayout = useDashboardLayout();

  /* ---- global filters (applied to the whole dashboard) ---- */
  const [blockFilter, setBlockFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  /** Which filters sit in the universal bar (a deleted chip stays deleted). */
  const [barKeys, setBarKeys] = useState<string[]>(["block", "type", "status"]);
  const [alertsOpen, setAlertsOpen] = useState(false);
  /** Stage drilldown — "needsAttention" opens the Part 3 needs-attention
   *  list rather than a single pipeline stage. */
  const [stageOpen, setStageOpen] = useState<PipelineStage | "needsAttention" | null>(null);
  const [moduleKey, setModuleKey] = useState<string>("all");
  const [fabOpen, setFabOpen] = useState(false);

  const settings = useMemo<LifecycleSettings>(
    () => ({
      ...DEFAULT_SETTINGS,
      ...(((data?.settings ?? {}) as Record<string, unknown>) as Partial<LifecycleSettings>),
    }),
    [data],
  );
  const today = todayLocalIso();
  // Part 3 — fiscal-year labels follow today's date (Apr–Mar), never a
  // hard-coded "2025-26".
  const fyStart = currentFyStart(today);
  const currentFyLabel = fiscalYearLabel(fyStart);
  const previousFyLabel = fiscalYearLabel(fyStart - 1);
  const isBlockScopedForHeader =
    (data?.role ?? "viewer") === "entry" && !!data?.myBlockNames?.length;

  /* ---- one shared derivation per facility row ---- */
  const flagged = useMemo<Flagged[]>(() => {
    if (!fast) return [];
    return fast.rows.map((r) => {
      const facility = { ...r.facility, eligibility: r.facility.eligibility ?? "" };
      const view = deriveLifecycleView(
        facility,
        toSaLike(r.sa),
        toNqasLike(r.nqas),
        settings,
        today,
      );
      return { ...r, view };
    });
  }, [fast, settings, today]);

  /* ---- filter option sets ---- */
  const blockOptions = useMemo(
    () => (fast ? fast.blocks.map((b) => b.name).sort() : []),
    [fast],
  );
  const typeOptions = useMemo(
    () =>
      [...new Set(flagged.map((f) => f.facility.facilityType))]
        .filter(Boolean)
        .sort(),
    [flagged],
  );
  const statusOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of flagged) {
      counts.set(f.view.currentStatus, (counts.get(f.view.currentStatus) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([status]) => status);
  }, [flagged]);

  const matchesGlobal = (f: Flagged) =>
    multiFilterMatches(f.facility.block, blockFilter) &&
    multiFilterMatches(f.facility.facilityType, typeFilter) &&
    multiFilterMatches(f.view.currentStatus, statusFilter);

  const filtered = useMemo(() => flagged.filter(matchesGlobal), [flagged, blockFilter, typeFilter, statusFilter]);

  /* ---- the exported report's header line: WHICH filters produced it ---- */
  const reportFilters = useMemo(() => {
    const parts: string[] = [];
    if (blockFilter.length) parts.push(`Block = ${blockFilter.join(", ")}`);
    if (typeFilter.length) parts.push(`Type = ${typeFilter.join(", ")}`);
    if (statusFilter.length)
      parts.push(`${FACILITY_CURRENT_STATUS_LABEL} = ${statusFilter.join(", ")}`);
    return parts;
  }, [blockFilter, typeFilter, statusFilter]);

  /** Subtitle shared by the PDF, Excel, CSV and print view of the filtered
   *  report — same filters, same count, everywhere. */
  const filteredReportSubtitle = useMemo(
    () =>
      reportSubtitle({
        shown: filtered.length,
        total: flagged.length,
        filters: reportFilters,
      }),
    [filtered.length, flagged.length, reportFilters],
  );

  /* ---- every dashboard section reads one aggregation ---- */
  const agg = useMemo(() => {
    const rows = filtered;
    const total = rows.length;
    const eligible = rows.filter(
      (f) => (f.facility.eligibility ?? "") === "Eligible",
    ).length;
    const quality = rows.filter((f) => f.view.isQualityCertified).length;
    const cond = rows.filter((f) => f.view.isConditional).length;
    const certified = quality + cond;
    const naScheduled = rows.filter((f) => f.view.nqasScheduled).length;
    const dilapidated = rows.filter((f) =>
      (f.building?.buildingStatus ?? "").includes("Dilapidated"),
    ).length;
    const deferred = rows.filter((f) => f.view.isDeferred).length;
    const resultAwaited = rows.filter((f) => f.view.isResultAwaited).length;

    // Pipeline stages (mutually exclusive, shared rule).
    const stageCounts = Object.fromEntries(
      PIPELINE_STAGES.map((s) => [s.key, 0]),
    ) as Record<PipelineStage, number>;
    for (const f of rows) stageCounts[f.view.stage] += 1;

    // Block (or PHC for block logins) completion segments.
    const isBlockScoped =
      (data?.role ?? "viewer") === "entry" && !!data?.myBlockNames?.length;
    const grouped = new Map<
      string,
      {
        total: number; certified: number; conditional: number;
        dueSoon: number; inProgress: number; notStarted: number; deferred: number;
      }
    >();
    for (const f of rows) {
      if (
        (data?.role ?? "viewer") === "entry" &&
        !!data?.myBlockNames?.length &&
        !data.myBlockNames.includes(f.facility.block)
      )
        continue;
      const key = isBlockScoped ? f.facility.phc : f.facility.block;
      const g =
        grouped.get(key) ??
        {
          total: 0, certified: 0, conditional: 0,
          dueSoon: 0, inProgress: 0, notStarted: 0, deferred: 0,
        };
      g.total += 1;
      g[f.view.segment] += 1;
      grouped.set(key, g);
    }
    const blocks = [...grouped.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort(
        (a, b) =>
          b.total > 0 && a.total > 0
            ? (b.certified + b.conditional) / b.total -
              (a.certified + a.conditional) / a.total
            : b.total - a.total,
      );

    // Alerts — validity windows of certified facilities within the filtered
    // scope. Overdue first (red), then due-soon (amber).
    const lead = settings.recertificationAlertLeadDays ?? 30;
    const alertRows: {
      f: Flagged;
      days: number;
      kind: "overdue" | "due";
    }[] = [];
    for (const f of rows) {
      if (
        !(f.view.isQualityCertified || f.view.isConditional) ||
        !f.nqas?.validityDate
      )
        continue;
      const days = daysTo(f.nqas.validityDate, today);
      if (days < 0) alertRows.push({ f, days, kind: "overdue" });
      else if (days <= lead) alertRows.push({ f, days, kind: "due" });
    }
    alertRows.sort((a, b) =>
      a.kind !== b.kind ? (a.kind === "overdue" ? -1 : 1) : a.days - b.days,
    );

    // Scheduled timeline (upcoming assessments grouped by week).
    const { scheduled, recert } = splitScheduledLists({ rows: rows as FacilityRowFast[] });
    const up = scheduled.filter((x) => x.days == null || x.days >= 0);
    const overdueAssess = scheduled.filter((x) => x.days != null && x.days < 0);

    // Tabbed lists.
    const docInProgress = new Set(settings.generalDocStatuses.slice(1));
    docInProgress.add("NA Scheduled");
    docInProgress.add("NA Completed & Awaiting Results");

    const recertDue = recert.map((x) => ({ x, days: x.days }));

    const conditionalRows = rows
      .filter((f) => f.view.isConditional)
      .sort(
        (a, b) =>
          (a.nqas?.validityDate ?? "9").localeCompare(b.nqas?.validityDate ?? "9"),
      );
    const resultAwRows = rows
      .filter((f) => f.view.isResultAwaited)
      .sort(
        (a, b) =>
          a.facility.block.localeCompare(b.facility.block) ||
          a.facility.name.localeCompare(b.facility.name),
      );
    const docRows = rows
      .filter((f) => f.sa?.generalDocStatus)
      .sort(
        (a, b) =>
          (settings.generalDocStatuses.indexOf(a.sa!.generalDocStatus as string) + 1 ||
            99) -
            (settings.generalDocStatuses.indexOf(b.sa!.generalDocStatus as string) + 1 ||
              99) ||
          a.facility.name.localeCompare(b.facility.name),
      );
    const eligiblePendingRows = rows.filter(
      (f) =>
        (f.facility.eligibility ?? "") === "Eligible" &&
        f.view.currentStatus === "SA Not Yet Initiated" &&
        !(
          f.sa?.generalDocStatus && docInProgress.has(f.sa.generalDocStatus)
        ),
    );

    // Status-distribution module counts (same rules as the server).
    const distCounts = (key: string): { status: string; count: number }[] => {
      const counts = new Map<string, number>();
      for (const f of rows) {
        let status: string;
        if (key === "all") status = f.view.currentStatus;
        else if (key === "cert")
          status =
            f.view.certResult ??
            (f.view.currentStatus.startsWith("Deferred")
              ? "Deferred"
              : "Not Recorded");
        else if (key === "na")
          status = f.view.nqasScheduled
            ? "Scheduled"
            : f.nqas?.status === "Completed" ||
                (f.view.certResult && f.nqas?.scorePercent != null)
              ? "Completed"
              : f.nqas?.certificationStatus === "Result Awaited" ||
                  f.view.currentStatus === "Result Awaited"
                ? "Result Awaited"
                : f.nqas
                  ? "Pending"
                  : "Not Started";
        else if (key === "sa") status = f.sa?.status ?? "No Entry";
        else if (key === "building")
          status = f.building?.buildingStatus || "Not Recorded";
        else status = f.noc ? (f.noc.status ?? "Not Obtained") : "Not Obtained";
        counts.set(status, (counts.get(status) ?? 0) + 1);
      }
      return [...counts.entries()]
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count);
    };

    // Part 3 — "Needs attention": distinct facilities with an expired
    // certificate, expired Fire NOC, overdue surveillance or a dilapidated
    // building. One facility appears once even when several apply.
    const needsAttention = rows.filter((f) => {
      const expiredCert =
        (f.view.isQualityCertified || f.view.isConditional) &&
        !!f.nqas?.validityDate &&
        f.nqas.validityDate < today;
      const nocExpired =
        (f.noc?.status ?? "") === "Expired";
      const surveillanceOverdue =
        !!f.nqas?.surveillanceDue1 &&
        !f.nqas?.surveillanceDone1 &&
        f.nqas.surveillanceDue1 < today;
      const buildingDilapidated = (f.building?.buildingStatus ?? "").includes(
        "Dilapidated",
      );
      return expiredCert || nocExpired || surveillanceOverdue || buildingDilapidated;
    });

    // Part 3 — fiscal-year certifications (by certification date, Apr–Mar).
    const fyStart = currentFyStart(today);
    const fyCertRows = rows.filter(
      (f) =>
        (f.view.isQualityCertified || f.view.isConditional) &&
        !!f.nqas?.certificationDate &&
        fyOf(f.nqas.certificationDate) === fyStart,
    );
    const fyPrevRows = rows.filter(
      (f) =>
        (f.view.isQualityCertified || f.view.isConditional) &&
        !!f.nqas?.certificationDate &&
        fyOf(f.nqas.certificationDate) === fyStart - 1,
    );

    // Part 0 §2 — hold-a-certificate vs the Certified stage reconciliation.
    const holdExpiredRows = rows.filter(
      (f) =>
        (f.view.isQualityCertified || f.view.isConditional) &&
        f.view.stage !== "certified",
    );
    const certReconciliation =
      holdExpiredRows.length === 0
        ? null
        : `${certified} hold a certificate: ${stageCounts.certified} in Certified stage + ${holdExpiredRows.length} in other stage${holdExpiredRows.length === 1 ? "" : "s"} (${holdExpiredRows.slice(0, 6).map((f) => f.facility.name).join(", ")}${holdExpiredRows.length > 6 ? "…" : ""}).`;

    return {
      total, eligible, quality, cond, certified, naScheduled,
      dilapidated, deferred, resultAwaited, stageCounts, blocks,
      isBlockScoped, alertRows, scheduled, recert, overdueAssess, up,
      recertDue, conditionalRows, resultAwRows, docRows, eligiblePendingRows,
      distCounts, needsAttention, certifiedInCurrentFy: fyCertRows.length,
      certifiedInPreviousFy: fyPrevRows.length, certReconciliation,
      certifiedPct: percentOf(certified, total),
    };
  }, [filtered, settings, data, today]);

  /* ---- Progress breakdown (one shared model; the card renders it) ----
     Every count the card shows — bars, heatmap, size & share, exports and
     the drill-down links — comes from this single `buildBreakdown` call,
     rebuilt only when the filtered rows or a control actually change. */
  const bdFacilities = useMemo(
    (): BreakdownFacility[] =>
      filtered.map((f) => ({
        block: f.facility.block,
        phc: f.facility.phc,
        facilityType: f.facility.facilityType,
        currentStatus: f.view.currentStatus,
        certStatus: f.nqas?.certificationStatus ?? null,
        eligibility: f.facility.eligibility ?? null,
        docStatus: f.sa?.generalDocStatus ?? null,
        validityDate: f.nqas?.validityDate ?? null,
        surveillanceDue1: f.nqas?.surveillanceDue1 ?? null,
        surveillanceDone1: f.nqas?.surveillanceDone1 ?? null,
        surveillanceDue2: f.nqas?.surveillanceDue2 ?? null,
        surveillanceDone2: f.nqas?.surveillanceDone2 ?? null,
      })),
    [filtered],
  );
  const { state: bdState, patch: setBdState } = useBreakdownUrlState();
  const breakdown = useMemo(
    () =>
      buildBreakdown(bdFacilities, {
        dimension: bdState.dim,
        denominator: bdState.denom,
        minGroupSize: MIN_BEST_SIZE,
        today,
        leadDays: settings.recertificationAlertLeadDays ?? 30,
      }),
    [bdFacilities, bdState.dim, bdState.denom, settings, today],
  );

  const actionsCount =
    agg.recertDue.filter((x) => x.days != null && x.days < 0).length +
    agg.recertDue.filter((x) => x.days != null && x.days >= 0).length +
    agg.deferred +
    agg.resultAwRows.length;

  const loading = data === undefined || fast === undefined;
  const hasFacilities = agg.total > 0 || (fast?.rows.length ?? 0) > 0;
  const pctCertified =
    agg.eligible > 0 ? Math.round((agg.certified / agg.eligible) * 100) : 0;
  const lastUpdatedText = data?.lastUpdated
    ? toDisplayDateTime(data.lastUpdated)
    : null;

  /* ---- WhatsApp share text ---- */
  const shareText = () => {
    const lines = [
      "🏥 NQAS Tracker — Tirupathur",
      `Total: ${agg.total} facilities · Eligible: ${agg.eligible}`,
      `Certified: ${agg.certified} (${pctCertified}% of eligible)`,
      `Action needed: ${actionsCount} (Recert due ${agg.recertDue.length}, Result awaited ${resultCount}, Deferred ${agg.deferred})`,
      `Sent ${dateStamp()}`,
    ];
    return lines.join("\n");
  };
  const resultCount = agg.resultAwRows.length;

  /* ---- drilldown: child sections redirect the tabbed-list card ---- */
  const listsRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<string>("recert");
  const jumpToLists = (tab: string) => {
    setActiveTab(tab);
    requestAnimationFrame(() =>
      listsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  /* ---- header search ---- */
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const searchHits = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q || !fast) return [];
    return flagged
      .filter((f) => f.facility.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [searchQ, fast, flagged]);

  /** Header sticky-row layout intact: KPI/hero etc. */
  if (loading) {
    return (
      <AppShell title="Dashboard" subtitle="Loading live data…">
        <DashboardSkeleton />
      </AppShell>
    );
  }

  if (!hasFacilities) {
    return (
      <AppShell title="Dashboard">
        <Alert className="glass">
          <ClipboardList className="size-4" />
          <AlertTitle>No facilities yet</AlertTitle>
          <AlertDescription>
            {data.role === "admin"
              ? "Add facilities manually from the Facility Master List or migrate your spreadsheet via Bulk Import."
              : "No facilities have been added for your assigned blocks yet. Contact your State Admin."}
          </AlertDescription>
        </Alert>
      </AppShell>
    );
  }

  const activeFiltersCount = [
    blockFilter,
    typeFilter,
    statusFilter,
  ].filter((f) => f.length > 0).length;
  const overdueCount = agg.alertRows.filter((a) => a.kind === "overdue").length;
  const dueCount = agg.alertRows.filter((a) => a.kind === "due").length;

  return (
    <AppShell
      title="Dashboard"
      subtitle={
        data.myBlockNames
          ? `Showing your assigned blocks: ${data.myBlockNames.join(", ")}`
          : "Tirupathur district · NQAS certification progress"
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {/* Global facility search — jump straight to a profile */}
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="size-11 shrink-0" aria-label="Search facility">
                <Search className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-2">
              <Input
                autoFocus
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search facility name…"
                className="h-10"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchHits[0]) {
                    navigate(`/facilities/${searchHits[0].facility._id}`);
                    setSearchOpen(false);
                    setSearchQ("");
                  }
                }}
              />
              <div className="mt-2 max-h-72 overflow-y-auto">
                {searchQ.trim() && searchHits.length === 0 && (
                  <p className="px-2 py-3 text-sm text-muted-foreground">
                    No facility matches “{searchQ}”.
                  </p>
                )}
                {searchHits.map((f) => (
                  <Link
                    key={f.facility._id}
                    to={`/facilities/${f.facility._id}`}
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQ("");
                    }}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm hover:bg-accent"
                  >
                    <span className="min-w-0 truncate font-medium">
                      {f.facility.name}
                    </span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {f.facility.block}
                    </span>
                  </Link>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              window.open(
                `https://wa.me/?text=${encodeURIComponent(shareText())}`,
                "_blank",
                "noopener,noreferrer",
              );
            }}
            data-tip="Share the current summary on WhatsApp"
          >
            <MessageCircle className="size-4" />
            <span className="hidden sm:inline">Share</span>
          </Button>

          {/* Single download entry point for every dashboard list */}
          <DashboardDownloadMenu
            visibleBlocks={agg.blocks}
            scope={agg.isBlockScoped ? "PHC" : "Block"}
            conditionalityItems={data.conditionalityList.items}
            resultAwaitedItems={data.resultAwaitedList.items}
            docItems={filtered
              .filter((f) => f.sa?.generalDocStatus)
              .map((f) => ({
                name: f.facility.name,
                block: f.facility.block,
                phc: f.facility.phc,
                facilityType: f.facility.facilityType,
                docStatus: f.sa!.generalDocStatus as string,
              }))}
            eligiblePendingItems={data.eligiblePending.items}
            scheduledRows={agg.scheduled}
            recertRows={agg.recert}
            filteredRows={filtered}
            subtitle={filteredReportSubtitle}
          />

          {agg.up.filter((x) => x.days === 0 && x.kind === "NQAS Assessment").length > 0 && (
            <a
              href="#scheduled"
              className="glass inline-flex items-center gap-1.5 rounded-lg border border-teal-300/60 bg-teal-50/70 px-3 py-1.5 text-xs font-medium text-teal-900 hover:bg-teal-50 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-100"
              data-tip="Open today's assessments in the Upcoming schedule"
            >
              <CalendarClock className="size-3.5" />
              Today: {agg.up.filter((x) => x.days === 0 && x.kind === "NQAS Assessment").length}{" "}
              NQAS visit
              {agg.up.filter((x) => x.days === 0 && x.kind === "NQAS Assessment").length === 1 ? "" : "s"}
            </a>
          )}
          <span
            className="glass hidden items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs text-muted-foreground sm:inline-flex"
            data-tip="Newest change across facilities, assessments, documents and audit history"
          >
            <History className="size-3.5" />
            Updated
            <b className="font-semibold text-foreground">{lastUpdatedText}</b>
          </span>
        </div>
      }
    >
      <DashboardSectionsProvider
        controls={
          (data.settings as Record<string, unknown>).dashboardSectionControls ===
          true
        }
        value={sectionLayout}
      >
        {/* The quarterly-IA reminder — hidden entirely when every ended
            quarter is reported (IaReminderBanner renders null then). */}
        <IaReminderBanner />
        {/* ============ 1. ACTION ALERTS FIRST ============ */}
        <DashboardSection id="alerts">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={cn(
              "mb-6 rounded-2xl border p-4",
              overdueCount > 0
                ? "border-rose-300/70 bg-rose-50/70 dark:border-rose-500/30 dark:bg-rose-500/10"
                : dueCount > 0
                  ? "border-amber-300/70 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-500/10"
                  : "border-emerald-300/60 bg-emerald-50/60 dark:border-emerald-500/25 dark:bg-emerald-500/10",
            )}
          >
            <button
              type="button"
              className="flex w-full items-center gap-3 text-left"
              onClick={() => setAlertsOpen((o) => !o)}
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full",
                  overdueCount > 0
                    ? "bg-rose-500/15 text-rose-600"
                    : dueCount > 0
                      ? "bg-amber-500/15 text-amber-600"
                      : "bg-emerald-500/15 text-emerald-600",
                )}
              >
                <TriangleAlert className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <b className="text-sm">
                    {overdueCount > 0 || dueCount > 0
                      ? `${dueCount} facilities due for recertification, ${overdueCount} overdue`
                      : "No certifications expiring in the alert window"}
                  </b>
                  {overdueCount > 0 && (
                    <Badge className="animate-pulse border-rose-300 bg-rose-100 text-rose-800">
                      {overdueCount} overdue
                    </Badge>
                  )}
                </span>
                <span className="block text-xs text-muted-foreground">
                  Tap to {alertsOpen ? "hide" : "open"} the full list
                </span>
              </span>
              {alertsOpen ? (
                <ChevronUp className="size-5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-5 shrink-0 text-muted-foreground" />
              )}
            </button>

            {alertsOpen && (
              <div className="mt-3 space-y-2">
                {agg.alertRows.length === 0 && (
                  <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
                    Nothing expiring within {settings.recertificationAlertLeadDays}{" "}
                    days — great news.
                  </p>
                )}
                {agg.alertRows.map(({ f, days, kind }) => (
                  <div
                    key={f.facility._id}
                    className={cn(
                      "flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background/70 px-3 py-2 text-sm transition-shadow hover:shadow-sm",
                      kind === "overdue"
                        ? "border-rose-300/60"
                        : "border-amber-300/60",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <FacilityCell facility={f.facility} />
                      <span className="text-xs text-muted-foreground">
                        Validity ends {toDisplayDate(f.nqas?.validityDate)}
                      </span>
                    </div>
                    {kind === "overdue" ? (
                      <span className="animate-pulse rounded-full border border-rose-300 bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800">
                        Overdue {humanOverdue(-days)}
                      </span>
                    ) : (
                      <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        Due in {days} day{days === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </DashboardSection>

        {/* Global filters — one universal bar. The cycle control scopes every
            tile, chart and export below ("All cycles" is hidden here:
            summaries would double-count a facility that has two cycles). */}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <CycleFilter allowAll={false} />
        </div>
        <UniversalFilterBar
          pageKey="dashboard"
          fields={
            [
              {
                key: "block",
                label: "Block",
                type: "select",
                group: "Identity",
                onThisPage: true,
                options: blockOptions.map((b) => ({ value: b, label: b })),
              },
              {
                key: "type",
                label: "Facility Type",
                type: "select",
                group: "Identity",
                onThisPage: true,
                options: typeOptions.map((t) => ({ value: t, label: t })),
              },
              {
                key: "status",
                label: FACILITY_CURRENT_STATUS_LABEL,
                type: "select",
                group: "Certification",
                onThisPage: true,
                options: statusOptions.map((s) => ({ value: s, label: s })),
              },
            ] as FilterField[]
          }
          value={{
            barKeys,
            filters: [
              { key: "block", op: "in", values: blockFilter },
              { key: "type", op: "in", values: typeFilter },
              { key: "status", op: "in", values: statusFilter },
            ] as ActiveFilter[],
            match: "all",
          }}
          onChange={(next) => {
            setBarKeys(next.barKeys);
            const values = (key: string) => next.filters.find((f) => f.key === key)?.values ?? [];
            setBlockFilter(values("block"));
            setTypeFilter(values("type"));
            setStatusFilter(values("status"));
          }}
          summary={`Showing ${filtered.length} of ${flagged.length} facilities`}
        />

        {/* ============ 2. HERO KPI STRIP ============ */}
        <DashboardSection id="kpi">
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard
              label="Total facilities"
              tip="Every facility in scope for this login — eligible and non-eligible alike."
              value={agg.total}
              icon={<ClipboardList className="size-4" />}
              onClick={() => jumpToLists("eligible")}
              index={0}
            />
            <KpiCard
              label="NQAS eligible"
              tip="Facilities that meet NQAS eligibility (they can be assessed and certified)."
              value={agg.eligible}
              icon={<ShieldCheck className="size-4" />}
              suffix={`${agg.total > 0 ? Math.round((agg.eligible / agg.total) * 100) : 0}% of total`}
              onClick={() => jumpToLists("eligible")}
              index={1}
            />
            <KpiCard
              label="Total certified"
              tip="Quality Certified + Certified with Conditionality — the only two counts that make up “certified”."
              value={agg.certified}
              icon={<Award className="size-4" />}
              suffix={`${pctCertified}% of eligible`}
              ring={<PctRing pct={pctCertified} size={40} />}
              onClick={() =>
                setStatusFilter([
                  "Certified — Surveillance Due",
                  "Certified with Conditionality",
                ])
              }
              index={2}
            />
            <KpiCard
              label="Action needed"
              tip="Recertification due (incl. overdue) + Result awaited + Deferred — facilities that require follow-up now."
              value={actionsCount}
              icon={<TriangleAlert className="size-4" />}
              tone="text-rose-600"
              suffix={`${overdueCount} overdue`}
              onClick={() => jumpToLists("recert")}
              index={3}
            />
          </div>

          {/* Secondary KPI chips */}
          <div className="mb-6 flex flex-wrap gap-2">
            <KpiChip
              label="Conditional"
              count={agg.cond}
              dot="oklch(0.78 0.14 85)"
              onClick={() => jumpToLists("conditional")}
            />
            <KpiChip
              label="NA Scheduled"
              count={agg.naScheduled}
              dot="oklch(0.58 0.14 250)"
              onClick={() =>
                setStatusFilter(
                  statusOptions.filter((s) => s === "NA Scheduled"),
                )
              }
            />
            <KpiChip
              label="Deferred"
              count={agg.deferred}
              dot="oklch(0.6 0.2 25)"
              onClick={() => setStatusFilter(["Deferred — Cooling Period"])}
            />
            <KpiChip
              label="Dilapidated"
              count={agg.dilapidated}
              dot="oklch(0.65 0.22 20)"
            />
            <KpiChip
              label="Result awaited"
              count={resultCount}
              dot="oklch(0.72 0.16 60)"
              onClick={() => jumpToLists("result")}
            />
          </div>
        </DashboardSection>

        {/* ============ 2b. OVERVIEW (Part 3) — tiles above the pipeline ============ */}
        <DashboardSection id="overview">
          <Card className="glass mb-6">
            <CardHeader className="space-y-0">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Overview</CardTitle>
                <InfoTip tip="Headline counts for this login's scope. Each tile opens the matching facility list. Data as of the newest change in the workspace (shown top-right)." />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {isBlockScopedForHeader ? "Your assigned blocks" : ""}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                <OverviewTile
                  label="Certified %"
                  icon={<Award className="size-4" />}
                  tip={`Headline “hold a certificate” share of the whole scope (${agg.certified} of ${agg.total}).`}
                  value={agg.certifiedPct != null ? formatPercent(agg.certifiedPct) : ""}
                  sub={`${agg.certified} of ${agg.total} hold a certificate`}
                  onClick={() => jumpToLists("certified")}
                  index={0}
                />
                <OverviewTile
                  label="Quality Certified"
                  icon={<ShieldCheck className="size-4" />}
                  tip="Facilities that passed with no conditions attached."
                  value={agg.quality}
                  onClick={() => jumpToLists("eligible")}
                  index={1}
                />
                <OverviewTile
                  label="With conditionality"
                  icon={<ClipboardList className="size-4" />}
                  tip="Certified with conditions to close — the conditional list."
                  value={agg.cond}
                  onClick={() => jumpToLists("conditional")}
                  index={2}
                />
                <OverviewTile
                  label={`Certified in FY ${currentFyLabel} (to date)`}
                  icon={<CalendarClock className="size-4" />}
                  tip="Counted by certification date inside this financial year (April–March). Previous FY shown below for comparison."
                  value={agg.certifiedInCurrentFy}
                  sub={`FY ${previousFyLabel}: ${agg.certifiedInPreviousFy}`}
                  index={3}
                />
                <OverviewTile
                  label="Not certified"
                  icon={<TriangleAlert className="size-4" />}
                  tip="Facilities with no certification yet — the full remaining workload."
                  value={agg.total - agg.certified}
                  tone="text-rose-600"
                  onClick={() => jumpToLists("recert")}
                  index={4}
                />
                <OverviewTile
                  label="Needs attention"
                  icon={<FilterX className="size-4" />}
                  tip="Distinct facilities with an expired certificate, expired Fire NOC, overdue surveillance or a dilapidated building."
                  value={agg.needsAttention.length}
                  tone="text-rose-600"
                  onClick={() => setStageOpen("needsAttention")}
                  index={5}
                />
              </div>
              {/* Blocks caption replaces the static "Blocks 7" tile (Part 3 §1). */}
              <p className="mt-3 text-xs text-muted-foreground">
                {agg.blocks.length} blocks · {agg.total} facilities
              </p>
            </CardContent>
          </Card>
        </DashboardSection>

        {/* ============ 3. CERTIFICATION PIPELINE — stepper funnel ============ */}
        <DashboardSection id="pipeline">
          <Card className="glass mb-6">
            <CardHeader className="space-y-0">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Facility Current Status</CardTitle>
                <InfoTip tip={`One stage per facility — the furthest step of the NQAS cycle it has reached. "Not eligible" is a muted chip before the path; only real path stages are numbered. Tap a step to see its facilities.`} />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Tap any step to view the facilities inside it
              </p>
            </CardHeader>
            <CardContent>
              {/* Responsive grid (Part 2 §2): cards wrap by container width —
                  no hidden horizontal scroll. Container queries via the
                  @container class in index.css keep this driven by the card
                  width, not the viewport. */}
              <div
                className="@container"
                style={{ containerType: "inline-size" }}
              >
                <div className="grid grid-cols-2 gap-2 @[900px]:grid-cols-4 @[1200px]:grid-cols-7">
                  {PIPELINE_STAGES.map((stage) => {
                    const count = agg.stageCounts[stage.key];
                    const pct =
                      agg.total > 0
                        ? Math.round((count / agg.total) * 100)
                        : 0;
                    const color =
                      PIPELINE_STAGE_COLORS[stage.key] ??
                      "oklch(0.6 0.05 260)";
                    return (
                      <motion.button
                        key={stage.key}
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setStageOpen(stage.key)}
                        aria-label={`${stage.label}: ${count} facilities, ${pct} percent, open list`}
                        className={cn(
                          "min-w-0 rounded-xl border border-border/60 bg-background/60 p-3 text-left transition-shadow hover:shadow-md",
                          "min-h-11 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
                          count === 0 && "opacity-60",
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                            style={{ background: color }}
                            aria-hidden
                          >
                            {stage.key === "notEligible" ? "–" : stageIndex(stage.key) + 1}
                          </span>
                          <span
                            className="truncate text-xs font-semibold"
                            data-tip={stage.label}
                           data-tip-truncate>
                            {stage.label}
                          </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="text-2xl font-bold tabular-nums">
                            {count}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {pct}%
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/60">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: color }}
                          />
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
              {/* Part 2 §5 — the stage cards always sum to the facility count. */}
              <p className="mt-3 text-xs text-muted-foreground">
                {agg.total} facilities = sum of the 7 stages ✓
              </p>
              {/* Part 0 §2 — the certified reconciliation line. */}
              {agg.certReconciliation && (
                <p className="mt-1 text-xs italic text-muted-foreground">
                  {agg.certReconciliation}
                </p>
              )}
            </CardContent>
          </Card>
        </DashboardSection>

        {/* ============ 4/5. PROGRESS BREAKDOWN — one card, three views ============
            Replaces the old "Progress by block" bar strip (whose bar and
            label disagreed — gold painted both Conditional AND the Result
            awaited segment) and the equal-sized "Facility-type summary"
            tiles. Every number here comes from buildBreakdown through the
            ONE shared model, and the legend colour now matches the segment
            it labels. Excel/PDF moved into the card's own Export menu and
            read the same rows (lib/breakdownExport). */}
        <DashboardSection id="progress">
          <ProgressBreakdownCard
            breakdown={breakdown}
            facilities={bdFacilities}
            state={bdState}
            onState={setBdState}
            dataAsOf={lastUpdatedText}
            isAdmin={data.role === "admin"}
            allowPhc={agg.isBlockScoped}
          />
        </DashboardSection>

        {/* ============ 6. UPCOMING SCHEDULE — timeline ============ */}
        <DashboardSection id="scheduled">
          <ScheduleTimeline
            overdue={agg.overdueAssess}
            upcoming={agg.up}
          />
        </DashboardSection>

        {/* ============ 7. TABBED FACILITY LISTS ============ */}
        <div ref={listsRef} />
        <DashboardSection id="conditionality">              <FacilityListsCard
            active={activeTab}
            onActive={setActiveTab}
            recertRows={agg.recert}
            conditionalRows={agg.conditionalRows}
            resultRows={agg.resultAwRows}
            docRows={agg.docRows}
            eligibleRows={agg.eligiblePendingRows}
            iaRows={filtered.filter((f) => (f.ia?.status ?? "none") !== "none")}
            recertOverdue={agg.recertDue.filter(
              (x) => x.days != null && x.days < 0,
            ).length}
          />
        </DashboardSection>

        {/* ============ 8. STATUS DISTRIBUTION + ONE-LINE HINTS ============ */}
        <DashboardSection id="statusWhatNext">
          <Card className="glass mb-6">
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Status distribution</CardTitle>
                <InfoTip tip="Statuses per device area report — counts follow the global filters above." />
              </div>
              <Select value={moduleKey} onValueChange={setModuleKey}>
                <SelectTrigger className="glass-input h-9 w-52 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All — Overall lifecycle</SelectItem>
                  {(data.moduleDistributions ?? []).map((m) => (
                    <SelectItem key={m.key} value={m.key}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {(() => {
                const counts = agg.distCounts(moduleKey);
                const totalDist = counts.reduce((a, x) => a + x.count, 0);
                if (totalDist === 0)
                  return (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No facilities in this filter.
                    </p>
                  );
                return (
                  <div className="space-y-3">
                    {counts.map(({ status, count }) => {
                      const pct = Math.round((count / totalDist) * 100);
                      const tone = statusToneOf(status);
                      const hint = hintFor(status);
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setStatusFilter([status])}
                          className="w-full rounded-lg px-1 py-1 text-left transition-colors hover:bg-accent/40"
                        >
                          <div className="flex items-center gap-3">
                            <StatusBadge status={status} className="shrink-0" />
                            <div className="min-w-2 flex-1">
                              <div
                                className="h-2.5 overflow-hidden rounded-full bg-muted/60"
                                role="progressbar"
                                aria-valuenow={pct}
                                aria-valuemin={0}
                                aria-valuemax={100}
                              >
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${pct}%`,
                                    background: TONE_BG[tone],
                                  }}
                                />
                              </div>
                            </div>
                            <span className="w-24 text-right text-xs font-semibold tabular-nums">
                              {count} ({pct}%)
                            </span>
                          </div>
                          {hint && (
                            <p className="mt-0.5 pl-0.5 text-[11px] text-muted-foreground">
                              💡 {hint}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </DashboardSection>
      </DashboardSectionsProvider>

      {/* Pipeline stage drilldown dialog */}
      <Dialog
        open={stageOpen !== null}
        onOpenChange={(o) => !o && setStageOpen(null)}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {stageOpen === "needsAttention"
                ? "Needs attention"
                : stageOpen
                  ? PIPELINE_STAGES.find((s) => s.key === stageOpen)?.label
                  : ""}
            </DialogTitle>
            <DialogDescription>
              {stageOpen === "needsAttention"
                ? agg.needsAttention.length
                : stageOpen
                  ? agg.stageCounts[stageOpen]
                  : 0}{" "}
              facilities · list follows the global filters
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            {filtered
              .filter((f) =>
                stageOpen === "needsAttention"
                  ? agg.needsAttention.some(
                      (n) => n.facility._id === f.facility._id,
                    )
                  : f.view.stage === stageOpen,
              )
              .slice(0, 300)
              .map((f) => (
                <div
                  key={f.facility._id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm hover:bg-accent"
                >
                  <div className="min-w-0 flex-1">
                    <FacilityCell facility={f.facility} />
                  </div>
                  <StatusBadge status={f.view.currentStatus} className="max-w-40 truncate" />
                </div>
              ))}
            {(stageOpen === "needsAttention"
              ? agg.needsAttention.length
              : agg.stageCounts[stageOpen ?? "certified"]) > 300 && (
              <p className="pt-2 text-xs text-muted-foreground">
                Showing the first 300 — export for the full list.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Part 2 §6 — the content reserves bottom padding equal to the FAB
          plus clearance, so the floating button never covers content. */}
      <div className="pb-20 md:pb-6" aria-hidden />
      <FloatingActions
        open={fabOpen}
        setOpen={setFabOpen}
        todayVisits={
          agg.up.filter((x) => x.days === 0 && x.kind === "NQAS Assessment").length
        }
        expiredCerts={agg.alertRows.filter((x) => x.kind === "overdue").length}
        onReport={() =>
          // THE FIX: header and rows both come from the one column model — the
          // call site no longer trims the header list (`FILTERED_HEADERS.slice(1)`
          // is gone), so every value sits under its own header again.
          exportPdf(
            `dashboard-summary-${dateStamp()}.pdf`,
            "Dashboard summary — current filter",
            filteredReportHeaders(),
            filteredReportRows(filtered),
            filteredReportSubtitle,
            filteredReportPdfOptions(),
          )
        }
      />
    </AppShell>
  );
}

/* ================================================================
 *  Sub-components
 * ================================================================ */

/** Part 2 §7 — a block needs at least this many facilities before "★ Best"
 *  is meaningful; smaller groups are labelled "Small group (n=…)" (admin
 *  window; the brief's default 10). Also the breakdown's small-group
 *  window (lib/breakdown `minGroupSize`). */
const MIN_BEST_SIZE = 10;

function KpiCard({
  label,
  tip,
  value,
  icon,
  suffix,
  tone,
  ring,
  onClick,
  index = 0,
}: {
  label: string;
  tip: string;
  value: number;
  icon: React.ReactNode;
  suffix?: string;
  tone?: string;
  ring?: React.ReactNode;
  onClick?: () => void;
  index?: number;
}) {
  const shown = useCountUp(value);
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.05, 0.2) }}
      whileHover={{ y: -3 }}
      className="glass flex min-h-24 snap-start flex-1 flex-col rounded-2xl p-4 text-left shadow-sm transition-shadow hover:shadow-lg hover:shadow-teal-950/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
    >
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
        <InfoTip tip={tip} />
      </span>
      <span className="mt-1 flex items-center justify-between gap-2">
        <span className={cn("text-3xl font-bold tabular-nums", tone)}>
          {shown}
        </span>
        {ring}
      </span>
      {suffix && (
        <span className="mt-0.5 text-[11px] text-muted-foreground">{suffix}</span>
      )}
    </motion.button>
  );
}

function KpiChip({
  label,
  count,
  dot,
  onClick,
}: {
  label: string;
  count: number;
  dot: string;
  onClick?: () => void;
}) {
  const shown = useCountUp(count);
  const Cmp = onClick ? motion.button : motion.span;
  const props = onClick ? { type: "button" as const, onClick } : undefined;
  return (
    <Cmp
      {...props}
      whileHover={onClick ? { y: -2 } : undefined}
      className={cn(
        "glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs shadow-sm",
        onClick && "hover:shadow-md",
      )}
    >
      <span
        className="size-2.5 rounded-full"
        style={{ background: dot }}
        aria-hidden
      />
      {label}
      <b className="font-bold tabular-nums">{shown}</b>
    </Cmp>
  );
}

/** Upcoming assessments as a timeline grouped by week, with countdown chips. */
function ScheduleTimeline({
  overdue,
  upcoming,
}: {
  overdue: {
    r: FacilityRowFast;
    date: string | null;
    kind: string;
    days: number | null;
  }[];
  upcoming: {
    r: FacilityRowFast;
    date: string | null;
    kind: string;
    days: number | null;
  }[];
}) {
  const [visitType, setVisitType] = useState<"nqas" | "sa" | "surv" | "all">("nqas");
  const matchesType = (x: { kind: string }) =>
    visitType === "all"
      ? true
      : visitType === "nqas"
        ? x.kind === "NQAS Assessment"
        : visitType === "sa"
          ? x.kind === "State Assessment"
          : x.kind.startsWith("Surveillance");
  const visibleUpcoming = upcoming.filter(matchesType);
  const visibleOverdue = overdue.filter(matchesType);

  const groups = useMemo(() => {
    const withDate = visibleUpcoming.filter((x) => x.days != null);
    const undated = visibleUpcoming.filter((x) => x.days == null);
    const g: Record<string, typeof withDate> = {
      Tomorrow: [],
      "This week": [],
      "Next week": [],
      "Later": [],
    };
    for (const x of withDate) {
      const d = x.days as number;
      if (d === 0) continue; // today has its own hero band
      (d === 1 ? g.Tomorrow : d <= 6 ? g["This week"] : d <= 13 ? g["Next week"] : g["Later"]).push(x);
    }
    for (const k of Object.keys(g)) g[k].sort((a, b) => (a.days ?? 0) - (b.days ?? 0));
    return { groups: g, undated, overdue: visibleOverdue };
  }, [upcoming, overdue, visitType]);

  const todayRows = visibleUpcoming.filter((x) => x.days === 0);

  // Keep the card (and its type switch) when another visit type has rows.
  if (overdue.length + upcoming.length === 0) return null;

  const Row = ({
    x,
    overdueChip,
  }: {
    x: {
      r: FacilityRowFast;
      date: string | null;
      endDate?: string | null;
      kind: string;
      days: number | null;
    };
    overdueChip?: boolean;
  }) => (
    <Link
      to={`/facilities/${x.r.facility._id}`}
      className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-2.5 transition-shadow hover:shadow-sm"
    >
      <span
        className={cn(
          "size-3 shrink-0 rounded-full border-2",
          overdueChip
            ? "border-rose-600 bg-rose-500"
            : x.days === 0
              ? "animate-pulse border-teal-700 bg-teal-500"
              : "border-slate-400 bg-transparent",
        )}
        aria-label={
          overdueChip ? "Overdue" : x.days === 0 ? "Today" : "Scheduled"
        }
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">
          {x.r.facility.name}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {x.r.facility.facilityType} · {x.r.facility.block} · {x.r.facility.phc} ·{" "}
          {x.date ? weekdayDate(x.date) : "Date not set"}
          {x.r.nqas?.mode ? ` · ${x.r.nqas.mode}` : ""}
          {x.date && x.endDate && x.endDate > x.date
            ? ` · Day ${Math.max(
                1,
                Math.round(
                  (new Date(todayLocalIso() + "T12:00:00").getTime() -
                    new Date(x.date + "T12:00:00").getTime()) /
                    86400000,
                ) + 1,
              )} of ${
                Math.round(
                  (new Date(x.endDate + "T12:00:00").getTime() -
                    new Date(x.date + "T12:00:00").getTime()) /
                    86400000,
                ) + 1
              }`
            : ""}
        </span>
      </span>
      <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
        {x.kind}
      </span>
      {overdueChip ? (
        <span className="animate-pulse rounded-full border border-rose-300 bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
          Overdue {humanOverdue(Math.abs(x.days ?? 0))}
        </span>
      ) : x.days === 0 ? (
        <span className="animate-pulse rounded-full border border-blue-300 bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800">
          Today
        </span>
      ) : x.days == null ? (
        <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
          No date
        </span>
      ) : (
        <span className="rounded-full border border-blue-300/60 bg-blue-100/70 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
          in {x.days}d
        </span>
      )}
    </Link>
  );

  return (
    <Card className="glass mb-6">
      <CardHeader className="space-y-0">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base" data-guide-target="upcoming">
            Upcoming schedule
          </CardTitle>
          <InfoTip tip="Today first, then upcoming visits grouped by week. Overdue visits stay pinned above Today. Status marker: outline = scheduled, pulsing teal = today, red = overdue." />
          <div className="ml-auto flex flex-wrap gap-1" role="tablist" aria-label="Visit type">
            {([
              ["nqas", "NQAS"],
              ["sa", "State Assessment"],
              ["surv", "Surveillance"],
              ["all", "All visits"],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={visitType === id}
                onClick={() => setVisitType(id)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  visitType === id
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground hover:bg-accent",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {todayRows.length === 0 && (() => {
          const next = visibleUpcoming.filter((x) => x.days != null && x.days > 0).sort((a, b) => (a.days ?? 0) - (b.days ?? 0))[0];
          return (
            <p className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              No NQAS assessments today.
              {next ? ` Next: ${next.r.facility.name} on ${weekdayDate(next.date ?? "")}.` : ""}
            </p>
          );
        })()}
        {/* TODAY HERO — always first, never buried in "This week". */}
        {todayRows.length > 0 && (
          <div className="rounded-xl border border-teal-300/70 bg-teal-50/70 p-3 dark:border-teal-500/40 dark:bg-teal-500/10">
            <p className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-teal-900 dark:text-teal-100">
              Today · {weekdayDate(todayLocalIso())} · {todayRows.length}{" "}
              {todayRows.length === 1 ? "visit" : "visits"}
            </p>
            <div className="space-y-1.5">
              {todayRows.map((x) => (
                <Row key={`today-${x.r.facility._id}`} x={x} />
              ))}
            </div>
          </div>
        )}
        {groups.overdue.length > 0 && (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-rose-600">
              <TriangleAlert className="size-3.5" /> Overdue ({groups.overdue.length})
            </p>
            {groups.overdue.map((x) => (
              <Row key={x.r.facility._id} x={x} overdueChip />
            ))}
          </div>
        )}
        {Object.entries(groups.groups).map(([label, rows]) =>
          rows.length ? (
            <div key={label} className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <CalendarClock className="size-3.5" /> {label}
              </p>
              {rows.map((x) => (
                <Row key={x.r.facility._id} x={x} />
              ))}
            </div>
          ) : null,
        )}
        {groups.undated.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Scheduled — no date set
            </p>
            {groups.undated.map((x) => (
              <Row key={x.r.facility._id} x={x} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- Tabbed facility lists ---------------- */

type ListRow = {
  key: string;
  facilityId: string;
  name: string;
  type: string;
  block: string;
  phc: string;
  nin?: string | null;
  date?: string | null;
  chip?: { label: string; cls: string };
  sub?: string | null;
};

type TabDef = {
  id: string;
  label: string;
  count: number;
  rows: ListRow[];
  blockOptions: string[];
  typeOptions: string[];
  export?: React.ReactNode;
};

function FacilityListsCard({
  active,
  onActive,
  recertRows,
  conditionalRows,
  resultRows,
  docRows,
  eligibleRows,
  iaRows,
}: {
  active: string;
  onActive: (tab: string) => void;
  recertRows: {
    r: FacilityRowFast;
    date: string | null;
    kind: string;
    days: number | null;
  }[];
  conditionalRows: Flagged[];
  resultRows: Flagged[];
  docRows: Flagged[];
  eligibleRows: Flagged[];
  /** Facilities with ANY quarterly-IA freshness (the IA tab). */
  iaRows: FacilityRowFast[];
  recertOverdue?: number;
}) {
  const navigate = useNavigate();
  const [pageState, setPageState] = useState<Record<string, number>>({});
  const PAGE = 15;
  const tabs: TabDef[] = useMemo(() => {
    const mk = (
      id: string,
      label: string,
      rows: ListRow[],
    ): TabDef => ({
      id,
      label,
      count: rows.length,
      rows,
      blockOptions: [...new Set(rows.map((r) => r.block))].sort(),
      typeOptions: [...new Set(rows.map((r) => r.type))].sort(),
    });

    const recertList = mk(
      "recert",
      "Recertification Due",
      recertRows.map((x) => ({
        key: x.r.facility._id,
        facilityId: x.r.facility._id,
        name: x.r.facility.name,
        type: x.r.facility.facilityType,
        block: x.r.facility.block,
        phc: x.r.facility.phc,
        nin: x.r.facility.ninNumber,
        date: x.date,
        chip:
          x.days != null && x.days < 0
            ? {
                label: `Overdue ${humanOverdue(-x.days)}`,
                cls: "animate-pulse border-rose-300 bg-rose-100 text-rose-800",
              }
            : x.days === 0
              ? { label: "Today", cls: "border-amber-300 bg-amber-100 text-amber-800" }
              : {
                  label: `in ${x.days}d`,
                  cls: "border-blue-300/60 bg-blue-100/70 text-blue-800",
                },
      })),
    );
    const condList = mk(
      "conditional",
      "Conditional",
      conditionalRows.map((f) => ({
        key: f.facility._id,
        facilityId: f.facility._id,
        name: f.facility.name,
        type: f.facility.facilityType,
        block: f.facility.block,
        phc: f.facility.phc,
        nin: f.facility.ninNumber,
        date: f.nqas?.validityDate,
        sub: f.nqas?.scorePercent != null ? `Certified score ${f.nqas.scorePercent}%` : null,
      })),
    );
    const resultList = mk(
      "result",
      "Result Awaited",
      resultRows.map((f) => ({
        key: f.facility._id,
        facilityId: f.facility._id,
        name: f.facility.name,
        type: f.facility.facilityType,
        block: f.facility.block,
        phc: f.facility.phc,
        nin: f.facility.ninNumber,
        date:
          f.nqas?.scheduledStartDate ??
          f.sa?.actualStartDate ??
          f.sa?.scheduledDate,
        sub: f.sa?.generalDocStatus,
      })),
    );
    const docList = mk(
      "documents",
      "Documents",
      docRows.map((f) => ({
        key: f.facility._id,
        facilityId: f.facility._id,
        name: f.facility.name,
        type: f.facility.facilityType,
        block: f.facility.block,
        phc: f.facility.phc,
        nin: f.facility.ninNumber,
        chip: {
          label: f.sa!.generalDocStatus as string,
          cls: "border-border/60 bg-muted/50 text-foreground/80",
        },
      })),
    );
    const pendingList = mk(
      "eligible",
      "Eligible Pending",
      eligibleRows.map((f) => ({
        key: f.facility._id,
        facilityId: f.facility._id,
        name: f.facility.name,
        type: f.facility.facilityType,
        block: f.facility.block,
        phc: f.facility.phc,
        nin: f.facility.ninNumber,
        sub: f.sa?.generalDocStatus ?? "No documents stage yet",
      })),
    );
    // IA tab — the shared freshness rule (deriveIaStatus, ops.rows.ia) with
    // the last IA date and score where the tracker recorded one.
    const iaList = mk(
      "ia",
      "Internal Assessment",
      iaRows.map((f) => ({
        key: f.facility._id,
        facilityId: f.facility._id,
        name: f.facility.name,
        type: f.facility.facilityType,
        block: f.facility.block,
        phc: f.facility.phc,
        nin: f.facility.ninNumber,
        date: f.ia?.lastDate ?? null,
        sub:
          f.ia?.dueDate != null
            ? f.ia.status === "overdue"
              ? `IA overdue — was due ${f.ia.dueDate}`
              : f.ia.status === "dueSoon"
                ? `IA due ${f.ia.dueDate}`
                : `Next IA due ${f.ia.dueDate}`
            : "No IA cadence recorded",
        chip:
          f.ia?.status === "overdue"
            ? { label: "IA Overdue", cls: "border-rose-300/70 bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300" }
            : f.ia?.status === "dueSoon"
              ? { label: "IA Due Soon", cls: "border-amber-300/70 bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" }
              : { label: "IA Up To Date", cls: "border-emerald-300/70 bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" },
      })),
    );
    return [recertList, condList, resultList, docList, pendingList, iaList];
  }, [recertRows, conditionalRows, resultRows, docRows, eligibleRows, iaRows]);

  const tab = tabs.find((t) => t.id === active) ?? tabs[0];
  const [q, setQ] = useState("");
  const [tabBlock, setTabBlock] = useState<string[]>([]);
  const [tabType, setTabType] = useState<string[]>([]);

  const rows = tab.rows.filter(
    (r) =>
      (q.trim().length === 0 ||
        r.name.toLowerCase().includes(q.trim().toLowerCase())) &&
      multiFilterMatches(r.block, tabBlock) &&
      multiFilterMatches(r.type, tabType),
  );
  const shown = pageState[tab.id] ?? PAGE;
  const visible = rows.slice(0, shown);

  return (
    <Card className="glass mb-6">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">Facility lists</CardTitle>
        <Tabs value={tab.id} onValueChange={onActive}>
          <TabsList className="glass-input h-auto w-full flex-wrap justify-start rounded-xl p-1">
            {tabs.map((t) => (
              <TabsTrigger
                key={t.id}
                value={t.id}
                className="gap-1.5 rounded-lg px-3 py-1.5 text-xs data-[state=active]:shadow-sm"
              >
                {t.label}
                <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary">
                  {t.count}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {/* search + filters for the active tab */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search in ${tab.label.toLowerCase()}…`}
            className="glass-input h-9 w-48 min-w-36 flex-1"
          />
          <FilterDropdown
            label="Block"
            options={tab.blockOptions.map((b) => ({ value: b, label: b }))}
            value={tabBlock}
            onChange={setTabBlock}
            triggerWidth="w-36"
          />
          <FilterDropdown
            label="Type"
            options={tab.typeOptions.map((t) => ({ value: t, label: t }))}
            value={tabType}
            onChange={setTabType}
            triggerWidth="w-36"
          />
          <span className="text-[11px] text-muted-foreground">
            {rows.length} shown
          </span>
        </div>

        <div className="space-y-2">
          {visible.length === 0 && (
            <p className="rounded-xl border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
              No facilities in this list (with the current filters).
            </p>
          )}
          {visible.map((r) => (
            <div
              key={r.key}
              role="link"
              tabIndex={0}
              onClick={() => navigate(`/facilities/${r.facilityId}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(`/facilities/${r.facilityId}`);
                }
              }}
              className="block cursor-pointer rounded-xl border border-border/60 bg-background/60 px-3 py-2.5 transition-shadow hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:grid md:grid-cols-[1fr_auto] md:items-center md:gap-3"
            >
              <div className="min-w-0">
                <FacilityCell
                  facility={{ _id: r.facilityId, name: r.name, facilityType: r.type, block: r.block, phc: r.phc, ninNumber: r.nin }}
                  query={q}
                  onOpen={() => navigate(`/facilities?facility=${encodeURIComponent(r.facilityId)}&section=overview`)}
                />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 md:mt-0 md:justify-end">
                {r.date && (
                  <span className="text-[11px] text-muted-foreground">
                    {toDisplayDate(r.date)}
                  </span>
                )}
                {r.sub && (
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {r.sub}
                  </span>
                )}
                {r.chip && (
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                      r.chip.cls,
                    )}
                  >
                    {r.chip.label}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {rows.length > shown && (
          <div className="mt-3 text-center">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() =>
                setPageState((p) => ({ ...p, [tab.id]: (p[tab.id] ?? PAGE) + PAGE }))
              }
            >
              Load {Math.min(PAGE, rows.length - shown)} more
              <span className="text-[10px] text-muted-foreground">
                ({rows.length - shown} remaining)
              </span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- Skeleton ---------------- */

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy>
      <div className="grid gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="flex items-center justify-center py-2">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    </div>
  );
}

/* ---------------- Floating quick actions ---------------- */

function FloatingActions({
  open,
  setOpen,
  onReport,
  todayVisits = 0,
  expiredCerts = 0,
}: {
  open: boolean;
  setOpen: (o: boolean) => void;
  onReport: () => void;
  /** Counts come from the cached dashboard rows — no server call on open. */
  todayVisits?: number;
  expiredCerts?: number;
}) {
  const [q, setQ] = useState("");
  const settingsQ = useQuery(api.facilities.getAppSettings, {});
  const hiddenKeys = new Set<string>([
    ...(((settingsQ?.settings.hiddenPages as string[] | undefined) ?? []) as string[]),
    ...(((settingsQ?.settings.hiddenCategories as string[] | undefined) ?? []) as string[]),
  ]);
  const isHidden = (to: string) => {
    const path = to.split("?")[0];
    const item = NAV_ITEMS.find((n) => n.to === path);
    return [item?.visibilityKey ?? path.replace(/^\//, ""), path.replace(/^\//, "")].some(
      (key) => hiddenKeys.has(key),
    );
  };
  // `Q` opens the panel from anywhere on the Dashboard (never while typing).
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        !!el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable);
      if (!typing && e.key.toLowerCase() === "q" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  useEffect(() => {
    if (!open) {
      setQ("");
      return;
    }
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);
  // Part 2 §6 — the FAB hides while scrolling DOWN and reappears on scroll
  // up / idle, so it never sits over content the user is reading.
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let lastY = window.scrollY;
    let timer = 0;
    const onScroll = () => {
      const y = window.scrollY;
      const goingDown = y > lastY + 4;
      const goingUp = y < lastY - 4;
      if (goingDown) setHidden(true);
      else if (goingUp) setHidden(false);
      lastY = y;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setHidden(false), 1200);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
    };
  }, []);
  return (
    <div
      aria-hidden={hidden}
      className={cn(
        "fixed bottom-20 right-4 z-40 flex flex-col items-end gap-2 transition-all duration-200 md:bottom-6",
        hidden && "pointer-events-none translate-y-24 opacity-0",
      )}
    >
      {open && (
        <div
          className="glass-strong w-[min(92vw,22rem)] max-h-[70vh] overflow-y-auto rounded-2xl border border-border/60 p-2 shadow-lg"
          role="dialog"
          aria-label="Quick actions"
        >
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type an action…"
            aria-label="Search actions"
            className="mb-2 h-9 w-full rounded-lg border border-border/60 bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {(todayVisits > 0 || expiredCerts > 0) && !q && (
            <>
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Suggested
              </p>
              {todayVisits > 0 && (
                <a
                  href="#scheduled"
                  onClick={() => setOpen(false)}
                  className="flex min-h-10 items-center gap-2 rounded-xl bg-teal-500/10 px-3 py-2 text-sm font-medium text-teal-900 hover:bg-teal-500/15 dark:text-teal-100"
                >
                  <CalendarClock className="size-4" /> {todayVisits} NQAS visit
                  {todayVisits === 1 ? "" : "s"} today · Open
                </a>
              )}
              {expiredCerts > 0 && (
                <Link
                  to="/facilities"
                  onClick={() => setOpen(false)}
                  className="flex min-h-10 items-center gap-2 rounded-xl bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-900 hover:bg-rose-500/15 dark:text-rose-100"
                >
                  <TriangleAlert className="size-4" /> {expiredCerts} certificate
                  {expiredCerts === 1 ? "" : "s"} expired · Start renewals
                </Link>
              )}
            </>
          )}
          {[
            {
              title: "Create",
              items: [
                { label: "Add facility", to: "/facilities?add=1", icon: Plus },
                { label: "Add assessment", to: "/facilities/state-assessment", icon: CalendarClock },
                { label: "Upload documents", to: "/facilities", icon: Upload },
                { label: "Add link", to: "/links?add=1", icon: BookMarked },
              ],
            },
            {
              title: "Import",
              items: [
                { label: "SaQsham document status", to: "/bulk-import/saqsham", icon: ShieldCheck },
                { label: "Internal Assessment scores", to: "/bulk-import/internal-assessment", icon: Target },
                { label: "Facility master", to: "/bulk-import/facility-master", icon: FileSpreadsheet },
                { label: "Links Organiser", to: "/links?import=1", icon: BookMarked },
              ],
            },
            {
              title: "Reports",
              items: [
                { label: "Generate PPT", to: "/generate-ppt", icon: Presentation },
                { label: "Line lists", to: "/facilities/line-lists", icon: FileText },
                { label: "Links Organiser", to: "/links", icon: BookMarked },
              ],
            },
          ].map((section) => {
            const items = section.items.filter(
              (i) =>
                !isHidden(i.to) &&
                `${i.label} ${section.title}`.toLowerCase().includes(q.trim().toLowerCase()),
            );
            if (!items.length) return null;
            return (
              <div key={section.title} className="mt-1">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.title}
                </p>
                {items.map((item) => (
                  <Link
                    key={item.label}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="flex min-h-9 items-center gap-2.5 rounded-xl px-3 py-1.5 text-sm font-medium hover:bg-accent"
                  >
                    <item.icon className="size-4" /> {item.label}
                  </Link>
                ))}
              </div>
            );
          })}
          {`report current filter export`.includes(q.trim().toLowerCase()) && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onReport();
              }}
              className="mt-1 flex min-h-9 w-full items-center gap-2.5 rounded-xl px-3 py-1.5 text-left text-sm font-medium hover:bg-accent"
            >
              <FileText className="size-4" /> Report (current filter)
            </button>
          )}
        </div>
      )}
      {/* Part 2 §6 — a visible label + tooltip so the floating button says
          what it opens; reserves nothing (content below carries the padding). */}
      <Button
        size="lg"
        className="h-14 gap-2 rounded-full px-4 shadow-lg"
        aria-expanded={open}
        aria-label="Quick actions — add assessment, generate PPT or export the current report"
        data-guide-target="quick-actions"
        data-tip="Quick actions — add assessment, generate PPT or export the current report"
        onClick={() => setOpen(!open)}
      >
        {open ? <FilterX className="size-5 rotate-45" /> : <Send className="size-5" />}
        <span className="hidden text-sm font-medium sm:inline">Quick actions</span>
      </Button>
    </div>
  );
}

/* ---------------- Header download menu ---------------- */

function DashboardDownloadMenu({
  visibleBlocks,
  scope,
  conditionalityItems,
  resultAwaitedItems,
  docItems,
  eligiblePendingItems,
  scheduledRows,
  recertRows,
  filteredRows,
  subtitle,
}: {
  visibleBlocks: {
    name: string;
    total: number;
    certified?: number;
    conditional?: number;
    inProgress?: number;
    dueSoon?: number;
    deferred?: number;
    notStarted?: number;
  }[];
  scope: string;
  conditionalityItems: Parameters<typeof exportConditionalityList>[0];
  resultAwaitedItems: Parameters<typeof exportResultAwaitedList>[0];
  docItems: {
    name: string;
    block: string;
    phc: string;
    facilityType: string;
    docStatus: string;
  }[];
  eligiblePendingItems: Parameters<typeof exportEligiblePending>[0];
  scheduledRows: {
    r: {
      facility: { name: string; block: string; facilityType: string };
      sa: { scorePercent: number | null } | null;
      nqas: { scorePercent: number | null } | null;
    };
    date: string | null;
    kind: string;
    days: number | null;
  }[];
  recertRows: {
    r: {
      facility: { name: string; block: string; facilityType: string };
      sa: { scorePercent: number | null } | null;
      nqas: { scorePercent: number | null } | null;
    };
    date: string | null;
    kind: string;
    days: number | null;
  }[];
  filteredRows: Flagged[];
  /** "Filters: … · Showing 5 of 157 facilities · Generated …" — built from the
   *  same model helpers as the PDF, so every export states the same thing. */
  subtitle: string;
}) {
  const [busy, setBusy] = useState(false);
  const wrap = (fn: () => void) => () => {
    try {
      setBusy(true);
      // Export helpers are synchronous downloads; a frame keeps the spinner
      // visible on slow devices.
      setTimeout(fn, 30);
    } finally {
      setTimeout(() => setBusy(false), 120);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={busy}>
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          <span className="hidden sm:inline">Download</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Current filter</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={wrap(() =>
            exportExcel(
              `facility-list-filtered-${dateStamp()}.xlsx`,
              "Facility list — current dashboard filter",
              filteredReportHeaders(),
              filteredReportRows(filteredRows),
              // Same title band as the PDF/CSV/print view: the active filters
              // and the row count sit above the header row.
              {
                title: "Facility list — current dashboard filter",
                subtitle,
              },
            ),
          )}
        >
          <FileSpreadsheet className="size-4" /> Filtered list — Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={wrap(() =>
            exportPdf(
              `facility-list-filtered-${dateStamp()}.pdf`,
              "Facility list — current dashboard filter",
              filteredReportHeaders(),
              filteredReportRows(filteredRows),
              subtitle,
              filteredReportPdfOptions(),
            ),
          )}
        >
          <FileText className="size-4" /> Filtered list — PDF (.pdf)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={wrap(() =>
            downloadText(
              `facility-list-filtered-${dateStamp()}.csv`,
              // Same columns, same rows — the CSV header matches its body.
              `${buildReportCsv(DASHBOARD_FILTERED_COLUMNS, filteredRows)}\r\n` +
                `# ${subtitle}`,
            ),
          )}
        >
          <FileText className="size-4" /> Filtered list — CSV (.csv)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={wrap(() =>
            openReportPrintView({
              title: "Facility list — current dashboard filter",
              subtitle,
              columns: DASHBOARD_FILTERED_COLUMNS,
              rows: filteredRows,
            }),
          )}
        >
          <FileText className="size-4" /> Filtered list — Print view
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Standard dashboard lists</DropdownMenuLabel>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Progress table</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              onClick={wrap(() => exportDashboardProgress(visibleBlocks, scope, "xlsx"))}
            >
              <FileSpreadsheet className="size-4" /> Excel (.xlsx)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={wrap(() => exportDashboardProgress(visibleBlocks, scope, "pdf"))}
            >
              <FileText className="size-4" /> PDF (.pdf)
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {conditionalityItems.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              Conditionality list ({conditionalityItems.length})
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={wrap(() =>
                  exportConditionalityList(conditionalityItems, "xlsx"),
                )}
              >
                <FileSpreadsheet className="size-4" /> Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={wrap(() =>
                  exportConditionalityList(conditionalityItems, "pdf"),
                )}
              >
                <FileText className="size-4" /> PDF (.pdf)
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        {resultAwaitedItems.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              Result awaited ({resultAwaitedItems.length})
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={wrap(() =>
                  exportResultAwaitedList(resultAwaitedItems, "xlsx"),
                )}
              >
                <FileSpreadsheet className="size-4" /> Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={wrap(() =>
                  exportResultAwaitedList(resultAwaitedItems, "pdf"),
                )}
              >
                <FileText className="size-4" /> PDF (.pdf)
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        {docItems.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              Documents status ({docItems.length})
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={wrap(() => exportDocStatusList(docItems, "xlsx"))}
              >
                <FileSpreadsheet className="size-4" /> Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={wrap(() => exportDocStatusList(docItems, "pdf"))}
              >
                <FileText className="size-4" /> PDF (.pdf)
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        {eligiblePendingItems.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              Eligible pending ({eligiblePendingItems.length})
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={wrap(() =>
                  exportEligiblePending(eligiblePendingItems, "xlsx"),
                )}
              >
                <FileSpreadsheet className="size-4" /> Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={wrap(() =>
                  exportEligiblePending(eligiblePendingItems, "pdf"),
                )}
              >
                <FileText className="size-4" /> PDF (.pdf)
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        {scheduledRows.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              Scheduled facilities ({scheduledRows.length})
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={wrap(() =>
                  exportExcel(
                    `scheduled-facilities-${dateStamp()}.xlsx`,
                    "Scheduled Facilities",
                    SCHEDULED_HEADERS,
                    buildScheduledExportRows(scheduledRows, true),
                  ),
                )}
              >
                <FileSpreadsheet className="size-4" /> Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={wrap(() =>
                  exportPdf(
                    `scheduled-facilities-${dateStamp()}.pdf`,
                    "Scheduled Facility Details",
                    SCHEDULED_HEADERS,
                    buildScheduledExportRows(scheduledRows, true),
                    `Upcoming & recent NQAS assessments — ${scheduledRows.length} facilities · generated ${dateStamp()}`,
                  ),
                )}
              >
                <FileText className="size-4" /> PDF (.pdf)
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        {recertRows.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              Recertification due ({recertRows.length})
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={wrap(() =>
                  exportExcel(
                    `recertification-due-${dateStamp()}.xlsx`,
                    "Recertification Due",
                    RECERT_HEADERS,
                    buildScheduledExportRows(recertRows, false),
                  ),
                )}
              >
                <FileSpreadsheet className="size-4" /> Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={wrap(() =>
                  exportPdf(
                    `recertification-due-${dateStamp()}.pdf`,
                    "Recertification Due Facilities",
                    RECERT_HEADERS,
                    buildScheduledExportRows(recertRows, false),
                    `Validity window & deferred facilities — ${recertRows.length} facilities · generated ${dateStamp()}`,
                  ),
                )}
              >
                <FileText className="size-4" /> PDF (.pdf)
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
