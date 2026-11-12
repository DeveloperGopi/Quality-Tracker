/**
 * PENDING & FOLLOW-UP — THE ONE ISSUE REGISTRY.
 *
 * Every "needs attention" surface reads this file: the notification bell, the
 * sidebar badge, the Master List's Needs-attention smart view, the Quick View
 * panel and the /pending page. A rule is defined once here; Admin → Pending
 * rules only flips `enabled`, `severity` and the numeric thresholds, which is
 * why a change is visible everywhere with no redeploy.
 *
 * The registry folds the checks that already existed in:
 *   • lib/masterColumns.attentionOf / attentionList — required documents,
 *     expired certificate, overdue surveillance, expired Fire NOC, dilapidated
 *     building, and the KPI/bell counts;
 *   • lib/facilityQuickView.attentionFor — NOC conflict, NOC "Available" left
 *     blank beside a NOC record, certification without a date, expired
 *     validity, missing NIN, future surveillance Done dates, done == due,
 *     stored start/end date conflicts;
 *   • lib/cycleReport / lib/masterExport "certified, no validity date";
 *   • the Master List software filters (certificate expiring ≤ 90 days, NOC
 *     expiring, surveillance due ≤ 30 days, eligible-not-assessed).
 *
 * Pure: no React, no Convex runtime. It runs in a Web Worker, in the browser,
 * in the PDF/Excel exporters and in tests. Dates are IST calendar dates and
 * every helper prints DD-MMM-YYYY. A blank is never 0 and never an accusation
 * when the server did not load the fact.
 */

import {
  DEFAULT_SETTINGS,
  deferredRetakeCountdown,
  deriveFireNocStatus,
  surveillanceVisits,
  type LifecycleSettings,
} from "../convex/lifecycle";
import {
  DEFAULT_DOCUMENT_RULES,
  isCertifiedOrConditional,
  requiredDocumentIssues,
  type DocumentRules,
} from "./documentRules";
import { ACTIVE_DOC_TYPES } from "../convex/storage/validation";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export const ISSUE_CATEGORIES = [
  "documents",
  "not-updated",
  "pending-work",
  "certificate-surveillance",
  "fire-building",
  "data-conflicts",
] as const;

export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

export const ISSUE_CATEGORY_LABEL: Record<IssueCategory, string> = {
  documents: "Documents",
  "not-updated": "Not updated",
  "pending-work": "Pending work",
  "certificate-surveillance": "Certificate and surveillance",
  "fire-building": "Fire NOC and building",
  "data-conflicts": "Data conflicts",
};

export type IssueSeverity = "high" | "medium" | "low";

export const ISSUE_SEVERITY_LABEL: Record<IssueSeverity, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const ISSUE_STATUSES = ["open", "in-progress", "snoozed", "resolved"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const ISSUE_STATUS_LABEL: Record<IssueStatus, string> = {
  open: "Open",
  "in-progress": "In progress",
  snoozed: "Snoozed",
  resolved: "Resolved",
};

/** Quick View section a Fix button opens. */
export type IssueAction =
  | "documents"
  | "overview"
  | "ia"
  | "state"
  | "nqas"
  | "surveillance"
  | "building"
  | "eligibility";

export type PendingThresholdDef = {
  key: string;
  label: string;
  unit: "days" | "months";
  default: number;
  min: number;
  max: number;
};

export type PendingRuleSetting = {
  enabled: boolean;
  severity: IssueSeverity;
  thresholds: Record<string, number>;
};

export type PendingConfig = {
  rules: Record<string, PendingRuleSetting>;
  /** Admin → Filters defaults (which filter chips start in the bar). */
  defaultFilters: string[];
};

/** The facts one rule may read. A superset of MasterRow's optional fields. */
export type PendingRow = {
  facility: {
    _id: string;
    name: string;
    block: string;
    phc: string;
    facilityType: string;
    ninNumber?: string | null;
    eligibility?: string | null;
    currentStatus?: string | null;
    lastChangedAt?: number | null;
    updatedAt?: number | null;
    saqshamPortalUpdatedOn?: string | null;
    saqshamStatusRaw?: string | null;
    documentsStatusReport?: string | null;
  };
  cycleNumber?: number | null;
  docs?: {
    uploaded: number;
    total: number;
    keys?: string[] | null;
    missingInDriveKeys?: string[] | null;
  } | null;
  sa?: {
    status?: string | null;
    scheduledDate?: string | null;
    revisedDate?: string | null;
    actualStartDate?: string | null;
    actualEndDate?: string | null;
    scorePercent?: number | null;
    generalDocStatus?: string | null;
    reportAttachmentId?: string | null;
    checklistAttachmentId?: string | null;
  } | null;
  nqas?: {
    status?: string | null;
    scheduledStartDate?: string | null;
    actualEndDate?: string | null;
    scorePercent?: number | null;
    certificationStatus?: string | null;
    certificationDate?: string | null;
    goiLetterDate?: string | null;
    validityDate?: string | null;
    surveillanceDue1?: string | null;
    surveillanceDone1?: string | null;
    surveillanceDue2?: string | null;
    surveillanceDone2?: string | null;
    recertStatus?: string | null;
  } | null;
  fund?: { amountSanctioned?: number | null; financialYear?: string | null } | null;
  noc?: {
    nocAvailable?: string | null;
    status?: string | null;
    issuedDate?: string | null;
    expiryDate?: string | null;
  } | null;
  building?: { buildingStatus?: string | null } | null;
  /**
   * The latest COMPLETED quarter's IA row, supplied by ops.listFacilityRowsFast.
   * `null` = the quarter is known to have no score; `undefined` = the fact was
   * not loaded, so the rule stays silent (a blank is never an accusation).
   */
  latestIa?: {
    fy: string;
    quarter: number;
    score: number | null;
    notApplicable: boolean;
  } | null;
};

export type PendingIssue = {
  /** facilityId:ruleId(:visit). Also the issue_state key in spirit. */
  id: string;
  facilityId: string;
  facilityName: string;
  block: string;
  phc: string;
  facilityType: string;
  nin: string | null;
  cycleNumber: number | null;
  ruleId: string;
  category: IssueCategory;
  severity: IssueSeverity;
  reason: string;
  /** The date the condition is about (ISO), e.g. the expiry or certification date. */
  since: string | null;
  /** Whole days from `since` to today. Negative = still in the future. */
  days: number | null;
  action: IssueAction;
  documentKey?: string;
};

export type IssueState = {
  facilityId: string;
  ruleId: string;
  /** Identity snapshot so a resolved row still names the facility in history. */
  facilityName?: string | null;
  block?: string | null;
  phc?: string | null;
  facilityType?: string | null;
  remark?: string | null;
  followUpDate?: string | null;
  assignee?: string | null;
  status?: string | null;
  snoozeUntil?: string | null;
  snoozeReason?: string | null;
  lastReason?: string | null;
  resolvedAt?: number | null;
  updatedAt?: number | null;
};

/** An issue with the user's saved follow-up state merged in. */
export type PendingIssueRow = PendingIssue & {
  /** The issue_state row's ruleId (visit suffix stripped). */
  stateRuleId: string;
  status: IssueStatus;
  remark: string | null;
  followUpDate: string | null;
  assignee: string | null;
  snoozeUntil: string | null;
  snoozeReason: string | null;
  /** True for a resolved issue shown from the state history. */
  history: boolean;
  resolvedAt: number | null;
};

/* -------------------------------------------------------------------------- */
/* Dates and labels                                                          */
/* -------------------------------------------------------------------------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** ISO (YYYY-MM-DD) → DD-MMM-YYYY. Never "Invalid date". */
export function dmy(iso: string | null | undefined): string {
  if (!iso) return "-";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  if (!m) return String(iso);
  return `${m[3]}-${MONTHS[Number(m[2]) - 1] ?? m[2]}-${m[1]}`;
}

export function isoDate(value: number | string | null | undefined): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return new Date(value + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }
  const text = String(value);
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(text);
  return m ? m[1] : null;
}

