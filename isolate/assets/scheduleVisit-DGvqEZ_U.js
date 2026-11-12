function displayDate(value) {
  const iso = isoDate(value);
  if (!iso) return "-";
  const [year, month, day] = iso.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${day}-${months[Number(month) - 1]}-${year}`;
}
function visitFillText(plan) {
  if (plan.needsDecision) {
    return `Needs your decision — ${plan.reason ?? "the scheduled date conflicts with an existing date."}`;
  }
  const bits = [];
  if (plan.setStart) bits.push(`Start = ${displayDate(plan.fillStart)}`);
  if (plan.setEnd) bits.push(`End = ${displayDate(plan.fillEnd)}`);
  if (!plan.setEnd && plan.actualEnd) bits.push(`(end ${displayDate(plan.actualEnd)} kept)`);
  return bits.join(" ") || "-";
}
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
function isoDate(value) {
  const v = (value ?? "").trim();
  return ISO_DATE.test(v) ? v : null;
}
function copyScheduleToVisit(scheduledStart, scheduledEnd) {
  const start = isoDate(scheduledStart);
  if (!start) return null;
  const rawEnd = isoDate(scheduledEnd);
  const end = rawEnd && rawEnd >= start ? rawEnd : start;
  return { actualStartDate: start, actualEndDate: end };
}
function visitLinkAvailability({
  scheduledStart,
  canEdit
}) {
  if (!canEdit) {
    return { enabled: false, reason: "View only — visit dates need edit access" };
  }
  if (!isoDate(scheduledStart)) {
    return { enabled: false, reason: "Set the scheduled start first" };
  }
  return { enabled: true, reason: null };
}

export { visitLinkAvailability as a, copyScheduleToVisit as c, visitFillText as v };
