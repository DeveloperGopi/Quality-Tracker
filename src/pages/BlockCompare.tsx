/**
 * BLOCK COMPARE — seven blocks, one clean table, no per-row queries.
 *
 * Every number comes from `blockCompare.getBlockCompare` (one aggregated,
 * indexed query). The heatmap always prints the number; colour is a helper.
 * Clicking any cell opens the Facility Master List with the Block and the same
 * metric applied as a visible FilterBar chip.
 */

import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "convex/react";
import {
  Award,
  BadgeCheck,
  Building2,
  FileWarning,
  GitCompareArrows,
  Leaf,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UniversalFilterBar,
  filterChipLabel,
  loadBarState,
  saveBarState,
  type ActiveFilter,
  type BarValue,
  type FilterField,
} from "@/components/UniversalFilterBar";
import {
  BLOCK_COMPARE_METRICS,
  blockCompareListHref,
  rankingValue,
  type BlockCompareMetricId,
} from "@/lib/blockCompare";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { DEFAULT_SETTINGS } from "@/convex/lifecycle";

type AreaAverage = { key: string; value: number | null };
type DepartmentAverage = {
  canonicalName: string;
  value: number;
  facilities: number;
};
type BlockScores = {
  facilities: number;
  areas: AreaAverage[];
  weakestArea: { key: string; value: number } | null;
  departments: DepartmentAverage[];
};

type BlockRow = {
  block: string;
  facilities: number;
  holdCertificate: number;
  certifiedPct: number | null;
  deferred: number;
  avgNqasIa: number | null;
  iaChange: number | null;
  avgKayakalpIa: number | null;
  docsMissing: number;
  pendingIssues: number;
  scores: BlockScores;
};

type CompareData = {
  blocks: BlockRow[];
  cycles: number[];
  scoreCycle: number | null;
  facilityTypes: string[];
  defaults: { facilityType: string; cycle: string };
  totals: {
    facilities: number;
    holdCertificate: number;
    deferred: number;
    avgNqasIa: number | null;
    avgKayakalpIa: number | null;
    docsMissing: number;
  };
};

const ALLOWED_ROLES = new Set(["admin", "dqc", "dqmo"]);
const PAGE_KEY = "block.compare";
const BAR_KEYS = ["facilityType", "cycle"];

const BLOCK_HUES: Record<BlockCompareMetricId, number> = {
  certifiedPct: 165,
  deferred: 25,
  avgNqasIa: 210,
  iaChange: 275,
  avgKayakalpIa: 145,
  docsMissing: 15,
  pendingIssues: 35,
};

const numberFmt = new Intl.NumberFormat("en-IN");

function metricText(metric: BlockCompareMetricId, value: number | null): string {
  if (value == null) return "-";
  switch (metric) {
    case "certifiedPct":
      return `${numberFmt.format(value)}%`;
    case "iaChange":
      return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
    case "avgNqasIa":
    case "avgKayakalpIa":
      return `${value.toFixed(1)}%`;
    default:
      return numberFmt.format(value);
  }
}

function metricSortValue(block: BlockRow, metric: BlockCompareMetricId): number | null {
  return rankingValue(block, metric);
}

const SCORE_AREAS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

function scoreText(value: number | null | undefined): string {
  return value == null ? "-" : value.toFixed(2);
}

/** Low scores are warm, high scores are teal. The number is always printed. */
function scoreHeatStyle(value: number | null, all: (number | null)[]): CSSProperties {
  if (value == null) return {};
  const nums = all.filter((n): n is number => n != null);
  if (nums.length === 0) return {};
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const t = max === min ? 0.4 : (value - min) / (max - min);
  return {
    background: `oklch(0.95 0.07 ${25 + t * 135} / ${0.08 + t * 0.18})`,
  };
}

function heatStyle(
  value: number | null,
  values: (number | null)[],
  metric: BlockCompareMetricId,
): CSSProperties {
  if (value == null) return {};
  const nums = values.filter((n): n is number => n != null);
  if (nums.length === 0) return {};
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const t = max === min ? 0.35 : (value - min) / (max - min);
  return {
    background: `oklch(0.95 0.05 ${BLOCK_HUES[metric]} / ${0.06 + t * 0.2})`,
  };
}

