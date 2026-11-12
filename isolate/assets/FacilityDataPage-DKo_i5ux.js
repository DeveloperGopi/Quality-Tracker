import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, L as LoaderCircle, a2 as Download, F as FileSpreadsheet, u as FileText, am as LayoutGrid, c2 as CalendarDays, a3 as X, bW as Paperclip } from './icons-BxQpodNr.js';
import { B as Button, u as useAuth, l as useQuery, j as api, L as Link, c as cn, n as useParams, d as useSearchParams, t as toast, m as useMutation } from './index-CBV6wOh8.js';
import { D as DEFAULT_SETTINGS, X as saqshamDocumentsStatusOf, Y as mergedPipelineStatus, b as toDisplayDate, u as useCycleScope, A as AppShell, c as CycleFilter, Q as FACILITY_CURRENT_STATUS_LABEL, t as toDisplayDateTime } from './AppShell-CP099uvN.js';
import { D as DropdownMenu, a as DropdownMenuTrigger, b as DropdownMenuContent, f as DropdownMenuItem } from './dropdown-menu-N0nU9bdA.js';
import { a as CATEGORY_ICONS, C as CATEGORY_META, g as getCategoryRoute, T as TRACKER_COLUMN_LABELS, c as categoryFromRoute, b as CATEGORY_COLUMN_IDS, d as TRACKER_COLUMN_WIDTHS } from './trackerColumns-8Ekg9xb3.js';
import { u as usePagination, F as FilterDropdown, R as RowViewSelect, P as PaginationBar } from './FilterDropdown-B_vJKp6C.js';
import { I as Input } from './input-Cy2oZLur.js';
import { T as Textarea } from './textarea-Dm9kSFQo.js';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from './select-qTILnHQg.js';
import { A as AutoFitTableScroll, f as Table, T as TableHeader, a as TableRow, b as TableHead, c as TableBody, d as TableCell } from './table-DH4Byhhd.js';
import { A as AttachmentPicker } from './AttachmentPicker-B8WtH0vb.js';
import { S as StatusBadge } from './StatusBadge-BPGGn135.js';
import { B as Badge } from './badge-Cc2gQHFR.js';
import { b as buildEligibilityOptions, m as multiFilterMatches } from './masterFilter-DrauVhuN.js';
import { D as DateInput } from './DateInput-DZAT80St.js';
import { F as FilterBar, a as FilterSearch, c as countActiveFilters } from './filters-BlRAASYu.js';
import { F as FacilityTypeBadge } from './FacilityTypeBadge-8G3otPEU.js';
import { d as deriveFireNocStatus } from './today-D9v8Esj5.js';
import { w as withOverrides } from './tableHeaders-CRNjYwbN.js';
import { a as exportExcel, e as exportPdf } from './exportTable-BCt2u4fE.js';
import './vendor-jspdf-BarNdCns.js';
import './vendor-charts--qXk384P.js';
import './NqasLogo-CIWlMexW.js';
import './label-BaPkqXdo.js';
import './shareLink-_K-oJu5R.js';
import './dialog-BW3GEiPg.js';
import './dateInput-0KZh0HdG.js';

function HeaderExportMenu({
  label = "Download",
  onExcel,
  onPdf,
  disabled,
  excelLabel = "Excel (.xlsx)",
  pdfLabel = "PDF"
}) {
  const [busy, setBusy] = reactExports.useState(false);
  const run = (fn) => {
    setBusy(true);
    try {
      fn();
    } finally {
      setTimeout(() => setBusy(false), 400);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", className: "gap-2", disabled: disabled || busy, children: [
      busy ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-4" }),
      label
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => run(onExcel), disabled, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "size-4" }),
        " ",
        excelLabel
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => run(onPdf), disabled, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-4" }),
        " ",
        pdfLabel
      ] })
    ] })
  ] });
}

const CATEGORY_ORDER = Object.keys(CATEGORY_META);
function CategoryPills({
  active,
  onChange
}) {
  const { user } = useAuth();
  const settingsQ = useQuery(api.facilities.getAppSettings, {});
  const hiddenCategories = reactExports.useMemo(
    () => user?.appRole === "admin" ? /* @__PURE__ */ new Set() : new Set(
      settingsQ?.settings.hiddenCategories ?? DEFAULT_SETTINGS.hiddenCategories
    ),
    [user, settingsQ]
  );
  const visibleOrder = CATEGORY_ORDER.filter((id) => !hiddenCategories.has(id));
  const pillCls = (isActive) => cn(
    "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
    isActive ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border/70 bg-background text-foreground/75 hover:border-primary/40 hover:bg-accent"
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 overflow-x-auto pb-1", children: [
    onChange ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        className: pillCls(active === null),
        onClick: () => onChange(null),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(LayoutGrid, { className: "size-3.5" }),
          "All columns"
        ]
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/facilities", className: pillCls(active === null), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LayoutGrid, { className: "size-3.5" }),
      "All columns"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-5 w-px shrink-0 bg-border" }),
    visibleOrder.map((id) => {
      const meta = CATEGORY_META[id];
      const Icon = CATEGORY_ICONS[meta.icon];
      const isActive = active === id;
      return onChange ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          className: pillCls(isActive),
          onClick: () => onChange(id),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "size-3.5" }),
            meta.label
          ]
        },
        id
      ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: getCategoryRoute(id), className: pillCls(isActive), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "size-3.5" }),
        meta.label
      ] }, id);
    })
  ] });
}
function CategoryNav({
  active,
  onChange
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(CategoryPills, { active, onChange });
}

function DateRangeFilter({
  label,
  from,
  to,
  onFrom,
  onTo,
  className
}) {
  const active = !!from || !!to;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: cn(
        "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm transition-colors",
        active ? "border-primary/50 bg-primary/5" : "border-input bg-background",
        className
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          CalendarDays,
          {
            className: cn(
              "size-3.5 shrink-0",
              active ? "text-primary" : "text-muted-foreground"
            )
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 text-xs font-medium text-muted-foreground", children: label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DateInput,
          {
            id: `range-${label.replace(/\s+/g, "-").toLowerCase()}-from`,
            label: `${label} from`,
            value: from,
            onChange: onFrom,
            emptyLabel: "From",
            compact: true,
            bare: true,
            hideChange: true,
            hideIcon: true,
            className: "w-[7rem]"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: "–" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DateInput,
          {
            id: `range-${label.replace(/\s+/g, "-").toLowerCase()}-to`,
            label: `${label} to`,
            value: to,
            onChange: onTo,
            emptyLabel: "To",
            compact: true,
            bare: true,
            hideChange: true,
            hideIcon: true,
            className: "w-[7rem]"
          }
        ),
        active && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: () => {
              onFrom("");
              onTo("");
            },
            "data-tip": `Clear ${label} range`,
            "aria-label": `Clear ${label} range`,
            className: "shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3.5" })
          }
        )
      ]
    }
  );
}
function isoInRange(value, from, to) {
  if (!from && !to) return true;
  const v = value ?? "";
  if (!v) return false;
  if (from && v < from) return false;
  if (to && v > to) return false;
  return true;
}

