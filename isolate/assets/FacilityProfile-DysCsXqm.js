import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, I as Info, m as Check, A as ArrowRight, i as TrendingUp, a7 as Pencil, X as History, H as ChevronDown, T as TriangleAlert, k as Clock3, c2 as CalendarDays, p as Lock, a6 as Sparkles, $ as Target, ay as Link2, ab as Undo2, aq as Copy, c8 as CalendarPlus, w as RotateCcw, a4 as Printer, c9 as EllipsisVertical, a3 as X, ar as Trash2, ca as ArrowLeft, J as ClipboardList, L as LoaderCircle, n as IndianRupee, o as Flame, b7 as Wrench, F as FileSpreadsheet, aW as Funnel, a2 as Download, u as FileText, Y as Plus } from './icons-BxQpodNr.js';
import { t as toast, c as cn, B as Button, u as useAuth, l as useQuery, j as api, h as Card, f as CardContent, n as useParams, b as useNavigate, m as useMutation, d as useSearchParams, L as Link, i as CardHeader, C as CardTitle } from './index-CBV6wOh8.js';
import { v as buildIaMasterIndex, w as withLegacyIa, d8 as facilityIaPair, cG as attachIaExtras, cA as departmentsForFacility, cy as deriveFireNocStatus, b as toDisplayDate, e as Popover, f as PopoverTrigger, g as PopoverContent, cX as isResultDeclaredStatus, p as docStageLabel, d9 as toLongDisplayDate, D as DEFAULT_SETTINGS, cf as computeDerivedNqas, A as AppShell, t as toDisplayDateTime, cI as openPrintSheet } from './AppShell-CP099uvN.js';
import { S as StatusBadge } from './StatusBadge-BPGGn135.js';
import { B as Badge } from './badge-Cc2gQHFR.js';
import { l as loadLastListUrl, F as FieldGrid } from './FacilityList-Dm-USj3q.js';
import { A as AttachmentPicker, a as AttachmentLink } from './AttachmentPicker-B8WtH0vb.js';
import { I as Input } from './input-Cy2oZLur.js';
import { L as Label } from './label-BaPkqXdo.js';
import { T as Textarea } from './textarea-Dm9kSFQo.js';
import { T as Tabs, a as TabsList, b as TabsTrigger, c as TabsContent } from './tabs-siU4Pie8.js';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from './select-qTILnHQg.js';
import { D as Dialog, a as DialogContent, b as DialogHeader, c as DialogTitle, d as DialogDescription, e as DialogFooter } from './dialog-BW3GEiPg.js';
import { A as AlertDialog, h as AlertDialogTrigger, a as AlertDialogContent, b as AlertDialogHeader, c as AlertDialogTitle, d as AlertDialogDescription, e as AlertDialogFooter, f as AlertDialogCancel, g as AlertDialogAction } from './alert-dialog-CzPxJ0pO.js';
import { t as todayLocalIso, d as deriveFireNocStatus$1 } from './today-D9v8Esj5.js';
import { T as TAB_BY_STAGE, g as getLifecycleState, p as profileCompleteness, t as toDdMmmYyyy } from './facilityProfileState-D76_z1Ay.js';
import { g as StatusChip, T as TONE_HEX, h as ToneIcon, j as ToneBar, I as IaCardSkeleton, k as IACard, l as DocumentStatusCard, C as CycleHistoryPanel } from './FacilityQuickView-D07vvNqK.js';
import { D as DropdownMenu, a as DropdownMenuTrigger, b as DropdownMenuContent, c as DropdownMenuLabel, g as DropdownMenuSeparator, f as DropdownMenuItem } from './dropdown-menu-N0nU9bdA.js';
import { S as Skeleton } from './skeleton-D-jVDmpg.js';
import { b as buildProfileExportData, a as exportProfileExcel, c as exportExcelWorkbook, i as istStamp } from './profileExport-Da96eYWE.js';
import { D as DateInput } from './DateInput-DZAT80St.js';
import { p as parseScore, m as scoreTone$1, d as dmy, n as validateSaDraft, S as SA_SECTIONS, o as SA_FIELDS, t as validateNqasDraft, N as NQAS_SECTIONS, w as NQAS_FIELDS, x as needsAttention, y as sectionSummaries, z as nextSurveillance, A as dueChip, B as formatInr } from './facilityQuickView-BCxVjMPj.js';
import { D as DocumentSlot } from './DocumentSlot-DLNae2Gb.js';
import { t as todayIsoIST, a as addDays, b as dateRuleError } from './dateInput-0KZh0HdG.js';
import { a as phoneError, m as maskPhone, n as normalizePhone } from './phone-C-n0eG_z.js';
import { a as visitLinkAvailability, c as copyScheduleToVisit } from './scheduleVisit-DGvqEZ_U.js';
import './vendor-jspdf-BarNdCns.js';
import './vendor-charts--qXk384P.js';
import './NqasLogo-CIWlMexW.js';
import './shareLink-_K-oJu5R.js';
import './UniversalFilterBar-uuD2kW1Y.js';
import './masterFilter-DrauVhuN.js';
import './FilterDropdown-B_vJKp6C.js';
import './filters-BlRAASYu.js';
import './masterGrid-CjX4ti61.js';
import './ExportDialog-Dhw8AWo1.js';
import './index-BALjev1w.js';
import './FacilityCell-CI45DpPw.js';
import './FacilityTypeBadge-8G3otPEU.js';
import './checkbox-CjOYMc2v.js';
import './masterExport-Dlb4N-po.js';
import './org-DjtYn14q.js';
import './facilitySheet-LEzrIYOJ.js';
import './scoreBands-CA46Kez8.js';
import './buildingBuckets-CQds7ysI.js';
import './tableDisplay-Bmg1sKyc.js';
import './PageShell-CaOvGLdi.js';
import './PdfCanvasViewer-C0MZuH_2.js';
import './DocumentField-4d87_sVm.js';
import './SaveBar--TNBfs1X.js';
import './vendor-exceljs-CqnmHTS6.js';
import './LazyResultReadDialog-BIkWLeOK.js';

class SaveError extends Error {
  requestId;
  constructor(failure) {
    super(`Could not save: ${failure.reason} (ref ${failure.requestId})`);
    this.name = "SaveError";
    this.requestId = failure.requestId;
  }
}
function isSaveFailure(value) {
  return !!value && typeof value === "object" && value.ok === false && typeof value.reason === "string" && typeof value.requestId === "string";
}
function throwIfSaveFailed(result) {
  if (isSaveFailure(result)) throw new SaveError(result);
}
function clientRef() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
function saveErrorText(error) {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const clean = raw.replace(/\[CONVEX[^\]]*\]\s*/gi, "").replace(/\[Request ID:[^\]]*\]\s*/gi, "").replace(/^Uncaught Error:\s*/i, "").replace(/^Server Error\s*/i, "").replace(/\s+/g, " ").trim();
  if (/^Could not save: .+\(ref [A-Z0-9]+\)$/i.test(clean)) return clean;
  return `Could not save: ${clean || "The change did not reach the server. Please try again."} (ref ${clientRef()})`;
}
function showSaveError(error) {
  const message = saveErrorText(error);
  toast.error(message, {
    duration: 12e3,
    action: {
      label: "Copy",
      onClick: () => void navigator.clipboard?.writeText(message)
    }
  });
  return message;
}

function LifecycleStepper({
  state,
  onJump,
  ctaDisabled
}) {
  const [ruleOpen, setRuleOpen] = reactExports.useState(false);
  const currentIndex = state.stageIndex - 1;
  const total = state.stages.length;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      "aria-label": "Certification lifecycle",
      className: "glass mb-4 rounded-xl border border-border/60 p-4",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-start justify-between gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-base font-semibold text-foreground", children: "Certification lifecycle" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-0.5 text-xs text-muted-foreground", children: [
                "Stage ",
                state.stageIndex,
                " of ",
                total,
                " · the chip, these steps and the next action all come from one lifecycle rule"
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => setRuleOpen((v) => !v),
                "aria-expanded": ruleOpen,
                "aria-label": "How the current stage is derived",
                className: "mt-0.5 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none print:hidden",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { className: "size-4" })
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(StatusChip, { label: state.chip.label, tone: state.chip.tone, size: "md" })
        ] }),
        ruleOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 space-y-1 rounded-lg border border-border/60 bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-foreground", children: "The rule behind the stage" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Order: eligibility → Internal Assessment → State Assessment → NQAS Assessment → certification → surveillance → recertification. A Deferred result has no stage of its own: the facility restarts this order after its cooling period." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
            "The stepper takes the ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "earlier" }),
            " of two readings — the stage derived from the assessment records and the stage derived from the status text — so an NQAS schedule alone can never outrank an untouched State Assessment. This facility reads",
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: state.chip.label }),
            " at stage ",
            state.stageIndex,
            "."
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ol", { className: "mt-3 grid gap-1.5 sm:flex sm:flex-wrap print:flex print:flex-wrap", children: state.stages.map((stage, i) => {
          const active = stage.state === "current";
          const done = stage.state === "done";
          const dateInfo = state.stageDates[stage.key];
          const tab = TAB_BY_STAGE[stage.key];
          return /* @__PURE__ */ jsxRuntimeExports.jsx("li", { className: "min-w-0 sm:flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              "aria-current": active ? "step" : void 0,
              "aria-label": `Step ${i + 1} of ${total}: ${stage.label} — ${active ? "current stage" : done ? "completed" : "not reached"}`,
              onClick: () => onJump?.(tab),
              className: cn(
                "flex h-full w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                active ? "border-transparent text-white shadow-sm" : done ? "border-border/60 bg-muted/40 hover:bg-muted" : "border-dashed border-border/60 hover:bg-muted/40"
              ),
              style: active ? { background: TONE_HEX[state.chip.tone] } : void 0,
              "data-tip": `${stage.label}${dateInfo?.date ? ` · ${dateInfo.date}` : ""}`,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    className: cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                      active ? "bg-white/25 text-white" : done ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground",
                      active && "animate-pulse"
                    ),
                    children: done ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3" }) : i + 1
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "span",
                    {
                      className: cn(
                        "block text-xs leading-tight font-medium",
                        !active && !done && "text-muted-foreground"
                      ),
                      children: stage.label
                    }
                  ),
                  dateInfo?.date && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "span",
                    {
                      className: cn(
                        "block text-[11px] leading-tight",
                        active ? "text-white/85" : "text-muted-foreground"
                      ),
                      children: dateInfo.date
                    }
                  )
                ] })
              ]
            }
          ) }, stage.key);
        }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-sky-300/60 bg-sky-50/70 px-3 py-2 text-sm dark:border-sky-400/30 dark:bg-sky-500/10", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-300" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "min-w-0 flex-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Next action:" }),
            " ",
            state.nextAction.text
          ] }),
          state.nextAction.cta && state.nextAction.targetTab && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              disabled: ctaDisabled,
              onClick: () => onJump?.(state.nextAction.targetTab),
              className: "rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 print:hidden",
              children: state.nextAction.cta
            }
          )
        ] }),
        currentIndex >= 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-xs text-muted-foreground", children: "Tip: click any step to jump to the tab that maintains it." })
      ]
    }
  );
}

const str = (v) => {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};
const num = (v) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
function masterRowFromProfile(input) {
  const f = input.facility;
  const currentCycleNumber = num(f.currentCycleNumber);
  const cycles = [...input.cycles ?? []].sort(
    (a, b) => a.cycle.cycleNumber - b.cycle.cycleNumber
  );
  const active = (currentCycleNumber ? cycles.find((c) => c.cycle.cycleNumber === currentCycleNumber) : void 0) ?? cycles.find((c) => !c.cycle.superseded) ?? cycles[cycles.length - 1] ?? null;
  const sa = active?.sa ?? null;
  const nqas = active?.nqas ?? null;
  const funds = [...input.funds ?? []].sort(
    (a, b) => String(b.financialYear ?? "").localeCompare(String(a.financialYear ?? ""))
  );
  const nocs = [...input.nocs ?? []].sort(
    (a, b) => String(b.expiryDate ?? "").localeCompare(String(a.expiryDate ?? ""))
  );
  const fund = funds[0] ?? null;
  const noc = nocs[0] ?? null;
  const building = (input.buildings ?? [])[0] ?? null;
  const today = input.today ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const lead = input.fireNocAlertLeadDays == null ? void 0 : Number(input.fireNocAlertLeadDays);
  const iaRows = input.iaQuarters ?? [];
  let iaq = void 0;
  {
    const index = buildIaMasterIndex(
      iaRows.map(
        (r) => ({
          facilityId: String(f._id),
          fy: r.fy,
          quarter: r.quarter,
          nqasIaScore: r.nqasIaScore ?? null,
          kayakalpIaScore: r.kayakalpIaScore ?? null,
          ecoFriendlyScore: r.ecoFriendlyScore ?? null,
          nqasRemark: r.nqasRemark ?? null,
          kayakalpRemark: r.kayakalpRemark ?? null,
          ecoRemark: r.ecoRemark ?? null,
          lockedAt: r.lockedAt ?? null,
          updatedAt: r.updatedAt ?? 0
        })
      )
    );
    withLegacyIa(index, [
      {
        id: String(f._id),
        nqasIaQ1: num(f.nqasIaQ1),
        kayakalpIaQ1: num(f.kayakalpIaQ1),
        nqasIaQ2: num(f.nqasIaQ2),
        kayakalpIaQ2: num(f.kayakalpIaQ2)
      }
    ]);
    const pair = facilityIaPair(index, String(f._id));
    if (pair) iaq = attachIaExtras(String(f._id), index, pair);
  }
  const docFiles = {};
  const docRequirements = {};
  const docKeys = /* @__PURE__ */ new Set();
  for (const d of input.documents ?? []) {
    docKeys.add(d.key === "NQAS_Certificate" ? "NQAS_Result" : d.key);
    if (d.originalName && d.uploadedAt != null) {
      docFiles[d.key] = { name: d.originalName, uploadedAt: d.uploadedAt };
    }
    if (d.requirement) docRequirements[d.key] = d.requirement;
  }
  if (!input.documents) {
    if (str(nqas?.resultDocumentName)) docKeys.add("NQAS_Result");
    if (str(sa?.reportAttachmentName)) docKeys.add("SA_Report");
    if (str(sa?.checklistAttachmentName)) docKeys.add("SA_Checklist");
    if (str(fund?.procLink) || str(fund?.attachmentName)) docKeys.add("Gap_Closure");
    if (str(building?.condemnedLink) || str(building?.condemnedAttachmentName)) docKeys.add("Condemned");
    if (str(noc?.attachmentName) || str(noc?.nocLink)) docKeys.add("NOC");
  }
  const departmentOptions = departmentsForFacility(
    input.facility.facilityType,
    [
      "OPD",
      "Labour Room",
      "OT",
      "Lab",
      "Pharmacy",
      "Emergency",
      "Ward",
      "Immunization"
    ]
  );
  return {
    facility: {
      ...f,
      _id: String(f._id),
      name: str(f.name) ?? "",
      block: str(f.block) ?? "",
      phc: str(f.phc) ?? "",
      facilityType: str(f.facilityType) ?? "",
      ninNumber: str(f.ninNumber),
      eligibility: str(f.eligibility),
      currentStatus: str(f.currentStatus),
      remarks: str(f.remarks),
      updatedAt: num(f.updatedAt)
    },
    cycleNumber: active?.cycle.cycleNumber ?? null,
    cycleType: active?.cycle.cycleType ?? null,
    resultDocumentName: str(nqas?.resultDocumentName),
    resultDocumentUpdatedAt: num(nqas?.resultDocumentUpdatedAt),
    recertStage: active?.cycle?.recertStage ?? null,
    iaq,
    sa: sa ? {
      status: str(sa.status),
      scheduledDate: str(sa.scheduledDate),
      revisedDate: str(sa.revisedDate),
      actualStartDate: str(sa.actualStartDate),
      actualEndDate: str(sa.actualEndDate),
      scorePercent: num(sa.scorePercent),
      generalDocStatus: str(sa.generalDocStatus),
      assessor1Name: str(sa.assessor1Name),
      assessor1Hud: str(sa.assessor1Hud) ?? str(sa.assessorHud),
      assessor2Name: str(sa.assessor2Name),
      assessor2Hud: str(sa.assessor2Hud),
      reportAttachmentId: str(sa.reportAttachmentId),
      reportAttachmentName: str(sa.reportAttachmentName),
      checklistAttachmentId: str(sa.checklistAttachmentId),
      checklistAttachmentName: str(sa.checklistAttachmentName)
    } : null,
    nqas: nqas ? {
      status: str(nqas.status),
      scheduledStartDate: str(nqas.scheduledStartDate),
      scheduledEndDate: str(nqas.scheduledEndDate),
      actualEndDate: str(nqas.actualEndDate),
      mode: str(nqas.mode),
      departments: Array.isArray(nqas.departments) ? nqas.departments : null,
      departmentOptions,
      departmentsTotal: departmentOptions.length,
      scorePercent: num(nqas.scorePercent),
      certificationStatus: str(nqas.certificationStatus),
      certificationDate: str(nqas.certificationDate),
      goiLetterDate: str(nqas.goiLetterDate),
      validityDate: str(nqas.validityDate),
      surveillanceDue1: str(nqas.surveillanceDue1),
      surveillanceDone1: str(nqas.surveillanceDone1),
      surveillanceDue2: str(nqas.surveillanceDue2),
      surveillanceDone2: str(nqas.surveillanceDone2),
      manualScore: num(nqas.manualScore),
      recertStatus: str(nqas.manualRecertStatus),
      recertYear: num(nqas.recertYear)
    } : null,
    docs: {
      uploaded: docKeys.size,
      total: 6,
      keys: [...docKeys],
      files: Object.keys(docFiles).length ? docFiles : null,
      requirements: Object.keys(docRequirements).length ? docRequirements : null,
      requiredMissing: input.requiredMissing ?? []
    },
    fund: fund ? {
      amountSanctioned: num(fund.amountSanctioned),
      amountReleased: num(fund.amountReleased),
      amountUtilized: num(fund.amountUtilized),
      financialYear: str(fund.financialYear),
      procLink: str(fund.procLink),
      fundAttachmentId: str(fund.attachmentId),
      fundAttachmentName: str(fund.attachmentName),
      updatedAt: num(fund.updatedAt),
      status: str(fund.status)
    } : null,
    noc: noc ? {
      nocAvailable: str(noc.nocAvailable),
      status: deriveFireNocStatus(
        str(noc.nocAvailable),
        str(noc.expiryDate),
        str(noc.status),
        today,
        lead
      ),
      issuedDate: str(noc.issuedDate),
      expiryDate: str(noc.expiryDate),
      nocLink: str(noc.nocLink),
      nocAttachmentId: str(noc.attachmentId),
      nocAttachmentName: str(noc.attachmentName),
      updatedAt: num(noc.updatedAt)
    } : null,
    building: building ? {
      buildingType: str(building.buildingType),
      buildingStatus: str(building.buildingStatus),
      lastUpdatedAt: num(building.lastUpdatedAt),
      condemnedLink: str(building.condemnedLink),
      condemnedAttachmentId: str(building.condemnedAttachmentId),
      condemnedAttachmentName: str(building.condemnedAttachmentName)
    } : null
  };
}