const KPI_CARD =
  "rounded-xl border-border/60 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-18px_rgba(15,23,42,0.35)]";

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className={KPI_CARD}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <span className="rounded-lg bg-teal-50 p-1.5 text-teal-700">
            <Icon className="size-3.5" />
          </span>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

const HeatmapRow = memo(function HeatmapRow({
  row,
  values,
  onOpen,
}: {
  row: BlockRow;
  values: Record<BlockCompareMetricId, (number | null)[]>;
  onOpen: (block: string, metric: BlockCompareMetricId) => void;
}) {
  return (
    <tr className="border-b border-border/50 last:border-0 hover:bg-muted/25">
      <th
        scope="row"
        className="sticky left-0 z-10 min-w-[120px] border-r border-border/60 bg-card px-3 py-2 text-left text-xs font-semibold"
      >
        {row.block}
        <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums">
          {row.facilities}
        </span>
      </th>
      {BLOCK_COMPARE_METRICS.map((metric) => {
        const value = metricSortValue(row, metric.id);
        return (
          <td key={metric.id} className="px-1 py-1">
            <button
              type="button"
              onClick={() => onOpen(row.block, metric.id)}
              style={heatStyle(value, values[metric.id], metric.id)}
              className="flex min-h-9 w-full min-w-[74px] items-center justify-center rounded-md border border-transparent px-2 text-xs font-semibold tabular-nums transition-[border-color,background-color] hover:border-teal-600/35 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              title={`${row.block} · ${metric.label}: ${metricText(metric.id, value)} — click to open the filtered facilities`}
            >
              {metricText(metric.id, value)}
            </button>
          </td>
        );
      })}
    </tr>
  );
});

