// Admin Settings — presentation metadata for the State Admin page.
//
// Everything in this file is UI metadata only: the settings themselves keep
// living in the `appSettings` table and are still written through the existing
// `setSetting` mutation, so no data model, endpoint or permission rule changes.
// The single source of truth for the *lists* and the *phases* stays
// `convex/lifecycle.ts` (DROPDOWN_GROUPS / PIPELINE_PHASES / DEFAULT_SETTINGS).

import {
  BookMarked,
  Braces,
  Cloud,
  Database,
  FileText,
  Filter,
  FolderOpen,
  Gauge,
  LayoutDashboard,
  ListPlus,
  ListTodo,
  PanelLeft,
  Settings,
  ShieldCheck,
  Timer,
  Type,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { DROPDOWN_GROUPS, PIPELINE_PHASES } from "@/convex/lifecycle";
import { HEADER_OVERRIDES_KEY } from "@/lib/tableHeaders";
import { ADMIN_NAV_KEY } from "@/lib/sidebarConfig";
import {
  CATEGORY_META,
  headerLabelCategory,
  type TrackerCategoryId,
} from "@/lib/trackerColumns";

// ---------------------------------------------------------------------------
// Main tabs
// ---------------------------------------------------------------------------

export type AdminTabId =
  | "master-data"
  | "pages"
  | "users"
  | "documents"
  | "pending"
  | "links"
  | "data-checks"
  | "google-drive"
  | "workspace"
  | "maintenance";

export const ADMIN_TABS: {
  id: AdminTabId;
  label: string;
  icon: LucideIcon;
  description: string;
}[] = [
  {
    id: "master-data",
    label: "General",
    icon: Database,
    description:
      "Blocks, PHCs, the NQAS scope options and the Annexure I department names.",
  },
  {
    id: "pages",
    label: "Pages",
    icon: FileText,
    description:
      "Create, edit, hide and remove pages. Built-in pages can be renamed and re-scoped but never deleted; custom line-list pages live here.",
  },
  {
    id: "users",
    label: "Users and roles",
    icon: Users,
    description: "Approve registrations, set roles and assign blocks.",
  },
  {
    id: "documents",
    label: "Documents",
    icon: FileText,
    description:
      "Requirement rules for the six documents — the row badge, the save gate and the counts all read this one rule.",
  },
  {
    id: "pending",
    label: "Pending rules",
    icon: ListTodo,
    description:
      "Enable or disable each pending rule, change its severity and thresholds. The bell, sidebar badge, Master List and /pending all read this one registry.",
  },
  {
    id: "links",
    label: "Links",
    icon: BookMarked,
    description:
      "Categories, owners, statuses, frequency intervals and who gets link reminders. State Admin only.",
  },
  {
    id: "data-checks",
    label: "Data checks",
    icon: ShieldCheck,
    description:
      "One health page for every stored-data check: counts, filters, previews, exports and Undo.",
  },
  {
    id: "google-drive",
    label: "Google Drive",
    icon: Cloud,
    description:
      "Connection, checklist, storage and self-test for the Google Drive document store. State Admin only.",
  },
  {
    id: "workspace",
    label: "Table & Display",
    icon: Braces,
    description: "Dropdown lists, column headers, page visibility, display and cycle rules.",
  },
  {
    id: "maintenance",
    label: "Audit and logs",
    icon: Wrench,
    description: "Activity log, status recompute and the danger zone.",
  },
];

// ---------------------------------------------------------------------------
// Workspace sub-sections (one visible at a time — no long scroll)
// ---------------------------------------------------------------------------

export type WorkspaceSectionId =
  | "lists"
  | "headers"
  | "display"
  | "filters"
  | "timing"
  | "dashboard"
  | "drive";

export const WORKSPACE_SECTIONS: {
  id: WorkspaceSectionId;
  label: string;
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    id: "lists",
    label: "Dropdown Lists",
    icon: ListPlus,
    title: "Dropdown lists",
    description:
      "Every dropdown in the app, grouped by certification stage. Adding or renaming an option changes what you can pick next time — records already saved keep the text they stored.",
  },
  {
    id: "headers",
    label: "Table Headers",
    icon: Type,
    title: "Table headers",
    description:
      "Rename the column titles printed on the Facility Master List, the reports and the exports. The stored data and the CSV column keys never change.",
  },
  {
    id: "display",
    label: "Table & Display",
    icon: PanelLeft,
    title: "Table & display",
    description:
      "Frozen master-list columns, the freeze cut-off width, the “Recently updated” marker, and the Annexure I score colour bands.",
  },
  {
    id: "filters",
    label: "Filters",
    icon: Filter,
    title: "Default filters",
    description:
      "The filter values a first-time visitor sees on data pages. Users can still change them in each page’s FilterBar.",
  },
  {
    id: "timing",
    label: "Cycle Timing",
    icon: Timer,
    title: "Cycle timing",
    description:
      "The numbers behind the certification rules: how long a certificate lasts, how soon a facility may re-take a State Assessment and when alerts appear.",
  },
  {
    id: "dashboard",
    label: "Dashboard Layout",
    icon: LayoutDashboard,
    title: "Dashboard layout",
    description:
      "Let each user rearrange the Dashboard sections on their own screen. Saves as soon as you flip it.",
  },
  {
    id: "drive",
    label: "Google Drive",
    icon: Cloud,
    title: "Google Drive storage",
    description:
      "The connection that stores facility documents, the root folder, file-size limits, retention and storage health. No Google credential is ever shown here.",
  },
];

