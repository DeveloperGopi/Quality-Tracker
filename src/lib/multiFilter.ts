/** Shared predicate behind every multi-select filter dropdown (linelist,
 *  reports, quick-view pages, summary report).
 *
 *  - "all" matches everything (the default / no-filter state).
 *  - An empty selection also matches everything — "Deselect all" clears the
 *    filter instead of silently showing an empty table.
 *  - A non-empty selection keeps only rows whose stored value is one of the
 *    selected values; missing values (null/undefined) never match a
 *    concrete selection. */

export type MultiFilter = "all" | readonly string[];

export function multiFilterMatches(
  value: string | null | undefined,
  filter: MultiFilter,
): boolean {
  if (filter === "all" || filter.length === 0) return true;
  return filter.includes(value ?? "");
}
