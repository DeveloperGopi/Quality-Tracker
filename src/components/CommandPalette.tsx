/**
 * THE command palette — ONE dialog behind the sidebar search field, the rail
 * search tile and Ctrl/Cmd+K (all three call `onOpenChange(true)` from the
 * shell; the palette owns no global listener, so there is never a second
 * keydown handler fighting over the shortcut).
 *
 * Groups:
 *   • Recent   — the last six picks (per device), shown with an empty query.
 *   • Pages    — nav routes (Admin pages keep their role gate).
 *   • Facilities — Facility / PHC / NIN / SaQsham name matches from the
 *     in-memory list. Enter opens the facility QUICK VIEW; Ctrl/Cmd+Enter
 *     opens the FULL profile.
 *   • Actions  — Export data, Add facility, Start import (role-aware).
 *
 * Instant by construction: search runs in memory against the cached rows,
 * one subscription, no fetch per keystroke.
 */

import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Building2,
  Clock,
  Download,
  PlusCircle,
  Upload,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { NAV_ITEMS, navIcon } from "@/lib/sidebarConfig";

const RECENT_KEY = "nqas.palette.recent";
const MAX_RECENT = 6;

type PageEntry = { to: string; label: string; group: "Pages" | "Admin pages"; hint?: string };

const PAGES: PageEntry[] = [
  { to: "/dashboard", label: "Dashboard", group: "Pages", hint: "KPIs and the district pipeline" },
  { to: "/system-map", label: "System Map", group: "Pages", hint: "How the tracker works: flow, specs, pages and tools" },
  { to: "/facilities", label: "Facility Master List", group: "Pages", hint: "The full tracker sheet" },
  { to: "/facilities/state-assessment", label: "State Assessment", group: "Pages" },
  { to: "/facilities/certification", label: "NQAS Certification", group: "Pages" },
  { to: "/facilities/recertification", label: "Recertification", group: "Pages" },
  { to: "/facilities/internal-assessment", label: "Internal Assessment", group: "Pages" },
  { to: "/facilities/fund", label: "Gap Closure Fund", group: "Pages" },
  { to: "/facilities/building", label: "Building", group: "Pages" },
  { to: "/facilities/fire-noc", label: "Fire NOC", group: "Pages" },
  { to: "/reports", label: "Reports & Export", group: "Pages", hint: "Excel, PDF, CSV, print" },
  { to: "/reports?tab=linelists", label: "Line lists", group: "Pages", hint: "Topic-wise facility lists with a summary and download" },
  { to: "/summary-report", label: "NQAS Summary Report", group: "Pages" },
  { to: "/custom-report", label: "Custom Report Builder", group: "Pages" },
  { to: "/generate-ppt", label: "Generate PPT", group: "Pages" },
  { to: "/pending", label: "Pending & Follow-up", group: "Pages", hint: "Missing, not updated, overdue and conflicting facilities" },
  { to: "/block-compare", label: "Block Compare", group: "Pages", hint: "Compare blocks on certification, IA, documents and issues" },
  { to: "/links", label: "Links Organiser", group: "Pages", hint: "Report and data-collection links" },
  { to: "/documents", label: "Documents", group: "Pages", hint: "Every current facility document, with open, download and ZIP" },
  { to: "/guide", label: "Admin Guide", group: "Pages", hint: "How every page works, with context help" },
  { to: "/profile", label: "My profile", group: "Pages", hint: "Account, preferences, activity" },
  { to: "/bulk-import", label: "Bulk Import", group: "Admin pages" },
  { to: "/bulk-import?tab=mapping", label: "SaQsham status mapping", group: "Admin pages" },
  { to: "/admin", label: "Admin Settings", group: "Admin pages" },
];

/** The page's OWN nav icon (sidebarConfig is the only place an icon is set). */
function PageIcon({ to }: { to: string }) {
  const Icon = navIcon(to) ?? Building2;
  return <Icon className="mr-1.5 size-3.5 text-muted-foreground" aria-hidden />;
}

type RecentEntry = { type: "page" | "facility"; id: string; label: string; to: string };

export function readRecents(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as RecentEntry[]) : [];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function rememberRecent(
  entry: Omit<RecentEntry, "label"> & { label?: string },
): void {
  try {
    const next = [
      {
        ...entry,
        label: entry.label ?? entry.to,
      } satisfies RecentEntry,
      ...readRecents().filter((e) => e.id !== entry.id),
    ].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* private mode — recents are a nicety, not a feature */
  }
}

export function clearRecents(): void {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    /* ignore */
  }
}

type PaletteRow = {
  facility: {
    _id: string;
    name: string;
    block: string;
    facilityType: string;
    phc: string;
    ninNumber: string | null;
    currentStatus: string | null;
    saqshamCategory: string | null;
  };
};