const dayMs = 86_400_000;
const utc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: string | null | undefined, to: string | null | undefined): number | null {
  if (!from || !to) return null;
  const a = utc(String(from).slice(0, 10));
  const b = utc(String(to).slice(0, 10));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / dayMs);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(utc(iso) + days * dayMs);
  return d.toISOString().slice(0, 10);
}

/** Indian FY quarter (Apr–Mar) label, e.g. Q2 2026-27. */
export function fyQuarter(iso: string): { fy: string; quarter: number; label: string; start: string; end: string } {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  const fyStart = m >= 4 ? y : y - 1;
  const fy = `${fyStart}-${String((fyStart + 1) % 100).padStart(2, "0")}`;
  const quarter = m >= 4 && m <= 6 ? 1 : m >= 7 && m <= 9 ? 2 : m >= 10 && m <= 12 ? 3 : 4;
  const startMonth = [4, 7, 10, 1][quarter - 1];
  const startYear = quarter === 4 ? fyStart + 1 : fyStart;
  const endMonth = [6, 9, 12, 3][quarter - 1];
  const endYear = startYear;
  const lastDay = new Date(Date.UTC(endYear, endMonth, 0)).getUTCDate();
  return {
    fy,
    quarter,
    label: `Q${quarter} ${fy}`,
    start: `${startYear}-${String(startMonth).padStart(2, "0")}-01`,
    end: `${endYear}-${String(endMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
}

/** The most recently FINISHED quarter (the current one is still running). */
export function latestCompletedQuarter(today: string): {
  fy: string;
  quarter: number;
  label: string;
  start: string;
  end: string;
} {
  const current = fyQuarter(today);
  const q = current.quarter === 1 ? 4 : current.quarter - 1;
  const fyStart = Number(current.fy.slice(0, 4)) - (current.quarter === 1 ? 1 : 0);
  const firstDay =
    q === 1 ? `${fyStart}-04-01` : q === 2 ? `${fyStart}-07-01` : q === 3 ? `${fyStart}-10-01` : `${fyStart + 1}-01-01`;
  return fyQuarter(firstDay);
}

const DOC_LABEL: Record<string, string> = Object.fromEntries(
  ACTIVE_DOC_TYPES.map((t) => [t.key, t.label]),
);

const hasDoc = (row: PendingRow, key: string): boolean => {
  const present = row.docs?.keys;
  if (!present) return true; // unknown is never a missing document
  if (present.includes(key)) return true;
  return key === "NQAS_Result" && present.includes("NQAS_Certificate");
};

const certStatusOf = (row: PendingRow) => row.nqas?.certificationStatus ?? null;
const isCertified = (row: PendingRow) =>
  isCertifiedOrConditional(certStatusOf(row)) || certStatusOf(row) === "Certified";
const isPipeline = (row: PendingRow) =>
  !isCertified(row) &&
  (row.facility.eligibility ?? "").toLowerCase() === "eligible" &&
  !/not eligible|archived/i.test(row.facility.currentStatus ?? "");
const saCompleted = (row: PendingRow) => (row.sa?.status ?? "").toLowerCase() === "completed";
const nocRecorded = (row: PendingRow) =>
  !!row.noc &&
  ((row.noc.nocAvailable ?? "") === "Yes" ||
    !!row.noc.issuedDate ||
    /obtained|valid/i.test(row.noc.status ?? ""));
const dilapidated = (row: PendingRow) =>
  (row.building?.buildingStatus ?? "").toLowerCase() === "dilapidated";
const inr = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;
const daysText = (days: number) => `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`;

/* -------------------------------------------------------------------------- */
/* The conditions                                                             */
/* -------------------------------------------------------------------------- */

type CheckContext = {
  today: string;
  documentRules: DocumentRules;
  settings: LifecycleSettings;
  latest: ReturnType<typeof latestCompletedQuarter>;
};

type Draft = { reason: string; since?: string | null; documentKey?: string; suffix?: string };

type RuleCheck = (row: PendingRow, ctx: CheckContext, setting: PendingRuleSetting) => Draft[];

export type PendingRuleDef = {
  id: string;
  category: IssueCategory;
  label: string;
  description: string;
  defaultSeverity: IssueSeverity;
  defaultEnabled: boolean;
  thresholds: PendingThresholdDef[];
  action: IssueAction;
  check: RuleCheck;
};

const clampThreshold = (setting: PendingRuleSetting, key: string, fallback: number) => {
  const value = setting.thresholds?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

/** Checks that already existed, folded in (one line each):
 *  Quick View — NOC conflict, derived NOC, cert date, expired validity, NIN,
 *  future/equal surveillance dates, stored date ranges, required documents;
 *  Master List — required documents, expired certificate, overdue surveillance,
 *  expired NOC, dilapidated; KPI — NOC expired/expiring/not obtained;
 *  Cycle report — certified without validity; software filters — expiring
 *  certificate ≤ 90d, NOC expiring, surveillance due ≤ 30d, eligible-not-
 *  assessed. Each now has exactly one home below. */
export const issueRules: PendingRuleDef[] = [
  /* ---------------------------- Documents ---------------------------- */
  {
    id: "doc.nqas-result",
    category: "documents",
    label: "NQAS Result missing for a certified facility",
    description: "A certified facility has no NQAS Result file. High: the certificate cannot be verified without it.",
    defaultSeverity: "high",
    defaultEnabled: true,
    thresholds: [],
    action: "documents",
    check: (row, ctx) => {
      if (!row.docs?.keys || hasDoc(row, "NQAS_Result")) return [];
      const required = requiredDocumentIssues(
        {
          presentKeys: row.docs.keys,
          certStatus: certStatusOf(row),
          gapAmount: row.fund?.amountSanctioned ?? 0,
          dilapidated: dilapidated(row),
          fireNocRecorded: nocRecorded(row),
        },
        ctx.documentRules,
      ).some((issue) => issue.key === "NQAS_Result");
      // Admin → Documents still decides whether the file is required at all;
      // the default rule makes it required for a certified facility.
      if (!required) return [];
      const certifiedOn = row.nqas?.certificationDate ?? row.nqas?.goiLetterDate ?? null;
      return [
        {
          reason: isCertified(row)
            ? `NQAS Result file not uploaded; certified ${dmy(certifiedOn)}`
            : "NQAS Result file not uploaded; required under Admin → Documents",
          since: certifiedOn,
          documentKey: "NQAS_Result",
        },
      ];
    },
  },
  {
    id: "doc.required",
    category: "documents",
    label: "Any document required by Admin → Documents is missing",
    description: "Uses the live document rules. If another rule already covers a file, this rule skips it, so nothing is counted twice.",
    defaultSeverity: "medium",
    defaultEnabled: true,
    thresholds: [],
    action: "documents",
    check: (row, ctx) => {
      if (!row.docs?.keys) return [];
      const covered = new Set(["NQAS_Result"]);
      if (saCompleted(row)) {
        covered.add("SA_Report");
        covered.add("SA_Checklist");
      }
      if ((row.fund?.amountSanctioned ?? 0) > 0) covered.add("Gap_Closure");
      if (dilapidated(row)) covered.add("Condemned");
      if (nocRecorded(row)) covered.add("NOC");
      return requiredDocumentIssues(
        {
          presentKeys: row.docs.keys,
          certStatus: certStatusOf(row),
          gapAmount: row.fund?.amountSanctioned ?? 0,
          dilapidated: dilapidated(row),
          fireNocRecorded: nocRecorded(row),
        },
        ctx.documentRules,
      )
        .filter((issue) => !covered.has(issue.key))
        .map((issue) => ({
          reason: `${issue.label} is required under Admin → Documents${issue.blocking ? " (blocking)" : ""}`,
          documentKey: issue.key,
          suffix: issue.key,
        }));
    },
  },
  {
    id: "doc.drive-missing",
    category: "documents",
    label: "File missing in Drive",
    description: "The nightly reconciliation found that a current document's file is no longer in Drive.",
    defaultSeverity: "high",
    defaultEnabled: true,
    thresholds: [],
    action: "documents",
    check: (row) => {
      const keys = row.docs?.missingInDriveKeys ?? [];
      return keys.map((key) => ({
        reason: `File missing in Drive: ${DOC_LABEL[key] ?? key.replace(/_/g, " ")}`,
        documentKey: key,
        suffix: key,
      }));
    },
  },
  {
    id: "doc.sa-report",
    category: "documents",
    label: "SA Report or SA Checklist not uploaded after the State Assessment",
    description: "The State Assessment is Completed but its report or checklist attachment is absent.",
    defaultSeverity: "medium",
    defaultEnabled: true,
    thresholds: [],
    action: "documents",
    check: (row) => {
      if (!saCompleted(row)) return [];
      const missing: string[] = [];
      if (!row.sa?.reportAttachmentId) missing.push("SA Report");
      if (!row.sa?.checklistAttachmentId) missing.push("SA Checklist");
      if (missing.length === 0) return [];
      const end = row.sa?.actualEndDate ?? null;
      return [
        {
          reason: `${missing.join(" and ")} not uploaded after the State Assessment${end ? ` completed on ${dmy(end)}` : " was completed"}`,
          since: end,
        },
      ];
    },
  },
  {
    id: "doc.gap-closure",
    category: "documents",
    label: "Gap Closure Proceeding missing where a gap amount exists",
    description: "A sanctioned gap amount has no Gap Closure Proceeding uploaded.",
    defaultSeverity: "medium",
    defaultEnabled: true,
    thresholds: [],
    action: "documents",
    check: (row) => {
      const amount = row.fund?.amountSanctioned ?? 0;
      if (amount <= 0 || hasDoc(row, "Gap_Closure")) return [];
      return [
        {
          reason: `Gap Closure Proceeding not uploaded; gap amount ${inr(amount)}`,
          documentKey: "Gap_Closure",
        },
      ];
    },
  },
  {
    id: "doc.condemned",
    category: "documents",
    label: "Condemned Certificate missing for a Dilapidated building",
    description: "The building is Dilapidated but its condemnation certificate is not uploaded.",
    defaultSeverity: "medium",
    defaultEnabled: true,
    thresholds: [],
    action: "documents",
    check: (row) =>
      dilapidated(row) && !hasDoc(row, "Condemned")
        ? [{ reason: "Condemned Certificate not uploaded for a Dilapidated building", documentKey: "Condemned" }]
        : [],
  },
  {
    id: "doc.fire-noc",
    category: "documents",
    label: "Fire NOC document missing where a Fire NOC is recorded",
    description: "A Fire NOC record exists but the NOC file is not in the six tracked documents.",
    defaultSeverity: "medium",
    defaultEnabled: true,
    thresholds: [],
    action: "documents",
    check: (row) =>
      nocRecorded(row) && !hasDoc(row, "NOC")
        ? [{ reason: "Fire NOC document not uploaded though a Fire NOC is recorded", documentKey: "NOC" }]
        : [],
  },

  /* ---------------------------- Not updated --------------------------- */
  {
    id: "not-updated.no-change",
    category: "not-updated",
    label: "No change recorded for N days",
    description: "The facility record has not changed for the threshold. Only applies when a last-change date is stored.",
    defaultSeverity: "medium",
    defaultEnabled: true,
    thresholds: [{ key: "days", label: "Days without a change", unit: "days", default: 60, min: 7, max: 365 }],
    action: "overview",
    check: (row, ctx, setting) => {
      const since = isoDate(row.facility.lastChangedAt ?? row.facility.updatedAt ?? null);
      if (!since) return [];
      if (/archived/i.test(row.facility.currentStatus ?? "")) return [];
      const age = daysBetween(since, ctx.today);
      const limit = clampThreshold(setting, "days", 60);
      if (age == null || age < limit) return [];
      return [{ reason: `No change recorded for ${age} days (last updated ${dmy(since)})`, since }];
    },
  },
  {
    id: "not-updated.ia-quarter",
    category: "not-updated",
    label: "IA score missing for the latest completed quarter",
    description: "The latest completed quarter has no IA score and is not marked Not applicable. Certified facilities are out of scope.",
    defaultSeverity: "medium",
    defaultEnabled: true,
    thresholds: [],
    action: "ia",
    check: (row, ctx) => {
      if (isCertified(row)) return [];
      if (!("latestIa" in row)) return [];
      const ia = row.latestIa;
      if (ia && (ia.notApplicable || ia.score != null)) return [];
      if (ia && (ia.fy !== ctx.latest.fy || ia.quarter !== ctx.latest.quarter)) return [];
      return [
        {
          reason: `IA score missing for ${ctx.latest.label} (latest completed quarter)`,
          since: ctx.latest.end,
        },
      ];
    },
  },
  {
    id: "not-updated.saqsham",
    category: "not-updated",
    label: "SaQsham status unchanged while in the pipeline",
    description: "The portal status has not moved for the threshold while the facility is still pre-certification.",
    defaultSeverity: "medium",
    defaultEnabled: true,
    thresholds: [{ key: "days", label: "Days without a SaQsham change", unit: "days", default: 45, min: 7, max: 365 }],
    action: "state",
    check: (row, ctx, setting) => {
      if (!isPipeline(row)) return [];
      const since = isoDate(row.facility.saqshamPortalUpdatedOn ?? null);
      if (!since) return [];
      const age = daysBetween(since, ctx.today);
      const limit = clampThreshold(setting, "days", 45);
      if (age == null || age < limit) return [];
      return [{ reason: `SaQsham status unchanged for ${age} days (last portal update ${dmy(since)})`, since }];
    },
  },

  /* ---------------------------- Pending work -------------------------- */
  {
    id: "pending.sa-scheduled-passed",
    category: "pending-work",
    label: "State Assessment scheduled date passed with no visit",
    description: "The scheduled date is in the past and no actual visit start is recorded.",
    defaultSeverity: "high",
    defaultEnabled: true,
    thresholds: [],
    action: "state",
    check: (row, ctx) => {
      // A revised schedule supersedes the original date.
      const scheduled = row.sa?.revisedDate ?? row.sa?.scheduledDate ?? null;
      if (!scheduled || scheduled >= ctx.today) return [];
      if (row.sa?.actualStartDate || saCompleted(row)) return [];
      return [{ reason: `State Assessment scheduled for ${dmy(scheduled)} was not recorded as visited`, since: scheduled }];
    },
  },
  {
    id: "pending.nqas-scheduled-passed",
    category: "pending-work",
    label: "NQAS assessment scheduled date passed with no visit",
    description: "The NQAS scheduled start date is in the past and the assessment is not Completed.",
    defaultSeverity: "high",
    defaultEnabled: true,
    thresholds: [],
    action: "nqas",
    check: (row, ctx) => {
      const scheduled = row.nqas?.scheduledStartDate ?? null;
      if (!scheduled || scheduled >= ctx.today) return [];
      if (row.nqas?.actualEndDate || (row.nqas?.status ?? "").toLowerCase() === "completed") return [];
      return [{ reason: `NQAS assessment scheduled for ${dmy(scheduled)} was not recorded as visited`, since: scheduled }];
    },
  },
  {
    id: "pending.result-awaited",
    category: "pending-work",
    label: "Result awaited after the NQAS assessment",
    description: "The NQAS visit ended more than the threshold ago and no certification result is recorded.",
    defaultSeverity: "medium",
    defaultEnabled: true,
    thresholds: [{ key: "days", label: "Days to wait for a result", unit: "days", default: 45, min: 7, max: 365 }],
    action: "nqas",
    check: (row, ctx, setting) => {
      if ((row.nqas?.status ?? "").toLowerCase() !== "completed") return [];
      if (certStatusOf(row)) return [];
      const end = row.nqas?.actualEndDate ?? null;
      if (!end) return [];
      const age = daysBetween(end, ctx.today);
      const limit = clampThreshold(setting, "days", 45);
      if (age == null || age <= limit) return [];
      return [{ reason: `Result awaited for ${age} days after the NQAS assessment ended on ${dmy(end)}`, since: end }];
    },
  },
  {
    id: "pending.sa-not-scheduled",
    category: "pending-work",
    label: "Eligible facility with no State Assessment scheduled",
    description: "Eligibility is Eligible, the facility is not certified, and neither a scheduled nor an actual SA date exists.",
    defaultSeverity: "medium",
    defaultEnabled: true,
    thresholds: [],
    action: "state",
    check: (row) => {
      if ((row.facility.eligibility ?? "").toLowerCase() !== "eligible") return [];
      if (isCertified(row) || /not eligible|archived/i.test(row.facility.currentStatus ?? "")) return [];
      if (row.sa?.scheduledDate || row.sa?.actualStartDate || saCompleted(row)) return [];
      return [{ reason: "Eligible facility has no State Assessment scheduled", since: null }];
    },
  },
  {
    id: "pending.deferred-cooling",
    category: "pending-work",
    label: "Deferred facility cooling period ending soon",
    description: "The deferred re-take window is within the threshold, so the next SA can be planned.",
    defaultSeverity: "low",
    defaultEnabled: true,
    thresholds: [{ key: "days", label: "Days before the re-take window", unit: "days", default: 30, min: 1, max: 120 }],
    action: "nqas",
    check: (row, ctx, setting) => {
      const cooling = deferredRetakeCountdown(
        (row.nqas ?? null) as never,
        ctx.settings,
        ctx.today,
      );
      if (!cooling) return [];
      const limit = clampThreshold(setting, "days", 30);
      // Already inside / past the re-take window is handled by the workflow,
      // not by a "ending soon" prompt.
      if (cooling.daysLeft < 0 || cooling.daysLeft > limit) return [];
      return [
        {
          reason: `Deferred facility's cooling period ends on ${dmy(cooling.unlockDate)} (${cooling.daysLeft} days left)`,
          since: cooling.unlockDate,
        },
      ];
    },
  },

  /* ---------------------- Certificate and surveillance --------------- */
  {
    id: "certificate.expired",
    category: "certificate-surveillance",
    label: "Certificate expired",
    description: "Certification validity is before today.",
    defaultSeverity: "high",
    defaultEnabled: true,
    thresholds: [],
    action: "nqas",
    check: (row, ctx) => {
      const validity = row.nqas?.validityDate ?? null;
      if (!validity || validity >= ctx.today) return [];
      const age = Math.abs(daysBetween(validity, ctx.today) ?? 0);
      return [{ reason: `Certificate expired on ${dmy(validity)} (${daysText(age)} ago)`, since: validity }];
    },
  },
  {
    id: "certificate.expiring",
    category: "certificate-surveillance",
    label: "Certificate expiring soon",
    description: "Certification validity is inside the forward window (default 90 days). Never an already-expired date.",
    defaultSeverity: "medium",
    defaultEnabled: true,
    thresholds: [{ key: "days", label: "Expiring within (days)", unit: "days", default: 90, min: 7, max: 365 }],
    action: "nqas",
    check: (row, ctx, setting) => {
      const validity = row.nqas?.validityDate ?? null;
      if (!validity) return [];
      const left = daysBetween(ctx.today, validity);
      const limit = clampThreshold(setting, "days", 90);
      if (left == null || left < 0 || left > limit) return [];
      return [{ reason: `Certificate expires on ${dmy(validity)} (${daysText(left)} left)`, since: validity }];
    },
  },
  {
    id: "surveillance.overdue",
    category: "certificate-surveillance",
    label: "Surveillance overdue",
    description: "A surveillance due date passed and its Done date is missing. This is also the 'Done date missing after the due date' condition.",
    defaultSeverity: "high",
    defaultEnabled: true,
    thresholds: [],
    action: "surveillance",
    check: (row, ctx) => {
      const visits = surveillanceVisits((row.nqas ?? null) as never, ctx.settings, ctx.today);
      return visits
        .filter((visit) => visit.state === "overdue")
        .map((visit) => ({
          reason: `${visit.label} overdue since ${dmy(visit.due)} (${daysText(Math.abs(visit.days ?? 0))} late)`,
          since: visit.due,
          suffix: visit.key,
        }));
    },
  },
  {
    id: "surveillance.due-soon",
    category: "certificate-surveillance",
    label: "Surveillance due soon",
    description: "A surveillance visit falls due inside the forward window (default 30 days).",
    defaultSeverity: "medium",
    defaultEnabled: true,
    thresholds: [{ key: "days", label: "Due within (days)", unit: "days", default: 30, min: 1, max: 180 }],
    action: "surveillance",
    check: (row, ctx, setting) => {
      const limit = clampThreshold(setting, "days", 30);
      return surveillanceVisits((row.nqas ?? null) as never, ctx.settings, ctx.today).flatMap(
        (visit) => {
          if (!visit.due || visit.state === "done" || visit.state === "notApplicable") return [];
          const left = daysBetween(ctx.today, visit.due);
          if (left == null || left < 0 || left > limit) return [];
          return [
            {
              reason: `${visit.label} due on ${dmy(visit.due)} (${daysText(left)} left)`,
              since: visit.due,
              suffix: visit.key,
            },
          ];
        },
      );
    },
  },

  /* -------------------------- Fire NOC / building -------------------- */
  {
    id: "noc.expired",
    category: "fire-building",
    label: "Fire NOC expired",
    description: "The Fire NOC validity date has passed.",
    defaultSeverity: "high",
    defaultEnabled: true,
    thresholds: [],
    action: "building",
    check: (row, ctx) => {
      const status = deriveFireNocStatus(row.noc?.nocAvailable ?? null, row.noc?.expiryDate ?? null, row.noc?.status ?? null, ctx.today);
      if (status !== "Expired") return [];
      const expiry = row.noc?.expiryDate ?? null;
      const age = expiry ? Math.abs(daysBetween(expiry, ctx.today) ?? 0) : 0;
      return [{ reason: `Fire NOC expired on ${dmy(expiry)}${expiry ? ` (${daysText(age)} ago)` : ""}`, since: expiry }];
    },
  },
  {
    id: "noc.expiring",
    category: "fire-building",
    label: "Fire NOC expiring soon",
    description: "The Fire NOC is inside the forward window (default 90 days).",
    defaultSeverity: "medium",
    defaultEnabled: true,
    thresholds: [{ key: "days", label: "Expiring within (days)", unit: "days", default: 90, min: 7, max: 365 }],
    action: "building",
    check: (row, ctx, setting) => {
      const expiry = row.noc?.expiryDate ?? null;
      if (!expiry) return [];
      const left = daysBetween(ctx.today, expiry);
      const limit = clampThreshold(setting, "days", 90);
      if (left == null || left < 0 || left > limit) return [];
      return [{ reason: `Fire NOC expires on ${dmy(expiry)} (${daysText(left)} left)`, since: expiry }];
    },
  },
  {
    id: "noc.not-recorded",
    category: "fire-building",
    label: "Fire NOC not recorded",
    description: "No Fire NOC record exists (or it states No NOC). Low: a missing record is a prompt, not a proven expiry.",
    defaultSeverity: "low",
    defaultEnabled: true,
    thresholds: [],
    action: "building",
    check: (row, ctx) => {
      if (row.noc) {
        // Any recorded date means a record exists — a contradictory flag is
        // the data-conflict rule's job, not "not recorded".
        if (row.noc.issuedDate) return [];
        const status = deriveFireNocStatus(
          row.noc.nocAvailable ?? null,
          row.noc.expiryDate ?? null,
          row.noc.status ?? null,
          ctx.today,
        );
        if (status !== "Not Obtained" || row.noc.expiryDate) return [];
      }
      return [{ reason: "Fire NOC not recorded", since: null }];
    },
  },
  {
    id: "building.dilapidated",
    category: "fire-building",
    label: "Building Dilapidated",
    description: "The building status is Dilapidated.",
    defaultSeverity: "high",
    defaultEnabled: true,
    thresholds: [],
    action: "building",
    check: (row) => (dilapidated(row) ? [{ reason: "Building is Dilapidated", since: null }] : []),
  },

  /* ---------------------------- Data conflicts ----------------------- */
  {
    id: "data.surveillance-future",
    category: "data-conflicts",
    label: "Surveillance Done date in the future",
    description: "A stored Done date cannot be a real visit because it is after today.",
    defaultSeverity: "high",
    defaultEnabled: true,
    thresholds: [],
    action: "surveillance",
    check: (row, ctx) => {
      const visits = [
        { key: "surv1", label: "1st surveillance", done: row.nqas?.surveillanceDone1 ?? null },
        { key: "surv2", label: "2nd surveillance", done: row.nqas?.surveillanceDone2 ?? null },
      ];
      return visits
        .filter((visit) => !!visit.done && visit.done > ctx.today)
        .map((visit) => ({
          reason: `${visit.label} Done date ${dmy(visit.done)} is in the future — fix it in Admin → Data checks → Surveillance dates`,
          since: visit.done,
          suffix: visit.key,
        }));
    },
  },
  {
    id: "data.certified-no-date",
    category: "data-conflicts",
    label: "Certified without a date or score",
    description: "Certification status is certified but neither a certification/GoI date nor a score is recorded.",
    defaultSeverity: "medium",
    defaultEnabled: true,
    thresholds: [],
    action: "nqas",
    check: (row) => {
      if (!isCertified(row)) return [];
      if (row.nqas?.certificationDate || row.nqas?.goiLetterDate) return [];
      if (row.nqas?.scorePercent != null) return [];
      return [{ reason: "Certified without a certification date or score", since: null }];
    },
  },
  {
    id: "data.nqas-completed-no-score",
    category: "data-conflicts",
    label: "NQAS assessment completed without a score",
    description: "The NQAS status is Completed but no score is stored.",
    defaultSeverity: "medium",
    defaultEnabled: true,
    thresholds: [],
    action: "nqas",
    check: (row) => {
      if ((row.nqas?.status ?? "").toLowerCase() !== "completed") return [];
      if (row.nqas?.scorePercent != null) return [];
      return [
        {
          reason: "NQAS assessment completed without a score",
          since: row.nqas?.actualEndDate ?? null,
        },
      ];
    },
  },
  {
    id: "data.certified-not-eligible",
    category: "data-conflicts",
    label: "Certified facility with a Not eligible status",
    description: "Eligibility says Not Eligible while the facility holds a certificate — the stronger fact wins.",
    defaultSeverity: "high",
    defaultEnabled: true,
    thresholds: [],
    action: "eligibility",
    check: (row) =>
      isCertified(row) && /^not eligible$/i.test((row.facility.eligibility ?? "").trim())
        ? [{ reason: 'Certified facility is marked "Not Eligible"', since: null }]
        : [],
  },
  {
    id: "data.nin-missing",
    category: "data-conflicts",
    label: "NIN missing",
    description: "The NIN field is explicitly blank — the facility cannot be matched to the SaQsham portal.",
    defaultSeverity: "low",
    defaultEnabled: true,
    thresholds: [],
    action: "overview",
    check: (row) => {
      const nin = row.facility.ninNumber;
      if (nin == null) return []; // not loaded ≠ missing
      if (String(nin).trim() !== "") return [];
      return [{ reason: "NIN is missing — the facility cannot be matched to the SaQsham portal", since: null }];
    },
  },
  {
    id: "data.noc-derived",
    category: "data-conflicts",
    label: "NOC Available is blank beside a Fire NOC record",
    description: "A Fire NOC record exists but its Available flag was never confirmed; the display derives Yes.",
    defaultSeverity: "low",
    defaultEnabled: true,
    thresholds: [],
    action: "building",
    check: (row) => {
      if (row.noc?.nocAvailable) return [];
      const hasRecord = !!row.noc && (!!row.noc.issuedDate || !!row.noc.expiryDate || !!row.noc.status);
      if (!hasRecord) return [];
      return [
        {
          reason: 'NOC Available is blank but a Fire NOC record exists — confirm the flag in Quick View',
          since: row.noc?.issuedDate ?? null,
        },
      ];
    },
  },
  {
    id: "data.noc-conflict",
    category: "data-conflicts",
    label: "NOC Available is No but NOC dates are recorded",
    description: "A contradictory record: the flag says No NOC, dates say otherwise.",
    defaultSeverity: "medium",
    defaultEnabled: true,
    thresholds: [],
    action: "building",
    check: (row) => {
      if (row.noc?.nocAvailable !== "No") return [];
      if (!row.noc.issuedDate && !row.noc.expiryDate) return [];
      return [{ reason: 'NOC Available is "No" but NOC dates are recorded — confirm in Quick View', since: null }];
    },
  },
  {
    id: "data.sa-date-range",
    category: "data-conflicts",
    label: "State Assessment ended before it started",
    description: "The stored actual end date is earlier than the actual start date.",
    defaultSeverity: "medium",
    defaultEnabled: true,
    thresholds: [],
    action: "state",
    check: (row) => {
      const start = row.sa?.actualStartDate ?? null;
      const end = row.sa?.actualEndDate ?? null;
      if (!start || !end || end >= start) return [];
      return [
        {
          reason: `State Assessment ended on ${dmy(end)}, before it started on ${dmy(start)}`,
          since: start,
        },
      ];
    },
  },
  {
    id: "data.nqas-date-range",
    category: "data-conflicts",
    label: "NQAS assessment ended before its scheduled start",
    description: "The stored actual end date is earlier than the scheduled start date.",
    defaultSeverity: "medium",
    defaultEnabled: true,
    thresholds: [],
    action: "nqas",
    check: (row) => {
      const start = row.nqas?.scheduledStartDate ?? null;
      const end = row.nqas?.actualEndDate ?? null;
      if (!start || !end || end >= start) return [];
      return [
        {
          reason: `NQAS assessment ended on ${dmy(end)}, before its scheduled start on ${dmy(start)}`,
          since: start,
        },
      ];
    },
  },
  {
    id: "data.surveillance-equals-due",
    category: "data-conflicts",
    label: "Surveillance Done date equals its due date",
    description: "A Done date must be the real visit date, not a copy of the deadline.",
    defaultSeverity: "low",
    defaultEnabled: true,
    thresholds: [],
    action: "surveillance",
    check: (row) => {
      const pairs = [
        { key: "surv1", label: "1st surveillance", due: row.nqas?.surveillanceDue1 ?? null, done: row.nqas?.surveillanceDone1 ?? null },
        { key: "surv2", label: "2nd surveillance", due: row.nqas?.surveillanceDue2 ?? null, done: row.nqas?.surveillanceDone2 ?? null },
      ];
      return pairs
        .filter((p) => !!p.done && !!p.due && p.done === p.due)
        .map((p) => ({
          reason: `${p.label} Done date equals the due date — record the real visit date`,
          since: p.done,
          suffix: p.key,
        }));
    },
  },
];

