import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, u as FileText, a2 as Download, T as TriangleAlert, Q as Search, a8 as ArrowDown, a9 as ArrowUp } from './icons-BxQpodNr.js';
import { n as useParams, l as useQuery, j as api, u as useAuth, B as Button } from './index-CBV6wOh8.js';
import { M as MASTER_COLUMNS, k as cellText, A as AppShell } from './AppShell-CP099uvN.js';
import { F as FacilityCell } from './FacilityCell-CI45DpPw.js';
import { I as Input } from './input-Cy2oZLur.js';
import { l as lineListTemplate } from './lineListTemplates-Bxak1gVr.js';
import { a as applyLineListFilters, s as sortLineListRows, D as DEFAULT_LINE_LIST_EXPORT, r as runLineListExport } from './lineListExport-Cwr38yWb.js';
import { t as todayLocalIso } from './today-D9v8Esj5.js';
import { p as prunePivotConfig, d as defaultPivotConfig, a as applyDateLabelOptions, c as createPivotFields, b as buildPivot, P as PivotTable, s as statusColumnIndexes, E as ExportDialog } from './ExportDialog-BCGO8BQ0.js';
import './vendor-jspdf-BarNdCns.js';
import './vendor-charts--qXk384P.js';
import './NqasLogo-CIWlMexW.js';
import './label-BaPkqXdo.js';
import './shareLink-_K-oJu5R.js';
import './FacilityTypeBadge-8G3otPEU.js';
import './buildingBuckets-CQds7ysI.js';
import './masterFilter-DrauVhuN.js';
import './facilityQuickView-BCxVjMPj.js';
import './facilityProfileState-D76_z1Ay.js';
import './masterExport-Dlb4N-po.js';
import './org-DjtYn14q.js';
import './facilitySheet-LEzrIYOJ.js';
import './scoreBands-CA46Kez8.js';
import './phone-C-n0eG_z.js';
import './masterReportPrint-CpdXQQkg.js';
import './table-DH4Byhhd.js';
import './dialog-BW3GEiPg.js';
import './select-qTILnHQg.js';
import './vendor-exceljs-CqnmHTS6.js';
import './trackerColumns-8Ekg9xb3.js';

