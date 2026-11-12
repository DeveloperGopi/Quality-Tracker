// getLifecycleState — the ONE lifecycle source of truth for the Facility
// Profile page (header chip, KPI strip, stepper, next-action banner). It
// re-derives everything from the raw facility + active-cycle records using
// the backend engine (same functions the dashboard uses), then clamps the
// stepper stage to the status-derived stage so the two can never disagree.
//
// Rules encoded here (shown in the stepper tooltip):
//   Eligibility → Internal Assessment → State Assessment → NQAS Assessment →
//   Certification → Surveillance → Recertification. A Deferred result has no
//   stage of its own — the facility restarts the order after the cooling
//   period — and an NA schedule can never outrank an un-touched SA.

import { surveillanceNextAction } from "@/convex/lifecycle";
import {
  DEFAULT_SETTINGS,
  computeCurrentStatus,
  computeDerivedNqas,
  dateToTs,
  daysBetween,
  deriveFlatLifecycle,
  nextStepHint,
  pipelineStageOf,
  PIPELINE_STAGES,
  todayIso,
  type FacilityLike,
  type LifecycleSettings,
  type NqasLike,
  type PipelineStage,
  type SaLike,
} from "../convex/lifecycle";

export type ProfileFacility = {
  name: string;
  block: string;
  phc: string;
  facilityType: string;
  phaseType?: string | null;
  ninNumber?: string | null;
  eligibility: string;
  currentStatus?: string | null;
  saqshamFacilityType?: string | null;
  saqshamCategory?: string | null;
  remarks?: string | null;
  iaLastDate?: string | null;
  iaLastScore?: number | null;
  nqasIaQ1?: number | null;
  nqasIaQ2?: number | null;
  kayakalpIaQ1?: number | null;
  kayakalpIaQ2?: number | null;
  currentCycleNumber?: number | null;
};

export type ProfileSa = SaLike & {
  assessor1Name?: string | null;
  assessor2Name?: string | null;
  reportAttachmentName?: string | null;
};

export type ProfileNqas = NqasLike & {
  manualScore?: number | null;
  mode?: string | null;
  scorePercent?: number | null;
};

export type ScoreDisplay = {
  /** Numeric score when recorded, else null. */
  value: number | null;
  /** Screen label — always explicit ("IA score 89%"), never "(89%)". */
  short: string;
  /** Export/verbose label (PDF + Excel) — same information, sentence case. */
  long: string;
};

export type LifecycleChip = {
  label: string;
  /** App-wide status palette key — colour is never the ONLY indicator: the
   *  chip always carries an icon chosen from this tone + the label itself. */
  tone: "grey" | "blue" | "amber" | "purple" | "green" | "red";
};

export type StageDates = Partial<Record<PipelineStage, { date: string | null; label: string }>>;

export type LifecycleState = {
  /** 1-based stage index for "x of 7" — always matches the stepper. */
  stageIndex: number;
  stage: PipelineStage;
  stages: { key: PipelineStage; label: string; state: "done" | "current" | "upcoming" }[];
  chip: LifecycleChip;
  /** Status-under-the-hood (the engine verdict, incl. manual overrides). */
  status: string;
  /** The single next-action line + its deep-link target tab. */
  nextAction: { text: string; cta: string | null; targetTab: string | null };
  scores: {
    ia: ScoreDisplay;
    sa: ScoreDisplay;
    nqas: ScoreDisplay;
  };
  /** Date shown under each completed/aware step when the record has one. */
  stageDates: StageDates;
  /** Certification validity from → to, and the days remaining (null = none). */
  validity: { from: string | null; to: string | null; daysLeft: number | null };
  /** Gap Closure funds stuck open (Pending / Returned), i.e. real gaps. */
  openGaps: number;
};

const sOf = (v: number | null | undefined, label: string): ScoreDisplay =>
  v == null
    ? { value: null, short: `${label} —`, long: `${label} — Not recorded yet` }
    : {
        value: v,
        short: `${label} ${v}%`,
        long: `${label} ${v}%`,
      };

/** The status palette — one tone mapping shared by the header chip, KPI
 *  cards, timeline chips and the exports. */