function RingGauge({
  daysLeft,
  totalDays,
  size = 56
}) {
  const pct = daysLeft == null || totalDays == null || totalDays <= 0 ? 0 : Math.max(0, Math.min(1, daysLeft / totalDays));
  const tone = daysLeft == null ? "grey" : daysLeft < 0 ? "red" : daysLeft <= 90 ? "amber" : "green";
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "relative inline-flex shrink-0 items-center justify-center", style: { width: size, height: size }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: size, height: size, role: "img", "aria-label": daysLeft == null ? "No certificate validity recorded" : `${daysLeft} days of validity left`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: size / 2, cy: size / 2, r, fill: "none", strokeWidth: stroke, className: "stroke-muted" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "circle",
        {
          cx: size / 2,
          cy: size / 2,
          r,
          fill: "none",
          strokeWidth: stroke,
          strokeLinecap: "round",
          strokeDasharray: `${c * pct} ${c}`,
          stroke: TONE_HEX[tone],
          className: "motion-reduce:transition-none",
          transform: `rotate(-90 ${size / 2} ${size / 2})`
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute text-center text-[10px] leading-tight font-bold tabular-nums", children: daysLeft == null ? /* @__PURE__ */ jsxRuntimeExports.jsx(ToneIcon, { tone: "grey", className: "size-3.5" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      daysLeft < 0 ? `${Math.abs(daysLeft)}d` : daysLeft,
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[8px] font-medium text-muted-foreground", children: daysLeft < 0 ? "expired" : "days" })
    ] }) })
  ] });
}
function NeedsAttentionPanel({
  items,
  onFix
}) {
  if (items.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "section",
      {
        "aria-label": "Needs attention",
        className: "glass rounded-xl border border-emerald-300/60 bg-emerald-500/5 p-4",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-4" }),
            " Nothing needs attention"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: "No contradictory statuses, missing documents or overdue visits on this facility." })
        ]
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      "aria-label": "Needs attention",
      className: "glass rounded-xl border border-border/60 p-4",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm font-semibold", children: [
            "Needs attention",
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-1.5 font-normal text-muted-foreground", children: [
              "— ",
              items.length,
              " item",
              items.length === 1 ? "" : "s"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: "Checked on every load" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-3 space-y-2", children: items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "li",
          {
            className: cn(
              "flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3",
              item.severity === "danger" && "border-rose-300/70 bg-rose-500/5",
              item.severity === "warning" && "border-amber-300/70 bg-amber-500/5",
              item.severity === "info" && "border-sky-300/60 bg-sky-500/5"
            ),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-start gap-2.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  ToneIcon,
                  {
                    tone: item.severity === "danger" ? "red" : item.severity === "warning" ? "amber" : "blue",
                    className: "mt-0.5 size-4"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm leading-snug font-semibold", children: item.title }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-xs leading-snug text-muted-foreground", children: item.detail })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Button,
                {
                  type: "button",
                  size: "sm",
                  variant: item.severity === "danger" ? "default" : "outline",
                  className: "min-h-11 shrink-0 gap-1",
                  onClick: () => onFix(item.tab, item.focus),
                  children: [
                    item.fixLabel,
                    " ",
                    /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "size-3.5" })
                  ]
                }
              )
            ]
          },
          item.id
        )) })
      ]
    }
  );
}
function SectionSummaryCard({
  summary,
  onEdit
}) {
  const pct = Math.round(summary.filled / Math.max(1, summary.total) * 100);
  const tone = pct === 100 ? "green" : pct >= 50 ? "blue" : "amber";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { className: "glass flex flex-col rounded-xl border border-border/60 p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex items-start justify-between gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold", children: summary.title }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-0.5 text-xs text-muted-foreground", children: [
          summary.filled,
          " of ",
          summary.total,
          " fields filled"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatusChip, { label: summary.chip.label, tone: summary.chip.tone })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("dl", { className: "mt-3 grid flex-1 gap-1.5", children: summary.rows.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline justify-between gap-2 text-xs", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "shrink-0 text-muted-foreground", children: r.label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "min-w-0 truncate text-right font-medium tabular-nums", "data-tip": r.value, "data-tip-truncate": true, children: r.value })
    ] }, r.label)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(ToneBar, { value: pct, tone, className: "mt-3" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Button,
      {
        type: "button",
        variant: "ghost",
        size: "sm",
        className: "mt-2 w-full justify-start gap-1.5 text-primary",
        onClick: () => onEdit(summary.tab),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "size-3.5" }),
          " Edit ",
          summary.title
        ]
      }
    )
  ] });
}
function relativeTime(ts, now = Date.now()) {
  const mins = Math.round((now - ts) / 6e4);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return toDisplayDate(new Date(ts).toISOString().slice(0, 10));
}
const ACTIVITY_SECTIONS = {
  facilities: "Facility",
  stateAssessments: "State Assessment",
  nationalAssessments: "NQAS Assessment",
  certificationCycles: "Cycle",
  gapClosureFunds: "Gap Closure",
  fireNocs: "Fire NOC",
  buildingDetails: "Building",
  facilityDocuments: "Documents",
  facilityIaQuarters: "Internal Assessment"
};
function RecentActivity({
  audits,
  onViewAll
}) {
  const { user } = useAuth();
  const storageKey = `nqas.recentActivity.open:${user?._id ?? "anon"}`;
  const [open, setOpen] = reactExports.useState(() => {
    try {
      return localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });
  const [section, setSection] = reactExports.useState("all");
  const toggle = () => {
    setOpen((v) => {
      try {
        localStorage.setItem(storageKey, v ? "0" : "1");
      } catch {
      }
      return !v;
    });
  };
  const sections = reactExports.useMemo(
    () => [...new Set(audits.map((a) => a.table).filter((t) => !!t))],
    [audits]
  );
  const recent = reactExports.useMemo(
    () => audits.filter((a) => section === "all" || a.table === section).slice(0, 10),
    [audits, section]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      "aria-label": "Recent activity",
      className: "glass rounded-xl border border-border/60",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2 px-4 py-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: toggle,
              "aria-expanded": open,
              className: "flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(History, { className: "size-4 text-primary" }),
                "Recent activity",
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-normal text-muted-foreground", children: [
                  "· ",
                  audits.length,
                  " change",
                  audits.length === 1 ? "" : "s"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: cn("size-3.5 transition-transform", open && "rotate-180") })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            open && sections.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                "aria-label": "Filter recent activity by section",
                value: section,
                onChange: (e) => setSection(e.target.value),
                className: "h-7 rounded-md border border-input bg-background px-1.5 text-xs",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "all", children: "All sections" }),
                  sections.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: t, children: ACTIVITY_SECTIONS[t] ?? t }, t))
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { type: "button", variant: "ghost", size: "sm", className: "gap-1", onClick: onViewAll, children: [
              "View full audit ",
              /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "size-3.5" })
            ] })
          ] })
        ] }),
        open && (recent.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-4 pb-3 text-xs text-muted-foreground", children: "No changes recorded yet — every edit appears here with who made it." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("ol", { className: "space-y-2 border-t border-border/40 px-4 py-3", children: recent.map((a) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex min-w-0 items-start gap-2 text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-1.5 size-2 shrink-0 rounded-full bg-primary/60", "aria-hidden": true }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "break-words", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: a.field ?? a.action }),
              a.oldValue != null && a.newValue != null && String(a.oldValue) !== String(a.newValue) && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-muted-foreground", children: [
                " ",
                String(a.oldValue).slice(0, 40),
                " → ",
                String(a.newValue).slice(0, 40)
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-muted-foreground", children: [
              ACTIVITY_SECTIONS[a.table ?? ""] ?? a.table ?? "Profile",
              " · ",
              a.changedByName ?? "System",
              " · ",
              " ",
              relativeTime(a.changedAt)
            ] })
          ] })
        ] }, a._id)) }))
      ]
    }
  );
}
function ScoreSparkline({
  points,
  label = "NQAS score trend"
}) {
  const withScores = points.filter((p) => p.score != null);
  if (withScores.length < 2) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground", children: "Score trend appears once two cycles have scores." });
  }
  const w = 120;
  const h = 32;
  const xs = withScores.map((_, i) => i / (withScores.length - 1) * (w - 8) + 4);
  const ys = withScores.map((p) => h - 4 - p.score / 100 * (h - 8));
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: w, height: h, role: "img", "aria-label": label, className: "shrink-0", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d, fill: "none", stroke: "var(--color-primary)", strokeWidth: "2", strokeLinecap: "round" }),
    xs.map((x, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: x, cy: ys[i], r: "2.5", fill: "var(--color-primary)" }, i))
  ] });
}
function CycleSwitcher({
  cycles,
  selected,
  onSelect,
  scoreTrend
}) {
  if (cycles.length === 0) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        role: "tablist",
        "aria-label": "Certification cycles",
        className: "flex flex-wrap gap-1 rounded-lg border border-border/60 bg-muted/30 p-1",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              role: "tab",
              "aria-selected": selected === null,
              onClick: () => onSelect(null),
              className: cn(
                "inline-flex min-h-9 items-center rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                selected === null ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              ),
              children: "Latest"
            }
          ),
          cycles.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              role: "tab",
              "aria-selected": selected === c.cycleNumber,
              onClick: () => onSelect(c.cycleNumber),
              "data-tip": c.superseded ? "Past cycle — read-only history" : "Active cycle",
              className: cn(
                "inline-flex min-h-9 items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                selected === c.cycleNumber ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              ),
              children: [
                "#",
                c.cycleNumber,
                c.superseded && /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "secondary", className: "px-1 py-0 text-[9px] font-medium", children: "history" })
              ]
            },
            c.cycleNumber
          ))
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, { className: "size-3.5 text-muted-foreground", "aria-hidden": true }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(ScoreSparkline, { points: scoreTrend })
    ] })
  ] });
}

function focusField(key) {
  const els = document.querySelectorAll(`[data-focus="${key}"]`);
  const el = els[els.length - 1];
  if (!el) return;
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  el.focus({ preventScroll: true });
}
function FieldFrame({
  focusKey,
  label,
  required,
  requiredForStatus,
  helper,
  error,
  history,
  auto,
  children,
  className
}) {
  const errorId = `${focusKey}-error`;
  const helperId = `${focusKey}-helper`;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: cn("min-w-0 scroll-mt-32", className),
      "data-field": focusKey,
      "data-focus": focusKey,
      tabIndex: -1,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Label, { htmlFor: focusKey, className: "text-sm leading-snug", children: [
            label,
            requiredForStatus ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: "ml-1.5 rounded border border-sky-300/70 bg-sky-50 px-1 text-[10px] font-medium text-sky-800",
                "data-testid": "field-required-for-status",
                children: "Required for status"
              }
            ) : required ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1 text-destructive", "aria-hidden": true, children: "*" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1.5 text-xs font-normal text-muted-foreground", children: "Optional" }),
            auto && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: "ml-1.5 rounded border border-border bg-muted/60 px-1 text-[10px] font-medium text-muted-foreground",
                "data-testid": "field-auto-tag",
                children: "auto"
              }
            )
          ] }),
          history && history.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(FieldHistoryPopover, { label, entries: history })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1", children }),
        helper && !error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { id: helperId, className: "mt-1 text-xs leading-snug text-muted-foreground", children: helper }),
        error && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "p",
          {
            id: errorId,
            role: "alert",
            className: "mt-1 flex items-start gap-1 text-xs leading-snug font-medium text-destructive",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "mt-0.5 size-3.5 shrink-0", "aria-hidden": true }),
              error
            ]
          }
        )
      ]
    }
  );
}
function FieldHistoryPopover({
  label,
  entries
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Popover, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        "data-tip": `Change history for ${label}`,
        "aria-label": `Change history for ${label}`,
        className: "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(History, { className: "size-3.5" })
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(PopoverContent, { align: "end", className: "w-80", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm font-semibold", children: [
        label,
        " — history"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("ol", { className: "mt-2 max-h-64 space-y-2 overflow-y-auto", children: entries.map((e, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "break-words", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground line-through", children: String(e.oldValue ?? "—") }),
          " ",
          "→ ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: String(e.newValue ?? "—") })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-0.5 text-muted-foreground", children: [
          e.changedByName ?? "System",
          " · ",
          toDisplayDate(new Date(e.changedAt).toISOString().slice(0, 10))
        ] })
      ] }, i)) })
    ] })
  ] });
}
const QUICK_DATES = [
  { label: "Today", days: 0 },
  { label: "Tomorrow", days: 1 },
  { label: "+7 days", days: 7 }
];
function DateField({
  focusKey,
  label,
  value,
  onChange,
  disabled,
  error,
  helper,
  required,
  requiredForStatus,
  history,
  /** Show "Duration: n days" between a paired start/end value. */
  durationDays,
  todayIso: today = todayIsoIST(),
  min,
  max,
  disabledReason,
  emptyLabel,
  auto,
  readOnly,
  quickPicks = "all"
}) {
  const base = today || todayIsoIST();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    DateFieldBody,
    {
      focusKey,
      label,
      value,
      onChange,
      disabled,
      disabledReason,
      error,
      helper,
      required,
      requiredForStatus,
      history,
      durationDays,
      min,
      max,
      emptyLabel,
      auto,
      readOnly,
      onlyToday: quickPicks === "today",
      base
    }
  );
}
function DateQuickChips({
  today,
  min,
  max,
  onlyToday,
  onChange
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: (onlyToday ? QUICK_DATES.slice(0, 1) : QUICK_DATES).map((q) => {
    const iso = addDays(today, q.days);
    const reason = dateRuleError(iso, { min, max });
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-tip": reason ?? void 0, className: "inline-flex", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        disabled: !!reason,
        onClick: () => onChange(iso),
        className: "inline-flex min-h-8 items-center rounded-full border border-border/70 bg-muted/40 px-2.5 text-xs font-medium transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        children: q.label
      }
    ) }, q.label);
  }) });
}
function DateFieldBody(props) {
  const {
    focusKey,
    label,
    value,
    onChange,
    disabled,
    error,
    helper,
    required,
    requiredForStatus,
    history,
    durationDays,
    min,
    max,
    disabledReason,
    emptyLabel,
    auto,
    readOnly,
    onlyToday,
    base
  } = props;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    FieldFrame,
    {
      focusKey,
      label,
      required,
      requiredForStatus,
      helper,
      error,
      history,
      auto,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DateInput,
          {
            id: focusKey,
            "data-focus": focusKey,
            label,
            value,
            onChange,
            min,
            max,
            today: base,
            disabled,
            readOnly,
            disabledReason,
            emptyLabel
          }
        ),
        !disabled && !readOnly && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1.5 flex flex-wrap items-center gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            DateQuickChips,
            {
              today: base,
              min,
              max,
              onlyToday,
              onChange
            }
          ),
          durationDays != null && durationDays >= 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Clock3, { className: "size-3.5" }),
            " Duration: ",
            durationDays,
            " day",
            durationDays === 1 ? "" : "s"
          ] })
        ] })
      ]
    }
  );
}
function ScoreInput({
  focusKey,
  label,
  value,
  onChange,
  disabled,
  error,
  helper,
  history,
  requiredForStatus
}) {
  const num = parseScore(value);
  const tone = scoreTone$1(num);
  const bandHint = num == null ? "Green ≥ 70 · amber 50–69 · red < 50" : tone === "green" ? "Good — 70 or above" : tone === "amber" ? "Needs attention — 50 to 69" : "Critical — below 50";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    FieldFrame,
    {
      focusKey,
      label,
      requiredForStatus,
      error,
      helper,
      history,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: cn(
                "flex h-11 w-28 shrink-0 items-center rounded-lg border bg-background/60 px-2 focus-within:ring-2 focus-within:ring-ring",
                error ? "border-destructive/70" : "border-input"
              ),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Input,
                  {
                    id: focusKey,
                    "data-focus": focusKey,
                    type: "number",
                    inputMode: "decimal",
                    min: 0,
                    max: 100,
                    step: 0.1,
                    value,
                    disabled,
                    onChange: (e) => onChange(e.target.value),
                    className: "h-9 border-0 bg-transparent p-0 text-right tabular-nums shadow-none focus-visible:ring-0",
                    "aria-label": `${label} percent`
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1 shrink-0 text-sm text-muted-foreground", children: "%" })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "range",
              min: 0,
              max: 100,
              step: 1,
              disabled,
              value: num ?? 0,
              onChange: (e) => onChange(e.target.value),
              "aria-label": `${label} slider`,
              className: "h-11 min-w-0 flex-1 accent-[var(--primary)] motion-reduce:transition-none"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ToneBar, { value: num ?? 0, tone, className: "mt-2" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-xs text-muted-foreground", children: [
          num != null && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-semibold text-foreground", children: [
            num,
            "% — "
          ] }),
          bandHint
        ] })
      ]
    }
  );
}
function SegmentedControl({
  focusKey,
  label,
  value,
  onChange,
  options,
  disabled,
  error,
  helper,
  /** Larger "radio cards" treatment (used for certification status). */
  cards,
  icons
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(FieldFrame, { focusKey, label, error, helper, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      role: "radiogroup",
      "aria-label": label,
      "data-focus": focusKey,
      tabIndex: -1,
      className: cn(
        "flex flex-wrap gap-1.5 rounded-lg",
        cards && "grid grid-cols-1 gap-2 sm:grid-cols-2",
        error && "ring-1 ring-destructive/60 ring-offset-1 ring-offset-background"
      ),
      children: options.map((opt) => {
        const selected = value === opt;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            role: "radio",
            "aria-checked": selected,
            disabled,
            onClick: () => onChange(opt),
            className: cn(
              "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              cards && "justify-start px-3.5 py-2.5 text-left",
              selected ? "border-transparent bg-primary text-primary-foreground shadow-sm" : "border-border/70 bg-background/60 text-foreground hover:bg-muted"
            ),
            children: [
              icons?.[opt],
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 break-words", children: opt }),
              selected && /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3.5 shrink-0", "aria-hidden": true })
            ]
          },
          opt
        );
      })
    }
  ) });
}
function AssessorAutocomplete({
  focusKey,
  label,
  value,
  designation,
  onDesignationChange,
  designations,
  phone,
  onPhoneChange,
  maskPhone: maskPhone$1,
  hud,
  onHudChange,
  huds,
  suggestions,
  /** name → HUD from this assessor's last entry. */
  hudByName,
  onChange,
  disabled,
  error,
  history
}) {
  const listId = `${focusKey}-list`;
  const designationListId = `${focusKey}-designations`;
  const matchedHud = value.trim() ? hudByName[value.trim().toLowerCase()] : void 0;
  const phoneInvalid = phone.trim() ? phoneError(phone) : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(FieldFrame, { focusKey, label, error, history, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            id: focusKey,
            "data-focus": focusKey,
            list: listId,
            value,
            disabled,
            onChange: (e) => onChange(e.target.value),
            placeholder: "Start typing a name",
            autoComplete: "off",
            className: "glass-input min-h-11"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("datalist", { id: listId, children: suggestions.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: s }, s)) })
      ] }),
      matchedHud && !hud && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          disabled,
          onClick: () => onHudChange(matchedHud),
          className: "mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "size-3.5" }),
            " Suggested HUD: ",
            matchedHud,
            " — apply"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      FieldFrame,
      {
        focusKey: `${focusKey}-designation`,
        label: `${label.split("—")[0].trim()} designation`,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              "data-focus": `${focusKey}-designation`,
              list: designationListId,
              value: designation,
              disabled,
              onChange: (e) => onDesignationChange(e.target.value),
              placeholder: "e.g. QMO",
              autoComplete: "off",
              className: "glass-input min-h-11"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("datalist", { id: designationListId, children: designations.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: d }, d)) })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      FieldFrame,
      {
        focusKey: `${focusKey}-phone`,
        label: `${label.split("—")[0].trim()} contact number`,
        error: phoneInvalid ?? void 0,
        children: [
          maskPhone$1 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "flex min-h-11 items-center rounded-md border border-border/60 bg-muted/30 px-3 text-sm text-muted-foreground", children: phone ? maskPhone(phone) : "-" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              "data-focus": `${focusKey}-phone`,
              type: "tel",
              inputMode: "tel",
              value: phone,
              disabled,
              onChange: (e) => onPhoneChange(e.target.value),
              onBlur: () => {
                const normalized = normalizePhone(phone);
                if (normalized) onPhoneChange(normalized);
              },
              placeholder: "+91 98765 43210",
              autoComplete: "off",
              className: "glass-input min-h-11"
            }
          ),
          !phoneInvalid && phone && !maskPhone$1 && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-[11px] text-muted-foreground", children: [
            "Stored as ",
            phone
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      FieldFrame,
      {
        focusKey: `${focusKey}Hud`,
        label: `${label.split("—")[0].trim()} HUD`,
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-1.5", children: [
          huds.map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              disabled,
              onClick: () => onHudChange(h === hud ? "" : h),
              className: cn(
                "inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                h === hud ? "border-transparent bg-primary text-primary-foreground" : "border-border/70 bg-background/60 hover:bg-muted"
              ),
              children: h
            },
            h
          )),
          hud && !huds.includes(hud) && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex min-h-11 items-center rounded-lg border border-border/70 bg-muted/40 px-3 text-sm", children: hud })
        ] })
      }
    )
  ] });
}
function StatusBanner({
  label,
  tone,
  rule,
  onWhyOpenChange
}) {
  const Icon = BANNER_ICONS[tone];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      role: "status",
      className: cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4",
        tone === "green" && "border-emerald-300/70 bg-emerald-500/5",
        tone === "amber" && "border-amber-300/70 bg-amber-500/5",
        tone === "red" && "border-rose-300/70 bg-rose-500/5",
        tone === "blue" && "border-sky-300/70 bg-sky-500/5",
        tone === "purple" && "border-violet-300/70 bg-violet-500/5",
        tone === "grey" && "border-border/60 bg-muted/30"
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: "flex size-10 shrink-0 items-center justify-center rounded-full",
              style: { background: `${TONE_HEX[tone]}1a`, color: TONE_HEX[tone] },
              "aria-hidden": true,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "size-5" })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-lg leading-tight font-bold text-foreground", children: label }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Derived automatically from the fields below" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Popover, { onOpenChange: onWhyOpenChange, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { type: "button", variant: "outline", size: "sm", className: "min-h-11 gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { className: "size-4" }),
            " Why this status?"
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverContent, { align: "end", className: "max-w-sm text-sm leading-relaxed", children: rule })
        ] })
      ]
    }
  );
}
const BANNER_ICONS = {
  grey: Info,
  blue: CalendarDays,
  amber: Clock3,
  purple: Info,
  green: Check,
  red: TriangleAlert
};
function ValidityTimeline({
  certifiedOn,
  surveillance1,
  surveillance2,
  expires,
  formula
}) {
  const nodes = [
    { key: "cert", label: "Certified", date: certifiedOn, tone: "green" },
    { key: "s1", label: "1st surveillance due", date: surveillance1, tone: "blue" },
    { key: "s2", label: "2nd surveillance due", date: surveillance2, tone: "blue" },
    { key: "exp", label: "Validity ends", date: expires, tone: "amber" }
  ];
  if (!certifiedOn && !expires) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Validity and surveillance dates appear here once a certification date is recorded." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      tabIndex: 0,
      "data-tip": formula,
      className: "rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
      "aria-label": `Certification timeline. ${formula}`,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("ol", { className: "grid grid-cols-2 gap-2 sm:grid-cols-4", children: nodes.map((n, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "relative min-w-0 rounded-lg border border-border/60 bg-muted/30 p-2.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: "mb-1 block h-1.5 w-full rounded-full",
            style: { background: n.date ? TONE_HEX[n.tone] : "var(--border)" },
            "aria-hidden": true
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "truncate text-[11px] font-semibold tracking-wide text-muted-foreground uppercase", children: n.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "truncate text-sm font-semibold tabular-nums", children: n.date ? toDisplayDate(n.date) : "—" }),
        i < nodes.length - 1 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute top-1/2 -right-2 hidden text-muted-foreground/60 sm:block", "aria-hidden": true, children: "→" })
      ] }, n.key)) })
    }
  );
}
function FormSection({
  id,
  index,
  title,
  hint,
  state,
  children,
  defaultOpen = true,
  /** Shown in place of `hint` while the section is collapsed. */
  collapsedHint,
  /** Locked sections show a lock icon + reason instead of collapsing. */
  lockReason
}) {
  const [open, setOpen] = reactExports.useState(defaultOpen);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      id: `section-${id}`,
      "aria-label": title,
      className: "glass scroll-mt-40 rounded-xl border border-border/60",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => setOpen((v) => !v),
            "aria-expanded": open,
            className: "flex w-full min-h-14 items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    state.issues > 0 ? "bg-destructive text-white" : state.done ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"
                  ),
                  "aria-hidden": true,
                  children: state.issues > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-3.5" }) : state.done ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3.5" }) : index
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "block text-sm font-semibold", children: [
                  index,
                  ". ",
                  title,
                  state.issues > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-2 text-xs font-medium text-destructive", children: [
                    state.issues,
                    " to fix"
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-xs leading-snug text-muted-foreground", children: !open && collapsedHint ? collapsedHint : hint })
              ] }),
              lockReason && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "span",
                {
                  "data-tip": lockReason,
                  className: "inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/50 px-2 py-1 text-[11px] font-medium text-muted-foreground",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "size-3", "aria-hidden": true }),
                    " Read-only"
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                ChevronDown,
                {
                  className: cn("size-4 shrink-0 text-muted-foreground transition-transform motion-safe:duration-200", open && "rotate-180"),
                  "aria-hidden": true
                }
              )
            ]
          }
        ),
        open && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-border/50 p-4", children })
      ]
    }
  );
}
function SectionRail({
  sections
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "nav",
    {
      "aria-label": "Form sections",
      className: "sticky top-2 z-10 -mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:top-24 lg:mx-0 lg:mb-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0 print:hidden",
      children: sections.map((s, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "a",
        {
          href: `#section-${s.id}`,
          className: cn(
            "flex min-h-11 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:whitespace-normal",
            s.state.issues > 0 ? "border-destructive/40 bg-destructive/10 text-foreground" : "border-border/60 bg-background/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          ),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  s.state.issues > 0 ? "bg-destructive text-white" : s.state.done ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"
                ),
                "aria-hidden": true,
                children: s.state.issues > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-3" }) : s.state.done ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3" }) : i + 1
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1", children: s.title })
          ]
        },
        s.id
      ))
    }
  );
}
function ValidationSummary({ issues }) {
  if (issues.length === 0) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      role: "alert",
      className: "rounded-xl border border-destructive/40 bg-destructive/5 p-4",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-2 text-sm font-semibold text-destructive", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-4" }),
          " Fix ",
          issues.length,
          " issue",
          issues.length === 1 ? "" : "s",
          " before saving"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-2 space-y-1.5", children: issues.map((i, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => focusField(i.field),
            className: "text-left text-xs leading-snug text-foreground underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-semibold", children: [
                i.label,
                ":"
              ] }),
              " ",
              i.message
            ]
          }
        ) }, `${i.field}-${idx}`)) })
      ]
    }
  );
}
function StickySaveBar({
  dirtyCount,
  busy,
  lastSavedAt,
  onSave,
  onDiscard,
  saveLabel = "Save"
}) {
  const saveRef = reactExports.useRef(() => {
  });
  reactExports.useEffect(() => {
    saveRef.current = onSave;
  });
  reactExports.useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  if (dirtyCount === 0 && !lastSavedAt) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-x-0 bottom-16 z-30 px-3 pb-3 md:bottom-0 md:px-6 md:pb-4 print:hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-strong mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 px-4 py-3 shadow-lg", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
      dirtyCount > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-300", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Target, { className: "size-4" }),
        " Unsaved changes (",
        dirtyCount,
        ")"
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: lastSavedAt }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground", children: "Draft saves on this device every few seconds · Ctrl/Cmd+S to save" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-center gap-2", children: [
      dirtyCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "button", variant: "outline", size: "sm", className: "min-h-11", onClick: onDiscard, children: "Discard" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          type: "button",
          size: "sm",
          className: "min-h-11",
          disabled: busy || dirtyCount === 0,
          onClick: onSave,
          children: busy ? "Saving…" : `${saveLabel}${dirtyCount > 0 ? ` (${dirtyCount})` : ""}`
        }
      )
    ] })
  ] }) });
}
function loadDraft(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? { ...fallback, ...parsed } : fallback;
  } catch {
    return fallback;
  }
}
function saveDraft(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
  }
}
function clearDraft(key) {
  try {
    localStorage.removeItem(key);
  } catch {
  }
}

