import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, Q as Search, H as ChevronDown, K as ChevronUp, T as TriangleAlert, ar as Trash2, as as Inbox, a9 as ArrowUp, a8 as ArrowDown, G as GripVertical, a3 as X, Y as Plus, at as ChartColumn, au as ChartLine, av as ChartPie, aw as Layers, ad as Bookmark, ax as Save, ay as Link2, az as FolderOpen, aA as Star, a7 as Pencil, m as Check, aB as PanelLeftClose, aC as PanelLeftOpen, ap as Table2, a6 as Sparkles, aD as ListFilter, w as RotateCcw, ab as Undo2, aE as Redo2, aF as LayoutTemplate, a2 as Download, z as ChevronRight, I as Info } from './icons-BxQpodNr.js';
import { u as useCycleScope, A as AppShell, c as CycleFilter, Q as FACILITY_CURRENT_STATUS_LABEL, V as deprecatedColumns } from './AppShell-CP099uvN.js';
import { c as cn, B as Button, t as toast, l as useQuery, j as api, m as useMutation } from './index-CBV6wOh8.js';
import { F as FacilityCell } from './FacilityCell-CI45DpPw.js';
import { F as FilterDropdown } from './FilterDropdown-B_vJKp6C.js';
import { B as Badge } from './badge-Cc2gQHFR.js';
import { I as Input } from './input-Cy2oZLur.js';
import { D as Dialog, a as DialogContent, b as DialogHeader, c as DialogTitle, e as DialogFooter, d as DialogDescription } from './dialog-BW3GEiPg.js';
import { g as DropdownMenuSeparator, c as DropdownMenuLabel, D as DropdownMenu, a as DropdownMenuTrigger, b as DropdownMenuContent, h as DropdownMenuSub, i as DropdownMenuSubTrigger, j as DropdownMenuSubContent, f as DropdownMenuItem } from './dropdown-menu-N0nU9bdA.js';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from './select-qTILnHQg.js';
import { S as Skeleton } from './skeleton-D-jVDmpg.js';
import { A as AGG_LABELS, a as applyDateLabelOptions, c as createPivotFields, f as fieldBlankCounts, b as buildPivot, e as distinctValues, g as defaultAggFor, h as allowedAggs, i as pivotCounter, P as PivotTable, s as statusColumnIndexes, E as ExportDialog, d as defaultPivotConfig, j as pivotDrilldown, p as prunePivotConfig } from './ExportDialog-BCGO8BQ0.js';
import './vendor-jspdf-BarNdCns.js';
import './vendor-charts--qXk384P.js';
import './NqasLogo-CIWlMexW.js';
import './label-BaPkqXdo.js';
import './shareLink-_K-oJu5R.js';
import './FacilityTypeBadge-8G3otPEU.js';
import './masterFilter-DrauVhuN.js';
import './today-D9v8Esj5.js';
import './table-DH4Byhhd.js';
import './vendor-exceljs-CqnmHTS6.js';
import './trackerColumns-8Ekg9xb3.js';

const FIELD_PANEL_PREF_KEY = "nqas.customReport.fieldPanelOpen";
function readFieldPanelPreference(storage) {
  try {
    return storage?.getItem(FIELD_PANEL_PREF_KEY) !== "false";
  } catch {
    return true;
  }
}
function writeFieldPanelPreference(open, storage) {
  try {
    storage?.setItem(FIELD_PANEL_PREF_KEY, String(open));
  } catch {
  }
}

const TYPE_META = {
  text: { icon: "T", label: "Text", cls: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  number: { icon: "#", label: "Number", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  date: { icon: "📅", label: "Date", cls: "bg-violet-500/10 text-violet-700 dark:text-violet-300" },
  status: { icon: "◉", label: "Status", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300" }
};
const STATUS_FIELD_IDS = /* @__PURE__ */ new Set([
  "pipelineStatus",
  "certStatus",
  "saStatus",
  "genDoc",
  "buildingStatus",
  "nocStatus",
  "eligibility",
  "recertStatus",
  "cycleType"
]);
function fieldKindOf(field) {
  if (field.type === "number") return "number";
  if (field.type === "date") return "date";
  if (STATUS_FIELD_IDS.has(field.id)) return "status";
  return "text";
}
function TypeBadge({ kind, className }) {
  const meta = TYPE_META[kind];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      "aria-label": meta.label,
      "data-tip": meta.label,
      className: cn(
        "inline-flex size-5 items-center justify-center rounded px-1 text-[10px] font-bold leading-none",
        meta.cls,
        className
      ),
      children: meta.icon
    }
  );
}
function Highlight({ text, q }) {
  const query = q.trim().toLowerCase();
  if (!query) return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: text });
  const idx = text.toLowerCase().indexOf(query);
  if (idx === -1) return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: text });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    text.slice(0, idx),
    /* @__PURE__ */ jsxRuntimeExports.jsx("mark", { className: "rounded-sm bg-amber-300/60 px-0.5 text-inherit dark:bg-amber-400/40", children: text.slice(idx, idx + query.length) }),
    text.slice(idx + query.length)
  ] });
}
function FieldList({
  fields,
  zoneOfField,
  onAdd,
  onDragStartField,
  draggingActive,
  totalRows,
  blankCounts,
  recent
}) {
  const [query, setQuery] = reactExports.useState("");
  const [kindFilter, setKindFilter] = reactExports.useState(null);
  const [collapsedGroups, setCollapsedGroups] = reactExports.useState(/* @__PURE__ */ new Set());
  const { groups, recentFields, inReport } = reactExports.useMemo(() => {
    const q = query.trim().toLowerCase();
    const available = fields.filter(
      (f) => (!LEGACY_IA_FIELDS.has(f.id) || zoneOfField(f.id) !== null) && (!kindFilter || fieldKindOf(f) === kindFilter)
    );
    const matches = q ? available.filter(
      (f) => f.label.toLowerCase().includes(q) || f.group.toLowerCase().includes(q) || (f.aliases ?? []).some((a) => a.toLowerCase().includes(q))
    ) : available;
    const byId = new Map(available.map((f) => [f.id, f]));
    const recents = recent.map((id) => byId.get(id)).filter((f) => !!f && (!q || matches.includes(f))).slice(0, 5);
    const map = /* @__PURE__ */ new Map();
    for (const f of matches) {
      const list = map.get(f.group);
      if (list) list.push(f);
      else map.set(f.group, [f]);
    }
    const used = available.filter((f) => zoneOfField(f.id) !== null);
    return { groups: [...map.entries()], recentFields: recents, inReport: used };
  }, [fields, query, recent, zoneOfField, kindFilter]);
  const allCollapsed = collapsedGroups.size >= groups.length && groups.length > 0;
  const toggleGroup = (group) => setCollapsedGroups((prev) => {
    const next = new Set(prev);
    if (next.has(group)) next.delete(group);
    else next.add(group);
    return next;
  });
  const toggleAll = () => setCollapsedGroups(allCollapsed ? /* @__PURE__ */ new Set() : new Set(groups.map(([g]) => g)));
  const renderItem = (field) => {
    const kind = fieldKindOf(field);
    const used = zoneOfField(field.id);
    const blanks = blankCounts[field.id] ?? 0;
    const blanksPct = totalRows > 0 ? Math.round(blanks / totalRows * 100) : 0;
    const blanksReason = totalRows > 0 && blanksPct > 40 ? `${blanks} of ${totalRows} facilities (${blanksPct}%) have no value for this field — those rows appear as “(blank)” in the report.` : null;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        draggable: true,
        onDragStart: (e) => onDragStartField(field.id, e),
        role: "button",
        tabIndex: 0,
        "aria-label": `Add field ${field.label}`,
        onClick: () => onAdd(field.id),
        onKeyDown: (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onAdd(field.id);
          }
        },
        "data-tip": `${TYPE_META[kind].label} field · ${field.label}${field.hint ? ` — ${field.hint}` : ""}`,
        className: cn(
          "group flex min-h-11 cursor-grab items-start gap-2 rounded-lg border border-transparent px-2 py-1.5 text-sm transition-colors hover:border-border/60 hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
          draggingActive === true && "active:cursor-grabbing"
        ),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TypeBadge, { kind }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: "line-clamp-2 min-w-0 flex-1 text-[13px] leading-snug break-words",
              "data-tip": `${field.label}${field.hint ? ` — ${field.hint}` : ""}`,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Highlight, { text: field.label, q: query })
            }
          ),
          blanksReason && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "span",
            {
              "aria-label": `Data quality: ${blanksPct}% of facilities are blank for this field`,
              "data-tip": blanksReason,
              className: "flex shrink-0 items-center gap-1 rounded-full border border-amber-300/70 bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-amber-900 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-100",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-3", "aria-hidden": true }),
                blanksPct,
                "% blank"
              ]
            }
          ),
          used ? /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "secondary", className: "shrink-0 text-[9px] uppercase", children: used }) : null
        ]
      },
      field.id
    );
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "aria-label": "Available fields", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative mb-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Input,
        {
          value: query,
          onChange: (e) => setQuery(e.target.value),
          placeholder: "Search fields…",
          "aria-label": "Search fields",
          className: "h-10 pl-8 text-sm"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex flex-wrap items-center justify-between gap-1 px-1 text-[11px] text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex flex-wrap items-center gap-1", children: Object.keys(TYPE_META).map((kind) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          "aria-pressed": kindFilter === kind,
          onClick: () => setKindFilter((k) => k === kind ? null : kind),
          className: cn(
            "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5",
            kindFilter === kind ? "border-primary/40 bg-primary/10 text-foreground" : "border-border/50 hover:bg-accent"
          ),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TypeBadge, { kind }),
            " ",
            TYPE_META[kind].label
          ]
        },
        kind
      )) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: toggleAll,
          className: "ml-1 inline-flex items-center gap-1 whitespace-nowrap rounded px-1 py-0.5 font-medium hover:bg-accent hover:text-foreground",
          children: [
            allCollapsed ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "size-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronUp, { className: "size-3" }),
            allCollapsed ? "Expand all" : "Collapse all"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-h-[54vh] space-y-1 overflow-y-auto pr-1 lg:max-h-none", children: [
      inReport.length > 0 && !query && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 rounded-lg border border-border/50 bg-muted/30 p-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground", children: "In this report" }),
        inReport.map(renderItem)
      ] }),
      recentFields.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground", children: "Recently used" }),
        recentFields.map(renderItem)
      ] }),
      groups.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "py-6 text-center text-sm text-muted-foreground", children: [
        "No field matches “",
        query,
        "”."
      ] }),
      groups.map(([group, list]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => toggleGroup(group),
            "aria-expanded": !collapsedGroups.has(group),
            className: "flex w-full items-center justify-between rounded px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:bg-accent/50",
            children: [
              group,
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "tabular-nums opacity-60", children: list.length }),
                collapsedGroups.has(group) ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRightSmall, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "size-3.5" })
              ] })
            ]
          }
        ),
        !collapsedGroups.has(group) && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-0.5", children: list.map(renderItem) })
      ] }, group))
    ] })
  ] });
}
const LEGACY_IA_FIELDS = /* @__PURE__ */ new Set([
  "nqasIaQ1",
  "nqasIaQ2",
  "nqasIaDelta",
  "kayakalpIaQ1",
  "kayakalpIaQ2",
  "kayakalpIaDelta"
]);
const ChevronRightSmall = () => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { viewBox: "0 0 14 14", className: "size-3.5", "aria-hidden": true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
  "path",
  {
    d: "M5 3.5 8.5 7 5 10.5",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }
) });

