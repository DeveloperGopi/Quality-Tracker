import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppSidebar } from "@/components/AppSidebar";
import { CycleScopeBanner, useCycleScope } from "@/components/CycleFilter";
import { PrintSheetDialog } from "@/components/master/PrintSheetDialog";
import { TipLayer } from "@/components/ui/Tip";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { ADMIN_NAV_KEY, buildSidebarNav, roleOf } from "@/lib/sidebarConfig";
import {
  applySidebarMode,
  defaultSidebarMode,
  isSidebarMode,
  readAppliedSidebarMode,
  readStoredHint,
  readStoredSidebarMode,
  SIDEBAR_VIEW_SCOPE,
  storeHint,
  storeSidebarMode,
  type SidebarMode,
  type SidebarViewPayload,
} from "@/lib/sidebarState";
import { attentionList } from "@/lib/masterColumns";
import { normalizeDocumentRules } from "@/lib/documentRules";
import { normalizePendingConfig } from "@/lib/pending";
import { Menu, ShieldCheck } from "lucide-react";
import { GuideHelpButton } from "@/components/guide/GuideHelpButton";
import { GuideSpotlight } from "@/components/guide/GuideSpotlight";
import { useLocation } from "react-router";
import { DEFAULT_SETTINGS } from "@/convex/lifecycle";
import { hydrateFacilityStyle } from "@/lib/facilityStyle";

const CommandPalette = lazy(() =>
  import("@/components/CommandPalette").then((module) => ({
    default: module.CommandPalette,
  })),
);

/** Route-chunk prefetch: navigation starts loading the page on hover/focus,
 *  so the click feels instant. Each module is fetched at most once. */
const PAGE_LOADERS: Record<string, (() => Promise<unknown>) | undefined> = {
  "/dashboard": () => import("@/pages/Dashboard"),
  "/system-map": () => import("@/pages/SystemMap"),
  "/facilities": () => import("@/pages/FacilityList"),
  "/reports": () => import("@/pages/Reports"),
  "/summary-report": () => import("@/pages/NqasSummaryReport"),
  "/custom-report": () => import("@/pages/CustomReport"),
  "/generate-ppt": () => import("@/pages/GeneratePpt"),
  "/bulk-import": () => import("@/pages/BulkImport"),
  "/block-compare": () => import("@/pages/BlockCompare"),
  "/links": () => import("@/pages/LinksOrganiser"),
  "/admin": () => import("@/pages/Admin"),
  "/guide": () => import("@/pages/Guide"),
};