export function chipFor(status: string, eligibility: string): LifecycleChip {
  if (eligibility === "Not Eligible") return { label: "Not Eligible", tone: "grey" };
  if (eligibility === "Possible") return { label: "Future Candidate", tone: "grey" };
  if (status.startsWith("Certified —")) return { label: "Certified", tone: "green" };
  if (status === "Quality Certified") return { label: "Certified", tone: "green" };
  if (status.includes("Conditionality")) return { label: "Certified (Conditionality)", tone: "amber" };
  if (status === "Recertification Due") return { label: "Recertification Due", tone: "amber" };
  if (status.includes("Expired")) return { label: "Validity Expired", tone: "red" };
  if (status.startsWith("Deferred")) return { label: "Deferred — Cooling Period", tone: "red" };
  if (status === "Eligible for Re-Assessment")
    return { label: "Ready for Re-Assessment", tone: "purple" };
  if (status === "Result Awaited") return { label: "Result Awaited", tone: "purple" };
  if (status.startsWith("SA Scheduled") || status.startsWith("NA Scheduled"))
    return { label: status, tone: "blue" };
  if (status.startsWith("SA Completed")) return { label: status, tone: "blue" };
  if (status.startsWith("SA Not Yet Initiated"))
    return { label: "SA Not Yet Initiated", tone: "grey" };
  return { label: status, tone: "grey" };
}

/** The profile tab each lifecycle step scrolls to when clicked — clicking a
 *  step is how the stepper doubles as navigation. */
export const TAB_BY_STAGE: Record<PipelineStage, string> = {
  notEligible: "overview",
  notStarted: "overview",
  internalAssessment: "state",
  stateAssessment: "state",
  naScheduled: "national",
  resultAwaited: "national",
  certified: "national",
};

/** Which profile tab a stage's next action jumps to. */
function tabForStage(
  status: string,
): string | null {
  if (status === "Facility (Future Candidate)") return "overview";
  if (status.startsWith("SA ")) return "state";
  if (status.startsWith("NA ") || status.startsWith("NQAS ")) return "national";
  if (status.startsWith("Certified") || status === "Result Awaited") return "national";
  return "overview";
}

/** Deep-link label for the Next-action button — an action, not a tab name. */
export function nextActionCta(status: string, iaDone: boolean): string {
  switch (status) {
    case "Facility (Future Candidate)":
      return "Mark facility eligible";
    case "SA Not Yet Initiated":
      return iaDone ? "Schedule the State Assessment" : "Record IA scores";
    case "SA Scheduled":
      return "Record the SA visit";
    case "SA Completed — NQAS Awaited":
    case "SA Completed — NQAS Pending":
      return "Schedule the NQAS assessment";
    case "NA Scheduled":
      return "Record the NA result";
    case "Result Awaited":
      return "Record the result";
    case "Certified — Surveillance Due":
      return "Record surveillance";
    case "Eligible for Re-Assessment":
      return "Start reattempt cycle";
    case "Recertification Due":
      return "Start recertification";
    case "Deferred — Cooling Period":
      return "View cooling period";
    default:
      return "Open the form";
  }
}

/**
 * The one function the profile page calls. Stage dates, scores, validity and
 * open-gap counts all flow out of the same raw records, so the header chip,
 * the KPI strip, the stepper and the Next-action banner CAN'T drift apart.
 *
 * Explain-the-rule tooltip lives on the stepper, built from `stages` +
 * `nextAction.text` + this comment's rule order.
 */
