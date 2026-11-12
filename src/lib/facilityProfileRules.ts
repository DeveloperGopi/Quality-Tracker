// facilityProfileRules — the ONE config + rule module behind the Facility
// Profile's State Assessment and NQAS Assessment screens.
//
//   • PROFILE_FIELDS   — every field (key, DB column, label, section, type,
//     required, helper, export width/alignment) that drives the forms, the
//     validation, the Overview completeness bars and the audit labels, so
//     they can never drift apart. DB column names are NEVER renamed here —
//     this file is the mapping layer.
//   • validateSaDraft / validateNqasDraft — the consistency rules, in plain
//     language, shared by the UI (inline + summary banner) and mirrored by
//     the Convex mutations (see convex/facilities.ts).
//   • needsAttention — flags existing bad data on load instead of silently
//     showing it.
//   • sectionSummaries — the Overview "at a glance" cards.
//
// Everything here is pure (no React, no Convex) and unit-tested in
// scripts/facilityProfileRules.test.ts.

import {
  DEFAULT_SETTINGS,
  computeDerivedNqas,
  daysBetween,
  type LifecycleSettings,
  type NqasLike,
  type SaLike,
} from "../convex/lifecycle";

/** Mirror of the UI status-palette union (components/StatusChip's `Tone`) —
 *  structurally identical, declared locally (instead of a `@/` alias import)
 *  so this pure rules module stays importable from BOTH bundlers: the Vite
 *  browser bundle and the Convex server bundle, which cannot resolve app
 *  aliases. Keep it in step if a tone is ever added to StatusChip. */
export type Tone = "grey" | "blue" | "amber" | "purple" | "green" | "red";

// ---------------------------------------------------------------------------
// Shared value types
// ---------------------------------------------------------------------------

/** The shape both assessment forms keep in local state (strings — raw input
 *  values, empty string = not filled). */
export type SaDraft = {
  scheduledDate: string;
  actualStartDate: string;
  actualEndDate: string;
  /** One optional scope choice from Admin > General > Scope options. */
  scopeOption?: string;
  scorePercent: string;
  generalDocStatus: string;
  assessor1Name: string;
  assessor1Designation: string;
  assessor1Phone: string;
  assessor1Hud: string;
  assessor2Name: string;
  assessor2Designation: string;
  assessor2Phone: string;
  assessor2Hud: string;
  reportAttachmentId?: string;
  checklistAttachmentId?: string;
};

export type NqasDraft = {
  scheduledStartDate: string;
  scheduledEndDate: string;
  actualStartDate: string;
  actualEndDate: string;
  mode: string;
  checklistVersion: string;
  /** Legacy department chips — kept in the type so stored rows stay valid,
   *  hidden from the form and never written by the new scope choice. */
  departments: string[];
  /** The one optional NQAS scope choice (Admin > General > Scope options). */
  scopeOption?: string;
  certificationStatus: string;
  certificationDate: string;
  scorePercent: string;
  /** Storage id of the uploaded NQAS result sheet. The key is the DB column
   *  (`nationalAssessments.resultDocumentId`), the form's focus key and the
   *  audit label — they must stay identical, otherwise the rule flags a
   *  field that is uploaded but never read (and blocks Save for ever). */
  resultDocumentId?: string;
};

/** One validation problem, in plain language, tied to a focusable field. */
export type FieldIssue = {
  /** focus key — matches the `focus` attribute rendered on the input. */
  field: string;
  /** Human label of the offending field (for the summary banner). */
  label: string;
  /** What is wrong AND how to fix it. */
  message: string;
};

/** One item for the Overview "Needs attention" panel. */
export type AttentionItem = {
  id: string;
  severity: "danger" | "warning" | "info";
  title: string;
  detail: string;
  /** Profile tab where the fix lives. */
  tab: string;
  /** Focus key inside that tab (scroll + focus the input). */
  focus?: string;
  fixLabel: string;
};

// ---------------------------------------------------------------------------
// Field config — labels, helpers, required flags, export widths
// ---------------------------------------------------------------------------

