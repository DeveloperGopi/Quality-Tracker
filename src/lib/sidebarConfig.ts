/**
 * SIDEBAR CONFIG — the ONE place the navigation lives.
 *
 * Everything the sidebar renders comes from here: groups, their order, the
 * short `railLabel` shown on the icon rail, icons, role visibility, the
 * Admin Page-visibility key, and the two badge kinds:
 *
 *   • `attention` — an amber count pill fed from `computeKpis`
 *     (`.attentionFacilities`, the same "Needs attention" buildMetric the
 *     dashboard chips use; the sidebar receives the resolved number).
 *   • `new` — a blue "New" pill for recently added pages. `newUntil` is a
 *     YYYY-MM-DD date; after it the pill disappears everywhere (nav, rail
 *     dot, tooltip) with no code change needed. Default horizon: one month
 *     after the page shipped.
 *
 * Spec (`scripts/sidebarLabels.test.ts`): labels stay ≤ 24 characters in
 * English and Tamil (checked at build time by scripts/checkSidebarLabels.ts);
 * they render on one 44px line with an ellipsis anyway.
 */

import {
  BadgeCheck,
  BarChart3,
  BookMarked,
  ChartColumnBig,
  BookOpen,
  Building2,
  ClipboardCheck,
  ClipboardList,
  ClipboardPen,
  FileSpreadsheet,
  Files,
  Flame,
  HandCoins,
  LayoutDashboard,
  ListTodo,
  Presentation,
  RefreshCcw,
  Settings,
  SlidersHorizontal,
  Upload,
  UserRound,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import { sidebarLabel, type SidebarLabelKey } from "@/lib/sidebarLabels";
import {
  UNGROUPED_PAGE_GROUP,
  normalizePageGroups,
  type PageGroupDef,
} from "@/lib/pageGroups";

export type SidebarGroupId = "main" | "facilityData" | "tools" | "data" | "admin";

/** The Page-visibility key that hides the Admin Settings entry itself.
 *  Unlike every other hidden page it hides for EVERYONE — State Admin
 *  included — because a nav entry you cannot hide is not a toggle. The route
 *  keeps working: the palette, the Profile link and a direct /admin address
 *  are the way back (Admin → Page visibility, Profile, Ctrl/Cmd+K). */
export const ADMIN_NAV_KEY = "admin";

export type SidebarBadgeSpec =
  | { kind: "attention" }
  | { kind: "new"; until: string };

export type SidebarItemDef = {
  /** Route — identity and palette value. */
  to: string;
  labelKey: SidebarLabelKey;
  icon: LucideIcon;
  group: SidebarGroupId;
  /** Admin Page-visibility setting (hiddenPages). Every key hides for
   *  non-admins only — except ADMIN_NAV_KEY, which hides for everyone. */
  visibilityKey?: string;
  /** State-Admin-only item. */
  adminOnly?: boolean;
  /** Editors-only item (District Editors + State Admin). */
  editorOnly?: boolean;
  /** Shipped role allowlist (Admin → Pages can still re-scope it). */
  defaultRoles?: string[];
  badge?: SidebarBadgeSpec;
  /** Palette hint text (the secondary line in results). */
  hint?: string;
};

export type SidebarGroupDef = {
  id: SidebarGroupId;
  /** Full label (expanded nav, group aria-label). */
  labelKey: SidebarLabelKey;
  /** Short 3–4 letter label on the icon rail (visual only, aria-hidden). */
  railLabel: string;
};

export const SIDEBAR_GROUPS: SidebarGroupDef[] = [
  { id: "main", labelKey: "group.main", railLabel: "MAIN" },
  { id: "facilityData", labelKey: "group.facilityData", railLabel: "FLTY" },
  { id: "tools", labelKey: "group.tools", railLabel: "TOOL" },
  { id: "data", labelKey: "group.data", railLabel: "DATA" },
  { id: "admin", labelKey: "group.admin", railLabel: "ADMN" },
];

/** "New" pages: which routes earned the pill and until when (default 30d). */
export const NEW_UNTIL_DAY = 30;

function plusDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * The shipped date of each page that currently carries the "New" pill.
 * When a new page lands, add an entry here; when it ages out, the pill
 * disappears on its own and the entry can be cleaned up.
 */
const NEW_UNTIL: Record<string, { shipped: string; until: string }> = {
  "/custom-report": { shipped: "2026-10-15", until: plusDays("2026-10-15", NEW_UNTIL_DAY) },
  "/generate-ppt": { shipped: "2026-10-15", until: plusDays("2026-10-15", NEW_UNTIL_DAY) },
  "/system-map": { shipped: "2026-11-12", until: plusDays("2026-11-12", NEW_UNTIL_DAY) },
};

/**
 * THE active route → one nav item. Longest prefix wins, on a path boundary:
 * `/facilities/building` matches Building (and NOT Facility Master List),
 * while `/facilities/abc123` (a facility profile) matches the Master List.
 * Returns the winning `to` — callers compare with `===`, so exactly one item
 * can ever carry `aria-current="page"`.
 */
export function activeNavTo(
  groups: { items: { to: string }[] }[],
  pathname: string,
): string | null {
  let best: string | null = null;
  for (const group of groups) {
    for (const item of group.items) {
      const to = item.to;
      const hit = pathname === to || pathname.startsWith(to + "/");
      if (hit && (!best || to.length > best.length)) best = to;
    }
  }
  return best;
}

export const NAV_ITEMS: SidebarItemDef[] = [
  // MAIN
  { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, group: "main", hint: "KPIs, pipeline and the whole district" },
  {
    to: "/facilities",
    labelKey: "nav.facilities",
    icon: ClipboardList,
    group: "main",
    badge: { kind: "attention" },
    hint: "The full tracker sheet — search, filter, edit",
  },
  { to: "/reports", labelKey: "nav.reports", icon: FileSpreadsheet, group: "main", hint: "Excel, PDF, CSV and print exports" },
  // FACILITY DATA
  /* Icons are chosen so no two nav items share one (checked by
     scripts/navIcons.test.ts): an inspection checklist, a certified badge,
     funds being released, an assessment sheet. The Master List keeps
     ClipboardList, so State Assessment uses ClipboardCheck. */
  { to: "/facilities/state-assessment", labelKey: "category.stateAssessment", icon: ClipboardCheck, group: "facilityData", visibilityKey: "sa" },
  { to: "/facilities/certification", labelKey: "category.nqasCertification", icon: BadgeCheck, group: "facilityData", visibilityKey: "certification" },
  { to: "/facilities/recertification", labelKey: "category.recertification", icon: RefreshCcw, group: "facilityData", visibilityKey: "recert" },
  { to: "/facilities/internal-assessment", labelKey: "category.internalAssessment", icon: ClipboardPen, group: "facilityData", visibilityKey: "ia" },
  { to: "/facilities/fund", labelKey: "category.gapClosureFund", icon: HandCoins, group: "facilityData", visibilityKey: "fund" },
  { to: "/facilities/building", labelKey: "category.building", icon: Building2, group: "facilityData", visibilityKey: "building" },
  { to: "/facilities/fire-noc", labelKey: "category.fireNoc", icon: Flame, group: "facilityData", visibilityKey: "noc" },
  // TOOLS
  { to: "/summary-report", labelKey: "nav.summary", icon: BarChart3, group: "tools" },
  {
    to: "/system-map",
    labelKey: "nav.systemMap",
    icon: Workflow,
    group: "tools",
    visibilityKey: "system-map",
    badge: { kind: "new", until: NEW_UNTIL["/system-map"].until },
    hint: "How the whole tracker works, in one place",
  },
  {
    to: "/custom-report",
    labelKey: "nav.customReport",
    icon: SlidersHorizontal,
    group: "tools",
    badge: { kind: "new", until: NEW_UNTIL["/custom-report"].until },
  },
  {
    to: "/generate-ppt",
    labelKey: "nav.generatePpt",
    icon: Presentation,
    group: "tools",
    badge: { kind: "new", until: NEW_UNTIL["/generate-ppt"].until },
  },
  {
    to: "/pending",
    labelKey: "nav.pending",
    icon: ListTodo,
    group: "tools",
    hint: "Every facility with something missing, not updated or overdue",
  },
  {
    to: "/block-compare",
    labelKey: "nav.blockCompare",
    icon: ChartColumnBig,
    group: "tools",
    defaultRoles: ["admin", "dqc", "dqmo"],
    hint: "Compare all blocks on certification, IA, documents and issues",
  },
  {
    to: "/links",
    labelKey: "nav.links",
    icon: BookMarked,
    group: "tools",
    hint: "Searchable register of report and data-collection links",
  },
  {
    to: "/documents",
    labelKey: "nav.documents",
    icon: Files,
    group: "tools",
    visibilityKey: "documents",
    hint: "Every current facility document — open, download, ZIP",
  },
  {
    to: "/guide",
    labelKey: "nav.guide",
    icon: BookOpen,
    group: "tools",
    visibilityKey: "guide",
    hint: "Searchable guide to every page, with context help",
  },
  // DATA (editors only)
  { to: "/bulk-import", labelKey: "nav.bulkImport", icon: Upload, group: "data", editorOnly: true },
  // ADMIN (State Admin only)
  {
    to: "/admin",
    labelKey: "nav.admin",
    icon: Settings,
    group: "admin",
    adminOnly: true,
    visibilityKey: ADMIN_NAV_KEY,
  },
];

/** Route → icon, the ONE value every surface reads (nav, rail, pills, page
 *  headers, quick-view cards, the palette). */
/** Pages that are reachable (palette, account menu) without their own nav row
 *  still need ONE icon — the palette never guesses a glyph. */
const EXTRA_PAGE_ICONS: Record<string, LucideIcon> = {
  "/profile": UserRound,
};

/** The icon one nav item uses — in the expanded nav, the rail and the
 *  command palette (ONE table). A deep link to the same page carries its own
 *  query string (`/reports?tab=linelists`), so the query is ignored: the page
 *  keeps the icon of its route. */
export function navIcon(to: string): LucideIcon | undefined {
  const path = to.split("?")[0].split("#")[0];
  return NAV_ITEMS.find((item) => item.to === path)?.icon ?? EXTRA_PAGE_ICONS[path];
}

export type SidebarRole = "admin" | "editor" | "viewer";

export function roleOf(appRole: string | null | undefined): SidebarRole {
  if (appRole === "admin") return "admin";
  // DQC and DQMO can edit facility data like Data Entry, so they see the
  // editor-only destinations too. Page-level overrides still narrow each one.
  if (appRole === "entry" || appRole === "dqc" || appRole === "dqmo") return "editor";
  return "viewer";
}

export type NavVisibilityOptions = {
  role: SidebarRole;
  /** Real role key (admin / dqc / dqmo / entry / viewer) for Admin → Pages
   *  role visibility. Falls back to the internal tier. */
  appRole?: string | null;
  /** Admin Settings → Page visibility (hidden page keys). The State Admin
   *  still sees every hidden page EXCEPT Admin Settings itself. */
  hiddenSet?: ReadonlySet<string>;
  /** Today, injectable for tests of the "New" expiry. */
  today?: string;
};

/** Is the item visible for this role / visibility set / "New" horizon? */
export function isItemVisible(
  item: SidebarItemDef,
  { role, hiddenSet }: NavVisibilityOptions,
): boolean {
  if (item.adminOnly && role !== "admin") return false;
  if (item.editorOnly && role === "viewer") return false;
  const visibilityKey = item.visibilityKey ?? item.to.replace(/^\//, "");
  if (hiddenSet?.has(visibilityKey)) {
    // Admin Settings can never be hidden or re-scoped (Admin → Pages safety).
    if (visibilityKey === ADMIN_NAV_KEY) return true;
    return false;
  }
  return true;
}

/** The full nav model, one call for both the sidebar and the palette. */
export function buildSidebarNav(
  opts: NavVisibilityOptions & {
    /** Resolved "Needs attention" count (computeKpis → attentionFacilities). */
    attentionCount?: number;
    /** Optional Links Organiser due count (Admin → Links, default OFF). */
    linkAlertCount?: number;
    labels?: (key: SidebarLabelKey) => string;
    /** Live custom pages (api.pages.nav) — already role-filtered. */
    customPages?: CustomNavPage[];
    /** Admin → Pages persisted group labels and order. */
    groups?: PageGroupDef[] | null;
    /** Admin → Pages built-in overrides, keyed by route. */
    overrides?: Record<
      string,
      {
        label?: string;
        roles?: string[];
        everyone?: boolean;
        order?: number;
        visible?: boolean;
        group?: string;
      }
    >;
  },
) {
  const attention =
    opts.attentionCount != null && opts.attentionCount > 0
      ? (opts.attentionCount as number)
      : null;
  const label = (k: string) =>
    opts.labels?.(k as SidebarLabelKey) ?? sidebarLabel(k as SidebarLabelKey);
  const configured = normalizePageGroups(opts.groups ?? undefined);
  // Older data can reference a group that no longer exists; keep those pages
  // reachable rather than silently dropping them from the sidebar.
  const used = new Set<string>([
    ...(opts.customPages ?? []).map((page) => page.group),
    ...Object.values(opts.overrides ?? {})
      .map((override) => override.group)
      .filter((group): group is string => Boolean(group)),
  ]);
  const groupDefs: PageGroupDef[] = [
    ...configured,
    ...[...used]
      .filter((id) => !configured.some((group) => group.id === id))
      .map((id, index) => ({
        id,
        label: id === UNGROUPED_PAGE_GROUP ? "Ungrouped" : id,
        order: 10_000 + index,
      })),
  ].sort((a, b) => a.order - b.order);
  return groupDefs.map((group) => {
    const builtin = SIDEBAR_GROUPS.find((item) => item.id === group.id);
    const builtinLabel = builtin
      ? opts.labels?.(builtin.labelKey) ?? sidebarLabel(builtin.labelKey)
      : null;
    const displayLabel =
      builtinLabel && group.label === sidebarLabel(builtin!.labelKey)
        ? builtinLabel
        : group.label;
    return {
      id: group.id,
      label: displayLabel,
      railLabel:
        builtin?.railLabel ??
        (displayLabel.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase() || "PAGE"),
      items: [
      ...NAV_ITEMS.filter((item) => {
        if (!isItemVisible(item, opts)) return false;
        const over = opts.overrides?.[item.to];
        // Admin → Pages can move a built-in page between sidebar groups.
        if ((over?.group ?? item.group) !== group.id) return false;
        // Admin Settings stays reachable whatever an override says.
        if (item.to === "/admin") return true;
        if (over?.visible === false) return false;
        if (over?.everyone) return true;
        if (Array.isArray(over?.roles) && over.roles.length > 0) {
          return over.roles.includes(opts.appRole ?? opts.role ?? "viewer");
        }
        // The guide starts as a State Admin tool; Admin → Pages can share it.
        if (item.to === "/guide") return opts.appRole === "admin";
        // Shipped role defaults (Block Compare: admin, DQC, DQMO).
        if (item.defaultRoles?.length) {
          return item.defaultRoles.includes(opts.appRole ?? opts.role ?? "viewer");
        }
        return true;
      }),
      ...(opts.customPages ?? [])
        .filter((p) => p.group === group.id)
        .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
        .map((p) => ({
          to: `/p/${p.slug}`,
          icon: CUSTOM_PAGE_ICONS[p.icon] ?? FileSpreadsheet,
          label: p.name,
          hint: "Custom page",
        })),
    ]
      .map((item) => ({
        to: item.to,
        icon: item.icon,
        label:
          "labelKey" in item
            ? opts.overrides?.[item.to]?.label?.trim() || label(item.labelKey)
            : opts.overrides?.[item.to]?.label?.trim() || item.label,
        hint: item.hint,
        /** New-pill expiry: null once the horizon passed. */
        isNew:
          "badge" in item && item.badge?.kind === "new"
            ? item.badge.until >= (opts.today ?? new Date().toISOString().slice(0, 10))
            : false,
        /** Attention badge only ever sits on Facility Master List. */
        badge:
          "badge" in item && item.badge?.kind === "attention"
            ? attention
            : item.to === "/links" && (opts.linkAlertCount ?? 0) > 0
              ? opts.linkAlertCount ?? null
              : null,
      }))
      .sort((a, b) => {
        const orderOf = (to: string) => {
          const over = opts.overrides?.[to]?.order;
          if (over != null) return over;
          const custom = opts.customPages?.find((p) => `/p/${p.slug}` === to);
          if (custom) return custom.order;
          return NAV_ITEMS.findIndex((i) => i.to === to);
        };
        return orderOf(a.to) - orderOf(b.to);
      }),
    };
  }).filter((g) => g.items.length > 0);
}

export type CustomNavPage = {
  slug: string;
  name: string;
  icon: string;
  group: string;
  order: number;
};

/** Icon names a custom page may store (Admin → Pages picker). */
const CUSTOM_PAGE_ICONS: Record<string, SidebarItemDef["icon"]> = {
  FileSpreadsheet,
  ClipboardList,
  ClipboardPen,
  Files,
  BarChart3,
  LayoutDashboard,
  ListTodo,
  BookMarked,
  Presentation,
  BadgeCheck,
};

export type SidebarNavItemModel = ReturnType<typeof buildSidebarNav>[number]["items"][number];
export type SidebarGroupModel = ReturnType<typeof buildSidebarNav>[number];
