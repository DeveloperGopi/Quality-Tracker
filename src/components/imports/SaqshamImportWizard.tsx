/**
 * SaQsham DOCUMENT STATUS IMPORT — add → review → apply → done.
 *
 *   ① Add data  paste anywhere (Ctrl+V) or drop a file; the detected headers
 *               and the header mapping show UNDER the compact paste summary
 *   ② Review    previous → new for every row, grouped, with one summary bar;
 *               Apply is the last action in this step
 *   ③ Done      the result, the Excel report, Undo and Import history
 *
 * Nothing is written until Review calls imports.applySaqshamBatch, which runs
 * as ONE transaction (rollback on any failure) and can be undone. The preview
 * is local and pure (lib/saqshamImport); the server re-derives every value
 * from its own status map, so the client can never invent a report group.
 *
 * ONE column model (lib/saqshamPreviewColumns) drives the table and the Excel
 * import report, so header i always sits above cell i.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardPaste,
  Copy,
  Download,
  ExternalLink,
  FileSpreadsheet,
  History as HistoryIcon,
  Info,
  Loader2,
  Search,
  Settings2,
  ShieldCheck,
  Undo2,
  Upload,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PageShell } from "@/components/PageShell";
import { FacilityCell } from "@/components/FacilityCell";
import {
  UniversalFilterBar,
  rowPasses,
  type BarValue,
  type FilterField,
} from "@/components/UniversalFilterBar";

import {
  ALL_COLUMNS,
  HELPER_COLUMNS,
  PORTAL_COLUMNS,
  BUCKET_LABELS,
  BUCKET_ORDER,
  REPORT_STATUS_VALUES,
  REQUIRED_COLUMN_KEYS,
  autoMapColumns,
  bucketCounts,
  buildSaqshamPreview,
  cleanSaqshamRow,
  convexSafe,
  duplicateRowsHint,
  hasBlockingErrors,
  isEligiblePreviewRow,
  previewBucket,
  seedAliasesForFacilities,
  selectedRows,
  summarizePreview,
  fuzzyScore,
  type CleanedRow,
  type FacilityAlias,
  type PreviewBucket,
  type PreviewRow,
  type SaqshamFacility,
} from "@/lib/saqshamImport";
import {
  SAQSHAM_PREVIEW_COLUMNS,
  STATE_STYLES,
  applicationTypeLabel,
  matchLabel,
  nextReportLabel,
  notesFor,
  previousReportLabel,
  shortDate,
  type SaqshamPreviewColumn,
} from "@/lib/saqshamPreviewColumns";
import {
  SAQSHAM_SAMPLE_TSV,
  downloadSampleFile,
  parsePastedText,
  parseSaqshamFile,
  type ParsedSheet,
} from "@/lib/saqshamParse";
import { buildReportRows, downloadImportReport } from "@/lib/saqshamReport";
import { toDdMmmYyyy } from "@/lib/masterColumns";

const STEPS = ["Add data", "Review", "Apply"] as const;

/** Compact review columns. The import report keeps the wider column model. */
const REVIEW_COLUMNS: SaqshamPreviewColumn[] = [
  SAQSHAM_PREVIEW_COLUMNS.find((c) => c.key === "include")!,
  SAQSHAM_PREVIEW_COLUMNS.find((c) => c.key === "rowNo")!,
  SAQSHAM_PREVIEW_COLUMNS.find((c) => c.key === "applicationNo")!,
  SAQSHAM_PREVIEW_COLUMNS.find((c) => c.key === "portalFacility")!,
  {
    ...SAQSHAM_PREVIEW_COLUMNS.find((c) => c.key === "matchedFacility")!,
    label: "Matched facility",
    width: 220,
  },
  { ...SAQSHAM_PREVIEW_COLUMNS.find((c) => c.key === "match")!, width: 150 },
  {
    key: "statusChange",
    label: "Status (previous → new)",
    kind: "text",
    width: 230,
    align: "left",
    exportable: true,
    raw: (r) =>
      (r.currentStatus || "-") === (r.newStatus || "-")
        ? "No change"
        : `${r.currentStatus || "-"} → ${r.newStatus || "-"}`,
  },
  {
    ...SAQSHAM_PREVIEW_COLUMNS.find((c) => c.key === "reportChange")!,
    label: "Report group (previous → new)",
    width: 220,
  },
];

const MAPPING_KEY = "nqas.saqsham.columnMap.v1";
function readRememberedMapping(): Record<string, string> {
  try {
    const raw = JSON.parse(window.localStorage.getItem(MAPPING_KEY) ?? "{}") as unknown;
    if (!raw || typeof raw !== "object") return {};
    return Object.fromEntries(
      Object.entries(raw as Record<string, unknown>).filter(([, v]) => typeof v === "string") as [string, string][],
    );
  } catch {
    return {};
  }
}

function columnsMatched(map: Record<string, number | null>): number {
  return new Set(Object.values(map).filter((v): v is number => v != null)).size;
}

/** Part 0.8 — every import checkbox: 20 px box, 1.5 px border at ≥ 3:1
 *  contrast, a visible focus ring and a 44 px touch target. */
export const ROW_CHECKBOX =
  "size-5 border-[1.5px] border-muted-foreground/90 shadow-none data-[state=checked]:border-primary";
export const ROW_CHECKBOX_WRAP =
  "inline-flex min-h-11 min-w-11 items-center justify-center";

/* --------------------------------------------------------------------------- */
/* Shared bits                                                                  */
/* --------------------------------------------------------------------------- */

function StepBar({ step, onJump }: { step: number; onJump: (n: number) => void }) {
  return (
    <ol className="flex flex-wrap items-center gap-1.5" aria-label="Import steps">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const state = n < step ? "done" : n === step ? "current" : "todo";
        return (
          <li key={label} className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={n > step}
              onClick={() => n < step && onJump(n)}
              aria-current={n === step ? "step" : undefined}
              className={cn(
                "flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                state === "done" && "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-100",
                state === "current" && "border-primary/40 bg-primary/10 text-foreground",
                state === "todo" && "border-border/60 text-muted-foreground",
                n < step && "hover:bg-emerald-200/60",
              )}
            >
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded-full border text-[10px] font-bold",
                  state === "done" && "border-emerald-400 bg-emerald-500 text-white",
                  state === "current" && "border-primary bg-primary text-primary-foreground",
                )}
              >
                {state === "done" ? <Check className="size-3" /> : n}
              </span>
              {label}
            </button>
            {i < STEPS.length - 1 && <span className="text-muted-foreground/40">›</span>}
          </li>
        );
      })}
    </ol>
  );
}

/** Status pill — always words (never colour alone), and WRAPPED over as many
 *  lines as it needs: a status must never be clipped (Part 0.3). */
function StatusPill({ value, muted, bold }: { value: string; muted?: boolean; bold?: boolean }) {
  const text = value || "-";
  return (
    <span
      className={cn(
        "inline-flex max-w-full flex-wrap items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] leading-snug break-words",
        muted ? "line-through opacity-70" : "font-medium",
        bold && "font-semibold",
        statusTone(text),
      )}
    >
      {text}
    </span>
  );
}

function statusTone(text: string): string {
  const v = text.toLowerCase();
  if (v === "-" || !text) return "border-border/60 bg-muted/50 text-muted-foreground";
  if (v.includes("pending at facility")) return "border-amber-300/60 bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-100";
  if (v.includes("rqau") || v.includes("sqau")) return "border-sky-300/60 bg-sky-100 text-sky-900 dark:bg-sky-500/15 dark:text-sky-100";
  if (v.includes("nhsrc")) return "border-violet-300/60 bg-violet-100 text-violet-900 dark:bg-violet-500/15 dark:text-violet-100";
  if (v.includes("scheduled")) return "border-indigo-300/60 bg-indigo-100 text-indigo-900 dark:bg-indigo-500/15 dark:text-indigo-100";
  if (v.includes("awaiting results")) return "border-teal-300/60 bg-teal-100 text-teal-900 dark:bg-teal-500/15 dark:text-teal-100";
  if (v.includes("result declared")) return "border-emerald-300/60 bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-100";
  return "border-border/60 bg-muted/50 text-foreground";
}

/** A report-group chip (neutral; the text carries the meaning). */
function GroupChip({ value }: { value: string }) {
  return (
    <span
      className="inline-flex max-w-full items-center truncate rounded border border-border/60 bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground"
      data-tip={value}
      data-tip-truncate
    >
      {value}
    </span>
  );
}

/** Portal update: ONE value when previous equals new; struck previous and an
 *  arrow only when they differ (Part 0.6). */
function PortalUpdateCell({ row }: { row: PreviewRow }) {
  const prev = shortDate(row.currentPortalUpdatedOn) || "Not recorded";
  const next = shortDate(row.cleaned.lastUpdate.date) || row.cleaned.lastUpdate.updatedBy || "Not recorded";
  if (prev === next) {
    return <span className="font-medium">{next}</span>;
  }
  return (
    <span className="flex flex-wrap items-center gap-1 text-[11px]">
      <span className="text-muted-foreground line-through">{prev}</span>
      <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
      <span className="font-medium">{next}</span>
    </span>
  );
}