/* -------------------------------------------------------------------------- */
/* Rule lookup + config                                                      */
/* -------------------------------------------------------------------------- */

export const RULE_BY_ID: Record<string, PendingRuleDef> = Object.fromEntries(
  issueRules.map((rule) => [rule.id, rule]),
);

export function defaultPendingConfig(): PendingConfig {
  return {
    rules: Object.fromEntries(
      issueRules.map((rule) => [
        rule.id,
        {
          enabled: rule.defaultEnabled,
          severity: rule.defaultSeverity,
          thresholds: Object.fromEntries(rule.thresholds.map((t) => [t.key, t.default])),
        } satisfies PendingRuleSetting,
      ]),
    ),
    defaultFilters: ["block", "category", "severity", "status"],
  };
}

export const DEFAULT_PENDING_CONFIG: PendingConfig = defaultPendingConfig();

export const PENDING_FILTER_KEYS = [
  "block",
  "facilityType",
  "category",
  "severity",
  "status",
  "cycle",
  "lastUpdated",
  "assignedTo",
] as const;

const SEVERITIES: IssueSeverity[] = ["high", "medium", "low"];

/** Coerce whatever appSettings stored (partial, older, wrong type) into a complete config. */
export function normalizePendingConfig(raw: unknown): PendingConfig {
  const base = defaultPendingConfig();
  const source = (raw ?? {}) as { rules?: Record<string, unknown>; defaultFilters?: unknown };
  for (const rule of issueRules) {
    const stored = source.rules?.[rule.id] as
      | { enabled?: unknown; severity?: unknown; thresholds?: Record<string, unknown> }
      | undefined;
    if (!stored || typeof stored !== "object") continue;
    const setting = base.rules[rule.id];
    if (typeof stored.enabled === "boolean") setting.enabled = stored.enabled;
    if (SEVERITIES.includes(stored.severity as IssueSeverity)) {
      setting.severity = stored.severity as IssueSeverity;
    }
    for (const def of rule.thresholds) {
      const value = stored.thresholds?.[def.key];
      if (typeof value === "number" && Number.isFinite(value)) {
        // Pending rules accept any whole number from 1 to 999, whatever the
        // old per-rule suggestion bounds were. The registry defaults stay put.
        setting.thresholds[def.key] = Math.max(1, Math.min(999, Math.round(value)));
      }
    }
  }
  const filters = Array.isArray(source.defaultFilters)
    ? [...new Set(source.defaultFilters.filter((key): key is string => typeof key === "string"))]
        .filter((key) => (PENDING_FILTER_KEYS as readonly string[]).includes(key))
        .slice(0, 8)
    : base.defaultFilters;
  base.defaultFilters = filters.length ? filters : base.defaultFilters;
  return base;
}

