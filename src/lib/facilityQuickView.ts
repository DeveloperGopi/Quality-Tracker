/**
 * FACILITY QUICK VIEW — the pure rules behind the centred dialog.
 *
 * Everything here is testable without React: the lifecycle stepper, the
 * section → column mapping (the central config, never a second field list),
 * the NOC vocabulary, the "needs attention" list, the save diff, the shared
 * validation and the local draft store.
 *
 * THE STEPPER ROOT CAUSE (documented because the old drawer got it wrong):
 * the drawer derived its highlight from `stageOf(row)` — a POSITION in the
 * master-sheet stage list computed from assessment records — while the header
 * chip read `facility.currentStatus`. Two independent derivations: a facility
 * with a stored State Assessment row but eligibility "Not Eligible" painted
 * Eligibility green (everything before the SA position counted as "done") and
 * State Assessment blue, while the chip beside it said "Not Eligible". The
 * fix is one call to the shared lifecycle rule (getLifecycleState), which
 * already clamps the record-derived stage to the status-derived stage, plus a
 * real "blocked" state for the eligibility gate.
 */

import {
  DEFAULT_SETTINGS,
  certifiedSurveillanceStatus,
  computeCurrentStatus,
  formatVisitDate,
  surveillanceVisits,
  type LifecycleSettings,
  type SurveillanceVisit,
} from "@/convex/lifecycle";
import {
  MASTER_COLUMNS,
  cellValue,
  columnsInGroup,
  isDeprecatedColumn,
  requiredDocumentsMissing,
  type MasterColumn,
  type MasterGroupId,
  type MasterRow,
} from "@/lib/masterColumns";
import { getLifecycleState, toDdMmmYyyy } from "@/lib/facilityProfileState";
import { todayLocalIso } from "@/lib/today";
import {
  DATE_RANGE_RULES,
  dateOnly,
  dateRangeViolations,
  dmy,
} from "@/lib/facilityProfileRules";
import { deriveNocAvailability } from "@/lib/nocAvailability";
import {
  DEFAULT_DOCUMENT_RULES,
  type DocumentRules,
} from "@/lib/documentRules";

/* --------------------------------------------------------------------------- */
/* 1 — Lifecycle stepper                                                      */
/* --------------------------------------------------------------------------- */

export type QvStageKey =
  | "eligibility"
  | "sa"
  | "nqas"
  | "certification"
  | "surveillance"
  | "recertification";

export type QvStageState = "done" | "current" | "upcoming" | "blocked" | "warning";

export type QvStage = {
  key: QvStageKey;
  label: string;
  state: QvStageState;
  /** Short line under the label (a date, a score or the blocked reason). */
  detail?: string;
  /** Long tooltip — always explains a blocked stage. */
  tooltip?: string;
};

export type QvLifecycle = {
  stages: QvStage[];
  /** The stage the stepper paints as current (or blocked). */
  currentKey: QvStageKey;
  /** 1-based position of `currentKey` for "3 of 6". */
  index: number;
  /** Facility Current Status as the server computes it. */
  status: string;
  /** Why the lifecycle is blocked, when eligibility is not "Eligible". */
  blockedReason: string | null;
  nextAction: string;
};

/** EXACTLY the six lifecycle stages — Internal Assessment is a section, not a
 *  stage (task §6). Surveillance and Recertification are separate steps. */
export const QV_STAGES: { key: QvStageKey; label: string; short: string }[] = [
  { key: "eligibility", label: "Eligibility", short: "Eligibility" },
  { key: "sa", label: "State Assessment", short: "State" },
  { key: "nqas", label: "NQAS Assessment", short: "NQAS" },
  { key: "certification", label: "Certification", short: "Certified" },
  { key: "surveillance", label: "Surveillance", short: "Surveillance" },
  { key: "recertification", label: "Recertification", short: "Recert" },
];

/** Order used to compare pipeline stages (mirrors convex/lifecycle). */
const PIPELINE_ORDER = [
  "notEligible",
  "notStarted",
  "internalAssessment",
  "stateAssessment",
  "naScheduled",
  "resultAwaited",
  "certified",
] as const;

/**
 * THE stepper rule. One shared lifecycle reading (getLifecycleState) drives
 * every state, so the stepper can never contradict Facility Current Status:
 *   • eligibility "Not Eligible" / "Possible" ⇒ Eligibility **Blocked** and
 *     every later stage Upcoming (never green);
 *   • otherwise Eligibility is Done and the shared stage decides the rest;
 *   • a certified facility shows Done up to Certification and Surveillance
 *     Current — exactly what the spec asks for.
 */
