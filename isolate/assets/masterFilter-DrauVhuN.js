import { b$ as DEFAULT_DOCUMENT_RULES, bf as DEFAULT_PENDING_CONFIG, c0 as stageOf, c1 as dueDatesWithin, c2 as attentionOf, c3 as daysUntil, c4 as requiredDocumentsMissing, c5 as iaCompareOf, c6 as dueDatesOf, X as saqshamDocumentsStatusOf, c7 as documentsStatusReportDisplayOf, c8 as nextDueOf, c9 as iaScoreOf } from './AppShell-CP099uvN.js';
import { d as deriveFireNocStatus } from './today-D9v8Esj5.js';

function multiFilterMatches(value, filter) {
  if (filter === "all" || filter.length === 0) return true;
  return filter.includes(value ?? "");
}

const CANONICAL_ORDER = ["Eligible", "Not Eligible", "Possible"];
function eligibilityValueForLabel(label) {
  const l = label.trim().toLowerCase();
  if (!l) return null;
  if (/^not\b/.test(l) || l.includes("inelig") || l.includes("in-elig") || l.includes("in elig")) {
    return "Not Eligible";
  }
  if (l.includes("candidate") || l.includes("future") || l.includes("possible")) {
    return "Possible";
  }
  if (l.includes("elig")) return "Eligible";
  return null;
}
function buildEligibilityOptions(labels) {
  const byValue = /* @__PURE__ */ new Map();
  for (const label of labels ?? []) {
    const value = eligibilityValueForLabel(label);
    if (value && !byValue.has(value)) byValue.set(value, label.trim());
  }
  if (byValue.size === 0) {
    return CANONICAL_ORDER.map((value) => ({ value, label: value }));
  }
  return CANONICAL_ORDER.filter((v) => byValue.has(v)).map((v) => ({
    value: v,
    label: byValue.get(v)
  }));
}
function eligibilityFilterMatches(value, filter) {
  return multiFilterMatches(value, filter);
}