export function getLifecycleState(input: {
  facility: ProfileFacility;
  activeCycle:
    | {
        cycleNumber: number;
        cycleType: string;
        sa: SaLike | null;
        nqas: ProfileNqas | null;
      }
    | null;
  /** Gap closure funds of this facility (status strings from settings). */
  funds?: { status: string }[] | null;
  s?: Partial<LifecycleSettings> | null;
  today?: string;
}): LifecycleState {
  const s: LifecycleSettings = { ...DEFAULT_SETTINGS, ...(input.s ?? {}) } as LifecycleSettings;
  const today = input.today ?? todayIso();
  const { facility } = input;
  const sa = input.activeCycle?.sa ?? null;
  const nqas = input.activeCycle?.nqas ?? null;

  // ---- 1. Engine verdict (same functions the dashboard runs) ----
  const status = computeCurrentStatus(
    facility as FacilityLike & { eligibility: string },
    sa,
    nqas,
    s,
    today,
  );
  const flat = deriveFlatLifecycle({
    currentStatus: status,
    certStatus: nqas?.certificationStatus ?? null,
    naStatus: nqas?.status ?? null,
    naStartDate: nqas?.scheduledStartDate ?? null,
    docStatus: sa?.generalDocStatus ?? null,
    iaDone:
      (facility.iaLastScore != null && facility.iaLastDate != null) ||
      facility.nqasIaQ1 != null ||
      facility.nqasIaQ2 != null ||
      facility.kayakalpIaQ1 != null ||
      facility.kayakalpIaQ2 != null,
  }, today);
  const engineStage = pipelineStageOf(flat, facility.eligibility);

  // ---- 2. Status-derived stage — the stepper may never outrun this ----
  const iaDone = flat.iaDone;
  const statusStage: PipelineStage = (() => {
    const statusIsCertified =
      status === "Certified — On track" ||
      status === "Certified — Surveillance Due" ||
      status === "Certified with Conditionality" ||
      status === "Recertification Due";
    // Certified results always win over a stale eligibility value.
    if (facility.eligibility !== "Eligible" && !statusIsCertified) return "notEligible";
    switch (status) {
      case "Facility (Future Candidate)":
        return iaDone ? "internalAssessment" : "notStarted";
      case "SA Not Yet Initiated":
        return iaDone ? "internalAssessment" : "notStarted";
      case "SA Scheduled":
      case "SA Completed — NQAS Awaited":
      case "SA Completed — NQAS Pending":
        return "stateAssessment";
      case "NA Scheduled":
        return "naScheduled";
      case "Result Awaited":
        return "resultAwaited";
      // An expired certificate still HOLDS a certificate (the one headline
      // definition), so the stepper stays at Certified rather than dropping
      // back to "Result awaited".
      case "Recertification Due":
      case "Certified — Surveillance Due":
      // A certified facility whose visits are all open is still CERTIFIED —
      // without this case the status fell through to `notStarted`, so the
      // stepper (which clamps to the earlier of engine/status) reset a healthy
      // certified facility to stage 1 and every step read Upcoming.
      case "Certified — On track":
      case "Certified with Conditionality":
        return "certified";
      case "Deferred — Cooling Period":
      case "Eligible for Re-Assessment":
        return "stateAssessment";
      default:
        return "notStarted";
    }
  })();
  // min-length clamp: the earlier of the two stages wins. This is the guard
  // that makes "stage 5 active while header says SA Not Yet Initiated"
  // impossible on this page.
  const order = (st: PipelineStage) =>
    PIPELINE_STAGES.findIndex((x) => x.key === st);
  const stage = order(engineStage) <= order(statusStage) ? engineStage : statusStage;
  const stageIndex = order(stage) + 1;
  const stages = PIPELINE_STAGES.map((st, i) => ({
    ...st,
    // stageIndex is 1-based; the "current" step is stageIndex-1 zero-based.
    state: (i < stageIndex - 1 ? "done" : i === stageIndex - 1 ? "current" : "upcoming") as
      | "done"
      | "current"
      | "upcoming",
  }));

  // ---- 3. Scores — labelled, never a bare "(x%)" ----
  const ia =
    facility.nqasIaQ1 ?? facility.nqasIaQ2 ?? facility.kayakalpIaQ1 ?? facility.kayakalpIaQ2 ??
    (facility.iaLastDate ? facility.iaLastScore ?? null : null) ?? null;
  const scores = {
    ia: sOf(ia, "IA score"),
    sa: sOf(sa?.scorePercent ?? null, "SA score"),
    nqas: sOf(nqas?.scorePercent ?? nqas?.manualScore ?? null, "NQAS score"),
  };

  // ---- 4. Stage dates ----
  const naOriginal = (nqas as { originalScheduledStartDate?: string | null } | null)
    ?.originalScheduledStartDate ?? null;
  const stageDates: StageDates = {
    internalAssessment: { date: facility.iaLastDate ?? null, label: "IA recorded" },
    stateAssessment: {
      date: (sa?.actualStartDate ?? sa?.scheduledDate ?? null) as string | null,
      label: sa?.status === "Completed" ? "SA done" : "SA scheduled",
    },
    naScheduled: {
      date: (nqas?.scheduledStartDate ?? naOriginal) as string | null,
      label: naOriginal && nqas?.scheduledStartDate && naOriginal !== nqas.scheduledStartDate
        ? `Originally scheduled ${naOriginal}`
        : "NA scheduled",
    },
    resultAwaited: {
      date: (nqas?.actualEndDate ?? null) as string | null,
      label: "Assessment ended",
    },
    certified: {
      date:
        ((nqas?.certificationDate ?? nqas?.goiLetterDate ?? null) as string | null),
      label: "Certified",
    },
  };

  // ---- 5. Validity ----
  const derived = computeDerivedNqas(nqas ?? { status: "Completed" }, s);
  const validity = {
    from: (nqas?.certificationDate ?? nqas?.goiLetterDate ?? null) as string | null,
    to: (nqas?.validityDate ?? derived.validityDate) as string | null,
    daysLeft:
      nqas?.validityDate || derived.validityDate
        ? daysBetween((nqas?.validityDate ?? derived.validityDate)!, today)
        : null,
  };

  // ---- 6. Open gaps — funds still pending/returned are real, open gaps ----
  const openGaps =
    input.funds?.filter((f) => f.status === "Pending" || f.status === "Returned").length ?? 0;

  /* The certified row's Next action is the real surveillance deadline — the
     earliest visit that is still open (never the certificate year, and never a
     visit whose "done" date is a future placeholder). */
  const surveillanceAction =
    nqas?.certificationStatus === "Quality Certified" ||
    nqas?.certificationStatus === "Quality Certified with Conditionality"
      ? surveillanceNextAction(nqas, s, today)
      : null;
  const nextAction = {
    text:
      surveillanceAction ??
      nextStepHint(status) ??
      "Facility lifecycle is complete for this cycle.",
    cta: flat.isDeferred || status.startsWith("Deferred") ? null : nextActionCta(status, iaDone),
    targetTab: tabForStage(status),
  };

  return {
    stageIndex,
    stage,
    stages,
    chip: chipFor(status, facility.eligibility),
    status,
    nextAction,
    scores,
    stageDates,
    validity,
    openGaps,
  };
}