const CYCLE_TYPE_STYLES = {
  nqas: "bg-sky-100 text-sky-800 ring-sky-600/30",
  kayakalp: "bg-emerald-100 text-emerald-800 ring-emerald-600/30",
  kk: "bg-emerald-100 text-emerald-800 ring-emerald-600/30"
};
function typeStyle(cycleType) {
  const key = (cycleType ?? "").trim().toLowerCase();
  return CYCLE_TYPE_STYLES[key] ?? "bg-violet-100 text-violet-800 ring-violet-600/30";
}
function CycleBadge({
  cycleNumber,
  cycleType,
  className
}) {
  if (!cycleNumber) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "—" });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "span",
    {
      "data-tip": cycleType ? `Cert cycle #${cycleNumber} · ${cycleType}` : `Cert cycle #${cycleNumber}`,
      className: cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap tabular-nums ring-1 ring-inset",
        typeStyle(cycleType),
        className
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "opacity-70", children: "#" }),
        cycleNumber,
        cycleType && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "max-w-24 truncate text-[10px] font-medium opacity-80", children: cycleType })
      ]
    }
  );
}

const IDENTITY_HEADERS = [
  "S.No",
  "Facility",
  "Block",
  "PHC",
  "NIN",
  "Type",
  "Certification Cycle",
  "NQAS Eligibility"
];
const date = (iso) => iso ? toDisplayDate(iso) : "";
const s = (v) => v == null || v === "" ? "" : String(v);
function comparison(q1, q2) {
  if (q1 == null || q2 == null) return "";
  const delta = Math.round((q2 - q1) * 100) / 100;
  if (delta === 0) return "No Changes";
  return `${delta > 0 ? "▲" : "▼"} ${Math.abs(delta)}`;
}
function cellFor(row, c, settings) {
  const f = row.facility;
  switch (c) {
    case "pipelineStatus":
      return mergedPipelineStatus(
        { eligibility: f.eligibility ?? "", currentStatus: f.currentStatus },
        row.sa ? {
          status: row.sa.status ?? "Not Yet Initiated",
          generalDocStatus: row.sa.generalDocStatus ?? null
        } : null,
        row.nqas ? {
          status: row.nqas.status ?? "Pending",
          scheduledStartDate: row.nqas.scheduledStartDate ?? null,
          certificationStatus: row.nqas.certificationStatus ?? null,
          validityDate: row.nqas.validityDate ?? null
        } : null,
        settings
      );
    case "certStatus":
      return s(row.nqas?.certificationStatus);
    case "certDate":
      return date(row.nqas?.certificationDate ?? null);
    case "certScore":
      return row.nqas?.scorePercent ?? "";
    case "resultDoc":
      return s(row.resultDocumentName);
    case "naScheduled":
      return date(row.nqas?.scheduledStartDate ?? null);
    case "naEnd":
      return date(row.nqas?.actualEndDate ?? row.nqas?.scheduledEndDate ?? null);
    case "naMode":
      return s(row.nqas?.mode);
    case "departments":
      return s((row.nqas?.departments ?? []).join(", "));
    case "gapAmount":
      return row.fund?.amountSanctioned ?? "";
    case "gcYear":
      return s(row.fund?.financialYear);
    case "procLink":
      return s(row.fund?.procLink ?? row.fund?.fundAttachmentName);
    case "nqasIaQ1":
      return f.nqasIaQ1 ?? "";
    case "nqasIaQ2":
      return f.nqasIaQ2 ?? "";
    case "nqasIaCmp":
      return comparison(f.nqasIaQ1 ?? null, f.nqasIaQ2 ?? null);
    case "kayakalpIaQ1":
      return f.kayakalpIaQ1 ?? "";
    case "kayakalpIaQ2":
      return f.kayakalpIaQ2 ?? "";
    case "kayakalpIaCmp":
      return comparison(f.kayakalpIaQ1 ?? null, f.kayakalpIaQ2 ?? null);
    case "saStatus":
      return s(row.sa?.status);
    case "saScore":
      return row.sa?.scorePercent ?? "";
    case "saStart":
      return date(row.sa?.actualStartDate ?? row.sa?.scheduledDate ?? null);
    case "saEnd":
      return date(row.sa?.actualEndDate ?? null);
    case "genDoc":
      return s(saqshamDocumentsStatusOf(row.sa?.generalDocStatus, row.nqas?.certificationStatus)) || "-";
    case "saAssessor1":
      return s(row.sa?.assessor1Name);
    case "saAssessor1Hud":
      return s(row.sa?.assessor1Hud);
    case "saAssessor2":
      return s(row.sa?.assessor2Name);
    case "saAssessor2Hud":
      return s(row.sa?.assessor2Hud);
    case "saReport":
      return s(row.sa?.reportAttachmentName);
    case "saChecklist":
      return s(row.sa?.checklistAttachmentName);
    case "survDue1":
      return date(row.nqas?.surveillanceDue1 ?? null);
    case "surv1":
      return date(row.nqas?.surveillanceDone1 ?? null);
    case "survDue2":
      return date(row.nqas?.surveillanceDue2 ?? null);
    case "surv2":
      return date(row.nqas?.surveillanceDone2 ?? null);
    case "survScore":
      return row.nqas?.manualScore ?? "";
    case "validityDate":
      return date(row.nqas?.validityDate ?? null);
    case "recertStatus":
      return s(row.nqas?.recertStatus);
    case "recertYear":
      return s(row.nqas?.recertYear);
    case "buildingType":
      return s(row.building?.buildingType);
    case "buildingStatus":
      return s(row.building?.buildingStatus);
    case "condemned":
      return s(row.building?.condemnedLink ?? row.building?.condemnedAttachmentName);
    case "nocAvailable":
      return s(row.noc?.nocAvailable);
    case "nocStatus":
      return deriveFireNocStatus(
        row.noc?.nocAvailable ?? null,
        row.noc?.expiryDate ?? null,
        row.noc?.status ?? null
      );
    case "nocCertified":
      return date(row.noc?.issuedDate ?? null);
    case "nocValidity":
      return date(row.noc?.expiryDate ?? null);
    case "nocDoc":
      return s(row.noc?.nocLink ?? row.noc?.nocAttachmentName);
    case "remarks":
      return s(f.remarks);
    default:
      return "";
  }
}
function exportHeaders(ids, overrides) {
  return [
    ...IDENTITY_HEADERS,
    ...withOverrides(
      ids.map((c) => TRACKER_COLUMN_LABELS[c]),
      overrides
    )
  ];
}
function exportRows(rows, ids, settings) {
  const s2 = settings ?? DEFAULT_SETTINGS;
  return rows.map((row, i) => [
    i + 1,
    row.facility.name,
    row.facility.block,
    row.facility.phc,
    s(row.facility.ninNumber),
    row.facility.facilityType,
    row.cycleNumber ? `#${row.cycleNumber}` : "",
    s(row.facility.eligibility),
    ...ids.map((c) => cellFor(row, c, s2))
  ]);
}

