import { D as DEFAULT_SETTINGS, cf as computeDerivedNqas, cg as daysBetween, b$ as DEFAULT_DOCUMENT_RULES, ch as deriveNocAvailability, cc as surveillanceVisits, c4 as requiredDocumentsMissing, ci as formatVisitDate, cj as certifiedSurveillanceStatus, ck as computeCurrentStatus, cd as cellValue, cl as columnsInGroup, aq as isDeprecatedColumn, M as MASTER_COLUMNS } from './AppShell-CP099uvN.js';
import { t as toDdMmmYyyy, g as getLifecycleState } from './facilityProfileState-D76_z1Ay.js';
import { t as todayLocalIso } from './today-D9v8Esj5.js';

const SA_SECTIONS = [
  { id: "schedule", title: "Schedule", hint: "Pick the visit date the team plans to go on." },
  { id: "visit", title: "Visit", hint: "Record when the visit actually happened." },
  { id: "scope", title: "Scope", hint: "Which scope was assessed?" },
  { id: "outcome", title: "Outcome", hint: "Enter the assessment score out of 100." },
  { id: "assessors", title: "Assessors", hint: "Who did the assessment? Names repeat, so they autocomplete." },
  { id: "documents", title: "Documents", hint: "Upload the signed report and checklist, and track the SaQsham file status." }
];
const NQAS_SECTIONS = [
  { id: "schedule", title: "Schedule", hint: "When is the NQAS assessment planned?" },
  { id: "visit", title: "Visit", hint: "Actual dates, mode and the checklist version used." },
  { id: "scope", title: "Scope", hint: "Which scope was assessed?" },
  { id: "outcome", title: "Outcome", hint: "Score, certification result and its dates." },
  { id: "documents", title: "Documents", hint: "Upload the NQAS result sheet." }
];
const SA_FIELDS = [
  { key: "scheduledDate", dbColumn: "SA Scheduled Date", label: "Scheduled date", section: "schedule", type: "date", required: false, helper: "Reschedules are logged with the original date kept.", exportWidth: 40 },
  { key: "actualStartDate", dbColumn: "SA Actual Start Date", label: "Actual start date", section: "visit", type: "date", required: false, helper: "Required once the visit is done. Cannot be in the future.", exportWidth: 40 },
  { key: "actualEndDate", dbColumn: "SA Actual End Date", label: "Actual end date", section: "visit", type: "date", required: false, helper: "Cannot be before the start date.", exportWidth: 40 },
  { key: "scopeOption", dbColumn: "Scope", label: "Scope", section: "scope", type: "select", required: false, helper: "Optional — one scope from the Admin list.", exportWidth: 48 },
  { key: "scorePercent", dbColumn: "SA Score %", label: "Score %", section: "outcome", type: "number", required: false, helper: "0–100, one decimal. Green ≥ 70, amber 50–69, red < 50.", align: "right", exportWidth: 20 },
  { key: "assessor1Name", dbColumn: "Name of Assessor 1", label: "Assessor 1 — name", section: "assessors", type: "text", required: false, helper: "Autocompletes from assessors used before.", exportWidth: 40 },
  { key: "assessor1Designation", dbColumn: "Assessor 1 Designation", label: "Assessor 1 — designation", section: "assessors", type: "text", required: false, helper: "Free text — suggestions from earlier entries.", exportWidth: 30 },
  { key: "assessor1Phone", dbColumn: "Assessor 1 Contact Number", label: "Assessor 1 — contact number", section: "assessors", type: "text", required: false, helper: "10-digit mobile starting 6–9; stored as +91.", exportWidth: 24 },
  { key: "assessor1Hud", dbColumn: "Assessors 1 HUD", label: "Assessor 1 — HUD", section: "assessors", type: "select", required: false, helper: "Suggested from this assessor's last entry.", exportWidth: 24 },
  { key: "assessor2Name", dbColumn: "Name of Assessor 2", label: "Assessor 2 — name", section: "assessors", type: "text", required: false, helper: "Optional — most visits have one assessor.", exportWidth: 40 },
  { key: "assessor2Designation", dbColumn: "Assessor 2 Designation", label: "Assessor 2 — designation", section: "assessors", type: "text", required: false, exportWidth: 30 },
  { key: "assessor2Phone", dbColumn: "Assessor 2 Contact Number", label: "Assessor 2 — contact number", section: "assessors", type: "text", required: false, exportWidth: 24 },
  { key: "assessor2Hud", dbColumn: "Assessors 2 HUD", label: "Assessor 2 — HUD", section: "assessors", type: "select", required: false, exportWidth: 24 },
  { key: "reportAttachmentId", dbColumn: "SA Report (PDF)", label: "SA Report (PDF)", section: "documents", type: "file", required: false, helper: "PDF up to 10 MB. Required once the visit is completed.", exportWidth: 40 },
  { key: "checklistAttachmentId", dbColumn: "SA Checklist (Excel)", label: "SA Checklist (Excel)", section: "documents", type: "file", required: false, helper: "Excel checklist filled during the visit.", exportWidth: 40 },
  { key: "generalDocStatus", dbColumn: "General Documents Status", label: "SaQsham Documents Status", section: "documents", type: "segmented", required: false, helper: "Where the SaQsham document file is right now.", exportWidth: 40 }
];
const NQAS_FIELDS = [
  { key: "scheduledStartDate", dbColumn: "NQAS Scheduled Start Date", label: "Scheduled start date", section: "schedule", type: "date", required: false, helper: "Reschedules are logged with the original date kept.", exportWidth: 40 },
  { key: "scheduledEndDate", dbColumn: "NQAS Scheduled End Date", label: "Scheduled end date", section: "schedule", type: "date", required: false, exportWidth: 40 },
  { key: "actualStartDate", dbColumn: "NQAS Actual Start Date", label: "Actual start date", section: "visit", type: "date", required: false, helper: "Required once the assessment is done. Cannot be in the future.", exportWidth: 40 },
  { key: "actualEndDate", dbColumn: "NQAS Actual End Date", label: "Actual end date", section: "visit", type: "date", required: false, helper: "Cannot be before the start date.", exportWidth: 40 },
  { key: "mode", dbColumn: "Mode of Assessment", label: "Mode", section: "visit", type: "segmented", required: false, exportWidth: 24 },
  { key: "checklistVersion", dbColumn: "Certification Criteria / Checklist Version", label: "Checklist version", section: "visit", type: "select", required: false, exportWidth: 32 },
  { key: "scopeOption", dbColumn: "Scope", label: "Scope", section: "scope", type: "select", required: false, helper: "Optional — one scope from the Admin list.", exportWidth: 48 },
  { key: "scorePercent", dbColumn: "NQAS Score %", label: "Score %", section: "outcome", type: "number", required: false, helper: "0–100, one decimal.", align: "right", exportWidth: 20 },
  { key: "certificationStatus", dbColumn: "Certification Status", label: "Certification status", section: "outcome", type: "segmented", required: false, helper: "Pick the result from the NQAS letter.", exportWidth: 40 },
  { key: "certificationDate", dbColumn: "GoI Letter Date / Certification date", label: "GoI letter date", section: "outcome", type: "date", required: false, helper: "The date on the Government of India letter. Validity is computed from it.", exportWidth: 40 },
  { key: "resultDocumentId", dbColumn: "NQAS Result", label: "NQAS Result (file)", section: "documents", type: "file", required: false, helper: "PDF of the result sheet. Required for a Certified result.", exportWidth: 40 }
];
Object.fromEntries(
  [...SA_FIELDS, ...NQAS_FIELDS].map((f) => [f.key, f])
);
const SCORE_THRESHOLDS = { good: 70, fair: 50 };
function scoreTone(value) {
  if (value == null) return "grey";
  if (value >= SCORE_THRESHOLDS.good) return "green";
  if (value >= SCORE_THRESHOLDS.fair) return "amber";
  return "red";
}
function formatInr(value) {
  if (value == null || Number.isNaN(value)) return "—";
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}
function dueChip(daysLeft, label = "surveillance") {
  if (daysLeft == null) return null;
  if (daysLeft < 0) return { label: `Overdue ${Math.abs(daysLeft)}d`, tone: "red" };
  if (daysLeft === 0) return { label: `Due today`, tone: "amber" };
  if (daysLeft <= 30) return { label: `Due in ${daysLeft}d`, tone: "amber" };
  return { label: `Due in ${daysLeft}d`, tone: label === "surveillance" ? "blue" : "green" };
}
const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function dmy(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  const mi = Number(m) - 1;
  if (!y || Number.isNaN(mi) || !MONTH_ABBR[mi] || !d) return iso;
  return `${d}-${MONTH_ABBR[mi]}-${y}`;
}
function dateOnly(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const pad2 = (v) => String(v).padStart(2, "0");
  const real = (y, m, d) => {
    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    const probe = new Date(Date.UTC(y, m - 1, d));
    return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
  };
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(s);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    return real(y, m, d) ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;
  }
  const named = /^(\d{1,2})[-/ ]([A-Za-z]{3,9})[-/ ](\d{4})$/.exec(s);
  if (named) {
    const mi = MONTH_ABBR.findIndex(
      (m) => m.toLowerCase() === named[2].slice(0, 3).toLowerCase()
    );
    const d = Number(named[1]);
    const y = Number(named[3]);
    return mi >= 0 && real(y, mi + 1, d) ? `${y}-${pad2(mi + 1)}-${pad2(d)}` : null;
  }
  const numeric = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(s);
  if (numeric) {
    const d = Number(numeric[1]);
    const m = Number(numeric[2]);
    const y = Number(numeric[3]);
    return real(y, m, d) ? `${y}-${pad2(m)}-${pad2(d)}` : null;
  }
  return null;
}
const DATE_RANGE_RULES = [
  {
    id: "nqas-scheduled",
    kind: "scheduled",
    start: "nqas.scheduledStartDate",
    end: "nqas.scheduledEndDate",
    startLabel: "NQAS scheduled start",
    endLabel: "NQAS scheduled end",
    severity: "blocking"
  },
  {
    id: "sa-actual",
    kind: "actual",
    start: "sa.actualStartDate",
    end: "sa.actualEndDate",
    startLabel: "State Assessment actual start",
    endLabel: "State Assessment actual end",
    severity: "blocking"
  },
  {
    id: "nqas-actual",
    kind: "actual",
    start: "nqas.actualStartDate",
    end: "nqas.actualEndDate",
    startLabel: "NQAS actual start",
    endLabel: "NQAS actual end",
    severity: "blocking"
  },
  {
    id: "noc-validity",
    kind: "noc",
    start: "noc.issuedDate",
    end: "noc.expiryDate",
    startLabel: "Fire NOC issue date",
    endLabel: "Fire NOC validity",
    severity: "blocking"
  },
  {
    id: "certification-validity",
    kind: "certification",
    start: "nqas.certificationDate",
    end: "nqas.validityDate",
    startLabel: "Certification date",
    endLabel: "Certificate validity",
    severity: "blocking"
  }
];
function dateRangeProblem(startRaw, endRaw) {
  const start = dateOnly(startRaw);
  const end = dateOnly(endRaw);
  if (!start || !end) return null;
  if (end >= start) return null;
  return { start, end };
}
function dateRangeViolations(get, rules = DATE_RANGE_RULES) {
  const out = [];
  for (const rule of rules) {
    const problem = dateRangeProblem(get(rule.start), get(rule.end));
    if (!problem) continue;
    out.push({
      rule,
      start: problem.start,
      end: problem.end,
      message: `${rule.endLabel} ${dmy(problem.end)} is before ${rule.startLabel} ${dmy(problem.start)}. Fix ${rule.severity === "warning" ? "the schedule" : "start date"}.`
    });
  }
  return out;
}
function parseScore(raw) {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (Number.isNaN(n)) return null;
  return Math.min(100, Math.max(0, Math.round(n * 10) / 10));
}
function validateVisitDates(prefix, start, end, today, startLabel, endLabel) {
  const issues = [];
  const problem = dateRangeProblem(start, end);
  if (problem) {
    issues.push({
      field: `${prefix}.actualEndDate`,
      label: endLabel,
      message: `${endLabel} (${dmy(problem.end)}) is before the start date (${dmy(problem.start)}). Pick the same day or a later one.`
    });
  }
  for (const [field, value, label] of [
    [`${prefix}.actualStartDate`, start, startLabel],
    [`${prefix}.actualEndDate`, end, endLabel]
  ]) {
    if (value && value > today) {
      issues.push({
        field,
        label,
        message: `${label} (${dmy(value)}) is in the future. Actual visit dates can only be today or a past date — use the scheduled date for the plan.`
      });
    }
  }
  return issues;
}
function validateSaDraft(draft, today) {
  const issues = [];
  const score = parseScore(draft.scorePercent);
  const done = !!draft.actualEndDate || !!draft.actualStartDate || draft.scorePercent !== "" && score != null;
  issues.push(
    ...validateVisitDates(
      "sa",
      draft.actualStartDate,
      draft.actualEndDate,
      today,
      "Actual start date",
      "Actual end date"
    )
  );
  if (draft.scorePercent !== "" && score == null) {
    issues.push({
      field: "sa.scorePercent",
      label: "Score %",
      message: `“${draft.scorePercent}” is not a number. Enter the score as digits, e.g. 78 or 78.5 (0–100).`
    });
  }
  if (score != null && (score < 0 || score > 100)) {
    issues.push({
      field: "sa.scorePercent",
      label: "Score %",
      message: `Score must be between 0 and 100. You entered ${score}.`
    });
  }
  if (done) {
    if (!draft.actualStartDate || !draft.actualEndDate) {
      issues.push({
        field: "sa.actualStartDate",
        label: "Actual dates",
        message: "A completed visit needs both an actual start date and an actual end date. Fill the missing date, or clear the other visit fields to keep the assessment pending."
      });
    }
    if (score == null) {
      issues.push({
        field: "sa.scorePercent",
        label: "Score %",
        message: "A completed visit needs its score. Enter the assessment score (0–100)."
      });
    }
  }
  return issues;
}
function validateNqasDraft(draft, ctx) {
  const issues = [];
  const score = parseScore(draft.scorePercent);
  const naDone = !!draft.actualEndDate || !!draft.actualStartDate;
  const certified = draft.certificationStatus === "Quality Certified" || draft.certificationStatus === "Quality Certified with Conditionality";
  issues.push(
    ...validateVisitDates(
      "nqas",
      draft.actualStartDate,
      draft.actualEndDate,
      ctx.today,
      "Actual start date",
      "Actual end date"
    )
  );
  const scheduledProblem = dateRangeProblem(draft.scheduledStartDate, draft.scheduledEndDate);
  if (scheduledProblem) {
    issues.push({
      field: "nqas.scheduledEndDate",
      label: "Scheduled end date",
      message: `Scheduled end date (${dmy(scheduledProblem.end)}) is before the scheduled start (${dmy(scheduledProblem.start)}).`
    });
  }
  if (draft.scorePercent !== "" && score == null) {
    issues.push({
      field: "nqas.scorePercent",
      label: "Score %",
      message: `“${draft.scorePercent}” is not a number. Enter the score as digits, e.g. 82 or 82.5 (0–100).`
    });
  }
  if (score != null && (score < 0 || score > 100)) {
    issues.push({
      field: "nqas.scorePercent",
      label: "Score %",
      message: `Score must be between 0 and 100. You entered ${score}.`
    });
  }
  if ((naDone || certified || draft.certificationStatus === "Deferred") && !ctx.saCompleted) {
    issues.push({
      field: "nqas.certificationStatus",
      label: "NQAS result",
      message: "The State Assessment of this cycle is not marked Completed, so the NQAS assessment cannot be recorded as completed or certified. Complete the State Assessment tab first (actual dates + score), or ask a State Admin to correct the cycle."
    });
  }
  if (naDone) {
    if (!draft.actualStartDate || !draft.actualEndDate) {
      issues.push({
        field: "nqas.actualStartDate",
        label: "Actual dates",
        message: "A completed assessment needs both an actual start date and an actual end date."
      });
    }
    if (score == null) {
      issues.push({
        field: "nqas.scorePercent",
        label: "Score %",
        message: "A completed assessment needs its score (0–100)."
      });
    }
  }
  if (certified) {
    if (!draft.certificationDate) {
      issues.push({
        field: "nqas.certificationDate",
        label: "GoI letter date",
        message: "A Certified result needs the GoI letter date — validity and both surveillance due dates are calculated from it."
      });
    }
  }
  const docRule = ctx.resultDocRule ?? { required: certified, blocking: certified, label: "NQAS Result" };
  const blockingDoc = docRule.required && docRule.blocking;
  const resultUploaded = ctx.resultDocUploaded ?? !!draft.resultDocumentId;
  if (blockingDoc && !resultUploaded) {
    issues.push({
      field: "nqas.resultDocumentId",
      label: docRule.label,
      message: `${docRule.label} must be uploaded under Documents before this assessment can be saved. Upload it in the Documents section below, then save again.`
    });
  }
  return issues;
}
function needsAttention(input) {
  const s = { ...DEFAULT_SETTINGS, ...input.settings ?? {} };
  const out = [];
  const { sa, nqas, today } = input;
  if (sa?.status === "Completed" && (!sa.actualStartDate || !sa.actualEndDate)) {
    out.push({
      id: "sa-dates-missing",
      severity: "danger",
      title: "State Assessment marked Completed without visit dates",
      detail: "A completed assessment must record when the visit happened. Add the actual start and end dates.",
      tab: "state",
      focus: "sa.actualStartDate",
      fixLabel: "Add the dates"
    });
  }
  if (sa?.status === "Completed" && !sa.reportAttachmentId && !sa.hasReportDocument) {
    out.push({
      id: "sa-report-missing",
      severity: "warning",
      title: "SA report not uploaded",
      detail: "The State Assessment is completed but the signed SA report (PDF) is missing from Documents.",
      tab: "state",
      focus: "sa.reportAttachmentId",
      fixLabel: "Upload the report"
    });
  }
  if (sa?.scheduledDate && sa.status !== "Completed" && sa.scheduledDate < today) {
    out.push({
      id: "sa-date-past",
      severity: "warning",
      title: "Scheduled SA visit date has passed",
      detail: `The visit was planned for ${dmy(sa.scheduledDate)} but is not recorded as completed. Reschedule it or record the visit.`,
      tab: "state",
      focus: "sa.scheduledDate",
      fixLabel: "Update the schedule"
    });
  }
  const nqasScore = nqas?.scorePercent ?? nqas?.manualScore ?? null;
  const certified = nqas?.certificationStatus === "Quality Certified" || nqas?.certificationStatus === "Quality Certified with Conditionality";
  if (nqas?.status === "Completed" && nqasScore == null) {
    out.push({
      id: "nqas-score-missing",
      severity: "danger",
      title: "NQAS completed but no score recorded",
      detail: "Enter the assessment score so the facility's current status and reports stay correct.",
      tab: "national",
      focus: "nqas.scorePercent",
      fixLabel: "Add the score"
    });
  }
  if (certified && !nqas?.certificationDate && !nqas?.goiLetterDate) {
    out.push({
      id: "nqas-cert-no-date",
      severity: "danger",
      title: "Certified without a GoI letter date",
      detail: "The result says Certified but no certification date is recorded, so validity cannot be calculated.",
      tab: "national",
      focus: "nqas.certificationDate",
      fixLabel: "Add the letter date"
    });
  }
  if (certified && !nqas?.resultDocumentId && !nqas?.hasResultDocument) {
    out.push({
      id: "nqas-result-missing",
      severity: "warning",
      title: "Certified but NQAS result file missing",
      detail: "Upload the NQAS result sheet so the certificate has its supporting document.",
      tab: "national",
      focus: "nqas.resultDocumentId",
      fixLabel: "Upload the result"
    });
  }
  if (sa?.status !== "Completed" && nqas && (nqas.status === "Completed" || certified)) {
    out.push({
      id: "nqas-before-sa",
      severity: "danger",
      title: "NQAS recorded before the State Assessment",
      detail: "This cycle's NQAS assessment is completed while its State Assessment is not — the two records contradict each other.",
      tab: "national",
      focus: "nqas.certificationStatus",
      fixLabel: "Review the cycle"
    });
  }
  const derived = nqas ? computeDerivedNqas(nqas, s) : null;
  const validity = nqas?.validityDate ?? derived?.validityDate ?? null;
  if (certified && validity) {
    const left = daysBetween(validity, today);
    if (left < 0) {
      out.push({
        id: "cert-expired",
        severity: "danger",
        title: `Certificate expired ${Math.abs(left)} days ago`,
        detail: `Validity ended on ${dmy(validity)}. Start the recertification cycle.`,
        tab: "national",
        fixLabel: "Start recertification"
      });
    } else if (left <= s.recertificationAlertLeadDays) {
      out.push({
        id: "cert-expiring",
        severity: "warning",
        title: `Certificate expires in ${left} days`,
        detail: `Validity ends on ${dmy(validity)}. Begin recertification now to avoid a gap.`,
        tab: "national",
        fixLabel: "Plan recertification"
      });
    }
  }
  for (const [key, due] of [
    ["surv1", derived?.surveillanceDue1 ?? null],
    ["surv2", derived?.surveillanceDue2 ?? null]
  ]) {
    if (due && due < today) {
      out.push({
        id: `${key}-overdue`,
        severity: "danger",
        title: `Surveillance visit overdue since ${dmy(due)}`,
        detail: "The scheduled surveillance visit has passed. Record the visit or reschedule it with the state team.",
        tab: "national",
        fixLabel: "Review surveillance dates"
      });
    }
  }
  for (const noc of input.nocs) {
    const status = noc.expiryDate ? noc.expiryDate < today ? "Expired" : daysBetween(noc.expiryDate, today) <= s.fireNocAlertLeadDays ? "Expiring Soon" : "Valid" : noc.status;
    if (status === "Expired") {
      out.push({
        id: `noc-expired-${noc.expiryDate}`,
        severity: "warning",
        title: `Fire NOC expired on ${dmy(noc.expiryDate)}`,
        detail: "Apply for renewal and record the new NOC under the Fire NOC tab.",
        tab: "noc",
        fixLabel: "Renew the NOC"
      });
    }
  }
  const pending = input.funds.filter((f) => f.status === "Pending" || f.status === "Returned").length;
  if (pending > 0) {
    out.push({
      id: "funds-open",
      severity: "info",
      title: `${pending} gap-closure fund record${pending === 1 ? "" : "s"} still pending`,
      detail: "Sanctioned funds that are pending or returned are real infrastructure gaps.",
      tab: "funds",
      fixLabel: "Review funds"
    });
  }
  const order = { danger: 0, warning: 1, info: 2 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}
function fieldCompleteness(defs, values) {
  let filled = 0;
  for (const d of defs) {
    const v = values[d.key];
    if (Array.isArray(v)) {
      if (v.length > 0) filled++;
    } else if (v != null && String(v).trim() !== "") filled++;
  }
  return { filled, total: defs.length };
}
function sectionSummaries(input) {
  const s = { ...DEFAULT_SETTINGS, ...input.settings ?? {} };
  const { sa, nqas, today } = input;
  const saDone = sa?.status === "Completed";
  const saComplete = fieldCompleteness(SA_FIELDS, sa ?? {});
  const saChip = saDone ? { label: "Completed", tone: "green" } : sa?.status === "Scheduled" ? { label: "Scheduled", tone: "blue" } : { label: "Not initiated", tone: "grey" };
  const nqasComplete = fieldCompleteness(NQAS_FIELDS, nqas ?? {});
  const cert = nqas?.certificationStatus ?? "";
  const nqasChip = cert === "Quality Certified" ? { label: "Certified", tone: "green" } : cert === "Quality Certified with Conditionality" ? { label: "Conditionality", tone: "amber" } : cert === "Deferred" ? { label: "Deferred", tone: "red" } : nqas?.status === "Completed" ? { label: "Result awaited", tone: "purple" } : nqas?.status === "Scheduled" ? { label: "Scheduled", tone: "blue" } : { label: "Pending", tone: "grey" };
  const fundTotal = input.funds.reduce((a, f) => a + (f.amountSanctioned ?? 0), 0);
  const openFunds = input.funds.filter((f) => f.status === "Pending" || f.status === "Returned").length;
  const fundedYears = input.funds.map((f) => f.financialYear ?? "").filter(Boolean);
  const latestFundYear = fundedYears.length ? [...fundedYears].sort()[fundedYears.length - 1] : null;
  const latestNoc = input.nocs[input.nocs.length - 1] ?? null;
  const nocStatus = latestNoc?.expiryDate ? latestNoc.expiryDate < today ? "Expired" : daysBetween(latestNoc.expiryDate, today) <= s.fireNocAlertLeadDays ? "Expiring Soon" : "Valid" : latestNoc?.status ?? "Not Obtained";
  const nocChipTone = nocStatus === "Valid" ? "green" : nocStatus === "Expiring Soon" ? "amber" : nocStatus === "Expired" ? "red" : "grey";
  const latestBuilding = input.buildings[input.buildings.length - 1] ?? null;
  const buildingTone = latestBuilding?.buildingStatus === "Good" ? "green" : latestBuilding?.buildingStatus === "Dilapidated" ? "red" : latestBuilding ? "amber" : "grey";
  const derived = nqas ? computeDerivedNqas(nqas, s) : null;
  const validityTo = nqas?.validityDate ?? derived?.validityDate ?? null;
  return [
    {
      key: "state",
      title: "State Assessment",
      tab: "state",
      chip: saChip,
      filled: saComplete.filled,
      total: saComplete.total,
      rows: [
        { label: "Scheduled", value: sa?.scheduledDate ? dmy(sa.scheduledDate) : "—" },
        { label: "Visit", value: sa?.actualStartDate ? `${dmy(sa.actualStartDate)} → ${dmy(sa.actualEndDate)}` : "—" },
        { label: "Score", value: sa?.scorePercent != null ? `${sa.scorePercent}%` : "—" },
        { label: "Assessor 1", value: sa?.assessor1Name ?? "—" }
      ]
    },
    {
      key: "national",
      title: "NQAS Assessment",
      tab: "national",
      chip: nqasChip,
      filled: nqasComplete.filled,
      total: nqasComplete.total,
      rows: [
        { label: "Visit", value: nqas?.actualStartDate ? `${dmy(nqas.actualStartDate)} → ${dmy(nqas.actualEndDate)}` : "—" },
        { label: "Mode", value: nqas?.mode ?? "—" },
        { label: "Score", value: (nqas?.scorePercent ?? nqas?.manualScore) != null ? `${nqas?.scorePercent ?? nqas?.manualScore}%` : "—" },
        { label: "Valid till", value: validityTo ? dmy(validityTo) : "—" }
      ]
    },
    {
      key: "funds",
      title: "Gap Closure Fund",
      tab: "funds",
      chip: openFunds > 0 ? { label: `${openFunds} pending`, tone: "amber" } : input.funds.length > 0 ? { label: "Received", tone: "green" } : { label: "No records", tone: "grey" },
      filled: input.funds.length,
      total: Math.max(1, input.funds.length),
      rows: [
        { label: "Sanctioned", value: input.funds.length ? formatInr(fundTotal) : "—" },
        { label: "Latest FY", value: latestFundYear ?? "—" },
        { label: "Records", value: String(input.funds.length) }
      ]
    },
    {
      key: "noc",
      title: "Fire NOC",
      tab: "noc",
      chip: { label: nocStatus, tone: nocChipTone },
      filled: latestNoc?.expiryDate ? 1 : 0,
      total: 1,
      rows: [
        { label: "NOC number", value: latestNoc && "nocNumber" in latestNoc ? String(latestNoc.nocNumber ?? "—") : "—" },
        { label: "Valid till", value: latestNoc?.expiryDate ? dmy(latestNoc.expiryDate) : "—" }
      ]
    },
    {
      key: "building",
      title: "Building",
      tab: "building",
      chip: latestBuilding?.buildingStatus ? { label: latestBuilding.buildingStatus, tone: buildingTone } : { label: "No records", tone: "grey" },
      filled: latestBuilding ? 1 : 0,
      total: 1,
      rows: [
        { label: "Type", value: latestBuilding?.buildingType ?? "—" },
        { label: "Status", value: latestBuilding?.buildingStatus ?? "—" }
      ]
    }
  ];
}
function nextSurveillance(nqas, settings, today) {
  const s = { ...DEFAULT_SETTINGS, ...settings ?? {} };
  const d = computeDerivedNqas(nqas ?? { }, s);
  const candidates = [d.surveillanceDue1, d.surveillanceDue2].filter(Boolean);
  if (candidates.length === 0) return null;
  const date = candidates.sort()[0];
  return { date, daysLeft: daysBetween(date, today ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)) };
}

