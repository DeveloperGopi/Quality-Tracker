import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, L as LoaderCircle, S as ShieldCheck, aH as CircleX, aI as ClipboardPaste, Z as Upload, a2 as Download, F as FileSpreadsheet, T as TriangleAlert, A as ArrowRight, I as Info, m as Check, Q as Search, ae as Settings2, C as CircleCheck, E as ExternalLink, X as History, ab as Undo2, aq as Copy, f as ListChecks, Y as Plus, w as RotateCcw, G as GripVertical, a3 as X, a7 as Pencil, ar as Trash2, p as Lock, $ as Target, _ as BookMarked, aJ as FileUp, e as Eye } from './icons-BxQpodNr.js';
import { read as readSync, utils } from './vendor-xlsx-yBJAythd.js';
import { l as useQuery, j as api, m as useMutation, B as Button, c as cn, t as toast, u as useAuth, h as Card, i as CardHeader, C as CardTitle, f as CardContent, b as useNavigate, d as useSearchParams } from './index-CBV6wOh8.js';
import { _ as STATE_LABELS, $ as cleanSaqshamRow, a0 as seedAliasesForFacilities, a1 as buildSaqshamPreview, a2 as summarizePreview, a3 as hasBlockingErrors, a4 as selectedRows, a5 as bucketCounts, a6 as previewBucket, a7 as BUCKET_LABELS, a8 as isEligiblePreviewRow, a9 as REQUIRED_COLUMN_KEYS, aa as ALL_COLUMNS, ab as duplicateRowsHint, ac as PORTAL_COLUMNS, ad as HELPER_COLUMNS, ae as REPORT_STATUS_VALUES, e as Popover, f as PopoverTrigger, g as PopoverContent, af as BUCKET_ORDER, ag as convexSafe, ah as autoMapColumns, G as toDdMmmYyyy, ai as fuzzyScore, aj as SAQSHAM_GROUP_COLORS, ak as statusMapIssues, al as isResultDeclared, am as normalizeStatusKey, an as SAQSHAM_STATUS_MAP, ao as DEFAULT_REPORT_GROUPS, D as DEFAULT_SETTINGS, ap as fullExportColumns, C as COLUMN_BY_KEY, k as cellText, aq as isDeprecatedColumn, A as AppShell } from './AppShell-CP099uvN.js';
import { S as SAQSHAM_SAMPLE_TSV, p as parsePastedText, d as downloadSampleFile, a as parseSaqshamFile, I as IaImportWizard, b as IaBatchReportWorker, c as downloadIaQuarterTemplate } from './IaImport-CSdrDoxH.js';
import { B as Badge } from './badge-Cc2gQHFR.js';
import { C as Checkbox } from './checkbox-CjOYMc2v.js';
import { I as Input } from './input-Cy2oZLur.js';
import { T as Textarea } from './textarea-Dm9kSFQo.js';
import { D as Dialog, a as DialogContent, b as DialogHeader, c as DialogTitle, d as DialogDescription, e as DialogFooter } from './dialog-BW3GEiPg.js';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from './select-qTILnHQg.js';
import { P as PageShell } from './PageShell-CaOvGLdi.js';
import { F as FacilityCell } from './FacilityCell-CI45DpPw.js';
import { r as rowPasses, U as UniversalFilterBar } from './UniversalFilterBar-uuD2kW1Y.js';
import { E as ExcelJS } from './vendor-exceljs-CqnmHTS6.js';
import { L as Label } from './label-BaPkqXdo.js';
import { T as Tabs, a as TabsList, b as TabsTrigger, c as TabsContent } from './tabs-siU4Pie8.js';
import { D as DropdownMenu, a as DropdownMenuTrigger, b as DropdownMenuContent, c as DropdownMenuLabel, f as DropdownMenuItem } from './dropdown-menu-N0nU9bdA.js';
import { d as downloadLinksTemplate } from './linksExport-CxCdW-9a.js';
import { D as DEFAULT_LINK_FREQUENCIES, a as DEFAULT_LINK_STATUSES } from './links-B7waay9B.js';
import { c as columnWidthPx } from './masterGrid-CjX4ti61.js';
import './vendor-jspdf-BarNdCns.js';
import './vendor-charts--qXk384P.js';
import './NqasLogo-CIWlMexW.js';
import './shareLink-_K-oJu5R.js';
import './IaReminderBanner-CU62scGn.js';
import './today-D9v8Esj5.js';
import './FacilityTypeBadge-8G3otPEU.js';
import './dateInput-0KZh0HdG.js';

