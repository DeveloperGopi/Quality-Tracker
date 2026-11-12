/**
 * PIVOT TABLE — DOM header contract (Task B/B.3/B.5).
 *
 * Renders the REAL PivotTable in happy-dom and pins:
 *  • header levels are separate table rows: level 1 = the column-field
 *    values (top), level 2 = the value names, ONLY when there are 2+ values
 *    (or "Always"); with a single value the measure appears once in the
 *    corner caption and the value-label row is absent,
 *  • the corner cell spans ALL header rows via rowspan — it can never
 *    overlap another header row (its colSpan × rowSpan accounting matches
 *    the other header rows exactly),
 *  • there is EXACTLY ONE "Grand Total" header cell (and the grand columns
 *    only exist when a column field exists),
 *  • the Grand Total row is a sticky footer pinned to the bottom of the ONE
 *    scroll container,
 *  • the preview toolbar's counter equals the DOM table (pivotCounter vs
 *    rendered rows),
 *  • no page overflow: the scroll container is the single bounded context.
 *
 * happy-dom has no layout engine, so geometry is asserted structurally —
 * the same colspan/rowspan accounting a real browser lays out from.
 *
 * Run: bun test ./scripts
 */
import { describe, expect, test, afterEach } from "bun:test";
import { Window } from "happy-dom";

/* ------------------------------------------------------------------ */
/* DOM globals (same pattern as scripts/masterGrid.dom.test.ts)        */
/* ------------------------------------------------------------------ */

const win = new Window({ url: "http://localhost/" });

