import { describe, expect, test } from "bun:test";

import {
  REPORT_VIEW,
  moveColumn,
  normalizeView,
  orderedVisibleColumns,
} from "../src/lib/masterView";

const pinned = ["facility", "type"];

describe("Report saved layouts", () => {
  test("the report default view survives an account round-trip", () => {
    const stored = JSON.parse(JSON.stringify({ view: REPORT_VIEW })) as { view: unknown };
    const restored = normalizeView(stored.view, pinned);
    expect(restored.presetId).toBe("reportDefault");
    expect(restored.visibleKeys.slice(0, 2)).toEqual(pinned);
    expect(restored.density).toBe("comfortable");
  });

  test("hidden, duplicated and unknown columns are dropped, not rendered", () => {
    const view = normalizeView(
      {
        presetId: "reportDefault",
        visibleKeys: ["facility", "certScore", "certScore", "removedLegacyColumn", "type"],
        order: ["certScore"],
        density: "compact",
      },
      pinned,
    );
    expect(view.visibleKeys).toEqual(["facility", "type", "certScore"]);
    expect(view.density).toBe("compact");
    expect(view.visibleKeys).not.toContain("removedLegacyColumn");
  });

  test("column order is explicit and pinned columns stay first", () => {
    const view = normalizeView(
      {
        presetId: "custom",
        visibleKeys: ["facility", "type", "certScore", "certDate", "block"],
        order: ["certDate", "certScore", "block"],
        density: "comfortable",
      },
      pinned,
    );
    const ordered = orderedVisibleColumns(view, pinned).map((column) => column.key);
    expect(ordered.slice(0, 2)).toEqual(["facility", "type"]);
    expect(ordered.indexOf("certDate")).toBeLessThan(ordered.indexOf("certScore"));
    expect(ordered.indexOf("certScore")).toBeLessThan(ordered.indexOf("block"));
  });

  test("moving a non-pinned column updates the persisted order", () => {
    const view = normalizeView(
      {
        presetId: "custom",
        visibleKeys: ["facility", "type", "certScore", "certDate", "block"],
        order: ["certScore", "certDate", "block"],
        density: "comfortable",
      },
      pinned,
    );
    const moved = moveColumn(view, "block", 0, pinned);
    const ordered = orderedVisibleColumns(moved, pinned).map((column) => column.key);
    expect(ordered.slice(0, 4)).toEqual(["facility", "type", "block", "certScore"]);
    expect(moved.order[0]).toBe("block");
  });

  test("a corrupt saved layout falls back to a usable report view", () => {
    const view = normalizeView({ visibleKeys: "nope", density: "enormous" }, pinned);
    expect(Array.isArray(view.visibleKeys)).toBe(true);
    expect(view.visibleKeys.length).toBeGreaterThan(0);
    expect(view.density).toBe("comfortable");
  });
});
