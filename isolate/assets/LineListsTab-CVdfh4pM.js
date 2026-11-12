import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, ca as ArrowLeft, x as Columns3, bH as Share2, ax as Save, a2 as Download, H as ChevronDown, F as FileSpreadsheet, u as FileText, ao as FileDown, a4 as Printer, a3 as X, Y as Plus, aa as SlidersHorizontal, bV as Pin, m as Check, L as LoaderCircle, a6 as Sparkles, aq as Copy, cb as PinOff, ar as Trash2, bd as Users, f as ListChecks, T as TriangleAlert, N as CalendarClock, h as ClipboardCheck, j as Award, n as IndianRupee, B as Building2, o as Flame } from './icons-BxQpodNr.js';
import { B as Button, c as cn, d as useSearchParams, b as useNavigate, l as useQuery, j as api, m as useMutation, t as toast } from './index-CBV6wOh8.js';
import { I as Input } from './input-Cy2oZLur.js';
import { D as Dialog, a as DialogContent, b as DialogHeader, c as DialogTitle, d as DialogDescription, e as DialogFooter } from './dialog-BW3GEiPg.js';
import { a as ORG_NAME } from './org-DjtYn14q.js';
import { t as todayLocalIso } from './today-D9v8Esj5.js';
import { C as COLUMN_BY_KEY, ce as formatInr, k as cellText, cR as RadioGroup, cS as RadioGroupItem, w as withLegacyIa, v as buildIaMasterIndex, x as iaPairFor, y as withIaPeriodLabels, z as resolveLabels, M as MASTER_COLUMNS, cG as attachIaExtras } from './AppShell-CP099uvN.js';
import { l as lineListLabels, a as applyLineListFilters, b as searchLineListRows, s as sortLineListRows, g as groupLineListRows, c as buildLineListSummary, d as clauseText, e as sumText, F as FILTER_OPERATORS, D as DEFAULT_LINE_LIST_EXPORT, f as lineListIssueRows, h as galleryCounts, r as runLineListExport, i as describeLineListFilters } from './lineListExport-Cwr38yWb.js';
import { a as LINE_LIST_PINNED, n as newLineListDefinition, l as lineListTemplate, L as LINE_LIST_TEMPLATES } from './lineListTemplates-Bxak1gVr.js';
import { C as Checkbox } from './checkbox-CjOYMc2v.js';
import { L as Label } from './label-BaPkqXdo.js';
import { D as DropdownMenu, a as DropdownMenuTrigger, b as DropdownMenuContent, c as DropdownMenuLabel, f as DropdownMenuItem, g as DropdownMenuSeparator } from './dropdown-menu-N0nU9bdA.js';
import { S as Separator, C as ColumnManager, G as GroupedMasterTable } from './ExportDialog-Dhw8AWo1.js';
import { U as UniversalFilterBar } from './UniversalFilterBar-uuD2kW1Y.js';
import { a as FilterSearch } from './filters-BlRAASYu.js';
import { o as orderedVisibleColumns } from './masterGrid-CjX4ti61.js';
import './vendor-jspdf-BarNdCns.js';
import './vendor-charts--qXk384P.js';
import './NqasLogo-CIWlMexW.js';
import './shareLink-_K-oJu5R.js';
import './buildingBuckets-CQds7ysI.js';
import './masterFilter-DrauVhuN.js';
import './facilityQuickView-BCxVjMPj.js';
import './facilityProfileState-D76_z1Ay.js';
import './masterExport-Dlb4N-po.js';
import './facilitySheet-LEzrIYOJ.js';
import './scoreBands-CA46Kez8.js';
import './phone-C-n0eG_z.js';
import './masterReportPrint-CpdXQQkg.js';
import './index-BALjev1w.js';
import './FacilityQuickView-D07vvNqK.js';
import './skeleton-D-jVDmpg.js';
import './PdfCanvasViewer-C0MZuH_2.js';
import './DocumentField-4d87_sVm.js';
import './select-qTILnHQg.js';
import './DateInput-DZAT80St.js';
import './dateInput-0KZh0HdG.js';
import './AttachmentPicker-B8WtH0vb.js';
import './FacilityCell-CI45DpPw.js';
import './FacilityTypeBadge-8G3otPEU.js';
import './StatusBadge-BPGGn135.js';
import './textarea-Dm9kSFQo.js';
import './SaveBar--TNBfs1X.js';

const MOBILE_BREAKPOINT = 768;
function useIsMobile() {
  const [isMobile, setIsMobile] = reactExports.useState(void 0);
  reactExports.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return !!isMobile;
}

