/**
 * CERTIFICATION CYCLES (the rebuilt Cycle report tab).
 *
 * One screen at a time, driven by the URL `view` param:
 *   Overview  — headline, Needs action cards, one card per cycle and one
 *               details table (by Facility Type or Block).
 *   Renewals  — buckets, quarter chart, renewal steps, List / Board.
 *   Compare   — facilities with two or more cycles.
 *   List      — one row per facility-cycle on the shared grid rules.
 *
 * Removed from this tab (their data stays in Line lists and the exports):
 * lifecycle-by-cycle chart, surveillance-by-cycle table, validity-by-cycle
 * table, recertification funnel, matrix Change columns, Report ID and the
 * duplicate "Data as of". Every blank prints "-", never 0.
 */

import { Fragment, useMemo, useRef, useState, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, Info, Minus } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  buildCycleReport,
  medianDaysText,
  OUTCOME_SEGMENTS,
  RENEWAL_BUCKETS,
  RENEWAL_STEPS,
  ratioLabel,
  type ComparisonEntry,
  type CycleReportResult,
  type CycleReportRow,
  type CycleReportSettings,
  type FacilityCycleEntry,
  type OutcomeKey,
  type OverviewCell,
  type OverviewDetails,
  type OverviewRow,
  type RenewalEntry,
  type RenewalStepKey,
} from "@/lib/cycleReport";
import { formatVisitDate } from "@/convex/lifecycle";
import { changeLabel } from "@/lib/reportMetrics";
import { SEGMENT_COLORS } from "@/components/SegmentBar";

export type CycleViewKey = "overview" | "renewals" | "compare" | "list";

const OUTCOME_COLOR_KEY: Record<OutcomeKey, string> = {
  quality: "certified",
  conditional: "conditional",
  deferred: "deferred",
  inProgress: "inProgress",
  notEligible: "notStarted",
};

const TYPE_COLORS = [
  "#0d6960",
  "#0284c7",
  "#d97706",
  "#7c3aed",
  "#dc2626",
  "#64748b",
  "#059669",
  "#db2777",
  "#4f46e5",
  "#ca8a04",
];

function listHref(opts: {
  cycle?: number;
  type?: string;
  block?: string;
  cert?: string[];
}): string {
  const p = new URLSearchParams();
  if (opts.cycle != null) p.set("cycleScope", String(opts.cycle));
  if (opts.type) p.set("type", opts.type);
  if (opts.block) p.set("block", opts.block);
  if (opts.cert?.length) p.set("cert", opts.cert.join(","));
  const s = p.toString();
  return `/facilities${s ? `?${s}` : ""}`;
}

function shortDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  return formatVisitDate(String(iso).slice(0, 10)) || "-";
}

/** A zero count reads as "-" in a dense cell; a real number stays a link. */
function dashZero(n: number) {
  return n === 0 ? <span className="text-muted-foreground">-</span> : n;
}

