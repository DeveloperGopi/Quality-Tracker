/** Which stored document satisfies the NQAS Result requirement.
 *
 * The live file lives in `facilityDocuments`. `NQAS_Certificate` is the legacy
 * key for the same document. The profile, the Documents card and the server
 * save gate must all agree on this rule.
 */

export type StoredResultDocument = {
  docKey: string;
  cycleNo?: number | null;
  isCurrent: boolean;
  removedAt?: number | null;
};

export function hasCurrentNqasResultDocument(
  rows: readonly StoredResultDocument[],
  cycleNo: number,
  scope: "cycle" | "facility" = "cycle",
): boolean {
  return rows.some(
    (row) =>
      (row.docKey === "NQAS_Result" || row.docKey === "NQAS_Certificate") &&
      row.isCurrent &&
      !row.removedAt &&
      (scope === "facility" || (row.cycleNo ?? 1) === cycleNo),
  );
}
