/**
 * KPI STRIP — the "what needs me today" line above the master list.
 *
 * ONE row of six slim chips (~56 px): icon, number, label and a definition
 * tooltip. Every chip is a filter predicate from lib/masterFilter
 * (kpiMatches), so a chip's number and the list it opens can never disagree —
 * that is exactly the reconciliation the redesign pins in
 * scripts/masterList.test.ts.
 *
 * The pipeline donut and the top attention items survive (no feature was
 * removed) but live behind the small chevron at the end of the row, collapsed
 * by default — useful, not urgent.
 */

import { useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Layers,
  ListChecks,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatInr, type AttentionItem, type MasterKpis, type StageId } from "@/lib/masterColumns";
import { KPI_LABELS } from "@/lib/masterFilter";
import { CATEGORY_ICONS, CATEGORY_META } from "@/lib/trackerColumns";

export type KpiId =
  | "total"
  | "certified"
  | "pipeline"
  | "eligible"
  | "survOverdue"
  | "certExpiring"
  | "nocAlert"
  | "funds"
  | "attention"
  | "due90";

const STAGE_LABEL: Record<StageId, string> = {
  eligibility: "Eligibility",
  sa: "State Assessment",
  nqas: "NQAS Assessment",
  certification: "Certification",
  surveillance: "Surveillance",
  recertification: "Recertification",
};

const STAGE_COLOR: Record<StageId, string> = {
  eligibility: "#94a3b8",
  sa: "#8b5cf6",
  nqas: "#0ea5e9",
  certification: "#10b981",
  surveillance: "#f59e0b",
  recertification: "#0f6b63",
};