const METHOD_LABELS = {
  application_no: "Application No",
  portal_name: "SaQsham name (stored)",
  alias: "Saved alias",
  facility_key: "Facility key",
  helper: "Helper columns",
  exact: "Exact name+type",
  fuzzy: "Spelling variant",
  manual: "Manual",
  none: "—"
};
function matchLabel(row) {
  if (row.method === "manual") return "Manual 100%";
  if (row.match.status === "suggested") {
    const top = row.match.candidates[0]?.score ?? 0;
    return `Spelling variant ${Math.round(top)}%`;
  }
  if (row.method === "none") return "Unmatched";
  if (row.method === "alias" && row.seededAlias) return "Seeded alias";
  const pct = Math.round(row.confidence);
  return `${METHOD_LABELS[row.method]} ${pct}%`;
}
function shortDate(iso) {
  const v = String(iso ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(v)) return "";
  const [y, m, d] = v.slice(0, 10).split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${String(d).padStart(2, "0")}-${months[m - 1]}-${y}`;
}
function previousReportLabel(row) {
  if (row.keptResultDeclared) return "Result declared";
  const v = String(row.currentReport ?? "").trim();
  return v || "-";
}
function nextReportLabel(row) {
  if (row.keptResultDeclared) return "Result declared";
  if (row.keepAsIs) return "Keep as-is";
  if (row.newReport == null) return "Unmapped";
  return row.newReport || "-";
}
function reportChangeLabel(row) {
  const prev = previousReportLabel(row);
  const next = nextReportLabel(row);
  return prev === next ? prev : `${prev} → ${next}`;
}
function portalUpdateChangeLabel(row) {
  const prev = shortDate(row.currentPortalUpdatedOn) || "Not recorded";
  const next = shortDate(row.cleaned.lastUpdate.date) || row.cleaned.lastUpdate.updatedBy || "Not recorded";
  return prev === next ? prev : `${prev} → ${next}`;
}
function applicationTypeLabel(row) {
  return row.cleaned.assessmentType || "New";
}
function notesFor(row) {
  if (row.overrideNote) return row.overrideNote;
  const bits = [];
  if (row.olderApplication)
    bits.push(`Older application (ignored)${row.olderOfApplicationNo ? ` — kept ${row.olderOfApplicationNo}` : ""}`);
  if (row.keptResultDeclared) bits.push("Kept: result declared");
  if (row.movedBack) bits.push("Status moved back");
  if (row.stale) bits.push("Older than current data");
  if (row.unmappedStatus) bits.push("Unmapped status");
  if (row.cleaned.resultDeclared) bits.push("Result declared. Update certification in the NQAS Assessment tab");
  if (!row.cleaned.facilityTypeKnown) bits.push(`Unknown category “${row.cleaned.category}”`);
  if (row.differentScope) bits.push("Different district/state");
  if (row.state === "ambiguous") bits.push("Ambiguous — choose the right facility");
  if (row.cleaned.appliedDepartments.note) bits.push(row.cleaned.appliedDepartments.note);
  if (row.warnings.length) bits.push(...row.warnings);
  return bits.join(" · ") || "—";
}
const SAQSHAM_PREVIEW_COLUMNS = [
  { key: "include", label: "Include", kind: "include", width: 60, align: "center", exportable: false, raw: () => "" },
  { key: "rowNo", label: "Row #", kind: "index", width: 52, align: "right", exportable: true, raw: (r) => r.rowNo },
  { key: "applicationNo", label: "Application No", kind: "text", width: 150, align: "left", exportable: true, raw: (r) => r.cleaned.applicationNo },
  { key: "portalFacility", label: "Portal name (raw)", kind: "text", width: 160, align: "left", exportable: true, raw: (r) => r.cleaned.portalFacilityRaw },
  { key: "matchedFacility", label: "Matched facility", kind: "text", width: 160, align: "left", exportable: true, raw: (r) => r.facilityName || "—" },
  { key: "block", label: "Block", kind: "text", width: 104, align: "left", exportable: true, raw: (r) => r.facilityBlock || "—" },
  { key: "phc", label: "PHC", kind: "text", width: 112, align: "left", exportable: true, raw: (r) => r.facilityPhc || "—" },
  { key: "match", label: "Match", kind: "match", width: 118, align: "center", exportable: true, raw: (r) => matchLabel(r) },
  // Previous → new: two status columns with the arrow between them, then one
  // combined cell per other field so the "what changes" story is on one line.
  { key: "currentStatus", label: "Previous status", kind: "status", width: 164, align: "left", exportable: true, raw: (r) => r.currentStatus || "-" },
  { key: "arrow", label: "", kind: "arrow", width: 32, align: "center", exportable: false, raw: () => "→" },
  { key: "newStatus", label: "New status", kind: "status", width: 164, align: "left", exportable: true, raw: (r) => r.newStatus || "-" },
  { key: "reportChange", label: "Report group (previous → new)", kind: "text", width: 232, align: "left", exportable: true, raw: (r) => reportChangeLabel(r) },
  { key: "updateChange", label: "Portal update (previous → new)", kind: "text", width: 196, align: "left", exportable: true, raw: (r) => portalUpdateChangeLabel(r) },
  { key: "appType", label: "Application", kind: "text", width: 108, align: "center", exportable: true, raw: (r) => applicationTypeLabel(r) },
  { key: "mode", label: "Mode", kind: "text", width: 92, align: "center", exportable: true, raw: (r) => r.optional.assessmentMode || "-" },
  { key: "rowState", label: "Row state", kind: "change", width: 122, align: "center", exportable: true, raw: (r) => STATE_STYLES[r.state].label },
  { key: "notes", label: "Notes", kind: "text", width: 220, align: "left", exportable: true, raw: (r) => notesFor(r) }
];
SAQSHAM_PREVIEW_COLUMNS.filter(
  (c) => c.exportable
);
const STATE_STYLES = {
  ready: { label: STATE_LABELS.ready, className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300/50", icon: "check" },
  no_change: { label: STATE_LABELS.no_change, className: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-300/50", icon: "minus" },
  needs_review: { label: STATE_LABELS.needs_review, className: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-300/50", icon: "alert" },
  unmatched: { label: STATE_LABELS.unmatched, className: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300/50", icon: "x" },
  ambiguous: { label: STATE_LABELS.ambiguous, className: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300/50", icon: "x" },
  skipped: { label: STATE_LABELS.skipped, className: "bg-muted text-muted-foreground border-border/60", icon: "skip" },
  error: { label: STATE_LABELS.error, className: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300/50", icon: "x" }
};

const PRIMARY = "FF0D6960";
const headerFill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: PRIMARY }
};
const UPDATED_HEADERS = [
  "Row",
  "Application No",
  "Portal name",
  "Matched facility",
  "Facility type",
  "PHC",
  "Block",
  "Match",
  "Previous status",
  "New status",
  "Previous report group",
  "New report group",
  "Previous portal update",
  "New portal update",
  "Application",
  "Mode",
  "Applied by",
  "Applied at"
];
const UPDATED_WIDTHS = [7, 17, 24, 26, 14, 15, 15, 22, 26, 26, 26, 26, 19, 19, 12, 12, 20, 24];
const SIMPLE_HEADERS = [
  "Row",
  "Application No",
  "Portal name",
  "Matched facility",
  "Facility type",
  "PHC",
  "Block",
  "Match",
  "Previous status",
  "New status",
  "Previous report group",
  "New report group",
  "Previous portal update",
  "New portal update",
  "Application",
  "Mode",
  "Applied by",
  "Notes"
];
const SIMPLE_WIDTHS = [7, 17, 24, 26, 14, 15, 15, 22, 26, 26, 26, 26, 19, 19, 12, 12, 20, 42];
function text(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const clean = raw.replace(/^'+/, "").trim();
  if (!clean) return "-";
  return /^[=+@]/.test(clean) || clean.startsWith("-") && clean.length > 1 ? ` ${clean}` : clean;
}
function ddmmyyyy(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${iso[3]}-${months[Number(iso[2]) - 1]}-${iso[1]}`;
  }
  return text(raw);
}
function istStamp$1(ms) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date(ms));
  const get = (type) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("day")}-${get("month")}-${get("year")} ${get("hour")}:${get("minute")} IST`;
}
function asState(row) {
  if (row.state === "needs_review") return "Needs decision";
  if (row.state === "unmatched" || row.state === "ambiguous") return "Can't match";
  if (row.state === "error") return "Failed";
  if (row.state === "skipped") return "Skipped";
  if (row.state === "no_change") return "No change";
  if (!row.include) return "Skipped";
  return row.change === "new" ? "New" : "Updated";
}
function buildReportRows(rows, appliedBy, appliedAt) {
  return rows.map((row) => ({
    rowNo: row.rowNo,
    state: asState(row),
    applicationNo: row.cleaned.applicationNo || "-",
    portalName: row.cleaned.portalFacilityRaw || row.cleaned.name || "-",
    matchedFacility: row.facilityName || "-",
    facilityType: row.facilityType || row.cleaned.facilityType || "-",
    phc: row.facilityPhc || "-",
    block: row.facilityBlock || "-",
    match: matchLabel(row),
    previousStatus: row.currentStatus || "-",
    newStatus: row.newStatus || "-",
    previousReport: previousReportLabel(row),
    newReport: nextReportLabel(row),
    previousPortalUpdate: shortDate(row.currentPortalUpdatedOn) || "-",
    newPortalUpdate: shortDate(row.cleaned.lastUpdate.date) || row.cleaned.lastUpdate.updatedBy || "-",
    application: applicationTypeLabel(row),
    mode: row.optional.assessmentMode || "-",
    notes: notesFor(row),
    appliedBy,
    appliedAt
  }));
}
function reportCounts(rows) {
  const counts = {
    Updated: 0,
    New: 0,
    "No change": 0,
    "Needs decision": 0,
    "Can't match": 0,
    Skipped: 0,
    Failed: 0
  };
  for (const row of rows) counts[row.state] += 1;
  return counts;
}
function updatedReportRows(rows) {
  return rows.filter((row) => row.state === "Updated" || row.state === "New");
}
function simpleReportRows(rows) {
  return rows.filter((row) => row.state !== "Updated" && row.state !== "New");
}
function simpleValues(row) {
  return [
    text(row.rowNo),
    text(row.applicationNo),
    text(row.portalName),
    text(row.matchedFacility),
    text(row.facilityType),
    text(row.phc),
    text(row.block),
    text(row.match),
    text(row.previousStatus),
    text(row.newStatus),
    text(row.previousReport),
    text(row.newReport),
    ddmmyyyy(row.previousPortalUpdate),
    ddmmyyyy(row.newPortalUpdate),
    text(row.application),
    text(row.mode),
    text(row.appliedBy),
    text(row.notes)
  ];
}
function styleHeader(row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
  row.eachCell((cell) => {
    cell.fill = headerFill;
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: "FFB6C4C1" } } };
  });
}
function addDataSheet(wb, name, headers, rows, widths) {
  const ws = wb.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 1 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });
  ws.columns = widths.map((width) => ({ width }));
  const header = ws.addRow(headers);
  styleHeader(header);
  ws.autoFilter = { from: "A1", to: `${String.fromCharCode(64 + headers.length)}1` };
  ws.pageSetup.printTitlesRow = "1:1";
  for (const values of rows) {
    const row = ws.addRow(values);
    row.alignment = { vertical: "top", wrapText: true };
  }
}
async function buildImportReportWorkbook(input) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "NQAS Tracker";
  wb.created = input.generatedAt;
  const snapshot = input.reportRows ?? null;
  const counts = snapshot ? reportCounts(snapshot) : null;
  const totalRows = snapshot ? snapshot.length : input.rowsTotal ?? 0;
  const updated = snapshot ? updatedReportRows(snapshot) : [];
  const noChange = snapshot?.filter((row) => row.state === "No change") ?? [];
  const needsDecision = snapshot?.filter((row) => row.state === "Needs decision" || row.state === "Can't match") ?? [];
  const skippedFailed = snapshot?.filter((row) => row.state === "Skipped" || row.state === "Failed") ?? [];
  const summary = wb.addWorksheet("Summary");
  summary.columns = [{ width: 36 }, { width: 68 }];
  const push = (label, value) => {
    const row = summary.addRow([label, text(value)]);
    row.getCell(1).font = { bold: true };
    row.alignment = { vertical: "top", wrapText: true };
  };
  const title = summary.addRow(["SaQsham document status import report"]);
  title.font = { bold: true, size: 14 };
  summary.mergeCells("A1:B1");
  push("File", input.fileName);
  push("Generated", istStamp$1(input.generatedAt.getTime()));
  push("Generated by", input.generatedBy || "-");
  push("Rows updated", counts ? counts.Updated + counts.New : input.summary.updated);
  push("No change", counts ? counts["No change"] : input.summary.noChange);
  push("New", counts ? counts.New : "-");
  push("Needs decision", counts ? counts["Needs decision"] : "-");
  push("Can't match", counts ? counts["Can't match"] : "-");
  push(
    "Needs decision & Unmatched",
    counts ? counts["Needs decision"] + counts["Can't match"] : "-"
  );
  push("Skipped", counts ? counts.Skipped : input.summary.skipped);
  push("Failed", counts ? counts.Failed : input.summary.failed);
  push("Skipped & Failed", counts ? counts.Skipped + counts.Failed : "-");
  push("Rows in this report", totalRows);
  if (!snapshot) {
    push("Detail not stored for this import", "The row-level report was introduced after this import was saved.");
  } else {
    const sheetCount = updated.length + noChange.length + needsDecision.length + skippedFailed.length;
    if (sheetCount !== totalRows || counts.Updated + counts.New + counts["No change"] + counts["Needs decision"] + counts["Can't match"] + counts.Skipped + counts.Failed !== totalRows) {
      push(
        "Warning",
        `The state counts do not add up to ${totalRows} rows. The sheets contain ${sheetCount} rows.`
      );
    }
  }
  if (snapshot) {
    addDataSheet(
      wb,
      "Updated",
      UPDATED_HEADERS,
      updated.map((row) => [
        text(row.rowNo),
        text(row.applicationNo),
        text(row.portalName),
        text(row.matchedFacility),
        text(row.facilityType),
        text(row.phc),
        text(row.block),
        text(row.match),
        text(row.previousStatus),
        text(row.newStatus),
        text(row.previousReport),
        text(row.newReport),
        ddmmyyyy(row.previousPortalUpdate),
        ddmmyyyy(row.newPortalUpdate),
        text(row.application),
        text(row.mode),
        text(row.appliedBy),
        istStamp$1(row.appliedAt)
      ]),
      UPDATED_WIDTHS
    );
    addDataSheet(wb, "No change", SIMPLE_HEADERS, noChange.map(simpleValues), SIMPLE_WIDTHS);
    addDataSheet(wb, "Needs decision & Unmatched", SIMPLE_HEADERS, needsDecision.map(simpleValues), SIMPLE_WIDTHS);
    addDataSheet(wb, "Skipped & Failed", SIMPLE_HEADERS, skippedFailed.map(simpleValues), SIMPLE_WIDTHS);
  }
  if (snapshot || input.statusMap.length > 0) {
    const map = wb.addWorksheet("Status mapping used");
    map.columns = [{ width: 70 }, { width: 34 }];
    const mapHeader = map.addRow(["SaQsham Documents Status (portal)", "Documents Status (Report)"]);
    styleHeader(mapHeader);
    map.views = [{ state: "frozen", ySplit: 1 }];
    map.autoFilter = { from: "A1", to: "B1" };
    for (const entry of input.statusMap) {
      map.addRow([text(entry.portal), text(entry.report)]);
    }
  }
  return wb;
}
async function downloadImportReport(input) {
  const wb = await buildImportReportWorkbook(input);
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `saqsham-import-report-${input.generatedAt.toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

const STEPS = ["Add data", "Review", "Apply"];
const REVIEW_COLUMNS = [
  SAQSHAM_PREVIEW_COLUMNS.find((c) => c.key === "include"),
  SAQSHAM_PREVIEW_COLUMNS.find((c) => c.key === "rowNo"),
  SAQSHAM_PREVIEW_COLUMNS.find((c) => c.key === "applicationNo"),
  SAQSHAM_PREVIEW_COLUMNS.find((c) => c.key === "portalFacility"),
  {
    ...SAQSHAM_PREVIEW_COLUMNS.find((c) => c.key === "matchedFacility"),
    label: "Matched facility",
    width: 220
  },
  { ...SAQSHAM_PREVIEW_COLUMNS.find((c) => c.key === "match"), width: 150 },
  {
    key: "statusChange",
    label: "Status (previous → new)",
    kind: "text",
    width: 230,
    align: "left",
    exportable: true,
    raw: (r) => (r.currentStatus || "-") === (r.newStatus || "-") ? "No change" : `${r.currentStatus || "-"} → ${r.newStatus || "-"}`
  },
  {
    ...SAQSHAM_PREVIEW_COLUMNS.find((c) => c.key === "reportChange"),
    label: "Report group (previous → new)",
    width: 220
  }
];
const MAPPING_KEY = "nqas.saqsham.columnMap.v1";
function readRememberedMapping() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(MAPPING_KEY) ?? "{}");
    if (!raw || typeof raw !== "object") return {};
    return Object.fromEntries(
      Object.entries(raw).filter(([, v]) => typeof v === "string")
    );
  } catch {
    return {};
  }
}
function columnsMatched(map) {
  return new Set(Object.values(map).filter((v) => v != null)).size;
}
const ROW_CHECKBOX = "size-5 border-[1.5px] border-muted-foreground/90 shadow-none data-[state=checked]:border-primary";
const ROW_CHECKBOX_WRAP = "inline-flex min-h-11 min-w-11 items-center justify-center";
function StepBar({ step, onJump }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("ol", { className: "flex flex-wrap items-center gap-1.5", "aria-label": "Import steps", children: STEPS.map((label, i) => {
    const n = i + 1;
    const state = n < step ? "done" : n === step ? "current" : "todo";
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center gap-1.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          disabled: n > step,
          onClick: () => n < step && onJump(n),
          "aria-current": n === step ? "step" : void 0,
          className: cn(
            "flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
            state === "done" && "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-100",
            state === "current" && "border-primary/40 bg-primary/10 text-foreground",
            state === "todo" && "border-border/60 text-muted-foreground",
            n < step && "hover:bg-emerald-200/60"
          ),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: cn(
                  "flex size-4 items-center justify-center rounded-full border text-[10px] font-bold",
                  state === "done" && "border-emerald-400 bg-emerald-500 text-white",
                  state === "current" && "border-primary bg-primary text-primary-foreground"
                ),
                children: state === "done" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3" }) : n
              }
            ),
            label
          ]
        }
      ),
      i < STEPS.length - 1 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground/40", children: "›" })
    ] }, label);
  }) });
}
function StatusPill({ value, muted, bold }) {
  const text = value || "-";
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      className: cn(
        "inline-flex max-w-full flex-wrap items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] leading-snug break-words",
        muted ? "line-through opacity-70" : "font-medium",
        bold && "font-semibold",
        statusTone(text)
      ),
      children: text
    }
  );
}
function statusTone(text) {
  const v = text.toLowerCase();
  if (v === "-" || !text) return "border-border/60 bg-muted/50 text-muted-foreground";
  if (v.includes("pending at facility")) return "border-amber-300/60 bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-100";
  if (v.includes("rqau") || v.includes("sqau")) return "border-sky-300/60 bg-sky-100 text-sky-900 dark:bg-sky-500/15 dark:text-sky-100";
  if (v.includes("nhsrc")) return "border-violet-300/60 bg-violet-100 text-violet-900 dark:bg-violet-500/15 dark:text-violet-100";
  if (v.includes("scheduled")) return "border-indigo-300/60 bg-indigo-100 text-indigo-900 dark:bg-indigo-500/15 dark:text-indigo-100";
  if (v.includes("awaiting results")) return "border-teal-300/60 bg-teal-100 text-teal-900 dark:bg-teal-500/15 dark:text-teal-100";
  if (v.includes("result declared")) return "border-emerald-300/60 bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-100";
  return "border-border/60 bg-muted/50 text-foreground";
}
function GroupChip({ value }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      className: "inline-flex max-w-full items-center truncate rounded border border-border/60 bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground",
      "data-tip": value,
      "data-tip-truncate": true,
      children: value
    }
  );
}
function PortalUpdateCell({ row }) {
  const prev = shortDate(row.currentPortalUpdatedOn) || "Not recorded";
  const next = shortDate(row.cleaned.lastUpdate.date) || row.cleaned.lastUpdate.updatedBy || "Not recorded";
  if (prev === next) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: next });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex flex-wrap items-center gap-1 text-[11px]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground line-through", children: prev }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "size-3 shrink-0 text-muted-foreground" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: next })
  ] });
}
function FacilityOption({
  facility,
  selected,
  onPick
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      role: "button",
      tabIndex: 0,
      onClick: onPick,
      onKeyDown: (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPick();
        }
      },
      className: cn(
        "cursor-pointer rounded-md border px-2 py-1.5 outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "border-primary/40 bg-primary/5" : "border-transparent"
      ),
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        FacilityCell,
        {
          facility,
          style: "twoLine",
          className: "pointer-events-none min-h-0"
        }
      )
    }
  );
}
function MatchCell({
  row,
  facilities,
  onPick
}) {
  const [open, setOpen] = reactExports.useState(false);
  const [q, setQ] = reactExports.useState("");
  const current = facilities.find((f) => f.id === row.facilityId) ?? null;
  const displayName = current?.name || row.facilityName || row.cleaned.portalFacilityRaw || "";
  const suggested = reactExports.useMemo(() => {
    const name = row.cleaned.name || row.cleaned.portalFacilityRaw;
    const block = (row.cleaned.helper.block || row.facilityBlock || "").trim().toLowerCase();
    const type = (row.cleaned.facilityType || row.cleaned.category || "").trim().toLowerCase();
    const typeHint = (f) => {
      const ft = f.facilityType.toLowerCase();
      if (type.includes("uamm") || type.includes("uhwc")) return ft.includes("uhwc") ? 1 : 0;
      if (type.includes("hwc")) return ft.includes("hsc") || ft.includes("phc") ? 1 : 0;
      return type && ft === type ? 1 : 0;
    };
    return facilities.filter((f) => f.id !== current?.id).map((f) => ({
      f,
      score: fuzzyScore(name, f.name),
      block: block && f.block.trim().toLowerCase() === block ? 1 : 0,
      type: typeHint(f)
    })).sort((a, b) => b.block - a.block || b.type - a.type || b.score - a.score || a.f.name.localeCompare(b.f.name)).slice(0, 5);
  }, [facilities, row.cleaned.name, row.cleaned.portalFacilityRaw, row.cleaned.helper.block, row.cleaned.facilityType, row.cleaned.category, row.facilityBlock, current?.id]);
  const needle = q.trim().toLowerCase();
  const matches = (f) => !needle || `${f.name} ${f.block} ${f.phc} ${f.saqshamApplicationNo ?? ""}`.toLowerCase().includes(needle);
  const all = [...facilities].sort((a, b) => a.name.localeCompare(b.name)).filter(matches);
  const choices = suggested.map((s) => s.f).filter(matches);
  const choose = (id) => {
    onPick(row.rowNo, id);
    setOpen(false);
    setQ("");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Popover, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        className: "flex min-h-9 w-full min-w-0 items-center gap-1 rounded-md border border-border/60 bg-background/70 px-2 py-1 text-left text-[11px] hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("block truncate font-medium", !displayName && "text-muted-foreground"), children: displayName || "Choose facility" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mt-0.5 flex min-w-0 items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: cn(
                  "truncate rounded border px-1 py-px text-[9.5px]",
                  row.match.status === "matched" || row.method === "manual" ? "border-emerald-300/60 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200" : "border-amber-300/70 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                ),
                children: matchLabel(row)
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 text-[10px] text-primary", children: "Change" })
          ] })
        ] })
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      PopoverContent,
      {
        align: "start",
        side: "bottom",
        collisionPadding: 8,
        className: "w-[min(92vw,28rem)] p-2",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              autoFocus: true,
              value: q,
              onChange: (e) => setQ(e.target.value),
              placeholder: "Search name, block, PHC or application no",
              className: "h-8 text-xs",
              "aria-label": "Search facilities",
              onKeyDown: (e) => e.stopPropagation()
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 max-h-[min(58vh,25rem)] overflow-y-auto", children: [
            current && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-2 py-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase", children: "Current match" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FacilityOption, { facility: current, selected: true, onPick: () => choose(current.id) })
            ] }),
            choices.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-2 pt-2 pb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase", children: "Suggested" }),
              choices.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx(FacilityOption, { facility: f, onPick: () => choose(f.id) }, f.id))
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-2 pt-2 pb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase", children: "All facilities A–Z" }),
              all.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx(FacilityOption, { facility: f, selected: f.id === current?.id, onPick: () => choose(f.id) }, f.id)),
              all.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-2 py-2 text-xs text-muted-foreground", children: "No facility matches that search." })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => choose(null),
                className: "mt-1 flex min-h-9 w-full items-center rounded-md border border-border/60 px-2 text-left text-xs text-muted-foreground hover:bg-muted/50",
                children: "— unmatched —"
              }
            )
          ] })
        ]
      }
    )
  ] });
}
function ReportChoiceCell({
  row,
  value,
  onChoose,
  onOpenMapping,
  groupNames
}) {
  const mapped = !row.unmappedStatus && value === void 0;
  if (mapped) {
    const previous = previousReportLabel(row);
    const next = nextReportLabel(row);
    if (row.keptResultDeclared) {
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(GroupChip, { value: previous }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground", children: "kept" })
      ] });
    }
    if (previous === next) {
      return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap items-center gap-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(GroupChip, { value: previous }) });
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(GroupChip, { value: previous }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "size-3 shrink-0 text-muted-foreground" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(GroupChip, { value: next })
    ] });
  }
  const selected = value === "__keep__" ? "__keep__" : value ?? "";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-0.5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Select,
      {
        value: selected || "unmapped",
        onValueChange: (v) => onChoose(row.rowNo, v === "unmapped" ? null : v),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            SelectTrigger,
            {
              className: "h-8 w-full min-w-40 text-[11px]",
              "aria-label": `Report group for row ${row.rowNo}`,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Needs mapping" })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "unmapped", className: "text-xs", children: "— needs mapping —" }),
            groupNames.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: v, className: "text-xs", children: v }, v)),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "__keep__", className: "text-xs", children: "Keep as-is, no report group" })
          ] })
        ]
      }
    ),
    onOpenMapping && row.cleaned.statusRaw && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        onClick: () => onOpenMapping(row.cleaned.statusRaw),
        className: "text-[10px] font-medium text-primary underline-offset-2 hover:underline",
        children: "Map this status in Status mapping →"
      }
    )
  ] });
}
function ApplicationNoCell({ value }) {
  const [copied, setCopied] = reactExports.useState(false);
  const text = value || "-";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      disabled: !value,
      "data-tip": "Click to copy the application number",
      onClick: () => {
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          toast.success("Application No copied");
          window.setTimeout(() => setCopied(false), 1200);
        });
      },
      className: "flex min-h-8 w-full items-start gap-1 text-left font-mono text-[10.5px] leading-tight break-all hover:text-primary disabled:cursor-default",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1", children: text }),
        value && (copied ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "mt-0.5 size-3 shrink-0 text-emerald-600" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "mt-0.5 size-3 shrink-0 text-muted-foreground" }))
      ]
    }
  );
}
function StatusChangeCell({ row }) {
  const previous = row.currentStatus || "-";
  const next = row.newStatus || "-";
  if (previous === next) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: "No change" });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-0.5 text-[10.5px] leading-tight", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "line-clamp-1 text-muted-foreground", "data-tip": previous, "data-tip-truncate": true, children: previous }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "line-clamp-1 font-medium", "data-tip": next, "data-tip-truncate": true, children: next })
  ] });
}
function ColumnMappingField({
  spec,
  sheet,
  value,
  onChange
}) {
  const matched = value != null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: cn(
        "flex items-center gap-2 rounded-lg border px-2 py-1.5",
        matched ? "border-emerald-300/50 bg-emerald-50/40 dark:bg-emerald-500/5" : "border-border/60"
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "w-36 shrink-0 text-xs font-medium", children: [
          spec.label,
          spec.required && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-destructive", children: " *" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0", children: matched ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3.5 text-emerald-600", "aria-label": "Matched" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { className: "size-3.5 text-muted-foreground", "aria-label": "Not matched" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: value == null ? "none" : String(value), onValueChange: (v) => onChange(v === "none" ? null : Number(v)), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-8 w-full min-w-32 text-xs", "aria-label": `Column for ${spec.label}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Not mapped" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "none", className: "text-xs", children: "— not mapped —" }),
            sheet.headers.map((h, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: String(i), className: "text-xs", children: h }, i))
          ] })
        ] })
      ]
    }
  );
}
function PasteSummaryCard({ sheet, onEdit }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-h-8 flex-wrap items-center gap-2 rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-xs", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-semibold", children: [
      sheet.dataRows.length,
      " row",
      sheet.dataRows.length === 1 ? "" : "s",
      " ·",
      " ",
      sheet.headers.length,
      " column",
      sheet.headers.length === 1 ? "" : "s"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "·" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "link", className: "h-auto p-0 text-xs", onClick: onEdit, children: "Edit pasted text" })
  ] });
}
function ImportPreviewTable({
  columns,
  rows,
  facilities,
  reportChoice,
  onToggleInclude,
  onPickFacility,
  onChooseReport,
  onOpenRow,
  onOpenMapping,
  groups,
  groupNames
}) {
  const facilityIdx = Math.max(0, columns.findIndex((c) => c.key === "matchedFacility"));
  const frozenEnd = facilityIdx;
  const frozenLeft = (i) => i > frozenEnd ? 0 : columns.slice(0, i).reduce((sum, c) => sum + c.width, 0);
  const items = groups?.length ? groups.flatMap((g) => [
    { kind: "header", group: g },
    ...g.rows.map((row) => ({ kind: "row", row }))
  ]) : rows.map((row) => ({ kind: "row", row }));
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "min-h-[360px] overflow-auto overscroll-contain rounded-lg border border-border/60",
      style: { maxHeight: "calc(var(--page-shell-height, 100dvh) - 15rem)" },
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full border-collapse text-xs", style: { tableLayout: "fixed" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("colgroup", { children: columns.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("col", { style: { width: c.width } }, c.key)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted shadow-[0_1px_0_0_var(--border)]", children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: columns.map((c, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "th",
          {
            scope: "col",
            className: cn(
              "sticky top-0 z-20 border-b border-border/60 bg-muted px-2 py-1.5 text-left text-[10px] font-semibold tracking-wide text-muted-foreground uppercase",
              c.align === "right" && "text-right",
              c.align === "center" && "text-center",
              i <= frozenEnd && "z-40",
              i === frozenEnd && "border-r border-border/60"
            ),
            style: i <= frozenEnd ? { left: frozenLeft(i), top: 0 } : { top: 0 },
            children: c.label
          },
          c.key
        )) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
          items.map((item) => {
            if (item.kind === "header") {
              return /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { className: "h-9 border-b border-border/60 bg-muted", children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: columns.length, className: "px-2 py-1.5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
                item.group.onToggleAll && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: ROW_CHECKBOX_WRAP, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Checkbox,
                  {
                    className: ROW_CHECKBOX,
                    checked: item.group.eligibleCount > 0 && item.group.selectedCount === item.group.eligibleCount ? true : item.group.selectedCount > 0 ? "indeterminate" : false,
                    disabled: item.group.eligibleCount === 0,
                    "aria-label": `Select eligible rows in ${item.group.label}`,
                    onCheckedChange: item.group.onToggleAll
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    onClick: item.group.onToggle,
                    "aria-expanded": !item.group.collapsed,
                    className: "inline-flex min-h-8 items-center gap-2 rounded-md px-1.5 text-xs font-semibold hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: item.group.collapsed ? "▸" : "▾" }),
                      item.group.label,
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "tabular-nums text-muted-foreground", children: [
                        "(",
                        item.group.rows.length,
                        ")"
                      ] }),
                      item.group.eligibleCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-normal text-muted-foreground", children: [
                        item.group.selectedCount,
                        " of ",
                        item.group.eligibleCount,
                        " selected"
                      ] })
                    ]
                  }
                )
              ] }) }) }, `g-${item.group.key}`);
            }
            const row = item.row;
            const style = STATE_STYLES[row.state];
            const matchedFacility = facilities.find((f) => f.id === row.facilityId) ?? null;
            return /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { className: "h-14 border-b border-border/40 align-top hover:bg-muted/30", children: columns.map((c, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              "td",
              {
                className: cn(
                  "px-2 py-1.5 align-top",
                  c.align === "right" && "text-right",
                  c.align === "center" && "text-center",
                  i <= frozenEnd && "sticky z-10 bg-background",
                  i === frozenEnd && "border-r border-border/40"
                ),
                style: i <= frozenEnd ? { left: frozenLeft(i) } : void 0,
                children: c.kind === "include" ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: ROW_CHECKBOX_WRAP, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Checkbox,
                  {
                    className: ROW_CHECKBOX,
                    checked: row.include && isEligiblePreviewRow(row),
                    disabled: !isEligiblePreviewRow(row),
                    "aria-label": `Include row ${row.rowNo}`,
                    onCheckedChange: (v) => onToggleInclude(row.rowNo, v === true)
                  }
                ) }) : c.kind === "match" ? /* @__PURE__ */ jsxRuntimeExports.jsx(MatchCell, { row, facilities, onPick: onPickFacility }) : c.kind === "arrow" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "mx-auto size-3.5 text-muted-foreground" }) : c.kind === "index" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => onOpenRow(row.rowNo),
                    className: "inline-flex min-h-8 min-w-8 items-center justify-center rounded-md text-[11px] tabular-nums text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    "aria-label": `Row ${row.rowNo} details`,
                    "data-tip": "Open row details",
                    children: row.rowNo
                  }
                ) : c.key === "applicationNo" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ApplicationNoCell, { value: row.cleaned.applicationNo }) : c.key === "statusChange" ? /* @__PURE__ */ jsxRuntimeExports.jsx(StatusChangeCell, { row }) : c.key === "currentStatus" ? /* @__PURE__ */ jsxRuntimeExports.jsx(StatusPill, { value: row.currentStatus || "-", muted: row.change !== "same" }) : c.key === "newStatus" ? /* @__PURE__ */ jsxRuntimeExports.jsx(StatusPill, { value: row.newStatus || "-", bold: true }) : c.key === "reportChange" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                  ReportChoiceCell,
                  {
                    row,
                    value: reportChoice[row.rowNo],
                    onChoose: onChooseReport,
                    onOpenMapping,
                    groupNames
                  }
                ) : c.key === "updateChange" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-0.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(PortalUpdateCell, { row }),
                  row.stale && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-medium text-amber-700 dark:text-amber-300", children: "Older than current data" })
                ] }) : c.key === "appType" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "secondary", className: "text-[10px] font-normal", children: applicationTypeLabel(row) }) : c.key === "rowState" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "span",
                    {
                      className: cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                        style.className
                      ),
                      children: style.label
                    }
                  ),
                  row.keptResultDeclared && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[10px] font-medium text-emerald-700 dark:text-emerald-300", children: "Kept: result declared" }),
                  row.movedBack && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[10px] font-medium text-amber-700 dark:text-amber-300", children: "Status moved back" })
                ] }) : c.key === "notes" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    onClick: () => onOpenRow(row.rowNo),
                    className: "flex min-h-8 items-start gap-1 text-left text-[11px] leading-tight text-muted-foreground hover:text-foreground",
                    "data-tip": "Show the raw row and why it matched",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { className: "mt-0.5 size-3 shrink-0" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "line-clamp-2", children: notesFor(row) })
                    ]
                  }
                ) : c.key === "matchedFacility" ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-w-0 space-y-0.5", children: row.facilityId ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                  FacilityCell,
                  {
                    facility: {
                      id: row.facilityId,
                      name: matchedFacility?.name || row.facilityName,
                      facilityType: matchedFacility?.facilityType || row.facilityType || row.cleaned.facilityType,
                      block: matchedFacility?.block || row.facilityBlock,
                      phc: matchedFacility?.phc || row.facilityPhc
                    },
                    style: "twoLine",
                    onOpen: () => void 0,
                    className: "min-h-0 py-0"
                  }
                ) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block leading-tight break-words text-muted-foreground", children: row.cleaned.portalFacilityRaw || "-" }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    className: cn(
                      "block break-words",
                      c.key === "portalFacility" ? "line-clamp-2" : "truncate"
                    ),
                    "data-tip": String(c.raw(row, 0)),
                    "data-tip-truncate": true,
                    children: String(c.raw(row, 0))
                  }
                )
              },
              c.key
            )) }, row.rowNo);
          }),
          items.every((i) => i.kind !== "row") && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: columns.length, className: "p-6 text-center text-muted-foreground", children: "No rows match the current filters." }) })
        ] })
      ] })
    }
  );
}
function MobileRowCard({
  row,
  reportChoice,
  onToggleInclude,
  onOpen
}) {
  const style = STATE_STYLES[row.state];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { className: "rounded-lg border border-border/60 bg-background/70 p-2.5 text-xs", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: ROW_CHECKBOX_WRAP, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Checkbox,
        {
          className: ROW_CHECKBOX,
          checked: row.include && isEligiblePreviewRow(row),
          disabled: !isEligiblePreviewRow(row),
          "aria-label": `Include row ${row.rowNo}`,
          onCheckedChange: (v) => onToggleInclude(v === true)
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "truncate font-medium", children: row.facilityName || "Unmatched" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "truncate text-[10px] text-muted-foreground", children: [
          row.cleaned.applicationNo || "no application no",
          " · ",
          row.cleaned.portalFacilityRaw
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "span",
        {
          className: cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold", style.className),
          children: style.label
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 space-y-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(StatusPill, { value: row.currentStatus || "-", muted: row.change !== "same" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "size-3 shrink-0 text-muted-foreground" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(StatusPill, { value: row.newStatus || "-", bold: true })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(GroupChip, { value: previousReportLabel(row) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "size-3 shrink-0 text-muted-foreground" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(GroupChip, { value: nextReportLabel(row) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px] text-muted-foreground", children: [
        row.facilityBlock || "—",
        " · ",
        row.facilityPhc || "—",
        " · ",
        matchLabel(row)
      ] }),
      row.unmappedStatus && !reportChoice && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] font-medium text-amber-700 dark:text-amber-300", children: "Needs mapping — open the row to choose a report group" }),
      row.keptResultDeclared && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] font-medium text-emerald-700 dark:text-emerald-300", children: "Kept: result declared" }),
      row.movedBack && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] font-medium text-amber-700 dark:text-amber-300", children: "Status moved back" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        onClick: onOpen,
        className: "mt-2 inline-flex min-h-8 items-center gap-1 rounded-md border border-border/60 px-2 text-[11px] text-muted-foreground",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { className: "size-3" }),
          " Row details"
        ]
      }
    )
  ] });
}
const CHIPS = [
  { key: "all", label: "Rows" },
  ...BUCKET_ORDER.map((key) => ({ key, label: BUCKET_LABELS[key] }))
];
function matchesChip(row, chip) {
  if (chip === "all") return true;
  return previewBucket(row.state, row.change) === chip;
}
function SaqshamImportWizard({
  onOpenList,
  onOpenHistory,
  onOpenMapping,
  initialText,
  initialFile
}) {
  const ctx = useQuery(api.imports.getSaqshamImportContext, {});
  const applyBatch = useMutation(api.imports.applySaqshamBatch);
  const saveAlias = useMutation(api.imports.saveFacilityAlias);
  const undoBatch = useMutation(api.imports.undoSaqshamBatch);
  const [step, setStep] = reactExports.useState(1);
  const [sheet, setSheet] = reactExports.useState(null);
  const [map, setMap] = reactExports.useState({});
  const [pasteText, setPasteText] = reactExports.useState("");
  const [sourceKind, setSourceKind] = reactExports.useState("paste");
  const sourceLabel = () => sourceKind === "file" ? sheet?.fileName || "Uploaded file" : `Pasted · ${viewRows.length} row${viewRows.length === 1 ? "" : "s"}`;
  const [parsing, setParsing] = reactExports.useState(false);
  const [dragOver, setDragOver] = reactExports.useState(false);
  const [facilityChoice, setFacilityChoice] = reactExports.useState({});
  const [reportChoice, setReportChoice] = reactExports.useState({});
  const [includeOverride, setIncludeOverride] = reactExports.useState({});
  const [rememberOn, setRememberOn] = reactExports.useState(true);
  const [optional, setOptional] = reactExports.useState({ mode: false, departments: false, date: false, type: false, overwrite: false });
  const [moveStatus, setMoveStatus] = reactExports.useState(false);
  const [confirmed, setConfirmed] = reactExports.useState(false);
  const [applying, setApplying] = reactExports.useState(false);
  const applyingRef = reactExports.useRef(false);
  const reportRowsRef = reactExports.useRef(null);
  const [result, setResult] = reactExports.useState(null);
  const [undoing, setUndoing] = reactExports.useState(false);
  const [undone, setUndone] = reactExports.useState(false);
  const [undoConflicts, setUndoConflicts] = reactExports.useState(null);
  const [chip, setChip] = reactExports.useState("all");
  const [search, setSearch] = reactExports.useState("");
  const [bar, setBar] = reactExports.useState(() => ({ barKeys: ["facilityBlock", "report"], filters: [], match: "all" }));
  const [drawerRowNo, setDrawerRowNo] = reactExports.useState(null);
  const [collapsedGroups, setCollapsedGroups] = reactExports.useState([]);
  const [announcement, setAnnouncement] = reactExports.useState("");
  const facilities = reactExports.useMemo(() => ctx?.facilities ?? [], [ctx]);
  const aliases = reactExports.useMemo(() => ctx?.aliases ?? [], [ctx]);
  const cleaned = reactExports.useMemo(() => {
    if (!sheet) return [];
    return sheet.dataRows.map((dr, i) => {
      const cells = sheet.keptIndexes.map((idx) => dr.cells[idx]);
      return cleanSaqshamRow(
        { rowNo: i + 1, sourceRowNo: dr.sourceRowNo, headerNames: sheet.headers, cells, map },
        {
          district: ctx?.district,
          categoryTypeMap: ctx?.categoryTypeMap,
          // Part 0.2: only parse "Applied Departments" when that optional
          // update is switched on — otherwise the raw cell is simply kept.
          parseDepartments: optional.departments
        },
        ctx?.statusMap
      );
    });
  }, [sheet, map, ctx, optional.departments]);
  const allAliases = reactExports.useMemo(() => [...aliases, ...seedAliasesForFacilities(facilities)], [aliases, facilities]);
  const preview = reactExports.useMemo(
    () => buildSaqshamPreview(cleaned, facilities, allAliases, { facilityChoice, reportChoice }),
    [cleaned, facilities, allAliases, facilityChoice, reportChoice]
  );
  const rowInclude = (r) => r.state === "no_change" ? false : includeOverride[r.rowNo] ?? r.include;
  const viewRows = reactExports.useMemo(
    () => preview.rows.map((r) => ({ ...r, include: rowInclude(r) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [preview.rows, includeOverride]
  );
  const summary = reactExports.useMemo(
    () => summarizePreview(viewRows, preview.summary.missingFromFile),
    [viewRows, preview.summary.missingFromFile]
  );
  const blocking = hasBlockingErrors(viewRows);
  const selected = selectedRows(viewRows);
  const chipCounts = reactExports.useMemo(() => {
    const counts = {};
    const buckets = bucketCounts(viewRows);
    counts.all = viewRows.length;
    for (const c of CHIPS) if (c.key !== "all") counts[c.key] = buckets[c.key];
    return counts;
  }, [viewRows]);
  const blocks = reactExports.useMemo(
    () => [...new Set(viewRows.map((r) => r.facilityBlock).filter(Boolean))].sort(),
    [viewRows]
  );
  const reportOptions = reactExports.useMemo(
    () => [...new Set(viewRows.map((r) => nextReportLabel(r)))].sort(),
    [viewRows]
  );
  const typeOptions = reactExports.useMemo(
    () => [...new Set(viewRows.map((r) => r.facilityType || r.cleaned.facilityType).filter(Boolean))].sort(),
    [viewRows]
  );
  const rowValue = (r, key) => {
    switch (key) {
      case "facilityBlock":
        return r.facilityBlock;
      case "report":
        return nextReportLabel(r);
      case "facilityType":
        return r.facilityType || r.cleaned.facilityType;
      case "matchKind":
        return r.match.status === "matched" ? "Matched" : r.match.status === "suggested" ? "Spelling variant" : "Can't match";
      case "applicationType":
        return applicationTypeLabel(r);
      default:
        return r.cleaned.applicationNo;
    }
  };
  const reviewFields = reactExports.useMemo(
    () => [
      {
        key: "facilityBlock",
        label: "Block",
        type: "select",
        group: "Identity",
        onThisPage: true,
        options: blocks.map((b) => ({ value: b, count: viewRows.filter((r) => r.facilityBlock === b).length }))
      },
      {
        key: "report",
        label: "Report group",
        type: "select",
        group: "Status",
        onThisPage: true,
        options: reportOptions.map((v) => ({ value: v }))
      },
      {
        key: "matchKind",
        label: "Match",
        type: "select",
        group: "Status",
        onThisPage: true,
        options: ["Matched", "Spelling variant", "Can't match"].map((v) => ({ value: v }))
      },
      {
        key: "applicationType",
        label: "Application type",
        type: "select",
        group: "Status",
        options: [...new Set(viewRows.map((r) => applicationTypeLabel(r)))].map((v) => ({ value: v }))
      },
      {
        key: "facilityType",
        label: "Facility Type",
        type: "select",
        group: "Identity",
        options: typeOptions.map((v) => ({ value: v }))
      },
      { key: "applicationNo", label: "Application No", type: "text", group: "Identity" }
    ],
    [blocks, reportOptions, typeOptions, viewRows]
  );
  const shown = reactExports.useMemo(() => {
    const needle = search.trim().toLowerCase();
    return viewRows.filter((r) => {
      if (!matchesChip(r, chip)) return false;
      if (!rowPasses(bar.filters, bar.match, (key) => rowValue(r, key))) return false;
      if (needle) {
        const hay = `${r.cleaned.applicationNo} ${r.cleaned.portalFacilityRaw} ${r.facilityName} ${r.facilityBlock}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [viewRows, chip, bar, search]);
  const reviewGroups = reactExports.useMemo(() => {
    if (chip !== "all") return void 0;
    const attentionFirst = [
      "needs_decision",
      "cant_match",
      "will_change",
      "new",
      "no_change",
      "skipped"
    ];
    return attentionFirst.map((bucket) => {
      const groupRows = shown.filter((r) => previewBucket(r.state, r.change) === bucket);
      return {
        key: bucket,
        label: BUCKET_LABELS[bucket],
        rows: groupRows,
        collapsed: collapsedGroups.includes(bucket),
        onToggle: () => setCollapsedGroups(
          (prev) => prev.includes(bucket) ? prev.filter((b) => b !== bucket) : [...prev, bucket]
        ),
        eligibleCount: groupRows.filter(isEligiblePreviewRow).length,
        selectedCount: groupRows.filter((r) => r.include && isEligiblePreviewRow(r)).length,
        onToggleAll: bucket === "no_change" ? void 0 : () => {
          const eligible = groupRows.filter(isEligiblePreviewRow);
          if (eligible.length === 0) return;
          const allSelected = eligible.every((r) => r.include);
          setIncludeOverride((prev) => {
            const next = { ...prev };
            for (const r of eligible) next[r.rowNo] = !allSelected;
            return next;
          });
        }
      };
    }).filter((g) => g.rows.length > 0);
  }, [chip, shown, collapsedGroups, setCollapsedGroups, setIncludeOverride]);
  const missingRequired = REQUIRED_COLUMN_KEYS.filter((k) => map[k] == null);
  const matchedColumns = columnsMatched(map);
  const acceptSuggestions = viewRows.filter(
    (r) => r.state === "needs_review" && r.match.status === "suggested" && (r.match.candidates[0]?.score ?? 0) >= 95
  ).length;
  const allNoChange = viewRows.length > 0 && summary.buckets.no_change === viewRows.length;
  const loadSheet = (s) => {
    setSheet(s);
    const nextMap = autoMapColumns(s.headers, ALL_COLUMNS);
    const remembered = readRememberedMapping();
    for (const [key, header] of Object.entries(remembered)) {
      const idx = s.headers.indexOf(header);
      if (idx >= 0) nextMap[key] = idx;
    }
    setMap(nextMap);
    setIncludeOverride({});
    setFacilityChoice({});
    setReportChoice({});
    setChip("all");
    setSearch("");
    setCollapsedGroups([]);
    setBar((prev) => ({ ...prev, filters: [] }));
    setResult(null);
    setUndone(false);
    setConfirmed(false);
    for (const w of s.warnings) toast.warning(w);
    const ready = REQUIRED_COLUMN_KEYS.every((k) => nextMap[k] != null);
    setStep(ready ? 2 : 1);
    setAnnouncement(`Detected ${s.dataRows.length} rows and ${s.headers.length} columns.`);
  };
  reactExports.useEffect(() => {
    if (!sheet) return;
    try {
      const byHeader = {};
      for (const spec of ALL_COLUMNS) {
        const idx = map[spec.key];
        if (idx != null && sheet.headers[idx]) byHeader[spec.key] = sheet.headers[idx];
      }
      window.localStorage.setItem(MAPPING_KEY, JSON.stringify(byHeader));
    } catch {
    }
  }, [sheet, map]);
  const ingestText = (text) => {
    if (!text.trim()) {
      toast.error("Paste the SaQsham rows first");
      return;
    }
    setPasteText(text);
    setSourceKind("paste");
    loadSheet(parsePastedText(text));
  };
  const onFile = async (file) => {
    setParsing(true);
    setSourceKind("file");
    try {
      loadSheet(await parseSaqshamFile(file));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read the file");
    }
    setParsing(false);
  };
  const initialIngested = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (initialIngested.current) return;
    if (initialFile) {
      initialIngested.current = true;
      void onFile(initialFile);
      return;
    }
    if (!initialText?.trim()) return;
    initialIngested.current = true;
    ingestText(initialText);
  }, [initialText, initialFile]);
  reactExports.useEffect(() => {
    if (step !== 1) return;
    const onPaste = (e) => {
      const el = e.target;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      const text = e.clipboardData?.getData("text/plain") ?? "";
      if (!text.trim()) return;
      e.preventDefault();
      ingestText(text);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [step]);
  const runApply = async () => {
    if (!confirmed || applyingRef.current) return;
    applyingRef.current = true;
    setApplying(true);
    try {
      const decisions = selected.map((r) => ({
        rowNo: r.rowNo,
        facilityId: r.facilityId,
        applicationNo: r.cleaned.applicationNo || void 0,
        statusRaw: r.newStatus || void 0,
        reportStatus: r.newReport,
        keepAsIs: r.keepAsIs,
        portalUpdatedOn: r.cleaned.lastUpdate.date,
        portalUpdatedBy: r.cleaned.lastUpdate.updatedBy,
        portalName: r.cleaned.name,
        facilityType: r.cleaned.facilityType,
        rememberAlias: (r.method === "manual" || r.method === "fuzzy" || r.seededAlias) && rememberOn,
        applyStatusForward: moveStatus,
        overwriteOptional: optional.overwrite,
        matchMethod: r.method,
        confidence: r.confidence,
        facilityName: r.facilityName,
        facilityBlock: r.facilityBlock,
        facilityPhc: r.facilityPhc,
        notes: notesFor(r),
        raw: convexSafe(r.cleaned.raw),
        cleaned: {
          applicationNo: r.cleaned.applicationNo,
          portalFacilityRaw: r.cleaned.portalFacilityRaw,
          name: r.cleaned.name,
          category: r.cleaned.category,
          facilityType: r.cleaned.facilityType,
          facilityTypeKnown: r.cleaned.facilityTypeKnown,
          statusRaw: r.cleaned.statusRaw,
          report: r.newReport,
          keepAsIs: r.keepAsIs,
          departments: r.cleaned.appliedDepartments.departments,
          departmentsCount: r.cleaned.appliedDepartments.departments.length,
          departmentsStated: r.cleaned.appliedDepartments.statedCount,
          appliedDate: r.cleaned.appliedDate,
          lastUpdateDate: r.cleaned.lastUpdate.date,
          lastUpdateBy: r.cleaned.lastUpdate.updatedBy,
          resultDeclared: r.cleaned.resultDeclared,
          differentScope: r.cleaned.differentScope,
          warnings: r.cleaned.warnings,
          assessmentType: r.cleaned.assessmentType,
          assessmentMode: r.cleaned.assessmentMode,
          state: r.cleaned.state,
          district: r.cleaned.district
        },
        optional: {
          assessmentMode: optional.mode ? r.optional.assessmentMode : null,
          appliedDepartments: optional.departments ? r.optional.appliedDepartments : null,
          appliedDate: optional.date ? r.optional.appliedDate : null,
          assessmentType: optional.type ? r.optional.assessmentType : null
        }
      }));
      const reportRows = buildReportRows(
        viewRows,
        ctx?.me?.name ?? "user",
        Date.now()
      );
      reportRowsRef.current = reportRows;
      const res = await applyBatch({ fileName: sourceLabel(), decisions, reportRows });
      setResult(res);
      setStep(4);
      setAnnouncement(`Import applied. ${res.updated} updated, ${res.noChange} no change, ${res.skipped} skipped.`);
      toast.success(`Applied — ${res.updated} updated, ${res.noChange} no change, ${res.failed} failed`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed — nothing was written";
      toast.error(message);
      setAnnouncement(`Import failed: ${message}`);
    }
    applyingRef.current = false;
    setApplying(false);
  };
  const runUndo = async () => {
    if (!result) return;
    setUndoing(true);
    try {
      const res = await undoBatch({ batchId: result.batchId });
      setUndone(true);
      if (res.conflicts.length > 0) {
        setUndoConflicts(res.conflicts.map((c) => ({ rowNo: c.rowNo, reason: c.reason })));
        toast.warning(`Restored ${res.restored} row(s); ${res.conflicts.length} skipped (edited since the import)`);
      } else {
        toast.success(`Import undone — ${res.restored} row(s) restored`);
      }
      setAnnouncement(`Import undone. ${res.restored} rows restored.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not undo the import");
    }
    setUndoing(false);
  };
  const resetWizard = () => {
    setSheet(null);
    reportRowsRef.current = null;
    setMap({});
    setIncludeOverride({});
    setFacilityChoice({});
    setReportChoice({});
    setResult(null);
    setUndone(false);
    setUndoConflicts(null);
    setConfirmed(false);
    setPasteText("");
    setSourceKind("paste");
    setStep(1);
  };
  const dupHint = reactExports.useMemo(() => duplicateRowsHint(viewRows, facilities), [viewRows, facilities]);
  const formatStamp = (ms) => {
    const d = new Date(ms + 5.5 * 60 * 60 * 1e3);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const p = (n) => String(n).padStart(2, "0");
    return `${p(d.getUTCDate())}-${months[d.getUTCMonth()]}-${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(
      d.getUTCMinutes()
    )}`;
  };
  const optionalCount = Object.values(optional).filter(Boolean).length + (moveStatus ? 1 : 0);
  if (ctx === void 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 p-6 text-sm text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin" }),
      " Loading your facilities…"
    ] });
  }
  const reviewFooter = /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap items-center gap-2 border-t border-border/60 bg-background/95 px-1 py-2", children: allNoChange ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-muted-foreground", children: [
      "Nothing to update.",
      " ",
      dupHint ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        "All ",
        viewRows.length,
        " rows match your import of",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "text-foreground", children: formatStamp(dupHint.at) }),
        "."
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        "All ",
        viewRows.length,
        " rows already match what is stored."
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", className: "ml-auto", onClick: () => onOpenList?.(), children: "Done" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", onClick: resetWizard, children: "Import another" })
  ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Button,
      {
        onClick: () => void runApply(),
        disabled: !confirmed || applying || blocking || selected.length === 0,
        className: "gap-2",
        "data-testid": "apply-import-changes",
        children: [
          applying ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "size-4" }),
          "Apply selected (",
          selected.length,
          ")"
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex min-h-9 cursor-pointer items-center gap-2 text-xs", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Checkbox, { checked: confirmed, onCheckedChange: (v) => setConfirmed(v === true) }),
      "I have reviewed the previous → new values."
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", className: "ml-auto", onClick: () => setStep(1), children: "Back" }),
    blocking && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-300", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { className: "size-3.5" }),
      " Resolve the included rows that need a decision."
    ] }),
    !blocking && selected.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: "Select at least one row with a valid change. Rows that need a decision, cannot be matched, are unchanged or skipped cannot be applied." }),
    !confirmed && selected.length > 0 && !blocking && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: "Tick the review box to enable Apply." })
  ] }) });
  const scrollReviewTop = () => {
    document.querySelector("[data-page-shell-body]")?.scrollTo({ top: 0, behavior: "smooth" });
  };
  const wizardToolbar = /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1 pb-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(StepBar, { step: Math.min(step, STEPS.length), onJump: setStep }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold text-foreground", children: "SaQsham status import" }),
      step === 2 && sheet && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: () => setStep(1),
          className: "rounded-full border border-border/60 px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted/40",
          children: [
            "Columns matched: ",
            matchedColumns,
            " of ",
            sheet.headers.length,
            " · Change"
          ]
        }
      ),
      step === 2 && /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          size: "sm",
          variant: "ghost",
          className: "ml-auto h-7 gap-1 text-[11px]",
          onClick: scrollReviewTop,
          "data-testid": "review-back-to-top",
          children: "Back to top"
        }
      )
    ] }),
    step === 2 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap items-center gap-1.5", role: "group", "aria-label": "Row filters", children: CHIPS.map((c) => {
      const active = chip === c.key;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          "aria-pressed": active,
          onClick: () => setChip(active && c.key !== "all" ? "all" : c.key),
          className: cn(
            "flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors",
            active ? "border-primary/50 bg-primary/10 font-semibold text-foreground" : chipCounts[c.key] > 0 ? "border-border bg-muted/50 font-medium text-foreground hover:bg-muted" : "border-border/60 text-muted-foreground hover:bg-muted/40"
          ),
          children: [
            c.label,
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "tabular-nums", children: chipCounts[c.key] })
          ]
        },
        c.key
      );
    }) })
  ] });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageShell,
    {
      toolbar: wizardToolbar,
      footer: step === 2 ? reviewFooter : void 0,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", "aria-live": "polite", className: "sr-only", children: announcement }),
        step === 1 && !sheet && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 rounded-xl border border-border/60 bg-background/60 p-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold", children: "Paste the SaQsham status report" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Copy the rows from Excel, including the header row, then paste here (Ctrl+V). You can paste anywhere on this page." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              onDragOver: (e) => {
                e.preventDefault();
                setDragOver(true);
              },
              onDragLeave: () => setDragOver(false),
              onDrop: (e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) void onFile(f);
              },
              className: cn(
                "rounded-xl border-2 border-dashed p-2 transition-colors",
                dragOver ? "border-primary bg-primary/5" : "border-border/70 bg-muted/10"
              ),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Textarea,
                  {
                    value: pasteText,
                    spellCheck: false,
                    autoCorrect: "off",
                    autoCapitalize: "off",
                    "data-gramm": "false",
                    onChange: (e) => setPasteText(e.target.value),
                    onPaste: (e) => {
                      const text = e.clipboardData.getData("text/plain");
                      if (!text.trim()) return;
                      e.preventDefault();
                      ingestText(text);
                    },
                    placeholder: "Application No	Assessment Type	Facility Name/Category	…\nHWC2602230000026_02	New Application	Sivarajpet/UAMM	…",
                    "aria-label": "Paste the SaQsham rows",
                    className: "min-h-44 resize-y border-0 bg-transparent font-mono text-xs shadow-none focus-visible:ring-0"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2 px-1 pb-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground", children: "Tab, comma or semicolon · quoted multi-line cells are kept · up to 10 MB / 20,000 rows" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", onClick: () => ingestText(pasteText), disabled: !pasteText.trim(), className: "gap-1.5", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(ClipboardPaste, { className: "size-3.5" }),
                      " Use pasted rows"
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Button,
                      {
                        size: "sm",
                        variant: "link",
                        className: "h-auto p-0",
                        onClick: () => {
                          setPasteText(SAQSHAM_SAMPLE_TSV);
                          loadSheet(parsePastedText(SAQSHAM_SAMPLE_TSV));
                        },
                        children: "Load sample"
                      }
                    )
                  ] })
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline", children: [
              parsing ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-3.5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "size-3.5" }),
              "Upload .xlsx / .csv",
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "file",
                  accept: ".xlsx,.xls,.csv,.tsv,.txt",
                  className: "hidden",
                  onChange: (e) => {
                    const f = e.target.files?.[0];
                    if (f) void onFile(f);
                  }
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "link", size: "sm", className: "h-auto gap-1 p-0 text-xs", onClick: () => downloadSampleFile(), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-3.5" }),
              " Download template"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: "Application No, Facility Name/Category and Status are required." })
          ] })
        ] }),
        step === 1 && sheet && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 rounded-xl border border-border/60 bg-background/60 p-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            PasteSummaryCard,
            {
              sheet,
              onEdit: () => {
                setSheet(null);
                setMap({});
              }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, { variant: "secondary", className: "gap-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "size-3" }),
              " ",
              sheet.fileName
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-muted-foreground", children: [
              "header on row ",
              sheet.headerRow + 1,
              " · ",
              matchedColumns,
              " of ",
              sheet.headers.length,
              " columns matched"
            ] })
          ] }),
          missingRequired.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "mt-0.5 size-4 shrink-0" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              "Map every required column to continue:",
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: missingRequired.map((k) => ALL_COLUMNS.find((c) => c.key === k)?.label ?? k).join(", ") })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3", children: PORTAL_COLUMNS.map((col) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            ColumnMappingField,
            {
              spec: col,
              sheet,
              value: map[col.key],
              onChange: (idx) => setMap((m) => ({ ...m, [col.key]: idx }))
            },
            col.key
          )) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { className: "rounded-lg border border-border/60 px-2 py-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("summary", { className: "cursor-pointer text-xs font-medium text-muted-foreground", children: [
              "Optional fields (",
              HELPER_COLUMNS.length,
              ")"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3", children: HELPER_COLUMNS.map((col) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              ColumnMappingField,
              {
                spec: col,
                sheet,
                value: map[col.key],
                onChange: (idx) => setMap((m) => ({ ...m, [col.key]: idx }))
              },
              col.key
            )) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: () => setStep(2), disabled: missingRequired.length > 0, className: "gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "size-4" }),
              " Review ",
              sheet.dataRows.length,
              " rows"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "ghost",
                onClick: () => {
                  setSheet(null);
                  setPasteText("");
                  setMap({});
                },
                children: "Start over"
              }
            ),
            missingRequired.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: "Required columns are still unmapped." })
          ] })
        ] }),
        step === 2 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-h-full flex-col gap-2", children: [
          sheet && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            PasteSummaryCard,
            {
              sheet,
              onEdit: () => {
                setSheet(null);
                setMap({});
                setStep(1);
              }
            }
          ) }),
          dupHint && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "p",
            {
              "data-testid": "duplicate-banner",
              className: "flex items-start gap-2 rounded-lg border border-sky-300/60 bg-sky-500/10 px-3 py-2 text-xs text-sky-900 dark:border-sky-400/40 dark:text-sky-100",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { className: "mt-0.5 size-3.5 shrink-0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: dupHint.count }),
                  " row",
                  dupHint.count === 1 ? " is" : "s are",
                  " identical to your import of ",
                  formatStamp(dupHint.at),
                  ". They are marked No change."
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            UniversalFilterBar,
            {
              pageKey: "bulkimport.saqsham.review",
              fields: reviewFields,
              value: bar,
              onChange: setBar,
              summary: `Showing ${shown.length} of ${viewRows.length} rows`,
              leading: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative w-full min-w-0 sm:w-56", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Input,
                  {
                    value: search,
                    onChange: (e) => setSearch(e.target.value),
                    placeholder: "Search rows",
                    className: "h-9 pl-8 text-xs",
                    "aria-label": "Search rows"
                  }
                )
              ] }),
              trailing: acceptSuggestions > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Button,
                {
                  size: "sm",
                  variant: "outline",
                  onClick: () => {
                    setFacilityChoice((prev) => {
                      const next = { ...prev };
                      for (const r of viewRows)
                        if (r.state === "needs_review" && r.match.status === "suggested") {
                          const top = r.match.candidates[0];
                          if (top && top.score >= 95) next[r.rowNo] = top.facilityId;
                        }
                      return next;
                    });
                    setIncludeOverride((prev) => {
                      const next = { ...prev };
                      for (const r of viewRows)
                        if (r.state === "needs_review" && r.match.status === "suggested") {
                          const top = r.match.candidates[0];
                          if (top && top.score >= 95) next[r.rowNo] = true;
                        }
                      return next;
                    });
                  },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "mr-1 size-3.5" }),
                    " Accept suggestions 95% or more (",
                    acceptSuggestions,
                    ")"
                  ]
                }
              ) : void 0
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2 sm:hidden", children: [
            shown.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              MobileRowCard,
              {
                row,
                reportChoice: reportChoice[row.rowNo],
                onToggleInclude: (next) => setIncludeOverride((p) => ({ ...p, [row.rowNo]: next })),
                onOpen: () => setDrawerRowNo(row.rowNo)
              },
              row.rowNo
            )),
            shown.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "rounded-lg border border-border/60 p-4 text-center text-xs text-muted-foreground", children: "No rows match the current filters." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "hidden sm:block", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            ImportPreviewTable,
            {
              columns: REVIEW_COLUMNS,
              rows: shown,
              groups: reviewGroups,
              facilities,
              reportChoice,
              onOpenMapping,
              groupNames: ctx?.reportGroups ?? REPORT_STATUS_VALUES,
              onToggleInclude: (rowNo, next) => setIncludeOverride((p) => ({ ...p, [rowNo]: next })),
              onPickFacility: (rowNo, facilityId) => setFacilityChoice((p) => ({ ...p, [rowNo]: facilityId })),
              onChooseReport: (rowNo, choice) => setReportChoice((prev) => {
                const next = { ...prev };
                if (choice === null) delete next[rowNo];
                else next[rowNo] = choice;
                return next;
              }),
              onOpenRow: (rowNo) => setDrawerRowNo(rowNo)
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 flex-wrap items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Popover, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "outline", className: "gap-1.5", "data-testid": "saqsham-more-options", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Settings2, { className: "size-3.5" }),
                " More options",
                optionalCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-primary/15 px-1.5 text-[10px] text-primary", children: optionalCount })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(PopoverContent, { align: "start", className: "w-[min(92vw,26rem)] space-y-2 p-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold tracking-wide text-muted-foreground uppercase", children: "Also update (optional — off by default)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-1.5", children: [
                  [
                    ["mode", "Assessment Mode", "Physical / Virtual → NQAS Mode"],
                    ["departments", "Applied Departments", "→ Departments / Packages"],
                    ["date", "Application date", "recorded on the import row"],
                    ["type", "Assessment Type", "recorded on the import row"]
                  ].map(([key, label, hint]) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "label",
                    {
                      className: "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          Checkbox,
                          {
                            className: ROW_CHECKBOX,
                            checked: optional[key],
                            onCheckedChange: (v) => setOptional((o) => ({ ...o, [key]: v === true }))
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0", children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-xs font-medium", children: label }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[10px] text-muted-foreground", children: hint })
                        ] })
                      ]
                    },
                    key
                  )),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Checkbox,
                      {
                        className: ROW_CHECKBOX,
                        checked: optional.overwrite,
                        onCheckedChange: (v) => setOptional((o) => ({ ...o, overwrite: v === true }))
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs", children: "Overwrite existing values (otherwise only blanks are filled)" })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Checkbox,
                      {
                        className: ROW_CHECKBOX,
                        checked: moveStatus,
                        onCheckedChange: (v) => setMoveStatus(v === true)
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs", children: [
                      "Also move ",
                      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Facility Current Status" }),
                      " forward when the report status allows it"
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Checkbox,
                      {
                        className: ROW_CHECKBOX,
                        checked: rememberOn,
                        onCheckedChange: (v) => setRememberOn(v === true)
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs", children: "Remember confirmed matches, so the next paste is automatic" })
                  ] })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[11px] text-muted-foreground", children: [
              "Remember confirmed matches is ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "on" }),
              " by default."
            ] })
          ] })
        ] }),
        step === 4 && result && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 rounded-xl border border-border/60 bg-background/60 p-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "flex items-center gap-2 text-base font-semibold", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "size-5 text-emerald-600" }),
            undone ? "Import undone" : "Import applied"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 gap-2 sm:grid-cols-4", children: [
            ["Successful", result.updated],
            ["Unchanged", result.noChange],
            ["Skipped", result.skipped],
            ["Failed", result.failed]
          ].map(([label, value]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border/60 px-3 py-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[11px] text-muted-foreground", children: label }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-lg font-semibold tabular-nums", children: value })
          ] }, label)) }),
          result.failures.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-rose-300/60 bg-rose-50/60 p-3 text-xs dark:bg-rose-500/10", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mb-1 font-semibold text-rose-800 dark:text-rose-200", children: [
              result.failures.length,
              " row",
              result.failures.length === 1 ? "" : "s",
              " could not be applied"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "max-h-32 space-y-0.5 overflow-auto text-rose-800/90 dark:text-rose-200/90", children: result.failures.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
              "Row ",
              f.rowNo,
              ": ",
              f.reason
            ] }, f.rowNo)) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "outline",
                size: "sm",
                className: "mt-2",
                onClick: () => {
                  const failed = new Set(result.failures.map((f) => f.rowNo));
                  setIncludeOverride((prev) => {
                    const next = { ...prev };
                    for (const row of viewRows) if (failed.has(row.rowNo)) next[row.rowNo] = true;
                    return next;
                  });
                  setConfirmed(false);
                  setStep(2);
                },
                children: "Back to review failed rows"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Button,
              {
                variant: "outline",
                className: "gap-2",
                onClick: () => void downloadImportReport({
                  fileName: sourceLabel(),
                  generatedBy: ctx?.me?.name ?? "user",
                  generatedAt: /* @__PURE__ */ new Date(),
                  reportRows: reportRowsRef.current,
                  rowsTotal: viewRows.length,
                  summary: result,
                  statusMap: ctx?.statusMap ?? []
                }),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-4" }),
                  " Download import report (Excel)"
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", className: "gap-2", onClick: () => onOpenList?.(), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "size-4" }),
              " View updated facilities"
            ] }),
            onOpenHistory && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", className: "gap-2", onClick: onOpenHistory, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(History, { className: "size-4" }),
              " Import history"
            ] }),
            !undone && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", className: "gap-2", onClick: () => void runUndo(), disabled: undoing, children: [
              undoing ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Undo2, { className: "size-4" }),
              "Undo this import"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "ghost", className: "gap-2", onClick: resetWizard, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "size-4" }),
              " Import another paste"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Undo restores the previous values of the rows in this batch. Rows edited after the import are listed and skipped, never overwritten." }),
          undoConflicts && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-amber-300/60 bg-amber-50/60 p-3 text-xs dark:bg-amber-500/10", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-1 font-medium", children: "Some rows were kept because they changed after the import:" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-0.5", children: undoConflicts.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
              "Row ",
              c.rowNo,
              ": ",
              c.reason
            ] }, c.rowNo)) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          RowDetailsDrawer,
          {
            row: drawerRowNo == null ? null : viewRows.find((r) => r.rowNo === drawerRowNo) ?? null,
            facilities,
            reportChoice: drawerRowNo == null ? void 0 : reportChoice[drawerRowNo],
            groupNames: ctx?.reportGroups ?? REPORT_STATUS_VALUES,
            onChooseReport: (rowNo, choice) => setReportChoice((prev) => {
              const next = { ...prev };
              if (choice === null) delete next[rowNo];
              else next[rowNo] = choice;
              return next;
            }),
            onClose: () => setDrawerRowNo(null),
            onRemember: (portalName, facilityType, facilityId) => {
              void saveAlias({ portalName, facilityType, facilityId });
              toast.success("Match remembered");
            }
          }
        )
      ]
    }
  );
}
function RowDetailsDrawer({
  row,
  facilities,
  reportChoice,
  groupNames,
  onChooseReport,
  onClose,
  onRemember
}) {
  if (!row) return null;
  const c = row.cleaned;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: true, onOpenChange: (o) => !o && onClose(), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "glass-strong max-h-[85vh] overflow-y-auto sm:max-w-2xl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { children: [
        "Row ",
        row.rowNo,
        " — ",
        c.portalFacilityRaw
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogDescription, { children: [
        STATE_STYLES[row.state].label,
        " · ",
        matchLabel(row),
        row.keptResultDeclared ? " · Kept: result declared" : "",
        row.movedBack ? " · Status moved back" : ""
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-xs font-semibold tracking-wide text-muted-foreground uppercase", children: "Matched facility" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
          row.facilityName || "—",
          " · ",
          row.facilityBlock,
          " · ",
          row.facilityPhc,
          " (",
          row.facilityType,
          ")"
        ] }),
        row.facilityId && /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            size: "sm",
            variant: "outline",
            className: "mt-1",
            onClick: () => onRemember(c.name, c.facilityType, row.facilityId),
            children: "Remember this match"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-xs font-semibold tracking-wide text-muted-foreground uppercase", children: "Cleaned values" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("dl", { className: "grid grid-cols-2 gap-x-3 gap-y-1 text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "text-muted-foreground", children: "Application No" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: c.applicationNo || "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "text-muted-foreground", children: "Name / category" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("dd", { children: [
            c.name,
            " / ",
            c.category || "—",
            " → ",
            c.facilityType || "unknown"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "text-muted-foreground", children: "Portal status" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: c.statusRaw || "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "text-muted-foreground", children: "Report group" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("dd", { className: "space-y-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "block", children: [
              previousReportLabel(row),
              " → ",
              nextReportLabel(row)
            ] }),
            (row.unmappedStatus || reportChoice !== void 0) && /* @__PURE__ */ jsxRuntimeExports.jsx(
              ReportChoiceCell,
              {
                row,
                value: reportChoice,
                onChoose: onChooseReport,
                groupNames
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "text-muted-foreground", children: "Applied date" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: c.appliedDate ? toDdMmmYyyy(c.appliedDate) : "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "text-muted-foreground", children: "Last update" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: c.lastUpdate.date ? toDdMmmYyyy(c.lastUpdate.date) : c.lastUpdate.updatedBy || "—" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h4", { className: "text-xs font-semibold tracking-wide text-muted-foreground uppercase", children: [
          "Departments (",
          c.appliedDepartments.statedCount ?? "?",
          " stated, ",
          c.appliedDepartments.departments.length,
          " ",
          "parsed)"
        ] }),
        c.appliedDepartments.ok ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs", children: c.appliedDepartments.departments.join(", ") || "—" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-amber-700 dark:text-amber-300", children: c.appliedDepartments.raw || "—" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-xs font-semibold tracking-wide text-muted-foreground uppercase", children: "Why it matched / candidates" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "space-y-1 text-xs", children: [
          row.match.status === "matched" && /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
            "Matched via ",
            matchLabel(row),
            "."
          ] }),
          row.match.status !== "matched" && row.match.candidates.map((cand) => {
            const f = facilities.find((x) => x.id === cand.facilityId);
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
              f ? `${f.name} · ${f.block} · ${f.phc}` : cand.facilityId,
              " — ",
              cand.score,
              "%"
            ] }, cand.facilityId);
          }),
          row.match.status === "unmatched" && /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "No candidate in the same Facility Type." })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-xs font-semibold tracking-wide text-muted-foreground uppercase", children: "Raw row" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "max-h-40 overflow-auto rounded border border-border/60 bg-muted/30 p-2 text-[10px]", children: JSON.stringify(c.raw, null, 2) })
      ] })
    ] })
  ] }) });
}

const BLANK = "__blank__";
const ALL = "__all__";
const NO_GROUP = "__no_group__";
function csvEscape(value) {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
function parseCsv(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const parseLine = (line) => {
    const out = [];
    let value = "";
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (quoted && line[i + 1] === '"') {
          value += '"';
          i += 1;
        } else quoted = !quoted;
      } else if (char === "," && !quoted) {
        out.push(value.trim());
        value = "";
      } else {
        value += char;
      }
    }
    out.push(value.trim());
    return out;
  };
  const first = parseLine(lines[0]);
  const start = first[0]?.toLowerCase().includes("portal") || first[1]?.toLowerCase().includes("report") ? 1 : 0;
  return lines.slice(start).map((line) => {
    const [portal, report = ""] = parseLine(line);
    return { portal, report };
  });
}
function downloadCsv(rows, groups) {
  const body = [
    "Portal status,Documents Status (Report),Group colour",
    ...rows.map((row) => {
      const group = groups.find((g) => g.name === row.report);
      return [csvEscape(row.portal), csvEscape(row.report), csvEscape(group?.color ?? "")].join(",");
    })
  ].join("\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "saqsham-status-mapping.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}
function groupIssues(groups) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const group of groups) {
    const name = group.name.trim();
    if (!name) out.push("Every report group needs a name.");
    const key = name.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) out.push(`“${name}” is used by more than one group.`);
    seen.add(key);
  }
  if (!groups.some((g) => g.name.trim().toLowerCase() === "result declared")) {
    out.push("Result Declared is a system group and cannot be deleted.");
  }
  return out;
}
function SaqshamMappingPanel({
  initialSearch = ""
}) {
  const data = useQuery(api.imports.getSaqshamStatusMap, {});
  const { user } = useAuth();
  const isAdmin = user?.appRole === "admin";
  const saveConfig = useMutation(api.imports.setSaqshamMappingConfig);
  const renameGroup = useMutation(api.imports.renameSaqshamReportGroup);
  const [draftRows, setDraftRows] = reactExports.useState(null);
  const [draftGroups, setDraftGroups] = reactExports.useState(null);
  const [busy, setBusy] = reactExports.useState(false);
  const [savedAt, setSavedAt] = reactExports.useState(null);
  const [undoStep, setUndoStep] = reactExports.useState(null);
  const undoRef = reactExports.useRef(null);
  const [search, setSearch] = reactExports.useState(initialSearch);
  const [groupFilter, setGroupFilter] = reactExports.useState(ALL);
  const [editingPortal, setEditingPortal] = reactExports.useState(null);
  const [editingText, setEditingText] = reactExports.useState("");
  const [editingGroup, setEditingGroup] = reactExports.useState(null);
  const [editingGroupText, setEditingGroupText] = reactExports.useState("");
  const [newPortal, setNewPortal] = reactExports.useState("");
  const [newReport, setNewReport] = reactExports.useState(REPORT_STATUS_VALUES[0]);
  const [newGroup, setNewGroup] = reactExports.useState("");
  const [newGroupColor, setNewGroupColor] = reactExports.useState(SAQSHAM_GROUP_COLORS[0]);
  const [csvOpen, setCsvOpen] = reactExports.useState(false);
  const [csvText, setCsvText] = reactExports.useState("");
  const [dragRow, setDragRow] = reactExports.useState(null);
  const [dragGroup, setDragGroup] = reactExports.useState(null);
  const [pending, setPending] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (initialSearch) setSearch(initialSearch);
  }, [initialSearch]);
  reactExports.useEffect(() => {
    if (!data) return;
    if (draftRows === null) {
      setDraftRows(
        data.rows.map((row) => ({
          portal: row.portal,
          report: row.report,
          aliases: row.aliases ?? [],
          portalUsage: row.portalUsage ?? 0,
          reportUsage: row.reportUsage ?? 0
        }))
      );
    }
    if (draftGroups === null) {
      setDraftGroups(
        data.groups.map((group) => ({
          name: group.name,
          color: group.color,
          order: group.order,
          system: group.system,
          usage: group.usage ?? 0
        }))
      );
    }
  }, [data, draftRows, draftGroups]);
  const rows = draftRows ?? [];
  const groups = draftGroups ?? [];
  const groupNames = reactExports.useMemo(() => groups.map((group) => group.name), [groups]);
  reactExports.useEffect(() => {
    if (newReport && groupNames.length > 0 && !groupNames.includes(newReport)) {
      setNewReport(groupNames[0]);
    }
  }, [groupNames, newReport]);
  const errors = reactExports.useMemo(
    () => [...groupIssues(groups), ...statusMapIssues(rows, groupNames)],
    [groups, groupNames, rows]
  );
  const shownRows = reactExports.useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (groupFilter === NO_GROUP && row.report) return false;
      if (groupFilter !== ALL && groupFilter !== NO_GROUP && row.report !== groupFilter) return false;
      if (!needle) return true;
      return `${row.portal} ${row.aliases.join(" ")} ${row.report}`.toLowerCase().includes(needle);
    });
  }, [groupFilter, rows, search]);
  const busyRef = reactExports.useRef(false);
  const save = async (nextRows, nextGroups) => {
    if (!isAdmin || busyRef.current) return false;
    const nextNames = nextGroups.map((group) => group.name);
    const nextErrors = [...groupIssues(nextGroups), ...statusMapIssues(nextRows, nextNames)];
    if (nextErrors.length > 0) {
      toast.error(nextErrors[0]);
      return false;
    }
    busyRef.current = true;
    setBusy(true);
    setSavedAt(null);
    const before = { kind: "config", rows, groups };
    try {
      await saveConfig({
        rows: nextRows.map((row, order) => ({
          portal: row.portal,
          report: row.report,
          aliases: row.aliases,
          order
        })),
        groups: nextGroups.map((group, order) => ({
          name: group.name,
          color: group.color,
          order,
          system: group.system
        }))
      });
      setDraftRows(nextRows);
      setDraftGroups(nextGroups);
      setUndoStep(before);
      undoRef.current = before;
      setSavedAt(Date.now());
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the status mapping");
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const saveRenamedGroup = async (from, to) => {
    if (!isAdmin || busyRef.current) return false;
    const current = groups.find((group) => group.name === from);
    if (!current || current.system) return false;
    const name = to.trim();
    if (!name || name === from) return false;
    if (groups.some((group) => group.name !== from && group.name.toLowerCase() === name.toLowerCase())) {
      toast.error("A report group with that name already exists.");
      return false;
    }
    busyRef.current = true;
    setBusy(true);
    setSavedAt(null);
    const nextGroups = groups.map(
      (group) => group.name === from ? { ...group, name } : group
    );
    const nextRows = rows.map((row) => row.report === from ? { ...row, report: name } : row);
    const before = { kind: "rename", from, to: name, color: current.color };
    try {
      const result = await renameGroup({ from, to: name });
      setDraftRows(nextRows);
      setDraftGroups(nextGroups);
      setUndoStep(before);
      undoRef.current = before;
      setSavedAt(Date.now());
      if (result.updatedFacilities > 0) {
        toast.success(`Report group renamed · ${result.updatedFacilities} facilities updated`);
      }
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not rename the report group");
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const undo = async () => {
    const step = undoRef.current;
    if (!step || !isAdmin || busyRef.current) return;
    if (step.kind === "rename") {
      busyRef.current = true;
      setBusy(true);
      try {
        await renameGroup({ from: step.to, to: step.from, color: step.color });
        setDraftRows(rows.map((row) => row.report === step.to ? { ...row, report: step.from } : row));
        setDraftGroups(
          groups.map(
            (group) => group.name === step.to ? { ...group, name: step.from, color: step.color } : group
          )
        );
        setUndoStep(null);
        undoRef.current = null;
        setSavedAt(Date.now());
        toast.success("Last change undone");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not undo");
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
      return;
    }
    const ok = await save(step.rows, step.groups);
    if (ok) {
      setUndoStep(null);
      undoRef.current = null;
      toast.success("Last change undone");
    }
  };
  const addStatus = async () => {
    const portal = newPortal.trim();
    if (!portal) {
      toast.error("Enter the portal status text first.");
      return;
    }
    if (rows.some((row) => normalizeStatusKey(row.portal) === normalizeStatusKey(portal) || row.aliases.some((alias) => normalizeStatusKey(alias) === normalizeStatusKey(portal)))) {
      toast.error("That portal status is already mapped.");
      return;
    }
    const next = {
      portal,
      report: newReport,
      aliases: [],
      portalUsage: 0,
      reportUsage: groups.find((g) => g.name === newReport)?.usage ?? 0
    };
    if (await save([next, ...rows], groups)) {
      setNewPortal("");
      toast.success("Status added");
    }
  };
  const requestPortalRename = (row) => {
    const portal = editingText.trim();
    if (!portal) {
      toast.error("A portal status cannot be blank.");
      return;
    }
    if (portal === row.portal) {
      setEditingPortal(null);
      return;
    }
    if (rows.some(
      (other) => other.portal !== row.portal && (normalizeStatusKey(other.portal) === normalizeStatusKey(portal) || other.aliases.some((alias) => normalizeStatusKey(alias) === normalizeStatusKey(portal)))
    )) {
      toast.error("That portal status is already used (ignoring case and extra spaces).");
      return;
    }
    const apply = async () => {
      const keepAlias = normalizeStatusKey(row.portal) !== normalizeStatusKey(portal);
      const next = rows.map(
        (other) => other.portal === row.portal ? { ...other, portal, aliases: keepAlias ? [...other.aliases, row.portal] : other.aliases } : other
      );
      if (await save(next, groups)) {
        setEditingPortal(null);
        toast.success("Portal status updated");
      }
    };
    setEditingPortal(null);
    if (row.portalUsage > 0) {
      setPending({
        title: "Rename a used portal status?",
        description: `“${row.portal}” is used by ${row.portalUsage} facilit${row.portalUsage === 1 ? "y" : "ies"}. The old text will stay as an alias, so past imports still match.`,
        confirmLabel: "Rename and keep alias",
        run: apply
      });
    } else {
      void apply();
    }
  };
  const requestDelete = (row) => {
    const run = async () => {
      const next = rows.filter((other) => other.portal !== row.portal);
      if (await save(next, groups)) toast.success("Status removed from the mapping");
    };
    if (row.portalUsage > 0) {
      setPending({
        title: "Delete a used portal status?",
        description: `“${row.portal}” is used by ${row.portalUsage} facilit${row.portalUsage === 1 ? "y" : "ies"}. Removing the mapping does not erase their saved data, but future imports with this text will need a mapping.`,
        confirmLabel: "Remove mapping",
        run
      });
    } else {
      void run();
    }
  };
  const requestReportChange = (row, report) => {
    if (row.report === report) return;
    const apply = async () => {
      const next = rows.map(
        (other) => other.portal === row.portal ? { ...other, report, reportUsage: groups.find((g) => g.name === report)?.usage ?? 0 } : other
      );
      if (await save(next, groups)) toast.success("Report group updated");
    };
    if (row.portalUsage > 0) {
      setPending({
        title: "Change a used status?",
        description: `“${row.portal}” is used by ${row.portalUsage} facilit${row.portalUsage === 1 ? "y" : "ies"}. Their saved report values stay the same; future imports will use the new group.`,
        confirmLabel: "Change group",
        run: apply
      });
    } else {
      void apply();
    }
  };
  const requestDeleteGroup = (group) => {
    if (group.system) return;
    const used = rows.filter((row) => row.report === group.name).length;
    if (used > 0) {
      toast.error(`Move the ${used} status${used === 1 ? "" : "es"} in “${group.name}” to another group first.`);
      return;
    }
    if (group.usage > 0) {
      toast.error(`“${group.name}” is still used by ${group.usage} facilities. Reassign them before deleting it.`);
      return;
    }
    setPending({
      title: "Delete report group?",
      description: `Delete “${group.name}”? This cannot be undone from the mapping screen.`,
      confirmLabel: "Delete group",
      run: async () => {
        const nextGroups = groups.filter((other) => other.name !== group.name);
        if (await save(rows, nextGroups)) toast.success("Report group deleted");
      }
    });
  };
  const addGroup = async () => {
    const name = newGroup.trim();
    if (!name) {
      toast.error("Enter a report group name.");
      return;
    }
    if (groups.some((group) => group.name.toLowerCase() === name.toLowerCase())) {
      toast.error("A report group with that name already exists.");
      return;
    }
    const nextGroups = [
      ...groups,
      { name, color: newGroupColor, order: groups.length, system: false, usage: 0 }
    ];
    if (await save(rows, nextGroups)) {
      setNewGroup("");
      toast.success("Report group added");
    }
  };
  const moveStatus = async (fromPortal, toPortal) => {
    if (fromPortal === toPortal) return;
    const from = rows.findIndex((row) => row.portal === fromPortal);
    const to = rows.findIndex((row) => row.portal === toPortal);
    if (from < 0 || to < 0) return;
    const next = [...rows];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    await save(next, groups);
  };
  const moveGroup = async (fromName, toName) => {
    if (fromName === toName) return;
    const from = groups.findIndex((group) => group.name === fromName);
    const to = groups.findIndex((group) => group.name === toName);
    if (from < 0 || to < 0) return;
    const next = [...groups];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    await save(rows, next.map((group, order) => ({ ...group, order })));
  };
  const importCsv = async () => {
    const parsed = parseCsv(csvText);
    if (parsed.length === 0) {
      toast.error("Paste CSV rows first.");
      return;
    }
    const unknown = parsed.find((row) => row.report && !groupNames.includes(row.report));
    if (unknown) {
      toast.error(`“${unknown.report}” is not a report group. Add the group first.`);
      return;
    }
    const next = parsed.map((row) => ({
      portal: row.portal,
      report: row.report,
      aliases: [],
      portalUsage: 0,
      reportUsage: groups.find((group) => group.name === row.report)?.usage ?? 0
    }));
    const issues = statusMapIssues(next, groupNames);
    if (issues.length > 0) {
      toast.error(issues[0]);
      return;
    }
    if (await save(next, groups)) {
      setCsvOpen(false);
      setCsvText("");
      toast.success(`Imported ${next.length} status mappings`);
    }
  };
  const resetSeed = () => {
    setPending({
      title: "Reset to seed?",
      description: "This replaces the status mapping with the shipped seed. Existing facility values are not changed; a custom report group still used by facilities stays so those values keep their group.",
      confirmLabel: "Reset mapping",
      run: async () => {
        const nextRows = SAQSHAM_STATUS_MAP.map((row) => ({
          portal: row.portal,
          report: row.report,
          aliases: [],
          portalUsage: 0,
          reportUsage: 0
        }));
        const seedNames = new Set(
          DEFAULT_REPORT_GROUPS.map((group) => normalizeStatusKey(group.name))
        );
        const usageByName = new Map(
          groups.map((group) => [normalizeStatusKey(group.name), group.usage])
        );
        const keptGroups = groups.filter(
          (group) => !seedNames.has(normalizeStatusKey(group.name)) && group.usage > 0
        );
        const nextGroups = [
          ...DEFAULT_REPORT_GROUPS.map((group, order) => ({
            ...group,
            order,
            usage: usageByName.get(normalizeStatusKey(group.name)) ?? 0
          })),
          ...keptGroups.map((group, index) => ({
            ...group,
            order: DEFAULT_REPORT_GROUPS.length + index
          }))
        ];
        if (await save(nextRows, nextGroups)) toast.success("Status mapping reset to seed");
      }
    });
  };
  if (!data) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-2 p-6 text-sm text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin" }),
      " Loading the status mapping…"
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", "data-admin-anchor": "saqsham-status-map", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-start justify-between gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "flex items-center gap-2 text-base font-semibold", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ListChecks, { className: "size-4" }),
          " Status mapping"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 max-w-3xl text-xs text-muted-foreground", children: "Portal status is kept exactly as imported. Documents Status (Report) is what the app uses after the import. Changes are saved automatically and recorded in the audit log." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
        busy && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: "Saving…" }),
        savedAt && !busy && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 rounded-full border border-emerald-300/70 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-800", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3" }),
          " Saved"
        ] }),
        undoStep && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "ghost", className: "gap-1.5", disabled: busy, onClick: () => void undo(), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Undo2, { className: "size-3.5" }),
          " Undo"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[11px] text-muted-foreground", children: [
          "Version ",
          data.version || "seed"
        ] })
      ] })
    ] }),
    !isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground", children: "View only. A State Admin can add, change or delete mappings and report groups." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "border-border/70", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, { className: "flex flex-wrap items-center gap-2 text-sm", children: [
        "Portal statuses",
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs font-normal text-muted-foreground", children: [
          rows.length,
          " mapped · ",
          shownRows.length,
          " shown"
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-3", children: [
        isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-dashed border-border/80 bg-muted/20 p-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mb-2 flex items-center gap-1.5 text-xs font-semibold", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "size-3.5" }),
            " Add status"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-end gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "min-w-56 flex-1 text-[11px] font-medium", children: [
              "Portal status (exact text)",
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  className: "mt-1 h-8 text-xs",
                  value: newPortal,
                  onChange: (event) => setNewPortal(event.target.value),
                  placeholder: "Paste the exact SaQsham status text",
                  onKeyDown: (event) => {
                    if (event.key === "Enter") void addStatus();
                  }
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "w-64 text-[11px] font-medium", children: [
              "Documents Status (Report)",
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Select,
                {
                  value: newReport || BLANK,
                  onValueChange: (value) => setNewReport(value === BLANK ? "" : value),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "mt-1 h-8 text-xs", "aria-label": "Report group for the new status", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: BLANK, children: "Keep current report" }),
                      groupNames.map((name) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: name, children: name }, name))
                    ] })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { type: "button", size: "sm", className: "gap-1.5", disabled: busy, onClick: () => void addStatus(), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "size-3.5" }),
              " Add"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative min-w-52 flex-1 sm:max-w-80", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                value: search,
                onChange: (event) => setSearch(event.target.value),
                placeholder: "Search portal text or report group",
                className: "h-8 pl-8 text-xs",
                "aria-label": "Search status mapping"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: groupFilter, onValueChange: setGroupFilter, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-8 w-56 text-xs", "aria-label": "Filter by report group", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: ALL, children: "All report groups" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: NO_GROUP, children: "Keep current report" }),
              groupNames.map((name) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: name, children: name }, name))
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              size: "sm",
              variant: "outline",
              className: "gap-1.5",
              onClick: () => downloadCsv(rows, groups),
              disabled: rows.length === 0,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-3.5" }),
                " Export CSV"
              ]
            }
          ),
          isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "outline", className: "gap-1.5", onClick: () => setCsvOpen(true), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "size-3.5" }),
              " Import CSV"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "ghost", className: "gap-1.5", disabled: busy, onClick: resetSeed, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { className: "size-3.5" }),
              " Reset to seed"
            ] })
          ] })
        ] }),
        errors.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "list-disc space-y-0.5 pl-5 text-xs text-rose-700", children: errors.map((error) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: error }, error)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto rounded-lg border border-border/60", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full min-w-[58rem] border-collapse text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/80", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "w-8 px-2 py-2", "aria-label": "Reorder" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-2 py-2 text-left font-semibold text-muted-foreground", children: "Portal status (kept exactly as imported)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "w-72 px-2 py-2 text-left font-semibold text-muted-foreground", children: "Documents Status (Report)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "w-28 px-2 py-2 text-left font-semibold text-muted-foreground", children: "Used by" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "w-12 px-2 py-2" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
            shownRows.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 5, className: "px-3 py-8 text-center text-muted-foreground", children: "No status matches the search or group filter." }) }),
            shownRows.map((row) => {
              const report = row.report || "";
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "tr",
                {
                  className: cn(
                    "border-t border-border/40 align-top",
                    dragRow === row.portal && "bg-primary/5"
                  ),
                  draggable: isAdmin,
                  onDragStart: () => setDragRow(row.portal),
                  onDragOver: (event) => event.preventDefault(),
                  onDrop: () => {
                    if (dragRow) void moveStatus(dragRow, row.portal);
                    setDragRow(null);
                  },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-2 text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(GripVertical, { className: cn("size-3.5", !isAdmin && "opacity-30"), "aria-hidden": true }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-2 py-2", children: [
                      editingPortal === row.portal ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-1.5", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          Input,
                          {
                            autoFocus: true,
                            className: "h-8 min-w-60 flex-1 text-xs",
                            value: editingText,
                            onChange: (event) => setEditingText(event.target.value),
                            onKeyDown: (event) => {
                              if (event.key === "Enter") requestPortalRename(row);
                              if (event.key === "Escape") setEditingPortal(null);
                            }
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          Button,
                          {
                            type: "button",
                            size: "icon",
                            variant: "ghost",
                            className: "size-8",
                            "aria-label": "Save portal status",
                            onClick: () => requestPortalRename(row),
                            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3.5" })
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          Button,
                          {
                            type: "button",
                            size: "icon",
                            variant: "ghost",
                            className: "size-8",
                            "aria-label": "Cancel portal edit",
                            onClick: () => setEditingPortal(null),
                            children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3.5" })
                          }
                        )
                      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-1.5", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1 break-words", children: row.portal }),
                        isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsx(
                          Button,
                          {
                            type: "button",
                            size: "icon",
                            variant: "ghost",
                            className: "size-7 shrink-0",
                            "aria-label": `Edit ${row.portal}`,
                            onClick: () => {
                              setEditingPortal(row.portal);
                              setEditingText(row.portal);
                            },
                            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "size-3" })
                          }
                        )
                      ] }),
                      row.aliases.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-0.5 text-[10px] text-muted-foreground", children: [
                        "Old text: ",
                        row.aliases.join(" · ")
                      ] })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-2 py-2", children: [
                      isResultDeclared(row.portal) && !report && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-1 text-[10px] font-semibold text-amber-800", children: "Needs mapping — choose a destination" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        Select,
                        {
                          value: report || (isResultDeclared(row.portal) ? "" : BLANK),
                          disabled: !isAdmin,
                          onValueChange: (value) => requestReportChange(row, value === BLANK ? "" : value),
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-8 w-full text-xs", "aria-label": `Report group for ${row.portal}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Needs mapping" }) }),
                            /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                              !isResultDeclared(row.portal) && /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: BLANK, children: "Keep current report" }),
                              groupNames.map((name) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: name, children: name }, name))
                            ] })
                          ]
                        }
                      ),
                      report && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 flex items-center gap-1 text-[10px] text-muted-foreground", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "span",
                          {
                            className: "inline-block size-2 rounded-full",
                            style: { backgroundColor: groups.find((g) => g.name === report)?.color ?? "#94A3B8" }
                          }
                        ),
                        report
                      ] })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-2 text-muted-foreground", children: row.portalUsage > 0 ? `${row.portalUsage} facilities` : "-" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-2 text-right", children: isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Button,
                      {
                        type: "button",
                        size: "icon",
                        variant: "ghost",
                        className: "size-8 text-muted-foreground hover:text-destructive",
                        disabled: busy,
                        "aria-label": `Delete mapping for ${row.portal}`,
                        onClick: () => requestDelete(row),
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "size-3.5" })
                      }
                    ) })
                  ]
                },
                row.portal
              );
            })
          ] })
        ] }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "border-border/70", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, { className: "flex flex-wrap items-center gap-2 text-sm", children: [
        "Manage report groups",
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs font-normal text-muted-foreground", children: [
          groups.length,
          " groups"
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-3", children: [
        isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border/80 bg-muted/20 p-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "min-w-56 flex-1 text-[11px] font-medium", children: [
            "New report group",
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                className: "mt-1 h-8 text-xs",
                value: newGroup,
                onChange: (event) => setNewGroup(event.target.value),
                placeholder: "For example: Report sent to NHSRC",
                onKeyDown: (event) => {
                  if (event.key === "Enter") void addGroup();
                }
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-[11px] font-medium", children: [
            "Colour",
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "color",
                value: newGroupColor,
                onChange: (event) => setNewGroupColor(event.target.value),
                className: "mt-1 block h-8 w-14 cursor-pointer rounded border border-border bg-background p-1",
                "aria-label": "New group colour"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { type: "button", size: "sm", className: "gap-1.5", disabled: busy, onClick: () => void addGroup(), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "size-3.5" }),
            " Add group"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto rounded-lg border border-border/60", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full min-w-[42rem] border-collapse text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/80", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "w-8 px-2 py-2", "aria-label": "Reorder" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-2 py-2 text-left font-semibold text-muted-foreground", children: "Report group" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "w-24 px-2 py-2 text-left font-semibold text-muted-foreground", children: "Colour" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "w-28 px-2 py-2 text-left font-semibold text-muted-foreground", children: "Used by" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "w-24 px-2 py-2" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: groups.map((group) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "tr",
            {
              className: cn("border-t border-border/40", dragGroup === group.name && "bg-primary/5"),
              draggable: isAdmin && !busy,
              onDragStart: () => setDragGroup(group.name),
              onDragOver: (event) => event.preventDefault(),
              onDrop: () => {
                if (dragGroup) void moveGroup(dragGroup, group.name);
                setDragGroup(null);
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-2 text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(GripVertical, { className: cn("size-3.5", !isAdmin && "opacity-30"), "aria-hidden": true }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-2", children: editingGroup === group.name ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-1.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Input,
                    {
                      autoFocus: true,
                      className: "h-8 min-w-52 flex-1 text-xs",
                      value: editingGroupText,
                      onChange: (event) => setEditingGroupText(event.target.value),
                      onKeyDown: (event) => {
                        if (event.key === "Enter") {
                          const next = editingGroupText;
                          setEditingGroup(null);
                          void saveRenamedGroup(group.name, next);
                        }
                        if (event.key === "Escape") setEditingGroup(null);
                      }
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Button,
                    {
                      type: "button",
                      size: "icon",
                      variant: "ghost",
                      className: "size-8",
                      "aria-label": "Save report group name",
                      onClick: () => {
                        const next = editingGroupText;
                        setEditingGroup(null);
                        void saveRenamedGroup(group.name, next);
                      },
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3.5" })
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Button,
                    {
                      type: "button",
                      size: "icon",
                      variant: "ghost",
                      className: "size-8",
                      "aria-label": "Cancel report group edit",
                      onClick: () => setEditingGroup(null),
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3.5" })
                    }
                  )
                ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: group.name }),
                  group.system && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-0.5 rounded-full border border-border/70 bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "size-2.5" }),
                    " System"
                  ] }),
                  isAdmin && !group.system && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Button,
                    {
                      type: "button",
                      size: "icon",
                      variant: "ghost",
                      className: "size-7",
                      "aria-label": `Rename ${group.name}`,
                      onClick: () => {
                        setEditingGroup(group.name);
                        setEditingGroupText(group.name);
                      },
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "size-3" })
                    }
                  )
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "color",
                    value: group.color,
                    disabled: !isAdmin || busy,
                    onChange: (event) => {
                      const next = groups.map(
                        (other) => other.name === group.name ? { ...other, color: event.target.value } : other
                      );
                      setDraftGroups(next);
                    },
                    onBlur: (event) => {
                      const color = event.target.value;
                      const next = groups.map(
                        (other) => other.name === group.name ? { ...other, color } : other
                      );
                      if (data.groups.find((other) => other.name === group.name)?.color !== color) {
                        void save(rows, next);
                      }
                    },
                    className: "h-7 w-12 cursor-pointer rounded border border-border bg-background p-0.5 disabled:cursor-not-allowed",
                    "aria-label": `Colour for ${group.name}`
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-2 text-muted-foreground", children: group.usage > 0 ? `${group.usage} facilities` : "-" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-2 text-right", children: isAdmin && !group.system && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    type: "button",
                    size: "icon",
                    variant: "ghost",
                    className: "size-8 text-muted-foreground hover:text-destructive",
                    disabled: busy,
                    "aria-label": `Delete ${group.name}`,
                    onClick: () => requestDeleteGroup(group),
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "size-3.5" })
                  }
                ) })
              ]
            },
            group.name
          )) })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground", children: "Drag to reorder. A group can be deleted only after every status in it is moved. Result Declared cannot be renamed or deleted." })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: csvOpen, onOpenChange: setCsvOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "sm:max-w-xl", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Import status mapping CSV" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "Two columns: portal status and report group. Use Export CSV as the starting file." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            type: "file",
            accept: ".csv,text/csv",
            onChange: (event) => {
              const file = event.target.files?.[0];
              if (file) void file.text().then(setCsvText);
            },
            "aria-label": "Choose a status mapping CSV"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "mapping-csv", className: "text-xs", children: "Or paste CSV" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "textarea",
          {
            id: "mapping-csv",
            rows: 10,
            value: csvText,
            onChange: (event) => setCsvText(event.target.value),
            className: "w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring",
            placeholder: "Portal status,Documents Status (Report)\nResult Declared,Keep current report"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", onClick: () => setCsvOpen(false), children: "Cancel" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => void importCsv(), disabled: busy || !csvText.trim(), children: "Import" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: !!pending, onOpenChange: (open) => !open && setPending(null), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: pending?.title }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: pending?.description })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", onClick: () => setPending(null), children: "Cancel" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            onClick: () => {
              const run = pending?.run;
              setPending(null);
              if (run) void run();
            },
            children: pending?.confirmLabel
          }
        )
      ] })
    ] }) })
  ] });
}

