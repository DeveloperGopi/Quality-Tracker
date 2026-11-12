/**
 * Admin Settings tests — the redesign's pure logic plus a structural check that
 * the “Search settings…” index can actually reach the DOM anchors the panels
 * render (the one class of bug that type-checking cannot see: an index id that
 * no component ever renders, so a jump silently does nothing).
 *
 * Run: bun test ./scripts
 */
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";

import { DROPDOWN_GROUPS } from "../src/convex/lifecycle";
import { HEADER_OVERRIDES_KEY } from "../src/lib/tableHeaders";
import {
  CATEGORY_META,
  MASTER_TABLE_HEADER_LABELS,
  type TrackerCategoryId,
} from "../src/lib/trackerColumns";
import {
  ALL_SETTING_KEYS,
  CYCLE_TIMING_FIELDS,
  SETTING_KEYS,
  buildAdminSearchIndex,
  cycleTimelinePreview,
  groupHeaderLabels,
  optionUsageMap,
  searchAdminIndex,
  settingsExportPayload,
  slug,
  withPending,
} from "../src/lib/adminSettings";

// Exactly what the page passes to the index (and what the panel renders).
const headerGroups = groupHeaderLabels(MASTER_TABLE_HEADER_LABELS);

const listValues: Record<string, string[]> = {};
for (const group of DROPDOWN_GROUPS) {
  for (const item of group.items) listValues[item.key] = [`${item.label} option A`];
}

const index = buildAdminSearchIndex({
  listValues,
  headerLabels: MASTER_TABLE_HEADER_LABELS,
  headerGroups,
  blockCount: 7,
  phcCount: 0,
  pendingUsers: 0,
});

/** The components that render `data-admin-anchor` attributes. */
const panelSource = (file: string): string =>
  readFileSync(new URL(`../src/components/admin/${file}`, import.meta.url), "utf8");

describe("admin settings search index", () => {
  it("covers every section, dropdown list, column header, visibility row and timing number", () => {
    const ids = new Set(index.map((e) => e.id));
    for (const group of DROPDOWN_GROUPS) {
      for (const item of group.items) expect(ids.has(`list-${item.key}`)).toBe(true);
    }
    for (const label of MASTER_TABLE_HEADER_LABELS) {
      expect(ids.has(`header-${slug(label)}`)).toBe(true);
    }
    expect(index.filter((e) => e.id.startsWith("timing-")).length).toBe(
      CYCLE_TIMING_FIELDS.length,
    );
    // Every category page plus the two extra pages are jumpable.
    for (const cat of Object.keys(CATEGORY_META) as TrackerCategoryId[]) {
      expect(ids.has(`visibility-${cat}`)).toBe(true);
    }
    expect(ids.has("visibility-generate-ppt")).toBe(true);
    expect(ids.has("visibility-custom-report")).toBe(true);
    expect(ids.has("maintenance-danger")).toBe(true);
    expect(ids.has("maintenance-activity")).toBe(true);
  });

  it("has no empty labels or ids, and every hint explains where the entry lives", () => {
    for (const e of index) {
      expect(e.id.trim().length).toBeGreaterThan(0);
      expect(e.label.trim().length).toBeGreaterThan(0);
      expect(e.hint.trim().length).toBeGreaterThan(0);
    }
  });

  it("ranks label matches first and drops non-matching words", () => {
    const results = searchAdminIndex(index, "surveillance");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].label.toLowerCase()).toContain("surveillance");

    // Two words must BOTH match: no entry contains both of these.
    expect(searchAdminIndex(index, "surveillance zzzz")).toEqual([]);
    // An empty query never dumps the whole index into the UI.
    expect(searchAdminIndex(index, "   ")).toEqual([]);
  });

  it("finds a dropdown option by its own value, not just the list name", () => {
    const results = searchAdminIndex(index, "option A");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.tab === "workspace" && r.section === "lists")).toBe(true);
  });
});

