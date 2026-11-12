const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/BreakdownHeatmap-0-t7KNDL.js","assets/vendor-motion-DgC1stbS.js","assets/icons-BxQpodNr.js","assets/index-CBV6wOh8.js","assets/vendor-jspdf-BarNdCns.js","assets/vendor-charts--qXk384P.js","assets/index-CneVNiou.css","assets/badge-Cc2gQHFR.js","assets/AppShell-CP099uvN.js","assets/NqasLogo-CIWlMexW.js","assets/label-BaPkqXdo.js","assets/shareLink-_K-oJu5R.js","assets/StatusBadge-BPGGn135.js","assets/SegmentBar-BPZwoyP9.js","assets/select-qTILnHQg.js","assets/input-Cy2oZLur.js","assets/skeleton-D-jVDmpg.js","assets/dialog-BW3GEiPg.js","assets/tabs-siU4Pie8.js","assets/IaReminderBanner-CU62scGn.js","assets/today-D9v8Esj5.js","assets/dropdown-menu-N0nU9bdA.js","assets/vendor-exceljs-CqnmHTS6.js","assets/exportTable-BCt2u4fE.js","assets/fiscalYear-QbChygln.js","assets/reportColumns-DJVmn3gI.js","assets/masterFilter-DrauVhuN.js","assets/FilterDropdown-B_vJKp6C.js","assets/UniversalFilterBar-uuD2kW1Y.js","assets/FacilityCell-CI45DpPw.js","assets/FacilityTypeBadge-8G3otPEU.js","assets/SizeShareChart-CQCoByVH.js"])))=>i.map(i=>d[i]);
import { j as jsxRuntimeExports, m as motion } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, t as ArrowDownNarrowWide, F as FileSpreadsheet, u as FileText, v as Image, I as Info, G as GripVertical, w as RotateCcw, x as Columns3, y as Ruler, z as ChevronRight, H as ChevronDown, J as ClipboardList, T as TriangleAlert, K as ChevronUp, S as ShieldCheck, j as Award, N as CalendarClock, P as FunnelX, Q as Search, V as MessageCircle, X as History, L as LoaderCircle, Y as Plus, Z as Upload, _ as BookMarked, $ as Target, a0 as Presentation, a1 as Send, a2 as Download } from './icons-BxQpodNr.js';
import { c as cn, k as cva, h as Card, i as CardHeader, C as CardTitle, B as Button, f as CardContent, L as Link, d as useSearchParams, l as useQuery, j as api, b as useNavigate } from './index-CBV6wOh8.js';
import { C as COLUMN_BY_KEY, u as useCycleScope, a as useSetCycleScope, D as DEFAULT_SETTINGS, d as deriveLifecycleView, P as PIPELINE_STAGES, t as toDisplayDateTime, A as AppShell, b as toDisplayDate, c as CycleFilter, e as Popover, f as PopoverTrigger, g as PopoverContent, n as nextStepHint, N as NAV_ITEMS } from './AppShell-CP099uvN.js';
import { S as StatusBadge } from './StatusBadge-BPGGn135.js';
import { P as PIPELINE_STAGE_COLORS } from './SegmentBar-BPZwoyP9.js';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from './select-qTILnHQg.js';
import { B as Badge } from './badge-Cc2gQHFR.js';
import { I as Input } from './input-Cy2oZLur.js';
import { S as Skeleton } from './skeleton-D-jVDmpg.js';
import { D as Dialog, a as DialogContent, b as DialogHeader, c as DialogTitle, d as DialogDescription } from './dialog-BW3GEiPg.js';
import { T as Tabs, a as TabsList, b as TabsTrigger } from './tabs-siU4Pie8.js';
import { I as IaReminderBanner } from './IaReminderBanner-CU62scGn.js';
import { D as DropdownMenu, a as DropdownMenuTrigger, b as DropdownMenuContent, c as DropdownMenuLabel, d as DropdownMenuRadioGroup, e as DropdownMenuRadioItem, f as DropdownMenuItem, g as DropdownMenuSeparator, h as DropdownMenuSub, i as DropdownMenuSubTrigger, j as DropdownMenuSubContent } from './dropdown-menu-N0nU9bdA.js';
import { _ as __vitePreload } from './vendor-jspdf-BarNdCns.js';
import { a as exceljs_minExports } from './vendor-exceljs-CqnmHTS6.js';
import { b as buildTablePdf, e as exportPdf, a as exportExcel } from './exportTable-BCt2u4fE.js';
import { t as todayLocalIso, i as isTodayOrFuture } from './today-D9v8Esj5.js';
import { c as currentFiscalYear, f as fiscalYearLabel } from './fiscalYear-QbChygln.js';
import { r as reportRows, a as reportHeaders, b as reportColumn, f as formatReportDate, c as reportSubtitle, p as percentOf, d as formatPercent, e as reportColumnAligns, g as reportColumnWidths, h as downloadText, i as buildReportCsv, o as openReportPrintView } from './reportColumns-DJVmn3gI.js';
import { m as multiFilterMatches } from './masterFilter-DrauVhuN.js';
import { F as FilterDropdown } from './FilterDropdown-B_vJKp6C.js';
import { U as UniversalFilterBar } from './UniversalFilterBar-uuD2kW1Y.js';
import { F as FacilityCell } from './FacilityCell-CI45DpPw.js';

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        destructive: "text-destructive bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);
function Alert({
  className,
  variant,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      "data-slot": "alert",
      role: "alert",
      className: cn(alertVariants({ variant }), className),
      ...props
    }
  );
}
function AlertTitle({ className, ...props }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      "data-slot": "alert-title",
      className: cn(
        "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
        className
      ),
      ...props
    }
  );
}
function AlertDescription({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      "data-slot": "alert-description",
      className: cn(
        "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className
      ),
      ...props
    }
  );
}

const BREAKDOWN_BUCKETS = [
  {
    key: "qualityCertified",
    label: "Quality Certified",
    i18n: "bd.bucket.qualityCertified",
    colour: "oklch(0.62 0.15 165)",
    /** Patterns are the second encoding (colour-blind + greyscale): solid. */
    pattern: "solid",
    description: "Passed the NQAS assessment with no conditions attached (incl. the legacy “Certified — Surveillance Due” spelling)."
  },
  {
    key: "conditional",
    label: "Certified with conditionality",
    i18n: "bd.bucket.conditional",
    colour: "oklch(0.85 0.14 95)",
    /** Diagonal hatch — never confused with the deep orange beside it. */
    pattern: "hatch",
    description: "Certified with conditions to close. Together with Quality Certified this is “hold a certificate”, the number the rate uses."
  },
  {
    key: "resultAwaited",
    label: "Result awaited / documents in process",
    i18n: "bd.bucket.resultAwaited",
    colour: "oklch(0.68 0.17 45)",
    pattern: "solid",
    description: "Assessment done or result pending — incl. “Result Awaited”, “Recertification Due” and “SA Completed — NQAS Awaited”. This is exactly the count the Result-awaited pipeline card shows."
  },
  {
    key: "inProgress",
    label: "In progress (assessment stages)",
    i18n: "bd.bucket.inProgress",
    colour: "oklch(0.58 0.14 250)",
    pattern: "solid",
    description: "SA / NQAS assessment scheduled or open (“SA Scheduled”, “NA Scheduled”, legacy NQAS wording, “Eligible for Re-Assessment”)."
  },
  {
    key: "deferred",
    label: "Deferred",
    i18n: "bd.bucket.deferred",
    colour: "oklch(0.55 0.2 25)",
    pattern: "solid",
    description: "Deferred — cooling period. Not certified, not awaiting a result."
  },
  {
    key: "eligibleNotStarted",
    label: "Eligible — not started",
    i18n: "bd.bucket.eligibleNotStarted",
    colour: "oklch(0.82 0.02 260)",
    pattern: "solid",
    description: "Eligible facilities with “SA Not Yet Initiated” (and blanks) — the not-yet-workload."
  },
  {
    key: "notEligible",
    label: "Not eligible",
    i18n: "bd.bucket.notEligible",
    colour: "oklch(0.72 0.02 260)",
    /** Dots — the muted bucket is never merged into "Not started". */
    pattern: "dots",
    description: "Stored eligibility is Not Eligible. Never counted in the rate."
  }
];
const BUCKET_ORDER = BREAKDOWN_BUCKETS.map((b) => b.key);
const BUCKET_BY_KEY = Object.fromEntries(
  BREAKDOWN_BUCKETS.map((b) => [b.key, b])
);
function folded(text) {
  return (text ?? "").trim();
}
function isNotEligibility(eligibility) {
  const e = folded(eligibility).toLowerCase();
  return e.startsWith("not") || e.includes("inelig") || e.includes("in-elig") || e.includes("in elig");
}
function breakdownBucketOf(f) {
  const current = folded(f.currentStatus);
  const result = folded(f.certStatus) || null;
  if (isNotEligibility(f.eligibility)) return "notEligible";
  if (result === "Quality Certified" || !result && current === "Certified — Surveillance Due")
    return "qualityCertified";
  if (result === "Quality Certified with Conditionality" || !result && current === "Certified with Conditionality")
    return "conditional";
  if (result === "Deferred" || !result && current.startsWith("Deferred"))
    return "deferred";
  if (result === "Result Awaited" || current === "Result Awaited" || current === "Recertification Due" || current === "SA Completed — NQAS Awaited" || folded(f.docStatus) === "NA Completed & Awaiting Results" && current !== "Facility (Future Candidate)" && current !== "SA Not Yet Initiated")
    return "resultAwaited";
  if (current.startsWith("SA Scheduled") || current.startsWith("NA Scheduled") || current.startsWith("NQAS") || current.startsWith("SA Completed") || current === "Eligible for Re-Assessment")
    return "inProgress";
  return "eligibleNotStarted";
}
const emptyBuckets = () => Object.fromEntries(BUCKET_ORDER.map((k) => [k, 0]));
function groupKeyOf(f, dimension) {
  if (dimension === "block") return folded(f.block) || "—";
  if (dimension === "type") return folded(f.facilityType) || "—";
  return folded(f.phc) || folded(f.block) || "—";
}
function daysUntil(iso, today) {
  if (!iso) return null;
  const t = Date.parse(iso + "T12:00:00");
  const n = Date.parse(today + "T12:00:00");
  if (Number.isNaN(t) || Number.isNaN(n)) return null;
  return Math.round((t - n) / 864e5);
}
function overlaysOf(f, today, lead) {
  const bucket = breakdownBucketOf(f);
  const holds = bucket === "qualityCertified" || bucket === "conditional";
  const daysToValidity = daysUntil(f.validityDate, today);
  const recert = holds && f.validityDate && daysToValidity != null && daysToValidity <= lead ? 1 : 0;
  const survDue = (due, done) => {
    const d = daysUntil(due, today);
    return !done && d != null && d <= lead ? 1 : 0;
  };
  return {
    recertDue: recert,
    surveillanceDue: survDue(f.surveillanceDue1 ?? null, f.surveillanceDone1 ?? null) + survDue(f.surveillanceDue2 ?? null, f.surveillanceDone2 ?? null)
  };
}
const round1$1 = (x) => Math.round(x * 10) / 10;
function rateOf(hold, denominatorCount) {
  return denominatorCount > 0 ? round1$1(hold / denominatorCount * 100) : 0;
}
function buildBreakdown(rows, opts) {
  const dimension = opts.dimension;
  const minGroupSize = opts.minGroupSize ?? 10;
  const denominator = opts.denominator ?? "all";
  const today = opts.today ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const lead = opts.leadDays ?? 30;
  const groups = /* @__PURE__ */ new Map();
  for (const f of rows) {
    const key = groupKeyOf(f, dimension);
    const g = groups.get(key) ?? { n: 0, eligibleN: 0, buckets: emptyBuckets(), recertDue: 0, surveillanceDue: 0 };
    g.n += 1;
    if (folded(f.eligibility) === "Eligible") g.eligibleN += 1;
    g.buckets[breakdownBucketOf(f)] += 1;
    const ov = overlaysOf(f, today, lead);
    g.recertDue += ov.recertDue;
    g.surveillanceDue += ov.surveillanceDue;
    groups.set(key, g);
  }
  const scopeLabel = dimension === "block" ? "Block" : dimension === "type" ? "Facility type" : "PHC";
  const rowsOut = [...groups.entries()].map(([key, g]) => {
    const hold = g.buckets.qualityCertified + g.buckets.conditional;
    const denomCount = denominator === "eligible" ? g.eligibleN : g.n;
    return {
      key,
      label: key,
      n: g.n,
      eligibleN: g.eligibleN,
      buckets: { ...g.buckets },
      holdCert: hold,
      rate: rateOf(hold, denomCount),
      vsAvgPoints: 0,
      // filled in once the scope average exists
      small: g.n < minGroupSize,
      overlays: { recertDue: g.recertDue, surveillanceDue: g.surveillanceDue }
    };
  });
  const total = rowsOut.reduce((a, r) => a + r.n, 0);
  const eligibleTotal = rowsOut.reduce((a, r) => a + r.eligibleN, 0);
  const holdTotal = rowsOut.reduce((a, r) => a + r.holdCert, 0);
  const avgPct = denominator === "eligible" ? rateOf(holdTotal, eligibleTotal) : rateOf(holdTotal, total);
  for (const r of rowsOut) r.vsAvgPoints = round1$1(r.rate - avgPct);
  const grand = {
    key: "__all__",
    label: "All facilities",
    n: total,
    eligibleN: eligibleTotal,
    buckets: emptyBuckets(),
    holdCert: holdTotal,
    rate: avgPct,
    vsAvgPoints: 0,
    small: false,
    overlays: rowsOut.reduce(
      (a, r) => ({
        recertDue: a.recertDue + r.overlays.recertDue,
        surveillanceDue: a.surveillanceDue + r.overlays.surveillanceDue
      }),
      { recertDue: 0, surveillanceDue: 0 }
    )
  };
  for (const r of rowsOut) for (const k of BUCKET_ORDER) grand.buckets[k] += r.buckets[k];
  return {
    dimension,
    scopeLabel,
    denominator,
    minGroupSize,
    total,
    eligibleN: eligibleTotal,
    quality: grand.buckets.qualityCertified,
    conditional: grand.buckets.conditional,
    holdCert: holdTotal,
    avgPct,
    rows: rowsOut,
    grand
  };
}
function sortBreakdownRows(rows, sort) {
  const byName = (a, b) => a.label.localeCompare(b.label);
  const sorted = [...rows];
  if (sort === "name") return sorted.sort(byName);
  if (sort === "sizeDesc")
    return sorted.sort((a, b) => b.n - a.n || byName(a, b));
  if (sort === "rateDesc")
    return sorted.sort((a, b) => b.rate - a.rate || b.n - a.n || byName(a, b));
  if (sort === "rateAsc")
    return sorted.sort((a, b) => a.rate - b.rate || b.n - a.n || byName(a, b));
  return sorted.sort((a, b) => a.vsAvgPoints - b.vsAvgPoints || byName(a, b));
}
function breakdownTakeaway(rows, avgPct, total, holdCert) {
  if (total <= 0) return null;
  if (holdCert === 0)
    return "No group holds a certificate yet — the scope average is 0%.";
  const big = rows.filter((r) => !r.small);
  const best = big.filter((r) => r.rate === Math.max(...big.map((x) => x.rate)));
  const worst = big.filter((r) => r.rate === Math.min(...big.map((x) => x.rate)));
  const fmt = (r) => `${r.label} at ${r.rate}% (${r.holdCert} of ${r.n})`;
  if (best.length === 1)
    return `${fmt(best[0])} leads, ${best[0].vsAvgPoints >= 0 ? "+" : ""}${best[0].vsAvgPoints} points versus the scope average of ${avgPct}%.`;
  if (worst.length === 1 && worst[0].vsAvgPoints <= -10)
    return `${fmt(worst[0])} trails, ${worst[0].vsAvgPoints} points below the scope average of ${avgPct}%.`;
  return `No group stands out — every sizable group sits between ${Math.min(
    ...big.map((x) => x.rate)
  )}% and ${Math.max(...big.map((x) => x.rate))}% (average ${avgPct}%).`;
}
function rowBadgeFor(row, rows, avgPct) {
  const big = rows.filter((r) => !r.small && r.n > 0);
  if (big.length === 0 || !big.some((r) => r.key === row.key)) return null;
  const rates = big.map((r) => r.rate);
  if (big.filter((r) => r.rate === Math.max(...rates)).length === 1 && row.rate === Math.max(...rates))
    return "best";
  if (big.filter((r) => r.rate === Math.min(...rates)).length === 1 && row.rate === Math.min(...rates) && row.vsAvgPoints <= -10)
    return "attention";
  return null;
}
const cellKey = (b, t) => `${b}\0${t}`;
function buildBlockTypeHeatmap(rows) {
  const smallLimit = 3;
  const agg = /* @__PURE__ */ new Map();
  const blocks = /* @__PURE__ */ new Set();
  const types = /* @__PURE__ */ new Set();
  for (const f of rows) {
    const b = folded(f.block) || "—";
    const t = folded(f.facilityType) || "—";
    blocks.add(b);
    types.add(t);
    const k = cellKey(b, t);
    const g = agg.get(k) ?? { block: b, type: t, n: 0, hold: 0, eligible: 0 };
    g.n += 1;
    const bucket = breakdownBucketOf(f);
    if (bucket === "qualityCertified" || bucket === "conditional") g.hold += 1;
    if (folded(f.eligibility) === "Eligible") g.eligible += 1;
    agg.set(k, g);
  }
  const cells = /* @__PURE__ */ new Map();
  const rowTotals = /* @__PURE__ */ new Map();
  const colTotals = /* @__PURE__ */ new Map();
  let totalN = 0;
  let totalHold = 0;
  for (const g of agg.values()) {
    cells.set(cellKey(g.block, g.type), {
      blockKey: g.block,
      typeKey: g.type,
      n: g.n,
      holdCert: g.hold,
      ratePct: rateOf(g.hold, g.n),
      present: true,
      small: g.n < smallLimit
    });
    const rt = rowTotals.get(g.block) ?? { n: 0, holdCert: 0, ratePct: 0 };
    rt.n += g.n;
    rt.holdCert += g.hold;
    rowTotals.set(g.block, rt);
    const ct = colTotals.get(g.type) ?? { n: 0, holdCert: 0, ratePct: 0 };
    ct.n += g.n;
    ct.holdCert += g.hold;
    colTotals.set(g.type, ct);
    totalN += g.n;
    totalHold += g.hold;
  }
  for (const [key, t] of rowTotals) rowTotals.set(key, { ...t, ratePct: rateOf(t.holdCert, t.n) });
  for (const [key, t] of colTotals) colTotals.set(key, { ...t, ratePct: rateOf(t.holdCert, t.n) });
  return {
    blockKeys: [...blocks].sort((a, b) => a.localeCompare(b)),
    typeKeys: [...types].sort(
      (a, b) => (colTotals.get(b)?.n ?? 0) - (colTotals.get(a)?.n ?? 0) || a.localeCompare(b)
    ),
    cells,
    rowTotals,
    colTotals,
    avgPct: rateOf(totalHold, totalN)
  };
}
function oklchToRgb(colour) {
  const m = /^oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/.exec(colour.trim());
  if (!m) return [89, 89, 89];
  const L = Number(m[1]);
  const C = Number(m[2]);
  const hDeg = Number(m[3]);
  const rad = hDeg * Math.PI / 180;
  const a = C * Math.cos(rad);
  const b2 = C * Math.sin(rad);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b2;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b2;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b2;
  const l = l_ ** 3;
  const mm = m_ ** 3;
  const s = s_ ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s
  ];
  return lin.map((c) => {
    const g = c <= 31308e-7 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, g)) * 255);
  });
}
const BUCKET_LIST_PARAMS = {
  qualityCertified: { param: "cert", values: "Quality Certified" },
  conditional: { param: "cert", values: "Quality Certified with Conditionality" },
  resultAwaited: {
    param: "status",
    values: "Result Awaited,Recertification Due,SA Completed — NQAS Awaited"
  },
  inProgress: {
    param: "status",
    values: "SA Scheduled,NA Scheduled,NQAS Scheduled,Eligible for Re-Assessment"
  },
  deferred: { param: "cert", values: "Deferred" },
  eligibleNotStarted: { param: "status", values: "SA Not Yet Initiated" },
  notEligible: { param: "elig", values: "Not Eligible" }
};
function breakdownListUrl(dimension, groupValue, bucket) {
  const params = new URLSearchParams();
  if (dimension === "block") params.set("block", groupValue);
  else if (dimension === "type") params.set("type", groupValue);
  else params.set("q", groupValue);
  if (bucket) {
    const p = BUCKET_LIST_PARAMS[bucket];
    if (p) params.set(p.param, p.values);
  }
  return `/facilities?${params.toString()}`;
}