function defineGlobal(key: string, value: unknown) {
  try {
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  } catch {
    /* Bun's own read-only globals (navigator, …) stay as they are */
  }
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

defineGlobal("window", win);
defineGlobal("document", win.document);
defineGlobal("HTMLElement", win.HTMLElement);
defineGlobal("Element", win.Element);
defineGlobal("Node", win.Node);
defineGlobal("Event", win.Event);
defineGlobal("CustomEvent", (win as unknown as { CustomEvent: typeof CustomEvent }).CustomEvent);
defineGlobal("MouseEvent", (win as unknown as { MouseEvent: typeof MouseEvent }).MouseEvent);
defineGlobal("KeyboardEvent", (win as unknown as { KeyboardEvent: typeof KeyboardEvent }).KeyboardEvent);
defineGlobal(
  "getComputedStyle",
  (win as unknown as { getComputedStyle?: (e: Element) => CSSStyleDeclaration }).getComputedStyle?.bind(win),
);
const raf = (win as unknown as { requestAnimationFrame?: (cb: FrameRequestCallback) => number }).requestAnimationFrame?.bind(win);
defineGlobal(
  "requestAnimationFrame",
  raf ?? ((cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0) as unknown as number),
);
defineGlobal(
  "ResizeObserver",
  typeof (win as unknown as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver === "function"
    ? (win as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver
    : ResizeObserverStub,
);

(async () => {
  const extras = win as unknown as {
    matchMedia?: unknown;
  };
  if (typeof extras.matchMedia !== "function") {
    extras.matchMedia = (media: string) => ({
      matches: false,
      media,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    });
  }
})();

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

import type { ReactElement } from "react";
import { buildPivot, createPivotFields, type PivotConfig, type PivotRow } from "../src/lib/pivot";
import { PivotTable, pivotCounter, statusColumnIndexes, type ReportStyle } from "../src/components/custom-report/PivotTable";

const fields = createPivotFields();

function row(spec: {
  name: string;
  block: string;
  type: string;
  cert?: string | null;
  score?: number | null;
  amount?: number | null;
}): PivotRow {
  return {
    facility: {
      _id: spec.name,
      name: spec.name,
      block: spec.block,
      phc: `${spec.block} PHC`,
      facilityType: spec.type,
      currentStatus: spec.cert ?? "SA Not Yet Initiated",
      eligibility: "Eligible",
    },
    cycleNumber: 1,
    nqas: spec.cert
      ? {
          status: "Completed",
          certificationStatus: spec.cert,
          scorePercent: spec.score ?? null,
        }
      : null,
    sa: { status: "Completed", scorePercent: spec.score ?? null },
    fund: spec.amount != null ? { amountSanctioned: spec.amount } : null,
  };
}

const ROWS: PivotRow[] = [
  row({ name: "A", block: "Bargur", type: "PHC", cert: "Quality Certified", score: 82, amount: 150000 }),
  row({ name: "B", block: "Bargur", type: "HWC HSC", cert: "Quality Certified", score: 78 }),
  row({ name: "C", block: "Kandhili", type: "PHC", cert: "Quality Certified with Conditionality", score: 65 }),
  row({ name: "D", block: "Kandhili", type: "HWC HSC" }),
  row({ name: "E", block: "Natrampalli", type: "PHC", cert: "Quality Certified", score: 91, amount: 30000 }),
];

const baseConfig: PivotConfig = {
  rows: ["block"],
  columns: ["certStatus"],
  values: [{ fieldId: "facilityName", agg: "count" }],
  filters: {},
  sort: { kind: "label", dir: "asc" },
};

const STYLE: ReportStyle = {
  subtotals: true,
  grandTotals: true,
  grandTotalColumn: true,
  striped: false,
  borders: true,
  highlightTotals: true,
};

const NOOP = () => {};

/* ------------------------------------------------------------------ */
/* Mount helpers                                                       */
/* ------------------------------------------------------------------ */

async function tick(ms = 10) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

type H = typeof import("react").createElement;
type CreateRoot = typeof import("react-dom/client").createRoot;
type Comps = typeof import("../src/components/custom-report/PivotTable");

let h: H;
let createRoot: CreateRoot;
let comps: Comps;

async function deps() {
  if (!h) h = (await import("react")).createElement;
  if (!createRoot) createRoot = (await import("react-dom/client")).createRoot;
  if (!comps) comps = (await import("../src/components/custom-report/PivotTable")) as Comps;
  return { h, createRoot, comps };
}

const mounted: { unmount: () => void; container: HTMLElement }[] = [];

async function mount(element: ReactElement) {
  await deps();
  const container = win.document.createElement("div");
  win.document.body.appendChild(container);
  const root = createRoot(container);
  root.render(element);
  await tick();
  mounted.push({
    container,
    unmount: () => {
      root.unmount();
      container.remove();
    },
  });
  return container;
}

function q<T extends Element = HTMLElement>(
  root: ParentNode | null | undefined,
  selector: string,
): T[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll(selector)) as T[];
}

function cleanup() {
  while (mounted.length) mounted.pop()?.unmount();
}

async function renderPivot(config: PivotConfig, valueLabels: "auto" | "always" | "never" = "auto") {
  await deps();
  const result = buildPivot({ rows: ROWS, fields, config });
  return {
    result,
    container: await mount(
      h(comps.PivotTable, {
        result,
        layout: "outline",
        decimals: "auto",
        style: STYLE,
        formatMode: "off",
        valueLabels,
        statusColIndexes: statusColumnIndexes(result.rowFields, result),
        colWidths: {},
        onColWidthsChange: NOOP,
        onToggleCollapse: NOOP,
        onSort: NOOP,
        sortState: () => null,
        onCellClick: NOOP,
      } as never),
    ),
  };
}

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

describe("PivotTable DOM contract (Task B)", () => {
  afterEach(() => cleanup());

  test("single value: the value-label row is ABSENT and the corner caption carries the measure once", async () => {
    const { container, result } = await renderPivot(baseConfig);
    // header: level 1 band row with the combo label; NO second (measure) row
    const labelRows = q(container, '[data-testid="pivot-value-labels"]');
    expect(labelRows).toHaveLength(0);
    const corner = q(container, "thead th")[0];
    expect(corner.textContent).toContain("Block");
    expect(corner.textContent).toContain("Values: Count of Facility");
    // exactly ONE Grand Total header cell — and it spans all header rows
    const grandHeads = q(container, "thead th").filter((th) =>
      (th.textContent ?? "").trim().startsWith("Grand Total"),
    );
    expect(grandHeads).toHaveLength(1);
    expect(grandHeads[0].rowSpan).toBe(1);
    expect(result.valueSpecs).toHaveLength(1);
    expect(result.colFields.length).toBeGreaterThan(0);
  });

  test("two values: the value-label row is present, the band spans its sub-columns, Grand Total gets one sub-column per value", async () => {
    const two: PivotConfig = {
      ...baseConfig,
      values: [
        { fieldId: "facilityName", agg: "count" },
        { fieldId: "gapAmount", agg: "sum" },
      ],
    };
    const { container, result } = await renderPivot(two, "auto");
    const labelRow = q(container, '[data-testid="pivot-value-labels"]');
    expect(labelRow).toHaveLength(1);
    // level-2 row holds one cell per value column + one per grand sub-column
    const labelRowCells = q(labelRow[0] as never, "th");
    const expected = result.colCombos.length * result.valueSpecs.length + result.valueSpecs.length;
    expect(labelRowCells).toHaveLength(expected);
    // level-1 band rows: the corner spans BOTH header rows (rowspan = 2)
    const corner = q(container, "thead th").find((th) => th.rowSpan === 2);
    expect(corner).toBeDefined();
    expect((corner!.textContent ?? "").length).toBeGreaterThan(0);
    // EXACTLY one "Grand Total" band header covering the grand sub-columns
    const grand = q(container, "thead th").filter((th) =>
      (th.textContent ?? "").trim() === "Grand Total",
    );
    expect(grand).toHaveLength(1);
    expect(grand[0].colSpan).toBe(result.valueSpecs.length);
  });

  test("corner header accounting: × rowSpan never collides with another header row (Task B.3)", async () => {
    const two: PivotConfig = {
      ...baseConfig,
      values: [
        { fieldId: "facilityName", agg: "count" },
        { fieldId: "gapAmount", agg: "sum" },
      ],
    };
    const { container, result } = await renderPivot(two);
    const thead = q(container, "thead > tr");
    expect(thead).toHaveLength(2); // level 1 + level 2

    // Row 1: corner (colSpan=labelCount, rowSpan=2) + bands + grand band
    const row1 = q(thead[0] as never, "th");
    const cornerCell = row1.find((th) => th.rowSpan === 2);
    expect(cornerCell).toBeDefined();
    const labelCount = result.rowFields.length;
    expect(cornerCell!.colSpan).toBe(labelCount);

    const bandTotal = row1
      .filter((th) => th.rowSpan !== 2)
      .reduce((sum, th) => sum + th.colSpan, 0);
    // Row 2 sits entirely beside the corner: its count = value + grand cols
    const row2Cells = q(thead[1] as never, "th");
    const row2Total = row2Cells.reduce((sum, th) => sum + th.colSpan, 0);
    expect(row2Total).toBe(
      result.colCombos.length * result.valueSpecs.length + result.valueSpecs.length,
    );
    // ...and the visual width of row 1 equals row 2 + the corner's span:
    expect(bandTotal + labelCount).toBe(row2Total + labelCount);
  });

  test("exactly ONE Grand Total header even with a column field; grand columns vanish without one", async () => {
    const { container } = await renderPivot(baseConfig);
    let grand = q(container, "thead th").filter((th) =>
      (th.textContent ?? "").trim().startsWith("Grand Total"),
    );
    expect(grand).toHaveLength(1);
    cleanup();

    const noCols: PivotConfig = { ...baseConfig, columns: [] };
    const { result, container: c2 } = await renderPivot(noCols);
    grand = q(c2, "thead th").filter((th) =>
      (th.textContent ?? "").trim().startsWith("Grand Total"),
    );
    expect(grand).toHaveLength(0);
    // the row total column does not exist: header = corner + the value cols
    expect(result.colFields).toHaveLength(0);
  });

  test("the preview toolbars counter equals the DOM table (body rows exclude the grand row)", async () => {
    const { container, result } = await renderPivot(baseConfig);
    const c = pivotCounter(result);
    const bodyRows = q(container, "tbody > tr").filter(
      (tr) => !(tr.textContent ?? "").includes("No facilities match"),
    );
    expect(bodyRows.length).toBe(c.rows);
    const footRows = q(container, "tfoot > tr");
    expect(footRows).toHaveLength(1);
    expect((footRows[0].textContent ?? "").includes("Grand Total")).toBe(true);
  });

  test("the Grand Total row is pinned: sticky footer inside the ONE bounded scroll container", async () => {
    const { container } = await renderPivot(baseConfig);
    const tfoot = q(container, "tfoot")[0];
    expect(tfoot.className).toContain("sticky");
    expect(tfoot.className).toContain("bottom-0");
    // ONE scroll container (the StickyTableScroll wrapper), with a max height
    const scroller = tfoot.parentElement?.parentElement?.parentElement;
    expect(scroller).toBeDefined();
    expect((scroller as never as { style: { maxHeight: string } }).style.maxHeight).toContain("60vh");
  });

  test("value-labels ALWAYS forces the second level for a single value; NEVER removes it for two", async () => {
    const { container } = await renderPivot(baseConfig, "always");
    expect(q(container, '[data-testid="pivot-value-labels"]')).toHaveLength(1);
    cleanup();

    const two: PivotConfig = {
      ...baseConfig,
      values: [
        { fieldId: "facilityName", agg: "count" },
        { fieldId: "gapAmount", agg: "sum" },
      ],
    };
    const { container: c2 } = await renderPivot(two, "never");
    expect(q(c2, '[data-testid="pivot-value-labels"]')).toHaveLength(0);
  });

  test("no page overflow: the measure name appears exactly ONCE in the header zone and the table lives in ONE scroll container", async () => {
    const { container } = await renderPivot(baseConfig);
    // The corner caption carries the measure name exactly once — the old
    // header printed "Count of Facility" on EVERY value column.
    const measureMentions = q(container, "thead").map((th) =>
      (th.textContent ?? "").split("Count of Facility").length - 1,
    ).reduce((a, b) => a + b, 0);
    expect(measureMentions).toBe(1);
    // the whole preview lives inside ONE overflow container that clips:
    const scroller = q(container, ".overflow-auto");
    expect(scroller).toHaveLength(1);
  });
});
