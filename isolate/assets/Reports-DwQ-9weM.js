const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/CycleReportView-gSzXpuwk.js","assets/vendor-motion-DgC1stbS.js","assets/icons-BxQpodNr.js","assets/index-BALjev1w.js","assets/vendor-charts--qXk384P.js","assets/index-CBV6wOh8.js","assets/vendor-jspdf-BarNdCns.js","assets/index-CneVNiou.css","assets/cycleReport-BZcLzeXW.js","assets/AppShell-CP099uvN.js","assets/NqasLogo-CIWlMexW.js","assets/label-BaPkqXdo.js","assets/shareLink-_K-oJu5R.js","assets/reportColumns-DJVmn3gI.js","assets/fiscalYear-QbChygln.js","assets/SegmentBar-BPZwoyP9.js","assets/LineListsTab-CVdfh4pM.js","assets/input-Cy2oZLur.js","assets/dialog-BW3GEiPg.js","assets/org-DjtYn14q.js","assets/today-D9v8Esj5.js","assets/lineListExport-Cwr38yWb.js","assets/buildingBuckets-CQds7ysI.js","assets/masterFilter-DrauVhuN.js","assets/facilityQuickView-BCxVjMPj.js","assets/facilityProfileState-D76_z1Ay.js","assets/masterExport-Dlb4N-po.js","assets/facilitySheet-LEzrIYOJ.js","assets/scoreBands-CA46Kez8.js","assets/phone-C-n0eG_z.js","assets/masterReportPrint-CpdXQQkg.js","assets/lineListTemplates-Bxak1gVr.js","assets/checkbox-CjOYMc2v.js","assets/dropdown-menu-N0nU9bdA.js","assets/ExportDialog-Dhw8AWo1.js","assets/masterGrid-CjX4ti61.js","assets/FacilityQuickView-D07vvNqK.js","assets/skeleton-D-jVDmpg.js","assets/PdfCanvasViewer-C0MZuH_2.js","assets/DocumentField-4d87_sVm.js","assets/select-qTILnHQg.js","assets/DateInput-DZAT80St.js","assets/dateInput-0KZh0HdG.js","assets/AttachmentPicker-B8WtH0vb.js","assets/FacilityCell-CI45DpPw.js","assets/FacilityTypeBadge-8G3otPEU.js","assets/StatusBadge-BPGGn135.js","assets/textarea-Dm9kSFQo.js","assets/SaveBar--TNBfs1X.js","assets/UniversalFilterBar-uuD2kW1Y.js","assets/filters-BlRAASYu.js","assets/cycleReportExport-DclIk7lT.js"])))=>i.map(i=>d[i]);
import { _ as __vitePreload } from './vendor-jspdf-BarNdCns.js';
import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, H as ChevronDown, L as LoaderCircle, a2 as Download, F as FileSpreadsheet, u as FileText, a4 as Printer, m as Check, T as TriangleAlert } from './icons-BxQpodNr.js';
import { d as useSearchParams, l as useQuery, j as api, m as useMutation, c as cn, B as Button, t as toast } from './index-CBV6wOh8.js';
import { l as docColumnStatuses, m as deriveFlatLifecycle, o as classifyPipeline, p as docStageLabel, q as RESULT_DECLARED_BUCKET, r as NOT_RECORDED_BUCKET, s as NOT_IN_PIPELINE_BUCKET, u as useCycleScope, a as useSetCycleScope, w as withLegacyIa, v as buildIaMasterIndex, x as iaPairFor, y as withIaPeriodLabels, z as resolveLabels, D as DEFAULT_SETTINGS, B as docPipelineZone, A as AppShell, c as CycleFilter, e as Popover, f as PopoverTrigger, g as PopoverContent, b as toDisplayDate, E as REPORT_COLUMNS } from './AppShell-CP099uvN.js';
import { F as FacilityCell } from './FacilityCell-CI45DpPw.js';
import { D as DropdownMenu, a as DropdownMenuTrigger, b as DropdownMenuContent, h as DropdownMenuSub, i as DropdownMenuSubTrigger, j as DropdownMenuSubContent, f as DropdownMenuItem } from './dropdown-menu-N0nU9bdA.js';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from './select-qTILnHQg.js';
import { u as usePagination, F as FilterDropdown, R as RowViewSelect, P as PaginationBar } from './FilterDropdown-B_vJKp6C.js';
import { c as countActiveFilters, F as FilterBar, a as FilterSearch } from './filters-BlRAASYu.js';
import { b as buildEligibilityOptions, a as applyMasterFilters, m as multiFilterMatches } from './masterFilter-DrauVhuN.js';
import { p as percentOf, d as formatPercent, j as percentLabel, h as downloadText } from './reportColumns-DJVmn3gI.js';
import { t as todayLocalIso } from './today-D9v8Esj5.js';
import { e as emptyBuildingCounts, b as buildingBucketOf, s as sumBuildingCounts, B as BUILDING_BUCKET_ORDER } from './buildingBuckets-CQds7ysI.js';
import { l as loadMasterView, n as normalizeView, s as saveMasterView, o as orderedVisibleColumns } from './masterGrid-CjX4ti61.js';
import { r as readDisplaySettings, l as loadBoolPref, s as saveBoolPref, F as FREEZE_PREF_KEY } from './tableDisplay-Bmg1sKyc.js';
import { A as AutoFitTableScroll, T as TableHeader, a as TableRow, b as TableHead, c as TableBody, d as TableCell, e as TableFooter } from './table-DH4Byhhd.js';
import { G as GroupedMasterTable, C as ColumnManager, E as ExportDialog } from './ExportDialog-Dhw8AWo1.js';
import { F as FacilityQuickView } from './FacilityQuickView-D07vvNqK.js';
import { e as exportMasterWorkbook, a as exportMasterPdf, b as exportMasterCsv } from './masterExport-Dlb4N-po.js';
import { o as openMasterPrint } from './masterReportPrint-CpdXQQkg.js';
import { a as exportExcel, b as buildTablePdf } from './exportTable-BCt2u4fE.js';
import './vendor-charts--qXk384P.js';
import './NqasLogo-CIWlMexW.js';
import './label-BaPkqXdo.js';
import './shareLink-_K-oJu5R.js';
import './FacilityTypeBadge-8G3otPEU.js';
import './index-BALjev1w.js';
import './checkbox-CjOYMc2v.js';
import './dialog-BW3GEiPg.js';
import './skeleton-D-jVDmpg.js';
import './PdfCanvasViewer-C0MZuH_2.js';
import './DocumentField-4d87_sVm.js';
import './scoreBands-CA46Kez8.js';
import './phone-C-n0eG_z.js';
import './DateInput-DZAT80St.js';
import './dateInput-0KZh0HdG.js';
import './input-Cy2oZLur.js';
import './AttachmentPicker-B8WtH0vb.js';
import './StatusBadge-BPGGn135.js';
import './textarea-Dm9kSFQo.js';
import './facilityQuickView-BCxVjMPj.js';
import './facilityProfileState-D76_z1Ay.js';
import './SaveBar--TNBfs1X.js';
import './org-DjtYn14q.js';
import './facilitySheet-LEzrIYOJ.js';

function reportRowToMasterRow(r) {
  return {
    facility: {
      _id: r.facilityId,
      name: r.facility,
      block: r.block,
      phc: r.phc,
      facilityType: r.type,
      ninNumber: r.nin,
      eligibility: r.eligibility || null,
      currentStatus: r.currentStatus || null,
      statusOverride: null,
      remarks: r.remarks,
      documentsStatusReport: r.documentsStatusReport,
      saqshamStatusRaw: null,
      saqshamApplicationNo: null,
      saqshamPortalUpdatedOn: null,
      saqshamPortalUpdatedBy: null,
      updatedAt: null,
      nqasIaQ1: r.nqasIaQ1,
      nqasIaQ2: r.nqasIaQ2,
      kayakalpIaQ1: r.kayakalpIaQ1,
      kayakalpIaQ2: r.kayakalpIaQ2
    },
    cycleNumber: r.cycle,
    cycleType: null,
    sa: {
      status: r.saStatus,
      actualStartDate: r.saStartDate,
      actualEndDate: r.saEndDate,
      scorePercent: r.saScore,
      generalDocStatus: r.generalDocStatus,
      assessor1Name: r.saAssessor1Name,
      assessor1Hud: r.saAssessor1Hud,
      assessor2Name: r.saAssessor2Name,
      assessor2Hud: r.saAssessor2Hud,
      reportAttachmentId: r.saReportAttachmentId,
      reportAttachmentName: r.saReportAttachmentName,
      checklistAttachmentId: r.saChecklistAttachmentId,
      checklistAttachmentName: r.saChecklistAttachmentName
    },
    nqas: {
      status: r.naStatus,
      scheduledStartDate: r.naScheduledDate,
      actualEndDate: r.naEndDate,
      mode: r.naMode,
      departments: r.departments,
      scorePercent: r.certScore,
      certificationStatus: r.certStatus,
      certificationDate: r.certDate,
      goiLetterDate: null,
      validityDate: r.validityDate,
      surveillanceDue1: r.surveillanceDue1,
      surveillanceDone1: r.surveillanceDone1,
      surveillanceDue2: r.surveillanceDue2,
      surveillanceDone2: r.surveillanceDone2,
      manualScore: r.manualScore,
      recertStatus: r.recertStatus,
      recertYear: r.recertYear
    },
    fund: {
      amountSanctioned: r.gapClosureAmount,
      financialYear: r.gcFundYear,
      procLink: r.fundProcLink,
      status: null
    },
    noc: {
      nocAvailable: r.nocAvailable,
      status: r.fireNocStatus,
      issuedDate: r.nocCertifiedDate,
      expiryDate: r.fireNocValidity,
      nocLink: r.nocLink,
      nocAttachmentId: null,
      nocAttachmentName: null
    },
    building: {
      buildingType: r.buildingType,
      buildingStatus: r.buildingStatus,
      condemnedLink: r.condemnedLink
    },
    ia: null,
    resultDocumentId: null,
    resultDocumentName: null
  };
}
function buildReportRows(rows) {
  return rows.map(reportRowToMasterRow);
}

