import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, b8 as BadgeCheck, b9 as GitCompareArrows, B as Building2, j as Award, ba as TrendingDown, bb as Leaf, bc as FileExclamationPoint, i as TrendingUp } from './icons-BxQpodNr.js';
import { b as useNavigate, u as useAuth, l as useQuery, j as api, h as Card, i as CardHeader, C as CardTitle, f as CardContent, B as Button, c as cn } from './index-CBV6wOh8.js';
import { D as DEFAULT_SETTINGS, A as AppShell } from './AppShell-CP099uvN.js';
import { S as Skeleton } from './skeleton-D-jVDmpg.js';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from './select-qTILnHQg.js';
import { l as loadBarState, f as filterChipLabel, U as UniversalFilterBar, s as saveBarState } from './UniversalFilterBar-uuD2kW1Y.js';
import { a as ResponsiveContainer, B as BarChart, C as CartesianGrid, X as XAxis, Y as YAxis, T as Tooltip, b as Bar, d as Cell } from './vendor-charts--qXk384P.js';
import './vendor-jspdf-BarNdCns.js';
import './NqasLogo-CIWlMexW.js';
import './label-BaPkqXdo.js';
import './shareLink-_K-oJu5R.js';
import './dialog-BW3GEiPg.js';
import './input-Cy2oZLur.js';

