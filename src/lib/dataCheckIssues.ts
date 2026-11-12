/**
 * Stable issue keys shared by the server health summary and the Admin cards.
 * Ignoring an issue must survive a query re-run, so both sides derive the key
 * from the same row fields — never from a display label or array position.
 */

export const DATA_CHECK_IDS = [
  "surveillance",
  "visitDates",
  "documentNames",
  "resultDeclared",
  "assessorNames",
  "annexure",
] as const;

export type DataCheckId = (typeof DATA_CHECK_IDS)[number];

export function isDataCheckId(value: unknown): value is DataCheckId {
  return typeof value === "string" && (DATA_CHECK_IDS as readonly string[]).includes(value);
}

type RowLike = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function dataCheckIssueKey(check: DataCheckId, row: RowLike): string {
  switch (check) {
    case "surveillance":
      return `${text(row.naId)}|${text(row.field)}`;
    case "visitDates":
      return text(row.key);
    case "documentNames":
      return text(row.id);
    case "resultDeclared":
      return text(row.saId);
    case "assessorNames":
      return `${text(row.saId)}:${String(row.slot ?? "")}`;
    case "annexure":
      return `${text(row.facilityId)}-${String(row.cycleNumber ?? "none")}`;
  }
}

/** Filter a candidate list by active ignored keys (never mutates the row). */
export function filterIgnoredIssues<T extends RowLike>(
  check: DataCheckId,
  rows: T[],
  ignored: ReadonlySet<string>,
): T[] {
  if (ignored.size === 0) return rows;
  return rows.filter((row) => !ignored.has(dataCheckIssueKey(check, row)));
}

export function ignoredCountsByCheck(
  records: readonly { check: string }[],
): Record<DataCheckId, number> {
  const counts = Object.fromEntries(DATA_CHECK_IDS.map((id) => [id, 0])) as Record<
    DataCheckId,
    number
  >;
  for (const record of records) {
    if (isDataCheckId(record.check)) counts[record.check] += 1;
  }
  return counts;
}