export function AppShell({
  children,
  title,
  subtitle,
  titleIcon,
  actions,
  guideRoute,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Exact guide article for this page/tab (e.g. `/admin?tab=pages`). */
  guideRoute?: string;
  /** Optional page glyph — the category pages pass their `CATEGORY_ICONS`
   *  value, which IS the sidebar's nav icon for that route. */
  titleIcon?: LucideIcon;
  actions?: React.ReactNode;
}) {
  const TitleIcon = titleIcon;
  const { user, signOut } = useAuth();
  const location = useLocation();
  const isAdmin = user?.appRole === "admin";
  const role = roleOf(user?.appRole);
  const [drawerOpen, setDrawerOpen] = useState(false);
  /* The ONE command palette: field, rail icon, Ctrl/Cmd+K. */
  const [paletteOpen, setPaletteOpen] = useState(false);

  /* Session "last active" for My Profile → Security. One tiny mutation when
     the shell mounts, then at most every 10 minutes — never per navigation,
     so it adds no write traffic to the reactive queries on the page. */
  const touchSession = useMutation(api.profile.touchSession);
  const touchUserId = user?._id;
  useEffect(() => {
    if (!touchUserId) return;
    const touch = () => {
      void touchSession({
        userAgent: typeof navigator === "undefined" ? "" : navigator.userAgent,
      }).catch(() => {
        /* cosmetic only — a failed touch must never affect the shell */
      });
    };
    touch();
    const timer = window.setInterval(touch, 10 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [touchUserId, touchSession]);

  /* ---------------------------------------------------------------- */
  /* Collapsible sidebar state                                        */
  /* ---------------------------------------------------------------- */
  /* Viewport (width AND height): width drives the sidebar mode, height
     drives the compact-chrome fallback for very short screens. */
  const [viewport, setViewport] = useState(() =>
    typeof window !== "undefined"
      ? { w: window.innerWidth, h: window.innerHeight }
      : { w: 1280, h: 720 },
  );
  /* null = the user never chose on this device; the viewport then decides. */
  const [override, setOverride] = useState<SidebarMode | null>(() =>
    readStoredSidebarMode(),
  );
  /* Cross-device restore: the per-user row only fills the gap left by a
     missing localStorage mirror (derived, never copied into state — no
     cascading render, no flash). */
  const crossSidebar = useQuery(api.ops.getMasterView, {
    scope: SIDEBAR_VIEW_SCOPE,
  });
  const saveSidebarView = useMutation(api.ops.setMasterView);
  const cloudView = crossSidebar?.view as SidebarViewPayload | undefined;
  const cloudMode: SidebarMode | null = isSidebarMode(cloudView?.state)
    ? cloudView.state
    : null;
  /* First-visit logo hint: dismissed once, remembered per device + per user. */
  const cloudHint = typeof cloudView?.hint === "boolean" ? cloudView.hint : null;
  const [hintDismissed, setHintDismissed] = useState<boolean | null>(() =>
    readStoredHint(),
  );
  const showHint = !(hintDismissed ?? cloudHint ?? false);

  /* Resize / orientation: ONE rAF-throttled ResizeObserver on <html> (the
     window resize event is the fallback for engines without RO). The user's
     persisted override is never touched here — only the effective mode. */
  useEffect(() => {
    const read = () =>
      setViewport((prev) => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        return prev.w === w && prev.h === h ? prev : { w, h };
      });
    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        read();
      });
    };
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver === "function") {
      ro = new ResizeObserver(schedule);
      ro.observe(document.documentElement);
    }
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("orientationchange", schedule, { passive: true });
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  const isDesktop = viewport.w >= 768;
  /* Height below 560px (small laptops, 125%+ zoom): the footer compacts to
     one row so Sign out and the avatar stay reachable. */
  const compactChrome = viewport.h < 560;
  /* ≥1280px expanded, 768–1279px rail, <768px drawer — a persisted choice
     wins on desktop; the drawer state below 768 is never persisted. */
  const savedMode = override ?? cloudMode;
  const desktopMode: SidebarMode =
    savedMode === "expanded" || savedMode === "rail"
      ? savedMode
      : defaultSidebarMode(viewport.w);
  const mode: SidebarMode = isDesktop ? desktopMode : "drawer";

  const commitMode = useCallback(
    (next: SidebarMode) => {
      setOverride(next);
      applySidebarMode(next);
      storeSidebarMode(next);
      void saveSidebarView({
        scope: SIDEBAR_VIEW_SCOPE,
        view: { state: next, hint: !showHint } satisfies SidebarViewPayload,
      });
    },
    [saveSidebarView, showHint],
  );

  /* Help → "How to use this page": bring the dismissible first-visit hint
     back, so the tour is reachable forever and not only on the first day. */
  const showHintAgain = useCallback(() => {
    setHintDismissed(false);
    storeHint(false);
    void saveSidebarView({
      scope: SIDEBAR_VIEW_SCOPE,
      view: { state: mode, hint: false } satisfies SidebarViewPayload,
    });
  }, [mode, saveSidebarView]);

  const dismissHint = useCallback(() => {
    setHintDismissed(true);
    storeHint(true);
    void saveSidebarView({
      scope: SIDEBAR_VIEW_SCOPE,
      view: { state: mode, hint: true } satisfies SidebarViewPayload,
    });
  }, [mode, saveSidebarView]);

  const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /** Label fade choreography (CSS reads `html[data-sb-anim]`). The width
   *  animation is 180ms; labels fade over the first 90ms on collapse and in
   *  after the width has grown on expand. `transitionend` clears the phase
   *  (the timeout is the reduced-motion / no-transition fallback). */
  const [animPhase, setAnimPhase] = useState<"in" | "out" | null>(null);
  const setSidebarAnim = useCallback((phase: "in" | "out" | null) => {
    setAnimPhase(phase);
    const root = document.documentElement;
    if (phase) root.setAttribute("data-sb-anim", phase);
    else root.removeAttribute("data-sb-anim");
  }, []);

  const toggleSidebar = useCallback(() => {
    if (!isDesktop) {
      setDrawerOpen((open) => !open);
      return;
    }
    // Read what is actually applied (not this render's closure): two quick
    // presses must flip back, never collapse twice.
    const current = readAppliedSidebarMode() ?? mode;
    const next: SidebarMode = current === "expanded" ? "rail" : "expanded";
    if (prefersReducedMotion()) {
      setSidebarAnim(null);
      commitMode(next);
      return;
    }
    setSidebarAnim(next === "rail" ? "out" : "in");
    commitMode(next);
  }, [commitMode, isDesktop, mode, setSidebarAnim]);

  /* The phase attribute ends when the width transition ends (one place, the
     .app-shell grid column) — no timer can strand the labels at opacity 0.
     Re-armed for every phase, with a timeout as the reduced-motion / no-
     transition fallback. */
  useEffect(() => {
    if (!animPhase) return;
    const onEnd = (event: TransitionEvent) => {
      const el = event.target as HTMLElement | null;
      if (el?.classList?.contains("app-shell")) setSidebarAnim(null);
    };
    document.addEventListener("transitionend", onEnd);
    const fallback = window.setTimeout(() => setSidebarAnim(null), 400);
    return () => {
      document.removeEventListener("transitionend", onEnd);
      window.clearTimeout(fallback);
    };
  }, [animPhase, setSidebarAnim]);

  /* The drawer closes on navigation (derived during render, the app's
     existing pattern — no effect that cascades a render after paint). */
  const [drawerPath, setDrawerPath] = useState(location.pathname);
  if (drawerPath !== location.pathname) {
    setDrawerPath(location.pathname);
    if (drawerOpen) setDrawerOpen(false);
  }

  // Keep <html data-sidebar> in sync with the RENDERED state (the inline
  // script in index.html has already set it before first paint).
  useEffect(() => {
    applySidebarMode(mode);
  }, [mode]);

  // Ctrl/Cmd+B toggles the sidebar on desktop (unless the user is typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        const target = e.target as HTMLElement | null;
        const typing =
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable);
        if (typing) return;
        e.preventDefault();
        if (isDesktop) toggleSidebar();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDesktop, toggleSidebar]);

  // Ctrl/Cmd+K opens the palette (the sidebar field and its rail tile call
  // the same handler; the palette itself no longer owns this listener).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        const target = e.target as HTMLElement | null;
        const typing =
          target &&
          (target.tagName === "TEXTAREA" || target.isContentEditable);
        if (typing) return;
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Drawer open ⇒ the page behind it is inert (aside + content column);
  // Radix Sheet provides the backdrop, Esc and outside-click close, and
  // returns focus to the hamburger on close. Note: happy-dom keeps attribute
  // "inert" read-only so the tests observe the data-drawer marker instead.
  const mainRef = useRef<HTMLElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const hamburgerRef = useRef<HTMLButtonElement | null>(null);

  /* Sticky sub-bars (Admin tabs) pin below the real header height — the
     header wraps to two rows on phones, so a fixed offset would hide them. */
  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const apply = () =>
      document.documentElement.style.setProperty(
        "--app-header-h",
        `${Math.round(el.getBoundingClientRect().height)}px`,
      );
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const wasDrawerOpen = useRef(false);
  useEffect(() => {
    if (typeof document !== "undefined")
      document.documentElement.setAttribute(
        "data-drawer",
        drawerOpen ? "open" : "closed",
      );
    if (mainRef.current) mainRef.current.inert = drawerOpen && !isDesktop;
    // Closing the drawer returns the focus to the hamburger that opened it.
    if (wasDrawerOpen.current && !drawerOpen) {
      hamburgerRef.current?.focus({ preventScroll: true });
    }
    wasDrawerOpen.current = drawerOpen;
  }, [drawerOpen, isDesktop]);

  // Page visibility (Admin Settings → Pages): hidden pages disappear from
  // the sidebar for every role, including the State Admin. Admin Settings
  // itself cannot be hidden — `isItemVisible` keeps that one exemption — so
  // there is always a way back to the Pages table to restore one.
  const settingsQ = useQuery(api.facilities.getAppSettings, {});
  const facilityStyleQ = useQuery(api.profile.myFacilityStyle, {});
  useEffect(() => {
    hydrateFacilityStyle(
      facilityStyleQ,
      settingsQ?.settings.facilityStyle ?? DEFAULT_SETTINGS.facilityStyle,
    );
  }, [facilityStyleQ, settingsQ?.settings.facilityStyle]);
  const hiddenSet = useMemo(
    () =>
      new Set(
        [
          ((settingsQ?.settings.hiddenCategories as string[] | undefined) ??
            DEFAULT_SETTINGS.hiddenCategories) as string[],
          ((settingsQ?.settings.hiddenPages as string[] | undefined) ??
            DEFAULT_SETTINGS.hiddenPages) as string[],
        ].flat(),
      ),
    [settingsQ],
  );
  /** True while the Admin Settings nav entry is switched off (for everyone). */
  const adminHidden = hiddenSet.has(ADMIN_NAV_KEY);

  /* ---------------- nav model (ONE config, both surfaces) ------------- */
  // The badge/bell counts read the SAME cycle scope as the pages, so the
  // number in the sidebar can never disagree with the list it opens.
  const cycleScope = useCycleScope();
  const rowsQ = useQuery(api.ops.listFacilityRowsFast, { cycle: cycleScope });
  const rows = rowsQ?.rows;
  /* ONE source: the badge number IS the length of the list the bell shows
     and of the Master List's `kpi=attention` click-through (attentionOf). */
  const documentRules = useMemo(
    () => normalizeDocumentRules(settingsQ?.settings.documentRules),
    [settingsQ],
  );
  const pendingConfig = useMemo(
    () => normalizePendingConfig(settingsQ?.settings.pendingRules),
    [settingsQ],
  );
  const notifications = useMemo(
    () =>
      rows?.length
        ? attentionList(rows, new Date(), documentRules, pendingConfig, settingsQ?.settings)
        : [],
    [rows, documentRules, pendingConfig],
  );
  const attentionCount = notifications.length;
  /* Links Organiser reminders are a SECOND feed, keep separate from the
     facility attention badge. The bell sums both; the nav badge stays the
     facility count so the Master List click-through never changes meaning. */
  const customPagesQ = useQuery(api.pages.nav, {});
  const pageOverridesQ = useQuery(api.pages.builtinOverrides, {});
  const pageGroupsQ = useQuery(api.pages.groups, {});
  const linkReminders = useQuery(api.links.reminders, {});
  const linkAlerts = useMemo(() => linkReminders?.items ?? [], [linkReminders]);

  const groups = useMemo(
    () =>
      buildSidebarNav({
        role,
        appRole: user?.appRole ?? null,
        hiddenSet,
        attentionCount,
        linkAlertCount: linkReminders?.sidebarBadge ? linkReminders.count : 0,
        customPages: customPagesQ,
        groups: pageGroupsQ,
        overrides: pageOverridesQ as
          | Record<string, { label?: string; roles?: string[] }>
          | undefined,
      }),
    [
      role,
      user?.appRole,
      hiddenSet,
      attentionCount,
      linkReminders?.sidebarBadge,
      linkReminders?.count,
      customPagesQ,
      pageOverridesQ,
      pageGroupsQ,
    ],
  );
  const activePath = location.pathname;

  /* Direct-URL guard. Sidebar hiding is presentation; this server answer is
     what stops a role opening a page it was not given. */
  const routeAccess = useQuery(api.pageAccess.routeAccess, { route: activePath });

  const roleBadge =
    user?.appRole === "admin"
      ? "State Admin"
      : user?.appRole === "entry"
        ? "Data Entry"
        : user?.appRole === "dqmo"
          ? "DQMO"
          : user?.appRole === "dqc"
            ? "DQC"
            : "Viewer";

  const handleSignOut = useCallback(() => {
    void signOut();
  }, [signOut]);

  const prefetched = useRef(new Set<string>());
  const prefetchRoute = useCallback((to: string) => {
    if (prefetched.current.has(to)) return;
    prefetched.current.add(to);
    const load = to.startsWith("/facilities/")
      ? () => import("@/pages/FacilityRouteDispatcher")
      : PAGE_LOADERS[to];
    const pending = load?.();
    // A failed prefetch is harmless — the real navigation retries the chunk.
    if (pending) void pending.catch(() => undefined);
  }, []);

  const openSearch = useCallback(() => {
    setDrawerOpen(false);
    setPaletteOpen(true);
  }, []);

  /* Stable primitives only: the memoized sidebar must not re-render just
     because AppShell did (tables keep their measured widths while typing). */
  const sidebarUser = useMemo(
    () => (user ? { name: user.name, email: user.email } : null),
    [user],
  );

  return (
    <div className="app-shell">
      <AppSidebar
        mode={mode}
        drawerOpen={drawerOpen}
        compactChrome={compactChrome}
        activePath={activePath}
        groups={groups}
        notifications={notifications}
        attentionCount={attentionCount}
        linkAlerts={linkAlerts}
        user={sidebarUser}
        roleBadge={roleBadge}
        hintDismissed={!showHint}
        onDismissHint={dismissHint}
        onShowHint={showHintAgain}
        onToggle={toggleSidebar}
        onCloseDrawer={() => setDrawerOpen(false)}
        onSignOut={handleSignOut}
        onOpenSearch={openSearch}
        prefetch={prefetchRoute}
      />

      {/* ---------------- Main column ---------------- */}
      <main ref={mainRef} className="content-col px-4 pb-8 md:px-6">
        {/* Sticky page header — freezes on scroll on every page. On phones a
            hamburger opens the navigation drawer so no screen width is spent
            on a permanent sidebar. On desktop the LOGO at the top of the
            sidebar is the expand/collapse control (Ctrl/Cmd+B also works). */}
        <header
          ref={headerRef}
          data-print="hide"
          className="sticky top-0 z-30 -mx-4 mb-4 flex flex-col gap-3 border-b border-border/60 bg-background/85 px-4 pt-3 pb-3 backdrop-blur-md md:-mx-6 md:px-6 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="flex min-w-0 items-center gap-2">
            {/* Hamburger — under 768px (the sidebar never occupies width) */}
            <Button
              variant="outline"
              size="icon"
              className="size-11 shrink-0 rounded-xl md:hidden"
              ref={hamburgerRef}
              aria-label="Open navigation menu"
              aria-expanded={drawerOpen}
              aria-controls="app-sidebar"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            {/* Expand — desktop, sidebar off (Ctrl/Cmd+B also works). */}

            {/* A category page shows ITS nav glyph here, from the same
                `sidebarConfig` value as the sidebar (never a second table). */}
            {TitleIcon && (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-card text-primary">
                <TitleIcon className="size-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
            )}

            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight md:text-2xl">
                {title}
              </h1>
              {subtitle && (
                <p className="truncate text-sm text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {!activePath.startsWith("/guide") && (
              <GuideHelpButton path={activePath} articleRoute={guideRoute} />
            )}
            {actions && <div className="min-w-0">{actions}</div>}
          </div>
        </header>
        {/* A past cycle is read-only — one banner for every page, above the
            content (never a page-header control). */}
        <CycleScopeBanner />
        {routeAccess && !routeAccess.allowed ? (
          <section
            data-testid="page-forbidden"
            className="glass mx-auto mt-10 max-w-lg rounded-xl border border-border/60 p-6 text-center"
          >
            <ShieldCheck className="mx-auto size-8 text-muted-foreground" />
            <h2 className="mt-3 text-lg font-semibold">403 · No access</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {routeAccess.reason ?? "Your role cannot open this page."}
            </p>
          </section>
        ) : (
          children
        )}
      </main>

      {/* ONE tooltip layer for the whole app (data-tip driven). */}
      <TipLayer />
      <GuideSpotlight />

      {/* ---------------- Command palette (Ctrl+K / ⌘K / search) ---------- */}
      {paletteOpen && (
        <Suspense fallback={null}>
          <CommandPalette
            open={paletteOpen}
            onOpenChange={setPaletteOpen}
            isAdmin={isAdmin}
            isEditor={isAdmin || role === "editor"}
            appRole={user?.appRole ?? null}
            adminHidden={adminHidden}
          />
        </Suspense>
      )}

      {/* ONE "Print facility sheet" dialog for the whole app — see
          lib/printSheet for the request store every button calls. */}
      <PrintSheetDialog />
    </div>
  );
}