export type FieldDef = {
  key: string;
  /** Exact DB column / audit field name — never renamed, only mapped. */
  dbColumn: string;
  label: string;
  section: string;
  type: "date" | "number" | "text" | "select" | "chips" | "file" | "segmented" | "derived";
  required: boolean;
  helper?: string;
  /** Column width hint for the PDF/Excel label/value tables. */
  exportWidth?: number;
  align?: "left" | "right";
};

export const SA_SECTIONS = [
  { id: "schedule", title: "Schedule", hint: "Pick the visit date the team plans to go on." },
  { id: "visit", title: "Visit", hint: "Record when the visit actually happened." },
  { id: "scope", title: "Scope", hint: "Which scope was assessed?" },
  { id: "outcome", title: "Outcome", hint: "Enter the assessment score out of 100." },
  { id: "assessors", title: "Assessors", hint: "Who did the assessment? Names repeat, so they autocomplete." },
  { id: "documents", title: "Documents", hint: "Upload the signed report and checklist, and track the SaQsham file status." },
] as const;

export const NQAS_SECTIONS = [
  { id: "schedule", title: "Schedule", hint: "When is the NQAS assessment planned?" },
  { id: "visit", title: "Visit", hint: "Actual dates, mode and the checklist version used." },
  { id: "scope", title: "Scope", hint: "Which scope was assessed?" },
  { id: "outcome", title: "Outcome", hint: "Score, certification result and its dates." },
  { id: "documents", title: "Documents", hint: "Upload the NQAS result sheet." },
] as const;

export const SA_FIELDS: FieldDef[] = [
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
  { key: "generalDocStatus", dbColumn: "General Documents Status", label: "SaQsham Documents Status", section: "documents", type: "segmented", required: false, helper: "Where the SaQsham document file is right now.", exportWidth: 40 },
];

export const NQAS_FIELDS: FieldDef[] = [
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
  { key: "resultDocumentId", dbColumn: "NQAS Result", label: "NQAS Result (file)", section: "documents", type: "file", required: false, helper: "PDF of the result sheet. Required for a Certified result.", exportWidth: 40 },
];

export const FIELD_DEFS: Record<string, FieldDef> = Object.fromEntries(
  [...SA_FIELDS, ...NQAS_FIELDS].map((f) => [f.key, f]),
);

// ---------------------------------------------------------------------------
// Formatting helpers (screen + export both use these)
// ---------------------------------------------------------------------------

/** The ONE score threshold constant: green ≥ 70, amber 50–69, red < 50. */
export const SCORE_THRESHOLDS = { good: 70, fair: 50 } as const;

/** Score → palette tone. The number is always printed next to the colour. */
export function scoreTone(value: number | null | undefined): Tone {
  if (value == null) return "grey";
  if (value >= SCORE_THRESHOLDS.good) return "green";
  if (value >= SCORE_THRESHOLDS.fair) return "amber";
  return "red";
}

