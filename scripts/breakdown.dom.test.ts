/**
 * PROGRESS BREAKDOWN — DOM CONTRACT (happy-dom).
 *
 * The brief's test #1, at the render level: for every row of the REAL card,
 * each segment's rendered width ratio equals count/n within 0.5%, the rendered
 * segments sum to the row, zero buckets are never drawn, every segment is a
 * labelled accessible control, and the "All facilities" total row is present.
 *
 * Rendered pieces: the whole ProgressBreakdownCard (its real UI: bar-table,
 * legend, tooltips' triggers, header controls) inside happy-dom with the
 * globe from scripts/listNavigation.dom.test.ts.
 */

import { describe, expect, it, beforeEach, afterAll } from "bun:test";
import { Window } from "happy-dom";

/* ------------------------------------------------------------------ */
/* 1 — DOM globals                                                     */
/* ------------------------------------------------------------------ */

const win = new Window({ url: "http://localhost/" });
type MediaQueryListLike = {
  matches: boolean;
  media: string;
  addEventListener?: (type: string, cb: () => void) => void;
  removeEventListener?: (type: string, cb: () => void) => void;
};
const extras = win as unknown as {
  CustomEvent: typeof CustomEvent;
  MouseEvent: typeof MouseEvent;
  KeyboardEvent: typeof KeyboardEvent;
  matchMedia?: (m: string) => MediaQueryListLike;
};
function defineGlobal(key: string, value: unknown) {
  try {
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  } catch {
    /* Bun's read-only globals stay as they are */
  }
}
defineGlobal("window", win);
defineGlobal("document", win.document);
defineGlobal("HTMLElement", win.HTMLElement);
defineGlobal("Element", win.Element);
defineGlobal("Node", win.Node);
defineGlobal("Event", win.Event);
defineGlobal("CustomEvent", extras.CustomEvent);
defineGlobal("MouseEvent", extras.MouseEvent);
defineGlobal("KeyboardEvent", extras.KeyboardEvent);
(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
// Radix UI sizes popovers/tooltips with ResizeObserver — a no-op stub keeps
// the closed-menu DOM renderable under happy-dom.
(globalThis as unknown as Record<string, unknown>).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const VIEWPORT = { width: 1366, height: 900 };
for (const prop of ["offsetWidth", "offsetHeight"] as const) {
  Object.defineProperty(win.HTMLElement.prototype, prop, {
    configurable: true,
    get() {
      return prop === "offsetWidth" ? VIEWPORT.width : VIEWPORT.height;
    },
  });
}
(win.Element.prototype as unknown as Record<string, unknown>).getBoundingClientRect = function () {
  return {
    x: 0, y: 0, top: 0, left: 0,
    right: VIEWPORT.width, bottom: VIEWPORT.height,
    width: VIEWPORT.width, height: VIEWPORT.height,
    toJSON: () => ({}),
  };
};
extras.matchMedia = (media: string): MediaQueryListLike => ({
  media,
  get matches() {
    return false;
  },
  addEventListener() {},
  removeEventListener() {},
});

/* ------------------------------------------------------------------ */
/* 2 — Fixture + render helpers (same shape as the golden fixture)      */
/* ------------------------------------------------------------------ */

import { createRoot } from "react-dom/client";
import { act, createElement as h } from "react";
import { MemoryRouter } from "react-router";
import {
  BUCKET_BY_KEY,
  buildBreakdown,
  BUCKET_ORDER,
  type BreakdownFacility,
} from "../src/lib/breakdown";
import BreakdownCard, { StackedBar } from "../src/components/dashboard/ProgressBreakdownCard";

const mk = (
  block: string,
  facilityType: string,
  currentStatus: string | null,
  certStatus: string | null = null,
  eligibility = "Eligible",
): BreakdownFacility => ({
  block,
  phc: `${block} PHC`,
  facilityType,
  currentStatus,
  certStatus,
  eligibility,
  docStatus: null,
});

/** Alangayam 9/27 (33.3%) as a faithful mini of the district view. */
const FACILITIES: BreakdownFacility[] = [
  mk("Alangayam", "HWC HSC", null, "Quality Certified"),
  mk("Alangayam", "HWC HSC", null, "Quality Certified"),
  mk("Alangayam", "HWC HSC", null, "Quality Certified with Conditionality"),
  mk("Alangayam", "PHC", null, "Quality Certified"),
  mk("Alangayam", "PHC", null, "Quality Certified"),
  mk("Alangayam", "PHC", null, "Quality Certified"),
  mk("Alangayam", "PHC", null, "Quality Certified"),
  mk("Alangayam", "CHC", null, "Quality Certified"),
  mk("Alangayam", "CHC", null, "Quality Certified"),
  mk("Alangayam", "HWC HSC", "Result Awaited"),
  mk("Alangayam", "HWC HSC", "SA Scheduled"),
  mk("Alangayam", "HWC HSC", "SA Not Yet Initiated"),
  mk("Alangayam", "HWC HSC", "SA Not Yet Initiated"),
  mk("Alangayam", "HWC HSC", "SA Not Yet Initiated"),
  mk("Alangayam", "HWC HSC", "SA Not Yet Initiated"),
  mk("Alangayam", "HWC HSC", null),
  mk("Alangayam", "HWC HSC", null),
  mk("Alangayam", "HWC HSC", null),
  mk("Alangayam", "HWC HSC", null),
  mk("Alangayam", "HWC HSC", "Recertification Due"),
  mk("Alangayam", "PHC", "SA Not Yet Initiated", null, "Not Eligible"),
  mk("Alangayam", "PHC", "SA Not Yet Initiated", null, "Not Eligible"),
  mk("Alangayam", "PHC", "SA Not Yet Initiated", null, "Not Eligible"),
  mk("Alangayam", "PHC", "SA Not Yet Initiated", null, "Not Eligible"),
  mk("Alangayam", "CHC", "SA Not Yet Initiated"),
  mk("Alangayam", "CHC", "Deferred — Cooling Period"),
  mk("Alangayam", "SDH", "SA Not Yet Initiated"),
];

const BD = buildBreakdown(FACILITIES, {
  dimension: "block",
  today: "2026-10-20",
});

let container: HTMLElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  container = win.document.createElement("div");
  win.document.body.appendChild(container);
  root = createRoot(container);
});