function summarizeTypeWise(rows, dimension, docStatuses, _buildingStatuses, cycle = null) {
  const docColumns = docColumnStatuses(docStatuses);
  const groups = /* @__PURE__ */ new Map();
  for (const r of rows) {
    if (cycle != null && r.cycle !== cycle) continue;
    const key = dimension === "type" ? r.facilityType : dimension === "block" ? r.block : r.phc || r.block;
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }
  const out = [];
  for (const [rawLabel, list] of [...groups.entries()].sort(
    (a, b) => a[0].localeCompare(b[0])
  )) {
    const label = cycle != null ? `Cycle #${cycle} · ${rawLabel}` : rawLabel;
    const docCounts = {};
    for (const s of docColumns) docCounts[s] = 0;
    const buildingCounts = emptyBuildingCounts();
    let certified = 0;
    let conditional = 0;
    let deferred = 0;
    let certDoubles = 0;
    let nqasScheduled = 0;
    let resultAwaited = 0;
    let resultDeclared = 0;
    let notRecorded = 0;
    let notInPipeline = 0;
    let nextPhase = 0;
    const certFailures = [];
    const pipelineFailures = [];
    for (const r of list) {
      const id = String(r.facilityId ?? `${r.block}/${r.phc}/${r.facilityType}`);
      const view = deriveFlatLifecycle({
        currentStatus: r.currentStatus,
        certStatus: r.certStatus,
        naStatus: r.naStatus,
        naStartDate: r.naStartDate,
        docStatus: r.docStatus
      });
      if (view.isQualityCertified) certified += 1;
      if (view.isConditional) conditional += 1;
      if (view.isDeferred) deferred += 1;
      const certFlags = (view.isQualityCertified ? 1 : 0) + (view.isConditional ? 1 : 0) + (view.isDeferred ? 1 : 0);
      if (certFlags > 1) {
        certDoubles += 1;
        certFailures.push(id);
      }
      const placement = classifyPipeline({
        view,
        saStatus: r.saStatus,
        docStatus: r.docStatus,
        docStatuses: docColumns,
        certificationStatus: r.certStatus
      });
      switch (placement.kind) {
        case "resultDeclared":
          resultDeclared += 1;
          break;
        case "zone":
          if (placement.bucket === "NQAS Scheduled") nqasScheduled += 1;
          else if (placement.bucket === "Result awaited") resultAwaited += 1;
          else nextPhase += 1;
          break;
        case "doc":
          docCounts[placement.bucket] = (docCounts[placement.bucket] ?? 0) + 1;
          break;
        case "notRecorded":
          notRecorded += 1;
          break;
        default:
          notInPipeline += 1;
          pipelineFailures.push(id);
      }
      buildingCounts[buildingBucketOf(r.buildingStatus)] += 1;
    }
    const buildingTotal = sumBuildingCounts(buildingCounts);
    const notCertified = Math.max(
      0,
      list.length - certified - conditional - deferred
    );
    const docTotal = nqasScheduled + resultAwaited + resultDeclared + notRecorded + nextPhase + notInPipeline + Object.values(docCounts).reduce((a, b) => a + b, 0);
    out.push({
      label,
      target: list.length,
      certified,
      conditional,
      totalCertified: certified + conditional,
      certifiedPct: percentOf(certified + conditional, list.length) ?? 0,
      deferred,
      notCertified,
      nqasScheduled,
      resultAwaited,
      resultDeclared,
      notRecorded,
      notInPipeline,
      docCounts,
      nextPhase,
      docTotal,
      buildingCounts,
      buildingTotal,
      failures: {
        certification: certFailures,
        pipeline: pipelineFailures,
        building: []
      },
      reconcile: {
        // The remainder is part of the certification group, so the group
        // always sums; a facility with two certification results still fails.
        certification: certDoubles === 0,
        // The remainder is NOT a pass: every facility must land in a real
        // bucket. "Not recorded" is real; "Not in pipeline" is the alarm.
        pipeline: notInPipeline === 0,
        building: buildingTotal === list.length
      }
    });
  }
  return out;
}
function grandTotalTypeWise(rows) {
  const acc = {
    label: "Grand Total",
    target: 0,
    certified: 0,
    conditional: 0,
    totalCertified: 0,
    certifiedPct: 0,
    deferred: 0,
    notCertified: 0,
    nqasScheduled: 0,
    resultAwaited: 0,
    resultDeclared: 0,
    notRecorded: 0,
    notInPipeline: 0,
    docCounts: {},
    nextPhase: 0,
    docTotal: 0,
    buildingCounts: emptyBuildingCounts(),
    buildingTotal: 0,
    failures: { certification: [], pipeline: [], building: [] },
    reconcile: { certification: true, pipeline: true, building: true }
  };
  for (const r of rows) {
    acc.target += r.target;
    acc.certified += r.certified;
    acc.conditional += r.conditional;
    acc.totalCertified += r.totalCertified;
    acc.deferred += r.deferred;
    acc.notCertified += r.notCertified;
    acc.nqasScheduled += r.nqasScheduled;
    acc.resultAwaited += r.resultAwaited;
    acc.resultDeclared += r.resultDeclared;
    acc.notRecorded += r.notRecorded;
    acc.notInPipeline += r.notInPipeline;
    acc.nextPhase += r.nextPhase;
    acc.docTotal += r.docTotal;
    acc.buildingTotal += r.buildingTotal;
    acc.reconcile.certification &&= r.reconcile.certification;
    acc.reconcile.pipeline &&= r.reconcile.pipeline;
    acc.reconcile.building &&= r.reconcile.building;
    acc.failures.certification.push(...r.failures.certification);
    acc.failures.pipeline.push(...r.failures.pipeline);
    acc.failures.building.push(...r.failures.building);
    for (const [k, v] of Object.entries(r.docCounts))
      acc.docCounts[k] = (acc.docCounts[k] ?? 0) + v;
    for (const b of BUILDING_BUCKET_ORDER)
      acc.buildingCounts[b] += r.buildingCounts[b] ?? 0;
  }
  acc.certifiedPct = percentOf(acc.totalCertified, acc.target) ?? 0;
  return acc;
}
function countedFor(total) {
  return {
    certification: Math.max(0, total.target - total.failures.certification.length),
    pipeline: Math.max(0, total.target - total.failures.pipeline.length),
    building: total.buildingTotal
  };
}
function reconciliationText(total) {
  const n = total.target;
  const counted = countedFor(total);
  const line = (name, ok, value, missing, doubles) => {
    if (ok) return `${name} ✓ ${value}/${n}`;
    return `${name} ✗ ${value}/${n} — ${missing} facilit${missing === 1 ? "y" : "ies"} in no bucket, ${doubles} in two buckets`;
  };
  return [
    line(
      "Certification",
      total.reconcile.certification,
      counted.certification,
      0,
      total.failures.certification.length
    ),
    line(
      "Pipeline",
      total.reconcile.pipeline,
      counted.pipeline,
      total.failures.pipeline.length,
      0
    ),
    line(
      "Building",
      total.reconcile.building,
      counted.building,
      Math.max(0, n - total.buildingTotal),
      Math.max(0, total.buildingTotal - n)
    )
  ].join(" · ");
}
function pctCellClass(pct) {
  if (pct >= 100) return "bg-emerald-600 text-white";
  if (pct >= 60) return "bg-emerald-400/70";
  if (pct > 0) return "bg-emerald-200/60";
  return "";
}
const CELL_BASE = "whitespace-nowrap text-center tabular-nums";
const HEAD_BASE = "px-2 py-2 text-center align-middle font-semibold";
const W_LABEL = "w-[150px] min-w-[150px] max-w-[150px] text-left";
const W_NUM = "w-[92px] min-w-[92px] max-w-[92px]";
const W_TOTAL = "w-[104px] min-w-[104px] max-w-[104px]";
function TypeWiseSummaryTable({
  rows,
  dimension,
  docStatuses,
  buildingStatuses,
  onCellClick
}) {
  const docColumns = docColumnStatuses(docStatuses);
  const total = grandTotalTypeWise(rows);
  const clickFor = (kind, value, rowLabel) => {
    if (!onCellClick) return void 0;
    return () => onCellClick(kind, value, rowLabel);
  };
  const clickable = (handler) => handler ? "cursor-pointer underline-offset-2 hover:text-foreground hover:bg-muted/70" : "";
  const frozenHead = "sticky left-0 z-20 bg-background";
  const frozenCell = "sticky left-0 z-10 bg-background";
  const totalCell = "bg-muted font-bold";
  const dimLabel = dimension === "type" ? "Facility Type" : dimension === "block" ? "Block" : "PHC Name";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    AutoFitTableScroll,
    {
      className: "rounded-xl border bg-background/60",
      maxHeight: "none",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableHeader, { className: "[&_th]:h-auto [&_th]:py-1.5 [&_th]:align-middle [&_th]:leading-tight", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { className: "border-b-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: `${W_LABEL} border-r border-border/60 bg-background` }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TableHead,
              {
                colSpan: 7,
                className: "border-r border-border/60 bg-transparent text-center text-[11px] font-semibold tracking-wide text-muted-foreground uppercase",
                children: "Target & certification"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TableHead,
              {
                colSpan: docColumns.length + 7,
                className: "border-r border-border/60 bg-sky-50 text-center text-[11px] font-semibold tracking-wide text-sky-900 uppercase",
                children: "Document pipeline"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TableHead,
              {
                colSpan: BUILDING_BUCKET_ORDER.length + 1,
                className: "bg-rose-50 text-center text-[11px] font-semibold tracking-wide text-rose-900 uppercase",
                children: "Facility building status"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: `${W_LABEL} ${frozenHead} border-r border-border/60`, children: dimLabel }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: `${W_NUM} ${HEAD_BASE}`, children: "Target" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: `${W_NUM} ${HEAD_BASE}`, children: "Certified" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: `${W_TOTAL} ${HEAD_BASE} whitespace-normal`, children: "Certified with Conditionality" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: `${W_NUM} ${HEAD_BASE} whitespace-normal`, children: "Total Certified" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: `${W_NUM} ${HEAD_BASE}`, children: "Certified %" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: `${W_NUM} ${HEAD_BASE}`, children: "Deferred" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TableHead,
              {
                "data-tip": "Remainder of the certification group — every facility not certified, conditional or deferred. With this column the group always sums to Target.",
                className: `${W_NUM} ${HEAD_BASE} whitespace-normal`,
                children: "Not certified"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: `${W_NUM} ${HEAD_BASE} whitespace-normal`, children: "NQAS Scheduled" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: `${W_TOTAL} ${HEAD_BASE} whitespace-normal`, children: "Result awaited" }),
            docColumns.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              TableHead,
              {
                "data-tip": docStageLabel(s),
                className: `${W_NUM} ${HEAD_BASE} whitespace-normal`,
                children: docStageLabel(s)
              },
              s
            )),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TableHead,
              {
                "data-tip": "SaQsham Documents Status = Result Declared (certified, conditional or deferred).",
                className: `${W_NUM} ${HEAD_BASE} whitespace-normal`,
                children: RESULT_DECLARED_BUCKET
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TableHead,
              {
                "data-tip": "No SaQsham Documents Status has been recorded for the facility yet.",
                className: `${W_NUM} ${HEAD_BASE} whitespace-normal`,
                children: NOT_RECORDED_BUCKET
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: `${W_NUM} ${HEAD_BASE} whitespace-normal`, children: "Next Phase" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TableHead,
              {
                "data-tip": "Remainder of the pipeline group. Non-zero means a stored status is not in the admin list — click the reconciliation chip to see the facilities.",
                className: `${W_NUM} ${HEAD_BASE} whitespace-normal`,
                children: NOT_IN_PIPELINE_BUCKET
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TableHead,
              {
                "data-tip": "Every facility counted once across the pipeline buckets (equals Target when the Pipeline check passes).",
                className: `${W_TOTAL} ${HEAD_BASE} bg-muted/60 font-bold whitespace-normal`,
                children: "In pipeline (total)"
              }
            ),
            BUILDING_BUCKET_ORDER.map((b) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              TableHead,
              {
                "data-tip": b === "Other" ? "Other — a stored building status that maps to no named bucket (e.g. Others, Inaugurated). Nothing is dropped." : b === "No record" ? "No record — the building status is blank or explicitly “No record”" : b,
                className: `${W_NUM} ${HEAD_BASE} whitespace-normal`,
                children: b
              },
              b
            )),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TableHead,
              {
                "data-tip": "Building recorded — every facility counted once across the building-status buckets",
                className: `${W_TOTAL} ${HEAD_BASE} bg-muted/60 font-bold whitespace-normal`,
                children: "Building recorded"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
          rows.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TableCell,
            {
              colSpan: 8 + docColumns.length + 7 + BUILDING_BUCKET_ORDER.length + 1,
              className: "py-8 text-center text-muted-foreground",
              children: "No facilities to summarize yet."
            }
          ) }),
          rows.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: `${W_LABEL} ${frozenCell} border-r border-border/60 truncate`, children: r.label }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: `${W_NUM} ${CELL_BASE} font-semibold`, children: r.target }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: `${W_NUM} ${CELL_BASE}`, children: r.certified }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: `${W_NUM} ${CELL_BASE}`, children: r.conditional }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: `${W_NUM} ${CELL_BASE} font-semibold`, children: r.totalCertified }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TableCell,
              {
                className: `${W_NUM} text-center text-xs font-semibold tabular-nums ${pctCellClass(r.certifiedPct)}`,
                children: formatPercent(r.certifiedPct)
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: `${W_NUM} ${CELL_BASE}`, children: r.deferred }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: `${W_NUM} ${CELL_BASE}`, children: r.notCertified }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: `${W_NUM} ${CELL_BASE}`, children: r.nqasScheduled }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: `${W_NUM} ${CELL_BASE}`, children: r.resultAwaited }),
            docColumns.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              TableCell,
              {
                className: `${W_NUM} ${CELL_BASE} ${clickable(clickFor("pipeline", s, r.label))}`,
                onClick: clickFor("pipeline", s, r.label),
                children: r.docCounts[s] ?? 0
              },
              s
            )),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: `${W_NUM} ${CELL_BASE}`, children: r.resultDeclared }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: `${W_NUM} ${CELL_BASE}`, children: r.notRecorded }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: `${W_NUM} ${CELL_BASE}`, children: r.nextPhase }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TableCell,
              {
                className: `${W_NUM} ${CELL_BASE} ${clickable(clickFor("pipeline", NOT_IN_PIPELINE_BUCKET, r.label))} ${r.notInPipeline > 0 ? "font-bold text-rose-700" : ""}`,
                onClick: clickFor("pipeline", NOT_IN_PIPELINE_BUCKET, r.label),
                children: r.notInPipeline
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TableCell,
              {
                "data-tip": "In pipeline (total) — the row's pipeline columns added together",
                className: `${W_TOTAL} ${CELL_BASE} bg-muted/60 font-bold`,
                children: r.docTotal
              }
            ),
            BUILDING_BUCKET_ORDER.map((b) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              TableCell,
              {
                className: `${W_NUM} ${CELL_BASE} ${clickable(clickFor("building", b, r.label))}`,
                onClick: clickFor("building", b, r.label),
                children: r.buildingCounts[b]
              },
              b
            )),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TableCell,
              {
                "data-tip": "Building recorded — the row's building columns added together (equals Target when nothing is dropped)",
                className: `${W_TOTAL} ${CELL_BASE} bg-muted/60 font-bold`,
                children: r.buildingTotal
              }
            )
          ] }, r.label))
        ] }),
        rows.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableFooter, { className: "border-t-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: `${W_LABEL} ${frozenCell} ${totalCell} border-r border-border/60`, children: total.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: `${W_NUM} ${CELL_BASE} ${totalCell}`, children: total.target }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: `${W_NUM} ${CELL_BASE} ${totalCell}`, children: total.certified }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: `${W_NUM} ${CELL_BASE} ${totalCell}`, children: total.conditional }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: `${W_NUM} ${CELL_BASE} ${totalCell}`, children: total.totalCertified }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TableCell,
            {
              className: `${W_NUM} text-center text-xs font-bold tabular-nums ${totalCell} ${pctCellClass(total.certifiedPct)}`,
              children: formatPercent(total.certifiedPct)
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: `${W_NUM} ${CELL_BASE} ${totalCell}`, children: total.deferred }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: `${W_NUM} ${CELL_BASE} ${totalCell}`, children: total.notCertified }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: `${W_NUM} ${CELL_BASE} ${totalCell}`, children: total.nqasScheduled }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: `${W_NUM} ${CELL_BASE} ${totalCell}`, children: total.resultAwaited }),
          docColumns.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: `${W_NUM} ${CELL_BASE} ${totalCell}`, children: total.docCounts[s] ?? 0 }, s)),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: `${W_NUM} ${CELL_BASE} ${totalCell}`, children: total.resultDeclared }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: `${W_NUM} ${CELL_BASE} ${totalCell}`, children: total.notRecorded }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: `${W_NUM} ${CELL_BASE} ${totalCell}`, children: total.nextPhase }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: `${W_NUM} ${CELL_BASE} ${totalCell}`, children: total.notInPipeline }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: `${W_TOTAL} ${CELL_BASE} ${totalCell}`, children: total.docTotal }),
          BUILDING_BUCKET_ORDER.map((b) => /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: `${W_NUM} ${CELL_BASE} ${totalCell}`, children: total.buildingCounts[b] }, b)),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: `${W_TOTAL} ${CELL_BASE} ${totalCell}`, children: total.buildingTotal })
        ] }) })
      ]
    }
  );
}
function typeWiseSummaryCsv(rows, dimension, docStatuses, buildingStatuses) {
  const docColumns = docColumnStatuses(docStatuses);
  const headers = [
    dimension === "type" ? "Facility Type" : dimension === "block" ? "Block" : "PHC Name",
    "Target",
    "Certified",
    "Certified with Conditionality",
    "Total Certified",
    "Certified %",
    "Deferred",
    "Not certified",
    "NQAS Scheduled",
    "Result awaited",
    ...docColumns.map(docStageLabel),
    RESULT_DECLARED_BUCKET,
    NOT_RECORDED_BUCKET,
    "Next Phase",
    NOT_IN_PIPELINE_BUCKET,
    "In pipeline (total)",
    ...BUILDING_BUCKET_ORDER,
    "Building recorded"
  ];
  const data = [...rows, grandTotalTypeWise(rows)].map((r) => [
    r.label,
    r.target,
    r.certified,
    r.conditional,
    r.totalCertified,
    percentLabel(r.totalCertified, r.target),
    r.deferred,
    r.notCertified,
    r.nqasScheduled,
    r.resultAwaited,
    ...docColumns.map((s) => r.docCounts[s] ?? 0),
    r.resultDeclared,
    r.notRecorded,
    r.nextPhase,
    r.notInPipeline,
    r.docTotal,
    ...BUILDING_BUCKET_ORDER.map((b) => r.buildingCounts[b]),
    r.buildingTotal
  ]);
  return { headers, rows: data };
}

