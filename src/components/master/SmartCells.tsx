/**
 * SMART CELLS — the one place a cell is turned into pixels.
 *
 * Every cell type in the master-column config has exactly one renderer here,
 * and the exports reproduce the same wording/format from `cellText`, so the
 * screen and the paper never disagree. Accessibility: colour is never the only
 * signal — every pill carries an icon and the text itself.
 */

import { memo } from "react";
import { useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  FileText,
  Flame,
  Link2,
  Minus,
  XCircle,
} from "lucide-react";

import { Link } from "react-router";

import { api } from "@/convex/_generated/api";
import { FacilityCell as SharedFacilityCell } from "@/components/FacilityCell";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  TONE_BG,
  TONE_HEX,
  blankLabel,
  cellValue,
  COMPARE_NO_CHANGE_BAND,
  daysUntil,
  dueState,
  formatInr,
  formatPercent,
  nextDueOf,
  SCORE_DECIMALS,
  scoreTone,
  toDdMmmYyyy,
  type CellValue,
  type MasterColumn,
  DOCUMENT_LINK_COLUMNS,
  type MasterRow,
  type Tone,
} from "@/lib/masterColumns";
import { isDuplicateName } from "@/lib/masterFilter";
import type { Density } from "@/lib/masterView";
import { surveillanceVisits, type NqasLike } from "@/convex/lifecycle";

/** Kept for anything that still wants the plain placeholder; the table itself
 *  no longer prints a bare dash (see EmptyCell). */
export const EMPTY_TEXT = "—";

/* --------------------------------------------------------------------------- */
/* Status pill                                                                 */
/* --------------------------------------------------------------------------- */

const PILL_CLASS: Record<Tone, string> = {
  green:
    "border-emerald-300/70 bg-emerald-100 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-100",
  amber:
    "border-amber-300/70 bg-amber-100 text-amber-900 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-100",
  red: "border-rose-300/70 bg-rose-100 text-rose-900 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-100",
  blue: "border-sky-300/70 bg-sky-100 text-sky-900 dark:border-sky-400/40 dark:bg-sky-500/15 dark:text-sky-100",
  slate: "border-border/60 bg-muted text-muted-foreground",
  violet:
    "border-violet-300/70 bg-violet-100 text-violet-900 dark:border-violet-400/40 dark:bg-violet-500/15 dark:text-violet-100",
};

/** Coloured pill with icon + text (never colour alone). */
export function StatusPill({
  value,
  compact,
}: {
  value: string;
  compact?: boolean;
}) {
  /* ONE shared badge, one fixed colour map — no per-column pill variants. */
  return <StatusBadge status={value} compact={compact} />;
}

/* --------------------------------------------------------------------------- */
/* Score + compare                                                              */
/* --------------------------------------------------------------------------- */

/** Number plus a mini progress bar: ≥70% green, 50–69% amber, <50% red. */
export function ScoreBar({ value }: { value: number }) {
  const tone = scoreTone(value) ?? "slate";
  const bar =
    tone === "green" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-500" : "bg-rose-500";
  return (
    <span className="flex min-w-0 items-center justify-end gap-1" data-tip={`${value}%`}>
      <span className="h-1.5 w-5 shrink-0 overflow-hidden rounded-full bg-muted">
        <span
          className={cn("block h-full rounded-full", bar)}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </span>
      <span className="shrink-0 text-[11px] tabular-nums">{formatPercent(value)}</span>
    </span>
  );
}

/** ▲ / ▼ / ■ with the current − previous difference, printed with the shared
 *  SCORE_DECIMALS ("+0.04", "-0.50", "0.00"). The icon, the colour AND the
 *  signed number are all present, so the direction survives greyscale print. */