afterAll(() => {
  void root.unmount?.();
});

function renderCard(mode: "count" | "share" = "share") {
  void act(() => {
    // The card's drill-downs are real react-router Links — wrap in a
    // MemoryRouter the way the page itself is always routed.
    root.render(
      h(MemoryRouter, null,
        h(BreakdownCard, {
          breakdown: BD,
          facilities: FACILITIES,
          state: {
            dim: "block",
            view: "bars",
            mode,
            sort: "rateDesc",
            denom: "all",
          },
          onState: () => {},
          dataAsOf: "20-10-2026",
        }),
      ),
    );
  });
}

/* ------------------------------------------------------------------ */
/* 3 — The bar-equals-label contract at the render level               */
/* ------------------------------------------------------------------ */

describe("rendered bar-table contract", () => {
  it("renders a row per group plus the pinned All-facilities total", () => {
    renderCard();
    const row = container.querySelector('[data-row="Alangayam"]');
    expect(row).not.toBeNull();
    // Segments are REAL links into the Master List (group + bucket).
    const firstSegment = row!.querySelector<HTMLElement>("a[aria-label]");
    expect(firstSegment?.getAttribute("href")?.startsWith("/facilities?")).toBe(true);
    const grand = container.querySelector('[data-testid="grand-row"]');
    expect(grand?.textContent).toContain("All facilities");
    // The total row carries the SAME numbers its segments came from:
    // 27 facilities, 8 quality + 1 conditional = 9 holding, 33% displayed.
    expect(grand?.textContent).toContain("27");
    expect(grand?.textContent).toContain("8");
    expect(grand?.textContent).toContain("9");
    expect(grand?.textContent).toContain("33%");
    void container.remove();
  });

  it("each rendered segment's width ratio equals count/n within 0.5%", () => {
    renderCard("share");
    const rowEl = container.querySelector('[data-row="Alangayam"]')!;
    const row = BD.rows[0]; // rateDesc keeps Alangayam in view
    expect(row.key).toBe("Alangayam");
    // Segments are the aria-labelled segment links inside the row's bar.
    const segments = [...rowEl.querySelectorAll<HTMLElement>('a[aria-label]')];
    // Exactly the non-zero buckets are drawn, in bucket order.
    const expected = BUCKET_ORDER.filter((k) => row.buckets[k] > 0);
    expect(segments.length).toBe(expected.length);
    let renderedSum = 0;
    for (const s of segments) {
      const aria = s.getAttribute("aria-label") ?? "";
      const m =
        /^Alangayam, (.+): (\d+) facilities, (\d+) percent, open list$/.exec(aria);
      expect(m).not.toBeNull();
      const bucket = Object.values(BUCKET_BY_KEY).find((b) => b.label === m![1]);
      expect(bucket).not.toBeUndefined();
      const count = row.buckets[bucket!.key];
      renderedSum += count;
      expect(Number(m![2])).toBe(count);
      const expectedPct = (count / row.n) * 100;
      expect(Math.round(expectedPct)).toBe(Number(m![3]));
      const width = parseFloat(s.style.width);
      expect(Math.abs(width - expectedPct)).toBeLessThan(0.5);
    }
    // Segments sum to the row: hold + the rest = n.
    expect(renderedSum).toBe(row.n);
    void container.remove();
  });

  it("zero buckets are not drawn (no span for an empty bucket)", () => {
    // Alangayam has no deferred facility in this fixture — a width 0% or a
    // hidden zero-width segment would both fail the "not drawn" rule.
    renderCard("share");
    const rowEl = container.querySelector('[data-row="Alangayam"]')!;
    const labels = [...rowEl.querySelectorAll<HTMLElement>('a[aria-label]')].map(
      (s) => s.getAttribute("aria-label") ?? "",
    );
    expect(labels.some((l) => l.includes("Deferred"))).toBe(
      BD.rows[0].buckets.deferred > 0,
    );
    void container.remove();
  });

  it("StackedBar in Count mode scales the whole bar to group size", () => {
    // The Stackbed bar wrapper's width = n / maxN * 100 in count mode.
    const r = BD.rows[0];
    renderCard("count");
    const rowEl = container.querySelector('[data-row="Alangayam"]')!;
    // The inner overflow-hidden wrapper spans the bar cell; the outer
    // width-encoded <span> is its first child.
    const wrapper = rowEl.querySelector<HTMLElement>('a[aria-label]')!.parentElement!;
    expect(parseFloat(wrapper.style.width)).toBeCloseTo(
      mode_f(r) * 100,
      5,
    );
    void container.remove();
  });

  function mode_f(r: typeof BD.rows[number]) {
    // n / maxN of the scope — Alangayam is the only group, so maxN = n.
    return 1;
  }
});