const ZERO_FMT = '#,##0;-#,##0;"-"';
const PCT_FMT = "0.0%";
const clean = (v) => v === 0 ? 0 : v;
function breakdownExportColumns(bd) {
  const cols = [
    { label: "S.No", width: 8, align: "right", value: (_r, i) => i + 1 },
    { label: bd.scopeLabel, width: 18, align: "left", value: (r) => r.label },
    { label: "Facilities", width: 11, align: "right", value: (r) => clean(r.n), numFmt: ZERO_FMT },
    {
      label: "Quality certified",
      width: 14,
      align: "right",
      value: (r) => clean(r.buckets.qualityCertified),
      numFmt: ZERO_FMT
    },
    {
      label: "Conditional",
      width: 12,
      align: "right",
      value: (r) => clean(r.buckets.conditional),
      numFmt: ZERO_FMT
    },
    {
      // LIVE formula — the sheet's own arithmetic, never a stale number.
      label: "Hold a certificate",
      width: 15,
      align: "right",
      value: () => null,
      // Hold a certificate = Quality (D) + Conditional (E) — live formula.
      formula: (r) => ({ formula: `D${r.rNo}+E${r.rNo}` }),
      numFmt: ZERO_FMT
    }
  ];
  for (const key of ["resultAwaited", "inProgress", "deferred", "eligibleNotStarted", "notEligible"])
    cols.push({
      label: BUCKET_BY_KEY[key].label,
      width: 15,
      align: "right",
      value: (r) => clean(r.buckets[key]),
      numFmt: ZERO_FMT
    });
  cols.push({
    label: "Certified %",
    width: 12,
    align: "right",
    value: () => null,
    // = Hold a certificate ÷ Facilities — same definition the card header states.
    // Certified % = Hold (F) ÷ Facilities (C) — the definition the header states.
    formula: (r) => ({ formula: `F${r.rNo}/C${r.rNo}` }),
    numFmt: PCT_FMT
  });
  cols.push({
    label: "vs average (pts)",
    width: 14,
    align: "right",
    value: (r) => clean(round1(bd.avgPct ? r.vsAvgPoints : 0)),
    numFmt: "+0.0;-0.0;0"
  });
  cols.push({
    label: "Recert due",
    width: 11,
    align: "right",
    value: (r) => clean(r.overlays.recertDue),
    numFmt: ZERO_FMT
  });
  cols.push({
    label: "Surveillance due",
    width: 13,
    align: "right",
    value: (r) => clean(r.overlays.surveillanceDue),
    numFmt: ZERO_FMT
  });
  return cols;
}
const round1 = (x) => Math.round(x * 10) / 10;
function breakdownSubtitle(bd, generatedAt) {
  const def = bd.denominator === "eligible" ? "Certified % = facilities holding a certificate ÷ eligible facilities" : "Certified % = facilities holding a certificate ÷ all facilities";
  return `${def} · ${bd.total} facilities · scope average ${bd.avgPct}% · generated ${generatedAt}`;
}
async function buildBreakdownWorkbook(bd, meta) {
  const cols = breakdownExportColumns(bd);
  const wb = new exceljs_minExports.Workbook();
  wb.creator = "NQAS Tracker";
  const ws = wb.addWorksheet("Progress breakdown", {
    views: [
      // Frozen header row AND first column (the brief's read-back rule).
      { state: "frozen", xSplit: 1, ySplit: 3 }
    ],
    headerFooter: {
      // The print footer the brief pins: Report ID · Page &P of &N.
      oddFooter: "&8&LReport ID · Page &P of &N"
    }
  });
  const bandCol = cols.length;
  const band = [meta.title, breakdownSubtitle(bd, meta.generatedAt)];
  band.forEach((text, i) => {
    const r = i + 1;
    ws.mergeCells(r, 1, r, bandCol);
    const cell = ws.getCell(r, 1);
    cell.value = text;
    if (i === 0) cell.font = { bold: true, size: 13 };
    else {
      cell.font = { size: 9, color: { argb: "FF555555" } };
      cell.alignment = { wrapText: true };
    }
  });
  const headerRow = ws.getRow(3);
  cols.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = c.label;
    cell.font = { bold: true };
    cell.alignment = { wrapText: true, horizontal: c.align === "right" ? "right" : "left" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D6960" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  });
  const numbered = [
    ...bd.rows.map((r, i) => ({ ...r, rNo: 4 + i })),
    { ...bd.grand, rNo: 4 + bd.rows.length }
  ];
  for (const r of numbered) {
    const row = ws.getRow(r.rNo);
    cols.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      const f = c.formula?.(r, i);
      if (f) {
        cell.value = { formula: f.formula };
        if (c.numFmt) cell.numFmt = c.numFmt;
      } else {
        cell.value = c.value(r, i);
        if (c.numFmt && typeof cell.value === "number") cell.numFmt = c.numFmt;
      }
      cell.alignment = {
        horizontal: c.align === "right" ? "right" : "left",
        wrapText: c.align === "left"
      };
    });
    if (r.key === bd.grand.key) row.font = { bold: true };
    row.commit();
  }
  cols.forEach((c, i) => {
    ws.getColumn(i + 1).width = c.width;
  });
  ws.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    printTitlesRow: "3:3",
    margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 }
  };
  return wb;
}
function drawBreakdownChart(doc, bd) {
  const d = doc;
  const margin = 40;
  const pageW = d.internal.pageSize.getWidth();
  const pageH = d.internal.pageSize.getHeight();
  const barAreaW = pageW - margin * 2 - 120;
  const barH = 12;
  const gap = 10;
  const present = BUCKET_ORDER.filter((k) => bd.grand.buckets[k] > 0);
  let y = (d.lastAutoTable?.finalY ?? 60) + 24;
  const legendOnce = () => {
    d.setFontSize(8);
    let lx = margin;
    for (const k of present) {
      const [r, g, b2] = oklchToRgb(BUCKET_BY_KEY[k].colour);
      d.setFillColor(r, g, b2);
      d.rect(lx, y - 7, 6, 6, "F");
      d.setTextColor(60);
      d.text(BUCKET_BY_KEY[k].label, lx + 8, y - 2);
      lx += 8 + d.getTextWidth(BUCKET_BY_KEY[k].label) + 8;
      if (lx > pageW - margin - 40) {
        lx = margin;
        y += 10;
      }
    }
    d.setTextColor(0);
    y += 8;
  };
  if (y + 20 < pageH) legendOnce();
  Math.max(1, ...bd.rows.map((r) => r.n));
  for (const r of bd.rows) {
    if (y + barH + 10 > pageH - 40) {
      d.addPage();
      y = 48;
      legendOnce();
    }
    d.setFontSize(8);
    d.setTextColor(0);
    d.text(`${r.label} (${r.holdCert}/${r.n} · ${Math.round(r.rate)}%)`, margin, y + barH - 3);
    let x = margin + barAreaW;
    for (const k of BUCKET_ORDER) {
      const n = r.buckets[k];
      if (n === 0) continue;
      const w = n / r.n * barAreaW - 0.5;
      const [cr, cg, cb2] = oklchToRgb(BUCKET_BY_KEY[k].colour);
      d.setFillColor(cr, cg, cb2);
      d.rect(x, y, Math.max(0.5, w), barH, "F");
      x += w + 0.5;
    }
    y += barH + gap;
  }
}
async function buildBreakdownPdf(bd, meta) {
  const cols = breakdownExportColumns(bd);
  const headers = cols.map((c) => c.label);
  const bodyLine = (r, rowNo) => cols.map((c, i) => {
    if (c.formula) {
      if (c.label === "Hold a certificate") return r.holdCert;
      if (c.label === "Certified %") return r.rate + "%";
      return null;
    }
    return c.value(r, rowNo);
  });
  const body = bd.rows.map((r, i) => bodyLine({ ...r, rNo: 4 + i }, i));
  const total = bodyLine(
    { ...bd.grand, rNo: 4 + bd.rows.length },
    bd.rows.length
  );
  const doc = await buildTablePdf({
    title: meta.title,
    subtitle: breakdownSubtitle(bd, meta.generatedAt),
    headers,
    rows: [...body, total],
    options: {
      columnWidths: cols.map((c) => c.width),
      columnAligns: cols.map((c) => c.align)
    }
  });
  drawBreakdownChart(doc, bd);
  return doc;
}
async function exportBreakdown(bd, fmt, fileBase) {
  const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const title = `Progress breakdown — by ${bd.scopeLabel.toLowerCase()}`;
  if (fmt === "xlsx") {
    const wb = await buildBreakdownWorkbook(bd, { title, generatedAt: stamp });
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileBase}-${stamp}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  } else {
    const doc = await buildBreakdownPdf(bd, { title, generatedAt: stamp });
    await doc.save(`${fileBase}-${stamp}.pdf`);
  }
}