function ComparisonCell({ q1, q2 }) {
  if (q1 == null || q2 == null)
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "—" });
  const delta = Math.round((q2 - q1) * 100) / 100;
  const color = delta > 0 ? "oklch(0.6 0.15 165)" : delta < 0 ? "oklch(0.6 0.2 25)" : "inherit";
  const arrow = delta > 0 ? "▲" : delta < 0 ? "▼" : "";
  if (delta === 0)
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium tabular-nums", children: "No Changes" });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-medium tabular-nums", style: { color }, children: [
    arrow,
    " ",
    Math.abs(delta)
  ] });
}
function CellFileLink({ id, name }) {
  const url = useQuery(
    api.modules.getAttachmentUrl,
    id ? { storageId: id } : "skip"
  );
  if (!id) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "a",
    {
      href: url ?? "#",
      target: "_blank",
      rel: "noreferrer",
      className: "inline-flex max-w-32 items-center gap-1 truncate text-xs font-medium text-primary hover:underline",
      "data-tip": name ?? "View file",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Paperclip, { className: "size-3.5 shrink-0" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: name ?? "View file" })
      ]
    }
  );
}
function CellUpload({
  id,
  name,
  value,
  onChange,
  onClear,
  disabled,
  hint
}) {
  const [pickerOpen, setPickerOpen] = reactExports.useState(false);
  if (pickerOpen)
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      AttachmentPicker,
      {
        initial: id ? { attachmentId: id, attachmentName: name ?? void 0 } : null,
        onChange: (v) => {
          onChange(v);
          setPickerOpen(false);
        },
        disabled
      }
    );
  if (value)
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-start gap-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "span",
        {
          className: "inline-flex max-w-32 items-center gap-1 text-xs font-medium text-foreground",
          "data-tip": `${value.attachmentName ?? "New file"} — applies when you press Update`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-3.5 shrink-0" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: value.attachmentName ?? "New file" })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            type: "button",
            variant: "outline",
            size: "sm",
            className: "h-7 gap-1.5 px-2 text-xs",
            disabled,
            onClick: () => setPickerOpen(true),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Paperclip, { className: "size-3.5" }),
              "Replace"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            type: "button",
            variant: "ghost",
            size: "sm",
            className: "h-7 px-2 text-xs text-destructive",
            disabled,
            onClick: () => onChange(null),
            children: "Remove"
          }
        )
      ] })
    ] });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-start gap-1", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(CellFileLink, { id, name }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          type: "button",
          variant: "outline",
          size: "sm",
          className: "h-7 gap-1.5 px-2 text-xs",
          disabled,
          onClick: () => setPickerOpen(true),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Paperclip, { className: "size-3.5" }),
            id ? "Replace" : "Upload"
          ]
        }
      ),
      id && onClear && /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          type: "button",
          variant: "ghost",
          size: "sm",
          className: "h-7 px-2 text-xs text-destructive",
          disabled,
          onClick: () => {
            onChange(null);
            onClear();
          },
          children: "Remove"
        }
      )
    ] }),
    hint && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[10px] leading-tight text-muted-foreground", children: hint })
  ] });
}
const DRAFT_KEYS = [
  "certStatus",
  "certDate",
  "certScore",
  "naScheduled",
  "naEnd",
  "naMode",
  "departments",
  "gapAmount",
  "gcYear",
  "nqasIaQ1",
  "nqasIaQ2",
  "kayakalpIaQ1",
  "kayakalpIaQ2",
  "saStatus",
  "saScore",
  "saAssessor1",
  "saAssessor1Hud",
  "saAssessor2",
  "saAssessor2Hud",
  "saStart",
  "saEnd",
  "genDoc",
  "surv1",
  "surv2",
  "survScore",
  "buildingType",
  "buildingStatus",
  "nocAvailable",
  "nocStatus",
  "nocCertified",
  "nocValidity",
  "remarks"
];
function FacilityDataPage() {
  const params = useParams();
  const segment = (params["*"] ?? "").split("/")[0];
  const categoryId = categoryFromRoute(`/facilities/${segment}`);
  const cycleScope = useCycleScope();
  const data = useQuery(api.ops.listFacilityRowsFast, { cycle: cycleScope });
  const settings = useQuery(api.facilities.getAppSettings, {});
  const [searchParams] = useSearchParams();
  const searchInit = searchParams.get("q") ?? "";
  const [search, setSearch] = reactExports.useState(searchInit);
  const [blockFilter, setBlockFilter] = reactExports.useState([]);
  const [typeFilter, setTypeFilter] = reactExports.useState([]);
  const [buildingStatusFilter, setBuildingStatusFilter] = reactExports.useState([]);
  const [eligibilityFilter, setEligibilityFilter] = reactExports.useState([]);
  const [pipelineFilter, setPipelineFilter] = reactExports.useState([]);
  const [docFilter, setDocFilter] = reactExports.useState([]);
  const [nocStatusFilter, setNocStatusFilter] = reactExports.useState([]);
  const [certFilter, setCertFilter] = reactExports.useState([]);
  const [cycleFilter, setCycleFilter] = reactExports.useState([]);
  const [saStatusFilter, setSaStatusFilter] = reactExports.useState([]);
  const [saStartFrom, setSaStartFrom] = reactExports.useState("");
  const [saStartTo, setSaStartTo] = reactExports.useState("");
  const [goiFrom, setGoiFrom] = reactExports.useState("");
  const [goiTo, setGoiTo] = reactExports.useState("");
  const [naStartFrom, setNaStartFrom] = reactExports.useState("");
  const [naStartTo, setNaStartTo] = reactExports.useState("");
  const docStatusOptions = settings?.settings.generalDocStatuses ?? DEFAULT_SETTINGS.generalDocStatuses;
  const certStatusOptions = settings?.settings.certificationStatuses ?? DEFAULT_SETTINGS.certificationStatuses;
  const facilityTypes = settings?.settings.facilityTypes ?? DEFAULT_SETTINGS.facilityTypes;
  const buildingStatusOptions = settings?.settings.buildingStatuses ?? DEFAULT_SETTINGS.buildingStatuses;
  const eligibilityOptions = buildEligibilityOptions(
    settings?.settings.eligibilityOptions
  );
  const filtered = reactExports.useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.rows.filter((r) => {
      if (!multiFilterMatches(r.facility.block, blockFilter)) return false;
      if (!multiFilterMatches(r.facility.facilityType, typeFilter)) return false;
      if (!multiFilterMatches(r.building?.buildingStatus ?? "", buildingStatusFilter))
        return false;
      if (!multiFilterMatches(r.facility.eligibility ?? "", eligibilityFilter))
        return false;
      if (!multiFilterMatches(
        r.cycleNumber ? String(r.cycleNumber) : "#none",
        cycleFilter
      ))
        return false;
      if (categoryId === "sa" && !multiFilterMatches(r.sa?.status ?? "", saStatusFilter))
        return false;
      if (categoryId === "sa" && !isoInRange(
        r.sa?.actualStartDate ?? r.sa?.scheduledDate ?? null,
        saStartFrom,
        saStartTo
      ))
        return false;
      if (categoryId === "certification") {
        if (!isoInRange(
          r.nqas?.goiLetterDate ?? r.nqas?.certificationDate ?? null,
          goiFrom,
          goiTo
        ))
          return false;
        if (!isoInRange(
          r.nqas?.scheduledStartDate ?? null,
          naStartFrom,
          naStartTo
        ))
          return false;
      }
      if (categoryId === "certification" && !multiFilterMatches(
        r.facility.statusOverride || r.facility.currentStatus || "—",
        pipelineFilter
      ))
        return false;
      if (categoryId === "certification" && !multiFilterMatches(r.nqas?.certificationStatus ?? "", certFilter))
        return false;
      if (categoryId === "sa" && !multiFilterMatches(r.sa?.generalDocStatus ?? "", docFilter))
        return false;
      if (categoryId === "noc" && !multiFilterMatches(
        deriveFireNocStatus(
          r.noc?.nocAvailable || null,
          r.noc?.expiryDate ?? null,
          r.noc?.status || null
        ),
        nocStatusFilter
      ))
        return false;
      if (q && !`${r.facility.name} ${r.facility.phc} ${r.facility.block} ${r.facility.ninNumber ?? ""}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [
    data,
    search,
    blockFilter,
    typeFilter,
    buildingStatusFilter,
    eligibilityFilter,
    categoryId,
    pipelineFilter,
    certFilter,
    docFilter,
    nocStatusFilter,
    cycleFilter,
    saStatusFilter,
    saStartFrom,
    saStartTo,
    goiFrom,
    goiTo,
    naStartFrom,
    naStartTo
  ]);
  const pager = usePagination(filtered, [
    search,
    blockFilter,
    typeFilter,
    buildingStatusFilter,
    eligibilityFilter,
    pipelineFilter,
    certFilter,
    docFilter,
    nocStatusFilter,
    cycleFilter,
    saStatusFilter,
    saStartFrom,
    saStartTo,
    goiFrom,
    goiTo,
    naStartFrom,
    naStartTo
  ]);
  const isAdminLogin = data?.me.appRole === "admin";
  const hiddenCategories = isAdminLogin ? [] : settings?.settings.hiddenCategories ?? DEFAULT_SETTINGS.hiddenCategories;
  if (categoryId && hiddenCategories.includes(categoryId)) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(AppShell, { title: "Page hidden", subtitle: "This page has been hidden by the State Admin", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-muted-foreground", children: [
      "This facility data page is currently not visible. ",
      " ",
      /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/facilities", className: "text-primary underline", children: "Back to Facility Master List" })
    ] }) });
  }
  if (!categoryId) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(AppShell, { title: "Not found", subtitle: "Unknown facility data category", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-muted-foreground", children: [
      "This category does not exist. ",
      " ",
      /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/facilities", className: "text-primary underline", children: "Back to Facility Master List" })
    ] }) });
  }
  const meta = CATEGORY_META[categoryId];
  const columns = CATEGORY_COLUMN_IDS[categoryId];
  const headerOverrides = withOverrides(
    columns.map((c) => TRACKER_COLUMN_LABELS[c]),
    settings?.settings.tableHeaderOverrides
  );
  const exportExcelPage = () => {
    exportExcel(
      `${categoryId}-view-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.xlsx`,
      meta.label.slice(0, 31),
      exportHeaders(columns, settings?.settings.tableHeaderOverrides),
      exportRows(filtered, columns, {
        ...DEFAULT_SETTINGS,
        ...settings?.settings ?? {}
      })
    );
    toast.success("Excel downloaded");
  };
  const exportPdfPage = () => {
    exportPdf(
      `${categoryId}-view-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.pdf`,
      meta.label,
      exportHeaders(columns, settings?.settings.tableHeaderOverrides),
      exportRows(filtered, columns, {
        ...DEFAULT_SETTINGS,
        ...settings?.settings ?? {}
      }),
      `${filtered.length} facilities · generated ${(/* @__PURE__ */ new Date()).toLocaleString()}`
    );
    toast.success("PDF downloaded");
  };
  const canEdit = data?.me.appRole === "admin" || data?.me.appRole === "entry";
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    AppShell,
    {
      title: meta.label,
      titleIcon: CATEGORY_ICONS[meta.icon],
      subtitle: "Quick view — only this category's columns are shown",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsx(
        HeaderExportMenu,
        {
          disabled: !data || data.rows.length === 0,
          onExcel: exportExcelPage,
          onPdf: exportPdfPage,
          excelLabel: `${meta.label} — Excel`,
          pdfLabel: `${meta.label} — PDF`
        }
      ),
      children: data === void 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center py-24", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-6 animate-spin text-muted-foreground" }) }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CategoryNav, { active: categoryId }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          FilterBar,
          {
            activeCount: countActiveFilters([
              blockFilter,
              typeFilter,
              pipelineFilter,
              certFilter,
              docFilter,
              nocStatusFilter,
              buildingStatusFilter,
              eligibilityFilter,
              cycleFilter,
              saStatusFilter,
              saStartFrom,
              saStartTo,
              goiFrom,
              goiTo,
              naStartFrom,
              naStartTo
            ]) + (search.trim() ? 1 : 0),
            onClearAll: () => {
              setSearch("");
              setBlockFilter([]);
              setTypeFilter([]);
              setPipelineFilter([]);
              setCertFilter([]);
              setDocFilter([]);
              setNocStatusFilter([]);
              setBuildingStatusFilter([]);
              setEligibilityFilter([]);
              setCycleFilter([]);
              setSaStatusFilter([]);
              setSaStartFrom("");
              setSaStartTo("");
              setGoiFrom("");
              setGoiTo("");
              setNaStartFrom("");
              setNaStartTo("");
            },
            summary: `Showing ${pager.total} of ${data.rows.length} facilities`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                FilterSearch,
                {
                  value: search,
                  onChange: setSearch,
                  placeholder: "Search facility, PHC, block or NIN…"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                FilterDropdown,
                {
                  label: "Block",
                  options: (data?.blocks ?? []).map((b) => ({ value: b.name, label: b.name })),
                  value: blockFilter,
                  onChange: (v) => setBlockFilter(v),
                  triggerWidth: "w-44"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                FilterDropdown,
                {
                  label: "Facility type",
                  options: facilityTypes.map((t) => ({ value: t, label: t })),
                  value: typeFilter,
                  onChange: (v) => setTypeFilter(v),
                  triggerWidth: "w-44"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(CycleFilter, {}),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                FilterDropdown,
                {
                  label: "NQAS Eligibility",
                  options: eligibilityOptions.map((o) => ({
                    value: o.value,
                    label: o.label
                  })),
                  value: eligibilityFilter,
                  onChange: (v) => setEligibilityFilter(v),
                  triggerWidth: "w-48"
                }
              ),
              categoryId === "certification" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  FilterDropdown,
                  {
                    label: FACILITY_CURRENT_STATUS_LABEL,
                    options: [
                      ...new Set(
                        data.rows.map(
                          (r) => r.facility.statusOverride || r.facility.currentStatus || "—"
                        )
                      )
                    ].sort().map((s) => ({ value: s, label: s })),
                    value: pipelineFilter,
                    onChange: (v) => setPipelineFilter(v),
                    triggerWidth: "w-52"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  FilterDropdown,
                  {
                    label: "Certification status",
                    options: [...certStatusOptions].sort().map((s) => ({ value: s, label: s })),
                    value: certFilter,
                    onChange: (v) => setCertFilter(v),
                    triggerWidth: "w-56"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  DateRangeFilter,
                  {
                    label: "GOI / Cert date",
                    from: goiFrom,
                    to: goiTo,
                    onFrom: setGoiFrom,
                    onTo: setGoiTo
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  DateRangeFilter,
                  {
                    label: "NA start",
                    from: naStartFrom,
                    to: naStartTo,
                    onFrom: setNaStartFrom,
                    onTo: setNaStartTo
                  }
                )
              ] }),
              categoryId === "sa" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  FilterDropdown,
                  {
                    label: "SaQsham documents status",
                    options: [...docStatusOptions].sort().map((s) => ({ value: s, label: s })),
                    value: docFilter,
                    onChange: (v) => setDocFilter(v),
                    triggerWidth: "w-56"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  FilterDropdown,
                  {
                    label: "State Assessment Status",
                    options: [
                      ...new Set(
                        data.rows.map((r) => r.sa?.status ?? "").filter((s) => !!s)
                      )
                    ].sort().map((s) => ({ value: s, label: s })),
                    value: saStatusFilter,
                    onChange: (v) => setSaStatusFilter(v),
                    triggerWidth: "w-56"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  DateRangeFilter,
                  {
                    label: "SA start",
                    from: saStartFrom,
                    to: saStartTo,
                    onFrom: setSaStartFrom,
                    onTo: setSaStartTo
                  }
                )
              ] }),
              categoryId === "noc" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                FilterDropdown,
                {
                  label: "Fire NOC validity",
                  options: ["Valid", "Expiring Soon", "Expired", "Not Obtained"].map((s) => ({
                    value: s,
                    label: s
                  })),
                  value: nocStatusFilter,
                  onChange: (v) => setNocStatusFilter(v),
                  triggerWidth: "w-52"
                }
              ),
              categoryId === "building" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                FilterDropdown,
                {
                  label: "Building status",
                  options: buildingStatusOptions.map((t) => ({ value: t, label: t })),
                  value: buildingStatusFilter,
                  onChange: (v) => setBuildingStatusFilter(v),
                  triggerWidth: "w-52"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(RowViewSelect, { value: pager.view, onChange: pager.setView, total: pager.total })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          AutoFitTableScroll,
          {
            className: "glass",
            maxHeight: "calc(100vh - 160px)",
            minHeight: "480px",
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "sticky left-0 z-20 border-r bg-background", children: "Facility" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "min-w-32", children: "Block" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "min-w-32", children: "PHC" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "NIN" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "min-w-20", children: "Type" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "min-w-32 text-center", children: "Certification Cycle" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "min-w-40", children: "NQAS Eligibility" }),
                columns.map((c, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: TRACKER_COLUMN_WIDTHS[c], children: headerOverrides[i] }, c)),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "sticky right-0 z-10 min-w-32 border-l bg-background text-right", children: "Update" })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
                filtered.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  TableCell,
                  {
                    colSpan: 7 + columns.length + (canEdit ? 1 : 0),
                    className: "py-10 text-center text-muted-foreground",
                    children: "No facilities match your filters."
                  }
                ) }),
                pager.visible.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  CategoryRow,
                  {
                    row: r,
                    columns,
                    settings: settings?.settings,
                    canEdit
                  },
                  r.facility._id
                ))
              ] })
            ] })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          PaginationBar,
          {
            total: pager.total,
            view: pager.view,
            page: pager.page,
            onPage: pager.setPage
          }
        )
      ] })
    }
  );
}
function EligibilityBadge({
  value,
  options
}) {
  const label = options.find((o) => o.value === value)?.label ?? value ?? "";
  return value === "Eligible" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100", children: label || "Eligible" }) : value === "Possible" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { className: "bg-sky-100 text-sky-800 hover:bg-sky-100", children: label || "Future Candidate" }) : value ? /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", className: "border-rose-200 text-rose-700", children: label }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "—" });
}
function CategoryRow({
  row,
  columns,
  settings,
  canEdit
}) {
  const updateTrackerRow = useMutation(api.facilities.updateTrackerRow);
  const updateEligibility = useMutation(api.facilityOps.updateFacilityEligibility);
  const initial = reactExports.useMemo(() => {
    const f = row.facility;
    return {
      certStatus: row.nqas?.certificationStatus ?? "",
      certDate: row.nqas?.certificationDate ?? "",
      certScore: row.nqas?.scorePercent?.toString() ?? "",
      naScheduled: row.nqas?.scheduledStartDate ?? "",
      naEnd: row.nqas?.actualEndDate ?? row.nqas?.scheduledEndDate ?? "",
      naMode: row.nqas?.mode ?? "",
      departments: (row.nqas?.departments ?? []).join(", "),
      gapAmount: row.fund?.amountSanctioned?.toString() ?? "",
      gcYear: row.fund?.financialYear ?? "",
      nqasIaQ1: f.nqasIaQ1?.toString() ?? "",
      nqasIaQ2: f.nqasIaQ2?.toString() ?? "",
      kayakalpIaQ1: f.kayakalpIaQ1?.toString() ?? "",
      kayakalpIaQ2: f.kayakalpIaQ2?.toString() ?? "",
      saStatus: row.sa?.status ?? "",
      saScore: row.sa?.scorePercent?.toString() ?? "",
      saAssessor1: row.sa?.assessor1Name ?? "",
      saAssessor1Hud: row.sa?.assessor1Hud ?? "",
      saAssessor2: row.sa?.assessor2Name ?? "",
      saAssessor2Hud: row.sa?.assessor2Hud ?? "",
      saStart: row.sa?.actualStartDate ?? row.sa?.scheduledDate ?? "",
      saEnd: row.sa?.actualEndDate ?? "",
      genDoc: row.sa?.generalDocStatus ?? "",
      surv1: row.nqas?.surveillanceDone1 ?? "",
      surv2: row.nqas?.surveillanceDone2 ?? "",
      survScore: row.nqas?.manualScore?.toString() ?? "",
      buildingType: row.building?.buildingType ?? "",
      buildingStatus: row.building?.buildingStatus ?? "",
      nocAvailable: row.noc?.nocAvailable ?? "",
      nocStatus: row.noc?.status ?? "",
      nocCertified: row.noc?.issuedDate ?? "",
      nocValidity: row.noc?.expiryDate ?? "",
      remarks: f.remarks ?? ""
    };
  }, [row]);
  const [draft, setDraft] = reactExports.useState(initial);
  const [busy, setBusy] = reactExports.useState(false);
  const [fundFile, setFundFile] = reactExports.useState(null);
  const [nocFile, setNocFile] = reactExports.useState(null);
  const [condemnedFile, setCondemnedFile] = reactExports.useState(null);
  const [saReportFile, setSaReportFile] = reactExports.useState(null);
  const [saChecklistFile, setSaChecklistFile] = reactExports.useState(null);
  const [fundClear, setFundClear] = reactExports.useState(false);
  const [nocClear, setNocClear] = reactExports.useState(false);
  const [condemnedClear, setCondemnedClear] = reactExports.useState(false);
  const [saReportClear, setSaReportClear] = reactExports.useState(false);
  const [saChecklistClear, setSaChecklistClear] = reactExports.useState(false);
  const [resultFile, setResultFile] = reactExports.useState(null);
  const [resultClear, setResultClear] = reactExports.useState(false);
  const [lastInitial, setLastInitial] = reactExports.useState(initial);
  if (lastInitial !== initial) {
    setLastInitial(initial);
    setDraft(initial);
  }
  const filesDirty = !!fundFile || !!nocFile || !!condemnedFile || !!saReportFile || !!saChecklistFile || !!resultFile || fundClear || nocClear || condemnedClear || saReportClear || saChecklistClear || resultClear;
  const dirty = DRAFT_KEYS.some((k) => draft[k] !== initial[k]) || filesDirty;
  const derivedNocStatus = deriveFireNocStatus(
    draft.nocAvailable || null,
    draft.nocValidity || null,
    initial.nocStatus || null
  );
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const [eligDraft, setEligDraft] = reactExports.useState(null);
  const eligValue = eligDraft ?? row.facility.eligibility;
  const eligDirty = eligDraft !== null && eligDraft !== row.facility.eligibility;
  const buildingTypes = settings?.buildingTypes ?? [
    "Own Building",
    "Rented Building",
    "Rent Free Building"
  ];
  const docStatuses = settings?.generalDocStatuses ?? DEFAULT_SETTINGS.generalDocStatuses;
  const assessmentModes = settings?.assessmentModes ?? [
    "Physical",
    "Virtual",
    "Hybrid"
  ];
  const buildingStatuses = settings?.buildingStatuses ?? [
    "Good",
    "Needs Repair",
    "Under Renovation",
    "Dilapidated"
  ];
  const eligibilityOptions = buildEligibilityOptions(
    settings?.eligibilityOptions
  );
  const departmentOptions = settings?.departmentCriteria ?? DEFAULT_SETTINGS.departmentCriteria;
  const certStatusOptions = settings?.certificationStatuses ?? DEFAULT_SETTINGS.certificationStatuses;
  const assessorHudOptions = settings?.assessorHuds ?? DEFAULT_SETTINGS.assessorHuds;
  const saStatusOptions = settings?.saStatuses ?? DEFAULT_SETTINGS.saStatuses;
  const nocAvailableOptions = settings?.nocAvailableOptions ?? DEFAULT_SETTINGS.nocAvailableOptions;
  const save = async () => {
    if (!dirty && !eligDirty) return;
    setBusy(true);
    try {
      const num = (v) => v.trim() ? Number(v) : void 0;
      const str = (v) => v.trim() ? v : void 0;
      await updateTrackerRow({
        facilityId: row.facility._id,
        remarks: draft.remarks !== initial.remarks ? str(draft.remarks) : void 0,
        nqasIaQ1: draft.nqasIaQ1 !== initial.nqasIaQ1 ? num(draft.nqasIaQ1) : void 0,
        nqasIaQ2: draft.nqasIaQ2 !== initial.nqasIaQ2 ? num(draft.nqasIaQ2) : void 0,
        kayakalpIaQ1: draft.kayakalpIaQ1 !== initial.kayakalpIaQ1 ? num(draft.kayakalpIaQ1) : void 0,
        kayakalpIaQ2: draft.kayakalpIaQ2 !== initial.kayakalpIaQ2 ? num(draft.kayakalpIaQ2) : void 0,
        certStatus: draft.certStatus !== initial.certStatus ? draft.certStatus || void 0 : void 0,
        certDate: draft.certDate !== initial.certDate ? str(draft.certDate) : void 0,
        certScore: draft.certScore !== initial.certScore ? num(draft.certScore) : void 0,
        naScheduledDate: draft.naScheduled !== initial.naScheduled ? str(draft.naScheduled) : void 0,
        naEndDate: draft.naEnd !== initial.naEnd ? str(draft.naEnd) : void 0,
        naMode: draft.naMode !== initial.naMode ? str(draft.naMode) || void 0 : void 0,
        naDepartments: draft.departments !== initial.departments ? draft.departments : void 0,
        gapClosureAmount: draft.gapAmount !== initial.gapAmount ? num(draft.gapAmount) : void 0,
        gcFundYear: draft.gcYear !== initial.gcYear ? str(draft.gcYear) : void 0,
        saStatus: draft.saStatus !== initial.saStatus ? draft.saStatus || void 0 : void 0,
        saScore: draft.saScore !== initial.saScore ? num(draft.saScore) : void 0,
        saAssessor1Name: draft.saAssessor1 !== initial.saAssessor1 ? str(draft.saAssessor1) : void 0,
        saAssessor1Hud: draft.saAssessor1Hud !== initial.saAssessor1Hud ? str(draft.saAssessor1Hud) : void 0,
        saAssessor2Name: draft.saAssessor2 !== initial.saAssessor2 ? str(draft.saAssessor2) : void 0,
        saAssessor2Hud: draft.saAssessor2Hud !== initial.saAssessor2Hud ? str(draft.saAssessor2Hud) : void 0,
        saStartDate: draft.saStart !== initial.saStart ? str(draft.saStart) : void 0,
        saEndDate: draft.saEnd !== initial.saEnd ? str(draft.saEnd) : void 0,
        generalDocStatus: draft.genDoc !== initial.genDoc ? str(draft.genDoc) || void 0 : void 0,
        surveillanceDone1: draft.surv1 !== initial.surv1 ? str(draft.surv1) : void 0,
        surveillanceDone2: draft.surv2 !== initial.surv2 ? str(draft.surv2) : void 0,
        manualScore: draft.survScore !== initial.survScore ? num(draft.survScore) : void 0,
        buildingType: draft.buildingType !== initial.buildingType ? str(draft.buildingType) : void 0,
        buildingStatus: draft.buildingStatus !== initial.buildingStatus ? str(draft.buildingStatus) : void 0,
        nocAvailable: draft.nocAvailable !== initial.nocAvailable ? str(draft.nocAvailable) : void 0,
        fireNocIssuedDate: draft.nocCertified !== initial.nocCertified ? str(draft.nocCertified) : void 0,
        fireNocValidity: draft.nocValidity !== initial.nocValidity ? str(draft.nocValidity) : void 0,
        fundAttachmentId: fundFile?.attachmentId,
        fundAttachmentName: fundFile?.attachmentName,
        fundAttachmentType: fundFile?.attachmentType,
        clearFundAttachment: !fundFile && fundClear,
        // Anchor: a Remove-only save must still enter the fund section (its
        // wants-gate ignores the clear flag), so pass the current status.
        fundStatus: !fundFile && fundClear ? row.fund?.status ?? void 0 : void 0,
        nocAttachmentId: nocFile?.attachmentId,
        nocAttachmentName: nocFile?.attachmentName,
        nocAttachmentType: nocFile?.attachmentType,
        clearNocAttachment: !nocFile && nocClear,
        // Same anchor for the NOC section.
        fireNocStatus: !nocFile && nocClear ? initial.nocStatus || void 0 : void 0,
        condemnedAttachmentId: condemnedFile?.attachmentId,
        condemnedAttachmentName: condemnedFile?.attachmentName,
        condemnedAttachmentType: condemnedFile?.attachmentType,
        clearCondemnedAttachment: !condemnedFile && condemnedClear,
        saReportAttachmentId: saReportFile?.attachmentId,
        saReportAttachmentName: saReportFile?.attachmentName,
        saReportAttachmentType: saReportFile?.attachmentType,
        saChecklistAttachmentId: saChecklistFile?.attachmentId,
        saChecklistAttachmentName: saChecklistFile?.attachmentName,
        saChecklistAttachmentType: saChecklistFile?.attachmentType,
        clearSaReportAttachment: !saReportFile && saReportClear,
        clearSaChecklistAttachment: !saChecklistFile && saChecklistClear,
        resultAttachmentId: resultFile?.attachmentId,
        resultAttachmentName: resultFile?.attachmentName,
        resultAttachmentType: resultFile?.attachmentType,
        clearResultAttachment: !resultFile && resultClear
      });
      if (eligDirty && eligValue) {
        await updateEligibility({
          facilityId: row.facility._id,
          eligibility: eligValue
        });
        setEligDraft(null);
      }
      setFundFile(null);
      setNocFile(null);
      setCondemnedFile(null);
      setSaReportFile(null);
      setSaChecklistFile(null);
      setFundClear(false);
      setNocClear(false);
      setCondemnedClear(false);
      setSaReportClear(false);
      setSaChecklistClear(false);
      setResultFile(null);
      setResultClear(false);
      toast.success("Row updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
      setDraft(initial);
      setEligDraft(null);
    } finally {
      setBusy(false);
    }
  };
  const input = (k, type = "text", step) => /* @__PURE__ */ jsxRuntimeExports.jsx(
    Input,
    {
      type,
      step,
      className: "glass-input h-8 w-full text-xs",
      value: draft[k],
      disabled: busy || !canEdit,
      onChange: (e) => set(k, e.target.value)
    }
  );
  const select = (k, options, allowEmpty = true) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Select,
    {
      value: draft[k],
      disabled: busy || !canEdit,
      onValueChange: (v) => set(k, v === "__none" ? "" : v),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "glass-input h-8 w-full text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "—" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
          allowEmpty && /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "__none", children: "—" }),
          options.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: o, children: o }, o))
        ] })
      ]
    }
  );
  const cell = (c) => {
    switch (c) {
      /* ---- NQAS Certification ---- */
      case "pipelineStatus":
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            StatusBadge,
            {
              status: row.facility.statusOverride || row.facility.currentStatus || "—"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: "block text-[10px] leading-tight text-muted-foreground",
              "data-tip": "Merged facility current status derived from SA, documents and NQAS",
              children: mergedPipelineStatus(
                row.facility,
                row.sa ? {
                  status: row.sa.status ?? "Not Yet Initiated",
                  generalDocStatus: row.sa.generalDocStatus ?? null
                } : null,
                row.nqas ? {
                  status: row.nqas.status ?? "Pending",
                  scheduledStartDate: row.nqas.scheduledStartDate ?? null,
                  certificationStatus: row.nqas.certificationStatus ?? null,
                  validityDate: row.nqas.validityDate ?? null
                } : null,
                { ...DEFAULT_SETTINGS, ...settings?.settings ?? {} }
              )
            }
          )
        ] });
      case "certStatus":
        return select("certStatus", certStatusOptions);
      case "certDate":
        return input("certDate", "date");
      case "certScore":
        return input("certScore", "number", "any");
      case "resultDoc":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          CellUpload,
          {
            id: row.resultDocumentId ?? null,
            name: row.resultDocumentName ?? null,
            value: resultFile,
            onChange: (v) => {
              setResultFile(v);
              setResultClear(false);
            },
            onClear: () => setResultClear(true),
            disabled: busy || !canEdit,
            hint: row.resultDocumentUpdatedAt || resultClear ? `Updated: ${resultClear ? "removing…" : toDisplayDateTime(row.resultDocumentUpdatedAt ?? null)}` : null
          }
        );
      /* ---- NQAS Assessment ---- */
      case "naScheduled":
        return input("naScheduled", "date");
      case "naEnd":
        return input("naEnd", "date");
      case "naMode":
        return select("naMode", assessmentModes);
      case "departments":
        return select("departments", departmentOptions, true);
      /* ---- Gap Closure Fund ---- */
      case "gapAmount":
        return input("gapAmount", "number");
      case "gcYear":
        return input("gcYear");
      case "procLink":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          CellUpload,
          {
            id: row.fund?.fundAttachmentId ?? null,
            name: row.fund?.fundAttachmentName ?? null,
            value: fundFile,
            onChange: (v) => {
              setFundFile(v);
              setFundClear(false);
            },
            onClear: () => setFundClear(true),
            disabled: busy || !canEdit,
            hint: row.fund?.updatedAt || fundClear ? `Updated: ${fundClear ? "removing…" : toDisplayDateTime(row.fund?.updatedAt ?? null)}` : null
          }
        );
      /* ---- Internal Assessment ---- */
      case "nqasIaQ1":
        return input("nqasIaQ1", "number", "any");
      case "nqasIaQ2":
        return input("nqasIaQ2", "number", "any");
      case "nqasIaCmp":
        return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ComparisonCell, { q1: row.facility.nqasIaQ1 ?? null, q2: row.facility.nqasIaQ2 ?? null }) });
      case "kayakalpIaQ1":
        return input("kayakalpIaQ1", "number", "any");
      case "kayakalpIaQ2":
        return input("kayakalpIaQ2", "number", "any");
      case "kayakalpIaCmp":
        return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          ComparisonCell,
          {
            q1: row.facility.kayakalpIaQ1 ?? null,
            q2: row.facility.kayakalpIaQ2 ?? null
          }
        ) });
      /* ---- State Assessment ---- */
      case "saStatus":
        return select("saStatus", saStatusOptions);
      case "saScore":
        return input("saScore", "number", "any");
      case "saAssessor1":
        return input("saAssessor1");
      case "saAssessor1Hud":
        return select("saAssessor1Hud", assessorHudOptions);
      case "saAssessor2":
        return input("saAssessor2");
      case "saAssessor2Hud":
        return select("saAssessor2Hud", assessorHudOptions);
      case "saReport":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          CellUpload,
          {
            id: row.sa?.reportAttachmentId ?? null,
            name: row.sa?.reportAttachmentName ?? null,
            value: saReportFile,
            onChange: (v) => {
              setSaReportFile(v);
              setSaReportClear(false);
            },
            onClear: () => setSaReportClear(true),
            disabled: busy || !canEdit
          }
        );
      case "saChecklist":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          CellUpload,
          {
            id: row.sa?.checklistAttachmentId ?? null,
            name: row.sa?.checklistAttachmentName ?? null,
            value: saChecklistFile,
            onChange: (v) => {
              setSaChecklistFile(v);
              setSaChecklistClear(false);
            },
            onClear: () => setSaChecklistClear(true),
            disabled: busy || !canEdit
          }
        );
      case "saStart":
        return input("saStart", "date");
      case "saEnd":
        return input("saEnd", "date");
      case "genDoc":
        return select("genDoc", docStatuses);
      /* ---- Recertification / surveillance ---- */
      case "survDue1":
        return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs whitespace-nowrap text-muted-foreground", children: row.nqas?.surveillanceDue1 ? toDisplayDate(row.nqas.surveillanceDue1) : "—" });
      case "surv1":
        return input("surv1", "date");
      case "survDue2":
        return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs whitespace-nowrap text-muted-foreground", children: row.nqas?.surveillanceDue2 ? toDisplayDate(row.nqas.surveillanceDue2) : "—" });
      case "surv2":
        return input("surv2", "date");
      case "survScore":
        return input("survScore", "number", "any");
      case "validityDate":
        return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs whitespace-nowrap text-muted-foreground", children: row.nqas?.validityDate ? toDisplayDate(row.nqas.validityDate) : "—" });
      case "recertStatus":
        return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs break-words text-muted-foreground [white-space:normal]", children: row.nqas?.recertStatus ?? "—" });
      case "recertYear":
        return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs tabular-nums text-muted-foreground", children: row.nqas?.recertYear ?? "—" });
      /* ---- Building ---- */
      case "buildingType":
        return select("buildingType", buildingTypes);
      case "buildingStatus":
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
          select("buildingStatus", buildingStatuses),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "block text-[10px] leading-tight text-muted-foreground", children: [
            "Updated:",
            " ",
            row.building?.lastUpdatedAt ? toDisplayDateTime(row.building.lastUpdatedAt) : "—"
          ] })
        ] });
      case "condemned":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          CellUpload,
          {
            id: row.building?.condemnedAttachmentId ?? null,
            name: row.building?.condemnedAttachmentName ?? null,
            value: condemnedFile,
            onChange: (v) => {
              setCondemnedFile(v);
              setCondemnedClear(false);
            },
            onClear: () => setCondemnedClear(true),
            disabled: busy || !canEdit
          }
        );
      /* ---- Fire NOC ---- */
      case "nocAvailable":
        return select("nocAvailable", nocAvailableOptions);
      case "nocStatus":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: derivedNocStatus });
      case "nocCertified":
        return input("nocCertified", "date");
      case "nocValidity":
        return input("nocValidity", "date");
      case "nocDoc":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          CellUpload,
          {
            id: row.noc?.nocAttachmentId ?? null,
            name: row.noc?.nocAttachmentName ?? null,
            value: nocFile,
            onChange: (v) => {
              setNocFile(v);
              setNocClear(false);
            },
            onClear: () => setNocClear(true),
            disabled: busy || !canEdit,
            hint: row.noc?.updatedAt || nocClear ? `Updated: ${nocClear ? "removing…" : toDisplayDateTime(row.noc?.updatedAt ?? null)}` : null
          }
        );
      case "remarks":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          Textarea,
          {
            rows: 2,
            className: "glass-input min-h-8 w-full resize-y text-xs [field-sizing:content]",
            value: draft.remarks,
            disabled: busy || !canEdit,
            onChange: (e) => set("remarks", e.target.value)
          }
        );
      default:
        return null;
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { className: dirty || eligDirty ? "bg-primary/5" : void 0, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "sticky left-0 z-20 border-r bg-background", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      Link,
      {
        to: `/facilities/${row.facility._id}`,
        className: "block break-words font-medium hover:underline",
        "data-tip": row.facility.name,
        children: row.facility.name
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "text-muted-foreground", children: row.facility.block }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "text-muted-foreground", children: row.facility.phc }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "font-mono text-xs text-muted-foreground", children: row.facility.ninNumber ?? "—" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(FacilityTypeBadge, { type: row.facility.facilityType }) }),
    "      ",
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CycleBadge, { cycleNumber: row.cycleNumber, cycleType: row.cycleType }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: canEdit ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Select,
      {
        value: eligValue,
        disabled: busy,
        onValueChange: (v) => setEligDraft(v),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "glass-input h-8 w-full text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: eligibilityOptions.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: o.value, children: o.label }, o.value)) })
        ]
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
      EligibilityBadge,
      {
        value: row.facility.eligibility,
        options: eligibilityOptions
      }
    ) }),
    columns.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: TRACKER_COLUMN_WIDTHS[c], children: cell(c) }, c)),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "sticky right-0 z-10 border-l bg-background", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-end", children: canEdit ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Button,
      {
        size: "sm",
        disabled: busy || !dirty && !eligDirty,
        "data-tip": dirty || eligDirty ? "Save changes in this row" : "No changes",
        onClick: save,
        children: [
          busy ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-3.5 animate-spin" }) : null,
          "Update"
        ]
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: "View only" }) }) })
  ] });
}

export { FacilityDataPage as default };