export function enabledRuleCount(config: PendingConfig): { enabled: number; total: number } {
  return {
    enabled: issueRules.filter((rule) => config.rules[rule.id]?.enabled).length,
    total: issueRules.length,
  };
}

/* -------------------------------------------------------------------------- */
/* Evaluation                                                                */
/* -------------------------------------------------------------------------- */

export type ComputePendingOptions = {
  today: string;
  config?: PendingConfig;
  documentRules?: DocumentRules;
  settings?: Partial<LifecycleSettings> | null;
  /** Facility ids the signed-in user may see (server-provided block scope). */
  allowedFacilityIds?: ReadonlySet<string> | null;
};

/** Compute every open issue for every row. Pure and deterministic. */
export function computePendingIssues(
  rows: readonly PendingRow[],
  options: ComputePendingOptions,
): PendingIssue[] {
  const config = options.config ?? DEFAULT_PENDING_CONFIG;
  const ctx: CheckContext = {
    today: options.today,
    documentRules: options.documentRules ?? DEFAULT_DOCUMENT_RULES,
    settings: { ...DEFAULT_SETTINGS, ...(options.settings ?? {}) } as LifecycleSettings,
    latest: latestCompletedQuarter(options.today),
  };
  const out: PendingIssue[] = [];
  for (const row of rows) {
    const facilityId = String(row.facility._id);
    if (options.allowedFacilityIds && !options.allowedFacilityIds.has(facilityId)) continue;
    for (const rule of issueRules) {
      const setting = config.rules[rule.id] ?? {
        enabled: rule.defaultEnabled,
        severity: rule.defaultSeverity,
        thresholds: {},
      };
      if (!setting.enabled) continue;
      let drafts: Draft[] = [];
      try {
        drafts = rule.check(row, ctx, setting) ?? [];
      } catch {
        // A malformed legacy row never breaks the whole list.
        drafts = [];
      }
      for (const draft of drafts) {
        out.push({
          id: `${facilityId}:${rule.id}${draft.suffix ? `:${draft.suffix}` : ""}`,
          facilityId,
          facilityName: row.facility.name,
          block: row.facility.block,
          phc: row.facility.phc,
          facilityType: row.facility.facilityType,
          nin: row.facility.ninNumber ?? null,
          cycleNumber: row.cycleNumber ?? null,
          ruleId: rule.id,
          category: rule.category,
          severity: setting.severity,
          reason: draft.reason,
          since: draft.since ?? null,
          days:
            draft.since && /^\d{4}-\d{2}-\d{2}/.test(draft.since)
              ? daysBetween(draft.since.slice(0, 10), ctx.today)
              : null,
          action: rule.action,
          documentKey: draft.documentKey,
        });
      }
    }
  }
  // Deterministic: High first, oldest condition first, then facility.
  const rank: Record<IssueSeverity, number> = { high: 0, medium: 1, low: 2 };
  out.sort(
    (a, b) =>
      rank[a.severity] - rank[b.severity] ||
      (a.since ?? "9999").localeCompare(b.since ?? "9999") ||
      a.facilityName.localeCompare(b.facilityName) ||
      a.id.localeCompare(b.id),
  );
  return out;
}