const QV_STAGES = [
  { key: "eligibility", label: "Eligibility", short: "Eligibility" },
  { key: "sa", label: "State Assessment", short: "State" },
  { key: "nqas", label: "NQAS Assessment", short: "NQAS" },
  { key: "certification", label: "Certification", short: "Certified" },
  { key: "surveillance", label: "Surveillance", short: "Surveillance" },
  { key: "recertification", label: "Recertification", short: "Recert" }
];
const PIPELINE_ORDER = [
  "notEligible",
  "notStarted",
  "internalAssessment",
  "stateAssessment",
  "naScheduled",
  "resultAwaited",
  "certified"
];
function deriveStage(row, settings, today = todayLocalIso()) {
  const facility = row.facility;
  const eligibility = facility.eligibility ?? "Eligible";
  const lifecycle = getLifecycleState({
    facility: {
      ...facility,
      eligibility,
      currentCycleNumber: row.cycleNumber ?? null
    },
    activeCycle: {
      cycleNumber: row.cycleNumber ?? 1,
      cycleType: row.cycleType ?? "Initial",
      sa: row.sa ?? null,
      nqas: row.nqas ?? null
    },
    funds: row.fund ? [{ status: row.fund.status ?? "" }] : [],
    s: settings ?? null,
    today
  });
  const stage = lifecycle.stage;
  const rank = PIPELINE_ORDER.indexOf(stage);
  const atLeast = (key) => rank >= PIPELINE_ORDER.indexOf(key);
  const blocked = eligibility !== "Eligible" && stage !== "certified";
  const blockedReason = blocked ? eligibility === "Possible" ? "Future candidate — the facility is not eligible for NQAS yet." : "Not Eligible — the NQAS lifecycle has not started for this facility." : null;
  const state = (doneWhen, currentWhen) => blocked ? "upcoming" : doneWhen ? "done" : currentWhen ? "current" : "upcoming";
  const dates = lifecycle.stageDates;
  const detailFor = (key) => {
    const raw = key === "sa" ? dates.stateAssessment?.date : key === "nqas" ? dates.naScheduled?.date : key === "certification" ? dates.certified?.date : void 0;
    return raw ? toDdMmmYyyy(raw) : void 0;
  };
  const s = { ...DEFAULT_SETTINGS, ...settings ?? {} };
  const visits = surveillanceVisits(
    row.nqas ?? null,
    s,
    today
  );
  const nextVisit = visits.find(
    (v) => v.state === "overdue" || v.state === "dueSoon" || v.state === "upcoming"
  );
  const visitWarning = visits.some((v) => v.state === "overdue" || v.state === "dueSoon");
  const validity = row.nqas?.validityDate ?? null;
  const recertDays = validity ? Math.round((Date.parse(validity) - Date.parse(today)) / 864e5) : null;
  const recertDue = !!validity && recertDays != null && recertDays <= s.recertificationAlertLeadDays;
  const nqasResultFile = row.docs && Array.isArray(row.docs.keys) ? row.docs.keys.includes("NQAS_Result") : null;
  const certFileMissing = !blocked && atLeast("certified") && nqasResultFile === false;
  const stages = QV_STAGES.map(({ key, label }) => {
    if (key === "eligibility") {
      return {
        key,
        label,
        state: blocked ? "blocked" : "done",
        detail: blocked ? "Blocked" : eligibility,
        tooltip: blocked ? blockedReason ?? void 0 : `Eligibility is ${eligibility} — the lifecycle gate is open.`
      };
    }
    if (key === "sa") {
      return {
        key,
        label,
        // Internal Assessment runs before the State Assessment and is NOT a
        // stage of its own (task §6), so a not-started/internal-assessment
        // facility shows State Assessment as the Current step — never an
        // empty stepper with no current stage at all.
        state: state(
          atLeast("naScheduled"),
          stage === "stateAssessment" || stage === "internalAssessment" || stage === "notStarted"
        ),
        detail: detailFor(key),
        tooltip: blocked ? blockedReason ?? void 0 : void 0
      };
    }
    if (key === "nqas") {
      return {
        key,
        label,
        state: state(
          atLeast("certified"),
          stage === "naScheduled" || stage === "resultAwaited"
        ),
        detail: detailFor(key),
        tooltip: blocked ? blockedReason ?? void 0 : void 0
      };
    }
    if (key === "certification") {
      return {
        key,
        label,
        state: blocked ? "upcoming" : certFileMissing ? "warning" : atLeast("certified") ? "done" : "upcoming",
        detail: detailFor(key),
        tooltip: blocked ? blockedReason ?? void 0 : certFileMissing ? "Certified without the NQAS Result file — upload it under Documents." : void 0
      };
    }
    if (key === "surveillance") {
      if (blocked || !atLeast("certified")) {
        return {
          key,
          label,
          state: "upcoming",
          tooltip: blocked ? blockedReason ?? void 0 : void 0
        };
      }
      return {
        key,
        label,
        state: visitWarning ? "warning" : "current",
        detail: nextVisit ? `${nextVisit.label} · ${formatVisitDate(nextVisit.due)}` : "Surveillance complete",
        tooltip: visitWarning ? visits.filter((v) => v.state === "overdue" || v.state === "dueSoon").map((v) => `${v.label}: ${v.chip} (due ${formatVisitDate(v.due)})`).join(" · ") : nextVisit ? `${nextVisit.label} is open — due ${formatVisitDate(nextVisit.due)}.` : "Both surveillance visits are recorded."
      };
    }
    return {
      key,
      label,
      state: blocked ? "upcoming" : !atLeast("certified") ? "upcoming" : recertDue ? "warning" : "upcoming",
      detail: validity ? `Valid till ${validity.slice(0, 4)}` : void 0,
      tooltip: recertDue ? `Certificate validity ends ${toDdMmmYyyy(validity)} — start recertification.` : validity ? `Next full recertification: ${validity.slice(0, 4)}.` : void 0
    };
  });
  const current = stages.find(
    (st) => st.state === "current" || st.state === "blocked" || st.state === "warning"
  );
  const currentKey = current?.key ?? "eligibility";
  return {
    stages,
    currentKey,
    index: QV_STAGES.findIndex((st) => st.key === currentKey) + 1,
    status: lifecycle.status,
    blockedReason,
    nextAction: lifecycle.nextAction.text
  };
}
const QV_DOCUMENT_KEYS = [
  "documents",
  "saReport",
  "saChecklist",
  "condemnedLink",
  "nocDoc",
  "procLink"
];
const DOC_KEYS = new Set(QV_DOCUMENT_KEYS);
const QV_SECTIONS = [
  { key: "overview", label: "Overview", group: "identity", keys: ["remarks"] },
  { key: "eligibility", label: "Eligibility & Status", group: "eligibility" },
  { key: "state", label: "State Assessment", group: "sa" },
  { key: "nqas", label: "NQAS Certification", group: "certification" },
  { key: "scores", label: "Scores", group: null, keys: [] },
  { key: "funds", label: "Funds", group: "funds" },
  { key: "ia", label: "Internal Assessment", group: "ia" },
  { key: "surveillance", label: "Surveillance & Recertification", group: "surveillance" },
  { key: "building", label: "Building & Fire NOC", group: "buildingNoc" },
  { key: "documents", label: "Documents", group: null, keys: [...QV_DOCUMENT_KEYS] },
  { key: "history", label: "Cycle history", group: null, keys: [] },
  { key: "audit", label: "Audit", group: null, keys: [] }
];
const COLUMN_BY_KEY = Object.fromEntries(
  MASTER_COLUMNS.map((c) => [c.key, c])
);
function sectionColumns(key) {
  const def = QV_SECTIONS.find((s) => s.key === key);
  if (!def) return [];
  const base = def.group ? columnsInGroup(def.group) : [];
  const extra = (def.keys ?? []).map((k) => COLUMN_BY_KEY[k]).filter(Boolean);
  const seen = /* @__PURE__ */ new Set();
  return [...base, ...extra].filter((c) => {
    if (c.type === "action" || seen.has(c.key)) return false;
    if (isDeprecatedColumn(c)) return false;
    if (key !== "documents" && DOC_KEYS.has(c.key)) return false;
    seen.add(c.key);
    return true;
  });
}
const DERIVED_VALUE_KEYS = /* @__PURE__ */ new Set(["nocStatus", "nextAction", "pipelineStatus"]);
function isFilled(row, columnKey) {
  if (DERIVED_VALUE_KEYS.has(columnKey)) return false;
  const v = cellValue(row, columnKey);
  switch (v.kind) {
    case "empty":
      return false;
    case "text":
    case "status":
      return v.value.trim() !== "";
    case "link":
      return !!(v.attachmentId || v.url || v.name);
    case "date":
    case "dueDate":
      return !!v.value;
    default:
      return true;
  }
}
const QV_REQUIRED_KEYS = {
  overview: ["nin"],
  // `pipelineStatus` is CALCULATED — a derived field is never a required input
  // (it used to make Eligibility read "1 of 2" on a complete record).
  eligibility: ["eligibility"],
  state: ["saStatus", "saStart", "saEnd", "saScore", "genDoc"],
  nqas: ["certStatus", "certDate", "certScore", "naScheduled", "naEnd"],
  scores: [],
  // Applicable only when a gap amount exists (see below).
  funds: ["gapAmount", "gcYear"],
  ia: ["nqasIaQ1", "nqasIaQ2", "kayakalpIaQ1", "kayakalpIaQ2"],
  // Visits are required only once due; the score only after its done date.
  surveillance: ["surv1", "surv2"],
  building: ["buildingType", "buildingStatus", "nocAvailable", "nocCertified", "nocValidity"],
  documents: [],
  history: [],
  audit: []
};
function sectionApplicable(row, key) {
  if (key === "funds") return row.fund?.amountSanctioned != null;
  if (key === "surveillance") {
    return row.nqas?.certificationStatus === "Quality Certified" || row.nqas?.certificationStatus === "Quality Certified with Conditionality";
  }
  return true;
}
function requiredKeysFor(row, key) {
  if (key !== "surveillance") return QV_REQUIRED_KEYS[key] ?? [];
  const visits = surveillanceVisits(
    row.nqas ?? null,
    null,
    todayLocalIso()
  );
  const today = todayLocalIso();
  const keys = [];
  for (const v of visits) {
    if (v.state === "notApplicable") continue;
    if (v.state === "done" || v.due != null && v.due <= today) keys.push(v.key);
  }
  if (row.nqas?.surveillanceDone2 && keys.includes("surv2")) keys.push("survScore");
  return keys;
}
function sectionCompleteness(row, key, rules = DEFAULT_DOCUMENT_RULES) {
  if (key === "audit")
    return { done: 0, total: 0, pct: 100, warning: false, notApplicable: true };
  if (!sectionApplicable(row, key))
    return { done: 0, total: 0, pct: 100, warning: false, notApplicable: true };
  if (key === "documents") {
    const total2 = row.docs?.total ?? 6;
    const done2 = Math.min(total2, row.docs?.uploaded ?? 0);
    const warning2 = attentionFor(row, todayLocalIso(), rules).some((a) => a.section === key);
    return {
      done: done2,
      total: total2,
      pct: total2 ? Math.round(done2 / total2 * 100) : 100,
      warning: warning2,
      notApplicable: false
    };
  }
  const required = requiredKeysFor(row, key);
  const done = required.filter((k) => isFilled(row, k)).length;
  const total = required.length;
  const warning = attentionFor(row, todayLocalIso(), rules).some((a) => a.section === key);
  return {
    done,
    total,
    pct: total ? Math.round(done / total * 100) : 100,
    warning,
    notApplicable: total === 0
  };
}
function storedDate(row, field) {
  switch (field) {
    case "sa.actualStartDate":
      return row.sa?.actualStartDate ?? row.sa?.scheduledDate ?? null;
    case "sa.actualEndDate":
      return row.sa?.actualEndDate ?? null;
    case "nqas.actualEndDate":
      return row.nqas?.actualEndDate ?? null;
    case "nqas.scheduledStartDate":
      return row.nqas?.scheduledStartDate ?? null;
    case "noc.issuedDate":
      return row.noc?.issuedDate ?? null;
    case "noc.expiryDate":
      return row.noc?.expiryDate ?? null;
    case "nqas.certificationDate":
      return row.nqas?.certificationDate ?? null;
    default:
      return null;
  }
}
function attentionFor(row, today = todayLocalIso(), rules = DEFAULT_DOCUMENT_RULES) {
  const out = [];
  const noc = deriveNocAvailability(row);
  if (noc.conflict && noc.conflictText) {
    out.push({
      id: "noc-conflict",
      section: "building",
      field: "nocAvailable",
      text: noc.conflictText,
      severity: "warning"
    });
  }
  if (!row.noc?.nocAvailable && noc.source === "derived") {
    out.push({
      id: "noc-derived",
      section: "building",
      field: "nocAvailable",
      text: 'NOC Available was blank but a Fire NOC record exists — shown as "Yes" (derived). Confirm and save the flag.',
      severity: "warning"
    });
  }
  const cert = row.nqas?.certificationStatus ?? "";
  if (cert.startsWith("Quality Certified") || cert === "Certified") {
    if (!row.nqas?.certificationDate) {
      out.push({
        id: "cert-date",
        section: "nqas",
        field: "certDate",
        text: "Certification is recorded without a GoI letter / certification date.",
        severity: "blocking"
      });
    }
  }
  const expiry = row.nqas?.validityDate ?? null;
  if (expiry && expiry < today) {
    out.push({
      id: "validity-expired",
      section: "nqas",
      field: "certDate",
      text: `Certification validity expired on ${dmy(expiry)} — start recertification.`,
      severity: "warning"
    });
  }
  if (!row.facility.ninNumber) {
    out.push({
      id: "nin",
      section: "overview",
      field: "nin",
      text: "NIN is missing — the facility cannot be matched to the SaQsham portal.",
      severity: "warning"
    });
  }
  const certified = cert.startsWith("Quality Certified") || cert === "Certified" || cert === "Deferred";
  if (certified) {
    const visits = surveillanceVisits(
      row.nqas ?? null,
      null,
      today
    );
    for (const visit of visits) {
      const label = visit.key === "surv1" ? "1st Surveillance Assessment Done Date" : "2nd Surveillance Assessment Done Date";
      if (visit.done && visit.done > today) {
        out.push({
          id: `${visit.key}-future`,
          section: "surveillance",
          field: visit.key,
          text: `${label} ${toDdMmmYyyy(visit.done)} is in the future — fix it in Admin → Data checks → Surveillance dates.`,
          severity: "blocking"
        });
        continue;
      }
      if (visit.done && visit.due && visit.done === visit.due) {
        out.push({
          id: `${visit.key}-equals-due`,
          section: "surveillance",
          field: visit.key,
          text: `${label} equals the due date — a done date must be the real visit date.`,
          severity: "warning"
        });
      }
    }
  }
  for (const missing of row.docs ? requiredDocumentsMissing(row, rules) : []) {
    out.push({
      id: `doc-${missing.key}`,
      section: "documents",
      field: "documents",
      text: missing.blocking ? `${missing.label} is required for this facility — saving the assessment is blocked until it is uploaded.` : `${missing.label} is required for this facility under the current document rules.`,
      severity: missing.blocking ? "blocking" : "warning"
    });
  }
  const storedRules = DATE_RANGE_RULES.filter(
    (rule) => rule.severity === "blocking" && QV_DATE_FIELD[rule.start] && QV_DATE_FIELD[rule.end]
  );
  for (const violation of dateRangeViolations(
    (field) => QV_DATE_FIELD[field] ? storedDate(row, field) : null,
    storedRules
  )) {
    const key = QV_DATE_FIELD[violation.rule.end];
    out.push({
      id: `date-${violation.rule.id}`,
      section: sectionOfField(key),
      field: key,
      text: violation.message,
      severity: "warning"
    });
  }
  return out;
}
function statusForDisplay(row, settings, today = todayLocalIso()) {
  const stored = row.facility.currentStatus ?? "";
  if (!/^certified/i.test(stored)) return stored;
  if (row.nqas?.certificationStatus === "Quality Certified") {
    return certifiedSurveillanceStatus(row.nqas, settings, today);
  }
  return stored || certifiedSurveillanceStatus(row.nqas, settings, today);
}
function recertificationState(row, today = todayLocalIso()) {
  const validity = row.nqas?.validityDate ?? null;
  const year = validity ? validity.slice(0, 4) : row.nqas?.recertYear ?? null;
  if (!validity) {
    return {
      label: year ? `Due ${year}` : "Not due yet",
      tone: "grey",
      detail: year ? `Next full recertification: ${year}` : null
    };
  }
  const daysLeft = Math.round((Date.parse(validity) - Date.parse(today)) / 864e5);
  const detail = `Next full recertification: ${year}`;
  if (daysLeft < 0) return { label: `Overdue ${year}`, tone: "red", detail };
  if (daysLeft <= 365) return { label: `Due ${year}`, tone: "amber", detail };
  return { label: "Not due yet", tone: "green", detail };
}
function visitFor(row, which, today = todayLocalIso()) {
  return surveillanceVisits(
    row.nqas ?? null,
    null,
    today
  ).find((v) => v.key === which) ?? null;
}
const COLUMN_BY_DRAFT = {
  certStatus: "certStatus",
  certDate: "certDate",
  certScore: "certScore",
  naScheduled: "naScheduled",
  naEnd: "naEnd",
  naMode: "naMode",
  departments: "departments",
  gapAmount: "gapAmount",
  gcYear: "gcYear",
  procLink: "procLink",
  nqasIaQ1: "nqasIaQ1",
  nqasIaQ2: "nqasIaQ2",
  kayakalpIaQ1: "kayakalpIaQ1",
  kayakalpIaQ2: "kayakalpIaQ2",
  saStatus: "saStatus",
  saScore: "saScore",
  saStart: "saStart",
  saEnd: "saEnd",
  genDoc: "genDoc",
  saAssessor1: "assessor1",
  saAssessor1Hud: "assessor1Hud",
  saAssessor2: "assessor2",
  saAssessor2Hud: "assessor2Hud",
  surv1: "surv1",
  surv2: "surv2",
  manualScore: "survScore",
  buildingType: "buildingType",
  buildingStatus: "buildingStatus",
  nocAvailable: "nocAvailable",
  nocCertified: "nocCertified",
  nocValidity: "nocValidity",
  remarks: "remarks"
};
function sectionOfField(field) {
  switch (field) {
    case "certStatus":
    case "certDate":
    case "certScore":
    case "naScheduled":
    case "naEnd":
    case "naMode":
    case "departments":
    case "manualScore":
      return "nqas";
    case "gapAmount":
    case "gcYear":
    case "procLink":
      return "funds";
    case "nqasIaQ1":
    case "nqasIaQ2":
    case "kayakalpIaQ1":
    case "kayakalpIaQ2":
      return "ia";
    case "saStatus":
    case "saScore":
    case "saStart":
    case "saEnd":
    case "genDoc":
    case "saAssessor1":
    case "saAssessor1Hud":
    case "saAssessor2":
    case "saAssessor2Hud":
      return "state";
    case "surv1":
    case "surv2":
      return "surveillance";
    case "buildingType":
    case "buildingStatus":
    case "nocAvailable":
    case "nocCertified":
    case "nocValidity":
      return "building";
    default:
      return "overview";
  }
}
const DATE_FIELDS = /* @__PURE__ */ new Set([
  "certDate",
  "naScheduled",
  "naEnd",
  "saStart",
  "saEnd",
  "nocCertified",
  "nocValidity",
  "surv1",
  "surv2"
]);
const QV_DATE_FIELD = {
  "sa.actualStartDate": "saStart",
  "sa.actualEndDate": "saEnd",
  "nqas.actualEndDate": "naEnd",
  "nqas.scheduledStartDate": "naScheduled",
  "noc.issuedDate": "nocCertified",
  "noc.expiryDate": "nocValidity",
  "nqas.certificationDate": "certDate"
};
const MONEY_FIELDS = /* @__PURE__ */ new Set(["gapAmount"]);
const SCORE_FIELDS = /* @__PURE__ */ new Set([
  "certScore",
  "saScore",
  "manualScore",
  "nqasIaQ1",
  "nqasIaQ2",
  "kayakalpIaQ1",
  "kayakalpIaQ2"
]);
function displayDraftValue(field, raw) {
  const v = (raw ?? "").trim();
  if (!v) return "-";
  if (DATE_FIELDS.has(field)) return dmy(v) || v;
  if (MONEY_FIELDS.has(field)) return `₹${Number(v).toLocaleString("en-IN")}`;
  if (SCORE_FIELDS.has(field)) return `${v}%`;
  return v;
}
function changeLabel(field) {
  const columnKey = COLUMN_BY_DRAFT[field] ?? field;
  const col = COLUMN_BY_KEY[columnKey];
  return col?.label ?? columnKey;
}
function quickViewChanges(initial, draft) {
  const out = [];
  for (const key of Object.keys(draft)) {
    if (draft[key] === initial[key]) continue;
    out.push({
      field: key,
      label: changeLabel(key),
      from: displayDraftValue(key, initial[key] ?? ""),
      to: displayDraftValue(key, draft[key] ?? ""),
      section: sectionOfField(key)
    });
  }
  return out;
}
const num = (v) => v.trim() === "" ? null : Number(v);
function validateQuickView(draft, today = todayLocalIso(), initial) {
  const issues = [];
  const add = (field, message, severity = "blocking") => issues.push({ field, message, severity, section: sectionOfField(field) });
  const value = (k) => (draft[k] ?? initial?.[k] ?? "").trim();
  const certStatus = value("certStatus");
  if (/certif/i.test(certStatus) && !value("certDate")) {
    add("certDate", "A certification date (GoI letter) is required once the facility is certified.");
  }
  const edited = (key) => initial === void 0 || (draft[key] ?? "") !== (initial[key] ?? "");
  for (const [field, label] of [
    ["certDate", "Certification date"],
    ["saStart", "SA start date"],
    ["saEnd", "SA end date"],
    ["naEnd", "Assessment end date"],
    ["surv1", "1st surveillance date"],
    ["surv2", "2nd surveillance date"]
  ]) {
    const v = value(field);
    if (!v || !edited(field)) continue;
    const day = dateOnly(v);
    if (day && day > today) add(field, `${label} cannot be in the future.`);
  }
  const qvRules = DATE_RANGE_RULES.filter(
    (rule) => QV_DATE_FIELD[rule.start] && QV_DATE_FIELD[rule.end]
  );
  for (const violation of dateRangeViolations(
    (field) => value(QV_DATE_FIELD[field]),
    qvRules
  )) {
    const endKey = QV_DATE_FIELD[violation.rule.end];
    const startKey = QV_DATE_FIELD[violation.rule.start];
    if (violation.rule.severity === "blocking" && !edited(endKey) && !edited(startKey)) {
      continue;
    }
    add(endKey, violation.message, violation.rule.severity);
  }
  for (const field of SCORE_FIELDS) {
    const v = num(value(field));
    if (v == null) continue;
    if (Number.isNaN(v)) add(field, "Enter a number between 0 and 100.");
    else if (v < 0 || v > 100) add(field, "Score must be between 0 and 100.");
  }
  const amount = value("gapAmount");
  if (amount) {
    const v = Number(amount);
    if (Number.isNaN(v) || v < 0) add("gapAmount", "Enter a valid amount (₹0 or more).");
  }
  const available = value("nocAvailable");
  if (available && available !== "Yes" && available !== "No") {
    add("nocAvailable", 'NOC Available must be "Yes" or "No".');
  }
  if (available === "No" && (value("nocCertified") || value("nocValidity"))) {
    add(
      "nocAvailable",
      'NOC Available is "No" but a NOC date is recorded — set it to "Yes" or clear the dates.',
      "warning"
    );
  }
  return issues;
}
function validateSurveillance(row, draft, today = todayLocalIso(), initial) {
  const out = [];
  const certDate = row.nqas?.certificationDate ?? row.nqas?.goiLetterDate ?? null;
  const checks = [
    { key: "surv1", label: "1st Surveillance Assessment Done Date", iso: "surveillanceDone1" },
    { key: "surv2", label: "2nd Surveillance Assessment Done Date", iso: "surveillanceDone2" }
  ];
  for (const check of checks) {
    const value = (draft[check.key] ?? "").trim();
    if (!value) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      out.push({
        field: check.key,
        message: `${check.label} is not a valid date.`,
        severity: "blocking",
        section: "surveillance"
      });
      continue;
    }
    const edited = initial === void 0 || (initial[check.key] ?? "") !== value;
    const severity = edited ? "blocking" : "warning";
    if (value > today) {
      out.push({
        field: check.key,
        message: `${check.label} cannot be in the future — record it after the visit.`,
        severity,
        section: "surveillance"
      });
    }
    if (certDate && value < certDate) {
      out.push({
        field: check.key,
        message: `${check.label} must be after the certification date (${certDate}).`,
        severity,
        section: "surveillance"
      });
    }
  }
  const score = (draft.manualScore ?? "").trim();
  const done2 = (draft.surv2 ?? "").trim();
  if (score && (!done2 || done2 > today)) {
    out.push({
      field: "manualScore",
      message: "Enter the 2nd Surveillance Assessment Done Date before its score (a future date is not a visit).",
      severity: "blocking",
      section: "surveillance"
    });
  }
  if (score) {
    const n = Number(score);
    if (Number.isNaN(n) || n < 0 || n > 100) {
      out.push({
        field: "manualScore",
        message: "Surveillance score must be between 0 and 100.",
        severity: "blocking",
        section: "surveillance"
      });
    }
  }
  return out;
}
const blockingIssues = (issues) => issues.filter((i) => i.severity === "blocking");
function previewStatus(row, draft, settings, today = todayLocalIso()) {
  const n = (k, fallback) => {
    const v = num(draft[k] ?? "");
    return v == null || Number.isNaN(v) ? fallback ?? null : v;
  };
  const s = (k, fallback) => {
    const v = (draft[k] ?? "").trim();
    return v || fallback || null;
  };
  const base = {
    ...row.facility,
    eligibility: row.facility.eligibility ?? "Eligible",
    remarks: s("remarks", row.facility.remarks),
    nqasIaQ1: n("nqasIaQ1", row.facility.nqasIaQ1),
    nqasIaQ2: n("nqasIaQ2", row.facility.nqasIaQ2),
    kayakalpIaQ1: n("kayakalpIaQ1", row.facility.kayakalpIaQ1),
    kayakalpIaQ2: n("kayakalpIaQ2", row.facility.kayakalpIaQ2)
  };
  const sa = row.sa ? {
    ...row.sa,
    status: s("saStatus", row.sa.status),
    scorePercent: n("saScore", row.sa.scorePercent),
    actualStartDate: s("saStart", row.sa.actualStartDate ?? row.sa.scheduledDate),
    actualEndDate: s("saEnd", row.sa.actualEndDate),
    generalDocStatus: s("genDoc", row.sa.generalDocStatus)
  } : null;
  const nqas = row.nqas ? {
    ...row.nqas,
    certificationStatus: s("certStatus", row.nqas.certificationStatus),
    certificationDate: s("certDate", row.nqas.certificationDate),
    scorePercent: n("certScore", row.nqas.scorePercent),
    scheduledStartDate: s("naScheduled", row.nqas.scheduledStartDate),
    actualEndDate: s("naEnd", row.nqas.actualEndDate),
    surveillanceDone1: s("surv1", row.nqas.surveillanceDone1),
    surveillanceDone2: s("surv2", row.nqas.surveillanceDone2),
    manualScore: n("manualScore", row.nqas.manualScore)
  } : null;
  return computeCurrentStatus(
    base,
    sa,
    nqas,
    { ...settings ?? {} },
    today
  );
}
function statusChangeNotice(row, draft, settings) {
  const from = row.facility.currentStatus ?? "";
  const to = previewStatus(row, draft, settings);
  if (!to || to === from) return null;
  return { from, to };
}
const DRAFT_PREFIX = "nqas.qv.draft:";
function draftStoreKey(facilityId, userId) {
  return `${DRAFT_PREFIX}${userId ?? "anon"}:${facilityId}`;
}
function loadQuickViewDraft(facilityId, userId) {
  try {
    const raw = localStorage.getItem(draftStoreKey(facilityId, userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
function saveQuickViewDraft(facilityId, userId, draft) {
  try {
    localStorage.setItem(draftStoreKey(facilityId, userId), JSON.stringify(draft));
  } catch {
  }
}
function clearQuickViewDraft(facilityId, userId) {
  try {
    localStorage.removeItem(draftStoreKey(facilityId, userId));
  } catch {
  }
}
function updatedRecently(updatedAt, days, now = Date.now()) {
  if (!updatedAt || days <= 0) return null;
  if (now - updatedAt > days * 864e5) return null;
  return `Updated ${toDdMmmYyyy(new Date(updatedAt).toISOString().slice(0, 10))}`;
}

export { dueChip as A, formatInr as B, NQAS_SECTIONS as N, QV_SECTIONS as Q, SA_SECTIONS as S, attentionFor as a, validateQuickView as b, validateSurveillance as c, dmy as d, blockingIssues as e, saveQuickViewDraft as f, statusChangeNotice as g, clearQuickViewDraft as h, sectionCompleteness as i, deriveStage as j, sectionColumns as k, loadQuickViewDraft as l, scoreTone as m, validateSaDraft as n, SA_FIELDS as o, parseScore as p, quickViewChanges as q, recertificationState as r, statusForDisplay as s, validateNqasDraft as t, updatedRecently as u, visitFor as v, NQAS_FIELDS as w, needsAttention as x, sectionSummaries as y, nextSurveillance as z };
