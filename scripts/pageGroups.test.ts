import { describe, expect, test } from "bun:test";

import {
  DEFAULT_PAGE_GROUPS,
  PROTECTED_PAGE_GROUPS,
  fallbackGroupId,
  normalizePageGroups,
  pageGroupId,
} from "../src/lib/pageGroups";
import { buildSidebarNav } from "../src/lib/sidebarConfig";

describe("Admin → Pages group management", () => {
  test("missing settings fall back to the shipped groups in order", () => {
    expect(normalizePageGroups(undefined)).toEqual(DEFAULT_PAGE_GROUPS);
    expect(normalizePageGroups({ groups: [] })).toEqual(DEFAULT_PAGE_GROUPS);
  });

  test("a stored group list keeps custom order and normalises duplicates", () => {
    const groups = normalizePageGroups({
      groups: [
        { id: "data", label: " Reports ", order: 300 },
        { id: "main", label: "Main", order: 0 },
        { id: "data", label: "Duplicate", order: 10 },
        { id: "quality", label: "Quality cell", order: 50 },
        { id: "", label: "No id", order: 60 },
      ],
    });
    expect(groups.map((group) => group.id)).toEqual(["main", "quality", "data"]);
    expect(groups.map((group) => group.order)).toEqual([0, 10, 20]);
    expect(groups.find((group) => group.id === "data")?.label).toBe("Reports");
  });

  test("serialised settings round-trip after rename and reorder", () => {
    const next = normalizePageGroups([
      { id: "tools", label: "Analytics", order: 0 },
      { id: "main", label: "Overview", order: 10 },
      { id: "admin", label: "Administration", order: 20 },
    ]);
    const stored = JSON.parse(JSON.stringify({ groups: next })) as unknown;
    expect(normalizePageGroups(stored)).toEqual(next);
    expect(fallbackGroupId(next)).toBe("main");
  });

  test("new ids are url-safe, unique and capped", () => {
    expect(pageGroupId("Quality Cell / Reports", ["main"])).toBe("quality-cell-reports");
    expect(pageGroupId("Quality Cell", ["quality-cell"])).toBe("quality-cell-2");
    expect(pageGroupId("!!!", ["main"])).toBe("group");
  });

  test("structural groups are protected from deletion", () => {
    expect(PROTECTED_PAGE_GROUPS.has("main")).toBe(true);
    expect(PROTECTED_PAGE_GROUPS.has("admin")).toBe(true);
    expect(PROTECTED_PAGE_GROUPS.has("tools")).toBe(false);
    expect(fallbackGroupId([{ id: "quality", label: "Quality", order: 0 }])).toBe("quality");
  });

  test("the sidebar uses the saved group order and shows custom pages", () => {
    const nav = buildSidebarNav({
      role: "admin",
      appRole: "admin",
      groups: normalizePageGroups([
        { id: "quality", label: "Quality cell", order: 0 },
        { id: "main", label: "Overview", order: 10 },
        { id: "admin", label: "Admin", order: 20 },
      ]),
      customPages: [
        {
          slug: "quality-watch",
          name: "Quality watch",
          icon: "FileSpreadsheet",
          group: "quality",
          order: 5,
        },
        {
          slug: "scratch-pad",
          name: "Scratch pad",
          icon: "FileSpreadsheet",
          group: "ungrouped",
          order: 5,
        },
      ],
    });
    expect(nav[0]?.id).toBe("quality");
    expect(nav[0]?.label).toBe("Quality cell");
    expect(nav[0]?.items.map((item) => item.to)).toContain("/p/quality-watch");
    expect(nav.find((group) => group.id === "main")?.label).toBe("Overview");
    expect(nav.at(-1)?.id).toBe("ungrouped");
    expect(nav.at(-1)?.label).toBe("Ungrouped");
    expect(nav.at(-1)?.items.map((item) => item.to)).toContain("/p/scratch-pad");
  });
});
