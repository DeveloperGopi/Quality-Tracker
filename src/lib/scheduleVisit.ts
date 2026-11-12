/**
 * SCHEDULE ⇄ VISIT — the ONE pure rule set shared by the State Assessment and
 * NQAS Assessment forms (and by their tests).
 *
 * Part 1 root cause it replaces: the NQAS "Visit dates same as scheduled"
 * checkbox required BOTH scheduled dates
 * (`!!draft.scheduledStartDate && !!draft.scheduledEndDate`), so a facility
 * with only a scheduled start (the normal case — the planned end is very often
 * left blank because the visit is one day) showed a grey, disabled box even
 * though the scheduled date was long past.
 *
 * Every rule here works on DATE-ONLY ISO strings (yyyy-mm-dd). Display text
 * ("06-Nov-2025") is never parsed, so dd-mm-yyyy and mm-dd-yyyy can never be
 * confused, and there is no UTC shift: the strings are compared as strings.
 */

export type VisitDates = {
  actualStartDate: string;
  actualEndDate: string;
};

/** Which date fields were filled from the schedule (rather than typed). */
export type AutoDates = {
  scheduledEnd?: boolean;
  actualStart?: boolean;
  actualEnd?: boolean;
};

export type ScheduleDates = VisitDates & {
  scheduledEndDate: string;
};

/** Initial auto markers from stored values: a blank or schedule-equal date is
 *  treated as still following the schedule, a different date as manual. */
export function inferAutoDates(input: {
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string;
  actualEnd: string;
}): AutoDates {
  const start = isoDate(input.scheduledStart);
  const end = isoDate(input.scheduledEnd) ?? start;
  return {
    scheduledEnd: !isoDate(input.scheduledEnd),
    actualStart: !!start && (!input.actualStart || input.actualStart === start),
    actualEnd:
      !!start &&
      (!input.actualEnd ||
        input.actualEnd === end ||
        input.actualEnd === start),
  };
}

/**
 * ONE schedule → visit fill rule (both assessments).
 *
 * Only fields that are empty or still `auto` are written, so a typed/selected
 * date always wins. Actual dates never become future dates: while the
 * scheduled start is ahead, only the scheduled end fills; the visit follows
 * when the date arrives (or when Completed is pressed, which re-runs this).
 */
export function fillScheduleDates(input: {
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string;
  actualEnd: string;
  auto: AutoDates;
  today: string;
  trigger: "start" | "end" | "reset" | "complete";
}): ScheduleDates & { auto: AutoDates; notice: string | null } {
  const start = isoDate(input.scheduledStart);
  const today = isoDate(input.today) ?? input.today;
  const auto = { ...input.auto };
  let scheduledEnd = isoDate(input.scheduledEnd) ?? "";
  let actualStart = isoDate(input.actualStart) ?? "";
  let actualEnd = isoDate(input.actualEnd) ?? "";
  let notice: string | null = null;
  if (!start) {
    return { scheduledEndDate: scheduledEnd, actualStartDate: actualStart, actualEndDate: actualEnd, auto, notice };
  }

  const maySet = (kind: keyof AutoDates, value: string) =>
    !value || input.auto[kind] === true;
  const future = start > today;

  if (input.trigger === "reset") {
    // Explicit reset: the schedule wins over every manual date.
    scheduledEnd = start;
    auto.scheduledEnd = true;
    if (!future) {
      actualStart = start;
      actualEnd = start;
      auto.actualStart = true;
      auto.actualEnd = true;
    }
    return { scheduledEndDate: scheduledEnd, actualStartDate: actualStart, actualEndDate: actualEnd, auto, notice };
  }
  if (input.trigger === "start") {
    if (maySet("scheduledEnd", scheduledEnd)) {
      scheduledEnd = start;
      auto.scheduledEnd = true;
    }
  }
  if (input.trigger === "end") {
    // A hand-edited scheduled end moves the actual end only while it is auto.
    if (scheduledEnd && maySet("actualEnd", actualEnd) && !future) {
      actualEnd = scheduledEnd > today ? today : scheduledEnd;
      auto.actualEnd = true;
    }
    return { scheduledEndDate: scheduledEnd, actualStartDate: actualStart, actualEndDate: actualEnd, auto, notice };
  }

  if (future && input.trigger !== "complete") {
    return {
      scheduledEndDate: scheduledEnd,
      actualStartDate: actualStart,
      actualEndDate: actualEnd,
      auto,
      notice: "Visit dates fill when the date arrives",
    };
  }

  if (!future) {
    if (maySet("actualStart", actualStart)) {
      actualStart = start;
      auto.actualStart = true;
    }
    if (maySet("actualEnd", actualEnd)) {
      const plannedEnd = scheduledEnd && scheduledEnd >= start ? scheduledEnd : start;
      actualEnd = plannedEnd > today ? today : plannedEnd;
      auto.actualEnd = true;
    }
  }
  return { scheduledEndDate: scheduledEnd, actualStartDate: actualStart, actualEndDate: actualEnd, auto, notice };
}

