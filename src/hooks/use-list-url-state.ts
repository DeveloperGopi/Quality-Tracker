/**
 * useListUrlState — the Facility Master List view lives in the URL.
 *
 * ROOT CAUSE of "my filters are lost when I come back": every filter, the
 * search box, the sort and the page used to be `useState` inside the list page.
 * Opening a facility profile unmounted that page and the state went with it, so
 * Back rendered a brand-new, unfiltered list.
 *
 * The fix is not to "restore" the state after the fact but to stop owning it:
 * filters / search / sort / page / page size are query params (see
 * lib/listUrlState for the parsing rules). Then:
 *
 *   • Back and Forward restore the view for free — history holds the URLs,
 *   • "Back to list" is just a link to the saved URL,
 *   • a pasted link opens the same filtered list for a colleague,
 *   • a hard refresh on a filtered URL keeps the filter,
 *   • two tabs / an incognito window can hold two different views.
 *
 * Typing (`q`) and dragging (score range) REPLACE the current history entry so
 * the back button is not flooded with keystrokes; ticking a checkbox PUSHES so
 * the user can step back filter by filter.
 *
 * Everything the component reads is DERIVED from the URL or from storage —
 * there is no state to keep in sync, which is also why none of this needs an
 * effect that writes state.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import {
  hasViewParams,
  parseListFilters,
  serializeListFilters,
  type ListFilters,
} from "@/lib/listUrlState";
import {
  hasSeenList,
  loadLastListUrl,
  markListSeen,
  saveLastListUrl,
} from "@/lib/listSessionState";
import { defaultRowView, loadRowView, saveRowView } from "@/components/RowView";

/** Typing in the search box is written to the URL after this pause. */
export const SEARCH_DEBOUNCE_MS = 150;

/** Where the view on screen came from — drives the "Filters restored" notice. */
export type RestoredFrom = "url" | "session" | null;

export type ListUrlState = {
  /** The parsed view (URL is the source of truth). */
  filters: ListFilters;
  /** Immediate value for the search input (the URL lags by the debounce). */
  searchInput: string;
  /** Debounced search — replaces the history entry. */
  setSearch: (text: string) => void;
  /** Clear the search box (and any pending keystroke). */
  resetSearch: () => void;
  /** Merge a change into the view (PUSH, so Back undoes it). Any filter change
   *  also returns to page 1 unless the change IS the page. */
  patch: (next: Partial<ListFilters>, opts?: { replace?: boolean }) => void;
  /** Replace the whole view (Reset view / Undo). */
  setAll: (next: ListFilters, opts?: { replace?: boolean }) => void;
  /** "url" = the link carried the filters, "session" = restored from the last
   *  visit, null = a plain list. */
  restoredFrom: RestoredFrom;
  dismissRestored: () => void;
  /** Stable key for per-view storage (scroll, selected rows): the exact URL. */
  urlKey: string;
};

/** Does a saved list URL actually carry a view (filters / sort / page)? */
function savedUrlHasView(saved: string | null): boolean {
  if (!saved) return false;
  const search = saved.includes("?") ? saved.slice(saved.indexOf("?")) : "";
  return hasViewParams(search);
}

