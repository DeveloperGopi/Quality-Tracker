/**
 * SURVEILLANCE DONE-DATE DATA CHECK (Part H) — pure rules shared by the Admin
 * screen and its tests.
 *
 * A surveillance done date is a REAL visit date. Two stored shapes are always
 * wrong and must be confirmed by an administrator before anything changes:
 *
 *   future  — later than today (IST): the visit has not happened yet,
 *   copied  — exactly the due date: the schedule was written into the visit.
 *
 * Nothing here writes. The screen builds a plan, previews it, and only then
 * calls the audited mutation with the exact entries the admin confirmed.
 */

export type SurveillanceField = "surveillanceDone1" | "surveillanceDone2";

export type SurveillanceAuditRow = {
  facilityId: string;
  facilityName: string;
  block: string;
  facilityType: string | null;
  naId: string;
  field: SurveillanceField;
  /** Human label, e.g. "1st Surveillance Assessment Done Date". */
  label: string;
  done: string;
  due: string | null;
  /** manualScore — the score beside the 2nd surveillance date. */
  score: number | null;
  reason: string;
  kind: "future" | "copied";
  cycleNumber: number | null;
};

export type SurveillanceChoice = "keep" | "clear" | "set";

export type SurveillanceDecision = {
  naId: string;
  field: SurveillanceField;
  action: SurveillanceChoice;
  /** Only for action "set" — must be today or earlier. */
  newDate?: string;
};

export type PlanProblem = { naId: string; field: SurveillanceField; message: string };

/** "a score needs a done date" — clearing the last done date while a score is
 *  stored would leave a score with no visit behind it. The plan clears the
 *  score in the same transaction and says so in the preview. */
export function scoreWillBeCleared(row: SurveillanceAuditRow): boolean {
  return row.field === "surveillanceDone2" && row.score != null;
}

/** What "Clear all future dates" selects: every future row, never a copied one
 *  (a copied date may still be a real visit recorded on the due date exactly —
 *  the admin decides those one by one). */
export function futureRows(rows: readonly SurveillanceAuditRow[]): SurveillanceAuditRow[] {
  return rows.filter((r) => r.kind === "future");
}

export function defaultDecision(row: SurveillanceAuditRow): SurveillanceDecision {
  // The safest default is explicit: nothing is cleared until the admin picks.
  return { naId: row.naId, field: row.field, action: "keep" };
}

/** Validate one decision against today (ISO, local/IST calendar). */
export function validateDecision(
  row: SurveillanceAuditRow,
  decision: SurveillanceDecision,
  today: string,
): string | null {
  if (decision.action !== "set") return null;
  const value = (decision.newDate ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${row.label}: choose a valid date (YYYY-MM-DD)`;
  }
  if (value > today) {
    return `${row.label}: a done date cannot be in the future (today is ${today})`;
  }
  if (value === row.due) {
    return `${row.label}: ${value} is the due date — a done date must be the real visit date`;
  }
  return null;
}

export type SurveillancePlan = {
  /** Decisions that will change something. */
  changes: (SurveillanceDecision & { row: SurveillanceAuditRow; clearsScore: boolean })[];
  /** Rows the admin is keeping as they are. */
  kept: SurveillanceAuditRow[];
  problems: PlanProblem[];
  /** Distinct facilities affected — the status recompute set. */
  facilities: string[];
  clearsScores: number;
};

/** Build the apply plan: validation first, then the exact change list. */
export function buildSurveillancePlan(
  rows: readonly SurveillanceAuditRow[],
  decisions: readonly SurveillanceDecision[],
  today: string,
): SurveillancePlan {
  const byKey = new Map(decisions.map((d) => [`${d.naId}|${d.field}`, d]));
  const changes: SurveillancePlan["changes"] = [];
  const kept: SurveillanceAuditRow[] = [];
  const problems: PlanProblem[] = [];
  const facilities = new Set<string>();
  let clearsScores = 0;

  for (const row of rows) {
    const decision =
      byKey.get(`${row.naId}|${row.field}`) ?? defaultDecision(row);
    const problem = validateDecision(row, decision, today);
    if (problem) {
      problems.push({ naId: row.naId, field: row.field, message: problem });
      continue;
    }
    if (decision.action === "keep") {
      kept.push(row);
      continue;
    }
    const clearsScore = decision.action === "clear" && scoreWillBeCleared(row);
    if (clearsScore) clearsScores += 1;
    changes.push({ ...decision, row, clearsScore });
    facilities.add(row.facilityId);
  }

  return { changes, kept, problems, facilities: [...facilities], clearsScores };
}

/** One-line summary for the preview dialog and the apply toast. */
export function planSummary(plan: SurveillancePlan): string {
  if (plan.changes.length === 0) return "No changes selected";
  const cleared = plan.changes.filter((c) => c.action === "clear").length;
  const set = plan.changes.filter((c) => c.action === "set").length;
  const parts = [
    cleared ? `${cleared} cleared` : null,
    set ? `${set} set to a new date` : null,
    plan.clearsScores ? `${plan.clearsScores} score${plan.clearsScores === 1 ? "" : "s"} cleared with them` : null,
    `${plan.facilities.length} facilit${plan.facilities.length === 1 ? "y" : "ies"}`,
  ].filter(Boolean);
  return parts.join(" · ");
}

export const SURVEILLANCE_AUDIT_LABEL: Record<SurveillanceField, string> = {
  surveillanceDone1: "1st Surveillance Assessment Done Date",
  surveillanceDone2: "2nd Surveillance Assessment Done Date",
};

export const SCORE_CLEARED_LABEL = "Surveillance Score %";