/** ₹ with Indian digit grouping (₹1,23,456). Blank-safe. */
export function formatInr(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

/** "Overdue 12d" / "Due in 20d" chip for a due date vs today. */
export function dueChip(
  daysLeft: number | null | undefined,
  label = "surveillance",
): { label: string; tone: Tone } | null {
  if (daysLeft == null) return null;
  if (daysLeft < 0) return { label: `Overdue ${Math.abs(daysLeft)}d`, tone: "red" };
  if (daysLeft === 0) return { label: `Due today`, tone: "amber" };
  if (daysLeft <= 30) return { label: `Due in ${daysLeft}d`, tone: "amber" };
  return { label: `Due in ${daysLeft}d`, tone: label === "surveillance" ? "blue" : "green" };
}

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** ISO date → "DD-MMM-YYYY"; blank-safe ("—"). */
export function dmy(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  const mi = Number(m) - 1;
  if (!y || Number.isNaN(mi) || !MONTH_ABBR[mi] || !d) return iso;
  return `${d}-${MONTH_ABBR[mi]}-${y}`;
}

// ---------------------------------------------------------------------------
// Date rules — ONE declarative table, compared as DATE-ONLY values
// ---------------------------------------------------------------------------

/** Canonical date-only value (`YYYY-MM-DD`) for a stored field.
 *
 *  Accepts the stored ISO date (`2026-09-24`), an ISO datetime
 *  (`2026-09-24T00:00:00.000Z`, `2026-09-24T23:30:00+05:30`) and, defensively,
 *  the display forms `24-Sep-2026` / `24/09/2026`. Returns null for a blank or
 *  unparseable value — a blank is never a date and never an error.
 *
 *  It NEVER does `new Date("2026-09-24")` + `toISOString()`: that parses as UTC
 *  midnight, so a browser east of UTC (IST, +05:30) would render 24-Sep as
 *  "23-Sep" the moment any local-time getter or `toISOString()` touches it.
 *  The date part of the stored string is the authoritative calendar day, and
 *  the comparison below is a plain string compare of `YYYY-MM-DD`, so a
 *  00:30 IST timestamp cannot shift a day. */
export function dateOnly(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const pad2 = (v: number) => String(v).padStart(2, "0");
  /* Real calendar day check (leap years included) using UTC only — never a
     local getter, so no timezone can move the day. */
  const real = (y: number, m: number, d: number) => {
    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    const probe = new Date(Date.UTC(y, m - 1, d));
    return (
      probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d
    );
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
      (m) => m.toLowerCase() === named[2].slice(0, 3).toLowerCase(),
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

/** Which pair a rule compares. Scheduled is only ever compared with
 *  scheduled and actual with actual; actual vs scheduled is never compared. */
export type DateRangeKind = "scheduled" | "actual" | "noc" | "certification";

export type DateRangeRule = {
  id: string;
  kind: DateRangeKind;
  /** Canonical field ids (the profile draft / DB field names — never the
   *  display text, never a Master List column key). */
  start: string;
  end: string;
  startLabel: string;
  endLabel: string;
  /** "blocking" disables Save; "warning" is an info chip and saves fine. */
  severity: "blocking" | "warning";
};

/** THE date-order rules. Every surface (Quick View, Facility Profile, Master
 *  List edit mode, importers) reads this table, so a pair can never be
 *  compared one way in one screen and another way in the next. */
export const DATE_RANGE_RULES: DateRangeRule[] = [
  {
    id: "nqas-scheduled",
    kind: "scheduled",
    start: "nqas.scheduledStartDate",
    end: "nqas.scheduledEndDate",
    startLabel: "NQAS scheduled start",
    endLabel: "NQAS scheduled end",
    severity: "blocking",
  },
  {
    id: "sa-actual",
    kind: "actual",
    start: "sa.actualStartDate",
    end: "sa.actualEndDate",
    startLabel: "State Assessment actual start",
    endLabel: "State Assessment actual end",
    severity: "blocking",
  },
  {
    id: "nqas-actual",
    kind: "actual",
    start: "nqas.actualStartDate",
    end: "nqas.actualEndDate",
    startLabel: "NQAS actual start",
    endLabel: "NQAS actual end",
    severity: "blocking",
  },
  {
    id: "noc-validity",
    kind: "noc",
    start: "noc.issuedDate",
    end: "noc.expiryDate",
    startLabel: "Fire NOC issue date",
    endLabel: "Fire NOC validity",
    severity: "blocking",
  },
  {
    id: "certification-validity",
    kind: "certification",
    start: "nqas.certificationDate",
    end: "nqas.validityDate",
    startLabel: "Certification date",
    endLabel: "Certificate validity",
    severity: "blocking",
  },
];
/* NOT a rule, on purpose: an actual start after the scheduled start. It is a
   fact, not a conflict — comparing actual with scheduled was the other half of
   the false "end before the scheduled start" error, so no entry here can pair
   a scheduled field with an actual one. */

/** The ONE ordering check: both values must exist and parse as date-only; the
 *  same day is valid. Returns the parsed pair only when `end` is BEFORE
 *  `start`. */
export function dateRangeProblem(
  startRaw: string | null | undefined,
  endRaw: string | null | undefined,
): { start: string; end: string } | null {
  const start = dateOnly(startRaw);
  const end = dateOnly(endRaw);
  if (!start || !end) return null;
  if (end >= start) return null;
  return { start, end };
}

export type DateRangeViolation = {
  rule: DateRangeRule;
  start: string;
  end: string;
  /** Names BOTH fields and values, and says which one to fix. */
  message: string;
};

/** Evaluate a set of rules against a value getter. Only rules whose two
 *  values both exist can produce a violation. */
export function dateRangeViolations(
  get: (field: string) => string | null | undefined,
  rules: DateRangeRule[] = DATE_RANGE_RULES,
): DateRangeViolation[] {
  const out: DateRangeViolation[] = [];
  for (const rule of rules) {
    const problem = dateRangeProblem(get(rule.start), get(rule.end));
    if (!problem) continue;
    out.push({
      rule,
      start: problem.start,
      end: problem.end,
      message:
        `${rule.endLabel} ${dmy(problem.end)} is before ${rule.startLabel} ${dmy(problem.start)}.` +
        ` Fix ${rule.severity === "warning" ? "the schedule" : "start date"}.`,
    });
  }
  return out;
}

/** Parse a raw score input ("", "89", "89.55") to a clamped number or null. */
export function parseScore(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (Number.isNaN(n)) return null;
  return Math.min(100, Math.max(0, Math.round(n * 10) / 10));
}

// ---------------------------------------------------------------------------
// Validation — the same rules run in the UI and mirrored in the API
// ---------------------------------------------------------------------------

/** Date rules shared by both forms: end ≥ start, and actual visit dates can
 *  never be in the future. Pure — `today` is passed in. */
function validateVisitDates(
  prefix: string,
  start: string,
  end: string,
  today: string,
  startLabel: string,
  endLabel: string,
): FieldIssue[] {
  const issues: FieldIssue[] = [];
  /* ONE ordering check for every surface (`dateRangeProblem`): date-only
     values, both must exist, the same day is valid. */
  const problem = dateRangeProblem(start, end);
  if (problem) {
    issues.push({
      field: `${prefix}.actualEndDate`,
      label: endLabel,
      message: `${endLabel} (${dmy(problem.end)}) is before the start date (${dmy(problem.start)}). Pick the same day or a later one.`,
    });
  }
  for (const [field, value, label] of [
    [`${prefix}.actualStartDate`, start, startLabel],
    [`${prefix}.actualEndDate`, end, endLabel],
  ] as const) {
    if (value && value > today) {
      issues.push({
        field,
        label,
        message: `${label} (${dmy(value)}) is in the future. Actual visit dates can only be today or a past date — use the scheduled date for the plan.`,
      });
    }
  }
  return issues;
}

/** State Assessment consistency rules. */
export function validateSaDraft(draft: SaDraft, today: string): FieldIssue[] {
  const issues: FieldIssue[] = [];
  const score = parseScore(draft.scorePercent);
  const done =
    !!draft.actualEndDate ||
    !!draft.actualStartDate ||
    (draft.scorePercent !== "" && score != null);

  issues.push(
    ...validateVisitDates(
      "sa",
      draft.actualStartDate,
      draft.actualEndDate,
      today,
      "Actual start date",
      "Actual end date",
    ),
  );

  if (draft.scorePercent !== "" && score == null) {
    issues.push({
      field: "sa.scorePercent",
      label: "Score %",
      message: `“${draft.scorePercent}” is not a number. Enter the score as digits, e.g. 78 or 78.5 (0–100).`,
    });
  }
  if (score != null && (score < 0 || score > 100)) {
    issues.push({
      field: "sa.scorePercent",
      label: "Score %",
      message: `Score must be between 0 and 100. You entered ${score}.`,
    });
  }
  // "Completed" (implied by a finished visit) requires dates + score — the
  // plain-language gate that stops a half-filled visit from reading Completed.
  if (done) {
    if (!draft.actualStartDate || !draft.actualEndDate) {
      issues.push({
        field: "sa.actualStartDate",
        label: "Actual dates",
        message:
          "A completed visit needs both an actual start date and an actual end date. Fill the missing date, or clear the other visit fields to keep the assessment pending.",
      });
    }
    if (score == null) {
      issues.push({
        field: "sa.scorePercent",
        label: "Score %",
        message: "A completed visit needs its score. Enter the assessment score (0–100).",
      });
    }
  }
  return issues;
}

/** NQAS Assessment consistency rules — including the cross-record gate that
 *  NQAS cannot read Completed / Certified while the State Assessment of the
 *  same cycle is not Completed. */
export function validateNqasDraft(
  draft: NqasDraft,
  ctx: {
    today: string;
    saCompleted: boolean;
    /** Part C — the Admin document rule resolved for THIS facility. When it is
     *  absent (older callers) the historic "certified needs the result" rule
     *  applies, so behaviour can never silently loosen. */
    resultDocRule?: { required: boolean; blocking: boolean; label: string } | null;
    /** The result sheet is stored in `facility_document` (the shared slot),
     *  not in this draft — when provided it decides the required-file check. */
    resultDocUploaded?: boolean;
  },
): FieldIssue[] {
  const issues: FieldIssue[] = [];
  const score = parseScore(draft.scorePercent);
  const naDone = !!draft.actualEndDate || !!draft.actualStartDate;
  const certified =
    draft.certificationStatus === "Quality Certified" ||
    draft.certificationStatus === "Quality Certified with Conditionality";

  issues.push(
    ...validateVisitDates(
      "nqas",
      draft.actualStartDate,
      draft.actualEndDate,
      ctx.today,
      "Actual start date",
      "Actual end date",
    ),
  );

  /* Scheduled vs scheduled — never mixed with the actual visit dates. */
  const scheduledProblem = dateRangeProblem(draft.scheduledStartDate, draft.scheduledEndDate);
  if (scheduledProblem) {
    issues.push({
      field: "nqas.scheduledEndDate",
      label: "Scheduled end date",
      message: `Scheduled end date (${dmy(scheduledProblem.end)}) is before the scheduled start (${dmy(scheduledProblem.start)}).`,
    });
  }

  if (draft.scorePercent !== "" && score == null) {
    issues.push({
      field: "nqas.scorePercent",
      label: "Score %",
      message: `“${draft.scorePercent}” is not a number. Enter the score as digits, e.g. 82 or 82.5 (0–100).`,
    });
  }
  if (score != null && (score < 0 || score > 100)) {
    issues.push({
      field: "nqas.scorePercent",
      label: "Score %",
      message: `Score must be between 0 and 100. You entered ${score}.`,
    });
  }

  // The headline contradiction from the screenshots: NQAS completed /
  // certified while the State Assessment of this cycle is not done.
  if ((naDone || certified || draft.certificationStatus === "Deferred") && !ctx.saCompleted) {
    issues.push({
      field: "nqas.certificationStatus",
      label: "NQAS result",
      message:
        "The State Assessment of this cycle is not marked Completed, so the NQAS assessment cannot be recorded as completed or certified. Complete the State Assessment tab first (actual dates + score), or ask a State Admin to correct the cycle.",
    });
  }

  if (naDone) {
    if (!draft.actualStartDate || !draft.actualEndDate) {
      issues.push({
        field: "nqas.actualStartDate",
        label: "Actual dates",
        message:
          "A completed assessment needs both an actual start date and an actual end date.",
      });
    }
    if (score == null) {
      issues.push({
        field: "nqas.scorePercent",
        label: "Score %",
        message: "A completed assessment needs its score (0–100).",
      });
    }
  }

  if (certified) {
    if (!draft.certificationDate) {
      issues.push({
        field: "nqas.certificationDate",
        label: "GoI letter date",
        message:
          "A Certified result needs the GoI letter date — validity and both surveillance due dates are calculated from it.",
      });
    }
  }

  /* Part C ②: the required-file check reads the ONE Admin rule — the same
   * rule the row's badge renders. An optional document never blocks a save,
   * and a warning-only rule shows its message without blocking. */
  const docRule =
    ctx.resultDocRule ?? { required: certified, blocking: certified, label: "NQAS Result" };
  const blockingDoc = docRule.required && docRule.blocking;
  const resultUploaded = ctx.resultDocUploaded ?? !!draft.resultDocumentId;
  if (blockingDoc && !resultUploaded) {
    issues.push({
      field: "nqas.resultDocumentId",
      label: docRule.label,
      message: `${docRule.label} must be uploaded under Documents before this assessment can be saved. Upload it in the Documents section below, then save again.`,
    });
  }
  return issues;
}

// ---------------------------------------------------------------------------
// Needs attention — flag existing bad data instead of showing it silently
// ---------------------------------------------------------------------------

export function needsAttention(input: {
  sa: (SaLike & {
    reportAttachmentId?: string | null;
    /** The report is in `facility_document` (the shared slot). */
    hasReportDocument?: boolean;
  }) | null;
  nqas: (NqasLike & {
    manualScore?: number | null;
    scorePercent?: number | null;
    resultDocumentId?: string | null;
    /** The result sheet is in `facility_document` (the shared slot). */
    hasResultDocument?: boolean;
    scheduledStartDate?: string | null;
  }) | null;
  nocs: { expiryDate?: string | null; status?: string | null; nocAvailable?: string | null }[];
  funds: { status: string }[];
  settings?: Partial<LifecycleSettings> | null;
  today: string;
}): AttentionItem[] {
  const s: LifecycleSettings = { ...DEFAULT_SETTINGS, ...(input.settings ?? {}) };
  const out: AttentionItem[] = [];
  const { sa, nqas, today } = input;

  // --- contradictory SA data ---
  if (sa?.status === "Completed" && (!sa.actualStartDate || !sa.actualEndDate)) {
    out.push({
      id: "sa-dates-missing",
      severity: "danger",
      title: "State Assessment marked Completed without visit dates",
      detail: "A completed assessment must record when the visit happened. Add the actual start and end dates.",
      tab: "state",
      focus: "sa.actualStartDate",
      fixLabel: "Add the dates",
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
      fixLabel: "Upload the report",
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
      fixLabel: "Update the schedule",
    });
  }

  // --- contradictory NQAS data ---
  const nqasScore = nqas?.scorePercent ?? nqas?.manualScore ?? null;
  const certified =
    nqas?.certificationStatus === "Quality Certified" ||
    nqas?.certificationStatus === "Quality Certified with Conditionality";
  if (nqas?.status === "Completed" && nqasScore == null) {
    out.push({
      id: "nqas-score-missing",
      severity: "danger",
      title: "NQAS completed but no score recorded",
      detail: "Enter the assessment score so the facility's current status and reports stay correct.",
      tab: "national",
      focus: "nqas.scorePercent",
      fixLabel: "Add the score",
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
      fixLabel: "Add the letter date",
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
      fixLabel: "Upload the result",
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
      fixLabel: "Review the cycle",
    });
  }

  // --- certificate validity ---
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
        fixLabel: "Start recertification",
      });
    } else if (left <= s.recertificationAlertLeadDays) {
      out.push({
        id: "cert-expiring",
        severity: "warning",
        title: `Certificate expires in ${left} days`,
        detail: `Validity ends on ${dmy(validity)}. Begin recertification now to avoid a gap.`,
        tab: "national",
        fixLabel: "Plan recertification",
      });
    }
  }

  // --- surveillance overdue ---
  for (const [key, due] of [
    ["surv1", derived?.surveillanceDue1 ?? null],
    ["surv2", derived?.surveillanceDue2 ?? null],
  ] as const) {
    if (due && due < today) {
      out.push({
        id: `${key}-overdue`,
        severity: "danger",
        title: `Surveillance visit overdue since ${dmy(due)}`,
        detail: "The scheduled surveillance visit has passed. Record the visit or reschedule it with the state team.",
        tab: "national",
        fixLabel: "Review surveillance dates",
      });
    }
  }

  // --- Fire NOC ---
  for (const noc of input.nocs) {
    const status = noc.expiryDate
      ? noc.expiryDate < today
        ? "Expired"
        : daysBetween(noc.expiryDate, today) <= s.fireNocAlertLeadDays
          ? "Expiring Soon"
          : "Valid"
      : noc.status;
    if (status === "Expired") {
      out.push({
        id: `noc-expired-${noc.expiryDate}`,
        severity: "warning",
        title: `Fire NOC expired on ${dmy(noc.expiryDate)}`,
        detail: "Apply for renewal and record the new NOC under the Fire NOC tab.",
        tab: "noc",
        fixLabel: "Renew the NOC",
      });
    }
  }

  // --- open gap funds ---
  const pending = input.funds.filter((f) => f.status === "Pending" || f.status === "Returned").length;
  if (pending > 0) {
    out.push({
      id: "funds-open",
      severity: "info",
      title: `${pending} gap-closure fund record${pending === 1 ? "" : "s"} still pending`,
      detail: "Sanctioned funds that are pending or returned are real infrastructure gaps.",
      tab: "funds",
      fixLabel: "Review funds",
    });
  }

  const order = { danger: 0, warning: 1, info: 2 } as const;
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

