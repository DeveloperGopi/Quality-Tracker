/**
 * OPTION COUNTS for the filter dropdowns.
 *
 * Every option carries the number of facilities the user would see if that
 * option were the only one selected in ITS filter — computed against the OTHER
 * active filters. That is the number that answers the only question a "(23)"
 * beside a checkbox can answer: "what do I get if I tick this?".
 *
 * It is pure and lives here (not in the page) so it is unit-tested
 * (scripts/listView.test.ts) and so the master list, its tests and any future
 * list share one definition of a count. An option with 0 rows is left in the
 * data as 0 — the dropdown greys it out but keeps it selectable, because
 * another filter may be exactly why it is empty.
 */

import { applyMasterFilters, type MasterFilters } from "@/lib/masterFilter";
import type { MasterRow } from "@/lib/masterColumns";

/** The values each dropdown offers, in the order it shows them. */
export type FilterOptionValues = {
  block: string[];
  type: string[];
  cycle: string[];
  eligibility: string[];
  cert: string[];
  status: string[];
  docRep: string[];
  btype: string[];
  bstatus: string[];
  noc: string[];
};

export type FilterOptionCounts = Record<keyof FilterOptionValues, Map<string, number>>;

/** Which `MasterFilters` field a dropdown drives. */
const ARG_FOR: Record<keyof FilterOptionValues, keyof MasterFilters> = {
  block: "blocks",
  type: "types",
  cycle: "cycles",
  eligibility: "eligibility",
  cert: "certStatus",
  status: "status",
  docRep: "docReport",
  btype: "buildingType",
  bstatus: "buildingStatus",
  noc: "nocStatus",
};

/**
 * Count each option, live. `filterArgs` is the object the list itself filters
 * with, so the counts can never describe a different list than the one on
 * screen.
 */
export function countListOptions<T extends MasterRow>(
  rows: T[],
  filterArgs: MasterFilters,
  values: FilterOptionValues,
): FilterOptionCounts {
  const keys = Object.keys(ARG_FOR) as (keyof FilterOptionValues)[];
  const out = {} as FilterOptionCounts;
  for (const key of keys) {
    const counts = new Map<string, number>();
    const arg = ARG_FOR[key];
    for (const value of values[key]) {
      counts.set(value, applyMasterFilters(rows, { ...filterArgs, [arg]: [value] }).length);
    }
    out[key] = counts;
  }
  return out;
}