/** One facility option — the SAME identity cell used by the lists. */
function FacilityOption({
  facility,
  selected,
  onPick,
}: {
  facility: SaqshamFacility;
  selected?: boolean;
  onPick: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onPick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPick();
        }
      }}
      className={cn(
        "cursor-pointer rounded-md border px-2 py-1.5 outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "border-primary/40 bg-primary/5" : "border-transparent",
      )}
    >
      <FacilityCell
        facility={facility}
        style="twoLine"
        className="pointer-events-none min-h-0"
      />
    </div>
  );
}

/** Searchable picker that stays inside the viewport. Current match first, then
 *  up to five suggestions, then every facility A–Z, then unmatched. */
function MatchCell({
  row,
  facilities,
  onPick,
}: {
  row: PreviewRow;
  facilities: SaqshamFacility[];
  onPick: (rowNo: number, facilityId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const current = facilities.find((f) => f.id === row.facilityId) ?? null;
  const displayName = current?.name || row.facilityName || row.cleaned.portalFacilityRaw || "";

  const suggested = useMemo(() => {
    const name = row.cleaned.name || row.cleaned.portalFacilityRaw;
    const block = (row.cleaned.helper.block || row.facilityBlock || "").trim().toLowerCase();
    const type = (row.cleaned.facilityType || row.cleaned.category || "").trim().toLowerCase();
    const typeHint = (f: SaqshamFacility) => {
      const ft = f.facilityType.toLowerCase();
      if (type.includes("uamm") || type.includes("uhwc")) return ft.includes("uhwc") ? 1 : 0;
      if (type.includes("hwc")) return ft.includes("hsc") || ft.includes("phc") ? 1 : 0;
      return type && ft === type ? 1 : 0;
    };
    return facilities
      .filter((f) => f.id !== current?.id)
      .map((f) => ({
        f,
        score: fuzzyScore(name, f.name),
        block: block && f.block.trim().toLowerCase() === block ? 1 : 0,
        type: typeHint(f),
      }))
      .sort((a, b) => b.block - a.block || b.type - a.type || b.score - a.score || a.f.name.localeCompare(b.f.name))
      .slice(0, 5);
  }, [facilities, row.cleaned.name, row.cleaned.portalFacilityRaw, row.cleaned.helper.block, row.cleaned.facilityType, row.cleaned.category, row.facilityBlock, current?.id]);

  const needle = q.trim().toLowerCase();
  const matches = (f: SaqshamFacility) =>
    !needle ||
    `${f.name} ${f.block} ${f.phc} ${f.saqshamApplicationNo ?? ""}`.toLowerCase().includes(needle);
  const all = [...facilities].sort((a, b) => a.name.localeCompare(b.name)).filter(matches);
  const choices = suggested.map((s) => s.f).filter(matches);

  const choose = (id: string | null) => {
    onPick(row.rowNo, id);
    setOpen(false);
    setQ("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex min-h-9 w-full min-w-0 items-center gap-1 rounded-md border border-border/60 bg-background/70 px-2 py-1 text-left text-[11px] hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span className="min-w-0 flex-1">
            <span className={cn("block truncate font-medium", !displayName && "text-muted-foreground")}>
              {displayName || "Choose facility"}
            </span>
            <span className="mt-0.5 flex min-w-0 items-center gap-1">
              <span
                className={cn(
                  "truncate rounded border px-1 py-px text-[9.5px]",
                  row.match.status === "matched" || row.method === "manual"
                    ? "border-emerald-300/60 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                    : "border-amber-300/70 bg-amber-500/10 text-amber-800 dark:text-amber-200",
                )}
              >
                {matchLabel(row)}
              </span>
              <span className="shrink-0 text-[10px] text-primary">Change</span>
            </span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        collisionPadding={8}
        className="w-[min(92vw,28rem)] p-2"
      >
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, block, PHC or application no"
          className="h-8 text-xs"
          aria-label="Search facilities"
          onKeyDown={(e) => e.stopPropagation()}
        />
        <div className="mt-2 max-h-[min(58vh,25rem)] overflow-y-auto">
          {current && (
            <div>
              <p className="px-2 py-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Current match</p>
              <FacilityOption facility={current} selected onPick={() => choose(current.id)} />
            </div>
          )}
          {choices.length > 0 && (
            <div>
              <p className="px-2 pt-2 pb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Suggested</p>
              {choices.map((f) => (
                <FacilityOption key={f.id} facility={f} onPick={() => choose(f.id)} />
              ))}
            </div>
          )}
          <div>
            <p className="px-2 pt-2 pb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">All facilities A–Z</p>
            {all.map((f) => (
              <FacilityOption key={f.id} facility={f} selected={f.id === current?.id} onPick={() => choose(f.id)} />
            ))}
            {all.length === 0 && <p className="px-2 py-2 text-xs text-muted-foreground">No facility matches that search.</p>}
          </div>
          <button
            type="button"
            onClick={() => choose(null)}
            className="mt-1 flex min-h-9 w-full items-center rounded-md border border-border/60 px-2 text-left text-xs text-muted-foreground hover:bg-muted/50"
          >
            — unmatched —
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Map an unmapped portal status to a report group (or keep it as is). */
function ReportChoiceCell({
  row,
  value,
  onChoose,
  onOpenMapping,
  groupNames,
}: {
  row: PreviewRow;
  value: string | undefined;
  onChoose: (rowNo: number, choice: string | null) => void;
  onOpenMapping?: (portal: string) => void;
  groupNames: readonly string[];
}) {
  const mapped = !row.unmappedStatus && value === undefined;
  if (mapped) {
    const previous = previousReportLabel(row);
    const next = nextReportLabel(row);
    if (row.keptResultDeclared) {
      return (
        <div className="flex flex-wrap items-center gap-1">
          <GroupChip value={previous} />
          <span className="text-[10px] text-muted-foreground">kept</span>
        </div>
      );
    }
    // Identical values are drawn ONCE — no strikethrough, no arrow (Part 0.6).
    if (previous === next) {
      return (
        <div className="flex flex-wrap items-center gap-1">
          <GroupChip value={previous} />
        </div>
      );
    }
    return (
      <div className="flex flex-wrap items-center gap-1">
        <GroupChip value={previous} />
        <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
        <GroupChip value={next} />
      </div>
    );
  }
  const selected = value === "__keep__" ? "__keep__" : (value ?? "");
  return (
    <div className="space-y-0.5">
    <Select
      value={selected || "unmapped"}
      onValueChange={(v) => onChoose(row.rowNo, v === "unmapped" ? null : v)}
    >
      <SelectTrigger
        className="h-8 w-full min-w-40 text-[11px]"
        aria-label={`Report group for row ${row.rowNo}`}
      >
        <SelectValue placeholder="Needs mapping" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unmapped" className="text-xs">
          — needs mapping —
        </SelectItem>
        {groupNames.map((v) => (
          <SelectItem key={v} value={v} className="text-xs">
            {v}
          </SelectItem>
        ))}
        <SelectItem value="__keep__" className="text-xs">
          Keep as-is, no report group
        </SelectItem>
      </SelectContent>
    </Select>
    {onOpenMapping && row.cleaned.statusRaw && (
      <button
        type="button"
        onClick={() => onOpenMapping(row.cleaned.statusRaw)}
        className="text-[10px] font-medium text-primary underline-offset-2 hover:underline"
      >
        Map this status in Status mapping →
      </button>
    )}
    </div>
  );
}

/** Application No — full text, click to copy. */
function ApplicationNoCell({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const text = value || "-";
  return (
    <button
      type="button"
      disabled={!value}
      data-tip="Click to copy the application number"
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          toast.success("Application No copied");
          window.setTimeout(() => setCopied(false), 1200);
        });
      }}
      className="flex min-h-8 w-full items-start gap-1 text-left font-mono text-[10.5px] leading-tight break-all hover:text-primary disabled:cursor-default"
    >
      <span className="min-w-0 flex-1">{text}</span>
      {value && (copied ? <Check className="mt-0.5 size-3 shrink-0 text-emerald-600" /> : <Copy className="mt-0.5 size-3 shrink-0 text-muted-foreground" />)}
    </button>
  );
}

/** Previous above new, two compact lines; an identical pair reads once. */
function StatusChangeCell({ row }: { row: PreviewRow }) {
  const previous = row.currentStatus || "-";
  const next = row.newStatus || "-";
  if (previous === next) {
    return <span className="text-[11px] text-muted-foreground">No change</span>;
  }
  return (
    <div className="space-y-0.5 text-[10.5px] leading-tight">
      <span className="line-clamp-1 text-muted-foreground" data-tip={previous} data-tip-truncate>
        {previous}
      </span>
      <span className="line-clamp-1 font-medium" data-tip={next} data-tip-truncate>
        {next}
      </span>
    </div>
  );
}

function ColumnMappingField({
  spec,
  sheet,
  value,
  onChange,
}: {
  spec: (typeof ALL_COLUMNS)[number];
  sheet: ParsedSheet;
  value: number | null | undefined;
  onChange: (index: number | null) => void;
}) {
  const matched = value != null;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-2 py-1.5",
        matched ? "border-emerald-300/50 bg-emerald-50/40 dark:bg-emerald-500/5" : "border-border/60",
      )}
    >
      <span className="w-36 shrink-0 text-xs font-medium">
        {spec.label}
        {spec.required && <span className="text-destructive"> *</span>}
      </span>
      <span className="shrink-0">
        {matched ? (
          <Check className="size-3.5 text-emerald-600" aria-label="Matched" />
        ) : (
          <XCircle className="size-3.5 text-muted-foreground" aria-label="Not matched" />
        )}
      </span>
      <Select value={value == null ? "none" : String(value)} onValueChange={(v) => onChange(v === "none" ? null : Number(v))}>
        <SelectTrigger className="h-8 w-full min-w-32 text-xs" aria-label={`Column for ${spec.label}`}>
          <SelectValue placeholder="Not mapped" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none" className="text-xs">
            — not mapped —
          </SelectItem>
          {sheet.headers.map((h, i) => (
            <SelectItem key={i} value={String(i)} className="text-xs">
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** The paste is shown as a compact summary, never a wall of text. */
function PasteSummaryCard({ sheet, onEdit }: { sheet: ParsedSheet; onEdit: () => void }) {
  return (
    <div className="flex min-h-8 flex-wrap items-center gap-2 rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-xs">
      <span className="font-semibold">
        {sheet.dataRows.length} row{sheet.dataRows.length === 1 ? "" : "s"} ·{" "}
        {sheet.headers.length} column{sheet.headers.length === 1 ? "" : "s"}
      </span>
      <span className="text-muted-foreground">·</span>
      <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={onEdit}>
        Edit pasted text
      </Button>
    </div>
  );
}

/** The preview table — ONE cell per column, rendered by column kind/key. */
function ImportPreviewTable({
  columns,
  rows,
  facilities,
  reportChoice,
  onToggleInclude,
  onPickFacility,
  onChooseReport,
  onOpenRow,
  onOpenMapping,
  groups,
  groupNames,
}: {
  columns: readonly SaqshamPreviewColumn[];
  rows: readonly PreviewRow[];
  facilities: SaqshamFacility[];
  reportChoice: Record<number, string>;
  onToggleInclude: (rowNo: number, next: boolean) => void;
  onPickFacility: (rowNo: number, facilityId: string | null) => void;
  onChooseReport: (rowNo: number, choice: string | null) => void;
  onOpenRow: (rowNo: number) => void;
  onOpenMapping?: (portal: string) => void;
  groupNames: readonly string[];
  /** Bucket groups: open by default when `collapsed` is false. */
  groups?: {
    key: string;
    label: string;
    rows: PreviewRow[];
    collapsed: boolean;
    onToggle: () => void;
    /** Eligible rows in this group (valid, resolved changes only). */
    eligibleCount: number;
    selectedCount: number;
    /** Group checkbox: select or clear every eligible row in the group. */
    onToggleAll?: () => void;
  }[];
}) {
  /* Frozen: Include + Facility (+ Block when the list is short). Each sticky
     cell needs the sum of the widths BEFORE it — both at left: 0 would paint
     one over the other (Part 0.3). */
  const facilityIdx = Math.max(0, columns.findIndex((c) => c.key === "matchedFacility"));
  const frozenEnd = facilityIdx;
  const frozenLeft = (i: number) =>
    i > frozenEnd ? 0 : columns.slice(0, i).reduce((sum, c) => sum + c.width, 0);

  /* Grouped rows (Part 3.2.3): a header item + its rows, or a plain list. */
  type Item =
    | { kind: "header"; group: NonNullable<typeof groups>[number] }
    | { kind: "row"; row: PreviewRow };
  const items: Item[] = groups?.length
    ? groups.flatMap((g) => [
        { kind: "header" as const, group: g },
        ...g.rows.map((row) => ({ kind: "row" as const, row })),
      ])
    : rows.map((row) => ({ kind: "row" as const, row }));

  return (
    <div
      className="min-h-[360px] overflow-auto overscroll-contain rounded-lg border border-border/60"
      style={{ maxHeight: "calc(var(--page-shell-height, 100dvh) - 15rem)" }}
    >
      <table className="w-full border-collapse text-xs" style={{ tableLayout: "fixed" }}>
        <colgroup>
          {columns.map((c) => (
            <col key={c.key} style={{ width: c.width }} />
          ))}
        </colgroup>
        <thead className="bg-muted shadow-[0_1px_0_0_var(--border)]">
          <tr>
            {columns.map((c, i) => (
              <th
                key={c.key}
                scope="col"
                className={cn(
                  "sticky top-0 z-20 border-b border-border/60 bg-muted px-2 py-1.5 text-left text-[10px] font-semibold tracking-wide text-muted-foreground uppercase",
                  c.align === "right" && "text-right",
                  c.align === "center" && "text-center",
                  i <= frozenEnd && "z-40",
                  i === frozenEnd && "border-r border-border/60",
                )}
                style={i <= frozenEnd ? { left: frozenLeft(i), top: 0 } : { top: 0 }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            if (item.kind === "header") {
              return (
              <tr key={`g-${item.group.key}`} className="h-9 border-b border-border/60 bg-muted">
                <td colSpan={columns.length} className="px-2 py-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.group.onToggleAll && (
                      <span className={ROW_CHECKBOX_WRAP}>
                        <Checkbox
                          className={ROW_CHECKBOX}
                          checked={
                            item.group.eligibleCount > 0 &&
                            item.group.selectedCount === item.group.eligibleCount
                              ? true
                              : item.group.selectedCount > 0
                                ? "indeterminate"
                                : false
                          }
                          disabled={item.group.eligibleCount === 0}
                          aria-label={`Select eligible rows in ${item.group.label}`}
                          onCheckedChange={item.group.onToggleAll}
                        />
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={item.group.onToggle}
                      aria-expanded={!item.group.collapsed}
                      className="inline-flex min-h-8 items-center gap-2 rounded-md px-1.5 text-xs font-semibold hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <span className="text-muted-foreground">{item.group.collapsed ? "▸" : "▾"}</span>
                      {item.group.label}
                      <span className="tabular-nums text-muted-foreground">({item.group.rows.length})</span>
                      {item.group.eligibleCount > 0 && (
                        <span className="font-normal text-muted-foreground">
                          {item.group.selectedCount} of {item.group.eligibleCount} selected
                        </span>
                      )}
                    </button>
                  </div>
                </td>
              </tr>
              );
            }
            const row = item.row;
            const style = STATE_STYLES[row.state];
            const matchedFacility =
              facilities.find((f) => f.id === row.facilityId) ?? null;
            return (
              <tr key={row.rowNo} className="h-14 border-b border-border/40 align-top hover:bg-muted/30">
                {columns.map((c, i) => (
                  <td
                    key={c.key}
                    className={cn(
                      "px-2 py-1.5 align-top",
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center",
                      i <= frozenEnd && "sticky z-10 bg-background",
                      i === frozenEnd && "border-r border-border/40",
                    )}
                    style={i <= frozenEnd ? { left: frozenLeft(i) } : undefined}
                  >
                    {c.kind === "include" ? (
                      <span className={ROW_CHECKBOX_WRAP}>
                        <Checkbox
                          className={ROW_CHECKBOX}
                          checked={row.include && isEligiblePreviewRow(row)}
                          disabled={!isEligiblePreviewRow(row)}
                          aria-label={`Include row ${row.rowNo}`}
                          onCheckedChange={(v) => onToggleInclude(row.rowNo, v === true)}
                        />
                      </span>
                    ) : c.kind === "match" ? (
                      <MatchCell row={row} facilities={facilities} onPick={onPickFacility} />
                    ) : c.kind === "arrow" ? (
                      <ArrowRight className="mx-auto size-3.5 text-muted-foreground" />
                    ) : c.kind === "index" ? (
                      <button
                        type="button"
                        onClick={() => onOpenRow(row.rowNo)}
                        className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-md text-[11px] tabular-nums text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        aria-label={`Row ${row.rowNo} details`}
                        data-tip="Open row details"
                      >
                        {row.rowNo}
                      </button>
                    ) : c.key === "applicationNo" ? (
                      <ApplicationNoCell value={row.cleaned.applicationNo} />
                    ) : c.key === "statusChange" ? (
                      <StatusChangeCell row={row} />
                    ) : c.key === "currentStatus" ? (
                      <StatusPill value={row.currentStatus || "-"} muted={row.change !== "same"} />
                    ) : c.key === "newStatus" ? (
                      <StatusPill value={row.newStatus || "-"} bold />
                    ) : c.key === "reportChange" ? (
                      <ReportChoiceCell
                        row={row}
                        value={reportChoice[row.rowNo]}
                        onChoose={onChooseReport}
                        onOpenMapping={onOpenMapping}
                        groupNames={groupNames}
                      />
                    ) : c.key === "updateChange" ? (
                      <div className="space-y-0.5">
                        <PortalUpdateCell row={row} />
                        {row.stale && (
                          <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">
                            Older than current data
                          </span>
                        )}
                      </div>
                    ) : c.key === "appType" ? (
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        {applicationTypeLabel(row)}
                      </Badge>
                    ) : c.key === "rowState" ? (
                      <div className="space-y-1">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                            style.className,
                          )}
                        >
                          {style.label}
                        </span>
                        {row.keptResultDeclared && (
                          <span className="block text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                            Kept: result declared
                          </span>
                        )}
                        {row.movedBack && (
                          <span className="block text-[10px] font-medium text-amber-700 dark:text-amber-300">
                            Status moved back
                          </span>
                        )}
                      </div>
                    ) : c.key === "notes" ? (
                      <button
                        type="button"
                        onClick={() => onOpenRow(row.rowNo)}
                        className="flex min-h-8 items-start gap-1 text-left text-[11px] leading-tight text-muted-foreground hover:text-foreground"
                        data-tip="Show the raw row and why it matched"
                      >
                        <Info className="mt-0.5 size-3 shrink-0" />
                        <span className="line-clamp-2">{notesFor(row)}</span>
                      </button>
                    ) : c.key === "matchedFacility" ? (
                      <div className="min-w-0 space-y-0.5">
                        {row.facilityId ? (
                          <FacilityCell
                            facility={{
                              id: row.facilityId,
                              name: matchedFacility?.name || row.facilityName,
                              facilityType:
                                matchedFacility?.facilityType || row.facilityType || row.cleaned.facilityType,
                              block: matchedFacility?.block || row.facilityBlock,
                              phc: matchedFacility?.phc || row.facilityPhc,
                            }}
                            style="twoLine"
                            onOpen={() => undefined}
                            className="min-h-0 py-0"
                          />
                        ) : (
                          <span className="block leading-tight break-words text-muted-foreground">
                            {row.cleaned.portalFacilityRaw || "-"}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span
                        className={cn(
                          "block break-words",
                          c.key === "portalFacility" ? "line-clamp-2" : "truncate",
                        )}
                        data-tip={String(c.raw(row, 0))}
                        data-tip-truncate
                      >
                        {String(c.raw(row, 0))}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
          {items.every((i) => i.kind !== "row") && (
            <tr>
              <td colSpan={columns.length} className="p-6 text-center text-muted-foreground">
                No rows match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/** The 360 px row: same fields, stacked, checkbox + details on one card. */
function MobileRowCard({
  row,
  reportChoice,
  onToggleInclude,
  onOpen,
}: {
  row: PreviewRow;
  reportChoice: string | undefined;
  onToggleInclude: (next: boolean) => void;
  onOpen: () => void;
}) {
  const style = STATE_STYLES[row.state];
  return (
    <article className="rounded-lg border border-border/60 bg-background/70 p-2.5 text-xs">
      <div className="flex items-start gap-2">
        <span className={ROW_CHECKBOX_WRAP}>
          <Checkbox
            className={ROW_CHECKBOX}
            checked={row.include && isEligiblePreviewRow(row)}
            disabled={!isEligiblePreviewRow(row)}
            aria-label={`Include row ${row.rowNo}`}
            onCheckedChange={(v) => onToggleInclude(v === true)}
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{row.facilityName || "Unmatched"}</p>
          <p className="truncate text-[10px] text-muted-foreground">
            {row.cleaned.applicationNo || "no application no"} · {row.cleaned.portalFacilityRaw}
          </p>
        </div>
        <span
          className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold", style.className)}
        >
          {style.label}
        </span>
      </div>
      <div className="mt-2 space-y-1">
        <div className="flex flex-wrap items-center gap-1">
          <StatusPill value={row.currentStatus || "-"} muted={row.change !== "same"} />
          <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
          <StatusPill value={row.newStatus || "-"} bold />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <GroupChip value={previousReportLabel(row)} />
          <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
          <GroupChip value={nextReportLabel(row)} />
        </div>
        <p className="text-[10px] text-muted-foreground">
          {row.facilityBlock || "—"} · {row.facilityPhc || "—"} · {matchLabel(row)}
        </p>
        {row.unmappedStatus && !reportChoice && (
          <p className="text-[10px] font-medium text-amber-700 dark:text-amber-300">
            Needs mapping — open the row to choose a report group
          </p>
        )}
        {row.keptResultDeclared && (
          <p className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300">Kept: result declared</p>
        )}
        {row.movedBack && (
          <p className="text-[10px] font-medium text-amber-700 dark:text-amber-300">Status moved back</p>
        )}
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="mt-2 inline-flex min-h-8 items-center gap-1 rounded-md border border-border/60 px-2 text-[11px] text-muted-foreground"
      >
        <Info className="size-3" /> Row details
      </button>
    </article>
  );
}

/* --------------------------------------------------------------------------- */
/* Review filters                                                               */
/* --------------------------------------------------------------------------- */

/**
 * ONE mutually exclusive summary bar (Part 3.2.1). The six buckets always add
 * up to the row count; tags like "Kept: result declared", "Needs mapping" and
 * "Older application" live on the ROWS, never as extra chips.
 */
type ChipKey = "all" | PreviewBucket;

const CHIPS: { key: ChipKey; label: string }[] = [
  { key: "all", label: "Rows" },
  ...BUCKET_ORDER.map((key) => ({ key, label: BUCKET_LABELS[key] })),
];

function matchesChip(row: PreviewRow, chip: ChipKey): boolean {
  if (chip === "all") return true;
  return previewBucket(row.state, row.change) === chip;
}

/* --------------------------------------------------------------------------- */
/* The wizard                                                                   */
/* --------------------------------------------------------------------------- */

export function SaqshamImportWizard({
  onOpenList,
  onOpenHistory,
  onOpenMapping,
  initialText,
  initialFile,
}: {
  onOpenList?: () => void;
  onOpenHistory?: () => void;
  onOpenMapping?: (portal: string) => void;
  /** Smart paste on the Bulk Import page: parsed once when the wizard opens. */
  initialText?: string | null;
  /** Smart drop on the Bulk Import page, parsed once. */
  initialFile?: File | null;
}) {
  const ctx = useQuery(api.imports.getSaqshamImportContext, {});
  const applyBatch = useMutation(api.imports.applySaqshamBatch);
  const saveAlias = useMutation(api.imports.saveFacilityAlias);
  const undoBatch = useMutation(api.imports.undoSaqshamBatch);

  const [step, setStep] = useState(1);
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [map, setMap] = useState<Record<string, number | null>>({});
  const [pasteText, setPasteText] = useState("");
  /** Where the rows came from — history shows "Pasted · 23 rows" or the file. */
  const [sourceKind, setSourceKind] = useState<"paste" | "file">("paste");
  const sourceLabel = () =>
    sourceKind === "file"
      ? sheet?.fileName || "Uploaded file"
      : `Pasted · ${viewRows.length} row${viewRows.length === 1 ? "" : "s"}`;
  const [parsing, setParsing] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [facilityChoice, setFacilityChoice] = useState<Record<number, string | null>>({});
  const [reportChoice, setReportChoice] = useState<Record<number, string>>({});
  const [includeOverride, setIncludeOverride] = useState<Record<number, boolean>>({});
  const [rememberOn, setRememberOn] = useState(true);
  const [optional, setOptional] = useState({ mode: false, departments: false, date: false, type: false, overwrite: false });
  const [moveStatus, setMoveStatus] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [applying, setApplying] = useState(false);
  const applyingRef = useRef(false);
  const reportRowsRef = useRef<ReturnType<typeof buildReportRows> | null>(null);
  const [result, setResult] = useState<{
    batchId: string;
    updated: number;
    noChange: number;
    skipped: number;
    failed: number;
    failures: { rowNo: number; reason: string }[];
  } | null>(null);
  const [undoing, setUndoing] = useState(false);
  const [undone, setUndone] = useState(false);
  const [undoConflicts, setUndoConflicts] = useState<{ rowNo: number; reason: string }[] | null>(null);

  // Review controls (kept while the wizard is open).
  const [chip, setChip] = useState<ChipKey>("all");
  const [search, setSearch] = useState("");
  /** Universal FilterBar: values start EMPTY — an import never opens with a
   *  filter carried over from another page or an earlier session (Part 0.5). */
  const [bar, setBar] = useState<BarValue>(() => ({ barKeys: ["facilityBlock", "report"], filters: [], match: "all" }));
  const [drawerRowNo, setDrawerRowNo] = useState<number | null>(null);
  /** Part 3.2.3: "No change" and "Skipped" start collapsed; the rest open. */
  const [collapsedGroups, setCollapsedGroups] = useState<PreviewBucket[]>([]);
  const [announcement, setAnnouncement] = useState("");

  const facilities: SaqshamFacility[] = useMemo(() => (ctx?.facilities ?? []) as SaqshamFacility[], [ctx]);
  const aliases: FacilityAlias[] = useMemo(() => (ctx?.aliases ?? []) as FacilityAlias[], [ctx]);

  // ---- Clean every data row through the shared engine ------------------------
  const cleaned: CleanedRow[] = useMemo(() => {
    if (!sheet) return [];
    return sheet.dataRows.map((dr, i) => {
      const cells = sheet.keptIndexes.map((idx) => dr.cells[idx]);
      return cleanSaqshamRow(
        { rowNo: i + 1, sourceRowNo: dr.sourceRowNo, headerNames: sheet.headers, cells, map },
        {
          district: ctx?.district,
          categoryTypeMap: ctx?.categoryTypeMap,
          // Part 0.2: only parse "Applied Departments" when that optional
          // update is switched on — otherwise the raw cell is simply kept.
          parseDepartments: optional.departments,
        },
        ctx?.statusMap,
      );
    });
  }, [sheet, map, ctx, optional.departments]);

  // ---- Preview (pure) --------------------------------------------------------
  // The stored alias table and the one-time shipped seed are merged: the seed
  // acts exactly like a saved alias at 100%, shown as "Seeded alias".
  const allAliases = useMemo(() => [...aliases, ...seedAliasesForFacilities(facilities)], [aliases, facilities]);
  const preview = useMemo(
    () => buildSaqshamPreview(cleaned, facilities, allAliases, { facilityChoice, reportChoice }),
    [cleaned, facilities, allAliases, facilityChoice, reportChoice],
  );

  const rowInclude = (r: PreviewRow): boolean =>
    r.state === "no_change" ? false : (includeOverride[r.rowNo] ?? r.include);
  const viewRows = useMemo(
    () => preview.rows.map((r) => ({ ...r, include: rowInclude(r) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [preview.rows, includeOverride],
  );

  const summary = useMemo(
    () => summarizePreview(viewRows, preview.summary.missingFromFile),
    [viewRows, preview.summary.missingFromFile],
  );
  const blocking = hasBlockingErrors(viewRows);
  const selected = selectedRows(viewRows);

  const chipCounts = useMemo(() => {
    const counts = {} as Record<ChipKey, number>;
    const buckets = bucketCounts(viewRows);
    counts.all = viewRows.length;
    for (const c of CHIPS) if (c.key !== "all") counts[c.key] = buckets[c.key];
    return counts;
  }, [viewRows]);

  const blocks = useMemo(
    () => [...new Set(viewRows.map((r) => r.facilityBlock).filter(Boolean))].sort(),
    [viewRows],
  );
  const reportOptions = useMemo(
    () => [...new Set(viewRows.map((r) => nextReportLabel(r)))].sort(),
    [viewRows],
  );
  const typeOptions = useMemo(
    () => [...new Set(viewRows.map((r) => r.facilityType || r.cleaned.facilityType).filter(Boolean))].sort() as string[],
    [viewRows],
  );

  /** The one row accessor every UniversalFilterBar value is read through. */
  const rowValue = (r: PreviewRow, key: string): unknown => {
    switch (key) {
      case "facilityBlock":
        return r.facilityBlock;
      case "report":
        return nextReportLabel(r);
      case "facilityType":
        return r.facilityType || r.cleaned.facilityType;
      case "matchKind":
        return r.match.status === "matched"
          ? "Matched"
          : r.match.status === "suggested"
            ? "Spelling variant"
            : "Can't match";
      case "applicationType":
        return applicationTypeLabel(r);
      default:
        return r.cleaned.applicationNo;
    }
  };

  const reviewFields: FilterField[] = useMemo(
    () => [
      {
        key: "facilityBlock",
        label: "Block",
        type: "select",
        group: "Identity",
        onThisPage: true,
        options: blocks.map((b) => ({ value: b, count: viewRows.filter((r) => r.facilityBlock === b).length })),
      },
      {
        key: "report",
        label: "Report group",
        type: "select",
        group: "Status",
        onThisPage: true,
        options: reportOptions.map((v) => ({ value: v })),
      },
      {
        key: "matchKind",
        label: "Match",
        type: "select",
        group: "Status",
        onThisPage: true,
        options: ["Matched", "Spelling variant", "Can't match"].map((v) => ({ value: v })),
      },
      {
        key: "applicationType",
        label: "Application type",
        type: "select",
        group: "Status",
        options: [...new Set(viewRows.map((r) => applicationTypeLabel(r)))].map((v) => ({ value: v })),
      },
      {
        key: "facilityType",
        label: "Facility Type",
        type: "select",
        group: "Identity",
        options: typeOptions.map((v) => ({ value: v })),
      },
      { key: "applicationNo", label: "Application No", type: "text", group: "Identity" },
    ],
    [blocks, reportOptions, typeOptions, viewRows],
  );

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return viewRows
      .filter((r) => {
        if (!matchesChip(r, chip)) return false;
        if (!rowPasses(bar.filters, bar.match, (key) => rowValue(r, key))) return false;
        if (needle) {
          const hay = `${r.cleaned.applicationNo} ${r.cleaned.portalFacilityRaw} ${r.facilityName} ${r.facilityBlock}`.toLowerCase();
          if (!hay.includes(needle)) return false;
        }
        return true;
      });
  }, [viewRows, chip, bar, search]);

  /** The grouped review: only when no single bucket chip is selected. */
  const reviewGroups = useMemo(() => {
    if (chip !== "all") return undefined;
    const attentionFirst: PreviewBucket[] = [
      "needs_decision",
      "cant_match",
      "will_change",
      "new",
      "no_change",
      "skipped",
    ];
    return attentionFirst.map((bucket) => {
      const groupRows = shown.filter((r) => previewBucket(r.state, r.change) === bucket);
      return {
        key: bucket,
        label: BUCKET_LABELS[bucket],
        rows: groupRows,
        collapsed: collapsedGroups.includes(bucket),
        onToggle: () =>
          setCollapsedGroups((prev) =>
            prev.includes(bucket) ? prev.filter((b) => b !== bucket) : [...prev, bucket],
          ),
        eligibleCount: groupRows.filter(isEligiblePreviewRow).length,
        selectedCount: groupRows.filter((r) => r.include && isEligiblePreviewRow(r)).length,
        onToggleAll:
          bucket === "no_change"
            ? undefined
            : () => {
                const eligible = groupRows.filter(isEligiblePreviewRow);
                if (eligible.length === 0) return;
                const allSelected = eligible.every((r) => r.include);
                setIncludeOverride((prev) => {
                  const next = { ...prev };
                  for (const r of eligible) next[r.rowNo] = !allSelected;
                  return next;
                });
              },
      };
    }).filter((g) => g.rows.length > 0);
  }, [chip, shown, collapsedGroups, setCollapsedGroups, setIncludeOverride]);

  const missingRequired = REQUIRED_COLUMN_KEYS.filter((k) => map[k] == null);
  const matchedColumns = columnsMatched(map);
  const acceptSuggestions = viewRows.filter(
    (r) =>
      r.state === "needs_review" &&
      r.match.status === "suggested" &&
      (r.match.candidates[0]?.score ?? 0) >= 95,
  ).length;
  const allNoChange =
    viewRows.length > 0 && summary.buckets.no_change === viewRows.length;

  /* ---- Parsing ---- */
  const loadSheet = (s: ParsedSheet) => {
    setSheet(s);
    const nextMap = autoMapColumns(s.headers, ALL_COLUMNS);
    // Remembered header names win, so the same import type maps itself.
    const remembered = readRememberedMapping();
    for (const [key, header] of Object.entries(remembered)) {
      const idx = s.headers.indexOf(header);
      if (idx >= 0) nextMap[key] = idx;
    }
    setMap(nextMap);
    setIncludeOverride({});
    setFacilityChoice({});
    setReportChoice({});
    setChip("all");
    setSearch("");
    setCollapsedGroups([]);
    setBar((prev) => ({ ...prev, filters: [] }));
    setResult(null);
    setUndone(false);
    setConfirmed(false);
    for (const w of s.warnings) toast.warning(w);
    // Required fields matched → straight to Review. Otherwise stay here and
    // show only the mapping panel under the compact paste summary.
    const ready = REQUIRED_COLUMN_KEYS.every((k) => nextMap[k] != null);
    setStep(ready ? 2 : 1);
    setAnnouncement(`Detected ${s.dataRows.length} rows and ${s.headers.length} columns.`);
  };

  // Persist the header-name mapping for this import type (never row data).
  useEffect(() => {
    if (!sheet) return;
    try {
      const byHeader: Record<string, string> = {};
      for (const spec of ALL_COLUMNS) {
        const idx = map[spec.key];
        if (idx != null && sheet.headers[idx]) byHeader[spec.key] = sheet.headers[idx];
      }
      window.localStorage.setItem(MAPPING_KEY, JSON.stringify(byHeader));
    } catch {
      // A browser with storage disabled still imports normally.
    }
  }, [sheet, map]);

  const ingestText = (text: string) => {
    if (!text.trim()) {
      toast.error("Paste the SaQsham rows first");
      return;
    }
    setPasteText(text);
    setSourceKind("paste");
    loadSheet(parsePastedText(text));
  };

  const onFile = async (file: File) => {
    setParsing(true);
    setSourceKind("file");
    try {
      loadSheet(await parseSaqshamFile(file));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read the file");
    }
    setParsing(false);
  };

  /* Smart paste/drop: the Bulk Import page detected this as SaQsham and handed
     the clipboard text or file over — parse it once, never store it. */
  const initialIngested = useRef(false);
  useEffect(() => {
    if (initialIngested.current) return;
    if (initialFile) {
      initialIngested.current = true;
      void onFile(initialFile);
      return;
    }
    if (!initialText?.trim()) return;
    initialIngested.current = true;
    ingestText(initialText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialText, initialFile]);

  // Paste anywhere on the page while the paste step is open — unless the user
  // is typing in a field, where the browser's own paste must win.
  useEffect(() => {
    if (step !== 1) return;
    const onPaste = (e: ClipboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      const text = e.clipboardData?.getData("text/plain") ?? "";
      if (!text.trim()) return;
      e.preventDefault();
      ingestText(text);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- Apply ---- */
  const runApply = async () => {
    // A double-click can beat React's disabled attribute — one request only.
    if (!confirmed || applyingRef.current) return;
    applyingRef.current = true;
    setApplying(true);
    try {
      const decisions = selected.map((r) => ({
        rowNo: r.rowNo,
        facilityId: r.facilityId as Id<"facilities">,
        applicationNo: r.cleaned.applicationNo || undefined,
        statusRaw: r.newStatus || undefined,
        reportStatus: r.newReport,
        keepAsIs: r.keepAsIs,
        portalUpdatedOn: r.cleaned.lastUpdate.date,
        portalUpdatedBy: r.cleaned.lastUpdate.updatedBy,
        portalName: r.cleaned.name,
        facilityType: r.cleaned.facilityType,
        rememberAlias: (r.method === "manual" || r.method === "fuzzy" || r.seededAlias) && rememberOn,
        applyStatusForward: moveStatus,
        overwriteOptional: optional.overwrite,
        matchMethod: r.method,
        confidence: r.confidence,
        facilityName: r.facilityName,
        facilityBlock: r.facilityBlock,
        facilityPhc: r.facilityPhc,
        notes: notesFor(r),
        raw: convexSafe(r.cleaned.raw) as Record<string, unknown>,
        cleaned: {
          applicationNo: r.cleaned.applicationNo,
          portalFacilityRaw: r.cleaned.portalFacilityRaw,
          name: r.cleaned.name,
          category: r.cleaned.category,
          facilityType: r.cleaned.facilityType,
          facilityTypeKnown: r.cleaned.facilityTypeKnown,
          statusRaw: r.cleaned.statusRaw,
          report: r.newReport,
          keepAsIs: r.keepAsIs,
          departments: r.cleaned.appliedDepartments.departments,
          departmentsCount: r.cleaned.appliedDepartments.departments.length,
          departmentsStated: r.cleaned.appliedDepartments.statedCount,
          appliedDate: r.cleaned.appliedDate,
          lastUpdateDate: r.cleaned.lastUpdate.date,
          lastUpdateBy: r.cleaned.lastUpdate.updatedBy,
          resultDeclared: r.cleaned.resultDeclared,
          differentScope: r.cleaned.differentScope,
          warnings: r.cleaned.warnings,
          assessmentType: r.cleaned.assessmentType,
          assessmentMode: r.cleaned.assessmentMode,
          state: r.cleaned.state,
          district: r.cleaned.district,
        },
        optional: {
          assessmentMode: optional.mode ? r.optional.assessmentMode : null,
          appliedDepartments: optional.departments ? r.optional.appliedDepartments : null,
          appliedDate: optional.date ? r.optional.appliedDate : null,
          assessmentType: optional.type ? r.optional.assessmentType : null,
        },
      }));
      const reportRows = buildReportRows(
        viewRows,
        ctx?.me?.name ?? "user",
        Date.now(),
      );
      reportRowsRef.current = reportRows;
      const res = await applyBatch({ fileName: sourceLabel(), decisions, reportRows });
      setResult(res);
      setStep(4);
      setAnnouncement(`Import applied. ${res.updated} updated, ${res.noChange} no change, ${res.skipped} skipped.`);
      toast.success(`Applied — ${res.updated} updated, ${res.noChange} no change, ${res.failed} failed`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed — nothing was written";
      toast.error(message);
      setAnnouncement(`Import failed: ${message}`);
    }
    applyingRef.current = false;
    setApplying(false);
  };

  const runUndo = async () => {
    if (!result) return;
    setUndoing(true);
    try {
      const res = await undoBatch({ batchId: result.batchId as Id<"importBatches"> });
      setUndone(true);
      if (res.conflicts.length > 0) {
        setUndoConflicts(res.conflicts.map((c) => ({ rowNo: c.rowNo, reason: c.reason })));
        toast.warning(`Restored ${res.restored} row(s); ${res.conflicts.length} skipped (edited since the import)`);
      } else {
        toast.success(`Import undone — ${res.restored} row(s) restored`);
      }
      setAnnouncement(`Import undone. ${res.restored} rows restored.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not undo the import");
    }
    setUndoing(false);
  };

  const resetWizard = () => {
    setSheet(null);
    reportRowsRef.current = null;
    setMap({});
    setIncludeOverride({});
    setFacilityChoice({});
    setReportChoice({});
    setResult(null);
    setUndone(false);
    setUndoConflicts(null);
    setConfirmed(false);
    setPasteText("");
    setSourceKind("paste");
    setStep(1);
  };

  /** Rows that already equal what an earlier batch wrote (Part 3.2.2). */
  const dupHint = useMemo(() => duplicateRowsHint(viewRows, facilities), [viewRows, facilities]);

  /** "28-Oct-2026 10:47" — IST, no DST, never an ISO date on screen. */
  const formatStamp = (ms: number): string => {
    const d = new Date(ms + 5.5 * 60 * 60 * 1000);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const p = (n: number) => String(n).padStart(2, "0");
    return `${p(d.getUTCDate())}-${months[d.getUTCMonth()]}-${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(
      d.getUTCMinutes(),
    )}`;
  };

  /** Optional "Also update" switches that are ON — shown as a badge. */
  const optionalCount =
    Object.values(optional).filter(Boolean).length + (moveStatus ? 1 : 0);

  /* ---- Render ---- */
  if (ctx === undefined) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading your facilities…
      </div>
    );
  }

  const reviewFooter = (
    <div className="flex flex-wrap items-center gap-2 border-t border-border/60 bg-background/95 px-1 py-2">
      {allNoChange ? (
        <>
          <p className="text-sm text-muted-foreground">
            Nothing to update.{" "}
            {dupHint ? (
              <>
                All {viewRows.length} rows match your import of{" "}
                <strong className="text-foreground">{formatStamp(dupHint.at)}</strong>.
              </>
            ) : (
              <>
                All {viewRows.length} rows already match what is stored.
              </>
            )}
          </p>
          <Button variant="outline" className="ml-auto" onClick={() => onOpenList?.()}>
            Done
          </Button>
          <Button variant="ghost" onClick={resetWizard}>
            Import another
          </Button>
        </>
      ) : (
        <>
          <Button
            onClick={() => void runApply()}
            disabled={!confirmed || applying || blocking || selected.length === 0}
            className="gap-2"
            data-testid="apply-import-changes"
          >
            {applying ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            Apply selected ({selected.length})
          </Button>
          <label className="flex min-h-9 cursor-pointer items-center gap-2 text-xs">
            <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} />
            I have reviewed the previous → new values.
          </label>
          <Button variant="outline" className="ml-auto" onClick={() => setStep(1)}>
            Back
          </Button>
          {blocking && (
            <span className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-300">
              <XCircle className="size-3.5" /> Resolve the included rows that need a decision.
            </span>
          )}
          {!blocking && selected.length === 0 && (
            <span className="text-xs text-muted-foreground">
              Select at least one row with a valid change. Rows that need a decision, cannot be matched, are unchanged or skipped cannot be applied.
            </span>
          )}
          {!confirmed && selected.length > 0 && !blocking && (
            <span className="text-xs text-muted-foreground">
              Tick the review box to enable Apply.
            </span>
          )}
        </>
      )}
    </div>
  );

  const scrollReviewTop = () => {
    document
      .querySelector<HTMLElement>("[data-page-shell-body]")
      ?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const wizardToolbar = (
    <div className="space-y-1 pb-2">
      <div className="flex flex-wrap items-center gap-2">
        <StepBar step={Math.min(step, STEPS.length)} onJump={setStep} />
        <span className="text-xs font-semibold text-foreground">SaQsham status import</span>
        {step === 2 && sheet && (
          <button
            type="button"
            onClick={() => setStep(1)}
            className="rounded-full border border-border/60 px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted/40"
          >
            Columns matched: {matchedColumns} of {sheet.headers.length} · Change
          </button>
        )}
        {step === 2 && (
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto h-7 gap-1 text-[11px]"
            onClick={scrollReviewTop}
            data-testid="review-back-to-top"
          >
            Back to top
          </Button>
        )}
      </div>
      {step === 2 && (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Row filters">
          {CHIPS.map((c) => {
            const active = chip === c.key;
            return (
              <button
                key={c.key}
                type="button"
                aria-pressed={active}
                onClick={() => setChip(active && c.key !== "all" ? "all" : c.key)}
                className={cn(
                  "flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors",
                  active
                    ? "border-primary/50 bg-primary/10 font-semibold text-foreground"
                    : chipCounts[c.key] > 0
                      ? "border-border bg-muted/50 font-medium text-foreground hover:bg-muted"
                      : "border-border/60 text-muted-foreground hover:bg-muted/40",
                )}
              >
                {c.label}
                <span className="tabular-nums">{chipCounts[c.key]}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <PageShell
      toolbar={wizardToolbar}
      footer={step === 2 ? reviewFooter : undefined}
    >
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {/* ================= ① Paste ================= */}
      {step === 1 && !sheet && (
        <div className="space-y-3 rounded-xl border border-border/60 bg-background/60 p-4">
          <div>
            <h3 className="text-sm font-semibold">Paste the SaQsham status report</h3>
            <p className="text-xs text-muted-foreground">
              Copy the rows from Excel, including the header row, then paste here (Ctrl+V). You can paste anywhere on
              this page.
            </p>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) void onFile(f);
            }}
            className={cn(
              "rounded-xl border-2 border-dashed p-2 transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-border/70 bg-muted/10",
            )}
          >
            <Textarea
              value={pasteText}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              data-gramm="false"
              onChange={(e) => setPasteText(e.target.value)}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text/plain");
                if (!text.trim()) return;
                e.preventDefault();
                ingestText(text);
              }}
              placeholder={"Application No\tAssessment Type\tFacility Name/Category\t…\nHWC2602230000026_02\tNew Application\tSivarajpet/UAMM\t…"}
              aria-label="Paste the SaQsham rows"
              className="min-h-44 resize-y border-0 bg-transparent font-mono text-xs shadow-none focus-visible:ring-0"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-1">
              <p className="text-[11px] text-muted-foreground">
                Tab, comma or semicolon · quoted multi-line cells are kept · up to 10 MB / 20,000 rows
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => ingestText(pasteText)} disabled={!pasteText.trim()} className="gap-1.5">
                  <ClipboardPaste className="size-3.5" /> Use pasted rows
                </Button>
                <Button
                  size="sm"
                  variant="link"
                  className="h-auto p-0"
                  onClick={() => {
                    setPasteText(SAQSHAM_SAMPLE_TSV);
                    loadSheet(parsePastedText(SAQSHAM_SAMPLE_TSV));
                  }}
                >
                  Load sample
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline">
              {parsing ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
              Upload .xlsx / .csv
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.tsv,.txt"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onFile(f);
                }}
              />
            </label>
            <Button variant="link" size="sm" className="h-auto gap-1 p-0 text-xs" onClick={() => downloadSampleFile()}>
              <Download className="size-3.5" /> Download template
            </Button>
            <span className="text-[11px] text-muted-foreground">
              Application No, Facility Name/Category and Status are required.
            </span>
          </div>
        </div>
      )}

      {/* ============ ① Add data — detected headers + mapping under the box ============ */}
      {step === 1 && sheet && (
        <div className="space-y-3 rounded-xl border border-border/60 bg-background/60 p-4">
          <PasteSummaryCard
            sheet={sheet}
            onEdit={() => {
              setSheet(null);
              setMap({});
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <FileSpreadsheet className="size-3" /> {sheet.fileName}
            </Badge>
            <span className="text-xs text-muted-foreground">
              header on row {sheet.headerRow + 1} · {matchedColumns} of {sheet.headers.length} columns matched
            </span>
          </div>

          {missingRequired.length > 0 && (
            <p className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                Map every required column to continue:{" "}
                <strong>{missingRequired.map((k) => ALL_COLUMNS.find((c) => c.key === k)?.label ?? k).join(", ")}</strong>
              </span>
            </p>
          )}

          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {PORTAL_COLUMNS.map((col) => (
              <ColumnMappingField
                key={col.key}
                spec={col}
                sheet={sheet}
                value={map[col.key]}
                onChange={(idx) => setMap((m) => ({ ...m, [col.key]: idx }))}
              />
            ))}
          </div>
          <details className="rounded-lg border border-border/60 px-2 py-1.5">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
              Optional fields ({HELPER_COLUMNS.length})
            </summary>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {HELPER_COLUMNS.map((col) => (
                <ColumnMappingField
                  key={col.key}
                  spec={col}
                  sheet={sheet}
                  value={map[col.key]}
                  onChange={(idx) => setMap((m) => ({ ...m, [col.key]: idx }))}
                />
              ))}
            </div>
          </details>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setStep(2)} disabled={missingRequired.length > 0} className="gap-2">
              <ArrowRight className="size-4" /> Review {sheet.dataRows.length} rows
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setSheet(null);
                setPasteText("");
                setMap({});
              }}
            >
              Start over
            </Button>
            {missingRequired.length > 0 && (
              <span className="text-xs text-muted-foreground">Required columns are still unmapped.</span>
            )}
          </div>
        </div>
      )}

      {/* ================= ② Review ================= */}
      {step === 2 && (
        <div className="flex min-h-full flex-col gap-2">
          {sheet && (
            <div className="shrink-0">
              <PasteSummaryCard
                sheet={sheet}
                onEdit={() => {
                  setSheet(null);
                  setMap({});
                  setStep(1);
                }}
              />
            </div>
          )}
          {dupHint && (
            <p
              data-testid="duplicate-banner"
              className="flex items-start gap-2 rounded-lg border border-sky-300/60 bg-sky-500/10 px-3 py-2 text-xs text-sky-900 dark:border-sky-400/40 dark:text-sky-100"
            >
              <Info className="mt-0.5 size-3.5 shrink-0" />
              <span>
                <strong>{dupHint.count}</strong> row{dupHint.count === 1 ? " is" : "s are"} identical to your import
                of {formatStamp(dupHint.at)}. They are marked No change.
              </span>
            </p>
          )}

          <div className="shrink-0">
            <UniversalFilterBar
              pageKey="bulkimport.saqsham.review"
              fields={reviewFields}
              value={bar}
              onChange={setBar}
              summary={`Showing ${shown.length} of ${viewRows.length} rows`}
              leading={
                <div className="relative w-full min-w-0 sm:w-56">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search rows"
                    className="h-9 pl-8 text-xs"
                    aria-label="Search rows"
                  />
                </div>
              }
              trailing={
                acceptSuggestions > 0 ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setFacilityChoice((prev) => {
                        const next = { ...prev };
                        for (const r of viewRows)
                          if (r.state === "needs_review" && r.match.status === "suggested") {
                            const top = r.match.candidates[0];
                            if (top && top.score >= 95) next[r.rowNo] = top.facilityId;
                          }
                        return next;
                      });
                      setIncludeOverride((prev) => {
                        const next = { ...prev };
                        for (const r of viewRows)
                          if (r.state === "needs_review" && r.match.status === "suggested") {
                            const top = r.match.candidates[0];
                            if (top && top.score >= 95) next[r.rowNo] = true;
                          }
                        return next;
                      });
                    }}
                  >
                    <Check className="mr-1 size-3.5" /> Accept suggestions 95% or more ({acceptSuggestions})
                  </Button>
                ) : undefined
              }
            />
          </div>

          {/* Phones: one card per row (the table needs width). */}
          <div className="space-y-2 sm:hidden">
            {shown.map((row) => (
              <MobileRowCard
                key={row.rowNo}
                row={row}
                reportChoice={reportChoice[row.rowNo]}
                onToggleInclude={(next) => setIncludeOverride((p) => ({ ...p, [row.rowNo]: next }))}
                onOpen={() => setDrawerRowNo(row.rowNo)}
              />
            ))}
            {shown.length === 0 && (
              <p className="rounded-lg border border-border/60 p-4 text-center text-xs text-muted-foreground">
                No rows match the current filters.
              </p>
            )}
          </div>

          <div className="hidden sm:block">
            <ImportPreviewTable
              columns={REVIEW_COLUMNS}
              rows={shown}
              groups={reviewGroups}
              facilities={facilities}
              reportChoice={reportChoice}
              onOpenMapping={onOpenMapping}
              groupNames={ctx?.reportGroups ?? REPORT_STATUS_VALUES}
              onToggleInclude={(rowNo, next) => setIncludeOverride((p) => ({ ...p, [rowNo]: next }))}
              onPickFacility={(rowNo, facilityId) => setFacilityChoice((p) => ({ ...p, [rowNo]: facilityId }))}
              onChooseReport={(rowNo, choice) =>
                setReportChoice((prev) => {
                  const next = { ...prev };
                  if (choice === null) delete next[rowNo];
                  else next[rowNo] = choice;
                  return next;
                })
              }
              onOpenRow={(rowNo) => setDrawerRowNo(rowNo)}
            />
          </div>

          {/* More options — everything optional lives here, not on the page. */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5" data-testid="saqsham-more-options">
                  <Settings2 className="size-3.5" /> More options
                  {optionalCount > 0 && (
                    <span className="rounded-full bg-primary/15 px-1.5 text-[10px] text-primary">
                      {optionalCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[min(92vw,26rem)] space-y-2 p-3">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Also update (optional — off by default)
                </p>
                <div className="grid gap-1.5">
                  {(
                    [
                      ["mode", "Assessment Mode", "Physical / Virtual → NQAS Mode"],
                      ["departments", "Applied Departments", "→ Departments / Packages"],
                      ["date", "Application date", "recorded on the import row"],
                      ["type", "Assessment Type", "recorded on the import row"],
                    ] as [keyof typeof optional, string, string][]
                  ).map(([key, label, hint]) => (
                    <label
                      key={key}
                      className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5"
                    >
                      <Checkbox
                        className={ROW_CHECKBOX}
                        checked={optional[key] as boolean}
                        onCheckedChange={(v) => setOptional((o) => ({ ...o, [key]: v === true }))}
                      />
                      <span className="min-w-0">
                        <span className="block text-xs font-medium">{label}</span>
                        <span className="block text-[10px] text-muted-foreground">{hint}</span>
                      </span>
                    </label>
                  ))}
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5">
                    <Checkbox
                      className={ROW_CHECKBOX}
                      checked={optional.overwrite}
                      onCheckedChange={(v) => setOptional((o) => ({ ...o, overwrite: v === true }))}
                    />
                    <span className="text-xs">Overwrite existing values (otherwise only blanks are filled)</span>
                  </label>
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5">
                    <Checkbox
                      className={ROW_CHECKBOX}
                      checked={moveStatus}
                      onCheckedChange={(v) => setMoveStatus(v === true)}
                    />
                    <span className="text-xs">
                      Also move <strong>Facility Current Status</strong> forward when the report status allows it
                    </span>
                  </label>
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5">
                    <Checkbox
                      className={ROW_CHECKBOX}
                      checked={rememberOn}
                      onCheckedChange={(v) => setRememberOn(v === true)}
                    />
                    <span className="text-xs">Remember confirmed matches, so the next paste is automatic</span>
                  </label>
                </div>
              </PopoverContent>
            </Popover>
            <span className="text-[11px] text-muted-foreground">
              Remember confirmed matches is <strong>on</strong> by default.
            </span>
          </div>

        </div>
      )}

      {/* ================= ④ Done ================= */}
      {step === 4 && result && (
        <div className="space-y-3 rounded-xl border border-border/60 bg-background/60 p-4">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <CheckCircle2 className="size-5 text-emerald-600" />
            {undone ? "Import undone" : "Import applied"}
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                ["Successful", result.updated],
                ["Unchanged", result.noChange],
                ["Skipped", result.skipped],
                ["Failed", result.failed],
              ] as [string, number][]
            ).map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border/60 px-3 py-2">
                <span className="block text-[11px] text-muted-foreground">{label}</span>
                <span className="text-lg font-semibold tabular-nums">{value}</span>
              </div>
            ))}
          </div>
          {result.failures.length > 0 && (
            <div className="rounded-lg border border-rose-300/60 bg-rose-50/60 p-3 text-xs dark:bg-rose-500/10">
              <p className="mb-1 font-semibold text-rose-800 dark:text-rose-200">
                {result.failures.length} row{result.failures.length === 1 ? "" : "s"} could not be applied
              </p>
              <ul className="max-h-32 space-y-0.5 overflow-auto text-rose-800/90 dark:text-rose-200/90">
                {result.failures.map((f) => (
                  <li key={f.rowNo}>
                    Row {f.rowNo}: {f.reason}
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  const failed = new Set(result.failures.map((f) => f.rowNo));
                  setIncludeOverride((prev) => {
                    const next = { ...prev };
                    for (const row of viewRows) if (failed.has(row.rowNo)) next[row.rowNo] = true;
                    return next;
                  });
                  setConfirmed(false);
                  setStep(2);
                }}
              >
                Back to review failed rows
              </Button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() =>
                void downloadImportReport({
                  fileName: sourceLabel(),
                  generatedBy: ctx?.me?.name ?? "user",
                  generatedAt: new Date(),
                  reportRows: reportRowsRef.current,
                  rowsTotal: viewRows.length,
                  summary: result,
                  statusMap: (ctx?.statusMap ?? []) as { portal: string; report: string }[],
                })
              }
            >
              <Download className="size-4" /> Download import report (Excel)
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => onOpenList?.()}>
              <ExternalLink className="size-4" /> View updated facilities
            </Button>
            {onOpenHistory && (
              <Button variant="outline" className="gap-2" onClick={onOpenHistory}>
                <HistoryIcon className="size-4" /> Import history
              </Button>
            )}
            {!undone && (
              <Button variant="outline" className="gap-2" onClick={() => void runUndo()} disabled={undoing}>
                {undoing ? <Loader2 className="size-4 animate-spin" /> : <Undo2 className="size-4" />}
                Undo this import
              </Button>
            )}
            <Button variant="ghost" className="gap-2" onClick={resetWizard}>
              <Upload className="size-4" /> Import another paste
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Undo restores the previous values of the rows in this batch. Rows edited after the import are listed and
            skipped, never overwritten.
          </p>
          {undoConflicts && (
            <div className="rounded-lg border border-amber-300/60 bg-amber-50/60 p-3 text-xs dark:bg-amber-500/10">
              <p className="mb-1 font-medium">Some rows were kept because they changed after the import:</p>
              <ul className="space-y-0.5">
                {undoConflicts.map((c) => (
                  <li key={c.rowNo}>
                    Row {c.rowNo}: {c.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Row details drawer */}
      <RowDetailsDrawer
        row={drawerRowNo == null ? null : viewRows.find((r) => r.rowNo === drawerRowNo) ?? null}
        facilities={facilities}
        reportChoice={drawerRowNo == null ? undefined : reportChoice[drawerRowNo]}
        groupNames={ctx?.reportGroups ?? REPORT_STATUS_VALUES}
        onChooseReport={(rowNo, choice) =>
          setReportChoice((prev) => {
            const next = { ...prev };
            if (choice === null) delete next[rowNo];
            else next[rowNo] = choice;
            return next;
          })
        }
        onClose={() => setDrawerRowNo(null)}
        onRemember={(portalName, facilityType, facilityId) => {
          void saveAlias({ portalName, facilityType, facilityId: facilityId as Id<"facilities"> });
          toast.success("Match remembered");
        }}
      />
    </PageShell>
  );
}

/* --------------------------------------------------------------------------- */
/* Row details                                                                  */
/* --------------------------------------------------------------------------- */

/** Row details — the raw row, the cleaned values, the department parse check
 *  and every candidate the matcher considered. */
function RowDetailsDrawer({
  row,
  facilities,
  reportChoice,
  groupNames,
  onChooseReport,
  onClose,
  onRemember,
}: {
  row: PreviewRow | null;
  facilities: SaqshamFacility[];
  reportChoice?: string;
  groupNames: readonly string[];
  onChooseReport: (rowNo: number, choice: string | null) => void;
  onClose: () => void;
  onRemember: (portalName: string, facilityType: string, facilityId: string) => void;
}) {
  if (!row) return null;
  const c = row.cleaned;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-strong max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Row {row.rowNo} — {c.portalFacilityRaw}
          </DialogTitle>
          <DialogDescription>
            {STATE_STYLES[row.state].label} · {matchLabel(row)}
            {row.keptResultDeclared ? " · Kept: result declared" : ""}
            {row.movedBack ? " · Status moved back" : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <section>
            <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Matched facility</h4>
            <p>
              {row.facilityName || "—"} · {row.facilityBlock} · {row.facilityPhc} ({row.facilityType})
            </p>
            {row.facilityId && (
              <Button
                size="sm"
                variant="outline"
                className="mt-1"
                onClick={() => onRemember(c.name, c.facilityType, row.facilityId as string)}
              >
                Remember this match
              </Button>
            )}
          </section>
          <section>
            <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Cleaned values</h4>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <dt className="text-muted-foreground">Application No</dt>
              <dd>{c.applicationNo || "—"}</dd>
              <dt className="text-muted-foreground">Name / category</dt>
              <dd>
                {c.name} / {c.category || "—"} → {c.facilityType || "unknown"}
              </dd>
              <dt className="text-muted-foreground">Portal status</dt>
              <dd>{c.statusRaw || "—"}</dd>
              <dt className="text-muted-foreground">Report group</dt>
              <dd className="space-y-1">
                <span className="block">
                  {previousReportLabel(row)} → {nextReportLabel(row)}
                </span>
                {(row.unmappedStatus || reportChoice !== undefined) && (
                  <ReportChoiceCell
                    row={row}
                    value={reportChoice}
                    onChoose={onChooseReport}
                    groupNames={groupNames}
                  />
                )}
              </dd>
              <dt className="text-muted-foreground">Applied date</dt>
              <dd>{c.appliedDate ? toDdMmmYyyy(c.appliedDate) : "—"}</dd>
              <dt className="text-muted-foreground">Last update</dt>
              <dd>{c.lastUpdate.date ? toDdMmmYyyy(c.lastUpdate.date) : c.lastUpdate.updatedBy || "—"}</dd>
            </dl>
          </section>
          <section>
            <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Departments ({c.appliedDepartments.statedCount ?? "?"} stated, {c.appliedDepartments.departments.length}{" "}
              parsed)
            </h4>
            {c.appliedDepartments.ok ? (
              <p className="text-xs">{c.appliedDepartments.departments.join(", ") || "—"}</p>
            ) : (
              <p className="text-xs text-amber-700 dark:text-amber-300">{c.appliedDepartments.raw || "—"}</p>
            )}
          </section>
          <section>
            <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Why it matched / candidates
            </h4>
            <ul className="space-y-1 text-xs">
              {row.match.status === "matched" && <li>Matched via {matchLabel(row)}.</li>}
              {row.match.status !== "matched" &&
                row.match.candidates.map((cand) => {
                  const f = facilities.find((x) => x.id === cand.facilityId);
                  return (
                    <li key={cand.facilityId}>
                      {f ? `${f.name} · ${f.block} · ${f.phc}` : cand.facilityId} — {cand.score}%
                    </li>
                  );
                })}
              {row.match.status === "unmatched" && <li>No candidate in the same Facility Type.</li>}
            </ul>
          </section>
          <section>
            <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Raw row</h4>
            <pre className="max-h-40 overflow-auto rounded border border-border/60 bg-muted/30 p-2 text-[10px]">
              {JSON.stringify(c.raw, null, 2)}
            </pre>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