// ---------------------------------------------------------------------------
// Cycle timing
// ---------------------------------------------------------------------------

export type CycleTimingField = {
  key: string;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  unit: string;
};

/** Bounds are enforced in the UI (clamped steppers) and re-checked before the
 *  value is handed to the draft, so an out-of-range number can never be saved. */
export const CYCLE_TIMING_FIELDS: CycleTimingField[] = [
  {
    key: "certificationValidityYears",
    label: "Quality Certified — validity",
    hint: "A fully certified facility stays certified for this many years from its GoI letter date.",
    min: 1,
    max: 10,
    step: 1,
    unit: "years",
  },
  {
    key: "conditionalValidityYears",
    label: "Certified with Conditionality — validity",
    hint: "Certificates issued with a conditionality last this long.",
    min: 1,
    max: 10,
    step: 1,
    unit: "years",
  },
  {
    key: "deferredCooldownMonths",
    label: "Deferred cooling period",
    hint: "After a deferred result, the facility may re-take the State Assessment once this period has passed.",
    min: 1,
    max: 12,
    step: 1,
    unit: "months",
  },
  {
    key: "iaFrequencyMonths",
    label: "Internal Assessment frequency",
    hint: "A facility is flagged “IA overdue” when its latest Internal Assessment is older than this.",
    min: 1,
    max: 12,
    step: 1,
    unit: "months",
  },
  {
    key: "surveillanceIntervalsMonths",
    label: "Surveillance interval",
    hint: "Year-1 surveillance falls due this long after certification; Year-2 at double the interval.",
    min: 6,
    max: 12,
    step: 1,
    unit: "months",
  },
  {
    key: "recertificationAlertLeadDays",
    label: "Recertification alert lead",
    hint: "“Recertification Due” appears this many days before the certificate expires.",
    min: 30,
    max: 365,
    step: 5,
    unit: "days",
  },
];

export const CYCLE_TIMING_KEYS = CYCLE_TIMING_FIELDS.map((f) => f.key);

/** Human, plain-language preview of what the current numbers mean. */
export function cycleTimelinePreview(values: Record<string, number>): {
  label: string;
  offset: string;
  tone: "start" | "mid" | "alert" | "end";
}[] {
  const y = values.certificationValidityYears ?? 3;
  const s = values.surveillanceIntervalsMonths ?? 12;
  const lead = values.recertificationAlertLeadDays ?? 90;
  const ia = values.iaFrequencyMonths ?? 3;
  const cooldown = values.deferredCooldownMonths ?? 3;
  return [
    { label: "Certified", offset: "day 0 — GoI letter date", tone: "start" },
    { label: "Internal Assessment due", offset: `every ${ia} month${ia === 1 ? "" : "s"}`, tone: "mid" },
    { label: "Surveillance 1", offset: `${s} months after certification`, tone: "mid" },
    { label: "Surveillance 2", offset: `${s * 2} months after certification`, tone: "mid" },
    {
      label: "Recertification alert",
      offset: `${lead} days before the ${y}-year expiry`,
      tone: "alert",
    },
    { label: "Certificate expires", offset: `${y} year${y === 1 ? "" : "s"} after certification`, tone: "end" },
    {
      label: "Deferred re-take",
      offset: `allowed ${cooldown} month${cooldown === 1 ? "" : "s"} after the deferred letter`,
      tone: "alert",
    },
  ];
}

// ---------------------------------------------------------------------------
// Table-header groups
// ---------------------------------------------------------------------------

export type HeaderGroup = { id: string; label: string; labels: string[] };

/** Two master-list columns belong to no single category page. */
const UNCATEGORISED_HEADERS = new Set(["Remarks", "Last Updated"]);

