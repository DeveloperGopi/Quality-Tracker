import { describe, expect, test } from "bun:test";

import {
  dataCheckIssueKey,
  filterIgnoredIssues,
  ignoredCountsByCheck,
} from "../src/lib/dataCheckIssues";

const surveillanceRows = [
  { naId: "na-1", field: "reason", facility: "Agaram" },
  { naId: "na-1", field: "status", facility: "Agaram" },
  { naId: "na-2", field: "reason", facility: "Athanavur" },
];

describe("Data Checks ignore and restore", () => {
  test("issue keys are stable and include the field, not the display label", () => {
    expect(dataCheckIssueKey("surveillance", surveillanceRows[0]!)).toBe("na-1|reason");
    expect(dataCheckIssueKey("visitDates", { key: "visit-9" })).toBe("visit-9");
    expect(dataCheckIssueKey("assessorNames", { saId: "sa-1", slot: 2 })).toBe("sa-1:2");
    expect(dataCheckIssueKey("annexure", { facilityId: "f1", cycleNumber: 3 })).toBe("f1-3");
    expect(dataCheckIssueKey("annexure", { facilityId: "f1", cycleNumber: null })).toBe("f1-none");
  });

  test("ignoring hides only the matching key; restoring brings it back unchanged", () => {
    const original = JSON.parse(JSON.stringify(surveillanceRows)) as typeof surveillanceRows;
    const ignored = new Set(["na-1|reason"]);

    const active = filterIgnoredIssues("surveillance", surveillanceRows, ignored);
    expect(active.map((row) => dataCheckIssueKey("surveillance", row))).toEqual([
      "na-1|status",
      "na-2|reason",
    ]);

    // Restore removes the active ignore row. Candidate data was never mutated.
    const restored = new Set(ignored);
    restored.delete("na-1|reason");
    expect(filterIgnoredIssues("surveillance", surveillanceRows, restored)).toHaveLength(3);
    expect(surveillanceRows).toEqual(original);
  });

  test("counts are per check and survive unknown check ids", () => {
    const counts = ignoredCountsByCheck([
      { check: "surveillance" },
      { check: "surveillance" },
      { check: "annexure" },
      { check: "legacyRemovedCheck" },
    ]);
    expect(counts.surveillance).toBe(2);
    expect(counts.annexure).toBe(1);
    expect(counts.visitDates).toBe(0);
    expect(Object.values(counts).reduce((sum, value) => sum + value, 0)).toBe(3);
  });
});
