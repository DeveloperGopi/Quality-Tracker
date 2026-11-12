/**
 * useScrollRestore — put the user back exactly where they were.
 *
 * Back from a facility profile must land on the same row of the same filtered
 * list, not at the top of a fresh page. Two scroll positions matter here:
 *
 *   • the WINDOW (the page scrolls),
 *   • the table's own scrollport (vertical — long virtualized lists — and
 *     horizontal — the 54-column master grid).
 *
 * Both are saved in sessionStorage keyed by the list URL, so a different filter
 * set gets its own remembered position.
 *
 * Restoring waits for `ready` (the rows have rendered). The virtualizer needs a
 * frame — and for a long list a few more — before the content is tall enough to
 * scroll to the saved offset, so the restore is retried twice, and it yields
 * immediately if the user has started scrolling on their own.
 */

import { useEffect, useRef, type RefObject } from "react";

import { loadListScroll, saveListScroll } from "@/lib/listSessionState";

export function useScrollRestore(
  urlKey: string,
  ready: boolean,
  container?: RefObject<HTMLElement | null>,
) {
  const restoredKey = useRef<string | null>(null);
  const userScrolled = useRef(false);
  // Seeded from storage: the final save must not write zeros over a position
  // the user never touched in this visit (for example a position that was just
  // restored programmatically, which fires no scroll event of its own).
  const latest = useRef(
    (() => {
      const saved = loadListScroll(urlKey);
      return { top: saved?.top ?? 0, left: saved?.left ?? 0, windowTop: saved?.windowTop ?? 0 };
    })(),
  );

  /* --------------------------------------------------- remember the position */

  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const el = container?.current ?? null;
      latest.current = {
        top: el ? el.scrollTop : 0,
        left: el ? el.scrollLeft : 0,
        windowTop: window.scrollY ?? 0,
      };
      saveListScroll(urlKey, {
        top: latest.current.top,
        left: latest.current.left,
        windowTop: latest.current.windowTop,
      });
    };
    const onScroll = () => {
      userScrolled.current = true;
      if (raf) return;
      raf = window.requestAnimationFrame(read);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    const el = container?.current ?? null;
    el?.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      // Save the last OBSERVED position before the page unmounts (navigating
      // away is exactly when it matters). Reading the DOM here would be wrong:
      // React detaches refs before passive-effect cleanups run, so the element
      // is already gone and a fresh read would store 0.
      if (raf) window.cancelAnimationFrame(raf);
      saveListScroll(urlKey, {
        top: latest.current.top,
        left: latest.current.left,
        windowTop: latest.current.windowTop,
      });
      window.removeEventListener("scroll", onScroll);
      el?.removeEventListener("scroll", onScroll);
    };
  }, [urlKey, container]);

  /* ------------------------------------------------------- restore the view */

  useEffect(() => {
    if (!ready || restoredKey.current === urlKey) return;
    restoredKey.current = urlKey;
    userScrolled.current = false;
    const saved = loadListScroll(urlKey);
    if (!saved) return;

    const apply = () => {
      if (userScrolled.current) return;
      const el = container?.current ?? null;
      if (el) {
        el.scrollTop = saved.top;
        el.scrollLeft = saved.left;
      }
      if (saved.windowTop) window.scrollTo({ top: saved.windowTop, left: 0 });
      // Keep the remembered position in step with what was restored, so a
      // later save cannot record the pre-restore offset.
      latest.current = {
        top: saved.top,
        left: saved.left,
        windowTop: saved.windowTop ?? 0,
      };
    };

    const raf = window.requestAnimationFrame(apply);
    // The virtualizer measures in stages; retry so a long list still lands on
    // its saved offset instead of stopping at the first measurable height.
    const timers = [120, 400].map((ms) => window.setTimeout(apply, ms));
    return () => {
      window.cancelAnimationFrame(raf);
      for (const t of timers) window.clearTimeout(t);
    };
  }, [urlKey, ready, container]);
}