function BatchReportWorker({
  batchId,
  onDone,
  onError
}) {
  const report = useQuery(api.imports.getSaqshamReport, { batchId });
  const started = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (!report || started.current) return;
    started.current = true;
    downloadImportReport({
      fileName: report.fileName,
      generatedBy: report.importedByName,
      generatedAt: /* @__PURE__ */ new Date(),
      summary: {
        updated: report.rowsUpdated,
        noChange: report.rowsNoChange,
        skipped: report.rowsSkipped,
        failed: report.rowsFailed
      },
      statusMap: report.statusMap,
      reportRows: report.reportRows ?? null,
      rowsTotal: report.rowsTotal
    }).then(onDone).catch(() => onError("Could not build the report"));
  }, [report]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-2 p-6 text-sm text-muted-foreground", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin" }),
    " Building the report…"
  ] });
}
function SaqshamReportDialog({
  batchId,
  onClose
}) {
  const report = useQuery(
    api.imports.getSaqshamReport,
    batchId ? { batchId } : "skip"
  );
  const rows = report?.reportRows ?? null;
  const counts = rows ? reportCounts(rows) : null;
  const updated = rows ? updatedReportRows(rows) : [];
  const other = rows ? simpleReportRows(rows) : [];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: !!batchId, onOpenChange: (open) => !open && onClose(), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-h-[85vh] max-w-5xl overflow-y-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { children: [
        "Import report · ",
        report?.fileName ?? "…"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "Read from the snapshot saved at Apply, not from today’s facility data." })
    ] }),
    !report ? /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-2 p-4 text-sm text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin" }),
      " Loading…"
    ] }) : !rows ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "rounded-md border border-border/60 bg-muted/30 p-4 text-sm", children: "Detail not stored for this import." }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4 text-xs", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 gap-2 sm:grid-cols-4", children: [
        ["Rows updated", (counts?.Updated ?? 0) + (counts?.New ?? 0)],
        ["No change", counts?.["No change"] ?? 0],
        ["Needs decision", (counts?.["Needs decision"] ?? 0) + (counts?.["Can't match"] ?? 0)],
        ["Skipped / failed", (counts?.Skipped ?? 0) + (counts?.Failed ?? 0)]
      ].map(([label, value]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md border border-border/60 bg-muted/20 p-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] uppercase text-muted-foreground", children: label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-lg font-semibold tabular-nums", children: value })
      ] }, label)) }),
      updated.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(ReportTable, { title: "Updated", rows: updated }),
      other.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(ReportTable, { title: "Other rows", rows: other }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          size: "sm",
          variant: "outline",
          onClick: () => void downloadImportReport({
            fileName: report.fileName,
            generatedBy: report.importedByName,
            generatedAt: /* @__PURE__ */ new Date(),
            summary: {
              updated: report.rowsUpdated,
              noChange: report.rowsNoChange,
              skipped: report.rowsSkipped,
              failed: report.rowsFailed
            },
            statusMap: report.statusMap,
            reportRows: rows,
            rowsTotal: report.rowsTotal
          }),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-3.5" }),
            " Download Excel"
          ]
        }
      )
    ] })
  ] }) });
}
function ReportTable({ title, rows }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("h4", { className: "mb-1 font-semibold", children: [
      title,
      " · ",
      rows.length
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-auto rounded-md border border-border/60", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-left text-[11px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/60", children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: ["Row", "Application No", "Portal name", "Matched facility", "Facility type", "PHC", "Block", "Match", "Previous status", "New status", "Previous report", "New report", "Previous portal update", "New portal update", "Application", "Mode", "Applied by", "Applied at"].map((head) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-2 py-1 font-semibold whitespace-nowrap", children: head }, head)) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: rows.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t border-border/40", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1 tabular-nums", children: row.rowNo }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1", children: row.applicationNo }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1", children: row.portalName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1", children: row.matchedFacility }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1", children: row.facilityType }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1", children: row.phc }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1", children: row.block }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1", children: row.match }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1", children: row.previousStatus }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1", children: row.newStatus }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1", children: row.previousReport }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1", children: row.newReport }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1", children: row.previousPortalUpdate }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1", children: row.newPortalUpdate }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1", children: row.application }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1", children: row.mode }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1", children: row.appliedBy }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1 whitespace-nowrap", children: new Date(row.appliedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) })
      ] }, row.rowNo)) })
    ] }) })
  ] });
}