export function useListUrlState(): ListUrlState {
  const location = useLocation();
  const navigate = useNavigate();

  /** The row-size preference (localStorage) fills in a URL without `size`. */
  const sizeFallback = useMemo(() => loadRowView(), []);

  const filters = useMemo(
    () => parseListFilters(location.search, { sizeFallback }),
    [location.search, sizeFallback],
  );

  // Latest view, for the two callbacks that fire LATER (the debounced search
  // write and patch): a timer that captured an old object would resurrect
  // filters the user has since changed.
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const write = useCallback(
    (next: ListFilters, replace: boolean) => {
      saveRowView(next.size);
      const qs = serializeListFilters(next, { defaultSize: defaultRowView() });
      // `navigate({ search })` writes the string VERBATIM. Going through
      // URLSearchParams (useSearchParams/setSearchParams) would re-encode the
      // "," and ":" that carry the filter lists and the sorts, turning a
      // readable, pasteable link into block=Alangayam%2CMittur.
      navigate({ search: qs ? `?${qs}` : "" }, { replace });
    },
    [navigate],
  );

  const patch = useCallback(
    (next: Partial<ListFilters>, opts: { replace?: boolean } = {}) => {
      const merged: ListFilters = { ...filtersRef.current, ...next };
      // Changing what the list SHOWS returns to the first page; changing the
      // page itself obviously does not.
      if (!("page" in next)) merged.page = 1;
      write(merged, opts.replace ?? false);
    },
    [write],
  );

  const setAll = useCallback(
    (next: ListFilters, opts: { replace?: boolean } = {}) => write(next, opts.replace ?? false),
    [write],
  );

  /* ------------------------------------------------------------------ search */

  const [searchInput, setSearchInput] = useState(() => filters.q);
  /** The URL text the box was last synced with (see the adjustment below). */
  const [mirroredQ, setMirroredQ] = useState(filters.q);
  const debounce = useRef<number | null>(null);

  // The URL wins: when it changes underneath us (Back/Forward, a chip, Reset
  // view) the box follows it. Adjusting state during render is React's own
  // recipe for "state derived from props" — it re-renders before paint instead
  // of flickering through an effect.
  if (mirroredQ !== filters.q) {
    setMirroredQ(filters.q);
    setSearchInput(filters.q);
  }

  // A pending keystroke write must not resurrect text the URL has moved on
  // from. Effect cleanups run before any pending timer, so cancelling here is
  // enough — and it also covers unmounting mid-typing.
  useEffect(
    () => () => {
      if (debounce.current != null) {
        window.clearTimeout(debounce.current);
        debounce.current = null;
      }
    },
    [filters.q],
  );

  const setSearch = useCallback(
    (text: string) => {
      setSearchInput(text);
      if (debounce.current != null) window.clearTimeout(debounce.current);
      debounce.current = window.setTimeout(() => {
        debounce.current = null;
        write({ ...filtersRef.current, q: text.trim(), page: 1 }, true);
      }, SEARCH_DEBOUNCE_MS);
    },
    [write],
  );

  const resetSearch = useCallback(() => {
    if (debounce.current != null) {
      window.clearTimeout(debounce.current);
      debounce.current = null;
    }
    setSearchInput("");
    patch({ q: "" }, { replace: true });
  }, [patch]);

  /* ------------------------------------------- restore + remember the URL */

  // Both of these are read ONCE, on the first render, before any effect can
  // overwrite them: they describe how the user ARRIVED at this list.
  const [savedUrlAtMount] = useState<string | null>(() => loadLastListUrl());
  const [hadViewAtMount] = useState(() => hasViewParams(location.search));
  const [seenAtMount] = useState(() => hasSeenList());
  const [noticeDismissed, setNoticeDismissed] = useState(false);

  /** The bare list was opened and the previous visit was filtered. */
  const sessionRestore = !hadViewAtMount && savedUrlHasView(savedUrlAtMount);

  useEffect(() => {
    markListSeen();
  }, []);

  useEffect(() => {
    if (hadViewAtMount || !sessionRestore || !savedUrlAtMount) return;
    // A bare /facilities visit (nav link, bookmark, reopening the app) returns
    // to the view the user left instead of showing a different list.
    navigate(savedUrlAtMount, { replace: true });
  }, [navigate, hadViewAtMount, sessionRestore, savedUrlAtMount]);

  // Remember the CANONICAL form of the current view for the profile's "Back to
  // list" button: unknown or invalid params typed into the address bar are
  // dropped, so the saved link is exactly the list the user is looking at.
  useEffect(() => {
    const qs = serializeListFilters(filters, { defaultSize: defaultRowView() });
    saveLastListUrl(qs ? `${location.pathname}?${qs}` : location.pathname);
  }, [location.pathname, filters]);

  /** Only explain a filter the user did not just set: a filtered URL in a
   *  FRESH tab (a shared link) or a view restored from their last visit.
   *  Coming back with Back needs no notice — they were just there. */
  const restoredFrom: RestoredFrom = noticeDismissed
    ? null
    : sessionRestore
      ? "session"
      : hadViewAtMount && !seenAtMount
        ? "url"
        : null;

  const dismissRestored = useCallback(() => setNoticeDismissed(true), []);

  return {
    filters,
    searchInput,
    setSearch,
    resetSearch,
    patch,
    setAll,
    restoredFrom,
    dismissRestored,
    urlKey: `${location.pathname}${location.search}`,
  };
}
