/**
 * NAV ICONS — the three changed glyphs, and "no two pages share an icon".
 *
 * `sidebarConfig` is the ONE place a page's icon is set. The category pills,
 * the page headers, the quick-view links, the KPI chips and the admin Page
 * visibility list resolve through `CATEGORY_ICONS`/`CATEGORY_META`, whose
 * entries for these pages are taken FROM the nav config — so all of them
 * change together and cannot drift.
 *
 * Run: bun test ./scripts/navIcons.test.ts
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { BadgeCheck, ClipboardCheck, ClipboardList, ClipboardPen, HandCoins } from "lucide-react";

import { NAV_ITEMS, navIcon } from "../src/lib/sidebarConfig";
import { CATEGORY_ICONS, CATEGORY_META } from "../src/lib/trackerColumns";

const nameOf = (icon: unknown) => (icon as { displayName?: string }).displayName;

describe("the three new nav icons", () => {
  test("State Assessment = ClipboardCheck (the Master List keeps ClipboardList)", () => {
    expect(nameOf(navIcon("/facilities/state-assessment"))).toBe("ClipboardCheck");
    expect(nameOf(navIcon("/facilities"))).toBe("ClipboardList");
    expect(navIcon("/facilities/state-assessment")).toBe(ClipboardCheck);
    expect(navIcon("/facilities")).toBe(ClipboardList);
  });

  test("NQAS Certification = BadgeCheck", () => {
    expect(nameOf(navIcon("/facilities/certification"))).toBe("BadgeCheck");
    expect(navIcon("/facilities/certification")).toBe(BadgeCheck);
  });

  test("Gap Closure Fund = HandCoins", () => {
    expect(nameOf(navIcon("/facilities/fund"))).toBe("HandCoins");
    expect(navIcon("/facilities/fund")).toBe(HandCoins);
  });

  test("the category surfaces read the SAME component, not a copy", () => {
    // What CategoryNav, the page headers, the quick links, the admin page list
    // and the KPI chips render:
    expect(CATEGORY_ICONS[CATEGORY_META.sa.icon]).toBe(navIcon("/facilities/state-assessment"));
    expect(CATEGORY_ICONS[CATEGORY_META.certification.icon]).toBe(
      navIcon("/facilities/certification"),
    );
    expect(CATEGORY_ICONS[CATEGORY_META.fund.icon]).toBe(navIcon("/facilities/fund"));
    expect(CATEGORY_ICONS[CATEGORY_META.ia.icon]).toBe(
      navIcon("/facilities/internal-assessment"),
    );
  });
});

describe("no two nav items share an icon", () => {
  test("every item's icon is unique (expanded nav, rail and palette read one value)", () => {
    const names = NAV_ITEMS.map((item) => nameOf(item.icon) ?? String(item.icon));
    expect(names.filter((n) => n === "ClipboardPen")).toEqual(["ClipboardPen"]);
    const seen = new Map<string, string>();
    for (const item of NAV_ITEMS) {
      const name = nameOf(item.icon) ?? item.labelKey;
      const prev = seen.get(name);
      expect(prev ? `${name} used by ${prev} and ${item.to}` : null).toBeNull();
      seen.set(name, item.to);
    }
    expect(new Set(names).size).toBe(names.length);
  });

  test("Internal Assessment no longer borrows Custom Report's glyph", () => {
    expect(navIcon("/facilities/internal-assessment")).toBe(ClipboardPen);
    expect(navIcon("/facilities/internal-assessment")).not.toBe(
      navIcon("/custom-report"),
    );
  });

  test("every route the palette lists resolves to a nav icon", () => {
    /* The palette renders `<PageIcon to={p.to} />`, which IS `navIcon(p.to)`:
       no palette-only glyph table, so the three new icons show there too. */
    const source = readFileSync("src/components/CommandPalette.tsx", "utf8");
    expect(source).toContain('import { navIcon } from "@/lib/sidebarConfig"');
    expect(source).toContain("<PageIcon to={p.to} />");
    // Only the PAGES table (Actions carry their own icon by design).
    const table = source.slice(source.indexOf("const PAGES"), source.indexOf("type RecentEntry"));
    const routes = [...table.matchAll(/to: "(\/[^"]*)"/g)].map((m) => m[1]);
    expect(routes.length).toBeGreaterThan(10);
    for (const to of routes) expect(navIcon(to)).toBeTruthy();
    // …and the renamed pages are among them.
    for (const to of [
      "/facilities/state-assessment",
      "/facilities/certification",
      "/facilities/fund",
    ]) {
      expect(routes).toContain(to);
    }
  });
});