export function CompareCell({
  value,
  tip,
}: {
  value: number | null;
  /** Why a comparison is unavailable ("Q1 2026-27 has no NQAS IA score"). */
  tip?: string;
}) {
  if (value == null)
    return (
      <span
        className="text-muted-foreground"
        data-tip={tip ?? "Both quarters are needed for a comparison"}
      >
        {EMPTY_TEXT}
      </span>
    );
  const signed = `${value > 0 ? "+" : value < 0 ? "-" : ""}${Math.abs(value).toFixed(SCORE_DECIMALS)}`;
  // Inside the no-change band the direction is not real: ■ with the exact
  // number in the tooltip (“+0.01, within the no-change band”).
  if (Math.abs(value) < COMPARE_NO_CHANGE_BAND) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 tabular-nums dark:text-slate-300"
        data-tip={`${signed}, within the no-change band (±${COMPARE_NO_CHANGE_BAND})`}
      >
        <span aria-hidden>■</span>
        {signed}
      </span>
    );
  }
  const up = value > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap tabular-nums",
        up ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300",
      )}
      data-tip={`${up ? "Up" : "Down"} ${signed} against the previous quarter`}
    >
      {up ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden />}
      {signed}
    </span>
  );
}

/* --------------------------------------------------------------------------- */
/* Dates                                                                       */
/* --------------------------------------------------------------------------- */

export function DateCell({ value }: { value: string | number }) {
  return <span className="text-sm whitespace-nowrap tabular-nums">{toDdMmmYyyy(value)}</span>;
}

/** Date + relative chip: Overdue 12d (red) · Due in 20d (amber) · Valid till
 *  2028 (green). `today` is injectable so exports and tests can pin it. */
export function DueChip({
  iso,
  today,
  greenLabel = "Valid till",
}: {
  iso: string;
  today?: Date;
  greenLabel?: string;
}) {
  const days = daysUntil(iso, today);
  const state = dueState(days);
  const label = toDdMmmYyyy(iso);
  if (state === "none")
    return <span className="text-sm whitespace-nowrap tabular-nums">{label}</span>;
  const chip =
    state === "overdue"
      ? { text: `Overdue ${Math.abs(days!)}d`, cls: "bg-rose-100 text-rose-900 border-rose-300/70 dark:bg-rose-500/15 dark:text-rose-100 dark:border-rose-400/40" }
      : state === "soon"
        ? { text: `Due in ${days}d`, cls: "bg-amber-100 text-amber-900 border-amber-300/70 dark:bg-amber-500/15 dark:text-amber-100 dark:border-amber-400/40" }
        : { text: `${greenLabel} ${iso.slice(0, 4)}`, cls: "bg-emerald-100 text-emerald-900 border-emerald-300/70 dark:bg-emerald-500/15 dark:text-emerald-100 dark:border-emerald-400/40" };
  // ONE line per cell: the date and the relative chip share the line, so the
  // cell can never change the row height (the old stacked version staggered
  // the rows around it).
  return (
    <span
      className="flex min-w-0 items-center gap-1 whitespace-nowrap"
      data-tip={`${chip.text} — ${label}`}
    >
      <span className="text-sm tabular-nums">{label}</span>
      <span
        className={cn(
          "inline-flex items-center gap-1 overflow-hidden rounded-full border px-1.5 text-[11px] font-semibold whitespace-nowrap",
          chip.cls,
        )}
      >
        {state !== "ok" && <AlertTriangle className="size-2.5 shrink-0" aria-hidden />}
        <span className="truncate">{chip.text}</span>
      </span>
    </span>
  );
}

/** Surveillance due date + the visit's REAL state.
 *
 *  Root cause of "Overdue 67d" beside a completed visit: the generic DueChip
 *  only knows the due date, so a due date in the past always read Overdue —
 *  even when the 1st surveillance had been done. This chip reads the ONE visit
 *  rule (1st/2nd done, valid only when the done date is a real, non-future
 *  visit), so Done can never show Overdue or Due. */
