import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, z as ChevronRight, H as ChevronDown, aG as File, F as FileSpreadsheet, u as FileText, L as LoaderCircle } from './icons-BxQpodNr.js';
import { S as StickyTableScroll, f as Table, T as TableHeader, a as TableRow, b as TableHead, c as TableBody, d as TableCell, e as TableFooter } from './table-DH4Byhhd.js';
import { c as cn, B as Button, t as toast } from './index-CBV6wOh8.js';
import { D as Dialog, a as DialogContent, b as DialogHeader, c as DialogTitle, d as DialogDescription, e as DialogFooter } from './dialog-BW3GEiPg.js';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from './select-qTILnHQg.js';
import { I as Input } from './input-Cy2oZLur.js';
import { L as Label } from './label-BaPkqXdo.js';
import { W as monthName, b as toDisplayDate, D as DEFAULT_SETTINGS, X as saqshamDocumentsStatusOf, Y as mergedPipelineStatus, Q as FACILITY_CURRENT_STATUS_LABEL, Z as Switch } from './AppShell-CP099uvN.js';
import { E, a as autoTable } from './vendor-jspdf-BarNdCns.js';
import { E as ExcelJS } from './vendor-exceljs-CqnmHTS6.js';
import { d as deriveFireNocStatus } from './today-D9v8Esj5.js';
import { T as TRACKER_COLUMN_LABELS } from './trackerColumns-8Ekg9xb3.js';

