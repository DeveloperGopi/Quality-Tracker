/**
 * SIDEBAR LABEL BUDGET — one-line nav labels must stay ≤ 24 characters in
 * every language (English and Tamil). The build prints a warning for anything
 * longer; this suite pins the catalogue itself and the checker's behaviour.
 *
 * Run: bun test ./scripts
 */
import { describe, test, expect } from "bun:test";
import { spawnSync } from "node:child_process";

import {
  SIDEBAR_LABELS,
  SIDEBAR_LANGUAGES,
  SIDEBAR_LABEL_MAX,
  checkSidebarLabelLengths,
  findOverlongLabels,
  sidebarLabel,
  sidebarLabelLength,
} from "../src/lib/sidebarLabels";

describe("sidebar label catalogue", () => {
  test("every label fits the 24-character budget in every language", () => {
    expect(checkSidebarLabelLengths()).toEqual([]);
    for (const lang of SIDEBAR_LANGUAGES) {
      for (const label of Object.values(SIDEBAR_LABELS[lang])) {
        expect(sidebarLabelLength(label)).toBeLessThanOrEqual(
          SIDEBAR_LABEL_MAX,
        );
      }
    }
  });

  test("both languages carry exactly the same keys", () => {
    expect(Object.keys(SIDEBAR_LABELS.ta).sort()).toEqual(
      Object.keys(SIDEBAR_LABELS.en).sort(),
    );
  });

  test("the English catalogue keeps the labels the app already shows", () => {
    expect(sidebarLabel("nav.dashboard")).toBe("Dashboard");
    expect(sidebarLabel("nav.facilities")).toBe("Facility Master List");
    expect(sidebarLabel("nav.reports")).toBe("Reports & Export");
    expect(sidebarLabel("nav.summary")).toBe("NQAS Summary Report");
    expect(sidebarLabel("nav.customReport")).toBe("Custom Report Builder");
    expect(sidebarLabel("nav.generatePpt")).toBe("Generate PPT");
    expect(sidebarLabel("nav.bulkImport")).toBe("Bulk Import");
    expect(sidebarLabel("nav.admin")).toBe("Admin Settings");
  });

  test("Tamil labels exist, differ from English and stay short", () => {
    for (const key of Object.keys(SIDEBAR_LABELS.en) as Array<
      keyof typeof SIDEBAR_LABELS.en
    >) {
      const ta = sidebarLabel(key, "ta");
      expect(ta.length).toBeGreaterThan(0);
      expect(ta).not.toBe(sidebarLabel(key));
      expect(sidebarLabelLength(ta)).toBeLessThanOrEqual(SIDEBAR_LABEL_MAX);
    }
  });

  test("the checker flags only labels above the budget (24 fits, 25 warns)", () => {
    const exactly = "x".repeat(SIDEBAR_LABEL_MAX);
    const over = "x".repeat(SIDEBAR_LABEL_MAX + 1);
    expect(
      findOverlongLabels({ "nav.dashboard": exactly }, "en"),
    ).toHaveLength(0);
    const flagged = findOverlongLabels({ "nav.dashboard": over }, "en");
    expect(flagged).toHaveLength(1);
    expect(flagged[0].length).toBe(SIDEBAR_LABEL_MAX + 1);
    expect(flagged[0].lang).toBe("en");
    // Tamil is measured the same way
    expect(
      findOverlongLabels({ "nav.facilities": "அ".repeat(25) }, "ta"),
    ).toHaveLength(1);
  });

  test("length is counted in code points, not UTF-16 units", () => {
    // Devanagari/Tamil combining marks: a reader sees fewer glyphs than units
    const tamil = "நிலையங்கள் பட்டியல்";
    expect(sidebarLabelLength(tamil)).toBe([...tamil].length);
    expect(sidebarLabelLength(tamil)).toBeLessThanOrEqual(SIDEBAR_LABEL_MAX);
    expect(sidebarLabelLength("அ".repeat(25))).toBe(25);
  });

  test("the build-time check runs, warns (not fails) and reports the budget", () => {
    const result = spawnSync("bun", ["scripts/checkSidebarLabels.ts"], {
      encoding: "utf8",
    });
    expect(result.status).toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain("sidebar labels");
  });
});