export default function BlockCompare() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const allowed = !!user?.appRole && ALLOWED_ROLES.has(user.appRole);

  const [bar, setBar] = useState<BarValue>(() => {
    const saved = loadBarState(PAGE_KEY);
    const savedFilters = (saved?.filters ?? []).filter(
      (filter) =>
        BAR_KEYS.includes(filter.key) &&
        Array.isArray(filter.values) &&
        typeof filter.op === "string",
    );
    return {
      barKeys: saved?.barKeys ?? BAR_KEYS,
      filters: savedFilters,
      match: saved?.match ?? "all",
    };
  });
  const hadSavedBar = useRef(
    loadBarState(PAGE_KEY) != null ||
      (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("f")),
  );
  const defaultsApplied = useRef(false);

  const valueOf = (key: string) =>
    bar.filters.find((filter) => filter.key === key)?.values[0] ?? "";
  const facilityType = valueOf("facilityType");
  const cycle = valueOf("cycle") || "current";

  // Filters are debounced before they hit the reactive query.
  const [debounced, setDebounced] = useState({ facilityType, cycle });
  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebounced({ facilityType, cycle }),
      120,
    );
    return () => window.clearTimeout(timer);
  }, [facilityType, cycle]);

  const data = useQuery(
    api.blockCompare.getBlockCompare,
    allowed
      ? { facilityType: debounced.facilityType || undefined, cycle: debounced.cycle }
      : "skip",
  ) as CompareData | undefined;

  // First visit: the Admin → Filters default seeds the bar once.
  useEffect(() => {
    if (!data || defaultsApplied.current) return;
    defaultsApplied.current = true;
    if (hadSavedBar.current) return;
    const next: ActiveFilter[] = [];
    if (data.defaults.facilityType) {
      next.push({
        key: "facilityType",
        op: "in",
        values: [data.defaults.facilityType],
      });
    }
    if (data.defaults.cycle && data.defaults.cycle !== "current") {
      next.push({ key: "cycle", op: "in", values: [data.defaults.cycle] });
    }
    setBar((current) => ({ ...current, filters: next }));
  }, [data]);

  const filterFields = useMemo<FilterField[]>(
    () => [
      {
        key: "facilityType",
        label: "Facility type",
        type: "select",
        onThisPage: true,
        options: (
          data?.facilityTypes ?? (DEFAULT_SETTINGS.facilityTypes as string[])
        ).map((value) => ({ value, label: value })),
      },
      {
        key: "cycle",
        label: "Cycle",
        type: "select",
        onThisPage: true,
        options: [
          { value: "current", label: "Current cycle" },
          ...(data?.cycles ?? []).map((n) => ({
            value: String(n),
            label: `Cycle #${n}`,
          })),
        ],
      },
    ],
    [data],
  );

  const resetDefaults = () => {
    const next: ActiveFilter[] = [];
    if (data?.defaults.facilityType) {
      next.push({
        key: "facilityType",
        op: "in",
        values: [data.defaults.facilityType],
      });
    }
    if (data?.defaults.cycle && data.defaults.cycle !== "current") {
      next.push({ key: "cycle", op: "in", values: [data.defaults.cycle] });
    }
    const value = { barKeys: BAR_KEYS, filters: next, match: "all" as const };
    setBar(value);
    saveBarState(PAGE_KEY, value);
  };

  const [rankMetric, setRankMetric] =
    useState<BlockCompareMetricId>("certifiedPct");
  const blocks = data?.blocks ?? [];
  const totals = data?.totals;
  const scoreCycle = data?.scoreCycle ?? null;

  const heatValues = useMemo(() => {
    const out = {} as Record<BlockCompareMetricId, (number | null)[]>;
    for (const metric of BLOCK_COMPARE_METRICS) {
      out[metric.id] = blocks.map((row) => metricSortValue(row, metric.id));
    }
    return out;
  }, [blocks]);

  const scoreAreaValues = useMemo(
    () => blocks.flatMap((row) => row.scores.areas.map((area) => area.value)),
    [blocks],
  );
  const scoreDepartmentNames = useMemo(
    () =>
      [...new Set(blocks.flatMap((row) => row.scores.departments.map((entry) => entry.canonicalName)))].sort(),
    [blocks],
  );

  const rankingRows = useMemo(
    () =>
      blocks
        .filter((row) => metricSortValue(row, rankMetric) != null)
        .sort(
          (a, b) =>
            (metricSortValue(b, rankMetric) ?? 0) -
            (metricSortValue(a, rankMetric) ?? 0),
        )
        .map((row) => ({
          block: row.block,
          value: metricSortValue(row, rankMetric) ?? 0,
        })),
    [blocks, rankMetric],
  );

  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");
  useEffect(() => {
    if (blocks.length === 0) return;
    setCompareA((current) => current || blocks[0].block);
    setCompareB((current) => current || blocks[1]?.block || blocks[0].block);
  }, [blocks]);
  const rowA = blocks.find((row) => row.block === compareA) ?? blocks[0];
  const rowB =
    blocks.find((row) => row.block === compareB) ??
    blocks.find((row) => row.block !== rowA?.block) ??
    blocks[0];

  const openCell = (block: string, metric: BlockCompareMetricId) => {
    navigate(
      blockCompareListHref(block, metric, {
        facilityType: debounced.facilityType,
        cycle: debounced.cycle,
      }),
    );
  };

  const openAreaCell = (block: string, areaKey: string) => {
    const params = new URLSearchParams();
    params.set("block", block);
    params.set("sort", `area${areaKey}:asc`);
    if (debounced.facilityType) params.set("type", debounced.facilityType);
    navigate(`/facilities?${params.toString()}`);
  };

  const activeFilterLabel = bar.filters
    .filter((filter) => filter.values.length > 0)
    .map((filter) =>
      filterChipLabel(
        filterFields.find((field) => field.key === filter.key) ?? {
          key: filter.key,
          label: filter.key,
          type: "text",
        },
        filter,
      ),
    )
    .join(" · ");

  if (authLoading) {
    return (
      <AppShell title="Block Compare" subtitle="Loading blocks…">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="mt-4 h-80 rounded-xl" />
      </AppShell>
    );
  }

  if (!allowed) {
    return (
      <AppShell title="Block Compare" subtitle="Role-restricted page">
        <Card className="mx-auto mt-10 max-w-xl border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BadgeCheck className="size-4 text-teal-700" /> Block Compare is
              not available for your role
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              This page is for State Admin, DQC and DQMO. It is hidden for Data
              Entry.
            </p>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  if (!data || !totals) {
    return (
      <AppShell title="Block Compare" subtitle="One aggregated view of all blocks">
        <div className="space-y-4" aria-busy="true">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Block Compare"
      subtitle={`${blocks.length} blocks · ${numberFmt.format(totals.facilities)} facilities${activeFilterLabel ? ` · ${activeFilterLabel}` : ""}`}
      titleIcon={GitCompareArrows}
    >
      <div className="space-y-4 pb-10" data-testid="block-compare-page">
        <section
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"
          aria-label="Block Compare KPIs"
        >
          <Kpi
            icon={Building2}
            label="Facilities"
            value={numberFmt.format(totals.facilities)}
            hint="Facilities in the current scope"
          />
          <Kpi
            icon={Award}
            label="Hold a certificate"
            value={numberFmt.format(totals.holdCertificate)}
            hint="Quality Certified + with conditionality"
          />
          <Kpi
            icon={TrendingDown}
            label="Deferred"
            value={numberFmt.format(totals.deferred)}
            hint="In the Deferred stage"
          />
          <Kpi
            icon={BadgeCheck}
            label="Avg latest NQAS IA"
            value={metricText("avgNqasIa", totals.avgNqasIa)}
            hint="Latest recorded quarter"
          />
          <Kpi
            icon={Leaf}
            label="Avg latest Kayakalp IA"
            value={metricText("avgKayakalpIa", totals.avgKayakalpIa)}
            hint="Latest recorded quarter"
          />
          <Kpi
            icon={FileWarning}
            label="Documents missing"
            value={numberFmt.format(totals.docsMissing)}
            hint="Facilities with a required file missing"
          />
        </section>

        <Card className={KPI_CARD}>
          <CardContent className="p-2.5">
            <UniversalFilterBar
              pageKey={PAGE_KEY}
              fields={filterFields}
              value={bar}
              onChange={setBar}
              onResetDefault={resetDefaults}
              summary={`${blocks.length} blocks · ${numberFmt.format(totals.facilities)} facilities`}
            />
          </CardContent>
        </Card>

        <Card className={cn(KPI_CARD, "overflow-hidden")}>
          <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border/50 px-4 py-3">
            <div>
              <CardTitle className="text-sm font-semibold">Block heatmap</CardTitle>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Every cell shows the number. Brighter colour means a higher
                value. Click a cell to open the filtered Facility Master List.
              </p>
            </div>
            <span className="hidden rounded-full bg-teal-50 px-2 py-1 text-[10px] font-semibold text-teal-800 sm:inline">
              One query · live
            </span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/55 text-[10px] font-semibold text-muted-foreground uppercase">
                    <th
                      scope="col"
                      className="sticky left-0 z-20 min-w-[120px] border-r border-border/60 bg-muted/95 px-3 py-2.5 text-left"
                    >
                      Block
                    </th>
                    {BLOCK_COMPARE_METRICS.map((metric) => (
                      <th
                        key={metric.id}
                        scope="col"
                        className="px-2 py-2.5 text-center whitespace-nowrap"
                      >
                        {metric.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {blocks.map((row) => (
                    <HeatmapRow
                      key={row.block}
                      row={row}
                      values={heatValues}
                      onOpen={openCell}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(KPI_CARD, "overflow-hidden")}>
          <CardHeader className="border-b border-border/50 px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-semibold">Assessment scores</CardTitle>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {scoreCycle == null
                    ? "No Annexure I scores have been saved yet."
                    : `Average area scores from cycle #${scoreCycle}${debounced.cycle === "current" ? " (the latest cycle with saved scores)" : ""}. Click a cell to open that block, lowest score first.`}
                </p>
              </div>
              <span className="rounded-full bg-teal-50 px-2 py-1 text-[10px] font-semibold text-teal-800">
                Numbers always shown
              </span>
            </div>
          </CardHeader>
          {scoreCycle == null ? (
            <CardContent className="px-4 py-6 text-sm text-muted-foreground">
              No Annexure I scores yet. Open a facility’s NQAS Result file and
              read Annexure scores first.
            </CardContent>
          ) : (
            <CardContent className="space-y-4 p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/55 text-[10px] font-semibold text-muted-foreground uppercase">
                      <th
                        scope="col"
                        className="sticky left-0 z-20 min-w-[150px] border-r border-border/60 bg-muted/95 px-3 py-2.5 text-left"
                      >
                        Block
                      </th>
                      {SCORE_AREAS.map((key) => (
                        <th key={key} scope="col" className="px-2 py-2.5 text-center">
                          Area {key}
                        </th>
                      ))}
                      <th scope="col" className="min-w-[110px] px-3 py-2.5 text-left">
                        Weakest area
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {blocks.map((row) => (
                      <tr key={row.block} className="border-b border-border/50 last:border-0">
                        <th
                          scope="row"
                          className="sticky left-0 z-10 border-r border-border/60 bg-card px-3 py-2 text-left text-xs font-semibold"
                        >
                          {row.block}
                          <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">
                            {row.scores.facilities} facilit{row.scores.facilities === 1 ? "y" : "ies"} with scores
                          </span>
                        </th>
                        {SCORE_AREAS.map((key) => {
                          const area = row.scores.areas.find((entry) => entry.key === key);
                          const value = area?.value ?? null;
                          return (
                            <td key={key} className="px-1 py-1">
                              <button
                                type="button"
                                onClick={() => openAreaCell(row.block, key)}
                                style={scoreHeatStyle(value, scoreAreaValues)}
                                className="flex min-h-9 w-full min-w-[72px] items-center justify-center rounded-md border border-transparent px-2 text-xs font-semibold tabular-nums transition-[border-color] hover:border-teal-600/35 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                title={`${row.block} · Area ${key}: ${scoreText(value)} — click to open the filtered facilities, lowest first`}
                              >
                                {scoreText(value)}
                              </button>
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-xs font-semibold tabular-nums">
                          {row.scores.weakestArea
                            ? `${row.scores.weakestArea.key} · ${scoreText(row.scores.weakestArea.value)}`
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {scoreDepartmentNames.length > 0 && (
                <div className="border-t border-border/50 px-4 py-3">
                  <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Department averages · canonical name
                  </p>
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full min-w-[780px] border-collapse text-xs">
                      <thead>
                        <tr className="bg-muted/40 text-[10px] font-semibold text-muted-foreground uppercase">
                          <th scope="col" className="min-w-[170px] px-2 py-2 text-left">
                            Department
                          </th>
                          {blocks.map((row) => (
                            <th key={row.block} scope="col" className="px-2 py-2 text-center">
                              {row.block}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {scoreDepartmentNames.map((name) => (
                          <tr key={name} className="border-t border-border/40">
                            <th scope="row" className="px-2 py-1.5 text-left font-medium">
                              {name}
                            </th>
                            {blocks.map((row) => (
                              <td
                                key={row.block}
                                className="px-2 py-1.5 text-center font-semibold tabular-nums"
                              >
                                {scoreText(
                                  row.scores.departments.find((entry) => entry.canonicalName === name)?.value,
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <Card className={KPI_CARD}>
            <CardHeader className="flex flex-row items-start justify-between gap-2 px-4 py-3">
              <div>
                <CardTitle className="text-sm font-semibold">Block ranking</CardTitle>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Largest first. Blank values are left out of the ranking.
                </p>
              </div>
              <Select
                value={rankMetric}
                onValueChange={(value) =>
                  setRankMetric(value as BlockCompareMetricId)
                }
              >
                <SelectTrigger
                  className="h-8 w-[170px] text-xs"
                  aria-label="Ranking metric"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {BLOCK_COMPARE_METRICS.map((metric) => (
                    <SelectItem key={metric.id} value={metric.id}>
                      {metric.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="px-2 pb-3">
              {rankingRows.length === 0 ? (
                <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                  No block has this metric recorded yet.
                </p>
              ) : (
                <div
                  style={{ height: Math.max(240, rankingRows.length * 42 + 30) }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={rankingRows}
                      layout="vertical"
                      margin={{ top: 4, right: 22, bottom: 4, left: 4 }}
                    >
                      <CartesianGrid
                        horizontal={false}
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                      />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) =>
                          metricText(rankMetric, Number(value))
                        }
                      />
                      <YAxis
                        type="category"
                        dataKey="block"
                        width={92}
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(13,148,136,0.06)" }}
                        formatter={(value) =>
                          metricText(rankMetric, Number(value))
                        }
                        labelFormatter={(label) => String(label)}
                      />
                      <Bar dataKey="value" radius={[0, 5, 5, 0]} barSize={18}>
                        {rankingRows.map((row) => (
                          <Cell
                            key={row.block}
                            fill={
                              ["deferred", "docsMissing", "pendingIssues"].includes(
                                rankMetric,
                              )
                                ? "#c2410c"
                                : "#0f766e"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={KPI_CARD}>
            <CardHeader className="px-4 py-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <GitCompareArrows className="size-4 text-teal-700" /> Compare
                two blocks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pb-4">
              <div className="grid grid-cols-2 gap-2">
                <Select value={rowA?.block ?? ""} onValueChange={setCompareA}>
                  <SelectTrigger className="h-9 text-xs" aria-label="First block">
                    <SelectValue placeholder="First block" />
                  </SelectTrigger>
                  <SelectContent>
                    {blocks.map((row) => (
                      <SelectItem key={row.block} value={row.block}>
                        {row.block}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={rowB?.block ?? ""} onValueChange={setCompareB}>
                  <SelectTrigger className="h-9 text-xs" aria-label="Second block">
                    <SelectValue placeholder="Second block" />
                  </SelectTrigger>
                  <SelectContent>
                    {blocks.map((row) => (
                      <SelectItem key={row.block} value={row.block}>
                        {row.block}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="overflow-hidden rounded-lg border border-border/60">
                <div className="grid grid-cols-[minmax(0,1fr)_86px_86px] bg-muted/60 px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">
                  <span>Metric</span>
                  <span className="text-right">{rowA?.block ?? "-"}</span>
                  <span className="text-right">{rowB?.block ?? "-"}</span>
                </div>
                {BLOCK_COMPARE_METRICS.map((metric) => {
                  const a = rowA ? metricSortValue(rowA, metric.id) : null;
                  const b = rowB ? metricSortValue(rowB, metric.id) : null;
                  const aWins = a != null && b != null && a > b;
                  const bWins = a != null && b != null && b > a;
                  return (
                    <div
                      key={metric.id}
                      className="grid grid-cols-[minmax(0,1fr)_86px_86px] items-center border-t border-border/40 px-3 py-2 text-xs"
                    >
                      <span className="text-muted-foreground">{metric.label}</span>
                      <span
                        className={cn(
                          "text-right font-semibold tabular-nums",
                          aWins && "text-teal-800",
                        )}
                      >
                        {metricText(metric.id, a)}
                        {aWins && <TrendingUp className="ml-1 inline size-3" />}
                      </span>
                      <span
                        className={cn(
                          "text-right font-semibold tabular-nums",
                          bWins && "text-teal-800",
                        )}
                      >
                        {metricText(metric.id, b)}
                        {bWins && <TrendingUp className="ml-1 inline size-3" />}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="text-[10px] text-muted-foreground">
          Numbers match the Dashboard rules. Blank is shown as “-”, never 0. IA
          values are the latest recorded quarter. Clicking a heatmap cell
          applies both the Block and the metric in the Master List FilterBar.
        </p>
      </div>
    </AppShell>
  );
}
