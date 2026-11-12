import { describe, expect, test } from "bun:test";

import {
  DATE_INPUT_ERROR,
  addDays,
  dateRuleError,
  daysBetweenIso,
  formatDateLong,
  isIsoDate,
  monthGrid,
  parseDateText,
  todayIsoIST,
} from "../src/lib/dateInput";

describe("date-only parsing", () => {
  test("accepts every documented typed form", () => {
    expect(parseDateText("06-11-2025")).toBe("2025-11-06");
    expect(parseDateText("06/11/2025")).toBe("2025-11-06");
    expect(parseDateText("6-Nov-25")).toBe("2025-11-06");
    expect(parseDateText("06-NOV-2025")).toBe("2025-11-06");
    expect(parseDateText("6 Sept 2025")).toBe("2025-09-06");
    expect(parseDateText("2025-11-6")).toBe("2025-11-06");
  });

  test("rejects impossible and ambiguous dates instead of guessing", () => {
    expect(parseDateText("31-02-2025")).toBeNull();
    expect(parseDateText("not a date")).toBeNull();
    expect(parseDateText("13/25/2025")).toBeNull();
    expect(parseDateText("")).toBeNull();
  });

  test("formats as DD-MMM-YYYY and only accepts real ISO values", () => {
    expect(formatDateLong("2025-11-06")).toBe("06-Nov-2025");
    expect(isIsoDate("2025-11-06")).toBe(true);
    expect(isIsoDate("2025-11-6")).toBe(false);
    expect(isIsoDate("06-11-2025")).toBe(false);
    expect(formatDateLong("06-11-2025")).toBe("");
  });
});

describe("date arithmetic and ordering", () => {
  test("adds days across month and year boundaries without UTC drift", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  test("date-only ISO strings order 25-Sep before 01-Oct", () => {
    expect("2026-09-25" < "2026-10-01").toBe(true);
    expect(daysBetweenIso("2026-09-25", "2026-10-01")).toBe(6);
  });

  test("today is read in IST near the UTC midnight edge", () => {
    expect(todayIsoIST(new Date("2026-10-24T18:45:00Z"))).toBe("2026-10-25");
    expect(todayIsoIST(new Date("2026-10-24T17:45:00Z"))).toBe("2026-10-24");
  });

  test("range rules explain min/max in plain words", () => {
    expect(dateRuleError("2027-08-17", { max: "2026-10-24" })).toContain("24-Oct-2026");
    expect(dateRuleError("2024-01-01", { min: "2025-08-18" })).toContain("18-Aug-2025");
    expect(dateRuleError("2026-10-24", { min: "2025-08-18", max: "2026-10-24" })).toBeNull();
    expect(dateRuleError("nonsense", {})).toBe(DATE_INPUT_ERROR);
  });
});

describe("calendar grid", () => {
  test("is Monday-first and pads the lead/tail", () => {
    const sept = monthGrid(2025, 9); // 1 Sep 2025 is a Monday
    expect(sept[0]).toBe("2025-09-01");
    const oct = monthGrid(2025, 10); // 1 Oct 2025 is a Wednesday
    expect(oct[0]).toBeNull();
    expect(oct[1]).toBeNull();
    expect(oct[2]).toBe("2025-10-01");
    expect(oct.length % 7).toBe(0);
  });
});