function ScheduleVisitFields({
  kind,
  today,
  canEdit,
  scheduledStart,
  scheduledEnd,
  originalScheduledDate,
  errors,
  history,
  onScheduledStartChange,
  onScheduledEndChange
}) {
  const isNqas = kind === "nqas";
  const rescheduled = !!originalScheduledDate && !!scheduledStart && originalScheduledDate !== scheduledStart;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", "data-testid": `${kind}-schedule-visit`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("grid gap-4", isNqas && "sm:grid-cols-2"), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        DateField,
        {
          focusKey: isNqas ? "nqas.scheduledStartDate" : "sa.scheduledDate",
          label: isNqas ? rescheduled ? "Scheduled start date (revised)" : "Scheduled start date" : rescheduled ? "Scheduled date (revised)" : "Scheduled date",
          value: scheduledStart,
          onChange: onScheduledStartChange,
          disabled: !canEdit,
          disabledReason: canEdit ? void 0 : "View only — visit dates need edit access",
          requiredForStatus: true,
          todayIso: today,
          error: errors[isNqas ? "scheduledStartDate" : "scheduledDate"],
          history: history(isNqas ? "NQAS Scheduled Start Date" : "SA Scheduled Date")
        }
      ),
      isNqas && /* @__PURE__ */ jsxRuntimeExports.jsx(
        DateField,
        {
          focusKey: "nqas.scheduledEndDate",
          label: "Scheduled end date",
          value: scheduledEnd ?? "",
          onChange: (v) => onScheduledEndChange?.(v),
          disabled: !canEdit,
          disabledReason: canEdit ? void 0 : "View only — visit dates need edit access",
          requiredForStatus: true,
          todayIso: today,
          emptyLabel: "Same as start",
          error: errors.scheduledEndDate,
          history: history("NQAS Scheduled End Date")
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", "data-testid": `${kind}-schedule-note`, children: rescheduled ? `Originally scheduled: ${dmy(originalScheduledDate ?? "")}.` : "Planned dates only — actual dates are entered in Visit." })
  ] });
}
function SameAsScheduledToggle({
  kind,
  scheduledStart,
  scheduledEnd,
  checked,
  canEdit,
  today,
  onChange
}) {
  const availability = visitLinkAvailability({
    scheduledStart,
    canEdit});
  const copied = copyScheduleToVisit(scheduledStart, scheduledEnd);
  const enabled = availability.enabled && !!copied;
  const range = copied ? `${dmy(copied.actualStartDate)} to ${dmy(copied.actualEndDate)}` : "No scheduled date";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "label",
    {
      className: cn(
        "flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border px-3.5 py-3 transition-colors",
        checked && enabled ? "border-primary/50 bg-primary/5" : "border-border/70 bg-background/60",
        !enabled && "cursor-not-allowed opacity-70"
      ),
      "data-testid": `${kind}-same-as-scheduled`,
      title: availability.reason ?? "Fill both actual dates from the schedule",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "checkbox",
            className: "size-5 shrink-0 accent-[var(--primary)]",
            checked,
            disabled: !enabled,
            onChange: (event) => onChange(event.target.checked),
            "aria-label": "Visit dates same as scheduled"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1.5 text-sm font-semibold text-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Link2, { className: "size-4 text-primary", "aria-hidden": true }),
          " Visit dates same as scheduled"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-muted-foreground", children: range }),
        !enabled && availability.reason && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "basis-full text-xs font-medium text-amber-800", children: availability.reason })
      ]
    }
  );
}
function VisitDatesFields({
  kind,
  today,
  canEdit,
  scheduledStart,
  scheduledEnd,
  actualStart,
  actualEnd,
  sameAsScheduled,
  durationDays,
  errors,
  history,
  onSameAsScheduledChange,
  onActualStartChange,
  onActualEndChange
}) {
  const prefix = kind === "nqas" ? "nqas" : "sa";
  const disabled = !canEdit;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      SameAsScheduledToggle,
      {
        kind,
        scheduledStart,
        scheduledEnd,
        checked: sameAsScheduled,
        canEdit,
        today,
        onChange: onSameAsScheduledChange
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 grid gap-4 sm:grid-cols-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        DateField,
        {
          focusKey: `${prefix}.actualStartDate`,
          label: "Actual start date",
          value: actualStart,
          onChange: onActualStartChange,
          disabled,
          readOnly: sameAsScheduled,
          disabledReason: sameAsScheduled ? "Set by “Visit dates same as scheduled” — untick it to edit" : disabled ? "View only — you do not have edit access" : void 0,
          max: today,
          quickPicks: "today",
          error: errors.actualStartDate,
          requiredForStatus: true,
          helper: "Required when the visit is completed. Future dates are blocked.",
          history: history(
            kind === "nqas" ? "NQAS Actual Start Date" : "SA Actual Start Date"
          )
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        DateField,
        {
          focusKey: `${prefix}.actualEndDate`,
          label: "Actual end date",
          value: actualEnd,
          onChange: onActualEndChange,
          disabled,
          readOnly: sameAsScheduled,
          disabledReason: sameAsScheduled ? "Set by “Visit dates same as scheduled” — untick it to edit" : disabled ? "View only — you do not have edit access" : void 0,
          max: today,
          quickPicks: "today",
          error: errors.actualEndDate,
          requiredForStatus: true,
          helper: "Cannot be before the start date.",
          durationDays,
          history: history(
            kind === "nqas" ? "NQAS Actual End Date" : "SA Actual End Date"
          )
        }
      )
    ] }),
    !disabled && !sameAsScheduled && durationDays === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-xs text-muted-foreground", children: "Single-day visit." })
  ] });
}