const AGG_LABELS = {
  sum: "Sum",
  avg: "Average",
  count: "Count",
  min: "Minimum",
  max: "Maximum",
  distinct: "Distinct count",
  pctTotal: "% of Total"
};
function measureLabel(spec, field) {
  if (!field) return AGG_LABELS[spec.agg];
  return `${AGG_LABELS[spec.agg]} of ${field.label}`;
}
function friendlyMonthLabel(iso) {
  const m = monthName(iso.length === 7 ? iso : iso.slice(0, 7));
  return m ? `${m} ${iso.slice(0, 4)}` : iso;
}
function allowedAggs(type) {
  if (type === "number") return ["sum", "avg", "count", "min", "max", "distinct", "pctTotal"];
  if (type === "date") return ["count", "min", "max", "distinct", "pctTotal"];
  return ["count", "distinct", "pctTotal"];
}
function defaultAggFor(type) {
  return type === "number" ? "sum" : "count";
}
const s = (v) => v == null || v === "" ? null : String(v);
const n = (v) => {
  if (v == null || v === "") return null;
  const num = Number(v);
  return Number.isFinite(num) ? num : null;
};
function daysFromToday(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const today = /* @__PURE__ */ new Date();
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((start - t) / 864e5);
}
function createPivotFields(appSettings, opts) {
  const settings = {
    ...DEFAULT_SETTINGS,
    ...appSettings ?? {}
  };
  const overrides = appSettings?.tableHeaderOverrides ?? {};
  const label = (id, fallback) => {
    const canonical = TRACKER_COLUMN_LABELS[id];
    if (!canonical) return fallback;
    const renamed = overrides[canonical];
    return typeof renamed === "string" && renamed.trim() ? renamed : canonical;
  };
  const pipe = (row) => mergedPipelineStatus(
    {
      eligibility: row.facility.eligibility ?? "",
      currentStatus: row.facility.currentStatus
    },
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
  const f = (id, fallback, group, type, value, hint, aliases) => ({ id, label: label(id, fallback), group, type, value, hint, aliases });
  return [
    /* ---- Facility ---- */
    f("facilityName", "Facility", "Facility", "text", (r) => s(r.facility.name)),
    f("block", "Block", "Facility", "text", (r) => s(r.facility.block)),
    f("phc", "PHC", "Facility", "text", (r) => s(r.facility.phc)),
    f("nin", "NIN", "Facility", "text", (r) => s(r.facility.ninNumber), "National (health) facility id"),
    f("facilityType", "Facility Type", "Facility", "text", (r) => s(r.facility.facilityType)),
    f("eligibility", "NQAS Eligibility", "Facility", "text", (r) => s(r.facility.eligibility)),
    f(
      "cycleNumber",
      "Certification Cycle",
      "Facility",
      "text",
      (r) => r.cycleNumber == null ? null : `#${r.cycleNumber}`,
      void 0,
      ["Cert_Cycle", "cycle"]
    ),
    f("cycleType", "Cycle Type", "Facility", "text", (r) => s(r.cycleType), void 0, [
      "cycle-type",
      "Cycle-type"
    ]),
    f("remarks", "Remarks", "Facility", "text", (r) => s(r.facility.remarks)),
    /* ---- Certification ---- */
    // Label comes from the config (lib/trackerColumns ← lib/masterColumns):
    // this field was renamed "Pipeline Status" → "Facility Current Status".
    f("pipelineStatus", TRACKER_COLUMN_LABELS.pipelineStatus, "Certification", "text", pipe, "Merged status derived from SA, documents and NQAS"),
    f(
      "certStatus",
      "NQAS Certification Status",
      "Certification",
      "text",
      (r) => s(r.nqas?.certificationStatus)
    ),
    f(
      "certDate",
      "GoI Letter Date / Certification date",
      "Certification",
      "date",
      (r) => s(r.nqas?.goiLetterDate ?? r.nqas?.certificationDate)
    ),
    f(
      "certYear",
      "Certification year",
      "Certification",
      "text",
      (r) => s((r.nqas?.goiLetterDate ?? r.nqas?.certificationDate)?.slice(0, 4)),
      'Sorts chronologically; facilities without a date sit in ONE "(No date)" row'
    ),
    f(
      "certMonth",
      "Certification month",
      "Certification",
      "text",
      (r) => s((r.nqas?.goiLetterDate ?? r.nqas?.certificationDate)?.slice(0, 7)),
      'Sorts by the ISO key; shown as "Oct 2022" (or the ISO form)'
    ),
    /* ---- Certification month/year label options are applied by
            applyDateLabelOptions() after the array is built (see below). ---- */
    f(
      "certScore",
      "Certified Score %",
      "Certification",
      "number",
      (r) => r.nqas?.scorePercent ?? null
    ),
    f(
      "resultDoc",
      "NQAS Result document",
      "Certification",
      "text",
      (r) => s(r.resultDocumentName)
    ),
    f(
      "naScheduled",
      "NQAS Assessment Start date",
      "Certification",
      "date",
      (r) => s(r.nqas?.scheduledStartDate)
    ),
    f(
      "naEnd",
      "NQAS Assessment End date",
      "Certification",
      "date",
      (r) => s(r.nqas?.actualEndDate ?? r.nqas?.scheduledEndDate)
    ),
    f("naMode", "Mode of Assessment", "Certification", "text", (r) => s(r.nqas?.mode)),
    f(
      "departments",
      "Departments / Packages",
      "Certification",
      "text",
      (r) => s((r.nqas?.departments ?? []).join(", "))
    ),
    /* ---- Gap closure fund ---- */
    f(
      "gapAmount",
      "Gap Closure Amount",
      "Gap Closure Fund",
      "number",
      (r) => r.fund?.amountSanctioned ?? null
    ),
    f(
      "gcYear",
      "GC Fund received Year",
      "Gap Closure Fund",
      "text",
      (r) => s(r.fund?.financialYear)
    ),
    f(
      "procLink",
      "Gap Closure Proc. / Fund document",
      "Gap Closure Fund",
      "text",
      (r) => s(r.fund?.procLink ?? r.fund?.fundAttachmentName)
    ),
    /* ---- Internal assessment ---- */
    f(
      "nqasIaQ1",
      "NQAS IA % (Q1)",
      "Internal Assessment",
      "number",
      (r) => r.facility.nqasIaQ1 ?? null
    ),
    f(
      "nqasIaQ2",
      "NQAS IA % (Q2)",
      "Internal Assessment",
      "number",
      (r) => r.facility.nqasIaQ2 ?? null
    ),
    f("nqasIaDelta", "NQAS IA change (Q2 − Q1)", "Internal Assessment", "number", (r) => {
      const a = r.facility.nqasIaQ1;
      const b = r.facility.nqasIaQ2;
      return a == null || b == null ? null : Math.round((b - a) * 100) / 100;
    }),
    f(
      "kayakalpIaQ1",
      "Kayakalp IA % (Q1)",
      "Internal Assessment",
      "number",
      (r) => r.facility.kayakalpIaQ1 ?? null
    ),
    f(
      "kayakalpIaQ2",
      "Kayakalp IA % (Q2)",
      "Internal Assessment",
      "number",
      (r) => r.facility.kayakalpIaQ2 ?? null
    ),
    f("kayakalpIaDelta", "Kayakalp IA change (Q2 − Q1)", "Internal Assessment", "number", (r) => {
      const a = r.facility.kayakalpIaQ1;
      const b = r.facility.kayakalpIaQ2;
      return a == null || b == null ? null : Math.round((b - a) * 100) / 100;
    }),
    /* ---- State assessment ---- */
    f(
      "saStatus",
      "State Assessment Status",
      "State Assessment",
      "text",
      (r) => s(r.sa?.status)
    ),
    f("saScore", "SA Score", "State Assessment", "number", (r) => r.sa?.scorePercent ?? null),
    f(
      "genDoc",
      "SaQsham Documents Status",
      "State Assessment",
      "text",
      (r) => s(saqshamDocumentsStatusOf(r.sa?.generalDocStatus, r.nqas?.certificationStatus))
    ),
    f(
      "saStart",
      "State Assessment Start date",
      "State Assessment",
      "date",
      (r) => s(r.sa?.actualStartDate ?? r.sa?.scheduledDate)
    ),
    f(
      "saEnd",
      "State Assessment End date",
      "State Assessment",
      "date",
      (r) => s(r.sa?.actualEndDate)
    ),
    f(
      "saAssessor1",
      "Name of Assessor 1",
      "State Assessment",
      "text",
      (r) => s(r.sa?.assessor1Name)
    ),
    f(
      "saAssessor1Hud",
      "Assessor 1 HUD",
      "State Assessment",
      "text",
      (r) => s(r.sa?.assessor1Hud)
    ),
    f(
      "saAssessor2",
      "Name of Assessor 2",
      "State Assessment",
      "text",
      (r) => s(r.sa?.assessor2Name)
    ),
    f(
      "saAssessor2Hud",
      "Assessor 2 HUD",
      "State Assessment",
      "text",
      (r) => s(r.sa?.assessor2Hud)
    ),
    f(
      "saReport",
      "SA Report",
      "State Assessment",
      "text",
      (r) => s(r.sa?.reportAttachmentName)
    ),
    f(
      "saChecklist",
      "SA Checklist",
      "State Assessment",
      "text",
      (r) => s(r.sa?.checklistAttachmentName)
    ),
    /* ---- Surveillance & recertification ---- */
    f(
      "survDue1",
      "Surveillance 1 due date",
      "Surveillance & Recert",
      "date",
      (r) => s(r.nqas?.surveillanceDue1)
    ),
    f(
      "surv1",
      "1st Surveillance done date",
      "Surveillance & Recert",
      "date",
      (r) => s(r.nqas?.surveillanceDone1)
    ),
    f(
      "survDue2",
      "Surveillance 2 due date",
      "Surveillance & Recert",
      "date",
      (r) => s(r.nqas?.surveillanceDue2)
    ),
    f(
      "surv2",
      "2nd Surveillance done date",
      "Surveillance & Recert",
      "date",
      (r) => s(r.nqas?.surveillanceDone2)
    ),
    f(
      "survScore",
      "2nd Surveillance Score %",
      "Surveillance & Recert",
      "number",
      (r) => r.nqas?.manualScore ?? null
    ),
    f(
      "validityDate",
      "NQAS Certificate Validity date",
      "Surveillance & Recert",
      "date",
      (r) => s(r.nqas?.validityDate)
    ),
    f(
      "recertStatus",
      "Recertification Status",
      "Surveillance & Recert",
      "text",
      (r) => s(r.nqas?.recertStatus)
    ),
    f(
      "recertYear",
      "Re-Certification Year",
      "Surveillance & Recert",
      "text",
      (r) => s(r.nqas?.recertYear)
    ),
    /* ---- Building & Fire NOC ---- */
    f(
      "buildingType",
      "Building Type",
      "Building & Fire NOC",
      "text",
      (r) => s(r.building?.buildingType)
    ),
    f(
      "buildingStatus",
      "Facility Building Status",
      "Building & Fire NOC",
      "text",
      (r) => s(r.building?.buildingStatus)
    ),
    f(
      "condemned",
      "Condemned document",
      "Building & Fire NOC",
      "text",
      (r) => s(r.building?.condemnedLink ?? r.building?.condemnedAttachmentName)
    ),
    f(
      "nocAvailable",
      "NOC Available",
      "Building & Fire NOC",
      "text",
      (r) => s(r.noc?.nocAvailable)
    ),
    f(
      "nocStatus",
      "Fire NOC Validity Status",
      "Building & Fire NOC",
      "text",
      (r) => deriveFireNocStatus(
        r.noc?.nocAvailable ?? null,
        r.noc?.expiryDate ?? null,
        r.noc?.status ?? null
      ),
      "Derived from the Fire NOC validity date"
    ),
    f(
      "nocCertified",
      "NOC Issue Date",
      "Building & Fire NOC",
      "date",
      (r) => s(r.noc?.issuedDate)
    ),
    f(
      "nocValidity",
      "Fire NOC Validity",
      "Building & Fire NOC",
      "date",
      (r) => s(r.noc?.expiryDate)
    ),
    f(
      "nocDoc",
      "NOC document",
      "Building & Fire NOC",
      "text",
      (r) => s(r.noc?.nocLink ?? r.noc?.nocAttachmentName)
    ),
    /* ---- Calculated ---- */
    f(
      "daysSinceCert",
      "Days since certification",
      "Calculated",
      "number",
      (r) => daysFromToday(r.nqas?.goiLetterDate ?? r.nqas?.certificationDate)
    ),
    f(
      "daysToValidity",
      "Days until certificate expiry",
      "Calculated",
      "number",
      (r) => daysFromToday(r.nqas?.validityDate),
      "Negative when the certificate has already expired"
    ),
    f(
      "daysToSurv1",
      "Days until 1st surveillance due",
      "Calculated",
      "number",
      (r) => daysFromToday(r.nqas?.surveillanceDue1)
    )
  ];
}
function applyDateLabelOptions(fields, monthDisplay = "friendly") {
  for (const field of fields) {
    if (field.id === "certMonth") {
      field.display = monthDisplay === "friendly" ? friendlyMonthLabel : void 0;
      field.blankLabel = "(No date)";
    } else if (field.id === "certYear") {
      field.blankLabel = "(No date)";
    }
  }
  return fields;
}
function prunePivotConfig(config, retired) {
  if (retired.size === 0) return config;
  const keep = (id) => !retired.has(id);
  const filters = {};
  for (const [id, values] of Object.entries(config.filters)) {
    if (keep(id)) filters[id] = values;
  }
  return {
    ...config,
    rows: config.rows.filter(keep),
    columns: config.columns.filter(keep),
    values: config.values.filter((v) => keep(v.fieldId)),
    filters
  };
}
function defaultPivotConfig() {
  return {
    rows: ["block"],
    columns: [],
    values: [{ fieldId: "facilityName", agg: "count" }],
    filters: {},
    sort: { kind: "label", dir: "asc" }
  };
}
const SEP = "";
const BLANK = "(blank)";
function compareCells(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "number") return -1;
  if (typeof b === "number") return 1;
  return compareStrings(a, b);
}
function groupKey(v) {
  return v == null || v === "" ? BLANK : String(v);
}
function compareStrings(a, b) {
  return a.localeCompare(b, void 0, { numeric: true, sensitivity: "base" });
}
function compareLabels(a, b) {
  const ka = a == null || a === "" ? null : a;
  const kb = b == null || b === "" ? null : b;
  if (ka === null && kb === null) return 0;
  if (ka === null) return 1;
  if (kb === null) return -1;
  return compareStrings(ka, kb);
}
function aggregate(rows, spec, field, denom) {
  if (!field) return null;
  if (spec.agg === "pctTotal") {
    const base = denom ?? rows;
    if (base.length === 0) return null;
    if (field.type === "number") {
      let bucketSum = 0;
      let totalSum = 0;
      for (const r of rows) {
        const v = n(field.value(r));
        if (v != null) bucketSum += v;
      }
      for (const r of base) {
        const v = n(field.value(r));
        if (v != null) totalSum += v;
      }
      if (totalSum === 0) return null;
      return bucketSum / totalSum * 100;
    }
    return rows.length / base.length * 100;
  }
  if (rows.length === 0) return null;
  if (spec.agg === "count") {
    let count = 0;
    for (const r of rows) {
      const v = field.value(r);
      if (v != null && v !== "") count += 1;
    }
    return count;
  }
  if (spec.agg === "distinct") {
    const seen = /* @__PURE__ */ new Set();
    for (const r of rows) {
      const v = field.value(r);
      if (v != null && v !== "") seen.add(String(v));
    }
    return seen.size;
  }
  if (spec.agg === "sum" || spec.agg === "avg") {
    let sum = 0;
    let count = 0;
    for (const r of rows) {
      const v = n(field.value(r));
      if (v != null) {
        sum += v;
        count += 1;
      }
    }
    if (count === 0) return null;
    return spec.agg === "sum" ? sum : sum / count;
  }
  let bestNum = null;
  let bestStr = null;
  const date = field.type === "date";
  for (const r of rows) {
    const raw = field.value(r);
    if (raw == null || raw === "") continue;
    if (date) {
      const v = String(raw);
      if (bestStr === null || (spec.agg === "min" ? compareStrings(v, bestStr) < 0 : compareStrings(v, bestStr) > 0)) {
        bestStr = v;
      }
    } else {
      const v = n(raw);
      if (v !== null && (bestNum === null || (spec.agg === "min" ? v < bestNum : v > bestNum))) {
        bestNum = v;
      }
    }
  }
  return date ? bestStr : bestNum;
}
function buildPivot({
  rows,
  fields,
  config,
  options,
  collapsed = /* @__PURE__ */ new Set()
}) {
  const byId = new Map(fields.map((f) => [f.id, f]));
  const rowFields = config.rows.map((id) => byId.get(id)).filter((f) => !!f);
  const colFields = config.columns.map((id) => byId.get(id)).filter((f) => !!f);
  const valueSpecs = config.values.filter((v) => byId.has(v.fieldId));
  const valueFields = valueSpecs.map((v) => byId.get(v.fieldId));
  const showSubtotals = options?.showSubtotals ?? true;
  const showGrandTotals = options?.showGrandTotals ?? true;
  const maxRows = options?.maxRows ?? 2e3;
  const empty = {
    rowFields,
    colFields,
    valueSpecs,
    valueFields,
    colCombos: [],
    outRows: [],
    grandMeasures: [],
    grandTotals: [],
    filteredCount: 0,
    totalCount: rows.length,
    truncated: false,
    maxRows
  };
  if (valueSpecs.length === 0) return empty;
  const filtered = rows.filter((row) => {
    for (const [fieldId, allowed] of Object.entries(config.filters)) {
      if (!allowed || allowed.length === 0) continue;
      const field = byId.get(fieldId);
      if (!field) continue;
      if (!allowed.includes(groupKey(field.value(row)))) return false;
    }
    return true;
  });
  const prepared = filtered.map((row) => ({
    row,
    rowLabels: rowFields.map((f) => {
      const v = f.value(row);
      return v == null || v === "" ? null : String(v);
    }),
    colKey: colFields.map((f) => groupKey(f.value(row))).join(SEP),
    colLabels: colFields.map((f) => {
      const v = f.value(row);
      return v == null || v === "" ? null : String(v);
    })
  }));
  const comboMap = /* @__PURE__ */ new Map();
  const comboRows = /* @__PURE__ */ new Map();
  for (const p of prepared) {
    if (!comboMap.has(p.colKey)) {
      comboMap.set(p.colKey, p.colLabels);
      comboRows.set(p.colKey, []);
    }
    comboRows.get(p.colKey)?.push(p.row);
  }
  const printColLabel = (v, j) => {
    const field = colFields[j];
    if (v == null) return field?.blankLabel ?? null;
    return field?.display ? field.display(v) : v;
  };
  const colCombos = [...comboMap.entries()].map(
    ([key, labels]) => ({
      key,
      labels,
      displayLabels: labels.map((l, j) => printColLabel(l, j))
    })
  );
  const config0 = config.sort ?? { kind: "label", dir: "asc" };
  colCombos.sort((a, b) => {
    if (config0.kind === "measure") {
      const av = aggregate(
        comboRows.get(a.key) ?? [],
        valueSpecs[config0.vIndex],
        valueFields[config0.vIndex],
        filtered
      );
      const bv = aggregate(
        comboRows.get(b.key) ?? [],
        valueSpecs[config0.vIndex],
        valueFields[config0.vIndex],
        filtered
      );
      const base = compareCells(av, bv);
      if (base !== 0) return config0.dir === "desc" ? -base : base;
    }
    return compareLabels(a.labels[0], b.labels[0]) || compareStrings(
      a.labels.map((l) => l ?? "").join(SEP),
      b.labels.map((l) => l ?? "").join(SEP)
    );
  });
  const buildLevel = (list, depth, parentLabels) => {
    if (depth >= rowFields.length) return [];
    const buckets = /* @__PURE__ */ new Map();
    for (const p of list) {
      const label = p.rowLabels[depth];
      const key = groupKey(label);
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { label, labels: [...parentLabels, label], items: [] };
        buckets.set(key, bucket);
      }
      bucket.items.push(p);
    }
    const field = rowFields[depth];
    const print = (v) => {
      if (v == null) return field?.blankLabel ?? null;
      return field?.display ? field.display(v) : v;
    };
    return [...buckets.entries()].map(([key, bucket]) => {
      const perCol = /* @__PURE__ */ new Map();
      for (const p of bucket.items) {
        const arr = perCol.get(p.colKey);
        if (arr) arr.push(p.row);
        else perCol.set(p.colKey, [p.row]);
      }
      const displayLabels = bucket.labels.map((l, i) => print(l));
      return {
        key: [...parentLabels.map(groupKey), key].join(SEP),
        depth,
        label: bucket.label,
        displayLabel: print(bucket.label),
        labels: bucket.labels,
        displayLabels,
        rows: bucket.items.map((p) => p.row),
        perCol,
        children: buildLevel(bucket.items, depth + 1, bucket.labels)
      };
    });
  };
  const roots = buildLevel(prepared, 0, []);
  const flatCache = /* @__PURE__ */ new Map();
  const totalCache = /* @__PURE__ */ new Map();
  const flatOf = (node) => {
    const hit = flatCache.get(node.key);
    if (hit) return hit;
    const out = [];
    for (const combo of colCombos) {
      const bucket = node.perCol.get(combo.key) ?? [];
      for (let i = 0; i < valueSpecs.length; i += 1) {
        out.push(aggregate(bucket, valueSpecs[i], valueFields[i], filtered));
      }
    }
    flatCache.set(node.key, out);
    return out;
  };
  const totalsOf = (node) => {
    const hit = totalCache.get(node.key);
    if (hit) return hit;
    const out = valueSpecs.map(
      (spec, i) => aggregate(node.rows, spec, valueFields[i], filtered)
    );
    totalCache.set(node.key, out);
    return out;
  };
  const sort = config.sort ?? { kind: "label", dir: "asc" };
  const cmpCell = compareCells;
  const sortNodes = (nodes) => {
    if (nodes.length < 2) return nodes;
    const dir = sort.dir === "desc" ? -1 : 1;
    const copy = [...nodes];
    if (sort.kind === "label") {
      copy.sort((a, b) => dir * compareLabels(a.label, b.label));
      return copy;
    }
    const keyOf = (node) => {
      if (sort.kind === "total") return totalsOf(node)[sort.vIndex] ?? null;
      return flatOf(node)[sort.colIndex * Math.max(valueSpecs.length, 1) + sort.vIndex] ?? null;
    };
    copy.sort((a, b) => {
      const base = cmpCell(keyOf(a), keyOf(b));
      if (base !== 0) return dir * base;
      return compareLabels(a.label, b.label);
    });
    return copy;
  };
  const outRows = [];
  let truncated = false;
  const push = (row) => {
    if (outRows.length < maxRows) outRows.push(row);
    else truncated = true;
  };
  const emit = (nodes) => {
    for (const node of sortNodes(nodes)) {
      const hasChildren = node.children.length > 0;
      const collapsedHere = collapsed.has(node.key);
      if (!hasChildren) {
        push({
          kind: "leaf",
          key: node.key,
          depth: node.depth,
          labels: node.labels,
          displayLabels: node.displayLabels,
          hasChildren: false,
          collapsed: false,
          count: node.rows.length,
          measures: flatOf(node),
          totals: totalsOf(node)
        });
        continue;
      }
      if (!collapsedHere) emit(node.children);
      if (showSubtotals) {
        push({
          kind: "subtotal",
          key: node.key,
          depth: node.depth,
          labels: node.labels,
          displayLabels: node.displayLabels,
          hasChildren: true,
          collapsed: collapsedHere,
          count: node.rows.length,
          measures: flatOf(node),
          totals: totalsOf(node)
        });
      } else if (collapsedHere) {
        push({
          kind: "subtotal",
          key: node.key,
          depth: node.depth,
          labels: node.labels,
          displayLabels: node.displayLabels,
          hasChildren: true,
          collapsed: true,
          count: node.rows.length,
          measures: flatOf(node),
          totals: totalsOf(node)
        });
      }
    }
  };
  emit(roots);
  const grandMeasures = [];
  for (const combo of colCombos) {
    const bucket = comboRows.get(combo.key) ?? [];
    for (let i = 0; i < valueSpecs.length; i += 1) {
      grandMeasures.push(aggregate(bucket, valueSpecs[i], valueFields[i], filtered));
    }
  }
  const grandTotals = valueSpecs.map(
    (spec, i) => aggregate(filtered, spec, valueFields[i], filtered)
  );
  if (showGrandTotals && (rowFields.length > 0 || colFields.length > 0)) {
    push({
      kind: "grand",
      key: "__grand_total__",
      depth: 0,
      labels: rowFields.map((_, i) => i === 0 && rowFields.length > 0 ? "Grand Total" : null),
      displayLabels: rowFields.map((_, i) => i === 0 && rowFields.length > 0 ? "Grand Total" : null),
      hasChildren: false,
      collapsed: false,
      count: filtered.length,
      measures: grandMeasures,
      totals: grandTotals
    });
  } else if (showGrandTotals && rowFields.length === 0 && colFields.length === 0) {
    push({
      kind: "leaf",
      key: "__all_values__",
      depth: 0,
      labels: [],
      displayLabels: [],
      hasChildren: false,
      collapsed: false,
      count: filtered.length,
      measures: grandMeasures,
      totals: grandTotals
    });
  }
  return {
    rowFields,
    colFields,
    valueSpecs,
    valueFields,
    colCombos,
    outRows,
    grandMeasures,
    grandTotals,
    filteredCount: filtered.length,
    totalCount: rows.length,
    truncated,
    maxRows
  };
}
function distinctValues(rows, field, limit = 400) {
  const seen = /* @__PURE__ */ new Set();
  for (const row of rows) seen.add(groupKey(field.value(row)));
  return [...seen].sort(compareStrings).slice(0, limit);
}
function pivotDrilldown({
  rows,
  fields,
  config,
  labels,
  colLabels
}) {
  const byId = new Map(fields.map((f) => [f.id, f]));
  return rows.filter((row) => {
    for (let i = 0; i < config.rows.length; i += 1) {
      const flag = labels[i];
      if (flag === void 0) continue;
      const field = byId.get(config.rows[i]);
      if (!field) continue;
      const v = field.value(row);
      const isBlank = v == null || v === "";
      if (flag === null ? !isBlank : isBlank || String(v) !== flag)
        return false;
    }
    if (colLabels) {
      for (let j = 0; j < config.columns.length; j += 1) {
        const field = byId.get(config.columns[j]);
        if (!field) continue;
        const v = field.value(row);
        if (groupKey(v) !== groupKey(colLabels[j])) return false;
      }
    }
    return true;
  });
}
function fieldBlankCounts(rows, fields) {
  const out = {};
  for (const field of fields) {
    let blanks = 0;
    for (const row of rows) {
      const v = field.value(row);
      if (v == null || v === "") blanks += 1;
    }
    out[field.id] = blanks;
  }
  return out;
}
function formatCell(v, field, spec, decimals = "auto") {
  if (v == null) return "—";
  if (typeof v === "string") {
    if (field?.type === "date" && (spec.agg === "min" || spec.agg === "max")) {
      return toDisplayDate(v);
    }
    return v;
  }
  const digits = decimals === "auto" ? spec.agg === "count" || spec.agg === "distinct" ? 0 : 2 : decimals;
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(v);
}
function toCsv(headers, rows) {
  const esc = (v) => {
    const text = v == null ? "" : String(v);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join(
    "\n"
  );
}
function downloadCsv(filename, csv) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildPivotColumns(result, opts = {}) {
  const columns = [];
  result.rowFields.forEach((field, level) => {
    columns.push({
      kind: "label",
      level,
      comboIndex: null,
      valueIndex: null,
      key: `label:${field.id}`,
      header: field.label
    });
  });
  result.colCombos.forEach((combo, c) => {
    result.valueSpecs.forEach((_spec, v) => {
      columns.push({
        kind: "value",
        level: null,
        comboIndex: c,
        valueIndex: v,
        key: `m:${c}:${v}`,
        header: combo.labels.length ? `${(combo.displayLabels ?? combo.labels).map((l) => l ?? "(blank)").join(" · ")} — ${measureLabel(result.valueSpecs[v], result.valueFields[v])}` : measureLabel(result.valueSpecs[v], result.valueFields[v])
      });
    });
  });
  if (opts.grandTotalColumn !== false && result.colFields.length > 0) {
    result.valueSpecs.forEach((_spec, v) => {
      columns.push({
        kind: "grand",
        level: null,
        comboIndex: null,
        valueIndex: v,
        key: `tot:${v}`,
        /* "Grand Total" alone with ONE value — the value name appears once
           in the corner caption / export caption; with 2+ values it repeats
           per value. */
        header: result.valueSpecs.length === 1 ? "Grand Total" : `Grand Total — ${measureLabel(result.valueSpecs[v], result.valueFields[v])}`
      });
    });
  }
  return columns;
}
function pivotCounter(result) {
  return {
    facilities: result.filteredCount,
    of: result.totalCount,
    rows: result.outRows.filter((r) => r.kind !== "grand").length,
    valueColumns: result.colCombos.length * result.valueSpecs.length
  };
}

const STATUS_TONE = [
  { match: /^Certified —/, cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300" },
  { match: /Conditionality/, cls: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300" },
  { match: /Recertification Due/, cls: "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300" },
  { match: /Deferred/, cls: "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300" },
  { match: /Not Eligible/, cls: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300" },
  { match: /Eligible/, cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300" },
  { match: /Scheduled/, cls: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300" },
  { match: /Completed/, cls: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300" },
  { match: /Result Awaited|Awaited/, cls: "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300" },
  { match: /Good/, cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300" },
  { match: /Dilapidated|Expired|Not Obtained/, cls: "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300" },
  { match: /Expiring Soon|Needs Repair|Pending/, cls: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300" },
  { match: /Valid/, cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300" }
];
function statusChipCls(value) {
  if (value == null) return null;
  const s = String(value);
  return STATUS_TONE.find((t) => t.match.test(s))?.cls ?? "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300";
}
function PivotTable({
  result,
  layout,
  decimals,
  style,
  formatMode,
  valueLabels = "auto",
  statusColIndexes,
  colWidths,
  onColWidthsChange,
  onToggleCollapse,
  onSort,
  sortState,
  onCellClick
}) {
  const { rowFields, colFields, colCombos, valueSpecs, valueFields, outRows } = result;
  const compact = layout === "compact";
  const tabular = layout === "tabular";
  const valueCount = Math.max(valueSpecs.length, 1);
  const labelCount = Math.max(rowFields.length, 1);
  const showLabels = valueLabels === "always" || valueLabels === "auto" && valueSpecs.length > 1;
  const grandCols = style.grandTotalColumn && colFields.length > 0;
  const headerRows = Math.max(1, colFields.length + (showLabels ? 1 : 0));
  const bodyRows = reactExports.useMemo(() => outRows.filter((r) => r.kind !== "grand"), [outRows]);
  const grandRow = reactExports.useMemo(() => outRows.find((r) => r.kind === "grand") ?? null, [outRows]);
  const totalCols = labelCount + colCombos.length * valueCount + (grandCols ? valueSpecs.length : 0);
  const colMax = reactExports.useMemo(() => {
    const max = [];
    for (const row of outRows) {
      const cells = [...row.measures, ...grandCols ? row.totals : []];
      cells.forEach((c, i) => {
        if (typeof c === "number" && (max[i] ?? 0) < c) max[i] = c;
      });
    }
    return max;
  }, [outRows, grandCols]);
  const startResize = (key) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    const th = e.currentTarget.parentElement;
    const startX = e.clientX;
    const startW = colWidths[key] ?? th?.offsetWidth ?? 140;
    const onMove = (ev) => onColWidthsChange({
      ...colWidths,
      [key]: Math.max(64, Math.round(startW + ev.clientX - startX))
    });
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  const widthStyle = (key, min = 90) => {
    const w = colWidths[key];
    return w ? { width: w, minWidth: w } : { minWidth: min };
  };
  const sortIcon = (dir) => dir ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1 text-[10px] text-primary", children: dir === "asc" ? "▲" : "▼" }) : null;
  const displayLabels = (row, prev) => {
    const src = row.displayLabels ?? row.labels;
    const labels = src.map((l, i) => i <= row.depth ? l : null);
    if (tabular) return labels;
    return labels.map(
      (l, i) => i !== row.depth && prev && prev.labels[i] === row.labels[i] ? null : l
    );
  };
  const rowBg = (row, index) => cn(
    row.kind === "grand" && "bg-primary/10 font-bold",
    row.kind === "subtotal" && "bg-primary/[0.06] font-semibold",
    row.kind === "leaf" && style.striped && index % 2 === 1 && "bg-muted/25"
  );
  const stickyCol = !compact;
  const measureCell = (cell, flatIndex, colIndex, rowIndex, row, onClick) => {
    const v = flatIndex % valueCount;
    const formatted = formatCell(cell, valueFields[v], valueSpecs[v], decimals);
    const chipCls = formatMode === "chips" && statusColIndexes.has(colIndex) ? statusChipCls(cell) : null;
    const isNum = typeof cell === "number";
    const heat = formatMode === "heatmap" && isNum && (colMax[flatIndex] ?? 0) > 0 ? { background: `oklch(0.86 0.09 165 / ${0.15 + 0.55 * cell / colMax[flatIndex]})` } : void 0;
    const bar = formatMode === "databars" && isNum && (colMax[flatIndex] ?? 0) > 0 ? {
      backgroundImage: "linear-gradient(to left, oklch(0.75 0.13 165 / 0.35) 0%, oklch(0.75 0.13 165 / 0.35) 100%)",
      backgroundSize: `${Math.max(4, 100 * cell / colMax[flatIndex])}% 100%`,
      backgroundRepeat: "no-repeat"
    } : void 0;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      TableCell,
      {
        colSpan: 1,
        className: cn(
          "text-right tabular-nums",
          style.borders && "border-r border-border/50",
          style.highlightTotals && row.kind !== "leaf" && "font-semibold",
          row.kind === "grand" && "font-bold",
          chipCls && "px-1.5",
          cell == null && "text-muted-foreground/70"
        ),
        style: heat ?? bar,
        children: chipCls ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: cn(
              "inline-block max-w-full truncate rounded-full border border-transparent px-2 py-0.5 text-xs font-medium",
              chipCls
            ),
            children: formatted
          }
        ) : onClick ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick,
            "data-tip": "Click to see the facilities behind this figure",
            className: "w-full rounded text-inherit hover:underline",
            children: formatted
          }
        ) : formatted
      },
      `c-${rowIndex}-${colIndex}`
    );
  };
  const cornerText = rowFields.map((f) => f.label).join(" › ") || (valueSpecs.length === 1 ? `Values: ${measureLabel(valueSpecs[0], valueFields[0])}` : "Values");
  const cornerTitle = rowFields.length === 0 && valueSpecs.length > 0 ? `Values: ${valueSpecs.map((s, v) => measureLabel(s, valueFields[v])).join(" · ")}` : cornerText;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(StickyTableScroll, { className: "glass", maxHeight: "60vh", minHeight: "320px", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableHeader, { children: colFields.length === 0 ? (
      /* ---- No column field: ONE header row = corner + value columns. ---- */
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Th,
          {
            sticky: stickyCol,
            colSpan: labelCount,
            className: "border-r border-border/60 bg-muted/60 align-bottom",
            "data-tip": cornerTitle,
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => onSort("label"), className: "inline-flex items-center", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: cornerText }),
              sortIcon(sortState("label"))
            ] })
          }
        ),
        valueSpecs.map((spec, v) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          TableHead,
          {
            style: widthStyle(`v:${v}`),
            className: "relative border-r border-border/60 bg-muted/40 text-right",
            "data-tip": measureLabel(spec, valueFields[v]),
            children: [
              (showLabels || valueSpecs.length > 1) && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  className: "inline-flex items-center",
                  onClick: () => onSort("measure", { colIndex: 0, vIndex: v }),
                  children: [
                    measureLabel(spec, valueFields[v]),
                    sortIcon(sortState("measure", { colIndex: 0, vIndex: v }))
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(ResizeHandle, { onMouseDown: startResize(`v:${v}`) })
            ]
          },
          `mv-${spec.fieldId}-${v}`
        ))
      ] })
    ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      colFields.map((field, level) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        level === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
          Th,
          {
            sticky: stickyCol,
            rowSpan: headerRows,
            colSpan: labelCount,
            className: "border-r border-border/60 bg-muted/60 align-bottom",
            "data-tip": cornerTitle,
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => onSort("label"), className: "inline-flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 truncate", children: cornerText }),
              valueSpecs.length === 1 && !showLabels && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "shrink-0 text-[10px] font-medium text-muted-foreground", children: [
                "Values: ",
                measureLabel(valueSpecs[0], valueFields[0])
              ] }),
              sortIcon(sortState("label"))
            ] })
          }
        ),
        colCombos.map((combo, cIndex) => {
          const label = (combo.displayLabels ?? combo.labels)[level] ?? "(blank)";
          const prev = colCombos[cIndex - 1];
          if (prev && prev.labels[level] === combo.labels[level]) return null;
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            TableHead,
            {
              colSpan: countSpan(colCombos, cIndex, level) * valueCount,
              className: "border-r border-b border-border/60 bg-muted/50 text-center",
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  className: "inline-flex max-w-full items-center gap-1 truncate",
                  "data-tip": `Sort rows by ${label}`,
                  onClick: () => onSort("measure", { colIndex: cIndex, vIndex: 0 }),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: label }),
                    sortIcon(sortState("measure", { colIndex: cIndex, vIndex: 0 }))
                  ]
                }
              )
            },
            `hl-${combo.key}`
          );
        }),
        level === 0 && grandCols && /* @__PURE__ */ jsxRuntimeExports.jsx(
          TableHead,
          {
            colSpan: valueCount > 1 ? valueCount : void 0,
            rowSpan: !showLabels ? headerRows : void 0,
            className: "border-l border-border/60 bg-primary/10 text-right align-bottom",
            "data-tip": "Totals across every column",
            children: "Grand Total"
          }
        )
      ] }, field.id)),
      showLabels && /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "pivot-value-labels", children: [
        colCombos.flatMap(
          (combo, cIndex) => valueSpecs.map((spec, v) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            TableHead,
            {
              style: widthStyle(`m:${cIndex}:${v}`),
              className: "relative border-r border-border/60 bg-muted/40 text-right",
              "data-tip": `${measureLabel(spec, valueFields[v])}${combo.labels.length ? ` — ${combo.labels.map((l) => l ?? "(blank)").join(" · ")}` : ""}`,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    className: "inline-flex items-center",
                    onClick: () => onSort("measure", { colIndex: cIndex, vIndex: v }),
                    children: [
                      measureLabel(spec, valueFields[v]),
                      sortIcon(sortState("measure", { colIndex: cIndex, vIndex: v }))
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(ResizeHandle, { onMouseDown: startResize(`m:${cIndex}:${v}`) })
              ]
            },
            `m-${combo.key}-${v}`
          ))
        ),
        grandCols && valueSpecs.map((spec, v) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          TableHead,
          {
            style: widthStyle(`tot:${v}`),
            className: "relative border-l border-border/60 bg-primary/10 text-right align-bottom",
            "data-tip": `Grand Total — ${measureLabel(spec, valueFields[v])}`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  className: "inline-flex items-center",
                  onClick: () => onSort("total", { vIndex: v }),
                  children: [
                    AGG_LABELS[spec.agg],
                    sortIcon(sortState("total", { vIndex: v }))
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(ResizeHandle, { onMouseDown: startResize(`tot:${v}`) })
            ]
          },
          `tot-head-${v}`
        ))
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
      bodyRows.length === 0 && !grandRow && /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        TableCell,
        {
          colSpan: totalCols,
          className: "py-10 text-center text-muted-foreground",
          children: "No facilities match the current filters."
        }
      ) }),
      bodyRows.map((row, index) => {
        const prev = index > 0 ? bodyRows[index - 1] : null;
        const labels = displayLabels(row, prev);
        const isGroupRow = row.kind !== "leaf";
        const leafOnlyIndex = bodyRows.slice(0, index).filter((r) => r.kind === "leaf").length;
        const bg = rowBg(row, row.kind === "leaf" ? leafOnlyIndex : index);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { className: bg, children: [
          compact ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            TableCell,
            {
              colSpan: labelCount,
              className: cn(
                style.borders && "border-r border-border/50",
                stickyCol && "sticky left-0 z-10",
                bg || "bg-background"
              ),
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "div",
                {
                  className: "flex items-center gap-1.5",
                  style: { paddingLeft: row.depth * 14 },
                  children: [
                    isGroupRow && /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => onToggleCollapse(row.key),
                        "data-tip": row.collapsed ? "Expand group" : "Collapse group",
                        "aria-label": row.collapsed ? "Expand group" : "Collapse group",
                        "aria-expanded": !row.collapsed,
                        className: "rounded p-0.5 text-muted-foreground hover:bg-accent",
                        children: row.collapsed ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "size-3.5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "size-3.5" })
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: row.displayLabels?.[row.depth] ?? row.labels[row.depth] ?? rowFields[row.depth]?.blankLabel ?? "(blank)" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-1 shrink-0 text-[10px] tabular-nums text-muted-foreground", children: [
                      "(",
                      row.count,
                      ")"
                    ] })
                  ]
                }
              )
            }
          ) : isGroupRow ? (
            /* Subtotal rows: the parent levels keep their labels, then
               ONE cell seats "Total — <label>" and spans every
               row-label column from that level to the last — the
               first value cell therefore always starts under the
               first value header (same model as the exports). */
            rowFields.map((rf, i) => {
              if (i > row.depth) return null;
              const isOwn = i === row.depth;
              const span = isOwn ? labelCount - row.depth : 1;
              return /* @__PURE__ */ jsxRuntimeExports.jsx(
                TableCell,
                {
                  colSpan: span > 1 ? span : void 0,
                  className: cn(
                    "whitespace-nowrap",
                    style.borders && "border-r border-border/50",
                    isOwn && "font-semibold",
                    !isOwn && "font-medium",
                    stickyCol && i === 0 && "sticky left-0 z-10",
                    stickyCol && i === 0 && (bg ? bg : "bg-background")
                  ),
                  style: {
                    paddingLeft: (tabular ? 0 : i * 10) + 10,
                    ...widthStyle(`row:${rf.id}`, 120)
                  },
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
                    isOwn && /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => onToggleCollapse(row.key),
                        "data-tip": row.collapsed ? "Expand group" : "Collapse group",
                        "aria-expanded": !row.collapsed,
                        className: "rounded p-0.5 text-muted-foreground hover:bg-accent",
                        children: row.collapsed ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "size-3.5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "size-3.5" })
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isOwn ? `Total — ${labels[i] ?? rowFields[i]?.blankLabel ?? "(blank)"}` : labels[i] ?? "" })
                  ] })
                },
                rf.id
              );
            })
          ) : rowFields.map((rf, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            TableCell,
            {
              className: cn(
                "whitespace-nowrap",
                style.borders && "border-r border-border/50",
                i === 0 && "font-medium",
                stickyCol && i === 0 && "sticky left-0 z-10",
                stickyCol && i === 0 && (bg ? bg : "bg-background")
              ),
              style: { paddingLeft: (tabular ? 0 : i * 10) + 10, ...widthStyle(`row:${rf.id}`, 120) },
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
                isGroupRow && i === row.depth && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => onToggleCollapse(row.key),
                    "data-tip": row.collapsed ? "Expand group" : "Collapse group",
                    "aria-expanded": !row.collapsed,
                    className: "rounded p-0.5 text-muted-foreground hover:bg-accent",
                    children: row.collapsed ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "size-3.5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "size-3.5" })
                  }
                ),
                i === row.depth && labels[i] == null && !isGroupRow ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "italic text-muted-foreground", children: rowFields[i]?.blankLabel ?? "(blank)" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn(labels[i] == null && "relative"), children: labels[i] ?? "" }),
                !isGroupRow && i === row.depth && row.count > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "shrink-0 text-[10px] tabular-nums text-muted-foreground", children: [
                  "(",
                  row.count,
                  ")"
                ] })
              ] })
            },
            rf.id
          )),
          row.measures.map((cell, i) => {
            const colIndex = labelCount + i;
            const cIndex = Math.floor(i / valueCount);
            const v = i % valueCount;
            return measureCell(
              cell,
              i,
              colIndex,
              index,
              row,
              onCellClick ? () => onCellClick({ row, comboIndex: cIndex, valueIndex: v }) : void 0
            );
          }),
          grandCols && row.totals.map(
            (cell, v) => measureCell(
              cell,
              colCombos.length * valueCount + v,
              labelCount + colCombos.length * valueCount + v,
              index,
              row
            )
          )
        ] }, `${row.key}-${index}`);
      })
    ] }),
    grandRow && /* @__PURE__ */ jsxRuntimeExports.jsx(TableFooter, { className: "sticky bottom-0 z-20 border-t-2 border-border", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { className: "bg-primary/10 font-bold", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        TableCell,
        {
          colSpan: labelCount,
          className: cn(
            compact && "",
            stickyCol ? "sticky left-0 z-10 bg-primary/10" : "bg-primary/10",
            style.borders && "border-r border-border/50"
          ),
          children: rowFields.length > 0 ? "Grand Total" : ""
        }
      ),
      grandRow.measures.map((cell, i) => {
        const v = i % valueCount;
        const formatted = formatCell(
          cell,
          valueFields[v],
          valueSpecs[v],
          decimals
        );
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          TableCell,
          {
            className: cn(
              "text-right tabular-nums font-bold",
              style.borders && "border-r border-border/50",
              cell == null && "text-muted-foreground/70"
            ),
            children: formatted
          },
          `gfm-${i}`
        );
      }),
      grandCols && grandRow.totals.map((cell, v) => {
        const formatted = formatCell(
          cell,
          valueFields[v],
          valueSpecs[v],
          decimals
        );
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          TableCell,
          {
            className: cn(
              "text-right tabular-nums font-bold border-l border-border/60",
              cell == null && "text-muted-foreground/70"
            ),
            children: formatted
          },
          `gft-${v}`
        );
      })
    ] }) })
  ] }) });
}
function Th({
  sticky,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    TableHead,
    {
      ...props,
      className: cn(props.className, sticky && "sticky left-0 z-20 bg-muted/60")
    }
  );
}
function ResizeHandle({ onMouseDown }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      onMouseDown,
      "data-tip": "Drag to resize this column",
      className: "absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-primary/40"
    }
  );
}
function countSpan(combos, start, level) {
  const label = combos[start].labels[level];
  let n = 1;
  for (let i = start + 1; i < combos.length; i += 1) {
    if (combos[i].labels[level] !== label) break;
    n += 1;
  }
  return n;
}
function statusColumnIndexes(rowFields, result) {
  const ids = new Set(rowFields.map((f) => f.id));
  const out = /* @__PURE__ */ new Set();
  const labelCount = Math.max(rowFields.length, 1);
  const valueCount = Math.max(result.valueSpecs.length, 1);
  result.valueFields.forEach((f, v) => {
    if (f && STATUS_FIELD_ID_SET.has(f.id)) {
      for (let c = 0; c < result.colCombos.length; c += 1)
        out.add(labelCount + c * valueCount + v);
    }
  });
  rowFields.forEach((f, i) => ids.has(f.id) && out.delete(i));
  return out;
}
const STATUS_FIELD_ID_SET = /* @__PURE__ */ new Set([
  "pipelineStatus",
  "certStatus",
  "saStatus",
  "genDoc",
  "buildingStatus",
  "nocStatus",
  "eligibility",
  "recertStatus"
]);

