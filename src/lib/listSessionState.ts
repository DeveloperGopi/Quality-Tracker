/**
 * FACILITY MASTER LIST — per-tab (sessionStorage) and in-memory state.
 *
 * The URL carries the *view* (filters, search, sort, page — see
 * lib/listUrlState). This module carries everything that must survive leaving
 * and returning to the list but has no business being in a shareable link:
 *
 *   • the last list URL        → the profile's "Back to list" button target,
 *   • the scroll position      → keyed by that URL,
 *   • the selected rows        → keyed by that URL,
 *   • the last rows snapshot   → in memory only, so returning from a profile
 *                                paints the rows immediately (Convex then
 *                                refreshes them in the background).
 *
 * Everything is versioned (`nqas.masterlist.v1`) and wrapped in try/catch: a
 * browser with storage disabled or a corrupt value must never break the page.
 */

import type { MasterRow } from "@/lib/masterColumns";

/** One version prefix for every master-list key. */
export const LIST_STORAGE_PREFIX = "nqas.masterlist.v1.";

const LAST_URL_KEY = `${LIST_STORAGE_PREFIX}lastUrl`;
const SCROLL_KEY = (urlKey: string) => `${LIST_STORAGE_PREFIX}scroll:${urlKey}`;
const SELECTION_KEY = (urlKey: string) => `${LIST_STORAGE_PREFIX}selection:${urlKey}`;

function readSession(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch {
    /* private mode / quota — the view simply won't survive this tab */
  }
}

/* --------------------------------------------------------------------------- */
/* Last list URL — what the profile's "Back to list" returns to                 */
/* --------------------------------------------------------------------------- */

export function saveLastListUrl(url: string) {
  writeSession(LAST_URL_KEY, url);
}

export function loadLastListUrl(): string | null {
  return readSession(LAST_URL_KEY);
}

/* --------------------------------------------------------------------------- */
/* Has this tab already shown the list?                                        */
/* --------------------------------------------------------------------------- */

const SEEN_KEY = `${LIST_STORAGE_PREFIX}seen`;

/** True once the list has been shown in this tab. Used to decide whether a
 *  filtered URL needs explaining: a shared link in a fresh tab does, pressing
 *  Back into a list you were just looking at does not. */
export function hasSeenList(): boolean {
  return readSession(SEEN_KEY) === "1";
}

export function markListSeen() {
  writeSession(SEEN_KEY, "1");
}

/* --------------------------------------------------------------------------- */
/* Scroll position                                                             */
/* --------------------------------------------------------------------------- */

export type ScrollPos = {
  /** Table scrollport: vertical offset. */
  top: number;
  /** Table scrollport: horizontal offset (the 54-column grid). */
  left: number;
  /** The page itself, for lists that scroll the window. */
  windowTop?: number;
};

export function saveListScroll(urlKey: string, pos: ScrollPos) {
  writeSession(SCROLL_KEY(urlKey), JSON.stringify(pos));
}

export function loadListScroll(urlKey: string): ScrollPos | null {
  const raw = readSession(SCROLL_KEY(urlKey));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ScrollPos>;
    const top = Number(parsed.top);
    const left = Number(parsed.left);
    if (!Number.isFinite(top) || !Number.isFinite(left)) return null;
    const windowTop = Number(parsed.windowTop);
    return {
      top: Math.max(0, top),
      left: Math.max(0, left),
      windowTop: Number.isFinite(windowTop) ? Math.max(0, windowTop) : 0,
    };
  } catch {
    return null;
  }
}

/* --------------------------------------------------------------------------- */
/* Selected rows (checkboxes)                                                  */
/* --------------------------------------------------------------------------- */

export function saveListSelection(urlKey: string, ids: Iterable<string>) {
  const list = [...ids].slice(0, 2000);
  writeSession(SELECTION_KEY(urlKey), JSON.stringify(list));
}

export function loadListSelection(urlKey: string): string[] {
  const raw = readSession(SELECTION_KEY(urlKey));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string").slice(0, 2000);
  } catch {
    return [];
  }
}

/* --------------------------------------------------------------------------- */
/* Rows snapshot — "no refetch flash" when returning to the list                */
/* --------------------------------------------------------------------------- */

/** Kept in module memory (not storage): it only has to survive a client-side
 *  navigation, which is exactly the Back-from-profile case. Convex owns the
 *  real cache and re-emits fresh rows as soon as the subscription is back. */
let rowsSnapshot: { rows: MasterRow[]; at: number } | null = null;

/** How long the snapshot may stand in for live data (~60s, like a
 *  `staleTime`) — after that a skeleton is honest again. */
export const ROWS_SNAPSHOT_TTL_MS = 60_000;

export function saveRowsSnapshot(rows: MasterRow[]) {
  rowsSnapshot = { rows, at: Date.now() };
}

export function loadRowsSnapshot(ttlMs = ROWS_SNAPSHOT_TTL_MS): MasterRow[] | null {
  if (!rowsSnapshot) return null;
  if (Date.now() - rowsSnapshot.at > ttlMs) return null;
  return rowsSnapshot.rows;
}

/** Test hook — clears the module-level snapshot. */
export function clearRowsSnapshot() {
  rowsSnapshot = null;
}