/** Order the master sheet reads in; the last entry collects anything without a
 *  category. Kept here — not in the panel — so the panel and the search index
 *  can never disagree about which group a column belongs to. */
const HEADER_GROUP_ORDER: { id: string; label: string; categories: TrackerCategoryId[] }[] = [
  { id: "certification", label: "Certification & NQAS Assessment", categories: ["certification"] },
  { id: "ia", label: "Internal Assessment", categories: ["ia"] },
  { id: "sa", label: "State Assessment", categories: ["sa"] },
  { id: "recert", label: "Surveillance & Recertification", categories: ["recert"] },
  { id: "building-noc", label: "Building & Fire NOC", categories: ["building", "noc"] },
  { id: "fund", label: "Gap Closure Fund", categories: ["fund"] },
  { id: "other", label: "Other columns", categories: [] },
];

/** Group header labels for the editor. Every label lands in exactly one group,
 *  in master-sheet order, and empty groups are dropped — so a new column added
 *  to the tracker registry can never disappear from Admin Settings. */
export function groupHeaderLabels(labels: readonly string[]): HeaderGroup[] {
  const groups: HeaderGroup[] = HEADER_GROUP_ORDER.map((g) => ({
    id: g.id,
    label: g.label,
    labels: [],
  }));
  for (const label of labels) {
    const category = UNCATEGORISED_HEADERS.has(label) ? null : headerLabelCategory(label);
    const index = HEADER_GROUP_ORDER.findIndex(
      (g) => category !== null && g.categories.includes(category),
    );
    groups[index === -1 ? groups.length - 1 : index].labels.push(label);
  }
  return groups.filter((g) => g.labels.length > 0);
}

// ---------------------------------------------------------------------------
// Page visibility
// ---------------------------------------------------------------------------

export const PAGE_VISIBILITY_PAGES: { key: string; label: string; description: string; icon: LucideIcon }[] = [
  {
    // The Admin Settings entry itself. Hiding it only removes the nav entry —
    // /admin, the Ctrl+K palette row and the Profile link keep working, and
    // "Hide all" deliberately skips it so an admin can never lock themselves
    // out of this screen.
    key: ADMIN_NAV_KEY,
    label: "Admin Settings",
    description:
      "State-Admin settings: users, documents, workspace rules and the audit log. Hidden, it still opens from your profile, Ctrl+K or /admin.",
    icon: Settings,
  },
  {
    key: "generate-ppt",
    label: "Generate PPT",
    description: "Presentation deck builder for district review meetings.",
    icon: Gauge,
  },
  {
    key: "custom-report",
    label: "Custom Report Builder",
    description: "Build a one-off pivot report and export it.",
    icon: FileText,
  },
  {
    key: "documents",
    label: "Document Library",
    description:
      "Every current facility document in one searchable list, with open, download and ZIP export.",
    icon: FolderOpen,
  },
];

// ---------------------------------------------------------------------------
// Which settings each workspace section owns
// ---------------------------------------------------------------------------

/** Every appSettings key the workspace sections can edit. `save all` writes
 *  exactly the keys present in the draft, and the JSON export covers this set. */
export const SETTING_KEYS = {
  lists: [
    ...DROPDOWN_GROUPS.flatMap((g) => g.items.map((i) => i.key)),
    // General → Scope options is a list too; keeping it here means the JSON
    // export and the save-all draft cover the same settings the panels edit.
    "scopeOptions",
  ],
  headers: [HEADER_OVERRIDES_KEY],
  visibility: ["hiddenCategories", "hiddenPages"],
  timing: CYCLE_TIMING_KEYS,
  dashboard: ["dashboardSectionControls", "iaTarget"],
} as const;

export const ALL_SETTING_KEYS: string[] = [
  ...SETTING_KEYS.lists,
  ...SETTING_KEYS.headers,
  ...SETTING_KEYS.visibility,
  ...SETTING_KEYS.timing,
  ...SETTING_KEYS.dashboard,
];

/** Dropdown keys the server can count usage for (see ops.getAdminOptionUsage).
 *  The two that map to canonical codes / free text are excluded there, so the
 *  removal warning stays honest instead of printing a wrong “0 uses”. */
export const USAGE_COUNTABLE_KEYS = new Set([
  "buildingTypes",
  "buildingStatuses",
  "nocAvailableOptions",
  "fundStatuses",
  "saStatuses",
  "generalDocStatuses",
  "assessorHuds",
  "assessmentModes",
  "nqasStatuses",
  "certificationStatuses",
  "checklistVersions",
  "departments",
  "facilityTypes",
  "statusLabels",
]);