/** The state-table key for an issue: one row per facility + rule (visits share one). */
export function stateRuleIdOf(issue: Pick<PendingIssue, "ruleId">): string {
  return issue.ruleId;
}

export function effectiveStatus(state: IssueState | undefined, today: string): IssueStatus {
  const raw = (state?.status ?? "open") as IssueStatus;
  if (!ISSUE_STATUSES.includes(raw)) return "open";
  if (raw === "snoozed" && state?.snoozeUntil && state.snoozeUntil < today) return "open";
  if (raw === "snoozed" && !state?.snoozeUntil) return "open";
  return raw;
}

/** Merge saved follow-up state onto the computed issues; hide open rows the user resolved/snoozed. */
export function mergeIssueStates(
  issues: readonly PendingIssue[],
  states: readonly IssueState[],
  today: string,
): { rows: PendingIssueRow[]; open: PendingIssueRow[]; history: PendingIssueRow[] } {
  const byKey = new Map<string, IssueState>();
  for (const state of states) byKey.set(`${state.facilityId}:${state.ruleId}`, state);
  const openIds = new Set(issues.map((issue) => issue.id));
  const rows: PendingIssueRow[] = issues.map((issue) => {
    const key = `${issue.facilityId}:${stateRuleIdOf(issue)}`;
    const state = byKey.get(key);
    return {
      ...issue,
      stateRuleId: stateRuleIdOf(issue),
      status: effectiveStatus(state, today),
      remark: state?.remark ?? null,
      followUpDate: state?.followUpDate ?? null,
      assignee: state?.assignee ?? null,
      snoozeUntil: state?.snoozeUntil ?? null,
      snoozeReason: state?.snoozeReason ?? null,
      history: false,
      resolvedAt: state?.resolvedAt ?? null,
    };
  });
  // Rows whose condition cleared but whose follow-up was saved: history.
  const history: PendingIssueRow[] = [];
  const seen = new Set<string>();
  for (const state of states) {
    const key = `${state.facilityId}:${state.ruleId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const stillOpen = issues.some(
      (issue) => issue.facilityId === state.facilityId && stateRuleIdOf(issue) === state.ruleId,
    );
    if (stillOpen) continue;
    const rule = RULE_BY_ID[state.ruleId];
    if (!rule) continue;
    history.push({
      id: `${state.facilityId}:${state.ruleId}`,
      facilityId: state.facilityId,
      facilityName: state.facilityName ?? "",
      block: state.block ?? "",
      phc: state.phc ?? "",
      facilityType: state.facilityType ?? "",
      nin: null,
      cycleNumber: null,
      ruleId: state.ruleId,
      category: rule.category,
      severity: rule.defaultSeverity,
      reason: state.lastReason ?? "Condition cleared",
      since: null,
      days: null,
      action: rule.action,
      stateRuleId: state.ruleId,
      status: "resolved",
      remark: state.remark ?? null,
      followUpDate: state.followUpDate ?? null,
      assignee: state.assignee ?? null,
      snoozeUntil: state.snoozeUntil ?? null,
      snoozeReason: state.snoozeReason ?? null,
      history: true,
      resolvedAt: state.resolvedAt ?? state.updatedAt ?? null,
    });
  }
  // `openIds` is intentionally only used to keep the linter honest about the
  // computed set above; history is the complement of it.
  void openIds;
  return { rows, open: rows.filter((row) => row.status !== "resolved" && row.status !== "snoozed"), history };
}

export type PendingCounts = {
  total: number;
  facilities: number;
  high: number;
  byCategory: Record<IssueCategory, number>;
};

export function pendingCounts(issues: readonly PendingIssue[]): PendingCounts {
  const byCategory = Object.fromEntries(ISSUE_CATEGORIES.map((c) => [c, 0])) as Record<IssueCategory, number>;
  const facilities = new Set<string>();
  let high = 0;
  for (const issue of issues) {
    byCategory[issue.category] += 1;
    facilities.add(issue.facilityId);
    if (issue.severity === "high") high += 1;
  }
  return { total: issues.length, facilities: facilities.size, high, byCategory };
}

/** Flat record for the universal FilterBar + search. */
export function pendingFilterRecord(row: PendingIssueRow): Record<string, unknown> {
  return {
    facility: row.facilityName,
    nin: row.nin ?? "",
    reason: row.reason,
    block: row.block,
    facilityType: row.facilityType,
    category: ISSUE_CATEGORY_LABEL[row.category],
    severity: ISSUE_SEVERITY_LABEL[row.severity],
    status: ISSUE_STATUS_LABEL[row.status],
    cycle: row.cycleNumber != null ? `#${row.cycleNumber}` : "No cycle",
    lastUpdated: null,
    assignedTo: row.assignee ?? "",
    remark: row.remark ?? "",
    followUp: row.followUpDate ?? "",
  };
}

