/**
 * LINE LIST TEMPLATES — the topic cards of the "Line lists" tab (Reports &
 * Export). CONFIG, not code: every template is a plain object an Admin can
 * clone/edit in Admin → Reports, and every column is a key of the central
 * field config (lib/masterColumns.MASTER_COLUMNS), so a line list can never
 * show a field the rest of the product does not know.
 *
 * Rules encoded here (and enforced by scripts/lineList.test.ts):
 *   • a column key MUST exist in MASTER_COLUMNS — no hand-typed field list;
 *   • rows are one per facility unless `rowsPer: "issue"` (Needs attention);
 *   • the default sort is a real column key;
 *   • quick filters reference the shared predicate registry (lib/lineListEngine),
 *     never an inline function, so a saved report definition stays serialisable
 *     and re-runnable months later;
 *   • summary blocks read the SAME rows as the list (reconciliation is a test,
 *     not a promise).
 */

export type LineListSummaryItem =
  /** A count of rows matching a shared predicate ("Fire NOC · expired"). */
  | { id: string; kind: "kpi"; label: string; test: string }
  /** Row counts per value of one column (a status pill list or a bar chart). */
  | { id: string; kind: "breakdown"; label: string; column: string; limit?: number }
  /** Counts of one date column per calendar month for the next N months. */
  | { id: string; kind: "expiry"; label: string; column: string; months?: number }
  /** Sum of one ₹ column, optionally grouped by another column. */
  | { id: string; kind: "sum"; label: string; amount: string; by?: string };

export type LineListQuickFilter = {
  id: string;
  label: string;
  /** `<predicate id>` or `<predicate id>:<param>` — see lineListEngine.tests. */
  test: string;
};

export type LineListTemplate = {
  id: string;
  name: string;
  /** One line for the gallery card. */
  tagline: string;
  /** lucide icon name resolved in the gallery (icon key, not a component). */
  icon: string;
  /** Visible columns, in order. Every key exists in MASTER_COLUMNS. */
  columns: string[];
  /** Template-specific headers for shared columns (Admin renames still win). */
  labelOverrides?: Record<string, string>;
  quickFilters: LineListQuickFilter[];
  /** The two live counts on the gallery card ("10 expired · 3 expiring"). */
  cardCounts: { label: string; test: string }[];
  defaultSort: { id: string; desc: boolean }[];
  defaultGroupBy?: string | null;
  summary: LineListSummaryItem[];
  /** "issue" = one row per attention issue (Needs attention template). */
  rowsPer?: "facility" | "issue";
  /** Cycle scope: line lists allow "All cycles" (one row per facility-cycle). */
  allowAllCycles?: boolean;
  /** Pin the facility name + type as frozen columns (always true per brief). */
  pinned?: string[];
};

/** FROZEN columns of every line list (the brief: pinned Facility + Type). */
export const LINE_LIST_PINNED = ["facility", "type"];

const IDENTITY = ["facility", "type", "block", "phc"];

/**
 * The eleven topics. Order = the gallery order (most operational first).
 */