export function SurveillanceDueChip({
  row,
  which,
  today,
}: {
  row: MasterRow;
  which: "surv1" | "surv2";
  today?: Date;
}) {
  const base = today ?? new Date();
  const todayIso = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(
    base.getDate(),
  ).padStart(2, "0")}`;
  const visit = surveillanceVisits(
    (row.nqas ?? null) as Partial<NqasLike> | null,
    null,
    todayIso,
  ).find((v) => v.key === which);
  if (!visit) return null;
  const tone: Tone =
    visit.tone === "slate" ? "slate" : (visit.tone as Tone);
  const Icon =
    visit.state === "done"
      ? CheckCircle2
      : visit.state === "overdue"
        ? XCircle
        : visit.state === "dueSoon"
          ? AlertTriangle
          : Clock3;
  const dueLabel = visit.due ? toDdMmmYyyy(visit.due) : "no due date";
  return (
    <span
      className="flex min-w-0 items-center gap-1 whitespace-nowrap"
      data-tip={`${visit.detail ?? visit.chip}${visit.due ? ` · due ${dueLabel}` : ""}`}
    >
      <span className="text-sm tabular-nums">{dueLabel}</span>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-1.5 text-[11px] font-semibold whitespace-nowrap",
          PILL_CLASS[tone],
        )}
      >
        <Icon className="size-2.5 shrink-0" aria-hidden />
        <span className="truncate">{visit.chip}</span>
      </span>
    </span>
  );
}

/* --------------------------------------------------------------------------- */
/* Next action / due + blanks + identity                                        */
/* --------------------------------------------------------------------------- */

/** The single next deadline for a facility, as a chip: red = overdue, amber =
 *  due inside 30 days, green = a valid certificate / NOC, blue = a scheduled
 *  step. Always paired with an icon and words, never colour alone. */
export function NextActionCell({
  row,
  dense,
  today,
}: {
  row: MasterRow;
  dense?: boolean;
  today?: Date;
}) {
  const next = nextDueOf(row, today);
  // "Not started" belongs to a lifecycle stage, never to a missing deadline.
  if (!next) return <span className="text-sm text-muted-foreground">-</span>;

  const days = daysUntil(next.iso, today);
  const state = dueState(days);
  const timing =
    state === "overdue"
      ? `Overdue ${Math.abs(days ?? 0)}d`
      : state === "soon"
        ? `Due in ${days}d`
        : null;
  const date = toDdMmmYyyy(next.iso);

  // The label and date are two lines so a narrow Next Action / Due column
  // never cuts either; overdue days stay red and explicit.
  return (
    <span
      className="flex min-w-0 flex-col justify-center gap-0.5"
      data-tip={`${next.label} — ${date}${timing ? ` · ${timing}` : ""}`}
    >
      <span className="truncate text-[10px] leading-none text-muted-foreground">
        {next.label}
      </span>
      <span className={cn("flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0 leading-none", dense && "gap-x-0.5")}>
        <span className="shrink-0 text-xs font-medium tabular-nums">{date}</span>
        {timing && (
          <span
            className={cn(
              "whitespace-nowrap text-[10px] font-semibold",
              state === "overdue" ? "text-rose-700" : "text-amber-700",
            )}
          >
            {timing}
          </span>
        )}
      </span>
    </span>
  );
}

/** Blank cell rules:
 *
 *   • a status column with no value reads as a quiet “Not started” pill,
 *   • a quarterly comparison reads as muted “Not recorded”,
 *   • a score, date, currency, link or text column reads as “-”, never 0,
 *     so a missing value is visible without looking like a real figure. */
export function EmptyCell({ column }: { column: MasterColumn }) {
  const label = blankLabel(column);
  if (!label) return null;
  // Status columns keep the grey pill (colour + text), the rest are muted text.
  if (column.type === "status") return <StatusPill value={label} />;
  return <span className="text-xs text-muted-foreground">{label}</span>;
}

/** Identity cell — the facility name, with a muted “PHC · Block” second line
 *  for the duplicate names the district really has (three "Vallipattu" rows),
 *  so the table never looks like it repeats itself. */
export function FacilityCell({
  row,
  dense,
  duplicate,
}: {
  row: MasterRow;
  /** Compact rows drop the suffix — the tooltip carries the full context. */
  dense?: boolean;
  duplicate?: boolean;
}) {
  // ONE shared identity cell everywhere — the duplicate-name suffix is part
  // of its second line now, so `duplicate` is intentionally unused.
  void duplicate;
  return (
    <SharedFacilityCell
      facility={row.facility}
      compact={dense}
    />
  );
}

/* --------------------------------------------------------------------------- */
/* Links, long text, currency                                                   */
/* --------------------------------------------------------------------------- */

/** Attachment/URL cell: an icon button with a tooltip, never a raw URL. */
export function LinkCell({ value }: { value: Extract<CellValue, { kind: "link" }> }) {
  const hasAttachment = !!value.attachmentId;
  const hasUrl = !!value.url;
  if (!hasAttachment && !hasUrl) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Minus className="size-3" aria-hidden />
      </span>
    );
  }
  const Icon =
    value.icon === "file" && /checklist|excel/i.test(value.name ?? "")
      ? FileSpreadsheet
      : value.icon === "flame"
        ? Flame
        : value.icon === "rupee" || value.icon === "building"
          ? Link2
          : FileText;
  return hasAttachment ? (
    <AttachmentLink id={value.attachmentId!} name={value.name} Icon={Icon} />
  ) : (
    <a
      href={value.url!}
      target="_blank"
      rel="noreferrer"
      data-tip={value.name ?? "Open link"}
      aria-label={value.name ?? "Open link"}
      className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Icon className="size-4" aria-hidden />
      <span className="sr-only">Open link</span>
    </a>
  );
}

/** Resolves the storage id → download URL lazily, only for cells that hold one. */
function AttachmentLink({
  id,
  name,
  Icon,
}: {
  id: string;
  name: string | null;
  Icon: typeof FileText;
}) {
  const url = useQuery(api.modules.getAttachmentUrl, { storageId: id as never });
  const label = name ?? "View file";
  return (
    /* ONE tooltip system: the shared `data-tip` layer, never a second
       floating library next to it. */
    <a
      href={url ?? "#"}
      target="_blank"
      rel="noreferrer"
      data-tip={label}
      aria-label={label}
      className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Icon className="size-4" aria-hidden />
      <span className="sr-only">{label}</span>
    </a>
  );
}

/** Icon component for a Documents-bucket slot (matches the column icon key
 *  on the config, same mapping as LinkCell). */
function docIconFor(icon: string): typeof FileText {
  return icon === "flame"
    ? Flame
    : icon === "rupee" || icon === "building"
      ? Link2
      : FileText;
}

/** The MERGED view-only "Documents" bucket (Part 3): five fixed slots — SA
 *  Report, SA Checklist, Gap Closure Proc. Link, Condemned Link, NOC Link —
 *  as small icon buttons (greyed when that document is missing, tooltip with
 *  the name) plus an "n/5" count. Fixed row height: one line, never wraps */
export function DocsBucketCell({
  value,
}: {
  value: Extract<CellValue, { kind: "links" }>;
}) {
  const present = new Map(value.items.map((d) => [d.key, d]));
  return (
    <span className="flex items-center justify-center gap-0.5 whitespace-nowrap">
      {DOCUMENT_LINK_COLUMNS.map((slot) => {
        const d = present.get(slot.key);
        const Icon = docIconFor(slot.icon);
        const href = d?.url ?? (d?.attachmentId ? `#${d.attachmentId}` : undefined);
        return d ? (
          <a
            key={slot.key}
            href={href}
            target={d?.url ? "_blank" : undefined}
            rel="noreferrer"
            data-tip={`${slot.label}${d.name ? ` — ${d.name}` : ""}`}
            className="inline-flex size-6 items-center justify-center rounded text-primary transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Icon className="size-3.5" aria-hidden />
            <span className="sr-only">{d.name ?? slot.label}</span>
          </a>
        ) : (
          <span
            key={slot.key}
            data-tip={`${slot.label} — not attached`}
            className="inline-flex size-6 items-center justify-center rounded text-muted-foreground/40"
          >
            <Icon className="size-3.5" aria-hidden />
            <span className="sr-only">{slot.label} — not attached</span>
          </span>
        );
      })}
      <span
        className="ml-0.5 text-[10px] font-medium text-muted-foreground"
        data-tip={
          value.docs
            ? `${value.docs.uploaded} of ${value.docs.total} documents uploaded`
            : `${value.present}/${value.max} link fields filled`
        }
      >
        {value.docs ? `${value.docs.uploaded}/${value.docs.total}` : `${value.present}/${value.max}`}
      </span>
      {/* Admin-rule required documents that are missing — the SAME list the
          Documents banner, the Overview card and Needs attention print. Amber
          fill + icon + text, so the state never relies on colour alone. */}
      {(value.docs?.requiredMissing?.length ?? 0) > 0 && (
        <span
          className="ml-0.5 inline-flex shrink-0 items-center gap-0.5 rounded-full border border-amber-300/70 bg-amber-50 px-1 text-[10px] font-semibold whitespace-nowrap text-amber-900"
          data-testid="master-documents-required-missing"
          role="img"
          aria-label={`Required document missing: ${value.docs!.requiredMissing!.map((m) => m.label).join(", ")}`}
          data-tip={`Required missing: ${value.docs!.requiredMissing!.map((m) => m.label).join(", ")}`}
        >
          <AlertTriangle className="size-2.5" aria-hidden /> {value.docs!.requiredMissing!.length}
        </span>
      )}
    </span>
  );
}