function historyFor(audits, table, dbColumn) {
  return audits.filter((a) => a.table === table && a.field === dbColumn).map((a) => ({
    oldValue: a.oldValue,
    newValue: a.newValue,
    changedByName: a.changedByName,
    changedAt: a.changedAt
  }));
}
function lastTouched(audits, table) {
  const a = audits.filter((x) => x.table === table).sort((x, y) => y.changedAt - x.changedAt)[0];
  return a ? { who: a.changedByName ?? "System", when: a.changedAt } : null;
}
function issuesByField(issues) {
  const out = {};
  for (const i of issues) out[i.field.replace(/^[a-z]+\./, "")] = i.message;
  return out;
}
function withDocumentPresence(values, uploaded, mapping) {
  const out = { ...values };
  for (const [field, docKey] of Object.entries(mapping)) {
    out[field] = uploaded.has(docKey) ? "uploaded" : "";
  }
  return out;
}
function sectionState(defs, sectionId, issues, values) {
  const inSection = defs.filter((d) => d.section === sectionId);
  let filled = 0;
  for (const d of inSection) {
    const v = values[d.key];
    if (Array.isArray(v)) {
      if (v.length > 0) filled++;
    } else if (v != null && String(v).trim() !== "") filled++;
  }
  const issueCount = issues.filter(
    (i) => inSection.some((d) => i.field.endsWith(`.${d.key}`) || i.field === d.key)
  ).length;
  return {
    done: inSection.length > 0 && filled === inSection.length,
    issues: issueCount
  };
}
function useDraft(key, initial) {
  const [draft, setDraft] = reactExports.useState(() => loadDraft(key, initial));
  const initialJson = JSON.stringify(initial);
  const initialRef = reactExports.useRef(initial);
  const initialJsonRef = reactExports.useRef(initialJson);
  const draftRef = reactExports.useRef(draft);
  reactExports.useEffect(() => {
    initialRef.current = initial;
    initialJsonRef.current = initialJson;
    draftRef.current = draft;
  });
  const dirtyKeys = reactExports.useMemo(() => {
    let base = {};
    try {
      base = JSON.parse(initialJson);
    } catch {
      base = {};
    }
    const rec = draft;
    return Object.keys(rec).filter(
      (k) => JSON.stringify(rec[k] ?? null) !== JSON.stringify(base[k] ?? null)
    );
  }, [draft, initialJson]);
  reactExports.useEffect(() => {
    setDraft(
      (prev) => JSON.stringify(prev) !== initialJson ? prev : loadDraft(key, initialRef.current)
    );
  }, [key, initialJson]);
  const [restored] = reactExports.useState(() => {
    const d = loadDraft(key, initial);
    return JSON.stringify(d) !== JSON.stringify(initial);
  });
  reactExports.useEffect(() => {
    if (!restored) return;
    toast.info("Unsaved draft restored", {
      description: "Picking up where you left off — press Save when ready."
    });
  }, []);
  reactExports.useEffect(() => {
    const maybeSave = () => {
      if (JSON.stringify(draftRef.current) !== initialJsonRef.current) {
        saveDraft(key, draftRef.current);
      } else {
        clearDraft(key);
      }
    };
    const iv = window.setInterval(maybeSave, 4e3);
    const onUnload = (e) => {
      if (JSON.stringify(draftRef.current) !== initialJsonRef.current) {
        saveDraft(key, draftRef.current);
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.clearInterval(iv);
      window.removeEventListener("beforeunload", onUnload);
      maybeSave();
    };
  }, [key]);
  const set = (k, v) => setDraft((f) => ({ ...f, [k]: v }));
  const discard = () => {
    clearDraft(key);
    setDraft(initialRef.current);
  };
  return { draft, set, setDraft, dirtyKeys, dirtyCount: dirtyKeys.length, discard };
}
function QuickActionsMenu({ items }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button,
      {
        type: "button",
        variant: "outline",
        size: "icon",
        className: "size-11 shrink-0 print:hidden",
        "aria-label": "Quick actions for this assessment",
        "data-tip": "Quick actions",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(EllipsisVertical, { className: "size-4" })
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", className: "w-72", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuLabel, { children: "Quick actions" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, {}),
      items.map((it, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        it.separatorBefore && /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          DropdownMenuItem,
          {
            disabled: it.disabled,
            onSelect: (e) => {
              e.preventDefault();
              it.onSelect();
            },
            className: cn("gap-2", it.danger && "text-destructive focus:text-destructive"),
            children: [
              it.icon,
              " ",
              it.label
            ]
          }
        )
      ] }, `${it.label}-${i}`))
    ] })
  ] });
}
function ScopeChoiceCards({
  focusKey,
  value,
  options,
  disabled,
  error,
  onChange
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    FieldFrame,
    {
      focusKey,
      label: "Which scope was assessed?",
      error,
      helper: "Optional — choose one. Click the selected card again, or use Clear, to unselect.",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            role: "group",
            "aria-label": "Which scope was assessed?",
            "data-focus": focusKey,
            tabIndex: -1,
            className: "grid gap-2 sm:grid-cols-2",
            children: options.map((option) => {
              const selected = value === option;
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  "aria-pressed": selected,
                  disabled,
                  onClick: () => onChange(selected ? "" : option),
                  className: cn(
                    "flex min-h-12 items-center gap-2 rounded-lg border px-3.5 py-2.5 text-left text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
                    selected ? "border-blue-500 bg-blue-50 text-blue-950 shadow-sm" : "border-border/70 bg-background/60 text-foreground hover:bg-muted"
                  ),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1", children: option }),
                    selected && /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-4 shrink-0 text-blue-600", "aria-hidden": true })
                  ]
                },
                option
              );
            })
          }
        ),
        value && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            type: "button",
            variant: "ghost",
            size: "sm",
            disabled,
            onClick: () => onChange(""),
            className: "h-8 gap-1 text-xs",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3.5" }),
              " Clear"
            ]
          }
        ) })
      ]
    }
  );
}
function UpdatedFooter({
  audits,
  table,
  extraTables = []
}) {
  const tables = /* @__PURE__ */ new Set([table, ...extraTables]);
  const latest = audits.filter((a) => a.table && tables.has(a.table)).sort((a, b) => b.changedAt - a.changedAt)[0];
  const when = latest ? toLongDisplayDate(new Date(latest.changedAt).toISOString().slice(0, 10)) : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "p",
    {
      "data-testid": `section-footer-${table}`,
      className: "mt-3 border-t border-border/50 pt-2 text-[11px] text-muted-foreground",
      children: latest && when ? `Last changed ${when} · ${latest.changedByName ?? "System"}` : "No changes recorded yet — this section has never been edited."
    }
  );
}
function assessorHudIndex(pool) {
  const out = {};
  for (const a of pool) {
    const name = a.name?.trim();
    if (name && a.hud && !out[name.toLowerCase()]) out[name.toLowerCase()] = a.hud;
  }
  return out;
}
const SA_TABLE = "stateAssessments";
function saToDraft(sa) {
  return {
    scheduledDate: sa.scheduledDate ?? "",
    actualStartDate: sa.actualStartDate ?? "",
    actualEndDate: sa.actualEndDate ?? "",
    scopeOption: sa.scopeOption ?? "",
    scorePercent: sa.scorePercent != null ? String(sa.scorePercent) : "",
    generalDocStatus: sa.generalDocStatus ?? "",
    assessor1Name: sa.assessor1Name ?? "",
    assessor1Designation: sa.assessor1Designation ?? "",
    assessor1Phone: sa.assessor1Phone ?? "",
    assessor1Hud: sa.assessor1Hud ?? "",
    assessor2Name: sa.assessor2Name ?? "",
    assessor2Designation: sa.assessor2Designation ?? "",
    assessor2Phone: sa.assessor2Phone ?? "",
    assessor2Hud: sa.assessor2Hud ?? ""
  };
}
function datesMatchSchedule(scheduledStart, scheduledEnd, actualStart, actualEnd) {
  const copied = copyScheduleToVisit(scheduledStart, scheduledEnd);
  return !!copied && !!actualStart && copied.actualStartDate === actualStart && copied.actualEndDate === actualEnd;
}
function emptyDraft(base, keep = []) {
  const out = {};
  for (const k of Object.keys(base)) {
    if (keep.includes(k)) continue;
    out[k] = Array.isArray(base[k]) ? [] : "";
  }
  return out;
}
function SaForm({
  sa,
  facilityId,
  cycleId,
  statuses,
  assessorHuds,
  scopeOptions,
  disabled,
  lockReason,
  audits,
  assessorPool,
  maskPhones = false,
  duplicateSource,
  certificationStatus,
  onStartCycle,
  startCycleLabel,
  onSave
}) {
  const draftKey = `nqas:sa-draft:${facilityId}:${cycleId}`;
  const initial = reactExports.useMemo(() => saToDraft(sa), [sa]);
  const { draft, set, setDraft, dirtyCount, discard } = useDraft(
    draftKey,
    initial
  );
  const [busy, setBusy] = reactExports.useState(false);
  const undoRef = reactExports.useRef(null);
  const [canUndo, setCanUndo] = reactExports.useState(false);
  const today = todayLocalIso();
  const [sameAsScheduled, setSameAsScheduled] = reactExports.useState(
    () => datesMatchSchedule(
      sa.scheduledDate ?? "",
      "",
      sa.actualStartDate ?? "",
      sa.actualEndDate ?? ""
    )
  );
  reactExports.useEffect(() => {
    if (!sameAsScheduled) return;
    const copied = copyScheduleToVisit(draft.scheduledDate, "");
    if (!copied) {
      setSameAsScheduled(false);
      return;
    }
    if (draft.actualStartDate !== copied.actualStartDate || draft.actualEndDate !== copied.actualEndDate) {
      setDraft((f) => ({ ...f, ...copied }));
    }
  }, [
    sameAsScheduled,
    draft.scheduledDate,
    draft.actualStartDate,
    draft.actualEndDate,
    setDraft
  ]);
  const resultDeclared = isResultDeclaredStatus(certificationStatus);
  const documents = useQuery(api.documents.listForFacility, {
    facilityId
  });
  const uploadedDocKeys = new Set(
    (documents?.documents ?? []).filter((d) => d.current).map((d) => d.key)
  );
  const saDone = !!draft.actualEndDate || !!draft.actualStartDate || sa.status === "Completed";
  const saScheduled = !!draft.scheduledDate;
  const derivedStatus = saDone ? "Completed" : saScheduled ? "Scheduled" : "Not Yet Initiated";
  const statusLabel = saDone ? "SA Completed" : saScheduled ? "SA Scheduled" : "SA Pending";
  const statusTone = saDone ? "green" : saScheduled ? "blue" : "grey";
  const issues = reactExports.useMemo(() => {
    const base = validateSaDraft(draft, today);
    if (sa.scorePercent != null && draft.scorePercent === "") {
      base.push({
        field: "sa.scorePercent",
        label: "Score %",
        message: `A recorded score can't be removed by clearing the box — enter the score again (it was ${sa.scorePercent}%).`
      });
    }
    return base;
  }, [draft, today, sa.scorePercent]);
  const byField = issuesByField(issues);
  const durationDays = draft.actualStartDate && draft.actualEndDate ? Math.round(
    (Date.parse(draft.actualEndDate) - Date.parse(draft.actualStartDate)) / 864e5
  ) : null;
  const onScheduledChange = (value) => set("scheduledDate", value);
  const onSameAsScheduledChange = (on) => {
    setSameAsScheduled(on);
    if (!on) {
      setDraft((f) => ({ ...f, actualStartDate: "", actualEndDate: "" }));
      return;
    }
    const copied = copyScheduleToVisit(draft.scheduledDate, "");
    if (copied) setDraft((f) => ({ ...f, ...copied }));
  };
  const onStartDateChange = (value) => set("actualStartDate", value);
  const onEndDateChange = (value) => set("actualEndDate", value);
  const doSave = async () => {
    let effective = draft;
    if (sameAsScheduled) {
      const copied = copyScheduleToVisit(effective.scheduledDate, "");
      if (copied) effective = { ...effective, ...copied };
    }
    const effectiveIssues = validateSaDraft(effective, today);
    if (saDone && (!effective.actualStartDate || !effective.actualEndDate) && !effectiveIssues.some((issue) => issue.field === "sa.actualStartDate")) {
      effectiveIssues.push({
        field: "sa.actualStartDate",
        label: "Actual dates",
        message: "A completed visit needs both actual dates. Enter the actual start date and actual end date before saving."
      });
    }
    if (effectiveIssues.length > 0) {
      toast.error(`Fix ${effectiveIssues.length} issue${effectiveIssues.length === 1 ? "" : "s"} first`, {
        description: effectiveIssues[0].message
      });
      focusField(effectiveIssues[0].field);
      return;
    }
    undoRef.current = { ...initial };
    setCanUndo(true);
    if (derivedStatus !== sa.status) {
      toast.info(
        `This will change SA Status to “${derivedStatus}” — Facility Current Status, Eligibility and the master-list columns update automatically.`
      );
    }
    const payload = {
      status: derivedStatus,
      scheduledDate: effective.scheduledDate,
      actualStartDate: effective.actualStartDate,
      actualEndDate: effective.actualEndDate,
      scopeOption: draft.scopeOption ?? "",
      dateSource: sameAsScheduled ? "same as scheduled" : void 0,
      scorePercent: effective.scorePercent === "" ? void 0 : Number(effective.scorePercent),
      // Text fields send the raw value so a clear persists; empty equal to
      // the stored value is skipped server-side without an audit entry.
      assessor1Name: draft.assessor1Name,
      assessor1Designation: draft.assessor1Designation,
      assessor1Phone: draft.assessor1Phone,
      assessor1Hud: draft.assessor1Hud,
      assessor2Name: draft.assessor2Name,
      assessor2Designation: draft.assessor2Designation,
      assessor2Phone: draft.assessor2Phone,
      assessor2Hud: draft.assessor2Hud
    };
    setBusy(true);
    try {
      await onSave(payload);
      clearDraft(draftKey);
      toast.success("State assessment saved");
    } catch (err) {
      saveDraft(draftKey, draft);
      showSaveError(err);
    } finally {
      setBusy(false);
    }
  };
  const doDiscard = () => {
    discard();
    setSameAsScheduled(
      datesMatchSchedule(
        initial.scheduledDate,
        "",
        initial.actualStartDate,
        initial.actualEndDate
      )
    );
    toast("Changes discarded", { description: "Back to the last saved values." });
  };
  const rail = SA_SECTIONS.map((s) => ({
    id: s.id,
    title: s.title,
    state: sectionState(
      SA_FIELDS,
      s.id,
      issues,
      withDocumentPresence(draft, uploadedDocKeys, {
        reportAttachmentId: "SA_Report",
        checklistAttachmentId: "SA_Checklist"
      })
    )
  }));
  const h = (key) => historyFor(audits, SA_TABLE, key);
  const suggestions = [...new Set(assessorPool.map((a) => a.name).filter(Boolean))];
  const hudByName = assessorHudIndex(assessorPool);
  const designations = [
    ...new Set(
      assessorPool.map((a) => (a.designation ?? "").trim()).filter(Boolean)
    )
  ];
  const dirByName = {};
  for (const a of assessorPool) {
    const key = a.name.trim().toLowerCase();
    if (!key || dirByName[key]) continue;
    dirByName[key] = { designation: a.designation, phone: a.phone, hud: a.hud };
  }
  const applyAssessorName = (n, value) => {
    const hit = dirByName[value.trim().toLowerCase()];
    setDraft((f) => ({
      ...f,
      [`assessor${n}Name`]: value,
      ...hit?.designation ? { [`assessor${n}Designation`]: hit.designation } : {},
      ...hit?.phone ? { [`assessor${n}Phone`]: hit.phone } : {},
      ...hit?.hud ? { [`assessor${n}Hud`]: hit.hud } : {}
    }));
  };
  const lastSA = lastTouched(audits, SA_TABLE);
  const quickItems = [
    {
      label: "Undo last save",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Undo2, { className: "size-4" }),
      disabled: !canUndo || disabled,
      onSelect: () => {
        if (undoRef.current) {
          const restored = { ...initial, ...undoRef.current };
          setDraft(restored);
          setSameAsScheduled(
            datesMatchSchedule(
              restored.scheduledDate,
              "",
              restored.actualStartDate,
              restored.actualEndDate
            )
          );
          toast.info("Last save restored in the form", {
            description: "Press Save to write the restored values back."
          });
        }
      }
    },
    {
      label: "Duplicate previous cycle's assessors",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "size-4" }),
      disabled: disabled || !duplicateSource?.assessor1Name,
      separatorBefore: true,
      onSelect: () => {
        const src = duplicateSource;
        if (!src) return;
        setDraft((f) => ({
          ...f,
          assessor1Name: src.assessor1Name ?? "",
          assessor1Designation: src.assessor1Designation ?? "",
          assessor1Phone: src.assessor1Phone ?? "",
          assessor1Hud: src.assessor1Hud ?? "",
          assessor2Name: src.assessor2Name ?? "",
          assessor2Designation: src.assessor2Designation ?? "",
          assessor2Phone: src.assessor2Phone ?? "",
          assessor2Hud: src.assessor2Hud ?? ""
        }));
        toast.success("Assessors copied from the previous cycle — Save to keep them");
      }
    },
    ...onStartCycle ? [
      {
        label: startCycleLabel ?? "Start new cycle",
        icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CalendarPlus, { className: "size-4" }),
        disabled,
        separatorBefore: true,
        onSelect: onStartCycle
      }
    ] : [],
    ...SA_SECTIONS.map((s) => ({
      label: `Reset section: ${s.title}`,
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { className: "size-4" }),
      disabled,
      onSelect: () => {
        setDraft((f) => {
          const next = { ...f };
          for (const d of SA_FIELDS.filter((x) => x.section === s.id)) {
            next[d.key] = Array.isArray(f[d.key]) ? [] : "";
          }
          return next;
        });
        if (s.id === "visit") setSameAsScheduled(false);
        toast.info(`“${s.title}” reset in the form — Save to persist`);
      }
    })),
    {
      label: "Mark not applicable (clear whole form)",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { className: "size-4" }),
      disabled,
      separatorBefore: true,
      danger: true,
      onSelect: () => {
        setDraft(emptyDraft(draft));
        setSameAsScheduled(false);
        toast.info("Form cleared — Save to record the assessment as not applicable");
      }
    },
    {
      label: "Print facility profile",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Printer, { className: "size-4" }),
      separatorBefore: true,
      onSelect: () => window.print()
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4 pb-28", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(ValidationSummary, { issues }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-w-0 flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        StatusBanner,
        {
          label: statusLabel,
          tone: statusTone,
          rule: saDone ? "“SA Completed” when the visit has an actual end date (or the record was already completed). A completed visit must also record its start date, end date and score. The stored status is always written from these fields, so it can never drift from the dates again." : saScheduled ? "“SA Scheduled” because a visit date is set. Once the team visits, fill the actual dates and the score and the status becomes “SA Completed”." : "“SA Pending” until a visit is scheduled. Pick a scheduled date under §1 Schedule and this becomes “SA Scheduled”."
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(QuickActionsMenu, { items: quickItems })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 lg:grid-cols-[13rem_minmax(0,1fr)]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(SectionRail, { sections: rail }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          FormSection,
          {
            id: "sa-schedule",
            index: 1,
            title: "Schedule",
            hint: SA_SECTIONS[0].hint,
            state: rail[0].state,
            lockReason,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                ScheduleVisitFields,
                {
                  kind: "sa",
                  today,
                  canEdit: !disabled,
                  scheduledStart: draft.scheduledDate,
                  originalScheduledDate: sa.originalScheduledDate,
                  errors: byField,
                  history: h,
                  onScheduledStartChange: onScheduledChange
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(UpdatedFooter, { audits, table: SA_TABLE })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          FormSection,
          {
            id: "sa-visit",
            index: 2,
            title: "Visit",
            hint: SA_SECTIONS[1].hint,
            state: rail[1].state,
            lockReason,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                VisitDatesFields,
                {
                  kind: "sa",
                  today,
                  canEdit: !disabled,
                  scheduledStart: draft.scheduledDate,
                  actualStart: draft.actualStartDate,
                  actualEnd: draft.actualEndDate,
                  sameAsScheduled,
                  durationDays,
                  errors: byField,
                  history: h,
                  onSameAsScheduledChange,
                  onActualStartChange: onStartDateChange,
                  onActualEndChange: onEndDateChange
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(UpdatedFooter, { audits, table: SA_TABLE })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          FormSection,
          {
            id: "sa-scope",
            index: 3,
            title: "Scope",
            hint: "Which scope was assessed?",
            collapsedHint: draft.scopeOption || "-",
            state: rail[2].state,
            lockReason,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                ScopeChoiceCards,
                {
                  focusKey: "sa.scopeOption",
                  value: draft.scopeOption ?? "",
                  options: scopeOptions,
                  disabled,
                  error: byField.scopeOption,
                  onChange: (v) => set("scopeOption", v)
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(UpdatedFooter, { audits, table: SA_TABLE })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          FormSection,
          {
            id: "sa-outcome",
            index: 4,
            title: "Outcome",
            hint: SA_SECTIONS[3].hint,
            state: rail[3].state,
            lockReason,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-w-md", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                ScoreInput,
                {
                  focusKey: "sa.scorePercent",
                  label: "Score %",
                  value: draft.scorePercent,
                  onChange: (v) => set("scorePercent", v),
                  disabled,
                  error: byField.scorePercent,
                  requiredForStatus: true,
                  history: h("SA Score %")
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(UpdatedFooter, { audits, table: SA_TABLE })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          FormSection,
          {
            id: "sa-assessors",
            index: 5,
            title: "Assessors",
            hint: SA_SECTIONS[4].hint,
            state: rail[4].state,
            lockReason,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                AssessorAutocomplete,
                {
                  focusKey: "sa.assessor1Name",
                  label: "Assessor 1 — name",
                  value: draft.assessor1Name,
                  designation: draft.assessor1Designation,
                  onDesignationChange: (v) => set("assessor1Designation", v),
                  designations,
                  phone: draft.assessor1Phone,
                  onPhoneChange: (v) => set("assessor1Phone", v),
                  maskPhone: maskPhones,
                  hud: draft.assessor1Hud,
                  onHudChange: (v) => set("assessor1Hud", v),
                  huds: assessorHuds,
                  suggestions,
                  hudByName,
                  onChange: (v) => applyAssessorName(1, v),
                  disabled,
                  error: byField.assessor1Name,
                  history: h("Name of Assessor 1")
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-4" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                AssessorAutocomplete,
                {
                  focusKey: "sa.assessor2Name",
                  label: "Assessor 2 — name",
                  value: draft.assessor2Name,
                  designation: draft.assessor2Designation,
                  onDesignationChange: (v) => set("assessor2Designation", v),
                  designations,
                  phone: draft.assessor2Phone,
                  onPhoneChange: (v) => set("assessor2Phone", v),
                  maskPhone: maskPhones,
                  hud: draft.assessor2Hud,
                  onHudChange: (v) => set("assessor2Hud", v),
                  huds: assessorHuds,
                  suggestions,
                  hudByName,
                  onChange: (v) => applyAssessorName(2, v),
                  disabled,
                  error: byField.assessor2Name,
                  history: h("Name of Assessor 2")
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(UpdatedFooter, { audits, table: SA_TABLE })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          FormSection,
          {
            id: "sa-documents",
            index: 6,
            title: "Documents",
            hint: SA_SECTIONS[5].hint,
            state: rail[5].state,
            lockReason,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  DocumentSlot,
                  {
                    facilityId,
                    docKey: "SA_Report",
                    canEdit: !disabled
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  DocumentSlot,
                  {
                    facilityId,
                    docKey: "SA_Checklist",
                    canEdit: !disabled
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-1.5 text-[13px] font-medium text-muted-foreground", children: "SaQsham Documents Status" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "div",
                  {
                    "data-focus": "sa.generalDocStatus",
                    tabIndex: -1,
                    "data-testid": "sa-docs-strip",
                    role: "list",
                    "aria-label": `SaQsham Documents Status: ${resultDeclared ? "Result Declared" : docStageLabel(draft.generalDocStatus) || "Not recorded"}`,
                    className: "flex flex-wrap items-center gap-1.5",
                    children: [
                      (() => {
                        const currentIdx = resultDeclared ? statuses.length : statuses.findIndex((stage) => stage === draft.generalDocStatus);
                        return statuses.map((stage, i) => {
                          const done = currentIdx > i;
                          const current = currentIdx === i;
                          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                            "span",
                            {
                              role: "listitem",
                              "data-stage-state": current ? "current" : done ? "done" : "todo",
                              className: cn(
                                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                                current ? "border-primary bg-primary text-primary-foreground shadow-sm" : done ? "border-emerald-300/70 bg-emerald-50 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-200" : "border-border/70 bg-background text-muted-foreground"
                              ),
                              children: [
                                done && /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3 shrink-0", "aria-hidden": true }),
                                docStageLabel(stage)
                              ]
                            },
                            stage
                          );
                        });
                      })(),
                      resultDeclared && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        "span",
                        {
                          role: "listitem",
                          "data-stage-state": "current",
                          "data-testid": "sa-result-declared",
                          className: "inline-flex items-center gap-1 rounded-full border border-emerald-300/70 bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-100",
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "size-3 shrink-0", "aria-hidden": true }),
                            " Result Declared"
                          ]
                        }
                      )
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: resultDeclared ? "Set automatically because the NQAS result is declared. Change the certification status in NQAS Assessment to edit the portal status." : "Set by the SaQsham import." })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                UpdatedFooter,
                {
                  audits,
                  table: SA_TABLE,
                  extraTables: ["facilityDocuments"]
                }
              )
            ]
          }
        )
      ] })
    ] }),
    !disabled && /* @__PURE__ */ jsxRuntimeExports.jsx(
      StickySaveBar,
      {
        dirtyCount,
        busy,
        lastSavedAt: lastSA ? `Last changed ${toLongDisplayDate(
          new Date(lastSA.when).toISOString().slice(0, 10)
        )} · ${lastSA.who}` : null,
        onSave: () => void doSave(),
        onDiscard: doDiscard,
        saveLabel: "Save state assessment"
      }
    )
  ] });
}
const NQAS_TABLE = "nationalAssessments";
function nqasToDraft(n) {
  return {
    scheduledStartDate: n.scheduledStartDate ?? "",
    scheduledEndDate: n.scheduledEndDate ?? "",
    actualStartDate: n.actualStartDate ?? "",
    actualEndDate: n.actualEndDate ?? "",
    mode: n.mode ?? "",
    checklistVersion: n.checklistVersion ?? "",
    departments: n.departments ?? [],
    scopeOption: n.scopeOption ?? "",
    certificationStatus: n.certificationStatus ?? "",
    certificationDate: n.certificationDate ?? n.goiLetterDate ?? "",
    scorePercent: n.scorePercent != null ? String(n.scorePercent) : n.manualScore != null ? String(n.manualScore) : ""
  };
}
function NqasForm({
  nqas,
  facilityId,
  cycleId,
  cycleNumber,
  modes,
  checklists,
  scopeOptions,
  certStatuses,
  settings,
  saCompleted,
  disabled,
  lockReason,
  audits,
  onStartCycle,
  startCycleLabel,
  onSave
}) {
  const draftKey = `nqas:na-draft:${facilityId}:${cycleId}`;
  const initial = reactExports.useMemo(() => nqasToDraft(nqas), [nqas]);
  const { draft, set, setDraft, dirtyCount, discard } = useDraft(
    draftKey,
    initial
  );
  const [busy, setBusy] = reactExports.useState(false);
  const undoRef = reactExports.useRef(null);
  const documents = useQuery(api.documents.listForFacility, {
    facilityId,
    cycleNo: cycleNumber
  });
  const resultDocRule = documents?.requirements?.["NQAS_Result"] ?? null;
  const resultDocUploaded = !!documents?.documents?.find(
    (d) => (d.key === "NQAS_Result" || d.key === "NQAS_Certificate") && d.current
  )?.current;
  const uploadedDocKeys = new Set(
    (documents?.documents ?? []).filter((d) => d.current).map((d) => d.key)
  );
  const [canUndo, setCanUndo] = reactExports.useState(false);
  const today = todayLocalIso();
  const s = { ...DEFAULT_SETTINGS, ...settings ?? {} };
  const [sameAsScheduled, setSameAsScheduled] = reactExports.useState(
    () => datesMatchSchedule(
      nqas.scheduledStartDate ?? "",
      nqas.scheduledEndDate ?? "",
      nqas.actualStartDate ?? "",
      nqas.actualEndDate ?? ""
    )
  );
  reactExports.useEffect(() => {
    if (!sameAsScheduled) return;
    const copied = copyScheduleToVisit(
      draft.scheduledStartDate,
      draft.scheduledEndDate
    );
    if (!copied) {
      setSameAsScheduled(false);
      return;
    }
    if (draft.actualStartDate !== copied.actualStartDate || draft.actualEndDate !== copied.actualEndDate) {
      setDraft((f) => ({ ...f, ...copied }));
    }
  }, [
    sameAsScheduled,
    draft.scheduledStartDate,
    draft.scheduledEndDate,
    draft.actualStartDate,
    draft.actualEndDate,
    setDraft
  ]);
  const naDone = !!draft.actualEndDate || !!draft.actualStartDate || nqas.status === "Completed";
  const naScheduled = !!draft.scheduledStartDate || !!draft.scheduledEndDate;
  const derivedStatus = naDone ? "Completed" : naScheduled ? "Scheduled" : "Pending";
  const statusLabel = naDone ? "NQAS Completed" : naScheduled ? "NQAS Scheduled" : "NQAS Pending";
  const statusTone = naDone ? "purple" : naScheduled ? "blue" : "grey";
  const issues = reactExports.useMemo(() => {
    const base = validateNqasDraft(draft, {
      today,
      saCompleted,
      resultDocRule: resultDocRule ? {
        required: resultDocRule.required,
        blocking: resultDocRule.blocking,
        label: "NQAS Result"
      } : null,
      resultDocUploaded
    });
    if (nqas.scorePercent != null && draft.scorePercent === "") {
      base.push({
        field: "nqas.scorePercent",
        label: "Score %",
        message: `A recorded score can't be removed by clearing the box — enter the score again (it was ${nqas.scorePercent}%).`
      });
    }
    return base;
  }, [draft, today, saCompleted, nqas.scorePercent, resultDocRule, resultDocUploaded]);
  const byField = issuesByField(issues);
  const durationDays = draft.actualStartDate && draft.actualEndDate ? Math.round(
    (Date.parse(draft.actualEndDate) - Date.parse(draft.actualStartDate)) / 864e5
  ) : null;
  const onSchedStartChange = (value) => set("scheduledStartDate", value);
  const onSchedEndChange = (value) => set("scheduledEndDate", value);
  const onSameAsScheduledChange = (on) => {
    setSameAsScheduled(on);
    if (!on) {
      setDraft((f) => ({ ...f, actualStartDate: "", actualEndDate: "" }));
      return;
    }
    const copied = copyScheduleToVisit(
      draft.scheduledStartDate,
      draft.scheduledEndDate
    );
    if (copied) setDraft((f) => ({ ...f, ...copied }));
  };
  const onStartDateChange = (value) => set("actualStartDate", value);
  const onEndDateChange = (value) => set("actualEndDate", value);
  const derived = computeDerivedNqas(
    {
      certificationStatus: draft.certificationStatus || void 0,
      certificationDate: draft.certificationDate || void 0,
      goiLetterDate: draft.certificationDate || void 0,
      actualEndDate: nqas.actualEndDate
    },
    s
  );
  const validTill = draft.certificationDate ? derived.validityDate : null;
  const doSave = async () => {
    let effective = draft;
    if (sameAsScheduled) {
      const copied = copyScheduleToVisit(
        effective.scheduledStartDate,
        effective.scheduledEndDate
      );
      if (copied) effective = { ...effective, ...copied };
    }
    const effectiveIssues = validateNqasDraft(effective, {
      today,
      saCompleted,
      resultDocRule: resultDocRule ? { required: resultDocRule.required, blocking: resultDocRule.blocking, label: "NQAS Result" } : null,
      resultDocUploaded
    });
    if (naDone && (!effective.actualStartDate || !effective.actualEndDate) && !effectiveIssues.some((issue) => issue.field === "nqas.actualStartDate")) {
      effectiveIssues.push({
        field: "nqas.actualStartDate",
        label: "Actual dates",
        message: "A completed assessment needs both actual dates. Enter the actual start date and actual end date before saving."
      });
    }
    if (effectiveIssues.length > 0) {
      toast.error(`Fix ${effectiveIssues.length} issue${effectiveIssues.length === 1 ? "" : "s"} first`, {
        description: effectiveIssues[0].message
      });
      focusField(effectiveIssues[0].field);
      return;
    }
    undoRef.current = { ...initial };
    setCanUndo(true);
    if (derivedStatus !== nqas.status) {
      toast.info(
        `This will change NQAS Status to “${derivedStatus}” — Facility Current Status, Eligibility and the master-list columns update automatically.`
      );
    }
    if (draft.certificationStatus !== (nqas.certificationStatus ?? "") && draft.certificationStatus) {
      toast.info(
        `This will change NQAS Certification Status to “${draft.certificationStatus}”${validTill ? ` and validity till ${dmy(validTill)}` : ""}.`
      );
    }
    const payload = {
      status: derivedStatus,
      scheduledStartDate: effective.scheduledStartDate,
      scheduledEndDate: effective.scheduledEndDate,
      actualStartDate: effective.actualStartDate,
      actualEndDate: effective.actualEndDate,
      dateSource: sameAsScheduled ? "same as scheduled" : void 0,
      mode: draft.mode,
      checklistVersion: draft.checklistVersion,
      scopeOption: draft.scopeOption ?? "",
      // Legacy departments are intentionally not sent: the stored data stays
      // exactly as it was and the hidden field is replaced by scopeOption.
      certificationStatus: draft.certificationStatus,
      certificationDate: draft.certificationDate,
      goiLetterDate: draft.certificationDate,
      scorePercent: draft.scorePercent === "" ? void 0 : Number(draft.scorePercent)
    };
    setBusy(true);
    try {
      await onSave(payload);
      clearDraft(draftKey);
      toast.success("NQAS assessment saved");
    } catch (err) {
      saveDraft(draftKey, draft);
      showSaveError(err);
    } finally {
      setBusy(false);
    }
  };
  const doDiscard = () => {
    discard();
    setSameAsScheduled(
      datesMatchSchedule(
        initial.scheduledStartDate,
        initial.scheduledEndDate,
        initial.actualStartDate,
        initial.actualEndDate
      )
    );
    toast("Changes discarded", { description: "Back to the last saved values." });
  };
  const rail = NQAS_SECTIONS.map((s2) => ({
    id: s2.id,
    title: s2.title,
    state: sectionState(
      NQAS_FIELDS,
      s2.id,
      issues,
      withDocumentPresence(draft, uploadedDocKeys, {
        resultDocumentId: "NQAS_Result"
      })
    )
  }));
  const h = (key) => historyFor(audits, NQAS_TABLE, key);
  const lastNA = lastTouched(audits, NQAS_TABLE);
  const quickItems = [
    {
      label: "Undo last save",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Undo2, { className: "size-4" }),
      disabled: !canUndo || disabled,
      onSelect: () => {
        if (undoRef.current) {
          const restored = { ...initial, ...undoRef.current };
          setDraft(restored);
          setSameAsScheduled(
            datesMatchSchedule(
              restored.scheduledStartDate,
              restored.scheduledEndDate,
              restored.actualStartDate,
              restored.actualEndDate
            )
          );
          toast.info("Last save restored in the form", {
            description: "Press Save to write the restored values back."
          });
        }
      }
    },
    ...onStartCycle ? [
      {
        label: startCycleLabel ?? "Start new cycle",
        icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CalendarPlus, { className: "size-4" }),
        disabled,
        separatorBefore: true,
        onSelect: onStartCycle
      }
    ] : [],
    ...NQAS_SECTIONS.map((s2) => ({
      label: `Reset section: ${s2.title}`,
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { className: "size-4" }),
      disabled,
      separatorBefore: s2.id === "schedule",
      onSelect: () => {
        setDraft((f) => {
          const next = { ...f };
          for (const d of NQAS_FIELDS.filter((x) => x.section === s2.id)) {
            next[d.key] = Array.isArray(f[d.key]) ? [] : "";
          }
          return next;
        });
        if (s2.id === "visit") setSameAsScheduled(false);
        toast.info(`“${s2.title}” reset in the form — Save to persist`);
      }
    })),
    {
      label: "Mark not applicable (clear whole form)",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { className: "size-4" }),
      disabled,
      separatorBefore: true,
      danger: true,
      onSelect: () => {
        setDraft(
          emptyDraft(draft, ["departments"])
        );
        setSameAsScheduled(false);
        toast.info("Form cleared — Save to record the assessment as not applicable");
      }
    },
    {
      label: "Print facility profile",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Printer, { className: "size-4" }),
      separatorBefore: true,
      onSelect: () => window.print()
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4 pb-28", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(ValidationSummary, { issues }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-w-0 flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        StatusBanner,
        {
          label: statusLabel,
          tone: statusTone,
          rule: naDone ? "“NQAS Completed” when the assessment has an actual end date (or the record was already completed). A completed assessment must record both actual dates and its score — and it can never be completed while this cycle's State Assessment is not marked Completed." : naScheduled ? "“NQAS Scheduled” because scheduled dates are set. After the visit, fill the actual dates and score." : "“NQAS Pending” until the assessment is scheduled under §1 Schedule."
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(QuickActionsMenu, { items: quickItems })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 lg:grid-cols-[13rem_minmax(0,1fr)]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(SectionRail, { sections: rail }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          FormSection,
          {
            id: "nqas-schedule",
            index: 1,
            title: "Schedule",
            hint: NQAS_SECTIONS[0].hint,
            state: rail[0].state,
            lockReason,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                ScheduleVisitFields,
                {
                  kind: "nqas",
                  today,
                  canEdit: !disabled,
                  scheduledStart: draft.scheduledStartDate,
                  scheduledEnd: draft.scheduledEndDate,
                  originalScheduledDate: nqas.originalScheduledStartDate,
                  errors: byField,
                  history: h,
                  onScheduledStartChange: onSchedStartChange,
                  onScheduledEndChange: onSchedEndChange
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(UpdatedFooter, { audits, table: NQAS_TABLE })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          FormSection,
          {
            id: "nqas-visit",
            index: 2,
            title: "Visit",
            hint: NQAS_SECTIONS[1].hint,
            state: rail[1].state,
            lockReason,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                VisitDatesFields,
                {
                  kind: "nqas",
                  today,
                  canEdit: !disabled,
                  scheduledStart: draft.scheduledStartDate,
                  scheduledEnd: draft.scheduledEndDate,
                  actualStart: draft.actualStartDate,
                  actualEnd: draft.actualEndDate,
                  sameAsScheduled,
                  durationDays,
                  errors: byField,
                  history: h,
                  onSameAsScheduledChange,
                  onActualStartChange: onStartDateChange,
                  onActualEndChange: onEndDateChange
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 grid gap-4 sm:grid-cols-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  SegmentedControl,
                  {
                    focusKey: "nqas.mode",
                    label: "Mode",
                    value: draft.mode,
                    onChange: (v) => set("mode", v),
                    options: modes,
                    disabled,
                    error: byField.mode,
                    helper: "How the assessment team visited."
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  FieldFrame,
                  {
                    focusKey: "nqas.checklistVersion",
                    label: "Checklist version",
                    error: byField.checklistVersion,
                    children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      Select,
                      {
                        value: draft.checklistVersion || "__none",
                        onValueChange: (v) => set("checklistVersion", v === "__none" ? "" : v),
                        disabled,
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "glass-input min-h-11 w-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Select version" }) }),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "__none", children: "—" }),
                            checklists.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: c, children: c }, c))
                          ] })
                        ]
                      }
                    )
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(UpdatedFooter, { audits, table: NQAS_TABLE })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          FormSection,
          {
            id: "nqas-scope",
            index: 3,
            title: "Scope",
            hint: "Which scope was assessed?",
            collapsedHint: draft.scopeOption || "-",
            state: rail[2].state,
            lockReason,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                ScopeChoiceCards,
                {
                  focusKey: "nqas.scopeOption",
                  value: draft.scopeOption ?? "",
                  options: scopeOptions,
                  disabled,
                  error: byField.scopeOption,
                  onChange: (v) => set("scopeOption", v)
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(UpdatedFooter, { audits, table: NQAS_TABLE })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          FormSection,
          {
            id: "nqas-outcome",
            index: 4,
            title: "Outcome",
            hint: NQAS_SECTIONS[3].hint,
            state: rail[3].state,
            lockReason,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  ScoreInput,
                  {
                    focusKey: "nqas.scorePercent",
                    label: "Score %",
                    value: draft.scorePercent,
                    onChange: (v) => set("scorePercent", v),
                    disabled,
                    error: byField.scorePercent,
                    requiredForStatus: true,
                    history: h("NQAS Score %")
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  DateField,
                  {
                    focusKey: "nqas.certificationDate",
                    label: "GoI Letter Date / Certification date",
                    value: draft.certificationDate,
                    onChange: (v) => set("certificationDate", v),
                    disabled,
                    disabledReason: disabled ? "View only — you do not have edit access" : void 0,
                    max: today,
                    requiredForStatus: true,
                    error: byField.certificationDate,
                    helper: "One date drives the letter date, certification date and the validity below.",
                    history: h("GoI Letter Date")
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                SegmentedControl,
                {
                  focusKey: "nqas.certificationStatus",
                  label: "Certification status",
                  value: draft.certificationStatus,
                  onChange: (v) => set("certificationStatus", v),
                  options: certStatuses,
                  disabled,
                  cards: true,
                  error: byField.certificationStatus,
                  helper: "Pick the result printed on the NQAS letter."
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Label, { className: "text-sm", children: [
                  "Validity & surveillance",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1.5 text-xs font-normal text-muted-foreground", children: "Auto" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    ValidityTimeline,
                    {
                      certifiedOn: draft.certificationDate || null,
                      surveillance1: derived.surveillanceDue1,
                      surveillance2: derived.surveillanceDue2,
                      expires: validTill,
                      formula: `Validity = GoI letter date + ${s.certificationValidityYears} years for “Quality Certified”, + ${s.conditionalValidityYears} year for “Conditionality”. 1st surveillance = letter date + ${s.surveillanceIntervalsMonths} months; 2nd surveillance = + ${s.surveillanceIntervalsMonths * 2} months. Ranges are configured by the State Admin.`
                    }
                  ),
                  draft.certificationStatus === "Deferred" && validTill && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-xs text-muted-foreground", children: [
                    "Deferred — cooling period ends ",
                    dmy(validTill),
                    " (",
                    s.deferredCooldownMonths,
                    " months from the letter date)."
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(UpdatedFooter, { audits, table: NQAS_TABLE })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          FormSection,
          {
            id: "nqas-documents",
            index: 5,
            title: "Documents",
            hint: NQAS_SECTIONS[4].hint,
            state: rail[4].state,
            lockReason,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-w-xl", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                DocumentSlot,
                {
                  facilityId,
                  docKey: "NQAS_Result",
                  cycleNo: cycleNumber,
                  lockCycle: true,
                  canEdit: !disabled
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                UpdatedFooter,
                {
                  audits,
                  table: NQAS_TABLE,
                  extraTables: ["facilityDocuments"]
                }
              )
            ]
          }
        )
      ] })
    ] }),
    !disabled && /* @__PURE__ */ jsxRuntimeExports.jsx(
      StickySaveBar,
      {
        dirtyCount,
        busy,
        lastSavedAt: lastNA ? `Last changed ${toLongDisplayDate(
          new Date(lastNA.when).toISOString().slice(0, 10)
        )} · ${lastNA.who}` : null,
        onSave: () => void doSave(),
        onDiscard: doDiscard,
        saveLabel: "Save NQAS assessment"
      }
    )
  ] });
}