/** Data-completeness meter — every missing field is a named link target. */
export function profileCompleteness(input: {
  facility: ProfileFacility;
  activeCycle: { cycleNumber: number } | null;
}): { pct: number; missing: { field: string; tab: string }[]; total: number } {
  const f = input.facility;
  const checks: { ok: boolean; field: string; tab: string }[] = [
    { ok: !!f.ninNumber, field: "NIN Number", tab: "overview" },
    { ok: !!f.phaseType, field: "Phase type", tab: "overview" },
    { ok: !!f.saqshamFacilityType, field: "SaQsham Facility_Type", tab: "overview" },
    { ok: !!f.saqshamCategory, field: "SaQsham Name/Category", tab: "overview" },
    { ok: f.iaLastScore != null && !!f.iaLastDate, field: "Latest IA score & date", tab: "state" },
    { ok: input.activeCycle ? true : false, field: "Certification cycle", tab: "overview" },
    { ok: !!f.remarks, field: "General remarks", tab: "overview" },
  ];
  const missing = checks.filter((c) => !c.ok).map(({ field, tab }) => ({ field, tab }));
  const done = checks.length - missing.length;
  return { pct: Math.round((done / checks.length) * 100), missing, total: checks.length };
}

/** DD-MMM-YYYY display for PDF/Excel/timeline (IST day flagged in exports). */
export const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function toDdMmmYyyy(iso: string | null | undefined): string {
  if (!iso || Number.isNaN(dateToTs(iso))) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return `${String(d).padStart(2, "0")}-${MONTHS_SHORT[m - 1]}-${y}`;
}