const IMPORT_KIND_LABEL = {
  saqsham: "SaQsham document status",
  ia: "Internal Assessment",
  "facility-master": "Facility master",
  links: "Links Organiser"
};
function detectImportText(text) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim() !== "");
  const header = (lines[0] ?? "").split(/\t|,/).map((h) => h.trim().toLowerCase());
  const has = (...needles) => needles.every((n) => header.some((h) => h.includes(n)));
  const matches = [];
  if (has("application") && (has("status") || has("facility name"))) matches.push("saqsham");
  if ((has("nin number") || has("facility for formula")) && has("financial year") && has("quarter") && (has("nqas ia") || has("kayakalp ia")))
    matches.push("ia");
  const looksQuarterly = has("financial year") && has("quarter");
  if (has("facility") && has("block") && (has("nin") || has("type")) && !looksQuarterly)
    matches.push("facility-master");
  if (has("report name") && has("category") && (has("link") || has("form link")))
    matches.push("links");
  const kind = matches.length === 1 ? matches[0] : null;
  return {
    kind,
    label: kind ? IMPORT_KIND_LABEL[kind] : "Unknown",
    rows: Math.max(0, lines.length - 1),
    columns: header.length,
    ambiguous: matches.length > 1,
    matches
  };
}

const DEFAULT_LINK_CATEGORIES = [
  { name: "Basic Data", colour: "teal", icon: "Database" },
  { name: "Quality Status", colour: "blue", icon: "BadgeCheck" },
  { name: "Building Status", colour: "amber", icon: "Building2" },
  { name: "Doc. Collection", colour: "violet", icon: "FolderOpen" }
];
const DEFAULT_LINK_OWNERS = ["NHSRC", "Quality", "State Sheet", "District Sheet"];

