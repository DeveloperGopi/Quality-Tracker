import { cX as isResultDeclaredStatus, cv as surveillanceNextAction, ci as formatVisitDate } from './AppShell-CP099uvN.js';
import { p as percentOf, d as formatPercent, l as daysBetweenIso, m as median, N as NO_CHANGE_BAND } from './reportColumns-DJVmn3gI.js';
import { f as fiscalYearLabel } from './fiscalYear-QbChygln.js';

const RENEWAL_BUCKETS = [
  { key: "expired", label: "Expired" },
  { key: "d90", label: "Within 90 days" },
  { key: "d180", label: "91–180 days" },
  { key: "d365", label: "181–365 days" },
  { key: "later", label: "Later" }
];
const RENEWAL_STEPS = [
  {
    key: "notStarted",
    label: "Not started",
    tip: "No re-application has been received yet."
  },
  {
    key: "reapplication",
    label: "Re-application received",
    tip: "A Recertification cycle exists; its assessment is not scheduled yet."
  },
  {
    key: "scheduled",
    label: "Assessment scheduled",
    tip: "The recertification assessment has a scheduled date."
  },
  {
    key: "resultAwaited",
    label: "Result awaited",
    tip: "The assessment is complete or the result is declared; the outcome is not recorded yet."
  },
  {
    key: "done",
    label: "Done (Recertified)",
    tip: "The latest cycle holds a Quality or Conditional certificate."
  },
  {
    key: "deferred",
    label: "Deferred",
    tip: "The recertification result is Deferred — the facility re-attempts after the cooling period."
  }
];
const OUTCOME_SEGMENTS = [
  { key: "quality", label: "Quality" },
  { key: "conditional", label: "Conditional" },
  { key: "deferred", label: "Deferred" },
  { key: "inProgress", label: "In progress" },
  { key: "notEligible", label: "Not eligible" }
];
const norm = (v) => String(v ?? "").trim().toLowerCase();
const dmy = (iso) => iso ? formatVisitDate(String(iso).slice(0, 10)) || "-" : "-";
function cycleLabel(cycleNumber, cycleType) {
  return `Cycle #${cycleNumber} ${cycleType || "Initial"}`;
}
function holdsCertificate(certStatus) {
  const v = norm(certStatus);
  return v === "quality certified" || v === "quality certified with conditionality";
}
function isQuality(v) {
  return norm(v) === "quality certified";
}
function isConditional(v) {
  return norm(v) === "quality certified with conditionality";
}
function isDeferred(v) {
  return norm(v) === "deferred";
}
const toIso = (v) => v && /^\d{4}-\d{2}-\d{2}/.test(v) ? String(v).slice(0, 10) : null;
function effectiveScore(v) {
  return v != null && Number.isFinite(v) && v > 0 ? v : null;
}
function resultLabel(certStatus) {
  if (isQuality(certStatus)) return "Quality";
  if (isConditional(certStatus)) return "Conditional";
  if (isDeferred(certStatus)) return "Deferred";
  return "Not certified";
}
function cycleStartIso(r) {
  return toIso(r.saStartDate) ?? toIso(r.saScheduledDate) ?? toIso(r.naScheduledDate);
}
function addMonthsIso(iso, months) {
  const d = /* @__PURE__ */ new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)
  ).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}
