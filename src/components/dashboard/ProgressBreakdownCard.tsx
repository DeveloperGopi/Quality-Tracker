/**
 * PROGRESS BREAKDOWN CARD (Parts B0–B7) — replaces the old "Progress by block"
 * bar strip and the "Facility-type summary" tiles with ONE card, three views,
 * one palette, one drill-down.
 *
 * Every number comes from `buildBreakdown` (lib/breakdown) — the card computes
 * nothing of its own. The header controls (dimension, view, count/share, sort,
 * denominator) persist in the URL (?bd=…) and in the per-user session
 * (localStorage), so a deep link opens the card exactly as it was left.
 *
 * Layout contract (unchanged from the dashboards before it):
 *   • container queries (@container) — responsive to the card width, so the
 *     collapsible sidebar keeps the layout intact;
 *   • bottom padding reserved for the floating action button;
 *   • the Excel/PDF buttons read lib/breakdownExport (same numbers).
 */

import { lazy, Suspense, useMemo, useRef, useState } from "react";

import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { Link } from "react-router";
import {
  ArrowDownNarrowWide,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  BUCKET_BY_KEY,
  BUCKET_ORDER,
  breakdownListUrl,
  breakdownTakeaway,
  rowBadgeFor,
  sortBreakdownRows,
  type BreakdownFacility,
  type Breakdown,
  type BreakdownBucket,
  type BreakdownDimension,
  type BreakdownSortId,
  type BreakdownView,
} from "@/lib/breakdown";
import {
  type BreakdownUrlState,
} from "@/lib/breakdownUrl";
import { exportBreakdown } from "@/lib/breakdownExport";

const BreakdownHeatmap = lazy(() => import("./BreakdownHeatmap"));
const SizeShareChart = lazy(() => import("./SizeShareChart"));

/* ------------------------------------------------------------------ */
/* The card                                                            */
/* ------------------------------------------------------------------ */

export type ProgressBreakdownCardProps = {
  breakdown: Breakdown;
  /** The same facilities the breakdown was built from — the heatmap needs
   *  the row level to build its Block × Type cross-tab (no own counts). */
  facilities: readonly BreakdownFacility[];
  /** CONTROLLED state — the Dashboard owns the URL/session hook
   *  (lib/breakdownUrl) because the dimension rebuilds the model. */
  state: BreakdownUrlState;
  onState: (next: Partial<BreakdownUrlState>) => void;
  /** Per-user detail — the facility names behind each segment for tooltips. */
  facilityNames?: Map<string, string[]>;
  dataAsOf?: string | null;
  /** Admin adds the PHC dimension (Part A.1: optional, default OFF). */
  isAdmin?: boolean;
  /** Show the PHC option only when the caller allows (block logins/admin). */
  allowPhc?: boolean;
};