const TEAL = "FF0F6B63";
const IMPORTABLE_COLUMNS = fullExportColumns().filter(
  (c) => c.importable === true
);
const DERIVED_KEYS = [
  "certCycle",
  "pipelineStatus",
  "validityDate",
  "nextAction",
  "documentsStatusReport",
  "nocStatus",
  "documents"
];
const TYPES = {
  text: { format: "text", required: "sometimes", notes: "plain text" },
  date: { format: "DD-MMM-YYYY (e.g. 23-Sep-2025)", required: "optional", notes: "flexible parse; shown DD-MMM-YYYY" },
  currency: { format: "₹ 1,25,000 (Indian grouping)", required: "optional", notes: "number, rupees" },
  score: { format: "0–100", required: "optional", notes: "a blank score is never 0" },
  status: { format: "list value", required: "sometimes", notes: "must exist in the admin list" }
};
function buildMasterImportWorkbook(o) {
  const wb = new ExcelJS.Workbook();
  wb.creator = o.generatedBy;
  const cols = IMPORTABLE_COLUMNS;
  const ws = wb.addWorksheet("Facility Master", {
    views: [{ state: "frozen", ySplit: 2, xSplit: 2 }]
  });
  const band = [];
  cols.forEach((c, i) => band.push(i === 0 || cols[i - 1].group !== c.group ? c.group : ""));
  ws.columns = cols.map((c) => ({ width: Math.max(12, columnWidthPx(c) / 8) }));
  const bandRow = ws.addRow(band);
  bandRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
  cols.forEach((_, i) => {
    bandRow.getCell(i + 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: TEAL } };
    bandRow.getCell(i + 1).alignment = { horizontal: "center", vertical: "middle" };
  });
  const headRow = ws.addRow(cols.map((c) => c.label));
  headRow.font = { bold: true };
  cols.forEach((c, i) => {
    const cell = headRow.getCell(i + 1);
    cell.border = { bottom: { style: "thin", color: { argb: "FFE1E7ED" } } };
    if (c.key === "nin") cell.numFmt = "@";
  });
  ws.autoFilter = {
    from: { row: 2, column: 1 },
    to: { row: 2, column: cols.length }
  };
  if (o.template === "blank") {
    const sample = cols.map(() => "");
    const first = COLUMN_BY_KEY.facility;
    sample[cols.indexOf(first)] = "delete this row";
    const row = ws.addRow(sample);
    row.getCell(1).note = "Grey sample row — delete it before uploading.";
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
      cell.font = { italic: true, color: { argb: "FF94A3B8" } };
    });
  } else {
    for (const r of o.rows) {
      const row = ws.addRow(cols.map((c) => cellText(r, c.key).replace(/(Overdue|Due in) .*$/, "") || ""));
      const ninIdx = cols.findIndex((c) => c.key === "nin");
      if (ninIdx >= 0) row.getCell(ninIdx + 1).numFmt = "@";
    }
  }
  const ins = wb.addWorksheet("Instructions");
  ins.columns = [{ width: 100 }];
  const steps = [
    "1. Keep the header rows exactly as they are — the importer reads them.",
    "2. Fill only the importable columns; the one row per facility, the NIN decides whether the facility is NEW or EXISTING.",
    `3. Blank cell never erases an existing value — a blank is 'no change' (unless you tick "Blank cell clears existing value" in the wizard).`,
    "4. Dates: any common format is fine (DD-MMM-YYYY shown). Amounts use Indian grouping (₹ 1,25,000). Scores go 0–100; a blank score is never 0.",
    '5. Read-only now: Certification Cycle, Facility Current Status, validity and due dates, Documents Status (Report), Fire NOC Validity Status are DERIVED — the app computes them; the Field guide marks them "Auto, do not fill".',
    "6. SaQsham document status and quarterly IA scores are NOT imported here — use their own importers on the Bulk Import page.",
    "Colour legend: grey sample row = delete me; red = error, amber = needs review, green = ready in the preview.",
    'Certification Cycle: every facility starts at Cycle #1 (Initial). A SECOND cycle (#2 Recert) opens only when a re-application starts — "Recertification Due" alone does NOT advance the cycle.'
  ];
  for (const line of steps) ins.addRow([line]);
  const guide = wb.addWorksheet("Field guide");
  guide.columns = [{ width: 30 }, { width: 26 }, { width: 44 }, { width: 40 }];
  const gh = guide.addRow(["Column", "Required?", "Format", "Importable?"]);
  gh.font = { bold: true };
  for (const c of fullExportColumns()) {
    const t = TYPES[c.type] ?? { format: c.type, required: "optional", notes: "" };
    const importable = c.importable === true && !isDeprecatedColumn(c);
    DERIVED_KEYS.includes(c.key) || !importable;
    guide.addRow([
      c.label,
      t.required,
      `${t.format}${t.notes ? ` — ${t.notes}` : ""}`,
      importable ? "Yes" : "Auto, do not fill (derived)"
    ]);
  }
  const lists = wb.addWorksheet("Lists");
  const names = Object.keys(o.lists);
  lists.columns = names.map((n) => ({ width: Math.max(12, n.length + 4) }));
  const lh = lists.addRow(names);
  lh.font = { bold: true };
  const depth = Math.max(0, ...names.map((n) => o.lists[n].length));
  for (let i = 0; i < depth; i++) lists.addRow(names.map((n) => o.lists[n][i] ?? ""));
  for (const sheet of wb.worksheets) {
    sheet.pageSetup = {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 }
    };
    sheet.headerFooter = { oddFooter: "&P of &N", evenFooter: "&P of &N" };
  }
  ["Facility Master", "Field guide", "Lists"].forEach((name) => {
    const sheet = wb.getWorksheet(name);
    sheet?.pageSetup && (sheet.pageSetup.margins = sheet.pageSetup.margins);
  });
  return wb;
}
function masterImportLists(rows) {
  const uniq = (v) => [...new Set(v)].filter(Boolean).sort();
  return {
    Blocks: uniq(rows.map((r) => r.facility.block)),
    PHCs: uniq(rows.map((r) => r.facility.phc)),
    FacilityTypes: DEFAULT_SETTINGS.facilityTypes,
    Eligibility: DEFAULT_SETTINGS.eligibilityOptions,
    BuildingTypes: DEFAULT_SETTINGS.buildingTypes,
    BuildingStatuses: DEFAULT_SETTINGS.buildingStatuses,
    CertificationStatuses: DEFAULT_SETTINGS.certificationStatuses,
    SaQshamDocStatuses: DEFAULT_SETTINGS.generalDocStatuses,
    YesNo: ["Yes", "No"]
  };
}
async function downloadMasterTemplate(template, rows, lists, generatedBy) {
  const wb = buildMasterImportWorkbook({ template, rows, lists, generatedBy });
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = template === "blank" ? "facility-master-import-template.xlsx" : "facility-master-current-data.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}
function downloadMasterCsvTemplate(lists) {
  const blob = new Blob([buildMasterImportCsv(lists)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "facility-master-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}
function buildMasterImportCsv(lists) {
  const headers = IMPORTABLE_COLUMNS.map((c) => c.label);
  const sample = IMPORTABLE_COLUMNS.map(
    (c) => c.key === "facility" ? "sample — delete this row" : null
  );
  const listsLine = Object.entries(lists).filter(([, v]) => v.length > 0).map(([k, v]) => `${k}: ${v.join(" | ")}`);
  const esc = (v) => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  return [
    headers.join(","),
    sample.map(() => "").join(","),
    ...listsLine.map(esc),
    ""
  ].join("\n");
}

const TILES = [
  {
    kind: "saqsham",
    name: "SaQsham document status",
    blurb: "Portal status, report group and portal date, previous → new.",
    icon: ShieldCheck,
    tone: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    template: "Sample"
  },
  {
    kind: "ia",
    name: "Internal Assessment (Quarterly IA)",
    blurb: "NQAS and Kayakalp IA scores by NIN and quarter.",
    icon: Target,
    tone: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    template: "Quarter template"
  },
  {
    kind: "facility-master",
    name: "Facility master",
    blurb: "Bulk edit the Master List fields (CSV / paste).",
    icon: FileSpreadsheet,
    tone: "bg-muted text-muted-foreground",
    template: "Template"
  },
  {
    kind: "links",
    name: "Links Organiser",
    blurb: "Report and data-collection links, owners and schedules.",
    icon: BookMarked,
    tone: "bg-emerald-500/15 text-emerald-800",
    template: "Template"
  }
];
function SmartAddBox({
  onDetected,
  disabled
}) {
  const [drag, setDrag] = reactExports.useState(false);
  const [choice, setChoice] = reactExports.useState(null);
  const fileRef = reactExports.useRef(null);
  const accept = (text) => {
    if (!text.trim()) return;
    const detected = detectImportText(text);
    if (detected.ambiguous) {
      setChoice({ detected, text });
      return;
    }
    if (!detected.kind) {
      toast.error("Could not tell which import this is. Open a tile below and paste there.");
      return;
    }
    toast.success(`Detected: ${detected.label} · ${detected.rows} rows · ${detected.columns} columns`);
    onDetected(detected.kind, { text });
  };
  const readFile = async (file) => {
    const name = file.name.toLowerCase();
    if (/\.(xlsx|xls)$/.test(name)) {
      try {
        const wb = readSync(await file.arrayBuffer(), { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const aoa = utils.sheet_to_json(ws, {
          header: 1,
          raw: false,
          defval: ""
        });
        const probe = aoa.slice(0, 50).map((r) => r.join("	")).join("\n");
        const detected = detectImportText(probe);
        if (detected.kind) {
          toast.success(`Detected: ${detected.label} · ${detected.rows} rows`);
          onDetected(detected.kind, { file });
          return;
        }
        toast.error("Could not tell which import this file is. Open a tile below and upload it there.");
      } catch {
        toast.error("Could not read that Excel file");
      }
      return;
    }
    const text = await file.text();
    accept(text);
  };
  reactExports.useEffect(() => {
    if (disabled) return;
    const onPaste = (e) => {
      const el = e.target;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      const text = e.clipboardData?.getData("text/plain") ?? "";
      if (!text.trim()) return;
      e.preventDefault();
      accept(text);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [disabled]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        "data-testid": "smart-add-data",
        onDragOver: (e) => {
          e.preventDefault();
          setDrag(true);
        },
        onDragLeave: () => setDrag(false),
        onDrop: (e) => {
          e.preventDefault();
          setDrag(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void readFile(file);
        },
        className: `rounded-xl border-2 border-dashed p-4 transition-colors ${drag ? "border-primary bg-primary/5" : "border-border/70 bg-background/50"} ${disabled ? "opacity-60" : ""}`,
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ClipboardPaste, { className: "size-5" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold", children: "Paste from Excel (Ctrl+V) or drop a file here" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "The import type is recognised from the header row. Nothing is saved until you approve." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              size: "sm",
              variant: "outline",
              className: "gap-1.5",
              disabled,
              onClick: () => fileRef.current?.click(),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileUp, { className: "size-3.5" }),
                " Choose file"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              ref: fileRef,
              type: "file",
              className: "hidden",
              accept: ".xlsx,.xls,.csv,.tsv,.txt",
              onChange: (e) => {
                const f = e.target.files?.[0];
                if (f) void readFile(f);
                e.currentTarget.value = "";
              }
            }
          )
        ] })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: !!choice, onOpenChange: (o) => !o && setChoice(null), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "sm:max-w-md", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Which import is this?" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "The header row matches more than one import. Pick the one you are updating." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-2", children: TILES.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          variant: "outline",
          className: "justify-start gap-2",
          onClick: () => {
            const text = choice?.text ?? "";
            setChoice(null);
            onDetected(t.kind, { text });
          },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(t.icon, { className: "size-4" }),
            " ",
            t.name
          ]
        },
        t.kind
      )) })
    ] }) })
  ] });
}
function istStamp(ms) {
  const d = new Date(ms + 5.5 * 36e5);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}-${months[d.getUTCMonth()]}-${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}