export function deriveStage(
  row: MasterRow,
  settings?: Partial<LifecycleSettings> | null,
  today = todayLocalIso(),
): QvLifecycle {
  const facility = row.facility;
  const eligibility = facility.eligibility ?? "Eligible";
  const lifecycle = getLifecycleState({
    facility: {
      ...facility,
      eligibility,
      currentCycleNumber: row.cycleNumber ?? null,
    } as never,
    activeCycle: {
      cycleNumber: row.cycleNumber ?? 1,
      cycleType: row.cycleType ?? "Initial",
      sa: (row.sa ?? null) as never,
      nqas: (row.nqas ?? null) as never,
    },
    funds: row.fund ? [{ status: row.fund.status ?? "" }] : [],
    s: settings ?? null,
    today,
  });

  const stage = lifecycle.stage as (typeof PIPELINE_ORDER)[number];
  const rank = PIPELINE_ORDER.indexOf(stage);
  const atLeast = (key: (typeof PIPELINE_ORDER)[number]) =>
    rank >= PIPELINE_ORDER.indexOf(key);

  // A facility that holds a certificate is never blocked as "Not eligible".
  const blocked = eligibility !== "Eligible" && stage !== "certified";
  const blockedReason = blocked
    ? eligibility === "Possible"
      ? "Future candidate — the facility is not eligible for NQAS yet."
      : "Not Eligible — the NQAS lifecycle has not started for this facility."
    : null;

  const state = (
    doneWhen: boolean,
    currentWhen: boolean,
  ): QvStageState =>
    blocked ? "upcoming" : doneWhen ? "done" : currentWhen ? "current" : "upcoming";

  const dates = lifecycle.stageDates;
  const detailFor = (key: QvStageKey): string | undefined => {
    const raw =
      key === "sa"
        ? dates.stateAssessment?.date
        : key === "nqas"
          ? dates.naScheduled?.date
          : key === "certification"
            ? dates.certified?.date
            : undefined;
    return raw ? toDdMmmYyyy(raw) : undefined;
  };

  /* ONE visit rule for the last two stages (never the certificate year). */
  const s = { ...DEFAULT_SETTINGS, ...(settings ?? {}) } as LifecycleSettings;
  const visits = surveillanceVisits(
    (row.nqas ?? null) as Partial<import("@/convex/lifecycle").NqasLike> | null,
    s,
    today,
  );
  const nextVisit = visits.find(
    (v) => v.state === "overdue" || v.state === "dueSoon" || v.state === "upcoming",
  );
  const visitWarning = visits.some((v) => v.state === "overdue" || v.state === "dueSoon");
  const validity = row.nqas?.validityDate ?? null;
  const recertDays = validity
    ? Math.round((Date.parse(validity) - Date.parse(today)) / 86_400_000)
    : null;
  const recertDue =
    !!validity && recertDays != null && recertDays <= s.recertificationAlertLeadDays;
  const nqasResultFile =
    row.docs && Array.isArray(row.docs.keys) ? row.docs.keys.includes("NQAS_Result") : null;
  const certFileMissing =
    !blocked && atLeast("certified") && nqasResultFile === false;

  const stages: QvStage[] = QV_STAGES.map(({ key, label }) => {
    if (key === "eligibility") {
      return {
        key,
        label,
        state: blocked ? "blocked" : "done",
        detail: blocked ? "Blocked" : eligibility,
        tooltip: blocked
          ? blockedReason ?? undefined
          : `Eligibility is ${eligibility} — the lifecycle gate is open.`,
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
          stage === "stateAssessment" ||
            stage === "internalAssessment" ||
            stage === "notStarted",
        ),
        detail: detailFor(key),
        tooltip: blocked ? blockedReason ?? undefined : undefined,
      };
    }
    if (key === "nqas") {
      return {
        key,
        label,
        state: state(
          atLeast("certified"),
          stage === "naScheduled" || stage === "resultAwaited",
        ),
        detail: detailFor(key),
        tooltip: blocked ? blockedReason ?? undefined : undefined,
      };
    }
    if (key === "certification") {
      return {
        key,
        label,
        state: blocked
          ? "upcoming"
          : certFileMissing
            ? "warning"
            : atLeast("certified")
              ? "done"
              : "upcoming",
        detail: detailFor(key),
        tooltip: blocked
          ? blockedReason ?? undefined
          : certFileMissing
            ? "Certified without the NQAS Result file — upload it under Documents."
            : undefined,
      };
    }
    if (key === "surveillance") {
      if (blocked || !atLeast("certified")) {
        // Only the eligibility GATE is Blocked; every later stage is Upcoming
        // (the reason lives in the gate's tooltip and the dialog banner).
        return {
          key,
          label,
          state: "upcoming",
          tooltip: blocked ? blockedReason ?? undefined : undefined,
        };
      }
      return {
        key,
        label,
        state: visitWarning ? "warning" : "current",
        detail: nextVisit
          ? `${nextVisit.label} · ${formatVisitDate(nextVisit.due)}`
          : "Surveillance complete",
        tooltip: visitWarning
          ? visits
              .filter((v) => v.state === "overdue" || v.state === "dueSoon")
              .map((v) => `${v.label}: ${v.chip} (due ${formatVisitDate(v.due)})`)
              .join(" · ")
          : nextVisit
            ? `${nextVisit.label} is open — due ${formatVisitDate(nextVisit.due)}.`
            : "Both surveillance visits are recorded.",
      };
    }
    // recertification
    return {
      key,
      label,
      state: blocked
        ? "upcoming"
        : !atLeast("certified")
          ? "upcoming"
          : recertDue
            ? "warning"
            : "upcoming",
      detail: validity ? `Valid till ${validity.slice(0, 4)}` : undefined,
      tooltip: recertDue
        ? `Certificate validity ends ${toDdMmmYyyy(validity)} — start recertification.`
        : validity
          ? `Next full recertification: ${validity.slice(0, 4)}.`
          : undefined,
    };
  });

  const current = stages.find(
    (st) => st.state === "current" || st.state === "blocked" || st.state === "warning",
  );
  const currentKey = current?.key ?? "eligibility";
  return {
    stages,
    currentKey,
    index: QV_STAGES.findIndex((st) => st.key === currentKey) + 1,
    status: lifecycle.status,
    blockedReason,
    nextAction: lifecycle.nextAction.text,
  };
}

