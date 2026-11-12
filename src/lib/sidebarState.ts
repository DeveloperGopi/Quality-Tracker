/** Collapsible sidebar state (Task B / modern rail rebuild).
 *
 *  Three modes driven by viewport width, overridable on desktop:
 *  • ≥1280px  → expanded (260px)   [default]
 *  • 768–1279 → rail (72px)        [default]
 *  • <768px   → collapsed (0px) — opened as an off-canvas drawer
 *
 *  The mode is mirrored in localStorage (with an inline pre-paint script in
 *  index.html so there is no flash or layout shift) and saved per user in
 *  the shared per-user view store (ops.getMasterView/setMasterView,
 *  scope "sidebar"), so it follows the account across devices. The optional
 *  hover-peek lives in the same row (default OFF). */

export type SidebarMode = "expanded" | "rail" | "drawer";

export const SIDEBAR_STORAGE_KEY = "nqas.sidebar";
/** Legacy hover-peek key (no longer rendered; kept for older browsers). */
export const SIDEBAR_PEEK_KEY = "nqas.sidebar.peek";
/** First-visit "click the logo" hint dismissed — per device, mirrored per user. */
export const SIDEBAR_HINT_KEY = "nqas.sidebar.hint";
/** scope for the shared per-user Convex view row. */
export const SIDEBAR_VIEW_SCOPE = "sidebar";

export interface SidebarViewPayload {
  state: SidebarMode;
  /** Legacy hover-peek flag — kept so an older stored row still parses. */
  peek?: boolean;
  /** The first-visit "click the logo" hint was dismissed (per user). */
  hint?: boolean;
}

export function isSidebarMode(v: unknown): v is SidebarMode {
  return v === "expanded" || v === "rail" || v === "drawer";
}

/** Width default: ≥1280 expanded, 768–1279 rail, <768 drawer (off-canvas). */
export function defaultSidebarMode(width: number): SidebarMode {
  if (width < 768) return "drawer";
  if (width < 1280) return "rail";
  return "expanded";
}

export function readStoredSidebarMode(): SidebarMode | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    // "collapsed" is the pre-drawer name for the same <768px state.
    if (v === "collapsed") return "drawer";
    return isSidebarMode(v) ? v : null;
  } catch {
    return null;
  }
}

/** Mirror into localStorage; callers set data-sidebar on <html> themselves. */
export function storeSidebarMode(mode: SidebarMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, mode);
  } catch {
    /* private mode — the app still works, just without the mirror */
  }
}

/** Hover-peek mirror — null when the user never chose (setting default OFF). */
export function readStoredPeek(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(SIDEBAR_PEEK_KEY);
    return v === "1" ? true : v === "0" ? false : null;
  } catch {
    return null;
  }
}

export function storePeek(peek: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SIDEBAR_PEEK_KEY, peek ? "1" : "0");
  } catch {
    /* private mode — ignore */
  }
}

export function readStoredHint(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(SIDEBAR_HINT_KEY);
    return v === "1" ? true : v === "0" ? false : null;
  } catch {
    return null;
  }
}

export function storeHint(dismissed: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SIDEBAR_HINT_KEY, dismissed ? "1" : "0");
  } catch {
    /* private mode — the hint simply appears again */
  }
}

export function applySidebarMode(mode: SidebarMode): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-sidebar", mode);
}

/** The mode currently applied to <html> — the ONE presentation truth.
 *  The toggle reads this instead of a render closure, so a second Ctrl/Cmd+B
 *  (or a second logo click before React has re-rendered) can never compute
 *  the same target twice and leave the sidebar stuck in the rail. */
export function readAppliedSidebarMode(): SidebarMode | null {
  if (typeof document === "undefined") return null;
  const v = document.documentElement.getAttribute("data-sidebar");
  return isSidebarMode(v) ? v : null;
}