describe("admin settings — index anchors exist in the panels", () => {
  // Each index id kind maps to the component(s) that must render that anchor.
  const dynamic: { prefix: string; files: string[]; needle: string }[] = [
    { prefix: "list-", files: ["DropdownListsPanel.tsx"], needle: "data-admin-anchor={`list-${item.key}`}" },
    {
      prefix: "header-",
      files: ["TableHeadersPanel.tsx"],
      needle: "data-admin-anchor={`header-${slug(label)}`}",
    },
    {
      prefix: "header-group-",
      files: ["TableHeadersPanel.tsx"],
      needle: "data-admin-anchor={`header-group-${slug(group.label)}`}",
    },
    {
      prefix: "visibility-",
      files: ["PageVisibilityPanel.tsx"],
      needle: "data-admin-anchor={`visibility-${id}`}",
    },
    { prefix: "timing-", files: ["TimingPanel"], needle: "data-admin-anchor={`timing-${f.key}`}" },
  ];

  it("renders the anchor kind the index jumps to for every dynamic entry", () => {
    for (const kind of dynamic) {
      const entries = index.filter((e) => e.id.startsWith(kind.prefix));
      expect(entries.length).toBeGreaterThan(0);
      const found = kind.files.some((f) =>
        f === "TimingPanel"
          ? panelSource("CycleTimingPanel.tsx").includes(kind.needle)
          : panelSource(f).includes(kind.needle),
      );
      expect(found).toBe(true);
    }
  });

  it("renders every literal anchor the index uses for a page-level destination", () => {
    const literals: [string, string][] = [
      ["master-blocks", "MasterDataPanel.tsx"],
      ["master-phcs", "MasterDataPanel.tsx"],
      ["users-pending", "UsersPanel.tsx"],
      ["users-access", "UsersPanel.tsx"],
      ["maintenance-recompute", "MaintenancePanel.tsx"],
      ["maintenance-danger", "MaintenancePanel.tsx"],
      ["maintenance-activity", "ActivityLogPanel.tsx"],
    ];
    for (const [id, file] of literals) {
      expect(index.some((e) => e.id === id)).toBe(true);
      expect(panelSource(file)).toContain(`data-admin-anchor="${id}"`);
    }
  });
});

describe("admin settings draft + export", () => {
  it("setting a key adds it, and clearing it removes the key entirely", () => {
    let draft = withPending({}, "buildingTypes", ["A"]);
    expect(Object.keys(draft)).toEqual(["buildingTypes"]);
    draft = withPending(draft, "buildingTypes", undefined);
    expect(Object.keys(draft)).toEqual([]);
    // Reverting to the saved value must never count as an unsaved change.
    draft = withPending(draft, "iaFrequencyMonths", 3);
    draft = withPending(draft, "iaFrequencyMonths", undefined);
    expect(draft).toEqual({});
  });

  it("exports only the keys this page owns, with provenance", () => {
    const { fileName, json } = settingsExportPayload(
      {
        buildingTypes: ["Main", "Annexe"],
        hiddenPages: ["generate-ppt"],
        somethingElse: "not ours",
      },
      "admin@example.com",
      new Date("2026-10-14T06:30:00.000Z"),
    );
    expect(fileName).toBe("nqas-settings-2026-10-14.json");
    const parsed = JSON.parse(json);
    expect(parsed.kind).toBe("admin-settings");
    expect(parsed.version).toBe(1);
    expect(parsed.exportedBy).toBe("admin@example.com");
    expect(parsed.settings.buildingTypes).toEqual(["Main", "Annexe"]);
    expect(parsed.settings.hiddenPages).toEqual(["generate-ppt"]);
    expect("somethingElse" in parsed.settings).toBe(false);
  });

  it("every exported key is one the workspace sections actually own", () => {
    for (const key of ALL_SETTING_KEYS) {
      const owned =
        SETTING_KEYS.lists.includes(key) ||
        SETTING_KEYS.headers.includes(key) ||
        SETTING_KEYS.visibility.includes(key) ||
        SETTING_KEYS.timing.includes(key) ||
        SETTING_KEYS.dashboard.includes(key);
      expect(owned).toBe(true);
    }
    expect(SETTING_KEYS.headers).toEqual([HEADER_OVERRIDES_KEY]);
    expect(new Set(ALL_SETTING_KEYS).size).toBe(ALL_SETTING_KEYS.length);
  });
});