function IaQuarterlyPanel({
  facilityId,
  className,
  settings,
  userId,
  canImport
}) {
  const quarters = useQuery(api.ia.listFacilityIaQuarters, {
    facilityId
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: `glass overflow-hidden ${className ?? ""}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "p-4", children: quarters === void 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(IaCardSkeleton, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(
    IACard,
    {
      rows: quarters,
      settings,
      userId,
      canImport: canImport ?? false
    }
  ) }) });
}

const ELIGIBILITIES = ["Eligible", "Not Eligible", "Possible"];
function FacilityProfile() {
  const params = useParams();
  const facilityId = params["*"]?.split("/")[0] || null;
  const navigate = useNavigate();
  const data = useQuery(
    api.facilities.getFacilityProfile,
    facilityId ? { facilityId } : "skip"
  );
  const iaQuarters = useQuery(
    api.ia.listFacilityIaQuarters,
    facilityId ? { facilityId } : "skip"
  );
  const docs = useQuery(
    api.documents.listForFacility,
    facilityId ? { facilityId } : "skip"
  );
  const updateFacility = useMutation(api.facilities.updateFacility);
  const updateSA = useMutation(api.facilities.updateStateAssessment).withOptimisticUpdate(
    (store, args) => {
      const key = { facilityId: args.facilityId };
      const profile = store.getQuery(api.facilities.getFacilityProfile, key);
      if (!profile) return;
      store.setQuery(api.facilities.getFacilityProfile, key, {
        ...profile,
        cycles: profile.cycles.map(
          (row) => row.cycle.cycleNumber === profile.facility.currentCycleNumber && row.sa ? {
            ...row,
            sa: {
              ...row.sa,
              ...args.status !== void 0 ? { status: args.status } : {},
              ...args.scheduledDate !== void 0 ? { scheduledDate: args.scheduledDate } : {},
              ...args.actualStartDate !== void 0 ? { actualStartDate: args.actualStartDate } : {},
              ...args.actualEndDate !== void 0 ? { actualEndDate: args.actualEndDate } : {},
              ...args.scopeOption !== void 0 ? { scopeOption: args.scopeOption } : {},
              ...args.scorePercent !== void 0 ? { scorePercent: args.scorePercent } : {}
            }
          } : row
        )
      });
    }
  );
  const ensureNqas = useMutation(api.facilities.ensureNqasRecord);
  const updateNqas = useMutation(api.facilities.updateNationalAssessment).withOptimisticUpdate(
    (store, args) => {
      const key = { facilityId: args.facilityId };
      const profile = store.getQuery(api.facilities.getFacilityProfile, key);
      if (!profile) return;
      store.setQuery(api.facilities.getFacilityProfile, key, {
        ...profile,
        cycles: profile.cycles.map(
          (row) => row.cycle.cycleNumber === profile.facility.currentCycleNumber && row.nqas ? {
            ...row,
            nqas: {
              ...row.nqas,
              ...args.status !== void 0 ? { status: args.status } : {},
              ...args.scheduledStartDate !== void 0 ? { scheduledStartDate: args.scheduledStartDate } : {},
              ...args.scheduledEndDate !== void 0 ? { scheduledEndDate: args.scheduledEndDate } : {},
              ...args.actualStartDate !== void 0 ? { actualStartDate: args.actualStartDate } : {},
              ...args.actualEndDate !== void 0 ? { actualEndDate: args.actualEndDate } : {},
              ...args.mode !== void 0 ? { mode: args.mode } : {},
              ...args.scopeOption !== void 0 ? { scopeOption: args.scopeOption } : {},
              ...args.scorePercent !== void 0 ? { scorePercent: args.scorePercent } : {},
              ...args.certificationStatus !== void 0 ? { certificationStatus: args.certificationStatus } : {},
              ...args.certificationDate !== void 0 ? { certificationDate: args.certificationDate } : {},
              ...args.goiLetterDate !== void 0 ? { goiLetterDate: args.goiLetterDate } : {}
            }
          } : row
        )
      });
    }
  );
  const startNewCycle = useMutation(api.facilities.startNewCycle);
  const deleteCycle = useMutation(api.facilities.deleteCycle);
  const deleteFacility = useMutation(api.facilities.deleteFacility);
  const saveFund = useMutation(api.modules.saveFund);
  const updateFund = useMutation(api.modules.updateFund);
  const deleteFund = useMutation(api.modules.deleteFund);
  const saveNoc = useMutation(api.modules.saveFireNoc);
  const updateNoc = useMutation(api.modules.updateFireNoc);
  const deleteNoc = useMutation(api.modules.deleteFireNoc);
  const saveBuilding = useMutation(api.modules.saveBuilding);
  const [pendingCycleAction, setPendingCycleAction] = reactExports.useState(null);
  const [cycleActionDone, setCycleActionDone] = reactExports.useState(null);
  const runCycleAction = async (key, successLabel, run, toastMsg) => {
    setPendingCycleAction(key);
    try {
      await run();
      if (toastMsg) toast.success(toastMsg);
      setCycleActionDone(successLabel);
      setPendingCycleAction(null);
      setTimeout(() => setCycleActionDone(null), 2500);
    } catch (err) {
      setPendingCycleAction(null);
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };
  const updateBuilding = useMutation(api.modules.updateBuilding);
  const deleteBuilding = useMutation(api.modules.deleteBuilding);
  const [editOpen, setEditOpen] = reactExports.useState(false);
  const [tab, setTab] = reactExports.useState("overview");
  const [overviewCycle, setOverviewCycle] = reactExports.useState(null);
  const [docPreselect, setDocPreselect] = reactExports.useState(null);
  const [searchParams] = useSearchParams();
  const deepDoc = searchParams.get("doc");
  const deepOpened = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!docs || !deepDoc || !facilityId) return;
    const key = `${facilityId}:${deepDoc}`;
    if (deepOpened.current === key) return;
    if (!(docs.documents ?? []).some((d) => d.key === deepDoc)) return;
    deepOpened.current = key;
    const timer = window.setTimeout(() => {
      document.getElementById("documents")?.scrollIntoView?.({ block: "start", behavior: "smooth" });
      setDocPreselect(deepDoc);
    }, 60);
    return () => window.clearTimeout(timer);
  }, [docs, deepDoc, facilityId]);
  const documentsSection = () => document.getElementById("documents") ?? null;
  const openDocuments = (docKey) => {
    documentsSection()?.scrollIntoView?.({ block: "start", behavior: "smooth" });
    if (docKey) setDocPreselect(docKey);
  };
  const [deleteOpen, setDeleteOpen] = reactExports.useState(false);
  const [confirmName, setConfirmName] = reactExports.useState("");
  const [auditUser, setAuditUser] = reactExports.useState("all");
  const [auditModule, setAuditModule] = reactExports.useState("all");
  const [auditFrom, setAuditFrom] = reactExports.useState("");
  const [auditTo, setAuditTo] = reactExports.useState("");
  const { user } = useAuth();
  const generatedBy = user?.name || user?.email || "NQAS Tracker user";
  const derived = reactExports.useMemo(() => {
    if (!data) return null;
    const facility2 = data.facility;
    const active2 = data.cycles.find((c) => !c.cycle.superseded) ?? data.cycles[data.cycles.length - 1] ?? null;
    const lifecycleState2 = getLifecycleState({
      facility: facility2,
      activeCycle: active2 ? {
        cycleNumber: active2.cycle.cycleNumber,
        cycleType: active2.cycle.cycleType,
        sa: active2.sa,
        nqas: active2.nqas
      } : null,
      funds: data.funds,
      s: data.settings
    });
    const completeness2 = profileCompleteness({
      facility: facility2,
      activeCycle: active2 ? { cycleNumber: active2.cycle.cycleNumber } : null
    });
    const exportData2 = buildProfileExportData({
      facility: facility2,
      cycles: data.cycles,
      funds: data.funds,
      nocs: data.nocs,
      buildings: data.buildings,
      audits: data.audits,
      settings: data.settings,
      iaQuarters: iaQuarters ?? [],
      generatedBy
    });
    const sheetRow2 = masterRowFromProfile({
      facility: facility2,
      cycles: data.cycles,
      funds: data.funds,
      nocs: data.nocs,
      buildings: data.buildings,
      iaQuarters: iaQuarters ?? [],
      fireNocAlertLeadDays: data.settings?.fireNocAlertLeadDays ?? null,
      documents: (docs?.documents ?? []).map((d) => ({
        key: d.key,
        originalName: d.current?.displayName ?? d.current?.originalName ?? null,
        uploadedAt: d.current?.uploadedAt ?? null,
        requirement: d.requirement ?? null
      })),
      requiredMissing: (docs?.requiredMissing ?? []).map((key) => ({
        key,
        label: (docs?.documents ?? []).find((d) => d.key === key)?.label ?? key.replace(/_/g, " "),
        blocking: (docs?.blockingMissing ?? []).includes(key)
      }))
    });
    const dayOf = (ts) => new Date(ts).toISOString().slice(0, 10);
    const filteredAudits2 = data.audits.filter((a) => {
      const who = a.changedByName ?? "System";
      const module = a.table ?? a.action;
      if (auditUser !== "all" && who !== auditUser) return false;
      if (auditModule !== "all" && module !== auditModule) return false;
      if (auditFrom && dayOf(a.changedAt) < auditFrom) return false;
      if (auditTo && dayOf(a.changedAt) > auditTo) return false;
      return true;
    });
    const auditUsers2 = [...new Set(data.audits.map((a) => a.changedByName ?? "System"))].sort();
    const auditModules2 = [...new Set(data.audits.map((a) => a.table ?? a.action))].sort();
    const today = todayLocalIso();
    const view2 = overviewCycle != null ? data.cycles.find((c) => c.cycle.cycleNumber === overviewCycle) ?? active2 : active2;
    const uploadedDocKeys = new Set(
      (docs?.documents ?? []).filter((d) => d.current).map((d) => d.key)
    );
    const attention2 = needsAttention({
      sa: view2?.sa ? { ...view2.sa, hasReportDocument: uploadedDocKeys.has("SA_Report") } : null,
      nqas: view2?.nqas ? { ...view2.nqas, hasResultDocument: uploadedDocKeys.has("NQAS_Result") } : null,
      nocs: data.nocs.map((n) => ({
        expiryDate: n.expiryDate ?? null,
        status: n.status ?? null
      })),
      funds: data.funds,
      settings: data.settings,
      today
    });
    const summaries2 = sectionSummaries({
      sa: view2?.sa ?? null,
      nqas: view2?.nqas ?? null,
      funds: data.funds.map((f) => ({
        status: f.status,
        amountSanctioned: f.amountSanctioned ?? null,
        financialYear: f.financialYear ?? null
      })),
      nocs: data.nocs.map((n) => ({ expiryDate: n.expiryDate ?? null, status: n.status ?? null })),
      buildings: data.buildings.map((b) => ({
        buildingStatus: b.buildingStatus ?? null,
        buildingType: b.buildingType ?? null
      })),
      settings: data.settings,
      today
    });
    const surv2 = nextSurveillance(view2?.nqas ?? null, data.settings, today);
    const latestFund = data.funds.length ? data.funds[data.funds.length - 1] : null;
    const fundKpi2 = {
      total: data.funds.reduce((a, f) => a + (f.amountSanctioned ?? 0), 0),
      year: latestFund?.financialYear ?? null,
      open: data.funds.filter((f) => f.status === "Pending" || f.status === "Returned").length
    };
    const latestNoc = data.nocs.length ? data.nocs[data.nocs.length - 1] : null;
    const fireNoc2 = (() => {
      const label = deriveFireNocStatus$1(
        latestNoc?.nocAvailable ?? null,
        latestNoc?.expiryDate ?? null,
        latestNoc?.status ?? null
      );
      const tone = label === "Valid" ? "green" : label === "Expiring Soon" ? "amber" : label === "Expired" ? "red" : "grey";
      return { label, tone };
    })();
    const assessorsPool = data.cycles.flatMap((c) => {
      const s = c.sa;
      if (!s) return [];
      return [
        ...s.assessor1Name ? [{
          name: s.assessor1Name,
          designation: s.assessor1Designation ?? "",
          phone: s.assessor1Phone ?? "",
          hud: s.assessor1Hud ?? ""
        }] : [],
        ...s.assessor2Name ? [{
          name: s.assessor2Name,
          designation: s.assessor2Designation ?? "",
          phone: s.assessor2Phone ?? "",
          hud: s.assessor2Hud ?? ""
        }] : []
      ];
    });
    return {
      active: active2,
      lifecycleState: lifecycleState2,
      completeness: completeness2,
      exportData: exportData2,
      sheetRow: sheetRow2,
      filteredAudits: filteredAudits2,
      auditUsers: auditUsers2,
      auditModules: auditModules2,
      view: view2,
      attention: attention2,
      summaries: summaries2,
      surv: surv2,
      fundKpi: fundKpi2,
      fireNoc: fireNoc2,
      assessorPool: assessorsPool
    };
  }, [data, docs, iaQuarters, generatedBy, auditUser, auditModule, auditFrom, auditTo, overviewCycle]);
  if (data === void 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(AppShell, { title: "Facility", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "mb-3 h-28 w-full rounded-xl" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6", children: Array.from({ length: 6 }).map((_, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-20 rounded-xl" }, i)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 lg:grid-cols-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-72 rounded-xl lg:col-span-2" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-72 rounded-xl" })
      ] })
    ] });
  }
  if (data === null) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(AppShell, { title: "Facility not found", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass mx-auto max-w-md rounded-xl border border-border/60 p-6 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "mx-auto size-6 text-amber-500" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-sm text-muted-foreground", children: "This facility does not exist or is outside your assigned blocks." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { asChild: true, variant: "outline", size: "sm", className: "mt-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/facilities", children: "Back to the facility list" }) })
    ] }) });
  }
  const { facility, cycles, audits, settings, me } = data;
  const savedListUrl = loadLastListUrl();
  const backToList = savedListUrl && savedListUrl.startsWith("/facilities?") ? savedListUrl : "/facilities";
  const blockListUrl = `/facilities?block=${encodeURIComponent(facility.block ?? "")}`;
  const {
    active,
    lifecycleState,
    completeness,
    exportData,
    sheetRow,
    filteredAudits,
    auditUsers,
    auditModules,
    view,
    attention,
    summaries,
    surv,
    fundKpi,
    fireNoc,
    assessorPool
  } = derived;
  const canEdit = me.appRole === "admin" || me.appRole === "entry";
  const assessorPhoneVisibility = settings.assessorPhoneVisibility ?? "role";
  const docStatuses = settings.generalDocStatuses ?? DEFAULT_SETTINGS.generalDocStatuses;
  const modes = settings.assessmentModes ?? DEFAULT_SETTINGS.assessmentModes;
  const checklists = settings.checklistVersions ?? DEFAULT_SETTINGS.checklistVersions;
  const scopeOptions = settings.scopeOptions ?? DEFAULT_SETTINGS.scopeOptions;
  const certStatuses = settings.certificationStatuses ?? DEFAULT_SETTINGS.certificationStatuses;
  const fundStatuses = settings.fundStatuses ?? DEFAULT_SETTINGS.fundStatuses;
  const buildingStatuses = settings.buildingStatuses ?? DEFAULT_SETTINGS.buildingStatuses;
  const assessorHuds = settings.assessorHuds ?? DEFAULT_SETTINGS.assessorHuds;
  const slug = facility.name.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
  const fileBase = `${slug || "facility"}-${facility.ninNumber ?? "no-nin"}`;
  const onExportPdf = () => {
    openPrintSheet({ row: sheetRow, audits, generatedBy });
  };
  const onExportExcel = async () => {
    try {
      await exportProfileExcel(exportData, fileBase);
      toast.success("Facility Profile Excel exported (7 sheets)");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Excel export failed");
    }
  };
  const onPrint = () => window.print();
  const exportAuditExcel = async () => {
    try {
      await exportExcelWorkbook(
        [
          {
            title: "Audit Trail",
            header: ["When (IST)", "User", "Module", "Field / change", "From", "To"],
            rows: filteredAudits.map((a) => [
              istStamp(new Date(a.changedAt)),
              a.changedByName ?? "System",
              a.table ?? a.action,
              String(a.field ?? a.action).slice(0, 120),
              a.oldValue != null ? String(a.oldValue).slice(0, 300) : "",
              a.newValue != null ? String(a.newValue).slice(0, 300) : ""
            ]),
            textCols: [4, 5]
          }
        ],
        {
          facilityName: `${facility.name} (NIN ${facility.ninNumber ?? "—"})`,
          generatedAt: istStamp(),
          generatedBy
        },
        (buf) => {
          const blob = new Blob([buf], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${fileBase}-audit.xlsx`;
          a.click();
          URL.revokeObjectURL(url);
        }
      );
      toast.success(
        filteredAudits.length !== audits.length ? `Audit trail exported (${filteredAudits.length} of ${audits.length} entries)` : "Audit trail exported"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Audit export failed");
    }
  };
  const copyNin = async () => {
    if (!facility.ninNumber) return;
    try {
      await navigator.clipboard.writeText(facility.ninNumber);
      toast.success("NIN copied");
    } catch {
      toast.error("Could not copy the NIN");
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    AppShell,
    {
      title: facility.name,
      subtitle: `${facility.facilityType} · ${facility.block} / ${facility.phc}`,
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(StatusChip, { label: lifecycleState.chip.label, tone: lifecycleState.chip.tone }),
        lifecycleState.nextAction.cta && lifecycleState.nextAction.targetTab && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", className: "gap-1.5", onClick: () => setTab(lifecycleState.nextAction.targetTab), children: [
          lifecycleState.nextAction.cta,
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "size-3.5" })
        ] }),
        facility.ninNumber && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2 py-1 font-mono text-xs text-muted-foreground", children: [
          "NIN ",
          facility.ninNumber,
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: () => void copyNin(),
              "aria-label": "Copy NIN number",
              className: "rounded p-0.5 transition-colors hover:bg-muted hover:text-foreground",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "size-3" })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "mr-1.5 size-3.5" }),
            " Export",
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "ml-1 size-3.5 opacity-70" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", className: "w-60", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuLabel, { children: "Export this profile" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onSelect: onExportPdf, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "mr-2 size-4" }),
              " Facility sheet – PDF (2 pages)"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onSelect: () => void onExportExcel(), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "mr-2 size-4" }),
              " Facility Profile – Excel"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, {}),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onSelect: onPrint, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Printer, { className: "mr-2 size-4" }),
              " Print"
            ] })
          ] })
        ] }),
        canEdit && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", onClick: () => setEditOpen(true), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "mr-1.5 size-3.5" }),
          " Edit details"
        ] }),
        me.appRole === "admin" && /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "outline",
              size: "icon",
              className: "size-9",
              "aria-label": "More facility actions",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(EllipsisVertical, { className: "size-4" })
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuLabel, { children: "Danger zone" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, {}),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              DropdownMenuItem,
              {
                className: "text-destructive focus:text-destructive",
                onSelect: (e) => {
                  e.preventDefault();
                  setConfirmName("");
                  setDeleteOpen(true);
                },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "mr-2 size-4" }),
                  " Delete facility"
                ]
              }
            )
          ] })
        ] })
      ] }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Dialog,
          {
            open: deleteOpen,
            onOpenChange: (o) => {
              setDeleteOpen(o);
              if (!o) setConfirmName("");
            },
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "glass-strong sm:max-w-md print:hidden", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Delete this facility?" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogDescription, { children: [
                  "This permanently removes ",
                  facility.name,
                  " with all its cycles, assessments, module records and audit history. This cannot be undone."
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Label, { htmlFor: "confirm-facility-name", children: [
                  "Type ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: facility.name }),
                  " to confirm"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Input,
                  {
                    id: "confirm-facility-name",
                    className: "glass-input mt-1",
                    value: confirmName,
                    onChange: (e) => setConfirmName(e.target.value),
                    placeholder: facility.name,
                    autoComplete: "off"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => setDeleteOpen(false), children: "Cancel" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Button,
                  {
                    variant: "destructive",
                    disabled: confirmName.trim() !== facility.name,
                    onClick: async () => {
                      try {
                        await deleteFacility({ facilityId: facility._id });
                        toast.success("Facility deleted");
                        navigate("/facilities");
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Delete failed");
                      }
                    },
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "mr-1.5 size-3.5" }),
                      " Delete permanently"
                    ]
                  }
                )
              ] })
            ] })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "nav",
          {
            "aria-label": "Breadcrumb",
            className: "mb-4 flex flex-wrap items-center gap-1.5 text-sm print:hidden",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Link,
                {
                  to: backToList,
                  "data-testid": "back-to-list",
                  className: "inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "size-4", "aria-hidden": true }),
                    "Facilities"
                  ]
                }
              ),
              facility.block && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground/60", "aria-hidden": true, children: "/" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Link,
                  {
                    to: blockListUrl,
                    className: "text-muted-foreground transition-colors hover:text-foreground",
                    "data-tip": `Facilities in ${facility.block}`,
                    children: facility.block
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground/60", "aria-hidden": true, children: "/" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 truncate font-medium text-foreground", children: facility.name })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(KpiStrip, { state: lifecycleState, surv, fund: fundKpi, fireNoc }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(LifecycleStepper, { state: lifecycleState, onJump: setTab }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          CompletenessMeter,
          {
            completeness,
            onJump: setTab,
            canEdit,
            onEdit: () => setEditOpen(true)
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { value: tab, onValueChange: setTab, className: "gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            TabsList,
            {
              "aria-label": "Facility profile sections",
              className: "flex w-full flex-nowrap justify-start gap-1 overflow-x-auto md:flex-wrap print:hidden",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "overview", children: "Overview" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "state", children: "State Assessment" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "national", children: "NQAS Assessment" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "funds", children: "Gap Closure Fund" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "noc", children: "Fire NOC" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "building", children: "Building" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "timeline", children: "Audit timeline" })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsContent, { value: "overview", className: "space-y-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              CycleSwitcher,
              {
                cycles: cycles.map((c) => c.cycle),
                selected: overviewCycle,
                onSelect: setOverviewCycle,
                scoreTrend: cycles.map((c) => ({
                  cycle: c.cycle.cycleNumber,
                  score: c.nqas?.scorePercent ?? c.nqas?.manualScore ?? null
                }))
              }
            ),
            view !== active && view && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "rounded-lg border border-sky-300/60 bg-sky-500/5 px-3 py-2 text-xs text-sky-900 dark:text-sky-200", children: [
              "Showing summary of superseded cycle #",
              view.cycle.cycleNumber,
              ' — read-only history. Select "Latest" to return to the live cycle.'
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              NeedsAttentionPanel,
              {
                items: attention,
                onFix: (t, f) => {
                  if (f === "documents" || t === "documents") {
                    setTab("overview");
                    window.setTimeout(
                      () => openDocuments((docs?.requiredMissing ?? [])[0]),
                      150
                    );
                    return;
                  }
                  setTab(t);
                  if (f) window.setTimeout(() => focusField(f), 150);
                }
              }
            ),
            (docs?.requiredMissing ?? []).length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: () => openDocuments((docs?.requiredMissing ?? [])[0]),
                className: "inline-flex w-fit items-center gap-1 rounded-full border border-amber-300/70 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-900 hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                "data-testid": "profile-required-doc-chip",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-3" }),
                  (docs?.requiredMissing ?? []).length === 1 ? "1 required document missing" : `${(docs?.requiredMissing ?? []).length} required documents missing`
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-3", children: summaries.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx(SectionSummaryCard, { summary: s, onEdit: setTab }, s.key)) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 lg:grid-cols-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "glass overflow-hidden lg:col-span-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { className: "flex-row flex-wrap items-center justify-between gap-2 space-y-0 border-b border-border/50 pb-4", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ClipboardList, { className: "size-5" }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-base", children: "Facility record" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Identity, location and programme details" })
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Badge,
                    {
                      variant: "secondary",
                      className: cn(
                        "border",
                        facility.eligibility === "Eligible" ? "border-emerald-300/70 bg-emerald-100 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-100" : facility.eligibility === "Possible" ? "border-sky-300/70 bg-sky-100 text-sky-900 dark:border-sky-400/40 dark:bg-sky-500/15 dark:text-sky-100" : "border-rose-300/80 bg-rose-100 text-rose-900 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-100"
                      ),
                      children: facility.eligibility === "Possible" ? "Future Candidate" : facility.eligibility === "Eligible" ? "Eligible" : "In-Eligible"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "pt-5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(RecordSection, { title: "Identity", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Facility name", value: facility.name }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Field,
                      {
                        label: "NIN Number",
                        value: facility.ninNumber,
                        mono: true,
                        onCopy: facility.ninNumber ? () => void copyNin() : void 0,
                        onAdd: canEdit ? () => setEditOpen(true) : void 0
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Facility type", value: facility.facilityType }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Field,
                      {
                        label: "Phase type",
                        value: facility.phaseType,
                        onAdd: canEdit ? () => setEditOpen(true) : void 0
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(RecordSection, { title: "Location", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Block name", value: facility.block }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "PHC name", value: facility.phc })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(RecordSection, { title: "Programme", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "NQAS eligibility", value: facility.eligibility }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Field,
                      {
                        label: "SaQsham Facility_Type",
                        value: facility.saqshamFacilityType,
                        onAdd: canEdit ? () => setEditOpen(true) : void 0
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Field,
                      {
                        label: "SaQsham Name/Category",
                        value: facility.saqshamCategory,
                        onAdd: canEdit ? () => setEditOpen(true) : void 0
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(RecordSection, { title: "Remarks", className: "sm:col-span-2 xl:col-span-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Field,
                    {
                      label: "General remarks",
                      value: facility.remarks,
                      onAdd: canEdit ? () => setEditOpen(true) : void 0
                    }
                  ) })
                ] }) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "glass overflow-hidden", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { className: "flex-row items-center gap-3 space-y-0 border-b border-border/50 pb-4", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary", children: /* @__PURE__ */ jsxRuntimeExports.jsx(History, { className: "size-5" }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-base", children: "Certification history" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: cycles.length === 0 ? "No cycles yet" : `${cycles.length} cycle${cycles.length === 1 ? "" : "s"} recorded` })
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "pt-5", children: [
                  cycles.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-dashed border-border/70 p-4 text-center", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(History, { className: "mx-auto size-5 text-muted-foreground" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm font-medium", children: "No certification cycle yet" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: "Mark the facility Eligible to open cycle #1 — the State Assessment tab then accepts the first assessment." })
                  ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("ol", { className: "relative space-y-4", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "span",
                      {
                        "aria-hidden": true,
                        className: "absolute top-2 bottom-2 left-[15px] w-px bg-border"
                      }
                    ),
                    cycles.map(({ cycle, sa, nqas }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                      CycleTimelineCard,
                      {
                        cycle,
                        sa,
                        nqas,
                        iaScore: lifecycleState.scores.ia,
                        isActive: active?.cycle._id === cycle._id,
                        canRemove: me.appRole === "admin",
                        busy: pendingCycleAction !== null,
                        removing: pendingCycleAction === `remove-${cycle._id}`,
                        onRemove: () => runCycleAction(
                          `remove-${cycle._id}`,
                          "Removed ✓",
                          () => deleteCycle({
                            facilityId: facility._id,
                            cycleId: cycle._id
                          }),
                          `Cycle #${cycle.cycleNumber} removed`
                        )
                      },
                      cycle._id
                    ))
                  ] }),
                  canEdit && active && (facility.currentStatus === "Recertification Due" || facility.currentStatus?.startsWith("Deferred") || active?.nqas?.certificationStatus === "Deferred") && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-amber-500/40 bg-amber-500/5 p-3", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "This facility went to recertification (deferred from its previous NQAS attempt). Start a new cycle, then schedule its State Assessment and NQAS Assessment from the tabs above — the new attempt keeps the full history of the deferred one on this timeline." }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      Button,
                      {
                        size: "sm",
                        className: "mt-2 w-full",
                        disabled: pendingCycleAction !== null,
                        onClick: () => void runCycleAction(
                          "start-recert",
                          "Cycle started ✓",
                          () => startNewCycle({
                            facilityId: facility._id,
                            trigger: "recertification"
                          })
                        ),
                        children: [
                          pendingCycleAction === "start-recert" ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin" }) : cycleActionDone ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-4" }) : null,
                          cycleActionDone ? "Cycle started ✓" : "Start recertification cycle"
                        ]
                      }
                    )
                  ] }),
                  canEdit && active && facility.currentStatus === "Eligible for Re-Assessment" && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    Button,
                    {
                      size: "sm",
                      className: "w-full",
                      disabled: pendingCycleAction !== null,
                      onClick: () => void runCycleAction(
                        "start-deferred",
                        "Cycle started ✓",
                        () => startNewCycle({
                          facilityId: facility._id,
                          trigger: "deferred"
                        })
                      ),
                      children: [
                        pendingCycleAction === "start-deferred" ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin" }) : cycleActionDone ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-4" }) : null,
                        cycleActionDone ? "Cycle started ✓" : "Start post-deferred reattempt"
                      ]
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                IaQuarterlyPanel,
                {
                  facilityId: String(facility._id),
                  settings,
                  userId: user?._id ? String(user._id) : null,
                  canImport: canEdit,
                  className: "lg:col-span-2"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { id: "documents", className: "scroll-mt-24", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              DocumentStatusCard,
              {
                facilityId: String(facility._id),
                canEdit,
                preselectKey: docPreselect
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              CycleHistoryPanel,
              {
                facilityId: String(facility._id),
                currentCycleNumber: active?.cycle.cycleNumber ?? facility.currentCycleNumber ?? null,
                canEdit,
                onOpenCycle: (n) => setOverviewCycle(n)
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(RecentActivity, { audits, onViewAll: () => setTab("timeline") })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsContent, { value: "state", className: "space-y-4", children: [
            cycles.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyCycle, {}),
            cycles.map(
              ({ cycle, sa, nqas }, ci) => sa ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "glass", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, { className: "text-base", children: [
                  "Cycle #",
                  cycle.cycleNumber,
                  " · ",
                  cycle.cycleType,
                  cycle.superseded && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-2 text-xs font-normal text-muted-foreground", children: me.appRole === "admin" ? "superseded (admin can edit history)" : "superseded (read-only history)" })
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  SaForm,
                  {
                    sa,
                    facilityId: facility._id,
                    cycleId: cycle._id,
                    statuses: docStatuses,
                    assessorHuds,
                    scopeOptions,
                    disabled: !canEdit || !!cycle.superseded && me.appRole !== "admin",
                    lockReason: !canEdit ? "Your account is view-only — State Admin or District Editor roles can edit assessments." : !!cycle.superseded && me.appRole !== "admin" ? "Superseded cycle — kept as read-only history." : null,
                    audits,
                    assessorPool,
                    maskPhones: data.me.appRole === "viewer" && assessorPhoneVisibility !== "everyone",
                    duplicateSource: cycles[ci - 1]?.sa ?? null,
                    certificationStatus: nqas?.certificationStatus,
                    onStartCycle: active && cycle._id === active.cycle._id && canEdit ? facility.currentStatus === "Recertification Due" ? () => void runCycleAction(
                      "start-recert",
                      "Cycle started ✓",
                      () => startNewCycle({
                        facilityId: facility._id,
                        trigger: "recertification"
                      })
                    ) : facility.currentStatus === "Eligible for Re-Assessment" ? () => void runCycleAction(
                      "start-deferred",
                      "Cycle started ✓",
                      () => startNewCycle({
                        facilityId: facility._id,
                        trigger: "deferred"
                      })
                    ) : void 0 : void 0,
                    startCycleLabel: facility.currentStatus === "Recertification Due" ? "Start recertification cycle" : "Start post-deferred reattempt",
                    onSave: async (vals) => {
                      const saved = await updateSA({
                        facilityId: facility._id,
                        cycleId: cycle._id,
                        ...vals
                      });
                      throwIfSaveFailed(saved);
                    }
                  }
                ) })
              ] }, cycle._id) : null
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsContent, { value: "national", className: "space-y-4", children: [
            cycles.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyCycle, {}),
            cycles.map(({ cycle, sa, nqas }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "glass", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, { className: "text-base", children: [
                "Cycle #",
                cycle.cycleNumber,
                " · ",
                cycle.cycleType,
                cycle.superseded && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-2 text-xs font-normal text-muted-foreground", children: me.appRole === "admin" ? "superseded (admin can edit history)" : "superseded (read-only history)" })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { children: nqas ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                NqasForm,
                {
                  nqas,
                  facilityId: facility._id,
                  cycleId: cycle._id,
                  cycleNumber: cycle.cycleNumber,
                  modes,
                  checklists,
                  scopeOptions,
                  certStatuses,
                  settings,
                  saCompleted: sa?.status === "Completed",
                  disabled: !canEdit || !!cycle.superseded && me.appRole !== "admin",
                  lockReason: !canEdit ? "Your account is view-only — State Admin or District Editor roles can edit assessments." : !!cycle.superseded && me.appRole !== "admin" ? "Superseded cycle — kept as read-only history." : null,
                  audits,
                  onSave: async (vals) => {
                    const saved = await updateNqas({
                      facilityId: facility._id,
                      cycleId: cycle._id,
                      ...vals
                    });
                    throwIfSaveFailed(saved);
                  }
                }
              ) : canEdit && !cycle.superseded && sa?.status === "Completed" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "State Assessment is complete — create the NQAS record for this cycle." }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    size: "sm",
                    onClick: async () => {
                      try {
                        await ensureNqas({
                          facilityId: facility._id,
                          cycleId: cycle._id
                        });
                        toast.success("NQAS record created");
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Failed");
                      }
                    },
                    children: "Create NQAS record"
                  }
                )
              ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "The NQAS record is created once the State Assessment for this cycle is completed." }) })
            ] }, cycle._id))
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsContent, { value: "funds", className: "space-y-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              ModuleRecords,
              {
                facilityId: facility._id,
                canEdit,
                icon: /* @__PURE__ */ jsxRuntimeExports.jsx(IndianRupee, { className: "size-4" }),
                title: "Gap Closure Fund records",
                rows: [],
                renderExtra: null,
                addLabel: "Add fund record",
                renderAdd: (close) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  FundForm,
                  {
                    fundStatuses,
                    disabled: false,
                    onSubmit: async (vals) => {
                      try {
                        await saveFund({
                          facilityId: facility._id,
                          financialYear: vals.financialYear ?? "2025-26",
                          status: vals.status ?? "Pending",
                          amountSanctioned: vals.amountSanctioned,
                          amountReleased: vals.amountReleased,
                          amountUtilized: vals.amountUtilized,
                          sanctionedDate: vals.sanctionedDate,
                          utilizedDate: vals.utilizedDate,
                          remarks: vals.remarks
                        });
                        toast.success("Fund record added");
                        close();
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Failed");
                      }
                    }
                  }
                )
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-3", children: data.funds.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              FundRowCard,
              {
                fund: {
                  _id: String(f._id),
                  financialYear: f.financialYear,
                  amountSanctioned: f.amountSanctioned,
                  amountReleased: f.amountReleased,
                  amountUtilized: f.amountUtilized,
                  status: f.status,
                  sanctionedDate: f.sanctionedDate,
                  utilizedDate: f.utilizedDate,
                  remarks: f.remarks
                },
                fundStatuses,
                canEdit,
                onUpdate: async (fundId, vals) => {
                  try {
                    await updateFund({
                      fundId,
                      ...vals,
                      attachmentId: vals.attachmentId
                    });
                    toast.success("Fund record updated");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed");
                  }
                },
                onDelete: async (fundId) => {
                  try {
                    await deleteFund({ fundId });
                    toast.success("Fund record deleted");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed");
                  }
                }
              },
              f._id
            )) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsContent, { value: "noc", className: "space-y-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              ModuleRecords,
              {
                facilityId: facility._id,
                canEdit,
                icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Flame, { className: "size-4" }),
                title: "Fire NOC records",
                rows: [],
                addLabel: "Add NOC record",
                renderAdd: (close) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  NocForm,
                  {
                    onSubmit: async (vals) => {
                      try {
                        await saveNoc({
                          facilityId: facility._id,
                          nocNumber: vals.nocNumber,
                          issuedDate: vals.issuedDate,
                          expiryDate: vals.expiryDate,
                          status: vals.status ?? "Valid",
                          renewalAppliedDate: vals.renewalAppliedDate,
                          remarks: vals.remarks
                        });
                        toast.success("Fire NOC added");
                        close();
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Failed");
                      }
                    }
                  }
                )
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-3", children: data.nocs.map((n) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              NocRowCard,
              {
                noc: {
                  _id: String(n._id),
                  nocNumber: n.nocNumber,
                  issuedDate: n.issuedDate,
                  expiryDate: n.expiryDate,
                  status: n.status,
                  renewalAppliedDate: n.renewalAppliedDate,
                  remarks: n.remarks
                },
                canEdit,
                onUpdate: async (nocId, vals) => {
                  try {
                    await updateNoc({
                      nocId,
                      ...vals,
                      attachmentId: vals.attachmentId
                    });
                    toast.success("NOC updated");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed");
                  }
                },
                onDelete: async (nocId) => {
                  try {
                    await deleteNoc({ nocId });
                    toast.success("NOC deleted");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed");
                  }
                }
              },
              n._id
            )) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsContent, { value: "building", className: "space-y-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              ModuleRecords,
              {
                facilityId: facility._id,
                canEdit,
                icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Wrench, { className: "size-4" }),
                title: "Building status",
                rows: [],
                addLabel: "Add building record",
                renderAdd: (close) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  BuildingForm,
                  {
                    buildingStatuses,
                    onSubmit: async (vals) => {
                      try {
                        await saveBuilding({
                          facilityId: facility._id,
                          buildingStatus: vals.buildingStatus ?? "Good",
                          buildingType: vals.buildingType,
                          yearOfConstruction: vals.yearOfConstruction,
                          lastRenovationDate: vals.lastRenovationDate,
                          renovationFundRequired: vals.renovationFundRequired,
                          remarks: vals.remarks
                        });
                        toast.success("Building record added");
                        close();
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Failed");
                      }
                    }
                  }
                )
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-3", children: data.buildings.map((b) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              BuildingRowCard,
              {
                building: {
                  _id: String(b._id),
                  buildingStatus: b.buildingStatus,
                  buildingType: b.buildingType ?? null,
                  lastUpdatedAt: b.lastUpdatedAt ?? null,
                  yearOfConstruction: b.yearOfConstruction,
                  lastRenovationDate: b.lastRenovationDate,
                  renovationFundRequired: b.renovationFundRequired,
                  remarks: b.remarks
                },
                buildingStatuses,
                canEdit,
                onUpdate: async (buildingId, vals) => {
                  try {
                    await updateBuilding({ buildingId, ...vals });
                    toast.success("Building record updated");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed");
                  }
                },
                onDelete: async (buildingId) => {
                  try {
                    await deleteBuilding({ buildingId });
                    toast.success("Building record deleted");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed");
                  }
                }
              },
              b._id
            )) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "timeline", className: "space-y-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "glass", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { className: "gap-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, { className: "text-base", children: [
                  "Audit history (",
                  filteredAudits.length,
                  filteredAudits.length !== audits.length ? ` of ${audits.length}` : "",
                  ")"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
                  (auditUser !== "all" || auditModule !== "all" || auditFrom || auditTo) && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    Button,
                    {
                      variant: "ghost",
                      size: "sm",
                      onClick: () => {
                        setAuditUser("all");
                        setAuditModule("all");
                        setAuditFrom("");
                        setAuditTo("");
                      },
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "mr-1 size-3.5" }),
                        " Clear filters"
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    Button,
                    {
                      variant: "outline",
                      size: "sm",
                      disabled: filteredAudits.length === 0,
                      onClick: () => void exportAuditExcel(),
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "mr-1.5 size-3.5" }),
                        " Export Excel"
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", onClick: onPrint, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Printer, { className: "mr-1.5 size-3.5" }),
                    " Print"
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-2 sm:grid-cols-2 lg:grid-cols-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Label, { htmlFor: "audit-user", className: "text-xs", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Funnel, { className: "mr-1 inline size-3" }),
                    " User"
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: auditUser, onValueChange: setAuditUser, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { id: "audit-user", className: "glass-input mt-1 w-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "all", children: "All users" }),
                      auditUsers.map((u) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: u, children: u }, u))
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "audit-module", className: "text-xs", children: "Module" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: auditModule, onValueChange: setAuditModule, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { id: "audit-module", className: "glass-input mt-1 w-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "all", children: "All modules" }),
                      auditModules.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: m, children: m }, m))
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "audit-from", className: "text-xs", children: "From" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    DateInput,
                    {
                      id: "audit-from",
                      label: "Audit from",
                      value: auditFrom,
                      onChange: setAuditFrom,
                      max: todayLocalIso(),
                      compact: true,
                      hideChange: true,
                      className: "mt-1"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "audit-to", className: "text-xs", children: "To" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    DateInput,
                    {
                      id: "audit-to",
                      label: "Audit to",
                      value: auditTo,
                      onChange: setAuditTo,
                      max: todayLocalIso(),
                      compact: true,
                      hideChange: true,
                      className: "mt-1"
                    }
                  )
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { children: audits.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "No changes recorded yet. Edits to this facility — details, assessments, funds, NOC and building records — appear here with who changed what and when." }) : filteredAudits.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-muted-foreground", children: [
              "No audit entries match these filters.",
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  className: "underline hover:text-foreground",
                  onClick: () => {
                    setAuditUser("all");
                    setAuditModule("all");
                    setAuditFrom("");
                    setAuditTo("");
                  },
                  children: "Clear them"
                }
              ),
              " ",
              "to see all ",
              audits.length,
              " entries."
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("ol", { className: "relative space-y-4 border-l pl-5", children: filteredAudits.map((a) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "text-sm", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute -left-[7px] mt-1.5 size-3 rounded-full border-2 border-primary bg-background" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "break-words", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: a.field ?? a.action }),
                a.oldValue != null && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-muted-foreground", children: [
                  " ",
                  String(a.oldValue),
                  " →",
                  " "
                ] }),
                a.newValue != null && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: String(a.newValue) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
                a.changedByName ?? "System",
                a.table ? ` · ${a.table}` : "",
                " ·",
                " ",
                toDisplayDateTime(a.changedAt)
              ] })
            ] }, a._id)) }) })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(PrintSummary, { out: exportData }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          EditFacilityDialog,
          {
            open: editOpen,
            onOpenChange: setEditOpen,
            facility,
            onSave: async (vals) => {
              try {
                const saved = await updateFacility({ facilityId: facility._id, ...vals });
                throwIfSaveFailed(saved);
                toast.success("Facility updated");
                setEditOpen(false);
              } catch (err) {
                showSaveError(err);
              }
            }
          },
          editOpen ? "editing" : "idle"
        )
      ]
    }
  );
}
function scoreTone(v) {
  if (v == null) return "grey";
  if (v >= 75) return "green";
  if (v >= 50) return "amber";
  return "red";
}
function certChip(certStatus, fallback) {
  switch (certStatus) {
    case "Quality Certified":
      return { label: "Certified", tone: "green" };
    case "Quality Certified with Conditionality":
      return { label: "Certified (Conditionality)", tone: "amber" };
    case "Deferred":
      return { label: "Deferred", tone: "red" };
    default:
      return fallback;
  }
}
function KpiStrip({
  state,
  surv,
  fund,
  fireNoc
}) {
  const { from, daysLeft, to } = state.validity;
  const validityTone = daysLeft == null ? "grey" : daysLeft < 0 ? "red" : daysLeft <= 90 ? "amber" : "green";
  const validityTotalDays = from && to ? Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 864e5)) : null;
  const score = (label, s) => ({
    value: s.value != null ? `${s.value}%` : "—",
    hint: s.value != null ? label : "Not recorded yet",
    tone: scoreTone(s.value)
  });
  const survChip = surv ? dueChip(surv.daysLeft) : null;
  const items = [
    {
      key: "stage",
      label: "Current stage",
      value: `${state.stageIndex} of ${state.stages.length}`,
      hint: state.chip.label,
      tone: state.chip.tone
    },
    {
      key: "sa",
      label: "SA score",
      ...score("State Assessment", state.scores.sa)
    },
    {
      key: "nqas",
      label: "NQAS score",
      ...score("NQAS Assessment", state.scores.nqas)
    },
    {
      key: "validity",
      label: "Validity",
      value: daysLeft != null ? `${daysLeft} days` : "—",
      hint: to == null ? "Not certified yet" : daysLeft != null && daysLeft < 0 ? `Expired on ${toDdMmmYyyy(to)}` : `Till ${toDdMmmYyyy(to)}`,
      tone: validityTone
    },
    {
      key: "surveillance",
      label: "Next surveillance",
      value: survChip ? survChip.label : "—",
      hint: surv ? `Surveillance due ${toDdMmmYyyy(surv.date)}` : "Applies once certified",
      tone: survChip ? survChip.tone : "grey"
    },
    {
      key: "fund",
      label: "Gap closure",
      value: fund && fund.total > 0 ? formatInr(fund.total) : "—",
      hint: fund && fund.total > 0 ? `${fund.year ?? "—"} · ${fund.open} open record${fund.open === 1 ? "" : "s"}` : "No fund records yet",
      tone: fund && fund.open > 0 ? "amber" : fund && fund.total > 0 ? "green" : "grey"
    },
    {
      key: "noc",
      label: "Fire NOC",
      value: fireNoc ? fireNoc.label : "—",
      hint: fireNoc?.label === "Not Obtained" ? "No validity date recorded" : `${fireNoc?.label ?? "—"} status`,
      tone: fireNoc ? fireNoc.tone : "grey"
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx("dl", { className: "mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7", children: items.map((i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass rounded-xl border border-border/60 p-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "text-xs leading-tight font-semibold tracking-wide text-muted-foreground uppercase", children: i.label }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("dd", { className: "mt-1 flex items-center justify-between gap-2 text-lg leading-none font-bold text-foreground", children: [
      i.value === "—" ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "aria-hidden": true, children: "—" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 truncate", children: i.value }),
      i.key === "validity" && to != null && /* @__PURE__ */ jsxRuntimeExports.jsx(RingGauge, { daysLeft, totalDays: validityTotalDays, size: 40 })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("dd", { className: "mt-1.5 flex items-start gap-1 text-xs leading-tight text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ToneIcon, { tone: i.tone, className: "mt-0.5" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: i.hint })
    ] })
  ] }, i.key)) });
}
function CompletenessMeter({
  completeness,
  onJump,
  canEdit,
  onEdit
}) {
  const tone = completeness.pct === 100 ? "green" : completeness.pct >= 60 ? "blue" : "amber";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      "aria-label": "Profile completeness",
      className: "glass mb-4 rounded-xl border border-border/60 p-4 print:hidden",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm font-semibold", children: [
            "Profile ",
            completeness.pct,
            "% complete",
            completeness.missing.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-1 font-normal text-muted-foreground", children: [
              "— ",
              completeness.missing.length,
              " field",
              completeness.missing.length === 1 ? "" : "s",
              " missing"
            ] })
          ] }),
          completeness.missing.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3.5" }),
            " All key fields recorded"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ToneBar, { value: completeness.pct, tone, className: "mt-2" }),
        completeness.missing.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-3 flex flex-wrap gap-1.5", children: completeness.missing.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => onJump(m.tab),
            className: "inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/50 px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "size-3" }),
              " ",
              m.field
            ]
          }
        ) }, m.field)) }),
        canEdit && completeness.missing.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", className: "mt-3", onClick: onEdit, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "mr-1.5 size-3.5" }),
          " Fill in the missing fields"
        ] })
      ]
    }
  );
}
function RecordSection({
  title,
  children,
  className
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: cn("min-w-0", className), "aria-label": title, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "border-b border-border/60 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase", children: title }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2", children })
  ] });
}
function Field({
  label,
  value,
  mono,
  onCopy,
  onAdd
}) {
  const empty = value == null || String(value).trim() === "";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-medium tracking-wide text-muted-foreground uppercase", children: label }),
    empty ? /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "italic", children: "Not provided" }),
      onAdd && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: onAdd,
          className: "inline-flex items-center gap-0.5 rounded text-xs font-semibold text-primary underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "size-3" }),
            " Add"
          ]
        }
      )
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "p",
      {
        className: cn(
          "mt-1 flex items-center gap-1.5 text-sm leading-snug font-medium break-words text-foreground",
          mono && "font-mono text-xs"
        ),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 break-all", children: value }),
          onCopy && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: onCopy,
              "aria-label": `Copy ${label}`,
              className: "shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "size-3" })
            }
          )
        ]
      }
    )
  ] });
}
function CycleTimelineCard({
  cycle,
  sa,
  nqas,
  iaScore,
  isActive,
  canRemove,
  busy,
  removing,
  onRemove
}) {
  const [open, setOpen] = reactExports.useState(false);
  const chip = certChip(nqas?.certificationStatus, {
    label: isActive ? "In progress" : "Closed",
    tone: isActive ? "amber" : "grey"
  });
  const rows = [
    { key: "ia", label: "IA score", value: iaScore.value, note: "Facility-level (latest quarterly IA)" },
    {
      key: "sa",
      label: "SA score",
      value: sa?.scorePercent ?? null,
      note: sa?.status ? `State Assessment: ${sa.status}` : "State Assessment not recorded"
    },
    {
      key: "nqas",
      label: "NQAS score",
      value: nqas?.scorePercent ?? nqas?.manualScore ?? null,
      note: nqas?.status ? `NQAS: ${nqas.status}` : "NQAS assessment not recorded"
    }
  ];
  const validityFrom = nqas?.certificationDate ?? nqas?.goiLetterDate ?? null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "relative flex gap-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "span",
      {
        className: cn(
          "z-10 mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          cycle.superseded ? "bg-muted text-muted-foreground" : "bg-primary text-white shadow-sm"
        ),
        "aria-hidden": true,
        children: cycle.cycleNumber
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: cn(
          "min-w-0 flex-1 rounded-xl border p-3 text-sm",
          cycle.superseded ? "border-border/50 bg-muted/30 opacity-90" : isActive ? "border-primary/30 bg-primary/5 shadow-sm" : "border-border/60"
        ),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "font-semibold", children: [
              "Cycle #",
              cycle.cycleNumber,
              " · ",
              cycle.cycleType
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(StatusChip, { label: chip.label, tone: chip.tone }),
              cycle.superseded && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground", children: "superseded" }),
              canRemove && /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialog, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    variant: "ghost",
                    size: "icon",
                    className: "size-6 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive print:hidden",
                    "data-tip": "Remove this cycle from history",
                    "aria-label": "Remove this cycle from history",
                    disabled: busy,
                    children: removing ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-3.5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3.5" })
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogContent, { className: "glass-strong", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogHeader, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogTitle, { children: [
                      "Remove cycle #",
                      cycle.cycleNumber,
                      "?"
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogDescription, { children: "This permanently removes the cycle with its State Assessment and NQAS records. If it was the active cycle, the most recent remaining cycle becomes active. This cannot be undone." })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogFooter, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogCancel, { children: "Cancel" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      AlertDialogAction,
                      {
                        className: "bg-destructive text-white",
                        onClick: () => void onRemove(),
                        children: "Remove cycle"
                      }
                    )
                  ] })
                ] })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 space-y-2", children: rows.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2 text-xs", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-foreground", children: r.label }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "tabular-nums text-muted-foreground", children: r.value != null ? `${r.value}%` : "— Not recorded yet" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              ToneBar,
              {
                value: r.value ?? 0,
                tone: scoreTone(r.value),
                className: "mt-1"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: r.note })
          ] }, r.key)) }),
          validityFrom || nqas?.validityDate ? /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-3 text-xs text-muted-foreground", children: [
            "Certificate validity: ",
            validityFrom ? toDisplayDate(validityFrom) : "—",
            " to",
            " ",
            nqas?.validityDate ? toDisplayDate(nqas.validityDate) : "—"
          ] }) : null,
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => setOpen((v) => !v),
              "aria-expanded": open,
              className: "mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none print:hidden",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: cn("size-3.5 transition-transform", open && "rotate-180") }),
                open ? "Hide details" : "More details"
              ]
            }
          ),
          open && /* @__PURE__ */ jsxRuntimeExports.jsxs("dl", { className: "mt-2 grid gap-x-4 gap-y-1.5 border-t border-border/60 pt-2 text-xs sm:grid-cols-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Detail, { label: "Cycle type", value: cycle.cycleType }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Detail, { label: "Cycle status", value: cycle.superseded ? "Superseded" : "Active" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Detail, { label: "SA scheduled", value: fmtDay(sa?.scheduledDate) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Detail, { label: "SA actual dates", value: range(sa?.actualStartDate, sa?.actualEndDate) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Detail, { label: "SA letter / doc status", value: sa?.generalDocStatus ?? null }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Detail, { label: "SA assessors", value: assessors(sa) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Detail, { label: "NQAS scheduled", value: fmtDay(nqas?.scheduledStartDate) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Detail, { label: "NQAS actual end", value: fmtDay(nqas?.actualEndDate) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Detail, { label: "NQAS mode", value: nqas?.mode ?? null }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Detail, { label: "SA report", value: sa?.reportAttachmentName ?? null })
          ] })
        ]
      }
    )
  ] });
}
function fmtDay(iso) {
  return iso ? toDisplayDate(iso) : null;
}
function range(from, to) {
  if (!from && !to) return null;
  return `${from ? toDisplayDate(from) : "—"} → ${to ? toDisplayDate(to) : "—"}`;
}
function assessors(sa) {
  if (!sa) return null;
  const a1 = cleanName(sa.assessor1Name);
  const a2 = cleanName(sa.assessor2Name);
  if (!a1 && !a2) return null;
  return [a1, a2].filter(Boolean).join(", ");
}
const cleanName = (v) => typeof v === "string" && v.trim() !== "" ? v.trim() : "";
function Detail({ label, value }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "text-xs font-semibold tracking-wide text-muted-foreground uppercase", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "break-words", children: value && String(value).trim() !== "" ? value : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground italic", children: "Not recorded yet" }) })
  ] });
}
function PrintSummary({ out }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "hidden print:block", "aria-hidden": true, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-lg font-bold", children: [
      "Facility Profile — ",
      out.facility.name
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[11px] text-muted-foreground", children: [
      out.facility.facilityType,
      " · NIN ",
      out.facility.ninNumber ?? "not provided",
      " · Block",
      " ",
      out.facility.block,
      " / PHC ",
      out.facility.phc,
      " · Stage ",
      out.stageIndex,
      " of 7 —",
      " ",
      out.chip.label
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(PrintTable, { title: "Facility summary", header: ["Metric", "Value"], rows: out.kpis }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      PrintTable,
      {
        title: "Certification lifecycle",
        header: ["#", "Stage", "State", "Date"],
        rows: out.lifecycle
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(PrintTable, { title: "Facility record", header: ["Field", "Value"], rows: out.record }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      PrintTable,
      {
        title: "Certification history",
        header: ["Cycle", "Type", "SA score", "NQAS score", "Status", "Valid from–to"],
        rows: out.certHistory
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(PrintTable, { title: "Gap closure fund", header: out.fundHeader, rows: out.funds }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(PrintTable, { title: "Fire NOC", header: out.nocHeader, rows: out.nocs }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(PrintTable, { title: "Building", header: out.buildingHeader, rows: out.buildings }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(PrintTable, { title: "Audit trail (last 10)", header: out.auditHeader, rows: out.audit }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-4 text-[10px] text-muted-foreground", children: [
      "Generated ",
      out.generatedAt,
      " by ",
      out.generatedBy || "NQAS Tracker user",
      " — confidential facility quality data."
    ] })
  ] });
}
function PrintTable({
  title,
  header,
  rows
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 break-inside-avoid", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xs font-bold tracking-wide uppercase", children: title }),
    rows.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground italic", children: "No records — nothing recorded for this section yet." }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "mt-1 w-full border-collapse text-[11px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: header.map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "th",
        {
          className: "border border-neutral-300 bg-neutral-100 px-1.5 py-1 text-left font-semibold",
          children: h
        },
        h
      )) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: rows.map((r, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: r.map((c, j) => /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "border border-neutral-300 px-1.5 py-1 align-top", children: c == null || c === "" ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-neutral-500 italic", children: "Not recorded" }) : String(c) }, j)) }, i)) })
    ] })
  ] });
}
function EmptyCycle() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "glass", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "py-8 text-sm text-muted-foreground", children: "No certification cycle yet — mark the facility NQAS-eligible to start cycle #1." }) });
}
function ModuleRecords({
  title,
  icon,
  children,
  addLabel,
  renderAdd
}) {
  const [open, setOpen] = reactExports.useState(false);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "glass", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { className: "flex-row items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, { className: "flex items-center gap-2 text-base", children: [
        icon,
        title
      ] }),
      renderAdd && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", className: "gap-1.5", onClick: () => setOpen(true), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "size-3.5" }),
        " ",
        addLabel
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { children: [
      children,
      /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange: setOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "glass-strong max-h-[85vh] overflow-y-auto sm:max-w-md", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: addLabel }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "Every change is recorded in the audit trail." })
        ] }),
        renderAdd?.(() => setOpen(false))
      ] }) })
    ] })
  ] });
}
function FundForm({
  fundStatuses,
  onSubmit,
  initial,
  disabled,
  submitLabel = "Save fund record"
}) {
  const [form, setForm] = reactExports.useState({
    financialYear: initial?.financialYear ?? "2025-26",
    amountSanctioned: initial?.amountSanctioned?.toString() ?? "",
    amountReleased: initial?.amountReleased?.toString() ?? "",
    amountUtilized: initial?.amountUtilized?.toString() ?? "",
    status: initial?.status ?? "Pending",
    sanctionedDate: initial?.sanctionedDate ?? "",
    utilizedDate: initial?.utilizedDate ?? "",
    remarks: initial?.remarks ?? ""
  });
  const [busy, setBusy] = reactExports.useState(false);
  const [file, setFile] = reactExports.useState(
    initial?.attachmentId ? {
      attachmentId: initial.attachmentId,
      attachmentName: initial.attachmentName,
      attachmentType: initial.attachmentType
    } : null
  );
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(FieldGrid, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Financial year" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            className: "glass-input mt-1",
            value: form.financialYear,
            onChange: (e) => set("financialYear", e.target.value),
            disabled,
            placeholder: "2025-26"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Status" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: form.status, onValueChange: (v) => set("status", v), disabled, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "glass-input mt-1 w-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: fundStatuses.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: s, children: s }, s)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Amount sanctioned (₹)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            type: "number",
            className: "glass-input mt-1",
            value: form.amountSanctioned,
            onChange: (e) => set("amountSanctioned", e.target.value),
            disabled
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Amount released (₹)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            type: "number",
            className: "glass-input mt-1",
            value: form.amountReleased,
            onChange: (e) => set("amountReleased", e.target.value),
            disabled
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Amount utilized (₹)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            type: "number",
            className: "glass-input mt-1",
            value: form.amountUtilized,
            onChange: (e) => set("amountUtilized", e.target.value),
            disabled
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "fund-sanctioned-date", children: "Sanctioned date" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DateInput,
          {
            id: "fund-sanctioned-date",
            label: "Sanctioned date",
            value: form.sanctionedDate,
            onChange: (iso) => set("sanctionedDate", iso),
            max: todayLocalIso(),
            disabled,
            disabledReason: disabled ? "View only — funds need edit access" : void 0,
            compact: true,
            className: "mt-1"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "fund-utilized-date", children: "Utilized date" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DateInput,
          {
            id: "fund-utilized-date",
            label: "Utilized date",
            value: form.utilizedDate,
            onChange: (iso) => set("utilizedDate", iso),
            max: todayLocalIso(),
            disabled,
            disabledReason: disabled ? "View only — funds need edit access" : void 0,
            compact: true,
            className: "mt-1"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Remarks" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            className: "glass-input mt-1",
            value: form.remarks,
            onChange: (e) => set("remarks", e.target.value),
            disabled
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      AttachmentPicker,
      {
        label: "Supporting document (sanction order / proceedings)",
        initial: initial?.attachmentId ? {
          attachmentId: initial.attachmentId,
          attachmentName: initial.attachmentName,
          attachmentType: initial.attachmentType
        } : null,
        onChange: setFile,
        disabled
      }
    ),
    !disabled && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Button,
      {
        disabled: busy,
        onClick: async () => {
          setBusy(true);
          await onSubmit({
            financialYear: form.financialYear,
            amountSanctioned: form.amountSanctioned === "" ? void 0 : Number(form.amountSanctioned),
            amountReleased: form.amountReleased === "" ? void 0 : Number(form.amountReleased),
            amountUtilized: form.amountUtilized === "" ? void 0 : Number(form.amountUtilized),
            status: form.status,
            sanctionedDate: form.sanctionedDate || void 0,
            utilizedDate: form.utilizedDate || void 0,
            remarks: form.remarks || void 0,
            attachmentId: file?.attachmentId,
            attachmentName: file?.attachmentName,
            attachmentType: file?.attachmentType,
            clearAttachment: !file && !!initial?.attachmentId
          });
          setBusy(false);
        },
        children: [
          busy && /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-2 size-4 animate-spin" }),
          submitLabel
        ]
      }
    )
  ] });
}
function FundRowCard({
  fund,
  fundStatuses,
  canEdit,
  onUpdate,
  onDelete
}) {
  const [editing, setEditing] = reactExports.useState(false);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "glass py-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "px-4", children: editing ? /* @__PURE__ */ jsxRuntimeExports.jsx(
    FundForm,
    {
      fundStatuses,
      initial: fund,
      disabled: !canEdit,
      submitLabel: "Save changes",
      onSubmit: async (vals) => {
        await onUpdate(fund._id, {
          ...vals,
          attachmentId: vals.attachmentId
        });
        setEditing(false);
      }
    }
  ) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 text-sm", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "font-medium", children: [
        "FY ",
        fund.financialYear
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-muted-foreground", children: [
        "Sanctioned ₹",
        fund.amountSanctioned ?? 0,
        " · Released ₹",
        fund.amountReleased ?? 0,
        " · Utilized ₹",
        fund.amountUtilized ?? 0
      ] }),
      fund.remarks && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: fund.remarks }),
      fund.attachmentId && /* @__PURE__ */ jsxRuntimeExports.jsx(AttachmentLink, { id: fund.attachmentId, name: fund.attachmentName }),
      fund.updatedAt && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mt-0.5 block text-[10px] text-muted-foreground", children: [
        "Updated: ",
        toDisplayDateTime(fund.updatedAt)
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: fund.status }),
      canEdit && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "sm", onClick: () => setEditing(true), children: "Edit" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "destructive", size: "sm", onClick: () => onDelete(fund._id), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "size-3.5" }) })
      ] })
    ] })
  ] }) }) });
}
function NocForm({
  onSubmit,
  initial,
  submitLabel = "Save NOC record"
}) {
  const [form, setForm] = reactExports.useState({
    nocNumber: initial?.nocNumber ?? "",
    issuedDate: initial?.issuedDate ?? "",
    expiryDate: initial?.expiryDate ?? "",
    status: initial?.status ?? "Valid",
    renewalAppliedDate: initial?.renewalAppliedDate ?? "",
    remarks: initial?.remarks ?? ""
  });
  const derivedNocStatus = deriveFireNocStatus$1(
    "Yes",
    form.expiryDate || null,
    initial?.status ?? null
  );
  const [busy, setBusy] = reactExports.useState(false);
  const [file, setFile] = reactExports.useState(
    initial?.attachmentId ? {
      attachmentId: initial.attachmentId,
      attachmentName: initial.attachmentName,
      attachmentType: initial.attachmentType
    } : null
  );
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(FieldGrid, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Fire NOC Validity Status" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: derivedNocStatus }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[10px] leading-tight text-muted-foreground", children: "Auto — from the validity date below" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "NOC number" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            className: "glass-input mt-1",
            value: form.nocNumber,
            onChange: (e) => set("nocNumber", e.target.value)
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "noc-issued-date", children: "Issued date" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DateInput,
          {
            id: "noc-issued-date",
            label: "NOC issued date",
            value: form.issuedDate,
            onChange: (iso) => set("issuedDate", iso),
            max: todayLocalIso(),
            compact: true,
            className: "mt-1"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "noc-expiry-date", children: "Expiry date" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DateInput,
          {
            id: "noc-expiry-date",
            label: "NOC expiry date",
            value: form.expiryDate,
            onChange: (iso) => set("expiryDate", iso),
            min: form.issuedDate || void 0,
            compact: true,
            className: "mt-1"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "noc-renewal-date", children: "Renewal applied date" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DateInput,
          {
            id: "noc-renewal-date",
            label: "NOC renewal applied date",
            value: form.renewalAppliedDate,
            onChange: (iso) => set("renewalAppliedDate", iso),
            max: todayLocalIso(),
            compact: true,
            className: "mt-1"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Remarks" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            className: "glass-input mt-1",
            value: form.remarks,
            onChange: (e) => set("remarks", e.target.value)
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      AttachmentPicker,
      {
        label: "NOC certificate / document",
        initial: initial?.attachmentId ? {
          attachmentId: initial.attachmentId,
          attachmentName: initial.attachmentName,
          attachmentType: initial.attachmentType
        } : null,
        onChange: setFile
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Button,
      {
        disabled: busy,
        onClick: async () => {
          setBusy(true);
          await onSubmit({
            nocNumber: form.nocNumber || void 0,
            issuedDate: form.issuedDate || void 0,
            expiryDate: form.expiryDate || void 0,
            status: derivedNocStatus,
            renewalAppliedDate: form.renewalAppliedDate || void 0,
            remarks: form.remarks || void 0,
            attachmentId: file?.attachmentId,
            attachmentName: file?.attachmentName,
            attachmentType: file?.attachmentType,
            clearAttachment: !file && !!initial?.attachmentId
          });
          setBusy(false);
        },
        children: [
          busy && /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-2 size-4 animate-spin" }),
          submitLabel
        ]
      }
    )
  ] });
}
function NocRowCard({
  noc,
  canEdit,
  onUpdate,
  onDelete
}) {
  const [editing, setEditing] = reactExports.useState(false);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "glass py-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "px-4", children: editing ? /* @__PURE__ */ jsxRuntimeExports.jsx(
    NocForm,
    {
      initial: noc,
      submitLabel: "Save changes",
      onSubmit: async (vals) => {
        await onUpdate(noc._id, {
          ...vals,
          attachmentId: vals.attachmentId
        });
        setEditing(false);
      }
    }
  ) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 text-sm", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-medium", children: noc.nocNumber || "Fire NOC" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-muted-foreground", children: [
        "Issued ",
        toDisplayDate(noc.issuedDate),
        " · Expires",
        " ",
        toDisplayDate(noc.expiryDate)
      ] }),
      noc.attachmentId && /* @__PURE__ */ jsxRuntimeExports.jsx(AttachmentLink, { id: noc.attachmentId, name: noc.attachmentName }),
      noc.updatedAt && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mt-0.5 block text-[10px] text-muted-foreground", children: [
        "Updated: ",
        toDisplayDateTime(noc.updatedAt)
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: noc.status }),
      canEdit && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "sm", onClick: () => setEditing(true), children: "Edit" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "destructive", size: "sm", onClick: () => onDelete(noc._id), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "size-3.5" }) })
      ] })
    ] })
  ] }) }) });
}
function BuildingForm({
  buildingStatuses,
  onSubmit,
  initial,
  submitLabel = "Save building record"
}) {
  const [form, setForm] = reactExports.useState({
    buildingStatus: initial?.buildingStatus ?? "Good",
    buildingType: initial?.buildingType ?? "",
    yearOfConstruction: initial?.yearOfConstruction ?? "",
    lastRenovationDate: initial?.lastRenovationDate ?? "",
    renovationFundRequired: initial?.renovationFundRequired?.toString() ?? "",
    remarks: initial?.remarks ?? ""
  });
  const [busy, setBusy] = reactExports.useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(FieldGrid, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Building status" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Select,
          {
            value: form.buildingStatus,
            onValueChange: (v) => set("buildingStatus", v),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "glass-input mt-1 w-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: buildingStatuses.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: s, children: s }, s)) })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Building type" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Select,
          {
            value: form.buildingType || "__none",
            onValueChange: (v) => set("buildingType", v === "__none" ? "" : v),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "glass-input mt-1 w-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "—" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "__none", children: "—" }),
                ["Own Building", "Rented Building", "Rent Free Building"].map(
                  (t) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: t, children: t }, t)
                )
              ] })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Year of construction" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            className: "glass-input mt-1",
            value: form.yearOfConstruction,
            onChange: (e) => set("yearOfConstruction", e.target.value),
            placeholder: "e.g. 1998"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "building-renovation-date", children: "Last renovation date" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DateInput,
          {
            id: "building-renovation-date",
            label: "Last renovation date",
            value: form.lastRenovationDate,
            onChange: (iso) => set("lastRenovationDate", iso),
            max: todayLocalIso(),
            compact: true,
            className: "mt-1"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Renovation fund required (₹)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            type: "number",
            className: "glass-input mt-1",
            value: form.renovationFundRequired,
            onChange: (e) => set("renovationFundRequired", e.target.value)
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sm:col-span-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Remarks" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            className: "glass-input mt-1",
            value: form.remarks,
            onChange: (e) => set("remarks", e.target.value)
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Button,
      {
        disabled: busy,
        onClick: async () => {
          setBusy(true);
          await onSubmit({
            buildingStatus: form.buildingStatus,
            buildingType: form.buildingType || void 0,
            yearOfConstruction: form.yearOfConstruction || void 0,
            lastRenovationDate: form.lastRenovationDate || void 0,
            renovationFundRequired: form.renovationFundRequired === "" ? void 0 : Number(form.renovationFundRequired),
            remarks: form.remarks || void 0
          });
          setBusy(false);
        },
        children: [
          busy && /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-2 size-4 animate-spin" }),
          submitLabel
        ]
      }
    )
  ] });
}
function BuildingRowCard({
  building,
  buildingStatuses,
  canEdit,
  onUpdate,
  onDelete
}) {
  const [editing, setEditing] = reactExports.useState(false);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "glass py-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "px-4", children: editing ? /* @__PURE__ */ jsxRuntimeExports.jsx(
    BuildingForm,
    {
      buildingStatuses,
      initial: building,
      submitLabel: "Save changes",
      onSubmit: async (vals) => {
        await onUpdate(building._id, vals);
        setEditing(false);
      }
    }
  ) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 text-sm", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "font-medium", children: [
        building.buildingType ? `${building.buildingType} — ` : "",
        "Built",
        " ",
        building.yearOfConstruction || "—"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-muted-foreground", children: [
        "Last renovation ",
        toDisplayDate(building.lastRenovationDate),
        " · Renovation fund ₹",
        building.renovationFundRequired ?? 0
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-right", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: building.buildingStatus }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mt-0.5 block text-[10px] text-muted-foreground", children: [
          "Updated: ",
          toDisplayDateTime(building.lastUpdatedAt)
        ] })
      ] }),
      canEdit && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "sm", onClick: () => setEditing(true), children: "Edit" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "destructive", size: "sm", onClick: () => onDelete(building._id), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "size-3.5" }) })
      ] })
    ] })
  ] }) }) });
}
function EditFacilityDialog({
  open,
  onOpenChange,
  facility,
  onSave
}) {
  const initial = reactExports.useMemo(
    () => ({
      block: facility.block,
      phc: facility.phc,
      name: facility.name,
      facilityType: facility.facilityType,
      phaseType: facility.phaseType ?? "",
      eligibility: facility.eligibility,
      ninNumber: facility.ninNumber ?? "",
      saqshamFacilityType: facility.saqshamFacilityType ?? "",
      saqshamCategory: facility.saqshamCategory ?? "",
      remarks: facility.remarks ?? ""
    }),
    [facility]
  );
  const [form, setForm] = reactExports.useState(initial);
  const [busy, setBusy] = reactExports.useState(false);
  const [discardOpen, setDiscardOpen] = reactExports.useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const requestClose = (next) => {
    if (!next && dirty) {
      setDiscardOpen(true);
      return;
    }
    onOpenChange(next);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onOpenChange: requestClose, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "glass-strong max-h-[85vh] overflow-y-auto sm:max-w-lg", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Edit facility details" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "Every field change is logged with old and new values." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(FieldGrid, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Block name" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { className: "glass-input mt-1", value: form.block, onChange: (e) => set("block", e.target.value) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "PHC name" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { className: "glass-input mt-1", value: form.phc, onChange: (e) => set("phc", e.target.value) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sm:col-span-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Facility name" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { className: "glass-input mt-1", value: form.name, onChange: (e) => set("name", e.target.value) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Facility type" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { className: "glass-input mt-1", value: form.facilityType, onChange: (e) => set("facilityType", e.target.value) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "NIN Number" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              className: "glass-input mt-1",
              value: form.ninNumber,
              onChange: (e) => set("ninNumber", e.target.value),
              placeholder: "Unique facility ID"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Phase type" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { className: "glass-input mt-1", value: form.phaseType, onChange: (e) => set("phaseType", e.target.value) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "NQAS eligibility" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: form.eligibility, onValueChange: (v) => set("eligibility", v), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "glass-input mt-1 w-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: ELIGIBILITIES.map((e) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: e, children: e }, e)) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "SaQsham Facility_Type" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              className: "glass-input mt-1",
              value: form.saqshamFacilityType,
              onChange: (e) => set("saqshamFacilityType", e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sm:col-span-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "SaQsham Facility Name/Category" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              className: "glass-input mt-1",
              value: form.saqshamCategory,
              onChange: (e) => set("saqshamCategory", e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sm:col-span-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "General remarks" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Textarea, { className: "glass-input mt-1", rows: 2, value: form.remarks, onChange: (e) => set("remarks", e.target.value) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { className: "items-center gap-2 sm:justify-between", children: [
        dirty ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mr-auto flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-3.5" }),
          " Unsaved changes"
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mr-auto" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => requestClose(false), children: "Cancel" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              disabled: busy,
              onClick: async () => {
                setBusy(true);
                await onSave({
                  block: form.block,
                  phc: form.phc,
                  name: form.name,
                  facilityType: form.facilityType,
                  phaseType: form.phaseType || void 0,
                  eligibility: form.eligibility,
                  ninNumber: form.ninNumber || void 0,
                  saqshamFacilityType: form.saqshamFacilityType || void 0,
                  saqshamCategory: form.saqshamCategory || void 0,
                  remarks: form.remarks || void 0
                });
                setBusy(false);
              },
              children: [
                busy && /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-2 size-4 animate-spin" }),
                "Save changes"
              ]
            }
          )
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialog, { open: discardOpen, onOpenChange: setDiscardOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogContent, { className: "glass-strong", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogTitle, { children: "Discard unsaved changes?" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogDescription, { children: [
          "You have edited ",
          facility.name,
          ". Closing now keeps the previously saved values and drops these edits."
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogFooter, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogCancel, { children: "Keep editing" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          AlertDialogAction,
          {
            className: "bg-destructive text-white",
            onClick: () => {
              setForm(initial);
              setDiscardOpen(false);
              onOpenChange(false);
            },
            children: "Discard changes"
          }
        )
      ] })
    ] }) })
  ] });
}

export { BuildingForm, FundForm, NocForm, FacilityProfile as default };