const ZONE_META = {
  rows: {
    label: "Rows",
    hint: "Group the report by these fields",
    max: 4,
    step: "2"
  },
  columns: {
    label: "Columns",
    hint: "Spread the figures across these fields",
    max: 2,
    step: "2"
  },
  values: {
    label: "Values",
    hint: "What to calculate — count, sum, average, % of total…",
    max: 6,
    step: "2"
  },
  filters: {
    label: "Filters",
    hint: "Include only facilities matching these values",
    max: 8,
    step: "2"
  }
};
const ZONE_ORDER = ["rows", "columns", "values", "filters"];
function DropZone({
  zone,
  count,
  active,
  dragging,
  onDragOverZone,
  onDragLeaveZone,
  onDropZone,
  onClear,
  fields,
  onAddField,
  children
}) {
  const meta = ZONE_META[zone];
  const groups = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    for (const f of fields) {
      const list = map.get(f.group);
      if (list) list.push(f);
      else map.set(f.group, [f]);
    }
    return [...map.entries()];
  }, [fields]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      "aria-label": `Step 2 zone: ${meta.label}`,
      onDragOver: onDragOverZone,
      onDragLeave: onDragLeaveZone,
      onDrop: onDropZone,
      className: cn(
        "glass flex min-h-28 flex-col rounded-xl border-2 border-dashed p-2.5 transition-all",
        active ? "scale-[1.02] border-primary bg-primary/10 shadow-lg ring-2 ring-primary/30" : dragging ? "border-border" : "border-border/60"
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "mb-1 flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary", children: "2" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-bold", children: meta.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded-full bg-muted px-1.5 text-[10px] font-semibold tabular-nums text-muted-foreground", children: [
            count,
            "/",
            meta.max
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-auto flex items-center gap-0.5", children: [
            onClear && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                "data-tip": `Clear ${meta.label.toLowerCase()}`,
                "aria-label": `Clear ${meta.label.toLowerCase()}`,
                onClick: onClear,
                className: "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "size-3.5" })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(AddFieldMenu, { zone: meta.label, groups, onAdd: onAddField })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-1.5 text-xs leading-snug text-muted-foreground", children: active ? /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "font-semibold text-primary", children: "Drop here" }) : meta.hint }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-14", children })
      ]
    }
  );
}
function AddFieldMenu({
  zone,
  groups,
  onAdd
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        "data-tip": `Add a field to ${zone}`,
        "aria-label": `Add a field to ${zone}`,
        className: "inline-flex min-h-8 items-center gap-1 rounded-md px-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "size-3.5" }),
          " Add"
        ]
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuContent, { align: "end", className: "max-h-96 w-64 overflow-y-auto", children: groups.map(([group, list]) => /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuSub, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSubTrigger, { className: "text-xs", children: group }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSubContent, { className: "max-h-72 overflow-y-auto", children: list.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        DropdownMenuItem,
        {
          className: "text-xs",
          onClick: () => onAdd(f.id),
          children: f.label
        },
        f.id
      )) })
    ] }, group)) })
  ] });
}
function ZoneChip({
  field,
  onDragStartChip,
  onDragEndChip,
  onRemove,
  onMove,
  subline
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      onDragOver: (e) => e.preventDefault(),
      onKeyDown: (e) => {
        if (!onMove) return;
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          e.preventDefault();
          onMove(-1);
        } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          e.preventDefault();
          onMove(1);
        } else if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          onRemove();
        }
      },
      tabIndex: 0,
      role: "listitem",
      "aria-label": `${field.label} chip. Arrow keys reorder, Delete removes.`,
      className: "flex min-h-11 items-center gap-1.5 rounded-lg border border-border/60 bg-background/80 px-2 py-1 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            draggable: true,
            onDragStart: onDragStartChip,
            onDragEnd: onDragEndChip,
            "data-tip": "Drag to reorder or move to another zone",
            className: "cursor-grab rounded p-0.5 text-muted-foreground hover:bg-accent active:cursor-grabbing",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(GripVertical, { className: "size-4" })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TypeBadge, { kind: fieldKindOf(field) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-xs font-semibold", "data-tip": field.label, "data-tip-truncate": true, children: field.label })
          ] }),
          subline
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            "data-tip": "Remove field",
            "aria-label": `Remove ${field.label}`,
            onClick: onRemove,
            className: "rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3.5" })
          }
        )
      ]
    }
  );
}
function AggPicker({
  value,
  options,
  onChange
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value, onValueChange: (v) => onChange(v), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      SelectTrigger,
      {
        className: "mt-0.5 h-6 w-full border-none bg-transparent px-0 text-[11px] text-muted-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0",
        "data-tip": "Choose the calculation",
        "aria-label": "Aggregation",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {})
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: options.map((agg) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: agg, className: "text-xs", children: AGG_LABELS[agg] }, agg)) })
  ] });
}
function ZonePlaceholder({ hint }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border/70 bg-muted/20 px-2 py-3 text-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Inbox, { className: "size-4 text-muted-foreground/60" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: hint }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-2 text-[10px] text-muted-foreground/70", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUp, { className: "size-2.5" }),
      " arrow keys reorder a focused chip",
      /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, { className: "mx-1 hidden" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuLabel, { className: "hidden" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDown, { className: "size-2.5" })
    ] })
  ] });
}

