/**
 * PART 1 — schedule → visit rules (pure).
 *
 * Pins the root cause of the disabled "Visit dates same as scheduled"
 * checkbox: the old condition required BOTH scheduled dates. The scheduled end
 * is optional and falls back to the start; the box is enabled for any past or
 * today's scheduled start and disabled only with a real, stated reason.
 */
import { describe, expect, test } from "bun:test";

import {
  autofillEndFromStart,
  copyScheduleToVisit,
  needsVisitReplaceConfirm,
  scheduleRangeWarning,
  visitDurationDays,
  visitLinkAvailability,
  visitSummary,
} from "../src/lib/scheduleVisit";

const TODAY = "2026-10-24"; // the brief's "today"

describe("copyScheduleToVisit", () => {
  test("copies a two-day schedule", () => {
    expect(copyScheduleToVisit("2025-11-06", "2025-11-07")).toEqual({
      actualStartDate: "2025-11-06",
      actualEndDate: "2025-11-07",
    });
  });

  test("an empty scheduled end falls back to the start (one-day visit)", () => {
    expect(copyScheduleToVisit("2025-11-06", "")).toEqual({
      actualStartDate: "2025-11-06",
      actualEndDate: "2025-11-06",
    });
    expect(copyScheduleToVisit("2025-11-06")).toEqual({
      actualStartDate: "2025-11-06",
      actualEndDate: "2025-11-06",
    });
  });

  test("an end BEFORE the start is never copied backwards", () => {
    expect(copyScheduleToVisit("2025-11-06", "2025-11-01")?.actualEndDate).toBe("2025-11-06");
  });

  test("no scheduled start ⇒ nothing to copy", () => {
    expect(copyScheduleToVisit("", "2025-11-06")).toBeNull();
  });

  test("display text is never parsed (date-order safety)", () => {
    // 01-Oct vs 25-Sep: as ISO strings October is later; as text "01-10" would
    // sort before "25-09". Only ISO input is accepted, so nothing shifts.
    expect(copyScheduleToVisit("2026-10-01", "2026-09-25")?.actualEndDate).toBe("2026-10-01");
    expect(copyScheduleToVisit("06-Nov-2025", "")).toBeNull();
  });
});

describe("autofillEndFromStart", () => {
  test("fills an empty end from the start", () => {
    expect(autofillEndFromStart({ start: "2025-11-06", end: "", endTouched: false })).toBe(
      "2025-11-06",
    );
  });

  test("never touches an end that already has a value", () => {
    expect(
      autofillEndFromStart({ start: "2025-11-06", end: "2025-11-09", endTouched: false }),
    ).toBeNull();
  });

  test("an end the user cleared in this session is not refilled", () => {
    expect(autofillEndFromStart({ start: "2025-11-06", end: "", endTouched: true })).toBeNull();
  });

  test("no start ⇒ no fill", () => {
    expect(autofillEndFromStart({ start: "", end: "", endTouched: false })).toBeNull();
  });
});

describe("visitLinkAvailability", () => {
  test("enabled for a past scheduled start with no scheduled end", () => {
    expect(
      visitLinkAvailability({ scheduledStart: "2025-11-06", canEdit: true, todayIso: TODAY }),
    ).toEqual({ enabled: true, reason: null });
  });

  test("enabled today (IST calendar day)", () => {
    expect(
      visitLinkAvailability({ scheduledStart: TODAY, canEdit: true, todayIso: TODAY }).enabled,
    ).toBe(true);
  });

  test("disabled with a real reason in the future", () => {
    const state = visitLinkAvailability({
      scheduledStart: "2026-11-06",
      canEdit: true,
      todayIso: TODAY,
    });
    expect(state.enabled).toBe(false);
    expect(state.reason).toBe(
      "Scheduled date is in the future; visit dates can be entered after the visit",
    );
  });

  test("disabled with a real reason without a start", () => {
    expect(
      visitLinkAvailability({ scheduledStart: "", canEdit: true, todayIso: TODAY }).reason,
    ).toBe("Enter the scheduled start date first");
  });

  test("disabled for a viewer", () => {
    expect(
      visitLinkAvailability({ scheduledStart: "2025-11-06", canEdit: false, todayIso: TODAY })
        .reason,
    ).toBe("View only — visit dates need edit access");
  });
});

describe("needsVisitReplaceConfirm", () => {
  const next = { actualStartDate: "2025-11-06", actualEndDate: "2025-11-06" };
  test("an empty visit never asks", () => {
    expect(needsVisitReplaceConfirm("", "", next)).toBe(false);
  });
  test("identical dates never ask", () => {
    expect(needsVisitReplaceConfirm("2025-11-06", "2025-11-06", next)).toBe(false);
  });
  test("different recorded dates ask", () => {
    expect(needsVisitReplaceConfirm("2025-11-04", "2025-11-05", next)).toBe(true);
    expect(needsVisitReplaceConfirm("2025-11-06", "", next)).toBe(true);
  });
});

describe("duration, warning and summary", () => {
  test("duration is inclusive and blank-safe", () => {
    expect(visitDurationDays("2025-11-06", "2025-11-06")).toBe(0);
    expect(visitDurationDays("2025-11-06", "2025-11-08")).toBe(2);
    expect(visitDurationDays("", "2025-11-08")).toBeNull();
  });

  test("end before start is a warning, not an error", () => {
    expect(scheduleRangeWarning("2025-11-06", "2025-11-05")).toBe(
      "Scheduled end date is before the scheduled start date.",
    );
    expect(scheduleRangeWarning("2025-11-06", "2025-11-06")).toBeNull();
  });

  test("summary reads as a visit row", () => {
    expect(visitSummary("2025-11-06", "2025-11-06", (iso) => iso)).toBe(
      "2025-11-06 → 2025-11-06 · Duration: 1 day",
    );
  });
});