export function KpiCards({
  kpis,
  stageCounts,
  attention,
  active,
  onFilter,
  onOpenFacility,
}: {
  kpis: MasterKpis;
  stageCounts: Record<StageId, number>;
  attention: AttentionItem[];
  active: KpiId | null;
  onFilter: (id: KpiId) => void;
  onOpenFacility: (facilityId: string, section?: "documents") => void;
}) {
  const [showInsights, setShowInsights] = useState(false);

  /* Six chips, the wrapper order the redesign fixes to ONE row. Every value
     comes from computeKpis (masterColumns) with the SAME rule its filter
     predicate applies — no second hand-rolled count anywhere. */
  const cards: {
    id: KpiId;
    label: string;
    value: string | number;
    hint: string;
    icon: LucideIcon;
    tone: string;
  }[] = [
    {
      id: "total",
      label: KPI_LABELS.total,
      value: kpis.total,
      hint: "Every facility in your district",
      icon: Layers,
      tone: "text-sky-700 bg-sky-100 dark:bg-sky-500/15 dark:text-sky-200",
    },
    {
      id: "certified",
      label: KPI_LABELS.certified,
      value: kpis.certified,
      hint: `Holds a GoI letter / certification date — ${kpis.certifiedQuality} quality + ${kpis.certifiedConditional} conditional; ${kpis.certifiedStage} currently in the Certified stage (surveillance and recertification live in their own stages)`,
      /* The NQAS Certification page's icon, from the nav config: the chip and
         the page it filters always show the same glyph. */
      icon: CATEGORY_ICONS[CATEGORY_META.certification.icon],
      tone: "text-emerald-700 bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200",
    },
    {
      id: "pipeline",
      label: KPI_LABELS.pipeline,
      value: kpis.inPipeline,
      hint: "State / NQAS assessment underway, certificate not yet issued",
      icon: TrendingUp,
      tone: "text-violet-700 bg-violet-100 dark:bg-violet-500/15 dark:text-violet-200",
    },
    {
      id: "attention",
      label: KPI_LABELS.attention,
      value: kpis.attentionFacilities,
      hint: "Distinct facilities with any open issue in the shared pending registry — documents, not updated, pending work, certificates and surveillance, Fire NOC and building, or data conflicts",
      icon: ListChecks,
      tone: "text-rose-700 bg-rose-100 dark:bg-rose-500/15 dark:text-rose-200",
    },
    {
      id: "due90",
      label: KPI_LABELS.due90,
      value: kpis.due90Facilities,
      hint: "Distinct facilities with any tracked deadline (IA, certificate validity, surveillance, Fire NOC) inside the next 90 days",
      icon: Clock3,
      tone: "text-amber-700 bg-amber-100 dark:bg-amber-500/15 dark:text-amber-200",
    },
    {
      id: "funds",
      label: KPI_LABELS.funds,
      value: formatInr(kpis.fundsTotal) || "₹ 0",
      hint: `₹ sanctioned · ${kpis.fundsPending} facilit${kpis.fundsPending === 1 ? "y" : "ies"} pending release`,
      /* Gap Closure Fund's icon, from the nav config (as above). */
      icon: CATEGORY_ICONS[CATEGORY_META.fund.icon],
      tone: "text-sky-700 bg-sky-100 dark:bg-sky-500/15 dark:text-sky-200",
    },
  ];

  const donut = (Object.keys(STAGE_LABEL) as StageId[])
    .map((id) => ({ id, name: STAGE_LABEL[id], value: stageCounts[id] ?? 0, color: STAGE_COLOR[id] }))
    .filter((d) => d.value > 0);
  // Donut geometry: each stage's arc of the 219.9-unit circumference.
  const donutTotal = donut.reduce((s, d) => s + d.value, 0) || 1;
  let acc = 0;
  const segments = donut.map((d) => {
    const fraction = d.value / donutTotal;
    const seg = { id: d.id, color: d.color, fraction, offset: acc };
    acc += fraction;
    return seg;
  });

  return (
    <div className="space-y-2">
      {/* ---- ONE slim scroll-snap row (never wraps into a second line at
           1366px: chips shrink-0 and the row scrolls sideways on narrow
           screens instead of stacking) ---- */}
      <div
        className="flex items-stretch gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory"
        role="group"
        aria-label="Key numbers — click a chip to filter the table"
      >
        {cards.map((c) => {
          const Icon = c.icon;
          const isActive = active === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onFilter(c.id)}
              aria-pressed={isActive}
              data-tip={`${c.hint} — click to filter, click again to clear`}
              className={cn(
                "glass flex min-h-12 snap-start shrink-0 items-center gap-2 self-start rounded-xl border px-3 py-1 text-left transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                isActive
                  ? "border-primary ring-2 ring-primary/25"
                  : "border-border/60 hover:border-primary/40 hover:bg-muted/40",
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-lg",
                  c.tone,
                )}
                aria-hidden
              >
                <Icon className="size-3.5" />
              </span>
              <span className="flex min-w-16 flex-col leading-tight">
                <span className="text-sm font-bold tabular-nums text-foreground">
                  {c.value}
                </span>
                <span className="text-[10px] whitespace-nowrap text-muted-foreground">
                  {c.label}
                </span>
              </span>
            </button>
          );
        })}
        {/* The insights toggle lives INSIDE the chip row — no extra row of
            chrome between the KPIs and the table. */}
        <button
          type="button"
          onClick={() => setShowInsights((v) => !v)}
          aria-expanded={showInsights}              data-tip={showInsights ? "Hide pipeline mix and alerts" : "Show pipeline mix and alerts"}
          className="glass flex min-h-12 shrink-0 snap-start items-center gap-1 rounded-xl border border-border/60 px-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {showInsights ? (
            <ChevronUp className="size-3.5" aria-hidden />
          ) : (
            <ChevronDown className="size-3.5" aria-hidden />
          )}
          <span className="sr-only">Pipeline mix</span>
          {attention.length > 0 && (
            <span className="rounded-full bg-rose-100 px-1.5 text-[11px] font-bold text-rose-800 tabular-nums dark:bg-rose-500/20 dark:text-rose-100">
              {attention.length}
            </span>
          )}
        </button>
      </div>

      {/* ---- Optional depth: pipeline mix + the five most urgent items ---- */}
      {showInsights && (
        <div className="grid gap-2 lg:grid-cols-2">
          <section className="glass rounded-xl border border-border/60 p-3">
            <h3 className="text-sm font-semibold">Pipeline distribution</h3>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-28 w-28 shrink-0">
                {/* Tiny inline donut (perf brief 3.3: charts render lazily
                    and recharts stays out of the list route's eager graph). */}
                <svg viewBox="0 0 100 100" className="size-full" role="img" aria-label="Pipeline distribution">
                  {segments.length === 0 ? (
                    <circle cx="50" cy="50" r="35" fill="none" stroke="#e5e7eb" strokeWidth="18" />
                  ) : (
                    segments.map((s) => (
                      <circle
                        key={s.id}
                        cx="50"
                        cy="50"
                        r="35"
                        fill="none"
                        stroke={s.color}
                        strokeWidth="18"
                        strokeDasharray={`${s.fraction * 219.9} ${219.9}`}
                        strokeDashoffset={-s.offset * 219.9}
                        transform="rotate(-90 50 50)"
                      />
                    ))
                  )}
                </svg>
              </div>
              <ul className="min-w-0 flex-1 space-y-1">
                {donut.map((d) => (
                  <li key={d.id} className="flex items-center gap-2 text-xs">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">{d.name}</span>
                    <span className="font-semibold tabular-nums">{d.value}</span>
                  </li>
                ))}
                {donut.length === 0 && (
                  <li className="text-xs text-muted-foreground">No facilities yet</li>
                )}
              </ul>
            </div>
          </section>

          <section className="glass rounded-xl border border-border/60 p-3">
            <h3 className="text-sm font-semibold">Needs attention</h3>
            {attention.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Nothing overdue or expiring in the next 90 days.{" "}
                <Building2 className="inline size-3" aria-hidden />
              </p>
            ) : (
              <ul className="mt-1 space-y-1">
                {attention.map((a) => (
                  <li key={`${a.facilityId}-${a.reason}`}>
                    <button
                      type="button"
                      onClick={() => onOpenFacility(a.facilityId, a.section)}
                      className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums",
                          a.tone === "red"
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-100"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-100",
                        )}
                      >
                        {a.days < 0 ? `${Math.abs(a.days)}d late` : `${a.days}d`}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium">{a.facility}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {a.reason} · {a.block}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

/** Re-exported so the page can keep the stage label map in one import. */
export { STAGE_LABEL, STAGE_COLOR };