export default function ProgressBreakdownCard({
  breakdown: bd,
  facilities,
  facilityNames,
  dataAsOf,
  isAdmin = false,
  allowPhc = false,
  state,
  onState: patch,
}: ProgressBreakdownCardProps) {

  const rows = useMemo(
    () => sortBreakdownRows(bd.rows, state.sort),
    [bd, state.sort],
  );
  const takeaway = useMemo(
    () => breakdownTakeaway(rows, bd.avgPct, bd.total, bd.holdCert),
    [rows, bd.avgPct, bd.total, bd.holdCert],
  );
  const [isolated, setIsolated] = useState<BreakdownBucket | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [pngBusy, setPngBusy] = useState(false);

  /** When a legend bucket is isolated, only groups holding that bucket stay
   *  in the table; the bar itself hides the other segments. */
  const shown = isolated
    ? rows.filter((r) => r.buckets[isolated] > 0)
    : rows;

  const exportPng = async () => {
    if (!chartRef.current || pngBusy) return;
    setPngBusy(true);
    try {
      // snapdom is heavy — fetched only when a PNG is actually requested,
      // exactly like the other heavy export libraries.
      const { snapdom } = await import("@zumer/snapdom");
      const canvas = await snapdom.toCanvas(chartRef.current, { fast: true });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `progress-breakdown-${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
    } finally {
      setPngBusy(false);
    }
  };

  return (
    <Card className="glass mb-6">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <div className="flex min-w-0 items-center gap-2">
          <CardTitle className="text-base">Progress breakdown</CardTitle>
          <InfoTip
            tip={
              "One row per group. Buckets are mutually exclusive and sum to the Facilities count. " +
              "Certified % = facilities holding a certificate (Quality + Conditional) ÷ " +
              (bd.denominator === "eligible" ? "eligible facilities." : "all facilities.") +
              " Recertification due and Surveillance due are badges on the row, not bar segments."
            }
          />
          {dataAsOf && (
            <span className="shrink-0 text-xs text-muted-foreground">
              Data as of {dataAsOf}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Dimension (B0) — segmented control */}
          <SegmentedControl<BreakdownDimension>
            value={state.dim}
            onValue={(dim) => patch({ dim })}
            options={[
              { value: "block", label: "By block" },
              { value: "type", label: "By facility type" },
              ...(allowPhc || isAdmin ? [{ value: "phc" as const, label: "By PHC" }] : []),
            ]}
            ariaLabel="Group by"
          />
          {/* View (B0) — segmented control */}
          <SegmentedControl<BreakdownView>
            value={state.view}
            onValue={(view) => patch({ view })}
            options={[
              { value: "bars", label: "Bars + table" },
              { value: "heat", label: "Heatmap" },
              { value: "size", label: "Size & share" },
            ]}
            ariaLabel="View"
          />
          {/* Mode (B1) — Count | Share % */}
          <SegmentedControl<"count" | "share">
            value={state.mode}
            onValue={(mode) => patch({ mode })}
            options={[
              { value: "count", label: "Count" },
              { value: "share", label: "Share %" },
            ]}
            ariaLabel="Bar length"
          />
          {/* Sort (B0) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <ArrowDownNarrowWide className="size-3.5" />
                {SORT_LABELS[state.sort]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Sort rows</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={state.sort}
                onValueChange={(v) => patch({ sort: v as BreakdownSortId })}
              >
                {(Object.entries(SORT_LABELS) as [BreakdownSortId, string][]).map(
                  ([id, label]) => (
                    <DropdownMenuRadioItem key={id} value={id}>
                      {label}
                    </DropdownMenuRadioItem>
                  ),
                )}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Denominator toggle (A.3) */}
          <SegmentedControl<"all" | "eligible">
            value={state.denom}
            onValue={(denom) => patch({ denom })}
            options={[
              { value: "all", label: "÷ all" },
              { value: "eligible", label: "÷ eligible" },
            ]}
            ariaLabel="Rate denominator"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <FileSpreadsheet className="size-3.5" aria-hidden /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => void exportBreakdown(bd, "xlsx", "progress-breakdown")}>
                <FileSpreadsheet className="size-3.5" /> Excel
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void exportBreakdown(bd, "pdf", "progress-breakdown")}>
                <FileText className="size-3.5" /> PDF (table + chart)
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={pngBusy}
                onSelect={() => void exportPng()}
                data-testid="png-export"
              >
                <ImageIcon className="size-3.5" /> PNG of the chart
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {/* Takeaway (B5) — guarded template; null when nothing to say. */}
        {takeaway && (
          <p className="mb-3 text-sm text-muted-foreground" data-testid="takeaway">
            {takeaway}
          </p>
        )}
        {/* Legend (B5) — present buckets only, with a "show all" link. Rows
            visible in the chart when a bucket is isolated. */}
        <BucketLegend
          breakdown={bd}
          isolated={isolated}
          onIsolate={(b) => setIsolated(b === isolated ? null : b)}
        />
        <div ref={chartRef} className="@container" data-testid="breakdown-chart">
          <Suspense
            fallback={
              <div className="h-72 w-full animate-pulse rounded-xl bg-muted/40" />
            }
          >
            {state.view === "bars" ? (
              <BarTableView
                bd={bd}
                rows={shown}
                isolated={isolated}
                mode={state.mode}
              />
            ) : state.view === "heat" ? (
              <BreakdownHeatmap facilities={facilities} />
            ) : (
              <SizeShareChart breakdown={bd} mode={state.mode} />
            )}
          </Suspense>
        </div>

        {/* Bottom padding equals the FAB + clearance — the card can never be
            covered by the floating button (B6). */}
        <div className="pb-20 md:pb-6" aria-hidden />
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Bar-table view (B1)                                                 */
/* ------------------------------------------------------------------ */

/** Narrow-container columns (B6): hidden under 900px of CARD width, where
 *  the same numbers move into the segment tooltips. A pure class so the
 *  header, body and grand row can never drift apart (the header/body
 *  contract). The layout stays container-query driven, so it re-measures
 *  when the collapsible sidebar opens or closes. */
const DETAIL_COL = "hidden @[900px]:table-cell";

/** Keyboard plan (test 6): ArrowUp/Down hops between rows (the row-name
 *  link), ArrowLeft/Right hops between the row's segment links, Enter
 *  follows the focused link (native anchor behaviour). */
function moveFocusAcrossRowsAndSegments(e: ReactKeyboardEvent<HTMLTableElement>) {  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const table = e.currentTarget;
  let indexIn = -1;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    const rowLinks = Array.from(
      table.querySelectorAll<HTMLElement>("[data-row] td:first-child a"),
    );
    indexIn = rowLinks.indexOf(document.activeElement as HTMLElement);
    const next =
      e.key === "ArrowDown"
        ? rowLinks[Math.max(0, indexIn) + 1] ?? rowLinks[0]
        : rowLinks[Math.max(0, indexIn) - 1] ?? rowLinks[0];
    next?.focus();
    e.preventDefault();
  } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
    // Segments are the aria-labelled links inside the focused row's bar.
    const row = (document.activeElement as HTMLElement | null)?.closest("[data-row]");
    if (!row) return;
    const segments = Array.from(
      row.querySelectorAll<HTMLElement>("a[aria-label]"),
    );
    const i = segments.indexOf(document.activeElement as HTMLElement);
    const next =
      e.key === "ArrowRight"
        ? segments[Math.max(0, i) + 1] ?? segments[0]
        : segments[Math.max(0, i) - 1] ?? segments[0];
    next?.focus();
    e.preventDefault();
  }
  void indexIn;
}

const SORT_LABELS = {
  rateDesc: "Rate high → low",
  rateAsc: "Rate low → high",
  sizeDesc: "Facilities",
  gap: "Gap to average",
  name: "Name",
} as const;

function BarTableView({
  bd,
  rows,
  isolated,
  mode,
}: {
  bd: Breakdown;
  rows: Breakdown["rows"];
  isolated: BreakdownBucket | null;
  mode: "count" | "share";
}) {
  const maxN = Math.max(1, ...rows.map((r) => r.n));
  const present = BUCKET_ORDER.filter((k) =>
    rows.some((r) => r.buckets[k] > 0),
  );
  return (
    <table
      className="w-full border-collapse text-sm"
      data-testid="bar-table"
      onKeyDown={(e) => moveFocusAcrossRowsAndSegments(e)}
    >
      <thead>
        <tr className="border-b text-left text-xs text-muted-foreground">
          <th className="py-2 pr-2 font-medium">{bd.scopeLabel}</th>
          <th className={cn("px-2 py-2 text-right font-medium", DETAIL_COL)}>Facilities</th>
          <th className={cn("px-2 py-2 text-right font-medium", DETAIL_COL)}>Quality</th>
          <th className={cn("px-2 py-2 text-right font-medium", DETAIL_COL)}>Conditional</th>
          <th className="px-2 py-2 text-right font-medium">Hold a certificate</th>
          <th className="px-2 py-2 text-right font-medium">Certified %</th>
          <BarCellHead isolated={isolated} present={present} mode={mode} bd={bd} />
          <th className="px-2 py-2 text-right font-medium">vs average</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <BarRow
            key={r.key}
            r={r}
            serial={i}
            bd={bd}
            maxN={maxN}
            isolated={isolated}
            mode={mode}
            hideDetailCols={null}
          />
        ))}
        {/* The pinned total row — same numbers as the segments above it. */}
        <tr className="border-t font-semibold" data-testid="grand-row">
          <td className="py-2 pr-2">{bd.grand.label}</td>
          <td className={cn("px-2 py-2 text-right tabular-nums", DETAIL_COL)}>{bd.grand.n}</td>
          <td className={cn("px-2 py-2 text-right tabular-nums", DETAIL_COL)}>{bd.grand.buckets.qualityCertified}</td>
          <td className={cn("px-2 py-2 text-right tabular-nums", DETAIL_COL)}>{bd.grand.buckets.conditional}</td>
          <td className="px-2 py-2 text-right tabular-nums">{bd.grand.holdCert}</td>
          <td className="px-2 py-2 text-right tabular-nums">{Math.round(bd.grand.rate)}%</td>
          <td className="px-2 py-2"></td>
          <td className="px-2 py-2 text-right tabular-nums">■ 0 pts</td>
        </tr>
      </tbody>
    </table>
  );
}

function BarCellHead({
  bd,
  present,
  mode,
  isolated,
}: {
  bd: Breakdown;
  present: BreakdownBucket[];
  mode: "count" | "share";
  isolated: BreakdownBucket | null;
}) {
  return (
    <th className="min-w-48 px-2 py-2 font-medium">
      <span className="flex items-center gap-1">
        Breakdown
        <button
          type="button"
          aria-label="What does the bar show?"
          data-tip={
            (mode === "share"
              ? "Every bar spans 0–100% of its group; the vertical line marks the scope average."
              : "Bar width is proportional to group size against the largest group.") +
            " Segments are " +
            (present.length
              ? present.map((k) => BUCKET_BY_KEY[k].label).join(" → ")
              : "the buckets present") +
            " in bucket order (" +
            bd.scopeLabel.toLowerCase() +
            " rows)."
          }
          className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Info className="size-3" aria-hidden />
        </button>
      </span>
    </th>
  );
}

function BarRow({
  r,
  serial,
  bd,
  maxN,
  isolated,
  mode,
  hideDetailCols,
}: {
  r: Breakdown["rows"][number];
  serial: number;
  bd: Breakdown;
  maxN: number;
  isolated: BreakdownBucket | null;
  mode: "count" | "share";
  /** Kept for call-site symmetry — the layout is class-driven (DETAIL_COL). */
  hideDetailCols?: unknown;
}) {
  const badge = rowBadgeFor(r, bd.rows, bd.avgPct);
  const avg = bd.avgPct;
  // Narrow container (B6): the Quality/Conditional columns move into the
  // tooltip — the same numbers stay one hover away, no horizontal scroll.
  // (The header and grand-row cells carry the same classes, so the column
  // model stays aligned at every width.)
  return (
    <tr className="border-b/60" tabIndex={0} data-row={r.key}>
      <td className="py-2 pr-2">
        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
          {/* Keyboard + click: the name is a real link into the Master List
              filtered to this group (B4.2). Enter follows it when focused. */}
          <Link
            to={breakdownListUrl(bd.dimension, r.key, null)}
            className="text-sm font-semibold hover:underline"
            data-tip={`Open the Master List filtered to this ${bd.scopeLabel.toLowerCase()}`}
          >
            {r.label}
          </Link>
          {r.small && (
            <Badge variant="outline" className="border-border text-muted-foreground">
              Small group (n={r.n})
            </Badge>
          )}
          {badge === "best" && !r.small && (
            <Badge className="border-emerald-300 bg-emerald-100 text-emerald-800">
              ★ Best
            </Badge>
          )}
          {badge === "attention" && !r.small && (
            <Badge className="border-rose-300 bg-rose-100 text-rose-800">
              Needs attention
            </Badge>
          )}
          {r.overlays.recertDue > 0 && (
            <Badge variant="outline" className="border-amber-400/70 text-amber-800">
              Recert due {r.overlays.recertDue}
            </Badge>
          )}
          {r.overlays.surveillanceDue > 0 && (
            <Badge variant="outline" className="border-sky-400/70 text-sky-800">
              Surveillance due {r.overlays.surveillanceDue}
            </Badge>
          )}
        </span>
      </td>
      <td className={cn("px-2 py-2 text-right tabular-nums", DETAIL_COL)}>{r.n}</td>
      <td className={cn("px-2 py-2 text-right tabular-nums", DETAIL_COL)}>{r.buckets.qualityCertified}</td>
      <td className={cn("px-2 py-2 text-right tabular-nums", DETAIL_COL)}>{r.buckets.conditional}</td>
      <td className="px-2 py-2 text-right tabular-nums">{r.holdCert}</td>
      <td className="px-2 py-2 text-right tabular-nums">{Math.round(r.rate)}%</td>
      <td className="min-w-32 px-2 py-2">
        <StackedBar
          r={r}
          dimension={bd.dimension}
          maxN={maxN}
          isolated={isolated}
          mode={mode}
          avg={mode === "share" ? avg : null}
          ariaLabelPrefix={`${r.label}`}
        />
      </td>
      <td className="px-2 py-2 text-right tabular-nums">
        {r.vsAvgPoints > 0 ? `▲ +${r.vsAvgPoints}` : r.vsAvgPoints < 0 ? `▼ ${r.vsAvgPoints}` : "■ 0"}
        <span className="text-muted-foreground"> pts</span>
      </td>
      <td hidden aria-hidden>{serial}</td>
    </tr>
  );
}

/** The stacked bar — width = count/n per segment, from ONE function, so the
 *  bar can never disagree with the numbers (the old bug, regressed-against
 *  in scripts/breakdown.test.ts). Zero buckets are not drawn. Every segment
 *  is a real drill-down link into the Master List (group + bucket, B4.1),
 *  so Enter follows it natively and the URL is shareable. */
export function StackedBar({
  r,
  dimension,
  maxN,
  isolated,
  mode,
  avg,
  ariaLabelPrefix,
}: {
  r: { n: number; buckets: Record<BreakdownBucket, number>; key: string };
  dimension: BreakdownDimension;
  maxN: number;
  isolated: BreakdownBucket | null;
  mode: "count" | "share";
  /** When set (share mode) draw the scope-average line. */
  avg: number | null;
  ariaLabelPrefix: string;
}) {
  const rowFrac = mode === "count" ? r.n / maxN : 1;
  const visible = BUCKET_ORDER.filter(
    (k) => r.buckets[k] > 0 && (isolated === null || k === isolated),
  );
  return (
    <span className="relative block h-4 w-full overflow-hidden rounded-full bg-muted/40">
      <span
        className="absolute inset-y-0 left-0 block overflow-hidden rounded-full"
        style={{ width: `${rowFrac * 100}%` }}
      >
        {visible.map((k) => {
          const b = BUCKET_BY_KEY[k];
          const frac = r.buckets[k] / r.n;
          const tip = `${r.buckets[k]} of ${r.n} facilities (${Math.round(frac * 100)}%)`;
          return (
            <Link
              key={k}
              to={breakdownListUrl(dimension, r.key, k)}
              preventScrollReset
              /* ONE tooltip system: the chart readout is the shared pill. */
              data-tip={`${ariaLabelPrefix} · ${b.label} — ${tip} — click to open the facility list.`}
              aria-label={`${ariaLabelPrefix}, ${b.label}: ${r.buckets[k]} facilities, ${Math.round(frac * 100)} percent, open list`}
              className="inline-block h-full cursor-pointer align-top outline-offset-[-2px] focus-visible:outline-2 focus-visible:outline-primary"
              style={{ width: `${frac * 100}%`, background: b.colour }}
            />
          );
        })}
        {avg != null && avg >= 0 && avg <= 100 && (
          <span
            aria-hidden
            className="absolute inset-y-0 z-10 w-0.5 bg-foreground/70"
            style={{ left: `${avg}%` }}
          />
        )}
      </span>
    </span>
  );
}

/** Pattern overlays as a SECOND encoding (B5) — visible in greyscale. */
export function patternClass(p: "solid" | "hatch" | "dots"): string {
  return p === "hatch"
    ? "bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.55)_0,rgba(255,255,255,0.55)_2px,transparent_2px,transparent_5px)]"
    : p === "dots"
      ? "bg-[radial-gradient(circle,rgba(255,255,255,0.6)_1px,transparent_1.2px)] bg-[length:6px_6px]"
      : "";
}

/* ------------------------------------------------------------------ */
/* Legend (B5) — present buckets only, counts + definitions             */
/* ------------------------------------------------------------------ */

export function BucketLegend({
  breakdown: bd,
  isolated,
  onIsolate,
}: {
  breakdown: Breakdown;
  isolated: BreakdownBucket | null;
  onIsolate: (b: BreakdownBucket | null) => void;
}) {
  const present = BUCKET_ORDER.filter((k) => bd.grand.buckets[k] > 0);
  if (present.length === 0) return null;
  return (
    <div
      className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-muted-foreground"
      data-testid="bucket-legend"
    >
      {present.map((k) => {
        const b = BUCKET_BY_KEY[k];
        const active = isolated === k;
        return (
          <button
            key={k}
            type="button"
            onClick={() => onIsolate(active ? null : k)}
            aria-pressed={active}
            data-tip={`${b.description} Click to isolate this bucket in the chart.`}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-1 py-0.5 transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              active && "bg-muted font-medium text-foreground",
            )}
          >
            <span
              className={cn("size-3 rounded", patternClass(b.pattern))}
              style={{ background: b.colour }}
              aria-hidden
            />
            {b.label} · {bd.grand.buckets[k]}
          </button>
        );
      })}
      {isolated && (
        <button
          type="button"
          onClick={() => onIsolate(null)}
          className="underline underline-offset-2"
        >
          Show all
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small shared bits                                                   */
/* ------------------------------------------------------------------ */

export function InfoTip({ tip }: { tip: string }) {
  /* ONE tooltip system (the shared `data-tip` layer). */
  return (
    <button
      type="button"
      aria-label="What does this card show?"
      data-tip={tip}
      className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Info className="size-3.5" aria-hidden />
    </button>
  );
}

function SegmentedControl<V extends string>({
  value,
  onValue,
  options,
  ariaLabel,
}: {
  value: V;
  onValue: (v: V) => void;
  options: { value: V; label: string }[];
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex overflow-hidden rounded-lg border border-border"
    >
      {options.map((o, i) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onValue(o.value)}
          className={cn(
            "px-2.5 py-1.5 text-xs font-medium transition-colors",
            i > 0 && "border-l border-border",
            value === o.value
              ? "bg-primary text-primary-foreground"
              : "bg-background hover:bg-muted/60",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

