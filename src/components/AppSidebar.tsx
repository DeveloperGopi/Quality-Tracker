/**
 * APP SIDEBAR — ONE nav tree, two presentations (plus the <768px drawer).
 *
 * Root cause this file removes (see the task's screenshots): the rail used to
 * be a SECOND tree — the hover-peek overlay mounted a full copy of the header,
 * groups, links and footer inside the same card (`index.css` sized it with
 * `--sb-w`, i.e. 76px), so faded duplicate icons, clipped group words
 * ("MAIN", "GO", "FLY") and stray badge dots sat behind the real rail. The
 * drawer was yet another tree with its own <nav>. There is now exactly one
 * `<nav aria-label="Main">` and one link per config item in every state;
 * `data-sidebar` on <html> + CSS decide the presentation:
 *
 *   expanded 264px : logo | title/subtitle · search field · labelled nav · footer
 *   rail      72px : logo (centred) · search tile · icon tiles + dividers · stacked footer
 *   drawer  <768px : the same card, off-canvas, labels visible, focus-trapped
 *
 * The logo emblem IS the expand/collapse control (no round toggle button).
 * The rail hides text with display:none (never opacity, never a squeezed
 * block); the only animation is the grid width, with the content clipped to
 * one line while it runs.
 */

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import {
  Bell,
  ChevronUp,
  CircleHelp,
  LogOut,
  Search,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";

import { NqasLogo } from "@/components/NqasLogo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AttentionItem } from "@/lib/masterColumns";
import { toLongDisplayDate } from "@/lib/format";
import {
  activeNavTo,
  type SidebarGroupModel,
  type SidebarNavItemModel,
} from "@/lib/sidebarConfig";
import { closeTip } from "@/components/ui/Tip";
import { placeTooltip } from "@/lib/sidebarTooltip";

/** "⌘K" on a Mac, "Ctrl K" elsewhere; hidden entirely on touch devices. */
function shortcutChip(
  isMacLike: boolean = /Mac|iPhone|iPad/i.test(
    typeof navigator !== "undefined" ? navigator.platform : "",
  ),
): string {
  return isMacLike ? "⌘K" : "Ctrl K";
}

export type SidebarLinkAlert = {
  id: string;
  title: string;
  categoryName: string;
  dueLabel: string;
  nextDueLabel: string;
};

export type AppSidebarProps = {
  mode: "expanded" | "rail" | "drawer";
  /** <768px drawer is open (a modal panel; focus-trapped). */
  drawerOpen: boolean;
  /** <560px tall: the footer folds into one row. */
  compactChrome: boolean;
  activePath: string;
  /** The resolved nav model (sidebarConfig.buildSidebarNav). */
  groups: SidebarGroupModel[];
  /** Every facility that needs attention (buildMetrics → attentionList). */
  notifications: AttentionItem[];
  /** = notifications.length — the facility badge number (one source). */
  attentionCount: number;
  /** Overdue/due-soon Links Organiser items from links.reminders. */
  linkAlerts?: SidebarLinkAlert[];
  user: { name?: string | null; email?: string | null } | null;
  roleBadge: string;
  /** The first-visit "click the logo" hint was already dismissed. */
  hintDismissed: boolean;
  onDismissHint: () => void;
  /** Re-open the dismissible first-visit tour (Help → how to use this page). */
  onShowHint?: () => void;
  /** Logo click: rail ⇄ expanded on desktop, close the drawer on phones. */
  onToggle: () => void;
  onCloseDrawer: () => void;
  onSignOut: () => void;
  /** Opens the one command palette (field, rail icon, Ctrl/Cmd+K). */
  onOpenSearch: () => void;
  /** Prefetch a route's chunk on hover / focus. */
  prefetch?: (to: string) => void;
};

function initialsOf(name?: string | null, email?: string | null) {
  return (name ?? email ?? "U")
    .split(/\s+/)
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Where a needs-attention reason is best fixed (quick view section). */
function attentionSection(item: AttentionItem): string {
  // Part C ③ — a missing required document has its own Fix target: open the
  // Facility Quick View on its Documents section, where the uploader lives.
  if (item.section === "documents") return "documents";
  if (item.reason.includes("NOC")) return "building";
  if (item.reason.includes("certificate")) return "nqas";
  return "surveillance";
}

/* ------------------------------------------------------------------ */
/* Popovers — top layer, own size, never clipped by the card           */
/* ------------------------------------------------------------------ */

/**
 * ROOT CAUSE of the 60px-wide popover that overlapped the nav: it was a plain
 * `position: absolute` child of the 36px trigger wrapper, with
 * `width: 100%` of that wrapper in the expanded state, inside `.sb-inner`
 * (`overflow: hidden`) — so it inherited the anchor's width and got clipped.
 *
 * It now renders in the browser top layer as `popover="auto"` (light dismiss,
 * Esc) through a portal to <body>, positioned to the right of its trigger with
 * a JS measurement fallback (`placeTooltip`), flipped/clamped at the viewport
 * edge, and sized by itself (`clamp(280px, 24vw, 360px)`). Below 768px it
 * becomes a bottom sheet.
 */
function SidebarPopover({
  open,
  anchor,
  label,
  testId,
  sheet,
  onClose,
  children,
}: {
  open: boolean;
  anchor: HTMLElement | null;
  label: string;
  testId: string;
  sheet: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [placed, setPlaced] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !open) return;
    const pop = el as HTMLElement & { showPopover?: () => void; hidePopover?: () => void };
    try {
      pop.showPopover?.();
    } catch {
      /* already open */
    }
    const place = () => {
      if (sheet) {
        setPlaced(true);
        return;
      }
      const rect = anchor?.getBoundingClientRect?.();
      if (!rect) {
        setPlaced(true);
        return;
      }
      const viewport = {
        width: window.innerWidth || document.documentElement.clientWidth || 1024,
        height: window.innerHeight || document.documentElement.clientHeight || 768,
      };
      /* To the RIGHT of the trigger; flips to the left when there is no room
         (placeTooltip clamps vertically too). */
      const p = placeTooltip({
        anchor: { left: rect.left, right: rect.right, top: rect.top, height: rect.height },
        size: { width: el.offsetWidth || 320, height: el.offsetHeight || 240 },
        viewport,
        /* A tall panel lines up with its trigger's top, not its centre. */
        align: "start",
      });
      el.style.left = `${p.left}px`;
      el.style.top = `${p.top}px`;
      el.dataset.flipped = p.flipped ? "1" : "0";
      setPlaced(true);
    };
    place();
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("resize", place);
      try {
        pop.hidePopover?.();
      } catch {
        /* not open */
      }
    };
  }, [open, anchor, sheet]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !open) return;
    const onToggle = (event: Event) => {
      const next = (event as Event & { newState?: string }).newState;
      if (next === "closed") onClose();
    };
    el.addEventListener("toggle", onToggle);
    return () => el.removeEventListener("toggle", onToggle);
  }, [open, onClose]);

  if (!open) return null;
  const layer = (
    <>
      {sheet && (
        <button
          type="button"
          data-testid={`${testId}-backdrop`}
          aria-label="Close"
          className="sb-sheet-backdrop"
          onClick={onClose}
        />
      )}
      <div
        ref={ref}
        id={`${testId}-panel`}
        popover="auto"
        role="dialog"
        aria-label={label}
        data-testid={testId}
        data-sheet={sheet ? "true" : "false"}
        data-placed={placed ? "true" : "false"}
        className="sb-pop2"
      >
        {children}
      </div>
    </>
  );
  /* Portalled to <body>: the panel is in the top layer AND outside the
     sidebar's overflow box, so nothing can clip or resize it. */
  return typeof document === "undefined" ? layer : createPortal(layer, document.body);
}