/**
 * One “list key · option value → record count” row, as returned by
 * ops.getAdminOptionUsage. The server sends these as an ARRAY on purpose:
 * Convex rejects non-ASCII object field names, and real option values contain
 * characters like the em dash in “Certified — Surveillance Due”.
 */
export type OptionUsageEntry = {
  listKey: string;
  value: string;
  count: number;
};

/** Rebuilds the setting key → option value → count lookup the panels index.
 *  (Plain objects are fine here — the field-name restriction is Convex's, and
 *  it applies to values a function returns, not to browser-side objects.) */
export function optionUsageMap(
  entries: OptionUsageEntry[] | undefined,
): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const { listKey, value, count } of entries ?? []) {
    (out[listKey] ??= {})[value] = count;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Search index
// ---------------------------------------------------------------------------

export type AdminSearchEntry = {
  /** Stable id: also the DOM anchor (`data-admin-anchor`) the jump scrolls to. */
  id: string;
  label: string;
  hint: string;
  keywords: string;
  tab: AdminTabId;
  section?: WorkspaceSectionId;
};

/** Builds the jump index for the “Search settings…” box: every section, every
 *  dropdown list *and its options*, every renamable column header, every page
 *  visibility row and every cycle-timing number. Pure — unit tested. */
export function buildAdminSearchIndex(input: {
  listValues: Record<string, string[]>;
  headerLabels: readonly string[];
  headerGroups: { label: string; labels: string[] }[];
  blockCount: number;
  phcCount: number;
  pendingUsers: number;
}): AdminSearchEntry[] {
  const out: AdminSearchEntry[] = [];

  // Tabs / sections themselves.
  for (const tab of ADMIN_TABS) {
    out.push({
      id: `tab-${tab.id}`,
      label: tab.label,
      hint: tab.description,
      keywords: `section tab ${tab.id}`,
      tab: tab.id,
    });
  }
  for (const s of WORKSPACE_SECTIONS) {
    out.push({
      id: `section-${s.id}`,
      label: s.label,
      hint: s.description,
      keywords: `workspace ${s.id} ${s.label.toLowerCase()}`,
      tab: "workspace",
      section: s.id,
    });
  }

  // Dropdown lists + their options.
  for (const group of DROPDOWN_GROUPS) {
    for (const item of group.items) {
      out.push({
        id: `list-${item.key}`,
        label: item.label,
        hint: `${group.phase} · ${item.hint}`,
        keywords: `dropdown list option ${item.key} ${group.phase}`,
        tab: "workspace",
        section: "lists",
      });
      for (const value of input.listValues[item.key] ?? []) {
        out.push({
          id: `list-${item.key}`,
          label: `${value} — ${item.label}`,
          hint: `Option in ${item.label} (${group.phase})`,
          keywords: `option value choice ${value} ${item.label} ${item.key}`,
          tab: "workspace",
          section: "lists",
        });
      }
    }
  }

  // Column headers — grouped rows plus one entry per column.
  for (const g of input.headerGroups) {
    out.push({
      id: `header-group-${slug(g.label)}`,
      label: `${g.label} columns`,
      hint: `${g.labels.length} renamable column${g.labels.length === 1 ? "" : "s"}`,
      keywords: `table headers columns ${g.label}`,
      tab: "workspace",
      section: "headers",
    });
  }
  for (const label of input.headerLabels) {
    out.push({
      id: `header-${slug(label)}`,
      label,
      hint: "Table header — rename or reset",
      keywords: `column header rename ${label}`,
      tab: "workspace",
      section: "headers",
    });
  }

  // Page visibility moved into Admin → Pages; search still finds a page by
  // name, but the result opens the Pages tab where visibility now lives.
  for (const id of Object.keys(CATEGORY_META) as TrackerCategoryId[]) {
    const meta = CATEGORY_META[id];
    out.push({
      id: `visibility-${id}`,
      label: meta.label,
      hint: `Page visibility · ${meta.route}`,
      keywords: `hide show page visibility category ${id} ${meta.label}`,
      tab: "pages",
    });
  }
  for (const p of PAGE_VISIBILITY_PAGES) {
    out.push({
      id: `visibility-${p.key}`,
      label: p.label,
      hint: "Page visibility",
      keywords: `hide show page visibility ${p.key} ${p.label}`,
      tab: "pages",
    });
  }

  // Cycle timing.
  for (const f of CYCLE_TIMING_FIELDS) {
    out.push({
      id: `timing-${f.key}`,
      label: f.label,
      hint: `Cycle timing · ${f.unit}`,
      keywords: `cycle timing validity months days ${f.key} ${f.label}`,
      tab: "workspace",
      section: "timing",
    });
  }

  // Master data + users + maintenance destinations.
  out.push(
    {
      id: "master-blocks",
      label: `Blocks (${input.blockCount})`,
      hint: "Master data — add, rename or remove blocks",
      keywords: "block master data hierarchy",
      tab: "master-data",
    },
    {
      id: "master-phcs",
      label: `PHCs (${input.phcCount})`,
      hint: "Master data — add or remove PHC entries",
      keywords: "phc hospital sub centre master data",
      tab: "master-data",
    },
    {
      id: "scope-options",
      label: "Scope options",
      hint: "General — assessment scope cards",
      keywords: "general scope options state nqas assessment cards",
      tab: "master-data",
    },
    {
      id: "display-ia-target",
      label: "IA target %",
      hint: "Table & Display — target line and above/below-target chips on the Internal Assessment card",
      keywords: "internal assessment ia target percentage goal chart table display",
      tab: "workspace",
      section: "display",
    },
    {
      id: "users-pending",
      label: `Pending registrations (${input.pendingUsers})`,
      hint: "Users — approve or reject new sign-ups",
      keywords: "pending approve registration reject users",
      tab: "users",
    },
    {
      id: "users-access",
      label: "User access",
      hint: "Users — roles and assigned blocks",
      keywords: "roles data entry dqmo dqc viewer admin blocks assign users",
      tab: "users",
    },
    {
      id: "maintenance-recompute",
      label: "Recompute all statuses",
      hint: "Maintenance — refresh every facility's derived status",
      keywords: "recompute statuses maintenance refresh",
      tab: "maintenance",
    },
    {
      id: "maintenance-activity",
      label: "Activity log",
      hint: "Maintenance — who changed what, and when",
      keywords: "activity log audit history changes",
      tab: "maintenance",
    },
    {
      id: "maintenance-danger",
      label: "Danger zone — delete all facilities",
      hint: "Maintenance — irreversible, code-confirmed wipe",
      keywords: "danger delete all facilities wipe destructive danger zone",
      tab: "maintenance",
    },
  );

  return out;
}

/** Filter helper — matches label, hint and keywords, best matches first. */
export function searchAdminIndex(entries: AdminSearchEntry[], query: string): AdminSearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const words = q.split(/\s+/);
  const scored = entries
    .map((e) => {
      const haystack = `${e.label} ${e.hint} ${e.keywords}`.toLowerCase();
      if (!words.every((w) => haystack.includes(w))) return null;
      const label = e.label.toLowerCase();
      let score = 0;
      if (label.startsWith(q)) score += 6;
      else if (label.includes(q)) score += 4;
      if (e.keywords.toLowerCase().includes(q)) score += 1;
      return { e, score };
    })
    .filter((x): x is { e: AdminSearchEntry; score: number } => x !== null);
  scored.sort((a, b) => b.score - a.score || a.e.label.localeCompare(b.e.label));
  return scored.slice(0, 24).map((s) => s.e);
}