function coolingEndIso(r, settings) {
  if (!isDeferred(r.certStatus)) return null;
  const from = toIso(r.goiLetterDate) ?? toIso(r.certDate) ?? toIso(r.naEndDate);
  if (!from) return null;
  return addMonthsIso(from, settings.deferredCooldownMonths ?? 3);
}
function fyQuarterOf(iso) {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  const fyStart = m >= 4 ? y : y - 1;
  const q = m >= 4 && m <= 6 ? 1 : m >= 7 && m <= 9 ? 2 : m >= 10 && m <= 12 ? 3 : 4;
  const startMonth = [4, 7, 10, 1][q - 1];
  const startYear = q === 4 ? fyStart + 1 : fyStart;
  const endMonth = [6, 9, 12, 3][q - 1];
  const endYear = q === 4 ? fyStart + 1 : fyStart;
  const pad = (n) => String(n).padStart(2, "0");
  const lastDay = new Date(Date.UTC(endYear, endMonth, 0)).getUTCDate();
  const fyLabel = fiscalYearLabel(fyStart);
  return {
    key: `${fyStart}-Q${q}`,
    label: `Q${q} ${fyLabel}`,
    shortLabel: `Q${q} ${fyLabel.slice(2)}`,
    // "Q3 26-27"
    start: `${startYear}-${pad(startMonth)}-01`,
    end: `${endYear}-${pad(endMonth)}-${pad(lastDay)}`
  };
}
function ratioLabel(part, whole) {
  if (!Number.isFinite(whole) || whole <= 0) return "-";
  if (whole < 5) return `${part} of ${whole}`;
  return formatPercent(percentOf(part, whole));
}
function medianDaysText(value) {
  if (value == null) return "-";
  return `${Math.round(value)} days`;
}
function bucketOfDays(days) {
  if (days < 0) return "expired";
  if (days <= 90) return "d90";
  if (days <= 180) return "d180";
  if (days <= 365) return "d365";
  return "later";
}
function outcomeOf(r) {
  if (isQuality(r.certStatus)) return "quality";
  if (isConditional(r.certStatus)) return "conditional";
  if (isDeferred(r.certStatus)) return "deferred";
  if (norm(r.eligibility) !== "eligible") return "notEligible";
  return "inProgress";
}
const nqasView = (r) => ({
  status: r.naStatus ?? "",
  certificationStatus: r.certStatus ?? "",
  certificationDate: r.certDate,
  goiLetterDate: r.goiLetterDate,
  actualEndDate: r.naEndDate,
  validityDate: r.validityDate,
  surveillanceDue1: r.surveillanceDue1,
  surveillanceDone1: r.surveillanceDone1,
  surveillanceDue2: r.surveillanceDue2,
  surveillanceDone2: r.surveillanceDone2
});
const CYCLE_REPORT_DEFINITIONS = [
  {
    term: "Facility-cycle",
    meaning: "One facility in one certification cycle. A facility that has started Cycle #2 is two facility-cycles but one distinct facility."
  },
  {
    term: "Hold a certificate",
    meaning: "NQAS Certification Status is Quality Certified or Quality Certified with Conditionality. Deferred is reported separately."
  },
  {
    term: "Not certified vs Not recorded",
    meaning: "“Not certified” means the facility genuinely has no certificate. “Not recorded” is used only when the SOURCE data for a field is missing."
  },
  {
    term: "In pipeline",
    meaning: "The facility-cycle has a certification cycle but does not hold a certificate and is not deferred — it is still moving through the lifecycle."
  },
  {
    term: "Renewal step",
    meaning: "Not started → Re-application received → Assessment scheduled → Result awaited → Done (Recertified); Deferred is its own outcome. Derived from the facility's latest cycle."
  },
  {
    term: "Days windows",
    meaning: "Expired (validity end before today), Within 90 days, 91–180 days, 181–365 days, Later — computed date-only, IST, from the certificate's validity end."
  },
  {
    term: "On time / Late",
    meaning: "Recertified = the latest cycle's result is Quality or Conditional. On time = its certification date is on or before the previous cycle's validity end; otherwise “Late by N days”."
  },
  {
    term: "Surveillance states",
    meaning: "Done (a real, non-future done date), Overdue (due date passed and not done), Due soon (inside the Admin window), Upcoming, Not applicable. A Done visit is never Overdue."
  },
  {
    term: "No-change band",
    meaning: `A score difference smaller than ${NO_CHANGE_BAND} (absolute) reads as unchanged (■), with the exact value in the tooltip. A change is only counted when BOTH scores exist.`
  },
  {
    term: "Median rule",
    meaning: "A median needs at least 3 values; below that the report prints “-” instead of a misleading number."
  },
  {
    term: "Small groups",
    meaning: "A group with fewer than 5 facilities shows “part of whole” (for example “1 of 2”) instead of a percentage."
  }
];
function buildCycleReport(rowsIn, opts = {}) {
  const today = opts.today ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const settings = opts.settings ?? {};
  const rows = rowsIn.map((r) => {
    const s = effectiveScore(r.certScore);
    return s === r.certScore ? r : { ...r, certScore: s };
  });
  const distinctFacilities = new Set(rows.map((r) => r.facilityId)).size;
  const cycleNumbers = [
    .../* @__PURE__ */ new Set([
      ...(opts.knownCycles ?? []).map((c) => c.cycleNumber),
      ...rows.map((r) => r.cycleNumber)
    ])
  ].sort((a, b) => a - b);
  const facilitiesInCycle = (n) => rows.filter((r) => r.cycleNumber === n);
  const populated = cycleNumbers.filter((n) => facilitiesInCycle(n).length > 0);
  const currentCycle = populated.length ? populated[populated.length - 1] : null;
  const cycleTypeOf = (n) => opts.knownCycles?.find((c) => c.cycleNumber === n)?.cycleType ?? facilitiesInCycle(n).find((r) => r.cycleType)?.cycleType ?? (n > 1 ? "Recertification" : "Initial");
  const cycles = cycleNumbers.map((n) => ({
    cycleNumber: n,
    cycleType: cycleTypeOf(n),
    label: cycleLabel(n, cycleTypeOf(n)),
    facilities: facilitiesInCycle(n).length,
    current: n === currentCycle
  }));
  const byFacility = /* @__PURE__ */ new Map();
  for (const r of rows) {
    const list2 = byFacility.get(r.facilityId) ?? [];
    list2.push(r);
    byFacility.set(r.facilityId, list2);
  }
  for (const list2 of byFacility.values()) list2.sort((a, b) => a.cycleNumber - b.cycleNumber);
  const latestRow = (id) => {
    const list2 = byFacility.get(id) ?? [];
    return [...list2].reverse().find((r) => !r.superseded) ?? list2[list2.length - 1];
  };
  const certRowOf = (id) => {
    const list2 = (byFacility.get(id) ?? []).filter((r) => holdsCertificate(r.certStatus));
    return list2.length ? list2[list2.length - 1] : null;
  };
  const stepFor = (latest) => {
    if (latest.cycleNumber <= 1) return { step: "notStarted", sourceMissing: false };
    if (holdsCertificate(latest.certStatus)) return { step: "done", sourceMissing: false };
    if (isDeferred(latest.certStatus)) return { step: "deferred", sourceMissing: false };
    if (norm(latest.naStatus) === "completed" || isResultDeclaredStatus(latest.certStatus) || norm(latest.certStatus).includes("result"))
      return { step: "resultAwaited", sourceMissing: false };
    if (toIso(latest.naScheduledDate) || norm(latest.naStatus) === "scheduled")
      return { step: "scheduled", sourceMissing: false };
    const sourceMissing = !latest.saStatus && !latest.naStatus && !latest.certStatus && !latest.naScheduledDate;
    return { step: "reapplication", sourceMissing };
  };
  const overviewCards = populated.map((n) => {
    const inCycle = facilitiesInCycle(n);
    const ids = inCycle.map((r) => r.facilityId);
    const hold = inCycle.filter((r) => holdsCertificate(r.certStatus)).length;
    const holdPct = percentOf(hold, inCycle.length);
    const segments = OUTCOME_SEGMENTS.map((s) => ({
      key: s.key,
      label: s.label,
      count: inCycle.filter((r) => outcomeOf(r) === s.key).length,
      ids: inCycle.filter((r) => outcomeOf(r) === s.key).map((r) => r.facilityId)
    }));
    return {
      cycleNumber: n,
      label: cycleLabel(n, cycleTypeOf(n)),
      cycleType: cycleTypeOf(n),
      status: n === currentCycle ? "current" : "closed",
      facilities: inCycle.length,
      hold,
      holdPct,
      // Part 0.10 — under 5 facilities: "1 of 2", never a percentage.
      holdText: inCycle.length > 0 && inCycle.length < 5 ? `${hold} of ${inCycle.length} hold a certificate` : `${hold} of ${inCycle.length} hold a certificate (${formatPercent(holdPct)})`,
      segments,
      ids
    };
  });
  const cellOf = (sub) => {
    const quality = sub.filter((r) => isQuality(r.certStatus)).length;
    const conditional = sub.filter((r) => isConditional(r.certStatus)).length;
    const deferred = sub.filter((r) => isDeferred(r.certStatus)).length;
    const notEligible = sub.filter((r) => outcomeOf(r) === "notEligible").length;
    return {
      facilities: sub.length,
      quality,
      conditional,
      deferred,
      notEligible,
      inProgress: Math.max(0, sub.length - quality - conditional - deferred - notEligible),
      certified: quality + conditional,
      certifiedPct: percentOf(quality + conditional, sub.length),
      ids: sub.map((r) => r.facilityId),
      certifiedIds: sub.filter((r) => holdsCertificate(r.certStatus)).map((r) => r.facilityId)
    };
  };
  const detailsFor = (pick) => {
    const labels = [...new Set(rows.map(pick))].sort((a, b) => a.localeCompare(b, "en-IN"));
    const detailRows = labels.map((label) => ({
      label,
      cycles: Object.fromEntries(
        populated.map((n) => [n, cellOf(rows.filter((r) => r.cycleNumber === n && pick(r) === label))])
      )
    }));
    const totals = {
      label: "All",
      cycles: Object.fromEntries(populated.map((n) => [n, cellOf(facilitiesInCycle(n))]))
    };
    return { rows: detailRows, totals };
  };
  const details = { type: detailsFor((r) => r.type), block: detailsFor((r) => r.block) };
  const scope = [];
  const certifiedNoValidityIds = [];
  for (const id of byFacility.keys()) {
    const latest = latestRow(id);
    const certRow = certRowOf(id);
    const { step, sourceMissing } = stepFor(latest);
    const coolingEnd = isDeferred(latest.certStatus) ? coolingEndIso(latest, settings) : null;
    const certIsCurrent = !!certRow && !certRow.superseded && certRow.cycleId === latest.cycleId;
    if (certIsCurrent && !toIso(certRow?.validityDate)) {
      certifiedNoValidityIds.push(id);
    }
    const inScope = certIsCurrent || latest.cycleNumber > 1;
    if (!inScope) continue;
    const daysLeft = certIsCurrent ? daysBetweenIso(today, toIso(certRow?.validityDate)) : null;
    const bucket = daysLeft == null ? null : bucketOfDays(daysLeft);
    scope.push({
      row: latest,
      facilityId: id,
      facility: latest.facility,
      type: latest.type,
      block: latest.block,
      certRow,
      daysLeft,
      bucket,
      step,
      stepSourceMissing: sourceMissing,
      coolingEnd,
      nextAction: ""
      // filled below, once every entry exists
    });
  }
  const actionFor = (e) => {
    if (e.step === "deferred")
      return e.coolingEnd ? `Cooling period ends ${dmy(e.coolingEnd)}` : "Cooling period ends — not recorded";
    if (e.step === "resultAwaited") return "Result due";
    if (e.step === "scheduled") return "Assessment scheduled";
    if (e.step === "reapplication") return "Book the assessment";
    if (e.step === "done") {
      const a2 = e.certRow ? surveillanceNextAction(nqasView(e.certRow), settings, today) : null;
      if (a2) return a2;
      if (e.daysLeft != null && e.daysLeft < 0)
        return "Certificate expired — start re-application";
      return "No action due";
    }
    if (e.daysLeft != null && e.daysLeft <= 365) return "Start re-application";
    const a = e.certRow ? surveillanceNextAction(nqasView(e.certRow), settings, today) : null;
    if (a) return a;
    if (e.certRow && toIso(e.certRow.validityDate))
      return `Recertify before ${dmy(toIso(e.certRow.validityDate))}`;
    return "No action due";
  };
  for (const e of scope) e.nextAction = actionFor(e);
  scope.sort((a, b) => {
    const da = a.daysLeft ?? Number.POSITIVE_INFINITY;
    const db = b.daysLeft ?? Number.POSITIVE_INFINITY;
    return da - db || a.facility.localeCompare(b.facility, "en-IN");
  });
  const bucketChips = RENEWAL_BUCKETS.map((b) => {
    const hit = scope.filter((e) => e.bucket === b.key);
    return {
      key: b.key,
      label: b.label,
      count: hit.length,
      ids: hit.map((e) => e.facilityId)
    };
  });
  const stepChips = RENEWAL_STEPS.map((s) => {
    const hit = scope.filter((e) => e.step === s.key);
    return {
      key: s.key,
      label: s.label,
      tip: s.tip,
      count: hit.length,
      ids: hit.map((e) => e.facilityId),
      notRecorded: hit.filter((e) => e.stepSourceMissing).length
    };
  });
  const typeNames = [...new Set(rows.map((r) => r.type))].sort((a, b) => a.localeCompare(b));
  const chart = [];
  {
    const qKeys = [];
    let q = fyQuarterOf(today);
    for (let i = 0; i < 8; i++) {
      qKeys.push(q);
      const m = Number(q.start.slice(5, 7));
      const y = Number(q.start.slice(0, 4));
      const nextMonth = m === 1 ? 4 : m === 4 ? 7 : m === 7 ? 10 : 1;
      const nextYear = m === 10 ? y + 1 : y;
      q = fyQuarterOf(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01`);
    }
    const monthShort = (iso) => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(iso.slice(5, 7)) - 1];
    const make = (key, label, subLabel, bucket, quarterKey, urgency, hit) => ({
      key,
      label,
      subLabel,
      bucket,
      quarterKey,
      urgency,
      total: hit.length,
      byType: Object.fromEntries(typeNames.map((t) => [t, hit.filter((e) => e.type === t).length])),
      segments: [{ label: "Facilities", value: hit.length }],
      ids: hit.map((e) => e.facilityId)
    });
    chart.push(
      make(
        "expired",
        "Already expired",
        "",
        "expired",
        null,
        "expired",
        scope.filter((e) => e.bucket === "expired")
      )
    );
    for (const k of qKeys) {
      const hit = scope.filter((e) => {
        if (!e.certRow) return false;
        const iso = toIso(e.certRow.validityDate);
        return !!iso && iso >= k.start && iso <= k.end;
      });
      const urgency = daysBetweenIso(today, k.start) !== null && (daysBetweenIso(today, k.end) ?? 0) <= 90 ? "soon" : "later";
      chart.push(
        make(
          k.key,
          `${monthShort(k.start)}–${monthShort(k.end)} ${k.end.slice(0, 4)}`,
          k.shortLabel,
          null,
          k.key,
          urgency,
          hit
        )
      );
    }
  }
  const renewals = {
    scope,
    buckets: bucketChips,
    steps: stepChips,
    chart,
    certifiedNoValidity: {
      count: certifiedNoValidityIds.length,
      ids: certifiedNoValidityIds
    }
  };
  const certifiedScope = scope.filter((e) => e.daysLeft != null);
  const dueSoonOrExpired = scope.filter(
    (e) => e.bucket === "expired" || e.bucket === "d90" || e.bucket === "d180" || e.bucket === "d365"
  );
  const received = scope.filter(
    (e) => e.step !== "notStarted" && e.step !== "deferred"
  );
  const parts = [];
  if (dueSoonOrExpired.length > 0)
    parts.push(
      dueSoonOrExpired.length === 1 ? "1 certificate expires within 12 months or has already expired" : `${dueSoonOrExpired.length} certificates expire within 12 months or have already expired`
    );
  if (received.length > 0)
    parts.push(
      `${received.length} re-application${received.length === 1 ? " has" : "s have"} been received`
    );
  const headline = certifiedScope.length === 0 || parts.length === 0 ? null : `${parts.join("; ")}.`;
  const needsAction = [];
  {
    const expiredNoReapp = scope.filter(
      (e) => e.bucket === "expired" && e.step === "notStarted"
    );
    if (expiredNoReapp.length > 0)
      needsAction.push({
        key: "expiredNoReapp",
        label: "Expired, no re-application",
        count: expiredNoReapp.length,
        ids: expiredNoReapp.map((e) => e.facilityId),
        filters: { buckets: ["expired"], step: "notStarted" }
      });
    const dueNotStarted = scope.filter(
      (e) => (e.bucket === "d90" || e.bucket === "d180" || e.bucket === "d365") && e.step === "notStarted"
    );
    if (dueNotStarted.length > 0)
      needsAction.push({
        key: "dueNotStarted",
        label: "Due within 12 months, not started",
        count: dueNotStarted.length,
        ids: dueNotStarted.map((e) => e.facilityId),
        filters: { buckets: ["d90", "d180", "d365"], step: "notStarted" }
      });
    const deferred = scope.filter((e) => e.step === "deferred");
    if (deferred.length > 0)
      needsAction.push({
        key: "deferredCooling",
        label: "Cycle #2 deferred (cooling period ending soon)",
        count: deferred.length,
        ids: deferred.map((e) => e.facilityId),
        filters: { buckets: [], step: "deferred" }
      });
  }
  const primaryCycle = populated.length ? populated.reduce(
    (best, n) => facilitiesInCycle(n).length > facilitiesInCycle(best).length ? n : best
  ) : null;
  const cycleHold = primaryCycle == null ? 0 : facilitiesInCycle(primaryCycle).filter((r) => holdsCertificate(r.certStatus)).length;
  const latestHoldIds = new Set(
    [...byFacility.keys()].filter((id) => holdsCertificate(latestRow(id).certStatus))
  );
  const overlap = [...byFacility.keys()].filter(
    (id) => (byFacility.get(id) ?? []).filter((r) => holdsCertificate(r.certStatus)).length > 1
  ).length;
  const reconciliation = {
    cycleHold,
    cycleLabel: primaryCycle == null ? "" : cycleLabel(primaryCycle, cycleTypeOf(primaryCycle)),
    distinctHold: latestHoldIds.size,
    overlap,
    text: primaryCycle == null || cycleHold === latestHoldIds.size ? null : `${cycleHold} facility-cycles hold a certificate in ${cycleLabel(primaryCycle, cycleTypeOf(primaryCycle))}; ${latestHoldIds.size} distinct facilities hold one today — each facility is counted once, by its latest cycle${overlap > 0 ? `; ${overlap} hold one in more than one cycle` : ""}.`
  };
  const comparisonRows = [];
  let medianPool = [];
  for (const [id, list2] of byFacility) {
    if (list2.length < 2) continue;
    const from = list2[list2.length - 2];
    const to = list2[list2.length - 1];
    const fromScore = effectiveScore(from.certScore);
    const toScore = effectiveScore(to.certScore);
    const delta = fromScore == null || toScore == null ? null : Math.abs(toScore - fromScore) < NO_CHANGE_BAND ? 0 : toScore - fromScore;
    let timing;
    if (isDeferred(to.certStatus)) {
      const cool = coolingEndIso(to, settings);
      timing = {
        kind: "notRecertified",
        days: null,
        text: cool ? `Not recertified yet · cooling period ends ${dmy(cool)}` : "Not recertified yet · cooling period not recorded"
      };
    } else if (holdsCertificate(to.certStatus)) {
      const certifiedOn = toIso(to.certDate) ?? toIso(to.goiLetterDate);
      const prevEnd = toIso(from.validityDate);
      const days = daysBetweenIso(prevEnd, certifiedOn);
      if (certifiedOn && prevEnd && days != null) {
        timing = days <= 0 ? { kind: "onTime", days, text: "On time" } : { kind: "late", days, text: `Late by ${days} days` };
      } else {
        timing = { kind: "onTime", days: null, text: "Recertified — dates not recorded" };
      }
      const prevCert = toIso(from.certDate) ?? toIso(from.goiLetterDate);
      if (certifiedOn && prevCert) {
        const d = daysBetweenIso(prevCert, certifiedOn);
        if (d != null) medianPool.push(d);
      }
    } else {
      timing = { kind: "inProgress", days: null, text: "In progress" };
    }
    comparisonRows.push({
      facilityId: id,
      facility: to.facility,
      type: to.type,
      block: to.block,
      fromCycle: from.cycleNumber,
      toCycle: to.cycleNumber,
      fromResult: resultLabel(from.certStatus),
      toResult: resultLabel(to.certStatus),
      fromCertifiedOn: toIso(from.certDate) ?? toIso(from.goiLetterDate),
      fromValidTill: toIso(from.validityDate),
      toCertifiedOn: toIso(to.certDate) ?? toIso(to.goiLetterDate),
      fromScore,
      toScore,
      delta,
      conditionalityResolved: isConditional(from.certStatus) && isQuality(to.certStatus),
      timing
    });
  }
  const bothScore = comparisonRows.filter((r) => r.delta != null);
  const dumbbellRows = [...bothScore].sort(
    (a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0) || a.facility.localeCompare(b.facility)
  ).slice(0, 20);
  const dumbbellScores = bothScore.flatMap((r) => [r.fromScore, r.toScore]).filter((s) => s != null);
  const axis = comparisonRows.length >= 5 && dumbbellScores.length > 0 ? {
    min: Math.max(0, Math.floor(Math.min(...dumbbellScores) / 5) * 5 - 5),
    max: Math.min(100, Math.ceil(Math.max(...dumbbellScores) / 5) * 5 + 5)
  } : null;
  const comparison = {
    available: comparisonRows.length > 0,
    twoCycleFacilities: comparisonRows.length,
    improved: bothScore.filter((r) => r.delta > 0).length,
    unchanged: bothScore.filter((r) => r.delta === 0).length,
    declined: bothScore.filter((r) => r.delta < 0).length,
    conditionalityResolved: comparisonRows.filter((r) => r.conditionalityResolved).length,
    recertifiedOnTime: comparisonRows.filter((r) => r.timing.kind === "onTime").length,
    recertifiedLate: comparisonRows.filter((r) => r.timing.kind === "late").length,
    medianDaysBetweenCerts: median(medianPool),
    rows: comparisonRows.sort((a, b) => a.facility.localeCompare(b.facility, "en-IN")),
    dumbbell: dumbbellRows,
    axis
  };
  const list = rows.map((row) => {
    const latest = latestRow(row.facilityId);
    const { step, sourceMissing } = stepFor(latest);
    const hold = holdsCertificate(row.certStatus);
    const daysLeft = daysBetweenIso(today, toIso(row.validityDate));
    return {
      row,
      cycleLabel: cycleLabel(row.cycleNumber, row.cycleType),
      hold,
      startedOn: cycleStartIso(row),
      resultLabel: resultLabel(row.certStatus),
      score: effectiveScore(row.certScore),
      daysLeft,
      step,
      stepSourceMissing: sourceMissing,
      nextAction: listNextAction(row, step, latest, settings, today)
    };
  });
  const latestIds = new Set(
    [...byFacility.keys()].map((id) => latestRow(id).cycleId)
  );
  const latestEntries = list.filter((e) => latestIds.has(e.row.cycleId));
  return {
    today,
    distinctFacilities,
    facilityCycles: rows.length,
    cycles,
    headline,
    headlineIds: dueSoonOrExpired.map((e) => e.facilityId),
    needsAction,
    overview: { cards: overviewCards, details },
    renewals,
    comparison,
    reconciliation,
    list,
    latest: latestEntries,
    definitions: CYCLE_REPORT_DEFINITIONS
  };
}
function listNextAction(row, step, latest, settings, today) {
  if (isDeferred(row.certStatus)) {
    const cool = coolingEndIso(row, settings);
    return cool ? `Cooling period ends ${dmy(cool)}` : "Cooling period ends — not recorded";
  }
  if (holdsCertificate(row.certStatus)) {
    const a = surveillanceNextAction(nqasView(row), settings, today);
    if (a) return a;
    const d = daysBetweenIso(today, toIso(row.validityDate));
    if (d != null && d < 0) return "Certificate expired — start re-application";
    return "No action due";
  }
  if (isResultDeclaredStatus(row.certStatus) || norm(row.generalDocStatus) === "result declared")
    return "Record the certification result";
  if (norm(row.naStatus) === "completed") return "Record the NQAS result";
  if (toIso(row.naScheduledDate)) return "NQAS assessment scheduled";
  if (row === latest && step === "reapplication") return "Book the assessment";
  if (norm(row.saStatus) === "result awaited") return "Record the State Assessment result";
  if (norm(row.saStatus) === "completed") return "Schedule the NQAS assessment";
  if (row.saStatus) return "Complete the State Assessment";
  return "Start the certification cycle";
}

export { OUTCOME_SEGMENTS as O, RENEWAL_STEPS as R, buildCycleReport as b, medianDaysText as m, ratioLabel as r };