/* --------------------------------------------------------------------------- */
/* 2 — Sections (the ONE list, mapped through the central column config)      */
/* --------------------------------------------------------------------------- */

export type QvSectionKey =
  | "overview"
  | "eligibility"
  | "state"
  | "nqas"
  | "scores"
  | "funds"
  | "ia"
  | "surveillance"
  | "building"
  | "documents"
  | "history"
  | "audit";

export type QvSectionDef = {
  key: QvSectionKey;
  label: string;
  /** Central-config group this section renders (null = custom list). */
  group: MasterGroupId | null;
  /** Column keys for custom sections, or extra keys appended to the group. */
  keys?: string[];
};

/** Document/attachment columns live in their own section, never duplicated. */
export const QV_DOCUMENT_KEYS = [
  "documents",
  "saReport",
  "saChecklist",
  "condemnedLink",
  "nocDoc",
  "procLink",
] as const;

const DOC_KEYS = new Set<string>(QV_DOCUMENT_KEYS);

export const QV_SECTIONS: QvSectionDef[] = [
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
  { key: "audit", label: "Audit", group: null, keys: [] },
];

const COLUMN_BY_KEY: Record<string, MasterColumn> = Object.fromEntries(
  MASTER_COLUMNS.map((c) => [c.key, c]),
);

/** The columns of one section, exactly as the central config defines them. */
export function sectionColumns(key: QvSectionKey): MasterColumn[] {
  const def = QV_SECTIONS.find((s) => s.key === key);
  if (!def) return [];
  const base = def.group ? columnsInGroup(def.group) : [];
  const extra = (def.keys ?? []).map((k) => COLUMN_BY_KEY[k]).filter(Boolean);
  const seen = new Set<string>();
  return [...base, ...extra].filter((c) => {
    if (c.type === "action" || seen.has(c.key)) return false;
    // Deprecated columns (the Eco-Friendly trio) never render anywhere —
    // `columnsInGroup` keeps them for a future restore, so the filter has to
    // happen here too, or the Quick View's IA section still showed them.
    if (isDeprecatedColumn(c)) return false;
    // Attachment columns belong to Documents only.
    if (key !== "documents" && DOC_KEYS.has(c.key)) return false;
    seen.add(c.key);
    return true;
  });
}

/** Columns whose value the server derives — they can never be "entered
 *  data", so they do not count towards a section's completeness dot. */
const DERIVED_VALUE_KEYS = new Set(["nocStatus", "nextAction", "pipelineStatus"]);

/** A field is "filled" when its cell value is not blank — a blank is never 0
 *  and a missing link is never a value. */