export const LINE_LIST_TEMPLATES: LineListTemplate[] = [
  {
    id: "firenoc",
    name: "Fire NOC",
    tagline: "Validity, expiry and the NOC document — who needs a renewal this quarter.",
    icon: "flame",
    columns: [
      ...IDENTITY,
      "nocCertified",
      "nocValidity",
      "nocStatus",
      "nocDoc",
      "remarks",
      "nextAction",
    ],
    quickFilters: [
      { id: "expired", label: "Expired", test: "noc.status:Expired" },
      { id: "expiring90", label: "Expiring in 90 days", test: "noc.expiring:90" },
      { id: "notRecorded", label: "Not recorded", test: "noc.notRecorded" },
      { id: "docMissing", label: "Document missing", test: "doc.missing:nocDoc" },
    ],
    cardCounts: [
      { label: "expired", test: "noc.status:Expired" },
      { label: "expiring", test: "noc.expiring:90" },
    ],
    defaultSort: [{ id: "nocValidity", desc: false }],
    summary: [
      { id: "nocExpired", kind: "kpi", label: "Expired", test: "noc.status:Expired" },
      { id: "nocExpiring", kind: "kpi", label: "Expiring ≤ 90 days", test: "noc.expiring:90" },
      { id: "nocNoValidity", kind: "kpi", label: "Recorded without validity date", test: "noc.noValidity" },
      { id: "nocByStatus", kind: "breakdown", label: "By Fire NOC status", column: "nocStatus" },
      { id: "nocByBlock", kind: "breakdown", label: "By Block", column: "block", limit: 8 },
      { id: "nocByType", kind: "breakdown", label: "By Facility Type", column: "type" },
      { id: "nocExpiry", kind: "expiry", label: "Expiry by month (next 12 months)", column: "nocValidity", months: 12 },
    ],
    allowAllCycles: true,
  },
  {
    id: "building",
    name: "Building",
    tagline: "Building status by the shared bucket, plus the condemnation certificate.",
    icon: "building",
    columns: [
      ...IDENTITY,
      "buildingType",
      "buildingStatus",
      "condemnedLink",
      "remarks",
      "nextAction",
    ],
    quickFilters: [
      { id: "dilapidated", label: "Dilapidated", test: "building.bucket:Dilapidated" },
      { id: "repair", label: "Needs repair or M&R", test: "building.repair" },
      { id: "construction", label: "Under construction", test: "building.bucket:Construction on going" },
      { id: "noRecord", label: "Not recorded", test: "building.bucket:No record" },
      { id: "condemnedMissing", label: "Condemned certificate missing", test: "doc.missing:condemnedLink" },
    ],
    cardCounts: [
      { label: "dilapidated", test: "building.bucket:Dilapidated" },
      { label: "need repair", test: "building.repair" },
    ],
    defaultSort: [{ id: "block", desc: false }],
    summary: [
      { id: "bldByBucket", kind: "breakdown", label: "By building status (shared bucket)", column: "buildingStatus" },
      { id: "bldByBlock", kind: "breakdown", label: "By Block", column: "block", limit: 8 },
      { id: "bldByType", kind: "breakdown", label: "By Facility Type", column: "type" },
    ],
    allowAllCycles: true,
  },
  {
    id: "gapfund",
    name: "Gap Closure Fund",
    tagline: "Amount sanctioned, year received and the proceeding document.",
    icon: "rupee",
    columns: [...IDENTITY, "gapAmount", "gcYear", "procLink", "certStatus", "remarks"],
    quickFilters: [
      { id: "hasAmount", label: "Has an amount", test: "gap.hasAmount" },
      { id: "amountNoDoc", label: "Amount without proceeding document", test: "gap.amountNoDoc" },
      { id: "certifiedWithFunds", label: "Certified with funds", test: "gap.certifiedWithFunds" },
      { id: "noFunds", label: "No funds", test: "gap.noAmount" },
    ],
    cardCounts: [
      { label: "with funds", test: "gap.hasAmount" },
      { label: "without proceedings", test: "gap.amountNoDoc" },
    ],
    defaultSort: [{ id: "gapAmount", desc: true }],
    summary: [
      { id: "gapTotal", kind: "sum", label: "Total sanctioned", amount: "gapAmount" },
      { id: "gapByBlock", kind: "sum", label: "₹ by Block", amount: "gapAmount", by: "block" },
      { id: "gapByType", kind: "sum", label: "₹ by Facility Type", amount: "gapAmount", by: "type" },
      { id: "gapByYear", kind: "sum", label: "₹ by year received", amount: "gapAmount", by: "gcYear" },
    ],
    allowAllCycles: true,
  },
  {
    id: "nqas",
    name: "NQAS Certification",
    tagline: "Certification status, score, validity and the result document.",
    icon: "award",
    columns: [
      ...IDENTITY,
      "certCycle",
      "certStatus",
      "nqasResult",
      "certDate",
      "certScore",
      "validityDate",
      "documents",
      "remarks",
    ],
    quickFilters: [
      { id: "certified", label: "Certified", test: "cert.status:Quality Certified" },
      { id: "conditional", label: "Conditional", test: "cert.status:Conditional" },
      { id: "deferred", label: "Deferred", test: "cert.status:Deferred" },
      { id: "expiring90", label: "Expiring in 90 days", test: "cert.expiring:90" },
      { id: "expired", label: "Expired", test: "cert.expired" },
      { id: "resultDocMissing", label: "Result document missing", test: "cert.resultDocMissing" },
    ],
    cardCounts: [
      { label: "certified", test: "cert.status:Quality Certified" },
      { label: "expiring", test: "cert.expiring:90" },
    ],
    defaultSort: [{ id: "validityDate", desc: false }],
    summary: [
      { id: "nqasCertified", kind: "kpi", label: "Certified", test: "cert.status:Quality Certified" },
      { id: "nqasExpiring", kind: "kpi", label: "Expiring ≤ 90 days", test: "cert.expiring:90" },
      { id: "nqasExpired", kind: "kpi", label: "Expired", test: "cert.expired" },
      { id: "nqasByStatus", kind: "breakdown", label: "By certification status", column: "certStatus" },
      { id: "nqasByBlock", kind: "breakdown", label: "By Block", column: "block", limit: 8 },
      { id: "nqasByType", kind: "breakdown", label: "By Facility Type", column: "type" },
      { id: "nqasExpiry", kind: "expiry", label: "Validity expiry by month", column: "validityDate", months: 12 },
    ],
    allowAllCycles: true,
  },
  {
    id: "state",
    name: "State Assessment",
    tagline: "SA status, score, dates, document group and assessors with HUD.",
    icon: "clipboard",
    columns: [
      ...IDENTITY,
      "saStatus",
      "saScore",
      "saStart",
      "saEnd",
      "genDoc",
      "documentsStatusReport",
      "assessor1",
      "assessor1Hud",
      "assessor2",
      "assessor2Hud",
    ],
    quickFilters: [
      { id: "inProgress", label: "In progress", test: "sa.status:In Progress" },
      { id: "completed", label: "Completed", test: "sa.status:Completed" },
      { id: "resultAwaited", label: "Result awaited", test: "sa.status:Result Awaited" },
      { id: "assessorMissing", label: "Assessor not recorded", test: "filter.assessor1.empty" },
      { id: "docsMissing", label: "Documents not uploaded", test: "doc.missing:saReport" },
    ],
    cardCounts: [
      { label: "in progress", test: "sa.status:In Progress" },
      { label: "completed", test: "sa.status:Completed" },
    ],
    defaultSort: [{ id: "block", desc: false }],
    summary: [
      { id: "saByStatus", kind: "breakdown", label: "By SA status", column: "saStatus" },
      { id: "saByDocs", kind: "breakdown", label: "By documents status", column: "documentsStatusReport" },
      { id: "saByBlock", kind: "breakdown", label: "By Block", column: "block", limit: 8 },
      { id: "saByType", kind: "breakdown", label: "By Facility Type", column: "type" },
    ],
    allowAllCycles: true,
  },
  {
    id: "ia",
    name: "Internal Assessment & Kayakalp",
    tagline: "The latest two quarters side by side, with the automatic comparison.",
    icon: "clipboard",
    columns: [
      ...IDENTITY,
      "nqasIaQ1",
      "nqasIaQ2",
      "nqasIaCmp",
      "kayakalpIaQ1",
      "kayakalpIaQ2",
      "kayakalpIaCmp",
      "remarks",
    ],
    quickFilters: [
      { id: "below70", label: "Below 70", test: "ia.below:70" },
      { id: "declined", label: "Declined", test: "ia.declined" },
      { id: "notReported", label: "Not reported", test: "ia.notReported" },
    ],
    cardCounts: [
      { label: "below 70", test: "ia.below:70" },
      { label: "declined", test: "ia.declined" },
    ],
    defaultSort: [{ id: "nqasIaQ2", desc: false }],
    summary: [
      { id: "iaBelow70", kind: "kpi", label: "Below 70", test: "ia.below:70" },
      { id: "iaDeclined", kind: "kpi", label: "Declined", test: "ia.declined" },
      { id: "iaNotReported", kind: "kpi", label: "Not reported", test: "ia.notReported" },
      { id: "iaByBlock", kind: "breakdown", label: "By Block", column: "block", limit: 8 },
      { id: "iaByType", kind: "breakdown", label: "By Facility Type", column: "type" },
    ],
    allowAllCycles: true,
  },
  {
    id: "surveillance",
    name: "Surveillance & Recertification",
    tagline: "Per-visit state (done, due soon, overdue), recertification and validity.",
    icon: "calendar",
    columns: [
      ...IDENTITY,
      "certStatus",
      "validityDate",
      "survDue1",
      "surv1",
      "survDue2",
      "surv2",
      "survScore",
      "recertStatus",
      "recertYear",
      "nextAction",
    ],
    quickFilters: [
      { id: "visit1Due", label: "1st visit due/overdue", test: "visit.open:surv1" },
      { id: "visit1Done", label: "1st visit done", test: "visit.done:surv1" },
      { id: "visit2Due", label: "2nd visit due/overdue", test: "visit.open:surv2" },
      { id: "visit2Done", label: "2nd visit done", test: "visit.done:surv2" },
      { id: "futureDone", label: "Future done date (flagged)", test: "visit.futureDone" },
      { id: "recertDue", label: "Recertification due", test: "recert.due" },
    ],
    cardCounts: [
      { label: "visits overdue", test: "visit.overdue" },
      { label: "recert due", test: "recert.due" },
    ],
    defaultSort: [{ id: "survDue1", desc: false }],
    summary: [
      { id: "vis1Done", kind: "kpi", label: "1st visit done", test: "visit.done:surv1" },
      { id: "vis2Done", kind: "kpi", label: "2nd visit done", test: "visit.done:surv2" },
      { id: "visOverdue", kind: "kpi", label: "Visits overdue", test: "visit.overdue" },
      { id: "survByRecert", kind: "breakdown", label: "By recertification status", column: "recertStatus" },
      { id: "survByBlock", kind: "breakdown", label: "By Block", column: "block", limit: 8 },
      { id: "survByType", kind: "breakdown", label: "By Facility Type", column: "type" },
    ],
    allowAllCycles: true,
  },
  {
    id: "documents",
    name: "Documents",
    tagline: "The six tracked documents, their upload state and what is required but missing.",
    icon: "file",
    columns: [
      ...IDENTITY,
      "saReport",
      "saChecklist",
      "procLink",
      "condemnedLink",
      "nocDoc",
      "documents",
      "certStatus",
      "remarks",
    ],
    quickFilters: [
      { id: "requiredMissing", label: "Required missing", test: "docs.requiredMissing" },
      { id: "none", label: "No document uploaded", test: "docs.below:1" },
      { id: "partial", label: "Some uploaded (<6)", test: "docs.below:6" },
      { id: "complete", label: "All six uploaded", test: "docs.below:7" },
      { id: "nocMissing", label: "Fire NOC missing", test: "doc.missing:nocDoc" },
      { id: "saMissing", label: "SA report missing", test: "doc.missing:saReport" },
    ],
    cardCounts: [
      { label: "missing required", test: "docs.requiredMissing" },
      { label: "no uploads", test: "docs.below:1" },
    ],
    defaultSort: [{ id: "documents", desc: false }],
    summary: [
      { id: "docsMissingReq", kind: "kpi", label: "Required document missing", test: "docs.requiredMissing" },
      { id: "docsNone", kind: "kpi", label: "No document uploaded", test: "docs.below:1" },
      { id: "docsByBlock", kind: "breakdown", label: "By Block", column: "block", limit: 8 },
      { id: "docsByStatus", kind: "breakdown", label: "By certification status", column: "certStatus" },
    ],
    allowAllCycles: true,
  },
  {
    id: "saqsham",
    name: "SaQsham document status",
    tagline: "Portal status and the derived report group, with the last recorded update.",
    icon: "clipboard",
    columns: [
      ...IDENTITY,
      "documentsStatusReport",
      "genDoc",
      "saStatus",
      "nqasResult",
      "lastUpdated",
      "remarks",
    ],
    quickFilters: [
      { id: "resultDeclared", label: "Result declared", test: "saqsham.resultDeclared" },
      { id: "notStarted", label: "Not started", test: "saqsham.notStarted" },
      { id: "updatedThisMonth", label: "Updated this month", test: "saqsham.updatedThisMonth" },
    ],
    cardCounts: [
      { label: "result declared", test: "saqsham.resultDeclared" },
      { label: "not started", test: "saqsham.notStarted" },
    ],
    defaultSort: [{ id: "lastUpdated", desc: true }],
    summary: [
      { id: "sqByGroup", kind: "breakdown", label: "By documents status (report group)", column: "documentsStatusReport" },
      { id: "sqBySaqsham", kind: "breakdown", label: "By portal status", column: "genDoc" },
      { id: "sqByBlock", kind: "breakdown", label: "By Block", column: "block", limit: 8 },
    ],
    allowAllCycles: true,
  },
  {
    id: "attention",
    name: "Needs attention",
    tagline: "One row per issue per facility — the reason, since when, and the Fix link.",
    icon: "alert",
    columns: [...IDENTITY, "pipelineStatus", "nextAction", "remarks"],
    labelOverrides: {
      remarks: "Issue (reason)",
      nextAction: "Since / Fix",
    },
    quickFilters: [
      { id: "expiredCert", label: "Expired certificate", test: "cert.expired" },
      { id: "noc", label: "Fire NOC issue", test: "noc.attention" },
      { id: "surveillance", label: "Surveillance overdue", test: "visit.overdue" },
      { id: "documents", label: "Required document missing", test: "docs.requiredMissing" },
    ],
    cardCounts: [
      { label: "certificate expired", test: "cert.expired" },
      { label: "documents missing", test: "docs.requiredMissing" },
    ],
    defaultSort: [{ id: "nextAction", desc: false }],
    summary: [
      { id: "attnCount", kind: "kpi", label: "Facilities with an issue", test: "filter.any" },
      { id: "attnByBlock", kind: "breakdown", label: "By Block", column: "block", limit: 8 },
      { id: "attnByType", kind: "breakdown", label: "By Facility Type", column: "type" },
    ],
    rowsPer: "issue",
    allowAllCycles: true,
  },
  {
    id: "custom",
    name: "Custom list",
    tagline: "Start from the identity columns and add anything from the field config.",
    icon: "list",
    columns: ["facility", "type", "block", "phc", "nin", "certCycle", "pipelineStatus", "remarks"],
    quickFilters: [],
    cardCounts: [{ label: "facilities", test: "filter.any" }],
    defaultSort: [{ id: "facility", desc: false }],
    summary: [
      { id: "customTotal", kind: "kpi", label: "Facilities in this list", test: "filter.any" },
      { id: "customByBlock", kind: "breakdown", label: "By Block", column: "block", limit: 8 },
      { id: "customByType", kind: "breakdown", label: "By Facility Type", column: "type" },
      { id: "customByStatus", kind: "breakdown", label: "By Facility Current Status", column: "pipelineStatus" },
    ],
    allowAllCycles: true,
  },
];

