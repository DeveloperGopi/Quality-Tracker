import { cu as todayIso, ck as computeCurrentStatus, D as DEFAULT_SETTINGS, m as deriveFlatLifecycle, T as pipelineStageOf, P as PIPELINE_STAGES, cf as computeDerivedNqas, cg as daysBetween, cv as surveillanceNextAction, n as nextStepHint, cw as dateToTs } from './AppShell-CP099uvN.js';

const sOf = (v, label) => v == null ? { value: null, short: `${label} —`, long: `${label} — Not recorded yet` } : {
  value: v,
  short: `${label} ${v}%`,
  long: `${label} ${v}%`
};
function chipFor(status, eligibility) {
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
const TAB_BY_STAGE = {
  notEligible: "overview",
  notStarted: "overview",
  internalAssessment: "state",
  stateAssessment: "state",
  naScheduled: "national",
  resultAwaited: "national",
  certified: "national"
};
function tabForStage(status) {
  if (status === "Facility (Future Candidate)") return "overview";
  if (status.startsWith("SA ")) return "state";
  if (status.startsWith("NA ") || status.startsWith("NQAS ")) return "national";
  if (status.startsWith("Certified") || status === "Result Awaited") return "national";
  return "overview";
}
function nextActionCta(status, iaDone) {
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
function getLifecycleState(input) {
  const s = { ...DEFAULT_SETTINGS, ...input.s ?? {} };
  const today = input.today ?? todayIso();
  const { facility } = input;
  const sa = input.activeCycle?.sa ?? null;
  const nqas = input.activeCycle?.nqas ?? null;
  const status = computeCurrentStatus(
    facility,
    sa,
    nqas,
    s,
    today
  );
  const flat = deriveFlatLifecycle({
    currentStatus: status,
    certStatus: nqas?.certificationStatus ?? null,
    naStatus: nqas?.status ?? null,
    naStartDate: nqas?.scheduledStartDate ?? null,
    docStatus: sa?.generalDocStatus ?? null,
    iaDone: facility.iaLastScore != null && facility.iaLastDate != null || facility.nqasIaQ1 != null || facility.nqasIaQ2 != null || facility.kayakalpIaQ1 != null || facility.kayakalpIaQ2 != null
  }, today);
  const engineStage = pipelineStageOf(flat, facility.eligibility);
  const iaDone = flat.iaDone;
  const statusStage = (() => {
    const statusIsCertified = status === "Certified — On track" || status === "Certified — Surveillance Due" || status === "Certified with Conditionality" || status === "Recertification Due";
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
  const order = (st) => PIPELINE_STAGES.findIndex((x) => x.key === st);
  const stage = order(engineStage) <= order(statusStage) ? engineStage : statusStage;
  const stageIndex = order(stage) + 1;
  const stages = PIPELINE_STAGES.map((st, i) => ({
    ...st,
    // stageIndex is 1-based; the "current" step is stageIndex-1 zero-based.
    state: i < stageIndex - 1 ? "done" : i === stageIndex - 1 ? "current" : "upcoming"
  }));
  const ia = facility.nqasIaQ1 ?? facility.nqasIaQ2 ?? facility.kayakalpIaQ1 ?? facility.kayakalpIaQ2 ?? (facility.iaLastDate ? facility.iaLastScore ?? null : null) ?? null;
  const scores = {
    ia: sOf(ia, "IA score"),
    sa: sOf(sa?.scorePercent ?? null, "SA score"),
    nqas: sOf(nqas?.scorePercent ?? nqas?.manualScore ?? null, "NQAS score")
  };
  const naOriginal = nqas?.originalScheduledStartDate ?? null;
  const stageDates = {
    internalAssessment: { date: facility.iaLastDate ?? null, label: "IA recorded" },
    stateAssessment: {
      date: sa?.actualStartDate ?? sa?.scheduledDate ?? null,
      label: sa?.status === "Completed" ? "SA done" : "SA scheduled"
    },
    naScheduled: {
      date: nqas?.scheduledStartDate ?? naOriginal,
      label: naOriginal && nqas?.scheduledStartDate && naOriginal !== nqas.scheduledStartDate ? `Originally scheduled ${naOriginal}` : "NA scheduled"
    },
    resultAwaited: {
      date: nqas?.actualEndDate ?? null,
      label: "Assessment ended"
    },
    certified: {
      date: nqas?.certificationDate ?? nqas?.goiLetterDate ?? null,
      label: "Certified"
    }
  };
  const derived = computeDerivedNqas(nqas ?? { }, s);
  const validity = {
    from: nqas?.certificationDate ?? nqas?.goiLetterDate ?? null,
    to: nqas?.validityDate ?? derived.validityDate,
    daysLeft: nqas?.validityDate || derived.validityDate ? daysBetween(nqas?.validityDate ?? derived.validityDate, today) : null
  };
  const openGaps = input.funds?.filter((f) => f.status === "Pending" || f.status === "Returned").length ?? 0;
  const surveillanceAction = nqas?.certificationStatus === "Quality Certified" || nqas?.certificationStatus === "Quality Certified with Conditionality" ? surveillanceNextAction(nqas, s, today) : null;
  const nextAction = {
    text: surveillanceAction ?? nextStepHint(status) ?? "Facility lifecycle is complete for this cycle.",
    cta: flat.isDeferred || status.startsWith("Deferred") ? null : nextActionCta(status, iaDone),
    targetTab: tabForStage(status)
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
    openGaps
  };
}
function profileCompleteness(input) {
  const f = input.facility;
  const checks = [
    { ok: !!f.ninNumber, field: "NIN Number", tab: "overview" },
    { ok: !!f.phaseType, field: "Phase type", tab: "overview" },
    { ok: !!f.saqshamFacilityType, field: "SaQsham Facility_Type", tab: "overview" },
    { ok: !!f.saqshamCategory, field: "SaQsham Name/Category", tab: "overview" },
    { ok: f.iaLastScore != null && !!f.iaLastDate, field: "Latest IA score & date", tab: "state" },
    { ok: input.activeCycle ? true : false, field: "Certification cycle", tab: "overview" },
    { ok: !!f.remarks, field: "General remarks", tab: "overview" }
  ];
  const missing = checks.filter((c) => !c.ok).map(({ field, tab }) => ({ field, tab }));
  const done = checks.length - missing.length;
  return { pct: Math.round(done / checks.length * 100), missing, total: checks.length };
}
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function toDdMmmYyyy(iso) {
  if (!iso || Number.isNaN(dateToTs(iso))) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return `${String(d).padStart(2, "0")}-${MONTHS_SHORT[m - 1]}-${y}`;
}

export { TAB_BY_STAGE as T, getLifecycleState as g, profileCompleteness as p, toDdMmmYyyy as t };