/** Long text (remarks, departments) clamps to fit the FIXED row height:
 *  one line in compact rows (never wraps), two lines maximum in comfortable
 *  ones, with the full text in a hover tooltip and a click popover. Nothing
 *  in here can ever make a row taller than the density's fixed height. */
export function LongTextCell({
  value,
  title,
  /** true = never wrap (compact rows); false = clamp to 2 lines. */
  oneLine,
}: {
  value: string;
  title?: string;
  oneLine?: boolean;
}) {
  const text = title ?? value;
  // Single line + ellipsis: used by compact rows and any short value.
  if (oneLine || value.length <= 60)
    return (
      <span className="truncate text-sm whitespace-nowrap" data-tip={text} data-tip-truncate>
        {value}
      </span>
    );
  // Comfortable rows: clamp to TWO lines inside the fixed row height; the
  // full text lives in the hover tooltip and opens in a popover on click.
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-tip={text}
          className="w-full cursor-pointer rounded-md px-1 py-0.5 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span className="line-clamp-2 text-sm break-words">{value}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-w-sm text-sm whitespace-pre-wrap">
        {value}
      </PopoverContent>
    </Popover>
  );
}

export function CurrencyCell({ value }: { value: number }) {
  return <span className="text-sm tabular-nums">{formatInr(value)}</span>;
}

