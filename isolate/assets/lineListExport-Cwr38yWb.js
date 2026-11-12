import { b as buildingBucketOf, B as BUILDING_BUCKET_ORDER } from './buildingBuckets-CQds7ysI.js';
import { c3 as daysUntil, cb as documentsStatusReportOf, p as docStageLabel, cc as surveillanceVisits, c5 as iaCompareOf, cd as cellValue, k as cellText, G as toDdMmmYyyy, c9 as iaScoreOf, C as COLUMN_BY_KEY, ce as formatInr } from './AppShell-CP099uvN.js';
import { s as sortMasterRows, n as nocStatusOf } from './masterFilter-DrauVhuN.js';
import { a as attentionFor } from './facilityQuickView-BCxVjMPj.js';
import { t as todayLocalIso } from './today-D9v8Esj5.js';
import { b as exportMasterCsv, c as exportLineListPdf, e as exportMasterWorkbook } from './masterExport-Dlb4N-po.js';
import { o as openMasterPrint } from './masterReportPrint-CpdXQQkg.js';

const hasText = (v) => !!v && String(v).trim() !== "";
function isBlankLink(row, key) {
  const v = cellValue(row, key);
  if (v.kind === "link") return !v.url && !v.attachmentId && !v.name;
  if (v.kind === "empty") return true;
  return false;
}
function hasNocRecord(row) {
  const n = row.noc;
  return !!(n && (hasText(n.nocAvailable) || hasText(n.status) || hasText(n.issuedDate) || hasText(n.expiryDate) || hasText(n.nocLink) || hasText(n.nocAttachmentId)));
}
function certStageOf(row) {
  return (row.nqas?.certificationStatus ?? "").toLowerCase();
}
function isCertifiedLike(row) {
  const s = certStageOf(row);
  return s.startsWith("quality certified") || s === "certified" || s.startsWith("conditional");
}
function visitStateOf(row, which, today = todayLocalIso()) {
  const done = which === "surv1" ? row.nqas?.surveillanceDone1 : row.nqas?.surveillanceDone2;
  if (done && done > today) return "flagged";
  const visits = surveillanceVisits(
    row.nqas ?? null,
    null,
    today
  );
  const v = visits.find((x) => x.key === which);
  return v?.state ?? "notApplicable";
}
function reportGroupOf(row) {
  const v = documentsStatusReportOf(
    row.sa?.generalDocStatus,
    row.facility.documentsStatusReport,
    row.nqas?.certificationStatus
  );
  if (!v) return "";
  return v === "Result Declared" ? v : docStageLabel(v);
}
const amountOf = (row) => row.fund?.amountSanctioned ?? null;
function testRow(row, test, today = todayLocalIso()) {
  const sep = test.indexOf(":");
  const id = sep === -1 ? test : test.slice(0, sep);
  const param = sep === -1 ? "" : test.slice(sep + 1);
  const num = Number(param);
  const todayDate = new Date(today);
  switch (id) {
    case "filter.any":
      return true;
    /* Fire NOC ------------------------------------------------------------- */
    case "noc.status":
      return nocStatusOf(row, today).toLowerCase() === param.toLowerCase();
    case "noc.expiring": {
      const d = daysUntil(row.noc?.expiryDate ?? null, todayDate);
      return d != null && d >= 0 && d <= num;
    }
    case "noc.expired": {
      const d = daysUntil(row.noc?.expiryDate ?? null, todayDate);
      return d != null && d < 0;
    }
    case "noc.noValidity":
      return hasNocRecord(row) && !row.noc?.expiryDate;
    case "noc.notRecorded":
      return !hasNocRecord(row);
    case "noc.attention": {
      const s = nocStatusOf(row);
      return s === "Expired" || s === "Not Obtained" || s === "Expiring Soon";
    }
    /* Documents ------------------------------------------------------------ */
    case "doc.missing":
      return isBlankLink(row, param);
    case "doc.present":
      return !isBlankLink(row, param);
    case "docs.requiredMissing":
      return (row.docs?.requiredMissing?.length ?? 0) > 0;
    case "docs.below": {
      const uploaded = row.docs?.uploaded ?? 0;
      return uploaded < num;
    }
    /* Building ------------------------------------------------------------- */
    case "building.bucket":
      return buildingBucketOf(row.building?.buildingStatus) === param;
    case "building.repair": {
      const b = buildingBucketOf(row.building?.buildingStatus);
      return b === "Needs Repair" || b === "M&R Work";
    }
    /* Gap Closure Fund ----------------------------------------------------- */
    case "gap.hasAmount": {
      const a = amountOf(row);
      return a != null && a > 0;
    }
    case "gap.noAmount": {
      const a = amountOf(row);
      return a == null || a <= 0;
    }
    case "gap.amountNoDoc": {
      const a = amountOf(row);
      return a != null && a > 0 && isBlankLink(row, "procLink");
    }
    case "gap.certifiedWithFunds": {
      const a = amountOf(row);
      return a != null && a > 0 && isCertifiedLike(row);
    }
    /* NQAS certification --------------------------------------------------- */
    case "cert.status":
      return certStageOf(row) === param.toLowerCase();
    case "cert.expiring": {
      const d = daysUntil(row.nqas?.validityDate ?? null, todayDate);
      return d != null && d >= 0 && d <= num;
    }
    case "cert.expired": {
      const d = daysUntil(row.nqas?.validityDate ?? null, todayDate);
      return d != null && d < 0;
    }
    case "cert.resultDocMissing":
      return isCertifiedLike(row) && !row.resultDocumentId;
    /* State Assessment ----------------------------------------------------- */
    case "sa.status":
      return (row.sa?.status ?? "").toLowerCase() === param.toLowerCase();
    case "filter.assessor1.empty":
      return !hasText(row.sa?.assessor1Name);
    /* Internal Assessment -------------------------------------------------- */
    case "ia.below": {
      const scores = [
        currentNqasIa(row),
        currentKayakalpIa(row)
      ].filter((x) => x != null);
      return scores.length > 0 && Math.min(...scores) < num;
    }
    case "ia.declined":
      return (nqasIaCompare(row) ?? 0) < 0 || (kayakalpIaCompare(row) ?? 0) < 0;
    case "ia.notReported":
      return currentNqasIa(row) == null && previousNqasIa(row) == null && currentKayakalpIa(row) == null && previousKayakalpIa(row) == null;
    /* Surveillance --------------------------------------------------------- */
    case "visit.done":
      return visitStateOf(row, param === "surv2" ? "surv2" : "surv1", today) === "done";
    case "visit.open": {
      const s = visitStateOf(row, param === "surv2" ? "surv2" : "surv1", today);
      return s === "overdue" || s === "dueSoon";
    }
    case "visit.overdue":
      return visitStateOf(row, "surv1", today) === "overdue" || visitStateOf(row, "surv2", today) === "overdue";
    case "visit.futureDone": {
      const d1 = row.nqas?.surveillanceDone1 ?? null;
      const d2 = row.nqas?.surveillanceDone2 ?? null;
      return !!d1 && d1 > today || !!d2 && d2 > today;
    }
    case "recert.due": {
      const d = daysUntil(row.nqas?.validityDate ?? null, todayDate);
      if (d != null) return d <= 365;
      const s = (row.nqas?.recertStatus ?? "").toLowerCase();
      return hasText(s) && !s.includes("not due");
    }
    /* SaQsham -------------------------------------------------------------- */
    case "saqsham.resultDeclared":
      return reportGroupOf(row).toLowerCase() === "result declared";
    case "saqsham.notStarted": {
      const s = reportGroupOf(row).toLowerCase();
      return s === "" || s.startsWith("not started");
    }
    case "saqsham.updatedThisMonth": {
      const t = row.facility.updatedAt;
      if (!t) return false;
      const now = new Date(today);
      const d = new Date(t);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    default:
      return true;
  }
}
function currentNqasIa(row) {
  return row.iaq ? iaScore(row, "nqas") : row.facility.nqasIaQ2 ?? null;
}
function previousNqasIa(row) {
  return row.facility.nqasIaQ1 ?? null;
}
function currentKayakalpIa(row) {
  return row.iaq ? iaScore(row, "kayakalp") : row.facility.kayakalpIaQ2 ?? null;
}
function previousKayakalpIa(row) {
  return row.facility.kayakalpIaQ1 ?? null;
}
function iaScore(row, which) {
  const iaq = row.iaq;
  if (!iaq) return null;
  return iaScoreOf(iaq, which, iaq.pair.current);
}
function nqasIaCompare(row) {
  return row.iaq ? iaCompareOf(row.iaq, "nqas") : cellValue(row, "nqasIaCmp").kind === "compare" ? cellValue(row, "nqasIaCmp").value : null;
}
function kayakalpIaCompare(row) {
  return row.iaq ? iaCompareOf(row.iaq, "kayakalp") : cellValue(row, "kayakalpIaCmp").kind === "compare" ? cellValue(row, "kayakalpIaCmp").value : null;
}
const FILTER_OPERATORS = [
  { id: "is", label: "is" },
  { id: "isNot", label: "is not" },
  { id: "in", label: "in (comma separated)" },
  { id: "contains", label: "contains" },
  { id: "between", label: "between" },
  { id: "before", label: "before" },
  { id: "after", label: "after" },
  { id: "isEmpty", label: "is empty" },
  { id: "isNotEmpty", label: "is not empty" }
];
const norm = (v) => String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ");
function compareValues(a, b) {
  const na = Number(a.replace(/[₹,%\s]/g, ""));
  const nb = Number(b.replace(/[₹,%\s]/g, ""));
  if (Number.isFinite(na) && Number.isFinite(nb) && a.trim() !== "" && b.trim() !== "") {
    return na - nb;
  }
  const da = Date.parse(a);
  const db = Date.parse(b);
  if (Number.isFinite(da) && Number.isFinite(db)) return da - db;
  return null;
}
function clauseMatches(row, clause) {
  const text = cellText(row, clause.key);
  const t = norm(text);
  const v = norm(clause.value);
  switch (clause.op) {
    case "is":
      return t === v;
    case "isNot":
      return t !== v;
    case "in":
      return clause.value.split(",").map(norm).filter(Boolean).includes(t);
    case "contains":
      return v === "" ? true : t.includes(v);
    case "between": {
      const lo = compareValues(text, clause.value);
      const hi = compareValues(text, clause.value2 ?? "");
      if (lo == null || hi == null) return false;
      return lo >= 0 && hi <= 0;
    }
    case "before": {
      const lo = compareValues(text, clause.value);
      return lo != null && lo < 0;
    }
    case "after": {
      const lo = compareValues(text, clause.value);
      return lo != null && lo > 0;
    }
    case "isEmpty":
      return t === "" || t === "-";
    case "isNotEmpty":
      return !(t === "" || t === "-");
    default:
      return true;
  }
}
function clausesMatch(row, def) {
  const andOk = def.and.every((c) => clauseMatches(row, c));
  if (!andOk) return false;
  if (def.or.length === 0) return true;
  return def.or.some((c) => clauseMatches(row, c));
}
function applyLineListFilters(rows, def, template, today = todayLocalIso()) {
  const quickTests = template.quickFilters.filter((q) => def.quick.includes(q.id)).map((q) => q.test);
  return rows.filter((row) => {
    if (def.blocks.length && !def.blocks.includes(row.facility.block)) return false;
    if (def.phcs.length && !def.phcs.includes(row.facility.phc)) return false;
    if (def.types.length && !def.types.includes(row.facility.facilityType)) return false;
    if (def.statuses.length && !def.statuses.includes(row.facility.currentStatus ?? "")) return false;
    if (quickTests.length && !quickTests.some((t) => testRow(row, t, today))) return false;
    return clausesMatch(row, def);
  });
}
function searchLineListRows(rows, query) {
  const q = norm(query);
  if (!q) return rows;
  return rows.filter(
    (row) => norm(
      `${row.facility.name} ${row.facility.phc} ${row.facility.block} ${row.facility.ninNumber ?? ""}`
    ).includes(q)
  );
}
const FIELD_SINCE = {
  certDate: (r) => r.nqas?.certificationDate ?? null,
  validityDate: (r) => r.nqas?.validityDate ?? null,
  nocValidity: (r) => r.noc?.expiryDate ?? null,
  nocAvailable: (r) => r.noc?.expiryDate ?? null,
  surv1: (r) => r.nqas?.surveillanceDue1 ?? null,
  surv2: (r) => r.nqas?.surveillanceDue2 ?? null,
  saStart: (r) => r.sa?.actualStartDate ?? null,
  saEnd: (r) => r.sa?.actualEndDate ?? null,
  genDoc: (r) => null,
  documents: (r) => null
};
function lineListIssueRows(rows, today = todayLocalIso()) {
  const out = [];
  for (const row of rows) {
    const issues = attentionFor(row, today);
    for (const issue of issues) {
      const since = FIELD_SINCE[issue.field]?.(row) ?? null;
      const reason = since ? `${issue.text} (since ${toDdMmmYyyy(since)})` : issue.text;
      const copy = {
        ...row,
        facility: { ...row.facility, remarks: reason }
      };
      out.push({ row: copy, issue, since });
    }
  }
  return out;
}
function groupLineListRows(rows, groupBy, columns) {
  if (!groupBy) return [];
  const amountCols = columns.map((k) => COLUMN_BY_KEY[k]).filter((c) => c && c.type === "currency").map((c) => c);
  const map = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const label = cellText(row, groupBy) || "-";
    const list = map.get(label);
    if (list) list.push(row);
    else map.set(label, [row]);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "en-IN", { numeric: true })).map(([label, list]) => ({
    key: label,
    label,
    rows: list,
    count: list.length,
    sums: amountCols.map((c) => {
      const v = list.reduce((n, r) => {
        const cell = cellValue(r, c.key);
        return n + (cell.kind === "currency" ? cell.value : 0);
      }, 0);
      return { key: c.key, label: c.label, amount: v };
    })
  }));
}
function sortLineListRows(rows, sort) {
  return sortMasterRows(rows, sort);
}
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];
function buildLineListSummary(rows, template, today = todayLocalIso(), labels = {}) {
  const kpis = [];
  const breakdowns = [];
  const expiry = [];
  const sums = [];
  for (const item of template.summary) {
    if (item.kind === "kpi") {
      kpis.push({
        id: item.id,
        label: item.label,
        value: rows.filter((r) => testRow(r, item.test, today)).length
      });
    } else if (item.kind === "breakdown") {
      const counts = /* @__PURE__ */ new Map();
      for (const row of rows) {
        const label = cellText(row, item.column) || "-";
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
      const isBuilding = item.column === "buildingStatus";
      let items = [...counts.entries()].map(([label, count]) => ({ label, count }));
      items = isBuilding ? BUILDING_BUCKET_ORDER.filter(
        (b) => items.some((i) => i.label === b)
      ).map((b) => ({ label: b, count: counts.get(b) ?? 0 })) : items.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
      if (!isBuilding && item.limit) items = items.slice(0, item.limit);
      breakdowns.push({
        id: item.id,
        label: item.label,
        column: item.column,
        total: rows.length,
        items
      });
    } else if (item.kind === "expiry") {
      const months = item.months ?? 12;
      const now = new Date(today);
      const buckets = [];
      for (let i = 0; i < months; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        buckets.push({
          key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
          label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
          count: 0
        });
      }
      let expired = 0;
      for (const row of rows) {
        const iso = cellValue(row, item.column);
        const raw = iso.kind === "dueDate" ? iso.value : iso.kind === "date" ? iso.value : null;
        if (raw == null || raw === "") continue;
        const d = typeof raw === "number" ? new Date(raw) : new Date(String(raw));
        if (Number.isNaN(d.getTime())) continue;
        if (d.getTime() < now.getTime()) {
          expired += 1;
          continue;
        }
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const hit = buckets.find((b) => b.key === key);
        if (hit) hit.count += 1;
      }
      expiry.push({
        id: item.id,
        label: item.label,
        column: item.column,
        expired,
        months: buckets
      });
    } else if (item.kind === "sum") {
      const total = rows.reduce((n, r) => {
        const v = cellValue(r, item.amount);
        return n + (v.kind === "currency" ? v.value : 0);
      }, 0);
      const groups = item.by ? (() => {
        const m = /* @__PURE__ */ new Map();
        for (const row of rows) {
          const label = cellText(row, item.by) || "-";
          const acc = m.get(label) ?? { amount: 0, count: 0 };
          const v = cellValue(row, item.amount);
          acc.amount += v.kind === "currency" ? v.value : 0;
          acc.count += 1;
          m.set(label, acc);
        }
        return [...m.entries()].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.amount - a.amount);
      })() : [];
      sums.push({ id: item.id, label: item.label, amount: total, groups });
    }
  }
  const chartSource = breakdowns.find((b) => b.column === "buildingStatus") ?? breakdowns[0] ?? null;
  return {
    total: rows.length,
    kpis,
    breakdowns,
    expiry,
    sums,
    chart: chartSource ? { label: labels[chartSource.column] ?? chartSource.label, items: chartSource.items } : null
  };
}
function sumText(amount, rows) {
  return rows === 0 ? "-" : formatInr(amount);
}
function galleryCounts(rows, template, today = todayLocalIso()) {
  return template.cardCounts.map((c) => ({
    label: c.label,
    count: rows.filter((r) => testRow(r, c.test, today)).length
  }));
}
function describeLineListFilters(def, template, labels = {}) {
  const parts = [];
  if (def.blocks.length) parts.push(`Block: ${def.blocks.join(", ")}`);
  if (def.phcs.length) parts.push(`PHC: ${def.phcs.join(", ")}`);
  if (def.types.length) parts.push(`Facility Type: ${def.types.join(", ")}`);
  if (def.statuses.length) parts.push(`Status: ${def.statuses.join(", ")}`);
  const quickLabels = template.quickFilters.filter((q) => def.quick.includes(q.id)).map((q) => q.label);
  if (quickLabels.length) parts.push(quickLabels.join(" / "));
  for (const c of def.and) parts.push(clauseText(c, labels));
  for (const c of def.or) parts.push(`(${clauseText(c, labels)})`);
  return parts.join(" · ");
}
const OP_TEXT = {
  is: "is",
  isNot: "is not",
  in: "in",
  contains: "contains",
  between: "between",
  before: "before",
  after: "after",
  isEmpty: "is empty",
  isNotEmpty: "is not empty"
};
function clauseText(clause, labels = {}) {
  const label = labels[clause.key] ?? COLUMN_BY_KEY[clause.key]?.label ?? clause.key;
  if (clause.op === "isEmpty" || clause.op === "isNotEmpty") {
    return `${label} ${OP_TEXT[clause.op]}`;
  }
  if (clause.op === "between") {
    return `${label} between ${clause.value} and ${clause.value2 ?? ""}`.trim();
  }
  return `${label} ${OP_TEXT[clause.op]} ${clause.value}`.trim();
}
function lineListLabels(template, resolved) {
  const out = { ...resolved };
  for (const [key, label] of Object.entries(template.labelOverrides ?? {})) {
    const base = COLUMN_BY_KEY[key]?.label;
    if (!base || resolved[key] === base) out[key] = label;
  }
  return out;
}