function saveBlobRaw(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
const DEFAULT_STYLE = {
  subtotals: true,
  grandTotals: true,
  grandTotalColumn: true,
  striped: true,
  borders: true,
  highlightTotals: true
};
function CustomPage() {
  const { slug = "" } = useParams();
  const page = useQuery(api.pages.getBySlug, { slug });
  const settings = useQuery(api.facilities.getAppSettings, {});
  const { user } = useAuth();
  const def = page?.definition ?? {};
  const sourceQ = useQuery(
    api.reportDefinitions.get,
    page?.sourceReportId ? { id: page.sourceReportId } : "skip"
  );
  const data = useQuery(api.ops.listFacilityRowsFast, {
    cycle: def.cycle === "all" ? "all" : "current"
  });
  const [query, setQuery] = reactExports.useState("");
  const [activeQuick, setActiveQuick] = reactExports.useState(
    () => Array.isArray(def.quick) ? def.quick : []
  );
  const [sortKey, setSortKey] = reactExports.useState(null);
  const [desc, setDesc] = reactExports.useState(false);
  const [busy, setBusy] = reactExports.useState(false);
  const [exportOpen, setExportOpen] = reactExports.useState(false);
  const [exportFormat, setExportFormat] = reactExports.useState("pdf");
  const [colWidths, setColWidths] = reactExports.useState({});
  reactExports.useEffect(() => {
    if (!page) return;
    const saved = Array.isArray(def.quick) ? def.quick : [];
    setActiveQuick(
      saved.map(
        (value) => template.quickFilters.find((f) => f.id === value || f.test === value)?.id
      ).filter((value) => !!value)
    );
    const firstSort = def.sort?.[0];
    if (firstSort) {
      setSortKey(firstSort.id);
      setDesc(!!firstSort.desc);
    } else {
      setSortKey(null);
      setDesc(false);
    }
  }, [page?.id]);
  const columns = reactExports.useMemo(
    () => MASTER_COLUMNS.filter(
      (c) => def.columns?.includes(c.key) || c.pinned === true
    ),
    [def.columns]
  );
  const overrides = settings?.settings.tableHeaderOverrides ?? {};
  const labelOf = (key, fallback) => overrides[fallback] ?? fallback;
  const allRows = data?.rows ?? [];
  const template = reactExports.useMemo(
    () => lineListTemplate(def.templateId ?? "custom"),
    [def.templateId]
  );
  const lineListDef = reactExports.useMemo(
    () => ({
      ...def,
      columns,
      sort: def.sort ?? [],
      quick: activeQuick,
      and: Array.isArray(def.and) ? def.and : [],
      or: Array.isArray(def.or) ? def.or : [],
      blocks: Array.isArray(def.blocks) ? def.blocks : [],
      phcs: Array.isArray(def.phcs) ? def.phcs : [],
      types: Array.isArray(def.types) ? def.types : [],
      statuses: Array.isArray(def.statuses) ? def.statuses : []
    }),
    [def, columns, activeQuick]
  );
  const rows = reactExports.useMemo(() => {
    const scoped = applyLineListFilters(
      allRows,
      lineListDef,
      template,
      todayLocalIso()
    );
    const q = query.trim().toLowerCase();
    const filtered = q ? scoped.filter(
      (r) => columns.some((c) => cellText(r, c.key).toLowerCase().includes(q))
    ) : scoped;
    if (!sortKey) return sortLineListRows(filtered, lineListDef.sort);
    return [...filtered].sort((a, b) => {
      const cmp = cellText(a, sortKey).localeCompare(cellText(b, sortKey), void 0, {
        numeric: true
      });
      return desc ? -cmp : cmp;
    });
  }, [allRows, columns, query, sortKey, desc, lineListDef, template]);
  const groupedRows = reactExports.useMemo(() => {
    const groupBy = def.groupBy ?? null;
    if (!groupBy) return [{ key: null, rows }];
    const groups = /* @__PURE__ */ new Map();
    for (const row of rows) {
      const key = cellText(row, groupBy).trim() || "(blank)";
      const list = groups.get(key) ?? [];
      list.push(row);
      groups.set(key, list);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, list]) => ({ key, rows: list }));
  }, [rows, def.groupBy]);
  const snapshot = def.reportSnapshot ?? {};
  const reportConfig = reactExports.useMemo(
    () => prunePivotConfig(snapshot.config ?? defaultPivotConfig(), /* @__PURE__ */ new Set()),
    [snapshot.config]
  );
  const reportFields = reactExports.useMemo(
    () => applyDateLabelOptions(
      createPivotFields(settings?.settings),
      snapshot.monthLabels ?? "friendly"
    ),
    [settings, snapshot.monthLabels]
  );
  const reportStyle = { ...DEFAULT_STYLE, ...snapshot.style ?? {} };
  const searchableRows = reactExports.useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return allRows;
    return allRows.filter((row) => {
      const f = row.facility ?? {};
      return [f.name, f.ninNumber, f.block, f.phc, f.facilityType].filter(Boolean).join(" ").toLowerCase().includes(term);
    });
  }, [allRows, query]);
  const reportResult = reactExports.useMemo(
    () => buildPivot({
      rows: searchableRows,
      fields: reportFields,
      config: reportConfig,
      collapsed: /* @__PURE__ */ new Set(),
      options: {
        showSubtotals: reportStyle.subtotals,
        showGrandTotals: reportStyle.grandTotals
      }
    }),
    [searchableRows, reportFields, reportConfig, reportStyle.subtotals, reportStyle.grandTotals]
  );
  const title = page?.name ?? "Page";
  const isReport = page?.type === "report";
  const sourceGone = isReport && !!page?.sourceReportId && (sourceQ?.status === "missing" || sourceQ?.status === "deleted");
  const doExport = async (format) => {
    if (!page) return;
    setBusy(true);
    try {
      const plan = {
        ...DEFAULT_LINE_LIST_EXPORT,
        format,
        includeSummary: def.summaryOn ?? false
      };
      await runLineListExport({
        plan,
        rows,
        columns,
        labels: Object.fromEntries(columns.map((c) => [c.key, labelOf(c.key, c.label)])),
        topic: page.name,
        filtersText: query ? `Search: ${query}` : "No filters",
        generatedBy: user?.name ?? user?.email ?? "State Admin",
        district: settings?.settings?.districtName || "District",
        singleBlock: null,
        totalRows: allRows.length,
        saveBlob: (buf, name) => saveBlobRaw(new Blob([buf]), name),
        saveBlobRaw
      });
    } finally {
      setBusy(false);
    }
  };
  if (page === null)
    return /* @__PURE__ */ jsxRuntimeExports.jsx(AppShell, { title: "Page not found", titleIcon: FileText, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-xl py-20 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "mx-auto h-8 w-8 text-muted-foreground" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "mt-3 text-lg font-semibold", children: "Page not found" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "This page was removed, hidden, or it is not shared with your role." })
    ] }) });
  if (!page)
    return /* @__PURE__ */ jsxRuntimeExports.jsx(AppShell, { title: "Page", titleIcon: FileText, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-8 text-sm text-muted-foreground", children: "Loading…" }) });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AppShell, { title, titleIcon: FileText, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4 p-4 sm:p-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-end justify-between gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase", children: isReport ? "Saved report" : "Line list" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: title }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: isReport ? `${allRows.length} facilities in scope · same role and block scope as the Master List` : `${rows.length} of ${allRows.length} facilities · same role and block scope as the Master List` })
      ] }),
      (page.allowDownload ?? false) && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-2", children: isReport ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "outline",
            size: "sm",
            disabled: sourceGone,
            onClick: () => {
              setExportFormat("xlsx");
              setExportOpen(true);
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "mr-1.5 h-4 w-4" }),
              " Excel"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "outline",
            size: "sm",
            disabled: sourceGone,
            onClick: () => {
              setExportFormat("pdf");
              setExportOpen(true);
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "mr-1.5 h-4 w-4" }),
              " PDF"
            ]
          }
        )
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", disabled: busy, onClick: () => void doExport("xlsx"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "mr-1.5 h-4 w-4" }),
          " Excel"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", disabled: busy, onClick: () => void doExport("pdf"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "mr-1.5 h-4 w-4" }),
          " PDF"
        ] })
      ] }) })
    ] }),
    sourceGone && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        "data-testid": "source-report-removed",
        className: "flex flex-wrap items-center gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-950",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-4" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: "Source report removed." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "The saved Report Builder view behind this page was deleted, so the page cannot refresh. A State Admin can recreate it in Admin → Pages." })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative max-w-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "pointer-events-none absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Input,
        {
          value: query,
          onChange: (e) => setQuery(e.target.value),
          placeholder: "Search this list…",
          className: "pl-8"
        }
      )
    ] }),
    !isReport && template.quickFilters.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1", children: template.quickFilters.map((f) => {
      const on = activeQuick.includes(f.id);
      return /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          "aria-pressed": on,
          onClick: () => setActiveQuick(
            (cur) => on ? cur.filter((x) => x !== f.id) : [...cur, f.id]
          ),
          className: on ? "rounded-full border border-primary/50 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary" : "rounded-full border border-border/60 bg-card px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted",
          children: f.label
        },
        f.id
      );
    }) }),
    isReport ? reportResult.outRows.length ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      PivotTable,
      {
        result: reportResult,
        layout: snapshot.layout ?? "compact",
        decimals: snapshot.decimals ?? "auto",
        style: reportStyle,
        formatMode: snapshot.formatMode ?? "off",
        valueLabels: snapshot.valueLabels ?? "auto",
        statusColIndexes: statusColumnIndexes(
          reportResult.rowFields,
          reportResult
        ),
        colWidths,
        onColWidthsChange: setColWidths,
        onToggleCollapse: () => void 0,
        onSort: () => void 0,
        sortState: () => null
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-lg border border-dashed border-border/60 px-4 py-10 text-center text-sm text-muted-foreground", children: "No rows match this report." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-auto rounded-lg border bg-card", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "sticky top-0 z-10 bg-muted/80 backdrop-blur", children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: columns.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "th",
        {
          className: "whitespace-nowrap px-3 py-2 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "inline-flex items-center gap-1", onClick: () => {
            if (sortKey === c.key) setDesc((d) => !d);
            else {
              setSortKey(c.key);
              setDesc(false);
            }
          }, children: [
            labelOf(c.key, c.label),
            sortKey === c.key && (desc ? /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDown, { className: "h-3 w-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUp, { className: "h-3 w-3" }))
          ] })
        },
        c.key
      )) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        groupedRows.map((group, gi) => /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Fragment, { children: [
          group.key !== null && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { className: "border-t bg-muted/40", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "td",
            {
              colSpan: columns.length,
              className: "px-3 py-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase",
              children: [
                group.key,
                " · ",
                group.rows.length
              ]
            }
          ) }),
          group.rows.map((row, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "tr",
            {
              className: "border-t",
              children: columns.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "whitespace-nowrap px-3 py-2", children: c.key === "facility" && row.facility ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                FacilityCell,
                {
                  facility: row.facility,
                  query,
                  className: "max-w-72"
                }
              ) : cellText(row, c.key) || "—" }, c.key))
            },
            String(row.facility?._id ?? i)
          ))
        ] }, group.key ?? `all-${gi}`)),
        rows.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: columns.length, className: "px-3 py-10 text-center text-muted-foreground", children: "No facilities match." }) })
      ] })
    ] }) }),
    isReport && page.allowDownload && !sourceGone && /* @__PURE__ */ jsxRuntimeExports.jsx(
      ExportDialog,
      {
        open: exportOpen,
        onOpenChange: setExportOpen,
        result: reportResult,
        rawRows: searchableRows,
        filtersList: [],
        chart: null,
        initialFormat: exportFormat,
        defaultTitle: page.name,
        defaultSubtitle: "Facility quality certification tracker",
        defaultDistrict: settings?.settings?.districtName || "District",
        defaultGeneratedBy: user?.name ?? user?.email ?? "State Admin"
      }
    )
  ] }) });
}

export { CustomPage as default };