function measureHeader(result, specIndex, comboIndex) {
  const spec = result.valueSpecs[specIndex];
  const field = result.valueFields[specIndex];
  const base = measureLabel(spec, field);
  if (comboIndex == null) return base;
  const combo = result.colCombos[comboIndex];
  const prefix = combo && combo.labels.length ? (combo.displayLabels ?? combo.labels).map((l) => l ?? "(No date)").join(" · ") : null;
  return prefix ? `${prefix} — ${base}` : base;
}
function roleFor(agg, field) {
  if (agg === "pctTotal" || agg === "count" || agg === "distinct" || agg === "sum" || agg === "avg")
    return "number";
  if (agg === "min" || agg === "max") {
    if (field?.type === "number") return "number";
    if (field?.type === "date") return "date";
  }
  return "text";
}
function buildExportTable(result, meta, opts) {
  const includeSubtotals = opts?.includeSubtotals ?? true;
  const includeGrandTotal = opts?.includeGrandTotal ?? true;
  const includeGrandColumn = opts?.includeGrandColumn ?? result.colFields.length > 0;
  const single = result.valueSpecs.length === 1;
  const model = buildPivotColumns(result, { grandTotalColumn: includeGrandColumn });
  const labelCount = model.filter((c) => c.kind === "label").length;
  const columns = model.map((c) => {
    if (c.kind === "label") {
      return { header: c.header, role: "label" };
    }
    if (c.kind === "value") {
      const v2 = c.valueIndex;
      const spec = result.valueSpecs[v2];
      return {
        header: single ? comboPrefix(result, c.comboIndex) ?? measureHeader(result, v2) : measureHeader(result, v2, c.comboIndex),
        role: roleFor(spec.agg, result.valueFields[v2])
      };
    }
    const v = c.valueIndex;
    return {
      header: single ? "Grand Total" : `Grand Total — ${measureHeader(result, v)}`,
      role: roleFor(result.valueSpecs[v].agg, result.valueFields[v])
    };
  });
  const valueCount = Math.max(result.valueSpecs.length, 1);
  const rows = [];
  for (const row of result.outRows) {
    if (row.kind === "subtotal" && !includeSubtotals) continue;
    if (row.kind === "grand" && !includeGrandTotal && rowFieldsExist(result)) continue;
    const cells = new Array(columns.length).fill(null);
    if (row.kind === "grand" && rowFieldsExist(result)) {
      cells[0] = "Grand Total";
      row.measures.forEach((cell, i) => {
        const m = labelCount + i;
        cells[m] = normalizeCell(cell, result.valueFields[Math.floor(i / valueCount)]);
      });
      if (includeGrandColumn)
        row.totals.forEach((cell, v) => {
          cells[labelCount + row.measures.length + v] = normalizeCell(
            cell,
            result.valueFields[v]
          );
        });
      rows.push({
        cells,
        kind: "grand",
        depth: 0,
        mergeFrom: 0,
        mergeSpan: labelCount,
        mergedLabel: "Grand Total"
      });
      continue;
    }
    result.rowFields.forEach((_f, i) => {
      if (row.kind === "subtotal") {
        if (i === row.depth) {
          cells[i] = `Total — ${row.displayLabels?.[row.depth] ?? row.labels[row.depth] ?? "(No date)"}`;
        } else if (i > row.depth) {
          cells[i] = null;
        } else {
          cells[i] = row.displayLabels?.[i] ?? row.labels[i] ?? "(blank)";
        }
        return;
      }
      const display = row.displayLabels?.[i] ?? row.labels[i];
      cells[i] = display ?? "(blank)";
    });
    row.measures.forEach((cell, i) => {
      const m = labelCount + i;
      cells[m] = normalizeCell(cell, result.valueFields[i % valueCount]);
    });
    if (includeGrandColumn)
      row.totals.forEach((cell, v) => {
        cells[labelCount + row.measures.length + v] = normalizeCell(
          cell,
          result.valueFields[v]
        );
      });
    rows.push({
      cells,
      kind: row.kind,
      depth: row.depth,
      ...row.kind === "subtotal" ? (() => {
        const mergeFrom = row.depth;
        const mergeSpan = labelCount - row.depth;
        const label = `Total — ${row.displayLabels?.[row.depth] ?? row.labels[row.depth] ?? "(No date)"}`;
        if (mergeSpan <= 1) cells[mergeFrom] = label;
        return { mergeFrom, mergeSpan, mergedLabel: label };
      })() : {}
    });
  }
  const numericCols = [];
  columns.forEach((c, i) => {
    if (c.role === "number") numericCols.push(i);
  });
  return {
    columns,
    rows,
    meta: {
      ...meta,
      generatedAt: meta.generatedAt ?? /* @__PURE__ */ new Date(),
      valuesCaption: single && result.colFields.length > 0 ? `Values: ${measureLabel(result.valueSpecs[0], result.valueFields[0])}` : null
    },
    numericCols
  };
}
function comboPrefix(result, comboIndex) {
  const combo = result.colCombos[comboIndex];
  if (!combo || combo.labels.length === 0) return null;
  return (combo.displayLabels ?? combo.labels).map((l) => l ?? "(No date)").join(" · ");
}
function rowFieldsExist(result) {
  return result.rowFields.length > 0;
}
function normalizeCell(cell, field) {
  if (cell == null) return null;
  if (typeof cell === "string" && /^\d{4}-\d{2}-\d{2}/.test(cell)) {
    const [y, m, d] = cell.slice(0, 10).split("-");
    return `${d}-${m}-${y}`;
  }
  if (field?.type === "date" && typeof cell === "string") return cell;
  return cell;
}
const exportStamp = (d = /* @__PURE__ */ new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const IND_FORMAT = (header) => {
  if (/% of Total/.test(header)) return '0.0"%";"-";"—"';
  if (/Average/.test(header)) return '#,##0.0;-#,##0.0;"—"';
  return '#,##0;-#,##0;"—"';
};
const BRAND = [13, 105, 96];
function planTotalGrouping(rows, measure) {
  const padding = {};
  let topRows = measure(padding);
  for (let pass = 0; pass < 8 && topRows.size > 0; pass += 1) {
    let changed = false;
    for (const idx of [...topRows].sort((a, b) => a - b)) {
      const subtotal = rows[idx];
      const prev = rows[idx - 1];
      if (!subtotal || subtotal.kind !== "subtotal" || !prev || prev.kind !== "leaf")
        continue;
      padding[idx - 1] = (padding[idx - 1] ?? 0) + 26;
      changed = true;
    }
    if (!changed) break;
    topRows = measure(padding);
  }
  return padding;
}
function buildPdfBody(table) {
  return table.rows.map((row) => {
    const out = [];
    for (let i = 0; i < table.columns.length; i += 1) {
      const withinMerge = row.mergeFrom != null && row.mergeSpan != null && i > row.mergeFrom && i < row.mergeFrom + row.mergeSpan;
      if (withinMerge) continue;
      const raw = row.cells[i];
      const text = raw == null ? "—" : String(raw);
      if (row.mergedLabel != null && i === row.mergeFrom && row.mergeSpan && row.mergeSpan > 1) {
        out.push({ content: row.mergedLabel, colSpan: row.mergeSpan });
        i += row.mergeSpan - 1;
        continue;
      }
      out.push(text);
    }
    return out;
  });
}
function exportPivotPdf(filename, table, opts) {
  const cols = table.columns.length;
  const orientation = !opts?.orientation || opts.orientation === "auto" ? cols > 6 ? "landscape" : "portrait" : opts.orientation;
  const doc = new E({
    orientation,
    unit: "pt",
    format: opts?.pageSize ?? "a4"
  });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = (opts?.marginsMm ?? 14) * 2.834;
  const usable = pageW - margin * 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...BRAND);
  doc.text(table.meta.title, margin, 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  let y = 52;
  doc.text(table.meta.subtitle, margin, y);
  y += 12;
  doc.text(
    `${table.meta.district} · Generated ${table.meta.generatedAt.toLocaleString()} · By ${table.meta.generatedBy}${table.meta.valuesCaption ? ` · ${table.meta.valuesCaption}` : ""}`,
    margin,
    y
  );
  let startY = y + 18;
  if (opts?.includeFiltersSummary !== false && table.meta.filters.length > 0) {
    doc.setFontSize(8);
    doc.setTextColor(70, 70, 70);
    const lines = doc.splitTextToSize(
      `Filters: ${table.meta.filters.join(" · ") || "None"}`,
      usable
    );
    doc.text(lines, margin, startY);
    startY += lines.length * 10 + 6;
  }
  if (opts?.chart && opts.chart.values.length > 0) {
    const chartDoc = doc;
    const { labels, values, title } = opts.chart;
    chartDoc.setFontSize(9);
    chartDoc.setTextColor(40, 40, 40);
    chartDoc.text(`Chart — ${title} (top groups)`, margin, startY + 8);
    const chartTop = startY + 16;
    const maxV = Math.max(...values, 1);
    const labelW = Math.min(110, usable * 0.3);
    const barMaxW = usable - labelW - 40;
    const barH = 11;
    const gap = 5;
    values.forEach((v, i) => {
      const yBar = chartTop + i * (barH + gap);
      const w = Math.max(2, v / maxV * barMaxW);
      chartDoc.setFontSize(7.5);
      chartDoc.setTextColor(60, 60, 60);
      const label = labels[i].length > 18 ? labels[i].slice(0, 17) + "…" : labels[i];
      chartDoc.text(label, margin, yBar + barH);
      chartDoc.setFillColor(...BRAND);
      chartDoc.rect(margin + labelW, yBar, w, barH, "F");
      chartDoc.setTextColor(30, 30, 30);
      chartDoc.text(
        v.toLocaleString("en-IN"),
        margin + labelW + w + 4,
        yBar + barH
      );
    });
    startY = chartTop + values.length * (barH + gap) + 8;
  }
  const pdfBody = buildPdfBody(table);
  const baseAtOptions = (paddedRows2) => ({
    head: [table.columns.map((c) => c.header)],
    body: pdfBody,
    startY,
    margin: { left: margin, right: margin, top: 56 },
    styles: {
      fontSize: 7.4,
      cellPadding: 3.2,
      overflow: "linebreak",
      valign: "middle",
      lineColor: [214, 220, 218],
      lineWidth: 0.3,
      minCellHeight: 13
    },
    headStyles: {
      fillColor: BRAND,
      textColor: 255,
      fontStyle: "bold",
      fontSize: 7.6,
      halign: "center",
      valign: "middle",
      lineWidth: 0
    },
    alternateRowStyles: { fillColor: [244, 248, 247] },
    columnStyles: table.columns.reduce(
      (acc, c, i) => {
        acc[i] = { halign: c.role === "number" ? "right" : "left" };
        return acc;
      },
      {}
    ),
    rowPageBreak: "avoid",
    // a row is never split across pages
    showHead: "everyPage",
    // header repeats on every page
    didParseCell: (data) => {
      if (data.section !== "body") return;
      const kind = table.rows[data.row.index]?.kind;
      if (kind === "subtotal") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [233, 244, 242];
        data.cell.styles.lineWidth = {
          top: 0.6,
          left: 0.3,
          right: 0.3,
          bottom: 0.3
        };
      } else if (kind === "grand") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [214, 234, 231];
      }
      const pad = paddedRows2[data.row.index];
      if (pad) data.cell.styles.minCellHeight += pad;
    }
  });
  const paddedRows = planTotalGrouping(table.rows, (padding) => {
    const scratch = new E({
      orientation,
      unit: "pt",
      format: opts?.pageSize ?? "a4"
    });
    const topRows = /* @__PURE__ */ new Set();
    const seenPages = /* @__PURE__ */ new Set();
    autoTable(scratch, {
      ...baseAtOptions(padding),
      didDrawCell: (data) => {
        if (data.section !== "body" || !data.pageNumber) return;
        if (!seenPages.has(data.pageNumber)) {
          seenPages.add(data.pageNumber);
          topRows.add(data.row.index);
        }
      }
    });
    return topRows;
  });
  autoTable(doc, {
    ...baseAtOptions(paddedRows),
    didDrawPage: (data) => {
      const pageH = doc.internal.pageSize.getHeight();
      const no = data.pageNumber ?? 1;
      if (no > 1) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...BRAND);
        doc.text(table.meta.title, margin, 30);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(90, 90, 90);
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      const footY = pageH - 18;
      doc.text("NQAS Tracker", margin, footY);
      doc.text(table.meta.generatedAt.toLocaleString(), pageW / 2, footY, {
        align: "center"
      });
      if (opts?.showPageNumbers !== false)
        doc.text(`Page ${no}`, pageW - margin, footY, { align: "right" });
    }
  });
  doc.save(filename);
}
const ARB = {
  brand: "FF0D6960",
  band: "FFF4F8F7",
  subtotalRow: "FFE8F4F2",
  grandRow: "FFC7DFDA",
  border: "FFB8C6C3",
  hair: "FFE2E7E5",
  grey: "FF6B7280"
};
const thin = { style: "thin", color: { argb: ARB.border } };
const cellBorder = {
  top: { style: "hair", color: { argb: ARB.hair } },
  bottom: thin,
  left: { style: "hair", color: { argb: ARB.hair } },
  right: { style: "hair", color: { argb: ARB.hair } }
};
async function exportPivotExcel(filename, table, raw, opts) {
  const wb = new ExcelJS.Workbook();
  wb.creator = table.meta.generatedBy;
  wb.created = table.meta.generatedAt;
  const labelCount = table.columns.filter((c) => c.role === "label").length;
  const valueCount = Math.max(
    table.columns.filter((c) => c.header.startsWith("Grand Total")).length || table.columns.length - labelCount,
    1
  );
  const width = Math.max(table.columns.length, 2);
  const ws = wb.addWorksheet("Report", {
    views: [{ state: "frozen", xSplit: labelCount, ySplit: 5 }],
    pageSetup: {
      paperSize: opts?.pageSize === "a3" ? 8 : opts?.pageSize === "legal" ? 5 : 9,
      orientation: opts?.orientation ?? "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true
    }
  });
  const merge = (row, text, font) => {
    ws.mergeCells(row, 1, row, width);
    const cell = ws.getCell(row, 1);
    cell.value = text;
    if (font) cell.font = { size: 10, ...font };
    return cell;
  };
  merge(1, table.meta.title, {
    bold: true,
    size: 16,
    color: { argb: ARB.brand }
  });
  merge(2, `${table.meta.subtitle} · ${table.meta.district}${table.meta.valuesCaption ? ` · ${table.meta.valuesCaption}` : ""}`, {
    color: { argb: ARB.grey }
  });
  merge(
    3,
    `Generated by ${table.meta.generatedBy} on ${table.meta.generatedAt.toLocaleString()}`,
    { color: { argb: ARB.grey } }
  );
  let rowNow = 4;
  if (table.meta.filters.length > 0) {
    const c = merge(4, `Filters: ${table.meta.filters.join(" · ")}`, {
      italic: true,
      color: { argb: "FF374151" }
    });
    c.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: ARB.subtotalRow }
    };
    rowNow = 5;
  }
  const headerRowIndex = rowNow + 1;
  const header = ws.getRow(headerRowIndex);
  header.values = table.columns.map((c) => c.header);
  header.height = 30;
  header.eachCell((cell, col) => {
    const role = table.columns[col - 1]?.role;
    cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARB.brand } };
    cell.alignment = {
      vertical: "middle",
      wrapText: true,
      horizontal: role === "number" ? "right" : role === "date" ? "center" : "left"
    };
    cell.border = { top: thin, bottom: thin, left: thin, right: thin };
  });
  const groupRange = (rows, i) => {
    const row = rows[i];
    const depth = row.kind === "grand" ? 0 : row.mergeFrom ?? 0;
    if (i === 0) return null;
    let j = i - 1;
    let start = i - 1;
    while (j >= 0) {
      const cand = rows[j];
      if (cand.kind === "grand") break;
      const sameSubtree = depth === 0 || cellsEqual(cand.cells.slice(0, depth), row.cells.slice(0, depth));
      if (!sameSubtree) break;
      start = j;
      j -= 1;
    }
    if (i === 0 || start >= i) return null;
    return [start, i - 1];
  };
  const cellsEqual = (a, b) => a.length === b.length && a.every((v, k2) => (v ?? null) === (b[k2] ?? null));
  const isPlainSum = (header2) => !/Average|% of Total/.test(header2);
  table.rows.forEach((row, idx) => {
    const r = ws.getRow(headerRowIndex + 1 + idx);
    row.cells.forEach((c, k) => {
      const cell = r.getCell(k + 1);
      if (c != null) cell.value = c;
    });
    const isTotal = row.kind !== "leaf";
    for (let col = 1; col <= width; col += 1) {
      const cell = r.getCell(col);
      const column = table.columns[col - 1];
      cell.border = isTotal ? {
        top: thin,
        bottom: row.kind === "grand" ? thin : { style: "hair", color: { argb: ARB.hair } },
        left: { style: "hair", color: { argb: ARB.hair } },
        right: { style: "hair", color: { argb: ARB.hair } }
      } : cellBorder;
      cell.alignment = {
        vertical: "middle",
        wrapText: true,
        horizontal: column?.role === "number" ? "right" : column?.role === "date" ? "center" : "left"
      };
      if (column?.role === "number" && typeof cell.value === "number")
        cell.numFmt = IND_FORMAT(column.header);
      if (isTotal) {
        cell.font = row.kind === "grand" ? { bold: true, size: 10, color: { argb: "FFFFFFFF" } } : { bold: true, size: 10 };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: row.kind === "grand" ? ARB.grandRow : ARB.subtotalRow }
        };
      } else if (idx % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARB.band } };
      }
    }
    if ((row.mergeFrom ?? 0) < labelCount) {
      const col = (row.mergeFrom ?? 0) + 1;
      if ((row.mergeSpan ?? 1) > 1) {
        ws.mergeCells(headerRowIndex + 1 + idx, col, headerRowIndex + 1 + idx, labelCount);
        if (row.mergedLabel != null)
          r.getCell(col).value = row.mergedLabel;
      }
    }
    if (row.kind === "leaf") {
      const depth = row.depth ?? 0;
      r.outlineLevel = Math.min(depth + 1, 8);
    } else if (row.kind === "subtotal") {
      const depth = row.mergeFrom ?? 0;
      r.outlineLevel = Math.min(depth, 8);
    }
    if (isTotal) {
      const range = groupRange(table.rows, idx);
      table.numericCols.forEach((c) => {
        const raw2 = row.cells[c];
        if (typeof raw2 !== "number") return;
        const head = table.columns[c].header;
        if (!isPlainSum(head)) return;
        const cell = r.getCell(c + 1);
        if (row.kind === "grand") {
          if (range) {
            cell.value = {
              formula: `SUBTOTAL(9,${ws.getCell(headerRowIndex + 1 + range[0], c + 1).address}:${ws.getCell(headerRowIndex + 1 + range[1], c + 1).address})`,
              result: raw2
            };
          }
        } else {
          const grandColStart = table.columns.findIndex(
            (col, k) => k >= labelCount && col.header.startsWith("Grand Total")
          );
          const isGrandCol = grandColStart >= 0 && c >= grandColStart;
          if (isGrandCol) {
            const v = c - grandColStart;
            const addr = [];
            const comboCount = Math.max(
              Math.floor(
                (grandColStart - labelCount) / Math.max(valueCount, 1)
              ),
              1
            );
            for (let combo = 0; combo < comboCount; combo += 1) {
              addr.push(
                ws.getCell(
                  headerRowIndex + 1 + idx,
                  labelCount + combo * valueCount + v + 1
                ).address
              );
            }
            if (addr.length > 1)
              cell.value = { formula: `SUM(${addr.join(",")})`, result: raw2 };
          } else if (range) {
            cell.value = {
              formula: `SUBTOTAL(9,${ws.getCell(headerRowIndex + 1 + range[0], c + 1).address}:${ws.getCell(headerRowIndex + 1 + range[1], c + 1).address})`,
              result: raw2
            };
          }
        }
      });
    }
  });
  ws.autoFilter = {
    from: { row: headerRowIndex, column: 1 },
    to: { row: headerRowIndex + table.rows.length, column: width }
  };
  table.columns.forEach((column, col) => {
    let longest = column.header.length / 2 + 2;
    for (const row of table.rows) {
      const v = row.cells[col];
      const len = v == null ? 0 : String(v).length;
      if (len > longest) longest = len;
    }
    ws.getColumn(col + 1).width = Math.min(46, Math.max(9, Math.round(longest + 2)));
  });
  ws.headerFooter = {
    oddFooter: `&L NQAS Tracker &C Generated ${exportStamp(table.meta.generatedAt)} &R Report ID ${reportIdOf(table)} · Page &P of &N`
  };
  if (width >= 2) {
    ws.pageSetup.margins = {
      left: 0.4,
      right: 0.4,
      top: 0.6,
      bottom: 0.6,
      header: 0.2,
      footer: 0.2
    };
  }
  if (opts?.includeFacilityDataSheet !== false && raw.cells.length > 0) {
    const wsRaw = wb.addWorksheet("Facility Data", {
      views: [{ state: "frozen", ySplit: 1 }],
      pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 }
    });
    const hr = wsRaw.getRow(1);
    hr.values = raw.headers;
    hr.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    hr.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARB.brand } };
    hr.alignment = { vertical: "middle", wrapText: true, horizontal: "center" };
    hr.height = 24;
    raw.cells.forEach((cells, i) => {
      wsRaw.getRow(i + 2).values = cells.map((c) => c == null ? "" : c);
    });
    raw.headers.forEach((h, i) => {
      let longest = h.length;
      for (const cells of raw.cells) {
        const len = String(cells[i] ?? "").length;
        if (len > longest) longest = len;
      }
      wsRaw.getColumn(i + 1).width = Math.min(40, Math.max(9, longest + 2));
    });
    wsRaw.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1 + raw.cells.length, column: Math.max(raw.headers.length, 1) }
    };
  }
  const wsInfo = wb.addWorksheet("Report Info", {
    pageSetup: { orientation: "portrait", fitToPage: true, fitToWidth: 1 }
  });
  wsInfo.columns = [{ width: 28 }, { width: 90 }];
  const infoRows = [
    ["Report title", table.meta.title],
    ["Subtitle", table.meta.subtitle],
    ["District", table.meta.district],
    ["Generated by", table.meta.generatedBy],
    ["Generated at", table.meta.generatedAt.toLocaleString()],
    ["Facilities in scope", String(raw.cells.length)],
    ["Report rows", String(table.rows.length)],
    ["Columns", String(table.columns.length)],
    ...table.meta.filters.map(
      (flt, i) => [`Filter ${i + 1}`, flt]
    )
  ];
  infoRows.forEach(([k, v], i) => {
    const row = wsInfo.getRow(i + 1);
    row.getCell(1).value = k;
    row.getCell(1).font = { bold: true, size: 10 };
    row.getCell(2).value = v;
    row.getCell(2).font = { size: 10 };
    row.getCell(2).alignment = { wrapText: true, vertical: "top" };
  });
  const buffer = await wb.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], { type: "application/octet-stream" }),
    filename
  );
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
function reportIdOf(table) {
  const d = table.meta.generatedAt;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}