export function isFilled(row: MasterRow, columnKey: string): boolean {
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

/** The REQUIRED (or applicable) fields per section — the one rule behind the
 *  nav counts (task §6). Optional fields (assessor names, remarks, the Fire
 *  NOC extra dates) and derived values never count. */
export const QV_REQUIRED_KEYS: Record<QvSectionKey, string[]> = {
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
  audit: [],
};

/** Applicability of a section for one row — not applicable sections show a grey
 *  ring and 0 of 0 (never "0 of 3 missing"). */
export function sectionApplicable(row: MasterRow, key: QvSectionKey): boolean {
  if (key === "funds") return row.fund?.amountSanctioned != null;
  if (key === "surveillance") {
    return (
      row.nqas?.certificationStatus === "Quality Certified" ||
      row.nqas?.certificationStatus === "Quality Certified with Conditionality"
    );
  }
  return true;
}

/** The exact field keys the nav counts for this row. */
function requiredKeysFor(row: MasterRow, key: QvSectionKey): string[] {
  if (key !== "surveillance") return QV_REQUIRED_KEYS[key] ?? [];
  const visits = surveillanceVisits(
    (row.nqas ?? null) as Partial<import("@/convex/lifecycle").NqasLike> | null,
    null,
    todayLocalIso(),
  );
  const today = todayLocalIso();
  const keys: string[] = [];
  for (const v of visits) {
    if (v.state === "notApplicable") continue;
    // A future visit is not required yet; a due/past one (or a done one) is.
    if (v.state === "done" || (v.due != null && v.due <= today)) keys.push(v.key);
  }
  if (row.nqas?.surveillanceDone2 && keys.includes("surv2")) keys.push("survScore");
  return keys;
}

/** Completeness (filled / applicable) + derived warning state for the nav. */
export function sectionCompleteness(
  row: MasterRow,
  key: QvSectionKey,
  rules: DocumentRules = DEFAULT_DOCUMENT_RULES,
): { done: number; total: number; pct: number; warning: boolean; notApplicable: boolean } {
  if (key === "audit")
    return { done: 0, total: 0, pct: 100, warning: false, notApplicable: true };
  if (!sectionApplicable(row, key))
    return { done: 0, total: 0, pct: 100, warning: false, notApplicable: true };
  // Documents are files, not column values: the ONE count comes from
  // facility_document (n/6), so the nav can never show "0/5" beside a list of
  // uploaded files again.
  if (key === "documents") {
    const total = row.docs?.total ?? 6;
    const done = Math.min(total, row.docs?.uploaded ?? 0);
    const warning = attentionFor(row, todayLocalIso(), rules).some((a) => a.section === key);
    return {
      done,
      total,
      pct: total ? Math.round((done / total) * 100) : 100,
      warning,
      notApplicable: false,
    };
  }
  const required = requiredKeysFor(row, key);
  const done = required.filter((k) => isFilled(row, k)).length;
  const total = required.length;
  const warning = attentionFor(row, todayLocalIso(), rules).some((a) => a.section === key);
  return {
    done,
    total,
    pct: total ? Math.round((done / total) * 100) : 100,
    warning,
    notApplicable: total === 0,
  };
}

/* --------------------------------------------------------------------------- */
/* 3 — Needs attention                                                         */
/* --------------------------------------------------------------------------- */

export type QvAttention = {
  id: string;
  section: QvSectionKey;
  /** Draft/column key used by Fix (jumps into edit mode on that field). */
  field: string;
  text: string;
  severity: "blocking" | "warning";
};

/** Canonical date field id (the central rule table) → the STORED row value.
 *  Same fields, same meaning as the draft keys — one vocabulary. */
function storedDate(row: MasterRow, field: string): string | null {
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

/** Real data problems — never a placeholder, always actionable. */
export function attentionFor(
  row: MasterRow,
  today = todayLocalIso(),
  rules: DocumentRules = DEFAULT_DOCUMENT_RULES,
): QvAttention[] {
  const out: QvAttention[] = [];
  const noc = deriveNocAvailability(row);
  if (noc.conflict && noc.conflictText) {
    out.push({
      id: "noc-conflict",
      section: "building",
      field: "nocAvailable",
      text: noc.conflictText,
      severity: "warning",
    });
  }
  if (!row.noc?.nocAvailable && noc.source === "derived") {
    out.push({
      id: "noc-derived",
      section: "building",
      field: "nocAvailable",
      text: 'NOC Available was blank but a Fire NOC record exists — shown as "Yes" (derived). Confirm and save the flag.',
      severity: "warning",
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
        severity: "blocking",
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
      severity: "warning",
    });
  }
  if (!row.facility.ninNumber) {
    out.push({
      id: "nin",
      section: "overview",
      field: "nin",
      text: "NIN is missing — the facility cannot be matched to the SaQsham portal.",
      severity: "warning",
    });
  }
  /* Part H / task §3.5: existing surveillance done dates that cannot be a real
     visit are FLAGGED, never changed silently. A future done date is red
     ("Future date"); a done date equal to its due date is a warning. */
  const certified =
    cert.startsWith("Quality Certified") || cert === "Certified" || cert === "Deferred";
  if (certified) {
    const visits = surveillanceVisits(
      (row.nqas ?? null) as Partial<import("@/convex/lifecycle").NqasLike> | null,
      null,
      today,
    );
    for (const visit of visits) {
      const label =
        visit.key === "surv1"
          ? "1st Surveillance Assessment Done Date"
          : "2nd Surveillance Assessment Done Date";
      if (visit.done && visit.done > today) {
        out.push({
          id: `${visit.key}-future`,
          section: "surveillance",
          field: visit.key,
          text: `${label} ${toDdMmmYyyy(visit.done)} is in the future — fix it in Admin → Data checks → Surveillance dates.`,
          severity: "blocking",
        });
        continue;
      }
      if (visit.done && visit.due && visit.done === visit.due) {
        out.push({
          id: `${visit.key}-equals-due`,
          section: "surveillance",
          field: visit.key,
          text: `${label} equals the due date — a done date must be the real visit date.`,
          severity: "warning",
        });
      }
    }
  }
  /* Documents: a required file that is missing (Admin → Documents rules) is a
     Needs-attention item with a Fix that opens the uploader, and the same
     count feeds the nav's amber dot. Nothing here blocks an old record. */
  for (const missing of row.docs ? requiredDocumentsMissing(row, rules) : []) {
    out.push({
      id: `doc-${missing.key}`,
      section: "documents",
      field: "documents",
      text: missing.blocking
        ? `${missing.label} is required for this facility — saving the assessment is blocked until it is uploaded.`
        : `${missing.label} is required for this facility under the current document rules.`,
      severity: missing.blocking ? "blocking" : "warning",
    });
  }
  /* STORED date conflicts (an end before its own start) are a warning here —
     the place that flags existing bad data — so simply opening a saved record
     never shows a blocking red error. The same central rules decide it. */
  const storedRules = DATE_RANGE_RULES.filter(
    (rule) =>
      rule.severity === "blocking" && QV_DATE_FIELD[rule.start] && QV_DATE_FIELD[rule.end],
  );
  for (const violation of dateRangeViolations(
    (field) => (QV_DATE_FIELD[field] ? storedDate(row, field) : null),
    storedRules,
  )) {
    const key = QV_DATE_FIELD[violation.rule.end] as string;
    out.push({
      id: `date-${violation.rule.id}`,
      section: sectionOfField(key),
      field: key,
      text: violation.message,
      severity: "warning",
    });
  }
  return out;
}

/** Full needs-attention list for the dialog (row + saved record). */
export function needsAttention(
  row: MasterRow,
  today = todayLocalIso(),
  rules: DocumentRules = DEFAULT_DOCUMENT_RULES,
): QvAttention[] {
  return attentionFor(row, today, rules);
}

/* --------------------------------------------------------------------------- */
/* 3b — Status and recertification, computed at READ time                       */
/* --------------------------------------------------------------------------- */

/**
 * Facility Current Status as the dialog must show it.
 *
 * Root cause of "Certified — Surveillance Due" beside a completed visitation:
 * the stored `facility.currentStatus` is written when a record changes, so a
 * bulk import that adds a done date (or a fix in Data checks) leaves the old
 * sentence on screen until that row is edited again. For a certified facility
 * the visit rule is re-read here, so the header, the status row and the
 * stepper can never contradict the done dates. Everything else keeps the
 * stored value (it is the same rule, just not re-derived).
 */
export function statusForDisplay(
  row: MasterRow,
  settings?: Partial<LifecycleSettings> | null,
  today = todayLocalIso(),
): string {
  const stored = row.facility.currentStatus ?? "";
  if (!/^certified/i.test(stored)) return stored;
  if (row.nqas?.certificationStatus === "Quality Certified") {
    return certifiedSurveillanceStatus(row.nqas as never, settings, today);
  }
  return stored || certifiedSurveillanceStatus(row.nqas as never, settings, today);
}

/** Short Recertification pill + the plain sentence beside it (task §3.7). */
export function recertificationState(
  row: MasterRow,
  today = todayLocalIso(),
): { label: string; tone: "green" | "amber" | "red" | "grey"; detail: string | null } {
  const validity = row.nqas?.validityDate ?? null;
  const year = validity ? validity.slice(0, 4) : row.nqas?.recertYear ?? null;
  if (!validity) {
    return {
      label: year ? `Due ${year}` : "Not due yet",
      tone: "grey",
      detail: year ? `Next full recertification: ${year}` : null,
    };
  }
  const daysLeft = Math.round((Date.parse(validity) - Date.parse(today)) / 86_400_000);
  const detail = `Next full recertification: ${year}`;
  if (daysLeft < 0) return { label: `Overdue ${year}`, tone: "red", detail };
  if (daysLeft <= 365) return { label: `Due ${year}`, tone: "amber", detail };
  return { label: "Not due yet", tone: "green", detail };
}

/** One surveillance visit for the row (Done / Overdue / Due / Upcoming). */
export function visitFor(
  row: MasterRow,
  which: "surv1" | "surv2",
  today = todayLocalIso(),
): SurveillanceVisit | null {
  return (
    surveillanceVisits(
      (row.nqas ?? null) as Partial<import("@/convex/lifecycle").NqasLike> | null,
      null,
      today,
    ).find((v) => v.key === which) ?? null
  );
}

/* --------------------------------------------------------------------------- */
/* 4 — Save: changes, validation and the status preview                        */
/* --------------------------------------------------------------------------- */

export type TrackerDraftMap = Record<string, string>;

/** Draft key → column key (reverse of the grid's EDIT_FIELD_BY_KEY). */
const COLUMN_BY_DRAFT: Record<string, string> = {
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
  remarks: "remarks",
};

/** The section that owns a draft field (Fix jumps here). */
export function sectionOfField(field: string): QvSectionKey {
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

export type QvChange = {
  field: string;
  label: string;
  from: string;
  to: string;
  section: QvSectionKey;
};

const DATE_FIELDS = new Set([
  "certDate",
  "naScheduled",
  "naEnd",
  "saStart",
  "saEnd",
  "nocCertified",
  "nocValidity",
  "surv1",
  "surv2",
]);
/** Canonical date field id (the central rule table's vocabulary) → the Quick
 *  View draft key that holds it. A field the Master List does not carry (the
 *  NQAS actual start, the NQAS scheduled end, the certificate validity) maps
 *  to nothing, and every rule that needs it is SKIPPED — never guessed from a
 *  neighbouring column. */
const QV_DATE_FIELD: Record<string, string | undefined> = {
  "sa.actualStartDate": "saStart",
  "sa.actualEndDate": "saEnd",
  "nqas.actualEndDate": "naEnd",
  "nqas.scheduledStartDate": "naScheduled",
  "noc.issuedDate": "nocCertified",
  "noc.expiryDate": "nocValidity",
  "nqas.certificationDate": "certDate",
};

const MONEY_FIELDS = new Set(["gapAmount"]);
const SCORE_FIELDS = new Set([
  "certScore",
  "saScore",
  "manualScore",
  "nqasIaQ1",
  "nqasIaQ2",
  "kayakalpIaQ1",
  "kayakalpIaQ2",
]);

/** Human display for a draft value in the Review before → after list. */
export function displayDraftValue(field: string, raw: string): string {
  const v = (raw ?? "").trim();
  if (!v) return "-";
  if (DATE_FIELDS.has(field)) return dmy(v) || v;
  if (MONEY_FIELDS.has(field)) return `₹${Number(v).toLocaleString("en-IN")}`;
  if (SCORE_FIELDS.has(field)) return `${v}%`;
  return v;
}

export function changeLabel(field: string): string {
  const columnKey = COLUMN_BY_DRAFT[field] ?? field;
  const col = COLUMN_BY_KEY[columnKey];
  return col?.label ?? columnKey;
}

/** Every changed field, compared field-by-field with the saved row. */
export function quickViewChanges(
  initial: TrackerDraftMap,
  draft: TrackerDraftMap,
): QvChange[] {
  const out: QvChange[] = [];
  for (const key of Object.keys(draft)) {
    if (draft[key] === initial[key]) continue;
    out.push({
      field: key,
      label: changeLabel(key),
      from: displayDraftValue(key, initial[key] ?? ""),
      to: displayDraftValue(key, draft[key] ?? ""),
      section: sectionOfField(key),
    });
  }
  return out;
}

export type QvIssue = {
  field: string;
  message: string;
  severity: "blocking" | "warning";
  section: QvSectionKey;
};

const num = (v: string) => (v.trim() === "" ? null : Number(v));

/**
 * The Facility Profile's validation rules, applied to the dialog draft.
 * Pure + local: no network call per keystroke. Blocking issues disable Save;
 * warnings allow saving.
 */
export function validateQuickView(
  draft: TrackerDraftMap,
  today = todayLocalIso(),
  initial?: TrackerDraftMap,
): QvIssue[] {
  const issues: QvIssue[] = [];
  const add = (field: string, message: string, severity: QvIssue["severity"] = "blocking") =>
    issues.push({ field, message, severity, section: sectionOfField(field) });
  const value = (k: string) => (draft[k] ?? initial?.[k] ?? "").trim();

  const certStatus = value("certStatus");
  if (/certif/i.test(certStatus) && !value("certDate")) {
    add("certDate", "A certification date (GoI letter) is required once the facility is certified.");
  }
  /** Was this field changed in THIS session? (No baseline ⇒ treat as edited: a
   *  caller without a row still gets the full rule set.) */
  const edited = (key: string) =>
    initial === undefined || (draft[key] ?? "") !== (initial[key] ?? "");

  for (const [field, label] of [
    ["certDate", "Certification date"],
    ["saStart", "SA start date"],
    ["saEnd", "SA end date"],
    ["naEnd", "Assessment end date"],
    ["surv1", "1st surveillance date"],
    ["surv2", "2nd surveillance date"],
  ] as const) {
    const v = value(field);
    if (!v || !edited(field)) continue; // never a red error on open
    const day = dateOnly(v);
    if (day && day > today) add(field, `${label} cannot be in the future.`);
  }

  /* ---- date order: the CENTRAL rule table (facilityProfileRules) ---------
     Each rule names its own two fields, so scheduled is only ever compared
     with scheduled and actual with actual. The old code compared the STATE
     ASSESSMENT end (`saEnd`) with the NQAS SCHEDULED start (`naScheduled`) and
     reported it on the NQAS end (`naEnd`) — three different assessments in
     one condition, which is why a correctly ordered NQAS 24-Sep → 25-Sep pair
     showed "End date must be on or after the scheduled start". */
  const qvRules = DATE_RANGE_RULES.filter(
    (rule) => QV_DATE_FIELD[rule.start] && QV_DATE_FIELD[rule.end],
  );
  for (const violation of dateRangeViolations(
    (field) => value(QV_DATE_FIELD[field] as string),
    qvRules,
  )) {
    const endKey = QV_DATE_FIELD[violation.rule.end] as string;
    const startKey = QV_DATE_FIELD[violation.rule.start] as string;
    /* A stored conflict is not a red error on open — only this session's
       edits can block Save. */
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
      "warning",
    );
  }
  return issues;
}

/** Part H — surveillance rules, shared by the Quick View, the row Update and
 *  the profile: a done date is a REAL visit date (never a copied due date),
 *  it cannot be in the future, it cannot precede certification, and a score
 *  needs a done date. `-` stays valid: blank is never an error by itself. */
export function validateSurveillance(
  row: MasterRow,
  draft: TrackerDraftMap,
  today = todayLocalIso(),
  /** The saved baseline. A problem that ALREADY exists on the stored row is a
   *  warning (fix it in Data checks); only this session's edits can block the
   *  save — otherwise one bad stored done date disabled Save for every field. */
  initial?: TrackerDraftMap,
): QvIssue[] {
  const out: QvIssue[] = [];
  const certDate = row.nqas?.certificationDate ?? row.nqas?.goiLetterDate ?? null;
  const checks: { key: "surv1" | "surv2"; label: string; iso: string }[] = [
    { key: "surv1", label: "1st Surveillance Assessment Done Date", iso: "surveillanceDone1" },
    { key: "surv2", label: "2nd Surveillance Assessment Done Date", iso: "surveillanceDone2" },
  ];
  for (const check of checks) {
    const value = (draft[check.key] ?? "").trim();
    if (!value) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      out.push({
        field: check.key,
        message: `${check.label} is not a valid date.`,
        severity: "blocking",
        section: "surveillance",
      });
      continue;
    }
    const edited = initial === undefined || (initial[check.key] ?? "") !== value;
    const severity: QvIssue["severity"] = edited ? "blocking" : "warning";
    if (value > today) {
      out.push({
        field: check.key,
        message: `${check.label} cannot be in the future — record it after the visit.`,
        severity,
        section: "surveillance",
      });
    }
    if (certDate && value < certDate) {
      out.push({
        field: check.key,
        message: `${check.label} must be after the certification date (${certDate}).`,
        severity,
        section: "surveillance",
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
      section: "surveillance",
    });
  }
  if (score) {
    const n = Number(score);
    if (Number.isNaN(n) || n < 0 || n > 100) {
      out.push({
        field: "manualScore",
        message: "Surveillance score must be between 0 and 100.",
        severity: "blocking",
        section: "surveillance",
      });
    }
  }
  return out;
}

/** Blocking issues only — what disables Save. */
export const blockingIssues = (issues: QvIssue[]) =>
  issues.filter((i) => i.severity === "blocking");

/** Anticipated Facility Current Status after saving (shared engine). */
export function previewStatus(
  row: MasterRow,
  draft: TrackerDraftMap,
  settings?: Partial<LifecycleSettings> | null,
  today = todayLocalIso(),
): string {
  const n = (k: string, fallback: number | null | undefined) => {
    const v = num(draft[k] ?? "");
    return v == null || Number.isNaN(v) ? fallback ?? null : v;
  };
  const s = (k: string, fallback: string | null | undefined) => {
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
    kayakalpIaQ2: n("kayakalpIaQ2", row.facility.kayakalpIaQ2),
  };
  const sa = row.sa
    ? {
        ...row.sa,
        status: s("saStatus", row.sa.status) as never,
        scorePercent: n("saScore", row.sa.scorePercent),
        actualStartDate: s("saStart", row.sa.actualStartDate ?? row.sa.scheduledDate),
        actualEndDate: s("saEnd", row.sa.actualEndDate),
        generalDocStatus: s("genDoc", row.sa.generalDocStatus) as never,
      }
    : null;
  const nqas = row.nqas
    ? {
        ...row.nqas,
        certificationStatus: s("certStatus", row.nqas.certificationStatus) as never,
        certificationDate: s("certDate", row.nqas.certificationDate),
        scorePercent: n("certScore", row.nqas.scorePercent),
        scheduledStartDate: s("naScheduled", row.nqas.scheduledStartDate),
        actualEndDate: s("naEnd", row.nqas.actualEndDate),
        surveillanceDone1: s("surv1", row.nqas.surveillanceDone1),
        surveillanceDone2: s("surv2", row.nqas.surveillanceDone2),
        manualScore: n("manualScore", row.nqas.manualScore),
      }
    : null;
  return computeCurrentStatus(
    base as never,
    sa as never,
    nqas as never,
    { ...(settings ?? {}) } as LifecycleSettings,
    today,
  );
}

/** True when the save will move Facility Current Status. */
export function statusChangeNotice(
  row: MasterRow,
  draft: TrackerDraftMap,
  settings?: Partial<LifecycleSettings> | null,
): { from: string; to: string } | null {
  const from = row.facility.currentStatus ?? "";
  const to = previewStatus(row, draft, settings);
  if (!to || to === from) return null;
  return { from, to };
}

/* --------------------------------------------------------------------------- */
/* 5 — Local drafts (per facility, per user)                                   */
/* --------------------------------------------------------------------------- */

const DRAFT_PREFIX = "nqas.qv.draft:";

export function draftStoreKey(facilityId: string, userId: string | null | undefined): string {
  return `${DRAFT_PREFIX}${userId ?? "anon"}:${facilityId}`;
}

export function loadQuickViewDraft(
  facilityId: string,
  userId: string | null | undefined,
): TrackerDraftMap | null {
  try {
    const raw = localStorage.getItem(draftStoreKey(facilityId, userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TrackerDraftMap;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function saveQuickViewDraft(
  facilityId: string,
  userId: string | null | undefined,
  draft: TrackerDraftMap,
): void {
  try {
    localStorage.setItem(draftStoreKey(facilityId, userId), JSON.stringify(draft));
  } catch {
    /* storage full / private mode — the in-memory draft still works */
  }
}

export function clearQuickViewDraft(
  facilityId: string,
  userId: string | null | undefined,
): void {
  try {
    localStorage.removeItem(draftStoreKey(facilityId, userId));
  } catch {
    /* ignore */
  }
}

/** "Updated 28-Sep-2026" chip only when the record changed recently. */
export function updatedRecently(
  updatedAt: number | null | undefined,
  days: number,
  now = Date.now(),
): string | null {
  if (!updatedAt || days <= 0) return null;
  if (now - updatedAt > days * 86_400_000) return null;
  return `Updated ${toDdMmmYyyy(new Date(updatedAt).toISOString().slice(0, 10))}`;
}
