/**
 * LINE LIST ENGINE — pure functions behind the Line lists tab.
 *
 * The builder, the gallery counts, the summary strip and the exports all call
 * THIS module, so a number on a card, a number in the summary, the rows in the
 * grid, the Master List filtered the same way and the exported workbook can
 * never disagree. No React, no DOM, no Convex import that runs server code —
 * only the shared PURE rules:
 *
 *   • lib/masterColumns.cellText / cellValue  (one cell writer)
 *   • lib/masterFilter.sortMasterRows + nocStatusOf / applyMasterFilters
 *   • lib/buildingBuckets.buildingBucketOf     (shared bucket mapping)
 *   • convex/lifecycle.surveillanceVisits      (per-visit states)
 *   • lib/facilityQuickView.attentionFor       (Needs attention list)
 *   • lib/resultDeclared.documentsStatusReportOf (Result Declared rule)
 *
 * Tests: scripts/lineList.test.ts (counts vs the Master List, every operator,
 * AND/OR, grouping subtotals, summary reconciliation).
 */

import {
  buildingBucketOf,
  BUILDING_BUCKET_ORDER,
  type BuildingBucket,
} from "@/lib/buildingBuckets";
import {
  cellText,
  cellValue,
  COLUMN_BY_KEY,
  daysUntil,
  formatInr,
  toDdMmmYyyy,
  type MasterRow,
} from "@/lib/masterColumns";
import { nocStatusOf, sortMasterRows } from "@/lib/masterFilter";
import { documentsStatusReportOf } from "@/lib/resultDeclared";
import { docStageLabel } from "@/lib/reportPipeline";
import { surveillanceVisits } from "@/convex/lifecycle";
import { attentionFor, type QvAttention } from "@/lib/facilityQuickView";
import { iaCompareOf, iaScoreOf } from "@/lib/iaMaster";
import { todayLocalIso } from "@/lib/today";
import type {
  LineListDefinition,
  LineListFilterClause,
  LineListFilterOperator,
  LineListSummaryItem,
  LineListTemplate,
} from "@/lib/lineListTemplates";

/* --------------------------------------------------------------------------- */
/* Small shared readers                                                        */
/* --------------------------------------------------------------------------- */

const hasText = (v: string | null | undefined) => !!v && String(v).trim() !== "";

/** Is this document link field empty? (The upload state a line list shows.) */
export function isBlankLink(row: MasterRow, key: string): boolean {
  const v = cellValue(row, key);
  if (v.kind === "link") return !v.url && !v.attachmentId && !v.name;
  if (v.kind === "empty") return true;
  return false;
}

/** A Fire NOC record exists at all (any of its fields is filled). */
function hasNocRecord(row: MasterRow): boolean {
  const n = row.noc;
  return !!(
    n &&
    (hasText(n.nocAvailable) ||
      hasText(n.status) ||
      hasText(n.issuedDate) ||
      hasText(n.expiryDate) ||
      hasText(n.nocLink) ||
      hasText(n.nocAttachmentId))
  );
}

function certStageOf(row: MasterRow): string {
  return (row.nqas?.certificationStatus ?? "").toLowerCase();
}

function isCertifiedLike(row: MasterRow): boolean {
  const s = certStageOf(row);
  return s.startsWith("quality certified") || s === "certified" || s.startsWith("conditional");
}

/** Per-visit state with the brief's future-done guard: a done date in the
 *  FUTURE is flagged, never counted as Done. */
export type VisitState = "done" | "overdue" | "dueSoon" | "upcoming" | "notApplicable" | "flagged";

export function visitStateOf(
  row: MasterRow,
  which: "surv1" | "surv2",
  today = todayLocalIso(),
): VisitState {
  const done = which === "surv1" ? row.nqas?.surveillanceDone1 : row.nqas?.surveillanceDone2;
  if (done && done > today) return "flagged";
  const visits = surveillanceVisits(
    (row.nqas ?? null) as Partial<import("@/convex/lifecycle").NqasLike> | null,
    null,
    today,
  );
  const v = visits.find((x) => x.key === which);
  return (v?.state ?? "notApplicable") as VisitState;
}