const CycleReportView = reactExports.lazy(
  () => __vitePreload(() => import('./CycleReportView-gSzXpuwk.js'),true              ?__vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]):void 0).then((m) => ({
    default: m.CycleReportView
  }))
);
const LineListsTab = reactExports.lazy(
  () => __vitePreload(() => import('./LineListsTab-CVdfh4pM.js'),true              ?__vite__mapDeps([16,1,2,5,6,4,7,17,18,9,10,11,12,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,3,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50]):void 0).then((m) => ({
    default: m.LineListsTab
  }))
);
const TAB_LABELS = {
  summary: "Summary",
  cycle: "Certification cycles",
  linelists: "Line lists",
  master: "Master list"
};
const CYCLE_VIEWS = ["overview", "renewals", "compare", "list"];
const isCycleView = (v) => !!v && CYCLE_VIEWS.includes(v);
const listParam = (params, key) => (params.get(key) ?? "").split(",").map((v) => v.trim()).filter(Boolean);
const FILTER_PARAMS = [
  "q",
  "block",
  "phc",
  "type",
  "cert",
  "elig",
  "bstatus",
  "status",
  "noc"
];
const filterSignature = (params) => FILTER_PARAMS.map((k) => params.get(k) ?? "").join("|");
const SUMMARY_DIM_LABELS = {
  type: "Type-wise",
  block: "Block-wise",
  phc: "PHC-wise"
};
const tableScrollRef = { current: null };
const esc = (s) => s.replace(
  /[&<>"]/g,
  (ch) => ch === "&" ? "&amp;" : ch === "<" ? "&lt;" : ch === ">" ? "&gt;" : "&quot;"
);
const csvNeedsQuote = (v) => /[",\r\n]/.test(String(v));
const csvCell = (v) => {
  const s = String(v);
  return csvNeedsQuote(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab = tabParam === "cycle" || tabParam === "linelists" || tabParam === "master" ? tabParam : "summary";
  const setTab = (next) => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        params.set("tab", next);
        return params;
      },
      { replace: false }
    );
  };
  const cycleScope = useCycleScope();
  const setCycleScope = useSetCycleScope();
  const data = useQuery(
    api.modules.getReportData,
    typeof cycleScope === "number" ? { cycle: cycleScope } : {}
  );
  const summary = useQuery(api.summaries.getTypeWiseSummary, {});
  const settings = useQuery(api.facilities.getAppSettings, {});
  const cycleData = useQuery(
    api.cycleReport.getFacilityCycleRows,
    tab === "cycle" ? {} : "skip"
  );
  const cycleCounts = useQuery(api.modules.cycleSummary, {});
  const viewParam = searchParams.get("view");
  const cycleView = isCycleView(viewParam) ? viewParam : "overview";
  const setCycleParam = (key, value) => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (value) params.set(key, value);
        else params.delete(key);
        return params;
      },
      { replace: true }
    );
  };
  const cycleBucket = searchParams.get("bucket");
  const cycleStep = searchParams.get("step");
  const rows = reactExports.useMemo(
    () => buildReportRows(data?.rows ?? []),
    [data]
  );
  const iaQuartersQ = useQuery(api.ia.listIaQuarters, { limit: 2e4 });
  const iaIndex = reactExports.useMemo(
    () => iaQuartersQ ? withLegacyIa(
      buildIaMasterIndex(
        iaQuartersQ.map((q) => ({
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
      rows.map((r) => ({
        id: r.facility._id,
        nqasIaQ1: r.facility.nqasIaQ1 ?? null,
        kayakalpIaQ1: r.facility.kayakalpIaQ1 ?? null,
        nqasIaQ2: r.facility.nqasIaQ2 ?? null,
        kayakalpIaQ2: r.facility.kayakalpIaQ2 ?? null
      }))
    ) : null,
    [iaQuartersQ, rows]
  );
  const iaPair = reactExports.useMemo(
    () => iaIndex ? iaPairFor(null, iaIndex, todayLocalIso()) : null,
    [iaIndex]
  );
  const overrides = settings?.settings.tableHeaderOverrides;
  const labels = reactExports.useMemo(
    () => withIaPeriodLabels(
      resolveLabels(REPORT_COLUMNS, overrides),
      iaPair
    ),
    [overrides, iaPair]
  );
  const [cachedView] = reactExports.useState(() => loadMasterView("report"));
  const [editedView, setEditedView] = reactExports.useState(null);
  const serverView = useQuery(api.ops.getMasterView, { scope: "report" });
  const saveServerView = useMutation(api.ops.setMasterView);
  const savedView = reactExports.useMemo(
    () => serverView?.view ? normalizeView(serverView.view) : null,
    [serverView]
  );
  const view = editedView ?? savedView ?? cachedView;
  const setView = setEditedView;
  const [layoutSync, setLayoutSync] = reactExports.useState("idle");
  reactExports.useEffect(() => {
    saveMasterView("report", view);
    if (!editedView) return;
    const timer = window.setTimeout(() => {
      setLayoutSync("saving");
      void saveServerView({ scope: "report", view: normalizeView(view) }).then(() => setLayoutSync("saved")).catch(() => setLayoutSync("error"));
    }, 700);
    return () => window.clearTimeout(timer);
  }, [view, editedView, saveServerView]);
  const visibleColumns = reactExports.useMemo(
    () => orderedVisibleColumns(view, ["facility", "type"]),
    [view]
  );
  const pinnedKeys = reactExports.useMemo(() => {
    const frozen = readDisplaySettings(settings?.settings).frozenColumns;
    return [.../* @__PURE__ */ new Set(["facility", "type", ...frozen])].slice(0, 3);
  }, [settings]);
  const displaySettings = reactExports.useMemo(
    () => readDisplaySettings(settings?.settings),
    [settings]
  );
  const [freezeOn, setFreezeOn] = reactExports.useState(
    () => loadBoolPref(FREEZE_PREF_KEY)
  );
  reactExports.useEffect(() => saveBoolPref(FREEZE_PREF_KEY, freezeOn), [freezeOn]);
  const [viewportWidth, setViewportWidth] = reactExports.useState(
    () => typeof window === "undefined" ? 1280 : window.innerWidth
  );
  reactExports.useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const freezeActive = freezeOn && viewportWidth >= displaySettings.freezeBelowPx;
  const [search, setSearch] = reactExports.useState(() => searchParams.get("q") ?? "");
  const [blockFilter, setBlockFilter] = reactExports.useState(() => listParam(searchParams, "block"));
  const [phcFilter, setPhcFilter] = reactExports.useState(() => listParam(searchParams, "phc"));
  const [typeFilter, setTypeFilter] = reactExports.useState(() => listParam(searchParams, "type"));
  const [certFilter, setCertFilter] = reactExports.useState(() => listParam(searchParams, "cert"));
  const [eligibilityFilter, setEligibilityFilter] = reactExports.useState(
    () => listParam(searchParams, "elig")
  );
  const [buildingFilter, setBuildingFilter] = reactExports.useState(
    () => listParam(searchParams, "bstatus")
  );
  const [statusFilter, setStatusFilter] = reactExports.useState(
    () => listParam(searchParams, "status")
  );
  const [nocFilter, setNocFilter] = reactExports.useState(
    () => listParam(searchParams, "noc")
  );
  const writeGuard = reactExports.useRef("");
  reactExports.useEffect(() => {
    const sig = filterSignature(searchParams);
    if (sig === writeGuard.current) return;
    setSearch(searchParams.get("q") ?? "");
    setBlockFilter(listParam(searchParams, "block"));
    setPhcFilter(listParam(searchParams, "phc"));
    setTypeFilter(listParam(searchParams, "type"));
    setCertFilter(listParam(searchParams, "cert"));
    setEligibilityFilter(listParam(searchParams, "elig"));
    setBuildingFilter(listParam(searchParams, "bstatus"));
    setStatusFilter(listParam(searchParams, "status"));
    setNocFilter(listParam(searchParams, "noc"));
  }, [searchParams]);
  reactExports.useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        const put = (key, values) => {
          if (values.length) next.set(key, values.join(","));
          else next.delete(key);
        };
        if (search.trim()) next.set("q", search);
        else next.delete("q");
        put("block", blockFilter);
        put("phc", phcFilter);
        put("type", typeFilter);
        put("cert", certFilter);
        put("elig", eligibilityFilter);
        put("bstatus", buildingFilter);
        put("status", statusFilter);
        put("noc", nocFilter);
        writeGuard.current = filterSignature(next);
        return next;
      },
      { replace: true }
    );
  }, [
    search,
    blockFilter,
    phcFilter,
    typeFilter,
    certFilter,
    eligibilityFilter,
    buildingFilter,
    statusFilter,
    nocFilter,
    setSearchParams
  ]);
  const blocks = reactExports.useMemo(
    () => [...new Set(rows.map((r) => r.facility.block))].sort(),
    [rows]
  );
  const phcs = reactExports.useMemo(
    () => [...new Set(rows.map((r) => r.facility.phc))].sort(),
    [rows]
  );
  const types = reactExports.useMemo(
    () => [...new Set(rows.map((r) => r.facility.facilityType))].sort(),
    [rows]
  );
  const certStatusOptions = reactExports.useMemo(() => {
    const base = settings?.settings.certificationStatuses ?? DEFAULT_SETTINGS.certificationStatuses;
    const extra = rows.map((r) => r.nqas?.certificationStatus ?? "").filter((s) => s && !base.includes(s));
    return [...base, ...new Set(extra)];
  }, [settings, rows]);
  const eligibilityOptions = reactExports.useMemo(
    () => buildEligibilityOptions(settings?.settings.eligibilityOptions),
    [settings]
  );
  const currentStatusOptions = reactExports.useMemo(
    () => [...new Set(rows.map((r) => r.facility.currentStatus ?? ""))].filter(Boolean).sort(),
    [rows]
  );
  const nocStatusOptions = reactExports.useMemo(
    () => [...new Set(rows.map((r) => r.noc?.status ?? ""))].filter(Boolean).sort(),
    [rows]
  );
  const filtered = reactExports.useMemo(() => {
    const args = {
      search,
      blocks: blockFilter,
      types: typeFilter,
      certStatus: certFilter,
      eligibility: eligibilityFilter,
      status: statusFilter,
      nocStatus: nocFilter
    };
    return applyMasterFilters(rows, args).filter(
      (r) => multiFilterMatches(r.facility.phc, phcFilter) && (buildingFilter.length === 0 || buildingFilter.includes(buildingBucketOf(r.building?.buildingStatus)))
    );
  }, [
    rows,
    search,
    blockFilter,
    phcFilter,
    typeFilter,
    certFilter,
    eligibilityFilter,
    buildingFilter,
    statusFilter,
    nocFilter
  ]);
  const pager = usePagination(filtered, [
    search,
    blockFilter,
    phcFilter,
    typeFilter,
    certFilter,
    eligibilityFilter,
    buildingFilter,
    statusFilter,
    nocFilter,
    cycleScope
  ]);
  const [sorting, setSorting] = reactExports.useState([]);
  const [colsOpen, setColsOpen] = reactExports.useState(false);
  const [exportOpen, setExportOpen] = reactExports.useState(false);
  const [drawerRow, setDrawerRow] = reactExports.useState(null);
  const [busy, setBusy] = reactExports.useState(false);
  const activeFilterCount = countActiveFilters([
    blockFilter,
    phcFilter,
    typeFilter,
    certFilter,
    eligibilityFilter,
    buildingFilter,
    statusFilter,
    nocFilter
  ]) + (search.trim() ? 1 : 0) + (tab !== "cycle" && cycleScope !== "current" ? 1 : 0);
  const describeFilters = () => {
    const bits = [];
    const multi = (label, values) => {
      if (values.length) bits.push(`${label}: ${values.join(", ")}`);
    };
    multi("Block", blockFilter);
    multi("PHC", phcFilter);
    multi("Type", typeFilter);
    multi("Certification status", certFilter);
    multi(
      "Eligibility",
      eligibilityFilter.map(
        (v) => eligibilityOptions.find((o) => o.value === v)?.label ?? v
      )
    );
    multi("Building status", buildingFilter);
    multi("Facility current status", statusFilter);
    multi("Fire NOC status", nocFilter);
    bits.push(
      cycleScope === "current" ? "Certification Cycle: Current" : cycleScope === "all" ? "Certification Cycle: All" : `Certification Cycle: #${cycleScope}`
    );
    return bits.join(" · ");
  };
  const summaryDocStatuses = summary?.docStatuses ?? [];
  const summaryBuilding = summary?.buildingStatuses ?? [];
  const [summaryDim, setSummaryDim] = reactExports.useState("type");
  const summarySource = reactExports.useMemo(
    () => filtered.map((r) => ({
      facilityId: String(r.facility._id),
      facilityType: r.facility.facilityType,
      block: r.facility.block,
      phc: r.facility.phc,
      cycle: r.cycleNumber ?? null,
      currentStatus: r.facility.currentStatus ?? "",
      certStatus: r.nqas?.certificationStatus ?? null,
      naStatus: r.nqas?.status ?? null,
      naStartDate: r.nqas?.scheduledStartDate ?? null,
      saStatus: r.sa?.status ?? null,
      docStatus: r.sa?.generalDocStatus ?? null,
      buildingStatus: r.building?.buildingStatus ?? null
    })),
    [filtered]
  );
  const summaryRows = reactExports.useMemo(
    () => summarizeTypeWise(summarySource, summaryDim, summaryDocStatuses),
    [summarySource, summaryDim, summaryDocStatuses, summaryBuilding]
  );
  const summaryTotal = reactExports.useMemo(() => grandTotalTypeWise(summaryRows), [summaryRows]);
  const holdCertificateCount = reactExports.useMemo(
    () => summarySource.filter((r) => {
      const v = (r.certStatus ?? "").trim().toLowerCase();
      return v === "quality certified" || v === "quality certified with conditionality";
    }).length,
    [summarySource]
  );
  const [drill, setDrill] = reactExports.useState(null);
  const drillFacilityIds = reactExports.useMemo(() => {
    if (!drill) return /* @__PURE__ */ new Set();
    const base = summarySource.filter(
      (r) => summaryDim === "type" ? r.facilityType === drill.rowLabel : summaryDim === "block" ? r.block === drill.rowLabel : (r.phc || r.block) === drill.rowLabel
    );
    const ids = /* @__PURE__ */ new Set();
    for (const r of base) {
      if (drill.kind === "building") {
        if (buildingBucketOf(r.buildingStatus) === drill.value) ids.add(r.facilityId);
        continue;
      }
      const lc = deriveFlatLifecycle({
        currentStatus: r.currentStatus,
        certStatus: r.certStatus,
        naStatus: r.naStatus,
        naStartDate: r.naStartDate,
        docStatus: r.docStatus
      });
      const hasDocStage = !!r.docStatus && summaryDocStatuses.includes(r.docStatus);
      const zone = docPipelineZone(lc, r.saStatus, hasDocStage);
      if (drill.value === "NQAS Scheduled" && zone === "nqasScheduled" || drill.value === "Result Awaited Facilities" && zone === "resultAwaited" || drill.value === "Next Phase" && zone === "nextPhase" || zone === "docs" && r.docStatus === drill.value)
        ids.add(r.facilityId);
    }
    return ids;
  }, [drill, summaryDim, summarySource, summaryDocStatuses]);
  const drillRows = reactExports.useMemo(
    () => drillFacilityIds.size ? rows.filter((r) => drillFacilityIds.has(String(r.facility._id))) : [],
    [drillFacilityIds, rows]
  );
  const rowsFor = (scope) => scope === "all" ? rows : filtered;
  const fileStamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const saveBlob = (data2, name) => {
    saveBlobRaw(new Blob([data2]), name);
  };
  const saveBlobRaw = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };
  const buildOpts = (plan) => ({
    rows: rowsFor(plan.scope),
    columns: plan.columns,
    labels,
    filtersText: plan.scope === "all" ? "None — all facilities" : describeFilters() || "None",
    generatedBy: "NQAS Tracker · Reports & Export",
    frozenDataColumns: Math.min(2, pinnedKeys.length),
    frozenKeys: pinnedKeys,
    fileNameBase: `nqas-full-report-${fileStamp}`,
    extras: plan.extras
  });
  const runExport = async (plan) => {
    if (plan.format !== "print" && rowsFor(plan.scope).length === 0) {
      toast.error("Nothing to export — no rows match the current filters");
      return;
    }
    setBusy(true);
    try {
      const opts = buildOpts(plan);
      if (plan.format === "xlsx") await exportMasterWorkbook(opts, saveBlob);
      else if (plan.format === "pdf") exportMasterPdf(opts, plan.pdf, saveBlobRaw);
      else if (plan.format === "csv") exportMasterCsv(opts, saveBlobRaw);
      else printMaster(plan);
      if (plan.format !== "print") {
        const n = rowsFor(plan.scope).length;
        toast.success(`Exported ${n} facilit${n === 1 ? "y" : "ies"}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };
  const printMaster = (plan) => {
    openMasterPrint({
      rows: rowsFor(plan.scope),
      columns: plan.columns,
      labels,
      subtitle: [
        describeFilters() || "No filters",
        `${rowsFor(plan.scope).length} of ${rows.length} facilities`,
        `generated ${toDisplayDate(todayLocalIso())}`
      ].join(" · ")
    });
  };
  const cTag = typeof cycleScope === "number" ? `-cycle-${cycleScope}` : "";
  const dimLabel = SUMMARY_DIM_LABELS[summaryDim];
  const summaryPairs = () => typeWiseSummaryCsv(summaryRows, summaryDim, summaryDocStatuses);
  const summarySubtitle = () => `${describeFilters() || "All facilities"} · generated ${toDisplayDate(todayLocalIso())}`;
  const exportSummaryExcel = () => {
    const { headers, rows: rws } = summaryPairs();
    exportExcel(
      `nqas-summary-${summaryDim}${cTag}-${fileStamp}.xlsx`,
      dimLabel,
      headers,
      rws,
      { title: `NQAS Summary — ${dimLabel}`, subtitle: summarySubtitle() }
    );
    toast.success("Summary exported (Excel)");
  };
  const exportSummaryPdf = async () => {
    const { headers, rows: rws } = summaryPairs();
    (await buildTablePdf({
      title: `NQAS Summary — ${dimLabel}`,
      subtitle: summarySubtitle(),
      headers,
      rows: rws,
      options: { align: "center" }
    })).save(`nqas-summary-${summaryDim}${cTag}-${fileStamp}.pdf`);
    toast.success("Summary exported (PDF)");
  };
  const exportSummaryCsv = () => {
    const { headers, rows: rws } = summaryPairs();
    downloadText(
      `nqas-summary-${summaryDim}${cTag}-${fileStamp}.csv`,
      [headers, ...rws].map((r) => r.map(csvCell).join(",")).join("\r\n")
    );
    toast.success("Summary exported (CSV)");
  };
  const printSummary = () => {
    const { headers, rows: rws } = summaryPairs();
    const doc = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(`NQAS Summary — ${dimLabel}`)}</title><style>body{font:11px/1.4 system-ui,sans-serif;margin:16px;color:#111}h1{font-size:15px;margin:0 0 2px}p.sub{font-size:10px;color:#555;margin:0 0 10px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:4px 6px}thead th{background:#0d6960;color:#fff}tbody tr:nth-child(even){background:#f4f8f7}@page{size:A4 landscape;margin:10mm}</style></head><body><h1>${esc(`NQAS Summary — ${dimLabel}`)}</h1><p class="sub">${esc(summarySubtitle())}</p><table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>` + rws.slice(0, -1).map((r) => `<tr>${r.map((v) => `<td>${esc(String(v))}</td>`).join("")}</tr>`).join("") + `</tbody><tfoot><tr>${(rws[rws.length - 1] ?? []).map((v) => `<td>${esc(String(v))}</td>`).join("")}</tr></tfoot></table><script>window.onload=function(){window.print()}<\/script></body></html>`;
    printHtml(doc);
  };
  const printHtml = (doc) => {
    const frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    document.body.appendChild(frame);
    frame.srcdoc = doc;
  };
  const loading = data === void 0;
  const cycleExportRows = reactExports.useMemo(() => {
    const raw = cycleData?.rows ?? [];
    const q = search.trim().toLowerCase();
    return raw.filter(
      (r) => (blockFilter.length === 0 || blockFilter.includes(r.block)) && (phcFilter.length === 0 || phcFilter.includes(r.phc)) && (typeFilter.length === 0 || typeFilter.includes(r.type)) && (certFilter.length === 0 || certFilter.includes(r.certStatus ?? "")) && (eligibilityFilter.length === 0 || eligibilityFilter.includes(r.eligibility)) && (buildingFilter.length === 0 || buildingFilter.includes(buildingBucketOf(r.buildingStatus))) && (statusFilter.length === 0 || statusFilter.includes(r.currentStatus)) && (nocFilter.length === 0 || nocFilter.includes(r.nocStatus ?? "")) && (!q || [r.facility, r.block, r.phc, r.type, r.nin ?? ""].join(" ").toLowerCase().includes(q))
    );
  }, [
    cycleData,
    search,
    blockFilter,
    phcFilter,
    typeFilter,
    certFilter,
    eligibilityFilter,
    buildingFilter,
    statusFilter,
    nocFilter
  ]);
  const cycleAllCount = cycleData?.rows.length ?? 0;
  const cycleOnlyFilters = describeFilters().split(" · ").filter((part) => part && !part.startsWith("Certification Cycle")).join(" · ");
  const cycleReportId = `CR-${(data?.generatedAt ?? todayLocalIso()).replace(/-/g, "")}`;
  const cycleDistrict = settings?.settings?.districtName || "District";
  const cycleStartedNote = (cycleCounts?.cycles ?? []).filter((c) => c.cycleNumber > 1 && c.count > 0).map((c) => `Cycle #${c.cycleNumber} started for ${c.count}`).join(" · ");
  const cycleMeta = {
    filtersText: cycleOnlyFilters ? `All cycles · ${cycleOnlyFilters}` : "All cycles",
    generatedAt: data?.generatedAt ?? todayLocalIso(),
    generatedBy: "NQAS Tracker · Reports & Export",
    reportId: cycleReportId,
    district: cycleDistrict,
    knownCycles: (cycleCounts?.cycles ?? []).map((c) => ({
      cycleNumber: c.cycleNumber,
      cycleType: c.cycleType
    }))
  };
  const cycleSettings = reactExports.useMemo(
    () => ({
      surveillanceAlertLeadDays: settings?.settings.surveillanceAlertLeadDays,
      recertificationAlertLeadDays: settings?.settings.recertificationAlertLeadDays,
      generalDocStatuses: summary?.docStatuses,
      certificationStatuses: certStatusOptions
    }),
    [settings, summary, certStatusOptions]
  );
  const runMasterFormat = (format) => {
    const plan = {
      format,
      scope: "filtered",
      columns: visibleColumns,
      pdf: { paper: "a4", orientation: "landscape" },
      extras: { surveillanceDue: false, fireNocAlerts: false, gapClosure: false },
      markRecent: false,
      filtersText: describeFilters() || ""
    };
    void runExport(plan);
  };
  const runCycleExport = async (format, scope = "view") => {
    setBusy(true);
    try {
      if (cycleExportRows.length === 0) {
        toast.error("Nothing to export — no facility-cycle matches the current filters");
        return;
      }
      const mod = await __vitePreload(() => import('./cycleReportExport-DclIk7lT.js'),true              ?__vite__mapDeps([51,6,9,1,2,5,4,7,10,11,12,8,13,14,19]):void 0);
      const view2 = scope === "full" ? "full" : cycleView;
      if (format === "xlsx") {
        await mod.exportCycleWorkbook(
          mod.cycleFileName({ district: cycleDistrict, view: view2, ext: "xlsx" }),
          cycleExportRows,
          cycleMeta,
          cycleSettings
        );
      } else if (format === "pdf") {
        await mod.exportCyclePdf(
          mod.cycleFileName({ district: cycleDistrict, view: view2, ext: "pdf" }),
          cycleExportRows,
          cycleMeta,
          cycleSettings,
          view2
        );
      } else if (format === "csv") {
        downloadText(
          mod.cycleFileName({ district: cycleDistrict, view: view2, ext: "csv" }),
          mod.cycleReportCsv(cycleExportRows, cycleMeta, cycleSettings, view2)
        );
      } else {
        window.print();
        return;
      }
      toast.success(
        `${scope === "full" ? "Full cycle report" : "This view"} exported (${format.toUpperCase()})`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };
  const runExportForTab = (format) => {
    if (tab === "cycle") void runCycleExport(format);
    else if (tab === "summary") {
      if (format === "xlsx") exportSummaryExcel();
      else if (format === "pdf") void exportSummaryPdf();
      else if (format === "csv") exportSummaryCsv();
      else printSummary();
    } else if (format === "print") {
      openMasterPrint({
        rows: filtered,
        columns: visibleColumns,
        labels,
        subtitle: [
          describeFilters() || "No filters",
          `${filtered.length} of ${rows.length} facilities`,
          `generated ${toDisplayDate(todayLocalIso())}`
        ].join(" · ")
      });
    } else runMasterFormat(format);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    AppShell,
    {
      title: "Reports & Export",
      subtitle: tab === "cycle" ? `${rows.length} facilities${cycleStartedNote ? ` · ${cycleStartedNote}` : ""} · Data as of ${toDisplayDate(
        data?.generatedAt ?? todayLocalIso()
      )} IST` : `Certification progress, document pipeline and building status · Data as of ${toDisplayDate(
        data?.generatedAt ?? todayLocalIso()
      )} IST`,
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            className: "gap-2 rounded-r-none",
            disabled: busy || loading,
            onClick: () => runExportForTab("xlsx"),
            children: [
              busy ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-4" }),
              "Export"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              className: "rounded-l-none border-l border-primary-foreground/25 px-2",
              "aria-label": "Export options",
              disabled: busy || loading,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "size-4" })
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", className: "w-56", children: [
            tab === "cycle" && /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuSub, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuSubTrigger, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "size-4" }),
                " Export this view"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSubContent, { className: "w-40", children: ["xlsx", "pdf", "csv", "print"].map(
                (f) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  DropdownMenuItem,
                  {
                    onClick: () => void runCycleExport(f, "view"),
                    children: f === "print" ? "Print" : f.toUpperCase()
                  },
                  f
                )
              ) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => runExportForTab("xlsx"), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "size-4" }),
              " Excel"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => runExportForTab("pdf"), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-4" }),
              " PDF"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => runExportForTab("csv"), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-4" }),
              " CSV"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => runExportForTab("print"), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Printer, { className: "size-4" }),
              " Print"
            ] }),
            tab === "master" && /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => setExportOpen(true), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "size-4" }),
              " More export options…"
            ] }),
            tab === "cycle" && /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuSub, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuSubTrigger, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-4" }),
                " Full cycle report"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuSubContent, { className: "w-40", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuItem, { onClick: () => void runCycleExport("xlsx", "full"), children: "Excel (all views)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuItem, { onClick: () => void runCycleExport("pdf", "full"), children: "PDF (all views)" })
              ] })
            ] })
          ] })
        ] })
      ] }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          FilterBar,
          {
            activeCount: activeFilterCount,
            onClearAll: () => {
              setSearch("");
              setBlockFilter([]);
              setPhcFilter([]);
              setTypeFilter([]);
              setCertFilter([]);
              setEligibilityFilter([]);
              setBuildingFilter([]);
              setStatusFilter([]);
              setNocFilter([]);
              setCycleScope("current");
            },
            summary: `Showing ${tab === "cycle" ? cycleExportRows.length : filtered.length} of ${tab === "cycle" ? cycleAllCount : rows.length} ${tab === "cycle" ? "facility-cycles" : "facilities"}`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                FilterSearch,
                {
                  value: search,
                  onChange: setSearch,
                  placeholder: "Facility, PHC, block or NIN…"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                FilterDropdown,
                {
                  label: "Block",
                  options: blocks.map((b) => ({ value: b, label: b })),
                  value: blockFilter,
                  onChange: setBlockFilter,
                  triggerWidth: "w-40"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                FilterDropdown,
                {
                  label: "Facility Type",
                  options: types.map((t) => ({ value: t, label: t })),
                  value: typeFilter,
                  onChange: setTypeFilter,
                  triggerWidth: "w-40"
                }
              ),
              tab === "cycle" ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex min-h-9 items-center rounded-lg border border-dashed border-border/70 px-2.5 text-[11px] text-muted-foreground", children: "This report shows every cycle side by side" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CycleFilter, { allowAll: false }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Popover, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    className: "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 text-xs font-medium hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    children: [
                      "More filters",
                      [
                        phcFilter,
                        certFilter,
                        eligibilityFilter,
                        buildingFilter,
                        statusFilter,
                        nocFilter
                      ].some((v) => v.length > 0) && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary tabular-nums", children: [
                        phcFilter,
                        certFilter,
                        eligibilityFilter,
                        buildingFilter,
                        statusFilter,
                        nocFilter
                      ].filter((v) => v.length > 0).length }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "size-3.5", "aria-hidden": true })
                    ]
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(PopoverContent, { align: "start", className: "w-72 space-y-2 p-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    FilterDropdown,
                    {
                      label: "PHC",
                      options: phcs.map((p) => ({ value: p, label: p })),
                      value: phcFilter,
                      onChange: setPhcFilter,
                      triggerWidth: "w-full"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    FilterDropdown,
                    {
                      label: "NQAS certification status",
                      options: certStatusOptions.map((s) => ({ value: s, label: s })),
                      value: certFilter,
                      onChange: setCertFilter,
                      triggerWidth: "w-full"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    FilterDropdown,
                    {
                      label: "NQAS Eligibility",
                      options: eligibilityOptions.map((o) => ({
                        value: o.value,
                        label: o.label
                      })),
                      value: eligibilityFilter,
                      onChange: setEligibilityFilter,
                      triggerWidth: "w-full"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    FilterDropdown,
                    {
                      label: "Building status",
                      options: BUILDING_BUCKET_ORDER.map((b) => ({ value: b, label: b })),
                      value: buildingFilter,
                      onChange: setBuildingFilter,
                      triggerWidth: "w-full"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    FilterDropdown,
                    {
                      label: "Facility Current Status",
                      options: currentStatusOptions.map((s) => ({ value: s, label: s })),
                      value: statusFilter,
                      onChange: setStatusFilter,
                      triggerWidth: "w-full"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    FilterDropdown,
                    {
                      label: "Fire NOC status",
                      options: nocStatusOptions.map((s) => ({ value: s, label: s })),
                      value: nocFilter,
                      onChange: setNocFilter,
                      triggerWidth: "w-full"
                    }
                  )
                ] })
              ] })
            ]
          }
        ),
        (activeFilterCount > 0 || tab !== "cycle" && cycleScope !== "current") && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex flex-wrap items-center gap-1.5", "data-testid": "report-filter-chips", children: [
          search.trim() && /* @__PURE__ */ jsxRuntimeExports.jsx(FilterChip, { label: `Search: ${search}`, onRemove: () => setSearch("") }),
          tab !== "cycle" && cycleScope !== "current" && /* @__PURE__ */ jsxRuntimeExports.jsx(
            FilterChip,
            {
              label: `Certification Cycle: ${cycleScope === "all" ? "All" : `#${cycleScope}`}`,
              onRemove: () => setCycleScope("current")
            }
          ),
          blockFilter.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            FilterChip,
            {
              label: `Block: ${v}`,
              onRemove: () => setBlockFilter(blockFilter.filter((x) => x !== v))
            },
            `b-${v}`
          )),
          typeFilter.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            FilterChip,
            {
              label: `Type: ${v}`,
              onRemove: () => setTypeFilter(typeFilter.filter((x) => x !== v))
            },
            `t-${v}`
          )),
          phcFilter.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            FilterChip,
            {
              label: `PHC: ${v}`,
              onRemove: () => setPhcFilter(phcFilter.filter((x) => x !== v))
            },
            `p-${v}`
          )),
          certFilter.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            FilterChip,
            {
              label: `Certification: ${v}`,
              onRemove: () => setCertFilter(certFilter.filter((x) => x !== v))
            },
            `c-${v}`
          )),
          eligibilityFilter.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            FilterChip,
            {
              label: `Eligibility: ${eligibilityOptions.find((o) => o.value === v)?.label ?? v}`,
              onRemove: () => setEligibilityFilter(eligibilityFilter.filter((x) => x !== v))
            },
            `e-${v}`
          )),
          buildingFilter.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            FilterChip,
            {
              label: `Building: ${v}`,
              onRemove: () => setBuildingFilter(buildingFilter.filter((x) => x !== v))
            },
            `s-${v}`
          )),
          statusFilter.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            FilterChip,
            {
              label: `Status: ${v}`,
              onRemove: () => setStatusFilter(statusFilter.filter((x) => x !== v))
            },
            `st-${v}`
          )),
          nocFilter.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            FilterChip,
            {
              label: `Fire NOC: ${v}`,
              onRemove: () => setNocFilter(nocFilter.filter((x) => x !== v))
            },
            `noc-${v}`
          ))
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            role: "tablist",
            "aria-label": "Report views",
            className: "mb-4 flex flex-wrap items-center gap-1 border-b border-border/60",
            children: Object.keys(TAB_LABELS).map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                role: "tab",
                type: "button",
                id: `report-tab-${t}`,
                "aria-selected": tab === t,
                "aria-controls": `report-panel-${t}`,
                onClick: () => setTab(t),
                className: cn(
                  "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                ),
                children: TAB_LABELS[t]
              },
              t
            ))
          }
        ),
        tab === "summary" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { id: "report-panel-summary", role: "tabpanel", "aria-labelledby": "report-tab-summary", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass rounded-xl p-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex flex-wrap items-center justify-between gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-sm font-semibold", children: [
              "Certification, pipeline and building by ",
              summaryDim === "type" ? "facility type" : summaryDim
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Select,
              {
                value: summaryDim,
                onValueChange: (v) => setSummaryDim(v),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "glass-input h-8 w-44 text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "type", children: "By Facility Type" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "block", children: "Block-wise" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "phc", children: "PHC-wise" })
                  ] })
                ]
              }
            )
          ] }),
          !loading && summaryRows.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              ReconciliationChips,
              {
                total: summaryTotal,
                names: new Map(filtered.map((r) => [String(r.facility._id), r.facility.name]))
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "p",
              {
                "data-testid": "certified-reconciliation",
                className: "mb-2 text-[11px] text-muted-foreground",
                children: [
                  "Certified stage: ",
                  summaryTotal.totalCertified,
                  " of ",
                  summaryTotal.target,
                  " (",
                  formatPercent(summaryTotal.certifiedPct),
                  "). Hold a certificate:",
                  " ",
                  holdCertificateCount,
                  holdCertificateCount === summaryTotal.totalCertified ? " — the same facility set" : ` — the stage count differs because it includes a facility whose stored status is not Quality / Conditional`,
                  ". Deferred ",
                  summaryTotal.deferred,
                  " is reported separately, never added to Certified (the old 74 was Certified + Deferred; the correct total is",
                  " ",
                  summaryTotal.totalCertified,
                  ")."
                ]
              }
            )
          ] }),
          loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-center py-10", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-5 animate-spin text-muted-foreground" }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
            TypeWiseSummaryTable,
            {
              rows: summaryRows,
              dimension: summaryDim,
              docStatuses: summaryDocStatuses,
              buildingStatuses: summaryBuilding,
              onCellClick: (kind, value, rowLabel) => {
                if (rowLabel) setDrill({ kind, value, rowLabel });
              }
            }
          ),
          drill && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 rounded-xl border border-border/60 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: drill.rowLabel }),
                " · ",
                drill.kind === "building" ? "Building status: " : "Pipeline: ",
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: drill.value }),
                " — ",
                drillRows.length,
                " facilit",
                drillRows.length === 1 ? "y" : "ies"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  variant: "outline",
                  size: "sm",
                  className: "h-8",
                  onClick: () => setDrill(null),
                  children: "Close drilldown"
                }
              )
            ] }),
            drillRows.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3", children: drillRows.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              FacilityCell,
              {
                facility: r.facility,
                className: "rounded-lg border border-border/50 px-2 py-1.5 hover:bg-muted/60"
              }
            ) }, String(r.facility._id))) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "No facilities." })
          ] })
        ] }) }),
        tab === "cycle" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { id: "report-panel-cycle", role: "tabpanel", "aria-labelledby": "report-tab-cycle", children: cycleData === void 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(CycleReportSkeleton, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx(CycleReportSkeleton, {}), children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          CycleReportView,
          {
            rows: cycleExportRows,
            settings: cycleSettings,
            generatedAt: data?.generatedAt ?? todayLocalIso(),
            filtersText: cycleOnlyFilters || "No filters",
            knownCycles: (cycleCounts?.cycles ?? []).map((c) => ({
              cycleNumber: c.cycleNumber,
              cycleType: c.cycleType
            })),
            view: cycleView,
            onViewChange: (next) => setCycleParam("view", next),
            bucket: cycleBucket,
            onBucketChange: (next) => setCycleParam("bucket", next),
            step: cycleStep,
            onStepChange: (next) => setCycleParam("step", next)
          }
        ) }) }),
        tab === "linelists" && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            id: "report-panel-linelists",
            role: "tabpanel",
            "aria-labelledby": "report-tab-linelists",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx(CycleReportSkeleton, {}), children: /* @__PURE__ */ jsxRuntimeExports.jsx(LineListsTab, { onOpenFacility: (row) => setDrawerRow(row) }) })
          }
        ),
        tab === "master" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { id: "report-panel-master", role: "tabpanel", "aria-labelledby": "report-tab-master", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex flex-wrap items-center justify-end gap-2", children: [
            layoutSync !== "idle" && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: cn(
                  "text-[11px]",
                  layoutSync === "error" ? "text-destructive" : "text-muted-foreground"
                ),
                role: "status",
                children: layoutSync === "saving" ? "Saving layout…" : layoutSync === "saved" ? "Layout saved to your account" : "Saved on this device only — account sync failed"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              RowViewSelect,
              {
                value: pager.view,
                onChange: pager.setView,
                total: pager.total
              }
            )
          ] }),
          loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center py-24", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-6 animate-spin text-muted-foreground" }) }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              GroupedMasterTable,
              {
                rows: filtered,
                labels,
                view,
                sorting,
                onSortingChange: setSorting,
                onDensityChange: (density) => setView({ ...view, density }),
                onOpenRow: setDrawerRow,
                onColumnsClick: () => setColsOpen(true),
                totalRowCount: rows.length,
                onClearFilters: activeFilterCount > 0 ? () => {
                  setSearch("");
                  setBlockFilter([]);
                  setPhcFilter([]);
                  setTypeFilter([]);
                  setCertFilter([]);
                  setEligibilityFilter([]);
                  setBuildingFilter([]);
                  setStatusFilter([]);
                  setNocFilter([]);
                  setCycleScope("current");
                } : void 0,
                scrollRef: tableScrollRef,
                widthsStorageKey: "report",
                pinnedKeys,
                freezeActive,
                freezeToggle: { on: freezeOn, onChange: setFreezeOn }
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
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ColumnManager,
          {
            open: colsOpen,
            onOpenChange: setColsOpen,
            labels,
            view,
            onChange: setView,
            pinnedKeys
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ExportDialog,
          {
            open: exportOpen,
            onOpenChange: setExportOpen,
            counts: { filtered: filtered.length, all: rows.length },
            visibleColumns,
            filtersText: describeFilters() || "",
            onRun: (plan) => void runExport(plan)
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FacilityQuickView,
          {
            row: drawerRow,
            labels,
            open: !!drawerRow,
            onOpenChange: (o) => {
              if (!o) setDrawerRow(null);
            },
            canEdit: false
          }
        )
      ]
    }
  );
}
function FilterChip({ label, onRemove }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex min-h-8 items-center gap-1 rounded-full border border-primary/40 bg-primary/10 pr-1 pl-2.5 text-[11px] font-medium", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "max-w-56 truncate", "data-tip": label, "data-tip-truncate": true, children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        "aria-label": `Remove ${label}`,
        onClick: onRemove,
        className: "rounded-full p-1 hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        children: "×"
      }
    )
  ] });
}
function ReconciliationChips({
  total,
  names
}) {
  const [open, setOpen] = reactExports.useState(null);
  const counted = countedFor(total);
  const chips = [
    {
      key: "certification",
      name: "Certification",
      ok: total.reconcile.certification,
      counted: counted.certification,
      failures: total.failures.certification
    },
    {
      key: "pipeline",
      name: "Pipeline",
      ok: total.reconcile.pipeline,
      counted: counted.pipeline,
      failures: total.failures.pipeline
    },
    {
      key: "building",
      name: "Building",
      ok: total.reconcile.building,
      counted: counted.building,
      failures: total.failures.building
    }
  ];
  const failing = chips.find((c) => !c.ok && c.key === open)?.failures ?? [];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        "data-testid": "summary-reconciliation",
        className: "flex flex-wrap items-center gap-1.5",
        "data-tip": reconciliationText(total),
        children: [
          chips.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => setOpen(c.ok ? null : open === c.key ? null : c.key),
              "aria-expanded": !c.ok && open === c.key,
              className: cn(
                "inline-flex min-h-7 items-center gap-1 rounded-full border px-2 text-[11px] font-semibold tabular-nums",
                c.ok ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-amber-400 bg-amber-50 text-amber-900"
              ),
              children: [
                c.ok ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3", "aria-hidden": true }) : /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-3", "aria-hidden": true }),
                c.name,
                " ",
                c.ok ? "✓" : "⚠",
                " ",
                c.counted,
                "/",
                total.target
              ]
            },
            c.key
          )),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: "Every group includes its remainder column; no facility is dropped or counted twice." })
        ]
      }
    ),
    open && failing.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 rounded-lg border border-amber-300 bg-amber-50/60 p-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs font-semibold text-amber-900", children: [
          failing.length,
          " facilit",
          failing.length === 1 ? "y" : "ies",
          " not accounted for by the ",
          open,
          " group"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "text-[11px] font-medium text-primary hover:underline",
            onClick: () => setOpen(null),
            children: "Close"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-1 grid gap-0.5 text-xs sm:grid-cols-2 lg:grid-cols-3", children: failing.map((id) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: `/facilities/${id}`, className: "hover:underline", children: names.get(id) ?? id }) }, id)) })
    ] })
  ] });
}
function CycleReportSkeleton() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", "aria-busy": "true", "aria-label": "Loading the cycle report", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-6 w-64 animate-pulse rounded bg-muted" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3", children: [0, 1, 2].map((i) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-40 animate-pulse rounded-xl border border-border/60 bg-muted/50" }, i)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-64 animate-pulse rounded-xl border border-border/60 bg-muted/40" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-48 animate-pulse rounded-xl border border-border/60 bg-muted/30" })
  ] });
}

export { ReportsPage as default };