/* ------------------------------------------------------------------ */
/* Nav                                                                 */
/* ------------------------------------------------------------------ */

/** The pill(s) at the trailing edge of an expanded nav row. */
function NavBadges({ item }: { item: SidebarNavItemModel }) {
  const badges: { key: string; cls: string; text: string }[] = [];
  if (item.isNew) badges.push({ key: "new", cls: "sb-badge-new", text: "New" });
  if (item.badge != null && item.badge > 0)
    badges.push({ key: "attention", cls: "sb-badge-amber", text: String(item.badge) });
  if (badges.length === 0) return null;
  return (
    <>
      {badges.map((b) => (
        <span key={b.key} className={cn("sb-pill", b.cls)} aria-label={b.text}>
          {b.text}
        </span>
      ))}
    </>
  );
}

/**
 * ONE nav row for both presentations. The rail hides the label and the pills
 * by CSS and turns the row into a centred 44px tile; the badge becomes the
 * corner dot. Nothing is rendered twice.
 */
function NavItem({
  item,
  active,
  rail,
  tabIndex,
  prefetch,
}: {
  item: SidebarNavItemModel;
  active: boolean;
  rail: boolean;
  tabIndex?: number;
  prefetch?: (to: string) => void;
}) {
  const Icon: LucideIcon = item.icon;
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const [truncated, setTruncated] = useState(false);
  const hasBadge = item.badge != null && item.badge > 0;

  const tipText = hasBadge
    ? `${item.label} · ${item.badge} ${item.badge === 1 ? "needs" : "need"} attention`
    : item.isNew
      ? `${item.label} · New`
      : item.label;

  /* Expanded: the tooltip is for labels that are actually cut. Measured on
     rAF + ResizeObserver, never on the scroll path. */
  useEffect(() => {
    const el = labelRef.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const next = el.scrollWidth > el.clientWidth + 1;
      setTruncated((prev) => (prev === next ? prev : next));
    };
    scheduleMeasure();
    function scheduleMeasure() {
      if (!raf) raf = window.requestAnimationFrame(measure);
    }
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver === "function") {
      ro = new ResizeObserver(scheduleMeasure);
      ro.observe(el);
    }
    window.addEventListener("resize", scheduleMeasure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [item.label]);

  return (
    <Link
      to={item.to}
      data-nav-item={item.to}
      data-rail-link={rail ? "" : undefined}
      aria-current={active ? "page" : undefined}
      aria-label={item.label}
      tabIndex={tabIndex}
      /* ONE tooltip system: no native `title`. In the rail every tile has a
         tooltip (label + count); expanded, only a label that is cut off. */
      data-tip={rail || truncated ? tipText : undefined}
      onPointerEnter={() => prefetch?.(item.to)}
      onFocus={() => prefetch?.(item.to)}
      className="sb-link focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className="sb-link-icon" aria-hidden="true">
        <Icon className="sb-link-glyph" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <span ref={labelRef} className="sb-link-label">
        {item.label}
      </span>
      <span className="sb-link-end">
        <NavBadges item={item} />
      </span>
      {hasBadge ? (
        <span className="sb-dot sb-dot-amber" aria-hidden="true" />
      ) : item.isNew ? (
        <span className="sb-dot sb-dot-blue" aria-hidden="true" />
      ) : null}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* AppSidebar                                                          */
/* ------------------------------------------------------------------ */

export const AppSidebar = memo(function AppSidebar({
  mode,
  drawerOpen,
  compactChrome,
  activePath,
  groups,
  notifications,
  attentionCount,
  linkAlerts = [],
  user,
  roleBadge,
  hintDismissed,
  onDismissHint,
  onShowHint,
  onToggle,
  onCloseDrawer,
  onSignOut,
  onOpenSearch,
  prefetch,
}: AppSidebarProps) {
  const drawer = mode === "drawer";
  const rail = mode === "rail";
  const expanded = mode === "expanded" || drawer;
  const displayName = user?.name ?? user?.email ?? "User";
  const email = user?.email ?? "";
  const initials = initialsOf(user?.name, user?.email);
  const totalNotifications = attentionCount + linkAlerts.length;
  const hasNotifications = totalNotifications > 0;
  /** The nav item this path belongs to — ONE rule (longest path prefix), so
   *  exactly one item can ever carry the active style. */
  const activeTo = activeNavTo(groups, activePath);

  const asideRef = useRef<HTMLElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const [fades, setFades] = useState({ top: false, bottom: false });
  const [scrolling, setScrolling] = useState(false);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* -------- nav scroll: fade cues (rAF-throttled) ---------------------- */
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const top = el.scrollTop > 4;
      const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 4;
      setFades((prev) => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }));
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(measure);
      setScrolling((prev) => (prev ? prev : true));
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
      scrollTimer.current = setTimeout(() => setScrolling(false), 600);
    };
    measure();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      if (raf) window.cancelAnimationFrame(raf);
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
  }, [mode]);

  /* Re-measure after the width transition settles. */
  useEffect(() => {
    const t = setTimeout(() => {
      const el = navRef.current;
      if (!el) return;
      const top = el.scrollTop > 4;
      const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 4;
      setFades((prev) => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }));
    }, 220);
    return () => clearTimeout(t);
  }, [mode]);

  /* On load and on navigation the active item is scrolled into view. */
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const active = nav.querySelector<HTMLElement>('[aria-current="page"]');
    if (typeof active?.scrollIntoView === "function") {
      active.scrollIntoView({ block: "nearest" });
    }
  }, [activePath, mode]);

  /* -------- footer popovers (bell / help / user) ------------------------ */
  type Menu = "bell" | "help" | "user" | null;
  const [menu, setMenu] = useState<Menu>(null);
  const bellRef = useRef<HTMLButtonElement | null>(null);
  const helpRef = useRef<HTMLButtonElement | null>(null);
  const userRef = useRef<HTMLButtonElement | null>(null);
  /** The trigger that opened the current popover — focus returns here. */
  const menuAnchor = useRef<HTMLElement | null>(null);
  /** Close without moving focus (outside click, backdrop, a link that is
   *  about to navigate — stealing focus back would fight the user). */
  const closeMenus = useCallback(() => {
    setMenu(null);
    menuAnchor.current = null;
  }, []);
  /** Esc / the popover's own close: close AND hand focus back to the trigger
   *  that opened the panel, so keyboard users never lose their place. */
  const closeMenusToTrigger = useCallback(() => {
    setMenu(null);
    menuAnchor.current?.focus?.({ preventScroll: true });
    menuAnchor.current = null;
  }, []);
  const openMenu = useCallback(
    (next: Exclude<Menu, null>,
     el: HTMLElement | null) => {
      closeTip();
      setMenu((current) => {
        if (current === next) return null;
        menuAnchor.current = el;
        return next;
      });
    },
    [],
  );

  /* Esc / outside click / one-floating-thing-at-a-time. The Popover API
     (`popover="auto"`) already does this in the browser; this listener is the
     fallback for engines without it (and for the drawer). */
  useEffect(() => {
    if (!menu) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenusToTrigger();
      }
    };
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      const panel = document.querySelector(`.sb-pop2`);
      if (panel?.contains(target)) return;
      if (menuAnchor.current?.contains(target)) return;
      closeMenus();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [menu, closeMenus, closeMenusToTrigger]);

  /* -------- drawer: focus, trap, Esc, focus return ---------------------- */
  const closeRef = useRef(onCloseDrawer);
  useEffect(() => {
    closeRef.current = onCloseDrawer;
  }, [onCloseDrawer]);
  useEffect(() => {
    if (!drawer || !drawerOpen) return;
    const aside = asideRef.current;
    const first = aside?.querySelector<HTMLElement>(
      "[data-testid='sb-logo'], a[data-nav-item], button",
    );
    first?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !aside) return;
      const focusable = Array.from(
        aside.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.getClientRects().length > 0);
      if (focusable.length === 0) return;
      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      } else if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer, drawerOpen]);

  /* -------- roving tab order inside the rail ---------------------------- */
  const onNavKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      closeTip();
      return;
    }
    if (!rail) return;
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const links = Array.from(navRef.current?.querySelectorAll<HTMLElement>("a[data-rail-link]") ?? []);
    if (!links.length) return;
    event.preventDefault();
    const current = links.indexOf(document.activeElement as HTMLElement);
    let next = current < 0 ? 0 : current;
    if (event.key === "ArrowDown") next = Math.min(links.length - 1, next + 1);
    if (event.key === "ArrowUp") next = Math.max(0, next - 1);
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = links.length - 1;
    links[next]?.focus();
    closeTip();
  };
  const activeIdx = (() => {
    const flat = groups.flatMap((g) => g.items);
    const idx = flat.findIndex((item) => item.to === activeTo);
    return idx < 0 ? 0 : idx;
  })();
  let flatIdx = 0;

  /* -------- logo = the one expand / collapse control -------------------- */
  const logoLabel = drawer
    ? "Close navigation menu"
    : expanded
      ? "Collapse sidebar · Ctrl+B"
      : "Expand sidebar · Ctrl+B";
  const logo = (
    <button
      type="button"
      data-testid="sb-logo"
      className="sb-logo focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      onClick={onToggle}
      aria-expanded={drawer ? drawerOpen : expanded}
      aria-controls="app-sidebar"
      aria-keyshortcuts="Control+B Meta+B"
      aria-label={logoLabel}
      /* ONE tooltip: the shared layer reads data-tip. No native `title` — it
         used to draw a second black rectangle over the dark pill. */
      data-tip={logoLabel}
    >
      {/* PART 1: the emblem is the whole control. The old panel glyph drew a
          card over the badge on hover/focus and hid the logo — it is gone in
          every state, so there is no second icon behind the image. */}
      <NqasLogo className="sb-emblem" />
    </button>
  );

  const searchButton = (
    <Button
      variant="ghost"
      data-testid="sb-search"
      onClick={() => {
        closeTip();
        closeMenus();
        onOpenSearch();
      }}
      aria-label={`Search pages or facilities (${shortcutChip()})`}
      aria-keyshortcuts="Control+K Meta+K"
      data-tip={rail ? `Search pages or facilities (${shortcutChip()})` : undefined}
      className="sb-search focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Search className="size-4 shrink-0" aria-hidden="true" />
      <span className="sb-search-hint">Search pages or facilities</span>
      <kbd className="sb-kbd" aria-hidden="true">
        {shortcutChip()}
      </kbd>
    </Button>
  );

  /* The bell's panel: the SAME facilities the badge counts (attentionList),
     each linking to the list filtered by that KPI. Rendered in the TOP LAYER
     by SidebarPopover — never inside the card's clipped box. */
  const bellPopover = (
    <SidebarPopover
      open={menu === "bell"}
      anchor={bellRef.current}
      label="Notifications"
      testId="sb-notifications"
      sheet={drawer}
      onClose={closeMenus}
    >
        <div className="sb-pop-head">
          <p className="sb-pop-title">Notifications</p>
          {totalNotifications > 0 && (
            <span className="sb-pop-count" data-testid="sb-notifications-count">
              {totalNotifications}
            </span>
          )}
        </div>
        {notifications.length === 0 && linkAlerts.length === 0 ? (
          <p className="sb-pop-sub" data-testid="sb-notifications-empty">
            No items need attention
          </p>
        ) : notifications.length > 0 ? (
          <ul className="sb-attention">
            {notifications.slice(0, 5).map((item, i) => (
              <li key={`${item.facilityId}-${i}`}>
                <Link
                  to={`/facilities?facility=${item.facilityId}&section=${attentionSection(item)}`}
                  className="sb-attention-row"
                  onClick={closeMenus}
                >
                  <span className="sb-attention-main">{item.facility}</span>
                  {item.section === "documents" && (
                    <span className="sb-attention-fix" data-testid="sb-attention-fix">
                      Fix
                    </span>
                  )}
                  <span className="sb-attention-why">
                    {/* reason chip + the deadline it is about */}
                    <span className="sb-attention-chip" data-tone={item.tone}>
                      {item.reason}
                    </span>
                    <span className="sb-attention-when">
                      {item.due
                        ? `${toLongDisplayDate(item.due)} · ${
                            item.days < 0
                              ? `${-item.days}d overdue`
                              : item.days === 0
                                ? "due today"
                                : `due in ${item.days}d`
                          }`
                        : item.days < 0
                          ? `${-item.days}d overdue`
                          : "no date recorded"}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {linkAlerts.length > 0 && (
          <>
            <p className="sb-pop-section">Links due</p>
            <ul className="sb-attention">
              {linkAlerts.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <Link to={`/links?item=${item.id}`} className="sb-attention-row" onClick={closeMenus}>
                    <span className="sb-attention-main">{item.title}</span>
                    <span className="sb-attention-why">
                      <span className="sb-attention-chip" data-tone="red">{item.dueLabel}</span>
                      <span className="sb-attention-when">{item.categoryName} · {item.nextDueLabel}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
        {notifications.length > 0 && (
          <Link to="/facilities?kpi=attention" className="sb-pop-link" onClick={closeMenus}>
            {attentionCount > 0 ? `View all in Master List (${attentionCount}) →` : "Open the Master List →"}
          </Link>
        )}
        {linkAlerts.length > 0 && (
          <Link to="/links?due=alerts" className="sb-pop-link" onClick={closeMenus}>
            View all links due ({linkAlerts.length}) →
          </Link>
        )}
    </SidebarPopover>
  );

  /* Help: legend, shortcuts, the how-to tour and the support line. */
  const helpPopover = (
    <SidebarPopover
      open={menu === "help"}
      anchor={helpRef.current}
      label="Help"
      testId="sb-help"
      sheet={drawer}
      onClose={closeMenus}
    >
      <div className="sb-pop-head">
        <p className="sb-pop-title">Help</p>
      </div>
      <Link to="/facilities?legend=1" className="sb-help-link" onClick={closeMenus}>
        Legend: what do the colours mean?
      </Link>
      <p className="sb-pop-section">Keyboard shortcuts</p>
      <ul className="sb-attention">
        <li className="sb-help-link">
          Command palette <kbd className="sb-help-kbd">Ctrl K</kbd>
        </li>
        <li className="sb-help-link">
          Collapse / expand sidebar <kbd className="sb-help-kbd">Ctrl B</kbd>
        </li>
        <li className="sb-help-link">
          Search this page <kbd className="sb-help-kbd">/</kbd>
        </li>
        <li className="sb-help-link">
          Focus mode <kbd className="sb-help-kbd">F</kbd>
        </li>
      </ul>
      <p className="sb-pop-section">How to use this page</p>
      <ul className="sb-help-list">
        <li>Click any row to open the facility quick view.</li>
        <li>Toggle Edit in the quick view to save field updates.</li>
        <li>Dates are DD-MMM-YYYY; a blank never counts as 0.</li>
      </ul>
      {onShowHint && (
        <button
          type="button"
          className="sb-help-link sb-help-action"
          data-testid="sb-help-tour"
          onClick={() => {
            closeMenus();
            onShowHint();
          }}
        >
          Show the getting-started tips again
        </button>
      )}
      <p className="sb-help-note">
        Questions or a correction? Contact your State NQAS cell administrator.
      </p>
    </SidebarPopover>
  );

  /* Part I — the user row IS the profile link. No popover over the nav:
     clicking the avatar or the name goes straight to /profile, and Sign out
     stays a visible button in the footer (rail included). */
  const userMenuLabel = `My profile — ${displayName}, ${roleBadge}`;

  const footer = (
    <div className="sb-foot" data-testid="sb-foot">
      <div className="sb-foot-tools">
        <button
          ref={bellRef}
          type="button"
          data-testid="sb-bell"
          className="sb-foot-btn"
          onClick={() => openMenu("bell", bellRef.current)}
          aria-expanded={menu === "bell"}
          aria-haspopup="dialog"
          aria-controls="sb-notifications-panel"
          aria-label={
            !hasNotifications
              ? "Notifications"
              : linkAlerts.length === 0
                ? `Needs attention — ${attentionCount} facilities`
                : `Notifications — ${totalNotifications} item${totalNotifications === 1 ? "" : "s"}`
          }
          data-tip={
            menu === "bell"
              ? undefined
              : hasNotifications
                ? `${totalNotifications} items need attention`
                : "Notifications"
          }
        >
          <Bell className="size-4" aria-hidden="true" />
          {hasNotifications && <span className="sb-dot sb-dot-amber" aria-hidden="true" />}
        </button>
        <button
          ref={helpRef}
          type="button"
          className="sb-foot-btn sb-foot-help"
          onClick={() => openMenu("help", helpRef.current)}
          aria-expanded={menu === "help"}
          aria-haspopup="dialog"
          aria-controls="sb-help-panel"
          aria-label="Help"
          data-tip={menu === "help" ? undefined : "Help and legend"}
        >
          <CircleHelp className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onSignOut}
          aria-label="Sign out"
          data-testid="sb-signout"
          className="sb-foot-btn sb-signout"
          data-tip={rail ? "Sign out" : undefined}
        >
          <LogOut className="size-4 shrink-0" aria-hidden="true" />
          <span className="sb-foot-label">Sign out</span>
        </button>
      </div>

      <Link
        ref={userRef as never}
        to="/profile"
        data-testid="sb-profile-link"
        aria-label={userMenuLabel}
        data-tip={rail ? "My profile" : undefined}
        className="sb-foot-user"
      >
        <span className="sb-avatar-btn" aria-hidden="true">
          <span className="sb-avatar">{initials}</span>
        </span>
        <span className="sb-user-text sb-text">
          <span className="sb-user-name">{displayName}</span>
          <span className="sb-user-role">
            <span className="sb-role-tag">{roleBadge}</span>
          </span>
        </span>
      </Link>
    </div>
  );

  return (
    <>
      {drawer && drawerOpen && (
        <button
          type="button"
          data-testid="sb-drawer-backdrop"
          aria-label="Close navigation menu"
          className="sb-drawer-backdrop"
          onClick={onCloseDrawer}
        />
      )}
      <aside
        ref={asideRef}
        id="app-sidebar"
        data-mode={mode}
        data-compact={compactChrome ? "true" : "false"}
        data-open={drawer ? (drawerOpen ? "true" : "false") : undefined}
        data-print="hide"
        className="app-aside"
        role={drawer && drawerOpen ? "dialog" : undefined}
        aria-modal={drawer && drawerOpen ? true : undefined}
        aria-label={drawer ? "Main navigation" : undefined}
      >
        <div className="sb-inner">
          <header className="sb-head">
            {logo}
            <div className="sb-title sb-text">
              <span className="sb-title-main">NQAS Tracker</span>
              <span className="sb-title-sub">District Health Facility Quality Monitoring System</span>
            </div>
          </header>

          {!hintDismissed && !drawer && (
            <div className="sb-hint" data-testid="sb-hint" role="note">
              <span className="sb-hint-text">Click the logo to collapse or expand</span>
              <button
                type="button"
                className="sb-hint-close"
                aria-label="Dismiss the sidebar hint"
                onClick={onDismissHint}
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </div>
          )}

          <div className="sb-search-zone">{searchButton}</div>

          <div className="sb-navwrap">
            {/* ONE nav, ONE list of items — presentation is CSS only. */}
            <nav
              ref={navRef}
              aria-label="Main"
              data-rail={rail ? "true" : "false"}
              data-scrolling={scrolling ? "true" : "false"}
              className="sb-nav"
              onKeyDown={onNavKeyDown}
            >
              {groups.map((group) => (
                <section key={group.id} className="sb-section" aria-label={group.label}>
                  <p className="sb-group" aria-hidden="true">
                    {group.label}
                  </p>
                  <span className="sb-divider" aria-hidden="true" />
                  {group.items.map((item) => {
                    const index = flatIdx++;
                    return (
                      <NavItem
                        key={item.to}
                        item={item}
                        active={item.to === activeTo}
                        rail={rail}
                        tabIndex={rail ? (index === activeIdx ? 0 : -1) : undefined}
                        prefetch={prefetch}
                      />
                    );
                  })}
                </section>
              ))}
            </nav>
            <div
              aria-hidden="true"
              data-edge="top"
              className={cn(
                "sb-fade pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-white/90 to-transparent",
                fades.top ? "opacity-100" : "opacity-0",
              )}
            />
            <div
              aria-hidden="true"
              data-edge="bottom"
              className={cn(
                "sb-fade pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-white/90 to-transparent",
                fades.bottom ? "opacity-100" : "opacity-0",
              )}
            />
          </div>

          {footer}
        </div>
      </aside>
      {/* The notifications / help / account panels live in the top layer
          (one instance each, portalled to <body>). */}
      {bellPopover}
      {helpPopover}

    </>
  );
});