const BreakdownHeatmap = reactExports.lazy(() => __vitePreload(() => import('./BreakdownHeatmap-0-t7KNDL.js'),true              ?__vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30]):void 0));
const SizeShareChart = reactExports.lazy(() => __vitePreload(() => import('./SizeShareChart-CQCoByVH.js'),true              ?__vite__mapDeps([31,1,2,3,4,5,6,8,9,10,11,12,13,14,7,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30]):void 0));
function ProgressBreakdownCard({
  breakdown: bd,
  facilities,
  facilityNames,
  dataAsOf,
  isAdmin = false,
  allowPhc = false,
  state,
  onState: patch
}) {
  const rows = reactExports.useMemo(
    () => sortBreakdownRows(bd.rows, state.sort),
    [bd, state.sort]
  );
  const takeaway = reactExports.useMemo(
    () => breakdownTakeaway(rows, bd.avgPct, bd.total, bd.holdCert),
    [rows, bd.avgPct, bd.total, bd.holdCert]
  );
  const [isolated, setIsolated] = reactExports.useState(null);
  const chartRef = reactExports.useRef(null);
  const [pngBusy, setPngBusy] = reactExports.useState(false);
  const shown = isolated ? rows.filter((r) => r.buckets[isolated] > 0) : rows;
  const exportPng = async () => {
    if (!chartRef.current || pngBusy) return;
    setPngBusy(true);
    try {
      const { snapdom } = await __vitePreload(async () => { const { snapdom } = await import('./index-CBV6wOh8.js').then(n => n.x);return { snapdom }},true              ?__vite__mapDeps([3,4,1,2,5,6]):void 0);
      const canvas = await snapdom.toCanvas(chartRef.current, { fast: true });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `progress-breakdown-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.png`;
      a.click();
    } finally {
      setPngBusy(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "glass mb-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { className: "flex-row flex-wrap items-center justify-between gap-2 space-y-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-base", children: "Progress breakdown" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          InfoTip$1,
          {
            tip: "One row per group. Buckets are mutually exclusive and sum to the Facilities count. Certified % = facilities holding a certificate (Quality + Conditional) ÷ " + (bd.denominator === "eligible" ? "eligible facilities." : "all facilities.") + " Recertification due and Surveillance due are badges on the row, not bar segments."
          }
        ),
        dataAsOf && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "shrink-0 text-xs text-muted-foreground", children: [
          "Data as of ",
          dataAsOf
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          SegmentedControl,
          {
            value: state.dim,
            onValue: (dim) => patch({ dim }),
            options: [
              { value: "block", label: "By block" },
              { value: "type", label: "By facility type" },
              ...allowPhc || isAdmin ? [{ value: "phc", label: "By PHC" }] : []
            ],
            ariaLabel: "Group by"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          SegmentedControl,
          {
            value: state.view,
            onValue: (view) => patch({ view }),
            options: [
              { value: "bars", label: "Bars + table" },
              { value: "heat", label: "Heatmap" },
              { value: "size", label: "Size & share" }
            ],
            ariaLabel: "View"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          SegmentedControl,
          {
            value: state.mode,
            onValue: (mode) => patch({ mode }),
            options: [
              { value: "count", label: "Count" },
              { value: "share", label: "Share %" }
            ],
            ariaLabel: "Bar length"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", className: "gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDownNarrowWide, { className: "size-3.5" }),
            SORT_LABELS[state.sort]
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuLabel, { children: "Sort rows" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              DropdownMenuRadioGroup,
              {
                value: state.sort,
                onValueChange: (v) => patch({ sort: v }),
                children: Object.entries(SORT_LABELS).map(
                  ([id, label]) => /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuRadioItem, { value: id, children: label }, id)
                )
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          SegmentedControl,
          {
            value: state.denom,
            onValue: (denom) => patch({ denom }),
            options: [
              { value: "all", label: "÷ all" },
              { value: "eligible", label: "÷ eligible" }
            ],
            ariaLabel: "Rate denominator"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", className: "gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "size-3.5", "aria-hidden": true }),
            " Export"
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onSelect: () => void exportBreakdown(bd, "xlsx", "progress-breakdown"), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "size-3.5" }),
              " Excel"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onSelect: () => void exportBreakdown(bd, "pdf", "progress-breakdown"), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-3.5" }),
              " PDF (table + chart)"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              DropdownMenuItem,
              {
                disabled: pngBusy,
                onSelect: () => void exportPng(),
                "data-testid": "png-export",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Image, { className: "size-3.5" }),
                  " PNG of the chart"
                ]
              }
            )
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { children: [
      takeaway && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-3 text-sm text-muted-foreground", "data-testid": "takeaway", children: takeaway }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        BucketLegend,
        {
          breakdown: bd,
          isolated,
          onIsolate: (b) => setIsolated(b === isolated ? null : b)
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: chartRef, className: "@container", "data-testid": "breakdown-chart", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        reactExports.Suspense,
        {
          fallback: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-72 w-full animate-pulse rounded-xl bg-muted/40" }),
          children: state.view === "bars" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            BarTableView,
            {
              bd,
              rows: shown,
              isolated,
              mode: state.mode
            }
          ) : state.view === "heat" ? /* @__PURE__ */ jsxRuntimeExports.jsx(BreakdownHeatmap, { facilities }) : /* @__PURE__ */ jsxRuntimeExports.jsx(SizeShareChart, { breakdown: bd, mode: state.mode })
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pb-20 md:pb-6", "aria-hidden": true })
    ] })
  ] });
}
const DETAIL_COL = "hidden @[900px]:table-cell";
function moveFocusAcrossRowsAndSegments(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const table = e.currentTarget;
  let indexIn = -1;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    const rowLinks = Array.from(
      table.querySelectorAll("[data-row] td:first-child a")
    );
    indexIn = rowLinks.indexOf(document.activeElement);
    const next = e.key === "ArrowDown" ? rowLinks[Math.max(0, indexIn) + 1] ?? rowLinks[0] : rowLinks[Math.max(0, indexIn) - 1] ?? rowLinks[0];
    next?.focus();
    e.preventDefault();
  } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
    const row = document.activeElement?.closest("[data-row]");
    if (!row) return;
    const segments = Array.from(
      row.querySelectorAll("a[aria-label]")
    );
    const i = segments.indexOf(document.activeElement);
    const next = e.key === "ArrowRight" ? segments[Math.max(0, i) + 1] ?? segments[0] : segments[Math.max(0, i) - 1] ?? segments[0];
    next?.focus();
    e.preventDefault();
  }
}
const SORT_LABELS = {
  rateDesc: "Rate high → low",
  rateAsc: "Rate low → high",
  sizeDesc: "Facilities",
  gap: "Gap to average",
  name: "Name"
};
function BarTableView({
  bd,
  rows,
  isolated,
  mode
}) {
  const maxN = Math.max(1, ...rows.map((r) => r.n));
  const present = BUCKET_ORDER.filter(
    (k) => rows.some((r) => r.buckets[k] > 0)
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "table",
    {
      className: "w-full border-collapse text-sm",
      "data-testid": "bar-table",
      onKeyDown: (e) => moveFocusAcrossRowsAndSegments(e),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b text-left text-xs text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "py-2 pr-2 font-medium", children: bd.scopeLabel }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: cn("px-2 py-2 text-right font-medium", DETAIL_COL), children: "Facilities" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: cn("px-2 py-2 text-right font-medium", DETAIL_COL), children: "Quality" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: cn("px-2 py-2 text-right font-medium", DETAIL_COL), children: "Conditional" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-2 py-2 text-right font-medium", children: "Hold a certificate" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-2 py-2 text-right font-medium", children: "Certified %" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(BarCellHead, { isolated, present, mode, bd }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-2 py-2 text-right font-medium", children: "vs average" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
          rows.map((r, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            BarRow,
            {
              r,
              serial: i,
              bd,
              maxN,
              isolated,
              mode,
              hideDetailCols: null
            },
            r.key
          )),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t font-semibold", "data-testid": "grand-row", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-2 pr-2", children: bd.grand.label }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: cn("px-2 py-2 text-right tabular-nums", DETAIL_COL), children: bd.grand.n }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: cn("px-2 py-2 text-right tabular-nums", DETAIL_COL), children: bd.grand.buckets.qualityCertified }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: cn("px-2 py-2 text-right tabular-nums", DETAIL_COL), children: bd.grand.buckets.conditional }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-2 text-right tabular-nums", children: bd.grand.holdCert }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-2 py-2 text-right tabular-nums", children: [
              Math.round(bd.grand.rate),
              "%"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-2" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-2 text-right tabular-nums", children: "■ 0 pts" })
          ] })
        ] })
      ]
    }
  );
}
function BarCellHead({
  bd,
  present,
  mode,
  isolated
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "min-w-48 px-2 py-2 font-medium", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
    "Breakdown",
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        "aria-label": "What does the bar show?",
        "data-tip": (mode === "share" ? "Every bar spans 0–100% of its group; the vertical line marks the scope average." : "Bar width is proportional to group size against the largest group.") + " Segments are " + (present.length ? present.map((k) => BUCKET_BY_KEY[k].label).join(" → ") : "the buckets present") + " in bucket order (" + bd.scopeLabel.toLowerCase() + " rows).",
        className: "inline-flex size-4 items-center justify-center rounded-full text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { className: "size-3", "aria-hidden": true })
      }
    )
  ] }) });
}
function BarRow({
  r,
  serial,
  bd,
  maxN,
  isolated,
  mode,
  hideDetailCols
}) {
  const badge = rowBadgeFor(r, bd.rows, bd.avgPct);
  const avg = bd.avgPct;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b/60", tabIndex: 0, "data-row": r.key, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-2 pr-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex min-w-0 flex-wrap items-center gap-1.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Link,
        {
          to: breakdownListUrl(bd.dimension, r.key, null),
          className: "text-sm font-semibold hover:underline",
          "data-tip": `Open the Master List filtered to this ${bd.scopeLabel.toLowerCase()}`,
          children: r.label
        }
      ),
      r.small && /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, { variant: "outline", className: "border-border text-muted-foreground", children: [
        "Small group (n=",
        r.n,
        ")"
      ] }),
      badge === "best" && !r.small && /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { className: "border-emerald-300 bg-emerald-100 text-emerald-800", children: "★ Best" }),
      badge === "attention" && !r.small && /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { className: "border-rose-300 bg-rose-100 text-rose-800", children: "Needs attention" }),
      r.overlays.recertDue > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, { variant: "outline", className: "border-amber-400/70 text-amber-800", children: [
        "Recert due ",
        r.overlays.recertDue
      ] }),
      r.overlays.surveillanceDue > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, { variant: "outline", className: "border-sky-400/70 text-sky-800", children: [
        "Surveillance due ",
        r.overlays.surveillanceDue
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: cn("px-2 py-2 text-right tabular-nums", DETAIL_COL), children: r.n }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: cn("px-2 py-2 text-right tabular-nums", DETAIL_COL), children: r.buckets.qualityCertified }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: cn("px-2 py-2 text-right tabular-nums", DETAIL_COL), children: r.buckets.conditional }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-2 text-right tabular-nums", children: r.holdCert }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-2 py-2 text-right tabular-nums", children: [
      Math.round(r.rate),
      "%"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "min-w-32 px-2 py-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      StackedBar,
      {
        r,
        dimension: bd.dimension,
        maxN,
        isolated,
        mode,
        avg: mode === "share" ? avg : null,
        ariaLabelPrefix: `${r.label}`
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-2 py-2 text-right tabular-nums", children: [
      r.vsAvgPoints > 0 ? `▲ +${r.vsAvgPoints}` : r.vsAvgPoints < 0 ? `▼ ${r.vsAvgPoints}` : "■ 0",
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: " pts" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { hidden: true, "aria-hidden": true, children: serial })
  ] });
}
function StackedBar({
  r,
  dimension,
  maxN,
  isolated,
  mode,
  avg,
  ariaLabelPrefix
}) {
  const rowFrac = mode === "count" ? r.n / maxN : 1;
  const visible = BUCKET_ORDER.filter(
    (k) => r.buckets[k] > 0 && (isolated === null || k === isolated)
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "relative block h-4 w-full overflow-hidden rounded-full bg-muted/40", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "span",
    {
      className: "absolute inset-y-0 left-0 block overflow-hidden rounded-full",
      style: { width: `${rowFrac * 100}%` },
      children: [
        visible.map((k) => {
          const b = BUCKET_BY_KEY[k];
          const frac = r.buckets[k] / r.n;
          const tip = `${r.buckets[k]} of ${r.n} facilities (${Math.round(frac * 100)}%)`;
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            Link,
            {
              to: breakdownListUrl(dimension, r.key, k),
              preventScrollReset: true,
              "data-tip": `${ariaLabelPrefix} · ${b.label} — ${tip} — click to open the facility list.`,
              "aria-label": `${ariaLabelPrefix}, ${b.label}: ${r.buckets[k]} facilities, ${Math.round(frac * 100)} percent, open list`,
              className: "inline-block h-full cursor-pointer align-top outline-offset-[-2px] focus-visible:outline-2 focus-visible:outline-primary",
              style: { width: `${frac * 100}%`, background: b.colour }
            },
            k
          );
        }),
        avg != null && avg >= 0 && avg <= 100 && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            "aria-hidden": true,
            className: "absolute inset-y-0 z-10 w-0.5 bg-foreground/70",
            style: { left: `${avg}%` }
          }
        )
      ]
    }
  ) });
}
function patternClass(p) {
  return p === "hatch" ? "bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.55)_0,rgba(255,255,255,0.55)_2px,transparent_2px,transparent_5px)]" : p === "dots" ? "bg-[radial-gradient(circle,rgba(255,255,255,0.6)_1px,transparent_1.2px)] bg-[length:6px_6px]" : "";
}
function BucketLegend({
  breakdown: bd,
  isolated,
  onIsolate
}) {
  const present = BUCKET_ORDER.filter((k) => bd.grand.buckets[k] > 0);
  if (present.length === 0) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "mb-3 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-muted-foreground",
      "data-testid": "bucket-legend",
      children: [
        present.map((k) => {
          const b = BUCKET_BY_KEY[k];
          const active = isolated === k;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => onIsolate(active ? null : k),
              "aria-pressed": active,
              "data-tip": `${b.description} Click to isolate this bucket in the chart.`,
              className: cn(
                "flex items-center gap-1.5 rounded-md px-1 py-0.5 transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                active && "bg-muted font-medium text-foreground"
              ),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    className: cn("size-3 rounded", patternClass(b.pattern)),
                    style: { background: b.colour },
                    "aria-hidden": true
                  }
                ),
                b.label,
                " · ",
                bd.grand.buckets[k]
              ]
            },
            k
          );
        }),
        isolated && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: () => onIsolate(null),
            className: "underline underline-offset-2",
            children: "Show all"
          }
        )
      ]
    }
  );
}
function InfoTip$1({ tip }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      type: "button",
      "aria-label": "What does this card show?",
      "data-tip": tip,
      className: "inline-flex size-5 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { className: "size-3.5", "aria-hidden": true })
    }
  );
}
function SegmentedControl({
  value,
  onValue,
  options,
  ariaLabel
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      role: "group",
      "aria-label": ariaLabel,
      className: "flex overflow-hidden rounded-lg border border-border",
      children: options.map((o, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          "aria-pressed": value === o.value,
          onClick: () => onValue(o.value),
          className: cn(
            "px-2.5 py-1.5 text-xs font-medium transition-colors",
            i > 0 && "border-l border-border",
            value === o.value ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted/60"
          ),
          children: o.label
        },
        o.value
      ))
    }
  );
}

const DEFAULT_BREAKDOWN_STATE = {
  dim: "block",
  view: "bars",
  mode: "count",
  sort: "rateDesc",
  denom: "all"
};
const PARAMS = {
  dim: "bdDim",
  view: "bdView",
  mode: "bdMode",
  sort: "bdSort",
  denom: "bdDenom"
};
const SESSION_KEY = "nqas.breakdown.state";
function readSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "{}");
  } catch {
    return {};
  }
}
function writeSession(state) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
  }
}
function resolve(session, params) {
  const s = { ...DEFAULT_BREAKDOWN_STATE, ...session };
  const dim = params.get(PARAMS.dim);
  if (dim === "block" || dim === "type" || dim === "phc") s.dim = dim;
  const view = params.get(PARAMS.view);
  if (view === "bars" || view === "heat" || view === "size") s.view = view;
  const mode = params.get(PARAMS.mode);
  if (mode === "count" || mode === "share") s.mode = mode;
  const sort = params.get(PARAMS.sort);
  if (["rateDesc", "rateAsc", "sizeDesc", "gap", "name"].includes(sort ?? ""))
    s.sort = sort;
  const denom = params.get(PARAMS.denom);
  if (denom === "all" || denom === "eligible") s.denom = denom;
  return s;
}
function deepLinkDimension(hash) {
  if (hash === "#progress-by-block") return "block";
  if (hash === "#facility-type-summary") return "type";
  return null;
}
function useBreakdownUrlState() {
  const [params, setParams] = useSearchParams();
  const [session] = reactExports.useState(() => readSession());
  const state = reactExports.useMemo(() => resolve(session, params), [session, params]);
  const patch = (next) => {
    const merged = { ...state, ...next };
    writeSession(merged);
    const p = new URLSearchParams(params);
    for (const [k, key] of Object.entries(PARAMS)) p.set(key, merged[k]);
    setParams(p, { replace: true, preventScrollReset: true });
  };
  reactExports.useEffect(() => {
    const dim = deepLinkDimension(window.location.hash);
    if (dim && dim !== state.dim) patch({ dim });
  }, []);
  return { state, patch };
}

const FACILITY_CURRENT_STATUS_LABEL = COLUMN_BY_KEY.pipelineStatus.label;
const DASHBOARD_FILTERED_COLUMNS = [
  reportColumn({
    key: "sno",
    label: "S.No",
    type: "index",
    align: "right",
    width: 44,
    exportable: true,
    raw: (_row, index) => index + 1
  }),
  reportColumn({
    key: "facility",
    label: "Facility",
    type: "text",
    align: "left",
    width: 190,
    exportable: true,
    raw: (r) => r.facility.name
  }),
  reportColumn({
    key: "type",
    label: "Type",
    type: "text",
    align: "left",
    width: 84,
    exportable: true,
    raw: (r) => r.facility.facilityType
  }),
  reportColumn({
    key: "block",
    label: "Block",
    type: "text",
    align: "left",
    width: 104,
    exportable: true,
    raw: (r) => r.facility.block
  }),
  reportColumn({
    key: "phc",
    label: "PHC",
    type: "text",
    align: "left",
    width: 110,
    exportable: true,
    raw: (r) => r.facility.phc
  }),
  reportColumn({
    key: "currentStatus",
    label: FACILITY_CURRENT_STATUS_LABEL,
    type: "status",
    align: "center",
    width: 170,
    exportable: true,
    raw: (r) => r.view.currentStatus
  }),
  reportColumn({
    key: "eligibility",
    label: "Eligibility",
    type: "status",
    align: "center",
    width: 120,
    exportable: true,
    raw: (r) => r.facility.eligibility
  }),
  reportColumn({
    key: "saScore",
    label: "SA score %",
    type: "score",
    align: "right",
    width: 76,
    exportable: true,
    raw: (r) => r.sa?.scorePercent
  }),
  reportColumn({
    key: "certScore",
    label: "Certified score %",
    type: "score",
    align: "right",
    width: 92,
    exportable: true,
    raw: (r) => r.nqas?.scorePercent
  }),
  reportColumn({
    key: "validityEnds",
    label: "Validity ends",
    type: "date",
    align: "center",
    width: 96,
    exportable: true,
    raw: (r) => r.nqas?.validityDate
  }),
  reportColumn({
    key: "docStatus",
    label: "Documents status",
    type: "status",
    align: "center",
    width: 160,
    exportable: true,
    raw: (r) => r.view.docStage
  })
];
function buildProgressHeaders(scopeLabel) {
  return [
    "S.No",
    scopeLabel,
    "Total facilities",
    "Certified",
    "Conditional",
    "Certified %",
    "In progress",
    "Recert due",
    "Deferred",
    "Not started"
  ];
}
function buildProgressRows(blocks) {
  return blocks.map((b, i) => {
    const done = (b.certified ?? 0) + (b.conditional ?? 0);
    return [
      i + 1,
      b.name,
      b.total,
      b.certified ?? 0,
      b.conditional ?? 0,
      b.total > 0 ? Math.round(done / b.total * 100) : 0,
      b.inProgress ?? 0,
      b.dueSoon ?? 0,
      b.deferred ?? 0,
      b.notStarted ?? 0
    ];
  });
}
const ELIGIBLE_PENDING_HEADERS = [
  "S.No",
  "Facility",
  "Type",
  "Block",
  "PHC",
  "Current Status",
  "SaQsham Documents Status"
];
function buildEligiblePendingRows(items) {
  return items.map((e, i) => [
    i + 1,
    e.name,
    e.facilityType ?? "—",
    e.block,
    e.phc,
    e.status,
    e.docStatus ?? "—"
  ]);
}
const CONDITIONALITY_HEADERS = [
  "S.No",
  "Facility",
  "Type",
  "Block",
  "PHC",
  "Certification date",
  "Certified Score %",
  "Validity ends"
];
function buildConditionalityRows(items) {
  return items.map((e, i) => [
    i + 1,
    e.name,
    e.facilityType ?? "—",
    e.block,
    e.phc,
    e.certDate ? formatReportDate(e.certDate) : "—",
    e.scorePercent != null ? e.scorePercent : "—",
    e.validityDate ? formatReportDate(e.validityDate) : "—"
  ]);
}
const RESULT_AWAITED_HEADERS = [
  "S.No",
  "Facility",
  "Type",
  "Block",
  "PHC",
  "Assessment date",
  "SaQsham documents"
];
function buildResultAwaitedRows(items) {
  return items.map((e, i) => [
    i + 1,
    e.name,
    e.facilityType ?? "—",
    e.block,
    e.phc,
    e.assessmentDate ? formatReportDate(e.assessmentDate) : "—",
    e.docStatus ?? "—"
  ]);
}
const DOC_STATUS_HEADERS = [
  "S.No",
  "Facility",
  "Type",
  "Block",
  "PHC",
  "Documents Status"
];
function buildDocStatusRows(items) {
  return items.map((e, i) => [
    i + 1,
    e.name,
    e.facilityType ?? "—",
    e.block,
    e.phc,
    e.docStatus
  ]);
}
const SCHEDULED_HEADERS = [
  "S.No",
  "Facility",
  "Type",
  "Block",
  "Assessment",
  "Scheduled date",
  "Due",
  "SA score",
  "NQAS recent score"
];
const RECERT_HEADERS = [
  "S.No",
  "Facility",
  "Type",
  "Block",
  "Recertification Due date",
  "Due",
  "SA score",
  "NQAS recent score"
];
function buildScheduledRows(scheduled, includeKind, humanOverdue) {
  return scheduled.map(({ r, date, kind, days }, i) => [
    i + 1,
    r.facility.name,
    r.facility.facilityType ?? "—",
    r.facility.block,
    ...includeKind ? [kind] : [],
    date ? formatReportDate(date) : "Not set",
    days == null ? "Date not set" : days < 0 ? `Overdue ${humanOverdue(Math.abs(days))}` : days === 0 ? "Today" : `in ${days}d`,
    r.sa?.scorePercent != null ? `${r.sa.scorePercent}%` : "—",
    r.nqas?.scorePercent != null ? `${r.nqas.scorePercent}%` : "—"
  ]);
}
const facilitySample = (i) => ({
  facility: {
    name: `Facility ${i + 1}`,
    facilityType: "HWC HSC",
    block: "Alangayam",
    phc: "Alangayam",
    eligibility: "Eligible"
  },
  sa: { scorePercent: 84 },
  nqas: { scorePercent: 84.67, validityDate: "2027-07-20" },
  view: { currentStatus: "Recertification Due", docStage: "Docx in SQAU login" }
});
[
  {
    name: "Filtered facility list (Dashboard summary — current filter)",
    // Generated from the ONE column model — header and rows both map over
    // DASHBOARD_FILTERED_COLUMNS, so they are the same length by construction.
    headers: reportHeaders(DASHBOARD_FILTERED_COLUMNS),
    buildRows: (items) => reportRows(DASHBOARD_FILTERED_COLUMNS, items),
    sample: facilitySample
  },
  {
    name: "Progress by block / PHC",
    headers: buildProgressHeaders("Block"),
    buildRows: (items) => buildProgressRows(items),
    sample: (i) => ({
      name: `Block ${i + 1}`,
      total: 12,
      certified: 4,
      conditional: 1,
      inProgress: 3,
      dueSoon: 2,
      deferred: 1,
      notStarted: 1
    })
  },
  {
    name: "Eligible pending",
    headers: ELIGIBLE_PENDING_HEADERS,
    buildRows: (items) => buildEligiblePendingRows(items),
    sample: (i) => ({
      name: `Facility ${i + 1}`,
      block: "Alangayam",
      phc: "Alangayam",
      facilityType: "HWC HSC",
      status: "Recertification Due",
      docStatus: null
    })
  },
  {
    name: "Quality certified with conditionality",
    headers: CONDITIONALITY_HEADERS,
    buildRows: (items) => buildConditionalityRows(items),
    sample: (i) => ({
      name: `Facility ${i + 1}`,
      block: "Alangayam",
      phc: "Alangayam",
      facilityType: "HWC HSC",
      certDate: "2026-10-16",
      validityDate: "2027-07-20",
      scorePercent: 84
    })
  },
  {
    name: "Result awaited",
    headers: RESULT_AWAITED_HEADERS,
    buildRows: (items) => buildResultAwaitedRows(items),
    sample: (i) => ({
      name: `Facility ${i + 1}`,
      block: "Alangayam",
      phc: "Alangayam",
      facilityType: "HWC HSC",
      assessmentDate: "2026-09-01",
      docStatus: "Docx forwarded to NHSRC"
    })
  },
  {
    name: "Documents status",
    headers: DOC_STATUS_HEADERS,
    buildRows: (items) => buildDocStatusRows(items),
    sample: (i) => ({
      name: `Facility ${i + 1}`,
      block: "Alangayam",
      phc: "Alangayam",
      facilityType: "HWC HSC",
      docStatus: "Docx in SQAU login"
    })
  },
  {
    name: "Scheduled assessments",
    headers: SCHEDULED_HEADERS,
    buildRows: (items) => buildScheduledRows(items, true, (d) => `${d}d`),
    sample: (i) => ({
      r: {
        facility: { name: `Facility ${i + 1}`, block: "Alangayam", facilityType: "HWC HSC" },
        sa: { scorePercent: 84 },
        nqas: { scorePercent: 84.67 }
      },
      date: "2026-11-01",
      kind: "NQAS Assessment",
      days: 4
    })
  },
  {
    name: "Recertification due",
    headers: RECERT_HEADERS,
    buildRows: (items) => buildScheduledRows(items, false, (d) => `${d}d`),
    sample: (i) => ({
      r: {
        facility: { name: `Facility ${i + 1}`, block: "Alangayam", facilityType: "HWC HSC" },
        sa: { scorePercent: 84 },
        nqas: { scorePercent: 84.67 }
      },
      date: null,
      kind: "Recertification",
      days: null
    })
  }
];