export const LINE_LIST_TEMPLATE_BY_ID: Record<string, LineListTemplate> = Object.fromEntries(
  LINE_LIST_TEMPLATES.map((t) => [t.id, t]),
);

export function lineListTemplate(id: string | null | undefined): LineListTemplate {
  return (
    (id ? LINE_LIST_TEMPLATE_BY_ID[id] : null) ??
    LINE_LIST_TEMPLATE_BY_ID.custom ??
    LINE_LIST_TEMPLATES[LINE_LIST_TEMPLATES.length - 1]
  );
}

/* --------------------------------------------------------------------------- */
/* Saved report definition (what "Save as my report" stores)                     */
/* --------------------------------------------------------------------------- */

export type LineListFilterOperator =
  | "is"
  | "isNot"
  | "in"
  | "contains"
  | "between"
  | "before"
  | "after"
  | "isEmpty"
  | "isNotEmpty";

export type LineListFilterClause = {
  id: string;
  /** A central field-config column key. */
  key: string;
  op: LineListFilterOperator;
  value: string;
  /** Second operand for `between` (dates/numbers). */
  value2?: string;
};

export type LineListCycleScope = "current" | number | "all";

/** The saved, re-runnable definition — the ONLY thing a share shares. */
export type LineListDefinition = {
  id: string;
  name: string;
  description: string;
  templateId: string;
  columns: string[];
  /** Quick-filter ids (template-scoped), applied as OR inside their topic. */
  quick: string[];
  and: LineListFilterClause[];
  or: LineListFilterClause[];
  sort: { id: string; desc: boolean }[];
  groupBy: string | null;
  summaryOn: boolean;
  summaryPosition: "top" | "bottom";
  cycle: LineListCycleScope;
  /** Optional scope narrowing saved with the report. */
  blocks: string[];
  phcs: string[];
  types: string[];
  statuses: string[];
  /** Sharing — definitions only, never data. Empty = private. */
  sharedWithRoles: string[];
  sharedWithUserIds: string[];
  pinned: boolean;
  defaultForRole: string | null;
  createdAt: number;
  updatedAt: number;
  /** Who saved it (display name) and their id — used by "Shared with me". */
  ownerId?: string;
  ownerName?: string;
};

export function newLineListDefinition(
  templateId: string,
  overrides: Partial<LineListDefinition> = {},
): LineListDefinition {
  const t = lineListTemplate(templateId);
  const now = Date.now();
  return {
    id: `ll-${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: `${t.name} line list`,
    description: t.tagline,
    templateId: t.id,
    columns: [...t.columns],
    quick: [],
    and: [],
    or: [],
    sort: [...t.defaultSort],
    groupBy: t.defaultGroupBy ?? null,
    summaryOn: true,
    summaryPosition: "top",
    cycle: "current",
    blocks: [],
    phcs: [],
    types: [],
    statuses: [],
    sharedWithRoles: [],
    sharedWithUserIds: [],
    pinned: false,
    defaultForRole: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