export type VisitFillPlan = {
  fillStart: string;
  fillEnd: string;
  setStart: boolean;
  setEnd: boolean;
  needsDecision: boolean;
  reason: string | null;
};

/**
 * Data Checks fill plan: ONLY blank actual fields are filled. An existing date
 * is never overwritten, even when its pair is blank. If the scheduled start
 * would sit after an existing end (or before an existing start when filling
 * the end), the row needs a human decision instead.
 */
export function planVisitDatesFill(input: {
  scheduledStart: string;
  actualStart: string;
  actualEnd: string;
  today: string;
}): VisitFillPlan {
  const scheduled = isoDate(input.scheduledStart);
  const start = isoDate(input.actualStart);
  const end = isoDate(input.actualEnd);
  const empty = { fillStart: "", fillEnd: "", setStart: false, setEnd: false };
  if (!scheduled || scheduled > input.today) {
    return { ...empty, needsDecision: false, reason: null };
  }
  if (!start && !end) {
    return {
      fillStart: scheduled,
      fillEnd: scheduled,
      setStart: true,
      setEnd: true,
      needsDecision: false,
      reason: null,
    };
  }
  if (!start && end) {
    if (scheduled > end) {
      return {
        ...empty,
        needsDecision: true,
        reason: `Scheduled start is after the existing end (${end}).`,
      };
    }
    return {
      fillStart: scheduled,
      fillEnd: end,
      setStart: true,
      setEnd: false,
      needsDecision: false,
      reason: null,
    };
  }
  if (start && !end) {
    if (scheduled < start) {
      return {
        ...empty,
        needsDecision: true,
        reason: `Scheduled start is before the existing start (${start}).`,
      };
    }
    return {
      fillStart: start,
      fillEnd: scheduled,
      setStart: false,
      setEnd: true,
      needsDecision: false,
      reason: null,
    };
  }
  return { ...empty, needsDecision: false, reason: null };
}