const DASHBOARD_SECTION_IDS = [
  "kpi",
  "overview",
  "pipeline",
  "progress",
  // "typewise" merged into the "progress" Progress-breakdown card (deep
  // links #facility-type-summary still land there). Kept out of the reorder
  // list; a saved layout that still carries it is simply ignored.
  "scheduled",
  "recert",
  "conditionality",
  "resultAwaited",
  "statusWhatNext",
  "documents",
  "eligiblePending",
  "alerts"
];
const DASHBOARD_SECTION_LABELS = {
  kpi: "Key indicators",
  overview: "Overview",
  pipeline: "Facility current status",
  progress: "Progress breakdown",
  scheduled: "Scheduled facility details",
  recert: "Recertification due",
  conditionality: "Certified with conditionality",
  resultAwaited: "Result awaited",
  statusWhatNext: "Status & next steps",
  documents: "Documents status",
  eligiblePending: "Eligible pending",
  alerts: "Action alerts"
};
const DEFAULT_SECTION_STYLE = {
  widthPct: 100,
  heightPx: 0,
  collapsed: false
};
const STORAGE_KEY = "nqas.dashboard.layout.v2";
const DEFAULT_LAYOUT = {
  order: [...DASHBOARD_SECTION_IDS],
  styles: {}
};
function normalizeOrder(order) {
  const valid = new Set(DASHBOARD_SECTION_IDS);
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  if (Array.isArray(order)) {
    for (const id of order) {
      if (typeof id === "string" && valid.has(id) && !seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
  }
  for (const id of DASHBOARD_SECTION_IDS) if (!seen.has(id)) out.push(id);
  return out;
}
function loadLayout() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw);
    return {
      order: normalizeOrder(parsed.order),
      styles: parsed.styles ?? {}
    };
  } catch {
    return DEFAULT_LAYOUT;
  }
}
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
function useDashboardLayout() {
  const [layout, setLayout] = reactExports.useState(loadLayout);
  reactExports.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch {
    }
  }, [layout]);
  return reactExports.useMemo(() => {
    const { order, styles } = layout;
    const reorder = (from, to) => {
      setLayout((l) => {
        if (from === to) return l;
        const next = [...l.order];
        const fi = next.indexOf(from);
        const ti = next.indexOf(to);
        if (fi < 0 || ti < 0) return l;
        const [moved] = next.splice(fi, 1);
        next.splice(ti, 0, moved);
        return { ...l, order: next };
      });
    };
    const setStyle = (id, patch) => {
      setLayout((l) => ({
        ...l,
        styles: {
          ...l.styles,
          [id]: { ...DEFAULT_SECTION_STYLE, ...l.styles[id], ...patch }
        }
      }));
    };
    const reset = () => setLayout(DEFAULT_LAYOUT);
    const isCustomized = order.some((id, i) => id !== DASHBOARD_SECTION_IDS[i]) || DASHBOARD_SECTION_IDS.some((id) => styles[id] != null);
    return { order, styles, reorder, setStyle, reset, isCustomized };
  }, [layout]);
}
const DashboardLayoutContext = reactExports.createContext(null);
function DashboardSectionsProvider({
  controls,
  value,
  children
}) {
  const [draggingId, setDraggingId] = reactExports.useState(null);
  const [dragOverId, setDragOverId] = reactExports.useState(null);
  const beginDrag = reactExports.useCallback((id) => setDraggingId(id), []);
  const updateDragOver = reactExports.useCallback((id) => setDragOverId(id), []);
  const endDrag = reactExports.useCallback(
    (dropOnId) => {
      setDraggingId((dragId) => {
        if (dragId && dropOnId && dropOnId !== dragId) {
          value.reorder(dragId, dropOnId);
        }
        return null;
      });
      setDragOverId(null);
      document.body.style.userSelect = "";
    },
    [value]
  );
  const ctx = reactExports.useMemo(
    () => ({
      ...value,
      controls,
      draggingId,
      dragOverId,
      beginDrag,
      updateDragOver,
      endDrag
    }),
    [value, controls, draggingId, dragOverId, beginDrag, updateDragOver, endDrag]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(DashboardLayoutContext.Provider, { value: ctx, children: [
    controls && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-primary/40 px-3 py-2 text-xs", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(GripVertical, { className: "size-3.5 text-primary" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-foreground", children: "Rearrange mode" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "Drag a section by its handle to reorder it, drag its right edge to change width and its bottom edge to change height." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          variant: "outline",
          size: "sm",
          className: "ml-auto h-7 gap-1.5 px-2 text-xs",
          disabled: !value.isCustomized,
          onClick: value.reset,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { className: "size-3.5" }),
            "Reset layout"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col", children })
  ] });
}
function hasRenderableContent(node) {
  if (node === null || node === void 0 || typeof node === "boolean") {
    return false;
  }
  if (Array.isArray(node)) return node.some(hasRenderableContent);
  if (typeof node === "string") return node.trim().length > 0;
  return true;
}
function DashboardSection({
  id,
  children
}) {
  const ctx = reactExports.useContext(DashboardLayoutContext);
  const wrapRef = reactExports.useRef(null);
  const style = {
    ...DEFAULT_SECTION_STYLE,
    ...ctx?.styles[id]
  };
  const order = ctx?.order.indexOf(id) ?? -1;
  const controls = ctx?.controls ?? false;
  const dragging = ctx?.draggingId === id;
  const dropTarget = ctx?.dragOverId === id && !dragging;
  const startDrag = reactExports.useCallback(
    (e) => {
      if (!ctx || !ctx.controls) return;
      e.preventDefault();
      ctx.beginDrag(id);
      document.body.style.userSelect = "none";
      const onMove = (ev) => {
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        const target = el?.closest("[data-section-id]");
        ctx.updateDragOver(target?.dataset.sectionId ?? null);
      };
      const onUp = (ev) => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        const target = el?.closest("[data-section-id]");
        ctx.endDrag(target?.dataset.sectionId ?? null);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [ctx, id]
  );
  const startWidthDrag = reactExports.useCallback(
    (e) => {
      if (!ctx) return;
      e.preventDefault();
      const container = wrapRef.current?.parentElement;
      const containerW = container?.clientWidth ?? 1;
      const startX = e.clientX;
      const startW = style.widthPct;
      document.body.style.userSelect = "none";
      const onMove = (ev) => {
        const dx = ev.clientX - startX;
        const next = clamp(startW + dx / containerW * 100, 45, 100);
        ctx.setStyle(id, { widthPct: Math.round(next) });
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        document.body.style.userSelect = "";
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [ctx, id, style.widthPct]
  );
  const startHeightDrag = reactExports.useCallback(
    (e) => {
      if (!ctx) return;
      e.preventDefault();
      const startY = e.clientY;
      const startH = style.heightPx > 0 ? style.heightPx : 420;
      document.body.style.userSelect = "none";
      const onMove = (ev) => {
        const dy = ev.clientY - startY;
        ctx.setStyle(id, { heightPx: Math.round(clamp(startH + dy, 140, 1400)) });
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        document.body.style.userSelect = "";
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [ctx, id, style.heightPx]
  );
  if (!ctx || !hasRenderableContent(children)) return null;
  if (!controls) return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children });
  const narrowed = style.widthPct < 100;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      ref: wrapRef,
      "data-section-id": id,
      style: { order },
      className: cn(
        "relative mb-6 rounded-2xl transition-all",
        narrowed && "mx-auto",
        dragging && "z-50 opacity-70 ring-2 ring-primary",
        dropTarget && "ring-2 ring-primary/70 ring-offset-4 ring-offset-background"
      ),
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: narrowed ? { width: `${style.widthPct}%` } : void 0, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-1.5 flex items-center gap-1.5 rounded-lg border border-dashed border-border/60 bg-muted/40 px-2 py-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              "data-tip": "Drag to reorder this section",
              "aria-label": `Drag ${DASHBOARD_SECTION_LABELS[id]} to reorder`,
              onPointerDown: startDrag,
              className: "cursor-grab touch-none rounded-md p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground active:cursor-grabbing",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(GripVertical, { className: "size-4" })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] font-semibold tracking-wide text-muted-foreground uppercase", children: DASHBOARD_SECTION_LABELS[id] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-auto flex items-center gap-0.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              MiniBtn,
              {
                icon: Columns3,
                label: narrowed ? "Full width" : "Narrow width",
                active: narrowed,
                onClick: () => ctx.setStyle(id, { widthPct: narrowed ? 100 : 70 })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              MiniBtn,
              {
                icon: Ruler,
                label: style.heightPx > 0 ? "Auto height" : "Fixed height",
                active: style.heightPx > 0,
                onClick: () => ctx.setStyle(id, { heightPx: style.heightPx > 0 ? 0 : 320 })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              MiniBtn,
              {
                icon: style.collapsed ? ChevronRight : ChevronDown,
                label: style.collapsed ? "Expand section" : "Collapse section",
                active: style.collapsed,
                onClick: () => ctx.setStyle(id, { collapsed: !style.collapsed })
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: cn(
              style.collapsed && "hidden",
              style.heightPx > 0 && "overflow-y-auto"
            ),
            style: style.heightPx > 0 ? { maxHeight: style.heightPx } : void 0,
            children
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            onPointerDown: startWidthDrag,
            "data-tip": "Drag to change section width",
            className: "absolute top-10 bottom-3 -right-2 z-20 w-2 cursor-ew-resize touch-none rounded-full bg-transparent transition-colors hover:bg-primary/30"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            onPointerDown: startHeightDrag,
            "data-tip": "Drag to change section height",
            className: "absolute right-4 bottom-0 left-4 z-20 h-2 cursor-ns-resize touch-none rounded-full bg-transparent transition-colors hover:bg-primary/30"
          }
        )
      ] })
    }
  );
}
function MiniBtn({
  icon: Icon,
  label,
  active,
  onClick
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      type: "button",
      "data-tip": label,
      "aria-label": label,
      onClick,
      className: cn(
        "rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        active && "bg-primary/10 text-primary"
      ),
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "size-3.5" })
    }
  );
}

