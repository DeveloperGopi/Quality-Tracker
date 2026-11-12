/**
 * "RESULT DECLARED" — ONE rule for the client and the Convex backend.
 *
 * A facility whose NQAS Certification Status is Quality Certified, Quality
 * Certified with Conditionality or Deferred has had its result declared, so
 * its SaQsham Documents Status is "Result Declared" automatically — the same
 * transaction as the certification edit, audited with source "auto: result".
 *
 * Switching the certification status away from those three restores the last
 * portal value (never a guess): the backend keeps the portal value beside the
 * auto value, and this module only decides WHAT is declared.
 */

export const RESULT_DECLARED = "Result Declared";
/** The label the report column shows (sentence case, neutral chip). */
export const RESULT_DECLARED_LABEL = "Result declared";

/** The three certification statuses that mean "the result is out". */
export const RESULT_DECLARED_STATUSES = [
  "Quality Certified",
  "Quality Certified with Conditionality",
  "Deferred",
] as const;

const norm = (v: string | null | undefined) => String(v ?? "").trim().toLowerCase();

/** True for the three declared statuses, case/space tolerant. */
export function isResultDeclaredStatus(certStatus: string | null | undefined): boolean {
  const v = norm(certStatus);
  return RESULT_DECLARED_STATUSES.some((s) => norm(s) === v);
}

/** True when a stored status IS the automatic value. */
export function isResultDeclared(value: string | null | undefined): boolean {
  return norm(value) === norm(RESULT_DECLARED);
}

/**
 * The SaQsham Documents Status column: the exact portal text from the latest
 * import (or the automatic Result Declared value). A missing portal text is a
 * blank — NEVER the report group copied across.
 */
export function saqshamDocumentsStatusOf(
  generalDocStatus: string | null | undefined,
  certificationStatus?: string | null,
): string | null {
  if (isResultDeclaredStatus(certificationStatus)) return RESULT_DECLARED;
  if (isResultDeclared(generalDocStatus)) return RESULT_DECLARED;
  const v = String(generalDocStatus ?? "").trim();
  if (!v) return null;
  return norm(v) === "not started" || norm(v) === "not yet started" ? "Not started" : v;
}

/**
 * The report ("Documents Status") value for a facility:
 *   • the auto value → "Result declared" (a real chip, never blank / "-");
 *   • otherwise the portal value exactly as imported.
 * A blank is never invented as 0 or as a status.
 */
export function documentsStatusReportOf(
  generalDocStatus: string | null | undefined,
  portalReport: string | null | undefined,
  /** The certification result — when it is declared, the result IS declared
   *  even on rows written before the automatic rule existed. Read-time, so it
   *  cannot go stale and imports cannot downgrade it. */
  certificationStatus?: string | null,
): string | null {
  if (isResultDeclaredStatus(certificationStatus)) return RESULT_DECLARED_LABEL;
  if (isResultDeclared(generalDocStatus)) return RESULT_DECLARED_LABEL;
  const v = String(portalReport ?? "").trim();
  if (!v) return null;
  if (norm(v) === "result declared") return RESULT_DECLARED_LABEL;
  return norm(v) === "not started" || norm(v) === "not yet started" ? "Not started" : v;
}

/** The two document columns share the exact casing "Result Declared". */
export function documentsStatusReportDisplayOf(
  generalDocStatus: string | null | undefined,
  portalReport: string | null | undefined,
  certificationStatus?: string | null,
): string | null {
  const v = documentsStatusReportOf(generalDocStatus, portalReport, certificationStatus);
  return v === RESULT_DECLARED_LABEL ? RESULT_DECLARED : v;
}

/**
 * Imports must never move a facility BACKWARDS from "Result Declared" to an
 * earlier portal status. Returns true when the incoming portal status would be
 * a downgrade and the stored value must be kept.
 */
export function importWouldDowngrade(
  storedGeneralDocStatus: string | null | undefined,
  incomingPortalStatus: string | null | undefined,
): boolean {
  if (!isResultDeclared(storedGeneralDocStatus)) return false;
  const incoming = String(incomingPortalStatus ?? "").trim();
  if (!incoming) return true;
  return !isResultDeclared(incoming);
}