// ---------------------------------------------------------------------------
// Section summaries + completeness ("8 of 12 fields filled")
// ---------------------------------------------------------------------------

export type SectionSummary = {
  key: string;
  title: string;
  tab: string;
  chip: { label: string; tone: Tone };
  filled: number;
  total: number;
  rows: { label: string; value: string }[];
};

/** How many config-listed fields of a record hold a value. */
export function fieldCompleteness(
  defs: FieldDef[],
  values: Record<string, unknown>,
): { filled: number; total: number } {
  let filled = 0;
  for (const d of defs) {
    const v = values[d.key];
    if (Array.isArray(v)) {
      if (v.length > 0) filled++;
    } else if (v != null && String(v).trim() !== "") filled++;
  }
  return { filled, total: defs.length };
}

/** The Overview section cards — 3–4 key values + a status pill + a
 *  completeness bar per section, all derived from the same records the
 *  assessment tabs edit. */
export function sectionSummaries(input: {
  sa: (SaLike & {
    assessor1Name?: string | null;
    reportAttachmentId?: string | null;
  }) | null;
  nqas: (NqasLike & {
    manualScore?: number | null;
    scorePercent?: number | null;
    mode?: string | null;
    resultDocumentId?: string | null;
  }) | null;
  funds: { status: string; amountSanctioned?: number | null; financialYear?: string | null }[];
  nocs: { expiryDate?: string | null; status?: string | null }[];
  buildings: { buildingStatus?: string | null; buildingType?: string | null }[];
  settings?: Partial<LifecycleSettings> | null;
  today: string;
}): SectionSummary[] {
  const s: LifecycleSettings = { ...DEFAULT_SETTINGS, ...(input.settings ?? {}) };
  const { sa, nqas, today } = input;

  const saDone = sa?.status === "Completed";
  const saComplete = fieldCompleteness(SA_FIELDS, (sa ?? {}) as Record<string, unknown>);
  const saChip = saDone
    ? { label: "Completed", tone: "green" as Tone }
    : sa?.status === "Scheduled"
      ? { label: "Scheduled", tone: "blue" as Tone }
      : { label: "Not initiated", tone: "grey" as Tone };

  const nqasComplete = fieldCompleteness(NQAS_FIELDS, (nqas ?? {}) as Record<string, unknown>);
  const cert = nqas?.certificationStatus ?? "";
  const nqasChip = cert === "Quality Certified"
    ? { label: "Certified", tone: "green" as Tone }
    : cert === "Quality Certified with Conditionality"
      ? { label: "Conditionality", tone: "amber" as Tone }
      : cert === "Deferred"
        ? { label: "Deferred", tone: "red" as Tone }
        : nqas?.status === "Completed"
          ? { label: "Result awaited", tone: "purple" as Tone }
          : nqas?.status === "Scheduled"
            ? { label: "Scheduled", tone: "blue" as Tone }
            : { label: "Pending", tone: "grey" as Tone };

  const fundTotal = input.funds.reduce((a, f) => a + (f.amountSanctioned ?? 0), 0);
  const openFunds = input.funds.filter((f) => f.status === "Pending" || f.status === "Returned").length;
  const fundedYears = input.funds.map((f) => f.financialYear ?? "").filter(Boolean);
  const latestFundYear =
    fundedYears.length ? [...fundedYears].sort()[fundedYears.length - 1] : null;

  const latestNoc = input.nocs[input.nocs.length - 1] ?? null;
  const nocStatus = latestNoc?.expiryDate
    ? latestNoc.expiryDate < today
      ? "Expired"
      : daysBetween(latestNoc.expiryDate, today) <= s.fireNocAlertLeadDays
        ? "Expiring Soon"
        : "Valid"
    : latestNoc?.status ?? "Not Obtained";
  const nocChipTone: Tone =
    nocStatus === "Valid" ? "green" : nocStatus === "Expiring Soon" ? "amber" : nocStatus === "Expired" ? "red" : "grey";

  const latestBuilding = input.buildings[input.buildings.length - 1] ?? null;
  const buildingTone: Tone =
    latestBuilding?.buildingStatus === "Good"
      ? "green"
      : latestBuilding?.buildingStatus === "Dilapidated"
        ? "red"
        : latestBuilding
          ? "amber"
          : "grey";

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
        { label: "Assessor 1", value: sa?.assessor1Name ?? "—" },
      ],
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
        { label: "Valid till", value: validityTo ? dmy(validityTo) : "—" },
      ],
    },
    {
      key: "funds",
      title: "Gap Closure Fund",
      tab: "funds",
      chip:
        openFunds > 0
          ? { label: `${openFunds} pending`, tone: "amber" as Tone }
          : input.funds.length > 0
            ? { label: "Received", tone: "green" as Tone }
            : { label: "No records", tone: "grey" as Tone },
      filled: input.funds.length,
      total: Math.max(1, input.funds.length),
      rows: [
        { label: "Sanctioned", value: input.funds.length ? formatInr(fundTotal) : "—" },
        { label: "Latest FY", value: latestFundYear ?? "—" },
        { label: "Records", value: String(input.funds.length) },
      ],
    },
    {
      key: "noc",
      title: "Fire NOC",
      tab: "noc",
      chip: { label: nocStatus, tone: nocChipTone },
      filled: latestNoc?.expiryDate ? 1 : 0,
      total: 1,
      rows: [
        { label: "NOC number", value: latestNoc && "nocNumber" in latestNoc ? String((latestNoc as { nocNumber?: string }).nocNumber ?? "—") : "—" },
        { label: "Valid till", value: latestNoc?.expiryDate ? dmy(latestNoc.expiryDate) : "—" },
      ],
    },
    {
      key: "building",
      title: "Building",
      tab: "building",
      chip: latestBuilding?.buildingStatus
        ? { label: latestBuilding.buildingStatus, tone: buildingTone }
        : { label: "No records", tone: "grey" as Tone },
      filled: latestBuilding ? 1 : 0,
      total: 1,
      rows: [
        { label: "Type", value: latestBuilding?.buildingType ?? "—" },
        { label: "Status", value: latestBuilding?.buildingStatus ?? "—" },
      ],
    },
  ];
}

/** Next surveillance milestone (Y1, else Y2) as a due-date chip source. */
export function nextSurveillance(
  nqas: NqasLike | null,
  settings?: Partial<LifecycleSettings> | null,
  today?: string,
): { date: string; daysLeft: number } | null {
  const s: LifecycleSettings = { ...DEFAULT_SETTINGS, ...(settings ?? {}) };
  const d = computeDerivedNqas(nqas ?? { status: "" }, s);
  const candidates = [d.surveillanceDue1, d.surveillanceDue2].filter(Boolean) as string[];
  if (candidates.length === 0) return null;
  const date = candidates.sort()[0];
  return { date, daysLeft: daysBetween(date, today ?? new Date().toISOString().slice(0, 10)) };
}