const DAY_MS = 864e5;
function toSaLike(sa) {
  if (!sa) return null;
  return {
    status: sa.status ?? "Not Yet Initiated",
    scheduledDate: sa.scheduledDate ?? void 0,
    actualStartDate: sa.actualStartDate ?? void 0,
    actualEndDate: sa.actualEndDate ?? void 0,
    scorePercent: sa.scorePercent ?? void 0,
    generalDocStatus: sa.generalDocStatus
  };
}
function toNqasLike(n) {
  if (!n) return null;
  return {
    status: n.status ?? "Pending",
    scheduledStartDate: n.scheduledStartDate ?? void 0,
    scheduledEndDate: n.scheduledEndDate ?? void 0,
    actualEndDate: n.actualEndDate ?? void 0,
    certificationStatus: n.certificationStatus ?? void 0,
    certificationDate: n.certificationDate ?? void 0,
    goiLetterDate: n.goiLetterDate ?? void 0,
    validityDate: n.validityDate ?? void 0
  };
}
const daysTo = (iso, today) => Math.round(
  (Date.parse(iso + "T12:00:00") - Date.parse(today + "T12:00:00")) / DAY_MS
);
function weekdayDate(iso) {
  const d = /* @__PURE__ */ new Date(`${iso}T12:00:00+05:30`);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (Number.isNaN(d.getTime())) return toDisplayDate(iso);
  return `${days[d.getUTCDay()]} ${String(d.getUTCDate()).padStart(2, "0")}-${months[d.getUTCMonth()]}-${d.getUTCFullYear()}`;
}
function humanOverdue(days) {
  if (days <= 0) return "Today";
  const y = Math.floor(days / 365);
  const rem = days - y * 365;
  const m = Math.floor(rem / 30);
  if (y > 0) return m > 0 ? `${y}y ${m}m` : `${y}y`;
  if (m >= 2) return `${m}m`;
  if (m === 1) return `1m ${rem - 30}d`;
  return `${days}d`;
}
const TONE_BG = {
  green: "oklch(0.62 0.15 165)",
  amber: "oklch(0.78 0.14 85)",
  red: "oklch(0.6 0.2 25)",
  blue: "oklch(0.58 0.14 250)",
  slate: "oklch(0.62 0.03 260)",
  violet: "oklch(0.58 0.14 300)"
};
function statusToneOf(status) {
  if (status.startsWith("Certified —")) return "green";
  if (status.includes("Conditionality")) return "amber";
  if (status === "Recertification Due") return "amber";
  if (status.startsWith("Deferred")) return "red";
  if (status.startsWith("SA Scheduled") || status.startsWith("NA Scheduled") || status.startsWith("NQAS") || status.startsWith("SA Completed"))
    return "blue";
  if (status === "Facility (Future Candidate)" || status === "Possible (future candidate)")
    return "violet";
  return "slate";
}
function fyOf(iso) {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  return m >= 4 ? y : y - 1;
}
function stageIndex(stage) {
  const path = PIPELINE_STAGES.filter((s) => s.key !== "notEligible");
  return path.findIndex((s) => s.key === stage);
}
function OverviewTile({
  label,
  tip,
  value,
  sub,
  icon,
  tone,
  onClick,
  index = 0
}) {
  const Comp = onClick ? motion.button : motion.div;
  const clickProps = onClick ? { type: "button", onClick } : {};
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Comp,
    {
      ...clickProps,
      initial: { opacity: 0, y: 8 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.25, delay: Math.min(index * 0.04, 0.2) },
      className: cn(
        "glass flex min-h-24 min-w-0 flex-col rounded-2xl p-4 text-left shadow-sm transition-shadow hover:shadow",
        onClick && "hover:shadow-lg hover:shadow-teal-950/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      ),
      "aria-label": typeof value === "number" ? `${label}: ${value}` : label,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground", children: [
          icon,
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 truncate", "data-tip": label, "data-tip-truncate": true, children: label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTip, { tip })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("mt-1 text-2xl font-bold tabular-nums", tone), children: value }),
        sub && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-0.5 text-[11px] text-muted-foreground", children: sub })
      ]
    }
  );
}
function useCountUp(value, duration = 600) {
  const [n, setN] = reactExports.useState(value);
  const ref = reactExports.useRef(value);
  reactExports.useEffect(() => {
    if (ref.current === value) return;
    const from = ref.current;
    const start = performance.now();
    let raf = 0;
    const tick = (t) => {
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
function PctRing({
  pct,
  size = 48,
  stroke = 5,
  color = "oklch(0.62 0.15 165)"
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const w = Math.max(0, Math.min(100, pct)) * (c / 100);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: size, height: size, viewBox: `0 0 ${size} ${size}`, "aria-hidden": true, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "circle",
      {
        cx: size / 2,
        cy: size / 2,
        r,
        fill: "none",
        stroke: "oklch(0.62 0.03 260 / 0.18)",
        strokeWidth: stroke
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "circle",
      {
        cx: size / 2,
        cy: size / 2,
        r,
        fill: "none",
        stroke: color,
        strokeWidth: stroke,
        strokeLinecap: "round",
        strokeDasharray: `${w} ${c}`,
        style: { transition: "stroke-dasharray 700ms ease" },
        transform: `rotate(-90 ${size / 2} ${size / 2})`
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "text",
      {
        x: "50%",
        y: "54%",
        textAnchor: "middle",
        dominantBaseline: "middle",
        fontSize: size * 0.26,
        fontWeight: 700,
        fill: "currentColor",
        children: [
          pct,
          "%"
        ]
      }
    )
  ] });
}
function InfoTip({ tip }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      type: "button",
      "aria-label": "What does this number mean?",
      "data-tip": tip,
      className: "inline-flex size-5 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { className: "size-3.5", "aria-hidden": true })
    }
  );
}
const dateStamp = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
function exportDashboardProgress(blocks, scopeLabel, fmt) {
  const headers = buildProgressHeaders(scopeLabel);
  const rows = buildProgressRows(blocks);
  const title = isBlockScopedLabel(scopeLabel) ? "PHC-wise progress report" : "Progress by block";
  if (fmt === "xlsx") {
    exportExcel(
      `dashboard-block-progress-${dateStamp()}.xlsx`,
      title.slice(0, 31),
      headers,
      rows
    );
  } else {
    exportPdf(
      `dashboard-block-progress-${dateStamp()}.pdf`,
      title,
      headers,
      rows,
      `${blocks.length} ${scopeLabel.toLowerCase()} · generated ${dateStamp()}`
    );
  }
}
function isBlockScopedLabel(label) {
  return label.trim().toLowerCase() === "phc";
}
const filteredReportHeaders = () => reportHeaders(DASHBOARD_FILTERED_COLUMNS);
const filteredReportRows = (rows) => reportRows(DASHBOARD_FILTERED_COLUMNS, rows);
const filteredReportPdfOptions = () => ({
  columnWidths: reportColumnWidths(DASHBOARD_FILTERED_COLUMNS),
  columnAligns: reportColumnAligns(DASHBOARD_FILTERED_COLUMNS)
});
function exportEligiblePending(items, fmt) {
  const rows = buildEligiblePendingRows(items);
  const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  if (fmt === "xlsx")
    exportExcel(
      `eligible-pending-${stamp}.xlsx`,
      "Eligible Pending",
      ELIGIBLE_PENDING_HEADERS,
      rows
    );
  else
    exportPdf(
      `eligible-pending-${stamp}.pdf`,
      "Eligible Pending Facilities",
      ELIGIBLE_PENDING_HEADERS,
      rows,
      `NQAS-eligible facilities that have not begun certification — ${items.length} facilities · generated ${stamp}`
    );
}
function exportConditionalityList(items, fmt) {
  const rows = buildConditionalityRows(items);
  const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  if (fmt === "xlsx")
    exportExcel(
      `quality-certified-with-conditionality-${stamp}.xlsx`,
      "Quality Certified with Conditionality",
      CONDITIONALITY_HEADERS,
      rows
    );
  else
    exportPdf(
      `quality-certified-with-conditionality-${stamp}.pdf`,
      "Quality Certified with Conditionality — Facility List",
      CONDITIONALITY_HEADERS,
      rows,
      `Facilities holding a conditional certification — ${items.length} facilities · generated ${stamp}`
    );
}
function exportResultAwaitedList(items, fmt) {
  const rows = buildResultAwaitedRows(items);
  const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  if (fmt === "xlsx")
    exportExcel(
      `result-awaited-facilities-${stamp}.xlsx`,
      "Result Awaited Facilities",
      RESULT_AWAITED_HEADERS,
      rows
    );
  else
    exportPdf(
      `result-awaited-facilities-${stamp}.pdf`,
      "Result Awaited Facilities",
      RESULT_AWAITED_HEADERS,
      rows,
      `Assessment done — result not yet declared — ${items.length} facilities · generated ${stamp}`
    );
}
function exportDocStatusList(items, fmt) {
  const rows = buildDocStatusRows(items);
  const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  if (fmt === "xlsx")
    exportExcel(
      `documents-status-${stamp}.xlsx`,
      "Documents Status",
      DOC_STATUS_HEADERS,
      rows
    );
  else
    exportPdf(
      `documents-status-${stamp}.pdf`,
      "SaQsham Documents Status List",
      DOC_STATUS_HEADERS,
      rows,
      `Facilities by document pipeline stage — ${items.length} facilities · generated ${stamp}`
    );
}
const buildScheduledExportRows = (scheduled, includeKind = true) => buildScheduledRows(scheduled, includeKind, humanOverdue);
function splitScheduledLists(data) {
  if (!data) return { scheduled: [], recert: [] };
  const todayIso = todayLocalIso();
  const today = (/* @__PURE__ */ new Date(todayIso + "T12:00:00")).getTime();
  const all = data.rows.map((r) => {
    const nqasDate = r.nqas?.scheduledStartDate ?? null;
    const nqasEnd = r.nqas?.scheduledEndDate ?? nqasDate;
    const saDate = r.sa?.scheduledDate ?? null;
    const nqasOpen = !r.nqas?.certificationStatus && !r.nqas?.actualEndDate && (r.nqas == null || r.nqas.status !== "Completed");
    const nqasStatusScheduled = r.nqas?.status === "Scheduled" || r.sa?.generalDocStatus === "NA Scheduled" || r.facility.currentStatus === "NA Scheduled";
    const nqasSpansToday = !!nqasDate && nqasDate < todayIso && !!nqasEnd && nqasEnd >= todayIso;
    const nqasSaysScheduled = isTodayOrFuture(nqasDate) || nqasSpansToday || !nqasDate && nqasStatusScheduled;
    let date = null;
    let endDate = nqasEnd;
    let kind = null;
    if (nqasOpen && nqasSaysScheduled) {
      date = nqasDate;
      endDate = nqasEnd;
      kind = "NQAS Assessment";
    } else if (r.nqas?.certificationStatus && r.nqas?.validityDate) {
      const daysLeft = Math.round(
        ((/* @__PURE__ */ new Date(r.nqas.validityDate + "T12:00:00")).getTime() - today) / 864e5
      );
      if (daysLeft <= 90) {
        return {
          r,
          date: r.nqas.validityDate,
          endDate: null,
          kind: "Recertification",
          days: daysLeft
        };
      }
    } else if (r.nqas?.certificationStatus === "Deferred") {
      return { r, date: null, endDate: null, kind: "Recertification", days: null };
    }
    if (!kind && r.sa != null && r.sa.status !== "Completed") {
      const saSaysScheduled = r.facility.currentStatus === "SA Scheduled";
      if (isTodayOrFuture(saDate) || !saDate && saSaysScheduled) {
        date = saDate;
        endDate = saDate;
        kind = "State Assessment";
      }
    }
    if (!kind) return null;
    const isToday = date === todayIso || kind === "NQAS Assessment" && nqasOpen && nqasSpansToday;
    const days = isToday ? 0 : date ? Math.round(
      ((/* @__PURE__ */ new Date(date + "T12:00:00")).getTime() - today) / 864e5
    ) : null;
    return { r, date, endDate, kind, days };
  }).filter((x) => x !== null);
  const byDays = (a, b) => (a.days ?? 99999) - (b.days ?? 99999);
  for (const r of data.rows) {
    for (const [due, done, label] of [
      [r.nqas?.surveillanceDue1, r.nqas?.surveillanceDone1, "Surveillance 1"],
      [r.nqas?.surveillanceDue2, r.nqas?.surveillanceDone2, "Surveillance 2"]
    ]) {
      if (!due || done) continue;
      all.push({
        r,
        date: due,
        endDate: due,
        kind: label,
        days: Math.round(((/* @__PURE__ */ new Date(due + "T12:00:00")).getTime() - today) / 864e5)
      });
    }
  }
  const scheduled = all.filter((x) => x.kind !== "Recertification").sort(byDays);
  const recert = all.filter((x) => x.kind === "Recertification").sort(byDays);
  return { scheduled, recert };
}
const MODULE_HINTS = {
  "Quality Certified": "Validity runs for 1 year — schedule the first-year surveillance visit before it ends.",
  "Quality Certified with Conditionality": "Close the conditional gaps and book recertification before the 1-year validity ends.",
  "Result Awaited": "Follow up with the assessment team — the result sheet decides the next status.",
  Deferred: "Cooling period in progress — reattempt NQAS once the facility is ready.",
  "Not Recorded": "Upload the NQAS result or record the certification status for these facilities.",
  Scheduled: "Assessment start date is today or upcoming — brief the facility and the team.",
  Completed: "Assessment done — verify the score, record the end date and move to the next step.",
  Pending: "Set an NQAS Assessment Start date so the facility shows as NA Scheduled.",
  "Not Started": "Complete the State Assessment and document pipeline to open the NQAS step.",
  "Not Yet Initiated": "Schedule the State Assessment to begin the cycle.",
  "Scheduled — visit the facility page to reschedule": "Assessment is on the calendar — confirm assessors and documents.",
  Dilapidated: "Flag the building for repair or condemnation follow-up with the PWD.",
  "Needs Repair": "Raise the repair request and record the gap-closure fund entry.",
  "Under Renovation": "Track renovation progress and update the status on completion.",
  Good: "No building action needed — keep the record current at each visit.",
  Expired: "Renew the Fire NOC immediately — validity has already ended.",
  "Expiring Soon": "Renewal window is open — file the renewal before the validity ends.",
  Valid: "NOC is current — recheck after the next validity milestone.",
  "Not Obtained": "Apply for the Fire NOC and record the validity once issued."
};
function hintFor(status) {
  return MODULE_HINTS[status] ?? nextStepHint(status) ?? "";
}
function Dashboard() {
  const data = useQuery(api.ops.getDashboardV2, {});
  const cycleScope = useCycleScope();
  useSetCycleScope();
  const fast = useQuery(api.ops.listFacilityRowsFast, { cycle: cycleScope });
  const navigate = useNavigate();
  const sectionLayout = useDashboardLayout();
  const [blockFilter, setBlockFilter] = reactExports.useState([]);
  const [typeFilter, setTypeFilter] = reactExports.useState([]);
  const [statusFilter, setStatusFilter] = reactExports.useState([]);
  const [barKeys, setBarKeys] = reactExports.useState(["block", "type", "status"]);
  const [alertsOpen, setAlertsOpen] = reactExports.useState(false);
  const [stageOpen, setStageOpen] = reactExports.useState(null);
  const [moduleKey, setModuleKey] = reactExports.useState("all");
  const [fabOpen, setFabOpen] = reactExports.useState(false);
  const settings = reactExports.useMemo(
    () => ({
      ...DEFAULT_SETTINGS,
      ...data?.settings ?? {}
    }),
    [data]
  );
  const today = todayLocalIso();
  const fyStart = currentFiscalYear(today);
  const currentFyLabel = fiscalYearLabel(fyStart);
  const previousFyLabel = fiscalYearLabel(fyStart - 1);
  const isBlockScopedForHeader = (data?.role ?? "viewer") === "entry" && !!data?.myBlockNames?.length;
  const flagged = reactExports.useMemo(() => {
    if (!fast) return [];
    return fast.rows.map((r) => {
      const facility = { ...r.facility, eligibility: r.facility.eligibility ?? "" };
      const view = deriveLifecycleView(
        facility,
        toSaLike(r.sa),
        toNqasLike(r.nqas),
        settings,
        today
      );
      return { ...r, view };
    });
  }, [fast, settings, today]);
  const blockOptions = reactExports.useMemo(
    () => fast ? fast.blocks.map((b) => b.name).sort() : [],
    [fast]
  );
  const typeOptions = reactExports.useMemo(
    () => [...new Set(flagged.map((f) => f.facility.facilityType))].filter(Boolean).sort(),
    [flagged]
  );
  const statusOptions = reactExports.useMemo(() => {
    const counts = /* @__PURE__ */ new Map();
    for (const f of flagged) {
      counts.set(f.view.currentStatus, (counts.get(f.view.currentStatus) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([status]) => status);
  }, [flagged]);
  const matchesGlobal = (f) => multiFilterMatches(f.facility.block, blockFilter) && multiFilterMatches(f.facility.facilityType, typeFilter) && multiFilterMatches(f.view.currentStatus, statusFilter);
  const filtered = reactExports.useMemo(() => flagged.filter(matchesGlobal), [flagged, blockFilter, typeFilter, statusFilter]);
  const reportFilters = reactExports.useMemo(() => {
    const parts = [];
    if (blockFilter.length) parts.push(`Block = ${blockFilter.join(", ")}`);
    if (typeFilter.length) parts.push(`Type = ${typeFilter.join(", ")}`);
    if (statusFilter.length)
      parts.push(`${FACILITY_CURRENT_STATUS_LABEL} = ${statusFilter.join(", ")}`);
    return parts;
  }, [blockFilter, typeFilter, statusFilter]);
  const filteredReportSubtitle = reactExports.useMemo(
    () => reportSubtitle({
      shown: filtered.length,
      total: flagged.length,
      filters: reportFilters
    }),
    [filtered.length, flagged.length, reportFilters]
  );
  const agg = reactExports.useMemo(() => {
    const rows = filtered;
    const total = rows.length;
    const eligible = rows.filter(
      (f) => (f.facility.eligibility ?? "") === "Eligible"
    ).length;
    const quality = rows.filter((f) => f.view.isQualityCertified).length;
    const cond = rows.filter((f) => f.view.isConditional).length;
    const certified = quality + cond;
    const naScheduled = rows.filter((f) => f.view.nqasScheduled).length;
    const dilapidated = rows.filter(
      (f) => (f.building?.buildingStatus ?? "").includes("Dilapidated")
    ).length;
    const deferred = rows.filter((f) => f.view.isDeferred).length;
    const resultAwaited = rows.filter((f) => f.view.isResultAwaited).length;
    const stageCounts = Object.fromEntries(
      PIPELINE_STAGES.map((s) => [s.key, 0])
    );
    for (const f of rows) stageCounts[f.view.stage] += 1;
    const isBlockScoped = (data?.role ?? "viewer") === "entry" && !!data?.myBlockNames?.length;
    const grouped = /* @__PURE__ */ new Map();
    for (const f of rows) {
      if ((data?.role ?? "viewer") === "entry" && !!data?.myBlockNames?.length && !data.myBlockNames.includes(f.facility.block))
        continue;
      const key = isBlockScoped ? f.facility.phc : f.facility.block;
      const g = grouped.get(key) ?? {
        total: 0,
        certified: 0,
        conditional: 0,
        dueSoon: 0,
        inProgress: 0,
        notStarted: 0,
        deferred: 0
      };
      g.total += 1;
      g[f.view.segment] += 1;
      grouped.set(key, g);
    }
    const blocks = [...grouped.entries()].map(([name, v]) => ({ name, ...v })).sort(
      (a, b) => b.total > 0 && a.total > 0 ? (b.certified + b.conditional) / b.total - (a.certified + a.conditional) / a.total : b.total - a.total
    );
    const lead = settings.recertificationAlertLeadDays ?? 30;
    const alertRows = [];
    for (const f of rows) {
      if (!(f.view.isQualityCertified || f.view.isConditional) || !f.nqas?.validityDate)
        continue;
      const days = daysTo(f.nqas.validityDate, today);
      if (days < 0) alertRows.push({ f, days, kind: "overdue" });
      else if (days <= lead) alertRows.push({ f, days, kind: "due" });
    }
    alertRows.sort(
      (a, b) => a.kind !== b.kind ? a.kind === "overdue" ? -1 : 1 : a.days - b.days
    );
    const { scheduled, recert } = splitScheduledLists({ rows });
    const up = scheduled.filter((x) => x.days == null || x.days >= 0);
    const overdueAssess = scheduled.filter((x) => x.days != null && x.days < 0);
    const docInProgress = new Set(settings.generalDocStatuses.slice(1));
    docInProgress.add("NA Scheduled");
    docInProgress.add("NA Completed & Awaiting Results");
    const recertDue = recert.map((x) => ({ x, days: x.days }));
    const conditionalRows = rows.filter((f) => f.view.isConditional).sort(
      (a, b) => (a.nqas?.validityDate ?? "9").localeCompare(b.nqas?.validityDate ?? "9")
    );
    const resultAwRows = rows.filter((f) => f.view.isResultAwaited).sort(
      (a, b) => a.facility.block.localeCompare(b.facility.block) || a.facility.name.localeCompare(b.facility.name)
    );
    const docRows = rows.filter((f) => f.sa?.generalDocStatus).sort(
      (a, b) => (settings.generalDocStatuses.indexOf(a.sa.generalDocStatus) + 1 || 99) - (settings.generalDocStatuses.indexOf(b.sa.generalDocStatus) + 1 || 99) || a.facility.name.localeCompare(b.facility.name)
    );
    const eligiblePendingRows = rows.filter(
      (f) => (f.facility.eligibility ?? "") === "Eligible" && f.view.currentStatus === "SA Not Yet Initiated" && !(f.sa?.generalDocStatus && docInProgress.has(f.sa.generalDocStatus))
    );
    const distCounts = (key) => {
      const counts = /* @__PURE__ */ new Map();
      for (const f of rows) {
        let status;
        if (key === "all") status = f.view.currentStatus;
        else if (key === "cert")
          status = f.view.certResult ?? (f.view.currentStatus.startsWith("Deferred") ? "Deferred" : "Not Recorded");
        else if (key === "na")
          status = f.view.nqasScheduled ? "Scheduled" : f.nqas?.status === "Completed" || f.view.certResult && f.nqas?.scorePercent != null ? "Completed" : f.nqas?.certificationStatus === "Result Awaited" || f.view.currentStatus === "Result Awaited" ? "Result Awaited" : f.nqas ? "Pending" : "Not Started";
        else if (key === "sa") status = f.sa?.status ?? "No Entry";
        else if (key === "building")
          status = f.building?.buildingStatus || "Not Recorded";
        else status = f.noc ? f.noc.status ?? "Not Obtained" : "Not Obtained";
        counts.set(status, (counts.get(status) ?? 0) + 1);
      }
      return [...counts.entries()].map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);
    };
    const needsAttention = rows.filter((f) => {
      const expiredCert = (f.view.isQualityCertified || f.view.isConditional) && !!f.nqas?.validityDate && f.nqas.validityDate < today;
      const nocExpired = (f.noc?.status ?? "") === "Expired";
      const surveillanceOverdue = !!f.nqas?.surveillanceDue1 && !f.nqas?.surveillanceDone1 && f.nqas.surveillanceDue1 < today;
      const buildingDilapidated = (f.building?.buildingStatus ?? "").includes(
        "Dilapidated"
      );
      return expiredCert || nocExpired || surveillanceOverdue || buildingDilapidated;
    });
    const fyStart2 = currentFiscalYear(today);
    const fyCertRows = rows.filter(
      (f) => (f.view.isQualityCertified || f.view.isConditional) && !!f.nqas?.certificationDate && fyOf(f.nqas.certificationDate) === fyStart2
    );
    const fyPrevRows = rows.filter(
      (f) => (f.view.isQualityCertified || f.view.isConditional) && !!f.nqas?.certificationDate && fyOf(f.nqas.certificationDate) === fyStart2 - 1
    );
    const holdExpiredRows = rows.filter(
      (f) => (f.view.isQualityCertified || f.view.isConditional) && f.view.stage !== "certified"
    );
    const certReconciliation = holdExpiredRows.length === 0 ? null : `${certified} hold a certificate: ${stageCounts.certified} in Certified stage + ${holdExpiredRows.length} in other stage${holdExpiredRows.length === 1 ? "" : "s"} (${holdExpiredRows.slice(0, 6).map((f) => f.facility.name).join(", ")}${holdExpiredRows.length > 6 ? "…" : ""}).`;
    return {
      total,
      eligible,
      quality,
      cond,
      certified,
      naScheduled,
      dilapidated,
      deferred,
      resultAwaited,
      stageCounts,
      blocks,
      isBlockScoped,
      alertRows,
      scheduled,
      recert,
      overdueAssess,
      up,
      recertDue,
      conditionalRows,
      resultAwRows,
      docRows,
      eligiblePendingRows,
      distCounts,
      needsAttention,
      certifiedInCurrentFy: fyCertRows.length,
      certifiedInPreviousFy: fyPrevRows.length,
      certReconciliation,
      certifiedPct: percentOf(certified, total)
    };
  }, [filtered, settings, data, today]);
  const bdFacilities = reactExports.useMemo(
    () => filtered.map((f) => ({
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
      surveillanceDone2: f.nqas?.surveillanceDone2 ?? null
    })),
    [filtered]
  );
  const { state: bdState, patch: setBdState } = useBreakdownUrlState();
  const breakdown = reactExports.useMemo(
    () => buildBreakdown(bdFacilities, {
      dimension: bdState.dim,
      denominator: bdState.denom,
      minGroupSize: MIN_BEST_SIZE,
      today,
      leadDays: settings.recertificationAlertLeadDays ?? 30
    }),
    [bdFacilities, bdState.dim, bdState.denom, settings, today]
  );
  const actionsCount = agg.recertDue.filter((x) => x.days != null && x.days < 0).length + agg.recertDue.filter((x) => x.days != null && x.days >= 0).length + agg.deferred + agg.resultAwRows.length;
  const loading = data === void 0 || fast === void 0;
  const hasFacilities = agg.total > 0 || (fast?.rows.length ?? 0) > 0;
  const pctCertified = agg.eligible > 0 ? Math.round(agg.certified / agg.eligible * 100) : 0;
  const lastUpdatedText = data?.lastUpdated ? toDisplayDateTime(data.lastUpdated) : null;
  const shareText = () => {
    const lines = [
      "🏥 NQAS Tracker — Tirupathur",
      `Total: ${agg.total} facilities · Eligible: ${agg.eligible}`,
      `Certified: ${agg.certified} (${pctCertified}% of eligible)`,
      `Action needed: ${actionsCount} (Recert due ${agg.recertDue.length}, Result awaited ${resultCount}, Deferred ${agg.deferred})`,
      `Sent ${dateStamp()}`
    ];
    return lines.join("\n");
  };
  const resultCount = agg.resultAwRows.length;
  const listsRef = reactExports.useRef(null);
  const [activeTab, setActiveTab] = reactExports.useState("recert");
  const jumpToLists = (tab) => {
    setActiveTab(tab);
    requestAnimationFrame(
      () => listsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  };
  const [searchOpen, setSearchOpen] = reactExports.useState(false);
  const [searchQ, setSearchQ] = reactExports.useState("");
  const searchHits = reactExports.useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q || !fast) return [];
    return flagged.filter((f) => f.facility.name.toLowerCase().includes(q)).slice(0, 8);
  }, [searchQ, fast, flagged]);
  if (loading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(AppShell, { title: "Dashboard", subtitle: "Loading live data…", children: /* @__PURE__ */ jsxRuntimeExports.jsx(DashboardSkeleton, {}) });
  }
  if (!hasFacilities) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(AppShell, { title: "Dashboard", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { className: "glass", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ClipboardList, { className: "size-4" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(AlertTitle, { children: "No facilities yet" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDescription, { children: data.role === "admin" ? "Add facilities manually from the Facility Master List or migrate your spreadsheet via Bulk Import." : "No facilities have been added for your assigned blocks yet. Contact your State Admin." })
    ] }) });
  }
  [
    blockFilter,
    typeFilter,
    statusFilter
  ].filter((f) => f.length > 0).length;
  const overdueCount = agg.alertRows.filter((a) => a.kind === "overdue").length;
  const dueCount = agg.alertRows.filter((a) => a.kind === "due").length;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    AppShell,
    {
      title: "Dashboard",
      subtitle: data.myBlockNames ? `Showing your assigned blocks: ${data.myBlockNames.join(", ")}` : "Tirupathur district · NQAS certification progress",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Popover, { open: searchOpen, onOpenChange: setSearchOpen, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "icon", className: "size-11 shrink-0", "aria-label": "Search facility", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "size-4" }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(PopoverContent, { align: "end", className: "w-80 p-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                autoFocus: true,
                value: searchQ,
                onChange: (e) => setSearchQ(e.target.value),
                placeholder: "Search facility name…",
                className: "h-10",
                onKeyDown: (e) => {
                  if (e.key === "Enter" && searchHits[0]) {
                    navigate(`/facilities/${searchHits[0].facility._id}`);
                    setSearchOpen(false);
                    setSearchQ("");
                  }
                }
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 max-h-72 overflow-y-auto", children: [
              searchQ.trim() && searchHits.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "px-2 py-3 text-sm text-muted-foreground", children: [
                "No facility matches “",
                searchQ,
                "”."
              ] }),
              searchHits.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Link,
                {
                  to: `/facilities/${f.facility._id}`,
                  onClick: () => {
                    setSearchOpen(false);
                    setSearchQ("");
                  },
                  className: "flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm hover:bg-accent",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 truncate font-medium", children: f.facility.name }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 text-[11px] text-muted-foreground", children: f.facility.block })
                  ]
                },
                f.facility._id
              ))
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "outline",
            className: "gap-2",
            onClick: () => {
              window.open(
                `https://wa.me/?text=${encodeURIComponent(shareText())}`,
                "_blank",
                "noopener,noreferrer"
              );
            },
            "data-tip": "Share the current summary on WhatsApp",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(MessageCircle, { className: "size-4" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden sm:inline", children: "Share" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DashboardDownloadMenu,
          {
            visibleBlocks: agg.blocks,
            scope: agg.isBlockScoped ? "PHC" : "Block",
            conditionalityItems: data.conditionalityList.items,
            resultAwaitedItems: data.resultAwaitedList.items,
            docItems: filtered.filter((f) => f.sa?.generalDocStatus).map((f) => ({
              name: f.facility.name,
              block: f.facility.block,
              phc: f.facility.phc,
              facilityType: f.facility.facilityType,
              docStatus: f.sa.generalDocStatus
            })),
            eligiblePendingItems: data.eligiblePending.items,
            scheduledRows: agg.scheduled,
            recertRows: agg.recert,
            filteredRows: filtered,
            subtitle: filteredReportSubtitle
          }
        ),
        agg.up.filter((x) => x.days === 0 && x.kind === "NQAS Assessment").length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "a",
          {
            href: "#scheduled",
            className: "glass inline-flex items-center gap-1.5 rounded-lg border border-teal-300/60 bg-teal-50/70 px-3 py-1.5 text-xs font-medium text-teal-900 hover:bg-teal-50 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-100",
            "data-tip": "Open today's assessments in the Upcoming schedule",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CalendarClock, { className: "size-3.5" }),
              "Today: ",
              agg.up.filter((x) => x.days === 0 && x.kind === "NQAS Assessment").length,
              " ",
              "NQAS visit",
              agg.up.filter((x) => x.days === 0 && x.kind === "NQAS Assessment").length === 1 ? "" : "s"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "span",
          {
            className: "glass hidden items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs text-muted-foreground sm:inline-flex",
            "data-tip": "Newest change across facilities, assessments, documents and audit history",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(History, { className: "size-3.5" }),
              "Updated",
              /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "font-semibold text-foreground", children: lastUpdatedText })
            ]
          }
        )
      ] }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          DashboardSectionsProvider,
          {
            controls: data.settings.dashboardSectionControls === true,
            value: sectionLayout,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(IaReminderBanner, {}),
              /* @__PURE__ */ jsxRuntimeExports.jsx(DashboardSection, { id: "alerts", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                motion.div,
                {
                  initial: { opacity: 0, y: 8 },
                  animate: { opacity: 1, y: 0 },
                  transition: { duration: 0.25 },
                  className: cn(
                    "mb-6 rounded-2xl border p-4",
                    overdueCount > 0 ? "border-rose-300/70 bg-rose-50/70 dark:border-rose-500/30 dark:bg-rose-500/10" : dueCount > 0 ? "border-amber-300/70 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-500/10" : "border-emerald-300/60 bg-emerald-50/60 dark:border-emerald-500/25 dark:bg-emerald-500/10"
                  ),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "button",
                      {
                        type: "button",
                        className: "flex w-full items-center gap-3 text-left",
                        onClick: () => setAlertsOpen((o) => !o),
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "span",
                            {
                              className: cn(
                                "flex size-10 shrink-0 items-center justify-center rounded-full",
                                overdueCount > 0 ? "bg-rose-500/15 text-rose-600" : dueCount > 0 ? "bg-amber-500/15 text-amber-600" : "bg-emerald-500/15 text-emerald-600"
                              ),
                              children: /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-5" })
                            }
                          ),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0 flex-1", children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-2", children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "text-sm", children: overdueCount > 0 || dueCount > 0 ? `${dueCount} facilities due for recertification, ${overdueCount} overdue` : "No certifications expiring in the alert window" }),
                              overdueCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, { className: "animate-pulse border-rose-300 bg-rose-100 text-rose-800", children: [
                                overdueCount,
                                " overdue"
                              ] })
                            ] }),
                            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "block text-xs text-muted-foreground", children: [
                              "Tap to ",
                              alertsOpen ? "hide" : "open",
                              " the full list"
                            ] })
                          ] }),
                          alertsOpen ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronUp, { className: "size-5 shrink-0 text-muted-foreground" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "size-5 shrink-0 text-muted-foreground" })
                        ]
                      }
                    ),
                    alertsOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 space-y-2", children: [
                      agg.alertRows.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground", children: [
                        "Nothing expiring within ",
                        settings.recertificationAlertLeadDays,
                        " ",
                        "days — great news."
                      ] }),
                      agg.alertRows.map(({ f, days, kind }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        "div",
                        {
                          className: cn(
                            "flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background/70 px-3 py-2 text-sm transition-shadow hover:shadow-sm",
                            kind === "overdue" ? "border-rose-300/60" : "border-amber-300/60"
                          ),
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(FacilityCell, { facility: f.facility }),
                              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-muted-foreground", children: [
                                "Validity ends ",
                                toDisplayDate(f.nqas?.validityDate)
                              ] })
                            ] }),
                            kind === "overdue" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "animate-pulse rounded-full border border-rose-300 bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800", children: [
                              "Overdue ",
                              humanOverdue(-days)
                            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800", children: [
                              "Due in ",
                              days,
                              " day",
                              days === 1 ? "" : "s"
                            ] })
                          ]
                        },
                        f.facility._id
                      ))
                    ] })
                  ]
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-2 flex flex-wrap items-center gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CycleFilter, { allowAll: false }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                UniversalFilterBar,
                {
                  pageKey: "dashboard",
                  fields: [
                    {
                      key: "block",
                      label: "Block",
                      type: "select",
                      group: "Identity",
                      onThisPage: true,
                      options: blockOptions.map((b) => ({ value: b, label: b }))
                    },
                    {
                      key: "type",
                      label: "Facility Type",
                      type: "select",
                      group: "Identity",
                      onThisPage: true,
                      options: typeOptions.map((t) => ({ value: t, label: t }))
                    },
                    {
                      key: "status",
                      label: FACILITY_CURRENT_STATUS_LABEL,
                      type: "select",
                      group: "Certification",
                      onThisPage: true,
                      options: statusOptions.map((s) => ({ value: s, label: s }))
                    }
                  ],
                  value: {
                    barKeys,
                    filters: [
                      { key: "block", op: "in", values: blockFilter },
                      { key: "type", op: "in", values: typeFilter },
                      { key: "status", op: "in", values: statusFilter }
                    ],
                    match: "all"
                  },
                  onChange: (next) => {
                    setBarKeys(next.barKeys);
                    const values = (key) => next.filters.find((f) => f.key === key)?.values ?? [];
                    setBlockFilter(values("block"));
                    setTypeFilter(values("type"));
                    setStatusFilter(values("status"));
                  },
                  summary: `Showing ${filtered.length} of ${flagged.length} facilities`
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DashboardSection, { id: "kpi", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 grid grid-cols-2 gap-3 md:grid-cols-4", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    KpiCard,
                    {
                      label: "Total facilities",
                      tip: "Every facility in scope for this login — eligible and non-eligible alike.",
                      value: agg.total,
                      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ClipboardList, { className: "size-4" }),
                      onClick: () => jumpToLists("eligible"),
                      index: 0
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    KpiCard,
                    {
                      label: "NQAS eligible",
                      tip: "Facilities that meet NQAS eligibility (they can be assessed and certified).",
                      value: agg.eligible,
                      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "size-4" }),
                      suffix: `${agg.total > 0 ? Math.round(agg.eligible / agg.total * 100) : 0}% of total`,
                      onClick: () => jumpToLists("eligible"),
                      index: 1
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    KpiCard,
                    {
                      label: "Total certified",
                      tip: "Quality Certified + Certified with Conditionality — the only two counts that make up “certified”.",
                      value: agg.certified,
                      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Award, { className: "size-4" }),
                      suffix: `${pctCertified}% of eligible`,
                      ring: /* @__PURE__ */ jsxRuntimeExports.jsx(PctRing, { pct: pctCertified, size: 40 }),
                      onClick: () => setStatusFilter([
                        "Certified — Surveillance Due",
                        "Certified with Conditionality"
                      ]),
                      index: 2
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    KpiCard,
                    {
                      label: "Action needed",
                      tip: "Recertification due (incl. overdue) + Result awaited + Deferred — facilities that require follow-up now.",
                      value: actionsCount,
                      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-4" }),
                      tone: "text-rose-600",
                      suffix: `${overdueCount} overdue`,
                      onClick: () => jumpToLists("recert"),
                      index: 3
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-6 flex flex-wrap gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    KpiChip,
                    {
                      label: "Conditional",
                      count: agg.cond,
                      dot: "oklch(0.78 0.14 85)",
                      onClick: () => jumpToLists("conditional")
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    KpiChip,
                    {
                      label: "NA Scheduled",
                      count: agg.naScheduled,
                      dot: "oklch(0.58 0.14 250)",
                      onClick: () => setStatusFilter(
                        statusOptions.filter((s) => s === "NA Scheduled")
                      )
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    KpiChip,
                    {
                      label: "Deferred",
                      count: agg.deferred,
                      dot: "oklch(0.6 0.2 25)",
                      onClick: () => setStatusFilter(["Deferred — Cooling Period"])
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    KpiChip,
                    {
                      label: "Dilapidated",
                      count: agg.dilapidated,
                      dot: "oklch(0.65 0.22 20)"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    KpiChip,
                    {
                      label: "Result awaited",
                      count: resultCount,
                      dot: "oklch(0.72 0.16 60)",
                      onClick: () => jumpToLists("result")
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(DashboardSection, { id: "overview", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "glass mb-6", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { className: "space-y-0", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-base", children: "Overview" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTip, { tip: "Headline counts for this login's scope. Each tile opens the matching facility list. Data as of the newest change in the workspace (shown top-right)." })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-xs text-muted-foreground", children: isBlockScopedForHeader ? "Your assigned blocks" : "" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      OverviewTile,
                      {
                        label: "Certified %",
                        icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Award, { className: "size-4" }),
                        tip: `Headline “hold a certificate” share of the whole scope (${agg.certified} of ${agg.total}).`,
                        value: agg.certifiedPct != null ? formatPercent(agg.certifiedPct) : "",
                        sub: `${agg.certified} of ${agg.total} hold a certificate`,
                        onClick: () => jumpToLists("certified"),
                        index: 0
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      OverviewTile,
                      {
                        label: "Quality Certified",
                        icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "size-4" }),
                        tip: "Facilities that passed with no conditions attached.",
                        value: agg.quality,
                        onClick: () => jumpToLists("eligible"),
                        index: 1
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      OverviewTile,
                      {
                        label: "With conditionality",
                        icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ClipboardList, { className: "size-4" }),
                        tip: "Certified with conditions to close — the conditional list.",
                        value: agg.cond,
                        onClick: () => jumpToLists("conditional"),
                        index: 2
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      OverviewTile,
                      {
                        label: `Certified in FY ${currentFyLabel} (to date)`,
                        icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CalendarClock, { className: "size-4" }),
                        tip: "Counted by certification date inside this financial year (April–March). Previous FY shown below for comparison.",
                        value: agg.certifiedInCurrentFy,
                        sub: `FY ${previousFyLabel}: ${agg.certifiedInPreviousFy}`,
                        index: 3
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      OverviewTile,
                      {
                        label: "Not certified",
                        icon: /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-4" }),
                        tip: "Facilities with no certification yet — the full remaining workload.",
                        value: agg.total - agg.certified,
                        tone: "text-rose-600",
                        onClick: () => jumpToLists("recert"),
                        index: 4
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      OverviewTile,
                      {
                        label: "Needs attention",
                        icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FunnelX, { className: "size-4" }),
                        tip: "Distinct facilities with an expired certificate, expired Fire NOC, overdue surveillance or a dilapidated building.",
                        value: agg.needsAttention.length,
                        tone: "text-rose-600",
                        onClick: () => setStageOpen("needsAttention"),
                        index: 5
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-3 text-xs text-muted-foreground", children: [
                    agg.blocks.length,
                    " blocks · ",
                    agg.total,
                    " facilities"
                  ] })
                ] })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(DashboardSection, { id: "pipeline", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "glass mb-6", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { className: "space-y-0", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-base", children: "Facility Current Status" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTip, { tip: `One stage per facility — the furthest step of the NQAS cycle it has reached. "Not eligible" is a muted chip before the path; only real path stages are numbered. Tap a step to see its facilities.` })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-xs text-muted-foreground", children: "Tap any step to view the facilities inside it" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "div",
                    {
                      className: "@container",
                      style: { containerType: "inline-size" },
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 gap-2 @[900px]:grid-cols-4 @[1200px]:grid-cols-7", children: PIPELINE_STAGES.map((stage) => {
                        const count = agg.stageCounts[stage.key];
                        const pct = agg.total > 0 ? Math.round(count / agg.total * 100) : 0;
                        const color = PIPELINE_STAGE_COLORS[stage.key] ?? "oklch(0.6 0.05 260)";
                        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          motion.button,
                          {
                            type: "button",
                            whileTap: { scale: 0.97 },
                            onClick: () => setStageOpen(stage.key),
                            "aria-label": `${stage.label}: ${count} facilities, ${pct} percent, open list`,
                            className: cn(
                              "min-w-0 rounded-xl border border-border/60 bg-background/60 p-3 text-left transition-shadow hover:shadow-md",
                              "min-h-11 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
                              count === 0 && "opacity-60"
                            ),
                            children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  "span",
                                  {
                                    className: "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
                                    style: { background: color },
                                    "aria-hidden": true,
                                    children: stage.key === "notEligible" ? "–" : stageIndex(stage.key) + 1
                                  }
                                ),
                                /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  "span",
                                  {
                                    className: "truncate text-xs font-semibold",
                                    "data-tip": stage.label,
                                    "data-tip-truncate": true,
                                    children: stage.label
                                  }
                                )
                              ] }),
                              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex items-baseline gap-1", children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-2xl font-bold tabular-nums", children: count }),
                                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[11px] text-muted-foreground", children: [
                                  pct,
                                  "%"
                                ] })
                              ] }),
                              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 h-1.5 overflow-hidden rounded-full bg-muted/60", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                                "div",
                                {
                                  className: "h-full rounded-full transition-all duration-500",
                                  style: { width: `${pct}%`, background: color }
                                }
                              ) })
                            ]
                          },
                          stage.key
                        );
                      }) })
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-3 text-xs text-muted-foreground", children: [
                    agg.total,
                    " facilities = sum of the 7 stages ✓"
                  ] }),
                  agg.certReconciliation && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs italic text-muted-foreground", children: agg.certReconciliation })
                ] })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(DashboardSection, { id: "progress", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                ProgressBreakdownCard,
                {
                  breakdown,
                  facilities: bdFacilities,
                  state: bdState,
                  onState: setBdState,
                  dataAsOf: lastUpdatedText,
                  isAdmin: data.role === "admin",
                  allowPhc: agg.isBlockScoped
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(DashboardSection, { id: "scheduled", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                ScheduleTimeline,
                {
                  overdue: agg.overdueAssess,
                  upcoming: agg.up
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: listsRef }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DashboardSection, { id: "conditionality", children: [
                "              ",
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  FacilityListsCard,
                  {
                    active: activeTab,
                    onActive: setActiveTab,
                    recertRows: agg.recert,
                    conditionalRows: agg.conditionalRows,
                    resultRows: agg.resultAwRows,
                    docRows: agg.docRows,
                    eligibleRows: agg.eligiblePendingRows,
                    iaRows: filtered.filter((f) => (f.ia?.status ?? "none") !== "none"),
                    recertOverdue: agg.recertDue.filter(
                      (x) => x.days != null && x.days < 0
                    ).length
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(DashboardSection, { id: "statusWhatNext", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "glass mb-6", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { className: "flex-row flex-wrap items-center justify-between gap-2 space-y-0", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-base", children: "Status distribution" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTip, { tip: "Statuses per device area report — counts follow the global filters above." })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: moduleKey, onValueChange: setModuleKey, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "glass-input h-9 w-52 text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "all", children: "All — Overall lifecycle" }),
                      (data.moduleDistributions ?? []).map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: m.key, children: m.label }, m.key))
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { children: (() => {
                  const counts = agg.distCounts(moduleKey);
                  const totalDist = counts.reduce((a, x) => a + x.count, 0);
                  if (totalDist === 0)
                    return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "py-8 text-center text-sm text-muted-foreground", children: "No facilities in this filter." });
                  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: counts.map(({ status, count }) => {
                    const pct = Math.round(count / totalDist * 100);
                    const tone = statusToneOf(status);
                    const hint = hintFor(status);
                    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "button",
                      {
                        type: "button",
                        onClick: () => setStatusFilter([status]),
                        className: "w-full rounded-lg px-1 py-1 text-left transition-colors hover:bg-accent/40",
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status, className: "shrink-0" }),
                            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-w-2 flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                              "div",
                              {
                                className: "h-2.5 overflow-hidden rounded-full bg-muted/60",
                                role: "progressbar",
                                "aria-valuenow": pct,
                                "aria-valuemin": 0,
                                "aria-valuemax": 100,
                                children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  "div",
                                  {
                                    className: "h-full rounded-full transition-all duration-500",
                                    style: {
                                      width: `${pct}%`,
                                      background: TONE_BG[tone]
                                    }
                                  }
                                )
                              }
                            ) }),
                            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "w-24 text-right text-xs font-semibold tabular-nums", children: [
                              count,
                              " (",
                              pct,
                              "%)"
                            ] })
                          ] }),
                          hint && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-0.5 pl-0.5 text-[11px] text-muted-foreground", children: [
                            "💡 ",
                            hint
                          ] })
                        ]
                      },
                      status
                    );
                  }) });
                })() })
              ] }) })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Dialog,
          {
            open: stageOpen !== null,
            onOpenChange: (o) => !o && setStageOpen(null),
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-h-[80vh] overflow-y-auto sm:max-w-lg", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: stageOpen === "needsAttention" ? "Needs attention" : stageOpen ? PIPELINE_STAGES.find((s) => s.key === stageOpen)?.label : "" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogDescription, { children: [
                  stageOpen === "needsAttention" ? agg.needsAttention.length : stageOpen ? agg.stageCounts[stageOpen] : 0,
                  " ",
                  "facilities · list follows the global filters"
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
                filtered.filter(
                  (f) => stageOpen === "needsAttention" ? agg.needsAttention.some(
                    (n) => n.facility._id === f.facility._id
                  ) : f.view.stage === stageOpen
                ).slice(0, 300).map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "div",
                  {
                    className: "flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm hover:bg-accent",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-w-0 flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(FacilityCell, { facility: f.facility }) }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: f.view.currentStatus, className: "max-w-40 truncate" })
                    ]
                  },
                  f.facility._id
                )),
                (stageOpen === "needsAttention" ? agg.needsAttention.length : agg.stageCounts[stageOpen ?? "certified"]) > 300 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "pt-2 text-xs text-muted-foreground", children: "Showing the first 300 — export for the full list." })
              ] })
            ] })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pb-20 md:pb-6", "aria-hidden": true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FloatingActions,
          {
            open: fabOpen,
            setOpen: setFabOpen,
            todayVisits: agg.up.filter((x) => x.days === 0 && x.kind === "NQAS Assessment").length,
            expiredCerts: agg.alertRows.filter((x) => x.kind === "overdue").length,
            onReport: () => (
              // THE FIX: header and rows both come from the one column model — the
              // call site no longer trims the header list (`FILTERED_HEADERS.slice(1)`
              // is gone), so every value sits under its own header again.
              exportPdf(
                `dashboard-summary-${dateStamp()}.pdf`,
                "Dashboard summary — current filter",
                filteredReportHeaders(),
                filteredReportRows(filtered),
                filteredReportSubtitle,
                filteredReportPdfOptions()
              )
            )
          }
        )
      ]
    }
  );
}
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
  index = 0
}) {
  const shown = useCountUp(value);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    motion.button,
    {
      type: "button",
      onClick,
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.25, delay: Math.min(index * 0.05, 0.2) },
      whileHover: { y: -3 },
      className: "glass flex min-h-24 snap-start flex-1 flex-col rounded-2xl p-4 text-left shadow-sm transition-shadow hover:shadow-lg hover:shadow-teal-950/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground", children: [
          icon,
          label,
          /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTip, { tip })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mt-1 flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("text-3xl font-bold tabular-nums", tone), children: shown }),
          ring
        ] }),
        suffix && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-0.5 text-[11px] text-muted-foreground", children: suffix })
      ]
    }
  );
}
function KpiChip({
  label,
  count,
  dot,
  onClick
}) {
  const shown = useCountUp(count);
  const Cmp = onClick ? motion.button : motion.span;
  const props = onClick ? { type: "button", onClick } : void 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Cmp,
    {
      ...props,
      whileHover: onClick ? { y: -2 } : void 0,
      className: cn(
        "glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs shadow-sm",
        onClick && "hover:shadow-md"
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: "size-2.5 rounded-full",
            style: { background: dot },
            "aria-hidden": true
          }
        ),
        label,
        /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "font-bold tabular-nums", children: shown })
      ]
    }
  );
}
function ScheduleTimeline({
  overdue,
  upcoming
}) {
  const [visitType, setVisitType] = reactExports.useState("nqas");
  const matchesType = (x) => visitType === "all" ? true : visitType === "nqas" ? x.kind === "NQAS Assessment" : visitType === "sa" ? x.kind === "State Assessment" : x.kind.startsWith("Surveillance");
  const visibleUpcoming = upcoming.filter(matchesType);
  const visibleOverdue = overdue.filter(matchesType);
  const groups = reactExports.useMemo(() => {
    const withDate = visibleUpcoming.filter((x) => x.days != null);
    const undated = visibleUpcoming.filter((x) => x.days == null);
    const g = {
      Tomorrow: [],
      "This week": [],
      "Next week": [],
      "Later": []
    };
    for (const x of withDate) {
      const d = x.days;
      if (d === 0) continue;
      (d === 1 ? g.Tomorrow : d <= 6 ? g["This week"] : d <= 13 ? g["Next week"] : g["Later"]).push(x);
    }
    for (const k of Object.keys(g)) g[k].sort((a, b) => (a.days ?? 0) - (b.days ?? 0));
    return { groups: g, undated, overdue: visibleOverdue };
  }, [upcoming, overdue, visitType]);
  const todayRows = visibleUpcoming.filter((x) => x.days === 0);
  if (overdue.length + upcoming.length === 0) return null;
  const Row = ({
    x,
    overdueChip
  }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Link,
    {
      to: `/facilities/${x.r.facility._id}`,
      className: "flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-2.5 transition-shadow hover:shadow-sm",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: cn(
              "size-3 shrink-0 rounded-full border-2",
              overdueChip ? "border-rose-600 bg-rose-500" : x.days === 0 ? "animate-pulse border-teal-700 bg-teal-500" : "border-slate-400 bg-transparent"
            ),
            "aria-label": overdueChip ? "Overdue" : x.days === 0 ? "Today" : "Scheduled"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block truncate text-sm font-semibold", children: x.r.facility.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[11px] text-muted-foreground", children: [
            x.r.facility.facilityType,
            " · ",
            x.r.facility.block,
            " · ",
            x.r.facility.phc,
            " ·",
            " ",
            x.date ? weekdayDate(x.date) : "Date not set",
            x.r.nqas?.mode ? ` · ${x.r.nqas.mode}` : "",
            x.date && x.endDate && x.endDate > x.date ? ` · Day ${Math.max(
              1,
              Math.round(
                ((/* @__PURE__ */ new Date(todayLocalIso() + "T12:00:00")).getTime() - (/* @__PURE__ */ new Date(x.date + "T12:00:00")).getTime()) / 864e5
              ) + 1
            )} of ${Math.round(
              ((/* @__PURE__ */ new Date(x.endDate + "T12:00:00")).getTime() - (/* @__PURE__ */ new Date(x.date + "T12:00:00")).getTime()) / 864e5
            ) + 1}` : ""
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 text-[11px] font-medium text-muted-foreground", children: x.kind }),
        overdueChip ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "animate-pulse rounded-full border border-rose-300 bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800", children: [
          "Overdue ",
          humanOverdue(Math.abs(x.days ?? 0))
        ] }) : x.days === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "animate-pulse rounded-full border border-blue-300 bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800", children: "Today" }) : x.days == null ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground", children: "No date" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded-full border border-blue-300/60 bg-blue-100/70 px-2 py-0.5 text-[11px] font-semibold text-blue-800", children: [
          "in ",
          x.days,
          "d"
        ] })
      ]
    }
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "glass mb-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "space-y-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-base", "data-guide-target": "upcoming", children: "Upcoming schedule" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTip, { tip: "Today first, then upcoming visits grouped by week. Overdue visits stay pinned above Today. Status marker: outline = scheduled, pulsing teal = today, red = overdue." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ml-auto flex flex-wrap gap-1", role: "tablist", "aria-label": "Visit type", children: [
        ["nqas", "NQAS"],
        ["sa", "State Assessment"],
        ["surv", "Surveillance"],
        ["all", "All visits"]
      ].map(([id, label]) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": visitType === id,
          onClick: () => setVisitType(id),
          className: cn(
            "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
            visitType === id ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:bg-accent"
          ),
          children: label
        },
        id
      )) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-4", children: [
      todayRows.length === 0 && (() => {
        const next = visibleUpcoming.filter((x) => x.days != null && x.days > 0).sort((a, b) => (a.days ?? 0) - (b.days ?? 0))[0];
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground", children: [
          "No NQAS assessments today.",
          next ? ` Next: ${next.r.facility.name} on ${weekdayDate(next.date ?? "")}.` : ""
        ] });
      })(),
      todayRows.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-teal-300/70 bg-teal-50/70 p-3 dark:border-teal-500/40 dark:bg-teal-500/10", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-teal-900 dark:text-teal-100", children: [
          "Today · ",
          weekdayDate(todayLocalIso()),
          " · ",
          todayRows.length,
          " ",
          todayRows.length === 1 ? "visit" : "visits"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1.5", children: todayRows.map((x) => /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { x }, `today-${x.r.facility._id}`)) })
      ] }),
      groups.overdue.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-rose-600", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-3.5" }),
          " Overdue (",
          groups.overdue.length,
          ")"
        ] }),
        groups.overdue.map((x) => /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { x, overdueChip: true }, x.r.facility._id))
      ] }),
      Object.entries(groups.groups).map(
        ([label, rows]) => rows.length ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CalendarClock, { className: "size-3.5" }),
            " ",
            label
          ] }),
          rows.map((x) => /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { x }, x.r.facility._id))
        ] }, label) : null
      ),
      groups.undated.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-bold uppercase tracking-wide text-muted-foreground", children: "Scheduled — no date set" }),
        groups.undated.map((x) => /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { x }, x.r.facility._id))
      ] })
    ] })
  ] });
}
function FacilityListsCard({
  active,
  onActive,
  recertRows,
  conditionalRows,
  resultRows,
  docRows,
  eligibleRows,
  iaRows
}) {
  const navigate = useNavigate();
  const [pageState, setPageState] = reactExports.useState({});
  const PAGE = 15;
  const tabs = reactExports.useMemo(() => {
    const mk = (id, label, rows2) => ({
      id,
      label,
      count: rows2.length,
      rows: rows2,
      blockOptions: [...new Set(rows2.map((r) => r.block))].sort(),
      typeOptions: [...new Set(rows2.map((r) => r.type))].sort()
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
        chip: x.days != null && x.days < 0 ? {
          label: `Overdue ${humanOverdue(-x.days)}`,
          cls: "animate-pulse border-rose-300 bg-rose-100 text-rose-800"
        } : x.days === 0 ? { label: "Today", cls: "border-amber-300 bg-amber-100 text-amber-800" } : {
          label: `in ${x.days}d`,
          cls: "border-blue-300/60 bg-blue-100/70 text-blue-800"
        }
      }))
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
        sub: f.nqas?.scorePercent != null ? `Certified score ${f.nqas.scorePercent}%` : null
      }))
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
        date: f.nqas?.scheduledStartDate ?? f.sa?.actualStartDate ?? f.sa?.scheduledDate,
        sub: f.sa?.generalDocStatus
      }))
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
          label: f.sa.generalDocStatus,
          cls: "border-border/60 bg-muted/50 text-foreground/80"
        }
      }))
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
        sub: f.sa?.generalDocStatus ?? "No documents stage yet"
      }))
    );
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
        sub: f.ia?.dueDate != null ? f.ia.status === "overdue" ? `IA overdue — was due ${f.ia.dueDate}` : f.ia.status === "dueSoon" ? `IA due ${f.ia.dueDate}` : `Next IA due ${f.ia.dueDate}` : "No IA cadence recorded",
        chip: f.ia?.status === "overdue" ? { label: "IA Overdue", cls: "border-rose-300/70 bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300" } : f.ia?.status === "dueSoon" ? { label: "IA Due Soon", cls: "border-amber-300/70 bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" } : { label: "IA Up To Date", cls: "border-emerald-300/70 bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" }
      }))
    );
    return [recertList, condList, resultList, docList, pendingList, iaList];
  }, [recertRows, conditionalRows, resultRows, docRows, eligibleRows, iaRows]);
  const tab = tabs.find((t) => t.id === active) ?? tabs[0];
  const [q, setQ] = reactExports.useState("");
  const [tabBlock, setTabBlock] = reactExports.useState([]);
  const [tabType, setTabType] = reactExports.useState([]);
  const rows = tab.rows.filter(
    (r) => (q.trim().length === 0 || r.name.toLowerCase().includes(q.trim().toLowerCase())) && multiFilterMatches(r.block, tabBlock) && multiFilterMatches(r.type, tabType)
  );
  const shown = pageState[tab.id] ?? PAGE;
  const visible = rows.slice(0, shown);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "glass mb-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { className: "space-y-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-base", children: "Facility lists" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tabs, { value: tab.id, onValueChange: onActive, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TabsList, { className: "glass-input h-auto w-full flex-wrap justify-start rounded-xl p-1", children: tabs.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        TabsTrigger,
        {
          value: t.id,
          className: "gap-1.5 rounded-lg px-3 py-1.5 text-xs data-[state=active]:shadow-sm",
          children: [
            t.label,
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary", children: t.count })
          ]
        },
        t.id
      )) }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            value: q,
            onChange: (e) => setQ(e.target.value),
            placeholder: `Search in ${tab.label.toLowerCase()}…`,
            className: "glass-input h-9 w-48 min-w-36 flex-1"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FilterDropdown,
          {
            label: "Block",
            options: tab.blockOptions.map((b) => ({ value: b, label: b })),
            value: tabBlock,
            onChange: setTabBlock,
            triggerWidth: "w-36"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FilterDropdown,
          {
            label: "Type",
            options: tab.typeOptions.map((t) => ({ value: t, label: t })),
            value: tabType,
            onChange: setTabType,
            triggerWidth: "w-36"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[11px] text-muted-foreground", children: [
          rows.length,
          " shown"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        visible.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "rounded-xl border border-dashed px-3 py-6 text-center text-sm text-muted-foreground", children: "No facilities in this list (with the current filters)." }),
        visible.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            role: "link",
            tabIndex: 0,
            onClick: () => navigate(`/facilities/${r.facilityId}`),
            onKeyDown: (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate(`/facilities/${r.facilityId}`);
              }
            },
            className: "block cursor-pointer rounded-xl border border-border/60 bg-background/60 px-3 py-2.5 transition-shadow hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:grid md:grid-cols-[1fr_auto] md:items-center md:gap-3",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-w-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                FacilityCell,
                {
                  facility: { _id: r.facilityId, name: r.name, facilityType: r.type, block: r.block, phc: r.phc, ninNumber: r.nin },
                  query: q,
                  onOpen: () => navigate(`/facilities?facility=${encodeURIComponent(r.facilityId)}&section=overview`)
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 flex flex-wrap items-center gap-2 md:mt-0 md:justify-end", children: [
                r.date && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: toDisplayDate(r.date) }),
                r.sub && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] font-medium text-muted-foreground", children: r.sub }),
                r.chip && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    className: cn(
                      "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                      r.chip.cls
                    ),
                    children: r.chip.label
                  }
                )
              ] })
            ]
          },
          r.key
        ))
      ] }),
      rows.length > shown && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          variant: "outline",
          size: "sm",
          className: "gap-2",
          onClick: () => setPageState((p) => ({ ...p, [tab.id]: (p[tab.id] ?? PAGE) + PAGE })),
          children: [
            "Load ",
            Math.min(PAGE, rows.length - shown),
            " more",
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-muted-foreground", children: [
              "(",
              rows.length - shown,
              " remaining)"
            ] })
          ]
        }
      ) })
    ] })
  ] });
}
function DashboardSkeleton() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", "aria-busy": true, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-3 md:grid-cols-4", children: [0, 1, 2, 3].map((i) => /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-28 rounded-2xl" }, i)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-40 rounded-2xl" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-3", children: [0, 1, 2, 3, 4, 5].map((i) => /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-24 rounded-2xl" }, i)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center py-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-5 animate-spin text-muted-foreground" }) })
  ] });
}
function FloatingActions({
  open,
  setOpen,
  onReport,
  todayVisits = 0,
  expiredCerts = 0
}) {
  const [q, setQ] = reactExports.useState("");
  const settingsQ = useQuery(api.facilities.getAppSettings, {});
  const hiddenKeys = /* @__PURE__ */ new Set([
    ...settingsQ?.settings.hiddenPages ?? [],
    ...settingsQ?.settings.hiddenCategories ?? []
  ]);
  const isHidden = (to) => {
    const path = to.split("?")[0];
    const item = NAV_ITEMS.find((n) => n.to === path);
    return [item?.visibilityKey ?? path.replace(/^\//, ""), path.replace(/^\//, "")].some(
      (key) => hiddenKeys.has(key)
    );
  };
  reactExports.useEffect(() => {
    const onKey = (e) => {
      const el = e.target;
      const typing = !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      if (!typing && e.key.toLowerCase() === "q" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);
  reactExports.useEffect(() => {
    if (!open) {
      setQ("");
      return;
    }
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);
  const [hidden, setHidden] = reactExports.useState(false);
  reactExports.useEffect(() => {
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
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "aria-hidden": hidden,
      className: cn(
        "fixed bottom-20 right-4 z-40 flex flex-col items-end gap-2 transition-all duration-200 md:bottom-6",
        hidden && "pointer-events-none translate-y-24 opacity-0"
      ),
      children: [
        open && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "glass-strong w-[min(92vw,22rem)] max-h-[70vh] overflow-y-auto rounded-2xl border border-border/60 p-2 shadow-lg",
            role: "dialog",
            "aria-label": "Quick actions",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  autoFocus: true,
                  value: q,
                  onChange: (e) => setQ(e.target.value),
                  placeholder: "Type an action…",
                  "aria-label": "Search actions",
                  className: "mb-2 h-9 w-full rounded-lg border border-border/60 bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                }
              ),
              (todayVisits > 0 || expiredCerts > 0) && !q && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground", children: "Suggested" }),
                todayVisits > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "a",
                  {
                    href: "#scheduled",
                    onClick: () => setOpen(false),
                    className: "flex min-h-10 items-center gap-2 rounded-xl bg-teal-500/10 px-3 py-2 text-sm font-medium text-teal-900 hover:bg-teal-500/15 dark:text-teal-100",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(CalendarClock, { className: "size-4" }),
                      " ",
                      todayVisits,
                      " NQAS visit",
                      todayVisits === 1 ? "" : "s",
                      " today · Open"
                    ]
                  }
                ),
                expiredCerts > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Link,
                  {
                    to: "/facilities",
                    onClick: () => setOpen(false),
                    className: "flex min-h-10 items-center gap-2 rounded-xl bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-900 hover:bg-rose-500/15 dark:text-rose-100",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-4" }),
                      " ",
                      expiredCerts,
                      " certificate",
                      expiredCerts === 1 ? "" : "s",
                      " expired · Start renewals"
                    ]
                  }
                )
              ] }),
              [
                {
                  title: "Create",
                  items: [
                    { label: "Add facility", to: "/facilities?add=1", icon: Plus },
                    { label: "Add assessment", to: "/facilities/state-assessment", icon: CalendarClock },
                    { label: "Upload documents", to: "/facilities", icon: Upload },
                    { label: "Add link", to: "/links?add=1", icon: BookMarked }
                  ]
                },
                {
                  title: "Import",
                  items: [
                    { label: "SaQsham document status", to: "/bulk-import/saqsham", icon: ShieldCheck },
                    { label: "Internal Assessment scores", to: "/bulk-import/internal-assessment", icon: Target },
                    { label: "Facility master", to: "/bulk-import/facility-master", icon: FileSpreadsheet },
                    { label: "Links Organiser", to: "/links?import=1", icon: BookMarked }
                  ]
                },
                {
                  title: "Reports",
                  items: [
                    { label: "Generate PPT", to: "/generate-ppt", icon: Presentation },
                    { label: "Line lists", to: "/facilities/line-lists", icon: FileText },
                    { label: "Links Organiser", to: "/links", icon: BookMarked }
                  ]
                }
              ].map((section) => {
                const items = section.items.filter(
                  (i) => !isHidden(i.to) && `${i.label} ${section.title}`.toLowerCase().includes(q.trim().toLowerCase())
                );
                if (!items.length) return null;
                return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground", children: section.title }),
                  items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    Link,
                    {
                      to: item.to,
                      onClick: () => setOpen(false),
                      className: "flex min-h-9 items-center gap-2.5 rounded-xl px-3 py-1.5 text-sm font-medium hover:bg-accent",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(item.icon, { className: "size-4" }),
                        " ",
                        item.label
                      ]
                    },
                    item.label
                  ))
                ] }, section.title);
              }),
              `report current filter export`.includes(q.trim().toLowerCase()) && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  onClick: () => {
                    setOpen(false);
                    onReport();
                  },
                  className: "mt-1 flex min-h-9 w-full items-center gap-2.5 rounded-xl px-3 py-1.5 text-left text-sm font-medium hover:bg-accent",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-4" }),
                    " Report (current filter)"
                  ]
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            size: "lg",
            className: "h-14 gap-2 rounded-full px-4 shadow-lg",
            "aria-expanded": open,
            "aria-label": "Quick actions — add assessment, generate PPT or export the current report",
            "data-guide-target": "quick-actions",
            "data-tip": "Quick actions — add assessment, generate PPT or export the current report",
            onClick: () => setOpen(!open),
            children: [
              open ? /* @__PURE__ */ jsxRuntimeExports.jsx(FunnelX, { className: "size-5 rotate-45" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "size-5" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden text-sm font-medium sm:inline", children: "Quick actions" })
            ]
          }
        )
      ]
    }
  );
}
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
  subtitle
}) {
  const [busy, setBusy] = reactExports.useState(false);
  const wrap = (fn) => () => {
    try {
      setBusy(true);
      setTimeout(fn, 30);
    } finally {
      setTimeout(() => setBusy(false), 120);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", className: "gap-2", disabled: busy, children: [
      busy ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-4" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden sm:inline", children: "Download" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", className: "w-64", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuLabel, { children: "Current filter" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        DropdownMenuItem,
        {
          onClick: wrap(
            () => exportExcel(
              `facility-list-filtered-${dateStamp()}.xlsx`,
              "Facility list — current dashboard filter",
              filteredReportHeaders(),
              filteredReportRows(filteredRows),
              // Same title band as the PDF/CSV/print view: the active filters
              // and the row count sit above the header row.
              {
                title: "Facility list — current dashboard filter",
                subtitle
              }
            )
          ),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "size-4" }),
            " Filtered list — Excel (.xlsx)"
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        DropdownMenuItem,
        {
          onClick: wrap(
            () => exportPdf(
              `facility-list-filtered-${dateStamp()}.pdf`,
              "Facility list — current dashboard filter",
              filteredReportHeaders(),
              filteredReportRows(filteredRows),
              subtitle,
              filteredReportPdfOptions()
            )
          ),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-4" }),
            " Filtered list — PDF (.pdf)"
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        DropdownMenuItem,
        {
          onClick: wrap(
            () => downloadText(
              `facility-list-filtered-${dateStamp()}.csv`,
              // Same columns, same rows — the CSV header matches its body.
              `${buildReportCsv(DASHBOARD_FILTERED_COLUMNS, filteredRows)}\r
# ${subtitle}`
            )
          ),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-4" }),
            " Filtered list — CSV (.csv)"
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        DropdownMenuItem,
        {
          onClick: wrap(
            () => openReportPrintView({
              title: "Facility list — current dashboard filter",
              subtitle,
              columns: DASHBOARD_FILTERED_COLUMNS,
              rows: filteredRows
            })
          ),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-4" }),
            " Filtered list — Print view"
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuLabel, { children: "Standard dashboard lists" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuSub, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSubTrigger, { children: "Progress table" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuSubContent, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            DropdownMenuItem,
            {
              onClick: wrap(() => exportDashboardProgress(visibleBlocks, scope, "xlsx")),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "size-4" }),
                " Excel (.xlsx)"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            DropdownMenuItem,
            {
              onClick: wrap(() => exportDashboardProgress(visibleBlocks, scope, "pdf")),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-4" }),
                " PDF (.pdf)"
              ]
            }
          )
        ] })
      ] }),
      conditionalityItems.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuSub, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuSubTrigger, { children: [
          "Conditionality list (",
          conditionalityItems.length,
          ")"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuSubContent, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            DropdownMenuItem,
            {
              onClick: wrap(
                () => exportConditionalityList(conditionalityItems, "xlsx")
              ),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "size-4" }),
                " Excel (.xlsx)"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            DropdownMenuItem,
            {
              onClick: wrap(
                () => exportConditionalityList(conditionalityItems, "pdf")
              ),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-4" }),
                " PDF (.pdf)"
              ]
            }
          )
        ] })
      ] }),
      resultAwaitedItems.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuSub, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuSubTrigger, { children: [
          "Result awaited (",
          resultAwaitedItems.length,
          ")"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuSubContent, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            DropdownMenuItem,
            {
              onClick: wrap(
                () => exportResultAwaitedList(resultAwaitedItems, "xlsx")
              ),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "size-4" }),
                " Excel (.xlsx)"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            DropdownMenuItem,
            {
              onClick: wrap(
                () => exportResultAwaitedList(resultAwaitedItems, "pdf")
              ),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-4" }),
                " PDF (.pdf)"
              ]
            }
          )
        ] })
      ] }),
      docItems.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuSub, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuSubTrigger, { children: [
          "Documents status (",
          docItems.length,
          ")"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuSubContent, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            DropdownMenuItem,
            {
              onClick: wrap(() => exportDocStatusList(docItems, "xlsx")),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "size-4" }),
                " Excel (.xlsx)"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            DropdownMenuItem,
            {
              onClick: wrap(() => exportDocStatusList(docItems, "pdf")),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-4" }),
                " PDF (.pdf)"
              ]
            }
          )
        ] })
      ] }),
      eligiblePendingItems.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuSub, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuSubTrigger, { children: [
          "Eligible pending (",
          eligiblePendingItems.length,
          ")"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuSubContent, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            DropdownMenuItem,
            {
              onClick: wrap(
                () => exportEligiblePending(eligiblePendingItems, "xlsx")
              ),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "size-4" }),
                " Excel (.xlsx)"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            DropdownMenuItem,
            {
              onClick: wrap(
                () => exportEligiblePending(eligiblePendingItems, "pdf")
              ),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-4" }),
                " PDF (.pdf)"
              ]
            }
          )
        ] })
      ] }),
      scheduledRows.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuSub, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuSubTrigger, { children: [
          "Scheduled facilities (",
          scheduledRows.length,
          ")"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuSubContent, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            DropdownMenuItem,
            {
              onClick: wrap(
                () => exportExcel(
                  `scheduled-facilities-${dateStamp()}.xlsx`,
                  "Scheduled Facilities",
                  SCHEDULED_HEADERS,
                  buildScheduledExportRows(scheduledRows, true)
                )
              ),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "size-4" }),
                " Excel (.xlsx)"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            DropdownMenuItem,
            {
              onClick: wrap(
                () => exportPdf(
                  `scheduled-facilities-${dateStamp()}.pdf`,
                  "Scheduled Facility Details",
                  SCHEDULED_HEADERS,
                  buildScheduledExportRows(scheduledRows, true),
                  `Upcoming & recent NQAS assessments — ${scheduledRows.length} facilities · generated ${dateStamp()}`
                )
              ),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-4" }),
                " PDF (.pdf)"
              ]
            }
          )
        ] })
      ] }),
      recertRows.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuSub, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuSubTrigger, { children: [
          "Recertification due (",
          recertRows.length,
          ")"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuSubContent, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            DropdownMenuItem,
            {
              onClick: wrap(
                () => exportExcel(
                  `recertification-due-${dateStamp()}.xlsx`,
                  "Recertification Due",
                  RECERT_HEADERS,
                  buildScheduledExportRows(recertRows, false)
                )
              ),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "size-4" }),
                " Excel (.xlsx)"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            DropdownMenuItem,
            {
              onClick: wrap(
                () => exportPdf(
                  `recertification-due-${dateStamp()}.pdf`,
                  "Recertification Due Facilities",
                  RECERT_HEADERS,
                  buildScheduledExportRows(recertRows, false),
                  `Validity window & deferred facilities — ${recertRows.length} facilities · generated ${dateStamp()}`
                )
              ),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-4" }),
                " PDF (.pdf)"
              ]
            }
          )
        ] })
      ] })
    ] })
  ] });
}

const Dashboard$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: Dashboard
}, Symbol.toStringTag, { value: 'Module' }));

export { BUCKET_ORDER as B, Dashboard$1 as D, BUCKET_BY_KEY as a, buildBlockTypeHeatmap as b };