/** DOM-anchor safe slug for a header/group label. */
export function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// Draft helpers
// ---------------------------------------------------------------------------

/** Pending settings changes: setting key → new value. */
export type SettingsDraft = Record<string, unknown>;

/** Drop a key from the draft (used when an edit is reverted to the saved value). */
export function withPending(
  draft: SettingsDraft,
  key: string,
  value: unknown,
): SettingsDraft {
  const next = { ...draft };
  if (value === undefined) delete next[key];
  else next[key] = value;
  return next;
}

/** JSON payload for the “Export settings” action — same keys save-all writes. */
export function settingsExportPayload(
  settings: Record<string, unknown>,
  exportedBy: string,
  now: Date = new Date(),
): { fileName: string; json: string } {
  const snapshot: Record<string, unknown> = {};
  for (const key of ALL_SETTING_KEYS) {
    const value = settings[key];
    if (value !== undefined) snapshot[key] = value;
  }
  const payload = {
    app: "NQAS Tracker",
    kind: "admin-settings",
    version: 1,
    exportedAt: now.toISOString(),
    exportedBy,
    settings: snapshot,
  };
  return {
    fileName: `nqas-settings-${now.toISOString().slice(0, 10)}.json`,
    json: JSON.stringify(payload, null, 2),
  };
}

/** The pipeline stages shown as the clickable stepper above the dropdown lists. */
export const DROPDOWN_PIPELINE_STAGES = PIPELINE_PHASES;