function displayDate(value: string): string {
  const iso = isoDate(value);
  if (!iso) return "-";
  const [year, month, day] = iso.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${day}-${months[Number(month) - 1]}-${year}`;
}

/** The exact human sentence shown by Data Checks for a fill plan. */
export function visitFillText(
  plan: VisitFillPlan & { actualEnd?: string | null },
): string {
  if (plan.needsDecision) {
    return `Needs your decision — ${plan.reason ?? "the scheduled date conflicts with an existing date."}`;
  }
  const bits: string[] = [];
  if (plan.setStart) bits.push(`Start = ${displayDate(plan.fillStart)}`);
  if (plan.setEnd) bits.push(`End = ${displayDate(plan.fillEnd)}`);
  if (!plan.setEnd && plan.actualEnd) bits.push(`(end ${displayDate(plan.actualEnd)} kept)`);
  return bits.join(" ") || "-";
}

/** Fill the couple of dates that are still empty when a save is attempted for
 *  a completed assessment. Never invents a future visit. */
export function fillCompletedDates(input: {
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string;
  actualEnd: string;
  auto: AutoDates;
  today: string;
}) {
  return fillScheduleDates({ ...input, trigger: "complete" });
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A trimmed, valid date-only ISO string, else null. */
export function isoDate(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  return ISO_DATE.test(v) ? v : null;
}

/**
 * The visit dates that "same as scheduled" produces.
 * The scheduled end falls back to the scheduled start when it is empty (or
 * before it — a one-day visit). Returns null without a scheduled start.
 */
export function copyScheduleToVisit(
  scheduledStart: string | null | undefined,
  scheduledEnd?: string | null,
): VisitDates | null {
  const start = isoDate(scheduledStart);
  if (!start) return null;
  const rawEnd = isoDate(scheduledEnd);
  const end = rawEnd && rawEnd >= start ? rawEnd : start;
  return { actualStartDate: start, actualEndDate: end };
}

/**
 * Setting/changing the scheduled start copies it into the scheduled END only
 * when the end is empty and the user has not deliberately cleared it in this
 * session (`endTouched`). Returns the value to write, or null to leave the end
 * exactly as it is.
 */
export function autofillEndFromStart({
  start,
  end,
  endTouched,
}: {
  start: string | null | undefined;
  end: string | null | undefined;
  endTouched: boolean;
}): string | null {
  const s = isoDate(start);
  if (!s || endTouched) return null;
  if (isoDate(end)) return null;
  return s;
}

/** Number of days a visit spans (same-day visit = 0). Null without both dates. */
export function visitDurationDays(
  start: string | null | undefined,
  end: string | null | undefined,
): number | null {
  const s = isoDate(start);
  const e = isoDate(end);
  if (!s || !e) return null;
  return Math.round((Date.parse(e) - Date.parse(s)) / 86_400_000);
}

/** A warning (never an error) when the planned end is before the start. */
export function scheduleRangeWarning(
  start: string | null | undefined,
  end: string | null | undefined,
): string | null {
  const s = isoDate(start);
  const e = isoDate(end);
  if (!s || !e) return null;
  return e < s ? "Scheduled end date is before the scheduled start date." : null;
}

/**
 * Can the user tick "Visit dates same as scheduled"?
 * Enabled whenever editing is allowed and the scheduled start exists. The
 * scheduled end is NOT required (blank means a one-day visit).
 */
export function visitLinkAvailability({
  scheduledStart,
  canEdit,
}: {
  scheduledStart: string | null | undefined;
  canEdit: boolean;
  todayIso?: string;
}): { enabled: boolean; reason: string | null } {
  if (!canEdit) {
    return { enabled: false, reason: "View only — visit dates need edit access" };
  }
  if (!isoDate(scheduledStart)) {
    return { enabled: false, reason: "Set the scheduled start first" };
  }
  return { enabled: true, reason: null };
}

/**
 * True when the recorded visit dates differ from what ticking the box would
 * write — the caller must ask "Replace the recorded visit dates?" instead of
 * overwriting silently. A completely empty visit is never a conflict.
 */
export function needsVisitReplaceConfirm(
  actualStart: string | null | undefined,
  actualEnd: string | null | undefined,
  next: VisitDates,
): boolean {
  const currentStart = isoDate(actualStart);
  const currentEnd = isoDate(actualEnd);
  if (!currentStart && !currentEnd) return false;
  return (
    currentStart !== next.actualStartDate || currentEnd !== next.actualEndDate
  );
}

/** "06-Nov-2025 → 06-Nov-2025 · 1 day" — the Visit mini-row text. */
export function visitSummary(
  start: string | null | undefined,
  end: string | null | undefined,
  format: (iso: string) => string,
): string | null {
  const s = isoDate(start);
  const e = isoDate(end);
  if (!s && !e) return null;
  const days = visitDurationDays(s, e);
  const span = `${s ? format(s) : "—"} → ${e ? format(e) : "—"}`;
  if (days == null) return span;
  return `${span} · Duration: ${days + 1} day${days + 1 === 1 ? "" : "s"}`;
}