const sortStateOf = (def) => def.sort.map((s) => ({ id: s.id, desc: s.desc }));
const optionsOf = (rows, pick) => [...new Set(rows.map(pick).filter(Boolean))].sort((a, b) => a.localeCompare(b, "en-IN")).map((v) => ({ value: v, label: v }));
function ToggleChip({
  active,
  onClick,
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      onClick,
      "aria-pressed": active,
      className: cn(
        "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        active ? "border-primary/60 bg-primary/10 text-primary" : "border-border/70 text-muted-foreground hover:bg-muted"
      ),
      children: [
        active && /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3", "aria-hidden": true }),
        children
      ]
    }
  );
}
function LineListBuilder({
  definition,
  template,
  rows,
  labels: resolvedLabels,
  today,
  district,
  onChange,
  onBack,
  onSave,
  onShare,
  onExport,
  onOpenRow,
  saving,
  savedAt,
  sharedCount
}) {
  const isMobile = useIsMobile();
  const [search, setSearch] = reactExports.useState("");
  const [barKeys, setBarKeys] = reactExports.useState(["blocks", "phcs", "types", "statuses"]);
  const [colsOpen, setColsOpen] = reactExports.useState(false);
  const [filterOpen, setFilterOpen] = reactExports.useState(false);
  const [exportOpen, setExportOpen] = reactExports.useState(false);
  const [exportFormat, setExportFormat] = reactExports.useState("xlsx");
  const [railOpen, setRailOpen] = reactExports.useState(false);
  const [tipOpen, setTipOpen] = reactExports.useState(() => {
    try {
      return localStorage.getItem("nqas.lineList.tip") !== "seen";
    } catch {
      return true;
    }
  });
  const labels = reactExports.useMemo(
    () => lineListLabels(template, resolvedLabels),
    [template, resolvedLabels]
  );
  const scoped = reactExports.useMemo(
    () => applyLineListFilters(rows, definition, template, today),
    [rows, definition, template, today]
  );
  const filtered = reactExports.useMemo(() => searchLineListRows(scoped, search), [scoped, search]);
  const sorted = reactExports.useMemo(
    () => sortLineListRows(filtered, definition.sort),
    [filtered, definition.sort]
  );
  const groups = reactExports.useMemo(
    () => groupLineListRows(sorted, definition.groupBy, definition.columns),
    [sorted, definition.groupBy, definition.columns]
  );
  const summary = reactExports.useMemo(
    () => buildLineListSummary(sorted, template, today, labels),
    [sorted, template, today, labels]
  );
  const columns = reactExports.useMemo(
    () => orderedVisibleColumns(
      {
        visibleKeys: definition.columns,
        order: definition.columns.filter((k) => !LINE_LIST_PINNED.includes(k))},
      LINE_LIST_PINNED
    ),
    [definition.columns]
  );
  const view = reactExports.useMemo(
    () => ({
      presetId: "custom",
      visibleKeys: definition.columns,
      order: definition.columns,
      density: "comfortable",
      collapsedGroups: []
    }),
    [definition.columns]
  );
  const patch = (next) => onChange({ ...definition, ...next, updatedAt: Date.now() });
  const activeFilterCount = definition.blocks.length + definition.phcs.length + definition.types.length + definition.statuses.length + definition.quick.length + definition.and.length + definition.or.length;
  const clearAll = () => patch({ blocks: [], phcs: [], types: [], statuses: [], quick: [], and: [], or: [] });
  const dismissTip = () => {
    setTipOpen(false);
    try {
      localStorage.setItem("nqas.lineList.tip", "seen");
    } catch {
    }
  };
  const run = (format) => {
    setExportFormat(format);
    setExportOpen(true);
  };
  const grid = (list) => /* @__PURE__ */ jsxRuntimeExports.jsx(
    GroupedMasterTable,
    {
      rows: list,
      labels,
      view,
      sorting: sortStateOf(definition),
      onSortingChange: (next) => patch({ sort: next.map((s) => ({ id: s.id, desc: s.desc })) }),
      onOpenRow,
      onColumnsClick: () => setColsOpen(true),
      totalRowCount: rows.length,
      searchQuery: search,
      onClearFilters: clearAll,
      pinnedKeys: [...LINE_LIST_PINNED],
      widthsStorageKey: `linelist-${template.id}`,
      freezeActive: !isMobile
    }
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "@container", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass mb-3 flex flex-wrap items-center gap-2 rounded-xl p-2.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "ghost", size: "sm", onClick: onBack, className: "h-9", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "mr-1 size-4" }),
        " Line lists"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Separator, { orientation: "vertical", className: "mx-1 hidden h-6 sm:block" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Input,
        {
          "aria-label": "Report name",
          value: definition.name,
          onChange: (e) => patch({ name: e.target.value }),
          className: "h-9 min-w-40 flex-1 border-transparent bg-transparent px-2 text-sm font-semibold shadow-none focus-visible:border-input"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden text-xs text-muted-foreground sm:inline", "aria-live": "polite", children: saving ? "Saving…" : savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString("en-GB")}` : "Not saved" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", className: "h-9", onClick: () => setColsOpen(true), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Columns3, { className: "mr-1 size-4" }),
          " Columns"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "outline",
            size: "sm",
            className: "h-9",
            onClick: onShare,
            "aria-label": "Share this definition",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Share2, { className: "mr-1 size-4" }),
              "Share",
              sharedCount > 0 ? ` (${sharedCount})` : ""
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", className: "h-9", onClick: onSave, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "mr-1 size-4" }),
          " Save"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", className: "h-9", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "mr-1 size-4" }),
            " Export",
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "ml-1 size-3.5" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", className: "w-52", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuLabel, { children: "Download this list" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => run("xlsx"), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "mr-2 size-4" }),
              " Excel (.xlsx)"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => run("pdf"), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "mr-2 size-4" }),
              " PDF"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => run("csv"), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FileDown, { className: "mr-2 size-4" }),
              " CSV"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, {}),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => run("print"), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Printer, { className: "mr-2 size-4" }),
              " Print"
            ] })
          ] })
        ] })
      ] })
    ] }),
    tipOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex-1", children: [
        "Pick a topic, narrow it with the chips or ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "Add filter" }),
        ", then press ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "Save" }),
        " to keep it under “My reports”. The summary counts the same rows as the list below."
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: dismissTip,
          "aria-label": "Dismiss tip",
          className: "rounded p-1 hover:bg-primary/10",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3.5" })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      UniversalFilterBar,
      {
        pageKey: "linelists",
        fields: [
          {
            key: "blocks",
            label: "Block",
            type: "select",
            group: "Identity",
            onThisPage: true,
            options: optionsOf(rows, (r) => r.facility.block)
          },
          {
            key: "phcs",
            label: "PHC",
            type: "select",
            group: "Identity",
            onThisPage: true,
            options: optionsOf(rows, (r) => r.facility.phc)
          },
          {
            key: "types",
            label: "Facility Type",
            type: "select",
            group: "Identity",
            onThisPage: true,
            options: optionsOf(rows, (r) => r.facility.facilityType)
          },
          {
            key: "statuses",
            label: "Current Status",
            type: "select",
            group: "Certification",
            onThisPage: true,
            options: optionsOf(rows, (r) => r.facility.currentStatus ?? "")
          }
        ],
        value: {
          barKeys,
          filters: [
            { key: "blocks", op: "in", values: definition.blocks },
            { key: "phcs", op: "in", values: definition.phcs },
            { key: "types", op: "in", values: definition.types },
            { key: "statuses", op: "in", values: definition.statuses }
          ],
          match: "all"
        },
        onChange: (next) => {
          setBarKeys(next.barKeys);
          const values = (key) => next.filters.find((f) => f.key === key)?.values ?? [];
          patch({
            blocks: values("blocks"),
            phcs: values("phcs"),
            types: values("types"),
            statuses: values("statuses")
          });
        },
        summary: `Showing ${rows.length} facilities`
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3 @4xl:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "aside",
        {
          className: cn("glass space-y-3 rounded-xl p-3", isMobile && !railOpen && "hidden"),
          "aria-label": "Scope and columns",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-1.5 flex items-center justify-between", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xs font-semibold tracking-wide uppercase text-muted-foreground", children: "Scope" }),
                activeFilterCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: clearAll,
                    className: "text-[11px] font-medium text-primary hover:underline",
                    children: "Clear all"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground", children: "Scope is set in the filter bar above — every choice is a removable chip." })
            ] }),
            template.quickFilters.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mb-1.5 text-xs font-semibold tracking-wide uppercase text-muted-foreground", children: "Quick filters" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1.5", children: template.quickFilters.map((q) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                ToggleChip,
                {
                  active: definition.quick.includes(q.id),
                  onClick: () => patch({
                    quick: definition.quick.includes(q.id) ? definition.quick.filter((x) => x !== q.id) : [...definition.quick, q.id]
                  }),
                  children: q.label
                },
                q.id
              )) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-1.5 flex items-center justify-between", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xs font-semibold tracking-wide uppercase text-muted-foreground", children: "Filters" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Button,
                  {
                    variant: "ghost",
                    size: "sm",
                    className: "h-7 px-2 text-xs",
                    onClick: () => setFilterOpen(true),
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "mr-1 size-3.5" }),
                      " Add filter"
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-1.5", children: [
                definition.and.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  FilterChip,
                  {
                    label: clauseText(c, labels),
                    onRemove: () => patch({ and: definition.and.filter((x) => x.id !== c.id) })
                  },
                  c.id
                )),
                definition.or.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  FilterChip,
                  {
                    label: `ANY · ${clauseText(c, labels)}`,
                    onRemove: () => patch({ or: definition.or.filter((x) => x.id !== c.id) })
                  },
                  c.id
                )),
                definition.and.length + definition.or.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground", children: "None — every facility in scope is listed." })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mb-1.5 text-xs font-semibold tracking-wide uppercase text-muted-foreground", children: "Group & sort" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block text-[11px] text-muted-foreground", children: [
                "Group by",
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "select",
                  {
                    "aria-label": "Group by",
                    className: "mt-1 h-8 w-full rounded-md border border-border/70 bg-background px-2 text-xs",
                    value: definition.groupBy ?? "",
                    onChange: (e) => patch({ groupBy: e.target.value || null }),
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "No grouping" }),
                      ["block", "type", "pipelineStatus", "buildingStatus", "certStatus", "nocStatus"].filter((k) => COLUMN_BY_KEY[k]).map((k) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: k, children: labels[k] ?? COLUMN_BY_KEY[k].label }, k))
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[11px] text-muted-foreground", children: "Sort: click a column header (Shift-click adds a second sort)." })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between rounded-lg border border-border/60 px-2 py-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: "Summary strip" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Checkbox,
                {
                  "aria-label": "Show the summary strip",
                  checked: definition.summaryOn,
                  onCheckedChange: (v) => patch({ summaryOn: v === true })
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  variant: "outline",
                  size: "sm",
                  className: "h-8 flex-1 text-xs",
                  onClick: () => patch({ columns: [...template.columns] }),
                  children: "Reset columns"
                }
              ),
              isMobile && /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  variant: "ghost",
                  size: "sm",
                  className: "h-8 text-xs",
                  onClick: () => setRailOpen(false),
                  children: "Done"
                }
              )
            ] })
          ]
        }
      ),
      isMobile && !railOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          variant: "outline",
          size: "sm",
          className: "h-9 justify-start",
          onClick: () => setRailOpen(true),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SlidersHorizontal, { className: "mr-1 size-4" }),
            " Scope, filters & columns"
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex flex-wrap items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            FilterSearch,
            {
              value: search,
              onChange: setSearch,
              placeholder: "Search facility, PHC, block or NIN",
              className: "min-w-48 flex-1"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground tabular-nums", role: "status", "aria-live": "polite", children: [
            "Showing ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "text-foreground", children: sorted.length.toLocaleString("en-IN") }),
            " of",
            " ",
            rows.length.toLocaleString("en-IN"),
            " facilities"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "span",
            {
              "data-testid": "line-list-reconcile",
              className: cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                summary.total === sorted.length ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
              ),
              children: [
                summary.total,
                " of ",
                sorted.length,
                " ",
                summary.total === sorted.length ? "✓" : "✗"
              ]
            }
          )
        ] }),
        definition.summaryOn && definition.summaryPosition === "top" && /* @__PURE__ */ jsxRuntimeExports.jsx(
          LineListSummaryStrip,
          {
            summary,
            onPick: (column, label) => pickSummary(patch, definition, column, label)
          }
        ),
        sorted.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass rounded-xl border border-border/60 p-8 text-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium", children: "No facilities match these filters" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: "Remove a chip or clear everything to see the full list again." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "sm", className: "mt-3", onClick: clearAll, children: "Clear all filters" })
        ] }) : definition.groupBy ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: groups.map((g) => /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { "aria-label": `Group ${g.label}`, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass mb-1 flex flex-wrap items-center justify-between gap-2 rounded-t-xl border border-border/60 px-3 py-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs font-semibold", children: [
              g.label,
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-1 font-normal text-muted-foreground", children: [
                g.count,
                " facilit",
                g.count === 1 ? "y" : "ies"
              ] })
            ] }),
            g.sums.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] font-medium tabular-nums text-muted-foreground", children: g.sums.map((s) => `${s.label}: ${sumText(s.amount, g.count)}`).join(" · ") })
          ] }),
          isMobile ? /* @__PURE__ */ jsxRuntimeExports.jsx(MobileCards, { rows: g.rows, labels, columns, onOpen: onOpenRow }) : grid(g.rows)
        ] }, g.key)) }) : isMobile ? /* @__PURE__ */ jsxRuntimeExports.jsx(MobileCards, { rows: sorted, labels, columns, onOpen: onOpenRow }) : grid(sorted),
        definition.summaryOn && definition.summaryPosition === "bottom" && /* @__PURE__ */ jsxRuntimeExports.jsx(
          LineListSummaryStrip,
          {
            summary,
            onPick: (column, label) => pickSummary(patch, definition, column, label)
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ColumnManager,
      {
        open: colsOpen,
        onOpenChange: setColsOpen,
        labels,
        view,
        pinnedKeys: [...LINE_LIST_PINNED],
        onChange: (next) => patch({
          columns: orderedVisibleColumns(next, LINE_LIST_PINNED).map((c) => c.key)
        })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      AddFilterDialog,
      {
        open: filterOpen,
        onOpenChange: setFilterOpen,
        labels,
        columns,
        onAdd: (clause) => patch({ and: [...definition.and, clause] }),
        onAddOr: (clause) => patch({ or: [...definition.or, clause] })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ExportPlanDialog,
      {
        open: exportOpen,
        onOpenChange: setExportOpen,
        format: exportFormat,
        district,
        topic: template.name,
        count: sorted.length,
        onRun: async (plan) => {
          await onExport(plan, sorted, definition.name);
          setExportOpen(false);
        }
      }
    )
  ] });
}
function FilterChip({ label, onRemove }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex max-w-full items-center gap-1 rounded-full border border-border/70 bg-muted/60 px-2 py-0.5 text-[11px]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        onClick: onRemove,
        "aria-label": `Remove filter ${label}`,
        className: "rounded p-0.5 hover:bg-background",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3" })
      }
    )
  ] });
}
function pickSummary(patch, definition, column, label) {
  if (label === "-" || !column) return;
  const clause = {
    id: `f-${Date.now().toString(36)}`,
    key: column,
    op: "is",
    value: label
  };
  if (definition.and.some((c) => c.key === column && c.value === label)) return;
  patch({ and: [...definition.and.filter((c) => c.key !== column), clause] });
}
function LineListSummaryStrip({
  summary,
  onPick
}) {
  const max = summary.chart?.items.reduce((m, i) => Math.max(m, i.count), 1) ?? 1;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      "aria-label": "Summary",
      className: "glass mb-3 space-y-3 rounded-xl border border-border/60 p-3",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border/60 px-3 py-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] uppercase tracking-wide text-muted-foreground", children: "Facilities" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-lg font-semibold tabular-nums", children: summary.total.toLocaleString("en-IN") })
          ] }),
          summary.kpis.map((k) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border/60 px-3 py-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] uppercase tracking-wide text-muted-foreground", children: k.label }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-lg font-semibold tabular-nums", children: k.value.toLocaleString("en-IN") })
          ] }, k.id)),
          summary.sums.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border/60 px-3 py-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] uppercase tracking-wide text-muted-foreground", children: s.label }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-lg font-semibold tabular-nums", children: sumText(s.amount, summary.total) })
          ] }, s.id))
        ] }),
        summary.chart && summary.chart.items.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-1 text-[11px] font-semibold text-muted-foreground", children: summary.chart.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-1", children: summary.chart.items.slice(0, 6).map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center gap-2 text-[11px]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => onPick(summary.chart?.label ? chartColumn(summary, item.label) : "", item.label),
                className: "w-32 shrink-0 truncate text-left hover:underline",
                "aria-label": `Filter the list to ${item.label}`,
                children: item.label
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-2 flex-1 overflow-hidden rounded-full bg-muted", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: "block h-full rounded-full bg-primary/70",
                style: { width: `${Math.round(item.count / max * 100)}%` }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-8 shrink-0 text-right tabular-nums", children: item.count })
          ] }, item.label)) })
        ] }),
        summary.expiry.map((e) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mb-1 text-[11px] font-semibold text-muted-foreground", children: [
            e.label,
            e.expired > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-2 text-rose-700", children: [
              "already expired: ",
              e.expired
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1", children: e.months.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "span",
            {
              className: cn(
                "rounded border px-1.5 py-0.5 text-[10px] tabular-nums",
                m.count > 0 ? "border-border bg-background" : "border-dashed border-border/50 text-muted-foreground/60"
              ),
              children: [
                m.label,
                " ",
                m.count
              ]
            },
            m.key
          )) })
        ] }, e.id)),
        summary.sums.filter((s) => s.groups.length > 0).slice(0, 2).map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-1 text-[11px] font-semibold text-muted-foreground", children: s.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "grid gap-x-4 gap-y-0.5 text-[11px] sm:grid-cols-2", children: s.groups.slice(0, 8).map((g) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex justify-between gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: g.label }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "tabular-nums", children: formatInr(g.amount) })
          ] }, g.label)) })
        ] }, `${s.id}-groups`))
      ]
    }
  );
}
function chartColumn(summary, _label) {
  const byBuilding = summary.breakdowns.find((b) => b.column === "buildingStatus");
  return byBuilding?.column ?? summary.breakdowns[0]?.column ?? "";
}
function MobileCards({
  rows,
  labels,
  columns,
  onOpen
}) {
  const shown = columns.filter((c) => c.key !== "facility" && c.key !== "type").slice(0, 4);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-1.5", children: rows.map((row, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      onClick: () => onOpen(row),
      className: "glass w-full rounded-xl border border-border/60 p-3 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold", children: row.facility.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mb-1 text-[11px] text-muted-foreground", children: [
          row.facility.block,
          " · ",
          row.facility.phc,
          " · ",
          row.facility.facilityType
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("dl", { className: "grid grid-cols-2 gap-0.5 text-[11px]", children: shown.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "truncate text-muted-foreground", children: labels[c.key] ?? c.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "truncate font-medium", children: cellText(row, c.key) || "-" })
        ] }, c.key)) })
      ]
    }
  ) }, `${String(row.facility._id)}-${i}`)) });
}
function AddFilterDialog({
  open,
  onOpenChange,
  labels,
  columns,
  onAdd,
  onAddOr
}) {
  const [key, setKey] = reactExports.useState(columns[0]?.key ?? "facility");
  const [op, setOp] = reactExports.useState("is");
  const [value, setValue] = reactExports.useState("");
  const [value2, setValue2] = reactExports.useState("");
  const [join, setJoin] = reactExports.useState("and");
  reactExports.useEffect(() => {
    if (!columns.some((c) => c.key === key) && columns[0]) setKey(columns[0].key);
  }, [columns, key]);
  const needsValue = op !== "isEmpty" && op !== "isNotEmpty";
  const submit = () => {
    const clause = {
      id: `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      key,
      op,
      value: needsValue ? value : "",
      value2: op === "between" ? value2 : void 0
    };
    if (join === "and") onAdd(clause);
    else onAddOr(clause);
    setValue("");
    setValue2("");
    onOpenChange(false);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "glass-strong sm:max-w-lg", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Add a filter" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "Filters compare what the list SHOWS (dates as DD-MMM-YYYY, amounts as ₹). AND applies with the other filters; ANY joins the OR group." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs", children: "Field" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "select",
          {
            "aria-label": "Filter field",
            className: "mt-1 h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm",
            value: key,
            onChange: (e) => setKey(e.target.value),
            children: columns.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: c.key, children: labels[c.key] ?? c.label }, c.key))
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-2 sm:grid-cols-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs", children: "Operator" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "select",
            {
              "aria-label": "Filter operator",
              className: "mt-1 h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm",
              value: op,
              onChange: (e) => setOp(e.target.value),
              children: FILTER_OPERATORS.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: o.id, children: o.label }, o.id))
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Label, { className: "text-xs", children: [
            "Value",
            op === "between" ? " (from)" : ""
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              className: "mt-1 h-9",
              value,
              disabled: !needsValue,
              onChange: (e) => setValue(e.target.value),
              placeholder: op === "in" ? "A, B, C" : "e.g. Expired"
            }
          )
        ] })
      ] }),
      op === "between" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs", children: "Value (to)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            className: "mt-1 h-9",
            value: value2,
            onChange: (e) => setValue2(e.target.value)
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs", children: "Join" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          RadioGroup,
          {
            className: "mt-1 flex gap-3",
            value: join,
            onValueChange: (v) => setJoin(v),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-1.5 text-sm", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(RadioGroupItem, { value: "and" }),
                " AND (all must match)"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-1.5 text-sm", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(RadioGroupItem, { value: "or" }),
                " ANY (OR group)"
              ] })
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), children: "Cancel" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: submit, children: "Add filter" })
    ] })
  ] }) });
}
function ExportPlanDialog({
  open,
  onOpenChange,
  format,
  district,
  topic,
  count,
  onRun
}) {
  const [plan, setPlan] = reactExports.useState({
    ...DEFAULT_LINE_LIST_EXPORT,
    format
  });
  const [busy, setBusy] = reactExports.useState(false);
  reactExports.useEffect(() => {
    setPlan((prev) => ({ ...prev, format }));
  }, [format]);
  const go = async () => {
    setBusy(true);
    try {
      await onRun(plan);
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "glass-strong flex max-h-[90vh] flex-col sm:max-w-lg", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { children: [
        "Export “",
        topic,
        "”"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogDescription, { children: [
        count.toLocaleString("en-IN"),
        " rows · file name:",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-medium", children: [
          district,
          " ",
          topic,
          " Line List DD-MMM-YYYY"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-0 flex-1 space-y-3 overflow-y-auto pr-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("fieldset", { className: "rounded-xl border border-border/60 p-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("legend", { className: "px-1 text-xs font-semibold", children: "Rows" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          RadioGroup,
          {
            className: "gap-1.5",
            value: plan.scope,
            onValueChange: (v) => setPlan((p) => ({ ...p, scope: v })),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex min-h-9 items-center gap-2 text-sm", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(RadioGroupItem, { value: "all" }),
                " All rows in the list (",
                count,
                ")"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex min-h-9 items-center gap-2 text-sm opacity-60", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(RadioGroupItem, { value: "selected", disabled: true }),
                " Selected rows (none ticked)"
              ] })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("fieldset", { className: "rounded-xl border border-border/60 p-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("legend", { className: "px-1 text-xs font-semibold", children: "Include" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex min-h-9 items-center gap-2 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Checkbox,
            {
              checked: plan.includeSummary,
              onCheckedChange: (v) => setPlan((p) => ({ ...p, includeSummary: v === true }))
            }
          ),
          "Summary (cover + KPIs)"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex min-h-9 items-center gap-2 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Checkbox,
            {
              checked: plan.includeDefinitions,
              onCheckedChange: (v) => setPlan((p) => ({ ...p, includeDefinitions: v === true }))
            }
          ),
          "Definitions (filters written in the header)"
        ] })
      ] }),
      plan.format === "pdf" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 p-3 text-xs text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-foreground", children: "PDF layout" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1", children: "A4 landscape · 10 mm margins · all columns fit one page width. Long remarks wrap, the header repeats and rows never split." })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { className: "gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), children: "Cancel" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: go, disabled: busy, children: [
        busy ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-1 size-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "mr-1 size-4" }),
        busy ? plan.format === "pdf" ? "Preparing PDF…" : "Preparing file…" : "Download"
      ] })
    ] })
  ] }) });
}
function ShareDialog({
  open,
  onOpenChange,
  definition,
  onChange
}) {
  const [roles, setRoles] = reactExports.useState(definition.sharedWithRoles);
  const [people, setPeople] = reactExports.useState(definition.sharedWithUserIds.join(", "));
  const save = () => {
    onChange({
      ...definition,
      sharedWithRoles: roles,
      sharedWithUserIds: people.split(",").map((s) => s.trim()).filter(Boolean),
      updatedAt: Date.now()
    });
    onOpenChange(false);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "glass-strong sm:max-w-md", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { children: [
        "Share “",
        definition.name,
        "”"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "Only the definition is shared — columns, filters and sorting. Each viewer sees the facilities their role and block scope allow, never your data." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs", children: "Roles" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 flex flex-wrap gap-1.5", children: ["State Admin", "District Editor", "Viewer"].map((role) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          ToggleChip,
          {
            active: roles.includes(role),
            onClick: () => setRoles(
              (prev) => prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
            ),
            children: role
          },
          role
        )) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs", children: "Named people (user ids or emails, comma separated)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { className: "mt-1", value: people, onChange: (e) => setPeople(e.target.value) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), children: "Cancel" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: save, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Pin, { className: "mr-1 size-4" }),
        " Save sharing"
      ] })
    ] })
  ] }) });
}

const ICONS = {
  flame: Flame,
  building: Building2,
  rupee: IndianRupee,
  award: Award,
  clipboard: ClipboardCheck,
  calendar: CalendarClock,
  file: FileText,
  alert: TriangleAlert,
  list: ListChecks
};
const RECENT_KEY = "nqas.lineList.recent";
function readRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string").slice(0, 6) : [];
  } catch {
    return [];
  }
}
function rememberRecent(id) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...readRecent().filter((x) => x !== id)].slice(0, 6)));
  } catch {
  }
}
function LineListsTab({ onOpenFacility }) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const cycleParam = params.get("cycle");
  const templateParam = params.get("ll");
  const reportParam = params.get("report");
  const cycleNumber = cycleParam && cycleParam !== "all" && Number.isFinite(Number(cycleParam)) ? Number(cycleParam) : null;
  const listQ = useQuery(
    api.ops.listFacilityRowsFast,
    cycleNumber != null ? { cycle: cycleNumber } : {}
  );
  const settings = useQuery(api.facilities.getAppSettings, {});
  const iaQuarters = useQuery(api.ia.listIaQuarters, { limit: 2e4 });
  const cyclesQ = useQuery(
    api.cycleReport.getFacilityCycleRows,
    cycleParam === "all" ? {} : "skip"
  );
  const mineQ = useQuery(api.lineLists.myLineLists, {});
  const sharedQ = useQuery(api.lineLists.sharedLineLists, {});
  const saveMutation = useMutation(api.lineLists.saveLineList);
  const deleteMutation = useMutation(api.lineLists.deleteLineList);
  const logExport = useMutation(api.lineLists.logLineListExport);
  const today = todayLocalIso();
  const overrides = settings?.settings.tableHeaderOverrides;
  const iaIndex = reactExports.useMemo(() => {
    if (!iaQuarters) return null;
    return withLegacyIa(
      buildIaMasterIndex(
        iaQuarters.map((q) => ({
          facilityId: q.facilityId,
          fy: q.fy,
          quarter: q.quarter,
          nqasIaScore: q.nqasIaScore,
          kayakalpIaScore: q.kayakalpIaScore,
          ecoFriendlyScore: q.ecoFriendlyScore,
          nqasRemark: q.nqasRemark,
          kayakalpRemark: q.kayakalpRemark,
          ecoRemark: q.ecoRemark,
          lockedAt: q.lockedAt,
          updatedAt: q.updatedAt
        }))
      ),
      (listQ?.rows ?? []).map((r) => ({
        id: String(r.facility._id),
        nqasIaQ1: r.facility.nqasIaQ1 ?? null,
        kayakalpIaQ1: r.facility.kayakalpIaQ1 ?? null,
        nqasIaQ2: r.facility.nqasIaQ2 ?? null,
        kayakalpIaQ2: r.facility.kayakalpIaQ2 ?? null
      }))
    );
  }, [iaQuarters, listQ]);
  const iaPair = reactExports.useMemo(() => iaIndex ? iaPairFor(null, iaIndex) : null, [iaIndex, today]);
  const labels = reactExports.useMemo(
    () => withIaPeriodLabels(resolveLabels(MASTER_COLUMNS, overrides), iaPair),
    [overrides, iaPair]
  );
  const baseRows = reactExports.useMemo(() => {
    const live = listQ?.rows ?? [];
    if (!iaIndex || !iaPair) return live;
    return live.map((r) => ({
      ...r,
      iaq: attachIaExtras(String(r.facility._id), iaIndex, iaPair)
    }));
  }, [listQ, iaIndex, iaPair]);
  const allCycleRows = reactExports.useMemo(() => {
    const cycleRows = cyclesQ?.rows ?? [];
    if (!cycleRows.length) return [];
    const byId = new Map(baseRows.map((r) => [String(r.facility._id), r]));
    return cycleRows.flatMap((c) => {
      const b = byId.get(c.facilityId);
      if (!b) return [];
      return [
        {
          ...b,
          cycleNumber: c.cycleNumber,
          cycleType: c.cycleType,
          facility: {
            ...b.facility,
            currentStatus: c.currentStatus ?? b.facility.currentStatus,
            eligibility: c.eligibility ?? b.facility.eligibility
          },
          sa: {
            ...b.sa,
            status: c.saStatus,
            actualStartDate: c.saStartDate,
            actualEndDate: c.saEndDate,
            scorePercent: c.saScore,
            generalDocStatus: c.generalDocStatus
          },
          nqas: {
            ...b.nqas,
            status: c.naStatus,
            scheduledStartDate: c.naScheduledDate,
            actualEndDate: c.naEndDate,
            mode: c.naMode,
            certificationStatus: c.certStatus,
            certificationDate: c.certDate,
            goiLetterDate: c.goiLetterDate,
            scorePercent: c.certScore,
            manualScore: c.manualScore,
            validityDate: c.validityDate,
            surveillanceDue1: c.surveillanceDue1,
            surveillanceDone1: c.surveillanceDone1,
            surveillanceDue2: c.surveillanceDue2,
            surveillanceDone2: c.surveillanceDone2,
            recertStatus: c.recertStatus,
            recertYear: c.recertYear
          },
          building: { ...b.building, buildingStatus: c.buildingStatus },
          noc: { ...b.noc, status: c.nocStatus }
        }
      ];
    });
  }, [cyclesQ, baseRows]);
  const cycleNumbers = reactExports.useMemo(
    () => [...new Set((cyclesQ?.rows ?? []).map((r) => r.cycleNumber))].sort((a, b) => a - b),
    [cyclesQ]
  );
  const [current, setCurrent] = reactExports.useState(null);
  const [savedAt, setSavedAt] = reactExports.useState(null);
  const [saving, setSaving] = reactExports.useState(false);
  const [shareOpen, setShareOpen] = reactExports.useState(false);
  const [renameOpen, setRenameOpen] = reactExports.useState(false);
  const [renameValue, setRenameValue] = reactExports.useState("");
  const [renameTarget, setRenameTarget] = reactExports.useState(null);
  const appliedKey = reactExports.useRef("");
  const mine = reactExports.useMemo(
    () => (mineQ ?? []).map((r) => r.definition).filter((d) => d && typeof d.id === "string"),
    [mineQ]
  );
  const shared = reactExports.useMemo(
    () => (sharedQ ?? []).map((r) => r.definition).filter((d) => d && typeof d.id === "string"),
    [sharedQ]
  );
  reactExports.useEffect(() => {
    const key = `${templateParam ?? ""}|${reportParam ?? ""}|${cycleParam ?? ""}`;
    if (appliedKey.current === key) return;
    if (reportParam) {
      const found = [...mine, ...shared].find((d) => d.id === reportParam);
      if (!found) return;
      appliedKey.current = key;
      setCurrent({ ...found });
      setSavedAt(found.updatedAt);
      return;
    }
    if (templateParam) {
      appliedKey.current = key;
      setCurrent(
        newLineListDefinition(templateParam, {
          cycle: cycleParam === "all" ? "all" : cycleParam && Number.isFinite(Number(cycleParam)) ? Number(cycleParam) : "current"
        })
      );
      setSavedAt(null);
      return;
    }
    appliedKey.current = key;
    setCurrent(null);
  }, [templateParam, reportParam, cycleParam, mine, shared]);
  const openTemplate = reactExports.useCallback(
    (id) => {
      rememberRecent(id);
      const def = newLineListDefinition(id);
      setCurrent(def);
      setSavedAt(null);
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", "linelists");
        next.set("ll", id);
        next.delete("report");
        return next;
      });
    },
    [setParams]
  );
  const openSaved = reactExports.useCallback(
    (def) => {
      setCurrent({ ...def });
      setSavedAt(def.updatedAt);
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", "linelists");
        next.set("report", def.id);
        next.delete("ll");
        return next;
      });
    },
    [setParams]
  );
  const backToGallery = () => {
    setCurrent(null);
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", "linelists");
      next.delete("ll");
      next.delete("report");
      return next;
    });
  };
  const persist = async (def, quiet = false) => {
    setSaving(true);
    try {
      const res = await saveMutation({ definition: def });
      setSavedAt(res.savedAt);
      if (!quiet) toast.success("Saved to My reports");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save this report");
    } finally {
      setSaving(false);
    }
  };
  const handleSave = () => {
    if (!current) return;
    const next = { ...current, updatedAt: Date.now() };
    setCurrent(next);
    void persist(next);
  };
  const duplicate = async (def) => {
    const copy = {
      ...def,
      id: `ll-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${def.name} (copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sharedWithRoles: [],
      sharedWithUserIds: [],
      pinned: false,
      defaultForRole: null
    };
    await persist(copy, true);
    toast.success("Duplicated");
  };
  const remove = async (def) => {
    try {
      await deleteMutation({ id: def.id });
      if (current?.id === def.id) backToGallery();
      toast.success("Deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  };
  const togglePin = async (def) => {
    await persist({ ...def, pinned: !def.pinned, updatedAt: Date.now() }, true);
  };
  const rename = async () => {
    const target = renameTarget ?? current;
    if (!target) return;
    const next = {
      ...target,
      name: renameValue.trim() || target.name,
      updatedAt: Date.now()
    };
    if (current?.id === next.id) setCurrent(next);
    setRenameOpen(false);
    setRenameTarget(null);
    await persist(next, true);
  };
  const template = lineListTemplate(current?.templateId);
  const sourceRows = reactExports.useMemo(() => {
    const rows = current?.cycle === "all" ? allCycleRows : baseRows;
    if (template.rowsPer === "issue") {
      return lineListIssueRows(rows, today).map((x) => x.row);
    }
    return rows;
  }, [current?.cycle, allCycleRows, baseRows, template.rowsPer, today]);
  const exportList = async (plan, rows, name) => {
    if (!current) return;
    if (rows.length === 0) {
      toast.error("Nothing to export — no rows match the current filters");
      return;
    }
    const columns = current.columns.map((k) => MASTER_COLUMNS.find((c) => c.key === k)).filter((c) => !!c);
    const saveBlob = (data, fileName) => {
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    };
    const saveBlobRaw = (blob, fileName) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    };
    const district = settings?.settings?.districtName;
    try {
      const result = await runLineListExport({
        plan,
        rows,
        columns,
        labels,
        topic: template.name,
        filtersText: describeLineListFilters(current, template, labels),
        generatedBy: `${ORG_NAME} · Line lists · ${name}`,
        district: district || "District",
        singleBlock: current.blocks.length === 1 ? current.blocks[0] : null,
        totalRows: sourceRows.length,
        saveBlob,
        saveBlobRaw
      });
      await logExport({
        topic: template.name,
        format: plan.format,
        filters: describeLineListFilters(current, template, labels),
        rows: result.rows,
        fileName: result.fileName
      });
      toast.success(`Exported ${result.rows} row${result.rows === 1 ? "" : "s"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  };
  if (listQ === void 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", "aria-busy": "true", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "glass h-20 animate-pulse rounded-xl" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3", children: Array.from({ length: 6 }).map((_, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "glass h-28 animate-pulse rounded-xl" }, i)) })
    ] });
  }
  if (current) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        CycleScope,
        {
          onOpenMaster: () => {
            const query = new URLSearchParams();
            if (current.blocks.length) query.set("block", current.blocks.join(","));
            if (current.types.length) query.set("type", current.types.join(","));
            navigate(`/facilities${query.size ? `?${query.toString()}` : ""}`);
          },
          value: current.cycle,
          onChange: (cycle) => {
            const columns = cycle === "all" && !current.columns.includes("certCycle") ? [
              "facility",
              "type",
              "certCycle",
              ...current.columns.filter((k) => k !== "facility" && k !== "type")
            ] : current.columns;
            setCurrent({ ...current, cycle, columns });
            setParams((prev) => {
              const next = new URLSearchParams(prev);
              if (cycle === "all") next.set("cycle", "all");
              else next.delete("cycle");
              return next;
            });
          },
          cycles: cycleNumbers
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        LineListBuilder,
        {
          definition: current,
          template,
          rows: sourceRows,
          labels,
          today,
          district: settings?.settings?.districtName || "District",
          onChange: setCurrent,
          onBack: backToGallery,
          onSave: handleSave,
          onShare: () => setShareOpen(true),
          onExport: exportList,
          onOpenRow: onOpenFacility,
          saving,
          savedAt,
          sharedCount: current.sharedWithRoles.length + current.sharedWithUserIds.length
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        ShareDialog,
        {
          open: shareOpen,
          onOpenChange: setShareOpen,
          definition: current,
          onChange: (next) => {
            setCurrent(next);
            void persist(next, true);
          }
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: renameOpen, onOpenChange: setRenameOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "glass-strong sm:max-w-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Rename report" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "Only the saved name changes." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            value: renameValue,
            onChange: (e) => setRenameValue(e.target.value),
            "aria-label": "Report name"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => setRenameOpen(false), children: "Cancel" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: rename, children: "Rename" })
        ] })
      ] }) })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "glass rounded-xl p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "flex items-center gap-2 text-base font-semibold", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "size-4 text-primary" }),
        " Line lists"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 max-w-3xl text-sm text-muted-foreground", children: "Topic-wise facility lists built from the same tracker data, with a summary and an Excel / PDF / CSV download. Pick a topic to start — every one of them opens with its columns and quick filters already set." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { "aria-labelledby": "ll-topics", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { id: "ll-topics", className: "mb-2 text-xs font-semibold tracking-wide uppercase text-muted-foreground", children: "Start from a topic" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3", children: LINE_LIST_TEMPLATES.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        TopicCard,
        {
          template: t,
          counts: galleryCounts(baseRows, t, today),
          onOpen: () => openTemplate(t.id)
        },
        t.id
      )) })
    ] }),
    mine.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { "aria-labelledby": "ll-mine", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { id: "ll-mine", className: "mb-2 text-xs font-semibold tracking-wide uppercase text-muted-foreground", children: "My reports" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "grid gap-1.5 sm:grid-cols-2", children: [...mine].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt).map((def) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "glass flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => openSaved(def),
            className: "min-w-0 flex-1 text-left",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "truncate text-sm font-medium", children: [
                def.pinned && /* @__PURE__ */ jsxRuntimeExports.jsx(Pin, { className: "mr-1 inline size-3 text-primary" }),
                def.name
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "truncate text-[11px] text-muted-foreground", children: [
                lineListTemplate(def.templateId).name,
                " · ",
                def.columns.length,
                " columns ·",
                " ",
                new Date(def.updatedAt).toLocaleDateString("en-GB")
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "ghost",
            size: "icon",
            className: "size-8",
            "aria-label": `Rename ${def.name}`,
            onClick: () => {
              setRenameValue(def.name);
              setRenameTarget(def);
              setRenameOpen(true);
            },
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-3.5" })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", className: "size-8", "aria-label": `Duplicate ${def.name}`, onClick: () => void duplicate(def), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "size-3.5" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", className: "size-8", "aria-label": def.pinned ? "Unpin" : "Pin to gallery", onClick: () => void togglePin(def), children: def.pinned ? /* @__PURE__ */ jsxRuntimeExports.jsx(PinOff, { className: "size-3.5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Pin, { className: "size-3.5" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", className: "size-8 text-rose-600", "aria-label": `Delete ${def.name}`, onClick: () => void remove(def), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "size-3.5" }) })
      ] }, def.id)) })
    ] }),
    readRecent().length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { "aria-labelledby": "ll-recent", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { id: "ll-recent", className: "mb-2 text-xs font-semibold tracking-wide uppercase text-muted-foreground", children: "Recent" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1.5", children: readRecent().map((id) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: () => openTemplate(id),
          className: "rounded-full border border-border/70 px-3 py-1 text-xs hover:bg-muted",
          children: lineListTemplate(id).name
        },
        id
      )) })
    ] }),
    shared.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { "aria-labelledby": "ll-shared", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { id: "ll-shared", className: "mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "size-3.5" }),
        " Shared with me"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "grid gap-1.5 sm:grid-cols-2", children: shared.map((def) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "glass flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => openSaved(def), className: "min-w-0 flex-1 text-left", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "truncate text-sm font-medium", children: def.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "truncate text-[11px] text-muted-foreground", children: [
            "Shared by ",
            def.ownerName ?? "another user",
            " · ",
            lineListTemplate(def.templateId).name
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Share2, { className: "size-3.5 text-muted-foreground", "aria-hidden": true })
      ] }, def.id)) })
    ] })
  ] });
}
function TopicCard({
  template,
  counts,
  onOpen
}) {
  const Icon = ICONS[template.icon] ?? ListChecks;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      onClick: onOpen,
      className: "glass group flex h-full flex-col rounded-xl border border-border/60 p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mb-1.5 flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "size-4" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-sm font-semibold", children: template.name })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 text-[11px] leading-snug text-muted-foreground", children: template.tagline }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mt-2 flex flex-wrap gap-1", children: [
          counts.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "span",
            {
              className: cn(
                "rounded-full border px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
                c.count > 0 ? "border-amber-300 bg-amber-50 text-amber-900" : "border-border/60 text-muted-foreground"
              ),
              children: [
                c.count,
                " ",
                c.label
              ]
            },
            c.label
          )),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded-full border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground", children: [
            template.columns.length,
            " columns"
          ] })
        ] })
      ]
    }
  );
}
function CycleScope({
  value,
  onChange,
  cycles,
  onOpenMaster
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-1.5 text-xs", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-1.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "Certification cycle" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "select",
        {
          "aria-label": "Certification cycle",
          className: "h-7 rounded-md border border-border/70 bg-background px-2 text-xs",
          value: String(value),
          onChange: (e) => {
            const raw = e.target.value;
            onChange(raw === "all" ? "all" : raw === "current" ? "current" : Number(raw));
          },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "current", children: "Current" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "all", children: "All cycles (one row per facility-cycle)" }),
            cycles.map((n) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: n, children: [
              "#",
              n
            ] }, n))
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "Summaries never offer “All cycles”; the list shows one row per facility-cycle with a cycle pill." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", className: "ml-auto h-7 text-[11px]", onClick: onOpenMaster, children: "Open in Master List ↗" })
  ] });
}

export { LineListsTab };