const PALETTE = [
  "oklch(0.62 0.15 165)",
  "oklch(0.78 0.14 85)",
  "oklch(0.58 0.14 250)",
  "oklch(0.72 0.16 60)",
  "oklch(0.6 0.2 25)",
  "oklch(0.58 0.14 300)",
  "oklch(0.62 0.13 220)",
  "oklch(0.62 0.03 260)"
];
function chartDataFrom(result, topN = 10) {
  const leaves = result.outRows.filter((r) => r.kind === "leaf");
  if (leaves.length < 2) return null;
  const labelIndex = 0;
  const pick = (r) => {
    const v = result.valueSpecs.length > 1 ? r.totals[0] : r.measures[0];
    return typeof v === "number" ? v : 0;
  };
  const sorted = [...leaves].sort((a, b) => pick(b) - pick(a)).slice(0, topN);
  return {
    title: result.valueFields[0] ? result.valueFields[0].label : "Report",
    labels: sorted.map((r) => r.labels[labelIndex] ?? "(blank)"),
    values: sorted.map(pick)
  };
}
function PivotChartCard({
  data,
  className,
  onExportHint
}) {
  const [kind, setKind] = reactExports.useState("bar");
  const w = 560;
  const h = 240;
  const max = reactExports.useMemo(() => Math.max(...data.values, 1), [data.values]);
  const total = reactExports.useMemo(
    () => data.values.reduce((a, b) => a + b, 0) || 1,
    [data.values]
  );
  const svg = reactExports.useMemo(() => {
    if (kind === "pie" || kind === "bar" || kind === "line") {
      const n = data.labels.length;
      if (kind === "pie") {
        let angle = -Math.PI / 2;
        const cx = w / 2;
        const cy = h / 2;
        const r = Math.min(cx, cy) - 8;
        const parts = data.values.map((v, i) => {
          const a1 = angle;
          const a2 = angle + v / total * Math.PI * 2;
          angle = a2;
          const large = a2 - a1 > Math.PI ? 1 : 0;
          const x1 = cx + r * Math.cos(a1);
          const y1 = cy + r * Math.sin(a1);
          const x2 = cx + r * Math.cos(a2);
          const y2 = cy + r * Math.sin(a2);
          const pct = Math.round(v / total * 100);
          const mid = (a1 + a2) / 2;
          const lx = cx + r * 0.62 * Math.cos(mid);
          const ly = cy + r * 0.62 * Math.sin(mid);
          if (v <= 0) return null;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "path",
              {
                d: `M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`,
                fill: PALETTE[i % PALETTE.length],
                opacity: 0.9,
                strokeLinejoin: "round"
              }
            ),
            pct >= 6 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "text",
              {
                x: lx,
                y: ly,
                fontSize: 10,
                textAnchor: "middle",
                fill: "#fff",
                fontWeight: 700,
                children: [
                  pct,
                  "%"
                ]
              }
            )
          ] }, i);
        });
        return /* @__PURE__ */ jsxRuntimeExports.jsx("g", { children: parts });
      }
      const padL2 = 46;
      const padB = 42;
      const innerW2 = w - padL2 - 8;
      const innerH = h - padB - 10;
      if (kind === "bar") {
        const gap = 6;
        const bw = Math.max(6, (innerW2 - gap * (n - 1)) / n);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
          data.values.map((v, i) => {
            const bh = v / max * innerH;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "rect",
                {
                  x: padL2 + i * (bw + gap),
                  y: 10 + innerH - bh,
                  width: bw,
                  height: Math.max(bh, 1),
                  rx: 3,
                  fill: PALETTE[i % PALETTE.length],
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx("title", { children: `${data.labels[i]}: ${v.toLocaleString("en-IN")}` })
                }
              ),
              bw > 26 && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "text",
                {
                  x: padL2 + i * (bw + gap) + bw / 2,
                  y: 6 + innerH - bh,
                  fontSize: 9,
                  textAnchor: "middle",
                  className: "fill-current opacity-70",
                  children: v.toLocaleString("en-IN")
                }
              )
            ] }, i);
          }),
          data.values.map((_, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "text",
            {
              x: padL2 + i * (bw + gap) + bw / 2,
              y: h - padB + 16,
              fontSize: 9,
              textAnchor: "end",
              className: "fill-current opacity-70",
              transform: `rotate(-45 ${padL2 + i * (bw + gap) + bw / 2} ${h - padB + 16})`,
              children: data.labels[i].length > 12 ? data.labels[i].slice(0, 11) + "…" : data.labels[i]
            },
            `l-${i}`
          ))
        ] });
      }
      const step = innerW2 / Math.max(n - 1, 1);
      const pts = data.values.map((v, i) => [
        padL2 + i * step,
        10 + innerH - v / max * innerH
      ]);
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "polyline",
          {
            points: pts.map((p) => p.map((x) => x.toFixed(1)).join(",")).join(" "),
            fill: "none",
            stroke: PALETTE[0],
            strokeWidth: 2.5,
            strokeLinejoin: "round"
          }
        ),
        pts.map(([px, py], i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: px, cy: py, r: 3.5, fill: PALETTE[0], children: /* @__PURE__ */ jsxRuntimeExports.jsx("title", { children: `${data.labels[i]}: ${data.values[i].toLocaleString("en-IN")}` }) }),
          i % Math.ceil(n / 10) === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "text",
            {
              x: px,
              y: h - padB + 14,
              fontSize: 9,
              textAnchor: "middle",
              className: "fill-current opacity-70",
              children: data.labels[i].length > 10 ? data.labels[i].slice(0, 9) + "…" : data.labels[i]
            }
          )
        ] }, i))
      ] });
    }
    const padL = 110;
    const innerW = w - padL - 8;
    const rowH = Math.min(26, (h - 12) / Math.max(data.labels.length, 1));
    const stacksRaw = data.stacked;
    if (!stacksRaw) return null;
    const seriesTotal = /* @__PURE__ */ new Map();
    for (const s of stacksRaw) {
      let sum = 0;
      for (const v of s.values) sum += v;
      seriesTotal.set(s.key, sum);
    }
    const totalsPerRow = data.values;
    const grand = Math.max(...totalsPerRow, 1);
    return /* @__PURE__ */ jsxRuntimeExports.jsx("g", { children: data.labels.map((label, i) => {
      const width = totalsPerRow[i] / grand * innerW;
      let x = padL;
      const y = 10 + i * rowH;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
        stacksRaw.map((s, si) => {
          const share = seriesTotal.get(s.key) ? s.values[i] / (seriesTotal.get(s.key) || 1) * width : 0;
          const rect = share > 1 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            "rect",
            {
              x,
              y: y + 4,
              width: share,
              height: rowH - 10,
              rx: 2,
              fill: PALETTE[si % PALETTE.length],
              children: /* @__PURE__ */ jsxRuntimeExports.jsx("title", { children: `${label} · ${s.key}: ${s.values[i].toLocaleString("en-IN")}` })
            },
            si
          ) : null;
          x += share;
          return rect;
        }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "text",
          {
            x: padL - 6,
            y: y + rowH / 2 + 3,
            fontSize: 9.5,
            textAnchor: "end",
            className: "fill-current",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx("tspan", { className: "font-semibold", children: label.slice(0, 16) })
          }
        )
      ] }, i);
    }) });
  }, [kind, data, max, total, w, h]);
  const icons = {
    bar: ChartColumn,
    stacked: Layers,
    pie: ChartPie,
    line: ChartLine
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      className: cn("glass rounded-xl border border-border/60 p-4", className),
      "aria-label": `Quick chart — ${data.title}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex flex-wrap items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, { className: "size-4 text-primary" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm font-semibold", children: [
            "Quick chart — ",
            data.title
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ml-auto flex gap-1 rounded-lg border border-border/60 bg-background/60 p-0.5", children: Object.keys(icons).map((k) => {
            const Icon = icons[k];
            return /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                "aria-pressed": kind === k,
                "data-tip": `${k} chart`,
                onClick: () => setKind(k),
                className: cn(
                  "inline-flex size-7 items-center justify-center rounded-md transition-colors",
                  kind === k ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                ),
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "size-3.5" })
              },
              k
            );
          }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "svg",
          {
            viewBox: `0 0 ${w} ${h}`,
            className: "h-auto w-full text-current",
            role: "img",
            "aria-label": `${kind} chart of ${data.labels.length} groups`,
            children: kind === "stacked" ? data.stacked ? svg : /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: w / 2, y: h / 2, textAnchor: "middle", fontSize: 11, className: "fill-current opacity-60", children: "Stacked chart needs one Rows field × one Columns field — switching to bar." }) : svg
          }
        ),
        kind === "stacked" && !data.stacked && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-center text-[11px] text-muted-foreground", children: [
          "Showing groups ranked by ",
          data.title,
          "."
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground", children: [
          (data.stacked ?? []).filter(() => data.stacked).map((s, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: "size-2 rounded-full",
                style: { background: PALETTE[i % PALETTE.length] }
              }
            ),
            s.key
          ] }, s.key)),
          onExportHint && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-auto", children: onExportHint })
        ] })
      ]
    }
  );
}
function stackedDataFor(result, topN = 10) {
  if (result.colFields.length !== 1 || result.colCombos.length === 0) return null;
  const leaves = result.outRows.filter((r) => r.kind === "leaf");
  if (leaves.length < 2) return null;
  const pick = (r) => typeof r.totals[0] === "number" ? r.totals[0] : 0;
  const sorted = [...leaves].sort((a, b) => pick(b) - pick(a)).slice(0, topN);
  const stacked = result.colCombos.slice(0, 6).map((combo) => ({
    key: combo.labels.map((l) => l ?? "(blank)").join(" / "),
    values: sorted.map((r) => {
      r.measures[0];
      const offset = result.colCombos.indexOf(combo);
      const v = r.measures[offset * result.valueSpecs.length];
      return typeof v === "number" ? v : 0;
    })
  }));
  return {
    title: result.valueFields[0]?.label ?? "Report",
    labels: sorted.map((r) => r.labels[0] ?? "(blank)"),
    values: sorted.map(pick),
    stacked
  };
}

function SavedViewsMenu({
  entries,
  defaultId,
  currentLabel,
  onSaveCurrent,
  onOpen,
  onRename,
  onDelete,
  onDeleteAll,
  onSetDefault,
  onShareLink
}) {
  const [rename, setRename] = reactExports.useState(
    null
  );
  const commitRename = () => {
    if (!rename) return;
    const name = rename.name.trim();
    if (!name) return;
    onRename(rename.entry, name);
    setRename(null);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", className: "gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Bookmark, { className: "size-4" }),
        "Saved views",
        entries.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold tabular-nums text-primary", children: entries.length })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", className: "w-72", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: onSaveCurrent, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "size-4" }),
          " Save current view…",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-auto max-w-24 truncate text-[10px] text-muted-foreground", children: currentLabel })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          DropdownMenuItem,
          {
            onClick: () => {
              void navigator.clipboard.writeText(window.location.href).then(
                () => toast.success("Report link copied — anyone with access opens this report"),
                () => toast.error("Could not copy the link")
              );
              onShareLink();
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Link2, { className: "size-4" }),
              " Share report link"
            ]
          }
        ),
        entries.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, {}),
        entries.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuLabel, { children: "Open a saved view" }),
        entries.map((entry) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "group flex items-center gap-0.5 px-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            DropdownMenuItem,
            {
              onClick: () => onOpen(entry),
              className: "min-w-0 flex-1",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, { className: "size-4 shrink-0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("truncate", entry.id === defaultId && "font-semibold"), children: entry.name }),
                entry.id === defaultId && /* @__PURE__ */ jsxRuntimeExports.jsx(Star, { className: "ml-1 size-3 shrink-0 fill-amber-400 text-amber-400" })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              "data-tip": "Rename view",
              onClick: (e) => {
                e.preventDefault();
                e.stopPropagation();
                setRename({ entry, name: entry.name });
                document.activeElement?.blur?.();
              },
              className: "rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "size-3" })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              "data-tip": entry.id === defaultId ? "Remove default" : "Set as default view",
              onClick: (e) => {
                e.preventDefault();
                e.stopPropagation();
                onSetDefault(entry.id === defaultId ? null : entry);
              },
              className: "rounded p-1 text-muted-foreground hover:bg-amber-500/10 hover:text-amber-600",
              children: entry.id === defaultId ? /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Star, { className: "size-3" })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              "data-tip": "Delete view",
              onClick: (e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(entry);
              },
              className: "rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "size-3" })
            }
          )
        ] }, entry.id)),
        entries.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, {}),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            DropdownMenuItem,
            {
              className: "text-destructive focus:text-destructive",
              onClick: onDeleteAll,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "size-4" }),
                " Delete all saved views"
              ]
            }
          )
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: !!rename, onOpenChange: (o) => !o && setRename(null), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-w-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Rename saved view" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Input,
        {
          autoFocus: true,
          value: rename?.name ?? "",
          onChange: (e) => setRename((r) => r ? { ...r, name: e.target.value } : r),
          onKeyDown: (e) => {
            if (e.key === "Enter") commitRename();
          }
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => setRename(null), children: "Cancel" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: commitRename, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "mr-1.5 size-4" }),
          " Save name"
        ] })
      ] })
    ] }) })
  ] });
}

const DEFAULT_STYLE = {
  subtotals: true,
  grandTotals: true,
  grandTotalColumn: true,
  striped: true,
  borders: true,
  highlightTotals: true
};
const LAYOUT_LABELS = {
  compact: "Compact",
  outline: "Outline",
  tabular: "Tabular"
};
const LAYOUT_HINTS = {
  compact: "One indented label column",
  outline: "One column per row field, indented",
  tabular: "One column per row field, labels repeated"
};
const FORMAT_LABELS = {
  off: "Plain numbers",
  heatmap: "Heat-map shading",
  databars: "Data bars",
  chips: "Status colour chips"
};
const VIEWS_KEY = "nqas.customReport.views.v1";
const CURRENT_KEY = "nqas.customReport.current.v1";
const DEFAULT_VIEW_KEY = "nqas.customReport.defaultView.v1";
const RETIRED_FIELDS = new Set(deprecatedColumns().map((c) => c.key));
const pruneSavedConfig = (config) => prunePivotConfig(config, RETIRED_FIELDS);
const TEMPLATES = [
  {
    id: "block-cert",
    label: "Block × Certification status",
    desc: "Count of facilities per block, split by certification result",
    make: () => ({
      config: {
        rows: ["block"],
        columns: ["certStatus"],
        values: [{ fieldId: "facilityName", agg: "count" }],
        filters: {},
        sort: { kind: "label", dir: "asc" }
      }
    })
  },
  {
    id: "type-cycle",
    label: "Facility Type × Certification Cycle",
    desc: "How each facility type is spread across certification cycles",
    make: () => ({
      config: {
        rows: ["facilityType"],
        columns: ["cycleNumber"],
        values: [{ fieldId: "facilityName", agg: "count" }],
        filters: {},
        sort: { kind: "label", dir: "asc" }
      }
    })
  },
  {
    id: "pipeline",
    label: `${FACILITY_CURRENT_STATUS_LABEL} summary`,
    desc: `Facilities and % of total per merged ${FACILITY_CURRENT_STATUS_LABEL.toLowerCase()}`,
    make: () => ({
      config: {
        rows: ["pipelineStatus"],
        columns: [],
        values: [
          { fieldId: "facilityName", agg: "count" },
          { fieldId: "facilityName", agg: "pctTotal" }
        ],
        filters: {},
        sort: { kind: "total", vIndex: 0, dir: "desc" }
      }
    })
  },
  {
    id: "fund-block",
    label: "Gap Closure Fund by Block",
    desc: "Sanctioned amount and facility count per block",
    make: () => ({
      config: {
        rows: ["block"],
        columns: ["gcYear"],
        values: [
          { fieldId: "gapAmount", agg: "sum" },
          { fieldId: "facilityName", agg: "count" }
        ],
        filters: {},
        sort: { kind: "total", vIndex: 0, dir: "desc" }
      }
    })
  }
];
function loadJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
  }
}
function decodeShareParam() {
  const param = new URLSearchParams(window.location.search).get("report");
  if (!param) return null;
  try {
    const json = new TextDecoder().decode(
      Uint8Array.from(atob(param), (ch) => ch.charCodeAt(0))
    );
    const parsed = JSON.parse(json);
    if (!parsed.config) return null;
    return {
      config: parsed.config,
      layout: parsed.layout ?? "outline",
      decimals: parsed.decimals ?? "auto",
      style: { ...DEFAULT_STYLE, ...parsed.style ?? {} },
      formatMode: parsed.formatMode ?? "off",
      valueLabels: parsed.valueLabels ?? "auto",
      monthLabels: parsed.monthLabels ?? "friendly"
    };
  } catch {
    return null;
  }
}
function encodeShareParam(view) {
  const json = JSON.stringify({ ...view });
  return btoa(String.fromCharCode(...new TextEncoder().encode(json)));
}
function initialView() {
  const shared = decodeShareParam();
  if (shared) return { ...shared, config: pruneSavedConfig(shared.config) };
  const defaultId = loadJson(DEFAULT_VIEW_KEY);
  if (defaultId) {
    const saved = loadJson(VIEWS_KEY) ?? [];
    const hit = saved.find((v) => v.id === defaultId);
    if (hit?.view)
      return {
        ...hit.view,
        config: pruneSavedConfig(hit.view.config),
        style: { ...DEFAULT_STYLE, ...hit.view.style },
        formatMode: hit.view.formatMode ?? "off",
        valueLabels: hit.view.valueLabels ?? "auto",
        monthLabels: hit.view.monthLabels ?? "friendly"
      };
  }
  const stored = loadJson(CURRENT_KEY);
  return {
    config: pruneSavedConfig(stored?.config ?? defaultPivotConfig()),
    layout: stored?.layout ?? "outline",
    decimals: stored?.decimals ?? "auto",
    style: { ...DEFAULT_STYLE, ...stored?.style ?? {} },
    formatMode: stored?.formatMode ?? "off",
    valueLabels: stored?.valueLabels ?? "auto",
    monthLabels: stored?.monthLabels ?? "friendly"
  };
}
function zoneOfField(config, fieldId) {
  if (config.rows.includes(fieldId)) return "rows";
  if (config.columns.includes(fieldId)) return "columns";
  if (config.values.some((v) => v.fieldId === fieldId)) return "values";
  if (fieldId in config.filters) return "filters";
  return null;
}
function CustomReportPage() {
  const cycleScope = useCycleScope();
  const data = useQuery(api.ops.listFacilityRowsFast, { cycle: cycleScope });
  const settingsQ = useQuery(api.facilities.getAppSettings, {});
  const [history, setHistory] = reactExports.useState(
    () => ({ stack: [initialView()], index: 0 })
  );
  const view = history.stack[history.index];
  const canUndo = history.index > 0;
  const canRedo = history.index < history.stack.length - 1;
  const update = reactExports.useCallback(
    (fn) => {
      setHistory((h) => {
        const next = fn(h.stack[h.index]);
        if (next === h.stack[h.index]) return h;
        return {
          stack: [...h.stack.slice(0, h.index + 1), next].slice(-40),
          index: Math.min(h.index + 1, 39)
        };
      });
    },
    []
  );
  const undo = reactExports.useCallback(
    () => setHistory((h) => ({ ...h, index: Math.max(0, h.index - 1) })),
    []
  );
  const redo = reactExports.useCallback(
    () => setHistory((h) => ({
      ...h,
      index: Math.min(h.stack.length - 1, h.index + 1)
    })),
    []
  );
  reactExports.useEffect(() => {
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (e.key.toLowerCase() === "z" && e.shiftKey || e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);
  const { config, layout, decimals, style, formatMode } = view;
  const patchView = (next) => update((prev) => ({ ...prev, ...next }));
  const patchConfig = (next) => update((prev) => ({ ...prev, config: { ...prev.config, ...next } }));
  const [collapsed, setCollapsed] = reactExports.useState(/* @__PURE__ */ new Set());
  const [colWidths, setColWidths] = reactExports.useState({});
  const [drag, setDrag] = reactExports.useState(null);
  const [hoverZone, setHoverZone] = reactExports.useState(null);
  const [sidebarOpen, setSidebarOpen] = reactExports.useState(
    () => readFieldPanelPreference(typeof window === "undefined" ? void 0 : window.localStorage)
  );
  const [sidebarWidth, setSidebarWidth] = reactExports.useState(() => {
    const saved = Number(localStorage.getItem("nqas.customReport.sidebarWidth"));
    return Number.isFinite(saved) && saved >= 260 && saved <= 420 ? saved : 300;
  });
  const [recent, setRecent] = reactExports.useState([]);
  const [resetOpen, setResetOpen] = reactExports.useState(false);
  const [exportOpen, setExportOpen] = reactExports.useState(false);
  const [saveOpen, setSaveOpen] = reactExports.useState(false);
  const [saveName, setSaveName] = reactExports.useState("");
  const [views, setViews] = reactExports.useState(
    () => loadJson(VIEWS_KEY) ?? []
  );
  const saveDefinition = useMutation(api.reportDefinitions.save);
  const removeDefinition = useMutation(api.reportDefinitions.remove);
  const syncedViews = reactExports.useRef(false);
  const [defaultViewId, setDefaultViewId] = reactExports.useState(
    () => loadJson(DEFAULT_VIEW_KEY)
  );
  const [drill, setDrill] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (syncedViews.current) return;
    syncedViews.current = true;
    const missing = views.filter((v) => !v.definitionId);
    if (missing.length === 0) return;
    void (async () => {
      const next = [...views];
      let changed = false;
      for (const entry of missing) {
        try {
          const res = await saveDefinition({ name: entry.name, view: entry.view });
          const at = next.findIndex((v) => v.id === entry.id);
          if (at >= 0) next[at] = { ...next[at], definitionId: res.id };
          changed = true;
        } catch {
        }
      }
      if (changed) {
        setViews(next);
        saveJson(VIEWS_KEY, next);
      }
    })();
  }, [views, saveDefinition]);
  reactExports.useEffect(() => {
    if (new URLSearchParams(window.location.search).get("report")) return;
    saveJson(CURRENT_KEY, view);
  }, [view]);
  const fields = reactExports.useMemo(
    () => applyDateLabelOptions(
      createPivotFields(
        settingsQ?.settings
      ),
      view.monthLabels
    ),
    [settingsQ, view.monthLabels]
  );
  const fieldById = reactExports.useMemo(() => new Map(fields.map((f) => [f.id, f])), [fields]);
  const rows = reactExports.useMemo(() => data?.rows ?? [], [data]);
  const totalRows = rows.length;
  const blankCounts = reactExports.useMemo(
    () => fieldBlankCounts(rows, fields),
    [rows, fields]
  );
  const deferredConfig = reactExports.useDeferredValue(config);
  const deferredStyle = reactExports.useDeferredValue(style);
  const previewUpdating = deferredConfig !== config || deferredStyle !== style;
  const result = reactExports.useMemo(
    () => buildPivot({
      rows,
      fields,
      config: deferredConfig,
      collapsed,
      options: {
        showSubtotals: deferredStyle.subtotals,
        showGrandTotals: deferredStyle.grandTotals
      }
    }),
    [rows, fields, deferredConfig, collapsed, deferredStyle.subtotals, deferredStyle.grandTotals]
  );
  const filterOptions = reactExports.useMemo(() => {
    const out = {};
    for (const fieldId of Object.keys(config.filters)) {
      const field = fieldById.get(fieldId);
      out[fieldId] = field ? distinctValues(rows, field) : [];
    }
    return out;
  }, [config.filters, fieldById, rows]);
  const layoutKey = `${config.rows.join(",")}|${config.columns.join(",")}`;
  const lastLayoutKey = reactExports.useRef(layoutKey);
  if (lastLayoutKey.current !== layoutKey) {
    lastLayoutKey.current = layoutKey;
    if (collapsed.size) setCollapsed(/* @__PURE__ */ new Set());
  }
  const chart = reactExports.useMemo(() => {
    const plain = chartDataFrom(result, 10);
    const stacked = stackedDataFor(result, 10);
    if (stacked) return stacked;
    return plain;
  }, [result]);
  const draggingActive = !!drag;
  const draggedRef = reactExports.useRef(false);
  const beginDrag = (item) => (e) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", item.fieldId);
    draggedRef.current = true;
    setDrag(item);
  };
  const endDrag = () => {
    setDrag(null);
    setHoverZone(null);
  };
  reactExports.useEffect(() => {
    if (!drag) return;
    const clear = () => {
      setDrag(null);
      setHoverZone(null);
    };
    window.addEventListener("dragend", clear);
    window.addEventListener("drop", clear);
    return () => {
      window.removeEventListener("dragend", clear);
      window.removeEventListener("drop", clear);
    };
  }, [drag]);
  const applyDrop = reactExports.useCallback(
    (item, zone, index) => {
      const field = fieldById.get(item.fieldId);
      if (!field) return;
      if (zone === "sidebar") {
        update((prev) => {
          const c = prev.config;
          return {
            ...prev,
            config: {
              ...c,
              rows: c.rows.filter((id) => id !== item.fieldId),
              columns: c.columns.filter((id) => id !== item.fieldId),
              values: c.values.filter((v) => v.fieldId !== item.fieldId),
              filters: Object.fromEntries(
                Object.entries(c.filters).filter(([id]) => id !== item.fieldId)
              )
            }
          };
        });
        return;
      }
      update((prev) => {
        const next = {
          ...prev.config,
          rows: [...prev.config.rows],
          columns: [...prev.config.columns],
          values: [...prev.config.values],
          filters: { ...prev.config.filters }
        };
        if (item.from === "zone") {
          if (item.zone === "rows")
            next.rows = next.rows.filter((id) => id !== item.fieldId);
          else if (item.zone === "columns")
            next.columns = next.columns.filter((id) => id !== item.fieldId);
          else if (item.zone === "filters") delete next.filters[item.fieldId];
          else if (item.zone === "values" && typeof item.index === "number")
            next.values = next.values.filter((_, i) => i !== item.index);
        }
        let at = typeof index === "number" ? index : -1;
        if (item.from === "zone" && item.zone === zone && typeof item.index === "number" && at > item.index)
          at -= 1;
        if (zone === "filters") {
          if (!(item.fieldId in next.filters)) {
            if (Object.keys(next.filters).length >= ZONE_META.filters.max) {
              toast.error(`Filters hold up to ${ZONE_META.filters.max} fields.`);
              return prev;
            }
            next.filters[item.fieldId] = [];
          }
          return { ...prev, config: next };
        }
        if (zone === "values") {
          if (next.values.length >= ZONE_META.values.max) {
            toast.error(`Values holds up to ${ZONE_META.values.max} calculations.`);
            return prev;
          }
          const target2 = at < 0 ? next.values.length : at;
          next.values = [
            ...next.values.slice(0, target2),
            { fieldId: item.fieldId, agg: defaultAggFor(field.type) },
            ...next.values.slice(target2)
          ];
          return { ...prev, config: next };
        }
        const list = zone === "rows" ? next.rows : next.columns;
        if (list.includes(item.fieldId)) return prev;
        if (list.length >= ZONE_META[zone].max) {
          toast.error(
            `${ZONE_META[zone].label} holds up to ${ZONE_META[zone].max} fields.`
          );
          return prev;
        }
        const target = at < 0 ? list.length : at;
        const inserted = [
          ...list.slice(0, target),
          item.fieldId,
          ...list.slice(target)
        ];
        if (zone === "rows") next.rows = inserted;
        else next.columns = inserted;
        return { ...prev, config: next };
      });
      setRecent(
        (prev) => [item.fieldId, ...prev.filter((id) => id !== item.fieldId)].slice(0, 8)
      );
    },
    [fieldById, update]
  );
  const removeField = (zone, fieldId, index) => update((prev) => {
    const next = {
      ...prev.config,
      rows: [...prev.config.rows],
      columns: [...prev.config.columns],
      values: [...prev.config.values],
      filters: { ...prev.config.filters }
    };
    if (zone === "rows") next.rows = next.rows.filter((id) => id !== fieldId);
    else if (zone === "columns")
      next.columns = next.columns.filter((id) => id !== fieldId);
    else if (zone === "filters") delete next.filters[fieldId];
    else if (zone === "values" && typeof index === "number")
      next.values = next.values.filter((_, i) => i !== index);
    return { ...prev, config: next };
  });
  const moveChip = (zone, fieldId, index, dir) => update((prev) => {
    const next = { ...prev.config };
    if (zone === "rows" || zone === "columns") {
      const list = [...next[zone]];
      const to = index + dir;
      if (to < 0 || to >= list.length) return prev;
      [list[index], list[to]] = [list[to], list[index]];
      next[zone === "rows" ? "rows" : "columns"] = list;
    } else if (zone === "values" && typeof index === "number") {
      const list = [...next.values];
      const to = index + dir;
      if (to < 0 || to >= list.length) return prev;
      [list[index], list[to]] = [list[to], list[index]];
      next.values = list;
    } else return prev;
    return { ...prev, config: next };
  });
  const addField = (field) => {
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    const used = zoneOfField(config, field.id);
    if (used) {
      toast.info(
        `${field.label} is already in ${ZONE_META[used].label} — drag its handle to another zone to reuse it.`
      );
      return;
    }
    applyDrop(
      { from: "sidebar", fieldId: field.id },
      field.type === "number" ? "values" : "rows"
    );
  };
  const setAgg = (index, agg) => patchConfig({
    values: config.values.map((v, i) => i === index ? { ...v, agg } : v)
  });
  const setFilter = (fieldId, allowed) => patchConfig({ filters: { ...config.filters, [fieldId]: allowed } });
  const toggleSort = (kind, arg) => {
    const cur = config.sort;
    const same = cur.kind === kind && (kind === "label" || kind === "measure" && cur.kind === "measure" && cur.colIndex === arg?.colIndex && cur.vIndex === arg?.vIndex || kind === "total" && cur.kind === "total" && cur.vIndex === arg?.vIndex);
    const dir = same && cur.dir === "asc" ? "desc" : "asc";
    let next;
    if (kind === "label") next = { kind: "label", dir };
    else if (kind === "measure")
      next = {
        kind: "measure",
        colIndex: arg?.colIndex ?? 0,
        vIndex: arg?.vIndex ?? 0,
        dir
      };
    else next = { kind: "total", vIndex: arg?.vIndex ?? 0, dir };
    patchConfig({ sort: next });
  };
  const sortState = (kind, arg) => {
    const cur = config.sort;
    if (cur.kind !== kind) return null;
    if (kind === "label") return cur.dir;
    if (kind === "measure" && cur.kind === "measure")
      return cur.colIndex === arg?.colIndex && cur.vIndex === arg?.vIndex ? cur.dir : null;
    if (kind === "total" && cur.kind === "total")
      return cur.vIndex === arg?.vIndex ? cur.dir : null;
    return null;
  };
  const toggleCollapsedKey = (key) => setCollapsed((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });
  const resetReport = () => {
    update(() => ({
      config: defaultPivotConfig(),
      layout: "outline",
      decimals: "auto",
      style: DEFAULT_STYLE,
      formatMode: "off",
      valueLabels: "auto",
      monthLabels: "friendly"
    }));
    setCollapsed(/* @__PURE__ */ new Set());
    setColWidths({});
    setResetOpen(false);
    toast.success("Report reset");
  };
  const applyTemplate = (t) => {
    const made = t.make();
    patchView({ ...made, config: pruneSavedConfig(made.config) });
    setCollapsed(/* @__PURE__ */ new Set());
    toast.success(`Loaded template “${t.label}”`);
  };
  const saveView = () => {
    const name = saveName.trim();
    if (!name) return;
    const entry = {
      id: `${Date.now()}`,
      name,
      savedAt: Date.now(),
      view
    };
    const next = [entry, ...views.filter((v) => v.name !== name)].slice(0, 30);
    setViews(next);
    saveJson(VIEWS_KEY, next);
    setSaveOpen(false);
    setSaveName("");
    toast.success(`Saved “${name}”`);
    void saveDefinition({ name, view }).then((res) => {
      setViews((cur) => {
        const withId = cur.map(
          (v) => v.id === entry.id ? { ...v, definitionId: res.id } : v
        );
        saveJson(VIEWS_KEY, withId);
        return withId;
      });
    }).catch(() => void 0);
  };
  const openView = (entry) => {
    const candidate = entry.view;
    if (!candidate?.config) {
      toast.error("This saved view has no report data.");
      return;
    }
    update(() => ({
      ...candidate,
      config: pruneSavedConfig(candidate.config),
      style: { ...DEFAULT_STYLE, ...candidate.style ?? {} },
      formatMode: candidate.formatMode ?? "off",
      valueLabels: candidate.valueLabels ?? "auto",
      monthLabels: candidate.monthLabels ?? "friendly"
    }));
    setCollapsed(/* @__PURE__ */ new Set());
    toast.success(`Opened “${entry.name}”`);
  };
  const renameView = (entry, name) => {
    const next = views.map((v) => v.id === entry.id ? { ...v, name } : v);
    setViews(next);
    saveJson(VIEWS_KEY, next);
  };
  const deleteView = (entry) => {
    const next = views.filter((v) => v.id !== entry.id);
    setViews(next);
    saveJson(VIEWS_KEY, next);
    if (entry.definitionId) {
      void removeDefinition({ id: entry.definitionId }).catch(() => void 0);
    }
    if (defaultViewId === entry.id) {
      setDefaultViewId(null);
      saveJson(DEFAULT_VIEW_KEY, null);
    }
    toast.success(`Deleted “${entry.name}”`);
  };
  const deleteAllViews = () => {
    for (const entry of views) {
      if (entry.definitionId) void removeDefinition({ id: entry.definitionId }).catch(() => void 0);
    }
    setViews([]);
    setDefaultViewId(null);
    saveJson(VIEWS_KEY, []);
    saveJson(DEFAULT_VIEW_KEY, null);
    toast.success("Saved views cleared");
  };
  const setDefaultView = (entry) => {
    const id = entry?.id ?? null;
    setDefaultViewId(id);
    saveJson(DEFAULT_VIEW_KEY, id);
    toast.success(id ? `“${entry.name}” opens by default` : "Default view cleared");
  };
  const onCellClick = (t) => {
    const labels = t.row.labels.slice(
      0,
      t.row.depth + 1
    );
    while (labels.length < config.rows.length && t.row.kind !== "leaf")
      labels.push(void 0);
    const colLabels = t.comboIndex != null ? result.colCombos[t.comboIndex]?.labels : void 0;
    const rowsMatched = pivotDrilldown({
      rows,
      fields,
      config,
      labels,
      colLabels
    });
    const parts = [];
    t.row.labels.slice(0, t.row.depth + 1).forEach((l) => l && parts.push(l));
    if (colLabels) colLabels.forEach((l) => l && parts.push(l));
    setDrill({
      title: parts.join(" · ") || "Selected facilities",
      rows: rowsMatched
    });
  };
  const filtersList = reactExports.useMemo(
    () => Object.entries(config.filters).filter(([, allowed]) => allowed.length > 0).map(([fieldId, allowed]) => {
      const field = fieldById.get(fieldId);
      return `${field?.label ?? fieldId}: ${allowed.join(", ")}`;
    }),
    [config.filters, fieldById]
  );
  const hasValues = config.values.length > 0;
  const canExport = hasValues && result.outRows.length > 0 && data !== void 0 && !previewUpdating;
  if (data === void 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      AppShell,
      {
        title: "Custom Report Builder",
        subtitle: "Loading your facilities…",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-10 rounded-lg" }),
            [0, 1, 2, 3, 4, 5, 6, 7].map((i) => /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-8 rounded-lg" }, i))
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4", children: [0, 1, 2, 3].map((i) => /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-28 rounded-xl" }, i)) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-10 rounded-xl" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-96 rounded-xl" })
          ] })
        ] })
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    AppShell,
    {
      title: "Custom Report Builder",
      subtitle: "Step 1 pick fields → Step 2 arrange → the preview builds itself",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex overflow-hidden rounded-lg border border-border/60", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "ghost",
              size: "icon",
              className: "size-9 rounded-none",
              "aria-label": "Undo last change (Ctrl+Z)",
              "data-tip": "Undo (Ctrl+Z)",
              disabled: !canUndo,
              onClick: undo,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Undo2, { className: "size-4", "aria-hidden": true })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "ghost",
              size: "icon",
              className: "size-9 rounded-none border-l border-border/60",
              "aria-label": "Redo (Ctrl+Y)",
              "data-tip": "Redo (Ctrl+Y)",
              disabled: !canRedo,
              onClick: redo,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Redo2, { className: "size-4", "aria-hidden": true })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          SavedViewsMenu,
          {
            entries: views,
            defaultId: defaultViewId,
            currentLabel: config.rows.map((id) => fieldById.get(id)?.label ?? id).join(" × ") || "My report",
            onSaveCurrent: () => {
              setSaveName(
                config.rows.map((id) => fieldById.get(id)?.label ?? id).join(" × ") || "My report"
              );
              setSaveOpen(true);
            },
            onOpen: openView,
            onRename: renameView,
            onDelete: deleteView,
            onDeleteAll: deleteAllViews,
            onSetDefault: setDefaultView,
            onShareLink: () => {
              const url = `${window.location.origin}${window.location.pathname}?report=${encodeShareParam(view)}`;
              window.history.replaceState(null, "", url);
            }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", className: "gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(LayoutTemplate, { className: "size-4" }),
            "Templates"
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", className: "w-72", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuLabel, { children: "Ready-made NQAS reports" }),
            TEMPLATES.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuItem, { onClick: () => applyTemplate(t), children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-xs font-semibold", children: t.label }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[10px] text-muted-foreground", children: t.desc })
            ] }) }, t.id))
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "outline",
            className: "gap-2",
            "data-tip": "Start over (asks first)",
            onClick: () => setResetOpen(true),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { className: "size-4", "aria-hidden": true }),
              "Reset"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            className: "gap-2",
            disabled: !canExport,
            onClick: () => setExportOpen(true),
            "aria-label": "Open export settings",
            "data-tip": !hasValues ? "Add at least one field to Values — then the export opens" : result.outRows.length === 0 ? "No rows match the filters — clear a filter, then export" : previewUpdating ? "Preview is updating — export will unlock when it settles" : "PDF / Excel / CSV with a print-ready layout",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-4", "aria-hidden": true }),
              "Download"
            ]
          }
        )
      ] }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: cn(
              "grid min-w-0 gap-4 overflow-x-clip",
              sidebarOpen ? "lg:grid-cols-[var(--sb-w)_minmax(0,1fr)]" : "grid-cols-[minmax(0,1fr)]"
            ),
            style: { ["--sb-w"]: `${sidebarWidth}px` },
            children: [
              sidebarOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "relative min-w-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass h-fit rounded-xl border border-border/60 p-3 lg:sticky lg:top-24", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex items-center justify-between gap-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-2 text-sm font-bold", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary", children: "1" }),
                      "Pick fields"
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "secondary", className: "text-[10px]", children: fields.length })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    FieldList,
                    {
                      fields,
                      zoneOfField: (id) => zoneOfField(config, id),
                      onAdd: (id) => {
                        const field = fieldById.get(id);
                        if (field) addField(field);
                      },
                      onDragStartField: (id, e) => beginDrag({ from: "sidebar", fieldId: id })(e),
                      draggingActive,
                      totalRows,
                      blankCounts,
                      recent
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    role: "separator",
                    "aria-orientation": "vertical",
                    "data-tip": "Drag to resize the field panel",
                    onMouseDown: (e) => {
                      e.preventDefault();
                      const startX = e.clientX;
                      const startW = sidebarWidth;
                      let nextW = startW;
                      const onMove = (ev) => {
                        nextW = Math.max(260, Math.min(420, startW + ev.clientX - startX));
                        setSidebarWidth(nextW);
                      };
                      const onUp = () => {
                        localStorage.setItem("nqas.customReport.sidebarWidth", String(nextW));
                        window.removeEventListener("mousemove", onMove);
                        window.removeEventListener("mouseup", onUp);
                      };
                      window.addEventListener("mousemove", onMove);
                      window.addEventListener("mouseup", onUp);
                    },
                    className: "absolute -right-1.5 top-24 hidden h-64 w-2 cursor-col-resize rounded bg-transparent hover:bg-primary/40 lg:block"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-2 flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Button,
                  {
                    variant: "ghost",
                    size: "sm",
                    className: "h-8 gap-1.5 text-xs",
                    "aria-pressed": !sidebarOpen,
                    onClick: () => {
                      const next = !sidebarOpen;
                      setSidebarOpen(next);
                      writeFieldPanelPreference(
                        next,
                        typeof window === "undefined" ? void 0 : window.localStorage
                      );
                    },
                    children: [
                      sidebarOpen ? /* @__PURE__ */ jsxRuntimeExports.jsx(PanelLeftClose, { className: "size-3.5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(PanelLeftOpen, { className: "size-3.5" }),
                      sidebarOpen ? "Hide field panel" : "Show field panel"
                    ]
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-3 grid gap-2.5 [container-type:inline-size] [grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))]", children: ZONE_ORDER.map((zone) => {
                  const count = zone === "filters" ? Object.keys(config.filters).length : zone === "values" ? config.values.length : config[zone].length;
                  return /* @__PURE__ */ jsxRuntimeExports.jsx(
                    DropZone,
                    {
                      zone,
                      count,
                      active: hoverZone === zone && draggingActive,
                      dragging: draggingActive,
                      onDragOverZone: (e) => {
                        if (!drag) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        setHoverZone(zone);
                      },
                      onDragLeaveZone: () => setHoverZone((z) => z === zone ? null : z),
                      onDropZone: (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (drag) applyDrop(drag, zone);
                        endDrag();
                      },
                      onClear: count > 0 ? () => {
                        if (zone === "filters") patchConfig({ filters: {} });
                        else if (zone === "rows") patchConfig({ rows: [] });
                        else if (zone === "columns")
                          patchConfig({ columns: [] });
                        else patchConfig({ values: [] });
                      } : void 0,
                      fields,
                      onAddField: (fieldId) => applyDrop({ from: "sidebar", fieldId }, zone),
                      children: zone === "filters" ? Object.keys(config.filters).length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(ZonePlaceholder, { hint: "Drop a field here to filter by it" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1.5", children: Object.keys(config.filters).map((fieldId, index) => {
                        const field = fieldById.get(fieldId);
                        if (!field) return null;
                        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            ZoneChip,
                            {
                              field,
                              onDragStartChip: beginDrag({
                                from: "zone",
                                zone: "filters",
                                fieldId
                              }),
                              onDragEndChip: endDrag,
                              onRemove: () => removeField("filters", fieldId),
                              subline: /* @__PURE__ */ jsxRuntimeExports.jsx(
                                FilterDropdown,
                                {
                                  label: "Filter values",
                                  options: (filterOptions[fieldId] ?? []).map(
                                    (v) => ({ value: v, label: v })
                                  ),
                                  value: config.filters[fieldId] ?? [],
                                  onChange: (v) => setFilter(fieldId, v),
                                  triggerWidth: "w-full"
                                }
                              )
                            }
                          ),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            NavItemMove,
                            {
                              onUp: () => moveChip("filters", fieldId, index, -1),
                              onDown: () => moveChip("filters", fieldId, index, 1)
                            }
                          )
                        ] }, fieldId);
                      }) }) : zone === "values" ? config.values.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(ZonePlaceholder, { hint: "Drop a field here to calculate it" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1.5", children: config.values.map((spec, index) => {
                        const field = fieldById.get(spec.fieldId);
                        if (!field) return null;
                        return /* @__PURE__ */ jsxRuntimeExports.jsx(
                          ZoneChip,
                          {
                            field,
                            onDragStartChip: beginDrag({
                              from: "zone",
                              zone: "values",
                              fieldId: spec.fieldId,
                              index
                            }),
                            onDragEndChip: endDrag,
                            onRemove: () => removeField("values", spec.fieldId, index),
                            onMove: (d) => moveChip("values", spec.fieldId, index, d),
                            subline: /* @__PURE__ */ jsxRuntimeExports.jsx(
                              AggPicker,
                              {
                                value: spec.agg,
                                options: allowedAggs(field.type),
                                onChange: (agg) => setAgg(index, agg)
                              }
                            )
                          },
                          `${spec.fieldId}-${index}`
                        );
                      }) }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                        config[zone].length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
                          ZonePlaceholder,
                          {
                            hint: `Drop a field here to group ${zone === "rows" ? "rows" : "columns"}`
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1.5", children: config[zone].map((fieldId, index) => {
                          const field = fieldById.get(fieldId);
                          if (!field) return null;
                          return /* @__PURE__ */ jsxRuntimeExports.jsx(
                            ZoneChip,
                            {
                              field,
                              onDragStartChip: beginDrag({
                                from: "zone",
                                zone,
                                fieldId,
                                index
                              }),
                              onDragEndChip: endDrag,
                              onRemove: () => removeField(zone, fieldId),
                              onMove: (d) => moveChip(zone, fieldId, index, d)
                            },
                            fieldId
                          );
                        }) })
                      ] })
                    },
                    zone
                  );
                }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-border/60 p-2.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary", children: "3" }),
                    "Preview",
                    previewUpdating && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 text-[10px] font-medium normal-case tracking-normal text-muted-foreground", role: "status", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "size-1.5 animate-pulse rounded-full bg-primary" }),
                      "Updating…"
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      Button,
                      {
                        variant: "outline",
                        size: "sm",
                        className: "h-9 min-w-0 gap-1.5 text-xs",
                        "data-tip": LAYOUT_HINTS[layout],
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(Table2, { className: "size-3.5 shrink-0" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: LAYOUT_LABELS[layout] })
                        ]
                      }
                    ) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "start", className: "w-64", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuLabel, { children: "Preview mode" }),
                      Object.keys(LAYOUT_LABELS).map((l) => /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuItem, { onClick: () => patchView({ layout: l }), children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "block text-xs font-semibold", children: [
                          LAYOUT_LABELS[l],
                          l === layout ? " ✔" : ""
                        ] }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[10px] text-muted-foreground", children: LAYOUT_HINTS[l] })
                      ] }) }, l))
                    ] })
                  ] }),
                  config.sort.kind === "label" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    Select,
                    {
                      value: config.sort.dir,
                      onValueChange: (v) => {
                        if (v === "asc" || v === "desc")
                          patchConfig({ sort: { kind: "label", dir: v } });
                      },
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          SelectTrigger,
                          {
                            className: "glass-input h-9 w-46 text-xs",
                            "data-tip": "Click any column header to sort by that figure instead",
                            children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {})
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "asc", className: "text-xs", children: "Row labels A - Z" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "desc", className: "text-xs", children: "Row labels Z - A" })
                        ] })
                      ]
                    }
                  ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Button,
                    {
                      variant: "outline",
                      size: "sm",
                      className: "h-9 gap-1.5 text-xs",
                      "data-tip": "Sorted by the clicked header figure — back to label order",
                      onClick: () => patchConfig({ sort: { kind: "label", dir: "asc" } }),
                      children: "Sorted by figure — back to A-Z"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    Select,
                    {
                      value: String(decimals),
                      onValueChange: (v) => patchView({
                        decimals: v === "auto" ? "auto" : Number(v)
                      }),
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "glass-input h-9 w-40 text-xs", "data-tip": "Decimal places", "aria-label": "Decimal places", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "auto", className: "text-xs", children: "Auto decimals" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "0", className: "text-xs", children: "0 decimals" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "1", className: "text-xs", children: "1 decimal" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "2", className: "text-xs", children: "2 decimals" })
                        ] })
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    Select,
                    {
                      value: formatMode,
                      onValueChange: (v) => patchView({ formatMode: v }),
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          SelectTrigger,
                          {
                            className: "glass-input h-9 w-52 text-xs",
                            "data-tip": "Conditional formatting",
                            "aria-label": "Conditional formatting",
                            children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "mr-1 size-3.5" }),
                              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {})
                            ]
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: Object.keys(FORMAT_LABELS).map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: m, className: "text-xs", children: FORMAT_LABELS[m] }, m)) })
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", className: "h-9 gap-1.5 text-xs", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { className: "size-3.5" }),
                      "Layout & style"
                    ] }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "start", className: "w-60", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuLabel, { children: "Show" }),
                      [
                        ["subtotals", "Group subtotals"],
                        ["grandTotals", "Grand total row"],
                        ["grandTotalColumn", "Grand total column"]
                      ].map(([key, label]) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        DropdownMenuItem,
                        {
                          onClick: () => patchView({ style: { ...style, [key]: !style[key] } }),
                          children: [
                            style[key] ? "✔" : "○",
                            " ",
                            label
                          ]
                        },
                        key
                      )),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuLabel, { children: "Styling" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        DropdownMenuItem,
                        {
                          onClick: () => patchView({
                            valueLabels: view.valueLabels === "always" ? "auto" : "always"
                          }),
                          children: [
                            view.valueLabels === "always" ? "✔" : "○",
                            " Show value labels — always"
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        DropdownMenuItem,
                        {
                          onClick: () => patchView({
                            valueLabels: view.valueLabels === "never" ? "auto" : "never"
                          }),
                          children: [
                            view.valueLabels === "never" ? "✔" : "○",
                            " Show value labels — never"
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-2 py-1 text-[10px] text-muted-foreground", children: "Auto (default): the measure-name header row appears only when there are two or more values." }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuLabel, { children: "Date groups" }),
                      [
                        ["friendly", "Month names — Oct 2022 (sorted by ISO key)"],
                        ["iso", "ISO keys — 2022-10"]
                      ].map(([mode, label]) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        DropdownMenuItem,
                        {
                          onClick: () => patchView({ monthLabels: mode }),
                          children: [
                            view.monthLabels === mode ? "✔" : "○",
                            " ",
                            label
                          ]
                        },
                        mode
                      )),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-2 py-1 text-[10px] text-muted-foreground", children: 'Facilities without a date group into one \\"(No date)\\" row, so subtotals always reconcile.' }),
                      [
                        ["striped", "Alternating row colours"],
                        ["borders", "Cell borders"],
                        ["highlightTotals", "Highlight totals"]
                      ].map(([key, label]) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        DropdownMenuItem,
                        {
                          onClick: () => patchView({ style: { ...style, [key]: !style[key] } }),
                          children: [
                            style[key] ? "✔" : "○",
                            " ",
                            label
                          ]
                        },
                        key
                      ))
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      className: "ml-auto flex min-w-0 flex-wrap items-center gap-3 text-xs text-muted-foreground",
                      "data-testid": "pivot-counter",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "tabular-nums", children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "font-semibold text-foreground", children: pivotCounter(result).facilities }),
                          " ",
                          "of ",
                          pivotCounter(result).of,
                          " facilities"
                        ] }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "tabular-nums", children: [
                          pivotCounter(result).rows,
                          " rows ·",
                          " ",
                          pivotCounter(result).valueColumns,
                          " value columns"
                        ] })
                      ]
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-3 flex flex-wrap items-center gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CycleFilter, { allowAll: false }) }),
                filtersList.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex flex-wrap items-center gap-1.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1 text-xs font-semibold text-muted-foreground", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(ListFilter, { className: "size-3.5" }),
                    " Filters:"
                  ] }),
                  filtersList.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "span",
                    {
                      "data-tip": f,
                      className: "glass inline-flex max-w-72 items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-xs",
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: f })
                    },
                    f
                  )),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    Button,
                    {
                      variant: "ghost",
                      size: "sm",
                      className: "h-7 gap-1 px-2 text-xs text-destructive",
                      onClick: () => patchConfig({ filters: {} }),
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3" }),
                        " Clear all"
                      ]
                    }
                  )
                ] }),
                result.truncated && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mb-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200", children: [
                  "Showing the first ",
                  result.maxRows,
                  " rows — the report has more. Export to Excel/CSV for every row."
                ] }),
                !hasValues ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { onTemplate: applyTemplate }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", "aria-busy": previewUpdating, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    PivotTable,
                    {
                      result,
                      layout,
                      decimals,
                      style,
                      formatMode,
                      valueLabels: view.valueLabels,
                      statusColIndexes: statusColumnIndexes(
                        result.rowFields,
                        result
                      ),
                      colWidths,
                      onColWidthsChange: setColWidths,
                      onToggleCollapse: toggleCollapsedKey,
                      onSort: toggleSort,
                      sortState,
                      onCellClick
                    }
                  ),
                  chart && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    PivotChartCard,
                    {
                      data: chart,
                      onExportHint: "Charts are drawn as vector bars inside PDF exports."
                    }
                  )
                ] })
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ExportDialog,
          {
            open: exportOpen,
            onOpenChange: setExportOpen,
            result,
            rawRows: rows,
            filtersList,
            chart: chart ? {
              labels: chart.labels,
              values: chart.values,
              title: chart.title
            } : null,
            defaultTitle: "NQAS Custom Report",
            defaultSubtitle: "Facility quality certification tracker",
            defaultDistrict: "Tirupathur district, Tamil Nadu",
            defaultGeneratedBy: typeof window !== "undefined" ? JSON.parse(localStorage.getItem("nqas.user") ?? "null")?.name ?? "NQAS Tracker user" : "NQAS Tracker user"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: saveOpen, onOpenChange: setSaveOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-w-md", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Save this report" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "Saved views live in this browser and reopen with the same rows, columns, values, filters, layout and styling." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              autoFocus: true,
              value: saveName,
              onChange: (e) => setSaveName(e.target.value),
              onKeyDown: (e) => {
                if (e.key === "Enter") saveView();
              },
              placeholder: "e.g. Block-wise certification status",
              className: "h-10 text-sm"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => setSaveOpen(false), children: "Cancel" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: saveView, disabled: !saveName.trim(), children: "Save view" })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: resetOpen, onOpenChange: setResetOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-w-md", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Reset this report?" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "Rows, columns, values, filters and styling go back to the default “Facilities per block”. Your saved views are not touched." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => setResetOpen(false), children: "Cancel" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "destructive", onClick: resetReport, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { className: "mr-1.5 size-4" }),
              " Reset report"
            ] })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: !!drill, onOpenChange: (o) => !o && setDrill(null), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-h-[80vh] overflow-y-auto sm:max-w-lg", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Behind this figure" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogDescription, { children: [
              drill?.rows.length ?? 0,
              " facilit",
              (drill?.rows.length ?? 0) === 1 ? "y" : "ies",
              " · ",
              drill?.title
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
            (drill?.rows ?? []).slice(0, 200).map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: "flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm hover:bg-accent",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(FacilityCell, { facility: r.facility, className: "min-w-0 flex-1" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 text-[11px] text-muted-foreground", children: r.facility.currentStatus })
                ]
              },
              r.facility._id ?? r.facility.name
            )),
            (drill?.rows.length ?? 0) > 200 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "pt-2 text-xs text-muted-foreground", children: "First 200 shown — export for the full list." })
          ] })
        ] }) })
      ]
    }
  );
}
function NavItemMove({
  onUp,
  onDown
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex flex-col", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        "data-tip": "Move filter earlier",
        "aria-label": "Move earlier",
        onClick: onUp,
        className: "rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "size-3 rotate-[-90deg]" })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        "data-tip": "Move filter later",
        "aria-label": "Move later",
        onClick: onDown,
        className: "rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "size-3 rotate-90" })
      }
    )
  ] });
}
function EmptyState({
  onTemplate
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass flex flex-col items-center rounded-xl border border-border/60 px-6 py-12 text-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "size-6 text-primary" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-base font-semibold", children: "Build your first report" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 max-w-xl text-sm text-muted-foreground", children: "Pick fields on the left (Step 1), drop them into Rows / Columns / Values (Step 2), and the preview table builds itself (Step 3). Or start from a ready template below — every one is one click." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 grid w-full max-w-xl gap-2 sm:grid-cols-2", children: TEMPLATES.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        onClick: () => onTemplate(t),
        className: "flex min-h-14 flex-col items-start rounded-xl border border-border/60 bg-background/60 p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-semibold", children: t.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: t.desc })
        ]
      },
      t.id
    )) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-4 flex items-center gap-1.5 text-xs text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { className: "size-3.5" }),
      "Tip: click a number in the finished table to see the facilities behind it."
    ] })
  ] });
}

export { CustomReportPage as default };