const DEFAULT_LINE_LIST_EXPORT = {
  format: "xlsx",
  scope: "all",
  includeSummary: true,
  includeDefinitions: true,
  paper: "a4",
  orientation: "landscape",
  groupPageBreaks: true
};
function safeFileNamePart(value) {
  return value.replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();
}
function lineListFileBase(input) {
  const district = safeFileNamePart(input.district) || "District";
  const topic = safeFileNamePart(input.topic) || "Facilities";
  const block = input.singleBlock ? safeFileNamePart(input.singleBlock) : "";
  return `${district} ${topic} Line List ${input.date}${block ? ` - ${block}` : ""}`;
}
function lineListFileBaseForToday(input) {
  return lineListFileBase({
    district: input.district,
    topic: input.topic,
    date: toDdMmmYyyy(input.today ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)),
    singleBlock: input.singleBlock
  });
}
function lineListExportOptions(input) {
  return {
    rows: input.rows,
    totalRows: input.totalRows ?? input.rows.length,
    columns: input.columns,
    labels: input.labels,
    filtersText: input.filtersText,
    generatedBy: input.generatedBy,
    title: `${input.topic} line list`,
    fileNameBase: lineListFileBaseForToday({
      district: input.district,
      topic: input.topic,
      singleBlock: input.singleBlock
    }),
    frozenDataColumns: Math.min(2, input.columns.length),
    frozenKeys: ["facility", "type"],
    // The brief's dialog toggle: off = the workbook gets the list only.
    skipSummary: !input.includeSummary
  };
}
async function runLineListExport(input) {
  const opts = lineListExportOptions({
    rows: input.rows,
    columns: input.columns,
    labels: input.labels,
    topic: input.topic,
    filtersText: input.filtersText,
    generatedBy: input.generatedBy,
    district: input.district,
    singleBlock: input.singleBlock,
    includeSummary: input.plan.includeSummary,
    totalRows: input.totalRows
  });
  switch (input.plan.format) {
    case "xlsx":
      await exportMasterWorkbook(opts, input.saveBlob);
      break;
    case "pdf":
      await exportLineListPdf(opts, input.saveBlobRaw);
      break;
    case "csv":
      exportMasterCsv(opts, input.saveBlobRaw);
      break;
    case "print":
      openMasterPrint({
        rows: opts.rows,
        columns: opts.columns,
        labels: opts.labels,
        subtitle: [
          opts.filtersText || "No filters",
          `${opts.rows.length} of ${opts.totalRows ?? opts.rows.length} facilities`,
          input.plan.includeSummary ? "summary included" : "list only"
        ].join(" · ")
      });
      break;
  }
  return {
    fileName: `${opts.fileNameBase}.${input.plan.format === "print" ? "pdf" : input.plan.format}`,
    rows: opts.rows.length
  };
}

export { DEFAULT_LINE_LIST_EXPORT as D, FILTER_OPERATORS as F, applyLineListFilters as a, searchLineListRows as b, buildLineListSummary as c, clauseText as d, sumText as e, lineListIssueRows as f, groupLineListRows as g, galleryCounts as h, describeLineListFilters as i, lineListLabels as l, runLineListExport as r, sortLineListRows as s };
