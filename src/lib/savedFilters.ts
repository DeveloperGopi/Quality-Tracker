/**
 * Saved filters — one small store for the filter bar.
 *
 *   • "My filters" are personal and live in localStorage, so they return after
 *     a reload without a query per keystroke.
 *   • A State Admin can share a filter with a role. Shared filters live in the
 *     existing audited `appSettings` row (`savedFilters`), never in a new table.
 *
 * The values are the same `BarValue` the Universal FilterBar already uses, so a
 * saved view is just a name for a filter set and can never drift from it.
 */

import type { ActiveFilter, BarValue } from "@/components/UniversalFilterBar";

const MY_PREFIX = "nqas.filterbar.saved.v1.";
const LAST_PREFIX = "nqas.filterbar.last.v1.";

/** appSettings key for Admin-shared filters. */
export const SHARED_FILTERS_KEY = "savedFilters";

export type SavedFilter = {
  id: string;
  name: string;
  pageKey: string;
  value: Pick<BarValue, "barKeys" | "filters" | "match">;
  /** Set only on shared filters. "all" or a role key such as "dqmo". */
  role?: string;
  ownerName?: string;
};

const cleanValue = (value: SavedFilter["value"]): SavedFilter["value"] => ({
  barKeys: Array.isArray(value.barKeys) ? value.barKeys : [],
  filters: Array.isArray(value.filters)
    ? value.filters.filter((f) => f && f.key && Array.isArray(f.values))
    : ([] as ActiveFilter[]),
  match: value.match === "any" ? "any" : "all",
});

const read = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode — filters simply won't be remembered */
  }
};

export function loadMyFilters(pageKey: string): SavedFilter[] {
  const rows = read<SavedFilter[]>(MY_PREFIX + pageKey, []);
  return Array.isArray(rows)
    ? rows
        .filter((row) => row && row.id && row.name && row.value)
        .map((row) => ({ ...row, pageKey, value: cleanValue(row.value) }))
    : [];
}

export function saveMyFilters(pageKey: string, rows: SavedFilter[]): void {
  write(MY_PREFIX + pageKey, rows.map((row) => ({ ...row, pageKey, value: cleanValue(row.value) })));
}

export function makeSavedFilter(
  pageKey: string,
  name: string,
  value: BarValue,
  extra: Pick<SavedFilter, "role" | "ownerName"> = {},
): SavedFilter {
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
    pageKey,
    value: cleanValue(value),
    ...extra,
  };
}

/** The filter that was last used on this page, so a saved filter survives a
 *  reload even if the page starts from its shipped defaults. */
export function loadLastFilter(pageKey: string): SavedFilter | null {
  const id = read<string>(LAST_PREFIX + pageKey, "");
  if (!id) return null;
  return loadMyFilters(pageKey).find((row) => row.id === id) ?? null;
}

export function setLastFilter(pageKey: string, id: string): void {
  write(LAST_PREFIX + pageKey, id);
}

/** Shared filters are all in one audited appSettings value. */
export function sharedFiltersFor(
  stored: unknown,
  pageKey: string,
  role: string,
): SavedFilter[] {
  if (!Array.isArray(stored)) return [];
  return (stored as SavedFilter[])
    .filter(
      (row) =>
        row &&
        row.id &&
        row.name &&
        row.pageKey === pageKey &&
        row.value &&
        (row.role === "all" || row.role === role),
    )
    .map((row) => ({ ...row, value: cleanValue(row.value) }));
}