function sourceLabel(b) {
  const name = (b.fileName ?? "").trim();
  if (!name || /^pasted/i.test(name) || name === "Pasted data") {
    return `Pasted · ${b.rowsTotal} row${b.rowsTotal === 1 ? "" : "s"}`;
  }
  return name;
}
function UnifiedImportHistory() {
  const [bar, setBar] = reactExports.useState({ barKeys: ["kind", "status"], filters: [], match: "all" });
  const [search, setSearch] = reactExports.useState("");
  const [busy, setBusy] = reactExports.useState(null);
  const [conflicts, setConflicts] = reactExports.useState(null);
  const [reportBatch, setReportBatch] = reactExports.useState(null);
  const [viewBatch, setViewBatch] = reactExports.useState(null);
  const navigate = useNavigate();
  const batches = useQuery(api.imports.listImportBatches, { limit: 100 });
  const undoSaqsham = useMutation(api.imports.undoSaqshamBatch);
  const undoIa = useMutation(api.ia.undoIaBatch);
  const fields = reactExports.useMemo(
    () => [
      {
        key: "kind",
        label: "Type",
        type: "select",
        group: "Import",
        onThisPage: true,
        options: [
          { value: "saqsham", label: "SaQsham status" },
          { value: "ia", label: "Internal Assessment" }
        ]
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        group: "Import",
        onThisPage: true,
        options: [
          { value: "applied", label: "Applied" },
          { value: "undone", label: "Undone" }
        ]
      },
      {
        key: "by",
        label: "Imported by",
        type: "text",
        group: "Import"
      }
    ],
    []
  );
  const rowValue = (b, key) => {
    if (key === "kind") return b.kind;
    if (key === "status") return b.status;
    if (key === "by") return b.importedByName ?? "";
    return "";
  };
  const shown = (batches ?? []).filter((b) => {
    if (!rowPasses(bar.filters, bar.match, (key) => rowValue(b, key))) return false;
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return `${b.fileName} ${b.importedByName ?? ""}`.toLowerCase().includes(needle);
  });
  const runUndo = async (batchId, kind) => {
    setBusy(batchId);
    try {
      const res = kind === "ia" ? await undoIa({ batchId }) : await undoSaqsham({ batchId });
      const conflictCount = res.conflicts?.length ?? 0;
      if (conflictCount > 0) {
        setConflicts({
          batchId,
          rows: res.conflicts.map((c) => ({
            rowNo: c.rowNo,
            reason: c.reason
          }))
        });
        toast.warning(`Restored ${res.restored} row(s); ${conflictCount} skipped (edited since the import)`);
      } else {
        toast.success(`Import undone — ${res.restored} row(s) restored.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not undo the import");
    }
    setBusy(null);
  };
  if (batches === void 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-2 p-6 text-sm text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin" }),
      " Loading the import history…"
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap items-center gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative min-w-52 flex-1 sm:max-w-72", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      Input,
      {
        value: search,
        onChange: (e) => setSearch(e.target.value),
        placeholder: "Search a file or a user",
        className: "h-9 text-xs",
        "aria-label": "Search import history"
      }
    ) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      UniversalFilterBar,
      {
        pageKey: "bulkimport.history",
        fields,
        value: bar,
        onChange: setBar,
        summary: `Showing ${shown.length} of ${batches.length} imports`
      }
    ),
    shown.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "glass", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "p-6 text-sm text-muted-foreground", children: batches.length === 0 ? "No imports yet." : "No import matches the current filters." }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-auto rounded-xl border border-border/60", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full border-collapse text-xs", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "sticky top-0 bg-muted/95 backdrop-blur", children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: ["When", "By", "Type", "Source", "Result", "Status", ""].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "th",
        {
          className: "border-b border-border/60 px-3 py-2 text-left text-[10px] font-semibold tracking-wide text-muted-foreground uppercase",
          children: h
        },
        h
      )) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: shown.map((b) => {
        const parts = [
          b.rowsUpdated > 0 ? `${b.rowsUpdated} updated` : "",
          b.rowsNoChange > 0 ? `${b.rowsNoChange} unchanged` : "",
          b.rowsSkipped > 0 ? `${b.rowsSkipped} skipped` : "",
          b.rowsFailed > 0 ? `${b.rowsFailed} failed` : ""
        ].filter(Boolean);
        const undone = b.status === "undone";
        const nothingWritten = b.rowsUpdated === 0;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/40 align-top", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2 whitespace-nowrap tabular-nums", children: istStamp(b.importedAt) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2", children: b.importedByName ?? "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "secondary", className: "text-[10px] font-normal", children: b.kind === "ia" ? "Internal Assessment" : "SaQsham status" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "max-w-56 truncate px-3 py-2", "data-tip": b.fileName, children: sourceLabel(b) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2", children: parts.length ? parts.join(" · ") : "No change" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Badge,
            {
              variant: "secondary",
              className: undone ? "bg-muted text-muted-foreground" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
              children: undone ? "Undone" : "Applied"
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "ghost", className: "gap-1", onClick: () => setReportBatch(b._id), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-3.5" }),
              " Report"
            ] }),
            b.kind !== "ia" && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "ghost", className: "gap-1", onClick: () => setViewBatch(b._id), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "size-3.5" }),
              " View"
            ] }),
            b.rowsUpdated > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                size: "sm",
                variant: "ghost",
                className: "gap-1",
                onClick: () => navigate(`/facilities?upd=any&updbatch=${encodeURIComponent(String(b._id))}`),
                children: "View facilities"
              }
            ),
            undone ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground", children: "Undo unavailable: already undone" }) : nothingWritten ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground", children: "Undo unavailable: nothing was written" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Button,
              {
                size: "sm",
                variant: "outline",
                className: "gap-1",
                "data-tip": "Rows edited after the import are skipped as conflicts",
                disabled: busy === String(b._id),
                onClick: () => void runUndo(String(b._id), b.kind),
                children: [
                  busy === String(b._id) ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-3.5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Undo2, { className: "size-3.5" }),
                  "Undo"
                ]
              }
            )
          ] }) })
        ] }, b._id);
      }) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: !!conflicts, onOpenChange: (o) => !o && setConflicts(null), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "glass-strong sm:max-w-lg", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Some rows could not be undone" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "These facilities were edited after the import, so restoring them would lose that edit. They were skipped." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "max-h-64 space-y-1 overflow-auto text-xs", children: conflicts?.rows.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
        "Row ",
        c.rowNo,
        ": ",
        c.reason
      ] }, c.rowNo)) })
    ] }) }),
    reportBatch && (() => {
      const batch = batches.find((b) => b._id === reportBatch);
      if (!batch) return null;
      const commonProps = {
        batchId: reportBatch,
        fileName: sourceLabel(batch),
        importedByName: batch.importedByName ?? "",
        summary: {
          updated: batch.rowsUpdated,
          noChange: batch.rowsNoChange,
          skipped: batch.rowsSkipped,
          failed: batch.rowsFailed
        },
        onDone: () => {
          setReportBatch(null);
          toast.success("Report downloaded");
        },
        onError: (message) => {
          setReportBatch(null);
          toast.error(message);
        }
      };
      return batch.kind === "ia" ? /* @__PURE__ */ jsxRuntimeExports.jsx(IaBatchReportWorker, { ...commonProps }) : /* @__PURE__ */ jsxRuntimeExports.jsx(SaqshamReportLoader, { ...commonProps });
    })(),
    /* @__PURE__ */ jsxRuntimeExports.jsx(SaqshamReportDialog, { batchId: viewBatch, onClose: () => setViewBatch(null) })
  ] });
}
function SaqshamReportLoader(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(BatchReportWorker, { ...props });
}
function FacilityCsvImport({ initialCsv = "" }) {
  const [csv, setCsv] = reactExports.useState(initialCsv);
  const [busy, setBusy] = reactExports.useState(false);
  const [result, setResult] = reactExports.useState(null);
  const importMutation = useMutation(api.ops.bulkImportFacilitiesV2);
  const seedNocDates = useMutation(api.nocSeed.seedNocIssueDates);
  useQuery(api.ops.listFacilityRowsFast, {});
  reactExports.useEffect(() => {
    if (initialCsv) setCsv(initialCsv);
  }, [initialCsv]);
  const handleFile = (file) => {
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result ?? ""));
    reader.readAsText(file);
  };
  const runImport = async () => {
    if (!csv.trim()) {
      toast.error("Paste CSV content or choose a file first");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await importMutation({ csv });
      try {
        const noc = await seedNocDates({ csv });
        if (noc.seeded > 0)
          toast.success(`Imported ${res.created} of ${res.total} rows · seeded ${noc.seeded} NOC issue date(s)`);
        else toast.success(`Imported ${res.created} of ${res.total} rows`);
      } catch {
        toast.success(`Imported ${res.created} of ${res.total} rows`);
      }
      setResult(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    }
    setBusy(false);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 lg:grid-cols-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass rounded-xl p-4 lg:col-span-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex flex-wrap items-center justify-between gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "CSV content" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: runImport, disabled: busy || !csv.trim(), className: "gap-2", children: [
            busy ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "size-4" }),
            "Import Facilities"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "glass-input inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(FileUp, { className: "size-4" }),
            "Choose file",
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "file",
                accept: ".csv,.txt,.tsv",
                className: "hidden",
                onChange: (e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }
              }
            )
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Textarea,
        {
          className: "min-h-56 font-mono text-xs",
          value: csv,
          onChange: (e) => setCsv(e.target.value),
          placeholder: "Paste CSV content here — the first row must be the header"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-xs text-muted-foreground", children: "First row must be a header. NIN Number is the only duplicate key; missing blocks are created automatically." }),
      result && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-strong mt-4 rounded-lg p-3 text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "font-medium", children: [
          "Imported ",
          result.created,
          " of ",
          result.total,
          " rows",
          result.skippedDuplicates ? ` · ${result.skippedDuplicates} duplicate(s) skipped` : "",
          result.skippedJunk ? ` · ${result.skippedJunk} template row(s) ignored` : "",
          result.errors.length > 0 ? ` · ${result.errors.length} line(s) need attention` : ""
        ] }),
        result.headers && result.headers.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-xs text-muted-foreground", children: [
          "Detected columns: ",
          result.headers.filter(Boolean).join(", ")
        ] }),
        result.errors.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-2 max-h-40 list-disc space-y-1 overflow-auto pl-5 text-xs text-destructive", children: result.errors.map((e, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: e }, i)) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass rounded-xl p-4 text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-2 font-medium", children: "Notes" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "list-disc space-y-2 pl-5 text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "NIN Number is the only duplicate key. Re-importing the same file is safe." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Missing blocks are created automatically." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Entry users only import into their assigned blocks; other rows are reported." })
      ] })
    ] })
  ] });
}
function tabFromQuery(value) {
  return value === "mapping" || value === "history" ? value : "import";
}
function BulkImport({
  initialKind = null
}) {
  const listRows = useQuery(api.ops.listFacilityRowsFast, {});
  const batches = useQuery(api.imports.listImportBatches, { limit: 100 });
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const role = listRows?.me.appRole;
  const loading = listRows === void 0;
  const canImport = loading || role === "admin" || role === "entry";
  const isAdmin = role === "admin";
  const [tab, setTab] = reactExports.useState(() => tabFromQuery(searchParams.get("tab")));
  const [mappingFocus, setMappingFocus] = reactExports.useState("");
  const [active, setActive] = reactExports.useState(initialKind);
  const [source, setSource] = reactExports.useState(null);
  const [runId, setRunId] = reactExports.useState(0);
  reactExports.useEffect(() => {
    setTab(tabFromQuery(searchParams.get("tab")));
  }, [searchParams]);
  reactExports.useEffect(() => {
    if (listRows && !canImport) {
      setActive(null);
      setSource(null);
    }
  }, [canImport, listRows]);
  const changeTab = (next) => {
    setTab(next);
    const params = new URLSearchParams(searchParams);
    if (next === "import") params.delete("tab");
    else params.set("tab", next);
    setSearchParams(params, { replace: true });
  };
  const openMapping = (portal) => {
    setMappingFocus(portal);
    changeTab("mapping");
  };
  const open = (kind, next = null) => {
    if (!canImport) {
      toast.error("Bulk Import is available to the State Admin and District Editors only");
      return;
    }
    if (kind === "facility-master" && !isAdmin) {
      toast.error("The facility master import is available to the State Admin only");
      return;
    }
    if (kind === "links") {
      navigate("/links?import=1");
      return;
    }
    setActive(kind);
    setSource(next);
    setRunId((n) => n + 1);
  };
  const lastLine = (kind) => {
    const l = (batches ?? []).find((b) => b.kind === kind);
    if (!l) return "Last import: none yet";
    const d = new Date(l.importedAt).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
    return `Last import ${d}${l.rowsUpdated ? ` · ${l.rowsUpdated} rows` : ""}`;
  };
  const activeTile = TILES.find((t) => t.kind === active) ?? null;
  const wizardOpen = active !== null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    AppShell,
    {
      title: "Bulk Import",
      subtitle: "Update many facilities at once, or keep the portal status mapping current. Nothing is saved until you approve.",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Tabs,
        {
          value: tab,
          onValueChange: (value) => {
            if (value !== "mapping") setMappingFocus("");
            changeTab(value);
          },
          className: "space-y-4",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, { className: "grid h-auto w-full max-w-md grid-cols-3 gap-1 p-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, { value: "import", className: "gap-1.5 text-xs sm:text-sm", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "size-3.5" }),
                " Import"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, { value: "mapping", className: "gap-1.5 text-xs sm:text-sm", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(ListChecks, { className: "size-3.5" }),
                " Status mapping"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, { value: "history", className: "gap-1.5 text-xs sm:text-sm", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(History, { className: "size-3.5" }),
                " History",
                batches?.length ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-muted px-1.5 text-[10px] tabular-nums", children: batches.length }) : null
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "import", className: "mt-0 space-y-4", children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-2 p-6 text-sm text-muted-foreground", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin" }),
              " Loading Bulk Import…"
            ] }) : !canImport ? /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "glass max-w-lg", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "flex items-start gap-3 p-6 text-sm text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Import is available to the State Admin and District Editors only. You can still view Status mapping and History." }) }) }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              !wizardOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(SmartAddBox, { onDetected: (kind, src) => open(kind, src), disabled: !canImport }),
              !wizardOpen ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-3 lg:grid-cols-4", children: TILES.filter((t) => t.kind !== "facility-master" || isAdmin).map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "glass", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "flex h-full flex-col gap-2 p-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `flex size-8 items-center justify-center rounded-lg ${t.tone}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(t.icon, { className: "size-4" }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "min-w-0 flex-1 text-sm font-semibold", children: t.name })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: t.blurb }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] font-medium text-muted-foreground", children: t.kind === "facility-master" ? `${listRows?.rows.length ?? "…"} facilities in the master list` : t.kind === "links" ? "Open the register · paste or upload the sheet" : lastLine(t.kind) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-auto flex flex-wrap items-center gap-2 pt-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", className: "gap-1.5", onClick: () => open(t.kind), children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "size-3.5" }),
                    " Start import"
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TemplateMenu,
                    {
                      kind: t.kind,
                      label: t.template,
                      rows: listRows?.rows ?? []
                    }
                  )
                ] })
              ] }) }, t.kind)) }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: "Importing:" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-semibold", children: activeTile?.name }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Button,
                  {
                    size: "sm",
                    variant: "ghost",
                    className: "ml-auto gap-1",
                    onClick: () => {
                      setActive(null);
                      setSource(null);
                    },
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3.5" }),
                      " Change import type"
                    ]
                  }
                )
              ] }),
              active === "saqsham" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                SaqshamImportWizard,
                {
                  initialText: source?.text ?? null,
                  initialFile: source?.file ?? null,
                  onOpenList: () => navigate("/facilities"),
                  onOpenHistory: () => changeTab("history"),
                  onOpenMapping: openMapping
                },
                `saqsham-${runId}`
              ),
              active === "ia" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                IaImportWizard,
                {
                  initialText: source?.text ?? null,
                  initialFile: source?.file ?? null,
                  onOpenList: () => navigate("/facilities")
                },
                `ia-${runId}`
              ),
              isAdmin && active === "facility-master" && /* @__PURE__ */ jsxRuntimeExports.jsx(FacilityCsvImport, { initialCsv: source?.text ?? "" }, `master-${runId}`)
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "mapping", className: "mt-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SaqshamMappingPanel, { initialSearch: mappingFocus }, mappingFocus || "status-mapping") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "history", className: "mt-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(UnifiedImportHistory, {}) })
          ]
        }
      )
    }
  );
}
function TemplateMenu({
  kind,
  label,
  rows
}) {
  const run = (fn) => {
    void Promise.resolve(fn()).catch(() => toast.error("Could not build the template"));
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "outline", className: "gap-1.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-3.5" }),
      " ",
      label
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "start", className: "w-60", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuLabel, { children: "Download a template" }),
      kind === "saqsham" && /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuItem, { onClick: () => run(downloadSampleFile), children: "SaQsham sample (rows + headers)" }),
      kind === "ia" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DropdownMenuItem,
          {
            onClick: () => run(() => downloadIaQuarterTemplate("2026-27", 2, [])),
            children: "Quarter template (blank, current quarter)"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DropdownMenuItem,
          {
            onClick: () => run(() => downloadIaQuarterTemplate("2026-27", 2, rows)),
            children: "Quarter template (every facility pre-filled)"
          }
        )
      ] }),
      kind === "links" && /* @__PURE__ */ jsxRuntimeExports.jsx(
        DropdownMenuItem,
        {
          onClick: () => run(() => downloadLinksTemplate({
            categories: DEFAULT_LINK_CATEGORIES.map((c) => c.name),
            owners: [...DEFAULT_LINK_OWNERS],
            statuses: DEFAULT_LINK_STATUSES,
            frequencies: DEFAULT_LINK_FREQUENCIES,
            fileName: "Links Organiser template"
          })),
          children: "Links Organiser template"
        }
      ),
      kind === "facility-master" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DropdownMenuItem,
          {
            onClick: () => run(() => downloadMasterTemplate("blank", [], masterImportLists(rows), "NQAS Tracker")),
            children: "Blank template"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DropdownMenuItem,
          {
            onClick: () => run(() => downloadMasterTemplate("current", rows, masterImportLists(rows), "NQAS Tracker")),
            children: "Current data"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuItem, { onClick: () => downloadMasterCsvTemplate(masterImportLists(rows)), children: "CSV template" })
      ] })
    ] })
  ] });
}

export { BulkImport as default };