export function dueLabel(days: number | null): string {
  if (days == null) return "-";
  if (days === 0) return "Today";
  if (days > 0) return `${days} day${days === 1 ? "" : "s"}`;
  return `in ${Math.abs(days)} days`;
}

/** The sentence under the page title: "212 issues · 74 facilities · 18 High". */
export function pendingHeadline(counts: PendingCounts): string {
  return `${counts.total} issue${counts.total === 1 ? "" : "s"} · ${counts.facilities} facilit${counts.facilities === 1 ? "y" : "ies"} · ${counts.high} High`;
}

export type IssueStateInput = {
  facilityId: string;
  ruleId: string;
  remark?: string;
  followUpDate?: string;
  assignee?: string;
  status: IssueStatus;
  snoozeUntil?: string;
  snoozeReason?: string;
  lastReason?: string;
};

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Validate one follow-up edit. Returns a message, or null when it is valid. */
export function validateIssueState(input: IssueStateInput, today: string): string | null {
  if (!RULE_BY_ID[input.ruleId]) return "Unknown rule";
  if (!input.facilityId) return "Facility is required";
  if (!ISSUE_STATUSES.includes(input.status)) return "Status is not valid";
  if (input.remark && input.remark.length > 2000) return "Remark is limited to 2000 characters";
  if (input.followUpDate && !ISO_RE.test(input.followUpDate)) return "Follow-up date must be YYYY-MM-DD";
  if (input.status === "snoozed") {
    if (!input.snoozeUntil || !ISO_RE.test(input.snoozeUntil)) return "Choose the date to snooze until";
    if (input.snoozeUntil < today) return "Snooze date cannot be in the past";
    if (!input.snoozeReason?.trim()) return "Add a reason for snoozing";
  }
  return null;
}

/** File name: {District} Pending and Attention List {DD-MM-YYYY}. */
export function pendingFileName(district: string | null | undefined, today: string): string {
  const clean = String(district ?? "").replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();
  const [year, month, day] = today.split("-");
  const stamp = year && month && day ? `${day}-${month}-${year}` : today;
  return `${clean || "District"} Pending and Attention List ${stamp}`;
}