function facilityHaystack(row: PaletteRow): string {
  return [
    row.facility.name,
    row.facility.block,
    row.facility.facilityType,
    row.facility.phc ?? "",
    row.facility.ninNumber ?? "",
    row.facility.saqshamCategory ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

/** Split on every literal match so a caller can wrap the hits in <mark>. */
export function matchParts(text: string, query: string): { hit: boolean; text: string }[] {
  const q = query.trim().toLowerCase();
  if (!q) return [{ hit: false, text }];
  const lower = text.toLowerCase();
  const parts: { hit: boolean; text: string }[] = [];
  let i = 0;
  while (i < text.length) {
    const at = lower.indexOf(q, i);
    if (at < 0) {
      parts.push({ hit: false, text: text.slice(i) });
      break;
    }
    if (at > i) parts.push({ hit: false, text: text.slice(i, at) });
    parts.push({ hit: true, text: text.slice(at, at + q.length) });
    i = at + q.length;
  }
  return parts.length ? parts : [{ hit: false, text }];
}

export function Highlight({ text, query }: { text: string; query: string }) {
  const parts = matchParts(text, query);
  return (
    <>
      {parts.map((p, i) =>
        p.hit ? (
          <mark key={i} className="rounded-sm bg-primary/15 font-semibold text-primary">
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

export function CommandPalette({
  open,
  onOpenChange,
  isAdmin,
  isEditor,
  appRole,
  adminHidden,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isAdmin?: boolean;
  isEditor?: boolean;
  appRole?: string | null;
  /** Admin Settings switched off in Page visibility — the entry stays here
   *  (State Admin only) labelled "(hidden)", because the palette is one of
   *  the guaranteed ways back. */
  adminHidden?: boolean;
}) {
  /* Controlled by the shell (the search field and Ctrl/Cmd+K live there). */
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = (o: boolean) => {
    setInternalOpen(o);
    onOpenChange?.(o);
  };

  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const listRows = useQuery(
    api.ops.listFacilityRowsFast,
    isOpen ? {} : "skip",
  ) as { rows: PaletteRow[] } | undefined;
  // Links are searched by NAME, not just by the page entry. The server applies
  // the signed-in user's visibility before these rows reach the palette.
  const linkRows = useQuery(api.links.palette, isOpen ? {} : "skip");
  /* Custom pages created in Admin → Pages; nav already filters by role. */
  const customPages = useQuery(api.pages.nav, isOpen ? {} : "skip");
  const pageOverrides = useQuery(
    api.pages.builtinOverrides,
    isOpen ? {} : "skip",
  ) as Record<string, { label?: string; roles?: string[]; everyone?: boolean; visible?: boolean }> | undefined;
  const settingsQ = useQuery(api.facilities.getAppSettings, isOpen ? {} : "skip");
  const hiddenPages = useMemo(() => {
    const pages = settingsQ?.settings.hiddenPages;
    const categories = settingsQ?.settings.hiddenCategories;
    return new Set([
      ...(Array.isArray(pages) ? (pages as string[]) : []),
      ...(Array.isArray(categories) ? (categories as string[]) : []),
    ]);
  }, [settingsQ]);
  /** Recent pages for the "Recent" group — read from localStorage at the
   *  moment the palette opens and DERIVED in render (no open-effect, no
   *  post-paint flash): a non-null override comes from an in-session run,
   *  null falls through to the stored recents. Closing clears the override
   *  so the next open re-reads storage. */
  const [recentsOverride, setRecentsOverride] = useState<RecentEntry[] | null>(null);
  const recents = recentsOverride ?? (isOpen ? readRecents() : []);
  /** Cmd/Ctrl+Enter while an item is selected → open the FULL profile. */
  const cmdEnter = useRef(false);

  const q = search.trim().toLowerCase();

  const facilityRows = useMemo(() => {
    const rows = listRows?.rows ?? [];
    if (!q) return rows.slice(0, 12);
    const compact = q.replace(/\s/g, "");
    return rows
      .filter((row: PaletteRow) => {
        const hay = facilityHaystack(row);
        if (!q) return false;
        if (hay.includes(q)) return true;
        // A NIN without its separators ("4527 324786") still matches.
        return !!(
          compact &&
          (row.facility.ninNumber ?? "").replace(/\s/g, "").includes(compact)
        );
      })
      .slice(0, 12);
  }, [listRows, q]);

  /** PAGES with the Admin entry relabelled while it is hidden — the ONE list
   *  both the results and the Recent group read. */
  const pages = useMemo(() => {
    const custom: PageEntry[] = (customPages ?? []).map((p) => ({
      to: `/p/${p.slug}`,
      label: p.name,
      group: "Pages",
      hint: "Custom page",
    }));
    const base = [...PAGES, ...custom]
      .filter((p) => {
        const over = pageOverrides?.[p.to];
        // The palette follows Admin → Pages visibility and roles. Hidden
        // means hidden for every role; Admin Settings itself is exempt.
        if (p.to.startsWith("/p/")) return true;
        if (p.to === "/admin") return true;
        if (over?.visible === false) return false;
        const item = NAV_ITEMS.find((n) => n.to === p.to);
        const hiddenKey = item?.visibilityKey ?? p.to.replace(/^\//, "");
        if (
          p.to !== "/admin" &&
          (hiddenPages.has(hiddenKey) || hiddenPages.has(p.to.replace(/^\//, "")))
        )
          return false;
        if (p.to === "/guide" && !over && appRole !== "admin") return false;
        if (over?.everyone) return true;
        if (over?.roles?.length) return !!appRole && over.roles.includes(appRole);
        if (item?.defaultRoles?.length)
          return !!appRole && item.defaultRoles.includes(appRole);
        return true;
      })
      .map((p) => {
        const over = pageOverrides?.[p.to];
        return over?.label?.trim() ? { ...p, label: over.label.trim() } : p;
      });
    return adminHidden
      ? base.map((p) =>
          p.to === "/admin"
            ? { ...p, label: "Admin settings (hidden)", hint: "Hidden from the sidebar — still opens here" }
            : p,
        )
      : base;
  }, [adminHidden, appRole, customPages, hiddenPages, isAdmin, pageOverrides]);

  const pageItems = useMemo(
    () =>
      pages.filter((p) => (isAdmin ? true : p.group !== "Admin pages")).filter(
        (p) => !q || p.label.toLowerCase().includes(q) || p.to.includes(q),
      ),
    [q, isAdmin, pages],
  );

  const linkItems = useMemo(() => {
    const rows = linkRows ?? [];
    return rows
      .filter((link) =>
        !q ||
        `${link.title} ${link.categoryName} ${link.serial}`.toLowerCase().includes(q),
      )
      .slice(0, q ? 12 : 6);
  }, [linkRows, q]);

  const actions = useMemo(
    () =>
      [
        {
          id: "action-export",
          label: "Export data",
          icon: Download,
          to: "/reports",
          hint: "Excel, PDF, CSV — build the export",
        },
        { id: "action-add", label: "Add facility", icon: PlusCircle, to: "/facilities?add=1", hint: "New facility record" },
        ...(isEditor
          ? [
              {
                id: "action-add-link",
                label: "Add link",
                icon: PlusCircle,
                to: "/links?add=1",
                hint: "New report or data-collection link",
              },
              {
                id: "action-import-links",
                label: "Import links",
                icon: Upload,
                to: "/links?import=1",
                hint: "Paste or upload the Links sheet",
              },
            ]
          : []),
        ...(isEditor
          ? [
              {
                id: "action-import",
                label: "Start import",
                icon: Upload,
                to: "/bulk-import",
                hint: "Import facility / assessment data",
              },
            ]
          : []),
      ].filter((a) => !q || a.label.toLowerCase().includes(q)),
    [q, isEditor],
  );

  const recentPages = useMemo(() => {
    if (q) return [];
    const map = new Map(pages.map((p) => [p.to, p.label]));
    return recents
      .filter((r) => r.type === "page" && map.has(r.to) && r.to !== "/facilities")
      .map((r) => ({ ...r, label: map.get(r.to) ?? r.label }));
  }, [recents, q, pages]);

  const runTo = (to: string, opts: { remember?: RecentEntry } = {}) => {
    setOpen(false);
    setSearch("");
    if (opts.remember) {
      rememberRecent({ ...opts.remember, to });
      setRecentsOverride([]);
    }
    navigate(to);
  };

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setSearch("");
          setRecentsOverride(null);
        }
      }}
    >
      {/* Modifier tracking: the record is captured on KEYDOWN so the facility
          Enter (quick view) and Ctrl/Cmd+Enter (full profile) split works. */}
      <div
        onKeyDown={(e) => {
          if (e.key === "Enter") cmdEnter.current = e.metaKey || e.ctrlKey;
        }}
        onKeyUp={() => {
          cmdEnter.current = false;
        }}
      >
        <CommandInput
          placeholder="Search pages or facilities"
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>No facility or page matches “{search}”.</CommandEmpty>

          {!q && recentPages.length > 0 && (
            <CommandGroup heading="Recent">
              {recentPages.map((r) => (
                <CommandItem
                  key={`r-${r.id}`}
                  value={`recent ${r.label}`}
                  onSelect={() =>
                    runTo(r.to, {
                      remember: { type: "page", id: r.id, label: r.label, to: r.to },
                    })
                  }
                  className="text-sm"
                >
                  <Clock className="mr-1.5 size-3.5 text-muted-foreground" />
                  <span className="min-w-0 flex-1">{r.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {pageItems.filter((p) => p.group === "Pages").length > 0 && (
            <CommandGroup heading="Pages">
              {pageItems
                .filter((p) => p.group === "Pages")
                .map((p) => (
                  <CommandItem
                    key={p.to}
                    value={`page ${p.label} ${p.to}`}
                    onSelect={() =>
                      runTo(p.to, {
                        remember: { type: "page", id: p.to, label: p.label, to: p.to },
                      })
                    }
                    className="text-sm"
                  >
                    {/* SAME icon as the sidebar: one config, so a page can
                        never show two different glyphs. */}
                    <PageIcon to={p.to} />
                    <Highlight text={p.label} query={search} />
                  </CommandItem>
                ))}
            </CommandGroup>
          )}

          {actions.length > 0 && (
            <CommandGroup heading="Actions">
              {actions.map((a) => (
                <CommandItem
                  key={a.id}
                  value={`action ${a.label}`}
                  onSelect={() =>
                    runTo(a.to, {
                      remember: { type: "page", id: a.id, label: a.label, to: a.to },
                    })
                  }
                  className="text-sm"
                >
                  <a.icon className="mr-1.5 size-3.5 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <Highlight text={a.label} query={search} />
                    {a.hint && (
                      <span className="ml-2 text-xs text-muted-foreground">{a.hint}</span>
                    )}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {(isAdmin ? pageItems.filter((p) => p.group === "Admin pages").length : 0) > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Admin pages">
                {pageItems
                  .filter((p) => p.group === "Admin pages")
                  .map((p) => (
                    <CommandItem
                      key={p.to}
                      value={`page ${p.label} ${p.to}`}
                      onSelect={() =>
                        runTo(p.to, {
                          remember: { type: "page", id: p.to, label: p.label, to: p.to },
                        })
                      }
                      className="text-sm"
                    >
                      <PageIcon to={p.to} />
                      <Highlight text={p.label} query={search} />
                    </CommandItem>
                  ))}
              </CommandGroup>
            </>
          )}

          {linkItems.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading={`Links${q ? ` — ${linkItems.length}` : " (recent names)"}`}>
                {linkItems.map((link) => (
                  <CommandItem
                    key={link.id}
                    value={`link ${link.title} ${link.categoryName} ${link.serial}`}
                    onSelect={() => {
                      const to = `/links?item=${link.id}`;
                      setOpen(false);
                      setSearch("");
                      rememberRecent({
                        type: "page",
                        id: `link:${link.id}`,
                        label: link.title,
                        to,
                      });
                      navigate(to);
                    }}
                    className="text-sm"
                  >
                    <PageIcon to="/links" />
                    <span className="min-w-0 flex-1 truncate">
                      <Highlight text={link.title} query={search} />
                      <span className="ml-2 text-xs text-muted-foreground">
                        {link.categoryName} · S. No {link.serial}
                      </span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          <CommandSeparator />

          <CommandGroup
            heading={
              listRows
                ? `Facilities${q ? ` — ${facilityRows.length} of ${listRows.rows.length}` : ` (${listRows.rows.length} total)`}`
                : "Facilities"
            }
          >
            {facilityRows.map((row: PaletteRow) => (
              <CommandItem
                key={row.facility._id}
                value={`facility ${facilityHaystack(row)}`}
                onSelect={() => {
                  // Enter → quick view (the deep-linked dialog);
                  // Ctrl/Cmd+Enter → the full profile form.
                  if (cmdEnter.current) {
                    runTo(`/facilities/${row.facility._id}`, {
                      remember: {
                        type: "facility",
                        id: row.facility._id,
                        label: row.facility.name,
                        to: `/facilities/${row.facility._id}`,
                      },
                    });
                    return;
                  }
                  const remember = {
                    type: "facility" as const,
                    id: row.facility._id,
                    label: row.facility.name,
                    to: `/facilities?facility=${row.facility._id}`,
                  };
                  setOpen(false);
                  setSearch("");
                  rememberRecent(remember);
                  navigate(`/facilities?facility=${row.facility._id}`);
                }}
                className="text-sm"
              >
                <span className="min-w-0 flex-1 truncate">
                  <Highlight text={row.facility.name} query={search} />
                  <span className="ml-2 text-xs text-muted-foreground">
                    {row.facility.facilityType} · {row.facility.block}
                    {row.facility.phc ? ` · ${row.facility.phc}` : ""}
                    {row.facility.saqshamCategory
                      ? ` · ${row.facility.saqshamCategory}`
                      : ""}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {row.facility.currentStatus}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </div>
    </CommandDialog>
  );
}
