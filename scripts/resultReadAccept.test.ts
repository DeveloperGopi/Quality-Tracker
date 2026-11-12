import { describe, expect, test } from "bun:test";

import {
  FIELD_KEYS,
  acceptCount,
  blockedReason,
  selectedRowsOf,
  toApplyItems,
  type FieldKey,
  type ReadRow,
} from "../src/lib/resultReadModel";

function readRow(overrides: Partial<ReadRow> = {}): ReadRow {
  const values = Object.fromEntries(
    FIELD_KEYS.map((field) => [field, ""]),
  ) as Record<FieldKey, string>;
  values.certifiedDate = "2025-12-24";
  values.assessmentStart = "2025-11-29";
  values.assessmentEnd = "2025-11-29";
  values.mode = "Physical";
  values.scopeOption = "12 Service Packages";
  values.checklistVersion = "Met 6 out of 6 Criteria";
  values.overallScore = "91.28";
  values.certificationStatus = "Quality Certified";
  const flags = Object.fromEntries(FIELD_KEYS.map((field) => [field, true])) as Record<
    FieldKey,
    boolean
  >;
  return {
    key: "doc:facility",
    documentId: "doc",
    documentName: "NQAS Result.pdf",
    documentHash: "hash",
    facilityId: "facility",
    facilityName: "AAM-SHC Agaram",
    block: "Tirupathur",
    cycleId: "cycle",
    cycleNumber: 1,
    letterPage: 1,
    annexurePage: 8,
    sourceName: "AAM-SHC Agaram",
    district: "Tirupathur",
    before: Object.fromEntries(FIELD_KEYS.map((field) => [field, ""])) as Record<FieldKey, string>,
    values,
    included: { ...flags },
    doubtful: { ...flags, overallScore: false },
    confirmed: { ...flags, overallScore: true },
    sources: Object.fromEntries(
      FIELD_KEYS.map((field) => [field, { page: 1, confidence: 94 }]),
    ) as ReadRow["sources"],
    selected: false,
    packagesText: "12 Service Packages",
    criteriaText: "Met 6 out of 6 Criteria",
    hasScores: false,
    areas: [],
    departments: [],
    pssScore: null,
    overallScore: 91.28,
    scoreEnabled: false,
    scoreConfirmed: false,
    scoreDoubtful: false,
    scoreSource: { page: 8, confidence: 90 },
    decision: "replace",
    scoreConflict: false,
    warnings: [],
    existingScores: null,
    manual: false,
    ...overrides,
  };
}

describe("Accept is the only save gate", () => {
  test("a proposed row is not selected by default, so nothing is applied", () => {
    const row = readRow();
    expect(selectedRowsOf([row])).toEqual([]);
    expect(toApplyItems([row])).toEqual([]);
    expect(blockedReason([row])).toMatch(/Tick a value/i);
  });

  test("selecting a row builds apply fields and an accurate count", () => {
    const row = readRow({ selected: true });
    expect(selectedRowsOf([row])).toHaveLength(1);
    expect(acceptCount(row)).toBe(FIELD_KEYS.length);
    expect(blockedReason([row])).toBeNull();
    const [item] = toApplyItems([row]);
    expect(item?.facilityId).toBe("facility");
    expect(item?.fields.overallScore).toBe(91.28);
    expect(item?.fields.certificationStatus).toBe("Quality Certified");
  });

  test("unticking a field omits it from the save payload", () => {
    const row = readRow({ selected: true });
    row.included.overallScore = false;
    expect(acceptCount(row)).toBe(FIELD_KEYS.length - 1);
    expect(toApplyItems([row])[0]?.fields.overallScore).toBeUndefined();
  });

  test("a doubtful value blocks Accept until it is confirmed", () => {
    const row = readRow({ selected: true });
    row.doubtful.certifiedDate = true;
    row.confirmed.certifiedDate = false;
    expect(blockedReason([row])).toMatch(/Confirm the yellow values/i);
    row.confirmed.certifiedDate = true;
    expect(blockedReason([row])).toBeNull();
  });
});
