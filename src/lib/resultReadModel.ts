/**
 * Result-reader confirmation model — pure, shared by the dialog and tests.
 *
 * Extraction is a proposal. A row is never saved until the user selects it,
 * ticks the fields they accept, confirms every doubtful value and presses
 * Apply. Nothing in this module talks to Convex.
 */

export const FIELD_KEYS = [
  "certifiedDate",
  "assessmentStart",
  "assessmentEnd",
  "mode",
  "scopeOption",
  "checklistVersion",
  "overallScore",
  "certificationStatus",
] as const;

export type FieldKey = (typeof FIELD_KEYS)[number];

export const FIELD_LABELS: Record<FieldKey, string> = {
  certifiedDate: "Letter date",
  assessmentStart: "Assessment start",
  assessmentEnd: "Assessment end",
  mode: "Mode",
  scopeOption: "Scope / packages",
  checklistVersion: "Checklist / criteria",
  overallScore: "Overall score",
  certificationStatus: "Certification status",
};

export type FieldSource = {
  page: number;
  confidence: number;
  text?: string;
};

export type ReadArea = { key: string; name: string; score: number };
export type ReadDepartment = {
  name: string;
  canonicalName: string;
  score: number;
  isNew: boolean;
  kind?: string;
};

export type ExistingScoreSnapshot = {
  overallScore: number | null;
  pssScore: number | null;
  letterScore: number | null;
  pageNumber: number;
  documentName: string;
  areas: ReadArea[];
  departments: ReadDepartment[];
};

export type ReadRow = {
  key: string;
  documentId: string;
  documentName: string;
  documentHash: string;
  facilityId: string;
  facilityName: string;
  block: string;
  cycleId: string;
  cycleNumber: number;
  letterPage: number;
  annexurePage: number | null;
  sourceName: string;
  district: string | null;
  before: Record<FieldKey, string>;
  values: Record<FieldKey, string>;
  included: Record<FieldKey, boolean>;
  doubtful: Record<FieldKey, boolean>;
  confirmed: Record<FieldKey, boolean>;
  sources: Record<FieldKey, FieldSource>;
  selected: boolean;
  packagesText: string;
  criteriaText: string;
  hasScores: boolean;
  areas: ReadArea[];
  departments: ReadDepartment[];
  pssScore: number | null;
  overallScore: number | null;
  scoreEnabled: boolean;
  scoreConfirmed: boolean;
  scoreDoubtful: boolean;
  scoreSource: FieldSource | null;
  decision: "skip" | "replace";
  scoreConflict: boolean;
  warnings: string[];
  existingScores: ExistingScoreSnapshot | null;
  manual: boolean;
};

export type ApplyFields = {
  certificationDate?: string;
  assessmentStartDate?: string;
  assessmentEndDate?: string;
  mode?: string;
  scopeOption?: string;
  checklistVersion?: string;
  overallScore?: number;
  certificationStatus?: string;
};

export type ApplyItem = {
  documentId: string;
  facilityId: string;
  cycleId: string;
  pageNumber: number;
  annexureFacilityName: string;
  district: string | null;
  fileHash: string;
  fields: ApplyFields;
  saveScores: boolean;
  decision: "skip" | "replace";
  warnings: string[];
  overallScore: number | null;
  pssScore: number | null;
  letterScore: number | null;
  areas: ReadArea[];
  departments: ReadDepartment[];
};

const FIELD_TO_APPLY: Record<FieldKey, keyof ApplyFields> = {
  certifiedDate: "certificationDate",
  assessmentStart: "assessmentStartDate",
  assessmentEnd: "assessmentEndDate",
  mode: "mode",
  scopeOption: "scopeOption",
  checklistVersion: "checklistVersion",
  overallScore: "overallScore",
  certificationStatus: "certificationStatus",
};

function numberValue(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return null;
  return Math.round(parsed * 100) / 100;
}

/** A field is accepted only when ticked, non-empty and not awaiting a doubt. */
export function fieldAccepted(row: ReadRow, field: FieldKey): boolean {
  return (
    row.included[field] &&
    row.values[field].trim() !== "" &&
    (!row.doubtful[field] || row.confirmed[field])
  );
}

export function acceptCount(row: ReadRow): number {
  return FIELD_KEYS.filter((field) => fieldAccepted(row, field)).length;
}

export function selectedRowsOf(rows: readonly ReadRow[]): ReadRow[] {
  return rows.filter((row) => row.selected);
}

export function blockedReason(rows: readonly ReadRow[]): string | null {
  const selected = selectedRowsOf(rows);
  if (selected.length === 0) return "Tick a value and select at least one row before saving.";
  if (selected.every((row) => acceptCount(row) === 0)) {
    return "Tick a value in each selected row before saving.";
  }
  const doubt = selected.find((row) =>
    FIELD_KEYS.some(
      (field) => row.included[field] && row.doubtful[field] && !row.confirmed[field],
    ),
  );
  if (doubt) {
    return "Confirm the yellow values before saving — they were read with low confidence.";
  }
  if (
    selected.some(
      (row) =>
        !row.facilityId ||
        !row.cycleId ||
        (row.scoreEnabled && row.scoreDoubtful && !row.scoreConfirmed) ||
        (row.scoreEnabled && row.scoreConflict && !row.scoreConfirmed),
    )
  ) {
    return "Choose a facility and cycle, and confirm any doubtful scores before saving.";
  }
  return null;
}

/** Convert only selected, accepted fields into the audited server payload. */
export function toApplyItems(rows: readonly ReadRow[]): ApplyItem[] {
  return selectedRowsOf(rows).flatMap((row) => {
    const fields: ApplyFields = {};
    for (const field of FIELD_KEYS) {
      if (!fieldAccepted(row, field)) continue;
      const key = FIELD_TO_APPLY[field];
      if (field === "overallScore") {
        const value = numberValue(row.values[field]);
        if (value != null) fields.overallScore = value;
      } else if (key !== "overallScore") {
        fields[key] = row.values[field].trim();
      }
    }
    if (Object.keys(fields).length === 0 && !row.scoreEnabled) return [];
    return [
      {
        documentId: row.documentId,
        facilityId: row.facilityId,
        cycleId: row.cycleId,
        pageNumber: row.annexurePage ?? row.letterPage,
        annexureFacilityName: row.sourceName || row.facilityName,
        district: row.district,
        fileHash: row.documentHash,
        fields,
        saveScores: row.scoreEnabled,
        decision: row.decision,
        warnings: row.warnings,
        overallScore: row.overallScore,
        pssScore: row.pssScore,
        letterScore: row.overallScore,
        areas: row.areas,
        departments: row.departments,
      },
    ];
  });
}