function buildRawFacilityGrid(rows) {
  const headers = [
    "Facility",
    "Type",
    "Block",
    "PHC",
    "Eligibility",
    // Read from the config so the "Facility Data" sheet matches every other
    // surface (this column used to be printed as "Pipeline status").
    FACILITY_CURRENT_STATUS_LABEL,
    "SA score %",
    "Certified score %",
    "Validity ends",
    "Gap Closure Amount"
  ];
  const cells = rows.map((r) => [
    r.facility.name,
    r.facility.facilityType,
    r.facility.block,
    r.facility.phc,
    r.facility.eligibility ?? "",
    r.facility.currentStatus,
    r.sa?.scorePercent ?? null,
    r.nqas?.scorePercent ?? null,
    r.nqas?.validityDate ? isoDate(r.nqas.validityDate) : null,
    r.fund?.amountSanctioned ?? null
  ]);
  return { headers, cells };
}
function isoDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

const FORMAT_META = {
  pdf: { icon: FileText, label: "PDF", hint: "Print-ready, vector text, repeats headers" },
  xlsx: { icon: FileSpreadsheet, label: "Excel (.xlsx)", hint: "3 sheets, formulas, freeze panes" },
  csv: { icon: File, label: "CSV", hint: "UTF-8 with BOM for Excel" }
};
function ExportDialog({
  open,
  onOpenChange,
  result,
  rawRows,
  filtersList,
  chart,
  defaultTitle,
  defaultSubtitle,
  defaultDistrict,
  defaultGeneratedBy,
  initialFormat
}) {
  const [o, setO] = reactExports.useState({
    format: "pdf",
    title: defaultTitle,
    subtitle: defaultSubtitle,
    district: defaultDistrict,
    generatedBy: defaultGeneratedBy,
    orientation: "auto",
    pageSize: "a4",
    marginsMm: 14,
    includeSubtotals: true,
    includeGrandTotal: true,
    includeFiltersSummary: true,
    includeChart: false,
    showPageNumbers: true
  });
  const [busy, setBusy] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!open || !initialFormat) return;
    setO((prev) => ({ ...prev, format: initialFormat }));
  }, [open, initialFormat]);
  const table = reactExports.useMemo(
    () => buildExportTable(
      result,
      {
        title: o.title || defaultTitle,
        subtitle: o.subtitle || defaultSubtitle,
        district: o.district,
        generatedBy: o.generatedBy,
        filters: filtersList
      },
      { includeSubtotals: o.includeSubtotals, includeGrandTotal: o.includeGrandTotal }
    ),
    [result, o, filtersList, defaultTitle, defaultSubtitle]
  );
  const previewCols = table.columns.slice(0, 8);
  const previewRows = table.rows.slice(0, 7);
  const run = async () => {
    setBusy(true);
    try {
      const stamp = exportStamp();
      const safeTitle = (o.title || defaultTitle).replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 40);
      if (o.format === "pdf") {
        exportPivotPdf(`${safeTitle}-${stamp}.pdf`, table, {
          orientation: o.orientation,
          pageSize: o.pageSize,
          marginsMm: o.marginsMm,
          showPageNumbers: o.showPageNumbers,
          includeFiltersSummary: o.includeFiltersSummary,
          chart: o.includeChart && chart ? chart : null
        });
      } else if (o.format === "xlsx") {
        await exportPivotExcel(
          `${safeTitle}-${stamp}.xlsx`,
          table,
          buildRawFacilityGrid(rawRows),
          { pageSize: o.pageSize, orientation: o.orientation === "portrait" ? "portrait" : "landscape" }
        );
      } else {
        downloadCsv(
          `${safeTitle}-${stamp}.csv`,
          toCsv(
            table.columns.map((c) => c.header),
            table.rows.map((r) => r.cells)
          )
        );
      }
      onOpenChange(false);
      toast.success(`${FORMAT_META[o.format].label} downloaded`);
    } catch (err) {
      console.error(err);
      toast.error("Export failed — try a smaller report or another format.");
    } finally {
      setBusy(false);
    }
  };
  const set = (patch) => setO((prev) => ({ ...prev, ...patch }));
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-h-[92vh] overflow-y-auto sm:max-w-3xl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Export settings" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "Everything below is written into the file — check the live preview, then download." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-5 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "mb-1 block text-xs font-semibold", children: "Format" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-3 gap-1.5", children: Object.keys(FORMAT_META).map((fmt) => {
            const meta = FORMAT_META[fmt];
            const Icon = meta.icon;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                "data-tip": meta.hint,
                "aria-pressed": o.format === fmt,
                onClick: () => set({ format: fmt }),
                className: cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg border px-1 py-2 text-[11px] font-semibold transition-colors",
                  o.format === fmt ? "border-primary bg-primary/10 text-primary" : "border-border/60 hover:bg-accent"
                ),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "size-4" }),
                  meta.label
                ]
              },
              fmt
            );
          }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Report title", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            value: o.title,
            onChange: (e) => set({ title: e.target.value }),
            className: "h-9 text-sm",
            placeholder: defaultTitle
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Subtitle", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            value: o.subtitle,
            onChange: (e) => set({ subtitle: e.target.value }),
            className: "h-9 text-sm",
            placeholder: defaultSubtitle
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "District / State", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            value: o.district,
            onChange: (e) => set({ district: e.target.value }),
            className: "h-9 text-sm"
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Generated by", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            value: o.generatedBy,
            onChange: (e) => set({ generatedBy: e.target.value }),
            className: "h-9 text-sm"
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3 gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Orientation", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: o.orientation, onValueChange: (v) => set({ orientation: v }), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-9 text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "auto", children: "Auto" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "portrait", children: "Portrait" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "landscape", children: "Landscape" })
            ] })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Page size", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: o.pageSize, onValueChange: (v) => set({ pageSize: v }), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-9 text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "a4", children: "A4" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "a3", children: "A3" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "legal", children: "Legal" })
            ] })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Margin", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: String(o.marginsMm), onValueChange: (v) => set({ marginsMm: Number(v) }), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-9 text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "6", children: "Narrow (6mm)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "10", children: "Normal (10mm)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "14", children: "Wide (14mm)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "20", children: "Wide+ (20mm)" })
            ] })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold text-muted-foreground", children: "Include" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            SwitchRow,
            {
              checked: o.includeSubtotals,
              onChange: (v) => set({ includeSubtotals: v }),
              label: "Subtotal rows"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            SwitchRow,
            {
              checked: o.includeGrandTotal,
              onChange: (v) => set({ includeGrandTotal: v }),
              label: "Grand total row"
            }
          ),
          o.format === "pdf" && /* @__PURE__ */ jsxRuntimeExports.jsx(
            SwitchRow,
            {
              checked: o.includeFiltersSummary,
              onChange: (v) => set({ includeFiltersSummary: v }),
              label: "Filters summary in header"
            }
          ),
          o.format === "pdf" && /* @__PURE__ */ jsxRuntimeExports.jsx(
            SwitchRow,
            {
              checked: o.includeChart,
              onChange: (v) => set({ includeChart: v }),
              label: "Quick chart (top rows)"
            }
          ),
          o.format === "pdf" && /* @__PURE__ */ jsxRuntimeExports.jsx(
            SwitchRow,
            {
              checked: o.showPageNumbers,
              onChange: (v) => set({ showPageNumbers: v }),
              label: "Page numbers in footer"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-1.5 text-xs font-semibold text-muted-foreground", children: "Live preview" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-white p-4 text-slate-900 shadow-inner dark:bg-slate-950 dark:text-slate-200", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[15px] font-bold text-teal-800 dark:text-teal-400", children: o.title || defaultTitle }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-[11px] text-slate-600 dark:text-slate-400", children: o.subtitle || defaultSubtitle }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[11px] text-slate-600 dark:text-slate-400", children: [
            o.district,
            " · Generated ",
            (/* @__PURE__ */ new Date()).toLocaleString(),
            " · By ",
            o.generatedBy || "—"
          ] }),
          o.includeFiltersSummary && filtersList.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1.5 rounded bg-teal-50 px-2 py-1 text-[10.5px] text-teal-900 dark:bg-teal-500/10 dark:text-teal-200", children: [
            "Filters: ",
            filtersList.join(" · ")
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 overflow-hidden rounded border border-slate-300 dark:border-slate-700", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full border-collapse text-[10px]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              previewCols.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                "th",
                {
                  className: "bg-teal-700 px-1.5 py-1 text-left font-semibold text-white",
                  children: c.header
                },
                c.header
              )),
              table.columns.length > 8 && /* @__PURE__ */ jsxRuntimeExports.jsxs("th", { className: "bg-teal-700 px-1.5 py-1 text-left font-semibold text-white", children: [
                "…",
                table.columns.length - 8,
                " more"
              ] })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
              previewRows.map((row, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "tr",
                {
                  className: cn(
                    row.kind !== "leaf" && "font-bold",
                    row.kind !== "leaf" && "bg-teal-50 dark:bg-teal-500/15",
                    row.kind === "leaf" && i % 2 === 1 && "bg-slate-50 dark:bg-slate-900"
                  ),
                  children: [
                    previewCols.map((c, j) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "td",
                      {
                        className: cn(
                          "border-t border-slate-200 px-1.5 py-1",
                          c.role === "number" && "text-right tabular-nums",
                          row.kind !== "leaf" && "font-semibold"
                        ),
                        children: row.cells[j] == null ? "" : String(row.cells[j])
                      },
                      j
                    )),
                    table.columns.length > 8 && /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "border-t border-slate-200 px-1.5 py-1", children: "…" })
                  ]
                },
                i
              )),
              table.rows.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "td",
                {
                  colSpan: previewCols.length + (table.columns.length > 8 ? 1 : 0),
                  className: "border-t border-slate-200 py-3 text-center italic text-slate-500",
                  children: "No rows in the current report."
                }
              ) })
            ] })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-2 text-center text-[10px] text-slate-500 dark:text-slate-500", children: [
            o.showPageNumbers ? "Page 1" : "",
            " · NQAS Tracker ·",
            " ",
            table.rows.length,
            " rows ·",
            " ",
            o.pageSize.toUpperCase(),
            " ",
            o.orientation === "auto" ? table.columns.length > 6 ? "landscape" : "portrait" : o.orientation,
            " ",
            o.marginsMm,
            "mm margins"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-2 text-[11px] leading-snug text-muted-foreground", children: [
          result.filteredCount,
          " of ",
          result.totalCount,
          " facilities ·",
          " ",
          table.rows.length,
          " export rows · ",
          table.columns.length,
          " columns.",
          o.format === "pdf" && (table.columns.length > 6 || o.orientation === "landscape") && " Landscape is selected automatically for wide tables.",
          chart && o.format === "pdf" && o.includeChart && ` Chart: ${chart.labels.length} top groups.`
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), children: "Cancel" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: () => void run(), disabled: busy, className: "gap-2", children: [
        busy ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin" }) : null,
        "Download ",
        FORMAT_META[o.format].label
      ] })
    ] })
  ] }) });
}
function Field({ label, children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "mb-1 block text-xs font-semibold", children: label }),
    children
  ] });
}
function SwitchRow({
  checked,
  onChange,
  label
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex min-h-9 cursor-pointer items-center justify-between gap-2 text-sm", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { checked, onCheckedChange: onChange })
  ] });
}

export { AGG_LABELS as A, ExportDialog as E, PivotTable as P, applyDateLabelOptions as a, buildPivot as b, createPivotFields as c, defaultPivotConfig as d, distinctValues as e, fieldBlankCounts as f, defaultAggFor as g, allowedAggs as h, pivotCounter as i, pivotDrilldown as j, prunePivotConfig as p, statusColumnIndexes as s };