/** The report-group value with the shared Result Declared rule applied. */
export function reportGroupOf(row: MasterRow): string {
  const v = documentsStatusReportOf(
    row.sa?.generalDocStatus,
    row.facility.documentsStatusReport,
    row.nqas?.certificationStatus,
  );
  if (!v) return "";
  return v === "Result Declared" ? v : docStageLabel(v);
}

/* --------------------------------------------------------------------------- */
/* Shared predicates ("tests")                                                 */
/* --------------------------------------------------------------------------- */

const amountOf = (row: MasterRow) => row.fund?.amountSanctioned ?? null;

/**
 * One predicate id, serialised in a template/saved report so it can be
 * re-evaluated months later. `<id>` or `<id>:<param>`.
 *
 * The registry is deliberately closed: an unknown id never filters anything
 * away (a stale saved report shows MORE, never silently loses facilities).
 */
export function testRow(
  row: MasterRow,
  test: string,
  today = todayLocalIso(),
): boolean {
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
        currentKayakalpIa(row),
      ].filter((x): x is number => x != null);
      return scores.length > 0 && Math.min(...scores) < num;
    }
    case "ia.declined":
      return ((nqasIaCompare(row) ?? 0) < 0) || ((kayakalpIaCompare(row) ?? 0) < 0);
    case "ia.notReported":
      return (
        currentNqasIa(row) == null &&
        previousNqasIa(row) == null &&
        currentKayakalpIa(row) == null &&
        previousKayakalpIa(row) == null
      );

    /* Surveillance --------------------------------------------------------- */
    case "visit.done":
      return visitStateOf(row, param === "surv2" ? "surv2" : "surv1", today) === "done";
    case "visit.open": {
      const s = visitStateOf(row, param === "surv2" ? "surv2" : "surv1", today);
      return s === "overdue" || s === "dueSoon";
    }
    case "visit.overdue":
      return (
        visitStateOf(row, "surv1", today) === "overdue" ||
        visitStateOf(row, "surv2", today) === "overdue"
      );
    case "visit.futureDone": {
      const d1 = row.nqas?.surveillanceDone1 ?? null;
      const d2 = row.nqas?.surveillanceDone2 ?? null;
      return (!!d1 && d1 > today) || (!!d2 && d2 > today);
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

/* IA readers — the quarterly store first, then the legacy columns. */
function currentNqasIa(row: MasterRow): number | null {
  return row.iaq ? iaScore(row, "nqas") : row.facility.nqasIaQ2 ?? null;
}
function previousNqasIa(row: MasterRow): number | null {
  return row.facility.nqasIaQ1 ?? null;
}
function currentKayakalpIa(row: MasterRow): number | null {
  return row.iaq ? iaScore(row, "kayakalp") : row.facility.kayakalpIaQ2 ?? null;
}
function previousKayakalpIa(row: MasterRow): number | null {
  return row.facility.kayakalpIaQ1 ?? null;
}
function iaScore(row: MasterRow, which: "nqas" | "kayakalp"): number | null {
  const iaq = row.iaq;
  if (!iaq) return null;
  return iaScoreOf(iaq, which, iaq.pair.current);
}
function nqasIaCompare(row: MasterRow): number | null {
  return row.iaq ? iaCompareOf(row.iaq, "nqas") : (cellValue(row, "nqasIaCmp").kind === "compare" ? (cellValue(row, "nqasIaCmp") as { value: number | null }).value : null);
}
function kayakalpIaCompare(row: MasterRow): number | null {
  return row.iaq ? iaCompareOf(row.iaq, "kayakalp") : (cellValue(row, "kayakalpIaCmp").kind === "compare" ? (cellValue(row, "kayakalpIaCmp") as { value: number | null }).value : null);
}

/* --------------------------------------------------------------------------- */
/* Generic field filters (every operator the builder offers)                    */
/* --------------------------------------------------------------------------- */

export const FILTER_OPERATORS: { id: LineListFilterOperator; label: string }[] = [
  { id: "is", label: "is" },
  { id: "isNot", label: "is not" },
  { id: "in", label: "in (comma separated)" },
  { id: "contains", label: "contains" },
  { id: "between", label: "between" },
  { id: "before", label: "before" },
  { id: "after", label: "after" },
  { id: "isEmpty", label: "is empty" },
  { id: "isNotEmpty", label: "is not empty" },
];

const norm = (v: string | null | undefined) =>
  String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

/** Date-or-number comparison; null when either side is not comparable. */
function compareValues(a: string, b: string): number | null {
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

/** Does one row satisfy one clause? Text compares the DISPLAYED value, so a
 *  filter agrees with what the reader sees (e.g. "Expiring Soon", "₹ 1,25,000"). */
export function clauseMatches(row: MasterRow, clause: LineListFilterClause): boolean {
  const text = cellText(row, clause.key);
  const t = norm(text);
  const v = norm(clause.value);
  switch (clause.op) {
    case "is":
      return t === v;
    case "isNot":
      return t !== v;
    case "in":
      return clause.value
        .split(",")
        .map(norm)
        .filter(Boolean)
        .includes(t);
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

/** AND across `and`, OR inside `or`, then AND the two groups together. */
export function clausesMatch(row: MasterRow, def: LineListDefinition): boolean {
  const andOk = def.and.every((c) => clauseMatches(row, c));
  if (!andOk) return false;
  if (def.or.length === 0) return true;
  return def.or.some((c) => clauseMatches(row, c));
}

/* --------------------------------------------------------------------------- */
/* The one filter chain                                                        */
/* --------------------------------------------------------------------------- */

export function applyLineListFilters(
  rows: MasterRow[],
  def: LineListDefinition,
  template: LineListTemplate,
  today = todayLocalIso(),
): MasterRow[] {
  const quickTests = template.quickFilters
    .filter((q) => def.quick.includes(q.id))
    .map((q) => q.test);
  return rows.filter((row) => {
    if (def.blocks.length && !def.blocks.includes(row.facility.block)) return false;
    if (def.phcs.length && !def.phcs.includes(row.facility.phc)) return false;
    if (def.types.length && !def.types.includes(row.facility.facilityType)) return false;
    if (def.statuses.length && !def.statuses.includes(row.facility.currentStatus ?? "")) return false;
    if (quickTests.length && !quickTests.some((t) => testRow(row, t, today))) return false;
    return clausesMatch(row, def);
  });
}

/** Free-text search across name / PHC / block / NIN (same rule as the Master
 *  List), kept separate so the preview can search without editing the report. */
export function searchLineListRows(rows: MasterRow[], query: string): MasterRow[] {
  const q = norm(query);
  if (!q) return rows;
  return rows.filter((row) =>
    norm(
      `${row.facility.name} ${row.facility.phc} ${row.facility.block} ${row.facility.ninNumber ?? ""}`,
    ).includes(q),
  );
}

/* --------------------------------------------------------------------------- */
/* Needs attention: one row per issue per facility                             */
/* --------------------------------------------------------------------------- */

export type LineListIssue = {
  row: MasterRow;
  issue: QvAttention;
  /** The date the issue has existed since, when the row records one. */
  since: string | null;
};

const FIELD_SINCE: Record<string, (r: MasterRow) => string | null> = {
  certDate: (r) => r.nqas?.certificationDate ?? null,
  validityDate: (r) => r.nqas?.validityDate ?? null,
  nocValidity: (r) => r.noc?.expiryDate ?? null,
  nocAvailable: (r) => r.noc?.expiryDate ?? null,
  surv1: (r) => r.nqas?.surveillanceDue1 ?? null,
  surv2: (r) => r.nqas?.surveillanceDue2 ?? null,
  saStart: (r) => r.sa?.actualStartDate ?? null,
  saEnd: (r) => r.sa?.actualEndDate ?? null,
  genDoc: (r) => null,
  documents: (r) => null,
};

/** Expand rows into issue rows, copying each facility's identity so the shared
 *  grid renders them like any other line. The Remarks cell carries the reason
 *  (relabelled "Issue (reason)" by the template). */
export function lineListIssueRows(rows: MasterRow[], today = todayLocalIso()): LineListIssue[] {
  const out: LineListIssue[] = [];
  for (const row of rows) {
    const issues = attentionFor(row, today);
    for (const issue of issues) {
      const since = FIELD_SINCE[issue.field]?.(row) ?? null;
      const reason = since
        ? `${issue.text} (since ${toDdMmmYyyy(since)})`
        : issue.text;
      const copy: MasterRow = {
        ...row,
        facility: { ...row.facility, remarks: reason },
      };
      out.push({ row: copy, issue, since });
    }
  }
  return out;
}

/* --------------------------------------------------------------------------- */
/* Sort / group                                                                */
/* --------------------------------------------------------------------------- */

export type LineListGroup = {
  key: string;
  label: string;
  rows: MasterRow[];
  count: number;
  /** Sums for the ₹ columns present in the list (subtotals). */
  sums: { key: string; label: string; amount: number }[];
};

export function groupLineListRows(
  rows: MasterRow[],
  groupBy: string | null,
  columns: string[],
): LineListGroup[] {
  if (!groupBy) return [];
  const amountCols = columns
    .map((k) => COLUMN_BY_KEY[k])
    .filter((c) => c && c.type === "currency")
    .map((c) => c!);
  const map = new Map<string, MasterRow[]>();
  for (const row of rows) {
    const label = cellText(row, groupBy) || "-";
    const list = map.get(label);
    if (list) list.push(row);
    else map.set(label, [row]);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "en-IN", { numeric: true }))
    .map(([label, list]) => ({
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
      }),
    }));
}

export function sortLineListRows(
  rows: MasterRow[],
  sort: { id: string; desc: boolean }[],
): MasterRow[] {
  return sortMasterRows(rows, sort);
}

/* --------------------------------------------------------------------------- */
/* Summary strip                                                               */
/* --------------------------------------------------------------------------- */

export type LineListKpi = { id: string; label: string; value: number };

export type LineListBreakdown = {
  id: string;
  label: string;
  column: string;
  total: number;
  items: { label: string; count: number }[];
};

export type LineListExpiry = {
  id: string;
  label: string;
  column: string;
  expired: number;
  months: { key: string; label: string; count: number }[];
};

export type LineListSum = {
  id: string;
  label: string;
  amount: number;
  groups: { label: string; amount: number; count: number }[];
};

export type LineListSummary = {
  /** Rows in the list the summary describes — the reconciliation number. */
  total: number;
  kpis: LineListKpi[];
  breakdowns: LineListBreakdown[];
  expiry: LineListExpiry[];
  sums: LineListSum[];
  /** One chart: the first breakdown (or building buckets when present). */
  chart: { label: string; items: { label: string; count: number }[] } | null;
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function buildLineListSummary(
  rows: MasterRow[],
  template: LineListTemplate,
  today = todayLocalIso(),
  labels: Record<string, string> = {},
): LineListSummary {
  const kpis: LineListKpi[] = [];
  const breakdowns: LineListBreakdown[] = [];
  const expiry: LineListExpiry[] = [];
  const sums: LineListSum[] = [];

  for (const item of template.summary as LineListSummaryItem[]) {
    if (item.kind === "kpi") {
      kpis.push({
        id: item.id,
        label: item.label,
        value: rows.filter((r) => testRow(r, item.test, today)).length,
      });
    } else if (item.kind === "breakdown") {
      const counts = new Map<string, number>();
      for (const row of rows) {
        const label = cellText(row, item.column) || "-";
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
      // Building status always renders in the shared bucket order.
      const isBuilding = item.column === "buildingStatus";
      let items = [...counts.entries()].map(([label, count]) => ({ label, count }));
      items = isBuilding
        ? BUILDING_BUCKET_ORDER.filter((b: BuildingBucket) =>
            items.some((i) => i.label === b),
          ).map((b) => ({ label: b, count: counts.get(b) ?? 0 }))
        : items.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
      if (!isBuilding && item.limit) items = items.slice(0, item.limit);
      breakdowns.push({
        id: item.id,
        label: item.label,
        column: item.column,
        total: rows.length,
        items,
      });
    } else if (item.kind === "expiry") {
      const months = item.months ?? 12;
      const now = new Date(today);
      const buckets: { key: string; label: string; count: number }[] = [];
      for (let i = 0; i < months; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        buckets.push({
          key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
          label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
          count: 0,
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
        months: buckets,
      });
    } else if (item.kind === "sum") {
      const total = rows.reduce((n, r) => {
        const v = cellValue(r, item.amount);
        return n + (v.kind === "currency" ? v.value : 0);
      }, 0);
      const groups = item.by
        ? (() => {
            const m = new Map<string, { amount: number; count: number }>();
            for (const row of rows) {
              const label = cellText(row, item.by!) || "-";
              const acc = m.get(label) ?? { amount: 0, count: 0 };
              const v = cellValue(row, item.amount);
              acc.amount += v.kind === "currency" ? v.value : 0;
              acc.count += 1;
              m.set(label, acc);
            }
            return [...m.entries()]
              .map(([label, v]) => ({ label, ...v }))
              .sort((a, b) => b.amount - a.amount);
          })()
        : [];
      sums.push({ id: item.id, label: item.label, amount: total, groups });
    }
  }

  const chartSource =
    breakdowns.find((b) => b.column === "buildingStatus") ?? breakdowns[0] ?? null;

  return {
    total: rows.length,
    kpis,
    breakdowns,
    expiry,
    sums,
    chart: chartSource
      ? { label: labels[chartSource.column] ?? chartSource.label, items: chartSource.items }
      : null,
  };
}

/** Format a sum the one way (Indian grouping, ₹, "-" for zero rows). */
export function sumText(amount: number, rows: number): string {
  return rows === 0 ? "-" : formatInr(amount);
}

/* --------------------------------------------------------------------------- */
/* Gallery counts                                                              */
/* --------------------------------------------------------------------------- */

export function galleryCounts(
  rows: MasterRow[],
  template: LineListTemplate,
  today = todayLocalIso(),
): { label: string; count: number }[] {
  return template.cardCounts.map((c) => ({
    label: c.label,
    count: rows.filter((r) => testRow(r, c.test, today)).length,
  }));
}

/* --------------------------------------------------------------------------- */
/* Human descriptions (export header, chips)                                   */
/* --------------------------------------------------------------------------- */

export function describeLineListFilters(
  def: LineListDefinition,
  template: LineListTemplate,
  labels: Record<string, string> = {},
): string {
  const parts: string[] = [];
  if (def.blocks.length) parts.push(`Block: ${def.blocks.join(", ")}`);
  if (def.phcs.length) parts.push(`PHC: ${def.phcs.join(", ")}`);
  if (def.types.length) parts.push(`Facility Type: ${def.types.join(", ")}`);
  if (def.statuses.length) parts.push(`Status: ${def.statuses.join(", ")}`);
  const quickLabels = template.quickFilters
    .filter((q) => def.quick.includes(q.id))
    .map((q) => q.label);
  if (quickLabels.length) parts.push(quickLabels.join(" / "));
  for (const c of def.and) parts.push(clauseText(c, labels));
  for (const c of def.or) parts.push(`(${clauseText(c, labels)})`);
  return parts.join(" · ");
}

const OP_TEXT: Record<LineListFilterOperator, string> = {
  is: "is",
  isNot: "is not",
  in: "in",
  contains: "contains",
  between: "between",
  before: "before",
  after: "after",
  isEmpty: "is empty",
  isNotEmpty: "is not empty",
};

export function clauseText(
  clause: LineListFilterClause,
  labels: Record<string, string> = {},
): string {
  const label = labels[clause.key] ?? COLUMN_BY_KEY[clause.key]?.label ?? clause.key;
  if (clause.op === "isEmpty" || clause.op === "isNotEmpty") {
    return `${label} ${OP_TEXT[clause.op]}`;
  }
  if (clause.op === "between") {
    return `${label} between ${clause.value} and ${clause.value2 ?? ""}`.trim();
  }
  return `${label} ${OP_TEXT[clause.op]} ${clause.value}`.trim();
}

/** Resolve a template's headers on top of the admin-renamed label map —
 *  an Admin rename always wins (the template only names shared columns). */
export function lineListLabels(
  template: LineListTemplate,
  resolved: Record<string, string>,
): Record<string, string> {
  const out = { ...resolved };
  for (const [key, label] of Object.entries(template.labelOverrides ?? {})) {
    const base = COLUMN_BY_KEY[key]?.label;
    if (!base || resolved[key] === base) out[key] = label;
  }
  return out;
}
