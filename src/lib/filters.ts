/** Filter helpers shared by the list pages' toolbars. */

/** Counts how many of the given filter values are actively narrowing a list.
 *  A value of `"all"`, an empty array, or `undefined` does not count. */
export function countActiveFilters(
  filters: (string | string[] | "all" | undefined)[],
): number {
  let n = 0;
  for (const f of filters) {
    if (f == null) continue;
    if (Array.isArray(f)) {
      if (f.length > 0) n += 1;
    } else if (f !== "all") {
      n += 1;
    }
  }
  return n;
}