const NO_CYCLE = "__none";
const KPI_LABELS = {
  total: "Total",
  certified: "Hold a certificate",
  pipeline: "In pipeline",
  eligible: "Eligible, not assessed",
  survOverdue: "Surveillance overdue",
  certExpiring: "Cert. expiring ≤ 90d",
  nocAlert: "Fire NOC issues",
  funds: "Gap funds",
  attention: "Needs attention",
  due90: "Due ≤ 90 days"
};
const METRIC_LABELS = {
  certified: "Certified %",
  deferred: "Deferred",
  nqasIa: "Has NQAS IA",
  iaChange: "Has IA change",
  kayakalpIa: "Has Kayakalp IA",
  docsMissing: "Required document missing",
  pendingIssues: "Has a pending issue"
};
const LAST_CHANGE_SOURCE_LABEL = {
  manual: "Manual edit",
  saqsham: "SaQsham import",
  ia: "IA import",
  master: "Facility master import",
  system: "Automatic"
};
function istDateOf(ms) {
  return new Date(ms + 5.5 * 36e5).toISOString().slice(0, 10);
}
function lastChangedMatches(row, f, now = /* @__PURE__ */ new Date()) {
  const at = row.facility.lastChangedAt ?? row.facility.updatedAt;
  if (!at) return false;
  const nowMs = now.getTime();
  const startOfIstDay = (ms) => Date.parse(`${istDateOf(ms)}T00:00:00+05:30`);
  switch (f.preset) {
    case "any":
      break;
    case "today":
      if (istDateOf(at) !== istDateOf(nowMs)) return false;
      break;
    case "24h":
      if (at < nowMs - 24 * 36e5) return false;
      break;
    case "7d":
      if (at < startOfIstDay(nowMs) - 6 * 864e5) return false;
      break;
    case "30d":
      if (at < startOfIstDay(nowMs) - 29 * 864e5) return false;
      break;
    case "custom": {
      const from = f.from ? Date.parse(`${f.from}T00:00:00+05:30`) : null;
      const to = f.to ? Date.parse(`${f.to}T23:59:59.999+05:30`) : null;
      if (from != null && at < from) return false;
      if (to != null && at > to) return false;
      break;
    }
  }
  if (f.by && (row.facility.lastChangedBy ?? "").toLowerCase() !== f.by.toLowerCase())
    return false;
  if (f.source && row.facility.lastChangeSource !== f.source) return false;
  if (f.batchId && row.facility.lastBatchId !== f.batchId) return false;
  if (f.field && !(row.facility.recentChanges ?? []).some((c) => c.key === f.field))
    return false;
  return true;
}
function foldStatus(st) {
  const s = st ?? "";
  return s === "Possible Future Candidate" || s === "Possible (future candidate)" ? "Facility (Future Candidate)" : s;
}
function nocStatusOf(row, today) {
  return deriveFireNocStatus(
    row.noc?.nocAvailable ?? null,
    row.noc?.expiryDate ?? null,
    row.noc?.status ?? null,
    void 0,
    today
  );
}
function kpiMatches(row, kpi, today = /* @__PURE__ */ new Date(), rules = DEFAULT_DOCUMENT_RULES, pending = DEFAULT_PENDING_CONFIG, settings) {
  const stage = stageOf(row);
  switch (kpi) {
    case "total":
      return true;
    case "certified":
      return (row.nqas?.certificationDate ?? row.nqas?.goiLetterDate ?? null) != null;
    case "pipeline":
      return stage === "sa" || stage === "nqas";
    case "eligible":
      return stage === "eligibility" && row.facility.eligibility === "Eligible";
    case "survOverdue": {
      const d1 = row.nqas?.surveillanceDone1 ? null : daysUntil(row.nqas?.surveillanceDue1 ?? null, today);
      const d2 = row.nqas?.surveillanceDone2 ? null : daysUntil(row.nqas?.surveillanceDue2 ?? null, today);
      return d1 != null && d1 < 0 || d2 != null && d2 < 0;
    }
    case "certExpiring": {
      const d = daysUntil(row.nqas?.validityDate ?? null, today);
      return d != null && d >= 0 && d <= 90;
    }
    case "nocAlert": {
      const s = nocStatusOf(row);
      return s === "Expired" || s === "Not Obtained" || s === "Expiring Soon";
    }
    case "funds":
      return !!row.fund?.amountSanctioned;
    case "attention":
      return attentionOf(row, today, rules, pending, settings);
    case "due90":
      return dueDatesWithin(row, 90, today);
    default:
      return true;
  }
}
function metricMatches(row, metric, today = /* @__PURE__ */ new Date(), rules = DEFAULT_DOCUMENT_RULES, pending = DEFAULT_PENDING_CONFIG, settings) {
  const iaRow = row.iaq;
  const latest = (tracker) => {
    if (iaRow) return iaScoreOf(iaRow, tracker, iaRow.pair.current);
    return tracker === "nqas" ? row.facility.nqasIaQ2 ?? null : row.facility.kayakalpIaQ2 ?? null;
  };
  switch (metric) {
    case "certified": {
      const certResult = row.nqas?.certificationStatus ?? null;
      const currentStatus = row.facility.currentStatus ?? "";
      const quality = certResult === "Quality Certified" || !certResult && (currentStatus === "Certified — Surveillance Due" || currentStatus === "Certified — On track");
      const conditional = certResult === "Quality Certified with Conditionality" || !certResult && currentStatus === "Certified with Conditionality";
      return quality || conditional;
    }
    case "deferred": {
      const certResult = row.nqas?.certificationStatus ?? null;
      const currentStatus = row.facility.currentStatus ?? "";
      return certResult === "Deferred" || !certResult && currentStatus.startsWith("Deferred");
    }
    case "nqasIa":
      return latest("nqas") != null;
    case "kayakalpIa":
      return latest("kayakalp") != null;
    case "iaChange":
      if (iaRow) return iaCompareOf(iaRow, "nqas") != null;
      return row.facility.nqasIaQ1 != null && row.facility.nqasIaQ2 != null;
    case "docsMissing":
      return requiredDocumentsMissing(row, rules).length > 0;
    case "pendingIssues":
      return attentionOf(row, today, rules, pending, settings);
    default:
      return true;
  }
}
function hasDueWithin(row, days, today = /* @__PURE__ */ new Date()) {
  return dueDatesOf(row).some((iso) => {
    const d = daysUntil(iso, today);
    return d != null && d <= days;
  });
}
function searchMatches(row, query) {
  const q = query.trim().toLowerCase().replace(/\s+/g, " ");
  if (!q) return true;
  const haystack = `${row.facility.name} ${row.facility.facilityType} ${row.facility.phc} ${row.facility.block} ${row.facility.ninNumber ?? ""} ${saqshamDocumentsStatusOf(row.sa?.generalDocStatus, row.nqas?.certificationStatus) ?? ""} ${documentsStatusReportDisplayOf(
    row.sa?.generalDocStatus,
    row.facility.documentsStatusReport,
    row.nqas?.certificationStatus
  ) ?? ""}`.toLowerCase().replace(/\s+/g, " ");
  return haystack.includes(q);
}
function applyMasterFilters(rows, filters = {}, today = /* @__PURE__ */ new Date(), rules = DEFAULT_DOCUMENT_RULES, pending = DEFAULT_PENDING_CONFIG, settings) {
  const {
    search = "",
    blocks = [],
    types = [],
    cycles = [],
    eligibility = [],
    certStatus = [],
    status = [],
    docReport = [],
    buildingType = [],
    buildingStatus = [],
    nocStatus = [],
    kpi = null,
    metric = null,
    dueWindow = 0,
    scoreRange = [0, 100],
    lastChanged
  } = filters;
  return rows.filter((r) => {
    if (lastChanged && !lastChangedMatches(r, lastChanged, today)) return false;
    if (!multiFilterMatches(r.facility.block, blocks)) return false;
    if (!multiFilterMatches(r.facility.facilityType, types)) return false;
    if (!eligibilityFilterMatches(r.facility.eligibility, eligibility)) return false;
    if (!multiFilterMatches(r.nqas?.certificationStatus ?? "", certStatus)) return false;
    if (!multiFilterMatches(foldStatus(r.facility.currentStatus), status)) return false;
    if (!multiFilterMatches(r.facility.documentsStatusReport ?? "", docReport)) return false;
    if (!multiFilterMatches(
      r.cycleNumber ? String(r.cycleNumber) : NO_CYCLE,
      cycles
    ))
      return false;
    if (!multiFilterMatches(r.building?.buildingType ?? "", buildingType)) return false;
    if (!multiFilterMatches(r.building?.buildingStatus ?? "", buildingStatus))
      return false;
    if (!multiFilterMatches(nocStatusOf(r), nocStatus)) return false;
    if (kpi && !kpiMatches(r, kpi, today, rules, pending, settings)) return false;
    if (metric && !metricMatches(r, metric, today, rules, pending, settings))
      return false;
    if (dueWindow > 0 && !hasDueWithin(r, dueWindow, today)) return false;
    if (scoreRange[0] > 0 || scoreRange[1] < 100) {
      const score = r.nqas?.scorePercent ?? null;
      if (score == null || score < scoreRange[0] || score > scoreRange[1]) return false;
    }
    if (!searchMatches(r, search)) return false;
    return true;
  });
}
function sortValueOf(row, key) {
  if (key === "nextAction") return nextDueOf(row)?.iso ?? null;
  switch (key) {
    case "facility":
      return row.facility.name.toLowerCase();
    case "block":
      return row.facility.block.toLowerCase();
    case "phc":
      return row.facility.phc.toLowerCase();
    case "type":
      return row.facility.facilityType.toLowerCase();
    case "nin":
      return row.facility.ninNumber ? String(row.facility.ninNumber) : null;
    case "certCycle":
      return row.cycleNumber ?? null;
    case "certScore":
    case "saScore":
    case "survScore":
      return key === "certScore" ? row.nqas?.scorePercent ?? null : key === "saScore" ? row.sa?.scorePercent ?? null : row.nqas?.manualScore ?? null;
    case "areaA":
    case "areaB":
    case "areaC":
    case "areaD":
    case "areaE":
    case "areaF":
    case "areaG":
    case "areaH": {
      const letter = key.slice(4).toUpperCase();
      return row.scores?.areas.find((a) => a.key.toUpperCase() === letter)?.score ?? null;
    }
    case "gapAmount":
      return row.fund?.amountSanctioned ?? null;
  }
  const iso = dateOf(row, key);
  if (iso) {
    const t = Date.parse(iso);
    return Number.isNaN(t) ? null : t;
  }
  const text = textOf(row, key);
  return text ? text.toLowerCase() : null;
}
function dateOf(row, key) {
  switch (key) {
    case "certDate":
      return row.nqas?.goiLetterDate ?? row.nqas?.certificationDate ?? null;
    case "naScheduled":
      return row.nqas?.scheduledStartDate ?? null;
    case "naEnd":
      return row.nqas?.actualEndDate ?? row.nqas?.scheduledEndDate ?? null;
    case "validityDate":
      return row.nqas?.validityDate ?? null;
    case "survDue1":
      return row.nqas?.surveillanceDue1 ?? null;
    case "survDue2":
      return row.nqas?.surveillanceDue2 ?? null;
    case "surv1":
      return row.nqas?.surveillanceDone1 ?? null;
    case "surv2":
      return row.nqas?.surveillanceDone2 ?? null;
    case "saStart":
      return row.sa?.actualStartDate ?? row.sa?.scheduledDate ?? null;
    case "saEnd":
      return row.sa?.actualEndDate ?? null;
    case "nocCertified":
      return row.noc?.issuedDate ?? null;
    case "nocValidity":
      return row.noc?.expiryDate ?? null;
    case "lastUpdated":
      return row.facility.updatedAt ? new Date(row.facility.updatedAt).toISOString().slice(0, 10) : null;
    default:
      return null;
  }
}
function textOf(row, key) {
  switch (key) {
    case "eligibility":
      return row.facility.eligibility ?? "";
    case "pipelineStatus":
      return foldStatus(row.facility.currentStatus);
    case "certStatus":
      return row.nqas?.certificationStatus ?? "";
    case "nqasResult":
      return row.nqas?.status ?? "";
    case "naMode":
      return row.nqas?.mode ?? "";
    case "departments":
      return (row.nqas?.departments ?? []).join(", ");
    case "recertStatus":
      return row.nqas?.recertStatus ?? "";
    case "recertYear":
      return row.nqas?.recertYear == null ? "" : String(row.nqas.recertYear);
    case "saStatus":
      return row.sa?.status ?? "";
    case "genDoc":
      return row.sa?.generalDocStatus ?? "";
    case "assessor1":
      return row.sa?.assessor1Name ?? "";
    case "assessor2":
      return row.sa?.assessor2Name ?? "";
    case "buildingType":
      return row.building?.buildingType ?? "";
    case "buildingStatus":
      return row.building?.buildingStatus ?? "";
    case "nocAvailable":
      return row.noc?.nocAvailable ?? "";
    case "nocStatus":
      return nocStatusOf(row);
    case "remarks":
      return row.facility.remarks ?? "";
    case "gcYear":
      return row.fund?.financialYear ?? "";
    default:
      return "";
  }
}
function compareValues(x, y) {
  if (x == null && y == null) return 0;
  if (x == null) return 1;
  if (y == null) return -1;
  if (typeof x === "number" && typeof y === "number") return x - y;
  if (typeof x === "number") return -1;
  if (typeof y === "number") return 1;
  return x.localeCompare(y, void 0, { numeric: true });
}
function sortMasterRows(rows, sorting) {
  if (sorting.length === 0) return [...rows];
  const decorated = rows.map((row) => ({
    row,
    keys: sorting.map((s) => sortValueOf(row, s.id)),
    // Deterministic tiebreak: name, then id — never "whatever the DB returned".
    name: sortValueOf(row, "facility"),
    id: String(row.facility._id)
  }));
  decorated.sort((a, b) => {
    for (let i = 0; i < sorting.length; i += 1) {
      const x = a.keys[i];
      const y = b.keys[i];
      const cmp = x == null || y == null ? compareValues(x, y) : (() => {
        const c = compareValues(x, y);
        return sorting[i].desc ? -c : c;
      })();
      if (cmp !== 0) return cmp;
    }
    const byName = compareValues(a.name, b.name);
    if (byName !== 0) return byName;
    return a.id.localeCompare(b.id);
  });
  return decorated.map((d) => d.row);
}
function duplicateNames(rows) {
  const seen = /* @__PURE__ */ new Map();
  for (const r of rows) {
    const key = (r.facility.name ?? "").trim().toLowerCase();
    if (!key) continue;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const dupes = /* @__PURE__ */ new Set();
  for (const [name, count] of seen) if (count > 1) dupes.add(name);
  return dupes;
}
function isDuplicateName(row, dupes) {
  return dupes.has((row.facility.name ?? "").trim().toLowerCase());
}
function latestUpdatedAt(rows) {
  let newest = null;
  for (const r of rows) {
    const t = r.facility.updatedAt ?? null;
    if (t != null && (newest == null || t > newest)) newest = t;
  }
  return newest;
}

export { KPI_LABELS as K, LAST_CHANGE_SOURCE_LABEL as L, METRIC_LABELS as M, NO_CYCLE as N, applyMasterFilters as a, buildEligibilityOptions as b, duplicateNames as d, eligibilityValueForLabel as e, foldStatus as f, isDuplicateName as i, kpiMatches as k, latestUpdatedAt as l, multiFilterMatches as m, nocStatusOf as n, sortMasterRows as s };