const BLOCK_COMPARE_METRICS = [
  { id: "certifiedPct", label: "Certified %", kind: "percent" },
  { id: "deferred", label: "Deferred", kind: "count" },
  { id: "avgNqasIa", label: "Avg NQAS IA", kind: "score" },
  { id: "iaChange", label: "IA change", kind: "change" },
  { id: "avgKayakalpIa", label: "Avg Kayakalp IA", kind: "score" },
  { id: "docsMissing", label: "Documents missing", kind: "count" },
  { id: "pendingIssues", label: "Pending issues", kind: "count" }
];
Object.fromEntries(
  BLOCK_COMPARE_METRICS.map((metric) => [metric.id, metric])
);
function masterMetricFor(metric) {
  if (metric === "certifiedPct") return "certified";
  if (metric === "avgNqasIa") return "nqasIa";
  if (metric === "avgKayakalpIa") return "kayakalpIa";
  return metric;
}
function blockCompareListHref(block, metric, scope = {}) {
  const params = new URLSearchParams();
  params.set("block", block);
  params.set("metric", masterMetricFor(metric));
  if (scope.facilityType) params.set("type", scope.facilityType);
  if (scope.cycle && scope.cycle !== "current") params.set("cycle", scope.cycle);
  return `/facilities?${params.toString()}`;
}
function rankingValue(block, metric) {
  const value = block[metric];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

const ALLOWED_ROLES = /* @__PURE__ */ new Set(["admin", "dqc", "dqmo"]);
const PAGE_KEY = "block.compare";
const BAR_KEYS = ["facilityType", "cycle"];
const BLOCK_HUES = {
  certifiedPct: 165,
  deferred: 25,
  avgNqasIa: 210,
  iaChange: 275,
  avgKayakalpIa: 145,
  docsMissing: 15,
  pendingIssues: 35
};
const numberFmt = new Intl.NumberFormat("en-IN");
function metricText(metric, value) {
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
function metricSortValue(block, metric) {
  return rankingValue(block, metric);
}
const SCORE_AREAS = ["A", "B", "C", "D", "E", "F", "G", "H"];
function scoreText(value) {
  return value == null ? "-" : value.toFixed(2);
}
function scoreHeatStyle(value, all) {
  if (value == null) return {};
  const nums = all.filter((n) => n != null);
  if (nums.length === 0) return {};
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const t = max === min ? 0.4 : (value - min) / (max - min);
  return {
    background: `oklch(0.95 0.07 ${25 + t * 135} / ${0.08 + t * 0.18})`
  };
}
function heatStyle(value, values, metric) {
  if (value == null) return {};
  const nums = values.filter((n) => n != null);
  if (nums.length === 0) return {};
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const t = max === min ? 0.35 : (value - min) / (max - min);
  return {
    background: `oklch(0.95 0.05 ${BLOCK_HUES[metric]} / ${0.06 + t * 0.2})`
  };
}
const KPI_CARD = "rounded-xl border-border/60 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-18px_rgba(15,23,42,0.35)]";
function Kpi({
  icon: Icon,
  label,
  value,
  hint
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: KPI_CARD, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] font-semibold tracking-wide text-muted-foreground uppercase", children: label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-lg bg-teal-50 p-1.5 text-teal-700", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "size-3.5" }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-2xl font-bold tracking-tight tabular-nums", children: value }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-[11px] leading-snug text-muted-foreground", children: hint })
  ] }) });
}
const HeatmapRow = reactExports.memo(function HeatmapRow2({
  row,
  values,
  onOpen
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/50 last:border-0 hover:bg-muted/25", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "th",
      {
        scope: "row",
        className: "sticky left-0 z-10 min-w-[120px] border-r border-border/60 bg-card px-3 py-2 text-left text-xs font-semibold",
        children: [
          row.block,
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums", children: row.facilities })
        ]
      }
    ),
    BLOCK_COMPARE_METRICS.map((metric) => {
      const value = metricSortValue(row, metric.id);
      return /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-1 py-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: () => onOpen(row.block, metric.id),
          style: heatStyle(value, values[metric.id], metric.id),
          className: "flex min-h-9 w-full min-w-[74px] items-center justify-center rounded-md border border-transparent px-2 text-xs font-semibold tabular-nums transition-[border-color,background-color] hover:border-teal-600/35 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          title: `${row.block} · ${metric.label}: ${metricText(metric.id, value)} — click to open the filtered facilities`,
          children: metricText(metric.id, value)
        }
      ) }, metric.id);
    })
  ] });
});
function BlockCompare() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const allowed = !!user?.appRole && ALLOWED_ROLES.has(user.appRole);
  const [bar, setBar] = reactExports.useState(() => {
    const saved = loadBarState(PAGE_KEY);
    const savedFilters = (saved?.filters ?? []).filter(
      (filter) => BAR_KEYS.includes(filter.key) && Array.isArray(filter.values) && typeof filter.op === "string"
    );
    return {
      barKeys: saved?.barKeys ?? BAR_KEYS,
      filters: savedFilters,
      match: saved?.match ?? "all"
    };
  });
  const hadSavedBar = reactExports.useRef(
    loadBarState(PAGE_KEY) != null || typeof window !== "undefined" && new URLSearchParams(window.location.search).has("f")
  );
  const defaultsApplied = reactExports.useRef(false);
  const valueOf = (key) => bar.filters.find((filter) => filter.key === key)?.values[0] ?? "";
  const facilityType = valueOf("facilityType");
  const cycle = valueOf("cycle") || "current";
  const [debounced, setDebounced] = reactExports.useState({ facilityType, cycle });
  reactExports.useEffect(() => {
    const timer = window.setTimeout(
      () => setDebounced({ facilityType, cycle }),
      120
    );
    return () => window.clearTimeout(timer);
  }, [facilityType, cycle]);
  const data = useQuery(
    api.blockCompare.getBlockCompare,
    allowed ? { facilityType: debounced.facilityType || void 0, cycle: debounced.cycle } : "skip"
  );
  reactExports.useEffect(() => {
    if (!data || defaultsApplied.current) return;
    defaultsApplied.current = true;
    if (hadSavedBar.current) return;
    const next = [];
    if (data.defaults.facilityType) {
      next.push({
        key: "facilityType",
        op: "in",
        values: [data.defaults.facilityType]
      });
    }
    if (data.defaults.cycle && data.defaults.cycle !== "current") {
      next.push({ key: "cycle", op: "in", values: [data.defaults.cycle] });
    }
    setBar((current) => ({ ...current, filters: next }));
  }, [data]);
  const filterFields = reactExports.useMemo(
    () => [
      {
        key: "facilityType",
        label: "Facility type",
        type: "select",
        onThisPage: true,
        options: (data?.facilityTypes ?? DEFAULT_SETTINGS.facilityTypes).map((value) => ({ value, label: value }))
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
            label: `Cycle #${n}`
          }))
        ]
      }
    ],
    [data]
  );
  const resetDefaults = () => {
    const next = [];
    if (data?.defaults.facilityType) {
      next.push({
        key: "facilityType",
        op: "in",
        values: [data.defaults.facilityType]
      });
    }
    if (data?.defaults.cycle && data.defaults.cycle !== "current") {
      next.push({ key: "cycle", op: "in", values: [data.defaults.cycle] });
    }
    const value = { barKeys: BAR_KEYS, filters: next, match: "all" };
    setBar(value);
    saveBarState(PAGE_KEY, value);
  };
  const [rankMetric, setRankMetric] = reactExports.useState("certifiedPct");
  const blocks = data?.blocks ?? [];
  const totals = data?.totals;
  const scoreCycle = data?.scoreCycle ?? null;
  const heatValues = reactExports.useMemo(() => {
    const out = {};
    for (const metric of BLOCK_COMPARE_METRICS) {
      out[metric.id] = blocks.map((row) => metricSortValue(row, metric.id));
    }
    return out;
  }, [blocks]);
  const scoreAreaValues = reactExports.useMemo(
    () => blocks.flatMap((row) => row.scores.areas.map((area) => area.value)),
    [blocks]
  );
  const scoreDepartmentNames = reactExports.useMemo(
    () => [...new Set(blocks.flatMap((row) => row.scores.departments.map((entry) => entry.canonicalName)))].sort(),
    [blocks]
  );
  const rankingRows = reactExports.useMemo(
    () => blocks.filter((row) => metricSortValue(row, rankMetric) != null).sort(
      (a, b) => (metricSortValue(b, rankMetric) ?? 0) - (metricSortValue(a, rankMetric) ?? 0)
    ).map((row) => ({
      block: row.block,
      value: metricSortValue(row, rankMetric) ?? 0
    })),
    [blocks, rankMetric]
  );
  const [compareA, setCompareA] = reactExports.useState("");
  const [compareB, setCompareB] = reactExports.useState("");
  reactExports.useEffect(() => {
    if (blocks.length === 0) return;
    setCompareA((current) => current || blocks[0].block);
    setCompareB((current) => current || blocks[1]?.block || blocks[0].block);
  }, [blocks]);
  const rowA = blocks.find((row) => row.block === compareA) ?? blocks[0];
  const rowB = blocks.find((row) => row.block === compareB) ?? blocks.find((row) => row.block !== rowA?.block) ?? blocks[0];
  const openCell = (block, metric) => {
    navigate(
      blockCompareListHref(block, metric, {
        facilityType: debounced.facilityType,
        cycle: debounced.cycle
      })
    );
  };
  const openAreaCell = (block, areaKey) => {
    const params = new URLSearchParams();
    params.set("block", block);
    params.set("sort", `area${areaKey}:asc`);
    if (debounced.facilityType) params.set("type", debounced.facilityType);
    navigate(`/facilities?${params.toString()}`);
  };
  const activeFilterLabel = bar.filters.filter((filter) => filter.values.length > 0).map(
    (filter) => filterChipLabel(
      filterFields.find((field) => field.key === filter.key) ?? {
        key: filter.key,
        label: filter.key,
        type: "text"
      },
      filter
    )
  ).join(" · ");
  if (authLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(AppShell, { title: "Block Compare", subtitle: "Loading blocks…", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-6", children: [0, 1, 2, 3, 4, 5].map((i) => /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-28 rounded-xl" }, i)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "mt-4 h-80 rounded-xl" })
    ] });
  }
  if (!allowed) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(AppShell, { title: "Block Compare", subtitle: "Role-restricted page", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "mx-auto mt-10 max-w-xl border-border/60 shadow-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, { className: "flex items-center gap-2 text-base", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(BadgeCheck, { className: "size-4 text-teal-700" }),
        " Block Compare is not available for your role"
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-3 text-sm text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "This page is for State Admin, DQC and DQMO. It is hidden for Data Entry." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => navigate("/dashboard"), children: "Back to Dashboard" })
      ] })
    ] }) });
  }
  if (!data || !totals) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(AppShell, { title: "Block Compare", subtitle: "One aggregated view of all blocks", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", "aria-busy": "true", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-6", children: [0, 1, 2, 3, 4, 5].map((i) => /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-28 rounded-xl" }, i)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-12 rounded-xl" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-80 rounded-xl" })
    ] }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    AppShell,
    {
      title: "Block Compare",
      subtitle: `${blocks.length} blocks · ${numberFmt.format(totals.facilities)} facilities${activeFilterLabel ? ` · ${activeFilterLabel}` : ""}`,
      titleIcon: GitCompareArrows,
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4 pb-10", "data-testid": "block-compare-page", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "section",
          {
            className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-6",
            "aria-label": "Block Compare KPIs",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Kpi,
                {
                  icon: Building2,
                  label: "Facilities",
                  value: numberFmt.format(totals.facilities),
                  hint: "Facilities in the current scope"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Kpi,
                {
                  icon: Award,
                  label: "Hold a certificate",
                  value: numberFmt.format(totals.holdCertificate),
                  hint: "Quality Certified + with conditionality"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Kpi,
                {
                  icon: TrendingDown,
                  label: "Deferred",
                  value: numberFmt.format(totals.deferred),
                  hint: "In the Deferred stage"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Kpi,
                {
                  icon: BadgeCheck,
                  label: "Avg latest NQAS IA",
                  value: metricText("avgNqasIa", totals.avgNqasIa),
                  hint: "Latest recorded quarter"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Kpi,
                {
                  icon: Leaf,
                  label: "Avg latest Kayakalp IA",
                  value: metricText("avgKayakalpIa", totals.avgKayakalpIa),
                  hint: "Latest recorded quarter"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Kpi,
                {
                  icon: FileExclamationPoint,
                  label: "Documents missing",
                  value: numberFmt.format(totals.docsMissing),
                  hint: "Facilities with a required file missing"
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: KPI_CARD, children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "p-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          UniversalFilterBar,
          {
            pageKey: PAGE_KEY,
            fields: filterFields,
            value: bar,
            onChange: setBar,
            onResetDefault: resetDefaults,
            summary: `${blocks.length} blocks · ${numberFmt.format(totals.facilities)} facilities`
          }
        ) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: cn(KPI_CARD, "overflow-hidden"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { className: "flex flex-row items-start justify-between gap-3 border-b border-border/50 px-4 py-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-sm font-semibold", children: "Block heatmap" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-[11px] text-muted-foreground", children: "Every cell shows the number. Brighter colour means a higher value. Click a cell to open the filtered Facility Master List." })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden rounded-full bg-teal-50 px-2 py-1 text-[10px] font-semibold text-teal-800 sm:inline", children: "One query · live" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full min-w-[820px] border-collapse text-xs", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "bg-muted/55 text-[10px] font-semibold text-muted-foreground uppercase", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "th",
                {
                  scope: "col",
                  className: "sticky left-0 z-20 min-w-[120px] border-r border-border/60 bg-muted/95 px-3 py-2.5 text-left",
                  children: "Block"
                }
              ),
              BLOCK_COMPARE_METRICS.map((metric) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                "th",
                {
                  scope: "col",
                  className: "px-2 py-2.5 text-center whitespace-nowrap",
                  children: metric.label
                },
                metric.id
              ))
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: blocks.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              HeatmapRow,
              {
                row,
                values: heatValues,
                onOpen: openCell
              },
              row.block
            )) })
          ] }) }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: cn(KPI_CARD, "overflow-hidden"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "border-b border-border/50 px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-start justify-between gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-sm font-semibold", children: "Assessment scores" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-[11px] text-muted-foreground", children: scoreCycle == null ? "No Annexure I scores have been saved yet." : `Average area scores from cycle #${scoreCycle}${debounced.cycle === "current" ? " (the latest cycle with saved scores)" : ""}. Click a cell to open that block, lowest score first.` })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-teal-50 px-2 py-1 text-[10px] font-semibold text-teal-800", children: "Numbers always shown" })
          ] }) }),
          scoreCycle == null ? /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "px-4 py-6 text-sm text-muted-foreground", children: "No Annexure I scores yet. Open a facility’s NQAS Result file and read Annexure scores first." }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-4 p-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full min-w-[980px] border-collapse text-xs", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "bg-muted/55 text-[10px] font-semibold text-muted-foreground uppercase", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "th",
                  {
                    scope: "col",
                    className: "sticky left-0 z-20 min-w-[150px] border-r border-border/60 bg-muted/95 px-3 py-2.5 text-left",
                    children: "Block"
                  }
                ),
                SCORE_AREAS.map((key) => /* @__PURE__ */ jsxRuntimeExports.jsxs("th", { scope: "col", className: "px-2 py-2.5 text-center", children: [
                  "Area ",
                  key
                ] }, key)),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "min-w-[110px] px-3 py-2.5 text-left", children: "Weakest area" })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: blocks.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/50 last:border-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "th",
                  {
                    scope: "row",
                    className: "sticky left-0 z-10 border-r border-border/60 bg-card px-3 py-2 text-left text-xs font-semibold",
                    children: [
                      row.block,
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mt-0.5 block text-[10px] font-normal text-muted-foreground", children: [
                        row.scores.facilities,
                        " facilit",
                        row.scores.facilities === 1 ? "y" : "ies",
                        " with scores"
                      ] })
                    ]
                  }
                ),
                SCORE_AREAS.map((key) => {
                  const area = row.scores.areas.find((entry) => entry.key === key);
                  const value = area?.value ?? null;
                  return /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-1 py-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      type: "button",
                      onClick: () => openAreaCell(row.block, key),
                      style: scoreHeatStyle(value, scoreAreaValues),
                      className: "flex min-h-9 w-full min-w-[72px] items-center justify-center rounded-md border border-transparent px-2 text-xs font-semibold tabular-nums transition-[border-color] hover:border-teal-600/35 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      title: `${row.block} · Area ${key}: ${scoreText(value)} — click to open the filtered facilities, lowest first`,
                      children: scoreText(value)
                    }
                  ) }, key);
                }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2 text-xs font-semibold tabular-nums", children: row.scores.weakestArea ? `${row.scores.weakestArea.key} · ${scoreText(row.scores.weakestArea.value)}` : "-" })
              ] }, row.block)) })
            ] }) }),
            scoreDepartmentNames.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-border/50 px-4 py-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] font-semibold tracking-wide text-muted-foreground uppercase", children: "Department averages · canonical name" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full min-w-[780px] border-collapse text-xs", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "bg-muted/40 text-[10px] font-semibold text-muted-foreground uppercase", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "min-w-[170px] px-2 py-2 text-left", children: "Department" }),
                  blocks.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-2 py-2 text-center", children: row.block }, row.block))
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: scoreDepartmentNames.map((name) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t border-border/40", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "row", className: "px-2 py-1.5 text-left font-medium", children: name }),
                  blocks.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "td",
                    {
                      className: "px-2 py-1.5 text-center font-semibold tabular-nums",
                      children: scoreText(
                        row.scores.departments.find((entry) => entry.canonicalName === name)?.value
                      )
                    },
                    row.block
                  ))
                ] }, name)) })
              ] }) })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: KPI_CARD, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { className: "flex flex-row items-start justify-between gap-2 px-4 py-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-sm font-semibold", children: "Block ranking" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-[11px] text-muted-foreground", children: "Largest first. Blank values are left out of the ranking." })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Select,
                {
                  value: rankMetric,
                  onValueChange: (value) => setRankMetric(value),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      SelectTrigger,
                      {
                        className: "h-8 w-[170px] text-xs",
                        "aria-label": "Ranking metric",
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {})
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { align: "end", children: BLOCK_COMPARE_METRICS.map((metric) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: metric.id, children: metric.label }, metric.id)) })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "px-2 pb-3", children: rankingRows.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "flex h-56 items-center justify-center text-sm text-muted-foreground", children: "No block has this metric recorded yet." }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                style: { height: Math.max(240, rankingRows.length * 42 + 30) },
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer, { width: "100%", height: "100%", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  BarChart,
                  {
                    data: rankingRows,
                    layout: "vertical",
                    margin: { top: 4, right: 22, bottom: 4, left: 4 },
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        CartesianGrid,
                        {
                          horizontal: false,
                          strokeDasharray: "3 3",
                          stroke: "var(--border)"
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        XAxis,
                        {
                          type: "number",
                          tick: { fontSize: 10 },
                          tickLine: false,
                          axisLine: false,
                          tickFormatter: (value) => metricText(rankMetric, Number(value))
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        YAxis,
                        {
                          type: "category",
                          dataKey: "block",
                          width: 92,
                          tick: { fontSize: 11 },
                          tickLine: false,
                          axisLine: false
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Tooltip,
                        {
                          cursor: { fill: "rgba(13,148,136,0.06)" },
                          formatter: (value) => metricText(rankMetric, Number(value)),
                          labelFormatter: (label) => String(label)
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Bar, { dataKey: "value", radius: [0, 5, 5, 0], barSize: 18, children: rankingRows.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Cell,
                        {
                          fill: ["deferred", "docsMissing", "pendingIssues"].includes(
                            rankMetric
                          ) ? "#c2410c" : "#0f766e"
                        },
                        row.block
                      )) })
                    ]
                  }
                ) })
              }
            ) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: KPI_CARD, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, { className: "flex items-center gap-2 text-sm font-semibold", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(GitCompareArrows, { className: "size-4 text-teal-700" }),
              " Compare two blocks"
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-3 px-4 pb-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: rowA?.block ?? "", onValueChange: setCompareA, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-9 text-xs", "aria-label": "First block", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "First block" }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: blocks.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: row.block, children: row.block }, row.block)) })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: rowB?.block ?? "", onValueChange: setCompareB, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-9 text-xs", "aria-label": "Second block", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Second block" }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: blocks.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: row.block, children: row.block }, row.block)) })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "overflow-hidden rounded-lg border border-border/60", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-[minmax(0,1fr)_86px_86px] bg-muted/60 px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Metric" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-right", children: rowA?.block ?? "-" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-right", children: rowB?.block ?? "-" })
                ] }),
                BLOCK_COMPARE_METRICS.map((metric) => {
                  const a = rowA ? metricSortValue(rowA, metric.id) : null;
                  const b = rowB ? metricSortValue(rowB, metric.id) : null;
                  const aWins = a != null && b != null && a > b;
                  const bWins = a != null && b != null && b > a;
                  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      className: "grid grid-cols-[minmax(0,1fr)_86px_86px] items-center border-t border-border/40 px-3 py-2 text-xs",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: metric.label }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          "span",
                          {
                            className: cn(
                              "text-right font-semibold tabular-nums",
                              aWins && "text-teal-800"
                            ),
                            children: [
                              metricText(metric.id, a),
                              aWins && /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, { className: "ml-1 inline size-3" })
                            ]
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          "span",
                          {
                            className: cn(
                              "text-right font-semibold tabular-nums",
                              bWins && "text-teal-800"
                            ),
                            children: [
                              metricText(metric.id, b),
                              bWins && /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, { className: "ml-1 inline size-3" })
                            ]
                          }
                        )
                      ]
                    },
                    metric.id
                  );
                })
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-muted-foreground", children: "Numbers match the Dashboard rules. Blank is shown as “-”, never 0. IA values are the latest recorded quarter. Clicking a heatmap cell applies both the Block and the metric in the Master List FilterBar." })
      ] })
    }
  );
}

export { BlockCompare as default };