/* --------------------------------------------------------------------------- */
/* Dispatcher                                                                  */
/* --------------------------------------------------------------------------- */

function SmartCellView({
  row,
  column,
  value,
  today,
  dupes,
  density,
  oneLine,
  fullText = false,
}: {
  row: MasterRow;
  column: MasterColumn;
  /** Pre-computed value (the table computes it once per render). */
  value?: CellValue;
  today?: Date;
  /** Names used by more than one row — drives the identity suffix. */
  dupes?: Set<string>;
  /** Row density; compact keeps cells on one line. */
  density?: Density;
  /** One value per cell, single line: the table passes true so long text —
   *  like a remarks sentence or a long departments list — can never change
   *  the row height. */
  oneLine?: boolean;
  /** Quick View uses the full portal phrase; the grid keeps two lines. */
  fullText?: boolean;
}) {
  const v = value ?? cellValue(row, column.key);
  if (column.primary)
    return (
      <FacilityCell
        row={row}
        dense={density === "compact"}
        duplicate={dupes ? isDuplicateName(row, dupes) : false}
      />
    );
  switch (v.kind) {
    case "empty":
      return <EmptyCell column={column} />;
    case "text":
      return column.type === "longtext" ? (
        <LongTextCell value={v.value} oneLine={oneLine ?? density === "compact"} />
      ) : (
        <span
          className={cn(
            column.key === "genDoc"
              ? cn("text-[13px] leading-snug break-words", !fullText && "line-clamp-2")
              : "text-sm",
            column.key !== "genDoc" &&
              (oneLine ? "truncate whitespace-nowrap" : "line-clamp-2 break-words"),
          )}
          data-tip={v.tip ?? v.value}
          data-tip-truncate>
          {v.value}
        </span>
      );
    case "status":
      return <StatusPill value={v.value} compact={density === "compact"} />;
    case "score":
      return <ScoreBar value={v.value} />;
    case "compare":
      return (
        <CompareCell
          value={v.value}
          tip={v.value == null ? compareUnavailableTip(row, column.key) : undefined}
        />
      );
    case "date":
      return <DateCell value={v.value} />;
    case "dueDate":
      if (column.key === "nextAction")
        return <NextActionCell row={row} dense={density === "compact"} today={today} />;
      if (column.key === "survDue1")
        return <SurveillanceDueChip row={row} which="surv1" today={today} />;
      if (column.key === "survDue2")
        return <SurveillanceDueChip row={row} which="surv2" today={today} />;
      return v.value ? (
        <DueChip iso={v.value} today={today} />
      ) : (
        <span className="text-xs text-muted-foreground">Not started</span>
      );
    case "currency":
      return <CurrencyCell value={v.value} />;
    case "link":
      return <LinkCell value={v} />;
    case "links":
      return <DocsBucketCell value={v} />;
    default:
      return null;
  }
}