/** Date-only day difference (iso - today); null when missing/invalid. */
function daysFrom(today: string, iso: string | null | undefined): number | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  const a = Date.parse(`${today.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

/** Fixed min width keeps "22 days" and "787 days" on one line (Part 0.11). */
function DaysChip({ days }: { days: number | null }) {
  if (days == null)
    return (
      <span className="inline-flex min-w-[76px] justify-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] whitespace-nowrap text-muted-foreground">
        -
      </span>
    );
  const cls =
    days < 0
      ? "border-rose-300 bg-rose-50 text-rose-800"
      : days <= 90
        ? "border-amber-300 bg-amber-50 text-amber-900"
        : "border-emerald-300 bg-emerald-50 text-emerald-800";
  const label =
    days < 0 ? `Expired ${Math.abs(days)}d` : `${days} day${days === 1 ? "" : "s"}`;
  return (
    <span
      className={cn(
        "inline-flex min-w-[76px] justify-center rounded-full border px-2 py-0.5 text-[10px] tabular-nums whitespace-nowrap",
        cls,
      )}
    >
      {label}
    </span>
  );
}

/** A number that opens the Master List with the same filters + cycle. */
function Drill({
  href,
  children,
  label,
  className,
}: {
  href: string;
  children: ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      data-tip={label}
      className={cn(
        "rounded-sm underline-offset-2 tabular-nums hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
    >
      {children}
    </a>
  );
}

/**
 * "Explain this number" (Part 6.1): plain definition, the formula, the first
 * five facility names and one Open-all action.
 */
function FigureInfo({
  definition,
  formula,
  names,
  total,
  href,
  onOpen,
}: {
  definition: string;
  formula: string;
  names: string[];
  total: number;
  href?: string;
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={`What does “${definition}” mean?`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Info className="size-3" aria-hidden />
      </button>
      {open && (
        <span className="absolute top-5 left-0 z-30 block w-64 rounded-lg border border-border bg-background p-2 text-left shadow-lg">
          <span className="block text-xs leading-snug font-semibold">{definition}</span>
          <span className="mt-1 block text-[11px] text-muted-foreground">
            Formula: {formula}
          </span>
          <span className="mt-1 block text-[11px] text-muted-foreground">
            {total > 0
              ? names.length
                ? `e.g. ${names.slice(0, 5).join(", ")}${total > 5 ? "…" : ""}`
                : `${total} facilities`
              : "No facilities match."}
          </span>
          {total > 0 &&
            (href ? (
              <a
                href={href}
                className="mt-1.5 inline-block text-[11px] font-medium text-primary hover:underline"
              >
                Open all {total}
              </a>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onOpen?.();
                }}
                className="mt-1.5 text-[11px] font-medium text-primary hover:underline"
              >
                Open all {total}
              </button>
            ))}
        </span>
      )}
    </span>
  );
}

/** Quarter match for a chart column key ("2026-Q3"). */
function isoQuarterMatch(iso: string, quarterKey: string): boolean {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  const fyStart = m >= 4 ? y : y - 1;
  const q = m >= 4 && m <= 6 ? 1 : m >= 7 && m <= 9 ? 2 : m >= 10 && m <= 12 ? 3 : 4;
  return `${fyStart}-Q${q}` === quarterKey;
}

/* ========================================================================== */

export function CycleReportView({
  rows,
  settings,
  generatedAt,
  filtersText,
  knownCycles,
  view,
  onViewChange,
  bucket,
  onBucketChange,
  step,
  onStepChange,
  onOpenFacility,
}: {
  rows: CycleReportRow[];
  settings: CycleReportSettings;
  generatedAt: string;
  filtersText: string;
  knownCycles: { cycleNumber: number; cycleType: string }[];
  view: CycleViewKey;
  onViewChange: (next: CycleViewKey) => void;
  /** Renewals bucket chip OR a chart quarter key; null = no bucket filter. */
  bucket: string | null;
  onBucketChange: (next: string | null) => void;
  step: RenewalStepKey | null;
  onStepChange: (next: RenewalStepKey | null) => void;
  /** Opens the Quick View (the page owns the drawer). */
  onOpenFacility?: (facilityId: string) => void;
}) {
  const [detailDim, setDetailDim] = useState<"type" | "block">("type");
  const [splitByType, setSplitByType] = useState(false);
  const [showChartTable, setShowChartTable] = useState(false);
  const [boardMode, setBoardMode] = useState(false);
  const [listScope, setListScope] = useState<"current" | 1 | 2 | "all">("current");

  const report = useMemo(
    () => buildCycleReport(rows, { today: generatedAt, settings, knownCycles }),
    [rows, generatedAt, settings, knownCycles],
  );

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) if (!m.has(r.facilityId)) m.set(r.facilityId, r.facility);
    return m;
  }, [rows]);
  const names = (ids: string[]) => ids.map((id) => nameById.get(id) ?? id);

  const dueCount = report.renewals.buckets
    .filter((b) => b.key !== "later")
    .reduce((n, b) => n + b.count, 0);

  const tabs: { key: CycleViewKey; label: string; count: number }[] = [
    { key: "overview", label: "Overview", count: report.overview.cards.length },
    { key: "renewals", label: "Renewals", count: dueCount },
    { key: "compare", label: "Compare", count: report.comparison.twoCycleFacilities },
    { key: "list", label: "List", count: report.list.length },
  ];

  const startedNotes = report.cycles
    .filter((c) => c.cycleNumber > 1 && c.facilities > 0)
    .map((c) => `Cycle #${c.cycleNumber} started for ${c.facilities}`);

  /** One bucket, a chart quarter, or a comma-separated set from a Needs-action
   *  card ("d90,d180,d365"). */
  const bucketKeys = bucket ? bucket.split(",").filter(Boolean) : [];
  const bucketHit = (e: RenewalEntry) => {
    if (bucketKeys.length === 0) return true;
    if (bucketKeys.includes(e.bucket ?? "")) return true;
    if (!e.certRow?.validityDate) return false;
    return bucketKeys.some((k) =>
      isoQuarterMatch(e.certRow!.validityDate!.slice(0, 10), k),
    );
  };
  const renewalsFiltered = useMemo(
    () => report.renewals.scope.filter((e) => bucketHit(e) && (!step || e.step === step)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [report, bucket, step],
  );

  const currentCycle = report.cycles.find((c) => c.current)?.cycleNumber ?? 1;
  const listRows = useMemo(() => {
    return report.list.filter((e) => {
      if (listScope === "all") return true;
      if (listScope === "current") return e.row.cycleNumber === currentCycle;
      return e.row.cycleNumber === listScope;
    });
  }, [report, listScope, currentCycle]);

  const openFacility = (id: string) => onOpenFacility?.(id);

  return (
    <section className="space-y-4" data-testid="cycle-report">
      {/* ---------------- Header: no Report ID, no duplicate Data as of --- */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Certification cycles</h2>
          <p className="mt-0.5 text-xs text-muted-foreground" data-testid="cycle-header-line">
            {report.distinctFacilities} facilities
            {startedNotes.length > 0 && <> · {startedNotes.join(" · ")}</>}
            {filtersText && filtersText !== "No filters" && <> · {filtersText}</>}
          </p>
        </div>
        <p
          className="text-[11px] text-muted-foreground"
          aria-live="polite"
          data-testid="cycle-counter"
        >
          {view === "renewals"
            ? `Showing ${renewalsFiltered.length} of ${report.renewals.scope.length} facilities`
            : view === "list"
              ? `Showing ${listRows.length} of ${report.list.length} facility-cycles`
              : `${report.facilityCycles} facility-cycles · ${report.distinctFacilities} facilities`}
        </p>
      </header>

      {/* ---------------- Segmented control (URL param `view`) ------------ */}
      <div
        role="tablist"
        aria-label="Certification cycle views"
        className="flex flex-wrap items-center gap-1"
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            id={`cycle-view-${t.key}`}
            aria-selected={view === t.key}
            aria-controls={`cycle-panel-${t.key}`}
            onClick={() => onViewChange(t.key)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              view === t.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/70 bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {t.count > 0 && (
              <span className="ml-1.5 text-xs tabular-nums opacity-80">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ================= OVERVIEW ======================================== */}
      {view === "overview" && (
        <div
          id="cycle-panel-overview"
          role="tabpanel"
          aria-labelledby="cycle-view-overview"
          className="space-y-4"
        >
          {report.headline && (
            <p
              className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-sm"
              data-testid="cycle-headline"
            >
              {report.headline}
            </p>
          )}

          {report.needsAction.length > 0 && (
            <div
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
              data-testid="needs-action-cards"
            >
              {report.needsAction.map((card) => (
                <article
                  key={card.key}
                  className="rounded-xl border border-border/60 bg-background p-3"
                >
                  <p className="text-2xl font-semibold tabular-nums">{card.count}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{card.label}</p>
                  <button
                    type="button"
                    data-testid={`needs-action-${card.key}`}
                    onClick={() => {
                      onBucketChange(card.filters.buckets.join(",") || null);
                      onStepChange(card.filters.step);
                      onViewChange("renewals");
                    }}
                    className="mt-2 inline-flex h-8 items-center rounded-lg border border-input px-2.5 text-xs font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    Open in Renewals
                  </button>
                </article>
              ))}
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-2">
            {report.overview.cards.map((card) => {
              const holdNames = names(
                card.segments
                  .filter((s) => s.key === "quality" || s.key === "conditional")
                  .flatMap((s) => s.ids),
              );
              return (
                <article
                  key={card.cycleNumber}
                  className="rounded-xl border border-border/60 bg-background p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">
                      {card.label}
                      <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                        · {card.status === "current" ? "current" : "closed"}
                      </span>
                    </h3>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {card.facilities} facilities
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm" data-testid={`hold-${card.cycleNumber}`}>
                    <Drill
                      href={listHref({ cycle: card.cycleNumber })}
                      label={`${card.label}: hold a certificate`}
                    >
                      {card.hold}
                    </Drill>{" "}
                    <span className="text-muted-foreground">of {card.facilities}</span> hold a
                    certificate
                    <span className="text-muted-foreground"> {card.holdText.replace(/^\d+ of \d+ hold a certificate ?/, "") || ""}</span>
                    <FigureInfo
                      definition="Hold a certificate"
                      formula="Quality Certified + Quality Certified with Conditionality in this cycle"
                      names={holdNames}
                      total={card.hold}
                      href={listHref({ cycle: card.cycleNumber })}
                    />
                  </p>

                  {/* ONE stacked outcome bar — mutually exclusive segments */}
                  <div
                    className="mt-2 flex h-5 w-full overflow-hidden rounded-md bg-muted"
                    role="img"
                    aria-label={`${card.label} outcomes`}
                  >
                    {OUTCOME_SEGMENTS.map((seg) => {
                      const s = card.segments.find((x) => x.key === seg.key)!;
                      if (s.count === 0) return null;
                      const pct = (s.count / card.facilities) * 100;
                      return (
                        <button
                          key={seg.key}
                          type="button"
                          onClick={() => s.ids[0] && openFacility(s.ids[0])}
                          data-tip={`${seg.label}: ${s.count}`}
                          aria-label={`${seg.label}: ${s.count} facilities`}
                          className="h-full min-w-0 overflow-hidden text-[10px] leading-5 font-semibold text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          style={{
                            width: `${pct}%`,
                            background: SEGMENT_COLORS[OUTCOME_COLOR_KEY[seg.key]],
                            backgroundImage:
                              seg.key === "notEligible"
                                ? "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,.4) 4px, rgba(255,255,255,.4) 7px)"
                                : undefined,
                          }}
                        >
                          {pct >= 12 ? s.count : ""}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    {OUTCOME_SEGMENTS.filter(
                      (seg) => card.segments.find((x) => x.key === seg.key)!.count > 0,
                    ).map((seg) => (
                      <span key={seg.key} className="inline-flex items-center gap-1">
                        <span
                          className="size-2 rounded-sm"
                          style={{
                            background: SEGMENT_COLORS[OUTCOME_COLOR_KEY[seg.key]],
                            backgroundImage:
                              seg.key === "notEligible"
                                ? "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,.6) 2px, rgba(255,255,255,.6) 4px)"
                                : undefined,
                          }}
                          aria-hidden
                        />
                        {seg.label}{" "}
                        {card.segments.find((x) => x.key === seg.key)!.count}
                      </span>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>

          {report.reconciliation.text && (
            <p className="text-[11px] text-muted-foreground" data-testid="cycle-reconciliation">
              {report.reconciliation.text}
            </p>
          )}

          <DetailsTable
            details={report.overview.details[detailDim]}
            dim={detailDim}
            onDimChange={setDetailDim}
            cycles={report.cycles.filter((c) => c.facilities > 0)}
            names={names}
          />

          <p className="text-[11px] text-muted-foreground">
            Validity:{" "}
            <button
              type="button"
              className="font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              onClick={() => onViewChange("renewals")}
            >
              open in Renewals
            </button>
            . Surveillance details:{" "}
            <a className="font-medium text-primary hover:underline" href="/reports?tab=linelists">
              open in Line lists
            </a>
            .
          </p>
        </div>
      )}

      {/* ================= RENEWALS ======================================= */}
      {view === "renewals" && (
        <div
          id="cycle-panel-renewals"
          role="tabpanel"
          aria-labelledby="cycle-view-renewals"
        >
          <RenewalsPanel
            report={report}
            generatedAt={generatedAt}
            bucket={bucket}
            onBucketChange={onBucketChange}
            step={step}
            onStepChange={onStepChange}
            filtered={renewalsFiltered}
            splitByType={splitByType}
            setSplitByType={setSplitByType}
            showChartTable={showChartTable}
            setShowChartTable={setShowChartTable}
            boardMode={boardMode}
            setBoardMode={setBoardMode}
            names={names}
            onOpenFacility={openFacility}
          />
        </div>
      )}

      {/* ================= COMPARE ======================================== */}
      {view === "compare" && (
        <div
          id="cycle-panel-compare"
          role="tabpanel"
          aria-labelledby="cycle-view-compare"
        >
          <ComparePanel report={report} names={names} onViewChange={onViewChange} />
        </div>
      )}

      {/* ================= LIST =========================================== */}
      {view === "list" && (
        <div id="cycle-panel-list" role="tabpanel" aria-labelledby="cycle-view-list">
          <ListPanel
            rows={listRows}
            total={report.list.length}
            scope={listScope}
            onScopeChange={setListScope}
            cycles={report.cycles.filter((c) => c.facilities > 0)}
            currentCycle={currentCycle}
            onOpenFacility={openFacility}
          />
        </div>
      )}
    </section>
  );
}

/* --------------------------------------------------------------------------
 * OVERVIEW — one details table (Facility Type or Block), opaque totals row
 * ------------------------------------------------------------------------ */

function DetailsTable({
  details,
  dim,
  onDimChange,
  cycles,
  names,
}: {
  details: OverviewDetails;
  dim: "type" | "block";
  onDimChange: (next: "type" | "block") => void;
  cycles: CycleReportResult["cycles"];
  names: (ids: string[]) => string[];
}) {
  const first = cycles[0];
  if (!first)
    return (
      <section className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No facility-cycle matches these filters — clear a filter to see the breakdown.
        </p>
      </section>
    );
  const later = cycles.slice(1).filter((c) =>
    details.rows.some((r) => (r.cycles[c.cycleNumber]?.facilities ?? 0) > 0),
  );
  const groupLabel = dim === "type" ? "Facility Type" : "Block";
  const hrefFor = (cycleNumber: number, row: OverviewRow | null, certifiedOnly = false) =>
    listHref({
      cycle: cycleNumber,
      ...(row && row.label !== "All"
        ? dim === "type"
          ? { type: row.label }
          : { block: row.label }
        : {}),
      ...(certifiedOnly
        ? { cert: ["Quality Certified", "Quality Certified with Conditionality"] }
        : {}),
    });

  const cell = (row: OverviewRow, c: (typeof cycles)[number], key: keyof OverviewCell) =>
    (row.cycles[c.cycleNumber]?.[key] ?? null) as number | null;

  const num = (v: number | null) =>
    v == null || v === 0 ? <span className="text-muted-foreground">-</span> : v;

  return (
    <section className="rounded-xl border border-border/60 bg-background" aria-label="Details">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <h3 className="text-sm font-semibold">Details</h3>
        <div
          role="group"
          aria-label="Group the details by"
          className="flex rounded-lg border border-input p-0.5"
        >
          {(["type", "block"] as const).map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={dim === d}
              onClick={() => onDimChange(d)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                dim === d ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {d === "type" ? "Facility Type" : "Block"}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table
          className="w-full border-collapse text-xs"
          data-testid="cycle-details-table"
        >
          <caption className="sr-only">
            Facilities and certificates by {groupLabel} for every certification cycle
          </caption>
          <thead>
            <tr className="border-b border-border/60 text-[11px] text-muted-foreground">
              <th
                rowSpan={2}
                scope="col"
                className="sticky left-0 z-10 min-w-[140px] border-r border-border/60 bg-muted px-2 py-1.5 text-left font-semibold"
              >
                {groupLabel}
              </th>
              <th
                colSpan={4}
                scope="colgroup"
                className="border-r border-border/60 px-2 py-1.5 text-center font-semibold tracking-wide uppercase"
              >
                {first?.label}
              </th>
              {later.map((c) => (
                <th
                  key={c.cycleNumber}
                  colSpan={2}
                  scope="colgroup"
                  className="border-r border-border/60 px-2 py-1.5 text-center font-semibold tracking-wide uppercase"
                >
                  {c.label}
                </th>
              ))}
            </tr>
            <tr className="border-b border-border/60 text-[11px] text-muted-foreground">
              <th scope="col" className="px-2 py-1 text-right font-medium whitespace-nowrap">Facilities</th>
              <th scope="col" className="px-2 py-1 text-right font-medium whitespace-nowrap">Certified</th>
              <th scope="col" className="px-2 py-1 text-right font-medium whitespace-nowrap">Certified %</th>
              <th scope="col" className="border-r border-border/60 px-2 py-1 text-right font-medium whitespace-nowrap">In progress</th>
              {later.map((c) => (
                <Fragment key={c.cycleNumber}>
                  <th scope="col" className="px-2 py-1 text-right font-medium whitespace-nowrap">Facilities</th>
                  <th scope="col" className="border-r border-border/60 px-2 py-1 text-right font-medium whitespace-nowrap">Certified</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {details.rows.map((row) => (
              <tr key={row.label} className="border-b border-border/40">
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-r border-border/60 bg-background px-2 py-1.5 text-left font-medium whitespace-nowrap"
                >
                  {row.label}
                </th>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  <Drill href={hrefFor(first.cycleNumber, row)} label={`${row.label}: facilities`}>
                    {num(cell(row, first, "facilities"))}
                  </Drill>
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  <Drill
                    href={hrefFor(first.cycleNumber, row, true)}
                    label={`${row.label}: certified`}
                  >
                    {num(cell(row, first, "certified"))}
                  </Drill>
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    {ratioLabel(cell(row, first, "certified") ?? 0, cell(row, first, "facilities") ?? 0)}
                    <FigureInfo
                      definition="Certified %"
                      formula="(Quality + Conditional) ÷ facilities in this row; under 5 facilities it reads “part of whole”"
                      names={names(row.cycles[first.cycleNumber]?.certifiedIds ?? [])}
                      total={cell(row, first, "certified") ?? 0}
                      href={hrefFor(first.cycleNumber, row, true)}
                    />
                  </span>
                </td>
                <td className="border-r border-border/60 px-2 py-1.5 text-right tabular-nums">
                  {num(cell(row, first, "inProgress"))}
                </td>
                {later.map((c) => (
                  <Fragment key={c.cycleNumber}>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      <Drill href={hrefFor(c.cycleNumber, row)} label={`${row.label}: facilities`}>
                        {num(cell(row, c, "facilities"))}
                      </Drill>
                    </td>
                    <td className="border-r border-border/60 px-2 py-1.5 text-right tabular-nums">
                      <Drill
                        href={hrefFor(c.cycleNumber, row, true)}
                        label={`${row.label}: certified`}
                      >
                        {num(cell(row, c, "certified"))}
                      </Drill>
                    </td>
                  </Fragment>
                ))}
              </tr>
            ))}
            {/* Opaque total row */}
            <tr className="border-t-2 border-border bg-muted font-semibold">
              <th
                scope="row"
                className="sticky left-0 z-10 border-r border-border/60 bg-muted px-2 py-1.5 text-left"
              >
                {details.totals.label}
              </th>
              <td className="px-2 py-1.5 text-right tabular-nums">
                <Drill href={hrefFor(first.cycleNumber, null)} label="All facilities">
                  {num(cell(details.totals, first, "facilities"))}
                </Drill>
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">
                <Drill href={hrefFor(first.cycleNumber, null, true)} label="All certified">
                  {num(cell(details.totals, first, "certified"))}
                </Drill>
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">
                {ratioLabel(
                  cell(details.totals, first, "certified") ?? 0,
                  cell(details.totals, first, "facilities") ?? 0,
                )}
              </td>
              <td className="border-r border-border/60 px-2 py-1.5 text-right tabular-nums">
                {num(cell(details.totals, first, "inProgress"))}
              </td>
              {later.map((c) => (
                <Fragment key={c.cycleNumber}>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {num(cell(details.totals, c, "facilities"))}
                  </td>
                  <td className="border-r border-border/60 px-2 py-1.5 text-right tabular-nums">
                    {num(cell(details.totals, c, "certified"))}
                  </td>
                </Fragment>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------------
 * RENEWALS — buckets, quarter chart, renewal steps, List / Board
 * ------------------------------------------------------------------------ */

const URGENCY_COLOR: Record<"expired" | "soon" | "later", string> = {
  expired: "#dc2626",
  soon: "#d97706",
  later: "#0284c7",
};

function RenewalsPanel({
  report,
  generatedAt,
  bucket,
  onBucketChange,
  step,
  onStepChange,
  filtered,
  splitByType,
  setSplitByType,
  showChartTable,
  setShowChartTable,
  boardMode,
  setBoardMode,
  names,
  onOpenFacility,
}: {
  report: CycleReportResult;
  generatedAt: string;
  bucket: string | null;
  onBucketChange: (next: string | null) => void;
  step: RenewalStepKey | null;
  onStepChange: (next: RenewalStepKey | null) => void;
  filtered: RenewalEntry[];
  splitByType: boolean;
  setSplitByType: (v: boolean) => void;
  showChartTable: boolean;
  setShowChartTable: (v: boolean) => void;
  boardMode: boolean;
  setBoardMode: (v: boolean) => void;
  names: (ids: string[]) => string[];
  onOpenFacility: (id: string) => void;
}) {
  const types = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of report.renewals.scope)
      counts.set(e.type, (counts.get(e.type) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [report]);

  /** Max 8 legend items: top 7 types, the rest aggregated as “Other”. */
  const segmentsFor = (col: (typeof report.renewals.chart)[number]) => {
    if (!splitByType)
      return [{ label: col.label, value: col.total, color: URGENCY_COLOR[col.urgency], hatch: col.urgency === "expired" }];
    const top = types.slice(0, 7).map(([t]) => t);
    const acc = new Map<string, number>();
    for (const [t, n] of Object.entries(col.byType)) {
      if (!n) continue;
      const key = top.includes(t) ? t : "Other";
      acc.set(key, (acc.get(key) ?? 0) + n);
    }
    return [...acc.entries()].map(([label, value], i) => ({
      label,
      value,
      color: label === "Other" ? "#64748b" : TYPE_COLORS[top.indexOf(label) % TYPE_COLORS.length],
      hatch: false,
      index: i,
    }));
  };
  const legend = useMemo(() => {
    const seen: { label: string; color: string; hatch?: boolean }[] = [];
    for (const col of report.renewals.chart)
      for (const s of segmentsFor(col))
        if (!seen.some((x) => x.label === s.label))
          seen.push({ label: s.label, color: s.color, hatch: s.hatch });
    return seen.slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report, splitByType, types]);

  const maxTotal = Math.max(1, ...report.renewals.chart.map((c) => c.total));
  const validTillLabel = (e: RenewalEntry) => shortDate(e.certRow?.validityDate ?? null);

  return (
    <div className="space-y-4">
      {/* ---- Buckets ---- */}
      <div className="flex flex-wrap items-center gap-1.5" data-testid="renewal-buckets">
        {report.renewals.buckets.map((b) => (
          <button
            key={b.key}
            type="button"
            aria-pressed={bucket === b.key}
            data-testid={`bucket-${b.key}`}
            onClick={() => onBucketChange(bucket === b.key ? null : b.key)}
            className={cn(
              "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              bucket === b.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/70 bg-background hover:bg-muted",
            )}
          >
            {b.label}
            <span className="tabular-nums opacity-80">{b.count}</span>
          </button>
        ))}
        {report.renewals.certifiedNoValidity.count > 0 && (
          <span
            className="inline-flex min-h-8 items-center rounded-full border border-dashed border-amber-400 px-2.5 text-xs text-amber-800"
            data-tip="Certified, but no validity date is recorded — see Needs attention"
          >
            Certified, no validity date {report.renewals.certifiedNoValidity.count}
          </span>
        )}
      </div>

      {/* ---- Chart card ---- */}
      <section className="rounded-xl border border-border/60 bg-background p-3" aria-label="Validity end by quarter">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">Certificate validity by quarter</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Already expired, then the next 8 quarters. Click a column to filter the list.
            </p>
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            <button
              type="button"
              aria-pressed={splitByType}
              onClick={() => setSplitByType(!splitByType)}
              className="rounded-md border border-input px-2 py-0.5 font-medium text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Split by Facility Type
            </button>
            <button
              type="button"
              aria-pressed={showChartTable}
              onClick={() => setShowChartTable(!showChartTable)}
              className="rounded-md border border-input px-2 py-0.5 font-medium text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {showChartTable ? "Show chart" : "Show as table"}
            </button>
          </div>
        </div>

        {!showChartTable ? (
          <div className="mt-3 overflow-x-auto pb-1">
            <div
              className="flex min-w-[640px] items-end gap-2"
              style={{ height: 180 }}
              data-active={bucket ?? ""}
              role="img"
              aria-label="Certificate validity end dates by quarter"
              data-testid="renewal-chart"
            >
              {report.renewals.chart.map((col) => {
                const segs = segmentsFor(col);
                const activeKeys = (bucket ?? "").split(",").filter(Boolean);
                const active =
                  activeKeys.includes(col.key) ||
                  (!!col.quarterKey && activeKeys.includes(col.quarterKey));
                return (
                  <button
                    key={col.key}
                    type="button"
                    data-testid={`chart-col-${col.key}`}
                    aria-label={`${col.label}${col.subLabel ? ` ${col.subLabel}` : ""}: ${col.total} facilities`}
                    onClick={() =>
                      onBucketChange(active ? null : (col.quarterKey ?? col.bucket ?? col.key))
                    }
                    className={cn(
                      "group flex h-full min-w-[56px] flex-1 cursor-pointer flex-col justify-end rounded-md px-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      active && "ring-2 ring-primary",
                    )}
                  >
                    <span className="mb-1 text-center text-[11px] font-semibold tabular-nums">
                      {col.total > 0 ? col.total : <span className="text-muted-foreground">0</span>}
                    </span>
                    <span className="flex w-full flex-col justify-end" style={{ height: 130 }}>
                      {segs
                        .filter((s) => s.value > 0)
                        .map((s) => (
                          <span
                            key={s.label}
                            data-tip={`${s.label}: ${s.value}`}
                            aria-hidden
                            style={{
                              height: `${(s.value / maxTotal) * 100}%`,
                              background: s.color,
                              backgroundImage: s.hatch
                                ? "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,.45) 3px, rgba(255,255,255,.45) 6px)"
                                : undefined,
                            }}
                            className="w-full"
                          />
                        ))}
                    </span>
                    <span className="mt-1 block w-full text-center leading-tight">
                      <span className="block text-[10px] text-foreground">{col.label}</span>
                      {col.subLabel && (
                        <span className="block text-[10px] text-muted-foreground">{col.subLabel}</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {legend.map((l) => (
                <span key={l.label} className="inline-flex items-center gap-1">
                  <span
                    className="size-2.5 rounded-sm"
                    style={{
                      background: l.color,
                      backgroundImage: l.hatch
                        ? "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,.6) 2px, rgba(255,255,255,.6) 4px)"
                        : undefined,
                    }}
                    aria-hidden
                  />
                  {l.label}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <caption className="text-left text-[11px] font-semibold">Validity end dates by quarter</caption>
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground">
                  <th scope="col" className="px-2 py-1 text-left font-medium">Quarter</th>
                  <th scope="col" className="px-2 py-1 text-right font-medium">Facilities</th>
                  {splitByType && types.map(([t]) => (
                    <th key={t} scope="col" className="px-2 py-1 text-right font-medium">{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.renewals.chart.map((col) => (
                  <tr key={col.key} className="border-b border-border/40">
                    <th scope="row" className="px-2 py-1 text-left font-medium">
                      {col.label}{col.subLabel ? ` · ${col.subLabel}` : ""}
                    </th>
                    <td className="px-2 py-1 text-right tabular-nums">{col.total || "-"}</td>
                    {splitByType && types.map(([t]) => (
                      <td key={t} className="px-2 py-1 text-right tabular-nums">
                        {col.byType[t] || "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---- Renewal steps (replaces the funnel; no warning icons) ---- */}
      <div className="flex flex-wrap items-center gap-1.5" data-testid="renewal-steps">
        {report.renewals.steps.map((s) => (
          <button
            key={s.key}
            type="button"
            aria-pressed={step === s.key}
            data-testid={`step-${s.key}`}
            data-tip={s.notRecorded > 0 ? `${s.tip} ${s.notRecorded} with no recorded source data.` : s.tip}
            onClick={() => onStepChange(step === s.key ? null : s.key)}
            className={cn(
              "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              step === s.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/70 bg-background hover:bg-muted",
            )}
          >
            {s.label}
            <span className="tabular-nums opacity-80">{s.count}</span>
          </button>
        ))}
      </div>

      {/* ---- List / Board ---- */}
      <section className="rounded-xl border border-border/60 bg-background" aria-label="Renewal list">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
          <p className="text-[11px] text-muted-foreground" aria-live="polite">
            {filtered.length} of {report.renewals.scope.length} facilities · soonest expiry first
          </p>
          <div className="flex items-center gap-2">
            <div
              role="group"
              aria-label="Layout"
              className="hidden rounded-lg border border-input p-0.5 md:flex"
            >
              <button
                type="button"
                aria-pressed={!boardMode}
                onClick={() => setBoardMode(false)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium",
                  !boardMode ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                List
              </button>
              <button
                type="button"
                aria-pressed={boardMode}
                onClick={() => setBoardMode(true)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium",
                  boardMode ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                Board
              </button>
            </div>
            <span className="text-[11px] text-muted-foreground">Data as of {generatedAt}</span>
          </div>
        </div>

        {boardMode ? (
          <div className="grid gap-2 overflow-x-auto p-2 md:grid-cols-6">
            {RENEWAL_STEPS.map((s) => {
              const items = filtered.filter((e) => e.step === s.key);
              return (
                <div key={s.key} className="min-w-[180px] rounded-lg border border-border/60 p-1.5">
                  <p className="flex items-center justify-between text-[11px] font-semibold">
                    {s.label} <span className="tabular-nums text-muted-foreground">{items.length}</span>
                  </p>
                  <ul className="mt-1.5 space-y-1.5">
                    {items.map((e) => (
                      <li key={e.facilityId}>
                        <button
                          type="button"
                          onClick={() => onOpenFacility(e.facilityId)}
                          className="w-full rounded-md border border-border/60 bg-background px-2 py-1.5 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          <span className="block truncate text-xs font-medium">{e.facility}</span>
                          <span className="mt-0.5 block text-[10px] text-muted-foreground">
                            {e.type} · {validTillLabel(e)}
                          </span>
                          <DaysChip days={e.daysLeft} />
                        </button>
                      </li>
                    ))}
                    {items.length === 0 && (
                      <li className="text-[10px] text-muted-foreground">No facility</li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs" data-testid="renewal-table">
              <thead className="sticky top-0 z-10 bg-muted/90">
                <tr className="border-b border-border/60 text-muted-foreground">
                  <th scope="col" className="sticky left-0 z-10 min-w-[160px] border-r border-border/60 bg-muted/90 px-2 py-1.5 text-left font-medium">Facility</th>
                  <th scope="col" className="px-2 py-1.5 text-left font-medium whitespace-nowrap">Type</th>
                  <th scope="col" className="px-2 py-1.5 text-left font-medium">Block</th>
                  <th scope="col" className="px-2 py-1.5 text-left font-medium whitespace-nowrap">Valid till</th>
                  <th scope="col" className="px-2 py-1.5 text-left font-medium whitespace-nowrap">Days left</th>
                  <th scope="col" className="px-2 py-1.5 text-left font-medium whitespace-nowrap">Renewal step</th>
                  <th scope="col" className="px-2 py-1.5 text-left font-medium">Next action</th>
                  <th scope="col" className="px-2 py-1.5 text-right font-medium">Open</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.facilityId} className="border-b border-border/40 hover:bg-muted/40">
                    <th scope="row" className="sticky left-0 z-10 border-r border-border/60 bg-background px-2 py-1.5 text-left font-medium">
                      <button
                        type="button"
                        className="text-left hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        onClick={() => onOpenFacility(e.facilityId)}
                      >
                        {e.facility}
                      </button>
                    </th>
                    <td className="px-2 py-1.5 whitespace-nowrap">{e.type}</td>
                    <td className="px-2 py-1.5">{e.block}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{validTillLabel(e)}</td>
                    <td className="px-2 py-1.5"><DaysChip days={e.daysLeft} /></td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      {RENEWAL_STEPS.find((s) => s.key === e.step)?.label ?? "-"}
                    </td>
                    <td className="px-2 py-1.5 text-muted-foreground">{e.nextAction}</td>
                    <td className="px-2 py-1.5 text-right">
                      <button
                        type="button"
                        className="rounded-md border border-input px-2 py-0.5 text-[11px] font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        onClick={() => onOpenFacility(e.facilityId)}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                      No facilities match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-[11px] text-muted-foreground">
        <a className="font-medium text-primary hover:underline" href="/reports?tab=linelists">
          Surveillance details: open in Line lists
        </a>
      </p>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * COMPARE — two or more cycles; both-score rows only
 * ------------------------------------------------------------------------ */

function ComparePanel({
  report,
  names,
  onViewChange,
}: {
  report: CycleReportResult;
  names: (ids: string[]) => string[];
  onViewChange: (v: CycleViewKey) => void;
}) {
  const c = report.comparison;
  if (!c.available)
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No facility has started Cycle #2 yet. See Renewals for what is coming.
        </p>
        <button
          type="button"
          onClick={() => onViewChange("renewals")}
          className="mt-3 inline-flex h-8 items-center rounded-lg border border-input px-2.5 text-xs font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Open Renewals
        </button>
      </div>
    );

  const fromCycle = c.rows[0]?.fromCycle ?? 1;
  const toCycle = c.rows[0]?.toCycle ?? 2;
  const bothScoreRows = c.rows.filter((r) => r.delta != null);
  const showDumbbell = c.twoCycleFacilities >= 5 && c.axis != null;
  const axis = c.axis ?? { min: 0, max: 100 };
  const axisSpan = Math.max(1, axis.max - axis.min);
  const pctOf = (score: number) => ((score - axis.min) / axisSpan) * 100;

  return (
    <div className="space-y-4" data-testid="compare-panel">
      <div className="flex flex-wrap gap-2 text-xs" data-testid="compare-summary">
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5">
          <ArrowUp className="size-3" aria-hidden /> {c.improved} improved
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5">
          <Minus className="size-3" aria-hidden /> {c.unchanged} same
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5">
          <ArrowDown className="size-3" aria-hidden /> {c.declined} declined
        </span>
        <span className="rounded-full border border-border px-2 py-0.5">
          {c.conditionalityResolved} conditionality resolved
        </span>
        <span className="rounded-full border border-border px-2 py-0.5">
          {c.recertifiedOnTime} on time · {c.recertifiedLate} late
        </span>
        <span className="rounded-full border border-border px-2 py-0.5">
          Median between certifications: {medianDaysText(c.medianDaysBetweenCerts)}
        </span>
        <span className="rounded-full border border-dashed border-border/70 px-2 py-0.5 text-muted-foreground">
          {bothScoreRows.length} of {c.twoCycleFacilities} rows have both scores
        </span>
      </div>

      {showDumbbell && (
        <section className="rounded-xl border border-border/60 bg-background p-3" aria-label="Score comparison">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Dumbbell · score Cycle #{fromCycle} vs Cycle #{toCycle}
            </h3>
            <p className="text-[11px] text-muted-foreground" data-testid="dumbbell-axis-note">
              Axis {axis.min}–{axis.max}, fitted to this data (not 0–100)
            </p>
          </div>
          <div className="mt-2 space-y-1.5">
            {c.dumbbell.map((r) => (
              <div key={r.facilityId} className="flex items-center gap-2 text-[11px]">
                <a
                  href={`/facilities/${r.facilityId}`}
                  className="w-40 shrink-0 truncate hover:underline"
                  data-tip={r.facility}
                >
                  {r.facility}
                </a>
                <div className="relative h-4 flex-1 rounded-sm bg-muted/50">
                  <div
                    className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-foreground/40"
                    style={{
                      left: `${Math.min(pctOf(r.fromScore ?? 0), pctOf(r.toScore ?? 0))}%`,
                      width: `${Math.max(
                        Math.abs(pctOf(r.toScore ?? 0) - pctOf(r.fromScore ?? 0)),
                        0.5,
                      )}%`,
                    }}
                  />
                  <span
                    className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-background bg-sky-600"
                    style={{ left: `${pctOf(r.fromScore ?? 0)}%` }}
                    data-tip={`Cycle #${r.fromCycle}: ${r.fromScore?.toFixed(2)}`}
                  />
                  <span
                    className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-background bg-emerald-600"
                    style={{ left: `${pctOf(r.toScore ?? 0)}%` }}
                    data-tip={`Cycle #${r.toCycle}: ${r.toScore?.toFixed(2)}`}
                  />
                </div>
                <span className="w-20 shrink-0 text-right tabular-nums">
                  {changeLabel(r.delta)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>{axis.min}</span>
            <span>{axis.max}</span>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-border/60 bg-background" aria-label="Comparison table">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs" data-testid="compare-table">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground">
                <th rowSpan={2} scope="col" className="sticky left-0 z-10 min-w-[150px] border-r border-border/60 bg-muted px-2 py-1.5 text-left font-medium">Facility</th>
                <th rowSpan={2} scope="col" className="px-2 py-1.5 text-left font-medium">Type</th>
                <th colSpan={4} scope="colgroup" className="border-x border-border/60 px-2 py-1 text-center text-[11px] font-semibold tracking-wide uppercase">Cycle #{fromCycle}</th>
                <th colSpan={3} scope="colgroup" className="border-x border-border/60 px-2 py-1 text-center text-[11px] font-semibold tracking-wide uppercase">Cycle #{toCycle}</th>
                <th rowSpan={2} scope="col" className="px-2 py-1.5 text-right font-medium">Change</th>
                <th rowSpan={2} scope="col" className="px-2 py-1.5 text-left font-medium">Renewal</th>
              </tr>
              <tr className="border-b border-border/60 text-[11px] text-muted-foreground">
                <th scope="col" className="px-2 py-1 text-left font-medium">Result</th>
                <th scope="col" className="px-2 py-1 text-right font-medium">Score</th>
                <th scope="col" className="px-2 py-1 text-left font-medium whitespace-nowrap">Certified on</th>
                <th scope="col" className="border-x border-border/60 px-2 py-1 text-left font-medium whitespace-nowrap">Valid till</th>
                <th scope="col" className="px-2 py-1 text-left font-medium">Result</th>
                <th scope="col" className="px-2 py-1 text-right font-medium">Score</th>
                <th scope="col" className="border-r border-border/60 px-2 py-1 text-left font-medium whitespace-nowrap">Certified on</th>
              </tr>
            </thead>
            <tbody>
              {c.rows.map((r) => (
                <tr key={r.facilityId} className="border-b border-border/40">
                  <th scope="row" className="sticky left-0 z-10 border-r border-border/60 bg-background px-2 py-1.5 text-left font-medium">
                    <a className="hover:underline" href={`/facilities/${r.facilityId}`}>{r.facility}</a>
                  </th>
                  <td className="px-2 py-1.5 whitespace-nowrap">{r.type}</td>
                  <td className="px-2 py-1.5">{r.fromResult}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{r.fromScore?.toFixed(2) ?? "-"}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{shortDate(r.fromCertifiedOn)}</td>
                  <td className="border-x border-border/60 px-2 py-1.5 whitespace-nowrap">{shortDate(r.fromValidTill)}</td>
                  <td className="px-2 py-1.5">{r.toResult}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{r.toScore?.toFixed(2) ?? "-"}</td>
                  <td className="border-r border-border/60 px-2 py-1.5 whitespace-nowrap">{shortDate(r.toCertifiedOn)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{changeLabel(r.delta)}</td>
                  <td className="px-2 py-1.5" data-testid={`timing-${r.facilityId}`}>{r.timing.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * LIST — one row per facility-cycle, shared grid rules, virtualised
 * ------------------------------------------------------------------------ */

const LIST_ROW_HEIGHT = 40;

function ListPanel({
  rows,
  total,
  scope,
  onScopeChange,
  cycles,
  currentCycle,
  onOpenFacility,
}: {
  rows: FacilityCycleEntry[];
  total: number;
  scope: "current" | 1 | 2 | "all";
  onScopeChange: (next: "current" | 1 | 2 | "all") => void;
  cycles: CycleReportResult["cycles"];
  currentCycle: number;
  onOpenFacility: (id: string) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const showCycle = scope === "all";
  const template = [
    "minmax(170px,1.3fr)",
    "92px",
    "110px",
    ...(showCycle ? ["118px"] : []),
    "104px",
    "74px",
    "112px",
    "172px",
    "150px",
    "minmax(200px,1.4fr)",
  ].join(" ");

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => LIST_ROW_HEIGHT,
    overscan: 10,
  });

  const cellCls =
    "flex items-center gap-1 overflow-hidden px-2 whitespace-nowrap";

  return (
    <section className="rounded-xl border border-border/60 bg-background" aria-label="Facility-cycle list">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <div
          role="group"
          aria-label="Which cycles to list"
          className="flex flex-wrap rounded-lg border border-input p-0.5"
        >
          {(["current", 1, 2, "all"] as const).map((s) => {
            const label =
              s === "current"
                ? "Current"
                : s === "all"
                  ? "All cycles"
                  : `Cycle #${s}`;
            const disabled = s !== "current" && s !== "all" && !cycles.some((c) => c.cycleNumber === s);
            return (
              <button
                key={String(s)}
                type="button"
                disabled={disabled}
                aria-pressed={scope === s}
                data-testid={`list-scope-${s}`}
                onClick={() => onScopeChange(s)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-40",
                  scope === s ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground" aria-live="polite">
          {rows.length} of {total} facility-cycles · one row per facility-cycle
        </p>
      </div>

      <div className="overflow-hidden">
        {/* Header — sticky inside the scrollport */}
        <div className="overflow-x-auto">
          <div
            className="sticky top-0 z-20 grid bg-muted/90 text-[11px] font-medium text-muted-foreground backdrop-blur"
            style={{ gridTemplateColumns: template }}
            role="row"
          >
            {[
              "Facility",
              "Type",
              "Block",
              ...(showCycle ? ["Cycle"] : []),
              "Result",
              "Score",
              "Certified on",
              "Valid till",
              "Renewal step",
              "Next action",
            ].map((h, i) => (
              <span
                key={h}
                role="columnheader"
                className={cn(
                  cellCls,
                  "border-b border-border/60",
                  i === 0 && "sticky left-0 z-30 bg-muted/95",
                  h === "Score" && "justify-end text-right",
                )}
              >
                {h}
              </span>
            ))}
          </div>
        </div>

        <div ref={parentRef} className="max-h-[62vh] overflow-auto" data-testid="cycle-list-scroll">
          <div
            className="relative w-full"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {virtualizer.getVirtualItems().map((vi) => {
              const e = rows[vi.index];
              if (!e) return null;
              return (
                <div
                  key={e.row.cycleId}
                  className="absolute top-0 left-0 grid w-full items-center border-b border-border/40 text-xs hover:bg-muted/40"
                  style={{
                    transform: `translateY(${vi.start}px)`,
                    height: vi.size,
                    gridTemplateColumns: template,
                  }}
                  role="row"
                  tabIndex={0}
                  data-testid="cycle-list-row"
                  onDoubleClick={() => onOpenFacility(e.row.facilityId)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter") {
                      ev.preventDefault();
                      onOpenFacility(e.row.facilityId);
                    }
                  }}
                >
                  <span className={cn(cellCls, "sticky left-0 z-10 bg-background font-medium")}>
                    <button
                      type="button"
                      className="truncate hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      onClick={() => onOpenFacility(e.row.facilityId)}
                    >
                      {e.row.facility}
                    </button>
                  </span>
                  <span className={cellCls}>{e.row.type}</span>
                  <span className={cellCls}>{e.row.block}</span>
                  {showCycle && (
                    <span className={cellCls}>
                      <span className="rounded-full border border-border/60 bg-muted px-1.5 py-0.5 text-[10px] whitespace-nowrap">
                        {e.cycleLabel}
                      </span>
                    </span>
                  )}
                  <span className={cellCls}>{e.resultLabel}</span>
                  <span className={cn(cellCls, "justify-end text-right tabular-nums")}>
                    {e.score?.toFixed(2) ?? "-"}
                  </span>
                  <span className={cellCls}>{shortDate(e.row.certDate)}</span>
                  <span className={cellCls}>
                    <span className="min-w-0 truncate">{shortDate(e.row.validityDate)}</span>
                    <DaysChip days={e.daysLeft} />
                  </span>
                  <span className={cellCls}>
                    <span className="truncate">
                      {RENEWAL_STEPS.find((s) => s.key === e.step)?.label ?? "-"}
                    </span>
                  </span>
                  <span className={cn(cellCls, "text-muted-foreground")}>
                    <span className="truncate">{e.nextAction}</span>
                  </span>
                </div>
              );
            })}
          </div>
          {rows.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No facility-cycles match these filters.
            </p>
          )}
        </div>
      </div>

      <p className="border-t border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
        Started dates are removed: a cycle starts with its own first record.
        Surveillance details:{" "}
        <a className="font-medium text-primary hover:underline" href="/reports?tab=linelists">
          open in Line lists
        </a>
        .
      </p>
    </section>
  );
}
