import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, I as Info, a9 as ArrowUp, q as Minus, a8 as ArrowDown } from './icons-BxQpodNr.js';
import { u as useVirtualizer } from './index-BALjev1w.js';
import { c as cn } from './index-CBV6wOh8.js';
import { b as buildCycleReport, O as OUTCOME_SEGMENTS, r as ratioLabel, R as RENEWAL_STEPS, m as medianDaysText } from './cycleReport-BZcLzeXW.js';
import { ci as formatVisitDate } from './AppShell-CP099uvN.js';
import { k as changeLabel } from './reportColumns-DJVmn3gI.js';
import { S as SEGMENT_COLORS } from './SegmentBar-BPZwoyP9.js';
import './vendor-charts--qXk384P.js';
import './vendor-jspdf-BarNdCns.js';
import './fiscalYear-QbChygln.js';
import './NqasLogo-CIWlMexW.js';
import './label-BaPkqXdo.js';
import './shareLink-_K-oJu5R.js';

const OUTCOME_COLOR_KEY = {
  quality: "certified",
  conditional: "conditional",
  deferred: "deferred",
  inProgress: "inProgress",
  notEligible: "notStarted"
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
  "#ca8a04"
];
function listHref(opts) {
  const p = new URLSearchParams();
  if (opts.cycle != null) p.set("cycleScope", String(opts.cycle));
  if (opts.type) p.set("type", opts.type);
  if (opts.block) p.set("block", opts.block);
  if (opts.cert?.length) p.set("cert", opts.cert.join(","));
  const s = p.toString();
  return `/facilities${s ? `?${s}` : ""}`;
}
function shortDate(iso) {
  if (!iso) return "-";
  return formatVisitDate(String(iso).slice(0, 10)) || "-";
}
function DaysChip({ days }) {
  if (days == null)
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex min-w-[76px] justify-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] whitespace-nowrap text-muted-foreground", children: "-" });
  const cls = days < 0 ? "border-rose-300 bg-rose-50 text-rose-800" : days <= 90 ? "border-amber-300 bg-amber-50 text-amber-900" : "border-emerald-300 bg-emerald-50 text-emerald-800";
  const label = days < 0 ? `Expired ${Math.abs(days)}d` : `${days} day${days === 1 ? "" : "s"}`;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      className: cn(
        "inline-flex min-w-[76px] justify-center rounded-full border px-2 py-0.5 text-[10px] tabular-nums whitespace-nowrap",
        cls
      ),
      children: label
    }
  );
}
function Drill({
  href,
  children,
  label,
  className
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "a",
    {
      href,
      "aria-label": label,
      "data-tip": label,
      className: cn(
        "rounded-sm underline-offset-2 tabular-nums hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className
      ),
      children
    }
  );
}
function FigureInfo({
  definition,
  formula,
  names,
  total,
  href,
  onOpen
}) {
  const [open, setOpen] = reactExports.useState(false);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "relative inline-flex align-middle", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        "aria-label": `What does “${definition}” mean?`,
        "aria-expanded": open,
        onClick: () => setOpen((v) => !v),
        className: "inline-flex size-4 items-center justify-center rounded-full text-muted-foreground/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { className: "size-3", "aria-hidden": true })
      }
    ),
    open && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "absolute top-5 left-0 z-30 block w-64 rounded-lg border border-border bg-background p-2 text-left shadow-lg", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-xs leading-snug font-semibold", children: definition }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mt-1 block text-[11px] text-muted-foreground", children: [
        "Formula: ",
        formula
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-1 block text-[11px] text-muted-foreground", children: total > 0 ? names.length ? `e.g. ${names.slice(0, 5).join(", ")}${total > 5 ? "…" : ""}` : `${total} facilities` : "No facilities match." }),
      total > 0 && (href ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "a",
        {
          href,
          className: "mt-1.5 inline-block text-[11px] font-medium text-primary hover:underline",
          children: [
            "Open all ",
            total
          ]
        }
      ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: () => {
            setOpen(false);
            onOpen?.();
          },
          className: "mt-1.5 text-[11px] font-medium text-primary hover:underline",
          children: [
            "Open all ",
            total
          ]
        }
      ))
    ] })
  ] });
}
function isoQuarterMatch(iso, quarterKey) {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  const fyStart = m >= 4 ? y : y - 1;
  const q = m >= 4 && m <= 6 ? 1 : m >= 7 && m <= 9 ? 2 : m >= 10 && m <= 12 ? 3 : 4;
  return `${fyStart}-Q${q}` === quarterKey;
}
function CycleReportView({
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
  onOpenFacility
}) {
  const [detailDim, setDetailDim] = reactExports.useState("type");
  const [splitByType, setSplitByType] = reactExports.useState(false);
  const [showChartTable, setShowChartTable] = reactExports.useState(false);
  const [boardMode, setBoardMode] = reactExports.useState(false);
  const [listScope, setListScope] = reactExports.useState("current");
  const report = reactExports.useMemo(
    () => buildCycleReport(rows, { today: generatedAt, settings, knownCycles }),
    [rows, generatedAt, settings, knownCycles]
  );
  const nameById = reactExports.useMemo(() => {
    const m = /* @__PURE__ */ new Map();
    for (const r of rows) if (!m.has(r.facilityId)) m.set(r.facilityId, r.facility);
    return m;
  }, [rows]);
  const names = (ids) => ids.map((id) => nameById.get(id) ?? id);
  const dueCount = report.renewals.buckets.filter((b) => b.key !== "later").reduce((n, b) => n + b.count, 0);
  const tabs = [
    { key: "overview", label: "Overview", count: report.overview.cards.length },
    { key: "renewals", label: "Renewals", count: dueCount },
    { key: "compare", label: "Compare", count: report.comparison.twoCycleFacilities },
    { key: "list", label: "List", count: report.list.length }
  ];
  const startedNotes = report.cycles.filter((c) => c.cycleNumber > 1 && c.facilities > 0).map((c) => `Cycle #${c.cycleNumber} started for ${c.facilities}`);
  const bucketKeys = bucket ? bucket.split(",").filter(Boolean) : [];
  const bucketHit = (e) => {
    if (bucketKeys.length === 0) return true;
    if (bucketKeys.includes(e.bucket ?? "")) return true;
    if (!e.certRow?.validityDate) return false;
    return bucketKeys.some(
      (k) => isoQuarterMatch(e.certRow.validityDate.slice(0, 10), k)
    );
  };
  const renewalsFiltered = reactExports.useMemo(
    () => report.renewals.scope.filter((e) => bucketHit(e) && (!step || e.step === step)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [report, bucket, step]
  );
  const currentCycle = report.cycles.find((c) => c.current)?.cycleNumber ?? 1;
  const listRows = reactExports.useMemo(() => {
    return report.list.filter((e) => {
      if (listScope === "all") return true;
      if (listScope === "current") return e.row.cycleNumber === currentCycle;
      return e.row.cycleNumber === listScope;
    });
  }, [report, listScope, currentCycle]);
  const openFacility = (id) => onOpenFacility?.(id);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "space-y-4", "data-testid": "cycle-report", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex flex-wrap items-end justify-between gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-base font-semibold", children: "Certification cycles" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-0.5 text-xs text-muted-foreground", "data-testid": "cycle-header-line", children: [
          report.distinctFacilities,
          " facilities",
          startedNotes.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            " · ",
            startedNotes.join(" · ")
          ] }),
          filtersText && filtersText !== "No filters" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            " · ",
            filtersText
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "p",
        {
          className: "text-[11px] text-muted-foreground",
          "aria-live": "polite",
          "data-testid": "cycle-counter",
          children: view === "renewals" ? `Showing ${renewalsFiltered.length} of ${report.renewals.scope.length} facilities` : view === "list" ? `Showing ${listRows.length} of ${report.list.length} facility-cycles` : `${report.facilityCycles} facility-cycles · ${report.distinctFacilities} facilities`
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        role: "tablist",
        "aria-label": "Certification cycle views",
        className: "flex flex-wrap items-center gap-1",
        children: tabs.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            role: "tab",
            type: "button",
            id: `cycle-view-${t.key}`,
            "aria-selected": view === t.key,
            "aria-controls": `cycle-panel-${t.key}`,
            onClick: () => onViewChange(t.key),
            className: cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              view === t.key ? "border-primary bg-primary text-primary-foreground" : "border-border/70 bg-background text-muted-foreground hover:text-foreground"
            ),
            children: [
              t.label,
              t.count > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1.5 text-xs tabular-nums opacity-80", children: t.count })
            ]
          },
          t.key
        ))
      }
    ),
    view === "overview" && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        id: "cycle-panel-overview",
        role: "tabpanel",
        "aria-labelledby": "cycle-view-overview",
        className: "space-y-4",
        children: [
          report.headline && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "p",
            {
              className: "rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-sm",
              "data-testid": "cycle-headline",
              children: report.headline
            }
          ),
          report.needsAction.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
              "data-testid": "needs-action-cards",
              children: report.needsAction.map((card) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "article",
                {
                  className: "rounded-xl border border-border/60 bg-background p-3",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-2xl font-semibold tabular-nums", children: card.count }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-xs text-muted-foreground", children: card.label }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        "data-testid": `needs-action-${card.key}`,
                        onClick: () => {
                          onBucketChange(card.filters.buckets.join(",") || null);
                          onStepChange(card.filters.step);
                          onViewChange("renewals");
                        },
                        className: "mt-2 inline-flex h-8 items-center rounded-lg border border-input px-2.5 text-xs font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                        children: "Open in Renewals"
                      }
                    )
                  ]
                },
                card.key
              ))
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-3 lg:grid-cols-2", children: report.overview.cards.map((card) => {
            const holdNames = names(
              card.segments.filter((s) => s.key === "quality" || s.key === "conditional").flatMap((s) => s.ids)
            );
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "article",
              {
                className: "rounded-xl border border-border/60 bg-background p-3",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-sm font-semibold", children: [
                      card.label,
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-2 text-[11px] font-normal text-muted-foreground", children: [
                        "· ",
                        card.status === "current" ? "current" : "closed"
                      ] })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-muted-foreground tabular-nums", children: [
                      card.facilities,
                      " facilities"
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1.5 text-sm", "data-testid": `hold-${card.cycleNumber}`, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Drill,
                      {
                        href: listHref({ cycle: card.cycleNumber }),
                        label: `${card.label}: hold a certificate`,
                        children: card.hold
                      }
                    ),
                    " ",
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-muted-foreground", children: [
                      "of ",
                      card.facilities
                    ] }),
                    " hold a certificate",
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-muted-foreground", children: [
                      " ",
                      card.holdText.replace(/^\d+ of \d+ hold a certificate ?/, "") || ""
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      FigureInfo,
                      {
                        definition: "Hold a certificate",
                        formula: "Quality Certified + Quality Certified with Conditionality in this cycle",
                        names: holdNames,
                        total: card.hold,
                        href: listHref({ cycle: card.cycleNumber })
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "div",
                    {
                      className: "mt-2 flex h-5 w-full overflow-hidden rounded-md bg-muted",
                      role: "img",
                      "aria-label": `${card.label} outcomes`,
                      children: OUTCOME_SEGMENTS.map((seg) => {
                        const s = card.segments.find((x) => x.key === seg.key);
                        if (s.count === 0) return null;
                        const pct = s.count / card.facilities * 100;
                        return /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "button",
                          {
                            type: "button",
                            onClick: () => s.ids[0] && openFacility(s.ids[0]),
                            "data-tip": `${seg.label}: ${s.count}`,
                            "aria-label": `${seg.label}: ${s.count} facilities`,
                            className: "h-full min-w-0 overflow-hidden text-[10px] leading-5 font-semibold text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                            style: {
                              width: `${pct}%`,
                              background: SEGMENT_COLORS[OUTCOME_COLOR_KEY[seg.key]],
                              backgroundImage: seg.key === "notEligible" ? "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,.4) 4px, rgba(255,255,255,.4) 7px)" : void 0
                            },
                            children: pct >= 12 ? s.count : ""
                          },
                          seg.key
                        );
                      })
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground", children: OUTCOME_SEGMENTS.filter(
                    (seg) => card.segments.find((x) => x.key === seg.key).count > 0
                  ).map((seg) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "span",
                      {
                        className: "size-2 rounded-sm",
                        style: {
                          background: SEGMENT_COLORS[OUTCOME_COLOR_KEY[seg.key]],
                          backgroundImage: seg.key === "notEligible" ? "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,.6) 2px, rgba(255,255,255,.6) 4px)" : void 0
                        },
                        "aria-hidden": true
                      }
                    ),
                    seg.label,
                    " ",
                    card.segments.find((x) => x.key === seg.key).count
                  ] }, seg.key)) })
                ]
              },
              card.cycleNumber
            );
          }) }),
          report.reconciliation.text && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground", "data-testid": "cycle-reconciliation", children: report.reconciliation.text }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            DetailsTable,
            {
              details: report.overview.details[detailDim],
              dim: detailDim,
              onDimChange: setDetailDim,
              cycles: report.cycles.filter((c) => c.facilities > 0),
              names
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[11px] text-muted-foreground", children: [
            "Validity:",
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                className: "font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                onClick: () => onViewChange("renewals"),
                children: "open in Renewals"
              }
            ),
            ". Surveillance details:",
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("a", { className: "font-medium text-primary hover:underline", href: "/reports?tab=linelists", children: "open in Line lists" }),
            "."
          ] })
        ]
      }
    ),
    view === "renewals" && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        id: "cycle-panel-renewals",
        role: "tabpanel",
        "aria-labelledby": "cycle-view-renewals",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          RenewalsPanel,
          {
            report,
            generatedAt,
            bucket,
            onBucketChange,
            step,
            onStepChange,
            filtered: renewalsFiltered,
            splitByType,
            setSplitByType,
            showChartTable,
            setShowChartTable,
            boardMode,
            setBoardMode,
            names,
            onOpenFacility: openFacility
          }
        )
      }
    ),
    view === "compare" && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        id: "cycle-panel-compare",
        role: "tabpanel",
        "aria-labelledby": "cycle-view-compare",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(ComparePanel, { report, names, onViewChange })
      }
    ),
    view === "list" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { id: "cycle-panel-list", role: "tabpanel", "aria-labelledby": "cycle-view-list", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      ListPanel,
      {
        rows: listRows,
        total: report.list.length,
        scope: listScope,
        onScopeChange: setListScope,
        cycles: report.cycles.filter((c) => c.facilities > 0),
        currentCycle,
        onOpenFacility: openFacility
      }
    ) })
  ] });
}
function DetailsTable({
  details,
  dim,
  onDimChange,
  cycles,
  names
}) {
  const first = cycles[0];
  if (!first)
    return /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "rounded-xl border border-dashed border-border/70 bg-muted/30 p-6 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "No facility-cycle matches these filters — clear a filter to see the breakdown." }) });
  const later = cycles.slice(1).filter(
    (c) => details.rows.some((r) => (r.cycles[c.cycleNumber]?.facilities ?? 0) > 0)
  );
  const groupLabel = dim === "type" ? "Facility Type" : "Block";
  const hrefFor = (cycleNumber, row, certifiedOnly = false) => listHref({
    cycle: cycleNumber,
    ...row && row.label !== "All" ? dim === "type" ? { type: row.label } : { block: row.label } : {},
    ...certifiedOnly ? { cert: ["Quality Certified", "Quality Certified with Conditionality"] } : {}
  });
  const cell = (row, c, key) => row.cycles[c.cycleNumber]?.[key] ?? null;
  const num = (v) => v == null || v === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "-" }) : v;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-xl border border-border/60 bg-background", "aria-label": "Details", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold", children: "Details" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          role: "group",
          "aria-label": "Group the details by",
          className: "flex rounded-lg border border-input p-0.5",
          children: ["type", "block"].map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              "aria-pressed": dim === d,
              onClick: () => onDimChange(d),
              className: cn(
                "rounded-md px-2.5 py-1 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                dim === d ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              ),
              children: d === "type" ? "Facility Type" : "Block"
            },
            d
          ))
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "table",
      {
        className: "w-full border-collapse text-xs",
        "data-testid": "cycle-details-table",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("caption", { className: "sr-only", children: [
            "Facilities and certificates by ",
            groupLabel,
            " for every certification cycle"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("thead", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/60 text-[11px] text-muted-foreground", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "th",
                {
                  rowSpan: 2,
                  scope: "col",
                  className: "sticky left-0 z-10 min-w-[140px] border-r border-border/60 bg-muted px-2 py-1.5 text-left font-semibold",
                  children: groupLabel
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "th",
                {
                  colSpan: 4,
                  scope: "colgroup",
                  className: "border-r border-border/60 px-2 py-1.5 text-center font-semibold tracking-wide uppercase",
                  children: first?.label
                }
              ),
              later.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                "th",
                {
                  colSpan: 2,
                  scope: "colgroup",
                  className: "border-r border-border/60 px-2 py-1.5 text-center font-semibold tracking-wide uppercase",
                  children: c.label
                },
                c.cycleNumber
              ))
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/60 text-[11px] text-muted-foreground", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-2 py-1 text-right font-medium whitespace-nowrap", children: "Facilities" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-2 py-1 text-right font-medium whitespace-nowrap", children: "Certified" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-2 py-1 text-right font-medium whitespace-nowrap", children: "Certified %" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "border-r border-border/60 px-2 py-1 text-right font-medium whitespace-nowrap", children: "In progress" }),
              later.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-2 py-1 text-right font-medium whitespace-nowrap", children: "Facilities" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "border-r border-border/60 px-2 py-1 text-right font-medium whitespace-nowrap", children: "Certified" })
              ] }, c.cycleNumber))
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
            details.rows.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/40", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "th",
                {
                  scope: "row",
                  className: "sticky left-0 z-10 border-r border-border/60 bg-background px-2 py-1.5 text-left font-medium whitespace-nowrap",
                  children: row.label
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1.5 text-right tabular-nums", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Drill, { href: hrefFor(first.cycleNumber, row), label: `${row.label}: facilities`, children: num(cell(row, first, "facilities")) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1.5 text-right tabular-nums", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Drill,
                {
                  href: hrefFor(first.cycleNumber, row, true),
                  label: `${row.label}: certified`,
                  children: num(cell(row, first, "certified"))
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1.5 text-right tabular-nums", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1", children: [
                ratioLabel(cell(row, first, "certified") ?? 0, cell(row, first, "facilities") ?? 0),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  FigureInfo,
                  {
                    definition: "Certified %",
                    formula: "(Quality + Conditional) ÷ facilities in this row; under 5 facilities it reads “part of whole”",
                    names: names(row.cycles[first.cycleNumber]?.certifiedIds ?? []),
                    total: cell(row, first, "certified") ?? 0,
                    href: hrefFor(first.cycleNumber, row, true)
                  }
                )
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "border-r border-border/60 px-2 py-1.5 text-right tabular-nums", children: num(cell(row, first, "inProgress")) }),
              later.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1.5 text-right tabular-nums", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Drill, { href: hrefFor(c.cycleNumber, row), label: `${row.label}: facilities`, children: num(cell(row, c, "facilities")) }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "border-r border-border/60 px-2 py-1.5 text-right tabular-nums", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Drill,
                  {
                    href: hrefFor(c.cycleNumber, row, true),
                    label: `${row.label}: certified`,
                    children: num(cell(row, c, "certified"))
                  }
                ) })
              ] }, c.cycleNumber))
            ] }, row.label)),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t-2 border-border bg-muted font-semibold", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "th",
                {
                  scope: "row",
                  className: "sticky left-0 z-10 border-r border-border/60 bg-muted px-2 py-1.5 text-left",
                  children: details.totals.label
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1.5 text-right tabular-nums", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Drill, { href: hrefFor(first.cycleNumber, null), label: "All facilities", children: num(cell(details.totals, first, "facilities")) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1.5 text-right tabular-nums", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Drill, { href: hrefFor(first.cycleNumber, null, true), label: "All certified", children: num(cell(details.totals, first, "certified")) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1.5 text-right tabular-nums", children: ratioLabel(
                cell(details.totals, first, "certified") ?? 0,
                cell(details.totals, first, "facilities") ?? 0
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "border-r border-border/60 px-2 py-1.5 text-right tabular-nums", children: num(cell(details.totals, first, "inProgress")) }),
              later.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1.5 text-right tabular-nums", children: num(cell(details.totals, c, "facilities")) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "border-r border-border/60 px-2 py-1.5 text-right tabular-nums", children: num(cell(details.totals, c, "certified")) })
              ] }, c.cycleNumber))
            ] })
          ] })
        ]
      }
    ) })
  ] });
}
const URGENCY_COLOR = {
  expired: "#dc2626",
  soon: "#d97706",
  later: "#0284c7"
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
  onOpenFacility
}) {
  const types = reactExports.useMemo(() => {
    const counts = /* @__PURE__ */ new Map();
    for (const e of report.renewals.scope)
      counts.set(e.type, (counts.get(e.type) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [report]);
  const segmentsFor = (col) => {
    if (!splitByType)
      return [{ label: col.label, value: col.total, color: URGENCY_COLOR[col.urgency], hatch: col.urgency === "expired" }];
    const top = types.slice(0, 7).map(([t]) => t);
    const acc = /* @__PURE__ */ new Map();
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
      index: i
    }));
  };
  const legend = reactExports.useMemo(() => {
    const seen = [];
    for (const col of report.renewals.chart)
      for (const s of segmentsFor(col))
        if (!seen.some((x) => x.label === s.label))
          seen.push({ label: s.label, color: s.color, hatch: s.hatch });
    return seen.slice(0, 8);
  }, [report, splitByType, types]);
  const maxTotal = Math.max(1, ...report.renewals.chart.map((c) => c.total));
  const validTillLabel = (e) => shortDate(e.certRow?.validityDate ?? null);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-1.5", "data-testid": "renewal-buckets", children: [
      report.renewals.buckets.map((b) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          "aria-pressed": bucket === b.key,
          "data-testid": `bucket-${b.key}`,
          onClick: () => onBucketChange(bucket === b.key ? null : b.key),
          className: cn(
            "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            bucket === b.key ? "border-primary bg-primary text-primary-foreground" : "border-border/70 bg-background hover:bg-muted"
          ),
          children: [
            b.label,
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "tabular-nums opacity-80", children: b.count })
          ]
        },
        b.key
      )),
      report.renewals.certifiedNoValidity.count > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "span",
        {
          className: "inline-flex min-h-8 items-center rounded-full border border-dashed border-amber-400 px-2.5 text-xs text-amber-800",
          "data-tip": "Certified, but no validity date is recorded — see Needs attention",
          children: [
            "Certified, no validity date ",
            report.renewals.certifiedNoValidity.count
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-xl border border-border/60 bg-background p-3", "aria-label": "Validity end by quarter", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold", children: "Certificate validity by quarter" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-[11px] text-muted-foreground", children: "Already expired, then the next 8 quarters. Click a column to filter the list." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 text-[11px]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              "aria-pressed": splitByType,
              onClick: () => setSplitByType(!splitByType),
              className: "rounded-md border border-input px-2 py-0.5 font-medium text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              children: "Split by Facility Type"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              "aria-pressed": showChartTable,
              onClick: () => setShowChartTable(!showChartTable),
              className: "rounded-md border border-input px-2 py-0.5 font-medium text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              children: showChartTable ? "Show chart" : "Show as table"
            }
          )
        ] })
      ] }),
      !showChartTable ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 overflow-x-auto pb-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "flex min-w-[640px] items-end gap-2",
            style: { height: 180 },
            "data-active": bucket ?? "",
            role: "img",
            "aria-label": "Certificate validity end dates by quarter",
            "data-testid": "renewal-chart",
            children: report.renewals.chart.map((col) => {
              const segs = segmentsFor(col);
              const activeKeys = (bucket ?? "").split(",").filter(Boolean);
              const active = activeKeys.includes(col.key) || !!col.quarterKey && activeKeys.includes(col.quarterKey);
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  "data-testid": `chart-col-${col.key}`,
                  "aria-label": `${col.label}${col.subLabel ? ` ${col.subLabel}` : ""}: ${col.total} facilities`,
                  onClick: () => onBucketChange(active ? null : col.quarterKey ?? col.bucket ?? col.key),
                  className: cn(
                    "group flex h-full min-w-[56px] flex-1 cursor-pointer flex-col justify-end rounded-md px-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    active && "ring-2 ring-primary"
                  ),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mb-1 text-center text-[11px] font-semibold tabular-nums", children: col.total > 0 ? col.total : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "0" }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex w-full flex-col justify-end", style: { height: 130 }, children: segs.filter((s) => s.value > 0).map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "span",
                      {
                        "data-tip": `${s.label}: ${s.value}`,
                        "aria-hidden": true,
                        style: {
                          height: `${s.value / maxTotal * 100}%`,
                          background: s.color,
                          backgroundImage: s.hatch ? "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,.45) 3px, rgba(255,255,255,.45) 6px)" : void 0
                        },
                        className: "w-full"
                      },
                      s.label
                    )) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mt-1 block w-full text-center leading-tight", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[10px] text-foreground", children: col.label }),
                      col.subLabel && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[10px] text-muted-foreground", children: col.subLabel })
                    ] })
                  ]
                },
                col.key
              );
            })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground", children: legend.map((l) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: "size-2.5 rounded-sm",
              style: {
                background: l.color,
                backgroundImage: l.hatch ? "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,.6) 2px, rgba(255,255,255,.6) 4px)" : void 0
              },
              "aria-hidden": true
            }
          ),
          l.label
        ] }, l.label)) })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full border-collapse text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("caption", { className: "text-left text-[11px] font-semibold", children: "Validity end dates by quarter" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/60 text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-2 py-1 text-left font-medium", children: "Quarter" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-2 py-1 text-right font-medium", children: "Facilities" }),
          splitByType && types.map(([t]) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-2 py-1 text-right font-medium", children: t }, t))
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: report.renewals.chart.map((col) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/40", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("th", { scope: "row", className: "px-2 py-1 text-left font-medium", children: [
            col.label,
            col.subLabel ? ` · ${col.subLabel}` : ""
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1 text-right tabular-nums", children: col.total || "-" }),
          splitByType && types.map(([t]) => /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1 text-right tabular-nums", children: col.byType[t] || "-" }, t))
        ] }, col.key)) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap items-center gap-1.5", "data-testid": "renewal-steps", children: report.renewals.steps.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        "aria-pressed": step === s.key,
        "data-testid": `step-${s.key}`,
        "data-tip": s.notRecorded > 0 ? `${s.tip} ${s.notRecorded} with no recorded source data.` : s.tip,
        onClick: () => onStepChange(step === s.key ? null : s.key),
        className: cn(
          "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          step === s.key ? "border-primary bg-primary text-primary-foreground" : "border-border/70 bg-background hover:bg-muted"
        ),
        children: [
          s.label,
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "tabular-nums opacity-80", children: s.count })
        ]
      },
      s.key
    )) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-xl border border-border/60 bg-background", "aria-label": "Renewal list", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[11px] text-muted-foreground", "aria-live": "polite", children: [
          filtered.length,
          " of ",
          report.renewals.scope.length,
          " facilities · soonest expiry first"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              role: "group",
              "aria-label": "Layout",
              className: "hidden rounded-lg border border-input p-0.5 md:flex",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    "aria-pressed": !boardMode,
                    onClick: () => setBoardMode(false),
                    className: cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium",
                      !boardMode ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    ),
                    children: "List"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    "aria-pressed": boardMode,
                    onClick: () => setBoardMode(true),
                    className: cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium",
                      boardMode ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    ),
                    children: "Board"
                  }
                )
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[11px] text-muted-foreground", children: [
            "Data as of ",
            generatedAt
          ] })
        ] })
      ] }),
      boardMode ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-2 overflow-x-auto p-2 md:grid-cols-6", children: RENEWAL_STEPS.map((s) => {
        const items = filtered.filter((e) => e.step === s.key);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-[180px] rounded-lg border border-border/60 p-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center justify-between text-[11px] font-semibold", children: [
            s.label,
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "tabular-nums text-muted-foreground", children: items.length })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "mt-1.5 space-y-1.5", children: [
            items.map((e) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: () => onOpenFacility(e.facilityId),
                className: "w-full rounded-md border border-border/60 bg-background px-2 py-1.5 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block truncate text-xs font-medium", children: e.facility }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mt-0.5 block text-[10px] text-muted-foreground", children: [
                    e.type,
                    " · ",
                    validTillLabel(e)
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(DaysChip, { days: e.daysLeft })
                ]
              }
            ) }, e.facilityId)),
            items.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("li", { className: "text-[10px] text-muted-foreground", children: "No facility" })
          ] })
        ] }, s.key);
      }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full border-collapse text-xs", "data-testid": "renewal-table", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "sticky top-0 z-10 bg-muted/90", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/60 text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "sticky left-0 z-10 min-w-[160px] border-r border-border/60 bg-muted/90 px-2 py-1.5 text-left font-medium", children: "Facility" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-2 py-1.5 text-left font-medium whitespace-nowrap", children: "Type" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-2 py-1.5 text-left font-medium", children: "Block" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-2 py-1.5 text-left font-medium whitespace-nowrap", children: "Valid till" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-2 py-1.5 text-left font-medium whitespace-nowrap", children: "Days left" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-2 py-1.5 text-left font-medium whitespace-nowrap", children: "Renewal step" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-2 py-1.5 text-left font-medium", children: "Next action" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-2 py-1.5 text-right font-medium", children: "Open" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
          filtered.map((e) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/40 hover:bg-muted/40", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "row", className: "sticky left-0 z-10 border-r border-border/60 bg-background px-2 py-1.5 text-left font-medium", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                className: "text-left hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                onClick: () => onOpenFacility(e.facilityId),
                children: e.facility
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1.5 whitespace-nowrap", children: e.type }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1.5", children: e.block }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1.5 whitespace-nowrap", children: validTillLabel(e) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(DaysChip, { days: e.daysLeft }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1.5 whitespace-nowrap", children: RENEWAL_STEPS.find((s) => s.key === e.step)?.label ?? "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1.5 text-muted-foreground", children: e.nextAction }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1.5 text-right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                className: "rounded-md border border-input px-2 py-0.5 text-[11px] font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                onClick: () => onOpenFacility(e.facilityId),
                children: "Open"
              }
            ) })
          ] }, e.facilityId)),
          filtered.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 8, className: "px-3 py-6 text-center text-muted-foreground", children: "No facilities match these filters." }) })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx("a", { className: "font-medium text-primary hover:underline", href: "/reports?tab=linelists", children: "Surveillance details: open in Line lists" }) })
  ] });
}
function ComparePanel({
  report,
  names,
  onViewChange
}) {
  const c = report.comparison;
  if (!c.available)
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-dashed border-border/70 bg-muted/30 p-6 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "No facility has started Cycle #2 yet. See Renewals for what is coming." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: () => onViewChange("renewals"),
          className: "mt-3 inline-flex h-8 items-center rounded-lg border border-input px-2.5 text-xs font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          children: "Open Renewals"
        }
      )
    ] });
  const fromCycle = c.rows[0]?.fromCycle ?? 1;
  const toCycle = c.rows[0]?.toCycle ?? 2;
  const bothScoreRows = c.rows.filter((r) => r.delta != null);
  const showDumbbell = c.twoCycleFacilities >= 5 && c.axis != null;
  const axis = c.axis ?? { min: 0, max: 100 };
  const axisSpan = Math.max(1, axis.max - axis.min);
  const pctOf = (score) => (score - axis.min) / axisSpan * 100;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", "data-testid": "compare-panel", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2 text-xs", "data-testid": "compare-summary", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUp, { className: "size-3", "aria-hidden": true }),
        " ",
        c.improved,
        " improved"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Minus, { className: "size-3", "aria-hidden": true }),
        " ",
        c.unchanged,
        " same"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDown, { className: "size-3", "aria-hidden": true }),
        " ",
        c.declined,
        " declined"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded-full border border-border px-2 py-0.5", children: [
        c.conditionalityResolved,
        " conditionality resolved"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded-full border border-border px-2 py-0.5", children: [
        c.recertifiedOnTime,
        " on time · ",
        c.recertifiedLate,
        " late"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded-full border border-border px-2 py-0.5", children: [
        "Median between certifications: ",
        medianDaysText(c.medianDaysBetweenCerts)
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded-full border border-dashed border-border/70 px-2 py-0.5 text-muted-foreground", children: [
        bothScoreRows.length,
        " of ",
        c.twoCycleFacilities,
        " rows have both scores"
      ] })
    ] }),
    showDumbbell && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-xl border border-border/60 bg-background p-3", "aria-label": "Score comparison", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-baseline justify-between gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-xs font-semibold tracking-wide text-muted-foreground uppercase", children: [
          "Dumbbell · score Cycle #",
          fromCycle,
          " vs Cycle #",
          toCycle
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[11px] text-muted-foreground", "data-testid": "dumbbell-axis-note", children: [
          "Axis ",
          axis.min,
          "–",
          axis.max,
          ", fitted to this data (not 0–100)"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 space-y-1.5", children: c.dumbbell.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-[11px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "a",
          {
            href: `/facilities/${r.facilityId}`,
            className: "w-40 shrink-0 truncate hover:underline",
            "data-tip": r.facility,
            children: r.facility
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative h-4 flex-1 rounded-sm bg-muted/50", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "absolute top-1/2 h-0.5 -translate-y-1/2 bg-foreground/40",
              style: {
                left: `${Math.min(pctOf(r.fromScore ?? 0), pctOf(r.toScore ?? 0))}%`,
                width: `${Math.max(
                  Math.abs(pctOf(r.toScore ?? 0) - pctOf(r.fromScore ?? 0)),
                  0.5
                )}%`
              }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: "absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-background bg-sky-600",
              style: { left: `${pctOf(r.fromScore ?? 0)}%` },
              "data-tip": `Cycle #${r.fromCycle}: ${r.fromScore?.toFixed(2)}`
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: "absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-background bg-emerald-600",
              style: { left: `${pctOf(r.toScore ?? 0)}%` },
              "data-tip": `Cycle #${r.toCycle}: ${r.toScore?.toFixed(2)}`
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-20 shrink-0 text-right tabular-nums", children: changeLabel(r.delta) })
      ] }, r.facilityId)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 flex justify-between text-[10px] text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: axis.min }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: axis.max })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "rounded-xl border border-border/60 bg-background", "aria-label": "Comparison table", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full border-collapse text-xs", "data-testid": "compare-table", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("thead", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/60 text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { rowSpan: 2, scope: "col", className: "sticky left-0 z-10 min-w-[150px] border-r border-border/60 bg-muted px-2 py-1.5 text-left font-medium", children: "Facility" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { rowSpan: 2, scope: "col", className: "px-2 py-1.5 text-left font-medium", children: "Type" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("th", { colSpan: 4, scope: "colgroup", className: "border-x border-border/60 px-2 py-1 text-center text-[11px] font-semibold tracking-wide uppercase", children: [
            "Cycle #",
            fromCycle
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("th", { colSpan: 3, scope: "colgroup", className: "border-x border-border/60 px-2 py-1 text-center text-[11px] font-semibold tracking-wide uppercase", children: [
            "Cycle #",
            toCycle
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { rowSpan: 2, scope: "col", className: "px-2 py-1.5 text-right font-medium", children: "Change" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { rowSpan: 2, scope: "col", className: "px-2 py-1.5 text-left font-medium", children: "Renewal" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/60 text-[11px] text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-2 py-1 text-left font-medium", children: "Result" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-2 py-1 text-right font-medium", children: "Score" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-2 py-1 text-left font-medium whitespace-nowrap", children: "Certified on" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "border-x border-border/60 px-2 py-1 text-left font-medium whitespace-nowrap", children: "Valid till" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-2 py-1 text-left font-medium", children: "Result" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-2 py-1 text-right font-medium", children: "Score" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "border-r border-border/60 px-2 py-1 text-left font-medium whitespace-nowrap", children: "Certified on" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: c.rows.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/40", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "row", className: "sticky left-0 z-10 border-r border-border/60 bg-background px-2 py-1.5 text-left font-medium", children: /* @__PURE__ */ jsxRuntimeExports.jsx("a", { className: "hover:underline", href: `/facilities/${r.facilityId}`, children: r.facility }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1.5 whitespace-nowrap", children: r.type }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1.5", children: r.fromResult }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1.5 text-right tabular-nums", children: r.fromScore?.toFixed(2) ?? "-" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1.5 whitespace-nowrap", children: shortDate(r.fromCertifiedOn) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "border-x border-border/60 px-2 py-1.5 whitespace-nowrap", children: shortDate(r.fromValidTill) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1.5", children: r.toResult }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1.5 text-right tabular-nums", children: r.toScore?.toFixed(2) ?? "-" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "border-r border-border/60 px-2 py-1.5 whitespace-nowrap", children: shortDate(r.toCertifiedOn) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1.5 text-right tabular-nums", children: changeLabel(r.delta) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1.5", "data-testid": `timing-${r.facilityId}`, children: r.timing.text })
      ] }, r.facilityId)) })
    ] }) }) })
  ] });
}
const LIST_ROW_HEIGHT = 40;
function ListPanel({
  rows,
  total,
  scope,
  onScopeChange,
  cycles,
  currentCycle,
  onOpenFacility
}) {
  const parentRef = reactExports.useRef(null);
  const showCycle = scope === "all";
  const template = [
    "minmax(170px,1.3fr)",
    "92px",
    "110px",
    ...showCycle ? ["118px"] : [],
    "104px",
    "74px",
    "112px",
    "172px",
    "150px",
    "minmax(200px,1.4fr)"
  ].join(" ");
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => LIST_ROW_HEIGHT,
    overscan: 10
  });
  const cellCls = "flex items-center gap-1 overflow-hidden px-2 whitespace-nowrap";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-xl border border-border/60 bg-background", "aria-label": "Facility-cycle list", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          role: "group",
          "aria-label": "Which cycles to list",
          className: "flex flex-wrap rounded-lg border border-input p-0.5",
          children: ["current", 1, 2, "all"].map((s) => {
            const label = s === "current" ? "Current" : s === "all" ? "All cycles" : `Cycle #${s}`;
            const disabled = s !== "current" && s !== "all" && !cycles.some((c) => c.cycleNumber === s);
            return /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                disabled,
                "aria-pressed": scope === s,
                "data-testid": `list-scope-${s}`,
                onClick: () => onScopeChange(s),
                className: cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-40",
                  scope === s ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                ),
                children: label
              },
              String(s)
            );
          })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[11px] text-muted-foreground", "aria-live": "polite", children: [
        rows.length,
        " of ",
        total,
        " facility-cycles · one row per facility-cycle"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "sticky top-0 z-20 grid bg-muted/90 text-[11px] font-medium text-muted-foreground backdrop-blur",
          style: { gridTemplateColumns: template },
          role: "row",
          children: [
            "Facility",
            "Type",
            "Block",
            ...showCycle ? ["Cycle"] : [],
            "Result",
            "Score",
            "Certified on",
            "Valid till",
            "Renewal step",
            "Next action"
          ].map((h, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              role: "columnheader",
              className: cn(
                cellCls,
                "border-b border-border/60",
                i === 0 && "sticky left-0 z-30 bg-muted/95",
                h === "Score" && "justify-end text-right"
              ),
              children: h
            },
            h
          ))
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { ref: parentRef, className: "max-h-[62vh] overflow-auto", "data-testid": "cycle-list-scroll", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "relative w-full",
            style: { height: virtualizer.getTotalSize() },
            children: virtualizer.getVirtualItems().map((vi) => {
              const e = rows[vi.index];
              if (!e) return null;
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "div",
                {
                  className: "absolute top-0 left-0 grid w-full items-center border-b border-border/40 text-xs hover:bg-muted/40",
                  style: {
                    transform: `translateY(${vi.start}px)`,
                    height: vi.size,
                    gridTemplateColumns: template
                  },
                  role: "row",
                  tabIndex: 0,
                  "data-testid": "cycle-list-row",
                  onDoubleClick: () => onOpenFacility(e.row.facilityId),
                  onKeyDown: (ev) => {
                    if (ev.key === "Enter") {
                      ev.preventDefault();
                      onOpenFacility(e.row.facilityId);
                    }
                  },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn(cellCls, "sticky left-0 z-10 bg-background font-medium"), children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        className: "truncate hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                        onClick: () => onOpenFacility(e.row.facilityId),
                        children: e.row.facility
                      }
                    ) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cellCls, children: e.row.type }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cellCls, children: e.row.block }),
                    showCycle && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cellCls, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-border/60 bg-muted px-1.5 py-0.5 text-[10px] whitespace-nowrap", children: e.cycleLabel }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cellCls, children: e.resultLabel }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn(cellCls, "justify-end text-right tabular-nums"), children: e.score?.toFixed(2) ?? "-" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cellCls, children: shortDate(e.row.certDate) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: cellCls, children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 truncate", children: shortDate(e.row.validityDate) }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(DaysChip, { days: e.daysLeft })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cellCls, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: RENEWAL_STEPS.find((s) => s.key === e.step)?.label ?? "-" }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn(cellCls, "text-muted-foreground"), children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: e.nextAction }) })
                  ]
                },
                e.row.cycleId
              );
            })
          }
        ),
        rows.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-3 py-8 text-center text-sm text-muted-foreground", children: "No facility-cycles match these filters." })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "border-t border-border/60 px-3 py-2 text-[11px] text-muted-foreground", children: [
      "Started dates are removed: a cycle starts with its own first record. Surveillance details:",
      " ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("a", { className: "font-medium text-primary hover:underline", href: "/reports?tab=linelists", children: "open in Line lists" }),
      "."
    ] })
  ] });
}

export { CycleReportView };
