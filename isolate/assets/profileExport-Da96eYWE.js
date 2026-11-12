const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/scoreBands-CA46Kez8.js","assets/AppShell-CP099uvN.js","assets/vendor-jspdf-BarNdCns.js","assets/vendor-motion-DgC1stbS.js","assets/icons-BxQpodNr.js","assets/index-CBV6wOh8.js","assets/vendor-charts--qXk384P.js","assets/index-CneVNiou.css","assets/NqasLogo-CIWlMexW.js","assets/label-BaPkqXdo.js","assets/shareLink-_K-oJu5R.js"])))=>i.map(i=>d[i]);
import { _ as __vitePreload } from './vendor-jspdf-BarNdCns.js';
import { E as ExcelJS } from './vendor-exceljs-CqnmHTS6.js';
import { g as getLifecycleState, p as profileCompleteness, t as toDdMmmYyyy } from './facilityProfileState-D76_z1Ay.js';
import { D as DEFAULT_SETTINGS, cy as deriveFireNocStatus } from './AppShell-CP099uvN.js';

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function istStamp(t = /* @__PURE__ */ new Date()) {
  const ist = new Date(t.getTime() + 5.5 * 36e5);
  return `${String(ist.getUTCDate()).padStart(2, "0")}-${MONTHS[ist.getUTCMonth()]}-${ist.getUTCFullYear()} ${String(ist.getUTCHours()).padStart(2, "0")}:${String(ist.getUTCMinutes()).padStart(2, "0")} IST`;
}
const NOT_RECORDED = "Not recorded yet";
const clean = (v) => {
  if (v == null) return "";
  const s = String(v).trim();
  return s === "" ? "" : s;
};
const label = (raw) => {
  const v = clean(raw);
  return v === "" ? `— ${NOT_RECORDED}` : v;
};
function buildProfileExportData(input) {
  const generatedAt = istStamp(input.generatedAt);
  const active = input.cycles.find((c) => !c.cycle.superseded) ?? null;
  const state = getLifecycleState({
    facility: input.facility,
    activeCycle: active ? {
      cycleNumber: active.cycle.cycleNumber,
      cycleType: active.cycle.cycleType,
      sa: active.sa,
      nqas: active.nqas
    } : null,
    funds: input.funds,
    s: input.settings ?? DEFAULT_SETTINGS
  });
  const completeness = profileCompleteness({
    facility: input.facility,
    activeCycle: active ? { cycleNumber: active.cycle.cycleNumber } : null
  });
  const kpis = [
    ["Current stage", `${state.stageIndex} of 7 — ${state.chip.label}`],
    ["Internal Assessment score", state.scores.ia.long],
    ["State Assessment score", state.scores.sa.long],
    ["NQAS Assessment score", state.scores.nqas.long],
    [
      "Certification validity",
      state.validity.to ? `${toDdMmmYyyy(state.validity.from)} to ${toDdMmmYyyy(state.validity.to)} (${Math.max(0, state.validity.daysLeft ?? 0)} days left)` : `— ${NOT_RECORDED}`
    ],
    ["Open gap-closure gaps", String(state.openGaps)],
    ["Profile completeness", `${completeness.pct}% (${completeness.missing.length} field${completeness.missing.length === 1 ? "" : "s"} missing)`]
  ];
  const lifecycle = state.stages.map((st, i) => {
    const d = state.stageDates[st.key];
    return [
      String(i + 1),
      st.label,
      st.state === "current" ? "CURRENT STAGE" : st.state === "done" ? "Completed" : "Not reached",
      d?.date && toDdMmmYyyy(d.date) || ""
    ];
  });
  const record = [
    ["Facility name", label(input.facility.name)],
    ["NIN Number", label(input.facility.ninNumber)],
    ["Facility type", label(input.facility.facilityType)],
    ["Phase type", label(input.facility.phaseType)],
    ["Block", label(input.facility.block)],
    ["PHC", label(input.facility.phc)],
    ["NQAS eligibility", label(input.facility.eligibility)],
    ["SaQsham Facility_Type", label(input.facility.saqshamFacilityType)],
    ["SaQsham Name/Category", label(input.facility.saqshamCategory)],
    ["General remarks", label(input.facility.remarks)]
  ];
  const certHistory = input.cycles.map(({ cycle, sa, nqas }) => {
    const saPct = sa?.scorePercent;
    const nqasPct = nqas?.scorePercent ?? nqas?.manualScore ?? null;
    const validFrom = nqas?.certificationDate ?? nqas?.goiLetterDate ?? null;
    return [
      `#${cycle.cycleNumber}`,
      `${cycle.cycleType}${cycle.superseded ? " (superseded)" : ""}`,
      // Scores stay REAL numbers (0 and 100 included) so Excel writes them
      // right-aligned with a 0.0 number format instead of as text.
      saPct == null ? "" : saPct,
      nqasPct == null ? "" : nqasPct,
      nqas?.certificationStatus ?? `Pending (${clean(nqas?.status) || "assessment not recorded"})`,
      nqas?.certificationStatus ? `${toDdMmmYyyy(validFrom)} to ${toDdMmmYyyy(nqas.validityDate)}` : ""
    ];
  });
  const inr = (v) => v == null ? "" : `₹${Number(v).toLocaleString("en-IN")}`;
  const funds = input.funds.map((f) => [
    clean(f.financialYear),
    clean(f.status) || NOT_RECORDED,
    inr(f.amountSanctioned),
    inr(f.amountReleased),
    inr(f.amountUtilized),
    clean(f.remarks)
  ]);
  const nocs = input.nocs.map((n) => {
    const validity = deriveFireNocStatus(
      clean(n.nocAvailable) || null,
      clean(n.expiryDate) || null,
      clean(n.status) || null,
      void 0,
      void 0
    );
    return [
      clean(n.nocAvailable) || NOT_RECORDED,
      clean(n.nocNumber),
      toDdMmmYyyy(clean(n.issuedDate)),
      toDdMmmYyyy(clean(n.expiryDate)),
      validity
    ];
  });
  const buildings = input.buildings.map((b) => [
    clean(b.buildingType) || NOT_RECORDED,
    clean(b.buildingStatus) || NOT_RECORDED,
    toDdMmmYyyy(clean(b.lastRenovationDate)),
    b.renovationFundRequired != null && Number(b.renovationFundRequired) !== 0 ? inr(b.renovationFundRequired) : "",
    clean(b.remarks)
  ]);
  const cycleHistory = [...input.cycles].sort((a, b) => a.cycle.cycleNumber - b.cycle.cycleNumber).map(({ cycle, sa, nqas }) => {
    const deferred = nqas?.certificationStatus === "Deferred";
    const validity = deferred ? nqas?.validityDate ?? "" : nqas?.validityDate ?? "";
    return [
      `#${cycle.cycleNumber}`,
      `${cycle.cycleType}${cycle.superseded ? " (superseded)" : ""}`,
      toDdMmmYyyy(sa?.actualStartDate) && toDdMmmYyyy(sa?.actualEndDate) ? `${toDdMmmYyyy(sa?.actualStartDate)} to ${toDdMmmYyyy(sa?.actualEndDate)}` : toDdMmmYyyy(sa?.actualStartDate) || toDdMmmYyyy(sa?.scheduledDate) || "",
      sa?.scorePercent == null ? "" : sa.scorePercent,
      toDdMmmYyyy(nqas?.scheduledStartDate) && toDdMmmYyyy(nqas?.scheduledEndDate) ? `${toDdMmmYyyy(nqas?.scheduledStartDate)} to ${toDdMmmYyyy(nqas?.scheduledEndDate)}` : "",
      toDdMmmYyyy(nqas?.actualStartDate) && toDdMmmYyyy(nqas?.actualEndDate) ? `${toDdMmmYyyy(nqas?.actualStartDate)} to ${toDdMmmYyyy(nqas?.actualEndDate)}` : "",
      clean(nqas?.mode),
      nqas?.scorePercent == null ? "" : nqas.scorePercent,
      clean(nqas?.certificationStatus) || clean(nqas?.status) || "",
      toDdMmmYyyy(nqas?.certificationDate ?? nqas?.goiLetterDate ?? null),
      deferred ? `Cooling period ends ${toDdMmmYyyy(validity)}` : toDdMmmYyyy(validity)
    ];
  });
  const iaRows = (input.iaQuarters ?? []).slice().sort((a, b) => a.fy.localeCompare(b.fy) || a.quarter - b.quarter).map((q) => [
    `Q${q.quarter} ${q.fy}`,
    q.nqasIaScore == null ? "" : q.nqasIaScore,
    q.kayakalpIaScore == null ? "" : q.kayakalpIaScore,
    q.ecoFriendlyScore == null ? "" : q.ecoFriendlyScore,
    q.updatedByName ?? "",
    q.updatedAt ? istStamp(new Date(q.updatedAt)) : ""
  ]);
  const audit = input.audits.slice(0, 10).map((a) => [
    istStamp(new Date(a.changedAt)),
    clean(a.changedByName) || "System",
    // Every audit cell is capped long text so PDF columns can never blow up.
    (clean(a.field) || clean(a.action)).slice(0, 120),
    a.oldValue != null ? String(a.oldValue).slice(0, 120) : "",
    a.newValue != null ? String(a.newValue).slice(0, 120) : ""
  ]);
  return {
    generatedAt,
    generatedBy: input.generatedBy ?? "",
    district: input.district ?? "",
    facility: input.facility,
    chip: state.chip,
    stageIndex: state.stageIndex,
    kpis,
    lifecycle,
    record,
    certHistory,
    cycleHistory,
    iaRows,
    funds,
    fundHeader: ["FY", "Status", "Sanctioned", "Released", "Utilized", "Remarks"],
    nocs,
    nocHeader: ["NOC available", "NOC number", "Issued", "Expiry", "Validity status"],
    buildings,
    buildingHeader: ["Type", "Status", "Last renovation", "Renovation fund", "Remarks"],
    audit,
    auditHeader: ["When (IST)", "User", "Change", "From", "To"],
    completeness,
    validity: state.validity,
    openGaps: state.openGaps,
    scores: state.scores
  };
}
const applySheet = (wb, spec, meta) => {
  const ws = wb.addWorksheet(spec.title.slice(0, 31), {
    views: [{ showGridLines: spec.title !== "Summary", state: "frozen", ySplit: 4 }]
  });
  const lastCol = Math.max(1, spec.header.length);
  ws.getCell(1, 1).value = `NQAS Tracker — ${spec.title}`;
  ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: "FF0D6960" } };
  ws.mergeCells(1, 1, 1, lastCol);
  ws.getCell(2, 1).value = `${meta.facilityName} · Generated ${meta.generatedAt} by ${meta.generatedBy || "NQAS Tracker user"}`;
  ws.getCell(2, 1).font = { size: 10, color: { argb: "FF666666" } };
  ws.mergeCells(2, 1, 2, lastCol);
  const headerRow = ws.getRow(4);
  headerRow.values = spec.header;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D6960" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" }
    };
  });
  spec.rows.forEach((rowValues, r) => {
    const excelRow = ws.getRow(5 + r);
    for (let c = 0; c < spec.header.length; c++) {
      const raw = rowValues[c] ?? "";
      const cell = excelRow.getCell(c + 1);
      const isNumeric = spec.numericCols?.includes(c) ?? false;
      if (typeof raw === "number") {
        cell.value = raw;
        if (isNumeric) cell.numFmt = "0.0";
      } else {
        cell.value = String(raw);
        if (spec.textCols?.includes(c)) cell.numFmt = "@";
      }
      cell.alignment = {
        vertical: "top",
        // Numbers right-aligned, everything else left (long text wraps).
        horizontal: isNumeric ? "right" : "left",
        wrapText: true,
        indent: isNumeric ? 0 : 1
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFDDDDDD" } },
        bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
        left: { style: "thin", color: { argb: "FFDDDDDD" } },
        right: { style: "thin", color: { argb: "FFDDDDDD" } }
      };
      if (r % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F8F7" } };
      }
    }
  });
  if (spec.rows.length > 0) {
    ws.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4 + spec.rows.length, column: spec.header.length }
    };
  } else {
    ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: spec.header.length } };
  }
  if (spec.image) {
    const imageId = wb.addImage({ base64: spec.image.base64, extension: "png" });
    ws.addImage(imageId, {
      tl: { col: 0.2, row: 4.4 },
      ext: { width: spec.image.width, height: spec.image.height },
      editAs: "oneCell"
    });
    ws.getRow(5).height = Math.max(15, spec.image.height * 0.75);
  }
  spec.header.forEach((h, c) => {
    let longest = h.length;
    for (const rowValues of spec.rows) {
      longest = Math.max(longest, String(rowValues[c] ?? "").length);
    }
    ws.getColumn(c + 1).width = Math.min(50, Math.max(12, longest + 2));
  });
  ws.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 }
  };
  ws.headerFooter = {
    oddFooter: `&8&L${meta.facilityName} — NQAS Tracker&RPage &P of &N`
  };
  void spec.dateCols;
};
async function exportExcelWorkbook(specs, meta, save) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "NQAS Tracker";
  for (const spec of specs) applySheet(wb, spec, meta);
  const buf = await wb.xlsx.writeBuffer();
  save(buf);
}
function profileSheetSpecs(out) {
  return [
    { title: "Summary", header: ["Metric", "Value"], rows: out.kpis, textCols: [1] },
    {
      title: "Facility Record",
      header: ["Field", "Value"],
      rows: out.record,
      textCols: [1]
    },
    {
      title: "Certification History",
      header: ["Cycle", "Type", "SA score", "NQAS score", "Status", "Valid from–to"],
      rows: out.certHistory,
      numericCols: [2, 3],
      textCols: [0]
    },
    {
      title: "Cycle History",
      header: [
        "Cycle",
        "Type",
        "SA dates",
        "SA score",
        "NQAS scheduled",
        "NQAS visit",
        "Mode",
        "Assessment score",
        "Result",
        "Certification date",
        "Validity / cooling end"
      ],
      rows: out.cycleHistory,
      numericCols: [3, 7],
      textCols: [0]
    },
    {
      title: "IA Quarters",
      header: ["Quarter", "NQAS IA", "Kayakalp IA", "Eco-friendly", "Updated by", "Updated at (IST)"],
      rows: out.iaRows,
      numericCols: [1, 2, 3],
      textCols: [0, 5]
    },
    { title: "Gap Closure", header: out.fundHeader, rows: out.funds, textCols: [5] },
    { title: "Fire NOC", header: out.nocHeader, rows: out.nocs, textCols: [1] },
    { title: "Building", header: out.buildingHeader, rows: out.buildings, textCols: [4] },
    { title: "Audit Trail", header: out.auditHeader, rows: out.audit, textCols: [2, 3, 4] }
  ];
}
function profileWorkbookMeta(out) {
  return {
    facilityName: `${out.facility.name} (NIN ${out.facility.ninNumber ?? "—"})`,
    generatedAt: out.generatedAt,
    generatedBy: out.generatedBy
  };
}
async function exportProfileExcel(out, fileBase) {
  const meta = profileWorkbookMeta(out);
  const sheets = profileSheetSpecs(out);
  try {
    const parse = (label2) => /^Q([1-4])\s+(\d{2})-(\d{2})$/.exec(String(label2 ?? ""));
    const rows = out.iaRows.map((r) => {
      const m = parse(r[0]);
      if (!m) return null;
      return {
        fy: `20${m[2]}-${m[3]}`,
        quarter: Number(m[1]),
        nqasIaScore: typeof r[1] === "number" ? r[1] : null,
        kayakalpIaScore: typeof r[2] === "number" ? r[2] : null
      };
    }).filter((r) => !!r);
    if (rows.length) {
      const { iaCardPointsFromRows, iaCardPng } = await __vitePreload(async () => { const { iaCardPointsFromRows, iaCardPng } = await import('./scoreBands-CA46Kez8.js').then(n => n.e);return { iaCardPointsFromRows, iaCardPng }},true              ?__vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10]):void 0);
      const { points, change } = iaCardPointsFromRows(rows);
      const png = points.length ? await iaCardPng(points, change, { width: 174, chartMm: 40 }) : null;
      if (png) {
        const at = sheets.findIndex((s) => s.title === "IA Quarters");
        sheets.splice(at + 1, 0, {
          title: "IA Chart",
          header: ["Internal Assessment & Kayakalp — last four quarters"],
          rows: [],
          image: png
        });
      }
    }
  } catch {
  }
  await exportExcelWorkbook(sheets, meta, (buf) => {
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileBase}-profile.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  });
}
const BULK_HEADER = [
  "Facility name",
  "NIN Number",
  "Type",
  "Phase",
  "Block",
  "PHC",
  "Stage",
  "Current status",
  "IA score",
  "SA score",
  "NQAS score",
  "Cert. status",
  "Valid from",
  "Valid till",
  "Open gaps",
  "SaQsham Facility_Type",
  "SaQsham Name/Category",
  "Remarks"
];
function trackerRowsToBulkRows(rows) {
  return rows.map((r) => ({
    facility: r.facility,
    activeCycle: r.cycleNumber ? {
      cycle: {
        cycleNumber: r.cycleNumber,
        cycleType: r.cycleType ?? "Initial",
        recertStage: r.recertStage ?? null
      },
      sa: r.sa ?? null,
      nqas: r.nqas ?? null
    } : null,
    funds: r.fund ? [{ status: r.fund.status }] : []
  }));
}
function buildBulkRows(rows, meta = {}) {
  return rows.map(({ facility, activeCycle, funds }) => {
    const out = buildProfileExportData({
      facility,
      cycles: activeCycle ? [activeCycle] : [],
      funds,
      nocs: [],
      buildings: [],
      audits: [],
      settings: meta
    });
    const nqas = activeCycle?.nqas ?? null;
    return [
      facility.name,
      facility.ninNumber ?? "",
      // text column downstream (NIN as text)
      facility.facilityType,
      facility.phaseType ?? "",
      facility.block,
      facility.phc,
      `${out.stageIndex} of 7`,
      out.chip.label,
      out.scores.ia.value ?? "",
      out.scores.sa.value ?? "",
      out.scores.nqas.value ?? "",
      nqas?.certificationStatus ?? "",
      toDdMmmYyyy(out.validity.from),
      toDdMmmYyyy(out.validity.to),
      out.openGaps,
      facility.saqshamFacilityType ?? "",
      facility.saqshamCategory ?? "",
      facility.remarks ?? ""
    ];
  });
}
async function exportFacilitiesBulkProfile(rows, meta = {}) {
  await exportExcelWorkbook(
    [
      {
        title: "Facilities",
        header: [...BULK_HEADER],
        rows: buildBulkRows(rows, meta),
        numericCols: [8, 9, 10, 14],
        textCols: [1]
      }
    ],
    {
      facilityName: `${rows.length} facilities — master list${meta.district ? ` · ${meta.district}` : ""}`,
      generatedAt: istStamp(meta.generatedAt),
      generatedBy: meta.generatedBy ?? ""
    },
    (buf) => {
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nqas-facilities-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    }
  );
}

export { exportProfileExcel as a, buildProfileExportData as b, exportExcelWorkbook as c, exportFacilitiesBulkProfile as e, istStamp as i, trackerRowsToBulkRows as t };