describe("table-header grouping", () => {
  it("places every column in exactly one group, in master-sheet order", () => {
    const flat = headerGroups.flatMap((g) => g.labels);
    expect(flat.length).toBe(MASTER_TABLE_HEADER_LABELS.length);
    expect(new Set(flat).size).toBe(MASTER_TABLE_HEADER_LABELS.length);
    expect([...flat].sort()).toEqual([...MASTER_TABLE_HEADER_LABELS].sort());
    // No empty group headers rendered.
    for (const g of headerGroups) expect(g.labels.length).toBeGreaterThan(0);
  });

  it("keeps the columns that belong to no single category page under “Other columns”", () => {
    const other = headerGroups.find((g) => g.id === "other");
    expect(other?.labels).toContain("Remarks");
    expect(other?.labels).toContain("Last Updated");
  });

  it("only shows the groups that still have a matching column while searching", () => {
    const filtered = groupHeaderLabels(
      MASTER_TABLE_HEADER_LABELS.filter((l) => l.toLowerCase().includes("noc")),
    );
    expect(filtered.map((g) => g.id)).toEqual(["building-noc"]);
    expect(filtered.flatMap((g) => g.labels).every((l) => l.toLowerCase().includes("noc"))).toBe(true);
  });
});

describe("cycle timing metadata", () => {
  it("every field has a usable range and a unit", () => {
    for (const f of CYCLE_TIMING_FIELDS) {
      expect(f.min).toBeGreaterThan(0);
      expect(f.max).toBeGreaterThan(f.min);
      expect(f.step).toBeGreaterThan(0);
      expect(f.unit.length).toBeGreaterThan(0);
      expect(f.hint.length).toBeGreaterThan(10);
    }
  });

  it("the timeline preview reflects the numbers an admin typed", () => {
    const preview = cycleTimelinePreview({
      certificationValidityYears: 5,
      surveillanceIntervalsMonths: 12,
      recertificationAlertLeadDays: 60,
      iaFrequencyMonths: 6,
      deferredCooldownMonths: 2,
    });
    const text = preview.map((p) => `${p.label} ${p.offset}`).join(" | ");
    expect(text).toContain("every 6 months");
    expect(text).toContain("24 months after certification");
    expect(text).toContain("60 days before the 5-year expiry");
    expect(text).toContain("allowed 2 months after the deferred letter");
    // Singular/plural is spelled out, never “1 years”.
    const singular = cycleTimelinePreview({
      certificationValidityYears: 1,
      iaFrequencyMonths: 1,
    });
    const singularText = singular.map((p) => p.offset).join(" | ");
    expect(singularText).toContain("every 1 month");
    expect(singularText).not.toContain("1 years");
  });
});

/* --------------------------------------------------------------------------- */
/* Option usage rows (ops.getAdminOptionUsage)                                 */
/* --------------------------------------------------------------------------- */

describe("option usage rows", () => {
  it("indexes the row list the server sends back as setting key → value → count", () => {
    const map = optionUsageMap([
      { listKey: "statusLabels", value: "Certified — Surveillance Due", count: 2 },
      { listKey: "statusLabels", value: "NQAS Pending", count: 31 },
      { listKey: "buildingStatuses", value: "Good", count: 34 },
    ]);
    expect(map.statusLabels["Certified — Surveillance Due"]).toBe(2);
    expect(map.statusLabels["NQAS Pending"]).toBe(31);
    expect(map.buildingStatuses.Good).toBe(34);
  });

  it("keeps non-ASCII option values intact — they are Convex values, not field names", () => {
    // The regression: “Certified — Surveillance Due” (em dash) crashed the
    // Admin page because Convex rejects non-ASCII OBJECT FIELD names, so the
    // server must never key its result by the option value.
    const entries = [
      { listKey: "statusLabels", value: "Certified — Surveillance Due", count: 2 },
      { listKey: "fundStatuses", value: "₹ Released", count: 5 },
      { listKey: "departments", value: "மருத்துவமனை", count: 1 },
    ];
    const map = optionUsageMap(entries);
    for (const e of entries) expect(map[e.listKey][e.value]).toBe(e.count);
    // The row list itself is a plain array — safe to send through Convex.
    expect(JSON.parse(JSON.stringify(entries))).toEqual(entries);
  });

  it("treats a missing result (skipped query, or a non-Administrator) as no data", () => {
    expect(optionUsageMap(undefined)).toEqual({});
    expect(optionUsageMap([])).toEqual({});
  });
});