/** Memoized: a visible row only repaints when its own value/column changes. */
export const SmartCell = memo(SmartCellView);

/** Which quarter is missing, by name — never a bare "both quarters needed".
 *  The comparison is read-only and computed from the stored IA rows. */
function compareUnavailableTip(row: MasterRow, columnKey: string): string {
  const tracker = columnKey.startsWith("kayakalp")
    ? "kayakalp"
    : columnKey.startsWith("eco")
      ? "eco"
      : "nqas";
  const label = tracker === "nqas" ? "NQAS" : tracker === "kayakalp" ? "Kayakalp" : "Eco-Friendly";
  const pair = row.iaq?.pair;
  if (!pair) return `No ${label} IA quarter has data yet`;
  const scoreOf = (fy: string, q: number) => {
    const hit = (row.iaq?.rows ?? []).find((r) => r.fy === fy && r.quarter === q);
    if (!hit) return null;
    return tracker === "nqas"
      ? (hit.nqasIaScore ?? null)
      : tracker === "kayakalp"
        ? (hit.kayakalpIaScore ?? null)
        : (hit.ecoFriendlyScore ?? null);
  };
  if (scoreOf(pair.previous.fy, pair.previous.q) == null) {
    return `Q${pair.previous.q} ${pair.previous.fy} has no ${label} IA score — nothing to compare against`;
  }
  if (scoreOf(pair.current.fy, pair.current.q) == null) {
    return `Q${pair.current.q} ${pair.current.fy} has no ${label} IA score — nothing to compare`;
  }
  return "Calculated from the two latest quarters with data";
}

/** Print-safe pill for the PDF export — the same words, a solid tint and a
 *  bordered box so it reads correctly in black and white. */
export function exportPillStyle(tone: Tone): { fill: string; text: string; border: string } {
  return {
    fill: TONE_BG[tone],
    text: TONE_HEX[tone],
    border: TONE_HEX[tone],
  };
}

/** Helper used by the KPI strip and the empty states. */
export function SkeletonRows({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-8 animate-pulse rounded-md bg-muted/60"
          style={{ opacity: 1 - i * 0.08 }}
        />
      ))}
    </div>
  );
}

/** Small "no rows" panel with a helpful next step. */
export function NoRows({
  total,
  onClear,
}: {
  total: number;
  onClear?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Button asChild variant="ghost" className="pointer-events-none size-10 p-0">
          <span>
            <Minus className="size-5" />
          </span>
        </Button>
      </span>
      <p className="mt-3 text-base font-semibold text-foreground">
        {total === 0 ? "No facilities yet" : "No facilities match these filters"}
      </p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {total === 0
          ? "Add your first facility with the “Add facility” button, or import a district sheet from Bulk Import."
          : "Try clearing a filter chip or searching for a different facility, PHC, block or NIN."}
      </p>
      {onClear && total > 0 && (
        <Button variant="outline" className="mt-4" onClick={onClear}>
          Clear all
        </Button>
      )}
    </div>
  );
}
